// Pure position evaluation: interest accrual, health, liquidation incentive and
// seize-exact sizing. No I/O. Mirrors Morpho.sol (`_accrueInterest`, `_isHealthy`,
// `liquidate`) so an off-chain reading agrees with the contract to the wei.
//
// Sizing follows the pattern of morpho-org/morpho-bots (bots/blue-liquidation
// `sizing/plan.ts`): pin `seizedAssets`, pass `repaidShares = 0`, and let Blue
// ceil-derive the repay.

import {
  LIQUIDATION_CURSOR,
  MAX_LIQUIDATION_INCENTIVE_FACTOR,
  ORACLE_PRICE_SCALE,
  WAD,
} from '../constants.ts'
import {
  min,
  mulDivDown,
  mulDivUp,
  toAssetsDown,
  toAssetsUp,
  toSharesUp,
  wDivDown,
  wDivUp,
  wMulDown,
  wTaylorCompounded,
} from './math.ts'

/** Raw `Morpho.market(id)` struct. */
export interface MarketState {
  totalSupplyAssets: bigint
  totalSupplyShares: bigint
  totalBorrowAssets: bigint
  totalBorrowShares: bigint
  lastUpdate: bigint
  fee: bigint
}

/**
 * Total borrow assets after accruing interest up to `timestamp`, as
 * `_accrueInterest` would. Interest only ever touches the asset totals; borrow
 * shares are unchanged by accrual, which is all health and sizing need.
 *
 * `borrowRate` is the IRM's `borrowRateView` for the PRE-accrual market.
 */
export function accruedTotalBorrowAssets(
  market: Pick<MarketState, 'totalBorrowAssets' | 'lastUpdate'>,
  borrowRate: bigint,
  timestamp: bigint,
): bigint {
  if (timestamp < market.lastUpdate) {
    throw new RangeError('accrual timestamp precedes market.lastUpdate')
  }
  const elapsed = timestamp - market.lastUpdate
  if (elapsed === 0n || market.totalBorrowAssets === 0n || borrowRate === 0n) {
    return market.totalBorrowAssets
  }
  const interest = wMulDown(market.totalBorrowAssets, wTaylorCompounded(borrowRate, elapsed))
  return market.totalBorrowAssets + interest
}

/**
 * Liquidation incentive factor: min(1.15, 1 / (1 - cursor * (1 - lltv))).
 * A pure function of LLTV, so it is a per-market constant.
 */
export function lifFromLltv(lltv: bigint): bigint {
  if (lltv <= 0n || lltv >= WAD) throw new RangeError('lltv must be in (0, 1e18)')
  return min(
    MAX_LIQUIDATION_INCENTIVE_FACTOR,
    wDivDown(WAD, WAD - wMulDown(LIQUIDATION_CURSOR, WAD - lltv)),
  )
}

export interface HealthInput {
  borrowShares: bigint
  collateral: bigint
  /** Post-accrual total borrow assets. */
  totalBorrowAssets: bigint
  totalBorrowShares: bigint
  /** Oracle price in ORACLE_PRICE_SCALE units. */
  price: bigint
  lltv: bigint
}

export interface Health {
  hasDebt: boolean
  /** Debt in loan assets, rounded UP (against the borrower), as `_isHealthy`. */
  borrowed: bigint
  /** Borrow capacity in loan assets, rounded DOWN, as `_isHealthy`. */
  maxBorrow: bigint
  /** The contract's own predicate: `maxBorrow >= borrowed`. */
  healthy: boolean
  /** maxBorrow / borrowed as a WAD; null when there is no debt. */
  healthFactor: bigint | null
}

/** Mirrors `Morpho._isHealthy`. Liquidatable iff `hasDebt && !healthy`. */
export function assessHealth(input: HealthInput): Health {
  const borrowed = toAssetsUp(input.borrowShares, input.totalBorrowAssets, input.totalBorrowShares)
  const maxBorrow = wMulDown(
    mulDivDown(input.collateral, input.price, ORACLE_PRICE_SCALE),
    input.lltv,
  )
  const hasDebt = input.borrowShares > 0n
  return {
    hasDebt,
    borrowed,
    maxBorrow,
    healthy: maxBorrow >= borrowed,
    healthFactor: hasDebt && borrowed > 0n ? mulDivDown(maxBorrow, WAD, borrowed) : null,
  }
}

export type PlanSkipReason =
  | 'no_debt'
  | 'healthy'
  | 'no_collateral'
  | 'zero_price'
  | 'seize_rounds_to_zero'

export interface SeizePlan {
  /** Collateral to seize; passed to `liquidate` with `repaidShares = 0`. */
  seizedAssets: bigint
  /** Loan assets Blue will pull for that seize: the swap's break-even output. */
  repaidAssets: bigint
  /** Shares Blue will burn for that seize. Never exceeds the position's shares. */
  repaidShares: bigint
  /** True when the seize takes all collateral and leaves debt behind (bad debt). */
  collateralBound: boolean
}

export type PlanOutcome =
  | { plan: SeizePlan; reason?: undefined }
  | { plan: null; reason: PlanSkipReason }

/**
 * What `liquidate(seizedAssets, repaidShares = 0)` pulls from the liquidator.
 * Every step rounds UP against the liquidator, including the shares round trip.
 */
export function repayForSeize(
  seizedAssets: bigint,
  input: Pick<HealthInput, 'price' | 'lltv' | 'totalBorrowAssets' | 'totalBorrowShares'>,
): { repaidAssets: bigint; repaidShares: bigint } {
  const quoted = mulDivUp(seizedAssets, input.price, ORACLE_PRICE_SCALE)
  const repaidShares = toSharesUp(
    wDivUp(quoted, lifFromLltv(input.lltv)),
    input.totalBorrowAssets,
    input.totalBorrowShares,
  )
  return {
    repaidShares,
    repaidAssets: toAssetsUp(repaidShares, input.totalBorrowAssets, input.totalBorrowShares),
  }
}

/**
 * Seize-exact plan repaying at most `maxRepayAssets` of the debt (omit it to
 * close the whole position).
 *
 * `assumeLiquidatable` sizes a position that is currently healthy, for the
 * "what if this crossed the threshold right now" economics on near-threshold
 * positions. It never makes a healthy position liquidatable on-chain.
 */
export function planSeize(
  input: HealthInput,
  opts: { maxRepayAssets?: bigint; assumeLiquidatable?: boolean } = {},
): PlanOutcome {
  const health = assessHealth(input)
  if (!health.hasDebt) return { plan: null, reason: 'no_debt' }
  if (health.healthy && !opts.assumeLiquidatable) return { plan: null, reason: 'healthy' }
  if (input.collateral === 0n) return { plan: null, reason: 'no_collateral' }
  if (input.price === 0n) return { plan: null, reason: 'zero_price' }

  const lif = lifFromLltv(input.lltv)
  // Floor twice so the ceil-derived repaidShares can never exceed borrowShares.
  const fullDebt = toAssetsDown(input.borrowShares, input.totalBorrowAssets, input.totalBorrowShares)
  const targetRepay =
    opts.maxRepayAssets === undefined ? fullDebt : min(fullDebt, opts.maxRepayAssets)
  const seizeForTarget = mulDivDown(wMulDown(targetRepay, lif), ORACLE_PRICE_SCALE, input.price)
  const seizedAssets = min(input.collateral, seizeForTarget)
  if (seizedAssets === 0n) return { plan: null, reason: 'seize_rounds_to_zero' }

  const { repaidAssets, repaidShares } = repayForSeize(seizedAssets, input)
  return {
    plan: {
      seizedAssets,
      repaidAssets,
      repaidShares,
      collateralBound: seizeForTarget > input.collateral,
    },
  }
}

/**
 * Fractional drop in the collateral price that takes a position to the
 * liquidation threshold, as a WAD (0 when already liquidatable).
 */
export function priceDropToLiquidation(healthFactor: bigint): bigint {
  if (healthFactor <= WAD) return 0n
  return WAD - wDivUp(WAD, healthFactor)
}
