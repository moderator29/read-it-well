# RentMe recommendations

This replaces the previous file of the same name entirely. That one was written
on 2026-07-28, carried 137 entries plus three appended passes, and described a
platform that no longer exists: it opened by asking the owner to decide the
admin navigation, which was decided and built ten days later, and it treated
third-party hotel inventory as the growth plan, which the owner has since
deleted from the product.

Every claim below was checked against the code, the migrations, or the live
Supabase project `uccixoonmbhrnyczyigt` on **2026-08-09**. Where a claim could
not be verified from here it says so in the entry rather than being softened.
File and line references were read, not remembered. Line numbers move; the
symbol names beside them do not, so search for the name if the number has
drifted.

Read `docs/PRODUCT.md` first. It says what the product is. This file says what
is wrong with it.

**Priorities.** P0 blocks launch or is actively lying to a user today. P1 is
required before real money and real people arrive at scale. P2 is genuine
improvement that can wait.

**Contents.** [Scope](#1-product-scope-and-terminology) ·
[Design](#2-design-system-and-theming) · [Navigation](#3-navigation-and-information-architecture) ·
[Discovery](#4-property-discovery-and-the-map) · [Data model](#5-property-data-model) ·
[Wallet](#6-wallet-and-payments) · [Escrow](#7-escrow) · [Trust](#8-verification-and-trust) ·
[Social](#9-social-layer) · [Assistant](#10-ai-assistant) · [Emails](#11-emails) ·
[Legal](#12-legal-and-privacy) · [Security](#13-security) · [Performance](#14-performance) ·
[Mobile](#15-mobile-and-store-readiness) · [Testing](#16-testing-and-enforcement) ·
[Unknowns](#17-what-is-not-known)

---

## 1. Product scope and terminology

### S-1. The repository, the npm scope and the package description still say NaijaFinds. **P1**

**Wrong today.** Root `package.json` line 4 reads `"description": "NaijaFinds.
Nigeria-first discovery, stay, food and experience platform."` The workspace
name is `naijafinds`. The shared packages are `@naijafinds/i18n` and
`@naijafinds/design-tokens`, imported in hundreds of files. The GitHub
repository is `read-it-well`, which matches nothing at all.

**Do.** Change the root `description` and `name` to RentMe now: those two strings
are read by nobody and cost nothing. Leave the `@naijafinds/*` package
identifiers alone, deliberately, and record that decision here so it stops being
re-raised: renaming them is a find and replace across every import in
`apps/web/src` for zero user-visible gain, and it is the kind of churn that
hides a real change in a diff. Rename the GitHub repository to `rentme`.

**Why.** A description field is what a package manager, a search and a new
engineer read first, and it currently describes the pre-pivot product. The
repository name surprises everyone who clones it.

### S-2. Third-party inventory is gone from the code and still present in the database and the environment. **P1**

**Wrong today.** `apps/web/src/lib/inventory/` no longer exists and
`lib/listings/types.ts:29-42` records the deletion properly. But
`public.places_cache` still holds **243 rows** of Google Places data, the
`hybrid_hotels` and `hybrid_restaurants` rows are still in
`public.feature_flags`, `public.partner_stay_intents` still exists (0 rows), and
`docs/ENVIRONMENT.md` still documents `LITEAPI_KEY`,
`LITEAPI_WHITELABEL_DOMAIN`, `GOOGLE_PLACES_API_KEY` and `GOOGLE_ROUTES_API_KEY`
as live features.

**Do.** One migration: truncate and drop `places_cache` and
`partner_stay_intents`, delete the two hybrid flags. Remove the four keys from
Vercel and from `apps/web/.env.example`. Correct `docs/ENVIRONMENT.md` section 3.
Keep `NEXT_PUBLIC_MAPTILER_KEY`, which is a different thing and is a licence
exposure, not a feature: see PERF-4.

**Why.** Cached third-party venue data sitting in a marketplace's own database is
a licensing question nobody has asked, and a feature flag that switches on a code
path that no longer exists is a trap for the next person who reads the switches
board.

### S-3. Restaurants and hotels are in the taxonomy and have no supply story. **P2**

**Wrong today.** `property_type` carries `restaurant` and `hotel`, and both are
first-party listable. A restaurant reservation loop exists end to end:
`public.reservations`, a request from the listing page, `reservations_notify`,
accept or decline in the Tables section of `/agent/bookings`. There is no money
in it, by design. `public.reservations` holds 0 rows.

**Do.** Nothing to the code. Decide, and write down, whether RentMe recruits
restaurants and hotels at all in the first year or whether these kinds stay in
the schema and off the marketing. A category on the front door with no supply
behind it is worse than no category.

**Why.** The engineering is done and the operations question is unanswered. This
is the cheapest thing on this list to get wrong, because it costs only a decision.

### S-4. The lexicon is settled and undocumented outside one table. **P2**

**Do.** `docs/PRODUCT.md` section 6 is now the vocabulary. Add a spec that greps
UI copy and the four locale files for the banned synonyms (host, landlord,
compound, hub, gist, ban) and fails on a hit. Ten lines of Node, and it is the
only thing that will keep the vocabulary from drifting back.

---

## 2. Design system and theming

### D-1. There is no stylelint and no Tailwind config, so the token system has no enforcement. **P1**

**Wrong today.** ESLint now exists (`apps/web/eslint.config.mjs`, and its own
header records that it had never run before). There is still no `stylelint` and
no `tailwind.config`. The measured drift the last audit found, quoted in that
same header: roughly 250 raw colour literals inside a stylesheet whose header
says "Nothing below may introduce a raw colour", one blue 68 times and one ink
51 times; 768 arbitrary `text-[…rem]` literals across 35 distinct values against
11 scale tokens referenced 6 times in total; 12 button implementations across 7
heights.

**Caveat, and it matters.** Those numbers were measured against a 3,167 line
`globals.css`. That file is now **71 lines** and 19 ordered partials under
`apps/web/src/app/css/`, and a `components/ui/` primitive layer of 12 components
now exists (`Button`, `Chip`, `Field`, `Segmented`, `Sheet`, `Skeleton`,
`StatusPill`, `Switch`, `Table`, `Progress`, `Amount`, `ActionBar`). **Re-measure
before quoting any of those figures.** They are the reason to add enforcement,
not a current inventory.

**Do.** Add `stylelint` with two rules only: no raw colour outside
`packages/design-tokens/src/tokens.css`, and no `box-shadow` literal outside the
token file. Add the two as warnings, count the violations, then set a date to
turn them into errors. Do not ship a config that fails on three thousand
pre-existing violations; it gets disabled within a week.

**Why.** The token file is described in ADR-002 as the control surface for the
whole platform. A control surface with no enforcement is documentation.

### D-2. The reference brief that produced the current visual overload is archived, and the code still carries what it asked for. **P0**

**Wrong today.** `docs/archive/ui-audit/00-reference-brief.md` asked for tinted icon
tiles, symbol effects on state change, a floating pill island tab bar, and
imagery inside category chips. It has been moved to `docs/archive/ui-audit/` and
stamped superseded, but the code built exactly what it asked for and that is
still shipping:

- `apps/web/src/app/css/symbols.css` is a whole partial of symbol effects, whose
  own header cites "the reference set's headline feature".
- `.nf-dock-island` in `apps/web/src/app/css/chrome.css:194` is the floating pill
  tab bar, and `components/app/MobileTabBar.tsx:17-19` documents the active tab
  expanding into a labelled capsule on a spring, which is reference brief section
  2 word for word.

**Do.** Decide, per item, whether each survives on its own merits rather than
because a brief asked for it. My recommendation: **keep** the island dock, it is
a genuinely good mobile pattern and it is well built; **keep** the labelled
capsule; **audit** the symbol effects and cut every one that fires on mount
rather than on a real state change, because an icon that animates when a page
loads is decoration and an icon that animates when a notification arrives is
information. Do not add tinted icon tiles or photo chips.

**Why.** The brief is retired, but a retired brief that is still in the code is
still the design. Somebody has to say which parts stay.

### D-3. Light mode is a real theme now, and nothing proves it stays one. **P1**

**Wrong today.** `apps/web/src/app/css/light.css` is a designed paper twin and
`packages/design-tokens/src/tokens.css:570` opens a full
`:root[data-theme="light"]` block. Both are real. But the last audit measured
light mode failing WCAG AA on the single most-used text token in the product
(296 call sites), and there is no contrast spec in `apps/web/tests/`.

**Do.** One browser spec: walk every route at 390px in both themes, compute the
real composited contrast of every text node against its real painted background,
and fail below 4.5:1 for body text and 3:1 for large text. Walk the background up
past transparent ancestors; a previous probe scored against `rgba(0,0,0,0)`
because its walk stopped at `<body>`.

**Why.** Two themes is two products. Without a spec, one of them rots and nobody
notices until a screenshot.

### D-4. Two sheet implementations, one bug fixed and the duplication left. **P2**

**Wrong today.** `components/ui/Sheet.tsx` is the primitive, with a drag handle,
detents and a `[data-open]` transform. `components/app/account/rows.tsx` carries
an older simpler one that all eight surfaces across `/profile` and `/settings`
use. They shared the class name `.nf-sheet`, which made the older one unreachable
under reduced motion; the older family was renamed `.nf-rows-sheet` and
`app/settings-rows.css` explains why at length. **That fixed the bug and not the
duplication.**

**Do.** One sheet. Migrate the eight call sites to the primitive and delete the
older family. It is real work and it is worth doing once.

### D-5. The `.nf-icon-chip` wrapper documented in the icon system does not exist. **P2**

**Wrong today.** `docs/ICON_SYSTEM.md` tells the reader to "wrap in
`.nf-icon-chip` when the object needs its own tile". A grep across every CSS file
in `apps/web/src` returns zero definitions and zero uses. The document has been
corrected; this entry records that the guidance was wrong so nobody adds the
class back on the strength of the old text.

---

## 3. Navigation and information architecture

### N-1. Signed-out visitors are locked out of the entire product, which is the opposite of the stated rule. **P0**

**Wrong today.** The owner's rule is that signed-out visitors get view only, and
any action needing an account raises sign up or sign in.
`apps/web/src/middleware.ts:37-67` does the opposite: `PRODUCT_SEGMENTS` holds 22
first path segments including `search`, `listing`, `around`, `rent`, `post`, `u`
and `home`, and `:141-155` redirects an anonymous visitor to `/sign-in` before
any page runs. A stranger cannot read a single listing, a single place or a
single public profile.

**Do.** Split the set in three.
- **Public read:** `search`, `listing`, `rent`, `around`, `post`, `u`, `stories`,
  `legal`. These render read-only and every action control raises the auth sheet.
- **Signed in:** `bookings`, `checkout`, `messages`, `notifications`, `profile`,
  `saved`, `settings`, `wallet`, `welcome`, `assistant`, `home`.
- **Role gated, unchanged:** `admin`, `agent`.

Then audit every action control on the eight public routes for a signed-out
branch. `resolveSession()` already returns `signed-out` as a first-class state,
so the pattern exists; the work is applying it, not inventing it.

**Why.** This is the single largest growth defect in the product. Every property
marketplace in the world is discovered by a stranger following a WhatsApp link to
one listing. Today that stranger hits a sign-in wall. It also silently defeats
every SEO recommendation below, because a crawler is an anonymous visitor.

### N-2. Nothing tells a crawler anything: no `robots.ts`, no `sitemap.ts`, no JSON-LD. **P1**

**Wrong today.** `find apps/web/src/app -name "robots.ts" -o -name "sitemap.ts"`
returns nothing. A grep for `application/ld+json` across `apps/web/src` returns
nothing. Individual admin pages set `robots: { index: false }` in their
metadata, which is correct and is not a substitute.

**Do.** In this order, after N-1, because none of it works while the product is
behind a session. `app/robots.ts` disallowing `/admin`, `/agent`, `/checkout`,
`/settings`, `/wallet`, `/messages` explicitly. `app/sitemap.ts` enumerating
published listings, places and the site pages. JSON-LD `RealEstateListing` and
`Product` on `/listing/[id]`, `Organization` on the landing page.

**Why.** Belt and braces on the console: `/admin` currently relies entirely on
per-page metadata, and one page added without it is a console in a search index.
And a property page with no structured data is invisible to every rich result
that would carry its price and location.

### N-3. There is no indexable page for the query the product most wants to rank for. **P1**

**Wrong today.** `/search` is the only discovery surface and it is a query-string
screen. There is no `/city/[slug]`, no `/area/[slug]` and no `/season/[slug]`.
`public.local_governments` holds all 774 and `public.states` holds 37, so the
URL space and its content already exist in the database.

**Do.** `/city/[slug]` first, generated from `states` and `local_governments`,
each carrying published listings for that place plus the place's own Around feed.
Then `/season/[slug]`, starting with Detty December, because the search intent
starts in September and the platform currently has no page a search engine can
rank for the largest demand spike of the year.

**Why.** "shortlet in Lekki" is the query. Nothing on this platform answers it in
a way a crawler can read.

### N-4. Google and Apple sign in are still in the codebase after the decision to remove them. **P0**

**Wrong today.** The product decision is email and password only. The code still
carries `startGoogleOAuth` and `startAppleOAuth`
(`apps/web/src/lib/auth/actions.ts:660` and `:664`), `signInWithOAuth` at `:681`,
a provider allow-list in `lib/auth/providers.ts:33`, rendered buttons at
`components/auth/AuthChoices.tsx:102`, and a live migration
`20260807125555_a_google_account_arrives_with_its_name_and_its_face` that reads
Google identity metadata on signup. `docs/DEPLOY.md` sections 4.2 and 4.3 still
instruct the owner to configure both.

**Do.** Delete both server actions, the provider module, the buttons and the
`NEXT_PUBLIC_AUTH_PROVIDERS` variable. Leave the signup trigger's metadata
reading alone: it is harmless and removing it is a migration for no gain. Correct
`docs/DEPLOY.md` 4.2 and 4.3 to say the providers are deliberately not offered.

**Why.** The buttons render disabled today because no provider is listed, which
means the product is showing two dead controls on its front door. Worse, the
moment somebody sets that variable they are live, and `docs/MOBILE.md` section 6
records that the OAuth return journey on native is **not closed** and would leave
the app signed out. Also relevant: Apple's guideline 4.8 requires Sign in with
Apple only if another third-party sign-in is offered, so removing Google removes
the Apple obligation with it.

### N-5. The consumer rail is grouped and ADR-007 still describes a flat twelve. **P2**

**Wrong today.** ADR-007 freezes "twelve destinations" as a flat list.
`components/app/nav-model.ts` builds a grouped tree: Home, Rent, Explore with
five `?type=` children, Around with three, then an Account section, then
conditional Agent and Console workspaces, then Legal. The mobile dock is six
destinations (`components/app/MobileTabBar.tsx:9`). All three are defensible and
none matches the ADR.

**Do.** Amend ADR-007 to record the grouped tree as the decision, with the reason
already written in `nav-model.ts:8-16`: five of the twelve were `?type=` variants
of one screen sitting at the same level as Wallet.

**Why.** A frozen-navigation rule that the navigation does not follow stops being
a constraint on anybody.

### N-6. There is no Buy or Sell anywhere in the navigation. **P0**

Covered as a data model problem in P-1. Recorded here too because it is the front
door: the product is named for renting and is meant to sell, and no rail, dock or
category chip mentions sale.

---

## 4. Property discovery and the map

### M-1. The map is Leaflet on CARTO tiles, which is licensed for non-commercial use only. **P0**

**Wrong today.** `NEXT_PUBLIC_MAPTILER_KEY` is unset, so the map draws on CARTO's
public basemaps. Those are non-commercial use only. A marketplace taking bookings
is a commercial use.

**Do.** Get a MapTiler key at `cloud.maptiler.com/account/keys` and set it. The
provider swap, the zoom ceiling and the attribution move together in code
already, so this is one environment variable.

**Why.** This is the only item on the whole list that can produce a letter from a
lawyer rather than a bug report, and it costs one signup.

### M-2. Leaflet's stylesheet ships on every page. Deliberately. Do not measure it again. **P2**

**Measured, not assumed.** The map's JavaScript is properly lazy: exactly one
chunk on the map view and none anywhere else. But `import
"leaflet/dist/leaflet.css"` at `components/app/search/MapCanvas.tsx:6` is a static
import, so two stylesheets travel with every page including the list view that
never draws a map. About 10KB.

**Do nothing.** Both clean fixes cost more than they save: moving the import into
the dynamic component renders the map unstyled for a frame, and hand-copying the
rules creates a copy that rots the next time Leaflet changes. This is recorded
because it has now been measured twice by two different people.

### M-3. Listings have no enforced coordinates, so the map places by area centroid. **P1**

**Wrong today.** `public.listings.latitude` and `.longitude` are nullable and the
eight step wizard does not force a pin. `RealMap` degrades to the area centroid,
which is the right degradation and is not a substitute.

**Do.** Make the pin a required step in the wizard, with the area centroid as the
draggable starting position so it is one gesture rather than a search. Backfill
is not needed: there are zero listings.

**Why.** Do this before the catalogue fills. An agent will not revisit sixty
listings to drop a pin, and a property marketplace whose map is approximate is a
property marketplace nobody trusts the map on.

### M-4. PostGIS is available and not installed, and nothing needs it yet. **P2**

**Verified live.** `postgis` 3.3.7 is available in
`pg_available_extensions` with `installed_version` null. Distance work today is
haversine in application code.

**Do nothing yet.** Revisit when a real "within 5km of here" filter is asked for.
Recorded so nobody installs it speculatively and nobody reasons around its
absence twice.

### M-5. Discovery items that need inventory before they can be built or checked. **P2**

Carried forward with their evidence intact so they are not rediscovered. None can
be verified with an empty catalogue: total price first with a per-night toggle;
the price breakdown staying expandable at every step of the booking wizard;
search scroll position surviving a return from a listing; a "search this area"
chip on map pan; map and list hover synchronised; long-press quick actions on a
card; alt text required at photo upload. **There is no caution deposit anywhere
in the schema. Do not invent one.**

---

## 5. Property data model

### P-1. There is no sale. The product is named for renting and is meant to sell, and `listings` cannot express a sale at all. **P0**

**Wrong today.** Read the columns of `public.listings`. Every price column is
`price_per_night_minor`, `cleaning_fee_minor`, `service_fee_minor`.
`price_period` is an enum of exactly two values, `night` and `year`. There is no
`sale_price_minor`, no `listing_intent`, no `tenure`, no `title_document`, no
`sold_at`. The word "sale" does not appear in the listings schema.

**Do.** One migration, before the catalogue fills, and design it once:

1. `listing_intent` enum: `RENT`, `SALE`, `STAY`. Not nullable, defaulted from
   `property_type` for the rows that will exist.
2. `sale_price_minor bigint`, null unless intent is `SALE`, with a check
   constraint tying the two together so a sale listing cannot exist without a
   price and a rental cannot carry one.
3. `tenure` enum for Nigerian reality: `FREEHOLD`, `LEASEHOLD`, `C_OF_O`,
   `GOVERNORS_CONSENT`, `EXCISION`, `GAZETTE`, `FAMILY_LAND`. This is the single
   most important trust field in Nigerian property sale and it has no equivalent
   in the stay model.
4. `title_document_status` and a private bucket for the documents, reviewed the
   same way agent identity documents already are.
5. A `SALE` listing gets no Reserve button and no availability calendar. It gets
   enquire, inspect, then a transaction. That is the rental path with a different
   noun, so most of the flow already exists.

**Why.** This is the largest single gap between what RentMe says it is and what
the database can hold. It is also the cheapest it will ever be to fix: zero
listings, zero bookings. Every day the catalogue is empty is a day this migration
costs nothing, and the day after the first hundred listings land it costs a
backfill and a data migration on live rows.

### P-2. `ListingKind` in TypeScript and `property_type` in Postgres disagree. **P1**

**Wrong today.** `apps/web/src/lib/listings/types.ts:3-25` declares eleven kinds
including `experience`. `public.property_type` holds ten and does not include it.
The nav offers `/search?type=experience`
(`components/app/nav-model.ts:78`), which can never match a row.

**Do.** Decide whether experiences are a kind. If yes, add the enum value and the
wizard step. If no, delete it from `ListingKind`, from the nav and from the four
locale files. My recommendation is no: it is the last surviving limb of the
NaijaFinds discovery product and nothing else in the schema serves it.

**Why.** A category in the navigation that cannot return a row is a dead end the
type system cannot catch, because the two enums are declared in two languages.

### P-3. Generate the database types in CI, so the two enums can never disagree again. **P1**

**Do.** `supabase gen types typescript` into
`apps/web/src/lib/supabase/database.types.ts` as a CI check that fails on drift,
and derive `ListingKind` from `Database["public"]["Enums"]["property_type"]`
rather than declaring it by hand.

**Why.** P-2 exists only because a hand-written union and a database enum are two
sources of truth. This closes the class, not the instance. The social audit
already recorded one build going red from exactly this drift.

### P-4. `public.saved_searches` has no writer and no screen. **P2**

**Wrong today.** The table exists
(`supabase/migrations/20260728152458_engagement.sql:59`), holds 0 rows, and a grep
for `saved_searches` across `apps/web/src` returns one hit, in the generated
types. No "save this search" control exists anywhere.

**Do.** Either build it, which is a control on `/search`, a row, a list on
`/saved` and eventually an alert, or drop the table. Schema ahead of the product
is harmless; schema that stays ahead for a year is a signal nobody is reading the
schema.

### P-5. Nothing records a listing's status history, so historical occupancy is unanswerable. **P2**

**Wrong today.** `listings` carries one `published_at` and one current `status`.
`/agent/analytics` therefore shows forward occupancy over the next 30 nights and
says on the screen that it cannot show historical occupancy, which is the honest
answer. A listing paused last March would silently rewrite last March's occupancy
on every page load.

**Do.** A `listing_status_events` append-only table, written by the same trigger
that already moves the status. Cheap now, impossible to backfill later.

### P-6. Nothing counts a view of a listing. **P1**

**Wrong today.** `public.post_views` exists and keys on `posts.id`, so it belongs
to the social feed and cannot be joined to a listing. There is no view count on
any listing, and therefore no view-to-booking conversion, which is the single
figure a host most wants.

**Do.** `public.events`, which already exists and holds 0 rows, is the right
place. It was built to the audit spec for exactly this. Write a `listing_viewed`
event from server code only, with the bot filter and the retention policy decided
up front rather than added later, and reuse `private.view_bucket`, the salted
daily bucketing that already stops a client from inflating a count.

---

## 6. Wallet and payments

### W-1. A missing `SUPABASE_SERVICE_ROLE_KEY` silently kills every money path and answers HTTP 200. **P0**

**Wrong today, and this is the most probable cause of the reported wallet
failure.** `apps/web/src/lib/wallet/ledger.ts:25-36`: `getAdminClient()` returns
`null` whenever the service key is absent or empty, and swallows the throw.
Everything downstream treats null as "not configured" and gives up quietly:

- `apps/web/src/app/api/paystack/webhook/route.ts:242-243`: `const admin =
  getAdminClient(); if (!admin) return acknowledged(false);` and
  `acknowledged()` at `:69-71` returns `NextResponse.json({received}, {status:
  200})`. Paystack is told the delivery succeeded, never retries, and nothing is
  logged. **A funding that was paid for is lost permanently.**
- The redirect verify path and every wallet action take the same branch:
  `lib/wallet/actions.ts:222`, `:338`, `:448`, and
  `lib/bookings/checkout.ts:258`, `:374`, `:503`, `:600`.

So both settlement paths, the webhook and the redirect, fail identically and
silently, which is exactly the symptom: money leaves the card and the wallet does
not move.

**Do, in this order.**
1. Set `SUPABASE_SERVICE_ROLE_KEY` in the Vercel Production environment. The
   owner owns this. Verify with the smoke test below rather than by assertion.
2. **Make the webhook fail loudly.** A missing service key must return `500`, not
   `200`, so Paystack retries and the delivery is not lost. The existing comment
   at `:34` says "Every path answers 200 quickly so Paystack never retries into a
   crash", which is right for a malformed payload and wrong for a misconfigured
   server: one is the sender's problem and one is ours.
3. **Log it.** One `[wallet] service role key absent` line, once per minute, on
   every path that takes the null branch. The `[inventory]` throttled logger that
   was written for the partner providers is the pattern.
4. **A startup assertion.** A boot-time check that names every server-only key
   that is absent, printed once in the deployment log. Not a throw: the platform
   must boot with an empty environment by design. A line, so the absence is
   visible without a probe.

**Why.** Fail-open is correct for a rate limiter and catastrophic for a payment
webhook. The current shape converts a missing environment variable into
irrecoverable lost money with no signal anywhere.

### W-2. Nothing is rate limited on the money surfaces. **P0**

**Wrong today.** `private.consume_rate_limit` is durable, Postgres-backed and
applied. `consume` (`lib/security/rate-limit.ts:151`) is called from two API
routes only, `api/assistant` and `api/support`. Reserve, cancel, fund, withdraw
and transfer count nothing.

**Mitigating, and it is why this is not worse:** wallet writes are idempotent at
the database level on the unique `reference` column
(`supabase/migrations/20260728202225_wallet.sql:57`, honoured at
`lib/wallet/ledger.ts:91`), and `withdraw` prices the spendable balance inside a
row lock.

**Do.** Apply the existing limiter to `reserve`, `fundWallet`, `withdraw`,
`transferToUser` and `payWithWallet`. Per user, per action, per hour. It is one
call each, the machinery is built, and the reason it is not done is that nobody
went back.

**Why.** Reserve holds real inventory. An unthrottled reserve is a way to lock
every calendar on the platform from one account.

### W-3. A complete second wallet deck is dead, taking three server actions with it. **P1**

**Verified today.** `components/app/wallet/WalletActions.tsx` is 306 lines with
**zero import references**, and it is the only caller of `requestDeposit`
(`lib/wallet/actions.ts:591`), `requestWithdrawal` (`:605`) and `requestTransfer`
(`:649`). `getStatement` (`:543`) is also imported by nothing. The live page
renders `./WalletDeck`, which uses `fundWallet`, `withdraw` and `transferToUser`.

**Do.** Delete the component and the four unreachable exports, or wire them.
Whoever owns them decides; the evidence does not need re-deriving.

**Why.** Two implementations of the money surface is how a security fix lands on
the wrong one.

### W-4. The P2P transfer form is an email-address oracle. **P1**

**Wrong today.** The transfer form answers differently for an address that has a
RentMe wallet and one that does not, so a script can walk a list one response at
a time and learn who banks here.

**Do.** One response for both cases: "If that address has a RentMe wallet, the
transfer is on its way." Then confirm or refund asynchronously. Pair it with the
rate limit from W-2, because a uniform message with unlimited attempts is still
a timing oracle.

**Why.** The platform already got this right on password reset, deliberately. The
transfer form is the same question with money attached.

### W-5. There is no transaction PIN. **P1**

**Wrong today.** A signed-in session alone authorises a debit.

**Do.** A four to six digit PIN, set on first wallet-moving action, required for
withdraw and transfer and not for paying a booking the person is already looking
at. Hash it with the same care as a password. Add a rate limit and a lockout.

**Why.** Nigerian phones are shared and borrowed far more than the implicit
Western threat model assumes, and every Nigerian banking app the audience already
uses asks for this. Its absence reads as unsafe even before it is exploited.

### W-6. There is no reconciliation and no drift alert. **P1**

**Wrong today.** The ledger balances by construction: `gross = platform + agent +
processor` with platform always zero. Nothing checks that it still does.

**Do.** `pg_cron` is installed and running six jobs (see T-3), so the runway
exists. Add a nightly job that recomputes every wallet balance from
`wallet_entries`, compares it to the derived view, and writes a `risk_alerts` row
on any non-zero drift. Add a second that checks for `PENDING` withdrawal holds
older than 24 hours and asks Paystack for each one's status individually, because
a nightly total cannot tell one stuck transfer from a quiet day.

**Why.** The first time the ledger is wrong, it will be wrong quietly. A
marketplace finds out from a user.

### W-7. Refunds go to the wallet first and there is no bank fallback. **P2**

**Wrong today.** Support-initiated refunds credit the wallet, which is correct as
the fast path and is documented honestly on `/safety`. There is no path to return
money to the original card or bank account.

**Do.** After W-6. Wallet first, always, then a bank refund on request through
the payout account machinery that already exists for agents.

---

## 7. Escrow

### E-1. Escrow is zero percent implemented, and it is also zero percent marketed. **P0 to build, P0 to keep not marketing.**

**Verified today, and this corrects a claim that has been repeated.** A grep for
`escrow` across every `.ts`, `.tsx` and `.sql` file in `apps/`, `packages/` and
`supabase/` returns **exactly three hits, all of them code comments, none of them
user-facing**:

- `apps/web/src/app/(site)/safety/page.tsx:27`, which says the page carries "no
  promise of an escrow that is not built".
- `apps/web/src/lib/listings/repository.ts:30` and `lib/listings/types.ts:33`,
  both arguing that first-party-only inventory is what makes escrow possible.

A grep across the four locale files returns zero. **The product does not promise
escrow anywhere.** The safety page deliberately refuses to, and that refusal is
the single most honest thing in the codebase. It must not be undone by a
marketing pass.

**What does not exist.** No `escrow_holds` table. No `HELD` state on
`wallet_entries` beyond the withdrawal hold. No release condition, no release
actor, no dispute path, no timeout. `wallet_entry_kind` is `deposit, withdrawal,
payment, refund, transfer_in, transfer_out` and none of them is a hold.

**Do, and design it once.** Escrow is a ledger shape, not a feature flag.

1. **Model it as ledger holds, not balance edits.** Authorise, capture, release.
   A held amount is an entry with a `HELD` status against a named counterparty
   and a release condition, and the derived balance already subtracts pending
   debits, so the arithmetic hook exists.
2. **Name the release condition per market.** A stay releases 24 hours after
   check-in. A rental releases on a recorded inspection confirmation plus tenancy
   start. A sale releases on a title document check that a human performs. These
   are three different products and only the first is close to buildable today,
   because `booking_status` is `PENDING, CONFIRMED, CANCELLED` with **no
   COMPLETED**, so "they stayed" is not a moment the schema records at all.
3. **Add `COMPLETED` to `booking_status` first.** Nothing else in escrow can be
   specified until the platform can say a stay happened. This also unblocks two
   badges and the review prompt.
4. **A dispute is a support ticket with money attached.** `support_tickets`,
   `/admin/support` and the audit log all exist. Do not build a second queue.
5. **Decide who holds the money.** Today the platform charges no fees and never
   holds a balance it did not receive. Escrow means holding somebody else's money
   for days. That is a regulatory posture, not an engineering decision, and it
   needs an answer before a line of it is written.

**Why.** Escrow is the reason a Nigerian would send rent to a platform instead of
to a stranger's account. It is also the promise most likely to be made in
marketing before it is built. The correct order is: `COMPLETED` status, then
ledger holds, then release conditions, then the copy. Never the copy first.

---

## 8. Verification and trust

### V-1. An agent can see the verification ladder and cannot climb it. **P1**

**Wrong today.** `/agent/verification` is real: an agent sees all four rungs,
which they passed, which failed, the reviewer's note in full, and what the next
rung asks for. `agents.verification_tier` is the count of rungs passed with no
gap below, computed by `private.agent_tier`.

There is no way to send anything. No upload control, because nothing behind the
page accepts a document: the evidence for every rung arrived with the
application. An agent who wants to move up is pointed at support.

**Do.** Reuse the machinery that already works. `ApplyWizard.tsx:172` uploads
straight from the browser into the private `agent-documents` bucket, and
`lib/admin/queries.ts:365-381` mints a ten-minute signed URL per document for the
reviewer. A re-submission control on `/agent/verification` is those two things
pointed at an existing agent rather than an applicant.

**Why.** The ladder decides how much of the platform an agent may use. A ladder
with no rungs to reach for is a scoreboard.

### V-2. There is no identity verification standard for payouts. **P1**

**Wrong today.** `payout_accounts` resolves the account name against the bank,
which is the right check and is not identity verification. Nothing verifies NIN
or BVN.

**Do.** NIN verification during agent onboarding, env-guarded so it degrades into
an honest unconfigured state until keys land, exactly as every other integration
here does.

**Why.** Paying out to unverified identities is how marketplaces become money
laundering vectors, and it is the question a Nigerian regulator asks first.

### V-3. Badges are built, awarded nightly, and every document said they were not. **P2**

**Verified live.** `public.badges` holds 15 rows: seven AGENT, eight MEMBER, one
of them `manual_only`. `public.user_badges` holds 1. `private.sweep_badges` is
scheduled as `rentme-nightly-badges` at 02:20 UTC and is active.

**Do.** Two things only. Build the earned moment: a badge that appears silently
is a badge nobody values, and a designed reveal plus a notification row is the
cheapest retention mechanic available. And enforce the anti-gaming rules already
argued: Helpful counts only from accounts with a completed stay or a verified
phone, and one Helpful per pair per week counts towards a badge.

### V-4. `private.probe_as` still exists on the live database. **P1**

**Verified live.** The function is present in the `private` schema. It sets
`request.jwt.claims` so a probe can run as a real signed-in person under RLS,
which is the only way to test a policy, because a probe through the service role
bypasses RLS entirely. It is revoked from `public`, `anon` and `authenticated`,
so only the service role can reach it, and no application code calls it.

**Do.** Delete it before the platform carries real people's data. Keep a copy of
the definition in a comment in the migration that drops it, so a future
policy-testing session can recreate it deliberately in a branch rather than
inventing it again.

**Why.** A function that can impersonate any user is the correct testing tool and
the wrong thing to leave on a production database holding somebody's rent.

### V-5. Leaked password protection is off. **P1**

**Verified in the last database audit, and it is a dashboard toggle, not code.**
Supabase Auth can check a new password against HaveIBeenPwned and refuse one that
appears in a known breach. It is disabled.

**Do.** Owner action, Supabase dashboard, Authentication, Policies. Enable it
before the platform carries real accounts.

**Why.** Credential stuffing against a property marketplace with a naira wallet
behind it is exactly what this prevents, and the reset flow is already written to
be an unhelpful oracle, so the account-existence half is closed already.

### V-6. `message_flags`, `risk_alerts` and `reports` record a status and not a reviewer. **P2**

**Do.** A `reviewed_by` and `reviewed_at` on each, written by the admin action
that closes the row. `audit_log` already carries the actor for privileged
actions; this puts it on the queue row itself so the queue can be read without a
join.

---

## 9. Social layer

### O-1. The social layer is built, and three documents told the next agent to build it. **P0, and now done**

**Verified live.** `areas` 7, `posts` 18, `badges` 15, plus `area_members`,
`area_moderator_applications`, `social_profiles`, `follows`, `post_media`,
`post_reactions`, `post_reposts`, `post_views`, `blocks`, `mutes`, `stories` and
its four companion tables, `events`, `event_attendees`. Routes: `/around`,
`/around/[slug]`, `/around/new`, `/around/manage`, `/around/settings`, `/u`,
`/u/[handle]` and its follower views, `/post/[id]`, `/stories/[id]`,
`/stories/new`, plus `/admin/social`, `/admin/moderation`, `/admin/standing`.

`docs/archive/SOCIAL_TODO.md` and `docs/archive/SOCIAL_BUILD.md` carried 45 and 112 unticked
checkboxes against work that is finished, and `docs/archive/NEXT_SESSION_PROMPT.md` told
a fresh session the social layer was "your main build". All three are archived.
`docs/SOCIAL_DESIGN.md` survives as the design record.

### O-2. All 18 posts are `author_kind = 'SYSTEM'`. The cold start is answered and untested. **P1**

**Verified live.** Every post is the platform's own. `private.post_daily_note`
runs at 06:00 UTC daily and `private.announce_completed_stays` at 05:20 UTC.

**Do.** Nothing to the code. Watch the first real post. The SYSTEM author kind is
a good answer to an empty room and it becomes noise the moment there are people
in it. Decide in advance at what member count the daily note stops, and put that
number in `bot_settings` rather than in a deploy.

### O-3. Three counts are formatted with a hardcoded `en-NG`, and one of the three moved. **P2**

**Re-measured today.** `PostCard` has been fixed and now calls `formatNumber(n,
locale)`. Two hardcoded calls remain, both in
`apps/web/src/components/social/PlacePicker.tsx:322` and `:341`, plus one at
`apps/web/src/app/(site)/docs/chapters.tsx:1361` which is a documentation page,
not a social component.

**The measurement that says leave them.** Across every locale the platform ships:

```
en  842   1,234   12,500   1,234,567
yo  842   1,234   12,500   1,234,567
ha  842   1,234   12,500   1,234,567
ig  842   1,234   12,500   1,234,567
```

All four are identical, because all four use Latin digits and comma grouping, so
the hardcoded tag produces the same string as the correct call for every reader
the product has. `PlacePicker` is a client component and there is no locale
context, only `<html lang>`, so fixing it means inventing a context or threading
a prop for a change nobody can see.

**Do it the moment either of two things happens:** a locale is added that groups
or digits differently, or a locale context appears for another reason. **Not** as
its own piece of work. Note that the same defect on *money* was real and was
fixed: `ha-NG` writes `₦ 5,000` with a space, so currency did differ where
integers do not.

### O-4. Media for a removed post stays in storage. **P2**

**Wrong today.** `posts_drop_media_on_remove` deletes the `post_media` rows as a
post reaches REMOVED, and after `a_picture_on_a_post_has_one_shape` an object no
row names cannot be signed for anybody, including the uploader. The bytes stay in
the `social-media` bucket.

**Do.** A sweep through the storage API that deletes every `social-media` object
whose name no `post_media` row and no `stories.image_path` mentions. Deleting the
`storage.objects` row from SQL would leave the bytes untracked, which is worse.

**Why.** Nothing is readable in the meantime, so this is storage cost, not
exposure. It is on this list so it stays a cost.

### O-5. Nothing connects the social layer back to booking. **P1**

**Wrong today.** A published listing announces itself in its area
(`a_published_listing_speaks_in_its_area`) and a completed stay speaks in its
place. That is the platform talking. Nothing goes the other way: a member reading
a place cannot filter the catalogue to it, and a stay does not become the next
person's search.

**Do.** One control, on `/around/[slug]`: "See places to stay in Yaba", linking
to `/search` scoped to that local government. Then the reverse, a place card on a
listing page showing the area's live posts. Both are a query, not a schema.

**Why.** This is where the money is and it is the thinnest part of the design.

---

## 10. AI assistant

### AI-1. The assistant persists threads it never reads back. **P1**

**Wrong today.** `apps/web/src/app/api/assistant/route.ts:395-431` writes
`ai_conversations` and `ai_messages`. `components/app/assistant/threads.ts` reads
only `localStorage` under `nf_ai_threads`. Nothing selects those tables.

**Do.** Read the persisted rows on load, and reconcile an anonymous thread into
the signed-in account on sign in.

**Why.** History vanishes on a new device or after clearing storage, though the
rows exist. The assistant visibly forgets something it demonstrably knows.

### AI-2. The assistant's tools have no caller context. **P2**

**Wrong today.** The grounded tool is `search_listings`. The assistant cannot see
the caller's own trip, balance or unread threads.

**Do.** Add tools bound to the caller's own RLS client server side, with **no
identity argument at all**. A tool that takes a user id is a tool that can be
asked about somebody else. This is the same shape the database audit named as the
dangerous pattern in SECURITY DEFINER functions, and the same discipline applies.

**Why.** A search box with a personality is copyable in a week. An assistant that
knows your stay is not.

### AI-3. The cost ceiling exists and is not alerted on. **P2**

**Wrong today.** A per-month cost ceiling lives in `bot_settings` and is read
against `bot_invocations`. Hitting it is silent.

**Do.** A notification to admin at 80 per cent. The ceiling protects the bill and
nobody learns the product got popular.

---

## 11. Emails

### EM-1. Nine transactional messages exist and nothing proves one was delivered. **P1**

**Verified today.** `apps/web/src/lib/email/messages.ts` exports nine builders:
`bookingRequested`, `bookingRequestedHost`, `bookingConfirmed`,
`stayArrivalDetails`, `bookingCancelled`, `bookingRefunded`, `walletFunded`,
`withdrawalFailed`, `supportTicketFiled`. Live sends run from reserve, cancel,
arrival, the admin booking actions, wallet withdrawal and support filing, all
wrapped in `bestEffortEmail` so a mail failure never rolls back a committed
write. That wrapper is correct and it means a delivery failure is invisible.

**Do.** A server-side sink for the failures the platform deliberately swallows.
One table or one structured log line per swallowed failure, with the message
kind and the reason. `bestEffortEmail` is right to swallow and wrong to forget.

**Why.** A silent regression in email delivery is invisible for as long as nobody
notices by hand, and the first thing a guest does when no confirmation arrives is
file a support ticket.

### EM-2. The five auth email templates are generated and must be pasted in by hand. **P2**

**Verified.** `supabase/templates/` holds five branded templates, generated by
`scripts/build-auth-emails.mjs` and never hand-edited. They are applied through
the dashboard or the Management API.

**Do.** Script the Management API path so the repository is the source of truth
and the dashboard is a deploy target. Today a regeneration silently does not
reach production.

### EM-3. `EMAIL_FROM` must be a verified sender or delivery is rejected outright. **P1**

**Do.** Owner action: verify the sending domain on Resend before launch. It
defaults to `RentMe <hello@rentme.ng>`, which will bounce until the domain is
verified.

---

## 12. Legal and privacy

### LG-1. The landing page claims NDPA compliance as a fact. **P0**

**Wrong today.** `apps/web/src/app/page.tsx:416` answers "Is my data safe under
NDPA?" with "Yes. RentMe is built to comply with the Nigeria Data Protection
Act." Nothing in the repository can establish that. The Nigeria Data Protection
Act 2023 requires, among other things, registration with the NDPC as a data
controller of major importance and a designated Data Protection Officer.
Registration has lead time measured in weeks. There is no evidence either has
happened.

**Do.** Two things, and they are separate. Change the copy today to describe what
the platform actually does, which is real and worth saying: data encrypted in
transit and at rest, never sold, a copy or a deletion on request, the rights the
Act gives you. Delete the compliance claim. Separately, start the NDPC
registration and appoint the officer, because that lead time is the reason to
start now rather than at launch.

**Why.** A compliance claim is a legal representation. Claiming compliance you
cannot evidence is worse than saying nothing, and it is the one sentence on the
landing page a regulator would read first.

### LG-2. The privacy policy is good and names no controller and no officer. **P1**

**Wrong today.** `apps/web/src/app/(site)/privacy/page.tsx` is real, written in
plain language, cites the NDPA correctly, and is shared with the in-product copy
at `/legal/privacy` so the back button behaves. It does not name the legal entity
acting as data controller, the registered address, the Data Protection Officer or
a contact route for a rights request other than a support ticket.

**Do.** Add all four the moment the entity is registered. They are the parts a
rights request needs.

### LG-3. There is no cookie or storage consent, and there may be nothing to consent to. **P2**

**Verified today.** A grep for cookie consent across `apps/web/src` returns
nothing. There is also **no analytics vendor and no crash reporting in this
codebase at all**, which is unusual and is a genuine asset. Storage is: an auth
cookie, a theme choice (`nf_theme`), a locale cookie, a saved-item cache and
search memory. Every one is strictly necessary or a user preference.

**Do.** Confirm with counsel that no consent banner is required for that set,
then write the conclusion down here so it is not re-litigated. If crash reporting
is ever added, the consent question is reopened, and that is a real privacy cost
to weigh deliberately rather than discover during a store review.

### LG-4. Rental and sale agreements are not modelled and will need legal input. **P2**

**Do.** Not now. Recorded so the sale work in P-1 budgets for it: a sale of
Nigerian property involves a deed, a survey and a governor's consent, and the
platform's role in that chain is a legal question before it is a schema.

---

## 13. Security

### SEC-1. The Content Security Policy is built, served and not enforced. **P1**

**Verified today.** `lib/security/csp.ts` builds it, `middleware.ts:95-99` serves
it on all three exits with a per-request nonce, and the root layout nonces its two
before-paint scripts. `cspHeaderName()` at `csp.ts:40-42` returns
`Content-Security-Policy-Report-Only` unless `CSP_ENFORCE === "true"`. It is
unset.

**Do.** Watch `/api/csp-report` and the `[csp]` lines in the deployment log
across real traffic. When they stop, set `CSP_ENFORCE=true`. Note the warning
already written at `csp.ts:220-221`: something in the deposit path is expected to
break the day it is enforced, so enforce it on a day somebody is watching.

**Why.** A wrong policy does not degrade, it white-screens. Report-only is the
correct starting state and it is not the finishing state.

### SEC-2. Two high severity advisories remain, both lint-time only. **P2**

**Last counted 2026-08-07 and this number has moved by seven in both directions
without anybody noticing. Re-run `npm audit` before quoting it.** Root
`overrides` pin `sharp` to `^0.35.3` and `postcss` to `^8.5.23`, closing six.
What remains: `brace-expansion`, and `js-yaml` 4.3.0 reached through `eslint >
@eslint/eslintrc`, a quadratic CPU consumption resolving `!!omap` on input that
is only ever an ESLint config file we wrote. Neither reaches the shipped bundle
or the request path.

### SEC-3. Ten database advisories are correct by design and one is not. **P1**

**Do not "fix" these.** Each breaks something:
- Revoking anon EXECUTE on `platform_stats` turns the landing page's numbers band
  into an error for every signed-out visitor.
- Revoking anon EXECUTE on `agent_trust` empties the trust panel on every agent
  profile read by somebody not signed in, which is most readers. It authorises
  nothing: it carries `where exists (select 1 from me)`, so a non-agent yields no
  row.
- Adding an RLS policy to `rate_limits`, `idempotency_records` or `places_cache`
  hands a signed-in user reach into the machinery that stops a payment being
  taken twice. The **absence** of a policy is the control: RLS on with zero
  policies denies every row to every role but the service role.
- Consolidating the 239 multiple-permissive-policy warnings rewrites the
  platform's access rules for an unmeasured gain on a database holding zero rows.
- Dropping the 34 unused indexes deletes exactly the indexes the platform will
  need, on the evidence that an empty database has not queried them.

The one that is real is leaked password protection, V-5.

**The pattern worth naming, because it is the rule for every future SECURITY
DEFINER function:** three of the four callable ones take no argument at all, or
take one that identifies public data. The dangerous shape is a definer function
that takes an identifier and then acts with the definer's authority on behalf of
whoever was named. This project has shipped that bug once, in `grant_staff_role`,
which authorised off its own argument and was granted to `authenticated`, so any
signed-in user could pass a super admin's uuid and become one. It was revoked to
`service_role` with a second check inside the function. Do not write that shape
again.

### SEC-4. The middleware matcher used to have a hole and the lesson generalises. **P2**

**Fixed, recorded so the class stays closed.** The matcher excluded any path
ending in an asset extension, not paths under an asset directory. Every dynamic
route accepts such a suffix inside its own parameter, so `/checkout/abc.png`,
`/listing/abc.png`, `/messages/abc.svg` and `/u/somebody.png` all returned 200
with full HTML, no CSP, no nonce, no session refresh and no signed-out gate. It
is now anchored on directories (`middleware.ts:186`).

**Do.** A spec that asserts the CSP header and the nonce are present on a
representative dynamic route with a `.png` suffix. The fix is right; nothing
holds it.

### SEC-5. There is no session or device management. **P1**

**Wrong today.** A person cannot see where they are signed in and cannot sign a
device out.

**Do.** A device list on `/settings`, a sign-out-everywhere action, and a
new-device notification. The notification writer already exists.

**Why.** A wallet-bearing account on a lost phone must be recoverable by its
owner, not by a support ticket.

---

## 14. Performance

### PERF-1. Home was 3.6MB of imagery and is 28KB under Save-Data. **P2, and it is done**

**Measured, and worth keeping because it is the model for the rest.** `/home` was
3,676KB at 390px with an empty catalogue, 3,520KB of it imagery, almost all of
that two raw background PNGs. Under the `Save-Data` header or a 2g connection it
is 28KB: the artwork is **never requested** rather than hidden, and the Ken Burns
pan, the blooms, the grain and the aurora go with it. Every colour, control and
heading stays. Proved by `apps/web/tests/save-data.spec.mjs`.

**Do.** Apply the same treatment to the remaining heavy routes, and add a
user-facing data-saver toggle so somebody on a metered bundle can choose it
rather than waiting for a header they do not control.

**Why.** 3.5MB is a real amount of a Nigerian data bundle. This is the highest
value performance work in the product and the pattern is already built.

### PERF-2. Fonts are self-hosted, preloaded and correct, after being wrong in an invisible way. **P2, done**

**Measured.** Both faces were already self-hosted through `next/font` and **not
one preload link ever reached a browser**. Nineteen files existed, ten were
fetched on every load, four of those were never painted. Seven files now, checked
in, preloaded per locale, immutable for a year. The declared subset list was also
wrong: the Yoruba and Igbo dotted vowels live in `vietnamese`, which was never
asked for. Guarded by `apps/web/tests/fonts.spec.mjs`.

### PERF-3. Images all have reserved boxes, measured rather than assumed. **P2, done**

A sweep of 43 routes at 390 and 1280 found **zero** images without a reserved
box. The guard lives in `polish-overlays-copy-status.spec.mjs` and covers all 43
routes; it used to cover 22, which proved half the platform.

### PERF-4. `apps/web/tsconfig.json` carries ten dead `include` entries. **P2**

Parallel builds added `".next-a1/types/**"` and friends, but `exclude` holds
`".next-*"` and exclude filters include, so every one of those entries does
nothing. Only the default `.next/types` is live, because it has no dash. Harmless;
tidy it next time somebody is in that file.

### PERF-5. Nine orphan modules, 1,276 lines, verified unimported. **P2**

**Re-verified today with exact module-path greps, not bare identifiers.** Each
has zero import references:

| File | Lines |
|---|---|
| `components/app/messages/MessageThread.tsx` | 320 |
| `components/app/wallet/WalletActions.tsx` | 306 |
| `components/app/account/ProfileIdentityCard.tsx` | 201 |
| `lib/social/comments-queries.ts` | 149 |
| `components/agent/StatCard.tsx` | 100 |
| `components/agent/charts/DonutChart.tsx` | 78 |
| `components/agent/charts/AreaSparkline.tsx` | 67 |
| `lib/assistant/protocol.ts` | 34 |
| `lib/mode.ts` | 21 |

Two that were on the previous orphan list are no longer orphans and should not be
deleted: `components/app/MomentScreen.tsx` now has 9 importers, and
`lib/platform-stats.ts` has 1.

**Do.** Delete them, or wire them. The evidence does not need re-deriving. They
were left in place before because a parallel session was working in the tree.

---

## 15. Mobile and store readiness

### MOB-1. Capacitor is installed, both native projects generate, and no native build has ever run. **P1**

**Verified in the repository.** `apps/web/capacitor.config.ts`, `android/`,
`ios/`, `native-shell/`, `src/lib/native/`, `public/.well-known/`. What was
actually proven: both projects generate, `cap sync` succeeds with 5 plugins each,
every Gradle file parses as valid Groovy, Gradle 8.14.3 runs on JDK 21, the
manifest and plist and entitlements are well formed, icons survive Android's real
66-of-108 launcher mask, and both association files serve 200 with the right
content type.

**Not proven, each needing a real toolchain:** that the Android project compiles,
that R8 with `minifyEnabled true` produces a working bundle, that the hand-edited
`project.pbxproj` opens in Xcode, and that the location permission behaves as
reasoned. The sandbox proxy denies `dl.google.com`, so no Android SDK, and there
is no macOS.

**Do.** Connect Codemagic or another CI with a real toolchain and run one build
of each before anything else in this section is trusted.

### MOB-2. Apple guideline 4.2 is an argument, not a guarantee. **P1**

**Wrong to assume.** Path A, a Capacitor shell pointed at the production origin,
is the textbook case App Review rejects as a thin web wrapper. The native
capabilities in `src/lib/native/` are the argument against it: hardware back, a
status bar bound to the theme, keyboard insets, splash control, and the
system-browser handoff.

**Do.** Ship the PWA now, since it is finished. Take Path A to Google Play, which
is far more tolerant. Build Path C, Expo sharing `packages/design-tokens` and
`packages/i18n`, for iOS. That is what the roadmap budgeted before the Capacitor
instruction arrived and it remains the right answer for the App Store.

### MOB-3. Two association values are missing and both fail loudly on purpose. **P1**

**Owner action, neither obtainable from the repository.**
`public/.well-known/assetlinks.json` needs **two** SHA-256 fingerprints: the Play
app signing certificate, which is the one that matters on a shipped install
because Play strips our signature and re-signs, and the upload key, which is what
makes App Links verify on hand-installed test builds. Leaving either out costs a
day. `public/.well-known/apple-app-site-association` needs the ten-character
Apple Team ID, as `<TeamID>.ng.rentme.app`.

### MOB-4. Push notifications are not wired, and that is the right order. **P2**

The notification layer exists as database rows with triggers, which is the hard
half. Delivery to a device is separate work and it spends the one permission
prompt a person will ever grant, so it should ship with something worth saying.

### MOB-5. `@capacitor/assets` writes two files that must be deleted after every run. **P1**

`apps/web/icons/` and `apps/web/public/manifest.webmanifest`. The second is the
dangerous one: this app serves its manifest from the typed route
`src/app/manifest.ts`, and a static file in `public/` **shadows a route**, so
leaving it replaces a carefully built manifest with a generated one carrying
relative `../icons/` paths and declaring `.webp` files as `image/png`.

**Do.** Put the deletion in the npm script rather than in a document nobody
re-reads.

### MOB-6. A 1024px master of the house-and-R mark would remove the one enlargement in the pipeline. **P2**

The only master is a 910x857 lockup whose mark is 511x598, so the App Store icon
enlarges it about 1.5x. Every other asset in the pipeline is a reduction. Owner
action: supply a vector or 1024px master.

---

## 16. Testing and enforcement

### T-1. 83 browser specs and 8 vitest files, and no CI runs any of them. **P0**

**Verified today.** `apps/web/tests/*.spec.mjs` is 83 files. `apps/web/src`
carries 8 `*.test.ts` files. There is no `.github/workflows` directory. Vercel
deploys from `main`. So nothing mechanical stands between a red spec and
production.

**Do.** One GitHub Actions workflow: `npm run typecheck`, `npm run lint`, `cd
apps/web && npx vitest run`, `npm run build`, then serve the build and run the
directory of node specs. Add the em dash scan and the attribution scan as steps.

**Why.** Every verification ritual in this repository is a human running commands
from memory, and three separate documents record a session that reported green
when it was not.

### T-2. The node specs are run by hand and the invocation is a known trap. **P1**

**Two traps, both of which have cost full sweeps.**
- **Vitest must be run from `apps/web`.** From the repo root it resolves a
  different config, fails to resolve `server-only`, and reports a wall of
  failures unrelated to the change.
- **`next start` on a held port does not fail loudly.** The old server keeps
  serving and the new process exits, so the sweep silently measures the
  **previous** build. It presents as dozens of unrelated specs failing at once.
  Before trusting a sweep, confirm exactly one `next-server` process and that
  `.next-*/BUILD_ID` matches the build just made. Killing `next-server` alone is
  not enough because `npm exec` respawns it: kill the `npm exec`, the `sh -c` and
  the `next-server` together. `pkill -f "next start"` matches nothing; the
  process is `next-server`.

**Do.** Wrap both in a script that asserts the port is free and the BUILD_ID
matches, then run the directory. The trap is not knowledge, it is a missing
script.

### T-3. `pg_cron` is installed and running six jobs, and every document said it was not. **P0 correction**

**Verified live on 2026-08-09.** `pg_cron` 1.6.4 is **installed**. `cron.job`
holds six active jobs:

| Job | Schedule (UTC) | Runs |
|---|---|---|
| `rentme-nightly-badges` | `20 2 * * *` | `private.sweep_badges()` |
| `rentme_release_stale_holds` | `*/15 * * * *` | `private.release_stale_booking_holds()` |
| `rentme_purge_rate_limits` | `30 * * * *` | `private.purge_rate_limits()` |
| `rentme_purge_idempotency` | `10 2 * * *` | `private.purge_idempotency_records()` |
| `rentme_announce_completed_stays` | `20 5 * * *` | `private.announce_completed_stays()` |
| `rentme-daily-note` | `0 6 * * *` | `private.post_daily_note()` |

`supabase/migrations/20260804184423_the_scheduler_exists_now.sql` did it, and
explains why it is `pg_cron` rather than a Vercel cron: the Hobby plan allows one
invocation per day, and releasing a stale booking hold once a day means a real
bed nobody could book for a whole day.

**Do.** Nothing to enable. Everything gated on "waiting for `pg_cron`" is
unblocked and should be re-read: the reconciliation job in W-6, the notification
retention job, and the badge criteria that need a scheduler. Note that **all
times are UTC**, which this project has been caught by once: the server runs UTC
and Lagos is UTC+1, so a job written for a Lagos hour must be shifted.

**Also do.** Add monitoring. Six unattended jobs writing to a live database with
no alert on failure is a silent dependency. `cron.job_run_details` carries the
outcome; a nightly check of it into `risk_alerts` is ten lines.

### T-4. The migration mirror has drifted in exactly eight pairs, all cosmetic. **P1**

**Diffed today, filename by filename.** 120 versions applied server side, 120
files committed, and the two lists disagree on eight entries each way. Every one
is the same migration under two prefixes, six of them a hand-rounded timestamp
against the real one:

| Committed file | Applied version |
|---|---|
| `20260805161946_one_honest_question_at_the_door` | `20260805162027_one_honest_question_at_the_door` |
| `20260805170000_a_second_admin_and_a_way_to_remove_one` | `20260805153920_a_second_admin_and_a_way_to_remove_one` |
| `20260805183000_the_answers_most_people_here_give` | `20260805164713_occupations_common_rank` |
| `20260806120000_making_somebody_staff_is_not_a_thing_a_signed_in_user_can_do` | `20260806112848_...` |
| `20260807110000_saying_that_address_is_already_signed_up` | `20260807104931_signup_method_for_email` |
| `20260807140000_everybody_arrives_with_a_name_on_them` | `20260807125439_...` |
| `20260807141000_a_google_account_arrives_with_its_name_and_its_face` | `20260807125555_...` |
| `20260807150000_rentme_says_one_useful_thing_a_day` | `20260807131002_...` |

The two whose names differ were read and matched by content: the file
`the_answers_most_people_here_give` adds `occupations.common_rank`, and
`saying_that_address_is_already_signed_up` defines
`public.signup_method_for_email`.

**The one that was genuinely missing is closed.**
`20260807101114_the_last_foreign_key_without_a_covering_index` was recorded server
side with no file; the file is now committed and present on both sides.

**Do.** Rename the eight files to their applied version strings. Then add a CI
check that diffs `supabase/migrations/*.sql` filenames against
`list_migrations` and fails on any difference. Five minutes of renaming buys a
mechanical guarantee that the repository never lies about the database.

**Why.** The rule exists so a filename diff answers the question. Right now that
diff reports eight problems where there is really one habit, which is how the one
real problem hid for a week.

### T-5. Four specs fail and none is caused by application code. **P2**

Each was checked rather than assumed. Re-verify before acting.

| Spec | State |
|---|---|
| `gate` | **Aborts by design** and says so: without `NEXT_PUBLIC_SUPABASE_URL` and the anon key the guard is a pass-through, so it refuses to pretend it proved anything |
| `intent-tune` | `src/lib/interests/schema.ts` and the spec are byte for byte identical to `origin/main`. Red on main |
| `interests-settings` | `welcome/page.tsx` carries no `InterestChoices` mount on this branch or on `origin/main`. Red on main |
| `session-memory` | One check. `ListingsWorkspace.tsx` is byte for byte identical to `origin/main`. Red on main |
| `truncation` | Passes alone. Chromium runs out of room after seventy consecutive launches in this sandbox. Run the suite in batches |

### T-6. Four specs skip loudly when the catalogue is empty. Do not make them pass. **P1**

**If you make them pass by putting invented listings back, you have undone the
point.** The seed catalogue of twenty-three places was deleted because
twenty-two carried `verified: true` with fabricated ratings on addresses that do
not exist. A spec that skips out loud with an empty catalogue is the correct
behaviour and it must survive every future sweep.

### T-7. Em dashes are now confined to the archive. **P1, done**

**Measured today.** Every remaining em dash in this repository is inside
`docs/ui-audit/`, which is now `docs/archive/ui-audit/`. Ten files. They are
historical audit records from one session, and a mechanical replacement would
produce ungrammatical prose in documents nobody will reread.

**Do.** Add the scan to CI (T-1) with `docs/archive/` excluded, and note that
three test specs legitimately **contain** the character because they are the
guards that search for it. A sweep must not "fix" those.

### T-8. Verification ritual, as it actually is. **P0 to follow**

```bash
npm run typecheck                              # all workspaces, must be 0
cd apps/web && npx eslint .                    # from apps/web
cd apps/web && npx vitest run                  # from apps/web, never the root
npm run build                                  # typecheck passing is NOT enough
# then, with the build served on 3210 from apps/web:
cd apps/web && for s in tests/*.spec.mjs; do node "$s" || echo "FAILED $s"; done
node scripts/verify-shots.mjs /route           # 390x844 dark
node scripts/verify-shots.mjs --light /route   # the paper twin, and LOOK at it
```

Playwright uses `playwright-core` with
`executablePath: "/opt/pw-browsers/chromium"`. Do not run `playwright install`.

**A passing typecheck does not mean a passing build.** A client component
importing a value from a server-only module typechecks fine and fails the build.
Put shared constants in a client-safe `*-schema.ts`.

---

## 17. What is not known

Stated plainly, because a recommendation resting on a guess is worse than no
recommendation.

1. **Whether `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` are set in
   the live Vercel environment.** Neither can be read from here. W-1 is the most
   probable cause of the wallet failure and it is a hypothesis with strong
   circumstantial evidence, not a confirmed diagnosis. The confirming test is one
   line: hit `/api/paystack/webhook` with a signed test payload in production and
   see whether a `wallet_entries` row appears.
2. **Whether the deployment at `ninjafinds.vercel.app` is serving this branch.**
   Not verified. The Vercel project is `read-it-well-web`; nothing here confirms
   which git ref it builds.
3. **Whether any of the native builds compile.** MOB-1 lists exactly what was and
   was not proven. No Android SDK and no macOS in this environment.
4. **Whether the light theme passes WCAG AA today.** The last measurement found a
   failure on the most-used text token and predates the token work. D-3 is the
   spec that would answer it. Nobody has run one.
5. **The real drift figures behind D-1.** They were measured against a 3,167 line
   stylesheet that is now 71 lines and 19 partials. Re-measure before quoting.
6. **Whether the four locale files read naturally.** Yorùbá, Hausa and Igbo are
   complete, use correct diacritics and hooked letters, and were not written by
   native speakers. Two specific terms are flagged as possibly unidiomatic: the
   Igbo section title `Ọnụọgụgụ` for Analytics and the Yoruba `Ìdíwọ̀n` for a
   guest rating. Marketing copy in particular should be rewritten from intent
   rather than corrected word by word.
7. **What "district should feed instantly" meant.** An owner instruction that cut
   off mid-sentence. It concerns the social layer. Ask rather than guess.
8. **Whether NaijaFinds Pro is in scope.** The only genuine survivor of the old
   blocked-decisions table. Still open with the owner.
9. **Whether hosts should ever see an aggregate save count.**
   `saved_items` is owner-only by policy, so a host's client cannot read it, and
   the analytics read deliberately does not bypass that with the service role.
   Separately the number would be wrong anyway: a signed-out visitor's saves live
   in `localStorage` and a cookie and never become rows. This is a privacy
   posture decision, not an implementation detail.
