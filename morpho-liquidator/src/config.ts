// Configuration: JSON files under config/ plus a few environment variables for
// secrets and endpoints. Everything is validated at startup; a malformed value,
// an unknown key or a locked-rule violation stops the process before it reads
// a single block.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getAddress, isAddress, parseUnits, type Address, type Hex } from 'viem'
import { z } from 'zod'

import { assertWithinLockedRules } from './risk/limits.ts'

const marketId = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'market id must be 32 bytes of hex')
  .transform((v) => v.toLowerCase() as Hex)

const address = z
  .string()
  .refine((v) => isAddress(v, { strict: false }), 'invalid address')
  .transform((v) => getAddress(v) as Address)

/** A decimal string such as "1.05", parsed exactly into a WAD bigint. */
const wadDecimal = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'expected a decimal string like "1.05"')
  .transform((v) => parseUnits(v, 18))

const bps = z.number().int().min(0).max(10_000)
const positiveInt = z.number().int().positive()

const ConfigSchema = z.strictObject({
  chainId: z.number().int(),
  live_execution_enabled: z.boolean(),
  risk: z.strictObject({
    maxRiskPerTradeUsd: z.number().positive(),
    lossLimitUsd: z.number().positive(),
    manualApprovalRequired: z.boolean(),
    maxLiveTrades: z.number().int().min(0),
  }),
  rpc: z.strictObject({
    maxRequestsPerSecond: z.number().positive(),
    timeoutMs: positiveInt,
    maxRetries: z.number().int().min(0).max(10),
    backoffBaseMs: positiveInt,
    backoffMaxMs: positiveInt,
    breakerFailureThreshold: positiveInt,
    breakerCooldownMs: positiveInt,
    multicallBatchCalls: positiveInt,
    /** Read this many blocks behind the head, so load-balanced nodes agree. */
    pinLagBlocks: z.number().int().min(0).max(50),
    /** A pinned block older than this means the RPC is stale: fail closed. */
    maxBlockAgeSec: positiveInt,
  }),
  discovery: z.strictObject({
    apiUrl: z.url(),
    intervalMs: positiveInt,
    /** Past this age the candidate set is stale and the scanner is degraded. */
    maxAgeMs: positiveInt,
    pageSize: positiveInt.max(1000),
    maxPages: positiveInt,
    timeoutMs: positiveInt,
  }),
  scanner: z.strictObject({
    pollIntervalMs: positiveInt,
    /** Positions at or below this health factor are tracked. */
    researchBandHf: wadDecimal,
    /** Positions at or below this health factor get sized economics. */
    nearThresholdHf: wadDecimal,
    /** A position must rise this far above a boundary to leave a band. */
    bandHysteresisBps: bps,
    /** Cycles a position may sit above the research band before it is dropped. */
    watchlistGraceCycles: positiveInt,
    /** Below this debt a position is dust: tracked, never a candidate. */
    minDebtUsd: z.number().min(0),
    maxLoopBackoffMs: positiveInt,
  }),
  economics: z.strictObject({
    sizeLadderUsd: z.array(z.number().positive()).min(1),
    slippageBufferBps: bps,
    priceMoveBufferBps: bps,
    gasUnits: positiveInt,
    gasPriceMultiplier: z.number().min(1),
    l1TxSizeBytes: positiveInt,
    minNetProfitUsd: z.number().min(0),
    /** Re-quote interval for a liquidatable position. */
    quoteTtlMs: positiveInt,
    /** Re-quote interval for a near-threshold (hypothetical) position. */
    hypotheticalTtlMs: positiveInt,
    /** Upper bound on venue-quoted evaluations in one cycle. */
    maxQuotedPerCycle: positiveInt,
    /** Stop starting new evaluations once a cycle has run this long. */
    cycleBudgetMs: positiveInt,
    priceTtlMs: positiveInt,
    quoteCacheTtlMs: positiveInt,
    thinLiquidityBps: bps,
    rejectSvrFlagged: z.boolean(),
    rejectUnclassifiedOracle: z.boolean(),
    /** Consecutive cycles a candidate must survive before it counts as realistic. */
    persistenceCycles: positiveInt,
    /** Tokens treated as exactly this many USD (address -> USD). */
    stablecoins: z.record(z.string(), z.number().positive()),
    /** Intermediate tokens tried for two-hop routes. */
    hubTokens: z.array(address),
    feeTiers: z.array(z.number().int().positive()).min(1),
  }),
  alerts: z.strictObject({
    cooldownMs: z.number().int().min(0),
    webhookTimeoutMs: positiveInt,
  }),
  health: z.strictObject({
    /** 0 disables the HTTP health endpoint (the heartbeat file is always written). */
    port: z.number().int().min(0).max(65_535),
    maxCycleAgeMs: positiveInt,
  }),
  storage: z.strictObject({ dataDir: z.string().min(1) }),
})

const MarketsSchema = z.strictObject({
  chainId: z.number().int(),
  generatedAt: z.string().optional(),
  note: z.string().optional(),
  markets: z
    .array(z.strictObject({ id: marketId, label: z.string().min(1) }))
    .min(1, 'the market whitelist must not be empty'),
})

const SvrFeedsSchema = z.strictObject({
  chainId: z.number().int(),
  source: z.string(),
  generatedAt: z.string(),
  feeds: z.array(
    z.strictObject({
      address,
      role: z.enum(['proxy', 'secondary_proxy']),
      name: z.string(),
      path: z.string(),
      label: z.string().nullable(),
    }),
  ),
})

export type FileConfig = z.infer<typeof ConfigSchema>
export type MarketWhitelistEntry = z.infer<typeof MarketsSchema>['markets'][number]
export type SvrFeed = z.infer<typeof SvrFeedsSchema>['feeds'][number]

export interface Config extends FileConfig {
  markets: MarketWhitelistEntry[]
  svrFeeds: SvrFeed[]
  rpcUrls: string[]
  alertWebhookUrl: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

function readJson(path: string): unknown {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (cause) {
    throw new ConfigError(`cannot read ${path}: ${(cause as Error).message}`)
  }
  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new ConfigError(`${path} is not valid JSON: ${(cause as Error).message}`)
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, path: string): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ConfigError(`${path}: ${z.prettifyError(result.error)}`)
  return result.data
}

const DEFAULT_PUBLIC_RPC = 'https://mainnet.base.org'

/** Validates parsed file contents plus environment into a Config. */
export function buildConfig(input: {
  base: unknown
  markets: unknown
  svrFeeds: unknown
  env?: NodeJS.ProcessEnv
  paths?: { base?: string; markets?: string; svrFeeds?: string }
}): Config {
  const env = input.env ?? process.env
  const base = parse(ConfigSchema, input.base, input.paths?.base ?? 'config')
  const markets = parse(MarketsSchema, input.markets, input.paths?.markets ?? 'markets')
  const svr = parse(SvrFeedsSchema, input.svrFeeds, input.paths?.svrFeeds ?? 'svr-feeds')

  assertWithinLockedRules(base)

  for (const [file, chainId] of [
    ['markets', markets.chainId],
    ['svr-feeds', svr.chainId],
  ] as const) {
    if (chainId !== base.chainId) {
      throw new ConfigError(`${file} is for chain ${chainId}, config is for ${base.chainId}`)
    }
  }
  if (base.scanner.nearThresholdHf > base.scanner.researchBandHf) {
    throw new ConfigError('scanner.nearThresholdHf must be <= scanner.researchBandHf')
  }
  if (base.scanner.nearThresholdHf < parseUnits('1', 18)) {
    throw new ConfigError('scanner.nearThresholdHf must be >= 1.0')
  }
  const ids = markets.markets.map((m) => m.id)
  if (new Set(ids).size !== ids.length) throw new ConfigError('duplicate market id in whitelist')

  const stablecoins: Record<string, number> = {}
  for (const [token, usd] of Object.entries(base.economics.stablecoins)) {
    if (!isAddress(token, { strict: false })) {
      throw new ConfigError(`economics.stablecoins: invalid address ${token}`)
    }
    stablecoins[getAddress(token)] = usd
  }

  const rpcUrls = (env.BASE_RPC_URL ?? DEFAULT_PUBLIC_RPC)
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  for (const url of rpcUrls) {
    if (!/^https?:\/\//.test(url)) throw new ConfigError('BASE_RPC_URL entries must be http(s) URLs')
  }

  const logLevel = (env.LOG_LEVEL ?? 'info') as Config['logLevel']
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new ConfigError(`LOG_LEVEL must be debug|info|warn|error, got ${logLevel}`)
  }

  return {
    ...base,
    economics: { ...base.economics, stablecoins },
    markets: markets.markets,
    svrFeeds: svr.feeds,
    rpcUrls,
    alertWebhookUrl: env.ALERT_WEBHOOK_URL?.trim() || null,
    logLevel,
  }
}

/** Loads and validates config/ from disk. Throws ConfigError on any problem. */
export function loadConfig(configDir = resolve(process.cwd(), 'config')): Config {
  const paths = {
    base: resolve(configDir, 'base.json'),
    markets: resolve(configDir, 'markets.base.json'),
    svrFeeds: resolve(configDir, 'svr-feeds.base.json'),
  }
  return buildConfig({
    base: readJson(paths.base),
    markets: readJson(paths.markets),
    svrFeeds: readJson(paths.svrFeeds),
    paths,
  })
}

export function usingPublicRpc(config: Config): boolean {
  return config.rpcUrls.length === 1 && config.rpcUrls[0] === DEFAULT_PUBLIC_RPC
}
