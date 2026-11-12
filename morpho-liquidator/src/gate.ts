// Phase 3 decision gate, computed from the scanner's database. Pure over a
// Store so it can be tested; scripts/gate-report.ts prints it.
//
// The gate is deliberately binary (see RULES.md):
//   at least one realistic candidate in the review window -> PROCEED
//   none                                                   -> KILL
// A realistic candidate is a position that was liquidatable on-chain, passed
// sized economics at an allowed size, carried no blocking oracle flag, and was
// still a candidate `persistenceCycles` evaluations later.

import type { Store } from './db.ts'

export interface GateReport {
  window: {
    firstCycleAt: number | null
    lastCycleAt: number | null
    hours: number
    okCycles: number
    failedCycles: number
    okRatio: number
  }
  funnel: {
    /** Distinct positions seen at or below the research band. */
    positionsInBand: number
    /** Of those, positions that crossed in while the scanner was watching. */
    enteredBandWhileWatching: number
    reachedNear: number
    reachedLiquidatable: number
    crossedIntoLiquidatableWhileWatching: number
    /** Distinct positions that got a sized (non-dust) economic verdict. */
    sizedEvaluations: number
    hypotheticalPasses: number
    /** Liquidatable and profitable at an allowed size at least once. */
    candidates: number
    realisticCandidates: number
  }
  /** Distinct positions by the primary reason of their latest verdict. */
  rejectionReasons: { reason: string; hypothetical: boolean; positions: number }[]
  /** Positions whose economics passed but an oracle flag blocked them. */
  blockedByOracleFlagOnly: number
  /** How liquidatable positions stopped being liquidatable. */
  resolutions: { note: string; count: number }[]
  realistic: { ts: number; marketId: string; borrower: string; repayUsd: number; netProfitUsd: number }[]
  survivalRate: number | null
  candidatesPerDay: number | null
  decision: 'PROCEED' | 'KILL' | 'INSUFFICIENT_DATA'
  decisionReason: string
}

export function computeGate(store: Store, opts: { minWindowHours: number; minOkRatio: number }): GateReport {
  const one = <T>(sql: string, ...p: (string | number)[]) => store.query<T>(sql, ...p)[0]!
  const n = (sql: string, ...p: (string | number)[]) => Number(one<{ n: number }>(sql, ...p).n ?? 0)

  const cycles = one<{ first: number | null; last: number | null; ok: number | null; failed: number | null }>(
    `SELECT MIN(started_at) AS first, MAX(finished_at) AS last,
            SUM(ok) AS ok, SUM(1 - ok) AS failed FROM cycles`,
  )
  const okCycles = Number(cycles.ok ?? 0)
  const failedCycles = Number(cycles.failed ?? 0)
  const hours = cycles.first !== null && cycles.last !== null ? (cycles.last - cycles.first) / 3_600_000 : 0
  const okRatio = okCycles + failedCycles === 0 ? 0 : okCycles / (okCycles + failedCycles)

  const inBand = `('research','near','liquidatable')`
  const funnel = {
    positionsInBand: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM band_events WHERE to_band IN ${inBand})`),
    enteredBandWhileWatching: n(
      `SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM band_events
       WHERE to_band IN ${inBand} AND from_band = 'healthy')`,
    ),
    reachedNear: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM band_events WHERE to_band IN ('near','liquidatable'))`),
    reachedLiquidatable: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM band_events WHERE to_band = 'liquidatable')`),
    crossedIntoLiquidatableWhileWatching: n(
      `SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM band_events
       WHERE to_band = 'liquidatable' AND from_band IS NOT NULL)`,
    ),
    sizedEvaluations: n(
      `SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM evaluations
       WHERE rejection_reason IS NULL OR rejection_reason != 'dust_position')`,
    ),
    hypotheticalPasses: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM evaluations WHERE status = 'hypothetical_pass')`),
    candidates: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM evaluations WHERE status = 'candidate')`),
    realisticCandidates: n(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT market_id, borrower FROM realistic_candidates)`),
  }

  // Latest verdict per position.
  const latest = `SELECT e.* FROM evaluations e
    JOIN (SELECT market_id, borrower, MAX(id) AS id FROM evaluations GROUP BY market_id, borrower) l ON l.id = e.id`
  const rejectionReasons = store
    .query<{ reason: string; hypothetical: number; positions: number }>(
      `SELECT rejection_reason AS reason, hypothetical, COUNT(*) AS positions FROM (${latest})
       WHERE status = 'rejected' GROUP BY rejection_reason, hypothetical ORDER BY positions DESC`,
    )
    .map((r) => ({ reason: r.reason, hypothetical: Boolean(r.hypothetical), positions: Number(r.positions) }))
  const blockedByOracleFlagOnly = n(
    `SELECT COUNT(*) AS n FROM (${latest}) WHERE status = 'rejected'
     AND rejection_reason IN ('svr_auction_gated', 'oracle_unclassified')`,
  )
  const resolutions = store
    .query<{ note: string; count: number }>(
      `SELECT note, COUNT(*) AS count FROM band_events WHERE from_band = 'liquidatable' AND note IS NOT NULL
       GROUP BY note ORDER BY count DESC`,
    )
    .map((r) => ({ note: r.note, count: Number(r.count) }))
  const realistic = store
    .query<{ ts: number; market_id: string; borrower: string; repay_usd: number; net_profit_usd: number }>(
      `SELECT ts, market_id, borrower, repay_usd, net_profit_usd FROM realistic_candidates ORDER BY ts`,
    )
    .map((r) => ({ ts: Number(r.ts), marketId: r.market_id, borrower: r.borrower, repayUsd: r.repay_usd, netProfitUsd: r.net_profit_usd }))

  const survivalRate = funnel.sizedEvaluations === 0 ? null : (funnel.hypotheticalPasses + funnel.candidates) / funnel.sizedEvaluations
  const candidatesPerDay = hours > 0 ? (funnel.realisticCandidates / hours) * 24 : null

  let decision: GateReport['decision']
  let decisionReason: string
  if (funnel.realisticCandidates > 0) {
    decision = 'PROCEED'
    decisionReason = `${funnel.realisticCandidates} realistic candidate(s) survived sized economics: proceed to the Tiny Live Path design (Phase 4).`
  } else if (hours < opts.minWindowHours || okRatio < opts.minOkRatio) {
    decision = 'INSUFFICIENT_DATA'
    decisionReason =
      `No realistic candidate yet, but the window is not valid for a KILL: ${hours.toFixed(1)}h observed ` +
      `(need ${opts.minWindowHours}h) at ${(okRatio * 100).toFixed(1)}% successful cycles (need ${(opts.minOkRatio * 100).toFixed(0)}%).`
  } else {
    decision = 'KILL'
    decisionReason = `Zero realistic candidates in ${hours.toFixed(1)}h of valid observation. Kill the direction; do not keep polishing (see Phase 6 pivots).`
  }

  return {
    window: { firstCycleAt: cycles.first, lastCycleAt: cycles.last, hours, okCycles, failedCycles, okRatio },
    funnel,
    rejectionReasons,
    blockedByOracleFlagOnly,
    resolutions,
    realistic,
    survivalRate,
    candidatesPerDay,
    decision,
    decisionReason,
  }
}
