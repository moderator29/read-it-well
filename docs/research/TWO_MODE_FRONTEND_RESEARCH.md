# Two-side frontend research: Property and Stays

**Agent 1 of 2. Research only, no code changed.** Written 18 September 2026
against the tree as it stands. Every path and symbol below was read in this
session unless it appears in the honesty log at the end. British spelling
throughout; escrow is promised nowhere in this document and must be promised
nowhere in any copy this work produces (`apps/web/src/lib/legal/terms.tsx`
says Vallo does not hold money in escrow, and `docs/BRAND_MARKS.md` section 4
records the withheld `escrow-hold` mark for the same reason).

The brief: a "Switch mode" control in the side navigation flips the whole app
between the Property side (the current app, upgraded) and a Stays side
(hotels, apartments, guest houses, resorts, serviced apartments, shortlets,
restaurants). One backend, one account, no re-signup, fully reversible, and
the switch should feel like the app itself turning over, not like navigation.

---

## 1. The app shell today

### 1.1 The wrapper and its three modes

`apps/web/src/components/app/AppShell.tsx` is the single client wrapper for
every consumer route, mounted once by `apps/web/src/app/(app)/layout.tsx`,
which is a server layout that resolves locale, dictionary and
`getShellIdentity()` (userName, unreadNotifications, avatarUrl, signedIn,
isAgent, isAdmin) and passes them down. The shell has three internal display
modes, each decided from the pathname:

- **standard**: sticky glass header (phone tab roots and guests only), the
  content column with `nf-shell py-section-tight`, and the floating dock.
- **immersive** (`isImmersiveRoute` in `MobileTabBar.tsx`): `/assistant` and
  `/messages/[id]` (with a negative lookahead excluding `/messages/new`).
  No header, no dock, the column owns the viewport and scrolls inside itself.
- **edge-to-edge**: `/^\/listing\/[^/]+$/`. Header hidden on phones so the
  gallery hero reaches the status bar; gutter kept.

### 1.2 Navigation surfaces

- **`AppRail.tsx`** renders both the sticky desktop rail (`nf-nav--rail`,
  width `--nf-rail-width`, visible from 64rem) and the phone drawer
  (`nf-nav--drawer`, slides from the right inside `AppShell`'s overlay). One
  component, one data model, so they cannot drift. Styled by
  `apps/web/src/app/side-nav.css` (416 lines: `nf-nav`, `nf-nav__head`,
  `nf-nav__who`, `nf-nav__foot`, row and pill rules). The foot carries
  `ThemeToggle` (`components/site/ThemeToggle`), the only control in the nav
  that changes how the product looks rather than where you are. This foot is
  the natural home for the side switch (section 3.5).
- **`nav-model.ts`** (`buildNav`) is the nav as data: Home / Explore / Feed
  (hidden on phones where the dock carries them), then Account (Bookings,
  Messages, Notifications, Saved, Wallet, Vallo AI), then Workspaces (Agent
  Mode row when `isAgent`, Console when `isAdmin`), then Become an agent and
  Settings. Flat, no children, eleven rows for a renter.
- **`MobileTabBar.tsx`**: four equal tabs (Home `/home`, Explore `/search`,
  Feed `/around`, Wallet `/wallet`) plus the detached profile island. One
  travelling pill placed by arithmetic (`--nf-tab-count`, `--nf-tab-i`), a
  server component with no JavaScript. `TAB_BAR_ROUTES`, `tabRootFor`,
  `isTabRoot`, `showsTabBar` and `isImmersiveRoute` all live here so shell
  and dock cannot disagree. Wrapped in `AutoHideDock`.

### 1.3 Route groups and workspaces

- **`(app)`**: the consumer product. around, assistant, bookings, checkout,
  home, legal, listing, messages, notifications, post, profile, rent, saved,
  search, settings, stories, u, verification, wallet.
- **`(site)`**: marketing and legal pages with their own layout.
- **`(auth)`**, **`(dev)`**: sign-in flows and dev surfaces.
- **`/agent`** and **`/admin`** are real URL segments, not groups. `/admin`
  has its own `layout.tsx`; **`/agent` has no layout**: every agent page
  (e.g. `app/agent/inspections/page.tsx`) wraps itself in
  `components/agent/AgentShell.tsx`, which carries `AgentRail` and
  `AgentMobileNav`, both of which render `components/agent/ModeSwitcher.tsx`.
- `src/middleware.ts` holds the door: `PRODUCT_SEGMENTS` (assistant,
  bookings, checkout, home, wallet, agent, admin, ...) require a session;
  browsing (`/search`, `/listing`, `/around`, `/u`, `/post`) is deliberately
  open. Any Stays segment that carries someone's own data joins that set.

### 1.4 The workspace mode that already exists (the prior art)

- `lib/mode.constants.ts`: `MODE_COOKIE = "nf_mode"`,
  `type Mode = "personal" | "agent"`, `DEFAULT_MODE = "personal"`, `isMode`
  guard. Client-safe, no `next/headers`.
- `lib/mode.ts`: `import "server-only"`, `getMode()` reads the cookie via
  `await cookies()` and validates with `isMode`. Its docstring states the
  rule that makes the whole pattern safe: **the mode is a view preference,
  never an authorisation**. Agent routes are gated by `getAgentContext()`
  reading the caller's own RLS-bound rows, not by the cookie.
- **Consumers** (complete, from grep): `app/(app)/home/page.tsx` (line 110,
  feeds `roleStateFrom` for the verification prompts),
  `app/(app)/profile/page.tsx` (line 78, same purpose),
  `components/agent/ModeSwitcher.tsx` and
  `components/roles/RoleSwitcher.tsx` (both import the constant to write the
  cookie). Nothing else reads it. Mode does not restructure the shell today;
  the agent workspace is a separate route subtree with its own shell.
- **The switch flow, exactly**: `ModeSwitcher.choose(next)` writes
  `document.cookie = \`${MODE_COOKIE}=${next}; path=/; max-age=31536000;
  samesite=lax\``, then inside `startTransition`:
  `router.push(next === "agent" ? "/agent/dashboard" : "/home")` and
  `router.refresh()`. No full reload, no server action, no redirect
  round-trip: the cookie is set before navigation, the pushed route's server
  components render under the new cookie, and `router.refresh()` re-renders
  the rest of the server tree. `RoleSwitcher` (rendered on `/profile`, and
  the only door onto the selling side) does the identical dance at line 132.
  `ModeSwitcher` renders only inside the agent workspace
  (`AgentRail.tsx` line 63, `AgentMobileNav.tsx` line 126); the personal
  rail's equivalent is the "Agent Mode" nav row from `buildNav`.

### 1.5 Theming, motion, icons

- **Tokens**: `packages/design-tokens/src/tokens.css` (2,938 lines). One blue
  family (`--nf-electric-*`), with `--nf-emerald-400` for success,
  `--nf-rose-400` for error, `--nf-cyan-400` for attention/pending, and an
  explicit note (line ~125) that nothing else gets a hue. Dark is the default
  theme; daylight is `:root[data-theme="light"]` (line 2385). The attribute
  is set before paint by an inline script in `app/layout.tsx` (line ~250)
  reading `localStorage.nf_theme`. Crucially for this project, **a mode
  accent family already exists**: `--nf-mode-personal
  (--nf-electric-500)`, `--nf-mode-agent (--nf-electric-400)`,
  `--nf-mode-admin (--nf-electric-700)`, with a long note saying modes are
  told apart **by depth, not by hue**, and that the set is settled the day a
  new surface takes its accent from it. The Stays side is exactly that
  surface (section 2.6).
- **Motion**: `app/css/animation.css` opens with the contract (motion is
  physics; entrances 400 to 600ms, staggers capped at four steps; one
  ambient loop per viewport). Duration and easing tokens live in tokens.css:
  `--nf-duration-instant/fast/base/slow/deliberate/entrance/cinematic`
  (90/160/240/380/620/520/900ms) and `--nf-ease-standard/entrance/exit/
  spring/press`. Reduced motion collapses every duration token to 1ms
  globally (tokens.css line 2913), and `app/css/motion.css` adds per-effect
  guards. `motion.css` also carries the platform's component motion
  (message bubbles springing from their sender's side, the odometer, the
  balance pulse, transaction slide-ins) and, instructively, three post
  mortems of animations that shipped without a component; the lesson for the
  flip is written there: never land the CSS before the trigger.
- **View Transitions**: already in live use, without any Next config.
  `components/app/ListingCard.tsx` (line ~191) feature-detects
  `document.startViewTransition`, checks reduced motion, then wraps
  `router.push(href)`; the card photo and `ListingGallery`'s lead pane share
  an inline `viewTransitionName: \`listing-photo-${id}\``, and
  `app/css/base.css` carries the reduced-motion kill switch for
  `::view-transition-*`. `apps/web/next.config.ts` has **no `experimental`
  block and no `viewTransition` flag**; Next is `^16.2.12`, React `^19.2.0`,
  Tailwind `^4.1.14`.
- **Icons, two tiers** (`docs/ICON_SYSTEM.md`): `UiIcon` is the stroked
  navigation glyph set; `BrandIcon` renders the content objects and the two
  never share a row. The glass pack in `apps/web/public/brand/glass/` holds
  103 object PNGs at the root, 24 light twins in `light/`, and 12 wide hero
  scenes in `hero/` (139 files; `docs/BRAND_MARKS.md`, rewritten 16
  September 2026, is the authority). The set already contains most of what
  Stays needs: `hotel`, `hotel-room`, `hotel-star`, `shortlet`,
  `serviced-apartment`, `studio-apartment`, `shared-apartment`,
  `concierge-bell`, `luggage-check`, `luggage-plane`, `booking-instant`,
  `calendar-check`, `beach-house`, `villa`, `penthouse`. **There is no
  restaurant object and no resort object**; `hotel-sign` exists but is
  banned (text baked into pixels). Those two are a commission, filed through
  `scripts/icon-manifest.mjs` per the rules in BRAND_MARKS section 6.

### 1.6 Shared versus side-specific surfaces

Shared (one instance, both sides): `/settings` (and `settings-rows.css`
patterns), `/wallet`, `/profile`, `/notifications`, `/messages` (inbox
frame; thread internals fork, section 5), `/saved`, `/assistant`,
`/verification`, `/checkout` (already serves stay bookings), auth, legal.

Side-specific: home feed (`/home` composition: `CityHero`, `TrendingStrip`,
`CityRow` under `components/app/home/`), search defaults and filters
(`/search` already carries a `type` filter over the full
`ListingKind` union in `lib/listings/types.ts`: `hotel | apartment | home |
shortlet | villa | restaurant | experience | rental | ...`), listing cards
(`ListingCard.tsx` already prices per period per kind), the tab bar's four
destinations, the nav pillars, `/bookings` (Property reads it as
inspections-plus-lettings; Stays reads it as trips), and the accent.

The important discovery: **the catalogue is already two-sided**. Hotels,
shortlets and restaurants exist as `ListingKind`s, `lib/reservations/`
(reserveTable, respondToReservation, cancelReservation, a Lagos-timezone
schema with `partySize`) and `lib/bookings/` (checkout, settlement,
`getMyBookings` returning upcoming/completed/cancelled) are real. The nav
history in `nav-model.ts` records that Hotels and Restaurants used to be nav
rows and were demoted to a search filter. The Stays side is not a new
backend; it is giving that half of the catalogue its own shell again,
properly this time.

---

## 2. The side-switch architecture

### 2.1 The axis

Add a second, orthogonal axis beside mode, built as an exact structural twin
of the proven pair:

- `apps/web/src/lib/side.constants.ts` (new): `SIDE_COOKIE = "nf_side"`,
  `type Side = "property" | "stays"`, `DEFAULT_SIDE = "property"`,
  `isSide()`. Client-safe.
- `apps/web/src/lib/side.ts` (new): `import "server-only"`, `getSide()`
  reading `cookies()`, same shape as `getMode()`, same doctrinal comment:
  the side is a view preference, never an authorisation.

Two axes, four states: (personal, property), (agent, property), (personal,
stays), and (business, stays) later. Agent mode belongs to Property
(section 2.7).

### 2.2 Cookie versus URL segment versus route group

- **URL segment for everything** (`/stays/home`, `/stays/wallet`): rejected.
  It duplicates every shared route or forks their URLs, breaks the "wallet
  is one wallet" promise, and makes the switch a sitemap event rather than
  the app turning over.
- **Cookie for everything**: rejected alone. A shared hotel link must open
  in Stays regardless of the recipient's cookie, and two URLs rendering
  different products from the same path is hostile to caching, indexing and
  support.
- **Recommended hybrid, matching how mode already works**: the **cookie
  decides the shell** (nav pillars, tab bar, home and search composition,
  accent) for the shared and root routes, and **side-owned content routes
  are real URLs** that force their side. Mode has exactly this shape today:
  `nf_mode` flavours the shared surfaces while `/agent/*` is a real subtree
  that implies agent regardless of the cookie.

### 2.3 Route layout

Keep `(app)` as the one consumer group; give it a side-aware shell rather
than splitting it. Splitting into `(app-property)` and `(app-stays)` was
considered and rejected: the shared surfaces (wallet, settings, profile,
messages, notifications) would need to live in a third group or be
duplicated, and Next allows only one group to claim a literal path.

Concrete resolution rule, implemented in one function
(`sideOfPath(pathname): Side | null` in `side.constants.ts`, the twin of
`tabRootFor`):

- Paths under `/stay/`, `/stays`, `/restaurants`, `/restaurant/`, `/trips`
  resolve to `"stays"`.
- Paths under `/agent/`, `/listing/`, `/rent` resolve to `"property"`.
- Everything else (home, search, wallet, messages, settings, ...) resolves
  `null`: the cookie decides.

`(app)/layout.tsx` becomes:

```tsx
const [side, identity] = await Promise.all([getSide(), getShellIdentity()]);
return <AppShell side={side} ... />;
```

`AppShell` (a client component that already reads `usePathname`) computes
`effectiveSide = sideOfPath(pathname) ?? side` and hands it to `AppRail`,
`MobileTabBar` and the accent scope. Because the server layout passed the
cookie value, server and client agree on the first paint of every shared
route (no hydration flash), and a deep link into `/stay/abc` renders the
Stays shell even when the cookie says property, because `sideOfPath` wins.
Server pages that need the side for data (home, search) call `getSide()`
directly, exactly as `home/page.tsx` calls `getMode()` today; pages under a
side-owned path do not ask, they know.

**Cookie reconciliation on deep links**: a server component cannot set
cookies during render, so a tiny client component in the stays-owned pages'
shared shell (`<SideSync side="stays" />`, four lines) writes `nf_side`
when it differs, mirroring how `ModeSwitcher` writes `nf_mode` on the
client. Opening a hotel link therefore lands you in Stays and leaves you
there, which is what "the app turned over" means.

### 2.4 New routes (all inside `(app)`, so the shell wraps them)

```
app/(app)/stays/page.tsx              Stays home (featured, categories)
app/(app)/stays/search/page.tsx       stay search: dates, guests, kind
app/(app)/stay/[id]/page.tsx          stay detail: rooms, rate plans
app/(app)/restaurants/page.tsx        restaurant discovery, open-now
app/(app)/restaurant/[id]/page.tsx    menu, hours, reserve
app/(app)/trips/page.tsx              upcoming and past stays + reservations
```

`/home` and `/search` stay as the Property roots (their URLs are the
product's muscle memory and every existing link). The dock's Home tab
points at `/stays` when the side is stays, `/home` otherwise; `tabRootFor`
gains the same awareness. An alternative (one `/home` that forks its render
on the cookie) was rejected: it makes the home URL mean two things, which
poisons shares, analytics and the browser back button.

### 2.5 What keys off the side

- **`buildNav({ side, ... })`**: property returns today's model unchanged;
  stays returns Stays / Explore stays / Feed, then Account with Trips
  replacing Bookings, then Settings. The Workspaces section shows Agent Mode
  only on the property side (section 2.7).
- **`MobileTabBar`**: tabs become data chosen by side (Stays, Explore,
  Feed, Wallet). The pill arithmetic, island and `AutoHideDock` are
  untouched.
- **Search defaults**: `/stays/search` seeds the existing `type` filter
  with the stays kinds and leads with dates and guests;
  `/search` excludes them by default. One search engine, two doorways.
- **Cards**: `ListingCard` already branches per `pricePeriod` and kind;
  stay results add a nightly-rate emphasis and date-aware price line, as a
  variant of the same component, not a fork.
- **Accent**: section 2.6.

### 2.6 Accent theming per side, inside the house rules

Do not add a hue. Follow the token file's own instruction at
`--nf-mode-personal/agent/admin`: sides are told apart by **depth within the
one blue family**. Add `--nf-side-accent` defaulting to
`var(--nf-mode-personal)` and redefined under a `[data-side="stays"]` scope
(set on the shell's root div by `AppShell`, and on `<html>` by the same
pre-paint inline script pattern `app/layout.tsx` already uses for
`nf_theme`, reading `nf_side` from `document.cookie`, so chrome-coloured
surfaces never flash) to a different rung of `--nf-electric-*`. The token
note says the family is settled the day a surface takes its accent from
here; this is that day. Warmth on the Stays side comes from imagery and the
glass objects, never from a new colour.

### 2.7 Agent mode inside each side

Agent mode is Property's workspace. Rules:

- The Agent Mode row and the become-an-agent tail row render only when
  `effectiveSide === "property"`.
- `/agent/*` resolves to property in `sideOfPath`, so an agent deep link
  always lands in the property world.
- Switching to Stays while `nf_mode=agent` leaves the mode cookie alone
  (it is a view preference; nothing breaks) but the Stays shell simply has
  no agent surface, exactly as a personal-mode shell has none today.
  Switching back restores the row.
- The Stays business console (hotel or restaurant operator) arrives later as
  `/host/*`, an `AgentShell`-shaped sibling gated by its own RLS-bound
  context read, with `nf_mode` growing a third value only when that ships.
  Nothing in this design blocks it: the mode axis is already a validated
  string union with one guard function to widen.

### 2.8 File-level sketch

New: `lib/side.constants.ts`, `lib/side.ts`,
`components/app/SideSwitch.tsx` (section 3.5),
`components/app/flip/SideFlip.tsx` + `app/css/side-flip.css` (section 3),
`components/app/SideSync.tsx`, the six route files in 2.4 with their
`loading.tsx` skeletons, `components/app/stays/` (StayCard, StaySearchBar,
RatePlanRows, ReservationSheet as it graduates from the listing page).

Changed: `(app)/layout.tsx` (resolve and pass side), `AppShell.tsx`
(effectiveSide, `data-side`, flip mount), `AppRail.tsx` (SideSwitch in the
foot), `nav-model.ts` (side parameter), `MobileTabBar.tsx` (tabs by side),
`tokens.css` (`--nf-side-accent`), `app/layout.tsx` (pre-paint side
attribute), `middleware.ts` (`PRODUCT_SEGMENTS` gains `trips`),
`tabRootFor`/`TAB_BAR_ROUTES` (stays roots). No database change is required
to stand the shell up; the catalogue, bookings and reservations already
exist.

---

## 3. The flip

### 3.1 What the web can honestly do

The founder's reference (a ring turning over, a phone flipped in the hand,
pumpfun's pro toggle) is a Y-axis 3D rotation of the whole viewport. The
honest constraints:

- A CSS 3D flip of the live app root is cheap (transform-only, composited),
  but you cannot paint the *real* incoming page on the back face before it
  exists: the new side's server render arrives mid-animation.
- The View Transitions API solves the two-snapshots problem
  (`::view-transition-old(root)` and `::view-transition-new(root)` are
  images that can each be given half a rotation under a perspective on
  `::view-transition`), and the repo already uses same-document
  `document.startViewTransition(() => router.push(...))` in
  `ListingCard.tsx` with no config flag. But with the app router the DOM
  update inside the callback is not awaited to navigation-complete, so on a
  slow network the "new" snapshot can be the loading state. Acceptable for a
  photo morph; too fragile to be the only plan for the product's signature
  gesture.
- `next.config.ts` has no `experimental.viewTransition`; enabling React's
  `<ViewTransition>` component is possible on this stack but is an
  experiment, and the signature interaction should not rest on one.

### 3.2 Recommended mechanism: a two-phase flip with a designed back face

Own the intermediate frame instead of hoping data wins a race. The back face
of the flip is a **side cover**: a full-viewport card in the incoming side's
world (canvas navy, the side's glass mark, `hotel.png` for Stays and
`keys-home.png` for Property, wordmark, side name, accent glow). It is
static brand, needs no data, and is gorgeous at any duration.

Choreography (`SideFlip.tsx`, a client component mounted once in
`AppShell` wrapping the `<main>` column plus chrome; CSS in
`side-flip.css`):

1. **Press** (0 to ~160ms, `--nf-duration-fast`, `--nf-ease-press`): the
   switch control depresses; the viewport card lifts: scale to ~0.94, radius
   grows to `--nf-radius-xl`, shadow `--nf-elev-4`, page behind darkens with
   `--nf-overlay-backdrop`. An interaction shield (`inert` on the shell,
   plus a transparent fixed div) locks all input; the live region announces
   "Switching to Stays". In parallel the component writes the `nf_side`
   cookie and fires `startTransition(() => { router.push(target);
   router.refresh(); })`, the exact `ModeSwitcher` recipe.
2. **Turn** (~620ms, `--nf-duration-deliberate`, `--nf-ease-entrance`): the
   lifted card rotates on Y under `perspective: 1200px` with
   `backface-visibility: hidden` on both faces. Front face: the outgoing
   app, live until 90 degrees. Back face: the incoming side cover, pre-
   rendered and pre-mounted (both marks ship in the initial HTML, so the
   cover never pops). Past 90 degrees the cover is what you see.
3. **Settle**: when the new route's layout has committed (the pushed
   segment's page mounts and signals via context, or the `useTransition`
   pending flag drops), the cover fades up into the real page with the
   platform's standard entrance (`nf-rise` stagger on the new home's
   sections). If navigation is still pending when the rotation lands, the
   cover holds with a quiet shimmer (`Skeleton.tsx` already owns that
   language) rather than replaying anything. Total happy path is under the
   `--nf-duration-cinematic` 900ms ceiling; the flip itself never waits on
   the network, only the reveal does.

Rotation direction encodes the geography: property to stays turns left to
right, stays to property turns back, so the two sides feel like the two
faces of one object rather than two destinations.

### 3.3 Fallbacks and discipline

- **Reduced motion**: the global token collapse (tokens.css line 2913)
  already flattens the durations; additionally `side-flip.css` swaps the
  rotation for an opacity crossfade to the cover under
  `@media (prefers-reduced-motion: reduce)`, mirroring the pattern every
  block in `motion.css` follows. No rotation, no scale, same lockout, same
  announcement.
- **No `startViewTransition` dependency**: the mechanism is plain
  transforms, so it behaves identically in every browser. A later
  enhancement may wrap phase 3's cover-to-page reveal in a view transition
  where supported; it is decoration, not structure.
- **Lockout**: input shielded from press to settle; the switch control is
  `disabled` while `pending` (as `ModeSwitcher` already does); Escape does
  nothing (the flip is sub-second and reversing mid-turn doubles the state
  space for no user benefit).
- **The motion.css lesson**: the CSS lands in the same change as the
  component that triggers it, never ahead of it. That file documents three
  animations that shipped as rules with no component; the flip must not be
  the fourth.

### 3.4 One-time delight, bounded

The first ever switch may run the full cinematic (a beat longer on the
cover, the side name typing in). Every subsequent switch is the standard
timing. Store `nf_side_flipped` in localStorage with try/catch, the
`ThreadView` pattern; losing it costs one extra nice moment, nothing else.

### 3.5 The switcher control

A **coin control** in the nav foot (`nf-nav__foot`, above `ThemeToggle`),
rendered by `SideSwitch.tsx` in both rail and drawer variants, deliberately
echoing `ModeSwitcher`'s menu variant grammar (shows the OTHER destination):

- A full-width row: a circular two-faced token on the left showing the
  other side's glass mark, the label "Switch to Stays" / "Switch to
  Property" with a one-line sub ("Hotels, shortlets and restaurants" /
  "Rentals, sales and agents"), drawn with `BrandIcon` per the two-tier
  rule.
- Idle, the token slowly presents its edge on hover (a small `rotateY`
  tease, transform-only); on press it spins in place as the viewport flip
  begins, so the control and the app visibly perform the same physics.
- It is not a toggle switch (`Switch.tsx` means a setting) and not the
  personal/agent `ModeSwitcher` (which keeps its place inside the agent
  workspace) and not the `RoleSwitcher` sheet on `/profile` (which changes
  what you are here to do, not which world you are in). Three controls,
  three questions, three shapes.
- The drawer variant closes the drawer as the flip starts, via the existing
  `onNavigate` plumbing.

---

## 4. Side-specific surfaces

All sketches are 390px dark-first, tokens only, existing primitives
(`Screen.tsx` rows and sections, `Sheet.tsx` with detents, `StatusPill`,
`Amount`, `Skeleton`, `PageHeader`, `EmptyState`).

### 4.1 Stays side

- **Stays home (`/stays`)**: greeting reuses the home pattern; a featured
  strip of wide stay cards (photo-led, `MediaFrame`, nightly price via
  `Amount`); a category rail of six chips with glass marks: Hotels
  (`hotel`), Shortlets (`shortlet`), Serviced (`serviced-apartment`),
  Resorts (mark to commission), Guest houses (`beach-house` interim),
  Restaurants (mark to commission); then "This weekend in Lagos" rows
  reusing `CityRow`'s shape. Each chip deep-links into `/stays/search`
  with the kind preset.
- **Stay search (`/stays/search`)**: the search screen's existing form
  chassis with a leading date-range and guests bar (two fields and a
  stepper in a `Sheet`); results as stay cards with total-for-dates when
  dates are chosen; the existing filter drawer scoped to stays kinds.
  `getBlockedDates` in `lib/bookings/queries.ts` already serves
  availability.
- **Stay detail (`/stay/[id]`)**: edge-to-edge gallery exactly as
  `/listing/[id]` (the shell's `edgeToEdge` test gains this path); then
  room types as `RowList boxed` rows (name, sleeps, refundable flag, price
  per night, chevron), each opening a rate-plan sheet; sticky `ActionBar`
  with the from-price and Reserve. `ReservePanel` on the listing page is
  the seed of this and graduates rather than being rewritten.
- **Booking steps**: the existing flow already runs listing to booking to
  `/checkout/[bookingId]` (`PayPanel`). Present it as a numbered three-step
  (dates and room, details, pay) with a step rail at the top of checkout;
  the money-pending copy must adopt the withdraw sheet's pattern (mark,
  amount, consequence line), which `docs/BRAND_MARKS.md` section 7 names as
  the standing defect on checkout.
- **Restaurant discovery (`/restaurants`)**: card rows (photo, name, area,
  cuisine chips, "Open now" as a `StatusPill` success tone computed from
  stored hours; hours data is a gap to confirm in schema); an open-now
  filter chip on top.
- **Reservation flow**: on `/restaurant/[id]`, a `Sheet` with date, time
  and party size (schema already enforced by `lib/reservations/schema.ts`,
  Lagos-timezone-aware, party bounds in Postgres and prose in zod), calling
  `reserveTable`; confirmation lands in the reservation thread (section
  5.3) and on `/trips`.
- **Trips (`/trips`)**: `getMyBookings` already groups
  upcoming/completed/cancelled and `MyBookings.tsx` already renders
  reservations landing from the listing page; Trips is that surface,
  re-homed and re-labelled for the Stays side with stays and reservations
  interleaved by date, past collapsed under a disclosure.

### 4.2 Property side upgrades

**What exists today (read, not assumed):**

- `lib/inspections/types.ts`: six states mirroring `public.inspection_state`
  (`REQUESTED, CONFIRMED, PROPOSED, DECLINED, COMPLETED, WITHDRAWN`),
  `OPEN_STATES = [REQUESTED, PROPOSED]`, `isOpen`, and `waitingOn` (whose
  move it is), which the founder's OPEN/CLOSED ask maps onto directly.
- `lib/inspections/queries.ts`: `readInspectionsForLister` /
  `readInspectionsForRequester`, RLS-bound, open-first sort, `readFailed`
  honesty flag, counterpart names via `social_profiles`.
- `lib/inspections/actions.ts`: `requestInspection`, `answerInspection`
  (CONFIRMED / PROPOSED / DECLINED; **this is the accept**),
  `acceptProposedTime`, `closeInspection` (WITHDRAWN / COMPLETED). The
  state machine itself lives in the database
  (`private.guard_inspection_transition`); the actions translate refusals
  into sentences.
- Surfaces: `/agent/inspections` (lister list split "Waiting on somebody" /
  "Done"), `/agent/dashboard` (open queue), `/bookings` (requester rows),
  all through `components/app/inspections/InspectionRows.tsx` (one
  component, `side: "lister" | "requester"` changes controls only).
  `RequestInspection.tsx` on the listing page files requests and states an
  existing one instead of duplicating it.

**Gaps against the founder's ask:**

1. **A consumer-side inspections page with OPEN and CLOSED.** The requester
   view is a section buried on `/bookings`. Build `/inspections` in `(app)`
   (property side nav row) with the agent page's two-group layout, groups
   labelled Open and Closed, Closed meaning DECLINED / COMPLETED /
   WITHDRAWN, "Inspected" being COMPLETED (the label `InspectionRows`
   already uses). Everything needed exists; this is a page file plus a nav
   row.
2. **The accept button inside the message thread.** Nothing in the thread
   surfaces the `inspection_requests` state machine. The live thread's
   only inspection control is `confirmInspection` in
   `lib/messages/actions.ts` (line 324), which writes
   `inspection_confirmations`: a guest-side "I have inspected this place"
   safety record, a different concept from accepting a request. Meanwhile
   `Inspection.conversationId` already links a request to its thread. The
   build: an inspection banner in `ThreadView` (section 5.2) that, for the
   lister, renders Accept (calling `answerInspection` with `CONFIRMED`),
   Offer another time, and Decline; for the requester, the state and
   `acceptProposedTime` when PROPOSED. Accepting flips the row to Confirmed
   on `/inspections`, `/agent/inspections` and `/bookings` simultaneously,
   because all three read the same record; the existing `revalidatePath`
   calls in `answerInspection` already cover the agent surfaces and gain
   `/inspections`.
3. Sales, agents directory and richer agent tooling are named in the brief
   as Property upgrades; the `ListingIntent`/`SaleStatus` types in
   `lib/listings/pricing.ts` suggest sale plumbing exists, but those
   surfaces were not audited in this pass (honesty log).

---

## 5. Messaging differentiation

### 5.1 Threads today

- **Data**: `conversations (guest_id, agent_id, listing_id)`, verified in
  `lib/messages/live.ts` (line 221) and `lib/messages/actions.ts` (line
  184). **Every thread is listing-bound and two-party.** Writes are
  validated by `lib/messages/schema.ts` (send, attach image with a
  storage-path regex, confirm inspection, mark read); sends are optimistic
  with retry, realtime via `lib/messages/useRealtime.ts`.
- **UI**: two thread components exist. `app/(app)/messages/[id]/
  ThreadView.tsx` (733 lines) is the real one: live and seed modes, a
  `ThreadOptionsSheet`, `VerifiedAvatar` with a required-not-defaulted
  verified flag, money-talk safety education (`MONEY_TALK_RE`), the
  inspection confirmation and the verified header tint
  (`nf-page-header--verified` in motion.css).
  `components/app/messages/MessageThread.tsx` (293 lines) is an older
  local-only thread with `ListingOptionsSheet`; treat it as the legacy
  sibling and do not build on it.

### 5.2 Context-typed threads, at the UI level

Derive a thread context server-side from what the conversation is bound to
(no schema change to start): `listing_id` kind `rental`/sale kinds means a
**rental thread**; a stays kind means a **hotel/stay thread**; a
reservation-bound conversation means a **restaurant thread**. Pass
`context: "rental" | "stay" | "reservation"` into `ThreadView` beside the
existing props.

What forks and what stays shared:

- **Shared (unchanged)**: the bubble column, composer, optimistic send and
  retry, realtime, attachments, read receipts, safety education line,
  `VerifiedAvatar`, `PageHeader` chassis.
- **A new slot, `ThreadContextBanner`**, rendered between header and
  scroll column, is the single fork point:
  - *Rental*: the current tooling, upgraded. The banner shows the linked
    inspection request's state (`waitingOn` decides the sentence) and the
    role-correct controls from section 4.2 gap 2. The
    `inspection_confirmations` control remains in the options sheet as the
    after-the-visit record it is.
  - *Reservation*: the chat lives inside the reservation. Header subtitle
    becomes the reservation line (Fri 26 Sep, 8:00 pm, table for 4) and the
    banner shows reservation state as a `StatusPill`
    (requested/confirmed/declined/cancelled, tones from the existing
    `StatusTone` set) with Cancel via `cancelReservation` and, for the
    restaurant operator later, `respondToReservation`. Entry point is the
    reservation on `/trips`, so the object owns the chat rather than the
    chat mentioning the object. No inspection tooling renders in this
    context, structurally (the banner component for this context simply
    has none), not by flag-hiding.
  - *Stay/hotel*: the banner is a compact **booking steps timeline**
    (reserved, paid, arrival day, completed) read from the booking row,
    each step dated, the current one accented; below it the thread is an
    optional contact-the-property channel, opened lazily ("Message the
    hotel" on the booking) rather than auto-created with every booking.
    No inspection tooling anywhere in this context.
- The inbox (`/messages`) stays one list on both sides, each row carrying a
  small context glyph and the side opening the right shell via
  `sideOfPath` on the thread's listing kind: a hotel thread opened from a
  notification lands in Stays.

Schema note for the build session: reservation-bound chat needs either a
nullable `reservation_id` on `conversations` or a reservations-to-
conversations join; that is the one backend touch this section needs, and
it is additive.

---

## 6. Payments area

### 6.1 What exists

- **Paystack client** (`lib/payments/paystack.ts`, server-only, typed, no
  SDK): `initializeTransaction`, `verifyTransaction`,
  `listSuccessfulCharges`, `verifyWebhookSignature`,
  `createTransferRecipient`, `initiateTransfer`, `verifyTransfer`,
  `listBanks`, `resolveAccountNumber`. All amounts integer kobo.
- **Bank accounts already built, for agents**: `public.payout_accounts`
  with RLS, `lib/agent/payout-schema.ts` (NUBAN ten digits, `groupNuban`
  display grouping, resolve-then-add with a server-side re-resolve so a
  tampered name cannot be stored), `payout-actions.ts` (add, make default
  via `is_default`, remove), `payout-queries.ts` (default-first ordering),
  and `components/agent/PayoutAccounts.tsx` (322 lines) rendered on
  `/agent/earnings` and `/agent/settings`.
- **Saved cards do not exist.** No table, query or component stores a
  Paystack authorization; card payments run the hosted checkout each time
  (`initializeTransaction` to `authorizationUrl`). The grep for saved-card
  storage came back empty.

### 6.2 The design: `/settings/payments` ("Payment methods")

A shared surface (both sides pay), a row on `/settings`, built entirely
from the settings grammar (`settings-rows.css`: `nf-row`, `RowList`,
`nf-rows-sheet` for the sheets, noting that file's warning that
`nf-rows-sheet` and the overlay `Sheet` must never share class names).

- **Cards section**: rows of brand mark (Verve, Visa, Mastercard as
  `UiIcon`-tier glyphs, never glass objects in a row), "•••• 4081", expiry,
  a Default `StatusPill`, chevron to a detail sheet (set default, remove
  with a destructive confirm inside the sheet, rose only on the confirming
  control per the state-token discipline in BRAND_MARKS section 7).
  **Add a card** initialises a minimal Paystack charge with
  `metadata: { purpose: "card-setup" }`; the webhook
  (`app/api/paystack/webhook/route.ts` exists) stores the returned
  authorization (signature, last4, exp, bank, reusable flag) in a new
  `payment_authorizations` table, own-rows RLS like `payout_accounts`.
  Copy tells the truth about the verification charge and its refund; no
  card number ever touches Vallo.
- **Bank accounts section**: generalise the agent feature rather than
  duplicating it. Promote `PayoutAccounts` into a shared
  `components/app/payments/BankAccounts.tsx` used by both this page and the
  agent screens; the add sheet keeps the proven three-beat flow: pick bank
  (`listBanks`), type NUBAN (grouped as 0123 456 789), resolve shows the
  account holder's name back for confirmation (`resolveAccountNumber`),
  then save. Rows: bank name, masked number (•••• 6789), account name,
  Default-for-payouts badge, remove with confirm.
- **States**: empty states with glass marks (`wallet.png`, `card-lock`);
  every pending write follows the withdraw sheet's gold standard (spinner,
  live region, amount where money moves, consequence sentence), which
  BRAND_MARKS section 7 names as "the pattern".
- **Consumers**: `PayPanel` on checkout gains "Pay with saved card"
  (Paystack charge-authorization, server-side) above the hosted redirect;
  wallet funding likewise. Both are follow-ons, not blockers, to the page.

---

## 7. Insane-frontend idea seeds

Effort S/M; each names the house rule that bounds it.

1. **Coin-edge tease**: the SideSwitch token presents its edge on hover,
   full spin on press, same physics as the viewport. S. Transform-only;
   reduced motion stills it.
2. **Live miniature on the back face**: the flip cover carries a small
   card previewing the other side's home (its glass mark, category chips,
   accent), a brand still, not live data. S. One blue family; no fake data.
3. **Side-aware accents everywhere**: `--nf-side-accent` flows into the
   dock pill, focus rings and selection tint the moment the flip lands. S.
   Depth not hue, per the mode-accent note in tokens.css.
4. **Skeleton choreography per side**: Stays `loading.tsx` skeletons rise
   in the incoming rotation's direction, so loading continues the flip's
   story. S. Stagger capped at four (animation.css rule 2).
5. **Count-up money everywhere it lands**: the existing odometer
   (`nf-odometer__*`) reused for trip totals and reservation deposits. S.
   Roll stays inside `--nf-duration-deliberate`, as motion.css already
   enforces.
6. **Ambient light on stay cards**: a static interior-glow gradient on
   hover only, evoking the glass marks. S. One ambient loop per viewport is
   already spent on the canvas bloom; hover-only, no loops.
7. **Map morph between sides**: switching sides while the search map is
   open crossfades pins between property and stays result sets, camera
   held. M. `MapCanvas`/`RealMap` exist; reduced motion snaps.
8. **Booking-steps timeline that draws itself**: the stay thread's
   timeline draws its connecting rule with `nf-rule-draw` as steps
   complete. S. Existing keyframe; entrance duration rules.
9. **"Open now" that breathes once**: restaurant open pills settle in with
   `nf-confirm-pop` on first paint, no loop. S. Cyan is attention's colour;
   open/closed uses success/neutral tones, not a new hue.
10. **Haptics on native shells**: `NativeRuntime.tsx` exists; a light
    impact at the flip's 90-degree point and on inspection accept. S.
    Progressive: web is silent, nothing forks.
11. **Reversed message spring on the Stays side**: reservation threads keep
    `nf-msg-in--mine/theirs` but the confirmation bubble arrives with the
    spring easing, marking the moment. S. `--nf-ease-spring` exists.
12. **Trips page date spine**: a vertical rule connecting upcoming stays
    chronologically, tonight accented. S. Tokens-only spacing; one accent.
13. **Inspection accept ceremony**: on accept, the thread header tints via
    the existing `nf-page-header--verified` motion, and the row on
    `/inspections` pulses once with `nf-tx-in`. S. Reuses shipped motion,
    honouring motion.css's "never invent a second 'something landed'".
14. **Side-branded pull-to-refresh glyph** on native shells: the coin token
    spins as the refresh spinner. M. One control, one physics; reduced
    motion swaps to opacity.
15. **First-flip cinematic**: section 3.4's one-time longer cover beat with
    the side name typing in. S. Bounded by localStorage-with-try/catch and
    the 900ms cinematic token.

---

## 8. Honesty log

Verified directly this session: every file quoted above was opened and read
(mode pair, AppShell, AppRail, nav-model, MobileTabBar, ModeSwitcher,
RoleSwitcher, (app)/layout, middleware head, tokens.css excerpts,
motion.css, animation.css head, base.css excerpt, side-nav.css head,
settings-rows.css grep, Sheet.tsx grep, inspections lib and surfaces,
messages schema/types/repository/actions excerpts, live.ts greps,
ThreadView head, MessageThread, paystack.ts, payout schema/actions/queries
greps, BRAND_MARKS.md, glass directory listings, next.config.ts head,
package.json versions).

UNVERIFIED or approximate, flagged for the build session:

- The brief says the glass pack holds 139 files; the directory holds 103
  root PNGs plus `light/` (24) plus `hero/` (12), which is 139 files in
  total across the three levels. Counted, consistent with BRAND_MARKS.
- `AgentShell.tsx`, `AgentRail.tsx`, `AgentMobileNav.tsx` internals beyond
  the `ModeSwitcher` render sites were not read line by line.
- Restaurant opening-hours storage was not confirmed in the schema; the
  "open now" pill depends on it. Check `lib/listings` and the migrations.
- `ThreadView.tsx` lines 140 to 733 (composer, realtime wiring, options
  sheet) were skimmed via greps, not fully read; the fork-point proposal
  assumes its banner slot can be added between `PageHeader` and the scroll
  column, which its structure (mirroring `MessageThread`) supports.
- `PayPanel.tsx`, `ReservePanel.tsx`, `RentalPanel.tsx`, `MyBookings.tsx`
  were characterised from greps and neighbouring docs, not full reads.
- The claim that Next's router does not await navigation completion inside
  `startViewTransition` is from platform knowledge, not from a repo test;
  the flip design deliberately does not depend on it either way.
- Sale-market surfaces ("sales, agents" in the Property upgrade brief) were
  not audited beyond noting `SaleStatus`/`ListingIntent` in
  `lib/listings/pricing.ts`.
- `docs/HANDOFF_03_FRONTEND.md`, `docs/ICON_SYSTEM.md`,
  `docs/FRONTEND_REVAMP.md` are cited as authorities by BRAND_MARKS and
  exist in `docs/`, but were not opened in this session.
