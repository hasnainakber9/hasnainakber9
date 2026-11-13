import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildConfig, ConfigError, loadConfig } from '../../src/config.ts'
import {
  killSwitchEngaged,
  liveExecutionGate,
  LOCKED_RULES,
  LockedRuleViolation,
  lockedRuleViolations,
  withinTradeRiskLimit,
} from '../../src/risk/limits.ts'

const read = (name: string) => JSON.parse(readFileSync(resolve(process.cwd(), 'config', name), 'utf8'))
const files = () => ({
  base: read('base.json'),
  markets: read('markets.base.json'),
  svrFeeds: read('svr-feeds.base.json'),
  env: {},
})

describe('shipped configuration', () => {
  it('loads and satisfies the locked rules', () => {
    const config = loadConfig()
    expect(config.chainId).toBe(8453)
    expect(config.live_execution_enabled).toBe(false)
    expect(config.risk).toEqual({
      maxRiskPerTradeUsd: 1000,
      lossLimitUsd: 2000,
      manualApprovalRequired: true,
      maxLiveTrades: 1,
    })
    expect(config.markets.length).toBeGreaterThan(0)
    expect(config.svrFeeds.length).toBeGreaterThan(0)
    expect(config.scanner.researchBandHf).toBe(1_050_000_000_000_000_000n)
  })

  it('whitelists each market once, by a 32-byte id', () => {
    const ids = loadConfig().markets.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^0x[0-9a-f]{64}$/)
  })
})

describe('locked rules', () => {
  const tamper = (mutate: (base: any) => void) => {
    const input = files()
    mutate(input.base)
    return () => buildConfig(input)
  }

  it('refuses to enable live execution', () => {
    expect(tamper((b) => (b.live_execution_enabled = true))).toThrow(LockedRuleViolation)
  })

  it('refuses any chain but Base', () => {
    expect(tamper((b) => (b.chainId = 1))).toThrow(LockedRuleViolation)
  })

  it('refuses looser risk limits but accepts stricter ones', () => {
    expect(tamper((b) => (b.risk.maxRiskPerTradeUsd = 1001))).toThrow(/maxRiskPerTradeUsd/)
    expect(tamper((b) => (b.risk.lossLimitUsd = 5000))).toThrow(/lossLimitUsd/)
    expect(tamper((b) => (b.risk.manualApprovalRequired = false))).toThrow(/manualApprovalRequired/)
    expect(tamper((b) => (b.risk.maxLiveTrades = 2))).toThrow(/maxLiveTrades/)
    expect(tamper((b) => (b.risk.maxRiskPerTradeUsd = 250))).not.toThrow()
  })

  it('lists every violation at once', () => {
    expect(
      lockedRuleViolations({
        chainId: 1,
        live_execution_enabled: true,
        risk: { maxRiskPerTradeUsd: 9999, lossLimitUsd: 9999, manualApprovalRequired: false, maxLiveTrades: 9 },
      }),
    ).toHaveLength(6)
  })

  it('keeps live execution impossible in this cycle', () => {
    expect(LOCKED_RULES.liveExecutionAllowedInThisCycle).toBe(false)
    const gate = liveExecutionGate({
      live_execution_enabled: true,
      killSwitch: false,
      realizedLossUsd: 0,
      liveTradesDone: 0,
      risk: loadConfig().risk,
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons).toContain('phase_4_not_built')
  })

  it('reports each blocking reason', () => {
    const gate = liveExecutionGate({
      live_execution_enabled: false,
      killSwitch: true,
      realizedLossUsd: 2000,
      liveTradesDone: 1,
      risk: loadConfig().risk,
    })
    expect(gate.reasons).toEqual(
      expect.arrayContaining([
        'live_execution_disabled',
        'kill_switch_engaged',
        'loss_limit_reached',
        'max_live_trades_reached',
      ]),
    )
  })

  it('applies the per-trade limit', () => {
    const risk = loadConfig().risk
    expect(withinTradeRiskLimit(1000, risk)).toBe(true)
    expect(withinTradeRiskLimit(1000.01, risk)).toBe(false)
    expect(withinTradeRiskLimit(Number.NaN, risk)).toBe(false)
    expect(withinTradeRiskLimit(0, risk)).toBe(false)
  })

  it('reads the kill switch from the environment', () => {
    expect(killSwitchEngaged('/nonexistent-dir', { KILL_SWITCH: '1' })).toBe(true)
    expect(killSwitchEngaged('/nonexistent-dir', {})).toBe(false)
  })
})

describe('validation', () => {
  const tamper = (mutate: (input: ReturnType<typeof files>) => void) => {
    const input = files()
    mutate(input)
    return () => buildConfig(input)
  }

  it('rejects unknown keys rather than ignoring a typo', () => {
    expect(tamper((i) => (i.base.scanner.pollIntervalMS = 1))).toThrow(ConfigError)
  })

  it('rejects an empty market whitelist', () => {
    expect(tamper((i) => (i.markets.markets = []))).toThrow(/whitelist must not be empty/)
  })

  it('rejects a malformed market id and a duplicate', () => {
    expect(tamper((i) => (i.markets.markets[0].id = '0x1234'))).toThrow(ConfigError)
    expect(tamper((i) => i.markets.markets.push({ ...i.markets.markets[0] }))).toThrow(/duplicate/)
  })

  it('rejects inconsistent bands', () => {
    expect(tamper((i) => (i.base.scanner.nearThresholdHf = '1.10'))).toThrow(/nearThresholdHf/)
    expect(tamper((i) => (i.base.scanner.nearThresholdHf = '0.99'))).toThrow(/nearThresholdHf/)
  })

  it('rejects a whitelist generated for another chain', () => {
    expect(tamper((i) => (i.markets.chainId = 1))).toThrow(/chain 1/)
  })

  it('treats an empty BASE_RPC_URL (an unset CI secret) as not configured', () => {
    expect(buildConfig({ ...files(), env: { BASE_RPC_URL: '' } }).rpcUrls).toEqual(['https://mainnet.base.org'])
    expect(buildConfig({ ...files(), env: { BASE_RPC_URL: '  ' } }).rpcUrls).toEqual(['https://mainnet.base.org'])
  })

  it('reads an optional maximum runtime', () => {
    expect(buildConfig(files()).maxRuntimeMs).toBeNull()
    expect(buildConfig({ ...files(), env: { MAX_RUNTIME_MIN: '' } }).maxRuntimeMs).toBeNull()
    expect(buildConfig({ ...files(), env: { MAX_RUNTIME_MIN: '320' } }).maxRuntimeMs).toBe(320 * 60_000)
    expect(() => buildConfig({ ...files(), env: { MAX_RUNTIME_MIN: 'soon' } })).toThrow(ConfigError)
    expect(() => buildConfig({ ...files(), env: { MAX_RUNTIME_MIN: '-5' } })).toThrow(ConfigError)
  })

  it('takes RPC endpoints and log level from the environment', () => {
    const config = buildConfig({ ...files(), env: { BASE_RPC_URL: 'https://a.example, https://b.example', LOG_LEVEL: 'debug' } })
    expect(config.rpcUrls).toEqual(['https://a.example', 'https://b.example'])
    expect(config.logLevel).toBe('debug')
    expect(() => buildConfig({ ...files(), env: { BASE_RPC_URL: 'ftp://nope' } })).toThrow(ConfigError)
    expect(() => buildConfig({ ...files(), env: { LOG_LEVEL: 'loud' } })).toThrow(ConfigError)
  })
})
