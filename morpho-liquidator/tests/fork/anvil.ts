// Starts an anvil fork of Base for the fork tests and tears it down again.

import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve } from 'node:path'

import { createPublicClient, createTestClient, http, publicActions, walletActions } from 'viem'
import { base } from 'viem/chains'

export const FORK_RPC_URL = (process.env.BASE_RPC_URL ?? 'https://mainnet.base.org').split(',')[0]!.trim()

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolvePort(port))
    })
  })
}

export async function startFork() {
  // Pin a few blocks behind the head so the upstream node is sure to have it.
  const upstream = createPublicClient({ chain: base, transport: http(FORK_RPC_URL) })
  const forkBlock = (await upstream.getBlockNumber()) - 10n
  const port = await freePort()
  const child: ChildProcess = spawn(
    resolve(process.cwd(), 'node_modules/.bin/anvil'),
    [
      '--fork-url', FORK_RPC_URL,
      '--fork-block-number', forkBlock.toString(),
      '--port', String(port),
      '--chain-id', '8453',
      '--no-rate-limit',
      '--silent',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  let stderr = ''
  child.stderr?.on('data', (chunk) => (stderr += String(chunk)))

  const url = `http://127.0.0.1:${port}`
  const client = createTestClient({
    chain: base,
    mode: 'anvil',
    transport: http(url, { timeout: 120_000, retryCount: 0 }),
  })
    .extend(publicActions)
    .extend(walletActions)

  const deadline = Date.now() + 60_000
  for (;;) {
    if (child.exitCode !== null) throw new Error(`anvil exited (${child.exitCode}): ${stderr.slice(0, 500)}`)
    try {
      await client.getBlockNumber({ cacheTime: 0 })
      break
    } catch {
      if (Date.now() > deadline) {
        child.kill('SIGKILL')
        throw new Error(`anvil did not become ready: ${stderr.slice(0, 500)}`)
      }
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  return {
    url,
    forkBlock,
    client,
    stop: async () => {
      child.kill('SIGTERM')
      await new Promise((r) => setTimeout(r, 200))
      if (child.exitCode === null) child.kill('SIGKILL')
    },
  }
}

export type Fork = Awaited<ReturnType<typeof startFork>>
