# THE COMPOUND: the social layer, ideology and complete build order

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


**Superseded by `docs/SOCIAL_DESIGN.md` (the argument) and
`docs/SOCIAL_BUILD.md` (the build order), 2026-08-04.** Where this document and
those two disagree, they win. It is kept for the reasoning behind the shape, in
the same way this document kept `docs/SOCIAL_LAYER.md`.

The five things that changed, and why, are argued in full in
`docs/SOCIAL_DESIGN.md` section 0. In short: one `posts` table rather than
`gists` plus `talks`, a third `SYSTEM` author kind that answers the cold start,
"compound" replaced by "around" because a compound is a different thing in
Nigerian property, half the lexicon cut, and no nsibidi-derived mark set. Three
of this document's schema assumptions also fail against the live database:
`citext`, `postgis` and `pg_cron` are none of them installed.

Companion to `docs/SOCIAL_LAYER.md` (the thinking) and `docs/BADGES.md` (standing).
That document argued the shape. This one is the build: every table, every policy,
every action, every screen, every test, in the order they get written.

Owner brief, 2026-07-30: unique, next generation, appealing to Nigerians,
something that redefines the landscape rather than another feed. Profiles with
bios. Likes, comments, reposts, views. Users can comment on the AI's replies,
and can like and repost the AI's replies. Not a clone of X or Facebook.

---

## 1. The idea, in one paragraph

Every social product is people-first: you follow accounts, and place is
incidental. RentMe owns something none of them have, which is **place**, with
verified homes inside it. So this is not a feed, it is a **compound**. You do not
follow strangers, you enter a place, and the place has a life running inside it.

And the thing that place-rooted social can do here, which no global network can,
is answer the four questions that actually govern a Nigerian day:

> **Is there light? Is there water? Is the road passable? Is it safe?**

Nobody has ever built the structural answer to those. Facebook groups guess at
it, WhatsApp groups lose it in scroll, and neither can attach it to a house you
might rent. We can. That is the wedge, that is the daily reason to open the app
on a day nobody is booking anything, and it is the one feature a general social
network cannot copy without our inventory.

**The line that makes it ours:** a compound's conversation is not a list of
posts, it is a **live utility record of a place, kept by the people who live
there**, with everything else built around it.

---

## 2. Why this is lucrative, stated plainly

The social layer is not a vanity surface. Four revenue paths fall out of it, and
each one is a by-product of something genuinely useful:

1. **Verified utility history per estate.** "Gwarinpa Estate: 18.4h average
   daily power over 90 days, confirmed by 212 residents." That is the single most
   valuable unpurchasable fact in Nigerian property. It becomes a premium signal
   on listings, a paid report for landlords and developers, and the strongest
   possible reason to trust a RentMe listing over a WhatsApp one.
2. **Boosted Showcase.** An agent pays to place one listing preview inside a
   compound they do not already dominate. Capped hard per compound per day so the
   place never turns into a billboard.
3. **Trusted around here.** A paid, reviewed local directory: the plumber, the
   gas seller, the electrician, the vulcaniser. Earned entries only, reviewable,
   reportable. This is the Nigerian small business internet nobody has built.
4. **Conversation to booking.** @rentmebot answers with real listing cards, so a
   question in a compound becomes a booking without leaving the thread. This is
   the highest intent traffic on the platform.

None of it charges a guest a fee on a stay. The platform's zero-fee rule on
bookings is untouched.

---

## 3. The visual system: what nobody has seen

The reference screenshots convey the ambition, not the look. Theirs is gold and
fantasy serif, and gold is exactly what ours is not. Ours has to be
unmistakably Nigerian and unmistakably ours.

### 3.1 The Pulse Line, the thing people will describe to their friends

A feed is a stack of rectangles on every platform ever shipped. Ours is not.

Every compound page carries a **vertical utility line down the leading edge**,
and each post hangs off it as a node, the way a street hangs off a power line.
That line is **alive**:

- **Light on in this area**: the line carries a slow travelling filament of
  bright cyan, the platform's attention blue, pulsing like current in a wire.
- **Light off**: the line is a dim indigo hairline, static and cold.
- **Water, road, security**: three thinner companion strands beside it, each with
  its own state.

So the page is a living circuit diagram of a neighbourhood. Open a compound and
you know the state of the place before you read one word. That is a genuinely new
reading experience, it is beautiful, it is instantly legible to someone who has
never used a social app, and it is a direct visual expression of the product's
core idea rather than decoration.

Under `prefers-reduced-motion` the filament holds still and the state is carried
by colour and a label. The line is `aria-hidden`; the state is announced in text.

### 3.2 Indigo, because it was already ours

Our brand blue is an accident of good luck: **adire indigo is the Nigerian
blue.** Resist-dyed indigo cloth is centuries of Yoruba craft, and our electric
blue sits in that family. So the canvas leans in:

- **Canvas**: deep indigo, with an adire resist pattern at 2 to 3% opacity,
  large scale, so it reads as texture rather than pattern.
- **Structure**: electric blue for anything live, active or focused.
- **Cyan current**: the bright cyan is reserved for live state, and on a
  compound page that means "there is light". There is no warm accent anywhere
  in this product and there is not going to be one here either. The brand is
  one blue family, and a travelling cyan filament reads as current far better
  than a warm glow ever did.
- **Paper twin**: the light theme is undyed cloth, warm white, with the same
  resist texture at 2% in a neutral grey. Not a blue-tinted grey anywhere.
- **No gold, no amber, no orange.** Gold is the reference's identity. Ours is
  indigo and electric blue, and the palette carries no warm hue at all.

### 3.3 Compound cards, not rectangles

Post cards take a **single notched corner**, bottom-left, echoing both the
notched geometry of an adire stamp and the shape of a compound plot on a survey
plan. One cut corner is enough to make our card silhouette recognisable in a
screenshot with the logo cropped out, which is the actual test of a visual
identity.

Agent Showcase cards notch the opposite corner, so supply and conversation are
distinguishable at a glance without reading.

### 3.4 Nsibidi-derived reaction marks

Not thumbs, not hearts, not emoji. The reaction glyphs are an original set of
geometric ideographs drawn in the spirit of **nsibidi**, the Igbo ideographic
script: marks that mean a thing rather than picture it. Four marks, drawn once,
ours forever, and they carry meaning to a Nigerian eye that a thumb never will.

They animate on tap by **drawing themselves in one stroke**, which is both
beautiful and cheap on a mid-range phone.

### 3.5 Typography and motion

- Compound names: a geometric display face, all caps, tight tracking. Confident
  and modern, never a fantasy serif.
- Body: the platform's existing stack, unchanged.
- Numerals: the existing `nf-numeric` treatment, so counts match the wallet.
- Motion: the existing `nf-enter` and reveal language, and the same discipline
  already learned the hard way, which is that anything already on screen at first
  paint is shown outright and never left mid animation.

### 3.6 Three structural refusals, kept

1. **No infinite scroll.** A compound session is "Today in Yaba", with a real
   end and a marker. Data is bought in bundles in this country and a feed that
   ends respects that. It also stops the social layer cannibalising booking.
2. **No public follower counts.** Clout chasing invites exactly the fake accounts
   and rental scams we exist to prevent. Standing comes from Correct marks and
   badges, never audience size.
3. **No stranger DMs by default.** Contact is a request the other person accepts.
   This matters most for women and adoption depends on it.

---

## 4. The lexicon

Naming is culture. Every surface uses the words a Nigerian would actually use,
with a plain English gloss on first encounter so nothing is exclusionary.

| Concept | Our word | Never |
|---|---|---|
| Hub | **Compound** | Group, community |
| Post | **Gist** | Post, tweet |
| Reply | **Talk** | Comment |
| Repost | **Echo** | Retweet, share |
| Approve or helpful | **Correct** | Like, upvote |
| Presence confirm | **I dey** | Same, me too |
| Been there | **I sabi here** | Check in |
| Views | **Seen by N around here** | Views, impressions |
| Save | **Keep** | Bookmark |
| Utility report | **Light / Water / Road / Safe** | Status |
| Issue report | **Wahala** | Complaint |
| Meet up | **Owambe** | Event |
| Standing | **Correct count** | Karma, score |
| Compose | **Drop gist** | New post |
| Message field | **Talk your mind** | Type a message |

Pidgin is a register, offered and remembered per user, never assumed from a name
or a location.

---

## 5. Post kinds

Six, and each one earns its place.

1. **Light** (the wedge). A one-tap utility report: light on, light off, water,
   road, security. Body optional. This is the cheapest possible post to make and
   the most valuable one to aggregate. It expires from the feed in hours but
   never from the record.
2. **Gist**. Ordinary text and photos, rooted in a compound.
3. **Ask**. A question about the place. Trusted plumber, school run, market day.
4. **Wahala**. A structured problem report: flooding, refuse, a bad landlord,
   security. Categorised, moderated, and never a channel for naming a private
   individual.
5. **Owambe**. Explicitly for meeting people, and it **expires** in 24 to 72
   hours chosen by the poster. A plan that has passed is noise, and a feed that
   cleans itself never rots. Carries the safety line every time.
6. **Showcase**. Agents only. Renders a real listing card inline and is only
   permitted against a listing that is genuinely PUBLISHED, enforced in the
   database, so unvetted inventory can never reach the social surface.

---

## 6. Engagement primitives

One primary mark, three secondary, all polymorphic across gist and talk.

| Mark | Meaning | Where |
|---|---|---|
| **Correct** | This is right and useful. Feeds standing. | Everywhere |
| **I dey** | I confirm this from here, right now. | Light, Wahala |
| **I sabi here** | I know this place. Cheap to give, informative. | Place-bound |
| **Keep** | Save it. Reuses the existing saved concept. | Everywhere |

**Na lie** exists but is **not a public counter**. It is a dispute signal routed
to moderation and to the utility aggregate's confidence score. Shown publicly it
would become a bullying tool; used privately it is how we keep the utility record
honest.

**Echo** is a repost, optionally with your own words on top (a quote echo).

**Talk** is a reply, and the count shows live participants rather than a raw
number, because "6 people talking" invites more than "6".

---

## 7. @rentmebot, and why its replies are first class

Summoned by name in a gist or a talk. Visibly a bot, never impersonating a
person.

**The owner requirement, stated exactly: users can talk on the bot's replies, and
users can Correct and Echo the bot's replies.** That is not a bolt-on, it is a
schema decision made on the first day:

> A bot reply is **just a reply** with `author_kind = 'bot'`, in the same table,
> with the same id space. Every reaction, echo and nested talk therefore works on
> it with no special casing anywhere in the product.

Get that wrong and it becomes a rewrite later. It is the single most important
structural call in this document.

**What makes ours different from a chat bot in comments: it hands back real
inventory.** An answer can carry listing cards, a map pin, or a Message the agent
action.

**Guardrails, non-negotiable:**

- Reads **public compound context only**. Never private messages, never another
  user's bookings, wallet or profile. It never holds a service role.
- One reply per summon. No follow-ups unless summoned again.
- Rate limited per user and per thread on the durable limiter already built.
- Never arbitrates a dispute, never promises a refund, never quotes a price it
  cannot source from a real listing. Money, safety and fraud go to support.
- Never replies to content the scanner has flagged, and never takes abuse bait.
- Hard monthly cost ceiling and a kill switch on the existing feature flags
  table, because an open summon surface is an open spending surface.

---

## 8. Data model, complete

Every table RLS-enabled at creation. Every policy wraps `auth.uid()` in a scalar
subquery, which this codebase learned to do the hard way for the query planner.
Every foreign key gets a covering index.

### 8.1 Places and membership

**`compounds`**
`id uuid pk`, `slug text unique`, `kind` (`area`,`city`,`estate`,`campus`),
`name text`, `state_code text fk states`, `city text`, `area text`,
`centre geography(point)` nullable, `member_count int default 0`,
`gist_count int default 0`, `status` (`ACTIVE`,`PAUSED`,`ARCHIVED`),
`created_by uuid fk auth.users`, `created_at`.
Read: anyone, ACTIVE only. Write: admin only in S0, so the first cities are
curated rather than a landgrab.

**`compound_members`**
`compound_id`, `user_id`, `role` (`MEMBER`,`RESIDENT`,`MODERATOR`),
`resident_verified_at` nullable, `joined_at`, pk `(compound_id, user_id)`.
`RESIDENT` is earned by a completed stay or a verified address in that area, and
it is what weights a utility report. Read: members and admins. Write: self join
and leave, moderator promotion by admin only.

### 8.2 Profiles, with bios

**`social_profiles`** (extends `profiles`, never replaces it)
`user_id pk fk profiles`, `handle citext unique`, `bio text` (max 240),
`pronouns text` nullable, `link text` nullable, `banner_path text` nullable,
`home_compound_id` nullable, `correct_count int default 0`,
`echo_count int default 0`, `contact_policy` (`REQUEST`,`OPEN`) default
`REQUEST`, `pidgin_ok boolean default false`, `created_at`, `updated_at`.
- `handle` is claimed once, reserved word list enforced, and a handle that
  resembles a RentMe official name is refused at the database level.
- `bio` and `link` pass the fraud scanner on write, because a bio is the oldest
  place in the world to hide a phone number and an off-platform payment ask.
Read: anyone. Write: self only.

### 8.3 Content

**`gists`**
`id uuid pk`, `compound_id fk`, `author_id fk auth.users`,
`kind` (`LIGHT`,`GIST`,`ASK`,`WAHALA`,`OWAMBE`,`SHOWCASE`), `body text`,
`listing_id` nullable fk listings, `utility` jsonb nullable,
`wahala_category text` nullable, `expires_at` nullable,
`talk_count int default 0`, `correct_count int default 0`,
`echo_count int default 0`, `seen_count int default 0`,
`status` (`LIVE`,`HIDDEN`,`REMOVED`), `flagged_at` nullable,
`created_at`, `edited_at` nullable.

Constraints that carry the rules rather than hoping code remembers them:
- `SHOWCASE` requires `listing_id not null`, and a trigger refuses it unless that
  listing is PUBLISHED **and** owned by an agent row belonging to the author.
- `OWAMBE` requires `expires_at not null` and inside 24 to 72 hours.
- `LIGHT` requires `utility not null` and an empty or short body.
- `listing_id not null` implies `kind = 'SHOWCASE'`.

**`gist_media`**
`id`, `gist_id fk on delete cascade`, `storage_path`, `width`, `height`,
`position`, unique `(gist_id, position)`, max 4 enforced by trigger.

**`talks`** (replies, and the bot lives here)
`id uuid pk`, `gist_id fk on delete cascade`, `parent_id` self fk nullable,
`author_id` nullable fk auth.users, `author_kind` (`USER`,`BOT`) default `USER`,
`body text`, `payload jsonb` nullable (the bot's listing cards and map pins),
`correct_count int default 0`, `echo_count int default 0`,
`talk_count int default 0`, `status` (`LIVE`,`HIDDEN`,`REMOVED`),
`created_at`, `edited_at` nullable.
- `author_id is null` is permitted **only** when `author_kind = 'BOT'`, enforced
  by check constraint. That is what lets a bot reply be liked, echoed and replied
  to by exactly the same code paths as a human one.
- Depth capped at 3 by trigger, so a thread stays readable on a 390px screen.

**`social_reactions`** (polymorphic, one row per user per target per mark)
`id`, `target_type` (`GIST`,`TALK`), `target_id uuid`, `user_id fk`,
`mark` (`CORRECT`,`I_DEY`,`I_SABI_HERE`,`KEEP`,`NA_LIE`), `created_at`,
unique `(target_type, target_id, user_id, mark)`.
- `NA_LIE` rows are readable only by the author, moderators and admins.
- Counter columns maintained by trigger, so a feed read is one query and never a
  fan-out of counts.

**`echoes`**
`id`, `target_type` (`GIST`,`TALK`), `target_id uuid`, `user_id fk`,
`compound_id fk` (where it was echoed into), `note text` nullable (quote echo),
`created_at`, unique `(target_type, target_id, user_id)` where `note is null`.
A plain echo is once per person; a quote echo is a new object and may repeat.
**Echoing a TALK is the AI repost requirement, and it needs no special case.**

**`gist_views`**
`gist_id`, `viewer_bucket text` (a salted daily hash of the viewer, never a raw
id), `nearby boolean`, `seen_on date`, pk `(gist_id, viewer_bucket, seen_on)`.
The hash is what lets us say "seen by N around here" without building a per-user
surveillance record of who read what.

### 8.4 Utility, the wedge

**`utility_reports`**
`id`, `compound_id fk`, `user_id fk`, `gist_id` nullable fk,
`kind` (`LIGHT`,`WATER`,`ROAD`,`SAFETY`), `state` (`ON`,`OFF`,`PARTIAL`),
`reported_at timestamptz default now()`, `weight numeric` (RESIDENT counts more),
unique `(compound_id, user_id, kind, date_trunc('hour', reported_at))` so nobody
can spam the record within an hour.

**`utility_state`** (the live answer, one row per compound per kind)
`compound_id`, `kind`, `state`, `confidence numeric`, `sample_count int`,
`changed_at`, `computed_at`, pk `(compound_id, kind)`.
Recomputed by trigger on insert and by a scheduled job, weighting recency,
resident status and dispute marks. **This table is what the Pulse Line renders
and what a premium listing signal reads.**

**`utility_daily`** (the sellable history)
`compound_id`, `kind`, `day date`, `hours_on numeric`, `sample_count int`,
pk `(compound_id, kind, day)`. Rolled up nightly. This is the asset.

### 8.5 Safety and relationships

**`follows`** `follower_id`, `followee_id`, `created_at`. Counts are private.
**`contact_requests`** `id`, `from_id`, `to_id`, `state` (`PENDING`,`ACCEPTED`,`DECLINED`), `created_at`, `decided_at`.
**`blocks`** `user_id`, `other_id`, `created_at`. Bidirectional invisibility.
**`mutes`** `user_id`, `target_type` (`USER`,`GIST`,`COMPOUND`), `target_id`. One-way silence.
**`bot_invocations`** `id`, `target_type`, `target_id`, `user_id`, `prompt`, `answer`, `tokens`, `cost_minor`, `created_at`. Abuse and cost control, and the monthly ceiling reads it.

`reports` already exists and gains `GIST`, `TALK` and `SOCIAL_PROFILE` target
types. `notifications` already exists and gains social kinds. `badges` and
`user_badges` come from `docs/BADGES.md`.

### 8.6 Functions, triggers, policies

- `private.can_see_gist(gist uuid)`: compound membership or public compound, and
  neither party blocked. Granted to `anon` and `authenticated`, and **granted to
  anon deliberately**, because this codebase has already had one launch-blocking
  outage from an RLS helper anon could not execute.
- `private.is_compound_member(compound uuid, who uuid)`.
- `private.recompute_utility_state(compound uuid, kind text)`.
- `private.bump_social_counters()`: one trigger maintaining every counter column.
- `private.scan_social_content()`: extends the existing message fraud scanner to
  gists, talks and bios. Off-platform payment steering is the scam wherever it is
  typed.
- `private.enforce_showcase_listing()`: the PUBLISHED and ownership check.
- `private.expire_gists()`: scheduled, retires OWAMBE and LIGHT from the feed
  without deleting the record. **Waits on `pg_cron`, which is still not enabled.**
- Every policy: read gated on `can_see_gist`, write gated on authorship,
  moderation gated on `private.has_role`.

### 8.7 Storage

New **private** bucket `social-media`, path `<auth uid>/<gist id>/<uuid>.<ext>`,
served through signed URLs. Banners go in a public `social-banners` bucket since
a banner is public by definition. **Every image is re-encoded through a canvas
before upload to strip EXIF**, exactly as listing photos already are, because a
geotagged photo of your own compound published to a public bucket tells the
internet where you sleep.

---

## 9. Server actions

Every one returns the typed `ActionResult` envelope, resolves the session through
`resolveSession`, respects a `social` feature flag, passes the durable rate
limiter, and reports failure as one plain sentence.

**Compounds**: `joinCompound`, `leaveCompound`, `setHomeCompound`.
**Profiles**: `claimHandle`, `updateSocialProfile` (bio, pronouns, link, contact policy, pidgin), `uploadBanner`.
**Content**: `dropGist`, `editGist` (15 minute window, `edited_at` shown), `removeGist`, `attachGistMedia`, `dropTalk`, `removeTalk`.
**Utility**: `reportUtility` (the one-tap wedge), `disputeUtility`.
**Marks**: `toggleMark`, `echo`, `quoteEcho`, `recordSeen`.
**Relationships**: `follow`, `unfollow`, `requestContact`, `decideContact`, `block`, `unblock`, `mute`, `unmute`.
**Safety**: `reportContent`.
**AI**: `summonBot` (flag, per-user and per-thread limit, cost ceiling, writes `bot_invocations`, inserts a `talks` row with `author_kind = 'BOT'`).
**Admin**: `hideGist`, `removeGist`, `promoteModerator`, `pauseCompound`, `grantBadge`, `revokeBadge`.

---

## 10. Screens

| Route | What it is |
|---|---|
| `/compound` | The compounds you are in, plus discovery by state and area |
| `/compound/[slug]` | The place. Pulse Line, utility strip, session feed with a real end |
| `/compound/[slug]/utility` | The record. Light history, water, road, safety, with sample counts |
| `/gist/[id]` | One gist and its talks, including bot talks with full marks and echo |
| `/u/[handle]` | Profile: banner, avatar, bio, badges, compounds, gists, echoes, media |
| `/u/[handle]/edit` | Bio, pronouns, link, handle, contact policy, pidgin register |
| `/compose` | Drop gist. Kind picker first, because the kind changes the whole form |
| `/social/notifications` | Folded into the existing notifications surface, not a second one |
| `/admin/social` | Queue: flagged gists and talks, reports, compounds, moderators, bot spend |

Entry point lives in the app, and **the default tab stays discovery**. The day
the social layer out-competes booking for attention is the day it starts costing
us money.

---

## 11. The build order

Ship the wedge, not the feed. If Light works, everything else earns its way in.

### S0. The compound and the Pulse Line
- [ ] Migration: `compounds`, `compound_members`, RLS, indexes, seed one city
- [ ] Migration: `utility_reports`, `utility_state`, `utility_daily`, recompute function and trigger
- [ ] Migration: `social_profiles` with bio, handle reservation, scanner on write
- [ ] `reportUtility` and `disputeUtility` actions, rate limited
- [ ] `joinCompound`, `leaveCompound`, `claimHandle`, `updateSocialProfile`
- [ ] Design tokens: indigo canvas, adire texture, cyan current, notched card
- [ ] `PulseLine` component, both themes, reduced motion, `aria-hidden` with a text state
- [ ] `/compound`, `/compound/[slug]`, `/compound/[slug]/utility`
- [ ] `/u/[handle]` and `/u/[handle]/edit`
- [ ] Playwright: report light, see the line change, reload, see it persist
- [ ] Screenshots at 390px, dark and paper

### S1. Gist, Ask, Wahala, and the marks
- [ ] Migration: `gists`, `gist_media`, `talks`, `social_reactions`, `echoes`, `gist_views`
- [ ] Migration: counter triggers, depth cap, scanner on gists and talks
- [ ] Migration: `social-media` private bucket and policies
- [ ] Nsibidi mark set drawn, four glyphs, one-stroke draw animation
- [ ] `dropGist`, `editGist`, `dropTalk`, `toggleMark`, `echo`, `quoteEcho`, `recordSeen`
- [ ] `/compose`, `/gist/[id]`, session feed with a real end and a marker
- [ ] EXIF strip on upload, refuse rather than upload on failure
- [ ] Playwright: drop a gist, mark it Correct, echo it, reload, all three persist

### S2. Safety, before it is needed and not after
- [ ] Migration: `blocks`, `mutes`, `follows`, `contact_requests`, `reports` target types
- [ ] Block is bidirectional invisibility, proven by a test that reads as the blocked user
- [ ] `reportContent` into the existing admin queue
- [ ] `/admin/social` queue: flagged, reported, hide, remove, promote, pause
- [ ] Rate limits on gists per day, talks per minute, joins, marks, echoes
- [ ] NDPA: retention position, export path, takedown process, written down
- [ ] Playwright: report, block, mute, and prove each one takes effect

### S3. @rentmebot in the talks
- [ ] Migration: `bot_invocations`, `talks.author_kind` already in place from S1
- [ ] `summonBot` behind the flag, per-user and per-thread limits, cost ceiling, kill switch
- [ ] Bot talk renders with a bot mark, listing cards and a Message the agent action
- [ ] **Proof that a bot talk can be Corrected, Echoed and replied to, by test**
- [ ] Refusals: no disputes, no refunds, no unsourced prices, no flagged threads
- [ ] Playwright: summon, get one reply, Correct it, Echo it, talk on it, reload

### S4. Showcase and Owambe
- [ ] Migration: showcase PUBLISHED and ownership trigger, owambe expiry constraint
- [ ] Showcase renders a real listing card, refused for any non-PUBLISHED listing
- [ ] Owambe expiry, safety line on every one, `expire_gists` job
- [ ] **`pg_cron` enabled**, which also unblocks stale holds and badge awarding
- [ ] Playwright: a non-PUBLISHED listing cannot be showcased

### S5. Standing
- [ ] `badges` and `user_badges` per `docs/BADGES.md`
- [ ] Correct-based member ladder, agent chip beside the name, earned moment
- [ ] Admin grant and revoke with a mandatory reason and an audit row
- [ ] Anti-farming: Correct counts only from accounts with a completed stay or a
      verified phone, and once per pair per week towards a badge

### S6. The money
- [ ] `utility_daily` rollup and the estate report surface
- [ ] Boosted Showcase, capped per compound per day, labelled as paid
- [ ] Trusted around here directory, earned entries, reviewable, reportable
- [ ] Conversion tracking from a bot answer to a booking

---

## 12. Honest risks

- **Moderation is a staffing question, not only a software one.** A compound with
  nobody watching it becomes the platform's reputation. Do not open every city at
  once. One city, watched properly.
- **The utility record is only as good as its honesty.** Weighting by resident
  status, the hourly unique constraint and the private Na lie signal are the three
  defences. If the record is gamed the whole wedge is worthless, so this is the
  part to over-engineer.
- **A social layer is an unbounded liability if safety ships after launch.** That
  is why S2 is third and not last.
- **Wahala posts can defame.** Never a channel for naming a private individual.
  Categories and places, not people, enforced in the form and in review.
- **Cost.** An open bot summon surface is an open spending surface. The ceiling
  and the kill switch are not optional.
- **Attention.** If this out-competes booking we lose money. Discovery stays the
  default tab and the feed keeps its ending.

---

## 13. The one line to remember

Everyone else built a feed and hoped place mattered. We already own place, so we
are building the living record of a Nigerian neighbourhood, and the conversation
is what happens around it.
