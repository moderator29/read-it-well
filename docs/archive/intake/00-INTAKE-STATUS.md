# NaijaFinds: Intake Status (Pre-Implementation)

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


> **STAGE: INTAKE. NO IMPLEMENTATION AUTHORISED.**
> Per Master Execution Instruction §1 and §59, and reaffirmed by the owner in the
> Master Rules closing note, no application code, schema or UI may be produced
> until all 15 design references are received, the design system and information
> architecture are settled, the repository is audited, and the roadmap,
> recommendations and architecture records exist.
> This file is the intake-stage project brain. It is *not* the Phase 0 audit
> deliverable. Those documents are created only after 15/15.

Last updated: 2026-07-28

---

## 1. Design reference tracker

**Status: 13 unique references received. Count needs reconciling with the owner.**

19 image attachments have arrived across four batches. 6 were duplicates of
references already recorded, leaving **13 unique**. The owner's own count is
"total would be 13, so remaining 3". These do not agree, and 13 plus 3 is 16
rather than 15. Before the 15/15 gate can be judged, the true denominator and
the true received count must be settled. See §7 question 1.

Duplicate attachments received: reference 01 twice, reference 02 twice,
reference 04 twice, reference 05 twice, reference 06 twice, reference 07 twice.

| # | Received | Authority | Surface | System area informed |
|---|----------|-----------|---------|----------------------|
| 01 | Yes | A | Desktop, Personal Mode | Search and discovery, results list, map, filters drawer, property preview rail, AI panel |
| 02 | Yes | A | Mobile plus desktop | Mode switch flow: personal home, profile menu, Become an Agent, application status, mode picker, agent dashboard |
| 03 | Yes | A | Desktop, Agent Mode | List Apartment 7 step wizard, admin listing review, published state |
| 04 | Yes | A | Desktop plus mobile | Personal home, agent dashboard, admin command centre, AI assistant, property details |
| 05 | Yes | A | Asset sheet | **3D icon library**, 4 categories, roughly 192 icons. See §6 |
| 06 | Yes | A | Desktop, Admin | Super Admin dashboard, 13 item rail. **Conflicts on IA, see C-10** |
| 07 | Yes | A | Desktop, Admin | Admin AI Assistant, 14 item rail. **Conflicts on IA, see C-10** |
| 08 | Yes | A | Desktop, Consumer | "Find Your Perfect Space" search and property detail, 13 item rail. Host panel, review distribution, tabs. **Conflicts on IA, see C-10** |
| 09 | Yes | A | Desktop, Admin or Agent | "Add New Listing" 6 step wizard, **booking flow and price breakdown**, payments overview, media manager, saved search alerts, platform health, 16 item rail. **Conflicts, see C-10 and C-12** |
| 10 | Yes | A | Full design system sheet | **Colour system, primary gradient, typography (Poppins display, Inter text), visual language, motion, tech stack, landing, auth, mobile home, 20 icon grid, trust bar.** The single most load bearing reference |
| 11 | Yes | A | Brand sheet | Logo lockup, category icons, 12 item consumer icon row, feature list, agent and admin dashboards |
| 12 | Yes | A | Artwork cutout | **Island render and logo with alpha**, plus the 20 icon grid. Production source for `assets/source-sheets/` |
| 13 | Yes | B | UI inspiration, 2 screens | Glowing gradient ring containers and deep glossy buttons. Drove the stride system, ADR-012 |
| 14 | No | | | |
| 15 | No | | | |

### Authority levels (owner-assigned, see §4 C-01)

**A, NaijaFinds Source of Truth.** An actual NaijaFinds screen. Preserve its
navigation, information architecture, component structure, layout relationships,
logo placement, icon system, typography hierarchy, spacing logic, states and
interaction patterns. Do not redesign these core elements arbitrarily.

**B, Visual Inspiration.** Do not copy branding, logo, navigation, text or
proprietary identity. Extract design principles only (glassmorphism, 3D depth,
lighting, material treatment, gradients, neumorphism, card construction, motion
language, spacing rhythm, visual hierarchy) and translate them into the
established NaijaFinds design system.

**C, Mixed.** Identify which parts are authoritative specification and which are
inspiration, and record the split explicitly.

The authority level is assigned by the owner, never inferred. References 01 to 04
are recorded as **A** on the strength of Master Rule 16 ("The supplied NaijaFinds
designs are the visual source of truth"), and because every screen carries
NaijaFinds branding and product IA. If any of these were intended as B or C, say
so and the tracker will be corrected.

---

## 2. Source documents ingested

| Document | Form | Status |
|---|---|---|
| Master Execution and Orchestration Instruction | chat | Ingested |
| Master Rules, 80 numbered rules plus final rule | chat | Ingested, recorded in `01-PROJECT-RULES.md` |
| Design System and 2030 Creative Direction | markdown | Ingested |
| Design System Prompt v2 | PDF | Verified identical to the markdown |
| Build, Infrastructure and Orchestration | markdown | Ingested |
| Build System Prompt v2 | PDF | Verified identical to the markdown |
| Living Recommendations and Ideas | markdown | Ingested |

The two PDFs are rendered copies of the two markdown files, confirmed by text
extraction and token comparison at over 99.8 percent overlap. They carry no
additional requirements. The markdown is canonical, to avoid double tracking.

---

## 3. Repository reconnaissance

Complete. This part of the audit did not require the design references.

| Question | Finding |
|---|---|
| Existing source | None. Repository is empty. |
| Package manifests, dependencies | None. |
| Environment files, secrets | None. No `.env`, no `.env.example`. |
| Database schema, routes, components, tests | None. |
| Deployment config, assets | None. |
| Git state | Branch `claude/repo-cleanup-1spitz`, clean. |

The repository previously held an unrelated product (a React and Vite crypto
site, 113 files), deliberately deleted at the owner's instruction. The prior tree
remains recoverable at commit `8329334`.

Consequence: Build §4's instruction not to destroy working implementation is
moot, and Master Rule 24 (never delete an existing working feature) has nothing
to protect here. **This is a greenfield build with no inherited constraints.**

The repository is named `read-it-well`, which does not match the product. Renaming
is the owner's decision, recorded so it is not forgotten.

---

## 4. Contradiction register

### C-01 Reference authority. RESOLVED

Design §0 says the references are inspiration and must not be reproduced.
Master §31 says they are the visual source of truth and must be preserved.
Master Rule 16 restates the source-of-truth position.

**Owner ruling (2026-07-28):** the references are not all one type. Authority is
assigned per reference using levels A, B and C. **That per-image assignment
overrides the generic wording of both documents.** At 15/15 the two documents are
reconciled through these assignments rather than by choosing one document over
the other.

### C-02 Documentation naming. RESOLVED, decision revised

Three conventions were mandated across the source documents (`RECOMMENDATIONS.md`
in Master §2, `docs/recommendations.md` in Build §41 and Design §23). On a
case-sensitive filesystem these are two distinct files, so the mandated living
project brain would have silently forked in two.

An earlier decision here chose lowercase-kebab. **That decision is reversed.**
Master Rules 21 and 22 name `RECOMMENDATIONS.md` and `ARCHITECTURE_DECISIONS.md`
explicitly and are the most recent owner instruction, so uppercase wins for the
root-level living documents. Convention:

- Root-level living records, uppercase: `RECOMMENDATIONS.md`,
  `ARCHITECTURE_DECISIONS.md`, `ROADMAP.md`, `KNOWN_GAPS.md`.
- Everything inside `docs/`, lowercase-kebab: `docs/architecture.md`,
  `docs/api-map.md`, `docs/database-schema.md`, `docs/security.md`,
  `docs/design-system.md`, `docs/localisation.md`, and so on.
- One file per concept. Lowercase names in Build §41 and Design §23 that collide
  with an uppercase root file are aliases, not separate documents. A mapping
  table will lead `docs/`.
- British spelling for `localisation`, matching product copy.

### C-03 Approval state vocabulary. PARTIALLY RESOLVED, new gap found

Reference 03 shows the admin Listing Review screen with a status dropdown reading
**Pending** and exactly two actions: **Reject Listing** and **Approve Listing**.

Build §8 mandates a `CHANGES_REQUESTED` state, Design §15 shows
Draft to Submitted to Under Review to Changes Requested or Approved to Published,
and Master §11 requires a Request Changes action.

**Gap: the designed admin review screen has no Request Changes action.** It has a
notes field for the agent, but no transition that returns the listing to the
agent for edit. Either the screen needs a third action, or the state machine
drops `CHANGES_REQUESTED`. Recommendation is to add the action, since rejecting a
listing over one bad photo is a poor agent experience and Design §15 explicitly
warns against making moderation feel punitive.

Canonical vocabulary still to be fixed before schema work, since these become
enum values. "More Information Required", "Request Changes" and
`CHANGES_REQUESTED` are the same concept under three names.

### C-04 Agent navigation. RESOLVED

Master §7 gave two different lists, one of 11 items and one of 8. References 02,
03 and 04 all show an identical 10 item agent sidebar, so this is settled:

**Dashboard, My Listings, List Apartment, Bookings, Messages, Reviews, Earnings,
Analytics, Verification, Settings**, plus a persistent **Switch to Personal Mode**
control and an agent identity card at the foot of the rail.

Notes: *Verification* is a destination that appears in no source document.
*Availability* is not a nav item; it lives inside List Apartment step 5.
*Profile* is not a nav item; the agent identity card serves that role. Per Master
Rule 17 this IA is now frozen and must not drift between screens.

### C-05 Location hierarchy. ESCALATED, references contradict the specs

Build §7 and Design §15 mandate `states`, `lgas`, `neighbourhoods` tables and an
LGA field in the listing wizard. **No LGA field appears anywhere in the
references.** Reference 03 step 3 collects Address, Landmark (optional), **City**
and **Area**. Reference 01 filters by city (Lagos, Abuja, Port Harcourt, Ibadan,
Uyo). Reference 04 reports Top Locations by city.

So the specs describe a State to LGA to Neighbourhood model while the designed UI
uses City and Area. These are not the same hierarchy: Nigeria has 36 states plus
FCT and 774 LGAs, and cities do not nest cleanly inside LGAs (Lagos city spans
many; some LGAs contain several towns).

Proposed resolution, to be confirmed at audit: store the canonical administrative
hierarchy (State, LGA, Ward) **and** a separate settlement or locality layer for
City and Area, linked but not conflated, then surface City and Area in the UI as
the references show. This satisfies Master Rule 36 and keeps the designed UX. It
must be decided before any migration is written, because retrofitting is costly.

### C-06 Agent Mode surface. NARROWED

Reference 02 shows the mode picker as a **mobile** sheet, and the resulting agent
dashboard as **desktop**. References 03 and 04 show the agent workspace as
desktop only. Master Rule 32 says mobile is first class and Rule 33 requires a
premium responsive web experience.

Open question: after an agent taps Switch to Agent Mode on their phone, what do
they get? Options are a responsive version of the full workspace, a reduced
mobile agent view, or a prompt to continue on a larger screen. This is a
significant scope difference and no reference answers it yet.

### C-07 Supabase and NestJS boundary. OPEN

Build §3 specifies Supabase PostgreSQL plus a NestJS backend. Two things remain
undefined: which system owns authentication, and whether Row Level Security is
used at all. If NestJS connects with a service-role credential then RLS is
bypassed and all authorisation lives in application code. That is a legitimate
choice but must be deliberate, because Master Rules 10 and 11 require
server-enforced access control and Build §34 requires tests proving users cannot
reach each other's records. Phase 1 gate. Retrofitting RLS later is expensive.

### C-08 Delivery timeline versus scope. OPEN, risk recorded

Build §0 targets roughly one month to MVP plus one month of hardening. The
specified scope is four applications, eight shared packages, roughly 50 tables,
eight third-party integrations, four languages, a 15 section admin command
centre, three AI systems with retrieval and evaluations, 19 categories of test,
and dual app store submission.

Build §0 instructs that scope risk be recorded rather than hidden, so it is
recorded: this is not achievable in two months at the stated quality bar. A
defensible MVP surface cut will be proposed with the Phase 0 audit. **No
reduction in security, data integrity or testing will be proposed.** The
recommendation reduces surface, not rigour.

### C-09 Service fee ownership. NEW, from reference 03

List Apartment step 5 lets the **agent** set Price per Night, Cleaning Fee **and
Service Fee** (shown as ₦15,000). A service fee is normally platform revenue set
by the platform, not by the agent. If agents set it, NaijaFinds has no take rate
in the designed flow.

This connects to a gap that no source document answers: **the commission or take
rate is never defined.** Needs a commercial decision before the payments and
settlement model can be built. Build §16 requires recording gross amount,
platform fee, agent share, processor charges and net settlement, and none of
those can be computed without it.

**Partly answered by reference 09.** The booking flow shows the guest total as
₦250,000 x 2 nights = ₦500,000, plus Cleaning Fee ₦20,000, plus Service Fee
₦15,000, equals ₦535,000. So the service fee is **charged to the guest on top of
the nightly rate**. Who receives it is still undefined, and reference 08 muddies
it further by advertising "zero service fees" as a paid consumer perk (see C-11).

### C-10 Navigation IA is contradictory across references. CRITICAL

Master Rule 17 states navigation must remain consistent across every screen and
must not drift. The references drift badly. **Six different primary navigations
appear across nine source-of-truth references.**

Admin, four variants:

| Source | Items | Rail |
|---|---|---|
| Ref 04 | 15 | Overview, Listing Approvals, Users, Agents, Hotels, Properties, Restaurants, Bookings, Payments, Support / AI, Reports and Moderation, Security and Risk, Analytics, Marketing, System Settings |
| Ref 06 | 13 | Dashboard, Properties, Bookings, Users and Agents, Messages, AI Assistant, Payments, Analytics, Reviews, Saved Items, Reports, Settings, Help and Support |
| Ref 07 | 14 | Dashboard, AI Assistant, Properties, Bookings, Users and Agents, Listings, Approvals, Payments, Messages, Analytics, Reviews, Reports, System Logs, Settings |
| Ref 09 | 16 | Dashboard, Search, Map, Properties, Bookings, List Property, Agents, Users, Payments, Messages, Reviews, Saved Items, Analytics, Reports, Support, Settings |

Consumer, two variants:

| Source | Items | Rail |
|---|---|---|
| Refs 01, 04 | 12 | Home, Hotels, Apartments, Homes, Restaurants, Experiences, Bookings, Messages, Wallet, AI Assistant, Profile, Settings |
| Ref 08 | 13 | Home, Search, Map, Properties, Bookings, Experiences, Saved, Messages, Wallet, Reviews, Agents, Support, Settings |

Only the **agent** rail is stable, identical across references 02, 03 and 04.

This cannot be resolved by inference, because all nine are labelled authority A
and A means preserve the IA exactly. Two source-of-truth references cannot both
be authoritative when they disagree on a frozen element.

Observations offered as input, not as a decision:

- Ref 04's admin rail is the only one that looks purpose-built for this product.
  It has Listing Approvals, Reports and Moderation, Security and Risk and
  Marketing, which map onto Master §12 and §13. The others carry consumer
  leftovers such as **Saved Items** and **Help and Support** in an admin rail,
  which suggests a generic dashboard template reused with NaijaFinds branding.
- Ref 08's consumer rail replaces the five category destinations (Hotels,
  Apartments, Homes, Restaurants, Experiences) with generic Search and Map, and
  adds Agents and Support. It also drops **AI Assistant** from the rail entirely,
  which conflicts with the AI being a headline product surface.
- Ref 09 mixes agent and admin concerns in one rail (List Property next to Users
  and Payments), so it is unclear which role it belongs to.

**This must be settled before any component work.** Navigation determines routing,
layout shells, permission boundaries and the entire admin section list. Building
against the wrong rail wastes more effort than any other single mistake available
here.

### C-11 A paid subscription tier exists in the designs but in no document. NEW

References 06, 07, 08 and 09 all show a **NaijaFinds Pro** upsell:

- Ref 06, admin rail: "Upgrade to Pro. Unlock premium features and grow faster."
- Ref 07, admin rail: "Unlock advanced AI, priority support and more powerful
  admin features."
- Ref 08, consumer rail: "Unlock exclusive deals, **zero service fees** and
  priority support." User badge reads **Super Member** rather than Personal.
- Ref 09: "Unlock premium tools, analytics and more."

None of the three source documents mentions a subscription product, pricing
tiers, entitlements, billing, proration, cancellation, or a Super Member state.
This is a whole commercial subsystem: recurring billing, entitlement checks on
every gated feature, and a second revenue model beside booking commission.

It also collides with C-09. If Pro members pay zero service fees, and the service
fee is guest-paid revenue, then Pro directly reduces per-booking revenue and the
two models must be reconciled deliberately.

Additionally, references 06, 07 and 09 show an upgrade prompt inside the **Super
Admin** rail. The platform operator upgrading their own platform makes no sense
and is further evidence of template reuse.

**Recommendation:** treat Pro as out of MVP scope pending an explicit product
decision, and record it in `RECOMMENDATIONS.md`. Do not build entitlement gating
speculatively.

### C-12 Two different listing wizards, and media scope exceeds the spec. NEW

Reference 03 specifies a **7 step** wizard: Basic Info, Photos, Location,
Amenities, Pricing and Availability, Preview, Submit.

Reference 09 specifies a **6 step** wizard with a different order: Basic Info,
Location, Photos, Details, Pricing, Preview. Amenities is gone, Details is new,
and there is no explicit Submit step.

Separately, reference 09's Media Manager reports **All Photos 245, Videos 18,
Virtual Tours 7, Documents 23**. Every source document, and Master Rule 15, caps
listings at 10 photos with no mention of video, virtual tours or documents. The
icon library in reference 05 also ships Video, Virtual Tour, 3D View and Floor
Plan icons, so the wider media model is clearly intended at some point.

Reference 09 does confirm two useful details that reference 03 left implicit:
photos are capped at 10 per listing ("Upload Photos (10/10)"), and the **first
photo is the cover** ("Drag to reorder. The first photo will be the main image").

Resolution needed on which wizard is canonical, and whether video, virtual tours
and documents are MVP or later. The 245 photo count is plausibly an account-wide
media library across many listings rather than a single listing, which would
reconcile it with the 10 per listing cap.

---

## 5. Facts established by the references

Recorded because Master Rule 17 freezes navigation and Rule 27 requires a
centralised design system. These are now specification.

**Personal Mode navigation (12 items, desktop rail):** Home, Hotels, Apartments,
Homes, Restaurants, Experiences, then a divider, then Bookings, Messages, Wallet,
AI Assistant, Profile, Settings. A Become an Agent promo card and a docked AI
assistant sit below the rail.

**Personal Mode mobile tab bar (5 items):** Home, Bookings, Messages, Wallet,
Profile.

**Admin Command Centre navigation (15 items):** Overview, Listing Approvals,
Users, Agents, Hotels, Properties, Restaurants, Bookings, Payments, Support / AI,
Reports and Moderation, Security and Risk, Analytics, Marketing, System Settings.
Note that Support and AI are one destination, and that Marketing appears in no
source document.

**Discovery categories (5):** Hotels, Apartments, Homes, Restaurants, Experiences.
Property types within property search: Apartment, Hotel, Home, Villa, Shortlet.
Map legend uses Apartments, Hotels, Homes, Shortlets, Villas. Experience
sub-categories: Beach Resorts, City Tours, Fine Dining, Adventure, Events.

**Agent application: 6 steps.** Personal Information, Identity Verification,
Business Information, Documents Upload, Bank / Payout Details, Review and Submit.
This supersedes the 9 stage sequence in Master §6. Application reference format
`NF-AGT-78452`. Status shown as Pending Review with a stated 24 to 48 hour
review time.

**List Apartment: 7 steps.** Basic Info, Photos, Location, Amenities, Pricing and
Availability, Preview, Submit. Photos step states up to 10, 10MB per file, PNG
and JPG, with per-thumbnail delete and reorder handles. Preview precedes
submission. Submission confirmation promises review within 24 to 48 hours.

**Pricing model:** Price per Night, Cleaning Fee, Service Fee, Minimum Stay, plus
an availability calendar with Available, Booked and Unavailable states.

**Discovery mechanics:** results count with locations summary, sort chips
(Recommended, Top Rated, Price Low to High, Price High to Low), Map View and List
View toggle, "Search as I move the map", price pin markers, user location,
clustering implied, and **Load more** pagination rather than infinite scroll.

**Trust markers:** Verified Property badge, Verified Agent badge, Instant Book
badge and filter, Featured, Popular and New card badges.

**AI surfaces (3):** docked mini widget in the personal rail, a right-hand
assistant panel marked **Beta**, and a full assistant view. Suggestion chips are
part of the pattern. Reference 04 shows the assistant returning real listing
cards with a count ("Found 18"), which matches the grounding requirement.

**Admin operational widgets:** Approvals Queue with inline approve and reject,
Risk Alerts with High, Medium and Low severity, Top Locations, Revenue Overview,
Bookings Overview, Platform Activity.

**Two SLA promises now appear in the UI:** 24 to 48 hours for agent application
review, and 24 to 48 hours for listing review. These are business commitments
rendered as product copy and need staffing behind them, or the copy should soften.

### Typography constraint discovered

Several mockups render the naira sign as a plain capital N (`N130K`, `N450K`,
`N8,45M`) while others render ₦ correctly. That is the classic missing-glyph
fallback. Design §4 already requires a variable typeface covering English,
Yoruba, Hausa and Igbo. The chosen face must therefore cover **all** of:

- ₦ (U+20A6), or a documented fallback strategy for it.
- Yoruba: ẹ, ọ, ṣ and their capitals (Latin Extended Additional, combining dot
  below), plus tone marks stacking on those same vowels.
- Hausa: ɓ, ɗ, ƙ, ƴ (Latin Extended-B).
- Igbo: ị, ọ, ụ with dot below, plus tone marks.

Combining a dot below with an acute above on one vowel is where most variable
fonts break. Typeface selection must be validated against a real string set for
all four languages plus ₦ before it is locked, not after components are built.

### 3D icon library, reference 05

The single most reusable asset delivered so far, and the answer to Master Rule 28.
Four categories on one sheet. Category labels claim 40, 48, 40 and 40, but each
grid is 6 rows of 8, so the actual count is **48 each, roughly 192 total**. The
labels are wrong, not the grids.

| Category | Contents |
|---|---|
| 01 General and Navigation | Home, Search, Explore, Map, Location, Nearby, Filter, Grid, List, Menu, Back, Forward, Up, Down, Close, Check, More, Options, Settings, Toggle, Refresh, Sort, Minimize, Maximize, Dashboard, Analytics, Insights, Stats, Chart, Pie Chart, Bar Chart, Activity, Profile, User, Users, Add User, ID Card, Verify, Badge, Bookmark, Messages, Chat, Notification, Bell, Mail, Inbox, Send, Help |
| 02 Travel, Stay and Booking | Hotel, Apartment, Villa, House, Shortlet, Resort, Hostel, Room, Bed, Amenities, Booking, Reservations, Check In, Check Out, Guests, Adult, Child, Group, Calendar, Date Range, Today, Schedule, Itinerary, Journey, Flights, Airplane, Airport, Boarding, Luggage, Baggage, Car Rental, Taxi, Bus, Train, Trip, Map Pin, Navigation, Direction, Route, Distance, Compass, Globe, World, Translate, Language, Weather, Sun, Moon |
| 03 Finance, Payment and Wallet | Wallet, My Wallet, Card, Credit Card, Debit Card, Virtual Card, Bank, Bank Transfer, Pay, Send Money, Receive, Top Up, Add Money, Withdraw, Transaction, History, Invoice, Receipt, Bill, Savings, Investment, Profit, Expense, Budget, Income, Salary, Bonus, Cash, Currency, Exchange, Rates, Crypto, Naira, Dollar, Euro, Pound, Yen, Cedi, Payment, Secure, Lock, Unlock, Refund, Chargeback, Pending, Success, Failed, Warning |
| 04 Property, Listing and Services | Add Listing, Properties, My Listings, Featured, Verified, Pending, Approved, Rejected, Edit, Delete, Photos, Gallery, Image, Video, Virtual Tour, 3D View, Floor Plan, Size, Beds, Baths, Kitchen, Parking, WiFi, AC, TV, Security, Elevator, Furnished, Unfurnished, Balcony, Garden, Pool, Restaurant, Bar, Lounge, Spa, Gym, Cleaning, Laundry, Room Service, Support, Live Chat, AI Assistant, Star, Share, Favorite, Report, More |

What the icon set reveals beyond decoration:

- **Currency icons for Naira, Dollar, Euro, Pound, Yen and Cedi.** Cedi is
  Ghanaian. Multi-currency and African expansion are anticipated in the asset
  layer, which supports Master Rule 46.
- **Chargeback and Refund icons** exist, matching the financial rules and
  reinforcing that a real ledger is expected, not a balance field.
- **Status icons Pending, Approved, Rejected, Verified, Featured** align exactly
  with the listing state machine, and give status colour semantics for free.
- Icons exist for **Flights, Airport, Car Rental, Taxi, Bus, Train, Hostel,
  Resort, Room Service, Spa, Laundry, Virtual Tour, 3D View, Floor Plan**. None
  of these are MVP features. They confirm the expansion path in Master Rule 65
  and should not be read as scope.

Delivery question for the owner: this sheet is a raster contact sheet. Production
needs the **source assets**, ideally SVG or Lottie plus a sprite or component
wrapper, at defined sizes. Slicing 192 icons out of a PNG is not acceptable
quality. If only the PNG exists, that is a real production gap to plan for.

### Booking flow and price model, reference 09

The first reference to show the money maths end to end:

- Booking wizard is **4 steps**: Select Property, Choose Dates, Add Guests,
  Confirm Booking.
- Price breakdown: nightly rate x nights, plus Cleaning Fee, plus Service Fee,
  equals Total (NGN). Worked example ₦500,000 + ₦20,000 + ₦15,000 = ₦535,000.
- Guests are modelled by **composition, not just a count**: "2 Adults, 1 Child".
  The icon set carries matching Adult, Child and Group icons.
- "You won't be charged yet" appears before Confirm and Pay, consistent with
  reference 01.
- Payments Overview uses four transaction states: **Successful, Pending, Failed,
  Refunded**.
- Booking states seen on screen: **Confirmed, Pending, Cancelled**.
- Calendar legend distinguishes **Check-in, Check-out and Booked**, which means
  availability is stored per night with edge semantics, not as opaque blocks.

### Other features appearing only in references

Recorded so they are not mistaken for MVP without a decision:

- **Saved Searches and Alerts** with price band, match count and email alert
  toggles, in reference 09. Both source documents list saved-search alerts as a
  future recommendation, yet here it is designed.
- **Boost Listing, Feature Listing, Duplicate Listing, Share Listing** in
  reference 09. Boost and Feature are paid promotion products with no
  specification behind them.
- **Airport Pickup and Car Rentals** as consumer entry points in reference 08.
- **Weekly Deals** promotional surface in reference 08.
- **Room Type and Size in square metres** on the property detail in reference 08.
  Neither field exists in either listing wizard, so an agent cannot currently
  supply them.
- **Host panel** in reference 08: member since date, listing count, rating,
  lifetime bookings, Message Agent. Implies host profile as a public entity.
- **Review rating distribution** across 5 to 1 stars, in references 08 and 09.
- **Platform Health telemetry** in reference 09: API latency, uptime, database
  health, storage used. This is observability surfaced as product UI.
- **System Backup and Export Data** as admin quick actions in reference 09.
- Weather widget in the reference 08 header.

---

## 6. Checklists

- [ ] Requirements, consolidated across all documents; conflicts in §4.
- [ ] Architecture, monorepo, Supabase and NestJS boundary (C-07), adapters.
- [ ] Design system, tokens, materials, typography (see §5 constraint), icons, motion.
- [ ] API and integration, versioned surface, provider adapters, inventory doc.
- [ ] Security, access control, media validation, webhook replay, audit trail.
- [ ] Mobile, Expo and EAS, permissions, deep links, store readiness.
- [ ] Admin, 15 sections, roles, moderation workspace, audit logs.
- [ ] Agent Mode, 6 step application, 10 item IA, 7 step listing wizard.
- [ ] Booking and payment, state machines, idempotency, no double booking.
- [ ] AI, tool layer, grounding, permission enforcement, injection defence, budgets.
- [ ] Localisation, four languages, keys, plurals, locale formatting, currency.
- [ ] Launch, store metadata, legal, data safety, monitoring, rollback.

---

## 7. Open questions for the owner

Ordered by how much they block. The first three gate the Phase 0 audit.

1. **Reference count.** 9 unique are recorded here against an owner count of 13
   with 3 remaining. Which references are considered sent, and is the target 15
   or 16? 6 of the 15 attachments were repeats.
2. **C-10, which navigation is canonical** for admin, and which for consumer?
   Four admin rails and two consumer rails are all currently marked
   source-of-truth. Nothing downstream can be built until one of each wins.
3. **C-11, is NaijaFinds Pro in scope?** It appears in four references and no
   document. Recommendation is to defer it.
4. C-12, which listing wizard is canonical, 7 step or 6 step, and are video,
   virtual tours and documents MVP or later?
5. C-09, who receives the guest-paid service fee, and what is the take rate?
   This interacts with the Pro "zero service fees" promise.
6. C-06, what does Agent Mode look like on a phone after the mode switch?
7. C-05, confirm the canonical location model given that no LGA field is designed.
8. C-03, should the admin review screen gain a Request Changes action?
9. Are the **icon source files** available as vector, or only the contact sheet?
10. Is the Travelgate commercial agreement signed, in progress or not started?
11. Cancellation policy tiers, and the KYC standard for agent payouts.
12. Budget for the paid X API tier, or should Sign in with X be cut?
13. Rename the repository from `read-it-well` to match the product?
14. Confirm the commit identity email. Currently
    `moderator29@users.noreply.github.com`, which always links to the GitHub
    account. A different address can be used on request. The second permitted
    author, `guddsuddi`, has not been used yet.

---

## 8. Requirements still absent from every source

Raised because several need commercial or legal input with long lead times.

**Legal:** NDPA 2023 and NDPR compliance is not mentioned anywhere, including
data controller registration and a designated protection officer. No owner is
named for privacy policy, terms or consent content. Cross-border transfer
position for hosting, media and model vendors is undefined.

**Financial:** no commission or take rate (see C-09). No KYC or AML standard for
agent payouts, though the application collects Bank and Payout Details at step 5.
No chargeback or fraud liability position between platform and agent. No
cancellation and refund policy actually defined, only the requirement to track
one. No dispute resolution workflow, although disputed bookings are an admin
state.

**Product:** review and message moderation is unspecified, though both are higher
volume abuse surfaces than listings. Money representation is never specified and
must be integer minor units (kobo), never floating point. No canonical dataset
chosen for states, LGAs and localities. Push provider undecided. No environment
plan for development, staging and production. No concrete rate limits, AI cost
ceiling per user, or backup targets.

**Platform capability:** alternate app icons (Master §33) are effectively iOS
only; Android has no supported equivalent and the activity-alias technique kills
the running app. Master §33 itself forbids promising unsupported OS capabilities,
so this should ship iOS only with the control hidden on Android. Sign in with X
requires a paid API tier. Travelgate requires a signed agreement before any
credentials exist, which puts it on the launch critical path. Glass and blur
effects versus low-end Android performance needs a concrete device tier
degradation ladder, not just the principle.

---

## 9. What happens next

1. Owner supplies references 05 to 15, each with its authority level. Every
   reference is acknowledged, recorded, and mined for IA, component and state
   facts.
2. At 15/15: full product audit synthesising all documents, all 15 references and
   this file into the Phase 0 documentation set, including `RECOMMENDATIONS.md`,
   `ARCHITECTURE_DECISIONS.md` and `ROADMAP.md`.
3. Phased implementation plan proposed, with the MVP surface recommendation from
   C-08 and the design system and IA frozen first.
4. Owner approves. Only then does implementation begin, on feature branches,
   never on `main`.
