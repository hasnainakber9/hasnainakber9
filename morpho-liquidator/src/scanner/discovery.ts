// Discovery: which (market, borrower) pairs are worth reading on-chain.
//
// Discovery is a COVERAGE source, never a correctness dependency (the pattern
// from morpho-org/morpho-bots): only the market id and borrower address are
// taken from the API. Health, debt and collateral are always re-read on-chain
// at a pinned block. Over-inclusion is harmless; indexing lag costs coverage
// latency only.

import { getAddress, isAddress, type Address, type Hex } from 'viem'

import { newId, type Logger } from '../logger.ts'

export interface DiscoveredPair {
  marketId: Hex
  borrower: Address
  /** Health factor as reported by the API. Informational only. */
  apiHealthFactor: number | null
}

export interface DiscoveryResult {
  pairs: DiscoveredPair[]
  /**
   * False when a backstop cut the walk short. An incomplete result must never
   * be read as "everything else is healthy".
   */
  complete: boolean
  rawRows: number
  malformed: number
  pages: number
}

export interface DiscoveryProvider {
  readonly name: string
  discover(args: { marketIds: Hex[]; healthFactorLte: number }): Promise<DiscoveryResult>
}

export class DiscoveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DiscoveryError'
  }
}

const MARKET_ID_RE = /^0x[0-9a-fA-F]{64}$/

/** Validates one API row. Returns null for anything malformed. */
export function parseDiscoveryRow(row: unknown): DiscoveredPair | null {
  if (typeof row !== 'object' || row === null) return null
  const r = row as {
    healthFactor?: unknown
    user?: { address?: unknown } | null
    market?: { marketId?: unknown } | null
  }
  const marketId = r.market?.marketId
  const borrower = r.user?.address
  if (typeof marketId !== 'string' || !MARKET_ID_RE.test(marketId)) return null
  if (typeof borrower !== 'string' || !isAddress(borrower, { strict: false })) return null
  const hf = typeof r.healthFactor === 'number' && Number.isFinite(r.healthFactor) ? r.healthFactor : null
  return {
    marketId: marketId.toLowerCase() as Hex,
    borrower: getAddress(borrower),
    apiHealthFactor: hf,
  }
}

export interface Page {
  items: unknown[]
  countTotal: number | null
}

export type FetchPage = (args: {
  marketIds: Hex[]
  healthFactorLte: number
  skip: number
  first: number
}) => Promise<Page>

/**
 * Walks the paginated candidate set: validates every row, de-duplicates pairs,
 * drops pairs outside the whitelist, and stops loudly at the page backstop.
 */
export async function walkDiscovery(
  fetchPage: FetchPage,
  args: { marketIds: Hex[]; healthFactorLte: number },
  opts: { pageSize: number; maxPages: number; logger: Logger },
): Promise<DiscoveryResult> {
  const allowed = new Set(args.marketIds.map((id) => id.toLowerCase()))
  const seen = new Set<string>()
  const pairs: DiscoveredPair[] = []
  let rawRows = 0
  let malformed = 0
  let pages = 0
  let complete = true

  for (let skip = 0; ; skip += opts.pageSize) {
    if (pages >= opts.maxPages) {
      opts.logger.warn('discovery.max_pages', { pages, collected: pairs.length })
      complete = false
      break
    }
    const page = await fetchPage({ ...args, skip, first: opts.pageSize })
    pages += 1
    rawRows += page.items.length
    for (const row of page.items) {
      const pair = parseDiscoveryRow(row)
      if (!pair) {
        malformed += 1
        continue
      }
      // The server filters by market, but a whitelist is a safety boundary:
      // enforce it here too rather than trust the filter.
      if (!allowed.has(pair.marketId)) continue
      const key = `${pair.marketId}:${pair.borrower}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push(pair)
    }
    if (page.items.length < opts.pageSize) break
    if (page.countTotal !== null && skip + page.items.length >= page.countTotal) break
  }

  if (malformed > 0) opts.logger.warn('discovery.malformed_rows', { malformed, rawRows })
  return { pairs, complete, rawRows, malformed, pages }
}

const QUERY = `
query Candidates($chainId: Int!, $marketIds: [String!], $hfLte: Float!, $skip: Int!, $first: Int!) {
  marketPositions(
    skip: $skip
    first: $first
    orderBy: HealthFactor
    orderDirection: Asc
    where: { chainId_in: [$chainId], marketUniqueKey_in: $marketIds, healthFactor_lte: $hfLte }
  ) {
    pageInfo { countTotal }
    items { healthFactor user { address } market { marketId } }
  }
}`

/** Discovery from the public Morpho GraphQL API. */
export class MorphoApiDiscovery implements DiscoveryProvider {
  readonly name = 'morpho-api'

  constructor(
    private readonly opts: {
      apiUrl: string
      chainId: number
      pageSize: number
      maxPages: number
      timeoutMs: number
    },
    private readonly deps: { logger: Logger; fetch?: typeof fetch },
  ) {}

  private fetchPage: FetchPage = async ({ marketIds, healthFactorLte, skip, first }) => {
    const reqId = newId('api')
    const doFetch = this.deps.fetch ?? fetch
    let response: Response
    try {
      response = await doFetch(this.opts.apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: { chainId: this.opts.chainId, marketIds, hfLte: healthFactorLte, skip, first },
        }),
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      })
    } catch (cause) {
      throw new DiscoveryError(`request failed: ${(cause as Error).message}`, { cause })
    }
    if (!response.ok) {
      throw new DiscoveryError(`HTTP ${response.status} from discovery API`)
    }
    let body: unknown
    try {
      body = await response.json()
    } catch (cause) {
      throw new DiscoveryError('discovery API returned invalid JSON', { cause })
    }
    const parsed = body as {
      errors?: { message?: string }[]
      data?: { marketPositions?: { items?: unknown; pageInfo?: { countTotal?: unknown } } }
    }
    if (parsed.errors?.length) {
      throw new DiscoveryError(`GraphQL error: ${parsed.errors[0]?.message ?? 'unknown'}`)
    }
    const items = parsed.data?.marketPositions?.items
    // A response without an items array is a shape change, not an empty set.
    if (!Array.isArray(items)) throw new DiscoveryError('discovery API response has no items array')
    const countTotal = parsed.data?.marketPositions?.pageInfo?.countTotal
    this.deps.logger.debug('discovery.page', { reqId, skip, rows: items.length })
    return { items, countTotal: typeof countTotal === 'number' ? countTotal : null }
  }

  async discover(args: { marketIds: Hex[]; healthFactorLte: number }): Promise<DiscoveryResult> {
    // The API caps the id filter, so walk the whitelist in chunks.
    const CHUNK = 100
    const merged: DiscoveryResult = { pairs: [], complete: true, rawRows: 0, malformed: 0, pages: 0 }
    for (let i = 0; i < args.marketIds.length; i += CHUNK) {
      const part = await walkDiscovery(
        this.fetchPage,
        { marketIds: args.marketIds.slice(i, i + CHUNK), healthFactorLte: args.healthFactorLte },
        { pageSize: this.opts.pageSize, maxPages: this.opts.maxPages, logger: this.deps.logger },
      )
      merged.pairs.push(...part.pairs)
      merged.complete &&= part.complete
      merged.rawRows += part.rawRows
      merged.malformed += part.malformed
      merged.pages += part.pages
    }
    return merged
  }
}
