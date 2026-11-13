// The locked rules of the first cycle (see RULES.md), enforced in code.
//
// Configuration may be STRICTER than these but never looser: a config file that
// raises a limit, changes chain, or switches on live execution is rejected at
// startup. There is deliberately no execution code in this cycle: no signer is
// loaded and nothing here can broadcast a transaction.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const LOCKED_RULES = {
  chainId: 8453,
  maxRiskPerTradeUsd: 1_000,
  lossLimitUsd: 2_000,
  manualApprovalRequired: true,
  maxLiveTrades: 1,
  /** Phase 4 is not built. Live execution cannot be enabled in this cycle. */
  liveExecutionAllowedInThisCycle: false,
} as const

/**
 * Validity conditions for a KILL at the Phase 3 gate. A PROCEED needs only one
 * realistic candidate; a KILL needs the scanner to have actually been watching.
 */
export const GATE_RULES = {
  /** Review window: 7 days of observation. */
  minWindowHours: 168,
  /** Share of cycles that must have succeeded for the window to count. */
  minOkRatio: 0.9,
  /**
   * Share of the window the scanner must actually have been watching. A stretch
   * longer than `maxGapMs` without a successful cycle (a restart, an outage, a
   * host that runs time-limited jobs) is blind time and does not count.
   */
  minCoverageRatio: 0.9,
  maxGapMs: 5 * 60_000,
} as const

export interface RiskConfig {
  maxRiskPerTradeUsd: number
  lossLimitUsd: number
  manualApprovalRequired: boolean
  maxLiveTrades: number
}

export class LockedRuleViolation extends Error {
  constructor(public readonly violations: string[]) {
    super(`config violates locked rules (RULES.md): ${violations.join('; ')}`)
    this.name = 'LockedRuleViolation'
  }
}

/** Returns every way a config breaks the locked rules (empty when compliant). */
export function lockedRuleViolations(config: {
  chainId: number
  live_execution_enabled: boolean
  risk: RiskConfig
}): string[] {
  const violations: string[] = []
  if (config.chainId !== LOCKED_RULES.chainId) {
    violations.push(`chainId must be ${LOCKED_RULES.chainId} (Base only), got ${config.chainId}`)
  }
  if (config.live_execution_enabled && !LOCKED_RULES.liveExecutionAllowedInThisCycle) {
    violations.push('live_execution_enabled must be false: the Phase 3 gate has not passed')
  }
  if (!(config.risk.maxRiskPerTradeUsd <= LOCKED_RULES.maxRiskPerTradeUsd)) {
    violations.push(`risk.maxRiskPerTradeUsd must be <= ${LOCKED_RULES.maxRiskPerTradeUsd}`)
  }
  if (!(config.risk.lossLimitUsd <= LOCKED_RULES.lossLimitUsd)) {
    violations.push(`risk.lossLimitUsd must be <= ${LOCKED_RULES.lossLimitUsd}`)
  }
  if (config.risk.manualApprovalRequired !== true) {
    violations.push('risk.manualApprovalRequired must be true')
  }
  if (!(config.risk.maxLiveTrades <= LOCKED_RULES.maxLiveTrades)) {
    violations.push(`risk.maxLiveTrades must be <= ${LOCKED_RULES.maxLiveTrades}`)
  }
  return violations
}

export function assertWithinLockedRules(config: Parameters<typeof lockedRuleViolations>[0]): void {
  const violations = lockedRuleViolations(config)
  if (violations.length > 0) throw new LockedRuleViolation(violations)
}

/**
 * Kill switch: a `KILL` file in the data directory, or KILL_SWITCH=1. Checked
 * every cycle. While engaged the scanner keeps observing but suppresses
 * candidate alerts, so nothing can be queued for approval.
 */
export function killSwitchEngaged(dataDir: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.KILL_SWITCH === '1' || env.KILL_SWITCH === 'true') return true
  return existsSync(join(dataDir, 'KILL'))
}

export interface LiveGate {
  allowed: boolean
  reasons: string[]
}

/**
 * The single question any future execution path must ask. In this cycle the
 * answer is always no, and the reasons say what would have to change.
 */
export function liveExecutionGate(input: {
  live_execution_enabled: boolean
  killSwitch: boolean
  realizedLossUsd: number
  liveTradesDone: number
  risk: RiskConfig
}): LiveGate {
  const reasons: string[] = []
  if (!LOCKED_RULES.liveExecutionAllowedInThisCycle) reasons.push('phase_4_not_built')
  if (!input.live_execution_enabled) reasons.push('live_execution_disabled')
  if (input.killSwitch) reasons.push('kill_switch_engaged')
  if (input.realizedLossUsd >= input.risk.lossLimitUsd) reasons.push('loss_limit_reached')
  if (input.liveTradesDone >= input.risk.maxLiveTrades) reasons.push('max_live_trades_reached')
  return { allowed: reasons.length === 0, reasons }
}

/** Whether a trade of `repayUsd` fits the per-trade risk limit. */
export function withinTradeRiskLimit(repayUsd: number, risk: RiskConfig): boolean {
  return Number.isFinite(repayUsd) && repayUsd > 0 && repayUsd <= risk.maxRiskPerTradeUsd
}
