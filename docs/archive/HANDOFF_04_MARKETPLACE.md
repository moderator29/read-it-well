# HANDOFF 04: the marketplace, and what Vallo becomes

**This is the fourth handoff and the largest mission in this repository.**
`HANDOFF_01` is the company and the law. `HANDOFF_02` is the platform and the
working method. `HANDOFF_03` is the glass visual language. This one is the next
era: **Vallo stops being a property listing site and becomes a real estate and
spaces marketplace.** Property, Stays, Restaurants, and the services around a
stay, in one coherent product.

Read 01, 02 and 03 before this one. Everything in them still binds. Where this
document and an older one disagree about marketplace architecture, this one
wins. Where anything disagrees with `HANDOFF_01` on money, law or the company,
`HANDOFF_01` wins.

Written 18 September 2026.

---

## 0. The mission, and the sentence that carries it

**This is not "add hotels".** Treat it that way and the work fails before it
starts. A hotel bolted onto a rental app is a travel widget. What is being
built is the platform where somebody finds the flat they will live in, books
the hotel for the week before the keys, and knows where to eat near both.

The sentence: **Vallo connects people with verified spaces, places, stays and
the life around them.**

The customer should feel that Vallo understands the relationship between where
they live, where they stay, where they eat and where they are going next. The
product must still feel focused and elegant. Nothing gets crammed onto the
homepage. The foundation expands; the surface stays calm.

The slogan stands: **Real Estate reimagined!** The landing narrative widens
around it; the line itself does not get relitigated.

---

## 1. Before anything: read, sync, and check for a running sprint

1. `git pull origin main` first. Sessions land work daily and this document
   describes the repository as of its own commit, not forever
2. Read, in order: `docs/HANDOFF_01_COMPANY.md`, `docs/HANDOFF_02_PLATFORM.md`,
   `docs/HANDOFF_03_FRONTEND.md`, `docs/PRODUCT.md`, `docs/HANDOFF.md`,
   `ARCHITECTURE_DECISIONS.md`, `RECOMMENDATIONS.md` (645 entries),
   `docs/FRONTEND_REVAMP.md`, `docs/SPRINT_60_B.md` (and `docs/archive/SPRINT_60.md`), the three reports in
   `docs/audit/`, and `docs/ICON_SYSTEM.md`
3. **Check the newest sprint ledger on main.** A parallel session has been
   executing sprints (the last ledger read 51 of 60 mid-flight). If a ledger
   shows an open sprint with recent commits, do not touch its owners' file
   scopes; coordinate through the founder or wait for its close-out
4. Run the baseline and record what already fails: `npm run typecheck`,
   `npm run lint`, `npm run test`, `npm run build`
5. The Supabase MCP is the truth about the database. Project
   `uccixoonmbhrnyczyigt`, Postgres 17. The sandbox cannot reach the Supabase
   host directly and blocks image hosts; that is environment, not product

**`docs/archive/` governs nothing, with one exception in this mission:**
`docs/archive/HYBRID_INVENTORY.md`, `docs/archive/DATA_SOURCES.md` and
`docs/archive/DEAD_ENDS.md` are the design record of the system in section 2,
and for this work they are required reading as history, not as instructions.

---

## 2. The vault: the hybrid engine was already built, and where it lives

**This is the section that changes the cost of the whole mission.** The
spec this handoff absorbs assumes external inventory is a greenfield build. It
is not. A hybrid inventory system was designed, built, shipped and then
deliberately removed, and every line of it is recoverable from git history.

### 2.1 What existed, in ADR-013's own words

> "A hybrid model was designed, built and shipped: one provider interface, a
> registry, per-provider kill switches in `public.feature_flags`, a hard 2.5s
> timeout collected with `allSettled`, and a dedupe rule requiring both a 150
> metre haversine match and a name token match before two records collapse. It
> worked. It was removed anyway."

### 2.2 The recoverable commits

Read them with `git show <sha>`. Mine them; do not blindly revert them.
Note that `08d2298f` is a root commit, so `git show` prints its entire
snapshot; read its message and the inventory paths, not all 1,900 files.

| Commit | What it holds |
| --- | --- |
| `90b6b53d` | The LiteAPI booking client, 889 lines |
| `f267a934` | A partner hotel becomes bookable, and says so only when it can |
| `b02b290a` | The price the guest leaves with is the price the room costs |
| `5354fc90` | Quoting the night the guest will actually be shown |
| `a78887ac` | The booking calls pointed at the right host |
| `7f9a7a4d` | Google Places quota batching, six requests to one |
| `38c88d33` | The 401 disambiguation on empty provider notes |
| `08d2298f` | Amadeus removed, the decision recorded |

### 2.3 The doors that were left open on purpose

- `apps/web/src/lib/listings/types.ts` kept `source` as a single valued field
  (`source?: "vallo"`) instead of deleting it, with a comment saying why. It
  widens back to a union without breaking a reader
- `apps/web/src/lib/security/csp.ts` no longer whitelists any LiteAPI host:
  the image wildcard was deliberately closed after this section was first
  written. Partner photos therefore need a deliberate decision, proxy or named
  hosts, before any partner row renders (corrected 18 September against the
  live file)
- The provider pattern (registry, kill switches in `feature_flags`, timeout
  discipline, dedupe) is a design you re-instate, not re-invent

### 2.4 How to use the vault, and how not to

- **Reference and salvage, never paste.** That code predates the rename
  (`@naijafinds` became `@vallo`), the current token system, the glass icon
  layer and several schema changes. Restore the architecture and the hard-won
  logic; rewrite the surface to today's codebase
- **The dedupe rule, the timeout discipline and the price-honesty commits are
  the treasure.** Those encode weeks of debugging. Carry their logic forward
  verbatim in behaviour even where the code is rewritten
- **Do not resurrect Amadeus** without the founder's word. It was removed by
  his decision (`08d2298f`)

### 2.5 Why it was removed, because both reasons still bind

**Trust:** there is no person behind a rate feed. The verified badge is a claim
about a human who was checked. Section 7 resolves this with source attribution
instead of pretending the problem away.

**Money:** booking with a card through the platform makes Vallo the merchant of
record: a funded float with suppliers, naira collected in Vallo's name, and
refunds owed from Vallo's own pocket when a supplier fails after the card was
taken. Section 5 resolves this with the model gate.

---

## 3. What already exists and must not be rebuilt

Rebuilding any of these is the most expensive available mistake. Verify each
against the live database and current main, then build on top.

- **The money core.** Append-only `wallet_entries`; `wallets` deliberately has
  no balance column, the balance is derived so it can never disagree with the
  ledger; `platform_revenue` append-only; `fee_rates` append-only with every
  rate zero by the owner's decision; an escrow state machine enforced by
  trigger; `private.pay_booking_from_wallet` writing six things atomically
- **Bookings and availability.** `bookings`, `availability`,
  `booking_state_events`; a GiST exclusion constraint means the database
  itself refuses a double booking
- **Restaurants have a seed.** `public.reservations` books a table at a
  first-party restaurant, and a trigger blocks partner venues from being
  reserved. That trigger is the source-attribution principle already enforced
  in the schema
- **Verification.** `agent_verification_checks`, one row per rung (identity,
  address, payout, in person), `agents.verification_tier` derived and never
  set by hand, `agent_badges` written only by `private.sync_agent_badge`
- **Trust and safety.** RLS on all 76 tables with the planner-friendly
  subquery form, SECURITY DEFINER in a `private` schema, database-enforced
  idempotency, durable rate limiting, the message scanner trigger, an
  append-only `audit_log` where UPDATE, DELETE and TRUNCATE are revoked and
  refused by trigger
- **The frontend system as of the sprints.** The glass icon layer live across
  124 call sites, one motion system with named curves, `ResultSheet` replacing
  43 bespoke confirmations, `ActionBar`, `QueueFilters`, the seven-section
  landing page, the OG image, four languages (English, Yorùbá, Hausa, Igbo),
  the slogan landed in its ten places
- **The intelligence.** 645 recommendations with statuses, three audit reports
  in `docs/audit/`, `docs/FRONTEND_REVAMP.md`, two sprint ledgers

**Known carried-forward gaps, named in the last close-out:** two brand objects
to commission, the light pass of six icon sheets, a mark-only logo render,
`QueueFilters` on one queue of nineteen, the `/admin/bookings` filter
narrowing rows not the query, `MomentScreen` with one call site,
`Sheet.initialFocus`, `KIND_NOUN` and wallet `STATUS_LABEL` awaiting
dictionary keys, and **nothing signed-in has ever been rendered because the
environment has no credentials. Ask the founder for one seeded login at
session start; it is the highest-leverage gift available.**

---

## 4. The pillars, and the experience that sells them

### 4.1 Vallo Property

Everything the platform is today: rent, buy, sell, list, manage, inspect,
verify, report. Re-evaluated inside the marketplace architecture, not left as
a museum wing. Buy and sell remain the largest legacy gap (`P-1` lineage);
this mission is the moment the data model finally learns to express a sale.

### 4.2 Vallo Stays

Hotels, serviced apartments, guest houses, resorts, short lets, furnished
apartments. Two supply sides, and both are first class:

- **First-party hosts** onboard through a dedicated flow: business profile,
  verification, rooms, room types, photos, amenities, pricing, occupancy,
  check-in and check-out rules, cancellation policy, house rules, and a
  console for reservations, guests, revenue, availability and reviews
- **Partner inventory** arrives through the provider layer of section 2,
  labelled as such, fulfilled per section 5

Hotels are not pretended into the ordinary listing shape. Section 6 gives them
a real one.

### 4.3 Restaurants

A first-class category with three strictly separated origins: businesses that
onboard on Vallo (profile, hours, cuisine, photos, menus, reviews, and later
reservations through the machinery that already exists), licensed partner or
places data shown with attribution, and never anything scraped. The existing
`reservations` trigger already draws this line in the schema; the product now
draws it on screen.

### 4.4 Services, later

Transport, cleaning, laundry, concierge, experiences. **Design the seams, do
not build the rooms.** The entity model and navigation must accept a new
category without surgery, and no service category ships in this mission.

### 4.5 The one search

`Lagos, 15 to 18 December, 2 adults` returns stays, short lets and relevant
property side by side. Filters: price, rating, location, type, room type,
facilities, breakfast, air conditioning, parking, Wi-Fi, verified, free
cancellation, distance from a landmark, guest capacity, availability.

**The total is the headline.** Nightly price, nights, fees, what is included,
cancellation terms, and the total, before any tap deeper. Nobody opens five
tabs to learn whether breakfast is in. Never hide the true cost, and never
show stale availability as guaranteed availability.

### 4.6 Location intelligence

"Hotels near Victoria Island." "Stays near the airport." Coordinates,
geocoding, radius and bounding box search, landmark relationships, nearby
places, map and list in conversation with each other. PostGIS is the natural
candidate on this stack; evaluate it against plain Postgres before adopting,
and do not build a fake location layer that cannot scale.

---

## 5. The two models, and the gate that protects the company

The inventory layer supports multiple fulfilment modes per row: Vallo booking,
external completion, partner handoff. **The UI always states who fulfils the
reservation and where payment happens.** That sentence is compliance, trust
and honest design in one.

**Model 1, aggregator, is the MVP default.** Vallo shows inventory,
availability and true totals; the booking completes with the provider; Vallo
earns referral commission. No float, no refund liability, and most of its
engine is in the vault.

**Model 2, booking and payment inside Vallo, is gated.** It makes Vallo the
merchant of record. It requires the founder's explicit word plus a funded
float, and under `HANDOFF_01` it is a financial commitment shaped like a
Reserved Matter. **Architect for it, do not activate it.** The fulfilment
field, the state machines and the ledger design must make switching a row to
Model 2 a decision, not a rebuild.

First-party hosts on Vallo (short lets, guest houses) already pay through the
existing wallet and booking machinery. That is not Model 2; that is the
platform's own inventory doing what it always did.

---

## 6. The inventory architecture

Design the normalised model before writing a migration. The entities in play:
business, property, accommodation, room type, unit, rate plan, availability,
listing, restaurant, provider, source, fulfilment, booking, reservation,
guest, host, operator, amenity, location, landmark, cancellation policy,
review, payout, commission, receipt.

Ground rules:

- **Source attribution is a first-class column, never an inference.** Every
  row of inventory knows whether it is first-party, partner or provider-fed,
  and everything downstream (badges, booking, messaging, reviews) branches on
  it
- **Rooms are not listings.** A hotel is a business with accommodations, room
  types, units and rate plans. Bolting `room_count` onto `listings` is the
  shortcut this section exists to forbid
- **Availability at stays scale** means units per room type per night,
  blackout dates, minimum and maximum stays, and concurrency handled the way
  the platform already handles it: constraints and locks in the database, not
  hope in the application. The GiST pattern extends; learn from it
- **Explicit state machines** for bookings and reservations, enforced by
  trigger like escrow already is. No archipelago of `isBooked` booleans
- **Money stays integer kobo**, and every partner price converts at the edge
  with the conversion recorded
- Every foreign key gets a covering index; every applied migration is mirrored
  into `supabase/migrations/`; a migration succeeding does not mean the
  function works, so probe it

**Multi-market seams:** do not hardcode Nigeria, Lagos, one payment provider,
one map provider or one hotel provider into the architecture. Configuration
and provider interfaces now spare architectural surgery when Ghana or Kenya
arrive. Do not over-abstract either; abstraction goes where lock-in would
genuinely hurt.

---

## 7. Trust and verification across sources

The badge is the product. Guard it accordingly.

- **The verified badge means a human was checked by Vallo.** It appears only
  on first-party entities that passed the ladder, and the structured model
  says what was verified: identity, business, property, address, documents,
  ownership
- **Partner and provider inventory never wears the badge.** It wears a
  distinct, honest source label, visually calm, never orange, never a warning,
  simply the truth about where the row came from
- A generic tick with no answer to "verified what, by whom" is forbidden
- Reviews follow the same law: verified-stay reviews marked as such, partner
  ratings attributed to their source where licensing allows, and nobody
  reviews what they never touched where verification is possible

---

## 8. The frontend mandate: executed, not recommended

**The founder's instruction is explicit: the entire frontend of everything in
this handoff gets done.** This session picks the greatest recommendations from
`docs/FRONTEND_REVAMP.md`, the 645, and its own findings, and builds them,
alongside the new marketplace surfaces. Recommend where a decision is
genuinely the founder's; build everywhere else.

The visual law is `HANDOFF_03` and the sprint standard: the glass language
derived from the logo, electric blue with light inside it, deep navy-black
ground, dark default with a designed paper twin, 390px first, motion as
physics with `prefers-reduced-motion` honoured at the top, one ambient
animation per viewport, and the test for every screen: **would a funded design
team have shipped this.**

No AI slop, and the list is binding: no meaningless gradients, no random
glowing blobs, no glass smeared everywhere, no generic SaaS dashboard, no
copied Airbnb, Booking, Zillow or Stripe language, no trend because it is
trendy, no overloaded screens. Vallo has its own identity now; extend it.

The surfaces this mission owns:

- **Information architecture.** Navigation grows pillars (Discover, Property,
  Stays, Restaurants, Saved, Bookings, Wallet, Messages, Profile is the
  starting hypothesis, not the answer). Reason about it, in both themes, at
  both widths, before rebuilding the tab bar
- **The landing page** widens its narrative to spaces and stays without
  becoming a bazaar. It was just rebuilt to seven strong sections; evolve
  them, do not pile on an eighth for every pillar
- **Search results** in list, grid, map and split modes; stay cards carrying
  name, type, rating, distance, source label, amenities that matter, and the
  total; property cards carrying market label, move-in total, verification.
  Progressive disclosure; never an overloaded card
- **The stay detail page**, new: gallery, identity, rating, map, room and
  rate selection that feels like a real booking surface, date and guest
  controls, the total with everything included, cancellation policy in plain
  words, amenities, reviews, nearby restaurants and landmarks, and a
  fulfilment-honest CTA
- **The property detail page** re-evaluated in the same language
- **The map** as a first-class surface: clustered and price markers, entity
  colours within the blue family, selected and hover states, mobile gestures,
  list synchronisation
- **The wallet**, rebuilt on the existing ledger: balance, history, detail,
  send, withdraw, fund, receipts, refunds, every state through `ResultSheet`,
  every transaction linked to the marketplace object it paid for. The ledger
  is right; the clothes are being cut to fit it
- **Business consoles**, role-aware: host, hotel, restaurant, agent. Shared
  foundations, specialised workflows, never one giant dashboard
- **Admin** grows moderation queues for stays, restaurants and partner
  sources on the `QueueFilters` frame, with granular permissions and the
  append-only audit trail behind every action

---

## 9. Backend, security and the honesty of the build

Backend work makes the frontend genuinely functional. **No fake booking
success, no fake availability, no fake balances, no fake verification, no
mock rows dressed as production inventory.** Where a provider or credential is
missing, build the boundary, label the state honestly in the UI, and record
the gap.

Security posture: keep what is strong (section 3), then sweep the new surface
with the discipline of `HANDOFF_02` section 16: authorisation, input
validation, uploads, webhooks (signature verification, duplicate and delayed
delivery), IDOR, enumeration, race conditions on booking and payment, secrets
handling, admin privilege. Marketplace abuse gets its own pass: fake
properties, fake hotels, fake reviews, booking and price manipulation, payout
fraud, refund abuse, duplicate and spam listings, malicious uploads. Payment
status is verified server-side, always; a frontend success response is a
rumour.

Notifications become one architecture (in-app, email, push, SMS where earned)
rather than logic buried per feature; the trigger-driven system that exists is
the foundation. Messaging gains contextual anchors so a conversation can
belong to a booking, a stay or a listing. Observability grows with the money:
the cron jobs that nothing alerts on, payment and booking monitoring, and
audit trails on every sensitive transition.

---

## 10. The API inventory, mandatory

Before this mission's final handoff, produce `docs/API_INVENTORY.md`. Not
"Vallo needs hotel APIs"; the actual technical plan, researched against
official documentation with the web tools, never invented.

**Categories to cover:** maps and geocoding, places and landmarks, hospitality
inventory (research real candidates; for each: what data, live availability,
live pricing, booking support and where it occurs, commission model, auth,
rate limits, partnership requirements, Nigerian and African coverage, sandbox,
webhooks, licensing, limitations, and a verdict: available now, application
required, future, or unsuitable), restaurant and place data (licensed only),
payments (audit what exists first; Paystack is live), banking (account name
lookup, transfers, virtual accounts, behind the payment abstraction), wallet
boundaries (the internal ledger never depends on an external API for its own
history), notifications (email, SMS, push, OTP), identity and KYC
(NIN-ecosystem providers included), AI (what is already used, what earns its
place), media and CDN, search infrastructure (Postgres and PostGIS first;
adopt an engine only when the comparison says so), analytics with privacy in
mind, and security services.

**The deliverable shape:**

1. A master matrix: category, provider, purpose, existing or new, required or
   optional, Nigerian coverage, booking and transaction support, credentials
   needed, partnership needed, cost (**"pricing requires provider
   confirmation" when unverified, never a guess**), priority
2. Current versus new: already connected, required for the new architecture,
   recommended later, future
3. A credential checklist in placeholders only (`MAPS_API_KEY`,
   `HOTEL_PROVIDER_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, and so on), with
   webhook and callback URLs and environment variables named. **Never a real
   value in any document**
4. An action plan: IMMEDIATE, NEXT, LATER, each entry naming provider,
   purpose, credentials, backend service, frontend surfaces, database
   objects, webhooks, testing and security considerations

**Architecture rules:** every external call lives behind the backend
integration layer (frontend, then Vallo API, then service layer, then
provider); the frontend never holds a provider credential; provider
interfaces (`HotelProvider`, `MapProvider`, `PaymentProvider`,
`NotificationProvider`, `IdentityProvider`) where lock-in would hurt; failure
design for timeout, retry, outage, stale data, duplicate webhooks, price and
availability change; freshness policy per source, and stale never sold as
live. The founder adds all keys personally; never block on a missing one, and
never let a missing key fail silently on a payment webhook.

---

## 11. One recommendation system, upgraded not duplicated

`RECOMMENDATIONS.md` holds 645 entries with statuses and history. **Do not
create a rival file.** Absorb: read all of them, mark what the sprints
already landed as DONE with the commit, mark what the marketplace direction
supersedes as WITHDRAWN with the reason, upgrade what the new architecture
reshapes, keep identifiers resolving because code and documents cite them,
and add the new marketplace, stays, restaurant, search, map and API entries.
The bar stays at 400 or more genuine entries, each carrying evidence, action,
reason, impact, effort, risk, priority and status. Padding the count is the
one way to fail the file.

---

## 12. Repository hygiene, with the two locked doors

- **Secrets sweep.** No credentials are known to be committed; verify rather
  than trust this sentence. The founder's bank account numbers sit in
  `docs/HANDOFF_01_COMPANY.md` and in history; the repo is now private, which
  contains the exposure. Strip them from the current file and keep them with
  the budget artifact
- **Locked door one: history rewriting.** Purging history is destructive to
  every clone and every open PR. It happens only on the founder's explicit
  word, as its own operation, documented. Never as a side task
- **Locked door two: branch deletion.** `docs/BRANCH_AUDIT.md` records every
  head SHA; a previous session's remote deletes were refused by credential
  permissions. Classify and report; actual deletion may need the founder in
  the GitHub UI. Never delete a branch whose SHA is not recorded first
- **PR #56 is stale.** Its head is the old `claude/rentme-v2-platform-audit`
  branch; every commit in it already reached main by another route, and it
  conflicts. The correct resolution is closing it, which is the founder's
  click, not a merge
- Old handoffs move to `docs/archive/` when superseded; they are the record
  and are never simply deleted

---

## 13. The rules, all of them, in one place

These bind this session, every agent it launches, and every session that
follows. An agent restates them before starting or it has not read them.

1. **Zero em dashes anywhere.** Code, copy, docs, commits. British spelling
2. **Money is integer kobo as bigint.** `Math.round(naira * 100)` only at the
   input boundary; display only through `formatMoney` from `@vallo/i18n`;
   never float, never hand-divide; the ledger balances exactly and platform
   is always zero
3. **The platform charges no fees anywhere** in copy; a processor's cut is
   labelled as the processor's
4. Every server action returns the **`ActionResult`** envelope; sessions come
   from `resolveSession()`
5. **`BrandIcon` and `UiIcon` only.** No `strokeWidth` on UiIcon, no `ramp`
   on BrandIcon, `Icon` and `Icon3D` stay deleted, tiers never mix in a row
6. **390px first, in dark, then wider, then light.** A finding that only
   works in dark is half a finding
7. **Dark is the default and the OS does not override it.** Light is a
   designed paper twin, no blue-tinted greys
8. **One blue family.** Emerald success, rose error, bright cyan pending and
   attention. No orange, amber, gold, purple, violet, magenta, ever. A new
   accent is a new depth of blue
9. **No raw colours, no raw spacing**; use the scale or extend it; never
   disable a lint rule to land a change
10. **Motion is physics, not decoration.** Named curves in one system,
    `prefers-reduced-motion` turns it all off and the product stays complete,
    one ambient animation per viewport, nothing loops for its own sake
11. **Escrow is promised nowhere** until it operates. Copy never contradicts
    the terms of service
12. **First-party trust is sacred.** The verified badge only ever means a
    human was checked; partner inventory is labelled, never dressed as
    first-party (this evolves ADR-013 rather than violating it: the badge
    rule survives, the inventory rule gains the labelled-source lane)
13. **Banned in UI copy:** demo, sample, preview, not live, coming soon,
    lorem. Colour is never the only signal
14. **The brand is Vallo.** VALLO SPACES LTD appears only on legal surfaces.
    RentMe and NaijaFinds are dead names
15. **No dark patterns.** No fake scarcity, no manufactured urgency, no fake
    social proof. On a trust product these cost more than they earn
16. **Never log or paste a NIN, document number, card number, bank account
    or personal data** into logs, reports or documents. New personal-data
    fields need a named lawful basis first (`HANDOFF_01` section 4)
17. **Secrets live in the environment and Vault, nowhere else.** Exposed
    means rotate first, tell the founder second
18. **Never say committed, pushed, tested, verified, compliant or done unless
    it is true.** A quiet skip is worse than a stated one. Report what was
    not done, unprompted
19. **The ONE LAW decides done:** UI action, validated server action, database
    write surviving RLS, UI showing the new reality, the notification the
    event deserves, a test proving it. A screen with no write path is a half;
    never build two halves instead of one whole
20. **The standard is not "does it work". It is "would a funded design team
    have shipped this"**

---

## 14. Autonomy, and the short list of full stops

**This session runs fully autonomously.** Decide, build, verify, record, keep
going. Do not stop to ask about anything already answered in this document or
the ones it inherits. Engineering judgment is expected; timidity is not.

Stop and ask only for:

- Activating Model 2 or anything creating merchant-of-record exposure, a
  float, or a financial commitment
- Spending money or adding a paid vendor
- Destructive database operations: drops, data-losing migrations, revokes
- Git history rewriting, and remote branch deletion beyond what credentials
  permit
- Native app identifiers
- Anything touching the agreements, the budget or `HANDOFF_01` legal ground
- A seeded login for signed-in rendering (ask once, at the start; it is the
  highest-leverage thing the founder can grant)
- Restoring Amadeus

Everything else is yours. When something important is discovered that this
document missed, it is not out of scope: add it to the architecture, the
recommendations and the plan. **The objective is not literal instruction
following. The objective is that Vallo gets fundamentally better.**

---

## 15. Agents, phases, and the shape of the work

**Maximum three agents, never more.** Strict written non-overlapping file
scopes before anything starts, the sprint-proven pattern. A finding outside an
agent's scope is a line in its report, not an edit. Agents never run git; the
lead re-audits and commits everything; an agent's success report is verified,
not believed. Brutal honesty, no padding, and each agent restates section 13
before it begins.

The split that fits this mission:

- **Agent 1, product and architecture research:** the marketplace model, the
  vault excavation, the data model, search and location, the API inventory
  groundwork, the recommendation consolidation
- **Agent 2, frontend and experience:** IA, landing evolution, search
  results, stay and property detail, map, wallet surfaces, consoles, in both
  themes at both widths
- **Agent 3, backend, security and infrastructure:** schema and migrations,
  provider layer, booking and availability, payments and webhooks, the
  security sweep, repository hygiene

The phases, in order, none skipped: **freeze and audit; product model;
architecture and migration plan; design system deltas; core frontend;
backend that makes it real; integrations behind boundaries; security
hardening; end-to-end testing (auth, listing, search, stay detail, booking,
cancellation, wallet, withdrawal, receipts, onboarding, verification,
messaging, reviews, admin, on mobile and desktop, through empty, error, slow
network and conflict states); then the full quality sweep, because the second
sweep finds what the first could not know to look for.**

No half implementations, and the words are banned until true: "hotel support
added" with only a card, "booking implemented" without availability
integrity, "wallet redesigned" with a broken withdraw, "security completed"
with only a checklist, "marketplace complete" on an architecture that cannot
carry it.

---

## 16. Deliverables, and the handoff that ends this mission

In the repository when this operation closes:

1. `docs/ARCHITECTURE_MARKETPLACE.md`: the new product and data architecture,
   the fulfilment model, the migration plan from what exists
2. The marketplace schema, migrated, mirrored and probed
3. The frontend of everything in section 8, built to the standard
4. The backend that makes it true, with honest boundaries where credentials
   are pending
5. `docs/API_INVENTORY.md` per section 10, with the action plan
6. `RECOMMENDATIONS.md` upgraded per section 11
7. The security sweep's findings, fixed or filed
8. Repository hygiene done within its locked doors
9. Documentation that matches the code it describes
10. **`docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`: the build
    session's complete brief.** Two
    agents maximum for that session. It states what Vallo is now, what
    changed, what was implemented and verified, every schema and API change,
    what remains with file-level precision, known limitations, credentials
    still missing, the API action plan, and the rules carried forward. It is
    an execution document a fresh session can run on without this
    conversation. "Continue improving Vallo" is not a handoff

And a close-out report to the founder in chat: where it stands, what landed,
what was skipped and why, what needs his word, and nothing padded.

---

## 17. The final outcome

A customer discovers a home, a stay and a place to eat through one coherent,
breathtaking product. A host runs a real hospitality console. A hotel's
partner inventory is honest about what it is. The wallet reads like the
financial heart of the platform because it is one. Search feels intelligent,
the map feels native, verification means something exact, bookings are real,
payments are verified server-side, the backend is hardened, the architecture
takes Ghana without surgery, the repository is clean, and the next session
starts from a handoff instead of from zero.

Vallo enters its next era looking like it was always meant to be this.
