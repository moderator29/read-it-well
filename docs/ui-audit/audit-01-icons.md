# Audit 01 — Icon system, end to end

Scope: `apps/web/src/design-system/icons/*`, `design-system/brand/Logo.tsx`,
`components/auth/ProviderMarks.tsx`, `public/icons`, `public/brand`, `public/pwa`,
plus a full sweep of every icon usage in `apps/web/src`.

Standard: `PREMIUM_REFERENCE_BRIEF.md` §1 (icon system), §7 (motion), §8 (App Store readiness).

Verdict up front: **there is no icon system. There are six unrelated icon systems, two of
which are dead, and one of which (the primary content family) is a folder of 57 opaque
photographs at 17 different pixel dimensions.** Nothing in the product does filled-vs-outline
state, and the only animated icons are three states on a photographic tile that no navigation
surface uses.

---

## 1. WHAT EXISTS — honest inventory

### 1.1 The six parallel icon systems

| # | System | File | Technique | Glyphs | Live usages | Status |
|---|---|---|---|---|---|---|
| 1 | `UiIcon` | `design-system/icons/UiIcon.tsx` | stroked SVG, 24 grid, `currentColor` | **33** | **166 tags / 74 import sites** | LIVE — the workhorse |
| 2 | `BrandIcon` | `design-system/icons/BrandIcon.tsx` | `next/image` → opaque RGB PNG | **57** | **110 tags / 65 import sites** | LIVE — the content family |
| 3 | `TrustIcon` | `design-system/icons/TrustIcon.tsx` | gradient-filled SVG on lit tile | **6** | 4 usages / 2 import sites | LIVE — landing trust strip only |
| 4 | `ProviderMarks` | `components/auth/ProviderMarks.tsx` | brand-coloured inline SVG | **3** | 3 usages | LIVE — auth only |
| 5 | Assistant glyphs | `components/app/assistant/glyphs.tsx` | stroked SVG, 24 grid | **4** | 2 import sites | LIVE — **a private fork of system 1** |
| 6 | `Icon` / `Icon3D` / `glyphs.ts` | `design-system/icons/Icon.tsx`, `Icon3D.tsx`, `glyphs.ts` | gradient-filled 3D vector on tile | **36** (+31-name alias facade) | **0** | **DEAD CODE** |

Plus a seventh, uncatalogued tier: **~13 one-off inline `<svg>` shapes** hand-drawn inside
feature components (§4).

Measured: 4 different rendering techniques, 4 different coordinate systems (24-unit,
64-unit, 384px raster, 400×300 illustration), 3 different colour models (`currentColor`,
baked gradient, baked photograph).

### 1.2 Dead weight on disk

- `design-system/icons/Icon.tsx` (2.2 KB), `Icon3D.tsx` (7.1 KB), `glyphs.ts` (14.2 KB) —
  **23.5 KB of source, zero imports.** Verified: no file outside
  `design-system/icons/` references `Icon3D`, `glyphs`, or `icons/Icon`.
- `app/globals.css:2864–2880` — light-theme rules for `.nf-icon3d__tile / __ring / __spec /
  __bloom`. **Dead CSS for a dead component.**
- `public/icons/` — **31 PNGs, 1.32 MB, zero references** in `src/`. Verified by grep for
  `/icons/` in all `.tsx/.ts/.css/.js` — every hit is an *import path* string
  (`@/design-system/icons/UiIcon`), never a URL. Still precached by the service worker:
  `public/sw.js:63` lists `"/icons/"` in `CACHEABLE_ASSET_PREFIXES`.
- `public/icons/_manifest.json` — build metadata for the dead raster pack.

### 1.3 What ships in `public/`

```
public/pwa/     apple-touch-icon.png   180×180  indexed-palette   6 KB
                icon-192.png           192×192  indexed-palette   7 KB
                icon-512.png           512×512  indexed-palette  28 KB
                icon-maskable-512.png  512×512  indexed-palette  21 KB
                shortcut-search.png     96×96   indexed-palette   3 KB
                shortcut-bookings.png   96×96   indexed-palette   5 KB
                shortcut-wallet.png     96×96   indexed-palette   5 KB
public/brand/   rentme-logo.png        910×857  RGBA            710 KB
                rentme-logo-ink.png    910×857  RGBA            677 KB
                + 9 marketing photographs (1.3–2.3 MB each)
public/brand/icons/  57 PNGs, 3.11 MB, ALL colour-type 2 (RGB, NO ALPHA)
public/icons/        31 PNGs, 1.32 MB, UNREFERENCED
```

Absent: `favicon.ico`, `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`,
any `apple-touch-startup-image` splash set, any SVG favicon, any monochrome/tinted
Safari mask icon.

### 1.4 Motion that exists

Total `@keyframes` in `globals.css`: **47**. Of those, exactly **four** touch an icon,
and all four are scoped to `.nf-icon-tile` (i.e. `BrandIcon` only):

- `nf-ring` (`globals.css:424`) — bell wiggle, `data-state="alert"`. **Zero call sites use `state="alert"`.**
- `nf-confirm-pop` (`globals.css:435`) — `data-state="confirmed"`. 3 call sites.
- `nf-verify-pulse` (`globals.css:443`) — `data-state="verified"`. 2 call sites.
- `nf-tile-sheen` (`globals.css:731`) — ambient specular sweep on every tile, on a 7 s loop.

All four are `prefers-reduced-motion` gated (`globals.css:403`, `448`, `919`). Credit where due.

**`UiIcon` — 166 usages, every tab bar, every rail row, every button — has zero animation of any kind.**

---

## 2. GAPS VS THE REFERENCE STANDARD

Severity key: **P0** = blocks "top-tier product studio" read / App Store credibility.
**P1** = visible quality gap a designer will call out. **P2** = hygiene.

---

### Q1 — How many distinct glyphs? Are they geometrically consistent?

**~116 distinct authored shapes across 6 systems + 13 inline one-offs.** Not consistent.
Evidence below is measured, not asserted.

---

#### **F1 · P0 · The primary content family has 17 different optical scales**

`public/brand/icons/` — 57 PNGs, all square, but at **17 distinct pixel dimensions**:

```
384px × 39 files      372px  user-verified      314px  shield-lock
381px  card-lock       364px  camera             305px  cleaning
381px  hotel-star      363px  doc-lock           302px  gift-star
375px  support-shield  363px  shield-home        298px  reviews
                       362px  home-swap          262px  globe-pin
                       360px  bot-chat           261px  chat-duo
                       354px  tour-360           256px  tag-hash
                       344px  bell-badge
```

These are content-bounds crops. `BrandIcon` renders every one into an identically sized
tile (`BrandIcon.tsx:140–151`, `className="h-full w-full"` + `object-fit: contain` at
`globals.css:299`). Therefore **`tag-hash` (256 px canvas) renders its object 1.50× larger
than `bell-alert` (384 px canvas) in the same 44 px tile.** In `SettingsGroups.tsx:519`
and `profile/page.tsx:100` these sit in the same grid, one row apart.

The brief's requirement — "consistent … optical sizing … across the entire set" — fails on
a measurable 50 % spread.

---

#### **F2 · P0 · `UiIcon` optical mass varies 4.4× across the set**

Bounding boxes computed from the actual path data in `UiIcon.tsx:49–262`, as % of the
24×24 grid:

```
settings-gear      16.64 × 18.99   54.9%   ← largest
pool               19.20 × 16.10   53.7%   overflows to x=21.80, y=21.70
building-apartment 18.00 × 17.10   53.4%
compass / parking  17.20 × 17.20   51.4%
search             16.00 × 16.00   44.4%
bell               15.40 × 15.50   41.4%
user               13.40 × 15.80   36.8%
location           14.00 × 14.20   34.5%
utensils           10.40 × 17.20   31.1%
sparkle            12.40 × 12.40   26.7%
chevron-down       12.00 ×  6.00   12.5%   ← smallest
```

Specific defects:

- **`pool` breaks the safe area.** `UiIcon.tsx:101–102` — the wave paths run to
  `x = 21.80, y = 21.70`. With `strokeWidth 1.8` and round caps the stroke centre-line is
  0.9 units from the 24 edge on the right and bottom, so the glyph **touches the viewBox
  wall**. Every other glyph stops at ≤ 21.0. Rendered at 14 px (the most common size) the
  bottom wave clips.
- **`sparkle` is 10 % of the grid too high.** `UiIcon.tsx:154` — bbox y-range 3.40→15.80,
  optical centre-y = **9.60**, not 12.0. It sits 2.4 units above every other glyph's
  baseline. Beside a text label it reads visibly floated.
- **`location` hangs low.** `UiIcon.tsx:136` — bbox y-range 7.20→21.40, centre-y = **14.30**.
  It is 2.3 units below centre while `sparkle` is 2.4 above — a **4.7-unit (20 % of grid)
  vertical disagreement between two glyphs in the same family.**
- **`wifi` is the widest at 18.80** (`UiIcon.tsx:108`, `x = 2.60 → 21.40`) against
  `settings-gear` at 16.64. Nothing enforces a common optical square.

---

#### **F3 · P1 · Corner radii are not on a scale**

Rectangle radii inside `UiIcon.tsx`, as % of the shape's own width:

| Glyph | Line | Shape | `rx` | % of width |
|---|---|---|---|---|
| `parking` | 116 | 17.2 wide | 4.2 | **24.4 %** |
| `kitchen` | 122 | 16.0 wide | 2.4 | **15.0 %** |
| `calendar-booking` | 210 | 16.8 wide | 2.2 | **13.1 %** |
| `grid` | 248–251 | 7.0 wide | 1.9 | **27.1 %** |
| `chat-bubble` | 217 | corner `a2.9` | 2.9 | ~18 % |
| `ticket` | 204 | corner `a1.9` | 1.9 | ~11 % |

A 2× spread (13 % → 27 %). The brief's "matched corner radii" is not met, and there is no
radius constant anywhere in the file to enforce one.

---

#### **F4 · P1 · Terminals and construction logic are mixed within one family**

`UiIcon` sets `strokeLinecap="round" strokeLinejoin="round"` globally (`UiIcon.tsx:285–286`),
but four glyphs are **closed filled silhouettes drawn as strokes**, so caps never apply and
they render as heavy outlined blobs next to genuinely stroked neighbours:

- `star` `UiIcon.tsx:83`
- `heart` `UiIcon.tsx:244`
- `sparkle` `UiIcon.tsx:154`
- `chat-bubble` `UiIcon.tsx:217`

Meanwhile five glyphs mix fill *into* a stroked drawing via `fill="currentColor" stroke="none"`
inner shapes: `wifi` dot (`:111`), `kitchen` knobs (`:124–125`), `wallet` dot (`:228`).
And `building-apartment` (`:185`) uses **zero-length paths** `M6.9 13.1h.01M6.9 16.6h.01`
that only render because of the round linecap — they vanish entirely if a caller ever passes
a square cap or the glyph is exported.

---

#### **F5 · P0 · One stroke width for every size — no optical-size compensation**

`UiIcon.tsx:267` — `strokeWidth = 1.8`, a **fixed value in a 24-unit viewBox**, at every
rendered size. Effective device stroke:

| Rendered `size` | Usages | Effective stroke (CSS px) |
|---|---|---|
| 11 | 4 | **0.83 px** |
| 12 | 15 | **0.90 px** |
| 13 | 21 | **0.98 px** |
| 14 | 33 | **1.05 px** |
| 24 | 2 | 1.80 px |
| 30 | 4 | 2.25 px |

**73 usages render sub-1px strokes** — soft, grey, half-antialiased on any 1× or 2× display,
and detail-dense glyphs (`building-apartment` carries 6 window pairs + 2 dots;
`building-hotel` carries 6) collapse into mush at 12–14 px. This is precisely what SF Symbols'
optical-size axis exists to prevent, and it's the single biggest reason the icon set will
not read as "SF-Symbols-grade".

Across the whole app the sweep found **16 distinct stroke-width values** in inline SVG and
`UiIcon` calls: `0.4, 1, 1.5, 1.6, 1.7, 1.75, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3`.

---

### Q2 — Filled / outline / duotone variants for active vs inactive?

#### **F6 · P0 · There are no variants. One static shape, everywhere.**

`UiIconName` (`UiIcon.tsx:14–47`) is a flat list of 33 names. There is no `variant`,
`weight`, `fill`, or `active` prop. `PATHS` (`:49`) holds exactly one shape per name.

The tab bar's entire "active" treatment is **a 0.2 stroke-unit thickening**:

- `components/app/MobileTabBar.tsx:60` — `strokeWidth={isActive ? 2 : 1.8}`
- `components/app/DesktopDock.tsx:41` — `strokeWidth={isActive ? 2 : 1.8}`

At `size={22}` that is a **0.18 CSS px difference**. It is invisible. The active state is
carried *entirely* by the brand pill behind the icon (`nf-tab-pop__pill`, `globals.css:2102`)
and a `translateY(-1px)` nudge (`globals.css:2124`). The glyph itself does not change.

Reference §1: *"Filled / outline / duotone variants of the same glyph, switched by state
(inactive = outline, active = filled). Tab bars in the references do exactly this."*
Reference §2: *"Active tab expands into a labelled capsule … while inactive tabs remain
icon-only."* Neither exists. The mobile tab bar is icon-only in **both** states
(`MobileTabBar.tsx:16–17`: *"Labels are spoken, not printed"*), which is exactly the pattern
the reference set moved away from.

The desktop rail is the same: `AppRail.tsx:72–81` changes only text colour and passes
`size={24}` while a className simultaneously forces `h-[22px] w-[22px]` — a size prop and a
CSS override fighting each other with no active glyph change.

---

#### **F7 · P1 · The one "filled" state in the product is a Tailwind hack that changes the glyph's size**

The save heart is filled by injecting fill into the stroked outline:

- `components/app/listing/ListingActions.tsx:158–161` — `className={saved ? "text-[…] [&_path]:fill-current" : undefined}`
- `app/(app)/saved/SavedBoard.tsx:213` — `className="[&_path]:fill-current"`
- `components/app/search/MapDock.tsx:222` — same pattern

The `<svg>` still carries `stroke="currentColor" strokeWidth={1.8}` (`UiIcon.tsx:283–284`),
so the filled heart is the outline heart **plus 0.9 units of stroke on every edge** — it is
optically **~11 % larger** than the unfilled one. Toggling save makes the icon jump size.
A real filled variant is a *different, tighter path*, not the outline with paint poured in.

Additionally `MapDock.tsx:223` and `ListingActions` use different active colours and
`SavedBoard.tsx:184` uses a third; there is no single "saved" token.

---

### Q3 — Icon animation / symbol effects?

#### **F8 · P0 · Zero symbol effects on the functional icon set**

`UiIcon.tsx` renders a bare `<svg>` with no class hook, no `data-*` attribute, and no
animation prop (`UiIcon.tsx:264–295`). Nothing in `globals.css` targets it. **166 icon
instances, zero motion.**

What the reference set headlines (grid #1: *"bell, wifi, heart, chat, refresh, spinner,
send, star, speaker, all animated"*) versus what exists:

| Reference effect | Status in NaijaFinds |
|---|---|
| Bell rings on new notification | `nf-ring` keyframe exists at `globals.css:424` — **zero call sites pass `state="alert"`**. Verified by grep. |
| Refresh rotates | **No refresh glyph exists.** `app/offline/RetryButton.tsx:43` is text-only: `"Reconnecting..."`. |
| Spinner with radial segments | **No spinner exists anywhere.** Zero hits for `spinner`, `animate-spin`, or any loading glyph. |
| Heart pulses + fills on save | Fill toggles instantly with no transition (`ListingActions.tsx:158`). No pulse. |
| Send icon flies | **No send glyph exists** in `UiIcon`. |
| Speaker emits waves | N/A |
| Draw-on / variable-colour fill | Nothing. |

The three effects that do exist (`nf-confirm-pop`, `nf-verify-pulse`, `nf-tile-sheen`) apply
only to `BrandIcon` tiles and only at 5 call sites total
(`MomentScreen.tsx:39`, `ReservePanel.tsx:142`, `ThreadView.tsx:364`,
`agents/status/StatusIcon.tsx:58`, plus the ambient sheen on all).

`nf-tile-sheen` (`globals.css:706–733`) is an **infinite 7 s ambient loop on every icon tile
on the page** — the brief explicitly wants motion tied to state change, not decoration.
On the profile grid (`profile/page.tsx:98–101`) that is 8 tiles sweeping continuously.

---

### Q4 — Inline `<svg>` blobs bypassing the icon system

#### **F9 · P0 · 29 inline `<svg>` blocks across 18 feature files**

Full offender list (excluding legitimate data-visualisation SVGs, marked ✓):

| File | Line | Shape | Verdict |
|---|---|---|---|
| `components/site/ThemeToggle.tsx` | 45 | sun | **missing from `UiIcon`** |
| `components/site/ThemeToggle.tsx` | 56 | moon | **missing from `UiIcon`** |
| `components/auth/AuthPanel.tsx` | 397–408 | chevron-down `m6 9 6 6 6-6` | **duplicate — `UiIcon` has `chevron-down` at `UiIcon.tsx:140`** |
| `components/auth/AuthPanel.tsx` | 543–557 | eye / eye-off | **missing from `UiIcon`** |
| `components/site/LanguageSwitcher.tsx` | 52–63 | chevron-down `m6 9 6 6 6-6` | **third copy of the same chevron** |
| `components/app/wallet/BalanceCard.tsx` | 221–235 | eye / eye-off | **second, geometrically different eye** |
| `components/app/wallet/BalanceCard.tsx` | 196–215 | sparkline polyline | ✓ data viz |
| `components/app/messages/MessageThread.tsx` | 138–151 | info circle | **missing from `UiIcon`** |
| `components/app/messages/MessageThread.tsx` | 277–291 | image/photo | **missing from `UiIcon`** |
| `app/(app)/messages/[id]/ThreadView.tsx` | 379–392 | info circle | **verbatim duplicate of MessageThread:138** |
| `app/(app)/messages/[id]/ThreadView.tsx` | 592–606 | image/photo | **verbatim duplicate of MessageThread:277** |
| `components/agent/AgentMobileNav.tsx` | 66–68 | hamburger | **missing from `UiIcon`** |
| `components/agent/AgentMobileNav.tsx` | 110–112 | close `m6 6 12 12M18 6 6 18` | **duplicate of `assistant/glyphs.tsx:77`** |
| `components/agent/StatCard.tsx` | 58–66 | arrow up/down, `strokeWidth="3"` | **missing; also breaks the 1.8 weight** |
| `components/app/ListingCard.tsx` | 173–184 | skyline placeholder | **duplicate ×5** |
| `components/app/listing/ListingGallery.tsx` | 40–51 | skyline placeholder | **duplicate ×5** |
| `components/app/search/MapDock.tsx` | 138–148 | skyline placeholder | **duplicate ×5** |
| `components/app/messages/ListingOptionsSheet.tsx` | 99–104 | skyline placeholder | **duplicate ×5, and no `aria-hidden`** |
| `app/(app)/messages/[id]/ThreadOptionsSheet.tsx` | 117–126 | skyline placeholder | **duplicate ×5, and no `aria-hidden`** |
| `components/app/assistant/glyphs.tsx` | 24–39 | `Stroke` wrapper + 4 glyphs | **a private fork of `UiIcon`; the file's own header admits it** |
| `components/site/StatChart.tsx` | 34 | area chart | ✓ data viz |
| `components/agent/charts/DonutChart.tsx` | 36 | donut | ✓ data viz |
| `components/agent/charts/AreaSparkline.tsx` | 40 | sparkline | ✓ data viz |

**The 400×300 skyline placeholder path is byte-identical in 5 files:**
`ListingGallery.tsx:47`, `ListingCard.tsx:180`, `MapDock.tsx:145`,
`ListingOptionsSheet.tsx:101`, `ThreadOptionsSheet.tsx:123`.

**The chevron exists three times at three stroke weights:**
`UiIcon.tsx:140` (`m6 9.5…`, sw 1.8), `AuthPanel.tsx:407` (`m6 9…`, sw 2),
`LanguageSwitcher.tsx:62` (`m6 9…`, sw 2.5). Two different geometries, three weights,
one meaning.

**The eye exists twice with different geometry:**
`AuthPanel.tsx:554` — `M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z`,
pupil `r=2.9`, `strokeWidth=1.7`, `size=18`.
`BalanceCard.tsx:232` — `M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z`,
pupil `r=2.6`, `strokeWidth=2`, `size=16`.
Different bbox (2.5→21.5 vs 2→22), different pupil, different weight. Same function.

**Root cause:** `UiIcon` is missing the 15 most ordinary UI glyphs in existence —
`close`, `plus`, `minus`, `check`, `chevron-up/left/right`, `menu`, `eye`, `eye-off`,
`sun`, `moon`, `trash`, `info`, `image`, `refresh`, `send`, `spinner`, `arrow-up`,
`arrow-down`, `phone`, `camera`, `copy`, `download`, `external-link`, `lock`, `filter`.
Every inline blob above is a developer routing around that gap.

---

### Q5 — Emoji used as UI icons

#### **F10 · P0 · One emoji in product chrome, four in shipped copy**

| File | Line | Content |
|---|---|---|
| `components/auth/AuthPanel.tsx` | 63 | `` `${t.auth.welcomeBack} 👋` `` — **hard-coded, not translated, on the sign-in screen** |
| `packages/i18n/src/locales/en.ts` | 96 | `body: "Built with love ❤️"` |
| `packages/i18n/src/locales/ha.ts` | 95 | `body: "An gina da so ❤️"` |
| `packages/i18n/src/locales/ig.ts` | 95 | `body: "Ewuru ya na ịhụnanya ❤️"` |
| `packages/i18n/src/locales/yo.ts` | 95 | `body: "Tí a kọ́ pẹ̀lú ìfẹ́ ❤️"` |

`AuthPanel.tsx:63` is the worst of the five: it is on the **first authenticated screen a
user sees**, the emoji is appended in JSX rather than living in the dictionary (so it cannot
be removed per locale), and it renders in the platform emoji font — Apple Color Emoji on
iOS, Noto Color Emoji on Android — meaning the same screen looks materially different on
each. That is the definition of "not designed".

The `❤️` in the four locale files sits on the landing trust strip, directly beside the
hand-drawn Africa vector in `TrustIcon.tsx:46–54`.

#### **F11 · P1 · Typographic `&times;` used as a close icon in 4 places, at 3 sizes**

| File | Line | Size |
|---|---|---|
| `components/app/messages/ListingOptionsSheet.tsx` | 86–88 | `text-[1.05rem]` |
| `app/(app)/wallet/WalletDeck.tsx` | 182–184 | `text-[1.15rem]` |
| `app/(app)/messages/[id]/ThreadView.tsx` | 536–538 | `text-[1rem]` |
| `app/(app)/messages/[id]/ThreadOptionsSheet.tsx` | 104–106 | `text-[1.05rem]` |

Meanwhile `AgentMobileNav.tsx:111` and `assistant/glyphs.tsx:77` draw a real stroked ×.
**Six close affordances, three implementations, three optical sizes.** The `&times;` glyph
inherits Inter's metrics — different weight, different x-height alignment and different
optical centring from a 24-grid stroked cross. It is a text character masquerading as an icon.

---

### Q6 — Tinted icon tiles vs bare monochrome glyphs

#### **F12 · P1 · One universal blue-white chip, no per-icon colour tint**

`.nf-icon-tile` (`globals.css:320–350`) is a single hard-coded recipe:

```css
background:
  radial-gradient(… rgb(255 255 255 / 0.95) …) padding-box,
  linear-gradient(158deg, #FFFFFF 0%, #EDF1F9 100%) padding-box,
  linear-gradient(135deg, rgb(92 124 255 / 0.95) …, rgb(12 57 239 / 0.62) …) border-box;
```

Every tile on every surface is the **same white-to-pale-blue chip with the same blue edge**,
regardless of what the icon means. `wallet-secure`, `bell-alert`, `heart-home`,
`shield-check` and `homes-sparkle` all sit on identical chrome
(`profile/page.tsx:98–101`, `SettingsGroups.tsx:519`, `NotificationsList.tsx:143`).

Reference §1 asks for *"a rounded-square container with a low-opacity tint of the icon's
own colour (blue calculator, orange sleep, pink steps)"*. The machinery for exactly this
was built and then abandoned: `iconRamp` in `packages/design-tokens/src/index.ts:100–115`
defines 7 semantic ramps, `Icon3D.tsx:49–91` maps 36 glyphs onto them, and
`globals.css:2864–2880` tints the tile from `--i3d-core`. **All of it is dead** (F-dead-code
above) because `Icon3D` has zero call sites.

The result: the design system's own colour semantics are unreachable, and every list row
gets the same chip.

Bare monochrome glyphs in list rows also persist where tiles would be right —
e.g. `checkout/[bookingId]/PayPanel.tsx:157`, `admin/switches/page.tsx:94`,
`ListingReviews.tsx:56`, `ReservePanel.tsx:312` all place a naked `UiIcon` in a text row
with an `mt-0.5` nudge.

#### **F13 · P1 · `mix-blend-mode: multiply` makes `BrandIcon` unusable off a white tile**

`globals.css:302` sets `.nf-brand-icon { mix-blend-mode: multiply }`, required because all
57 PNGs are **colour-type 2 (RGB, no alpha channel)** — they are opaque white squares, not
cutouts. Multiply works only against the white `.nf-icon-tile` beneath.

Four call sites pass `tile={false}`, removing that white ground:

- `components/site/landing/PlatformConsole.tsx:51` — `h-6 w-6` (24 px) on a sunken panel
- `app/(app)/checkout/[bookingId]/page.tsx:229` — `h-5 w-5` (**20 px**) inside `.nf-card`
- `app/(app)/checkout/[bookingId]/page.tsx:250` — `h-5 w-5` (**20 px**) on the page canvas
- `app/(app)/checkout/[bookingId]/PayPanel.tsx:228` — `fill` on a card

On the near-black canvas (`--nf-surface-canvas: #000010`) a multiply blend against near-black
yields near-black: **the object effectively disappears**. And a photographic ceramic 3D object
rendered at 20 px is unreadable mush regardless of blend mode. `BrandIcon.tsx:9–11` states
the pack "reads beautifully from about 32px up" — these ship at 20.

#### **F14 · P1 · `BrandIcon` used for navigation, against its own documented rule**

`BrandIcon.tsx:12–13` states verbatim: *"Navigation keeps the stroked UiIcon glyphs; these
are never used for navigation."*

`components/agent/AgentNav.tsx:93` renders `<BrandIcon name={item.icon} fill />` at
`h-[26px] w-[26px]` for **every row of the agent workspace navigation**. A 26 px
photograph with no `currentColor`, no active state, and a `mix-blend-mode: multiply`
dependency, as the primary nav glyph. `AppRail.tsx:119` does the same for the "Become an
Agent" row at `lg:h-8 lg:w-8` (32 px), and `ModeSwitcher.tsx:49` at `size={26}`.

---

### Q7 — Brand / provider marks

#### **F15 · P1 · Google mark is correct geometry but sits on the wrong container**

`ProviderMarks.tsx:3–24` — the four-colour Google G is drawn with correct official hexes
(`#4285F4 #34A853 #FBBC05 #EA4335`) and correct path geometry. Good.

But `AuthPanel.tsx:52` renders it inside `.nf-auth-row__mark`, which is
`background: var(--nf-glass-fill)` (`globals.css:1513`) — **a translucent dark-blue glass
chip**. Google's Sign-In branding guidelines require the G on a **white or neutral-light
square**, not a tinted translucent surface. On the dark theme the multicoloured G sits on
navy glass; on light it sits on `--nf-surface-inset`. Neither is the sanctioned lockup.

#### **F16 · P1 · Apple mark is `currentColor`, not a compliant Sign in with Apple button**

`ProviderMarks.tsx:26–32` — `fill="currentColor"`, so the Apple logo takes
`--nf-content-primary`. Correct geometry (it matches the official mark), but:

- Apple's *Sign in with Apple* HIG mandates one of three button styles (black / white /
  white-outline), a specified corner radius, a specified logo-height-to-button-height ratio,
  and specified clear space. `AuthPanel.tsx:53` puts it in the same generic `.nf-auth-row`
  as Google and email, with a glass chip.
- **This is an App Store review risk**, not just an aesthetic one.

#### **F17 · P1 · No payment brand marks exist at all**

The product takes card payments through Paystack (`PayPanel.tsx`, `WalletDeck.tsx`,
`api/paystack/webhook/route.ts`). Grep for `visa|mastercard|verve|paystack` in `.tsx`
returns **no rendered mark anywhere** — the "Pay by card" option
(`PayPanel.tsx:165–170`) is illustrated with the generic `BrandIcon name="card-lock"`
photograph. The reference set (§1) explicitly calls out brand marks *"rendered at correct
colour … rather than greyed-out generic shapes"*. Nigerian users expect to see Verve
alongside Visa/Mastercard; its absence reads as an untrusted checkout.

Also no Paystack "Secured by" lockup on the checkout, which is standard trust furniture
for that processor.

#### **F18 · P2 · TrustIcon store badges are close but not the official badges**

`TrustIcon.tsx:121–157` redraws the Apple mark and the Google Play triangle from scratch.
The Play four-colour gradients are faithful. But Apple and Google both require the
**full "Download on the App Store" / "Get it on Google Play" lockup badge** with wordmark,
supplied as an asset, not a re-drawn logo on a custom blue tile. Redrawing the mark and
putting it on a `#0A84FF` gradient chip is a trademark-usage problem as much as a design one.

`TrustIcon.tsx:104–119` also hard-codes a non-instance-unique gradient id
(`id="nf-africa-fill"`) — the exact bug `Icon3D.tsx:109–117` documents at length and solves
with `useId()`. If two `africa` tiles ever mount, or one mounts inside a `display:none`
subtree, the fill silently blanks.

---

### Q8 — Icon sizing scale

#### **F19 · P0 · No size scale exists. 23 distinct magic numbers in use.**

Grep across all `.tsx` for `size={n}`:

```
14 → 33×    18 → 28×    16 → 22×    13 → 21×    15 → 17×    12 → 15×
17 → 13×    22 →  8×    20 →  7×    40 →  4×    30 →  4×    26 →  4×
11 →  4×    56 →  2×    46 →  2×    38 →  2×    34 →  2×    24 →  2×
104 → 2×    64 →  1×    52 →  1×    36 →  1×    19 →  1×
```

`UiIcon` alone is called at **14 different sizes**: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
22, 24, 26, 30. There are neighbouring sizes that differ by one pixel and cannot possibly
be a deliberate design decision (13 vs 14 vs 15 across 71 call sites).

There is **no icon size token anywhere.** `packages/design-tokens/src/tokens.css` contains
zero `--nf-icon-*` variables; `index.ts` exports only `iconRamp` (colour). `UiIcon.tsx:266`
hard-codes `size = 16`; `BrandIcon.tsx:92` hard-codes `size = 56`; `Icon3D.tsx:95`
hard-codes `48`; `TrustIcon.tsx:163` hard-codes `40`. Four different defaults in four files
of the same system.

#### **F20 · P2 · Optical alignment is done with ad-hoc nudges**

Eight call sites hand-correct vertical alignment rather than the system doing it:
`mt-0.5` at `ListingReviews.tsx:56`, `SupportChat.tsx:583`, `admin/switches/page.tsx:94`,
`ReservePanel.tsx:312`, `PayPanel.tsx:157`; `mt-1` at three more. Because `UiIcon` glyphs
disagree on optical centre by up to 4.7 grid units (F2), a single nudge value cannot be
right for both `sparkle` and `location`.

`AppRail.tsx:72–79` is worse: it passes `size={24}` (which writes `width="24" height="24"`
attributes) and then overrides with `className="h-[22px] w-[22px] … lg:h-6 lg:w-6"`. The
prop and the class contradict each other; the class wins; the prop is noise.

---

### Q9 — Accessibility

#### **F21 · P2 · The `label` API exists on every icon component and is used zero times**

- `UiIcon.tsx:288–290` — correct pattern: `role="img"` + `aria-label` when `label` is passed,
  `aria-hidden="true"` otherwise.
- `Icon3D.tsx:130–132`, `Icon.tsx:74`, `BrandIcon.tsx:110` — same contract.

Grep for `<UiIcon … label=` → **0**. Grep for `<BrandIcon … label=` → **0**.
Across 276 icon instances, **not one is ever given an accessible name.** Every icon in the
product is decorative-by-default.

This is *safe* — icon-only buttons are correctly labelled on the button
(a programmatic scan of all `<button>` blocks containing an icon and no visible text found
**0 unlabelled cases**; `MobileTabBar.tsx:47`, `ListingActions.tsx:151`, `SavedBoard.tsx:210`
etc. all carry `aria-label`). But it means:

- The `label` prop is dead API surface that will rot.
- Status-bearing icons that are *not* in a button announce nothing — e.g. the verified
  shield at `ReservePanel.tsx:312` and `MapCanvas.tsx:602` conveys "verified listing" purely
  visually.

#### **F22 · P2 · Two inline SVGs have no `aria-hidden`**

- `components/app/messages/ListingOptionsSheet.tsx:99`
- `app/(app)/messages/[id]/ThreadOptionsSheet.tsx:117`

Both are the decorative skyline placeholder. Screen readers announce an unnamed graphic.
(Their three siblings at `ListingGallery.tsx:43`, `ListingCard.tsx:176`, `MapDock.tsx:141`
do carry it — the same shape, inconsistently marked up, in the same product.)

#### **F23 · P2 · `DonutChart` labels a chart with `role="img"` but the arcs carry no data**

`components/agent/charts/DonutChart.tsx:36` — `role="img" aria-label={centerLabel: centerValue}`
announces only the centre figure, not the segment breakdown. Minor; flagged for completeness.

---

### Q10 — App icon, favicon, maskable, splash

#### **F24 · P0 · There is no favicon**

No `favicon.ico`, no `app/icon.tsx`, no `app/icon.png`, no `app/apple-icon.tsx`
anywhere in the repo (verified by `find` for `favicon*|icon.*|apple-icon*` outside
`node_modules`/`.next` — the only hit is `src/app/manifest.ts`).

`layout.tsx:88–94` declares `icons.icon` pointing at `/pwa/icon-192.png` and
`/pwa/icon-512.png`. **Neither is a favicon size.** Browsers will downscale a 192 px PNG
to 16×16 for the tab — a detailed brand mark scaled 12:1 by the browser's own bilinear
filter. There is no 16/32/48 px artwork, no `.ico`, and no SVG favicon.

#### **F25 · P1 · All PWA icons are indexed-palette PNGs**

```
pwa/icon-512.png          512×512  colour-type 3 (indexed, ≤256 colours)   28 KB
pwa/icon-maskable-512.png 512×512  colour-type 3                            21 KB
pwa/apple-touch-icon.png  180×180  colour-type 3                             6 KB
```

The brand mark is a gradient-heavy blue blob (`brand/rentme-logo.png` is 910×857 RGBA,
710 KB). Quantising that to a ≤256-colour palette at 512 px produces **visible banding in
the gradient** — on the Android launcher, the iOS home screen, and the PWA splash. A 512 px
app icon should be 24-bit RGBA; the 7 KB saving is not worth it.

#### **F26 · P1 · No iOS splash screens**

Zero `apple-touch-startup-image` links, and no splash artwork in `public/`.
`layout.tsx:80–87` sets `appleWebApp.capable` + `statusBarStyle: "black-translucent"`, so
an installed iOS PWA launches standalone — into an unbranded flash. Android is covered by
`manifest.ts:36–37` (`background_color`/`theme_color` `#010118`); iOS is not.

Reference §8 requires *"Real app icon, splash, PWA manifest, maskable icons"* and
*"no unstyled flash"*.

#### **F27 · P2 · No `opengraph-image`**

`layout.tsx:55–62` declares `openGraph` metadata with no `images`. Every share link renders
without a card image. Adjacent to icon work; same asset pipeline.

#### **What is right here**

- `manifest.ts:39–60` is well-formed: `any` + `maskable` purposes correctly separated,
  shortcuts with icons, `id`, `scope`, `lang: "en-NG"`, `dir`. The maskable comment at
  `:53–54` shows the 80 % safe zone was actually considered.
- `layout.tsx:85–87` correctly emits `apple-mobile-web-app-capable` via `other` because
  Next renders the standards name — a real, non-obvious bug that was already handled.
- `viewport.themeColor` matches `manifest.background_color` matches
  `--nf-ink-950`. Three-way consistency.

---

## 3. CONCRETE UPGRADE RECOMMENDATIONS

Ordered by impact. Each is implementable as written.

---

### R1 — Rebuild `UiIcon` as a variant-aware, optically-sized primitive

Replace the flat `Record<UiIconName, ReactNode>` with a registry that carries an outline
path, a filled path, and an optional duotone secondary layer per glyph.

```tsx
// design-system/icons/registry.ts
export type GlyphDef = {
  /** Stroked construction, drawn on the 24 grid inside a 17×17 optical square. */
  outline: React.ReactNode;
  /** Solid silhouette. A DIFFERENT, tighter path — never `outline` with fill added. */
  solid?: React.ReactNode;
  /** Optional secondary layer painted at 0.35 alpha for the duotone variant. */
  duo?: React.ReactNode;
};
```

```tsx
// design-system/icons/UiIcon.tsx
type Weight = "regular" | "medium" | "bold";

/** Optical-size compensation: the stroke thickens as the glyph shrinks,
 *  so a 12px icon and a 28px icon read at the same visual weight.
 *  Values are in 24-grid units. */
const STROKE: Record<Weight, (px: number) => number> = {
  regular: (px) => (px <= 14 ? 2.0 : px <= 20 ? 1.8 : 1.6),
  medium:  (px) => (px <= 14 ? 2.3 : px <= 20 ? 2.1 : 1.9),
  bold:    (px) => (px <= 14 ? 2.7 : px <= 20 ? 2.5 : 2.3),
};

export function UiIcon({
  name, size = "md", variant = "outline", weight = "regular",
  symbolEffect, label, className,
}: UiIconProps) { … }
```

Redraw all 33 glyphs to a **single optical square of 17×17 centred on (12, 12)**,
tolerance ±0.5 unit. Fixes F2 (`sparkle` centre-y 9.6 → 12.0, `location` centre-y 14.3 → 12.0,
`pool` max extent 21.8 → 20.6, `chevron-down` 12×6 → scaled into the square).
Standardise `rx` to two values only: `2.6` for large rectangles, `1.9` for small
(fixes F3). Convert `star`, `heart`, `sparkle`, `chat-bubble` to genuine stroke-outline
construction so round terminals apply (fixes F4).

Author `solid` variants for at minimum the 12 state-bearing glyphs:
`home, compass, calendar-booking, heart, user, bell, chat-bubble, star, wallet, grid,
map, verified`.

---

### R2 — Add a size scale, delete 23 magic numbers

```css
/* packages/design-tokens/src/tokens.css */
--nf-icon-2xs: 12px;  /* dense metadata triples */
--nf-icon-xs:  14px;  /* inline with body text */
--nf-icon-sm:  16px;  /* chips, badges, buttons */
--nf-icon-md:  20px;  /* list rows, inputs */
--nf-icon-lg:  24px;  /* nav rail, tab bar */
--nf-icon-xl:  32px;  /* headers, empty states */
--nf-icon-2xl: 44px;  /* tiles */
```

```ts
export const ICON_SIZE = { "2xs":12, xs:14, sm:16, md:20, lg:24, xl:32, "2xl":44 } as const;
export type IconSize = keyof typeof ICON_SIZE;
```

Change `UiIcon`'s `size` prop to `IconSize | number`, accept the token name everywhere,
and add an ESLint rule (`no-restricted-syntax` on `JSXAttribute[name.name='size']` with a
numeric literal inside `UiIcon`/`BrandIcon`) so numbers cannot come back. Codemod the
existing 166 call sites: 11/12/13 → `"2xs"`, 14/15 → `"xs"`, 16/17 → `"sm"`,
18/19/20 → `"md"`, 22/24/26 → `"lg"`, 30+ → `"xl"`.

Remove the `size` + `className` contradiction at `AppRail.tsx:72–79` — pass `size="lg"` only.

---

### R3 — Build the animated icon primitive the reference set headlines

Add a `symbolEffect` prop driven by CSS keyframes on an SVG-level class, gated on both
`prefers-reduced-motion` and the app's own `data-reduce-motion` root flag
(already set by `SettingsGroups.tsx` via `settings-store`).

```tsx
type SymbolEffect = "bounce" | "pulse" | "wiggle" | "rotate" | "replace" | "draw";
// renders: className={`nf-sym ${symbolEffect ? `nf-sym--${symbolEffect}` : ""}`}
// plus data-sym-trigger="state" | "loop" | "once"
```

```css
@keyframes nf-sym-bounce {
  0%,100% { transform: translateY(0)      scale(1); }
  30%     { transform: translateY(-14%)   scale(1.06); }
  55%     { transform: translateY(2%)     scale(0.97); }
  78%     { transform: translateY(-4%)    scale(1.01); }
}
@keyframes nf-sym-wiggle {          /* bell */
  0%,60%,100% { transform: rotate(0); }
  66% { transform: rotate(12deg); } 72% { transform: rotate(-10deg); }
  78% { transform: rotate(6deg);  } 84% { transform: rotate(-3deg); }
}
@keyframes nf-sym-rotate { to { transform: rotate(360deg); } }
@keyframes nf-sym-pulse {
  0%,100% { transform: scale(1);    opacity: 1; }
  45%     { transform: scale(1.18); opacity: 0.85; }
}
.nf-sym { transform-box: fill-box; transform-origin: 50% 50%; }
.nf-sym--wiggle { transform-origin: 50% 18%; }     /* bell pivots at the crown */
@media (prefers-reduced-motion: reduce) {
  .nf-sym { animation: none !important; }
}
:root[data-reduce-motion="1"] .nf-sym { animation: none !important; }
```

For the **`replace`** effect (outline → solid on activation), cross-fade the two paths
inside one `<svg>` rather than swapping elements, so there is no layout tick:

```tsx
<g className="nf-sym-layer nf-sym-layer--outline" data-on={!active}>{def.outline}</g>
<g className="nf-sym-layer nf-sym-layer--solid"   data-on={active}>{def.solid}</g>
```
```css
.nf-sym-layer { opacity: 0; transform: scale(0.88);
  transition: opacity 160ms var(--nf-ease-standard), transform 220ms var(--nf-ease-entrance); }
.nf-sym-layer[data-on="true"] { opacity: 1; transform: scale(1); }
```

**Wire it to these five surfaces:**

| Surface | File:line | Effect |
|---|---|---|
| Mobile tab bar | `components/app/MobileTabBar.tsx:60` | `variant={isActive ? "solid" : "outline"}` + `symbolEffect="replace"` — replaces the invisible `strokeWidth ? 2 : 1.8` |
| Desktop dock | `components/app/DesktopDock.tsx:41` | same |
| Save heart | `ListingActions.tsx:158`, `SavedBoard.tsx:213`, `MapDock.tsx:222` | `variant={saved ? "solid" : "outline"} symbolEffect="pulse"` — **delete the `[&_path]:fill-current` hack**, which is what makes the icon change size |
| Notification bell | `DesktopDock.tsx:21` (`icon: "bell"`), `NotificationsList.tsx` | `symbolEffect="wiggle"` gated on unread count > 0 |
| Refresh / retry | `app/offline/RetryButton.tsx:39–43` | add a `refresh` glyph, `symbolEffect="rotate"` while `retrying` |

**Add a real spinner** (currently none exists in the product): a 24-grid ring of 8 tapered
radial segments with staggered `opacity` keyframes — the reference's "spinner has real radial
segments", not a rotating `border-top`.

**Delete or gate `nf-tile-sheen`** (`globals.css:706–733`). An infinite 7 s ambient sweep on
every tile on the page is decoration; the brief wants motion on state change. Keep it as an
opt-in `shimmer` prop for hero tiles only.

---

### R4 — Close the 26-glyph gap, then delete every inline blob

Add to `UiIcon` and migrate the offenders in §F9 in the same commit:

`close`, `plus`, `minus`, `check`, `chevron-up`, `chevron-left`, `chevron-right`, `menu`,
`eye`, `eye-off`, `sun`, `moon`, `trash`, `info`, `image`, `refresh`, `spinner`, `send`,
`arrow-up`, `arrow-down`, `phone`, `camera`, `copy`, `download`, `external-link`, `lock`.

Migration map:

| Delete | Replace with |
|---|---|
| `ThemeToggle.tsx:45,56` | `<UiIcon name="sun"/>` / `"moon"` |
| `AuthPanel.tsx:397–408` | `<UiIcon name="chevron-down"/>` |
| `LanguageSwitcher.tsx:52–63` | `<UiIcon name="chevron-down"/>` |
| `AuthPanel.tsx:543–557`, `BalanceCard.tsx:221–235` | `<UiIcon name={off ? "eye-off" : "eye"}/>` — **one geometry, not two** |
| `MessageThread.tsx:138–151`, `ThreadView.tsx:379–392` | `<UiIcon name="info"/>` |
| `MessageThread.tsx:277–291`, `ThreadView.tsx:592–606` | `<UiIcon name="image"/>` |
| `AgentMobileNav.tsx:66–68` | `<UiIcon name="menu"/>` |
| `AgentMobileNav.tsx:110–112` | `<UiIcon name="close"/>` |
| `StatCard.tsx:58–66` | `<UiIcon name={up ? "arrow-up" : "arrow-down"} weight="bold"/>` |
| `&times;` at `ListingOptionsSheet.tsx:87`, `WalletDeck.tsx:183`, `ThreadView.tsx:537`, `ThreadOptionsSheet.tsx:105` | `<UiIcon name="close" size="sm"/>` |
| `components/app/assistant/glyphs.tsx` (whole file) | `history`, `plus`, `trash`, `close` in `UiIcon`; delete the file (its own header at `:6–8` says to) |

Extract the 5× duplicated skyline into one component and give it the `aria-hidden` the
two sheet copies are missing:

```tsx
// components/app/ListingPlaceholder.tsx
export function ListingPlaceholder({ withSun = false, className }: …) { … }
```
Used by `ListingGallery.tsx:40`, `ListingCard.tsx:173`, `MapDock.tsx:138`,
`ListingOptionsSheet.tsx:99`, `ThreadOptionsSheet.tsx:117`.

Add an ESLint guard so this cannot regress:
```js
// eslint.config.js
"no-restricted-syntax": ["error", {
  selector: "JSXElement[openingElement.name.name='svg']",
  message: "Icons go through UiIcon. Charts belong in components/*/charts/.",
}]
```
with an override allowlist for `design-system/icons/**` and `**/charts/**`.

---

### R5 — Kill the emoji and the emoji-adjacent

- `components/auth/AuthPanel.tsx:63` — delete ` 👋`. If a warm greeting is wanted, it belongs
  in the dictionary as words, not as a platform-rendered colour glyph on the sign-in screen.
- `packages/i18n/src/locales/{en,ha,ig,yo}.ts:95–96` — replace ` ❤️` with a
  `<UiIcon name="heart" variant="solid" size="xs"/>` rendered by the component, so it takes
  the brand colour and the icon grid instead of Apple Color Emoji.

---

### R6 — Fix the `BrandIcon` asset pipeline

Three defects, one root cause (the pack was auto-cropped and exported without alpha):

1. **Normalise the canvas.** Re-export all 57 PNGs to **512×512 with the object occupying a
   consistent 78 % safe square**, so `tag-hash` and `bell-alert` render at the same optical
   size (F1). This is a batch operation over `public/brand/icons/`.
2. **Export with alpha (colour-type 6).** Then delete
   `globals.css:302` `mix-blend-mode: multiply`, which is the only reason the pack cannot
   sit on a coloured or dark surface (F13).
3. **Enforce the minimum size in the component.** `BrandIcon.tsx` should warn (dev) or clamp
   when `size < 32`, and the four `tile={false}` call sites at 20–28 px
   (`PlatformConsole.tsx:51`, `checkout/page.tsx:229,250`, `PayPanel.tsx:228`) should switch
   to `UiIcon` — a photograph at 20 px is never the right instrument.
4. **Stop using it for navigation.** `AgentNav.tsx:93`, `AppRail.tsx:119`,
   `ModeSwitcher.tsx:49` → `UiIcon` with `variant="solid"` on active, per the component's own
   documented rule at `BrandIcon.tsx:12–13`.

Ship AVIF/WebP alongside — 3.11 MB of PNG for one icon family is heavy for the stated
"mid-range Android on a metered data bundle" audience (`manifest.ts:11–13`).

---

### R7 — Revive the semantic tint, or delete the dead system

The `iconRamp` machinery (`packages/design-tokens/src/index.ts:100–115`) is exactly the
"low-opacity tint of the icon's own colour" the brief asks for, and it is unreachable.

Add a `tone` prop to the tile and drive the chip from a CSS custom property:

```tsx
<BrandIcon name="wallet-secure" tone="royal" />   // → style={{ "--tile-tone": "…" }}
```
```css
.nf-icon-tile {
  --tile-tone: var(--nf-electric-400);            /* default, today's blue */
  background:
    radial-gradient(125% 100% at 24% 8%, #fff 0%, color-mix(in oklab, var(--tile-tone) 6%, #fff) 45%, transparent 74%) padding-box,
    linear-gradient(158deg, #fff 0%, color-mix(in oklab, var(--tile-tone) 9%, #fff) 100%) padding-box,
    linear-gradient(135deg,
      color-mix(in oklab, var(--tile-tone) 85%, white) 0%,
      color-mix(in oklab, var(--tile-tone) 55%, transparent) 24%,
      transparent 74%) border-box;
}
```

Map the tones from the existing `defaultRamp` table in `Icon3D.tsx:49–91` — that work is
already done, it just needs to move onto the live component. Wire it into
`SettingsGroups.tsx:519` (`GroupCard`), `NotificationsList.tsx:143`, `profile/page.tsx:100`,
`WalletActions.tsx:91`.

Then **delete** `Icon.tsx`, `Icon3D.tsx`, `glyphs.ts`, `globals.css:2864–2880`,
`public/icons/` (31 files, 1.32 MB), `public/icons/_manifest.json`, and drop `"/icons/"`
from `sw.js:63`.

---

### R8 — Provider and payment marks

- **Google**: give `.nf-auth-row__mark` a `--mark-ground` override so the Google row renders
  the G on `#FFFFFF` in both themes, per Google's Sign-In branding guidelines.
- **Apple**: build a dedicated `SignInWithAppleButton` matching the HIG — black fill in dark
  theme / white with 1px `#000` outline in light, corner radius per spec, logo height at
  ~43 % of button height, minimum clear space. This is App Store review surface, not taste.
- **Payments**: add `VisaMark`, `MastercardMark`, `VerveMark` and a `PaystackLockup` to
  `ProviderMarks.tsx` (or a new `components/payments/BrandMarks.tsx`) in official colours,
  and render the trio beneath the "Pay by card" option at `PayPanel.tsx:165`.
- **TrustIcon**: replace the redrawn store marks at `TrustIcon.tsx:121–157` with the official
  App Store / Google Play badge assets; and fix the hard-coded gradient id at
  `TrustIcon.tsx:110` to use `useId()`, exactly as `Icon3D.tsx:109–117` documents.

---

### R9 — Ship a real app-icon set

```
app/icon.svg                 →  vector favicon, scales to any tab size
app/icon.png                 →  32×32 RGBA fallback
app/apple-icon.png           →  180×180 RGBA
public/favicon.ico           →  16 + 32 + 48 multi-resolution
public/pwa/icon-192.png      →  re-export as colour-type 6 (RGBA)
public/pwa/icon-512.png      →  re-export as colour-type 6
public/pwa/icon-maskable-512 →  re-export as colour-type 6, keep the 80% safe zone
app/opengraph-image.tsx      →  1200×630, generated from the brand lockup
public/pwa/splash/*.png      →  iOS launch images per device class
```

Add the splash links to `layout.tsx` `metadata.other` (Next has no first-class
`appleWebApp.startupImage` for every size; the `other` map is the escape hatch already used
at `layout.tsx:85–87`):

```ts
other: {
  "apple-mobile-web-app-capable": "yes",
  "apple-touch-startup-image": "/pwa/splash/iphone-14-pro.png",
  // …plus per-device <link media="…"> variants
}
```

The indexed-palette re-export (F25) is a one-line change in whatever generated `public/pwa/`
and is worth the ~40 KB.

---

### R10 — Make icons announce when they carry meaning

`UiIcon`'s `aria` contract (`UiIcon.tsx:288–290`) is correct and should stay. But:

- Add `label` at the ~10 sites where the icon **is** the information and is not inside a
  labelled control: the verified shield at `ReservePanel.tsx:312`, `MapCanvas.tsx:602`,
  `SupportChat.tsx:583`; the warning bell at `PayPanel.tsx:157`, `admin/switches/page.tsx:94`;
  the trend arrows at `StatCard.tsx:58`.
- Add `aria-hidden="true"` to `ListingOptionsSheet.tsx:99` and `ThreadOptionsSheet.tsx:117`
  (resolved for free by R4's shared `ListingPlaceholder`).
- Keep the current default (`aria-hidden` when unlabelled) — it is the right call and it is
  why the programmatic scan found zero unlabelled icon-only buttons.

---

## 4. FINDINGS INDEX

| # | Severity | Finding |
|---|---|---|
| F1 | **P0** | 57 `BrandIcon` PNGs at 17 canvas sizes → 1.5× optical-size spread in the same grid |
| F2 | **P0** | `UiIcon` optical mass varies 4.4×; `sparkle` +2.4u high, `location` −2.3u low, `pool` breaks the safe area |
| F3 | P1 | Corner radii span 13 %–27 % of shape width; no radius constant |
| F4 | P1 | Four glyphs are filled silhouettes drawn as strokes; zero-length dot paths in `building-apartment` |
| F5 | **P0** | Fixed `strokeWidth 1.8` at every size → 73 usages render sub-1px strokes; 16 stroke values app-wide |
| F6 | **P0** | No filled/outline/duotone variants; tab-bar "active" is a 0.18 px stroke change |
| F7 | P1 | Save heart "fill" is `[&_path]:fill-current`, making the filled icon ~11 % larger |
| F8 | **P0** | Zero symbol effects on `UiIcon` (166 usages); no spinner, no refresh, no send; `nf-ring` has 0 call sites |
| F9 | **P0** | 29 inline `<svg>` in 18 files; skyline path duplicated 5×, chevron 3×, eye 2×, info 2×, image 2× |
| F10 | **P0** | 👋 emoji hard-coded on the sign-in screen; ❤️ in all 4 locale files |
| F11 | P1 | `&times;` text character as a close icon in 4 places at 3 sizes; 6 close affordances / 3 implementations |
| F12 | P1 | One universal blue-white tile; the `iconRamp` semantic-tint system is dead code |
| F13 | P1 | `mix-blend-mode: multiply` + alpha-less PNGs → `tile={false}` icons vanish on dark; two render at 20 px |
| F14 | P1 | `BrandIcon` used as nav glyph at 3 sites, against its own documented rule (`BrandIcon.tsx:12`) |
| F15 | P1 | Google mark on a translucent glass chip, not the sanctioned white ground |
| F16 | P1 | Apple mark is not a compliant Sign in with Apple button — App Store review risk |
| F17 | P1 | No Visa / Mastercard / Verve / Paystack marks anywhere in checkout |
| F18 | P2 | Store badges redrawn rather than official assets; `TrustIcon` has a non-unique gradient id |
| F19 | **P0** | No size scale; 23 magic numbers, `UiIcon` alone at 14 sizes; 4 different component defaults |
| F20 | P2 | 8 ad-hoc `mt-0.5`/`mt-1` optical nudges; `AppRail` `size` prop contradicts its own className |
| F21 | P2 | `label` API used 0 times across 276 icon instances; status icons announce nothing |
| F22 | P2 | 2 inline SVGs missing `aria-hidden` |
| F23 | P2 | `DonutChart` `aria-label` omits the segment breakdown |
| F24 | **P0** | No favicon of any kind; browser downscales a 192 px PNG to 16 px |
| F25 | P1 | All PWA icons are indexed-palette → gradient banding on launcher and splash |
| F26 | P1 | No iOS splash screens; installed PWA flashes unbranded |
| F27 | P2 | No `opengraph-image` |
| — | — | **Dead code**: `Icon.tsx` + `Icon3D.tsx` + `glyphs.ts` (23.5 KB, 0 imports), `globals.css:2864–2880`, `public/icons/` (31 files, 1.32 MB, 0 references, still precached by `sw.js:63`) |

**Total: 27 findings + 1 dead-code cluster. 9 P0, 12 P1, 7 P2.**

---

## 5. WHAT IS GENUINELY GOOD

Stated so the recommendations are read as calibrated, not reflexive.

- `Icon3D.tsx:109–117` — the per-instance `useId()` gradient-id fix, with a comment
  explaining the `display:none` failure mode. That is senior work. (It should be ported to
  `TrustIcon`, which still has the bug.)
- `BrandIcon.tsx:123–137` — the percentage-padding-resolves-against-the-containing-block
  explanation and the pixel-derived fix. A real, subtle bug, diagnosed and documented.
- `manifest.ts` — well-formed, with `any`/`maskable` correctly separated and the 80 % safe
  zone actually considered (`:53–54`).
- `layout.tsx:85–87` — correctly works around Next emitting `mobile-web-app-capable` instead
  of the apple-prefixed tag.
- Every icon animation that exists is `prefers-reduced-motion` gated
  (`globals.css:403`, `448`, `919`, `2126`), and the product ships its own in-app reduce-motion
  setting on top.
- Zero unlabelled icon-only buttons across the whole app — verified programmatically.
- Zero third-party icon libraries. No lucide, no heroicons, no react-icons. The set is
  authored, which is the right foundation — it just needs the discipline applied to it.
