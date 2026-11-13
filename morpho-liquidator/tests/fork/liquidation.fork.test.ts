// Fork tests: the scanner's off-chain math against the real Morpho Blue
// contracts on a fork of Base.
//
//   pnpm test:fork          (uses BASE_RPC_URL, else the public Base endpoint)
//
// What is proven here:
//   1. every hard-coded Base address holds code;
//   2. the TypeScript interest accrual equals Morpho's own `accrueInterest`,
//      to the wei, for every whitelisted market;
//   3. the scanner's health verdict equals the contract's: `liquidate` reverts
//      with "position is healthy" exactly when the scanner says healthy;
//   4. a seize-exact plan is honoured exactly: Morpho pulls precisely the
//      repay the plan predicted, for a full and a $1,000 partial liquidation;
//   5. a real liquidation transaction built from the plan succeeds;
//   6. the Uniswap v3 venue quotes the seized collateral on live pool state.

import {
  decodeEventLog,
  encodeFunctionData,
  maxUint256,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { erc20Abi, morphoAbi } from '../../src/abis.ts'
import { loadConfig } from '../../src/config.ts'
import { BASE, ORACLE_PRICE_SCALE } from '../../src/constants.ts'
import { EconomicsEngine } from '../../src/economics/evaluate.ts'
import { GasModel, VenueUsdPricer } from '../../src/economics/pricing.ts'
import { UniswapV3Venue } from '../../src/economics/uniswapV3.ts'
import { silentLogger } from '../../src/logger.ts'
import { lifFromLltv, planSeize, type HealthInput } from '../../src/scanner/health.ts'
import { MarketRegistry } from '../../src/scanner/marketRegistry.ts'
import { mulDivDown } from '../../src/scanner/math.ts'
import { StateReader, type MarketParams } from '../../src/scanner/stateReader.ts'
import { startFork, type Fork } from './anvil.ts'

const WETH_USDC = '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda' as Hex

const setupAbi = parseAbi([
  'struct MarketParams { address loanToken; address collateralToken; address oracle; address irm; uint256 lltv; }',
  'function supplyCollateral(MarketParams marketParams, uint256 assets, address onBehalf, bytes data)',
  'function borrow(MarketParams marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) returns (uint256, uint256)',
  'function deposit() payable',
])

const BORROWER: Address = '0x00000000000000000000000000000000b0220e12'
const LIQUIDATOR: Address = '0x000000000000000000000000000000001199da70'

/** Runtime bytecode of an oracle whose `price()` always returns `price`. */
const constantOracle = (price: bigint): Hex =>
  `0x7f${price.toString(16).padStart(64, '0')}60005260206000f3`

let fork: Fork
let reader: StateReader
let params: MarketParams
const config = loadConfig()

async function send(from: Address, to: Address, data: Hex, value = 0n) {
  const hash = await fork.client.sendTransaction({ account: from, to, data, value, chain: fork.client.chain })
  const receipt = await fork.client.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`setup transaction reverted: ${hash}`)
  return receipt
}

/** Wraps ETH, posts it as collateral and borrows `borrowAssets` USDC. */
async function openPosition(who: Address, collateral: bigint, borrowAssets: bigint) {
  await fork.client.impersonateAccount({ address: who })
  await fork.client.setBalance({ address: who, value: collateral + parseEther('1') })
  await send(who, BASE.weth, encodeFunctionData({ abi: setupAbi, functionName: 'deposit' }), collateral)
  await send(who, BASE.weth, encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [BASE.morpho, maxUint256] }))
  await send(
    who,
    BASE.morpho,
    encodeFunctionData({ abi: setupAbi, functionName: 'supplyCollateral', args: [params, collateral, who, '0x'] }),
  )
  await send(
    who,
    BASE.morpho,
    encodeFunctionData({ abi: setupAbi, functionName: 'borrow', args: [params, borrowAssets, 0n, who, who] }),
  )
}

async function readBorrower() {
  const snapshot = await reader.read(new Map([[WETH_USDC, params]]), [{ marketId: WETH_USDC, borrower: BORROWER }])
  const market = snapshot.markets.get(WETH_USDC)!
  const position = snapshot.positions[0]!
  const input: HealthInput = {
    borrowShares: position.borrowShares,
    collateral: position.collateral,
    totalBorrowAssets: market.totalBorrowAssets,
    totalBorrowShares: market.state.totalBorrowShares,
    price: market.price,
    lltv: params.lltv,
  }
  return { snapshot, market, position, input }
}

/** Simulates `liquidate` at a block: returns what Morpho would seize and pull. */
async function simulateLiquidate(seizedAssets: bigint, blockNumber: bigint) {
  const { result } = await fork.client.simulateContract({
    account: LIQUIDATOR,
    address: BASE.morpho,
    abi: morphoAbi,
    functionName: 'liquidate',
    args: [params, BORROWER, seizedAssets, 0n, '0x'],
    blockNumber,
  })
  return { seized: result[0], repaid: result[1] }
}

beforeAll(async () => {
  fork = await startFork()
  reader = new StateReader(fork.client as unknown as PublicClient, {
    morpho: BASE.morpho,
    multicallBatchCalls: 100,
    pinLagBlocks: 0,
    maxBlockAgeSec: 3600,
  })
  const loaded = await reader.readMarketParams([WETH_USDC], await reader.pinnedBlock())
  params = loaded.get(WETH_USDC)!
}, 180_000)

afterAll(async () => {
  await fork?.stop()
})

describe('Base deployments', () => {
  it('every configured address holds code', async () => {
    for (const [name, address] of Object.entries(BASE)) {
      const code = await fork.client.getCode({ address })
      expect(code && code.length > 2, `${name} ${address}`).toBe(true)
    }
    expect(params.loanToken).toBe(BASE.usdc)
    expect(params.collateralToken).toBe(BASE.weth)
  })
})

describe('interest accrual parity', () => {
  it('matches Morpho.accrueInterest to the wei on every whitelisted market', async () => {
    const block = await reader.pinnedBlock()
    const ids = config.markets.map((m) => m.id)
    const loaded = await reader.readMarketParams(ids, block)
    const markets = new Map([...loaded].filter((e): e is [Hex, MarketParams] => e[1] !== null))
    expect(markets.size).toBe(ids.length)

    const snapshot = await reader.read(markets, [], block)
    expect(snapshot.unreadableMarkets.size).toBe(0)

    // One eth_call per market: accrue for real, then read the totals back.
    let compared = 0
    for (const [id, marketParams] of markets) {
      const results = await fork.client.multicall({
        allowFailure: false,
        blockNumber: block,
        batchSize: 1_000_000,
        contracts: [
          { address: BASE.morpho, abi: morphoAbi, functionName: 'accrueInterest', args: [marketParams] },
          { address: BASE.morpho, abi: morphoAbi, functionName: 'market', args: [id] },
        ] as never,
      })
      const onchain = (results as unknown[])[1] as readonly bigint[]
      expect(snapshot.markets.get(id)!.totalBorrowAssets, `market ${id}`).toBe(onchain[2])
      // Accrual never changes borrow shares.
      expect(snapshot.markets.get(id)!.state.totalBorrowShares).toBe(onchain[3])
      compared += 1
    }
    expect(compared).toBe(ids.length)
  }, 300_000)
})

describe('liquidation parity on WETH/USDC', () => {
  const COLLATERAL = parseEther('10')
  let price: bigint

  beforeAll(async () => {
    price = await fork.client.readContract({
      address: params.oracle,
      abi: parseAbi(['function price() view returns (uint256)']),
      functionName: 'price',
    })
    // Borrow to a health factor of ~1.01, just inside the "near" band.
    const capacity = mulDivDown(mulDivDown(COLLATERAL, price, ORACLE_PRICE_SCALE), params.lltv, 10n ** 18n)
    await openPosition(BORROWER, COLLATERAL, (capacity * 100n) / 101n)
    // The liquidator funds itself with USDC from a comfortably safe position.
    await openPosition(LIQUIDATOR, parseEther('40'), capacity)
    await send(
      LIQUIDATOR,
      BASE.usdc,
      encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [BASE.morpho, maxUint256] }),
    )
  }, 240_000)

  it('agrees with the contract that a healthy position cannot be liquidated', async () => {
    const { snapshot, position, input } = await readBorrower()
    expect(position.health.healthy).toBe(true)
    expect(Number(position.health.healthFactor) / 1e18).toBeCloseTo(1.01, 3)
    expect(planSeize(input).reason).toBe('healthy')
    await expect(simulateLiquidate(parseEther('1'), snapshot.blockNumber)).rejects.toThrow(/position is healthy/)
  }, 120_000)

  it('sizes a liquidation exactly as Morpho executes it', async () => {
    // Drop the oracle price 3%: health factor ~0.98.
    await fork.client.setCode({ address: params.oracle, bytecode: constantOracle((price * 97n) / 100n) })
    await fork.client.mine({ blocks: 1 })

    const { snapshot, position, input } = await readBorrower()
    expect(position.health.healthy).toBe(false)
    expect(Number(position.health.healthFactor) / 1e18).toBeCloseTo(0.98, 2)

    // Full liquidation: Morpho pulls exactly the repay the plan predicted.
    const full = planSeize(input).plan!
    expect(full.collateralBound).toBe(false)
    expect(await simulateLiquidate(full.seizedAssets, snapshot.blockNumber)).toEqual({
      seized: full.seizedAssets,
      repaid: full.repaidAssets,
    })

    // $1,000 partial liquidation, the size the risk limit allows.
    const partial = planSeize(input, { maxRepayAssets: 1_000_000_000n }).plan!
    expect(partial.repaidAssets).toBeLessThanOrEqual(1_000_000_010n)
    expect(await simulateLiquidate(partial.seizedAssets, snapshot.blockNumber)).toEqual({
      seized: partial.seizedAssets,
      repaid: partial.repaidAssets,
    })

    // The incentive is what the market's LLTV says it is.
    const seizedValue = mulDivDown(full.seizedAssets, input.price, ORACLE_PRICE_SCALE)
    expect(Number(seizedValue) / Number(full.repaidAssets)).toBeCloseTo(Number(lifFromLltv(params.lltv)) / 1e18, 5)
  }, 120_000)

  it('quotes the seized collateral on Uniswap v3 and finds the trade profitable', async () => {
    // Load market facts from the original oracle's block so its feeds are readable.
    const registry = new MarketRegistry(
      new StateReader(fork.client as unknown as PublicClient, {
        morpho: BASE.morpho,
        multicallBatchCalls: 100,
        pinLagBlocks: 0,
        maxBlockAgeSec: 3600,
      }),
      [{ id: WETH_USDC, label: 'WETH/USDC' }],
      config.svrFeeds,
      silentLogger,
    )
    await registry.load()
    const info = registry.get(WETH_USDC)!
    expect(info.loan).toMatchObject({ symbol: 'USDC', decimals: 6 })
    expect(info.collateral).toMatchObject({ symbol: 'WETH', decimals: 18 })

    const venue = new UniswapV3Venue(fork.client as unknown as PublicClient, {
      factory: BASE.uniswapV3Factory,
      quoter: BASE.uniswapV3QuoterV2,
      // One fee tier, no hubs: every pool the quoter touches has to be pulled
      // through the fork from the upstream RPC, slot by slot.
      feeTiers: [500],
      hubTokens: [],
    })
    const pricer = new VenueUsdPricer(venue, {
      stablecoins: config.economics.stablecoins,
      reference: { address: BASE.usdc, decimals: 6 },
      ttlMs: 60_000,
    })
    const gas = new GasModel(fork.client as unknown as PublicClient, pricer, {
      gasPriceOracle: BASE.gasPriceOracle,
      weth: { address: BASE.weth, decimals: 18 },
      gasUnits: config.economics.gasUnits,
      gasPriceMultiplier: config.economics.gasPriceMultiplier,
      l1TxSizeBytes: config.economics.l1TxSizeBytes,
    })
    const engine = new EconomicsEngine(
      { venue, pricer, gas },
      { ...config.economics, minDebtUsd: config.scanner.minDebtUsd },
      config.risk,
    )

    const { input } = await readBorrower()
    const verdict = await engine.evaluate({ market: info, health: input, liquidatableNow: true })

    // The oracle was cut 3% while the pool still trades at market, so the
    // venue pays ~3% over the oracle value, on top of the 4.4% incentive.
    expect(verdict.economicsPass, `reasons: ${verdict.reasons.join(',')} sizes: ${verdict.sizes.map((s) => `${s.label}:${s.reason}:${s.netProfitUsd}`).join(' ')}`).toBe(true)
    const rung = verdict.sizes.find((s) => s.label === '$1000')!
    expect(rung.route).not.toBeNull()
    expect(rung.dexVsOracleBps!).toBeGreaterThan(200)
    expect(rung.dexVsOracleBps!).toBeLessThan(400)
    expect(rung.netProfitUsd!).toBeGreaterThan(40)
    expect(rung.gasUsd!).toBeGreaterThan(0)
    expect(rung.gasUsd!).toBeLessThan(5)
    // Larger rungs are quoted too, but never count toward a candidate.
    expect(verdict.sizes.filter((s) => !s.withinRiskLimit).every((s) => s.label !== '$1000')).toBe(true)
  }, 180_000)

  it('executes a real liquidation built from the plan', async () => {
    const { input, position } = await readBorrower()
    const plan = planSeize(input).plan!
    const wethBefore = await fork.client.readContract({
      address: BASE.weth,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [LIQUIDATOR],
    })

    const receipt = await send(
      LIQUIDATOR,
      BASE.morpho,
      encodeFunctionData({
        abi: morphoAbi,
        functionName: 'liquidate',
        args: [params, BORROWER, plan.seizedAssets, 0n, '0x'],
      }),
    )
    const log = receipt.logs
      .filter((l) => l.address.toLowerCase() === BASE.morpho.toLowerCase())
      .map((l) => {
        try {
          return decodeEventLog({ abi: morphoAbi, data: l.data, topics: l.topics })
        } catch {
          return null
        }
      })
      .find((e) => e?.eventName === 'Liquidate')!
    const args = log.args as { seizedAssets: bigint; repaidAssets: bigint; repaidShares: bigint; badDebtAssets: bigint }

    expect(args.seizedAssets).toBe(plan.seizedAssets)
    // The transaction lands a block later than the plan was read, so a second
    // or two of extra interest can move the repay by a wei.
    const drift = args.repaidAssets - plan.repaidAssets
    expect(drift >= -2n && drift <= 2n, `repaid drift ${drift}`).toBe(true)
    expect(args.repaidShares).toBeLessThanOrEqual(position.borrowShares)
    expect(args.badDebtAssets).toBe(0n)

    const wethAfter = await fork.client.readContract({
      address: BASE.weth,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [LIQUIDATOR],
    })
    expect(wethAfter - wethBefore).toBe(plan.seizedAssets)

    // The scanner now sees the position as resolved.
    const after = await readBorrower()
    expect(after.position.borrowShares).toBe(position.borrowShares - args.repaidShares)
    expect(after.position.collateral).toBe(position.collateral - plan.seizedAssets)
  }, 180_000)
})
