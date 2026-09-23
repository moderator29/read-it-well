# The Hundred: the build ledger

The running record of building `docs/THE_HUNDRED.md`. Every V-number, what shipped, the evidence it works, and its
state. Updated as work lands.

**States.** SHIPPED: built, adversarially reviewed by a second agent, and every gate green on the build branch.
PARTIAL: some of it shipped and the entry says which half. DEFERRED: not built, with the reason. FOUNDER: built to the
boundary and switched off, waiting on one of the sixteen founder decisions, with the one step that turns it on.
AUDIT: owned by the audit session and not touched here.

**Where it lives.** Branch `claude/vallo-hundred-recommendations-xclnva`. Database changes are migration files proven
against the live schema by a probe that ends in a deliberate raise (nothing persists); they apply when the branch
merges to `main`.

## Gates

| When | Tree | tsc | eslint | vitest | next build |
|---|---|---|---|---|---|
| 23 Sep 23:08 UTC, baseline | `0afb9b0` (origin/main `e1395cf` merged) | 0 errors | 0 errors, 333 warnings | 242 files, 3,859 passed, 1 skipped | green |

## The ledger

| V | Title | Owner | State | What shipped | Evidence |
|---|---|---|---|---|---|
| V-01 | The catalogue canary | audit | AUDIT | | |
| V-02 | The claims rule becomes a build check | audit | AUDIT | | |
| V-17 | Error screens tell the truth | audit | AUDIT | | |
| V-33 | Rent never rests at Vallo | audit | AUDIT | | |
