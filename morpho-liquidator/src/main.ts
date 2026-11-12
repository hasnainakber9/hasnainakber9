// Entrypoint. `pnpm scan` runs continuously; `pnpm scan:once` runs one cycle
// and exits non-zero if it failed.

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildApp } from './app.ts'
import { ConfigError, loadConfig, usingPublicRpc } from './config.ts'
import { createLogger } from './logger.ts'
import { killSwitchEngaged, liveExecutionGate, LockedRuleViolation } from './risk/limits.ts'
import { ScanLoop } from './scanner/loop.ts'

/** One scanner per data directory: two would double-alert and fight over the DB. */
function acquireLock(dataDir: string): () => void {
  mkdirSync(dataDir, { recursive: true })
  const path = join(dataDir, 'scanner.lock')
  if (existsSync(path)) {
    const pid = Number(readFileSync(path, 'utf8').trim())
    let alive = false
    try {
      if (pid > 0) {
        process.kill(pid, 0)
        alive = true
      }
    } catch {
      alive = false
    }
    if (alive) throw new Error(`another scanner (pid ${pid}) holds ${path}`)
    unlinkSync(path) // stale lock from a crashed run
  }
  closeSync(openSync(path, 'wx'))
  writeFileSync(path, String(process.pid))
  return () => {
    try {
      unlinkSync(path)
    } catch {
      /* already gone */
    }
  }
}

async function main(): Promise<number> {
  const once = process.argv.includes('--once')
  let config
  try {
    config = loadConfig()
  } catch (error) {
    if (error instanceof ConfigError || error instanceof LockedRuleViolation) {
      process.stderr.write(`${error.name}: ${error.message}\n`)
      return 2
    }
    throw error
  }
  const logger = createLogger({ level: config.logLevel, bindings: { app: 'morpho-scanner' } })

  let release: () => void
  try {
    release = acquireLock(config.storage.dataDir)
  } catch (error) {
    logger.error('startup.lock_failed', { error })
    return 3
  }

  const app = buildApp(config, logger)
  const gate = liveExecutionGate({
    live_execution_enabled: config.live_execution_enabled,
    killSwitch: killSwitchEngaged(config.storage.dataDir),
    realizedLossUsd: 0,
    liveTradesDone: 0,
    risk: config.risk,
  })
  logger.info('startup', {
    chainId: config.chainId,
    markets: config.markets.length,
    rpcEndpoints: config.rpcUrls.length,
    publicRpc: usingPublicRpc(config),
    liveExecution: gate,
    alertWebhook: config.alertWebhookUrl !== null,
    mode: once ? 'once' : 'continuous',
  })
  if (usingPublicRpc(config)) {
    logger.warn('startup.public_rpc', {
      hint: 'BASE_RPC_URL is unset; using the rate-limited public endpoint. Set a dedicated RPC for continuous use.',
    })
  }

  app.scanner.init()
  const loop = new ScanLoop({
    config,
    scanner: app.scanner,
    store: app.store,
    alerter: app.alerter,
    logger: logger.child({ mod: 'loop' }),
    rpcStats: app.rpc.stats,
  })

  let exitCode = 0
  if (once) {
    exitCode = (await loop.tick()) ? 0 : 1
  } else {
    const shutdown = (signal: string) => {
      logger.info('shutdown.signal', { signal })
      loop.stop()
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    // A bug in one cycle must not take the process down; the loop catches
    // cycle errors, and these catch anything that escapes it.
    process.on('unhandledRejection', (reason) => logger.error('process.unhandled_rejection', { error: reason }))
    process.on('uncaughtException', (error) => logger.error('process.uncaught_exception', { error }))
    await loop.run()
  }
  app.store.close()
  release()
  return exitCode
}

main().then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`fatal: ${error instanceof Error ? error.stack : String(error)}\n`)
    process.exit(1)
  },
)
