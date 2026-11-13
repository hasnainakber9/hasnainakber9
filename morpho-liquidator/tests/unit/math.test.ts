import { describe, expect, it } from 'vitest'

import { WAD } from '../../src/constants.ts'
import {
  mulDivDown,
  mulDivUp,
  toAssetsDown,
  toAssetsUp,
  toSharesDown,
  toSharesUp,
  wDivDown,
  wDivUp,
  wMulDown,
  wTaylorCompounded,
} from '../../src/scanner/math.ts'

describe('MathLib mirror', () => {
  it('rounds mulDiv in the stated direction', () => {
    expect(mulDivDown(10n, 10n, 3n)).toBe(33n)
    expect(mulDivUp(10n, 10n, 3n)).toBe(34n)
    // Exact division: both directions agree.
    expect(mulDivDown(9n, 4n, 6n)).toBe(6n)
    expect(mulDivUp(9n, 4n, 6n)).toBe(6n)
  })

  it('throws on division by zero like the EVM reverts', () => {
    expect(() => mulDivDown(1n, 1n, 0n)).toThrow(RangeError)
    expect(() => mulDivUp(1n, 1n, 0n)).toThrow(RangeError)
  })

  it('wad helpers', () => {
    expect(wMulDown(2n * WAD, WAD / 2n)).toBe(WAD)
    expect(wDivDown(WAD, 3n * WAD)).toBe(333333333333333333n)
    expect(wDivUp(WAD, 3n * WAD)).toBe(333333333333333334n)
  })

  it('wTaylorCompounded matches the three-term expansion term by term', () => {
    // 5% APR as a per-second WAD rate, compounded over a year.
    const rate = (5n * WAD) / 100n / 31_536_000n
    const n = 31_536_000n
    const first = rate * n
    const second = (first * first) / (2n * WAD)
    const third = (second * first) / (3n * WAD)
    expect(wTaylorCompounded(rate, n)).toBe(first + second + third)
    // e^0.05 - 1 = 0.051271...; three terms give 0.0512708...
    const value = Number(wTaylorCompounded(rate, n)) / 1e18
    expect(value).toBeGreaterThan(0.05127)
    expect(value).toBeLessThan(0.051272)
    expect(wTaylorCompounded(rate, 0n)).toBe(0n)
  })
})

describe('SharesMathLib mirror', () => {
  it('uses the virtual offsets on an empty market', () => {
    // (assets) * (0 + 1e6) / (0 + 1)
    expect(toSharesDown(100n, 0n, 0n)).toBe(100_000_000n)
    expect(toAssetsDown(100_000_000n, 0n, 0n)).toBe(100n)
  })

  it('rounds shares and assets in opposite directions', () => {
    const totalAssets = 1_000_000_007n
    const totalShares = 999_999_999_999_999n
    const assets = 123_456_789n
    const down = toSharesDown(assets, totalAssets, totalShares)
    const up = toSharesUp(assets, totalAssets, totalShares)
    expect(up - down).toBe(1n)
    expect(toAssetsUp(down, totalAssets, totalShares) - toAssetsDown(down, totalAssets, totalShares)).toBeLessThanOrEqual(1n)
  })

  it('never lets a round trip create assets', () => {
    const totalAssets = 5_432_109_876n
    const totalShares = 4_999_999_123_456_789n
    for (const assets of [1n, 7n, 1_000n, 999_999_999n]) {
      const shares = toSharesDown(assets, totalAssets, totalShares)
      expect(toAssetsDown(shares, totalAssets, totalShares)).toBeLessThanOrEqual(assets)
      const sharesUp = toSharesUp(assets, totalAssets, totalShares)
      expect(toAssetsUp(sharesUp, totalAssets, totalShares)).toBeGreaterThanOrEqual(assets)
    }
  })
})
