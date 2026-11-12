// Uniswap v3 venue for Base: executable quotes from QuoterV2, which simulates
// the swap against live pool state (so price impact at the requested size is
// already in the number, unlike a spot price).
//
// Routes considered: direct, and two-hop through each configured hub token.
// For a two-hop route each leg picks its best fee tier greedily (best first-leg
// output, then best second leg for that output). That can miss a marginally
// better combination but keeps one evaluation to a handful of RPC calls.

import type { Address, PublicClient } from 'viem'

import { quoterV2Abi, uniswapV3FactoryAbi } from '../abis.ts'
import { ZERO_ADDRESS } from '../constants.ts'
import { MULTICALL_CALLDATA_BYTES } from '../scanner/stateReader.ts'
import { FreshnessCache, type Clock } from '../util/resilience.ts'
import type { LiquidityVenue, Quote, RouteHop } from './venue.ts'

type CallResult = { status: 'success'; result: unknown } | { status: 'failure'; error: Error }

export interface UniswapV3Options {
  factory: Address
  quoter: Address
  feeTiers: number[]
  hubTokens: Address[]
  /** How long a pool-existence lookup is trusted. */
  poolTtlMs?: number
  /** Quoter simulations per eth_call; each one executes a full swap. */
  quotesPerCall?: number
}

const pairKey = (a: Address, b: Address) =>
  a.toLowerCase() < b.toLowerCase() ? `${a.toLowerCase()}:${b.toLowerCase()}` : `${b.toLowerCase()}:${a.toLowerCase()}`

const same = (a: Address, b: Address) => a.toLowerCase() === b.toLowerCase()

export class UniswapV3Venue implements LiquidityVenue {
  readonly name = 'uniswap-v3'
  private readonly poolFees: FreshnessCache<string, number[]>

  constructor(
    private readonly client: PublicClient,
    private readonly opts: UniswapV3Options,
    clock?: Clock,
  ) {
    this.poolFees = new FreshnessCache(opts.poolTtlMs ?? 10 * 60_000, clock)
  }

  private async multicall(contracts: unknown[], chunk: number): Promise<CallResult[]> {
    const out: CallResult[] = []
    for (let i = 0; i < contracts.length; i += chunk) {
      const results = await this.client.multicall({
        contracts: contracts.slice(i, i + chunk) as never,
        allowFailure: true,
        batchSize: MULTICALL_CALLDATA_BYTES,
      })
      out.push(...(results as CallResult[]))
    }
    return out
  }

  /** Fee tiers with a deployed pool, for each pair. Cached. */
  private async existingFees(pairs: [Address, Address][]): Promise<Map<string, number[]>> {
    const out = new Map<string, number[]>()
    const unknown: [Address, Address][] = []
    for (const [a, b] of pairs) {
      const key = pairKey(a, b)
      const cached = this.poolFees.getFresh(key)
      if (cached) out.set(key, cached)
      else if (!unknown.some(([x, y]) => pairKey(x, y) === key)) unknown.push([a, b])
    }
    if (unknown.length === 0) return out

    const results = await this.multicall(
      unknown.flatMap(([a, b]) =>
        this.opts.feeTiers.map((fee) => ({
          address: this.opts.factory,
          abi: uniswapV3FactoryAbi,
          functionName: 'getPool',
          args: [a, b, fee],
        })),
      ),
      200,
    )
    unknown.forEach(([a, b], i) => {
      const slice = results.slice(i * this.opts.feeTiers.length, (i + 1) * this.opts.feeTiers.length)
      // A failed factory read is a failed lookup, not "no pool": do not cache it.
      if (slice.some((r) => r.status !== 'success')) {
        throw new Error(`uniswap-v3: pool lookup failed for ${a}/${b}`)
      }
      const fees = this.opts.feeTiers.filter((_, j) => (slice[j] as { result: Address }).result !== ZERO_ADDRESS)
      const key = pairKey(a, b)
      this.poolFees.set(key, fees)
      out.set(key, fees)
    })
    return out
  }

  private quoteCall(hop: RouteHop, amountIn: bigint) {
    return {
      address: this.opts.quoter,
      abi: quoterV2Abi,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: hop.tokenIn,
          tokenOut: hop.tokenOut,
          amountIn,
          fee: hop.fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }
  }

  async quoteExactIn(tokenIn: Address, tokenOut: Address, amountsIn: bigint[]): Promise<(Quote | null)[]> {
    if (same(tokenIn, tokenOut)) {
      return amountsIn.map((amountIn) => ({ venue: this.name, amountIn, amountOut: amountIn, hops: [] }))
    }
    const hubs = this.opts.hubTokens.filter((h) => !same(h, tokenIn) && !same(h, tokenOut))
    const fees = await this.existingFees([
      [tokenIn, tokenOut],
      ...hubs.flatMap((h): [Address, Address][] => [
        [tokenIn, h],
        [h, tokenOut],
      ]),
    ])
    const directFees = fees.get(pairKey(tokenIn, tokenOut)) ?? []
    const viaHubs = hubs.filter(
      (h) => (fees.get(pairKey(tokenIn, h)) ?? []).length > 0 && (fees.get(pairKey(h, tokenOut)) ?? []).length > 0,
    )

    // Round A: direct quotes and first legs, for every non-zero amount.
    type Pending = { amountIndex: number; hops: RouteHop[]; hub?: Address }
    const roundA: Pending[] = []
    amountsIn.forEach((amountIn, amountIndex) => {
      if (amountIn <= 0n) return
      for (const fee of directFees) roundA.push({ amountIndex, hops: [{ tokenIn, tokenOut, fee }] })
      for (const hub of viaHubs) {
        for (const fee of fees.get(pairKey(tokenIn, hub))!) {
          roundA.push({ amountIndex, hub, hops: [{ tokenIn, tokenOut: hub, fee }] })
        }
      }
    })
    const chunk = this.opts.quotesPerCall ?? 20
    const resultsA = await this.multicall(
      roundA.map((p) => this.quoteCall(p.hops[0]!, amountsIn[p.amountIndex]!)),
      chunk,
    )

    const best: (Quote | null)[] = amountsIn.map(() => null)
    const consider = (amountIndex: number, amountOut: bigint, hops: RouteHop[]) => {
      const current = best[amountIndex]
      if (amountOut > 0n && (!current || amountOut > current.amountOut)) {
        best[amountIndex] = { venue: this.name, amountIn: amountsIn[amountIndex]!, amountOut, hops }
      }
    }
    // Best first leg per (amount, hub).
    const firstLegs = new Map<string, { amountOut: bigint; hop: RouteHop; amountIndex: number; hub: Address }>()
    roundA.forEach((p, i) => {
      const r = resultsA[i]!
      // A reverting quote means this pool cannot fill this size; skip the route.
      if (r.status !== 'success') return
      const amountOut = (r.result as readonly [bigint, bigint, number, bigint])[0]
      if (!p.hub) {
        consider(p.amountIndex, amountOut, p.hops)
        return
      }
      const key = `${p.amountIndex}:${p.hub.toLowerCase()}`
      const current = firstLegs.get(key)
      if (amountOut > 0n && (!current || amountOut > current.amountOut)) {
        firstLegs.set(key, { amountOut, hop: p.hops[0]!, amountIndex: p.amountIndex, hub: p.hub })
      }
    })

    // Round B: second legs, fed the best first-leg output.
    const roundB: { leg: (typeof firstLegs extends Map<string, infer V> ? V : never); hop: RouteHop }[] = []
    for (const leg of firstLegs.values()) {
      for (const fee of fees.get(pairKey(leg.hub, tokenOut))!) {
        roundB.push({ leg, hop: { tokenIn: leg.hub, tokenOut, fee } })
      }
    }
    const resultsB = await this.multicall(
      roundB.map((p) => this.quoteCall(p.hop, p.leg.amountOut)),
      chunk,
    )
    roundB.forEach((p, i) => {
      const r = resultsB[i]!
      if (r.status !== 'success') return
      const amountOut = (r.result as readonly [bigint, bigint, number, bigint])[0]
      consider(p.leg.amountIndex, amountOut, [p.leg.hop, p.hop])
    })

    return best
  }
}
