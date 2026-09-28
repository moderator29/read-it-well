# Host onboarding research

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

**Vallo Stays: how Hosts come onto the platform, verified, industry-grade.**

Written 18 September 2026 by a read-only research session. Repo claims carry
file paths and were read in this session; web claims carry a URL and the date
fetched (all 18 September 2026 unless stated). Every cost figure requires
provider confirmation before money is committed. **This document feeds product
design. It is not legal advice**, and nothing in section 2 should be read as a
compliance opinion; where the regulatory picture is contested or unclear, it
says so plainly.

Ground truth read first: `docs/research/TWO_MODE_BACKEND_RESEARCH.md`
(sections 5 and 7), `docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md`
(sections 2.3 to 2.6), `docs/API_INVENTORY.md`,
`docs/archive/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`, and the live agent
verification code under `apps/web/src/lib/trust/verification.ts`,
`apps/web/src/lib/agent/application.ts`,
`apps/web/src/components/verification/kyc.ts` and
`apps/web/src/lib/admin/verification-actions.ts`.

Founder rulings this respects: first-party supply is primary and its operators
are called **Hosts** (working name; property-side listers stay Agents);
third-party rows carry a calm "Third party" label and a minimal flow;
onboarding is industry-grade with CAC and real verification; the verified
badge means a human was checked by Vallo and never appears on a third-party
row (`MARKETPLACE_ARCHITECTURE_RESEARCH.md` section 2.4, `RECOMMENDATIONS.md`
MK-58).

---

## 1. How the industry onboards properties

Short and factual, per platform. Dates are the search date, 18 September 2026.

### 1.1 Booking.com

- **At signup**: property details and contact details, photos inside and out,
  rooms and rates, policies; the operator creates the account first and fills
  the property afterwards. Sources: join FAQ
  (https://join.booking.com/faq.html), Hostaway guide
  (https://www.hostaway.com/blog/how-to-list-on-booking-com-or-step-by-step-guide/).
- **Recommended to have ready before listing**: any local STR permit, tax
  details, insurance, payout account, house rules, high-resolution photos,
  verified ID, safety equipment (https://strassistance.com/how-to-list-your-property-on-booking-com/).
- **Before live versus after**: the listing is reviewed before it becomes
  visible, mostly within a few hours to 48 hours. **Location verification can
  happen after go-live**: Booking.com assigns a method the partner cannot
  choose, either a video reviewed within about two weeks or a posted letter
  with a code that can take up to 35 days
  (https://partner.booking.com/en-us/help/first-steps/online-bookable/verifying-your-property%E2%80%99s-location,
  summarised via search; the partner help domain itself was blocked from this
  session, see honesty log). The pattern to copy: **go live fast on a light
  check, keep verifying afterwards, and gate payouts rather than visibility on
  the slow checks**.
- **What the property sets up**: photos, room types, rates, availability,
  policies, payout details, all in the extranet before or shortly after the
  review.

### 1.2 Expedia (Partner Central)

- **At signup**: property and contact details, first administrator account;
  then identity, ownership or management verification; then business and
  payment settings including tax identification number, business name and
  address, and full bank details (bank name, account number, SWIFT for
  international). Business licence or permits may be requested depending on
  jurisdiction, scanned and uploaded. Sources: Smartness guide
  (https://www.smartness.com/en/blog/expedia-partner-central-guide), Lighthouse
  (https://www.mylighthouse.com/resources/blog/expedia-partner-central),
  onboarding portal (https://onboarding.expediapartnercentral.com/).
- Signup is free; the platform earns commission per stay. The notable
  structural point: **bank details and tax identity are part of onboarding
  itself, not an afterthought**, because payment is the platform's obligation
  to the property.

### 1.3 Airbnb

- **Identity**: as of the 2025 policy wave, hosts and guests verify identity
  with legal name, date of birth, address, a government ID photo and a selfie
  match; a PO box does not qualify as an address
  (https://www.airbnb.com/help/article/1237,
  https://www.alliancevirtualoffices.com/virtual-office-blog/airbnb-2025-verification-professional-address/).
- **No business registration is required** for an individual host; regulatory
  documents are demanded only in cities with STR registration regimes (New
  York, San Francisco and similar)
  (https://www.alliancevirtualoffices.com/virtual-office-blog/airbnb-2025-verification-professional-address/).
- The lesson for Vallo's individual shortlet host: **identity plus payout
  resolution is the industry floor for an individual**; company papers are a
  separate, higher rung.

### 1.4 Hotels.ng (Nigerian player)

- Listing is **free** and deliberately low-friction: an add-hotel form
  (https://hotels.ng/hotel/add) or an email with the hotel's information; the
  operator affirms they "have permission to add the hotel and the information
  is valid", and the Hotels.ng team follows up by contact. No public evidence
  of CAC or licensing checks at listing time was found
  (https://hotels.ng/hotel/add, https://en.wikipedia.org/wiki/Hotels.ng).
- The honest reading: the largest local player onboards on **claimed
  permission plus a human follow-up call**, not on documents. Vallo doing CAC
  and identity properly is a genuine differentiator, and also a friction cost
  Hotels.ng is not paying; the ladder in section 3 is designed so the friction
  is paid after go-live wherever the law of the badge allows.

### 1.5 Restaurants: OpenTable, and Reisty as the African comparator

- **OpenTable** is sold, not self-served: plans at roughly $149 / $299 / $499
  a month plus per-cover fees (figures require provider confirmation), and
  onboarding is a specialist working with the restaurant over several shifts
  to model the floor plan and service before going live
  (https://restaurant.eatapp.co/blog/opentable-pricing,
  https://www.opentable.com/restaurant-solutions/plans/). What the restaurant
  sets up: floor plan or table stock, service periods, party sizes, and
  policies; the platform's inventory is **seatings per service window**, which
  is exactly the `service_windows.covers` model already designed in
  `MARKETPLACE_ARCHITECTURE_RESEARCH.md` section 2.3.
- **Reisty** (Lagos, launched January 2024, self-styled number one restaurant
  reservation platform in Africa) lists Lagos restaurants with menus, reviews
  and instant booking; no public self-serve onboarding flow was found, which
  suggests sales-led onboarding like OpenTable
  (https://www.reisty.com/, https://tribuneonlineng.com/how-reisty-is-redefining-culinary-experience-in-lagos-set-for-intl-expansion-2/).
- The lesson: restaurant onboarding is heavier per venue than hotel
  onboarding relative to inventory size, and the critical setup artefacts are
  **service windows, covers and a price band**, not room photos. Vallo's
  wizard must treat those as the restaurant's "rooms and rates".

### 1.6 The cross-platform pattern, distilled

1. Identity of the human first, papers of the business second.
2. Light review before visibility (hours to two days); slow checks (location,
   licences) continue after go-live.
3. Bank details are structural, collected and validated during onboarding
   because payout is the platform's promise.
4. The property must be **bookable-complete** to publish: photos, at least one
   room or service window, a rate, a policy.
5. Nobody publishes a property with zero human contact; even the lightest
   local player follows up by phone.

---

## 2. Nigerian regulatory reality for Hosts

**Product requirements input, not legal advice.** The regime is layered
(federal, state, local government), enforcement is uneven, and parts are in
active litigation. Vallo should model documents as **facts with dates** (the
`docs/PRODUCT.md` posture already in the codebase) rather than as a compliance
guarantee.

### 2.1 CAC registration

- Companies carry an **RC number**, registered business names a **BN number**;
  incorporated trustees an IT number. All are searchable **free** on the CAC
  public search portal (https://search.cac.gov.ng, described at
  https://www.cac.gov.ng/services/company-search and
  https://www.9jadirectory.org/blog/cac-public-search-verify-company-nigeria),
  which returns registered name, number and registered address.
- **A sole proprietor or an individual letting one shortlet may hold no CAC
  registration at all and is not obviously required to** merely to let a
  furnished apartment; requiring CAC of individuals would exclude a large
  share of real Nigerian shortlet supply. UNVERIFIED as a legal conclusion;
  as a market fact it matches Airbnb's individual-host posture (section 1.3)
  and the platform's own agent flow, which makes business registration a
  branch, not a gate (`apps/web/src/components/verification/kyc.ts`,
  `BUSINESS_SECTIONS` behind the `business-question` step).
- A hotel operated as a company in Lagos is expected to be a registered
  company; one law-firm source states a minimum share capital of NGN
  10,000,000 for a hotel company (https://koriatlaw.com/how-to-register-a-hotel-business-in-lagos/;
  UNVERIFIED against the statute itself, treat as a signal that hotels are
  company-shaped, not as a rule Vallo enforces).

### 2.2 TIN

- Nigeria has harmonised tax identity: **the CAC number serves as the tax ID
  for registered businesses and the NIN serves as it for individuals**, with
  old FIRS/JTB/state TINs unified (FIRS statements reported at
  https://guardian.ng/news/nin-cac-number-to-serve-as-tax-id-firs/ and
  https://guardian.ng/business-services/nin-cac-numbers-to-serve-as-tin-from-2026-says-firs/;
  Africa Check confirms TIN issuance is free,
  https://africacheck.org/fact-checks/meta-programme-fact-checks/dont-pay-nigerias-corporate-affairs-commission-says-getting).
- Product consequence: **Vallo should collect TIN as an optional field and
  never block on it**, exactly as the agent flow already does
  (`kyc.ts` line 193: "If you have one. It is not required to be approved.").
  Under harmonisation the CAC/NIN capture is the tax identity capture.

### 2.3 State hospitality licensing

- **Lagos**: the Hotel Licensing Law (Cap H6, 2003, as amended) empowers the
  state to grant, renew and revoke hotel operating licences, administered
  through the Ministry of Tourism, Arts and Culture; hotels, guest houses and
  similar establishments apply to the ministry
  (https://lawnigeria.com/laws/2019/04/04/hotel-licensing-law-of-lagos-state/,
  https://koriatlaw.com/how-to-set-up-a-hotel-business-in-lagos-state/).
  Lagos also levies a 5% consumption tax on hotel and restaurant services
  (https://lawbreed.blog/complying-with-hotel-occupancy-and-restaurant-consumption-law/).
  Specific licence fee amounts were not found in credible public sources;
  requires confirmation with the ministry.
- **Federal**: the NTDC/NTDA historically registered and graded hotels
  nationally, but the Supreme Court's position that hotel licensing is a
  state matter (reflected in the Lagos litigation,
  https://guardian.ng/features/lagos-assembly-has-powers-to-legislate-on-hotel-licensing/)
  leaves the state as the operative licensor in Lagos. UNVERIFIED in depth;
  the practical point stands either way.
- **NIHOTOUR**: the 2022 Act makes NIHOTOUR the regulator for training,
  certification and registration of hospitality **personnel**; it began
  enforcing registration of hotel staff in 2025, the industry federation
  (FTAN) petitioned against it, and enforcement was **suspended** amid
  dispute over whether NIHOTOUR or NTDA holds the power
  (https://www.thecable.ng/nihotour-begins-enforcement-of-regulatory-compliance-in-hospitality-sector/,
  https://businessday.ng/life-arts/article/sanity-returns-to-hospitality-sector-with-suspension-of-nihotour-registration-enforcement/,
  https://nihotour.gov.ng/registration/). Product consequence: **do not build
  a NIHOTOUR gate**; at most an optional attestation field, clearly optional.
- **Shortlets**: no operative Lagos shortlet registration regime was found in
  force; the 2025 Lagos tenancy bill activity concerns tenancy and agent
  regulation (agents must register under LASRERA, agency fees capped)
  rather than shortlet licensing
  (https://oal.law/lagos-tenancy-bill-2025/,
  https://www.mondaq.com/nigeria/landlord-tenant-leases/1673736/). UNVERIFIED
  that no such regime exists anywhere; treat shortlet licensing as a field
  Vallo can store when a host has one, never a requirement.

### 2.4 Restaurants: food and hygiene

- Lagos restaurants need a **food permit / health permit from the Local
  Government** where they operate, with premises inspection covering
  ventilation, water, sanitation, and **medical certificates of fitness for
  food handlers** (the "food handlers' test": stool, chest and skin checks
  run by approved labs)
  (https://pavestoneslegal.com/doing-business-simplified-regulatory-requirements-for-operating-a-restaurant-in-nigeria/,
  https://www.shqlegal.com/publications/starting-a-restaurant-in-lagos-licenses-permits-and-legal-requirements-for-food-businesses,
  https://medicheckng.com/food-handlers-test/).
- NAFDAC matters for packaged products, not table service; environmental
  health officers (EHORECON framework) run premises enforcement. Enforcement
  is real but rolling and inspection-led, not registration-portal-led.
- Product consequence: a restaurant Host attests to holding a local
  government health permit and current food-handler certification, with an
  optional document upload; Vallo records the attestation with a date and
  never claims to have inspected a kitchen.

### 2.5 Enforceable versus aspirational, the honest summary

| Requirement | Reality | Vallo posture |
| --- | --- | --- |
| CAC (RC/BN) for registered businesses | Real, free to verify publicly | Verify at the business rung; individuals exempt |
| NIN for individuals | Real, universal | Identity rung for every Host representative |
| TIN | Harmonised into CAC/NIN | Optional field, never blocking |
| Lagos hotel licence | Real in law, unevenly enforced | Post-live rung: attestation plus optional document, dated |
| NIHOTOUR personnel registration | Contested, enforcement suspended | No gate; ignore in v1 |
| Shortlet licence | No operative regime found | Store if offered, never require |
| LG health permit + food handler certificates (restaurants) | Real, inspection-led | Attestation rung with date, optional upload |
| Consumption tax (Lagos 5%) | Real, on the operator | Informational copy in the Host console, not a platform obligation |

---

## 3. The Vallo Host onboarding ladder

Grounded in tracks 1 and 2 and mirrored on the shapes already in the code:
the branching wizard model of `components/verification/kyc.ts` (steps as
data, `stepsFor(branch)`, `missingFrom()` printing what is missing), the
uid-prefixed private-bucket document uploads and honest server validation of
`lib/agent/application.ts`, the rung-as-row and trigger-computed tier of
`lib/trust/verification.ts` with `lib/admin/verification-actions.ts` (one
rung, one decision, one row; a failed rung must carry a reason), and the
`businesses` status machine on the reused `listing_status` enum with the
`admin/businesses` QueueFilters queue (`TWO_MODE_BACKEND_RESEARCH.md`
sections 5.5 M2 and 7.1). This is MK-20 (the wizard) and MK-25 (business
verification rungs without diluting the human badge) made concrete.

### 3.1 Three Host shapes, one wizard with branches

Exactly as the agent KYC flow branches on "do you run a property business?",
the Host wizard branches on **host type**, asked once, early:

1. **Individual shortlet host.** A person letting one or more furnished
   units. NIN-level identity, no CAC required, bank account in their own
   name. The Airbnb-floor case (section 1.3).
2. **Registered business.** Hotel, serviced apartments, guest house, resort,
   or a shortlet management company. Adds CAC (RC or BN), the
   representative's identity, and proof the representative speaks for the
   business.
3. **Restaurant.** A registered business (or, realistically, sometimes an
   unregistered one; allow the individual branch with a stronger nudge
   toward registration) that additionally sets up service windows, covers, a
   price band, and the hygiene attestation.

### 3.2 The wizard steps, in order

Modelled as data in a `lib/host/onboarding.ts` twin of `kyc.ts`; step count
honest and branch-dependent; drafts kept locally so nothing typed is lost
(the `application.ts` doctrine). One `businesses` row is created as `DRAFT`
at step 2 and everything after writes onto it under owner RLS.

1. **Host type and business kind.** The branch question plus
   `business_kind` (hotel, serviced_apartments, guest_house, resort,
   shortlet_operator, restaurant). Decides everything after; nothing else.
2. **The business, named and placed.** Name, description, state, city, area,
   street address, phone, email. Grouped in three headed sections (identity,
   contact, address) per the `BUSINESS_SECTIONS` argument in `kyc.ts`: three
   small tasks, not a stack of boxes. Writes the `businesses` row.
3. **Registration papers** (business branch only). Registered name as CAC
   holds it, RC or BN number, TIN (optional, "if you have one"), certificate
   upload to a private `host-documents` bucket under `<uid>/<batch>/...`
   with server-side path-prefix checks, exactly the `agent-documents`
   discipline (`lib/agent/application.ts` header comment).
4. **You, the representative.** Government ID upload (NIN slip or card,
   passport, driver's licence, PVC, the `DOCUMENT_SPECS.identity` list),
   full name and phone. Business branch adds **proof of association**: the
   representative is named on the CAC record (checked at review against the
   directors returned by a business lookup, section 3.5), or uploads a
   letter of authorisation on letterhead, or an employment ID. Individual
   branch: this step is just the ID.
5. **The property** (accommodation branches). Creates the `accommodations`
   row: name, star rating if claimed, check-in and check-out times, house
   rules, photos (position 0 cover, bucket size limits per M3), amenities,
   and the **map pin, required before publish** (MK-55).
6. **Rooms and rates** (accommodation branches). At least one `room_types`
   row (name, sleeps, units_total, base rate in kobo), at least one
   `rate_plans` row with a `cancellation_policy_id` and `meal_plan`. The
   publish gate demands one bookable room with a rate and a policy, mirroring
   section 1.6 point 4.
7. **Service and seating** (restaurant branch, replacing 5 and 6's room
   half). `restaurant_profiles` (cuisines, price_band 1 to 4, parking,
   power_backup, outdoor) and at least one `service_windows` row (weekday,
   opens, closes, last seating, covers). The admin restaurant rule already
   stands: approvable only with at least one window and a price band
   (`TWO_MODE_BACKEND_RESEARCH.md` section 7.3). Adds the **hygiene
   attestation**: "this venue holds a current Local Government health permit
   and its food handlers hold current medical certificates", dated, with
   optional document upload.
8. **Getting paid.** Bank account, **resolve-before-save structural**: bank
   code plus ten-digit account number resolved through Paystack
   `resolveAccountNumber`, and the resolved name (never the typed name)
   stored NOT NULL in the user-scoped `bank_accounts` table of
   `TWO_MODE_BACKEND_RESEARCH.md` section 6.3 / M12. The wizard shows the
   resolved name and asks "is this you / your business?". A mismatch between
   resolved name and the identity or CAC name does not block submission; it
   flags the review (section 3.4).
9. **Permissions.** Three separate consents on the `CONSENTS` pattern
   (accuracy of documents, terms, NDPA-specific processing consent for
   identity and fraud checks); never one bundled tick (`kyc.ts` lines
   230 to 258).
10. **Check and send.** `missingFrom()` prints exactly what is absent;
    submission flips `businesses.status` DRAFT to SUBMITTED and the row
    enters the admin queue.

### 3.3 What blocks go-live versus post-live rungs

**Blocking (no PUBLISHED without them):**

- Representative identity document on file (not yet verified, just present).
- The `businesses` row complete: name, kind, address, contact.
- CAC number **entered** for the business branch (verification itself is a
  rung, not a gate; the number's format is validated at entry).
- One bookable unit: a room type with a rate and a policy, or a service
  window with covers and a price band.
- Photos (at least a cover) and the map pin (MK-55).
- Bank account resolved (the payout promise is structural, section 1.6).
- The three consents.
- Admin approval: a human moves SUBMITTED to APPROVED, then the property-level
  publish gate to PUBLISHED (the two-queue shape of
  `TWO_MODE_BACKEND_RESEARCH.md` sections 7.1 and 7.2).

**Post-live rungs (the Booking.com lesson: verify after visibility, gate the
badge and payouts, not the shelf):**

- Identity **verified** (rung 1 below), CAC **verified** (rung 2), payout
  name match (rung 3), licence attestations (hotel licence, hygiene), and
  the in-person or video check (rung 4). TIN, website, and NIHOTOUR-related
  anything: never rungs, only fields.

### 3.4 What admin reviews in the businesses queue

The `admin/businesses` QueueFilters page (backend research 7.1) shows, per
SUBMITTED row: the business fields, the uploaded documents (private bucket,
reviewer-only read, the `admin/kyc` pattern in
`apps/web/src/lib/admin/kyc-queries.ts`), the CAC lookup result beside the
typed number and name (section 3.5), the resolved bank name beside the
identity and business names, and any mismatch flags. Actions are the existing
machine: approve, request more info (MORE_INFO_REQUIRED must carry the
reviewer's words; the `KycStatus` rejection pattern with a reason is already
the house's best failure state, `docs/FRONTEND_REVAMP.md` entry 39), reject
with reason. Restaurant chip on the same queue, not a separate page.
Verification rungs are recorded exactly as agents' are: one rung, one
decision, one row, tier recomputed by trigger, failed rungs demand a note
(`lib/admin/verification-actions.ts`).

### 3.5 Verifying CAC numbers, honestly costed

Three lanes, shipped in this order:

1. **v1: manual admin review against the free CAC public search.** The
   reviewer opens https://search.cac.gov.ng, searches the RC/BN number, and
   compares registered name and address against the application; the check
   is recorded as the CAC rung with a date and the reviewer's identity, like
   every other rung. Free, human, and exactly the platform's existing
   posture (dates, not ticks). Sources:
   https://www.cac.gov.ng/services/company-search,
   https://www.9jadirectory.org/blog/cac-public-search-verify-company-nigeria.
2. **v2: a business-lookup API behind the planned `IdentityProvider`
   interface** (`docs/API_INVENTORY.md` section 6). Dojah offers a CAC
   lookup endpoint (https://docs.dojah.io/docs/nigeria/lookup-cac) with
   pay-per-call pricing for low volume; exact per-call price not publicly
   found and dojah.io was egress-blocked from this session; **requires
   provider confirmation**. Smile ID's Business Verification for Nigeria
   returns company information, directors, beneficial owners
   (https://docs.usesmileid.com/supported-id-types/for-businesses-kyb/supported-countries/nigeria/business-registration);
   third-party summaries put document-class checks around USD 0.10 to 0.30
   per check (https://usesmileid.com/pricing/ via search); **requires
   provider confirmation**. The directors list is what upgrades proof of
   association from a letter to a record match.
3. **Never**: scraping the CAC portal programmatically. The house law is no
   scraping (`docs/API_INVENTORY.md` section 6); the portal is for human
   reviewers until a contracted API exists.

NIN-level identity for individuals follows the same shape: manual document
review in v1 (the agent KYC queue already does this), Dojah/Smile ID NIN
lookup behind `IdentityProvider` when contracted (both sandboxes are already
planned next-wave items, `docs/API_INVENTORY.md` section 4; Dojah sandbox
free, production requires quotes; **requires provider confirmation**).

### 3.6 The Host verification ladder shown to guests

Mirror the four-rung agent ladder as data in a `lib/trust/` twin, rungs in
the order a real Host passes them, tier computed as rungs passed with no gap
below (the `private.agent_tier` law):

| Step | Rung | Guest-facing meaning |
| --- | --- | --- |
| 1 | `identity` | A real person with government ID stands behind this business, and we have seen it |
| 2 | `registration` | The business is registered with the CAC and the record matches what they told us (individual hosts: their address confirmed instead, so the ladder has no hole) |
| 3 | `payout` | Money flows to an account in the business's or host's own name, resolved through the payment processor |
| 4 | `on_site` | Somebody from Vallo has stood in this property or seen it live on video |

Tier names on the `TIER_NAME` pattern; tier 0 is "Approved", never
"unverified", because a human read the application. The **Verified badge**
on a stay means what it means on a listing today: a named rung ladder with
dates, not a boolean tick (`docs/archive/audit-2026-09-15/PRODUCT_UX_GROWTH.md`
A1-032's argument applies from day one here). Licence and hygiene
attestations render as dated facts on the detail page ("Health permit
attested, June 2026"), never as rungs and never as the badge.

**The house law, restated as schema**: the badge derivation may only ever
light for `businesses.source = 'first_party'` rows with a verified human
behind them; partner rows structurally cannot carry it (CHECK that partner
rows carry no `agent_id`/owner, MK-58, `MARKETPLACE_ARCHITECTURE_RESEARCH.md`
section 2.4). A third-party row can therefore never render "Verified", in
any surface, ever.

---

## 4. The two booking flows, specified

### 4.1 What LiteAPI's flow actually is (from public docs, not sandbox)

No sandbox was available to this session and docs.liteapi.travel was
egress-blocked; the following comes from search summaries of the official
docs and is marked where unverified.

- **Flow**: search, then **prebook** (locks a rate, returns `prebookId` and
  `transactionId`), then **book** with guest details (first name, last name,
  email) and the payment token (https://docs.liteapi.travel/reference/overview
  via search).
- **Payment**: with `usePaymentSdk: true` the guest pays through Nuitée's
  payment SDK on the partner's page; the book call then references the
  transaction. Money is taken by Nuitée, not by the partner
  (https://docs.liteapi.travel/docs/user-payment via search).
- **Whitelabel**: a hosted booking site under the partner's brand on a
  LiteAPI subdomain or the partner's own subdomain (e.g.
  `book.vallo.example`), configured with logo, colours and contact info;
  deeplinking from the partner's own pages into the whitelabel checkout is a
  documented pattern (https://docs.liteapi.travel/docs/whitelabel-booking-site,
  https://docs.liteapi.travel/docs/deeplinking-to-whitelabel via search).
- **Support and confirmation**: **by default Nuitée provides guest support
  post-booking**; the partner can substitute its own contact details in the
  dashboard. Whose name appears on the confirmation email was NOT verifiable
  from search summaries: UNVERIFIED, record on the day sandbox keys land.
- **Commission**: the partner sets a markup/commission on rates; payouts
  weekly (Mondays) for checked-in bookings
  (https://docs.liteapi.travel/docs/revenue-management-and-commission via
  search); **requires provider confirmation**.

### 4.2 What Booking.com Demand permits

- Demand API access requires **Managed Affiliate Partner status, a signed
  contract and an account manager**; it is not self-serve
  (https://developers.booking.com/demand,
  https://vorplabs.com/agent-tools/booking-demand-api).
- Baseline approval covers **search and display**; taking the booking on
  your own site through the Orders endpoints needs separate "Search, Look &
  Book" approval with a business case
  (https://developers.booking.com/demand/docs/getting-started/try-out-the-api
  via search). The realistic v1 posture for Vallo is therefore **display
  plus handoff to Booking.com to complete**, upgrading only if the deeper
  permission is contracted.

### 4.3 The FIRST-PARTY full flow (Vallo fulfils)

The multi-step flow, riding the existing money and messaging spines:

1. **Dates, guests, room.** On `/stay/[id]`: gallery, room types as rows,
   rate-plan sheet with `meal_plan` and the cancellation policy's
   plain-words `summary`, total as the headline (MK-44, MK-46). Availability
   read from `room_inventory`.
2. **Guest details.** Name, phone (the shared `lib/phone.ts` rule), notes.
3. **Pay.** Wallet (`private.pay_booking_from_wallet`) or saved card
   (`payment_methods`, M12, hosted-checkout fallback on 3DS, never a silent
   retry) or fresh Paystack checkout. Inventory held through
   `private.reserve_room_nights`, the two-tap oversell probe already the
   definition of done (M5). **Money honesty moment: the pay sheet says
   "Paid to Vallo; released to [Host business name] after check-in", or
   whatever settlement wording matches the escrow posture; the fulfiller
   (the Host's business name) is on the sheet.**
4. **Confirmation.** Reference, dates, policy restated, receipt (MK-19).
5. **The booking timeline in messages.** A `context_kind = 'booking'` thread
   with `booking_state_events` interleaved as steps (M10, Phase C10);
   cancellation priced by `cancellation_policies.rules`, refund to wallet.

Who fulfils is never in doubt: the Host's name is on the stay page, the pay
sheet and the confirmation, and support is Vallo's own support surface.

### 4.4 The THIRD-PARTY minimal flow (partner fulfils; deferred lane)

Specified now so the seam is designed; ships only when the partner lane
returns on the founder's word (`HANDOFF_05` section 5, deferred wholesale).

1. **The row.** Renders beside first-party rows with the small calm
   **"Third party"** label (the vault's source-label component,
   MK-33 to MK-42 family). Never the Verified badge, structurally
   (section 3.6). No Vallo messaging thread can anchor to it
   (`MARKETPLACE_ARCHITECTURE_RESEARCH.md` 2.4).
2. **The detail sheet.** Live price revalidated at open (the
   `partner_stay_intents` quoted-versus-revalidated pattern), what the rate
   includes (meal plan, cancellation terms as the partner states them), and
   the first honesty moment, on the sheet itself: **"This stay is provided
   and fulfilled by a Vallo travel partner. Payment and support are handled
   by the partner."**
3. **One continue action.** A single button into the LiteAPI whitelabel
   checkout (deeplink, Vallo-branded domain) or, for Booking.com Demand at
   baseline permission, an honest handoff to Booking.com. Second honesty
   moment, on the button or immediately after it: **"You are completing
   this booking with [partner]. Your money goes to them, not to your Vallo
   wallet."** The wallet and saved cards never appear in this flow.
4. **Afterwards.** The intent row records who, when, provider, quoted and
   revalidated rate, and destination host (append-only); commission is
   recorded as `revenue_source = 'referral_commission'` when the widener's
   enum addition lands. Confirmation and support are the partner's; Vallo's
   trips surface may show the intent as "booked with partner" with the
   partner's support contact, and must not fake a Vallo booking row.

**Could not be verified from any sandbox** (no keys exist;
`API_INVENTORY.md` section 7): whose name is on the LiteAPI confirmation
email, the exact whitelabel checkout steps and fields, Nigerian inventory
depth (the number one risk, `API_INVENTORY.md` section 8), and refund
mechanics on partner cancellations. All four go in the day-one checklist
when keys land.

---

## 5. The filter set, reconciled

The founder's list mapped to the planned schema
(`MARKETPLACE_ARCHITECTURE_RESEARCH.md` 2.3 and 2.5; amenities ground truth
`supabase/migrations/20260728152229_listings_core.sql`, which seeds `wifi`,
`ac`, `parking`, `generator` among its codes).

| Filter | Schema home | Status |
| --- | --- | --- |
| Price | `rate_plans.rate_minor` / `rate_calendar`; shelf-level `catalogue_entries.headline_price_minor` | Ready |
| Rating | Nowhere queryable at shelf level: reviews exist per booking (MK-59) but `catalogue_entries` carries no rating column | **Gap.** Additive fix: `rating_avg numeric` and `rating_count int` on `catalogue_entries`, maintained by the review triggers |
| Location | `state_code`, `city`, `area`, `location geography` + PostGIS on `catalogue_entries` | Ready |
| Room type | `room_types.name` is free text ("Deluxe Double"); no category to filter on | **Gap.** Additive fix: `room_types.category` enum (`single, double, twin, suite, family, dorm`) alongside the free-text name; filter joins accommodation to its room types |
| Facilities | `accommodation_amenities` join reusing `public.amenities` | Ready |
| Breakfast included | `rate_plans.meal_plan <> 'room_only'` | Ready at detail level. **Shelf gap**: filtering the merged shelf needs a denormalised `has_breakfast boolean` on `catalogue_entries`, trigger-maintained from the rate plans |
| Air conditioning | Amenity code `ac` (seeded, listings_core.sql line 84) via `accommodation_amenities` | Ready |
| Parking | Amenity code `parking` (line 87); restaurants: `restaurant_profiles.parking` | Ready |
| Wi-Fi | Amenity code `wifi` (line 83) | Ready |
| Verified property | `catalogue_entries.verified`, derived only for first-party rows with a verified human (section 3.6, MK-58) | Ready, and structurally first-party-only |
| Free cancellation | `cancellation_policies.rules jsonb` holds tiers; jsonb is not a filter | **Gap.** Additive fix: `cancellation_policies.is_free_until_hours int null` (null means never free) as a scalar the query can read, plus a `has_free_cancellation` shelf flag on `catalogue_entries` |
| Distance from landmark | `landmarks` (M8, curated seed) + PostGIS `ST_DWithin` against `catalogue_entries.location` | Ready |

Every fix above is additive, which is the platform's cheapest migration
class (`TWO_MODE_BACKEND_RESEARCH.md` 5.3); none touches an existing column.
The three shelf flags (`rating_avg`/`rating_count`, `has_breakfast`,
`has_free_cancellation`) all live on the rebuildable `catalogue_entries`
projection, so a wrong backfill is a rebuild, not a repair.

---

## Honesty log

- **Egress-blocked hosts** (recorded, not guessed around): `dojah.io`,
  `docs.liteapi.travel`, `partner.booking.com`. Claims about those providers
  rest on search-result summaries of the named pages, marked "via search"
  inline.
- **UNVERIFIED**: whose name appears on a LiteAPI whitelabel confirmation
  email and its exact checkout steps (no sandbox keys exist); Nigerian
  partner inventory depth; the NGN 10,000,000 hotel share-capital figure
  (single law-firm source, statute not read); the precise current division
  of hotel licensing power between NTDA and the states; that no shortlet
  licensing regime exists in any Nigerian state; the legal position that an
  individual shortlet host requires no CAC registration (market practice
  supports it, no statute was read); Booking.com's commission rate (omitted
  rather than guessed); Reisty's onboarding process (nothing public found);
  OpenTable onboarding duration beyond "several shifts with a specialist".
- **Requires provider confirmation** (every cost figure in this file):
  Dojah CAC/NIN lookup per-call pricing; Smile ID business-verification and
  KYC pricing (USD 0.10 to 0.30 and USD 0.50 to 2.00 ranges are third-party
  summaries); OpenTable plan prices ($149/$299/$499 plus cover fees);
  LiteAPI commission and payout mechanics; Lagos hotel licence fees (no
  credible public figure found at all).
- **Not legal advice**: section 2 is a product-requirements reading of a
  layered, partly contested regulatory landscape; a Nigerian lawyer should
  review the Host terms and the attestation wording before launch.
- **Nothing was run against the database** and no file other than this one
  was written; all repo claims come from files read in this session at the
  paths cited.
