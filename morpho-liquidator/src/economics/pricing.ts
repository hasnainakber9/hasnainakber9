// USD pricing and gas cost. Both are inputs to a profitability verdict, so both
// return null (never a guess) when they cannot be established.

import { formatUnits, type Address, type PublicClient } from 'viem'

import { gasPriceOracleAbi } from '../abis.ts'
import { FreshnessCache, type Clock } from '../util/resilience.ts'
import type { LiquidityVenue, UsdPricer } from './venue.ts'

/** Token amount in base units -> a JS number of whole tokens (for reporting). */
export function toUnits(amount: bigint, decimals: number): number {
  return Number(formatUnits(amount, decimals))
}

/**
 * Prices a token in USD: configured stablecoins are fixed, everything else is
 * priced by an executable venue quote of one whole token into the reference
 * stablecoin. A venue quote is a tradeable price, which is what a liquidator's
 * profit is actually realised at.
 */
export class VenueUsdPricer implements UsdPricer {
  private readonly cache: FreshnessCache<string, number | null>

  constructor(
    private readonly venue: LiquidityVenue,
    private readonly opts: {
      /** Checksummed address -> USD. */
      stablecoins: Record<string, number>
      reference: { address: Address; decimals: number }
      ttlMs: number
    },
    clock?: Clock,
  ) {
    this.cache = new FreshnessCache(opts.ttlMs, clock)
  }

  async priceUsd(token: { address: Address; decimals: number }): Promise<number | null> {
    const fixed = Object.entries(this.opts.stablecoins).find(
      ([address]) => address.toLowerCase() === token.address.toLowerCase(),
    )
    if (fixed) return fixed[1]

    const key = token.address.toLowerCase()
    const cached = this.cache.get(key)
    if (cached?.fresh) return cached.value

    const referenceUsd = this.opts.stablecoins[this.opts.reference.address]
    if (referenceUsd === undefined) return null
    let price: number | null = null
    try {
      const [quote] = await this.venue.quoteExactIn(token.address, this.opts.reference.address, [
        10n ** BigInt(token.decimals),
      ])
      if (quote && quote.amountOut > 0n) {
        price = toUnits(quote.amountOut, this.opts.reference.decimals) * referenceUsd
      }
    } catch {
      price = null
    }
    // Only a real price is cached: a transient failure should be retried.
    if (price !== null) this.cache.set(key, price)
    return price
  }
}

export interface GasCost {
  usd: number
  l2Wei: bigint
  l1Wei: bigint
  gasPriceWei: bigint
}

/** Estimated all-in cost of one liquidation transaction on Base (L2 + L1 data). */
export class GasModel {
  private readonly cache: FreshnessCache<'gas', GasCost | null>

  constructor(
    private readonly client: PublicClient,
    private readonly pricer: UsdPricer,
    private readonly opts: {
      gasPriceOracle: Address
      weth: { address: Address; decimals: number }
      gasUnits: number
      gasPriceMultiplier: number
      l1TxSizeBytes: number
      ttlMs?: number
    },
    clock?: Clock,
  ) {
    this.cache = new FreshnessCache(opts.ttlMs ?? 15_000, clock)
  }

  async cost(): Promise<GasCost | null> {
    const cached = this.cache.getFresh('gas')
    if (cached) return cached
    try {
      const [gasPriceWei, l1Wei, ethUsd] = await Promise.all([
        this.client.getGasPrice(),
        this.client.readContract({
          address: this.opts.gasPriceOracle,
          abi: gasPriceOracleAbi,
          functionName: 'getL1FeeUpperBound',
          args: [BigInt(this.opts.l1TxSizeBytes)],
        }),
        this.pricer.priceUsd(this.opts.weth),
      ])
      if (ethUsd === null) return null
      // Scale the L2 price up: the tx must land when gas is spiking, which is
      // exactly when liquidations happen.
      const scaled = (gasPriceWei * BigInt(Math.round(this.opts.gasPriceMultiplier * 1000))) / 1000n
      const l2Wei = scaled * BigInt(this.opts.gasUnits)
      const cost: GasCost = {
        usd: toUnits(l2Wei + l1Wei, 18) * ethUsd,
        l2Wei,
        l1Wei,
        gasPriceWei,
      }
      this.cache.set('gas', cost)
      return cost
    } catch {
      return null
    }
  }
}
