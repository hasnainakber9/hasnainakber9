import { describe, expect, it } from 'vitest'

import { createLogger, redactUrls, silentLogger } from '../../src/logger.ts'
import { createGuardedRequest, isRetryableRpcError, RpcUnavailableError } from '../../src/rpc/client.ts'
import {
  backoffDelayMs,
  CircuitBreaker,
  CircuitOpenError,
  FreshnessCache,
  RateLimiter,
  type Clock,
} from '../../src/util/resilience.ts'

/** A clock where sleeping advances time instantly. */
function fakeClock(start = 1_000_000): Clock & { advance(ms: number): void; slept: number[] } {
  let now = start
  const slept: number[] = []
  return {
    now: () => now,
    sleep: async (ms) => {
      slept.push(ms)
      now += ms
    },
    advance: (ms) => {
      now += ms
    },
    slept,
  }
}

describe('backoffDelayMs', () => {
  it('doubles the ceiling per attempt and caps it', () => {
    const top = { baseMs: 100, maxMs: 1000, random: () => 0.999999 }
    expect(backoffDelayMs(0, top)).toBe(99)
    expect(backoffDelayMs(1, top)).toBe(199)
    expect(backoffDelayMs(3, top)).toBe(799)
    expect(backoffDelayMs(10, top)).toBe(999)
  })

  it('jitters down to zero', () => {
    expect(backoffDelayMs(5, { baseMs: 100, maxMs: 1000, random: () => 0 })).toBe(0)
  })
})

describe('CircuitBreaker', () => {
  it('opens after the threshold, then half-opens after the cooldown', () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 }, clock)
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.state).toBe('closed')
    breaker.recordFailure()
    expect(breaker.state).toBe('open')
    expect(() => breaker.acquire()).toThrow(CircuitOpenError)

    clock.advance(1000)
    expect(breaker.state).toBe('half_open')
    breaker.acquire() // the single probe
    expect(() => breaker.acquire()).toThrow(CircuitOpenError) // no second probe
  })

  it('closes on a successful probe and re-opens on a failed one', () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 500 }, clock)
    breaker.recordFailure()
    clock.advance(500)
    breaker.acquire()
    breaker.recordFailure()
    expect(breaker.state).toBe('open')
    clock.advance(500)
    breaker.acquire()
    breaker.recordSuccess()
    expect(breaker.state).toBe('closed')
    expect(breaker.snapshot().consecutiveFailures).toBe(0)
  })

  it('a success resets the failure count', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 500 }, fakeClock())
    breaker.recordFailure()
    breaker.recordSuccess()
    breaker.recordFailure()
    expect(breaker.state).toBe('closed')
  })
})

describe('RateLimiter', () => {
  it('lets a burst through then spaces requests at the configured rate', async () => {
    const clock = fakeClock()
    const limiter = new RateLimiter({ ratePerSecond: 2, burst: 2 }, clock)
    await limiter.acquire()
    await limiter.acquire()
    expect(clock.slept).toEqual([])
    await limiter.acquire()
    await limiter.acquire()
    expect(clock.slept).toEqual([500, 500])
  })
})

describe('FreshnessCache', () => {
  it('reports age and stops returning a value once stale', () => {
    const clock = fakeClock()
    const cache = new FreshnessCache<string, number>(1000, clock)
    cache.set('k', 7)
    clock.advance(400)
    expect(cache.get('k')).toMatchObject({ value: 7, ageMs: 400, fresh: true })
    expect(cache.getFresh('k')).toBe(7)
    clock.advance(700)
    expect(cache.get('k')).toMatchObject({ value: 7, ageMs: 1100, fresh: false })
    expect(cache.getFresh('k')).toBeUndefined()
    cache.prune()
    expect(cache.size).toBe(0)
  })
})

describe('isRetryableRpcError', () => {
  it('retries infrastructure failures', () => {
    expect(isRetryableRpcError(Object.assign(new Error('x'), { status: 429 }))).toBe(true)
    expect(isRetryableRpcError(Object.assign(new Error('x'), { status: 503 }))).toBe(true)
    expect(isRetryableRpcError(new Error('The request took too long. timed out'))).toBe(true)
    expect(isRetryableRpcError(new Error('header not found'))).toBe(true)
    expect(isRetryableRpcError(new Error('wrapped', { cause: new Error('fetch failed') }))).toBe(true)
  })

  it('does not retry deterministic failures', () => {
    expect(isRetryableRpcError(new Error('execution reverted: position is healthy'))).toBe(false)
    expect(isRetryableRpcError(Object.assign(new Error('bad request'), { status: 400 }))).toBe(false)
    expect(isRetryableRpcError(new Error('invalid params'))).toBe(false)
  })
})

describe('createGuardedRequest', () => {
  const opts = {
    maxRequestsPerSecond: 1000,
    maxRetries: 3,
    backoffBaseMs: 100,
    backoffMaxMs: 1000,
    breakerFailureThreshold: 5,
    breakerCooldownMs: 10_000,
  }
  const deps = () => ({ logger: silentLogger, clock: fakeClock(), random: () => 0.5 })

  it('retries a transient failure with backoff and then succeeds', async () => {
    let calls = 0
    const d = deps()
    const { request, stats } = createGuardedRequest(
      [
        async () => {
          calls += 1
          if (calls < 3) throw Object.assign(new Error('rate limited'), { status: 429 })
          return '0x1'
        },
      ],
      opts,
      d,
    )
    await expect(request({ method: 'eth_blockNumber' })).resolves.toBe('0x1')
    expect(calls).toBe(3)
    expect(stats().retries).toBe(2)
    expect(d.clock.slept.filter((ms) => ms >= 50)).toEqual([50, 100])
  })

  it('does not retry a revert and does not count it against the breaker', async () => {
    let calls = 0
    const { request, stats } = createGuardedRequest(
      [
        async () => {
          calls += 1
          throw new Error('execution reverted: position is healthy')
        },
      ],
      opts,
      deps(),
    )
    await expect(request({ method: 'eth_call' })).rejects.toThrow('position is healthy')
    expect(calls).toBe(1)
    expect(stats().breaker).toEqual({ state: 'closed', consecutiveFailures: 0 })
  })

  it('fails over to the next endpoint', async () => {
    const seen: number[] = []
    const { request } = createGuardedRequest(
      [
        async () => {
          seen.push(0)
          throw Object.assign(new Error('down'), { status: 502 })
        },
        async () => {
          seen.push(1)
          return 'ok'
        },
      ],
      opts,
      deps(),
    )
    await expect(request({ method: 'eth_call' })).resolves.toBe('ok')
    // The healthy endpoint is preferred from then on.
    await expect(request({ method: 'eth_call' })).resolves.toBe('ok')
    expect(seen).toEqual([0, 1, 1])
  })

  it('gives up with RpcUnavailableError and then fails fast once the breaker opens', async () => {
    let calls = 0
    const { request, stats } = createGuardedRequest(
      [
        async () => {
          calls += 1
          throw Object.assign(new Error('down'), { status: 503 })
        },
      ],
      { ...opts, breakerFailureThreshold: 4 },
      deps(),
    )
    await expect(request({ method: 'eth_call' })).rejects.toBeInstanceOf(RpcUnavailableError)
    expect(calls).toBe(4) // 1 try + 3 retries, which also opens the breaker
    expect(stats().breaker.state).toBe('open')
    await expect(request({ method: 'eth_call' })).rejects.toBeInstanceOf(RpcUnavailableError)
    expect(calls).toBe(4) // no traffic while open
  })
})

describe('secret hygiene', () => {
  const KEYED = 'https://base-mainnet.example.com/v2/SECRET-API-KEY-123'

  it('redacts URLs from text', () => {
    expect(redactUrls(`HTTP request failed. URL: ${KEYED} status 429`)).toBe('HTTP request failed. URL: <url> status 429')
    expect(redactUrls(`wss://node.example/ws?key=abc and (${KEYED})`)).toBe('<url> and (<url>)')
    expect(redactUrls('no endpoint here')).toBe('no endpoint here')
  })

  it('never writes an endpoint into a log line', () => {
    const lines: string[] = []
    const logger = createLogger({ write: (line) => lines.push(line) })
    logger.error('cycle.failed', { error: new Error(`fetch failed for ${KEYED}`) })
    expect(lines[0]).not.toContain('SECRET-API-KEY-123')
    expect(lines[0]).toContain('<url>')
  })

  it('never puts an endpoint into the error an exhausted request throws', async () => {
    const lines: string[] = []
    const { request } = createGuardedRequest(
      [
        async () => {
          throw Object.assign(new Error(`HTTP request failed. URL: ${KEYED}`), { status: 503 })
        },
      ],
      { maxRequestsPerSecond: 1000, maxRetries: 1, backoffBaseMs: 1, backoffMaxMs: 2, breakerFailureThreshold: 9, breakerCooldownMs: 10 },
      { logger: createLogger({ write: (line) => lines.push(line) }), clock: fakeClock(), random: () => 0 },
    )
    const error = await request({ method: 'eth_call' }).catch((e: Error) => e)
    expect(error).toBeInstanceOf(RpcUnavailableError)
    expect((error as Error).message).not.toContain('SECRET-API-KEY-123')
    expect(lines.join('\n')).not.toContain('SECRET-API-KEY-123')
    expect(lines.length).toBeGreaterThan(0)
  })
})
