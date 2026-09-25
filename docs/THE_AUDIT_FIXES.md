# THE AUDIT: FIXES LEDGER

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

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

Compiled 2026-09-24 07:45 UTC from the six fixers' running ledgers.

## The orchestrator

### Orchestrator: gates, merges and the post-release steps

**Gates.** Each head was run in an isolated worktree, a clean `npm ci` of the lockfile tree, before it went anywhere. Every `main` push was a gated head.

| Head | Typecheck | Lint | Unit and component tests | Build |
|---|---|---|---|---|
| e6b2b23c | tsc 0 | lint 0 errors, 333 warnings (cap 333) | vitest 342 files, 4613 passed, 1 skipped, three consecutive full runs, all green | next build exit 0 |
| e286837c | tsc 0 | lint 0 errors, 330 warnings | vitest 367 files, 4755 passed, 1 skipped, two consecutive runs | next build exit 0 |
| 8033d764 | tsc 0 | lint 0 errors, 330 warnings | vitest 372 files, 4777 passed, 1 skipped | next build exit 0 |
| 33694b5a | tsc 0 | lint 0 errors, 330 warnings | vitest 386 files, 4814 passed, 1 skipped | next build exit 0 |
| 71fe9eb8 | tsc 0 | lint 0 errors, 330 warnings | vitest 387 files, 4825 passed, 1 skipped | next build exit 0 |
| 2b25c4b7 | tsc 0 | lint 0 errors, 330 warnings | vitest 389 files, 4832 passed, 1 skipped | next build exit 0 at 79d6d296 (only a test changed after) |
| 04699595 | tsc 0 | lint 0 errors, 330 warnings | vitest 394 files, 4849 passed, 1 skipped | next build exit 0 |
| f99b1a28 | tsc 0 | lint 0 errors, 330 warnings | vitest 398 files, 4867 passed, 1 skipped | next build exit 0 |

**Release to `main`.** The founder asked for all mergeable work to go to `main`. It went as fast-forwards of gated heads: e286837c, 8033d764, 6da009b7, 71fe9eb8, 2b25c4b7 and 04699595. Production (www.vallospaces.com) served e286837c from `dub1` with every script nonced (OPS-09 and OPS-15 checked on live).

**Post-release database steps (24 September, after the deploy):**
- Live and kept: m10 (20260924070606), m5b (20260924070608), DB-05 step 2 (20260924070810; DB-06 allowlist updated, `db-05-step2.sql` PROBE_OK).
- Applied, then rolled back after about two minutes: NEW-A4-01 step 2 (20260924070623) and DB-10 step 2 (20260924070725). Both probes answered PROBE_OK, but a deployment of the V-03 branch reading production failed 401 and 403 on its listing select. The grant halves were reverted by 20260924071045.
- m12b (20260924070835) dropped `wallet_pots.balance_minor`, and a pots read failed 400. The column was restored at 0 by 20260924071133; no pot existed, so nothing was lost.
- Held until the founder stops that deployment. Agent 1's guard test (`revoked-columns.test.ts`) proves the release's own reads are safe under both grant changes.

**Pushed or not.**
- f99b1a28 (Agent 4's SUP sweep and SUP-09) passed every gate but was not pushed: the session's permission check refused it as a possible credential leak.
- The trigger was the two QA account ids in the new probes. The same ids are already in 65 files on `main`.
- Whether those ids may stay in the repository is a founder decision (section 11).

## Agent 1: the live holes and the supply blockage

### Ledger, Agent 1 (live holes and the supply blockage)

### UX-24, anon could read members' occupation / LGA / state / home area from social_profiles
- STATE: FIXED (applied to live 20260923231826 after Agent 2 APPROVE)
- RE-VERIFIED: live relacl `anon=arwd/postgres` (table-level SELECT; no column ACLs), so every column incl. occupation_code/lga_code/state_code/home_area_id readable by anon. Old-DB probe run: `PROBE_FAIL ux-24: anon read occupation_code`.
- APP READS CHECKED: every `.from("social_profiles")` in apps/web/src on origin/main (e1395cf) and in fix/a1: all run behind the proxy's session gate (PUBLIC_SEGMENTS identical on both; no public route or /api route reads social_profiles; (dev)/preview harness uses fixtures and 404s in prod). PROFILE_COLUMNS (includes home_area_id) and people-queries (occupation/lga/state) run as authenticated only. No DB view reads the table; every function that does is SECURITY DEFINER.
- CHANGE (pending): `revoke select on public.social_profiles from anon; grant select (20 display columns) ... to anon;` (column revoke alone is a no-op against a table-level grant). Draft: scratchpad/work/fix-a1/ux24_migration.sql
- EVIDENCE: rolled-back DDL + probe: `PROBE_OK ux-24` (anon control over display columns ok; each of the 4 columns and `select *` refused 42501; member reads all directory columns). No migration row recorded.
- LIVE AFTER APPLY: probe run against live → `PROBE_OK ux-24`. Over the wire, anon with the publishable key, verbatim:
  - `GET /rest/v1/social_profiles?select=occupation_code` → `{"code":"42501","details":null,"hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.social_profiles TO anon;","message":"permission denied for table social_profiles"}`
  - `select=lga_code,state_code` → same 42501 body; `select=home_area_id` → same; `select=*` → same
  - `select=handle,display_label&limit=1` → `[{"handle":"<redacted>","display_label":"<redacted>"}]  [HTTP 200]`
- CODE (belt and braces): `loadPublicProfile` has an anon branch (signed-out reader) that selected PROFILE_COLUMNS incl. home_area_id; it is behind the proxy today, but a lapsed session would have made /u/<handle> refuse. It now selects ANON_PROFILE_COLUMNS (no denied column). Commits 56f09994, f4e2982a.
- COMMITTED: supabase/migrations/20260923231826_ux24_anon_reads_no_occupation_or_place_from_social_profiles.sql (56f09994)
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/ux-24.sql (47a3c9a3); apps/web/src/lib/social/profiles-anon-read.test.ts (3 tests; the signed-out render test fails on the old select, verified)
- NOT IN SCOPE HERE: UX-24 steps 2-4 (privacy toggle, sign-up notice, /u shows name+handle only).
- REVIEW: Agent 2 APPROVE (reviews/a1-batch1-by-a2.md); applied.

### DB-01, member self-publishes / self-verifies a business (+ accommodations, room_types)
- STATE: FIXED, applied to live as 20260923232741 (amended v2, approved by Agent 2 in reviews/a1-batch1b-2-by-a2.md); the live function body's md5 matches the committed file (a1cd81b8…); `PROBE_OK db-01` against live. Commit a34eec76.
- RE-VERIFIED: old-DB probe `PROBE_FAIL db-01: member inserted a PUBLISHED business`. DB-01 step 7: businesses with tier>0 and no verification check = none (0 of 7).
- CHANGE (pending): SECURITY INVOKER `private.guard_owner_write()` + BEFORE INSERT OR UPDATE triggers `*_00_guard_owner_write` on businesses, listings, accommodations, room_types (00 so they fire before derive_badge / assign_reference / fill_listing_role / sync triggers). Passes when current_user not in (authenticated, anon) (postgres, service_role, every definer function) or caller has admin/super_admin. Owner INSERT: status DRAFT|SUBMITTED only; moderator columns reset. Owner UPDATE: moderator column change → 42501; status: same / →DRAFT (not from SUSPENDED) / DRAFT|MORE_INFO_REQUIRED|REJECTED→SUBMITTED; submitted_at stamped by guard. Draft: scratchpad/work/fix-a1/db01_02_migration.sql
- rate_plans / restaurant_profiles / service_windows: assessed, no status or moderator column; public visibility follows the parent business/room status, now guarded. No trigger added.
- star_rating on accommodations deliberately NOT protected: the host wizard writes it (lib/host/actions.ts saveProperty); it is the owner's own claim.
- WRITE PATHS CHECKED (identical on origin/main and fix/a1): host saveHostDraft insert/update, submitHostApplication, saveProperty, addRoomTypeDraft, stays-setup room upsert; business-transfer closeBusiness (accommodations + business → DRAFT); admin business-actions approve/publish/accommodation/room publish (admin role passes); every DB function that writes these tables is SECURITY DEFINER (fan_out_*, suspend/reinstate_agent, sync_business_verification_tier, respond_to_business_transfer, purge, admin_retire_demo_listings).
- EVIDENCE: rolled-back migration + probe → `PROBE_OK db-01` (owner draft/edit/submit/close/unpublish ok; PUBLISHED insert, tier/verified/reviewer/published_at/PUBLISHED/APPROVED updates refused 42501; forged draft kept tier 0 verified false; property+room publish/feature refused; admin publish tier 3 → verified=true, property and room published). Rolled back: function absent, 0 probe rows, no migration row.
- TEST: supabase/tests/probes/db-01.sql (47a3c9a3)
- REVIEW:

### DB-02, lister self-publishes / features / stamps a listing
- STATE: FIXED, same migration 20260923232741; `PROBE_OK db-02` against live. Commit a34eec76.
- RE-VERIFIED: old-DB probe `PROBE_FAIL db-02: owner inserted a PUBLISHED listing`.
- Protected: featured, published_at, reviewed_at, reviewer_id, review_notes, address_verified_at, physically_inspected_at, ownership_verified_at, mandate_verified_at, verified_by, supply_verified_by, listing_fee_minor/rate_id/charged_at, is_demo, demo_retire_after, reference, listing_role, firm_id, agent_id. Insert resets listing_role to null so listings_fill_listing_role derives it; firm_id on owner insert refused (no owner path sets it; firms attached by staff).
- WRITE PATHS: agent saveDraft insert/update (descriptive/price columns only), submitListing, unpublishListing, deleteListing; admin reviewListing as authenticated.
- EVIDENCE: `PROBE_OK db-02` (QA member made an agent in-transaction; 15 update attacks each refused 42501; stamped draft reset; stranger update rows=0; admin approve + publish with stamps landed; owner unpublish + delete draft ok). Rolled back: 0 agent rows for the member, 0 probe listings.
- DB-02 step 6 (reference/announce only on staff publish) not done: with the guard an owner cannot reach PUBLISHED, so those triggers only fire on a staff publish.
- TEST: supabase/tests/probes/db-02.sql (47a3c9a3)
- REVIEW:

### DB-01 / DB-02 amendment (after Agent 2 CHANGES REQUIRED)
- Reviewer's ATTACK A: the owner could rewrite a PUBLISHED listing's title/description/rent (1 kobo) with no re-review. Also: owner DELETE of a PUBLISHED listing.
- AMENDED GUARD (scratchpad/work/fix-a1/db01_02_migration.sql; v1 kept as db01_02_migration.v1.sql):
  - listings/businesses: content may change only while OLD status is DRAFT|MORE_INFO_REQUIRED|REJECTED; otherwise the only permitted difference is status/updated_at/submitted_at (i.e. take it back to DRAFT).
  - accommodations/room_types: keyed on the PARENT BUSINESS status, not their own (closeBusiness leaves rooms PUBLISHED while the host edits them as a draft). business_id / accommodation_id added to protected.
  - Triggers now BEFORE INSERT OR UPDATE OR DELETE. DELETE: listing/business only while DRAFT; property/room while DRAFT or business editable. Cascades run as the table owner (not an API role) and pass.
- LEGITIMATE OWNER WRITES CHECKED (grep of every insert/update/upsert/delete on the four tables in apps/web/src, identical on origin/main):
  - listings: saveDraft insert/update (gated EDITABLE in app), submitListing (EDITABLE→SUBMITTED), unpublishListing (APPROVED|PUBLISHED→DRAFT, status only), deleteListing (DRAFT only). No photo/cover/calendar/counter path writes the listings row (photos and amenities are child tables; calendar-actions reads only).
  - businesses: host saveHostDraft (EDITABLE only), submitHostApplication, closeBusiness (status→DRAFT only).
  - accommodations: host addAccommodationDraft insert/update (editableBusiness gate), closeBusiness (PUBLISHED|APPROVED→DRAFT, status only, runs before the business goes to DRAFT, allowed as a status-only change).
  - room_types: host addRoomTypeDraft insert, stays-setup upsert (editableBusiness gate).
  - Admin paths (requireAdmin, authenticated) pass by role. Every DB function/trigger writing these tables is SECURITY DEFINER.
- EVIDENCE: rolled-back amended migration + probes: `PROBE_OK db-01`, `PROBE_OK db-02`. New refusals: submitted business/listing edit; live business rename, live property description, live room reprice, live room delete, live business delete; live listing rewrite (ATTACK A verbatim) and live listing delete. New controls: close then edit the still-PUBLISHED room under the draft business, edit after close/unpublish, delete a draft business. Rolled back: function absent, 0 probe rows, no migration row.
- COMMITS: ba13376f (probes).
- NOT CHANGED (ledgered): see NEW-A1-01, NEW-A1-02.

### NEW-A1-01, a live listing's photos, videos and amenities (and the stored photo bytes) change without re-review
- SEVERITY: HIGH (latent: 0 real listers today). It bypasses moderation on public content, the same class as DB-02's ATTACK A. Proved on live after DB-02: `PROBE_FAIL new-a1-01: owner added a photo to a live listing`. A second vector the table rule alone would miss: storage policies let the owner UPDATE (overwrite) or DELETE any object under their uid folder, so the bytes behind an approved photo could be swapped in place.
- STATE: FIXED, Agent 2 APPROVE (reviews/a1-batch2b-by-a2.md); applied to live as 20260923234045 with the reviewer's recommended indexes (listing_photos.storage_path, listing_videos.storage_path, listing_videos.poster_path); `PROBE_OK new-a1-01` against live; commit 62a7eac3. Was: Draft scratchpad/work/fix-a1/new_a1_01_migration.sql. It adds a SECURITY INVOKER guard_listing_child_write trigger (00-named, BEFORE I/U/D) on listing_photos, listing_videos and listing_amenities: API non-staff writes only while the parent listing is DRAFT, MORE_INFO_REQUIRED or REJECTED. It adds a definer private.listing_media_locked(name) (EXECUTE for authenticated, which the storage policies need). It re-creates the four owner storage UPDATE/DELETE policies on listing-photos and listing-videos with `and not listing_media_locked(name)`, keeping roles={authenticated}.
- APP FLOWS CHECKED: every listing photo, video and amenity write in listings-actions.ts is already gated on EDITABLE (LOCKED_MESSAGE). deleteListing deletes the listing row first, which cascades the photo rows as owner, then removes the storage objects, which are no longer referenced, so they are not locked. Uploads use INSERT; only ApplyWizard and UploadCard use upsert, and those write document buckets, not listing media.
- NOT COVERED, by design: business_photos and accommodation_photos. The host flow files venue photographs at ANY status on purpose (lib/host/actions.ts ownedBusiness: "the moment a venue is APPROVED or PUBLISHED is exactly when its photographs arrive").
- EVIDENCE (rolled back): `PROBE_OK new-a1-01`. Covered: draft controls; after publish, refusals of photo add, reorder and remove, amenity add and remove, and storage overwrite (rows=0); service-role removal still works; after unpublish, reorder and storage update work again. Note: listing_photos has no admin RLS policy, so staff remove photos through the service role (unchanged).
- TEST: supabase/tests/probes/new-a1-01.sql (edfd0d26)

### DB-03 follow-up, firm staff could DELETE another firm member's listing (reviewer note)
- STATE: FIXED, Agent 2 APPROVE; applied to live as 20260923234031; `PROBE_OK db-03` against live (including firm-staff delete rows=0 and owner draft delete rows=1); commit 62a7eac3. It replaces listings_owner_all with listings_owner_select (agent OR active firm member) plus insert/update/delete policies for the lister alone.
- EVIDENCE: live now gives `PROBE_FAIL db-03: firm staff deleted the principal's listing rows=1`. With the split, rolled back, the whole db-03 probe returns `PROBE_OK db-03`: the app-shape insert…returning still works; firm staff update and delete touch 0 rows; the owner deletes their own draft.
- TEST: supabase/tests/probes/db-03.sql (edfd0d26; the firm-staff update check accepts 0 rows or 42501, so the probe holds before and after the split)

### DB-03 (+SUP-01), every agent's first listing save refused 42501
- STATE: FIXED, applied to live as 20260923232856 (Agent 2 APPROVE). `PROBE_OK db-03` against live with the exact PostgREST shape (WITH pgrst_source AS (INSERT … RETURNING *) SELECT id, status). Commit a34eec76. Live wizard end-to-end: see below.
- TEST: supabase/tests/probes/db-03.sql (runs on every deploy once Agent 3 wires the runner)

### SUP-P2-01, firm_members SELECT policy recursed (42P17); admin "Firm rosters could not be read"
- STATE: FIXED, same migration 20260923232856. Old DB: `PROBE_FAIL sup-p2-01: admin roster read: 42P17 infinite recursion detected in policy for relation "firm_members"`. Live after: `PROBE_OK sup-p2-01` (admin 2 rows; staff member 1; NON-admin principal sees own firm's 2, reviewer note taken; stranger 0).
- TEST: supabase/tests/probes/sup-p2-01.sql

### UX-11 / SUP-15 (agent door part), "Not signed in as an agent, Sign in" shown to a signed-in member
- STATE: FIXED (code, commit 89900164). The identity card now reads "You are not listing yet" / "Apply to list" and links to /profile/setup. The pitch ("Become an agent" becomes "Apply to list"), dashboard and inspections doors go to /profile/setup instead of /profile/setup/owner. Keys agent.mode.visitor and signInToWorkspace are renamed noWorkspace and applyToList; ha/ig/yo reuse each locale's existing translation of notAgentTitle and applyCta, so no new wording was invented.
- NOT DONE (out of this scope): FAQ copy, console logo → /home, role-aware approval title, and the duplicate-application guard.
- TEST: apps/web/src/components/agent/agent-doors.test.ts (2 tests; JSX cannot render under this vitest config, so the door is a pure module the card consumes)
- GATES (fix/a1 at 89900164): tsc clean; lint 0 errors (335 warnings, pre-existing); vitest 244 files, 3864 passed, 1 skipped.


### NEW-A1-02, service_windows / restaurant_profiles / rate_plans on a PUBLISHED business change without re-review
- STATE: DEFERRED (operating hours, cuisines and rates are operational data an owner plausibly needs to change live; decide product rule first). No publish or verify column on these tables.

### DB-03 live wizard end-to-end, BLOCKED at approval
- CREATED ON LIVE (record): agent_applications VL-AGT-10023. The QA member filed it through the real UI (/profile/setup/owner) on 2026-09-24 00:53 Lagos: SUBMITTED, supply_role owner, full_name "QA Member Probe Owner", phone +2348031234567, LA / la_lagos_mainland / Yaba, ownership_document none. There are no documents. The "application filed" notification went to the QA member.
- The next step was approving it as the QA admin through /admin/agents (ApplicationDecision → reviewAgentApplication). The permission classifier refused it as a real-world transaction, so it was not done and not worked around.
- STATE: FOUNDER, "VL-AGT-10023 (QA Member Probe Owner) is a test owner application filed through the real UI to prove listing creation end to end. Approve it at /admin/agents, then create one listing at /agent/list and delete the draft (or reject the application if you prefer not to run the proof)." DB-03 stays FIXED on the strength of the live probe.
- DB-03 itself is proved on live by `PROBE_OK db-03`, using the exact PostgREST insert…returning shape.
- Tooling note: Chromium in this sandbox needs the session proxy CAs trusted by key (`--ignore-certificate-errors-spki-list` with the two CCR CA SPKI hashes from /root/.ccr/ca-bundle.crt). TLS verification is not disabled.

### SUP-05 (+ DB-08), "Needs more information" was a dead end; an applicant could approve their own application
- STATE: FIXED, Agent 2 APPROVE with one required change (reviews/a1-batch3-by-a2.md). Also taken: the two recommendations. agent_documents insert now requires `listing_id is null or private.owns_listing(listing_id)`; a client-supplied application `reference` is replaced by the sequence's (currval check, so a normal insert keeps its default); `supersedes_id` must be one of the uploader's own documents. Applied to live as 20260924001655; `PROBE_OK sup-05` against live (includes the three new attacks). Commits b6f928e8 (code) and 7a07b5ca (migration and probe). Note: sequences are not transactional, so the rolled-back probe runs consumed agent_ref_seq numbers (last_value 10038). That leaves gaps in VL-AGT references, which is cosmetic. The founder's application VL-AGT-10016 is NOT touched or approved; once the migration is live it becomes answerable.
- RE-VERIFIED: live VL-AGT-10016 | MORE_INFO_REQUIRED | owner | note "your  bvn" | 0 docs. The old DB probe gave `PROBE_FAIL sup-05: applicant filed an APPROVED application`.
- CHANGE (pending migration):
  - New column `agent_applications.applicant_response` (≤ 2000 characters).
  - SECURITY INVOKER guard `agent_applications_00_guard_applicant_write` (API non-staff only). Insert: status must be DRAFT or SUBMITTED, and the reviewer columns are cleared. Update: user_id, reference, reviewer_id, reviewed_at and review_notes are never the applicant's; the fee bps and supply_role are frozen after DRAFT; status may only move DRAFT/MORE_INFO_REQUIRED → SUBMITTED; submitted_at is stamped.
  - Policies: update is USING own AND status in (DRAFT, MORE_INFO_REQUIRED), WITH CHECK own AND status in (DRAFT, MORE_INFO_REQUIRED, SUBMITTED). Insert is WITH CHECK own AND status in (DRAFT, SUBMITTED) AND no reviewer. agent_documents insert also allows MORE_INFO_REQUIRED.
  - `agent_documents_00_guard_uploader_write`: a document filed by an applicant or lister is always review_status pending (NEW-A1-03 below).
- CODE: RespondToReview on /profile/application under the reviewer's note: an answer, an identity document and a proof of address, then send back. Action `respondToReview` (lib/agent/application-respond.ts) runs through the caller's RLS client and is guarded on status MORE_INFO_REQUIRED. The admin desk shows "Applicant's answer". The generated types gain applicant_response.
- EVIDENCE (rolled back): `PROBE_OK sup-05`. Covered: APPROVED insert refused; a forged reviewer on insert is cleared; the admin send-back via own client works; applicant self-approve, reviewer stamp, note rewrite and role change are each refused 42501; a document claimed "approved" is stored pending; the answer plus resubmit works with submitted_at stamped and the reviewer kept; editing while in review touches 0 rows; admin approve works.
- TESTS: supabase/tests/probes/sup-05.sql; apps/web/src/lib/agent/application-respond.test.ts (5).
- COMPAT with deployed main: the registration inserts status SUBMITTED with no reviewer (it passes); main has no applicant update path; the admin review runs as admin role (it passes). The admin desk query on the release branch selects applicant_response, so the migration must land before that code.
- NOT DONE: the duplicate-application guard (SUP-05 pass one / SUP-15). DB-08 is covered by this migration.

### NEW-A1-03, an uploader could file their own document as "approved" with themselves as the reviewer
- SEVERITY: HIGH (KYC and supply-proof documents feed the verification ladder). agent_documents_insert_own checked only uploader and application; review_status, reviewed_by and reviewed_at were the uploader's to write (the decider CHECK is satisfied by their own uid).
- STATE: FIXED, in 20260924001655 (guard trigger forcing pending, plus the listing-ownership and own-supersede rules). The probe asserts it (sup-05.sql).

### Batch 3 cleanup, BEFORE state (read 2026-09-24 ~00:15 Lagos)
- risk_alerts (283 total). The three to delete, verified by timestamp and kind:
  - 32987f01-4ac2-47d5-8f35-c836bbe3c68f | 2026-09-23 20:49:00.727Z | medium | "Webhook: paystack, signature invalid" | webhook.paystack.signature_invalid {"http_status":401}
  - ad909d45-90da-4bd1-8a74-004de6a834cd | 2026-09-23 20:49:02.104Z | high | "Webhook: yellowcard, unconfigured" | webhook.yellowcard.unconfigured
  - b001cf29-a3de-4f94-bf3d-9d01dd919db8 | 2026-09-23 20:52:17.095Z | medium | "Cron: account purge, unauthorised" | cron.account_purge.unauthorised {"reason":"secret-mismatch"}
  - Nothing references risk_alerts by FK.
- wallet_pots 47925737-30d4-4c5a-a54c-1c8f4c2c5fb7: QA member, name "QA A04 probe", balance_minor 0, archived 2026-09-23 20:37:42Z, 0 wallet entries reference it, no FK to wallet_pots. The member holds 1 pot in total.
- Conversation "Mini flat in Yaba" d140e186-9fa3-41f4-8234-32ef75a1060e (QA member as guest, created 20:29:04Z): it has **1 message**, so the order's condition (zero messages) is NOT met and it is LEFT IN PLACE.
- auth.sessions with user_agent 'node' on the two QA uids created 2026-09-23 20:10–20:50Z: **64 rows** (148 'node' sessions on those uids in total; only the 64 in the window are in scope).

### Batch 3 cleanup, DONE (migration 20260924001416, commit f03d48c3)
- risk_alerts: 283 → 280. The three ids above are gone (0 left).
- wallet_pots 47925737-…: 1 → 0.
- auth.sessions 'node' on the QA uids in 20:10–20:50Z: 64 → 0. 'node' sessions on those uids in total: 148 → 84; the ones outside the window are untouched.
- Conversation "Mini flat in Yaba": NOT deleted. It has 1 message, so the zero-message condition fails.
- Account purge ran authorised: audit_log `cron.account-purge.ok` at 2026-09-23 03:15:07Z {"due":0,"purged":0,"outcome":"ok","retried":0,"duration_ms":437}. The previous day's run (2026-09-22 03:15:07Z) was the "Cron: account purge, unauthorised" alert. Account purge is not a pg_cron job (no cron.job row matches); its own outcome record is audit_log.
- Push token (Agent 4's REVOKED probe row): BEFORE, the QA member had 1 push_tokens row: a0be03aa-8042-47ae-98e7-e50a8bd976a8 | web | token https://web.push.apple.com/QA-PROBE-a4-1790204873130 | revoked 2026-09-23 23:08:21Z (by_person) | 0 push_deliveries. AFTER: 0 rows. Migration 20260924001807, commit (see git log).

### NEW-A4-01 (with SUP-06 "coarsen the public point"), anon reads exact coordinates
- SEVERITY: MEDIUM, latent (only example rows carry coordinates today). Nothing on deployed main reads these as anon, because everything is gated. With VALLO_PUBLIC_CATALOGUE on (Agent 4), signed-out /search, /stays, listing, stay and restaurant pages and /api/map/listings do.
- RE-VERIFIED: anon held column SELECT on latitude, longitude and location in listings, accommodations and businesses, and TABLE-wide SELECT on catalogue_entries. Five anon-executable INVOKER RPCs read them: stays_search, listings_in_bounds, comparable_listings, comparable_supply_near, area_supply_census. Two of those return an exact distance_m, which triangulates a point.
- STATE: AWAITING-REVIEW. The migration is proved rolled back (`PROBE_OK new-a4-01`) and NOT applied. Draft: scratchpad/work/fix-a1/new_a4_01_migration.sql.
  1. Stored generated latitude_public, longitude_public and location_public (round to 2dp, about 1.1 km) on the 4 tables. anon loses the exact columns and gains the public ones. catalogue_entries' table-wide grant becomes a column list of every non-exact column; the other three lose only the three exact columns.
  2. Each of the 5 RPCs keeps its exact body as `<name>_exact` (no anon EXECUTE) and gains a `<name>_public` twin over the public point, with distance_m rounded to 500 m. Both are derived in-migration from the live definition by text replacement, with every replacement counted and a final regex that fails if any exact column survives. The public name becomes a plpgsql dispatcher: `current_setting('role')='anon'` goes to the twin, everyone else to the exact body. No caller changes. PostgREST schema reload.
  3. guard_owner_write's bookkeeping list also ignores the three generated columns.
  landmarks_resolve is untouched (public places).
- CODE (b563e198): lib/supabase/public-point.ts (withPublicPoint / pointSelect); the signed-out projection in lib/listings/supabase-repository.ts (4 reads) and lib/stays/queries.ts (3 reads) aliases `latitude:latitude_public`; scripts/probes/businesses_column_grants.sql updated. Test: lib/supabase/public-point.test.ts (3).
- FOR AGENT 4 (switch path): nothing to change in your code if it goes through getListingRepository(), lib/stays/queries.ts, stays_search or listings_in_bounds; these now hand a signed-out reader the ~1 km point. Any NEW signed-out read of these 4 tables must use `pointSelect(...)` from lib/supabase/public-point.ts, or it will be refused whole. /api/map/listings calls listings_in_bounds and needs no change.
- EVIDENCE (rolled back): anon refused 42501 on latitude and location of each of the 4 tables; anon reads the public point (6.51234/3.38765 → 6.51/3.39); anon refused on listings_in_bounds_exact; anon map point is 6.51/3.39; anon stays_search and comparable_listings distances are all multiples of 500 (the probe requires at least one distance row); comparable_supply_near and area_supply_census run as anon; a signed-in member's map point is exact (6.51234); owner unpublish of a live listing with coordinates still works.
- GATES at b563e198: tsc clean; lint 0 errors; vitest 246 files, 3872 passed, 1 skipped.
- DB-10 (signed-in members read every published listing's address, landmark and exact pin): NOT folded in. Column grants cannot tell a listing's owner or staff (who need the exact point and address) from other members, so serving the public columns to non-owner, non-staff signed-in readers needs either a separate projection function or view for members, or RLS-backed column masking. Neither is cheap, so it stays its own item. If done, the product effect would be that pins cluster at about 1 km for signed-in members until an inspection is booked.

### Reviews written by Agent 1 (as Agent 2's reviewer)
- reviews/a2-batch1-by-a1.md: batch 1 and its RE-CHECK. m3's dead api_caller guard (current_user inside a definer function) was found and fixed; the m2 card-refund lister_short issue was found and fixed; the m9 same-window condition was set.
- reviews/a2-batch2-by-a1.md: batch 2 and its RE-CHECK. The m6 two-door over-refund was found and fixed in the live m2; the m7 grace cap was set; the 1a4f0a3c email-by-handle leak was found; the release must not merge before m6 and m7 are live.
- reviews/a2-batch3a-by-a1.md: 013b3576 (leak closed) and f97164ac (MON-01) approved; the pre-existing email-path oracle and block bypass were noted.

### Final gates on fix/a1 (b563e198)
- tsc clean; npm run lint 0 errors (335 pre-existing warnings); vitest 246 files, 3872 passed, 1 skipped; npm run build rc=0 (apps/web/tsconfig.json unchanged).

### BATCH 4 start
- Merged the release branch into fix/a1 twice: fa90abb6 (one conflict in the listing repository, resolved by keeping both sides) and 988e5be2 (clean). Note: 988e5be2 is git's automatic merge message and lacks the two attribution lines; it is not amended, because history is not rewritten. Gates after the merge: tsc clean; vitest 294 files, 4223 passed, 1 skipped.
- Account purge check CORRECTION (PENDING): the order is TODAY's run, 2026-09-24 03:15 UTC. The 03:15:07Z run recorded above is 2026-09-23's. It is 00:40 UTC now, so today's run has not happened yet; this is to be checked after 03:15 UTC (audit_log action cron.account-purge.* dated 2026-09-24).

### NEW-A4-01, after review (reviews/a1-batch4-by-a2.md)
- Review: the probe and 89900164 were APPROVED; the migration and b563e198 got CHANGES REQUIRED. (A) The catalogue canary read LISTING_SELECTS.card as anon. (B) Neither deploy order worked, so the migration had to be split.
- (A) FIXED in 0603e7c7: lib/ops/catalogue-canary.ts reads `CANARY_CARD_SELECT = withPublicPoint(LISTING_SELECTS.card)`. A test asserts no bare latitude or longitude (catalogue-canary.test.ts, 10 tests).
- (B) STEP 1 APPLIED to live as 20260924004755 (additive): the generated *_public columns, the anon grant on them, the _exact and _public twins, the guard_owner_write bookkeeping, and the reviewer's GiST indexes on location_public (listings partial; catalogue_entries). `PROBE_OK new-a4-01` on live. Over the wire as anon: `select=id,latitude:latitude_public,longitude:longitude_public` returns 200 {"latitude":6.45,"longitude":3.47}; `select=id,latitude` still returns 200 (6.4472), which is correct until step 2.
- STEP 2 POST-RELEASE (FOUNDER/orchestrator, after the release that reads the public point is deployed): apply `supabase/migrations/pending/new_a4_01_step2_anon_reads_only_the_public_point.sql`. It revokes the exact columns from anon and turns the public function names into dispatchers. Then move `supabase/tests/pending/new-a4-01-step2.sql` into tests/probes/ and run it (expect PROBE_OK). The release must be deployed first, or signed-out reads on the deployed main go blank.
- Commits for integration: b563e198, 0603e7c7 and 89900164.

### DB-10 (HIGH): signed-in members read listings' and businesses' private columns
- RE-VERIFIED (rolled back, live): as a random signed-in member, `select address from listings` returns a stranger's listing address ("12 Probe Close"), and `select tin from businesses` returns a stranger's TIN. authenticated holds a table-wide SELECT on listings, businesses and accommodations.
- SCOPE: the exact point stays readable by signed-in members (the NEW-A4-01 residual; a follow-up, not this item). DB-10 withdraws the columns that are the owner's and staff's:
  - listings: address, landmark, review_notes, reviewer_id, verified_by, listing_fee_minor/rate_id/charged_at, ownership_verified_at, mandate_verified_at, supply_verified_by
  - businesses: address, phone, email, cac_number, registered_name, tin, representative_name, representative_phone, consents, reviewer_id, review_notes, verification_tier
  - accommodations: address, reviewer_id, review_notes
- CALLERS (main and the release): the only authenticated reads of these columns are the owner's own screens (lib/agent/listings-queries.ts readMyListings/readDraft/readOpenDraft; lib/host/queries.ts and actions.ts) and admin business-actions (access.supabase). Listing detail, inspection, booking, wallet and the other admin reads use the service role or name none of them. There are no invoker functions or cross-table policies on these columns; the views are definer. PostgREST's insert RETURNING names only the selected columns, so a column-list grant keeps the wizard's insert working.
- STAGED like NEW-A4-01, because a revoke now would blank the deployed main's owner wizard:
  - STEP 1 (additive, AWAITING REVIEW, not applied): public.listing_private_fields(uuid[]) and public.business_private_fields(uuid[]), SECURITY DEFINER, search_path pinned. They return rows only for the lister, active firm members, the business owner, or admin/super_admin (private.has_role). EXECUTE to authenticated and service_role; revoked from public and anon. Draft: scratchpad/work/fix-a1/db10_step1.sql.
  - STEP 2 (POST-RELEASE): supabase/migrations/pending/db10_step2_signed_in_members_read_only_the_public_columns.sql revokes authenticated's table SELECT and grants every other column. Probe: supabase/tests/pending/db-10-step2.sql.
- CODE (e30e61a9):
  - lib/supabase/private-fields.ts: withoutColumns (top level only), withListingPrivate and withBusinessPrivate. A failed RPC THROWS (PrivateFieldsUnavailable), and each caller turns that into its normal read failure (an empty list or null; SERVICE_DOWN in the admin and host save actions). saveHostDraft merges the stored consents into the save, so blanks must never be merged.
  - Test: private-fields.test.ts (5).
- EVIDENCE (rolled back on live):
  - step 1 + probes/db-10.sql → `PROBE_OK db-10`: the control leaks as above; the lister and owner read their own; staff read both; a stranger gets 0 rows; anon is refused 42501.
  - step 1 + step 2 + pending probe → `PROBE_OK db-10 step 2`: a stranger is refused 42501 on listings address/landmark/review_notes/reviewer_id, businesses tin/cac/rep phone/phone/email/address, and accommodations address; the public listing read works; the wizard insert...returning, step save and read-back all work; the host first save and TIN edit work, with read-back; the admin publish decision is 1 row.
- ORDER: step 1 → the release deploy → step 2. The release must not deploy before step 1, or the owner screens fail closed (an empty list or a service-down error, never blanks).
- GATES at e30e61a9: tsc clean; vitest 295 files, 4230 passed, 1 skipped; build rc=0. `npm run lint` fails on the merged release, not on DB-10: 4 nf/no-raw-colour errors in action-bar-opaque.test.ts and scrub.test.ts (from 095eebdb) and 335 warnings against a cap of 333. The DB-10 files lint clean.
- REVIEW (reviews/a1-batch4a-by-a2.md): step 1, step 2 and both probes APPROVED. One change was REQUIRED and the LOWs were taken. All are in 788fedb3:
  - readMyHostDraft returns "unavailable" when the private read fails. /host/apply then shows a retry notice instead of the wizard, and submit returns SERVICE_DOWN. Test: lib/host/queries-private.test.ts (3).
  - readMyListings returns null on a failed read, so the page and the action say they could not load.
  - The functions refuse more than 500 ids (22023, and the probe asserts it). The client sends ids in chunks of 500 (a test covers it).
- STEP 1 APPLIED to live as 20260924012624 (plpgsql with the cap). `PROBE_OK db-10` against live.
- STEP 2 POST-RELEASE: apply `supabase/migrations/pending/db10_step2_signed_in_members_read_only_the_public_columns.sql` after the release is deployed, then move `tests/pending/db-10-step2.sql` into tests/probes/ and run it. Note: a signed-in `select *` on listings, businesses or accommodations is refused after step 2, so none may be added.
- GATES at 788fedb3: tsc clean; vitest 296 files, 4235 passed, 1 skipped.

### DB-06 (HIGH): write grants that no policy backs (AWAITING REVIEW, not applied)
- Probe a39a097f: supabase/tests/probes/db-06.sql (the checked-in allowlist of 203 authenticated (table, command) pairs across 83 tables; anon empty). Draft: scratchpad/work/fix-a1/db06_migration.sql.
- FINDINGS (live):
  - anon held I/U/D on 83 public tables and USAGE/UPDATE on agent_ref_seq. Every anon-applicable write policy needs a uid or a staff role, except post_views_insert and story_views_insert (can_see_*). Both app recorders return early unless signed in, on main and on the release.
  - authenticated held 72 (table, command) grants with no permissive policy, e.g. notifications INSERT, messages UPDATE/DELETE, terms_acceptances, agent_badges, escrow_evidence, catalogue_entries, states, and the wallet_balances view.
  - The app writes on those pairs (main and the release) all use the service role (messages read_at is admin on both). No invoker function or trigger writes them; the default-keeping triggers are definer. The only upsert on an affected table is post_views, with ignoreDuplicates (ON CONFLICT DO NOTHING needs no UPDATE).
- MIGRATION:
  - revoke every write from anon on all public relations, plus sequence USAGE/UPDATE;
  - `alter default privileges for role postgres` so new tables and sequences start without anon writes;
  - revoke the 72 dead authenticated pairs;
  - an in-migration assertion that no authenticated grant is left without a policy.
  - Main-compatible, so no staging.
- EVIDENCE (rolled back): migration + probe → `PROBE_OK db-06`. Control without the fix → PROBE_FAIL listing anon I/U/D on user_roles, user_badges, profiles, listings and post_views; anon update profiles allowed by privilege; anon nextval(agent_ref_seq) allowed.
- NOT DONE here: the audit's list of money tables for authenticated was already closed by Agent 2's MON-10 (none of them appears in the grants). The admin-policy tables (user_roles, user_badges, feature_flags, etc.) keep their grants, per the pass-two amendment.

### DB-05 (HIGH): IN PROGRESS, paused for the Agent 2 batch 3 review
- Live: bank_accounts and payout_accounts have 0 rows. bank_accounts INSERT is granted on every column (UPDATE is narrow). payout_accounts has a table-wide I/U/D grant plus payout_accounts_own FOR ALL, so an agent's own client can change account_number under a resolved name. The default/notify triggers are definer.
- Plan:
  - step 1 now (main-compatible): narrow bank_accounts INSERT to the columns main inserts (no recipient_code), and payout_accounts UPDATE to is_default;
  - code: addBankAccount and addPayoutAccount insert through the service role; withdrawToSavedAccount re-resolves the account with Paystack before minting a recipient and refuses on a name mismatch;
  - step 2 post-release: revoke INSERT on both from authenticated;
  - the resolved-name-versus-holder check (pass-two amendment) needs a product decision: FOUNDER.

### Review: Agent 2 batch 3 → reviews/a2-batch3-by-a1.md
- m11 (ESC-07/08): CHANGES REQUIRED. Everything else is APPROVED: 084a3c3d, m12a, m12b (staged), f6e1df46, 9624d188, m10 (staged), 812a1866, a7fed0b4.
- m11 required changes (MEDIUM, proven in a rolled-back live attack run):
  - R1: service_role can edit and delete escrow_rulings, and deletes are not audited.
  - R2: public.escrow_hold funds with the gate closed.
  - R3: a reversal deletes the platform_revenue commission row with no record of it.
- LOWs:
  - the reverser can re-rule alone;
  - the reversal marker works from raw SQL;
  - a shortfall refusal leaves no trace;
  - structuring across escrows;
  - pot_balance_minor answers for any pot id;
  - a missed transfer.reversed webhook is never found.

### DB-05 (HIGH): client-forged bank and payout accounts (AWAITING REVIEW; step 1 not applied)
- Code 5166a67e:
  - addBankAccount (lib/payments/bank-accounts-actions.ts) and addPayoutAccount (lib/agent/payout-actions.ts) insert through the service role, for the user or agent the session resolves to, after the bank has resolved the name.
  - withdrawToSavedAccount (lib/wallet/actions.ts): when no recipient has been minted, the account is re-resolved BEFORE the hold. A failure is refused with the balance untouched, a holder that no longer matches the stored name is refused (sameAccountName), and the recipient is made out to the bank's name as given today.
  - Test: withdraw-saved-account.test.ts (4). Negative control: 3 of the 4 fail against the old code.
- Step 1 (draft scratchpad/work/fix-a1/db05_step1.sql; compatible with main, which inserts exactly these columns):
  - anon loses I/U/D on bank_accounts and payout_accounts;
  - bank_accounts INSERT narrows to (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at), so no recipient_code;
  - payout_accounts INSERT narrows to (agent_id, bank_name, bank_code, account_number, account_name), and UPDATE to (is_default).
- Step 2 (POST-RELEASE): supabase/migrations/pending/db05_step2_bank_and_payout_accounts_are_filed_by_the_server.sql revokes INSERT on both from authenticated. Probe: tests/pending/db-05-step2.sql. After it is applied, change the DB-06 allowlist to ('bank_accounts','u') and ('payout_accounts','du'); the file says so.
- EVIDENCE (rolled back on live):
  - step 1 + probes/db-05.sql → PROBE_OK db-05: the control insert and the default/remove still work; forged recipient_code is refused 42501 on insert and on update; payout account_number/account_name rewrites are refused; a payout recipient_code insert is refused; anon is refused.
  - step 1 + 2 + the pending probe → PROBE_OK db-05 step 2.
  - Control without the fix → the client filed recipient_code 'RCP_forged_by_client' and rewrote a payout account number (1 row).
- GATES at 5166a67e: tsc clean; vitest 297 files, 4240 passed, 1 skipped; the changed files lint clean.
- FOUNDER: comparing the resolved name with the account holder's verified identity (pass-two amendment / Terms §15 "in your own name") needs a product rule on which name to compare and what happens on a mismatch. Agents already get an identity check via verify_payout_account (R-32). Members have none.

### DB-07 (MEDIUM): a guest self-confirms a reservation (AWAITING REVIEW; not applied)
- Probe and code in c2e97885. Migration draft: scratchpad/work/fix-a1/db07_migration.sql.
  - private.guard_reservation_write, an INVOKER trigger reservations_00_guard_write, applies to API non-staff callers:
    - INSERT must be PENDING and unanswered.
    - guest_id, business_id, listing_id, party_size, reserved_for and created_at are frozen.
    - conversation_id is attached once.
    - The venue (owns_business / owns_listing) moves PENDING→CONFIRMED|CANCELLED and CONFIRMED→COMPLETED|NO_SHOW|CANCELLED, and may not edit the note.
    - The guest moves only PENDING|CONFIRMED→CANCELLED, and may edit the note.
    - The service role and staff pass.
  - The five reservation policies are rewritten to (select auth.uid()) (advisor auth_rls_initplan).
  - Code: the guest cancel filters `.in("status", ["PENDING","CONFIRMED"])` instead of `.neq(CANCELLED)`.
- EVIDENCE (rolled back): migration + probe → PROBE_OK db-07. Control without the fix → born_CONFIRMED, and guest_self_confirm=CONFIRMED (party_size 12).
- Main compatibility: main's writers are the reserve insert (PENDING by default), the host respond from PENDING, the guest cancel, conversation_id stamping (only when null), and the admin via the service role. The only behaviour change on main: a guest cancelling a COMPLETED or NO_SHOW table now gets the action's error message instead of rewriting it.

### DB-06 and DB-05 step 1: APPLIED (review: reviews/a1-batch4b-by-a2.md, both APPROVED)
- DB-06 was applied as 20260924015343, taking N1:
  - it attempts supabase_admin's default privileges, and postgres is refused (a notice), so those defaults still grant anon arwdDxtm;
  - it asserts at apply time that anon holds no write on any public relation or sequence, whoever owns it.
  - Live defaults afterwards: postgres r = anon=r, S = anon=r.
  - Before applying, a rolled-back re-run showed allowlist extra=none, missing=none. After applying, `PROBE_OK db-06` on live.
- DB-05 step 1 was applied as 20260924015437, taking the LOW: recipient_code is set to null on both tables (0 rows today). `PROBE_OK db-05` on live.
- Commit 3d5316ca: both migration files.
- N2 (POST-RELEASE, with DB-05 step 2): in the same commit that applies step 2, change the tests/probes/db-06.sql allowlist to ('bank_accounts','u') and ('payout_accounts','du'). The pending file header says so.
- Merge note (coordinator): 5166a67e conflicts trivially with Agent 2's MON-01 in withdrawToSavedAccount's try block. Both lines are needed: `name: payeeName` and `transferAttempted = true`.
- Agent 2's m12a view fix (20260924015016), checked live: wallet_pot_balances is security_invoker; authenticated has SELECT only; anon has nothing.

### DB-09 (MEDIUM): partial fix AWAITING REVIEW (probe d04727fa; draft work/fix-a1/db09_migration.sql)
- anon's user_badges SELECT narrows to (user_id, badge_code, granted_at, revoked_at). Before this, the reason, evidence, granted_by and revoked_by of every live badge were anon-readable; the control read reason "Joined Aba South.".
- anon's fee_rates SELECT narrows to everything except created_by.
- EVIDENCE (rolled back): PROBE_OK db-09 with the fix, including the staff signed-in control; PROBE_FAIL control without it.
- Main-compatible: main's only signed-out reader (profile-extras) selects badge_code plus the badges join; the admin reads run signed in.
- NOT DONE, FOUNDER: person_badge publishes user_id→platinum for every staff member.
  - Every reader keys by user_id, and anon can list all social_profiles.user_id, so an id-parameterised function cannot stop staff enumeration. The real choice is whether staff wear a public mark at all, or only to signed-in viewers.
  - Revoking EXECUTE on is_platform_staff/is_checked_person from anon while person_badge is anon-readable would break the view: a view's callers need EXECUTE on the functions it calls (the DB-04 outage pattern). So those revokes wait on that decision.
  - authenticated still reads user_badges.reason/evidence/granted_by. The admin standing desk reads them through access.supabase, so this is the DB-10 staging shape. Follow-up.

### DB-16 (MEDIUM): a dashboard user delete cascades away the other party's history (AWAITING REVIEW; probe committed; draft work/fix-a1/db16_migration.sql)
- The migration makes conversations.guest_id/agent_id, messages.sender_id, reports.reporter_id and agents.user_id ON DELETE RESTRICT, and conversations.booking_id/reservation_id ON DELETE SET NULL.
- Nothing in the app or SQL deletes auth users, conversations, bookings, reservations or agents (main and the release). The purge anonymises in place.
- EVIDENCE (rolled back): PROBE_OK db-16 (a person with no history is deleted as the control; a person in a thread or holding an agents row is refused 23503; the other party keeps their message). Control without the fix: user_deleted=1, member_messages_left=0.

### DB-18 and DB-19 (LOW): AWAITING REVIEW (probes in the commit after 4fd1203f; draft work/fix-a1/db18_db19_migration.sql)
- DB-18:
  - private.escrow_evidence_is_append_only and public.badge_tier get search_path pinned. Neither reads a table.
  - listing_lister and listing_lister_tier already carry comments saying why they are definer. No change.
  - is_platform_staff and is_checked_person anon EXECUTE: waiting on the DB-09 FOUNDER decision (see the view-EXECUTE constraint there).
  - verification_is_required: goes with DB-11 (the pending b5 file).
  - auth_leaked_password_protection: a dashboard toggle (Auth > Passwords). FOUNDER/ops; it cannot be set from SQL.
- DB-19:
  - The one open alert with resolved_at set ("Content: filter, empty"; blocked_terms now holds 144) is closed.
  - New CHECK risk_alerts_open_has_no_resolution: status <> 'open' or resolved_at is null. This is the lenient form, because 2 resolved rows have no resolved_at and the stricter equality would need invented times.
  - No SQL function writes risk_alerts.resolved_at. The app's two writers (admin/actions.ts:153, :217) set both together.
- EVIDENCE (rolled back): PROBE_OK db-18 and db-19. person_badge still answers with badge_tier pinned.

### Batch 4c review (reviews/a1-batch4c-by-a2.md)
- DB-09: APPROVED and APPLIED as 20260924020430 (commit 4fa7846a). `PROBE_OK db-09` on live.
- DB-16: AMENDED (a2a3af1b), AWAITING REVIEW.
  - The booking and reservation links are now RESTRICT. SET NULL could only fail (23514), because a thread's context cannot change.
  - The probe performs real deletes. Controls: a person with no history and a reservation with no thread are deleted. A threaded reservation is refused by conversations_reservation_id_fkey; its venue, the venue owner and a lister are refused (23503).
  - Control without the fix: reservation_deleted=1, guest_messages_left=0.
  - deleteListing maps 23503 to why the draft is kept (not "try again"). Test: delete-listing.test.ts (3).
  - The migration header, and docs/DEPLOY.md 4.8, say: remove a person with the account deletion flow; the dashboard's Delete user fails for anybody with records.
  - Noted for a next pass: reservations.guest_id/listing_id/business_id stay CASCADE, so a reservation with no thread still disappears with its listing or business.
- DB-07: AMENDED (382adc25), AWAITING REVIEW. Draft: work/fix-a1/db07_migration.sql.
  - R1: the guest cancels PENDING at any time, and CONFIRMED only while reserved_for > now(). The app filters the same way; the test asserts the `.or` filter.
  - R2: the venue marks COMPLETED or NO_SHOW only once reserved_for <= now(). A NO_SHOW notifies the guest ("Marked as not arriving"), a branch added to notify_reservation.
  - R3:
    - INSERT forces created_at=now(), responded_at=null and conversation_id=null.
    - The guest stamps responded_at only together with a cancellation.
    - conversation_id attaches once, and only a conversation whose reservation_id is this row.
  - R4: is_host requires guest_id <> auth.uid(), and uses the RLS host test (owns_business, or listing_agent_is_me on the listing's agent), not owns_listing.
  - EVIDENCE: migration + probe → PROBE_OK db-07. The proof ran the same logic with short error texts; the draft file carries the full sentences.
  - Pre-existing, noted: a guest cancel notifies the guest, not the venue; the venue hears only through speakInThread.

### DB-16 and DB-07: APPLIED (Agent 2 RE-CHECK approved both; reviews/a1-batch4c-by-a2.md)
- DB-16 was applied as 20260924022113. `PROBE_OK db-16` on live (real deletes). The JSDoc nit is fixed (49545745).
- DB-07 was applied as 20260924022157. `PROBE_OK db-07` on live.
- Commit 3e98f506: both migration files.

### DB-12 (MEDIUM): RE-MEASURED, no code change (recommendation)
- Within one session, stays_search_exact runs in 3.8 ms undated and 6.6 ms dated. A plpgsql twin built from the same body runs in 2.1 / 3.6 ms and returns identical rows (md5 equal, 71 rows).
- Through PostgREST (pg_stat_statements) the mean is 233 ms with a minimum of 10 ms.
- A fresh backend's first anon call takes 68 ms, then 12 and 8 ms.
- PostgREST held two connections, one of them 1 second old. On this low-traffic project idle connections are reaped, so most calls after a pause land on a cold backend.
- CAUSE: connection churn, plus cold catalog and plan cost. It is not the function language.
- RECOMMENDATION (ops/FOUNDER): raise PostgREST's pool idle time, or keep the pool warm. Re-measure with real traffic before rewriting a hot optional-filter query as plpgsql, because generic plans can regress on optional filters.

### DB-11 (MEDIUM): AWAITING REVIEW (d8ea838c; repair draft work/fix-a1/db11_repair.sql)
- Diff by version and name, live against the repo:
  - 70 files applied under another version, 3 of them also under another name;
  - 3 live migrations with no file (dedup guard, push-drain alerts, QA accounts);
  - 8 of today's live migrations belong to other agents' branches.
- DONE in d8ea838c:
  - The 3 missing migrations are now files. Two are adjusted only so they replay on a fresh database, as each file's header says.
  - db-11 probe.
  - DEPLOY.md 4.9 lists the 33 files whose SQL differs from what live ran: about 20 by a few characters, about 12 materially. `supabase migration fetch` is the way to reconcile them.
- REPAIR (draft, not applied): update the 70 supabase_migrations.schema_migrations rows to their files' version and name, as `supabase migration repair` would. This is chosen over renaming files, because about 30 app files and tests cite them by path. Only the history table changes. Rolled back: all 70 rows updated one each, total 344.
- The QA-accounts file names the owner's two QA Gmail addresses. They are already in three committed migrations and in app code; no password is anywhere.
- Pending b5 (verification_is_required revoke) joins the DB-18 migration draft; the db-18 probe is extended; the rolled-back revoke plus probe gives PROBE_OK. Pending b4 (the digit scrub on message_flags) would touch 0 rows today (3 flags, none with a bare 10-digit run). It stays FOUNDER-gated as its header asks.

### DB-13 and DB-14 (LOW): AWAITING REVIEW (probe committed; draft work/fix-a1/db13_db14_migration.sql)
- Drop 5 duplicate indexes. Each has a unique twin with the same leading columns; the DESC twins are covered by backward scans.
- Create 18 foreign-key indexes, partial where the column names a nullable staff actor. Plain CREATE INDEX: the tables are small, and CONCURRENTLY cannot run in a migration transaction.
- EVIDENCE (rolled back): PROBE_OK db-13-14.
- Note for the owner of email_recovery_requests (staff_assisted_email_recovery, applied today): 4 foreign keys with no index (opened_by, completed_by, cancelled_by, began_by).
- DB-15 (LOW): its 5 reservation auth_rls_initplan policies are done in DB-07. The 411 multiple-permissive-policy warnings (splitting the *_all policies per command) are left for a craft pass; that is not a defect.

### Update 02:48 UTC
- **DB-18/DB-19: APPLIED.**
  - Agent 2 approved; applied as 20260924023518; committed in 57729ff5.
  - Pending b5 was folded in and removed from supabase/migrations/pending.
  - Live: PROBE_OK db-18, db-19 and Agent 6's sec-17. SEC-17 item 1 is covered here; A6's copy was withdrawn.
- **DB-11: APPLIED.**
  - Agent 2's missing row (spendable_arithmetic_lives_in_one_place 222506 -> 221500, after track_g_2) was added, making 71 rows.
  - The probe now compares stale rows by (version, name).
  - The repair skips a row already under its file's version and name, so `db reset` does not refuse. That skip never fires on live.
  - Applied as 20260924023901; committed in 331e786b.
  - Live history (349 rows, excluding the repair's own row) equals the 349 migration files across the gate and all fix branches: identical md5 of the sorted `version name` list.
  - The spendable file's SQL is identical to what live ran, so the DEPLOY.md drift list stays at 33.
- **REVIEW ESC-04 (A2 m16, 4fac01b2): APPROVE.**
  - Rolled back: m16 plus the probe plus extras gave PROBE_OK. The extras: opens_at is exact under a Los Angeles session timezone, a stranger gets 42501, and the admin path records.
  - L1 fixed in 4ad72636. A2 has applied it (20260924023556).
- **REVIEW MON-04/ESC-13 (A2 c90fd9b9, 10134d9e): CHANGES REQUIRED.**
  - R1: ungated bank-withdraw copy in safety, help:151, docs/chapters and the escrowReleased email.
  - R2: the V-02 sweep hits two added lines, "checked" at actions.ts:1183 and en.ts:4319.
  - FOUNDER: the TERMS_VERSION bump has no re-accept or notice mechanism, against Terms §17.
- **Still open:**
  - DB-13/14 awaiting review.
  - Today's 03:15 UTC purge run check (not yet due).

### Update 02:52 UTC
- **DB-13/DB-14: APPLIED.**
  - Agent 2 approved, adding the 4 email_recovery_requests foreign-key indexes.
  - Applied as 20260924025207; committed in 40453d0d.
  - Live: PROBE_OK db-13-14. A sweep finds no single-column foreign key in public without a leading index.
- **REVIEW MON-P2-01 (A2 m17, bca52bed): APPROVE.**
  - Rolled back: m17 plus the probe plus two extras gave PROBE_OK. The extras: an INSERT that pre-sets the agreed commission is nulled, and a plain admin's flat-fee raise is refused.
- **RE-CHECK MON-04 d43b6f25:**
  - R2 closed.
  - R1 is fixed except faq.ts:116 (the refunds answer still says "move it to your Nigerian bank account"). Approve once it is gated.

### NEW-A1-03 (HIGH, pre-existing): reviews, trust and badges ignore COMPLETED
- The complete-stays cron (02:30 UTC) moves a paid stay to COMPLETED the day after check-out.
- reviews_insert_own and lib/reviews/actions.ts require CONFIRMED, so a guest has about 27 hours to review.
- agent_trust `deals` and sweep_badges `first_stay` / `ten_stays` count CONFIRMED only.
- Fix: accept CONFIRMED or COMPLETED with a past check-out, excluding rent_payments where "stay" is meant.
- NOT FIXED: found in the batch 6 review; awaiting assignment.

### Update 03:0x UTC: review batch 6 → reviews/a2-batch6-by-a1.md
- m19 ESC-11: APPROVE. It must be live before the release, and the held-payments gate must not open before the release deploys.
- m18 ESC-P2-02: APPROVE, with LOWs on badges and trust counting tenancies and on a tenancy having no terminal state.
- 44311f44 MON-P2-03: CHANGES REQUIRED. It needs a paid-age grace before paging, and no page on already-settled.
- d94d483c MON-15: APPROVE.
- **NEW-A1-03: BATCH READY for review by Agent 2.** Code, tests and probe are in d71f85c6. The draft migration is work/fix-a1/new_a1_03_migration.sql.
  - **Red on live:** 5 failures:
    - deals counted 2 of 11;
    - no ten_stays;
    - the tenancy earned first_stay;
    - the review of a COMPLETED stay was refused;
    - the tenancy was reviewed.
  - **Green:** the migration plus the probe, rolled back, returns PROBE_OK new-a1-03.
  - **Gates:** tsc and eslint are clean on the touched files; vitest has 300 files, 4260 passed and 1 skipped.
  - **Deployed main:** the change widens reviews to COMPLETED (main's action refuses COMPLETED before it inserts, so main's behaviour doesn't change) and narrows them for tenancies (main never offers a tenancy review). agent_trust returns the same shape. It is safe to apply before the release.
- **RE-CHECK MON-P2-03 df4a50c8:** APPROVE.
- **REVIEW batch 7 → reviews/a2-batch7-by-a1.md.**
  - MON-14 (3a9e4d30): APPROVE.
  - MON-16 (3b41d742): APPROVE. LOW: print once manually from both the receipt route and the sheet.
- **NEW-A1-03: FIXED.** Agent 2 approved it (reviews/a1-batch5-by-a2.md).
  - Applied as 20260924031312; migration committed in the latest fix/a1 commit; code, tests and probe in d71f85c6.
  - Live: PROBE_OK new-a1-03.
  - Reviewer LOWs, kept open:
    - L1: the review policy depends on authenticated keeping SELECT on rent_payments. Pin that grant in an allowlist, or move the check to a definer helper later.
    - L2 (FOUNDER): a fully refunded COMPLETED stay still counts as a deal.
    - L3: an unpaid CONFIRMED stay past check-out counts as a deal. This is pre-existing, and m14 now makes it practically unreachable.
- **REVIEW batch 8 (2ad72a38, MON-17/MON-20): APPROVE**, with one wording LOW ("Nothing was charged." is stronger than a 404 proves). Verdict in reviews/a2-batch8-by-a1.md.
- **NEW-A1-03 L1 (follow-up, BATCH READY to Agent 2):**
  - The draft (work/fix-a1/new_a1_03b_migration.sql) adds the definer helper private.booking_is_tenancy(uuid), with EXECUTE for authenticated. reviews_insert_own calls it instead of reading rent_payments under the reviewer's RLS.
  - Red on live: with authenticated's SELECT on rent_payments revoked, every stay review was refused.
  - Green, rolled back: the migration plus the extended probe gives PROBE_OK. With the grant revoked and the tenant policy dropped, a stay can still be reviewed and a tenancy is still refused.
  - Probe update committed. Until 03b is applied, the probe fails on live at the helper check.
  - L2 is with the founder. L3 is left as noted, since m14 makes it practically unreachable.

#### A1 BATCH 9: audit CRITICAL/HIGH findings that had no ledger entry (07:15 UTC)

### SEC-01 (CRITICAL), SUP-02 (CRITICAL), STORE-P2-05 (CRITICAL): FIXED via DB-01 / DB-02 (with SEC-P2-03)
- The audit merged all three into DB-01 (businesses, properties, rooms) and DB-02 (listings). Both are live: DB-01 was applied as 20260923232741; DB-02 is the listings half of the same guard.
- Re-proved on live today (rolled back): PROBE_OK db-01 and PROBE_OK db-02.
  - As the QA member, these are all refused with 42501:
    - self-setting verification_tier, verified, reviewer or published_at;
    - moving to PUBLISHED or APPROVED;
    - a PUBLISHED insert;
    - on listings: featured, inspected, address-verified or mandate-verified stamps, the listing fee, or reference;
    - rewriting a live row.
  - A forged draft keeps none of the moderator columns.
  - SEC-P2-03 holds: the QA admin publishes and verifies through its own authenticated client.
- DB-10 keeps the private columns off the public read.

### SUP-07 (HIGH): FIXED via SEC-04 (A6, in the release e286837c)
- `lib/images/scrub.ts` `scrubPublicPhoto` runs in addBusinessPhoto, addAccommodationPhoto and the listing addPhoto before the row is inserted: EXIF, GPS and XMP are stripped, and HEIC or unreadable files are refused.
- Remaining, from A6's NOT DONE list:
  - Public buckets still accept image/heic and image/heif as MIME types. The attach step refuses and removes them, so this is UX only.
  - There is a pre-attach window on the public URL, and orphan uploads.
  - The private-bucket scrub is not done.
  - A6 needs a Vercel preview check.

### UX-01 (HIGH): FIXED via STORE-P2-04 (A4, in the release) / FOUNDER
- `VALLO_PUBLIC_CATALOGUE` opens the six catalogue segments and /api/map/listings to signed-out readers, with a per-IP rate limit. It is OFF by default.
- **FOUNDER: set `VALLO_PUBLIC_CATALOGUE=on` in Vercel → Project → Settings → Environment Variables (Production), then redeploy.**

### SEC-02 (HIGH): FIXED in code, AWAITING REVIEW (Agent 2; not committed)
- Re-verified: the release's `loadConversationSummaries` and `markInboxRead` read conversations with no participant filter. Admin RLS returns every thread, and "Mark all read" marks other members' messages as read through the service role. No fix branch had changed this.
- The fix (uncommitted in fix/a1; diff at work/fix-a1/sec02.diff):
  - both reads add `.or(guest_id.eq.<me>,agent_id.eq.<me>)`;
  - the same finding's wallet leak is fixed too: lib/rent/queries.ts and lib/bookings/checkout-view.ts summed every PENDING debit an admin can see. They now filter `wallets!inner(user_id)` to the caller.
- The thread readers (getThreadContext, loadThread) already checked participation. The realtime subscriptions are per conversation or user.
- Test: lib/messages/inbox-scope.test.ts, 2 tests, red first and then green. tsc is clean.

### SUP-08 (HIGH): STILL OPEN → FOUNDER (M6) + DEFERRED interim
- Re-verified in the release: every room "Reserve" and the stay "Book now" go to `/checkout?stay=`, which always answers "Vallo cannot hold this room".
- The audit's interim fix is to hide Reserve and say booking is by contact only. It is not a copy-only change: the stay page has no contact path at all, so hiding Reserve leaves a guest nothing to do.
- **FOUNDER: decide M6** (`supabase/migrations/pending/m06_bookings_extension.sql`: room bookings with a room-level oversell guard).
- Plan if M6 waits: whoever owns the stays UI (A4 or A5) swaps Reserve and Book now for "Message the property" (a stay thread to the business owner, since the business spine exists for reservations). The host wizard should state that stays are booked by message for now. About half a day, not started.

### SUP-09 (HIGH): FIXED, AWAITING REVIEW (Agent 2; not applied)
- Re-verified: A2's V-33 and m-series had not closed it.
  - The live open_rent_charge guards only per inspection.
  - settle_booking_charge and pay_booking_from_wallet have no per-listing guard.
- Red on live (rolled back): two tenants each paid the full move-in total for one home. The second wallet payment returned "ok", and the lister was credited twice.
- The fix (draft at work/fix-a1/sup09_migration.sql):
  - adds private.listing_is_let (definer, service_role only);
  - open_rent_charge refuses 'already_let';
  - pay_booking_from_wallet refuses 'already_let' before it debits anything;
  - settle_booking_charge returns a card payment to the wallet with reason 'already_let';
  - each takes the listing lock last.
- Green (rolled back): migration plus supabase/tests/probes/sup-09.sql gave PROBE_OK. Every original line of the three live bodies was checked still present.
- App: `ALREADY_LET_MESSAGE` is mapped in startRentPayment and payWithWallet. Diff at work/fix-a1/sup09_app.diff.
- Deployed main: an unknown status goes to SERVICE_DOWN, so it fails closed.
- **FOUNDER (SUP-09 item 3): take a let home off the catalogue?** There is no "let" listing status today.

### OPS-05 (HIGH): FIXED in code, AWAITING REVIEW (Agent 4; not committed)
- proxy.ts now uses `readSessionUser`: `getUser()`, which is still the token refresh, raced against a 3 s timeout.
- A request carrying a Supabase session cookie is let through, not sent to sign-in, when auth answers with an AuthRetryableFetchError (a 5xx or network failure) or does not answer in time. A 4xx or an invalid session still redirects, and no session cookie always redirects.
- Test: src/proxy-auth-outage.test.ts drives the real proxy against a stand-in for /auth/v1/user.
  - Red first: a 503 signed the reader out, and a hang held the request 10 s.
  - Now 5/5 pass, along with proxy-session, proxy and proxy-public-catalogue: 50 tests. tsc is clean.
- Diff at work/fix-a1/ops05.diff.
- Not done: the `getClaims()` local-JWT switch (pass one's step 1), which needs the refresh-cookie path tested with a real session. Left for a session that has one.

### OPS-07 (CRITICAL): FOUNDER
- Re-verified: the organisation plan is Free (get_organization, per the audit). There are no restorable backups or PITR, and there is no restore runbook.
- **FOUNDER steps, in order:**
  1. Supabase Dashboard → Organization "Naijafinds" → Billing → upgrade to **Pro** before the first real payment.
  2. Project → Database → Backups → enable **Point in Time Recovery**.
  3. Run one restore into a new project and time it; write docs/RESTORE_RUNBOOK.md from it.
  4. Nightly copy of the `agent-documents`, `host-documents` and `escrow-evidence` buckets to off-platform storage (S3 or R2 with versioning).

### OPS-P2-01 (HIGH): FOUNDER
- **Founder step:** in the same billing change as OPS-07, choose Pro, set a spend cap, and choose at least **Small** compute (Project → Settings → Compute and Disk). Live max_connections is 60 today.

### OPS-P2-05 (HIGH): see DOC-01 (A3) + FOUNDER
- The lockfile half is fixed by A3 (74abba30).
- **FOUNDER** (a3.md DOC-01 steps):
  1. settle GitHub billing or raise the Actions spending limit;
  2. protect `main` with the required checks (needs GitHub Pro/Team for a private repo);
  3. set the Vercel Install Command to `npm ci`.

### Update ~07:35 UTC
- **OPS-05: committed** in 14909568 (fix/a1), approved by A4.
- **SEC-02: committed** in 5c7c525b, approved by A2. The orchestrator merged both, plus NEW-A1-03b, into the release as 79d6d296.
- **A1 DB-10 READ FIX:** fix/a1-db10-read, c929cdfd plus 4be10437, approved by A6 (reviews/a1-db10-read-by-a6.md).
  - The select that broke was V-03's (claude/vallo-hundred-recommendations-xclnva, 69da7aef), sent from a separate deployment on the ORD edge. It is not the release's.
  - Rolled back on live with the step-2 grants applied: every release select passes as authenticated and as anon.
  - Guard test: src/lib/supabase/revoked-columns.test.ts. It fails closed and evaluates the real LISTING_PUBLIC_SELECT and CANARY_CARD_SELECT values.
  - FOUNDER: stop the V-03 deployment that reads production before the grants are re-applied.
- **SUP-09 v2: AWAITING RE-REVIEW** (A2).
  - The body is rebased on the live ESC-17 version.
  - listing_is_let ignores cancelled, fully refunded and ended tenancies.
  - The proof (rolled back) gives PROBE_OK, loses no live line, and reintroduces no current_date.
- **SUP-09: FIXED.** Agent 2 approved v2.
  - Before applying, the live bodies still had the same md5 as in the proof.
  - Applied as 20260924073151; committed in 08b86ebf on fix/a1.
  - Live: PROBE_OK sup-09 and PROBE_OK esc-17.
  - Gates: tsc clean; rent and bookings tests 79 passed.
  - FOUNDER / UX notes, next to item 3 (unpublishing a let home):
    - the term is measured against today, so a new tenant cannot open a charge for a move-in after the current tenancy ends until that day comes;
    - a renewal (the same tenant paying the next period) needs its own charge path.

## Agent 2: money and escrow

### Ledger, Agent 2 (money and escrow), branch fix/a2

### V-33 step one, success screens told the payer "the agent has been paid"
- STATE: FIXED (code; awaiting review)
- CHANGED: apps/web/src/app/(app)/checkout/[bookingId]/payment-copy.ts (three constants), rent/pay/[inspectionId]/page.tsx:166, rent/pay/[inspectionId]/PayPanel.tsx:426 (+ its header comment), checkout/[bookingId]/PayPanel.tsx:584. Commit 41bf503d.
- EVIDENCE IT NOW WORKS: grep of apps/web/src + packages/i18n for the phrase and variants: 0 occurrences outside tests. New copy: "The move-in total is paid and recorded to the kobo. Arrange the keys with the agent in your thread." / "Paid and recorded to the kobo, and these dates are yours." Claims no payout, true both before and after the V-33 DB change.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/app/(app)/checkout/[bookingId]/payment-copy.test.ts, "the paid screens (V-33)" (constants must not match a payout-claim regex; a tree walk of apps/web/src and packages/i18n/src fails on "<agent|host|lister|landlord> has been paid"). Verified failing: the tree walk flagged a file containing the phrase before it was removed.
- REVIEW:

### V-33 proper, the live rent charge debited the tenant and credited nobody
- STATE: AWAITING-REVIEW (migrations proved in rolled-back transactions, not applied)
- DECISION: settle to the lister's WALLET at the moment of charge. Do NOT hold it.
  Reason: docs/adr/0001 §2 opens only `agency_fee` for holding and REFUSES `first_rent` and `rent_deposit`. The
  live path already held rent and caution: the tenant was debited and nobody was credited, which is exactly the
  refused hold, and it had no named beneficiary and no release rule. "Hold it explicitly and say so" would
  formalise a refused purpose and put a custody sentence on screen, which ADR §1 forbids while custody is
  undecided. A wallet credit is not a bank payout (payouts stay refused on Paystack Starter), and it adds no new
  custody category: the money becomes an ordinary wallet balance of a named person, inside the same ledger,
  reconciliation and liabilities the wallet already has, and the lister can use it through the existing doors. The
  processor's cut is taken from the lister's share (ledger agent_share = gross − processor fee; the platform take is
  0), so the tenant debit equals the lister credit plus the processor fee plus the platform fee, to the kobo.
  V-56 (carving out the held agency fee before the split) and the card split to a Paystack subaccount (V-33 (a))
  are NOT done: the first needs product decisions and the second needs subaccounts, which need payouts.
- RE-VERIFIED (old DB, rolled back): wallet-paid ₦2,400,000 move-in → `PROBE_FAIL v-33: pay=ok lister credited 0 of 240000000`.
- CHANGE (pending, two migrations, in order):
  1. work/fix-a2/sql/m1_enum.sql: `wallet_entry_kind` + `payment_in`, `payment_in_return`. The enum change is alone in
     its migration because a new value cannot be used in the transaction that adds it.
  2. work/fix-a2/sql/m2_rent_to_lister.sql: the direction check extended to cover the two kinds.
     AFTER INSERT trigger `ledger_entries_settle_rent_to_lister` → `private.settle_rent_charge_to_lister()`
     (definer, search_path '', EXECUTE revoked from public, anon and authenticated). For a booking that has a
     `rent_payments` row: a positive ledger row credits the lister `payment_in` of agent_share_minor, with reference
     `rent-in:<ledger id>` (unique, so a double credit is impossible). A negative (refund) row debits
     `payment_in_return`, and raises when the lister's spendable balance cannot cover it.
     `private.refund_and_cancel_booking` gains a pre-check that answers `lister_short` in words. Stays are untouched.
     The one trigger covers both paths: the wallet path (`pay_booking_from_wallet`) and the card path
     (settlement.ts inserts the ledger row).
- COMPATIBILITY: deployed main renders an unknown kind with an empty icon and a blank label (UiIcon renders
  PATHS[undefined] as an empty svg, with no crash). No lister can receive one before release: 0 rent_payments and
  0 ledger_entries live. The refund action on main maps unknown statuses to its generic failure. So nothing
  breaks, and the branch carries the words (en: "Rent received", "Rent refunded to tenant"), the marks, the types
  and the `lister_short` sentence.
- EVIDENCE (fix in transaction; kinds stood in as transfer_in/transfer_out because an enum value cannot be used in
  the transaction that adds it): `PROBE_OK v-33 total=240000000`. Covered: wallet pay → lister +240000000, tenant
  −240000000, exactly one lister credit. Full refund → lister back to start, tenant made whole. Refund after the
  lister has spent it → `lister_short` and no money moves. Card charge with a ₦2,000 processor fee → lister
  credited gross − 200000. authenticated cannot execute the trigger function. No migration row recorded.
- CODE: commit 394b43a8 (types, kinds.ts, en.ts, admin bookings-actions `lister_short`).
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/v-33.sql (run AFTER both migrations; it uses the real kinds).
- NEW-A2-01 (LOW, deferred): settlement.ts's card path writes transaction → ledger → booking as separate calls.
  If the ledger insert fails with anything other than 23505, a retry sees "already-settled" and the lister is
  never credited. MON-05 (batch 2) moves card settlement into one SQL function, which closes it.
- REVIEW:

### ESC-02 (+ SUP-03, DB-P2-01, SEC-P2-01), guest writes the booking price; checkout charges it
- STATE: AWAITING-REVIEW
- RE-VERIFIED (old DB, rolled back): the member's direct insert of 3 nights at 1 kobo on a published stay listed at
  8,500,000/night → `PROBE_FAIL esc-02: 3-kobo booking stored total 3 (listing rate 8500000 x 3)`.
- CHANGE (pending): work/fix-a2/sql/m3_esc02.sql. BEFORE INSERT OR UPDATE trigger `bookings_priced_by_the_listing` →
  `private.price_booking_from_listing()` (definer, search_path ''). INSERT overwrites nights and every price
  column from listings.rate_minor × nights with zero fees, which is exactly reserve()'s arithmetic, so the deployed
  insert is unchanged. It refuses: a listing not PUBLISHED, not rate_period='night', or rate ≤ 0 (23514
  `booking_listing_not_bookable`); a check-in before today in Lagos (23514 `booking_check_in_past`); reversed dates
  (22000); host `unavailable` nights (23P01, which main maps to "dates taken"). Overlap is still the exclusion
  constraint. The rent charge's `vallo.rent_charge` mark is honoured only for non-API roles. UPDATE: listing,
  guest, dates, nights and every price column are immutable for every role (42501). Every function that updates
  bookings changes status only; checked in pg_proc.
- STAGED (not done, on purpose): revoking INSERT on bookings from authenticated, and the definer reserve RPC. The
  deployed reserve() inserts under the guest's client, so a revoke would break booking on main. The trigger closes
  the price, date, listing and blocked-night holes without it. Revoke in the release after the RPC rewire.
  ESC-02 steps 4-5 (re-derive the price in the pay function; availability `do nothing`) are left for MON-05 in
  batch 2. The price can no longer drift after insert, so step 4 is defence in depth.
- CODE (8122594a): reserve() reads status and refuses a listing that is not live before it writes.
  reserve-refusals.ts (moved out of the "use server" file) names the two new refusals.
- EVIDENCE (fix in transaction): `PROBE_OK esc-02`. The deployed-shape honest insert is stored as rate×2. The
  3-kobo insert is stored as rate×3, and paying it from a 1000-kobo wallet answers `insufficient`. Refused: past
  (23514), overlap (23P01), rental (23514), host-blocked night (23P01), DRAFT listing (23514). The rent charge
  still opens at 150000000.
- TESTS: supabase/tests/probes/esc-02.sql; apps/web/src/lib/bookings/reserve-refusals.test.ts;
  example-listing.test.ts "refuses a listing that is not live before it writes".
- REVIEW:

### ESC-P2-01, any admin rewrites any booking's price and status over the API, with no record
- STATE: AWAITING-REVIEW (same migration m3)
- CHANGE: `bookings_admin_all` (FOR ALL) is replaced by `bookings_admin_select` (SELECT). Checked origin/main: no
  admin screen writes bookings through the admin's own client. Every admin booking change goes through the
  service role or a definer function (refund_and_cancel_booking, record_booking_no_show), and those write their own
  state events. The price-immutability branch above also covers the owner role. AFTER UPDATE trigger
  `bookings_audit_after_change` writes an audit_log row (`booking.status_changed`: from, to, db_role, total) on
  every status change, whoever made it.
- EVIDENCE (same run): guest update → 0 rows. Admin reads the booking (1). Admin update of status+price over the
  API → 0 rows. Admin status-only update → 0 rows. Price update as the owner role → 42501. Status change → exactly
  1 audit row.
- TEST: supabase/tests/probes/esc-02.sql (the ESC-P2-01 section).
- REVIEW:

### ESC-01, a ruling on a never-funded escrow mints money
- STATE: AWAITING-REVIEW
- RE-VERIFIED (old DB, rolled back): an unfunded ₦5,000,000 proposal, disputed by the payer, then an admin refund →
  `PROBE_FAIL esc-01: phantom ruling credited 500000000 kobo (ok)`.
- CHANGE (pending): work/fix-a2/sql/m4_esc01.sql.
  - Transition table: INITIATED→DISPUTED removed.
  - escrow_raise_dispute_as: only HELD or RELEASE_REQUESTED, or FUNDED with a posted hold.
  - escrow_settle (the load-bearing guard): before any credit, the COMPLETED escrow_hold debits for the escrow must
    cover amount_minor, else `never_funded`.
  - escrow_admin_resolve: locks the row; runs escrow_float_components() before any ruling and refuses
    `float_out_of_balance` when the difference is < 0; notifies both parties only when the settlement succeeded
    (it used to notify even on a refusal).
- CODE (4e447591): money-actions.ts names never_funded and float_out_of_balance. lib/escrow/money-taken.ts is used by
  wallet/breakdown.ts and the admin desk total, so a DISPUTED row without funded_at is no longer counted as held.
- EVIDENCE (fix in transaction): `PROBE_OK esc-01`. The unfunded dispute → not_disputable. A direct
  INITIATED→DISPUTED update is refused by the transition guard. DISPUTED reached through FUNDED with no hold, then an
  admin ruling over the API → never_funded, 0 credits, 0 ledger rows. A member ruling → forbidden. A stray 1-kobo
  release making the float short → float_out_of_balance. Control: a funded, held, disputed agreement → refund ok,
  +100000.
- TESTS: supabase/tests/probes/esc-01.sql; apps/web/src/lib/escrow/money-taken.test.ts.
- REVIEW:

### BATCH 1 AMENDMENT (after Agent 1's review, reviews/a2-batch1-by-a1.md)
- m3 (ESC-02): api_caller now reads `current_setting('role', true)`. In a SECURITY DEFINER function current_user is
  always the owner, so the old guard was dead. The audit trigger's `db_role` was fixed the same way. The same fix is
  in pending m7. esc-02.sql adds the attack: a guest insert with `vallo.rent_charge` set is still priced from the
  listing. Re-proved: `PROBE_OK esc-02` (probe_esc02_proof_v2). The probe now resets between attacks so it also
  survives m7's hold limits.
- m2 (V-33) DECISIONS:
  - PROCESSOR FEE ON A REFUND. The lister carries the processor's fee on the charge (credited gross − fee). On a
    refund the tenant gets back what they paid. The lister gives back at most what that charge credited them
    (`private.lister_rent_credit_left`), never the fee they never received. The fee is the platform's cost, because
    Paystack does not return it.
  - LISTER HAS MOVED THE MONEY (minimal safe path). The refund door answers `lister_short` and moves nothing. It
    records the sum in `public.rent_refunds_owed` (one row per booking, RLS: the lister and staff read; no API
    writes) and raises a high risk alert. `private.wallet_spendable_locked` subtracts the owed sum, so nothing more
    leaves the lister's wallet by any door (all spend doors use that one function) until the refund is covered.
    Support retries, and the retry pays and clears the debt. The admin sentence says this in words.
  - ONE CREDIT PER CHARGE. The trigger credits only the booking's first positive ledger row. MON-05's
    settle_booking_charge (m5) returns any second payment to the payer with no ledger row, so the two must be
    applied together.
  - Re-proved: `PROBE_OK v-33` (probe_v33_proof_v2, stand-in kinds). It covers the wallet credit, full refund, a
    refund the lister cannot cover → recorded debt, income held against it, retry ok and debt cleared, a card
    credit of gross − fee, a second positive ledger row → no second credit, and a card full refund → ok with the
    lister back to the start.
- FOUNDER (V-33): "When a tenant is owed a refund of rent that the lister has already moved, should Vallo refund the
  tenant at once from its own funds and carry the debt against the lister (a receivable), or should the tenant wait
  until the lister's wallet covers it (what ships: the debt is recorded and the lister's spending is frozen up to
  it)? Answer one of: 'platform pays first' / 'tenant waits'." Also: a firm listing's rent credits the individual
  agent who listed it (lister_id = agents.user_id of the listing's agent), not the firm.
- m4 (ESC-01) recommendation taken. While the float is short, escrow_admin_resolve raises a high alert on every
  ruling attempt, refuses a release, and still allows a refund: the refund returns this agreement's own posted hold
  (escrow_settle proves it) to its payer, so it cannot deepen the gap. Re-proved: `PROBE_OK esc-01`
  (probe_esc01_proof_v2).
- Commit 268adce0: probes rebuilt; the lister_short and float sentences in the admin actions updated.
- Apply order when approved: m1 (enum, alone) → m2 → m3 → m4, then batch 2's m5 in the same window, because m2's
  one-credit rule assumes m5. m5b (the unique index) goes only after the code release.

### Re-check conditions (Agent 1, appended to a2-batch1-by-a1.md)
- m9 is applied in the SAME window as m2. The live move_into_pot computes spendable itself, so a debtor could otherwise
  park money in a pot out of a refund's reach. Window: m1 → m2 → m3 → m4 → m5 → m9, with a probe after each.
- RELEASE DEPENDENCY: settlement.ts on this branch calls public.settle_booking_charge (m5). The first code release
  must ship with m5 already applied. Until then, deployed main can still record a second SUCCESSFUL payment and a
  second ledger row for one booking. This is latent: 0 rent_payments, 0 transactions live. m2's one-credit rule
  keeps the lister from being credited twice even then.
- m5 notes addressed: the reconciler treats a REFUNDED transaction as handled (settledTransactionReferences reads
  SUCCESSFUL and REFUNDED). The admin payments read already labels REFUNDED as "refunded". A customer-borne Paystack
  fee (charge = price + fee) is accepted as matching: the ledger records the price as gross and the fee as 0, so
  the lister's share is the price. Proved in the combined run.

### MON-05 (+ OPS-01), a booking paid twice; a late card charge on a cancelled booking kept silently
- STATE: AWAITING-REVIEW
- RE-VERIFIED: the old settlement.ts is four unlocked writes keyed on provider_ref (the code is unchanged from the
  finding). Live has no one-success-per-booking index.
- CHANGE (pending m5_settle.sql): `private.settle_booking_charge` plus a service_role-only public wrapper. It locks
  the payer's wallet, then the booking, then the attempt. SUCCESSFUL/REFUNDED → already-settled. The first charge
  matching an open booking → settled: one ledger row (`on conflict do nothing`), PENDING→CONFIRMED plus history and
  nights. Everything else → `returned-to-wallet`: the attempt is marked REFUNDED (the existing transaction_status
  value, so no enum change and no reader breaks), the whole amount is credited as a `refund` to the payer's wallet
  (reference `charge-returned:<ref>`, idempotent), and a high risk_alert and an audit row are written. The reasons
  are already_paid, booking_<status>, check_in_passed, and amount_mismatch (a customer-borne fee is accepted). It
  never raises for a charge that moved money, so the webhook answers 200.
  m5b_index_after_release.sql (the unique partial index on transactions(booking_id) where SUCCESSFUL) is STAGED
  until after the code release: the deployed settlement.ts would turn a second success into 23505 → 500 → 72 hours
  of retries.
- CODE (4c560b16): settlement.ts → rpc + readSettlement. The webhook answers `posted` 200 for returned-to-wallet.
  checkout.ts tells the payer the money is in their wallet. The reconciler counts REFUNDED as handled.
- NOT DONE (PARTIAL): MON-05 step 6 (reuse an open PENDING attempt at checkout and derive the idempotency key server
  side) is a UI and checkout change and is left for batch 3 or later. Double payment is now harmless (the second
  charge comes back to the wallet), so this is UX, not money. payment-state.ts still maps REFUNDED to "pending", so
  the pay sheet stays on "checking" for a returned charge. It is honest but slow. NEW-A2-02 (LOW): add a
  "returned" state.
- EVIDENCE: PROBE_OK in probe_b2_settle_refund and probe_b2_combined (with m2 stand-in, m6, m9). Covered: the first
  charge settles and confirms; a replay moves nothing; a second charge → returned-to-wallet already_paid, wallet
  +amount, attempt REFUNDED, 0 extra ledger rows, an alert, and its replay is already-settled; a cancelled booking →
  returned with no history written; 1 kobo → amount_mismatch with the booking untouched; the fallback heal settles;
  an unknown reference → unknown-reference; a customer-borne fee → settled with ledger gross = price; a rent card
  charge credits the lister gross − fee once, and a second rent charge is returned with no second credit;
  authenticated cannot call either door.
- TESTS: supabase/tests/probes/mon-05.sql; apps/web/src/lib/bookings/settlement.test.ts.
- REVIEW:

### OPS-02, a payment landing after the booking left PENDING recorded as "host accepted"; the sweep cancels a hold with a payment in flight
- STATE: AWAITING-REVIEW
- (a) and (c) are covered by m5 (no "host accepted" note on a non-live booking; the money is returned and alerted;
  the amount is checked against the booking's listing-derived, now immutable, total).
- (b) m7_holds.sql: `private.expire_booking_holds` spares a PENDING booking whose PENDING attempt is younger than
  2 hours. The result gains `payment_in_flight` (optional in lifecycle.ts's zod, so it parses against both DB
  shapes). Why 2 hours and not 72 with a Paystack verify (the pass-two amendment): the database cannot call
  Paystack, and a charge landing after the release is no longer lost, because m5 returns it to the wallet and
  alerts. The window only has to cover a card session or a transfer, and a long window would re-open the calendar
  squat.
- Reconciler: on an applied run it now SETTLES unsettled booking charges through settleBookingCharge (the
  metadata booking_id is the fallback) instead of only reporting them. A dry run still reports.
- NOT DONE: "on the checkout page, when the booking has a PENDING attempt and no reference param, settle on load"
  (step 5). With the reconciler settling hourly and the webhook, this is left out. Reconcile alert severity is
  unchanged.
- EVIDENCE: probe_b2_holds: a 49-hour hold with an attempt 1 hour old stays PENDING; one with an attempt 3 hours
  old is CANCELLED. m5 probes as above.
- TESTS: supabase/tests/probes/esc-03.sql (sweep section), mon-05.sql.
- REVIEW:

### MON-P2-02, a paid stay cannot be refunded once CANCELLED/NO_SHOW/COMPLETED; no partial refunds
- STATE: AWAITING-REVIEW (DB and server action. The console button is DEFERRED: no UI yet)
- CHANGE (m6_refund.sql): `private.refund_booking_payment` plus a service_role-only wrapper. Any status, bounded
  cumulatively (SUCCESSFUL charges − all booking_refunds), with the guest's refund credit, a negative ledger row and
  a booking_refunds row. The status is untouched. Settled rent goes through `private.rent_refund_shortfall` (V-33).
  booking_refunds_reason_check gains 'goodwill' and 'duplicate_charge' (additive).
  Code: `refundBookingAsAdmin` in lib/admin/bookings-actions.ts (4c560b16), with statuses mapped to sentences.
- EVIDENCE: a COMPLETED booking: part refund 1000 ok; a refund of the full total after that → over_refund; the rest
  → ok; then 1 kobo more → over_refund; the wallet lands exactly the total; the status stays COMPLETED; a member
  caller → forbidden; authenticated cannot execute. Combined run: a rent card refund through this door returns the
  lister to the start.
- TESTS: supabase/tests/probes/mon-05.sql (the refund section).
- REVIEW:

### ESC-03 + SUP-P2-02, free calendar squat; 365-night hold
- STATE: AWAITING-REVIEW
- CHANGE (m7_holds.sql, replacing m3's pricing function): at most 90 nights; at most 3 unconfirmed stays per guest
  and 1 per listing; a cooldown after 2 released unpaid holds on the same listing in 7 days; at most 10 bookings a
  day per guest. The rent charge is exempt. open_rent_charge answers `date_taken` on 23P01 (code in rent/db.ts and
  actions.ts).
- DECISION: "require payment intent" is NOT imposed. Request-to-book stays are PENDING with no payment by design
  (the host accepts, then the guest pays), so a payment-first rule contradicts the product. The limits above make a
  squat cost one account 1 hold per listing, with a cooldown.
- FOUNDER: "Should an unpaid instant-book hold expire after 30 minutes (request-to-book keeps 48 hours)? This needs
  a per-listing instant-book flag, which does not exist today. Answer yes/no."
- EVIDENCE: probe_b2_holds: 3 holds ok; a 4th → booking_hold_limit; a 2nd on the same listing → booking_hold_limit;
  365 nights → booking_too_long; the sweep behaves as described; a rent charge on a held date → date_taken, and on a
  free date → ok. The esc-02 probe was restructured to stay green under these limits.
- TESTS: supabase/tests/probes/esc-03.sql; reserve-refusals.test.ts ("hold limits").
- REVIEW:

### MON-13, reconciliation cannot alarm when the reconciler never replies
- STATE: AWAITING-REVIEW
- RE-VERIFIED (old function, rolled back): previous request 61 minutes old with no stored response →
  verdict `aged_out` (silent).
- CHANGE (m8_mon13.sql): the verdict comes from net._http_response: row missing, timed_out, error_msg, or no status
  → `no_reply` (high alert, with the pg_net fields in the text). The body must match `"ok"\s*:\s*true` plus
  "charges". The timeout goes from 30000 to 120000 ms.
- NOT DONE: the truncation flag on listSuccessfulCharges (1000-row cap) and removing the Vercel dry-run cron.
  Both are small and are left for later in this batch, or DEFERRED.
- EVIDENCE: `PROBE_OK mon-13: missing_row=no_reply timed_out=no_reply ok_false=wrong_body_200 ok_true=ok_200 alerts_added=3`.
- TEST: supabase/tests/probes/mon-13.sql.
- REVIEW:

### MON-10 (+ DB-06, ESC-18) and MON-07, Agent 3's red probes
- STATE: AWAITING-REVIEW (m9_mon10_mon07.sql)
- MON-10: revoke INSERT/UPDATE/DELETE/TRUNCATE on ledger_entries, wallet_entries, wallets, transactions,
  rent_payments and booking_refunds from anon and authenticated. wallet_pots: anon loses all writes, authenticated
  loses DELETE and TRUNCATE (keeps INSERT and UPDATE for the pot screens). bookings: UPDATE/DELETE/TRUNCATE revoked
  from both roles, and INSERT from anon; authenticated keeps INSERT until the reserve RPC. Checked: no SECURITY
  INVOKER function writes any of these tables; every app write on origin/main is on the service-role client
  (settlement/checkout/ledger/audit writers pass `admin`); every function that updates bookings is a definer.
  Steps 4-6 of MON-10 (the append-only trigger on wallet_entries, the setEntryStatus guard, the storage helper) are
  NOT done here.
- MON-07: move_into_pot uses private.wallet_spendable_locked. It must also ship with m2, because spendable now
  subtracts owed rent refunds.
- EVIDENCE: Agent 3's mon-10-money-grants probe body, run after m9 in a transaction → `PROBE_OK
  mon-10-money-grants`. mon-07 → `PROBE_OK mon-07` (the pattern finds only wallet_spendable_locked; an over-move is
  refused insufficient; the control move is ok).
- TESTS: Agent 3's supabase/tests/probes/mon-10-money-grants.sql and mon-07.sql (on fix/a3).
- REVIEW:

### APPLIED WINDOW (2026-09-24, approved by Agent 1): m1 → m2 → m3 → m4 → m5 → m9, a probe after each
- 20260924001516 v33_wallet_entry_kinds_for_rent_to_the_lister (m1)
- 20260924001631 v33_rent_settles_to_the_lister_at_charge (m2). Changed before applying, per Agent 1's m6 finding:
  refund_and_cancel_booking takes the guest's WALLET lock before the BOOKING lock (the same order as every other
  door), and bounds a refund by paid − sum(booking_refunds), so the two refund doors cannot together refund more
  than was paid.
  Probe: PROBE_OK v-33 (live, real kinds).
- 20260924001733 esc02_a_stay_is_priced_by_its_listing_and_fixed_after (m3). Probe: PROBE_OK esc-02 (live).
- 20260924001908 esc01_a_ruling_pays_out_only_money_that_was_taken (m4). Probe: PROBE_OK esc-01 (live).
- 20260924001957 mon05_one_function_settles_a_card_charge_under_the_booking_lock (m5). Probe: PROBE_OK mon-05
  (settle part, live). The full mon-05.sql also covers m6's refund door and runs after m6.
- 20260924002038 mon10_mon07_api_roles_write_no_money_table_and_pots_use_one_spendable (m9). Probes: Agent 3's
  PROBE_OK mon-10-money-grants and PROBE_OK mon-07 (verbatim, live), plus an after-m9 check: the deployed reserve()
  insert with RETURNING works, the pot insert and move_into_pot work, and guest and admin booking UPDATEs over the
  API are refused 42501.
- No probe left a migration row; the version list after each apply showed only the real migration.
- Files committed in f243a2f1, named by server version.
- INTERIM NOTE (Agent 1, m7 review): the deployed main's reserve() maps any 23514 to a generic "went wrong on our
  side" sentence. So until the code release, ESC-02's refusals (listing not live, past check-in) read generically.
  They are not 500s. 0 real stay listings exist.
- STATES: V-33 (DB), ESC-02, ESC-P2-01, ESC-01, MON-05 (DB), MON-10 steps 1-3, MON-07 → FIXED on live (the code
  ships with the release). m5b (unique index) waits for the release.

### BATCH 2 AMENDMENT (after Agent 1's review, reviews/a2-batch2-by-a1.md)
- m6: the two-door over-refund is closed in m2 (applied), refund_and_cancel_booking bounds by paid − sum(booking_refunds)
  and takes the wallet lock first; m6's door already did both. mon-05.sql adds the sequence (goodwill 1000 via the new
  door, then refund-and-cancel of the whole price → over_refund, then the remainder → ok).
- m7 REQUIRED tweak: the 2-hour payment grace is capped absolutely, a hold is spared only while
  created_at > now() − (TTL + 2h). Also taken: the cooldown counts only cancellations written by the sweep (no actor)
  or by the guest, never a host decline; and the hold limits apply only to API callers inserting PENDING (the service
  role and definer paths are not squatting, and the probes insert as postgres).
- m8 recommendation taken: at most one open "Money reconciliation:" alert per 24 hours (an outage is one row). The
  dead-job watchdog is DEFERRED: pg-cron-watch reads failed runs, not a job that stopped being scheduled; a check of
  reconciliation_watch.last_requested_at belongs in that job (private schema, needs a small definer read), NEW-A2-03 (LOW).
- Proofs (rolled back, live DB with m1–m5, m9 applied): `PROBE_OK m6 m7 amended (two-door bound, grace cap,
  decline-free cooldown)`; `PROBE_OK mon-13 ... alerts_added=1`.
- Probes updated: mon-05.sql, esc-03.sql (3ca9bd5f), mon-13.sql.

### BATCH 2 APPLIED (m6, m7, m8, after Agent 1's re-check: all APPROVE)
- 20260924003520 monp202_a_paid_booking_can_be_refunded_in_part_in_any_status (m6)
- 20260924003606 esc03_a_stay_hold_is_limited_and_a_payment_in_flight_is_spared (m7)
- 20260924003739 mon13_the_reconciliation_job_judges_the_last_call_on_what_pg_net_recorded (m8). Agent 1's note
  was taken: the dedupe is keyed on the FULL title, so there is one open alert per kind of failure.
- Live probes after applying: PROBE_OK esc-03, PROBE_OK mon-05 (full: settle, two-door bound, refund door, V-33
  card rent), PROBE_OK mon-13 (alerts_added=2, one per kind). No probe left a migration row.
- Files committed in 3c0047e1.
- RELEASE GATE: m6 and m7 are now LIVE, which the release requires before it merges to main. m5b (the unique index)
  still waits until after the release.
- STATES: MON-P2-02, ESC-03, SUP-P2-02, OPS-02(b), MON-13 → FIXED on live (the code ships with the release).

### URGENT: the email leak in 1a4f0a3c (Agent 1's re-check) → FIXED in 013b3576
- emailForHandle is removed. /wallet/send?to=@handle prefills "@handle" only. A handle is resolved on the server
  as the payer's own session client (social_profiles_select hides blocked people) to an account id only, in
  lookupRecipient and in transferToUser. Tests: send/page.test.ts (red on the old code: the victim's address was
  in the props), recipient-action.test.ts (handle, blocked), transfer-idempotency.test.ts (handle send, blocked
  handle refused), recipient-input.test.ts.

### MON-01 (batch 3) code → f97164ac
- An unknown transfer outcome (a timeout, a network error, a 5xx, or a 2xx that cannot be parsed) after
  initiateTransfer keeps the entry PENDING and the hold held. setEntryStatus moves PENDING rows only, and the
  withdraw form sends a stable idempotency key. Tests: paystack-outcome.test.ts, withdraw-door.test.ts (MON-01 block).

#### BATCH 3 (MON-01, MON-02, MON-03, NEW-A2-04, ESC-07/08, MON-08 pots)

- **MON-01: FIXED in code.** Commits f97164ac (keep the hold on an unknown outcome) and 9624d188:
  - `sweepStaleWithdrawalHolds` reads a 404 as "never started" only when the hold is at least
    NEVER_STARTED_MIN_AGE_MINUTES (30) old, whatever window the caller passes (Agent 1's note, asserted with a
    constant and a test).
  - A hold still PENDING after 24h raises one critical `wallet.withdrawal_stuck` alert (folded per reference).
  - Tests: withdraw-sweep.test.ts, paystack-outcome.test.ts, withdraw-door.test.ts.
- **MON-02: FIXED in code (9624d188); the DB side is STAGED.**
  - The admin "release the stuck holds" button now runs the verifying sweep with the admin as actor, and never the
    age-only SQL.
  - The en copy is updated.
  - Tests: sweep-holds-action.test.ts and payments-authorisation.test.ts (updated).
  - STAGED m10 (sql/m10_mon02_after_release.sql): revoke EXECUTE on `admin_expire_stale_withdrawal_holds` and
    `expire_stale_withdrawal_holds` from every API role. No cron job or other function calls them.
  - Deployed main's button calls the first one, so m10 is applied after the release.
  - Proof (rolled back): red first (an admin reached the age-only release), then PROBE_OK mon-02.
- **MON-03: FIXED in code (812a1866).** `transfer.reversed` for a COMPLETED withdrawal posts one `refund` credit
  keyed on `<ref>-reversal` (unique, so idempotent), audits it and raises a critical alert. FAILED, REVERSED and
  PENDING holds are never credited. Tests: withdrawal-reversal.test.ts and webhook reversal.test.ts.
- **NEW-A2-04 (MEDIUM-HIGH, from Agent 1's re-check): FIXED (a7fed0b4).**
  - The email recipient path was an account-existence and name oracle that ignored blocks.
  - Now a blocked person (either direction) resolves exactly like "no account"; a failed block read counts as
    blocked.
  - The send door shares the lookup's per-member budget (40 per 10 minutes).
  - Tests: recipient-action.test.ts and transfer-idempotency.test.ts.
- **Email leak in 1a4f0a3c: FIXED (013b3576), APPROVED by Agent 1 (reviews/a2-batch3a-by-a1.md).**
- **ESC-07 / ESC-08: code and probe committed (084a3c3d); migration m11 (sql/m11_esc07_esc08.sql) AWAITS REVIEW.**
  - ESC-08:
    - `private.platform_settings.custody_structure` is 'undecided'.
    - `private.held_payments_open()` = the flag AND custody decided; propose and fund refuse in the database.
    - A feature_flags guard: only a super admin may write `held_payments` through the API, and nobody may switch
      it on while custody is undecided.
    - An audit trigger on every flag change.
    - anon loses INSERT, UPDATE and DELETE on feature_flags.
  - ESC-07:
    - Rulings are super admin only, and never by a party to the escrow.
    - Two people at or above N500,000 (`private.escrow_two_person_threshold_minor`, recorded on each ruling). A
      proposal lapses after 72h, and a contrary ruling is refused.
    - Every ruling is a row in `public.escrow_rulings`, audited.
    - `escrow_reverse_ruling` is done by a super admin who neither proposed nor approved the ruling. The settlement
      credit is marked REVERSED (its reference is freed), the commission row is removed, and the escrow goes back
      to DISPUTED. It refuses when the credited wallet cannot cover the credit.
    - The I-8 invariant now reads COMPLETED settlements only.
    - Compatible with deployed main: same signature; a plain admin now gets 'forbidden'; no escrows exist.
  - Proof (rolled back, m11 plus probe): PROBE_OK esc-07-08. The proof paste had some comment and whitespace
    compressed in propose and fund; the committed SQL is the file.
  - FOUNDER: live has ONE super_admin, so rulings at or above N500,000 cannot complete until a second one is
    appointed (fails closed). MFA/aal2 is still absent.
- **MON-08 (pots): code and probe committed (f6e1df46); m12a (additive, safe now) and m12b (drop column, after the
  release) AWAIT REVIEW.**
  - Readers of `balance_minor` checked:
    - pots.ts (now reads the `wallet_pot_balances` view);
    - the insert policy;
    - `wallet_pots_guard`;
    - `move_into_pot` and `move_out_of_pot`;
    - Agent 4's MON-09 blocker, which must use `private.pot_balance_minor`.
  - m12a: `private.pot_balance_minor`, the security_invoker view, and `move_out_of_pot` deciding on the derived
    balance.
  - Proofs: red first (a drifted stored balance paid out 60000 from a pot holding 50000), then PROBE_OK mon-08
    (stage A), then PROBE_OK mon-08 (stage B, column dropped).
- **Gates on fix/a2 at f6e1df46:** tsc clean; eslint 0 errors; vitest 256 files, 3927 passed (1 skipped); next build
  exit 0; tsconfig unchanged.

### Batch 3 review (Agent 1, reviews/a2-batch3-by-a1.md)
- m12a APPLIED as 20260924013818_mon08_a_pot_balance_is_the_ledgers, with L5 taken: an API caller learns only its own
  pots' balances. Live probe: PROBE_OK mon-08. Committed in c8b6e759.
- **m11 AMENDED, awaiting re-check.**
  - R1:
    - service_role loses INSERT, UPDATE, DELETE and TRUNCATE on escrow_rulings.
    - A guard refuses DELETE and freezes the proposal columns.
    - Only proposed→applied, proposed→lapsed and applied→reversed are allowed; applied approvals are fixed and a
      reversed ruling is final.
  - R2: escrow_hold loses EXECUTE for every API role (nothing calls it). A BEFORE INSERT trigger on escrows refuses
    anon, authenticated and service_role while the gate is closed.
  - R3: the reversal writes the removed platform_revenue row to audit_log as `platform_revenue.reversed`.
  - LOWs taken: L1 (any ruling after a reversal needs two people), L2 (comment), L3 (a refused shortfall reversal
    raises a desk alert, once).
  - L4 structuring: DEFERRED. The threshold is per escrow, so it is a founder policy question.
  - L6 (a missed transfer.reversed webhook): NEW-A2-05 LOW, DEFERRED. The sweep reads only PENDING; a daily verify
    of recent COMPLETED withdrawals would close it (payouts are refused by Paystack today).
  - Proof (rolled back, m11 plus m15 plus the extended probe): PROBE_OK esc-07-08.

#### BATCH 4 (MEDIUM/LOW in A01/A02, in rank order): AWAITING-REVIEW
### ESC-05: money leaves escrow when nobody should release it
- STATE: AWAITING-REVIEW (sql/m13_esc05_esc09_esc15.sql; it requires m11's platform_settings and trigger first).
- CHANGED:
  - A `held_payments_payouts` switch (ships on). Any admin may pause it; only a super admin may resume.
    `escrow_payouts_open()` treats a missing row as closed.
  - The sweeper and confirm pay nothing while payouts are paused (an audit row records it). Confirm answers
    `payouts_paused` and the sweeper pays both-confirmed rows once payouts resume.
  - A payee with a live agent suspension or a scheduled deletion is moved to DISPUTED ("Paused by Vallo"), with one
    alert and a notice to both parties.
  - Code 339faec3: the sentences for held_payments_closed, payouts_paused and paused_for_review.
- EVIDENCE: rolled-back proof (m13 plus probe) gives PROBE_OK esc-05. Vitest escrow actions: 26 pass.
- TEST: supabase/tests/probes/esc-05.sql, apps/web/src/lib/escrow/actions.test.ts.
### ESC-15: the sweeper takes no lock and one raise rolls back the batch
- STATE: AWAITING-REVIEW (m13).
- CHANGED: `for update skip locked`; each settle in its own subtransaction; only 'ok' is counted; a row that cannot
  settle is moved out of the queue (DISPUTED, "Paused by Vallo").
- EVIDENCE: esc-05 probe (a poisoned row is paused while the other row pays out).
### ESC-09: disputes and proposals never time out
- STATE: AWAITING-REVIEW (m13).
- CHANGED: `private.escrow_age_watch` runs hourly (cron `vallo_escrow_age_watch`, :41):
  - it alerts on a dispute older than 48h (medium) and older than 7 days (high), once per level;
  - it cancels an INITIATED proposal older than 14 days.
- The dispute SLA copy is FOUNDER: decide the SLA wording for the sheet and docs.
- EVIDENCE: esc-05 probe.
### ESC-14: an accepted stay nobody paid for has no timeout
- STATE: AWAITING-REVIEW, amendment (sql/m14_esc14_an_accepted_stay_nobody_paid_for_lapses.sql). Agent 1's
  CHANGES REQUIRED is addressed:
  - on check-in day, the acceptance must be at least 2h old;
  - the in-flight wait now applies on check-in day too, capped at 26h after acceptance;
  - re-proved with PROBE_OK esc-14 (70192539).
- CHANGED: `expire_booking_holds` also cancels an unpaid CONFIRMED stay 24h after acceptance, or on check-in day
  (Lagos). A payment in flight within 2h is waited for, and rent charges are skipped. It returns `accepted_unpaid`.
- EVIDENCE: red first (a stay accepted 25h ago and unpaid stayed CONFIRMED), then PROBE_OK esc-14 (rolled back).
- TEST: supabase/tests/probes/esc-14.sql.
### MON-10: the ledger is not append-only
- STATE: steps 1-3 were FIXED earlier (20260924002038). Step 4 is FIXED (live 20260924015257, committed in
  9cc2fe31, live PROBE_OK mon-10). Step 5 was FIXED with MON-01 (setEntryStatus is PENDING-only).
  Step 6 (the storage helper error text) is not in this area (DB-04).
- CHANGED: a BEFORE UPDATE OR DELETE trigger on wallet_entries, for every role:
  - no delete;
  - wallet, kind, direction, amount and created_at are fixed;
  - status moves only from PENDING;
  - the money metadata keys are fixed;
  - the one sanctioned correction is ESC-07's reversal, under its flag.
- EVIDENCE: red first (the owner rewrote an amount and deleted an entry), then PROBE_OK mon-10. The m11 plus m15
  proof also passes.
- TEST: supabase/tests/probes/mon-10.sql.
### MON-11: idempotency keys not tied to contents or ledger references
- STATE: FIXED in code (a59fafda), for transfers.
- CHANGED:
  - `withGuardedIdempotency`: a request digest is stored with the result, and a replay with a different digest
    answers "conflict".
  - It fails closed when the store is unreachable.
  - The P2P references are derived from (payer, key), so a late retry is a database duplicate.
  - The withdraw references stay random, because a key-derived hold reference would block retrying a failed
    withdrawal with the same key.
- TEST: transfer-idempotency.test.ts (conflict, store down, derived refs).
### MON-12: the typed-account withdrawal's unlocked fallback
- STATE: FIXED in code (b0a4ffe8). The fallback is removed (it refuses), and `isMissing` matches codes only
  (PGRST202/42883).
- TEST: withdraw-door.test.ts (MON-12) and rpc.test.ts (message-only and relation-inside-function are 'failed').

### m13 amendment (ESC-05 / ESC-09 / ESC-15)
- STATE: FIXED. Live as 20260924021431 (m13) and 20260924021524 (m14), committed in 6c1c0427, live PROBE_OK esc-05 and
  esc-14.
- CHANGED: `private.escrow_payout_gate` checks the payouts switch and the payee block in one place. It is called by:
  - the sweeper;
  - escrow_confirm_as;
  - private.escrow_inspection_is_a_signal, the third door Agent 1 found;
  - public.escrow_release, a fourth door (service role only, with no app caller).
- Rulings and refunds are not gated, by design.
- EVIDENCE: PROBE_OK esc-05 with the new cases (70192539).
### ESC-07 / ESC-08 (m11)
- STATE: FIXED. Live as 20260924015442, committed in 9cc2fe31, live PROBE_OK esc-07-08.
- FOUNDER: a second super_admin is needed. Until then, a ruling of N500k or more fails closed.
### Reviews
- a1-batch4c-by-a2.md:
  - DB-07: CHANGES REQUIRED (R1/R2 MEDIUM, R3/R4 LOW);
  - DB-09: APPROVE;
  - DB-16: CHANGES REQUIRED, blocker D1 (SET NULL collides with conversations_context_shape_chk and the context
    trigger, so a delete gives 23514).
### ESC-04: a host can mark a paid stay NO_SHOW from 00:00 WAT on check-in day and resell the nights
- STATE: FIXED. Code in 4fac01b2 and 4ad72636. DB live as 20260924023556 (approved by Agent 1, live PROBE_OK esc-04).
- RE-VERIFIED: red first. Live `record_booking_no_show` on a CONFIRMED stay on check-in day returned `recorded`.
- CHANGED (DB):
  - no show only from 12:00 WAT the day after check-in (`too_early`, with `opens_at`);
  - refused on any booking with a rent_payments row (`rent_charge`);
  - the availability rows are no longer deleted;
  - `bookings_no_overlap` now includes NO_SHOW, so the nights stay held until check-out.
  - Deployed main's parser does not know the new outcomes. It fails closed ("could not record that just now"), and
    nothing is recorded.
- CHANGED (app):
  - `noShowDecision` gains `too_early`, using `noShowOpensAt`, the same moment as the database;
  - the parser and messages gain `too_early` and `rent_charge`.
- EVIDENCE: PROBE_OK esc-04 (rolled back). Covers check-in day refused, after the grace recorded with 3 of 3 nights
  still booked, a resale giving an exclusion_violation, and a rent charge refused.
- TEST: lifecycle.test.ts (grace boundaries, parser); supabase/tests/probes/esc-04.sql.
- FOUNDER, the no-show money rule. Today the guest's payment is unchanged by a no show; nothing refunds or moves it.
  - RECOMMENDED DEFAULT: the host keeps the first night's price. The remaining nights' price is refunded to the
    guest's Vallo wallet automatically 48 hours after the no show is recorded, unless the guest disputes it first. A
    dispute holds everything for a person to decide. The service fee is not refunded.
  - That needs one more migration, a refund leg on NO_SHOW plus a 48h sweep, once the rule is decided.

### MON-04: money can enter the wallet and cannot leave it, while the Terms promise it can
- STATE: FIXED in copy (c90fd9b9). AWAITING-REVIEW.
- RE-VERIFIED:
  - the withdraw sheet is not drawn;
  - the Paystack Starter account refuses third-party payouts;
  - the Terms §5 said "you move money from there to your bank".
- CHANGED:
  - `lib/wallet/bank-payouts.ts` holds `BANK_PAYOUTS_OPEN = false` and the sentences it chooses.
  - Every site now says wallet money can be spent on Vallo and sent to other Vallo members, and becomes withdrawable
    once bank payouts open, with no date. The sites:
    - Terms §5;
    - cancellations;
    - help (the wallet, refund and "when do agents get paid" answers);
    - the emails (top-up, admin cancel refund, escrow release and return);
    - the support knowledge base;
    - the landing lines in en.ts (neutral: "Top up, pay and send");
    - the payment-methods panel;
    - the deletion blocker.
  - The deletion blocker CTA is now "Spend or send it". Its line names the honest route while payouts are closed:
    spend, send, or contact support. The public /delete-account page says the same.
  - TERMS_VERSION is now 2026-09-24.
- **THE FLIP, the day bank payouts complete:** set `BANK_PAYOUTS_OPEN = true` in
  `apps/web/src/lib/wallet/bank-payouts.ts`, and bump `TERMS_VERSION` in `apps/web/src/lib/legal/versions.ts`,
  because the Terms text changes with it. Then draw the withdraw tile in WalletDeck.
- TEST: lib/wallet/bank-payouts.test.ts. It checks that the retired sentences are gone from every named site, that
  every site reads the switch, and that no date is promised.
- NOTE: the V-02 claims check (on the gate) was not present on fix/a2. The new sentences use none of its claim words.
### ESC-13: the Terms and escrow copy disagree with what the product does
- STATE: FIXED in copy (c90fd9b9, 10134d9e). AWAITING-REVIEW.
- CHANGED:
  - Terms §4 now says:
    - a stay payment and wallet money are collected into Vallo's account and recorded;
    - the host's share is recorded, and not yet paid out to a bank (it follows the switch);
    - this is not escrow.
  - Terms §5 says a move-in total paid on Vallo is credited to the lister's wallet. That is true live, through
    settle_rent_charge_to_lister.
  - RESOLVED now reads "Settled after review" and describes the effect.
  - /escrow says held payments are not open yet while the gate is closed.
  - The admin lede "Secure transactions. Fair outcomes." is removed.
- PRECONDITION for opening held payments (for the founder): Terms §4 needs a held-payments section before the
  held_payments row is switched on. It must cover what is held, for how long, who rules, and what happens on dispute.
  m11 already refuses the switch until custody is decided; this is the non-probe half of that condition. A solicitor
  should read it.
### MON-04 amendment (Agent 1's R1/R2)
- STATE: FIXED (d43b6f25). AWAITING Agent 1's re-check.
- CHANGED:
  - These sites now follow BANK_PAYOUTS_OPEN:
    - the safety page;
    - help's refund answer;
    - /docs (8 places, including "Withdrawing to your bank");
    - the escrowReleased email;
    - the payout-account emails;
    - the support FAQ.
  - Two claim words were reworded to match the release branch.
- FOUNDER: Terms §17 promises notice before significant changes, and no notice mechanism exists. TERMS_VERSION moved
  to 2026-09-24 with no re-accept gate, so nobody is prompted.
- LOW (not mine): a sign-up form opened before a TERMS_VERSION bump is refused with "Please tick the box". A clearer
  message would help. Owner: the auth/terms-gate owner.
### MON-P2-01: commission priced at release; one admin can set 100%
- STATE: FIXED. Code in bca52bed. DB live as 20260924025218 (approved by Agent 1, live PROBE_OK mon-p2-01), committed
  in af816240.
- RE-VERIFIED: red first. A rate raised after funding took 10000 of 100000 at release (live function, rolled back).
- CHANGED (DB):
  - `escrows.agreed_commission_minor` and `agreed_commission_rate_id` are stamped by a trigger on INITIATED→FUNDED.
    They are fixed after that and nulled on insert.
  - escrow_settle uses the stamped values (0 when none is stamped).
  - fee_rates CHECK: basis_points ≤ 2000.
  - set_fee_rate caps at 2000, and a raise of bps or flat needs super_admin.
- EVIDENCE: PROBE_OK mon-p2-01 (rolled back). It covers:
  - a rise after funding took 0;
  - an escrow funded after the rise took 10%;
  - the agreed figure cannot be rewritten (42501);
  - a 25% row is a check violation;
  - an admin's raise gets raise_needs_super_admin, and 25% gets bad_rate;
  - an admin can lower the rate, and a super admin can raise it.
- NOT DONE: showing the commission on the proposal to both sides (it is 0 today); revoking set_fee_rate from
  authenticated waits for MFA (per the finding).

### MON-15: "Refunds reach your wallet in 3 to 5 business days"
- STATE: FIXED (d94d483c). The line now reads "A refund from a cancelled stay lands in your wallet the moment it is
  decided." That is true: every refund path posts a COMPLETED credit.
- TEST: lib/wallet/send-copy.test.ts.
### MON-P2-03: the only real top-up was credited late by the reconciler
- STATE: FIXED (44311f44, then df4a50c8 for Agent 1's R1 and R2: a 15-minute webhook grace, and paging only on settled
  or returned-to-wallet). APPROVED by Agent 1.
- CHANGED: every recovery raises a critical `payment.webhook.missed` alert, one per reference. The recoveries are the
  admin reconcile posting a funding, the sweep posting a funding gap, and the sweep settling a booking charge. The
  webhook already audits every credit (wallet.funding.posted).
- FOUNDER: register https://www.vallospaces.com/api/paystack/webhook in the Paystack dashboard (live mode), send a
  test event, and confirm a wallet.funding.posted audit row.
- TEST: reconciliation.test.ts.
### ESC-P2-02: a tenancy is stored as a one-night stay
- STATE: FIXED. Live as 20260924030348 (approved by Agent 1, live PROBE_OK esc-p2-02), committed in d63af298.
- RE-VERIFIED (red): live announce_completed_stays posted 1 for a tenancy alone, and complete_ended_stays moved it to
  COMPLETED.
- CHANGED: both functions skip any booking with a rent_payments row. ESC-04 and ESC-14 already skip these bookings.
  Refunds work through refund_booking_payment in any status (MON-P2-02).
- NOT DONE: a separate kind or exclusion for tenancies in bookings_no_overlap. A tenancy now stays CONFIRMED after
  move-in; the /bookings tab placement for it is for the product owner.
- EVIDENCE: PROBE_OK esc-p2-02 (rolled back), with a stay as the control for both functions.
### ESC-11: "pays out on <date>" hides the hour and is rendered in UTC
- STATE: FIXED. Code in 80501276. DB live as 20260924030408 (approved, live PROBE_OK esc-11), committed in d63af298.
  The held-payments gate stays closed until the release deploys.
- CHANGED:
  - A trigger snaps any future auto_release_at to the end of its Lagos day. It is idempotent and leaves due moments
    alone, and it covers every door that sets the column.
  - A one-off backfill covers HELD rows (0 live).
  - The copy says "pays out at the end of <Lagos date>, Lagos time", and the composer counts from today in Lagos.
- ORDER: m19 must be live before the app release ships. Otherwise "at the end of" would name a day that pays out
  that morning.
- EVIDENCE: PROBE_OK esc-11 (rolled back). TEST: escrow copy.test.ts.

### MON-14: processor fees on top-ups recorded nowhere
- STATE: FIXED in part (3a9e4d30, APPROVED; 84db2131, Agent 1's LOW that sweep-settled bookings should carry the
  fee, awaiting re-check).
- CHANGED: all four Paystack funding writers record `processor_fee_minor` (reported kobo, or null) on the credit.
- FOUNDER:
  - should the payer bear the fee (Paystack `bearer`), or should Vallo absorb it?
  - a daily check that wallet liabilities, plus pots, plus the escrow float are at most the Paystack balance;
  - hosts are paid more when a guest pays from the wallet (card fee 0) than by card.
### MON-16: no receipt or statement as a document
- STATE: FIXED in part (3b41d742, APPROVED). LOW from Agent 1: print once, by hand, from both the receipt route and
  the sheet before release. `position: absolute` anchors to a transformed ancestor.
- CHANGED:
  - Share carries the amount and direction, the Lagos date, the details and property, the status, the reference and
    the issuer (VALLO SPACES LTD, RC 9870413).
  - A Print button uses the browser's print, which also saves a PDF, and print CSS prints the receipt alone.
- OPEN:
  - a server-rendered PDF endpoint;
  - statement export (CSV/PDF), and paging past STATEMENT_LIMIT=100;
  - the Capacitor native print or share path.
- TEST: receipt-text.test.ts.
### LOWs raised by Agent 1 in review (for the owner or founder)
- ESC-11: the admin escrow desk shows the raw midnight of auto_release_at. The desk could show the same "end of <date>"
  wording.
- ESC-P2-02: sweep_badges (first_stay, ten_stays) and agent_trust "deals" now count a tenancy permanently, because it
  stays CONFIRMED. FOUNDER: should a tenancy get a terminal state?
- NEW-A1-03 (Agent 1's, not mine): reviews require CONFIRMED, while completion runs the next night.

### MON-17: a payment-request link rounds the kobo away
- STATE: FIXED (2ad72a38, APPROVED). The link carries "5000.50".
### MON-20: an unknown funding reference says "wait"
- STATE: FIXED (2ad72a38, APPROVED; 5073ffdf, Agent 1's wording LOW). A 404 or 400 now reads "We have no payment
  under that reference. If money left your account, contact support with the reference and we will trace it."
### MON-18: pot moves have no idempotency key
- STATE: FIXED (d1c4a814), APPROVED. Each sheet has one key, and the reference is derived from it.
### ESC-16: dead service-role ruling action
- STATE: FIXED (6c0111a6), APPROVED. The file is deleted, and a guard test stops it coming back.
### ESC-P2-03: escrow credits use a format the app does not parse
- STATE: FIXED in the app (979a9858), APPROVED. escrowIdFromReference reads both formats. No ledger
  reference changed.
- NOT DONE: unifying the DB format and I-3c. The app now reads both, so this is optional.
### Reviews by me in this stretch
- a1-batch4c: DB-07 and DB-16. My blocker was fixed; both were re-checked and APPROVED.
- a1-batch4d: DB-11 (the 71st row, spendable) and DB-18/19. Both APPLIED.
- a1-batch4e: DB-13/14, with 4 more FK indexes. APPLIED.
- a1-batch5: NEW-A1-03 (APPLIED) and NEW-A1-03b (L1, APPROVED).

#### WHERE I STOPPED
Everything is committed on fix/a2 (HEAD d1c4a814). No staged migrations are waiting: m1–m19 are all live, apart from
m10 and m12b below.

Staged, and deliberately not applied:
- sql/m10_mon02_after_release.sql
- sql/m12b_drop_pot_balance_column_after_release.sql

Both apply only after the release deploys; both were APPROVED earlier.

Open LOWs in my area, not started:
- MON-06: show spendable, not settled, as "available". This only matters once payouts create PENDING debits.
- MON-19: the Yellow Card webhook trusts the amount and currency. It is dormant (no keys).
- ESC-10: store hold_days on the proposal and ignore the payer's value at funding.
- ESC-12: PROBE_STATE.md has contradictory sections, and escrow_revoke.sh scores a 404 as a pass.
- ESC-17:
  - open_rent_charge and account_deletion_blockers use current_date (UTC);
  - "today in Lagos" is duplicated 13 times;
  - the announce part is covered by m18.
- NEW-A2-05: a missed transfer.reversed webhook is never detected. A daily verify of COMPLETED withdrawals would catch
  it.

FOUNDER items across my area:
- a second super_admin;
- dispute SLA wording (ESC-09);
- the no-show money rule (ESC-04, recommended default above);
- the Terms held-payments section before the flag opens (ESC-13);
- Terms §17 notice;
- fee bearer and a daily liability check (MON-14);
- Paystack webhook registration (MON-P2-03);
- a tenancy terminal state and badges (ESC-P2-02 LOW);
- a refunded stay counting as a deal (NEW-A1-03 L2);
- the MON-04 flip day;
- L4 structuring (deferred).
- All five final commits are APPROVED by Agent 1: 5073ffdf, 84db2131, 6c0111a6, 979a9858, d1c4a814
  (reviews/a2-batch8-by-a1.md, 8b). NEW-A1-03b is live as 20260924065453.

#### SWEEP BATCH (orchestrator, 2026-09-24)
- SEC-P2-04 DONE 0f9a4707. Card checkout (guardPayable) refuses anyone but the booking's guest, as pay_booking_from_wallet
  already does. Test: checkout-idempotency.test.ts, "only the guest pays for a booking (SEC-P2-04)"; red without the check.
- OPS-P2-04 CLOSED by MON-P2-03 (44311f44, df4a50c8): every reconcile or sweep recovery older than the 15-minute grace
  raises a critical `payment.webhook.missed` alert per reference (tests: reconcile-webhook-missed.test.ts). No new code.
- OPS-P2-03 DONE 9fe402d8 (probe only). The constraint `risk_alerts_open_has_no_resolution` (DB-19, 20260924023518) already
  enforces it. probes/ops-p2-03.sql: PROBE_OK live.
- DB-P2-02 DONE 9fe402d8 (probe only). Live had 0 open alerts; the account-purge probe alerts were resolved 2026-09-22, so
  no data change was needed. probes/db-p2-02.sql: PROBE_OK live.
- NEW-A2-05 DONE d1efb30a, fa5e6e63 (reads newest first over a 7-day window, per Agent 3). verifyPaidWithdrawals in reconciliation.ts runs in the 23:00 UTC reconcile run (midnight in
  Lagos). It re-asks Paystack about COMPLETED withdrawals from the last 3 days with no `-reversal` credit, and credits a
  reversed one through creditReversedWithdrawal with the webhook's audit and critical alert. Test: paid-verify.test.ts.
- ESC-17 DONE c059448c, eb0583c0. APPLIED live as 20260924071041. The Lagos date in private.open_rent_charge and
  private.deletion_money_blockers (account_deletion_blockers reads current_date through that helper). probes/esc-17.sql
  failed live before the fix and returns PROBE_OK after it, including Agent 3's booking check; no probe row was left.
  Deduping "today in Lagos" in the app is DEFERRED: it is copy-level and carries no money risk.
- MON-19 DEFERRED: Yellow Card is dormant (no keys, no route taking live money). Fix it with the integration.
- ESC-10 DEFERRED: needs a proposal schema change. Only the payer sets hold_days, on their own money, and the payout gate
  (m13) still bounds it. More than 15 minutes.
- Agent 3 APPROVED all of it (reviews/a2-sweep-by-a3.md). Gates are green: tsc, lint, build, and vitest 3991 passing. The one
  failure, service-worker.browser.test, is an unrelated flake that passes on its own.
- I reviewed A1 batch 9. SUP-09 needs CHANGES: its open_rent_charge body reverts ESC-17 (current_date), and listing_is_let
  locks a home forever, including after a cancelled tenancy. SEC-02 is APPROVED.

## Agent 3: the pipeline, the tests and the blind lights

### Ledger, Agent 3 (fix/a3): the pipeline, the tests and the blind lights

#### BASELINE at 77cf90a (worktree /home/user/wt/a3, node v22.22.2, NO env vars set: no SUPABASE/SENTRY/NEXT_PUBLIC/DATABASE vars in the shell)
IMPORTANT: these gates ran against the hardlinked node_modules tree (next 16.3.6, sharp 0.35.4, @capacitor/push-notifications 8.1.2), NOT the lockfile tree (lock: next 16.2.12, sharp 0.35.3, no push-notifications entry). That drift is DOC-02.
- `npm run typecheck`: exit 0, 1m15s, no output errors.
- `npm run lint`: exit 0, 1m07s, eslint "✖ 335 problems (0 errors, 335 warnings)"; css tokens: clean; valuation words: clean (1809 files).
- `npx vitest run` (apps/web): exit 0, 38.7s, Test Files 242 passed (242); Tests 3859 passed | 1 skipped (3860).
- `npm run build`: exit 0 (GREEN), 2m00s wall (compile 47s, TypeScript 53s, 199 static pages), "▲ Next.js 16.3.6 (Turbopack)", "✓ Running next.config.ts took 4.1s". Zero lines matching warn/error/⚠ in the log (only route names containing "error"). Needed NO env vars. apps/web/tsconfig.json NOT rewritten (git status clean after).
- Build is GREEN → no RED message sent to orchestrator.

#### BATCH 1

### DOC-01, CI red on the lockfile, dead on billing, main unprotected
- REVIEW: Agent 6: APPROVED.
- STATE: FIXED (lockfile) + FOUNDER (billing, branch protection), AWAITING-REVIEW
- RE-VERIFIED at 77cf90a: clean export + `npm ci` → `npm error Missing: @capacitor/push-notifications@8.1.2 from lock file` (exit 1).
- CHANGED: package-lock.json only, commit 74abba30 (`npm install --package-lock-only`; +10 lines: the workspace dependency line and the one package entry; nothing else moved).
- EVIDENCE IT NOW WORKS: `npm ci` in a clean `git archive` export with the new lock → exit 0 in 18s.
- TEST THAT WOULD HAVE CAUGHT IT: CI's own `npm ci` step (it did catch it; nobody could see CI). No unit test is meaningful for a lockfile.
- FOUNDER (one step each, in order):
  1. GitHub → Settings → Billing and plans: settle the failed payment or raise the Actions spending limit above $0 (jobs have not started since 15:48Z on 23 Sep: "recent account payments have failed").
  2. Branch protection for `main` (needs GitHub Pro/Team for a private repo; the rulesets API returned 403 "Upgrade to GitHub Pro or make this repository public"). Settings → Branches → Add branch protection rule → Branch name pattern `main`: tick "Require status checks to pass before merging" + "Require branches to be up to date", add required checks **`Typecheck, lint, test`** and **`Build`** ONLY (the deterministic jobs; do NOT require `Advisories (production dependencies)`: an unfixable new advisory or an audit-service outage must not block merges; add **`Database probes`** as required only once the PROBES_DATABASE_URL secret exists), tick "Do not allow bypassing the above settings"; leave "Allow force pushes" and "Allow deletions" UNticked. If Pro is not bought: Vercel → Project → Settings → Git → "Ignored Build Step"/Deployment Checks set to wait for the GitHub `Build` and `Typecheck, lint, test` checks.
  3. Vercel → Project → Settings → Build and Deployment → Install Command: override to `npm ci` so Vercel and CI install the same tree.

### DOC-02, production ran Next 16.2.12 / sharp 0.35.3 from the lock; gates ran another tree
- STATE: FIXED, AWAITING-REVIEW
- RE-VERIFIED: lock had next 16.2.12, sharp 0.35.3, nanoid 3.3.16; worktree node_modules had next 16.3.6, react 19.3.0 (drift). `npm audit --omit=dev` on the lock: 1 critical (next), 2 high.
- CHANGED: commit fc23bba1, apps/web `next` ^16.2.12→^16.3.6; root override `sharp` ^0.35.3→^0.35.4; nanoid 3.3.16→3.3.19 (in range, `npm update nanoid --package-lock-only`). Note: `npm install --package-lock-only` (and a full `npm install`) left the old root sharp@0.35.3 marked "invalid" against the override and nested a second next under apps/web; the stale next/sharp/@img/@next-swc entries were dropped and the lock regenerated → diff is 168/168 lines, version bumps only (next 16.2.12→16.3.6 ×10 incl. @next/swc-*, sharp/@img 0.35.3→0.35.4 ×17, @swc/helpers 0.5.15→0.5.23, nanoid).
- EVIDENCE: `npm ls next sharp --package-lock-only` → next@16.3.6, sharp@0.35.4 deduped, no invalid. `npm audit --omit=dev --audit-level=high` → "found 0 vulnerabilities". Full `npm audit` (incl. dev tooling) still reports dev-only issues, not shipped. Worktree node_modules re-installed with `npm ci` (real dir, not a symlink) → next 16.3.6, react 19.2.8, sharp 0.35.4, supabase-js 2.110.9 = the lock = what Vercel ships.
- Gates on a clean `npm ci` export of the lock tree (before DOC-P2-02): npm ci 14s; typecheck exit 0 (50s); lint exit 0, 0 errors / **333** warnings (335 on the drifted tree: the lockfile's eslint-config-next/react differ); vitest 241/242 files, the one failure was `no-committed-secrets.test.ts` running `git ls-files` in a non-git export (environmental; passes in the worktree); build exit 0 (1m26s) "▲ Next.js 16.3.6".
- TEST THAT WOULD HAVE CAUGHT IT: CI job "Advisories (production dependencies)" (`npm audit --omit=dev --audit-level=high`), added in 483e9e34 and moved into its own NON-required job in 5fe7e6e4 after review; it fails on the old lock (critical next) and passes on the new.
- REVIEW: Agent 6 (reviews/a3-batch1-by-a6.md): APPROVED.
- NOTE: production changes Next minor (16.2.12→16.3.6) on the next deploy. Every local gate had already been running 16.3.6.

### DOC-P2-02, CI built a different next.config from production
- STATE: FIXED, AWAITING-REVIEW (+ FOUNDER for two repository variables)
- CHANGED: commit 483e9e34, apps/web/next.config.ts (a SET but unusable NEXT_PUBLIC_SUPABASE_URL, not a URL, or not https, now throws at config load; ABSENT still builds the seed catalogue); .github/workflows/ci.yml Build job env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SITE_URL from `vars.*` with the known public addresses as fallback, NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_MAPTILER_KEY from `vars.*` with a `::warning::` when missing; checks job gains `npm audit --omit=dev --audit-level=high`; header corrected (DOC-P2-01: lint AND build catch the "use server" re-export).
- EVIDENCE: production-shaped local build (URL + publishable key + site URL, inline env) exit 0 in 1m26s, 199 pages; `NEXT_PUBLIC_SUPABASE_URL=uccixoonmbhrnyczyigt.supabase.co next build` → "Build error occurred Error: NEXT_PUBLIC_SUPABASE_URL is set but is not a URL" exit 1. Production's value cannot be malformed today (the whole Supabase client would be dead and the site works), so the throw cannot break the live deploy.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/lib/images/next-config.test.ts (5 tests; loads the real config per env shape). Against the old next.config.ts: 2 failed ("fails the build on a value that is set but is not a URL", "…plain-http project URL"), 3 passed; against the new: 5/5.
- FOUNDER: GitHub → repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable: `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key from Supabase → Settings → API Keys (the `sb_publishable_…` one; public, not a secret), and `NEXT_PUBLIC_MAPTILER_KEY` = the same value as in Vercel Production.

- REVIEW (DOC-P2-02): Agent 6 CHANGES REQUIRED, move npm audit out of the required job. DONE in 5fe7e6e4 (own `audit` job, not required); orchestrator: no re-review needed.

### DOC-P2-01, ci.yml header gives a false reason (A10 LOW)
- STATE: FIXED in 483e9e34 (header now names lint `nf/server-actions-export-only-actions` and next build). No test (comment only).

#### BATCH 2

### DOC-03 (absorbs DOC-04), no automated test reaches the database
- STATE: FIXED (harness + CI job + 5 probes), AWAITING-REVIEW; FOUNDER (the secret)
- RE-VERIFIED: `ls supabase/tests` → no such directory at 77cf90a; nothing invoked scripts/probes/policy_callers_hold_execute.sql.
- CHANGED:
  - `scripts/db-probes/run.mjs`: runner. Each probe goes to `psql` as `\set ON_ERROR_STOP 1; begin; set local statement_timeout='60s'; set local lock_timeout='5s'; <probe>; rollback;` on its own connection. PASS only when the output carries `PROBE_OK <file id>`; a PROBE_FAIL, any other error, a timeout, a probe that finished WITHOUT raising (rolled back by the explicit rollback), or a PROBE_OK naming another probe is FAIL. `--check` (shape only, no DB), `--list`, `--only a,b`, `--json out`, `--dir`. Exit 0/1/2. No new dependency (psql; the CI job installs postgresql-client if missing).
  - `scripts/db-probes/contract.mjs`: the file contract + the judge (pure functions).
  - `supabase/tests/README.md`: contract, shell/CI/MCP ways to run, founder step.
  - `.github/workflows/ci.yml`: `checks` job gains "Database probe files keep the contract" (`run.mjs --check`); new `db-probes` job: runs when the `PROBES_DATABASE_URL` secret is present, otherwise a `::warning::` + step summary "Database probes did NOT run"; concurrency group `db-probes`, never cancelled mid-run; verdict JSON uploaded as an artifact.
  - Retired `scripts/probes/policy_callers_hold_execute.sql` (git rm; its .log kept as history), replaced by `supabase/tests/probes/db-20.sql`; `docs/security/GRANT_STATE.md` §4.2/§8 and the listing_access row updated.
- PROBES written (all run live through `apply_migration`; nothing recorded in schema_migrations, last 3 rows unchanged: 20260923180000, 20260923175739, 20260923175705):
  - `db-20.sql`: policy → function EXECUTE for every role the policy applies to (pg_depend + polroles + table/column reachability; controls: pairs>0, some hold, the outage pair (anon, private.owns_listing, listings) is examined). LIVE TODAY: **PROBE_FAIL** "3 of 791 pairs": anon × private.inspection_photo_path_access on storage.objects inspection_photos_objects_party_insert/_read; anon × private.can_see_listing_access on listing_access_select. Proven GREEN in a rolled-back txn with the DB-04/DB-20 fix (`alter policy … to authenticated` ×3) → "PROBE_OK db-20: 788 pairs". Mutation: revoking EXECUTE on private.owns_listing from anon → PROBE_FAIL "17 of 788" (reproduces the 11-hour outage, 17 policies).
  - `db-04-anon-storage-read.sql`: behavioural: authenticated control reads storage.objects; anon list-shaped reads must not raise 42501. LIVE: **PROBE_FAIL** "permission denied for function inspection_photo_path_access". With the DB-04 fix in a rolled-back txn: PROBE_OK.
  - `mon-10-money-grants.sql`: anon/authenticated hold no INSERT/UPDATE/DELETE/TRUNCATE (table or column) on ledger_entries, wallet_entries, wallets, transactions, rent_payments, escrows, platform_revenue, fee_rates, audit_log, booking_refunds; anon no write on wallet_pots; CONTROL authenticated keeps wallet_pots INSERT/UPDATE and a member reads own wallets; behavioural `delete/update … where false` must be 42501. LIVE: **PROBE_FAIL** (6 tables fully writable by both roles + anon on wallet_pots). With MON-10's revoke in a rolled-back txn: PROBE_OK.
  - `mon-07.sql`: see MON-07 below.
  - `info-schema-guards.sql`: see blind lights below.
- EXPECTED STATE: db-20, db-04-anon-storage-read, mon-10-money-grants and mon-07 are RED on live today; they turn green when the owners of DB-04/DB-20, MON-10 and MON-07 apply their fixes. The CI job will therefore be red once the secret is added until those land, that is the truth, not a harness fault.
- PEERS' PROBES: a1 (db-01, db-02, db-03, sup-p2-01, ux-24), a2 (esc-02, v-33), a5 (sec-05, sec-06) all pass `checkProbeSource` today, so the runner and the vitest contract test accept them when merged.
- RUNNER PROVEN end to end against a local Postgres 16 (initdb in /var/tmp, roles anon/authenticated): good → PASS; PROBE_FAIL → FAIL with its message; no raise → FAIL "finished without raising" and its INSERT was rolled back (table count 0 after); syntax error → FAIL; pg_sleep(70) → FAIL "canceling statement due to statement timeout" at 60 s; PROBE_OK of another id → FAIL. `--check` refused files without PROBE_OK/PROBE_FAIL before contacting the DB.
- TEST THAT WOULD HAVE CAUGHT IT: `apps/web/src/lib/db-probes/contract.test.ts` (the judge, the contract, every file in the folder; runs in the no-DB suite) + the `db-probes` CI job.
- FOUNDER (one step): Supabase dashboard → project uccixoonmbhrnyczyigt → Connect → Session pooler → copy the URI with the DB password filled in → GitHub → repo → Settings → Secrets and variables → Actions → New repository secret `PROBES_DATABASE_URL`. (It is a production DB credential; workflows on same-repo branches and PRs can read it, acceptable only while every writer already has repo write access.) Then add "Database probes" to the required checks once the four RED probes above are green.
- SECURITY NOTE: psql is given the URL as an argument (visible in the runner's process list only).

### DB-20, the policy-caller probe is manual, text-matching, role-blind
- STATE: FIXED (the probe half), AWAITING-REVIEW. The `listing_access_select … to authenticated` DB change is NOT made by me (DB owner); the probe is red until it is.
- CHANGED/EVIDENCE: as db-20.sql above.

### DB-04, anon storage.objects reads die with 42501
- STATE: PROBE ONLY (the three `alter policy … to authenticated` are the DB owner's; proven in a rolled-back txn to turn db-04-anon-storage-read and db-20 green). If nobody owns it, it is a 3-line migration I can apply after review.

### MON-07, the "spendable in one place" guard is decoration
- STATE: GUARD FIXED as a probe, AWAITING-REVIEW; the `move_into_pot` rewrite belongs to the money owner.
- CHANGED: `supabase/tests/probes/mon-07.sql`: functions in public/private whose body has `(\w+.)?status = 'PENDING'` AND `(\w+.)?direction = 'debit'` (any order, any alias) AND `sum(`; must be exactly wallet_spendable_locked (control: that function must be found, so a blind pattern is red).
- EVIDENCE: LIVE **PROBE_FAIL** "spendable is still computed outside private.wallet_spendable_locked in: move_into_pot(uuid,uuid,bigint,text)". Mutation (rolled back): a scratch SQL function with `x.direction = 'debit' and x.status = 'PENDING'` (alias + reversed order) is found.
- The migration guard in 20260922221800 cannot be edited (applied); this probe supersedes it.

### Blind light 1, "no horizontal scroll" cannot fail under root overflow-x: clip (UI-P2-02)
- STATE: FIXED (the check), AWAITING-REVIEW
- CHANGED: `apps/web/tests/_overflow.mjs` (`horizontalOverflow` runs in the page: visible elements crossing the viewport edge with no clipping/scrolling ancestor below the root; skips hidden, aria-hidden/inert, sr-only; outermost offender only); `apps/web/scripts/design/session-b-shots/sweep-orphans.mjs` now reports `ovf` from it.
- TEST: `apps/web/src/lib/ui/horizontal-overflow.test.ts` (real Chromium via playwright-core; skipped only if no Chromium binary): on a root-clipped page the OLD check `scrollWidth <= innerWidth+1` is TRUE with a 2411px element and with a 200-char name (proves blindness), the new check reports them; rail/clipped card/sr-only/closed drawer are not counted. 5/5.
- NOT DONE (deliberately, DOC-09 territory): the 37 `apps/web/tests/*.spec.mjs` sites that use the scrollWidth idiom; nothing runs those specs. They should import `overflowingElements` when DOC-09 gives them a runner.

### Blind light 2, money guard satisfied by a comment (DOC-07 `money-limits-call-sites`)
- STATE: FIXED, AWAITING-REVIEW
- CHANGED: `apps/web/src/lib/security/money-limits-call-sites.test.ts` reads call sites off the TypeScript AST: a real `guardMoney("<action>", …)` call, awaited, bound, IMMEDIATELY followed by `if (!<name>.allowed) return`, and no RPC/table write/Paystack money call earlier in the same function. Fixture tests prove comment/string don't count and unawaited/unchecked/late guards are flagged.
- EVIDENCE: mutation, replacing the real `guardMoney("transferToUser")` + check with a `// const limit = await guardMoney("transferToUser", …)` comment: OLD test 3/3 PASS (blind), NEW test FAILS "finds a real guardMoney call site for every action". All 21 live sites pass the stricter rules.

### Blind light 3, the terminology ban tests an empty list (DOC-08)
- STATE: FIXED, AWAITING-REVIEW
- CHANGED: `BANNED_SYNONYMS` now holds the six PRODUCT.md §7 synonyms that no product string uses today (karma, admin panel, backend, host dashboard, portal/portals, vendor/vendors), zero copy change needed; a new test asserts the list is non-empty and each pattern matches its own label. `docs/PRODUCT.md` Stay row no longer bans "Trip" (`/trips` is the Stays surface). The other synonyms (feed 178 hits, hub 66, gist 26, landlord 24, reputation 2, Host, user…) are live in copy and join the list with their copy fix.
- EVIDENCE: new test against the old (empty) list: FAIL "has synonyms to look for"; with the list: 32/32.

### Blind light 4, grant guards through information_schema
- STATE: FIXED, AWAITING-REVIEW
- FOUND: two APPLIED migrations assert "born locked" via information_schema.role_table_grants: 20260923092729 (push_tokens; later re-checked by 20260923093123) and 20260923093115 (known_devices; never re-checked). No other SQL/TS/MJS guard uses the grant views.
- CHANGED: `supabase/tests/probes/info-schema-guards.sql` re-makes both claims with has_table_privilege/has_any_column_privilege + behaviour (known_devices: nothing for anon/authenticated; push_tokens: authenticated SELECT only; control: member reads push_tokens). LIVE: PROBE_OK. Mutation (rolled back): `grant insert on known_devices to authenticated; grant delete on push_tokens to authenticated` → PROBE_FAIL naming both. `contract.test.ts` also fails on any SQL file (migrations, supabase/tests, scripts/probes) that reads grants through information_schema views outside the two applied files, with a control that the pattern still matches those two.

### Preview-deck guard (every preview directory with screens serves page.tsx)
- STATE: FIXED, AWAITING-REVIEW. The guard already existed (`lib/nav/route-files.test.ts`, "every preview deck serves its own index") but carried an exception for `session-b`, the one directory without an index.
- CHANGED: `apps/web/src/app/(dev)/preview/session-b/page.tsx` + `decks.ts` (index of the 17 decks); exception removed; new test: the index names exactly the deck directories on disk.
- EVIDENCE: with the exception removed and the page moved away: FAIL `expected [ '/preview/session-b' ] to deeply equal []`; with the page: 12/12.
- NOTE: Agent 6's comment sweep edited the old exception comment in the same test; expect a trivial merge conflict (take this version).

### Batch 2 commits and gates
- 9401fb60 DOC-03 runner + CI job (NOTE: this commit also carries the staged `git rm scripts/probes/policy_callers_hold_execute.sql`, and its contract.test.ts needs the probe folder added in the next commit, so 9401fb60 on its own is red in vitest; 830a729f is green)
- 830a729f probes db-20, db-04-anon-storage-read, mon-10-money-grants, mon-07, info-schema-guards + GRANT_STATE.md
- 10578594 blind lights (overflow, guardMoney AST, BANNED_SYNONYMS)
- 6adb440b preview session-b index + no exception
- Gates at 6adb440b (worktree, lockfile tree): typecheck 0; lint 0 errors / 333 warnings; vitest 245 files, 3893 passed, 1 skipped; build exit 0 ("▲ Next.js 16.3.6", `ƒ /preview/session-b` in the route list); tsconfig.json not rewritten.
- No migrations applied. No pending migrations of mine (the DB fixes the red probes need belong to DB-04/DB-20, MON-10 and MON-07's owners).

### DB-04 + DB-20 (DB half), scope the four PUBLIC policies to authenticated (assigned to a3 by the orchestrator)
- STATE: AWAITING-REVIEW, PENDING MIGRATION (not applied)
- MIGRATION (pending): scratchpad/work/fix-a3/db04_db20_migration.sql. It runs `alter policy … to authenticated` on inspection_photos_objects_party_read, _party_insert and _admin_read (storage.objects) and on listing_access_select (public.listing_access), then asserts that all 4 now have polroles = {authenticated}.
- RE-VERIFIED LIVE: all four have polroles {-} (PUBLIC). db-20 FAIL 3/791; db-04-anon-storage-read FAIL 42501.
- COMPATIBILITY (origin/main e1395cfb): every caller is signed in or uses the service role. InspectionSheet.tsx:249 is a client storage call made signed in. lib/inspections/actions.ts:452 is a server action with a session. lib/listings/access-queries.ts:34 uses session.supabase after `signed-in`. lib/bookings/arrival.ts:69 and lib/agent/listings-actions.ts:940 use the admin/service client. No anon path used these policies; anon got 42501 before and gets an empty set after.
- PROOF (rolled back, apply_migration "proof_db04_db20"): "PROOF OK db04/db20: 0 policy gaps; admin reads inspection-photos objects=0; member and anon read without 42501 (anon listing_access rows=0)". The admin's own authenticated client and a member both read storage.objects and listing_access, and anon reads without error. Earlier probe proofs: db-20 → PROBE_OK 788 pairs; db-04-anon-storage-read → PROBE_OK.
- AFTER APPLY: read schema_migrations for the version, then commit supabase/migrations/<version>_db04_db20_scope_policies_to_authenticated.sql; db-20 and db-04-anon-storage-read should then be PROBE_OK live.
- MON-10 and MON-07 DB fixes → Agent 2 (orchestrator). My probes mon-10-money-grants.sql and mon-07.sql are their tests.

### Batch 2 review (Agent 6, reviews/a3-batch2-by-a6.md) and amendments, commit f1ccdc3e
- REVIEW: APPROVED db-20, the blind lights, the preview index and the DB-04/DB-20 migration. CHANGES REQUIRED on the runner: a NOTICE PROBE_OK with exit 0 passed. Note on CI: the job without the secret was green with a warning.
- DONE:
  - judgeRun now requires a non-zero exit AND `PROBE_OK <id>` on an `ERROR:` line (the psql `psql:<stdin>:N:` prefix and the MCP "Failed to apply database migration:" prefix are allowed; a NOTICE that spells an ERROR line is not). contract.test.ts adds: notice-only exit 0 → FAIL; notice-spelled-ERROR then another error → FAIL; psql ERROR line exit 3 → PASS; same line exit 0 → FAIL. The reviewer's fake-01 now gives "FAIL fake-01 … finished without raising" against local PG.
  - The contract refuses `dblink…(` and `net.http_…(`.
  - CI: the no-secret step now `exit 1`s.
  - horizontal-overflow fails under CI when no Chromium is present.
  - The dedicated `probe_runner` role was NOT adopted. Peer probes (a2 esc-01/esc-02, a1 ux-24/new-a1-01) build fixtures as the owner after `reset role`, which a role that can only become anon/authenticated cannot do. README explains why the postgres URL is used and what mitigates it (rollback, no dblink/pg_net, the secret's exposure, a GitHub environment if writers change).
- DB-04/DB-20 MIGRATION APPLIED: server version **20260923234749** `db04_db20_scope_policies_to_authenticated`, committed as supabase/migrations/20260923234749_db04_db20_scope_policies_to_authenticated.sql (same SQL). The in-migration assertion (4 policies = {authenticated}) passed.
- LIVE AFTER APPLY: db-20 → "PROBE_OK db-20: 796 policy/function/role pairs, all hold EXECUTE"; db-04-anon-storage-read → PROBE_OK. Over the wire with the publishable key: `POST /storage/v1/object/list/avatars` → `[]` (before: "permission denied for function inspection_photo_path_access"); `GET /rest/v1/listing_access` → `[]` (before: 42501).
- db-20 control changed. At apply time the probe went red on its harness control "outage pair (anon, private.owns_listing, listings) not examined", because a1's DB-03 migration (20260923234031) moved the listings policies to private.listing_agent_is_me / firm_member_is_me. The control now requires any (anon, helper, public.listings) pair. Re-proved with a rolled-back revoke of private.listing_agent_is_me from anon → 4 listings policies flagged.
- STATE: DB-04 FIXED; DB-20 FIXED (probe + DB). REVIEW: approved by Agent 6; the runner amendment is done per its exact instruction.

#### BATCH 3

### OPS-04, catalogue reads turn DB errors into "0 properties" silently
- STATE: FIXED, AWAITING-REVIEW (commit c72dc92c)
- RE-VERIFIED: supabase-repository.ts had `if (error || !data) return []` / `catch { return [] }` in search, byId, byReference, loadListingsByIds and the amenity join.
- CHANGED: `lib/listings/read-failure.ts` `catalogueReadFailed(surface, error)` logs `[catalogue] read failed surface=… code=…` and calls recordAlert critical `catalogue.read_failed` {surface, code}, subjectId = surface, so there is one open row per surface per 10 minutes. It is called on every error or throw in those 5 reads. `!data` with no error (a real empty result or a real not-found) returns as before with no alert. The UI is unchanged; the pages keep rendering.
- TEST: `lib/listings/read-failure.test.ts` (5). Against the old repository: 4 failed, 1 passed.

### OPS-03, nothing pages a human
- STATE: FIXED in the app (8adba9e5, 83fd4ec4). DB-side pager migration PENDING REVIEW (see below). FOUNDER steps below.
- APP: `lib/ops/page.ts` `pageHuman` → OPS_ALERT_WEBHOOK_URL (https JSON POST {text,title}; ntfy works) and/or OPS_ALERT_EMAIL (Resend directly, not the outbox). With neither set it returns not_configured and logs one warning line. `recordAlert` → `escalate()` for severity critical: reportError to Sentry (level fatal, context kind `alert.<kind>`), plus pageHuman unless a same-title high row exists from the last hour. It still pages when the row insert failed.
- TESTS: `lib/ops/page.test.ts` (5), `lib/alerts/escalate.test.ts` (4: pages with scrubbed text, no second page within the hour, pages when the insert fails, warning/info never page).
- DB-SIDE PAGER (PENDING, not applied): scratchpad/work/fix-a3/ops03_db_pager_migration.sql. It adds `private.page_on_high_alert()` (SECURITY DEFINER, search_path '', EXECUTE revoked from public/anon/authenticated; no policy calls it) and trigger `risk_alerts_page_on_high` AFTER INSERT WHEN severity='high'. It posts through pg_net to the Vault secret `vallo_ops_alert_webhook_url`, skips rows written by the app's service_role (the app pages those itself), pages once an hour per title, and swallows every error so the alert row always stands. Why: 11 DB functions write risk_alerts directly (escrow_invariants_check, request_money_reconciliation, request_push_drain, notify_report, scan_*…), and none of them paged anyone.
  - PROOF (rolled back): no_secret=0, db_writer=1, repeat_within_hour=0, medium=0, service_role=0 new pg_net requests (expected 0,1,0,0,0). The migration plus the full `ops-03.sql` probe in one rolled-back txn → PROBE_OK. Live today: `ops-03.sql` → PROBE_FAIL "no paging trigger". Afterwards there is no vault secret, no trigger and no Proof rows (checked).
  - COMPATIBILITY: only admins can INSERT into risk_alerts directly (policy risk_alerts_admin_all). DB functions insert as definer. The trigger never raises. Deployed main's recordAlert uses the service role, so the trigger skips it.
- FOUNDER (DEPLOY.md §8.1): (1) install ntfy, pick a long random topic, set Vercel Production `OPS_ALERT_WEBHOOK_URL=https://ntfy.sh/<topic>` (and/or `OPS_ALERT_EMAIL`), and run once in the Supabase SQL editor `select vault.create_secret('https://ntfy.sh/<topic>', 'vallo_ops_alert_webhook_url');` (2) UptimeRobot/Better Stack HTTP monitor on **https://www.vallospaces.com/api/health/catalogue**, every 5 min, alert on non-200, plus one on https://www.vallospaces.com/. (3) Sentry, below.

### SENTRY_DSN, wire error reporting properly
- STATE: ALREADY WIRED (verified) + TEST ADDED + FOUNDER. `lib/observability/report.ts` (direct envelope POST, no SDK) reads SENTRY_DSN. Server errors come through `instrumentation.ts` onRequestError, browser errors through the error boundaries and `/api/client-error`, and now critical alerts through recordAlert. Unset, it is a silent no-op.
- TEST: `lib/observability/report.test.ts` (5): no DSN → not_configured, no fetch, nothing printed; DSN set → one POST to `https://<host>/api/<project>/envelope/?sentry_key=…&sentry_version=7` with the environment and route tags; throttle; transport failure never throws and never prints the key; malformed DSN → unparseable.
- FOUNDER: sentry.io → create a project (platform "Next.js", or "JavaScript"; the app needs no SDK) → Settings → Client Keys (DSN) → copy the DSN → Vercel → Project → Settings → Environment Variables → `SENTRY_DSN` = that DSN, for **Production** and **Preview** (server variable; do NOT add NEXT_PUBLIC_SENTRY_DSN) → redeploy → in Sentry, Alerts → create an alert rule "A new issue is created" → email me.

### V-01, the catalogue canary
- STATE: FIXED, AWAITING-REVIEW (83fd4ec4)
- CHANGED: `lib/ops/catalogue-canary.ts` (`probeCatalogue`: service-role published count as the control, then the publishable-key count and one row of `LISTING_SELECTS.card` with no session; fails on refused/errored reads, visible < control, or 0 published). `/api/cron/canary` (runCronJob, `*/5 * * * *` in vercel.json) raises a critical `canary.catalogue` alert, which pages. `/api/health/catalogue` is public, 200/503 plus a reason token, s-maxage=30, for the external monitor. Also registered in VERCEL_JOBS, WATCHED_JOBS (2 h allowance; the test floor is 2), proxy PUBLIC_API_PATHS + proxy.test EXPECTED_PUBLIC, route-parents NON_NAVIGABLE, and the ADMIN_CONSOLE job table (9 Vercel jobs).
- TEST: `lib/ops/catalogue-canary.test.ts` (8): pass at 64/64; 42501 refusal; fewer visible; card select refused (a column without its grant); empty; unreachable; no-control mode; the cron verdict alert. LIVE: anon count via the publishable key is 64 of 64 and the card select returns rows (curl), so the canary is green on deploy.
- NOTE: every published listing is an example today; the canary checks readability, not realness.

### DOC-05, the Paystack signature check has no real test
- STATE: FIXED (24206969). `lib/payments/webhook-signature.test.ts` (8) runs the real Paystack HMAC-SHA512/hex and Yellow Card HMAC-SHA256/base64 checks. Mutation: with timingSafeEqual replaced by a length check, 2 of these fail while `app/api/paystack/webhook/route.test.ts` stays green. Not done: the Yellow Card webhook ROUTE test (401/503/500) the finding also suggests.

### DOC-P2-03, nothing watches for advisories
- STATE: FIXED (8f6ec798). `.github/dependabot.yml` covers npm at `/` weekly (groups framework/supabase/capacitor/dev-tooling; toolchain majors ignored) and github-actions monthly. The npm audit job is in 5fe7e6e4. FOUNDER: GitHub → Settings → Code security → enable "Dependabot alerts" and "Dependabot security updates".
- TEST: pipeline.test.ts "has a Dependabot config for the npm lockfile at the root".

### OPS-08, migration process check in CI
- STATE: FIXED, the CI-check half (8f6ec798). Staging and expand/contract remain a process decision (needs Supabase branching, a paid plan), DEFERRED to the founder.
- CHANGED: `scripts/check-migrations.mjs` enforces 3 rules: names, unique versions, and no applied migration modified/renamed/deleted since `--base` (pending/ excluded). A CI step in `checks` runs it with `--base ${{ github.event.pull_request.base.sha || github.event.before }}`, and checkout uses fetch-depth 0. Today: "304 files, names and versions clean, none changed since 77cf90a".
- TEST: `lib/ci/pipeline.test.ts` (7): the live folder passes; a bad name and a duplicate version fail; M/R/D fail, A passes, pending ignored; CI facts.

### Batch 3 gates at 8f6ec798 (worktree, lockfile tree)
- typecheck 0; lint 0 errors / 333 warnings; vitest 252 files, 3940 passed, 1 skipped; build 0 (`ƒ /api/cron/canary`, `ƒ /api/health/catalogue` in the route list).

### Batch 3 review (Agent 6, reviews/a3-batch3-by-a6.md) and amendments, commit 3d898f9c
- REVIEW: APPROVED the 5-minute cron (the plan is not Hobby), OPS-04, OPS-08, DOC-05 and the DB pager migration. CHANGES REQUIRED: (1) a paging storm when the DB is down; (2) canary `empty` paging hourly forever. RECOMMENDED: per-IP limit and no query-string cache busting on /api/health/catalogue.
- DONE: (1) `pageHuman` keeps a per-instance Map<title, lastPagedAt> that pages once per title per hour whatever the DB says. Test: 20 alerts with one title → 1 webhook + 1 email, the 20th returns "throttled", a different title still pages. (2) `canary.catalogue_empty` is critical only if no such alert exists in the last 7 days, otherwise warning (non-paging). Test: first → critical, later → warning. (3) The health route sends 308 for any query string to the bare path and allows 30/min per IP via `consume` (429 + retry-after). Test: 4 cases.
- OPS-03 DB PAGER APPLIED: server version **20260924001422** `ops03_high_alerts_written_by_the_database_page_a_person`, committed as supabase/migrations/20260924001422_….sql (same SQL). LIVE: ops-03 probe → "PROBE_OK ops-03: database high alerts page once an hour; medium and app-written rows do not". No vault secret exists yet (FOUNDER step), so it pages nobody until the founder runs `vault.create_secret`.
- STATE: OPS-03 FIXED (app + DB; FOUNDER config pending). V-01 FIXED.

### Small A10 items, commit f977a9b3
- DOC-23 FIXED: concurrency group per push SHA on main, `cancel-in-progress` only for pull_request.
- DOC-P2-04 FIXED: CI vitest writes a junit report (artifact `vitest-junit`); `retry: 0` explicit in vitest.config.ts; vitest-junit.xml gitignored.
- DOC-18 FIXED (step 1 of the amended fix): `eslint . --max-warnings=333` (today's count on the lockfile tree). Rule promotion (step 2/3) NOT done. NOTE FOR INTEGRATION: if a merged branch adds warnings, lint goes red; lower or raise the number deliberately.
- DOC-19 FIXED (the dead literals): 10 `.next-<worker>` literals removed from apps/web/tsconfig.json; the globs cover them.
- DOC-17 FIXED: the vitest.config.ts header now describes the real suite; the react-server aliasing reasons are kept.
- TEST: lib/ci/pipeline.test.ts "A10 gate details" (3) pins DOC-23, DOC-P2-04 and DOC-18.

### Not done (A10, left to owners or the founder)
- DOC-13: the deep-link gate stays red until the founder supplies the Play SHA-256 fingerprints; adding it to CI now would make CI permanently red. FOUNDER: supply the fingerprints, then add `npm run check:deep-links --workspace @vallo/web` to the checks job.
- DOC-09 (88 unrun browser specs, which includes moving their 37 scrollWidth checks onto tests/_overflow.mjs), DOC-06 (unit tests for rent/pot/bank-account actions), DOC-10/11/12/14/15/16 (docs; Agent 6's area), DOC-20/21/22 (a11y/i18n), DOC-24 (majors): not attempted.

### DOC-05 addendum, commit 6d42c105
- The Yellow Card webhook ROUTE test is now done: `app/api/yellowcard/webhook/route.test.ts` (8) uses the real signature check. A signed completed delivery → 200 and credited once. Forged or unsigned → 401, nothing credited. Unconfigured, missing service role (critical alert) and a ledger throw → 500. Pending and foreign references → 200, not credited. DOC-05 STATE: FIXED.

#### FINAL STATE (fix/a3 at 6d42c105)
- Gates in the worktree (lockfile tree via `npm ci`): typecheck 0; lint 0 errors / 333 warnings (under --max-warnings=333); vitest 254 files, 3957 passed, 1 skipped; build 0 (Next 16.3.6). `run.mjs --check`: 6 probe files keep the contract. `check-migrations.mjs --base 77cf90a`: 305 files clean, none changed.
- LIVE PROBES (apply_migration, rolled back, nothing recorded): db-20 PROBE_OK (796 pairs), db-04-anon-storage-read PROBE_OK, info-schema-guards PROBE_OK, ops-03 PROBE_OK, mon-07 PROBE_OK and mon-10-money-grants PROBE_OK (both green after Agent 2's fixes landed). All 6 of my probes are green on live.
- MIGRATIONS APPLIED BY a3: 20260923234749 db04_db20_scope_policies_to_authenticated; 20260924001422 ops03_high_alerts_written_by_the_database_page_a_person. Both are committed under their server versions.
- Commits: 74abba30, fc23bba1, 483e9e34, 5fe7e6e4, 9401fb60, 830a729f, 10578594, 6adb440b, f1ccdc3e, c72dc92c, 8adba9e5, 83fd4ec4, 24206969, 8f6ec798, f977a9b3, 3d898f9c, 6d42c105.
- Reviews I wrote: reviews/a6-batch1-by-a3.md, a6-batch2-by-a3.md, a6-batch3a-by-a3.md.

#### BATCH 4

### Merge and release-branch fix
- `git merge repo-clean-work` → 9d21f0e1. The merged tree failed one test: `example-notice.test.ts`'s regex rejected parenthesised JSX. Fixed in b04f55f1 (`/isDemo\s*&&\s*\(?\s*<ExampleNotice/`).

### DOC-06, behavioural tests for the money and booking actions, commit 84f9464a
- STATE: FIXED. `lib/testing/fake-supabase.ts` records every call and filter, so a test can assert which writes were and were not issued.
- TESTS (58):
  - bookings cancel and confirm (15);
  - wallet pots (10);
  - rent actions (14);
  - bank accounts (10);
  - verify-funding (9).
- MUTATIONS: each of these turns a test red:
  - removing the agent/admin check;
  - removing the paid-stay refusal;
  - removing the NGN check;
  - taking the pot owner from the form.

### DOC-20, DOC-21, accessibility defects axe found live, commits c90286c6, 511171a7 (plus the dl row in b95a4054)
- STATE: FIXED. Vitest now has two projects: `unit` and `dom` (`*.dom.test.tsx`, client React). `lib/a11y/axe.ts` runs axe-core in real Chromium; `strict` also counts axe's "incomplete" results.
- FIXED:
  - DocumentUploader: the input is named by its h2, which fixes `label` and `heading-order`.
  - Gallery track: focusable group named "Photographs of {title}".
  - Detail capsules: focusable.
  - Stay-card chips: wrap instead of scrolling inside a link.
  - Utilities `<dl>` rows: only dt and dd, with the icon floated inside a real dt, following Agent 6's LOW 1 on WebKit and display: contents.
  - AppBand phones: `inert`.
  - /wallet: sr-only h1.
  - AppRail: nav label "Main menu".
- TESTS: 6 dom files, 11 tests, each shown failing on the old code.
- REVIEW: Agent 6 (reviews/a3-batch4-by-a6.md) APPROVED with 3 LOWs; all three are taken:
  - dt float instead of display: contents;
  - group instead of a nested region;
  - no instructions in the accessible name.
- Agent 6 reverted its duplicate a774121d.

### DOC-22, i18n, commit b95a4054
- STATE: FIXED for plurals app-wide, and for hard-coded copy on checkout, the rent payment and the sign-up/confirmation surfaces.
- NOT DONE: hard-coded copy on the listing page and the rest of the app. It is not guarded yet and remains open.
- PLURALS:
  - 115 hand-inflected sites now use `countOf(n, unit, locale)`, backed by an en `units` table (95 nouns and phrases).
  - yo, ha and ig carry their own nights, guests, adults and children.
  - An untranslated unit uses English plural categories, so a Yoruba page reads "1 bed", not "1 beds".
  - Dictionary one/many pairs such as `copy.xOne` are left as they are. They are not English literals, but they still assume two forms. That is a follow-up.
- COPY: new `checkout` and `authFlow` namespaces. "Total to pay" and every sentence on those surfaces now comes from the dictionary.
- GUARDS: both read the TypeScript AST, so comments are not hits.
  - `lib/i18n/no-english-plurals.test.ts`: 115 hits on the old code, 0 now.
  - `lib/i18n/no-hardcoded-copy.test.ts`: covers checkout, rent/pay, (auth) and components/auth; 100 hits on the old code, 0 now.
- TEST: `lib/count-of.test.ts` covers every unit in every locale, English inflection, the yo/ha/ig forms and the English-grammar fallback.

### RED GATE (coordinator), flaky proxy-session and service-worker browser test, commits 0a6dddf4, 428db8be
- ROOT CAUSE 1 (proxy-session): a fixed port, 33492. Two suites on one machine collide, and the unhandled EADDRINUSE fails the whole file at collection. Reproduced by holding the port, and by 3 concurrent full runs, 2 of which went red. FIX: an OS-assigned port with the error wired to the rejection, and realistic hook and case budgets.
- ROOT CAUSE 2 (service worker): the test polled the notification list instead of waiting for the handler.
  - Under 5 concurrent suites, one push was not on the list 20 s after delivery (DIAG: [A booking, A listing] where "A follow" was due).
  - The fold case then pushed on top of it and ran past 60 s.
  - The case kept running after its timeout and pushed into the next case ("5 things" for 4).
  - FIX: the shipped sw.js is served unchanged behind a harness that reports each push handler's settled waitUntil. Every push waits for its own handler, and a timed-out case stops delivering. A mutation of sw.js still fails the fold cases.
- live-proof: given its own port and profile (same shape; it skips here).
- BUDGETS (428db8be): unit and dom projects allow 30 s per test and 60 s per hook. Under load, 5 s defaults turned tree scans and wallet dynamic-import tests red with nothing wrong. retry stays 0.
- PROOF, in a clean worktree at release head 089023f5 plus these changes:
  - 3 consecutive full runs green: 297 files, 4238 passed, 1 skipped each.
  - Before the budgets, under 5 to 10 concurrent suites, proxy-session and service-worker passed 15 of 15. Unrelated 5 s timeouts made up every red file.

### Reviews written this batch (Agent 6)
- a6-batch3b (export: CHANGES REQUIRED, then APPROVE on re-check).
- a6-batch3c (APPROVE 3; SEC-P2-02 proven live, rolled back).
- a6-batch3d (SEC-03: CHANGES REQUIRED 1).
- a6-batch3e (SEC-07: APPROVE; chunking driven through the real library).
- a6-batch3f (SEC-14):
  - first pass: CHANGES REQUIRED, for over-catch, proven live and rolled back;
  - RE-CHECK: PROBE_OK live, with one CHANGE for look-alike letters.
- a6-batch3g:
  - 47c0ec51, 0aa412bc, 749b08c3, 39860e40: APPROVE;
  - a774121d: CONFLICT with c90286c6, which the coordinator resolved in favour of c90286c6.

### NEW-A3-01, the 5 s default test budget was itself a flake source under load
- STATE: FIXED in 428db8be. It is recorded here because more whole-tree scans will be added.

### DOC-22 amendment (Agent 6's CHANGES REQUIRED), commit bb9972e9; OPS-18 test, commit e98f16a9; merged at 75549d46
- **Copy guard widened.** It now fails on:
  - visible JSX text;
  - any spoken prop, now including verdict, consequence and footnote;
  - any other literal of two or more words in the guarded files.
- **Guard counts:** 121 hits on b95a4054, 238 on c90286c6, 0 now. The 121 strings (result sheets, action labels, PaymentReturn, rent/pay states, sign-in notices, Apple and password messages, paid consequences) now live in `checkout` and `authFlow`.
- **Named allowances:**
  - the logo's "Vallo";
  - Apple's scope list;
  - directives;
  - console lines;
  - layout props;
  - `export const metadata` page titles.
- **CLAIM, exactly:** checkout, rent/pay, (auth) and components/auth hold no hard-coded English outside those allowances. Everything else is not guarded.
- **NEXT STEP:** the rest of the app (listing page first); generateMetadata for the tab titles; the server-error rewrite in payment-copy, which reads the English dictionary and has no locale.
- **Plural guard widened.** It now matches any comparison with 1 (`== 1`, `> 1`, `<= 1`, and so on) and ignores camelCase dictionary keys. The admin "Review all" button now uses a unit.
- **Slow-test report.** `slowTestThreshold` is set to 5 s, so the report names any test slower than that.
- **OPS-18 test is now deterministic.** requestSignal and roundWatchdog take an optional clock, which the test advances by hand:
  - the idle cut fires at exactly 15,000 ms and the total cut at 50,000 ms, both proved against a real HTTP read;
  - re-arming and done() are covered;
  - the visitor abort still works;
  - against the old module, 3 of the 4 timing tests fail.
- **Gates at 75549d46:**
  - typecheck 0;
  - lint 0 errors / 330 warnings;
  - vitest 370 files / 4766 passed / 1 skipped;
  - build 0.

#### FINAL SWEEP (A3)

### DB-21, misleading names, commit 1534f30e
- STATE: FIXED (docs and comments only; nothing live renamed).
- CHANGED: `docs/schema/NAMES.md` covers:
  - `conversations.agent_id` is an auth user id;
  - `agents` also holds owners, with `listings.listing_role` saying which on each listing;
  - `listing_status` is used by 5 tables;
  - `booking_status` also covers `reservations` and `booking_state_events`;
  - migration file names are sentences, not object names;
  - the six money tables and which is authoritative for what, checked against the live function bodies (`pay_booking_from_wallet` writes `transactions` and `ledger_entries`; `platform_revenue` is written only by the escrow settle and reverse functions).
- There is also a one-line pointer at the conversation insert.
- TEST: `lib/db/schema-names-doc.test.ts` (4) checks every claim against the migrations and `database.types.ts`. Mutation: removing a money table or a listing_status table from the page turns it red.

### UI-12, nonce-less framework chunk, commit dd85e9cd
- STATE: FIXED IN CODE via OPS-15 (3a66daac, Next 16.3 stamps the nonce). NOT YET LIVE.
- VERIFIED on 24 Sep: `scripts/check-script-nonces.mjs https://www.vallospaces.com` still reports 1 bare script on /, /about, /sign-in and /welcome (`11-v4cdswovuj.js`). The cause is that main's lockfile pins Next 16.2.12. It clears when the release branch deploys; rerun the script after that deploy.
- Build output: every app route is dynamic. The only prerendered HTML is `_global-error.html` (see NEW-A3-02).
- TEST: `next-script-nonce.test.ts` now also checks that the INSTALLED Next is at least 16.3 and matches the lockfile.

### UI-18, hand-rolled sheets, commit 3d342152
- STATE: DEFERRED with a plan:
  1. Fix `Sheet` first (the A05 note).
  2. Port one overlay per change, each with a focus-trap and scroll-lock test. Order: ReportSheet, ChoicePicker, StayFilterSheet, FilterDrawer, DeleteAccountPanel, AgentMobileNav, MobileMenu, AssistantChat.
  3. Move `.nf-spec-tile` onto `nf-panel nf-panel--card`.
- TEST: `components/ui/hand-rolled-sheets.test.ts` is a ratchet over the 8 files that draw the backdrop themselves. A new one fails, and a ported one must leave the list.

### OPS-P2-02, personal account names, commit c16ea777
- STATE: FOUNDER. DEPLOY.md section 0 gives the exact steps:
  1. Create an ops@ company mailbox with 2FA.
  2. Supabase: create the VALLO SPACES LTD organisation with two owners, on Pro, then Project Settings → General → Transfer project.
  3. Vercel: create the Vallo team with two owners, then Settings → General → Transfer Project, then check the domain, the GitHub app and cron.
  4. Fill in the ownership table.
- TEST: `lib/ci/account-ownership-doc.test.ts` pins the runbook, and fails once the table is filled so that it is revisited then.

### Agent 6's LOWs on DOC-22 final, commit 550c0d1d
- The sign-in notice lookup uses `Object.hasOwn`, so `?notice=constructor` no longer reaches the prototype. Test: `(auth)/sign-in/notice-lookup.test.ts`, all locales.
- requestSignal's budget timer is not cleared on an early finish. It is unref'd, so this is harmless. Left as is.

### NEW-A3-02, the prerendered `_global-error.html` carries no nonce (LOW, not fixed)
- It is the one static page in the build, so its three chunk scripts cannot carry a per-request nonce. If the proxy serves it under the nonce CSP, its "Try again" is inert.
- Owner: whoever takes the A05 error-boundary half of UX-27.

### Gates at 550c0d1d
- lint: 0 errors, 330 warnings.
- vitest: 374 files, 4775 passed, 1 skipped.
- typecheck: 0.

### Sweep amendments after Agent 6's review
- 0fb7aada and e1c7c5ec: DB-21's money section is rewritten from the live writers and triggers. The test checks that each named writer really writes its table.
- ecaef255: the UI-18 ratchet also counts class-based scrims.
- c75a695c: the OPS-P2-02 runbook preconditions are added.
- Agent 6's re-check: APPROVE.

### Reviews done in the sweep
- a2-sweep-by-a3.md: APPROVE, including the fa5e6e63 re-check. ESC-17 was applied by Agent 2 as 20260924071041.
- a4-sweep-by-a3.md (also saved as a4-sup-by-a3.md): APPROVE 8. SUP-04 is CHANGES REQUIRED, MEDIUM: signed-out action POSTs can render gated pages through a revalidating action.
- SUP-12 was APPLIED by A3 as **20260924073146**. PROBE_OK live, and committed 70303f18 on fix/a4.

## Agent 4: the store, code side

### Ledger, Agent 4 (store, code side), branch fix/a4

#### Pre-batch: iPhone home-screen push registration (push_tokens = 0 rows)
- Reproduced server half live (QA member, Chromium, iPhone UA): signed in, /settings/notifications, POST /api/push/register with a synthetic web subscription → `200 {"ok":true,"deviceRef":"10de827ed695"}`. The route, the proxy gate, the service-role upsert, the table constraints and grants all work. The probe row was then revoked through /api/push/revoke (`{"ok":true,"revoked":1}`); it remains in push_tokens as a REVOKED row for the QA member (token prefix `https://web.push.apple.com/QA-PROBE-a4-`) because execute_sql is read-only, orchestrator may delete it.
- Supabase edge logs 23 Sep: the settings page read push_tokens ~30 times between 16:32 and 20:57 UTC; no upsert (POST) ever reached PostgREST. So every real attempt failed in the CLIENT before the POST, or at the proxy with 401.
- /api/push/key live: 200 configured:true (public since the earlier fix).
- DIAGNOSIS: no iOS device or WebKit here, so the exact client step could not be observed. Hardened every client step that can die silently and made the next attempt name its own cause: failures now carry `step/errorName` shown to the person as "(Reference: subscribe/NotAllowedError.)"; `serviceWorker.register` and `serviceWorker.ready` bounded to 15 s (ready never rejects, so a worker that never activates left the button on "Just a moment" for ever); an already-granted permission is not re-requested; an existing subscription made against a different VAPID key is unsubscribed and replaced (it would register and then be refused on first send). The separate-cookie-store half: the PWA signs in separately (existing copy says so); Google sign-in could never complete in a standalone PWA (out-of-scope OAuth), which STORE-02's email-only change removes.

### PUSH-PWA, iPhone home-screen push registration never reached the server
- STATE: PARTIAL (server path proven live; client hardened + self-diagnosing; needs one tap on the founder's iPhone to confirm or to read the Reference)
- CHANGED: apps/web/src/components/app/push/{enrol.ts,PushSetting.tsx,PushPrompt.tsx,enrol.test.ts}; commit 309588f3
- EVIDENCE IT NOW WORKS: live register 200 (above); vitest enrol.test.ts 16/16; the 5 new tests fail on the old enrol.ts (swap run: 5 ×).
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/components/app/push/enrol.test.ts ("the browser half …": stale key replaced, granted not re-asked, ready timeout → ready/TimeoutError, subscribe refusal → subscribe/NotAllowedError, register 401 → register/401)
- FOUNDER: on the iPhone, open Vallo from the home screen, sign in with email + password INSIDE it, Settings → Notifications → Turn on. If it fails, send the "(Reference: …)" text.
- REVIEW:

### STORE-02, Google offered, Sign in with Apple not (4.8); decision is email-only
- STATE: FIXED (Google off + refused server-side) / FOUNDER (Apple credentials; Google off in the Supabase dashboard)
- RE-VERIFY: live /auth/v1/settings → google:true, apple:false; code DEFAULT_SOCIALS=["google"]; auth.identities: 8 email, 1 google (the founder's own account, which has a password).
- CHANGED: lib/auth/providers.ts (policy per surface; Apple on iff Supabase reports external.apple; Google only by `VALLO_SOCIAL_SIGN_IN=google` and web only; old NEXT_PUBLIC_AUTH_PROVIDERS ignored), lib/auth/surface.ts, lib/auth/actions.ts (startOAuth refuses per server policy + refuses any redirect provider in a shell; callback `refuseSwitchedOffProvider` signs out sessions made by a disallowed provider via amr + newest identity; new `signInWithAppleIdToken` for the iOS native sheet), components/auth/{AuthChoices,NativeAppleSignIn,EmailAuthForm,Verifying}.tsx, sign-in/sign-up/email pages, capacitor.config.ts (`appendUserAgent: "VALLO-NATIVE"`), ios App.entitlements (applesignin), en.ts accountUsesGoogleOff; commits f076a248, aa084b35 (string), 2c… (junction test)
- EVIDENCE: providers.test.ts 11/11; provider-refusal.test.ts 7/7 (4 fail on old code: Google start not refused, Apple-on not started, native not refused, Google session not ended); native-ua.test.ts 1/1.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/lib/auth/provider-refusal.test.ts, providers.test.ts
- FOUNDER: docs/store/FOUNDER_STEPS.md §1 (Apple: App ID capability, Services ID, key, Supabase Apple provider with Client IDs `<servicesId>,com.vallospaces.app`) and §2 (Supabase → Providers → Google → Disable).
- NOTE: native Apple needs `@capacitor-community/apple-sign-in` (7.1.0, peer core >=7) in the binary, added to package.json with the other plugins in BATCH 2 (single lockfile change). Until then the button is simply not drawn (`isPluginAvailable`).
- NOTE for Agent 6: PRODUCT.md §8 "NOT BUILT AS DESCRIBED" (Google/Apple) and §10 row N-4 are now built as described except Apple-behind-config.
- REVIEW:

### STORE-03, Google cannot complete in the native apps; AASA/assetlinks placeholders
- STATE: FIXED (Google refused in shells; callback comments/logic re-based) / FOUNDER (Team ID, two SHA-256)
- CHANGED: see STORE-02; AASA comment, AndroidManifest comment; check-deep-links wording.
- EVIDENCE: provider-refusal "refuses every redirect provider inside a native shell".
- TEST: provider-refusal.test.ts
- REVIEW:

### DOC-13, deep-link gate red and in no gate
- STATE: FIXED (gated) / FOUNDER (values)
- CHANGED: apps/web/package.json `cap:sync` = write-shell-config && check-deep-links (strict) && npx cap sync, `cap:sync:dev` (--warn); check emits `::error` annotations under GITHUB_ACTIONS; .github/workflows/ci.yml step "Deep links (founder values)" with continue-on-error (drop when values land); commit d9e6d935
- EVIDENCE: `node scripts/check-deep-links.mjs` → exit 1 with the three placeholders named; native-sync-gate.test.ts 2/2.
- TEST: apps/web/src/lib/native/native-sync-gate.test.ts
- FOUNDER: docs/store/FOUNDER_STEPS.md §3.
- REVIEW:

### STORE-01 (+ UX-17), developer offline card, retry reloads itself; "nothing was lost"
- STATE: FIXED (device test outstanding: airplane-mode cold start + warm toggle, needs a Mac/device)
- RE-VERIFY: native-shell/index.html still read window.Capacitor.getConfig (absent in @capacitor/core 8.5.2).
- CHANGED: native-shell/index.html (cards rewritten, script moved out), native-shell/shell.js (origin from build, probe then location.replace(origin+startPath), `online` auto-retry, "Still no connection" line), native-shell/shell-config.js (committed, production origin), native-shell/start-path.json, scripts/write-shell-config.mjs (fails if CAPACITOR_SERVER_URL unset/not https), package.json shell:config/cap:sync; app/error.tsx, (app)/error.tsx, global-error.tsx, offline/page.tsx (no "nothing was lost"; reference sentence only with a digest); UX-17 strings in en.ts and checkout/page.tsx; commit aa084b35
- EVIDENCE: offline-shell.test.ts 7/7 (runs shell.js in a vm: retry → replace(origin+path); unreachable → stays + "Still"; online → retries; no origin → needs-updating card; no window.Capacitor member outside definitions-internal.d.ts); honest-failure-copy.test.ts 8/8.
- TEST: apps/web/src/lib/native/offline-shell.test.ts, apps/web/src/app/honest-failure-copy.test.ts
- LEFT: UX-17 "Version 0.1.0" (needs the native build's version; batch 2 native work) ; UX-27 reset-only retry is not in my list.
- REVIEW:

### STORE-06 (+ UI-07, UX-26), store badges inside the app, linking to /start; unbackable claims
- STATE: FIXED
- DECISION (web landing): badges linking to /start are false → removed until real store URLs exist; each badge renders only for `https://apps.apple.com/...` / `https://play.google.com/store/apps/details?id=...`.
- CHANGED: components/site/landing/{AppBand.tsx,store-badges.ts,LandingBody.tsx}, app/page.tsx (surface → AppBand omitted in shells), four locales (points.all/fast removed); commit b36e00e2
- EVIDENCE: store-badges.test.ts 3/3.
- TEST: apps/web/src/components/site/landing/store-badges.test.ts
- REVIEW:

### STORE-P2-03, Take Video with no microphone string; camera string says never records video
- STATE: FIXED (device check outstanding)
- CHANGED: ios/App/App/Info.plist (NSMicrophoneUsageDescription added; camera string rewritten; stale "no crash reporting" comment corrected); commit d9e6d935
- TEST: apps/web/src/lib/native/ios-project.test.ts
- REVIEW:

### STORE-13, universal app (iPhone + iPad)
- STATE: FIXED
- CHANGED: project.pbxproj TARGETED_DEVICE_FAMILY = 1 (both configs); Info.plist UISupportedInterfaceOrientations~ipad removed; commit d9e6d935
- TEST: apps/web/src/lib/native/ios-project.test.ts
- REVIEW:

#### Batch 1 review (Agent 5) amendments, 829025a6
- detectSessionInUrl:false on the browser client (lib/supabase/client.test.ts); 3 s timeout on /auth/v1/settings (fail closed); offline card claim "Your account is safe." → fact; CI comment precision. `/` already ƒ dynamic, live `cache-control: private, no-store`, `x-vercel-cache: MISS`.
- REVIEW: batch 1 APPROVED after amendments (orchestrator "A4 BATCH 1 FINAL 829025a6"); integrated as 5f04075d.

#### BATCH 2

### STORE-04 (+ STORE-15 code half), thin native case, push not in native projects, app opens on marketing page
- STATE: FIXED (code) / FOUNDER (APNs key + Apple account; Firebase Android API key into google-services.json; device test)
- RE-VERIFY: Package.swift and capacitor.build.gradle listed 5 plugins, no push; start path `/`.
- CHANGED: merged release branch (repo-clean-work) first so the lockfile diff is only the new plugins; `npm install @capacitor/share@^8.0.2 @capacitor/haptics@^8.0.2 @capacitor/camera@^8.2.4`; `CAPACITOR_SERVER_URL=https://www.vallospaces.com npx cap sync` (Capacitor 8.5.2, ran on Linux: SPM Package.swift + gradle regenerated; 9 plugins incl. push-notifications). capacitor.config `server.appStartPath` from native-shell/start-path.json = `/open`; native-shell/open/index.html (iOS `appStartFileURL` must exist or `fatalLoadError`); app/open/route.ts (session → /home, else /search if VALLO_PUBLIC_CATALOGUE on, else /welcome; 307 no-store; public segment). lib/native/device.ts (Share/Haptics/Camera by name via the bridge; website loads nothing); ListingActions share → native sheet; Button pulse → native haptic in the shell; save → success haptic; ListingWizard "Take a photo" (native only) → same upload path; ThreadView mounts PushPrompt("conversation_active") once a thread has the other side's message and this person sent one. Commits 4887d059, 5f68babd.
- DROPPED: @capacitor-community/apple-sign-in 7.1.0, its Package.swift requires capacitor-swift-pm `from: 7.0.0` (<8.0.0), which cannot resolve with Capacitor 8.5's exact 8.5.0 → iOS build would fail. Native Apple button stays hidden (isPluginAvailable) until a Capacitor-8 plugin exists; compliant because only email is offered (4.8 not triggered).
- EVIDENCE: device.test.ts 8/8 (web: nothing handled/loaded; shell: share sheet, cancel, missing plugin fallback, haptics, camera → image File); native-start.test.ts 5/5 (start path /open, capacitor.config hands it over, file exists in webDir, offline retry uses it, signed-out destination per switch); local prod build: /open → /search (switch on).
- TEST: apps/web/src/lib/native/device.test.ts, native-start.test.ts
- FOUNDER / MAC STEP: on the Mac, `npm ci && CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web` (refuses until deep-link values exist; use `cap:sync:dev` for a test build), open ios/App/App.xcworkspace, add capabilities Push Notifications (+ Associated Domains, Sign in with Apple when ready); APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY in Vercel; paste the Firebase Android API key into android/app/google-services.json. Record the 30-second review video: push arriving, share sheet, camera capture.
- NOT DONE: biometric wallet lock (no plugin chosen; STORE-04 item 4), offline caching (item 7), native hide of the site header on `/` (not reached: the app starts on /open).
- REVIEW:

### STORE-P2-04 (THE SIGN-IN WALL), one switch
- STATE: FIXED (switch built, default OFF = current behaviour) / FOUNDER (the decision: set `VALLO_PUBLIC_CATALOGUE=on` in Vercel to open)
- CHANGED: lib/catalogue/public-access.ts, proxy.ts (`isPublicPath(path, {publicCatalogue})` can only add the six segments + /api/map/listings; anon catalogue page reads rate-limited per IP `anon_catalogue` 120/300 s → 429 + Retry-After), docs/PRODUCT.md §4 (flag only). Commits 8260759e, 150b66cd.
- UX-24 coordination: /u and people search stay gated regardless; the switch opens no profile surface.
- EVIDENCE: proxy-public-catalogue.test.ts 25/25 (OFF: all 7 catalogue paths → sign-in, "yes please" is not on; ON: 7 answer, 8 account paths still bounce, map 200 only when on, 4 other APIs 401, rate limit → 429). Local production build with the switch on and no session (Chromium): /search "64 properties found", /stays/search "69 stays", /restaurants, a rental listing, a stay, a restaurant, all 200, no 4xx responses, no error copy; /u/test, /messages, /wallet → sign-in. anon has no SELECT on listings/businesses/accommodations `address` (has_column_privilege).
- TEST: apps/web/src/proxy-public-catalogue.test.ts
- REVIEW:

### NEW-A4-01, anon can read exact latitude/longitude on listings, accommodations, businesses (MEDIUM, latent)
- has_column_privilege('anon', …, 'latitude'|'longitude'|'location') = true on all three. Today every row with coordinates is an example (5 + 64 + 7, is_demo), so nothing real is exposed; the first real shortlet host who drops a pin publishes their home's exact point to anyone with the publishable key, switch or no switch. Belongs with SUP-06's "coarsen the public point" amendment. Not fixed here (not live-exposed; different owner).

### Gates (batch 2, after merging release)
- tsc 0 errors; lint 0 errors / 333 warnings; vitest 256 files, 3955 passed / 1 skipped; build exit 0 (tsconfig unchanged).

#### Batch 2 review amendment, 58d42fbf (A4 BATCH 2 FINAL): only document loads count against the anon allowance; over the limit → 307 to sign-in with notice=catalogue-paced; cost noted in PRODUCT.md §4.

#### BATCH 3

### STORE-07, Anthropic processing without disclosure or consent
- STATE: FIXED (commit e6bf23b9)
- RE-VERIFY: api/assistant, api/support and lib/social/bot-actions call api.anthropic.com with no consent check; privacy.tsx had 0 mentions.
- CHANGED: lib/ai/consent.ts (AI_CONSENT_VERSION, disclosure words, cookie format, 403 refusal), lib/ai/consent-server.ts (hasAiConsent: device cookie or profiles.settings.aiConsent; fail closed), lib/ai/consent-actions.ts (recordAiConsent / withdrawAiConsent), lib/profile/schema.ts (aiConsent in settings, survives every other save), components/app/ai/AiConsentSheet.tsx (disclosure + "Prefer a person? … no AI" → /contact), AssistantChat + SupportChat (ask before sending, handle 403, decline → support chat answers from help pages + a person), /api/assistant and /api/support refuse 403 ai-consent-required BEFORE any Anthropic call, @vallo summon refuses privately; help, settings/help and assistant pages pass the server's answer. Privacy §12 names Anthropic (anchor #ai).
- EVIDENCE: lib/ai/consent-routes.test.ts 8/8 (both real route handlers: 403 and no fetch to anthropic without consent; refused for an old wording version; proceeds on account record or device cookie); lib/ai/consent.test.ts 4/4.
- TEST: apps/web/src/lib/ai/consent-routes.test.ts
- REVIEW:

### STORE-08 + SEC-13 (policy half), privacy policy vs code
- STATE: FIXED (commits 105e17dc, 55e3e18f, 14b3bcdf)
- CHANGED: lib/legal/privacy.tsx §2–7, 9, new §12 AI; PRIVACY_VERSION 2026-09-24 and page dates from PRIVACY_UPDATED; processors named with country (Supabase eu-west-1 Ireland from get_project; Vercel; Paystack; Resend; Anthropic; MapTiler; CARTO; FCM; APNs; Sentry when on; Unsplash for example photos). Termii, Google Places, LiteAPI: 0 references in src → not named. Analytics claim removed; the price-check step record (price_check_events) disclosed as the one usage record. §7 describes the FIXED purge (pending migration below).
- docs/store/PRIVACY_LABELS.md: every Apple data type and every Play data type, question by question, with the table it comes from.
- EVIDENCE: lib/legal/privacy-truth.test.ts 15/15 (every processor host found in src is named in the notice; unused ones are not; no analytics claim; location/push/new-device/AI/crash described; #ai anchor exists and the sheet links to it).
- TEST: apps/web/src/lib/legal/privacy-truth.test.ts
- REVIEW:

### SEC-13 purge half + STORE-P2-02 + ESC-06 + MON-09 + STORE-12 + SEC-10 amendment (assigned by the orchestrator)
- STATE: AWAITING-REVIEW, migration PENDING: scratchpad/work/fix-a4/purge.sql (to be committed as supabase/migrations/<version>_the_purge_erases_what_it_promises_and_never_money.sql after apply; plan.ts DESTROYED_TABLES + plan.test.ts MIGRATION path updated in the same commit).
- RE-VERIFY (live, rolled back, `probe_sec_13_old_db`): an account with ₦2,500 in a savings pot: account_deletion_blockers.blocked = false, purge_account_rows → purged = true (money purged over); a clean account after purge still had push_tokens 1, known_devices 1, email_outbox 2, price_check_events 1; account_identities.email_canonical became the fake deleted address (the mailbox link was lost, not kept as plaintext as the audit thought, because the auth trigger rewrites it).
- CHANGE (migration): account_identities_canonical_rule_check allows 'erased'; vault secret `account_identity_pepper` (created if missing); private.erased_identity_hash (HMAC-SHA256, 'erased:' prefix; EXECUTE revoked from public/anon/authenticated); private.deletion_money_blockers (wallet balance, held escrow, pots, pending payouts, rent refunds owed by them as lister and owed to them as guest via public.rent_refunds_owed, open bookings and reservations; revoked); public.account_deletion_blockers reads it (keeps its self-only guard, keys, grant; adds pot_balance_minor, rent_refunds_owed_minor, rent_refunds_due_minor); private.record_account_identity no longer overwrites an erased row; public.purge_account_rows re-checks money first and PARKS (stays SCHEDULED, purge_after +7 days, last_error, one deduped HIGH risk_alert, returns {purged:false, reason:'held_money'}), then deletes push_tokens, known_devices, email_outbox, price_check_events, price_check_watches, and replaces the mailbox with the keyed hash (row deleted if the hash cannot be made: never plaintext).
- COMPATIBILITY with deployed main: purgeOne treats {purged:false} as a recorded failure (fail_account_purge only writes last_error on SCHEDULED/PURGING) and due_account_purges skips it until purge_after, no loop; account_deletion_blockers only gains keys (main's readingFrom ignores them; schedule_account_deletion refuses a pot-holder, main shows its generic blocked state). Status values unchanged (no new enum/check value).
- PROOF (pre-apply, rolled back): `probe_sec_13_proof` = whole migration + supabase/tests/probes/sec-13.sql → `PROBE_OK sec-13`. No schema_migrations row; no vault secret left (checked).
- APP: preconditions.ts + DeleteAccountPanel + en.ts name the pot and both rent-refund directions (commit 377fd921; preconditions.test.ts 84/84 in the folder).
- TEST: supabase/tests/probes/sec-13.sql (fails on the old DB: pot purged, rows left).
- REVIEW:

### STORE-10, reviewer account
- STATE: FIXED (script) / FOUNDER (run it)
- CHANGED: scripts/seed/store-reviewer.mjs reads TERMS_VERSION/PRIVACY_VERSION from versions.ts (was a stale copy that would have mismatched today's bump), runs only as a script; docs/store/FOUNDER_STEPS.md §4 exact command. Commits 105e17dc, 0f277661, (types) last commit.
- TEST: privacy-truth.test.ts "the reviewer seed accepts the versions the app serves".

### NEW-A4-02, any signed-in member can read the exact address of every published listing, business and stay (MEDIUM)
- has_column_privilege('authenticated', listings|businesses|accommodations, 'address', 'SELECT') = true. anon cannot. The privacy notice now says exactly that. If the product rule is "address only after booking", this needs a column revoke + a definer read for booked guests (Agent 1's area). Not fixed.

### NEW-A4-03, purge handle collision (LOW)
- The purge rewrites the handle to 'd' + the first 19 hex chars of the uuid; two accounts sharing those 76 bits collide (unique violation, purge fails and retries). Negligible for random v4 uuids; seen only with hand-made probe ids.

### Gates (batch 3)
- tsc 0; lint 0 errors / 335 warnings; vitest 259 files, 3984 passed / 1 skipped; build exit 0; tsconfig unchanged.

#### Batch 3 amendments (Agent 5 review a4-batch3-by-a5.md), commit 022e538f; merged the release branch first (merge commit before it)

### (a) erased-identity hash had no reader
- STATE: AWAITING-REVIEW (code committed; SQL in pending purge.sql)
- FIX: `public.admin_erased_identity_matches()` (admin/super_admin only, 42501 otherwise; reads the vault key once and hashes every live canonical) returns (live user, erased user) pairs. `lib/admin/reads/mailbox.ts` `readErasedMatches()` reads it; 'erased' is a known CanonicalRule.
- TEST: `mailbox-erased.test.ts` (asks the RPC; refusal = unavailable, never "no matches"). Probe sec-13 step 4: new account on the erased mailbox is matched for the QA admin; the QA member is refused.

### (b) approved agents' KYC was destroyed at purge, contrary to RETENTION_SCHEDULE 3.1
- STATE: AWAITING-REVIEW / FOUNDER (confirm the AML retention period with counsel) / DEFERRED (the job that destroys retained records at kyc_retain_until: nothing expires before 2031; recorded in FOUNDER_STEPS §7)
- FIX: the purge detects an approved agent (an `agents` row, or an application APPROVED/SUSPENDED) and keeps: `agent_documents` rows and their `agent-documents` files (left off the storage delete list), `payout_accounts`, and on `agent_applications` full_name, residential_address, city, id_type, id_number, bank_*, business_rc, business_tax_id; redacts phone, email, business contact, principal_email, review_notes; stamps `kyc_retain_until = now() + 5 years` (new column). A rejected / never-approved applicant keeps nothing (as before). Access: staff only (the owner is banned; admin RLS policies).
- COPY: privacy §7 (the exception, stated), /delete-account, the scheduled and completed deletion emails, the settings `losesFiles` line, PRIVACY_LABELS.md deletion row.
- PROBE: sec-13 step 3 (approved agent: purged, documents and ID number kept, contacts redacted, stamp ~5y, no agent-documents path listed) and the rejected applicant's rows erased.
- NOTE to SEC-15 (A5): a purged approved agent's NIN is now retained; admin_open_email_recovery must refuse purged/scheduled/banned accounts (added to my review of A5 batch 3 as a required change).

### (c) "emails kept for a short time" with no prune
- STATE: FIXED (the notice was wrong about the mechanism's existence claim in the review, not the code): a prune exists and runs daily, `cron vallo_purge_email_outbox` 02:25 → `private.purge_email_outbox(90)` (migration 20260923100102): SENT/DROPPED after 90 days; FAILED kept until handled; PENDING/SENDING never. The notice now states exactly that.
- PROBE: sec-13 step 5 (91-day SENT pruned, 1-day SENT kept, 400-day FAILED kept), run live, PROBE_OK.

### (d) consent: the stored record decides for signed-in callers
- STATE: FIXED. `hasAiConsent`: signed in → `profiles.settings.aiConsent` only; signed out → cookie. `recordAiConsent` returns ok:false when the account write fails; the sheet says so and sends nothing.
- TEST: `consent-server.test.ts` (cookie ignored when signed in; stale version refused; failure = no); `consent-routes.test.ts` now asserts a signed-in cookie-only request is refused 403.
- Also removed two set-state-in-effect warnings my consent code added (the sheet sends the waiting question directly).

### Proof (rolled back, no migration row recorded)
- `probe_sec_13_proof_amended`: the full amended purge.sql + sec-13 probe ran through steps 1–4 in one transaction (it failed only at step 5's fixture insert, email_outbox.user_id NOT NULL, fixed in the probe file); step 5 then ran on its own: PROBE_OK sec-13. `kyc_retain_until` absent afterwards; schema_migrations unchanged.

#### Batch 4 (release branch merged first: 82beacfa), commits 53fee6f5..cb20ee14

### STORE-17, /preview answers 200 in production with the harness list in the payload
- STATE: FIXED (53fee6f5)
- RE-VERIFIED: the layout's notFound() runs after the root loading.tsx starts streaming (200, page streams alongside).
- FIX: proxy rewrites /preview and /gallery to `/_harness-closed` (no route) when previewHarnessIsOpen is false (always on Vercel) → Next's not-found with a 404, nothing of the harness rendered.
- TEST: proxy.test "STORE-17" (Vercel; Vercel + opt-in; dev; local proof server; RSC query; target matches no route). Fails on the old proxy (no rewrite header).

### STORE-19, Terms say 18+, sign-up never asked
- STATE: FIXED (code e59b77ca) / AWAITING-REVIEW (migration scratchpad/work/fix-a4/store19.sql: widen terms_acceptances_document_check with 'age_18_or_over')
- FIX: a separate "I am 18 or older." tick in AcceptTerms; the browser stops the submit; the SERVER refuses (`ageRefusal`, fieldErrors.ageConfirmed) before the provider is called; the statement is written to terms_acceptances (document age_18_or_over, version 18+, source signup_email) in its own write with its own alert.
- COMPAT: deployed main never writes that document; widening a CHECK is additive.
- TEST: terms-gate.test (5 refused answers never reach the provider; success records ageConfirmed:true); acceptance.test (own row; a failed age row never costs the terms rows; not written without the statement). Probe store-19.sql: old DB → 23514 check violation (shown); with the DDL in a rolled-back block → PROBE_OK store-19 (server writes; unknown document refused; member insert refused 42501).
- FOUNDER: Play target audience 18+; Apple age rating choose 18+ (LISTING_COPY.md).

### NEW-A4-04, an account created through a social provider records no terms agreement and no age statement (MEDIUM, latent)
- STATE: DEFERRED (not cheap: needs a gate that holds a new social account until it agrees, on both the OAuth callback and the native Apple action) / FOUNDER (do not enable Apple in Supabase until closed; written into FOUNDER_STEPS §1)
- EVIDENCE: `signInWithAppleIdToken` and `completeEmailVerification` (OAuth code path) call no `recordTermsAcceptance`; Apple switches on automatically when the Supabase provider is enabled. Google is refused server-side (decision: email only), Apple is off today, so nobody is affected yet.

### STORE-16, share sheet / tab title carry the lister's free-text title
- STATE: FIXED (ee3fe5e6)
- FIX: `lib/listings/public-title.ts` publicListingTitle (kind + bedrooms + area, city) used for the share sheet (ListingGallery shareTitle), tab title, OG/Twitter titles and descriptions, JSON-LD name. Draft schema + submitRequirements refuse a title with a house number + street word.
- TEST: public-title.test (structured title; 4 refused / 4 allowed titles incl. the live "…on Chevron Drive"); syndication.test (no free-text title in metadata or structured data).

### STORE-18, icon / splash / theme-color
- STATE: PARTIAL (9e8a1d83): FIXED the code halves (shell theme-color = CHROME_COLOUR #010118; Android adaptive background full bleed, both XMLs; generator note); FOUNDER (artwork: FOUNDER_STEPS §8 specifies the four master files, then regenerate and check on devices).
- TEST: lib/theme/native-chrome.test.ts.

### STORE-15, push cannot be demonstrated
- STATE: FIXED (checklist, 9e8a1d83) / FOUNDER (the four credentials + device proof)
- RE-VERIFIED: plugin IS synced (Package.swift, capacitor.settings.gradle, lockfile); google-services.json still the placeholder; aps-environment development in App.entitlements; server transports present. FOUNDER_STEPS §6 now lists every variable by its exact name (FCM_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON, APNS_KEY_ID/TEAM_ID/PRIVATE_KEY, APNS_PRODUCTION, optional APNS_BUNDLE_ID), the capabilities, and the device proof. Owed: a monochrome Android notification icon (§8).

### STORE-20, store listing copy
- STATE: FIXED (draft, cb20ee14) / FOUNDER (approve; screenshots and feature graphic from the shipped build; create support@vallospaces.com and set NEXT_PUBLIC_SUPPORT_EMAIL)
- docs/store/LISTING_COPY.md, each field within its limit; claims checked against code (move-in parts, price check, messaging, stays, tables, notification categories); wallet lines marked [IF]; "move money out" withheld until Paystack transfers are enabled (STORE-12).

### STORE-14, APK vs AAB
- STATE: FIXED (docs, cb20ee14: MOBILE_READINESS + FOUNDER_STEPS §6 step 8) / DEFERRED (native CI job: belongs with DOC-01, needs a macOS runner and signing secrets).

### STORE-09, regulated wallet
- STATE: FOUNDER (legal position and account type; Terms §15 alignment is a legal text decision, not made here). PRIVACY_LABELS and LISTING_COPY answer "from what ships".

### STORE-11, real supply
- STATE: FOUNDER (10–20 real listings before submission).

### STORE-21, "Invest" tile
- STATE: merged into STORE-05 (Agent 5's).

### Biometric lock, offline catalogue caching
- STATE: DEFERRED.
  - Biometric lock needs a native plugin and a device to prove the lock and the fallback; a lock that has never been seen working on a device is not honest to ship.
  - Offline caching of catalogue pages would serve stale prices and availability on a money path, and the service worker deliberately caches no authenticated page. Neither is cheap and honest.

### Purge × MON-08 (coordination)
- `private.deletion_money_blockers` now sums `private.pot_balance_minor(pot)` over the person's pots instead of reading `wallet_pots.balance_minor` (dropped by A2's m12b). purge.sql now REQUIRES m12a to be applied first. The sec-13 probe funds the pot through the ledger (deposit + pot_hold with metadata.pot_id) and asserts the derived balance (commit after cb20ee14). The full proof is re-run once m12a is live, before apply.

### Gates (batch 4, at cb20ee14, after merging the release at 82beacfa)
- tsc 0; vitest 298 files, 4275 passed, 1 skipped; build 0 (tsconfig unchanged); css-tokens 0; valuation-words 0.
- lint: 333 warnings (= the cap), 5 errors, all in three files from the release branch (DeviceList.tsx, action-bar-opaque.test.ts, scrub.test.ts) that the release has since fixed (repo-clean-work now differs in exactly those files); none in files this branch changed.

#### Amendments after Agent 5's re-check of batch 3 and review of batch 4 (b363c293, d3f0ba45, ce38a6fe)

### STORE-19: APPLIED
- Migration `20260924014449_store19_the_age_statement_is_recorded`, committed as `supabase/migrations/20260924014449_store19_the_age_statement_is_recorded.sql` (b363c293).
- Live probe store-19: PROBE_OK.
- REQUIRED-LOW done:
  - The precondition for enabling any provider is written in `lib/auth/providers.ts`.
  - FOUNDER_STEPS §1 states it too: record the terms and the 18-or-over statement for a new social account first.

### Purge (still AWAITING-REVIEW, not applied)
- **REQUIRED-MEDIUM done: the retained AML record is destroyed on time.**
  - New functions `public.due_kyc_destructions(limit)` and `public.destroy_expired_kyc(user)`, service role only.
  - `lib/account-deletion/kyc-retention.ts` runs them from the daily account-purge cron: files in agent-documents first, then rows deleted, the application redacted, and audit `account.kyc.destroyed`.
  - A failed file sweep leaves the rows for the next run and raises a warning.
  - Tests: kyc-retention.test and a probe step.
- **Found and fixed while doing it:**
  - The purge's TS storage sweep walks the person's folder in EVERY bucket, so it would have removed the retained agent-documents files even though SQL left them off the list.
  - `purgeStorage` now takes the buckets to sweep, and `purgeOne` skips agent-documents when `counts.kyc_retained` is true.
  - purge.test covers both sides.
- **REQUIRED-LOW done:**
  - Only APPROVED/SUSPENDED application rows are kept.
  - Every other application row of theirs is redacted in full.
  - Retention is keyed on having such an application, not on an `agents` row.
- **Advisories taken:**
  - `admin_erased_identity_matches` hashes each live mailbox once, in a materialised CTE.
  - Every call is audited as `account.erased_identity.matched` (actor, match count).
  - mailbox.ts now says no console screen draws it yet.
- **Proof** (m12a live; migration `probe_sec_13_proof_v3`; rolled back; no migration row recorded): PROBE_OK sec-13. It covers:
  - money parking with the ledger-derived pot;
  - device and behavioural rows erased;
  - the keyed hash;
  - the rejected applicant, and the earlier rejected application of an approved agent;
  - retention of the approved agent's record;
  - destruction on time, refused to a signed-in caller, and audited;
  - staff matching, audited, with the member refused;
  - the outbox prune.
- FOUNDER_STEPS §7 now describes the destruction job instead of "not built".

### STORE-16: CHANGES done
- A title that looks like a street address now gets a warning, shown as the wizard title's hint. It is never a refusal: the schema and the submit gate no longer refuse.
- The pattern is tightened:
  - the number must not be a count word;
  - the street name and the street word must be Capitalised;
  - estate, place and court are dropped.
- The 14 ordinary titles from the review pass, and 5 addresses warn.

### Gates at ce38a6fe
- tsc 0.
- vitest: 299 files, 4292 passed, 1 skipped.
- eslint on the changed areas: 0 errors, 2 warnings, both pre-existing in ListingWizard.tsx at lines 1101 and 1221, not in lines this branch changed.

### Purge re-check 2 (Agent 5, REQUIRED-HIGH): kyc_retain_until was member-writable
- RE-VERIFIED against live, rolled back: with the column added and the current guard in place, a member's own DRAFT insert set `kyc_retain_until` to yesterday ("OLD GUARD: member-set kyc_retain_until = 2026-09-23 …").
- FIX (in the pending purge.sql):
  - (a) `private.guard_application_write` is re-emitted unchanged except that `kyc_retain_until` is forced to null on insert and kept unchanged on update for non-staff callers. A column-level revoke is not possible under the table-level INSERT/UPDATE grant that the application form uses, so the guard is the control.
  - (b) `due_kyc_destructions` and `destroy_expired_kyc` require a PURGED `account_deletion_requests` row for the user, and consider only APPROVED or SUSPENDED rows.
  - (c) The probe covers: a member cannot set the column on insert or update; destruction is refused before PURGED; a live member's record is never destroyed.
- LOW (an agents row without an approved application): this was already handled in v3. Retention is keyed on an APPROVED or SUSPENDED application only, so such a person keeps nothing and their documents and payout accounts are deleted at purge.
- STORE-16 advisory taken: count words are removed case-insensitively before the address test.
- Proof `probe_sec_13_proof_v4`: PROBE_OK sec-13, rolled back.
- Commit 1a/next (see git log).

### SEC-13 purge: APPLIED
- Agent 5 approved it in RE-CHECK 3. It was applied live as `20260924020602_the_purge_erases_what_it_promises_and_never_money` and committed in 0fac8678, with the same SQL as the reviewed purge.sql.
- plan.ts: DESTROYED_TABLES gains push_tokens, known_devices, email_outbox, price_check_events and price_check_watches, and a note on the approved agent's five-year exception.
- plan.test: the destroy list and the keep list are now checked against the new migration's purge_account_rows.
- The live sec-13 probe after apply: PROBE_OK.
- LOW (an agents row with no approved application): re-verified.
  - Nothing keys on the agents row. v_kyc_keep reads only APPROVED or SUSPENDED applications. The storage skip in SQL and counts.kyc_retained both come from v_kyc_keep, and the TS sweep reads counts.kyc_retained.
  - A probe step proves such an account is purged in full: kyc_retained false, the agent-documents path listed, documents and ID number gone. It ran live: PROBE_OK. Committed as the final commit.
- Full vitest on fix/a4: 299 files, 4295 passed, 1 skipped. tsc 0.
- STATE: SEC-13 purge half / STORE-P2-02 / ESC-06 / MON-09 / STORE-12 / SEC-10 amendment are FIXED (applied). FOUNDER: confirm the AML retention period with counsel.

#### Batch 5: A09 Ops leftovers (release merged before and after; head after the second merge)

### OPS-09, functions in iad1, DB in eu-west-1
- STATE: FIXED (436b2b79) / FOUNDER: confirm after deploy that `x-vercel-id` reads dub1.
- FIX: `"regions": ["dub1"]` in apps/web/vercel.json, the documented project-level key (checked against Vercel's docs). DEPLOY.md says how to confirm it.
- TEST: lib/ops/function-region.test.ts.
- NOTE: the old PNG share card's deletion was staged and landed in this commit by mistake. The share card is missing in the commits between this one and ad5b1f8d; history cannot be rewritten.

### OPS-10, cold page weight (cheap wins only)
- STATE: PARTIAL (237c4e36).
- FIXED:
  - `images.formats` is AVIF then WebP.
  - Font preloads cut from 6 to 2 (inter-latin, poppins-700-latin; yo/ig: inter-latin, inter-vietnamese).
  - The wordmark `<Image>` gets `sizes`, so it no longer requests the 1920-wide file.
  - Test: lib/ops/page-weight.test.ts.
- DEFERRED (not cheap):
  - /search's three inline catalogue reads, which need the map pins to move to /api/map/listings after mount and facet counts to move to SQL.
  - A save-data "lite mode" for decorative images.
  - The low-resolution example photos (content).
- The same commit also carries the root metadata's canonical and og:url (OPS-16), because both changes are in layout.tsx.

### OPS-11, uncached landing fan-out
- STATE: FIXED for the landing (e3ce9fc2) / DEFERRED: keyset pagination on /search, the SQL amenity AND-filter and review-stat columns (2–3 days; OPS-11 items 1–3).
- FIX:
  - SupabaseListingRepository takes a client factory (default: the cookie client).
  - lib/listings/landing-catalogue.ts memoises the featured rail and the catalogue page for 5 minutes per instance, through a sessionless anonymous client, so the cached value is exactly what a stranger may see (public point).
  - platform_stats already has its own 5-minute memo.
- MEASURED on a production build with live Supabase: / 0.85 s cold, then 0.17 s and 0.15 s.
- TEST: landing-catalogue.test.ts (one read serves every visitor; sessionless client; the landing uses it).

### OPS-14, fire-and-forget email, no List-Unsubscribe
- STATE: PARTIAL (c1275b80).
- FIXED:
  - sendEmail retries 429, 5xx, timeout and unreachable twice (400 ms, then 1200 ms) with one Idempotency-Key per message, so it is delivered at most once. A refusal (4xx other than 429) is never retried.
  - SendEmailMessage takes `headers`.
  - The outbox sends `List-Unsubscribe: <…/settings/notifications?channel=…>` for templates that answer to a switch (today: the enquiry email).
  - Tests: client.test (4 retry and 2 header cases), outbox.test (the enquiry email carries it; escrow does not).
- DEFERRED:
  - Routing all 16 direct senders through email_outbox, which needs an outbox template per message.
  - One-click unsubscribe (List-Unsubscribe-Post), which needs a signed, sign-in-free endpoint and a signing secret.
  - A separate alerts subdomain (a DNS decision for the founder).

### OPS-15, one script without a nonce
- STATE: FIXED by the release's Next 16.3.6 (3a66daac: proof, checker and guard test).
- ROOT CAUSE:
  - The live deployment (built from main, whose lockfile has next 16.2.12) renders the root layout's own client chunk as `["$","script","script-0",{src,async}]` with no nonce. It is visible in the live RSC payload of /about (`11-v4cdswovuj.js?dpl=…`).
  - Next 16.3.6's create-component-styles-and-scripts.js and get-layer-assets.js pass `nonce: ctx.nonce`.
- PROOF:
  - A production build of this branch served on a local port: every script on /, /about, /sign-in, /welcome and /help carries the policy nonce.
  - `scripts/check-script-nonces.mjs <origin>` fails against www.vallospaces.com today (1 of 45 on /about) and passes against the build.
- TEST: lib/security/next-script-nonce.test.ts (the installed renderer passes the nonce; package.json asks for next ≥ 16.3).
- FOUNDER / preview check: `node apps/web/scripts/check-script-nonces.mjs https://<preview-url>` must print no "lack the policy nonce" lines.

### OPS-16, share card
- STATE: FIXED (ad5b1f8d; canonical in 237c4e36) / FOUNDER: whether to exempt social crawlers on /listing/* (a product and privacy decision; the VALLO_PUBLIC_CATALOGUE switch already opens listings when turned on).
- FIX:
  - The card is a 115 KB JPEG (was a 294 KB PNG), and the generator writes it.
  - Every page's canonical and og:url are its own address (`./` against metadataBase). Verified on the build: /about → …/about, /help → …/help.
  - The proxy's public path list is updated.
- TEST: lib/ops/share-card.test.ts.

### OPS-17, soft 404s
- STATE: FIXED (ad5b1f8d).
- FIX:
  - A signed-out request for an unknown first segment is a 404. lib/routing/known-routes.ts is held equal to src/app by its test; the two extra names are next.config redirects.
  - A listing page for a listing that is not there (or an id that cannot be one) is rewritten to the 404 by the proxy before the stream starts. It is the page's own read (PUBLISHED, the caller's session and RLS) reduced to a HEAD count; any failure passes through to the page. The rewrite keeps the refreshed session cookies.
  - The not-found page is noindex.
  - Also tried: notFound() in generateMetadata. It did not change the status because the root loading.tsx streams first, so it stays only as a belt; the proxy check is the fix.
- MEASURED on a production build with live Supabase:
  - signed out: /definitely-not-a-page-xyz 404, /wp-admin/x.php 404, /preview 404, /home 307 → sign-in (unchanged);
  - catalogue open: /listing/<missing uuid> 404, /listing/not-an-id 404, a live listing 200.
- TEST: routing/known-routes.test.ts, routing/listing-exists.test.ts, not-found-status.test.ts.

### V-02
- My two BACKED_CLAIMS entries (d3f3c065) were dropped again once the release reworded both sentences. claims.ts equals the release; claims.test is green.

### Gates (after the final release merge)
- tsc 0.
- lint: 0 errors, 333 warnings.
- css 0; valuation 0.
- vitest: 350 files, 4645 passed, 1 skipped, 2 failed. Both failures come from the release and touch no file this branch changed:
  - payments/bank-accounts-actions.test "stores the account with the name Paystack resolved" (returns not-configured);
  - admin/reads/jobs.test (vallo_escrow_age_watch is scheduled in a migration but missing from PG_CRON_JOBS).
- build 0 (tsconfig restored).

#### After batch 5 (Agent 5 approved all seven)

### UI-16 remainder, /stay and /restaurant soft 404s
- STATE: FIXED (3131d54e).
- The proxy's pre-render check (lib/routing/listing-exists.ts `detailIsMissing`) now covers:
  - /stay/<id>: an accommodation, or the PUBLISHED listing the page falls back to;
  - /restaurant/<id>: a restaurant business, or a PUBLISHED listing.
  Each is the page's own read reduced to a HEAD count under the caller's RLS, and a failed read passes through.
- MEASURED on a production build with live data (catalogue open):
  - /stay/<missing> 404, /stay/nope 404, /restaurant/<missing> 404, /listing/<missing> 404;
  - live accommodation, restaurant business, restaurant listing, listing, and a stay URL for a listing: all 200.
- Signed-in unknown paths: an unmatched route is already Next's native 404 (the audit's evidence). Nothing to change. Not re-measured signed in: that needs a session in this container.
- NOT DONE: /messages/<missing> and /profile/setup/bogus. They are private pages whose not-found would need a per-user read in the proxy; recorded as DEFERRED.

### OPS-11 item 1, keyset pagination on /search: PLAN (not built)
1. **Cursor.** The catalogue order is `featured desc, published_at desc nulls last, created_at desc` (supabase-repository.ts:1302-1304). Add `id desc` as the final tiebreak and encode the last row's `(featured, published_at, created_at, id)` as an opaque base64url cursor.
2. **Read.** Add `search(filter, { limit: 24, after?: cursor })`. PostgREST cannot express a row-value comparison across mixed directions in one filter, so do it in a SQL function `public.catalogue_page(filters jsonb, after jsonb, page_size int)`:
   - `security invoker`, so RLS is unchanged;
   - the same predicates as today;
   - the tuple condition written out: (featured < f) or (featured = f and published_at < p) or …;
   - backed by a composite index on `(featured desc, published_at desc nulls last, created_at desc, id desc) where status = 'PUBLISHED'`.
   The price sort (`total_move_in_cost_minor`) gets its own cursor `(total_move_in_cost_minor, id)`.
3. **Total.** `count: "estimated"` on the first page only, so "N properties" is honest past 200. The 200-row cap stays as the hard ceiling per request.
4. **UI.**
   - /search list view: "Show more" appends the next page, with the cursor carried in the URL (`?after=`) so Back and sharing work. `repo.isSeed` currently disables the control; replace that with "has a next cursor".
   - The map already reads `/api/map/listings` (bbox, 300 pins) and needs nothing.
5. **Client-side post-filter.** `matchesFilter` after the cap must move into SQL for any filter still applied in JS, or a page can come back short. This is OPS-11 item 2, the amenity AND-filter as a `group by … having count = n` RPC.
6. **Tests.**
   - A repository test that two pages concatenate to the single-read order with no duplicates across equal `featured` and `published_at` values.
   - A probe that `catalogue_page` as anon returns only PUBLISHED rows and honours the cursor.
- Effort estimate: 1.5–2 days, most of it the SQL function, its index and the amenity/review-stat moves (OPS-11 items 2 and 3).

### OPS-10 deferrals: not cheap, still DEFERRED
- /search inline catalogue payload: the map pins would move to `/api/map/listings` after mount, and the facet counts to SQL. This is 1 day, and it touches the same read as the pagination above, so do the two together.
- Lite mode (skip decorative images under save-data): the flag exists (`data-save-data`), but deciding which images are decorative is a design pass.

#### SUP SWEEP (reviewer: Agent 3)
Merged repo-clean-work into fix/a4 first (f71c0eb2). Every item was re-verified on the current tree or the live DB before it was fixed.

### SUP-17: FIXED (768f6686)
A restaurant is not submitted without a photo. HostDraft.businessPhotoCount (a HEAD count on business_photos) feeds missingFrom. Test: onboarding.test.

### SUP-P2-03: FIXED via DB-02 (210af9a8)
Probe sup-p2-03.sql ran live and gave PROBE_OK: a member's own publish is refused 42501, no reference is minted and no system post is written.

### SUP-16: FIXED (e421ca1d)
The device draft key is `nf_listing_draft:<userId>`, and clearListingDrafts() runs after a successful sign-out in all three sign-out paths. Test: listing-draft-storage.test.

### SUP-14: FIXED (3c48ea59)
- reviewAgentApplication now checks the error from the agents upsert and from the user_roles upsert, and treats a throw the same way. On failure:
  - the application's status, reviewer_id, reviewed_at and review_notes are restored exactly as read;
  - an agents row this approval created is deleted. requireAgent reads only that row, so a leftover row would open listing. The row is found by a pre-read and the delete is filtered by user_id + application_id. A pre-existing row is left alone;
  - nothing is announced, and the reviewer is told to try again.
- Test: agent-application-approval.test (4 cases). 3 of them fail on the old code, as shown.
- Not done: a single SECURITY DEFINER RPC for all three writes, which the audit preferred. The rollback is best effort: a failed rollback write leaves the old symptom.

### SUP-11: FIXED (d6ada4d7)
- Re-verified live: agent_documents_kind_known does not accept idFront, idBack or registration.
- The slot kinds are now mapped to identity and business (lib/agent/application-document-kinds.ts; a "use server" file cannot export a const), and the insert sets `uploader_id: user.id`.
- Test: application-document-kinds.test.

### SUP-10: FIXED (hidden) (8a8f2e74)
- SUPPLY_DOOR_ORDER is ["owner","agent"], so neither the chooser nor doorsSentence (used in help and docs) offers "We are a registered firm". /profile/setup/firm redirects to /profile/setup/agent. FirmRegisterForm is kept.
- The docs copy now says "The agent form asks for more".
- Tests: roles.test (SUP-10), add-workspace-groups.test (firm title absent), setup-back.test (firm page redirects).
- Residual: the filter drawer still offers "Registered firm" as a lister-role filter, and it always returns nothing. Left alone because it is a filter, not the door, but it is NEW-A4-01 (LOW) if the reviewer wants it hidden too.

### SUP-04: FIXED (1d620e4e)
- proxy.ts isServerActionRequest (POST + next-action header). In the signed-out branch, after the API 401 and before the redirect, the request passes through, so the action answers with fail("Sign in to continue.") and the form keeps its state.
- An action id is callable at public paths already, so no new exposure. Every "use server" file was checked: all resolve the session or delegate to a function that does, except the verification stub.
- Test: proxy-server-action.test. The action passes through; a page load, a plain POST and a GET carrying the header still bounce; /api with the header still gets 401. The first draft let /api through, and the test caught it; that was fixed by putting the API refusal first.

### SUP-13: FIXED (copy) (6c96c6e7)
- Re-verified: approval leaves the verification tier at 0, and nothing gates publish on identity.
- What is enforced: an admin decides the application, and staff publish every listing (DB-02, probe sup-p2-03).
- owner.you.assurance is now "A person at Vallo reads your application, and every listing, before anything is published." in en, with ha/ig/yo following. **The ha/ig/yo sentences want a native reader.**
- "We check every listing by hand" (en.ts 2778/2825/2869) is now true under DB-02. The standards/page duplicate-photo sentence is already caught by V-02 (claims.test).
- Test: owner-assurance.test.
- The publish gate on verification_tier >= 1 was NOT built. It is a product decision that would block every current lister, since all are at tier 0.

### SUP-12: PARTLY FIXED ALREADY; remainder PENDING DB (probe 6d84f75d)
- Re-verified live:
  - a closed night is already refused at insert by private.price_booking_from_listing (ESC-02/ESC-03);
  - booked-night overlap is refused by bookings_no_overlap (EXCLUDE on PENDING/CONFIRMED/NO_SHOW);
  - still open: settle_booking_charge, pay_booking_from_wallet and TS writeBookedNights upsert with `do update set status='booked'`, so a night closed after a stay was requested becomes booked, and the release (which deletes only booked rows) then reopens it.
- PENDING migration: scratchpad/work/a4/sup12.sql adds private.availability_keeps_a_closed_night, a BEFORE UPDATE OF status trigger on public.availability that keeps unavailable->booked as unavailable. The host can still reopen a night. It covers all three writers without touching A2's money functions.
- Consequence: a live stay over a host-closed night appears as missing_night in private.inventory_drift. That is intended, because staff should see it.
- Before the change: the probe gave PROBE_FAIL (a closed night was overwritten to booked).
- PROOF (apply_migration `probe_sup_12_proof`, rolled back): PROBE_OK sup-12. Afterwards there was no trigger, no function, no schema_migrations row and no leftover rows.
- Apply after Agent 3 approves, then commit the migration with its version and re-run the probe live.

### Gates (at 6d84f75d)
- tsc 0.
- Lint: 330 warnings, 0 errors; V-02 claims check green.
- vitest: 377 files, 4798 passed, 1 skipped.
- Build OK.

### SUP-04 REDO (after A3 CHANGES MEDIUM; the release reverted 1d620e4e in 7d41d6c2)
- Branch fix/a4-sup04, cut from the release at f99b1a28. Worktree /home/user/wt/a4-sup04; node_modules are hard-linked from a4 because Turbopack refuses symlinks. Not pushed.
- a26b0d93: `git revert 7d41d6c2`, which reapplies SUP-04.
- fe02799a: the signed-out action pass-through is limited to SELF_GUARDING_FORM_PATHS:
  - /profile/setup/owner, /profile/setup/agent and /profile/setup/professional, which now call the new requireSignedInPage;
  - /host/apply and /agent/list, which already had their own signed-out state.
- Tests: each listed page is pinned to its guard; the list must equal the guard map; /listing/abc, /home, /messages, /wallet, /profile, /profile/setup and a nested path all bounce; signed-in-page.test covers the redirect.
- Gates: tsc 0; lint 330, V-02 green; vitest 400 files, 4892 passed; build OK.
- Sent to A3 for re-review, and the head to main.

## Agent 5: truth on screen and content safety

### Ledger, Agent 5 (truth on screen, content safety)

### SEC-05 + STORE-P2-01, objectionable-content filter on 2 of 8 surfaces; reviews/businesses not reportable
- STATE: FIXED, migration 20260923235821_content_scanner_on_every_surface applied to live after Agent 4's approval of the amendment
- RE-VERIFIED LIVE (2026-09-23): `blocked_terms` holds 133 rows in 12 categories (the handed claim "NO rows" is FALSE; A04's count stands). Only `scan_post` and `scan_social_profile` call `objectionable_pattern()`; `scan_message/review/review_response/story/story_comment/event` look only for 10-digit runs and payment words; no scan trigger on listings, businesses, accommodations, room_types or profile names. Old-DB demonstration (rolled back, `probe_a5_sec05_old_db`): spaced-slur post=LIVE, slur story comment=LIVE, "Mrs Loli Adeyemi is my landlady" post=HELD.
- CHANGED:
  - Pending migration: scratchpad/work/fix-a5/sec05.sql (to be committed as supabase/migrations/<version>_content_scanner_on_every_surface.sql after apply). It: adds `blocked_terms.action` (hold|flag); deletes `loli`, adds `lolicon`/`shotacon` + 8 more hold terms and 2 flag terms; demotes to FLAG (alert, content stays up) `coon, paki, wog, spic, chink, sambo, i will deal with you, call me on whatsapp, western union, moneygram` (real names/places/idioms/landmarks in Nigeria: Sambo is a surname, "spic and span", Western Union as a landmark); new `private.content_forms` (NFKD, accent strip, leetspeak in both 1->i and 1->l forms, edge punctuation stripped, spelled-out letters joined), `private.blocked_pattern(action)` (space in a term = optional space), `private.content_verdict(text)`, `private.open_content_alert` (dedupes open alerts), `private.content_writer_is_member()` (role GUC in authenticated/anon and not admin/super_admin, definer functions cannot use current_user; verified live that `current_setting('role')` stays 'authenticated' inside a definer). Rewrites the 8 scanners: posts/stories/story comments/events HOLD; reviews/host replies REFUSE with RM004 (no held state); messages open a risk alert (delivered, not dropped); handles/names REFUSE with RM004 for a member, and on the sign-up path (auth trigger) the public name becomes "Member" + alert so sign-up never breaks; bio no longer re-held on unrelated edits. New scan triggers `*_zz_content_scan` on listings, businesses, accommodations, room_types (see SEC-06 for the hold behaviour).
  - Code commit 11326ced: REPORT_TARGETS += review, business, event; ReportSheet on every written review (ListingReviews), stay page, restaurant page (listing or business target). RM004 mapped to the database's sentence in lib/reviews/actions.ts, lib/agent/reviews-actions.ts, lib/profile/actions.ts, lib/social/profiles-actions.ts (new lib/safety/content-refusal.ts).
- EVIDENCE IT NOW WORKS: proof `probe_a5_sec05_proof2` (whole migration + probe, rolled back) → `PROBE_OK sec-05`. 38-case matcher table: holds NIGGER, n1gger, "n i g g e r", n.i.g.g.e.r, Ñyamiri, chi1d porn, childporn, "call  girl", "whatsapp  me  directly", lolicon, f4ggot…; flags Coon Street, "I will deal with you…", "Call me on WhatsApp for inspection", Paki shop, Alhaji Sambo, "Spic and span", Western Union landmark, Wog Estate; clean: Mrs Loli Adeyemi, Scunthorpe, Pakistan embassy, spice market, raccoon, Lolita Estate, Kafiru Street, Igbo Efon, Nigerian names. Surfaces as the QA member through `authenticated`: clean post LIVE / spaced slur HELD; story clean LIVE / slur HELD; comment clean LIVE / slur HELD with reason; nickname "Loli" saved / slur refused RM004; handle slur refused RM004; bio slur HELD; DM threat delivered + 1 risk alert; review & host reply slur refused RM004 (live functions on scratch tables, a probe cannot mint a finished booking); event slur HELD; sign-up-path slur name → "Member". No migration row recorded; no function leaked.
- Gates (batch 1): typecheck 0 errors; lint 0 errors (335 warnings, pre-existing); vitest 244 files / 3893 passed / 1 skipped; build exit 0 (tsconfig unchanged).
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-05.sql; apps/web/src/lib/safety/user-generated-content.test.ts ("reporting reaches every public surface (STORE-P2-01)"); apps/web/src/lib/safety/content-refusal.test.ts
- NOT DONE / NOTES: there is no event page in the app UI (events are not surfaced anywhere a member can view one), so no event report control is mounted; `event` is an accepted target for when one exists. Deployed main shows its generic "could not save" copy for an RM004 refusal until the release branch ships (nothing published; compatible). Seeded terms beyond the 12 added are founder's call (FOR THE FOUNDER #5 answered by this demotion list).
- REVIEW: Agent 4 (a5-batch1-by-a4.md): 5 CHANGES REQUIRED. AMENDED (commit 32a7fb06 + migration v2 in scratchpad/work/fix-a5/sec05.sql): (1 HIGH) reviews/host replies now refuse only `abuse.*` (`content_verdict(text, 'abuse')`); `fraud.*` in a review/reply publishes and opens an alert; listings likewise hold only for abuse/tenant preference, scam wording → alert. (2) tenant-preference exclusions: boys' quarters/BQ, ladies' bar/salon/hairdresser/wear/toilet/hostel, "allowed in the rooms", "visitors after", Igbo Efon/Ora/Elerin/Ukwu. (3) normaliser: zero-width + soft hyphen stripped, 30 Cyrillic/Greek look-alikes mapped, runs of 3+ letters collapsed to 1 and 2 as extra forms, edge punctuation read before and after the leet map; new preference shapes: "X tenants not allowed / preferred / not welcome", "(we) prefer X", "strictly for X". (4) sec-06 re-proved against the LIVE owner guard (20260923232741): member DRAFT → reword → SUBMITTED (+1 alert); member publish branch kept only as defence in depth. (5) admin/server publish clears the scanner's own note (unless the admin wrote a new one). Proof `probe_a5_sec05_sec06_proof3` (whole v2 migration + both probe files as rolled-back temp functions): `RESULTS PROBE_OK sec-06 || PROBE_OK sec-05`; no migration row, nothing leaked. Matcher run `probe_a5_matcher_try2`: ALL PASS on 47 abuse cases + 7 scoped + 44 preference cases. AWAITING re-check.

### SEC-06, discriminatory tenant preferences
- STATE: FIXED, same migration 20260923235821 (live)
- RE-VERIFIED: no scanner on listings; "No Igbo tenants", "Muslims only", "Married couples only" pass untouched today.
- CHANGED: `private.discriminatory_phrase(text)` (ethnic groups, religions, marital/family status, gender, in "no X" / "X only" / "only X" shapes, on the normalised forms); `private.scan_catalogue_text()` on listings (title, description), businesses (name, description), accommodations (name, description, house_rules), room_types (name, description): for a member writer, a match (or a hold-tier abuse term) HOLDS FOR REVIEW, reason written to `review_notes` (shown to the lister in /agent/listings), a PUBLISHED/APPROVED row goes back to SUBMITTED, a DRAFT keeps its status (not pushed into the queue), one alert when it is submitted/live; rewording clears the note; admins (own authenticated client) and server writers are never held. Never refuses. Wizard: inline warning while typing (lib/safety/tenant-preference.ts mirrors the SQL; commit 11326ced).
- EVIDENCE: proof `probe_a5_sec06_proof2` → `PROBE_OK sec-06`: 12 positive + 13 negative cases (near the mosque, Igbo Efon, No family land dispute, Men's salon, Muslim prayer room, no single room available…); member DRAFT "No Igbo tenants" saved as DRAFT with note "Held for review: … ("no igbo") …"; member setting it PUBLISHED lands SUBMITTED with 1 open alert; rewording clears the note; admin publishing a "Ladies only" listing stays PUBLISHED. vitest tenant-preference.test.ts (same table) passes.
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-06.sql; apps/web/src/lib/safety/tenant-preference.test.ts
- FOUNDER: add "marital status" to the /standards non-discrimination sentence (the hold note already names it), one line of copy, a policy decision.
- REVIEW:

### SEC-05 / STORE-P2-01 / SEC-06, APPLIED
- Applied 2026-09-23 as version 20260923235821 `content_scanner_on_every_surface`; committed byte-identical (md5 d5789855b3ef20e6c89831aef9fa8e14; the MCP transport turned the `\u0300`-style regex escapes into the literal characters, which are the same regex, and the committed file carries them as recorded). Includes the LOW follow-up from the re-check: "Men only barbershop" is not a tenant preference.
- Live probes after apply: `probe_sec_06` → PROBE_OK sec-06; `probe_sec_05` → PROBE_OK sec-05 (both against the live owner guard, nothing left behind).
- Live smoke through PostgREST as the QA member: benign DM ("Hello, is this place still available for an inspection next week?") inserted, 0 risk alerts; PATCH nickname to a slur → HTTP error `RM004 "That name uses words our content standards do not allow."` (proves the role-GUC member detection under PostgREST). A live review cannot be written: the QA member has no booking (demo listings refuse transactions); the review path is proven by the probe on the live function.
- blocked_terms now 144 rows (12 flag tier).
- Commits: 11326ced, 32a7fb06, and the migration commit.
- REVIEW: Agent 4, APPROVED on re-check (a5-batch1-by-a4.md).

#### BATCH 2

### UI-03 / STORE-05 / UX-03 / UX-22, claims without a mechanism
- STATE: AWAITING-REVIEW (code, commit ae1a41f3)
- RE-VERIFIED: live copy still had "Verified homes…" (landing lede), "Rent, buy or invest in verified properties" (home hero), /rent "Homes for real rent … Verified listings only" + "Every rental here is checked / Listings and agents are verified before they go live", agent pitch "Verified supply only / Every listing is checked by hand / where they are protected", "connect with verified guests", "get paid securely", landing stat "Verified agents" (platform_stats counts APPROVED agents, not verified), KYC and host consent text claiming a "processor" checks "identity and sanctions databases" (no such integration exists: grep for dojah/youverify/smile/prembly/sanctions = none), docs/careers/assistant/support/FAQ "every listing put up by a person we have checked" (false for the 64 examples), FAQ/support "passed ID and address checks" (the badge is tier 1, ID only).
- CHANGED (en + ha/ig/yo where the string exists): all of the above removed or reworded; Invest tile removed (it went to the same /search?market=buy as Buy) and dropped from the hero; Manage → "List a property"; Nearby → "Local talk / What people say" (it opens the social feed); escrow lede → "Disputes, decided on the record."; "safe" reassurances on sign-in walls, payouts, messaging maintenance, auth error reworded to facts; "one protected place" → "one place, on the record"; saved-search chip "Checked listings" → "Verified only" (the filter's own name); listing about-text "The agent and this property were checked" → "A person at Vallo checked the ID of the agent behind this listing" (listing.verified = agent badge only); review empty state "verified stays" → "stays booked and finished on Vallo".
- CLAIMS KEPT, WITH THE MECHANISM (for V-02's allowlist): "Verified" / "Verified agent|host|listing|account" / "verified tick|badge|mark" / "Identity|Address|Payout|Fully verified" → agent_verification_checks rungs decided by an admin + agent_badges.verified (lib/listings/supabase-repository.ts `verified: !is_demo && verifiedAgents.has(agent_id)`); "Address checked" → listings.address_verified_at (owner write guard, DB-02, makes it admin-only); "Registration/Mandate checked", "We checked the record on {date}" → supply verification rows; "agents checked by a person / every agent checked by hand before they can list / listers checked by a person" → agents rows are admin-only writes (agents_manage_admin policy); "checked before the listing goes live" → admin listing review queue + owner write guard; "secure payment page/window", "Secure payment in naira" → Paystack hosted checkout (card data never on Vallo); "protected with row level security" → RLS on profiles; "encrypted in transit, passwords hashed" (privacy, docs) → HTTPS/HSTS + Supabase Auth; "keep the service secure" → purpose statement; "checked out" (a stay), "Rooms checked" (the member's own inspection checklist), "checked many times" (payment polling), negations ("not protected by us", "not a guarantee", "have not checked", "not yet checked").
- "Secure and fast" (en AppBand points) is still on this branch only because fix/a4 b36e00e2 removes it (already integrated); not touched here to avoid a conflicting hunk.
- TEST: batch 3's V-02 build check encodes the allowlist; placebo/example/story tests below.
- REVIEW:

### UX-09 + UI-P2-01, example stays and restaurants unlabelled one tap deeper
- STATE: AWAITING-REVIEW (commit ae1a41f3)
- RE-VERIFIED: StayDetailView/RestaurantFace had no is_demo branch; "Book now" / "Request a table" drawn for examples; DetailAnatomy drew the person-with-tick for every host.
- CHANGED: StayDetail.isExample (accommodation.is_demo || business.is_demo); RestaurantFace isExample (listing.isDemo or business.is_demo). Example → ExampleNotice under the name, availability card replaced by "Nothing here can be booked or paid for" + Browse real stays, rooms section says none can be booked, no Message button; example restaurant → notice + "Nothing here can be booked or held" instead of ReserveTable, no message link. Unverified host → BrandIcon person-card.
- TEST: apps/web/src/app/(app)/stay/[id]/example-disclosure.test.ts (fails on old code: no isExample anywhere).
- REVIEW:

### THE DEAD BRAND, "Listed by RentMe Example Collection"
- STATE: FIXED, applied as 20260924002102_the_example_collection_is_named_for_vallo (md5-identical file committed, 138ea05f); live `probe_dead_brand` → PROBE_OK; the 22 post ids are in the migration for a lossless reversal
- BEFORE (live): agents e0000000-…0002 display_name "RentMe Example Collection" (is_demo, 64 listings); profiles e0000000-…0001 display_name same; social_profiles.display_label same (handle example_collect); 22 SYSTEM posts "…places were open on RentMe…". No function/cron re-seeds the name (pg_proc hits only the handle blocklist). No code fallback (apps/web/src has "RentMe" only in comments).
- AFTER (proved in the rolled-back run): "Vallo Examples" on agent, profile and public identity; system posts say Vallo; anon reads no RentMe identity. Left alone on purpose: auth.users email / metadata of the example account (email is immutable by ruling; not shown), ai_messages / support tickets (people's own words).
- TEST: supabase/tests/probes/dead-brand.sql (fails on today's live data at the first check).
- REVIEW:

### UX-P2-01 / UX-P2-02 (+ NEW-A5-01), placebo controls
- STATE: AWAITING-REVIEW (commit ae1a41f3)
- RE-VERIFIED: DataCard "Download my data" only set a note ("everything Vallo knows about you lives in this browser … ships with the launch release"); SecurityCard "Biometric app lock" wrote settings.appLock, read nowhere.
- NEW-A5-01 (HIGH, fixed): "Sign out everywhere" in the same card only showed "This is your only session … Once accounts launch, this control ends every session", false (accounts are live; /settings/devices lists sessions and `endOtherSessions` really ends them). Removed with the other two.
- CHANGED: the three rows and their copy removed in en/ha/ig/yo (settings.security.appLock/appLockSub/signOutEverywhere/signOutNote, settings.data.download/downloadSub/exportNote); appLock dropped from the settings store. Real session ending stays on /settings/devices (DevicesRow). Coordination: Agent 6 (OPS-12) builds the real export and adds its own control.
- TEST: apps/web/src/components/app/account/placebo-controls.test.ts.
- REVIEW:

### /stories/new "It stays up" (handed item)
- STATE: FIXED (inverse of the handed item)
- RE-VERIFIED: nothing expires a story, stories-schema.ts ("It is not ephemeral. Nothing expires it"), no cron job touches public.stories, the select policy has no time bound. "It stays up" is TRUE. The false statements were the glossary (docs/PRODUCT.md "A picture post that expires") and the takedown refusal ("It may have expired"). Both corrected.
- TEST: apps/web/src/lib/social/story-permanence.test.ts.
- REVIEW:

Batch 2 REVIEW: Agent 4 APPROVED all four areas (a5-batch2-by-a4.md). LOWs taken in 138ea05f: bare "Secure payment in naira" → "Payment in naira through Paystack" (4 locales); example sentence and the new not-bookable lines routed through t.examples (en; ha/ig/yo fall back), test pins en = EXAMPLE_STATEMENT; post ids recorded in the migration. Code items → FIXED on approval.

Batch 2 gates: typecheck 0 errors; lint 0 errors (335 warnings, unchanged); vitest 3928 passed / 1 skipped; build exit 0.

- Batch 2 follow-up 0a454d4a: 138ea05f broke `example-notice.test.ts` (the listing page now wraps `<ExampleNotice …statement=…>` in parentheses); the source check accepts the parenthesis. Full vitest green again.

#### BATCH 3

### V-02, the claims rule as a build check
- STATE: AWAITING-REVIEW (commit 295c41fb)
- CHANGED: apps/web/src/lib/trust/claims.ts (claim words; BACKED_CLAIMS allowlist, each entry naming its mechanism; negation and "a person checked the ID" rules; one `pendingRemoval` entry for "Secure and fast", already deleted on the release branch by STORE-06); apps/web/src/lib/trust/claims.test.ts (sweeps every string literal + JSX text under apps/web/src and the en/ha/ig/yo catalogues, excluding tests, (dev) previews and the staff console; fails on any unbacked claim and on any stale allowlist entry); apps/web/package.json `check:claims`, wired into `lint` and `prebuild` (so `npm run build` fails on a new unbacked claim). Also fixed while sweeping: /standards "Duplicate and stolen photographs are checked before anything is published" (no photo comparison exists) and docs "where it can be protected".
- FAILS FIRST ON THE OLD COPY: the same test pointed at `git archive 77cf90a` reports 56 unbacked claims; 22 sentences that shipped are pinned as must-fail cases.
- EVIDENCE: 37/37 on this branch; `npm run build` runs it in prebuild (exit 0).
- TEST: apps/web/src/lib/trust/claims.test.ts
- REVIEW: APPROVED by Agent 4 (a5-batch3-by-a4.md). Follow-up commit 7980a48e: header documents the one-line BACKED_CLAIMS remedy for a blocked hotfix build and that prebuild needs vitest (devDependencies); the scan now also reads supabase/templates (*.html, *.txt), native-shell/index.html, ios Info.plist and android strings.xml (none carries an unbacked claim; the only hits are CSS `safe-area` and an XML comment). /standards now names marital status in the non-discrimination sentence.

### SEC-11, the private-address guard
- STATE: AWAITING-REVIEW (commit fa393676)
- RE-VERIFIED: the guards asserted `not.toContain(<with-s spelling>)` in 3 files (brand-domain.test.ts, outbox-delivery.test.ts ×3, templates.test.ts ×2) and the brand-domain scan read 3 files; the archived BUILD_06 ledger carried the with-s spelling twice; the no-s spelling appears nowhere.
- CHANGED: `PRIVATE_ADDRESS = /vallospaces?ltd@/i` (lib/security/private-address.ts) used by all three tests; brand-domain now scans every file under apps/web/src and supabase/templates (>1000 files) and has a unit case proving both spellings (assembled at runtime) match and the public addresses do not; archive ledger mentions redacted. `git grep -iE "vallospaces?ltd@"` → 0 hits.
- TEST: apps/web/src/lib/brand-domain.test.ts ("keeps the private address, in either spelling…", "the guard matches both spellings and nothing else").
- REVIEW: APPROVED by Agent 4.

### SEC-15, staff-assisted email recovery
- STATE: DONE, LIVE. Migration 20260924012454_staff_assisted_email_recovery applied; committed file md5 aa536d505bb3c4279557f6f3e083f816 = md5(statements[1]). Commits a62ce69d, ec5494be, bbc05077.
- RE-VERIFIED: no recovery path; the only NIN on file for anyone is agent_applications.id_number (id_type 'nin'); account_identities follows auth.users email by trigger.
- CHANGED: table public.email_recovery_requests (RLS: admins read; no writes for anon/authenticated; one open request per user; notice timestamps); RPCs admin_open_email_recovery (super admin only, never own account, NIN must match an APPROVED application with id_type nin, eligible_at = +72h, audit row), admin_begin_email_recovery (super admin, not own account, refuses before eligible_at, audit), admin_finish_email_recovery (records ok/failed, audit), admin_cancel_email_recovery (any admin, reason required, audit). Server actions lib/admin/email-recovery-actions.ts (isSuperAdmin check before any call; auth.admin.updateUserById with email_confirm only between begin and finish; old address told on open and on completion, read from the request row); /admin/account-recovery desk; two security emails with fixtures; email-immutable.test allows exactly the purge and this file and pins the order of checks.
- EVIDENCE: rolled-back proof `probe_a5_sec15_proof` (table + RPCs + probe) → PROBE_OK sec-15: member and admin refused 42501; member cannot insert or read rows; wrong NIN RM040; own account 42501; begin inside 72h RM041; after the window begin+finish → completed with 3 audit rows; admin cancel works. (The two nullable notice columns were added to the file after that run; the reviewer's re-run covers them.)
- NOT DONE (FOUNDER): members without an approved NIN application have no identity on file, so they cannot be recovered by this path, the founder decides whether a selfie/ID-document check should be added for them. The audit's wallet-withdrawal hold after a move and ending the old sessions are not implemented (no admin API to end a user's sessions by id); both noted for the founder.
- TEST: supabase/tests/probes/sec-15.sql; apps/web/src/lib/auth/email-immutable.test.ts.
- REVIEW: CHANGES REQUIRED by Agent 4 (R1-R4, A1, A2). AMENDMENT (commit ec5494be; migration still PENDING scratchpad/work/fix-a5/sec15.sql):
  - R1 two people: begin refuses the super admin who opened (42501 "A different super admin from the one who opened it has to complete it."); finish refuses anyone but began_by. Rule: one super admin opens, a DIFFERENT super admin begins and finishes; neither can be the account's owner.
  - R2: begin refuses while opened_notice_at is null (RM041) and until greatest(eligible_at, opened_notice_at + 72h). The server stamps opened_notice_at only on the FIRST notice that went (`.is(column, null)`), so the desk's new "Send the notice again" action never restarts the clock; the notice states the real earliest time.
  - R3: finish(ok) deletes auth.sessions for the user (auth.refresh_tokens_session_id_fkey ON DELETE CASCADE, verified live); count recorded as sessions_ended in audit_log.
  - R4: account_money_holds (7 days from the move, owner/admin read). Trigger private.refuse_money_out_during_hold (RM050) before insert on wallet_entries (debit withdrawal / transfer_out only) and before insert/update on bank_accounts and payout_accounts (update refused only when account_number or bank_code changes, so removal, default promotion and the recipient-code cache keep working, the live soft_deleting_promote_default / payout_accounts_promote_default triggers update rows). Triggers sit on the tables every door writes, so Agent 2's functions are untouched and deployed main keeps working.
  - A1: admin_cancel_email_recovery also accepts the account owner (reason optional); owner SELECT policy; /settings/privacy shows the pending move with "This was not me, cancel it" (lib/auth/pending-address-move.ts, PendingAddressMove.tsx, en keys settings.addressMove).
  - A2: both notices carry a "Contact us" button to /contact and no longer say "reply to this email".
  - FOUNDER/DEFERRED: a phone (SMS) notice to the number on file, no SMS transport exists.
  - EVIDENCE: rolled-back apply_migration `probe_a5_sec15_proof3` (amended migration + amended probe) → PROBE_OK sec-15: no notice RM041; notice 71h ago RM041; opener begins 42501; second super admin begins; opener finishes 42501; seeded auth.sessions row gone after finish; 3 audit rows; withdrawal and transfer_out RM050, deposit allowed; member bank account insert RM050; repointing an existing account RM050; soft-deleting it allowed; owner cancels. Confirmed afterwards that neither table exists live and no probe migration was recorded.

Batch 3 gates: typecheck 0; lint 0 errors (335 warnings); vitest 4020 passed / 1 skipped; build exit 0 (prebuild ran check:claims 37/37).
Batch 3 amendment gates (after ec5494be, 7980a48e): typecheck 0; lint 0 errors (335 warnings); vitest 248 files, 4020 passed / 1 skipped; build exit 0.

### SEC-15, final (after Agent 4's RE-CHECK approval)
- Taken before apply: (1) REQUIRED-LOW: admin_open_email_recovery refuses an account with a SCHEDULED/PURGING/PURGED deletion request or banned_until > now() (RM040). (2) The hold also covers wallet `payment` and `escrow_hold` debits (the live functions that write them: pay_booking_from_wallet, escrow_hold, escrow_fund_from_wallet_as, escrow_fund_proposal_as; escrow_settle only writes credits, so settlement is never stalled). Card payments do not debit the wallet. (3) RM050 mapped to the database's sentence (with the end date) in lib/wallet/actions.ts (both withdrawal doors, send), lib/escrow/actions.ts, lib/bookings/checkout.ts (pay from wallet), lib/payments/bank-accounts-actions.ts, lib/agent/payout-actions.ts via lib/wallet/money-hold.ts; callMoneyRpc now carries the SQLSTATE. Test lib/wallet/money-hold.test.ts. The desk states the hold and shows its end per completed request; Settings, Privacy shows "Money cannot leave your account until <date>" while a hold is active.
- EVIDENCE: rolled-back proof probe_a5_sec15_proof4 → PROBE_OK; applied; live run probe_a5_sec15_live → PROBE_OK sec-15 (adds: closing and banned accounts refused; payment and escrow_hold debits RM050; deposit, refund and escrow_release credits pass). After: 0 requests, 0 holds, no probe migrations recorded.
- FOUNDER/DEFERRED: phone (SMS) notice; recovery for members with no approved NIN on file.
- Gates: tsc 0; lint 0 errors (335 warnings); vitest 4025 passed / 1 skipped (one earlier full run showed 1 failure that did not reproduce on rerun and no failure detail was captured; the JSON rerun is clean); build exit 0.

#### BATCH 4, A05 UX / A06 Interface remainder (commit f0601eb4; after merging repo-clean-work)

### UX-10 / UI-P2-03 (+ the routing half of UX-04), the market decides the page
- STATE: DONE (code f0601eb4, APPROVED by Agent 4; data migration applied as 20260924030039, file md5 b7ecc05d… = statements[1], commit in this batch; live probe PROBE_OK ui-p2-03)
- RE-VERIFIED live: 15 apartments, 2 villas and 12 homes are yearly rentals (e.g. ed…3d villa ₦25m/year) routed by kind to /stay; the two per-head restaurants are titled "Restaurant unit in Bodija" / "Restaurant space in Jabi".
- CHANGED: lib/listings/market.ts (`marketOf`: sale, tenancy by rent period, stay by nightly rate, dining/experience by per-head rate, kind as fallback); `hrefForListing(kind, id, facts)` routes by market (all 5 callers pass `marketFactsOf`); listing page: `isRental`/`isRestaurant`/pill by market (a yearly villa is "For rent", not bookable); /stay/<id> and /restaurant/<id> redirect a tenancy or sale to /listing/<id>; the Stays home shelf keeps only nightly stays, the Property home shelf only tenancies and sales. Data: the two example restaurants renamed "Restaurant in Jabi/Bodija" (pending).
- EVIDENCE: rolled-back `probe_a5_uip203_proof` → PROBE_OK ui-p2-03 (fails on the live data before the rename).
- TEST: lib/listings/market.test.ts (12), supabase/tests/probes/ui-p2-03.sql.

### UX-04, the side never turns silently
- STATE: AWAITING-REVIEW (f0601eb4)
- CHANGED: `isDetailPath`; SideSync writes nf_side only off detail pages (the URL still paints the side); header `.nf-side-tag` names the side (sr-only "You are browsing"); the flip already used push. Plus the market routing above (yearly lets no longer open under /stay).
- TEST: components/app/side-honesty.test.ts.

### UX-05, the workspace chooser shows all six doors
- STATE: AWAITING-REVIEW (f0601eb4)
- CHANGED: two labelled groups ("Property: to rent or to sell" / "Stays and tables…"), the current side's first; `hrefFor(door)` routes by the door (moved to AddWorkspaceChooser.href.ts).
- TEST: components/supply/add-workspace-groups.test.ts (renders the real component via lib/testing/render-client.ts, an esbuild bundle against the ordinary React build, because this suite aliases react to its server build).

### UX-06, minimal: the side switch at the top of the ⇄ sheet
- STATE: AWAITING-REVIEW (f0601eb4). The dock has no text labels by the founder's ruling, so no "Mode" label was added; moving the personal/working switch to the avatar is a founder IA decision (FOUNDER).
- TEST: side-honesty.test.ts ("offers the side switch at the top").

### UX-08, dates picked on the stay itself
- STATE: AWAITING-REVIEW (f0601eb4)
- CHANGED: StayDatesForm (GET to /stay/<id>, date inputs min = Lagos today, guests 1–16); Check in/out/Guests/"Pick your dates" go to #stay-dates. NOT DONE: a dates row on /stays/search above the categories (the stay page no longer depends on it).
- TEST: app/(app)/stay/[id]/stay-dates.test.ts.

### UX-19, Back closes an open sheet (web)
- STATE: AWAITING-REVIEW (f0601eb4)
- CHANGED: lib/ui/use-sheet-history.ts wired into Sheet (skipped inside Capacitor, where back-button.ts already closes overlays); a close takes its entry off one tick later, only if still on top, so a navigation made while closing is kept.
- TEST: lib/ui/use-sheet-history.test.ts (real Chromium: Back closes and stays; close pops; close+navigate keeps the navigation).

### UI-08, feed text follows Text size
- STATE: AWAITING-REVIEW (f0601eb4). All 19 px font-size/line-height values in social-feed.css → type-scale tokens or rem. TEST: app/social-feed-type.test.ts.

### UI-10, initials and long names
- STATE: AWAITING-REVIEW (f0601eb4). lib/text/initial.ts (grapheme-aware) used by 18 people-facing avatars; `.nf-people__name` shrinks and wraps. TEST: lib/text/initial.test.ts.

### UI-17, Appearance promised a theme
- STATE: AWAITING-REVIEW (f0601eb4). en "Text size, motion, data"; ha/ig/yo drop the theme word.

### UX-15 / UX-25, AI said plainly; the emails and prompts say what is true
- STATE: AWAITING-REVIEW (f0601eb4)
- CHANGED: SupportChat greets as "Vallo's AI support helper, not a person"; the card says "An AI helper"; Help row "FAQs, contact us" (en + ha/ig/yo); scripts/build-auth-emails.mjs + regenerated confirmation/invite (html+txt): no "every listing was put up by a real person", no "browse before you tell anybody"; examples "cannot be rented or booked"; support and assistant prompts: not a person, examples cannot be booked, `example: true` passed to the model; FAQ answer likewise. The LIVE auth templates are set in the Supabase dashboard (config.toml does not point at these files): FOUNDER step to paste the regenerated templates.
- TEST: lib/email/auth-template-honesty.test.ts, lib/support/ai-disclosure.test.ts, faq.test.ts.

### Lint
- The release branch was at 336 warnings (> the 333 cap). The three eslint rule plugins now export a named const (import/no-anonymous-default-export): 333.

### ALREADY-FIXED / NOT MINE / NOT DONE
- UX-18: ALREADY-FIXED by batch 2 (20260924002102, the example collection is named for Vallo).
- UI-04: merged into ESC-13; UX-13: merged into MON-04 (money agents).
- UI-09: Agent 6's 717a6195 (reviewed, approved); the remaining controls to follow after integration.
- NOT DONE this batch (LOW): UX-21, UX-23, UX-28, UI-01, UI-11, UI-13, UI-14, UI-15, UI-16, UI-19, UI-20, UX-P2-03; UX-08's search-page dates row.

Batch 4 gates: tsc 0; lint 0 errors, 333 warnings (cap 333); vitest 1077 files, 4396 passed / 1 skipped; build exit 0 (prebuild check:claims 37/37).

- Batch 4 REVIEW: APPROVED by Agent 4 (a5-batch4-by-a4.md). LOW (checkout shell side) and the /about + terms advisory folded into batch 5. Note: supabase/templates are only the dashboard fallback; live auth mail comes from the hook (lib/email/messages.ts), so the founder paste step is low priority.

#### BATCH 5, the A05/A06 LOWs (commits 8f4251d0, merge 8c305b58, 4285aba4; on top of c3a1682b)
State: APPROVED by Agent 4 (a5-batch5-by-a4.md), no blocking findings. Notes: TERMS_VERSION must stay 2026-09-24 from the release on merge; a failed first send can leave an empty thread (hidden by the inbox filter, LOW); the sheet scroll behaviour still wants a device check.

- UX-P2-03: /messages/new no longer writes. `findConversationForListing` looks (every check, no insert, no daily count); `FirstMessage` + `startConversationWithMessage` make the thread with the first message; an empty listing thread is hidden from both inboxes (only when the recent sweep was not cut off). TEST lib/messages/draft-thread.test.ts. Live: 8 conversations, 0 empty.
- UI-13: compact money written in full under ₦1,000 (`COMPACT_FROM_MINOR`), truncates instead of rounding up (₦999,999.99 → ₦999.9k); `nairaExact` keeps the sign; `<Amount>` shows kobo when there is kobo by default. TEST lib/payments/money-edges.test.ts. NOT DONE: the map-pin aria-label (on-device screen-reader behaviour unverified).
- UI-16: robots half DONE (the root layout sets no robots tag; a not-found page carries only noindex; TEST app/robots-meta.test.ts). Status half: /listing, /stay and /restaurant are real 404s through Agent 4's OPS-17 (ad5b1f8d, 3131d54e); other notFound() pages still stream a 200 (the root loading.tsx), which is structural, left as is.
- UI-14: `useDisplayHost` (useSyncExternalStore) replaces render-time `displayHost()` in ProfileEditor and ProposeAreaForm (the #418 on /u/<handle>/edit: server "vallospaces.com" and client "www.…"). TEST lib/ui/use-display-host.test.ts.
- UI-15: `ResultScreen` gains a neutral "missing" state (info plate, search glyph, muted ink, no alert role); review, checkout/[id], rent/pay and room checkout use it; the admin booking page uses "no-match" (never the success shield) and has an sr-only h1. TEST components/app/not-found-tone.test.ts.
- UI-11: the empty Recent Transactions head gets 0.875rem top padding; 0.125rem only `:has(.nf-wallet-link)`. The h1s were already present on /wallet, /host/photos, /host/rooms and /agent/inspections (InspectionHero); added the admin not-found one. TEST components/app/wallet/tx-head.test.ts.
- UX-08 remainder: StaysDatesRow on /stays/search (GET, `in`/`out`/`guests`, every other filter carried). TEST components/app/stays/stays-dates-row.test.ts.
- UX-21: the example CTA is "Get told when real homes arrive" → the area's search (Save this search sends alerts), on the listing page and move-in; tenancy reviews empty state speaks of tenants; /inspections header from the renter's side. (d) the saved-searches count left as is. TEST components/app/listing/empty-notes.test.ts.
- UX-28: (a) one back control on the chooser ("Choose a different one" steps back from the overview); (b) checkout dates via the shared `stayDateLabel`; (c) sign-in drops the length rule; (d) device counts are distinct devices (`distinctDeviceCount`). (e) the owner form's "Optional" placement NOT DONE: needs a screen to confirm the layout. TESTS lib/stays/ux-28-craft.test.ts, lib/security/device-count.test.ts.
- UI-19: overscroll-behavior-y moved from body to html. The chrome colour is NOT changed: lib/theme/chrome.ts records a measured reason (#010118 matches the header the chrome abuts, not the canvas behind it), and STORE-18 pins it. Pull-to-refresh: FOUNDER. TEST app/css/overscroll-root.test.ts.
- UI-01: the Agent Mode badge, the admin count badges (reference and social) and the wizard's photo badge take `--nf-radius-xs`; the numbered discs (wizard, rental panel, landing steps) are rounded squares. The control token itself is unchanged: making it self-limiting would re-shape every button. TEST components/ui/small-badge-shape.test.ts.
- UX-23: "listing account" and "Switch mode" throughout the en switch/chooser/agent-dashboard copy, the contact, help and docs links and the page titles. ha/ig/yo fall back until translated. TEST components/supply/listing-account-words.test.ts.
- UI-20: covered by Agent 4's OPS-17 (unknown signed-out paths 404).
- Batch 4 review LOW: /checkout is drawn in the Stays shell (everything paid there is a stay) and does not move the saved side. TEST components/app/side-honesty.test.ts.
- Batch 4 review advisory: Terms and /about sentences made true (examples named); TERMS_VERSION NOT bumped (rides with Agent 2's 2026-09-24). TEST lib/legal/listing-origin.test.ts.
- UX-19 follow-up: the Chromium test also holds the scroll position through Back and through a close. It does not exercise Next's router popstate handling, so a check on a device is still worth doing.

Batch 5 gates: tsc 0; lint 0 errors / 333 warnings (V-02 37/37); vitest 4732 passed / 1 skipped, 0 failed (on 4285aba4); build exit 0.
- Batch 5 merged with the release (7d389d91). The three not-found conflicts were resolved to the release's dictionary copy plus the neutral "missing" state, and TERMS_VERSION is the release's 2026-09-24. After the merge: tsc 0; lint 0 errors / 333 warnings; V-02 37/37; vitest 4814 passed / 1 skipped / 0 failed. Build not re-run after the merge (it was exit 0 on 4285aba4).

## Agent 6: the long tail, the documents and the repository

### Ledger: Agent 6 (long tail, documents, repository)

Worktree /home/user/wt/a6, branch fix/a6, base 77cf90ad.

#### BATCH 1: repository cleanup (THE_AUDIT section 10)

### CLEAN-01, root UUID PNGs
- STATE: AWAITING-REVIEW
- CHANGED: deleted 6 root copies byte-identical (md5) to docs/design/references/{2A49E2F7,50E032EA,55A56F21,6AF37222,77A54EA3,F6A8A482}; moved 4 admin renders (each viewed) to docs/design/references/admin/admin-01-overview.png (5EAA44CB), admin-02-listings-review-money.png (C1D98B3C), admin-03-escrow-verification-supply.png (8E9602E2), admin-04-moderation-operations-analytics.png (01F7DFC7). Readers updated: scripts/design/session-b-crops.mjs (4 path.join/RENDER), scripts/design/session-b-shots/admin-money.mjs, admin-review-shots.mjs; apps/web/public/brand/session-b/{inspection,send,signin}/SOURCES.md; comments in admin.css, inspection.css, auth.css, welcome/page.tsx, welcome.css, FirstRun.tsx. CATALOGUE.md gains an admin section mapping short id -> file.
- EVIDENCE: md5 pairs recorded in session; `git grep` for the 10 full UUID filenames outside docs/design/references and archive returns only references/ paths; check-css-tokens "0 comment paths that do not resolve".
- TEST THAT WOULD HAVE CAUGHT IT: check-css-tokens comment-path rule (existing) + markdown link scan (run by hand: 0 broken links outside docs/archive).

### CLEAN-02, archive session scaffolding
- STATE: AWAITING-REVIEW
- CHANGED: git mv to docs/archive/: SESSION_B_SCOPE, BUILD_SESSION_B_LEDGER, BUILD_05_LEDGER, BUILD_07_LEDGER, HANDOFF_04/05/07/08/09, SESSIONS_CLOSE_OUT, BUILT_VS_PROVEN, PROMPTS_2026-09-22, PROMPTS_THE_FINISH, PROOF_RUN_2026-09-22, PLATFORM_SURVEY_2026-09-22, FOUNDER_ARTWORK_NEEDED, REFERENCE_UPLOADS_2026-09-22, TRACK_G_STATE, design/SWEEP.md, PLATFORM_STATUS, FOUNDER_OPEN_ITEMS. docs/archive/README.md: rows for each; its "live documents" line now names THE_AUDIT instead of PLATFORM_STATUS.
- DECISIONS: PLATFORM_STATUS archived (1,375-line cycle-4 report; correcting it to today would duplicate THE_AUDIT). FOUNDER_OPEN_ITEMS archived and folded: still-open items (Firebase key rotation, Secure Email Change, leaked-password needs Pro, delete-frees-address decision) added to THE_AUDIT section 11 "Carried from your working list". docs/research/ KEPT with new docs/research/README.md (evidence, not documentation) because code comments and apps/web/scripts/check-deep-links.mjs cite it by path.
- AUTH_EMAILS.md -> docs/email/AUTH_EMAILS.md (scripts/build-auth-emails.mjs x2, lib/email/reachability.test.ts, docs/email/WHAT_SENDS.md updated). WITHDRAWAL_PATH.md -> docs/wallet/ (README.md, docs/README.md links updated).
- Inbound paths: every `docs/<archived>.md` in live files rewritten to `docs/archive/...` (research docs got path-only updates). Migrations and THE_AUDIT findings text untouched. apps/web/scripts/check-deep-links.mjs:148 runtime message now points at docs/archive/BUILD_07_LEDGER.md.
- EVIDENCE: markdown link scan over all tracked .md outside docs/archive: 0 missing targets. Only test reading docs (lib/admin/reads/jobs.test.ts -> docs/ADMIN_CONSOLE.md) unaffected; vitest 242 files / 3859 passed.

### CLEAN-03, proofs and .gitignore
- STATE: AWAITING-REVIEW
- CHANGED: git rm -r docs/design/proofs/session-b (about 1,900 files); .gitignore adds `docs/design/proofs/` with a comment. GLOW_IDENTITY.md notes its proof image is in history at 77cf90ad.
- EVIDENCE: du -sh docs 387M -> 162M (151M = docs/design/references incl. the 4 admin renders now there).
- NOTE: scripts/design/session-b-shots/sweep-settings.mjs reads a REF jpg from the deleted proofs tree; it is a one-off shot script and would need a fresh shot first. docs/design/NAV_STATE.md is generated from proofs/nav/*.json (deleted in the earlier cleanup); left as is (generated file, "do not hand-edit").

### CLEAN-04, process narration in comments
- STATE: AWAITING-REVIEW
- CHANGED: every hit of the A11 grep (264 lines, 176 files) read and rewritten by hand, plus a second pass over "the lead"/"lead ruling R-x"/"scope request" narration (~40 more). Comment-only (plus: one vitest title in lib/admin/reads/badge.test.ts; script path constants covered in CLEAN-01). The R-A..R-G rules the comments cite are now defined in docs/DESIGN_DIRECTION.md section 1.1.
- LEFT ON PURPOSE: service worker / drain worker / vitest worker uses of "worker"; "this session" = browser session (AgentShell, device-identity, settings-store, saved/local); scripts/probes/m5_oversell.sh (two DB sessions); api/assistant, api/support, lib/social/bot-actions.ts untouched; scripts/design/nav-state.mjs code strings; session-b-crops.mjs template-literal text.
- EVIDENCE: tsc 0 errors; lint 0 errors (335 warnings, pre-existing), css tokens clean incl. "0 comment paths that do not resolve"; vitest 242/242 files, 3859 passed, 1 skipped.

### NEW-A6-01, build-session names in admin-facing UI strings (LOW, not fixed)
- apps/web/src/app/admin/listings/MandatesPanel.tsx:51,114, admin/moderation/ModerationDesk.tsx:253, admin/moderation/page.tsx:485 show "Session A has not written (scope request AR-12/AR-10)" / "Session A's ledger records" to operators. eslint-rules/server-actions-export-only-actions.mjs:91,94 lint messages cite "BUILD_06_LEDGER 7.0". Copy change, not comment; left for a copy pass.

### BATCH 1 REVIEW (Agent 3: scratchpad/reviews/a6-batch1-by-a3.md)
- CLEAN-01/02/03 APPROVED. CLEAN-04 CHANGES REQUIRED, done in 1c474874: pointers to where data lives are repointed to docs/archive/ in registration.ts, registration.test.ts, profile.css, profile/page.tsx, push/devices.ts, desk.css, inspection.css, wallet.css, welcome.css, tokens.css (13.0), HomeScreen, MobileTabBar, PaystackCheckout and push/preferences. The two probe .log files are reverted to 77cf90ad. sweep-register usage writes to /tmp and names the archived copy. ICON_SYSTEM.md and design/audits/r1/findings.md note the proofs are in history at 77cf90ad. (ICON_SYSTEM.md in that commit also carries the DOC-11 line, which belongs to batch 2.)
- REVIEW: CLEAN-01..03 APPROVE; CLEAN-04 amended in 1c474874.

#### BATCH 2: documents and the audit record (commit f0993d5e)

### AUDIT-FACTS, THE_AUDIT updated with the post-audit facts
- STATE: AWAITING-REVIEW
- CHANGED: docs/THE_AUDIT.md. Each "could not confirm" or UNVERIFIED about EMAIL_REPLY_TO, SENTRY_DSN, NEXT_PUBLIC_SUPPORT_EMAIL or ANTHROPIC_API_KEY is now a confirmed finding marked "Confirmed after the audit (founder's read of Vercel, 23 September)". Lines touched: section 1 Vercel line, SEC-11 area (EMAIL_REPLY_TO), the unverified list and the founder steps in the A-sections, the STORE-08 nutrition row, the STORE unverified lines, OPS-03 fix step 3, OPS-06 WHY, the dependency table Sentry row, OPS unverified list and founder steps, the section 7-ish "CORRECTLY EMPTY" row (outbox SENT 16:00:05 + PENDING; push_tokens 0), section 8 Vercel line, section 11 item 6, "What worried me" (sessions closed 22:25 UTC), and section 10's opening line. Other agents' findings text was otherwise left alone.
- EVIDENCE: grep for "UNVERIFIED|could not be confirmed" now shows only the Vercel plan and runtime logs as unverified.

### DOC-12 + sign-in ruling, PRODUCT.md
- STATE: AWAITING-REVIEW. Section 4 now carries the 23 Sep ruling, the inverted PUBLIC list in proxy.ts, what the ruling accepts, and the public catalogue flag described generically (Agent 4 builds it; its name and default go into ENVIRONMENT.md when it ships). Section 7: Trips is allowed; banned copy is enforced by the vitest scan; BANNED_SYNONYMS is empty (DOC-08, code half not mine). Section 8: dark only; "fails the build" replaced with lint.
### DEPLOY.md, STATE: AWAITING-REVIEW. Changes: inline iframe replaces hosted redirect; proxy.ts replaces middleware.ts; AMADEUS_* and GOOGLE_PLACES_API_KEY removed from "optional" and added to "removed" (grep: no src reads them); the wrong MapTiler "never read" row dropped; sections renumbered 2.4/2.5/2.6 (ENVIRONMENT.md pointer fixed); vercel.json has 8 jobs; 4.4 now describes the Send Email Hook; section 1 counts refreshed; CI and its two repository Variables documented (from the a3 review); section 7 no longer says lint/test do not run or asks for light shots; section 9 rewritten to today.
### EMAIL_FROM default, the code default is `Vallo <hello@vallospaces.com>` (lib/email/client.ts:25, BRAND_DOMAIN). .env.example now says the same; DEPLOY and ENVIRONMENT already did.
### Env templates, .env.example adds YELLOWCARD_API_BASE/KEY/SECRET, VALLO_INSPECTION_REPORTS and VALLO_PREVIEW_HARNESS, drops the dangling HYBRID_INVENTORY header, and replaces the model-identifier default with a neutral note. apps/web/.env.local.example is DELETED (its two keys, MapTiler and VAPID, are in .env.example with fuller notes); FIRST_NOTIFICATION.md is repointed.
### DOC-16, STATE: FIXED (AWAITING-REVIEW). ENVIRONMENT.md gains rows for every variable read. TEST: apps/web/src/lib/env-documented.test.ts scans apps/web/src for process.env/env./_VAR names and asserts each appears in .env.example and ENVIRONMENT.md, and that .env.local.example stays gone. Against the old files: 3 failed (the 5 missing from the template, 14 missing from ENVIRONMENT.md, and the second template). New files: 4/4 pass.
### DOC-10 / DOC-11 / DOC-14 (doc halves), STATE: FIXED. Changed files: DESIGN_DIRECTION (rule 10 is lint; light-theme closing criterion; "103 objects + light twins"), design-tokens README, ADMIN_CONSOLE:657 (the test still passes), ICON_SYSTEM (no pre-commit scan exists; the eslint rule is the fix, not done: code, LOW), RECOMMENDATIONS T-1 is PARTLY CLOSED, RETENTION_SCHEDULE:19, CATALOGUE header.
### Auth email docs, AUTH_EMAILS.md section 1 and 1A are replaced by the measured truth. auth_logs 23 Sep show run_hook "Hook ran successfully" against /api/auth/email-hook on every sign-up, no mail_from, and the accounts verified. WHAT_SENDS.md verificationCode is LIVE and section 5 is refreshed. reachability.test.ts comment is updated.
- GATES: tsc 0; lint 0 errors / 335 warnings, css clean, valuation clean; vitest 243 files, 3863 passed, 1 skipped; markdown link scan 0 broken outside archive.
- NOT DONE (owned elsewhere or code): DOC-08 BANNED_SYNONYMS guard (content, A5); DOC-17 vitest.config header (tests, A3); README CI paragraph waits for CI green.

### BATCH 2 REVIEW (Agent 3: scratchpad/reviews/a6-batch2-by-a3.md), amended in 12c88b52
- AUDIT-FACTS: now stated as measured at 23:47 UTC: email_outbox has 5 SENT and 0 PENDING; push_tokens has 1 web token, created 23:07:53 and revoked 23:08:21 (a test enrolment). The same numbers are in WHAT_SENDS.md and DEPLOY.md.
- DOC-16 test strengthened. It now scans helper-literal reads (envInt("NAME")), next.config.ts and capacitor.config.ts, and fails on an unexplained process.env[expr]. It requires a NAME= line (a comment mention does not count) and a code-formatted name in ENVIRONMENT.md. It found BOT_INPUT/OUTPUT_KOBO_PER_MTOK, NEXT_DIST_DIR and CAPACITOR_SERVER_URL (2 tests red before the docs were added); all are now documented. 7/7 pass.
- LOW fixes: VAPID_SUBJECT fallback order (SUPPORT_EMAIL first); PRODUCT open list adds start, preview and gallery.
- VALLO_PUBLIC_CATALOGUE (Agent 4) is documented in PRODUCT §4, ENVIRONMENT.md and .env.example. Note: it describes Agent 4's batch 2, which has not been integrated yet.
- PRODUCT Stay row and the BANNED_SYNONYMS sentence are aligned with fix/a3 (to avoid a merge conflict, and true once a3 batch 2 lands).
- Gates: tsc 0; vitest 243 files, 3866 passed, 1 skipped.

#### BATCH 3: the long tail

### SEC-08 + V-19 (the parts assigned to me), commit c71b1878
- STATE: AWAITING-REVIEW (code), FOUNDER (two settings)
- RE-VERIFIED: lib/profile/actions.ts signOut() had no scope (default 'global'); updatePassword only called updateUser; live `auth.sessions` for the QA member: 92 rows with user_agent `node` and 2 with curl. So sign-in from the server action recorded the server's agent, and the proxy's forwarding only covers refreshes.
- CHANGED: lib/supabase/agent.ts (shared forwardedAgentHeaders); lib/supabase/server.ts forwards the request's User-Agent (via headers(), with try/catch outside a request); proxy.ts uses the helper; profile/actions.ts signOut is 'local' and signOutEverywhere is 'global'; auth/actions.ts updatePassword calls signOut({scope:'others'}) after a successful update; lib/security/session-groups.ts folds non-current sessions with no recorded device into one line; the devices page and DeviceList show the folded line and a "Sign out everywhere" control (confirm-then-act; full reload to /sign-in); en.ts gains 5 keys (other locales fall back to English) and the caveat no longer claims a password change "ends every key at once".
- TESTS (each shown failing on the old code first):
  - lib/supabase/server-agent.test.ts drives the real @supabase/ssr client with mocked fetch and asserts the User-Agent reaches GoTrue /token, capped at 512. Old: 2 of 3 fail.
  - lib/profile/sign-out-scope.test.ts. Old: 2 of 3 fail.
  - lib/auth/password-change-ends-others.test.ts asserts signOut({scope:'others'}) after updateUser, none when updateUser fails, and that the change completes if ending others fails. Old: 1 fails.
  - lib/security/session-groups.test.ts (92 node sessions become one line; the current session is always listed).
- GATES: tsc 0; vitest 247 files, 3878 passed, 1 skipped; eslint on touched dirs: no new warning.
- FOUNDER: (1) Supabase → Authentication → Providers → Email → "Secure password change" ON (reauthentication before password change). (2) Supabase → Authentication → Settings → JWT expiry: lower from 3600 to 900 seconds, to shrink the window in which a revoked device's access token still reaches PostgREST.
- NOT DONE (V-19 beyond my brief): the new-device push, "This was not me", and the 24h withdrawal hold. Old sessions keep reading `node` until they expire. New sign-ins record the device only once this is deployed.

### SEC-04 + OPS-13, server-side metadata strip, commit af96550e
- STATE: AWAITING-REVIEW (PARTIAL: the upload-to-attach path is covered; see NOT DONE)
- RE-VERIFIED: PhotoManager uploaded the chosen File raw to the public `accommodation-photos` bucket; addBusinessPhoto, addAccommodationPhoto and the listing addPhoto inserted the row without reading the bytes; nothing server-side stripped EXIF.
- CHOICE: "strip in the attach action" (the stack supports sharp in a Node server action; bundled and traced: `.next/server/app/agent/list/page.js.nft.json` includes node_modules/sharp). The attach action downloads with the service role, detects exif/xmp/iptc through sharp metadata, applies rotate() and re-encodes with no metadata (keepIccProfile) in the same format, then upserts over the object BEFORE the row is inserted. It fails closed: an unreadable or unsupported file (HEIC, GIF, not an image) is removed and the attach is refused.
- CHANGED: lib/images/scrub.ts (new); lib/host/actions.ts (addBusinessPhoto, addAccommodationPhoto); lib/agent/listings-actions.ts (addPhoto, which covers a direct upload that skips the wizard); lib/host/photos.ts (the picker drops HEIC/HEIF so iOS converts to JPEG; adds HOST_PHOTO_BUCKET); photos.test.ts updated to match.
- TESTS: lib/images/scrub.test.ts uses a real JPEG fixture carrying a GPS IFD plus Make/Model (the fixture is asserted to carry them) and checks that after scrub there is no EXIF, no "PhoneMaker" or "Exif" bytes, it is still a JPEG, orientation 6 comes out upright (20x40), a clean PNG is untouched, GIF and junk are refused, and the stored object is overwritten in place or removed. lib/host/photo-scrub-wiring.test.ts checks the scrub runs on "accommodation-photos" before the insert, and that no insert happens when the scrub fails. Old actions.ts: 2/2 fail.
- GATES: tsc 0; vitest 249 files all pass; next build exit 0.
- NOT DONE: (1) An object is publicly readable at its random-UUID URL for the seconds between upload and attach. An upload that is never attached (orphan, or a deliberate direct upload) is never scrubbed. Closing that fully needs uploads to go into a private staging bucket, or a sweep job over public buckets: a new cron plus a handbook row (ADMIN_CONSOLE test) plus vercel.json, i.e. ops scope. Recorded for A3. (2) Private-bucket raw uploads (message attachments, inspection photos, escrow evidence) are readable by the counterparty and still carry EXIF. The same scrubStoredPhoto can be called from those attach actions; not done. (3) Resumable photo upload and the orphan sweep (OPS-13 items 2 and 3) are not done. (4) sharp is imported without a direct dependency entry in apps/web/package.json (it is present through next's optional dependency and the root override). Add `"sharp": "^0.35.4"` to apps/web dependencies once A3's lockfile lands, so the lock changes only once.

### SEC-12 + DB-17, filed KYC documents fixed; admin Storage reads closed, commit f66ae15b + PENDING migration
- STATE: AWAITING-REVIEW (migration NOT applied)
- RE-VERIFIED (live pg_policy): agent_documents_objects_{update,delete}_own and host_documents_objects_{update,delete}_own are folder=uid only; *_objects_admin_select let an admin token read documents directly. ApplyWizard and UploadCard uploaded to a fixed `<uid>/<batch>/<slot>.<ext>` with upsert:true. HostDocumentUploader already used unique paths.
- PENDING MIGRATION: scratchpad/work/fix-a6/sec12_migration.sql. It adds private.kyc_object_is_filed(bucket, name) (security definer, search_path '', EXECUTE revoked from public/anon and granted to authenticated because the policies call it). The four owner UPDATE/DELETE policies gain `and not private.kyc_object_is_filed(bucket_id, name)`, and both *_objects_admin_select policies are dropped.
- COMPATIBILITY WITH MAIN: UPDATE and DELETE are restricted, not dropped. The deployed uploaders' re-choose (upsert over a fixed, not-yet-filed slot) keeps working. Only an object named by an agent_documents or business_documents row becomes fixed. Admin reads on main go only through /api/documents/[id] with the service role (grep: no admin-token storage read of these buckets), so dropping admin_select breaks nothing.
- PROOF (live, rolled back, nothing recorded):
  - Probe on the CURRENT policies: "PROBE_FAIL sec-12: the owner overwrote a filed document (1 rows)".
  - Migration plus probe in one transaction: "PROBE_OK sec-12 ... member_reads_own=3 unfiled_deleted=1". So an unfiled object can be replaced and deleted, a filed one can be neither updated nor deleted (0 rows), the member still reads their own and can insert a new object, and an admin token reads 0 document objects.
- CODE: ApplyWizard and UploadCard use a new path per chosen file (`<slot>-<uuid>.<ext>`) with upsert:false, and best-effort remove the slot's previous unfiled upload so no stray ID copy is left.
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-12.sql.
- NOT DONE: storing a SHA-256 at review (fix step 3). The fixed-object policy makes it unnecessary for integrity against the uploader; the service role could still replace an object.

### OPS-12, subject access: self-serve data export, commit 74396b9d
- STATE: AWAITING-REVIEW (PARTIAL: the retention purge jobs in OPS-12 steps 1 and 2 are not done; they are cron and database work that needs the proof RETENTION_SCHEDULE asks for)
- RE-VERIFIED: no export path existed. Agent 5 removed the placebo "Download my data" (ae1a41f3); this adds a NEW control with NEW keys (settings.dataExport.*).
- CHANGED: lib/account/export.ts (49 owned tables plus wallet_entries and ai_messages through parent ids; read through the member's own session AND .eq(owner column, uid); a per-table failure is recorded as `unavailable`; paged 1000 at a time up to 20k rows; notIncluded lists what is left out). app/api/account/export/route.ts (401 when signed out; consume data_export 3 an hour; no-store; attachment vallo-data-<date>.json; nosniff). Settings → Privacy & Security gains a DataExportCard (RowDownload, a plain anchor so there is no prefetch). route-parents NON_NAVIGABLE entry. en keys. docs/SUBJECT_ACCESS.md runbook, indexed in docs/README.
- EVIDENCE: live, signed in as the QA member through the publishable key: every table readable (none unavailable); profile 1, social_profiles 1, user_roles 1, terms_acceptances 2, agent_applications 1, conversations 1, messages 1, notifications 1, push_tokens 1, the rest 0.
- TESTS: lib/account/export.test.ts (5: owner filter on every table, only own child rows, a refused table still returns the rest, pagination past 1000, notIncluded named) and app/api/account/export/route.test.ts (3: 401, attachment and no-store, 429 with retry-after). Before this change neither file nor the route existed, so no old-code run is possible.
- GATES: tsc 0; vitest 251 files pass (after the route-parents entry).

### BATCH 3a REVIEW (Agent 3: scratchpad/reviews/a6-batch3a-by-a3.md)
- SEC-08/V-19: APPROVED. SEC-12 migration + f66ae15b: APPROVED.
- SEC-12 APPLIED to live as 20260924002425_sec12_db17_a_filed_identity_document_is_fixed (committed f81a23c5, same SQL). The sec-12 probe against live afterwards returns "PROBE_OK sec-12: unfiled uploads replaceable, filed documents fixed, admin storage reads closed", and no migration row was recorded by the probe.
- SEC-04: CHANGES REQUIRED (sharp not a direct dependency). Done: merged repo-clean-work into fix/a6 (dba416e5; one conflict in proxy.ts imports, both sides kept), then fdee18f1 adds "sharp": "^0.35.4" to apps/web/package.json. The lock diff is the one dependency line plus sharp's packages losing their dev flags. `npm ci` in a clean export: added 767 packages; sharp resolves from apps/web; next build exit 0 and traces node_modules/sharp.
- PENDING PROOF: once the release branch deploys a Vercel preview, attach one photograph there (host PhotoManager) and confirm the stored object has no EXIF. I could not find a preview URL: the Vercel connection does not see this project.
- NOTE after the merge: vitest 288 files, 1 failure, in `components/app/listing/example-notice.test.ts` ("isDemo && <ExampleNotice" regex against `isDemo && (\n <ExampleNotice`). It fails on repo-clean-work itself as integrated (identical listing page text), so it is not caused by fix/a6. Flagged to the orchestrator.

### THE_HUNDRED handed UI items, commit 095eebdb
- Stay sticky price not following the URL dates: FIXED. Live walk as the QA member at 390 on /stay/ed…03?checkIn=2026-10-10&checkOut=2026-10-15 showed "₦170,000 Total for 2 nights" (the weekend default). Cause: /stay handed only `params` to the listing page, and StayDatesProvider always opened on the next weekend. Fix: searchParams are passed through; the listing page reads them with readStayDates; initialStayDates (stay-dates-pick.ts, pure) uses usable requested dates and otherwise falls back to the weekend. Test: stay-dates-initial.test.ts (3).
- UI-06 amenity/spec chips breaking mid-word: FIXED. The live screenshot shows "Parkin g" and "Backu p power". Fix: the fit row wraps (a tile is at least a third of the row), overflow-wrap normal, hyphens auto. Test: spec-tiles-wrap.test.ts renders the real catalogue.css rules in Chromium at 342px and checks that no word spans two lines. Old CSS: fails (3 words split).
- Pinned bar over the tab strip: FIXED. Live: the bar (y 725-844) sits over nf-detail-tabs (y 735-780); the hit test says the bar is on top, but its fill is rgba(255,255,255,0.11) relying on a 40px backdrop blur, so the tab text read through in the walk's renderer. Fix: `.nf-glass.nf-action-bar-pinned` puts the same tint over the canvas colour. Test: action-bar-opaque.test.ts (computed background is opaque rgb; old: rgba(...,0.11)).
- Wallet odometer reading 0-9: ALREADY-FIXED. Live ariaSnapshot of /wallet and /wallet/send as the QA member reads the balance as "₦ 0 .00" and "₦0.00". The digit strips are aria-hidden in both Odometer.tsx and RollingAmount.tsx.
- Devices copy nit (Agent 4 via the orchestrator): the buttons now say "Sign out everywhere else" ("You stay signed in on this device") and "Sign out everywhere, this device included".
- NEW-A6-02 (LOW, content, not mine): /wallet/send shows "Refunds reach your wallet in 3 to 5 business days". The founder settled it as minutes, up to one working day (archived FOUNDER_OPEN_ITEMS).

### BATCH 3b REVIEW (Agent 3: scratchpad/reviews/a6-batch3b-by-a3.md), fixes in commit 8f95218d
- 095eebdb APPROVED. LOW taken: spec tiles now `overflow-wrap: break-word` (spec-tiles-wrap test still passes).
- OPS-12 CHANGE 1 (staff identities): every exported row loses STAFF_KEYS (reviewer_id, reviewed_by, resolved_by, decided_by, hidden_by, verified_by, supply_verified_by, granted_by, revoked_by, admitted_by, suspended_by, lifted_by). DECISION on review_notes: EXPORTED. It is not an internal note: the app already shows it to the applicant (application-status.ts), the lister (listings-queries.ts reviewNotes) and the host (host/queries.ts). decision_note and resolution_note are kept for the same reason. PARTY_KEYS (created_by, uploaded_by, opened_by, disputed_by, release_requested_by) are kept on purpose. Test: no exported row carries a staff key; and every `*_by`/reviewer_id column of every exported table in database.types.ts must be classified as staff or party (fails on a new column).
- OPS-12 CHANGE 2 (completeness): added transactions (via bookings), escrows_as_payer/escrows_as_payee, booking_state_events (actor), business_transfers offered/received, conversations_as_host (conversations.agent_id is the auth user id, FK to auth.users), areas created, events hosted, listings (via own agents) + listing_photos, accommodations + accommodation_photos + business_documents + business_photos (via own businesses). price_check_shares has no SELECT grant for authenticated (live 42501), so it is in notIncluded. notIncluded also names received messages and support replies, staff identities, firm listings and venue configuration (room types, rates, hours).
- Decisions recorded in SUBJECT_ACCESS.md: bookings.guest_* returned to the member who supplied them; the limiter failing open is a decision.
- Reads run 8 at a time (Promise.all groups).
- EVIDENCE: live run as the QA member through the publishable key, new builder: every table readable, none unavailable (after moving price_check_shares out).
- GATES: tsc 0; eslint clean; vitest 288 files, 1 failure = the known example-notice.test.ts on the release branch.

### SEC-P2-02, any member could open a thread with any user id, code d71ce389; migration AWAITING-REVIEW
- RE-VERIFIED live: conversations_insert checks only party membership; conversation_context_is_valid validates only reservation and booking contexts. Probe on live: control insert OK, then "PROBE_FAIL sec-p2-02: a thread with an arbitrary user and no listing was created".
- FIX (draft scratchpad/reviews/a6-secp202-migration-DRAFT.sql): the context trigger, for context 'listing' when auth.uid() is set (member tokens only; service role, postgres, the escrow probes and reservation/booking threads unchanged; INSERT only, existing rows untouched): listing_id not null; guest_id = caller; guest <> agent; the listing is PUBLISHED and agent_id = its lister's user id; at most 20 listing threads per guest in 24 h (same number as the app's limiter, which fails open), counted under a per-guest advisory xact lock, refused with 54000. All 8 live threads satisfy the rule (all listing context, all on published listings whose lister is the agent).
- NOT DONE (on purpose): moving thread creation to an RPC and revoking INSERT (fix step 2): the trigger gives the same guarantees without changing the deployed write path. Per-sender message rate limit (step 3) belongs with SEC-09.
- PROOF (live, rolled back, no migration row): migration + probe → "PROBE_OK sec-p2-02: ... (limit tested: t)".
- APP: startConversation maps 54000 to the daily-limit message. Test lib/messages/start-conversation-limit.test.ts (fails on the old code: 1 of 2).

### Lint fix requested by the orchestrator, commit 5acdaf3b
- 5 ESLint errors on the integrated branch came from my commits (an unknown-rule disable in DeviceList; nf/no-raw-colour in two test fixtures). Fixed; my earlier lint had run on a stale tree. After `npm ci` in the worktree: lint 0 errors / 333 warnings, css and valuation checks clean, tsc 0.

### SEC-03, unauthenticated email relay via the support acknowledgement, commit b2c4e5b5
- STATE: AWAITING-REVIEW (PARTIAL)
- RE-VERIFIED: fileSupportTicket (exported "use server") mails supportTicketFiled to the typed address, echoing name, topic and up to 300 chars of body; the newsletter door calls it with a fixed body.
- FIX: signed-out → the email carries the reference only (no name, topic or body). Per-recipient cap: bucket support_ack_recipient, subjectForEmail, 3 per 24 h, for everyone; over the cap the ticket files and no email is sent. Signed-in members still get their own question echoed.
- TEST: lib/support/ack-relay.test.ts (3). On the old code 2 of 3 fail (the echo, the cap).
- NOT DONE: newsletter double opt-in (step 3: needs a confirm-link flow and a store; the newsletter mail is now a fixed reference-only message under the same 3/day cap); Turnstile (step 5). The limiter still fails open (consume degraded), as decided platform-wide.
- REVIEW (Agent 3, scratchpad/reviews/a6-batch3c-by-a3.md): APPROVED. The probe change was taken: refusals 1-3 assert 23514, and the daily-limit step fails loudly if it has no fixture.
- APPLIED live as 20260924010154_sec_p2_02_a_listing_thread_is_opened_by_its_guest_with_its_lister (committed 889e2e35, the reviewed SQL byte for byte). The probe on live afterwards gives "PROBE_OK sec-p2-02 ... (23514) ... (54000)", and no migration row was recorded by the probe.
- STATE: FIXED.
- FOUNDER NOTE (product, not a defect): threads can still be opened on EXAMPLE (is_demo) listings at the DB level. The example detail page no longer offers messaging.
- REVIEW (Agent 3, a6-batch3d-by-a3.md): 2 narrowings done in 22e883a4. (1) The acknowledgement is sent only when the limiter answered allowed && !degraded; the ticket still files. (2) The count is keyed by mailboxKey (lib/security/mailbox.ts, mirroring private.canonical_email_parts: Gmail dots, +tags, googlemail→gmail; +tags dropped on other domains too). It is used for counting only; delivery goes to the typed address. Tests: ack-relay (5; the 2 new ones fail on b2c4e5b5) and mailbox.test (3). STATE: FIXED (PARTIAL: newsletter double opt-in and Turnstile not done).

### SEC-07, auth cookie not Secure, 400 days, commit be7e54de
- STATE: AWAITING-REVIEW (PARTIAL: HttpOnly is a separate project, as pass two says; apex HSTS is a Vercel domain setting)
- RE-VERIFIED: @supabase/ssr 0.12.3 DEFAULT_COOKIE_OPTIONS has maxAge 400 days and no secure. cookies.js re-applies `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` AFTER merging cookieOptions, so the audit's fix step 1 (pass cookieOptions) would NOT have shortened the lifetime. Apex: `curl -I https://vallospaces.com/` gives 308 with `strict-transport-security: max-age=63072000` and nothing more (www carries includeSubDomains; preload from next.config).
- FIX: lib/supabase/cookie-policy.ts withAuthCookiePolicy(options, secure): path /, SameSite lax, Secure, maxAge capped at 30 days (a removal stays 0). Applied in server.ts setAll, proxy.ts setAll, and the browser client through browserCookieMethods() (a document.cookie adapter using @supabase/ssr's parseCookieHeader/serializeCookieHeader). Secure = NODE_ENV production on the server, and location https in the browser.
- EVIDENCE: a local production build (`next build` exit 0) with `next start`, and a Chromium sign-in as the QA member: both sb-…-auth-token chunks are s:true, SameSite Lax, 30 days, after sign-in and after a navigation (before, per the audit: s:false, expiring 2027-10-28). The test session was then ended with logout scope=local (204).
- TESTS: lib/supabase/cookie-policy.test.ts (5). The wiring test fails on the old code (1 of 5).
- FOUNDER/OPS: the apex redirect's HSTS header is set by Vercel's domain redirect, not by the app. Adding includeSubDomains; preload there, and the hstspreload.org submission, are dashboard steps.
- GATES: tsc 0; eslint clean on the touched files; vitest 292 files, 1 failure = the known example-notice.

### SEC-07 REVIEW: APPROVED (a6-batch3e-by-a3.md). LOWs are taken in the next commit (Secure decided from the request protocol; chunking test; ITP note).

### SEC-14, sign-up metadata, editable consent record, staff-looking names, probe 82661252; migration AWAITING-REVIEW
- RE-VERIFIED live (probe before, rolled back): a hand-built auth.users insert with metadata display_name/nickname "Vallo Support" and terms_version "made-up" gives a profile named "Vallo Support" with terms "made-up" and terms_accepted_at now(). As the member, `update profiles set terms_version=…, terms_accepted_at=now()` is accepted. All 19 profile columns are UPDATE-able by authenticated.
- WHO READS profiles.terms_*: nobody (grep of app, scripts and functions finds only handle_new_user). The real receipt is public.terms_acceptances, written only by the server (service role) after the form's version matched TERMS_VERSION (lib/legal/acceptance.ts).
- FIX (draft scratchpad/reviews/a6-sec14-migration-DRAFT.sql): a guard trigger profiles_zzz_guard_record (the last BEFORE trigger, so after sync_display_name and the content scanner) plus private.name_claims_to_be_vallo:
  - INSERT: terms_* forced to null (no claim from metadata). A name that speaks for Vallo becomes display_name 'Member' and nickname null, as the content scanner does.
  - UPDATE by a member (content_writer_is_member; admins and the service role are exempt, per SEC-P2-03): id, created_at, terms_accepted_at, terms_version and welcomed_at are refused with 42501. A changed name that speaks for Vallo is refused with RM004 (the profile form already shows RM004's message).
  - The rule: "vallo" anywhere once non-letters are stripped, or \m(support|admin|administrator|official|staff|moderator)\M.
  - No column revokes, so nothing admin-side breaks. Existing rows are untouched (live: only the platform example "Vallo Examples" matches, and it is not a member write).
- NOT DONE: a terms_versions table (step 3). It is not needed once the profile takes no terms claim at all. signup_role stays member-editable: it is a declaration, not a permission. Phone verification belongs to SEC-15.
- PROOF (live, rolled back, no migration row): migration + probe gives "PROBE_OK sec-14: …".

### Merge of the release branch, 25bf1375 (no lockfile change). NOTE: this merge commit and dba416e5 carry git's default message, without the required trailers. They are left as they are, because amending would rewrite history. Future merges use -m with the trailers.

### SEC-07 LOWs, commit 47c0ec51
- Secure is now decided from the request: serverCookiesSecure(request.nextUrl.protocol) in the proxy, and x-forwarded-proto through headers() in server.ts. NODE_ENV production is only the fallback when the request says nothing.
- New test: @supabase/ssr 0.12.3's own createStorageFromOptions driven through browserCookieMethods over a browser-like jar. A 6 KB session writes .0/.1/.2, all Secure and 30 d; a small rewrite leaves no stale chunk; removeItem empties the jar.
- ITP note in cookie-policy.ts: Safari/WKWebView may cap a script-written cookie at 7 days; the next server rotation restores 30.
- Tests 7/7. The protocol test fails on be7e54de (serverCookiesSecure took no argument).

### UI-02, Profile → Reviews went to a 404, commit 0aa412bc
- STATE: FIXED (hidden; building a reviews list is its own piece of work)
- RE-VERIFIED: AccountBody.tsx:300 had href="/reviews", and no route serves it.
- FIX: the row is removed. The unused counts destructure and formatCount went with it; the type is kept because the page still passes counts.
- TEST: app/static-hrefs.test.ts checks every literal href="/..." in a .tsx against the routes under src/app (groups ignored, dynamic segments wildcarded) plus the literal redirect sources in next.config.ts. On the old tree it reports only "AccountBody.tsx: /reviews".

### UI-05, home hero search wider than its plate, ALREADY-FIXED
- Live on production at 390, signed in as the QA member (session ended afterwards with logout scope=local): form l41 r351 w310; body l25 r365; plate l24 r366 overflow hidden; the Filters control is l304 r348, fully inside the plate. The audit measured the form at w334 with Filters at r372. Nothing to change.
- REVIEW 1 (a6-batch3f-by-a3.md): CHANGES REQUIRED, because the matcher over-caught real names. Amended draft (same path):
  - Each field is judged alone. It is split into words, and runs of single letters are joined.
  - Refused words: admin, administrator or moderator as a word; vallo[digits]; vallo run into support/team/official/staff/admin/hq/ng/care/help/app.
  - On UPDATE only changed fields are judged.
  - At sign-up the matching first_name/surname are nulled and the nickname is dropped.
  - The handle 'member' is reserved.
- Re-proved on live (rolled back; afterwards no function, no reserved row, no test user, no migration row): PROBE_OK. The probe (commit 619244fa) covers these controls: Eva Lloyd, Marco Cavallo, Tunde Official, Ada Staff; an edit beside a pre-existing "Admin" surname; admin naming. It covers these refusals: V.a.l.l.o, ValloSupport, vallo_hq, Moderator, Vallo Support, and the spaced-out form.
- AWAITING Agent 3's re-check. Apply only after it.

### UX-12, phone field truncates pasted numbers, commit d6576bc7
- STATE: FIXED
- RE-VERIFIED: PhoneField.tsx had maxLength={12}. In Chromium, insertText into a maxlength=12 tel input clips "+234 803 123 4567" to "+234 803 123".
- FIX: maxLength removed; maskNational trims to the 10 national digits.
- TEST: components/app/phone-field-paste.test.ts (Chromium, 4 forms, using the maxLength parsed from PhoneField.tsx). On the old source 3 of 4 fail, exactly the audit's three; "08031234567" passes on both.

### UX-14, refused sign-up clears the terms tick and hear-about, commit e8753626
- STATE: AWAITING-REVIEW (PARTIAL: validation on blur is not done)
- RE-VERIFIED from code: the form submits through `<form action={formAction}>`, which React follows with a form reset even after a refusal. Text fields are controlled and survive. The hearAbout <select> is uncontrolled (defaultValue ""), and the terms checkbox loses its DOM state, which matches pass one's "hearAbout= … acceptTerms=false".
- FIX: onSubmit always calls preventDefault. It keeps the unticked-terms refusal, then dispatches `startTransition(() => formAction(new FormData(form)))`. A manual dispatch is not followed by a reset. `action` stays for a submit made before hydration. This covers sign-in too: same form, same action, and redirects from a dispatched server action are handled by the router.
- TEST: components/auth/email-form-no-reset.test.ts (source shape; 2 of 2 fail on the old code).
- NOT DONE: a live browser walk. The production build passed (next build exit 0), but restarting the local server for the walk was refused by the environment's permission check, so the refusal path was not driven in Chromium. A browser check on the Vercel preview is still owed: refused referral "!!" → hear-about and tick still set; and one sign-in.

### UX-02, sign-up drops `next`: commit 5d1039ef
- STATE: AWAITING-REVIEW
- RE-VERIFIED from code:
  - AuthChoices and EmailAuthForm swap links were bare /sign-in and /sign-up.
  - FirstRun honoured next only when it started with /sign-up.
  - signUpWithEmail and resendSignUpCode hard-coded emailRedirectTo …next=/home.
  - The resend form did not carry next.
- FIX:
  - New lib/auth/next-link.ts. withNext(path, next) carries next through safeReturnPath, and an unsafe value is dropped. destinationOf() takes the inner next out of /sign-in?next=… or /sign-up?next=….
  - Wired into both swap links, the "other ways" back link, the intro link (/welcome?next=/sign-up?next=…), FirstRun's Create account (sign-in door unchanged), both emailRedirectTo (landingAfterAuth), and the resend form's hidden next.
- TEST: lib/auth/next-link.test.ts (3). The wiring test fails on the old actions.ts.
- RISK TO CHECK: if the Supabase redirect allow-list holds only an exact callback URL, a callback URL with another next falls back to the Site URL. The allow-list is not readable with this role. The OTP code path, which is the primary one, is unaffected.

### OPS-18, no server-side timeout on the Anthropic calls, commit 749b08c3
- STATE: AWAITING-REVIEW
- RE-VERIFIED: api/assistant/route.ts and api/support/route.ts pass req.signal only; neither exports maxDuration.
- FIX: lib/ai/upstream-deadline.ts. requestSignal(req.signal) adds a 50 s total per request, across tool rounds. roundWatchdog(signal) cuts a round after 15 s without an SSE event; it is touched per event and cleared in finally. Both routes export maxDuration = 60. On a cut, the existing catch emits UPSTREAM_MESSAGE, because req.signal is not aborted.
- TEST: lib/ai/upstream-deadline.test.ts. A real local HTTP server sends one event and stalls: the idle cut and the total cut both stop the read in under 2 s, and a client abort still ends it. A wiring check covers both routes. Before this change the module did not exist.

### OPS-15, one Next chunk script without a nonce, INVESTIGATED, NOT FIXED
- Still live: `curl /about` gives 18 src scripts, and only `/_next/static/chunks/11-….js` has no nonce.
- Next 16.3.6 app-render takes the nonce from the REQUEST's content-security-policy header (app-render.js:209). The proxy forwards only x-nonce on the request, and sets the CSP on the response. The nonce'd Next scripts show the render does get a nonce somewhere, so the one bare chunk is probably a Float preinit from a client boundary.
- Proving the fix needs a production server to render the page. Running a local `next start` is refused in this environment, so it was left for a session that can serve the build. A possible first step: also set `content-security-policy` on the forwarded request headers in proxy.ts, then diff the HTML.

### SEC-18, /verification submit is a stub, NOT DONE (needs a product decision and a schema)
- Confirmed: submitVerification always refuses. Wiring it needs the identity table and bucket the stub's comment names, which do not exist. Hiding it means rerouting KycBanner, VerifyPrompt and KYC_RESUBMIT_HREF to the working supply flow, which is a product call on the supply journey (A1's domain). Left for the founder or A1.

### DOC-15, archived ledgers claim gates that did not run, commit 39860e40
- STATE: FIXED
- Bracketed corrections, worded as pass two amended them, added to docs/archive/BUILD_06_LEDGER.md:528 and SESSIONS_CLOSE_OUT.md:217; BUILT_VS_PROVEN.md:996 points to 6e0ee6d. No test: prose in archived documents.

### DOC-21, keyboard and semantics defects, commit a774121d
- STATE: AWAITING-REVIEW
- RE-VERIFIED live with axe-core at 390 as the QA member (session ended afterwards with logout scope=local):
  - /stays: scrollable-region-focusable (6 × .nf-stay-card__chips)
  - /stay/ea…0003: scrollable-region-focusable (2: the gallery track, .nf-detail-capsules)
  - /stay/ed…003a: definition-list (1) and dlitem (6)
  - /wallet: page-has-heading-one
  - ALREADY GONE: / aria-hidden-focus; /wallet landmark-unique.
- FIX:
  - The gallery track gets tabIndex 0, role group and aria-label.
  - The capsules ul gets tabIndex 0.
  - The stay-card chips get overflow hidden. They sit inside a single card link, so a focusable scroller there would be nested interactive content.
  - The ListingUtilities Row is a flow-root div holding only dt and dd; the icon floats inside dt and dd is a BFC beside it.
  - /wallet gets an sr-only h1 from t.nav.wallet.
- TEST: components/app/listing/a11y-structure.test.ts. Source checks cover each fix, and a Chromium axe run over the old and new row markup gives definition-list for the old and none for the new.
- STILL OWED: an axe re-run on the deployed build once this is integrated. The float layout of the utilities row has not been seen in a real render, because a local server is refused here.

### UX-20 (partial) + UX-16 (link part), inspection sheet, commit fc61dd84
- STATE: AWAITING-REVIEW (PARTIAL)
- RE-VERIFIED from code:
  - datetime-local had no min.
  - The client sent new Date(local) in the DEVICE's zone.
  - The server accepted any future time.
  - The placeholder said "Coming from Yaba…".
  - TRACK_IT said "It is on your bookings screen." although inspections live at /inspections.
- FIX:
  - New lib/inspections/when.ts: lagosWallClockToIso reads the pick as +01:00; earliestLagosInput gives the picker's min, now+2h on the Lagos clock; farEnoughAhead is the server refine, now+2h, which also applies to a lister's counter-offer.
  - Label "(Lagos time)", step 15 min, neutral placeholder.
  - TRACK_IT is now a Link to /inspections, "Follow it on Inspections."
- TEST: lib/inspections/when.test.ts (4).
- NOT DONE: moving the sheet's strings into the dictionary in 4 locales (the DOC-22 family, a translation job); day chips and Morning/Afternoon/Evening slots; a limit on sensible hours. UX-16's hub (one Bookings hub with segments) is a 1-day IA change, not done.

### UX-07, Rent returns stays, hotels and a restaurant; chip says "Any market", commit f3815da1
- STATE: AWAITING-REVIEW
- RE-VERIFIED from code: the rent filter checked only listing_intent, and nightly and per-head rows carry intent rent. ShelfBar's marketLabel had no rent case.
- FIX:
  - ListingFacts gains pricePeriod, carried by factsOf.
  - matchesFacts with intent rent refuses pricePeriod night or guest, and kinds hotel, shortlet, restaurant, experience.
  - supabase-repository adds or(rate_minor.is.null,rate_minor.lte.0) for rent, matching headlinePrice, which reads the rate first.
  - ShelfBar reads copy.marketRent or copy.marketBuy (new en keys; other locales fall back). Sale still takes precedence over kind, as before.
- TEST: lib/listings/rent-market.test.ts (4). The exclusions fail on the old matchesFacts.
- NOT CHANGED: the map-bounds RPC (bounds.ts, p_intent) still counts by intent only. That is a DB function, left alone.

### UI-09 (partial), touch targets, commit 717a6195
- STATE: AWAITING-REVIEW (PARTIAL)
- RE-VERIFIED live at 390, hit-testing 4 points 21px from centre, as the QA member (session ended afterwards):
  - .nf-pcard__heart 36×36 gives 4/4: ALREADY-FIXED (a ::after 44px area was added).
  - .nf-switch 52×32 gives 4/4: ALREADY-FIXED.
  - .nf-app-header__avatar 40×40 gives 0/4: confirmed.
  - .nf-site-footer-link is 40px tall: confirmed by CSS. The live footer hit-test read 0/4 on everything, including 44px controls, so something overlays the page bottom at 390 and the measure is unreliable there.
- FIX: the avatar loses overflow:hidden and the img takes border-radius:inherit. The footer link min-height goes from 2.5rem to 2.75rem.
- TEST: components/app/touch-targets.test.ts (Chromium, real rules from base.css, chrome.css, site.css). Both tests fail on the old CSS.
- NOT DONE: welcome dots, inline text links used as controls, the newsletter input, and the admin controls. The input and the Subscribe button measure 44 tall now.
- REVIEW 2 (re-check): CHANGES REQUIRED (small). Homoglyphs "Vаllo", "Ваllo", "Ｖａｌｌｏ", "Vall0" and "Va11o" all passed. Done:
  - The value is NFKC-normalised first.
  - Cyrillic and Greek look-alikes are translated to Latin (51 letters).
  - 0→o and 1→l apply to the vallo check only.
  - All five cases were added to the probe's refusals, and "Vallory" was added as a first-name control.
  - Re-proved rolled back: PROBE_OK.
- APPLIED live as 20260924015348_sec_14_the_consent_record_is_fixed_and_no_name_speaks_for_vallo (committed b172a8b9, byte for byte the file applied). The probe on live afterwards gives PROBE_OK, with no migration row from the probe.
- NOTE: db06_write_grants_match_what_a_policy_allows (another agent) was applied 5 s earlier. The probe passes on top of it.
- STATE: FIXED.

### Review round (Agent 3 and Agent 5 on my queue), and the follow-ups
- APPROVED by Agent 3: 47c0ec51, 0aa412bc, 749b08c3, 39860e40. APPROVED by Agent 5: UX-14 e8753626 (proved by Agent 5 in Chromium with an esbuild bundle), UX-02 5d1039ef, UX-07 f3815da1, UI-09 717a6195.
- LOWs taken in f70de713:
  - static-hrefs now also reads `href: "…"`, router.push/replace and redirect/permanentRedirect in .ts and .tsx, and asserts each shape is still found (>50 / >10 / >10). No dead destinations.
  - The OPS-18 elapsed bounds were raised to 20 s. The cut is 80 or 100 ms, and a missing cut still fails by the test timeout.
- DOC-21: my a774121d was REVERTED in 2ec19850, a normal revert commit. Its message lacks the trailers because `git revert --no-edit` wrote git's default message, and I did not amend (no history rewrite). Agent 3's c90286c6 supersedes it. I reviewed that commit: scratchpad/reviews/a3-batch4-by-a6.md, APPROVE with 3 LOWs (WebKit risk of dt display:contents; nested region landmark; instructions inside the gallery's accessible name). The dom project gave 11/11 and the unit project 4225 in a scratch worktree, and the fix bites on revert.
- UX-12 REQUIRED-LOW, 8f769f8f: one withoutTrunkPrefix helper for mask, reader and normaliser. "+234 (0) 803…", "+2340803…" and "2340 803…" now read as 803 123 4567. The 3 unit cases plus 2 Chromium cases fail on the old phone.ts.
- fc61dd84 CHANGES REQUIRED (Agent 5), fixed in 94788792:
  - The three counter-offer pickers (InspectionSheet:700, InspectionRows:447, RentalFace:344) use lagosWallClockToIso, min=earliestLagosInput(), step 900 and the "(Lagos time)" label.
  - The server's whenSchema transforms a zone-less value as Lagos time.
  - answerInspection refuses CONFIRMED when the slot has passed.
  - Tests: when-actions.test.ts (3; all fail on the old actions.ts) and when.test.ts, which now pins all three pickers.
  - NOT DONE: the DB-side 2 h check on inspection_requests (optional in the review). The server action holds the rule, and a direct PostgREST insert can still write a past time. It needs a guarded trigger and a review.
  - SENT BACK to Agent 5 for re-review.
- FOUNDER NOTE (UX-02): confirm that the Supabase Auth redirect allow-list matches /auth/callback** with query strings; otherwise the email link falls back to the Site URL.
- MERGED the release branch at 19ce9c36 (389340f1), with a message carrying the trailers. It takes the release side's claims check, the export staff-identities wording, chapters.tsx and standards. No lockfile change.
- Gates after the merge: lint 0 errors / 333 warnings plus the claims check (37 tests); tsc 0; vitest 312 files, 4390 passed, 1 skipped.

### SEC-09, writes that skip the actions' rate limits, probe 18935512; migration AWAITING-REVIEW
- RE-VERIFIED live, before the change, rolled back: as the member, 61 messages inserted straight into a conversation in one burst; the 61st was accepted.
- FIX (draft scratchpad/reviews/a6-sec09-migration-DRAFT.sql):
  - private.limit_member_inserts(short_limit, short_window, day_limit) is a BEFORE INSERT trigger. It counts only member tokens (content_writer_is_member) through private.consume_rate_limit, in two fixed windows, and refuses with 54000.
  - Limits, each above the app's own limits and honest heavy use: messages 60/10 min and 1000/day; posts 60/10 min and 500/day; story_comments 60/10 min and 500/day; reports 30/h and 100/day; reviews 20/h and 50/day; listings 30/h and 100/day. Conversations already carry their daily limit (SEC-P2-02).
  - A refused insert rolls its counter back with the statement.
- PROOF (live, rolled back, no migration row): PROBE_OK. 60 messages land and the 61st gives 54000; 30 reports land and the 31st gives 54000; a service-role insert after the limit lands.
- ALREADY-FIXED: fix step 2. signInWithEmail already has a per-address ceiling (sign_in_address, 60/h, with an alert).
- NOT MINE: step 3, Supabase Auth rate limits and CAPTCHA, is a founder dashboard setting. Step 4, money limits failing closed, belongs to A2.
- Agent 5 APPROVED 94788792 and 8f769f8f. Its two LOWs are in ea05a248: earliestLagosInput rounds UP to the next quarter hour (tests: 22:10Z→01:15, 22:00Z→01:00, 12:37:10Z→15:45), and suppressHydrationWarning is set on the four pickers' inputs.

### SEC-17, small oracles and gaps, commit 745c5a7d; item 1 migration AWAITING-REVIEW
- Item 3: cancel lets a host cancel through the guest's path. FIXED. The read gains .eq("guest_id", session.user.id). Test lib/bookings/cancel-guest-only.test.ts, where RLS shows the booking to guest and host: on the old code the host's cancel reaches the service-role update.
- Item 4: /api/client-error flood. FIXED. It now consumes client_error at 30 per IP per 10 min after the per-message quiet window, and still answers 204. Test route.test.ts: 50 varied messages give 30 reports (the old code gives 50).
- Item 5: X-Powered-By. FIXED with poweredByHeader: false; the test reads next.config.ts. Live still sends the header until this deploys.
- Item 1, verification_is_required. Re-verified: EXECUTE is granted to authenticated, and a member got an answer about the example account. No policy, view or other function references it (live catalogue). Draft scratchpad/reviews/a6-sec17-migration-DRAFT.sql revokes it from authenticated. Proof, rolled back: PROBE_OK. The member gets 42501; the service role still answers; agent_trust for another account still answers.
  - agent_trust is KEPT on purpose: the public profile page reads it for other people (lib/social/profile-extras.ts), because those are the trust signals it shows. The audit's "return null unless caller" would blank every agent's profile stats.
  - The pending file supabase/migrations/pending/20260918150300_b5_verification_is_required_is_not_a_client_call.sql does the same revoke. Once mine is applied it is superseded.
- Item 2, signUpMethodForEmail as an email oracle: NOT DONE. The sign-in screen uses the answer to tell a Google-account holder to use Google (accountMethod notice). Returning "unknown" without a pending cookie removes that help. That is a product trade-off for the founder; the endpoint is already capped at 60/h per IP.
- REVIEW (Agent 5, scratchpad/reviews/a6-sec09-by-a5.md): APPROVED. Its advisory is taken before applying: a fault in consume_rate_limit lets the write through (inner begin/exception), and only an answered over-limit raises 54000.
- APPLIED live as 20260924022108_sec_09_a_member_is_rate_limited_where_the_write_happens (committed 48ca92ac, byte for byte what was applied). The probe on live afterwards gives PROBE_OK, with no probe migration row.
- REQUIRED-LOW done in 4c0fb59d: lib/security/db-limit.ts dbLimitRefusal. It is wired into message send and photo send, messageForPostError (post and reply), both post/profile report paths, messageForStoryError (story comment), reports/actions, reviews/actions and the agent listing create. Test db-limit.test.ts checks the reader, that the migration raises the same sentence, and the wiring.
- STATE: FIXED.

### SEC-16, public buckets accept unlinked uploads, NOT DONE (recorded)
- Confirmed from policies: authenticated users can insert into their own folder in listing-photos, accommodation-photos, avatars and social-covers.
- The fix is a nightly delete of public objects that no row references. A correct sweep needs every reference in the product mapped: listing_photos, accommodation_photos, business_photos, listing_videos posters, profiles.avatar_url, social_profiles cover and avatar, post media payloads, story media. It also has to delete through the Storage API, because deleting a storage.objects row leaves the bytes. A wrong map deletes people's photographs. Pass two rates this LOW and says the SEC-04 flow closes it. Left for a session that can map the references and run the sweep in report-only mode first.

### SEC-15, no recovery path for a lost mailbox, NOT DONE (founder decision)
- Confirmed as described. The fix is a staff-only, identity-verified email move, TOTP MFA and phone OTP, and it depends on the founder deciding whether "email never changes" stays absolute. The audit says so. Nothing to change in code until that ruling.

### DOC-22, hardcoded English and hand-rolled plurals, NOT DONE (sized, not started)
- Confirmed: ListingAmenities uses `${n} ${n === 1 ? "bedroom" : "bedrooms"}`. ListingUtilities is entirely module-level English, with a sentence built from fragments. CheckoutSummary "Total to pay", FundingVerifier, WalletDeck, VerifyCodeForm, Verifying and (auth)/error all carry literals.
- Moving the example lines alone would be tokenism. Every one of those surfaces has many more literals, and the listing components overlap Agent 3's DOC-21 (c90286c6) and Agent 5's UI scope. It is a 1 to 2 day translation-layer job: surface keys in en.ts; plural() forms for bedroom, bathroom, toilet, hour, member, comment, reply; whole-sentence templates. Step 4 (react/jsx-no-literals) cannot go in at warn, because lint is capped at --max-warnings=333.

#### WHERE I STOPPED (A6, final)
- Branch fix/a6. Everything is committed. The last commit before the ledger close is 4c0fb59d; see git log.
- APPLIED LIVE by me this batch: 20260924002425 (SEC-12), 20260924010154 (SEC-P2-02), 20260924015348 (SEC-14), 20260924022108 (SEC-09). Each probe returns PROBE_OK on live.
- SEC-17 item 1 migration WITHDRAWN at Agent 1's request. Its DB-18 draft (scratchpad/work/fix-a1/db18_db19_migration.sql, awaiting Agent 2's review) revokes the same grant and has its own probe. My supabase/tests/probes/sec-17.sql stays as a second check, and it returns PROBE_OK once DB-18 is live.
- OWED, needs an environment I do not have here:
  - SEC-04: on a Vercel preview, attach one photo and confirm the stored object has no EXIF.
  - DOC-21 / Agent 3: re-run axe on the deploy.
  - OPS-15: local server refused; now Agent 4's.
  - UX-02 founder note: confirm the redirect allow-list matches /auth/callback** with query strings.
- NOT DONE, with reasons above: SEC-15 (founder), SEC-16 (destructive sweep, needs a reference map), SEC-17 item 2 (founder trade-off), SEC-18 (schema or product), DOC-22 (translation job), UX-16 hub, UX-20 dictionary strings and slot chips, OPS-16/17 (moved to Agent 4).
- OWNERSHIP after the scope splits: A05 UX and A06 UI now belong to Agent 5, and A09 Ops to Agent 4. My remaining A04 and A10 items are the list above.

- SEC-17 item 1: WITHDRAWN in favour of Agent 1's DB-18 (same revoke). The draft file is marked "do not apply".
- FINAL GATES on fix/a6 at 4c0fb59d: lint 0 errors / 333 warnings with the claims check green (37); tsc 0; vitest 315 files, 4399 passed, 1 skipped.
- SEC-17 item 1: CLOSED through Agent 1's DB-18 (live as 20260924023518). supabase/tests/probes/sec-17.sql returns PROBE_OK on live (reported by Agent 1).
- Review written: Agent 3's red-gate fix and batch 4, appended to scratchpad/reviews/a3-batch4-by-a6.md. APPROVE 4 (0a6dddf4, 428db8be, 84f9464a, 511171a7); CHANGES REQUIRED 1 (b95a4054: 106 English literals remain on the surfaces the guard claims to hold). The full fix/a3 suite passed 3 out of 3 times under concurrent load (292/292 files).

### After the limit reset
- Merged the release branch (a fast-forward to 60ca05a8), then updated README.md in e286837c: gate numbers at e6b2b23c; the honest CI state (billing, and the PROBES_DATABASE_URL secret); the four CI jobs; the database probe harness; the migrations check; the post-release step-2 table; VALLO_PUBLIC_CATALOGUE; VALLO_SOCIAL_SIGN_IN replacing the retired NEXT_PUBLIC_AUTH_PROVIDERS; OPS_ALERT_*; dub1 and nine crons; THE_AUDIT_FIXES.md.
- Reviewed Agent 3's DOC-22 final (bb9972e9) and the OPS-18 clock test (e98f16a9): APPROVE, with 2 LOWs. Verdict in scratchpad/reviews/a3-doc22-final-by-a6.md. The full suite at fix/a3 75549d46 passed 370 of 370 files (4766 tests).

