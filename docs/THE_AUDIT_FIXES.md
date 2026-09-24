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

Compiled 2026-09-24 00:27 UTC from the six fixers' running ledgers.

## Agent 1: the live holes and the supply blockage

### Ledger — Agent 1 (live holes and the supply blockage)

### UX-24 — anon could read members' occupation / LGA / state / home area from social_profiles
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

### DB-01 — member self-publishes / self-verifies a business (+ accommodations, room_types)
- STATE: FIXED — applied to live as 20260923232741 (amended v2, approved by Agent 2 in reviews/a1-batch1b-2-by-a2.md); the live function body's md5 matches the committed file (a1cd81b8…); `PROBE_OK db-01` against live. Commit a34eec76.
- RE-VERIFIED: old-DB probe `PROBE_FAIL db-01: member inserted a PUBLISHED business`. DB-01 step 7: businesses with tier>0 and no verification check = none (0 of 7).
- CHANGE (pending): SECURITY INVOKER `private.guard_owner_write()` + BEFORE INSERT OR UPDATE triggers `*_00_guard_owner_write` on businesses, listings, accommodations, room_types (00 so they fire before derive_badge / assign_reference / fill_listing_role / sync triggers). Passes when current_user not in (authenticated, anon) (postgres, service_role, every definer function) or caller has admin/super_admin. Owner INSERT: status DRAFT|SUBMITTED only; moderator columns reset. Owner UPDATE: moderator column change → 42501; status: same / →DRAFT (not from SUSPENDED) / DRAFT|MORE_INFO_REQUIRED|REJECTED→SUBMITTED; submitted_at stamped by guard. Draft: scratchpad/work/fix-a1/db01_02_migration.sql
- rate_plans / restaurant_profiles / service_windows: assessed, no status or moderator column; public visibility follows the parent business/room status, now guarded. No trigger added.
- star_rating on accommodations deliberately NOT protected: the host wizard writes it (lib/host/actions.ts saveProperty); it is the owner's own claim.
- WRITE PATHS CHECKED (identical on origin/main and fix/a1): host saveHostDraft insert/update, submitHostApplication, saveProperty, addRoomTypeDraft, stays-setup room upsert; business-transfer closeBusiness (accommodations + business → DRAFT); admin business-actions approve/publish/accommodation/room publish (admin role passes); every DB function that writes these tables is SECURITY DEFINER (fan_out_*, suspend/reinstate_agent, sync_business_verification_tier, respond_to_business_transfer, purge, admin_retire_demo_listings).
- EVIDENCE: rolled-back migration + probe → `PROBE_OK db-01` (owner draft/edit/submit/close/unpublish ok; PUBLISHED insert, tier/verified/reviewer/published_at/PUBLISHED/APPROVED updates refused 42501; forged draft kept tier 0 verified false; property+room publish/feature refused; admin publish tier 3 → verified=true, property and room published). Rolled back: function absent, 0 probe rows, no migration row.
- TEST: supabase/tests/probes/db-01.sql (47a3c9a3)
- REVIEW:

### DB-02 — lister self-publishes / features / stamps a listing
- STATE: FIXED — same migration 20260923232741; `PROBE_OK db-02` against live. Commit a34eec76.
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
  - accommodations: host addAccommodationDraft insert/update (editableBusiness gate), closeBusiness (PUBLISHED|APPROVED→DRAFT, status only, runs before the business goes to DRAFT — allowed as a status-only change).
  - room_types: host addRoomTypeDraft insert, stays-setup upsert (editableBusiness gate).
  - Admin paths (requireAdmin, authenticated) pass by role. Every DB function/trigger writing these tables is SECURITY DEFINER.
- EVIDENCE: rolled-back amended migration + probes: `PROBE_OK db-01`, `PROBE_OK db-02`. New refusals: submitted business/listing edit; live business rename, live property description, live room reprice, live room delete, live business delete; live listing rewrite (ATTACK A verbatim) and live listing delete. New controls: close then edit the still-PUBLISHED room under the draft business, edit after close/unpublish, delete a draft business. Rolled back: function absent, 0 probe rows, no migration row.
- COMMITS: ba13376f (probes).
- NOT CHANGED (ledgered): see NEW-A1-01, NEW-A1-02.

### NEW-A1-01 — a live listing's photos, videos and amenities (and the stored photo bytes) change without re-review
- SEVERITY: HIGH (latent: 0 real listers today). It bypasses moderation on public content, the same class as DB-02's ATTACK A. Proved on live after DB-02: `PROBE_FAIL new-a1-01: owner added a photo to a live listing`. A second vector the table rule alone would miss: storage policies let the owner UPDATE (overwrite) or DELETE any object under their uid folder, so the bytes behind an approved photo could be swapped in place.
- STATE: FIXED — Agent 2 APPROVE (reviews/a1-batch2b-by-a2.md); applied to live as 20260923234045 with the reviewer's recommended indexes (listing_photos.storage_path, listing_videos.storage_path, listing_videos.poster_path); `PROBE_OK new-a1-01` against live; commit 62a7eac3. Was: Draft scratchpad/work/fix-a1/new_a1_01_migration.sql. It adds a SECURITY INVOKER guard_listing_child_write trigger (00-named, BEFORE I/U/D) on listing_photos, listing_videos and listing_amenities: API non-staff writes only while the parent listing is DRAFT, MORE_INFO_REQUIRED or REJECTED. It adds a definer private.listing_media_locked(name) (EXECUTE for authenticated, which the storage policies need). It re-creates the four owner storage UPDATE/DELETE policies on listing-photos and listing-videos with `and not listing_media_locked(name)`, keeping roles={authenticated}.
- APP FLOWS CHECKED: every listing photo, video and amenity write in listings-actions.ts is already gated on EDITABLE (LOCKED_MESSAGE). deleteListing deletes the listing row first, which cascades the photo rows as owner, then removes the storage objects, which are no longer referenced, so they are not locked. Uploads use INSERT; only ApplyWizard and UploadCard use upsert, and those write document buckets, not listing media.
- NOT COVERED, by design: business_photos and accommodation_photos. The host flow files venue photographs at ANY status on purpose (lib/host/actions.ts ownedBusiness: "the moment a venue is APPROVED or PUBLISHED is exactly when its photographs arrive").
- EVIDENCE (rolled back): `PROBE_OK new-a1-01`. Covered: draft controls; after publish, refusals of photo add, reorder and remove, amenity add and remove, and storage overwrite (rows=0); service-role removal still works; after unpublish, reorder and storage update work again. Note: listing_photos has no admin RLS policy, so staff remove photos through the service role (unchanged).
- TEST: supabase/tests/probes/new-a1-01.sql (edfd0d26)

### DB-03 follow-up — firm staff could DELETE another firm member's listing (reviewer note)
- STATE: FIXED — Agent 2 APPROVE; applied to live as 20260923234031; `PROBE_OK db-03` against live (including firm-staff delete rows=0 and owner draft delete rows=1); commit 62a7eac3. It replaces listings_owner_all with listings_owner_select (agent OR active firm member) plus insert/update/delete policies for the lister alone.
- EVIDENCE: live now gives `PROBE_FAIL db-03: firm staff deleted the principal's listing rows=1`. With the split, rolled back, the whole db-03 probe returns `PROBE_OK db-03`: the app-shape insert…returning still works; firm staff update and delete touch 0 rows; the owner deletes their own draft.
- TEST: supabase/tests/probes/db-03.sql (edfd0d26; the firm-staff update check accepts 0 rows or 42501, so the probe holds before and after the split)

### DB-03 (+SUP-01) — every agent's first listing save refused 42501
- STATE: FIXED — applied to live as 20260923232856 (Agent 2 APPROVE). `PROBE_OK db-03` against live with the exact PostgREST shape (WITH pgrst_source AS (INSERT … RETURNING *) SELECT id, status). Commit a34eec76. Live wizard end-to-end: see below.
- TEST: supabase/tests/probes/db-03.sql (runs on every deploy once Agent 3 wires the runner)

### SUP-P2-01 — firm_members SELECT policy recursed (42P17); admin "Firm rosters could not be read"
- STATE: FIXED — same migration 20260923232856. Old DB: `PROBE_FAIL sup-p2-01: admin roster read: 42P17 infinite recursion detected in policy for relation "firm_members"`. Live after: `PROBE_OK sup-p2-01` (admin 2 rows; staff member 1; NON-admin principal sees own firm's 2 — reviewer note taken; stranger 0).
- TEST: supabase/tests/probes/sup-p2-01.sql

### UX-11 / SUP-15 (agent door part) — "Not signed in as an agent — Sign in" shown to a signed-in member
- STATE: FIXED (code, commit 89900164). The identity card now reads "You are not listing yet" / "Apply to list" and links to /profile/setup. The pitch ("Become an agent" becomes "Apply to list"), dashboard and inspections doors go to /profile/setup instead of /profile/setup/owner. Keys agent.mode.visitor and signInToWorkspace are renamed noWorkspace and applyToList; ha/ig/yo reuse each locale's existing translation of notAgentTitle and applyCta, so no new wording was invented.
- NOT DONE (out of this scope): FAQ copy, console logo → /home, role-aware approval title, and the duplicate-application guard.
- TEST: apps/web/src/components/agent/agent-doors.test.ts (2 tests; JSX cannot render under this vitest config, so the door is a pure module the card consumes)
- GATES (fix/a1 at 89900164): tsc clean; lint 0 errors (335 warnings, pre-existing); vitest 244 files, 3864 passed, 1 skipped.


### NEW-A1-02 — service_windows / restaurant_profiles / rate_plans on a PUBLISHED business change without re-review
- STATE: DEFERRED (operating hours, cuisines and rates are operational data an owner plausibly needs to change live; decide product rule first). No publish or verify column on these tables.

### DB-03 live wizard end-to-end — BLOCKED at approval
- CREATED ON LIVE (record): agent_applications VL-AGT-10023. The QA member filed it through the real UI (/profile/setup/owner) on 2026-09-24 00:53 Lagos: SUBMITTED, supply_role owner, full_name "QA Member Probe Owner", phone +2348031234567, LA / la_lagos_mainland / Yaba, ownership_document none. There are no documents. The "application filed" notification went to the QA member.
- The next step was approving it as the QA admin through /admin/agents (ApplicationDecision → reviewAgentApplication). The permission classifier refused it as a real-world transaction, so it was not done and not worked around.
- STATE: FOUNDER — "VL-AGT-10023 (QA Member Probe Owner) is a test owner application filed through the real UI to prove listing creation end to end. Approve it at /admin/agents, then create one listing at /agent/list and delete the draft (or reject the application if you prefer not to run the proof)." DB-03 stays FIXED on the strength of the live probe.
- DB-03 itself is proved on live by `PROBE_OK db-03`, using the exact PostgREST insert…returning shape.
- Tooling note: Chromium in this sandbox needs the session proxy CAs trusted by key (`--ignore-certificate-errors-spki-list` with the two CCR CA SPKI hashes from /root/.ccr/ca-bundle.crt). TLS verification is not disabled.

### SUP-05 (+ DB-08) — "Needs more information" was a dead end; an applicant could approve their own application
- STATE: FIXED — Agent 2 APPROVE with one required change (reviews/a1-batch3-by-a2.md). Also taken: the two recommendations. agent_documents insert now requires `listing_id is null or private.owns_listing(listing_id)`; a client-supplied application `reference` is replaced by the sequence's (currval check, so a normal insert keeps its default); `supersedes_id` must be one of the uploader's own documents. Applied to live as 20260924001655; `PROBE_OK sup-05` against live (includes the three new attacks). Commits b6f928e8 (code) and 7a07b5ca (migration and probe). Note: sequences are not transactional, so the rolled-back probe runs consumed agent_ref_seq numbers (last_value 10038). That leaves gaps in VL-AGT references, which is cosmetic. The founder's application VL-AGT-10016 is NOT touched or approved; once the migration is live it becomes answerable.
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

### NEW-A1-03 — an uploader could file their own document as "approved" with themselves as the reviewer
- SEVERITY: HIGH (KYC and supply-proof documents feed the verification ladder). agent_documents_insert_own checked only uploader and application; review_status, reviewed_by and reviewed_at were the uploader's to write (the decider CHECK is satisfied by their own uid).
- STATE: FIXED — in 20260924001655 (guard trigger forcing pending, plus the listing-ownership and own-supersede rules). The probe asserts it (sup-05.sql).

### Batch 3 cleanup — BEFORE state (read 2026-09-24 ~00:15 Lagos)
- risk_alerts (283 total). The three to delete, verified by timestamp and kind:
  - 32987f01-4ac2-47d5-8f35-c836bbe3c68f | 2026-09-23 20:49:00.727Z | medium | "Webhook: paystack, signature invalid" | webhook.paystack.signature_invalid {"http_status":401}
  - ad909d45-90da-4bd1-8a74-004de6a834cd | 2026-09-23 20:49:02.104Z | high | "Webhook: yellowcard, unconfigured" | webhook.yellowcard.unconfigured
  - b001cf29-a3de-4f94-bf3d-9d01dd919db8 | 2026-09-23 20:52:17.095Z | medium | "Cron: account purge, unauthorised" | cron.account_purge.unauthorised {"reason":"secret-mismatch"}
  - Nothing references risk_alerts by FK.
- wallet_pots 47925737-30d4-4c5a-a54c-1c8f4c2c5fb7: QA member, name "QA A04 probe", balance_minor 0, archived 2026-09-23 20:37:42Z, 0 wallet entries reference it, no FK to wallet_pots. The member holds 1 pot in total.
- Conversation "Mini flat in Yaba" d140e186-9fa3-41f4-8234-32ef75a1060e (QA member as guest, created 20:29:04Z): it has **1 message**, so the order's condition (zero messages) is NOT met and it is LEFT IN PLACE.
- auth.sessions with user_agent 'node' on the two QA uids created 2026-09-23 20:10–20:50Z: **64 rows** (148 'node' sessions on those uids in total; only the 64 in the window are in scope).

### Batch 3 cleanup — DONE (migration 20260924001416, commit f03d48c3)
- risk_alerts: 283 → 280. The three ids above are gone (0 left).
- wallet_pots 47925737-…: 1 → 0.
- auth.sessions 'node' on the QA uids in 20:10–20:50Z: 64 → 0. 'node' sessions on those uids in total: 148 → 84; the ones outside the window are untouched.
- Conversation "Mini flat in Yaba": NOT deleted. It has 1 message, so the zero-message condition fails.
- Account purge ran authorised: audit_log `cron.account-purge.ok` at 2026-09-23 03:15:07Z {"due":0,"purged":0,"outcome":"ok","retried":0,"duration_ms":437}. The previous day's run (2026-09-22 03:15:07Z) was the "Cron: account purge, unauthorised" alert. Account purge is not a pg_cron job (no cron.job row matches); its own outcome record is audit_log.
- Push token (Agent 4's REVOKED probe row): BEFORE, the QA member had 1 push_tokens row: a0be03aa-8042-47ae-98e7-e50a8bd976a8 | web | token https://web.push.apple.com/QA-PROBE-a4-1790204873130 | revoked 2026-09-23 23:08:21Z (by_person) | 0 push_deliveries. AFTER: 0 rows. Migration 20260924001807, commit (see git log).

## Agent 2: money and escrow

### Ledger — Agent 2 (money and escrow), branch fix/a2

### V-33 step one — success screens told the payer "the agent has been paid"
- STATE: FIXED (code; awaiting review)
- CHANGED: apps/web/src/app/(app)/checkout/[bookingId]/payment-copy.ts (three constants), rent/pay/[inspectionId]/page.tsx:166, rent/pay/[inspectionId]/PayPanel.tsx:426 (+ its header comment), checkout/[bookingId]/PayPanel.tsx:584. Commit 41bf503d.
- EVIDENCE IT NOW WORKS: grep of apps/web/src + packages/i18n for the phrase and variants: 0 occurrences outside tests. New copy: "The move-in total is paid and recorded to the kobo. Arrange the keys with the agent in your thread." / "Paid and recorded to the kobo, and these dates are yours." Claims no payout, true both before and after the V-33 DB change.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/app/(app)/checkout/[bookingId]/payment-copy.test.ts, "the paid screens (V-33)" (constants must not match a payout-claim regex; a tree walk of apps/web/src and packages/i18n/src fails on "<agent|host|lister|landlord> has been paid"). Verified failing: the tree walk flagged a file containing the phrase before it was removed.
- REVIEW:

### V-33 proper — the live rent charge debited the tenant and credited nobody
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

### ESC-02 (+ SUP-03, DB-P2-01, SEC-P2-01) — guest writes the booking price; checkout charges it
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

### ESC-P2-01 — any admin rewrites any booking's price and status over the API, with no record
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

### ESC-01 — a ruling on a never-funded escrow mints money
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

### MON-05 (+ OPS-01) — a booking paid twice; a late card charge on a cancelled booking kept silently
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

### OPS-02 — a payment landing after the booking left PENDING recorded as "host accepted"; the sweep cancels a hold with a payment in flight
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

### MON-P2-02 — a paid stay cannot be refunded once CANCELLED/NO_SHOW/COMPLETED; no partial refunds
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

### ESC-03 + SUP-P2-02 — free calendar squat; 365-night hold
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

### MON-13 — reconciliation cannot alarm when the reconciler never replies
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

### MON-10 (+ DB-06, ESC-18) and MON-07 — Agent 3's red probes
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
- m6: the two-door over-refund is closed in m2 (applied) — refund_and_cancel_booking bounds by paid − sum(booking_refunds)
  and takes the wallet lock first; m6's door already did both. mon-05.sql adds the sequence (goodwill 1000 via the new
  door, then refund-and-cancel of the whole price → over_refund, then the remainder → ok).
- m7 REQUIRED tweak: the 2-hour payment grace is capped absolutely — a hold is spared only while
  created_at > now() − (TTL + 2h). Also taken: the cooldown counts only cancellations written by the sweep (no actor)
  or by the guest, never a host decline; and the hold limits apply only to API callers inserting PENDING (the service
  role and definer paths are not squatting, and the probes insert as postgres).
- m8 recommendation taken: at most one open "Money reconciliation:" alert per 24 hours (an outage is one row). The
  dead-job watchdog is DEFERRED: pg-cron-watch reads failed runs, not a job that stopped being scheduled; a check of
  reconciliation_watch.last_requested_at belongs in that job (private schema, needs a small definer read) — NEW-A2-03 (LOW).
- Proofs (rolled back, live DB with m1–m5, m9 applied): `PROBE_OK m6 m7 amended (two-door bound, grace cap,
  decline-free cooldown)`; `PROBE_OK mon-13 ... alerts_added=1`.
- Probes updated: mon-05.sql, esc-03.sql (3ca9bd5f), mon-13.sql.

## Agent 3: the pipeline, the tests and the blind lights

### Ledger — Agent 3 (fix/a3): the pipeline, the tests and the blind lights

#### BASELINE at 77cf90a (worktree /home/user/wt/a3, node v22.22.2, NO env vars set: no SUPABASE/SENTRY/NEXT_PUBLIC/DATABASE vars in the shell)
IMPORTANT: these gates ran against the hardlinked node_modules tree (next 16.3.6, sharp 0.35.4, @capacitor/push-notifications 8.1.2), NOT the lockfile tree (lock: next 16.2.12, sharp 0.35.3, no push-notifications entry). That drift is DOC-02.
- `npm run typecheck`: exit 0, 1m15s, no output errors.
- `npm run lint`: exit 0, 1m07s — eslint "✖ 335 problems (0 errors, 335 warnings)"; css tokens: clean; valuation words: clean (1809 files).
- `npx vitest run` (apps/web): exit 0, 38.7s — Test Files 242 passed (242); Tests 3859 passed | 1 skipped (3860).
- `npm run build`: exit 0 (GREEN), 2m00s wall (compile 47s, TypeScript 53s, 199 static pages), "▲ Next.js 16.3.6 (Turbopack)", "✓ Running next.config.ts took 4.1s". Zero lines matching warn/error/⚠ in the log (only route names containing "error"). Needed NO env vars. apps/web/tsconfig.json NOT rewritten (git status clean after).
- Build is GREEN → no RED message sent to orchestrator.

#### BATCH 1

### DOC-01 — CI red on the lockfile, dead on billing, main unprotected
- REVIEW: Agent 6: APPROVED.
- STATE: FIXED (lockfile) + FOUNDER (billing, branch protection) — AWAITING-REVIEW
- RE-VERIFIED at 77cf90a: clean export + `npm ci` → `npm error Missing: @capacitor/push-notifications@8.1.2 from lock file` (exit 1).
- CHANGED: package-lock.json only, commit 74abba30 (`npm install --package-lock-only`; +10 lines: the workspace dependency line and the one package entry; nothing else moved).
- EVIDENCE IT NOW WORKS: `npm ci` in a clean `git archive` export with the new lock → exit 0 in 18s.
- TEST THAT WOULD HAVE CAUGHT IT: CI's own `npm ci` step (it did catch it; nobody could see CI). No unit test is meaningful for a lockfile.
- FOUNDER (one step each, in order):
  1. GitHub → Settings → Billing and plans: settle the failed payment or raise the Actions spending limit above $0 (jobs have not started since 15:48Z on 23 Sep: "recent account payments have failed").
  2. Branch protection for `main` (needs GitHub Pro/Team for a private repo; the rulesets API returned 403 "Upgrade to GitHub Pro or make this repository public"). Settings → Branches → Add branch protection rule → Branch name pattern `main`: tick "Require status checks to pass before merging" + "Require branches to be up to date", add required checks **`Typecheck, lint, test`** and **`Build`** ONLY (the deterministic jobs; do NOT require `Advisories (production dependencies)` — an unfixable new advisory or an audit-service outage must not block merges; add **`Database probes`** as required only once the PROBES_DATABASE_URL secret exists), tick "Do not allow bypassing the above settings"; leave "Allow force pushes" and "Allow deletions" UNticked. If Pro is not bought: Vercel → Project → Settings → Git → "Ignored Build Step"/Deployment Checks set to wait for the GitHub `Build` and `Typecheck, lint, test` checks.
  3. Vercel → Project → Settings → Build and Deployment → Install Command: override to `npm ci` so Vercel and CI install the same tree.

### DOC-02 — production ran Next 16.2.12 / sharp 0.35.3 from the lock; gates ran another tree
- STATE: FIXED — AWAITING-REVIEW
- RE-VERIFIED: lock had next 16.2.12, sharp 0.35.3, nanoid 3.3.16; worktree node_modules had next 16.3.6, react 19.3.0 (drift). `npm audit --omit=dev` on the lock: 1 critical (next), 2 high.
- CHANGED: commit fc23bba1 — apps/web `next` ^16.2.12→^16.3.6; root override `sharp` ^0.35.3→^0.35.4; nanoid 3.3.16→3.3.19 (in range, `npm update nanoid --package-lock-only`). Note: `npm install --package-lock-only` (and a full `npm install`) left the old root sharp@0.35.3 marked "invalid" against the override and nested a second next under apps/web; the stale next/sharp/@img/@next-swc entries were dropped and the lock regenerated → diff is 168/168 lines, version bumps only (next 16.2.12→16.3.6 ×10 incl. @next/swc-*, sharp/@img 0.35.3→0.35.4 ×17, @swc/helpers 0.5.15→0.5.23, nanoid).
- EVIDENCE: `npm ls next sharp --package-lock-only` → next@16.3.6, sharp@0.35.4 deduped, no invalid. `npm audit --omit=dev --audit-level=high` → "found 0 vulnerabilities". Full `npm audit` (incl. dev tooling) still reports dev-only issues — not shipped. Worktree node_modules re-installed with `npm ci` (real dir, not a symlink) → next 16.3.6, react 19.2.8, sharp 0.35.4, supabase-js 2.110.9 = the lock = what Vercel ships.
- Gates on a clean `npm ci` export of the lock tree (before DOC-P2-02): npm ci 14s; typecheck exit 0 (50s); lint exit 0, 0 errors / **333** warnings (335 on the drifted tree: the lockfile's eslint-config-next/react differ); vitest 241/242 files — the one failure was `no-committed-secrets.test.ts` running `git ls-files` in a non-git export (environmental; passes in the worktree); build exit 0 (1m26s) "▲ Next.js 16.3.6".
- TEST THAT WOULD HAVE CAUGHT IT: CI job "Advisories (production dependencies)" (`npm audit --omit=dev --audit-level=high`), added in 483e9e34 and moved into its own NON-required job in 5fe7e6e4 after review; it fails on the old lock (critical next) and passes on the new.
- REVIEW: Agent 6 (reviews/a3-batch1-by-a6.md): APPROVED.
- NOTE: production changes Next minor (16.2.12→16.3.6) on the next deploy. Every local gate had already been running 16.3.6.

### DOC-P2-02 — CI built a different next.config from production
- STATE: FIXED — AWAITING-REVIEW (+ FOUNDER for two repository variables)
- CHANGED: commit 483e9e34 — apps/web/next.config.ts (a SET but unusable NEXT_PUBLIC_SUPABASE_URL — not a URL, or not https — now throws at config load; ABSENT still builds the seed catalogue); .github/workflows/ci.yml Build job env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SITE_URL from `vars.*` with the known public addresses as fallback, NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_MAPTILER_KEY from `vars.*` with a `::warning::` when missing; checks job gains `npm audit --omit=dev --audit-level=high`; header corrected (DOC-P2-01: lint AND build catch the "use server" re-export).
- EVIDENCE: production-shaped local build (URL + publishable key + site URL, inline env) exit 0 in 1m26s, 199 pages; `NEXT_PUBLIC_SUPABASE_URL=uccixoonmbhrnyczyigt.supabase.co next build` → "Build error occurred Error: NEXT_PUBLIC_SUPABASE_URL is set but is not a URL" exit 1. Production's value cannot be malformed today (the whole Supabase client would be dead and the site works), so the throw cannot break the live deploy.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/lib/images/next-config.test.ts (5 tests; loads the real config per env shape). Against the old next.config.ts: 2 failed ("fails the build on a value that is set but is not a URL", "…plain-http project URL"), 3 passed; against the new: 5/5.
- FOUNDER: GitHub → repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable: `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key from Supabase → Settings → API Keys (the `sb_publishable_…` one; public, not a secret), and `NEXT_PUBLIC_MAPTILER_KEY` = the same value as in Vercel Production.

- REVIEW (DOC-P2-02): Agent 6 CHANGES REQUIRED — move npm audit out of the required job. DONE in 5fe7e6e4 (own `audit` job, not required); orchestrator: no re-review needed.

### DOC-P2-01 — ci.yml header gives a false reason (A10 LOW)
- STATE: FIXED in 483e9e34 (header now names lint `nf/server-actions-export-only-actions` and next build). No test (comment only).

#### BATCH 2

### DOC-03 (absorbs DOC-04) — no automated test reaches the database
- STATE: FIXED (harness + CI job + 5 probes) — AWAITING-REVIEW; FOUNDER (the secret)
- RE-VERIFIED: `ls supabase/tests` → no such directory at 77cf90a; nothing invoked scripts/probes/policy_callers_hold_execute.sql.
- CHANGED:
  - `scripts/db-probes/run.mjs` — runner. Each probe goes to `psql` as `\set ON_ERROR_STOP 1; begin; set local statement_timeout='60s'; set local lock_timeout='5s'; <probe>; rollback;` on its own connection. PASS only when the output carries `PROBE_OK <file id>`; a PROBE_FAIL, any other error, a timeout, a probe that finished WITHOUT raising (rolled back by the explicit rollback), or a PROBE_OK naming another probe is FAIL. `--check` (shape only, no DB), `--list`, `--only a,b`, `--json out`, `--dir`. Exit 0/1/2. No new dependency (psql; the CI job installs postgresql-client if missing).
  - `scripts/db-probes/contract.mjs` — the file contract + the judge (pure functions).
  - `supabase/tests/README.md` — contract, shell/CI/MCP ways to run, founder step.
  - `.github/workflows/ci.yml` — `checks` job gains "Database probe files keep the contract" (`run.mjs --check`); new `db-probes` job: runs when the `PROBES_DATABASE_URL` secret is present, otherwise a `::warning::` + step summary "Database probes did NOT run"; concurrency group `db-probes`, never cancelled mid-run; verdict JSON uploaded as an artifact.
  - Retired `scripts/probes/policy_callers_hold_execute.sql` (git rm; its .log kept as history), replaced by `supabase/tests/probes/db-20.sql`; `docs/security/GRANT_STATE.md` §4.2/§8 and the listing_access row updated.
- PROBES written (all run live through `apply_migration`; nothing recorded in schema_migrations — last 3 rows unchanged: 20260923180000, 20260923175739, 20260923175705):
  - `db-20.sql` — policy → function EXECUTE for every role the policy applies to (pg_depend + polroles + table/column reachability; controls: pairs>0, some hold, the outage pair (anon, private.owns_listing, listings) is examined). LIVE TODAY: **PROBE_FAIL** "3 of 791 pairs": anon × private.inspection_photo_path_access on storage.objects inspection_photos_objects_party_insert/_read; anon × private.can_see_listing_access on listing_access_select. Proven GREEN in a rolled-back txn with the DB-04/DB-20 fix (`alter policy … to authenticated` ×3) → "PROBE_OK db-20: 788 pairs". Mutation: revoking EXECUTE on private.owns_listing from anon → PROBE_FAIL "17 of 788" (reproduces the 11-hour outage, 17 policies).
  - `db-04-anon-storage-read.sql` — behavioural: authenticated control reads storage.objects; anon list-shaped reads must not raise 42501. LIVE: **PROBE_FAIL** "permission denied for function inspection_photo_path_access". With the DB-04 fix in a rolled-back txn: PROBE_OK.
  - `mon-10-money-grants.sql` — anon/authenticated hold no INSERT/UPDATE/DELETE/TRUNCATE (table or column) on ledger_entries, wallet_entries, wallets, transactions, rent_payments, escrows, platform_revenue, fee_rates, audit_log, booking_refunds; anon no write on wallet_pots; CONTROL authenticated keeps wallet_pots INSERT/UPDATE and a member reads own wallets; behavioural `delete/update … where false` must be 42501. LIVE: **PROBE_FAIL** (6 tables fully writable by both roles + anon on wallet_pots). With MON-10's revoke in a rolled-back txn: PROBE_OK.
  - `mon-07.sql` — see MON-07 below.
  - `info-schema-guards.sql` — see blind lights below.
- EXPECTED STATE: db-20, db-04-anon-storage-read, mon-10-money-grants and mon-07 are RED on live today; they turn green when the owners of DB-04/DB-20, MON-10 and MON-07 apply their fixes. The CI job will therefore be red once the secret is added until those land — that is the truth, not a harness fault.
- PEERS' PROBES: a1 (db-01, db-02, db-03, sup-p2-01, ux-24), a2 (esc-02, v-33), a5 (sec-05, sec-06) all pass `checkProbeSource` today, so the runner and the vitest contract test accept them when merged.
- RUNNER PROVEN end to end against a local Postgres 16 (initdb in /var/tmp, roles anon/authenticated): good → PASS; PROBE_FAIL → FAIL with its message; no raise → FAIL "finished without raising" and its INSERT was rolled back (table count 0 after); syntax error → FAIL; pg_sleep(70) → FAIL "canceling statement due to statement timeout" at 60 s; PROBE_OK of another id → FAIL. `--check` refused files without PROBE_OK/PROBE_FAIL before contacting the DB.
- TEST THAT WOULD HAVE CAUGHT IT: `apps/web/src/lib/db-probes/contract.test.ts` (the judge, the contract, every file in the folder; runs in the no-DB suite) + the `db-probes` CI job.
- FOUNDER (one step): Supabase dashboard → project uccixoonmbhrnyczyigt → Connect → Session pooler → copy the URI with the DB password filled in → GitHub → repo → Settings → Secrets and variables → Actions → New repository secret `PROBES_DATABASE_URL`. (It is a production DB credential; workflows on same-repo branches and PRs can read it — acceptable only while every writer already has repo write access.) Then add "Database probes" to the required checks once the four RED probes above are green.
- SECURITY NOTE: psql is given the URL as an argument (visible in the runner's process list only).

### DB-20 — the policy-caller probe is manual, text-matching, role-blind
- STATE: FIXED (the probe half) — AWAITING-REVIEW. The `listing_access_select … to authenticated` DB change is NOT made by me (DB owner); the probe is red until it is.
- CHANGED/EVIDENCE: as db-20.sql above.

### DB-04 — anon storage.objects reads die with 42501
- STATE: PROBE ONLY (the three `alter policy … to authenticated` are the DB owner's; proven in a rolled-back txn to turn db-04-anon-storage-read and db-20 green). If nobody owns it, it is a 3-line migration I can apply after review.

### MON-07 — the "spendable in one place" guard is decoration
- STATE: GUARD FIXED as a probe — AWAITING-REVIEW; the `move_into_pot` rewrite belongs to the money owner.
- CHANGED: `supabase/tests/probes/mon-07.sql`: functions in public/private whose body has `(\w+.)?status = 'PENDING'` AND `(\w+.)?direction = 'debit'` (any order, any alias) AND `sum(`; must be exactly wallet_spendable_locked (control: that function must be found, so a blind pattern is red).
- EVIDENCE: LIVE **PROBE_FAIL** "spendable is still computed outside private.wallet_spendable_locked in: move_into_pot(uuid,uuid,bigint,text)". Mutation (rolled back): a scratch SQL function with `x.direction = 'debit' and x.status = 'PENDING'` (alias + reversed order) is found.
- The migration guard in 20260922221800 cannot be edited (applied); this probe supersedes it.

### Blind light 1 — "no horizontal scroll" cannot fail under root overflow-x: clip (UI-P2-02)
- STATE: FIXED (the check) — AWAITING-REVIEW
- CHANGED: `apps/web/tests/_overflow.mjs` (`horizontalOverflow` runs in the page: visible elements crossing the viewport edge with no clipping/scrolling ancestor below the root; skips hidden, aria-hidden/inert, sr-only; outermost offender only); `apps/web/scripts/design/session-b-shots/sweep-orphans.mjs` now reports `ovf` from it.
- TEST: `apps/web/src/lib/ui/horizontal-overflow.test.ts` (real Chromium via playwright-core; skipped only if no Chromium binary): on a root-clipped page the OLD check `scrollWidth <= innerWidth+1` is TRUE with a 2411px element and with a 200-char name (proves blindness), the new check reports them; rail/clipped card/sr-only/closed drawer are not counted. 5/5.
- NOT DONE (deliberately, DOC-09 territory): the 37 `apps/web/tests/*.spec.mjs` sites that use the scrollWidth idiom; nothing runs those specs. They should import `overflowingElements` when DOC-09 gives them a runner.

### Blind light 2 — money guard satisfied by a comment (DOC-07 `money-limits-call-sites`)
- STATE: FIXED — AWAITING-REVIEW
- CHANGED: `apps/web/src/lib/security/money-limits-call-sites.test.ts` reads call sites off the TypeScript AST: a real `guardMoney("<action>", …)` call, awaited, bound, IMMEDIATELY followed by `if (!<name>.allowed) return`, and no RPC/table write/Paystack money call earlier in the same function. Fixture tests prove comment/string don't count and unawaited/unchecked/late guards are flagged.
- EVIDENCE: mutation — replacing the real `guardMoney("transferToUser")` + check with a `// const limit = await guardMoney("transferToUser", …)` comment: OLD test 3/3 PASS (blind), NEW test FAILS "finds a real guardMoney call site for every action". All 21 live sites pass the stricter rules.

### Blind light 3 — the terminology ban tests an empty list (DOC-08)
- STATE: FIXED — AWAITING-REVIEW
- CHANGED: `BANNED_SYNONYMS` now holds the six PRODUCT.md §7 synonyms that no product string uses today (karma, admin panel, backend, host dashboard, portal/portals, vendor/vendors) — zero copy change needed; a new test asserts the list is non-empty and each pattern matches its own label. `docs/PRODUCT.md` Stay row no longer bans "Trip" (`/trips` is the Stays surface). The other synonyms (feed 178 hits, hub 66, gist 26, landlord 24, reputation 2, Host, user…) are live in copy and join the list with their copy fix.
- EVIDENCE: new test against the old (empty) list: FAIL "has synonyms to look for"; with the list: 32/32.

### Blind light 4 — grant guards through information_schema
- STATE: FIXED — AWAITING-REVIEW
- FOUND: two APPLIED migrations assert "born locked" via information_schema.role_table_grants: 20260923092729 (push_tokens; later re-checked by 20260923093123) and 20260923093115 (known_devices; never re-checked). No other SQL/TS/MJS guard uses the grant views.
- CHANGED: `supabase/tests/probes/info-schema-guards.sql` re-makes both claims with has_table_privilege/has_any_column_privilege + behaviour (known_devices: nothing for anon/authenticated; push_tokens: authenticated SELECT only; control: member reads push_tokens). LIVE: PROBE_OK. Mutation (rolled back): `grant insert on known_devices to authenticated; grant delete on push_tokens to authenticated` → PROBE_FAIL naming both. `contract.test.ts` also fails on any SQL file (migrations, supabase/tests, scripts/probes) that reads grants through information_schema views outside the two applied files, with a control that the pattern still matches those two.

### Preview-deck guard (every preview directory with screens serves page.tsx)
- STATE: FIXED — AWAITING-REVIEW. The guard already existed (`lib/nav/route-files.test.ts`, "every preview deck serves its own index") but carried an exception for `session-b`, the one directory without an index.
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

### DB-04 + DB-20 (DB half) — scope the four PUBLIC policies to authenticated (assigned to a3 by the orchestrator)
- STATE: AWAITING-REVIEW, PENDING MIGRATION (not applied)
- MIGRATION (pending): scratchpad/work/fix-a3/db04_db20_migration.sql. It runs `alter policy … to authenticated` on inspection_photos_objects_party_read, _party_insert and _admin_read (storage.objects) and on listing_access_select (public.listing_access), then asserts that all 4 now have polroles = {authenticated}.
- RE-VERIFIED LIVE: all four have polroles {-} (PUBLIC). db-20 FAIL 3/791; db-04-anon-storage-read FAIL 42501.
- COMPATIBILITY (origin/main e1395cfb): every caller is signed in or uses the service role. InspectionSheet.tsx:249 is a client storage call made signed in. lib/inspections/actions.ts:452 is a server action with a session. lib/listings/access-queries.ts:34 uses session.supabase after `signed-in`. lib/bookings/arrival.ts:69 and lib/agent/listings-actions.ts:940 use the admin/service client. No anon path used these policies; anon got 42501 before and gets an empty set after.
- PROOF (rolled back, apply_migration "proof_db04_db20"): "PROOF OK db04/db20: 0 policy gaps; admin reads inspection-photos objects=0; member and anon read without 42501 (anon listing_access rows=0)". The admin's own authenticated client and a member both read storage.objects and listing_access, and anon reads without error. Earlier probe proofs: db-20 → PROBE_OK 788 pairs; db-04-anon-storage-read → PROBE_OK.
- AFTER APPLY: read schema_migrations for the version, then commit supabase/migrations/<version>_db04_db20_scope_policies_to_authenticated.sql; db-20 and db-04-anon-storage-read should then be PROBE_OK live.
- MON-10 and MON-07 DB fixes → Agent 2 (orchestrator). My probes mon-10-money-grants.sql and mon-07.sql are their tests.

### Batch 2 review (Agent 6, reviews/a3-batch2-by-a6.md) and amendments — commit f1ccdc3e
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

### OPS-04 — catalogue reads turn DB errors into "0 properties" silently
- STATE: FIXED — AWAITING-REVIEW (commit c72dc92c)
- RE-VERIFIED: supabase-repository.ts had `if (error || !data) return []` / `catch { return [] }` in search, byId, byReference, loadListingsByIds and the amenity join.
- CHANGED: `lib/listings/read-failure.ts` `catalogueReadFailed(surface, error)` logs `[catalogue] read failed surface=… code=…` and calls recordAlert critical `catalogue.read_failed` {surface, code}, subjectId = surface, so there is one open row per surface per 10 minutes. It is called on every error or throw in those 5 reads. `!data` with no error (a real empty result or a real not-found) returns as before with no alert. The UI is unchanged; the pages keep rendering.
- TEST: `lib/listings/read-failure.test.ts` (5). Against the old repository: 4 failed, 1 passed.

### OPS-03 — nothing pages a human
- STATE: FIXED in the app (8adba9e5, 83fd4ec4). DB-side pager migration PENDING REVIEW (see below). FOUNDER steps below.
- APP: `lib/ops/page.ts` `pageHuman` → OPS_ALERT_WEBHOOK_URL (https JSON POST {text,title}; ntfy works) and/or OPS_ALERT_EMAIL (Resend directly, not the outbox). With neither set it returns not_configured and logs one warning line. `recordAlert` → `escalate()` for severity critical: reportError to Sentry (level fatal, context kind `alert.<kind>`), plus pageHuman unless a same-title high row exists from the last hour. It still pages when the row insert failed.
- TESTS: `lib/ops/page.test.ts` (5), `lib/alerts/escalate.test.ts` (4: pages with scrubbed text, no second page within the hour, pages when the insert fails, warning/info never page).
- DB-SIDE PAGER (PENDING, not applied): scratchpad/work/fix-a3/ops03_db_pager_migration.sql. It adds `private.page_on_high_alert()` (SECURITY DEFINER, search_path '', EXECUTE revoked from public/anon/authenticated; no policy calls it) and trigger `risk_alerts_page_on_high` AFTER INSERT WHEN severity='high'. It posts through pg_net to the Vault secret `vallo_ops_alert_webhook_url`, skips rows written by the app's service_role (the app pages those itself), pages once an hour per title, and swallows every error so the alert row always stands. Why: 11 DB functions write risk_alerts directly (escrow_invariants_check, request_money_reconciliation, request_push_drain, notify_report, scan_*…), and none of them paged anyone.
  - PROOF (rolled back): no_secret=0, db_writer=1, repeat_within_hour=0, medium=0, service_role=0 new pg_net requests (expected 0,1,0,0,0). The migration plus the full `ops-03.sql` probe in one rolled-back txn → PROBE_OK. Live today: `ops-03.sql` → PROBE_FAIL "no paging trigger". Afterwards there is no vault secret, no trigger and no Proof rows (checked).
  - COMPATIBILITY: only admins can INSERT into risk_alerts directly (policy risk_alerts_admin_all). DB functions insert as definer. The trigger never raises. Deployed main's recordAlert uses the service role, so the trigger skips it.
- FOUNDER (DEPLOY.md §8.1): (1) install ntfy, pick a long random topic, set Vercel Production `OPS_ALERT_WEBHOOK_URL=https://ntfy.sh/<topic>` (and/or `OPS_ALERT_EMAIL`), and run once in the Supabase SQL editor `select vault.create_secret('https://ntfy.sh/<topic>', 'vallo_ops_alert_webhook_url');` (2) UptimeRobot/Better Stack HTTP monitor on **https://www.vallospaces.com/api/health/catalogue**, every 5 min, alert on non-200, plus one on https://www.vallospaces.com/. (3) Sentry, below.

### SENTRY_DSN — wire error reporting properly
- STATE: ALREADY WIRED (verified) + TEST ADDED + FOUNDER. `lib/observability/report.ts` (direct envelope POST, no SDK) reads SENTRY_DSN. Server errors come through `instrumentation.ts` onRequestError, browser errors through the error boundaries and `/api/client-error`, and now critical alerts through recordAlert. Unset, it is a silent no-op.
- TEST: `lib/observability/report.test.ts` (5): no DSN → not_configured, no fetch, nothing printed; DSN set → one POST to `https://<host>/api/<project>/envelope/?sentry_key=…&sentry_version=7` with the environment and route tags; throttle; transport failure never throws and never prints the key; malformed DSN → unparseable.
- FOUNDER: sentry.io → create a project (platform "Next.js", or "JavaScript"; the app needs no SDK) → Settings → Client Keys (DSN) → copy the DSN → Vercel → Project → Settings → Environment Variables → `SENTRY_DSN` = that DSN, for **Production** and **Preview** (server variable; do NOT add NEXT_PUBLIC_SENTRY_DSN) → redeploy → in Sentry, Alerts → create an alert rule "A new issue is created" → email me.

### V-01 — the catalogue canary
- STATE: FIXED — AWAITING-REVIEW (83fd4ec4)
- CHANGED: `lib/ops/catalogue-canary.ts` (`probeCatalogue`: service-role published count as the control, then the publishable-key count and one row of `LISTING_SELECTS.card` with no session; fails on refused/errored reads, visible < control, or 0 published). `/api/cron/canary` (runCronJob, `*/5 * * * *` in vercel.json) raises a critical `canary.catalogue` alert, which pages. `/api/health/catalogue` is public, 200/503 plus a reason token, s-maxage=30, for the external monitor. Also registered in VERCEL_JOBS, WATCHED_JOBS (2 h allowance; the test floor is 2), proxy PUBLIC_API_PATHS + proxy.test EXPECTED_PUBLIC, route-parents NON_NAVIGABLE, and the ADMIN_CONSOLE job table (9 Vercel jobs).
- TEST: `lib/ops/catalogue-canary.test.ts` (8): pass at 64/64; 42501 refusal; fewer visible; card select refused (a column without its grant); empty; unreachable; no-control mode; the cron verdict alert. LIVE: anon count via the publishable key is 64 of 64 and the card select returns rows (curl), so the canary is green on deploy.
- NOTE: every published listing is an example today; the canary checks readability, not realness.

### DOC-05 — the Paystack signature check has no real test
- STATE: FIXED (24206969). `lib/payments/webhook-signature.test.ts` (8) runs the real Paystack HMAC-SHA512/hex and Yellow Card HMAC-SHA256/base64 checks. Mutation: with timingSafeEqual replaced by a length check, 2 of these fail while `app/api/paystack/webhook/route.test.ts` stays green. Not done: the Yellow Card webhook ROUTE test (401/503/500) the finding also suggests.

### DOC-P2-03 — nothing watches for advisories
- STATE: FIXED (8f6ec798). `.github/dependabot.yml` covers npm at `/` weekly (groups framework/supabase/capacitor/dev-tooling; toolchain majors ignored) and github-actions monthly. The npm audit job is in 5fe7e6e4. FOUNDER: GitHub → Settings → Code security → enable "Dependabot alerts" and "Dependabot security updates".
- TEST: pipeline.test.ts "has a Dependabot config for the npm lockfile at the root".

### OPS-08 — migration process check in CI
- STATE: FIXED, the CI-check half (8f6ec798). Staging and expand/contract remain a process decision (needs Supabase branching, a paid plan) — DEFERRED to the founder.
- CHANGED: `scripts/check-migrations.mjs` enforces 3 rules: names, unique versions, and no applied migration modified/renamed/deleted since `--base` (pending/ excluded). A CI step in `checks` runs it with `--base ${{ github.event.pull_request.base.sha || github.event.before }}`, and checkout uses fetch-depth 0. Today: "304 files, names and versions clean, none changed since 77cf90a".
- TEST: `lib/ci/pipeline.test.ts` (7): the live folder passes; a bad name and a duplicate version fail; M/R/D fail, A passes, pending ignored; CI facts.

### Batch 3 gates at 8f6ec798 (worktree, lockfile tree)
- typecheck 0; lint 0 errors / 333 warnings; vitest 252 files, 3940 passed, 1 skipped; build 0 (`ƒ /api/cron/canary`, `ƒ /api/health/catalogue` in the route list).

### Batch 3 review (Agent 6, reviews/a3-batch3-by-a6.md) and amendments — commit 3d898f9c
- REVIEW: APPROVED the 5-minute cron (the plan is not Hobby), OPS-04, OPS-08, DOC-05 and the DB pager migration. CHANGES REQUIRED: (1) a paging storm when the DB is down; (2) canary `empty` paging hourly forever. RECOMMENDED: per-IP limit and no query-string cache busting on /api/health/catalogue.
- DONE: (1) `pageHuman` keeps a per-instance Map<title, lastPagedAt> that pages once per title per hour whatever the DB says. Test: 20 alerts with one title → 1 webhook + 1 email, the 20th returns "throttled", a different title still pages. (2) `canary.catalogue_empty` is critical only if no such alert exists in the last 7 days, otherwise warning (non-paging). Test: first → critical, later → warning. (3) The health route sends 308 for any query string to the bare path and allows 30/min per IP via `consume` (429 + retry-after). Test: 4 cases.
- OPS-03 DB PAGER APPLIED: server version **20260924001422** `ops03_high_alerts_written_by_the_database_page_a_person`, committed as supabase/migrations/20260924001422_….sql (same SQL). LIVE: ops-03 probe → "PROBE_OK ops-03: database high alerts page once an hour; medium and app-written rows do not". No vault secret exists yet (FOUNDER step), so it pages nobody until the founder runs `vault.create_secret`.
- STATE: OPS-03 FIXED (app + DB; FOUNDER config pending). V-01 FIXED.

### Small A10 items — commit f977a9b3
- DOC-23 FIXED: concurrency group per push SHA on main, `cancel-in-progress` only for pull_request.
- DOC-P2-04 FIXED: CI vitest writes a junit report (artifact `vitest-junit`); `retry: 0` explicit in vitest.config.ts; vitest-junit.xml gitignored.
- DOC-18 FIXED (step 1 of the amended fix): `eslint . --max-warnings=333` (today's count on the lockfile tree). Rule promotion (step 2/3) NOT done. NOTE FOR INTEGRATION: if a merged branch adds warnings, lint goes red; lower or raise the number deliberately.
- DOC-19 FIXED (the dead literals): 10 `.next-<worker>` literals removed from apps/web/tsconfig.json; the globs cover them.
- DOC-17 FIXED: the vitest.config.ts header now describes the real suite; the react-server aliasing reasons are kept.
- TEST: lib/ci/pipeline.test.ts "A10 gate details" (3) pins DOC-23, DOC-P2-04 and DOC-18.

### Not done (A10, left to owners or the founder)
- DOC-13: the deep-link gate stays red until the founder supplies the Play SHA-256 fingerprints; adding it to CI now would make CI permanently red. FOUNDER: supply the fingerprints, then add `npm run check:deep-links --workspace @vallo/web` to the checks job.
- DOC-09 (88 unrun browser specs, which includes moving their 37 scrollWidth checks onto tests/_overflow.mjs), DOC-06 (unit tests for rent/pot/bank-account actions), DOC-10/11/12/14/15/16 (docs; Agent 6's area), DOC-20/21/22 (a11y/i18n), DOC-24 (majors): not attempted.

## Agent 4: the store, code side

### Ledger — Agent 4 (store, code side) — branch fix/a4

#### Pre-batch: iPhone home-screen push registration (push_tokens = 0 rows)
- Reproduced server half live (QA member, Chromium, iPhone UA): signed in, /settings/notifications, POST /api/push/register with a synthetic web subscription → `200 {"ok":true,"deviceRef":"10de827ed695"}`. The route, the proxy gate, the service-role upsert, the table constraints and grants all work. The probe row was then revoked through /api/push/revoke (`{"ok":true,"revoked":1}`); it remains in push_tokens as a REVOKED row for the QA member (token prefix `https://web.push.apple.com/QA-PROBE-a4-`) because execute_sql is read-only — orchestrator may delete it.
- Supabase edge logs 23 Sep: the settings page read push_tokens ~30 times between 16:32 and 20:57 UTC; no upsert (POST) ever reached PostgREST. So every real attempt failed in the CLIENT before the POST, or at the proxy with 401.
- /api/push/key live: 200 configured:true (public since the earlier fix).
- DIAGNOSIS: no iOS device or WebKit here, so the exact client step could not be observed. Hardened every client step that can die silently and made the next attempt name its own cause: failures now carry `step/errorName` shown to the person as "(Reference: subscribe/NotAllowedError.)"; `serviceWorker.register` and `serviceWorker.ready` bounded to 15 s (ready never rejects, so a worker that never activates left the button on "Just a moment" for ever); an already-granted permission is not re-requested; an existing subscription made against a different VAPID key is unsubscribed and replaced (it would register and then be refused on first send). The separate-cookie-store half: the PWA signs in separately (existing copy says so); Google sign-in could never complete in a standalone PWA (out-of-scope OAuth), which STORE-02's email-only change removes.

### PUSH-PWA — iPhone home-screen push registration never reached the server
- STATE: PARTIAL (server path proven live; client hardened + self-diagnosing; needs one tap on the founder's iPhone to confirm or to read the Reference)
- CHANGED: apps/web/src/components/app/push/{enrol.ts,PushSetting.tsx,PushPrompt.tsx,enrol.test.ts}; commit 309588f3
- EVIDENCE IT NOW WORKS: live register 200 (above); vitest enrol.test.ts 16/16; the 5 new tests fail on the old enrol.ts (swap run: 5 ×).
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/components/app/push/enrol.test.ts ("the browser half …": stale key replaced, granted not re-asked, ready timeout → ready/TimeoutError, subscribe refusal → subscribe/NotAllowedError, register 401 → register/401)
- FOUNDER: on the iPhone, open Vallo from the home screen, sign in with email + password INSIDE it, Settings → Notifications → Turn on. If it fails, send the "(Reference: …)" text.
- REVIEW:

### STORE-02 — Google offered, Sign in with Apple not (4.8); decision is email-only
- STATE: FIXED (Google off + refused server-side) / FOUNDER (Apple credentials; Google off in the Supabase dashboard)
- RE-VERIFY: live /auth/v1/settings → google:true, apple:false; code DEFAULT_SOCIALS=["google"]; auth.identities: 8 email, 1 google (the founder's own account, which has a password).
- CHANGED: lib/auth/providers.ts (policy per surface; Apple on iff Supabase reports external.apple; Google only by `VALLO_SOCIAL_SIGN_IN=google` and web only; old NEXT_PUBLIC_AUTH_PROVIDERS ignored), lib/auth/surface.ts, lib/auth/actions.ts (startOAuth refuses per server policy + refuses any redirect provider in a shell; callback `refuseSwitchedOffProvider` signs out sessions made by a disallowed provider via amr + newest identity; new `signInWithAppleIdToken` for the iOS native sheet), components/auth/{AuthChoices,NativeAppleSignIn,EmailAuthForm,Verifying}.tsx, sign-in/sign-up/email pages, capacitor.config.ts (`appendUserAgent: "VALLO-NATIVE"`), ios App.entitlements (applesignin), en.ts accountUsesGoogleOff; commits f076a248, aa084b35 (string), 2c… (junction test)
- EVIDENCE: providers.test.ts 11/11; provider-refusal.test.ts 7/7 (4 fail on old code: Google start not refused, Apple-on not started, native not refused, Google session not ended); native-ua.test.ts 1/1.
- TEST THAT WOULD HAVE CAUGHT IT: apps/web/src/lib/auth/provider-refusal.test.ts, providers.test.ts
- FOUNDER: docs/store/FOUNDER_STEPS.md §1 (Apple: App ID capability, Services ID, key, Supabase Apple provider with Client IDs `<servicesId>,com.vallospaces.app`) and §2 (Supabase → Providers → Google → Disable).
- NOTE: native Apple needs `@capacitor-community/apple-sign-in` (7.1.0, peer core >=7) in the binary — added to package.json with the other plugins in BATCH 2 (single lockfile change). Until then the button is simply not drawn (`isPluginAvailable`).
- NOTE for Agent 6: PRODUCT.md §8 "NOT BUILT AS DESCRIBED" (Google/Apple) and §10 row N-4 are now built as described except Apple-behind-config.
- REVIEW:

### STORE-03 — Google cannot complete in the native apps; AASA/assetlinks placeholders
- STATE: FIXED (Google refused in shells; callback comments/logic re-based) / FOUNDER (Team ID, two SHA-256)
- CHANGED: see STORE-02; AASA comment, AndroidManifest comment; check-deep-links wording.
- EVIDENCE: provider-refusal "refuses every redirect provider inside a native shell".
- TEST: provider-refusal.test.ts
- REVIEW:

### DOC-13 — deep-link gate red and in no gate
- STATE: FIXED (gated) / FOUNDER (values)
- CHANGED: apps/web/package.json `cap:sync` = write-shell-config && check-deep-links (strict) && npx cap sync, `cap:sync:dev` (--warn); check emits `::error` annotations under GITHUB_ACTIONS; .github/workflows/ci.yml step "Deep links (founder values)" with continue-on-error (drop when values land); commit d9e6d935
- EVIDENCE: `node scripts/check-deep-links.mjs` → exit 1 with the three placeholders named; native-sync-gate.test.ts 2/2.
- TEST: apps/web/src/lib/native/native-sync-gate.test.ts
- FOUNDER: docs/store/FOUNDER_STEPS.md §3.
- REVIEW:

### STORE-01 (+ UX-17) — developer offline card, retry reloads itself; "nothing was lost"
- STATE: FIXED (device test outstanding: airplane-mode cold start + warm toggle, needs a Mac/device)
- RE-VERIFY: native-shell/index.html still read window.Capacitor.getConfig (absent in @capacitor/core 8.5.2).
- CHANGED: native-shell/index.html (cards rewritten, script moved out), native-shell/shell.js (origin from build, probe then location.replace(origin+startPath), `online` auto-retry, "Still no connection" line), native-shell/shell-config.js (committed, production origin), native-shell/start-path.json, scripts/write-shell-config.mjs (fails if CAPACITOR_SERVER_URL unset/not https), package.json shell:config/cap:sync; app/error.tsx, (app)/error.tsx, global-error.tsx, offline/page.tsx (no "nothing was lost"; reference sentence only with a digest); UX-17 strings in en.ts and checkout/page.tsx; commit aa084b35
- EVIDENCE: offline-shell.test.ts 7/7 (runs shell.js in a vm: retry → replace(origin+path); unreachable → stays + "Still"; online → retries; no origin → needs-updating card; no window.Capacitor member outside definitions-internal.d.ts); honest-failure-copy.test.ts 8/8.
- TEST: apps/web/src/lib/native/offline-shell.test.ts, apps/web/src/app/honest-failure-copy.test.ts
- LEFT: UX-17 "Version 0.1.0" (needs the native build's version; batch 2 native work) ; UX-27 reset-only retry is not in my list.
- REVIEW:

### STORE-06 (+ UI-07, UX-26) — store badges inside the app, linking to /start; unbackable claims
- STATE: FIXED
- DECISION (web landing): badges linking to /start are false → removed until real store URLs exist; each badge renders only for `https://apps.apple.com/...` / `https://play.google.com/store/apps/details?id=...`.
- CHANGED: components/site/landing/{AppBand.tsx,store-badges.ts,LandingBody.tsx}, app/page.tsx (surface → AppBand omitted in shells), four locales (points.all/fast removed); commit b36e00e2
- EVIDENCE: store-badges.test.ts 3/3.
- TEST: apps/web/src/components/site/landing/store-badges.test.ts
- REVIEW:

### STORE-P2-03 — Take Video with no microphone string; camera string says never records video
- STATE: FIXED (device check outstanding)
- CHANGED: ios/App/App/Info.plist (NSMicrophoneUsageDescription added; camera string rewritten; stale "no crash reporting" comment corrected); commit d9e6d935
- TEST: apps/web/src/lib/native/ios-project.test.ts
- REVIEW:

### STORE-13 — universal app (iPhone + iPad)
- STATE: FIXED
- CHANGED: project.pbxproj TARGETED_DEVICE_FAMILY = 1 (both configs); Info.plist UISupportedInterfaceOrientations~ipad removed; commit d9e6d935
- TEST: apps/web/src/lib/native/ios-project.test.ts
- REVIEW:

#### Batch 1 review (Agent 5) amendments — 829025a6
- detectSessionInUrl:false on the browser client (lib/supabase/client.test.ts); 3 s timeout on /auth/v1/settings (fail closed); offline card claim "Your account is safe." → fact; CI comment precision. `/` already ƒ dynamic, live `cache-control: private, no-store`, `x-vercel-cache: MISS`.
- REVIEW: batch 1 APPROVED after amendments (orchestrator "A4 BATCH 1 FINAL 829025a6"); integrated as 5f04075d.

#### BATCH 2

### STORE-04 (+ STORE-15 code half) — thin native case, push not in native projects, app opens on marketing page
- STATE: FIXED (code) / FOUNDER (APNs key + Apple account; Firebase Android API key into google-services.json; device test)
- RE-VERIFY: Package.swift and capacitor.build.gradle listed 5 plugins, no push; start path `/`.
- CHANGED: merged release branch (repo-clean-work) first so the lockfile diff is only the new plugins; `npm install @capacitor/share@^8.0.2 @capacitor/haptics@^8.0.2 @capacitor/camera@^8.2.4`; `CAPACITOR_SERVER_URL=https://www.vallospaces.com npx cap sync` (Capacitor 8.5.2, ran on Linux: SPM Package.swift + gradle regenerated; 9 plugins incl. push-notifications). capacitor.config `server.appStartPath` from native-shell/start-path.json = `/open`; native-shell/open/index.html (iOS `appStartFileURL` must exist or `fatalLoadError`); app/open/route.ts (session → /home, else /search if VALLO_PUBLIC_CATALOGUE on, else /welcome; 307 no-store; public segment). lib/native/device.ts (Share/Haptics/Camera by name via the bridge; website loads nothing); ListingActions share → native sheet; Button pulse → native haptic in the shell; save → success haptic; ListingWizard "Take a photo" (native only) → same upload path; ThreadView mounts PushPrompt("conversation_active") once a thread has the other side's message and this person sent one. Commits 4887d059, 5f68babd.
- DROPPED: @capacitor-community/apple-sign-in 7.1.0 — its Package.swift requires capacitor-swift-pm `from: 7.0.0` (<8.0.0), which cannot resolve with Capacitor 8.5's exact 8.5.0 → iOS build would fail. Native Apple button stays hidden (isPluginAvailable) until a Capacitor-8 plugin exists; compliant because only email is offered (4.8 not triggered).
- EVIDENCE: device.test.ts 8/8 (web: nothing handled/loaded; shell: share sheet, cancel, missing plugin fallback, haptics, camera → image File); native-start.test.ts 5/5 (start path /open, capacitor.config hands it over, file exists in webDir, offline retry uses it, signed-out destination per switch); local prod build: /open → /search (switch on).
- TEST: apps/web/src/lib/native/device.test.ts, native-start.test.ts
- FOUNDER / MAC STEP: on the Mac, `npm ci && CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web` (refuses until deep-link values exist; use `cap:sync:dev` for a test build), open ios/App/App.xcworkspace, add capabilities Push Notifications (+ Associated Domains, Sign in with Apple when ready); APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY in Vercel; paste the Firebase Android API key into android/app/google-services.json. Record the 30-second review video: push arriving, share sheet, camera capture.
- NOT DONE: biometric wallet lock (no plugin chosen; STORE-04 item 4), offline caching (item 7), native hide of the site header on `/` (not reached: the app starts on /open).
- REVIEW:

### STORE-P2-04 (THE SIGN-IN WALL) — one switch
- STATE: FIXED (switch built, default OFF = current behaviour) / FOUNDER (the decision: set `VALLO_PUBLIC_CATALOGUE=on` in Vercel to open)
- CHANGED: lib/catalogue/public-access.ts, proxy.ts (`isPublicPath(path, {publicCatalogue})` can only add the six segments + /api/map/listings; anon catalogue page reads rate-limited per IP `anon_catalogue` 120/300 s → 429 + Retry-After), docs/PRODUCT.md §4 (flag only). Commits 8260759e, 150b66cd.
- UX-24 coordination: /u and people search stay gated regardless; the switch opens no profile surface.
- EVIDENCE: proxy-public-catalogue.test.ts 25/25 (OFF: all 7 catalogue paths → sign-in, "yes please" is not on; ON: 7 answer, 8 account paths still bounce, map 200 only when on, 4 other APIs 401, rate limit → 429). Local production build with the switch on and no session (Chromium): /search "64 properties found", /stays/search "69 stays", /restaurants, a rental listing, a stay, a restaurant — all 200, no 4xx responses, no error copy; /u/test, /messages, /wallet → sign-in. anon has no SELECT on listings/businesses/accommodations `address` (has_column_privilege).
- TEST: apps/web/src/proxy-public-catalogue.test.ts
- REVIEW:

### NEW-A4-01 — anon can read exact latitude/longitude on listings, accommodations, businesses (MEDIUM, latent)
- has_column_privilege('anon', …, 'latitude'|'longitude'|'location') = true on all three. Today every row with coordinates is an example (5 + 64 + 7, is_demo), so nothing real is exposed; the first real shortlet host who drops a pin publishes their home's exact point to anyone with the publishable key, switch or no switch. Belongs with SUP-06's "coarsen the public point" amendment. Not fixed here (not live-exposed; different owner).

### Gates (batch 2, after merging release)
- tsc 0 errors; lint 0 errors / 333 warnings; vitest 256 files, 3955 passed / 1 skipped; build exit 0 (tsconfig unchanged).

## Agent 5: truth on screen and content safety

### Ledger — Agent 5 (truth on screen, content safety)

### SEC-05 + STORE-P2-01 — objectionable-content filter on 2 of 8 surfaces; reviews/businesses not reportable
- STATE: FIXED — migration 20260923235821_content_scanner_on_every_surface applied to live after Agent 4's approval of the amendment
- RE-VERIFIED LIVE (2026-09-23): `blocked_terms` holds 133 rows in 12 categories (the handed claim "NO rows" is FALSE; A04's count stands). Only `scan_post` and `scan_social_profile` call `objectionable_pattern()`; `scan_message/review/review_response/story/story_comment/event` look only for 10-digit runs and payment words; no scan trigger on listings, businesses, accommodations, room_types or profile names. Old-DB demonstration (rolled back, `probe_a5_sec05_old_db`): spaced-slur post=LIVE, slur story comment=LIVE, "Mrs Loli Adeyemi is my landlady" post=HELD.
- CHANGED:
  - Pending migration: scratchpad/work/fix-a5/sec05.sql (to be committed as supabase/migrations/<version>_content_scanner_on_every_surface.sql after apply). It: adds `blocked_terms.action` (hold|flag); deletes `loli`, adds `lolicon`/`shotacon` + 8 more hold terms and 2 flag terms; demotes to FLAG (alert, content stays up) `coon, paki, wog, spic, chink, sambo, i will deal with you, call me on whatsapp, western union, moneygram` (real names/places/idioms/landmarks in Nigeria: Sambo is a surname, "spic and span", Western Union as a landmark); new `private.content_forms` (NFKD, accent strip, leetspeak in both 1->i and 1->l forms, edge punctuation stripped, spelled-out letters joined), `private.blocked_pattern(action)` (space in a term = optional space), `private.content_verdict(text)`, `private.open_content_alert` (dedupes open alerts), `private.content_writer_is_member()` (role GUC in authenticated/anon and not admin/super_admin — definer functions cannot use current_user; verified live that `current_setting('role')` stays 'authenticated' inside a definer). Rewrites the 8 scanners: posts/stories/story comments/events HOLD; reviews/host replies REFUSE with RM004 (no held state); messages open a risk alert (delivered, not dropped); handles/names REFUSE with RM004 for a member, and on the sign-up path (auth trigger) the public name becomes "Member" + alert so sign-up never breaks; bio no longer re-held on unrelated edits. New scan triggers `*_zz_content_scan` on listings, businesses, accommodations, room_types (see SEC-06 for the hold behaviour).
  - Code commit 11326ced: REPORT_TARGETS += review, business, event; ReportSheet on every written review (ListingReviews), stay page, restaurant page (listing or business target). RM004 mapped to the database's sentence in lib/reviews/actions.ts, lib/agent/reviews-actions.ts, lib/profile/actions.ts, lib/social/profiles-actions.ts (new lib/safety/content-refusal.ts).
- EVIDENCE IT NOW WORKS: proof `probe_a5_sec05_proof2` (whole migration + probe, rolled back) → `PROBE_OK sec-05`. 38-case matcher table: holds NIGGER, n1gger, "n i g g e r", n.i.g.g.e.r, Ñyamiri, chi1d porn, childporn, "call  girl", "whatsapp  me  directly", lolicon, f4ggot…; flags Coon Street, "I will deal with you…", "Call me on WhatsApp for inspection", Paki shop, Alhaji Sambo, "Spic and span", Western Union landmark, Wog Estate; clean: Mrs Loli Adeyemi, Scunthorpe, Pakistan embassy, spice market, raccoon, Lolita Estate, Kafiru Street, Igbo Efon, Nigerian names. Surfaces as the QA member through `authenticated`: clean post LIVE / spaced slur HELD; story clean LIVE / slur HELD; comment clean LIVE / slur HELD with reason; nickname "Loli" saved / slur refused RM004; handle slur refused RM004; bio slur HELD; DM threat delivered + 1 risk alert; review & host reply slur refused RM004 (live functions on scratch tables — a probe cannot mint a finished booking); event slur HELD; sign-up-path slur name → "Member". No migration row recorded; no function leaked.
- Gates (batch 1): typecheck 0 errors; lint 0 errors (335 warnings, pre-existing); vitest 244 files / 3893 passed / 1 skipped; build exit 0 (tsconfig unchanged).
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-05.sql; apps/web/src/lib/safety/user-generated-content.test.ts ("reporting reaches every public surface (STORE-P2-01)"); apps/web/src/lib/safety/content-refusal.test.ts
- NOT DONE / NOTES: there is no event page in the app UI (events are not surfaced anywhere a member can view one), so no event report control is mounted; `event` is an accepted target for when one exists. Deployed main shows its generic "could not save" copy for an RM004 refusal until the release branch ships (nothing published; compatible). Seeded terms beyond the 12 added are founder's call (FOR THE FOUNDER #5 answered by this demotion list).
- REVIEW: Agent 4 (a5-batch1-by-a4.md): 5 CHANGES REQUIRED. AMENDED (commit 32a7fb06 + migration v2 in scratchpad/work/fix-a5/sec05.sql): (1 HIGH) reviews/host replies now refuse only `abuse.*` (`content_verdict(text, 'abuse')`); `fraud.*` in a review/reply publishes and opens an alert; listings likewise hold only for abuse/tenant preference, scam wording → alert. (2) tenant-preference exclusions: boys' quarters/BQ, ladies' bar/salon/hairdresser/wear/toilet/hostel, "allowed in the rooms", "visitors after", Igbo Efon/Ora/Elerin/Ukwu. (3) normaliser: zero-width + soft hyphen stripped, 30 Cyrillic/Greek look-alikes mapped, runs of 3+ letters collapsed to 1 and 2 as extra forms, edge punctuation read before and after the leet map; new preference shapes: "X tenants not allowed / preferred / not welcome", "(we) prefer X", "strictly for X". (4) sec-06 re-proved against the LIVE owner guard (20260923232741): member DRAFT → reword → SUBMITTED (+1 alert); member publish branch kept only as defence in depth. (5) admin/server publish clears the scanner's own note (unless the admin wrote a new one). Proof `probe_a5_sec05_sec06_proof3` (whole v2 migration + both probe files as rolled-back temp functions): `RESULTS PROBE_OK sec-06 || PROBE_OK sec-05`; no migration row, nothing leaked. Matcher run `probe_a5_matcher_try2`: ALL PASS on 47 abuse cases + 7 scoped + 44 preference cases. AWAITING re-check.

### SEC-06 — discriminatory tenant preferences
- STATE: FIXED — same migration 20260923235821 (live)
- RE-VERIFIED: no scanner on listings; "No Igbo tenants", "Muslims only", "Married couples only" pass untouched today.
- CHANGED: `private.discriminatory_phrase(text)` (ethnic groups, religions, marital/family status, gender, in "no X" / "X only" / "only X" shapes, on the normalised forms); `private.scan_catalogue_text()` on listings (title, description), businesses (name, description), accommodations (name, description, house_rules), room_types (name, description): for a member writer, a match (or a hold-tier abuse term) HOLDS FOR REVIEW — reason written to `review_notes` (shown to the lister in /agent/listings), a PUBLISHED/APPROVED row goes back to SUBMITTED, a DRAFT keeps its status (not pushed into the queue), one alert when it is submitted/live; rewording clears the note; admins (own authenticated client) and server writers are never held. Never refuses. Wizard: inline warning while typing (lib/safety/tenant-preference.ts mirrors the SQL; commit 11326ced).
- EVIDENCE: proof `probe_a5_sec06_proof2` → `PROBE_OK sec-06`: 12 positive + 13 negative cases (near the mosque, Igbo Efon, No family land dispute, Men's salon, Muslim prayer room, no single room available…); member DRAFT "No Igbo tenants" saved as DRAFT with note "Held for review: … ("no igbo") …"; member setting it PUBLISHED lands SUBMITTED with 1 open alert; rewording clears the note; admin publishing a "Ladies only" listing stays PUBLISHED. vitest tenant-preference.test.ts (same table) passes.
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-06.sql; apps/web/src/lib/safety/tenant-preference.test.ts
- FOUNDER: add "marital status" to the /standards non-discrimination sentence (the hold note already names it) — one line of copy, a policy decision.
- REVIEW:

### SEC-05 / STORE-P2-01 / SEC-06 — APPLIED
- Applied 2026-09-23 as version 20260923235821 `content_scanner_on_every_surface`; committed byte-identical (md5 d5789855b3ef20e6c89831aef9fa8e14; the MCP transport turned the `\u0300`-style regex escapes into the literal characters, which are the same regex, and the committed file carries them as recorded). Includes the LOW follow-up from the re-check: "Men only barbershop" is not a tenant preference.
- Live probes after apply: `probe_sec_06` → PROBE_OK sec-06; `probe_sec_05` → PROBE_OK sec-05 (both against the live owner guard, nothing left behind).
- Live smoke through PostgREST as the QA member: benign DM ("Hello, is this place still available for an inspection next week?") inserted, 0 risk alerts; PATCH nickname to a slur → HTTP error `RM004 "That name uses words our content standards do not allow."` (proves the role-GUC member detection under PostgREST). A live review cannot be written: the QA member has no booking (demo listings refuse transactions); the review path is proven by the probe on the live function.
- blocked_terms now 144 rows (12 flag tier).
- Commits: 11326ced, 32a7fb06, and the migration commit.
- REVIEW: Agent 4 — APPROVED on re-check (a5-batch1-by-a4.md).

#### BATCH 2

### UI-03 / STORE-05 / UX-03 / UX-22 — claims without a mechanism
- STATE: AWAITING-REVIEW (code, commit ae1a41f3)
- RE-VERIFIED: live copy still had "Verified homes…" (landing lede), "Rent, buy or invest in verified properties" (home hero), /rent "Homes for real rent … Verified listings only" + "Every rental here is checked / Listings and agents are verified before they go live", agent pitch "Verified supply only / Every listing is checked by hand / where they are protected", "connect with verified guests", "get paid securely", landing stat "Verified agents" (platform_stats counts APPROVED agents, not verified), KYC and host consent text claiming a "processor" checks "identity and sanctions databases" (no such integration exists: grep for dojah/youverify/smile/prembly/sanctions = none), docs/careers/assistant/support/FAQ "every listing put up by a person we have checked" (false for the 64 examples), FAQ/support "passed ID and address checks" (the badge is tier 1, ID only).
- CHANGED (en + ha/ig/yo where the string exists): all of the above removed or reworded; Invest tile removed (it went to the same /search?market=buy as Buy) and dropped from the hero; Manage → "List a property"; Nearby → "Local talk / What people say" (it opens the social feed); escrow lede → "Disputes, decided on the record."; "safe" reassurances on sign-in walls, payouts, messaging maintenance, auth error reworded to facts; "one protected place" → "one place, on the record"; saved-search chip "Checked listings" → "Verified only" (the filter's own name); listing about-text "The agent and this property were checked" → "A person at Vallo checked the ID of the agent behind this listing" (listing.verified = agent badge only); review empty state "verified stays" → "stays booked and finished on Vallo".
- CLAIMS KEPT, WITH THE MECHANISM (for V-02's allowlist): "Verified" / "Verified agent|host|listing|account" / "verified tick|badge|mark" / "Identity|Address|Payout|Fully verified" → agent_verification_checks rungs decided by an admin + agent_badges.verified (lib/listings/supabase-repository.ts `verified: !is_demo && verifiedAgents.has(agent_id)`); "Address checked" → listings.address_verified_at (owner write guard, DB-02, makes it admin-only); "Registration/Mandate checked", "We checked the record on {date}" → supply verification rows; "agents checked by a person / every agent checked by hand before they can list / listers checked by a person" → agents rows are admin-only writes (agents_manage_admin policy); "checked before the listing goes live" → admin listing review queue + owner write guard; "secure payment page/window", "Secure payment in naira" → Paystack hosted checkout (card data never on Vallo); "protected with row level security" → RLS on profiles; "encrypted in transit, passwords hashed" (privacy, docs) → HTTPS/HSTS + Supabase Auth; "keep the service secure" → purpose statement; "checked out" (a stay), "Rooms checked" (the member's own inspection checklist), "checked many times" (payment polling), negations ("not protected by us", "not a guarantee", "have not checked", "not yet checked").
- "Secure and fast" (en AppBand points) is still on this branch only because fix/a4 b36e00e2 removes it (already integrated); not touched here to avoid a conflicting hunk.
- TEST: batch 3's V-02 build check encodes the allowlist; placebo/example/story tests below.
- REVIEW:

### UX-09 + UI-P2-01 — example stays and restaurants unlabelled one tap deeper
- STATE: AWAITING-REVIEW (commit ae1a41f3)
- RE-VERIFIED: StayDetailView/RestaurantFace had no is_demo branch; "Book now" / "Request a table" drawn for examples; DetailAnatomy drew the person-with-tick for every host.
- CHANGED: StayDetail.isExample (accommodation.is_demo || business.is_demo); RestaurantFace isExample (listing.isDemo or business.is_demo). Example → ExampleNotice under the name, availability card replaced by "Nothing here can be booked or paid for" + Browse real stays, rooms section says none can be booked, no Message button; example restaurant → notice + "Nothing here can be booked or held" instead of ReserveTable, no message link. Unverified host → BrandIcon person-card.
- TEST: apps/web/src/app/(app)/stay/[id]/example-disclosure.test.ts (fails on old code: no isExample anywhere).
- REVIEW:

### THE DEAD BRAND — "Listed by RentMe Example Collection"
- STATE: FIXED — applied as 20260924002102_the_example_collection_is_named_for_vallo (md5-identical file committed, 138ea05f); live `probe_dead_brand` → PROBE_OK; the 22 post ids are in the migration for a lossless reversal
- BEFORE (live): agents e0000000-…0002 display_name "RentMe Example Collection" (is_demo, 64 listings); profiles e0000000-…0001 display_name same; social_profiles.display_label same (handle example_collect); 22 SYSTEM posts "…places were open on RentMe…". No function/cron re-seeds the name (pg_proc hits only the handle blocklist). No code fallback (apps/web/src has "RentMe" only in comments).
- AFTER (proved in the rolled-back run): "Vallo Examples" on agent, profile and public identity; system posts say Vallo; anon reads no RentMe identity. Left alone on purpose: auth.users email / metadata of the example account (email is immutable by ruling; not shown), ai_messages / support tickets (people's own words).
- TEST: supabase/tests/probes/dead-brand.sql (fails on today's live data at the first check).
- REVIEW:

### UX-P2-01 / UX-P2-02 (+ NEW-A5-01) — placebo controls
- STATE: AWAITING-REVIEW (commit ae1a41f3)
- RE-VERIFIED: DataCard "Download my data" only set a note ("everything Vallo knows about you lives in this browser … ships with the launch release"); SecurityCard "Biometric app lock" wrote settings.appLock, read nowhere.
- NEW-A5-01 (HIGH, fixed): "Sign out everywhere" in the same card only showed "This is your only session … Once accounts launch, this control ends every session" — false (accounts are live; /settings/devices lists sessions and `endOtherSessions` really ends them). Removed with the other two.
- CHANGED: the three rows and their copy removed in en/ha/ig/yo (settings.security.appLock/appLockSub/signOutEverywhere/signOutNote, settings.data.download/downloadSub/exportNote); appLock dropped from the settings store. Real session ending stays on /settings/devices (DevicesRow). Coordination: Agent 6 (OPS-12) builds the real export and adds its own control.
- TEST: apps/web/src/components/app/account/placebo-controls.test.ts.
- REVIEW:

### /stories/new "It stays up" (handed item)
- STATE: FIXED (inverse of the handed item)
- RE-VERIFIED: nothing expires a story — stories-schema.ts ("It is not ephemeral. Nothing expires it"), no cron job touches public.stories, the select policy has no time bound. "It stays up" is TRUE. The false statements were the glossary (docs/PRODUCT.md "A picture post that expires") and the takedown refusal ("It may have expired"). Both corrected.
- TEST: apps/web/src/lib/social/story-permanence.test.ts.
- REVIEW:

Batch 2 REVIEW: Agent 4 APPROVED all four areas (a5-batch2-by-a4.md). LOWs taken in 138ea05f: bare "Secure payment in naira" → "Payment in naira through Paystack" (4 locales); example sentence and the new not-bookable lines routed through t.examples (en; ha/ig/yo fall back), test pins en = EXAMPLE_STATEMENT; post ids recorded in the migration. Code items → FIXED on approval.

Batch 2 gates: typecheck 0 errors; lint 0 errors (335 warnings, unchanged); vitest 3928 passed / 1 skipped; build exit 0.

## Agent 6: the long tail, the documents and the repository

### Ledger: Agent 6 (long tail, documents, repository)

Worktree /home/user/wt/a6, branch fix/a6, base 77cf90ad.

#### BATCH 1: repository cleanup (THE_AUDIT section 10)

### CLEAN-01 — root UUID PNGs
- STATE: AWAITING-REVIEW
- CHANGED: deleted 6 root copies byte-identical (md5) to docs/design/references/{2A49E2F7,50E032EA,55A56F21,6AF37222,77A54EA3,F6A8A482}; moved 4 admin renders (each viewed) to docs/design/references/admin/admin-01-overview.png (5EAA44CB), admin-02-listings-review-money.png (C1D98B3C), admin-03-escrow-verification-supply.png (8E9602E2), admin-04-moderation-operations-analytics.png (01F7DFC7). Readers updated: scripts/design/session-b-crops.mjs (4 path.join/RENDER), scripts/design/session-b-shots/admin-money.mjs, admin-review-shots.mjs; apps/web/public/brand/session-b/{inspection,send,signin}/SOURCES.md; comments in admin.css, inspection.css, auth.css, welcome/page.tsx, welcome.css, FirstRun.tsx. CATALOGUE.md gains an admin section mapping short id -> file.
- EVIDENCE: md5 pairs recorded in session; `git grep` for the 10 full UUID filenames outside docs/design/references and archive returns only references/ paths; check-css-tokens "0 comment paths that do not resolve".
- TEST THAT WOULD HAVE CAUGHT IT: check-css-tokens comment-path rule (existing) + markdown link scan (run by hand: 0 broken links outside docs/archive).

### CLEAN-02 — archive session scaffolding
- STATE: AWAITING-REVIEW
- CHANGED: git mv to docs/archive/: SESSION_B_SCOPE, BUILD_SESSION_B_LEDGER, BUILD_05_LEDGER, BUILD_07_LEDGER, HANDOFF_04/05/07/08/09, SESSIONS_CLOSE_OUT, BUILT_VS_PROVEN, PROMPTS_2026-09-22, PROMPTS_THE_FINISH, PROOF_RUN_2026-09-22, PLATFORM_SURVEY_2026-09-22, FOUNDER_ARTWORK_NEEDED, REFERENCE_UPLOADS_2026-09-22, TRACK_G_STATE, design/SWEEP.md, PLATFORM_STATUS, FOUNDER_OPEN_ITEMS. docs/archive/README.md: rows for each; its "live documents" line now names THE_AUDIT instead of PLATFORM_STATUS.
- DECISIONS: PLATFORM_STATUS archived (1,375-line cycle-4 report; correcting it to today would duplicate THE_AUDIT). FOUNDER_OPEN_ITEMS archived and folded: still-open items (Firebase key rotation, Secure Email Change, leaked-password needs Pro, delete-frees-address decision) added to THE_AUDIT section 11 "Carried from your working list". docs/research/ KEPT with new docs/research/README.md (evidence, not documentation) because code comments and apps/web/scripts/check-deep-links.mjs cite it by path.
- AUTH_EMAILS.md -> docs/email/AUTH_EMAILS.md (scripts/build-auth-emails.mjs x2, lib/email/reachability.test.ts, docs/email/WHAT_SENDS.md updated). WITHDRAWAL_PATH.md -> docs/wallet/ (README.md, docs/README.md links updated).
- Inbound paths: every `docs/<archived>.md` in live files rewritten to `docs/archive/...` (research docs got path-only updates). Migrations and THE_AUDIT findings text untouched. apps/web/scripts/check-deep-links.mjs:148 runtime message now points at docs/archive/BUILD_07_LEDGER.md.
- EVIDENCE: markdown link scan over all tracked .md outside docs/archive: 0 missing targets. Only test reading docs (lib/admin/reads/jobs.test.ts -> docs/ADMIN_CONSOLE.md) unaffected; vitest 242 files / 3859 passed.

### CLEAN-03 — proofs and .gitignore
- STATE: AWAITING-REVIEW
- CHANGED: git rm -r docs/design/proofs/session-b (about 1,900 files); .gitignore adds `docs/design/proofs/` with a comment. GLOW_IDENTITY.md notes its proof image is in history at 77cf90ad.
- EVIDENCE: du -sh docs 387M -> 162M (151M = docs/design/references incl. the 4 admin renders now there).
- NOTE: scripts/design/session-b-shots/sweep-settings.mjs reads a REF jpg from the deleted proofs tree; it is a one-off shot script and would need a fresh shot first. docs/design/NAV_STATE.md is generated from proofs/nav/*.json (deleted in the earlier cleanup); left as is (generated file, "do not hand-edit").

### CLEAN-04 — process narration in comments
- STATE: AWAITING-REVIEW
- CHANGED: every hit of the A11 grep (264 lines, 176 files) read and rewritten by hand, plus a second pass over "the lead"/"lead ruling R-x"/"scope request" narration (~40 more). Comment-only (plus: one vitest title in lib/admin/reads/badge.test.ts; script path constants covered in CLEAN-01). The R-A..R-G rules the comments cite are now defined in docs/DESIGN_DIRECTION.md section 1.1.
- LEFT ON PURPOSE: service worker / drain worker / vitest worker uses of "worker"; "this session" = browser session (AgentShell, device-identity, settings-store, saved/local); scripts/probes/m5_oversell.sh (two DB sessions); api/assistant, api/support, lib/social/bot-actions.ts untouched; scripts/design/nav-state.mjs code strings; session-b-crops.mjs template-literal text.
- EVIDENCE: tsc 0 errors; lint 0 errors (335 warnings, pre-existing), css tokens clean incl. "0 comment paths that do not resolve"; vitest 242/242 files, 3859 passed, 1 skipped.

### NEW-A6-01 — build-session names in admin-facing UI strings (LOW, not fixed)
- apps/web/src/app/admin/listings/MandatesPanel.tsx:51,114, admin/moderation/ModerationDesk.tsx:253, admin/moderation/page.tsx:485 show "Session A has not written (scope request AR-12/AR-10)" / "Session A's ledger records" to operators. eslint-rules/server-actions-export-only-actions.mjs:91,94 lint messages cite "BUILD_06_LEDGER 7.0". Copy change, not comment; left for a copy pass.

### BATCH 1 REVIEW (Agent 3: scratchpad/reviews/a6-batch1-by-a3.md)
- CLEAN-01/02/03 APPROVED. CLEAN-04 CHANGES REQUIRED, done in 1c474874: pointers to where data lives are repointed to docs/archive/ in registration.ts, registration.test.ts, profile.css, profile/page.tsx, push/devices.ts, desk.css, inspection.css, wallet.css, welcome.css, tokens.css (13.0), HomeScreen, MobileTabBar, PaystackCheckout and push/preferences. The two probe .log files are reverted to 77cf90ad. sweep-register usage writes to /tmp and names the archived copy. ICON_SYSTEM.md and design/audits/r1/findings.md note the proofs are in history at 77cf90ad. (ICON_SYSTEM.md in that commit also carries the DOC-11 line, which belongs to batch 2.)
- REVIEW: CLEAN-01..03 APPROVE; CLEAN-04 amended in 1c474874.

#### BATCH 2: documents and the audit record (commit f0993d5e)

### AUDIT-FACTS — THE_AUDIT updated with the post-audit facts
- STATE: AWAITING-REVIEW
- CHANGED: docs/THE_AUDIT.md. Each "could not confirm" or UNVERIFIED about EMAIL_REPLY_TO, SENTRY_DSN, NEXT_PUBLIC_SUPPORT_EMAIL or ANTHROPIC_API_KEY is now a confirmed finding marked "Confirmed after the audit (founder's read of Vercel, 23 September)". Lines touched: section 1 Vercel line, SEC-11 area (EMAIL_REPLY_TO), the unverified list and the founder steps in the A-sections, the STORE-08 nutrition row, the STORE unverified lines, OPS-03 fix step 3, OPS-06 WHY, the dependency table Sentry row, OPS unverified list and founder steps, the section 7-ish "CORRECTLY EMPTY" row (outbox SENT 16:00:05 + PENDING; push_tokens 0), section 8 Vercel line, section 11 item 6, "What worried me" (sessions closed 22:25 UTC), and section 10's opening line. Other agents' findings text was otherwise left alone.
- EVIDENCE: grep for "UNVERIFIED|could not be confirmed" now shows only the Vercel plan and runtime logs as unverified.

### DOC-12 + sign-in ruling — PRODUCT.md
- STATE: AWAITING-REVIEW. Section 4 now carries the 23 Sep ruling, the inverted PUBLIC list in proxy.ts, what the ruling accepts, and the public catalogue flag described generically (Agent 4 builds it; its name and default go into ENVIRONMENT.md when it ships). Section 7: Trips is allowed; banned copy is enforced by the vitest scan; BANNED_SYNONYMS is empty (DOC-08, code half not mine). Section 8: dark only; "fails the build" replaced with lint.
### DEPLOY.md — STATE: AWAITING-REVIEW. Changes: inline iframe replaces hosted redirect; proxy.ts replaces middleware.ts; AMADEUS_* and GOOGLE_PLACES_API_KEY removed from "optional" and added to "removed" (grep: no src reads them); the wrong MapTiler "never read" row dropped; sections renumbered 2.4/2.5/2.6 (ENVIRONMENT.md pointer fixed); vercel.json has 8 jobs; 4.4 now describes the Send Email Hook; section 1 counts refreshed; CI and its two repository Variables documented (from the a3 review); section 7 no longer says lint/test do not run or asks for light shots; section 9 rewritten to today.
### EMAIL_FROM default — the code default is `Vallo <hello@vallospaces.com>` (lib/email/client.ts:25, BRAND_DOMAIN). .env.example now says the same; DEPLOY and ENVIRONMENT already did.
### Env templates — .env.example adds YELLOWCARD_API_BASE/KEY/SECRET, VALLO_INSPECTION_REPORTS and VALLO_PREVIEW_HARNESS, drops the dangling HYBRID_INVENTORY header, and replaces the model-identifier default with a neutral note. apps/web/.env.local.example is DELETED (its two keys, MapTiler and VAPID, are in .env.example with fuller notes); FIRST_NOTIFICATION.md is repointed.
### DOC-16 — STATE: FIXED (AWAITING-REVIEW). ENVIRONMENT.md gains rows for every variable read. TEST: apps/web/src/lib/env-documented.test.ts scans apps/web/src for process.env/env./_VAR names and asserts each appears in .env.example and ENVIRONMENT.md, and that .env.local.example stays gone. Against the old files: 3 failed (the 5 missing from the template, 14 missing from ENVIRONMENT.md, and the second template). New files: 4/4 pass.
### DOC-10 / DOC-11 / DOC-14 (doc halves) — STATE: FIXED. Changed files: DESIGN_DIRECTION (rule 10 is lint; light-theme closing criterion; "103 objects + light twins"), design-tokens README, ADMIN_CONSOLE:657 (the test still passes), ICON_SYSTEM (no pre-commit scan exists; the eslint rule is the fix, not done: code, LOW), RECOMMENDATIONS T-1 is PARTLY CLOSED, RETENTION_SCHEDULE:19, CATALOGUE header.
### Auth email docs — AUTH_EMAILS.md section 1 and 1A are replaced by the measured truth. auth_logs 23 Sep show run_hook "Hook ran successfully" against /api/auth/email-hook on every sign-up, no mail_from, and the accounts verified. WHAT_SENDS.md verificationCode is LIVE and section 5 is refreshed. reachability.test.ts comment is updated.
- GATES: tsc 0; lint 0 errors / 335 warnings, css clean, valuation clean; vitest 243 files, 3863 passed, 1 skipped; markdown link scan 0 broken outside archive.
- NOT DONE (owned elsewhere or code): DOC-08 BANNED_SYNONYMS guard (content, A5); DOC-17 vitest.config header (tests, A3); README CI paragraph waits for CI green.

### BATCH 2 REVIEW (Agent 3: scratchpad/reviews/a6-batch2-by-a3.md) — amended in 12c88b52
- AUDIT-FACTS: now stated as measured at 23:47 UTC: email_outbox has 5 SENT and 0 PENDING; push_tokens has 1 web token, created 23:07:53 and revoked 23:08:21 (a test enrolment). The same numbers are in WHAT_SENDS.md and DEPLOY.md.
- DOC-16 test strengthened. It now scans helper-literal reads (envInt("NAME")), next.config.ts and capacitor.config.ts, and fails on an unexplained process.env[expr]. It requires a NAME= line (a comment mention does not count) and a code-formatted name in ENVIRONMENT.md. It found BOT_INPUT/OUTPUT_KOBO_PER_MTOK, NEXT_DIST_DIR and CAPACITOR_SERVER_URL (2 tests red before the docs were added); all are now documented. 7/7 pass.
- LOW fixes: VAPID_SUBJECT fallback order (SUPPORT_EMAIL first); PRODUCT open list adds start, preview and gallery.
- VALLO_PUBLIC_CATALOGUE (Agent 4) is documented in PRODUCT §4, ENVIRONMENT.md and .env.example. Note: it describes Agent 4's batch 2, which has not been integrated yet.
- PRODUCT Stay row and the BANNED_SYNONYMS sentence are aligned with fix/a3 (to avoid a merge conflict, and true once a3 batch 2 lands).
- Gates: tsc 0; vitest 243 files, 3866 passed, 1 skipped.

#### BATCH 3: the long tail

### SEC-08 + V-19 (the parts assigned to me) — commit c71b1878
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

### SEC-04 + OPS-13 — server-side metadata strip — commit af96550e
- STATE: AWAITING-REVIEW (PARTIAL: the upload-to-attach path is covered; see NOT DONE)
- RE-VERIFIED: PhotoManager uploaded the chosen File raw to the public `accommodation-photos` bucket; addBusinessPhoto, addAccommodationPhoto and the listing addPhoto inserted the row without reading the bytes; nothing server-side stripped EXIF.
- CHOICE: "strip in the attach action" (the stack supports sharp in a Node server action; bundled and traced: `.next/server/app/agent/list/page.js.nft.json` includes node_modules/sharp). The attach action downloads with the service role, detects exif/xmp/iptc through sharp metadata, applies rotate() and re-encodes with no metadata (keepIccProfile) in the same format, then upserts over the object BEFORE the row is inserted. It fails closed: an unreadable or unsupported file (HEIC, GIF, not an image) is removed and the attach is refused.
- CHANGED: lib/images/scrub.ts (new); lib/host/actions.ts (addBusinessPhoto, addAccommodationPhoto); lib/agent/listings-actions.ts (addPhoto, which covers a direct upload that skips the wizard); lib/host/photos.ts (the picker drops HEIC/HEIF so iOS converts to JPEG; adds HOST_PHOTO_BUCKET); photos.test.ts updated to match.
- TESTS: lib/images/scrub.test.ts uses a real JPEG fixture carrying a GPS IFD plus Make/Model (the fixture is asserted to carry them) and checks that after scrub there is no EXIF, no "PhoneMaker" or "Exif" bytes, it is still a JPEG, orientation 6 comes out upright (20x40), a clean PNG is untouched, GIF and junk are refused, and the stored object is overwritten in place or removed. lib/host/photo-scrub-wiring.test.ts checks the scrub runs on "accommodation-photos" before the insert, and that no insert happens when the scrub fails. Old actions.ts: 2/2 fail.
- GATES: tsc 0; vitest 249 files all pass; next build exit 0.
- NOT DONE: (1) An object is publicly readable at its random-UUID URL for the seconds between upload and attach. An upload that is never attached (orphan, or a deliberate direct upload) is never scrubbed. Closing that fully needs uploads to go into a private staging bucket, or a sweep job over public buckets: a new cron plus a handbook row (ADMIN_CONSOLE test) plus vercel.json, i.e. ops scope. Recorded for A3. (2) Private-bucket raw uploads (message attachments, inspection photos, escrow evidence) are readable by the counterparty and still carry EXIF. The same scrubStoredPhoto can be called from those attach actions; not done. (3) Resumable photo upload and the orphan sweep (OPS-13 items 2 and 3) are not done. (4) sharp is imported without a direct dependency entry in apps/web/package.json (it is present through next's optional dependency and the root override). Add `"sharp": "^0.35.4"` to apps/web dependencies once A3's lockfile lands, so the lock changes only once.

### SEC-12 + DB-17 — filed KYC documents fixed; admin Storage reads closed — commit f66ae15b + PENDING migration
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

### OPS-12 — subject access: self-serve data export — commit 74396b9d
- STATE: AWAITING-REVIEW (PARTIAL: the retention purge jobs in OPS-12 steps 1 and 2 are not done; they are cron and database work that needs the proof RETENTION_SCHEDULE asks for)
- RE-VERIFIED: no export path existed. Agent 5 removed the placebo "Download my data" (ae1a41f3); this adds a NEW control with NEW keys (settings.dataExport.*).
- CHANGED: lib/account/export.ts (49 owned tables plus wallet_entries and ai_messages through parent ids; read through the member's own session AND .eq(owner column, uid); a per-table failure is recorded as `unavailable`; paged 1000 at a time up to 20k rows; notIncluded lists what is left out). app/api/account/export/route.ts (401 when signed out; consume data_export 3 an hour; no-store; attachment vallo-data-<date>.json; nosniff). Settings → Privacy & Security gains a DataExportCard (RowDownload, a plain anchor so there is no prefetch). route-parents NON_NAVIGABLE entry. en keys. docs/SUBJECT_ACCESS.md runbook, indexed in docs/README.
- EVIDENCE: live, signed in as the QA member through the publishable key: every table readable (none unavailable); profile 1, social_profiles 1, user_roles 1, terms_acceptances 2, agent_applications 1, conversations 1, messages 1, notifications 1, push_tokens 1, the rest 0.
- TESTS: lib/account/export.test.ts (5: owner filter on every table, only own child rows, a refused table still returns the rest, pagination past 1000, notIncluded named) and app/api/account/export/route.test.ts (3: 401, attachment and no-store, 429 with retry-after). Before this change neither file nor the route existed, so no old-code run is possible.
- GATES: tsc 0; vitest 251 files pass (after the route-parents entry).

