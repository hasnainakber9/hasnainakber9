# ARCHITECTURE

A research-phase scanner for Morpho Blue liquidations on Base. It answers one
question — *is there a realistic, small liquidation here that we could actually
take?* — and stops at a hard gate. It does not execute anything.

## Data flow

```text
                 config/ (whitelist, thresholds, SVR feeds)      RULES.md → risk/limits.ts
                                    │
  Morpho API ──► discovery ──► watchlist ──► state reader ──► classify ──► economics ──► verdict
  (coverage)    (which pairs)   (SQLite)    (pinned block)    (bands)     (sized quotes)    │
                                               ▲                              ▲              ▼
                                         Base RPC (guarded)            Uniswap v3 QuoterV2   DB + alerts
```

One cycle (`src/scanner/scanner.ts`):

1. **Discover** (every `discovery.intervalMs`): ask the Morpho GraphQL API for
   positions in whitelisted markets at or below the research band. Only
   `(marketId, borrower)` is kept.
2. **Read** every tracked pair and its market on-chain at one pinned block.
3. **Classify** each position into a band: `liquidatable` (the contract's own
   predicate), `near`, `research`, `healthy`, `closed`.
4. **Size** the `near` and `liquidatable` ones: quote the exact collateral a
   liquidation would seize, at $1k / $5k / $10k, and judge the result after buffers.
5. **Persist** the whole cycle in one transaction, then **alert** on transitions.

## Design decisions

### Discovery is coverage, the chain is truth
The API is only trusted to say *where to look*. Health, debt and collateral are
always re-read on-chain. Over-inclusion is free; API lag costs coverage latency, never
correctness. If the API goes down, known positions keep being read and the scanner
reports itself degraded once the candidate set is older than `discovery.maxAgeMs`.
*(Pattern from `morpho-bots` `discovery/borrowers.ts`.)*

### One pinned block per cycle
All reads in a cycle use the same block number, `pinLagBlocks` behind the head, so
price, accrued debt and collateral are mutually consistent and load-balanced RPC nodes
agree on the block. The official bot gets this with a deployless Solidity lens in one
`eth_call`. This project gets the same consistency with Multicall3 pinned to a block,
and mirrors the accrual math in TypeScript (`src/scanner/health.ts`). That avoids a
Solidity toolchain; the price is that the mirror must be proven, which the fork tests
do (wei-exact against `Morpho.accrueInterest` on every whitelisted market).

### Health is the contract's predicate
`assessHealth` reproduces `Morpho._isHealthy` including rounding direction (debt up,
capacity down). "Liquidatable" means the contract would accept `liquidate`, not that
an API health factor dipped below 1. Checked on a fork: `liquidate` reverts with
`position is healthy` exactly when the scanner says healthy.

### Seize-exact sizing
A plan pins `seizedAssets` and passes `repaidShares = 0`, letting Blue derive the
repay. The seize is what a swap needs to be quoted for, so pinning it keeps the
quote and the liquidation consistent. The repay is derived with Blue's own rounding
chain (including the shares round trip), so it is the true break-even output of the
swap. *(Pattern from `morpho-bots` `sizing/plan.ts`.)*

### Economics are sized, executable and conservative
Profit is `quote(seized collateral) × (1 − buffers) − repay − gas`. The quote comes
from Uniswap v3 QuoterV2, which simulates the swap against live pool state, so price
impact at that exact size is in the number. Every ladder rung is quoted for its own
seize; only rungs within the $1,000 risk limit can make a candidate. Buffers
(`slippageBufferBps`, `priceMoveBufferBps`, a gas-price multiplier) are subtracted
before the verdict.

Near-threshold positions that are still healthy are sized *as if they had just
crossed*. What decides profit is the DEX/oracle basis and the price impact at size,
and both are measurable before the position crosses. These are labelled
`hypothetical` and never count toward the gate.

### SVR / auction awareness
Chainlink SVR auctions the right to backrun a price update (Atlas on Base). On a
market whose oracle reads an SVR-linked feed, the liquidation created by an update is
normally won inside that auction. `src/economics/oracleFlags.ts` reads each market
oracle's feed slots and matches them against `config/svr-feeds.base.json` (generated
from Chainlink's reference data directory). Flags: `svr`, `none`, `unknown`. By
default `svr` and `unknown` are not candidates; the economics are still computed and
stored, so the gate report can say how many positions were blocked *only* by the flag.

Limitation: a feed wrapped behind a custom adapter is not seen through, and the
directory lists both proxies of an SVR pair without saying which one a given
integration is exposed through — both are flagged. Confirm against Chainlink's feed
address page before any live path relies on a `none`.

### Every rejection has a reason
`RejectionReason` in `src/economics/evaluate.ts` is a closed list. Verdicts are stored
in `evaluations` with the primary reason, all applicable reasons, and the full
per-size breakdown. An unchanged verdict extends the previous row instead of adding
one.

### Resilience is layered
| Layer | Mechanism | File |
|---|---|---|
| Request | token-bucket rate limit → circuit breaker → jittered exponential backoff → endpoint failover | `src/rpc/client.ts` |
| Request | infrastructure errors are retried; reverts are answers and are not | `isRetryableRpcError` |
| Cycle | any failure fails the cycle closed; nothing is written | `scanner.ts` |
| Cycle | bounded work: `maxQuotedPerCycle`, `cycleBudgetMs`; the rest is deferred | `scanner.ts` |
| Loop | a failed cycle never kills the process; delay grows with consecutive failures | `src/scanner/loop.ts` |
| Process | single-instance lock; state restored from SQLite; graceful SIGTERM | `src/main.ts` |
| Operator | heartbeat file every cycle, optional `/healthz`, degraded/recovered alerts | `loop.ts` |

### Configuration is validated, and rules are code
`src/config.ts` validates every file with strict schemas (unknown keys are errors) and
then applies `LOCKED_RULES`. See `RULES.md`.

## What was taken from the reference repositories

| From | Taken | Where |
|---|---|---|
| `morpho-blue-liquidation-bot` | pluggable data provider / liquidity venue / pricer interfaces | `scanner/discovery.ts`, `economics/venue.ts` |
| | explicit market whitelist; Uniswap v3 fee tiers and Base factory | `config/markets.base.json`, `economics/uniswapV3.ts` |
| | cooldown idea (applied to alerts and re-quotes) | `alerts/alerts.ts`, `scanner.ts` |
| `morpho-bots` `blue-liquidation` | API as coverage only; complete-walk-or-nothing discovery; page backstops | `scanner/discovery.ts` |
| | single-block consistent read; accrual simulated before the health check | `scanner/stateReader.ts`, `scanner/health.ts` |
| | seize-exact sizing; skip reasons instead of silent drops | `scanner/health.ts` |
| | simulation-first; fork test that liquidates a seeded position | `tests/fork/` |
| | fail-loud config; detection-only as an explicit mode | `config.ts`, `risk/limits.ts` |

Not taken: the executor contract, the kernel/ledger signer, aggregator venues
(0x / 1inch / LiFi), Flashbots, pre-liquidations. They belong to Phase 4 or later.

## Storage (`data/scanner.sqlite`)

| Table | Holds |
|---|---|
| `positions` | latest reading of every tracked position; restored on restart |
| `band_events` | every band transition, with a resolution note when a liquidatable position resolves |
| `evaluations` | every sized verdict, with rejection reasons and the per-size breakdown |
| `realistic_candidates` | positions that met the gate's definition |
| `alerts` | every alert, delivered or not |
| `cycles` | per-cycle stats, ok or failed (kept 7 days) |

## Layout

```text
config/        base.json (thresholds), markets.base.json (whitelist), svr-feeds.base.json
src/scanner/   math, health, discovery, stateReader, marketRegistry, scanner, loop
src/economics/ venue interfaces, uniswapV3, pricing (USD + gas), oracleFlags, evaluate
src/risk/      limits (locked rules, kill switch, live gate)
src/alerts/    alerts (transition-driven, webhook sink)
src/rpc/       client (guarded transport)
src/gate.ts    Phase 3 decision gate
scripts/       evaluate-position, gate-report, refresh-markets, refresh-svr-feeds, clone-references
tests/unit/    109 tests, no network
tests/fork/    6 tests against an anvil fork of Base
references/    cloned official bots (gitignored; scripts/clone-references.sh)
```

## Not built (by rule)

Phase 4 (Tiny Live Path) starts only if the gate says PROCEED. The pieces it will
need already have a home: `liveExecutionGate` is the one question an executor must
ask; the fork test's `simulateLiquidate` is the simulate-before-broadcast primitive;
`realistic_candidates` is the approval queue's input. Until then nothing signs.

Known gaps to close before Phase 4 if it happens: an Aerodrome venue (much Base
liquidity is not on Uniswap v3, so `no_route` and `venue_liquidity_too_thin` are
overstated for some collaterals); unwrapping for ERC-4626 and Pendle collateral;
SVR searcher onboarding if the flagged markets are the only ones that pay.
