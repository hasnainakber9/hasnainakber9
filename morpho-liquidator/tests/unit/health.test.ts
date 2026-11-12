import { describe, expect, it } from 'vitest'

import { MAX_LIQUIDATION_INCENTIVE_FACTOR, ORACLE_PRICE_SCALE, WAD } from '../../src/constants.ts'
import {
  accruedTotalBorrowAssets,
  assessHealth,
  lifFromLltv,
  planSeize,
  priceDropToLiquidation,
  repayForSeize,
  type HealthInput,
} from '../../src/scanner/health.ts'
import { toSharesUp } from '../../src/scanner/math.ts'

const lltv = (pct: number) => (BigInt(Math.round(pct * 1000)) * WAD) / 100_000n

// A WETH(18)/USDC(6) market: price is USDC-per-WETH scaled by 1e36 * 1e6 / 1e18.
const priceFor = (usdPerEth: number) => (BigInt(usdPerEth) * ORACLE_PRICE_SCALE * 10n ** 6n) / 10n ** 18n

/** A position borrowing `debtUsdc` against `collateralEth` in a market with other borrowers. */
function position(collateralEth: string, debtUsdc: number, usdPerEth: number, lltvPct = 86): HealthInput {
  const totalBorrowAssets = 50_000_000_000_000n // 50M USDC
  const totalBorrowShares = 48_000_000_000_000n * 10n ** 6n
  return {
    borrowShares: toSharesUp(BigInt(debtUsdc) * 10n ** 6n, totalBorrowAssets, totalBorrowShares),
    collateral: BigInt(Math.round(Number(collateralEth) * 1e6)) * 10n ** 12n,
    totalBorrowAssets,
    totalBorrowShares,
    price: priceFor(usdPerEth),
    lltv: lltv(lltvPct),
  }
}

describe('lifFromLltv', () => {
  it('matches 1 / (1 - 0.3 * (1 - lltv)) for the LLTVs used on Base', () => {
    const expected: [number, number][] = [
      [94.5, 1.01677],
      [91.5, 1.02617],
      [86, 1.04384],
      [77, 1.07411],
    ]
    for (const [pct, lif] of expected) {
      expect(Number(lifFromLltv(lltv(pct))) / 1e18).toBeCloseTo(lif, 4)
    }
  })

  it('caps at 1.15 for low LLTVs', () => {
    expect(lifFromLltv(lltv(38.5))).toBe(MAX_LIQUIDATION_INCENTIVE_FACTOR)
    expect(lifFromLltv(lltv(62.5))).toBeLessThan(MAX_LIQUIDATION_INCENTIVE_FACTOR)
  })

  it('rejects an LLTV outside (0, 1)', () => {
    expect(() => lifFromLltv(0n)).toThrow(RangeError)
    expect(() => lifFromLltv(WAD)).toThrow(RangeError)
  })
})

describe('accruedTotalBorrowAssets', () => {
  const market = { totalBorrowAssets: 1_000_000_000_000n, lastUpdate: 1_000n }
  const fivePercent = (5n * WAD) / 100n / 31_536_000n

  it('is a no-op with no elapsed time, no debt or a zero rate', () => {
    expect(accruedTotalBorrowAssets(market, fivePercent, 1_000n)).toBe(market.totalBorrowAssets)
    expect(accruedTotalBorrowAssets({ ...market, totalBorrowAssets: 0n }, fivePercent, 9_999n)).toBe(0n)
    expect(accruedTotalBorrowAssets(market, 0n, 9_999n)).toBe(market.totalBorrowAssets)
  })

  it('compounds a year at 5% to about 5.127%', () => {
    const accrued = accruedTotalBorrowAssets(market, fivePercent, 1_000n + 31_536_000n)
    const growth = Number(accrued - market.totalBorrowAssets) / Number(market.totalBorrowAssets)
    expect(growth).toBeCloseTo(0.05127, 4)
  })

  it('refuses a timestamp before the last update', () => {
    expect(() => accruedTotalBorrowAssets(market, fivePercent, 999n)).toThrow(RangeError)
  })
})

describe('assessHealth', () => {
  it('reports a safe position as healthy with HF > 1', () => {
    // 10 ETH at $3000 = $30k, x0.86 = $25.8k capacity vs $20k debt -> HF 1.29.
    const h = assessHealth(position('10', 20_000, 3000))
    expect(h.healthy).toBe(true)
    expect(Number(h.healthFactor) / 1e18).toBeCloseTo(1.29, 3)
  })

  it('flips to unhealthy exactly when capacity drops below debt', () => {
    // Capacity = 10 * price * 0.86. Debt 25,800 -> threshold price is 3000.
    expect(assessHealth(position('10', 25_799, 3000)).healthy).toBe(true)
    expect(assessHealth(position('10', 25_801, 3000)).healthy).toBe(false)
    expect(assessHealth(position('10', 25_800, 2999)).healthy).toBe(false)
  })

  it('treats maxBorrow == borrowed as healthy, as the contract does', () => {
    const input: HealthInput = {
      borrowShares: 1_000_000n * 10n ** 6n,
      collateral: 2_000_000n,
      totalBorrowAssets: 999_999n,
      totalBorrowShares: 999_999n * 10n ** 6n,
      price: ORACLE_PRICE_SCALE,
      lltv: WAD / 2n,
    }
    const h = assessHealth(input)
    expect(h.borrowed).toBe(1_000_000n)
    expect(h.maxBorrow).toBe(1_000_000n)
    expect(h.healthy).toBe(true)
    expect(h.healthFactor).toBe(WAD)
    expect(assessHealth({ ...input, collateral: 1_999_999n }).healthy).toBe(false)
  })

  it('has no health factor without debt', () => {
    const h = assessHealth({ ...position('1', 0, 3000), borrowShares: 0n })
    expect(h.hasDebt).toBe(false)
    expect(h.healthFactor).toBeNull()
    expect(h.healthy).toBe(true)
  })
})

describe('planSeize', () => {
  it('gives skip reasons instead of plans', () => {
    expect(planSeize({ ...position('10', 20_000, 3000), borrowShares: 0n }).reason).toBe('no_debt')
    expect(planSeize(position('10', 20_000, 3000)).reason).toBe('healthy')
    expect(planSeize({ ...position('10', 30_000, 3000), collateral: 0n }).reason).toBe('no_collateral')
    expect(planSeize({ ...position('10', 30_000, 3000), price: 0n }).reason).toBe('zero_price')
  })

  it('sizes a full liquidation so the liquidator nets the LIF', () => {
    const input = position('10', 27_000, 3000) // HF 0.955
    const { plan } = planSeize(input)
    expect(plan).not.toBeNull()
    // Seized value at oracle price / repaid = LIF (1.0438 at 86% LLTV).
    const seizedUsd = (Number(plan!.seizedAssets) / 1e18) * 3000
    const repaidUsd = Number(plan!.repaidAssets) / 1e6
    expect(seizedUsd / repaidUsd).toBeCloseTo(1.04384, 4)
    expect(plan!.collateralBound).toBe(false)
    expect(plan!.seizedAssets).toBeLessThan(input.collateral)
  })

  it('never asks Blue to burn more shares than the position holds', () => {
    // The invariant that makes seize-exact safe, across awkward magnitudes.
    const cases: HealthInput[] = [
      position('10', 27_000, 3000),
      position('0.000123', 1, 3000, 94.5),
      position('1234.567891', 3_900_000, 3333, 77),
      { ...position('10', 27_000, 3000), totalBorrowAssets: 7n, totalBorrowShares: 3n },
    ]
    for (const input of cases) {
      const { plan } = planSeize(input, { assumeLiquidatable: true })
      if (!plan) continue
      expect(plan.repaidShares).toBeLessThanOrEqual(input.borrowShares)
      expect(plan.seizedAssets).toBeLessThanOrEqual(input.collateral)
    }
  })

  it('caps the seize at all collateral when the position is under water', () => {
    // $27k debt against 5 ETH at $3000 = $15k of collateral: bad debt.
    const input = position('5', 27_000, 3000)
    const { plan } = planSeize(input)
    expect(plan!.seizedAssets).toBe(input.collateral)
    expect(plan!.collateralBound).toBe(true)
    expect(Number(plan!.repaidAssets) / 1e6).toBeCloseTo(15_000 / 1.04384, 0)
  })

  it('sizes a partial liquidation to a repay cap', () => {
    const input = position('10', 27_000, 3000)
    const { plan } = planSeize(input, { maxRepayAssets: 1_000_000_000n }) // $1,000
    const repaid = Number(plan!.repaidAssets) / 1e6
    expect(repaid).toBeGreaterThan(999.99)
    expect(repaid).toBeLessThanOrEqual(1000.01)
    // The repay Blue derives is exactly what repayForSeize predicts.
    expect(repayForSeize(plan!.seizedAssets, input).repaidAssets).toBe(plan!.repaidAssets)
  })

  it('sizes a healthy position only when asked to assume it crossed', () => {
    const input = position('10', 25_000, 3000) // HF 1.032
    expect(planSeize(input).plan).toBeNull()
    expect(planSeize(input, { assumeLiquidatable: true }).plan).not.toBeNull()
  })
})

describe('priceDropToLiquidation', () => {
  it('is 1 - 1/HF', () => {
    expect(Number(priceDropToLiquidation((105n * WAD) / 100n)) / 1e18).toBeCloseTo(0.047619, 5)
    expect(priceDropToLiquidation(WAD)).toBe(0n)
    expect(priceDropToLiquidation(WAD / 2n)).toBe(0n)
  })
})
