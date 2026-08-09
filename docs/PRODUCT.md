# RentMe

Read this first. It says what the product is, who it is for, what a listing is,
who can do what, and which words we use. Everything else in `docs/` is detail
underneath it.

Three things are the source of truth, in this order: the **code**, the
**database**, and **this document**. Where a fourth document disagrees with any
of them, the fourth document is wrong. Where this document describes something
the code does not do yet, it is marked NOT BUILT and the work is in
`RECOMMENDATIONS.md`.

Last verified against the code and the live Supabase project
`uccixoonmbhrnyczyigt` on 2026-08-09.

---

## 1. What RentMe is

**A Nigeria first property marketplace for renting, buying and selling, with a
social layer, a naira wallet, escrow and a verification ladder.**

Everything on the platform was listed on the platform by a real person who
applied, was verified and was approved. There is no third-party inventory, no
Google Places feed, no hotel rate aggregator and no scraped stock. That is not a
gap, it is the whole argument: it is the only reason the verified badge, escrow
and an inspection can mean anything.

**This is now true of the database as well as the code.** `places_cache` and its
243 rows of cached Google payloads are dropped, `partner_stay_intents` is
dropped, the `hybrid_hotels` and `hybrid_restaurants` flags are deleted, and
6,043 lines of provider code are gone.

The product was NaijaFinds, a discovery, stay, food and experience platform. It
is RentMe. The parts of NaijaFinds that survive do so because a Nigerian looking
for a place to live also eats, travels and stays, and because a hotelier or a
restaurateur listing their own venue is a supplier like any other. What does not
survive is anybody else's inventory.

## 2. What it offers

| Market | What happens | Money |
|---|---|---|
| **Rent** | Annual tenancy. Message the agent, inspect the property, then pay. **No Reserve button, ever.** | `rent_amount_minor` per `rent_period`, plus the full move-in breakdown |
| **Buy and sell** | A property offered for sale, enquiry and inspection, then a transaction. **SCHEMA BUILT, UI NOT BUILT.** `listings` now carries `listing_intent`, `sale_price_minor`, `tenure`, `sale_status`, `year_built` and `size_sqm`. No screen renders any of it and there is no Buy in the navigation | `sale_price_minor`, with `price_negotiable` |
| **Stay** | Nightly lodging: hotel, apartment, shortlet, villa, home. Reserve, hold, pay | `rate_minor` per `rate_period` |
| **Eat** | A restaurant lists itself. A guest requests a table, the venue accepts or declines | Per head. No deposit, by design |
| **Around** | The social layer. Places, posts, stories, people, the assistant answering in comments | Free |
| **Wallet** | A naira wallet. Fund, withdraw, transfer, pay for a stay | Integer kobo, append-only ledger |

## 3. The fee position

**The platform charges nothing today, and the engine that will one day charge
something is being built now and set to zero.**

That is the owner's decision and it is deliberate. A fee engine bolted on later
prices transactions it cannot explain and cannot reverse correctly. A fee engine
built early, exercised at zero, and switched on once there is a user base is
boring on the day it matters.

**What is true today.**
- `ledger_entries` enforces `gross_minor = platform_fee_minor + agent_share_minor
  + processor_fee_minor` as a check constraint. `platform_fee_minor` is always
  zero.
- Copy must never mention a platform fee as a thing that is charged. If a payment
  processor takes something, it is labelled as the processor's.

**The rules for when a rate becomes non-zero**, which are policy and not
implementation detail:
- Rates live in a table with effective dates, never in code. Every transaction
  records which schedule priced it.
- A fee is shown before the action that incurs it, on the same screen, at the
  same visual weight as the amount, with the rate and the base beside it.
- The platform's fee and the processor's fee are never bundled.
- Thirty days' notice, by email and in product, before any rate rises above zero.
- Listings and bookings created under one rate complete under that rate.
- Show "Platform fee: 0 naira" from today rather than hiding the row, so the line
  is familiar long before it has a number in it.
- Never charge a member to look, save, message or enquire. Fees attach to
  transactions and to supply-side services.

Full design in `RECOMMENDATIONS.md` section 8.

## 4. Role architecture and the access rule

Four roles, in `public.app_role`: `user`, `agent`, `admin`, `super_admin`. A
person can hold more than one. Roles are read through helpers in a private,
non-exposed schema, never from a client.

**The access rule: view only, then gate. This is now built.**

A signed-out visitor can browse the product and cannot act in it. That line is
drawn in two places and they have to agree:

- `apps/web/src/middleware.ts` decides whole routes. **Open to anybody:**
  `search`, `listing`, `rent`, `around`, `u`, `post`, the marketing site, the
  public `/privacy` and `/terms`, and `/agents` as the supplier pitch. **Behind a
  session:** `assistant`, `bookings`, `checkout`, `home`, `legal`, `messages`,
  `notifications`, `profile`, `saved`, `settings`, `stories`, `wallet`,
  `welcome`, plus `admin` and `agent` which carry their own role checks, plus
  the exact paths `/agents/apply`, `/agents/status` and `/styleguide`.
- `components/auth/AuthGate.tsx` decides individual controls on a page a stranger
  is allowed to read. Saving, messaging, requesting an inspection, paying and
  listing all raise sign up or sign in.

Two deliberate exceptions to "browsing is open", both correct: **stories** are
gated because a story view is a write that counts viewers, and **`/legal/*`** is
gated because it is only the in-product copy of documents whose canonical
versions at `/privacy` and `/terms` are open.

Nothing yet asserts that the two layers agree. See RECOMMENDATIONS T-9.

**The roles.**

- **Visitor, signed out.** Reads the catalogue, a listing, a place and a public
  profile. Any action needing an account raises sign up or sign in.
- **Member (`user`).** Books, pays, saves, messages, posts, reviews, earns member
  badges. Created by the signup trigger. **Never asked to verify their
  identity.** A person looking for somewhere to live does not upload a passport
  to browse, save, message or pay.
- **Agent.** Applies through `/agents/apply`, uploads identity documents to a
  private bucket, is approved by an admin, then lists property, answers bookings,
  replies to reviews and is paid to a verified NUBAN account. Climbs the
  verification ladder in `public.agent_verification_checks`. **Verification is
  for this role and for sellers, and for nobody else.**
- **Admin and super admin.** The console at `/admin`, 14 destinations. Approves
  agents and listings, works the safety queues, grants and revokes standing,
  stops and unstops agents, flips kill switches. Every privileged action writes
  an append-only `audit_log` row. The first admin arrives through
  `public.admin_bootstrap`, an allow-list the signup trigger consults. No
  signed-in user can promote themselves.

## 5. The listing model

`public.listings` carries **60 columns**. This is the centre of the product and
it changed substantially on 2026-08-09.

### What a listing is for

`listing_intent` is an enum of **two** values, `rent` and `sale`. Nightly stays
are expressed as `rent` with a `rate_period` of `night`, and a restaurant table
as `rent` with a `rate_period` of `guest`. **This is a known rough edge**: the
column that exists to answer "what is this listing for" cannot distinguish four
markets with two values, and the answer is currently re-derived from
`property_type` and `rate_period` in several places. See RECOMMENDATIONS P-7.

### What kind of property it is

`public.property_type` is the database enum and it is the authority. Ten values:

| Value | Market |
|---|---|
| `rental` | Annual tenancy |
| `shop`, `office`, `land` | Commercial and land, let on a tenancy or sold |
| `apartment`, `hotel`, `home`, `villa`, `shortlet` | Stay, or sale |
| `restaurant` | Eat |

`ListingKind` in `apps/web/src/lib/listings/types.ts` carries one extra value,
`experience`, which the database does not have. **The TypeScript union is
wrong.** See RECOMMENDATIONS P-4.

### What it costs

**To rent.** `rent_amount_minor` per `rent_period` (`month`, `quarter`, `year`),
`rent_negotiable`, and then the part that matters most in this market: the real
cost of moving in. `caution_deposit_minor`, `service_charge_minor` per
`service_charge_period`, `agency_fee_minor`, `legal_fee_minor`,
`agreement_fee_minor`, and `total_move_in_cost_minor` as a first-class indexed
column. Also `minimum_tenancy_months` and `available_from`.

**The product rule: the card leads with the total move-in cost and the rent is
the secondary line.** Every competitor leads with the rent and buries the fees.
Leading with the truth is the differentiator and it costs nothing to build.

**To buy.** `sale_price_minor`, `price_negotiable`, `sale_status`
(`available`, `under_offer`, `sold`).

**Per night or per head.** `rate_minor` and `rate_period` (`night`, `guest`).
This column was `price_per_night_minor` and was renamed because it had been
holding annual rent since the rental pricing migration reinterpreted it. The
hotel-shaped columns are gone: no `max_guests`, `beds`, `min_stay_nights`,
`instant_book`, `cleaning_fee_minor` or `service_fee_minor`.

### What it actually is

`tenure` is a closed enum of Nigerian titles: `certificate_of_occupancy`,
`governors_consent`, `deed_of_assignment`, `gazette`, `freehold`, `leasehold`.
**It records what the seller claims. Nothing yet records whether anybody
looked.** Do not render it as though it were verified.

`size_sqm`, `bedrooms`, `bathrooms`, `toilets` counted separately as this market
counts them, `parking_spaces`, `floor`, `total_floors`, `year_built`,
`condition` (`newly_built`, `renovated`, `old`, `off_plan`), `furnished`
(`unfurnished`, `semi_furnished`, `fully_furnished`).

Every listing also answers the two questions a Nigerian asks first, as structured
columns rather than a tick box: `power_grid` (Band A through none),
`power_backup`, `power_backup_hours`, `water_supply`, `prepaid_meter`, and
`has_estate_access` for the gate.

### Where it is

`latitude` and `longitude`, both nullable, plus `location`, a PostGIS
`geography` column maintained by trigger from those two, with a partial GiST
index. `public.listings_in_bounds()` answers a viewport query in Postgres and is
deliberately not `SECURITY DEFINER`, so RLS decides visibility.

**Nothing in the application calls it yet.** The map reads the whole catalogue
and places pins on area centroids. A listing with no pin has no geography and is
invisible to every viewport query, so the pin must become mandatory before the
catalogue fills. See RECOMMENDATIONS M-3 and M-4.

### Its state and its media

`public.listing_status`: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`,
`MORE_INFO_REQUIRED`, `APPROVED`, `PUBLISHED`, `REJECTED`, `SUSPENDED`. Search
reads `PUBLISHED` only. Admin approval is mandatory and is the quality gate.

`listing_photos` is live. `public.listing_videos` exists, holds zero rows, and
**nothing in the application writes to it**: no bucket, no upload control, no
player. When it is built, video is capped at **50 MB per upload and enforced
server side**, on the bucket, because a limit enforced only in the browser is not
a limit. No storage bucket currently carries any size limit at all. See
RECOMMENDATIONS section 12.

## 6. Trust

Five things carry the trust and they are separate on purpose. **They must never
collapse into one tick.**

1. **The verified badge** means an admin approved the listing and the agent is
   verified. Both, and nothing else.
2. **`address_verified_at`, `physically_inspected_at`, `verified_by`** are
   timestamps, not flags. Render them as dates. "Inspected 12 July 2026" is a
   fact a reader can weigh; a tick is a promise the platform has to keep. A null
   is not a negative and must not look like one.
3. **The verification ladder** is about the agent, not the listing. Rungs are
   recorded in `agent_verification_checks`; `agents.verification_tier` is the
   count of rungs passed with no gap below.
4. **Badges** are earned standing, 15 defined in `public.badges`, split into an
   AGENT ladder and a MEMBER ladder, awarded nightly by `private.sweep_badges`
   and grantable by an admin with a mandatory reason and an audit row.
5. **Escrow** is the promise that money is held until the thing happens.
   **BEING BUILT, and not usable.** As of 2026-08-09 the ledger has learned the
   vocabulary: `public.wallet_entry_kind` now carries `escrow_hold`,
   `escrow_release` and `escrow_refund`, so a hold is a movement in the one
   ledger rather than a shadow balance in a second table. **Nothing else exists**:
   no escrow table, no state machine, no release condition, no dispute path, no
   UI. `booking_status` is still `PENDING, CONFIRMED, CANCELLED` with no
   `COMPLETED`, so the platform cannot yet record that a stay happened, which is
   the condition escrow would release on.

   It is also, correctly, **not promised anywhere in user-facing copy**:
   `app/(site)/safety/page.tsx` says in a comment that the page makes "no promise
   of an escrow that is not built", and it keeps that promise. Grep the four
   locale files for escrow: zero hits. **That refusal must survive the build as
   well as the marketing pass.** Escrow may not be mentioned to a user until the
   money can actually be held, released and disputed. See RECOMMENDATIONS
   section 7.

**The badge is earned and is never for sale.** A paid inspection is a service
with a real cost and may be charged for; the badge that results depends on the
inspection's outcome and not on the payment. The moment a badge can be bought,
every badge on the platform is worth nothing.

The standing safety rule, stated on `/rent`, on every rental detail and in first
message education: keep every chat and payment inside RentMe, deals made outside
are not protected by us, pay only after you have inspected the property. A
database trigger flags ten digit account numbers and payment keywords in
messages, listing text, reviews and posts into an admin queue.

## 7. Terminology

Use these words. Do not invent synonyms.

| Word | Means | Not |
|---|---|---|
| **Listing** | One property, venue or place offered by one agent | Property, unit, item |
| **Agent** | A verified supplier who lists | Host, landlord, vendor, seller |
| **Member** | A signed-in person who is not an agent | User, customer, guest, unless they are actually staying |
| **Guest** | A member who has booked a stay | |
| **Stay** | A nightly booking | Trip, reservation, unless it is a restaurant table |
| **Reservation** | A restaurant table request | |
| **Around** | The social layer | Feed, community, compound. A compound is a different thing in Nigerian property |
| **Place** | A named area inside Around, backed by a local government | Hub, district, neighbourhood |
| **Post** | Anything somebody writes in Around | Gist, talk, echo. The lexicon was tested and cut |
| **Story** | A picture post that expires | |
| **Standing** | Badges and trust, as a whole | Reputation, score, karma |
| **Stop** | An admin suspending an agent's ability to trade | Ban, block. Block is a member muting another member |
| **The console** | `/admin` | Dashboard, backend, admin panel |
| **Workspace** | `/agent/*` | Portal, host dashboard |

**Banned in UI copy, enforced by five specs:** `demo`, `sample`, `preview`,
`not live`, `coming soon`, `lorem`. The ban exists because this repository once
shipped twenty-three invented places, twenty-two of them carrying
`verified: true` with fabricated ratings on addresses that do not exist. Any
example content must say what it is in plain words and must never carry a trust
signal.

Money is always **integer kobo**, a bigint, and only `formatMoney` from
`@naijafinds/i18n` turns it into naira on screen. Never float money. Never
divide by 100 by hand. Percentages are integer basis points for the same reason.

British spelling in documentation and product copy. **Zero em dashes anywhere.**

## 8. Language and theme

Four locales ship: English, Yorùbá, Hausa and Igbo. `en` is the typed source of
truth; the other three are complete and awaiting native review. `Accept-Language`
is negotiated, plurals go through `Intl.PluralRules`.

**Dark is the default and the operating system does not override it.** Only an
explicit stored choice moves the theme. Light mode is a designed paper twin:
flat neutral canvas, white cards, neutral hairlines, brand blue only on active,
focus and calls to action. Both are real themes and both must be verified.

The brand is one blue family. Deep navy-black, dark neon blue, electric blue
glow. Anchors: base `#010118`, glow `#0C39EF`, mid `#000F98`. **No orange, amber,
gold, purple or magenta.** The only two hues outside the family are emerald for
success and rose for error; the attention state is bright cyan. A lint rule now
fails the build on a raw colour, and layer-1 token leakage in components and
stylesheets is zero.

Because the palette is one hue, **colour alone may never be the only signal**.
Rent against sale, held against available, and every status pill must be
distinguishable by label or shape as well.

**No Google or Apple sign in.** Email and password only. **NOT BUILT AS
DESCRIBED:** `startGoogleOAuth` and `startAppleOAuth` still exist in
`apps/web/src/lib/auth/actions.ts:660` and `:664` and are still referenced by
`components/auth/AuthChoices.tsx`, gated on `NEXT_PUBLIC_AUTH_PROVIDERS`. See
RECOMMENDATIONS N-4.

## 9. Where the platform actually stands

Counted live on 2026-08-09, project `uccixoonmbhrnyczyigt`:

```
profiles 1   user_roles 2   agents 0   agent_applications 0
listings 0   listing_videos 0   bookings 0   reviews 0
wallets 0   wallet_entries 0   transactions 0   ledger_entries 0
posts 18 (all author_kind SYSTEM)   areas 7   badges 15   user_badges 1
feature_flags 8   local_governments 774   occupations 749   states 37
70 base tables and 1 view in public, RLS on every table
130 migrations applied.  PostGIS 3.3.7.  pg_cron 1.6.4 with 6 active jobs
```

**The supply chain has not started.** One person has an account, holding the two
bootstrap roles. Nobody has applied to be an agent, so nothing is published, so
every discovery surface is genuinely empty.

That is correct rather than broken, and the honest answers to it are real
listings from real agents, an empty state that says why and captures the demand,
and the place layer, which is already populated with 774 local governments and 7
live areas. It is **not** a reason to reinvent the fabricated catalogue. See
RECOMMENDATIONS section 11.

## 10. Known divergences between this document and the code

Kept here so the list is short and visible rather than scattered.

| What | Where |
|---|---|
| Google and Apple OAuth still in the codebase after the decision to remove them | RECOMMENDATIONS N-4 |
| `ListingKind` declares `experience`; `property_type` does not | RECOMMENDATIONS P-4 |
| `listing_intent` has two values for four markets | RECOMMENDATIONS P-7 |
| Buy and sell exist in the schema and nowhere in the interface | RECOMMENDATIONS N-6, P-8 |
| PostGIS and `listings_in_bounds` exist and nothing calls them | RECOMMENDATIONS M-4 |
| `listing_videos` exists and nothing writes to it | RECOMMENDATIONS P-11 |
| No storage bucket has a size or type limit | RECOMMENDATIONS MED-1 |
| The money write path still logs nothing and still answers 200 on a misconfiguration | RECOMMENDATIONS CASE-1 |
| Escrow ledger kinds exist; `booking_status` has no `COMPLETED`, so nothing can release | RECOMMENDATIONS E-2 |
| The npm scope, the workspace and the live domain still say NaijaFinds, or worse, ninjafinds | RECOMMENDATIONS section 20 |
