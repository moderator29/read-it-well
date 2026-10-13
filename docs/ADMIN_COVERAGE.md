# Admin coverage (13 October 2026)

Live functions that are staff or admin actions or reads (names `admin_*`, `staff_*`, or bodies that check `is_staff`, `staff_can` or an admin role, in `public` and `private`, project uccixoonmbhrnyczyigt), against what `apps/web/src` calls. Helpers inside the database (`private.*` role checks, triggers, `str_is_staff` and the like) are not screens and are left out.

## Capabilities with a screen

All other staff functions are called from the app and sit on a desk the rail reaches: agreements, caution desk, guarantee, money history and summary, payments health, revenue, refund clock, email recovery, staff grant and revoke, key roster, person file, member notes, STR cases and filings, thresholds, KYC review, mandates, property join and split, safety holds, moderation decisions, queue take and assign, support escalation, recall, risk settings, front door funnel, field speed, watch list, reservations seating, restaurant seated fees, no-show decisions.

## Built in this pass

| Capability | Function(s) | Screen | Notes |
| --- | --- | --- | --- |
| Withheld review and report weight (V-58) | `weight_withheld_reasons`, `clear_weight_withheld` | `/admin/weight-withheld` (Moderation) | Admin only, as the functions are. Clear needs a 12 character note; audited in the function. |
| Blocked terms (AR-11) | `staff_blocked_terms`, `staff_blocked_term_put`, `staff_blocked_term_retire` | `/admin/blocked-terms` (Moderation) | The actions existed with no screen; the Moderation panel that said the list could not be read now links here. Moderation scope, so scoped staff get it too. |
| Call usage | `call_usage_summary` | `/admin/call-usage` (Operations) | 7, 30, 90 day range. Operations scope. |
| Ledger books | view `ledger_balances_by_book` (service role only) | panel on `/admin/money` | Read on the server with the service client behind the finance door. Unreadable is shown as unreadable, never zero. |
| Money record retention | `destroy_expired_money_records` (service role only, never called) | `/admin/retention` (Operations) | Live since 13 October 2026 (`20261013190011_ac01_money_retention_tool.sql`): dry run, then super admin destroy with typed `DESTROY` and the shown count. Not scheduled; runs only by hand. |
| Withdrawal fee schedule and quote | `withdrawal_fee_quote`, money policy tables | panel on `/admin/fees` | Flags the top band as unconfirmed. |
| Fee terms the lister accepted | `current_fee_acceptance` | panel on `/admin/listings/[id]` | |
| Lister's promotion purchases | `promotion_my_purchases` | `/agent/promotion` | Shown only when there are purchases. |
| Reservations, restaurant fees, risk settings, field speed | existing | rail rows | Pages existed but only Control K or an inner link reached them. |

Badges added: Record retention (accounts past retention), Restaurant fees (disputed seatings), Account recovery (open recoveries), Money (Guarantee claims).

## Not built, with the reason

| Function(s) | Why |
| --- | --- |
| `staff_chargebacks`, `chargeback_open`, `chargeback_move` | `/admin/chargebacks` is another track's. |
| `admin_referral_*`, `admin_rewards_payout_decide` | `/admin/referrals` is another track's. `admin_rewards_payout_decide` (release, refuse or fail an under-review rewards payout) is not in the list handed to that track: confirm it is on their page. |
| `closed_listing_count`, `closed_listing_reasons` | Not called by name; the same reads are done through `readClosedReasons` and the listings queue. No missing screen. |
| Operations panels "not readable by an admin yet": account deletions, business transfers, database jobs, reconciliation watch, notifications sent, email outbox; held event decisions (AR-10) | Built and live since 13 October 2026. The panels read `staff_ops_account_deletions`, `staff_ops_business_transfers`, `staff_ops_database_jobs`, `staff_ops_reconciliation`, `staff_ops_notifications`, `staff_ops_email_outbox` and `staff_ops_held_events` from `supabase/migrations/20261013192758_op01_operations_reads.sql` (probe `supabase/tests/probes/op01-operations-reads.sql`). If a function is ever missing, the panel falls back to its "not readable" note. Deciding a held event is still not built (request AR-10); only the held list and any recorded decisions are read. |

## Findings

- `destroy_expired_money_records` is documented as run by the daily account purge, but no cron job and no app code calls it, so the retention date has no effect today. Whether to schedule it is the founder's call; this pass only adds the manual, audited tool.
- Tests: `nav-coverage.test.ts` holds the rail to the route tree both ways (no orphan page, no dead row, no duplicate key), so a desk added without a rail row fails the suite.
