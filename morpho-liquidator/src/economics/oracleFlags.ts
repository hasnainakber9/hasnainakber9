// SVR / auction awareness.
//
// Chainlink SVR (Smart Value Recapture) delivers a price update through a
// private channel and auctions the right to backrun it (Atlas on Base). When a
// market's oracle reads an SVR-linked feed, the liquidation created by a price
// update is normally won inside that auction, in the same transaction bundle as
// the update. A liquidator that is not an onboarded SVR searcher only sees what
// is left after the fallback delay. So an SVR-linked market is flagged, and by
// default its positions are not counted as realistic candidates.
//
// Classification is deliberately conservative:
//   - 'svr'     at least one feed address appears in the Chainlink directory's
//               SVR entries (as the SVR proxy or as its paired standard proxy);
//   - 'none'    the oracle exposes its feeds and none is SVR-linked;
//   - 'unknown' the oracle's feeds cannot be enumerated (not a
//               MorphoChainlinkOracleV2), so auction exposure cannot be ruled out.
//
// Limitation: a feed wrapped behind a custom adapter contract is not seen
// through. Confirm against https://docs.chain.link/data-feeds/price-feeds/addresses
// before any live path depends on a 'none'.

import type { Address } from 'viem'

import type { SvrFeed } from '../config.ts'
import { ZERO_ADDRESS } from '../constants.ts'

export type OracleFlag = 'svr' | 'none' | 'unknown'

export interface OracleClassification {
  flag: OracleFlag
  /** Non-zero feeds the oracle reads (empty when they cannot be enumerated). */
  feeds: Address[]
  svrMatches: { address: Address; role: SvrFeed['role']; name: string; path: string; label: string | null }[]
  detail: string
}

/**
 * `feeds` is the result of reading BASE_FEED_1/2 and QUOTE_FEED_1/2 from the
 * oracle, or null when any of those reads failed.
 */
export function classifyOracle(
  feeds: readonly Address[] | null,
  svrFeeds: readonly SvrFeed[],
): OracleClassification {
  if (feeds === null) {
    return {
      flag: 'unknown',
      feeds: [],
      svrMatches: [],
      detail: 'oracle does not expose Chainlink feed slots; auction exposure cannot be ruled out',
    }
  }
  const live = feeds.filter((f) => f !== ZERO_ADDRESS)
  const index = new Map(svrFeeds.map((f) => [f.address.toLowerCase(), f]))
  const svrMatches = live.flatMap((feed) => {
    const match = index.get(feed.toLowerCase())
    return match
      ? [{ address: feed, role: match.role, name: match.name, path: match.path, label: match.label }]
      : []
  })
  if (svrMatches.length > 0) {
    return {
      flag: 'svr',
      feeds: live,
      svrMatches,
      detail: `SVR-linked feed(s): ${svrMatches.map((m) => `${m.name} (${m.path})`).join(', ')}`,
    }
  }
  return {
    flag: 'none',
    feeds: live,
    svrMatches: [],
    detail:
      live.length === 0
        ? 'oracle reads no price feed (fixed or vault-only price)'
        : 'no feed matches a known SVR entry',
  }
}
