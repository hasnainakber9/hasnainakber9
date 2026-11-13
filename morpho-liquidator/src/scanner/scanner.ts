// One scan cycle: discover -> read chain at a pinned block -> classify ->
// size the near-threshold positions -> persist -> alert on transitions.
//
// Discovery (which pairs to look at) and evaluation (what is true about them)
// are separate steps with separate failure handling:
//   - discovery failing costs coverage: known positions are still re-read
//     on-chain, and the scanner reports itself degraded once the candidate set
//     is older than `discovery.maxAgeMs`;
//   - a chain read failing fails the whole cycle closed: nothing is written,
//     no band changes, no alerts. Stale truth is never presented as current.

import { formatUnits, type Address, type Hex } from 'viem'

import type { Alerter } from '../alerts/alerts.ts'
import type { Config } from '../config.ts'
import type { Band, PositionRow, Store } from '../db.ts'
import type { EconomicsEngine, Verdict } from '../economics/evaluate.ts'
import { toUnits } from '../economics/pricing.ts'
import type { UsdPricer } from '../economics/venue.ts'
import { newId, type Logger } from '../logger.ts'
import { killSwitchEngaged } from '../risk/limits.ts'
import { systemClock, type Clock } from '../util/resilience.ts'
import type { DiscoveryProvider } from './discovery.ts'
import type { Health } from './health.ts'
import type { MarketRegistry } from './marketRegistry.ts'
import type { PositionSnapshot, StateReader } from './stateReader.ts'

export interface CycleSummary {
  cycleId: string
  block: number
  blockTimestamp: number
  tracked: number
  positionsRead: number
  unreadable: number
  unreadableMarkets: number
  inBand: number
  near: number
  liquidatable: number
  evaluated: number
  /** Evaluations that needed venue quotes this cycle. */
  quoted: number
  /** Due evaluations pushed to a later cycle by the per-cycle bounds. */
  deferred: number
  candidates: number
  realisticCandidates: number
  discoveryAgeMs: number | null
  discoveryStale: boolean
  killSwitch: boolean
  durationMs: number
}

interface Tracked extends PositionRow {
  /** Wall-clock time of the last economics run (not persisted). */
  lastEvalAt: number
  lastVerdict: Verdict['status'] | null
}

const keyOf = (marketId: Hex, borrower: Address) => `${marketId}:${borrower.toLowerCase()}`

/** Band for a reading, with hysteresis so a position cannot flap on a boundary. */
export function classifyBand(
  health: Health,
  previous: Band | null,
  cfg: { nearThresholdHf: bigint; researchBandHf: bigint; bandHysteresisBps: number },
): Band {
  if (!health.hasDebt) return 'closed'
  if (!health.healthy) return 'liquidatable'
  const hf = health.healthFactor
  if (hf === null) return 'healthy'
  const raised = (boundary: bigint) => boundary + (boundary * BigInt(cfg.bandHysteresisBps)) / 10_000n
  const raw: Band = hf <= cfg.nearThresholdHf ? 'near' : hf <= cfg.researchBandHf ? 'research' : 'healthy'
  if (previous === 'near' && raw !== 'near' && hf <= raised(cfg.nearThresholdHf)) return 'near'
  if (previous === 'research' && raw === 'healthy' && hf <= raised(cfg.researchBandHf)) return 'research'
  return raw
}

/** Best guess at why a liquidatable position stopped being liquidatable. */
export function resolutionNote(
  before: { borrowShares: bigint; collateral: bigint },
  after: { borrowShares: bigint; collateral: bigint },
): string {
  const debtDown = after.borrowShares < before.borrowShares
  const collateralDown = after.collateral < before.collateral
  if (debtDown && collateralDown) return 'liquidated_by_other'
  if (debtDown) return 'repaid'
  if (after.collateral > before.collateral) return 'collateral_added'
  return 'price_recovered'
}

const hfString = (hf: bigint | null) => (hf === null ? null : formatUnits(hf, 18))

export class Scanner {
  private readonly watch = new Map<string, Tracked>()
  private lastDiscoveryOkAt: number | null = null
  private lastDiscoveryAttemptAt = 0
  private completedCycles = 0
  private readonly clock: Clock

  constructor(
    private readonly deps: {
      config: Config
      registry: MarketRegistry
      reader: StateReader
      discovery: DiscoveryProvider
      economics: EconomicsEngine
      pricer: UsdPricer
      store: Store
      alerter: Alerter
      logger: Logger
      clock?: Clock
    },
  ) {
    this.clock = deps.clock ?? systemClock
  }

  /** Restores tracked positions and discovery freshness after a restart. */
  init(): void {
    const { scanner } = this.deps.config
    for (const row of this.deps.store.loadPositions()) {
      if (row.band === 'healthy' && row.healthyCycles >= scanner.watchlistGraceCycles) continue
      this.watch.set(keyOf(row.marketId, row.borrower), { ...row, lastEvalAt: 0, lastVerdict: null })
    }
    const saved = this.deps.store.getKv('lastDiscoveryOkAt')
    this.lastDiscoveryOkAt = saved ? Number(saved) : null
    this.deps.logger.info('scanner.restored', {
      tracked: this.watch.size,
      lastDiscoveryOkAt: this.lastDiscoveryOkAt,
    })
  }

  get trackedCount(): number {
    return this.watch.size
  }

  private async discover(now: number): Promise<void> {
    const { discovery, scanner } = this.deps.config
    if (now - this.lastDiscoveryAttemptAt < discovery.intervalMs) return
    this.lastDiscoveryAttemptAt = now
    const marketIds = this.deps.registry.all().map((m) => m.id)
    if (marketIds.length === 0) return
    try {
      // Ask slightly wider than the research band: the API's health factor
      // lags the chain, and over-inclusion is free.
      const healthFactorLte = Number(formatUnits(scanner.researchBandHf, 18)) * 1.02
      const result = await this.deps.discovery.discover({ marketIds, healthFactorLte })
      let added = 0
      for (const pair of result.pairs) {
        const key = keyOf(pair.marketId, pair.borrower)
        if (this.watch.has(key)) continue
        added += 1
        this.watch.set(key, {
          marketId: pair.marketId,
          borrower: pair.borrower,
          band: 'healthy',
          healthFactor: null,
          borrowShares: '0',
          collateral: '0',
          debtAssets: '0',
          debtUsd: null,
          firstSeenAt: 0, // 0 marks "never read on-chain yet"
          lastSeenAt: 0,
          lastBlock: 0,
          healthyCycles: 0,
          candidateStreak: 0,
          lastEvalAt: 0,
          lastVerdict: null,
        })
      }
      // Only a complete walk vouches for coverage.
      if (result.complete) {
        this.lastDiscoveryOkAt = now
        this.deps.store.setKv('lastDiscoveryOkAt', String(now))
      }
      this.deps.logger.info('discovery.ok', {
        provider: this.deps.discovery.name,
        pairs: result.pairs.length,
        added,
        complete: result.complete,
        pages: result.pages,
        malformed: result.malformed,
      })
    } catch (error) {
      this.deps.logger.warn('discovery.failed', { provider: this.deps.discovery.name, error })
    }
  }

  async runCycle(): Promise<CycleSummary> {
    const { config, registry, reader, store, alerter, logger } = this.deps
    const cycleId = newId('cyc')
    const startedAt = this.clock.now()
    const killSwitch = killSwitchEngaged(config.storage.dataDir)

    await registry.load()
    if (registry.all().length === 0) throw new Error('no whitelisted market could be loaded')
    await this.discover(startedAt)

    const discoveryAgeMs = this.lastDiscoveryOkAt === null ? null : startedAt - this.lastDiscoveryOkAt
    const discoveryStale = discoveryAgeMs === null || discoveryAgeMs > config.discovery.maxAgeMs
    if (this.lastDiscoveryOkAt === null && this.watch.size === 0) {
      // Never discovered anything and nothing restored: there is no view of
      // the market at all. That is a failed cycle, not an empty one.
      throw new Error('discovery has never succeeded and no positions are tracked')
    }

    const pairs = [...this.watch.values()]
      .filter((t) => registry.get(t.marketId))
      .map((t) => ({ marketId: t.marketId, borrower: t.borrower }))
    const snapshot = await reader.read(registry.paramsById(), pairs)
    const block = Number(snapshot.blockNumber)
    const now = this.clock.now()

    // Loan-token USD prices, once per market that has positions.
    const loanUsd = new Map<Hex, number | null>()
    for (const marketId of new Set(snapshot.positions.map((p) => p.marketId))) {
      loanUsd.set(marketId, await this.deps.pricer.priceUsd(registry.get(marketId)!.loan))
    }

    type Update = {
      tracked: Tracked
      snapshot: PositionSnapshot
      previousBand: Band | null
      band: Band
      debtUsd: number | null
      note?: string
    }
    const updates: Update[] = []
    for (const position of snapshot.positions) {
      const tracked = this.watch.get(keyOf(position.marketId, position.borrower))!
      const previousBand = tracked.firstSeenAt === 0 ? null : tracked.band
      const band = classifyBand(position.health, previousBand, config.scanner)
      const price = loanUsd.get(position.marketId) ?? null
      const market = registry.get(position.marketId)!
      const debtUsd = price === null ? null : toUnits(position.health.borrowed, market.loan.decimals) * price
      const note =
        previousBand === 'liquidatable' && band !== 'liquidatable'
          ? resolutionNote(
              { borrowShares: BigInt(tracked.borrowShares), collateral: BigInt(tracked.collateral) },
              position,
            )
          : undefined
      updates.push({ tracked, snapshot: position, previousBand, band, debtUsd, note })
    }

    // Economics for near-threshold and liquidatable positions. Dust is settled
    // without touching the venue. Everything else costs quoter calls, so it is
    // bounded per cycle by a count and a time budget; what does not fit waits
    // for the next cycle. Order: liquidatable first, then longest-unevaluated,
    // then lowest health factor.
    const isDust = (u: Update) => u.debtUsd !== null && u.debtUsd < config.scanner.minDebtUsd
    const bandRank = (u: Update) => (u.band === 'liquidatable' ? 0 : 1)
    const due = updates
      .filter((u) => u.band === 'near' || u.band === 'liquidatable')
      .filter(
        (u) =>
          u.previousBand !== u.band ||
          u.tracked.lastVerdict === 'candidate' ||
          // A liquidatable position is re-quoted often; a merely near one is a
          // hypothetical and can wait longer between quotes.
          now - u.tracked.lastEvalAt >=
            (u.band === 'liquidatable' ? config.economics.quoteTtlMs : config.economics.hypotheticalTtlMs),
      )
      .sort(
        (a, b) =>
          bandRank(a) - bandRank(b) ||
          a.tracked.lastEvalAt - b.tracked.lastEvalAt ||
          Number((a.snapshot.health.healthFactor ?? 0n) - (b.snapshot.health.healthFactor ?? 0n)),
      )

    const verdicts = new Map<Update, Verdict>()
    let quoted = 0
    let deferred = 0
    for (const update of due) {
      const dust = isDust(update)
      if (
        !dust &&
        (quoted >= config.economics.maxQuotedPerCycle ||
          this.clock.now() - startedAt > config.economics.cycleBudgetMs)
      ) {
        deferred += 1
        continue
      }
      if (!dust) quoted += 1
      const market = registry.get(update.snapshot.marketId)!
      const marketSnapshot = snapshot.markets.get(update.snapshot.marketId)!
      const verdict = await this.deps.economics.evaluate({
        market,
        liquidatableNow: update.band === 'liquidatable',
        health: {
          borrowShares: update.snapshot.borrowShares,
          collateral: update.snapshot.collateral,
          totalBorrowAssets: marketSnapshot.totalBorrowAssets,
          totalBorrowShares: marketSnapshot.state.totalBorrowShares,
          price: marketSnapshot.price,
          lltv: market.params.lltv,
        },
      })
      verdicts.set(update, verdict)
    }

    // Persist the whole cycle atomically, then alert.
    const pendingAlerts: Parameters<Alerter['emit']>[0][] = []
    let realisticCandidates = 0
    const firstCycle = this.completedCycles === 0
    store.transaction(() => {
      for (const update of updates) {
        const { tracked, snapshot: pos, previousBand, band, debtUsd } = update
        const market = registry.get(pos.marketId)!
        const pair = `${market.collateral.symbol}/${market.loan.symbol}`
        const hf = hfString(pos.health.healthFactor)
        const verdict = verdicts.get(update)

        // A pair the API over-included that reads healthy (or already closed) on
        // first sight never entered a band: no event.
        const neverInBand = previousBand === null && (band === 'healthy' || band === 'closed')
        if (previousBand !== band && !neverInBand) {
          store.recordBandEvent({
            ts: now,
            cycleId,
            marketId: pos.marketId,
            borrower: pos.borrower,
            fromBand: previousBand,
            toBand: band,
            healthFactor: hf,
            debtUsd,
            block,
            note: update.note,
          })
          const material = debtUsd === null || debtUsd >= config.scanner.minDebtUsd
          // A position already liquidatable when first seen at startup is
          // backlog, not an event; it is logged in the cycle summary instead.
          if (band === 'liquidatable' && material && !(firstCycle && previousBand === null)) {
            pendingAlerts.push({
              kind: 'position_liquidatable',
              key: `liquidatable:${pos.marketId}:${pos.borrower}`,
              severity: 'warning',
              title: `${pair} position became liquidatable (HF ${hf}, debt $${debtUsd?.toFixed(0) ?? '?'})`,
              payload: { marketId: pos.marketId, borrower: pos.borrower, pair, healthFactor: hf, debtUsd, block },
            })
          }
          if (previousBand === 'liquidatable' && tracked.candidateStreak > 0) {
            pendingAlerts.push({
              kind: 'position_resolved',
              key: `resolved:${pos.marketId}:${pos.borrower}`,
              severity: 'info',
              title: `${pair} candidate resolved: ${update.note}`,
              payload: { marketId: pos.marketId, borrower: pos.borrower, pair, resolution: update.note, block },
            })
          }
        }

        let candidateStreak = band === 'liquidatable' ? tracked.candidateStreak : 0
        if (verdict) {
          candidateStreak = verdict.status === 'candidate' ? tracked.candidateStreak + 1 : 0
          store.recordEvaluation({
            ts: now,
            cycleId,
            marketId: pos.marketId,
            borrower: pos.borrower,
            block,
            healthFactor: hf,
            hypothetical: verdict.hypothetical,
            status: verdict.status,
            reason: verdict.reason,
            reasons: verdict.reasons,
            debtUsd: verdict.debtUsd,
            bestLabel: verdict.best?.label ?? null,
            bestRepayUsd: verdict.best?.repayUsd ?? null,
            bestNetProfitUsd: verdict.best?.netProfitUsd ?? null,
            detail: { pair, lifBps: verdict.lifBps, oracleFlag: verdict.oracleFlag, sizes: verdict.sizes },
          })
          tracked.lastEvalAt = now
          tracked.lastVerdict = verdict.status
          // "Realistic" = liquidatable, profitable at an allowed size, and
          // still there N evaluations later (not instantly taken).
          if (verdict.status === 'candidate' && candidateStreak === config.economics.persistenceCycles && verdict.best) {
            realisticCandidates += 1
            store.recordRealisticCandidate({
              ts: now,
              cycleId,
              marketId: pos.marketId,
              borrower: pos.borrower,
              block,
              repayUsd: verdict.best.repayUsd,
              netProfitUsd: verdict.best.netProfitUsd ?? 0,
              streak: candidateStreak,
              detail: { pair, best: verdict.best },
            })
            if (!killSwitch) {
              pendingAlerts.push({
                kind: 'realistic_candidate',
                key: `candidate:${pos.marketId}:${pos.borrower}`,
                severity: 'critical',
                title: `Realistic candidate: ${pair}, repay $${verdict.best.repayUsd.toFixed(0)}, est. net $${(verdict.best.netProfitUsd ?? 0).toFixed(2)} (manual review only)`,
                payload: {
                  marketId: pos.marketId,
                  borrower: pos.borrower,
                  pair,
                  healthFactor: hf,
                  repayUsd: verdict.best.repayUsd,
                  netProfitUsd: verdict.best.netProfitUsd,
                  dexVsOracleBps: verdict.best.dexVsOracleBps,
                  block,
                  liveExecution: 'disabled',
                },
              })
            }
          }
        }

        Object.assign(tracked, {
          band,
          healthFactor: hf,
          borrowShares: pos.borrowShares.toString(),
          collateral: pos.collateral.toString(),
          debtAssets: pos.health.borrowed.toString(),
          debtUsd,
          firstSeenAt: tracked.firstSeenAt === 0 ? now : tracked.firstSeenAt,
          lastSeenAt: now,
          lastBlock: block,
          healthyCycles: band === 'healthy' ? tracked.healthyCycles + 1 : 0,
          candidateStreak,
        } satisfies Partial<Tracked>)
        store.upsertPosition(tracked)
      }
    })

    // Drop positions that closed or have stayed healthy past the grace period.
    for (const [key, tracked] of this.watch) {
      if (tracked.firstSeenAt === 0) continue
      if (tracked.band === 'closed' || tracked.healthyCycles >= config.scanner.watchlistGraceCycles) {
        this.watch.delete(key)
      }
    }

    for (const alert of pendingAlerts) await alerter.emit(alert)

    const count = (band: Band) => updates.filter((u) => u.band === band).length
    const candidates = [...verdicts.values()].filter((v) => v.status === 'candidate').length
    const summary: CycleSummary = {
      cycleId,
      block,
      blockTimestamp: Number(snapshot.blockTimestamp),
      tracked: this.watch.size,
      positionsRead: snapshot.positions.length,
      unreadable: snapshot.unreadablePositions.length,
      unreadableMarkets: snapshot.unreadableMarkets.size,
      inBand: count('research') + count('near') + count('liquidatable'),
      near: count('near'),
      liquidatable: count('liquidatable'),
      evaluated: verdicts.size,
      quoted,
      deferred,
      candidates,
      realisticCandidates,
      discoveryAgeMs,
      discoveryStale,
      killSwitch,
      durationMs: this.clock.now() - startedAt,
    }
    store.recordCycle({
      id: cycleId,
      startedAt,
      finishedAt: this.clock.now(),
      ok: true,
      block,
      positionsRead: summary.positionsRead,
      unreadable: summary.unreadable,
      inBand: summary.inBand,
      near: summary.near,
      liquidatable: summary.liquidatable,
      evaluated: summary.evaluated,
      candidates: summary.candidates,
      error: null,
    })
    if (snapshot.unreadableMarkets.size > 0) {
      logger.warn('cycle.unreadable_markets', {
        cycleId,
        markets: Object.fromEntries(snapshot.unreadableMarkets),
        positionsSkipped: snapshot.unreadablePositions.length,
      })
    }
    if (firstCycle && summary.liquidatable > 0) {
      logger.info('cycle.initial_backlog', { cycleId, liquidatableAtStartup: summary.liquidatable })
    }
    logger.info('cycle.ok', { ...summary })
    this.completedCycles += 1
    return summary
  }
}
