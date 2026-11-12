// Composition root: wires config -> RPC -> providers -> scanner. Shared by the
// long-running scanner and the one-off scripts so they evaluate identically.

import { join } from 'node:path'

import { Alerter, WebhookSink, type AlertSink } from './alerts/alerts.ts'
import type { Config } from './config.ts'
import { BASE } from './constants.ts'
import { Store } from './db.ts'
import { EconomicsEngine } from './economics/evaluate.ts'
import { GasModel, VenueUsdPricer } from './economics/pricing.ts'
import { UniswapV3Venue } from './economics/uniswapV3.ts'
import { CachedVenue } from './economics/venue.ts'
import type { Logger } from './logger.ts'
import { createResilientRpc } from './rpc/client.ts'
import { MorphoApiDiscovery } from './scanner/discovery.ts'
import { MarketRegistry } from './scanner/marketRegistry.ts'
import { Scanner } from './scanner/scanner.ts'
import { StateReader } from './scanner/stateReader.ts'

export function buildApp(config: Config, logger: Logger, opts: { dbPath?: string } = {}) {
  const rpc = createResilientRpc({ urls: config.rpcUrls, ...config.rpc }, { logger: logger.child({ mod: 'rpc' }) })
  const reader = new StateReader(rpc.client, {
    morpho: BASE.morpho,
    multicallBatchCalls: config.rpc.multicallBatchCalls,
    pinLagBlocks: config.rpc.pinLagBlocks,
    maxBlockAgeSec: config.rpc.maxBlockAgeSec,
  })
  const registry = new MarketRegistry(reader, config.markets, config.svrFeeds, logger.child({ mod: 'registry' }))
  const discovery = new MorphoApiDiscovery(
    {
      apiUrl: config.discovery.apiUrl,
      chainId: config.chainId,
      pageSize: config.discovery.pageSize,
      maxPages: config.discovery.maxPages,
      timeoutMs: config.discovery.timeoutMs,
    },
    { logger: logger.child({ mod: 'discovery' }) },
  )
  const uniswap = new UniswapV3Venue(rpc.client, {
    factory: BASE.uniswapV3Factory,
    quoter: BASE.uniswapV3QuoterV2,
    feeTiers: config.economics.feeTiers,
    hubTokens: config.economics.hubTokens,
  })
  const venue = new CachedVenue(uniswap, config.economics.quoteCacheTtlMs)
  const pricer = new VenueUsdPricer(venue, {
    stablecoins: config.economics.stablecoins,
    reference: { address: BASE.usdc, decimals: 6 },
    ttlMs: config.economics.priceTtlMs,
  })
  const gas = new GasModel(rpc.client, pricer, {
    gasPriceOracle: BASE.gasPriceOracle,
    weth: { address: BASE.weth, decimals: 18 },
    gasUnits: config.economics.gasUnits,
    gasPriceMultiplier: config.economics.gasPriceMultiplier,
    l1TxSizeBytes: config.economics.l1TxSizeBytes,
  })
  const economics = new EconomicsEngine(
    { venue, pricer, gas },
    { ...config.economics, minDebtUsd: config.scanner.minDebtUsd },
    config.risk,
  )
  const store = new Store(opts.dbPath ?? join(config.storage.dataDir, 'scanner.sqlite'))
  const sinks: AlertSink[] = config.alertWebhookUrl
    ? [new WebhookSink(config.alertWebhookUrl, config.alerts.webhookTimeoutMs)]
    : []
  const alerter = new Alerter({ store, logger: logger.child({ mod: 'alerts' }), sinks }, { cooldownMs: config.alerts.cooldownMs })
  const scanner = new Scanner({
    config,
    registry,
    reader,
    discovery,
    economics,
    pricer,
    store,
    alerter,
    logger: logger.child({ mod: 'scanner' }),
  })
  return { rpc, reader, registry, discovery, venue, pricer, gas, economics, store, alerter, scanner }
}
