// Sized economics: does liquidating this position actually make money, at a
// size we are allowed to trade, after conservative buffers?
//
//   seized collateral  = repay * LIF / oraclePrice         (Blue's formula)
//   proceeds           = executable venue quote for that exact seize
//   net                = proceeds * (1 - slippage - priceMove) - repay - gas
//
// The liquidation bonus is only real if the venue pays more for the collateral
// than the oracle-priced debt it cancels. Price impact at size, a DEX/oracle
// basis, or a missing route each turn a nominal 4% bonus into a loss, so every
// rung of the size ladder is quoted for its own exact seize amount.
//
// Every rejection carries an explicit reason. Nothing is dropped silently.

import { ORACLE_PRICE_SCALE, WAD } from '../constants.ts'
import type { RiskConfig } from '../risk/limits.ts'
import { planSeize, type HealthInput, type SeizePlan } from '../scanner/health.ts'
import type { MarketInfo } from '../scanner/marketRegistry.ts'
import { mulDivDown } from '../scanner/math.ts'
import type { GasCost } from './pricing.ts'
import { toUnits } from './pricing.ts'
import type { LiquidityVenue, Quote, UsdPricer } from './venue.ts'

export type RejectionReason =
  // The position itself cannot be sized.
  | 'no_debt'
  | 'no_collateral'
  | 'zero_price'
  | 'seize_rounds_to_zero'
  | 'dust_position'
  // An input could not be established: fail closed.
  | 'loan_token_unpriced'
  | 'gas_unpriced'
  | 'quote_failed'
  // The trade does not work.
  | 'no_route'
  | 'venue_liquidity_too_thin'
  | 'unprofitable_after_buffers'
  | 'exceeds_risk_limit'
  // The trade may work but is not ours to take.
  | 'svr_auction_gated'
  | 'oracle_unclassified'

export type VerdictStatus =
  /** Liquidatable now and profitable at an allowed size. */
  | 'candidate'
  /** Healthy, but would be profitable at an allowed size if it crossed now. */
  | 'hypothetical_pass'
  | 'rejected'

export interface SizeResult {
  /** Ladder rung this row answers ("$1000"), or "full" for the whole position. */
  label: string
  targetUsd: number
  repayAssets: bigint
  seizedAssets: bigint
  repayUsd: number
  collateralBound: boolean
  quoteOut: bigint | null
  route: Quote['hops'] | null
  /** Venue proceeds relative to the oracle value of the seize, in bps. */
  dexVsOracleBps: number | null
  grossProfitUsd: number | null
  bufferUsd: number | null
  gasUsd: number | null
  netProfitUsd: number | null
  withinRiskLimit: boolean
  pass: boolean
  reason: RejectionReason | null
}

export interface Verdict {
  status: VerdictStatus
  /** True when the position is healthy and was sized as if it had just crossed. */
  hypothetical: boolean
  /** Primary reason when rejected; null otherwise. */
  reason: RejectionReason | null
  /** Every reason that applies, primary first. */
  reasons: RejectionReason[]
  debtUsd: number | null
  loanPriceUsd: number | null
  lifBps: number
  oracleFlag: MarketInfo['oracle']['flag']
  /** Whether the pure economics pass at an allowed size, ignoring oracle flags. */
  economicsPass: boolean
  best: SizeResult | null
  sizes: SizeResult[]
}

export interface EconomicsConfig {
  sizeLadderUsd: number[]
  slippageBufferBps: number
  priceMoveBufferBps: number
  minNetProfitUsd: number
  /** Proceeds this far below the oracle value mean the venue cannot absorb the size. */
  thinLiquidityBps: number
  rejectSvrFlagged: boolean
  rejectUnclassifiedOracle: boolean
  minDebtUsd: number
}

const BPS = 10_000n

/** Relative tolerance so a rung sized to exactly the limit is not rejected by a wei of rounding. */
const RISK_TOLERANCE = 1e-6

function emptySize(label: string, targetUsd: number, plan: SeizePlan, repayUsd: number, withinRiskLimit: boolean): SizeResult {
  return {
    label,
    targetUsd,
    repayAssets: plan.repaidAssets,
    seizedAssets: plan.seizedAssets,
    repayUsd,
    collateralBound: plan.collateralBound,
    quoteOut: null,
    route: null,
    dexVsOracleBps: null,
    grossProfitUsd: null,
    bufferUsd: null,
    gasUsd: null,
    netProfitUsd: null,
    withinRiskLimit,
    pass: false,
    reason: null,
  }
}

/**
 * Pure profitability of one sized plan given its venue quote. `quote` is null
 * when the venue has no route for that size.
 */
export function judgeSize(
  size: SizeResult,
  quote: Quote | null,
  ctx: {
    price: bigint
    loanDecimals: number
    loanPriceUsd: number
    gasUsd: number
    config: Pick<EconomicsConfig, 'slippageBufferBps' | 'priceMoveBufferBps' | 'minNetProfitUsd' | 'thinLiquidityBps'>
  },
): SizeResult {
  if (!quote || quote.amountOut === 0n) return { ...size, reason: 'no_route' }

  const usd = (assets: bigint) => toUnits(assets, ctx.loanDecimals) * ctx.loanPriceUsd
  const bufferBps = BigInt(ctx.config.slippageBufferBps + ctx.config.priceMoveBufferBps)
  const afterBuffers = (quote.amountOut * (BPS - bufferBps)) / BPS
  const oracleValue = mulDivDown(size.seizedAssets, ctx.price, ORACLE_PRICE_SCALE)

  const grossProfitUsd = usd(quote.amountOut) - usd(size.repayAssets)
  const bufferUsd = usd(quote.amountOut - afterBuffers)
  const netProfitUsd = usd(afterBuffers) - usd(size.repayAssets) - ctx.gasUsd
  const pass = netProfitUsd >= ctx.config.minNetProfitUsd

  const dexVsOracleBps =
    oracleValue > 0n ? Number(((quote.amountOut - oracleValue) * BPS * 100n) / oracleValue) / 100 : null
  // Distinguish "the pool is too shallow for this size" from "the bonus is
  // simply smaller than the costs": they call for different responses.
  const thin = dexVsOracleBps !== null && dexVsOracleBps < -ctx.config.thinLiquidityBps

  return {
    ...size,
    quoteOut: quote.amountOut,
    route: quote.hops,
    dexVsOracleBps,
    grossProfitUsd,
    bufferUsd,
    gasUsd: ctx.gasUsd,
    netProfitUsd,
    pass,
    reason: pass
      ? size.withinRiskLimit
        ? null
        : 'exceeds_risk_limit'
      : thin
        ? 'venue_liquidity_too_thin'
        : 'unprofitable_after_buffers',
  }
}

/**
 * Turns sized results plus the market's oracle flag into one verdict.
 * A size only counts if it is within the per-trade risk limit.
 */
export function decide(input: {
  sizes: SizeResult[]
  liquidatableNow: boolean
  oracleFlag: MarketInfo['oracle']['flag']
  config: Pick<EconomicsConfig, 'rejectSvrFlagged' | 'rejectUnclassifiedOracle'>
}): Pick<Verdict, 'status' | 'reason' | 'reasons' | 'best' | 'economicsPass'> {
  const allowed = input.sizes.filter((s) => s.withinRiskLimit)
  const passing = allowed.filter((s) => s.pass)
  const byNet = (a: SizeResult, b: SizeResult) => (b.netProfitUsd ?? -Infinity) - (a.netProfitUsd ?? -Infinity)
  const best = [...passing].sort(byNet)[0] ?? [...allowed].sort(byNet)[0] ?? [...input.sizes].sort(byNet)[0] ?? null
  const economicsPass = passing.length > 0

  const reasons: RejectionReason[] = []
  if (!economicsPass) {
    // Report the reason of the best allowed size; fall back to the risk limit
    // when only an oversized rung works.
    const anyOversizedPass = input.sizes.some((s) => s.pass && !s.withinRiskLimit)
    const ranked = allowed.length > 0 ? allowed : input.sizes
    const primary = anyOversizedPass
      ? 'exceeds_risk_limit'
      : ([...ranked].sort(byNet)[0]?.reason ?? 'no_route')
    reasons.push(primary)
  }
  if (input.oracleFlag === 'svr' && input.config.rejectSvrFlagged) reasons.push('svr_auction_gated')
  if (input.oracleFlag === 'unknown' && input.config.rejectUnclassifiedOracle) reasons.push('oracle_unclassified')

  if (reasons.length > 0) {
    return { status: 'rejected', reason: reasons[0]!, reasons, best, economicsPass }
  }
  return {
    status: input.liquidatableNow ? 'candidate' : 'hypothetical_pass',
    reason: null,
    reasons: [],
    best,
    economicsPass,
  }
}

export interface EvaluationInput {
  market: MarketInfo
  health: HealthInput
  liquidatableNow: boolean
}

export class EconomicsEngine {
  constructor(
    private readonly deps: {
      venue: LiquidityVenue
      pricer: UsdPricer
      gas: { cost(): Promise<GasCost | null> }
    },
    private readonly config: EconomicsConfig,
    private readonly risk: RiskConfig,
  ) {}

  private rejected(
    input: EvaluationInput,
    reason: RejectionReason,
    extra: Partial<Verdict> = {},
  ): Verdict {
    return {
      status: 'rejected',
      hypothetical: !input.liquidatableNow,
      reason,
      reasons: [reason],
      debtUsd: null,
      loanPriceUsd: null,
      lifBps: Number(((input.market.lif - WAD) * BPS) / WAD),
      oracleFlag: input.market.oracle.flag,
      economicsPass: false,
      best: null,
      sizes: [],
      ...extra,
    }
  }

  async evaluate(input: EvaluationInput): Promise<Verdict> {
    const { market, health } = input
    const assume = { assumeLiquidatable: !input.liquidatableNow }

    const full = planSeize(health, assume)
    if (!full.plan) {
      // 'healthy' cannot occur: a healthy position is always sized hypothetically.
      return this.rejected(input, full.reason === 'healthy' ? 'no_debt' : full.reason)
    }

    const loanPriceUsd = await this.deps.pricer.priceUsd(market.loan)
    if (loanPriceUsd === null || !(loanPriceUsd > 0)) return this.rejected(input, 'loan_token_unpriced')
    const usd = (assets: bigint) => toUnits(assets, market.loan.decimals) * loanPriceUsd
    const debtUsd = usd(full.plan.repaidAssets)
    const context = { debtUsd, loanPriceUsd }
    if (debtUsd < this.config.minDebtUsd) return this.rejected(input, 'dust_position', context)

    // Build the ladder. Rungs that collapse onto the same seize (a position
    // smaller than the rung) are evaluated once.
    const withinRisk = (repayUsd: number) => repayUsd <= this.risk.maxRiskPerTradeUsd * (1 + RISK_TOLERANCE)
    const sizes: SizeResult[] = []
    const seen = new Set<bigint>()
    for (const targetUsd of [...this.config.sizeLadderUsd].sort((a, b) => a - b)) {
      const maxRepayAssets = BigInt(Math.floor((targetUsd / loanPriceUsd) * 10 ** market.loan.decimals))
      const sized = planSeize(health, { ...assume, maxRepayAssets })
      if (!sized.plan || seen.has(sized.plan.seizedAssets)) continue
      seen.add(sized.plan.seizedAssets)
      const repayUsd = usd(sized.plan.repaidAssets)
      const isFull = sized.plan.seizedAssets === full.plan.seizedAssets
      sizes.push(emptySize(isFull ? 'full' : `$${targetUsd}`, targetUsd, sized.plan, repayUsd, withinRisk(repayUsd)))
    }
    if (sizes.length === 0) return this.rejected(input, 'seize_rounds_to_zero', context)

    const gas = await this.deps.gas.cost()
    if (gas === null) return this.rejected(input, 'gas_unpriced', context)

    let quotes: (Quote | null)[]
    try {
      quotes = await this.deps.venue.quoteExactIn(
        market.collateral.address,
        market.loan.address,
        sizes.map((s) => s.seizedAssets),
      )
    } catch {
      return this.rejected(input, 'quote_failed', context)
    }

    const judged = sizes.map((size, i) =>
      judgeSize(size, quotes[i] ?? null, {
        price: health.price,
        loanDecimals: market.loan.decimals,
        loanPriceUsd,
        gasUsd: gas.usd,
        config: this.config,
      }),
    )
    const decision = decide({
      sizes: judged,
      liquidatableNow: input.liquidatableNow,
      oracleFlag: market.oracle.flag,
      config: this.config,
    })
    return {
      ...decision,
      hypothetical: !input.liquidatableNow,
      debtUsd,
      loanPriceUsd,
      lifBps: Number(((market.lif - WAD) * BPS) / WAD),
      oracleFlag: market.oracle.flag,
      sizes: judged,
    }
  }
}
