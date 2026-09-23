# THE AUDIT: FIXES LEDGER

This ledger records how each finding in [THE_AUDIT.md](THE_AUDIT.md) was closed. For every finding it gives what changed, the evidence that it now works, the test that would have caught the defect, and the adversarial review of the fix. Each fix is written by one agent and reviewed by a different agent before it is integrated or applied to the live database.

**States**

| State | Meaning |
|---|---|
| FIXED | Changed, reviewed and proven |
| PARTIAL | Some of the finding is closed; the rest is described |
| DEFERRED | Not done, with the reason |
| FOUNDER | Waiting on something only the founder can do, with the exact step |
| ALREADY-FIXED | The defect was gone on current `main` before this work began |

**Release branch:** `claude/vallo-audit-app-store-jzmmd4`. Database changes are applied to the live project `uccixoonmbhrnyczyigt` as they are approved, and each one is mirrored as a file in `supabase/migrations/`. Code changes reach production only when this branch is merged into `main`.

Fixing started at 23 Sep 2026, from `77cf90a`: the audit branch with `origin/main` `e1395cf` merged in.

## Progress

Work is under way. This file is recompiled from each fixer's running ledger at every integration.
