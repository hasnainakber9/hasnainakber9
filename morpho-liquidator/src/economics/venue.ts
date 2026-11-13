// Liquidity venue and pricer interfaces. Modelled on the pluggable
// `LiquidityVenue` / `Pricer` interfaces of morpho-org/morpho-blue-liquidation-bot,
// reduced to what a research-phase scanner needs: quoting, not encoding swaps.

import type { Address } from 'viem'

import { FreshnessCache, type Clock } from '../util/resilience.ts'

export interface RouteHop {
  tokenIn: Address
  tokenOut: Address
  /** Pool fee in hundredths of a bip (500 = 0.05%). */
  fee: number
}

export interface Quote {
  venue: string
  amountIn: bigint
  amountOut: bigint
  hops: RouteHop[]
}

export interface LiquidityVenue {
  readonly name: string
  /**
   * Best executable output for selling each `amountsIn[i]` of `tokenIn` for
   * `tokenOut`, or null where the venue has no route that fills that size.
   *
   * Must THROW when the venue could not be queried (RPC failure): "no route"
   * and "could not ask" are different answers and are recorded differently.
   */
  quoteExactIn(tokenIn: Address, tokenOut: Address, amountsIn: bigint[]): Promise<(Quote | null)[]>
}

export interface UsdPricer {
  /** USD price of one whole token, or null when it cannot be priced. */
  priceUsd(token: { address: Address; decimals: number }): Promise<number | null>
}

/**
 * Short-lived quote cache in front of a venue. Within one cycle, every
 * position in a market asks for the same seize amounts (the ladder rungs are a
 * function of the market's price, not the position), so one set of quotes
 * serves all of them. The TTL is kept to a few blocks: a quote is a claim
 * about pool state and goes stale quickly.
 */
export class CachedVenue implements LiquidityVenue {
  readonly name: string
  private readonly cache: FreshnessCache<string, Quote | null>
  hits = 0
  misses = 0

  constructor(
    private readonly inner: LiquidityVenue,
    ttlMs: number,
    clock?: Clock,
  ) {
    this.name = inner.name
    this.cache = new FreshnessCache(ttlMs, clock)
  }

  async quoteExactIn(tokenIn: Address, tokenOut: Address, amountsIn: bigint[]): Promise<(Quote | null)[]> {
    const key = (amount: bigint) => `${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}:${amount}`
    const out: (Quote | null | undefined)[] = amountsIn.map((amount) => {
      const entry = this.cache.get(key(amount))
      return entry?.fresh ? entry.value : undefined
    })
    const missing = [...new Set(amountsIn.filter((_, i) => out[i] === undefined))]
    this.hits += amountsIn.length - missing.length
    this.misses += missing.length
    if (missing.length > 0) {
      // A throw here propagates: a failed query is never cached as "no route".
      const fresh = await this.inner.quoteExactIn(tokenIn, tokenOut, missing)
      missing.forEach((amount, i) => this.cache.set(key(amount), fresh[i] ?? null))
    }
    return amountsIn.map((amount, i) => (out[i] !== undefined ? out[i]! : (this.cache.get(key(amount))?.value ?? null)))
  }
}
