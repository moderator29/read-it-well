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

## 6. The recommendations

Format is the seven fields, every time. IDs are stable and are `A1-NNN`. Where an
entry builds on an existing `RECOMMENDATIONS.md` entry rather than replacing it, I
name that entry so the queue can be merged rather than duplicated. Where a finding
belongs to another agent or to Track A, it is tagged and I have not acted on it.

Critical means a user loses money, loses data, is exposed, or is blocked from the
core loop. Nothing else.

---

### Group A. The core loop, and the four things that stop it

#### A1-001. A tenancy cannot be paid for, so the market the company is named after cannot transact
- **Evidence.** `lib/bookings/actions.ts` refuses rentals twice: `if (row.rate_minor <= 0 || row.rate_period === null) return fail(RENTAL_MESSAGE)` and `if (seed.kind === "rental") return fail(RENTAL_MESSAGE)`, where `RENTAL_MESSAGE` is "This home is rented on a tenancy, not per night. Message the agent to arrange an inspection." `app/(app)/listing/[id]/RentalPanel.tsx` declares `STEPS` with a third step "Pay through Vallo. Only once you have seen the place." and renders no payment control anywhere in the file. `docs/PRODUCT.md` section 2 states the rent path as "Message the agent, inspect the property, then pay", which the code cannot do.
- **Action.** Decide and build the rent money path. The shape I would argue for: a `tenancies` table keyed to a listing and a tenant, created by the agent as an offer that itemises the move-in breakdown the listing already carries (`rent_amount_minor`, `caution_deposit_minor`, `service_charge_minor`, `agency_fee_minor`, `legal_fee_minor`, `agreement_fee_minor`, `total_move_in_cost_minor`), accepted by the tenant, then paid through the one shared checkout implementation that card and wallet already share. A tenancy carries `starts_on`, `ends_on` and `rent_period`, which is what every retention idea in section 7 of this report needs.
- **Reason.** A renter today can search, message and request an inspection and then has to leave the platform to pay, which is precisely the moment the platform exists to protect. The safety centre's central promise, "You never pay a person, you pay the platform", is unimplementable for renting. Every fraud the product exists to prevent happens in the gap this leaves.
- **Impact.** Renters get the protection they were promised. Agents get a reason to bring rental inventory rather than only shortlets. Reviews, receipts, renewal dates, agreement storage and the entire retention thesis become possible.
- **Effort.** XL
- **Risk.** High. It touches money, and a rent payment is far larger than a night's stay, so a partial failure is expensive. It must reuse the existing settlement path rather than open a second one, for the reason W-3 already records.
- **Priority.** Critical

#### A1-002. No renter or buyer can ever leave a review, so the trust signal the platform depends on cannot accumulate outside nightly stays
- **Evidence.** `lib/reviews/actions.ts` reads the booking, then refuses unless `booking.status === "CONFIRMED"` and `booking.check_out <= lagosToday()`. Its header comment states that `reviews_insert_own` decides "that the booking is theirs, that it is CONFIRMED, that it has actually checked out". Rentals and sales have no booking row at all (A1-001), so no review can exist for them. `components/site/landing/VoicesBand.tsx` renders null until a real review exists.
- **Action.** Once a tenancy or a sale exists as a record (A1-001), extend the review subject beyond `bookings`. A review of an agent after a completed inspection is also defensible and needs no money to have moved: an `inspection_confirmations` row where both parties recorded that the viewing happened is a stronger provenance than most review systems have.
- **Reason.** Reviews are the only scalable trust signal on a marketplace, and the platform's whole pitch is trust. An agent who lets a hundred flats a year accumulates zero standing.
- **Impact.** Rental and sale agents can build reputation. The landing page's testimonials band becomes populable. Discovery's rating sort becomes meaningful across all markets.
- **Effort.** L
- **Risk.** Medium. Review provenance must stay strict; a review that anybody can leave is worth nothing and invites the fake-reputation problem `/standards` already names.
- **Priority.** Critical

#### A1-003. Every product link on the landing page sends a stranger to a sign-up form the middleware would not have asked for
- **Evidence.** `lib/site/gated-href.ts` returns `/sign-up?next=<destination>` and is called at 21 sites: `app/page.tsx` (7), `StoryRail.tsx` (7), `SignatureShowcase.tsx` (3), `MoodRow.tsx`, `PopularDestinations.tsx`, `FeaturedCarousel.tsx`. Sixteen of those destinations are `/search`, `/listing/<id>` or `/rent`, and `middleware.ts` `PRODUCT_SEGMENTS` does not contain `search`, `listing`, `rent`, `around`, `u` or `post`. The file's own comment gives the stale reason: "Since the product moved behind a session, every one of those was a link to a redirect." `RECOMMENDATIONS.md` N-1 is marked DONE. `SiteHeader.tsx:33` links to `/search` directly and `SiteFooter.tsx:43-47` links to five searches directly, so the same page answers the same question two opposite ways.
- **Action.** Reduce `gatedHref` to the four destinations that genuinely need a session: `/assistant`, `/wallet`, `/bookings`, `/home`. Point the other seventeen at their real destinations. Keep the function for those four rather than deleting it, so the intent-preserving `?next=` behaviour survives where it is still correct.
- **Reason.** The hero's primary button, the five city chips, the five category tiles and the featured carousel all refuse to show a stranger a single property. A marketplace whose front door demands registration before it shows inventory is the failure N-1 was filed to fix, reintroduced one layer up.
- **Impact.** Every visitor reaches inventory in one tap instead of after a registration. Crawlers gain a path from the landing page into the catalogue.
- **Effort.** S
- **Risk.** Low. The middleware is still the lock, as `gated-href.ts` itself says: "This is deliberately NOT a guard."
- **Priority.** Critical

#### A1-004. "Hide my activity" is a privacy switch that nothing reads, and it promises something specific
- **Evidence.** `hideActivity` appears in exactly four places, all in `lib/profile/schema.ts`: the type at :89, the default at :127, and two zod schemas at :150 and :183. No query, no render and no feed read consults it. Its copy in `en.ts:822-823` is "Hide my activity" / "Keep your reviews and recent stays off your public profile." `/u/[handle]` sets no `robots`, so it inherits `index: true, follow: true` from `app/layout.tsx:75`, and `MEMBER_TABS` in `lib/social/profile-tabs-schema.ts:27` includes `activity`, which `getProfileActivity` fills with every post the person liked or reposted.
- **Action.** Either make the switch work or remove it, and do not ship the current state either way. If it works: gate the Activity tab and the public like and repost lists on it, and rewrite the copy to describe what it actually controls. If it is removed: say so and file the real control as A1-005.
- **Reason.** A person who turns on a switch labelled "Hide my activity" and remains fully visible has been told something untrue about who can see them. `HANDOFF_01` section 4 makes privacy a product requirement, and a non-functioning privacy control is the kind of defect an NDPC auditor and an app store reviewer both treat as a finding rather than a nit.
- **Impact.** Users get the privacy they were told they had. The platform stops carrying a false assurance in its settings.
- **Effort.** M
- **Risk.** Low to build, reputational if left. Gating the Activity tab changes what a profile shows, so agents relying on visible engagement would notice.
- **Priority.** Critical

#### A1-005. The copy on the privacy switch describes a surface that does not exist, while the surface that does exist has no control
- **Evidence.** The subtitle promises to hide "your reviews and recent stays". `MEMBER_TABS` is `["posts", "replies", "media", "activity"]`: a member profile has no reviews tab and no stays tab. `AGENT_TABS` has `reviews`, and `getAgentReviews` reads reviews the agent *received*, not reviews the person wrote. What is actually public on a member profile is the Activity tab: likes and reposts, because `post_reactions_select` publishes LIKE rows and `post_reposts_select` is public outright. There is no control for that at all, and `social_profiles` has no `discoverable`, `visibility` or `indexable` column.
- **Action.** Rewrite the setting to name what is real: likes and reposts on your public page, and whether your page may be indexed by search engines. Add a `discoverable` boolean to `social_profiles` and honour it in `generateMetadata` for `/u/[handle]`. Default it to discoverable, since a public handle is the point, but make opting out possible in one tap.
- **Reason.** A person's likes are a map of their interests and their profile is indexable by Google with no opt-out. That is a reasonable default for a public handle and an unreasonable one with no switch.
- **Impact.** Real privacy control. A defensible answer to the app store data-safety question about profile visibility.
- **Effort.** M
- **Risk.** Low. A noindex on a profile removes it from search results, which some agents will want and some will not, so the default matters.
- **Priority.** High

#### A1-006. `/search` and `/rent` are submitted to Google in the sitemap and both emit noindex, nofollow
- **Evidence.** `app/(app)/search/page.tsx:40` and `app/(app)/rent/page.tsx:18` both set `robots: { index: false, follow: false }`. `lib/listings/sitemap.ts` declares `{ path: "/search", changeFrequency: "daily" }` and `{ path: "/rent", changeFrequency: "daily" }` in its static list. `app/robots.ts` allows `/`.
- **Action.** Decide which it is and make the two files agree. My recommendation: make `/search` and `/rent` indexable and followable when no filter is applied, keep noindex on filtered permutations to avoid a crawl trap (the query string is the natural discriminator, since `toSearchHref` omits defaults), and at minimum change `follow` to `true` in every case so the crawler can reach listings through them.
- **Reason.** `follow: false` on `/search` means the crawler that does arrive will not walk to a single listing. Combined with A1-003 there is no crawlable path from the landing page into inventory at all, so every listing depends entirely on the sitemap. This is the cheapest distribution a property marketplace has and it is switched off.
- **Impact.** Organic discovery of inventory. Directly serves N-2 and N-3.
- **Effort.** S
- **Risk.** Low, but a filtered search that becomes indexable is a classic crawl trap, so the discriminator has to be decided rather than defaulted.
- **Priority.** High

#### A1-007. A signed-out visitor cannot save a listing, which removes the funnel's lowest-commitment step
- **Evidence.** `lib/saved/actions.ts` `toggleSave`: for a UUID listing with `session.state === "signed-out"` it returns `fail(SIGNED_OUT_MESSAGE)`. `components/app/listing/ListingActions.tsx:100-112` only calls `addLocalSave` inside the `result.data.mode === "local"` branch, which a real listing never reaches; on a failure it runs `setSaved(!next)` and shows the sign-in message. So the heart visibly bounces back. The comment at the top of `actions.ts` claims the opposite: "The tap is not lost: the client has already written the save locally and re-plays it once the account exists." I read that comment first, assumed local persistence, checked the client, and found there is none for real listings.
- **Action.** Let a signed-out heart write to `localStorage` and the `nf_saved` cookie for any listing id, not only non-UUID ones, and return `ok({ mode: "local" })` rather than `fail` when signed out. Then add the promotion step in A1-008. Correct or delete the comment in `actions.ts` either way.
- **Reason.** Saving is the cheapest signal of intent a visitor can give and the strongest reason they come back. Refusing it converts a warm visitor into a bounce, and the platform has just spent a migration opening browsing to exactly that visitor.
- **Impact.** Visitors build a shortlist before they register, which is the thing that makes registration worth doing. `/saved` becomes populated for a first-time signup instead of empty.
- **Effort.** S
- **Risk.** Low. A local save is device state and carries no trust signal. The `GONE_MESSAGE` path still has to work when the save is later promoted.
- **Priority.** High

#### A1-008. Device saves are never promoted into `saved_items` after sign-up, so a shortlist dies with the browser
- **Evidence.** `app/(app)/saved/SavedBoard.tsx:88-100` reads `readLocalSaves()`, mirrors them into the cookie with `writeLocalSaves(local)` and calls `router.refresh()`. It never calls `toggleSave` for a local entry. The only `toggleSave` calls are in `unsave` and `undo`. So a UUID save that reached `localStorage` (after A1-007, or today via `MapCanvas.tsx:527`) stays there permanently.
- **Action.** On the first authenticated render of `/saved`, and again after sign-up completes, read the device saves and call `toggleSave` once per UUID entry that is not already a row, then clear those entries from local storage. Keep non-UUID example ids local, since they cannot satisfy the foreign key.
- **Reason.** The saves a person made while deciding whether to join are the most valuable thing the platform knows about them, and they are lost the moment they change phone or clear site data. In a market where phone-sharing and device changes are common, that is not an edge case.
- **Impact.** A shortlist survives a device. Sign-up feels like it carried something forward rather than starting over.
- **Effort.** S
- **Risk.** Low. Needs to be idempotent and bounded so a long local list does not fire fifty writes; `23505` is already handled as success.
- **Priority.** High

#### A1-009. The "Instant book" filter empties the catalogue by construction, and the code says so in a comment
- **Evidence.** `lib/listings/supabase-repository.ts:823` sets `instantBook: false` on every mapped row, and the comment at :1029-1038 states plainly: "`max_guests` and `instant_book` were dropped with the short-stay model... `instantBook` is false on every one of them. Naming that here rather than deleting the branch silently, because the filter drawer still offers both controls." `components/app/filters/FilterDrawer.tsx:815-819` renders the control with `testId="filter-instant"`. `lib/listings/filter.ts:179` applies `if (filter.instantBook && !facts.instantBook) return false`. `instant_book` does not appear in `lib/supabase/database.types.ts`.
- **Action.** Remove the Instant book control from the drawer and the `instant` parameter from `DiscoveryQuery`, `toFilter`, `toSearchHref` and `activeFilterCount`. If instant booking is wanted later it needs a column first.
- **Reason.** A filter that always returns zero results teaches a user that the catalogue is empty when it is not. It is also the only control in the drawer whose behaviour is a guaranteed dead end, which makes every other control less trusted.
- **Impact.** Nobody loses their results to a tick box. One fewer lie in the discovery surface.
- **Effort.** S
- **Risk.** Low. A saved or shared URL carrying `instant=1` must degrade to ignoring it rather than erroring, which `readFlag` already does.
- **Priority.** High

#### A1-010. The party-size filter silently guesses capacity because the column it was built for was dropped
- **Evidence.** `lib/listings/filter.ts:110-125`: the comment names `listings.max_guests` as the source and the code falls back to "two guests per bedroom" via `capacityOf` when no capacity is declared, which the repository comment says is now every row. `max_guests` is absent from `database.types.ts`.
- **Action.** Either restore a declared capacity column and collect it in the listing wizard, or relabel the control so it reads as an estimate ("Sleeps about") rather than a fact, and state the convention on the drawer. Do not leave a numeric filter whose answer is inferred while presenting as declared.
- **Reason.** A guest filtering for six and arriving at a three-bedroom flat that sleeps four was told something the platform did not know. On a nightly stay that is a refund and a bad review; both are avoidable.
- **Impact.** Guests get honest capacity. Agents get asked for the number rather than having it guessed for them.
- **Effort.** M
- **Risk.** Low. A restored column needs a default for existing rows and a wizard step.
- **Priority.** Medium

#### A1-011. Two of the five market links in the footer do nothing, because `intent` is not a search parameter
- **Evidence.** `components/site/SiteFooter.tsx:43-44` link to `/search?intent=rent` and `/search?intent=sale` labelled `t.nav.rent` and `t.nav.buy`. `grep -n "intent" lib/listings/search-params.ts` returns nothing: `parseDiscoveryQuery` reads `sort`, `view`, `amenities`, `instant`, `verified`, `power`, `water`, `q`, `type`, `min`, `max`, `beds`, `baths`, `guests` and nothing else. Both links therefore land on an unfiltered `/search`.
- **Action.** Add `intent` to `DiscoveryQuery` as `"rent" | "sale"`, parse it, push it down as a predicate on `listings.listing_intent`, serialise it in `toSearchHref`, and count it in `activeFilterCount`. `listings_in_bounds` already accepts `p_intent`, so the map half of the contract exists and the list half does not.
- **Reason.** "Buy" in the footer is the only Buy anywhere in the navigation, and it returns rentals. That is worse than having no Buy link: a buyer concludes the platform has no sale inventory rather than that the filter is missing. Directly unblocks part of N-6.
- **Impact.** Rent and Buy become real, separable markets in discovery. The sale schema gets its first user-facing reader.
- **Effort.** S
- **Risk.** Low. Sale listings will return nothing until inventory exists, which is honest and is what the empty state is for.
- **Priority.** High

#### A1-012. The landing page's Apartments tile passes a category the parser does not recognise
- **Evidence.** `app/page.tsx:39`: `gatedHref("/search?type=property")`. `parseKind` in `search-params.ts:258-262` tests membership in `KIND_NOUN`, whose keys are `hotel, apartment, home, shortlet, villa, restaurant, experience, rental, shop, office, land`. `property` is not among them, so `parseKind` returns undefined and the filter is dropped.
- **Action.** Change it to `type=apartment`. Then add a spec that asserts every `type=` value linked from `(site)` parses to a defined `ListingKind`.
- **Reason.** A category tile that silently ignores its own category returns the whole catalogue, so the tile's label is a lie about what the reader is about to see.
- **Impact.** The category rail on the front door does what it says.
- **Effort.** S
- **Risk.** None.
- **Priority.** Medium

#### A1-013. The landing page's Experiences tile can never return a result, and the root Open Graph description advertises the same non-market
- **Evidence.** `app/page.tsx:42`: `gatedHref("/search?type=experience")` with `t.nav.experiences`. `experience` is a member of `ListingKind` in `lib/listings/types.ts` and `KIND_NOUN`, and is **not** a member of `property_type` in `database.types.ts`, whose ten values are `apartment, hotel, home, villa, shortlet, rental, shop, office, land, restaurant`. `app/layout.tsx:69-70` describes the platform as "homes, hotels, restaurants, experiences and more". `RECOMMENDATIONS.md` P-4 records the union mismatch; the user-visible tile and the Open Graph copy are the consequence and are not named there.
- **Action.** Remove the Experiences tile and drop "experiences" from the root Open Graph description. Fix the union under P-4 separately.
- **Reason.** A tile on the platform's front door that is guaranteed to return zero results forever is the most visible possible version of the type mismatch, and it teaches a first-time visitor that the catalogue is empty.
- **Impact.** One fewer guaranteed dead end on the highest-traffic page.
- **Effort.** S
- **Risk.** None. `t.nav.experiences` becomes unused in four locale files, which is a tidy-up rather than a break.
- **Priority.** Medium

#### A1-014. The total move-in cost, which the product rule calls the differentiator, cannot be filtered or sorted on
- **Evidence.** `docs/PRODUCT.md` section 5: "The product rule: the card leads with the total move-in cost and the rent is the secondary line. Every competitor leads with the rent and buries the fees. Leading with the truth is the differentiator." `listings.total_move_in_cost_minor` exists in `database.types.ts:1748` and is described as a first-class indexed column. `DiscoveryQuery` in `search-params.ts:101-141` has `minMinor` and `maxMinor`, which `toFilter` maps to `minPriceMinor` and `maxPriceMinor` on the rent or rate, and nothing for move-in cost. `SORTS` at :46 offers `recommended`, `top-rated`, `price-asc`, `price-desc` and no move-in sort.
- **Action.** Add `moveInMax` to `DiscoveryQuery`, push it down as a predicate on `total_move_in_cost_minor`, add a "Cost to move in" sort, and make the budget control in the drawer ask which number the reader means: the rent, or what they need to find on day one. Default the rental market to move-in cost, because that is the number that decides whether somebody can take the flat.
- **Reason.** The single question a Nigerian renter cannot get answered anywhere today is "what can I actually afford to move into". The platform holds the number, indexed, and offers no way to ask it. Every competitor's weakness is this exact thing and the advantage is currently unexercised.
- **Impact.** The strongest differentiator becomes a control a user can press. Agents who state the full breakdown get surfaced above those who do not, which pulls the whole catalogue toward disclosure.
- **Effort.** M
- **Risk.** Low. Listings with a null `total_move_in_cost_minor` must be handled explicitly rather than treated as zero, which would sort them first.
- **Priority.** High

#### A1-015. `saved_searches` exists with no writer, no screen and no alert, which removes the most common reason a property app is reopened
- **Evidence.** `saved_searches` is a table in `database.types.ts`. `grep -rn '"saved_searches"' apps/web/src` returns nothing outside the generated types. `lib/search/memory.ts` keeps recent searches in `localStorage` only and never writes a row. `RECOMMENDATIONS.md` P-6 records the absence at P2; this entry is the product design on top of it, not a rediscovery.
- **Action.** Three pieces, in order. First, a "Save this search" control on `/search` that writes the current `DiscoveryQuery` as a row, named from the query ("2 bed in Yaba under 1.5m to move in"). Second, a `/saved` tab listing saved searches with their current match count. Third, a nightly `pg_cron` job that runs each saved search and writes one `notification_kind = 'listing'` row per new match, batched so a person gets one notification a day and not one per listing. Respect the existing email channel gate in `lib/email/recipients.ts`.
- **Reason.** Section 23.1 names this and it is correct: an alert when something matching a saved brief appears is the most common reason a property app is reopened. It is also the only retention mechanism that is honest by construction: the notification exists because a real new listing matched a brief the person wrote themselves. No manufactured urgency, no invented count.
- **Impact.** A one-search product becomes a standing brief. It also gives the empty catalogue a use: a person who searches today and finds nothing leaves a brief behind, and the platform can tell them the day supply arrives, which turns the cold-start problem into a waiting list.
- **Effort.** L
- **Risk.** Medium. Unbounded saved searches times a growing catalogue is a job that gets slow; cap searches per person and bound the job. Notification fatigue is the failure mode, so batch daily and make the frequency a setting.
- **Priority.** High

#### A1-016. Nothing watches a saved listing, so a shortlist silently rots
- **Evidence.** `saved_items` holds `user_id` and `listing_id` only. There is no trigger, no job and no query anywhere that compares a saved listing's current state to the state it was in when saved. `listing_status` has eight values including `SUSPENDED` and the row can move between them; `RECOMMENDATIONS.md` P-9 notes nothing records status history.
- **Action.** On the nightly sweep that already runs, compare each saved listing's `rent_amount_minor`, `total_move_in_cost_minor`, `sale_status` and `status` against the values at save time (which needs two columns on `saved_items`, or the `listing_status_events` table P-9 asks for). Write a notification for a price change, a sale going under offer, and a listing being unpublished. Say the old number and the new one.
- **Reason.** A shortlist a person cannot trust is a shortlist they stop opening. Being told that the flat you saved dropped by two hundred thousand naira, or is gone, is information a person genuinely wants and cannot get anywhere in this market today.
- **Impact.** The shortlist becomes a live document. It is also the single most defensible notification the platform can send: factual, about something the person chose, and actionable.
- **Effort.** M
- **Risk.** Low. Must not notify on a rounding or a re-save. A price that moves twice in a day should produce one notification, not two.
- **Priority.** High

#### A1-017. The assistant has no concept of language, so the platform's flagship AI feature is English only in a four-locale product
- **Evidence.** `grep -n "locale\|Locale\|language\|Yoruba\|Hausa\|Igbo\|English" apps/web/src/app/api/assistant/route.ts` returns nothing. The system prompt at :96-220 never states an output language. `components/app/assistant/AssistantChat.tsx:225-232` sends `{ messages, threadId? }` and no locale, although `app/(app)/assistant/page.tsx` reads `getLocale()` and passes it to the component for number formatting.
- **Action.** Send the locale in the request body, and add one instruction to the system prompt: answer in the reader's language, and if you cannot express something precisely in it, say the precise thing in English rather than guessing. Keep listing titles and place names in their own form. Add the assistant disclosure required by `HANDOFF_01` section 4.7 in all four languages.
- **Reason.** The assistant is the feature most prominently advertised on the landing page and in the trust strip, beside a card that says four languages. A Hausa speaker who asks it a question in Hausa gets an English answer about their rent.
- **Impact.** The four-locale claim becomes true where it matters most: the surface a person uses when they do not understand something.
- **Effort.** S
- **Risk.** Low. Model output quality in Yorùbá, Hausa and Igbo is uneven and should be stated honestly rather than assumed, which is what the fallback instruction is for.
- **Priority.** High

#### A1-018. The public trust and legal site is English only, including the page that exists to prevent fraud
- **Evidence.** Of the 21 files in `app/(site)`, exactly one imports `getDictionary`: `layout.tsx`. `safety/page.tsx`, `standards/page.tsx`, `cancellations/page.tsx`, `help/page.tsx`, `about/page.tsx`, `careers/page.tsx`, `contact/page.tsx`, `contact/ContactForm.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `docs/chapters.tsx` (2,216 lines) and the rest do not. The dictionary has no top-level `site`, `safety`, `standards`, `help`, `docs` or `faq` section: `en.ts` top-level keys are `counts`, `reserve`, `meta`, `welcomeCards`, `common`, `nav`, `social`, `socialProfile`, `landing`, `auth`, `signUp`, `pickers`, `interests`, `settings`, `home`, `agent`, `agentListings`, `agentBookings`, `agentEarnings`, `agentAnalytics`, `admin`, `a11y`.
- **Action.** Localise in priority order, not all at once: `/safety` first, then `/standards`, then `/cancellations`, then `/help`. Those four are the fraud-prevention and money surfaces. `/docs`, `/careers` and `/about` can stay English longer and should say so on the page rather than implying otherwise. Treat `/privacy` and `/terms` as Track A's, since the controller identity work is theirs.
- **Reason.** The safety centre is the platform's answer to the WhatsApp group where people get defrauded. Presenting it only in English to a product that advertises Hausa, Yorùbá and Igbo means the people least served by English are least protected.
- **Impact.** The trust argument reaches everyone the product claims to serve.
- **Effort.** L
- **Risk.** Medium. `/safety` and `/standards` contain commitments and legal-adjacent wording; a loose translation of a safety instruction is worse than English. Each needs native review, not machine translation.
- **Priority.** High

#### A1-019. The conversation layer and notifications are English only, which is where the fraud education has to land
- **Evidence.** `app/(app)/messages/page.tsx`, `messages/[id]/page.tsx`, `messages/new/page.tsx` and `notifications/page.tsx` do not import `getDictionary`. `KNOWN_GAPS.md` already records that `ReservePanel.tsx`, the generated "about" paragraphs, the search history label, `lib/bookings/actions.ts` validation messages and `lib/email/messages.ts` are unlocalised; the messaging and notification screens are not on that list.
- **Action.** Add a `messages` and a `notifications` section to the dictionary and move the screen copy into it. Prioritise the first-message safety education, which is the string that has to be understood.
- **Reason.** A database trigger flags account numbers in messages because that is where people get defrauded. The warning next to it is in one of four languages.
- **Impact.** The anti-fraud education reaches the people it is for.
- **Effort.** M
- **Risk.** Low.
- **Priority.** High

#### A1-020. Fifteen user-facing strings explain an outage by naming "platform keys", and one of them says "come back soon"
- **Evidence.** `grep -rn "platform keys" apps/web/src` returns 28 hits, of which these are user-facing strings: `(auth)/sign-in/page.tsx:24` "Accounts switch on the moment the platform keys land", `(app)/u/page.tsx:56`, `(app)/u/[handle]/page.tsx:192`, `(app)/u/[handle]/edit/page.tsx:46`, `components/social/profile/FollowListPage.tsx:41`, `(app)/stories/new/page.tsx:32`, `(app)/around/[slug]/page.tsx:82`, `(app)/notifications/page.tsx:62`, `(app)/messages/new/page.tsx:129` ("Nothing is lost; come back soon"), `(app)/profile/SignedOutHero.tsx:111`, `agent/reviews/page.tsx:58`, `agent/settings/page.tsx:59`, `agent/messages/page.tsx:61`, `lib/admin/guard.ts:35`, `lib/auth/actions.ts:137`, `lib/social/places-schema.ts:155`. The banned-word specs cover `demo`, `sample`, `preview`, `not live` (four specs) and `coming soon`, `lorem` (`around-feed.spec.mjs:101`); none catches "switch on shortly", "switch on the moment", or "come back soon".
- **Action.** Replace all of them with one honest outage sentence that does not describe a build state: "We cannot reach our systems just now. Nothing you have saved is affected. Try again in a few minutes." Put it in the dictionary once so the fifteen sites share it. Extend the banned-word spec to cover "switch on shortly", "switch on the moment", "come back soon", "not in place yet" and "shortly".
- **Reason.** In production the keys are in place, so these strings only ever appear during an outage, at which point "the platform keys are not in place yet" tells a paying user the product was never finished. It is also engineering vocabulary shown to a renter, and "come back soon" is the banned pattern in different words.
- **Impact.** An outage reads as an outage rather than as an unfinished product. One sentence to maintain instead of fifteen.
- **Effort.** S
- **Risk.** Low. Some of these sites currently carry useful specifics ("nobody's followers can be read from here") which are worth keeping as a second line.
- **Priority.** High

#### A1-021. The help centre promises automatic payouts after a completed stay, and `booking_status` has no COMPLETED value
- **Evidence.** `app/(site)/help/page.tsx`: "When do agents get paid? After each completed stay, your earnings are paid to the Nigerian bank account you added during your application. You can follow every payout from the earnings page in your agent dashboard." `KNOWN_GAPS.md` and `RECOMMENDATIONS.md` E-2 both state that `booking_status` is `PENDING, CONFIRMED, CANCELLED` with no `COMPLETED`, so nothing can record that a stay happened.
- **Action.** Rewrite the answer to describe what actually happens today, and do not describe the payout schedule until E-2 lands and a payout path exists. If the honest answer is "payouts are arranged by our team while the automated schedule is being built", say that; it is a better sentence than a promise the enum cannot keep.
- **Reason.** This is the answer a prospective agent reads before deciding to bring inventory, and it is the most consequential promise on the page. Agents bring the supply, and an agent who discovers the payout story was aspirational does not come back or recommend the platform.
- **Impact.** The supply-side pitch becomes credible. The promise lands when it can be kept.
- **Effort.** S
- **Risk.** None, and the risk of leaving it is high.
- **Priority.** High

#### A1-022. The help centre and the landing FAQ both point a prospective agent at a "Become an agent page" that no longer exists as a page
- **Evidence.** `app/(site)/help/page.tsx`: "Apply through the Become an agent page." `app/page.tsx` FAQ: "Apply in about ten minutes from the Become an Agent page." `next.config` `redirects()` sends `/agents` to `/profile?switch=owner`, `/agents/apply` to `/profile/setup/owner` and `/agents/status` to `/profile/application`. All three targets are under `profile`, which is a `PRODUCT_SEGMENT`, so a signed-out visitor following the landing page's own "List your property. Reach all of Nigeria." button (`AgentsBand.tsx:46`) is redirected to `/sign-in?next=/profile&notice=sign-in-required`. There is no public page anywhere that explains what listing on Vallo involves. I first read this as eight broken links and a 404; I checked `next.config` and it is a redirect, not a 404, which is a different and in some ways worse problem.
- **Action.** Build one public supplier page. It needs: it is free and stays free, what verification asks for and why, what the four ladder rungs mean (`lib/trust/verification.ts` already has the words), how long review takes (`RESPONSE_COMMITMENTS.routine` is three days), how payouts work once A1-021 is honest, and what an agent can and cannot do before approval. Then point the eight existing links at it. `docs/PRODUCT.md` section 4 still describes `/agents` as an open supplier pitch, so the document and the code already disagree.
- **Reason.** Agents bring the inventory and without inventory there is no product. The supply-side funnel currently consists of a button that asks a stranger to register before telling them anything. That is the highest-leverage conversion surface on the platform and it does not exist.
- **Impact.** A supply pitch that can be linked, shared, crawled and sent to an estate agent on WhatsApp. It is also the page that makes `/careers`, `/contact` and `/about` links stop leading to a wall.
- **Effort.** M
- **Risk.** Low. It must not promise verification outcomes or payouts that are not built.
- **Priority.** Critical

#### A1-023. The landing FAQ tells visitors that payments are not on yet, and card checkout is built and settling
- **Evidence.** `app/page.tsx` FAQ: "How do payments work before launch? Card payments switch on at public launch. Until then you can browse, save favourites and shortlist places, and no money changes hands." The handoff states that card checkout and wallet payment settle through one shared implementation, proven against live Postgres, and `private.pay_booking_from_wallet` writes six things in one transaction.
- **Action.** Delete the question. If there is a real constraint on when payments open, state that constraint, not a generic "before launch". Note that the same answer also promises visitors can "save favourites", which A1-007 shows they cannot.
- **Reason.** Telling a visitor that the money surface does not work yet is the strongest possible discouragement from trying it, and it is untrue. "Before launch" is also the same category of copy as "coming soon".
- **Impact.** Visitors stop being told the product is unfinished on its own front door.
- **Effort.** S
- **Risk.** None.
- **Priority.** High

#### A1-024. The landing FAQ is 12 hardcoded English answers on a page whose own facts band advertises four languages
- **Evidence.** `app/page.tsx` renders a `[q, a][]` literal of 12 entries under a hardcoded `<h2>Questions, answered</h2>`. Everything else on the page reads from `t.landing.*`. The facts band two sections above prints `{ big: "4", small: t.landing.trust.multiLanguage.title }`.
- **Action.** Move the FAQ into `t.landing.faq` as an array of `{ q, a }`, and translate it with the rest of the landing copy. Fix the content problems in A1-023, A1-025 and A1-031 at the same time rather than translating them first.
- **Reason.** The FAQ is where a doubtful visitor goes before committing. Presenting it only in English on the same screen that advertises four languages is the most visible version of the localisation gap.
- **Impact.** The FAQ works for every reader the landing page claims to serve.
- **Effort.** M
- **Risk.** Low, but do not translate wrong answers. Sequence after the content fixes.
- **Priority.** Medium

#### A1-025. The landing FAQ still makes the nationwide coverage claim that the rest of the page was corrected to drop
- **Evidence.** `app/page.tsx` FAQ: "Where does Vallo operate? All 36 states and the FCT from day one, with the deepest coverage growing city by city." The comment where the nationwide map was removed, in the same file, says the map was cut because "It was a rendered illustration of a country lit end to end, on a platform whose catalogue is six cities, under a heading making the coverage claim this page has just spent a commit correcting everywhere else. The picture was the loudest version of it and it survived the copy fix." The FAQ answer also survived it.
- **Action.** Rewrite to what is true: the platform covers the whole country by design, and the catalogue is deepest in the cities where agents have joined. Do not name a number of cities in copy, because it dates.
- **Reason.** A coverage claim that a search immediately disproves is the fastest way to lose a first-time visitor's trust, and the codebase has already decided this once.
- **Impact.** One fewer disprovable claim on the front door.
- **Effort.** S
- **Risk.** None.
- **Priority.** Medium

---

### Group B. Trust surfaces, safety and the verification ladder

#### A1-026. The safety centre tells a renter never to pay an agency fee to anybody, and the product models an agency fee as part of the move-in cost
- **Evidence.** `app/(site)/safety/page.tsx` `INSPECTION_STEPS[3].body`: "Rent is message, inspect, then pay. Never hand over cash at a viewing, and never pay an inspection fee, a holding fee or an agency fee to anybody." No qualifier. `listings` carries `agency_fee_minor` (`database.types.ts:1688`), `legal_fee_minor` (:1709), `agreement_fee_minor` (:1690) and `caution_deposit_minor` (:1695), and `docs/PRODUCT.md` section 5 lists them as part of "the real cost of moving in" that the card is supposed to lead with. `lib/trust/standards.ts` `NEVER_ASK[1]` gets it right with "payable to us"; the safety page's step does not.
- **Action.** Rewrite to distinguish who is asking and for what. Something like: an agency fee, a legal fee and a caution deposit are normal parts of moving into a Nigerian rental and they belong in the listing's stated move-in cost, paid through the platform. Nobody should ever ask you to send any of them to a personal account, and Vallo itself charges nothing. Say the same thing on the move-in breakdown on the listing.
- **Reason.** This is the single most damaging inconsistency I found. A renter reads the safety page, then opens a listing whose breakdown itemises an agency fee, and concludes the safety page does not describe this product. Once that page stops being believed, the platform has lost its only defence against the fraud it exists to prevent.
- **Impact.** The safety instruction becomes followable, and the move-in breakdown becomes the thing that proves the platform is honest rather than the thing that contradicts its own advice.
- **Effort.** S
- **Risk.** Low. The wording is consequential and should be read by whoever owns the trust copy before it ships.
- **Priority.** High

#### A1-027. The safety centre's climactic instruction cannot be followed, because there is no rent payment
- **Evidence.** `INSPECTION_STEPS[3].title` is "Only then, pay on Vallo", and `PAYING_STEPS[0].body` says "There is no other way to pay for a stay here". A1-001 establishes there is no rent payment path. So the four-step defence ends on a step the product does not implement, for the market the page is written about ("Renting a place you have never seen is how most people lose money in this market").
- **Action.** Until A1-001 lands, say what is true: the conversation, the inspection and the record all live on the platform, and the payment path for a tenancy is being built. Do not leave an instruction that a renter cannot carry out, because the only way they can carry it out today is off-platform, which is the exact thing the page forbids.
- **Reason.** A safety page whose last step is impossible pushes a renter into the unprotected transaction it was written to prevent. That is worse than saying nothing.
- **Impact.** Renters are told the truth about what is protected today, which is the messaging, the inspection record and the report queue, and those are genuinely worth something.
- **Effort.** S
- **Risk.** It is an admission, and admissions on a trust page are uncomfortable. `HANDOFF_01` section 4.7 is explicit that a disclaimer never licenses a weak product, so the real fix is A1-001 and this is the honest interim.
- **Priority.** High

#### A1-028. The safety centre names a cleaning charge the schema does not have
- **Evidence.** `PAYING_STEPS[1].body`: "The total you see before you confirm is the nightly rate and the cleaning charge the host set, and nothing else is added at the end." `docs/PRODUCT.md` section 5 states "The hotel-shaped columns are gone: no `max_guests`, `beds`, `min_stay_nights`, `instant_book`, `cleaning_fee_minor` or `service_fee_minor`." `cleaning_fee_minor` appears in `database.types.ts` at :857 on a different table, not on `listings`.
- **Action.** Remove the cleaning charge from the sentence, or name whatever the total actually comprises for a stay today. I did not trace the booking total's composition; that is Agent 2 or Agent 3's ground. Whoever does should make the safety page's sentence match it exactly, because this is a promise about a number.
- **Reason.** The claim "nothing else is added at the end" is the most checkable promise on the page, and the thing it names as one of the two components may not exist on a listing.
- **Impact.** The price promise matches the price.
- **Effort.** S
- **Risk.** Low. Needs the actual total composition confirmed first, so do not guess.
- **Priority.** Medium

#### A1-029. "Host" appears in user-facing copy in all four locales, against the terminology table
- **Evidence.** `grep -oiE "\bhosts?\b" packages/i18n/src/locales/en.ts` returns 15. User-facing instances include `:74` "Not you, not the host", `:79` "Talk to the host, inspect the place", `:657` "Booking confirmations and host replies on WhatsApp", `:667` "Let hosts see when you have read their messages", `:804` "New replies from hosts and agents you are talking to", `:840`, `:2189` "kept by the host", `:2198` "The host cancelled", `:2209`. Also `lib/trust/cancellation.ts:57` "The other half stays with the host". The same strings exist in `ha.ts`, `ig.ts` and `yo.ts`. `docs/PRODUCT.md` section 7 gives "Agent" and bans "Host". `RECOMMENDATIONS.md` S-4 names `host` as a drift word and prescribes the enforcing spec; this entry is the measurement S-4 does not have.
- **Action.** Replace with "agent" in all four locale files and in `lib/trust/cancellation.ts`. Keep `notify.host` as an internal dictionary key, since that is a code identifier and not copy, and note that in the spec's allow-list. Then land the S-4 spec so it cannot drift back.
- **Reason.** Two words for one role teaches a reader that there are two kinds of supplier. It also makes the cancellation copy ambiguous: "the other half stays with the host" and "the agent is paid" describe the same person and a reader cannot know that.
- **Impact.** One vocabulary. The S-4 spec gets a clean baseline to lock.
- **Effort.** S
- **Risk.** Low. `ha`, `ig` and `yo` need the equivalent noun each file already uses for agent, not a literal translation of "host".
- **Priority.** Medium

#### A1-030. The published response commitments are a four-hour promise with no on-call and no monitoring
- **Evidence.** `lib/trust/standards.ts` `RESPONSE_COMMITMENTS`: urgent is 4 hours covering "Anyone asked to pay outside Vallo, anything unsafe or threatening, and any report that somebody has already lost money"; standard is 24 hours; routine is 72. `/standards` publishes them and the admin queues compute a due time from the same numbers, which is the right architecture. `KNOWN_GAPS.md` records that the six unattended `pg_cron` jobs have no monitoring, and `docs/PRODUCT.md` section 9 records one profile and two roles, meaning one person.
- **Action.** Either add the operational half, which is a paged alert when an urgent row crosses two hours so a human sees it before the commitment is missed, or widen the published urgent window to one a single person in one timezone can actually keep. The file's own comment makes the argument: "A promise of one hour that is kept two thirds of the time is worse than a promise of four hours that is always kept, because the first one teaches people that our promises are decoration."
- **Reason.** The commitment is published on a public page and is now the platform's stated standard. Missing it on the first fraud report is a worse outcome than never having published it.
- **Impact.** A promise the operation can keep, or an alert that makes keeping it possible.
- **Effort.** M for the alert, S for the copy.
- **Risk.** Widening the window weakens the pitch, which is a real cost. The alert is the better answer and needs somewhere to page.
- **Priority.** High

#### A1-031. The landing FAQ claims NDPA compliance as a settled fact, in the same paragraph as a data claim
- **Evidence.** `app/page.tsx` FAQ: "Is my data safe under NDPA? Yes. Vallo is built to comply with the Nigeria Data Protection Act. Your data is encrypted in transit and at rest, is never sold, and you can request a copy or deletion at any time." `HANDOFF_01` section 4.5 states NDPC registration does not exist, there is no named DPO and no compliance audit, and section 7.3 says "Compliant" may only be used where it has actually been established, "which for NDPC today means not yet". `HANDOFF_01` section 4.8 records that the export path is not built, so "request a copy" is not deliverable. `RECOMMENDATIONS.md` LG-1 covers the compliance claim at P0; the "request a copy" half is additional.
- **Action.** LG-1 owns the compliance sentence. Additionally: remove "you can request a copy" until the export path exists, or route it to the contact form and say that a person will action it by hand, which is what `lib/legal/privacy.tsx` already does correctly for rights requests.
- **Reason.** Offering a data export that does not exist creates an obligation with a clock on it under the Act, on the platform's most-read page.
- **Impact.** The data promise becomes one the platform can honour on the day somebody asks.
- **Effort.** S
- **Risk.** None. `[TRACK A]` owns the compliance sentence; the export sentence is a product claim and sits here.
- **Priority.** High

#### A1-032. The verified badge is one boolean on a card while the ladder has four named rungs with written meanings
- **Evidence.** `lib/trust/verification.ts` defines four rungs each with a `label`, a `meaning` written for a guest, and an `evidence` line, plus `TIER_NAME` for tiers 0 to 4 where 0 is deliberately called "Approved" rather than "unverified". `app/(app)/search/page.tsx` `byVerification` reads `Number(b.verified) - Number(a.verified)`, a boolean. `RECOMMENDATIONS.md` V-6 covers the conflation of the four trust signals; this entry is the specific discovery-surface consequence.
- **Action.** Surface the tier name on the listing card and the agent's public page, not a tick. "Address verified" and "Fully verified" are different facts and `TIER_NAME` already has the words. On the detail page, show the rungs passed with their `meaning` line, and show a null rung as not yet checked rather than as a failure, per `docs/PRODUCT.md` section 6.
- **Reason.** The ladder is one of the two or three genuinely differentiated things the platform has, and the only place a user meets it is a binary. A tick is a promise the platform has to keep; a named rung is a fact the reader can weigh, which is exactly the argument `docs/PRODUCT.md` makes about timestamps.
- **Impact.** Renters can tell a fully verified agent from an approved one. Agents get a visible reason to climb, which is the retention mechanism in A1-033.
- **Effort.** M
- **Risk.** Medium. Showing tiers makes low tiers visible, which some agents will dislike, and the wording must not imply that a low tier means untrustworthy.
- **Priority.** High

#### A1-033. Verification is a permanent state, so there is no standing for an agent to maintain
- **Evidence.** `agent_verification_checks` records rungs passed. `lib/trust/verification.ts` has no concept of expiry: no `expires_at`, no `checked_at` staleness, no recheck. `VERIFICATION_LADDER.address.meaning` is "We know where they are, so an agent who disappears is not untraceable", which is a claim that decays the moment somebody moves. `KNOWN_GAPS.md` records that `/agent/verification` shows the ladder and cannot move anybody up it.
- **Action.** Give each rung a validity period and show the age of the check rather than only its state. Address and payout are the two that genuinely go stale: a confirmed address from eighteen months ago is a weaker fact than a confirmed address from last month, and the guest-facing copy should say which it is. Then let an agent re-confirm, which also answers V-1's missing upward path for the rungs that are self-serviceable.
- **Reason.** Section 23.1 asks what a person loses by letting their standing lapse. Today the answer is nothing, because nothing lapses. A status that has to be maintained is a reason to open the app on a day there is nothing to sell, and it makes the badge mean more rather than less.
- **Impact.** Agents return to maintain standing. Renters get a dated fact instead of a permanent claim. The ladder becomes the living thing its own comments describe.
- **Effort.** L
- **Risk.** Medium. Expiring a rung demotes agents, which needs notice, an easy path back, and care that a lapse does not read as a failure. Do it as a warning period first.
- **Priority.** Medium

#### A1-034. `tenure` records what a seller claims and there is nothing to record whether anybody looked
- **Evidence.** `docs/PRODUCT.md` section 5: "`tenure` is a closed enum of Nigerian titles... **It records what the seller claims. Nothing yet records whether anybody looked.** Do not render it as though it were verified." `land_tenure` exists in `database.types.ts:3813`. There is no `tenure_verified_at` or equivalent column and no reviewer surface.
- **Action.** When the sale UI is built under P-8, add a timestamp column for a title check and a reviewer, in the same shape as `address_verified_at` and `physically_inspected_at`, and render a claimed tenure visually differently from a checked one. `RECOMMENDATIONS.md` KYC-6 already says title documents are a different check and must not be conflated with identity; this is the display half of that.
- **Reason.** Title fraud is the dominant fraud in Nigerian property sales, and a Certificate of Occupancy rendered as a fact when it is a claim is the single most expensive thing this platform could get wrong. A buyer reading "Certificate of Occupancy" beside a verified badge will reasonably assume both were checked.
- **Impact.** The sale market's central risk is handled before the first sale listing exists, which is the cheapest moment it will ever be.
- **Effort.** M
- **Risk.** Low now, very high if it ships unhandled.
- **Priority.** High

#### A1-035. There is no way for a person to see what the platform did about a report they filed
- **Evidence.** `reports` exists with a status, and `RECOMMENDATIONS.md` V-7 records that `message_flags`, `risk_alerts` and `reports` record a status and not a reviewer. `/standards` publishes what happens after a report ("Content removed", "Listing unpublished", "Account suspended", "Account removed and referred") and the response commitment. I found no surface anywhere in `app/(app)` that shows a reporter the state of their own report.
- **Action.** A "Your reports" list under the account, showing what was reported, when, the commitment window it falls in, and the outcome in the platform's own published vocabulary. Do not disclose who was actioned or any internal note; the outcome category is enough.
- **Reason.** A person who reports a fraud and hears nothing concludes nobody read it, which is how a report queue stops receiving reports. The platform already publishes the outcome vocabulary and the clock; showing a reporter their own row costs almost nothing and is the strongest possible demonstration that the queue is real.
- **Impact.** Reporters keep reporting. The trust argument becomes observable rather than asserted.
- **Effort.** M
- **Risk.** Medium. Disclosing an outcome can identify the person actioned in a small area, so the categories must stay coarse and the wording neutral.
- **Priority.** Medium

#### A1-036. Nothing tells a renter what to check on a tenancy agreement, on a platform whose whole pitch is not being defrauded
- **Evidence.** `app/(site)/safety/page.tsx` covers paying, inspecting, cancelling and reporting. `app/(site)/help/page.tsx` has categories "Booking a stay", "Payments and refunds", "Listing your property", "Verification and trust". Neither mentions an agreement, a caution deposit's return, a service charge, or what `minimum_tenancy_months` obliges. `RECOMMENDATIONS.md` LG-4 notes rental and sale agreements are not modelled.
- **Action.** Add a renting section to the safety centre: what the move-in breakdown lines mean, what a caution deposit is and what a tenant should get in writing about its return, what a service charge covers and does not, what an agreement should name, and what to do if the figures at signing differ from the listing. Every one of those maps to a column the listing already carries, so this is explaining the product rather than inventing policy.
- **Reason.** This is the actual knowledge gap the fraud exploits. A first-time renter in Lagos does not lose money because they paid on the wrong screen; they lose it because they did not know what a legitimate demand looks like. The platform holds structured data about exactly these fees and explains none of it.
- **Impact.** The safety centre becomes the most useful page on the Nigerian internet for a first-time renter, which is a growth asset as well as a trust one. It is also naturally linkable and shareable.
- **Effort.** M
- **Risk.** Medium. Anything that reads as legal advice needs the solicitor, per `HANDOFF_01` section 2. Explaining what a column means is safe; telling somebody their legal rights is not.
- **Priority.** High

#### A1-037. The report categories are excellent and are not reachable from the one place fraud actually happens
- **Evidence.** `lib/reports/schema.ts` `REPORT_CATEGORY_ORDER` with `off_platform_payment`, `scam`, `unsafe` and `duplicate`, and `gradeForReportCategory` in `standards.ts` puts the first three on the four-hour clock. The safety page says "Every listing carries a report control, and the contact form reaches the same queue." I did not find a report control described for a conversation, and messaging is where the account number arrives.
- **Action.** Put a report control in the conversation thread, defaulting to `off_platform_payment`, and make it one tap from the message that triggered it so the report carries the message id. The database trigger already flags account numbers; a human report from the person being asked is stronger evidence and should reach the same queue with the same clock.
- **Reason.** The fraud pattern the platform exists to stop happens in a message. The report path starts on a listing.
- **Impact.** The four-hour urgent queue receives reports at the moment of the offence, with the evidence attached.
- **Effort.** M
- **Risk.** Low. Needs rate limiting so a report control is not a harassment vector, and `rate_limits` already exists. `[AGENT 2]` owns the thread screen; this is the product requirement.
- **Priority.** High

#### A1-038. The admin kill switch for the entire social layer renders as the raw string "social"
- **Evidence.** `lib/flags.ts` `FeatureKey` includes `social` ("One row takes every social surface and every social write path down at once, with no deploy") and `events`. `en.ts:2232-2241` `admin.switches.labels` lists `bookings, wallet, messaging, assistant, support, agent_listings, hybrid_hotels, hybrid_restaurants` and neither `social` nor `events`. `app/admin/switches/page.tsx` falls back to `labels[flag.key] ?? flag.key` and `consequences[flag.key] ?? copy.consequences.generic`.
- **Action.** Add `social` and `events` labels and consequences to all four locale files. The social consequence should say exactly what goes: the feed, places, posts, stories, profiles and every write path, with past content preserved.
- **Reason.** The moment this switch is used is an incident, under time pressure, and the console will show an admin a raw key and a generic sentence. That is when a wrong switch gets flipped.
- **Impact.** The incident tool reads clearly when it is needed.
- **Effort.** S
- **Risk.** None. `[AGENT 2]` owns the console; the copy is in my locale scope.
- **Priority.** Medium

#### A1-039. The locale files still describe partner hotel and restaurant inventory, which ADR-013 deleted
- **Evidence.** `en.ts:2239-2240` `hybrid_hotels: "Partner hotels"`, `hybrid_restaurants: "Partner restaurants"`, and `:2250-2251` "Partner hotel inventory drops out of search. First party stays remain." / "Partner restaurant inventory drops out of search." The same strings exist in `ha.ts:1995`, `ig.ts:2005` and `yo.ts`. `lib/flags.ts` still declares both keys in `FeatureKey`. `docs/PRODUCT.md` section 1 states "the `hybrid_hotels` and `hybrid_restaurants` flags are deleted".
- **Action.** Remove both labels and both consequences from all four locale files and both keys from `FeatureKey`. I could not check the live `feature_flags` rows, so if rows still exist they need deleting too, which is `[AGENT 2]`.
- **Reason.** First-party-only inventory is a decision, not a default, and the admin console describing partner inventory in four languages is the last place that decision has not landed. `RECOMMENDATIONS.md` S-2 marks the code and database residue DONE; the copy is the residue that survived.
- **Impact.** ADR-013 becomes true everywhere, including in the console.
- **Effort.** S
- **Risk.** Low. If live rows exist, the console will show raw keys until they are removed, so do both together.
- **Priority.** Medium

#### A1-040. The cancellation schedule is modelled correctly and is the template the rest of the trust surface should follow
- **Evidence.** `lib/trust/cancellation.ts:112` `Math.round((paid * stop.refundBasisPoints) / 10_000)` and :129 the same. Integer basis points, `Math.round` on kobo, no float. `FULL_REFUND_HOURS = 72` is a named constant with a comment explaining why 72 and not 24. The same module feeds `/cancellations`, the safety page's `CancellationTimeline` and the listing's own dates, so the published policy and the computed refund cannot diverge.
- **Action.** Nothing to fix. Use this module as the reference shape for the fee schedule FEE-2 asks for and for the tenancy terms in A1-001: policy as data, one definition, read by the public page and the engine alike.
- **Reason.** Recorded as a positive because the report is otherwise a list of problems and because this is the pattern that should be copied rather than reinvented. It is also the counter-example to A1-004: here the promise and the mechanism are the same object.
- **Impact.** Future money policy inherits a proven shape.
- **Effort.** None.
- **Risk.** None.
- **Priority.** Nice-to-have

---

### Group C. The social layer, and turning it into a reason to return

#### A1-041. The utility record, which the social design calls "the whole wedge", has no table
- **Evidence.** `docs/SOCIAL_DESIGN.md` section 3 lists "The light changed. 'Light came back on around Yaba. 9 residents, 14 minutes ago'" as "The wedge, narrating itself. This is the entry people come back for", and section 6 designs the anti-gaming model around `area_utility_state`, `area_utility_daily`, an `agreement` column and a reporter weighting system. Section 11 makes verified utility history the first of four monetisation paths that respect the no-fee rule. `grep -c "area_utility" apps/web/src/lib/supabase/database.types.ts` returns **0**. The 73 tables in the generated types include no utility table of any kind. What does exist is `area_members.utility_weight` (:469) and `area_members.notify_utility` (:462): the weighting column and the notification preference for a feature with nothing behind them.
- **Action.** Build it, and build it small. One table of reports (`area_id`, `reporter_id`, `kind`, `state`, `reported_at`), one derived current state per area, and the two defences that matter most from section 6: a single reporter can never move the state, and an account holding a published listing in the area has its weight cut and its report labelled. Ship power only, not water, and ship it in three Lagos areas. Section 12 item 4 already recommends one city.
- **Reason.** This is the answer to "why would a Nigerian open this app a second time", and it is the only answer in the whole design that does not depend on the person being mid-move. Power is the thing everybody in Lagos talks about every day. It is also the only monetisation path that charges no member and no agent: an estate-level power history sold to a developer is a supplier-side sale. And it is the strongest possible signal on a listing, because "this address averaged 18 hours of power over 90 days across 212 residents" is a fact no WhatsApp listing can offer.
- **Impact.** A daily reason to open the app that has nothing to do with searching. A listing signal no competitor can fabricate. A revenue path that does not break rule 8.
- **Effort.** XL
- **Risk.** High and it is the interesting kind. A gameable utility record is worse than none, because the platform would be publishing a number an agent wrote. Section 6's six defences are the design and they should not be trimmed to ship faster. The daily cross-area cap and the conflict-of-interest weighting are the two that must be in version one.
- **Priority.** High

#### A1-042. `events` and `event_attendees` exist, a Meetups feature flag exists, and there is no query and no screen
- **Evidence.** Both tables are in `database.types.ts`. `grep -rn 'from("events")' apps/web/src` and the same for `event_attendees` return nothing. `lib/flags.ts` declares `events` in `FeatureKey` with the comment "Meetups. Built to SOCIAL_AUDIT section 6 and off until slice 4 safety is proven in production and a named person is watching the queue." `RECOMMENDATIONS.md` mentions the table once, at :2844, only to correct a different entry that had mistaken it for a telemetry table. `en.ts` `admin.switches.labels` has no `events` entry (see A1-038).
- **Action.** Decide: finish it or drop it. If it is finished, it needs the moderation answer its own flag comment demands first, because a meetup is the one social feature where a bad actor meets a real person at a real address. If it is dropped, drop the tables and the flag rather than carrying them.
- **Reason.** Carried schema with no owner is how a platform accumulates surfaces nobody can secure. This one is also the highest-risk social feature on the roadmap, and it is sitting half-built with a flag whose comment says nobody is watching the queue.
- **Impact.** Either a real local-meetup product, which is genuinely differentiated for a neighbourhood platform, or two fewer tables to secure and document.
- **Effort.** L to finish, S to drop.
- **Risk.** If finished without the moderation answer, it is the most dangerous feature on the platform. If dropped, nothing.
- **Priority.** Medium

#### A1-043. Three of the fifteen badges depend on mechanisms that do not exist anywhere in the codebase
- **Evidence.** `docs/BADGES.md` section 3: "Neighbour: Joined a hub and earned five Helpful", "Local Guide: Twenty five Helpful on Ask posts within one hub", "Connector: Ten accepted link ups". `grep -rn "HELPFUL\|Helpful\|link.up\|linkup" apps/web/src` returns **nothing**. `post_mark` in `database.types.ts` is `"LIKE" | "SAVE"`: there is no Helpful mark. `KNOWN_GAPS.md` names the `booking_status`, `photo_pro`, `local_guide` and elite gaps and does **not** name Helpful or link-ups.
- **Action.** Either add a Helpful mark on `ASK` posts, which is a good idea in its own right because an answer that helped is different information from an answer somebody liked, or redefine the three badges against marks that exist. Do not leave criteria a sweep can never satisfy.
- **Reason.** Three of fifteen badges are permanently unearnable, and `private.sweep_badges` runs nightly against criteria it cannot meet. Badges are the platform's earned-standing mechanism and the one that is meant to bring people back; a ladder with unreachable rungs is a ladder people stop climbing.
- **Impact.** The member ladder becomes completable. A Helpful mark on Ask posts also gives the social layer its first real quality signal, which is what `Local Guide` was for.
- **Effort.** M
- **Risk.** Low. A new mark needs a policy and a rate limit; `post_reactions` already has the shape.
- **Priority.** Medium

#### A1-044. `docs/BADGES.md` uses "hub", which the terminology table bans
- **Evidence.** `docs/BADGES.md` section 3 uses "hub" twice: "Joined a hub", "within one hub". `docs/PRODUCT.md` section 7: "**Place** | A named area inside Around, backed by a local government | Hub, district, neighbourhood."
- **Action.** Replace with "place" in `docs/BADGES.md`, and add `hub` to the S-4 synonym spec's banned list so the documentation is covered as well as the copy.
- **Reason.** The badge document is the specification the sweep is written from, and it uses the banned word for the central noun of the social layer. Vocabulary drift starts in the specification.
- **Impact.** One vocabulary, including in the documents.
- **Effort.** S
- **Risk.** None.
- **Priority.** Nice-to-have

#### A1-045. Nothing connects an area page to the listings in that area, so supply is not content
- **Evidence.** `grep -n "Listing\|listing\|supply\|rail" app/(app)/around/[slug]/page.tsx` returns nothing. `docs/SOCIAL_DESIGN.md` section 3 designs a system entry "A stay went live. Real `ListingCard` inline" fired by a listing reaching `PUBLISHED` in that area, and section 11 item 3 calls the area to listing funnel "the highest intent traffic on the platform". `RECOMMENDATIONS.md` O-5 records the absence at P1; this entry is the specific design.
- **Action.** Two pieces. A supply rail on every area page showing published listings in that local government, which is a read the repository can already answer. And the system entry: a trigger writing a `posts` row with `author_kind = 'SYSTEM'` when a listing publishes in an area, with the listing card rendered inline, capped at one in four entries once the area has human posts, exactly as section 3 specifies.
- **Reason.** A person reading about Yaba is the highest-intent property reader the platform will ever have, and the page shows them no property. The system entry also solves the supply-acquisition pitch for free: an agent who lists well gets reach in the area, earned rather than sold, which is the cheapest supply pitch available and does not break rule 8.
- **Impact.** The social layer starts paying for itself in bookings. Agents get a reason to list in areas that have readers. The cold-start room is never empty.
- **Effort.** M
- **Risk.** Low. The one-in-four cap matters: an area feed that becomes a listings wall stops being a conversation.
- **Priority.** High

#### A1-046. All 18 posts are SYSTEM-authored and there is no path from reading the feed to writing in it for somebody who has joined nothing
- **Evidence.** `docs/PRODUCT.md` section 9: "posts 18 (all author_kind SYSTEM)". `app/(app)/around/page.tsx` state 2 handles "Signed in with none joined, or signed out entirely" by showing `getEverywhereFeed` "under a line saying plainly that these places are not yours yet and one control that goes and picks them". `AroundFab` renders nothing when there is nothing behind it. `RECOMMENDATIONS.md` O-2 records the SYSTEM-only state at P1.
- **Action.** Make the first post the easiest thing in the product. On the everywhere feed, when a reader has joined nothing, offer one question rather than a composer: the area they set in `/settings/place` and a single prompt tied to it. A blank composer asks a person to decide what to say; a question asks them to answer.
- **Reason.** The cold start is the real risk and `SOCIAL_DESIGN.md` section 3 says so. The current answer is honest but passive: it tells a reader these places are not theirs and offers a directory. The distance between reading and writing is the whole conversion and it is currently a two-step detour through a settings screen.
- **Impact.** The first human post arrives sooner, which is the event the whole social layer waits on.
- **Effort.** M
- **Risk.** Low. Must not nag. One prompt, dismissible, never repeated on the same day.
- **Priority.** Medium

#### A1-047. A shared profile link produces a bare handle with no description and no image
- **Evidence.** `app/(app)/u/[handle]/page.tsx:70-77`: `generateMetadata` returns `{ title: `@${normaliseHandle(handle)}` }` and nothing else. No `description`, no `openGraph`, no `twitter`, no `alternates.canonical`. `social_profiles` carries `display_label`, `bio`, `avatar_path`, `banner_path`, `occupation_code`, `state_code` and `lga_code`, all of which would make a good card.
- **Action.** Build the card from the data that exists: title as the display label with the handle, description as the bio or a composed line ("Agent in Yaba, Lagos. 12 listings."), and the avatar as the Open Graph image. Add the canonical URL.
- **Reason.** A profile is the most-shared link on any social product, and in Nigeria it is shared on WhatsApp, which renders a preview. A preview reading "@seyi" with the site-wide description is a link people do not tap.
- **Impact.** Every profile share becomes a recruitment surface. For agents it is a business card they can paste anywhere.
- **Effort.** S
- **Risk.** Low, and it interacts with A1-005: a person who has opted out of discoverability should get a minimal card, not a rich one.
- **Priority.ance** Medium

#### A1-048. A shared post produces no image even when the post has one
- **Evidence.** `app/(app)/post/[id]/page.tsx:13-28`: title and description only. `post_media` exists as a table. No `openGraph`, no `twitter`.
- **Action.** Add an Open Graph image from the post's first media item where one exists, `summary_large_image` on Twitter when it does, and `summary` when it does not. Fall back to the author's avatar rather than nothing.
- **Reason.** A picture of a street with the light on is the content that travels. Sharing it as unillustrated text throws away the reason somebody would tap.
- **Impact.** The social layer becomes shareable off-platform, which is the only distribution it has.
- **Effort.** S
- **Risk.** Low. A post that has been taken down must not keep serving its image; `RECOMMENDATIONS.md` O-4 already notes media for a removed post stays in storage.
- **Priority.** Medium

#### A1-049. The root Open Graph metadata has no image, so sharing the platform itself on WhatsApp produces a blank preview
- **Evidence.** `app/layout.tsx:67-74` sets `openGraph` with `title`, `description`, `siteName`, `locale` and `type`, and no `images`. There is no `twitter` block at root and no `app/opengraph-image.*` file anywhere in the tree (`find app -name "opengraph*"` returns nothing). Listing pages do this correctly via `listingMetadata` in `lib/listings/syndication.ts`, which sets `images` from the lead photo and `summary_large_image`.
- **Action.** Add a root Open Graph image and a root Twitter card. Do it as a static asset rather than a generated one, so it costs nothing at request time. `[TRACK A]` owns the artwork.
- **Reason.** WhatsApp is how a link travels in this market. Every share of the platform itself, from every page that is not a listing, currently renders as a title and a line of grey text next to nothing.
- **Impact.** Every share of the platform becomes a picture. It is the cheapest distribution improvement available.
- **Effort.** S
- **Risk.** None.
- **Priority.** High

#### A1-050. `openGraph.locale` is hardcoded to `en_NG` with no alternates, on a four-locale product
- **Evidence.** `app/layout.tsx:72`: `locale: "en_NG"`. The root element sets `lang={locale}` from `getLocale()`, so the HTML language and the Open Graph locale can disagree on the same response. No `alternateLocale` is declared and no `hreflang` alternates are emitted anywhere I found.
- **Action.** Set `openGraph.locale` from the negotiated locale and declare the other three as `alternateLocale`. Separately, decide whether locale should be a URL segment; today it is negotiated from a header and a cookie, which means there is no distinct URL per language and therefore nothing for `hreflang` to point at. That is a real architectural decision and a significant one for organic discovery in a four-language market.
- **Reason.** Search engines cannot index four language versions of a page that has one URL. The product's multi-language claim currently has zero discovery value.
- **Impact.** Correct locale signalling now, and a decision recorded about whether localised URLs are wanted later.
- **Effort.** S for the locale field, L for URL-segmented locales.
- **Risk.** URL-segmented locales are a large change touching every link and the middleware. Do not start it casually; record the decision first.
- **Priority.** Medium

#### A1-051. `/assistant` is not in the robots disallow list, so crawl budget is spent on a page that always redirects
- **Evidence.** `app/robots.ts` disallows `/admin/`, `/agent/`, `/api/`, `/auth/`, `/bookings/`, `/checkout/`, `/home`, `/legal/`, `/messages/`, `/notifications/`, `/profile/`, `/saved`, `/settings/`, `/stories/`, `/styleguide`, `/wallet`, `/welcome`. `assistant` is in `middleware.ts` `PRODUCT_SEGMENTS`, so it redirects an anonymous request to `/sign-in`. The file's own comment says "The disallow list is the same line `middleware.ts` draws with `PRODUCT_SEGMENTS`", and `assistant` is the one segment where those two lists differ.
- **Action.** Add `/assistant` to the disallow list.
- **Reason.** The comment states the invariant and the list breaks it, which is exactly the kind of drift that makes a reader distrust the rest of the file. Practically it is one wasted crawl path.
- **Impact.** The stated invariant becomes true. A spec asserting the two lists match would be ten lines and would belong with T-9, which already asks for the middleware and the client gate to be checked against each other.
- **Effort.** S
- **Risk.** None.
- **Priority.** Nice-to-have

#### A1-052. Recent searches and recently viewed are device-local, so a person's history does not follow them
- **Evidence.** `lib/search/memory.ts`: the view is a cookie, and recent searches and recently viewed are `localStorage` lists read back through a validator. Nothing writes either to the database.
- **Action.** Once `saved_searches` has a writer (A1-015), mirror recent searches to the account for signed-in users and keep the local copy as the signed-out and offline path, the same two-store pattern `lib/saved/local.ts` already uses well.
- **Reason.** Phone sharing and device changes are common in this market, and a person who searched on a borrowed phone loses everything. The pattern for doing this properly already exists in the codebase.
- **Impact.** History survives a device. Recently viewed becomes usable for personalisation rather than only for a rail.
- **Effort.** M
- **Risk.** Low. Search history is personal data and needs a lawful basis named before the column is added, per `HANDOFF_01` section 4.4, plus a way to clear it.
- **Priority.** Medium

#### A1-053. There is no way to compare two listings, on a product whose assistant already has a compare tool
- **Evidence.** `app/api/assistant/route.ts:220` defines a `compare_listings` tool: "Put two to four Vallo listings side by side on the facts that decide between them: price and what period it covers, bedrooms, bathrooms, where it is, light and water, whether the lister is verified, and the rating with the number of reviews behind it." There is no comparison surface anywhere in `app/`: `/saved` renders a board of cards and `SavedBoard.tsx` has no compare mode.
- **Action.** Add a compare view to `/saved`: select two to four, see them as columns on exactly the facts the assistant's tool already names. The tool's own parameter list is the specification and it was clearly thought about.
- **Reason.** Choosing between three flats is the actual job a renter has, and today it is done by switching tabs. The platform has structured power, water, move-in cost, bedroom and verification data that no competitor holds, and comparison is the surface where structured data beats photographs.
- **Impact.** `/saved` stops being a list and becomes a decision tool, which is a reason to return during the search rather than only at the start. It is also the surface where the differentiating columns finally earn their keep.
- **Effort.** M
- **Risk.** Low. Needs to work at 390px, which means a horizontally scrolling column layout rather than a table.
- **Priority.** High

#### A1-054. A saved shortlist has no notes, no tags and no way to record why a place was saved
- **Evidence.** `saved_items` carries `user_id` and `listing_id`. `lib/saved/types.ts` `SavedEntry` is `{ listing, savedAt, mode }`. No note, no group, no rank.
- **Action.** One free-text note per save, and nothing more elaborate than that. Not folders, not tags, not collections: a note.
- **Reason.** A person viewing five flats in a weekend needs to remember which one had the generator and which landlord was difficult. Today that lives in their phone's notes app, which means the decision happens outside the platform, which means the platform is not present at the moment of choosing.
- **Impact.** The shortlist becomes the place the decision is made. A person with notes in a product does not abandon it mid-search.
- **Effort.** S
- **Risk.** Low. It is user content on a listing, so it needs the same scanner treatment as a message if it is ever shown to anybody else, and the simplest answer is that it never is: a note is private to its author, like a save.
- **Priority.** Medium

#### A1-055. Two copies of the assistant wire protocol exist and they have drifted
- **Evidence.** `lib/assistant/protocol.ts` and `lib/assistant/types.ts` both declare `AssistantListingItem` and `AssistantStreamEvent`. `types.ts` includes `{ type: "error"; message: string }`; `protocol.ts` does not. The price comment differs ("NGN 185,000 / night" against "NGN 185,000 per night"). `KNOWN_GAPS.md` already lists `lib/assistant/protocol.ts` as one of nine orphan modules deliberately not deleted, so I am not rediscovering the orphan.
- **Action.** Delete `protocol.ts`. The drift is the evidence that carrying it costs something: it is now a second, wrong description of a live contract that a future reader could import.
- **Reason.** Two definitions of a wire protocol is how a client and a server stop agreeing. KNOWN_GAPS left the nine orphans in place because a parallel session was in the tree; that reason has expired for this one, and the drift is new information.
- **Impact.** One contract.
- **Effort.** S
- **Risk.** None. `grep` confirms three importers and all three use `types.ts`.
- **Priority.** Nice-to-have

#### A1-056. The assistant's system prompt is the best-written thing in the product and it is not enforced anywhere
- **Evidence.** `app/api/assistant/route.ts:96-109` contains rules that are genuinely excellent: never invent listings, prices, availability, ratings or reviews; verified means a person checked the lister and unverified is not an accusation; when a price reads not published, say the price is not published rather than implying it is free; and rule 4, which explains that caution deposit, agency fee, legal fee, agreement fee and service charge "are the difference between the price on the card and the money somebody has to find". `RECOMMENDATIONS.md` AI-4 asks that the assistant not answer questions about escrow, fees or verification from its own model, and is open.
- **Action.** Turn the prompt's hard constraints into checks rather than instructions. Specifically: refuse to emit a listing id the tools did not return (a post-processing check on the stream, not a prompt rule), and hard-code the escrow, fee and verification answers as retrieved text rather than generated text, which is what AI-4 asks for. Keep the prompt.
- **Reason.** Rule 1 is "never invent listings" and the only thing enforcing it is the model's cooperation. On a platform whose history includes twenty-three invented places carrying `verified: true`, a fabricated listing reference from the assistant would be the same failure by a new route.
- **Impact.** The no-fabrication rule becomes structural rather than instructional.
- **Effort.** M
- **Risk.** Low. A post-processing check that strips an unknown id must not mangle legitimate prose; strip the link, keep the sentence, and log it.
- **Priority.** High

#### A1-057. The assistant has no disclosure that its output is assistance rather than advice
- **Evidence.** `HANDOFF_01` section 4.7 requires a disclaimer wherever "generated text is advice or a valuation" could be misread, and `HANDOFF_02` section 21 says "if it does ship, it is disclosed... generated output is assistance, not advice, and never a substitute for viewing a property". I found no such string in `app/(app)/assistant/page.tsx`, `components/app/assistant/AssistantChat.tsx` or the locale files' assistant copy.
- **Action.** One persistent line on the assistant surface, in all four locales, and the same line in the comment-bot's replies where the assistant answers inside Around. It should say what it is and name the one thing it cannot replace: seeing the place.
- **Reason.** The assistant discusses prices, move-in costs and whether an agent is verified. A person acting on a generated summary of a rental they have not seen is the exact harm the handoff names.
- **Impact.** A stated obligation becomes met. It also strengthens rather than weakens the product, because the line that matters is "go and see it", which is the platform's own safety advice.
- **Effort.** S
- **Risk.** None.
- **Priority.** High

#### A1-058. The assistant persists threads it never reads back, so a conversation cannot be resumed
- **Evidence.** `ai_conversations` and `ai_messages` exist. `RECOMMENDATIONS.md` AI-1 records this at P1. `AssistantChat.tsx` sends `threadId` when it has one, so the client half exists.
- **Action.** AI-1 owns the fix. The product point I am adding: read them back and put the thread list in the surface, because a resumable conversation about a house hunt is a returning-user mechanism, not just a feature. A person who asked the assistant about Yaba last week and can pick that thread back up has a reason to open the app.
- **Reason.** Storage without retrieval is cost without benefit, and it is also personal data held with no purpose being served, which `HANDOFF_01` section 4.4 has an opinion about.
- **Impact.** The assistant becomes a continuing relationship rather than a one-shot query box.
- **Effort.** M
- **Risk.** Low. A stored conversation about somebody's budget is sensitive and needs a retention period and a delete control.
- **Priority.** Medium

---

### Group D. Inspections, which are the differentiator and are currently a booking form

Section 21 of the handoff says the whole fraud pattern happens between first
contact and first payment, and that the inspection workflow should be genuinely
useful rather than a booking form. The state machine is well built:
`lib/inspections/types.ts` has six states, an `OPEN_STATES` set, and a `waitingOn`
function whose comment correctly identifies that the most useful thing to state on
a row is whose move it is. Everything below is what sits around it and does not
exist.

#### A1-059. A confirmed inspection does not tell the renter where to go
- **Evidence.** `lib/listings/access-queries.ts`: the policy on `listing_access` "names exactly three readers: the host, an admin, and a guest holding a CONFIRMED booking on that listing". A confirmed inspection is not a booking and is not on that list. `listing_access` holds `estate_name`, `gate_directions`, `security_phone` and `access_code`, which is exactly what somebody needs to arrive at a Lagos estate.
- **Action.** Add a fourth reader: a requester holding a CONFIRMED `inspection_requests` row, released at confirmation, and release the directions and the security phone but not the access code. The code is for somebody who is staying; the directions are for somebody who is coming to look.
- **Reason.** The platform confirms an appointment and withholds the address, so the address gets sent in a chat message or over the phone, which is the exact off-platform drift the messaging scanner exists to catch. It also makes a confirmed inspection feel less real than a WhatsApp arrangement, which is the comparison that matters.
- **Impact.** A confirmed inspection becomes a complete instruction. One fewer reason for the conversation to leave the platform.
- **Effort.** S
- **Risk.** Medium and it needs thought. Releasing directions on request rather than on a booking widens who can learn where a property is, so it should be released on CONFIRMED only, logged, and revoked when the inspection is withdrawn or declined. `[AGENT 2]` owns the policy change.
- **Priority.** High

#### A1-060. Nothing reminds anybody that an inspection is happening
- **Evidence.** `notification_kind` has eight values and none of them is scheduled: `booking, message, wallet, listing, agent, support, system, social`. `inspection_requests` carries `slot_at`. No `pg_cron` job, trigger or query anywhere reads `slot_at` against a clock.
- **Action.** A job that writes one notification to both parties the evening before a confirmed slot and one two hours before it, naming the property, the time and the directions from A1-059.
- **Reason.** A missed viewing costs a renter a day and an agent a lead, and in this market a no-show is the most common reason a deal dies. This is the most obviously useful notification the platform could send and it is informational rather than manipulative, which puts it firmly on the right side of rule 12.
- **Impact.** Fewer missed viewings. A notification people are pleased to receive, which is what makes the notification channel worth having at all.
- **Effort.** M
- **Risk.** Low. Needs the timezone right: Nigeria is UTC+1 and `lagosToday` already exists in `lib/bookings/schema.ts` for exactly this reason.
- **Priority.** High

#### A1-061. There is no way to tell somebody where you are going to a viewing
- **Evidence.** Nothing in `lib/inspections/*` or the inspection components shares an appointment outward. `ListingActions.tsx` has a `share()` using `navigator.share`, which shares the listing, not the appointment.
- **Action.** One control on a confirmed inspection: send the details to a phone contact. Property, address, time, the agent's display name and their verification tier, and a line saying who to contact if the person does not check in. Plain text through the share sheet, so it works on WhatsApp with no integration.
- **Reason.** A woman viewing a flat alone in Lagos, arranged through an app, with a stranger, is the highest-risk moment in this entire product, and the platform currently offers her nothing. This is not a feature, it is a duty of care, and it is also the single most persuasive thing the platform could say about itself. No competitor in this market does it.
- **Impact.** A real safety mechanism at the real moment of risk. It is also inherently viral: the message goes to somebody who is not a user, and it arrives with the platform's name on it explaining what it is for.
- **Effort.** S
- **Risk.** Low. It must not imply the platform is monitoring the viewing or will intervene, which `HANDOFF_01` section 4.7 already names as a misunderstanding to prevent ("That the platform is present at the inspection").
- **Priority.** High

#### A1-062. Nothing records how an inspection went, so the inspection produces no trust signal
- **Evidence.** `inspection_confirmations` exists as a table and the safety page says "Both sides can record that the inspection happened, in the conversation itself." `InspectionState` has `COMPLETED` but nothing carries an outcome: there is no as-described field, no rating, no note about the property.
- **Action.** One question after a confirmed slot passes, to the requester only: was the property as it was listed. Three answers, yes, mostly, no, with an optional line. A no routes straight into the report queue at the `misrepresentation` category. Publish nothing from a single answer; publish an aggregate on the agent's page once there are enough to mean something.
- **Reason.** An inspection is the only moment the platform has a human eyewitness on a property, and it currently throws that away. This is the cheapest listing-quality signal available and it is also the fastest fraud detector: three people saying a flat is not as listed is a stronger signal than any scanner.
- **Impact.** Listing quality becomes measurable. A renter can see that eleven people viewed this agent's properties and all said they matched. An unearnable review problem (A1-002) gets a partial answer that needs no money to have moved.
- **Effort.** M
- **Risk.** Medium. A single negative answer must never be published, both because it is unfair and because it is a harassment vector. Aggregate only, with a floor.
- **Priority.** High

#### A1-063. There is no record of a no-show, so an agent who never turns up carries no consequence
- **Evidence.** `InspectionState` is `REQUESTED, CONFIRMED, PROPOSED, DECLINED, COMPLETED, WITHDRAWN`. There is no state and no column expressing that a confirmed appointment did not happen, and `closeInspection` in `lib/inspections/actions.ts` is the only terminal action besides the lister's answer.
- **Action.** Let either party mark a confirmed slot as not happened, and keep a count per agent that admin can see. Do not publish it as a number; use it as a queue signal, in the same way `risk_alerts` works. Three no-shows in a month is an agent a person should look at.
- **Reason.** The one thing a renter cannot discover today is whether an agent actually shows up, and it is the thing they most need to know. It is also the cheapest form of listing fraud: advertise a flat that does not exist, take enquiries, never appear.
- **Impact.** The trust queue gains its most useful signal. Agents who do show up are implicitly rewarded.
- **Effort.** M
- **Risk.** Medium. A no-show claim is an accusation and must not be publishable or automatically punitive. Queue signal only, a human decides, which is what `/standards` already promises.
- **Priority.** Medium

#### A1-064. There is no video or remote inspection, which is the single most valuable thing the platform could offer the diaspora
- **Evidence.** `app/(site)/safety/page.tsx` `INSPECTION_STEPS[1]` says "view the property before any money moves, in person or on a video call", so the policy already contemplates it. Nothing in `lib/inspections/*` distinguishes the two: `inspection_requests` has no `mode` column, and the request form asks only for a time and a note.
- **Action.** Add a mode to an inspection request: in person, or a video walkthrough at an agreed time. For a video walkthrough, the agent records or streams and the platform stores the recording against the inspection. A recording is evidence: it is what a person abroad can show a relative, and it is what settles an as-described dispute later.
- **Reason.** Section 23.1 names the diaspora as the most obvious differentiation available, and the diaspora's first problem is that they cannot stand in the room. Nobody serves this. A recorded, timestamped walkthrough attached to an inspection record is a genuinely new product in this market, and it costs the platform nothing but storage.
- **Impact.** The diaspora market becomes addressable. Every renter benefits, because a recording also protects a local tenant whose flat is not what they saw.
- **Effort.** L
- **Risk.** Medium. Video is storage and bandwidth on a market with expensive data; `RECOMMENDATIONS.md` MED-1 notes no bucket carries a size limit and MED-2 that video upload is not built, so both are prerequisites. A recording of somebody's home is personal data and needs a lawful basis and a retention period before the column is added.
- **Priority.** High

#### A1-065. There is no way to nominate somebody to inspect on your behalf
- **Evidence.** `inspection_requests` has `requester_id` and `lister_id` and nothing else. `requestInspection` inserts the caller as requester. There is no proxy, no delegate and no second attendee anywhere in the schema.
- **Action.** Let a requester name a person who will attend instead of them: a name and a phone number, shown to the agent, recorded on the inspection. No account required for the attendee, because requiring one defeats the purpose.
- **Reason.** This is how property is actually viewed in Nigeria when the person paying is not in the country, or is at work, or is a parent renting for a student. Today it happens over the phone with no record, which means the agent does not know who to expect and the renter cannot prove who went. `docs/PRODUCT.md` has a `book-for-someone-else` spec in the test suite, so the concept is already accepted elsewhere in the product.
- **Impact.** The diaspora and the parent-renting-for-a-student cases become first-class. The agent knows who is arriving, which is a safety improvement for them too.
- **Effort.** M
- **Risk.** Low. It records a third party's name and phone number, so the lawful basis and the retention have to be named first, per `HANDOFF_01` section 4.4.
- **Priority.** Medium

#### A1-066. An inspection cannot be added to a calendar
- **Evidence.** No `.ics` generation anywhere: `grep -rn "BEGIN:VCALENDAR" apps/web/src` returns nothing.
- **Action.** An "Add to calendar" control on a confirmed inspection, serving a small `.ics` with the time, the property title and the directions from A1-059. Same for a confirmed stay's check-in.
- **Reason.** An appointment that lives only inside an app is an appointment that gets missed, and the reminder in A1-060 depends on the person having notifications on, which most do not.
- **Impact.** Fewer missed viewings by a second, independent route.
- **Effort.** S
- **Risk.** None.
- **Priority.** Nice-to-have

#### A1-067. A renter's inspections live under a tab called Bookings, a word that by the platform's own terminology means a nightly stay
- **Evidence.** `app/(app)/bookings/page.tsx:94` calls `readInspectionsForRequester()`. `docs/PRODUCT.md` section 7: "**Stay** | A nightly booking" and "**Guest** | A member who has booked a stay". A rental has no booking by design ("No Reserve button, ever"), so for a renter the Bookings tab contains no bookings and is the only place their activity lives. I first read this as the requester side having no surface at all; it has one, and it is under the wrong noun.
- **Action.** Rename the destination to something that covers both, or split it. "Activity" or "Your requests" both work; so does keeping Bookings and adding Inspections as a sibling. The rent market is the primary market and its activity should not be filed under the stay market's noun.
- **Reason.** A renter who never books a night is told their viewings are bookings. It is small, and it is the kind of thing that makes a product feel like it was designed for somebody else.
- **Impact.** The primary market's activity has a name that describes it.
- **Effort.** S
- **Risk.** Low, but it moves a tab bar destination, so `[AGENT 3]` owns the screen and the navigation.
- **Priority.** Medium

#### A1-068. An inspection request asks for one time, so a decline restarts the whole exchange
- **Evidence.** `requestSchema` in `lib/inspections/actions.ts` takes a single `when`. The lister's answer is `CONFIRMED`, `PROPOSED` or `DECLINED`, so a lister who cannot do the asked time must propose an alternative or refuse.
- **Action.** Let a requester offer two or three times. The lister confirms one. `PROPOSED` stays as the path for a time neither side offered.
- **Reason.** The `PROPOSED` state exists precisely because a single proposed time usually fails, and the comment on `waitingOn` says "This is the state that stops a reschedule reading as a refusal". Offering three times up front removes most of the round trips, and each round trip is a day in a market where a good flat is gone in three.
- **Impact.** Faster arrangement, fewer abandoned exchanges.
- **Effort.** M
- **Risk.** Low. Needs the schema to hold alternatives without complicating the confirmed slot, which stays single.
- **Priority.** Medium

---

### Group E. Onboarding, first run and personalisation

#### A1-069. First run asks what kind of property and never asks where or how much
- **Evidence.** `lib/interests/schema.ts` derives the onboarding vocabulary from `property_type`, deliberately and correctly ("There is deliberately no second interests taxonomy"). `INTEREST_COPY` has ten markets. `app/welcome/page.tsx` renders `FirstRun` with three cards and "the one question". The city, the area and the budget are not asked. `/settings/place` exists as a separate later screen.
- **Action.** Add two questions to first run, both skippable: roughly where, using the place picker that already exists and is backed by 774 local governments, and roughly what you can spend, as a move-in budget for the rental market and a nightly budget for stays. Three questions is still a short first run.
- **Reason.** Market alone cannot personalise anything a person would notice. Market plus place plus budget is a saved search, which is A1-015, which is the retention engine. The platform is asking the one question that produces the least actionable answer and skipping the two that produce the most.
- **Impact.** Every new account arrives with a brief the platform can act on, which means the first notification a person ever receives is a real match rather than a prompt to do something.
- **Effort.** M
- **Risk.** Low. A longer first run costs completions, so both extra questions must be skippable and the skip must be as prominent as it is today.
- **Priority.** High

#### A1-070. First run cannot express an intent to buy, on a platform whose largest hole is buying
- **Evidence.** The interests vocabulary is `property_type`, which answers what kind of building. `listing_intent` (`rent` or `sale`) is a separate enum and is absent from onboarding entirely. `RECOMMENDATIONS.md` N-6 and P-8 cover the missing Buy navigation and page.
- **Action.** Ask the intent question first, before the market: are you looking to rent, to buy, or to stay a few nights. It is one tap, it is the most useful single fact about a visitor, and it decides which product they should be shown.
- **Reason.** Renting and buying are different products with different journeys, different money and different fears. Asking a buyer which kind of building they want before asking whether they are buying is asking the second question first. It also means that on the day the sale UI lands, there is already a population who said they want it.
- **Impact.** The platform learns its demand mix, which is the number that decides whether building the sale UI is urgent. A buyer's journey can be shaped for a buyer.
- **Effort.** S
- **Risk.** Low. Storing an intent that the product cannot yet serve needs an honest answer on the screen: say the sale catalogue is being built rather than implying it exists.
- **Priority.** Medium

#### A1-071. A second copy of the interest labels lives in `lib/interests/schema.ts` beside the dictionary's
- **Evidence.** `INTEREST_COPY` in `lib/interests/schema.ts:34-49` holds an English label and hint per market. `components/app/welcome/InterestChoices.tsx:66` carries a comment about the dictionary owning those words, and `en.ts` has `interests.hints` and `interests.markets`. `grep -rn "INTEREST_COPY"` returns only the definition and that one comment, so the English copy is defined and not read.
- **Action.** Delete `INTEREST_COPY` and keep the schema module for the validator and the enum, which is its real job.
- **Reason.** A second English copy of copy that is already in four languages is how the monolingual version gets picked up again by the next reader, which the comment in `InterestChoices.tsx` already worries about.
- **Impact.** One source of these ten labels.
- **Effort.** S
- **Risk.** None, but recheck the import graph before deleting: my grep was for the identifier, and a re-export would not show.
- **Priority.** Nice-to-have

#### A1-072. Nothing in the product explains what the move-in breakdown lines mean, at the moment a person reads them
- **Evidence.** `listings` carries `caution_deposit_minor`, `service_charge_minor` with a period, `agency_fee_minor`, `legal_fee_minor` and `agreement_fee_minor`. `RECOMMENDATIONS.md` P-2 asks for the UI contract for the breakdown. The assistant's system prompt rule 4 explains these lines well; no screen does. The help centre has no renting category (A1-036).
- **Action.** An inline explanation on each line of the breakdown: one sentence saying what it is, who normally receives it, and whether it comes back. Caution deposit comes back subject to condition; agency fee does not. That distinction is the single most valuable sentence the platform can show a first-time renter.
- **Reason.** The product rule says leading with the total move-in cost is the differentiator. A total a person does not understand is a bigger number that frightens them, which is the opposite of the intended effect. The differentiator only works if the breakdown is legible.
- **Impact.** The differentiating number becomes reassuring rather than alarming. A first-time renter learns the market from the platform, which is a reason to trust it.
- **Effort.** M
- **Risk.** Low. Anything describing who receives money or whether it returns is close to legal, so keep it descriptive of market practice rather than prescriptive of rights. `[AGENT 3]` owns the listing screen; this is the content requirement.
- **Priority.** High

#### A1-073. `/welcome` asks its question once and there is no way to change the answer from the place it was asked
- **Evidence.** `app/welcome/page.tsx` redirects to `/home` when `intent.asked || intent.interests.length > 0` and `intent.welcomeSeen`. `/settings/interests` exists as the later editor. The welcome screen itself offers no route back to it.
- **Action.** On the screen immediately after first run, say where the answer lives. One line on `/home`: you told us you are looking for rentals in Yaba, change that in settings.
- **Reason.** A person who skips first run, or taps the wrong card in a hurry, has personalised the product wrongly and has no idea where that decision was recorded. Personalisation a person cannot see is personalisation they experience as the product being wrong about them.
- **Impact.** The stated intent becomes visible and correctable, which is what makes people willing to state it.
- **Effort.** S
- **Risk.** None.
- **Priority.** Medium

#### A1-074. There is no returning-user home, so a person who has searched arrives at the same screen as a person who has not
- **Evidence.** `app/(app)/home/page.tsx` is localised and reads `getShellIdentity`. `readIntentTuning` is called by `/search` to tune ordering. `lib/search/memory.ts` keeps recently viewed in `localStorage` only, which the server render cannot see, so `/home` cannot use it.
- **Action.** Once A1-052 mirrors history to the account, make `/home` lead with the person's own state: the saved search and its new matches, the shortlist with anything that changed, an inspection that is coming up, and the last thing they looked at. Everything else below that.
- **Reason.** Every retention mechanism in this report needs a surface to land on, and today that surface shows the same thing on the second visit as on the first. A home screen that does not change between visits teaches a person that opening the app tells them nothing new.
- **Impact.** The second visit has a reason. This is the screen that makes A1-015, A1-016 and A1-060 visible.
- **Effort.** M
- **Risk.** Low. Must degrade to the current screen for somebody with no history, and must not be empty-but-full-of-prompts, which is the usual failure.
- **Priority.** High

#### A1-075. Nothing captures demand when a search returns nothing, which is the state the whole catalogue is in
- **Evidence.** `docs/PRODUCT.md` section 9: zero listings, so "every discovery surface is genuinely empty". `RECOMMENDATIONS.md` DEMO-3 asks for the honest ways to make an empty platform feel alive and VIBE-5 says the empty state is the product right now and is being designed as an accident. `EmptyState` is imported into `/search` from `components/app/Screen`.
- **Action.** On an empty result set, offer to keep the search and tell the person when something matches. That is A1-015's write path reached from the one place it is most obviously useful, and it converts the platform's current worst state into its best lead-capture surface.
- **Reason.** Today an empty search is a dead end that teaches a visitor the platform has nothing. Tomorrow it is a waiting list with a real brief attached, which is also the number that tells the supply team which city to recruit agents in first. The empty catalogue is a fact; wasting the traffic that meets it is a choice.
- **Impact.** Every failed search becomes a lead and a demand signal. Supply acquisition gets evidence rather than intuition.
- **Effort.** M
- **Risk.** Low, and it must be honest: say the catalogue is still filling in this area, do not imply results are being hidden.
- **Priority.** High

#### A1-076. CORRECTED. The stated-intent explanation exists and is good; the string is hardcoded English on an otherwise localised page
- **Evidence.** I filed this entry believing the tuning was invisible, then read the render and it is not. `app/(app)/search/page.tsx:462-472` shows a note when `intentApplied && intentKinds.length > 0`, reading `"<Kinds> first, because that is what you said you came for. Search or filter and this stops."` with `data-testid="intent-note"`. It is exactly the right sentence: it names what was done, why, and how to undo it. **The finding I thought I had does not exist.** What is real is that the page calls `getDictionary` at :154 and uses `t.` in 47 places, and this sentence is an English literal.
- **Action.** Move the sentence into the dictionary. The kind nouns come from `KIND_NOUN`, which is also English-only (`search-params.ts:56-67`), so the list inside the sentence needs localised nouns too. `en.ts` already has `interests.markets` labels that could serve.
- **Reason.** The one line on the discovery surface that explains why the results are in this order is in one of four languages, so three quarters of the audience sees an ordering they cannot get an explanation for.
- **Impact.** The explanation reaches everybody. `KIND_NOUN` being localised also fixes every category label on the page.
- **Effort.** M. `KIND_NOUN` has 11 entries used in several places, so it is more than a string move.
- **Risk.** Low. A counted noun in Yorùbá and Igbo has one plural category, which `Intl.PluralRules` and the existing `counts` block already handle.
- **Priority.** Medium
