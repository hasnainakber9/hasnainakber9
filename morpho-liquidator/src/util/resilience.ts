// Backoff, circuit breaker and rate limiter. Pure logic with an injectable
// clock so every branch is unit-testable without real time passing.

export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

/**
 * Exponential backoff with full jitter: uniform in [0, min(max, base * 2^attempt)].
 * Full jitter spreads retries so concurrent callers do not re-collide.
 */
export function backoffDelayMs(
  attempt: number,
  opts: { baseMs: number; maxMs: number; random?: () => number },
): number {
  const ceiling = Math.min(opts.maxMs, opts.baseMs * 2 ** Math.max(0, attempt))
  return Math.floor((opts.random ?? Math.random)() * ceiling)
}

export class CircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`circuit breaker open; retry in ${retryAfterMs}ms`)
    this.name = 'CircuitOpenError'
  }
}

export type BreakerState = 'closed' | 'open' | 'half_open'

/**
 * Opens after `failureThreshold` consecutive failures, fails fast while open,
 * and lets a single probe through after `cooldownMs`. A successful probe
 * closes it; a failed probe re-opens it for another cooldown.
 */
export class CircuitBreaker {
  private failures = 0
  private openedAt: number | null = null
  private probeInFlight = false

  constructor(
    private readonly opts: { failureThreshold: number; cooldownMs: number },
    private readonly clock: Clock = systemClock,
  ) {}

  get state(): BreakerState {
    if (this.openedAt === null) return 'closed'
    return this.clock.now() - this.openedAt >= this.opts.cooldownMs ? 'half_open' : 'open'
  }

  /** Throws CircuitOpenError unless a call may proceed now. */
  acquire(): void {
    const state = this.state
    if (state === 'closed') return
    if (state === 'half_open' && !this.probeInFlight) {
      this.probeInFlight = true
      return
    }
    const elapsed = this.clock.now() - (this.openedAt ?? 0)
    throw new CircuitOpenError(Math.max(0, this.opts.cooldownMs - elapsed))
  }

  recordSuccess(): void {
    this.failures = 0
    this.openedAt = null
    this.probeInFlight = false
  }

  recordFailure(): void {
    this.failures += 1
    if (this.probeInFlight || this.failures >= this.opts.failureThreshold) {
      this.openedAt = this.clock.now()
    }
    this.probeInFlight = false
  }

  snapshot(): { state: BreakerState; consecutiveFailures: number } {
    return { state: this.state, consecutiveFailures: this.failures }
  }
}

/** Token bucket: at most `ratePerSecond` sustained, `burst` at once. */
export class RateLimiter {
  private tokens: number
  private updatedAt: number
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly opts: { ratePerSecond: number; burst?: number },
    private readonly clock: Clock = systemClock,
  ) {
    this.tokens = opts.burst ?? Math.max(1, Math.ceil(opts.ratePerSecond))
    this.updatedAt = clock.now()
  }

  private get capacity(): number {
    return this.opts.burst ?? Math.max(1, Math.ceil(this.opts.ratePerSecond))
  }

  private refill(): void {
    const now = this.clock.now()
    const gained = ((now - this.updatedAt) / 1000) * this.opts.ratePerSecond
    this.tokens = Math.min(this.capacity, this.tokens + gained)
    this.updatedAt = now
  }

  /** Resolves when one token is available. Callers are served in order. */
  acquire(): Promise<void> {
    const next = this.queue.then(async () => {
      this.refill()
      if (this.tokens < 1) {
        await this.clock.sleep(Math.ceil(((1 - this.tokens) / this.opts.ratePerSecond) * 1000))
        this.refill()
      }
      this.tokens -= 1
    })
    this.queue = next.catch(() => {})
    return next
  }
}

/** Value plus the time it was observed, so staleness is always explicit. */
export interface Timestamped<T> {
  value: T
  observedAt: number
}

/**
 * TTL cache that never hides staleness: `get` returns the entry's age, and
 * `getFresh` returns nothing once the entry is older than its TTL.
 */
export class FreshnessCache<K, V> {
  private readonly entries = new Map<K, Timestamped<V>>()

  constructor(
    private readonly ttlMs: number,
    private readonly clock: Clock = systemClock,
  ) {}

  set(key: K, value: V): void {
    this.entries.set(key, { value, observedAt: this.clock.now() })
    // Bound memory in a long-running process: drop expired entries once the
    // map grows large.
    if (this.entries.size > 5_000) this.prune()
  }

  /** Removes every entry older than the TTL. */
  prune(): void {
    const now = this.clock.now()
    for (const [key, entry] of this.entries) {
      if (now - entry.observedAt > this.ttlMs) this.entries.delete(key)
    }
  }

  get(key: K): (Timestamped<V> & { ageMs: number; fresh: boolean }) | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const ageMs = this.clock.now() - entry.observedAt
    return { ...entry, ageMs, fresh: ageMs <= this.ttlMs }
  }

  getFresh(key: K): V | undefined {
    const entry = this.get(key)
    return entry?.fresh ? entry.value : undefined
  }

  delete(key: K): void {
    this.entries.delete(key)
  }

  get size(): number {
    return this.entries.size
  }
}
