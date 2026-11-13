import { describe, expect, it } from 'vitest'

import { Store } from '../../src/db.ts'
import { computeGate } from '../../src/gate.ts'

const M = `0x${'11'.repeat(32)}` as const
const user = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as const
const HOUR = 3_600_000
// Seeded cycles are 10 minutes apart, so allow gaps up to 15.
const rules = { minWindowHours: 168, minOkRatio: 0.9, minCoverageRatio: 0.9, maxGapMs: 15 * 60_000 }

function seed(opts: { hours: number; failedEvery?: number; realistic?: boolean; outageHours?: [number, number] }) {
  const store = new Store(':memory:')
  const cycles = Math.max(2, Math.floor(opts.hours * 6)) // one every 10 minutes
  for (let i = 0; i < cycles; i += 1) {
    const ok = !(opts.failedEvery && i % opts.failedEvery === 0)
    const startedAt = Math.round((i * opts.hours * HOUR) / (cycles - 1))
    // An outage: the scanner was not running at all in this stretch.
    if (opts.outageHours && startedAt > opts.outageHours[0] * HOUR && startedAt < opts.outageHours[1] * HOUR) continue
    store.recordCycle({
      id: `c${i}`, startedAt, finishedAt: startedAt + 1, ok, block: ok ? i : null,
      positionsRead: 3, unreadable: 0, inBand: 3, near: 2, liquidatable: 1, evaluated: 2, candidates: 0,
      error: ok ? null : 'rpc',
    })
  }
  const event = (n: number, from: string | null, to: string, note?: string) =>
    store.recordBandEvent({
      ts: n, cycleId: 'c1', marketId: M, borrower: user(n), fromBand: from as never, toBand: to as never,
      healthFactor: '1.0', debtUsd: 500, block: 1, note,
    })
  event(1, null, 'research')
  event(2, 'healthy', 'near')
  event(3, 'near', 'liquidatable')
  store.recordBandEvent({
    ts: 9, cycleId: 'c2', marketId: M, borrower: user(3), fromBand: 'liquidatable', toBand: 'healthy',
    healthFactor: '1.2', debtUsd: 100, block: 2, note: 'liquidated_by_other',
  })
  const evaluation = (n: number, status: string, reason: string | null, hypothetical: boolean) =>
    store.recordEvaluation({
      ts: n, cycleId: 'c1', marketId: M, borrower: user(n), block: 1, healthFactor: '1.0', hypothetical,
      status, reason, reasons: reason ? [reason] : [], debtUsd: 500, bestLabel: null, bestRepayUsd: null,
      bestNetProfitUsd: null, detail: {},
    })
  evaluation(1, 'rejected', 'dust_position', true)
  evaluation(2, 'hypothetical_pass', null, true)
  evaluation(3, 'rejected', 'unprofitable_after_buffers', false)
  evaluation(4, 'rejected', 'svr_auction_gated', false)
  if (opts.realistic) {
    evaluation(5, 'candidate', null, false)
    store.recordRealisticCandidate({
      ts: 5, cycleId: 'c1', marketId: M, borrower: user(5), block: 1, repayUsd: 900, netProfitUsd: 12.5, streak: 2, detail: {},
    })
  }
  return store
}

describe('Phase 3 gate', () => {
  it('counts the funnel in distinct positions and ignores dust in the survival rate', () => {
    const report = computeGate(seed({ hours: 200 }), rules)
    expect(report.funnel).toMatchObject({
      positionsInBand: 3,
      enteredBandWhileWatching: 1,
      reachedNear: 2,
      reachedLiquidatable: 1,
      crossedIntoLiquidatableWhileWatching: 1,
      sizedEvaluations: 3,
      hypotheticalPasses: 1,
      candidates: 0,
      realisticCandidates: 0,
    })
    expect(report.survivalRate).toBeCloseTo(1 / 3)
    expect(report.blockedByOracleFlagOnly).toBe(1)
    expect(report.resolutions).toEqual([{ note: 'liquidated_by_other', count: 1 }])
    expect(report.rejectionReasons.map((r) => r.reason).sort()).toEqual([
      'dust_position',
      'svr_auction_gated',
      'unprofitable_after_buffers',
    ])
  })

  it('kills after a full valid window with no realistic candidate', () => {
    const report = computeGate(seed({ hours: 200 }), rules)
    expect(report.decision).toBe('KILL')
    expect(report.window.hours).toBeCloseTo(200, 0)
  })

  it('refuses to kill on a short window', () => {
    const report = computeGate(seed({ hours: 12 }), rules)
    expect(report.decision).toBe('INSUFFICIENT_DATA')
    expect(report.window.complete).toBe(false)
  })

  it('refuses to kill when the scanner was blind too often', () => {
    const report = computeGate(seed({ hours: 200, failedEvery: 4 }), rules)
    expect(report.window.okRatio).toBeLessThan(0.9)
    expect(report.decision).toBe('INSUFFICIENT_DATA')
  })

  it('refuses to kill when the scanner was not running for much of the window', () => {
    // 200 hours on the clock, but down from hour 50 to hour 90: 80% coverage.
    const report = computeGate(seed({ hours: 200, outageHours: [50, 90] }), rules)
    expect(report.window.okRatio).toBe(1)
    expect(report.window.gaps).toBe(1)
    expect(report.window.blindHours).toBeCloseTo(40, 0)
    expect(report.window.coverageRatio).toBeCloseTo(0.8, 2)
    expect(report.decision).toBe('INSUFFICIENT_DATA')
  })

  it('does not count ordinary pauses between cycles as blind time', () => {
    const report = computeGate(seed({ hours: 200 }), rules)
    expect(report.window).toMatchObject({ gaps: 0, blindHours: 0, coverageRatio: 1, complete: true })
  })

  it('proceeds on a single realistic candidate, however short the window', () => {
    const report = computeGate(seed({ hours: 2, realistic: true }), rules)
    expect(report.decision).toBe('PROCEED')
    expect(report.realistic).toEqual([expect.objectContaining({ repayUsd: 900, netProfitUsd: 12.5 })])
    expect(report.candidatesPerDay).toBeCloseTo(12, 0)
  })
})
