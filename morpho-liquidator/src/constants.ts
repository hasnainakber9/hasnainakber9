import type { Address } from 'viem'

// ---------------------------------------------------------------------------
// Morpho Blue protocol constants (morpho-org/morpho-blue: ConstantsLib.sol,
// SharesMathLib.sol, MathLib.sol). These are protocol facts, not tunables.
// ---------------------------------------------------------------------------

/** 1e18 fixed-point one. */
export const WAD = 10n ** 18n
/** Oracle price scale: `price()` already bakes in both tokens' decimals. */
export const ORACLE_PRICE_SCALE = 10n ** 36n
/** LLTV-slope term of the liquidation incentive factor. */
export const LIQUIDATION_CURSOR = 3n * 10n ** 17n
/** Ceiling of the liquidation incentive factor (1.15). */
export const MAX_LIQUIDATION_INCENTIVE_FACTOR = 115n * 10n ** 16n
export const VIRTUAL_SHARES = 10n ** 6n
export const VIRTUAL_ASSETS = 1n

// ---------------------------------------------------------------------------
// Base (chain id 8453) deployments. Each address was checked to hold code on
// Base when this file was written; tests/fork re-checks them against a fork.
// ---------------------------------------------------------------------------

export const BASE_CHAIN_ID = 8453

export const BASE = {
  morpho: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
  uniswapV3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  uniswapV3QuoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  /** OP-stack GasPriceOracle predeploy (L1 data fee). */
  gasPriceOracle: '0x420000000000000000000000000000000000000F',
  weth: '0x4200000000000000000000000000000000000006',
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  cbbtc: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
} as const satisfies Record<string, Address>

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'
