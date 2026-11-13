import { parseAbi } from 'viem'

export const morphoAbi = parseAbi([
  'struct MarketParams { address loanToken; address collateralToken; address oracle; address irm; uint256 lltv; }',
  'function market(bytes32 id) view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)',
  'function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)',
  'function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)',
  'function accrueInterest(MarketParams marketParams)',
  'function liquidate(MarketParams marketParams, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes data) returns (uint256, uint256)',
  'event Liquidate(bytes32 indexed id, address indexed caller, address indexed borrower, uint256 repaidAssets, uint256 repaidShares, uint256 seizedAssets, uint256 badDebtAssets, uint256 badDebtShares)',
])

export const irmAbi = parseAbi([
  'struct MarketParams { address loanToken; address collateralToken; address oracle; address irm; uint256 lltv; }',
  'struct Market { uint128 totalSupplyAssets; uint128 totalSupplyShares; uint128 totalBorrowAssets; uint128 totalBorrowShares; uint128 lastUpdate; uint128 fee; }',
  'function borrowRateView(MarketParams marketParams, Market market) view returns (uint256)',
])

export const oracleAbi = parseAbi([
  'function price() view returns (uint256)',
  // MorphoChainlinkOracleV2 introspection (absent on other oracle types).
  'function BASE_FEED_1() view returns (address)',
  'function BASE_FEED_2() view returns (address)',
  'function QUOTE_FEED_1() view returns (address)',
  'function QUOTE_FEED_2() view returns (address)',
])

export const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
])

export const multicall3Abi = parseAbi([
  'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
  'function getBlockNumber() view returns (uint256 blockNumber)',
])

export const uniswapV3FactoryAbi = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
])

export const uniswapV3PoolAbi = parseAbi(['function liquidity() view returns (uint128)'])

// QuoterV2 functions are non-view on-chain (they revert internally to return the
// quote). They are only ever called through eth_call here, so they are declared
// `view` to let viem batch them through Multicall3.
export const quoterV2Abi = parseAbi([
  'struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; uint24 fee; uint160 sqrtPriceLimitX96; }',
  'function quoteExactInputSingle(QuoteExactInputSingleParams params) view returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
])

export const gasPriceOracleAbi = parseAbi([
  'function getL1FeeUpperBound(uint256 unsignedTxSize) view returns (uint256)',
])
