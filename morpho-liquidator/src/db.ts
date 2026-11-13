// Persistence (SQLite via node:sqlite, WAL mode). Holds everything the scanner
// must not lose across a restart and everything the Phase 3 decision gate is
// computed from: tracked positions, band transitions, every economic verdict
// with its rejection reason, alerts and per-cycle stats.
//
// Amounts are stored as decimal TEXT: they do not fit in a 64-bit integer.

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import type { Address, Hex } from 'viem'

export type Band = 'liquidatable' | 'near' | 'research' | 'healthy' | 'closed'

export interface PositionRow {
  marketId: Hex
  borrower: Address
  band: Band
  healthFactor: string | null
  borrowShares: string
  collateral: string
  debtAssets: string
  debtUsd: number | null
  firstSeenAt: number
  lastSeenAt: number
  lastBlock: number
  /** Consecutive cycles spent above the research band. */
  healthyCycles: number
  /** Consecutive cycles the position was a candidate. */
  candidateStreak: number
}

export interface EvaluationRecord {
  ts: number
  cycleId: string
  marketId: Hex
  borrower: Address
  block: number
  healthFactor: string | null
  hypothetical: boolean
  status: string
  reason: string | null
  reasons: string[]
  debtUsd: number | null
  bestLabel: string | null
  bestRepayUsd: number | null
  bestNetProfitUsd: number | null
  detail: unknown
}

export interface CycleRecord {
  id: string
  startedAt: number
  finishedAt: number
  ok: boolean
  block: number | null
  positionsRead: number
  unreadable: number
  inBand: number
  near: number
  liquidatable: number
  evaluated: number
  candidates: number
  error: string | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS positions (
  market_id TEXT NOT NULL,
  borrower TEXT NOT NULL,
  band TEXT NOT NULL,
  health_factor TEXT,
  borrow_shares TEXT NOT NULL,
  collateral TEXT NOT NULL,
  debt_assets TEXT NOT NULL,
  debt_usd REAL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_block INTEGER NOT NULL,
  healthy_cycles INTEGER NOT NULL DEFAULT 0,
  candidate_streak INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (market_id, borrower)
);
CREATE TABLE IF NOT EXISTS band_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  cycle_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  borrower TEXT NOT NULL,
  from_band TEXT,
  to_band TEXT NOT NULL,
  health_factor TEXT,
  debt_usd REAL,
  block INTEGER NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS band_events_ts ON band_events (ts);
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_ts INTEGER NOT NULL,
  last_ts INTEGER NOT NULL,
  observations INTEGER NOT NULL DEFAULT 1,
  cycle_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  borrower TEXT NOT NULL,
  block INTEGER NOT NULL,
  health_factor TEXT,
  hypothetical INTEGER NOT NULL,
  status TEXT NOT NULL,
  rejection_reason TEXT,
  reasons TEXT NOT NULL,
  debt_usd REAL,
  best_label TEXT,
  best_repay_usd REAL,
  best_net_profit_usd REAL,
  detail TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS evaluations_position ON evaluations (market_id, borrower, id);
CREATE INDEX IF NOT EXISTS evaluations_ts ON evaluations (first_ts);
CREATE TABLE IF NOT EXISTS realistic_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  cycle_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  borrower TEXT NOT NULL,
  block INTEGER NOT NULL,
  repay_usd REAL NOT NULL,
  net_profit_usd REAL NOT NULL,
  streak INTEGER NOT NULL,
  detail TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT NOT NULL,
  delivered INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS alerts_key ON alerts (key, ts);
CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  block INTEGER,
  positions_read INTEGER NOT NULL,
  unreadable INTEGER NOT NULL,
  in_band INTEGER NOT NULL,
  near INTEGER NOT NULL,
  liquidatable INTEGER NOT NULL,
  evaluated INTEGER NOT NULL,
  candidates INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS cycles_started ON cycles (started_at);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))

export class Store {
  private readonly db: DatabaseSync

  constructor(path: string, opts: { readOnly?: boolean } = {}) {
    if (opts.readOnly) {
      // For reports run beside a live scanner: never creates or alters anything.
      this.db = new DatabaseSync(path, { readOnly: true })
      return
    }
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;')
    this.db.exec(SCHEMA)
  }

  close(): void {
    this.db.close()
  }

  /** Runs `fn` atomically: a cycle's writes land together or not at all. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  // --- positions -----------------------------------------------------------

  loadPositions(): PositionRow[] {
    const rows = this.db.prepare(`SELECT * FROM positions WHERE band != 'closed'`).all() as Record<string, unknown>[]
    return rows.map((r) => ({
      marketId: r.market_id as Hex,
      borrower: r.borrower as Address,
      band: r.band as Band,
      healthFactor: (r.health_factor as string | null) ?? null,
      borrowShares: r.borrow_shares as string,
      collateral: r.collateral as string,
      debtAssets: r.debt_assets as string,
      debtUsd: (r.debt_usd as number | null) ?? null,
      firstSeenAt: Number(r.first_seen_at),
      lastSeenAt: Number(r.last_seen_at),
      lastBlock: Number(r.last_block),
      healthyCycles: Number(r.healthy_cycles),
      candidateStreak: Number(r.candidate_streak),
    }))
  }

  upsertPosition(p: PositionRow): void {
    this.db
      .prepare(
        `INSERT INTO positions (market_id, borrower, band, health_factor, borrow_shares, collateral,
           debt_assets, debt_usd, first_seen_at, last_seen_at, last_block, healthy_cycles, candidate_streak)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (market_id, borrower) DO UPDATE SET
           band = excluded.band, health_factor = excluded.health_factor,
           borrow_shares = excluded.borrow_shares, collateral = excluded.collateral,
           debt_assets = excluded.debt_assets, debt_usd = excluded.debt_usd,
           last_seen_at = excluded.last_seen_at, last_block = excluded.last_block,
           healthy_cycles = excluded.healthy_cycles, candidate_streak = excluded.candidate_streak`,
      )
      .run(
        p.marketId,
        p.borrower,
        p.band,
        p.healthFactor,
        p.borrowShares,
        p.collateral,
        p.debtAssets,
        p.debtUsd,
        p.firstSeenAt,
        p.lastSeenAt,
        p.lastBlock,
        p.healthyCycles,
        p.candidateStreak,
      )
  }

  // --- events and verdicts -------------------------------------------------

  recordBandEvent(e: {
    ts: number
    cycleId: string
    marketId: Hex
    borrower: Address
    fromBand: Band | null
    toBand: Band
    healthFactor: string | null
    debtUsd: number | null
    block: number
    note?: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO band_events (ts, cycle_id, market_id, borrower, from_band, to_band, health_factor, debt_usd, block, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(e.ts, e.cycleId, e.marketId, e.borrower, e.fromBand, e.toBand, e.healthFactor, e.debtUsd, e.block, e.note ?? null)
  }

  /**
   * Records a verdict. Consecutive identical verdicts for a position (same
   * status, reason and hypothetical flag) extend the previous row instead of
   * adding one, so a position parked at "unprofitable" does not flood the table.
   * Returns true when this opened a new row.
   */
  recordEvaluation(e: EvaluationRecord): boolean {
    const last = this.db
      .prepare(
        `SELECT id, status, rejection_reason, hypothetical FROM evaluations
         WHERE market_id = ? AND borrower = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(e.marketId, e.borrower) as
      | { id: number; status: string; rejection_reason: string | null; hypothetical: number }
      | undefined
    const unchanged =
      last !== undefined &&
      last.status === e.status &&
      (last.rejection_reason ?? null) === e.reason &&
      Boolean(last.hypothetical) === e.hypothetical
    if (unchanged) {
      this.db
        .prepare(
          `UPDATE evaluations SET last_ts = ?, observations = observations + 1, cycle_id = ?, block = ?,
             health_factor = ?, reasons = ?, debt_usd = ?, best_label = ?, best_repay_usd = ?,
             best_net_profit_usd = ?, detail = ? WHERE id = ?`,
        )
        .run(
          e.ts,
          e.cycleId,
          e.block,
          e.healthFactor,
          json(e.reasons),
          e.debtUsd,
          e.bestLabel,
          e.bestRepayUsd,
          e.bestNetProfitUsd,
          json(e.detail),
          last.id,
        )
      return false
    }
    this.db
      .prepare(
        `INSERT INTO evaluations (first_ts, last_ts, cycle_id, market_id, borrower, block, health_factor,
           hypothetical, status, rejection_reason, reasons, debt_usd, best_label, best_repay_usd,
           best_net_profit_usd, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.ts,
        e.ts,
        e.cycleId,
        e.marketId,
        e.borrower,
        e.block,
        e.healthFactor,
        e.hypothetical ? 1 : 0,
        e.status,
        e.reason,
        json(e.reasons),
        e.debtUsd,
        e.bestLabel,
        e.bestRepayUsd,
        e.bestNetProfitUsd,
        json(e.detail),
      )
    return true
  }

  recordRealisticCandidate(c: {
    ts: number
    cycleId: string
    marketId: Hex
    borrower: Address
    block: number
    repayUsd: number
    netProfitUsd: number
    streak: number
    detail: unknown
  }): void {
    this.db
      .prepare(
        `INSERT INTO realistic_candidates (ts, cycle_id, market_id, borrower, block, repay_usd, net_profit_usd, streak, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(c.ts, c.cycleId, c.marketId, c.borrower, c.block, c.repayUsd, c.netProfitUsd, c.streak, json(c.detail))
  }

  recordAlert(a: { ts: number; kind: string; key: string; severity: string; payload: unknown; delivered: boolean }): void {
    this.db
      .prepare(`INSERT INTO alerts (ts, kind, key, severity, payload, delivered) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(a.ts, a.kind, a.key, a.severity, json(a.payload), a.delivered ? 1 : 0)
  }

  lastAlertAt(key: string): number | null {
    const row = this.db.prepare(`SELECT MAX(ts) AS ts FROM alerts WHERE key = ?`).get(key) as
      | { ts: number | null }
      | undefined
    return row?.ts ?? null
  }

  recordCycle(c: CycleRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO cycles (id, started_at, finished_at, ok, block, positions_read, unreadable,
           in_band, near, liquidatable, evaluated, candidates, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        c.id,
        c.startedAt,
        c.finishedAt,
        c.ok ? 1 : 0,
        c.block,
        c.positionsRead,
        c.unreadable,
        c.inBand,
        c.near,
        c.liquidatable,
        c.evaluated,
        c.candidates,
        c.error,
      )
  }

  /** Keeps the cycles table bounded; everything else is event-sized already. */
  pruneCycles(olderThanTs: number): void {
    this.db.prepare(`DELETE FROM cycles WHERE started_at < ?`).run(olderThanTs)
  }

  // --- kv ------------------------------------------------------------------

  getKv(key: string): string | null {
    const row = this.db.prepare(`SELECT value FROM kv WHERE key = ?`).get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setKv(key: string, value: string): void {
    this.db
      .prepare(`INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`)
      .run(key, value)
  }

  // --- reporting -----------------------------------------------------------

  query<T = Record<string, unknown>>(sql: string, ...params: (string | number | null)[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }
}
