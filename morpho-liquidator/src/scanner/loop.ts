// Supervision: runs cycles forever without falling over.
//
// - A failed cycle is caught, logged and counted; the process keeps running.
// - Consecutive failures stretch the delay exponentially (rate-limit aware:
//   a struggling RPC gets less traffic, not more) up to `maxLoopBackoffMs`.
// - A heartbeat file is rewritten after every cycle, ok or not, so an external
//   supervisor can tell "alive and healthy" from "alive and blind" from "dead".
// - Degraded and recovered are alerted once each, on the transition.

import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'

import type { Alerter } from '../alerts/alerts.ts'
import type { Config } from '../config.ts'
import type { Store } from '../db.ts'
import { newId, withLogContext, type Logger } from '../logger.ts'
import type { RpcStats } from '../rpc/client.ts'
import { backoffDelayMs, systemClock, type Clock } from '../util/resilience.ts'
import type { CycleSummary, Scanner } from './scanner.ts'

export type HealthStatus = 'starting' | 'ok' | 'degraded' | 'failing'

export interface Heartbeat {
  status: HealthStatus
  reasons: string[]
  ts: number
  pid: number
  startedAt: number
  lastOkCycleAt: number | null
  consecutiveFailures: number
  lastError: string | null
  lastCycle: CycleSummary | null
  rpc: RpcStats | null
  liveExecutionEnabled: boolean
}

/** Health from the facts of the last cycle. Pure, for testing. */
export function deriveHealth(input: {
  now: number
  lastOkCycleAt: number | null
  consecutiveFailures: number
  lastCycle: CycleSummary | null
  maxCycleAgeMs: number
}): { status: HealthStatus; reasons: string[] } {
  const reasons: string[] = []
  if (input.lastOkCycleAt === null) {
    return input.consecutiveFailures > 0
      ? { status: 'failing', reasons: ['no_successful_cycle_yet'] }
      : { status: 'starting', reasons: [] }
  }
  if (input.now - input.lastOkCycleAt > input.maxCycleAgeMs) reasons.push('last_ok_cycle_too_old')
  if (reasons.length > 0) return { status: 'failing', reasons }
  if (input.consecutiveFailures > 0) reasons.push('recent_cycle_failures')
  if (input.lastCycle?.discoveryStale) reasons.push('discovery_stale')
  if (input.lastCycle && input.lastCycle.unreadableMarkets > 0) reasons.push('unreadable_markets')
  return { status: reasons.length > 0 ? 'degraded' : 'ok', reasons }
}

export class ScanLoop {
  private stopping = false
  private wake: (() => void) | null = null
  private lastOkCycleAt: number | null = null
  private consecutiveFailures = 0
  private lastError: string | null = null
  private lastCycle: CycleSummary | null = null
  private alertedStatus: HealthStatus = 'starting'
  private server: Server | null = null
  private readonly startedAt: number
  private readonly clock: Clock

  constructor(
    private readonly deps: {
      config: Config
      scanner: Scanner
      store: Store
      alerter: Alerter
      logger: Logger
      rpcStats?: () => RpcStats
      clock?: Clock
    },
  ) {
    this.clock = deps.clock ?? systemClock
    this.startedAt = this.clock.now()
  }

  heartbeat(): Heartbeat {
    const health = deriveHealth({
      now: this.clock.now(),
      lastOkCycleAt: this.lastOkCycleAt,
      consecutiveFailures: this.consecutiveFailures,
      lastCycle: this.lastCycle,
      maxCycleAgeMs: this.deps.config.health.maxCycleAgeMs,
    })
    return {
      ...health,
      ts: this.clock.now(),
      pid: process.pid,
      startedAt: this.startedAt,
      lastOkCycleAt: this.lastOkCycleAt,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      lastCycle: this.lastCycle,
      rpc: this.deps.rpcStats?.() ?? null,
      liveExecutionEnabled: this.deps.config.live_execution_enabled,
    }
  }

  private writeHeartbeat(): void {
    try {
      const dir = this.deps.config.storage.dataDir
      mkdirSync(dir, { recursive: true })
      const path = join(dir, 'heartbeat.json')
      // Write-then-rename so a reader never sees a half-written file.
      writeFileSync(`${path}.tmp`, JSON.stringify(this.heartbeat(), null, 2))
      renameSync(`${path}.tmp`, path)
    } catch (error) {
      this.deps.logger.error('heartbeat.write_failed', { error })
    }
  }

  private async alertOnHealthTransition(): Promise<void> {
    const { status, reasons } = this.heartbeat()
    if (status === 'starting' || status === this.alertedStatus) return
    const wasOk = this.alertedStatus === 'ok' || this.alertedStatus === 'starting'
    if (status === 'ok' && !wasOk) {
      await this.deps.alerter.emit({
        kind: 'scanner_recovered',
        key: `scanner_recovered:${newId('h')}`,
        severity: 'info',
        title: 'Scanner recovered',
        payload: {},
      })
    } else if (status !== 'ok' && wasOk) {
      await this.deps.alerter.emit({
        kind: 'scanner_degraded',
        key: `scanner_degraded:${newId('h')}`,
        severity: status === 'failing' ? 'critical' : 'warning',
        title: `Scanner ${status}: ${reasons.join(', ')}`,
        payload: { status, reasons, lastError: this.lastError },
      })
    }
    this.alertedStatus = status
  }

  /** Runs exactly one supervised cycle. Never throws. */
  async tick(): Promise<boolean> {
    const startedAt = this.clock.now()
    const tickId = newId('tick')
    let ok = false
    try {
      this.lastCycle = await withLogContext({ tickId }, () => this.deps.scanner.runCycle())
      this.lastOkCycleAt = this.clock.now()
      this.consecutiveFailures = 0
      this.lastError = null
      ok = true
    } catch (error) {
      this.consecutiveFailures += 1
      this.lastError = error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 500) : String(error)
      this.deps.logger.error('cycle.failed', {
        tickId,
        consecutiveFailures: this.consecutiveFailures,
        error,
      })
      try {
        this.deps.store.recordCycle({
          id: tickId,
          startedAt,
          finishedAt: this.clock.now(),
          ok: false,
          block: null,
          positionsRead: 0,
          unreadable: 0,
          inBand: 0,
          near: 0,
          liquidatable: 0,
          evaluated: 0,
          candidates: 0,
          error: this.lastError,
        })
      } catch (storeError) {
        this.deps.logger.error('cycle.record_failed', { error: storeError })
      }
    }
    this.writeHeartbeat()
    try {
      await this.alertOnHealthTransition()
    } catch (error) {
      this.deps.logger.error('alert.health_transition_failed', { error })
    }
    return ok
  }

  /** Delay before the next cycle: the poll interval, stretched while failing. */
  nextDelayMs(random: () => number = Math.random): number {
    const { pollIntervalMs, maxLoopBackoffMs } = this.deps.config.scanner
    if (this.consecutiveFailures === 0) return pollIntervalMs
    return (
      pollIntervalMs +
      backoffDelayMs(this.consecutiveFailures, { baseMs: pollIntervalMs, maxMs: maxLoopBackoffMs, random })
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wake = null
        resolve()
      }, ms)
      this.wake = () => {
        clearTimeout(timer)
        this.wake = null
        resolve()
      }
    })
  }

  startHealthServer(): void {
    const port = this.deps.config.health.port
    if (port === 0) return
    this.server = createServer((req, res) => {
      if (req.url !== '/healthz' && req.url !== '/') {
        res.writeHead(404).end()
        return
      }
      const beat = this.heartbeat()
      // degraded still serves 200: the process is doing its job with reduced
      // coverage. Only "failing" should make a supervisor restart it.
      res.writeHead(beat.status === 'failing' ? 503 : 200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(beat))
    })
    this.server.listen(port, '127.0.0.1', () => {
      this.deps.logger.info('health.listening', { port })
    })
  }

  async run(): Promise<void> {
    this.startHealthServer()
    let pruneAt = 0
    while (!this.stopping) {
      await this.tick()
      if (this.clock.now() > pruneAt) {
        this.deps.store.pruneCycles(this.clock.now() - 7 * 24 * 3600_000)
        pruneAt = this.clock.now() + 3600_000
      }
      if (this.stopping) break
      await this.sleep(this.nextDelayMs())
    }
    this.server?.close()
    this.deps.logger.info('loop.stopped', {})
  }

  stop(): void {
    this.stopping = true
    this.wake?.()
  }
}
