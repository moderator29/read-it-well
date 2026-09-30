# Pending migration review, 30 September 2026

Reviewer: database review pass for the lead. Scope: every `20260930*` file in
`supabase/migrations/pending/` (12 files, including `c8`, which arrived during
the review, and `a5` and `a6`, which were renamed from `20260930090000` and
`20260930090100` to `20260930180000` and `20260930180100` during the review with
their contents unchanged). The older pending files (`b4`, `email_lifecycle_triggers.sql`,
`m08_landmarks_seed.sql`, `LANDMARKS.md`) are out of scope.

Method: I read every file and checked each table, column, type, enum value,
constraint, function signature, grant, trigger, cron job, Vault secret and
extension it names (including the ones only inside plpgsql bodies) against the
live project `uccixoonmbhrnyczyigt`, using read-only catalog queries. I checked
the global probes `db-06` (write-grant allowlist), `db-20` (policy helpers
executable by the evaluating role), `track-a-custody-retired`,
`info-schema-guards`, `new-a1-03` (review eligibility) and the review, agreement
and availability fixtures against each change. Nothing was applied.

## Summary

| # | File | Verdict |
|---|------|---------|
| 1 | `20260930090000_host_c2_calendar_sync_feeds_out_and_imports_in` | **HOLD**: breaks probe db-06 until the allowlist gains two lines |
| 2 | `20260930090100_host_c3_decide_by_reminders` | **APPLY** |
| 3 | `20260930090200_host_c4_reviews_reach_a_hotel_and_a_fair_contest` | **APPLY AFTER FIX (fixed, cf09f313)** |
| 4 | `20260930120000_c7_job_runs_out_of_the_trail` | **APPLY** |
| 5 | `20260930120100_c10_internal_accounts` | **APPLY** |
| 6 | `20260930120200_c14_console_key_break_glass` | **APPLY** (flagged: deletes money-lock credentials) |
| 7 | `20260930120300_c8_photo_hash_backfill_nightly` | **APPLY** |
| 8 | `20260930150000_b9_agreement_versions_keep_what_each_side_confirmed` | **APPLY** (flagged: trigger on `deal_agreements`) |
| 9 | `20260930150100_b7_lister_reply_band_only_when_the_record_supports_it` | **APPLY** |
| 10 | `20260930150200_b5_b10_viewing_and_rent_reminders` | **APPLY** |
| 11 | `20260930180000_a5_invite_codes_a_member_can_share` | **APPLY** |
| 12 | `20260930180100_a6_first_party_front_door_funnel` | **APPLY** |

### Order to apply

The files do not depend on one another. No two of them create or replace the
same object, and every version is unique now that a5 and a6 are renamed.
Apply them in version order:

1. host_c3 (`20260930090100`)
2. host_c4 (`20260930090200`). It must land before `room_bookings` is switched on.
3. c7 (`20260930120000`)
4. c10 (`20260930120100`)
5. c14 (`20260930120200`)
6. c8 (`20260930120300`)
7. b9 (`20260930150000`)
8. b7 (`20260930150100`)
9. b5_b10 (`20260930150200`)
10. a5 (`20260930180000`)
11. a6 (`20260930180100`)
12. host_c2 (`20260930090000`), after the db-06 allowlist change below. Its
    version sorts first, but nothing else depends on it, so it can go last or in
    its place once the probe is updated.

The latest applied version is `20260929204542`, so every version here sorts after it.

### Findings that apply to more than one file

* **Cron names.** None of `vallo_remind_hosts_to_decide`, `vallo_purge_job_runs`,
  `vallo_photo_hash_backfill`, `vallo_send_member_reminders` or
  `vallo_purge_funnel_events` exists yet, and none collides with a live job.
  pg_cron is installed in `pg_catalog`.
* **Custody name rule** (`track-a-custody-retired`). No new relation or function
  name matches `(wallets?|escrows?|pots?)` or `^held_payment`.
* **Default privileges.** In `public`, postgres gives `anon` SELECT and
  `authenticated` SELECT, INSERT, UPDATE and DELETE on new tables, and gives
  EXECUTE to both roles on new functions. No TRUNCATE is granted. Every new
  table below revokes what it does not want, and every definer function revokes
  PUBLIC and anon where it should.
* **private.notify(null, ...)** returns without writing, so a host or lister
  who cannot be resolved never makes a sweep raise.

---

## 1. host_c2: calendar sync, iCal out and iCal in

**Verdict: HOLD.** The only blocker is probe db-06. Otherwise it is ready.

**What it adds:** the tables `calendar_feeds`, `calendar_imports` and
`calendar_import_nights`, all with RLS and owner-only policies through
`private.owns_calendar_target`, which is granted to authenticated as db-20
requires. It also adds a cap trigger of 5 imports per target and the functions
`calendar_feed(token)` (anon, the token is the key),
`calendar_imports_due` and `apply_calendar_import` (both service_role only),
`remove_calendar_import` (owner) and `private.calendar_import_release`. Blocked
nights are written as `rate_calendar.closed` on every rate plan of a room type,
or as `availability.status = 'unavailable'` on a listing.

**Live schema:** every referenced column and type exists. That covers
`room_inventory.units_open` and `units_booked`, `rate_plans.active`,
`rate_calendar` with its PK `(rate_plan_id, date)` and a nullable `rate_minor`
(pricing falls back with `coalesce(rc.rate_minor, rp.rate_minor)`), and
`availability` with its PK `(listing_id, date)` and enum values `available`,
`booked` and `unavailable`. It also covers `bookings.status`
`PENDING`/`CONFIRMED`, `private.my_room_type_ids()`, `private.my_listing_ids()`,
`private.notify(uuid, notification_kind, text, text, text)`,
`extensions.gen_random_bytes` and `notification_kind 'booking'`. The only
trigger on `availability` (`availability_keeps_a_closed_night`) does not
interfere. `price_room_booking` and `reserve_room_nights` already refuse closed
nights. No payment, split or settlement is read or written.

**Why it is held:** it grants `authenticated` INSERT (columns) and DELETE on
`calendar_feeds`, and INSERT (columns) and UPDATE (`enabled`) on
`calendar_imports`. **Probe db-06 fails on any authenticated write grant that is
not on its allowlist** ("write grants not on the allowlist"). Each grant has a
policy behind it, so the grants are correct. The probe needs to be told:

```sql
      ('calendar_feeds', 'id'),
      ('calendar_imports', 'iu'),
```

Add those two lines to the `allow` list in `supabase/tests/probes/db-06.sql`,
in the same change that applies this file. Then apply it. I did not edit the
probe because it is outside the migration-only fix remit.

**Risks and notes for the lead (not blockers):**
* A room type is closed on every rate plan for the whole night, so one unit
  booked on Airbnb closes every unit of that room type on Vallo. That is the
  safe side for a double booking, but a multi-unit hotel loses sellable rooms.
* `was_closed` handling has edge cases. If the host closed only one of several
  rate plans, the import closes all of them and, because `was_closed` is true,
  never reopens them. If a host closes a night that an import already holds and
  the feed later drops it, the release reopens the host's own closure.
* SSRF: the host supplies the feed URL, and the app fetches it
  (`lib/host/calendar-sync.ts`, manual redirects, at most 3, with a URL check).
  The DB only enforces `https://`. The app-side guard is outside this review.
* There is no `notify pgrst`. Supabase's DDL watcher reloads the schema anyway.

## 2. host_c3: reminders before a request lapses

**Verdict: APPLY.**

**What it adds:** the ledger `decide_reminders` (RLS on, all privileges revoked,
no policy), `private.remind_hosts_to_decide()` (revoked from the API roles) and
a pg_cron job at `4,19,34,49 * * * *`.

**Live schema:** it reads `bookings.status`, `created_at` and
`accommodation_id`, `private.booking_host(uuid)`, `accommodations.name`,
`reservations.status` (a `booking_status` enum), `reserved_for`, `business_id`
and `listing_id`, `businesses.owner_id` and `name`, and `agents.user_id`. All
of them exist. `continue when not found` correctly follows the
`on conflict do nothing` insert.

**Risks:** the 48-hour window is hard-coded here and in the app
(`HOLD_WINDOW_HOURS`), and no DB cron runs `expire_booking_holds`. If the app
constant changes, this file has to change with it. The file changes no probe
surface.

## 3. host_c4: hotel reviews and a fair contest

**Verdict: APPLY AFTER FIX (fixed, commit cf09f313).**

**The defect I fixed:** the policy `review_contests_staff_select` called
`private.staff_can(...)`. That function is **revoked from authenticated**
(track_k, `20260925133647`, and live ACL `{postgres=X}`). A policy helper that
the evaluating role cannot execute raises 42501 on every statement against the
table, so the lister's own read of `review_contests` in `lib/host/reviews.ts`
would have failed, and **probe db-20 would fail**. I replaced it with
`(select private.is_staff())`, which is admin or super_admin, is executable by
authenticated, and is the policy-side staff predicate the repo already uses
(`tenancy_snapshots`, `principal_asks`, and others). Moderation-scope staff
still decide through `decide_review_contest`, which checks `staff_can` inside
the definer.

**What it adds:**
* On `reviews`: `accommodation_id`, `hidden_at` and `hidden_note`. `listing_id`
  becomes nullable, with `reviews_one_subject_chk` requiring exactly one spine.
  There are 0 review rows live, so the validation is trivial.
* On `review_responses`: `responder_id`. `agent_id` becomes nullable, with
  `review_responses_author_chk` requiring one of the two.
* New table `review_contests` (RLS on, select only, no write policy).
* New functions `contest_review` and `decide_review_contest`.
* Hidden reviews drop out of `listing_review_stats` and the catalogue ratings.
  An accommodation's rating is now computed.

**Existing objects replaced**, each compared with its live definition:
* Policy `reviews_insert_own`: same eligibility (guest, CONFIRMED or COMPLETED,
  check-out passed in Lagos, not a tenancy), plus "subject is the booking's own
  spine" and "hidden columns null". It is not weakened. `new-a1-03` still holds
  because `booking_is_tenancy` is kept and a listing insert is unchanged.
* Policy `reviews_select`: the public branch now also requires
  `hidden_at is null` and admits a published accommodation. Author, lister
  (`my_listing_ids` or `owns_accommodation`) and admins still see everything.
  This tightens the policy. Its helpers (`owns_accommodation`, `my_listing_ids`,
  `has_role`) are all executable by anon and authenticated, so db-20 is fine.
* `private.owns_review_listing`, `review_response_visible`, `weigh_review`,
  `notify_review`, `notify_review_response` and `stamp_review_response`: the
  same behaviour for listing reviews, extended to hotels. The search_path moves
  from `public` to `''` with fully qualified bodies. `CREATE OR REPLACE` keeps
  the existing ACLs.
* `public.listing_review_stats`: same signature, now skips hidden reviews.
* `private.catalogue_refresh_listing` and `catalogue_refresh_accommodation` are
  patched by string replacement. I verified both anchors in the live bodies.
  The listing anchor occurs twice (average and count), and `replace()` patches
  both, which is intended. The accommodation anchor
  (`...longitude),\n    null, 0,`) matches exactly. Both are idempotent.

**Other checks:** existing triggers on `reviews` handle `listing_id` null
without errors: `catalogue_on_listing_child` becomes a no-op on a null id,
`refuse_transaction_on_demo_listing` already checks `accommodation_id`, and
`label_review`, `scan_review` and `award_review_badges` do not read
`listing_id`. `reports` accepts `target_type 'review'`, category `other`, and
status `open`, `reviewing` and `resolved`. `weigh_report` ignores non-listing
reports. The `reports_02_claim` trigger can refuse `decide_review_contest` when
another staffer holds the queue claim. That is the correct behaviour, but it
surfaces as an exception.

**Risks and notes:**
* If a staffer resolves the linked report through `moderation_decide` instead
  of `decide_review_contest`, the contest stays `open` forever, and its
  one-open-per-review index then blocks any new contest on that review.
* Hidden reviews still count in `award_review_badges` (a count of all reviews).
  This is minor.
* The only probe surface it touches is db-06, where `reviews` stays `i` and
  `review_responses` stays `idu`, so nothing there changes.

## 4. c7: job runs out of the audit trail

**Verdict: APPLY.**

**What it adds:** `job_runs` (RLS on, select for admin and super_admin through
`has_role`, no write grant), `record_job_run` and `purge_job_runs` (both
service_role only), and cron `vallo_purge_job_runs` at `55 2 * * *`.
`cron.schedule` with an existing name updates the job, so re-running is safe.
It does not touch `audit_log`. The file is additive and idempotent, with a
read-back.

## 5. c10: internal accounts

**Verdict: APPLY.**

**What it adds:** `internal_accounts` (RLS on, admin select, no write grant), a
seed of the two QA ids (the same ids the probes use as member and admin), and
`admin_set_internal`, which requires a super admin and writes one `audit_log`
row. `audit_log` columns match, and the append-only triggers block only UPDATE,
DELETE and TRUNCATE. The file is idempotent (`on conflict do nothing`).

## 6. c14: break-glass for a lost console key

**Verdict: APPLY, flagged for the lead.**

**What it adds:** `admin_clear_console_keys(p_user, p_reason)`. It requires a
super admin, refuses the caller themselves, and requires a reason of at least 10
characters. It deletes the target's `money_credentials` and
`console_step_ups` and writes one audit row. The columns exist, and the
`money_credentials_announce_staff_key` trigger fires on the delete.

**Flag (money-adjacent):** `money_credentials` is the **money lock's** platform
key table, which also backs passcode unlock, not a console-only table. Clearing
it removes the target's money-lock key too. No payment or settlement function is
changed. However, `p_user` can be **any account**, not only staff. I recommend
that the lead either accepts this knowingly or adds a follow-up guard that the
target holds a staff grant or an admin role.

## 7. c8: nightly photo-hash backfill

**Verdict: APPLY.**

**What it adds:** `private.request_photo_hash_backfill()` (revoked from the API
roles), which calls `net.http_get(url, params, headers, timeout_milliseconds)`.
That signature matches the live one. The Vault secrets `vallo_site_url` and
`vallo_reconcile_secret` both exist, and the pattern is the same as
`private.request_push_drain`. The route
`apps/web/src/app/api/cron/photo-hash-backfill/route.ts` exports GET. The cron
is `5 2 * * *`.

**Note:** it reuses the reconciliation bearer, as the push drain already does.

## 8. b9: agreement versions

**Verdict: APPLY, flagged as money-adjacent (it only reads money columns).**

**What it adds:** `deal_agreement_versions` (RLS on, parties-only select, no
write grant), the AFTER trigger `deal_agreements_zz_snapshot_version` on
`INSERT OR UPDATE OF terms, terms_version, amount_minor`, and a backfill of the
current versions. There are 0 agreements live, so the backfill is trivial.

**Flag:** the trigger sits on `deal_agreements`, the payment gate's table, and
`crypto-pay`, `esc-02`, `esc-03`, `esc-14` and `new-a1-03` insert or update
it. It is a definer function that only upserts its own table. `terms`,
`amount_minor` and `terms_version` are NOT NULL, and the function returns early
below version 1, so I found no path where it raises. It runs after
`deal_agreements_00_honour_the_quote`, so it stores the normalised terms. It
does not change `agreement_amend_as` or any payment or settlement function.

## 9. b7: lister reply band

**Verdict: APPLY.**

**What it adds:** `lister_reply_band(p_lister)`, a definer function granted to
anon and authenticated. `conversations.agent_id` references `auth.users`, and
the app passes `agents.user_id`, so the ids match. `messages_conversation_idx`
`(conversation_id, created_at)` and `conversations_agent_idx` exist. It returns
only a band or null.

**Note:** the app calls it only when signed in, so the anon grant could be
dropped. It leaks nothing beyond the band.

## 10. b5 and b10: viewing and rent-due reminders

**Verdict: APPLY.**

**What it adds:** the ledger `member_reminders` (RLS on, all privileges revoked),
`private.send_member_reminders()` (revoked) and cron `7,22,37,52 * * * *`.

**Live schema:** it reads `inspection_requests.state = 'CONFIRMED'`, `slot_at`,
`requester_id` and `lister_id`, `listings.area` and `city`,
`profiles.display_name`, and `rent_payments.rent_period` (enum `month`,
`quarter` or `year`), `move_in` and `tenant_id`. It calls
`tenancy_snapshots.rent_payment_id`, `private.tenancy_end(date, rent_period)`
and `private.tenancy_void(uuid)`. All of them exist. There are 0 year or quarter
rent payments today. It moves no money.

**Note:** a slot just after midnight gets its "Viewing tomorrow" reminder about
5 hours ahead, which is cosmetic.

## 11. a5: invite codes

**Verdict: APPLY.**

**What it adds:** `referral_codes` (RLS on, owner select, no write grant) and
three functions. `my_referral_code` is for authenticated users and allots a code
on first ask. `referral_door` is for anon and returns only `found` and the
inviter's first name. `admin_referral_counts` is admin-only. The read-back is
safe to run with no JWT.

**Note:** any stranger can probe codes for first names through
`referral_door`. The code space is 32^6, so rate-limit `/join` in the app.

## 12. a6: first-party funnel

**Verdict: APPLY.**

**What it adds:** `funnel_events` (RLS on, all privileges revoked), a definer
`record_funnel_event` for anon and authenticated (`user_id` comes only from
`auth.uid()`), `admin_funnel_summary` (admin only), `private.purge_funnel_events`
and cron `50 2 * * *`. The step, locale, surface and door lists match
`apps/web/src/lib/funnel/steps.ts`. The identity sequence gives anon only
SELECT, so the db-06 sequence check passes.

**Note:** anon can insert rows without limit by varying `visit_id`, and only the
90-day purge bounds the growth. `/api/funnel` should rate-limit.

---

## APPLY list (in order)

`host_c3`, `host_c4` (fixed), `c7`, `c10`, `c14` (flagged), `c8`, `b9`
(flagged), `b7`, `b5_b10`, `a5`, `a6`.

## HOLD list

* `host_c2`: it adds authenticated write grants on `calendar_feeds` (i, d) and
  `calendar_imports` (i, u), which fail probe db-06 until
  `('calendar_feeds', 'id')` and `('calendar_imports', 'iu')` are added to its
  allowlist. Make that probe change in the same commit and then apply the file.
  The design notes in section 1 are for the host team and do not block it.
