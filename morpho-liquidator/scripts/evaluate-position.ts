// Evaluate positions on demand, with the same code path as the scanner:
// pinned on-chain read -> health -> sized economics -> verdict.
//
//   pnpm evaluate --market 0x<id> --borrower 0x<address>
//   pnpm evaluate --top 10            the 10 lowest-health non-dust positions
//   pnpm evaluate --top 10 --json
//
// Read-only and stateless: it does not touch the scanner's database or lock,
// so it can run while the scanner is running.

import { formatUnits, getAddress, type Address, type Hex } from 'viem'

import { buildApp } from '../src/app.ts'
import { loadConfig } from '../src/config.ts'
import type { Verdict } from '../src/economics/evaluate.ts'
import { toUnits } from '../src/economics/pricing.ts'
import { createLogger } from '../src/logger.ts'
import { priceDropToLiquidation } from '../src/scanner/health.ts'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const asJson = process.argv.includes('--json')
const top = arg('--top') ? Number(arg('--top')) : undefined
const marketArg = arg('--market')?.toLowerCase() as Hex | undefined
const borrowerArg = arg('--borrower')

if (!top && !(marketArg && borrowerArg)) {
  console.error('usage: pnpm evaluate --market 0x<id> --borrower 0x<address>\n       pnpm evaluate --top <n> [--json]')
  process.exit(2)
}

const config = loadConfig()
const logger = createLogger({ level: 'warn', write: (line) => process.stderr.write(line + '\n') })
const app = buildApp(config, logger, { dbPath: ':memory:' })

await app.registry.load()

let pairs: { marketId: Hex; borrower: Address }[]
if (marketArg && borrowerArg) {
  if (!app.registry.get(marketArg)) {
    console.error(`market ${marketArg} is not in the whitelist (config/markets.base.json) or could not be loaded`)
    process.exit(2)
  }
  pairs = [{ marketId: marketArg, borrower: getAddress(borrowerArg) }]
} else {
  const found = await app.discovery.discover({
    marketIds: app.registry.all().map((m) => m.id),
    healthFactorLte: Number(formatUnits(config.scanner.researchBandHf, 18)),
  })
  pairs = found.pairs
}

const snapshot = await app.reader.read(app.registry.paramsById(), pairs)
type Row = {
  market: string
  marketId: Hex
  borrower: Address
  block: number
  healthFactor: string | null
  liquidatable: boolean
  priceDropToLiquidationPct: number | null
  debtUsd: number | null
  verdict: Verdict
}

// Rank by health, drop dust, keep the worst N.
const ranked = []
for (const position of snapshot.positions) {
  const info = app.registry.get(position.marketId)!
  const price = await app.pricer.priceUsd(info.loan)
  const debtUsd = price === null ? null : toUnits(position.health.borrowed, info.loan.decimals) * price
  if (!position.health.hasDebt) continue
  if (top && debtUsd !== null && debtUsd < config.scanner.minDebtUsd) continue
  ranked.push({ position, info, debtUsd })
}
ranked.sort((a, b) => Number((a.position.health.healthFactor ?? 0n) - (b.position.health.healthFactor ?? 0n)))

const rows: Row[] = []
for (const { position, info, debtUsd } of ranked.slice(0, top ?? 1)) {
  const market = snapshot.markets.get(position.marketId)!
  const liquidatable = position.health.hasDebt && !position.health.healthy
  const verdict = await app.economics.evaluate({
    market: info,
    liquidatableNow: liquidatable,
    health: {
      borrowShares: position.borrowShares,
      collateral: position.collateral,
      totalBorrowAssets: market.totalBorrowAssets,
      totalBorrowShares: market.state.totalBorrowShares,
      price: market.price,
      lltv: info.params.lltv,
    },
  })
  const hf = position.health.healthFactor
  rows.push({
    market: `${info.collateral.symbol}/${info.loan.symbol}`,
    marketId: position.marketId,
    borrower: position.borrower,
    block: Number(snapshot.blockNumber),
    healthFactor: hf === null ? null : formatUnits(hf, 18),
    liquidatable,
    priceDropToLiquidationPct: hf === null ? null : Number(formatUnits(priceDropToLiquidation(hf), 16)),
    debtUsd,
    verdict,
  })
}
app.store.close()

if (asJson) {
  console.log(JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
  process.exit(0)
}

const money = (x: number | null, digits = 2) => (x === null ? '    -' : `$${x.toFixed(digits)}`)
for (const row of rows) {
  const v = row.verdict
  console.log(
    [
      '',
      `${row.market}  ${row.borrower}  (market ${row.marketId.slice(0, 10)}…, block ${row.block})`,
      `  health factor ${row.healthFactor?.slice(0, 8) ?? '-'}  ` +
        (row.liquidatable
          ? 'LIQUIDATABLE NOW'
          : `healthy; liquidatable after a ${row.priceDropToLiquidationPct?.toFixed(2)}% collateral price drop`),
      `  debt ${money(row.debtUsd, 0)}   bonus ${(v.lifBps / 100).toFixed(2)}%   oracle flag: ${v.oracleFlag}`,
      `  VERDICT: ${v.status.toUpperCase()}${v.hypothetical ? ' (hypothetical: sized as if it crossed now)' : ''}` +
        (v.reasons.length ? `   reasons: ${v.reasons.join(', ')}` : ''),
    ].join('\n'),
  )
  if (v.sizes.length > 0) {
    console.log('    size      repay     dex-vs-oracle    gross     buffers      gas        net   result')
    for (const s of v.sizes) {
      console.log(
        '    ' +
          [
            s.label.padEnd(7),
            money(s.repayUsd, 0).padStart(8),
            (s.dexVsOracleBps === null ? '-' : `${s.dexVsOracleBps.toFixed(1)} bps`).padStart(15),
            money(s.grossProfitUsd).padStart(9),
            money(s.bufferUsd).padStart(9),
            money(s.gasUsd, 3).padStart(9),
            money(s.netProfitUsd).padStart(10),
            '  ' + (s.pass && s.withinRiskLimit ? 'PASS' : (s.reason ?? '-')),
          ].join(' '),
      )
    }
  }
}
console.log('')
