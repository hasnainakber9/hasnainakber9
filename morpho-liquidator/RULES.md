# RULES — first cycle

These rules are locked for the first cycle. They are enforced in code
(`src/risk/limits.ts`, checked at startup by `src/config.ts`): a config file may be
stricter than a rule, never looser. Changing a rule means changing this file and
`LOCKED_RULES` in the same commit, on purpose.

## Locked rules

| # | Rule | Enforced by |
|---|------|-------------|
| 1 | Morpho Blue on **Base only** (chain id 8453) | `LOCKED_RULES.chainId`; startup refuses any other chain |
| 2 | **Hard decision gate** at the end of Phase 3 (below) | `pnpm gate` (`src/gate.ts`) |
| 3 | Max risk per trade: **$1,000** | `LOCKED_RULES.maxRiskPerTradeUsd`; economics only counts sizes within it |
| 4 | Loss limit: **$2,000** | `LOCKED_RULES.lossLimitUsd`; `liveExecutionGate` |
| 5 | **Manual approval** for every live trade | `LOCKED_RULES.manualApprovalRequired` |
| 6 | `live_execution_enabled = false` by default | `config/base.json`; setting it `true` is rejected at startup in this cycle |
| 7 | **Fail closed** on any uncertainty | see "Fail closed" below |
| 8 | **Event-driven alerts only** | `src/alerts/alerts.ts`: alerts fire on transitions, never on a timer |
| 9 | At most **one** live trade to start | `LOCKED_RULES.maxLiveTrades` |

There is no execution code in this cycle. No private key is read, no signer is
constructed, and nothing in the repository can broadcast a transaction. Rule 6 is
therefore true by construction, not only by configuration.

## Fail closed

When something is uncertain the system does nothing and says so. Concretely:

- A failed RPC read fails the whole cycle: no state is written, no band changes, no alerts.
- A market whose state, oracle price or borrow rate cannot be read is excluded for that
  cycle, with the reason logged. Its positions are not evaluated.
- A pinned block older than `rpc.maxBlockAgeSec` means the RPC is stale: the cycle fails.
- Discovery that has never succeeded is a failed cycle, not an empty market.
- A loan token or gas cost that cannot be priced rejects the evaluation
  (`loan_token_unpriced`, `gas_unpriced`). A price is never guessed.
- A venue that cannot be queried is `quote_failed`, which is recorded differently from
  `no_route`.
- An oracle whose feeds cannot be enumerated is `oracle_unclassified` and is not a candidate.
- An unknown config key, a malformed value or an empty whitelist stops the process at startup.

## The Phase 3 gate

**Definition — realistic candidate.** A position counts only if all of these hold:

1. it is liquidatable on-chain at a pinned block (the contract's own `_isHealthy` predicate, not an API health factor);
2. it is not dust (debt ≥ `scanner.minDebtUsd`);
3. it is profitable at a size **within the $1,000 risk limit**, after the slippage, price-movement and gas buffers, by at least `economics.minNetProfitUsd`;
4. its market's oracle is not SVR-linked and not unclassified;
5. it is still a candidate `economics.persistenceCycles` evaluations later — i.e. it was not taken within seconds by someone faster.

A position that is healthy but would pass (a "hypothetical pass") is tracked for
context and never counts.

**Decision.**

| Result at review | Action |
|---|---|
| At least one realistic candidate | Proceed to the Tiny Live Path (Phase 4) |
| Zero realistic candidates | **Kill the direction.** Do not keep polishing. Pick a Phase 6 pivot. |

**Review window.** A KILL is only valid after **7 days** of observation with at least
**90%** of cycles successful and at least **90% coverage** (`GATE_RULES`). Coverage is
the share of the window actually watched: any stretch longer than 5 minutes without a
successful cycle counts as blind time. A PROCEED needs no minimum window: one
realistic candidate is enough. Until the window is valid and no candidate has
appeared, `pnpm gate` reports `INSUFFICIENT_DATA`. There is no third outcome and no
extension: when the window closes, the report's decision is the decision.

> The 7-day window, the 90% thresholds and the "realistic candidate" definition are
> not in the original brief; they were added so the gate is mechanical instead of a
> judgement call. Amend them here and in `src/risk/limits.ts` before the window
> starts, not after seeing the data.

## Lane status: CLOSED at the Phase 3 gate (2026-11-20)

Decided by the rule owner on 2026-11-19, before the window completed: the Morpho Base
liquidation lane closes when the 7-day window completes, whatever the final report
says. The exit criteria are met in the negative.

**Evidence** (window 2026-11-13 to 2026-11-19; analysis files listed under "Record").

- **Latency.** 130 of the 132 liquidations eligible under these rules (98.5%) landed in
  the same 200 ms block as the oracle update that triggered them. Since Base's Denim
  upgrade (2026-11-05) these are full canonical blocks; Flashblocks are retired. Base
  has no public mempool, so a trigger cannot be seen before its block seals. Polling
  and manual approval cannot contest that.
- **Unit economics.** Under the $1,000 cap and the market-wide SVR exclusion, the
  eligible prize after matching each winner's actual priority fee was $729 in the
  window, which was the busiest week of the previous 26. On the 26-week average that is
  about $16/day. Contesting it needs a dedicated node and low-latency RPC at
  $600-3,500/month plus 4-8 engineer-weeks.
- **Cycle integrity.** Making the numbers work needs a larger or flash-loan-sized
  trade, transaction-level instead of market-level SVR filtering, and autonomous
  execution. All three are prohibited inside this cycle.

**Freeze.** No execution code, no deployed contract, no signing key, no dedicated
node or paid RPC for this lane. The scanner workflow disables itself at the gate.
The code stays in the repository as a record and as the base for any re-entry.

### Conditional re-entry

The lane reopens only through these three gates, in order. Each is cheaper than the
next, so a failure stops spend at the earliest point. A failure at gate 2 or 3 ends
the lane permanently.

1. **Ratify amendments to this file.** In one commit, explicitly approve:
   - trade sizing above $1,000, uncapped, or flash-loan sized (an atomic
     liquidate-swap-repay bounds the loss to gas and contract risk, not principal);
   - transaction-level SVR filtering: non-auction races inside SVR markets are in
     scope, Atlas-settled liquidations stay out unless SVR bidding is also approved;
   - autonomous execution within stated budget, loss and kill-switch limits,
     replacing per-trade manual approval.
   Costs nothing. Without it, gates 2 and 3 do not start.

2. **Benchmark shadow latency for 14 days.** A lightweight always-on listener (one
   small VM, WebSocket `eth_subscribe` to `newHeads` and `logs` on a paid endpoint or
   our own node; not the retired Flashblocks stream). No keys. For every eligible
   liquidation it records, in milliseconds:
   - when we first observed the trigger (the oracle update's block, or an earlier
     predictable trigger: the SVR fallback cutoff, interest accrual crossing the
     threshold, a multi-block race),
   - when a local `liquidate()` simulation for it completed,
   - when the block holding the winning liquidation was sealed (its timestamp and our
     receipt of its header),
   - the winner's priority fee and gas cost for that transaction.
   Budget: the VM and endpoint for 14 days only, then shut down whatever the result.

3. **Gate execution engineering on proven inclusion.** Greenlight it only if both hold:
   - **Inclusion:** our simulation completed before the winning block sealed for at
     least 20% of eligible races, counted over the 14 days.
   - **Profit:** on those races, the bonus minus the winner's actual fee for that race
     (not a flat share), minus swap cost and gas, summed over the 14 days and scaled to
     a month, exceeds the monthly cost of the infrastructure the live path needs.
   Fail either and the lane is terminated permanently.

The thresholds adapt to what is measured: the fee hurdle is each race's actual
winning fee, and the cost hurdle is the quoted price of the infrastructure that
would run it. A note on gate 2: with no public mempool, a race that settles in the
trigger's own block can only be won from a trigger that is predictable in advance.
Gate 2 measures how many such races exist; if there are none, gate 3 fails by
construction and that is the answer.

### Record

- Final report: the issue the workflow opens at the gate, and the last run's
  artifact (database and log, kept 90 days).
- Prize, race and latency analysis (2026-11-19): two independent prize measurements
  (protocol formula and market value, agreeing within 2% on the eligible set), a
  26-week history of the eligible markets, a block-level race study, and sourced
  research on Base ordering and Chainlink SVR/Atlas.

## Working rules

- Act only on alerts or on a single periodic review (`pnpm gate`). No dashboard-watching.
- Secrets never go in code or in `config/`. Endpoints and webhooks come from the
  environment (`.env.example`). Research and execution keys are separate; this cycle
  has no execution key at all.
- The market whitelist (`config/markets.base.json`) and the SVR feed list
  (`config/svr-feeds.base.json`) are reviewed files in git. They are regenerated by
  scripts and committed after reading the diff, never fetched at runtime.
- Kill switch: `touch data/KILL` or `KILL_SWITCH=1`. Checked every cycle.
