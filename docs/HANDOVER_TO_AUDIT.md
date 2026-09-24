# Handover to the audit session: THE_HUNDRED merge is on main

**Written 24 September 2026 by the hundred build session.**

**Merging is done.** `main` is at `b514f416`, which fast-forwarded from `d3b8b47a`, so every audit commit is an ancestor and nothing of yours was overwritten. You can apply your three held database changes now.

**Where the audit won.** Your version won in every area you own: sign-in, security rules, RLS, the wallet, checkout, escrow and the build pipeline. The hundred's changes were re-applied on top only where they were additive.

**Checks on the merged tree:**
| Check | Result |
|---|---|
| typecheck | 0 errors |
| eslint | 0 errors |
| vitest | 518 files, 5,919 passed |
| check-migrations (`--base d3b8b47a`) | clean: no applied migration changed |
| check-migration-rules | clean |
| next build | succeeded |

**Hundred migrations: none are applied.** There are about 80 new files from `2026092411` to `2026092417`, and each was proven by a probe ending in a raise. They sort after every audit file. Apply them in timestamp order, with these exceptions:
- `20260924130000` (V-03) grants the two supply dates to `anon`. Your DB-10 step 2 takes them away. **Do not apply that grant without deciding between the two.**
- `20260924130300` and `130800` (agent_trust) go after the code is live. Both now count `CONFIRMED` or `COMPLETED`, which restores NEW-A1-03. That text change was not probed, because the permission system refused a further write probe.
- `20260924140000` (V-13) now carries your SUP-09 `open_rent_charge` body plus the frozen quote. That was probed.
- `20260924130400` (V-06) no longer redefines `listings_in_bounds`, so your NEW-A4-01 dispatcher stands.

**Silent reverts found and stopped before they could land:** `open_rent_charge`, `agent_trust` and `listings_in_bounds`. Separately, four migration read-backs that used `information_schema` grant views now use `has_table_privilege`.

**Please pick these up** (all are yours):
- `refuse_money_out_during_hold` raises "because its email address was changed by support" for every hold. Make it reason-neutral. SCUML holds write the neutral reason `plain`.
- `account_money_holds`: members can read `reason` and `hold_until` through RLS. Serve the member's read through a definer that returns only what may be shown.
- `admin_finish_email_recovery` overwrites a live `plain` hold's reason. Keep `plain`.
- Drop `order by l.featured` from `listings_in_bounds_exact` and `_public` when the column goes.
- `updatePassword` accepts any signed-in session without the current password.
- `subjectForIp` should group IPv6 addresses by /64.
- `social_profiles` exposes occupation, LGA and state codes to any member.
- The stays settlement sweep should skip bookings where `private.arrival_report_open` is true (V-91).
- The account-deletion purge deletes the mandate photo (SCUML item 17 keeps the record).
- `sharp` is declared only at the root.
- The state sweep and the check scripts are not in `npm run lint`.
- The last three over-long state lines are on the wallet screens.
- **Tests I edited to follow the merged behaviour** (each has a comment; please review): `listing-account-words`, `empty-notes`, `rent-market`, `provider-refusal`, `revoked-columns`, `claims`, `withdraw-saved-account`, and five more guard inputs.

**SCUML items 17, 7, 15, 20, 6 and 8/9 are on main** (migrations `20260924171000` to `20260924176500`). None of them is applied. Apply them in timestamp order after the hundred's files. They are additive: AFTER triggers that only enqueue, plus staff-only tables behind definers. The one thing that touches money is the hold-claims model. Items 6 and 8 each place a claim in `private.hold_claims` (owner `str` or `sanctions`). `hold_recompute` writes your `account_money_holds` row with the neutral reason `plain` and the latest live claim's end date. A `pg_cron` sweep (`hold_claims_sweep`) runs every minute. A live hold that is not `plain` (for example `not_me`) is never lengthened or relabelled.

**SCUML hand-offs, all in your areas:**
- `money_hold_until` should honour live `hold_claims` directly. Today there is a window of up to 60 seconds between a claim ending and the sweep recomputing the row.
- Account deletion should refuse while a compliance claim is live. The record is kept anyway (item 11), but the person should not be able to delete their way out of a hold.
- `admin_finish_email_recovery` overwrites a live `plain` hold (already listed above). This now matters for SCUML holds.
- RM050: the member-facing hold text must stay reason-neutral (see `refuse_money_out_during_hold` above).
- Members can read `hold_until` (above). A compliance hold's end date should not be readable by the member.
- `subjectForIp` IPv6 /64 (above) also governs the rate limits on the PEP answer and the mandate filing.
- `reinstate` counts listings diverted by the item 17 mandate grace sweep as restored. They were paused for a missing mandate, not by a moderator.
- The purge deletes the mandate photo (above). Item 17 requires the principal's identity record for five years.

**Preview URLs:** this session no longer requests preview or deployed URLs. Earlier proofs against previews read production and may explain the 403s you rolled back last night.
