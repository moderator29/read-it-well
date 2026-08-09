# RentMe recommendations

This is the second full pass. The first was written on 2026-08-09 and carried 79
entries. A great many of them have since been built, and the point of this file
is that it says so, entry by entry, with the commit or the migration that did it,
rather than quietly rotting into another document that describes a platform which
no longer exists. That is exactly how its predecessor died.

Every claim below was checked on **2026-08-09** against the code in the working
tree, the migration files, or the live Supabase project `uccixoonmbhrnyczyigt`.
Nothing here is remembered. Where something could not be verified from inside
this environment it is in section 26 rather than softened into a claim.

**Sections 23, 24 and 25 were added later the same day**, covering the three
areas the file was thinnest on: how the product should look and feel, the motion
language, and backend speed. They follow the same rule as everything above them.
Every measurement in them was taken on the day they were written, and several of
their entries were built in the same sitting and are marked DONE with what did
it, so that a future pass does not rebuild them.

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
[Look and vibe](#23-look-inspiration-vibe-and-style) ·
[Motion](#24-motion) ·
[Backend speed](#25-backend-speed-strength-and-sharpness) ·
[Unknowns](#26-what-is-not-known)

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

**The third question turned out to be a pattern, not an incident.** Auditing for
it found the same bug in three separate places, wearing three costumes:

1. **The wallet** drew a confident zero balance on a failed read. Fixed: the
   reader reports `readFailed` and the screen draws NO FIGURE AT ALL, not a zero,
   not a dash, not a skeleton that settles into a number. History is withheld
   with it, because an empty list under a missing balance reads as "no
   transactions", which is a second false statement dressed as an absence.
2. **The trips hub** returned three empty groups on a query error, so somebody
   with a stay next week, on a bad connection, was told they had no trips. Fixed
   before this audit, and fixed well: it returns `"unavailable"` rather than
   `null`, because `null` already meant signed out and reusing it would have been
   a second bug wearing the first one's clothes.
3. **The admin money desk** would have reported "nothing stuck, nothing earned"
   when a permission check failed. Fixed with the surface: payment health and
   revenue resolve to `unavailable` rather than to empty, and the sweep fails
   rather than claiming a clean queue it never saw.

**The rule, stated once so it can be applied without rediscovering it.** An
absence of data must never be rendered as a fact about the world. A zero, an
empty list and a clean queue are all claims. If the read failed, the only honest
answer is that we do not know, and it is the only one a person can act on: they
can stop, and they can ask. Check this FIRST in anything new that touches money
or somebody's own records, because all three of these passed review and passed
tests.

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

**UPDATE, 2026-08-09. The "nothing calls it" half is fixed.** A capped,
rate-limited caller and a route handler now exist and are specced:
`lib/listings/bounds.ts` and `app/api/map/listings/route.ts`. **See BE-8 in
section 25 for what was built and why, before writing any of this.** What
remains is the client: `RealMap.tsx` and `MapCanvas.tsx` still receive the whole
catalogue server-side and still never ask again. That is M-5 point 3 onwards and
M-6, and it is now a client task against an endpoint that exists.

### M-5. Viewport loading: the map should ask for what is on screen. **NEW. PARTLY DONE 2026-08-09. P1 for the client half**

**Wrong today.** The map receives the whole catalogue on the server and never
asks for anything again. Panning to Abuja re-uses the pins that were shipped for
Lagos, which is correct only because both fit in one payload.

**Do.**
1. ~~A route handler that takes a bounding box, the current filters and a limit,
   and calls `listings_in_bounds`, returning the minimum a pin needs.~~
   **DONE 2026-08-09.** `GET /api/map/listings?west=&south=&east=&north=` with
   optional `intent`, `kind`, `bedrooms`, `minPrice`, `maxPrice`, `limit`. It
   returns twelve narrow fields per pin and no description, no fee breakdown and
   no amenities. Box and rate caps, three distinguishable refusals, 22 specs.
   **Full detail in BE-8.**
2. ~~**Cap the result and say so.**~~ **DONE for the server half.** The response
   carries `capped: true` when the answer hit the 300-pin ceiling. The CONTROL
   is still owed: "1,240 places here, showing 300. Zoom in or refine." Note the
   count in that copy is not available yet, because the RPC returns rows rather
   than a total; either add a count to the function or word the control without
   one. Silently truncating a map is how a user concludes the platform has no
   stock in their area.
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

### E-1. Escrow has just started, in the right place. Nothing is promised yet. **STARTED during this pass. P0 to finish, P0 to keep not marketing**

**Re-verified live, and this changed while this document was being written.**
Migration `20260809051007_escrow_money_stays_in_the_one_ledger` is applied.
`public.wallet_entry_kind` now reads `deposit, withdrawal, payment, refund,
transfer_in, transfer_out, escrow_hold, escrow_release, escrow_refund`.

**The decision embedded in that migration is the right one and should be
defended.** Escrow moves through `public.wallet_entries`, the ledger the platform
already has, rather than through a second table of balances that shadows it. A
shadow ledger is how a marketplace ends up unable to answer "how much does this
person have" with one number. A hold is a debit that has left the payer's
spendable balance and not yet reached anybody; a release is the credit that lands
on the other side; a refund is the credit that goes back. All three are wallet
movements and all three belong where every other movement is.

The migration also isolates the three enum values in a file of their own, because
Postgres will not let a transaction use an enum value the same transaction added
unless it also created the type. That makes the ordering a fact of the filesystem
rather than a rule somebody has to remember, which is the correct way to encode
it. And the values can never be removed: Postgres has no `DROP VALUE`, so adding
to an enum is a one-way door. Three were added and not a fourth.

**What still does not exist.** No `escrow_holds` table. No state machine. No
release condition, no release actor, no dispute path, no timeout. No UI.
`booking_status` is still `PENDING, CONFIRMED, CANCELLED` with no `COMPLETED`,
verified live, so the platform still cannot record that a stay happened. **The
ledger vocabulary now exists and the thing it describes does not.**

**And nothing is promised.** Grep the four locale files for escrow: zero.
`app/(site)/safety/page.tsx:27` says in a comment that the page makes "no promise
of an escrow that is not built", and keeps that promise. That refusal is the most
honest thing in this codebase and it must survive the marketing pass. It must
also survive the build: the pressure to announce escrow will peak the moment the
first hold posts in a staging environment, which is months before it should be
mentioned to anybody. See E-6.

### E-2. Add `COMPLETED` to `booking_status`. Escrow is being built around its absence. **OPEN. P0, and it is now the gate that is actively being built past**

**Re-verified live after the escrow migration landed:** `booking_status` is still
`PENDING`, `CONFIRMED`, `CANCELLED`. There is no `COMPLETED`.

So the ledger can now express "money is held" and the schema still cannot express
"the thing happened". Escrow's entire purpose is to connect those two sentences,
and the second one has no column. **This is now the most urgent item in section
7**, and it was overtaken: the ledger vocabulary was added first, which is
defensible on its own terms and means the gate is now behind the work rather than
in front of it.

**Do this next, before any escrow table.** It is a one-line enum addition plus a
scheduled transition, and `private.announce_completed_stays` already runs nightly
and already reasons about completed stays, so the moment exists in code and not
in the schema. Note the same Postgres constraint the escrow migration documented:
a new enum value cannot be used by the transaction that adds it, so `COMPLETED`
needs its own migration ahead of anything that references it.

It also unblocks two badges and the review prompt.

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

### FEE-1b. Escrow withheld a commission and credited it to nobody. **NEW. DONE. Was P0 the moment a rate went above zero**

**Found by auditing the money paths, not by a failing test, and it is the exact
counterexample to FEE-1 above.**

`private.escrow_settle` computed a commission, subtracted it from what the payee
received, recorded the number on `escrows.commission_minor`, and then credited it
to nobody. The payer was debited the full amount, the payee credited less, and
the difference existed only as an integer on a row. There was no platform wallet,
no `commission` value in the `wallet_entry_kind` enum, and no revenue table.

**Why it survived review.** Every rate is zero today, so the commission is always
zero, and zero going missing is invisible. It would have started losing money
silently on the day somebody raised a rate, which is precisely the day nobody is
watching the ledger.

**Why FEE-1 did not protect it.** FEE-1 is right that a fee should be a named
component of a sum that must balance, and `ledger_entries` enforces exactly that
with `ledger_balances_chk`. But that is the BOOKING settlement path. Escrow
settles through `wallet_entries`, which has no such structure, so escrow took a
different road and skipped the discipline bookings already had. **The lesson is
not "add a constraint", it is that a second money path was built without being
held to the first one's rules.** Check that first when a third one appears.

**Fixed** in `20260809084522_the_commission_we_withhold_lands_somewhere`.
`public.platform_revenue` is append only, RLS enabled with NO policies so every
client role is denied outright and `service_role` is the only reader, unique on a
reference derived from the escrow id so a replay cannot double book, foreign keys
`on delete restrict` because if deleting an escrow would erase the record that we
took money from it, the delete is the bug.

**A table, not a house wallet, deliberately.** Wallets here are user-shaped: RLS
around `auth.uid()`, read by the wallet screen, the source for withdrawal and
transfer, payout accounts attached. A platform wallet would inherit every one of
those paths and need excluding from each by hand forever, including from code
nobody has written yet.

**Verified against the live database, rolled back.** Five percent rate, 100000
kobo escrow released: payee 95000, revenue 5000, summing to gross exactly. Second
settle returned `already_settled` with the revenue row count still at one.
Afterwards the revenue table, escrows, wallet entries and the probe rate were all
confirmed absent.

**Still open, and small: `listing_fee` charges nothing anywhere.** It is in the
`revenue_source` enum and in `fee_rates`, and no code path would collect it even
if the rate were raised. Where a listing fee should be taken, at publish, at
first enquiry, or monthly, is an owner decision and was deliberately not invented.

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

### DEMO-2. If demo listings are built anyway, these are the non-negotiables. **NEW. NINE OF TEN DONE 2026-08-09. P1 residual, item 8 only**

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

**BUILT 2026-08-09. Forty-two example properties are live**, across Lagos (18),
Abuja (12), Port Harcourt (6) and Ibadan (6), in 13 real areas, spanning 9
property types, with real coordinates that answer `listings_in_bounds`. The
column is `listings.is_demo`, not `is_demonstration` as item 1 proposed; the
shorter name won because it is read at four call sites in SQL and one in the
mapper.

**What is enforced in the database, which is items 1, 2, 5 and 7.**

| Rule | Mechanism |
|---|---|
| The flag | `listings.is_demo boolean not null default false`, so anything not explicitly an example is real |
| No trust mark | `listings_demo_carries_no_trust_mark` CHECK: an example row may hold no `address_verified_at`, `physically_inspected_at` or `verified_by` |
| No promotion | `listings_demo_is_never_featured` CHECK. `featured` is a trust signal quietly, and it is what somebody reaches for while trying to make an empty platform look busy |
| No verified lister | `listings_demo_lister_is_unverified` trigger, plus `agents.is_demo` and `agents_demo_is_never_verified` |
| Not transactable | `refuse_transaction_on_demo_listing` on `bookings`, `reviews`, `inspection_requests` and `inspection_confirmations` |
| Not retro-flaggable | `refuse_demo_flag_on_committed_listing`, so a listing with real bookings cannot be turned into an example |
| No badge | `refuse_badge_for_example_lister` on `user_badges` |
| No ratings | Structural. `reviews.booking_id` is NOT NULL and a booking is refused, so no review can exist to average |

**Payment and escrow are covered transitively and deliberately.** Every money
path in this codebase hangs off a booking, so refusing the booking refuses all
of them at one chokepoint rather than enumerating money surfaces and missing the
next one added.

**Two leaks were found by reading the triggers rather than by testing the
surface, and both are sealed.** `private.announce_published_listing` would have
posted "A new apartment is now open in Lekki Phase 1" into the area feed as
news, in a table with no way to qualify it. `private.award_listing_badges` would
have awarded `first_listing` and `estate_specialist`. **One badge was actually
awarded during this work**, by a probe row that was inserted, checked and
deleted a second before the suppression landed, and it outlived the row that
earned it because badges do not cascade. That is recorded in migration
`20260809081841` because it is the whole argument for enforcing this at the
database: the rule was known, was being actively worked on, and still leaked.

**Item 3 is honoured more strictly than written: `address` is NULL on all 42
rows.** The area, the city and an approximate pin are the whole location claim.

**Item 4 needs no answer yet: there are no photographs at all.** Nothing under
`apps/web/public` is property imagery, and `MediaFrame` already draws a
deterministic gradient and skyline per listing hue, so an image-less listing is
a designed state rather than a failure. This is the right outcome: it removes
the licensing question entirely and it is visibly not a photograph of a real
house.

**Item 6, honoured.** The lister is `RentMe Example Collection`, institutional
rather than a person, with no phone number and no CAC number, on an account at
the RFC 2606 reserved `.invalid` TLD with no usable password hash and
`banned_until` in 2099, so it cannot be signed into.

**Item 9, nothing leaves the platform. DONE 2026-08-09.**

The four surfaces read through **one gate**,
`apps/web/src/lib/listings/syndication.ts`, and none of them decides anything
itself. Four copies of "is this row real?" drift into four different answers,
and the fifth surface is always the one nobody remembered. The gate is one
predicate, `maySyndicate`, and everything below is a consequence of it.

| Surface | What an example listing gets | Held by |
|---|---|---|
| Sitemap | Absent. `app/sitemap.ts` and `app/robots.ts` did not exist at all; both do now. Refused in SQL on `listings_demo_idx`, then refused again by the gate inside `buildSitemap` | `app/sitemap.test.ts`, including a database that hands an example row back anyway |
| JSON-LD | **No node.** `listingStructuredData` returns null and the page renders no script element rather than an empty one | `syndication.test.ts`, asserting the serialised output holds no Product, Offer, Residence or AggregateRating |
| Open Graph and Twitter | `robots: index false, follow false`, no canonical, and a card naming no property, no place and no price. `og:type` is website, never product | `syndication.test.ts` plus a spec holding the page to delegating |
| Email | `lib/email/listings.ts` is the one door, and it refuses twice: pushed down to SQL, then re-checked in code | `lib/email/listings.test.ts`, plus a guard that no module under `lib/email` reaches the repository by any other route |

**Two things worth knowing.** The listing detail page previously returned
`index: false` for EVERY listing, so the whole catalogue was invisible to
search; that was the right blunt instrument while all of it was invented and
the wrong one now. Real listings are indexable and carry a priced `Offer`, and
that is what makes the exclusion of the example rows meaningful rather than
theoretical. And **email was already covered transitively**: every live send
site hangs off a booking, an escrow movement, a wallet row or a support ticket,
and the database refuses a booking against an example listing. That is a fact
about what has been built, not a rule, which is why the door and the guard exist
before the first digest does.

**The page still renders for a person.** Example listings are meant to be
browsable in-product. The rule is about machines, and that distinction is the
whole design.

**Item 10, the deletion date. DONE 2026-08-09. The date is 2026-11-07.**

`listings.demo_retire_after date`, on the listing rather than on the example
lister: retirement will happen in waves (Lagos filling first is the likely
case), the date has to survive the lister account being deleted, and the rule
belongs beside the `is_demo` flag it qualifies. A trigger supplies the default
conditionally, because a column DEFAULT would stamp an expiry onto real
inventory, and a CHECK holds the two columns to each other in both directions.
Migration `20260809084449`.

Nothing in the read path compares the clock to that date. A catalogue that
empties itself overnight would blank discovery, the map and every city page at
once with the cause invisible from any screen. The alarm is a spec,
`lib/listings/retirement.test.ts`, which fails the build once the date has
passed and the tree still ships the collection with no migration removing it.
Verified by moving the date into the past and watching it go red.

**RESIDUAL.**

- **Item 8 is still unbuilt.** No surface renders the statement. The agreed
  wording is "This is an example listing. No such property is available. RentMe
  has not verified anything on this page." and it is exported as
  `EXAMPLE_STATEMENT` from `lib/listings/syndication.ts`, so the card and the
  page have one string to reach for rather than two spellings of it. This is
  the last item in DEMO-2 that a person can see.
- **`lib/demo/bookings.ts` is a separate thing wearing the same word.** It
  assembles trip cards for the bookings hub from catalogue listings. It is not
  covered by any of the above, has nothing to do with `listings.is_demo`, and
  needs its own read.

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

### EM-1b. The palette, the measurements and the shell are one thing across the twenty builders and the five auth templates. **DONE. Was implicit in EM-1**

**What landed.** `apps/web/src/lib/email/theme.ts` is the single resolved
palette, and it is the one file in this repository where a literal hex is
correct rather than a violation: Gmail strips `:root` custom property
declarations, Outlook never supported them, and a `var()` that resolves to
nothing paints text the colour of its background. The file says so at length so
a future reader does not "fix" it back into a broken email. `render.ts` now
carries no colour of its own and `shell.test.ts` fails if one reappears, with
`#FFFFFF` the single sanctioned exception because it is the text on brand blue
in both schemes.

The shell is 600px and fluid below, which is what the Outlook desktop reading
pane fits without a horizontal scrollbar, verified at 360px with no horizontal
overflow on any of the twenty five. Type and spacing were opened up: 27px heading,
16px body at 1.65, 40px card padding, the footer moved outside the card so it
reads as small print by position as well as by size.

**One contrast defect found and fixed while doing it.** The brand blue measures
2.7:1 as text on the dark card, which fails even the relaxed large-text
threshold, so the wordmark and the fallback link now carry a class the dark
override swaps to `--nf-electric-300` at 5.5:1. The muted grey had been measured
on white and was being used on the canvas, where it was 4.37:1; it is now 4.7:1
on the surface it actually sits on.

### EM-1c. The five auth templates were a different product from every email after them. **DONE. Was unnamed and it was the biggest gap in this section**

**The problem.** `supabase/templates/` was dark first: a navy canvas with light
text baked into the inline styles. The transactional shell had already been
moved to light first, so a new user got a black rectangle on Monday and a white
card on Tuesday, and the black rectangle was the FIRST email RentMe ever sent
them.

Light is correct for email and it is not a taste question. Some clients strip
the `<style>` block, some apply their own inversion to a palette they did not
design, and Outlook renders through Word. A dark email that half renders is
black text on a black card, in exactly the message carrying somebody's sign-in
link. A light email that half renders is a light email.

**What landed.** `scripts/build-auth-emails.mjs` emits the same shell as
`render.ts`, value for value out of the same palette: same cap rule, same
lockup, same button, same code box, same footer.

**Three things the copy was saying that it should not.**

It advertised restaurants and experiences. Per S-3 the restaurant loop holds
zero rows, so that was inventory this platform does not have, which is the same
class of harm as naming a property that does not exist.

It claimed every listing carried a verified host and a real location before
publication, under a heading reading "How RentMe protects you". Verification
here is a ladder and most listers have not climbed it. The band is now headed
"Worth knowing before you start" and says only what can be checked, in the same
words the welcome uses.

The logo carried `alt="RentMe"` beside a live wordmark that also said RentMe, so
a reader with images blocked got the brand twice.

**Still open, and it is EM-3.** The regeneration reaches `supabase/templates/`
and stops there. Nothing pushes it to the dashboard.

### EM-1d. The email layer is tested as email rather than as source text. **DONE. Was a hole nobody had named**

**What was wrong.** `apps/web/tests/email-render.spec.mjs` read four source
files as text and matched regular expressions against them. It was failing 18 of
its 74 checks because the layer had been rewritten underneath it, it was wired
into no runner so nothing noticed, and it asserted the shell sets a dark colour
scheme, which is the thing that was deliberately reversed. It is retired.

**What replaced it.** `shell.test.ts` runs one set of rules over the
transactional messages and the five auth templates together, which is what makes
"one shell" checkable rather than merely claimed: table layout with no flex,
grid, float or positioning; nothing loaded from outside the document; inline
styles with exactly one `<style>` block; 600px and fluid; both colour schemes
declared; the light palette in the inline layer with the dark values confined to
the style block; no em dash, no emoji, no banned word, no legal or financial
promise, no sign-in method this platform does not have, and no inventory it
lacks.

Two checks are worth naming. Every email has exactly one image, with explicit
dimensions and an empty alt, and the test strips every `<img>` and asserts the
brand, the sign-off and 200 characters of real message survive, because an email
must make complete sense with images blocked. And the auth generator cannot
import `theme.ts`, being plain Node with no TypeScript loader, so the test
asserts every theme value appears in the generator and that the generator
declares no colour the theme has not sanctioned. The five templates are also
regenerated into a temporary directory and diffed against what is committed,
which catches the hand edit that the next generator run would erase with no diff
to explain it.

`fixtures.ts` is now the single catalogue matrix that both test files read, and
`shell.test.ts` fails when the catalogue exports a builder it has no entry for,
so a message added without a fixture cannot ship untested.

`client.test.ts` replaces the regex checks on the send guards with behaviour: no
key means no request attempted, an invalid address is refused before the
network, `sendMessage` carries the text part to the wire, every failure is a
typed value rather than an exception, `bestEffortEmail` swallows what its work
throws, and a rejection logs the status and Resend's machine code while logging
no address, no subject and no body.

**What still cannot be checked here, and it is worth being blunt.** No test
proves an email looks right in Outlook 2016 or arrives at all. There is no mail
client and no sending key in this environment. Markup, palette, copy rules and
generator freshness are provable; delivery and client rendering are not, and
EM-4 is the part of that an owner can act on.

### EM-1e. Eleven of the twenty builders in the catalogue have no send site. **NEW. OPEN. P1**

**Verified by grepping every import of `lib/email/messages`.** Five modules send:
`bookings/actions.ts`, `bookings/arrival.ts`, `wallet/actions.ts`,
`support/actions.ts`, `admin/bookings-actions.ts`, plus the Paystack webhook.
Between them they reach `bookingRequested`, `bookingRequestedHost`,
`bookingConfirmed`, `stayArrivalDetails`, `bookingCancelled`, `bookingRefunded`,
`walletFunded`, `withdrawalFailed` and `supportTicketFiled`.

Nothing sends `welcome`, `verificationCode`, `passwordReset`,
`withdrawalOutcome` in its paid or reversed form, `escrowFunded`,
`escrowReleased`, `inspectionScheduled`, `listingApproved`, `listingRejected`,
`verificationRungPassed` or `newEnquiry`.

They divide into three groups and the right answer differs for each.

`verificationCode` and `passwordReset` are duplicates of work Supabase already
does: a signup confirmation and a recovery link go out through
`supabase/templates/`, not through this catalogue. They are dead code unless
this product moves off GoTrue's mailer.

`escrowFunded`, `escrowReleased`, `listingApproved`, `listingRejected`,
`verificationRungPassed` and `inspectionScheduled` are written ahead of flows
that do not exist yet. Per E-1 and E-6 the escrow pair must not be wired until
legal review clears the wording, and neither should be treated as a licence to
ship the flow because the email is ready.

`welcome` and `newEnquiry` are the two with a live flow and no send. A person
signs up today and RentMe never says hello, which is the single cheapest gap in
this section. `newEnquiry` is the one a lister actually loses money to.

**Do.** Wire `welcome` behind the existing `signup_role` declaration and
`newEnquiry` behind the message insert, both through `bestEffortEmail` and both
respecting the `messages` and `marketing` channels in
`profiles.settings.notifications`. Leave the rest unwired and do not delete
them: the copy is reviewed and the flows are coming.

### EM-2. Nothing proves a transactional message was delivered. **OPEN. P1**

`lib/email/messages.ts` exports twenty builders, nine of which have a live send
site. Sends run from reserve, cancel, arrival, the admin booking
actions, wallet withdrawal, the Paystack webhook and support filing, all wrapped
in `bestEffortEmail` so a mail failure never rolls back a committed write. That
wrapper is correct and it means a delivery failure is invisible.

`client.test.ts` now proves the swallowing is deliberate and that nothing
private reaches the logs. It does not make the swallowed failure countable,
which is what this item is about.

**Do.** Folded into W-8: one shared `swallow()` helper that logs what it
swallows. `bestEffortEmail` is right to swallow and wrong to forget. Then a
weekly count of swallowed failures by message kind, which is the thing that
surfaces a silent regression.

### EM-3. The five auth templates must be pasted in by hand. **OPEN. P2**

`supabase/templates/` holds five branded templates generated by
`scripts/build-auth-emails.mjs`. They are applied through the dashboard.

**More urgent than it was.** Per EM-1c these five were just rewritten from dark
to light and had three false claims removed from their copy. Until somebody
pastes them into the dashboard, production is still sending the old dark
templates that advertise restaurants and promise every listing carries a
verified host. The repository being right is not the same as the product being
right, and this is now the gap between them.

**Do.** Script the Management API path so the repository is the source of truth
and the dashboard is a deploy target. Today a regeneration silently does not
reach production, which is the same class of drift as section 22.

**Owner action in the meantime.** Paste all five from `supabase/templates/` into
Authentication -> Email Templates. `shell.test.ts` proves the files match their
generator; nothing can prove the dashboard matches the files.

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

**Re-run again after the example-listing work, and it grew a new category that
is now fixed.** Building the demo enforcement added six trigger functions to
`public`, and Postgres grants EXECUTE to PUBLIC by default when a function is
created, so `anon` and `authenticated` inherited it. PostgREST publishes anything
in `public` the caller may execute, so five guard rails enforcing that an example
listing cannot wear a badge or be transacted against were sitting on the REST
surface, callable by a signed-out stranger.

**Not a vulnerability, and it was not written up as one.** Postgres refuses to
run a trigger function called directly. It is the API surface telling the truth
about itself: every name on it is a name an attacker enumerates and a reviewer
has to account for.

Revoked in `20260809082855_a_trigger_function_is_not_an_api_endpoint`, **as a
loop over the catalogue rather than six named revokes**, so a trigger function
added next month is covered instead of quietly reopening this.

**The claim worth checking before running anything like it:** Postgres checks
EXECUTE on a trigger function when the trigger is CREATED, not each time it
fires. Verified rather than trusted, by attempting a badge insert for the example
lister afterwards and watching it still raise `check_violation`, inside a block
that rolled back. All 21 triggers remain attached and enabled and no trigger
function is executable by `anon` or `authenticated`.

**Three findings that look alarming in the advisor output and are correct.**
`escrow_admin_resolve`, `set_fee_rate` and `review_kyc_document` are callable by
any signed-in user, and each checks `private.has_role(actor, 'admin')` or
`'super_admin'` first and returns `{"status": "forbidden"}`. That is the right
shape for an RPC: the authorisation lives inside the function. Do not "fix" these
by revoking EXECUTE; read them first.

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

**Do.** Not a vendor. Web Vitals reported to an internal route, which keeps the
privacy posture intact, keeps the consent question closed, and answers the only
question that matters: what the product costs on a real phone on a real network.

**CORRECTION, 2026-08-09.** This entry used to say the measurements should be
stored in `public.events`, "which already exists". **It exists and it is not
that table.** Checked live: `public.events` carries `area_id`, `host_id`,
`post_id`, `title`, `blurb`, `starts_at`, `ends_at`, `venue_label`,
`venue_kind`, `capacity`, `attending_count` and an `event_status`. It is the
SOCIAL events table, a thing people attend in a place, and its four indexes are
all built for that. Writing Web Vitals into it would put telemetry rows into the
feed's own table and behind its RLS.

So a table is still needed, and BE-14 asks for the server-side half of the same
question. **The cheapest honest first step needs no table at all**: one log line
per report with a stable grep prefix, exactly as `/api/csp-report` already does
with `[csp]`. That answers the question from the deployment log and defers the
schema decision until somebody knows what they want to query.

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

## 21. Testing and enforcement

### T-1. 83 browser specs, 8 vitest files, and no CI runs any of them. **OPEN. P0**

**Re-verified today: there is still no `.github/workflows` directory.** Vercel
deploys from `main`. Nothing mechanical stands between a red spec and production.

This is the single highest-leverage open item in this document, because at least
nine other entries here are "add a check that fails the build" and none of them
means anything until something runs checks.

**Do.** One workflow: `npm run typecheck`, `npx eslint .` from `apps/web`,
`npx vitest run` from `apps/web`, `npm run build`, then serve the build and run
the directory of node specs. Add as steps: the em dash scan with `docs/archive/`
excluded, the AI attribution scan, the migration mirror diff (T-10), the
`PLACEHOLDER` scan for MOB-3, and the `NaijaFinds` scan for RN-2.

### T-2. The node specs are run by hand and the invocation is a known trap. **OPEN. P1**

Two traps, both of which have cost full sweeps.
- **Vitest must be run from `apps/web`.** From the repo root it resolves a
  different config, fails to resolve `server-only`, and reports a wall of
  unrelated failures.
- **`next start` on a held port does not fail loudly.** The old server keeps
  serving and the new process exits, so the sweep silently measures the
  **previous** build. It presents as dozens of unrelated specs failing at once.
  Before trusting a sweep, confirm exactly one `next-server` process and that
  `.next-*/BUILD_ID` matches the build just made. Killing `next-server` alone is
  not enough because `npm exec` respawns it: kill the `npm exec`, the `sh -c` and
  the `next-server` together. `pkill -f "next start"` matches nothing; the
  process is `next-server`.

**Do.** Wrap both in a script that asserts the port is free and the BUILD_ID
matches. The trap is not knowledge, it is a missing script.

### T-3. `pg_cron` is installed and running six jobs. **DONE as a correction**

**Verified live.** `pg_cron` 1.6.4 installed, six active jobs:

| Job | Schedule (UTC) | Runs |
|---|---|---|
| `rentme-nightly-badges` | `20 2 * * *` | `private.sweep_badges()` |
| `rentme_release_stale_holds` | `*/15 * * * *` | `private.release_stale_booking_holds()` |
| `rentme_purge_rate_limits` | `30 * * * *` | `private.purge_rate_limits()` |
| `rentme_purge_idempotency` | `10 2 * * *` | `private.purge_idempotency_records()` |
| `rentme_announce_completed_stays` | `20 5 * * *` | `private.announce_completed_stays()` |
| `rentme-daily-note` | `0 6 * * *` | `private.post_daily_note()` |

Everything gated on "waiting for a scheduler" is unblocked: W-6's reconciliation,
E-3's escrow timeout sweep, KYC-5's expiry sweep, MED-3's orphan sweep and the
notification retention job. **All times are UTC**; the server runs UTC and Lagos
is UTC+1, so a job written for a Lagos hour must be shifted.

**Still to do.** Six unattended jobs writing to a live database with no alert on
failure is a silent dependency, and it is the same shape as CASE-1.
`cron.job_run_details` carries the outcome; a nightly check of it into
`risk_alerts` is ten lines.

### T-4. Four specs fail and none is caused by application code. **OPEN. P2. Re-verify**

Measured before the current wave. Each was checked rather than assumed at the
time; re-verify before acting, because five commits have landed since.

| Spec | State when last measured |
|---|---|
| `gate` | **Aborts by design** and says so: without the Supabase URL and anon key the guard is a pass-through, so it refuses to pretend it proved anything |
| `intent-tune` | Byte for byte identical to `origin/main`. Red on main |
| `interests-settings` | `welcome/page.tsx` carries no `InterestChoices` mount on this branch or on main. Red on main |
| `session-memory` | `ListingsWorkspace.tsx` byte for byte identical to main. Red on main |
| `truncation` | Passes alone. Chromium runs out of room after seventy consecutive launches in this sandbox. Run in batches |

### T-5. Four specs skip loudly when the catalogue is empty. Do not make them pass. **OPEN. P1**

**If you make them pass by putting invented listings back, you have undone the
point.** The seed catalogue of twenty-three places was deleted because twenty-two
carried `verified: true` with fabricated ratings on addresses that do not exist.
A spec that skips out loud with an empty catalogue is the correct behaviour and
must survive every future sweep. See section 11 for the legitimate route.

### T-6. Em dashes are confined to the archive. **DONE. P1**

**Re-verified today:** zero em dashes in any markdown file outside
`docs/archive/`. The remaining ones are ten historical audit records where a
mechanical replacement would produce ungrammatical prose in documents nobody will
reread.

**Do.** Add the scan to CI with `docs/archive/` excluded, and note that three
test specs legitimately **contain** the character because they are the guards
that search for it. A sweep must not "fix" those.

### T-7. Verification ritual, as it actually is. **P0 to follow**

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

### T-8. Specs this document now asks for, collected. **NEW. P1**

Gathered so they can be built as one piece of work rather than nine times.

| Spec | Guards | Entry |
|---|---|---|
| Route access matrix: every route, signed out and signed in | The middleware and the client gate agreeing | N-1 |
| No `getAdminClient()` null branch without an adjacent `logMoney` | The incident's habit | CASE-1 |
| Fee arithmetic with non-zero fixture rates | A zero-rate engine passing trivially | FEE-5 |
| No verified mark where `verified_by` is null | The defect that already shipped | V-6, DEMO-2 |
| No `is_demonstration` row in a sitemap, JSON-LD or email | Fabricated listings being indexed | DEMO-2 |
| No `PLACEHOLDER` in `public/.well-known/*` | Shipping unverifiable deep links | MOB-3 |
| No `NaijaFinds` in any rendered page or locale file | The rename staying done | RN-2 |
| Banned synonyms: host, landlord, compound, hub, gist, ban | The lexicon drifting back | S-4 |
| Migration filenames match `schema_migrations` | Section 22 | T-10 |
| Contrast at 390px, both themes, real composited background | Light mode rotting | D-3 |
| CSP header and nonce on a dynamic route with a `.png` suffix | The matcher hole staying closed | SEC-4 |

### T-9. Two places draw the signed-out line and nothing checks they agree. **NEW. OPEN. P1**

`middleware.ts` decides whole routes. `components/auth/AuthGate.tsx` decides
individual controls on a page a stranger may read. The middleware file says so
itself: "That line is drawn in two places and they have to agree."

**Do.** A spec that walks every route signed out and asserts, for each: it either
redirects to sign in, or it renders and every action control on it raises the
auth sheet rather than attempting the action. This is the guard for the largest
behavioural change made this week and there is currently nothing holding it.

---

## 22. The migration mirror

### T-10. The mirror drifted twice, and is now repaired. Add the check. **NEW. FIXED during this pass. P1 residual**

**Status.** This entry was written as an open P0. It was fixed by a parallel work
stream within the hour, while this document was being written. **Re-verified
live: 131 local migration files, 131 rows in `supabase_migrations.schema_migrations`,
and every version string pairs exactly**, including the ordering inversion. The
record below is kept because the mechanism is a habit, the habit has now produced
this fault twice under two different people, and nothing yet stops it happening a
third time.

**What was fixed first, and it genuinely was.** Commit `5e5aa79` renamed eight
local migration files to the versions that actually ran, which also resolved two
ordering inversions.

**What that same commit broke.** The **ten property migrations applied in it did
not pair at all.** Both sides held 130 rows and the last ten were entirely
disjoint:

| Local filename version | Applied version | Name (identical on both sides) |
|---|---|---|
| `20260809090000` | `20260809044320` | `nothing_here_came_from_somewhere_else` |
| `20260809090500` | `20260809044346` | `the_advisor_findings_that_are_real` |
| `20260809091000` | `20260809044358` | `the_impersonation_helper_goes_before_real_people_arrive` |
| `20260809100000` | `20260809044441` | `a_listing_says_whether_it_is_to_let_or_for_sale` |
| `20260809100500` | `20260809044514` | `what_it_actually_costs_to_move_in` |
| `20260809101000` | `20260809044600` | `a_sale_has_a_price_and_a_title` |
| `20260809101500` | `20260809044629` | `the_facts_a_nigerian_listing_states` |
| `20260809102000` | `20260809044725` | `a_column_called_price_per_night_that_held_annual_rent` |
| **`20260809103000`** | **`20260809044814`** | `the_map_stops_being_impossible` |
| **`20260809104000`** | **`20260809044737`** | `a_person_says_what_they_came_here_to_do` |

**The mechanism.** The migrations were authored as files with hand-picked
timestamps and then applied through the management API, which stamps its own
version at the moment of application. Every name matches; not one version does.
This is the identical failure mode the commit set out to fix, reintroduced by the
tool used to fix it.

**Two concrete consequences, and the second is the serious one.**

1. **`supabase db push` will consider all ten pending** and attempt to re-apply
   them against a database where the DDL already exists. Some will fail on
   `create type` and `add column`; the ones written with `if not exists` will
   succeed and record a second history row, leaving 140 rows for 130 migrations.
2. **The last two are in the wrong order relative to what actually ran.** Locally
   `the_map_stops_being_impossible` (103000) sorts **before**
   `a_person_says_what_they_came_here_to_do` (104000). In production
   `a_person_says_what_they_came_here_to_do` ran at 044737, **before**
   `the_map_stops_being_impossible` at 044814. So `supabase db reset` builds a
   database in a different order from production. Whether that matters depends on
   whether the map migration's trigger or index depends on anything the intent
   migration created. **Read both files before renaming, and rename them into the
   order that actually ran, not the order the filenames imply.** A new ordering
   inversion was created by the commit that fixed two.

**Done, by a parallel stream.** All ten files were renamed to their applied
version strings with no content change, and the two inverted ones now sort in the
order that actually ran: `044737_a_person_says_what_they_came_here_to_do` before
`044814_the_map_stops_being_impossible`.

**Still to do, and this is the whole point of the entry.**

1. **Add the CI check.** Diff `ls supabase/migrations/*.sql` prefixes against
   `supabase_migrations.schema_migrations.version` and fail the build on any
   difference in either direction. Five minutes of work buys a mechanical
   guarantee that the repository never lies about the database. Without it, the
   third occurrence is a matter of time, because the two people who caused the
   first two were each being careful.
2. **Change the habit, because the tooling causes this.** Applying a migration
   through the management API stamps its own version at the moment of
   application, which will never match a hand-picked filename. Either author the
   file first and apply it by filename, or apply through the API and immediately
   rename the local file to the version the API returned. Write whichever is
   chosen into `docs/HANDOFF.md`, because it is a procedure and not a
   preference.
3. **Note the ordering trap specifically.** Renaming to the applied version can
   silently reorder files relative to each other, which is what happened here.
   After any such rename, read the affected migrations for dependencies before
   assuming a `db reset` still builds the same schema.

---

## 23. Look, inspiration, vibe and style

This section is about how the product should *feel*, and it is written the way
the rest of this file is written: against what is in the tree today, with the
measurement beside the opinion. "Premium", "clean" and "modern" are not
recommendations. They are what somebody says when they have not decided
anything. Everything below decides something.

**The reference the product is chasing, stated once so it stops being implied.**
RentMe is a money surface wearing the clothes of a browsing product. A person
arrives to look at flats and leaves having moved six months of rent through an
escrow they had never heard of that morning. Both halves have to be true at
once: the browse has to feel like an evening on a sofa, and the money has to
feel like a bank. Almost every specific decision below falls out of that one
tension, and where the two disagree, **the money wins**. A playful animation on
a balance is a bug. A stern, grey listing card is also a bug.

**What is already good, so it does not get rebuilt.** The token layer is real:
seven radii, five durations, four easings, a full colour system with a light
theme, and since the last pass a type scale with named classes for every tier
(`nf-display`, `nf-h1` through `nf-h4`, `nf-lede`, `nf-body`, `nf-body-sm`,
`nf-caption`, `nf-overline`). `globals.css` is 71 lines importing 19 ordered
partials totalling 5,529. `nf-rows`, `nf-rows--inset`, `nf-group` and
`nf-group-label` exist and give grouped surfaces one vocabulary. None of that is
in question. The gaps below are the things around it.

### VIBE-1. There is no spacing scale. Thirty-three step values are doing the work of six. **NEW. OPEN. P1**

**Measured today.** `packages/design-tokens/src/tokens.css` defines radius
tokens, duration tokens, easing tokens, type tokens, colour tokens, gradient
tokens and shadow tokens. It defines **no spacing token**. Grep for `--nf-space`
and the file has none.

That is not a small omission, because spacing is the single most-used decision
in the product. Counting padding, margin, gap and space utilities across the
`.tsx` files gives **33 distinct step values**, and their distribution shows
what actually happened:

| Step | Uses | Step | Uses |
|---|---|---|---|
| 4 | 797 | 8 | 139 |
| 3 | 732 | 0.5 | 135 |
| 2 | 594 | 3.5 | 113 |
| 5 | 429 | 10 | 75 |
| 1.5 | 280 | 12 | 53 |
| 1 | 278 | 7 | 51 |
| 6 | 227 | 14 | 39 |
| 2.5 | 192 | 16 | 25 |

plus 9, 11, 20, 24, 28, 4.5, and **eight arbitrary bracket escapes**:
`[0.4rem]`, `[3px]`, `[2px]`, `[2.5px]`, `[4.5rem]`, `[2.375rem]`, `[1.9rem]`.

Read the table rather than the total. The top six steps carry 3,059 of the uses.
Everything below `6` is a long tail of one-off adjustments, and 1.5, 2.5 and 3.5
between them account for 585 decisions that were each made by eye, in isolation,
by whoever was in the file. That is the mechanism by which a product stops
feeling designed: not one bad choice, but six hundred small ones that nobody
could compare because they were never named.

**Do.**
1. **Name six steps and no more**, in `tokens.css`, as a rhythm rather than a
   ladder: `--nf-space-hair: 4px`, `--nf-space-tight: 8px`,
   `--nf-space-snug: 12px`, `--nf-space-base: 16px`, `--nf-space-loose: 24px`,
   `--nf-space-section: 40px`. Those are the six the product already uses most;
   this is a naming exercise, not a redesign.
2. **Bind them into Tailwind** through the `@theme` block so `p-base` and
   `gap-snug` exist as classes. A token nobody can type at a call site is a
   token nobody uses, which is exactly how the type scale sat unused before the
   body tiers landed.
3. **The half steps are the bug, not the feature.** 1.5, 2.5 and 3.5 exist
   because 4 felt too big and 4 was the only nearby name. With `hair` and
   `tight` both nameable, most of them collapse. Do the collapse in one pass per
   surface, not globally: a find-and-replace across 585 sites will move
   something that was deliberately nudged.
4. **The eight bracket escapes are each a decision that lost an argument with
   the scale.** Three of them are sub-pixel border compensation (`[2px]`,
   `[2.5px]`, `[3px]`) and belong in a border token, not a spacing one.

**Owner note.** This is the highest-leverage design entry in the file. Colour is
enforced, type is enforced, geometry has radii. Spacing is the last unowned axis
and it is the one a person actually perceives as "this app is put together" or
"this app is not".

### VIBE-2. When a container earns its existence. **NEW. OPEN. P1**

The platform has a rich set of surfaces: `nf-card`, the glass family in
`glass.css` (608 lines), `nf-rows`, `nf-rows--inset`, `nf-group`. Rich enough
that the real risk is no longer "there is nothing to reach for", it is nesting:
a card inside a glass panel inside a group inside a section, each contributing a
border and a radius, so the screen reads as a stack of trays rather than as
content.

**The rule, and it should go in the design documentation as a rule.** A
container earns a border, a background or a radius only when it answers **yes**
to one of these:

1. **It is a different kind of thing from what surrounds it.** A price panel
   inside a description is a different kind of thing. A second paragraph is not.
2. **It is independently actionable.** Tapping it does something the page around
   it does not do.
3. **It is scrollable or overflowing** and the edge tells you so.
4. **It is a promise about money or safety.** Escrow state, a fee breakdown, a
   verification badge. These get a surface even when the content is one line,
   because the surface *is* part of the claim.

If none of those are true, the answer is **space**, not a box. This is why VIBE-1
comes first: without a spacing scale, a designer reaching for separation has
only boxes to reach for.

**And the corollary, which is the part that gets violated.** **Two containers
may not share an edge.** If a card's border and a group's border are within
2px of each other, one of them is decoration. Delete it. `nf-rows--inset` was
built for exactly this case, where the outer card owns the edge and the rows
inside are separated by hairlines that stop short of it.

### VIBE-3. Surface hierarchy: four levels, and the product should never use a fifth. **NEW. OPEN. P1**

Elevation on this platform is currently expressed through several overlapping
mechanisms: `--nf-surface-*` colour tokens, the shadow tokens, the glass blur
family, and `nf-card`. That is four ways to say "this is above that", which
means a reader of any given screen cannot tell what level anything is on.

**Do. Declare four levels, name them, and make each one exactly one mechanism.**

| Level | What lives there | Mechanism |
|---|---|---|
| **0. Canvas** | The page itself, the ambient artwork | `--nf-surface-canvas`. No border, no shadow, ever |
| **1. Content** | Cards, rows, groups, panels. The great majority of the product | A raised surface token plus a 1px hairline. **No shadow** |
| **2. Floating** | Sheets, drawers, popovers, the map dock, toasts | The ambient two-layer shadow plus glass. Never used inline |
| **3. Modal** | Dialogs that block, and only those | Level 2 plus a scrim |

The load-bearing line is **level 1 has no shadow**. A shadow means "this is
detached from the page and will move". A card in a list is not detached and
will not move, and giving it a shadow spends the one signal that tells a person
a sheet is about to be dismissible. Right now the platform's most common surface
and its most transient surface are both drawn with depth, so depth means nothing.

### VIBE-4. How a screen should open. **NEW. OPEN. P1**

There are **68 `loading.tsx` files** in `src/app` and **43 files** importing a
skeleton component, which means the boundary work is genuinely done. What is not
decided is what a person sees in the beat between tap and content, and it should
be the same everywhere:

**The four-beat open, in order.**

1. **Frame first, instantly.** Header, back affordance, title and chrome render
   from the route itself with no await. A person must know *where they are*
   before they know *what is there*. This is already how the admin console
   behaves and it is the model.
2. **Shape second.** The skeleton, and the skeleton must be the real geometry.
   `SkeletonCard` in `components/ui/Skeleton.tsx` already does this correctly
   and says why in its own comment: the 4:3 media, the `p-4` body, the 15px
   title line. An approximate skeleton is worse than no skeleton, because the
   layout shift lands at the exact moment the reader has started reading.
3. **Content third**, replacing shape in place, with no fade. See MOT-4: a
   skeleton that cross-fades into content draws attention to the swap.
4. **Ambience last, or never.** Artwork, blooms, grain and the Ken Burns pan
   come after content, and under Save-Data they never come at all. PERF-1 proved
   this is worth 3.5MB on `/home`.

**Never open a screen with a spinner.** A spinner says "something is happening
and I cannot tell you what". A skeleton says "a list of six cards is arriving".
The second is the truth and it is also faster to perceive.

**And the one exception worth naming:** a screen whose *whole purpose* is one
number, such as a wallet balance, should not skeleton the number. Show the last
known figure with the state marked as settling, or show nothing. A grey bar
where a balance goes reads as a zero balance for the half second it is up, and
that is the exact failure CASE-1 is about.

### VIBE-5. The empty state is the product right now, and it is being designed as an accident. **NEW. OPEN. P0**

**The platform has zero listings.** Every discovery surface therefore renders its
empty state, which means for every visitor today, the empty state **is** the
product. It should be the most carefully designed screen in the codebase and it
is not designed at all in most places.

**Three kinds of empty, and they must not look alike.**

| Kind | Truth | What the screen must do |
|---|---|---|
| **Nothing yet** | The catalogue is empty because the platform is new | Say so plainly, offer the one action that helps (list a property), and show the places that DO have life: `areas` has 7 rows, `posts` has 19 |
| **Nothing here** | The filter is too narrow | Name the narrowing predicate and offer to widen it. "No two-bedroom flats under N800,000 in Lekki" plus a control that drops the price bound |
| **Nothing found** | A free-text query matched nothing | Show what was searched, and offer the nearest thing, not a blank |

Today a reader cannot distinguish "the platform is empty" from "your filter is
wrong", and those call for opposite actions. DEMO-3 covers the honest ways to
make an empty platform feel alive; this entry is the narrower design point that
**an empty state is a layout with a hierarchy, not a centred sentence**.

### VIBE-6. `--nf-text-hero` is declared and used nowhere. **NEW. OPEN. P2**

`tokens.css:605` declares `--nf-text-hero: clamp(1.7rem, 1.05rem + 2.9vw, 3.5rem)`
and no file in `apps/web/src` or `packages/` references it. Eleven type tokens,
ten in use, one orphan sitting between `display` and `h1`.

Either it is the landing headline size and wants an `.nf-hero` class beside
`.nf-display`, or `--nf-text-display` already covers that role and this is dead.
Decide and act; a scale with a token nobody can name is exactly the condition
that produced the 47-arbitrary-sizes measurement in the last pass.

### VIBE-7. Density is a per-surface decision and the product has not made it. **NEW. OPEN. P2**

Three densities are needed and only one exists:

- **Browse density.** Listing cards, the feed, the map list. Generous. A photo
  is the content and it wants air. Row height driven by media.
- **Work density.** Agent listings, admin queues, bookings. Compact. The content
  is rows of facts and a person is scanning, not admiring. Half the vertical
  padding of browse, and a hairline between rows rather than a gap.
- **Money density.** Wallet, checkout, escrow, fee breakdown. Widest of the
  three, and the only one that gets extra leading. A person reading an amount
  reads it twice, and crowding is what makes a figure feel slippery.

Today all three are drawn at roughly browse density, which makes the admin
console feel slow to scan and makes the wallet feel casual. `nf-rows` and
`nf-rows--inset` are the right mechanism; they need a density modifier rather
than a second component.

### VIBE-8. Photography is the product and there is none. **NEW. OPEN. P1**

A property marketplace is a photography product. Everything else on the screen
is chrome around a picture of a room. With zero listings there are zero real
photographs, so every card renders `hueFor()`'s deterministic gradient tile.

**The consequence nobody has priced.** The gradient fallback is currently the
platform's dominant visual, and it was designed as an edge case. It should be
designed as a first-class surface: a fallback tile that carries the property
type as a symbol and the locality as text reads as "a listing with no photograph
yet". A bare gradient reads as a broken image.

**Do.** Give the fallback tile a symbol from the icon system and the area name,
and hold the 4:3 box exactly. And write the photography standard now, before
supply arrives: minimum resolution, aspect, the first photo being the exterior
or the main room, and no watermark. MED-1 covers the size ceiling; this is the
quality floor, and it is much easier to enforce from the first listing than from
the thousandth.

### VIBE-9. Nigerian, without costume. **NEW. OPEN. P2**

The product is Nigerian and its visual identity should be, and the failure mode
is obvious enough to name: green-white-green, adire prints, and a headline in a
display face doing an impression of a market sign. That is costume, it patronises
the user, and every serious Nigerian product avoids it.

**The identity lives in the specifics, not the decoration.** It is already
half-built and should be leaned into:

- **Money.** The naira sign at the front of a big integer with proper grouping,
  and the platform's insistence on integer kobo end to end. Nothing says "this
  was built here" like a price that is formatted the way a Nigerian reads it.
- **Place.** State and LGA, which the database carries as 37 and 774 real rows,
  and which `readPlaceNames` already resolves to names a person recognises.
- **The facts that matter here and nowhere else.** Power band, generator hours,
  water supply, prepaid meter, estate access. These are already columns on
  `listings` with partial indexes behind them. They are the most Nigerian thing
  in the product and they belong on the card, not buried in a detail accordion.
- **The clock.** `lagosHour()` decides the greeting in Africa/Lagos rather than
  in UTC. Small, invisible, and exactly right.

**Do.** Put power and water on the listing card. That single change says more
about who this product is for than any amount of pattern work.

### VIBE-10. The signed-out face and the signed-in face are different products and should look it. **NEW. OPEN. P2**

Signed-out visitors can browse now (N-1), which means the platform has a public
face for the first time. A public face is a marketing surface: it may be
atmospheric, it may use the display type, it may carry artwork.

The signed-in app is a tool. It should be quieter, denser and faster, and the
transition between them at sign-in should be legible: the person should feel
they have walked through a door, not that the same page reloaded with a
different menu.

Today the two share almost everything. The recent work giving the signed-in
screens one vocabulary is the right half of this; the missing half is letting
the public face keep the drama the app gives up.

### VIBE-11. One motion vocabulary per meaning, and the product already violates it in three places. **NEW. OPEN. P2**

Covered in full in section 24, listed here because it is a look-and-feel
symptom before it is a motion bug: `nf-confirm-pop`, `nf-confirm-dim`,
`nf-confirm-sweep`, `nf-status-assemble` and `nf-map-pin-bloom` are five
different ways of saying "something just landed". A person cannot learn five.
See MOT-6.

### VIBE-12. Write the vibe down where an agent will read it. **NEW. OPEN. P1**

`docs/SOCIAL_DESIGN.md` is 852 lines and covers the social layer only.
`docs/ICON_SYSTEM.md` is 110 lines. There is no document that says how the
*product* should feel, so every agent that touches a screen re-derives it from
the screens next door, and drift is the guaranteed result.

**Do.** One document, `docs/LOOK.md`, carrying: the four surface levels
(VIBE-3), the container rule (VIBE-2), the six spacing steps (VIBE-1), the three
densities (VIBE-7), the four-beat open (VIBE-4), and the motion language
(section 24). Not a style guide with swatches. A set of decisions with reasons,
in the voice of this file, so that the next agent inherits the argument rather
than the output.

---

## 24. Motion

There is a great deal of motion in this codebase already: **59 distinct
`@keyframes`** and **95 `animation:` declarations** across the CSS partials,
with `motion.css` at 637 lines and `animation.css` at 277. There are also
**reduced-motion blocks in 16 files** and a global token collapse. What there is
not is a *language*: a small set of movements, each with one meaning, that a
person learns once in the first minute and then reads for free everywhere else.

The difference matters. A product with fifty animations and no language feels
busy. A product with six movements and a language feels alive. The entries below
turn the first into the second without deleting the good work.

**The tokens, since every timing below refers to them.**

| Token | Value | What it is for |
|---|---|---|
| `--nf-duration-instant` | 90ms | Press feedback. Nothing else |
| `--nf-duration-fast` | 160ms | Hover, focus, small state flips |
| `--nf-duration-base` | 240ms | The default. Entrances, exits, most transitions |
| `--nf-duration-slow` | 380ms | Sheets, drawers, anything crossing a screen |
| `--nf-duration-deliberate` | 620ms | Confirmations. Motion the user is meant to notice |

| Easing | Curve | What it is for |
|---|---|---|
| `--nf-ease-standard` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Anything already on screen changing |
| `--nf-ease-entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` | Things arriving. Fast out of the gate, long settle |
| `--nf-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving. Accelerate away, never settle |
| `--nf-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot. Reserved. See MOT-7 |

### MOT-1. The motion language: six movements, and the product should not have a seventh. **NEW. OPEN. P1**

Every animation in the product should be one of these six, and a reader should
be able to name which one they just saw.

| # | Movement | Means | Timing |
|---|---|---|---|
| 1 | **Rise** | This is new content arriving in place | `base`, `entrance`, from `translateY(8px)` and `opacity: 0` |
| 2 | **Enter** | This is a surface coming in from an edge | `slow`, `entrance`, from the edge it will return to |
| 3 | **Leave** | This is going away and will not be back | `fast`, `exit`, to `opacity: 0` and 2px of travel. **Always faster than its entrance** |
| 4 | **Press** | I registered your touch | `instant`, `standard`, `scale(0.97)` |
| 5 | **Settle** | A value changed and here is the new one | `fast`, `standard`, cross-fade in place, no travel |
| 6 | **Confirm** | Something irreversible succeeded | `deliberate`, `entrance`, once, with a colour shift. See MOT-6 |

**The asymmetry in 2 and 3 is the load-bearing part and it is the thing most
products get wrong.** An exit that takes as long as its entrance feels like the
interface is arguing with you. Leaving should always be quicker than arriving:
the user has already decided, and the animation is now in their way. As a rule,
**exit at half the entrance duration and one easing tier faster**.

**Do.** Audit the 95 `animation:` declarations against this table. Most will map
cleanly. The ones that do not are either ambience (MOT-3, exempt) or the
duplicated confirmations in MOT-6.

### MOT-2. What must never move. **NEW. OPEN. P0**

This is the shortest entry in the section and the most important, because
everything above is taste and this is not.

**Nothing that states an amount of money may animate its value.** Not the wallet
balance, not an escrow figure, not a fee breakdown, not a move-in total, not a
checkout amount. A number that counts up is a number the user cannot read, and a
number the user cannot read on a money screen is the same category of failure as
CASE-1: the interface knows something the person does not.

`motion.css` currently carries `nf-balance-pulse-up` and `nf-balance-pulse-down`
at 1.1s, and an odometer. **A pulse on the container is acceptable; a roll on the
digits is not.** The distinction: the surface may acknowledge that a figure
changed, the figure itself must be legible from the first frame to the last.

**Also never:**

- **A destructive confirmation must not animate in.** A dialog asking whether to
  delete an account or release escrow appears at full opacity, immediately. A
  fade-in on a destructive dialog is how a person taps through it while it is
  still 40% transparent.
- **An error message must not slide.** It appears where it will stay. Motion on
  an error moves the thing the person is trying to read.
- **Nothing may move under a finger already on the screen.** Any entrance that
  reflows a list a user is mid-scroll in is a bug regardless of how good it
  looks.
- **A skeleton must not animate out.** See MOT-4.

### MOT-3. Ambience is a separate budget and it has different rules. **NEW. OPEN. P2**

The long loops are correctly built and should not be confused with interface
motion: `nf-float` at 7s, `nf-float-slow` at 11s, and the landing ambience out to
20s and 21s. These are atmosphere. They may be slow, they may loop forever, they
may ignore the duration tokens entirely, because a 240ms token has nothing to say
about a 20-second drift.

**The three rules ambience must follow.**

1. **It never runs above content a person is reading.** Behind, beside, never
   over.
2. **It stops entirely under Save-Data and under reduced motion.** PERF-1 already
   proves the Save-Data half: the artwork is never requested rather than hidden.
3. **It never runs on a money screen.** The wallet does not get an aurora.

### MOT-4. Skeleton to content is a replacement, not a transition. **NEW. OPEN. P1**

When real content arrives, the skeleton is **removed** and the content is
**there**. No cross-fade, no scale, no stagger.

The reasoning is the same as VIBE-4's: the skeleton has already told the person
the shape of what is coming, so the arrival is not news. Animating it makes the
swap the event, and the swap is the least interesting thing that just happened.
A 200ms cross-fade also means 200ms during which the text is at partial opacity
and unreadable, which is a real cost paid for a decoration.

**The exception, and it is narrow:** the *first* screen of a session, where the
skeleton is also the person's first sight of the app, may Rise. Every subsequent
one replaces.

### MOT-5. Optimistic updates need a visual grammar and have none. **NEW. OPEN. P1**

The platform does optimistic work in several places (saves, likes, follows,
message sends) and there is no shared way to show the three states an optimistic
action passes through. Without one, every surface invents its own, and the
failure case is the one that gets skipped.

**The grammar, three states, one vocabulary.**

| State | What the user sees | Motion |
|---|---|---|
| **Pending** | The new value, at full opacity, with the control non-interactive | Press (`instant`). Nothing else. **No spinner** |
| **Confirmed** | Nothing changes | **Nothing.** The optimistic value was right, so there is no event |
| **Rejected** | The old value returns, with a message saying why | Settle (`fast`) back, then the message appears without motion |

**"Confirmed means nothing happens" is the whole point.** If success produces a
flash or a tick, the interface has told the user their action was in doubt, and
the next time they tap they will wait for the tick. The optimistic update's
entire value is that the person moves on; a success animation takes it back.

**And the rejection must be honest.** A save that silently reverts is worse than
a save that never appeared to work. Reverting without a message is the pattern
that produced CASE-1's shape: the interface showing a state the backend did not
agree with, and never saying so.

### MOT-6. Five confirmations, one meaning. **NEW. OPEN. P2**

Verified in the partials today:

| Class | File | Timing |
|---|---|---|
| `nf-confirm-pop` | `motion.css` | `--nf-duration-deliberate`, entrance |
| `nf-confirm-dim` | `glass.css:561` | literal `900ms`, standard |
| `nf-confirm-sweep` | `glass.css:587` | literal `650ms` with a `260ms` delay |
| `nf-status-assemble` | `motion.css:181` | literal `600ms`, spring |
| `nf-map-pin-bloom` | `map.css:111` | literal `1.5s` with a `500ms` delay |

Five movements for one meaning, at five durations, three of which are within
100ms of `--nf-duration-deliberate` and none of which use it.

`nf-confirm-pop` is the right one and `motion.css` says so in its own comment
where the verified header reuses it "rather than inventing a second 'something
just landed' motion". The comment is correct and the codebase did it anyway,
four more times.

**Do.** Keep `nf-confirm-pop`. Keep the map bloom, which is a genuinely different
event (a pin landing on a map is not a state change on a row). Fold the other
three into `nf-confirm-pop` with a colour modifier, and put the timings on
tokens.

### MOT-7. Spring is a special effect and it is being used as a default. **NEW. OPEN. P2**

`--nf-ease-spring` is `cubic-bezier(0.34, 1.56, 0.64, 1)`, which overshoots by
56%. That is a large overshoot and it is exactly right for the two places it
earns: a message bubble arriving (`nf-msg-in-right`, `nf-msg-in-left`) and a map
pin dropping.

It is currently also on `nf-status-assemble`. A status assembling is not a
physical object with momentum, and giving it one makes a state change feel like
a toy.

**The rule.** Spring is for things that behave like objects: something that
arrives from off-screen, drops, or is thrown. Everything that is a *change in
value* uses `standard`. Under reduced motion `--nf-ease-spring` already collapses
to `linear`, which is correct and is the tell: if an animation is meaningless
without its overshoot, it should not have had one.

### MOT-8. Ten literal durations escape the reduced-motion safety net. **NEW. OPEN. P1**

`tokens.css:942` collapses all five duration tokens to `1ms` under
`prefers-reduced-motion: reduce`, with a comment explaining the design: durations
collapse rather than animations being deleted, so components keep one code path.
That is a genuinely good mechanism and it is the platform's primary reduced-motion
guarantee.

**Every literal duration in the partials bypasses it.** Verified today:

| File and line | Declaration |
|---|---|
| `buttons.css:211` | `transition: transform 650ms var(--nf-ease-standard)` |
| `buttons.css:228` | `transition: transform 480ms var(--nf-ease-standard)` |
| `glass.css:314` | `transition: transform 900ms var(--nf-ease-standard)` |
| `glass.css:561` | `animation: nf-confirm-dim 900ms ...` |
| `glass.css:587` | `animation: nf-confirm-sweep 650ms ... 260ms both` |
| `map.css:65` | `animation: nf-map-pin-drop 640ms var(--nf-ease-spring)` |
| `map.css:74` | `animation: nf-map-cluster-drop 640ms var(--nf-ease-spring)` |
| `motion.css:126` | `transition: opacity 260ms var(--nf-ease-standard)` |
| `motion.css:181` | `animation: nf-status-assemble 600ms var(--nf-ease-spring)` |
| `motion.css:284` | `transition: transform 1.15s var(--nf-ease-entrance)` |
| `motion.css:324`, `:333` | `animation: nf-balance-pulse-* 1.1s` |
| `motion.css:366`, `:369` | `animation: nf-tx-slide-* 420ms` |

Each of these reaches for the easing token and then hardcodes the duration
beside it, which is the most revealing shape possible: the author knew the token
layer existed and there was no duration that fit. Note the values. 480, 600, 640,
650: four attempts to express something between `slow` (380ms) and `deliberate`
(620ms).

**Do.** Two things, in this order.
1. **Add `--nf-duration-settle: 500ms`** to the scale. It is the missing step and
   ten declarations are evidence for it.
2. **Replace every literal with a token.** Some will round. Rounding a 480ms to
   500ms is invisible; leaving a person with vestibular sensitivity a 900ms
   transform is not.

Note that several of these sit in files that DO carry a `prefers-reduced-motion`
block, which means their author thought about it, guarded the wrong thing, and
left the transform running. A per-file guard is not a substitute for the token.

### MOT-9. Hover is a desktop idea and this is a phone product. **NEW. OPEN. P2**

Every hover state in the product is dead weight on the majority of sessions, and
worse, on a touch device a `:hover` rule frequently *sticks* after a tap until
something else is touched, so a card stays lit after the user has navigated away
and come back.

**Do.**
1. **Wrap every hover in `@media (hover: hover) and (pointer: fine)`.** Not
   `min-width`. A tablet with a keyboard is fine, a large phone is not.
2. **Every hover must have a press equivalent**, because the touch user gets no
   hover at all and must still be told the thing is interactive. Press
   (`instant`, `scale(0.97)`) is that equivalent and it should be on every
   interactive surface, not just buttons.
3. **Focus-visible is not optional and is not the same as hover.** It is the only
   affordance a keyboard user has, and it should be a ring, at
   `--nf-duration-fast`, never a colour change alone.

### MOT-10. Realtime arrivals must respect the reader's position. **NEW. OPEN. P1**

`useThreadRealtime` and the notification subscription insert rows into a live
list from a socket. The message-arrival motion is good (`nf-msg-in-right` and
`nf-msg-in-left` spring in from the side their sender occupies, which is a
genuinely well-reasoned piece of work). The missing rule is about *where*, not
*how*.

**Do.**
1. **If the reader is at the bottom of the thread, the new message enters and
   the view follows.** This is the normal case and it is already right.
2. **If the reader has scrolled up, nothing moves.** The message enters below the
   fold and a pill appears saying one new message. Auto-scrolling a person who
   is reading history is the single most disliked behaviour in any chat product.
3. **A message that arrives while the tab is hidden does not animate.** It is
   simply present when the person returns. Animating a backlog of eleven
   messages on focus is a slot machine.
4. **The same three rules apply to the notification list** and to the social
   feed, and they should be one shared hook rather than three implementations.

### MOT-11. View transitions are wired and used for one thing. **NEW. OPEN. P2**

`base.css:26` sets up the View Transitions API for the photo camera move: a
listing card and the gallery it opens into tag matching elements with the same
`view-transition-name`, and the browser morphs one into the other. The
reduced-motion guard is correct and the no-JS fallback is a genuine no-op.

This is the best piece of motion in the product and it is used once.

**Do.** Extend it to the two other places where a small thing becomes a big
thing: an avatar becoming a profile header, and a map pin becoming its bottom
sheet. Both are the same gesture and both currently cut. Do not extend it further
than that: a view transition on an ordinary navigation is a page that feels
slow.

### MOT-12. Nothing tests any of this. **NEW. OPEN. P2**

Section 21 counts 83 browser specs and none of them asserts a motion property.
Three are worth writing and each is cheap:

1. **The reduced-motion sweep.** Load the app with `prefers-reduced-motion:
   reduce` forced, walk the route list already used by the image spec, and fail
   on any computed `animation-duration` or `transition-duration` above 50ms. This
   spec would have caught all ten literals in MOT-8 the day they landed.
2. **The token sweep.** Grep the partials for `animation:` and `transition:`
   declarations carrying a literal duration, allowlist the ambience loops by
   name, fail on the rest. A lint rule, not a browser spec, and it is ten lines.
3. **The money-does-not-move spec.** Assert that no element carrying a currency
   figure has a non-`none` computed `animation-name`. MOT-2 is a P0 rule and P0
   rules should not rely on review.

---

## 25. Backend speed, strength and sharpness

Everything in this section was measured today against the live project
`uccixoonmbhrnyczyigt` or read out of the tree. **The platform has almost no
data**, so nothing here is a report of an observed slow query. It is a report of
shapes that are fast at zero rows and are known to be slow at real ones, which
is the only kind of performance work worth doing before launch: the shapes are
cheap to fix now and expensive to fix under load.

**Live row counts today, for scale.** `local_governments` 774, `occupations`
749, `states` 37, `posts` 19, `amenities` 15, `areas` 7, `profiles` 1, and
**`listings` does not appear in `pg_stat_user_tables` with a single live row**.
Every figure below about the catalogue is therefore about a table that is empty.

### BE-1. `resolveSession` is not memoised, so one page render makes several identical auth round trips. **NEW. DONE 2026-08-09**

`lib/actions/session.ts` exports `resolveSession`, which calls
`supabase.auth.getUser()`. That is not a local token decode: it is an HTTPS
request to GoTrue at `/auth/v1/user` that validates the access token server-side.
There are **110 `await resolveSession()` call sites across 62 files**.

The cost is not hypothetical. On `/home`, `app/(app)/layout.tsx` awaits
`getShellIdentity()`, which resolves a session, and the page awaits
`getHomeOverview()`, which resolves another. Both of those functions are
individually wrapped in React `cache()`, which is exactly the right instinct
applied one level too high: the memo is on the caller, so each caller still pays
its own `getUser`. Two round trips to Abidjan or Frankfurt before anything
renders, for one identical answer.

**Do.** Wrap `resolveSession` in React `cache()`. The memo is request-scoped, so
it is correct in server components, route handlers and server actions alike, and
it cannot leak between users.

**And the safety argument, because memoising an auth check deserves one.** The
only way a per-request memo can be wrong is if the session changes mid-request.
Three call sites change it: `signInWithPassword`, `verifyOtp` and
`exchangeCodeForSession` in `lib/auth/actions.ts`, none of which calls
`resolveSession` afterwards, and `signOut` and `deleteAccount` in
`lib/profile/actions.ts`, both of which call `resolveSession` **before** signing
out and return immediately after. Checked, one by one. There is no path where a
second resolution in the same request should see a different answer.

**DONE, 2026-08-09.** `resolveSession` in `lib/actions/session.ts` is wrapped in
React `cache()`, with the safety argument above written into the file so the
next reader inherits it rather than re-deriving it. `lib/actions/session.test.ts`
holds five specs: the three outcomes, the memo (three concurrent callers plus a
fourth make exactly one `auth.getUser()` call and get an identical object), and
the leak guard (two scopes ask twice and the second is not served the first's
answer).

**And a trap was found while proving it, which is the more valuable half.**
Vitest was resolving `react` to the CLIENT build, whose `cache` is a bare
passthrough that calls the function every time, while the app resolves the
`react-server` build, whose `cache` memoises. So a `cache`-wrapped server module
behaved one way in the app and the opposite way under test, with every test
still green. `vitest.config.ts` now aliases `react` at
`react/react.react-server.js`, exactly as it already aliased `server-only` and
for exactly the same stated reason. The whole suite passes under the alias: 22
files, 493 tests. **Everything else in this codebase wrapped in `cache` was
untested by accident until this change**, and `getHomeOverview` and
`getShellIdentity` are both in that set.

### BE-2. The catalogue's default ordering has no index behind it. **DONE. P1**

**Fixed** in migration `20260809081657_the_catalogue_stops_sorting_every_row_and_starts_finding_them`.
`listings_catalogue_order_idx` is `(featured desc, published_at desc nulls last,
created_at desc) where status = 'PUBLISHED'`: the ORDER BY clause exactly,
including `nulls last`, because a btree can only be walked in sorted order if its
declared order is the one being asked for.

**Do not read this as a proven speed-up.** Verified against the live database at
42 rows, the planner still chooses a sequential scan, which is correct when the
whole table is four pages. What is verified is that the index is applicable, not
that it is being used yet. It starts earning its keep when the catalogue grows.

The original entry below is kept because the reasoning is still the reasoning.

---

`SupabaseListingRepository.search()` ends every query with:

```
.order("featured", { ascending: false })
.order("published_at", { ascending: false, nullsFirst: false })
.order("created_at", { ascending: false })
.limit(200)
```

That ordering, on `status = 'PUBLISHED'`, is the single most-run query the
product will have. The live index list on `public.listings` carries eighteen
indexes, including well-judged partial ones for price, size, tenure, power and
water. **None of them covers `(featured, published_at, created_at)`**, and
`listings_status_idx` is a plain btree on `status` alone, which for a table where
most rows will be `PUBLISHED` is not selective enough to help.

The consequence at scale is a sort of the entire published catalogue on every
search, including every search that also carries a filter, because the filter
narrows the scan and the sort still has to run over what survives.

**Do.** One partial index, matching the query exactly:

```sql
create index listings_catalogue_order_idx
  on public.listings (featured desc, published_at desc nulls last, created_at desc)
  where status = 'PUBLISHED';
```

Owner note: this is a migration, so it belongs to whoever owns `supabase/**`.
It is one statement and it is the highest-value index the schema is missing.

### BE-3. There is no full-text index, and free text is filtered in the application. **DONE. P0 in hindsight, not P1**

**Fixed** in the same migration as BE-2, plus `freeTextGroups` in
`supabase-repository.ts` and `free-text.test.ts`.

The entry below called this correctly: it was a correctness bug, not a
performance one, and the severity was understated at P1. Free text never reached
SQL at all, so search could only ever see the newest 200 published rows.

**Trigram, not tsvector, and the reason is not preference.** `matchesFilter` is
the authority on whether a listing matches, and it asks a substring question.
`to_tsvector` matches whole lexemes, so full text search would have answered a
DIFFERENT question than the browser's live match count, and those two are
required not to disagree. `gin_trgm_ops` indexes `ilike '%term%'`, which is the
same question. Three partial GIN indexes on title, city and area.

**The invariant the push-down obeys, and the thing to preserve if anybody
touches it.** SQL may hand back rows the matcher then drops. It may NEVER
withhold a row the matcher would have kept, because nothing runs afterwards to
notice. Three consequences, each of which looks arbitrary until you know that:

- Words are ANDed, columns ORed. If the term is a substring of the joined
  haystack then each word is too, and a word has no space in it, so it must sit
  inside one field rather than straddle two.
- Punctuation becomes a wildcard rather than being deleted. Deleting turns `st.`
  into `st` and stops matching "St. Peter's", which is the forbidden direction.
  It also stops a user typing `%` from handing us a pattern matching everything.
- State is resolved in JavaScript against the reference map, because the
  haystack holds a state's NAME while the row holds its code, and somebody
  searching Ogun has to reach a listing in Abeokuta.

`free-text.test.ts` asserts the invariant itself rather than asserting the
strings come out a particular shape, and pins the haystack's five fields so
adding a sixth fails there instead of quietly breaking recall.

Verified applicable against the live database: forcing the planner shows
`listings_city_trgm_idx` serving `Index Cond: (city ~~* '%lekki%')`.

The original entry below is kept because the diagnosis is worth reading.

---

`search()` says so plainly in its own comment: free text runs "in memory (the
shared haystack, until a Postgres full text index exists)". Verified: the
installed extensions are `btree_gist`, `pg_cron`, `pg_stat_statements`,
`pgcrypto`, `plpgsql`, `postgis`, `supabase_vault` and `uuid-ossp`. **There is no
`pg_trgm` and no tsvector column anywhere.**

The shape this produces is the expensive one: pull 200 rows over the wire, then
discard most of them in Node because the words did not match. At 200 rows that is
a wasted payload. At a catalogue of 50,000 it is wrong in a way that cannot be
patched, because the 200-row ceiling means free text only ever searches the
newest 200 listings and silently returns nothing for a property that exists.

**That last point is the real severity.** This is not only a performance entry.
Today, with an empty catalogue, free text appears to work. The first time the
catalogue exceeds 200 published rows, search starts lying.

**Do.**
1. A generated `tsvector` column over title, area, city and description, with a
   GIN index, and `websearch_to_tsquery` in the query. Nigerian place names and
   property vocabulary are not in any dictionary, so use `simple` rather than
   `english`, and add `pg_trgm` for the misspellings that matter (`Lekki`,
   `Ikoyi`, `Yaba`).
2. **Until that lands, cap the damage honestly.** When a free-text term is
   present and the result set hits the 200-row ceiling, the surface must say the
   results are partial rather than presenting them as the whole answer.

### BE-4. The amenity filter reads up to 5,000 join rows and intersects them in Node. **NEW. OPEN. P2**

`listingIdsWithAllAmenities` selects `listing_id, amenity_id` from
`listing_amenities` with `.in("amenity_id", wanted).limit(5000)`, builds a
`Map<string, Set<string>>` in memory, and keeps the ids whose set size equals the
requested count.

The logic is right and it is pushed down as far as PostgREST allows. The problem
is the 5,000 ceiling: a popular amenity across a real catalogue exceeds it, the
query silently truncates, and listings that genuinely carry the whole set are
dropped from the results. Same failure class as BE-3, a correctness bug wearing a
performance bug's clothes.

**Do.** A `listings_with_amenities(p_codes text[])` SQL function doing the
`group by listing_id having count(*) = cardinality(p_codes)` in Postgres, which
is one index scan on `listing_amenities_amenity_idx` and no ceiling. Delete the
5,000.

**HALF DONE, 2026-08-09: the truncation is no longer silent.** The SQL fix is a
migration and is not this pass's to make. What was in this pass's reach was the
silence, and that was the dangerous half: a cap with no signal on a query whose
result is then aggregated is not a performance limit, it is a wrong answer that
nobody is told about. The ceiling is now the named constant `JOIN_ROW_LIMIT` and
`warnIfTruncated` writes one greppable `[catalogue]` line naming the read, the
ceiling and the listing count when it is hit, pointing at this entry. **The
lesson is CASE-1's, one directory over: the bug was never that something failed,
it was that nothing said so.** The correctness fix above is still owed.

### BE-5. Review statistics are computed in Node from raw rows. **NEW. OPEN. P2**

`getReviewStats` selects `listing_id, rating` for every review on the page's
listings, `.limit(5000)`, and averages in JavaScript. Same ceiling, same shape.
A listing with 5,000 reviews is a good problem; silently averaging a truncated
sample of it is not.

**Do.** Either a small aggregate RPC, or, better, `rating_avg` and `review_count`
as maintained columns on `listings` updated by the trigger that already fires on
review insert. The catalogue query then carries the rating for free and one round
trip disappears from every page. P-9 and P-10 are already asking for
trigger-maintained columns elsewhere; this is the same pattern.

**HALF DONE, 2026-08-09, the same half as BE-4.** `getReviewStats` now shares
`JOIN_ROW_LIMIT` and warns through `warnIfTruncated` when it hits it, so a
rating averaged over a truncated sample announces itself instead of being
published as the listing's rating. The maintained columns are still the answer.

### BE-6. Every catalogue read pulls the whole listing, including the parts nothing renders. **NEW. PARTLY DONE 2026-08-09. P2 residual**

`LISTING_SELECT` is one 60-column select with three embedded joins
(`listing_photos`, `listing_videos`, `listing_amenities`) and it is used by
`search()`, `byId()` and `loadListingsByIds()` alike. A search results page
therefore pulls, for up to 200 listings, every fee column, every utility column,
`year_built`, `total_floors`, `minimum_tenancy_months`, and the walkthrough video
rows.

**And the videos are the sharp end.** `mapRows` calls `signVideos`, which is a
Supabase Storage `createSignedUrls` call, a separate HTTP round trip, on every
catalogue read that returns any video path. Nothing in the product renders
`Listing.videos`: grep the `.tsx` files and there is not one reference. The
field is declared on the type at `lib/listings/types.ts:165`, populated by the
repository, and consumed by nobody. So the search page pays a storage round trip
and signs URLs that are then discarded.

**Do.** Make the walkthrough join and its signing round trip **opt-in**, off for
the catalogue path and on for the one page that will render a walkthrough when
MED-2 lands. Do not delete `listing_videos` from the repository: P-11 and MED-2
both want it, and a select that has to be rebuilt is worse than a flag that has
to be flipped.

The wider column narrowing is worth doing too, and is worth doing second: a card
does not need `year_built`, `total_floors` or `minimum_tenancy_months`, but
`matchesFilter` and `headlinePrice` read across most of the money columns, so
narrowing them needs care and a test rather than a confident deletion.

**DONE for the videos, 2026-08-09.** There are two selects now.
`LISTING_SELECT` carries `listing_photos` and `listing_amenities` and is used by
`search()` and `loadListingsByIds()`. `LISTING_DETAIL_SELECT` adds
`listing_videos` and is used only by `byId()`, which is the one read whose page
will render a walkthrough when MED-2 lands. Nothing was deleted.

`mapRows` needed no change, which is worth recording: `signVideos` already
returns early on an empty path list, so a row set with no video join makes no
storage call at all. The round trip disappears from the catalogue path as a
consequence of the select, not as a second branch.

**One thing was learned the hard way and is written into the file so nobody
undoes it.** The obvious implementation, composing the detail select from the
card select or choosing between them in a `selectFor(withVideos)` helper, does
not work and fails in a way that looks like an unrelated cast error. The
Supabase client parses the select string **at the type level** to derive the row
shape, so it needs a literal; a composed or conditional select degrades to
`string` and every `as ListingRow[]` downstream becomes
`Conversion of type 'GenericStringError[]'`. So the column list is written
twice, on purpose, and `lib/listings/selects.test.ts` holds the two to each
other: they must differ by exactly the `listing_videos` join, in the same order,
with no duplicates and nothing on the card read that is missing from the detail
read. Five specs.

**Residual, P2.** The wider column narrowing described above. A card still pulls
`year_built`, `total_floors` and `minimum_tenancy_months`. That is bytes rather
than a round trip, and it needs the matcher's column dependencies mapped first.

### BE-7. `recommended()` reads two hundred listings to show six. **NEW. DONE 2026-08-09**

`recommended(limit = 6)` is `diversePick(await this.search({}), limit)`. The
`search({})` call has no filter, so it pulls the full `CATALOGUE_LIMIT` of 200
rows with every join, maps all 200 into domain objects, and then `diversePick`
sorts them and takes six.

`diversePick` needs a pool wide enough to alternate between property kinds, so it
cannot take exactly six. It does not need 200.

**Do.** Let the filter carry a limit, and have `recommended` ask for a pool a
few times its output rather than the whole catalogue page. Six kinds exist, so a
pool of roughly ten times the requested count is more than enough for
`diversePick` to alternate, and it is a fifth of the current read.

**DONE, 2026-08-09.** The limit is an OPTION, not a filter, and the distinction
is now written into `ListingSearchOptions` in `lib/listings/types.ts`: a filter
is a promise to the reader about which listings they are looking at and belongs
in the URL, an option is a decision about what the answer costs and must never
change which listings match. The type had been reduced to one vestigial field
(`partners`, kept alive only so two call sites would compile) and is load-bearing
again.

`recommended(limit)` now reads `limit * RECOMMENDED_POOL_FACTOR` rows, factor 10,
so the default rail reads 60 instead of 200. `rowCap()` clamps: an option may
lower the ceiling and never raise it, and a nonsense number (zero, negative,
fractional, `NaN`) falls back to the full catalogue limit rather than to nothing,
because a bad number should produce an ordinary page and not an empty discovery
surface.

**The one caveat is in the type's own comment and matters.** This is not
pagination and must not be presented as it. The in-memory matcher runs after the
read, so a smaller ceiling can return fewer matches rather than the same matches
in a smaller page. It is safe exactly where the caller wants "some good ones"
rather than "all of them", which is what a recommendation rail is. BE-3 is the
entry about the ceiling that is NOT safe.

### BE-8. `listings_in_bounds` exists, is granted to `anon`, and nothing calls it. **NEW. DONE 2026-08-09. Unblocks M-5 and M-10**

Verified live. The function exists with this signature:

```
listings_in_bounds(p_west, p_south, p_east, p_north,
                   p_intent, p_property_type,
                   p_min_price_minor, p_max_price_minor,
                   p_bedrooms, p_limit default 500)
```

It is `LANGUAGE sql STABLE`, `SET search_path TO ''`, **not** `SECURITY DEFINER`
(so RLS applies, which is correct), it filters on
`status = 'PUBLISHED' and location is not null`, uses the `&&` operator against
`st_makeenvelope(..., 4326)` so it lands on `listings_location_gist`, and clamps
its own limit with `least(greatest(coalesce(p_limit, 500), 1), 1000)`. It returns
twelve narrow columns rather than a listing: id, title, type, intent, city, area,
state, lat, lng, bedrooms, bathrooms and a single resolved `price_minor`.

This is a well-built function. It is granted to `anon`, `authenticated`,
`postgres` and `service_role`. **And there is no `.rpc("listings_in_bounds")`
anywhere in `apps/web`.** M-4 said PostGIS was installed and nothing used it;
this is the specific unused thing, and it is the whole server half of M-5.

**Two gaps before it is exposed, both of which are SEC-6 point 3.**

1. **The bounding box has no area cap.** A caller can pass a box covering
   Nigeria and get 1,000 rows with coordinates. That is a catalogue export with
   pin locations, in one request, unauthenticated. The `p_limit` clamp bounds the
   row count and does nothing about the box.
2. **Nothing rate limits it.** The public browse surfaces have been open since
   N-1 and this would be the cheapest of them to loop.

**Do.** Build the caller in `lib/listings/`, not in a component, and give it the
two caps the SQL cannot give itself:

1. **Reject a box wider than a city.** A viewport query is a viewport query. A
   span of more than roughly 1.5 degrees in either axis is not a person looking
   at a map, and refusing it costs nothing legitimate.
2. **Rate limit it as a public bucket**, keyed on IP for anonymous callers,
   through the existing `consume` in `lib/security/rate-limit.ts`.
3. **Normalise the box before it reaches SQL**: swap inverted corners, clamp to
   Nigeria's extent, and refuse non-finite numbers rather than passing `NaN`
   into `st_makeenvelope`.
4. **Expose it as a route handler** so the map can move the viewport without a
   full server render, which is what M-5 and M-10 both need.

**DONE, 2026-08-09.** Two files, and the split between them is the design.

**`lib/listings/bounds.ts` bounds ONE REQUEST.** `readBounds` is a pure function
and is the entire security surface, so it is provable without a database or a
request. It refuses a corner that is missing, non-numeric or infinite rather
than handing a `NaN` to `st_makeenvelope`; refuses a coordinate that is not on
earth; repairs an inverted rectangle, because a dragged selection is a reader
and not an attacker, and an unrepaired one silently matches nothing which looks
like an answer; refuses either span above `MAX_SPAN_DEGREES` (1.5 degrees, about
165km, where greater Lagos fits inside 0.6); and clamps what survives to
Nigeria's extent. `pinCap` holds the row count at 300 and, like `rowCap` in
BE-7, lets a caller lower the ceiling and never raise it.

**One ordering detail is load-bearing and has its own spec.** The span is judged
on what the caller ASKED for, before the clamp to Nigeria. Clamping first would
turn "give me the whole country" into a legal request for the whole country,
which is the exact request being refused.

**`app/api/map/listings/route.ts` bounds MANY REQUESTS.** The per-request caps
are worth little alone: a caller who cannot have the country in one request can
tile it in four hundred. It consumes the existing Postgres-backed limiter in a
`map_bounds` bucket, keyed by IP since there is no account to key by, at 240
reads per five minutes. That is deliberately generous, because a person panning
with a debounce (M-6) issues a burst of a dozen in ten seconds and that is
ordinary use: the budget is priced to make scripted enumeration slow, not to
discipline a fast scroller. The limiter is consulted before any other work, and
a spec asserts the RPC is never reached on a refusal, because a limiter that
runs after the query has limited nothing.

**Three refusals get three statuses**, not one 400, because the map's response
to each differs: malformed is 400, too-wide is 422 with "zoom in", out-of-range
is 422 with "outside Nigeria". Collapsing them would leave the surface unable to
tell "zoom in" from "you have panned off the country", and the latter rendered
as an empty result reads as "no listings here".

The response also carries `capped: true` when the answer hit `MAX_PINS`, so the
surface can say it is showing the first 300 in this view. **A map that silently
truncates tells a reader a neighbourhood is empty when it is full**, and that is
the one lie a map can tell that a person cannot detect.

Cached with `s-maxage=30, stale-while-revalidate=60`: a published catalogue is
identical for every anonymous caller and a pan crosses ground it has already
covered constantly, and thirty seconds of staleness on a property that has been
listed for weeks is not a difference anybody can perceive.

**22 specs across `lib/listings/bounds.test.ts` (14) and
`app/api/map/listings/route.test.ts` (8).**

**What is still owed, and it is the client half.** Nothing calls this endpoint
yet. The map component lives in `components/app/search/MapDock.tsx`, which this
pass does not own. M-5, M-6 and M-10 are the client work, and they now have a
server to talk to: `GET /api/map/listings?west=&south=&east=&north=` with
optional `intent`, `kind`, `bedrooms`, `minPrice`, `maxPrice` and `limit`.

### BE-9. Three in-process caches, three implementations, no shared behaviour. **NEW. DONE 2026-08-09**

The codebase independently reinvented the same TTL cache three times:

| Where | What | TTL |
|---|---|---|
| `lib/platform-stats.ts` | The landing page counts | 300,000ms |
| `lib/listings/supabase-repository.ts` | `states` code to name | 600,000ms |
| `lib/listings/supabase-repository.ts` | `amenities` id to code | 600,000ms |

Each is a module-level `let cache = { value, expires }`. They work. They also
each independently decided what to do when the read fails, and two of them cache
the failure: `platform_stats` stores `null` for five minutes after one bad read,
so a single blip costs the landing page its numbers for five minutes even though
the database recovered in two seconds.

**And a fourth place needs one and does not have it.** `readPlaceNames` in
`lib/app/home-queries.ts` reads `public.states` and `public.local_governments` on
every signed-in home render, to turn two codes into two names. Those tables hold
37 and 774 rows and change roughly never. Two round trips per render, forever,
for static reference data.

**Do.** One helper, `lib/cache/memo.ts`, with three behaviours the ad hoc copies
do not share:

1. **A fresh value is served from memory** until its TTL expires. Same as today.
2. **A failed refresh keeps the last good value** rather than replacing it with
   the failure. This is the `platform_stats` bug and it is the reason to share
   the code at all.
3. **Concurrent refreshes collapse into one.** Three requests arriving at the
   moment a TTL expires currently make three identical database calls. The
   in-flight promise should be shared.

Then adopt it in all four places. Note what this is and is not: it is a
**per-instance** cache, so on serverless each warm instance holds its own copy
and a deploy clears them all. That is fine for reference data and marketing
counts, and it is exactly what `lib/security/rate-limit.ts` correctly refused to
rely on for a limit.

**DONE, 2026-08-09.** `lib/cache/memo.ts` is new and carries all three
behaviours, plus an `isFailure` predicate for loaders that report failure
in-band rather than by throwing. Its header states what it is NOT for, in the
words of the rate limiter's own story, so that nobody reaches for it to cache a
balance or a permission. `lib/cache/memo.test.ts` holds seven specs, including
the two that are the reason the helper exists: a refresh that throws keeps the
last good value and is not itself cached, and three concurrent `get` calls make
one load.

**All four sites now use it.**

| Site | What changed |
|---|---|
| `lib/platform-stats.ts` | The five-minute `null` bug is gone. `null` is declared a failure, so a blip no longer costs the landing page its numbers after the database recovers |
| `lib/listings/supabase-repository.ts` | `states` and `amenities` memos replace two hand-rolled caches |
| `lib/app/home-queries.ts` | `readPlaceNames` no longer queries `states` and `local_governments` per signed-in home render. Two round trips per render become two per hour per instance |

**One thing worth carrying forward, because it is a trap rather than a
preference.** Every loader builds its own Supabase client rather than borrowing
the caller's. A cache that outlives a request must not close over a
request-scoped, cookie-bound client: the first caller's client would outlive
their request and every later refresh would run through a session that has gone.
Both files say so at the memo.

**And two pre-existing lint failures in `supabase-repository.ts` were cleared
while in the file**, since the house rule is that a touched file lints clean:
`YEARLY_KINDS` and `optionalNumber` were both dead. `YEARLY_KINDS` died when
`headlinePrice` in `./pricing` took over the period decision, and a comment was
still citing it. This is PERF-5's category, found by lint rather than by grep.

### BE-10. Nothing on the public surfaces is cacheable, because everything reads cookies. **NEW. OPEN. P1**

Every server read in the product goes through `lib/supabase/server.ts`, which
calls `cookies()`. In Next 15 that marks the route dynamic, so `/search`,
`/listing/[id]` and `/u/[handle]` are rendered from scratch for every request
including every anonymous one. N-1 made anonymous the common case.

A published listing detail page is the same bytes for every signed-out visitor
on earth. Today it is a full render plus a database round trip per request, and
it is the page the product most wants a crawler to index (N-2, N-3).

**Do.** Split the anonymous read path from the session read path.

1. **An anon-only client that does not touch cookies.** The anon key plus RLS is
   already the security boundary for a published listing; the cookie adds
   nothing to that read.
2. **Then the public routes can be statically generated with a revalidate
   window**, and the personal parts (saved state, the message button) hydrate
   client-side. A published listing changing within 60 seconds of an edit is
   fine; a listing page that cannot be cached at all is not.
3. **This is the prerequisite for N-2 and N-3.** A crawler on a cold serverless
   function is the slowest possible first impression, and crawl budget is spent
   in milliseconds.

### BE-11. The webhook and the reconciler are the only routes that must never be slow, and neither is measured. **NEW. OPEN. P1**

`app/api/paystack/webhook/route.ts` is 581 lines. Paystack retries on timeout,
and CASE-1 is the record of what happens when the money path fails quietly.
`app/api/paystack/reconcile/route.ts` is 158.

**Correcting the premise before making the point, because the premise has
moved.** It is not true that the money path is unlogged. `lib/payments/observability.ts`
exists, it is 141 lines, and it is good: a closed `MoneyOutcome` vocabulary of
seven values so an alert rule has a fixed vocabulary rather than drifting free
text, a `[money]` prefix, an explicit list of what may never be logged, level
selection by outcome, a `logMoney` that cannot throw, and a reasoned
`eslint-disable` explaining why "posted" must be `console.info` rather than a
warning (every successful payment would otherwise page somebody and the channel
would be unreadable within a day). W-1's "unlogged" claim is stale.

**What is genuinely missing is a duration.** `MoneyLogFields` carries surface,
outcome, reason, reference, amount, user, wallet and event, and no time. So
every webhook says what it decided and none says how long it took. Paystack
retries on timeout, and the first signal that the webhook has become slow will
be its retry queue rather than ours.

**Do.** Add `durationMs?: number` to `MoneyLogFields`, render it as `ms=` in
`line()`, and start a clock at the top of the webhook and reconcile handlers.
That is a change of about six lines and it needs no vendor.

**OWNER NOTE, and this is why the entry is still open.**
`lib/payments/observability.ts` is outside this pass's build surface, which
covers `lib/**` except `lib/wallet` and `lib/payments`. The route handlers in
`app/api/paystack/` are in scope but the field they would populate is not, and
adding a duration by smuggling it into the `reason` string would corrupt exactly
the closed vocabulary that makes the module alertable. **Handed to whoever owns
`lib/payments`.** It is the smallest high-value change available in that
directory.

### BE-12. The CSP report endpoint keeps an unbounded, caller-keyed map. **NEW. DONE 2026-08-09**

W-2 covers the money surfaces. The narrower finding here is
`app/api/csp-report/route.ts`, which is unauthenticated by necessity, and which
kept a module-level `Map` keyed on
`${violation.directive}|${violation.blocked}`, where `blocked` is a URL supplied
by the reporting browser.

The route's own header lists four mitigations and is careful and correct about
each of them, but the throttle map itself had **no ceiling and no pruning**.
Entries were only ever added. A caller posting reports with a unique blocked URL
each time grows that map without limit, in a long-lived serverless instance, on
an endpoint the file itself describes as "a free write surface for anybody who
finds it".

**Do.** Cap and prune it, exactly the way `lib/security/rate-limit.ts` already
caps and prunes `deniedUntil`: drop expired entries first, then the oldest
insertions if it is still oversized. That file solved this problem correctly and
wrote down why; the throttle map should borrow the answer rather than a fourth
independent one. The rate limit on the money routes is W-2 and stays there.

**DONE, 2026-08-09.** `app/api/csp-report/route.ts` now carries
`MAX_QUIET_KEYS = 500` and a `pruneQuietMap` that drops expired entries first and
then evicts oldest-insertion-first, which is what `Map`'s insertion ordering
makes an eviction policy rather than an arbitrary cull. The comment names
`pruneDenyCache` in `lib/security/rate-limit.ts` as the answer it is borrowing,
so the two cannot drift apart silently.

`app/api/csp-report/route.test.ts` is new and proves it without reaching into
the module's private map, because a test that asserts on a private field
re-breaks the moment the policy changes. It floods the endpoint with 900 unique
blocked URLs and then re-posts the first one, asserting it logs a second time,
which is only possible if the entry was evicted. The other four specs hold the
204-on-everything contract, the throttle itself, distinct pairs logging
separately, and an oversized body being dropped unread.

### BE-13. Realtime subscribes per conversation and nothing bounds the channel count. **NEW. OPEN. P2**

`useThreadRealtime` opens a channel named `thread-${conversationId}` with a
`postgres_changes` filter, and the notification hook opens another. RLS applies
to the change feed, which is the important part and is correct.

Two things are not bounded. A client that navigates between many threads relies
entirely on the effect cleanup to close channels, and Supabase Realtime bills and
limits on concurrent connections. And `postgres_changes` filters are evaluated
per subscriber in the Realtime server, so the cost of a busy thread scales with
the number of watchers rather than with the number of messages.

**Do.** Neither is urgent at current scale and both are cheap to get right now.
One shared channel per user for notifications rather than one per surface, and a
single Realtime client instance rather than one per hook. Revisit
`postgres_changes` versus broadcast-from-trigger when a thread has more than a
handful of participants; the typing indicator already uses broadcast and is the
model.

### BE-14. Cold start is the real latency and nothing measures it. **NEW. OPEN. P2**

Every observation in this section is about query shape. On a serverless
deployment with low traffic, which is exactly what this platform has, the
dominant latency for most requests is the cold start plus the TLS handshake to
Supabase, and neither appears in any query plan.

PERF-6 asks for Web Vitals and is right. The narrower ask here is server-side:
one log line per request with the route, the total server duration, and whether
the instance was cold. It costs nothing, it is greppable, and it is the only way
to know whether BE-1 through BE-10 moved anything.

**And the honest caveat this section closes on:** with an empty catalogue,
BE-2 through BE-7 cannot be demonstrated to be slow, only argued to be. The
argument is that each of them has a ceiling (200 rows, 5,000 rows) that produces
a *wrong answer* rather than a slow one once real supply arrives, and that is why
they are here rather than in a future performance pass.

---

## 26. What is not known

Stated plainly, because a recommendation resting on a guess is worse than no
recommendation.

1. **Whether `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` are set in the
   live Vercel environment.** Neither can be read from here. CASE-1's first
   failure is the most probable cause of the funding incident and remains a
   hypothesis with strong circumstantial evidence, not a confirmed diagnosis. The
   confirming test is one line: send a signed test payload to
   `/api/paystack/webhook` in production and see whether a `wallet_entries` row
   appears. **Do this before building anything else in section 6**, because if
   the key is present the diagnosis is wrong and something else is broken.
2. **Whether the deployment at `ninjafinds.vercel.app` is serving this branch.**
   Not verified. Nothing here confirms which git ref Vercel builds.
3. **Whether any native build compiles.** MOB-1 lists exactly what was and was
   not proven. No Android SDK and no macOS in this environment.
4. **Whether the light theme passes WCAG AA today.** The last measurement found a
   failure on the most-used text token and predates the token work, and its
   background walk was faulty. D-3 is the spec that would answer it. Nobody has
   run one.
5. **The real type and geometry drift figures behind D-1.** Measured against a
   3,167 line stylesheet that is now 71 lines and 19 partials. Re-measure before
   quoting.
6. **Whether the two ordering-inverted migrations in T-10 are order-dependent.**
   Read both files. This document did not, because renaming is not its to do.
7. **Whether the four locale files read naturally.** Yorùbá, Hausa and Igbo are
   complete, use correct diacritics and hooked letters, and were not written by
   native speakers. Two terms are flagged as possibly unidiomatic: the Igbo
   `Ọnụọgụgụ` for Analytics and the Yoruba `Ìdíwọ̀n` for a guest rating. Marketing
   copy should be rewritten from intent rather than corrected word by word. **And
   nothing in sections 7, 8, 9 or 12 has been translated at all**, so the escrow,
   fee, KYC and media copy will arrive English-only unless it is budgeted.
8. **Whether RentMe is a licensed entity, and under what.** E-7 and LG-5. This
   gates escrow entirely and has the longest lead time of anything in this
   document.
9. **Whether demo listings are being built at all**, or whether DEMO-1 is
   happening instead. Section 11 branches entirely on this and it is an owner
   decision, not an engineering one.
10. **What the real commission rate will be, and when.** Section 8 is built to be
    correct at zero and correct at any rate. It cannot recommend a number.
11. **Whether hotels and restaurants are recruited in year one.** S-3, unanswered
    since the last pass, and now blocking P-7's enum decision.
12. **Whether hosts should ever see an aggregate save count.** `saved_items` is
    owner-only by policy, so a host's client cannot read it, and the analytics
    read deliberately does not bypass that with the service role. The number
    would also be wrong: a signed-out visitor's saves live in `localStorage` and
    a cookie and never become rows, and N-1 has just made signed-out visitors far
    more common. A privacy posture decision, not an implementation detail.
13. **What "district should feed instantly" meant.** An owner instruction that cut
    off mid-sentence. It concerns the social layer. Ask rather than guess.
14. **Whether NaijaFinds Pro is in scope.** The only genuine survivor of the old
    blocked-decisions table. Still open with the owner, and it should be closed
    before RN-2 stage 3, because a product called NaijaFinds Pro is a reason not
    to rename the scope.





