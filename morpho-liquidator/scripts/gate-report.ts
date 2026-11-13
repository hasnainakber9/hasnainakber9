// Phase 3 decision gate report. Safe to run beside a live scanner (read-only).
//
//   pnpm gate            human-readable report
//   pnpm gate --json     machine-readable
//
// Exit code: 0 = PROCEED, 10 = KILL, 11 = INSUFFICIENT_DATA.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { formatUnits } from 'viem'

import { loadConfig } from '../src/config.ts'
import { Store } from '../src/db.ts'
import { computeGate } from '../src/gate.ts'
import { GATE_RULES } from '../src/risk/limits.ts'

const config = loadConfig()
const path = join(config.storage.dataDir, 'scanner.sqlite')
if (!existsSync(path)) {
  console.error(`no scanner database at ${path}; run the scanner first (pnpm scan)`)
  process.exit(1)
}
const store = new Store(path, { readOnly: true })
const report = computeGate(store, GATE_RULES)
store.close()

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const { window: w, funnel: f } = report
  const date = (ts: number | null) => (ts ? new Date(ts).toISOString() : '-')
  const pct = (x: number | null) => (x === null ? '-' : `${(x * 100).toFixed(1)}%`)
  const lines = [
    'PHASE 3 DECISION GATE',
    '=====================',
    `Window            ${date(w.firstCycleAt)} -> ${date(w.lastCycleAt)}  (${w.hours.toFixed(2)} h)`,
    `Cycles            ${w.okCycles} ok, ${w.failedCycles} failed (${pct(w.okRatio)} ok)`,
    `Coverage          ${pct(w.coverageRatio)}  (${w.blindHours.toFixed(2)} h blind across ${w.gaps} gap(s) over ${GATE_RULES.maxGapMs / 60_000} min)`,
    '',
    'Funnel (distinct positions)',
    `  seen in research band (HF <= ${formatUnits(config.scanner.researchBandHf, 18)})     ${f.positionsInBand}`,
    `    ...entered it while watching              ${f.enteredBandWhileWatching}`,
    `  reached near threshold                      ${f.reachedNear}`,
    `  reached liquidatable                        ${f.reachedLiquidatable}`,
    `    ...crossed while watching                 ${f.crossedIntoLiquidatableWhileWatching}`,
    `  sized economic verdicts (non-dust)          ${f.sizedEvaluations}`,
    `  hypothetical passes (healthy, would pay)    ${f.hypotheticalPasses}`,
    `  candidates (liquidatable and pays)          ${f.candidates}`,
    `  REALISTIC candidates (persisted)            ${f.realisticCandidates}`,
    '',
    `Survival after sized economics   ${pct(report.survivalRate)}`,
    `Realistic candidates per day     ${report.candidatesPerDay === null ? '-' : report.candidatesPerDay.toFixed(2)}`,
    `Blocked only by an oracle flag   ${report.blockedByOracleFlagOnly}`,
    '',
    'Latest rejection reason per position',
    ...report.rejectionReasons.map(
      (r) => `  ${r.reason.padEnd(28)} ${String(r.positions).padStart(6)}  ${r.hypothetical ? '(hypothetical)' : '(liquidatable)'}`,
    ),
    '',
    'How liquidatable positions resolved',
    ...(report.resolutions.length ? report.resolutions.map((r) => `  ${r.note.padEnd(28)} ${String(r.count).padStart(6)}`) : ['  (none observed)']),
    '',
    ...(report.realistic.length
      ? ['Realistic candidates', ...report.realistic.map((c) => `  ${date(c.ts)}  ${c.marketId.slice(0, 10)}  ${c.borrower}  repay $${c.repayUsd.toFixed(0)}  net $${c.netProfitUsd.toFixed(2)}`), '']
      : []),
    `DECISION: ${report.decision}`,
    report.decisionReason,
  ]
  console.log(lines.join('\n'))
}
process.exit(report.decision === 'PROCEED' ? 0 : report.decision === 'KILL' ? 10 : 11)
