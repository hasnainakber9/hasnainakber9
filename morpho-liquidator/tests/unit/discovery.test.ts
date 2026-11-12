import { describe, expect, it } from 'vitest'

import { silentLogger } from '../../src/logger.ts'
import {
  DiscoveryError,
  MorphoApiDiscovery,
  parseDiscoveryRow,
  walkDiscovery,
  type FetchPage,
} from '../../src/scanner/discovery.ts'

const M1 = `0x${'a1'.repeat(32)}` as const
const M2 = `0x${'b2'.repeat(32)}` as const
const user = (n: number) => `0x${n.toString(16).padStart(40, '0')}`
const row = (marketId: string, n: number, hf: number | null = 1.01) => ({
  healthFactor: hf,
  user: { address: user(n) },
  market: { marketId },
})

describe('parseDiscoveryRow', () => {
  it('normalises a good row', () => {
    const upper = `0x${'A1'.repeat(32)}`
    expect(parseDiscoveryRow(row(upper, 255))).toEqual({
      marketId: M1,
      borrower: '0x00000000000000000000000000000000000000ff',
      apiHealthFactor: 1.01,
    })
  })

  it('rejects malformed rows', () => {
    expect(parseDiscoveryRow(null)).toBeNull()
    expect(parseDiscoveryRow({})).toBeNull()
    expect(parseDiscoveryRow(row('0x1234', 1))).toBeNull()
    expect(parseDiscoveryRow({ ...row(M1, 1), user: { address: '0xnope' } })).toBeNull()
    expect(parseDiscoveryRow({ ...row(M1, 1), user: null })).toBeNull()
  })

  it('keeps a row whose health factor is missing', () => {
    expect(parseDiscoveryRow(row(M1, 1, null))?.apiHealthFactor).toBeNull()
  })
})

describe('walkDiscovery', () => {
  const opts = { pageSize: 2, maxPages: 10, logger: silentLogger }
  const args = { marketIds: [M1, M2], healthFactorLte: 1.05 }
  const pager = (pages: unknown[][], countTotal: number | null = null): FetchPage => {
    return async ({ skip, first }) => ({ items: pages[skip / first] ?? [], countTotal })
  }

  it('follows pages until a short one and de-duplicates', async () => {
    const result = await walkDiscovery(
      pager([[row(M1, 1), row(M1, 2)], [row(M1, 2), row(M2, 3)], [row(M2, 4)]]),
      args,
      opts,
    )
    expect(result.pairs.map((p) => Number(BigInt(p.borrower)))).toEqual([1, 2, 3, 4])
    expect(result).toMatchObject({ complete: true, pages: 3, rawRows: 5, malformed: 0 })
  })

  it('stops at countTotal without an extra request', async () => {
    let requests = 0
    const fetchPage: FetchPage = async () => {
      requests += 1
      return { items: [row(M1, requests * 2), row(M1, requests * 2 + 1)], countTotal: 4 }
    }
    const result = await walkDiscovery(fetchPage, args, opts)
    expect(requests).toBe(2)
    expect(result.complete).toBe(true)
  })

  it('counts malformed rows and still returns the good ones', async () => {
    const result = await walkDiscovery(pager([[row(M1, 1), { garbage: true }]]), args, { ...opts, pageSize: 5 })
    expect(result.pairs).toHaveLength(1)
    expect(result.malformed).toBe(1)
  })

  it('drops pairs outside the whitelist even if the server returns them', async () => {
    const other = `0x${'cc'.repeat(32)}`
    const result = await walkDiscovery(pager([[row(other, 1), row(M1, 2)]]), args, { ...opts, pageSize: 5 })
    expect(result.pairs.map((p) => p.marketId)).toEqual([M1])
  })

  it('marks the result incomplete at the page backstop', async () => {
    const endless: FetchPage = async ({ skip }) => ({
      items: [row(M1, skip + 1), row(M1, skip + 2)],
      countTotal: null,
    })
    const result = await walkDiscovery(endless, args, { ...opts, maxPages: 3 })
    expect(result.complete).toBe(false)
    expect(result.pages).toBe(3)
  })

  it('propagates a failed page', async () => {
    await expect(
      walkDiscovery(
        async () => {
          throw new DiscoveryError('HTTP 500')
        },
        args,
        opts,
      ),
    ).rejects.toThrow(DiscoveryError)
  })
})

describe('MorphoApiDiscovery', () => {
  const provider = (respond: () => Response | Promise<Response>) =>
    new MorphoApiDiscovery(
      { apiUrl: 'https://api.test/graphql', chainId: 8453, pageSize: 500, maxPages: 5, timeoutMs: 1000 },
      { logger: silentLogger, fetch: (async () => respond()) as typeof fetch },
    )
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const args = { marketIds: [M1], healthFactorLte: 1.05 }

  it('parses a page', async () => {
    const result = await provider(() =>
      json({ data: { marketPositions: { pageInfo: { countTotal: 1 }, items: [row(M1, 9)] } } }),
    ).discover(args)
    expect(result.pairs).toHaveLength(1)
    expect(result.complete).toBe(true)
  })

  it('fails closed on HTTP errors, GraphQL errors and shape changes', async () => {
    await expect(provider(() => json({}, 502)).discover(args)).rejects.toThrow(/HTTP 502/)
    await expect(provider(() => json({ errors: [{ message: 'boom' }] })).discover(args)).rejects.toThrow(/boom/)
    // No items array is a schema change, not "zero positions".
    await expect(provider(() => json({ data: { marketPositions: {} } })).discover(args)).rejects.toThrow(/no items/)
    await expect(provider(() => new Response('<html>', { status: 200 })).discover(args)).rejects.toThrow(/invalid JSON/)
  })

  it('wraps a network failure', async () => {
    await expect(
      provider(() => {
        throw new Error('socket hang up')
      }).discover(args),
    ).rejects.toThrow(DiscoveryError)
  })
})
