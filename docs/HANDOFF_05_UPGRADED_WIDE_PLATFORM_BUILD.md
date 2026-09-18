# HANDOFF 05: the upgraded wide platform build, second edition

**The two-side platform.** This file entirely supersedes the first edition
(archived at `docs/archive/HANDOFF_05_FIRST_EDITION_2026-09-18.md`) on the
founder's direct ruling of 18 September 2026. The change of direction, in his
own frame: not a hybrid app with hotels mixed into the property feed, but one
product with **two complete sides** the user flips between. Same account, same
wallet, same backend; two frontends. His supply ruling, refined later the same
day: **first-party onboarding is the primary supply, built new style, and
third-party inventory from the partner APIs returns beside it as a clearly
labelled lane**: a small calm "Third party" tag on every API-sourced row, a
deliberately minimal booking flow for those rows, and the full multi-step
Vallo flow reserved for what is listed with us. The old hybrid UI is not
restored; the lane is rebuilt new-style against the stays schema, with the
vault as salvage. Stays operators who list with us are called **Hosts**
(property-side listers stay Agents), and their onboarding is industry-grade:
CAC, identity, resolved bank accounts, admin review.

**Read this as a revival, still.** The money core is sound, the design system
just went through two sprints, the research is done twice over. This is not
building from scratch and it is never allowed to feel like it, even though the
face of the product changes more here than in any build before it.

Written 18 September 2026 by the planning session, which wrote no product
code on purpose. The evidence base, and the first hour's reading, is now four
research files:

- `docs/research/TWO_MODE_FRONTEND_RESEARCH.md` (the flip, the shell, the
  surfaces; file-level precision)
- `docs/research/TWO_MODE_BACKEND_RESEARCH.md` (live schema ground truth, the
  M1 to M13 migration sequence, threading, inspections, payment methods)
- `docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md` (the stays schema in
  full field detail; still authoritative where the two-mode files defer to it)
- `docs/research/API_INVENTORY_RESEARCH.md` with `docs/API_INVENTORY.md`
  (integrations and costs)
- `docs/research/HOST_ONBOARDING_RESEARCH.md` (how the industry onboards
  properties, the Nigerian regulatory reality, the Vallo Host ladder, the two
  booking flows specified, the filter set reconciled)

`docs/HANDOFF_04_MARKETPLACE.md` remains the charter and its section 13 rules
bind every worker in this build. Where the first edition of this file
disagrees with this one, this one wins everywhere.

---

## 0. The mission

**Vallo is one product with two faces.** The **Property side**: rentals,
sales, agents, inspections, the app that exists today, upgraded. The **Stays
side**: hotels, serviced apartments, guest houses, resorts, shortlets, and
restaurants. One account, one wallet, one messages inbox, one trust system,
one backend. A person flips between the sides with one control and the whole
app turns over. On the Stays shelf, what is listed with Vallo sits beside
partner inventory that is honest about what it is, so a search for
Lagos-with-dates answers with everything and never lies about anything. The
slogan stands: **Real Estate reimagined!**

The standard, unchanged and binding: **would a funded design team have
shipped this.** Not "does it work".

---

## 1. First hour, no exceptions

1. `git pull origin main`. The parallel sprint session is retired on the
   founder's word: read `docs/SPRINT_60_B.md`, fold its unfinished items into
   this build's own plan, then move the ledger to `docs/archive/` marked
   absorbed. This session is the only one running
2. Read, in order: `docs/HANDOFF_04_MARKETPLACE.md` (charter and rules), the
   two `TWO_MODE_*` research files in full, then
   `docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md` sections 2 and 3 for
   the schema field detail, `docs/research/HOST_ONBOARDING_RESEARCH.md` in
   full, `docs/API_INVENTORY.md`, `RECOMMENDATIONS.md` section 0, then
   `docs/BRAND_MARKS.md`, `docs/HANDOFF_03_FRONTEND.md` and
   `docs/FRONTEND_REVAMP.md` for the visual law
3. Run and record the baseline: `npm run typecheck`, `npm run lint`,
   `npm run test`, `npm run build`
4. **Ask the founder once, at the start, for the seeded login.** Nothing
   signed-in has ever been rendered by any session; it remains the
   highest-leverage gift he can give a build
5. Confirm which founder decisions from section 10 have his word. Only one
   migration in the whole build is gated on him; everything else starts now

---

## 2. The two-side architecture, the law

The full design with every file path is `TWO_MODE_FRONTEND_RESEARCH.md`
sections 1 and 2 and `TWO_MODE_BACKEND_RESEARCH.md` section 1. The binding
decisions:

- **The side is a cookie, an exact structural twin of the proven workspace
  mode.** New `lib/side.constants.ts` (`nf_side`, `"property" | "stays"`,
  default property) and server-only `lib/side.ts` with `getSide()`, carrying
  the same doctrine as `mode.ts` word for word: **a view preference, never an
  authorisation**. `nf_mode` (personal or agent) is a different axis and is
  not touched.
- **No user-level side column exists anywhere in the database.** One
  profiles row, one wallet (balances stay derived), one notifications feed
  serve both sides. This is live-verified; do not add one.
- **Hybrid resolution: the cookie decides the shell, side-owned URLs force
  their side.** One function, `sideOfPath(pathname)`: `/stays`, `/stay/`,
  `/restaurants`, `/restaurant/`, `/trips` are stays; `/agent/`, `/listing/`,
  `/rent` are property; everything shared returns null and the cookie
  decides. A shared hotel link opens in the Stays shell regardless of the
  recipient's cookie, and a tiny `<SideSync>` client component reconciles the
  cookie after such a deep link. **The URL wins over the cookie, always**,
  including notification taps.
- **`(app)` does not split.** One consumer route group; the server layout
  resolves the side and passes it into `AppShell`, which computes the
  effective side from the path, so first paint is correct with no hydration
  flash. New stays routes live inside the group: `/stays`, `/stays/search`,
  `/stay/[id]`, `/restaurants`, `/restaurant/[id]`, `/trips`. `/home` and
  `/search` remain the Property roots; their URLs do not change meaning.
- **What keys off the side:** `buildNav` (Property model unchanged; Stays
  model: Stays, Explore stays, Feed, Trips replacing Bookings), the tab bar's
  four destinations, search defaults, card emphasis, and the accent.
- **Accent by depth, never by hue.** `--nf-side-accent` inside the one blue
  family, exactly as the token file's own `--nf-mode-*` note prescribes. Set
  pre-paint on `<html>` by the same inline-script pattern the theme already
  uses. Warmth on the Stays side comes from imagery and the glass objects,
  never a new colour.
- **Agent mode belongs to the Property side.** Its nav rows render only
  there; `/agent/*` resolves to property. The Stays business console (hotel
  or restaurant operator) is a later `/host/*` sibling gated by its own
  RLS-bound read, and nothing in this build blocks it.
- **The switcher is a coin, in the nav foot, above ThemeToggle.** It shows
  the OTHER side's name and glass mark. It is not the ModeSwitcher, not the
  RoleSwitcher, not a settings Switch: three controls, three questions,
  three shapes.

## 3. The flip, the signature interaction

The founder's brief: the switch should feel like *"a ring turning to another
side or me turning my phone back"*. Full choreography in
`TWO_MODE_FRONTEND_RESEARCH.md` section 3. The binding decisions:

- A **two-phase CSS 3D flip with a designed back face**: press-lift
  (`--nf-duration-fast`), then a Y-axis rotation of the lifted viewport card
  (`--nf-duration-deliberate`, `perspective`, both faces
  `backface-visibility: hidden`). The back face is a **side cover**: canvas
  navy, the incoming side's glass mark and name, accent glow. Static brand,
  no data, so the flip never races the network; only the reveal into the
  real page waits, on the cover's quiet shimmer if it must.
- The cookie write and `startTransition(router.push + router.refresh)` fire
  at press, the exact recipe `ModeSwitcher` already ships.
- Rotation direction encodes geography: property to stays turns one way,
  back the other, so the two sides read as two faces of one object.
- **Reduced motion**: opacity crossfade, no rotation, same input lockout,
  same live-region announcement. Input is shielded from press to settle.
- No dependency on `startViewTransition` (it may decorate the reveal where
  supported, never carry the structure). The CSS lands in the same change as
  the component that triggers it; `motion.css`'s post mortems are the law.
- First-ever flip may run one beat longer as a bounded ceremony
  (localStorage with try/catch); every later flip is standard timing.

---

## 4. What the research established, so nobody re-learns it

- **The Stays catalogue half-exists already.** `ListingKind` covers hotel,
  shortlet, serviced apartment, restaurant; `lib/reservations/` (reserve,
  respond, cancel, Lagos-timezone schema) and `lib/bookings/` (checkout,
  settlement, `getMyBookings`) are live; `/checkout/[bookingId]` already
  serves stay bookings. The Stays side is largely new pages over existing
  data plus the new business-grade schema, not a new backend.
- **The live database ground truth** (all live-verified): 75 public tables,
  RLS on all 75. `inspection_requests` has a six-state trigger-guarded
  machine and an indexed nullable `conversation_id` that nothing populates
  yet, and **sends zero notifications today**. `conversations` are two-party
  and listing-bound with no context column. `bookings` has the full status
  enum and the GiST no-overlap exclusion but **no transition-guard trigger**.
  No saved-card storage exists anywhere; `payout_accounts` is agent-only and
  withdrawals mint and discard a Paystack recipient every time.
- **The one notify primitive** is `private.notify()` via AFTER triggers;
  every new notification in this build goes through it unchanged.
- **The supply posture**: the first-party stays core stands unchanged from
  the marketplace research (businesses through cancellation_policies,
  restaurants, landmarks, catalogue projection, Postgres-first search) and
  ships FIRST. The partner lane (MK-33 to MK-42, the vault salvage) returns
  as **Phase F**, after the first-party core holds: labelled third-party
  rows, the minimal flow, Model 1 commission only. Until Phase F the
  simplifications hold on the shipped code: `source` defaults
  `'first_party'`, fulfilment defaults `'vallo'`, no dedupe pass and no
  provider race in the first search; but the columns and enums are created
  wide enough that Phase F is additive. ADR-015 commits the day the first
  partner row can render, not before.
- **PostGIS 3.3.7 is installed and live**; the search verdict (FTS +
  `pg_trgm` + PostGIS, no engine) stands.
- **The is_demo law**: only `listings` and `agents` carry `is_demo` today
  and all 64 listings are demo rows. Every new table carries the discipline
  from its first migration, never retrofitted.
- **The number one risk is unchanged and now central**: Nigerian supply is
  first-party, so the onboarding consoles are not a nice-to-have, they are
  the supply itself.

---

## 5. The build order

Migration detail M1 to M13 is `TWO_MODE_BACKEND_RESEARCH.md` section 5.5;
field detail is the marketplace research sections 2 and 3; register entries
are MK-01 to MK-68 as consolidated in `RECOMMENDATIONS.md` section 0. Every
migration is mirrored into `supabase/migrations/`, applied, then probed
(insert as a test user, read back under RLS, exercise the trigger).

**Phase A, the shell flip (frontend-led, starts immediately, blocks on
nothing):**
1. `side.constants.ts`, `side.ts`, `sideOfPath`, `AppShell` effective side,
   `data-side`, the pre-paint script, `--nf-side-accent`
2. `SideSwitch` coin in the nav foot, `SideFlip` and its CSS, reduced-motion
   fallback, the lockout, the cover faces
3. `buildNav` and `MobileTabBar` by side; the six stays route shells with
   their `loading.tsx` skeletons; `middleware.ts` gains `trips`
4. `/stays` home and `/stays/search` first light over the EXISTING catalogue
   (hotel, shortlet, serviced, restaurant listing kinds render on day one,
   so the flip lands somewhere real immediately)

**Phase B, the schema spine (backend-led, in parallel):**
5. M1 enums and `cancellation_policies`; M2 `businesses`; M3
   `accommodations` and photos and amenities (MK-01, MK-02, MK-08, MK-09,
   MK-10)
6. M4 `room_types`, `units`, `rate_plans`, `rate_calendar` (MK-03 to MK-06)
7. M5 `room_inventory` and the reserve and release functions with **the
   two-concurrent-taps oversell probe. Nothing above this is real until this
   holds** (MK-07)
8. M6, **the one founder-gated migration**: the bookings extension, the
   `listing_id` relaxation, the transition-guard trigger and
   `booking_state_events` in the same migration, `notify_booking_change`
   taught accommodation titles (MK-12, MK-13). M7 to M11 do not depend on
   M6; a slow answer blocks room bookings only

**Phase C, the systems the founder named (either worker as scopes allow):**
9. M10 thread contexts: `context_kind` defaulted `'listing'`, nullable
   `reservation_id` and `booking_id` FKs, the CHECK, partial uniques, the
   party-validation trigger. `messages.sender_id` is NOT relaxed; booking
   steps interleave from `booking_state_events` at read time; all six
   existing message actions must pass byte-identical
10. The `ThreadContextBanner` slot in `ThreadView`, the single fork point:
    rental (inspection card and controls), reservation (state pill, the chat
    inside the reservation), booking (steps timeline, contact channel opened
    lazily from the booking, no inspection tooling structurally). Inbox rows
    gain a context glyph; thread links obey the URL-wins side law
11. Inspections finished: `requestInspection` stamps `conversation_id`;
    accept, propose, decline and accept-proposed wired into the thread via
    the EXISTING actions; the consumer `/inspections` page (Property nav
    row) with **Open** (REQUESTED, PROPOSED, CONFIRMED) and **Closed**
    (COMPLETED, DECLINED, WITHDRAWN) sections; M11's notify trigger so every
    transition finally notifies; the optional `outcome` column
    ('inspected', 'deal_done', 'no_deal') written only at COMPLETED
12. M12 payments: `payment_methods` (webhook-only inserts, signature-keyed
    upsert, owner RLS, soft delete, 3DS fallback never retries silently) and
    user-scoped `bank_accounts` (resolve-verified names structural, cached
    `recipient_code`, `payout_accounts` untouched plus its additive
    recipient_code). The `/settings/payments` surface: cards and bank
    accounts in the settings grammar, the withdraw sheet's confirmation
    pattern everywhere, then "pay with saved card" on checkout and funding

**Phase D, stays for real:**
13. The **Host onboarding wizard** completable in one sitting (MK-20,
    MK-25), built exactly to `HOST_ONBOARDING_RESEARCH.md` section 3: the
    three branches (individual shortlet host, registered business,
    restaurant), the ten steps as data on the `kyc.ts` pattern, CAC number
    entry with format validation, identity documents to a private
    `host-documents` bucket, resolve-before-save bank accounts, the three
    separate consents, photos and the required pin (MK-55), then the
    `admin/businesses` review queue and the four post-live verification
    rungs (identity, registration, payout name match, on-site) on the
    existing rung-as-row machinery. Go-live gates on completeness plus
    admin approval; the slow checks gate the badge and payouts, never the
    shelf
14. Stay detail `/stay/[id]` as the showcase: gallery edge to edge, room
    types as rows, rate-plan sheet, dates and guests, the total as the
    headline, policy in plain words (MK-44, MK-46); `/trips` re-homing
    `getMyBookings` plus reservations
15. M7 restaurants: profiles, service windows, the `business_id` branch,
    open-now discovery, the reservation flow landing in its thread
    (MK-27 to MK-32)
16. M8 landmarks (founder approves the one-page seed list), M9 `unaccent`
    and the `catalogue_entries` projection with its rebuild function, then
    availability-aware search and the merged shelf (MK-43, MK-45, MK-48,
    MK-51 to MK-54)

**Phase E, consoles, admin, flywheel:**
17. Host console for stays operators on the QueueFilters frame:
    reservations queue, calendar and availability, bulk pricing, revenue
    over the existing ledger (MK-21 to MK-24); staff seam noted (MK-26)
18. Admin expansion per the backend research section 7: `admin/businesses`
    queue (new page, chips from the reused status enum), accommodation
    review at the publish gate, restaurant chip, reservation oversight on
    the bookings desk, drift into `admin/alerts`, refunds into
    `admin/money` on ResultSheet, payment-method lookup into
    `admin/payments`. No new admin architecture: new page, chip, or panel,
    nothing else
19. Booking lifecycle jobs: hold TTL sweep, COMPLETED at checkout, NO_SHOW
    recording and its notification (MK-14, MK-17); M13 `saved_places` when
    Saved ships on the Stays side
20. Verified-stay reviews on COMPLETED bookings, host responses (MK-59,
    MK-61); money observability and cron alerting before the job count
    grows (MK-65, MK-66); notification href side-law fixed before stays
    surfaces ship, consolidation trailing (MK-67); four-locale stays and
    restaurant vocabulary (MK-68)

**Threaded through every phase, not appended:** `A1-001` (the rent money
path), section B money safety, `W-3`/`W-5`/`W-6` (the wallet is the
financial heart of both sides), `N-4`, `M-1`, CI type generation
(`A2-064`/`P-5`).

**Phase F, the third-party lane (after the first-party core holds, and
dark until keys land):**
21. Restore the inventory layer new-style per the salvage map: registry,
    kill switches, the 2.5 second budget, `places_cache`,
    `partner_stay_intents` and the prebook-revalidate route, everything
    against the stays schema, zero keys required and zero visible change
    (MK-33 to MK-36)
22. The **"Third party" label** on every partner card and detail surface,
    small and calm, plus the fulfilment-honest CTA, before any partner row
    ever renders; the badge structurally impossible on partner rows
    (MK-37, MK-38, MK-58); ADR-015 committed the same day
23. The **minimal third-party flow** per `HOST_ONBOARDING_RESEARCH.md`
    section 4.4: live price revalidated at open, what is included, the two
    honesty moments ("provided and fulfilled by a Vallo travel partner";
    "your money goes to them, not to your Vallo wallet"), one continue
    action into the LiteAPI whitelabel checkout on a Vallo-branded
    subdomain, wallet and saved cards never appearing in this flow,
    commission recorded as referral revenue, the trips surface showing
    "booked with partner" honestly and never faking a Vallo booking row
24. Provider health in admin, freshness policy per source, the partner
    image hosts decision executed (MK-39 to MK-41); the day-one checklist
    when LiteAPI keys land: Lagos and Abuja coverage counts recorded before
    any density claim in copy, confirmation-email identity verified,
    whitelabel steps walked, refund mechanics recorded. Booking.com Demand
    stays display-plus-honest-handoff unless the deeper Search-Look-Book
    permission is ever contracted

### 5.1 The Hosts

Stays operators are **Hosts**; the word Partner is reserved for third-party
API inventory so the two can never blur. The Host console grows at `/host/*`
as the agent console's sibling, gated by `businesses.owner_id` under RLS and
never by a cookie. The guest-facing verification ladder is four rungs shown
as dated facts (a real person with ID; the business registered with CAC and
matching; money flowing to an account in their own resolved name; somebody
from Vallo stood in the property or saw it live), with licence and hygiene
attestations rendered as dated facts beside it, never as the badge. CAC
verification is manual admin review against the free CAC public search in
v1, recorded as a rung with a date and reviewer; the Dojah or Smile ID
business lookup upgrades it behind the `IdentityProvider` interface when
contracted, and the CAC portal is never scraped. TIN is optional and never
blocks. No NIHOTOUR gate exists.

### 5.2 The two booking flows, the law

**First-party (Vallo fulfils):** the full flow. Dates, guests and room with
the total as the headline; guest details; pay by wallet, saved card or
fresh checkout with the Host's business name on the pay sheet and honest
settlement wording; confirmation with the policy restated; the booking
timeline in its thread. **Third-party (partner fulfils):** the minimal flow
of Phase F item 23, and nothing more. The two flows never borrow steps from
each other: adding steps to third-party is dishonest friction, removing
steps from first-party is a banned half implementation.

### 5.3 The filter set

The founder's search promise, all twelve filters: price, rating, location,
room type, facilities, breakfast included, air conditioning, parking,
Wi-Fi, verified property, free cancellation, distance from landmark. Eight
have schema homes ready (ac, parking and wifi are already seeded amenity
codes). Four additive fixes ship with M9's projection so the shelf can
filter: `rating_avg` and `rating_count` on `catalogue_entries` maintained
by the review triggers, a `room_types.category` enum beside the free-text
name, a trigger-maintained `has_breakfast` shelf flag, and
`cancellation_policies.is_free_until_hours` with a `has_free_cancellation`
shelf flag. Detail table: `HOST_ONBOARDING_RESEARCH.md` section 5. The
verified filter is structurally first-party-only. Every result shows the
total price and what is included; nobody opens five hotel websites to find
out.

---

## 6. The frontend law, and the pitch clause

Everything in HANDOFF_03, FRONTEND_REVAMP, BRAND_MARKS and the first
edition's section 4 stands: glass where it earns its place, one glow scale,
one radius law, motion is physics, 390px dark first then wider then light,
cards honest and calm, no AI slop, the banned list binding. Additions for
this build:

- **The flip is the product's signature.** It gets the polish budget a
  flagship feature deserves and it is finished, not sketched: cover faces
  designed, direction law kept, reduced motion honoured, announced to
  assistive tech
- **Each side is fully itself.** The Stays side is warmer and more
  photographic, the Property side stays architectural; both inside the one
  token system, told apart by depth and imagery, never by a new hue
- **Two glass marks are missing and are a commission, not a blocker:**
  restaurant and resort (`hotel-sign` is banned, text in pixels). Interim
  marks are named in the frontend research; file the commission through
  `scripts/icon-manifest.mjs` per BRAND_MARKS section 6
- **The pitch clause, from the founder directly:** this handoff is the base
  and it is law, but the builder is expected to *think of more ideas, more
  insane good frontend stuffs*, and pitch small cool additions into the
  build as it goes: seed list in `TWO_MODE_FRONTEND_RESEARCH.md` section 7
  (fifteen, each already bounded by a house rule). The bar for pitching in:
  small, on-system, reversible, never blocking a phase item, and recorded
  in the ledger like any other work. Big ideas go to the founder as
  questions, not code

---

## 7. Founder decisions

**Assumed, already ruled by him or the charter:** the two-side architecture
itself; first-party supply primacy with the labelled third-party lane as
Phase F; the Third party label and the two-flow law; Hosts as the name;
Model 1 money posture (no new custody, no float; Model 2 stays a gated
decision); additive-only migrations; Postgres-first search; the badge never
diluted and never on a partner row.

**Waiting on his word:**

1. **M6: `bookings.listing_id` relaxed to nullable.** The one non-additive
   change, on the money path's table, so room bookings ride the one spine
   instead of a rival one. Everything else proceeds while he decides
2. The seeded login (ask in the first hour)
3. The landmark seed list, one page to approve (M8)
4. The four `private`-schema tables the advisor flags: confirm non-exposure
   or authorise RLS
5. MapTiler key funded before launch (`M-1`)
6. The `outcome` column on completed inspections: recommended, zero-cost to
   skip in v1 if he prefers
7. **LiteAPI sandbox key, then the whitelabel subdomain** (e.g. a
   book.vallo domain), when Phase F approaches; the lane builds dark
   without them
8. **Booking.com Demand application**: managed-partner paperwork takes
   time, so start it early if he wants that inventory; display plus honest
   handoff is the approved posture
9. Partner hotel photos at Phase F: proxy through Vallo, or named CDN
   hosts in CSP; the old wildcard stays closed either way
10. Still parked, decide nothing now: Google Places, Amadeus (stays dead),
    Paystack DVA, KYC contracts (Dojah or Smile ID business lookup upgrades
    CAC verification when he contracts one), push identifiers

---

## 8. The APIs and what they cost

The first-party core needs **almost no new money**: PostGIS and FTS are in
the database already paid for; Paystack is live and covers saved cards
(`charge_authorization`) and transfers on existing rails; MapTiler is a
licensing item; Resend and Supabase are in place; CAC verification is free
in v1 (the public search, human-reviewed). Phase F brings the partner-lane
items (LiteAPI commission model, Booking.com contract, RateHawk) and they
cost nothing until keys are requested. The NEXT wave
(Termii SMS, Apple $99, KYC contracts, Paystack DVA) is unchanged in
`docs/API_INVENTORY.md`; every figure still requires provider confirmation
and the founder adds all keys personally. One new confirmation this build
does need before shipping saved cards: Paystack's `charge_authorization`
semantics (same-email requirement, no-3DS-challenge behaviour) verified
against their live documentation, recorded in the ledger.

---

## 9. How this session runs

**Fully autonomous, two agents maximum plus the lead**, on the
sprint-proven contract: strict non-overlapping written file scopes; a
finding outside your scope is a line in your report, not an edit; agents
never run git; the lead re-audits and commits everything; nobody's success
report is believed without verification; everybody restates HANDOFF_04
section 13 before starting.

The natural split for this scope: **one agent on the shell and surfaces**
(phases A and D, the flip, the thread banners, the payments surface), **one
agent on the spine** (phases B and C's migrations, actions and triggers),
**the lead** on migrations-and-probes review, integration boundaries, admin,
i18n and docs trail, and synthesis. Adjust by evidence, not preference.

**The stop list, short and absolute:** merchant-of-record exposure or any
float; spending money or new paid vendors; destructive database operations;
git history rewriting; remote branch deletion beyond credentials; native app
identifiers; anything touching `HANDOFF_01` legal ground; writing test rows
to live tables (ask for the seeded account instead); relaxing
`messages.sender_id`; rendering any partner row before the label and the
fulfilment-honest CTA exist; putting the wallet or saved cards anywhere in
the third-party flow; scraping the CAC portal or anything else; Amadeus.
Everything else: decide, build, verify, record, keep going.

**No half implementations, the banned sentences stand**, two new ones
included: "two-mode added" with a toggle that just filters a feed, and
"flip built" without the reduced-motion path and the lockout. Every feature
closes the ONE LAW loop: UI action, validated server action, database write
surviving RLS, the UI showing the new reality, the notification the event
deserves, a test proving it. **Never say committed, pushed, tested or done
unless it is true; report what was skipped, unprompted.**

---

## 10. Repository hygiene carried into this build

- The branch clicks are the founder's: `docs/BRANCH_AUDIT.md` holds the
  fourteen Delete verdicts with recovery SHAs and the sixty-second UI path
- The Claude-authorship history rewrite stays a gated, separate operation:
  only after every parallel session has closed and only on the founder's
  explicit word; the shape is documented in the audit file
- Superseded documents move to `docs/archive/` when their replacement
  lands, never deleted; this file's first edition is already there

---

## 11. Deliverables and the definition of done

1. The flip live and finished: both sides, both themes, 390px first,
   reduced motion honoured, deep links obeying the URL-wins law
2. The schema spine of phase B built, probed and green: mirrored
   migrations, the reserve function surviving the concurrency probe
3. The three thread contexts rendering their three faces on one messages
   engine, with every pre-existing message action passing unchanged
4. Inspections whole: accept in the thread, the `/inspections` page with
   Open and Closed, notifications on every transition
5. `/settings/payments` shipped: saved cards and bank accounts end to end,
   webhook-fed, confirmation-patterned
6. The Host onboarding wizard and its verification ladder shipped to the
   law, CAC review running in the admin businesses queue; the stay detail
   page as the showcase; restaurants reserving into their threads
7. The consoles and admin queues operating on the QueueFilters frame
8. The third-party lane built new-style and dark: label and honest CTA
   ready, kill switches off, zero keys, ready to light the day the founder
   lands credentials, with the day-one checklist waiting
9. `RECOMMENDATIONS.md` maintained as the one register: MK entries closed
   with commits as they land, old rows normalised inline
10. **`docs/HANDOFF_06.md` for the next session**: what Vallo is now, what
    was implemented and verified, every schema and API change, what remains
    with file-level precision, credentials still missing, the rules carried
    forward. An execution document, not a farewell note
11. A close-out to the founder in his language: short, honest, nothing
    padded, what needs his word listed plainly

**The final outcome, read out loud before starting:** a person flips the
app like a coin and it becomes a different product that is still
unmistakably Vallo; they find a home on one side and book a weekend on the
other with the same wallet; an agent accepts an inspection inside the chat
and the deal closes on a page built for it; a hotel owner fills in their
property in one sitting; a restaurant takes a table and the conversation
lives inside the reservation; saved cards and bank accounts sit in settings
like the product was always a fintech; the database refuses to oversell the
last room even when two thumbs tap at once; and the next session opens a
handoff instead of an excavation. Build it.
