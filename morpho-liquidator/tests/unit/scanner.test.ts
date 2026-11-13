import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Address } from 'viem'
import { describe, expect, it } from 'vitest'

import { Alerter, type Alert } from '../../src/alerts/alerts.ts'
import { loadConfig, type Config } from '../../src/config.ts'
import { WAD } from '../../src/constants.ts'
import { Store } from '../../src/db.ts'
import { EconomicsEngine } from '../../src/economics/evaluate.ts'
import { silentLogger } from '../../src/logger.ts'
import type { DiscoveryProvider } from '../../src/scanner/discovery.ts'
import { assessHealth } from '../../src/scanner/health.ts'
import { deriveHealth, ScanLoop } from '../../src/scanner/loop.ts'
import { classifyBand, resolutionNote, Scanner } from '../../src/scanner/scanner.ts'
import type { ChainSnapshot } from '../../src/scanner/stateReader.ts'
import {
  fakeGas,
  fakePricer,
  fakeVenue,
  healthInput,
  market,
  MARKET_ID,
  riskConfig,
  TOTAL_BORROW_ASSETS,
  TOTAL_BORROW_SHARES,
} from './helpers.ts'

const A: Address = '0x000000000000000000000000000000000000000A'
const B: Address = '0x000000000000000000000000000000000000000b'

interface World {
  usdPerEth: number
  positions: Map<Address, { collateralEth: number; debtUsdc: number }>
  failRead?: boolean
  failDiscovery?: boolean
  now: number
}

function harness(opts: { store?: Store; world?: World; venue?: ReturnType<typeof fakeVenue> } = {}) {
  const world: World = opts.world ?? { usdPerEth: 3000, positions: new Map(), now: 1_700_000_000_000 }
  const config: Config = {
    ...loadConfig(),
    storage: { dataDir: mkdtempSync(join(tmpdir(), 'scanner-test-')) },
  }
  const info = market()
  const store = opts.store ?? new Store(':memory:')
  const alerts: Alert[] = []
  const clock = { now: () => world.now, sleep: async () => {} }
  const alerter = new Alerter(
    { store, logger: silentLogger, sinks: [{ name: 'capture', send: async (a) => void alerts.push(a) }], now: clock.now },
    { cooldownMs: config.alerts.cooldownMs },
  )
  const registry = {
    load: async () => {},
    all: () => [info],
    get: (id: string) => (id === MARKET_ID ? info : undefined),
    paramsById: () => new Map([[MARKET_ID, info.params]]),
  }
  let block = 100
  const reader = {
    read: async (_markets: unknown, pairs: { marketId: typeof MARKET_ID; borrower: Address }[]): Promise<ChainSnapshot> => {
      if (world.failRead) throw new Error('rpc unavailable')
      block += 1
      const price = healthInput(1, 1, world.usdPerEth).price
      return {
        blockNumber: BigInt(block),
        blockTimestamp: BigInt(Math.floor(world.now / 1000)),
        markets: new Map([
          [
            MARKET_ID,
            {
              id: MARKET_ID,
              params: info.params,
              state: {
                totalSupplyAssets: 0n,
                totalSupplyShares: 0n,
                totalBorrowAssets: TOTAL_BORROW_ASSETS,
                totalBorrowShares: TOTAL_BORROW_SHARES,
                lastUpdate: 1n,
                fee: 0n,
              },
              totalBorrowAssets: TOTAL_BORROW_ASSETS,
              price,
            },
          ],
        ]),
        unreadableMarkets: new Map(),
        unreadablePositions: [],
        positions: pairs.map((pair) => {
          const p = world.positions.get(pair.borrower) ?? { collateralEth: 0, debtUsdc: 0 }
          const input = healthInput(p.collateralEth, p.debtUsdc, world.usdPerEth)
          const borrowShares = p.debtUsdc === 0 ? 0n : input.borrowShares
          return {
            ...pair,
            borrowShares,
            collateral: input.collateral,
            health: assessHealth({ ...input, borrowShares }),
          }
        }),
      }
    },
  }
  const discovery: DiscoveryProvider = {
    name: 'fake',
    discover: async () => {
      if (world.failDiscovery) throw new Error('api down')
      return {
        pairs: [...world.positions.keys()].map((borrower) => ({ marketId: MARKET_ID, borrower, apiHealthFactor: null })),
        complete: true,
        rawRows: world.positions.size,
        malformed: 0,
        pages: 1,
      }
    },
  }
  const venue = opts.venue ?? fakeVenue({ usdPerEth: world.usdPerEth })
  const pricer = fakePricer()
  const economics = new EconomicsEngine(
    { venue, pricer, gas: fakeGas() },
    { ...config.economics, minDebtUsd: config.scanner.minDebtUsd },
    riskConfig,
  )
  const scanner = new Scanner({
    config,
    registry: registry as never,
    reader: reader as never,
    discovery,
    economics,
    pricer,
    store,
    alerter,
    logger: silentLogger,
    clock,
  })
  scanner.init()
  const tick = async (ms = config.scanner.pollIntervalMs) => {
    world.now += ms
    return scanner.runCycle()
  }
  return { world, config, store, alerts, scanner, tick, venue, clock, alerter }
}

const bands = { nearThresholdHf: (102n * WAD) / 100n, researchBandHf: (105n * WAD) / 100n, bandHysteresisBps: 10 }
const healthAt = (hf: number) => assessHealth(healthInput(10, (10 * 3000 * 0.86) / hf, 3000))

describe('classifyBand', () => {
  it('maps health to bands', () => {
    expect(classifyBand(healthAt(0.99), null, bands)).toBe('liquidatable')
    expect(classifyBand(healthAt(1.01), null, bands)).toBe('near')
    expect(classifyBand(healthAt(1.04), null, bands)).toBe('research')
    expect(classifyBand(healthAt(1.2), null, bands)).toBe('healthy')
    expect(classifyBand({ ...healthAt(1.2), hasDebt: false }, 'near', bands)).toBe('closed')
  })

  it('holds a band until the health factor clears the boundary by the hysteresis', () => {
    // 1.0205 is above the 1.02 boundary but inside the 10 bps hysteresis (1.02102).
    expect(classifyBand(healthAt(1.0205), 'near', bands)).toBe('near')
    expect(classifyBand(healthAt(1.0205), 'research', bands)).toBe('research')
    expect(classifyBand(healthAt(1.022), 'near', bands)).toBe('research')
    expect(classifyBand(healthAt(1.0505), 'research', bands)).toBe('research')
    expect(classifyBand(healthAt(1.0505), null, bands)).toBe('healthy')
  })

  it('never applies hysteresis to the liquidation boundary itself', () => {
    expect(classifyBand(healthAt(1.0001), 'liquidatable', bands)).toBe('near')
  })
})

describe('resolutionNote', () => {
  const before = { borrowShares: 100n, collateral: 100n }
  it('infers what resolved a liquidatable position', () => {
    expect(resolutionNote(before, { borrowShares: 40n, collateral: 30n })).toBe('liquidated_by_other')
    expect(resolutionNote(before, { borrowShares: 40n, collateral: 100n })).toBe('repaid')
    expect(resolutionNote(before, { borrowShares: 100n, collateral: 150n })).toBe('collateral_added')
    expect(resolutionNote(before, before)).toBe('price_recovered')
  })
})

describe('Scanner cycle', () => {
  it('tracks a position through research -> near -> liquidatable and alerts once', async () => {
    const h = harness()
    // 10 ETH, $24,800 debt: HF = 25,800 / 24,800 = 1.040 at $3000.
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 24_800 })
    let summary = await h.tick()
    expect(summary).toMatchObject({ positionsRead: 1, inBand: 1, near: 0, liquidatable: 0, evaluated: 0 })

    h.world.usdPerEth = 2920 // HF 1.0126 -> near: economics run hypothetically
    summary = await h.tick()
    expect(summary).toMatchObject({ near: 1, evaluated: 1, candidates: 0 })
    expect(h.alerts).toHaveLength(0)

    h.world.usdPerEth = 2850 // HF 0.988 -> liquidatable
    summary = await h.tick()
    expect(summary).toMatchObject({ liquidatable: 1, candidates: 1, realisticCandidates: 0 })
    expect(h.alerts.map((a) => a.kind)).toEqual(['position_liquidatable'])

    const events = h.store.query<{ from_band: string | null; to_band: string }>(
      'SELECT from_band, to_band FROM band_events ORDER BY id',
    )
    expect(events).toEqual([
      { from_band: null, to_band: 'research' },
      { from_band: 'research', to_band: 'near' },
      { from_band: 'near', to_band: 'liquidatable' },
    ])
  })

  it('only calls a candidate realistic once it has persisted, then alerts critically', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 27_000 }) // HF 0.955
    await h.tick() // startup backlog: candidate streak 1, no liquidatable alert
    expect(h.alerts).toHaveLength(0)
    expect(h.store.query('SELECT * FROM realistic_candidates')).toHaveLength(0)

    const summary = await h.tick() // streak 2 == persistenceCycles
    expect(summary.realisticCandidates).toBe(1)
    const critical = h.alerts.filter((a) => a.kind === 'realistic_candidate')
    expect(critical).toHaveLength(1)
    expect(critical[0]!.severity).toBe('critical')
    expect(critical[0]!.payload.liveExecution).toBe('disabled')

    await h.tick() // streak 3: already reported
    expect(h.store.query('SELECT * FROM realistic_candidates')).toHaveLength(1)
    expect(h.alerts.filter((a) => a.kind === 'realistic_candidate')).toHaveLength(1)
  })

  it('stores an explicit rejection reason for a liquidatable position that does not pay', async () => {
    const h = harness({ venue: fakeVenue({ usdPerEth: 2700 }) }) // venue 10% under the oracle
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 27_000 })
    await h.tick()
    const [row] = h.store.query<{ status: string; rejection_reason: string; hypothetical: number; detail: string }>(
      'SELECT status, rejection_reason, hypothetical, detail FROM evaluations',
    )
    expect(row).toMatchObject({ status: 'rejected', rejection_reason: 'unprofitable_after_buffers', hypothetical: 0 })
    expect(JSON.parse(row!.detail).sizes).toHaveLength(3)
  })

  it('extends an unchanged verdict instead of adding rows', async () => {
    const h = harness({ venue: fakeVenue({ usdPerEth: 2700 }) })
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 27_000 })
    await h.tick()
    await h.tick(h.config.economics.quoteTtlMs + 1)
    await h.tick(h.config.economics.quoteTtlMs + 1)
    expect(h.store.query<{ observations: number }>('SELECT observations FROM evaluations')).toEqual([{ observations: 3 }])
  })

  it('fails closed on a chain read error: no writes, no alerts, state intact', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 24_800 })
    await h.tick()
    const before = h.store.query('SELECT * FROM positions')

    h.world.failRead = true
    h.world.usdPerEth = 2000 // would be liquidatable, if it could be read
    await expect(h.tick()).rejects.toThrow('rpc unavailable')
    expect(h.store.query('SELECT * FROM positions')).toEqual(before)
    expect(h.store.query('SELECT * FROM band_events')).toHaveLength(1)
    expect(h.alerts).toHaveLength(0)

    h.world.failRead = false
    const summary = await h.tick()
    expect(summary.liquidatable).toBe(1)
  })

  it('keeps reading known positions when discovery is down, and reports it stale', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 24_800 })
    await h.tick()
    h.world.failDiscovery = true
    h.world.usdPerEth = 2850
    const summary = await h.tick(h.config.discovery.maxAgeMs + 60_000)
    expect(summary.liquidatable).toBe(1) // on-chain truth still flows
    expect(summary.discoveryStale).toBe(true)
  })

  it('refuses to report an empty market when it has never seen one', async () => {
    const h = harness()
    h.world.failDiscovery = true
    await expect(h.tick()).rejects.toThrow(/discovery has never succeeded/)
  })

  it('records who resolved a candidate and drops closed positions', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 27_000 })
    await h.tick()
    await h.tick()
    // Someone else liquidates most of it.
    h.world.positions.set(A, { collateralEth: 2, debtUsdc: 4_000 })
    await h.tick()
    const last = h.store.query<{ to_band: string; note: string }>('SELECT to_band, note FROM band_events ORDER BY id DESC LIMIT 1')
    expect(last[0]).toEqual({ to_band: 'healthy', note: 'liquidated_by_other' })
    expect(h.alerts.at(-1)!.kind).toBe('position_resolved')

    h.world.positions.set(A, { collateralEth: 2, debtUsdc: 0 })
    await h.tick()
    expect(h.scanner.trackedCount).toBe(0)
  })

  it('does not alert on dust', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 0.01, debtUsdc: 24.8 }) // $24.80 of debt
    await h.tick()
    h.world.usdPerEth = 2850
    const summary = await h.tick()
    expect(summary.liquidatable).toBe(1)
    expect(h.alerts).toHaveLength(0)
    expect(h.store.query<{ rejection_reason: string }>('SELECT rejection_reason FROM evaluations')).toEqual([
      { rejection_reason: 'dust_position' },
    ])
  })

  it('suppresses candidate alerts while the kill switch is engaged', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 27_000 })
    process.env.KILL_SWITCH = '1'
    try {
      await h.tick()
      const summary = await h.tick()
      expect(summary.killSwitch).toBe(true)
      expect(summary.realisticCandidates).toBe(1) // still recorded for the gate
      expect(h.alerts.filter((a) => a.kind === 'realistic_candidate')).toHaveLength(0)
    } finally {
      delete process.env.KILL_SWITCH
    }
  })

  it('bounds venue-quoted evaluations per cycle and defers the rest', async () => {
    const h = harness()
    for (let i = 1; i <= 70; i += 1) {
      h.world.positions.set(`0x${i.toString(16).padStart(40, '0')}` as Address, { collateralEth: 10, debtUsdc: 25_500 })
    }
    const summary = await h.tick()
    expect(summary.near).toBe(70)
    expect(summary.quoted).toBe(h.config.economics.maxQuotedPerCycle)
    expect(summary.deferred).toBe(70 - h.config.economics.maxQuotedPerCycle)
    const next = await h.tick()
    expect(next.quoted).toBe(70 - h.config.economics.maxQuotedPerCycle) // the deferred ones go first
  })

  it('restores tracked positions and does not re-alert after a restart', async () => {
    const world: World = { usdPerEth: 3000, positions: new Map(), now: 1_700_000_000_000 }
    const store = new Store(':memory:')
    const first = harness({ store, world })
    world.positions.set(A, { collateralEth: 10, debtUsdc: 24_800 })
    world.positions.set(B, { collateralEth: 10, debtUsdc: 24_900 })
    await first.tick()
    world.usdPerEth = 2850
    await first.tick()
    expect(first.alerts.map((a) => a.kind)).toEqual(['position_liquidatable', 'position_liquidatable'])

    // "Restart": a new scanner on the same database, with discovery down.
    world.failDiscovery = true
    const second = harness({ store, world })
    expect(second.scanner.trackedCount).toBe(2)
    const summary = await second.tick()
    expect(summary.liquidatable).toBe(2)
    // No band change since the last run, so no "became liquidatable" again...
    expect(second.alerts.filter((a) => a.kind === 'position_liquidatable')).toHaveLength(0)
    // ...and the candidate streak survived the restart: one more confirming
    // cycle makes both realistic.
    expect(second.alerts.map((a) => a.kind)).toEqual(['realistic_candidate', 'realistic_candidate'])
    expect(store.query('SELECT * FROM band_events WHERE to_band = ?', 'liquidatable')).toHaveLength(2)
  })
})

describe('Alerter', () => {
  it('suppresses the same key within the cooldown and survives a failing sink', async () => {
    let now = 1000
    const store = new Store(':memory:')
    const sent: string[] = []
    const alerter = new Alerter(
      {
        store,
        logger: silentLogger,
        now: () => now,
        sinks: [
          { name: 'ok', send: async (a) => void sent.push(a.key) },
          {
            name: 'broken',
            send: async () => {
              throw new Error('webhook 500')
            },
          },
        ],
      },
      { cooldownMs: 60_000 },
    )
    const alert: Alert = { kind: 'position_liquidatable', key: 'k', severity: 'warning', title: 't', payload: {} }
    expect(await alerter.emit(alert)).toBe(true)
    expect(await alerter.emit(alert)).toBe(false)
    now += 60_001
    expect(await alerter.emit(alert)).toBe(true)
    expect(sent).toEqual(['k', 'k'])
    // Recorded even though one sink failed; marked undelivered.
    expect(store.query<{ delivered: number }>('SELECT delivered FROM alerts')).toEqual([{ delivered: 0 }, { delivered: 0 }])
  })
})

describe('supervision', () => {
  it('derives health from the last cycle', () => {
    const base = { now: 100_000, lastOkCycleAt: 95_000, consecutiveFailures: 0, lastCycle: null, maxCycleAgeMs: 60_000 }
    expect(deriveHealth({ ...base, lastOkCycleAt: null })).toEqual({ status: 'starting', reasons: [] })
    expect(deriveHealth({ ...base, lastOkCycleAt: null, consecutiveFailures: 2 }).status).toBe('failing')
    expect(deriveHealth(base)).toEqual({ status: 'ok', reasons: [] })
    expect(deriveHealth({ ...base, consecutiveFailures: 1 }).status).toBe('degraded')
    expect(deriveHealth({ ...base, lastCycle: { discoveryStale: true, unreadableMarkets: 0 } as never }).reasons).toEqual([
      'discovery_stale',
    ])
    expect(deriveHealth({ ...base, lastOkCycleAt: 1_000 })).toEqual({ status: 'failing', reasons: ['last_ok_cycle_too_old'] })
  })

  it('survives failing cycles, backs off, and alerts once on degrade and once on recovery', async () => {
    const h = harness()
    h.world.positions.set(A, { collateralEth: 10, debtUsdc: 20_000 })
    const loop = new ScanLoop({
      config: h.config,
      scanner: h.scanner,
      store: h.store,
      alerter: h.alerter,
      logger: silentLogger,
      clock: h.clock,
    })
    const step = async () => {
      h.world.now += h.config.scanner.pollIntervalMs
      return loop.tick()
    }

    expect(await step()).toBe(true)
    expect(loop.heartbeat().status).toBe('ok')
    expect(loop.nextDelayMs()).toBe(h.config.scanner.pollIntervalMs)

    h.world.failRead = true
    expect(await step()).toBe(false) // never throws
    expect(await step()).toBe(false)
    const beat = loop.heartbeat()
    expect(beat).toMatchObject({ status: 'degraded', consecutiveFailures: 2 })
    expect(beat.lastError).toContain('rpc unavailable')
    // Delay stretches with consecutive failures, bounded by the configured cap.
    const delay = loop.nextDelayMs(() => 0.999)
    expect(delay).toBeGreaterThan(h.config.scanner.pollIntervalMs * 2)
    expect(delay).toBeLessThanOrEqual(h.config.scanner.pollIntervalMs + h.config.scanner.maxLoopBackoffMs)
    expect(h.alerts.map((a) => a.kind)).toEqual(['scanner_degraded'])

    h.world.failRead = false
    expect(await step()).toBe(true)
    expect(h.alerts.map((a) => a.kind)).toEqual(['scanner_degraded', 'scanner_recovered'])
    expect(h.store.query<{ ok: number }>('SELECT ok FROM cycles ORDER BY started_at')).toEqual([
      { ok: 1 },
      { ok: 0 },
      { ok: 0 },
      { ok: 1 },
    ])
  })
})
