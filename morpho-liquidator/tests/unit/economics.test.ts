import { describe, expect, it } from 'vitest'

import { decide, EconomicsEngine, type SizeResult } from '../../src/economics/evaluate.ts'
import { classifyOracle } from '../../src/economics/oracleFlags.ts'
import { CachedVenue } from '../../src/economics/venue.ts'
import { ZERO_ADDRESS } from '../../src/constants.ts'
import {
  economicsConfig,
  fakeGas,
  fakePricer,
  fakeVenue,
  healthInput,
  market,
  riskConfig,
  USDC,
  WETH,
} from './helpers.ts'

const engine = (
  venue = fakeVenue({ usdPerEth: 3000 }),
  overrides: Partial<typeof economicsConfig> = {},
  deps: { pricer?: ReturnType<typeof fakePricer>; gas?: ReturnType<typeof fakeGas> } = {},
) =>
  new EconomicsEngine(
    { venue, pricer: deps.pricer ?? fakePricer(), gas: deps.gas ?? fakeGas() },
    { ...economicsConfig, ...overrides },
    riskConfig,
  )

// 10 ETH at $3000 against $27k of debt: HF 0.955, liquidatable.
const liquidatable = { market: market(), health: healthInput(10, 27_000, 3000), liquidatableNow: true }

describe('EconomicsEngine', () => {
  it('finds a candidate when the venue pays the oracle price', async () => {
    const verdict = await engine().evaluate(liquidatable)
    expect(verdict.status).toBe('candidate')
    expect(verdict.reason).toBeNull()
    expect(verdict.lifBps).toBe(438)
    // $1k repay seizes ~$1043.84; minus 0.8% buffers (~$8.35) and gas.
    const best = verdict.best!
    expect(best.label).toBe('$1000')
    expect(best.withinRiskLimit).toBe(true)
    expect(best.grossProfitUsd).toBeCloseTo(43.84, 1)
    expect(best.netProfitUsd).toBeCloseTo(43.84 - 8.35 - 0.03, 1)
    expect(best.dexVsOracleBps).toBeCloseTo(0, 0)
  })

  it('quotes every rung but only counts those within the $1k risk limit', async () => {
    const verdict = await engine().evaluate(liquidatable)
    expect(verdict.sizes.map((s) => s.label)).toEqual(['$1000', '$5000', '$10000'])
    expect(verdict.sizes.map((s) => s.withinRiskLimit)).toEqual([true, false, false])
    expect(verdict.sizes[1]!.pass).toBe(true)
    expect(verdict.sizes[1]!.reason).toBe('exceeds_risk_limit')
  })

  it('rejects when price impact eats the bonus', async () => {
    // 500 bps of impact per $1k sold dwarfs a 4.4% bonus.
    const verdict = await engine(fakeVenue({ usdPerEth: 3000, impactBpsPer1k: 500 })).evaluate(liquidatable)
    expect(verdict.status).toBe('rejected')
    expect(verdict.reason).toBe('unprofitable_after_buffers')
    expect(verdict.best!.netProfitUsd).toBeLessThan(0)
  })

  it('rejects when the venue trades below the oracle (basis)', async () => {
    // Venue 5% under the oracle: seized collateral sells for less than the repay.
    const verdict = await engine(fakeVenue({ usdPerEth: 2850 })).evaluate(liquidatable)
    expect(verdict.reason).toBe('unprofitable_after_buffers')
    expect(verdict.best!.dexVsOracleBps).toBeCloseTo(-500, 0)
  })

  it('names thin liquidity separately from a thin margin', async () => {
    const verdict = await engine(fakeVenue({ usdPerEth: 1500 })).evaluate(liquidatable)
    expect(verdict.reason).toBe('venue_liquidity_too_thin')
  })

  it('is conservative: the buffers alone can kill a marginal trade', async () => {
    // Bonus 4.38%; a venue 3.7% under the oracle leaves 0.68% < 0.8% of buffers.
    const verdict = await engine(fakeVenue({ usdPerEth: 2889 })).evaluate(liquidatable)
    expect(verdict.best!.grossProfitUsd).toBeGreaterThan(0)
    expect(verdict.best!.netProfitUsd).toBeLessThan(0)
    expect(verdict.status).toBe('rejected')
  })

  it('records no_route and quote_failed as different outcomes', async () => {
    expect((await engine(fakeVenue({ usdPerEth: 3000, noRoute: true })).evaluate(liquidatable)).reason).toBe('no_route')
    expect((await engine(fakeVenue({ usdPerEth: 3000, fail: true })).evaluate(liquidatable)).reason).toBe('quote_failed')
  })

  it('fails closed when an input cannot be priced', async () => {
    const unpriced = await engine(undefined, {}, { pricer: fakePricer({ [USDC]: null }) }).evaluate(liquidatable)
    expect(unpriced.reason).toBe('loan_token_unpriced')
    const noGas = await engine(undefined, {}, { gas: fakeGas(null) }).evaluate(liquidatable)
    expect(noGas.reason).toBe('gas_unpriced')
  })

  it('rejects dust without asking the venue', async () => {
    const venue = fakeVenue({ usdPerEth: 3000 })
    const verdict = await engine(venue).evaluate({
      market: market(),
      health: healthInput(0.01, 28, 3000),
      liquidatableNow: true,
    })
    expect(verdict.reason).toBe('dust_position')
    expect(verdict.debtUsd).toBeCloseTo(28, 0)
    expect(venue.calls).toBe(0)
  })

  it('collapses the ladder for a position smaller than the first rung', async () => {
    const verdict = await engine().evaluate({
      market: market(),
      health: healthInput(0.2, 540, 3000),
      liquidatableNow: true,
    })
    expect(verdict.sizes).toHaveLength(1)
    expect(verdict.sizes[0]!.label).toBe('full')
    expect(verdict.sizes[0]!.repayUsd).toBeCloseTo(540, 0)
    expect(verdict.status).toBe('candidate')
  })

  it('sizes a healthy near-threshold position hypothetically, never as a candidate', async () => {
    const verdict = await engine().evaluate({
      market: market(),
      health: healthInput(10, 25_500, 3000), // HF 1.012
      liquidatableNow: false,
    })
    expect(verdict.hypothetical).toBe(true)
    expect(verdict.status).toBe('hypothetical_pass')
  })

  it('rejects an SVR-gated market even when the economics pass', async () => {
    const verdict = await engine().evaluate({ ...liquidatable, market: market('svr') })
    expect(verdict.status).toBe('rejected')
    expect(verdict.reason).toBe('svr_auction_gated')
    expect(verdict.economicsPass).toBe(true)
  })

  it('rejects an unclassified oracle, and lists both reasons when economics also fail', async () => {
    expect((await engine().evaluate({ ...liquidatable, market: market('unknown') })).reason).toBe('oracle_unclassified')
    const both = await engine(fakeVenue({ usdPerEth: 2850 })).evaluate({ ...liquidatable, market: market('svr') })
    expect(both.reasons).toEqual(['unprofitable_after_buffers', 'svr_auction_gated'])
  })

  it('lets the oracle gates be switched off explicitly', async () => {
    const verdict = await engine(undefined, { rejectSvrFlagged: false }).evaluate({
      ...liquidatable,
      market: market('svr'),
    })
    expect(verdict.status).toBe('candidate')
  })
})

describe('decide', () => {
  const size = (over: Partial<SizeResult>): SizeResult => ({
    label: '$1000',
    targetUsd: 1000,
    repayAssets: 0n,
    seizedAssets: 0n,
    repayUsd: 1000,
    collateralBound: false,
    quoteOut: 1n,
    route: [],
    dexVsOracleBps: 0,
    grossProfitUsd: 0,
    bufferUsd: 0,
    gasUsd: 0,
    netProfitUsd: 0,
    withinRiskLimit: true,
    pass: false,
    reason: 'unprofitable_after_buffers',
    ...over,
  })
  const config = { rejectSvrFlagged: true, rejectUnclassifiedOracle: true }

  it('reports exceeds_risk_limit when only an oversized rung works', () => {
    const result = decide({
      sizes: [
        size({ netProfitUsd: -1 }),
        size({ label: '$5000', repayUsd: 5000, withinRiskLimit: false, pass: true, netProfitUsd: 9, reason: 'exceeds_risk_limit' }),
      ],
      liquidatableNow: true,
      oracleFlag: 'none',
      config,
    })
    expect(result).toMatchObject({ status: 'rejected', reason: 'exceeds_risk_limit', economicsPass: false })
  })

  it('picks the most profitable allowed size', () => {
    const result = decide({
      sizes: [
        size({ label: '$500', pass: true, netProfitUsd: 3, reason: null }),
        size({ label: '$1000', pass: true, netProfitUsd: 7, reason: null }),
      ],
      liquidatableNow: true,
      oracleFlag: 'none',
      config,
    })
    expect(result.status).toBe('candidate')
    expect(result.best!.label).toBe('$1000')
  })
})

describe('classifyOracle', () => {
  const svr = [
    { address: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F' as const, role: 'secondary_proxy' as const, name: 'BTC / USD', path: 'btc-usd-shared-svr-2', label: 'Shared SVR' },
  ]
  const plain = '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as const

  it('flags a market reading an SVR-linked feed, case-insensitively', () => {
    const result = classifyOracle(['0x64C911996D3C6AC71F9B455B1E8E7266BCBD848F', plain, ZERO_ADDRESS, ZERO_ADDRESS], svr)
    expect(result.flag).toBe('svr')
    expect(result.svrMatches[0]).toMatchObject({ path: 'btc-usd-shared-svr-2', role: 'secondary_proxy' })
    expect(result.feeds).toHaveLength(2)
  })

  it('reports none when no feed matches', () => {
    expect(classifyOracle([plain, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS], svr).flag).toBe('none')
    expect(classifyOracle([ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS], svr).flag).toBe('none')
  })

  it('reports unknown when the feeds cannot be enumerated', () => {
    expect(classifyOracle(null, svr).flag).toBe('unknown')
  })
})

describe('CachedVenue', () => {
  it('serves repeated amounts from cache and never caches a failure', async () => {
    let now = 0
    const clock = { now: () => now, sleep: async () => {} }
    const inner = fakeVenue({ usdPerEth: 3000 })
    const cached = new CachedVenue(inner, 1000, clock)
    const first = await cached.quoteExactIn(WETH, USDC, [10n ** 18n, 2n * 10n ** 18n])
    const second = await cached.quoteExactIn(WETH, USDC, [2n * 10n ** 18n, 10n ** 18n])
    expect(inner.calls).toBe(1)
    expect(second[0]).toEqual(first[1])
    expect(second[1]).toEqual(first[0])

    now = 2000 // expired
    await cached.quoteExactIn(WETH, USDC, [10n ** 18n])
    expect(inner.calls).toBe(2)

    const failing = new CachedVenue(fakeVenue({ usdPerEth: 3000, fail: true }), 1000, clock)
    await expect(failing.quoteExactIn(WETH, USDC, [1n])).rejects.toThrow('rpc down')
    await expect(failing.quoteExactIn(WETH, USDC, [1n])).rejects.toThrow('rpc down')
  })
})
