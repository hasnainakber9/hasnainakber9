// Shared fixtures: a WETH/USDC market and fakes for the venue, pricer and gas.

import type { Address, Hex } from 'viem'

import { ORACLE_PRICE_SCALE, WAD } from '../../src/constants.ts'
import type { EconomicsConfig } from '../../src/economics/evaluate.ts'
import type { OracleFlag } from '../../src/economics/oracleFlags.ts'
import type { LiquidityVenue, Quote, UsdPricer } from '../../src/economics/venue.ts'
import { lifFromLltv, type HealthInput } from '../../src/scanner/health.ts'
import type { MarketInfo } from '../../src/scanner/marketRegistry.ts'
import { toSharesUp } from '../../src/scanner/math.ts'

export const WETH: Address = '0x4200000000000000000000000000000000000006'
export const USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
export const MARKET_ID = `0x${'11'.repeat(32)}` as Hex
export const LLTV_86 = (86n * WAD) / 100n

export const priceFor = (usdPerEth: number) =>
  (BigInt(Math.round(usdPerEth * 100)) * ORACLE_PRICE_SCALE * 10n ** 6n) / 10n ** 18n / 100n

export function market(flag: OracleFlag = 'none'): MarketInfo {
  return {
    id: MARKET_ID,
    label: 'WETH/USDC 86%',
    params: {
      loanToken: USDC,
      collateralToken: WETH,
      oracle: '0x00000000000000000000000000000000000000Aa',
      irm: '0x00000000000000000000000000000000000000bb',
      lltv: LLTV_86,
    },
    loan: { address: USDC, symbol: 'USDC', decimals: 6 },
    collateral: { address: WETH, symbol: 'WETH', decimals: 18 },
    lif: lifFromLltv(LLTV_86),
    oracle: { flag, feeds: [], svrMatches: [], detail: flag },
  }
}

export const TOTAL_BORROW_ASSETS = 50_000_000_000_000n
export const TOTAL_BORROW_SHARES = 48_000_000_000_000n * 10n ** 6n

export function healthInput(collateralEth: number, debtUsdc: number, usdPerEth: number): HealthInput {
  return {
    borrowShares: toSharesUp(BigInt(Math.round(debtUsdc * 1e6)), TOTAL_BORROW_ASSETS, TOTAL_BORROW_SHARES),
    collateral: BigInt(Math.round(collateralEth * 1e6)) * 10n ** 12n,
    totalBorrowAssets: TOTAL_BORROW_ASSETS,
    totalBorrowShares: TOTAL_BORROW_SHARES,
    price: priceFor(usdPerEth),
    lltv: LLTV_86,
  }
}

/**
 * A venue that sells WETH for USDC at `usdPerEth`, losing `impactBpsPer1k` bps
 * for every $1,000 sold (a crude price-impact curve).
 */
export function fakeVenue(opts: {
  usdPerEth: number
  impactBpsPer1k?: number
  noRoute?: boolean
  fail?: boolean
}): LiquidityVenue & { calls: number } {
  const venue = {
    name: 'fake',
    calls: 0,
    async quoteExactIn(tokenIn: Address, tokenOut: Address, amountsIn: bigint[]): Promise<(Quote | null)[]> {
      venue.calls += 1
      if (opts.fail) throw new Error('rpc down')
      return amountsIn.map((amountIn) => {
        if (opts.noRoute) return null
        const usd = (Number(amountIn) / 1e18) * opts.usdPerEth
        const impact = ((opts.impactBpsPer1k ?? 0) * usd) / 1000 / 10_000
        return {
          venue: 'fake',
          amountIn,
          amountOut: BigInt(Math.floor(usd * (1 - impact) * 1e6)),
          hops: [{ tokenIn, tokenOut, fee: 500 }],
        }
      })
    },
  }
  return venue
}

export const fakePricer = (prices: Record<string, number | null> = { [USDC]: 1, [WETH]: 3000 }): UsdPricer => ({
  priceUsd: async (token) => prices[token.address] ?? null,
})

export const fakeGas = (usd: number | null = 0.03) => ({
  cost: async () => (usd === null ? null : { usd, l2Wei: 0n, l1Wei: 0n, gasPriceWei: 0n }),
})

export const economicsConfig: EconomicsConfig = {
  sizeLadderUsd: [1000, 5000, 10000],
  slippageBufferBps: 50,
  priceMoveBufferBps: 30,
  minNetProfitUsd: 2,
  thinLiquidityBps: 1500,
  rejectSvrFlagged: true,
  rejectUnclassifiedOracle: true,
  minDebtUsd: 50,
}

export const riskConfig = { maxRiskPerTradeUsd: 1000, lossLimitUsd: 2000, manualApprovalRequired: true, maxLiveTrades: 1 }
