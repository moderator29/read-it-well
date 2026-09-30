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

## Applied, 30 September 2026

All twelve files were applied to `uccixoonmbhrnyczyigt` with the founder's
approval, one at a time and in the order below. Each apply returned success and
passed its own read-back. Each file then moved from `pending/` to
`supabase/migrations/` under the version the server recorded, and was recorded
in `APPLIED.txt`. Before each apply I re-read the file and confirmed it had not
changed since this review (host_c4 at cf09f313, c14 at b9ec4cf7). The db-06
allowlist gained `('calendar_feeds', 'id')` and `('calendar_imports', 'iu')`
in the same change that applied host_c2.

| Order | Draft version | Recorded version | Name |
|---|---|---|---|
| 1 | `20260930090100` | `20260930084237` | `host_c3_decide_by_reminders` |
| 2 | `20260930090200` | `20260930084402` | `host_c4_reviews_reach_a_hotel_and_a_fair_contest` |
| 3 | `20260930120000` | `20260930084450` | `c7_job_runs_out_of_the_trail` |
| 4 | `20260930120100` | `20260930084516` | `c10_internal_accounts` |
| 5 | `20260930120300` | `20260930084536` | `c8_photo_hash_backfill_nightly` |
| 6 | `20260930150000` | `20260930084615` | `b9_agreement_versions_keep_what_each_side_confirmed` |
| 7 | `20260930150100` | `20260930084642` | `b7_lister_reply_band_only_when_the_record_supports_it` |
| 8 | `20260930150200` | `20260930084714` | `b5_b10_viewing_and_rent_reminders` |
| 9 | `20260930180000` | `20260930084741` | `a5_invite_codes_a_member_can_share` |
| 10 | `20260930180100` | `20260930084814` | `a6_first_party_front_door_funnel` |
| 11 | `20260930090000` | `20260930084937` | `host_c2_calendar_sync_feeds_out_and_imports_in` |
| 12 | `20260930120200` | `20260930085021` | `c14_console_key_break_glass` (second draft, cleared by the re-review below) |
| 13 | `20260930160100` | `20260930102419` | `host_c4b_contests_close_with_their_report` (round 3, APPLY; file as at 17cdbec5) |
| 14 | `20260930130000` | `20260930102453` | `c5_lister_confirms_still_available` (round 3, APPLY AFTER FIX; file as at ee85de3e) |

Rows 13 and 14 were applied later the same day, after round 3. Both
read-backs passed. c5's behavioural probe ran against the one editable owned
listing live and was not skipped.

| 15 | `20260930160200` | `20260930104350` | `host_c2b_rooms_held_by_other_sites` (third draft, round 4 APPLY; file as at 75c75d07) |

Row 15 was applied after round 4. Before it ran, live had 0 calendar imports,
0 import nights and 0 closed rate_calendar rows, so the migration's refusal
guard did not fire. Its read-back passed. `calendar-holds.sql` moved from
`supabase/tests/pending/` to `supabase/tests/probes/`. I ran it against live
through execute_sql: it ended with `PROBE_OK calendar-holds`, which rolls back
everything it wrote. A check afterwards found no probe rows left behind.

| 16 | `20261001090000` | `20260930104610` | `m1_b11_b13_severity_and_saved_changes` (APPLY, verdict dba1d51c; file as at 6bb94258) |

Row 16 was applied after its review. Its read-back passed, including the
severity backfill of every existing notification. The notify and saved tests
pass (17 files, 199 tests).

The verdicts below are the review as it was written before the apply.

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

---

## Re-review: c14 second draft (commit b9ec4cf7)

**Verdict: APPLY.** This replaces the flagged APPLY for c14 in section 6.
Its position in the apply order does not change.

**What it adds:** the table `console_key_revocations` (a PK on `credential_id`
that references `money_credentials(credential_id)`, which is UNIQUE, with
delete cascade; RLS on, no policy, all privileges revoked from anon and
authenticated). It adds `private.refuse_revoked_console_key()` (definer,
`search_path ''`, revoked from the API roles) with a BEFORE INSERT OR UPDATE OF
`credential_id` trigger on `console_step_ups`. It also adds a reworked
`admin_clear_console_keys(p_user, p_reason)` with the same signature and the
same `keys_removed` key the staff page reads. It **deletes no money
credential**, and the read-back enforces that.

**Checked against the live schema:**
* `console_step_ups` has `user_id` (not null), `session_id` (not null),
  `credential_id` (text, **nullable**), `verified_at` and `expires_at`. It has
  **no triggers and no policies** today, and anon and authenticated have no
  grants on it, so only the service role writes it. The new trigger is its
  only trigger. `console_key_revocations` and the trigger function do not exist
  yet, so nothing collides.
* The function uses `staff_grants.user_id` and `revoked_at`,
  `user_roles.user_id` and `role`, the `audit_log` columns and
  `private.console_step_up_ok()`, and all of them exist.
  `private.has_role(actor, 'super_admin')` already requires a live proof when
  the actor is the caller, so the explicit `console_step_up_ok()` check repeats
  it. That is harmless.
* The authorisation is correct. It requires a super admin with a live proof,
  refuses the caller themselves, requires a reason of 10 to 500 characters, and
  accepts only a target with a live staff grant or an admin or super_admin role
  (anyone else gets `not_staff`, and the app has wording for that status). It
  writes one audit row.

**Money lock and passcode unlock are not blocked.** The only writer of
`console_step_ups` anywhere is `apps/web/src/lib/security/console-step-up.ts`
(a service-role upsert that always sets `credential_id`). No database function
inserts, updates or deletes it. The money-lock and passcode code
(`lib/security/money-step-up.ts`, `money-lock-guard.ts`) never touches it and
never reads `console_key_revocations`. The key row stays, so it keeps working
for money and unlock.

**Probes:** 29 probes insert console proofs, including `sec-console-mfa` and
the `console_probe_uid` preamble. All of them insert without `credential_id`,
so it is null and the trigger passes. `sec-console-mfa` extends a proof with
`update ... set expires_at`, and the trigger does not fire because it is
scoped to `update of credential_id`. The probe's "a member wrote their own
console proof" check still gets `insufficient_privilege`, because the privilege
check runs before any trigger. `db-06` is fine because the new table has no
write grants. `db-20` is fine because the new table has no policies. The
custody-name rule does not match. No probe calls `admin_clear_console_keys`.

**Notes (not blockers):**
* A proof written with a null `credential_id` is not checked. Only the service
  role can write proofs and the app always sets the id, so this gap exists only
  in principle. Making the column NOT NULL would break the 29 probe preambles,
  so leaving it nullable is the right call for now.
* The cascade means that if the target deletes a revoked key from their
  money-lock settings, its revocation row goes with it. Re-enrolling the same
  authenticator would then open the console again. This only matters to
  someone who already holds the target's session and money lock.
* As the file says, the app still owes one change: `ConsoleStepUp.tsx` offers
  enrolment only to a person with no key. It should count keys that are not
  revoked. Until then the person adds a second key from the money-lock
  settings.

---

## Review: host_c2b_c4b (`20260930160000_host_c2b_c4b_one_room_per_booking_elsewhere_and_contests_close_with_their_report`)

**Verdict: HOLD.** The C2b half would weaken the double-booking protection that
the live C2 (`20260930084937`) already gives. The C4b half is sound, and I would
apply it on its own if the Host team splits the file.

The review is against the live objects: C2 and C4 as applied, `room_inventory`
and its triggers, `reserve_room_nights`, `moderation_decide`, the `reports`
triggers and the probes. Live data today: 0 calendar imports, 0 import nights,
0 contests, and 990 `room_inventory` rows, 90 nights for each of 11 room types
(`2026-09-18` to `2026-12-16`).

### C2b: one room per booking elsewhere. HOLD

**What it changes:** it adds `calendar_import_nights.units_taken smallint`
(0 or 1), which is safe on the 0 live rows. It replaces
`private.calendar_import_release` and `public.apply_calendar_import`. For a
room type, an import no longer closes rate plans. It decrements
`room_inventory.units_open` by one where a room is free, and the release adds
it back, capped at `units_total`. The grants are unchanged (service_role only).
The live triggers `room_inventory_booked_by_function_only` and
`room_inventory_within_total` let the decrement through.

**Why it is held.** Live C2 closes every rate plan for the night, and that
closure holds whatever `room_inventory` says. C2b's hold lives only in
`units_open`. In three common cases that hold is lost for good:

1. **Nights with no inventory row.** Inventory rows exist only 90 days ahead,
   and an import accepts nights up to 540 days ahead. For a night with no row,
   the `update` touches nothing, so `took` is 0 and no conflict is counted. The
   night row is still recorded with `units_taken = 0`. Because the row exists,
   later pulls never retry it ("never taken twice"). When the host opens those
   dates later (`setNightsRooms` or the setup action upsert
   `room_inventory`), Vallo sells a room that Airbnb has already sold.
2. **The host's own inventory write erases the hold.** `lib/host/calendar-actions.ts`
   (`setNightsRooms`) and `lib/host/actions.ts` upsert an **absolute**
   `units_open` value. Setting 12 on a night where an import took 1 silently
   puts the room back on sale. When the feed later drops the night, the release
   adds 1 on top of whatever the host set. It is capped at the room total, but
   it can reopen a room the host deliberately closed.
3. **A night that was full when first pulled.** It is recorded with
   `units_taken = 0`, so the host is told once. If a Vallo guest later cancels,
   the freed room is never taken for the Airbnb booking, and Vallo can sell it
   again.

Case 1 alone covers every Airbnb booking more than 90 days out. That is the
kind of double booking C2 was written to prevent.

**What it needs (Host team):** keep the hold in the ledger, not in an absolute
number that other writers overwrite. Options:
* Enforce `units_open <= units_total - (rooms held by imports that night)` in a
  BEFORE INSERT/UPDATE trigger on `room_inventory`, so host writes and newly
  created rows respect imports.
* Or retry nights that took 0 on later pulls, with a per-night "conflict
  already told" flag so the host is not notified on every pull.
* Or keep the live C2 rate-plan closure as a fallback for nights with no
  inventory row.

Whichever they choose, the read-back should prove that a night with no
inventory row, and a host upsert, both still leave the room held.

### C4b: a contest closes with its report. Sound, APPLY when split

**What it changes:** it widens `review_contests_status_chk` to add
`withdrawn`. The live check name matches, and the 0 rows pass. It adds the
definer `private.close_contest_with_its_report()` (revoked from the API roles)
with an AFTER UPDATE OF `status` trigger on `reports`. When the linked report
becomes `resolved` or `dismissed`, the contest closes as `kept` and the lister
is told. When the report becomes `withdrawn`, the contest closes as
`withdrawn`. All three values exist in `report_status`.

**Checks:**
* `decide_review_contest` closes its contest before it updates the report, so
  the trigger finds nothing open and does nothing.
* `moderation_decide` never touches reviews, so "kept" is the only true outcome
  when a report is resolved on the Reports lane. Hiding stays with
  `decide_review_contest`.
* It does not conflict with the live `reports` triggers (`reports_02_claim` is
  BEFORE, and the others are on INSERT).
* The app already has wording for `withdrawn` (`lib/host/review-contest.ts`).

### Probes

The file adds no table grants and no policies, so `db-06` and `db-20` are
unchanged. No probe calls `apply_calendar_import` or reads `review_contests`,
and no probe updates `reports.status`.

---

## Review: c5 (`20260930130000_c5_lister_confirms_still_available`)

**Verdict: HOLD.** I fixed one clear defect: the missing read grant. One
integrity gap remains, and it needs a change to an existing guard function,
which goes back to the author.

**What it adds:** a nullable column `listings.lister_confirmed_at` and the
definer function `lister_confirm_available(uuid[])`. The function uses
`search_path ''` and qualified names. It refuses a caller with no `auth.uid()`
and refuses more than 200 ids. It updates only the listings where
`agents.user_id = auth.uid()` and the status is `PUBLISHED`. It writes one
audit row per call (`entity_id` is nullable). Execute is revoked from PUBLIC
and anon and granted to authenticated. The column does not exist live yet.

**How it behaves against the live `listings` triggers:** the definer runs as
`postgres`, so `guard_owner_write`, `listing_platform_facts_guard` and
`listings_needs_mandate_fact` step aside, because they act only for
`authenticated` and `anon`. RLS is bypassed because the function owner owns
the table. So the update does reach PUBLISHED rows. Two side effects: each
confirmation bumps `updated_at` (through `set_updated_at`), and each one
re-runs `catalogue_on_listing` for that listing, up to 200 per call.
`closed_listing_stays_closed` and the status-scoped triggers are not touched.

**Fixed (commit fb3c5726): the missing SELECT grant.** Since S1
(`20260929123603`), `authenticated` reads `listings` through an explicit
column list (89 of 101 columns; there is no table-level SELECT). The S1 file
itself says "a column added later is not readable by a member until it is
granted". The only reader, `lib/agent/freshness-read.ts`, called from the agent
dashboard with the caller's client, selects `lister_confirmed_at`. PostgREST
refuses the whole read with 42501, so the freshness card would never draw. I
added `grant select (lister_confirmed_at) on public.listings to authenticated`
and a read-back check for it. A confirmation date is not one of S1's private
facts (address, contacts, reviewer, fees, exact point). I did not grant it to
anon. Whether renters who are signed out see it is a product decision for the
lead.

**Still open, which is why this is held: members can forge the stamp.**
`authenticated` holds **table-level** INSERT and UPDATE on `listings`, so the
new column is writable directly. A column-level revoke cannot narrow a
table-level grant. No guard covers the new column:
* `guard_owner_write` freezes every column only once a listing has been through
  review, so on a published listing a direct write is refused. On a DRAFT,
  MORE_INFO_REQUIRED or REJECTED listing, and on INSERT, a lister can set
  `lister_confirmed_at` to any value, for example the year 2099. Its
  `reset_on_insert` list does not include the column.
* `listing_platform_facts_guard` resets `availability_confirmed_at` and the
  other platform facts on insert and refuses changes to them on update, but
  not `lister_confirmed_at`.

A forged future stamp survives review and publish, so the listing reads as
"confirmed" indefinitely. That also undermines any later demote-when-stale
rule (the open founder decision).

**The fix for the author:** `create or replace private.listing_platform_facts_guard()`
so that, for `authenticated` and `anon`, it sets
`new.lister_confirmed_at := null` on INSERT and raises `insufficient_privilege`
when `lister_confirmed_at` changes on UPDATE, exactly as it already does for
`availability_confirmed_at`. The definer runs as `postgres` and is unaffected.
The read-back should prove that a member's direct write is refused and the
definer's is not. I did not make this change because it replaces an existing
security function.

**Probes:**
* `db-01`, `db-02`, `db-03` and `new-a4-01` insert and update `listings` with
  explicit column lists and select named columns only, never `*` or
  `RETURNING *`. A nullable column with no default does not change them.
* `db-06` is unchanged, because `listings` is already `idu` and the column
  rides the table-level grant. `db-20` is unchanged because there are no
  policy changes.
* `revoked-columns.test.ts` checks member selects against the step-2 private
  lists. The new column is not on them, so it passes, and with the grant the
  read also works at runtime.

---

## Round 3 (30 September): c4b split, c2b second draft, c5 second draft

### `20260930160100_host_c4b_contests_close_with_their_report` (17cdbec5): **APPLY**

The substance is unchanged from the C4b half judged sound above: the same widened
`review_contests_status_chk`, the same `private.close_contest_with_its_report()`
body, and the same AFTER UPDATE OF `status` trigger on `reports`. The read-back
now also checks that members cannot execute the trigger function.

Checked against the live C4 (`20260930084402`): `review_contests` has
`report_id`, `lister_id`, `review_id`, `decided_by` and `decided_at`. The live
constraint is named `review_contests_status_chk` (`open`, `kept`, `hidden`), so
the drop and re-add hits the right one. The function and trigger do not exist
yet. There are 0 contests, so nothing needs revalidating.

### `20260930160200_host_c2b_rooms_held_by_other_sites` (2bdc64a4): **HOLD**

**The three oversell paths from the first draft are closed:**
1. A night with no inventory row gets its rate plans closed (`plans_closed`).
   No row means it cannot be reserved anyway. A row created later is born
   clamped by the BEFORE INSERT trigger, and the closure is lifted after the
   insert.
2. A host's write is clamped to `units_total - holds`. This covers a plain
   UPDATE and the PostgREST upsert alike.
3. A cancelled Vallo room: `release_room_nights` sets
   `vallo.inventory_writer`, the carried path computes
   `greatest(least(requested, ceiling), units_booked)`, and the freed room goes
   to the hold.

**Vallo's booking and payment path is not blocked.**
* `reserve_room_nights`, called by the `bookings_hold_and_release_rooms`
  trigger, keeps its own WHERE (`units_booked + p_rooms <= units_open`),
  evaluated on the already clamped `units_open`. A room held elsewhere is
  simply not free, which is the intended outcome, with the existing "Only x of
  n nights" error.
* The new trigger never raises. On the carried path it never sets
  `units_open` below `units_booked`, so `room_inventory_check` (booked ≤ open)
  cannot fire on a booking or a release.

**Trigger order:** BEFORE triggers fire by name. `room_inventory_booked_by_function_only`
runs first, then `room_inventory_open_within_total`, then `room_inventory_set_updated_at`,
then `room_inventory_zz_respects_import_holds`, so the total check sees the
raw request, as intended. The read-back's check of that order compares two
string literals, so it proves nothing, but the order itself is right.

**Why it is held:**
1. **A new oversell hole above the room total (must fix).** The trigger
   ignores `units_total` when no import holds the night
   (`ceiling := requested`). It also runs after the total check, and it does
   not fire when `units_held_back` changes. `authenticated` has table-level
   UPDATE on `room_inventory`, with the policy `room_inventory_owner_write`, so
   a host can write their own row's `units_held_back` directly (say 50). The
   next carried write, which is any guest's reservation on that night, sets
   `units_open := units_open + 50`, above `units_total`. `within_total` has
   already passed by then. Vallo then sells rooms that do not exist, and the
   guests pay for them. **Fix:** always compute the total and set
   `ceiling := greatest(least(requested, total - held), 0)`. Add
   `units_held_back` to the trigger's `update of` list so that a direct write
   is recomputed.
2. **The host's upsert loses their request (undersell, which contradicts the
   file's own promise).** The app writes inventory with an upsert
   (`setNightsRooms` in `lib/host/calendar-actions.ts`, and
   `lib/host/actions.ts`), which becomes INSERT ... ON CONFLICT DO UPDATE SET
   `units_open = EXCLUDED.units_open`. EXCLUDED carries the BEFORE INSERT
   trigger's clamped value (for example 11), so the UPDATE records a request of
   11 with `units_held_back = 0`. When the hold ends, the 12th room never
   comes back. The probe only tests a plain `update`, so it misses this.
3. **Two imports on a night with no row keep every room closed for good
   (undersell).** The second import sees the first import's closure as
   `prior`, so it records `was_closed = true`. When a row is created, the
   takeover trigger sees `was_closed` and does not lift the closure, but it
   clears `plans_closed` anyway, so no later release lifts it either. `prior`
   should ignore closures that belong to an import (`plans_closed` rows).
4. **CI: the probe arrived before its migration.**
   `supabase/tests/probes/calendar-holds.sql` is already committed in
   `probes/`. The db-probes job runs every file there against the live
   database, where `units_held_back` and the new `apply_calendar_import` do not
   exist yet, so it fails on every push until this file is applied. Move it
   out of `probes/` until then, or apply both together.

The probe should also cover the upsert path, a forged `units_held_back`, and
two imports on the same night with no inventory row. It needs no new db-06 or
db-20 entries (no new grants or policies). `units_held_back` rides the existing
`room_inventory idu` grant, which is exactly why point 1 matters.

### `20260930130000_c5_lister_confirms_still_available` (1c79c901): **APPLY AFTER FIX (fixed, ee85de3e)**

**Guard body diffed against the live `private.listing_platform_facts_guard()`
line by line:** it is identical, except for the two added lines
`new.lister_confirmed_at := null;` on INSERT and
`or new.lister_confirmed_at is distinct from old.lister_confirmed_at` on
UPDATE. The header is also the same: plpgsql, not a definer,
`search_path ''`, and the `current_user not in ('authenticated', 'anon')`
bypass. `CREATE OR REPLACE` keeps the owner and ACL. Nothing is dropped or
weakened. The definer `lister_confirm_available` runs as its owner, so the
guard lets its write through. My earlier `SELECT` grant and its read-back are
kept.

**Fixed: the behavioural read-back was hollow.** It picked any owned listing
(`limit 1`), and 64 of the 65 live ones are PUBLISHED. On those,
`listings_00_guard_owner_write` fires first and refuses with the same errcode
(42501, "has been through review"), so the check passed without ever reaching
the new guard. It now picks an editable listing (DRAFT, MORE_INFO_REQUIRED or
REJECTED, not closed); one DRAFT exists live. It counts as refused only on this
guard's own message ("these facts are written by the platform..."). With no
editable listing it skips with a notice, as before.

**Probes:** db-01, db-02, db-03 and new-a4-01 never write `lister_confirmed_at`,
so the guard's new line cannot fire for them. Their inserts get NULL anyway.
db-06 and db-20 are unchanged.

---

## Round 4: host C2b third draft (`20260930160200_host_c2b_rooms_held_by_other_sites`, 75c75d07): **APPLY**

Checked against the live schema: `room_inventory` (990 rows, with its
constraints, triggers, grants and policies), `rate_calendar` (1,980 rows,
**0 closed**, table-level grants: anon SELECT, authenticated IDU, policies
`rate_calendar_select` and `rate_calendar_write`), `reserve_room_nights` and
`release_room_nights` (the only functions that write `room_inventory`), the
readers of `rate_calendar`, and the probes. The live state has 0 calendar
imports and 0 import nights.

### The round-3 holds are all closed
1. **Nothing can go above the room total.** Every UPDATE now caps the request
   at `units_total` and then at `units_total - holds`, whether or not a hold
   exists. The trigger fires `OF units_open, units_booked, units_held_back`, so
   a direct write to `units_held_back` is recomputed as
   `requested - units_open`, and the carried path only ever reads a value the
   trigger computed. A forged value cannot open rooms that do not exist.
2. **The upsert keeps the host's request.** BEFORE INSERT leaves the proposed
   row as asked (`units_held_back = 0`), so the conflict update's
   `EXCLUDED.units_open` is the host's real number. The BEFORE UPDATE clamp
   then records what it held back. A row that is genuinely inserted is clamped
   in the same statement by `room_inventory_after_insert_holds`, which is
   AFTER INSERT and fires only for real inserts, never for the conflict path.
3. **Two imports on a night with no inventory row.** Closures now carry a
   source (`host_closed`, `import_closed`), and `closed` is derived from them
   by a trigger. An import only ever touches its own part, and only inside
   `set_import_closure`, which is flagged. A second import can no longer
   mistake the first import's closure for the host's, and lifting an import's
   closure never reopens the host's.

### rate_calendar: the new columns, the trigger, and every reader and writer
* **Readers are unchanged.** The only functions that read `rate_calendar` are
  `price_room_booking`, `reserve_room_nights`, `stays_search_exact`,
  `stays_search_public`, `calendar_feed`, and the two import functions this
  file replaces. All of them read `closed` (and `rate_minor`), and `closed`
  keeps its meaning. Pricing is untouched.
* **Writers:**
  * The host's price upsert (`calendar-actions.ts`) sends only
    `rate_plan_id`, `date` and `rate_minor`, so its conflict update leaves both
    source columns unchanged.
  * The host's Close and Reopen now write `closed` together with
    `host_closed`. The upsert records the host's closure even on a night an
    import already holds. A Reopen clears only the host's part.
  * A plain `insert ... closed true`, as in the room-bookings probe line 52,
    becomes a host closure, so the probe's "closed night refuses a booking"
    still holds.
  * A forged `import_closed` from a member is ignored, because outside the
    flag the trigger keeps `old.import_closed`.
* **Grants and RLS:** the new columns ride the existing table-level grants.
  Authenticated needs UPDATE on `host_closed`, which the app now writes, and
  has it. The existing owner policy `rate_calendar_write` still gates rows.
  Anon can read the new flags through the table-level SELECT. `closed` is
  already public, so the only new fact exposed is that a closure came from
  another site. That is minor, and noted for the lead.
* **Backfill:** `update ... set host_closed = true where closed and not
  host_closed and not import_closed` runs before the trigger exists. It only
  sets a new column and is idempotent. Live it touches 0 rows (0 closed), so
  it is non-destructive and correct. The read-back then proves
  `closed = host_closed or import_closed` for every row.

### Trigger order across both tables
* On `room_inventory`, BEFORE triggers fire by name:
  `booked_by_function_only`, then `open_within_total`, then
  `set_updated_at`, then `zz_respects_import_holds`. The total check sees the
  raw request, so an over-total request is still refused. The read-back now
  checks the real `pg_trigger` order (BEFORE triggers only), not two string
  literals.
* The AFTER INSERT trigger calls `refresh_import_holds`, which issues an UPDATE
  on the same row: the BEFORE UPDATE triggers run, carried by the flag. It
  then calls `set_import_closure(false)`, which updates `rate_calendar`: its
  single BEFORE trigger runs, flagged `open`. Neither table's trigger writes
  back to the other through a trigger, so there is no recursion. Both flags
  are transaction-local and reset after use.

### reserve_room_nights and checkout cannot be refused or broken
* `bookings_hold_and_release_rooms` calls `reserve_room_nights`, whose own
  WHERE (`units_booked + p_rooms <= units_open`) is evaluated on the
  already-held `units_open`. A room another site holds is simply not free,
  with the existing "Only x of n nights" message.
* The trigger never raises. On the carried path it sets
  `units_open := greatest(least(requested, ceiling), units_booked)`, so
  `room_inventory_check` (booked ≤ open) cannot fire on a reservation or a
  release. `within_total` does not fire on a booking-function write, because
  the SET list is `units_booked` only.
* For a room type with no linked calendar, reserve, release and host writes
  give exactly the same `units_open` as today (`requested`, `held_back = 0`),
  and the AFTER INSERT trigger returns at once.
* On nights with no inventory row, the import's fallback closure changes
  nothing for Vallo guests, because reserve already refuses a night with no
  row.

### Dry run of `supabase/tests/pending/calendar-holds.sql` against the live schema
I traced every step by hand against the live constraints and triggers. **I
expect it to pass.**
* **Setup:** as postgres, `guard_owner_write` steps aside. `business_kind
  'hotel'`, `room_category 'double'` and `cancellation_policies` (2 rows) all
  exist. The inventory insert passes `within_total` (3 of 3), and the AFTER
  INSERT trigger returns because no import exists yet. `reserve(3)` fills
  night +3.
* **First pull:** +3 becomes 3 open and 3 booked, a clash (3 > 3 - 1), so
  there is 1 conflict. +5 becomes 2 open with 1 held back. +400 has no row,
  so the import closes it.
* **Plain update to 3:** clamped to 2.
* **Release of 1 on +3:** carried path, 2 open = 2 booked.
* **Row created at +400:** clamped to 2, and the closure is lifted.
* **Second pull:** there is no longer a clash, so nothing new is told.
* **An update to 4:** `within_total` refuses it with `check_violation`.
* **Dropping everything:** +5 and +400 go back to 3 open with 0 held back.
* **Round 3:**
  * The host-closed +402 becomes a host closure, and the import adds its part.
  * The upsert on +5 with two imports gives 1 open and 2 held back.
  * The forged 50 on +6 is recomputed to 0, and reserve leaves 3 on sale.
  * +410 with two imports is closed as the imports' closure. The upsert
    creates the row, clamps it to 1, and lifts the closure.
  * Releasing both imports brings +5 back to 3 open with 0 held back, and the
    host's closure on +402 stays.

The probe waits in `tests/pending/`, which CI does not run, so it can move to
`probes/` once the migration is applied.

### Notes (not blockers)
* **`calendar_feed` (the live C2 export)** still hides a night held by an
  import unless it has `was_closed`. `was_closed` is now always false for room
  types, so a host's own closure on a night another site holds is left out of
  Vallo's export feed. That night is already booked on the importing site, so
  the effect is small. A later change could read `host_closed` instead.
* **The migration refuses to run if any room-type import night already
  exists.** The live C2 is on, so if a host links a calendar before this lands,
  the migration has to be converted by hand. There are 0 today, so apply it
  soon.
* On every booking the trigger adds one `room_types` lookup and one count of
  import nights. Both are indexed, and the cost is negligible at today's scale.

---

## Review: M1 B11 and B13 (`20261001090000_m1_b11_b13_severity_and_saved_changes`, 6bb94258): **APPLY**

Checked read-only against the live schema.

**B11, notification severity**
* **Column and constraint:** it adds `notifications.severity`, nullable, with a
  CHECK of `action`, `update` or `fyi`. The constraint is added by name only if
  it is missing. The backfill touches the 60 live rows. `notifications` has
  only AFTER INSERT triggers (`push_enqueue`, `whatsapp_enqueue`), so the
  backfill UPDATE fires nothing.
* **Stamping trigger:** the new BEFORE INSERT trigger runs before those two
  AFTER INSERT triggers and only fills a null.
* **`public.notification_severity`:** SQL, `immutable`, `search_path ''`. It
  reads only its arguments, and the enum values it names (`message`,
  `social`, `booking`) exist.
* **`private.stamp_notification_severity`:** `search_path ''`, fully qualified,
  not a definer. The rows are written by `private.notify` (a definer running as
  postgres) and by the service role, and both can execute the severity
  function.
* **Grants:** `notifications` already has table-level SELECT for authenticated,
  so `grant select (severity)` changes nothing and is harmless. The UPDATE
  grant is still column-level on `read_at` only, so the new column is not
  writable by members. No policy is changed.

**B13, `listing_changes`**
* **Table access:** RLS is on. The only policy is SELECT `to authenticated`,
  scoped to the caller's own rows in `saved_items`, whose `user_id` and
  `listing_id` columns and `saved_items_listing_idx` index exist. Anon has
  everything revoked, and authenticated has INSERT, UPDATE and DELETE revoked,
  so **db-06** is unaffected. The policy depends only on `auth.uid()`, so
  **db-20** is fine.
* **`private.record_listing_change`:** AFTER UPDATE OF the price, `status` and
  `closed_at` columns on `listings`. Definer, `search_path ''`, fully
  qualified, execute revoked from PUBLIC, anon and authenticated. Every column
  it reads exists: `listing_intent` (an enum, compared as text),
  `sale_price_minor`, `rent_amount_minor`, `rate_minor`, `closed_at`, `is_demo`,
  and `title`, which is NOT NULL, so the notification text cannot be null. It
  never notifies the lister, and never on a demo listing.
* **`private.record_viewing_windows`:** AFTER INSERT on `viewing_windows`.
  `active` and `listing_ids uuid[]` exist, and the table has no triggers today.
* **Idempotency:** `if not exists`, `create or replace`, `drop ... if exists`
  and the constraint guarded by name make it safe to run twice. The read-back
  raises on failure.

**Hot tables, performance and payment**
* **Payment tables and functions:** nothing is added to them. The functions
  that update `listings` status, `closed_at` or price are the moderation and
  agent sweeps, `close_listing` / `close_listings`, `reopen_listing` and
  `principal_apply_answer`. None is a payment or settlement function, so the
  new trigger never runs inside a charge.
* **Cost per listing write:** it runs only when a price, `status` or
  `closed_at` column is in the SET list. It does one `agents` lookup and one
  indexed `saved_items` scan (16 saves live). It notifies only on a price move
  while live, or on leaving live.
* **Bulk writes:** `suspend_agent` or `admin_retire_demo_listings` can fan out
  one notification per saver per listing. Demo listings are excluded. This is
  fine at today's scale.
* **Failure risk:** the trigger has no raise, and every value it writes is
  NOT NULL-safe. The only way it could fail a listing write is if
  `private.notify` or the push and WhatsApp enqueue triggers failed, and those
  already run on every notification.

**Probes:** the new column is nullable and there is no new write grant, so
db-06's "member inserted a notification" check is still refused. Probe
listings are never saved, so no probe counts extra notifications, and the
extra `listing_changes` rows roll back with the probes. The name does not
match the custody rule.

**Notes (not blockers):**
* A lister who takes a live listing back to DRAFT to edit it tells every saver
  "no longer available", and no "back" message follows. Consider ignoring
  PUBLISHED to DRAFT to PUBLISHED, or debouncing it.
* Switching a listing between rent and sale reads as a "price change".
* `notification_severity` and `stamp_notification_severity` keep the default
  EXECUTE for PUBLIC and anon. Both are harmless (one is pure, the other is a
  trigger function), but revoking them would match the house style.

---

## Review: C13 (`20260930150000_c13_alert_acknowledged_by_and_skipped_runs`): **APPLY**

Checked read-only against the live schema.

* **`risk_alerts` columns:** it adds `acknowledged_by uuid`, which references
  `auth.users` with on-delete set null, and `acknowledged_at timestamptz`. Both
  are nullable with no default, so on the 798 live rows the change is only a
  catalog change. It adds one index and the named CHECK
  `risk_alerts_acknowledged_has_a_time`, which is added only if missing and
  passes because every live row is null.
* **RLS:** unchanged. The single live policy `risk_alerts_admin_all` (for all
  commands, admin or super_admin through `has_role`, which requires the console
  proof) is the only door. The read-back now fails if a second policy ever
  appears.
* **Grants:** unchanged. The existing table-level grants are anon SELECT and
  authenticated SELECT, INSERT, UPDATE and DELETE, all gated by that policy.
  The new columns ride them, and `risk_alerts` is already `idu` in db-06.
* **Guard trigger:** `private.risk_alert_acknowledgement_is_the_caller`
  (security invoker, `search_path ''`, execute revoked from PUBLIC, anon and
  authenticated) runs BEFORE UPDATE OF `acknowledged_by`. It lets a signed-in
  caller acknowledge only as themselves, and never clear an acknowledgement.
  The database stamps `acknowledged_at`. A write with no `auth.uid()`
  (service role or job) is left alone. The console's `acknowledgeRiskAlert`
  writes through the admin's own client and adds `.is('acknowledged_by', null)`,
  so the first person keeps it. The only other trigger on the table is
  `risk_alerts_page_on_high`, which is AFTER INSERT, so the two do not
  interact.
* **`job_runs` outcome:** the live constraint is named `job_runs_outcome_check`
  (`ok`, `attention`, `failed`, `repeat`), and the drop and re-add adds
  `skipped`. There are 0 live rows. `record_job_run` is identical to the live
  body except for `'skipped'` in the list. It stays a definer with
  `search_path ''`, and its ACL (`postgres` and `service_role` only) is re-stated
  and unchanged.
* **Idempotency and read-back:** everything is guarded (`if not exists`,
  constraints guarded by name, `create or replace`, `drop trigger if exists`),
  and the read-back raises for each part. No probe references these objects,
  and no payment table is touched. Version `20260930150000` no longer collides
  with anything, because b9 was recorded as `20260930084615`.

**Notes (not blockers):**
* The guard fires only when `acknowledged_by` changes. An admin can therefore
  write `acknowledged_at` alone, or replace another admin's name with their
  own, straight through the API. Only admins can reach the table and the app
  never does this, but firing the trigger on `update of acknowledged_by,
  acknowledged_at` and refusing a change from one non-null person to another
  would make "first person" a database fact.

**No push-language migration from lane 4 was in `pending/` at the time of
review.**
