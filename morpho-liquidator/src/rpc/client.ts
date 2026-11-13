// Resilient RPC access. Every JSON-RPC request passes through, in order:
// rate limiter -> circuit breaker -> endpoint -> retry with jittered backoff.
//
// Failures are split into two kinds, because conflating them is how a scanner
// either hammers a rate-limited endpoint or treats an outage as "no positions":
//   - infrastructure (timeouts, HTTP 429/5xx, missing header, transport errors):
//     retried with backoff, counted by the circuit breaker;
//   - deterministic (execution reverted, invalid params): returned immediately,
//     never retried, never counted. Retrying a revert cannot change the answer.

import {
  createPublicClient,
  custom,
  http,
  type Chain,
  type EIP1193RequestFn,
  type PublicClient,
} from 'viem'
import { base } from 'viem/chains'

import { newId, redactUrls, type Logger } from '../logger.ts'
import {
  backoffDelayMs,
  CircuitBreaker,
  CircuitOpenError,
  RateLimiter,
  systemClock,
  type Clock,
} from '../util/resilience.ts'

export interface RpcOptions {
  urls: string[]
  maxRequestsPerSecond: number
  timeoutMs: number
  maxRetries: number
  backoffBaseMs: number
  backoffMaxMs: number
  breakerFailureThreshold: number
  breakerCooldownMs: number
}

export class RpcUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RpcUnavailableError'
  }
}

const DETERMINISTIC_PATTERNS = [
  /execution reverted/i,
  /\brevert/i,
  /invalid opcode/i,
  /out of gas/i,
  /invalid (params|argument)/i,
  /method not found/i,
]

const INFRASTRUCTURE_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /timed? ?out/i,
  /header not found/i,
  /unknown block/i,
  /block not found/i,
  /missing trie node/i,
  /over (rate|capacity)/i,
  /fetch failed/i,
  /econnreset|econnrefused|enotfound|socket hang up/i,
  /service unavailable|bad gateway|gateway timeout/i,
]

function describe(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; current && depth < 5; depth += 1) {
    const e = current as { message?: unknown; details?: unknown; shortMessage?: unknown }
    for (const part of [e.shortMessage, e.message, e.details]) {
      if (typeof part === 'string') parts.push(part)
    }
    current = (current as { cause?: unknown }).cause
  }
  // Never let an endpoint (and the key in its path) into a log line or message.
  return redactUrls(parts.join(' | '))
}

function httpStatus(error: unknown): number | undefined {
  let current: unknown = error
  for (let depth = 0; current && depth < 5; depth += 1) {
    const status = (current as { status?: unknown }).status
    if (typeof status === 'number') return status
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

/** True when retrying the same request could plausibly succeed. */
export function isRetryableRpcError(error: unknown): boolean {
  const status = httpStatus(error)
  if (status !== undefined) {
    if (status === 429 || status >= 500) return true
    if (status >= 400) return false
  }
  const text = describe(error)
  if (INFRASTRUCTURE_PATTERNS.some((p) => p.test(text))) return true
  if (DETERMINISTIC_PATTERNS.some((p) => p.test(text))) return false
  // Unknown failure shape: treat as infrastructure. Retrying is bounded, and
  // giving up early on an unrecognised transient error would look like silence.
  return true
}

export interface RpcStats {
  requests: number
  retries: number
  failures: number
  breaker: ReturnType<CircuitBreaker['snapshot']>
}

export interface ResilientRpc {
  client: PublicClient
  stats(): RpcStats
}

type RawRequest = (args: { method: string; params?: unknown }) => Promise<unknown>

/**
 * Wraps one raw request function per endpoint with limiter, breaker and
 * retries. Exposed separately from viem so the policy is unit-testable.
 */
export function createGuardedRequest(
  endpoints: RawRequest[],
  opts: Omit<RpcOptions, 'urls' | 'timeoutMs'>,
  deps: { logger: Logger; clock?: Clock; random?: () => number },
): { request: RawRequest; stats: () => RpcStats } {
  if (endpoints.length === 0) throw new Error('at least one RPC endpoint is required')
  const clock = deps.clock ?? systemClock
  const limiter = new RateLimiter({ ratePerSecond: opts.maxRequestsPerSecond }, clock)
  const breaker = new CircuitBreaker(
    { failureThreshold: opts.breakerFailureThreshold, cooldownMs: opts.breakerCooldownMs },
    clock,
  )
  const counters = { requests: 0, retries: 0, failures: 0 }
  let preferred = 0

  const request: RawRequest = async (args) => {
    const reqId = newId('rpc')
    counters.requests += 1
    let lastError: unknown

    for (let attempt = 0; attempt <= opts.maxRetries; attempt += 1) {
      try {
        breaker.acquire()
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          counters.failures += 1
          throw new RpcUnavailableError(error.message, { cause: lastError ?? error })
        }
        throw error
      }
      await limiter.acquire()

      const index = (preferred + attempt) % endpoints.length
      const startedAt = clock.now()
      try {
        const result = await endpoints[index]!(args)
        breaker.recordSuccess()
        preferred = index
        deps.logger.debug('rpc.ok', {
          reqId,
          method: args.method,
          attempt,
          endpoint: index,
          ms: clock.now() - startedAt,
        })
        return result
      } catch (error) {
        if (!isRetryableRpcError(error)) {
          // A deterministic answer (e.g. a revert) proves the endpoint is up.
          breaker.recordSuccess()
          throw error
        }
        lastError = error
        breaker.recordFailure()
        const willRetry = attempt < opts.maxRetries
        deps.logger.warn('rpc.retryable_error', {
          reqId,
          method: args.method,
          attempt,
          endpoint: index,
          willRetry,
          status: httpStatus(error),
          error: describe(error).slice(0, 300),
        })
        if (!willRetry) break
        counters.retries += 1
        await clock.sleep(
          backoffDelayMs(attempt, {
            baseMs: opts.backoffBaseMs,
            maxMs: opts.backoffMaxMs,
            random: deps.random,
          }),
        )
      }
    }

    counters.failures += 1
    throw new RpcUnavailableError(
      `rpc ${args.method} failed after ${opts.maxRetries + 1} attempts: ${describe(lastError).slice(0, 300)}`,
      { cause: lastError },
    )
  }

  return { request, stats: () => ({ ...counters, breaker: breaker.snapshot() }) }
}

/** A viem public client for Base whose every request is guarded. */
export function createResilientRpc(
  opts: RpcOptions,
  deps: { logger: Logger; chain?: Chain },
): ResilientRpc {
  const chain = deps.chain ?? base
  // viem's own retries are disabled: the guard owns the retry policy.
  const endpoints = opts.urls.map((url) => {
    const transport = http(url, { retryCount: 0, timeout: opts.timeoutMs })({
      chain,
      retryCount: 0,
    })
    return ((args) => transport.request(args as never)) as RawRequest
  })
  const guarded = createGuardedRequest(endpoints, opts, deps)
  const client = createPublicClient({
    chain,
    transport: custom({ request: guarded.request as EIP1193RequestFn }, { retryCount: 0 }),
    batch: { multicall: false },
  })
  return { client: client as PublicClient, stats: guarded.stats }
}
