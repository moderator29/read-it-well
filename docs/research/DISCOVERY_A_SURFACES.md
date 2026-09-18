# DISCOVERY A: SURFACES, JOURNEYS AND THE PROPERTY/STAYS EXPERIENCE

**Discovery Agent A of 3. Snapshot of the tree as pulled 18 September 2026,
while the HANDOFF_05 build session is concurrently pushing to main.** The
ledger (`docs/BUILD_05_LEDGER.md`) records commits `bb36563` (Phase A flip and
shells), `a8fad5b` (M1 to M15, thread faces, inspections, wallet pages,
settings/payments) and `70c98d9` (stay detail showcase, trips spine, cancel
flow, restaurant surface, types regeneration) as landed at snapshot time.
Everything below was verified by reading the code, not the ledger; where the
ledger claims something the code does not yet show, the code wins and the
difference is noted.

Status vocabulary used throughout: EXISTS AND WORKS / EXISTS BUT INCOMPLETE /
PARTIALLY CONNECTED / FRONTEND ONLY / BACKEND ONLY / MOCK-DEMO / PLACEHOLDER /
NOT IMPLEMENTED / UNCLEAR-NEEDS VERIFICATION.

One platform-wide fact that colours every judgement in this file: **the live
database holds 64 listings and every one of them is a demo row** (ledger
section 1; `is_demo` law in HANDOFF_05 section 4), and there are **0 bookings
and 6 profiles**. Every surface below that renders "real data" is rendering
real *rows* through real RLS-bound queries, but the rows themselves are
example inventory, disclosed on screen by `ExampleNotice`
(`apps/web/src/components/app/listing/ExampleNotice.tsx`). Nothing in this
report calls that MOCK-DEMO, because the pipes are real; the water is seeded.

Scope note: money internals, messaging internals, admin and security are
Agent B's; brand, design system and assets are Agent C's. Their surfaces
appear here only as far as the route inventory and journeys require.

---

## 1. COMPLETE ROUTE INVENTORY

Root of the app: `apps/web/src/app`. Route groups: `(app)` consumer shell,
`(site)` marketing chrome, `(auth)` auth chrome, `(dev)` dev only, plus
top-level `admin`, `agent`, `api` (Agent B), `auth/callback`, `offline`,
`welcome` and the root landing page.

The gate: `apps/web/src/middleware.ts` protects whole first segments
(`PRODUCT_SEGMENTS`): assistant, bookings, checkout, home, legal, messages,
notifications, profile, saved, settings, stories, wallet, trips, host,
inspections, admin, agent, welcome, plus the exact path `/styleguide`.
Browsing (`/search`, `/listing`, `/rent`, `/around`, `/u`, `/post`, `/stays`,
`/stay`, `/restaurants`, `/restaurant`) is deliberately open to signed-out
visitors; acting is what costs an account.

### 1.1 Root and system routes

**`/` Landing page** (`app/page.tsx`, 476L rendered via bands in
`components/site/landing/`). Marketing front door for signed-out visitors.
EXISTS AND WORKS: real platform stats (`lib/platform-stats.ts`), real featured
carousel from the catalogue, real reviews band ("real rows or nothing" rule),
markets band, one-account band, assistant showcase. All product links go
through `gatedHref`. UX: long page, but every band earns its keep and the
file's own history documents the cuts. UI: strong, on-system. Mobile: hero and
search row sized for 390px, root `loading.tsx` mirrors the hero shape. Design
opportunity: the landing still leads with property only; the Stays side is
invisible from the front door, which after this build is half the product.

**`app/not-found.tsx`** 404. EXISTS AND WORKS: session-aware "Back to home"
(landing vs `/home`), search entry, no dead end. **`app/error.tsx`** root
error boundary, EXISTS AND WORKS, digest surfaced, `/home-or-landing`
redirect trick because a client boundary cannot read the session. Sentry is
named in a comment as "once observability lands", so errors currently go to
`console.error` only: BACKEND ONLY observability, NOT IMPLEMENTED client
reporting. **`app/loading.tsx`** root skeleton for the landing, EXISTS AND
WORKS. **`/offline`** (`app/offline/page.tsx`) precached PWA offline shell,
EXISTS AND WORKS, honest copy about what does not work offline.

**`/welcome`** (`app/welcome/page.tsx` + `components/app/welcome/FirstRun.tsx`).
First-run: three intro cards then the one interests question, its own guard
(signed-out to sign-in, already-asked to home), outside the shell so it has
exactly two exits. EXISTS AND WORKS. Design opportunity: it is the only
onboarding moment the product has; nothing after it teaches the flip, the
wallet or saving.

**`/auth/callback`** (`app/auth/callback/page.tsx`). Every Supabase auth link
lands here; a screen, not a 307, handles implicit-flow fragments and expired
links with worded notices. EXISTS AND WORKS.

**`(dev)/gallery`** (`app/(dev)/gallery/page.tsx`). Component gallery mounted
with fixtures, `notFound()` in production. EXISTS AND WORKS as a dev tool;
useful to the redesign session as the one place gated components render
without a session.

### 1.2 `(auth)` group

All wrapped by `app/(auth)/layout.tsx` with its own `loading.tsx` and
`error.tsx`.

| Route | File | Status | Notes |
| --- | --- | --- | --- |
| `/start` | `(auth)/start/page.tsx` | EXISTS AND WORKS | Intro carousel (`StartCarousel`) on the way to sign-up |
| `/sign-in` | `(auth)/sign-in/page.tsx` | EXISTS AND WORKS | Chooser (email, Google, Apple via `getProviderStates`), worded notices for expired links and `sign-in-required` |
| `/sign-in/email` | `(auth)/sign-in/email/page.tsx` | EXISTS AND WORKS | `EmailAuthForm` + `signInWithEmail`, carries `next` return path |
| `/sign-up` | `(auth)/sign-up/page.tsx` | EXISTS AND WORKS | Chooser only, form moved off it |
| `/sign-up/email` | `(auth)/sign-up/email/page.tsx` | EXISTS AND WORKS | 37 states shipped with page, LGAs and occupations lazy |
| `/sign-up/verify` | `(auth)/sign-up/verify/page.tsx` | EXISTS AND WORKS | Six-digit code entry; closed a real dead end in the email flow |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | EXISTS AND WORKS | |
| `/reset-password` | `(auth)/reset-password/page.tsx` | EXISTS AND WORKS | Session-is-the-ticket model; expired links get a sentence and a re-request |

UX problems: none structural; the chooser-to-form-to-verify chain is three
screens where one might do, but each is defensible. Mobile: forms are
single-column and fine. Design opportunity: `/start` carousel is the first
brand moment for a new user and could carry the two-side story.

### 1.3 `(site)` group

All static-ish marketing/legal in `SiteHeader`/`SiteFooter` chrome
(`app/(site)/layout.tsx`). Every page verified present and written as real
content, not lorem: `/about` (190L), `/careers` (180L, honest "no open
roles"), `/contact` (191L, files a real support ticket), `/help` (239L,
searchable FAQ), `/docs` and `/docs/[slug]` (12-chapter documentation),
`/safety` (316L), `/standards` (300L, response times computed from
`lib/trust/standards.ts` so page and admin console cannot disagree),
`/cancellations` (182L, one platform-wide schedule), `/privacy` and `/terms`
(NDPA 2023 aware), `/styleguide` (374L, noindex, session-gated by
middleware). All EXISTS AND WORKS. Design opportunity: these pages are
property-voiced; the stays and restaurant vocabulary (MK-68) has not reached
them.

### 1.4 `(app)` group: the consumer product

Shell: `app/(app)/layout.tsx` resolves locale, side cookie (`lib/side.ts`)
and `getShellIdentity()` (`lib/app/shell-queries.ts`: userName, unread count,
avatar, signedIn, isAgent, isAdmin, all failing soft) and mounts
`components/app/AppShell.tsx` (522L): desktop `AppRail`, phone `MobileTabBar`,
drawer, immersive and edge-to-edge modes, `SideFlip` stage, `SideSync`.
`(app)/error.tsx` is a designed boundary. Nearly every route has a bespoke
`loading.tsx` skeleton mirroring its own shape, which is genuinely rare and
worth preserving in a redesign.

**`/home`** (`(app)/home/page.tsx`, 476L). Property side root. Signed-in
overview: Lagos-clock greeting, the reader's own city with lit area pins from
`public.areas`, trending strip, six recommended listings via
`getListingRepository().recommended(6)`, category row shared with the
landing, `AiAssistantBanner`, agent `VerifyPrompt` where relevant. Redirects
to `/welcome` on first run. EXISTS AND WORKS. UX: good. UI: hero artwork plus
pins is the platform's most distinctive screen. Mobile: fine. Design
opportunity: no stays presence at all on the Property home; the coin in the
nav foot is the only hint the other side exists.

**`/search`** (`(app)/search/page.tsx`, 772L). The discovery workhorse.
Everything in the URL (`lib/listings/search-params.ts`): `q`, `type`, sort,
view (`list`/`map`), budget, bedrooms, bathrooms, party size, amenities,
water, power, instant book, verified only. Components: `CategoryRail`,
`ActiveFilters`, `FilterDrawer` (full-page, real counts computed from the
candidate pool), `ViewToggle` (list/map as links), `RealMap` (server) over
`MapCanvas` (Leaflet), `RecentStrip` + `SearchMemory` (localStorage recents),
`ListingCard` grid, designed no-results state. Repository:
`SupabaseListingRepository` when configured, `EmptyListingRepository`
otherwise (`lib/listings/repository.ts`; the seeded/third-party catalogues
are deleted, one source of inventory). EXISTS AND WORKS. UX: no query
suggestions/autocomplete; every refinement is a full server round trip.
UI: strong; the drawer is the platform's best filter surface. Mobile: map
view is usable; no split list+map view exists at any width. Design
opportunity: desktop wastes the width a split view would use; a results map
beside the grid is specified nowhere but is the category norm.

**`/rent`** (`(app)/rent/page.tsx`, 147L). Long-let market shelf with the
safety rule stated. EXISTS AND WORKS, with a real defect: it awaits
`messages.conversationIdForListing(r.id)` **sequentially in a for-loop per
result row**, an N+1 on the page's hot path (lines around 44 to 50). UX: fine.
Mobile: fine. Design opportunity: it duplicates `/search?type=rental` with a
banner; nav-model.ts itself argued this page is "a filter presented as a
destination".

**`/listing/[id]`** (`(app)/listing/[id]/page.tsx`, 1048L). The most
important screen; full anatomy in section 4. EXISTS AND WORKS.

**`/saved`** (`(app)/saved/page.tsx` + `SavedBoard.tsx`). DB rows under RLS
merged with the device cookie mirror (`lib/saved/keys.ts`,
`lib/saved/queries.ts`) so signed-out hearts are never dropped; undo chip.
EXISTS AND WORKS. Design opportunity: a flat list; no comparison, grouping or
notes, on a product whose "whole job is comparison" (`SaveControl.tsx`'s own
words).

**`/around` (feed)** (`(app)/around/page.tsx`, 268L). Three honest reads
(`getJoinedFeed` / `getEverywhereFeed` / `getAreaFeed`), place switcher,
`AroundFab` composer, `SocialPaused` kill-switch state, designed unconfigured
state. EXISTS BUT INCOMPLETE: `lib/social/posts-queries.ts` returns a
`FeedPage` with a `cursor` and `ended` flag, but `components/social/feed/
Feed.tsx` accepts only `initial: PostView[]` and renders **no load-more or
infinite scroll anywhere**; the feed is permanently the first page
(PAGE_SIZE). BACKEND ONLY pagination. Everything else (marks, reposts,
reports, mute, block, inline replies, tombstones) EXISTS AND WORKS.

**`/around/[slug]`** (297L): one place, join, moderator apply, stories row,
reviews. EXISTS AND WORKS. **`/around/new`**: propose a place, moderator
rules stated. EXISTS AND WORKS. **`/around/settings`** (312L): the directory
(36 states + FCT, 774 LGAs, joined places, proposals). EXISTS AND WORKS.
**`/around/manage`**: permanent redirect to settings. EXISTS AND WORKS.

**`/post/[id]`** (78L): whole thread from root, depth cap 3, `?reply=1`
composer intent, privacy-safe not-found. EXISTS AND WORKS.

**`/stories/[id]`** and **`/stories/new`**: story viewer (faces, comments,
more stories, author profile) and composer (only ACTIVE joined places
offered). EXISTS AND WORKS. Stories are signed-in only by middleware because
a view is a write.

**`/u`** (230L people search, GET form, real Follow per row), **`/u/[handle]`**
(245L, agent vs member tab sets decided server-side, nine parallel reads),
**`/u/[handle]/edit`** (full-page editor, unclaimed handles claimable),
**`/u/[handle]/followers`** and **`/following`**. All EXISTS AND WORKS.

**`/profile`** (246L): the account wearing the social header (cover, avatar,
counts when a handle is claimed), two tabs (belongings as grouped rows, own
posts), `RoleSwitcher` sheet reachable via `?switch=<role>`. EXISTS AND
WORKS. **`/profile/setup`** chooser, **`/profile/setup/[role]`** (`owner` |
`professional`, 404 otherwise) mounting `ApplyWizard`, **`/profile/
application`** status surface with reference, seven canonical statuses and
the reviewer's note. All EXISTS AND WORKS.

**`/notifications`** (102L): real rows under RLS, day-grouped, realtime
arrivals, mark-all, per-row `href` deep links; honest signed-out and
unconfigured states (the invented five-notification list is deleted). EXISTS
AND WORKS. Caveat: notification `href`s were written before the side axis;
MK-67 ("notification href side-law") is still open in the ledger, so a stays
notification can land its reader in the wrong shell until `sideOfPath`
covers its target. PARTIALLY CONNECTED to the two-side world.

**`/verification`** (181L): identity flow (`KycFlow`) and status
(`KycStatus`) for owner/professional roles, reading
`agent_verification_checks` under RLS; never shown to renters by any link.
EXISTS AND WORKS.

**`/assistant`** (21L shell + `AssistantChat.tsx` 706L). See section 7.
EXISTS AND WORKS when `ANTHROPIC_API_KEY` is set; designed unconfigured
message otherwise.

**`/bookings`** (194L): real stays grouped by status with the shared cancel
flow, plus the requester's inspection rows, plus a how-it-works strip. The
old invented-bookings branch is deleted and documented. EXISTS AND WORKS.
**`/bookings/[bookingId]/review`** (237L): review a completed stay;
eligibility decided by the database, six designed refusal states. EXISTS AND
WORKS. **`/checkout/[bookingId]`** (408L): hold countdown, `PayPanel`
(wallet or Paystack), `PaymentReturn` verifying `?paid=1&reference=` against
the same settlement function the webhook calls; every non-payable state is a
designed screen. EXISTS AND WORKS (money internals are Agent B's).

**`/inspections`** (128L, new this build): both directions (requester and
lister) merged, tagged by side, Open (REQUESTED, PROPOSED, CONFIRMED) and
Closed (COMPLETED, DECLINED, WITHDRAWN), `?changed=<id>` pulse handed over
from the thread banner. Either read failing fails the whole screen honestly.
EXISTS AND WORKS.

**`/messages`**, **`/messages/[id]`**, **`/messages/new`**: inbox with
search/tabs/compose, immersive thread with `ThreadContextBanner` (three
faces: rental with inspection controls, reservation, booking timeline),
`/messages/new?listing=<id>` bridge that every "Message agent" control uses,
signed-out intent carried through `authHref`. EXISTS AND WORKS (deep dive is
Agent B's).

**Wallet family**: `/wallet` (231L: balance hero, deck, pots, recent strip),
`/wallet/send` and `/wallet/receive` (full pages, this build; prefill via
query params; odometer amount), `/wallet/transactions` and
`/wallet/transactions/[id]` (receipt; RLS is the only ownership check, by
design). All EXISTS AND WORKS (Agent B's depth).

**Settings family**: `/settings` (333L, searchable settings with
`matchSettings`), `/settings/payments` (cards webhook-fed + resolve-verified
bank accounts, this build), `/settings/interests` (same nine cards as
welcome), `/settings/place` (state/LGA/occupation), `/settings/devices`
(SEC-5 session list, honest about not showing location). All EXISTS AND
WORKS. `/legal/privacy` and `/legal/terms` are in-shell copies of the public
documents, noindex. EXISTS AND WORKS.

**Stays side routes** (`/stays`, `/stays/search`, `/stay/[id]`, `/trips`,
`/restaurants`, `/restaurant/[id]`): detailed in section 5.

### 1.5 `agent` console

`AgentShell` chrome with its own rail (`components/agent/`), everything gated
by `getAgentContext()` (RLS-bound read of the caller's `agents` row); a
non-agent gets `ListingPitch`, not a refusal. All verified real reads:

| Route | Status | Notes |
| --- | --- | --- |
| `/agent/dashboard` | EXISTS AND WORKS | Own numbers under RLS, KYC banner, lister inspections |
| `/agent/list` | EXISTS AND WORKS | Seven-step `ListingWizard`, draft restore via `?id=` |
| `/agent/listings` | EXISTS AND WORKS | Every status, actions in `ListingsWorkspace` |
| `/agent/listings/[id]/calendar` | EXISTS AND WORKS | The only writer of `availability_status 'unavailable'` |
| `/agent/inspections` | EXISTS AND WORKS | Lister's viewing queue, two groups |
| `/agent/bookings` | EXISTS AND WORKS | Host bookings board + `ReservationsBoard` |
| `/agent/earnings` | EXISTS AND WORKS | Settled ledger + `PayoutAccounts` |
| `/agent/analytics` | EXISTS AND WORKS | Real analytics; the last ComingSoon stub was filled with real reads, not a demo chart |
| `/agent/messages` | EXISTS AND WORKS | Host framing over the same threads |
| `/agent/reviews` | EXISTS AND WORKS | Guest reviews + host responses |
| `/agent/settings` | EXISTS AND WORKS | Payout accounts, notification toggles |
| `/agent/verification` | EXISTS AND WORKS | Four-rung ladder, next-rung ask |

`components/agent/AgentComingSoon.tsx` still exists but no route was found
mounting it: PLACEHOLDER component, retired in practice
(UNCLEAR-NEEDS VERIFICATION whether any conditional branch still reaches it).

### 1.6 `admin` console (inventory only; Agent B's depth)

`admin/layout.tsx` gates through `requireAdmin()` (`lib/admin/guard`), a real
server check, not a cookie. Twenty-plus pages, each with a `loading.tsx`:
`/admin` (desk), agents, alerts, bookings (+ `[bookingId]`), escrow,
examples, fees, flags, kyc, listings, moderation, money, payments, reference,
reports, social, standing, stops, support, switches. All present as real
files. The HANDOFF_05 additions `admin/businesses` (host review queue) do
**not** exist yet: NOT IMPLEMENTED at snapshot.

### 1.7 Not yet in the tree at snapshot

- `/host/*` (stays operator console): the segment is already protected in
  `middleware.ts` and referenced by `side.constants.ts`, but there is **no
  `app/host` directory**. NOT IMPLEMENTED. Typing `/host` signed-out
  redirects to sign-in; signed-in it 404s. A protected door to a room that
  does not exist.
- Host onboarding wizard (HANDOFF_05 Phase D item 13): NOT IMPLEMENTED.
- `admin/businesses`: NOT IMPLEMENTED.
- `lib/stays/` (queries, twelve-filter search): **the directory does not
  exist** in `apps/web/src/lib` at snapshot, despite migrations M1 to M9
  being applied. BACKEND ONLY (schema) with no read layer.

---

## 2. USER TYPES

Verified from code, not from concept:

**1. Signed-out visitor.** Sees: landing, all `(site)` pages, `/search`,
`/listing/[id]`, `/rent`, `/around` (read), `/u`, `/post`, `/stays`,
`/stay/[id]`, `/restaurants`, `/restaurant/[id]`. Gated per control by
`AuthGate` (`components/auth/AuthGate.tsx`) rather than per page; hearts are
kept on-device (`SaveControl`). Middleware sends them to `/sign-in?notice=
sign-in-required` for product segments.

**2. Signed-in consumer** (default "renter" role). Everything in `(app)`.
Data: own profile row, wallet, saved_items, bookings, conversations,
notifications, inspections (requester side), social profile if handle
claimed. Never asked to verify (`roles.ts`: `requiresVerification` returns
false for renter and "nothing anywhere may special-case around it").

**3. Owner / 4. Professional** (the two setup-able roles,
`components/roles/roles.ts`). **There is no roles table**: role state is
derived entirely from the account's `agents` row (`roleStateFrom`), its
`type` (`individual` | `business`) and the verification ladder. Both roles
verify through `/verification`; both land in the agent console.

**5. Approved agent** (any of the above with an approved `agents` row).
Gains the Agent Mode workspace row (Property side only) and `/agent/*`.
Gate: `getAgentContext()` RLS-bound read, per page; the `nf_mode` cookie
(`lib/mode.ts`) only decides which shell renders, never authorisation.

**6. Admin/staff.** Gains the console row and `/admin/*` behind
`requireAdmin()` (server check backed by a staff-role read; Agent B's
detail). Both workspace rows come from `getShellIdentity`, which resolves
`isAgent`/`isAdmin` from the person's own RLS-bound reads.

**7. Host (stays operator).** Specified in HANDOFF_05 section 5.1 (gated by
`businesses.owner_id` under RLS, never a cookie); `businesses` table exists
(M2 applied) but no route, no console, no onboarding. BACKEND ONLY.

**The three cookies, none of which authorises anything:**
- `nf_mode` (`personal` | `agent`): which workspace shell. `ModeSwitcher`
  (`components/agent/ModeSwitcher.tsx`).
- `nf_side` (`property` | `stays`): which face of the product. `SideSwitch`
  coin + `SideFlip` (`components/app/SideSwitch.tsx`,
  `components/app/flip/SideFlip.tsx`), URL wins via `sideOfPath`.
- Role is not a cookie at all: the `RoleSwitcher` sheet writes nothing but
  navigation and mode.

**What appears missing per role:** the consumer has no way to see "my
inspections as a lister" without being an agent (now solved by
`/inspections` tagging both sides); the owner/professional distinction is
invisible after approval (both are "agent" everywhere); the Host role has a
protected URL and a nav doctrine but no existence; staff have no read-only
mode (Agent B's ground).

---

## 3. USER JOURNEYS

### 3.1 Visitor discovery to money

`/` → `/search` (open, no account) → `/listing/[id]` (open) → then per
market:

- **Save**: heart on card or gallery → signed out it is kept on device and
  replayed after sign-in (`SaveControl.tsx`). No break.
- **Share**: gallery controls → native share sheet, clipboard fallback with
  toast (`ListingActions.tsx`). No break.
- **Message**: every control routes through `/messages/new?listing=<id>`;
  signed out, `authHref` carries the intent through sign-in and back. No
  break. (Historical break, fixed and documented in `messages/new/page.tsx`:
  four of five controls used to dump people on an empty inbox.)
- **Inspection (rental/sale)**: `RentalPanel` → `RequestInspection` sheet →
  real `inspection_requests` row → agent queue → accept/propose in the
  thread (`RentalFace`) → `/inspections`. WORKS end to end as of this build.
  **The journey then dead-ends at money: there is no in-product way to pay a
  yearly rent or complete a sale.** `RentalPanel` renders three steps ending
  in "then pay" and offers no pay control; the rent money path is `A1-001`,
  named in HANDOFF_05 as threaded through the build, and no rent-payment
  surface exists at snapshot. NOT IMPLEMENTED, and it is the biggest missing
  end of the platform's most emphasised journey.
- **Booking (shortlet/hotel)**: `ReservePanel` (dates rail, stay-length
  chips, guest phone, totals in kobo) → `reserve()` → `/checkout/
  [bookingId]` (hold countdown, wallet or Paystack) → `PaymentReturn`
  settlement → `/bookings` and `/trips` (`?justBooked` accent) → post-stay
  `/bookings/[id]/review`. WORKS end to end in code; note the live database
  has 0 bookings, so this loop has never run against production data with a
  real user. UNCLEAR-NEEDS VERIFICATION under real traffic.
- **Table (restaurant)**: `/restaurant/[id]` → `ReserveTable`. The
  reservation row is written, but `reserveTable` creates no conversation, so
  the built `ReservationFace` has no thread to occupy and the confirmation's
  message link opens a plain listing thread (documented in
  `restaurant/[id]/page.tsx`). PARTIALLY CONNECTED. Reservations also do not
  appear on `/trips` (no `getMyReservations` read; `trips/page.tsx` names
  the seam). A booked table is therefore visible nowhere after booking
  except, presumably, the restaurant's own console. **This is the sharpest
  consumer dead-end in the stays flow.**

### 3.2 Sign-up to first value

`/sign-up` → `/sign-up/email` → `/sign-up/verify` (code) or email link →
`/auth/callback` → `/home` → redirect `/welcome` (cards + interests) →
`/home` personalised. Clean; the one confusion risk is that OAuth users skip
`/sign-up/verify` and email users can arrive from either the button or the
code, both handled. No break found in code.

### 3.3 Password recovery

`/forgot-password` → email → `/auth/callback` → `/reset-password` (session
is the ticket; expired/reused links get a plain sentence and a re-request
path; the notice constants in `sign-in/page.tsx` catch the rest). No break.

### 3.4 Agent onboarding to earnings

Nav "Become an agent" (`verified` icon, only for signed-in non-agents on the
Property side) → `/profile/setup` chooser → `/profile/setup/[role]`
(`ApplyWizard`) → `/profile/application` (status, reference, reviewer note)
→ approval (admin side) → `/verification` ladder → `/agent/list` seven-step
wizard (drafts restorable) → publish → `/agent/listings` manage →
`/agent/listings/[id]/calendar` availability → `/agent/inspections` →
`/agent/bookings` → `/agent/earnings` withdraw. Every hop exists. Friction
found: the wizard and the application are two separate multi-step flows with
a review wait between them, and nothing on `/profile/application` estimates
the wait; the earnings page depends on `payout_accounts` which is agent-only
(HANDOFF_05 notes user-scoped `bank_accounts` now exist separately, so an
agent may now hold two bank-account lists in two places:
`/agent/settings` payout accounts vs `/settings/payments` bank accounts.
UNCLEAR-NEEDS VERIFICATION whether these are reconciled anywhere; from the
route code they are separate systems).

### 3.5 The stays flow as of this snapshot

Flip (coin in nav foot) → `/stays` (category doors, stays shelf, tables
shelf, `StaySearchBar`) → `/stays/search` (q, type, dates pair, guests,
sort; the total for the chosen nights as the card headline, computed by the
same arithmetic `reserve()` runs) → `/stay/[id]` → **today always falls
through to the listing page** (see 5.2) → `ReservePanel` → checkout → trips.
The date-park: `/stays/search` carries `checkIn`/`checkOut` in the URL, and
`/stay/[id]` passes them onward through `readStayDates`; the listing-page
fallback then re-collects dates in `ReservePanel` via `StayDatesProvider`.
Where it breaks: nothing dead-ends, but the stay search's twelve-filter
promise is four filters today, restaurants have no hours so "open now" is
deliberately unstated, and a table reservation vanishes from the consumer's
world after confirmation (3.1). `/trips` shows stays only, with the shared
cancel flow (`CancelBookingControl`) and the date spine.

### 3.6 Admin journey

Agent B's scope; noted only that `requireAdmin` gates the layout and every
desk page has real loading states.

---

## 4. PROPERTY EXPERIENCE DEEP DIVE

### 4.1 The card

`components/app/ListingCard.tsx` (688L) + `listing-card-model.ts` (tested).
One card for search, home, rent, saved, stays (with `side="stays"` flipping
the href to `/stay/[id]`). Strict hierarchy: photo, price, place primary;
one quiet facts row; at most one badge (verified), structurally capped. The
Nigerian differentiator (power band + backup) earns the only extra line;
silence renders nothing rather than good news. Money never truncates
(`isGlanceCompact` fraction logic). Press-down prefetch, view-transition
morph into the gallery, save heart + `IntentTune` overlay, floating save
note that never reflows the grid. EXISTS AND WORKS and is the strongest
single component in the product. Weaknesses for the redesign: the photo-less
"information band" variant is comparatively plain; the card carries no
rating on its face (moved off deliberately, but on the Stays side rating is
a primary comparison fact and the card does not vary by side beyond the
href); demo rows carry the `ExampleNotice` disclosure which, at 64 of 64
listings, makes the entire grid read as a specimen case.

### 4.2 Detail page anatomy

`app/(app)/listing/[id]/page.tsx` (1048L). Order, verified in code: media
edge to edge (`ListingGallery` + `PhotoViewerProvider`, frame counter,
floating dark-glass share/save `ListingActions`); one status line
(`StatusPill`, market, rating via `formatRating`); title and place; display
price with what it buys; inline facts run; the move-in total
(`ListingMoveIn`) on rentals; `ListingAbout`; `ListingAmenities`;
`ListingUtilities` (power/water/meter/access, honest about unanswered);
`ListingTenure` (sales); `ListingPhotoGrid`; `TravelTime`; host/agent panel
(`ListingHostPanel`); `ListingReviews` (`getListingReviews`);
`CancellationTimeline` (`lib/trust/CancellationTimeline`); `ReportSheet`;
`RecordVisit` (writes the visit); JSON-LD + metadata via
`lib/listings/syndication` (suppressed for demo rows); `ExampleNotice` on
demo rows.

Right-hand/below action per market: `ReservePanel` (715L: fourteen-day date
rail, stay-length chips priced honestly at 30 nights, guests, phone field,
kobo totals, `reserve()` action, availability from `getBlockedDates`),
`RentalPanel` (169L: no Reserve by design; three steps, `RequestInspection`
control, message CTA, canonical safety wording; also serves sales),
`ReserveTable` (restaurants, also mounted by `/restaurant/[id]`).
`ListingStickyBar` (243L) pins the real total once dates exist, built on the
`ActionBar` primitive, paired actions only where a second action honestly
exists. EXISTS AND WORKS.

**What is missing on the most important screen:** no similar-listings or
"more from this agent" section anywhere in the file (grep confirms); no
map/mini-map of the location (only `TravelTime` text); no price history or
market context; availability is a blocked-dates read, not a visible
calendar, so a guest cannot see *which* dates are free without trying them;
the sticky bar and panels are excellent but the page below the fold is a
long single column on desktop with generous unused width. These are the
clearest design opportunities on the platform.

### 4.3 Save, share, statuses

Save: `SaveControl.tsx` (260L) is the single loop (optimistic, revert on
failure, device fallback for signed-out, cookie mirror so `/saved` renders
server-side). Share: native sheet + `execCommand` clipboard fallback.
Statuses: `StatusPill` + `toneForStatus` map the canonical enums; the
availability calendar's `unavailable` writes come from the agent calendar
only. Verification display: the badge means a human was checked; on the
listing it renders through the status line and the host panel; the tiebreak
in search ranks verified first at equal relevance. All EXISTS AND WORKS.

### 4.4 What feels unfinished or generic (with files)

- The photo-less card band (`ListingCard.tsx` lower half) and every surface
  it fans into (rent list, saved) read flat next to the photographic cards.
- `/rent` (`rent/page.tsx`) is a banner over a filtered grid; visually the
  weakest market page.
- `ListingReviews` renders a list without distribution or summary
  (`components/app/listing/ListingReviews.tsx`).
- No neighbourhood context on the detail page despite `/around` holding
  exactly that data one router hop away; `area_intel` exists as an assistant
  tool (`app/api/assistant/route.ts`) but no listing-page surface reads it.
  This is a ready-made, already-built differentiator not yet mounted.

---

## 5. VALLO STAYS AS OF THE SNAPSHOT

### 5.1 Built and live at snapshot

- **The side axis**: `lib/side.constants.ts`, `lib/side.ts` (cookie
  `nf_side`, `sideOfPath` URL-wins law including `/host`), `SideSync`
  reconciler, pre-paint `data-side` accent (`--nf-side-accent`, depth not
  hue). EXISTS AND WORKS.
- **The flip**: `components/app/flip/SideFlip.tsx` (282L) two-phase 3D flip
  with designed `SideCover` back faces (static brand, never data), direction
  encodes geography, input lockout, live-region announcements, reduced-motion
  crossfade, hard ceiling on a dead connection, first-flip ceremony bounded
  by localStorage. The coin control `SideSwitch.tsx` performs the same
  physics and returns focus after the flip. Probed in headless Chromium per
  the ledger. EXISTS AND WORKS; this is the signature interaction and it is
  finished, not sketched.
- **Nav and dock by side**: `nav-model.ts` (Stays: Stays, Explore stays,
  Feed, Trips replacing Bookings; agent/console rows hidden on Stays),
  `MobileTabBar.tsx` four destinations per side. EXISTS AND WORKS.
- **`/stays`** home (136L): interleaved shelf across `STAY_KINDS` (hotel,
  shortlet, apartment, villa) + restaurants row + `StayCategoryRail` six
  doors + `StaySearchBar`. First light over the existing catalogue, honest
  about it. EXISTS AND WORKS.
- **`/stays/search`** (219L): q/type/dates/guests/sort in the URL, nightly
  vs all-in total decided by whether dates exist, guest capacity never
  excludes a place that declared none. EXISTS AND WORKS for what it claims;
  PARTIALLY CONNECTED to the twelve-filter promise (rating, room type,
  facilities, breakfast, AC, parking, Wi-Fi, verified, free cancellation,
  landmark distance all await the M9 projection read; the page's docstring
  says so and pretends nothing).
- **`/stay/[id]`** (117L + `StayDetailView.tsx` 227L + `RoomTypes.tsx` +
  `detail-model.ts`): the business-grade showcase (gallery, room-type rows,
  rate-plan refusals with reasons, the total as the headline, policy
  verbatim) is **built and tested but dormant**: `readStayDetail()` is a
  named seam that returns `null` unconditionally because `lib/stays/
  queries.ts` does not exist, so every visitor today gets the delegated
  listing page. FRONTEND ONLY (showcase) over BACKEND ONLY (M1 to M5
  schema); the route as a whole EXISTS AND WORKS via the fallback.
- **`/trips`** (88L + `TripSpine.tsx` 227L): date spine, today by shape and
  word, past folded in a `Disclosure`, shared cancel flow, `?justBooked`.
  EXISTS BUT INCOMPLETE: stays only; reservations read (`getMyReservations`)
  named as the missing seam in the page file.
- **`/restaurants`** (56L): first-party shelf, no open-now claims. EXISTS
  AND WORKS (minimal). **`/restaurant/[id]`** (174L): reservation-first
  surface, refuses to guess open-now, states the missing `service_windows`
  read and the missing thread binding in its own docstring. EXISTS BUT
  INCOMPLETE.
- **Thread faces**: `ThreadContextBanner` + `RentalFace`/`ReservationFace`/
  `BookingFace` (structural separation, booking steps from
  `booking_state_events` at read time). EXISTS AND WORKS.
- **Schema**: M1 to M15 applied and probed (ledger section 4), including the
  oversell-gate concurrency probe (M5). M6 (`bookings.listing_id` nullable)
  drafted in `supabase/migrations/pending/`, founder-gated: room-type-level
  bookings cannot exist until it lands. BACKEND ONLY.

### 5.2 Specified in HANDOFF_05 but not built at snapshot

- `lib/stays/**` read layer and the twelve-filter search (BE1 scope; the
  directory is absent). Everything above that names a seam is waiting on it.
- Host onboarding wizard, `host-documents` bucket UI, the three branches and
  ten steps (Phase D item 13); `/host/*` console (Phase E item 17);
  `admin/businesses` queue (Phase E item 18). Middleware and doctrine are
  ready; no pages exist.
- M7 restaurant `service_windows` surfaces (open-now, hours on the page).
- M8 landmarks (founder-gated seed) and M9 `catalogue_entries` projection
  reads: availability-aware merged shelf and the filter drawer for stays.
- Reservations on `/trips`; `reserveTable` thread binding.
- Booking lifecycle jobs (hold TTL sweep, COMPLETED at checkout, NO_SHOW).
- Verified-stay reviews on the stays side; four-locale stays vocabulary
  (MK-68); notification href side-law (MK-67).
- The whole Phase F third-party lane (labels, minimal flow, LiteAPI,
  kill switches): NOT IMPLEMENTED, dark by design, keys founder-gated.
- Two glass marks (restaurant, resort) are commissions; `beach-house`,
  `bungalow` and `concierge-bell` stand in (`components/app/stays/model.ts`).

---

## 6. FEED/DISCOVERY AND SEARCH

### 6.1 The feed (`/around`)

What appears: post cards (author, place chip, body via `PostBody`, media,
mark/repost/reply counts), stories grid where mounted, district chips on a
place, tombstones for removed posts, `AroundFab` for composing, the gear to
`/around/settings`. Loading: per-route `loading.tsx` skeletons. Empty and
error states: three designed states plus the unconfigured sentence
(`around/copy.ts`), and the shared empty anatomy with `/u` (`u/Notice.tsx`,
"one empty-state anatomy" landed this build). Pagination: **server-side
cursors exist (`lib/social/posts-queries.ts` `FeedPage`), the client renders
the first page only; there is no load-more control in
`components/social/feed/Feed.tsx`**. EXISTS BUT INCOMPLETE. Realtime: none
on the feed (notifications have realtime; the feed refreshes via
`router.refresh` after actions).

### 6.2 Search end to end

- Input: plain `TextField` in a GET form on `/search`; no suggestions, no
  typeahead, no spelling help. NOT IMPLEMENTED (suggestions).
- Recents: `RecentStrip` + `SearchMemory` + `lib/search/memory.ts`,
  localStorage, hunts and opened places offered back as chips, clearable.
  EXISTS AND WORKS. Saved searches / alerts: no code anywhere (grep across
  lib/components/app). NOT IMPLEMENTED.
- Filters: `FilterDrawer` full-page with real result counts against the
  candidate pool; `ActiveFilters` chips; `clearedFilters`. EXISTS AND WORKS.
- Sorting: `SORTS` in `lib/listings/search-params.ts`, kobo-integer maths,
  verified-first tiebreak at equal relevance. EXISTS AND WORKS.
- Views: `list` and `map` via `ViewToggle` links; the view is remembered by
  cookie. Map: Leaflet in `MapCanvas`, tiles from `lib/maps/tiles.ts`
  (CARTO free basemaps flagged non-commercial; switches to MapTiler when
  `NEXT_PUBLIC_MAPTILER_KEY` lands, founder decision 5), pins from the
  public `GET /api/map/listings` bounds endpoint (rate-limited, RLS-backed),
  `MapDock` cards with the save loop. EXISTS AND WORKS with the licensing
  caveat. No split/list+map view at any width. NOT IMPLEMENTED (split).
- No-results: designed `EmptyState` with cleared-filter offers. EXISTS AND
  WORKS.
- What the system supports vs displays: the repository supports more than
  the stays search currently exposes (stays search has no drawer), and the
  assistant's `search_listings` tool exposes the same repository a third
  way, so the three search surfaces cannot disagree on inventory.

---

## 7. AI SURFACES

All three surfaces call the Claude API directly over fetch
(`https://api.anthropic.com/v1/messages`); no SDK, no other provider found
(grep across the tree). No keys or env values are reproduced here.

1. **The concierge, `/assistant`** (`app/api/assistant/route.ts`, ~950L;
   UI `components/app/assistant/AssistantChat.tsx`, 706L + sidebar +
   settings sheet). REAL, not mocked: SSE streaming, default model
   `claude-sonnet-5` overridable by `ASSISTANT_MODEL`, max 3 tool rounds,
   1024 max tokens, 24-turn / 8000-char caps, rate limiting per user and per
   IP with a friendly 429 sentence rendered as an assistant bubble. Three
   tools, all reading the same repositories the pages read:
   `search_listings`, `compare_listings` (id-based, not-found entries
   preserved so the model cannot invent), `area_intel` (resident posts,
   truncated and capped). What is sent to the model: the conversation turns,
   formatted catalogue rows (photo URLs deliberately not sent), truncated
   area posts. Without `ANTHROPIC_API_KEY`: a 200 JSON graceful message;
   paused flag honoured. Threads: device localStorage (`nf_ai_threads`) plus
   a server conversation id (`serverId`) when signed in, so history is
   per-device with server append; cross-device history restore is
   UNCLEAR-NEEDS VERIFICATION (no read of server threads found in the chat
   surface). UI: full chat-product shape, streaming bubbles, tappable
   listing cards, tone/language settings sheet. Limitations: escrow sentence
   deliberately excluded from the system prompt; listing hrefs are always
   `/listing/<id>` so an assistant answer taps into the Property shell even
   for a hotel (the side-law has not reached assistant cards).
   EXISTS AND WORKS.
2. **Support summariser** (`app/api/support/route.ts`): same transport,
   default `claude-sonnet-5` via `SUPPORT_MODEL`, tools authorised so "the
   model can only ever see the record of the person it is talking to"
   (`lib/support/tools.ts`), no names or ids in the system prompt. Mounted
   through `SupportChat` on `/settings`. EXISTS AND WORKS (Agent B holds the
   support-desk end).
3. **The Around area bot** (`lib/social/bot-actions.ts`): answers posts in
   an area through the ordinary repository, model from a settings row
   defaulting `claude-haiku-4-5-20251001`, admin-configured (admin/social is
   Agent B's). EXISTS AND WORKS.
4. **Marketing**: `AssistantShowcase` band on the landing page and
   `AiAssistantBanner` on `/home`; both doors, not mocks.

---

## 8. PROFILES AND SWITCHING

- **`/profile`** is "your account wearing your own identity": social header
  (cover + avatar + counts) once a handle is claimed, grouped rows plus own
  posts; honest reduced header when no handle, signed out, or unconfigured.
- **`/u/[handle]`** is the public page; agent-resolvable profiles get
  Properties/Stories/Reviews/Activity tabs, everyone else
  Posts/Replies/Media/Activity, decided server-side with a fallback that
  prefers an absent tab to an empty lie.
- **Avatar/bio/verification display**: editable in place on `/profile` and
  fully on `/u/[handle]/edit`; the agent badge surfaces through the profile
  tabs and the listing host panel, tier computed only by
  `private.agent_tier` (never recomputed client-side, per
  `verification/page.tsx`).
- **Settings entry points**: rail row (signed in), rows absorbed from the old
  header (theme, language), `/settings` search box.

**How switching actually works today, exactly:**
1. **RoleSwitcher** (`components/roles/RoleSwitcher.tsx`, sheet on
   `/profile`, openable via `?switch=<role>`): switches what you are here to
   do among renter/owner/professional; picking a role you lack turns the
   sheet into the setup explainer; picking one you have writes the `nf_mode`
   cookie and navigates.
2. **ModeSwitcher** (`components/agent/ModeSwitcher.tsx`, inside the agent
   workspace): writes `nf_mode`, `router.push` + `router.refresh` in a
   transition; personal ↔ agent.
3. **SideSwitch coin + SideFlip** (new): writes `nf_side` at press, same
   push+refresh recipe, 3D flip choreography; URL-owned routes override the
   cookie and `SideSync` writes it back after a deep link. Agent mode
   belongs to Property; flipping to Stays hides the workspace rows without
   touching `nf_mode`.
Three controls, three questions, three shapes; the doctrine is written into
each file and holds in code. The risk for a redesign: nothing anywhere
teaches a new user that three different switch controls exist, and the coin
lives in the nav foot below the fold of the phone drawer.
UNCLEAR-NEEDS VERIFICATION: whether the coin is discoverable at all without
the first-run flow mentioning it (no onboarding reference to the flip was
found).

---

## 9. SHARING, SAVING, NOTIFICATIONS UI, ONBOARDING, EMPTY STATES

- **Sharing**: `ListingActions` (listing/gallery), `ProfileShare`
  (`components/social/profile/ProfileShare.tsx`), post action sheets; native
  share with clipboard fallback everywhere; `/wallet/receive` shares a
  prefilled `/wallet/send?to=&amount=&note=` request link. EXISTS AND WORKS.
  No referral or invite mechanism exists. NOT IMPLEMENTED.
- **Saving**: one loop (`SaveControl`) across grid, map dock, gallery,
  `/saved`; device fallback; undo chip on `/saved`. `saved_places` for the
  Stays side is M13 schema with no surface yet (BACKEND ONLY).
- **Notifications UI**: bell + real unread badge in the shell header and
  rail (from `getShellIdentity`), `/notifications` day-grouped list with
  realtime arrivals (`LiveNotifications`), per-row deep links, mark-all.
  EXISTS AND WORKS; the side-law gap on hrefs (MK-67) noted in 1.4. Push
  notifications: none (native identifiers are on the stop list).
- **Onboarding/welcome**: `/start` carousel (pre-auth) and `/welcome`
  (post-auth cards + interests). Nothing onboards the flip, the wallet or
  agents.
- **Empty states inventory.** The platform has one deliberate anatomy
  (`EmptyState` in `components/app/Screen.tsx` + `EmptyActions`, and
  `ProfileNotice` now shared across `/u` and the feed). Verified good ones:
  saved, bookings (signed-out and unavailable branches), wallet (signed-out
  refuses to invent a balance), notifications, inbox (`InboxEmpty`),
  inspections, trips (empty and unavailable distinct), stays/restaurants
  shelves, search no-results, review refusal states, application states,
  around unconfigured, careers (no fake vacancies). Verified missing or
  thin: the feed's first-page-only truncation has no "you have reached the
  end" vs "load more" distinction (there is an `ended` flag nobody renders);
  `/saved` for a signed-in user with only device saves does not explain the
  difference between device and account saves on screen
  (UNCLEAR-NEEDS VERIFICATION, `SavedBoard.tsx` not fully read);
  `/u/[handle]` followers/following empty states not individually verified.

---

## 10. GAPS THE FOUNDER DID NOT ASK ABOUT

Each tied to a file; ordered roughly by product damage.

1. **The rent money path does not exist.** `RentalPanel.tsx` promises
   "message, inspect, then pay" and the product cannot take the pay step.
   The whole trust apparatus funnels into an off-platform handshake.
   (A1-001 is named in HANDOFF_05 but no surface exists.)
2. **A reserved table disappears.** No consumer surface lists reservations:
   not `/trips` (seam named in `trips/page.tsx`), not a thread
   (`restaurant/[id]/page.tsx` documents the missing binding).
3. **The feed cannot page.** `Feed.tsx` takes `initial` only; the cursor in
   `posts-queries.ts` dies unread. A healthy community would make the tab
   look broken after ~one page of history.
4. **Marketplace of specimens.** 64 of 64 listings are demo rows; every
   grid, shelf and detail carries `ExampleNotice`. The redesign should be
   planned against the day the disclosure disappears, but also styled so a
   catalogue of examples does not undermine the launch product.
5. **`/host` is a locked door to nowhere.** `middleware.ts` protects it,
   `side.constants.ts` claims it for Stays, no route exists; signed-in it
   404s.
6. **No retention loops.** No saved searches or alerts (grep-verified), no
   price-drop or new-in-area notifications, no push, no email digests found
   in the app tree; recents are the only memory (`lib/search/memory.ts`).
7. **No similar listings / no location map / no visible availability
   calendar on `/listing/[id]`** (section 4.2), and no neighbourhood
   context despite `area_intel` existing for the assistant.
8. **Assistant and notifications ignore the side law.** Assistant cards
   hard-code `/listing/<id>` (`lib/assistant/protocol.ts`); notification
   hrefs predate the axis (MK-67 open). Hotels open in the Property shell
   from both.
9. **Two bank-account systems for one agent.** `payout_accounts`
   (`/agent/earnings`, `/agent/settings`) beside the new user-scoped
   `bank_accounts` (`/settings/payments`); no reconciling surface found.
10. **Performance smells in code**: `/rent`'s sequential per-row
    conversation lookup (`rent/page.tsx`); `around/settings` fires eight
    parallel reads on every visit (acceptable but heavy); `home` +
    `search` are `force-dynamic` with multi-read fan-outs on every hit
    (deliberate, but they are the two hottest pages).
11. **Map tiles are on a non-commercial licence until the MapTiler key
    lands** (`lib/maps/tiles.ts` warns; founder decision 5). Launch
    blocker outside anyone's code.
12. **i18n edges**: `roles.ts` copy, `RoleSwitcher` strings and the stays
    vocabulary (MK-68) live outside the four-locale dictionary;
    `components/app/untranslated.ts` exists as a tracked IOU.
13. **Client error observability is a console.error** (`app/error.tsx`
    names Sentry as future). A visual redesign session will have no field
    data on which broken states real users actually hit.
14. **Discoverability of the three switchers** (section 8): the product's
    signature interaction has no first-run introduction.
15. **Stale meta-documentation**: `KNOWN_GAPS.md` is dated 2026-08-09 and
    still claims sales are zero per cent modelled while `ListingTenure`,
    sale pricing and the sales branch of `RentalPanel` ship; a future
    session reading it first will mis-plan. (This file exists precisely to
    avoid repeating that.)
16. **Accessibility**: genuinely strong baseline (live regions on the flip
    and saves, reduced-motion collapse of all duration tokens, shape+word
    never colour alone on the trip spine, 44px targets via `nf-icon-btn`).
    Unverified areas: keyboard operation of the Leaflet map
    (`MapCanvas.tsx`), the photo viewer, and the drawer focus trap.
    UNCLEAR-NEEDS VERIFICATION, browser-level testing needed.

---

## HONESTY LOG: what this report could not verify

- **Nothing was rendered.** No dev server, no browser, no screenshots; every
  claim is from reading source. Visual judgements ("reads flat") are
  inferences from structure, not from pixels.
- **The concurrent build session is landing code while this snapshot was
  read.** Files may already differ from what is described; the ledger's
  queue (FE-4 through FE-7, BE items) implies `lib/stays`, host wizard,
  `admin/businesses` and restaurant hours may land within hours.
- **No database access was used.** Row counts (64 listings, 0 bookings,
  6 profiles, 75 tables) are quoted from `docs/BUILD_05_LEDGER.md`, not
  re-verified. Migration behaviour (RLS, triggers, the oversell probe) is
  taken from the ledger's probe records.
- **Signed-in behaviour has never been rendered by any session** (ledger
  section 1); everything behind auth is verified as code paths only.
- **Not read line-by-line**: the full bodies of `search/page.tsx` (772L),
  `listing/[id]/page.tsx` (1048L), `AssistantChat.tsx` (706L),
  `ReservePanel.tsx` (715L), admin pages, `ApplyWizard`, `ListingWizard`,
  `StoryViewer`, `MapCanvas` (only headers and targeted greps); their
  docstrings are unusually reliable in this codebase but are still
  self-reports.
- **UNCLEAR-NEEDS VERIFICATION items**, gathered: `AgentComingSoon` reachability;
  assistant cross-device thread restore; payout vs bank account
  reconciliation; `/saved` device-vs-account explanation; followers/following
  empty states; map/photo-viewer keyboard access; the booking money loop
  under real traffic.
- **Deliberately not covered** (other agents' scopes): wallet ledger
  internals, Paystack webhooks, admin desk behaviour, RLS policy audit,
  token sheet, icon system, imagery, motion CSS internals.
