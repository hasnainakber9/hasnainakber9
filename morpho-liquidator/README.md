# morpho-liquidator

A fail-closed scanner for Morpho Blue liquidations on Base, built to reach a hard
go / no-go decision quickly. It watches whitelisted markets, tells you which
positions are near or past the liquidation threshold, and for each one whether
liquidating it would actually make money at a small size after realistic costs.

**It does not trade.** There is no execution code, no signer and no private key in
this cycle. See [`RULES.md`](RULES.md) for the locked rules and the decision gate,
and [`ARCHITECTURE.md`](ARCHITECTURE.md) for how it works and why.

## Status

| Phase | State |
|---|---|
| 0 — Rules, references, architecture | Done |
| 1 — Minimal robust scanner | Done; runs continuously against Base |
| 2 — Economics + sized unwind | Done; any position can be evaluated on demand |
| 3 — Forced decision gate | Tooling done (`pnpm gate`); the 7-day window runs on GitHub Actions |
| 4 — Tiny live path | Not built. Only if the gate says PROCEED |

## Quick start

Requires Node ≥ 22.13 and pnpm.

```bash
pnpm install
```

```bash
scripts/clone-references.sh
```

```bash
pnpm check
```

Run one cycle and exit:

```bash
pnpm scan:once
```

Run continuously (JSON logs on stdout):

```bash
BASE_RPC_URL=https://your-base-rpc pnpm scan
```

Without `BASE_RPC_URL` the scanner uses the public Base endpoint. That works, but
it is rate-limited and has no uptime guarantee; use a dedicated endpoint for the
7-day gate window.

## Running it on GitHub Actions

`.github/workflows/morpho-scanner.yml` (at the repository root) runs the scanner on
GitHub's machines, with nothing to host yourself.

- It starts on its own once the workflow file is on the default branch (within two
  hours), or immediately from **Actions → Morpho scanner → Run workflow**.
- A GitHub job can run for at most 6 hours, so the scanner runs as back-to-back
  jobs of about 5 h 20 min. The next job is always queued behind the current one, and
  the database is carried over in the Actions cache. The hand-over leaves about a
  minute unobserved, which the gate's coverage figure accounts for.
- Each run's page shows the current gate report in its summary, and keeps the
  database and log as a downloadable artifact for 14 days.
- When a realistic candidate appears, and again when the 7-day window completes, the
  workflow opens an issue in the repository (GitHub emails you). After the final
  decision it disables itself.
- Optional secrets (Settings → Secrets and variables → Actions): `BASE_RPC_URL` for a
  dedicated endpoint, `ALERT_WEBHOOK_URL` for live alerts. Without them it uses the
  public Base endpoint and alerts only through the log and the issues.

Things to know: a few queued runs show as "cancelled" in the Actions list each day
(a newer queued run replaced an older one; that is expected). If the repository is
public, so are the logs and artifacts; they contain only public chain data, and RPC
URLs are redacted from everything the scanner writes. Round-the-clock monitoring is
not what Actions is designed for, so treat this as a way to run the 7-day window, not
as permanent hosting.

To stop it early: Actions → Morpho scanner → ⋯ → Disable workflow.

## Commands

| Command | What it does |
|---|---|
| `pnpm scan` | Run the scanner continuously |
| `pnpm scan:once` | One cycle; exit code 1 if it failed |
| `pnpm evaluate --top 10` | Size the 10 lowest-health non-dust positions right now |
| `pnpm evaluate --market 0x… --borrower 0x…` | Size one position |
| `pnpm gate` | Phase 3 decision report (exit 0 PROCEED, 10 KILL, 11 INSUFFICIENT_DATA) |
| `pnpm test` | Unit tests (no network) |
| `pnpm test:fork` | Fork tests against an anvil fork of Base (needs network; a few minutes on the public RPC) |
| `pnpm refresh-markets` | Regenerate the market whitelist from the Morpho API; review the diff |
| `pnpm refresh-svr-feeds` | Regenerate the SVR feed list from Chainlink's directory; review the diff |

`pnpm evaluate` and `pnpm gate` are read-only and can run beside a live scanner.

### Reading `pnpm evaluate`

```text
wstETH/WETH  0x10c5…6e2c  (market 0x6aa81f51…, block 56434014)
  health factor 1.000793  healthy; liquidatable after a 0.08% collateral price drop
  debt $37717   bonus 1.06%   oracle flag: none
  VERDICT: HYPOTHETICAL_PASS (hypothetical: sized as if it crossed now)
    size      repay     dex-vs-oracle    gross     buffers      gas        net   result
    $1000      $1000        -1.3 bps    $10.48     $8.08    $0.026      $2.37   PASS
    $5000      $5000        -1.7 bps    $52.20    $40.42    $0.026     $11.75   exceeds_risk_limit
```

- **bonus** — the market's liquidation incentive (a function of its LLTV).
- **dex-vs-oracle** — what Uniswap v3 pays for the seized collateral relative to its
  oracle value. The trade only works if this plus the bonus is positive.
- **buffers** — slippage and price-movement haircut, subtracted before the verdict.
- **result** — `PASS`, or the rejection reason. Rungs above $1,000 are shown for
  context and can never make a candidate.

## Configuration

| File | Purpose |
|---|---|
| `config/base.json` | Thresholds: bands, RPC limits, buffers, size ladder, alert cooldown |
| `config/markets.base.json` | The market whitelist. Nothing outside it is read |
| `config/svr-feeds.base.json` | Chainlink SVR-linked feed addresses on Base |
| environment | `BASE_RPC_URL`, `ALERT_WEBHOOK_URL`, `LOG_LEVEL`, `KILL_SWITCH`, `MAX_RUNTIME_MIN` (see `.env.example`) |

Unknown keys, malformed values and anything looser than `RULES.md` stop the process
at startup with an explanation.

## Operating it

- **Health:** `data/heartbeat.json` is rewritten after every cycle with `status`
  (`ok` / `degraded` / `failing`), reasons, the last cycle's stats and RPC counters.
  Set `health.port` to also serve it at `http://127.0.0.1:<port>/healthz`
  (503 only when `failing`).
- **Restart safety:** state lives in `data/scanner.sqlite`. A restart restores the
  tracked positions and their bands, so it does not re-alert. A lock file prevents a
  second instance on the same data directory.
- **Alerts** fire on transitions only: a position becomes liquidatable, a realistic
  candidate appears, a candidate is resolved by someone else, the scanner degrades or
  recovers. Each is logged, stored in the `alerts` table, and POSTed to
  `ALERT_WEBHOOK_URL` if set.
- **Kill switch:** `touch data/KILL` or `KILL_SWITCH=1`. The scanner keeps observing
  and recording but stops raising candidate alerts.
- **Logs** are one JSON object per line with `event`, `tickId`, `cycleId`. Useful
  events: `cycle.ok`, `cycle.failed`, `discovery.ok`, `rpc.retryable_error`, `alert`.

## Tests

- `tests/unit` — 116 tests: the fixed-point math, health and sizing, config and locked
  rules, backoff / circuit breaker / rate limiter, discovery, economics verdicts,
  the scan cycle (fail-closed, restart, alerts), supervision, and the gate.
- `tests/fork` — against the real contracts on an anvil fork of Base: interest
  accrual equals `Morpho.accrueInterest` to the wei on every whitelisted market;
  `liquidate` reverts with "position is healthy" exactly when the scanner says so;
  a seize-exact plan is honoured exactly for a full and a $1,000 liquidation; a real
  liquidation transaction built from the plan succeeds; Uniswap v3 quotes work on
  live pool state.

## First observations (not the gate result)

From the first ~20 minutes against Base on 2026-11-12, 46 whitelisted markets:

- About 3,000 positions at or below a 1.05 health factor; 817 at or below 1.02; none liquidatable.
- More than half of the near-threshold positions are dust (debt under $50).
- Of 351 non-dust near-threshold positions, 280 would be profitable at $1,000 but sit
  in markets whose oracle reads a Chainlink SVR-linked feed (cbBTC/USDC, WETH/USDC,
  cbXRP/USDC, SOL/USDC). Under the rules those are not candidates.
- 18 would pass with no blocking flag, all in ETH-correlated markets with a small
  bonus (cbETH/WETH, cbETH/USDC, weETH/WETH, wstETH/WETH); at $1,000 the estimated net
  is a few dollars.
- The rest fail on Uniswap v3 liquidity or have no route there.

This is a snapshot of healthy positions sized hypothetically. It says where an edge
could exist, not that one does. The gate counts only positions that are actually
liquidatable and still there a cycle later.
