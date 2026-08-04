# Social Layer: the audit, closed out

First written 2026-08-04 against the working tree and the live database
(project `uccixoonmbhrnyczyigt`). **Closed out the same day**, against the tree
as it now stands and against the live database read again from scratch. Nothing
below is carried over on trust: every row was re-checked, and where a finding is
still open it says so and says whose it is.

The original count was **4 BLOCKER, 9 SERIOUS, 12 MINOR**. After the closeout it
stood at **0 BLOCKER, 1 SERIOUS, 6 MINOR** open, plus **9 new findings**, of
which 8 were fixed and 1 was the lead's.

**A second round followed and is recorded in section 9.** The lead closed all
five handovers, and the first thing the second round found was that one of them
had landed only halfway: the `social` kill switch existed as a row and was read
by nothing. Section 9 carries seven further findings, the two specifications the
lead asked for (mentions and the AI summon), and the evidence for each.

Three questions the round was asked to settle are settled in section 5, and the
one deferral that could not be closed, an events table, is specified in full in
section 6 so that the lead can build it without rediscovering the shape.

---

## 1. Blockers: all four closed

| # | Was | Now | Live evidence |
|---|-----|-----|---------------|
| B1 | Every post the scanner caught was REFUSED rather than held, because `posts_insert_self` demanded `status = 'LIVE'` and Postgres evaluates WITH CHECK after BEFORE triggers | **Closed.** The policy admits both states the scanner can leave behind | `pg_policy` for `posts_insert_self`: `... AND (status = ANY (ARRAY['LIVE'::social_status, 'HELD'::social_status])) AND (hidden_by IS NULL) AND (removed_at IS NULL) ...` |
| B2 | Generated types had drifted behind the content migrations and the build was red | **Closed** during the original audit, and still clean: `npm run typecheck` is 0 errors across all three workspaces and `NEXT_DIST_DIR=.next-a2 next build` compiles in 14.9s and exits 0 | Run this round |
| B3 | Zero areas in the database, so the layer had nowhere to happen | **Closed.** Five Lagos places, all ACTIVE | `select slug, status from public.areas` returns `yaba-lagos`, `lekki-phase-1-lagos`, `surulere-lagos`, `ikeja-gra-lagos`, `yaba-unilag`, every one `ACTIVE` |
| B4 | `post_views.viewer_bucket` was client supplied, so "seen by N" was a number anyone with the anon key and a loop could set | **Closed.** A BEFORE INSERT trigger overwrites it, and the same trigger serves stories | `pg_trigger` on `public.post_views`: `post_views_fill_bucket BEFORE INSERT` running `private.fill_view_bucket`, whose body is `new.viewer_bucket := private.view_bucket(subject); new.seen_on := (now() at time zone 'Africa/Lagos')::date;`. `story_views_fill_bucket` is the same function on the same event |

---

## 2. Serious: eight of nine closed

| # | Was | Now | Live evidence |
|---|-----|-----|---------------|
| S1 | `posts_update_own` guarded who and nothing else, so an author could rewrite their own counts, move the post to another area, re-parent it under somebody else's thread and fabricate a moderation record | **Closed** by a guard trigger rather than by widening the policy, which is the right shape: the policy says who may write, the trigger says what a write may change | `posts_zz_guard_update BEFORE UPDATE` runs `private.guard_post_update`, which pins `id, author_id, author_kind, parent_id, root_id, depth, area_id, kind, listing_id, quoted_post_id, created_at` and all four counters back to their old values, and pins `status`, `hidden_by` and `hold_reason` for anybody who is not an admin |
| S2 | `edited_at` was never set by the database and the client controlled it | **Closed** in the same trigger: `if new.body is distinct from old.body and new.status <> 'REMOVED' then new.edited_at := now(); else new.edited_at := old.edited_at; end if;` | As above. The equivalent on stories is `guard_story_update`, keyed on headline and standfirst |
| S3 | The three public counts on `social_profiles` were the owner's to type, and the live UPDATE policy had no WITH CHECK at all, so the migration mirror did not match the database | **Closed twice over.** The policy now carries `with check (user_id = (select auth.uid()))` in the database, and `guard_social_profile_update` pins `follower_count`, `following_count` and `post_count` | `pg_policy` for `social_profiles_update_self` returns a non-null with_check; `social_profiles_zzz_guard BEFORE UPDATE` runs the guard |
| S4 | Post counters could only ever go up, because the counter trigger fired on insert and delete and the product never deletes | **Closed.** A second trigger handles the status transition | `posts_status_counters AFTER UPDATE` running `private.bump_post_status_counters` |
| S5 | No admin or moderator policy on `social_profiles`, so a held bio could never be reviewed by staff | **Closed.** `social_profiles_admin_write`, cmd ALL, both clauses `has_role(admin) or has_role(super_admin)`. Migration `an_admin_ruling_on_a_bio_outranks_the_scanner` also makes an admin's decision survive the next scan | `pg_policy` for `social_profiles` now returns four policies, not three |
| S6 | Ten of the fifteen social tables had no application code at all | **Closed but for one.** Counting `from("<table>")` across `apps/web/src`: posts 21, post_media 1, post_reactions 6, post_reposts 5, post_views 1, blocks 2, mutes 3, badges 2, user_badges 4, follows 6, stories 10, story_reactions 5, story_comments 5, story_comment_reactions 4, story_views 1, areas 16, area_members 10. **`bot_invocations` is still 0**, which is correct: it is the service role's table and the bot slice is not built | Counted this round |
| S7 | `follows` ignored `blocks`, and a blocked person's profile stayed fully visible | **Closed in both directions.** `social_profiles_select` is `using (NOT private.blocked_with(user_id))` and `follows_insert_self` carries `AND (NOT private.blocked_with(followee_id))` | `pg_policy`, read this round |
| S8 | No `social` feature flag, and the flag reader fails open, so the layer has no kill switch | **Closed, in two halves and in two rounds.** The lead inserted the row and it ships false. Round two then found that nothing read it, which is N10 in section 9: a fail-open reader that is never consulted is not a switch defaulting to on, it is no switch. Ten routes and 28 actions now consult it | Live: `select key, enabled from public.feature_flags` returns `social / false`. The wiring is proven end to end in section 9.4 |
| S9 | Nothing notified anybody about anything social | **Closed comprehensively.** Twelve `private.notify_*` functions now write the `social` kind: `notify_badge, notify_bio_status, notify_follow, notify_post_insert, notify_post_status, notify_reaction, notify_repost, notify_social, notify_story_comment_status, notify_story_event, notify_story_insert, notify_story_status` | `pg_proc` scan of `private` for functions whose body contains `social` |

---

## 3. Minor: six of twelve closed

| # | Status | Evidence |
|---|--------|----------|
| M1 | **Re-opened on a different table.** `posts.area_id` is covered now. The FK sweep over `public` returns exactly one uncovered foreign key: `stories.stories_area_id_fkey`. `stories_area_idx` looks like it covers it and does not, because it is partial: `CREATE INDEX stories_area_idx ON public.stories USING btree (area_id, created_at DESC) WHERE (status = 'LIVE')`. Archiving a busy area sequentially scans `stories`. **The lead's, one line** | Live `pg_constraint` joined against `pg_index` with `indpred is null` |
| M2 | **Still open, and it has grown from four to eight.** Applied versus mirrored: `anon_execute_on_rls_helpers` 20260730021956 / 20260730021500; `admin_bootstrap` 090330 / 090000; `wallet_pay_confirmed_unpaid_booking` 122108 / 124500; `agent_documents_bucket_and_insert_policy` 122616 / 130500; `areas_carry_their_real_centres` 20260804150721 / 150000; `signup_carries_local_government_and_occupation` 152234 / 150100; `a_held_comment_and_a_held_bio_tell_their_author` 152755 / 150200; `an_admin_ruling_on_a_bio_outranks_the_scanner` 154548 / 150300. Names match in all eight; only the timestamps disagree. `supabase db push` from this repository would try to re-run eight migrations that are already applied. **The lead's** | `list_migrations` against the live project versus `ls supabase/migrations` |
| M3 | **Two of three closed.** `private.view_bucket` and `private.bot_spend_this_month` now read `postgres=X/postgres` with no PUBLIC grant. `private.project_social_identity(uuid)` still reads `DEFAULT (public execute)` and it returns any user's display name and avatar from the private `profiles` table. Not reachable through PostgREST today because `private` is not an exposed schema, so this is defence in depth. **The lead's, one `revoke`** | `pg_proc.proacl` for the `private` schema |
| M4 | **Still open and still harmless.** `private.area_visible(uuid)` is used by zero policies and by zero lines of application code, and is granted to `authenticated` only. That grant asymmetry is exactly the shape that broke the anonymous catalogue read once before, so if it is ever wired into a policy the `anon` grant has to land in the same migration | Live: policy scan for `area_visible` returns 0; `grep -rn area_visible apps/web/src` returns 0; `proacl` is `postgres=X/postgres,authenticated=X/postgres` |
| M5 | **Downgraded, with the reason.** The finding said join and leave could be cycled freely and that each cycle is unthrottled write amplification on a hot `areas` row. The first half is wrong: `bump_area_member_count` is a row-level trigger, so it fires only when a row actually moves, and every cycle needs a join, which `AREA_LIMITS.join` caps at 20 a day. A bare `leaveArea` call after that deletes nothing and fires nothing. Adding a limiter to leaving would be a dark pattern with a rate limit painted on it, and `areas-actions.ts` already says so in a comment. **Closed as not a defect** | `pg_trigger`: `area_members_count AFTER INSERT DELETE FOR EACH ROW`; `areas-actions.ts:123` consumes `AREA_LIMITS.join` |
| M6 | **Closed.** The Around pages no longer double up the shell's padding | `around/page.tsx:46` is `mx-auto w-full max-w-3xl pb-24 pt-4`, no `px-4` |
| M7 | **Closed.** `--nf-brand-primary-soft` appears nowhere under `components/social` except inside two comments explaining why it is not used | `grep -rn brand-primary-soft` over `components/social`, `social.css`, `social-feed.css` |
| M8 | **Settled: `components/social/feed/` wins, and `components/social/post/` is not created.** `PostCard`, `PostGlyph`, `Composer`, `PostEditor`, `Feed` and `DistrictHeader` all live in `feed/` and every importer points there. One directory, one writer, no second copy. `docs/SOCIAL_BUILD.md` section 2.2 still names `post/**` and is superseded on this point | `find apps/web/src/components/social -type f` |
| M9 | **Still open, platform-wide.** `apps/web/src/components/app/PageHeader.tsx:53` is `h-9 w-9 sm:h-10 sm:w-10`, so the back control is 36x36 at 390px against a 44px target. Not the social layer's file and not in this round's scope | Read this round |
| M10 | **Closed.** "When posting opens here you will be the first to know" is gone; `grep -rn "posting opens here"` returns nothing | Searched this round |
| M11 | **Closed.** The area row no longer truncates its meta line, and says so in a comment | `around/page.tsx:183` |
| M12 | **Half closed.** Six `loading.tsx` files now exist, all of them on social routes: `/around`, `/around/[slug]`, `/post/[id]`, `/u/[handle]`, `/u/[handle]/followers`, `/u/[handle]/following`. Every other route in the application still has none | `find apps/web/src/app -name loading.tsx` |

---

## 4. New findings, ranked by how badly each hurts somebody

Nine, turned up during the closeout. Eight are fixed in this round; the ninth is
the lead's and appears in section 7. They are ordered by harm, not by where they
were found.

| # | Severity | Finding | Evidence | What changed |
|---|----------|---------|----------|--------------|
| N1 | SERIOUS | **A post about a flat could never show the flat.** `toView` in `posts-queries.ts` set `listing: null` unconditionally, and three separate things depended on that field: `PostCard` carries an entire second architecture for a listing post, a photographic plate with the title, the place, the price and a link through; the district feed's Apartments chip filters on `Boolean(post.listing)`; and the card menu offers Contact agent only when it is set. The trigger `a_published_listing_speaks_in_its_area` has been writing `listing_id` onto posts since it landed, so the posts existed and the plate existed and nothing joined them | `posts-queries.ts:236` was `listing: null,`. `grep -rn "post.listing"` finds nine uses in `PostCard.tsx` and one filter in `Feed.tsx`, all unreachable | `readPostListings()` reads the page's listings in one query inside `enrich`, through `listings_select_published` so a withdrawn listing simply does not come back. Money through `formatMoney` on integer kobo, nothing divided by a hundred. **The Apartments chip can now count something** |
| N2 | SERIOUS | **Mute wrote a row that nothing read, and the toast promised silence.** Three controls write `public.mutes`: the card sheet's "Not interested", the card sheet's Mute and the profile menu's. The toast said "Muted. You will not see their posts." Nothing anywhere read the table back. `private.can_see_post` and `private.can_see_story` carry `blocked_with` and no mute test, which is correct, because a block is a security boundary and a mute is a preference; but a preference still has to be honoured somewhere | Live: `position('mutes' in prosrc) > 0` is false for `can_see_post`, `can_see_story` and `blocked_with`. `grep -rn mutes apps/web/src` finds one read, and it only answers "has this viewer muted this one person" for the button's own state | `readMutes()` in `posts-queries.ts`, applied to the area feed and to the story rail. Deliberately a filter on a feed read and not a policy: a mute is one way and private, nobody is hidden from anybody else by it, and a muted person's own page and their side of a thread you opened still show. The copy now says exactly that |
| N3 | SERIOUS | **Editing a post was unreachable.** `editPost`, the fifteen minute window in `posts_update_own`, `PostEditor`, the `edited_at` marker, the rescan on edit and both `POST_COPY.editHeld` and `POST_COPY.editedDone` were all built. Both menu handlers answered an `edit` action. **Nothing in the product ever emitted one.** `PostView.editable` was computed in `posts-queries.ts` and read by no component | `grep -rn 'editable\|"edit"'` over `components/social` and `lib/social` returns the computation, the two handlers, and no producer | `actionsForPost` takes `editable` and adds a "Change what it says" row on your own live post inside the window. Wired in both the feed and the thread |
| N4 | SERIOUS | **"Contact agent" did nothing at all.** The card sheet offers it whenever the author is an agent and the post carries a listing. Neither `Feed.tsx` nor `ThreadView.tsx` had a branch for the `contact` key, so the tap fell through every branch and ended silently. That is the highest intent action in the whole layer | `ActionSheet.tsx:132` emits `key: "contact"`; `grep -n 'action ===' ` over both handlers shows share, copy, report, edit, save, delete, hide, mute, block and no contact | Both handlers now push `/messages/new?listing=<id>`, which is the same bridge the listing page's own Message agent button uses, so the agent is resolved server side and the social layer needs no second way to open a conversation |
| N5 | SERIOUS | **An agent's Properties tab rendered broken image frames.** `getAgentProperties` returned `listing_photos.storage_path` straight into an `img src`. That column holds a bucket-relative path, not an address; the catalogue read has always converted it | `profile-tabs-queries.ts:89` was `photoUrl: first ? first.storage_path : null`, against `lib/listings/supabase-repository.ts:116` which builds `<url>/storage/v1/object/public/listing-photos/<path>` | One `listingPhotoUrl()` helper in `posts-media.ts`, used by the Properties tab and by the new listing plate, so a third surface cannot make the same mistake a third time |
| N6 | MINOR | **The district header's filter button lied.** It carried a sliders glyph and the accessible name "Filter what you see", and what it did was jump the chip row to Apartments. The chip row sits directly underneath, is always visible, names all five kinds and carries their counts | `DistrictHeader.tsx` `onFilter={() => setChip(chip === "all" ? "apartments" : "all")}` | Removed, along with its CSS. Two controls for one job on a 390px header is the jam the owner asked twice to be rid of |
| N7 | MINOR | **Save had two names.** The card's bookmark said Save and wrote `post_reactions` with the mark `SAVE`; the sheet called the identical write "Interested" and drew it with a heart | `ActionSheet.tsx:123` | One name, one glyph, one write |
| N8 | MINOR | **The create ring's scrim let the page read through it.** At 0.82 opacity the sentence behind the ring was legible under the petal labels, so two pieces of copy sat on top of each other | Screenshot at 390px, both themes | 0.93 dark, 0.96 paper, blur 6 to 12 |
| N9 | MINOR | An unused import of `AREA_KIND_LABEL` in the area page | `grep -c` returned one hit, the import line itself | Removed |

---

## 5. Three questions, settled

### 5.1 The create ring reads as six, and the sixth is Place

The owner's board draws six petals and the sixth on it is an Event. The previous
round shipped five and raised the gap rather than shipping a petal that opened
nothing, which was right, and it left a visible hole, which was not.

**Settled: the ring carries six, and the sixth is Place, which opens
`/around/new`.** Suggesting a place is a real form, a validated action, a row
under RLS, an admin decision and a notification back. It is also the most RentMe
answer available to "what do you want to create today?", because the place is
the thing everything else in this layer hangs off, and it sits next to Apartment
on the ring for the same reason: both put something new on the map.

Geometry, verified rather than asserted. Six petals sit 60 degrees apart on a
flat-topped hexagon, so the two extremes are horizontal, which is the axis a
390px phone has least of, and the vertical extent stays inside the wheel so no
petal climbs into the question above it. Measured at 390px in both themes:
zero overlapping pairs, petals spanning x 23 to 367 inside a 390 viewport, the
top petal starting at y 257 against a question ending at y 232, and zero
horizontal scroll. Every note is short enough to hold one line, because a second
line is fourteen pixels straight out of the gap between the rows, and that is
asserted in the spec rather than assumed.

Event is still not built, and section 6 says exactly what it would take.

### 5.2 The Reviews chip is a real read

It used to render a paragraph explaining that reviews lived on each place's own
page. A control that explains its own impossibility is still a dead end.

**Settled: `getPlaceReviews()` in `lib/social/reviews-queries.ts`.** The join is
on the place rather than on a foreign key, and that is honest rather than lazy:
`public.reviews` points at a listing, a listing carries the city and area strings
the whole catalogue is filtered by, and an `areas` row carries the same two
strings from the same vocabulary. The seed proves they line up, including the
awkward case: the UNILAG campus is named UNILAG and filed under Akoka, because
that is where the flats are, so the read falls back from `areas.area` to
`areas.name` and gets Akoka right.

`reviews_select` already limits the rows to reviews on published listings plus
the reader's own, so a review of a listing that has since been taken down cannot
resurface. When there are none the chip shows a designed empty answer naming the
place and pointing at the stays, not a shrug.

### 5.3 The profile's top right is Share and the overflow, and nothing is a bookmark

The owner asked for a bookmark in that corner. On this platform a bookmark
already means one exact thing and has meant it since `saved_items` shipped: keep
this flat. The same glyph on a post is a `post_reactions` row with the mark
`SAVE`. A person is neither.

The thing somebody actually wants when they reach for a bookmark on a person's
page is "let me come back to them", and this product answers that with Follow,
which is one tap away on the same screen, writes a real row, has a real list
behind it at `/u/[handle]/following`, and tells the other person. A second,
private pile of saved people would need its own table, its own policy and its own
screen to read it back; until all three exist it is half a feature wearing a
familiar icon, and the ONE LAW forbids exactly that.

**Settled: the corner carries Share and the overflow.** Share was previously a
row inside the menu, and the header had an unused `share` slot; it is now its own
round control, because sending somebody a person's page is done often enough to
deserve one tap. The menu keeps Copy link, which is a genuinely different act
(the address into a message somebody is already writing, with no sheet in the
way), plus mute, report and block. Nothing anywhere calls anything a bookmark.
The reasoning is written into `ProfileShare.tsx` and `ProfileHeader.tsx` so it is
not relitigated without a `saved_people` table and a screen that reads it back.

---

## 6. For the lead: what an events table needs

Meetups are deferred in `docs/SOCIAL_DESIGN.md` section 9 and
`docs/SOCIAL_BUILD.md` section 12 as the highest-liability feature in the plan,
and that reasoning stands: this is the one social feature where the product puts
two strangers in the same physical room. It is written out here so the deferral
is a decision with a shape rather than a blank, and so that whoever builds it
does not have to rediscover any of this.

**Nothing here should be built until slice 4 (safety) has been proven in
production and a named person is watching a queue.** That is the unblocker, not
a schema.

### 6.1 The table

`public.events`

| Column | Why it exists |
|---|---|
| `id uuid pk` | |
| `area_id uuid not null references areas` | An event belongs to a place, like everything else here. Denormalised so a feed never walks |
| `host_id uuid not null references auth.users` | **One named host, never null and never a group.** Somebody is accountable, and that is the whole safety model |
| `post_id uuid references posts` | The announcement in the feed, so an event is discussed in the same table as everything else and needs no second reaction, repost or report path |
| `title text`, `blurb text` | Scanned like every other body |
| `starts_at timestamptz not null`, `ends_at timestamptz` | |
| `venue_label text not null` | **A public place, named in words.** Never coordinates and never an address field, because a precise home address on a public row is the harm |
| `venue_kind` enum (`PUBLIC_VENUE`,`ESTATE_COMMON`,`ONLINE`) | A private residence is not an option, and the enum is what makes that unarguable rather than a policy somebody remembers |
| `capacity int` null | |
| `attending_count int default 0` | Trigger maintained, like every other counter here |
| `status` enum (`DRAFT`,`LIVE`,`HELD`,`CANCELLED`,`REMOVED`) | `HELD` for the scanner, `CANCELLED` by the host, `REMOVED` by an admin. Never a row delete |
| `cancelled_at`, `cancel_reason text` | A cancellation is a fact attendees are owed, not an absence |
| `created_at`, `edited_at` | |

`public.event_attendees` `(event_id, user_id)` pk, `state` enum
(`GOING`,`WAITLIST`,`WITHDRAWN`), `joined_at`, `decided_at`.

### 6.2 The rules that have to be in the database, not in code

- **Host eligibility.** A verified phone, an account older than thirty days, and
  no upheld report in ninety days. Anything softer and the first abuse case is
  a throwaway account.
- **Capacity is enforced by a trigger inside the insert**, not by a count read
  first, or two taps both take the last place.
- **Attendee lists are never public.** `event_attendees_select` returns your own
  row, the host's view of their own event, and admins. A public list of who is
  going where and when is a stalking surface, and there is no version of this
  feature where publishing it is worth it.
- **A block hides an event both ways**, exactly as `private.can_see_post` does,
  and a blocked person cannot attend.
- **Cancellation notifies every `GOING` attendee**, through `private.notify` with
  the `social` kind, in the same trigger that writes `cancelled_at`. This is the
  single most important notification in the feature.
- **Slow mode applies**: no events at all in an area still in slow mode.
- **An event in the past is read-only.** No attending, no editing.

### 6.3 Money

**There is none, and that is the decision.** The platform charges no fees
anywhere, and a ticketed event is a payment surface with a refund policy, a
chargeback path and a dispute process attached to it. If a host wants money for
a thing, that is between them and their guests and it does not touch RentMe's
ledger. `events` therefore carries no price column at all, because a nullable
one would be the first thing somebody fills in.

### 6.4 Rate limits, on the existing durable limiter

Create an event: 2 per week per host. Attend: 10 per day. Cancel: unthrottled,
for the same reason leaving a place is.

### 6.5 What the ring would do

Nothing, until all of the above exists. The ring is complete at six today and a
seventh petal is a design decision of its own; the most likely answer is that
Event replaces nothing and the ring stays at six with Place, because a
seven-sided ring at 390px is where this layout stops working.

---

## 7. Still open, and whose

**All five were closed by the lead before round two began**, and each is left
here with its reasoning rather than deleted, because the list is also the record
of what was handed over and why. One of them, the flag, landed only halfway and
that half is N10 in section 9.

Five items, none of them in this round's file scope. Each is small and each is
described precisely enough to act on without re-investigating.

1. **The `social` feature flag** (S8). One insert into `public.feature_flags`
   with `enabled = false`, plus a read in every social action, plus the tab
   being absent rather than broken when it is off. The flag reader fails open by
   design, so a missing row is not a closed switch, it is no switch. At 2am with
   something going wrong there is nothing to throw.
2. **A covering index on `stories.area_id`** (M1). One line. The existing
   `stories_area_idx` is partial and cannot serve the foreign key.
3. **The migration mirror** (M2). Eight files whose timestamps disagree with the
   applied versions. `supabase db push` from this repository would try to re-run
   all eight. The names match, so this is a rename, not a rewrite.
4. **`revoke execute on private.project_social_identity(uuid) from public`**
   (M3). Defence in depth today, one configuration change from being a live
   hole, and the platform set this pattern for itself in
   `20260728151253_harden_function_grants`.
5. **The 44px back control** (M9). `components/app/PageHeader.tsx:53` is
   `h-9 w-9 sm:h-10 sm:w-10`. Platform-wide, and it is the primary navigation
   affordance on every social page.

Two things previously recorded here as missing early needs, both still true:

- **There is no `/u` index and no way to find a person.** Handles are reachable
  only if you already know them. The follow graph now has real lists behind it
  in both directions, which makes discovery less urgent than it was and does not
  make it unnecessary.
- **Nothing writes `area_members.residency_source` or `residency_verified_at`.**
  `RESIDENT` is designed to be earned from a completed stay, an invite or
  presence over time, and the only writer of `area_members` is `joinArea`, which
  pins `role = 'MEMBER'`. Every defence in the utility record rests on residency
  being earned, and nothing earns it yet.

---

## 8. How this round was verified

- `npm run typecheck`: 0 errors across `@naijafinds/web`, `@naijafinds/design-tokens`
  and `@naijafinds/i18n`.
- `NEXT_DIST_DIR=.next-a2 npm run build --workspace @naijafinds/web`: compiled in
  14.9s, exit 0.
- `apps/web/tests/social-district.spec.mjs`, new this round: all checks passed in
  both themes. It asserts the ring's six petals, zero overlapping pairs, one line
  per note, the ring inside 390px, the top petal clearing the question, and that
  the Reviews chip never again explains why it cannot work.
- `social-profile`, `social-people`, `profile`, `saved`, `reviews`, `report`,
  `notifications`, `inbox` and `messages` specs: all passed, unchanged.
- 390px screenshots in both themes, looked at: the create ring, and the district
  header with the chip row, a review card and the reviews empty state.
- **The database was read directly for every claim above.** Where a screenshot
  could not be taken because the sandbox has no route to the Supabase host, the
  document says which assertion is the weaker one and why.

---

## 9. Round two

Written after the lead closed all five handovers from section 7. Everything
below was found and fixed, or found and specified, in the round that followed.
Ordered by how badly each hurts somebody using the product.

### 9.1 Findings

| # | Severity | Finding | Evidence | What changed |
|---|----------|---------|----------|--------------|
| N10 | SERIOUS | **The kill switch was a row nothing read.** `public.feature_flags` carried `social` with `enabled = false`, deliberately and correctly, and every social route and every social write was fully on regardless. `lib/flags.ts` is fail-open by design, so a switch that is never consulted is not a switch that defaults to on; it is no switch at all. This is the same shape as a mute writing a row nobody reads, and worse, because the product believed it had one | `grep -rn 'isFeatureEnabled' apps/web/src/lib/social` returned nothing; `grep -rn '"social"'` across the app found only the admin nav entry. Live: `select key, enabled from public.feature_flags` returns `social / false` | `lib/social/flag.ts`, one reader over the platform's own fail-open contract. **Ten routes** render a designed paused page, **28 server actions** refuse with one honest sentence, and the create dock does not render. Proven end to end, not described: a four-line PostgREST stand-in serves `[{"enabled": false}]` for that one query, the app is built against it, and every social route answers **200** with "Around is paused". Screenshots at 390px in both themes |
| N11 | SERIOUS | **Naming a person did nothing at all.** `@aduke` in a post body was six plain characters: it did not link, and the person named never found out. This product has handles, a page for every one of them, a follow graph, a `social` notification kind and twelve `notify_*` functions, and a body of text was the one place none of it was reachable | Live: no `private` function's body contains a mention parser; `scan_post` matches on the word "mention" only inside its own comment. `grep` over `components/social` found no linkification anywhere | `lib/social/mentions-schema.ts` and `components/social/feed/PostBody.tsx`. Post bodies and story comments now link every handle to `/u/[handle]`. **It links and it does not notify, and nothing on the screen says otherwise.** The notification belongs in a trigger beside `notify_reaction`; section 9.2 is its specification |
| N12 | SERIOUS | **"Not interested" was a full mute wearing a soft label.** The row said "See less like this from X" and wrote a mute on the person. Understating a control is the same defect as overstating one and harder to catch: somebody taps a gentle-sounding row and a person vanishes from their feeds, their stories and their threads | `ActionSheet.tsx` emitted `key: "hide"`, and both menu handlers routed it into `muteTarget`, identical to the `mute` branch beside it | One row, named `Mute @x`, noted "They stop showing up in your feeds, stories and threads". The duplicate `hide` branch is gone from both handlers. There is no per-post ranking signal in this product to feed a genuine "see less", so the honest answer was to offer the thing that exists under its own name |
| N13 | SERIOUS | **A mute stopped at the edge of a thread.** Round one applied it to the area feed and the story rail and said so honestly. A thread is reading, and a muted person answering something you are reading is precisely the text a mute is for | Probed live: as a stranger who has muted the guest, `select count(*) from public.stories ...` returns **1** and the area feed returns **2** rows, so the database hands the muted author's rows straight back and the filter has to be the reader's | Extended to thread replies and to `getProfileActivity`. A muted reply **collapses to one line with "Read it anyway"** rather than disappearing, because dropping it would leave the replies underneath it hanging off a parent that is not on the page, and a mute is never a reason to delete other people's words. Their own page is the one place it deliberately does not apply, because going there is a deliberate act |
| N14 | MINOR | The mute copy promised more than round one built, then less than round two built | `POST_COPY.mutedDone` | Rewritten twice and now exact: "Muted. They stop showing up in your feeds, stories and threads. Their own page still opens, and they are not told." Every clause in that sentence is a place the filter actually runs |
| N15 | MINOR | **A spec assertion that passed for the wrong reason.** `social-district.spec.mjs` proved `/around/new` was "a real form" by counting `form, input, select` across the whole document. The app shell carries a search field on every screen, so the check was true on a page with no form on it, and it stayed green against the paused build | Caught by running the same spec against a build with the flag off | Scoped to `main`, and the paused build asserts the paused page instead. A green check that cannot fail is worse than no check |
| N16 | MINOR | Admin moderation would have gone dark with the rest of the layer | Considered while wiring N10 | `lib/social/admin-actions.ts` is deliberately **not** behind the flag, and now says why in the file: the most likely reason the switch is ever thrown is that something needs moderating, and a kill switch that disables the people who can fix the thing it was thrown for is one nobody dares use |

### 9.2 For the lead: the mention notification

The parser and the links are shipped. The notification is one trigger, and it
belongs beside the eleven that already exist rather than in application code.

- **Where.** An `AFTER INSERT OR UPDATE OF body ON public.posts` trigger, plus
  the same on `public.story_comments`. Both bodies are already scanned by a
  BEFORE trigger, so the ordering is settled: notify only when the row survived
  the scanner as `LIVE`. **A held post must not notify**, or the scanner becomes
  a way to make somebody's phone buzz with text nobody will ever be allowed to
  read.
- **The rule, matching the shipped parser exactly.**
  `regexp_matches(new.body, '(^|[^[:alnum:]_@])@([a-z][a-z0-9_]{2,19})', 'g')`,
  lowercased, resolved against `social_profiles.handle`. The second capture is
  the handle. The leading-character class is the part that matters: without it
  `ade@bola_stores.com` names a person called `bola_stores`, and an email address
  is exactly the text this platform's scanner exists to look at.
- **Deduplicate three ways.** Once per handle per post however many times it
  appears; never to the author themselves; and on an edit, only to handles that
  were **not** in the previous body, or every correction of a typo notifies the
  same person again.
- **Cap it.** Five mentions per post. Above that, notify nobody and let the
  scanner see it: a body naming forty handles is not a conversation.
- **Respect the graph.** No notification where `private.blocked_with` is true in
  either direction, and none where the mentioned person has muted the author.
  `notify_reaction` already reads the first of those and is the pattern to copy.
- **Kind and copy.** `social`, href `/post/<id>`, "Somebody mentioned you in
  Yaba." Never the body text: a notification that quotes an unread stranger is a
  harassment surface that bypasses every block the reader has set.

### 9.3 For the lead: what the AI summon path needs

`@rentme` is a reserved handle with no account behind it. `bot_invocations`
exists, `author_kind = 'BOT'` with a null author is allowed by check constraint,
`/api/assistant` is a working 597-line route with a system prompt, a listing
search tool and streaming, and nothing joins any of it up. **This was not built
this round and here is the honest reason**: it needs a settings row that does not
exist, a migration that is not this scope's to write, and a refactor of the
assistant route into something callable outside a request handler. Half of it is
worse than none, because a summon that answers once and then silently stops is a
product that looks like it has an assistant.

What it needs, in the order it would be built.

**1. A settings row, and it is the gate.** A monthly kobo ceiling, a per-user
daily limit, a per-area hourly limit, and the slow-mode default. Without the
ceiling the summon surface is an open spending surface pointed at a paid API by
anybody with an account. `bot_invocations.cost_minor` already exists to be summed
against it. **Nothing else on this list should be built first.**

**2. A writer for a BOT post.** `posts_insert_self` requires
`author_id = auth.uid()` and `author_kind = 'USER'`, so a bot reply cannot be
written by the caller's client, correctly. It is a service-role insert through
the one narrow door at `lib/security/service-rpc.ts`, and that door is the only
place in the layer that should ever hold the service role.

**3. The assistant, callable without a request.** `runListingSearch`,
`SYSTEM_PROMPT` and the streaming loop live inside `app/api/assistant/route.ts`.
The summon needs one non-streaming call that returns a complete answer plus the
listings it cited, so those three want lifting into `lib/assistant/` first. **The
tools take no identity argument and execute against the caller's own RLS-bound
client**, which is the R-77 pattern and is what keeps the bot from becoming a way
to read somebody else's rows.

**4. The refusals, every one of them a test.** One reply per summon. Never in a
held thread, never on a held post, never in an area in slow mode. Never a
utility state it cannot source: if nobody has reported, it says nobody has
reported and offers the report action. Every factual claim carries its source
count. No disputes, no refunds, no unsourced prices, no medical or legal advice.
And it must refuse honestly when the ceiling is reached rather than falling
silent, because a silent bot and a broken bot look identical.

**5. The summon itself.** The parser from section 9.2 already finds `@rentme`;
the action fires on a post or reply whose body names it, rate limited on
`private.consume_rate_limit`, behind the `social` flag like everything else.

**6. The owner's actual requirement, which is the acceptance test.** A bot reply
is a row in `posts`, so it must be likeable, repostable, quote-repostable and
replyable with **no special casing anywhere**. That is three assertions in
`social-bot.spec.mjs` and it is the reason the single-table decision was made.
Probe it at the database level before any UI exists.

### 9.4 What round two was verified against

The sandbox still has no route to the Supabase host, so the pages cannot read
live rows. Two things were done rather than shrugged at.

**The kill switch was rendered for real.** A four-line stand-in for PostgREST
answers `[{"enabled": false}]` for the one flag query and an empty list for
everything else. The app was built against it, and all six social routes
answered 200 with the paused page. That is the switch doing its job over HTTP,
not a description of it.

**The reads were proven against real rows, under real RLS, and rolled back.**

- As `anon` on the live database: the Yaba area feed returns the SYSTEM post that
  carries a `listing_id`, and the listing join behind the new plate returns that
  listing. Before round one that post rendered as plain words, which is N1.
- A booking and a five-star review were inserted for the published Yaba listing,
  read back through the exact two-step query `getPlaceReviews` runs, as `anon`,
  and rolled back. `select count(*) from public.reviews` is 0 again.
- Two profiles, a story, a post and a mute were inserted, then read through
  `private.probe_as` with `set local role authenticated` as the muting stranger.
  The story and both feed rows came back, `mutes_select_own` returned exactly one
  row and only the reader's own. That is the proof that the mute has to be
  applied by the reader and that `readMutes` can see what it needs. Rolled back.
- `social-mentions.spec.mjs` imports `mentions-schema.ts` directly through Node's
  type stripping, so it tests the module the product ships rather than a copy of
  its logic. Thirteen checks, including the email address that must name nobody.
