# Audit 05 — Interactive Controls (buttons, chips, segmented, toggles, inputs, sheets, progress)

Scope: every interactive control in `apps/web/src`.
Yardstick: `PREMIUM_REFERENCE_BRIEF.md` §5 (Buttons and controls), plus §7 (Motion) and §8 (App Store readiness).
Paths below are relative to `/home/user/read-it-well/apps/web/src`.

Headline: **the control layer is a CSS class family, not a component system.** There is a
genuinely thoughtful set of `.nf-*` classes in `app/globals.css`, but there is **zero React
primitive layer** — no `components/ui/` directory exists. Every one of the ~363 interactive
elements in the app re-specifies its own geometry with Tailwind overrides on top of the class.
That is the root cause of most findings below.

---

## 1. What exists

### 1.1 The CSS control family (`app/globals.css`)

| Class | Line | Role |
|---|---|---|
| `.nf-btn` | 1330 | Base button: inline-flex, gap .5rem, weight 650, `--nf-text-body` (0.875rem), radius `--nf-radius-lg` (18px), padding `.72rem 1.2rem` |
| `.nf-btn::after` | 1352 | Specular sheen over top half |
| `.nf-btn:active` | 1362 | `translateY(1px)` — the only press state |
| `.nf-btn:disabled` | 1365 | `opacity: 0.24` |
| `.nf-btn--primary` | 1372 | Gradient CTA + blue glow + hover light-sweep ripple |
| `.nf-btn--glass` | 1412 | Translucent white + hairline |
| `.nf-btn--ghost` | 1425 | Transparent |
| `.nf-btn--lg` | 1438 | Padding `.92rem 1.65rem`, radius `--nf-radius-xl` (22px) |
| `.nf-auth-row` | 1457 | Bespoke full-width provider button (its own material, not a `.nf-btn`) |
| `.nf-field` | 1522 | Input: padding `.95rem 1.05rem`, gradient border-box, inset shadow, real focus ring at 1546 |
| `.nf-label` | 1561 | Caption-size label above the field |
| `.nf-icon-btn` | 1573 | 2.6rem circular glass icon button; `:active { scale(0.94) }` |
| `.nf-icon-btn--square` | 1605 | Card-radius variant |
| `.nf-chip` | 1659 | Pill, `.45rem .9rem`, caption size; `[aria-pressed=true]` / `--active` = brighter border + glow |
| `.nf-badge` | 1694 | Status pill shell — **layout and type only** |
| `.nf-badge--success/--brand/--warning` | 1704–1715 | The only three tinted variants |
| `.nf-badge-overlap` | 1723 | Corner ribbon badge |
| `.nf-count-badge` | 1747 | Circular count badge |
| `.nf-tag-pill` (+ `--success/--warning/--neutral`) | 1790–1818 | Small uppercase data tag |
| `.nf-action-circle` | 1848 | Icon-over-label circular action (wallet Send/Receive) |
| `.nf-skeleton` | 1621 | Shimmer slab, reduced-motion aware |
| `.nf-snap-x` | 1641 | Snap scroller, scrollbars hidden |
| `.nf-scroll-x` | 2768 | Plain scroller, scrollbars hidden, **no snap** |
| `.nf-tabbar` / `.nf-tab-pop` | 2068 / 2099 | Floating glass tab bar + pop-in active pill |
| `.nf-dock__btn` | 2160 | Desktop dock button |

Global focus ring is solid: `app/globals.css:91` suppresses mouse focus rings and
`:96` gives every `a, button, input, select, textarea, [tabindex]` a 2px brand
`:focus-visible` outline with offset. **Focus-visible coverage is one of the strongest
things in this codebase.**

Light-theme overrides exist for `.nf-chip`, `.nf-icon-btn`, `.nf-btn--glass`,
`.nf-btn--primary`, `.nf-btn--ghost`, `.nf-field` (globals.css:2806–2852, 3065). Both
themes are genuinely designed for controls.

Motion tokens exist and include a real overshoot spring:
`packages/design-tokens/src/tokens.css:220` → `--nf-ease-spring: cubic-bezier(0.34,1.56,0.64,1)`,
and `:359` collapses all durations to 1ms under reduced motion.

### 1.2 Component-level controls that exist

- `components/app/account/Toggle.tsx` — animated switch, `role="switch"`, thumb shadow.
- `components/app/filters/FilterDrawer.tsx:161` — a **second, duplicate** `Switch`.
- `components/app/filters/FilterDrawer.tsx:106` and `app/(app)/listing/[id]/ReservePanel.tsx:38`
  — two **duplicate** `Stepper` components at different sizes.
- `components/app/account/SettingsGroups.tsx:460` — `SegmentedRow` (chip radiogroup).
- `components/app/bookings/BookingsTabs.tsx` + `app/(app)/bookings/MyBookings.tsx:265`
  — two **copy-pasted** sliding-underline tab bars.
- `components/auth/AuthPanel.tsx:510` — four-segment password strength meter.
- `app/agent/list/ListingWizard.tsx:680` — the app's only segmented progress rail.
- `app/admin/_components/ui.tsx:92` — `StatusChip` with a 5-tone semantic map.
- `components/agent/ApplyWizard.tsx:473` — `UploadZone` with three honest states.

---

## 2. Gaps vs the reference standard

### P0 — must fix before submission

---

**P0-1 · There is no Button primitive. 45 distinct button geometries ship today.**

`grep` over every `<button|<Link|<a>` with a className:

- 363 interactive elements carry a className.
- 140 use `nf-btn`, 51 use `nf-chip`, 18 use `nf-icon-btn`.
- Across the 140 `nf-btn` call sites there are **45 distinct override signatures**.

Concrete divergence in *height*, on the same visual class:

| Height | Example |
|---|---|
| 32px | `components/app/search/MapCanvas.tsx:646` `nf-btn nf-btn--primary … h-8 … text-[0.75rem]` |
| 36px | `components/app/ListingCard.tsx:54,64,74` `nf-btn nf-btn--glass h-9 px-3.5 text-[0.8125rem]` |
| 40px | `components/app/account/SupportChat.tsx:498` `nf-btn nf-btn--primary h-10 w-10 rounded-full p-0` |
| 41px (default) | `.nf-btn` unmodified — globals.css:1330 |
| 44px | `components/app/filters/FilterDrawer.tsx:529` `nf-btn nf-btn--primary min-h-11 flex-1` |
| ~46px | `components/auth/AuthPanel.tsx:89,221` `nf-btn nf-btn--primary w-full py-3.5` |
| ~48px | `components/app/wallet/WalletActions.tsx:290` `nf-btn nf-btn--primary … py-3` |

And in *font size*: `0.75rem`, `0.8125rem`, `0.8438rem`, `0.875rem`, `0.9375rem`,
`--nf-text-body`, `--nf-text-body-lg` — **seven** button label sizes with no scale behind them.

`disabled` opacity is overridden **7 different ways** at 29 call sites
(`opacity-60` ×16, `-40` ×4, `-70` ×2, `-50` ×2, `-35` ×2, `-45` ×1, `-0` ×2) on top
of the base `opacity: 0.24` (globals.css:1366). A studio-built product has one
disabled recipe, and 0.24 alone fails WCAG contrast on the label.

Counting genuinely distinct *implementations* (not just overrides):

1. `.nf-btn` + 3 variants (globals.css:1330)
2. `.nf-auth-row` — its own material, own padding, own shadow (globals.css:1457)
3. `.nf-icon-btn` (+ `--square`) (globals.css:1573)
4. `.nf-action-circle` (globals.css:1848)
5. `.nf-dock__btn` (globals.css:2160)
6. `.nf-tab-pop` (globals.css:2099)
7. `.nf-chip` doubling as button, tab, radio and filter (globals.css:1659)
8. Photo-overlay glass circle, hand-rolled and duplicated 4×:
   `components/app/listing/ListingActions.tsx:144,155`,
   `components/app/listing/ListingGallery.tsx:162`, `app/(app)/saved/SavedBoard.tsx:211`
9. `components/agent/ApplyWizard.tsx:256` — bespoke agent-type card button
10. `app/agent/list/ListingWizard.tsx:1083` — bespoke disclosure row button
11. `components/app/wallet/WalletActions.tsx:78` — `nf-card` used as a button
12. `components/agent/AgentMobileNav.tsx:104` — bespoke square nav button

**Twelve implementations, 45 override signatures.** This is the top-priority finding.

---

**P0-2 · Press states are hover-first. On touch, nothing happens.**

The reference asks for *scale-down + shadow compression + spring-back*.

What ships:
- `.nf-btn:active` = `translateY(1px)` only (globals.css:1362). No scale, no shadow
  compression, standard ease — **not** the spring token that already exists.
- `.nf-btn--primary` puts its signature effect (the light-sweep ripple, globals.css:1381–1397)
  and its glow lift (`:1403`) **entirely on `:hover`**. On a phone that code never runs.
  The most expensive piece of button craft in the codebase is invisible to the App Store audience.
- `.nf-chip:hover` gets `translateY(-1px)` and a glow (globals.css:1676); `.nf-chip` has
  **no `:active` rule at all**. 51 chips with no touch feedback.
- Only **10 elements in the whole app** carry any `active:scale`
  (`ListingActions.tsx:144,155`, `ListingGallery.tsx:162`, `MapCanvas.tsx:561,588`,
  `search/page.tsx:215,239`, `rent/page.tsx:98`, `saved/SavedBoard.tsx:211,228`) —
  and they use four different values (`scale-90`, `scale-95`, `scale-[0.96]`).
- **`navigator.vibrate` appears zero times in the codebase.** No haptics anywhere.
  Reference §5 and §8 both require haptic pairing on primary actions.

---

**P0-3 · No segmented control matches the reference. Five different implementations, none of which slides a capsule.**

The reference: *"the active segment is a floating capsule with its own shadow that **slides**
between positions."*

| # | Where | Behaviour |
|---|---|---|
| 1 | `components/app/filters/ViewToggle.tsx:22` | Chips in a glass pill — **hard-swap**, no indicator |
| 2 | `components/app/bookings/BookingsTabs.tsx:172` | Sliding **2px underline**, not a capsule |
| 3 | `app/(app)/bookings/MyBookings.tsx:298` | Byte-identical copy of #2 |
| 4 | `app/agent/bookings/BookingsWorkspace.tsx:379` | Chip row — **hard-swap** |
| 5 | `components/app/account/SettingsGroups.tsx:487` | Chip radiogroup — **hard-swap** |

Three of five hard-swap. The two that animate animate the wrong thing (a hairline underline
is a 2015 Material tab, not an iOS segmented control). `.nf-tab-pop` (globals.css:2099)
already proves the team can build a pill that pops in — but even that scales in place
rather than sliding, and it is only used by the bottom nav.

---

**P0-4 · Sheets are plain slide-ins: no drag handle, no detents, no spring, no drag-to-dismiss.**

There are **8 sheet/dialog implementations**, all hand-rolled, all copy-paste variants
of the same 12 lines:

| File | Line | Body lock | Handle | Detents | Focus trap |
|---|---|---|---|---|---|
| `components/app/filters/FilterDrawer.tsx` | 320 | ✅ :244 | ❌ | ❌ | ❌ |
| `app/admin/_components/AdminActions.tsx` | 99 | ✅ :80 | ❌ | ❌ | ❌ |
| `app/(app)/bookings/MyBookings.tsx` | 169 | ✅ :158 | ❌ | ❌ | ❌ |
| `app/(app)/settings/AccountSection.tsx` | 157 | ✅ :126 | ❌ | ❌ | ❌ |
| `app/(app)/wallet/WalletDeck.tsx` | 165 | ✅ :152 | ❌ | ❌ | ❌ |
| `app/agent/bookings/BookingsWorkspace.tsx` | 113 | ✅ :85 | ❌ | ❌ | ❌ |
| `app/agent/listings/ListingsWorkspace.tsx` | 172 | ✅ :139 | ❌ | ❌ | ❌ |
| `components/app/messages/ListingOptionsSheet.tsx` | 60 | **❌ MISSING** | ❌ | ❌ | ❌ |
| `app/(app)/messages/[id]/ThreadOptionsSheet.tsx` | 79 | **❌ MISSING** | ❌ | ❌ | ❌ |

Specific defects:
- **Zero drag handles.** Every reference bottom sheet has one (brief §7, screen 12).
- **Zero detents / snap points.** No sheet can be half-open.
- **Zero drag-to-dismiss.** No `onPointerDown` / `touchstart` handler exists anywhere
  in the app for sheet gestures.
- Entrance is `nf-rise` (globals.css:2577) — a generic `translateY(18px)` + fade at
  `--nf-ease-entrance`. Not spring physics, and it is the **same** animation used for
  list-item reveals, so a modal enters exactly like a paragraph.
- `ListingOptionsSheet.tsx:46` and `ThreadOptionsSheet.tsx:66` **never lock body scroll**
  — the page scrolls behind the open sheet on iOS.
- **No focus trap in any of the eight.** They set initial focus and handle Escape, but
  Tab escapes the dialog into the page beneath. This is a real accessibility failure
  for `aria-modal="true"`.
- Backdrop blur is inconsistent: `bg-black/60 backdrop-blur-sm` in most, but
  `app/agent/bookings/BookingsWorkspace.tsx:115` and `app/agent/listings/ListingsWorkspace.tsx:174`
  are `bg-black/60` with **no blur**.

---

### P1 — visible quality gap

---

**P1-1 · `.nf-badge` with no modifier renders as an invisible pill.**

`app/globals.css:1694` defines `.nf-badge` with layout + type only — **no background,
no colour**. It inherits whatever the parent is. Bare `nf-badge` ships at:

- `components/app/account/SettingsGroups.tsx:142, 272`
- `components/app/AppRail.tsx:84` (has `--brand`, fine) but `:139` ok
- `app/agents/status/page.tsx:104`
- `app/agent/bookings/BookingsWorkspace.tsx:54` (the `default` branch of `statusBadgeClass`)
- `app/agent/dashboard/page.tsx:171`, `app/agent/dashboard/RealDashboard.tsx:221`
- `app/(app)/profile/AccountProfile.tsx:116`
- `app/admin/_components/ui.tsx:103` relies entirely on inline `TONE_STYLE`

So a booking whose status falls to `default` renders its status as **plain untinted text
in a pill-shaped void** — exactly the "generic grey" the reference forbids.

**P1-2 · Status pills have no icons and only three semantic tones.**

Reference: *"small, tinted background, **icon** + label (FOR SALE, Good, New, Tracking,
Paid $500)"*. Of ~30 badge renderings, only 4 carry an icon
(`ListingOptionsSheet.tsx:113`, `ThreadOptionsSheet.tsx:135`, `listing/[id]/page.tsx:298`,
`ListingHostPanel.tsx:41`). The rest are text-only.

The CSS offers `--success`, `--brand`, `--warning`. There is **no `--danger`/`--error`
and no `--info` badge variant**, so `app/admin/_components/ui.tsx:48` had to build a
parallel `TONE_STYLE` object with inline styles for its 5 tones, and
`app/agent/listings/ListingsWorkspace.tsx:275` had to build a third (`toneStyle`).
**Three separate status-colour vocabularies for one product.**

**P1-3 · Chips are 37px tall. 47 of 51 chip instances are under the 44pt minimum.**

`.nf-chip` computes to `0.8125rem × 1.55 + 2 × 0.45rem + 2px ≈ 36.6px`.
Only 4 call sites add `min-h-11`
(`FilterDrawer.tsx:479`, `ActiveFilters.tsx:38`, `ViewToggle.tsx:33`, `ListingWizard.tsx:1005`).
The other **47** ship at ~37px, including primary interaction surfaces:

- `components/app/wallet/WalletActions.tsx:265` — quick-amount money chips
- `components/app/wallet/TransactionsSection.tsx:110` — transaction filters
- `components/app/NotificationsList.tsx:121` — notification filters
- `components/app/account/SettingsGroups.tsx:493` — every settings segmented row
- `app/agent/bookings/BookingsWorkspace.tsx:392` — the agent's booking tabs
- `app/admin/_components/AdminActions.tsx:669` — ticket state switcher
- `app/(app)/wallet/WalletDeck.tsx:468` — deposit amount chips
- `components/app/search/MapCanvas.tsx:661` — `h-8` = **32px**

Two files bypass the class entirely with `!important`:
`app/agent/bookings/BookingsWorkspace.tsx:171` `nf-chip !py-1.5 !text-[0.75rem]`,
`app/admin/_components/AdminNav.tsx:98` `nf-chip … !py-1.5`. `!important` on a control
class is the smell that says the class has no size API.

**P1-4 · `.nf-icon-btn` is 41.6px, and its own comment claims 44px.**

`app/globals.css:1571` reads *"Same material as nf-btn--glass at a 44px touch target"*.
The rule at `:1577` sets `width: 2.6rem; height: 2.6rem` = **41.6px**. The comment is
factually wrong. Worse, 9 call sites shrink it further:
`h-10` (40px) at `AccountSection.tsx:171`, `WalletDeck.tsx:176`, `MapCanvas.tsx:752,761`;
`h-9` (36px) at `PageHeader.tsx:53`, `AssistantChat.tsx:432,624`, `ListingOptionsSheet.tsx:85`,
`ThreadOptionsSheet.tsx:103`, `ThemeToggle.tsx:37`;
`h-8` (32px) at `MapDock.tsx:212,228`, `ReservePanel.tsx:62,74` (the guest stepper).

**P1-5 · Chip rows: no scroll-snap, no edge fade.**

`.nf-scroll-x` (globals.css:2768) is `overflow-x:auto` + hidden scrollbars. That's all.
A separate `.nf-snap-x` (globals.css:1641) has `scroll-snap-type: x mandatory` — but it is
used **only on the marketing landing page** (`CarouselRail.tsx:50`, `MoodRow.tsx:40`,
`PopularDestinations.tsx:39`). Every in-app chip row uses the non-snapping one:

- `components/app/filters/ActiveFilters.tsx:184` — active filter chips
- `components/app/filters/CategoryTiles.tsx:49` — category tiles
- `app/(app)/search/page.tsx:205` — popular destinations
- `app/(app)/rent/page.tsx:88` — rent by city
- `components/app/wallet/TransactionsSection.tsx:103`
- `components/app/NotificationsList.tsx:114`
- `components/app/listing/ListingAmenities.tsx:77`
- `app/admin/_components/AdminNav.tsx:87`

Scrollbars **are** correctly hidden on all of them (✅ vs §8).
Bleed: the `-mx-5 … px-5` negative-margin pattern **is** used correctly on most rows, so
the next chip does peek past the gutter (✅). But there is **no mask/fade on the right
edge** anywhere — `mask-image` is used for hero art (globals.css:2237, 2345, 2538) and
never for a scroller.

**P1-6 · No spinner exists in the codebase. Loading is text-swap only.**

`grep` for `animate-spin|Spinner|spinner` → **zero component hits**. All 18 pending states
swap the label:

- `app/(app)/listing/[id]/ReservePanel.tsx:304` → `"Reserving your dates..."`
- `app/(app)/checkout/[bookingId]/PayPanel.tsx:176` → `"Opening the secure page..."`
- `components/app/wallet/WalletActions.tsx:293` → `"Checking your request"`
- `components/agent/ApplyWizard.tsx:389` → `"Finishing your uploads..."`

Label-swap causes the button to **change width mid-press**, which reads as a glitch.
`aria-busy` is set in exactly **two** places (`AuthPanel.tsx:220`, `ApplyWizard.tsx:485`)
out of 18 pending buttons. The reference's spinner-in-button pattern is absent.

Optimistic UI exists in exactly one place —
`components/app/listing/ListingActions.tsx:87–109` (heart flips instantly, reverts on
failure). That is genuinely good and should be the template; it is used nowhere else.
`components/app/wallet/TransactionsSection.tsx` and every admin action wait for a full
`router.refresh()` round trip with no skeleton.

**P1-7 · Progress: one segmented bar in the whole product, and it is a 6px touch target.**

`app/agent/list/ListingWizard.tsx:686–697` is the only segmented progress bar. Each
segment is `<button className="block h-1.5 w-full rounded-full">` — a **6px-tall
interactive button**. It also has no animated fill and no value riding on it.

`components/auth/AuthPanel.tsx:517` (password strength) is four `h-1` static segments
with `transition-colors` only — no fill animation.

Nowhere in the app is there:
- an animated progress fill,
- a percentage/value riding on a bar,
- `role="progressbar"` or `aria-valuenow` (zero hits),
- a `<progress>` element.

Reference §5: *"Progress bars that animate their fill, with the percentage riding on
the bar."* Not met.

**P1-8 · Multi-step flows disagree with each other and with the reference.**

Reference §6: *"Multi-step flows show a segmented progress bar at the very top."*

| Flow | Indicator |
|---|---|
| `app/agent/list/ListingWizard.tsx:680` | 7-segment bar ✅ |
| `components/agent/ApplyWizard.tsx:195–231` | 6 numbered **circles** with connectors ❌ |
| `app/(app)/checkout/[bookingId]/page.tsx` | **nothing** ❌ |
| `components/site/Onboarding.tsx` | **no dots at all** ❌ (reference §6 explicitly calls for dot/segment progress in onboarding) |

Three different answers to the same question, in one app.

**P1-9 · Pinned action bars: only two exist, one is solid.**

Reference §3: *"Sticky bottom action bars are blurred, not solid."*

- `components/app/filters/FilterDrawer.tsx:515` — `nf-glass` ✅ blurred, and it **is** a
  correct pair (ghost "Clear all" + solid "Show N places").
- `components/app/listing/ListingStickyBar.tsx:64` — `nf-card` ✅ blurred (14px, globals.css:200),
  but it is price + **one** button, not a CTA pair.
- `app/agent/list/ListingWizard.tsx:1280` — **`bg-[var(--nf-surface-primary)]`, fully solid**. ❌

Checkout (`app/(app)/checkout/[bookingId]/PayPanel.tsx`) has **no pinned footer at all** —
the pay CTAs are buried inside list rows at `:169` and `:198`.

The reference's *"solid high-contrast pill + ghost/hairline pill, side by side in a blurred
pinned footer"* pattern appears **once** in the entire product (FilterDrawer). Elsewhere
CTA pairs are stacked vertically inside a card:
`ReservePanel.tsx:298–308` (grid, stacked), `AdminActions.tsx:161–178` (grid, stacked),
`PayPanel.tsx:131–139` (`MomentScreen` actions).

**P1-10 · Inputs are hand-rolled. There is no Input primitive and no clear affordance.**

`.nf-field` is a good-looking class (54px tall, real focus ring at globals.css:1546) but
it is *just a class*. Consequences:

- **Leading icon is not supported.** The three search bars each rebuild it by hand and
  each is different:
  - `app/page.tsx:136` — icon 20px, bare `<input>` on a `nf-card`, no `nf-field`
  - `app/(app)/home/page.tsx:78` — icon 20px, `text-[0.875rem]`, bare input
  - `app/(app)/search/page.tsx:163` — icon 18px, `text-[0.9375rem]`, bare input
  - `app/(site)/help/HelpSearch.tsx:57` — `nf-field pl-10` with an absolutely-positioned icon
  Four search fields, four constructions, three type sizes.
- **No trailing clear/"×" affordance anywhere.** The only trailing control in the app is
  the password eye (`AuthPanel.tsx:461`). Reference §5 explicitly asks for
  *"a trailing filter/clear affordance"*.
- **Error state is a border-colour change only.** `globals.css:1557` sets
  `border-color: var(--nf-state-error)` — but `.nf-field` paints its border via
  `border-box` gradient (`:1529–1537`) with `border: 1px solid transparent`, so
  `border-color` on an element whose border is a gradient **has no visible effect**.
  The error state is effectively invisible; only the separate `<p role="alert">` below
  communicates it. Verified at `ApplyWizard.tsx:429`, `AuthPanel.tsx:342`,
  `ReservePanel.tsx:224`, `WalletActions.tsx:166`.
- Label treatment is consistent (`nf-label` above the field) ✅.
- `<select>` uses `nf-field` with `appearance-none pr-11` + hand-drawn chevron in
  `AuthPanel.tsx:382,394`, but `ApplyWizard.tsx:453` and `WalletActions.tsx:167` use
  raw `nf-field` on a `<select>` with **native OS chevron** and per-`<option>` inline
  `style={{background:…}}` hacks. Two select looks in one app.

**P1-11 · Toggles: real, animated, duplicated.**

`components/app/account/Toggle.tsx` is good — `role="switch"`, 28×48 track,
`transition-transform` thumb with `shadow-[0_2px_6px_rgb(0_0_0/0.35)]`. ✅ against §5.

But `components/app/filters/FilterDrawer.tsx:161` is a **second implementation** with the
same visual intent and different mechanics — it animates `transition-[left]` with
`left-[1.5rem]`/`left-[0.15rem]` instead of `translate-x`, i.e. it animates a
**layout property** rather than a transform (non-composited, jank on low-end Android),
and its thumb is `h-5 w-5` vs the other's `h-[1.375rem]`.

Only real `<input type="checkbox">` in the app: `components/agent/ApplyWizard.tsx:349`
— `h-4 w-4 accent-[…]`, a **16px native checkbox** on the terms agreement of the agent
onboarding flow. That is the single most legally important control in the product and
it is the least designed one.

**P1-12 · No focus trap in any modal.** See P0-4 table. `aria-modal="true"` is asserted
in 8 places without the containment it promises.

---

### P2 — polish

- **P2-1** `.nf-btn` default radius is `--nf-radius-lg` = **18px**, and `--lg` is 22px.
  Neither is a pill. Reference §5 says *"full-width high-contrast **pill**"*.
  `--nf-radius-pill` exists (tokens.css:206) and is used by chips and icon buttons but
  **never by `.nf-btn`**. The primary CTA is a rounded rectangle, not a pill.
  (`app/globals.css:1340`, `:1441`)
- **P2-2** `.nf-btn--primary:hover` lifts `translateY(-1px)` (globals.css:1405) but
  `:active` returns it to `translateY(0)` (`:1408`) rather than pressing *below* rest —
  so on desktop the press reads as "returning to normal", not "being pushed".
- **P2-3** No shadow compression on press anywhere. `.nf-btn--primary` keeps
  `0 0 12px` at rest and `0 0 24px` on hover; `:active` doesn't touch `box-shadow`.
- **P2-4** `--nf-ease-spring` (tokens.css:220) is used for message bubbles
  (globals.css:525, 528) and status assembly (`:684`) but **never for a control**.
- **P2-5** `components/app/wallet/WalletActions.tsx:78` uses `nf-card nf-card--interactive`
  as a button — a card pretending to be a control, so it inherits card press behaviour
  rather than button press behaviour.
- **P2-6** `app/admin/_components/AdminActions.tsx:167–171` styles the destructive
  confirm by **inline-overriding `background` and killing `box-shadow`** on a
  `nf-btn--primary`. There is no `--danger` button variant, so every destructive action
  in admin is an inline style.
- **P2-7** `components/app/filters/ActiveFilters.tsx:42–48` draws the remove "×" as two
  rotated 1.5px `<span>`s. Handmade geometry sitting next to a `UiIcon` set — reference §1
  forbids exactly this ("no hand-drawn one-offs sitting next to a library glyph").
- **P2-8** No `<input type="range">` / slider exists anywhere. The price filter is two
  numeric text fields (`FilterDrawer.tsx:372, 390`). Not necessarily wrong, but there is
  no slider primitive should one be needed.
- **P2-9** `ApplyWizard.tsx:210` stepper circles are `h-8 w-8` (32px) buttons —
  under 44pt, and they are the navigation for a 6-step flow.
- **P2-10** `.nf-btn--primary::after` (the ripple, globals.css:1381) **replaces** the base
  `.nf-btn::after` specular sheen (globals.css:1352), so the primary button silently loses
  the top-edge highlight that every other variant has.
- **P2-11** Empty states on controls: `BookingsTabs.tsx:191–209` and
  `MyBookings.tsx` render a `BrandIcon` + one grey sentence + a CTA. Better than a bare
  sentence, but §6 asks for a real headline + body + CTA; here there is no headline —
  `EMPTY_COPY` (`BookingsTabs.tsx:27`) is a single sentence doing both jobs.

---

## 3. Concrete upgrade recommendations

Ship a real `apps/web/src/components/ui/` primitive layer. Keep the `.nf-*` CSS as the
*material*; the primitives own the *geometry, state and motion*.

### 3.1 `Button`

```tsx
// components/ui/Button.tsx
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "glass";
type ButtonSize    = "sm" | "md" | "lg";   // 40 / 48 / 56 px — no other heights exist

export type ButtonProps = {
  variant?: ButtonVariant;          // default "secondary"
  size?: ButtonSize;                // default "md"
  /** Fills the container. Pinned-footer CTAs are always full. */
  full?: boolean;
  /** Renders a spinner in place of the icon slot and locks the width. */
  loading?: boolean;
  /** Icon-only: enforces a square box and REQUIRES aria-label at the type level. */
  iconOnly?: boolean;
  leadingIcon?: UiIconName;
  trailingIcon?: UiIconName;
  /** Fires navigator.vibrate(8) on pointerdown when the device supports it. */
  haptic?: false | "light" | "medium";   // default "light" for primary/danger
  /** Polymorphic: renders <button>, <a> or next/link without restyling. */
  as?: "button" | "a" | typeof Link;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
```

Rules the primitive enforces:
- **Height is a token, never a class.** `sm=40 md=48 lg=56`. `min-height` set in CSS,
  never overridable from a call site. Delete every `h-8/h-9/h-10/py-3/py-3.5` on a button.
- **Radius = `--nf-radius-pill`** for all sizes. Change `.nf-btn` at globals.css:1340.
- **One disabled recipe**: `opacity .38` + `pointer-events:none` + `aria-disabled`,
  defined once. Delete all 29 `disabled:opacity-*` overrides.
- **Press = scale + shadow compression + spring back**, in CSS on the class, not per call:
  ```css
  .nf-btn { transition: transform 220ms var(--nf-ease-spring), box-shadow 160ms var(--nf-ease-standard); }
  .nf-btn:active:not(:disabled) { transform: scale(0.965); box-shadow: 0 0 6px rgb(12 57 239 / .22); }
  ```
- **Move the primary's ripple + glow off `:hover` and onto `:active`** (keep hover as a
  desktop bonus). globals.css:1394, 1403.
- **`loading` renders a real spinner** and pins width via `min-width` measured pre-swap,
  sets `aria-busy`, and keeps the label (dimmed) rather than replacing it.
- **`haptic`** calls `navigator.vibrate?.(8)` on `pointerdown` — one line, satisfies §8.

Add a companion `<ActionBar>`:

```tsx
// components/ui/ActionBar.tsx — the ONLY way to pin CTAs to the bottom
<ActionBar blur safeArea>            {/* nf-glass + env(safe-area-inset-bottom), always */}
  <Button variant="ghost" full>Not now</Button>
  <Button variant="primary" full haptic>Pay ₦240,000</Button>
</ActionBar>
```
Retrofit at: `ListingWizard.tsx:1280` (currently solid), `PayPanel.tsx` (currently none),
`ReservePanel.tsx:298`, `AdminActions.tsx:161`.

### 3.2 `Chip`

```tsx
export type ChipProps = {
  selected?: boolean;
  /** "filter" = aria-pressed toggle · "choice" = role=radio in a ChipGroup · "link" */
  behaviour?: "filter" | "choice" | "link";
  size?: "sm" | "md";        // 36 (display-only) / 44 (interactive) — md is default
  icon?: UiIconName;
  count?: number;            // renders a tabular trailing count
  thumbnail?: string;        // §1: photo inside the pill for category chips
  onSelectedChange?(next: boolean): void;
};

// The row is a primitive too — this is what fixes snap + bleed + fade in one place.
export function ChipRow(props: {
  children: React.ReactNode;
  /** scroll-snap-type: x proximity + scroll-padding matching the gutter */
  snap?: boolean;            // default true
  /** right-edge mask so the next chip fades rather than hard-clipping */
  fadeEdges?: boolean;       // default true
  bleed?: boolean;           // default true — negative gutter margin
}): JSX.Element;
```

`ChipRow` CSS (add to globals.css beside `.nf-scroll-x`):
```css
.nf-chip-row {
  display: flex; gap: .5rem; overflow-x: auto;
  scroll-snap-type: x proximity; scroll-padding-inline: 1.25rem;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 2.5rem), transparent 100%);
          mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 2.5rem), transparent 100%);
}
.nf-chip-row > * { scroll-snap-align: start; flex-shrink: 0; }
```
Selected state must be a **coloured ring/fill**, not only a border glow — change
globals.css:1687 to add `box-shadow: 0 0 0 2px var(--nf-brand-primary)` plus a
`color-mix` fill.
Raise `.nf-chip` min-height to 44px (globals.css:1663) and delete all 4 `!py-1.5` hacks.

### 3.3 `Segmented`

```tsx
export function Segmented<T extends string>(props: {
  options: { value: T; label: string; icon?: UiIconName; count?: number }[];
  value: T;
  onChange(next: T): void;
  /** "tabs" → role=tablist+roving tabindex · "radio" → role=radiogroup */
  semantics?: "tabs" | "radio";
  size?: "sm" | "md";
  full?: boolean;
}): JSX.Element;
```

Implementation contract — this is the piece the reference cares about most:
- One absolutely-positioned **capsule** `<span aria-hidden>` inside a track.
- Position via `transform: translateX(var(--seg-x))` + `width: var(--seg-w)`, both
  measured with `ResizeObserver` so labels of different lengths work.
- Transition `transform 320ms var(--nf-ease-spring), width 320ms var(--nf-ease-spring)`.
- Capsule carries its own shadow: `0 2px 8px -2px rgb(0 0 0 / .35)` + a 1px inner top highlight.
- Track is `nf-glass` with `--nf-radius-pill`, capsule inset by 3px (nested-radius correction).
- Under `prefers-reduced-motion`, capsule jumps (transition: none) — reference §7.

Replaces all five implementations: `ViewToggle.tsx:22`, `BookingsTabs.tsx:143`,
`MyBookings.tsx:268`, `BookingsWorkspace.tsx:379`, `SettingsGroups.tsx:484`.

### 3.4 `Sheet`

```tsx
export function Sheet(props: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;                         // becomes aria-label + visible header
  /** Fractions of viewport height. [0.5, 0.92] gives a half + full detent. */
  detents?: number[];                    // default [0.92]
  initialDetent?: number;                // index, default 0
  /** Drag handle + drag-to-dismiss. Off only for destructive confirms. */
  dismissible?: boolean;                 // default true
  /** Pinned, blurred footer. Use <ActionBar> children. */
  footer?: React.ReactNode;
  size?: "sheet" | "dialog" | "full";    // bottom sheet / centred modal / full-screen
}): JSX.Element;
```

Non-negotiables the primitive owns (so no call site can forget one):
1. `createPortal` to `document.body`.
2. **Body scroll lock** with scrollbar-width compensation — fixes
   `ListingOptionsSheet.tsx` and `ThreadOptionsSheet.tsx`.
3. **Real focus trap** (first/last sentinel + Tab wrap) — fixes all 8.
4. Restore focus to the trigger on close.
5. **Drag handle**: 36×5px, `--nf-radius-pill`, `--nf-content-muted` at 40%, 12px top margin.
6. **Pointer-drag to dismiss**: `onPointerDown/Move/Up`, follow the finger, release below
   40% of the current detent → dismiss; otherwise **spring back**
   (`transform 420ms var(--nf-ease-spring)`).
7. Enter/exit with the spring token, **not** `nf-rise`.
8. Backdrop: `bg-black/60 backdrop-blur-md` + `saturate(140%)`, uniformly — fixes the two
   unblurred agent sheets.
9. `padding-bottom: max(1.25rem, env(safe-area-inset-bottom))`.
10. Escape closes, backdrop click closes, `inert` on the app root while open.

### 3.5 `StatusPill` — one status vocabulary

```tsx
export type StatusTone = "success" | "warning" | "danger" | "info" | "brand" | "neutral";

export function StatusPill(props: {
  tone: StatusTone;
  label: string;
  icon?: UiIconName;      // defaults per tone: check / clock / alert / info / sparkle / dot
  size?: "xs" | "sm";
}): JSX.Element;

/** The single mapping. Delete ui.tsx:25 statusTone, ListingsWorkspace toneStyle,
 *  BookingsWorkspace statusBadgeClass — all three collapse into this. */
export function toneForStatus(status: string): StatusTone;
```
Add `.nf-badge--danger`, `.nf-badge--info`, `.nf-badge--neutral` to globals.css:1704 and
give bare `.nf-badge` the neutral tint so it can never render invisible.
Every pill gets an icon by default — reference §5.

### 3.6 `Input` / `Field`

```tsx
export function Input(props: {
  leadingIcon?: UiIconName;
  /** Renders an × that clears the value and refocuses. Auto-on for type="search". */
  clearable?: boolean;
  trailing?: React.ReactNode;        // eye toggle, unit label, filter button
  error?: string;                    // drives aria-invalid, aria-describedby AND the visual
  label: string;
  hint?: string;
  size?: "md" | "lg";                // 48 / 56
} & React.InputHTMLAttributes<HTMLInputElement>): JSX.Element;

export function Select(...)   // one chevron, one option style
export function Textarea(...) // shares the field material
```
Fix the invisible error state: because `.nf-field` paints its border with a
`border-box` gradient, `[aria-invalid]` must override the **gradient**, not `border-color`:
```css
.nf-field[aria-invalid="true"] {
  background:
    linear-gradient(var(--nf-surface-inset), var(--nf-surface-inset)) padding-box,
    linear-gradient(var(--nf-state-error), var(--nf-state-error)) border-box;
  box-shadow: inset 0 2px 6px rgb(0 0 0 / .32), 0 0 0 3px color-mix(in oklab, var(--nf-state-error) 22%, transparent);
}
```
Then rebuild the four search bars (`app/page.tsx:136`, `home/page.tsx:78`,
`search/page.tsx:163`, `HelpSearch.tsx:57`) on `<Input leadingIcon="search" clearable />`.

### 3.7 `Switch`, `Stepper`, `Progress`

```tsx
export function Switch(props: { checked; onChange; label; description?; disabled? });
// One implementation. Animate translate-x (NOT `left`). Delete FilterDrawer.tsx:161.

export function Stepper(props: { value; min; max; onChange; label; hint?; size?: "sm"|"md" });
// 44px buttons minimum. Delete the duplicate at ReservePanel.tsx:38.

export function Progress(props: {
  value: number; max?: number;
  /** Renders the % or "3 of 7" riding on the filled portion — reference §5. */
  showValue?: boolean;
  tone?: StatusTone;
  segments?: number;      // >1 → segmented step bar
});
// role="progressbar" + aria-valuenow/min/max. Animate width with --nf-ease-entrance.
```
Then unify the wizards: `ApplyWizard.tsx:195` and `ListingWizard.tsx:680` both render
`<Progress segments={n} value={step+1} showValue />` at the top; add the same to
`checkout/[bookingId]/page.tsx` and dot indicators to `Onboarding.tsx`.

### 3.8 Migration order (highest impact first)

1. `Button` + `ActionBar` — touches 140 call sites, removes 45 geometries, adds press +
   haptics + spinner in one change.
2. `Sheet` — 8 call sites, fixes 2 scroll-lock bugs and 8 focus-trap bugs.
3. `Segmented` — 5 call sites, delivers the single most recognisable reference detail.
4. `Chip` + `ChipRow` — 51 call sites, fixes 47 touch targets and adds snap + fade.
5. `StatusPill` — ~30 call sites, collapses 3 colour vocabularies into 1.
6. `Input`/`Select`/`Textarea` — fixes the invisible error state and 4 divergent search bars.
7. `Switch`/`Stepper`/`Progress` — de-duplicates and delivers the wizard bars.

---

## 4. Scorecard against the brief's 13 questions

| # | Question | Verdict |
|---|---|---|
| 1 | Single Button primitive? | **No.** 12 implementations, 45 override signatures on `nf-btn` alone. P0 |
| 2 | Primary/secondary pair in a blurred pinned footer? | Pattern appears **once** (`FilterDrawer.tsx:515`). 2 pinned bars total; 1 is solid. P0/P1 |
| 3 | Press = scale + shadow compression + spring? Haptics? | `translateY(1px)` only; primary's effects are hover-only; **zero `navigator.vibrate`**. P0 |
| 4 | Segmented slides a shadowed capsule? | **No.** 3 of 5 hard-swap; 2 slide a 2px underline. P0 |
| 5 | Chip rows: ring/fill, bleed, snap, hidden scrollbars? | Bleed ✅, scrollbars hidden ✅, selected = glow not ring ⚠️, **no snap**, **no fade**. P1 |
| 6 | Status pills tinted icon+label with semantic colour? | Shell exists; only 4 of ~30 have icons; 3 tones only; bare `.nf-badge` renders **invisible**; 3 competing tone maps. P1 |
| 7 | Toggles animated with thumb shadow? | ✅ `Toggle.tsx` — but duplicated in `FilterDrawer.tsx:161` animating `left`, and a raw 16px checkbox on the agent terms. P1 |
| 8 | Inputs: leading icon, height, clear, focus ring, error, label, primitive? | Height ✅, focus ring ✅, label ✅; **no primitive**, **no clear**, leading icon hand-rolled 4 ways, **error state visually inert**. P1 |
| 9 | Sheets: handle, detents, spring, blur, scroll lock? | **None** have a handle, detents, spring or drag. 2 of 9 miss scroll lock, 2 miss blur, **0 of 8 trap focus**. P0 |
| 10 | Loading/disabled/empty on controls? | **No spinner exists.** Text-swap only, width jumps, `aria-busy` on 2 of 18. One good optimistic case (`ListingActions.tsx:87`). P1 |
| 11 | Progress animated with value riding the bar? | **No animated fill, no value on bar, zero `role="progressbar"`.** P1 |
| 12 | Segmented progress bar on multi-step flows? | 1 of 4 flows has one; checkout and onboarding have nothing. P1 |
| 13 | 44×44 targets / focus-visible? | Focus-visible **excellent** (globals.css:91–100). Targets: `.nf-chip` 37px × 47 sites, `.nf-icon-btn` 41.6px (comment claims 44), wizard rail 6px, ApplyWizard circles 32px, agent terms checkbox 16px. P0/P1 |

**Total findings: 33** (4 × P0, 12 × P1, 11 × P2, plus 6 scorecard-level gaps folded above).
