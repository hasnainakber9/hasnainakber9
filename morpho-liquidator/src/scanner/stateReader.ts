// On-chain truth. Reads every market and position the scanner cares about at
// ONE pinned block, so price, accrual and health are mutually consistent.
//
// The official bot does this with a deployless Solidity lens in a single
// eth_call. This reader gets the same single-block consistency with Multicall3
// pinned to a block number, and mirrors the accrual math in TypeScript
// (`health.ts`), which avoids a Solidity toolchain. The fork tests check that
// mirror against the real contract.
//
// Fail-closed contract:
//   - a failed RPC call throws: the caller must not update any state;
//   - a market whose state, price or rate cannot be read is reported as
//     unreadable, and none of its positions are evaluated;
//   - a pinned block older than `maxBlockAgeSec` throws StaleChainError.

import type { Address, Hex, PublicClient } from 'viem'

import { irmAbi, morphoAbi, multicall3Abi, oracleAbi } from '../abis.ts'
import { ZERO_ADDRESS } from '../constants.ts'
import {
  accruedTotalBorrowAssets,
  assessHealth,
  type Health,
  type MarketState,
} from './health.ts'

export interface MarketParams {
  loanToken: Address
  collateralToken: Address
  oracle: Address
  irm: Address
  lltv: bigint
}

export interface MarketSnapshot {
  id: Hex
  params: MarketParams
  state: MarketState
  /** Post-accrual total borrow assets at the pinned block's timestamp. */
  totalBorrowAssets: bigint
  price: bigint
}

export interface PositionSnapshot {
  marketId: Hex
  borrower: Address
  borrowShares: bigint
  collateral: bigint
  health: Health
}

export interface ChainSnapshot {
  blockNumber: bigint
  blockTimestamp: bigint
  markets: Map<Hex, MarketSnapshot>
  /** Markets that could not be read, with the reason. Never evaluated. */
  unreadableMarkets: Map<Hex, string>
  positions: PositionSnapshot[]
  /** Positions skipped because their market or their own read failed. */
  unreadablePositions: { marketId: Hex; borrower: Address; reason: string }[]
}

export class StaleChainError extends Error {
  constructor(public readonly blockAgeSec: number, maxAgeSec: number) {
    super(`pinned block is ${blockAgeSec}s old (max ${maxAgeSec}s): RPC is stale`)
    this.name = 'StaleChainError'
  }
}

export class ChainReadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChainReadError'
  }
}

/** Calldata ceiling for one aggregate3 eth_call; effectively "do not split". */
export const MULTICALL_CALLDATA_BYTES = 2_000_000

export type CallResult = { status: 'success'; result: unknown } | { status: 'failure'; error: Error }

export interface StateReaderOptions {
  morpho: Address
  multicallBatchCalls: number
  pinLagBlocks: number
  maxBlockAgeSec: number
  now?: () => number
}

export class StateReader {
  constructor(
    private readonly client: PublicClient,
    private readonly opts: StateReaderOptions,
  ) {}

  /** Runs `contracts` at `blockNumber`, chunked, preserving order. */
  async multicall(contracts: readonly unknown[], blockNumber: bigint): Promise<CallResult[]> {
    const out: CallResult[] = []
    for (let i = 0; i < contracts.length; i += this.opts.multicallBatchCalls) {
      const chunk = contracts.slice(i, i + this.opts.multicallBatchCalls)
      const results = await this.client.multicall({
        contracts: chunk as never,
        allowFailure: true,
        blockNumber,
        // Chunking is by call count above. viem's default splits at 1 KB of
        // calldata, which turns one read into hundreds of round trips.
        batchSize: MULTICALL_CALLDATA_BYTES,
      })
      out.push(...(results as CallResult[]))
    }
    return out
  }

  /** Block to pin reads to: a few blocks behind the head. */
  async pinnedBlock(): Promise<bigint> {
    const head = await this.client.getBlockNumber({ cacheTime: 0 })
    const pinned = head - BigInt(this.opts.pinLagBlocks)
    if (pinned <= 0n) throw new ChainReadError(`implausible head block ${head}`)
    return pinned
  }

  /** Immutable market params for each id, from `idToMarketParams`. */
  async readMarketParams(ids: Hex[], blockNumber: bigint): Promise<Map<Hex, MarketParams | null>> {
    const results = await this.multicall(
      ids.map((id) => ({
        address: this.opts.morpho,
        abi: morphoAbi,
        functionName: 'idToMarketParams',
        args: [id],
      })),
      blockNumber,
    )
    const out = new Map<Hex, MarketParams | null>()
    ids.forEach((id, i) => {
      const r = results[i]!
      if (r.status !== 'success') {
        out.set(id, null)
        return
      }
      const [loanToken, collateralToken, oracle, irm, lltv] = r.result as [
        Address,
        Address,
        Address,
        Address,
        bigint,
      ]
      // An id that was never created reads back as all zeroes.
      out.set(id, loanToken === ZERO_ADDRESS ? null : { loanToken, collateralToken, oracle, irm, lltv })
    })
    return out
  }

  /**
   * Reads all `markets` and the given `pairs` at one pinned block and evaluates
   * every readable position.
   */
  async read(
    markets: Map<Hex, MarketParams>,
    pairs: { marketId: Hex; borrower: Address }[],
    blockNumber?: bigint,
  ): Promise<ChainSnapshot> {
    const block = blockNumber ?? (await this.pinnedBlock())
    const marketIds = [...markets.keys()]

    // Round 1: block timestamp, market state, oracle price, positions.
    const round1: unknown[] = [
      { address: this.client.chain!.contracts!.multicall3!.address, abi: multicall3Abi, functionName: 'getCurrentBlockTimestamp' },
      { address: this.client.chain!.contracts!.multicall3!.address, abi: multicall3Abi, functionName: 'getBlockNumber' },
    ]
    for (const id of marketIds) {
      const params = markets.get(id)!
      round1.push({ address: this.opts.morpho, abi: morphoAbi, functionName: 'market', args: [id] })
      round1.push({ address: params.oracle, abi: oracleAbi, functionName: 'price' })
    }
    const positionOffset = round1.length
    for (const pair of pairs) {
      round1.push({
        address: this.opts.morpho,
        abi: morphoAbi,
        functionName: 'position',
        args: [pair.marketId, pair.borrower],
      })
    }
    const r1 = await this.multicall(round1, block)

    const tsResult = r1[0]!
    const bnResult = r1[1]!
    if (tsResult.status !== 'success' || bnResult.status !== 'success') {
      throw new ChainReadError('could not read block timestamp/number from Multicall3')
    }
    const blockTimestamp = tsResult.result as bigint
    if ((bnResult.result as bigint) !== block) {
      throw new ChainReadError(`pinned block ${block} but call executed at ${bnResult.result}`)
    }
    const nowSec = Math.floor((this.opts.now ?? Date.now)() / 1000)
    const blockAgeSec = nowSec - Number(blockTimestamp)
    if (blockAgeSec > this.opts.maxBlockAgeSec) {
      throw new StaleChainError(blockAgeSec, this.opts.maxBlockAgeSec)
    }

    const unreadableMarkets = new Map<Hex, string>()
    const partial = new Map<Hex, { params: MarketParams; state: MarketState; price: bigint }>()
    marketIds.forEach((id, i) => {
      const stateResult = r1[2 + i * 2]!
      const priceResult = r1[2 + i * 2 + 1]!
      if (stateResult.status !== 'success') {
        unreadableMarkets.set(id, 'market_state_unreadable')
        return
      }
      if (priceResult.status !== 'success') {
        unreadableMarkets.set(id, 'oracle_price_reverted')
        return
      }
      const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee] =
        stateResult.result as [bigint, bigint, bigint, bigint, bigint, bigint]
      if (lastUpdate === 0n) {
        unreadableMarkets.set(id, 'market_not_created')
        return
      }
      partial.set(id, {
        params: markets.get(id)!,
        state: { totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee },
        price: priceResult.result as bigint,
      })
    })

    // Round 2: IRM borrow rate for each readable market, same pinned block.
    // The IRM is given the PRE-accrual market, exactly as `_accrueInterest` does.
    const rateIds = [...partial.keys()].filter((id) => {
      const m = partial.get(id)!
      return m.params.irm !== ZERO_ADDRESS && m.state.totalBorrowAssets > 0n
    })
    const r2 = await this.multicall(
      rateIds.map((id) => {
        const m = partial.get(id)!
        return {
          address: m.params.irm,
          abi: irmAbi,
          functionName: 'borrowRateView',
          args: [m.params, m.state],
        }
      }),
      block,
    )
    const rates = new Map<Hex, bigint>()
    rateIds.forEach((id, i) => {
      const r = r2[i]!
      if (r.status === 'success') rates.set(id, r.result as bigint)
      else unreadableMarkets.set(id, 'borrow_rate_unreadable')
    })

    const snapshots = new Map<Hex, MarketSnapshot>()
    for (const [id, m] of partial) {
      if (unreadableMarkets.has(id)) continue
      if (blockTimestamp < m.state.lastUpdate) {
        unreadableMarkets.set(id, 'market_updated_after_pinned_block')
        continue
      }
      snapshots.set(id, {
        id,
        params: m.params,
        state: m.state,
        price: m.price,
        totalBorrowAssets: accruedTotalBorrowAssets(m.state, rates.get(id) ?? 0n, blockTimestamp),
      })
    }

    const positions: PositionSnapshot[] = []
    const unreadablePositions: ChainSnapshot['unreadablePositions'] = []
    pairs.forEach((pair, i) => {
      const market = snapshots.get(pair.marketId)
      if (!market) {
        unreadablePositions.push({
          ...pair,
          reason: unreadableMarkets.get(pair.marketId) ?? 'market_not_whitelisted',
        })
        return
      }
      const r = r1[positionOffset + i]!
      if (r.status !== 'success') {
        unreadablePositions.push({ ...pair, reason: 'position_unreadable' })
        return
      }
      const [, borrowShares, collateral] = r.result as [bigint, bigint, bigint]
      positions.push({
        marketId: pair.marketId,
        borrower: pair.borrower,
        borrowShares,
        collateral,
        health: assessHealth({
          borrowShares,
          collateral,
          totalBorrowAssets: market.totalBorrowAssets,
          totalBorrowShares: market.state.totalBorrowShares,
          price: market.price,
          lltv: market.params.lltv,
        }),
      })
    })

    return {
      blockNumber: block,
      blockTimestamp,
      markets: snapshots,
      unreadableMarkets,
      positions,
      unreadablePositions,
    }
  }
}
