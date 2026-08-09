# RentMe recommendations

This is the second full pass. The first was written on 2026-08-09 and carried 79
entries. A great many of them have since been built, and the point of this file
is that it says so, entry by entry, with the commit or the migration that did it,
rather than quietly rotting into another document that describes a platform which
no longer exists. That is exactly how its predecessor died.

Every claim below was checked on **2026-08-09** against the code in the working
tree, the migration files, or the live Supabase project `uccixoonmbhrnyczyigt`.
Nothing here is remembered. Where something could not be verified from inside
this environment it is in section 23 rather than softened into a claim.

Read `docs/PRODUCT.md` first. It says what the product is. This file says what is
wrong with it and what to do next.

---

## How to read this file

**Status.** Every entry carries one, and the status is the first thing on the
line so the file can be skimmed for what is left.

| Status | Means |
|---|---|
| **DONE** | Verified fixed. Kept, with the evidence, so it is not rediscovered |
| **PARTLY DONE** | Some of it landed. The entry now describes only the remainder |
| **OPEN** | Not started, or started and not landed |
| **WITHDRAWN** | The recommendation was wrong, or the world moved. Says why |
| **NEW** | Added in this pass |

**Priority.** P0 blocks launch or is actively lying to a user today. P1 is
required before real money and real people arrive at scale. P2 is genuine
improvement that can wait.

**Line numbers move; symbol names do not.** Search for the name.

**Contents.**
[The wallet incident](#0-the-wallet-incident-a-case-study) ·
[Scope](#1-product-scope-and-terminology) ·
[Design](#2-design-system-and-theming) ·
[Navigation](#3-navigation-and-information-architecture) ·
[Discovery and the map](#4-property-discovery-and-the-map) ·
[Data model](#5-property-data-model) ·
[Wallet](#6-wallet-and-payments) ·
[Escrow](#7-escrow) ·
[Commission and fees](#8-commission-and-listing-fees) ·
[KYC](#9-kyc-and-identity) ·
[Trust](#10-verification-and-trust) ·
[The empty shelf](#11-the-demo-property-ecosystem) ·
[Media](#12-media-photographs-and-video) ·
[Social](#13-social-layer) ·
[Assistant](#14-ai-assistant) ·
[Emails](#15-emails) ·
[Legal](#16-legal-and-privacy) ·
[Security](#17-security) ·
[Performance](#18-performance) ·
[Stores](#19-mobile-and-store-readiness) ·
[The rename](#20-the-rename) ·
[Testing](#21-testing-and-enforcement) ·
[Migrations](#22-the-migration-mirror) ·
[Unknowns](#23-what-is-not-known)

---

## 0. The wallet incident: a case study

This section is not a recommendation. It is the record of the most instructive
failure this codebase has produced, written down because the lesson generalises
to every path that touches money, and because **the fix is only one third
applied**. Read CASE-1 before writing anything in `lib/wallet`, `lib/payments`,
`lib/bookings` or `app/api/paystack`.

### CASE-1. A funding was paid for and the wallet showed zero. **P0, and the fix is incomplete**

**What the user saw.** Money left a card. The wallet showed a balance of zero
and an empty statement. It kept showing zero for days. Nothing anywhere said
anything had gone wrong. There was no error toast, no support ticket trigger, no
log line, no failed delivery in the processor's dashboard.

**The four failures, and they are four, not one.**

**One: the configuration failure.** `getAdminClient()` in
`apps/web/src/lib/wallet/ledger.ts` returns `null` when
`SUPABASE_SERVICE_ROLE_KEY` is absent or empty, and swallows the throw. Every
caller treats null as "not configured" and gives up. Both settlement paths, the
webhook and the redirect verify, take that branch identically. So a single
missing environment variable disabled the entire money path without disabling
the ability to take money.

**Two: the acknowledgement failure.** `apps/web/src/app/api/paystack/webhook/route.ts`
answers HTTP 200 on **every** branch. Read `acknowledged()` at `:70-72`: it is
hard-wired to `{ status: 200 }`, and it is the only response this file can
produce. It is returned when the body cannot be read (`:237`), when Paystack is
unconfigured (`:241`), when the admin client is null (`:243`), when the signature
does not verify (`:246`), when the JSON does not parse (`:252`), and on the
success path (`:281`). A 200 tells Paystack the delivery was accepted. Paystack
therefore never retries, and the delivery is not merely lost, it is **discarded
with a receipt**. The processor's delivery log stays green, which is the first
place anybody would look.

Fail-open is correct for a rate limiter, where the alternative is denying a real
user. It is catastrophic for a payment webhook, where the alternative is a
retry that would have worked.

**Three: the silence.** Before the observability module there were zero
`console` calls anywhere in `lib/wallet`, `lib/payments`, `lib/bookings` or the
webhook route, while 36 lived elsewhere in the application. Every other part of
the platform was noisier than the part handling money. There was no line to
grep for, no line to alert on, and nothing for the owner to paste into a support
conversation.

**Four, and this is the one worth naming.** The read path caught its own error
and returned a confident zero. `getWalletForViewer()` wrapped the statement read
in a try/catch and, on failure, returned `{ balanceMinor: 0, entries: [] }`.
That is not a degraded read. That is a **different claim**. "I could not read
your balance" and "your balance is zero" are opposite statements, and the code
turned the first into the second, in the largest typeface on the platform, next
to a naira sign.

**The lesson, stated so it can be quoted.**

> A money path that cannot fail loudly will fail silently. And a balance is a
> claim about somebody else's money, so when we cannot make that claim we must
> not fake it. An unknown is not a zero.

**What has actually been fixed, verified in the tree today.**

- `apps/web/src/lib/payments/observability.ts` exists. It is a good module: a
  closed vocabulary of seven surfaces and seven outcomes, a one-line greppable
  shape, an explicit list of what may never be logged, amounts in integer kobo
  because "the ledger disagrees with the processor by 250000" is the sentence
  reconciliation exists to produce, and a `logMoney` that can never throw.
- `getWalletForViewer()` now logs on the catch branch and returns
  `readFailed: true` alongside the zero.
- The seeded wallet is gone from `lib/wallet/repository.ts` rather than merely
  unused, with the reasoning written at `:24-39`. A signed-out visitor was being
  shown a balance of 258,450.75 naira and a full day-grouped statement including
  a GTBank withdrawal to an account ending 1294. That is deleted, not disabled.

**What has NOT been fixed, and each of these is the incident's actual mechanism.**

1. **The webhook is still silent.** `logMoney` is called **exactly once in the
   entire codebase**, at `lib/wallet/repository.ts:146`. Grep it. There is not
   one call in `app/api/paystack/webhook/route.ts`, not one in
   `lib/wallet/actions.ts`, not one in `lib/wallet/ledger.ts`, not one in
   `lib/payments/paystack.ts`, not one in `lib/bookings/checkout.ts`, not one in
   `lib/bookings/settlement.ts`. The module that exists to make failure three
   impossible is wired into the read path only. The write path, which is where
   the money was lost, says nothing.
2. **The webhook still answers 200 on the unconfigured branch.** `:241-243` is
   unchanged. A missing service key is still an irrecoverable lost funding with
   a green delivery log.
3. **The bare catch is still bare.** `:276-279` swallows every throw from
   `recordFunding`, `settleBookingCharge`, `markChargeFailed` and
   `settleWithdrawal` with an empty block and a comment. A write that threw
   half-way through settling a booking produces no line anywhere.
4. **`readFailed` is produced and never consumed.** It is set in
   `repository.ts`, typed in `lib/wallet/types.ts:68`, and read by nothing.
   `app/(app)/wallet/page.tsx:47` calls `getWalletForViewer()`, branches on
   `wallet.live`, and passes `wallet.balanceMinor` straight into `<BalanceCard>`.
   On a read failure the page still draws a confident zero. The comment at
   `repository.ts:123` says the screen "can say the balance could not be read
   instead of printing a zero that looks like an answer". No screen does. The
   exact defect the case study is about is still live in the user interface.

**Do, in this order, and treat it as one piece of work.**

1. Read `wallet.readFailed` on `app/(app)/wallet/page.tsx` and render a distinct
   state: no figure, no sparkline, no in and out tiles, a plain sentence saying
   the balance could not be read and that no money has moved, and a retry. This
   is the smallest change on the list and it closes failure four. Do it first.
2. Call `logMoney` on every branch of the webhook that returns, including the
   success path with `outcome: "posted"`, and inside the bare catch with
   `outcome: "failed"` and `failureReason(error)`. Seven call sites.
3. Split `acknowledged()` in two. Keep 200 for anything that is the sender's
   fault or genuinely not our business: an unparseable body, a bad signature, an
   event we do not handle, a reference shape we do not issue. Return **500** for
   anything that is our fault and that a retry would fix: no admin client, no
   Paystack configuration, an exception out of a settlement call. Paystack
   retries a 500 with backoff, which is precisely the behaviour that would have
   saved the lost funding.
4. Add `logMoney` to `fundWallet`, `withdraw`, `transferToUser`, `payWithWallet`
   and the redirect verify path, on both the taken and the refused branch.
5. Add a boot-time line, once per process, naming every server-only key that is
   absent. Not a throw: this platform is designed to boot with an empty
   environment. A line, so the absence is visible in a deployment log rather
   than only in a probe.
6. Add a spec that fails the build if `getAdminClient()` returns null anywhere
   without an adjacent `logMoney` call. The habit is what failed, not the code.

**The generalisation, which is the reason this section exists.** Three separate
mechanisms all had to agree to hide this: a silent configuration fallback, an
acknowledgement that lied to the only system that would have retried, and a read
that converted an error into a number. Any one of them alone would have been
survivable. Every future money surface has to be reviewed against all three
questions: what happens when the environment is incomplete, what do we tell the
system upstream of us, and what do we tell the user when we do not know.

---

## 1. Product scope and terminology

### S-1. The npm scope, the package description and the repository still say NaijaFinds. **OPEN. P1**

Superseded in scope by section 20, which is now the full sequence. The counts
there were re-measured today and are larger than previously recorded.

### S-2. Third-party inventory is gone from the code and from the database. **DONE. Was P1**

**Verified live.** `to_regclass('public.places_cache')` and
`to_regclass('public.partner_stay_intents')` both return null. `feature_flags`
holds exactly eight rows and neither `hybrid_hotels` nor `hybrid_restaurants` is
among them: `agent_listings, assistant, bookings, events, messaging, social,
support, wallet`. The 243 rows of cached Google Places payloads went with the
table. Migration `20260809090000_nothing_here_came_from_somewhere_else`, applied
as version `20260809044320`, and commit `0ec6656`. 6,043 lines of provider code
were deleted in the same sweep.

**Residual, and it is small.** Confirm `LITEAPI_KEY`,
`LITEAPI_WHITELABEL_DOMAIN`, `GOOGLE_PLACES_API_KEY` and
`GOOGLE_ROUTES_API_KEY` are removed from the Vercel project as well as from
`.env.example`, and that `docs/ENVIRONMENT.md` section 3 no longer documents
them as live features. A key left in an environment is a key that can still be
billed and can still leak.

### S-3. Restaurants and hotels are in the taxonomy and have no supply story. **OPEN. P2**

**Unchanged and still a decision, not a build.** `property_type` still carries
all ten values including `restaurant` and `hotel`, verified live. The restaurant
reservation loop still exists end to end and still holds zero rows. Nothing in
the property migrations touched either.

**Do.** Decide, and write it in `docs/PRODUCT.md`, whether RentMe recruits
restaurants and hotels in year one or whether these kinds stay in the schema and
off the marketing. This is now more pressing than it was, because `listing_intent`
has only two values, `rent` and `sale`, and a hotel is neither. See P-7.

### S-4. The lexicon is settled and only partly enforced. **PARTLY DONE. P2**

**What exists.** `docs/PRODUCT.md` section 6 is the vocabulary. Four specs
already enforce the harder half of it: `agent-identity.spec.mjs:48`,
`checkout.spec.mjs:175`, `email-render.spec.mjs:266` and `error-copy.spec.mjs:273`
all reject `demo`, `sample`, `preview` and `not live` in copy, and
`around-feed.spec.mjs:101` adds `coming soon` and `lorem`.

**What does not.** Nothing greps for the *synonym* half: host, landlord,
compound, hub, gist, ban. Those are the words that drift back, because they are
not obviously wrong to somebody who has not read the table.

**Do.** One spec that reads the four locale files and every string literal in
`components/` and `app/`, and fails on a banned synonym with the file and line.
Ten lines of Node. Allow-list the legitimate uses: `ban` inside `banner`, and
`compound` where it means a Nigerian compound in property copy rather than the
social layer.

---

## 2. Design system and theming

### D-1. Colour enforcement landed. Type and geometry are still unenforced. **PARTLY DONE. P1**

**Done, and confirmed.** `apps/web/eslint-rules/no-raw-colour.mjs` errors on raw
hex, raw `rgb`/`hsl`, Tailwind palette classes including `bg-black/45` and
`text-white/70`, and any layer-1 token reference. It is wired as an error in
`eslint.config.mjs` and `apps/web/scripts/check-css-tokens.mjs` covers what the
AST rule cannot see. Layer-1 token leakage in components and stylesheets is
reported as zero and the build fails on a raw colour. It deliberately ignores
comments, which is right: half the value of this codebase is comments quoting
the literal they replaced.

**Still open.** There is no `tailwind.config`, and nothing checks the type scale
or control geometry. The previously quoted figures (768 arbitrary `text-[…rem]`
literals across 35 values, 12 button implementations across 7 heights) were
measured against a 3,167 line `globals.css` that is now 71 lines and 19 ordered
partials under `apps/web/src/app/css/`, with a 12 component `components/ui/`
primitive layer underneath. **Re-measure before quoting any of them.** They are
the argument for enforcement, not an inventory.

**Do.** Extend the proven rule to reject arbitrary `text-[…]`, `h-[…]`,
`rounded-[…]` and `shadow-[…]` outside a short allow-list. Ship it as a warning,
count, publish the count here, then set a date to make it an error. Do not ship
a config that fails on three thousand pre-existing violations; it gets disabled
within a week and then the rule is worse than nothing because its absence looks
like compliance.

### D-2. The retired reference brief is still in the code. **PARTLY DONE. P1, down from P0**

**One of the four is resolved.** `BrandIcon`'s `tile` prop now defaults to
`false` (`apps/web/src/design-system/icons/BrandIcon.tsx:103`), which removed the
tinted tile from 142 of 149 call sites. The comment at `:18-32` records that a
tile is now something a surface asks for and the answer is usually no, and it
handles the consequence properly: an untiled object gets a single flat
`--nf-icon-ground` plate rather than becoming invisible.

**Still shipping from the retired brief.** `apps/web/src/app/css/symbols.css` is
a whole partial of symbol effects whose own header cites "the reference set's
headline feature". `.nf-dock-island` in `chrome.css` is the floating pill tab bar
and `MobileTabBar.tsx` still expands the active tab into a labelled capsule on a
spring.

**Do.** Decide per item, on merit rather than provenance. Recommendation
unchanged: keep the island dock and the labelled capsule, both are good mobile
patterns and both are well built. Audit `symbols.css` and cut every effect that
fires on mount rather than on a state change. An icon that animates when a page
loads is decoration; an icon that animates when a notification arrives is
information. Do not reintroduce tinted tiles or photo chips.

### D-3. Light mode is a real theme and nothing proves it stays one. **OPEN. P1**

Unchanged. `apps/web/src/app/css/light.css` is a designed paper twin and
`packages/design-tokens/src/tokens.css` opens a full `:root[data-theme="light"]`
block. There is still no contrast spec in `apps/web/tests/`.

**Do.** One browser spec: walk every route at 390px in both themes, compute the
real composited contrast of every text node against its real painted background,
fail below 4.5:1 for body text and 3:1 for large text. **Walk the background up
past transparent ancestors.** A previous probe scored against `rgba(0,0,0,0)`
because its walk stopped at `<body>`, which is why the last measurement is not
trustworthy in either direction.

### D-4. Two sheet implementations, one bug fixed and the duplication left. **OPEN. P2**

Unchanged. `components/ui/Sheet.tsx` is the primitive with a drag handle, detents
and a `[data-open]` transform. `components/app/account/rows.tsx` carries an older
simpler one that all eight surfaces across `/profile` and `/settings` use. The
shared `.nf-sheet` class name made the older one unreachable under reduced
motion; renaming it to `.nf-rows-sheet` fixed the bug and not the duplication.

**Do.** Migrate the eight call sites to the primitive and delete the older
family. Real work, worth doing once. Note that the rename means the two can now
coexist indefinitely without anybody noticing, which makes this less urgent and
more likely to be permanent.

### D-5. The `.nf-icon-chip` wrapper documented in the icon system does not exist. **DONE. Was P2**

`docs/ICON_SYSTEM.md` has been corrected. Recorded so nobody adds the class back
on the strength of the old text.

### D-6. There is no visual regression guard on any of the above. **NEW. OPEN. P2**

**Wrong today.** `scripts/verify-shots.mjs` renders a route at 390x844 in dark
and light and a human looks at it. That is a good tool and it is not a guard:
nothing compares today's render to yesterday's, so a change that quietly moves
every heading down four pixels across the platform passes every spec.

**Do.** Not full pixel diffing, which is a maintenance tax on a design still in
motion. Instead, a structural snapshot: for eight representative routes in both
themes, record the computed font-size, line-height, colour token and border
radius of every element carrying a `nf-` class, and diff that. It catches the
class of change that matters (a token silently resolving differently, a
primitive losing its geometry) and ignores the class that does not (content
moving).

---

## 3. Navigation and information architecture

### N-1. Signed-out visitors can now browse. **DONE. Was P0**

**Verified in the tree.** `apps/web/src/middleware.ts` `PRODUCT_SEGMENTS` no
longer contains `search`, `listing`, `rent`, `around`, `u` or `post`. What
remains behind the wall is fifteen segments: `assistant`, `bookings`,
`checkout`, `home`, `legal`, `messages`, `notifications`, `profile`, `saved`,
`settings`, `stories`, `wallet`, `admin`, `agent`, `welcome`, plus three exact
paths, `/agents/apply`, `/agents/status` and `/styleguide`. Commit `545a1b6`. A
client gate, `components/auth/AuthGate.tsx`, draws the second half of the line
for individual controls on a page a stranger may read.

**Two deliberate deviations from the original recommendation, and both are
better than what was recommended.** `stories` was recommended as public and is
gated, because a story view is a write against somebody's post and it counts
viewers, so there is nothing to read there anonymously. `legal` was recommended
as public and is gated, because the canonical documents at `/privacy` and
`/terms` are open and `/legal/*` is only the in-product copy of the same text.
Both reasons are written in the file. Recorded here so the recommendation is not
re-applied against the better answer.

**One thing to check that nobody has.** The rule is now drawn in two places and
they have to agree. There is no spec asserting that. See T-9.

### N-2. Nothing tells a crawler anything. **OPEN, and now unblocked. P1**

**Verified today.** No `apps/web/src/app/robots.ts`. No
`apps/web/src/app/sitemap.ts`. No `application/ld+json` anywhere in
`apps/web/src`.

This was blocked on N-1, which is now done, so it is next. A crawler is an
anonymous visitor and until this week there was nothing for one to read. Now
there is, and nothing tells it so.

**Do, in this order.**
1. `app/robots.ts`, disallowing `/admin`, `/agent`, `/checkout`, `/settings`,
   `/wallet`, `/messages`, `/welcome` and `/styleguide` explicitly. Belt and
   braces: the console currently relies entirely on per-page `robots: { index:
   false }` metadata, and one page added without it is a console in a search
   index.
2. `app/sitemap.ts` enumerating published listings, area pages and site pages.
   With zero published listings this generates almost nothing today, which is
   fine: the machinery must exist before the catalogue fills, not after.
3. JSON-LD on `/listing/[id]`. Use `RealEstateListing` for a rental and
   `Product` with an `Offer` for a sale, because the two intents now genuinely
   differ in the schema and Google treats them differently. `Organization` on
   the landing page. Do **not** emit `aggregateRating` until real reviews exist;
   a structured-data rating with no reviews behind it is a manual action.
4. Open Graph images per listing. A property link shared on WhatsApp with no
   preview card converts at a fraction of one that has a photograph, a price and
   an area, and WhatsApp is how Nigerian property actually travels.

### N-3. There is no indexable page for the query the product most wants to rank for. **OPEN. P1**

Unchanged and now unblocked by N-1. `/search` is still the only discovery surface
and it is a query-string screen. `public.local_governments` holds 774 rows and
`public.states` holds 37, verified live, so the URL space and its content exist
in the database already.

**Do.** `/city/[slug]` first, generated from `states` and `local_governments`,
each carrying published listings for that place plus the place's own Around feed.
Then `/area/[slug]` beneath it. Then `/season/[slug]`, starting with Detty
December, because that search intent begins in September and the platform has no
page a search engine can rank for the largest demand spike of the Nigerian year.

**Now that the schema can express intent, split the templates.** `/city/lekki`
should not be one page. `/rent/lekki`, `/buy/lekki` and `/shortlet/lekki` are
three different queries with three different intents and three different sets of
competitors, and `listing_intent` plus `property_type` now make all three a
trivial filter. One page trying to rank for all three ranks for none.

### N-4. Google and Apple sign in are still in the codebase. **OPEN. P0**

**Re-verified today, unchanged.** `startGoogleOAuth` at
`apps/web/src/lib/auth/actions.ts:660` and `startAppleOAuth` at `:664` both still
exist. `components/auth/AuthChoices.tsx` still references them. The product
decision is email and password only.

**Do.** Delete both server actions, the provider module, the buttons and the
`NEXT_PUBLIC_AUTH_PROVIDERS` variable. Leave the signup trigger's Google metadata
reading alone: it is harmless and removing it is a migration for no gain. Correct
`docs/DEPLOY.md` sections 4.2 and 4.3.

**Why this is still P0 and has got slightly worse.** The buttons render disabled
today because no provider is listed, so the front door shows two dead controls.
The moment anybody sets that variable they are live, and the OAuth return journey
on native is not closed, so a native user would be left signed out. And the
`apple-app-site-association` file now explicitly excludes `/auth/*` with a comment
explaining that the PKCE verifier and cookies live in the system browser, which
is correct handling of a feature the product has decided not to have. Deleting
the feature deletes the exclusion, the Apple guideline 4.8 obligation and the
native return problem in one go.

### N-5. ADR-007 describes a flat twelve and the navigation is a grouped tree. **OPEN. P2**

Unchanged. `components/app/nav-model.ts` builds a grouped tree; the mobile dock is
six destinations. All three shapes are defensible and none matches the ADR.

**Do.** Amend ADR-007 to record the grouped tree as the decision, with the reason
already written in `nav-model.ts`: five of the twelve were `?type=` variants of
one screen sitting at the same level as Wallet. A frozen-navigation rule that the
navigation does not follow constrains nobody.

### N-6. There is still no Buy or Sell anywhere in the navigation. **OPEN, and now the blocker has moved. P0**

**This has changed category.** It used to be a data model problem, and the data
model is now fixed: `listings.listing_intent` exists as an enum of `rent` and
`sale`, and `sale_price_minor`, `tenure`, `sale_status`, `year_built`,
`size_sqm` and `price_negotiable` are all live columns. Verified.

So the only remaining reason there is no Buy is that nobody has built the front
end. Grep `nav-model.ts` for `/buy` or `/sell`: nothing.

**Do.**
1. A top-level Buy destination in the rail and the dock, and a Sell entry point
   in the agent workspace.
2. `/search` must read `listing_intent` as a first-class filter, not a
   `property_type` proxy. A three-bedroom flat can be for rent or for sale and
   the type is the same in both cases.
3. The sale detail page is the rental page with a different noun and three
   changes: no Reserve, no availability calendar, and a title and tenure panel
   that is the most important block on the screen. See P-8.
4. Price display has to switch vocabulary. A rental says "per year". A sale says
   a price and, if `price_negotiable`, says so, because in Nigerian property
   sale a listed price is an opening position and pretending otherwise makes the
   platform look foreign.

---

## 4. Property discovery and the map

The map is much further along than any previous document records, and the new
PostGIS work has not been connected to it. Both facts are below.

### M-1. The map draws on CARTO tiles, which are non-commercial only. **OPEN. P0**

**Unchanged and still the only item on this list that arrives as a letter rather
than a bug report.** `apps/web/src/lib/maps/tiles.ts` is an unusually good
module: it treats this as a licensing problem before a rendering one, carries the
attribution *with* the tile URL so a provider swap cannot silently keep the wrong
credit, and exposes a `nonCommercial` boolean so a pre-launch check can read one
value instead of parsing a URL. It defaults to CARTO and moves to MapTiler the
moment `NEXT_PUBLIC_MAPTILER_KEY` is set.

**Do.** Owner action, one signup at `cloud.maptiler.com/account/keys`, one
environment variable. Then add the `nonCommercial` boolean to a launch checklist
spec so the build refuses to be called production-ready while it is true.

### M-2. Leaflet's stylesheet ships on every page. Deliberately. **WITHDRAWN as work. P2**

Measured twice by two people. The map's JavaScript is properly lazy; the
`import "leaflet/dist/leaflet.css"` in `MapCanvas.tsx` is static and costs about
10KB everywhere. Both clean fixes cost more than they save: a dynamic import
renders the map unstyled for a frame, and hand-copying the rules creates a copy
that rots. **Do nothing.** Recorded so it is not measured a third time.

### M-3. Listings have no enforced coordinates, so the map places by area centroid. **OPEN, and now more urgent. P1**

**Verified.** `listings.latitude` and `.longitude` are still nullable. The new
`location` geography column is maintained by trigger *from those two columns*, so
a listing with no pin has no geography either, and `listings_in_bounds` cannot
return it at all. `RealMap.tsx` degrades to `localityFor`, the real centroid of
the area, and fans coincident pins out by about six hundred metres so a pair in
Victoria Island stays readable. That degradation is well built and it is not a
substitute.

**Why this is now urgent rather than merely important.** Before PostGIS, a
missing pin meant an approximate marker. Now it means **the listing is invisible
to every viewport query**. The degradation and the new query path disagree about
whether the listing exists.

**Do, before the catalogue fills, and this is cheap only while `listings` holds
zero rows.**
1. Make the pin a required step in the agent wizard, with the area centroid as
   the draggable starting position so it is one gesture rather than a search.
2. Add a check constraint: a listing may not reach `PUBLISHED` without both
   coordinates. Enforce it in the database, not the wizard, because the wizard
   is one of several writers.
3. Decide the privacy posture now. A rental's exact address is a safety question
   before an inspection is agreed. The usual answer is a jittered circle of
   about 200m for anonymous viewers and the true pin once a conversation exists,
   and that decision has to be made before the first agent drops a pin, because
   it changes what gets stored.

### M-4. PostGIS is installed and nothing uses it. **PARTLY DONE, and this is the gap. P1, up from P2**

**Verified live.** `postgis` 3.3.7 is installed. `public.listings.location` is a
`geography` column. `public.listings_in_bounds()` exists. There is a partial GiST
index; `listings` carries 17 indexes in total. The function is deliberately not
`SECURITY DEFINER`, so RLS decides visibility rather than a second implementation
of the publication rule, which is the right call and worth keeping.

**And nothing calls it.** Grep `listings_in_bounds` across `apps/web/src`: the
only hit is the generated `database.types.ts`. Grep for `.location` as a listing
field: nothing. `RealMap.tsx` is a server component that reads the **entire
catalogue** through `getListingRepository()`, converts every row to a pin, and
ships all of them to the client, where `MapCanvas` clusters them in pixel space.

That works perfectly at zero listings and at a hundred. It falls over somewhere
around a few thousand, and it falls over in the worst way: not with an error, but
with a slow page and a large payload on a metered Nigerian data bundle.

**Do.** This is the single largest piece of discovery work outstanding, and M-5
through M-11 below break it down.

### M-5. Viewport loading: the map should ask for what is on screen. **NEW. OPEN. P1**

**Wrong today.** The map receives the whole catalogue on the server and never
asks for anything again. Panning to Abuja re-uses the pins that were shipped for
Lagos, which is correct only because both fit in one payload.

**Do.**
1. A route handler or server action that takes a bounding box, the current
   filters and a limit, and calls `listings_in_bounds`. Return the minimum a pin
   needs: id, lat, lng, price minor, intent, type, one photograph path. Not the
   description, not the fee breakdown, not the amenities.
2. **Cap the result and say so.** Return a `truncated` flag with a total count
   when the box holds more than the cap, and draw a real control: "1,240 places
   here, showing 300. Zoom in or refine." Silently truncating a map is how a
   user concludes the platform has no stock in their area.
3. Keep the server-rendered first paint. The initial view should still arrive
   with its pins in the HTML, because the first frame is what a crawler and a
   slow connection see. Viewport loading is for what happens after the first
   gesture, not instead of it.
4. Abort the in-flight request on the next gesture. A user panning across Lagos
   generates a queue of stale responses and the last one to arrive wins, which
   is not the same as the last one requested.

### M-6. Debouncing, and the specific numbers. **NEW. OPEN. P1**

**What exists.** `MapCanvas.tsx` already listens on `moveend` rather than per
frame, and writes the viewport to the address bar so a shared URL is what is on
screen. That is the right event and the right instinct.

**What is missing** is any delay between `moveend` and a network request,
because there is no network request yet.

**Do, with these defaults, and tune them against real Nigerian latency rather
than a local machine.**
- **Pan and zoom to fetch: 400ms of quiet after `moveend`.** Not 150ms, which is
  a desktop reflex and generates three requests during one thumb flick on a
  phone. Not a second, which feels broken.
- **Do not fetch at all** if the new bounding box is contained within the box
  already fetched and the zoom has not crossed a tier boundary. This alone
  removes most requests, because the common gesture is a small pan inside an
  area already loaded.
- **Fetch on zoom out immediately**, without waiting for quiet, because zooming
  out always reveals area that was never loaded and the delay is visible as a
  hole.
- **Keep the URL write on `moveend` with no delay.** It costs nothing and it is
  what makes the back button and a shared link behave.

### M-7. Clustering by zoom tier, not by pixel grid alone. **NEW. PARTLY DONE. P1**

**What exists and is good.** `clusterByGrid` in `MapCanvas.tsx` groups pins into
cells roughly two pin widths across, and clicking a cluster calls `flyToBounds`
on its members. Pixel-space clustering is the right technique because it is
resolution-aware by construction: a cluster is whatever would visually collide.

**What is missing** is that the cluster means different things at different
zooms and currently looks the same at all of them.

**Do. Four tiers, and give each one its own mark.**

| Zoom | What the map is showing | The mark |
|---|---|---|
| 5 to 8 | Nigeria, states | State name, a count, a floor price. No pins |
| 9 to 11 | A state, its local governments | LGA name, count, floor price |
| 12 to 14 | A city, its areas | Area name, count, floor price. Pixel clustering starts here |
| 15+ | A street | Individual price pins |

The floor price on a cluster is the thing that makes a map browsable in this
market. "Lekki, 340 places, from 1.2m a year" is a decision. "340" is not.

**Compute the tiers in Postgres, not the browser.** At zoom 5 the browser should
receive 37 rows, one per state, not 40,000 listings to count. That is a second
RPC alongside `listings_in_bounds`: given a box and a tier, return grouped counts
and minimum prices keyed by state code or LGA code. The columns to group on
(`state_code`, `city`, `area`) already exist on `listings`.

### M-8. Marker design. **NEW. OPEN. P1**

**Wrong today.** Pins carry a formatted price and a category noun for listings
with no amount. Nothing distinguishes a rental from a sale, and after the schema
change that distinction is the primary axis of the product.

**Do.**
1. **A price pin, not a teardrop.** A rounded rectangle carrying the price is
   the pattern this audience already reads, and it is legible where a pin is
   ambiguous. The point of the shape must sit on the coordinate.
2. **Intent is the shape, not the colour.** Rent and sale need to be
   distinguishable by somebody who cannot see the difference between two blues,
   and the brand is one blue family with no second hue available. Use the label:
   "1.2m/yr" against "45m". The period suffix is the signal and it is free.
3. **Three states, all needed.** Default, hovered or focused (paired with the
   list card, see M-9), and visited. Visited matters more on a map than
   elsewhere because the whole gesture is repeated scanning.
4. **The selected pin rises and the others recede.** Not by colour change, by
   z-order and a slight scale, because the map has to stay readable underneath.
5. **A cluster is a different object, not a bigger pin.** A circle with a count
   and a floor price. If it looks like a pin, people click it expecting a
   listing and get a zoom, which reads as a misfire.
6. **Nothing on a marker may imply verification.** No tick, no shield, no badge.
   See section 11.
7. **Test at 390px with a thumb.** A 44px minimum touch target is not negotiable
   and price labels overlap far sooner than the pixel-grid cell size suggests,
   because the cell was sized for pins and a price label is three times wider.

### M-9. Map and list split on desktop, map with a bottom sheet on mobile. **NEW. OPEN. P1**

**Wrong today.** `components/app/filters/ViewToggle.tsx` is 49 lines and toggles
between list and map. They are alternatives. On a desktop screen that wastes
half the window and forces the user to hold the map in their head while reading
the list.

**Do. Desktop, at 1024px and above.**
- Persistent split: list on the left at a fixed comfortable width, map filling
  the rest and sticky. Not 50/50; the list is where the reading happens.
- **Hover on a card highlights its pin, hover on a pin highlights its card and
  scrolls it into view.** This is the single feature that makes a split view
  worth building, and it is the one most often left out.
- Clicking a pin opens a compact card anchored to it, not a navigation. The
  navigation is the second click.
- The list is the viewport's contents, ordered. When the map moves, the list
  changes. If the two ever disagree the feature is worse than either half alone,
  which is why M-5 must return one result set that feeds both. Today `RealMap`
  reads the catalogue itself, separately from the page that renders the results
  header, and its own comment flags that as a known hazard.

**Mobile, below 1024px.**
- Map full bleed, with a bottom sheet over it at three detents: a peek showing
  the result count and a single card, a half sheet showing a scrollable list,
  and full. `components/ui/Sheet.tsx` already implements detents and a drag
  handle, so this is an application of an existing primitive.
- Dragging the sheet down must not also pan the map. This is the bug every
  implementation of this pattern ships first.
- The sheet must clear the home indicator and the island dock. See MOB-8.
- Keep the toggle as well. Some people want a list and no map, and on a metered
  connection a list is a fraction of the bytes.

### M-10. Search this area. **NEW. OPEN. P1**

**Wrong today.** Panning silently keeps the previous result set. There is no
control and no indication that what is on screen and what is in the list have
diverged.

**Do.**
1. A "Search this area" chip that appears over the map only when the viewport
   has moved meaningfully from the last search: more than about a third of the
   box width, or a zoom tier change. Not on every twitch.
2. Plus a "Search as I move" toggle, remembered per user. Both behaviours have
   real constituencies and the fight over which is default is not worth having.
   The chip is the correct default because an automatic re-search on a metered
   connection spends somebody's data without asking.
3. When the chip is showing, the list must say so: "Showing 24 places from your
   last search." Divergence that is not stated is the actual defect; the chip is
   only the remedy.
4. Both the box and the toggle state belong in the URL, which `writeViewport`
   already does for the box.

### M-11. Discovery items that still need inventory before they can be checked. **PARTLY DONE. P2**

Carried forward with their evidence so they are not rediscovered. None can be
verified against an empty catalogue: total price first with a per-period toggle;
the price breakdown staying expandable at every step; search scroll position
surviving a return from a listing; long-press quick actions on a card; alt text
required at photo upload.

**Two corrections to the previous version of this entry.** "A search this area
chip on map pan" and "map and list hover synchronised" have been promoted out of
this list into M-10 and M-9, because they do not need inventory to build, only to
admire. And **there is now a caution deposit in the schema**:
`listings.caution_deposit_minor`. The previous instruction not to invent one is
withdrawn, because the owner has since specified the full Nigerian rental fee
breakdown. See P-2.

---

## 5. Property data model

`public.listings` now carries **60 columns**, counted live. That is the largest
single change since the last pass and most of this section is now a record of
what landed rather than a request.

### P-1. The listing can express a sale. **DONE. Was P0**

**Verified live, column by column.** Migrations `20260809100000` through
`20260809101500` in the tree, applied as versions `20260809044441` through
`20260809044629`, commit `5e5aa79`.

| Landed | Shape |
|---|---|
| `listing_intent` | enum `rent`, `sale` |
| `sale_price_minor` | bigint |
| `price_negotiable` | boolean |
| `tenure` | enum, six Nigerian titles |
| `sale_status` | enum `available`, `under_offer`, `sold` |
| `year_built`, `size_sqm`, `toilets`, `parking_spaces`, `floor`, `total_floors` | the facts a listing states |
| `condition` | enum `newly_built`, `renovated`, `old`, `off_plan` |
| `furnished` | enum `unfurnished`, `semi_furnished`, `fully_furnished` |
| `address_verified_at`, `physically_inspected_at`, `verified_by` | verification as timestamps, not flags |

**Three deviations from what was recommended, and all three are defensible. Read
them before assuming the recommendation was followed.**

1. **`listing_intent` has two values, not three.** It is `rent` and `sale`. The
   recommended `STAY` is absent. Nightly lodging is therefore expressed as
   `listing_intent = 'rent'` with a `rate_minor` and a `rate_period` of `night`,
   which works but means the enum no longer answers "what is this listing" on
   its own. See P-7, which is now the open question.
2. **The tenure vocabulary is six values, not seven.**
   `certificate_of_occupancy`, `governors_consent`, `deed_of_assignment`,
   `gazette`, `freehold`, `leasehold`. The recommended `excision` and
   `family_land` are absent and `deed_of_assignment` was added instead. Excision
   in particular is a real and common Lagos state answer and its absence will
   force agents to pick something inaccurate. **Recommend adding `excision` and
   `family_land`.** Adding a value to an enum is a one-line migration today and
   a data-quality problem forever once agents have started choosing the nearest
   wrong answer.
3. **Enum labels are lowercase snake_case**, where the recommendation wrote them
   uppercase. This is the right choice, because every other enum on this
   database that was designed rather than inherited is lowercase, but note that
   `listing_status`, `booking_status` and the wallet enums are UPPERCASE. The
   database now has two conventions. Pick one for everything added from here and
   write it in `docs/PRODUCT.md`; do not migrate the existing ones.

**Still not built:** `title_document_status` and the private bucket for title
documents. `tenure` records what the seller *claims*; nothing records whether
anybody looked. That is the difference between a dropdown and a trust signal.
See KYC-6.

### P-2. The rental fee breakdown landed, and it needs a UI contract. **DONE in schema, NEW work in UI. P1**

**Verified live.** `rent_amount_minor`, `rent_period` (`month`, `quarter`,
`year`), `rent_negotiable`, `caution_deposit_minor`, `service_charge_minor`,
`service_charge_period`, `agency_fee_minor`, `legal_fee_minor`,
`agreement_fee_minor`, `total_move_in_cost_minor`, `minimum_tenancy_months`,
`available_from`. Migration `20260809100500`, applied as `20260809044514`.

This is the single most user-valuable thing in the whole property migration set,
because the gap between advertised rent and the money actually required on day
one is the number one complaint about Nigerian property listings, and this
platform can now state it.

**Do, and this is a product rule rather than a suggestion.**
1. **The card shows `total_move_in_cost_minor`, with the rent as the secondary
   line.** Not the other way round. Every competitor leads with the rent and
   buries the fees, and leading with the truth is the differentiator that costs
   nothing to build.
2. **The breakdown is always expandable and never collapsed away.** Rent,
   caution deposit, agency fee, legal fee, agreement fee, service charge, each
   with its own line, each labelled, and the sum stated. A fee that appears only
   in a total is a fee somebody will feel ambushed by.
3. **A zero and a null are different and must render differently.** "Agency fee:
   none" is a selling point. A missing agency fee is unknown and must say so.
   The columns are nullable, so both states exist.
4. **`total_move_in_cost_minor` is stored, so it can disagree with its parts.**
   Either compute it in a generated column or a trigger, or add a check
   constraint, or accept that it will drift and render the computed sum instead.
   Do not render a stored total beside parts that do not add up to it. The
   ledger already learned this lesson: `gross_minor = platform_fee_minor +
   agent_share_minor + processor_fee_minor` is a check constraint, not a
   convention.
5. **Say what the fees are for.** Most renters do not know the difference between
   a legal fee and an agreement fee. One sentence each, in a tooltip or the
   expanded row, written once in the locale files.

### P-3. `price_per_night_minor` is now `rate_minor`. **DONE. Was part of P-1**

**Verified live.** The column is `rate_minor bigint` and `price_period` is gone,
replaced by `rate_period` with values `night` and `guest`. The hotel columns
`max_guests`, `beds`, `min_stay_nights`, `instant_book`, `cleaning_fee_minor`
and `service_fee_minor` are absent from the live table. Migration
`20260809102000`, applied as `20260809044725`.

The reason this mattered is worth keeping: the column had been holding annual
rent since the rental pricing migration reinterpreted it, and a column named
`price_per_night_minor` holding a yearly figure is one plausible multiplication
away from charging a tenant 365 times. `apps/web/src/lib/listings/pricing.ts`
now reads `rate_minor` and `rate_period` and documents the rename at `:90`.

### P-4. `ListingKind` and `property_type` still disagree. **OPEN. P1**

**Re-verified today, unchanged.** `apps/web/src/lib/listings/types.ts:31` still
declares `experience`. `public.property_type` still holds exactly ten values and
`experience` is not one of them. The property migrations did not touch either.

**Do.** Delete `experience` from `ListingKind`, from the nav, and from the four
locale files. It is the last surviving limb of the NaijaFinds discovery product
and nothing in the schema serves it. A category in the navigation that cannot
return a row is a dead end the type system cannot catch, because the two enums
are declared in two languages.

### P-5. Generate the database types in CI. **OPEN, and now overdue. P1**

Types were regenerated by hand at commit `5e5aa79` and the build went red with
52 errors across five lib files, which is exactly the right outcome: the schema
became correct and the application caught up. That is the argument for the check,
not against it.

**Do.** `supabase gen types typescript` into
`apps/web/src/lib/supabase/database.types.ts` as a CI step that fails on any
diff, and derive `ListingKind` from
`Database["public"]["Enums"]["property_type"]` rather than declaring it by hand.
That closes P-4 as a class rather than an instance, and it is the only thing
that will keep the two enums together through the next schema change.

### P-6. `public.saved_searches` still has no writer and no screen. **OPEN. P2**

Unchanged: the table exists, holds zero rows, and the only reference in
`apps/web/src` is the generated types.

**And it is now worth building rather than dropping.** A saved search on an empty
marketplace is the single best supply-side signal available: it tells the owner
exactly which area and price band demand exists in before any listing does. Build
the control on `/search`, the row, the list on `/saved`, and an email when a
matching listing publishes. That last part turns the empty catalogue problem in
section 11 from a liability into a mailing list.

### P-7. `listing_intent` has no value for a nightly stay, and three markets share two labels. **NEW. OPEN. P1**

**Wrong today, verified live.** `listing_intent` is `('rent', 'sale')`. The
product offers four markets: annual tenancy, sale, nightly stay and a restaurant
table. Two of the four have no intent value, so a shortlet is `rent` and a
restaurant is `rent`, and the column that exists to answer "what is this listing
for" cannot.

The information is recoverable today by combining `property_type` and
`rate_period`, which is exactly the derived-truth arrangement `listing_intent`
was added to replace.

**Do. Decide, then do one of these two, and record which in `docs/PRODUCT.md`.**

- **Option A, add the values:** `stay` and `table`. One migration, zero rows to
  migrate, and every filter, URL and analytics query afterwards reads one
  column. Recommended.
- **Option B, formalise the derivation:** a generated column or a view exposing
  `market`, computed from `property_type` and `rate_period`, so there is still
  exactly one place the answer lives. Acceptable.

What must not happen is the current state, where each of the front end, the
search filter and the analytics query re-derives it independently and they drift.

### P-8. A sale listing must be a different page, and nothing decides what it says. **NEW. OPEN. P0**

The schema can hold a sale. No screen renders one. Before anybody builds it,
these decisions have to be made, because they are product decisions wearing
engineering clothes.

1. **No Reserve, no calendar, no instant anything.** A sale is an enquiry, an
   inspection, a negotiation and a transaction that happens substantially off
   platform. The page must not imply otherwise.
2. **Title and tenure is the hero block**, above the photographs on mobile if
   necessary. In Nigerian property sale, title is the transaction. `tenure`,
   `sale_status`, `year_built`, `size_sqm` and `condition` belong together in
   one panel with a plain-language explanation of what each title type means.
3. **State what the platform has and has not checked.** `address_verified_at`,
   `physically_inspected_at` and `verified_by` now exist as timestamps. Render
   the timestamps, not a badge: "Address checked 14 July" is a fact and a tick
   is a promise. Where a timestamp is null, say nothing rather than saying
   unverified, which reads as an accusation against the agent.
4. **`price_negotiable` changes the call to action.** "Make an offer" against
   "Enquire" is the whole difference in how a buyer approaches the page.
5. **`sale_status = 'under_offer'` and `'sold'` must be visible and must not be
   deletions.** A sold listing that vanishes destroys the only public evidence
   the platform has that transactions happen here. Keep it, mark it, exclude it
   from search by default, and let a sold price be the comparable that makes the
   next seller list.
6. **Write the legal boundary into the copy before a lawyer does.** The platform
   introduces buyer and seller. It does not act as an estate agent, does not
   verify title, and does not hold the purchase price unless and until escrow
   exists. Say so on the page, once, in plain words.

### P-9. Nothing records a listing's status history. **OPEN. P2**

Unchanged. `listings` carries one `published_at` and one current `status`.
`/agent/analytics` shows forward occupancy and states on screen that it cannot
show historical occupancy, which is the honest answer. A listing paused last
March silently rewrites last March's occupancy on every page load.

**Do.** A `listing_status_events` append-only table written by the trigger that
already moves the status. Cheap now, impossible to backfill later. And note this
is now also the only way to answer "how long does a property take to let", which
is the metric the owner will want first.

### P-10. Nothing counts a view of a listing. **OPEN. P1**

Unchanged. `public.post_views` keys on `posts.id` and belongs to the social feed.
There is no view count on any listing, so no view-to-enquiry conversion, which is
the single figure an agent most wants and the single figure that justifies a
commission when one is eventually charged. See FEE-4.

**Do.** `public.events` already exists, holds zero rows, and was built for this.
Write a `listing_viewed` event from server code only. Reuse `private.view_bucket`,
the salted daily bucketing that already stops a client inflating a count. Decide
the bot filter and the retention window up front rather than adding them after
the numbers are already wrong.

### P-11. `public.listing_videos` exists and nothing writes to it. **NEW. OPEN. P1**

**Verified live.** The table exists, holds zero rows, and is modelled on
`listing_photos` with its grants stated explicitly. Grep `listing_videos` across
`apps/web/src`: no hits outside the generated types. There is no upload control,
no player, no thumbnail, and no size limit. See section 12.

---

## 6. Wallet and payments

Read section 0 first. CASE-1 supersedes the parts of W-1 that were about
diagnosis; what remains here is the work.

### W-1. The webhook still answers 200 on a misconfiguration, and the money path is still unlogged. **PARTLY DONE. P0**

Folded into CASE-1, which carries the full evidence and the ordered fix. The
short version: the observability module was built and wired into one branch out
of roughly twenty. The webhook, every wallet action, the ledger and the booking
settlement path all still say nothing.

### W-2. Nothing is rate limited on the money surfaces. **OPEN. P0**

**Re-verified.** `private.consume_rate_limit` is durable and Postgres-backed and
applied. `consume` in `lib/security/rate-limit.ts` is still called from two API
routes only, `api/assistant` and `api/support`. Reserve, cancel, fund, withdraw
and transfer count nothing.

**Mitigating, and it is why this is not worse:** wallet writes are idempotent at
the database level on the unique `reference` column, honoured in
`lib/wallet/ledger.ts`, and `withdraw` prices the spendable balance inside a row
lock.

**Do.** One `consume` call each on `reserve`, `fundWallet`, `withdraw`,
`transferToUser` and `payWithWallet`. Per user, per action, per hour. The
machinery is built; the reason this is not done is that nobody went back. Pair
each refusal with a `logMoney` line carrying `outcome: "rejected"`, so the limiter
is also an intrusion signal rather than only a brake.

**Why.** Reserve holds real inventory. An unthrottled reserve locks every
calendar on the platform from one account.

### W-3. A complete second wallet deck is dead, taking four exports with it. **OPEN. P1**

Unchanged. `components/app/wallet/WalletActions.tsx` is 306 lines with zero
import references and is the only caller of `requestDeposit`, `requestWithdrawal`
and `requestTransfer` in `lib/wallet/actions.ts`. `getStatement` is imported by
nothing. The live page renders `WalletDeck`, which uses `fundWallet`, `withdraw`
and `transferToUser`.

**Do.** Delete the component and the four unreachable exports. Two implementations
of the money surface is how a security fix lands on the wrong one, and CASE-1 is
about to add logging to one of them.

### W-4. The P2P transfer form is an email-address oracle. **OPEN. P1**

Unchanged. The form answers differently for an address that has a RentMe wallet
and one that does not, so a script can walk a list and learn who banks here.

**Do.** One response for both: "If that address has a RentMe wallet, the transfer
is on its way." Confirm or refund asynchronously. Pair with W-2, because a
uniform message with unlimited attempts is still a timing oracle. The platform
already got this right on password reset, deliberately.

### W-5. There is no transaction PIN. **OPEN. P1**

Unchanged. A signed-in session alone authorises a debit.

**Do.** Four to six digits, set on the first wallet-moving action, required for
withdraw and transfer and **not** for paying a booking the person is already
looking at. Hash it with the same care as a password, rate limit it, lock out
after a small number of attempts, and provide a reset that goes through email
plus a cooling-off period rather than through support.

**Why.** Nigerian phones are shared and borrowed far more than the implicit
Western threat model assumes, and every Nigerian banking app this audience
already uses asks for this. Its absence reads as unsafe before it is exploited.

### W-6. There is no reconciliation and no drift alert. **OPEN. P1**

Unchanged, and `pg_cron` is installed with six active jobs, so the runway exists
and has existed for some time.

**Do.**
1. A nightly job recomputing every wallet balance from `wallet_entries`,
   comparing against the derived view, writing a `risk_alerts` row on any
   non-zero drift. The check constraint `gross_minor = platform_fee_minor +
   agent_share_minor + processor_fee_minor` guarantees the ledger balances by
   construction; nothing guarantees the derived view still agrees with it.
2. A second job listing `PENDING` withdrawal holds older than 24 hours and
   asking Paystack for each one's status individually. A nightly total cannot
   tell one stuck transfer from a quiet day.
3. A third, and this is the one CASE-1 argues for: a job that counts Paystack
   `charge.success` events for the day against `wallet_entries` deposits for the
   day and alerts on a mismatch. That job, alone, would have caught the incident
   on day one.

**Why.** The first time the ledger is wrong it will be wrong quietly, and a
marketplace with no reconciliation finds out from a user.

### W-7. Refunds go to the wallet first and there is no bank fallback. **OPEN. P2**

Unchanged, correct as the fast path, documented honestly on `/safety`. Build the
bank return after W-6, through the payout account machinery that already exists
for agents. Wallet first, always, then bank on request.

### W-8. `bestEffortEmail` and the bare webhook catch are the same anti-pattern in two places. **NEW. OPEN. P1**

**The pattern.** Both wrap something that may fail, both swallow the failure so
the committed write is not rolled back, and both then forget. Swallowing is
correct in both cases. Forgetting is not, and it is the same mistake twice, which
means it is a habit rather than an oversight.

**Do.** One shared helper: `swallow(reason, fn)`, which runs the function,
catches, logs one structured line naming the reason and the surface, and
returns. Then use it in both places and in the four other spots where a bare
`catch {}` exists in a write path. A grep for `catch {` with an empty body is the
inventory. This is a fifteen line module that closes the class the incident
belongs to.

---

## 7. Escrow

### E-1. Escrow is zero percent built and zero percent promised. Keep the second half true. **OPEN. P0 to build, P0 to keep not marketing**

**Re-verified today.** Grep `escrow` across `apps/`, `packages/` and `supabase/`:
every hit is a code comment or the string `"escrow"` as an unused member of the
`MoneySurface` union in `lib/payments/observability.ts:35`. There is no
`escrow_holds` table, no `HELD` state on `wallet_entries` beyond the withdrawal
hold, no release condition, no release actor, no dispute path and no timeout.
Grep the four locale files: zero. **The product does not promise escrow
anywhere**, and `app/(site)/safety/page.tsx:27` says in a comment that the page
makes "no promise of an escrow that is not built", and keeps that promise.

That refusal is the most honest thing in this codebase. It must survive the
marketing pass. See E-6 for the specific sentences that must never ship.

### E-2. Add `COMPLETED` to `booking_status` before anything else. **OPEN. P0, and it is the gate**

**Verified.** `booking_status` is `PENDING`, `CONFIRMED`, `CANCELLED`. There is
no `COMPLETED`. So the platform cannot record that a stay happened, and "release
the money once the thing happened" cannot be expressed at all.

**Do this first.** It is a one-line enum addition plus a scheduled transition,
and `private.announce_completed_stays` already runs nightly and already reasons
about completed stays, so the moment exists in code and not in the schema.
Nothing else in escrow can be specified until this lands. It also unblocks two
badges and the review prompt.

### E-3. The state machine. **NEW. OPEN. P0**

Model escrow as **ledger holds, not balance edits**. A held amount is an entry
with a `HELD` status against a named counterparty and a named release condition.
The derived balance already subtracts pending debits, so the arithmetic hook
exists.

**Seven states. No more, and each transition has exactly one actor.**

| State | Means | Who moves it | Moves to |
|---|---|---|---|
| `INITIATED` | An agreement exists, no money yet | Payer | `FUNDED`, `CANCELLED` |
| `FUNDED` | Money received and held. Not the agent's | Processor webhook | `RELEASE_PENDING`, `DISPUTED`, `REFUNDED` |
| `RELEASE_PENDING` | The release condition is met, the clock is running | System | `RELEASED`, `DISPUTED` |
| `RELEASED` | Money credited to the agent's wallet | System | terminal |
| `DISPUTED` | Either party objected. Frozen | Either party | `RELEASED`, `REFUNDED`, `SPLIT` |
| `REFUNDED` | Money returned to the payer | Admin, or automatic timeout | terminal |
| `SPLIT` | Partial release, both sides credited | Admin only | terminal |

**Rules that must be enforced in the database, not the application.**
- Every transition writes an append-only row with actor, timestamp and reason.
  Never update a status in place without one. `audit_log` already exists.
- `FUNDED` to `RELEASED` may never be a single step. There is always a
  `RELEASE_PENDING` window a payer can object inside. An escrow with no objection
  window is a payment with extra words.
- No transition may be triggered by the party who benefits from it. The agent
  cannot release to themselves; the buyer cannot refund themselves.
- **A timeout must exist on every non-terminal state**, and each must resolve
  somewhere rather than sitting forever. `pg_cron` runs the sweep. An escrow that
  can be abandoned is a way to freeze somebody's money by ignoring them.

**The release condition differs per market and only one of the three is close to
buildable.**
- **Stay:** release 24 hours after check-in. Needs E-2 and nothing else.
- **Rental:** release on a recorded inspection confirmation plus tenancy start.
  Needs an inspection record, which does not exist.
- **Sale:** release on a title check a human performs. Needs KYC-6 and a legal
  opinion. Do not attempt this third.

### E-4. The dispute flow. **NEW. OPEN. P1**

**Do not build a second queue.** `support_tickets`, `/admin/support` and
`audit_log` all exist. A dispute is a support ticket with money attached and a
frozen ledger hold, and the queue it lands in is the one already staffed.

**The flow, and the timings are the product.**
1. Either party raises a dispute from the transaction, before `RELEASED`. One
   button, a required reason from a closed list, free text, and evidence
   uploads. Raising it moves the hold to `DISPUTED` immediately and the release
   clock stops.
2. The other party is notified and has **72 hours** to respond. Silence is not
   an admission and must not auto-resolve against them; it moves the case to
   admin with that fact recorded.
3. Admin sees both sides, the full ledger history, the message thread and the
   listing, on one screen. Every action they take writes an `audit_log` row with
   a mandatory reason. The existing admin actions already work this way.
4. Outcomes are exactly three: release in full, refund in full, or split with an
   explicit amount. A split needs two admin approvals or a value ceiling below
   which one suffices.
5. Both parties get the outcome and the reason in writing, by email and in
   product. A dispute resolved without a stated reason produces the next
   dispute.
6. **Target 5 working days, publish it, and measure it.** An escrow whose
   resolution time is unstated is an escrow nobody trusts, and an unmeasured
   target is a target nobody meets.

**Frozen means frozen.** While a hold is `DISPUTED`, neither party may withdraw
the amount, the agent's payout run must skip it, and the listing should not be
silently deleted out from under the evidence.

### E-5. What the escrow UI must explain. **NEW. OPEN. P1**

The interface has one job: at every moment, both parties know **where the money
is, who can move it, and what happens next**. Everything else is decoration.

**On every screen carrying a hold, three lines, always visible.**
1. Where it is: "Your 1,200,000 naira is held by RentMe."
2. Who can move it: "It goes to the agent when you confirm you have moved in, or
   automatically 7 days after your tenancy starts."
3. What happens if something goes wrong: "You can raise a dispute any time
   before then."

**Also required.**
- A visible countdown on `RELEASE_PENDING`. A number of days, not a phrase.
- The dispute control present and reachable in one tap at every stage before
  release. A dispute button hidden behind a help centre is a dispute button that
  does not exist.
- The full timeline of transitions, with timestamps and actors, visible to both
  parties. This is the single largest source of trust and it is nearly free once
  E-3's append-only log exists.
- Fees shown before funding, itemised, including whatever the processor takes.
  See section 8.
- The agent's side must show the hold as **pending, not available**, from the
  first moment. An agent who sees money in their balance and then cannot
  withdraw it will file a support ticket, and they will be right to.

### E-6. What the escrow UI must never say. **NEW. P0**

These are copy rules and they should be enforced by a spec the way the
demo-and-sample ban is, because marketing copy is written under pressure by
people who did not read this file.

- **Never "guaranteed", "protected", "insured" or "safe" without a qualifier.**
  RentMe holds money in an ordinary account. It is not a bank, it is not
  insured, and there is no deposit protection scheme behind it. Say what is
  actually true: "held by RentMe until you confirm".
- **Never imply escrow covers property quality, title validity or the agent's
  honesty.** It covers one thing: the money does not move until a condition is
  met. A buyer who believes escrow means the platform checked the title has been
  misled, and that is the most expensive misunderstanding available here.
- **Never state a release time the system does not enforce.** If the copy says 7
  days, a cron job must exist.
- **Never show a hold as a balance.** Not on the agent's wallet card, not in a
  total, not in an email subject line.
- **Never promise a dispute outcome or a timescale that is not measured.**
- **Never use the word escrow before the feature exists**, including in a
  roadmap teaser on a public page. Today's `/safety` page is the standard.

### E-7. Who holds the money is a regulatory question, not an engineering one. **OPEN. P0 decision**

**This gates everything above and nobody has answered it.** Today the platform
charges no fees and never holds a balance it did not receive on behalf of a
booking in flight. Escrow means holding somebody else's money for days or weeks.
In Nigeria that touches CBN payment service provider licensing and the question
of whose account the funds sit in.

**Do, before a line of E-3 is written.** Get an answer on: whether the funds sit
in a designated client account separate from operating funds, whether the
platform needs a licence or can operate under Paystack's, who is liable if the
platform becomes insolvent while holding a hold, and what the tax treatment of a
held amount is. The engineering above is perhaps three weeks. This answer has a
lead time measured in months and it should start now, in parallel, exactly the
way NDPC registration should have.

---

## 8. Commission and listing fees

The owner has decided: **build the full engine, set every rate to zero today,
turn on a real rate later once there is a user base.** That decision is right and
it is also the most dangerous kind of feature to build, because a fee engine that
is switched off looks finished and is not tested, and the day it is switched on
it is tested in production against real money.

Everything in this section exists to make the eventual switch-on boring.

### FEE-1. The ledger already models a platform fee and it is always zero. **DONE, and it is the right foundation. P1 to build on**

**Verified.** `ledger_entries` carries `gross_minor`, `platform_fee_minor`,
`agent_share_minor` and `processor_fee_minor` with a check constraint that they
balance exactly:
`gross_minor = platform_fee_minor + agent_share_minor + processor_fee_minor`.
`lib/bookings/settlement.ts:32` records that `platform_fee_minor` is zero and
`processor_fee_minor` is whatever the processor reports.

This is exactly the right shape and it means the hard half is done. A fee is not
a subtraction applied somewhere; it is a named component of a sum that must
balance. Do not replace this with a percentage multiplied at render time.

### FEE-2. Rates need a table, and the table needs effective dates. **NEW. OPEN. P1**

**Wrong today.** The zero is a constant in application code. A constant cannot
be changed without a deploy, cannot differ by market, and above all **cannot
record what the rate was on the day a transaction happened**, which is the
requirement that decides the whole design.

**Do. One table, and design it once.**

```
public.fee_schedules
  id
  scope            enum: booking_commission, sale_commission,
                         listing_fee, featured_listing, withdrawal
  applies_to       enum: rent, sale, stay, table, all
  basis            enum: percentage_bps, flat_minor
  value            integer          -- basis points, or kobo
  minimum_minor    bigint null      -- floor, in kobo
  maximum_minor    bigint null      -- cap, in kobo. Use it
  payer            enum: agent, member, split
  effective_from   timestamptz not null
  effective_to     timestamptz null -- null means current
  created_by       uuid not null
  reason           text not null
```

**The rules that make it safe.**
1. **Rows are never updated and never deleted.** A rate change closes the old row
   by setting `effective_to` and inserts a new one. This is an append-only table
   in spirit and should be one by trigger, the same way `audit_log` is.
2. **Every transaction stores the `fee_schedule_id` it was priced under**, on
   `ledger_entries`. Not the percentage, the identifier. When somebody asks in
   eighteen months why a transaction was charged what it was, the answer is a
   join, not an archaeology exercise.
3. **Percentages in basis points, integers only.** 250 is 2.5 per cent. Never a
   float, for the same reason money is never a float. Round once, at the end,
   and write down whether it rounds up or down. Round in the payer's favour;
   the aggregate cost is trivial and the alternative is a complaint that is
   always correct.
4. **Today, insert one row per scope with `value = 0` and `effective_from` set to
   now.** Not an empty table. A missing row and a zero row must be
   distinguishable, and the code path that reads the schedule, computes zero and
   writes a balanced ledger entry has to be exercised from day one. **A fee
   engine that has never run is not an engine, it is a plan.**
5. **The lookup is by transaction timestamp, never by "current".** Write it that
   way now. A refund processed next March against a booking made this December
   must reverse December's fee, and code that reads the current rate gets that
   wrong silently.
6. **Cap everything.** A percentage commission with no `maximum_minor` on a 400
   million naira property sale produces a number that will end a business
   relationship. Set a cap even while the rate is zero, so the column is
   populated and the logic is exercised.

### FEE-3. Disclosure, so that nobody feels ambushed. **NEW. OPEN. P0 when the rate becomes non-zero**

This is the part that matters. The engine is a week; the trust is permanent.

**The rules, and they should be in `docs/PRODUCT.md` as product policy rather
than only here.**

1. **A fee is shown before the action that incurs it, on the same screen, in the
   same visual weight as the amount.** Not on a linked page, not in a tooltip,
   not after a confirmation.
2. **Show the fee, the rate and the base.** "Service fee 2.5%, 30,000 naira, on
   1,200,000 naira." A bare amount is not disclosure, because the reader cannot
   check it.
3. **Never bundle the platform's fee with the processor's.** The ledger already
   keeps them separate. The UI must too, and each must be labelled with who
   receives it. This is currently a strength: today the platform can say every
   fee shown belongs to somebody else, and that is a claim worth protecting.
4. **Existing users get 30 days' notice, in an email and in product, before any
   rate rises above zero.** Both, not one. Write the notice as an email template
   now, while the rate is zero and nobody is under pressure.
5. **Listings and bookings created before a rate change keep the old rate to
   completion.** This is the entire reason for `effective_from` and
   `fee_schedule_id`. An agent who listed under zero commission must complete
   that let under zero commission, and if that is not true, say so before they
   list, not after.
6. **A public, permanent, versioned fees page**, reachable from the footer and
   from every screen that shows a fee. Dated, with the previous versions
   readable. A fees page that silently changes is worse than no fees page.
7. **The agent workspace shows the rate they are on, today**, on the earnings
   screen, with its effective date. Not buried in terms.
8. **When the rate is zero, say zero. Do not hide the row.** "Platform fee: 0
   naira" every time, from today, is the single cheapest trust-building move
   available, and it means the line item is familiar long before it has a number
   in it. A fee line that appears for the first time on the day it becomes
   non-zero reads as a new charge sneaked in.
9. **Never charge a member a fee to look, to save, to message or to enquire.**
   Fees attach to transactions and to supply-side services. This should be
   written down as a rule so it is a decision rather than a drift.

### FEE-4. What is actually chargeable, and in what order. **NEW. OPEN. P2 decision**

Recorded so the engine is built against a real intent rather than an abstraction.

| Candidate | Charge to | Why it works, or does not |
|---|---|---|
| Commission on a completed let | Agent | Aligned: the platform is paid when the agent is. Needs E-2 and escrow to be collectible |
| Commission on a sale | Agent | Large amounts, long cycles, and mostly completed off platform. Hard to enforce without escrow. Cap it |
| Listing fee per listing | Agent | Simple, collectible today, and it suppresses supply on a platform whose problem is having none. **Not first** |
| Featured or boosted placement | Agent | Collectible today, does not suppress supply, does not touch a transaction. **This is the right first revenue** |
| Verification or inspection service | Agent | A real service with a real cost. Charge for the inspection, never for the badge. See DEMO-4 |
| Withdrawal fee | Agent | Passes through a processor cost. Only ever at cost, never marked up, and labelled as the processor's |
| Anything charged to a renter or buyer | Member | Recommend never. The market expects agency fees from the agent side and a platform fee on the demand side is the most visible possible reason to take the deal off platform |

**The sequencing recommendation.** Featured placement first, because it can be
switched on without any transaction plumbing and it does not deter listings.
Commission on a completed let second, once escrow exists, because escrow is what
makes commission collectible rather than invoiceable. Everything else after.

### FEE-5. The fee engine needs tests that run while every rate is zero. **NEW. OPEN. P1**

**The trap.** A zero-rate engine passes every test trivially. Zero times anything
is zero, and a rounding bug, an off-by-one in basis points and a missing cap are
all invisible.

**Do.** Unit tests that construct fee schedules with real non-zero rates and
assert the arithmetic, entirely in test fixtures, never against the live table.
Cover: basis point rounding at both ends, the cap, the floor, a refund reversing
the original schedule rather than the current one, a schedule change mid-booking,
and the ledger constraint holding for every case. Then one property test
asserting that for any gross and any schedule, the three components sum exactly
to the gross. That last one is worth more than the other six.

---

## 9. KYC and identity

**The scope rule, and it is a product decision that must be defended against
drift: verification is for sellers and agents. Never for buyers and never for
renters.** A person looking for somewhere to live does not upload their passport
to browse, to save, to message or to pay. The asymmetry is deliberate: the party
being trusted with a property and with money is the party who proves who they
are. Anything that starts asking a renter for documents has misunderstood the
product, and it will also destroy the conversion rate.

### KYC-1. The screens are built and refuse honestly. The storage is not. **PARTLY DONE. P1**

**Verified in the tree today.** `apps/web/src/components/verification/` holds
`KycFlow.tsx` (six screens at most, one task each, a segmented progress bar whose
length changes with the business branch), `DocumentUploader.tsx`, `KycStatus.tsx`,
`kyc.ts` and `kyc.test.ts`. `app/(app)/verification/page.tsx` renders it.

The seam is `app/(app)/verification/actions.ts`, and it is a **stub that returns
`{ ok: false }` with an honest message**, because the table and the bucket do not
exist. Read the comment at `:5-35`: it names both tempting ways to ship the half
and explains why each is worse than refusing. `KycFlow` prints the refusal on the
review step, keeps every answer, and does **not** show the submitted screen,
because that screen promises a human is going to look at your passport.

That is exactly right and it is the same discipline as CASE-1. Do not "finish"
this by returning true.

**Do.** Build the storage. The work is bounded and specified below.

### KYC-2. Document types, for Nigeria specifically. **NEW. OPEN. P1**

**Accept these, and no more, because every extra type is a reviewer training
cost and a fraud surface.**

| Type | Identifies | Notes |
|---|---|---|
| NIN slip or NIN card | Individual | The national baseline. Effectively universal now |
| International passport | Individual | Data page only |
| Driver's licence | Individual | Both sides |
| Permanent Voter's Card | Individual | Both sides. Widely held, no address |
| BVN | Bank identity | A number, verified against an API, never an uploaded image |
| CAC certificate | Business | For an incorporated agency |
| CAC status report | Business | Names the directors. Ask for it when the certificate alone is presented |
| Proof of address | Either | Utility bill or bank statement, under 3 months old. Weak evidence in Nigeria; treat as supporting, never sole |

**Rules.**
- **One primary photo ID, always.** Everything else is supporting.
- **A selfie against the document**, live rather than uploaded, if the flow can
  do it. This is the single highest-value check and the one most often skipped.
  If it cannot be live, do not pretend: an uploaded selfie is a weaker check and
  should be recorded as one.
- **BVN and NIN are verified against an API, not read off an image.** A number
  typed in and checked is strong. A photograph of a slip is a photograph.
  Env-guard the integration and degrade into an honest unconfigured state, the
  way every other integration here does.
- **A business account also verifies a natural person.** A CAC certificate does
  not have a face. At least one director must complete individual verification.
- **Never store a document a decision does not need.** Every extra document is a
  breach waiting for a reason.

### KYC-3. Storage, and this is where a mistake is unrecoverable. **NEW. OPEN. P0 when built**

`agent-documents` already exists as a private bucket and `ApplyWizard.tsx`
already uploads straight from the browser into it, with `lib/admin/queries.ts`
minting a ten-minute signed URL per document for the reviewer. That pattern
works and should be reused rather than reinvented.

**Requirements, all of them.**
1. **Private bucket, RLS such that the owner can write and only the owner and a
   reviewer can read.** Never public, never a permanent URL.
2. **Short-lived signed URLs only.** Ten minutes is right. Never embed a
   document URL in an email, a notification or a log line.
3. **Path scoped to the caller's own user id**, enforced by policy, so a crafted
   path cannot write into somebody else's folder.
4. **Size and type limits enforced server side.** See section 12. Today there
   are none anywhere, which means an identity bucket accepts an arbitrarily
   large arbitrary file.
5. **A retention policy decided before the first upload.** Recommendation:
   delete the image once the check is decided and keep only the decision, the
   document type, the last four characters of the number, the reviewer and the
   timestamp. If a regulator requires the image retained, keep it for the
   statutory period and then delete it on a schedule, not on request. Storing
   Nigerian identity documents indefinitely with no policy is the single largest
   privacy liability this platform can create for itself, and it is created by
   default.
6. **Every read of a document writes an `audit_log` row naming the reviewer.**
   Not the upload, the read. Who looked at somebody's passport is the question
   that gets asked after an incident.

### KYC-4. The review workflow. **NEW. OPEN. P1**

**Do not build a second queue.** `/admin` already has queues, `audit_log` already
records privileged actions with mandatory reasons, and `agent_verification_checks`
already models rungs with reviewer notes that the agent can read in full on
`/agent/verification`.

**The workflow.**
1. **States: `submitted`, `in_review`, `more_info_required`, `approved`,
   `rejected`, `expired`.** These deliberately mirror `listing_status`, which
   already has `MORE_INFO_REQUIRED`, because a reviewer who has learned one
   queue has learned both.
2. **`more_info_required` is the most important state and the one usually
   missing.** Most rejections are a blurred photograph or a cropped edge. A
   reviewer who can only approve or reject will reject, and a rejection for a
   blurry photo reads as an accusation. This state must be one click, must carry
   a required note, and must return the applicant to the exact step with their
   other answers intact.
3. **Two reviewers for a rejection, one for an approval.** The asymmetry is
   deliberate: an approval that was wrong is caught later by behaviour, a
   rejection that was wrong is usually never caught because the person leaves.
4. **A service-level target, published internally and measured: 48 hours.** An
   applicant who has uploaded a passport and heard nothing for a week assumes
   the platform is dead. Show them the target and the elapsed time.
5. **The reviewer sees the document, the extracted claim and the applicant's
   typed answer side by side**, and confirms they match. The mismatch between a
   typed name and the name on the document is the most common real signal.
6. **A reviewer may never review their own submission**, enforced in the
   database. Obvious, and it is the kind of obvious that is missing until an
   incident.

### KYC-5. Rejection reasons, re-verification and expiry. **NEW. OPEN. P1**

**Rejection reasons must be a closed list**, because free text is inconsistent
across reviewers, cannot be counted, and cannot be translated into the four
locales.

| Reason | Applicant sees | Can retry |
|---|---|---|
| `illegible` | The photograph is not clear enough to read | Immediately |
| `cropped` | Part of the document is cut off | Immediately |
| `expired_document` | This document has expired | Immediately, with a current one |
| `name_mismatch` | The name does not match the one on your account | Immediately, after correcting |
| `unsupported_type` | We cannot accept this kind of document | Immediately |
| `suspected_alteration` | We could not verify this document | Not self-serve. Support only |
| `duplicate_identity` | This identity is already verified on another account | Not self-serve. Support only |
| `sanctions_or_watchlist` | We are unable to proceed | Never. No detail, no appeal path in product |

**Rules.**
- The first five are self-serve and must say exactly what to fix. A rejection
  that does not say what to fix produces a support ticket and usually a churned
  agent.
- The last three must **not** explain themselves in detail, for the reason every
  financial institution gives no detail: an explanation is a tuning signal for
  whoever is trying again.
- **Rate limit retries.** Three attempts, then a cooling-off period, then
  support. Unlimited retries against a closed reason list is a way to learn the
  reviewer's threshold.
- **Never show the internal reason code to the applicant.** Store the code, show
  the sentence, and keep them in one table so they cannot drift apart.

**Re-verification and expiry.**
- **Expiry follows the document, not the calendar.** Store the document's own
  expiry date and expire the check the day it does, with a reminder 30 days
  before. A passport that expired in 2024 verified nobody in 2026.
- **NIN and BVN do not expire** and their verification should not either. Re-run
  them only on a trigger.
- **Triggers that force re-verification**, and these are the ones worth
  enumerating: a change of legal name, a change of payout bank account, a
  dispute upheld against the agent, an admin stop and subsequent reinstatement,
  and 24 months elapsed with no completed transaction.
- **An expired check must degrade, not delete.** The agent keeps their listings
  and their standing and loses the ability to receive a payout or publish a new
  listing until they refresh. Deleting standing on an expiry is how a platform
  loses its best suppliers to an administrative deadline.
- **Tell them before, not after.** 30 days, 7 days, on the day. The notification
  writer already exists.

### KYC-6. Title documents are a different check and must not be conflated. **NEW. OPEN. P1**

`tenure` on a listing records what the seller **claims**. Nothing records whether
anybody looked at a document, and a buyer will read a populated tenure field as
though somebody did.

**Do.**
1. `title_document_status` on `listings`: `not_provided`, `provided`,
   `under_review`, `verified`, `rejected`. Default `not_provided`.
2. A private bucket for title documents, reviewed exactly the way identity
   documents are, by the same queue, with the same audit trail.
3. **The listing page renders the status, not the claim, wherever the claim
   would be read as verified.** "Certificate of Occupancy, stated by the agent,
   not yet checked by RentMe" is longer, and it is the sentence that keeps the
   platform out of court.
4. **A title check is not the same as a verified badge and must not grant one.**
   See DEMO-4 and V-6.
5. Budget legal input. A Nigerian property sale involves a deed, a survey and a
   governor's consent, and the platform's role in that chain is a legal question
   before it is a schema.

---

## 10. Verification and trust

### V-1. An agent can see the verification ladder and cannot climb it. **OPEN. P1**

Unchanged. `/agent/verification` shows all four rungs, which passed, which
failed, the reviewer's note in full, and what the next rung asks for.
`agents.verification_tier` is the count of rungs passed with no gap below,
computed by `private.agent_tier`. There is no way to send anything.

**Do.** The KYC work in section 9 is this, and the two should be built as one
thing rather than two. `ApplyWizard.tsx` already uploads into the private bucket
and `lib/admin/queries.ts` already mints signed URLs for the reviewer; a
re-submission control on `/agent/verification` is those two pointed at an
existing agent rather than an applicant.

### V-2. There is no identity verification standard for payouts. **OPEN, and now specified. P1**

Superseded in detail by section 9. `payout_accounts` resolves the account name
against the bank, which is the right check and is not identity verification.
Nothing verifies NIN or BVN.

**The rule to add:** a payout may not be made to an account whose verified name
does not match the verified identity on the agent record. That single constraint
is most of what an anti-money-laundering posture is in practice, and it is
cheaper than any policy document.

### V-3. Badges are built and awarded nightly. **DONE. Was P2**

**Verified live.** `public.badges` holds 15 rows, seven AGENT and eight MEMBER,
one `manual_only`. `private.sweep_badges` is scheduled as `rentme-nightly-badges`
at 02:20 UTC and is active.

**Two things remain and both are product rather than plumbing.** Build the earned
moment: a badge that appears silently is a badge nobody values, and a designed
reveal plus a notification row is the cheapest retention mechanic available. And
enforce the anti-gaming rules already argued: Helpful counts only from accounts
with a completed stay or a verified phone, and one Helpful per pair per week
counts towards a badge.

### V-4. `private.probe_as` is dropped. **DONE. Was P1**

**Verified live.** `to_regproc('private.probe_as')` returns null. Migration
`20260809091000_the_impersonation_helper_goes_before_real_people_arrive`, applied
as version `20260809044358`. The definition was preserved in the migration so a
future policy-testing session can recreate it deliberately in a branch rather
than inventing it again, which is the right disposal.

### V-5. Leaked password protection is still off. **OPEN. P1**

**Re-verified live today** in the security advisors:
`auth_leaked_password_protection`, WARN, "Leaked password protection is currently
disabled."

**Do.** Owner action, Supabase dashboard, Authentication, Policies. One toggle.
It is the only real finding in the advisor set and it has now been reported
twice.

### V-6. The four trust signals are separate and the UI will conflate them. **NEW. OPEN. P1**

There are now **four** distinct things a listing page can say and they mean
entirely different things:

1. **`listings.verified` / admin approval.** An admin looked at the listing and
   approved it for publication. This is a content check.
2. **`address_verified_at`.** Somebody confirmed the address exists and matches.
3. **`physically_inspected_at`.** Somebody from RentMe went there.
4. **`agents.verification_tier`.** How far the agent has climbed the identity
   ladder. About the person, not the property.

Plus, once KYC-6 lands, `title_document_status`, which is a fifth.

**Wrong today in prospect.** All of these will collapse into one tick unless
somebody decides they must not. That is how the previous seed catalogue ended up
with 22 fabricated verified marks: one badge with no defined meaning absorbs
everything near it.

**Do.**
1. **One tick, one meaning, and write the meaning next to it.** Recommendation:
   the tick means admin-approved listing from a verified agent, both, and
   nothing else.
2. **Render timestamps as dates, not as ticks.** "Inspected 12 July 2026" is a
   fact a reader can weigh. A tick is a promise the platform has to keep.
3. **Never render a null as a negative.** Absence of an inspection is not
   evidence against a listing and must not look like one.
4. **A spec that fails the build if a verified mark renders on a listing whose
   `verified_by` is null.** Mechanical, cheap, and it is the exact defect that
   has already shipped here once.

### V-7. `message_flags`, `risk_alerts` and `reports` record a status and not a reviewer. **OPEN. P2**

Unchanged. A queue that records what happened but not who decided cannot be
audited and cannot be load-balanced. Add `reviewed_by` and `reviewed_at` to all
three, and write them from the existing admin actions.

---

## 11. The demo property ecosystem

**The problem, stated exactly.** `listings` holds **zero rows**, verified live.
`agents` holds zero. `bookings` holds zero. So `/search` is empty, the map has no
pins, `/rent` has nothing to show, every city page would be blank, and the four
specs that exercise the catalogue skip out loud. The supply chain has not
started: one person has an account, holding the two bootstrap roles.

**The history that constrains the answer.** This repository previously shipped a
seed catalogue of twenty-three invented places, **twenty-two of which carried
`verified: true`** with fabricated ratings on addresses that do not exist. That
is why `demo`, `sample`, `preview` and `not live` are banned strings in UI copy,
enforced today by five specs. It is also why `lib/wallet/repository.ts` deleted
its seeded ledger rather than merely unimporting it.

So the constraint is not "no demo content". It is: **nothing invented may ever
carry a trust signal, and nothing invented may ever be indistinguishable from
something real.** Those two rules are compatible with a platform that feels
alive. What follows is how.

### DEMO-1. Get real listings before you get fake ones. **NEW. P0, and it is the actual answer**

Every recommendation below this one is a mitigation. This is the fix.

**Do.** Ten to twenty real properties from real agents, listed properly, before
launch. Recruit them by hand: this is founder work, not engineering work, and it
is the only thing that solves the problem rather than dressing it. Concentrate
them geographically, all in Lekki and Yaba rather than spread across six states,
because twenty listings in one area looks like a market and twenty listings
across Nigeria looks like an empty one.

**Why this is in an engineering document.** Because every engineering answer
below costs a week and creates a liability, and this costs a fortnight of phone
calls and creates an asset. If it is happening, most of the rest of this section
is unnecessary. Say which, and put the answer in `docs/PRODUCT.md`.

### DEMO-2. If demo listings are built anyway, these are the non-negotiables. **NEW. OPEN. P0**

1. **A database-level flag, not a convention.** `listings.is_demonstration
   boolean not null default false`. Not a naming convention on the title, not a
   special agent account, not a magic id range. A column, so it can be filtered
   in SQL, asserted in a spec and dropped in one statement.
2. **A check constraint making the contradiction impossible:** a row with
   `is_demonstration = true` may not have `verified_by`, `address_verified_at`
   or `physically_inspected_at` set. Enforced in the database. Not in the
   application, because the application is where the last mistake happened.
3. **Never a real address.** Use the area centroid and say the location is
   approximate. A fabricated listing on a real house is somebody's actual home
   with strangers being told they can rent it, and that is a different category
   of problem from a marketing embarrassment.
4. **Never a real photograph of a real Nigerian property** unless it is licensed
   and the licence is recorded. Stock or commissioned only.
5. **Never a fabricated rating, review, view count or save count.** Not one. The
   entire reason for the ban.
6. **Never a real-looking phone number, agent name, or CAC number.**
7. **Not messageable, not bookable, not reservable.** Every action control on a
   demonstration listing raises an explanation, not a flow.
8. **One statement, plainly worded, on the card and on the page.** Not "sample",
   which is banned and which is also weasel wording. Say what is true: **"This
   is an example listing. No such property is available. RentMe has not verified
   anything on this page."** Long, unmissable, and honest.
9. **Excluded from every sitemap, every JSON-LD block, every Open Graph card and
   every email.** A demonstration listing indexed by Google is a fabricated
   property advertisement with the platform's name on it.
10. **A deletion date, decided and recorded on the row.** Not "when we get real
    listings". A date. And a spec that fails the build after it passes.

### DEMO-3. The honest ways to make an empty platform feel alive. **NEW. OPEN. P1**

These are better than fake listings, cost less, and carry no liability. Do these
first and possibly instead.

1. **The place layer is already real and already populated.** 774 local
   governments, 37 states, 7 areas, 18 posts. `/around/[slug]` for Lekki with
   real geography, real posts and real local content is a live page with nothing
   invented on it. That is a genuine product surface on day one and it is
   already built.
2. **Say the truth well.** An empty search that says "No listings in Lekki yet.
   We are onboarding agents now, and you will be the first to know" with an email
   capture is honest, useful, and builds the demand-side list that DEMO-1 needs
   to recruit against. `saved_searches` (P-6) is the table this writes to. This
   is the highest-value item in this section.
3. **Show demand, not supply.** "142 people searched for two-bedroom flats in
   Yaba this week" is real from day one if P-10's event logging exists, it needs
   no listings, and it is a better recruitment pitch to an agent than any
   catalogue.
4. **Lead with the agent side.** A marketplace with no supply should put its
   front door on supply. `/agents` already exists as the pitch and is public.
   Make it the primary call to action until the catalogue fills.
5. **Content that is not inventory.** Guides to Lagos areas, an explanation of
   what a Certificate of Occupancy is against a Governor's Consent, the real
   cost of moving into a Lekki two-bedroom. All true, all rankable, all built
   from `local_governments` and the `tenure` vocabulary that now exists, and all
   of it answers the search intent that eventually converts.
6. **The empty state is a designed screen, not a shrug.** `1d874bb` already did
   this once for the agent shelf: an empty shelf that says why, to the one person
   who can fix it. Apply the same treatment everywhere.

### DEMO-4. Never sell the badge. **NEW. P0 policy**

Recorded here because it is where the pressure will come from once section 8
turns a rate on. The verified mark may be earned and may never be purchased. A
paid inspection is a service with a real cost and may be charged for; the badge
that results must depend on the inspection's outcome and not on the payment. The
moment a badge can be bought, every badge on the platform is worth nothing,
including the ones that were earned.

---

## 12. Media, photographs and video

### MED-1. There is no size limit anywhere, on anything, at any layer. **NEW. OPEN. P0**

**Verified live and in the tree, and this is worse than expected.**

- Every one of the six storage buckets has `file_size_limit` **null** and
  `allowed_mime_types` **null**: `agent-documents`, `avatars`, `listing-photos`,
  `message-attachments`, `social-covers`, `social-media`. Queried directly from
  `storage.buckets`.
- A grep across `apps/web/src` and `supabase/` for `50 * 1024`, `52428800`,
  `MAX_*_SIZE`, `maxSize`, `fileSizeLimit` or `file_size_limit` returns **no
  hits at all**.
- Eleven client-side `.upload()` call sites exist, in `ProfilePhotos`,
  `StoryComposer`, `Composer`, `ApplyWizard`, `ListingWizard`, `AccountProfile`,
  `AccountHero` and `ThreadView`. Several re-encode to JPEG first, which
  incidentally bounds the size, and several pass `file` straight through.
- `ApplyWizard.tsx` and `ThreadView.tsx` both upload the raw `File` with
  `contentType: file.type`, which means an identity document bucket and a
  message attachment bucket accept an arbitrary file of arbitrary size and
  arbitrary declared type.

The only thing standing between the platform and a filled bucket is the
project-wide Supabase upload ceiling, which is a platform default rather than a
decision anybody here made.

**Do, and the order matters because only the first is enforcement.**

1. **Set `file_size_limit` and `allowed_mime_types` on every bucket, in a
   migration.** This is the only limit that cannot be bypassed, because it is
   enforced by the storage service and not by code the client runs. Everything
   else is a courtesy.

   | Bucket | Limit | Types |
   |---|---|---|
   | `listing-photos` | 10 MB | `image/jpeg`, `image/png`, `image/webp` |
   | `listing-videos` (to create) | **50 MB** | `video/mp4`, `video/quicktime` |
   | `avatars` | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
   | `social-covers` | 8 MB | `image/jpeg`, `image/png`, `image/webp` |
   | `social-media` | 10 MB | images. Video only if the product decides |
   | `message-attachments` | 10 MB | images and `application/pdf` |
   | `agent-documents` | 10 MB | images and `application/pdf` |

2. **Check the size and the type in the client before the upload**, so a person
   on a metered connection is told at selection rather than after spending
   80 MB of their bundle discovering the answer. This is a courtesy and it is
   also the difference between a usable product and a frustrating one in this
   market. It is not the enforcement.

3. **Never trust the declared MIME type.** `file.type` is whatever the client
   says. Sniff the magic bytes server side, or accept that `allowed_mime_types`
   on the bucket is checking a claim rather than a file. For `agent-documents`
   in particular, where the content is an identity document, sniff.

4. **State the limit in the interface before the picker opens.** "Up to 50 MB,
   MP4 or MOV, about 60 seconds" prevents most rejections.

5. **Write one shared module** with the limits as constants, imported by both
   the client check and the migration's documentation, so the two cannot drift.

### MED-2. Video upload is not built at all. **NEW. OPEN. P1**

**Verified.** `public.listing_videos` exists with zero rows and zero references
in application code. There is no bucket for it, no upload control, no player, no
poster frame, no duration limit and no transcoding.

**Do, and keep it deliberately small.**
1. Create the `listing-videos` bucket with the 50 MB limit above.
2. **One video per listing, 60 seconds, and say both up front.** A walkthrough is
   the highest-value media a Nigerian property listing can carry and a six minute
   unedited pan is worse than nothing.
3. **A poster frame is mandatory**, and it must not be generated by autoplaying
   the video. Extract a frame client side at upload, or let the agent choose
   one, and store its path on the row.
4. **Never autoplay with sound. Prefer never autoplay at all** on a listing card.
   Autoplaying video on a card in a scrolling list on a metered Nigerian data
   bundle is the most expensive default available.
5. **Respect `Save-Data`.** `save-data.spec.mjs` already proves the pattern for
   imagery: the artwork is never requested rather than hidden. Video must follow
   the same rule, showing the poster and a play control only.
6. **Do not build transcoding.** Accept MP4 and MOV, reject everything else, and
   revisit when there is a real distribution of what agents actually upload. A
   transcoding pipeline built before any video exists is a pipeline built against
   a guess.
7. **Video is content and goes through the same moderation gate as a listing.**
   A published video that nobody watched before publication is a category of risk
   the photograph review does not cover, because a video can contain far more.

### MED-3. Image handling has real gaps beyond the size limit. **NEW. OPEN. P2**

1. **Alt text is not required at upload.** It should be, on `listing-photos` at
   minimum. It is an accessibility requirement, it is a search signal, and it is
   free at the moment of upload and expensive afterwards.
2. **EXIF is not stripped, and it carries GPS.** A photograph taken at a property
   embeds its coordinates. Several call sites re-encode through a canvas, which
   strips EXIF as a side effect; several do not. Strip it deliberately and
   everywhere, and note that this interacts with M-3's privacy decision: the
   platform may be publishing an exact location it deliberately chose to jitter
   on the map.
3. **No orphan sweep.** O-4 records this for `social-media`. It applies equally
   to `listing-photos` once a listing can be deleted, and to `agent-documents`
   under KYC-3's retention policy.
4. **No image dimension cap.** A 12,000 pixel wide JPEG under 10 MB passes every
   check above and will exhaust memory in whatever resizes it. Cap the longest
   edge at upload.

---

## 13. Social layer

### O-1. The social layer is built, and three documents told the next agent to build it. **DONE**

All three are archived. `docs/SOCIAL_DESIGN.md` survives as the design record.

### O-2. All 18 posts are `author_kind = 'SYSTEM'`. **OPEN. P1**

**Re-verified live: still 18 posts, still all SYSTEM.** `private.post_daily_note`
runs at 06:00 UTC daily and `private.announce_completed_stays` at 05:20 UTC.

**Do.** Nothing to the code. Decide in advance at what member count the daily
note stops, and put that number in `bot_settings` rather than in a deploy. The
SYSTEM author kind is a good answer to an empty room and becomes noise the moment
there are people in it.

### O-3. Two hardcoded `en-NG` number formats remain, and the measurement says leave them. **OPEN by choice. P2**

`PostCard` was fixed. Two calls remain in
`components/social/PlacePicker.tsx` plus one in a documentation page. Across all
four shipped locales the formatted output is byte-identical, because all four use
Latin digits and comma grouping, so the hardcoded tag produces the correct string
for every reader the product has. `PlacePicker` is a client component with no
locale context.

**Do it the moment either of two things happens:** a locale is added that groups
or digits differently, or a locale context appears for another reason. Not as its
own work. The same defect on **money** was real and was fixed, because `ha-NG`
writes `₦ 5,000` with a space.

### O-4. Media for a removed post stays in storage. **OPEN. P2**

Unchanged, and now part of the wider media picture in MED-3. Nothing is readable
in the meantime, so this is storage cost rather than exposure. A sweep through
the storage API deleting every `social-media` object no `post_media` row and no
`stories.image_path` mentions. Deleting the `storage.objects` row from SQL would
leave the bytes untracked, which is worse.

### O-5. Nothing connects the social layer back to the catalogue. **OPEN, and now more valuable. P1**

Unchanged in code, and its value has gone up, because section 11 establishes that
the place layer is the only populated surface the platform has. The social layer
is currently the product.

**Do.** One control on `/around/[slug]`: "See places to rent in Yaba", linking to
`/search` scoped to that local government, and honest when the answer is none.
Then the reverse: a place card on a listing page showing the area's live posts.
Both are a query, not a schema.

---

## 14. AI assistant

### AI-1. The assistant persists threads it never reads back. **OPEN. P1**

Unchanged. `app/api/assistant/route.ts` writes `ai_conversations` and
`ai_messages`. `components/app/assistant/threads.ts` reads only `localStorage`
under `nf_ai_threads`. Nothing selects those tables, so history vanishes on a new
device though the rows exist.

**Do.** Read the persisted rows on load and reconcile an anonymous thread into
the signed-in account on sign in. Note that N-1 makes this more visible: a
signed-out visitor can now browse, so an anonymous thread is now a common case
rather than an edge one.

### AI-2. The assistant's tools have no caller context. **OPEN. P2**

Unchanged. The only grounded tool is `search_listings`.

**Do.** Add tools bound to the caller's own RLS client server side, with **no
identity argument at all**. A tool that takes a user id is a tool that can be
asked about somebody else. This is the same shape the database audit named as
dangerous in SECURITY DEFINER functions and the same discipline applies. See
SEC-3.

### AI-3. The cost ceiling exists and is not alerted on. **OPEN. P2**

A per-month ceiling lives in `bot_settings` and is read against
`bot_invocations`. Hitting it is silent. Notify admin at 80 per cent: the ceiling
protects the bill and nobody learns the product got popular.

### AI-4. The assistant must not answer questions about escrow, fees or verification from its own model. **NEW. OPEN. P1**

**Why this is here.** Sections 7, 8 and 9 are precisely the topics where a
generative answer will invent a policy the platform does not have, and where an
invented answer is a representation about somebody's money. The assistant already
has grounded tools, so the pattern exists.

**Do.** A refusal list. On escrow, fees, commission, verification requirements
and refund policy, the assistant quotes the canonical page or hands off to
support, and never composes. Add it to the same spec family that already bans
`demo` and `sample` in copy.

---

## 15. Emails

### EM-1. The email system is rebuilt as a block composer. **DONE, and it is good. Was P1**

**Verified in the tree.** `apps/web/src/lib/email/render.ts` renders one list of
blocks twice, as HTML and as plain text, so the two cannot drift. The reasoning
is worth keeping: a separately maintained text alternative is wrong within a
month, and a wrong one is worse than none because it is what a screen reader
reads, what a text-only client shows, and what a spam filter compares against the
HTML. A message with no `text/plain` part scores worse with every major spam
filter, which on a platform whose emails carry a verification code and a wallet
receipt is not cosmetic.

The light and dark handling is also correct and unusually careful: inline styles
carry the light palette because inline is the only thing every client honours, a
`<style>` block carries a `prefers-color-scheme: dark` override with
`!important` because a stylesheet rule cannot otherwise beat an inline
attribute, clients that strip `<style>` get a complete light email rather than a
degraded one, and `color-scheme: light dark` stops Apple Mail inverting a
hand-built dark palette back into a light one nobody designed.

### EM-2. Nothing proves a transactional message was delivered. **OPEN. P1**

`lib/email/messages.ts` exports nine builders and live sends run from reserve,
cancel, arrival, the admin booking actions, wallet withdrawal and support filing,
all wrapped in `bestEffortEmail` so a mail failure never rolls back a committed
write. That wrapper is correct and it means a delivery failure is invisible.

**Do.** Folded into W-8: one shared `swallow()` helper that logs what it
swallows. `bestEffortEmail` is right to swallow and wrong to forget. Then a
weekly count of swallowed failures by message kind, which is the thing that
surfaces a silent regression.

### EM-3. The five auth templates must be pasted in by hand. **OPEN. P2**

`supabase/templates/` holds five branded templates generated by
`scripts/build-auth-emails.mjs`. They are applied through the dashboard.

**Do.** Script the Management API path so the repository is the source of truth
and the dashboard is a deploy target. Today a regeneration silently does not
reach production, which is the same class of drift as section 22.

### EM-4. `EMAIL_FROM` must be a verified sender. **OPEN. P1**

Owner action: verify the sending domain on Resend before launch. It defaults to
`RentMe <hello@rentme.ng>`, which will bounce until the domain is verified. Add
SPF, DKIM and DMARC while you are there; a property marketplace sending wallet
receipts from an unauthenticated domain lands in spam and the receipts are the
messages that must not.

---

## 16. Legal and privacy

### LG-1. The landing page claims NDPA compliance as a fact. **OPEN. P0**

**Re-verified today, unchanged.** `apps/web/src/app/page.tsx` answers "Is my data
safe under NDPA?" with "Yes. RentMe is built to comply with the Nigeria Data
Protection Act." Nothing in this repository can establish that. The Act requires
registration with the NDPC as a data controller of major importance and a
designated Data Protection Officer, and registration has a lead time measured in
weeks.

**Do, two separate things.** Change the copy today to describe what the platform
actually does, which is real and worth saying: data encrypted in transit and at
rest, never sold, a copy or a deletion on request, the rights the Act gives you.
Delete the compliance claim. Separately, start the NDPC registration and appoint
the officer.

**And it has got more urgent**, because section 9 is about to start collecting
Nigerian identity documents, which is exactly the processing that makes the
registration obligation unambiguous rather than arguable.

### LG-2. The privacy policy names no controller and no officer. **OPEN. P1**

Unchanged. The policy itself is good, plain, cites the Act correctly and is
shared with the in-product copy so the back button behaves. It does not name the
legal entity acting as controller, the registered address, the Data Protection
Officer, or a rights-request route other than a support ticket. Add all four the
moment the entity is registered; they are the parts a rights request needs.

**And add a retention schedule**, because KYC-3 creates one and a privacy policy
that does not state how long identity documents are kept is incomplete in the
one way that matters.

### LG-3. There is no cookie or storage consent, and there may be nothing to consent to. **OPEN. P2**

Unchanged and still a genuine asset: there is **no analytics vendor and no crash
reporting in this codebase at all**. Storage is an auth cookie, a theme choice,
a locale cookie, a saved-item cache and search memory. Every one is strictly
necessary or a user preference.

**Do.** Confirm with counsel that no banner is required for that set, then write
the conclusion here so it is not re-litigated. If crash reporting is ever added
the question reopens, and that is a real privacy cost to weigh deliberately
rather than discover during a store review. Note that P-10's `listing_viewed`
event is the first thing that could change this answer, so decide it as part of
that work.

### LG-4. Rental and sale agreements are not modelled and will need legal input. **OPEN. P2**

Now attached to real work rather than hypothetical: P-8 and KYC-6 both touch it.
A Nigerian property sale involves a deed, a survey and a governor's consent, and
the platform's role in that chain is a legal question before it is a schema.

### LG-5. Escrow and fees each need their own legal answer, and they are different. **NEW. OPEN. P0**

Recorded so they are not treated as one item. E-7 is a payments and licensing
question about holding third-party money. Section 8 is a consumer disclosure and
contract question about changing a price on people who have already listed. They
go to different advisers and both have lead times.

---

## 17. Security

### SEC-1. The Content Security Policy is built, served and not enforced. **OPEN. P1**

Unchanged. `lib/security/csp.ts` builds it, `middleware.ts` serves it on all three
exits with a per-request nonce, and the root layout nonces its two before-paint
scripts. `cspHeaderName()` returns `Content-Security-Policy-Report-Only` unless
`CSP_ENFORCE === "true"`, which is unset.

**Do.** Watch `/api/csp-report` and the `[csp]` lines across real traffic. When
they stop, set `CSP_ENFORCE=true`, on a day somebody is watching, because the
warning already written in `csp.ts` says something in the deposit path is
expected to break the day it is enforced. A wrong policy does not degrade, it
white-screens.

### SEC-2. Two high severity npm advisories, both lint-time only. **OPEN. P2**

**This number has moved by seven in both directions without anybody noticing.
Re-run `npm audit` before quoting it.** Root `overrides` pin `sharp` and
`postcss`, closing six. What remains reaches only ESLint's own config parsing and
does not touch the shipped bundle or the request path.

### SEC-3. The database advisors, re-read today. **PARTLY DONE. P2**

**Re-run live today. Nine findings, and the set has changed in the right
direction.**

| Finding | Level | Verdict |
|---|---|---|
| `idempotency_records` RLS on, no policy | INFO | **Correct by design.** The absence of a policy is the control |
| `rate_limits` RLS on, no policy | INFO | **Correct by design.** Same |
| `platform_stats` executable by anon and authenticated | WARN | **Correct by design.** Revoking it turns the landing page numbers band into an error for every signed-out visitor, and N-1 has just made signed-out visitors the common case |
| `agent_trust` executable by anon and authenticated | WARN | **Correct by design.** It carries `where exists (select 1 from me)`, so a non-agent yields no row |
| `current_agent_id` executable by authenticated | WARN | **Correct, and narrowed.** It was executable by anon and PUBLIC; migration `20260809090500` revoked both. This remaining entry is the intended state |
| `enter_place` executable by authenticated | WARN | **Correct by design.** A signed-in person joining a place is the feature |
| Leaked password protection disabled | WARN | **Real.** See V-5 |

**`places_cache` has dropped off this list**, which independently confirms S-2.

**The pattern worth naming, because it is the rule for every future SECURITY
DEFINER function:** the callable ones take no argument, or take one that
identifies public data. The dangerous shape is a definer function that takes an
identifier and then acts with the definer's authority on behalf of whoever was
named. This project shipped that bug once, in `grant_staff_role`, which
authorised off its own argument and was granted to `authenticated`, so any
signed-in user could pass a super admin's uuid and become one. It was revoked to
`service_role` with a second check inside. **Do not write that shape again**, and
in particular do not write it for escrow release or fee application, where it
would be a way to move somebody else's money.

### SEC-4. The middleware matcher hole is fixed and the lesson generalises. **DONE. P2 residual**

The matcher excluded any path *ending* in an asset extension rather than paths
under an asset directory, so `/checkout/abc.png`, `/listing/abc.png` and
`/u/somebody.png` all returned 200 with full HTML, no CSP, no nonce and no
session refresh. It is now anchored on directories.

**Residual.** A spec asserting the CSP header and the nonce are present on a
representative dynamic route with a `.png` suffix. The fix is right and nothing
holds it.

### SEC-5. There is no session or device management. **OPEN. P1**

Unchanged. A person cannot see where they are signed in and cannot sign a device
out. A wallet-bearing account on a lost phone must be recoverable by its owner,
not by a support ticket. Build the device list on `/settings`, a
sign-out-everywhere action, and a new-device notification; the notification
writer already exists.

### SEC-6. The public browse surface is new and has not been threat-modelled. **NEW. OPEN. P1**

N-1 opened six route families to anonymous traffic in one commit. That is the
right change and it changes the threat model, and nobody has gone back over it.

**Do, and each is a specific question rather than a general worry.**
1. **What can an anonymous request enumerate?** `/u/[handle]` and `/listing/[id]`
   are now scrapeable. Confirm the RLS policies on `profiles` and `listings`
   expose only what a public profile and a published listing should, and confirm
   that a `DRAFT` or `SUSPENDED` listing 404s rather than 403s, because the
   difference is an oracle.
2. **Rate limit the public surfaces.** They were behind a session, so they were
   implicitly limited by having to have an account. They are not any more.
   `/search` in particular now runs unauthenticated database queries for anybody
   with a loop.
3. **The map viewport RPC in M-5 will be a public endpoint** taking a
   caller-supplied bounding box. A box covering all of Nigeria at a high limit is
   a catalogue export. Cap the box area, cap the result count, and rate limit it.
4. **Re-run the CSP watch.** The report-only policy was tuned against
   authenticated traffic and the anonymous paths were unreachable.

---

## 18. Performance

### PERF-1. Home was 3.6MB of imagery and is 28KB under Save-Data. **DONE. Model for the rest**

`/home` was 3,676KB at 390px with an empty catalogue, 3,520KB of it imagery. Under
`Save-Data` or 2g it is 28KB: the artwork is **never requested** rather than
hidden, and the Ken Burns pan, blooms, grain and aurora go with it. Every colour,
control and heading stays. Proved by `apps/web/tests/save-data.spec.mjs`.

**Do.** Apply the same treatment to the remaining heavy routes, and add a
user-facing data-saver toggle so somebody on a metered bundle can choose it
rather than waiting for a header they do not control. 3.5MB is a real amount of a
Nigerian data bundle and this is the highest-value performance work in the
product.

**And apply it to video first**, per MED-2. Video is the next thing that could
undo this entire result in one commit.

### PERF-2. Fonts are self-hosted, preloaded and correct. **DONE**

Both faces were already self-hosted through `next/font` and not one preload link
ever reached a browser. Nineteen files existed, ten were fetched on every load,
four were never painted. Seven now, checked in, preloaded per locale, immutable
for a year. The declared subset list was also wrong: the Yoruba and Igbo dotted
vowels live in `vietnamese`, which was never asked for. Guarded by
`apps/web/tests/fonts.spec.mjs`.

### PERF-3. Images all have reserved boxes. **DONE**

A sweep of 43 routes at 390 and 1280 found zero images without a reserved box.
The guard covers all 43 routes; it used to cover 22, which proved half the
platform.

### PERF-4. `apps/web/tsconfig.json` carries ten dead `include` entries. **OPEN. P2**

Parallel builds added `".next-a1/types/**"` and friends, but `exclude` holds
`".next-*"` and exclude filters include, so every one does nothing. Only the
default `.next/types` is live, because it has no dash. Harmless; tidy it next
time somebody is in that file.

### PERF-5. Orphan modules. **PARTLY DONE. P2. Re-verify before deleting**

The previous list of nine (1,276 lines) was measured before the current wave of
work, and commit `5e5aa79` touched several of the files on it, including
`StatCard.tsx` and `MessageThread.tsx`. **Re-run the module-path greps before
deleting anything.** `WalletActions.tsx` is separately confirmed still orphaned
under W-3 and is the one safe deletion.

Two that were on an earlier list are no longer orphans and must not be deleted:
`components/app/MomentScreen.tsx` and `lib/platform-stats.ts`.

### PERF-6. Nothing measures anything in production. **NEW. OPEN. P2**

There is no analytics and no crash reporting, which LG-3 correctly calls an
asset. It is also the reason no statement in this section can be made about real
users on real Nigerian networks; every figure here came from a local probe.

**Do.** Not a vendor. Web Vitals reported to an internal route and stored in
`public.events`, which already exists. It keeps the privacy posture intact,
keeps the consent question closed, and answers the only question that matters:
what the product costs on a real phone on a real network.

---

## 19. Mobile and store readiness

### MOB-1. Capacitor is installed, both native projects generate, no native build has ever run. **OPEN. P1**

**Verified in the repository.** `apps/web/capacitor.config.ts` with
`appId: "ng.rentme.app"` and `appName: "RentMe"`, `android/`, `ios/`,
`native-shell/`, `src/lib/native/`, `public/.well-known/`. The config file is
unusually well reasoned and should be read before anything is changed in it: it
explains why `webDir` holds an offline shell rather than a static export (40
files declare server actions, `output: 'export'` refuses them, middleware is the
session lock and static export runs none), and why `server.url` comes from
`CAPACITOR_SERVER_URL` rather than `NEXT_PUBLIC_SITE_URL`.

**Proven:** both projects generate, `cap sync` succeeds with five plugins each,
every Gradle file parses, Gradle 8.14.3 runs on JDK 21, the manifest, plist and
entitlements are well formed, icons survive Android's real 66-of-108 launcher
mask, and both association files serve 200 with the right content type.

**Not proven, each needing a real toolchain:** that the Android project compiles,
that R8 with `minifyEnabled true` produces a working bundle, that the hand-edited
`project.pbxproj` opens in Xcode, and that the location permission behaves as
reasoned. No Android SDK and no macOS in this environment.

**Do.** Connect Codemagic or equivalent and run one build of each before anything
else in this section is trusted.

### MOB-2. Apple guideline 4.2 is an argument, not a guarantee. **OPEN. P1**

Path A, a Capacitor shell pointed at the production origin, is the textbook case
App Review rejects as a thin web wrapper. The native capabilities in
`src/lib/native/` are the argument against it: hardware back, a status bar bound
to the theme, keyboard insets, splash control, and the system-browser handoff.
The config file says so itself.

**Do.** Ship the PWA now. Take Path A to Google Play, which is far more tolerant.
Build Path C, Expo sharing `packages/design-tokens` and `packages/i18n`, for iOS
if 4.2 bites.

### MOB-3. Both association files exist. Two values in them are placeholders. **CORRECTED. OPEN. P1**

**This entry corrects a claim that has been repeated, including in the brief for
this pass.** `public/.well-known/assetlinks.json` and
`public/.well-known/apple-app-site-association` **both exist and both have real,
carefully reasoned content**. They are not missing.

What is missing is two values inside them, and neither is obtainable from this
repository:

- `assetlinks.json` carries two literal
  `PLACEHOLDER_REPLACE_WITH_...` strings where the SHA-256 fingerprints go. It
  needs **both**: the Play app signing certificate, which is the one that matters
  on a shipped install because Play strips our signature and re-signs, and the
  upload key, which is what makes App Links verify on hand-installed test builds.
  Leaving either out costs a day of confusion.
- `apple-app-site-association` carries
  `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.ng.rentme.app` and needs the
  ten-character Team ID.

**And a second correction, which matters more.** It has been said that the
missing association files break the payment return leg in the in-app browser.
**The opposite is true.** The AASA file deliberately and explicitly **excludes**
`/checkout/*`, `/wallet*`, `/auth/*` and `/api/*` from Universal Links, with a
comment on each explaining why: the Paystack return "has to complete in the
browser session that started it", and pulling the OAuth callback into the app
would hand it a code it cannot redeem because the PKCE verifier and cookies live
in the system browser. Those exclusions are correct and are exactly what protects
the payment return leg. They are ordered first in the file, which is also
correct, because AASA component matching is order-sensitive.

**Do.** Supply the three values. Do not "fix" the exclusions. And add a spec that
fails the build if either file still contains the string `PLACEHOLDER`, so this
cannot ship.

### MOB-4. Push notifications are not wired, and that is the right order. **OPEN. P2**

The notification layer exists as database rows with triggers, which is the hard
half. Delivery to a device is separate work and it spends the one permission
prompt a person will ever grant, so it should ship with something worth saying.
Escrow state changes (section 7) are the first thing genuinely worth a push.

### MOB-5. `@capacitor/assets` writes two files that must be deleted after every run. **OPEN. P1**

`apps/web/icons/` and `apps/web/public/manifest.webmanifest`. The second is the
dangerous one: this app serves its manifest from the typed route
`src/app/manifest.ts`, and a static file in `public/` **shadows a route**, so
leaving it replaces a carefully built manifest with a generated one carrying
relative `../icons/` paths and declaring `.webp` files as `image/png`.

**Do.** Put the deletion in the npm script rather than in a document nobody
re-reads.

### MOB-6. A 1024px master of the house-and-R mark would remove the one enlargement. **OPEN. P2**

The only master is a 910x857 lockup whose mark is 511x598, so the App Store icon
enlarges it about 1.5x. Every other asset in the pipeline is a reduction. Owner
action: supply a vector or 1024px master.

### MOB-7. Permissions and usage strings. **NEW. OPEN. P1**

Both stores reject on this and both reject late, after a build has been uploaded
and reviewed.

**Do.**
1. **Declare only what is used.** Today that is camera and photo library, for
   uploads. Location if and when the map asks for it. Nothing else. Every
   declared permission that is never exercised is a rejection reason on iOS and
   a data-safety inconsistency on Android.
2. **Write real `NS*UsageDescription` strings**, in the plist, in the user's
   words, naming the benefit. "RentMe uses your camera to let you photograph a
   property you are listing" passes. "Camera access required" does not, and it
   is the single most common iOS rejection.
3. `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
   `NSPhotoLibraryAddUsageDescription` if anything saves, and
   `NSLocationWhenInUseUsageDescription` only if location ships. **Never**
   `NSLocationAlwaysAndWhenInUseUsageDescription`; this product has no reason
   for background location and asking for it invites a rejection and a
   data-safety declaration nobody wants to write.
4. **Android 13+ needs `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`**, not the old
   `READ_EXTERNAL_STORAGE`. If MED-2 ships video, the second is required.
   `POST_NOTIFICATIONS` only when MOB-4 does.
5. **Ask in context, never on launch.** A permission prompt on first open is
   refused by most people and cannot be asked again.

### MOB-8. Safe areas. **NEW. OPEN. P1**

**Do, and audit each rather than assuming.**
1. `viewport-fit=cover` plus `env(safe-area-inset-*)` on every fixed element.
   The island dock and the sticky listing bar are the two that will be wrong.
2. **The bottom sheet in M-9 must clear the home indicator**, and its full detent
   must clear the status bar and the notch.
3. Android gesture navigation needs the same treatment and is usually forgotten
   because it is tested on a device with buttons.
4. **The keyboard.** `capacitor.config.ts` sets `resize: "native"`, which shrinks
   the web view so a submit button stays reachable, and the comment records that
   the "body" alternative leaves controls behind the keyboard. Verify it on a
   real device against the sheets and the wizard, which are the two places this
   bug has already been fixed once on the web.
5. Landscape and tablet. Not a target, and it must not be broken; a reviewer will
   rotate the device.

### MOB-9. Store metadata and data safety declarations. **NEW. OPEN. P1**

These are the items that hold a submission for a week each and none of them is
engineering.

**Both stores.** Name, subtitle, description, keywords, support URL, marketing
URL, privacy policy URL (which must resolve and must be the public
`/privacy`, not `/legal/privacy`), category (Lifestyle or House and Home),
content rating, and screenshots at every required size in both themes.

**Screenshots are the constraint nobody plans for.** They must show real screens.
With zero listings, every discovery screenshot is empty or invented, and an
invented screenshot showing fabricated verified properties is the exact thing
section 11 exists to prevent. **This is a hard dependency on DEMO-1.** Say so in
the schedule.

**Apple specifically.** App Privacy answers must match what the app does: contact
info, identifiers, financial info and user content are all collected here and all
have to be declared, linked to identity, with the purpose stated. A wrong answer
found later is a removal, not a rejection. Export compliance: the app uses HTTPS
only, which is the standard exemption, and the answer still has to be given.
Demo account credentials for review, and the account must be able to see a
populated product. Age rating.

**Google specifically.** The Data Safety form is separate from the privacy policy
and must agree with it. Declare collection of personal info, financial info,
photos, messages and location if it ships; declare encryption in transit;
declare the deletion route, and **the deletion route must actually exist and be
reachable without contacting support**, which is now a Play requirement and is
worth checking against what `/settings` offers today. Target API level, and a
financial-features declaration because the app carries a wallet.

**Both, and it is the one that surprises people.** An app that handles payments
must be clear about who is taking the money. Paystack is the processor and the
listing description should say so.

### MOB-10. Signing. **NEW. OPEN. P1**

**Android.** Enrol in Play App Signing. Generate an upload key, store it and its
password in a manager rather than in the repository, and record the SHA-256 of
both it and the Play signing certificate in `assetlinks.json` per MOB-3. **Losing
the upload key is recoverable; losing an unmanaged app signing key means never
updating the app again.** Confirm `.gitignore` excludes `*.keystore`, `*.jks` and
`key.properties` before the first key exists rather than after.

**iOS.** An Apple Developer Program membership, a distribution certificate, an
App Store provisioning profile for `ng.rentme.app`, and the Team ID for MOB-3.
Use App Store Connect API keys for CI rather than a personal Apple ID, so a
person leaving does not break the pipeline.

**Both.** `scripts/sync-native-versions.mjs` already exists; confirm it drives
version and build numbers from one source. Two stores disagreeing about the
version is a support conversation nobody can win.

---

## 20. The rename

The platform is called RentMe. The code is substantially called NaijaFinds. This
is now a section rather than an entry because it touches five different systems
and the order matters more than the work does.

### RN-1. The measurements, taken today. **NEW**

Counted across `*.ts`, `*.tsx`, `*.json`, `*.css`, `*.md`, `*.js`, `*.mjs` and
`*.sql`, excluding `node_modules` and `.git`:

| Thing | Count |
|---|---|
| Files containing `NaijaFinds` or `naijafinds` | **211** |
| Files containing `RentMe` or `rentme` | **244** |
| Distinct `.nf-*` selectors in CSS | **239** |
| Distinct `--nf-*` custom properties in CSS | **208** |
| Distinct `nf-*` identifiers in `.ts` and `.tsx` | **338** |
| npm scope | `@naijafinds/i18n`, `@naijafinds/design-tokens` |
| Workspace name | `naijafinds` |
| Root `package.json` description | "NaijaFinds. Nigeria-first discovery, stay, food and experience platform." |
| GitHub repository | `read-it-well` |
| Capacitor `appId` | `ng.rentme.app` (already correct) |
| Live Vercel domain | `ninjafinds.vercel.app` |

Note the counts are larger than previously recorded, in every category. Nobody
was wrong; the earlier figures used a narrower file set. Quote these and say how
they were measured.

**And note the domain.** `ninjafinds.vercel.app` is not `naijafinds` and not
`rentme`. It is a **third** spelling, and it is a typo of the old name. It is
also, today, the production address.

### RN-2. The safe sequence. **NEW. OPEN. P1**

The governing rule: **do the changes that are visible to users first, the changes
that are invisible last, and never do an invisible one at the same time as a
visible one.** A find-and-replace across every import in the tree is churn that
hides a real change in a diff, and the review that misses a real change is the
cost of doing this badly.

**Stage 1, today, minutes, zero risk.** Strings nobody imports.
- Root `package.json` `name` and `description`.
- `apps/web/package.json` description.
- Any remaining `NaijaFinds` in user-visible copy and in the four locale files.
  **Grep the locale files specifically**, because a brand name inside a
  translated string is the one place a rename is both user-visible and easy to
  miss.
- Verify with a spec: no rendered page contains the string `NaijaFinds`. Add it
  to CI. This is the only part of the rename that has a correctness criterion,
  so it is the only part that should be enforced mechanically.

**Stage 2, before launch, and it is owner work.** The domain.
- Acquire and configure `rentme.ng`, which is already the assumed domain in
  `EMAIL_FROM` and in the AASA comments.
- Point Vercel at it, keep `ninjafinds.vercel.app` as a redirect rather than
  deleting it, because links exist.
- **This must happen before MOB-3**, because `CAPACITOR_SERVER_URL`, the
  association files and the Universal Links domain all have to name the final
  origin. A native binary shipped against the wrong origin is a resubmission.
- **And before N-2**, because a sitemap and canonical URLs on a domain you are
  about to leave is negative work.

**Stage 3, when the tree is quiet, and only then.** The npm scope.
- `@naijafinds/i18n` to `@rentme/i18n`, `@naijafinds/design-tokens` to
  `@rentme/design-tokens`, workspace name to `rentme`.
- This is mechanical: two `package.json` names, the workspace globs, and a
  find-and-replace across imports. It is also the change most likely to collide
  with three parallel work streams, which is the entire reason it goes last.
- **Do it in one commit that changes nothing else.** A rename commit that also
  fixes a bug is unreviewable.
- Verification is `npm run typecheck` plus `npm run build`. If both pass, the
  rename is complete, because these are compile-time identifiers.

**Stage 4, optional, and the recommendation is do not.** The `nf-` prefix.
- 239 CSS selectors, 208 custom properties, 338 identifiers in TypeScript, and
  a lint rule and two scripts that match on the prefix.
- **Recommendation: leave it.** The user-visible gain is zero. The risk is a
  missed rename in a template string or a dynamically composed class name, which
  typechecks, builds, passes lint, and renders an unstyled element on one route
  nobody opens until a customer does. `nf` can simply stand for nothing, the way
  most CSS prefixes eventually do.
- **Record this as a decision here**, so it stops being re-raised every time
  somebody greps the stylesheet. If it is ever done, it is a single commit that
  changes nothing else, verified by a full visual sweep of all 43 routes in both
  themes, not by a passing build.

**Stage 5.** Rename the GitHub repository from `read-it-well` to `rentme`.
GitHub redirects the old URL, so this is safe. It matches nothing today and
surprises everybody who clones it.

### RN-3. The one thing the rename must not touch. **NEW. P1**

Database identifiers. The `nf_` prefixed cookies (`nf_theme`), the
`rentme-*` cron job names, the migration filenames and the `rm-fund-`,
`rm-wd-`, `rm-book-` payment reference prefixes are all either already correct or
load-bearing in a way a rename would break. In particular, **the payment
reference prefixes are a contract with Paystack's historical data** and the
webhook routes on them. Never change them. Add a comment in
`lib/payments/references.ts` saying so, because it is exactly the kind of
`nf`-adjacent string a thorough rename would sweep up.

---

<!-- SENTINEL-1 -->




