# Where the example listings stopped showing

Read-only probe, Session B worker "examples-probe", 23 September 2026.
Founder item 1 ("Example listings look gone"). Nothing was restored, written
to the database or changed in product code.

## The answer in one paragraph

No filter hid the example listings. The whole property catalogue failed for
everybody who was not staff. Track G migration 6 (commit `4ba9f66b`, Session A,
applied live as `20260922221913` at 22:19 UTC on 22 September) revoked EXECUTE
on `private.owns_listing(uuid)` from `anon` and `authenticated`. Seventeen RLS
policies call that function, including `listings_owner_all`, so every SELECT on
`listings`, `listing_photos`, `listing_amenities`, `listing_videos` and
`reviews` raised `42501 permission denied for function owns_listing`. The
catalogue reads in `lib/listings/supabase-repository.ts` turn any error into an
empty list (`if (error || !data) return []`), so every surface drew its honest
empty state instead of an error. The 64 rows never went anywhere. A second,
smaller cause was stacked on top on 23 September: commit `22e544f5` (09:42 UTC)
put `listing_role` into both listing selects while `anon` had no column grant on
it. Session A found and closed both in migration `20260923103430`
(commit `83c03d66`), live at 10:34 UTC on 23 September. The live grants read
back correct now.

## 1. The rows (live, SELECT only)

| Table | Rows | State |
|---|---|---|
| listings | 64 | all `PUBLISHED`, all `is_demo = true`, `demo_retire_after` 2026-11-07 on all 64 (none past), `featured` false on all 64, `listing_role = 'agent'` on all 64 |
| listing_photos | 228 | |
| businesses | 7 | all `PUBLISHED` |
| accommodations | 5 | all `PUBLISHED` |
| posts | 75 | 74 `LIVE`, 1 `REMOVED`; none carries a `listing_id` |
| profiles | 7 | |
| areas | 9 | all `ACTIVE` |

All 64 listings have `updated_at = 2026-09-22 22:15:50`: that is the Track G
backfill of `listing_role`, not a status change.

## 2. The policies and grants (live, now)

- `listings`: `listings_select_published` (status = PUBLISHED), plus
  `listings_owner_all` (`private.owns_listing(id)`) and `listings_admin_all`
  (`private.has_role`). RLS ORs them, but the executor needs EXECUTE on every
  function in every applicable policy, so losing EXECUTE on `owns_listing`
  refuses the whole statement, not just the owner branch.
- `listing_photos`, `listing_amenities`, `listing_videos`, `reviews`: published
  EXISTS OR `private.owns_listing(listing_id)`: same failure.
- `businesses`, `accommodations`, `catalogue_entries` (Stays): published only
  plus `has_role` / `owns_business`, never lost EXECUTE: Stays was not affected.
- `posts`: `LIVE` in an active area, `private.blocked_with`: not affected.
- `anon` holds column-level SELECT on `listings`, not table-wide. Every column
  in `LISTING_SELECT` and `LISTING_DETAIL_SELECT` is granted today, including
  `listing_role` and `is_demo`. Withheld from anon, correctly: `address`,
  `landmark`, `reviewer_id`, `review_notes`, `verified_by`, `listing_fee_*`,
  `firm_id`, `ownership_verified_at`, `mandate_verified_at`,
  `supply_verified_by`.
- `has_function_privilege` today: `owns_listing`, `has_role`, `owns_business`,
  `blocked_with`, `auth.uid()` all EXECUTE for `anon` and `authenticated`.
  `listing_lister` (the view added at 10:38) is SELECT for both.

## 3. The founder's three candidates, each checked

| Candidate | Finding |
|---|---|
| The `platform_stats` filter spreading | Refuted. `platform_stats()` filters `not is_demo` inside its own body only. The functions that filter `is_demo` are `platform_stats`, `area_suggestions`, `area_asking_summary`, `area_supply_census`, `area_utility_facts`, `comparable_listings`, `comparable_supply_near` (stats and Price Check, as the rule says) plus write-side triggers. `listings_in_bounds` (the map) and `stays_search` RETURN `is_demo`, they do not filter on it. No view filters `is_demo`. In code, `excludeDemo` is set in four places, not three: assistant, syndication, retirement, and `lib/saved/search-alerts.ts:105` (saved-search emails). None is search, home, feed or a listing page. |
| The category tiles losing their counts | Refuted as a cause. The counts came off the home tiles before 22 September (HANDOFF 09 section 1.1, comment in `app/(app)/home/page.tsx`), and no commit since the repo import touched them. |
| A featured query that now returns nothing | Refuted. There is no featured-only query. `featured` is an ORDER BY in `search()`; `recommended()` and the landing's `featured` both come from `search()`. All 64 rows have `featured = false` and have had it before today. |

## 4. The path, surface by surface

Every property surface reads through the same `search()` or `byId()` in
`apps/web/src/lib/listings/supabase-repository.ts`, which swallows the error.

| Surface | Read | What it drew during the outage |
|---|---|---|
| `/` landing (signed out) | `landingData`: `repo.recommended(5)`, `repo.search()` | featured card and catalogue empty; stats band unaffected (it is `platform_stats`, which is SECURITY DEFINER and never lost anything, and correctly counts 0 real listings anyway) |
| `/home` (signed in; signed out is sent to sign in by `proxy.ts`, unchanged) | `repo.recommended(6)` | "Nothing to show here yet" empty shelf |
| `/search` | `repo.search(filter)` | empty results |
| `/listing/[id]` | `repo.byId` / `byReference` | not found |
| `/saved` | `loadListingsByIds` | empty shortlist |
| map | `listings_in_bounds` RPC (SECURITY INVOKER, same RLS) | 42501 |
| feed | `posts` | unaffected (no post carries a listing) |
| `/stays` | `stays_search` over `catalogue_entries` | unaffected |

`proxy.ts`: the only change since the import is `aea2e4ef` (22 Sep 20:07,
Session B) removing `welcome` from `PRODUCT_SEGMENTS`. It did not touch
`search`, `listing`, `home` or anything a browser reaches; `/home` was already
behind sign-in before it.

## 5. The commits

| Commit | When (UTC) | Session | What it did |
|---|---|---|---|
| `4ba9f66b` | committed 22 Sep 22:33; migration applied live as `20260922221913` at 22:19 | A | `supabase/migrations/20260922230500_track_g_6_the_firm_arm_on_owns_listing_and_the_publish_gate.sql` lines 81 to 83: `revoke execute on function private.owns_listing(uuid) from anon;` and `from authenticated;`. The `create or replace` beside it was correct; the restated rule-21 revoke on a policy helper was the outage. Undid `20260730021956_anon_execute_on_rls_helpers.sql`, which exists for exactly this. |
| `22e544f5` | 23 Sep 09:42 | A | Added `listing_role` to `LISTING_SELECT` and `LISTING_DETAIL_SELECT`. `listing_role` (Track G migration 3) had no column grant to `anon`, so the signed-out catalogue would have failed on this alone. |
| `83c03d66` (migration `20260923103430`) | live 23 Sep 10:34 | A | Restored EXECUTE on `owns_listing` to both roles and granted `anon` SELECT on `listings.listing_role`. Its probe log (`scripts/probes/track_g_catalogue_grants.log`) records BEFORE: 42501 for anon and authenticated over 64 rows; AFTER: both read all 64. |
| `1c61ea00`, `18abdd5c` | 23 Sep 11:00 | A | The class check for policy callers holding EXECUTE, and the ledger entry. |

Outage window: 22 Sep 22:19 to 23 Sep 10:34 UTC for everyone non-staff;
anon additionally from the deploy of `22e544f5` until 10:34.

## 6. Owners (per `docs/archive/SESSION_B_SCOPE.md`)

- Migrations: Session A (Session B never edits a migration).
- `apps/web/src/lib/listings/**`, listing pages, `proxy.ts`: Session A (listing
  files outside `app/admin/**` are listed as never-edit for Session B).
- No Session B file is on the path. Session B's reads (profile, wallet,
  inspections, admin) were not the cause.

## 7. Smallest fixes (described, not applied)

1. The cause itself: already fixed live by `20260923103430`. Nothing left to
   restore; do not re-flag or re-publish any row.
2. Stop the silence (Session A, `supabase-repository.ts`): in `search()`,
   `byId()`, `byReference()` and `loadListingsByIds()`, when `error` is set,
   log it on the server before returning the empty
   value, or throw on a `42501`/`42703` so the page's error boundary shows a
   fault instead of "Nothing to show here yet". An outage and an empty market
   must not draw the same screen. This is the reason the founder saw "gone"
   rather than "broken".
3. Guard the class (Session A): `1c61ea00` adds the probe that every function
   named in a policy is executable by the roles the policy applies to; run it
   in CI against the migration set, and add a unit spec that every column in
   `LISTING_SELECTS.card` has an anon column grant in the migrations.
4. Latent, same shape, not visible today (Session A): `private.attachment_path_access`,
   `private.can_see_listing_access`, `private.escrow_evidence_path_access` lack
   EXECUTE for `anon` (Session A's probe log lists them).
5. Latent, unrelated to today, found on the way (Session A, feed):
   `lib/social/posts-queries.ts` `readPostListings` selects
   `price_per_night_minor, price_period`, which do not exist on `listings`
   (live `information_schema` returns 0 of the 2). It errors 42703 every time
   and returns an empty map. No post carries a `listing_id` today, so nothing
   renders wrong yet; the first post about a listing would show no plate. The
   same function marks every plate `verified: true`, which would label an
   example listing as verified. Session B's "Deleted posts" claim on that file
   covers only the status filter, so this is Session A's.

## 8. What was not verified, honestly

- Step 3 (serve two builds and load the pages) was not done. This container's
  egress policy refuses CONNECT to the Supabase project host (403 from the
  agent proxy), so any locally served build reads nothing and would show empty
  whatever the code; a bisect on it would prove nothing. The Vercel tools need
  an approval this worker does not have, so production pages and runtime logs
  were not read.
- `SET ROLE anon` is refused to the read-only SQL user, so anon reads were
  proved by `has_function_privilege`, `has_column_privilege`,
  `has_table_privilege`, `pg_policies` and the ACLs on `pg_class` /
  `pg_attribute` / `pg_proc`, plus Session A's recorded BEFORE/AFTER probe, not
  by a live anon query from here.
- Whether production is currently serving a build that includes `22e544f5` is
  not read; it does not matter to the verdict, because the grants now satisfy
  both the old and the new select.
