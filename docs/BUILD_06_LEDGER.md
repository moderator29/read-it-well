# Build 06 ledger: the true face

**The working ledger of the HANDOFF_05 third-edition build session, opened
18 September 2026 at `3355128` on main.** `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`
(third edition) is the brief and it is law, PART ONE backend and PART TWO
frontend; `docs/DESIGN_DIRECTION.md` is the whole law of the frontend sweep;
`docs/design/CATALOGUE.md` maps every reference image; `docs/HANDOFF_04_MARKETPLACE.md`
section 13 binds every worker. `docs/BUILD_05_LEDGER.md` records what the
retired session landed. This file records this session's scopes, its queue,
what landed with its commit, the probes, the screenshot proofs, the pitches
taken, and what needs the founder.

---

## 0. The rules, restated (every worker restates these before starting)

1. Zero em dashes anywhere: code, copy, docs, commits. British spelling.
2. Money is integer kobo as bigint; `Math.round(naira * 100)` only at the
   input boundary; display only through `formatMoney` from `@vallo/i18n`;
   never float, never hand-divide.
3. The platform charges no fees anywhere in copy; a processor's cut is
   labelled as the processor's.
4. Every server action returns the `ActionResult` envelope; sessions come from
   `resolveSession()`.
5. `BrandIcon` and `UiIcon` only; no `strokeWidth` on UiIcon, no `ramp` on
   BrandIcon; tiers never mix in a row.
6. 390px first, in dark, then wider, then light. A finding that only works in
   dark is half a finding.
7. Dark is the default and the OS does not override it. Light is a designed
   paper twin, no blue-tinted greys.
8. One blue family. Emerald success, rose error, bright cyan pending and
   attention. No orange, amber, gold, purple, violet, magenta, ever. A new
   accent is a new depth of blue. (Gold stars in the renders ship blue.)
9. No raw colours, no raw spacing; use the scale or extend it; never disable
   a lint rule to land a change.
10. Motion is physics, not decoration; named curves in one system;
    `prefers-reduced-motion` turns it all off and the product stays complete;
    one ambient animation per viewport; nothing loops for its own sake.
11. Escrow is promised nowhere until it operates.
12. First-party trust is sacred: the verified badge only ever means a human
    was checked; partner inventory is labelled, never dressed as first-party.
13. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
    Colour is never the only signal.
14. The brand is Vallo. VALLO SPACES LTD appears only on legal surfaces.
15. No dark patterns: no fake scarcity, no manufactured urgency, no fake
    social proof, no invented counts.
16. Never log or paste a NIN, document number, card number, bank account or
    personal data into logs, reports or documents.
17. Secrets live in the environment and Vault, nowhere else.
18. Never say committed, pushed, tested, verified, compliant or done unless it
    is true. Report what was not done, unprompted.
19. The ONE LAW decides done: UI action, validated server action, database
    write surviving RLS, UI showing the new reality, the notification the
    event deserves, a test proving it. A screen with no write path is a half.
20. The standard is not "does it work". It is "would a funded design team
    have shipped this, and would someone screenshot it to show a friend".

**The stop list, absolute:** merchant-of-record exposure or any float;
spending money or new paid vendors; destructive database operations (drops,
data-losing migrations, revokes); git history rewriting; remote branch
deletion; native app identifiers; `HANDOFF_01` legal ground; writing test rows
to live product tables; relaxing `messages.sender_id`; rendering any partner
row before the label and the fulfilment-honest CTA exist; wallet or saved
cards anywhere in the third-party flow; scraping the CAC portal or anything
else; Amadeus; **plus the third edition's two:** never ship an image asset
without compression and sizing through `next/image`, and never let a
reference image's off-brand detail (warm hue, baked text, garbled copy,
invented counts, the yearly-rent-with-nightly-pickers logic error) into the
product. M6 and the landmark seed stay drafted in
`supabase/migrations/pending/` until the founder's word.

**The design law in one line:** the reference images are the target; match
composition, hierarchy, glow, glass depth, spacing rhythm and mood through
the token system; translate the renders' mistakes per `DESIGN_DIRECTION.md`
section 1.3; every surface without an image inherits the register; control
shape follows the governing image (pills where it shows pills, the 14px
control law amended, see section 8); no glowing border around the real
viewport; every surface closes only with the side-by-side screenshot in
section 6.

**Agent contract:** agents never run git; strict written file scopes in
section 2; a finding outside your scope is a line in your report, not an
edit; the lead re-audits and commits everything; no success report is
believed without the lead's verification; verify with the narrow command
(`npx tsc --noEmit -p apps/web`, `npx vitest run <file>`, `npx eslint <paths>`,
`node apps/web/scripts/check-css-tokens.mjs`) until a phase closes; every
worker restates the rules and the stop list in its first report.

---

## 1. Baseline, recorded 18 September 2026 at `3355128`

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0 (i18n and web) |
| `npm run lint` | exit 0, 638 warnings and 0 errors (exhaustive-deps, anonymous default exports, arbitrary font sizes); css tokens clean, 25 partials |
| `npm run test` | exit 0, 63 files, 1597 tests |
| `npm run build` | exit 0 (Next 16.2.12, Turbopack; middleware-to-proxy deprecation warning) |

Live database (Supabase MCP, project `uccixoonmbhrnyczyigt`), read only:
64 listings (all `is_demo`), 64 `catalogue_entries`, 0 `listing_photos`,
0 accommodations, 0 accommodation photos, 0 businesses, 0 room types,
0 bookings, 0 reservations, 0 landmarks, 69 posts, 6 profiles, 7
conversations. Listing shapes: 16 apartments, 16 homes, 8 shortlets, 8
rentals (terraces), 3 villas, 3 land, 3 offices, 3 shops, 2 hotels, 2
restaurants. No `.env` is committed; the lead wrote an untracked
`apps/web/.env.local` carrying only the public Supabase URL and the
publishable anon key so the dev server renders the real signed-out catalogue
for screenshots. Nothing signed-in can be rendered until the seeded login
lands, so every signed-in surface is proven through the dev-only preview
harness at `app/(dev)/preview/*` (section 5) and, once the login lands,
re-proven live.

**B0 audit of `73e284e`** (the unread money commit): recorded in section 7
before any work built on it.

---

## 2. File scopes (non-overlapping, written before anything starts)

Paths are under `apps/web/src/` unless they start with `packages/`,
`supabase/`, `scripts/`, `docs/`, `.github/` or `apps/web/public/`. A scope
owns creation, edits and deletion inside it and nothing outside it.
**Shared CSS partials (`app/css/*.css` not listed under a worker) and
`packages/design-tokens/` are the lead's:** a worker who needs a new token
or a change to a shared class defines it inside its own partial, scoped
under its surface's root class, and reports it; the lead promotes it.
`packages/i18n/src/locales/*.ts`: any worker may ADD keys with the Edit tool
only, inside its own namespace object, in all four locales, never
reformatting the file. `app/(dev)/preview/<worker>/**` is each worker's
own screenshot harness (section 5).

**LEAD:** `components/app/{AppShell,AppRail,NavTree,nav-model,MobileTabBar,AutoHideDock,SideSwitch,SideSync,PageHeader,Screen,ScreenSkeleton}.tsx`,
`components/app/flip/**`, `app/side-nav.css`, `app/globals.css`,
`app/css/{side-flip,chrome,theme,glass,light,base,buttons,chips,controls,motion,animation,ambient,utilities,typography,overlays,symbols,touch,data-saver,fonts}.css`,
`app/layout.tsx`, `app/(app)/layout.tsx`, `middleware.ts`,
`packages/design-tokens/**`, `packages/i18n/**` (structure), `scripts/**`,
`apps/web/public/brand/**`, `lib/listings/scene-photographs.generated.ts`,
`supabase/migrations/pending/**`, `docs/**`, `RECOMMENDATIONS.md`,
`app/(dev)/gallery/**`, `app/(dev)/preview/{layout,page}.tsx`,
`app/(dev)/preview/_fixtures/**`, `app/(dev)/preview/lead/**`.

**F1 (chrome satellites, first run, auth, home, notifications, assistant):**
`app/(auth)/**`, `components/auth/**`, `app/welcome/**`,
`components/app/welcome/**`, `app/(app)/home/**`, `components/app/home/**`,
`components/app/{AiAssistantBanner,SceneBanner,PageScene,IntentTune}.tsx`,
`app/(app)/notifications/**`, `app/(app)/assistant/**`,
`components/app/assistant/**`, `app/css/auth.css` (new),
`app/css/home.css` (new), `app/(dev)/preview/f1/**`.

**F2 (landing and marketing shell):** `app/page.tsx`, `app/(site)/**`,
`components/site/**`, `lib/site/**`, `lib/platform-stats.ts`,
`app/css/landing.css` (new), `app/css/site.css` (new),
`app/(dev)/preview/f2/**`.

**F3 (catalogue and stays):** `app/(app)/search/**`,
`components/app/search/**`, `components/app/filters/**`,
`components/app/{ListingCard,MediaFrame,SaveControl,MediaFrame}.tsx`,
`components/app/listing-card-model*.ts`, `app/(app)/listing/**`,
`components/app/listing/**`, `app/(app)/rent/**` (except `rent/pay/**`),
`app/(app)/stays/**`, `components/app/stays/**`, `app/(app)/stay/**`,
`app/(app)/trips/**`, `app/(app)/restaurants/**`, `app/(app)/restaurant/**`,
`app/(app)/checkout/**`, `app/(app)/bookings/**`, `components/app/bookings/**`,
`app/(app)/saved/**`, `app/css/{explore,map}.css`,
`app/css/catalogue.css` (new), `app/(dev)/preview/f3/**`.

**F4 (social and identity):** `app/(app)/around/**`, `app/(app)/post/**`,
`app/(app)/stories/**`, `app/(app)/u/**`, `app/(app)/profile/**`,
`components/social/**`, `components/app/account/**`,
`app/(app)/settings/**` (except `settings/payments/**`),
`app/social.css`, `app/social-feed.css`, `app/settings-rows.css`,
`components/app/{EmptyActions,ReportSheet,Disclosure}.tsx`,
`app/(dev)/preview/f4/**`.

**F5 (conversations and operations):** `app/(app)/messages/**`,
`components/app/messages/**`, `components/app/threads/**`,
`app/(app)/inspections/**`, `components/app/inspections/**`,
`app/(app)/verification/**`, `components/verification/**`, `app/agent/**`,
`components/agent/**`, `app/host/**` (new, the Host wizard on `lib/host`),
`components/host/**` (new), `app/admin/{layout,page,loading,error}.tsx`,
`app/admin/_components/**`, `app/admin/{listings,agents,kyc,moderation,reports,support,social,standing,stops,switches,flags,fees,escrow,examples,reference,businesses}/**`,
`app/css/threads.css` (new), `app/css/admin.css` (new),
`app/css/agent.css` (new), `app/(dev)/preview/f5/**`.

**E (enhancement worker; opens on the money and crypto surfaces, then
re-audits every closed frontend scope):** `app/(app)/wallet/**`,
`components/app/wallet/**`, `app/(app)/settings/payments/**`,
`components/app/payments/**`, `components/app/ResultSheet.tsx`,
`app/(app)/crypto/**` (new), `components/app/crypto/**` (new),
`app/css/wallet.css` (new), `app/css/crypto.css` (new),
`app/(dev)/preview/e/**`. In re-audit mode E edits only inside the closed
scope it is auditing, on the lead's written handoff line in section 3, and
never two workers in one directory at once.

**BA (B1 + B4, lifecycle jobs):** `app/api/cron/**` (new), `lib/cron/**`
(new), `lib/bookings/lifecycle.ts` (new), `lib/bookings/lifecycle.test.ts`,
`vercel.json` (cron schedules), `supabase/migrations/2026091*_b4_*.sql`,
`scripts/probes/**`. M6 and the landmark seed stay in
`supabase/migrations/pending/` (lead-owned) until the founder's word; BA
prepares the apply-day checklist as a report line, nothing more.

**BB (B2 + B3, stays read layer and the consumer dead-ends):** `lib/stays/**`,
`lib/reservations/**`, `lib/social/posts-queries.ts`, `lib/social/posts-actions.ts`,
`lib/rent/**` (new: the in-product rent payment step, actions, schema, tests),
`app/(app)/rent/pay/**` (new route), `lib/bookings/queries.ts`,
`supabase/migrations/2026091*_b2_*.sql`, `supabase/migrations/2026091*_b3_*.sql`,
`lib/notifications/**` if it exists, else the notification writes in its own
files. B0 item 1 (the demo-reservation hole) and B0 item 2 (reservation
threads) are BB's first two items.

**BC (B5, the security layer):** `lib/security/**`, `lib/wallet/actions.ts`,
`lib/bookings/checkout.ts`, `lib/payments/**`, `lib/messages/**`,
`app/api/paystack/**`, `app/api/yellowcard/**`, `lib/admin/audit*.ts`,
`app/admin/audit/**` (new), `lib/alerts/**` (new), `lib/host/**`,
`lib/admin/business-*.ts`, `lib/saved/**`, `.github/**`,
`supabase/migrations/2026091*_b5_*.sql`.

**BD (B6 + B7, the crypto proxy and admin enrichment):** `app/api/crypto/**`
(new), `lib/crypto/**` (new), `lib/admin/{money,payments,bookings}-*.ts`,
`lib/admin/queries.ts`, `lib/admin/schema.ts`,
`app/admin/{money,payments,bookings,alerts}/**`,
`supabase/migrations/2026091*_b7_*.sql`.

### 2.1 Contracts between scopes (written so nobody waits)

- **Stays search.** BB exports from `lib/stays/search.ts`:
  `StaySearchParams` (twelve filters: `rating`, `roomType`, `facilities[]`,
  `breakfast`, `ac`, `parking`, `wifi`, `verified`, `freeCancellation`,
  `nearLandmark` + `withinKm`, `priceMin`/`priceMax` in kobo, `location`,
  plus `checkIn`, `checkOut`, `guests`, `cursor`) and
  `searchStays(params): Promise<StaySearchPage>`. F3 consumes both; until BB
  lands, F3 builds against the existing `listStaysShelf` and the type.
- **Reservations on trips.** BB exports `getMyReservations()` from
  `lib/reservations/queries.ts` returning the `TripSpine`-ready shape
  (`id`, `listingId`, `listingTitle`, `reservedFor`, `partySize`, `status`,
  `conversationId`). F3's `/trips` renders it.
- **Feed paging.** BB exposes `loadMoreFeed(cursor)` as a server action in
  `lib/social/posts-actions.ts`; F4's `Feed.tsx` calls it from a load-more
  control and an intersection sentinel.
- **Rent payment.** BB builds `lib/rent/` (the payable rent charge riding
  `lib/bookings/checkout.ts`'s wallet and Paystack paths through the
  existing `payWithWallet`, `payWithSavedCard`, `startCardCheckout`
  shapes) and the route `app/(app)/rent/pay/[inspectionId]`; F3 links the
  listing's move-in ledger and the rental thread face to it through
  `/rent/pay/<inspectionId>`; F5 places the entry on the rental thread face.
- **Crypto.** BD serves `GET /api/crypto/markets?vs=ngn&per=50&page=1`
  (rows: `id, symbol, name, image, price, change24h, marketCap, sparkline7d[]`),
  `GET /api/crypto/coins/[id]` (`id, symbol, name, image, price, change24h,
  change7d, marketCap, volume24h, high24h, low24h, description, chart7d[]`),
  `GET /api/crypto/pairs?network=eth&query=` (GeckoTerminal top pools:
  `address, name, baseSymbol, quoteSymbol, priceUsd, change24h, volume24h,
  dex`), every response `{ ok: true, data, cachedAt }` or
  `{ ok: false, reason: "unconfigured" | "rate_limited" | "upstream" }`.
  E builds the surface against this contract with a designed dark
  unconfigured state.
- **Blocks in messaging.** BC enforces blocks in `lib/messages/` (send and
  thread-open refuse across a block, both directions); F5 shows the refusal
  through the existing envelope.
- **Cron alerting.** BA writes every job outcome through BC's `lib/alerts/`
  writer (`recordAlert({ kind, severity, detail })` into `risk_alerts`);
  BD's `app/admin/alerts` reads them.
- **Photos.** The lead files the reference photography as compressed assets
  under `apps/web/public/brand/photos/<name>.jpg` (and `.webp`) with the
  catalogue's canonical names, and the eight scene plates under
  `apps/web/public/brand/scenes/<scene>.jpg` so the existing manifest wires
  them. F3 attaches them to the demo listings through the `listing_photos`
  seeding path BB writes (a demo seed carrying public paths, reversible by
  `is_demo`), and BB's demo stays seed carries the hotel-room, resort and
  restaurant plates.

---

## 3. The queue (each worker always has its next scope written)

**LEAD:** L1 the ledger, the env, the asset pipeline (photos and scenes
compressed and named), the CSS partial stubs and their imports, the preview
harness shell; L2 the B0 audit of `73e284e`; L3 the five-slot dock, the
in-app header (hamburger, lockup, bell, avatar), the drawer as the designed
surface with the coin at its foot; L4 the flip restyled to
`GOVERNING-flip-mid-turn.png`; L5 re-audit and commit every scope as it
closes, screenshot proofs into section 6; L6 HANDOFF_06 and the close-out.

**F1:** sign-in and the auth family to `55A56F21` on the aurora plate;
welcome and first run to `2A49E2F7` (the two worlds and the coin, the
"HOTEL" text never copied); home masthead and rails in the register with the
location chip and the photo cards; notifications in the register; the AI
assistant to `BF49B814` (inline listing cards, suggestion chips, thinking
state). Preview pages under `preview/f1`.

**F2:** the landing to the two GOVERNING landing images, desktop first then
390px: glass nav, villa hero plate, overline breadcrumb, gradient headline,
two CTAs, city chips, the floating search pill with Buy / Rent / Stay /
Invest, the floating verified card, the stats band (honest counts only,
from `lib/platform-stats.ts`), the feature grid, feature chip row, community
band with layered cards including one honest Third party tag, How Vallo
Works, category tiles on the photo plates, the Stays band, the app band, the
footer with newsletter; then the `(site)` pages pulled into the register.

**F3:** search results and the filter sheet to `3EB3E2A9`; listing detail
to `9E8B56ED` (canonical rent detail, move-in framing, thumbnail strip from
`7B5335E0`), the move-in ledger to `9F384CFE`; stays home to `FD3DFE84`;
stay detail to `BB0C2C85` and `84054CE9`; stay search on BB's twelve
filters; trips with reservations; restaurants with hours and open-now;
checkout and bookings in the register; saved; MediaFrame and ListingCard
carrying real photographs.

**F4:** the feed to `GOVERNING-feed-plus-bloom.png` including the + bloom
exactly (Post, Story, Review on a curve, spring physics, reduced-motion
fallback, wired to the real composers: post composer, story composer, the
review path); post threads, stories, places inheriting; profile to
`50E032EA` (cover, avatar, counts, Belongings / Posts tabs, the rows, the
role switch); edit profile and followers inheriting; settings home to
`7F96BE6C`.

**F5:** messages to `GOVERNING-chat-booking-card.png` with real forwardable
listing and booking cards (share a listing or a booking into any thread,
stored as a message attachment kind, rendered as the card); the rental face
to `9E06F51C`; the three faces as one family; inspections to `F6A8A482`;
the agent console in the register; the Host wizard on `lib/host`; the admin
queue reference to `278CC66A` at 390px and `CDA4B82B` at desktop with all
desks inheriting.

**E:** wallet home to `6AF37222`; send money to `95840448`; receive,
transactions and receipts in the register; `/settings/payments` to the
payment-methods block of `7F96BE6C`; result sheets with the marks; the
Crypto surface in the register (never `213F6F47`'s gold and orange) on BD's
proxy with the dark unconfigured state; then re-audits as scopes close.

**BA:** hold TTL sweep releasing inventory; COMPLETED at checkout time;
NO_SHOW recording and its notification; the nightly inventory drift sweep;
every job under `app/api/cron/*` guarded by `RECONCILE_CRON_SECRET`, on
`vercel.json` schedules, reporting through `lib/alerts`; probes.

**BB:** B0 item 1 the demo-reservation hole; B0 item 2 reservation threads
(`reserveTable` opens the reservation thread with the M10 context);
`getMyReservations`; the feed cursor consumed; the twelve-filter search;
`readStayDetail` awake on a demo stays seed (a demo business, its
accommodations, room types, rate plans and photos, all `is_demo`); the rent
payment step; restaurant hours and open-now on `service_windows`.

**BC:** rate limits on fund, send, withdraw, charge saved card, checkout;
blocks enforced in messaging; webhook and cron failure alerting into
`risk_alerts`; the audit-log reader and viewer; CI on push; host
verification rungs completed; `saved_places` surfaces on the Stays side.

**BD:** the crypto proxy (CoinGecko markets, coin detail; GeckoTerminal
pools) with caching, rate limits, the key from env, the honest unconfigured
state; admin enrichment: reservation oversight chip, drift surfacing in
alerts, the refund console, the payment-method lookup panel.

---

## 4. Landed (commit-tied, updated as it lands)

| What | Commit |
| --- | --- |
| The ledger, the rules restated, the baseline, the partial stubs, the preview harness shell | `1656781` |
| The founder's photography as product assets: twenty plates compressed and named under `public/brand/photos/`, the eight scene plates wired through the manifest | `1c97d71` |
| The B0 audit verdict | `d9e313d` |
| The chrome: five-slot labelled dock with More opening the drawer, the header with hamburger, lockup, bell and avatar on every in-app page, the drawer from the left as the designed surface, the coin card, the Crypto row, `Messages` as the row's name | `6e2e2ac` |
| The flip's lit rim, glass back pane and mark-first cover; the lockup on the wordmark asset; the lead's preview pages | (next) |

---

## 5. The preview harness

`app/(dev)/preview/*` is a dev-only route family (404 in production, like
`(dev)/gallery`) that renders the real components with fixture props so a
signed-in surface can be screenshotted in this sandbox, which has no
session. Fixtures live in `app/(dev)/preview/_fixtures/` (lead) and are
brand-neutral: invented names are the catalogue's fictional ones, never a
real brand, never a real person. Each worker adds its own pages under its
own folder. The harness never ships as a feature and is not the proof of
the ONE LAW; it is the proof of the LOOK. Screenshots are taken with
`node scripts/verify-shots.mjs --base http://localhost:<port> <route>` at
390px, dark, then `--light`.

Each worker runs its own dev server: `NEXT_DIST_DIR=.next-<worker> npx next dev -p <port>`
from `apps/web` (F1 3101, F2 3102, F3 3103, F4 3104, F5 3105, E 3106, lead
3100).

---

## 6. Screenshot proofs (a scope closes only with its row here)

| Surface | Governing image | Shot | Verdict |
| --- | --- | --- | --- |
| Side drawer, open, signed in | `BCD39CA8` | `docs/design/proofs/lead/drawer-390-dark.png`, `-light.png` | Reads as the render: user card with lit avatar ring, handle, View profile capsule; glyph rail rows with chevrons, badge counts; WORKSPACE section; the FLIP COIN card with the coin in a lit ring; the theme row beneath. Differences by rule: no Home/Explore/Feed rows on the phone (they are the dock's, founder ruling 3), no VALLO SPACES LTD footer (rule 14), the theme row states its destination rather than a switch. |
| Five-slot dock | feed, profile, wallet renders (bottom bar) | `docs/design/proofs/lead/dock-390-dark.png`, `-light.png` | One glass slab, brand rim and base glow, five glyph-and-word slots, active slot on a soft brand pill with a glow, unread dot on Profile. Five slots by the founder's ruling where the renders show four. |
| Flip, mid-turn | `GOVERNING-flip-mid-turn.png` | `docs/design/proofs/lead/flip-mid-turn-390-dark.png` | The turning pane carries a bright rim and a two-rung bloom, the glass building mark is the cover's whole subject, the dimmed dock shows through the glass. The name, brand line and miniature stay beneath the mark for the first-flip ceremony and the wait; the render has the mark alone. |

---

## 7. Probes and audits

**B0, the audit of `73e284e` (saved-card charging in checkout and the admin
business desk), read line by line by the lead before any work built on it.
Verdict: SOUND ON THE MONEY, INCOMPLETE ON THE WIRING, two idempotency
holes.** What holds: `chargeSavedCard` reads the card under the owner's RLS
and refuses another person's card, refuses a non-integer or non-positive
amount, is rate limited (10 per 10 minutes), never retries a decline, marks a
not-reusable card through the service role so a browser cannot flip it back,
audits both outcomes and falls back once to the hosted checkout under the
same reference. `payWithSavedCard` reuses `guardPayable` (already-paid check,
cancelled check, feature flag) and writes the same PENDING attempt row the
hosted path writes, so the webhook settles both identically and a replay
collides on `provider_ref`. The admin desk's five decisions run under the
admin's own session (m02 and m03 carry `*_admin_all` policies, so the RLS
posture is right), write `audit_log` and notify the owner; `publishAccommodation`
refuses without a pin, a photo and a rate. What does not hold: (1) the
commit message says the checkout screen was built against this shape, but
`checkout/[bookingId]/page.tsx` renders `<PayPanel view={view} />` with no
`savedCards` and no `chargeSavedCard`, so the saved-card path is unreachable
from the product (handed to F3); (2) `fundWalletWithSavedCard` has no UI
caller (handed to E) and, like `fundWallet`, no idempotency wrapper, so a
double submit charges twice (handed to BC); (3) `payWithSavedCard` opens a
new idempotency scope keyed on a per-attempt client key, so two concurrent
attempts on one booking both pass the guard and both charge; a per-booking
in-flight subject is needed (handed to BC); (4) `publishAccommodation`
ignores the error of the follow-on `businesses` update (minor, BC's file).
No money moved wrongly in any path read; the holes are double-charge holes,
not loss holes, and every charge is refundable through the processor.

---

## 8. Pitches and amendments taken into the build

1. **The control radius law is amended** on the founder's identical-to-images
   ruling: where a governing image shows a capsule (city chips, filter
   chips, the bloom lozenges, segment toggles, the Get Started button on
   welcome), the product ships the capsule; `--nf-radius-pill` carries it;
   rectangles stay where the render shows rectangles (cards, fields, the
   dock, the feature tiles).
2. **The dev preview harness** (section 5), so that the look of every
   signed-in surface can be proven here rather than believed.

---

## 9. Needs the founder's word

1. The seeded login (asked once at the start).
2. `COINGECKO_API_KEY` when he has it (the surface ships dark and honest
   until then).
3. M6 (`bookings.listing_id` relaxation, the transition guard,
   `booking_state_events`) and the landmark seed (M8): drafted, applied only
   on his word.
4. Inherited from BUILD_05: the four `private` tables the advisor flags;
   MapTiler key before launch; LiteAPI and Booking.com for Phase F.
