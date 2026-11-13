// Static facts about each whitelisted market: immutable params, token metadata
// and the oracle's SVR classification. All of it is immutable per market id, so
// it is read once and kept; a market whose facts cannot be read is excluded
// (fail closed) and retried on the next load.

import type { Address, Hex } from 'viem'

import { erc20Abi, oracleAbi } from '../abis.ts'
import type { MarketWhitelistEntry, SvrFeed } from '../config.ts'
import { classifyOracle, type OracleClassification } from '../economics/oracleFlags.ts'
import type { Logger } from '../logger.ts'
import { lifFromLltv } from './health.ts'
import type { CallResult, MarketParams, StateReader } from './stateReader.ts'

export interface TokenInfo {
  address: Address
  symbol: string
  decimals: number
}

export interface MarketInfo {
  id: Hex
  label: string
  params: MarketParams
  loan: TokenInfo
  collateral: TokenInfo
  /** Liquidation incentive factor (WAD), a constant of the market's LLTV. */
  lif: bigint
  oracle: OracleClassification
}

export class MarketRegistry {
  private readonly markets = new Map<Hex, MarketInfo>()
  private readonly excluded = new Map<Hex, string>()

  constructor(
    private readonly reader: StateReader,
    private readonly whitelist: MarketWhitelistEntry[],
    private readonly svrFeeds: SvrFeed[],
    private readonly logger: Logger,
  ) {}

  get(id: Hex): MarketInfo | undefined {
    return this.markets.get(id)
  }

  all(): MarketInfo[] {
    return [...this.markets.values()]
  }

  paramsById(): Map<Hex, MarketParams> {
    return new Map([...this.markets].map(([id, m]) => [id, m.params]))
  }

  /** Whitelisted ids that are not loaded, with the reason. */
  excludedMarkets(): Map<Hex, string> {
    return new Map(this.excluded)
  }

  get pending(): number {
    return this.whitelist.length - this.markets.size
  }

  /** Loads every whitelisted market not yet loaded. Safe to call repeatedly. */
  async load(): Promise<void> {
    const missing = this.whitelist.filter((m) => !this.markets.has(m.id))
    if (missing.length === 0) return

    const block = await this.reader.pinnedBlock()
    const paramsById = await this.reader.readMarketParams(
      missing.map((m) => m.id),
      block,
    )

    const loadable: { entry: MarketWhitelistEntry; params: MarketParams }[] = []
    for (const entry of missing) {
      const params = paramsById.get(entry.id)
      if (!params) {
        this.exclude(entry, 'market_params_unreadable')
        continue
      }
      loadable.push({ entry, params })
    }
    if (loadable.length === 0) return

    const feedSlots = ['BASE_FEED_1', 'BASE_FEED_2', 'QUOTE_FEED_1', 'QUOTE_FEED_2'] as const
    const contracts: unknown[] = []
    for (const { params } of loadable) {
      for (const token of [params.loanToken, params.collateralToken]) {
        contracts.push({ address: token, abi: erc20Abi, functionName: 'symbol' })
        contracts.push({ address: token, abi: erc20Abi, functionName: 'decimals' })
      }
      for (const slot of feedSlots) {
        contracts.push({ address: params.oracle, abi: oracleAbi, functionName: slot })
      }
    }
    const PER_MARKET = 8
    const results = await this.reader.multicall(contracts, block)

    loadable.forEach(({ entry, params }, i) => {
      const r = results.slice(i * PER_MARKET, (i + 1) * PER_MARKET)
      const [loanSymbol, loanDecimals, collSymbol, collDecimals, ...feedResults] = r
      if (loanDecimals?.status !== 'success' || collDecimals?.status !== 'success') {
        this.exclude(entry, 'token_decimals_unreadable')
        return
      }
      const feeds = feedResults.every((f) => f.status === 'success')
        ? feedResults.map((f) => (f as { result: Address }).result)
        : null
      let lif: bigint
      try {
        lif = lifFromLltv(params.lltv)
      } catch {
        this.exclude(entry, 'invalid_lltv')
        return
      }
      const symbolOf = (res: CallResult | undefined, fallback: Address) =>
        res?.status === 'success' && typeof res.result === 'string' ? res.result : fallback.slice(0, 10)
      const info: MarketInfo = {
        id: entry.id,
        label: entry.label,
        params,
        loan: {
          address: params.loanToken,
          symbol: symbolOf(loanSymbol, params.loanToken),
          decimals: Number(loanDecimals.result),
        },
        collateral: {
          address: params.collateralToken,
          symbol: symbolOf(collSymbol, params.collateralToken),
          decimals: Number(collDecimals.result),
        },
        lif,
        oracle: classifyOracle(feeds, this.svrFeeds),
      }
      this.markets.set(entry.id, info)
      this.excluded.delete(entry.id)
      this.logger.info('market.loaded', {
        marketId: entry.id,
        label: entry.label,
        pair: `${info.collateral.symbol}/${info.loan.symbol}`,
        lltv: params.lltv,
        oracleFlag: info.oracle.flag,
      })
    })
  }

  private exclude(entry: MarketWhitelistEntry, reason: string): void {
    this.excluded.set(entry.id, reason)
    this.logger.warn('market.excluded', { marketId: entry.id, label: entry.label, reason })
  }
}
