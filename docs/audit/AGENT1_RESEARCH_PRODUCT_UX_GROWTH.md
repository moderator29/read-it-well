# Agent 1: research, product, UX and growth

Track B, agent 1 of three. Written 15 September 2026.

Scope: the public site, entry and identity, discovery, the social layer, saved,
inspections, trust surfaces, the assistant, the four locales, and the
onboarding, retention, growth and diaspora product questions across the
platform.

---

## 1. The rules, restated

1. **No em dashes.** Anywhere. Commas, colons, full stops, brackets.
2. **British spelling** in docs and product copy: colour, organise, realise,
   behaviour, centre, licence as a noun.
3. **Money is integer kobo, bigint.** `Math.round(naira * 100)` only at the
   input boundary. Display only through `formatMoney`. No floats, no hand
   division by 100. Percentages are integer basis points.
4. **Server actions speak the ActionResult envelope.** Sessions come from
   `resolveSession()`.
5. **Icons are `BrandIcon` and `UiIcon` only.** `Icon` and `Icon3D` are
   deleted, not retired. `UiIcon` has no `strokeWidth` and one size scale:
   12, 16, 20, 24, 28, 32. `BrandIcon` has no `ramp`.
6. **390px first.** Audit at phone width before anything wider.
7. **Dark is the default** and the operating system does not override it. Only
   a stored choice moves the theme. Light is a designed paper twin.
8. **No fees anywhere.** The platform charges nothing. Copy never presents a
   platform fee as a thing that is charged. A processor's cut is labelled as
   the processor's. Monetisation must work inside that.
9. **One blue family.** base `#010118`, glow `#0C39EF`, mid `#000F98`, neon
   `#0010E0`, electric `#0010D0`, ink `#000010`. No orange, amber, gold,
   purple, violet, magenta or generic SaaS blue. Emerald means success, rose
   means error, bright cyan is attention and pending.
10. **First-party inventory only.** ADR-013. No Places, no LiteAPI, no
    aggregator, no scraped stock. A recommendation proposing an external feed
    is out of scope by decision.
11. **Escrow is promised nowhere** until it exists. It is zero percent built.
12. **No dark patterns.** No manufactured urgency, fake scarcity, fake social
    proof, invented counts, resetting countdowns, manipulative notifications
    or exit friction. A retention idea that needs a confused user is rejected.
13. **Banned in UI copy:** demo, sample, preview, not live, coming soon, lorem.
14. **The brand is Vallo.** VALLO SPACES LTD appears only on legal surfaces.
    RentMe and NaijaFinds are dead.

Operating rules I worked under: read-only on the whole repository except this
file; no git except read-only commands; no rebuilding what is already built;
the sandbox cannot reach Supabase and that is environment, not product; and no
padding the count.

Other agents' scopes, which I did not write into and did not audit: Agent 2
owns server-side security, schema, queries, integrations, `app/api`,
middleware, `supabase/`, `scripts/`, the admin and agent consoles. Agent 3 owns
`components/`, `design-system/`, all CSS, `packages/design-tokens`, the `(app)`
screens for listing, wallet, messages, bookings, checkout, profile, settings
and notifications, and `apps/web/tests`. Track A owns the brand rename, brand
assets, `lib/legal`, and the terms and privacy page files. Findings in their
territory are tagged `[AGENT 2]`, `[AGENT 3]` or `[TRACK A]`.

---

## 2. What I read and what I ran

Read in full, 15 September 2026:

| File | Why |
| --- | --- |
| `docs/HANDOFF_01_COMPANY.md` | sections 1, 4, 5, 7, 8, 9, 10 |
| `docs/HANDOFF_02_PLATFORM.md` | sections 0, 1, 2, 3, 5, 6, 7, 8, 9, 21, 22, 23, 25, 26.3, 26.5, 27, 28, 29, 30 |
| `docs/PRODUCT.md` | all 373 lines |
| `KNOWN_GAPS.md` | the outline plus lines 128 to 330 in full |
| `RECOMMENDATIONS.md` | the full heading index (177 entries), plus S-4, N-1, N-6, P-6, P-8, O-5, V-6, E-3, LG-1, PERF-6 in full |
| `docs/SOCIAL_DESIGN.md` | the outline plus sections 3, 6, 11, 12, 13 in full |

Code read, by file rather than by grep, in my scope:

`app/page.tsx`, `app/layout.tsx` metadata, `app/loading.tsx`, `app/not-found.tsx`,
`app/offline/page.tsx`, `app/robots.ts`, `app/sitemap.ts`,
`app/home-or-landing/route.ts`, `app/welcome/page.tsx`, `middleware.ts` (read for
the gate, not audited: Agent 2 owns it), all six `(auth)` pages,
`(site)/safety`, `(site)/help`, `(site)/contact/topics.ts`,
`(app)/search/page.tsx` (first 140 lines and the sort block),
`(app)/around/page.tsx`, `(app)/u/page.tsx`, `(app)/u/[handle]/page.tsx`
metadata, `(app)/post/[id]/page.tsx` metadata, `(app)/stories/new/page.tsx`,
`(app)/assistant/page.tsx`, `(app)/listing/[id]/RentalPanel.tsx`,
`(app)/settings/AccountToggles.tsx`, `(app)/saved/SavedBoard.tsx`,
`lib/site/gated-href.ts`, `lib/saved/*` (all five files),
`lib/trust/standards.ts`, `lib/trust/verification.ts`,
`lib/trust/cancellation.ts` (the money maths), `lib/inspections/types.ts` and
the query and action signatures, `lib/interests/schema.ts`,
`lib/search/memory.ts`, `lib/assistant/protocol.ts` and `types.ts`,
`lib/listings/search-params.ts`, `lib/listings/sitemap.ts` static list,
`lib/listings/syndication.ts` `listingMetadata`, `lib/email/recipients.ts`,
`lib/flags.ts`, `lib/social/profile-tabs-schema.ts`,
`lib/social/posts-queries.ts` activity block, `packages/i18n/src/locales/en.ts`
top-level structure and the `notify`, `settings.notify` and `admin.switches`
blocks.

Commands I actually ran and read the output of:

- `git rev-parse --abbrev-ref HEAD` (confirmed `claude/zealous-brown-gn45mg`)
- roughly 60 `grep`, `find`, `awk` and `sed` reads, one question at a time
- a Python key-path diff of `en.ts` against `ha.ts`, which I then **discarded as
  unreliable** (see section 3)
- `wc -l` counts on the reading list and on my route tree

I did **not** run `npm run build`, `npm run typecheck`, `npm run lint`, vitest or
any spec in `apps/web/tests`. The lead was running the baseline concurrently and
the brief said once is enough. Every claim below is from reading source, not from
executing it.

---

## 3. What I did not check and did not do

Put here rather than at the end, because it changes how much weight to give the
rest.

1. **I never reached the database.** Every schema claim comes from
   `apps/web/src/lib/supabase/database.types.ts`, the generated types, and from
   migration and documentation text. The generated file could be stale;
   RECOMMENDATIONS P-5 exists because nothing regenerates it in CI. Where I say
   "a column does not exist", read it as "the generated types do not declare it".
2. **I rendered nothing.** No browser, no screenshot, no spec run. Every
   statement about what a screen shows is read from its source. I did not verify
   visual output at 390px, in either theme, in any locale.
3. **I did not audit accessibility properly.** I confirmed the skip link, the
   `lang` and `dir` attributes, `id="main"` on every shell, and that `aria-live`
   is used in 20-odd places. I did not run axe, did not tab through anything,
   did not check contrast ratios, and did not test with a screen reader. Any
   accessibility score below is a floor, not a measurement.
4. **My locale key-parity check was inconclusive and I threw it away.** My
   extraction script could not handle multi-line objects and the spread of
   `counts`, so its 22 "missing keys" were formatting artefacts. The `Dictionary`
   type is derived from `en`, so TypeScript enforces parity anyway. **I am not
   claiming a key-parity gap.** The localisation findings below are all about
   strings that are not in the dictionary at all.
5. **I did not read the three non-English locale files for quality.** KNOWN_GAPS
   already says they await native review and names the specific weak blocks. I
   did not re-derive that and I am not qualified to judge it.
6. **I did not audit `lib/social` deeply.** It is 31 files and roughly 300KB. I
   read the schemas, the profile-tab queries and the activity query, and I read
   `posts-queries.ts` only around the activity block. `posts-actions.ts` (26KB),
   `areas-actions.ts`, `stories-actions.ts`, `follows-actions.ts`,
   `bot-actions.ts` and `admin-actions.ts` I did not read. There may be findings
   in there that I have missed.
7. **I did not read `(site)/docs/chapters.tsx`** beyond grepping it. It is 2,216
   lines of English documentation. I checked that it is not localised and that it
   links to `/agents` and `/agents/status`. I did not read it for accuracy against
   the code, which it almost certainly needs.
8. **I did not audit performance.** No bundle measurement, no Lighthouse, no
   network throttling. Section 23.3 of the handoff asks for it and I have not
   done it. I did confirm `save-data` plumbing exists as a setting; I did not
   confirm it is honoured end to end.
9. **I did not check the light theme.** Rule 7 says both are real themes and both
   must be verified. I verified neither.
10. **I did not audit the four locales' marketing register.** Whether the Yorùbá
    landing copy persuades anybody is a question for a Yorùbá speaker.
11. **I did not look at `apps/web/android` or `apps/web/ios`.** Out of scope and
    on the stop list.
12. **I did not verify the live `feature_flags` rows.** I can only say what the
    `FeatureKey` union and the dictionary declare.

Nothing in this report uses the words "verified", "tested" or "confirmed" about
something I did not read the output of. Where I corrected my own wrong first
conclusion during the sweep, I have said so in the entry.

---

## 4. The honest state of my scope

Short version: **the craft is extraordinary and the product does not close.**

I have audited a lot of codebases. The comment quality in this repository is
better than almost anything I have read. `lib/trust/verification.ts`,
`app/sitemap.ts`, `lib/email/recipients.ts`, `app/not-found.tsx` and
`lib/listings/syndication.ts` are not just correct, they explain why they are
correct and what went wrong before. The refusal to fabricate is real and it is
everywhere: `VoicesBand` renders null rather than invent a testimonial,
`getPlatformStats` returns null rather than print a mockup number, the sitemap
refuses example listings twice, `/agent/analytics` prints what it cannot count.
Money goes through integer basis points. The cancellation schedule is data, read
by both the public page and the console. There are zero em dashes and zero banned
words in my scope. 390px discipline is real: I found two fixed pixel widths in
the whole of `(site)` and both are behind `lg:` and `xl:` prefixes.

And then there are four things that make it, today, not a product.

**One. The rent market cannot transact.** This is the biggest finding in my scope
and I could not find it named anywhere in the documentation. `lib/bookings/actions.ts`
refuses a rental outright: `if (row.rate_minor <= 0 || row.rate_period === null)
return fail(RENTAL_MESSAGE)` and `if (seed.kind === "rental") return
fail(RENTAL_MESSAGE)`, with the message "This home is rented on a tenancy, not
per night. Message the agent to arrange an inspection." `RentalPanel.tsx` prints
three steps, the third being "Pay through Vallo. Only once you have seen the
place", and it renders **no control for step three**. So the journey for the
market the company is named for is: search, message, request an inspection, and
stop. There is no rent payment, no tenancy record, no receipt, no agreement, and
because `reviews_insert_own` requires a CONFIRMED booking with a past `check_out`,
**no renter can ever leave a review.** The safety centre's central promise, "you
never pay a person, you pay the platform", has no implementation for renting.
Everything that works, works for nightly stays. Buying and selling being unbuilt
is documented as the largest hole. Renting being untransactable is not documented
at all, and it is larger.

**Two. The front door refuses to open.** `N-1` is marked DONE: the middleware
opens `search`, `listing`, `rent`, `around`, `u` and `post` to anybody. But
`lib/site/gated-href.ts` still wraps every product link on the landing page in
`/sign-up?next=`, at 21 call sites, and its own comment explains the reasoning
from before N-1 landed: "Since the product moved behind a session, every one of
those was a link to a redirect." That is no longer true and nobody went back. So
the hero's primary button, the five city chips, the five category tiles, the
featured carousel's listing links and the story rail all send a stranger to a
registration form instead of to the catalogue the middleware would happily show
them. Meanwhile `SiteHeader` links to `/search` directly and `SiteFooter` links
to five filtered searches directly. One page, two contradictory answers to the
same question, and the loud one is wrong.

**Three. Four languages ship and the transaction does not speak them.** Twenty of
the twenty-one files in `app/(site)` do not import `getDictionary`. The safety
centre, the trust and safety standards, the cancellation policy, the help centre,
2,216 lines of documentation, the contact form, the about page and the careers
page are English only. So is the entire messaging layer, so is notifications, so
are stories, so is the assistant: `app/api/assistant/route.ts` contains no
locale handling at all, and `AssistantChat` does not send the locale in its
request body. The landing page prints "4" in its facts band under a language
label, and the trust strip says multi-language. For a Hausa speaker in Kano, the
page that exists to stop them being defrauded is in a language they may not read.
This is not a translation backlog. It is a claim the product does not honour.

**Four. A privacy control that does nothing.** `/settings` offers "Hide my
activity", subtitled "Keep your reviews and recent stays off your public
profile." `hideActivity` appears in exactly four places in the codebase, all of
them in `lib/profile/schema.ts`: the type, the default, and two zod schemas.
Nothing reads it. Meanwhile `/u/[handle]` is public, inherits `index: true` from
the root layout, carries an Activity tab listing every post the person has liked
and reposted, and `social_profiles` has no visibility column of any kind. A person
who turns that switch on has been told something untrue about who can see them,
on a platform whose own handoff calls privacy a product requirement.

Beyond those four, the pattern across my scope is the same shape repeated:
**infrastructure built to a high standard, with the last connecting piece
missing.** `saved_searches` exists as a table with no writer and no screen.
`readInspectionsForRequester` exists and lands inside a screen called Bookings, a
word that by the platform's own terminology means a nightly stay. `events` and
`event_attendees` exist with a feature flag called Meetups and zero lines of
query or UI. `area_members` carries `utility_weight` and `notify_utility` for a
utility record that has no table, no reporting surface and no state, which means
the thing `SOCIAL_DESIGN.md` calls "the whole wedge" and "the entry people come
back for" is not built. The verification ladder is beautifully specified in four
named rungs and a listing card shows a single boolean tick. An "Instant book"
filter sits in the drawer and `supabase-repository.ts` states in a comment that
`instantBook` is false on every database row, so ticking it empties the catalogue
by construction.

And the trust surfaces contradict each other on the one subject that matters
most. The safety centre tells a renter "never pay an inspection fee, a holding
fee or an agency fee to anybody", with no qualifier. `listings` carries
`agency_fee_minor`, `legal_fee_minor`, `agreement_fee_minor` and
`caution_deposit_minor` as first-class columns, and `total_move_in_cost_minor` as
the indexed number the product rule says the card should lead with. So the page
that teaches a renter what is safe tells them not to pay a fee the product is
built to itemise. `NEVER_ASK` gets this right with "payable to us". The
inspection steps do not. The first time a renter notices, the safety page stops
being believed, and that page is the product's whole argument.

Honest summary: this is a platform with the engineering standards of a much
larger company and the completeness of a prototype in the market it is named
for. Nothing here needs rewriting. Several things need finishing, and one of them
is the rent transaction.

---

## 5. Ratings

Scored out of 100 against what a Nigerian user can open today, not against the
last version of this platform. Each is capped by its worst user-visible failure.

### UX: 54

**Evidence for what is good.** Every screen I opened has a designed empty state,
a designed unconfigured state and a designed signed-out state, and the comments
show each one replaced a fabricated fixture. `app/not-found.tsx` asks the session
who is reading so "back to home" means the right home. `/u` is a GET form so a
people search is a shareable link and costs no JavaScript. `lib/search/memory.ts`
keeps the view in a cookie specifically so a map-preferring person gets the map
in the first paint. Filters live in the address bar so the back button works.

**The cap.** The single most common action on a property app, saving a place to
come back to, is refused to a signed-out visitor. `toggleSave` returns
`fail(SIGNED_OUT_MESSAGE)` for any real listing when there is no session, and
`ListingActions.tsx` only writes to the device on the `mode: "local"` branch,
which real listings never take. I first read this as "saves are kept locally and
never promoted", checked again, and it is worse: they are not kept at all. The
heart bounces back. So the lowest-commitment step in the funnel is a wall, on a
product that just spent a migration opening browsing to strangers.

**Second cap.** Six `(app)` routes have no `loading.tsx` and `(app)` has no
group-level one, so `/wallet/transactions`, `/wallet/transactions/[id]`,
`/settings/devices`, `/profile/setup`, `/profile/setup/[role]` and
`/profile/application` fall through to `app/loading.tsx`, which draws the
**landing page hero**: three display lines, a fake search bar and four feature
cards. That file's own comment asserts that `(app)` keeps its own skeletons. It
does not.

### Overall product readiness: 31

**Evidence.** The nightly-stay loop genuinely closes end to end and was proven
against live Postgres. Auth, RLS, rate limiting, idempotency, notification
triggers and five branded auth emails exist. 774 local governments, 749
occupations, 37 states, 7 areas and 15 badges are seeded.

**The cap.** Rent cannot be paid for, sale cannot be rendered, and reviews are
impossible outside the nightly market. Three of the four markets in
`docs/PRODUCT.md` section 2 cannot complete a transaction. A marketplace that
cannot complete its primary transaction is not ready, however good the parts are.
I am scoring the product, not the code.

### Differentiation: 44

**Evidence for the score being this high.** The differentiators are real and they
are unusual. `total_move_in_cost_minor` as an indexed first-class column with the
product rule "the card leads with the total move-in cost and the rent is the
secondary line" is a genuinely better answer than every competitor in this market.
`power_grid` as a Band A through none enum, `power_backup_hours`, `water_supply`,
`prepaid_meter` and `has_estate_access` as structured columns rather than tick
boxes is exactly right for Nigeria. The four-rung verification ladder with a
written `meaning` and `evidence` per rung is better designed than most KYC
products. First-party-only inventory is a defensible moat.

**The cap.** Almost none of it is reachable by a user. `DiscoveryQuery` in
`search-params.ts` has no `intent`, no `moveInCostMax`, no `tenure`, no `sizeSqm`
and no `saleStatus`. So the differentiating number, the total cost of moving in,
cannot be filtered or sorted on. The power and water columns **are** filterable,
which is the one place the differentiation reaches the surface. The verification
ladder reaches a listing card as one boolean. The utility record, the strongest
idea in `SOCIAL_DESIGN.md`, has no table. A differentiator a user cannot act on is
a differentiator a competitor can copy before it earns anything.

### User retention potential: 26

**Evidence.** The assets are real: a shipped social layer with 20-plus tables, a
wallet with an append-only ledger, and 15 earned badges awarded nightly by
`private.sweep_badges`.

**The cap.** There is not one mechanism in the codebase that brings a person back
on a day they are not searching. Eight `notification_kind` values and every one
of them is reactive: something happened to you. `saved_searches` has no writer, so
the single most common reason a property app is reopened does not exist. Nothing
watches a saved listing's price or status. There is no tenancy record, so there is
no renewal date, no receipt store and no sixty-day reminder. The verification
ladder has no expiry, so there is no standing to maintain. The wallet is a
checkout, not a habit: no pot, no goal, no progress. The utility record, which
would have been a daily reason to open the app, is not built. This is the
dimension with the most headroom and the least built.

### Property and listing experience, discovery side only: 47

**Evidence.** The repository pushes predicates into SQL, has a full-text index
after BE-3, sorts on integer kobo, and uses verification as a tiebreaker at equal
relevance with a genuinely well-argued comment about why it is only a tiebreaker.
Power and water filters are pushed down onto partial indexes.

**The cap.** Three of the drawer's controls are dead or lying. "Instant book"
filters on a field the repository sets to `false` on every row, so ticking it
returns nothing, always. The party-size filter falls back to two-per-bedroom
because `max_guests` was dropped. The landing page's "Apartments" tile links to
`/search?type=property`, and `parseKind` does not recognise `property`, so the
filter is silently ignored. The "Experiences" tile links to
`/search?type=experience`, and `experience` is in the TypeScript `ListingKind`
union but not in the `property_type` database enum, so that tile can never return
a result. And the footer's "Rent" and "Buy" links point at `?intent=rent` and
`?intent=sale`; `intent` appears nowhere in `search-params.ts`, so both land on
an unfiltered search.

### Messaging, product side only: 38

**Evidence.** The inbox is honestly built. A previous version served three
invented conversations with named agents to signed-out strangers and that fixture
was deleted rather than labelled, which is the right call and the comment says
why. A database trigger flags ten-digit account numbers and payment keywords into
an admin queue, which is the correct anti-fraud mechanism for this market.

**The cap.** `app/(app)/messages/page.tsx`, `messages/[id]/page.tsx` and
`messages/new/page.tsx` do not import the dictionary. The conversation layer,
which is where the fraud happens and where the "keep it on Vallo" education has to
land, is English only in a four-locale product. Secondary cap: the unconfigured
copy on `/messages/new` reads "Messaging for this listing switches on the moment
the platform keys land. Nothing is lost; come back soon." That is engineering
vocabulary and a soft "coming soon" shown to a renter.

### Accessibility: 58, and treat it as a floor

**Evidence.** A real skip link reading from the dictionary. `lang` and `dir` from
`t.meta.dir` on the root element. `id="main"` on every shell including the error
and offline pages. `aria-live` in roughly 20 files. Decorative imagery marked
`aria-hidden`. A dedicated `a11y` block in all four locale files. Reduced motion
honoured by token collapse. `/u` works without JavaScript.

**The cap.** I did not run a single automated or manual accessibility test, so
this number is a judgement from reading source and nothing more. The specific
thing I can name: the empty-state and result-count changes on `/search` are not
in an `aria-live` region as far as I could see, so a screen reader user applying a
filter is not told the count changed. And `docs/SOCIAL_DESIGN.md` section 7.8
claims accessibility is "answered rather than mentioned", which is a claim no
document can make on behalf of an untested surface.

### Where a previous score existed

There is no prior written baseline in the repository; the last audit ran in
conversation. These numbers are the baseline.

---
