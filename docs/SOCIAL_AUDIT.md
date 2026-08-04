# Social Layer: a deep audit

Audited 2026-08-04 against the working tree, the 13 social migrations under
`supabase/migrations/2026080409*` and `2026080410*`, and the **live database**
(project `uccixoonmbhrnyczyigt`) read through the Supabase tools. Written in the
shape of `docs/DEAD_ENDS.md`: severity, finding, evidence, and one sentence about
what it costs a real person.

**Every finding below is evidenced.** Where the evidence is a live query or a
live experiment, the query and its result are quoted. Nothing here is an
impression, and where I could not prove something I have said so rather than
counted it.

**Freshness.** The lead is building the card system, compose, the feed and the
write actions in parallel, so this tree moved underneath the audit. Two things
that were true at the time of writing and may not be by the time you read this:
`apps/web/src/lib/social/posts-actions.ts` exists and the production build is red
on it (B2), and `components/social/feed/PostCard.tsx` and `PostGlyph.tsx` had
just appeared (M8). Everything else was verified against the database, which does
not move under anybody.

Counts: **4 BLOCKER, 9 SERIOUS, 12 MINOR.** Plus a cleared list at the end, of
things that look like defects and are correct by design.

---

## Blockers

A core loop cannot complete, or the data cannot be trusted.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| B1 | **Every post the safety scanner catches is REFUSED, not held.** `private.scan_post()` is a BEFORE INSERT trigger that sets `new.status := 'HELD'`. `posts_insert_self` is a WITH CHECK that demands `status = 'LIVE'`. PostgreSQL evaluates WITH CHECK **after** BEFORE ROW triggers, so the policy sees `HELD` and refuses the row with 42501. | `supabase/migrations/20260804105404_social_content_core.sql:318` sets HELD; `:373` demands LIVE. Proven on the live database with a throwaway table inside a rolled-back transaction: a BEFORE trigger setting `status='HELD'` against an insert policy `with check (status='LIVE')` returned `ERROR: 42501: new row violates row-level security policy`. The same shape, the same result. | Anyone whose post happens to contain a ten digit number or the word "bank" gets an opaque refusal instead of the honest "somebody is reading it before it goes up" that `hold_reason` was written for. The `risk_alerts` row rolls back with the transaction, so the moderation queue never hears about it either. The entire HELD path for posts is dead on arrival. |
| B2 | **CLOSED during this audit, by the lead.** ~~`apps/web/src/lib/supabase/database.types.ts` had not been regenerated since the content migrations landed, and the production build was red because of it.~~ Ten tables and four enums were missing from the generated types. | Was: `grep -c '^      posts: {' database.types.ts` returned 0, likewise `post_media`, `post_reactions`, `post_reposts`, `post_views`, `blocks`, `mutes`, `bot_invocations`, `badges`, `user_badges`, and the enums `post_kind`, `post_author_kind`, `post_mark`, `badge_audience`. `NEXT_DIST_DIR=.next-a2 npx next build` failed with `Type error: Argument of type '"posts"' is not assignable to parameter of type ...` at `lib/social/posts-actions.ts:90`. Now: all ten are present, `npm run typecheck` is clean and `next build` exits 0. | Recorded rather than deleted because it is the second time in two days that applied migrations and generated types drifted, and because the failure mode is a red build rather than a wrong answer, which is the good kind. |
| B3 | **There are zero areas in the live database, and zero ACTIVE ones.** The social layer has nowhere to happen. | Live: `select count(*) from public.areas` returns **0**; `... where status='ACTIVE'` returns **0**. Also `select count(*) from auth.users` returns 0. `docs/SOCIAL_BUILD.md:181` calls for "seed Lagos plus three to five areas inside it"; no seed exists in any migration. | `/around` shows only its empty state, the home area picker on `/u/[handle]/edit` has nothing in it, and `posts_insert_self` requires `area_id is null or the area is ACTIVE`, so nobody can post anywhere. The only route to an ACTIVE area is a proposal approved by an admin, and there is no admin because there is no user. |
| B4 | **View counts are forgeable without limit, by anyone, including anonymous visitors.** `post_views.viewer_bucket` is client supplied: it has no default, no trigger fills it, and `private.view_bucket()` is never called by anything. The insert policy is granted to `anon` and only checks `can_see_post`. Every insert bumps `posts.view_count` by one through `private.bump_post_counters()`. | `supabase/migrations/20260804105404_social_content_core.sql:410` (`post_views_insert ... to anon, authenticated with check private.can_see_post(post_id)`), `:138-143` (no default on `viewer_bucket`), `:121` (`private.view_bucket` defined and referenced nowhere). Live: `select ... pg_get_expr(d.adbin, d.adrelid) ... for post_views` returns `viewer_bucket=none`. Live: `select ... from pg_trigger where tgrelid='public.posts'::regclass` shows no trigger on `post_views` other than the counter. | "Seen by 1,204 around here" is a number anyone with the anon key and a loop can set to anything. The privacy design that rotates and deletes the daily salt is genuinely good and is currently attached to nothing. |

---

## Serious

A real user hits a dead end, or a rule the product states is not enforced.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| S1 | **`posts_update_own` guards who, and nothing else.** The USING clause is strict (own post, LIVE, within 15 minutes) but the WITH CHECK is only `author_id = auth.uid()`. Inside that window an author may set `like_count`, `repost_count`, `view_count` and `reply_count` to any value; move the post to another `area_id` with no ACTIVE check (the insert policy has one, the update policy does not); re-parent it by writing `parent_id`, `root_id` and `depth` by hand, because `private.place_post()` is BEFORE **INSERT** only; and write `hidden_by` or `removed_at` to fabricate a moderation record. | `supabase/migrations/20260804105404_social_content_core.sql:379-381`; `place_post` trigger registered at `:257` as `before insert` only; live `pg_policies` confirms `posts_update_own` check is `(author_id = ( SELECT auth.uid() AS uid))` and nothing more. | Every public number on a post is a claim the author can write themselves, and a reply can be moved under somebody else's thread without their consent. |
| S2 | **`posts.edited_at` is never set by the database, and the client controls it.** No trigger touches it, and `posts_update_own` permits writing it. | Live: triggers on `public.posts` are `posts_place (BEFORE)`, `posts_scan (BEFORE)`, `posts_showcase (BEFORE)`, `posts_tree_counters (AFTER)`. None writes `edited_at`. `posts_insert_self` requires `edited_at is null` at `:374`, so the only writer is the update path. | "Edited" is the one honesty marker on a post that other people rely on, and an author can edit while leaving it null. `docs/SOCIAL_BUILD.md:305` promises `edited_at` is shown; nothing makes it true. |
| S3 | **`social_profiles.follower_count`, `following_count` and `post_count` are writable by their owner, and the live UPDATE policy has no WITH CHECK at all.** | Live `pg_policies`: `social_profiles_update_self`, cmd UPDATE, `using (user_id = (select auth.uid()))`, **`with_check` is null**. `select polwithcheck is not null from pg_policy where polname='social_profiles_update_self'` returns **false**, while the mirrored file `20260804100526_social_foundations.sql:528-531` clearly writes `with check (user_id = (select auth.uid()))`. Postgres falls back to USING when WITH CHECK is absent, so the security outcome is the same, but **the mirror does not match the database**, which is the one thing `docs/HANDOFF.md` section 6 says migrations must never do. Separately, neither expression constrains any column, so the three public counts are the owner's to type. | A follower count is the number this product asks strangers to trust, and today its owner can set it to five figures with one PATCH. |
| S4 | **The post counters can only ever go up.** `posts_tree_counters` fires `after insert or delete`, and the product never deletes a post: removal is a status change to `REMOVED`, and the scanner holds with `HELD`. | `supabase/migrations/20260804105404_social_content_core.sql:214`. Removal by status is the documented design at `docs/SOCIAL_DESIGN.md:640` ("tombstones"). | A profile's public "Posts" number counts posts that were removed for being abusive, and an area's post count counts posts nobody can see. The number drifts permanently upward and nothing reconciles it. |
| S5 | **There is no admin or moderator policy on `social_profiles`, so a held bio can never be reviewed, released or removed by staff.** The only policies are `select (true)`, `insert_self` and `update_self`. | Live `pg_policies` for `social_profiles` returns exactly three rows, none of them admin. Compare `posts_admin_write` at `20260804105404:383`, which exists. The scanner writes a `risk_alerts` row (`20260804102009:34`) and that is the whole staff-facing outcome. | An admin looking at a high severity alert saying a bio contains an account number has no way to act on it. The only person who can clear the hold is the person who wrote it. |
| S6 | **Ten of the fifteen social tables have no application code at all.** | `grep -rn 'from("<table>")' apps/web/src` returns **0** for `posts`, `post_media`, `post_reactions`, `post_reposts`, `post_views`, `blocks`, `mutes`, `bot_invocations`, `badges`, `user_badges`, and **0** for `follows`. Only `areas` (12), `social_profiles` (11), `area_members` (9) and `area_moderator_applications` (6) are referenced. | Eleven tables, their RLS, their triggers and their indexes are shipped schema with no screen and no writer, which is the exact half the ONE LAW forbids. `posts` is in flight with the lead; the other ten are not. |
| S7 | **`follows` ignores `blocks` entirely, and a blocked person's profile stays fully visible.** `follows_insert_self` checks only that the follower is you and that the followee has a profile. `social_profiles_select` is `using (true)`. `private.blocked_with()` is used by `can_see_post` and `posts_select` and by nothing else. | `20260804101033_social_follows_and_profile_counters.sql:76-83`; live `pg_policies` for `social_profiles` shows `using_expr: true`; live scan of all policy expressions for `blocked_with` matches only the two on `posts`. `docs/SOCIAL_DESIGN.md:556` specifies "/u/[handle] blocked, either direction: 404". | Somebody you blocked can still open your page, read your bio, and follow you, and their follow still increments the count you see. Blocking is advertised as bidirectional invisibility and today it covers posts only. |
| S8 | **There is no `social` feature flag, and the flag reader fails open, so the social layer has no kill switch.** | Live: `select key, enabled from public.feature_flags` returns `bookings, wallet, messaging, assistant, support, agent_listings, hybrid_hotels, hybrid_restaurants`. No `social`. `apps/web/src/lib/flags.ts:29-47` returns `true` for a missing row by design. `grep -rn 'isFeatureEnabled' apps/web/src/lib/social` returns nothing: no social action consults a flag. `docs/SOCIAL_BUILD.md:158` requires it, default off. | At 2am with something going wrong on the social surface there is no switch to throw, and the surface is on by default rather than off. |
| S9 | **Nothing notifies anybody about anything social.** The `social` value was added to `notification_kind` in its own migration, correctly, and is written nowhere. A bio held by the scanner produces a `risk_alerts` row for staff and **no message to the person whose bio it is**. | Live: `notification_kind` values are `booking, message, wallet, listing, agent, support, system, social`. `grep -rn 'kind: "social"' apps/web/src` returns nothing. `20260804102009_social_profile_scan_severity_cast.sql:30-40` writes only `risk_alerts`. The one social notification that exists is written by `lib/social/admin-actions.ts:149` under `kind: "system"` for an area decision. | Somebody's bio silently stops being visible to anyone and they are never told. They find out only if they happen to reopen their own profile. |

---

## Minor

Cosmetic, internal, or a rule bent rather than broken.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| M1 | Two foreign keys have no covering index: `posts.area_id` and `area_moderator_applications.area_id`. `posts_area_feed_idx` looks like it covers the first but it is partial (`where parent_id is null and status='LIVE'`), so the planner cannot use it for the FK. Both cascade from `areas`. | Live query over `pg_constraint` joined against `pg_index` with `indpred is null`, filtered to the social tables, returns exactly `area_moderator_applications.area_id, posts.area_id`. | Archiving or deleting a busy area sequentially scans `posts`. Every other social FK is covered, so this is two lines rather than a pattern. |
| M2 | Four applied migrations have a different timestamp in the repository than in the database. `anon_execute_on_rls_helpers` is applied as `20260730021956` and mirrored as `20260730021500`; `admin_bootstrap` `090330` versus `090000`; `wallet_pay_confirmed_unpaid_booking` `122108` versus `124500`; `agent_documents_bucket_and_insert_policy` `122616` versus `130500`. | `list_migrations` against the live project versus `ls supabase/migrations`. All 13 social migrations match exactly; these four are older. | `supabase db push` from this repository would see four local migrations as unapplied and try to run DDL that already exists. Pre-social, but it is in the migration mirror and this audit covers the mirror. |
| M3 | Three security definer functions in `private` are executable by PUBLIC, against the platform's own hardening rule. `private.project_social_identity(uuid)` returns any user's display name and avatar from the private `profiles` table; `private.view_bucket(text)` mints today's view hash for any subject; `private.bot_spend_this_month()` returns platform spend. | Live `pg_proc.proacl` for the `private` schema: those three read `DEFAULT (public execute)`, while `can_see_post`, `blocked_with`, `is_area_member`, `is_area_moderator` and `social_media_access` all carry an explicit `revoke ... from public`. The pattern the platform set for itself is `20260728151253_harden_function_grants`. | Not reachable through PostgREST today, because `private` is not an exposed schema, so this is defence in depth rather than a live hole. It is one configuration change away from being a live hole, and it breaks a rule this codebase wrote down for itself. |
| M4 | `private.area_visible(uuid)` is referenced by no policy and no code, and is granted to `authenticated` only. | Live: scan of every `pg_policies.qual` and `with_check` in `public` for `area_visible` returns none. `grep -rn 'area_visible' apps/web/src` returns none. Created at `20260804100526:200`. | A dead helper. Worth noting because the grant asymmetry (no `anon`) is exactly the shape that caused a launch-blocking 42501 before, so if it is ever wired into a policy the anonymous read path breaks. |
| M5 | `leaveArea` and `withdrawModeratorApplication` have no rate limit, while `joinArea` and `applyToModerate` do. | `apps/web/src/lib/social/areas-actions.ts:157-175` (no `consume`), `:231` (no `consume`), against `:123` and `:196` which both consume. | Join and leave can be cycled freely, and each cycle fires `private.bump_area_member_count()` against the same `areas` row, which is unthrottled write amplification on a hot row. |
| M6 | The Around pages pad themselves inside a container that is already padded. `.nf-shell` sets `padding-inline: 1.25rem` and the pages add `px-4`. | `apps/web/src/app/(app)/around/page.tsx:45` and `[slug]/page.tsx:55` both use `mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:px-6`; `apps/web/src/app/globals.css:2764-2769` defines `.nf-shell`; every other app page (`/profile/page.tsx:59`, `/u/[handle]/page.tsx:41`) uses `mx-auto max-w-2xl` with no extra padding. | At 390px the Around pages have 36px of side gutter where the rest of the product has 20px, so the social surface is visibly narrower than the app it lives in. |
| M7 | `--nf-brand-primary-soft` is used as a fill on a chip in the new card. It is electric blue mixed at 16 per cent, which lands in the lavender range over a white card and breaks the no purple rule on paper. | `apps/web/src/components/social/feed/PostCard.tsx:314`. I hit the same thing on the selected contact policy row and replaced it with a brand ring: `apps/web/src/components/social/profile/ProfileEditor.tsx:288-296`. | On the paper theme a brand chip reads violet, which is the one hue the owner has ruled out twice. |
| M8 | The card system landed in `apps/web/src/components/social/feed/`, while the agreed scope puts `PostCard`, `PostMenu`, `PostGlyph` and `ActionRow` in `apps/web/src/components/social/post/`. | `find apps/web/src/components/social -type f` returns `feed/PostCard.tsx` and `feed/PostGlyph.tsx`; `docs/SOCIAL_BUILD.md:128` and my own brief both name `components/social/post/**`. | Two people can write the same component in two directories without a conflict ever surfacing. Worth one decision, either way, before there are four files in each. |
| M9 | The platform back control is 36x36 at 390px, under the 44px touch target the design system asks for. | `apps/web/src/components/app/PageHeader.tsx:53`: `h-9 w-9 sm:h-10 sm:w-10`. Measured live at 390px: `button 36x36 "Back"`; at 768 and 1280 it is 40x40, still under 44. | Platform-wide and pre-existing rather than social, but it is the primary navigation affordance on every social page and it is the smallest target on them. Same measurement flagged `a 165x40 "Suggest a place"` on `/around` and the shell's own theme toggle at 36x36. |
| M10 | `/around/[slug]` promises a feature that does not exist. "When posting opens here you will be the first to know." | `apps/web/src/app/(app)/around/[slug]/page.tsx:161`. | Owner rule 13 bans "not live" strings; this is that sentence in a friendlier jumper. The empty state is otherwise good and only needs the promise removed. |
| M11 | The area row truncates its own meta line, which carries the member count and its label. | `apps/web/src/app/(app)/around/page.tsx:189-193`, `truncate` on the paragraph holding `Estate · Lagos · 12 members`. | "Never truncate a label" is a house rule because the label is the meaning of the number beside it; at 390px with a Join button on the row this line has about 180px to live in. |
| M12 | There is no `loading.tsx` anywhere in the application, and every social route is `force-dynamic` with two to four sequential round trips to Supabase. | `find apps/web/src/app -name loading.tsx` returns nothing; `app/error.tsx` and `app/not-found.tsx` both exist and are designed. `around/page.tsx:207`, `around/[slug]/page.tsx:10` set `force-dynamic`. | On a slow Nigerian connection the browser holds the previous page with no feedback for the whole round trip, so a tap on Around appears to do nothing. |

---

## Checked and cleared: correct by design

Each of these looks like a defect under a naive read and is not one.

- **`bot_invocations` has no INSERT policy.** Deliberate: it is written by the service role only, the same shape as `notifications`. Live check confirms it is the only social table with no INSERT or ALL policy.
- **RLS is enabled on every table in `public`.** Live: the query for tables with `relrowsecurity = false` returns none. The three `rls_enabled_no_policy` security advisories (`idempotency_records`, `places_cache`, `rate_limits`) are all pre-social and all correct: those tables are reached only through security definer functions.
- **`auth.uid()` is wrapped in a scalar subquery in every social policy.** I read the live `qual` and `with_check` of all 28 policies across the ten social tables; every occurrence is `( SELECT auth.uid() AS uid)`.
- **The migration mirror matches the database for all 13 social migrations**, by version and by name. Only the four legacy ones in M2 disagree.
- **`pgcrypto` is installed**, in the `extensions` schema, so `private.view_bucket`'s `extensions.digest` and the `view_salts` default resolve. `citext`, `postgis` and `pg_cron` are still absent and nothing in the social layer depends on them, exactly as designed.
- **No horizontal scroll anywhere.** Measured at 390, 768 and 1280 in both themes on `/around`, `/around/new`, `/u/[handle]` and `/u/[handle]/edit`: `document.scrollWidth - clientWidth` was 0 on all 24 combinations.
- **No em dash, no `Icon3D`, no `Icon` import, no `ramp` prop, no American spelling** anywhere under `lib/social`, `components/social`, `app/(app)/around`, `app/(app)/u` or `app/admin/social`.
- **The mark set is original.** `components/social/feed/PostGlyph.tsx` is built from a stroke, a node and a gap on a 24 grid, with no heart, no speech bubble, no recycle arrows and no eye.
- **`/around/<unknown slug>` renders the designed `app/not-found.tsx`**, not a raw 404, and answers 404 rather than 200.
- **The `social` notification kind was added alone in its own migration** (`20260804105241`), which is the correct handling of a new enum value. It is unused, which is S9, not a defect in the migration.

---

## What is missing, ranked

The lead's own list was: post write actions, compose, the feed, the thread view,
reply, like, repost, view recording, the `…` menu wired to real block and mute
and report, the AI summon path, badge awarding, and social notification rows. All
of that is genuinely absent and is confirmed by S6. Here is what I would add, in
the order I would do it.

1. **Seed the areas** (B3). Nothing else in the layer can be exercised, tested or
   screenshotted with real data until at least one area is ACTIVE. This is one
   insert and it unblocks every other item on this list.
2. **Fix the HELD insert path** (B1) before compose ships, not after. Once posting
   is live, every caught post becomes a support ticket rather than a held row.
3. **Regenerate the types** (B2). Everything is blocked on it right now.
4. **Make the counts unwritable** (B4, S1, S3): a BEFORE trigger that overwrites
   `viewer_bucket`, and either column grants or a trigger that pins the count
   columns to their old values on UPDATE. The projection trigger
   `private.fill_social_identity` is already the right pattern and already
   protects `display_label`, `avatar_path` and `is_agent`; the counts need the
   same treatment.
5. **A staff path for held content** (S5): `social_profiles` needs an admin
   policy, and `/admin/social` needs a held queue for both bios and posts.
6. **Block coverage beyond posts** (S7): `follows`, `social_profiles` and the
   profile route.
7. **The `social` feature flag** (S8), inserted default off, and read by every
   social action.
8. **A reconciliation for `post_count`** (S4), or count `status = 'LIVE'` at read
   time and stop storing it.

---

## Fixed during this audit, inside my own scope

Three, all verified with `npm run typecheck` (0 errors),
`NEXT_DIST_DIR=.next-a2 npx next build` (exit 0),
`BASE_URL=http://localhost:3212 node tests/social-profile.spec.mjs` (all checks
passed) and 390px screenshots in both themes that I looked at.

- **A blocked profile now answers as unavailable rather than rendering in full**
  (part of S7). `apps/web/src/lib/social/profiles-queries.ts` gains a `blocked`
  state and `/u/[handle]` a designed screen for it. **This is half a block and
  the file says so in a comment**: `blocks_select_own` only lets a person read
  the blocks they made, so "I blocked them" is answerable and "they blocked me"
  is not, because `private.blocked_with()` lives in a schema PostgREST does not
  expose. The other half needs either a `public` wrapper over that helper or the
  helper applied to `social_profiles_select`, and both are the lead's.
- **A designed loading state for the profile routes** (M12).
  `apps/web/src/app/(app)/u/[handle]/loading.tsx` renders the real layout, so
  nothing moves when the data lands, plus `.nf-social-skeleton` in
  `apps/web/src/app/social.css`. This covers `/u/[handle]` and
  `/u/[handle]/edit` only; every other route in the application still has none.
- **The profile empty state now points at `/around`** rather than `/search`,
  because the place is the thing worth talking about and `/around` now exists.

Two things nobody has mentioned that the product will need early:

- **There is no `/u` index and no way to find a person.** Handles are reachable
  only if you already know them. A follow graph with no discovery surface is the
  same criticism `SOCIAL_DESIGN.md` levelled at the follow graph it originally cut.
- **Nothing writes `area_members.residency_source` or `residency_verified_at`.**
  `RESIDENT` is designed to be earned from a completed stay, an invite or presence
  over time (`docs/SOCIAL_DESIGN.md:355-362`), and the only writer of
  `area_members` is `joinArea`, which pins `role = 'MEMBER'`. Every defence in the
  utility record rests on residency being earned, and nothing earns it yet.
