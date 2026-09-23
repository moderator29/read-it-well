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

Compiled 2026-09-23 23:37 UTC from the six fixers' running ledgers.

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
- STATE: AWAITING-REVIEW (proved, not applied). Draft: scratchpad/work/fix-a1/new_a1_01_migration.sql. It adds a SECURITY INVOKER guard_listing_child_write trigger (00-named, BEFORE I/U/D) on listing_photos, listing_videos and listing_amenities: API non-staff writes only while the parent listing is DRAFT, MORE_INFO_REQUIRED or REJECTED. It adds a definer private.listing_media_locked(name) (EXECUTE for authenticated, which the storage policies need). It re-creates the four owner storage UPDATE/DELETE policies on listing-photos and listing-videos with `and not listing_media_locked(name)`, keeping roles={authenticated}.
- APP FLOWS CHECKED: every listing photo, video and amenity write in listings-actions.ts is already gated on EDITABLE (LOCKED_MESSAGE). deleteListing deletes the listing row first, which cascades the photo rows as owner, then removes the storage objects, which are no longer referenced, so they are not locked. Uploads use INSERT; only ApplyWizard and UploadCard use upsert, and those write document buckets, not listing media.
- NOT COVERED, by design: business_photos and accommodation_photos. The host flow files venue photographs at ANY status on purpose (lib/host/actions.ts ownedBusiness: "the moment a venue is APPROVED or PUBLISHED is exactly when its photographs arrive").
- EVIDENCE (rolled back): `PROBE_OK new-a1-01`. Covered: draft controls; after publish, refusals of photo add, reorder and remove, amenity add and remove, and storage overwrite (rows=0); service-role removal still works; after unpublish, reorder and storage update work again. Note: listing_photos has no admin RLS policy, so staff remove photos through the service role (unchanged).
- TEST: supabase/tests/probes/new-a1-01.sql (edfd0d26)

### DB-03 follow-up — firm staff could DELETE another firm member's listing (reviewer note)
- STATE: AWAITING-REVIEW (proved, not applied). Draft: scratchpad/work/fix-a1/listings_split_migration.sql. It replaces listings_owner_all with listings_owner_select (agent OR active firm member) plus insert/update/delete policies for the lister alone.
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

## Agent 5: truth on screen and content safety

### Ledger — Agent 5 (truth on screen, content safety)

### SEC-05 + STORE-P2-01 — objectionable-content filter on 2 of 8 surfaces; reviews/businesses not reportable
- STATE: AWAITING-REVIEW (code committed; migration PENDING, proven by rolled-back proof)
- RE-VERIFIED LIVE (2026-09-23): `blocked_terms` holds 133 rows in 12 categories (the handed claim "NO rows" is FALSE; A04's count stands). Only `scan_post` and `scan_social_profile` call `objectionable_pattern()`; `scan_message/review/review_response/story/story_comment/event` look only for 10-digit runs and payment words; no scan trigger on listings, businesses, accommodations, room_types or profile names. Old-DB demonstration (rolled back, `probe_a5_sec05_old_db`): spaced-slur post=LIVE, slur story comment=LIVE, "Mrs Loli Adeyemi is my landlady" post=HELD.
- CHANGED:
  - Pending migration: scratchpad/work/fix-a5/sec05.sql (to be committed as supabase/migrations/<version>_content_scanner_on_every_surface.sql after apply). It: adds `blocked_terms.action` (hold|flag); deletes `loli`, adds `lolicon`/`shotacon` + 8 more hold terms and 2 flag terms; demotes to FLAG (alert, content stays up) `coon, paki, wog, spic, chink, sambo, i will deal with you, call me on whatsapp, western union, moneygram` (real names/places/idioms/landmarks in Nigeria: Sambo is a surname, "spic and span", Western Union as a landmark); new `private.content_forms` (NFKD, accent strip, leetspeak in both 1->i and 1->l forms, edge punctuation stripped, spelled-out letters joined), `private.blocked_pattern(action)` (space in a term = optional space), `private.content_verdict(text)`, `private.open_content_alert` (dedupes open alerts), `private.content_writer_is_member()` (role GUC in authenticated/anon and not admin/super_admin — definer functions cannot use current_user; verified live that `current_setting('role')` stays 'authenticated' inside a definer). Rewrites the 8 scanners: posts/stories/story comments/events HOLD; reviews/host replies REFUSE with RM004 (no held state); messages open a risk alert (delivered, not dropped); handles/names REFUSE with RM004 for a member, and on the sign-up path (auth trigger) the public name becomes "Member" + alert so sign-up never breaks; bio no longer re-held on unrelated edits. New scan triggers `*_zz_content_scan` on listings, businesses, accommodations, room_types (see SEC-06 for the hold behaviour).
  - Code commit 11326ced: REPORT_TARGETS += review, business, event; ReportSheet on every written review (ListingReviews), stay page, restaurant page (listing or business target). RM004 mapped to the database's sentence in lib/reviews/actions.ts, lib/agent/reviews-actions.ts, lib/profile/actions.ts, lib/social/profiles-actions.ts (new lib/safety/content-refusal.ts).
- EVIDENCE IT NOW WORKS: proof `probe_a5_sec05_proof2` (whole migration + probe, rolled back) → `PROBE_OK sec-05`. 38-case matcher table: holds NIGGER, n1gger, "n i g g e r", n.i.g.g.e.r, Ñyamiri, chi1d porn, childporn, "call  girl", "whatsapp  me  directly", lolicon, f4ggot…; flags Coon Street, "I will deal with you…", "Call me on WhatsApp for inspection", Paki shop, Alhaji Sambo, "Spic and span", Western Union landmark, Wog Estate; clean: Mrs Loli Adeyemi, Scunthorpe, Pakistan embassy, spice market, raccoon, Lolita Estate, Kafiru Street, Igbo Efon, Nigerian names. Surfaces as the QA member through `authenticated`: clean post LIVE / spaced slur HELD; story clean LIVE / slur HELD; comment clean LIVE / slur HELD with reason; nickname "Loli" saved / slur refused RM004; handle slur refused RM004; bio slur HELD; DM threat delivered + 1 risk alert; review & host reply slur refused RM004 (live functions on scratch tables — a probe cannot mint a finished booking); event slur HELD; sign-up-path slur name → "Member". No migration row recorded; no function leaked.
- Gates (batch 1): typecheck 0 errors; lint 0 errors (335 warnings, pre-existing); vitest 244 files / 3893 passed / 1 skipped; build exit 0 (tsconfig unchanged).
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-05.sql; apps/web/src/lib/safety/user-generated-content.test.ts ("reporting reaches every public surface (STORE-P2-01)"); apps/web/src/lib/safety/content-refusal.test.ts
- NOT DONE / NOTES: there is no event page in the app UI (events are not surfaced anywhere a member can view one), so no event report control is mounted; `event` is an accepted target for when one exists. Deployed main shows its generic "could not save" copy for an RM004 refusal until the release branch ships (nothing published; compatible). Seeded terms beyond the 12 added are founder's call (FOR THE FOUNDER #5 answered by this demotion list).
- REVIEW:

### SEC-06 — discriminatory tenant preferences
- STATE: AWAITING-REVIEW (migration PENDING, same file as SEC-05)
- RE-VERIFIED: no scanner on listings; "No Igbo tenants", "Muslims only", "Married couples only" pass untouched today.
- CHANGED: `private.discriminatory_phrase(text)` (ethnic groups, religions, marital/family status, gender, in "no X" / "X only" / "only X" shapes, on the normalised forms); `private.scan_catalogue_text()` on listings (title, description), businesses (name, description), accommodations (name, description, house_rules), room_types (name, description): for a member writer, a match (or a hold-tier abuse term) HOLDS FOR REVIEW — reason written to `review_notes` (shown to the lister in /agent/listings), a PUBLISHED/APPROVED row goes back to SUBMITTED, a DRAFT keeps its status (not pushed into the queue), one alert when it is submitted/live; rewording clears the note; admins (own authenticated client) and server writers are never held. Never refuses. Wizard: inline warning while typing (lib/safety/tenant-preference.ts mirrors the SQL; commit 11326ced).
- EVIDENCE: proof `probe_a5_sec06_proof2` → `PROBE_OK sec-06`: 12 positive + 13 negative cases (near the mosque, Igbo Efon, No family land dispute, Men's salon, Muslim prayer room, no single room available…); member DRAFT "No Igbo tenants" saved as DRAFT with note "Held for review: … ("no igbo") …"; member setting it PUBLISHED lands SUBMITTED with 1 open alert; rewording clears the note; admin publishing a "Ladies only" listing stays PUBLISHED. vitest tenant-preference.test.ts (same table) passes.
- TEST THAT WOULD HAVE CAUGHT IT: supabase/tests/probes/sec-06.sql; apps/web/src/lib/safety/tenant-preference.test.ts
- FOUNDER: add "marital status" to the /standards non-discrimination sentence (the hold note already names it) — one line of copy, a policy decision.
- REVIEW:

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

