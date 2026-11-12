// Structured JSON logging. One object per line on stdout, so it can be piped
// straight into jq, Loki, CloudWatch, etc. Every line carries the ambient
// request context (cycle id, request id) from AsyncLocalStorage.

import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

export type LogFields = Record<string, unknown>

const context = new AsyncLocalStorage<LogFields>()

/** Run `fn` with extra fields attached to every log line emitted inside it. */
export function withLogContext<T>(fields: LogFields, fn: () => T): T {
  return context.run({ ...context.getStore(), ...fields }, fn)
}

export function currentLogContext(): LogFields {
  return context.getStore() ?? {}
}

/** Short random id for correlating a cycle or a single outbound request. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`
}

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) {
    return { name: value.name, message: value.message.slice(0, 2000) }
  }
  return value
}

export interface Logger {
  debug(event: string, fields?: LogFields): void
  info(event: string, fields?: LogFields): void
  warn(event: string, fields?: LogFields): void
  error(event: string, fields?: LogFields): void
  child(bindings: LogFields): Logger
}

export function createLogger(opts: {
  level?: LogLevel
  bindings?: LogFields
  write?: (line: string) => void
} = {}): Logger {
  const threshold = LEVELS[opts.level ?? 'info']
  const write = opts.write ?? ((line: string) => process.stdout.write(line + '\n'))
  const bindings = opts.bindings ?? {}

  const emit = (level: LogLevel, event: string, fields?: LogFields) => {
    if (LEVELS[level] < threshold) return
    const record = {
      ts: new Date().toISOString(),
      level,
      event,
      ...bindings,
      ...currentLogContext(),
      ...fields,
    }
    write(JSON.stringify(record, (_key, value) => serialize(value)))
  }

  return {
    debug: (event, fields) => emit('debug', event, fields),
    info: (event, fields) => emit('info', event, fields),
    warn: (event, fields) => emit('warn', event, fields),
    error: (event, fields) => emit('error', event, fields),
    child: (extra) =>
      createLogger({ level: opts.level, write, bindings: { ...bindings, ...extra } }),
  }
}

/** A logger that drops everything; for tests. */
export const silentLogger: Logger = createLogger({ write: () => {} })
