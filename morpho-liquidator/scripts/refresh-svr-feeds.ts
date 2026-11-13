// Regenerates config/svr-feeds.base.json from Chainlink's reference data
// directory (the dataset behind docs.chain.link's feed address pages).
//
// An SVR entry lists two proxies: the SVR-enabled proxy and its paired
// standard proxy. Both are recorded: a market oracle reading either one is
// linked to an SVR feed and is flagged for auction awareness.
//
//   pnpm tsx scripts/refresh-svr-feeds.ts
//
// Like the market whitelist this is a reviewed file in git, not a runtime
// lookup: the scanner must not depend on a third-party site being up.

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getAddress, isAddress } from 'viem'

const SOURCE = 'https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-base-1.json'

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) })
if (!response.ok) throw new Error(`HTTP ${response.status} from ${SOURCE}`)
const directory = (await response.json()) as Record<string, unknown>[]
if (!Array.isArray(directory) || directory.length === 0) throw new Error('unexpected directory shape')

const feeds: { address: string; role: 'proxy' | 'secondary_proxy'; name: string; path: string; label: string | null }[] = []
for (const entry of directory) {
  const path = typeof entry.path === 'string' ? entry.path : ''
  const label = typeof entry.svrDisplayLabel === 'string' ? entry.svrDisplayLabel : null
  if (!label && !/(^|-)svr(-|$)/.test(path)) continue
  const name = typeof entry.name === 'string' ? entry.name : path
  for (const [field, role] of [
    ['proxyAddress', 'proxy'],
    ['secondaryProxyAddress', 'secondary_proxy'],
  ] as const) {
    const value = entry[field]
    if (typeof value === 'string' && isAddress(value, { strict: false })) {
      feeds.push({ address: getAddress(value), role, name, path, label })
    }
  }
}
if (feeds.length === 0) throw new Error('no SVR feeds found; refusing to write an empty list')
feeds.sort((a, b) => a.path.localeCompare(b.path) || a.role.localeCompare(b.role))

const out = { chainId: 8453, source: SOURCE, generatedAt: new Date().toISOString(), feeds }
const path = resolve(process.cwd(), 'config/svr-feeds.base.json')
writeFileSync(path, JSON.stringify(out, null, 2) + '\n')
console.log(`wrote ${feeds.length} SVR-linked feed addresses to ${path}`)
