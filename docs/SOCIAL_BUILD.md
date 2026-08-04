# AROUND: the complete build order

The build that follows from `docs/SOCIAL_DESIGN.md`. That document argues the
shape. This one is every migration, policy, action, screen, notification and
test, in the order they get written.

**Nothing in here starts until the owner says go.**

Companion documents: `docs/SOCIAL_DESIGN.md` (the argument),
`docs/BADGES.md` (standing, unchanged and folded in at slice 7),
`docs/SOCIAL_TODO.md` and `docs/SOCIAL_LAYER.md` (superseded, kept for history).

---

## 0. The rule every slice obeys

A slice is DONE only when the full loop closes:

1. A UI action a real person can take
2. A validated server action returning the `ActionResult` envelope
3. A database write that survives RLS
4. The UI showing the new reality **after a reload**
5. The notification or email the event deserves
6. A node spec proving all of it

**No slice ships a table without a screen, or a screen without a write path.**
The slices below are ordered so that each one is independently shippable and
independently valuable. If we stop after slice 1 we have shipped a real
product, not a foundation.

Per slice, in this order: migration, functional probe, action, UI, notification,
spec, 390px screenshots dark and light, lead re-audit, commit.

---

## 1. Ground rules that apply to every slice

**Database**
- RLS enabled at creation on every table. No exceptions.
- `auth.uid()` wrapped in a scalar subquery inside every policy, for the planner.
- Every foreign key gets a covering index.
- `anon` gets EXECUTE on the read-path RLS helpers, deliberately, and
  deliberately NOT on anything that could reach a wallet. One non-public row
  breaking the whole anonymous read with 42501 has already happened once here.
- **A migration succeeding does not mean the function works.** Every slice runs
  a functional probe after applying, never just a success check.
- `create or replace function` cannot rename parameters. DROP first.
- `NULL is not false`. Wrap comparisons in `coalesce` and re-count rather than
  trusting a success.
- All subqueries in one SELECT share a snapshot. Verify a function's effect in a
  separate statement.
- Every applied migration mirrored into `supabase/migrations/` with a timestamp
  prefix, so the repository never lies about the database.

**Verified against the live database this session, and binding:**
- `citext` is **not installed**. Handles are `text`, lowercase, with a unique
  index and a charset check constraint.
- `postgis` is **not installed**. Coordinates are `numeric` lat and lng, exactly
  as `public.listings` already stores them.
- `pg_cron` is **not installed**. **Nothing in this build blocks on it.** Expiry
  is a read-time filter, the utility recompute is a synchronous trigger.
- `public.notification_kind` is an enum without a `social` value, and a new enum
  value **cannot be used in the same transaction that adds it**. Slice 3 adds it
  in its own migration and uses it from the next one.
- `public.reports.target_type` is already `text`. Social target types need no
  migration.

**Money**
- Integer kobo, `bigint`, everywhere. Display only through `formatMoney`.
- Nothing in the social layer charges anyone anything.

**Frontend**
- A passing typecheck is not a passing build. Shared constants a client
  component needs go in a client-safe `*-schema.ts`.
- Mobile-first at 390px, then up. Both themes, every surface.
- `BrandIcon` for content objects, `UiIcon` for navigation. `Icon` and `Icon3D`
  are retired and never imported. There is no `ramp` prop.
- Every page has a `PageHeader` back button following real history.
- Full-page drawers, never partial.
- Anything on screen at first paint is shown outright, never left mid-animation.
- Percentage padding resolves against the containing block, not the element.
- Never truncate a label.
- Zero em dashes. British spelling. No "sample", "preview" or "demo" strings.

**Before every commit**
```bash
npm run typecheck                                   # 0 errors, all workspaces
npm run build                                       # clean
cd apps/web && npx next start -p 3210               # then the specs
git diff --name-only HEAD | xargs grep -n "$(printf '\xe2\x80\x94')"   # empty
git diff --name-only HEAD | xargs grep -n 'Icon3D'                     # empty
node ../../scripts/verify-shots.mjs /around/lagos-yaba
node ../../scripts/verify-shots.mjs --light /around/lagos-yaba
```

---

## 2. The agent 2 contract: strict, non-overlapping file scopes

Agreed in writing before agent 2 writes a line. Two agents, never more.

### 2.1 The lead owns, exclusively

```
supabase/migrations/**                      ALL of it. One hand on the schema.
apps/web/src/lib/social/areas-*.ts
apps/web/src/lib/social/utility-*.ts
apps/web/src/lib/social/bot-*.ts
apps/web/src/lib/social/moderation-*.ts
apps/web/src/lib/social/badges-*.ts
apps/web/src/lib/social/visibility.ts
apps/web/src/app/(app)/around/**
apps/web/src/app/admin/social/**
apps/web/src/components/social/spine/**     Spine, Node, StateBar
docs/SOCIAL_*.md
```

### 2.2 Agent 2 owns, exclusively

```
apps/web/src/lib/social/profiles-*.ts
apps/web/src/lib/social/posts-*.ts
apps/web/src/lib/social/marks-*.ts
apps/web/src/lib/social/relationships-*.ts
apps/web/src/app/(app)/u/**
apps/web/src/app/(app)/post/**
apps/web/src/app/(app)/compose/**
apps/web/src/components/social/post/**      PostCard, PostBody, MediaGrid, Tombstone
apps/web/src/components/social/marks/**     the four marks, MarkBar
apps/web/src/components/social/profile/**
apps/web/src/app/social.css                 NEW file, imported by globals.css once, by the lead
apps/web/tests/social-profile.spec.mjs
apps/web/tests/social-posts.spec.mjs
```

### 2.3 Shared, lead-only edits, agent 2 requests

`packages/design-tokens/src/tokens.css` and `src/index.ts` (both together,
always, they have drifted before), `apps/web/src/app/globals.css`,
`AppRail.tsx`, `MobileTabBar.tsx`, `apps/web/src/lib/database.types.ts`,
`packages/i18n/src/locales/*.ts`, `apps/web/src/lib/flags.ts`.

### 2.4 Both agents, every time

- Never run git. The lead commits, and the lead re-audits first. Two independent
  passes on every item.
- Report honestly what was NOT done. A quiet skip is worse than a stated one.
- Report failures with their real output. Never claim green when it is not.
- A success report is not trusted at face value. It is verified.

---

## 3. Slice 0: tokens, flag and the entry point

Small, and everything else depends on it.

- [ ] Feature flag `social` inserted into `public.feature_flags`, default off,
      so every surface below is dark until deliberately lifted
- [ ] Settings row for the bot: monthly kobo ceiling, per-user daily summons,
      per-area hourly summons, slow-mode default
- [ ] Layer 1 and layer 2 tokens for the social surface, added to
      `tokens.css` **and** the TS mirror in the same edit: spine rest, spine
      live, spine dead, node fills per author kind, notch size, current
      duration. No new hue. Nothing outside the blue family
- [ ] `apps/web/src/app/social.css` created and imported once from
      `globals.css`, so agent 2 never touches the 3,167-line monolith
- [ ] `Around` added to `AppRail` and `MobileTabBar`, behind the flag, and
      **discovery stays the default tab**
- [ ] Screenshot: the rail and tab bar at 390px, both themes, flag on and off

---

## 4. Slice 1: the area and its record

**The wedge. If this works, everything else earns its way in.** Shippable and
valuable on its own, with no posts in the product at all.

### Backend
- [ ] Migration: `areas`, RLS, indexes, admin-only write, seed Lagos plus three
      to five areas inside it, `opened_at` set
- [ ] Migration: `area_members` with `role`, `residency_source`,
      `utility_weight`, `notify_utility`; self join and leave, admin-only
      moderator promotion
- [ ] Migration: `utility_reports` with the hourly unique constraint per
      `(area_id, user_id, kind, hour)`; `area_utility_state`;
      `area_utility_daily`
- [ ] Migration: `private.recompute_area_utility(area, kind)`, the six defences
      from `SOCIAL_DESIGN` section 6: two-reporter minimum, proven residency,
      conflict-of-interest weight cut, contradiction decay, cross-area daily
      cap, agreement recorded
- [ ] Migration: trigger firing the recompute synchronously on report insert
- [ ] Migration: `private.can_see_area(area)`, `private.is_area_member(area, who)`,
      EXECUTE granted to `anon` deliberately
- [ ] **Functional probe**: insert two reports from two users, confirm the state
      flipped; insert one from a single user, confirm it did NOT; insert one
      from an agent with a listing in the area, confirm the weight was cut;
      insert a second inside the hour, confirm 23505
- [ ] Migration mirrored into `supabase/migrations/` with a timestamp prefix

### Actions
- [ ] `joinArea`, `leaveArea`, `setHomeArea`
- [ ] `reportUtility` (the one-tap wedge), `disputeUtility`
- [ ] All rate limited on `private.consume_rate_limit` at the numbers in
      `SOCIAL_DESIGN` section 8.4, all returning the envelope, all resolving
      through `resolveSession`, all respecting the `social` flag

### Frontend
- [ ] `Spine` component: four states differing in **shape** as well as colour,
      one travelling element, `aria-hidden`, reduced motion answered
- [ ] `StateBar`: four cells, tap to open the record, long press to report
- [ ] `/around`: areas you are in, discovery by state and city, signed-out state,
      no-areas-joined state
- [ ] `/around/[slug]`: spine, State Bar, supply rail reading real listings, the
      session feed with a real end
- [ ] `/around/[slug]/record`: light history, water, road, safety, sample counts,
      reporter counts, **agreement shown**, contested state honest
- [ ] The 6am empty area: designed as a page, not an empty state

### Notification
- [ ] A utility **state flip** notifies members with `notify_utility`, through
      `private.notify`, using the existing `system` kind for now

### Test and proof
- [ ] `apps/web/tests/social-area.spec.mjs`: report light, see the State Bar and
      the spine change, **reload**, see it persist; a second report inside the
      hour is refused with the honest message; a signed-out visitor sees the
      designed signed-out state and not a crash
- [ ] 390px screenshots, dark then light: `/around`, `/around/[slug]`,
      `/around/[slug]/record`, and the empty area
- [ ] **Look at them.** An entire workspace once rendered orange and only a
      screenshot caught it

---

## 5. Slice 2: profiles, with bios

The owner asked for profiles with bios first. This is agent 2's opening slice
and it touches nothing slice 1 owns.

### Backend
- [ ] Migration: `social_profiles`, `handle text` lowercase with a unique index
      and `check (handle ~ '^[a-z][a-z0-9_]{2,19}$')`, reserved-word list in the
      database, a handle resembling a RentMe official name or an approved
      agent's registered business name refused at the database level
- [ ] Migration: 90-day handle release lock
- [ ] Migration: `private.scan_social_text()` extending the existing
      `scan_message` classifier to bios and links
- [ ] Migration: public `social-banners` bucket, path-scoped RLS
- [ ] **Functional probe**: claim a handle, reclaim it, confirm refusal; claim a
      reserved word, confirm refusal; write a bio with a ten-digit account
      number, confirm it quarantines

### Actions
- [ ] `claimHandle`, `updateSocialProfile` (bio, pronouns, link, contact policy,
      pidgin register), `uploadBanner`
- [ ] **EXIF stripped by canvas re-encode before upload**, refusing rather than
      uploading on failure, exactly as listing photos already do. A geotagged
      photo in a public bucket tells the internet where you sleep

### Frontend
- [ ] `/u/[handle]`: banner, avatar, bio, agent chip, badges, areas, posts,
      reposts, media, the spine as standing over time
- [ ] `/u/[handle]/edit`: full-page, never a partial drawer
- [ ] States: no such handle (offered as claimable), blocked in either direction
      (404, not a teaser)

### Test and proof
- [ ] `social-profile.spec.mjs`: claim a handle, set a bio, **reload**, both
      persist; a reserved handle is refused; a bio with an account number does
      not appear publicly
- [ ] 390px screenshots, both themes

---

## 6. Slice 3: posts, replies, likes, reposts, views

The one table, and the four primitives the owner asked for by name.

### Backend
- [ ] Migration A: `alter type public.notification_kind add value 'social'`,
      **alone in its own migration**, because a new enum value cannot be used in
      the transaction that adds it
- [ ] Migration B: `posts`, the single table, with every check constraint from
      `SOCIAL_DESIGN` section 5.2, above all `author_id is null iff author_kind
      in ('BOT','SYSTEM')`
- [ ] Migration B: `post_media`, `post_reactions`, `post_reposts`, `post_views`
- [ ] Migration B: one counter trigger maintaining every count column, so a feed
      read is one query and never a fan-out
- [ ] Migration B: depth cap at 3, media cap at 4, both by trigger
- [ ] Migration B: `private.scan_social_text` extended to post bodies, running on
      insert **and on edit**, quarantining rather than flagging
- [ ] Migration B: `private.can_see_post(post)`: area visibility, status, and
      neither party blocked. EXECUTE to `anon` deliberately
- [ ] Migration B: private daily view salt table, rotating at midnight Lagos,
      previous day's salt deleted
- [ ] Migration B: private `social-media` bucket, path
      `<auth uid>/<post id>/<uuid>.<ext>`, signed URLs
- [ ] **Functional probe**: insert a BOT row with a null author, confirm it
      passes; insert a USER row with a null author, confirm it fails; reply four
      deep, confirm refusal; like the same post twice, confirm 23505; confirm
      counts moved

### Actions
- [ ] `dropPost`, `editPost` (15 minutes, `edited_at` shown, **rescan on edit**),
      `removePost` (tombstone, never a row delete)
- [ ] `reply`, `toggleMark` (LIKE, CORRECT, I_DEY, NA_LIE, SAVE),
      `repost`, `quoteRepost`, `recordView`
- [ ] `attachPostMedia`, EXIF stripped, refuse rather than upload on failure

### Frontend
- [ ] The four **original geometric marks**, one path each on a 24 grid, drawn on
      tap via `stroke-dashoffset` in 240ms, instant under reduced motion, 44px
      touch targets, accessible names carrying state and count
- [ ] `PostCard`: the notch, the node, the author kind, the mark bar,
      "Seen by N around here"
- [ ] `/compose`: kind picker first, because the kind changes the whole form
- [ ] `/post/[id]`: the thread, the spine as trunk, replies indented by depth,
      tombstones where posts were removed
- [ ] The area feed rendering real posts against the spine
- [ ] The session end: a real terminal card with three doors, never a spinner
- [ ] Quarantined states: honest banner for the author, 404 for everyone else

### Notification
- [ ] `social` kind: someone replied to your post, someone reposted your post.
      Aggregated ("3 people replied"), never one row per like

### Test and proof
- [ ] `social-posts.spec.mjs`: drop a post, like it, repost it, reply to it,
      **reload**, all four persist and all four counts are right
- [ ] Edit inside the window, confirm `edited_at` renders; edit in an account
      number, confirm it quarantines
- [ ] 390px screenshots, both themes: feed, post, compose, thread at depth 3

---

## 7. Slice 4: safety, before it is needed and not after

Third, not last, because a social layer is an unbounded liability otherwise.

### Backend
- [ ] Migration: `blocks` (bidirectional invisibility), `mutes` (one-way
      silence), `contact_requests`
- [ ] Migration: `private.can_see_post` extended so a block hides in both
      directions, everywhere, including in counts
- [ ] Migration: quarantine on N distinct weighted reports, N scaled to area size
- [ ] Migration: per-area **slow mode** flag; posting needs a verified phone, an
      account under seven days old has its first post in the area held
- [ ] Migration: moderator role can quarantine, **cannot remove**. Removal is
      admin only and always writes `audit_log`
- [ ] **Functional probe**: read the feed as a blocked user, confirm the blocker
      is invisible; read as the blocker, confirm the blocked is invisible;
      confirm the counts moved too, not just the rows

### Actions
- [ ] `reportContent` into the existing `reports` table using the existing `text`
      target type, no migration
- [ ] `block`, `unblock`, `mute`, `unmute`, `requestContact`, `decideContact`
- [ ] Admin: `quarantinePost`, `removePost`, `promoteModerator`, `pauseArea`,
      `setSlowMode`, every one writing `audit_log` with actor, target and reason

### Frontend
- [ ] Report sheet with structured categories, feeding triage
- [ ] Block, mute and contact controls on the profile and on every post
- [ ] `/admin/social`: quarantined queue, reports queue, areas, moderators, bot
      spend, oldest first, with ageing

### Test and proof
- [ ] `social-safety.spec.mjs`: **block is proven by a test that reads as the
      blocked user**, in both directions. Report a post, confirm it reaches the
      queue. Mute, confirm one-way silence
- [ ] 390px screenshots of the admin queue and the report sheet, both themes

### Written down, not just built
- [ ] **NDPA position**: retention window, export path, takedown process, and
      the account-deletion rule (posts anonymised, utility reports survive as
      weight in the aggregate with attribution dropped)

---

## 8. Slice 5: @rentme in the replies

### Backend
- [ ] Migration: `bot_invocations` with tokens, `cost_minor` and
      `refused_reason`. `posts.author_kind` already carries `BOT` from slice 3
- [ ] **Functional probe**: confirm a BOT post can be the target of a reaction, a
      repost and a reply, at the database level, before any UI exists

### Action
- [ ] `summonBot`: behind the flag, per-user daily and per-area hourly limits,
      monthly kobo ceiling read from settings and compared against the sum of
      `bot_invocations.cost_minor` for the month, kill switch, honest refusal
      sentence when any of them trips
- [ ] Tools take **no identity argument** and execute against the caller's own
      RLS-bound client resolved server side. It never holds a service role
- [ ] Refusals: no disputes, no refunds, no unsourced prices, no medical or
      legal advice, never in a quarantined thread, never in an area in slow mode
- [ ] **Never claims a utility state it cannot source.** If nobody has reported,
      it says so and offers the report action
- [ ] **Every factual claim carries its source count**

### Frontend
- [ ] A bot reply renders on a diamond node with a filled notch, visibly a
      machine, with the full mark bar
- [ ] `payload` renders real `ListingCard`s with working Message the agent and
      Reserve actions
- [ ] Escalate to support from a stuck thread, per R-91

### Test and proof
- [ ] `social-bot.spec.mjs`: summon, get exactly one reply, **like it, repost it,
      reply to it, reload, all three persist**. That is the owner's requirement
      and it gets its own three assertions
- [ ] Summon twice past the limit, confirm the honest refusal
- [ ] 390px screenshots of a bot reply carrying listing cards, both themes

---

## 9. Slice 6: system entries and agent showcase

**This is the cold start answer. It could reasonably move earlier if slice 1
looks lonely in practice.**

### Backend
- [ ] Migration: `enforce_showcase_listing()` trigger, refusing unless the
      listing is `PUBLISHED` **and** owned by an `agents` row belonging to the
      author
- [ ] Migration: triggers writing `SYSTEM` posts on area open, on a listing
      reaching `PUBLISHED` in that area, on a utility state flip, on a booking
      completing (no names, no listing), on an agent being verified there
- [ ] Migration: the feed query caps system entries at one in four once an area
      passes twenty human posts in the session window
- [ ] **Functional probe**: a non-PUBLISHED listing cannot be showcased; a
      listing owned by someone else cannot be showcased; publishing a listing
      writes exactly one system entry

### Frontend
- [ ] System entries: no notch, no fill, hairline only, hollow node
- [ ] Showcase: square node, notch on the opposite corner, agent chip
- [ ] Agent showcase capped at one per area per day

### Test and proof
- [ ] `social-supply.spec.mjs`: a non-PUBLISHED listing cannot be showcased;
      publishing a listing surfaces it in that area's feed; a brand-new area is
      not empty
- [ ] Conversion measured: area to listing to reserve, through `events` (R-102,
      which agent 1 is closing at its item 34)

---

## 10. Slice 7: standing

Straight from `docs/BADGES.md`, which needs no changes.

- [ ] Migration: `badges`, `user_badges` with `evidence jsonb`, revocation
- [ ] Agent ladder and member ladder per BADGES sections 2 and 3
- [ ] The **agent chip** beside a name is a role marker, visibly different from
      an earned badge, so nobody confuses "is an agent" with "is good at it"
- [ ] Awarding runs on write where the event is a write we already make, not on
      a schedule, so it does not wait for `pg_cron`
- [ ] Admin grant and revoke, mandatory reason, `audit_log` row, and a granted
      badge is distinguishable from an earned one **in the UI, not just the data**
- [ ] Anti-farming: Correct counts only from accounts with a completed stay or a
      verified phone, and once per pair per week towards a badge
- [ ] **The earned moment**: a designed reveal, a notification row, a shareable
      card. The cheapest retention mechanic in the whole plan
- [ ] `social-badges.spec.mjs`: earn one, see it on the profile, reload, persists

---

## 11. Slice 8: the record as an asset

- [ ] `area_utility_daily` rollup. Written on report insert as a running
      aggregate so it needs no job; `pg_cron` would only tidy it
- [ ] The estate report surface: hours on over 90 days, sample count, reporter
      count, **agreement**, contested periods shown honestly
- [ ] A power signal on `/listing/[id]` for listings in an area with a verified
      record, which is the strongest reason to trust a RentMe listing
- [ ] Pairs with agent 1's items 15 and 16 (R-71 power, R-72 water columns), so
      the listing's own declaration and the area's measured record sit beside
      each other. **Coordinate before either lands**

---

## 12. Deferred, deliberately, with the reason

Not forgotten. Each is written down so nobody rediscovers it.

| Deferred | Why | What unblocks it |
|---|---|---|
| **Link up / meetups** | Highest-liability feature in the plan and not the wedge. `expires_at` and the kind enum are already shaped for it | A moderator watching, and slice 4 proven in production |
| **Paid placement** | Contradicts the no-fees rule. Flagged for the owner in `SOCIAL_DESIGN` section 12 | An owner ruling |
| **Trusted around here directory** | A second two-sided marketplace with its own supply, reviews, moderation and fraud surface | Its own plan, not this one |
| **`follows`** | A graph with no visible output. The place is the subscription | Evidence that people want it |
| **Adire canvas texture** | The ambient canvas is already there; two stacked full-bleed textures is where low-end Android compositing goes wrong | A token-level canvas override the data saver switch turns off |
| **Nsibidi-derived marks** | Restricted script, real cultural weight. An engineer approximating it for a like button is the shallow version | A proper commission from someone who holds the knowledge |
| **Nightly rollup as a job, badge awarding as a job, gist expiry as a job** | `pg_cron` is off. All three are designed to not need it | The `pg_cron` toggle, which is the owner's to enable |
| **A second city** | Moderation is the constraint and it is a person, not a query | Staffing |

---

## 13. What the first commit looks like

Slice 0 and slice 1, together, in one green push:

- The `social` flag, off.
- The area tokens, in both layers and the TS mirror.
- Four migrations, each probed functionally, each mirrored to the repository.
- Five server actions speaking the envelope.
- Three routes and their empty, error, signed-out and unconfigured states.
- One notification.
- One spec with three assertions.
- Four screenshots that a human looked at.

That is a shippable product: **the live utility record of a Nigerian
neighbourhood**, with no posts in it at all. Everything after slice 1 is the
conversation that happens around it.
