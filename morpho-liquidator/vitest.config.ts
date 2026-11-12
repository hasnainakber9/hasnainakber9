import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    // node:sqlite prints an ExperimentalWarning on Node 22; keep test output readable.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
})
