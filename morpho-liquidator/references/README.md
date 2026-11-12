# references/

Study material, not dependencies. Nothing here is imported or built, and the
clones are gitignored.

```bash
scripts/clone-references.sh
```

clones each repository at the commit this project was designed against
(`PINNED`); `--latest` checks out the default branch instead.

| Repository | Read first | What this project took |
|---|---|---|
| `morpho-org/morpho-blue-liquidation-bot` | `README.md`, `apps/data-providers/src/dataProvider.ts`, `apps/liquidity-venues/src/liquidityVenue.ts`, `apps/pricers/src/pricer.ts`, `apps/client/src/bot.ts` | Pluggable provider / venue / pricer interfaces, market whitelist, cooldowns |
| `morpho-org/morpho-bots` (`bots/blue-liquidation`) | `README.md`, `src/discovery/borrowers.ts`, `src/state/lens.sol.ts`, `src/sizing/plan.ts`, `src/prepare.ts`, `test/fork/` | API-as-coverage discovery, single-block reads, seize-exact sizing, simulation-first, fork tests |

`ARCHITECTURE.md` maps each borrowed pattern to the file that implements it.
