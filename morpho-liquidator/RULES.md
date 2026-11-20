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

Decided by the rule owner on 2026-11-19: the Morpho Base liquidation lane closes when
the 7-day window completes (2026-11-13T08:32:25Z to 2026-11-20T08:32:25Z), whatever
the final report says. The exit criteria are met in the negative. The workflow
stopped scanning at 08:34:23Z, opened the closure issue with the final report and
disabled itself.

**Final report (168.03 h):** 48,943 cycles, none failed, 99.2% coverage. 41 positions
became liquidatable while watched; all were dust or too small to size, 37 were taken
by other liquidators and 23 episodes resolved by price recovery. Zero realistic
candidates. Decision: **KILL**.

**Evidence** (analysis of 2026-11-19, covering the first 5.5 days of the window).

- **Latency.** 130 of the 132 liquidations eligible under these rules (98.5%) landed in
  the same 200 ms block as the oracle update that triggered them. Polling and manual
  approval cannot contest that.
- **Unit economics.** Under the $1,000 cap and the market-wide SVR exclusion, the
  eligible prize after matching each winner's actual priority fee was $729. That
  period was the busiest week of the previous 26; on the 26-week average the same
  prize is about $16/day. Contesting it needs a dedicated node and low-latency RPC at
  $600-3,500/month plus an estimated 4-8 engineer-weeks.
- **Cycle integrity.** Making the numbers work needs larger or flash-loan sizing,
  transaction-level instead of market-level SVR filtering, and autonomous execution.
  All three are prohibited inside this cycle.

**Freeze.** No execution code, no deployed contract, no signing key, no dedicated
node or paid RPC for this lane. The code stays in the repository as a record and as
the base for any re-entry. The only exception is the gate 2 listener below, and only
after gate 1 is ratified.

### Conditional re-entry

Three gates, in order, each cheaper than the next. Failing gate 2 or gate 3 ends the
lane permanently.

1. **Ratify amendments.** One commit, made or signed off by the rule owner, that
   changes this file and `LOCKED_RULES` in `src/risk/limits.ts` together, and
   explicitly approves:
   - trade sizing above $1,000, uncapped, or flash-loan sized;
   - transaction-level SVR filtering: non-auction races inside SVR markets are in
     scope (whether Atlas auction bidding is also in scope must be stated);
   - autonomous execution within stated budget, loss and kill-switch limits,
     replacing per-trade manual approval;
   - **K**, the minimum number of included races gate 3 requires.
   Costs nothing. Until it exists, gates 2 and 3 cannot start.

2. **Shadow latency benchmark, 14 days, run once.** One small always-on VM and one
   WebSocket endpoint subscribed to `newHeads` and `logs`. No keys. Budget: that VM
   and endpoint (plus an archive or trace endpoint for replays) for 14 days, shut
   down afterwards whatever the result.
   - **Race set:** every Morpho `Liquidate` on Base in the 14 days that is eligible
     under the amended rules, indexed afterwards from chain history, not from the
     listener. Races during listener downtime count as misses.
   - **Recorded per race, in ms:** when we first observed the trigger; when a local
     `liquidate()` simulation for it completed; when the block holding the winning
     liquidation arrived as a header (its whole-second timestamp is recorded too);
     the winner's total fee for that transaction (priority fee, L2 gas, L1 data fee).
   - **Fails** (lane terminated) if the listener is blind for more than 10% of the 14
     days (any gap over 60 s is blind time).

3. **Execution engineering only on proven inclusion and profit.** Both must hold.
   - **Inclusion:** at least K races were included. A race is included only if our
     simulation completed before the winning block's header arrived, used no price
     we had not yet observed on-chain, and its exact calldata succeeds with the
     recorded profit when replayed afterwards against the state just before the
     winning transaction. A race won in the same block as the oracle update that
     triggered it is a miss unless that trigger was committed to in advance (the
     commitment time is the observation time). With no public mempool, that leaves
     only predictable triggers: the SVR fallback cutoff, interest accrual crossing
     the threshold, multi-block races.
   - **Profit:** on the included races, the bonus minus, per race, the larger of the
     winner's total fee plus an outbid margin and 67% of the bonus (the owner's
     fee-burn floor), minus swap cost and gas. Summed over the 14 days, normalised to
     the 26-week average activity of the eligible markets, and scaled to a month, it
     must exceed the monthly price of the exact endpoint and VM used in gate 2 plus
     the engineering estimate amortised over 12 months.
   Fail either and the lane is terminated permanently.

The thresholds adapt to what is measured (each race's real fee and real
replay-validated profit, activity normalised to the long-run average, the cost of
the infrastructure actually benchmarked) while never going below the owner's 67%
fee-burn floor.

### Changes from the owner's wording, pending owner acceptance

Gate 2 and gate 3 differ from the instruction of 2026-11-19 in these places. They
are not in force until the owner accepts them, with gate 1 at the latest.

| Owner's wording | Written here | Why |
|---|---|---|
| Listener on Base's Flashblocks stream | `eth_subscribe` to `newHeads` and `logs` | Base's Denim upgrade (2026-11-05) made 200 ms canonical blocks and retired Flashblocks; the stream returns nothing |
| Delta from *pending* oracle updates | From the first observation of the trigger, or an advance commitment | Base has no public mempool, so pending oracle updates cannot be observed |
| Before the target Flashblock seals | Before the winning block's header arrives, replay-validated | The sealing instant is not observable; block timestamps are whole seconds |
| Profitable after median fee burn (~67%+) | After the larger of the race's real fee plus a margin and 67% | Keeps the owner's floor and adds the real fee where it is higher |
| (not specified) | At least K included races, K set at gate 1 | A pass/fail needs a number; the owner chooses it |
| (not specified) | Gate 2 coverage floor, chain-indexed race set, normalised monthly profit, cost hurdle including engineering | Stops a short, busy or partly blind run from passing on luck |

### Record

- Final report: [closure issue #5](https://github.com/hasnainakber9/hasnainakber9/issues/5)
  and the last scanning run's artifact, database and log, kept 90 days
  ([run 44667750344](https://github.com/hasnainakber9/hasnainakber9/actions/runs/44667750344)).
- Analysis of 2026-11-19: two independent prize measurements (protocol formula and
  market value, agreeing within 2% on the eligible set), a 26-week history of the
  eligible markets, a block-level race study, and sourced research on Base
  transaction ordering and Chainlink SVR (Atlas).

## Working rules

- Act only on alerts or on a single periodic review (`pnpm gate`). No dashboard-watching.
- Secrets never go in code or in `config/`. Endpoints and webhooks come from the
  environment (`.env.example`). Research and execution keys are separate; this cycle
  has no execution key at all.
- The market whitelist (`config/markets.base.json`) and the SVR feed list
  (`config/svr-feeds.base.json`) are reviewed files in git. They are regenerated by
  scripts and committed after reading the diff, never fetched at runtime.
- Kill switch: `touch data/KILL` or `KILL_SWITCH=1`. Checked every cycle.
