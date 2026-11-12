// Fixed-point integer primitives mirroring morpho-blue's MathLib + SharesMathLib
// exactly, including rounding direction and the virtual share/asset offsets.
// Every rounding direction here is load-bearing: health and sizing must agree
// with the contract to the wei, or a "liquidatable" reading is a guess.

import { VIRTUAL_ASSETS, VIRTUAL_SHARES, WAD } from '../constants.ts'

/** floor(x * y / d). Throws on d == 0, matching the EVM's division revert. */
export function mulDivDown(x: bigint, y: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('mulDivDown: division by zero')
  return (x * y) / d
}

/** ceil(x * y / d). Throws on d == 0. */
export function mulDivUp(x: bigint, y: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('mulDivUp: division by zero')
  return (x * y + (d - 1n)) / d
}

export const wMulDown = (x: bigint, y: bigint): bigint => mulDivDown(x, y, WAD)
export const wDivDown = (x: bigint, y: bigint): bigint => mulDivDown(x, WAD, y)
export const wDivUp = (x: bigint, y: bigint): bigint => mulDivUp(x, WAD, y)

export const min = (a: bigint, b: bigint): bigint => (a < b ? a : b)

/**
 * First three non-zero terms of e^(nx) - 1 (MathLib.wTaylorCompounded). `x` is a
 * per-second WAD rate, `n` the elapsed seconds. Each term floors independently
 * and in this order; a fused formula diverges by a few wei.
 */
export function wTaylorCompounded(x: bigint, n: bigint): bigint {
  const firstTerm = x * n
  const secondTerm = mulDivDown(firstTerm, firstTerm, 2n * WAD)
  const thirdTerm = mulDivDown(secondTerm, firstTerm, 3n * WAD)
  return firstTerm + secondTerm + thirdTerm
}

export function toSharesDown(assets: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return mulDivDown(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS)
}

export function toSharesUp(assets: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return mulDivUp(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS)
}

export function toAssetsDown(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return mulDivDown(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES)
}

export function toAssetsUp(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return mulDivUp(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES)
}
