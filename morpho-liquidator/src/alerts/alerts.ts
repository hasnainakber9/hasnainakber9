// Event-driven alerts. An alert fires on a state TRANSITION (a position
// becomes liquidatable, a realistic candidate appears, the scanner degrades or
// recovers) and never on a timer. Each alert has a key; the same key is
// suppressed for a cooldown so a position flapping across a boundary does not
// page repeatedly. Every alert is written to the database whether or not a
// sink delivered it.

import type { Store } from '../db.ts'
import type { Logger } from '../logger.ts'

export type AlertKind =
  | 'position_liquidatable'
  | 'realistic_candidate'
  | 'position_resolved'
  | 'scanner_degraded'
  | 'scanner_recovered'
  | 'kill_switch_engaged'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  kind: AlertKind
  /** Dedupe key, e.g. `candidate:<market>:<borrower>`. */
  key: string
  severity: AlertSeverity
  title: string
  payload: Record<string, unknown>
}

export interface AlertSink {
  readonly name: string
  send(alert: Alert): Promise<void>
}

/** POSTs the alert as JSON (`text` + fields) to a webhook; Slack/Discord-compatible `text`. */
export class WebhookSink implements AlertSink {
  readonly name = 'webhook'

  constructor(
    private readonly url: string,
    private readonly timeoutMs: number,
    private readonly doFetch: typeof fetch = fetch,
  ) {}

  async send(alert: Alert): Promise<void> {
    const response = await this.doFetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        {
          text: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          content: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          kind: alert.kind,
          key: alert.key,
          ...alert.payload,
        },
        (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      ),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) throw new Error(`webhook responded HTTP ${response.status}`)
  }
}

export class Alerter {
  constructor(
    private readonly deps: {
      store: Store
      logger: Logger
      sinks: AlertSink[]
      now?: () => number
    },
    private readonly opts: { cooldownMs: number },
  ) {}

  /**
   * Emits an alert unless the same key fired within the cooldown. Returns
   * whether it was emitted. A failing sink never throws into the scan loop.
   */
  async emit(alert: Alert): Promise<boolean> {
    const now = (this.deps.now ?? Date.now)()
    const last = this.deps.store.lastAlertAt(alert.key)
    if (last !== null && now - last < this.opts.cooldownMs) {
      this.deps.logger.debug('alert.suppressed', { kind: alert.kind, key: alert.key })
      return false
    }

    let delivered = this.deps.sinks.length > 0
    for (const sink of this.deps.sinks) {
      try {
        await sink.send(alert)
      } catch (error) {
        delivered = false
        this.deps.logger.error('alert.sink_failed', { sink: sink.name, kind: alert.kind, error })
      }
    }
    this.deps.store.recordAlert({
      ts: now,
      kind: alert.kind,
      key: alert.key,
      severity: alert.severity,
      payload: { title: alert.title, ...alert.payload },
      delivered,
    })
    const level = alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warn' : 'info'
    this.deps.logger[level]('alert', {
      kind: alert.kind,
      key: alert.key,
      severity: alert.severity,
      title: alert.title,
      ...alert.payload,
    })
    return true
  }
}
