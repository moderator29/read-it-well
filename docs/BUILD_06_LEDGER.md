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
21. BORN LOCKED, NEVER BORN PUBLIC. Supabase ships
    `alter default privileges ... grant all on functions to anon,
    authenticated`, so EVERY function created in this estate is reachable at
    `/rest/v1/rpc/<name>` the moment it exists. So every migration that
    creates a `SECURITY DEFINER` function revokes EXECUTE from `anon` and
    `authenticated` IN THE SAME MIGRATION, and grants it back only to the
    roles that genuinely need it, and the probe proves the revoke rather than
    assuming it. The founder's rule, from the day the security advisor found
    two trigger functions sitting as public endpoints because one of them had
    simply been created that morning. A revoke of a grant the function was
    born with is not the stop list's kind of revoke: it removes nothing
    anybody ever legitimately had.
22. THE AUTH SCREEN IS DARK IN BOTH THEMES, PERMANENTLY. The founder's
    ruling, and it is closed: sign in, sign up and the first-run screens keep
    the dark register whatever the OS or the theme control says, because that
    screen sets the register for a money product and every serious one does
    this. It is not waiting on an asset and it is not reopened. A light ink
    wordmark is still needed for the surfaces that are genuinely white, email
    headers, receipts and PDFs, the store listing and print; until that render
    exists those surfaces use the TEXT wordmark, never a filtered version of
    the photographic one, because an ink version of a photographic render is
    a new render and not a filter.

**The stop list, absolute:** merchant-of-record exposure or any float;
spending money or new paid vendors; destructive database operations (drops,
data-losing migrations, revokes); git history rewriting; remote branch
deletion; native app identifiers (STILL ABSOLUTE for every worker: the one
change ever made to them, `ng.vallo.app` to `com.vallospaces.app` on
19 September, was made by the lead on the founder's explicit word while no
store record existed, and that window is now shut); `HANDOFF_01` legal ground;
writing test rows
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
section 1.3; every surface without an image inherits the register; **A
CONTROL THAT CARRIES TEXT IS A ROUNDED RECTANGLE ON `--nf-radius-control`
AND NEVER A CAPSULE**, with only an avatar and a bare icon-only control
staying round, and a control with no governing image taking the rectangle
(section 13, and it WITHDRAWS the amendment in section 8 that let an image
bend this; that amendment was granted on a reading the image does not
support); no glowing border around the real viewport; every surface closes
only with the side-by-side screenshot in section 6, taken from a PRODUCTION
server, because `next dev` does not hydrate reliably on this box.

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

**LEAD:** `components/app/{AppShell,AppRail,NavTree,nav-model,MobileTabBar,AutoHideDock,SideSwitch,SideSync}.tsx`,
`components/app/flip/**`, `app/side-nav.css`, `app/globals.css`,
`app/css/{side-flip,chrome,overlays,fonts}.css`, `design-system/brand/**`,
`app/layout.tsx`, `app/(app)/layout.tsx`, `proxy.ts`, `lib/app/**`,
`packages/i18n/**` (structure), `scripts/build-reference-plates.mjs`,
`scripts/build-scene-manifest.mjs`, `scripts/verify-shots.mjs`,
`apps/web/public/brand/{photos,scenes}/**`, `lib/listings/scene-photographs.generated.ts`,
`supabase/migrations/pending/**`, `docs/**`, `RECOMMENDATIONS.md`,
`app/(dev)/preview/{layout,page}.tsx`,
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

### 2.0 The five bounded frontend workers (added on the founder's word, two works each, then they stop)

The lead hands these paths out of its own scope. Each worker's changes are
ADDITIVE: new variants, new rungs, new names; never a rename or a removal of a
class, token or export that another worker is standing on.

**G1 (the primitives):** `components/ui/**`,
`components/app/{Screen,ScreenSkeleton,PageHeader}.tsx`,
`app/css/{buttons,chips,controls}.css`, `app/(dev)/preview/g1/**`.
Work 1: Button, Chip, Segmented, Field, Switch, StatusPill to the renders'
control shapes (capsule chips and segments, the glass secondary button, the
settings render's toggle, the on-palette status pills, the field with its
glyph). Work 2: Sheet, Skeleton, Table, Progress, ActionBar, PageHeader and
Screen to the register (the filter sheet's glass panel and grip, the pinned
action bar with its glow, the admin table's dense rows).

**G2 (the glass objects):** `assets/icons/**`, `assets/icon-pack/**`,
`apps/web/public/brand/glass/**`, `design-system/icons/BrandIcon.tsx`,
`scripts/{cut-icon-ground,icon-manifest,name-icon-objects,slice-icon-sheets,build-icon-vectors}.mjs`,
`docs/ICON_SYSTEM.md`, `app/(dev)/preview/g2/**`. Work 1: crop from the
reference renders every glass object the catalogue names as missing and that
carries no baked text (the naira wallet, the hotel-with-palms stays mark, the
coin, the calendar with grid, the shield-check, the headset, the sparkle, the
location pin, the bell, the card, the bank), alpha-key them through the
existing pipeline, file them with lowercase-hyphen names. Work 2: their light
twins, the manifest, the BrandIcon names, the docs, and a preview sheet
showing every new object on the four grounds.

**G3 (tokens, glass, light, ambient):** `packages/design-tokens/**`,
`app/css/{glass,light,theme,base,typography,motion,animation,ambient,utilities,symbols,touch,data-saver}.css`,
`app/(dev)/gallery/**`. Work 1: the token amendments the direction asks for
(the radius law amended with the capsule recorded, new glow rungs, glass
depth rungs, the lit-rim recipe) with their light twins, and the gallery
updated to show the register. Work 2: the ambient layer: an aurora variant
on the `bg-blue-wave` plate behind app sections, the section glow
discipline, reduced motion, and the one-ambient-per-viewport audit across
the product as a report.

**G4 (system pages and store posture):** `app/{not-found,error,loading}.tsx`,
`app/(app)/error.tsx`, `app/offline/**`, `app/(app)/legal/**`,
`app/manifest.ts`, `apps/web/public/pwa/**`,
`scripts/{build-pwa-screenshots,build-native-icons,build-web-icons}.mjs`,
`docs/MOBILE_READINESS.md`, `app/(dev)/preview/g4/**`; `capacitor.config.ts`
read only (native identifiers are on the stop list). Work 1: the system
pages (error, not found, offline, loading, the in-app legal reader) in the
register. Work 2: the store posture: manifest colours and icons to the
register, the PWA screenshot set regenerated from the new surfaces, the
safe-area and Capacitor audit, MOBILE_READINESS rewritten to what is true.

**G5 (emails and metadata):** `lib/email/**`,
`scripts/{build-auth-emails,build-og-image}.mjs`, `AUTH_EMAILS.md`,
`app/opengraph-image.png`, `app/{robots,sitemap}.ts` and `sitemap.test.ts`,
`lib/listings/sitemap.ts`, `app/(dev)/preview/g5/**`. Work 1: the auth and
transactional emails in the register (dark ground, the lockup, the glass
card, the blue CTA, plain-text twins), rebuilt through the existing script.
Work 2: the OG image on the villa plate with the lockup, per-route metadata
sanity, the sitemap covering the stays and restaurants routes.

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

**The founder's ruling of 19 September:** the nine second stints, cut off
by the session limit, were relaunched from the tree with a state note on
what each had already landed. When these stints have reported and been
committed, the team drops from nine to four. The founder is sending the
frontend bugs the build missed as text in the session; the lead checks
each against the tree and routes the fix to the owning scope (or fixes it
directly when it is chrome), and every fix ships with its proof.


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
| The flip's lit rim, glass back pane and mark-first cover; the lockup on the wordmark asset; the lead's preview pages | `9fd7af3` |
| `middleware.ts` becomes `proxy.ts` (Next 16), the rail's coin card tightened | `17556f4` |
| The desktop screenshot harness `scripts/verify-desktop.mjs` | `fb4e182` |
| The dock pill takes the side accent (seed 3) | `92da8b1` |
| A missing translation can no longer break the build (the English fallback) | `776ba64` |
| The fifteen workers' first stints, committed by the lead after the container restart killed every worker (the tree typechecked clean, linted clean, passed 1,895 tests and built): F1 `f82c4ff`, F2 `4598791`, F3 `c25d39c`, F4 `740b30f`, F5 `e7345ba`, E `9afca7f`, BB `dfbbd22`, BC `2ba1604`, BD `d20849c`, G1 `910708f`, G3 `d8b0c2a`, G4 `a8669a0`, G5 `1806c90`, the remainder `3b0f97f` | `f82c4ff`..`3b0f97f` |
| BB's b3 and b2, BD's b7, BC's b5 blocks and BA's badge-sweep fix applied live; BC's revoke of `verification_is_required` parked in `pending/` (revokes are on the stop list) | (live) |
| BA: the lifecycle jobs (`lib/cron`, `lib/bookings/lifecycle*`, four cron routes, `vercel.json`), b4 migrations applied, live probe passed; BB's b3 and b2 migrations applied, live probes passed; `database.types.ts` regenerated | `c838b57` |
| The second stints, cut off by the session limit and committed by the lead from the tree (typecheck 0, lint 0 errors, css clean, 1,903 tests): BB retires the narrow casts in lib/reservations and lib/rent and takes a business target in `reserveTable` `c0491ad`; BC's reconcile alerting only on attention, the card-charge limit alert, the shared `AuditList` and its preview page `9de1c05`, and BC's B0 item 4 fix in `publishAccommodation` `df77c82`; F1's assistant cards carrying Verified, beds, baths and floor area off the wire with the chrome strings in four locales `c9d2761`; F5's 390px fit fixes in threads.css and the inspection facts `00ee785` | `c0491ad`..`00ee785` |
| The three stood-down workers and the four kept ones, verified by the whole gate INCLUDING `next build`: BB's rent seams and the seeded-photo path `536046c`, BC and BD's desks `383fe16`, the five frontend scopes `6dc50c0` | `536046c`..`6dc50c0` |
| The founder's rulings in the token layer: `--nf-glow-edge`, the glass ladder's brand outline, the blue dock capsule `3e1413f`; the lit primary and brand-ringed glass secondary and the lit icon plate, with the production fix `bf4d63f` | `3e1413f`, `bf4d63f` |
| The founder's send-backs: home rebuilt to the markets render, the listing page retired and rebuilt, search two-up and small, the threads and desks lit | `d3611d1` |
| A compacted figure keeps its value (the move-in bar said 15m over a card saying 14,700,000) | `b4999de` |

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
| Sign-in (F1) | `55A56F21` | `docs/design/proofs/f1/sign-in-390-dark.png`, `-light.png` | Reads as the render: the app icon tile and wordmark stacked over the aurora plate, the slogan, the glass card with Welcome back, the email well with envelope, Continue with arrow, OR rule, Continue with Google, Sign up link, the podium ellipse. After the lead's send-back the card carries the full lit rim and a wider bloom and the language control is a quiet glass square. Differences by rule: the Google mark is monochrome (no third-party colour in the palette). |
| Welcome, first run (F1) | `2A49E2F7` | `docs/design/proofs/f1/welcome-390-dark.png`, `-light.png` | Reads as the render: lockup, two-line headline with the gradient second line, the Property and Stays glass cards with glass objects, the coin on its lit podium between them, dots, capsule Get Started, Skip. Two dots (the real beats) not four; the pack's hotel object, never the lettered one. |
| AI assistant (F1) | `BF49B814` | `docs/design/proofs/f1/assistant-390-dark.png`, `-light.png` | Reads as the render: bar with back, lockup, history and settings; two-up photo result cards; the assistant glass bubble with the bot avatar; the brand bubble with time; the Thinking pill; suggestion chips with glyphs; the sparkle composer. No Verified chip or bed/bath on the cards because the assistant wire type does not carry them (F1's finding 1, queued). |
| Home (F1) | the flip render's dimmed home | `docs/design/proofs/f1/home-390-dark.png`, `-light.png` | The register: greeting, the location chip, the search well, four glass tiles, full-width verified photo cards, Popular Cities photo tiles. Land in the fourth tile rather than New Build (no build-condition filter exists; honest). |
| Notifications (F1) | none, register inherited | `docs/design/proofs/f1/notifications-390-dark.png`, `-light.png` | Glass rows on a glyph rail, unread by tint, weight and dot, New and Earlier, mark-all in the header. |
| Landing, desktop and phone (F2) | `GOVERNING-landing-desktop-hero.png`, `GOVERNING-landing-desktop-fullpage.png` | `docs/design/proofs/f2/landing-desktop-hero.png`, `landing-desktop-fullpage.png`, `landing-390-dark.png`, `-light.png` | Hero, stats band, feature grid, community band, How it works, Stays band, app band and footer read as the renders; at 390 the villa is a fitted photo band under the words on the founder's ruling. Sent back for the second stint: the category tiles must be photo tiles, and the theme and language controls must not out-shout the nav. |
| Search filters (F3) | `3EB3E2A9` | `docs/design/proofs/f3/filters-390-dark.png` | Reads as the sheet in the render: Property type, Market, price slider, bedrooms and bathrooms Any 1+ 2+ 3+ 4+, Reset and Apply (n) with the real count. |
| Stays home (F3) | `FD3DFE84` | `docs/design/proofs/f3/stays-390-dark.png` | Reads as the render: the Stays headline with the glass hotel object, "Where are you going?", the category tiles, Featured stays photo cards with Verified, heart, per-night price and amenity chips. |
| Move-in ledger (F3) | `9F384CFE` | `docs/design/proofs/f3/move-in-390-dark.png` | Reads as the render: listing summary card, cost breakdown rows with glyph tiles, the total. |
| Trips and bookings (F3) | none, register inherited | `docs/design/proofs/f3/trips-390-dark.png`, `bookings-390-dark.png` | The date spine with Confirmed and Requested rows, the reservation on trips; the reservation row's thumbnail must carry the restaurant plate (second stint). |
| The 41 cropped glass objects (G2) | the renders they were cut from | `docs/design/proofs/g2/objects-390-dark.png`, `-light.png` | Every object floats on all four grounds with no fringe; in light they take the navy chip like the other untwinned objects. |
| Flip, mid-turn | `GOVERNING-flip-mid-turn.png` | `docs/design/proofs/lead/flip-mid-turn-390-dark.png` | The turning pane carries a bright rim and a two-rung bloom, the glass building mark is the cover's whole subject, the dimmed dock shows through the glass. The name, brand line and miniature stay beneath the mark for the first-flip ceremony and the wait; the render has the mark alone. |

---

## 7. Probes and audits

### 7.0 The outage of 19 September, and the gate that was missing

Three production deploys went red, including one that changed only
documentation, because they all inherited one commit. The cause was
`export type { FeedMode };` in `app/(app)/around/feed-actions.ts`. A
"use server" module may export async functions and nothing else, and
Turbopack builds one actions manifest per server module from its named
exports, so the build asked for an action id for a type. TypeScript erases
a type re-export, so `tsc --noEmit` was silent; it is not a runtime value,
so 1,937 tests were silent; `eslint` and the CSS checker have nothing to
say about it. `next build` is the only gate that sees it, and it was the
one gate not being run before a push. It is now run before every push, and
the rule is written here: a type alias DECLARED inside a "use server"
module is erased whole and is legal; a re-export statement is not.

A CORRECTION THIS LEDGER OWES. The commit message on `d3611d1` claims
2,003 tests. The true figure at that tree is 1,937. The commit is pushed
and history is not rewritten, so the correction lives here instead.

Two things the box taught, for whoever reads this next. Fifteen and then
nine concurrent workers drove the load average above 100 on four cores,
which OOM-killed typechecks, panicked Turbopack's PostCSS worker into
500ing every preview route, and made workers report red results that were
machine faults rather than code faults. Four workers is the number this
box actually holds. And a worker's proof is only worth the tree it was
shot from: two workers finished a stint having changed a design they had
never seen rendered, because every screenshot attempt was starved.


**Live migrations, 18 September 2026, applied by the lead through the
Supabase MCP after reading every line, each probed as one rolled-back block
(a `DO` block that raises `ALL PASS` at its end, so nothing persists):**
- `b4_booking_lifecycle_sweeps` and `b4_inventory_drift_and_cron_watch`:
  PASS on every assertion of `scripts/probes/b4_lifecycle_live.sql` (holds
  released and the hand-closed night kept, paid PENDING untouched, ended
  paid stay COMPLETED with both sides told once, unpaid and same-day stays
  kept, no-show by host and by admin with the event, the nights ahead
  reopened and the guest told, a stranger refused with 42501, drift
  reported and never corrected, `cron.job_run_details` readable, second
  runs idempotent). `room_spine=false` (M6 not applied). One pg_cron failure
  in the last 25 hours: `rentme-nightly-badges` dies on the example lister
  (handed to BA).
- `b3_no_table_at_an_example_a_thread_per_table_and_the_rent_charge`: PASS
  (a table at an example listing refused with 'This listing is an example',
  a listing with a table cannot become an example, the thread stamps back
  and a stranger's thread is refused, a table at an example business
  refused, `open_rent_charge` ok then exists then not_accepted, total
  150,000,000 kobo from the stated parts, the lister told 'Rent payment
  started' and never 'New booking request', RLS reads tenant 1 lister 1
  third 0, on CONFIRMED 'Rent paid' and 'Rent received' and never
  'Booking confirmed').
- `b2_example_stays_and_the_example_shelf_gets_its_photographs`: applied;
  live counts 7 example businesses, 5 accommodations, 11 room types, 22
  rate plans, 1,980 calendar rows, 990 inventory rows, 19 accommodation
  photos, 61 listings with 228 photographs, 22 service windows, 0 example
  rows verified. `stays_search` dated for two guests answers 5 rows with
  room and plan; breakfast 5, free cancellation 5, pool 2, suite 3,
  restaurants 2, verified 0, all as BB predicted.
- The sandbox's egress proxy refuses the Supabase host, so no dev server
  here renders live rows; every proof is on fixtures or the preview
  harness (F1's finding, confirmed by the empty `/stays` shelf).

**The restart, 18 September 2026 late:** the session's worker process was
restarted with all fifteen workers mid-flight; the nine reports not yet
delivered (F4, F5, E, BC, BD, G1, G3, G4, G5) were lost and F2 and F3 were
cut off. The tree on disk survived. The lead fixed the three things that
kept it red (a `Segmented` inference that widened to string, a missing
`agency` label in the Host wizard, a sync export from a "use server"
module, a settings-search index without the language names), verified
typecheck, lint, the css check, 1,895 tests and a production build, and
committed each scope as its own commit. The nine workers were relaunched on
continuation briefs; the five bounded workers had finished their two works.

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

### 8.x The founder's rulings of 19 September, and where each one lives

The founder photographed production beside the reference renders and sent
five messages. The material rulings were taken into the token layer rather
than into pages, because he asked for them "wide platform":

- **"Our containers are dull."** The token layer had no rung between a
  hairline and `--nf-glow-edge-strong`, so a resting card carried a 50 per
  cent outline with its bloom set at -10px and -12px spreads, which shows
  nothing at the edge. `--nf-glow-edge` is that rung: the lit top rim, a
  full brand ring, one near bloom, with a daylight twin that keeps the
  outline and drops the light. Worn by `.nf-glass--card`, `.nf-glass--tile`
  and `.nf-icon-btn`. The glass ladder's base outline moved from 11 per
  cent white, which reads grey on navy, to the soft brand edge.
- **"Change the bottom nav container capsule to the branding colour."** The
  capsule was 90 per cent raw canvas behind a neutral stride ring. It is
  now blue glass with the lit edge, and the travelling pill is brand-washed
  with its own ring and bloom instead of a 9 per cent white plate.
- **"Retire all our buttons colours to this new one, really shiny."** The
  primary carried no outer glow until a pointer hovered it, so on a phone
  the signature control never threw light. It now rests in its own two-rung
  bloom. The glass secondary stood on an 11 per cent white border, grey
  beside a lit blue primary, and is now brand-ringed with the lit rim.
- **"The resting glow belongs in the inner containers of the icons."**
  `.nf-icon-btn` had `--nf-glow-1` at 16 per cent, invisible at 44px, and
  now wears the same lit edge as the cards.
- **Home, the listing page, search and the filter sheet** were rebuilt to
  his own references, which are filed in
  `docs/design/references/founder/`. The listing page he photographed was
  retired entirely on his instruction.
- **Team size.** Nine, then four on his ruling. The three stood down (F4, E,
  BD) reported with their work syntactically complete and verified.

A MONEY RULING THAT CAME OUT OF AUDITING HIS PROOF. Compact notation keeps
two significant digits, so `formatMoney`'s compact branch turned
₦14,700,000 into ₦15m and painted it on the move-in bar directly under a
card reading ₦14,700,000. One screen stated two different obligations and
the one on the control a person presses was wrong by ₦300,000. The branch
now names one fraction digit, with the minimum stated explicitly because
currency style clamps it up and turned ₦45k into ₦45.0k.


1. **The control radius law is amended** on the founder's identical-to-images
   ruling: where a governing image shows a capsule (city chips, filter
   chips, the bloom lozenges, segment toggles, the Get Started button on
   welcome), the product ships the capsule; `--nf-radius-pill` carries it;
   rectangles stay where the render shows rectangles (cards, fields, the
   dock, the feature tiles).
2. **The dev preview harness** (section 5), so that the look of every
   signed-in surface can be proven here rather than believed.
3. **Translations fall back to English key by key** (`packages/i18n/src/locales/fallback.ts`):
   Vercel failed on main at `fb4e182` because English had gained a
   namespace the Hausa, Igbo and Yoruba files had not reached; the three
   locales are now deep partials of the English shape filled at load, so a
   copy gap is a task for a speaker and never a red deploy. `776ba64`.

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
5. THE NATIVE BUNDLE IDENTIFIER, and the window closes at first submission.
   It is `ng.vallo.app` in `build.gradle` (namespace and applicationId), the
   Java package path `java/ng/vallo/app/`, `strings.xml`, `capacitor.config.ts`,
   `project.pbxproj`, `assetlinks.json` and the AASA `appIDs`. It is derived
   from `vallo.ng`, a domain that was never registered and has now been
   dropped. A reverse-DNS bundle id needs no domain ownership, so it works
   exactly as it is and nothing is broken today. But it is PERMANENT ONCE THE
   APP RECORD IS CREATED in App Store Connect or Play Console, and this
   session cannot see whether those records exist. If they do not yet, the
   consistent identifier is `com.vallospaces.app` and changing it now costs
   one afternoon. If they do, changing it is impossible on Play and means a
   new app on the store. So: has the app record been created yet? Nothing
   was changed unasked, because guessing wrong either breaks a signing and
   provisioning setup already in place or leaves the wrong name on the store
   for ever.
6. THREE RULINGS THE DELETION SPECIFICATION DID NOT COVER, each found by
   building it rather than by reading it.
   (a) An `events` row survives an account deletion with an ANONYMOUS HOST.
       `events.host_id` cascades onto `auth.users`, and we deliberately do not
       delete that row, so the event stays up with nobody's name on it. Should
       a hosted event be cancelled, transferred, or left standing anonymously?
   (b) A BUSINESS KEEPS TRADING after its owner deletes their account. Only
       the representative's personal columns are scrubbed. A published listing
       has a precondition requiring it to be unpublished or transferred first;
       a business has none. Should it? It is the same shape of question, and
       the answer decides whether a venue can be orphaned.
   (c) A moderation `reports` row is RETAINED PSEUDONYMISED. It is a safety
       record about somebody else, keyed to a now anonymous reporter, and it
       is in neither of the two lists you gave. Keeping it protects the person
       who was reported about; destroying it is what a strict reading of the
       erasure list would do. It is kept today.
7. ONE STANDARD THAT IS NOW CONSISTENT, recorded because you may want to
   overrule it. The auth emails were forbidden from naming hotels or
   restaurants on the premise that those loops hold zero rows, while the
   landing's Stays band links to hotel, resort and guest house searches that
   return nothing today. Checked against the live database, both sides are
   example stock in exactly the same way: `accommodations` 5, `room_types` 11,
   `restaurant_profiles` 2, `businesses` 7, `listings` 64, every row flagged as
   an example. So the email rule now bans the harm rather than the nouns, and
   both surfaces are held to one standard. If you want the stricter rule
   instead, it has to apply to the property half as well.
8. TWO DASHBOARD TOGGLES ONLY YOU CAN SET, both one click and both worth it.
   LEAKED PASSWORD PROTECTION is disabled on the Supabase project. It checks a
   new password against HaveIBeenPwned and refuses one that is already in a
   breach corpus. On a platform holding a naira wallet it is the cheapest
   security win available and it cannot be set through the API from here.
   Second, the SIGN-IN LOCKUP HAS NO LIGHT ASSET: `vallo-wordmark.png` is a
   photographic glass render built for a dark ground, and the rule that an ink
   version of a photographic render is a new render rather than a filter means
   nobody here can make one. It needs a light twin rendered, or a ruling that
   the auth screen stays dark in both themes.

---

## 10. The twelve, and the laws they close under (founder's orders, 19 September)

The founder has scaled the team to NINE BUILD AGENTS and THREE
RECOMMENDATION AGENTS, and set the target: MVP, store ready, App Store and
Play Store. This section is the contract. Every worker restates section 0
before starting and reads its own row here.

### 10.1 The roster and the file scopes (strict, non-overlapping)

| Worker | Owns |
| --- | --- |
| **F1 chrome and navigation** | `components/app/{AppShell,AppRail,MobileTabBar,SideSwitch,nav-model}*`, `app/css/{chrome,side-nav,side-flip,overlays}.css`, `app/(auth)/**`, `components/auth/**`, `app/welcome/**`, `components/app/welcome/**`, `app/(dev)/preview/f1/**`, `docs/design/proofs/f1/**` |
| **F2 landing, marketing shell, CONTENT TRUTH** | `app/page.tsx`, `app/(site)/**`, `components/site/**`, `lib/site/**`, `lib/platform-stats.ts`, `app/css/{landing,site}.css`, `app/layout.tsx` metadata only, `public/manifest*`, `supabase/templates/**`, `app/(dev)/preview/f2/**`, `docs/design/proofs/f2/**` |
| **F3 catalogue and money** | `app/(app)/{search,listing,rent,stays,stay,trips,restaurants,restaurant,checkout,bookings,saved,wallet,crypto}/**`, `app/(app)/settings/payments/**`, `components/app/{search,filters,listing,stays,bookings,wallet,payments,crypto}/**`, `components/app/{ListingCard,MediaFrame,SaveControl,ResultSheet}.tsx`, `app/css/{explore,map,catalogue,wallet,crypto}.css`, `app/(dev)/preview/{f3,e}/**`, `docs/design/proofs/{f3,e}/**` |
| **F4 social and identity** | `app/(app)/{around,post,stories,u,profile,notifications,assistant}/**`, `app/(app)/settings/**` except payments, `components/social/**`, `components/app/{account,assistant,home}/**`, `app/{social,social-feed,settings-rows}.css`, `app/css/home.css`, `app/(app)/home/**`, `app/(dev)/preview/f4/**`, `docs/design/proofs/f4/**` |
| **F5 conversations and operations** | `app/(app)/{messages,inspections,verification}/**`, `components/app/{messages,threads,inspections}/**`, `components/verification/**`, `app/agent/**`, `components/agent/**`, `app/host/**`, `components/host/**`, `app/admin/**` except money/payments/bookings/alerts/audit, `app/css/{threads,admin,agent}.css`, `app/(dev)/preview/f5/**`, `docs/design/proofs/f5/**` |
| **B1 inherited debts and gates** | the B0 items, the example-listing refusal on the listing path, reservations bound to threads, M6 and the M8 landmark seed when the founder's word comes |
| **B2 stays engine and dead ends** | `lib/stays/**`, `lib/reservations/**`, `lib/rent/**`, `app/(app)/rent/pay/**`, `lib/social/posts-*.ts`, `lib/bookings/queries.ts` |
| **B3 lifecycle and hardening** | `lib/cron/**`, `lib/bookings/lifecycle*`, `lib/security/**`, `lib/alerts/**`, `lib/messages/blocks.ts`, `app/api/paystack/**`, `app/api/yellowcard/**`, `lib/admin/audit*`, `app/admin/audit/**`, `lib/host/**`, `.github/workflows/**` |
| **B4 architecture, data and admin** | all migrations, `lib/supabase/database.types.ts`, `app/api/crypto/**`, `lib/crypto/**`, `lib/saved/**`, `lib/admin/{money,payments,bookings}-*.ts`, `app/admin/{money,payments,bookings,alerts}/**` |
| **R1 visual auditor** | edits nothing but `app/(dev)/preview/r1/**` and `docs/design/audits/r1/**` |
| **R2 functionality auditor** | edits nothing but `app/(dev)/preview/r2/**`, `scripts/audit/**` and `docs/design/audits/r2/**` |
| **R3 product and platform auditor** | edits nothing but `docs/design/audits/r3/**` |

### 10.2 The component completeness law

Every component visible in a reference image must exist, built, styled and
functional. Go through `docs/design/CATALOGUE.md` file by file, open each
keeper image, and enumerate every component in it. Nothing is skipped for
looking minor. Where a render's layers are mixed, muddled, half drawn or
plainly wrong, do not copy the confusion: resolve it into the deliberate
component and record here what was resolved and why. Where the render shows
something we lack, build it in the register; a missing icon is cropped from
the reference and filed through the icon pipeline, never with baked text.
Where a screen has no reference at all, build it in the same register.
The sweep never trades a working flow for a look.

### 10.3 The double re-audit law

A frontend scope is audited TWICE before it closes. First the building
agent re-audits its own work against the governing image and the ONE LAW
and fixes what it finds. Then R1 audits it independently with the image
open and R2 walks its controls end to end. A scope closes only when both
passes are clean and the side-by-side sits in section 6. If it does not
read as the image, it goes back. No tired closes.

### 10.4 The content truth sweep (F2 owns it, and it is law)

The words must describe what Vallo now is: one app, two sides, Property
(rent, buy, verified listings, agents, inspections) and Vallo Stays
(hotels, apartments, guest houses, resorts, serviced apartments, shortlets,
restaurants), one account, one wallet, messaging, bookings, AI assistant,
payments. Every marketing and documentation surface currently speaks
property only.

- **Landing:** the hero speaks for both sides; the search pill carries Buy,
  Rent and Stay ONLY, because we offer no investment product, so the
  render's Invest segment is dropped; the stats band is wired to the real
  platform stats and never carries the render's invented 10K+ and 200+;
  the feature list carries only capabilities with a shipped surface.
- **Every (site) page:** /about, /docs and its twelve chapters, /help and
  the FAQ, /safety, /standards, /cancellations, /careers, /contact. The
  docs gain the stays journey and the restaurant reservation journey; the
  FAQ gains the two-side questions (what the switch is, how stays payments
  work, what Verified means beside Third party).
- **Metadata and shells:** layout title, description and keywords, the
  manifest description and its category order, the OG copy line, the email
  footers. The auth slogan stays "Real Estate reimagined!" as ruled.
- **All four locales**, through the i18n discipline, never hardcoded.
- **The assistant** learns it helps with stays and restaurants, and its
  cards obey the side law so a hotel opens in the Stays shell.
- **The rule of the sweep:** never claim what does not exist, never keep
  copy that undersells what does. Where a render's text conflicts with the
  truth, the truth wins and the visual treatment stays. Every page swept
  gets one line here: what it claimed, what it claims now.

### 10.5 What MVP means, and it is the only definition

Every surface with a reference image reads as that image in both themes
with the side-by-side in section 6; every surface without one reads as the
same product; every control is functional end to end under the ONE LAW;
the three consumer dead ends are closed; the stays showcase is live; the
hardening list has landed; the content truth sweep is complete; and R1, R2
and R3 have each run a final pass with nothing critical open.

### 10.6 The box, which is a real constraint and not an excuse

Four cores. Fifteen and then nine concurrent workers drove the load average
above 100, which OOM-killed typechecks, panicked Turbopack's PostCSS worker
into 500ing every preview route, and made workers report machine faults as
code faults. So: **B1 to B4 and R3 run NO dev server.** A frontend worker
and R1 and R2 may hold one, and stop it the moment the shots are taken
rather than keeping it warm. A red result under load 80 is re-run before it
is believed.

### 10.7 The gate, all five, before anything is pushed

`npx tsc --noEmit -p apps/web` (zero across the app, never "zero in my
scope"), `npx eslint src`, `node scripts/check-css-tokens.mjs`,
`npx vitest run`, and `npx next build`. The fifth is not optional: skipping
it took production down for twenty minutes in this build (section 7.0).
A "use server" module may export async functions and may DECLARE types. It may
not carry an export STATEMENT for anything else, and `export type { X }` is
such a statement: tsc erases it and Turbopack still asks the actions manifest
for an id that is not there. That one line took production down for twenty
minutes. A type DECLARED inside the module is erased whole and stays legal;
nineteen modules in this tree do it. The earlier wording here read "async
functions and nothing else, not even a type re-export", which invited the
opposite reading and cost a worker a stint chasing a defect that was not one
(11.14). Any worker touching a "use server" module says so in its report.

---

## 11. The lead's own cycle of 19 September, evening

### 11.1 THE PROBE TOOL CANNOT SEE RLS, AND EVERY EARLIER PROBE THAT CLAIMED IT DID IS SUSPECT

The Supabase MCP `execute_sql` tool runs as `supabase_read_only_user`, and
that role carries `rolbypassrls = true`. This was read off the database, not
inferred:

```sql
select current_user, (select rolbypassrls from pg_roles where rolname = current_user);
-- supabase_read_only_user | true
```

So a cross-user read run through `execute_sql` returns rows whether or not
RLS would have refused them, and a probe that selects from a product table
through that tool proves nothing about RLS at all. It also cannot
`set local role authenticated`, because it is not a member of that role, and
it cannot execute a `private.` helper whose EXECUTE was revoked from public.

The sandbox cannot reach the REST endpoint either: the agent proxy answers
`CONNECT tunnel failed, response 403` for `*.supabase.co`, so the anon-key
route to the same proof is shut.

WHAT WORKS, and it is what every probe from here uses. Run the probe through
`apply_migration`, which holds a privileged role, and end the block with a
deliberate `raise exception 'PROBE ALL PASS ...'`. The raise aborts the
transaction, so nothing persists, no probe row survives on a live product
table and no migration row is recorded, and the tool hands back the pass
message as its error text. A failing assertion aborts the same way with its
own message, so the two outcomes are told apart by what the message says.

### 11.2 b1, `20260919103000_b1_the_example_refusal_covers_every_remaining_door.sql`, APPLIED

Two `create or replace` functions and one new trigger. A business holding a
reservation can no longer be flagged as an example, and the listing guard now
counts reviews, inspection requests, recorded inspections, reservations and
tenancy charges beside bookings.

PROBE RESULT: assertions 1, 2, 3 and 5 pass as written. Assertion 4 failed on
a FIXTURE FAULT IN THE PROBE, not on the migration and not on the product:
b1's probe used the first `auth.users` row as its lister, and that user is a
verified agent, so `enforce_demo_listing_has_unverified_lister` refused the
control flip with "An example listing may not be attributed to a verified
lister". That refusal is the badge law working correctly. Re-run with an
unverified lister as the fixture, assertions 4 and 5 both pass. The lesson
worth keeping: a probe control that uses whatever row happens to be first is
not a control, it is a coin toss against every other trigger on the table.

### 11.3 b3, `20260919140000_b3_a_block_holds_on_an_attachment_too.sql`, APPLIED

One SECURITY DEFINER helper `private.blocked_for_message(uuid)` and one
RESTRICTIVE insert policy on `message_attachments`, closing the hole where a
blocked person could hang a photograph off one of their own older messages
and have it appear in the thread of the person who blocked them.

PROBE RESULT, honestly split:

- Assertion 1, the helper exists and is SECURITY DEFINER: PASS.
- Assertion 2, the policy exists, is `polpermissive = false` and is an INSERT
  policy: PASS.
- Assertion 3, the permissive policy is intact: PASS ONLY AFTER CORRECTING
  THE ASSERTION. It tested `like '%sender_id = auth.uid()%'`, and Postgres
  stores the expression with the RLS init-plan rewrite,
  `m.sender_id = ( SELECT auth.uid() AS uid)`, so the literal never matches
  however correct the policy is. Corrected to test for `sender_id`,
  `auth.uid()` and `in_conversation` separately.
- Assertion 4, a missing message is not "blocked": PASS.
- Assertion 5, the cross-user read: RAN, RETURNED ZERO, AND PROVES NOTHING
  YET. `message_attachments` holds zero rows, so zero readable by a stranger
  is zero of zero. Recorded as unproven rather than passed. It becomes a real
  proof beside the b5 probe on the seeded logins, once an attachment exists.

RLS is enabled on `message_attachments`, `messages` and `conversations`
(`relrowsecurity = true` on all three), which is structural and is proven.

### 11.4 The domain, the sender and the drift test

`BRAND_DOMAIN` is `vallospaces.com`. The sweep replaced `hello@vallo.ng`,
`support@vallo.ng`, `www.vallo.ng` and `vallo.ng` across thirty-one files,
including the Android manifest's two `android:host` values, the iOS
entitlements' two `applinks:` values and the Apple App Site Association
comment. `lib/email/client.ts` derives `DEFAULT_FROM` from `BRAND_DOMAIN`, so
the transactional sender followed without being touched.

`apps/web/src/lib/brand-domain.test.ts` is the drift test the founder asked
for: it fails if `BRAND_DOMAIN` stops being a bare host, if `BRAND_ORIGIN`
stops deriving from it, if the Android manifest or the iOS entitlements stop
naming both the bare and the `www.` host, if any of five named files carries
`vallo.ng` again, or if `vallospacesltd@gmail.com` appears in any of them.

WHAT DELIBERATELY DID NOT CHANGE, and the founder should know: the native
bundle identifier is still `ng.vallo.app`, in `build.gradle`, the Java
package path, `strings.xml`, `capacitor.config.ts`, `project.pbxproj`,
`assetlinks.json` and the AASA `appIDs`. A reverse-DNS bundle id needs no
domain ownership, so it works, but it is derived from a domain we do not own
and have dropped. It is also PERMANENT ONCE THE APP RECORD EXISTS in App
Store Connect or Play Console, and this session cannot see whether those
records have been created. Changing it is a one-way door that might break a
signing and provisioning setup already in place, so it is on the founder's
desk in section 9 rather than done unasked. The window closes at first
submission.

`vallospacesltd@gmail.com` appears in no tracked file. `vallo.ng` survives in
exactly two, both deliberate: `docs/archive/SESSION_REPORT_2026-09-15.md` and
`docs/design/audits/r3/findings.md`, which are historical records and are
excluded from the sweep by design.

### 11.5 The email inventory rule was banning true sentences

`shell.test.ts` banned the bare words `restaurant` and `hotel` in every email
this product sends, on the stated premise that "the restaurant and hotel
reservation loops exist in the schema and hold zero rows". That premise was
checked against the live database and it is false. Counts, read on
19 September:

| table | rows | all `is_demo` |
| --- | --- | --- |
| listings | 64 | yes |
| accommodations | 5 | yes |
| room_types | 11 | n/a |
| restaurant_profiles | 2 | n/a |
| businesses | 7 | yes |
| bookings | 0 | n/a |
| reservations | 0 | n/a |

Both sides are example stock, and this email has always been free to say
Vallo is for renting and buying. Banning one side's nouns while the other
side's ran unchallenged was an accident of which half was written first, not
a content truth rule. The assertion now bans the harm instead of the nouns:
no quantity, no availability promise, no superlative inventory framing, and
`experiences` still banned outright because no experiences product exists
here at all. Money is struck out before the count rule runs, because
"₦25,000 stays in your Vallo wallet" is a true sentence that a naive count
rule reads as an inventory boast.

### 11.6 Two findings fixed by the lead directly

R1's A5, the biggest single finding in the visual audit: `.nf-icon-tile` in
`glass.css` resolved to white at 11 per cent, white at 7.5 per cent and a
white rim, with not one brand value, on the plate behind every glass object
in every list row. That is the plate the founder photographed and ruled on
twice. It is now `--nf-brand-edge`, `--nf-brand-tint-1` and `--nf-glow-edge`.
The control-edge sweep across `controls.css`, `chips.css` and `landing.css`
is F1's and F2's, with a new `check-css-tokens.mjs` rule so it cannot regress.

R1's A40, every route logged a hydration mismatch on the three before-paint
scripts in `layout.tsx`, because React deliberately does not serialise
`nonce` to the client. It was visible as the "2 Issues" badge in a shipped
proof. All three now carry `suppressHydrationWarning`, which is the sanctioned
suppression for this exact case; the one on `<html>` does not reach
descendants. The cost of leaving it was not the warning, it was that a
permanent false positive hides real hydration bugs behind it.

### 11.7 Two test failures that were the box, not the code

`src/lib/plurals.test.ts` failed twice in a full run, one case timing out at
716,842 ms against a 5,000 ms limit. Run alone on a quiet box the file passes
in 1.26 s. Under load average 120 on four cores a vitest worker is starved,
not wrong. Per 10.6 a red test taken under load is re-run before it is
believed, and this is the record of that.

### 11.8 Carried, with the fix written out so the next owner does not re-derive it

`RENT_PERIOD_LABEL` in `apps/web/src/lib/listings/pricing.ts` is English only:
`{ month: "Monthly", quarter: "Quarterly", year: "Yearly" }`. It is lowercased
and dropped inside sentences that ARE translated, so a Yoruba reader gets
"Háyà Yearly" and a Hausa and Igbo reader the same shape. F3 has now carried
this forward twice and it is not F3's file.

THE FIX, and why it was not done this cycle. It needs four dictionary keys in
each of `en`, `ha`, `ig` and `yo`, a `rentPeriodLabel(t, period)` helper
beside the constant, and then eight call sites converted:
`components/app/listing/ListingMoveIn.tsx:60,65`,
`app/(app)/rent/pay/[inspectionId]/page.tsx:240`,
`app/(app)/rent/move-in/[listingId]/ledger-model.ts:54`,
`app/(app)/wallet/transactions/[id]/paid-for.ts:98`,
`lib/bookings/queries.ts`, and `pricing.ts:239,244` itself.

Those files belong to three different workers and four of them were being
edited while this was written. Two agents already collided once on this build
and the second overwrote the first's finished locale work, which cost five
keys that had to be restored by hand. So this waits for ONE owner holding all
eight call sites at once, rather than being started across live edits. It is
a half-day with the tree quiet and it should be the first thing somebody
picks up.

Also carried, both small and both named by F3 against itself: `/trips` has
two English literals in its read-failed panel, and `components/app/messages/
share.ts:47` and `ThreadContextBanner.tsx:124` carry comments calling
`/bookings/<id>` "the trips hub's own detail route", which was wrong when it
was written and is accidentally true now that F3 has built that route. The
wording should be re-read rather than left to look prescient.

### 11.9 The cycle's landings, and the three faults that were bigger than the findings that found them

**A ₦24,000,000 ASKING PRICE READ "per night".** F5 found a two-case ternary
in the agent listings surface that mapped every rate period that was not
`year` to a nightly label, so a sale price and a monthly and a quarterly rent
all printed as a nightly rate to the person who listed them. A full six-value
period map now exists in all four locales. This is the money rule failing on
the one screen where a lister checks their own work.

**THE FEED CURSOR WAS SKIPPING ROWS IN BULK, SILENTLY.** B2 found that
`readFeedPage` ordered by `created_at desc` with no tiebreaker and paged with
a strict `created_at < cursor`. That assumes no two posts share an instant,
and they do: `private.open_place_entries` writes two SYSTEM entries per place
with `now()`, which is the TRANSACTION timestamp, so every place opened by one
migration carries an identical `created_at` to the microsecond. Page one
served twenty rows at instant T and returned T; page two asked for
`created_at < T` and stepped over every remaining row at T. Hundreds of posts
were unreachable and the feed simply looked like it had ended. It is keyset
pagination on `(created_at, id)` now, with a cursor format that still accepts
a bare instant so a tab open across the deploy pages on rather than breaking.

**THE HARNESS WAS LYING A SECOND TIME, AND THIS ONE HID THE WHOLE PAGE.** F2
probed a running dev server and found the CSP refusing Next's own dev chunks:
`strict-dynamic` is in force, Turbopack's HMR runtime injects chunk tags that
carry no nonce, so the browser refuses them and HYDRATION NEVER COMPLETES.
Nothing looks wrong if you are clicking around, because the server-rendered
HTML is already on screen. It is fatal to a proof: every band below the fold
is wrapped in `Reveal`, which fades a block in from an IntersectionObserver in
an effect, and an effect that never runs leaves 20 of 21 `.nf-reveal` nodes at
`opacity: 0`. Measured by F2 directly, with `window.scrollY` stuck at 0 after
a scroll to 4,623.

`scriptSrc` in `lib/security/csp.ts` now drops `strict-dynamic` and adds
`'unsafe-eval'` under `NODE_ENV === "development"` only, and four assertions
hold the line: production and test keep strict-dynamic and refuse eval, and
no environment ever gets `'unsafe-inline'`. The shipping policy is unchanged.
`verify-desktop.mjs` also waited only 600ms after `load`, which caught pages
before their photography had decoded; it now waits for every image to decode,
bounded at 60s, then settles.

That is twice in one day that workers judged finished work from a picture of
something the browser never drew. THE RULE THIS EARNS: a proof harness is a
measuring instrument, and an instrument that has never been checked against a
known answer is not evidence. Before trusting a shot, prove the harness draws
the thing being judged.

**A MASK CHANNEL IS NOT A COLOUR.** `check-css-tokens.mjs` was failing four
`#000` values inside a `mask-image` gradient in `home.css`. A mask stop's
alpha decides what shows through; it is never painted and has no light twin.
The rule was pushing authors towards inventing a fake token or reaching for
`--nf-ink-950`, where a near-black that is not quite opaque silently fades the
edge of the content it is meant to reveal in full. The checker now exempts
only the lines a mask declaration spans, and a literal anywhere else in the
same rule is still reported. Proven both ways: a probe literal outside a mask
is still caught.

**THE PLATFORM'S SHARE DOES NOT EXIST, AND THE EARNINGS SCREEN SAID IT DID.**
`agentEarnings.howBody` read "split three ways: your share, the platform's
share and what the payment processor takes". Vallo charges nothing and
`platformShareMinor` is 0, so rule 3 was broken on the screen a lister reads
to work out what they are owed. F5 found it and could not fix it under the
ADD-only rule for locale values. It is two ways now, and it says plainly that
Vallo takes nothing.

**Also landed this cycle:** the side law closed on `/search` with one
`hrefForListing(kind, id)` helper and the `side` prop deleted so there is
nothing left to forget; the heart reading back lit after a reload on every
card surface; a booking detail route, so the primary button on a forwarded
booking card stops 404ing; four Stays prefixes in the Android manifest and the
Apple App Site Association; a booking notification landing on the side the
reader is standing in; a refund telling the guest in the product and not only
by email; a flagged message storing an account number masked to its last four
rather than a second plain-text copy in a second table; a block holding on an
attachment as well as on a message; an example refusal covering reviews,
inspections, reservations and tenancy charges; two thread faces that are
structurally different rather than differently worded; an oval avatar ring on
every inbox row, fixed; 214 raw font sizes across the agent console mapped to
the scale; and a fourth lint rule, `nf/server-actions-export-only-actions`,
which reports the exact defect that took production down for twenty minutes,
in the editor rather than in a build somebody skips.

**Process, recorded because it is how the next collision gets avoided.** Two
workers reported editing the same file concurrently and both survived; one
worker ran `pkill -f "import re"` and may have killed another worker's
in-flight Python edit script at about 16:00, and said so unprompted; one
worker ran a read-only git command against its own brief and reported it. The
scopes in 10.1 are holding better than they were, and the reports are honest
about where they did not.

### 11.10 Account deletion: applied, probed, and the two faults found on apply day

Both b5 migrations are applied. `public.account_deletion_requests` exists with
RLS, one SELECT-own policy and no client write policy at all; eight functions
are in place, all SECURITY DEFINER, with only `open_account_deletion` and
`account_deletion_blockers` reachable by a signed-in caller.

TWO FAULTS WERE FOUND AND FIXED BEFORE APPLYING, and both would have shipped.

**The released handle was forty characters against a twenty-character check.**
`social_profiles_handle_check` is `^[a-z][a-z0-9_]{2,19}$`, read off the live
database. The purge set `handle = 'deleted_' || replace(uuid, '-', '')`, which
is forty characters, so the update would have raised a check violation, rolled
the transaction back, and FAILED EVERY DELETION for any account that had ever
opened a social profile. Sixty-two unit tests could not see it, because the
constraint lives in Postgres and not in TypeScript. It is `'d'` plus nineteen
hex characters now, exactly twenty.

**A negative wallet balance blocked the deletion, invisibly.**
`account_deletion_blockers` returned `blocked` from `v_balance <> 0`, while
`lib/account-deletion/preconditions.ts` builds the on-screen list from
`walletBalanceMinor > 0`. `schedule_account_deletion` reads the flag, so a
person carrying a negative balance would have seen no blockers at all, pressed
Delete, and been refused with reason "blocked" and a list the interface
computes as empty. A refusal with nothing to act on is the dead end the
specification forbids, and a reconciliation error must not be usable as
leverage against a data protection right. Held money in either direction still
blocks, because that is somebody else's money in flight.

THE LESSON, worth more than either fix: a unit test proves the code the author
wrote. A CHECK constraint, a foreign key rule and a policy are the code the
DATABASE wrote, and nothing in the TypeScript suite can see them. Every
migration probe from here asserts against live constraints, not against the
author's belief about them.

PROBE RESULT, run through `apply_migration` and rolled back by a deliberate
raise so nothing persisted:

- The blockers read refuses a stranger with `insufficient_privilege`. This was
  earned rather than written: the first probe run hit it because the runner
  carries no `auth.uid()` and is not `service_role`.
- Both restrict keys survive the migration (`bookings_guest_id_fkey` and
  `wallets_user_id_fkey` are still `confdeltype = 'r'`).
- One open request per person: a second schedule answers `already_open`.
- A request inside its window answers `not_due` and does not purge.
- The purge runs, scrubs the auth row, and answers `already` on a second run.
- **The thread keeps its body and its `sender_id`.** The message the subject
  sent is still there, word for word, with its sender pointing at the
  tombstone rather than at nothing.
- The auth row exists, is banned, and carries no routable address.
- The released handle passes its own check at twenty characters.
- **The cross-user read that must fail:** as a stranger, `select count(*) from
  public.account_deletion_requests` returns zero while a request row exists in
  the transaction. Non-vacuous, unlike the b3 attachment read.

**APPLY-DAY FOLLOW-UP, named rather than done.** `lib/supabase/database.types.ts`
has not been regenerated for the new table. Nothing in the feature reads it
through the generated types (everything goes through the untyped PostgREST
door in `lib/account-deletion/rpc.ts`, on the precedent of `lib/cron/rpc.ts`),
so all five gates pass without it and the app typechecks clean both before and
after. It should be regenerated on a quiet tree by somebody who can diff the
5,517 lines properly rather than in the middle of a twelve-worker cycle.

**HANDOVERS from the deletion build, all named by its author against itself:**
`/delete-account` is not linked from the site footer, which is where Play
reviewers look; signing in during the grace window shows GoTrue's raw "banned"
message rather than a sentence naming the restore page;
`lib/profile/schema.ts` still exports a dead `deleteAccountSchema` and a second
copy of `DELETE_CONFIRM_PHRASE`, which is a real drift hazard beside the live
constant in `lib/account-deletion/constants.ts`.

**THREE THINGS THAT NEED THE FOUNDER'S WORD, added to section 9.** An `events`
row survives with an anonymous host, because `events.host_id` cascades onto
`auth.users` and we do not delete that row; the specification did not name
events. A business keeps trading after its owner deletes, with only the
representative's personal columns scrubbed and no precondition requiring a
transfer, where a published listing has one. And a moderation `reports` row is
retained pseudonymised: a safety record about somebody else, keyed to a now
anonymous reporter, which is in neither of the founder's two lists.

### 11.11 A signed URL does not go in `remotePatterns`, and the reason is the whole point of signing it

O1 swept the raw `<img>` tags and found the one it could not close: the chat
photographs in `ThreadView.tsx`, which are served by `createSignedUrls` as
`/storage/v1/object/sign/...?token=...`. That host path is not in
`next.config.ts`'s `remotePatterns`, and `next/image` THROWS on an unlisted
host, which would be a 500 on every route drawing one. The same shape applies
to KYC documents and social post media.

THE OBVIOUS FIX IS WRONG AND MUST NOT BE MADE. Adding the sign path to
`remotePatterns` would work, and it would quietly undo the signature. Next's
optimiser caches the result under a key derived from the full source URL, and
serves it from `/_next/image?url=<the signed url, encoded>&w=...&q=...`. Three
consequences, each bad on its own: that address is shareable and carries the
token in plain sight; the cached artefact outlives the token, so a grant that
was meant to expire becomes permanent; and the token lands in every CDN access
log the request passes through. For a chat photograph that is a privacy
failure. For a KYC document it is a regulated-data failure.

THE CORRECT FIX, and it is real work rather than a config line. A same-origin
route handler that resolves the session, authorises the reader against the row
that owns the object, and streams it. A relative `src` needs no
`remotePatterns` entry at all, so `next/image` optimises it freely, the token
never leaves the server, and the authorisation is ours rather than a signature
with a clock on it. It also gives the one place to put a cache header that is
correct for private media.

Until that lands, the chat photographs stay raw and unoptimised, which is a
bandwidth cost on the exact users who can least afford it, and it is the
honest trade against handing out a permanent link to a private photograph.

### 11.12 Two things the image sweep found that were not about images

**The brand mark is 614 by 587 and was declared square.** Read off the PNG
header, and confirmed independently: `vallo-mark.png` is not square.
`LogoMark` declared `width={size} height={size}`, which is two faults in one
line. It logged an aspect warning on every route that draws the logo, which is
all of them, and anywhere a stylesheet honoured the square the mark was drawn
FOUR AND A HALF PER CENT TALLER THAN THE ARTWORK. The suggested fix of
`style={{ width: "auto" }}` would have silenced the warning and left the
stretch. The intrinsic shape is now declared, `app/loading.tsx` no longer
squares it, and `.nf-wait__mark` no longer squares it a second time. The first
thing a stranger meets on the slowest page in the product was a stretched
logo.

**Four files carried a comment saying the storage bucket is outside the image
optimiser's allowed hosts.** It has not been true since the Supabase host was
derived into `remotePatterns`. The comments outlived the config, and the
product kept serving full-resolution uploads into 84 and 128 pixel thumbnails
because of a line nobody rechecked. A comment that states a fact about another
file is a claim, and it rots exactly like code.

### 11.13 The unread mark is its own token now

The bell's dot was `--nf-status-pending`, whose daylight twin is `#0E6E8C`, so
it rendered TEAL-GREEN on paper: a bell wearing the success colour, saying
"all good" where it meant "you have unread", with colour the only thing saying
anything at all.

AN UNREAD MARK IS NOT A STATE. Nothing is pending, nothing failed and nothing
succeeded; something is simply there and has not been seen. Borrowing a state
colour is how it inherited a daylight value tuned for a different meaning.
`--nf-mark-unread` is now its own token in both themes, rose, which is what all
three governing renders draw and what everybody who has ever used a phone reads
as "there is something here". Rule 8 still holds: rose is the error token's
colour, and this is not the error token. It is named for what it means and can
be tuned without touching either. #C10E32 on paper, 6.22:1 on white.

### 11.14 CORRECTED. A type DECLARATION in a `"use server"` module is legal, and this entry was wrong

**WHAT THIS ENTRY SAID FIRST, AND WHY IT WAS WRONG.** It recorded that
`lib/auth/actions.ts` was exporting four types from a `"use server"` module
and called that a second instance of the outage defect, caught by reading
before a build caught it. That is not what happened, and the worker who
reported it went back, probed the rule rather than believing its own reading,
and told me so unprompted. This is the corrected entry; the wrong one is
quoted above rather than quietly replaced, because a ledger that edits its own
mistakes out is worth less than one that keeps them.

**THE DISTINCTION, WHICH IS SHARP AND WHICH 10.7 STATED TOO LOOSELY.**

```ts
export type Thing = { a: string };   // DECLARATION. Legal. Erased whole.
export type { Thing };               // RE-EXPORT STATEMENT. Breaks the build.
```

A type declared inside the module is erased by the compiler and no export
statement survives into what the bundler reads. A re-export is a STATEMENT:
tsc erases it, and Turbopack still asks the server-actions manifest for an id
that is not there. Only the second one took production down.

The evidence, probed rather than read. A synthetic `"use server"` module
carrying all four shapes reports exactly two: the re-export and the exported
const. It stays silent on the type declaration and on the async function.
Reproducing the four exports that were actually in `lib/auth/actions.ts`, all
of them declarations, eslint reports nothing, correctly. **Nineteen other
`"use server"` modules in this tree do the same thing**, including
`lib/wallet/actions.ts` with five of them, and production is green.

So B3's `nf/server-actions-export-only-actions` rule was not silent on its own
case. It was correctly silent on a non-case, and it reports zero across the
tree, which is the number its own header predicts.

**10.7's WORDING IS AMENDED** from "async functions and nothing else, not even
a type re-export" to the sharper form: **a `"use server"` module may export
async functions and may DECLARE types; it may not carry an export STATEMENT
for anything else, and `export type { X }` is such a statement.** The old
wording read as though "nothing else" covered declarations and the re-export
clause were emphasis. It is the reverse: the re-export clause IS the rule.

**THE MOVE STANDS ANYWAY, as a tidy-up and not as a fix.**
`lib/auth/form-state.ts` needs to exist for an independent reason: the
deactivated-sign-in notice and the form state it extends have to be testable,
and a helper inside a `"use server"` file can never be reached by a test.

**THE FAULT FAMILY, recorded because it caught a careful worker in the same
session it was quoted at them.** `check-css-tokens.mjs` opens by saying its
author reported one of these to their own coordinator as live code, in a
report about this exact fault, and that knowing about the family does not
protect you. Here the ledger's own imprecise wording became the premise, the
premise became a finding, and the finding became a ledger entry, which would
have made the imprecision permanent. It was caught only because a worker
re-checked a claim it had already been thanked for.

`account-purge` is now in `WATCHED_JOBS`, which is unrelated to the above and
is true. It was scheduled and reporting and unwatched, and it is the job where
silence costs most: a deletion request carries a thirty day clock somebody was
told about in writing, and the only thing honouring it is this job firing. A
purge that quietly stops is a promise quietly broken, and nobody outside will
notice, because the people waiting on it have already left.


### 11.15 The security advisor, run after the day's migrations, and what it actually found

Run on the live project after all seven migrations landed. Thirty findings,
triaged one by one rather than counted.

**THE ONE THAT MATTERED, AND IT CAME BACK CLEAN.** Twenty-three SECURITY
DEFINER functions are callable by `authenticated` over `/rest/v1/rpc/`, eight
of them named `admin_*` or doing admin work: retiring example listings,
reading revenue, resolving an escrow, reviewing a KYC document, setting a fee
rate, looking a user up by email. If any one of those trusted the caller
rather than checking them, any signed-in person could call it over REST and
the platform would have a privilege escalation. **Every single one guards
internally**, checked by reading each definition for a role check rather than
by trusting the pattern: `admin_expire_stale_withdrawal_holds`,
`admin_payment_health`, `admin_retire_demo_listings`, `admin_revenue_summary`,
`admin_user_id_by_email`, `escrow_admin_resolve`, `review_kyc_document` and
`set_fee_rate` all refuse a caller without the role. The advisor is reporting
exposure, not a hole.

The unguarded remainder are all correctly user-scoped: `end_session`,
`end_other_sessions`, `my_sessions`, `current_agent_id` and all four escrow
verbs read `auth.uid()` and act only on the caller's own rows.
`agent_trust(uuid)` takes any uuid and is anon-callable, and that is intended:
it returns a public reputation summary for an agent, and nothing at all for a
uuid that is not one. `platform_stats()` is anon-callable because the landing
band reads it unauthenticated.

**WHAT WAS CLOSED.** Both example-refusal trigger functions were reachable at
`/rest/v1/rpc/`, one of them by `anon`. A trigger function has no meaning
outside a trigger and a direct call can only raise, so nothing was
exploitable. It is closed anyway, because an entry point that exists by
accident is how a real one gets lost in the noise, and a checklist that has
learnt to ignore two warnings has learnt to ignore the third. Migration
`20260919190000`, probed: neither client role can call either function, and
the example refusal still fires on an ordinary update, because Postgres does
not check EXECUTE when firing a trigger.

**THE ASYMMETRY WORTH REMEMBERING.** The business guard was reachable and the
listing guard was not, for one reason: the business one was CREATED today, and
Supabase ships `alter default privileges ... grant all on functions to anon,
authenticated`, so **every new function in this estate is born public**. The
listing one was a `create or replace` and kept its existing grants. Every
migration from here revokes the default grant on any function it creates, and
B4's finding about the same default on 80 tables is the same fact wearing a
different hat.

**LEFT ALONE, WITH REASONS.** `idempotency_records`, `platform_revenue` and
`rate_limits` have RLS enabled and no policies, which the advisor rates INFO.
That is the correct shape for a service-role-only table: RLS on with no policy
denies every client role by default, which is stronger than a policy nobody
has read. `verification_is_required` is already B4's parked migration.

**FOR THE FOUNDER, added to section 9.** Leaked password protection is
disabled. Supabase checks a new password against HaveIBeenPwned and refuses a
known-compromised one. It is one toggle in the dashboard, it costs nothing, it
cannot be set from here, and on a platform holding a naira wallet it is the
cheapest security win available.

### 11.16 THE THIRD REASON THE HARNESS LIED, AND WHY TWO FIXES DID NOT SHOW IT

Three separate faults produced one indistinguishable symptom today: a fullpage
proof of a marketing page coming back as the hero and then thousands of pixels
of empty navy. Each was found, fixed, and believed to be the cause.

1. **No `backdrop-filter`.** Headless Chromium here has no GPU and drops the
   property silently, so every glass surface painted as a flat wash. Fixed
   with SwiftShader flags at `04e874b`.
2. **The Content Security Policy refused Turbopack's own dev chunks.**
   `strict-dynamic` with a nonce the HMR runtime does not carry, so hydration
   never completed and no mount effect ever ran. Fixed in `csp.ts`, for
   development only.
3. **`window.scrollTo(0, y)` DOES NOTHING.** `base.css` sets
   `html { scroll-behavior: smooth }`. A smooth scroll is an animation, and in
   headless Chromium with no compositor the animation never advances, so the
   call returns having moved nothing. It does not throw and it does not warn:
   `window.scrollY` reads 0 immediately after, at 80ms and at 500ms, while a
   real wheel gesture of the same distance scrolls normally. F2 measured
   exactly that after confirming the CSP fix was live on the wire and the
   bands were STILL blank.

The prime loop in `verify-desktop.mjs` is built on `window.scrollTo(0, y)`, so
it primed nothing and no IntersectionObserver below the fold fired, whatever
the other two faults were doing. It now passes `behavior: "instant"`, which
opts out of the CSS smooth behaviour for that call only.

**AND IT NOW CHECKS ITSELF.** After the prime it counts `.nf-reveal` nodes and
how many are actually visible, and prints a warning naming the shortfall when
they do not match. A harness that cannot tell whether it primed is a harness
that will lie a fourth time. This is the rule from 11.9 made mechanical: an
instrument that has never been checked against a known answer is not evidence,
so the instrument now answers for itself in every shot it takes.

The lesson that cost the most here is not any of the three faults. It is that
after fixing the first, and again after fixing the second, the symptom was
unchanged and nobody read that as "there is another cause". One fault per
symptom is an assumption, not an observation.

### 11.17 ONE UNLAYERED LINE WAS CANCELLING EVERY BRAND EDGE IN THE PRODUCT

This is the answer to the founder saying, in four separate messages across two
days, that the containers still read dull. Everybody believed him and nobody
found it, because the fix kept being made and kept passing every check.

`apps/web/src/app/css/base.css` carried, UNLAYERED:

```css
* {
  border-color: var(--nf-border-subtle);
}
```

Every component partial in this product is inside `@layer components`. An
unlayered declaration beats every layered one WHATEVER THE SPECIFICITY, so
`*` at specificity zero was outranking `.nf-chip` at specificity ten. Every
`border: 1px solid var(--nf-brand-edge)` written anywhere in the product
resolved to white at eight per cent.

**WHAT IT COST.** It is R1's finding A5 seen from underneath. Three workers
spent this cycle moving resting controls off grey hairlines and on to the
brand edge. A ninth rule was added to `check-css-tokens.mjs` so it could not
regress. The checker passed, because it greps SOURCE TEXT and the source text
was correct. On screen, nothing moved. The glows landed, because nothing
resets `box-shadow`, which is exactly why the controls improved enough to look
like progress and nobody went further.

F4 found it by measuring a running page rather than reading the file: two
chips it had just set to `--nf-brand-edge` computed `rgba(255,255,255,0.08)`,
and a ring in light computed `rgba(18,21,26,0.08)`, a value neither its base
rule nor its light rule mentions.

**THE FIX, AND WHY DELETING THE LINE WOULD BE WRONG.** Without it,
`border: 1px solid` with no colour resolves to `currentColor`, so every
hairline inherits its text colour and turns near-white. Tailwind's preflight
carries the same declaration for the same reason. So it moves into
`@layer base` rather than going away. Base loses to components, which is the
whole point of the layer order: a component that states its own border colour
wins, and an element that states none still gets a sensible default instead of
its own ink. The rest of `base.css` stays unlayered deliberately, because a
focus ring and a skip link SHOULD outrank a component and they set no property
a component competes for.

**MEASURED, NOT ASSUMED.** A dev server, a real browser, computed styles
before and after, including an injected probe element carrying a component
class so the test could not be confounded by the page's own markup:

| element | before | after |
| --- | --- | --- |
| injected `.nf-glass--card` | white 8% | brand blue |
| `.nf-btn--glass` | white 8% | brand blue |
| `.nf-icon-btn` | white 8% | brand blue |
| `.nf-chip` on a site page | white 11% | brand blue |

The chip needed a second fix, found by the same measurement. It still came
back white at eleven per cent after the layer change, because
`.nf-site-head .nf-chip` in `site.css` overrode the primitive with
`--nf-landing-hairline`. Its other two declarations are doing real work, since
that chip sits on photography and takes the landing ink and fill; the border
was the odd one out, and the governing images have no grey chip edge anywhere,
on photography or off it. Both themes now take `--nf-brand-edge`, one rung
above the primitive's soft, because soft is tuned to hold against a flat dark
page and this one has a photograph behind it.

**THE RULE THIS EARNS, and it is the third time today the same lesson has
arrived wearing different clothes.** A guard that reads source text proves
what was written. It cannot prove what the browser resolved. `check-css-tokens.mjs`
is still worth having and it caught real faults this week, but it passed a
product whose brand edges did not exist. From here, a visual ruling closes on
a COMPUTED value from a running page, not on a diff, and the two proofs above
are the shape of that: read the variable, read the element, and inject a probe
so the page's own markup cannot flatter the answer.

The other two instances today: the screenshot harness rendering no
`backdrop-filter` and then never scrolling, and a lint rule believed silent on
a case that was not a case. All three are the same failure, which is trusting
an instrument that has never been checked against a known answer.

---

## 12. The founder's rulings of 19 September, evening, and what each one closed

### 12.1 THE BUNDLE IDENTIFIER IS `com.vallospaces.app`, AND THAT WINDOW IS NOW SHUT

The founder confirmed that no store record exists on either platform, nothing
has been submitted and neither developer programme has been enrolled in. So
the identifier changed, in one pass, before anything else touched native.

`ng.vallo.app` was reverse DNS of a domain that was never registered and has
been dropped. `com.vallospaces.app` is reverse DNS of the domain the company
owns. Seven places carry it, in five syntaxes, and every one of them moved:

| where | what changed |
| --- | --- |
| `capacitor.config.ts` | `appId` |
| `android/app/build.gradle` | `namespace` and `applicationId` |
| `android/.../java/**/MainActivity.java` | the `package` line AND the directory it lives in |
| `android/.../res/values/strings.xml` | `package_name` and `custom_url_scheme` |
| `ios/App/App.xcodeproj/project.pbxproj` | `PRODUCT_BUNDLE_IDENTIFIER`, both configurations |
| `public/.well-known/assetlinks.json` | `package_name` |
| `public/.well-known/apple-app-site-association` | the `appIDs` entry behind the team id |

`brand-domain.test.ts` gained eight assertions covering all seven, including
that the Java file sits at the path its `package` line names, that EVERY iOS
build configuration carries it rather than the first one found, and that no
file anywhere still contains `ng.vallo.app` or `ng.rentme.app`. Fourteen
assertions in that file now, all passing.

**WHY A TEST AND NOT A NOTE.** None of those seven files is TypeScript. Gradle
will build a package whose `applicationId` disagrees with `assetlinks.json`
without a word, and the only symptom is that Android App Links stop verifying
and every shared link opens a browser for ever. That is the same silent class
as the domain itself.

**THE WINDOW IS SHUT.** Google Play will not change an application id once an
app record exists; Apple treats a change as a different app. The stop list's
ban on touching native identifiers stands for every worker, with this one
change recorded as the exception it was.

**THE FOUNDER'S NOTE TO HIMSELF, recorded here because he asked for it to be:**
enrol on both programmes as the ORGANISATION, VALLO SPACES LTD, using the
company registration, never as an individual. Moving an app from a personal
account to a company account afterwards is a migration nobody wants, and on
Apple it needs both parties and a support case.

### 12.2 THE AUTH SCREEN IS DARK IN BOTH THEMES, AND THAT IS CLOSED

The founder's ruling, now rule 22. Sign in, sign up and first run keep the
dark register whatever the OS or the theme control says. It is the register
setter for a money product and every serious one does this. It is not waiting
on an asset and it is not reopened.

This closes R1's A22 as a question rather than as a defect: the sign-in lockup
staying dark on paper is now correct behaviour, not a bug. What remains of
A22 is the parts that are genuinely broken in light, the language control
that was white on white and the missing aurora plate, and F1 has already
closed both.

A LIGHT INK WORDMARK IS STILL NEEDED, for the surfaces that are genuinely
white: email headers, receipts and PDFs, the store listing, print. The founder
is having it made. Until it exists, those surfaces use the TEXT wordmark and
never a filtered version of the photographic render, because an ink version of
a photographic render is a new render and not a filter.

### 12.3 BORN LOCKED, NEVER BORN PUBLIC

Now rule 21, and it comes straight out of the security advisor run in 11.15.
Every migration that creates a `SECURITY DEFINER` function revokes EXECUTE
from `anon` and `authenticated` in the same migration, grants it back only to
the roles that need it, and proves the revoke in its probe rather than
assuming it.

The founder's phrasing is better than mine and is the rule's name.

### 12.4 THE HARNESS IS HONEST NOW, AND HERE IS THE MEASUREMENT THAT SAYS SO

The founder's instruction is that every visual proof taken on 19 September is
void and no frontend scope closes on one. That is correct, and this is the
evidence that the next one will be worth something.

Measured on a live dev server, on the landing page, at 1440:

| | before the prime | after the prime |
| --- | --- | --- |
| `.nf-reveal` bands visible | 1 of 21 | **21 of 21** |
| `window.scrollY` after a 4,526px page was primed | 0 | 3,626 |
| elements resolving `backdrop-filter` | | 10 |
| console refusals, page errors, websocket failures | | 0 |

And separately, on `/contact`: 246 of 320 elements carry a React fiber, so
hydration completes.

**THE REPORT THAT SAID HYDRATION NEVER COMPLETES DOES NOT REPRODUCE.** A
worker reported one element with a fiber, `NEXTJS-PORTAL`, and an HMR socket
failing, and suspected `proxy.ts`. It also reported, honestly and unprompted,
that it had written a stale copy of `csp.ts` back over the development branch
and restored it from a backup taken minutes earlier. Its measurement was
almost certainly taken against that stale copy. `proxy.ts` needed no change,
and I did not make one: a fix applied to a fault that does not reproduce is
just a new fault waiting.

**BOTH HARNESSES NOW REFUSE TO WRITE A SHOT THEY CANNOT STAND BEHIND.**
`verify-desktop.mjs` counts the reveals after its prime and warns by name when
they do not all show. `verify-shots.mjs`, which captures the viewport only,
now FAILS a route outright when a band that is ON SCREEN is still at opacity
zero, because that means React has not hydrated and the shot is of a page
nobody meets. It writes no file in that case, so a broken shot cannot be
mistaken for a proof later.

That is the 11.9 rule made mechanical in both directions: an instrument that
has never been checked against a known answer is not evidence, so each
instrument now answers for itself on every shot it takes.

**THE FIRST HONEST PROOF OF THE DAY**, and it shows the cascade fix landing:
the city chips, the search well, the feature plates and the ghost button all
carry the lit brand edge on screen, the search pill reads Buy / Rent / Stay
with no Invest, and the overline reads PROPERTY / STAYS / RESTAURANTS. Those
are the three things the founder asked for and the three things that could not
be seen until now.

### 12.5 THE FIRST FIRST-PARTY VENUE, AND THE RESERVATION LOOP PROVED AGAINST IT

`Vallo House Kitchen`, Abuja, owned by the company's own account, `first_party`,
`is_demo = false`. Not example stock. It persists.

**HOW DISCOVERY WAS HANDLED, and the founder asked to be told which.**
`private.reservation_is_valid` refuses a table at a venue that is not
`PUBLISHED`, so the venue cannot be both bookable and hidden. The founder's
instruction allowed publishing and unpublishing straight after. I did better
than that: the whole thing, the publish, the reservation, the thread, the
confirmation, the cancellation and the return to `DRAFT`, ran inside ONE
transaction. Under MVCC no other session ever observed the published state, so
there was no window at all rather than a short one. The rows persist because
the transaction committed.

**WHAT RAN, in order, each wearing the right JWT so RLS decided rather than
the code:**

1. The guest held a table for four at seven tomorrow, as themselves. The
   insert survived `reservations_insert_own`, the capacity check against the
   service window, and the example refusal.
2. The thread opened on the reservation spine, `context_kind = 'reservation'`,
   and the guest spoke first.
3. The host confirmed, as themselves, and answered in the thread.
4. **A stranger read zero of it**: zero reservations, zero messages.
5. The guest cancelled, so nothing is left outstanding against the venue.
6. The venue returned to `DRAFT`.

**WHAT PERSISTS AND WHAT IT PROVES:** one venue with one service window and
one restaurant profile; one reservation, CANCELLED, answered, threaded, with
two real messages; and **five notifications** across both parties. The loop is
real end to end at the database and RLS layer, against inventory that is not
an example.

A second probe, rolled back, proves the venue is invisible: a signed-out
visitor reads zero catalogue rows and zero business rows for it, a stranger
reads zero of its reservations, **and 71 other venues remain publicly listed**,
so the zero is not vacuous.

**WHAT THIS PROOF DOES NOT CLAIM.** It ran through the database, not through
the React surfaces, because this sandbox has no login. The server actions call
exactly these paths, but nobody has watched the screens do it.

**THE FOUNDER MUST CHECK THE VENUE'S DETAILS BEFORE IT IS EVER PUBLISHED.**
Its address, phone and email are the company's own as best I know them, and I
do not know them well enough for a public listing.

### 12.6 THREE BLOCKERS BETWEEN THIS PROOF AND A REAL VENUE SIGNED THIS WEEK

Found independently by three workers, which is why they are recorded together
rather than in three places. The founder is signing a venue this week and none
of these can wait.

1. **NOTHING IN THE PRODUCT CAN PUBLISH A RESTAURANT.** `approveBusiness` only
   reaches `APPROVED`. The only code path that writes `PUBLISHED` on a
   business is `publishAccommodation`, which needs an `accommodations` row, a
   map pin, a photograph and a rated room type, none of which a restaurant
   has. There is no `/admin/businesses` route at all: `lib/admin/business-actions.ts`
   and `business-queries.ts` exist and NOTHING IMPORTS THEM. So the venue
   above could only be published by somebody writing SQL by hand, which is
   exactly what I did and is not a process.
2. **THE OWNER HAS NO DESK.** `private.notify_reservation` points a business
   host at `/host/reservations`, which does not exist. The only reservations
   board is `/agent/bookings`, behind `getAgentContext`, which requires an
   `agents` row. A restaurant owner onboarded through the host wizard has a
   `businesses` row and no `agents` row, so they can be sent a table and have
   nowhere to accept it. The reader that surface needs,
   `getHostReservations`, already exists and has no caller.
3. **A RESTAURANT CANNOT CARRY PHOTOGRAPHS.** There is no photo table on the
   business spine: `listing_photos` hangs off `listings` and
   `accommodation_photos` off `accommodations`. The restaurant detail page
   hard-codes `photos: []` and draws a category plate with an honest "no
   photographs yet" chip, so nobody is misled, but an owner's photographs
   cannot go up on the day they sign.

**AND ONE THING THAT IS NOT A BLOCKER BUT IS A LIE WAITING.** The verified
badge has TWO derivations that never meet: `businesses.verified` comes from
`business_verification_checks` by trigger, while the catalogue projection's
`verified` comes from `agent_badges.verified` through `businesses.agent_id`.
On top of that the restaurant detail page hard-codes `verified: false` for a
business-spine venue whatever either says. So a restaurant shows no verified
mark today however many rungs it passes, and the day somebody fixes the page
without reconciling the two derivations, a venue will wear a badge that no
human check earned. Rule 12 is absolute, so the two derivations reconcile
before the page changes, not after.

---

## 13. THE SHAPE LAW AND THE MEASURED PALETTE (founder's ruling, 19 September, night)

The founder put the built landing beside
`docs/design/references/GOVERNING-landing-desktop-hero.png` and ruled. Two
things were wrong and both were shipping on every screen.

### 13.1 THE SHAPE LAW, ABSOLUTE

**Any control that carries TEXT is a rounded rectangle on
`--nf-radius-control`, never a capsule.** Every primary and secondary button,
every chip, every segment, every tab, every filter chip, every input, every
dock label, every sheet action, every admin control. Zero occurrences of
`999px`, `9999px`, `rounded-full` or `--nf-radius-pill` on a text-bearing
control anywhere in the tree.

The only things that stay circular are genuinely icon-only round controls that
are round in the reference: an avatar, and a bare icon button such as the nav
search glyph.

**THIS OVERRIDES THE AMENDMENT IN SECTION 8** that let a governing image bend
the shape law, and it overrides the paragraph in `DESIGN_DIRECTION.md`
section 1 that said control shape follows the render. It does not. It follows
this ruling.

**AND THE AMENDMENT WAS WRONG ABOUT THE IMAGE IT CITED.** `landing.css`
carried `.nf-landing .nf-btn, .nf-site .nf-btn { border-radius: pill }` under a
comment reading "the render's buttons are capsules". Open the reference and
count: there is not one capsule in it. Explore Properties, Explore Stays, Sign
In, Get Started, the four city chips and the four search segments are all
rounded rectangles. The only circle on the screen is the bare search glyph,
which carries no text. That one rule was most of what the founder was looking
at, and it was granted on a reading the image does not support.

**ONE CLARIFICATION, WHICH IS THE LAW RATHER THAN AN EXCEPTION TO IT.**
`--nf-radius-control` is 14px. On a 44px control that draws a rounded
rectangle; on a 28px chip it is half the height and draws a capsule again,
returning the exact shape the ruling forbids. So chips under about 32px take
`--nf-radius-sm` (10px), which is the same shape language at a smaller size,
and which is how the reference draws its Verified badge and its card tags.

### 13.2 THE PALETTE, MEASURED RATHER THAN EYEBALLED

`scripts/design/sample-reference.mjs` reads the reference PNG itself, in
headless Chromium via a canvas, averaging a small box at each named point so
one pixel of photographic grain cannot decide a token. It also walks outward
from the primary button's edge and prints the falloff, because a glow is a
radius, a spread and an opacity and one sample cannot tell those apart.

| what | reference | ours, before | ours, after |
| --- | --- | --- | --- |
| page canvas | `#000612` | `#000010` | `#000612` |
| brand primary | `#0167FE` to `#006DFE` | `#0010E0` | `#0069FE` |
| glow ink | follows the button | `#0C39EF` | `#0069FE` |
| glow rung 1 | | 16% | 10% |
| glow rung 2 | | 30% | 19% |
| glow rung 3 | | 50% | 32% |
| glow rung 4 | | 70% | 46% |
| lit edge blur | | 16px and 44px | 10px and 22px |
| strong edge blur | | 18px and 56px | 12px and 28px |
| primary resting bloom | | 14px and 30px | 8px and 18px |
| marketing primary bloom | | 24px flat | 12px at -2 |

**THE BRAND BLUE WAS THE BIG ONE.** The product shipped `#0010E0`, far darker
and pulled towards violet. The reference is `#0069FE`, a brighter azure, and
it is why our buttons read as a different product from the render beside them.
White still clears AA on it at about 5:1, which is lower than `#0010E0` gave
and is the cost of matching the reference rather than an oversight.

**THE GLOW FALLOFF, MEASURED BOTH SIDES.** In the reference the light is gone
twenty pixels from the button's edge: `#0380FB` on the button, then `#43489D`,
`#483E77`, `#4D3C64`, and the ground has returned by `#262B4C`. Ours, measured
the same way on a production build after the change, dies by about thirty:
`#00255F` at the edge, `#000C1F` at five, `#000918` at fifteen, and canvas
`#000612` by thirty. Close, the right register, and no longer the neon the
founder named. The container border lands at `#00255F` against the
reference's `#10345E`.

### 13.3 PROOF, AND THE RULE THAT MADE IT POSSIBLE

**`next dev` DOES NOT HYDRATE RELIABLY ON THIS BOX, AND `next start` DOES.**
A worker proved it with this repository's own tool: same route, same binary,
same verifier, four minutes apart, `verify-shots.mjs` failed on `next dev`
with "React has not hydrated" and passed on `next start`. Every proof from
here is taken from a production server. That is now the rule, and it is the
fourth distinct way this machine has produced a picture of a page nobody
meets.

The landing proof is taken and it is honest: every capsule gone, the search
container, the segments, the chips, both hero buttons and Get Started all
rounded rectangles at 14px measured off the live page, and the blue matching
the reference.

### 13.4 THE AMENDMENT IS WITHDRAWN AT ITS ROOT, NOT JUST OVERRIDDEN

Three places were still carrying the withdrawn law after the sweep, and a law
that survives in the text every worker restates is not withdrawn.

**Section 0's design law in one line** still read "control shape follows the
governing image (pills where it shows pills, the 14px control law amended, see
section 8)". That is the sentence each worker restates at the top of its
report, so every stint since the ruling would have restated the thing the
ruling closed. It now states the shape law and says in terms that it withdraws
the section 8 amendment.

**`--nf-radius-control-pill` still existed in `tokens.css`**, under a long and
genuinely well-argued comment: the renders draw capsules for the city chips,
the filter chips, the bloom lozenges, the For You / Following toggle and the
welcome CTA, and rectangles for the cards and fields, so the two shapes carry
two jobs, a capsule being a thing you flick between and a rectangle a thing
that holds content.

IT IS A GOOD ARGUMENT AND THE IMAGES DO NOT SUPPORT IT. The four city chips in
the governing reference are rounded rectangles. So are the four search
segments, and Explore Properties, Explore Stays, Sign In and Get Started. The
token is deleted rather than aliased to the control rung, because an alias is
a name that still invites the question the ruling closed, and its comment is
replaced by a note recording the argument so nobody rediscovers it and thinks
it was never made. The gallery entry went with it.

**Seven button-shaped SKELETONS were still capsules.** The tenth rule
correctly stays silent on them, because a skeleton is a span and not a
control, so it is the third kind the ruling says to leave. But a skeleton is a
picture of the thing it stands in for, and these were capsules standing in for
rounded rectangles, so the page visibly reshaped the moment it loaded, which
is the one thing a skeleton exists to prevent. The law reaches them through
what they are a picture of rather than through what they are.

**AND A DEFECT IN THE CHECKER ITSELF, found by a worker reading what its own
guard printed rather than trusting that it fired.** `withoutJsComments` opened
a block comment at any `/*`, and one file writes `accept="image/*"` on a file
input, so the stripper opened a comment inside a string literal and blanked
about nine hundred lines. Check two could not have reported anything in that
region and printed nothing, which reads exactly like a pass, and every line
number in such a file was shifted. Fixed by requiring a comment opener to
follow nothing, whitespace, or an opening bracket, comma, semicolon, colon or
equals, and proved with an ordered probe. It was hiding nothing today, which
is luck rather than a result.

### 13.5 THE DOCK WAS A CAPSULE, AND THE COMMENT ABOVE IT HAD ALREADY ARGUED IT SHOULD NOT BE

Caught by looking at a production shot beside the governing image rather than
by grepping, which is the only way this one could have been caught.

`.nf-tabbar` carried a note that reads the founder's target correctly: "It is
a ROUNDED RECTANGLE, not a true pill, so `--nf-radius-2xl` is right and the
pill radius is wrong." The reasoning is right. The number is not. The bar is
about 66px tall and `--nf-radius-2xl` is 32px, so twice the radius is the whole
height and the corners meet in the middle: it draws semicircular ends, which
is exactly the shape the note is arguing against, reached by the token the
note chose.

It is the same trap the 28px chips fell into, and it is worth stating as a
rule rather than as two incidents. **A SHAPE RULING IS ABOUT THE RATIO, NEVER
ABOUT THE TOKEN NAME.** The same radius token is a rounded rectangle on a tall
element and a capsule on a short one, so "it uses the control radius" is not a
proof that a control is a rectangle, and the tenth rule cannot see this at all
because the source text is correct. Only a picture catches it.

`--nf-radius-xl`, 22px on a 66px bar, leaves a clear straight edge down each
side, which is what `GOVERNING-home-markets-target.png` draws: its dock has
visibly vertical ends with rounded corners, not half circles.

**THE SAME IMAGE SETTLES THE REST OF THE CHROME**, and it agrees with the
desktop hero on every point: the search field is a rounded rectangle, its
submit is a rounded SQUARE, all nine market tiles are rounded rectangles, the
Explore button is a rounded rectangle, the Verified badge is a small rounded
rectangle and the four city chips are rounded rectangles. The only circle on
the entire screen is the avatar.

**PROOFS, FROM A PRODUCTION SERVER**, in `docs/design/proofs/lead/`. The search
surface at 390 dark: the menu button, Sign in, Sign up, the search field, the
filter button, all three filter chips, "List your place" and now the dock are
every one a rounded rectangle, and there is no capsule on the frame.

### 13.6 THE CHROME, MEASURED, AND THE HEADER WAS ALREADY RIGHT

The founder's point three asked for the header and the dock to match the
reference exactly: the same bar fill, the same hairline, the same glass depth,
the same glow on the icon buttons, the same spacing rhythm.

The desktop hero cannot answer that. It has no bottom dock and its header
floats over a photograph, so neither can be read from it. So
`scripts/design/sample-reference.mjs` now takes `--chrome` and reads
`founder/GOVERNING-home-markets-target.png` instead, which draws the header,
the dock, the tiles and the chips against the product's own ground.

**THE HEADER HAS NO BAR AND NO HAIRLINE, and the numbers are unambiguous.**

| sampled | value |
| --- | --- |
| canvas beside the lockup | `#000312` |
| any bar fill behind the lockup row | `#000311` |
| the hairline under the header | `#000312` |

Three samples, one colour. There is no bar and there is no line; the header
simply sits on the page. Ours already does exactly this: measured on a
production build, `.nf-app-header` computes a transparent background and the
pixels one, two and eight pixels below it are identical to the ones inside it.
R1's A38 was closed properly and this confirms it rather than taking its word.

**THE DOCK EDGE WAS A QUARTER TOO BRIGHT.** Reference top border `#012E78`,
ours `#003C94`. Same hue, measurably brighter. Working it back through the
mix, the ground is `#000612` and the glow ink is `#0069FE`, so the reference
is that ink at about forty per cent and ours was it at fifty, which is the
full `--nf-brand-edge` rung. It now takes `--nf-brand-edge-soft` at
thirty-five, which lands just under the reference instead of a quarter over
it, and which is a rung that already exists rather than a fourth invented to
hit one number.

**AND THE FINDING THAT MATTERS MOST FOR THE REST OF THE SWEEP: THE REFERENCE
DOES NOT USE ONE EDGE EVERYWHERE.** Its market tiles measure `#1A5CA5`, far
brighter than the dock's `#012E78`. A card and a bar are not the same object
and the reference treats them differently. So "match the border brightness" is
a per-surface reading and never one global number, and anybody who tunes
`--nf-brand-edge` to satisfy one surface will break another.

The rest of the chrome reference, recorded because five workers are sweeping
against it tonight: dock bar fill `#000C2E`, active slot ink `#0257FD`,
resting slot ink `#001237`; market tile fill `#000C27` with border `#1A5CA5`
and a BRIGHT `#0785FD` plate behind its glyph, which is the founder's
"make the icon containers the branding colour" measured; search field border
`#002E7A` with a `#3C7CFC` rounded-square submit; city chip fill `#030C23`
with border `#002051`; the invest band fill `#000E32`.

**THE DOCK'S LIGHT DIES WITHIN TEN PIXELS.** Walking upward from its top edge:
`#00296F` at the edge, `#010B2A` five pixels up, `#000A27` at ten, and it has
settled by fifteen. That is the same tight, contained register as the primary
button's twenty pixels, and it is what the founder means by glass rather than
neon.

---

## 14. A1's database cycle of 19 September, night: the three unapplied migrations

**All three applied, all three probed, every probe ended in its own deliberate
raise and rolled back.** The rules and the stop list were restated before
anything was touched, as section 0 requires. No build was run, the full vitest
suite was not run, and the only toolchain command in this cycle was
`npx tsc --noEmit -p tsconfig.json` from `apps/web`, which the lead confirmed
was fine to run unlocked while four other builds held the box.

**WHAT LANDED, AND THE VERSION NUMBERS ARE NOT THE FILENAMES, WHICH IS THE
FIRST THING THAT WILL BITE THE NEXT PERSON.** The Supabase MCP
`apply_migration` tool assigns its own timestamp at the moment of application
and ignores the one in the filename. So the three files went on as
`20260919213006 p1_a_business_is_never_left_ownerless`,
`20260919214015 p1_a_future_event_is_cancelled_with_notice` and
`20260919214402 p3_a_restaurant_can_carry_photographs`, while the files on disk
are still named `20260919210000`, `20260919210100` and `20260919220000`.
Anybody who later reconciles this repository against the remote with
`supabase db push`, or who compares `supabase_migrations.schema_migrations`
against `ls supabase/migrations`, will find three pairs that do not line up by
version even though the SQL is identical. That is a property of the tool and
not a mistake in the files, but it is invisible until it is confusing, so it is
recorded here. The second file genuinely depends on the first, because
`close_future_commitments` reads `public.business_transfers`, and the applied
order preserves that.

**THE ORDER OF EVENTS.** `list_migrations` confirmed all three were unapplied
and that the estate stood at `20260919181950`. Each file was read in full
before it was applied, and each was reconstructed and diffed byte for byte
against the file on disk before its text was handed to `apply_migration`, so
that no transcription error could reach a live database behind a
`{"success":true}`. `list_migrations` was re-checked immediately before the P3
file, together with a direct look at `to_regclass('public.business_photos')`,
and P3 had applied nothing, so that migration was A1's to run after all.

**RULE 21 WAS VERIFIED INDEPENDENTLY OF WHAT EACH FILE'S OWN PROBE HAPPENS TO
NAME, for every SECURITY DEFINER function the three files create.** That is
eleven functions. The first file creates five in `public` and replaces a sixth,
and every one carries `revoke all ... from public, anon, authenticated` before
its grant: the four service-role-only ones
(`offer_business_transfer`, `respond_to_business_transfer`,
`withdraw_business_transfer`, `user_id_by_email_for_transfer`) are granted back
to `service_role` alone, and the two guarded readers
(`business_transfer_board`, `account_deletion_blockers`) are granted back to
`authenticated, service_role` deliberately. The second file creates one,
`close_future_commitments`, granted back to `service_role` alone. The third
creates three in `private`, of which only `business_is_public` is granted back,
to `anon` and `authenticated`, because it is read inside the photo table's
SELECT policy and a signed-out visitor looking at a published venue must be
able to execute it, which is the same grant `private.accommodation_is_public`
has carried since M3. **The P3 file needed no correction**: all three of its
functions already revoked.

**PROBE ONE, `p1_a_business_is_never_left_ownerless`: PASSED ON THE THIRD RUN,
AND THE TWO FAILURES WERE BOTH THE PROBE RATHER THAN THE MIGRATION.** The final
output was
`ERROR: P0001: PROBE ALL PASS p1 business transfer, rolling back`.

The first failure was
`ERROR: 42501: account_deletion_blockers may only be asked about yourself`,
raised from line 19 of that function at the probe's assertion 6a. The probe
called `public.account_deletion_blockers(seller)` while running as `postgres`
with no `request.jwt.claims` set at all. The function's guard asks two
questions, whether the caller's claimed role is `service_role` and whether
`auth.uid()` is the subject, and under `apply_migration` the answer to both is
no: `coalesce(claims ->> 'role', current_user)` resolves to `postgres` and
`auth.uid()` is null. So the function refused, correctly, and it was the probe
that was wrong. **This is worth dwelling on, because the tempting reading is
that the migration had broken the guarded reader.** It had not. That guard is
pre-existing, the file preserves it verbatim under a header that says every
other line of the function is unchanged, and refusing an unauthenticated caller
who asks about a named person is precisely its job. The probe now sets
`request.jwt.claims` to the seller's own `sub` around both blocker calls and
clears it afterwards, which is what the deletion screen genuinely does.

The second failure was
`ERROR: P0001: FAIL 3: the offer was refused: {"reason": "receiver_unavailable", "offered": false}`.
The probe chose its `buyer` positionally, as the second row of `auth.users` by
`created_at`, and on this estate that account is banned and has neither a
confirmed email address nor a confirmed telephone number. `offer_business_transfer`
refused it on the banned check, which is tested before the contactable check,
which is tested before the leaving check. **The migration was right twice over
here: it refused to hand a business to a banned account, and it refused for the
correct one of the three reasons.** The fixture is now chosen by the
eligibility predicate rather than by position, and it additionally requires the
seller to own no business and hold no agent row, because assertion 6b asserts
that the seller's `owned_businesses` falls to zero once the probe's business
has moved, and a seller who already owned a published business would have
failed that assertion on a business the probe never created. This is the same
class of fault as the verified-agent fixture recorded earlier today, and it is
now twice that a positional pick off `auth.users` has produced a false red. The
lesson for the next probe author is blunt: **on this estate, never take the
first or the second row of `auth.users` as a fixture. Select by the predicate
the function under test actually enforces, and fail loudly when the estate
cannot supply one.**

**THE PROBE IN THAT FILE WAS CORRECTED IN PLACE AND STRENGTHENED, AND THE
CORRECTION IS COMMENTS ONLY.** The probe lives in the file's header as a
commented block, so replacing it changes nothing executable. This was verified
rather than assumed: the executable tail of the file, from
`/* --- the offer */` to the last line, is byte identical to the text that was
applied, and every differing line in the whole file begins with `--`. The
committed block now extracts to exactly the SQL that passed. Leaving the old
block in place would have guaranteed that the next person to run it hit both
failures again.

**AND ON THE LEAD'S INSTRUCTION, THE PROBE NOW PROVES THE GUARD RATHER THAN THE
PRIVILEGE BIT, WHICH IS ASSERTION 8.** `business_transfer_board` and
`account_deletion_blockers` are deliberately executable by `authenticated`,
because the transfer screen and the deletion screen call them as the signed-in
person, and that grant is correct and must stay. It follows that
`has_function_privilege` proves nothing at all about whether those two are safe.
What keeps a stranger away from somebody's wallet balance, held escrow and
future bookings is the self-only guard in the body, so the probe now wears a
stranger's `authenticated` JWT and asserts that the board answers with BOTH
lists empty and that `account_deletion_blockers` is REFUSED outright with
`insufficient_privilege`. The refusal matters more than an empty answer would:
a reply of zeroes is indistinguishable from an account that genuinely has
nothing, whereas a refusal is the guard visibly holding.

**PROBE TWO, `p1_a_future_event_is_cancelled_with_notice`: PASSED FIRST TIME.**
The output was
`ERROR: P0001: PROBE ALL PASS p1 future events cancelled with notice, rolling back`.
It proved the revoke, that a request inside its grace window is refused with
`not_due` so the function can never cancel somebody's evening early, that a
future event becomes CANCELLED carrying a reason and that the attendee's
notification count rises, that the past event stays LIVE with its title intact,
that a second run cancels zero, and that a stranger wearing an `authenticated`
JWT reads zero of the notifications addressed to somebody else while those rows
demonstrably exist in the same transaction.

**PROBE THREE, `p3_a_restaurant_can_carry_photographs`: PASSED FIRST TIME.**
The output was
`ERROR: P0001: PROBE ALL PASS p3 business photographs: 1 photographs on the venue, a stranger read 0 of them while it was DRAFT and 1 once it was PUBLISHED, a forged write was refused, the shelf cover follows position, no badge lit, and the three functions carry exactly the grants the header names. Rolled back on purpose.`

**NOTHING WAS LEFT BEHIND, AND THIS WAS CHECKED RATHER THAN TRUSTED.** After
each probe the live tables were counted: zero rows in `business_transfers`,
zero in `account_deletion_requests`, zero in `business_photos`, zero businesses
named `Probe house, rolled back` or `Probe Photo Kitchen`, zero slugs matching
`probe-house-rolled-back-%`, zero catalogue covers matching `%/probe/%`, zero
cancelled events, zero suspended businesses, and `public.businesses` still
holding exactly the eight rows it held beforehand. The three probe runs also
left no rows in `supabase_migrations.schema_migrations`, because the deliberate
raise aborts the transaction the tool records the migration in, which is the
behaviour the probes depend on and which is now confirmed empirically rather
than assumed.

**WHY EVERY PROBE WENT THROUGH `apply_migration` AND NOT `execute_sql`.** The
MCP `execute_sql` tool runs as `supabase_read_only_user`, which carries
`rolbypassrls`, so it can never demonstrate an RLS refusal and cannot
`set local role authenticated`. A cross-user read run through it that returns
zero has proved nothing whatsoever. `execute_sql` was therefore used in this
cycle only for reads that make no RLS claim: counting probe leftovers, and
establishing which accounts satisfy the transfer eligibility predicate. Every
assertion about a refusal went through `apply_migration`, which runs as a role
that can switch into `authenticated` and be bound by the policies.

**THE TYPES.** `generate_typescript_types` was regenerated against the live
schema and written to `apps/web/src/lib/supabase/database.types.ts`, which went
from 5,549 to 5,697 lines. The change is purely additive: one hundred and
forty-eight lines added, nothing removed, which is why `tsc` was unaffected.
`npx tsc --noEmit -p tsconfig.json` from `apps/web` exits 0 with no
diagnostics, in fifty-six seconds.

**A DETAIL IN THAT REGENERATION THAT SAYS SOMETHING ABOUT THE STATE OF THE
TYPES FILE ON MAIN, AND IT IS WORTH KNOWING.** The committed file was out of
step with the database in both directions at once. It already carried
`business_photos`, whose migration had not been applied to the database by
anybody until this cycle, so the repository described a table that did not
exist. It was simultaneously missing `account_deletion_requests`, whose
migration `b5_an_account_can_ask_to_be_deleted` went on earlier the same day,
so it omitted a table that did exist. Both are now correct. The reading is that
the types file has been regenerated at moments that did not line up with the
applies, and anybody trusting it as a description of the live schema between
regenerations should not.

**WHAT WAS FOUND AND DELIBERATELY NOT FIXED.**

The P3 file is not idempotent. `create policy business_photos_select` and
`create policy business_photos_write` are not preceded by
`drop policy if exists`, which is the shape every other migration in this
repository uses and which the first P1 file's own header calls out as the
house convention. The table is `create table if not exists` and the functions
are `create or replace`, so everything else in that file would survive a second
run, but the two policies would raise `42710 policy already exists` and the
whole migration would abort. It applied cleanly once, which is all that was
needed tonight, so this was left alone: it is P3's file, it is not a rule 21
matter, and changing it would have meant editing another worker's file for a
fault that cannot bite until somebody re-runs a migration that has already
landed. **It will bite exactly then**, so it is written down here rather than
silently repaired.

`business_transfers.status` and `account_deletion_requests.status` both come
through the generated types as plain `string` rather than as a narrowed union,
because they are `text` columns with CHECK constraints rather than Postgres
enums. Anybody writing the transfer screen who expects the compiler to catch a
misspelled `'ACCEPTED'` will not get that help, and will need a hand-written
union or a runtime guard at the boundary. This is a consequence of the schema
choice, not a fault in it, and it was not changed.

The two derivations of the business `verified` badge still do not agree with
each other, as section 12.6 already records. The P3 file copies the `verified`
expression byte for byte and its probe asserts that photographs cannot light a
badge, which holds, so nothing here made it worse. It remains open.

**WHAT WAS NOT DONE, UNPROMPTED.** No `next build` and no `next dev` were run,
so nothing in this cycle is proven at a rendered surface and no screenshot row
in section 6 is claimed. The full vitest suite was not run, on the lead's
instruction that it produces false reds under this load. The server actions and
screens that will call `offer_business_transfer`,
`respond_to_business_transfer`, `withdraw_business_transfer` and
`business_transfer_board` do not exist yet and were not written; the four
service-role functions are reachable from nothing at all today, which is the
correct resting state for them but means the ONE LAW of rule 19 is not yet
satisfied for the transfer feature, which has a database write path and no UI
above it. `close_future_commitments` is applied but is not yet wired into the
purge job, which must call it immediately before `purge_account_rows` and in
its own transaction; until somebody does that, a purge will still orphan a
future event. Those three are the next person's work and none of them is
claimed here as done.

## 15. THE PLATFORM SWEEP, AND THE FIFTH TIME THE HARNESS LIED

Nine workers on the founder's shape and colour ruling. This is what it found,
written down because most of it is the same lesson in different clothes.

### 15.1 TWENTY-ONE CAPSULES AND NOT ONE GREP COULD HAVE FOUND THEM

Every breach fixed tonight had correct source text. `check-css-tokens.mjs`
rule 10 passed all twenty-one and it was right to: it reads source text, and
the source said `--nf-radius-control` every time. The defect is the RATIO, and
the ratio depends on a height the stylesheet never states.

They were found by measuring the drawn radius against the drawn short side on
a running page. `.nf-badge` asked for 14px and drew between 19px and 26.6px
tall, so every status chip in the product had semicircular ends: Waiting on
you, Live, Under review, Passed, In review, Founding host, Default, Verified.
Seven card plates, eight messaging plates, five social plates, two admin
counts. The `.nf-agent-card__pill` carrying the words "Verified agent" is the
clearest specimen of all: at 390 the label wraps, the box is 90x41 and the
ratio is 0.34, a tidy rectangle; at 1536 the label stops wrapping, the height
collapses to 23px and the SAME declaration is 0.62, a capsule. One rule, one
viewport apart, compliant and then not.

**AND THE RUNG BELOW THE RUNG.** `--nf-radius-sm` at 10px is still half of a
19px badge and drew the capsule straight back. The founder's clarification
named `sm` for a chip under about 32px and was written with a 28px chip in
front of him. The rule carries down to `--nf-radius-xs` at 6px below about
24px. It is a ratio rule, not a lookup table, and DESIGN_DIRECTION section 1
now says so with both original breaches named.

### 15.2 THE COUNT BADGE, RULED, BECAUSE THE PRODUCT CARRIED THREE ANSWERS

`threads.css` ruled it round in a considered comment. `admin.css` ruled the
opposite in its own. `chips.css` did a third thing. All three were reasoned
and they cannot all be right, so V5 put it up rather than pick one.

**The ruling is the rectangle.** The argument is the two-digit case: a 22px box
with a 22px MINIMUM width that grows sideways drew a circle at one digit and an
ELLIPSE at two, which is a capsule. A shape the content chooses is not a
decision, it is two decisions taken by the data. And the exemption list settles
the rest: it names a dot, a spinner, a progress ring, an avatar ring and a
story ring, and every one of them carries NO text. A numeral is text. The law
reaches it. All three files now carry one answer and the losing arguments are
kept in place rather than deleted, because the next person will make them
again.

### 15.3 THE LANDING SPENT ITS ONE PERMITTED CIRCLE IN THE TWO PLACES THE LAW
FORBIDS AND REFUSED IT IN THE ONE PLACE THE LAW NAMES

The law allows exactly one round icon-only control: the landing nav's search
glyph, because it is the only circle in the governing hero and the founder said
so in those words. That glyph was drawing a rounded rectangle at ratio 0.32,
while the two 44px search actions inside the hero pill, which no image draws
round, were both at 50 per cent. Corrected in opposite directions in one
tranche. The phone block at the foot of `landing.css` already had the right
shape for the submit; it was hiding inside a media query.

### 15.4 THE RETUNE HAD MOVED ONE RUNG AND LEFT THE FAMILY BEHIND

Section 13.2 measured the reference and moved `--nf-brand-primary` to
`#0069FE`, hue 215.2. It moved nothing else. So every accent the brand touches
was still the light and deep siblings of a primary that no longer existed:
`--nf-brand-quiet` at 228 (every price, every link, every star, every verified
badge, every focus ring), `--nf-electric-400/500/600/700` at 228 to 236 (the
brand accent, the brand border, the brand glow, all three mode inks), the hero
headline's own gradient, the CTA gradient, the canvas bloom, and the entire
LIGHT theme's brand primary, which had never been retuned at all. A fill said
one blue while its own border, its own glow and its own accent said another.

**Every night value is a pure hue rotation to 215.2, saturation and lightness
untouched to the decimal, and contrast goes UP in every case** because rotating
out of violet raises the green channel: brand-quiet 5.59:1 to 7.66:1,
electric-400 2.75 to 4.18, 500 2.08 to 3.52, 600 1.92 to 3.13, 700 1.47 to
2.09.

**Daylight pays for the identical rotation, and that is the part worth
remembering.** Against `#F4F5F7` paper, raising green LOWERS contrast: rotating
`--nf-brand-quiet` in place would have taken it from 7.44:1 to 4.63:1, spending
a third of the legibility of the ink people read links and prices in. So every
light literal is rotated to 215.2 and THEN stepped down in lightness until it
measures what it measured before, to two decimals. A hue fix that quietly
spends contrast is not a fix.

It stops at 215 and not at the reference's measured 197 because rule 8 reserves
bright cyan for PENDING, and a price that looks like a state is worse than a
price thirteen degrees warm. That last eighteen degrees is a ruling about rule
8, not about these tokens, and it is recorded rather than hidden.

### 15.5 THE FIFTH HARNESS LIE, AND IT IS THE WORST OF THEM

`verify-shots.mjs` never looked at the HTTP status. While the preview door was
shut it wrote PNGs of the 404 page and reported them as verified shots, and it
was RIGHT to by its own rules: the 404 page sets `data-theme` from the same
inline script, loads the same stylesheet, and has no Reveal bands to get stuck,
so all three of its assertions pass on it perfectly. Three workers did it
independently and between them nearly filed eight pictures of "This page has
checked out" as proof that a surface had been swept.

The other four lies produced a shot that LOOKED wrong. This one produces a tidy
empty screen, which is why it is the worst.

**A status check alone does not close it.** `notFound()` called from a layout
during streaming answers HTTP 200 WITH the not-found body. So `not-found.tsx`
carries `data-nf-not-found`, an attribute on the page rather than a class
sniffed from outside, and the harness refuses on either signal.

### 15.6 THE DOOR THAT TWO RULES HAD CLOSED BETWEEN THEM

Section 5 says a signed-in surface, an empty state or an error state is
photographed through the preview harness, because those cannot be reached
without a session. The founder says every proof comes from a server that
actually hydrates, which on this box means `next start`. But `next start` is
`NODE_ENV=production` and the harness layout was a bare
`if (production) notFound()`, so there was no way to photograph a signed-in
surface at all. Four workers hit the same wall inside an hour.

`previewHarnessIsOpen(env)` opens it on an explicit `VALLO_PREVIEW_HARNESS=1`
AND never on Vercel whatever that variable says. The second condition is the
one that matters: an environment variable alone is a footgun, because somebody
debugging will add it to project settings and fixture pages carrying invented
listings and invented money go live. `VERCEL` is set by the platform and a
deployment cannot lie about it, so the condition we do not control is the one
that fails closed. It is a function rather than a line in a layout because a
gate nobody can test is a gate that quietly stops working.

### 15.7 A RAIL THAT SCROLLED ITS OWN GUTTER AWAY

Measured on production and exact. A snap position aligns a child's start edge
to the SCROLLPORT's start edge and ignores the container's padding unless
`scroll-padding` says otherwise. So the standard bleed-then-pad rail undoes
itself the instant it settles: `scrollLeft` 24 against `padding-left` 24px on
every padded rail, and 0 on every unpadded one. What it looks like is the first
filter chip resting hard against the edge of the phone while the search field
directly above it sits on the gutter. Two different left edges on one bar,
correct in source, undone at runtime, invisible to every gate we own.

`.nf-scroll-x` now takes `--nf-rail-snap-pad`, defaulting to zero so an
unpadded rail is untouched, with a `.nf-scroll-x--gutter` variant that sets the
padding and the snap inset from one token so the pair cannot drift apart. Every
hand-rolled version of that pair in the tree had set the first and forgotten
the second.

### 15.8 A BAD INSTRUMENT IS WORSE THAN NO INSTRUMENT

`compare-surface.mjs` was written tonight to measure rather than grep, and R1's
second pass found three faults in it, which is the point of a second pass.

`parseFloat("26%")` is 26, and dividing that by the short side as though it
were pixels reported the home tile's glyph plate as a capsule at 0.93 when the
truth is 26 per cent of 28px, which is 0.26 and compliant. It erred in BOTH
directions at once, inventing breaches on small elements and hiding them on
large ones, and every icon plate and avatar in the product had been measured
that way.

Screen-reader-only text was counted as text, so a 44px icon button whose label
is an `sr-only` span was filed as a text-bearing capsule. It may well still be
wrong, but under the icon-only clause, which has a different test and a
different fix. The shape law is about what is DRAWN, so the text test walks the
tree and skips anything clipped, hidden or taken out of flow.

And the control selector was an inventory of the faults somebody had already
thought of: it reported the landing clean while a notification count drew a
perfect circle around the numeral "2" one route away, because `.nf-chip` was in
the list and "count" was not. It matches class substrings now.

### 15.9 WHAT THE SWEEP ACTUALLY COVERS, COUNTED HONESTLY

`docs/design/SWEEP.md` is GENERATED by `scripts/design/sweep-register.mjs` from
the route tree and the proofs directory, so it cannot claim coverage that does
not exist, and a hand edit is lost on the next run. It counts 129 surfaces: 49
with a proof taken on the honest harness, 20 carrying only VOID proofs from the
broken one, and 60 with no proof at all. It matches a proof to a surface by the
route's last real segment appearing in the file name, so it UNDERCOUNTS on
purpose. A register that flatters the sweep is worse than no register.

Every proof taken before `c32cd9c` is void by the founder's order. One worker
corrected the lead on exactly this: its eleven shots carried a late timestamp
but came off `next dev`, and a late timestamp on a dev-server shot is still a
dev-server shot. It deleted all eleven and retook them.

### 15.10 STILL OPEN, AND NAMED SO NOBODY THINKS IT IS DONE

Sixty surfaces unproven and twenty to retake. R1's colour findings from A6
down: the market tile fill is lifted everywhere and dramatically near the glyph
(`#243856` at the top against a flat reference `#000C27`), the active dock
glyph is washed toward white (`#5DA0FF` against `#0257FD`), the city chip
border is not drawing at all. The light theme has never been audited for colour
and neither has anything at 1536, which means the desktop hero, the image the
whole ruling was made from, is unmeasured. A CSP refusal of Next's own chunks
on app-shell routes in production, which if real means those routes never
hydrate for a visitor. `close_future_commitments` still wired into nothing, so
a purge still orphans a future event. And the verified badge's two derivations,
which split on the first agent approval and are invisible until then.

---

## 16. W4, 19 September, night: the purge was already wired, and the verified badge now has one derivation

**The rules and the stop list were restated before anything was touched, as
section 0 requires.** Two jobs were given. The first turned out to be already
done by somebody else and is recorded here as verified rather than as landed.
The second landed, as one migration applied and probed and six files.

### 16.1 JOB ONE WAS ALREADY DONE, AND SECTION 14 IS STALE ON THIS POINT

Section 14 closes with "`close_future_commitments` is applied but is not yet
wired into the purge job ... until somebody does that, a purge will still
orphan a future event." **That is no longer true and was already untrue when it
was written.** `apps/web/src/lib/account-deletion/purge.ts` calls
`close_future_commitments` immediately before `purge_account_rows`, in its own
`deps.rpc` call and therefore its own transaction, inside the same `try` whose
`catch` records the failure and leaves the request OPEN. The wiring came in at
`b3f7b89`, found with
`git log -S "close_future_commitments" -- apps/web/src/lib/account-deletion/purge.ts`,
which is an ancestor of `56919ae`, the commit that carries section 14. So A1's
note describes a hole that had been filled a few commits earlier, and the next
person reading section 14 would have wired it a second time.

The failure behaviour the brief asked for is the behaviour that is there: a
throw from the close is caught, `fail_account_purge` records the reason, the
request stays OPEN, `purge_account_rows` is never reached, and the run reports
`retry`. A test proving the order already exists too, in
`purge.test.ts`, under the heading "the future commitments are resolved before
anything is destroyed": three cases, one asserting
`indexOf("close_future_commitments") < indexOf("purge_account_rows")`, one
asserting the audit line carries counts and nothing else, one asserting that a
close that throws destroys nothing. `npx vitest run
src/lib/account-deletion/purge.test.ts` from `apps/web`: 19 passed.

**Nothing was rewritten to claim this as new work.** The one edit W4 made on
this job is a docstring correction in
`apps/web/src/lib/account-deletion/rpc.ts`, which described "the seven
functions this flow reaches" and then listed eight, none of them
`close_future_commitments`. It now says nine and names it. A reader auditing
which Postgres functions the deletion flow can reach was being given a list
with the newest and most consequential one missing from it.

### 16.2 JOB TWO: THE VERIFIED BADGE, COLLAPSED ONTO THE LADDER

R2's section 4 is correct in its diagnosis and correct in its qualifier, and
both are preserved here. **This is not visible today.** Read live before the
migration, aggregates only: 1 agent row, 0 with `verified = true`, 0 with
`agent_badges.verified = true`, 0 rows that would fail the new constraint. The
fault is on the approval path and no application has been approved through it.
It fires on the FIRST approval. That is the argument for doing it now: the
constraint applies clean while nobody is in the wrong state, and it will not
once anybody is.

Applied as `p2_a_verified_agent_means_a_person_was_checked`, on disk as
`supabase/migrations/20260919230000_p2_a_verified_agent_means_a_person_was_checked.sql`.
**The version numbers will not be the filename**, for the reason section 14
records: `apply_migration` stamps its own timestamp.

**THE THING THAT CHANGED THE SHAPE OF THE FIX, AND R2 DID NOT SEE IT.**
`public.agents.verified` is `boolean NOT NULL DEFAULT TRUE`. Removing
`verified: true` from the approval upsert therefore fixes NOTHING on its own,
because the column default puts it straight back. Worse, R2's step 4 constraint
applied on top of R2's step 1 would have made every future approval insert
default to true at tier 0, violate the constraint, and **take agent approval
down entirely**. The default moves to false in the same file.

**AND THAT SAME FACT ARGUED FOR DERIVING THE COLUMN RATHER THAN FREEZING IT.**
R2's four steps applied literally leave `agents.verified` false for ever. There
are readers of it R2's list does not have:

  `public.agent_trust(uuid)` awards 30 of its 100 trust points for
  `verified and status = 'APPROVED'`. Frozen false, a genuinely checked agent
  silently loses 30 points they had earned.

  `public.enforce_demo_listing_has_unverified_lister()` and
  `private.enforce_demo_business_has_unverified_agent()` both read
  `a.verified or a.verification_tier > 0`, so they survive either way.

So the file takes BOTH halves of the M15 precedent the brief names, not one:
the constraint `agents_verified_means_identity_chk`, byte for byte the shape
`businesses` has carried since `20260918120500`, AND a BEFORE INSERT OR UPDATE
trigger `agents_derive_badge` running `private.derive_agent_badge()`, which
sets `verified := verification_tier >= 1` exactly as
`private.derive_business_badge()` does. `agent_trust` is then not re-emitted at
all, which also means its deliberate `anon, authenticated` execute grant is not
disturbed, and the probe asserts that grant is still there afterwards. A
hand-written `verified = true` is overwritten rather than refused, which is
M15's behaviour and means no existing caller starts erroring.

`private.award_agent_badges()` is repointed at
`coalesce(new.verification_tier, 0) < 1` and its caption corrected. It read
"Identity and payout account verified, application approved", which claims TWO
rungs where tier 1 proves one, and it was being awarded when NEITHER had been
looked at. It now reads "Identity checked by a person at Vallo", which is what
tier 1 means in the ladder's own words at `lib/trust/verification.ts`.

**R2 ALSO ASKED FOR THAT TRIGGER TO BE MOVED so a tier climb awards the badge.
It does not need moving.** `agents_award_badges_after_write` is already
`AFTER INSERT OR UPDATE` with no column list, so it fires on a
`verification_tier` write as it stands. Read off `pg_get_triggerdef` rather
than assumed, and left alone.

**RULE 21.** `private.derive_agent_badge()` is created here and revokes EXECUTE
from `public`, `anon` and `authenticated` in the same file, granted back to
nobody, because a trigger function runs as the table owner.
`private.award_agent_badges()` is replaced rather than created and already
carried that revoke; it is re-stated so the file stands alone. The probe proves
both off `has_function_privilege` rather than assuming them.

**THE PROBE PASSED FIRST TIME.** Run through `apply_migration`, never
`execute_sql`. The output was

`ERROR: P0001: PROBE ALL PASS p2 a verified agent means a person was checked: approval leaves the badge dark at tier 0 on all three surfaces, one passed identity rung lights all three with the corrected caption, the constraint refuses the bad state with the trigger disabled, a stranger read 0 agent rows, and agent_trust kept its public grant. Rolled back on purpose.`

It proved the two revokes and the one grant that had to survive; that an agent
inserted exactly as the approval inserts one, with `verified => true` forced on
top, comes out false at tier 0; that neither `agent_badges.verified` nor the
`verified_agent` row in `user_badges` lights at tier 0, which is the messaging
tick and the social profile badge both dark; that one passed `identity` rung
takes the tier to 1 and lights all three in the same statement with the
corrected caption and no payout claim in it; that with the derive trigger
DISABLED a forced `verified = true` at tier 0 is still refused with
`check_violation`; and that a stranger wearing an `authenticated` JWT reads
ZERO rows of `public.agents` while the row demonstrably exists in the same
transaction.

**THE FIXTURE WAS CHOSEN BY THE PREDICATE AND NOT POSITIONALLY**, which section
14 asks for in as many words after two false reds in one day. The probe takes
the first `auth.users` row for which no `public.agents` row exists, because
that is what the write under test does, and raises loudly if the estate cannot
supply one. Five candidates existed.

**NOTHING WAS LEFT BEHIND, AND IT WAS COUNTED RATHER THAN TRUSTED.** After the
probe: 1 agent row, 0 named `Probe agent, rolled back`, 0 with `verified` true,
0 rows in `agent_verification_checks`, 0 `verified_agent` awards, 0
`agent_badges` verified, and 0 rows in `supabase_migrations.schema_migrations`
whose name begins `probe`. The column default reads `false`, the constraint
exists, the trigger exists.

### 16.3 A FIFTH SURFACE NOBODY HAD COUNTED, FOUND BY THE TEST AND NOT BY READING

R2 named three readers of the hand-set boolean. The regression test written for
this job, `apps/web/src/lib/trust/agent-badge-derivation.test.ts`, scans every
`.ts` and `.tsx` under `src` for a PostgREST select on `agents` that asks for a
bare `verified` column, and it found a fourth on its first run:
`lib/agent/listings-queries.ts`, whose `getAgentContext` feeds
`agentProfileFrom` and thence the **"Verified agent" chip in the agent's own
workspace rail**, on `AgentNav`, `AgentRail` and `AgentMobileNav`, and the same
chip again on `/agent/settings`.

So the fault was one surface worse than the audit said: an agent who had sent
us nothing would have been addressed as a verified agent in their own workspace
chrome while `/agent/verification`, a click away, told them they were at tier 0
and had not started. **This is also the clearest vindication of deriving the
column rather than freezing it**: had the column been frozen false per the
literal four steps, that chip would have gone permanently dark for every
genuinely verified agent and nothing would have complained. It now reads
`(data.verification_tier ?? 0) >= 1` off a tier the same query already
selected, so the raw column is read from nowhere in the application at all.

### 16.4 WHAT LANDED IN THE APPLICATION

`lib/admin/actions.ts`: `verified: true` is gone from the approval upsert, with
a comment saying why it is an absence rather than an oversight, and the
notification is retitled from "You are a verified Vallo agent" to "Your agent
application is approved", with a body that now says verification is a separate
step. `lib/messages/live.ts`: the identity read takes
`agent_badges(verified)` and a missing row reads false, for the reason
`getAgentBadges()` gives, that the failure mode must be a tick that does not
appear and never a tick with no check behind it.
`components/messages/VerifiedAvatar.tsx`: the docstring named `agents.verified`
as "WHERE THE TRUTH COMES FROM" and now names `agent_badges.verified`, with the
old fault written out so the next reader is not puzzled.
`app/(app)/messages/[id]/page.tsx`: the same correction to a comment that said
`identitiesOf` reads `agents.verified`. `lib/agent/listings-queries.ts`: the
fifth surface, above.

### 16.5 THE GATES, EXACT

All from `apps/web`. `npx tsc --noEmit -p tsconfig.json` exits 0 with no
diagnostics. `npx eslint` over the seven touched files exits 0, with three
PRE-EXISTING `nf/no-arbitrary-font-size` warnings on `VerifiedAvatar.tsx` lines
55 to 57, which are the `SHELL` size map and are not lines W4 touched.
`node scripts/check-css-tokens.mjs` exits 0, all ten checks clean.
`npx vitest run src/lib/trust/agent-badge-derivation.test.ts
src/lib/account-deletion/purge.test.ts`: 2 files, 26 tests, all passed. The
production build through the shared lock, `NEXT_DIST_DIR=.next-w4 npx next
build`, exits 0.

### 16.6 WHAT WAS NOT DONE, UNPROMPTED

**R2's step 5 was NOT done and needs the founder.** `agents.verified` is not
dropped. It is now a derived copy of `agent_badges.verified` and dropping it is
a data-losing migration, which is on the stop list.

**No screenshot row is claimed in section 6.** The build was run, `next dev`
was not, and nothing here is proven at a rendered surface. The three surfaces
whose copy changed, the messaging tick, the social profile badge and the agent
rail chip, are all argued from the query and the trigger, not photographed.

**The full vitest suite was not run.** Load stood between 8 and 11 through this
cycle and the brief forbids it above 10.

**`database.types.ts` was NOT regenerated and does not need to be.** A column
default, a CHECK constraint and a trigger appear nowhere in the generated
types, and `agents.verified` already came through as optional on Insert because
it already had a default. The `agent_badges` embed the messaging read now uses
typechecks against the file as committed.

**`public.agent_trust(uuid)` was deliberately NOT re-emitted**, for the reason
in 16.2: deriving the column leaves it reading the truth, and replacing a
50-line SECURITY DEFINER function that `anon` and `authenticated` hold a
deliberate grant on, to change nothing about what it computes, is risk with no
return. The probe asserts its grant survived.

**The demo case was deliberately left alone.** M15's business trigger also
forces `verified` false for a partner row. `agents` has `is_demo` rather than
`source`, and a demo agent is held unverified today by sitting at tier 0, which
the two `enforce_demo_*` triggers check directly. Adding an `is_demo` clause to
the derivation would have been inventing a rule nobody asked for, so it was
not.

**No other worker's file was edited.** Seven files were modified in the working
tree by other workers during this cycle, including `apps/web/tsconfig.json`,
`components/auth/VerifyCodeForm.tsx` and `tests/csp.spec.mjs`. None was
committed here; the commit carries an explicit pathspec.
