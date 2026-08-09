# Audit 03 — Design tokens, colour, glass, elevation, radii, spacing, theming

> **SUPERSEDED 2026-08-09. Not a backlog, and every count in it needs re-measuring.**
> This audit grades the codebase against `00-reference-brief.md`, which is retired
> because it produced the visual overload the platform is now removing. Read the
> banner at the top of that file before acting on anything here. The current
> design and navigation work is `RECOMMENDATIONS.md` sections 2 and 3.


Scope: `packages/design-tokens/src/{tokens.css,index.ts}`, `apps/web/src/app/globals.css` (3167 lines, read in full),
`apps/web/postcss.config.mjs`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/site/ThemeToggle.tsx`,
plus a sweep of every `.tsx` under `apps/web/src`.

Yardstick: §3 of `PREMIUM_REFERENCE_BRIEF.md`.

Verdict up front: **the token layer is well-intentioned and unusually well-commented, but it has escaped its own
rules.** There are 195 raw `rgb()` literals and 55 raw hex literals inside `globals.css` alone — the file that opens
with "Nothing below may introduce a raw colour." The dark surface ladder is functionally invisible (1.09:1 between
"card" and "raised"), drop shadows are mathematically invisible on a `#000010` ground, `.nf-glass` is a flat
translucent panel with no inner highlight and no ambient shadow, and light mode fails WCAG AA on the single most-used
text token in the product (296 call sites).

---

## 1. WHAT EXISTS

### 1.1 Token architecture

Two-layer system in `packages/design-tokens/src/tokens.css`:

- **Layer 1** (`tokens.css:19-50`) — raw palette: 8 inks, 5 mists, 4 royals, 5 electrics, 2 cyans, 2 crimsons,
  emerald, rose, sky. Documented as internal-only.
- **Layer 2** (`tokens.css:72-266`) — semantic: brand, mode, surface, content, border, state, glass, gradients,
  ambient canvas, elevation, radius, motion, typography, layout.
- **Light theme** (`tokens.css:287-349`) — 30 overrides under `:root[data-theme="light"]`.
- **Reduced motion** (`tokens.css:356-365`) — durations collapse to 1ms. Genuinely good.

Tailwind v4, CSS-first. **There is no `tailwind.config.*` anywhere in the repo** — only
`apps/web/postcss.config.mjs` (7 lines, `@tailwindcss/postcss`). The bridge is `@theme inline` at
`globals.css:8-36`, mapping 17 colour keys, 5 radius keys and 1 font key.

Theme wiring: pre-paint inline script at `layout.tsx:133-138` reading `localStorage.nf_theme`, writing
`documentElement.dataset.theme`. `ThemeToggle.tsx:24-34` flips it. Dark is the hard default; `system` is opt-in.
This part is correct — no FOUC, no silent OS override.

### 1.2 Glass surfaces — complete inventory

| # | Selector | File:line | blur | saturate | inner top highlight | hairline | ambient shadow |
|---|---|---|---|---|---|---|---|
| 1 | `.nf-glass` | `globals.css:141` | 22px | 160% | **✗** | ✓ | **✗** |
| 2 | `.nf-card` | `globals.css:188` | 14px (hardcoded) | 140% | ✓ `0.09` | ✓ (gradient border-box) | ✓ single-layer |
| 3 | `.nf-icon-tile` | `globals.css:320` | none | none | ✓ `0.95` | ✓ | ✓ |
| 4 | `.nf-auth-row` | `globals.css:1457` | 12px | 150% | ✓ `0.2` | ✓ | ✓ |
| 5 | `.nf-tabbar` | `globals.css:2068` | 22px | 170% | **✗** | ✓ | ✓ single-layer |
| 6 | `.nf-dock` | `globals.css:2142` | 22px | 170% | ✓ `0.06` | ✓ | ✓ single-layer |
| 7 | `.nf-btn--glass` | `globals.css:1412` | **none** | none | **✗** | ✓ | **✗** |
| 8 | `.nf-icon-btn` | `globals.css:1573` | **none** | none | **✗** | ✓ | glow only |
| 9 | `.nf-chip` | `globals.css:1659` | **none** | none | **✗** | ✓ | glow only |
| 10 | `.nf-action-circle__ring` | `globals.css:1859` | **none** | none | **✗** | ✓ | glow only |
| 11 | Sheet/modal panels (5 files) | see §2.2 | **none** | none | **✗** | ✓ | `--nf-shadow-float` |
| 12 | Ad-hoc `backdrop-blur-md` overlay controls | `ListingActions.tsx:144,155,169`, `ListingGallery.tsx:162,172,187,196` | tw `md` | none | **✗** | `border-white/25` | **✗** |
| 13 | Ad-hoc `backdrop-blur-sm` scrims (8 files) | `FilterDrawer.tsx:327` et al | tw `sm` | none | n/a | n/a | n/a |

Glass tokens (`tokens.css:136-146`):
```css
--nf-glass-fill: rgb(255 255 255 / 0.055);
--nf-glass-fill-strong: rgb(255 255 255 / 0.09);
--nf-glass-border: rgb(255 255 255 / 0.11);
--nf-glass-blur: 22px;
--nf-glass-blur-soft: 12px;
--nf-glass-specular: linear-gradient(145deg, rgb(255 255 255 / 0.16) 0%, rgb(255 255 255 / 0.02) 38%, transparent 65%);
```

### 1.3 Elevation

Four tokens (`tokens.css:189-195`):
```css
--nf-shadow-sm:      0 1px 2px rgb(0 0 0 / 0.4);
--nf-shadow-card:    0 4px 20px -4px rgb(0 0 0 / 0.55), 0 1px 2px rgb(0 0 0 / 0.4);
--nf-shadow-lifted:  0 18px 48px -12px rgb(0 0 0 / 0.7), 0 4px 12px rgb(0 0 0 / 0.4);
--nf-shadow-float:   0 32px 80px -16px rgb(0 0 0 / 0.8);
--nf-glow-brand: ...; --nf-glow-accent: ...;
```
Usage counts across the whole app: `sm` **0**, `card` 7, `lifted` 4, `float` 6, `glow-brand` **0**, `glow-accent` **0**.
Meanwhile `globals.css` contains **77 `box-shadow` declarations** and components carry **16 arbitrary
`shadow-[…]` utilities**.

### 1.4 Radii

`--nf-radius-xs:6 / sm:10 / md:14 / lg:18 / xl:22 / 2xl:32 / pill:999`. Usage across `.tsx`:
`rounded-full` 104, `rounded-[var(--nf-radius-md)]` 47, `--nf-radius-lg` 16, `rounded-2xl` 12, `rounded-xl` 11,
`rounded-3xl` 4 + `rounded-t-3xl` 4, `rounded-lg`/`rounded-md`/`rounded` 6, `rounded-[7px]` 1, `rounded-[4px]` 1,
`rounded-[1.25rem]` 1.

### 1.5 Dark / light bases

Dark: `--nf-surface-canvas:#000010`, `--nf-canvas-base:#010118`, surfaces `#000020 / #000030 / #000040 / #000050`.
Atmosphere is real and elaborate: `.nf-ambient` (`globals.css:2213-2376`) = a full-bleed artwork + mirrored masked
copy + 3 drifting radial blooms + a pointer-following bloom + a 4-stop aurora `::before` + a rotating conic `::after`,
with `[data-daypart]` grading. Plus `.nf-grain` (`globals.css:2388-2397`), an inlined SVG turbulence field at 5%
`mix-blend-mode: overlay`.

Light: `--nf-surface-canvas:#F4F5F7`, all surfaces `#FFFFFF`/`#F7F8FA`, ink `#16181D`, borders `rgb(18 21 26 / 0.08…0.22)`,
blooms explicitly `none`, and 83 `:root[data-theme="light"]` override rules in `globals.css` (lines 2785-3167).

---

## 2. GAPS VS THE REFERENCE STANDARD

### P0 — Ships-blocking

---

#### P0-1. `.nf-glass` is a flat rgba panel — exactly what the brief calls "not glass and reads as cheap"

`globals.css:141-146`:
```css
.nf-glass {
  background: var(--nf-glass-fill);        /* rgb(255 255 255 / 0.055) */
  border: 1px solid var(--nf-glass-border);/* rgb(255 255 255 / 0.11)  */
  backdrop-filter: blur(var(--nf-glass-blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--nf-glass-blur)) saturate(160%);
}
```
Four ingredients required by §3: blur+saturate ✓, hairline border ✓, **bright 1px inner top-edge highlight ✗**,
**soft wide ambient shadow ✗**. Two of four.

This is not a small class. `.nf-glass` is the material of **every sticky app header** —
`AppShell.tsx:90`, `AgentShell.tsx:37`, `app/admin/layout.tsx:69`, `SiteHeader.tsx:28`,
`app/(app)/search/page.tsx:147` — plus `FilterDrawer.tsx:334,515`, `ViewToggle.tsx:22`,
`MoodRow.tsx:46`, `PopularDestinations.tsx:44`, `HowItWorks.tsx:63`, `SavedBoard.tsx:211` (28 occurrences).

Damning detail: **`--nf-glass-specular` is defined at `tokens.css:141-146` and referenced by nothing.**
The specular ingredient was specified, then abandoned. `grep -r "glass-specular"` returns only the definition.

Nor is there a scrim/fade under any sticky header — the brief asks for "content visibly scrolls under the nav behind
a blur + gradient scrim". There is exactly **one** `maskImage` in the entire `.tsx` tree, and it is on the wallet
balance card grid texture (`BalanceCard.tsx:126`), not on any nav.

---

#### P0-2. Dark-mode drop shadows are mathematically invisible

`.nf-card` (`globals.css:202-204`) casts `0 8px 30px rgb(0 0 0 / 0.45)` onto `--nf-surface-canvas: #000010`.

Relative luminance of `#000010` = **0.000374**. After a 45% black shadow: 0.000206.
Contrast ratio between shadowed and unshadowed ground = **1.003 : 1**.

The same holds for every elevation token. `--nf-shadow-float` (`0 32px 80px -16px rgb(0 0 0 / 0.8)`) on `#000010`
produces a 1.02:1 delta. **Every modal, sheet, dock, tab bar and card in dark mode is casting a shadow that
physically cannot be seen.** The elevation ladder exists in the token file and evaporates at paint time.

The reference dark base is `#08080A–#0B0B0F` precisely so shadows have somewhere to go. `#000010` (pure black with a
16/255 blue channel and *zero* red and green) is below that floor. It is also a fully-saturated blue-channel-only
colour, which on OLED is a hard blue cast, and on a cheap LCD is indistinguishable from `#000000`.

---

#### P0-3. The dark surface ladder is a 1.09:1 ramp — six named surfaces, one visible surface

```
--nf-surface-canvas:    #000010   L = 0.000374
--nf-surface-primary:   #000020   L = 0.001044
--nf-surface-secondary: #000030   L = 0.00195   (approx)
--nf-surface-elevated:  #000040   L = 0.00350   (approx)
--nf-surface-raised:    #000050   L = 0.00579
```
Contrast `surface-primary` → `surface-raised` = **(0.00579+0.05)/(0.001044+0.05) = 1.093 : 1**.

Nothing on this ladder is distinguishable by fill. Combined with P0-2 (shadows invisible), the *only* thing
separating a card from the page is its 1px border. That is why the product reads flat in dark mode no matter how
elaborate the ambient canvas behind it is.

`tokens.css:19-26` shows why: the ink ramp is `#010118, #000020, #000030, #000040, #000050, #000060, #000080, #0010A0`.
Red and green are pinned at 0 for five of eight steps, so the entire ladder moves only in the lowest-weighted
channel of the luminance formula (B is weighted 0.0722 vs G's 0.7152).

---

#### P0-4. `--nf-content-muted` fails WCAG AA in light mode, at 296 call sites

Light value `#7A8189` (`tokens.css:304`).

| Foreground | Background | Ratio | AA (4.5) |
|---|---|---|---|
| `#7A8189` | `#FFFFFF` (`--nf-surface-primary`) | **3.94 : 1** | ✗ |
| `#7A8189` | `#F4F5F7` (`--nf-surface-canvas`) | **3.61 : 1** | ✗ |
| `#7A8189` | `#EFF1F4` (`--nf-surface-inset`) | **3.48 : 1** | ✗ |

`var(--nf-content-muted)` appears **296 times** across `.tsx` and `.css`. It also drives
`.nf-field::placeholder` (`globals.css:1544`), `.nf-hero-figure__unit` (`globals.css:1782`),
`.nf-logo__tagline` (`globals.css:2039`), `.nf-moment__footnote` (`globals.css:2002`) and `.nf-overline`
(`globals.css:1303`) — all small text.

Note that someone already noticed the symptom and patched exactly one consumer:
`globals.css:3013-3015` re-colours `.nf-overline` to `rgb(18 21 26 / 0.66)` (**5.88 : 1**, passes). The token itself
was left broken and the other 295 call sites were not touched. That is treating the alarm, not the fire.

---

#### P0-5. `--nf-state-info` was left out of the light-mode contrast pass — 2.14 : 1

`tokens.css:332-345` contains an explicit comment: *"The airy night-theme accents fail AA on white, so daylight
swaps them for deeper members of the same families … the state colours step down until small bold text passes 4.5:1."*

Then the block steps down `--nf-state-success`, `--nf-state-warning`, `--nf-state-error` — and **not `--nf-state-info`**.
It stays `var(--nf-sky-400)` = `#38BDF8`.

`#38BDF8` on `#FFFFFF` = **2.14 : 1**. Fails AA for any text size, fails 3:1 for non-text UI components.

Same block also fails its own stated bar on success:

| Light state token | On `#FFFFFF` | On its own `*-surface` chip | AA |
|---|---|---|---|
| `--nf-state-success` `#0B8A5C` | 4.37 : 1 | **3.79 : 1** | ✗ |
| `--nf-state-warning` `#0E6E8C` | 6.31 : 1 | 5.14 : 1 | ✓ |
| `--nf-state-error` `#DC143C` | 4.99 : 1 | **3.95 : 1** | ✗ |
| `--nf-state-info` `#38BDF8` | **2.14 : 1** | **~1.9 : 1** | ✗ |

The chip case is worse than white because of a second bug: **`--nf-state-*-surface` derives from Layer 1, not from
the theme-stepped Layer 2 value.** `tokens.css:126-129`:
```css
--nf-state-success-surface: color-mix(in oklab, var(--nf-emerald-400) 15%, transparent);
```
`--nf-emerald-400` is never overridden in light, so the chip background stays a tint of the *bright* emerald while
the label switches to the *dark* one. `.nf-badge--success` (`globals.css:1704-1707`) is `--nf-text-overline` =
**0.6875rem / 11px**, weight 700. Unambiguously small text. **3.79 : 1.**

---

### P1 — Premium-tell failures

---

#### P1-1. The elevation "ladder" has three usable rungs, one of which is a single flat drop shadow

Required by §3: ground → card → raised card → sheet → modal → toast, each with its own blur/shadow/border recipe.

What exists:
- `ground` — no token.
- `card` — `--nf-shadow-card`, 2 layers (direct 1px + ambient 20px). Correct shape.
- `raised card` — no token. `--nf-shadow-sm` exists and is used **zero** times.
- `sheet` / `modal` — both use `--nf-shadow-float`, and `--nf-shadow-float` is **a single flat drop shadow**:
  `0 32px 80px -16px rgb(0 0 0 / 0.8)`. No direct/contact layer at all. The highest surface in the product has the
  least sophisticated shadow.
- `toast` — no token, no toast component found.

`--nf-shadow-lifted` is the only 2-layer one besides card, used 4 times, and is a *hover* state, not a rung.

And nothing is enforced. 77 hand-written `box-shadow` declarations in `globals.css` and 16 arbitrary
`shadow-[…]` utilities in components sit alongside the 4 tokens. Worst offenders:
- `WalletActions.tsx:86` `shadow-[0_0_24px_rgb(0_102_255_/_0.45),inset_0_0_16px_rgb(0_102_255_/_0.12)]` — `rgb(0 102 255)` is not in the palette at all.
- `SignatureShowcase.tsx:71` `shadow-[0_30px_60px_rgba(12,57,239,0.45)]`
- `AiAssistantBanner.tsx:27` `shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]`
- `Toggle.tsx:54` `shadow-[0_2px_6px_rgb(0_0_0/0.35)]`

---

#### P1-2. Light mode is a flat white SaaS theme, not the warm neumorphic paper twin the brief and the repo both claim

`KNOWN_GAPS.md:79` claims: *"Fully designed exchange-grade paper twin, shipped."*
`tokens.css:280-286` — the comment immediately above the light block — says the opposite:
*"the light theme has NOT had a design pass. Tracked in KNOWN_GAPS.md before it is exposed to users."*
Two contradictory claims about the same 60 lines.

Measured against §3 ("warm off-white ground, dual shadows (light top-left, dark bottom-right), cards that feel
physically raised"):

- **Ground is cool, not warm.** `#F4F5F7` has B(247) > G(245) > R(244) — a blue-grey. A warm off-white needs R > G > B.
- **No dual shadow.** `--nf-shadow-card` light (`tokens.css:322`) is
  `0 1px 2px rgb(18 21 26 / 0.04), 0 4px 16px -4px rgb(18 21 26 / 0.06)` — two *dark* layers from the same direction.
  There is no light-source shadow, no top-left highlight, no inset white rim anywhere in the light theme.
- **Cards do not read as raised.** `globals.css:2785-2792` sets `.nf-card` light to flat `#FFFFFF`, a
  `rgb(18 21 26 / 0.09)` border, `--nf-shadow-card`, and explicitly `backdrop-filter: none`.
  Border `rgb(18 21 26/0.09)` over white ≈ `#EAEAEA`, against a `#F4F5F7` canvas = **1.10 : 1**. The card edge is
  functionally invisible; the shadow at 4%/6% is barely more. A white card on a near-white canvas with a 1.10:1 edge
  is a rectangle you infer, not an object you see.
- `--nf-border-subtle` light = `rgb(18 21 26 / 0.08)` → **1.13 : 1** on white. Every hairline in light mode is
  at the threshold of perceptibility.

It is not a mechanical inversion — real thought went in — but it is a *different design* (clean flat exchange UI)
from the one the brief specifies, and it is executed too timidly to hold structure.

---

#### P1-3. Light mode collapses three brand tokens into one colour

`tokens.css:340` overrides a **Layer 1** token from inside the Layer 2 theme block:
```css
--nf-electric-300: #0C2FE8;
```
Consequences, given `--nf-brand-primary: #0C2FE8` on the line above (`tokens.css:308`):

| Token | Light value | Result |
|---|---|---|
| `--nf-brand-primary` | `#0C2FE8` | — |
| `--nf-brand-secondary` (`= electric-300`) | `#0C2FE8` | **identical to primary** |
| `--nf-rating` (`= electric-300`) | `#0C2FE8` | **identical to primary** |

Any two-tone brand treatment goes monochrome in light mode, and star ratings become the same blue as the CTA.

It also splits behaviour: `--nf-gradient-primary` (`tokens.css:159-166`) *references* `var(--nf-electric-300)` so it
follows the override, while `--nf-gradient-brand` (`tokens.css:167`) hardcodes the literal `#5C7CFF` so it does not,
and `iconRamp.electric` in `index.ts:103` hardcodes `#5C7CFF` so it does not either. One token override, three
different outcomes. This is exactly the failure mode the file's own comment at `index.ts:109-113` warns about.

Downstream: `.nf-logo__word-accent` (`globals.css:2031-2036`) paints the wordmark with `--nf-gradient-brand`, whose
first stop `#5C7CFF` is **3.63 : 1** on white. Someone patched `.nf-gradient-text` for light
(`globals.css:3019-3024`) but not the logo, which uses a different gradient token.

---

#### P1-4. `globals.css` has escaped the token layer entirely

The file opens (`globals.css:5-7`) with *"Nothing below may introduce a raw colour."* Counted:

| Literal | Occurrences in `globals.css` |
|---|---|
| `rgb(12 57 239 / …)` (= `--nf-electric-400`) | **68** |
| `rgb(18 21 26 / …)` (light ink — **not a token**) | **51** |
| `rgb(255 255 255 / …)` | 42 |
| `rgb(0 0 0 / …)` | 20 |
| `rgb(92 124 255 / …)` (= `--nf-electric-300`) | 12 |
| hex literals (`#FFFFFF` ×26, `#fff` ×6, `#000` ×6, `#ffffff` ×4, `#0C39EF` ×3, + 12 one-off greys) | **55** |
| **Total raw colour literals** | **~250** |

`rgb(18 21 26)` deserves its own note: it is used 51 times as "the light ink", but the actual light ink token is
`--nf-content-primary: #16181D` (`tokens.css:302`). They are **different colours**. There is a fourth near-black in
the system that exists only as a repeated literal.

3167 lines with 250 raw colours and 77 hand-rolled shadows is the answer to "has the system escaped its tokens":
yes, comprehensively. There is **no `tailwind.config.*`, no `.stylelintrc`, no eslint config anywhere in the repo**
(`find` confirms), so nothing mechanically prevents any of it.

---

#### P1-5. Hardcoded non-brand palette duplicated across six component files

The identical 6-pair gradient array is copy-pasted into six files:
```js
const X = [
  ["#1E3A8A", "#172554"],  // tailwind blue-900 / blue-950
  ["#155E75", "#0F172A"],  // cyan-800 / slate-900
  ["#0C4A6E", "#111827"],  // sky-900 / gray-900
  ["#334155", "#0F172A"],  // slate-700 / slate-900
  ["#1E40AF", "#1E1B4B"],  // blue-800 / indigo-950
  ["#312E81", "#0F172A"],  // indigo-900 / slate-900
];
```
- `components/app/ListingCard.tsx:19-24`
- `components/app/listing/ListingGallery.tsx:25-30`
- `components/site/landing/FeaturedCarousel.tsx:23-28`
- `components/app/search/MapDock.tsx:27-32`
- `components/app/messages/ListingOptionsSheet.tsx:21-26`
- plus the same `#1E3A8A → #172554` inline at `components/app/bookings/BookingsTabs.tsx:42` and `app/(app)/bookings/MyBookings.tsx:64`

These are stock Tailwind slate / indigo / cyan. `#312E81` and `#1E1B4B` are **indigo** — the exact violet-leaning
family `tokens.css:52-66` says was deliberately hunted out of the tree ("*every time one has appeared it has had to
be hunted back out*"). It is back, in the listing card placeholder that every user sees first.

Full hardcoded-colour census across `.tsx`:

| File | hex | rgb/rgba | Notes |
|---|---|---|---|
| `design-system/icons/TrustIcon.tsx` | **30** | 0 | `#4F46E5` indigo-600, `#6366F1`, `#A5B4FC`, `#FF3A44`, `#C31162`, `#FFE000`, `#FFBC00` — off-brand warm + violet. Play/App Store marks are legitimate brand marks. |
| `components/app/wallet/BalanceCard.tsx` | 0 | **6** | `rgb(0 200 255)`, `rgb(51 138 255)`, `rgb(0 102 255)`, `rgb(56 189 248)` — four blues, none in the palette |
| `ListingCard.tsx` / `ListingGallery.tsx` / `FeaturedCarousel.tsx` / `MapDock.tsx` / `ListingOptionsSheet.tsx` | 6 each | 1–2 each | the array above |
| `design-system/icons/Icon3D.tsx` | 5 | 0 | `#FFFFFF` stops — benign |
| `components/auth/ProviderMarks.tsx` | 4 | 0 | Google brand colours — legitimate |
| `SignatureShowcase.tsx` | 0 | 3 | |
| `BookingsTabs.tsx`, `MyBookings.tsx`, `ApplyWizard.tsx:213`, `ListingPitch.tsx:27` | 1 each | — | `#fff` / inline gradients |

**Total: ~130 hex + ~26 rgb() literals in components**, on top of the ~250 in `globals.css`.

Also 53 `bg-white/N` · `border-white/N` · `text-white/N` utilities, which are hardcoded colour by another name and
are the reason `globals.css:3141-3146` needs a defensive light-mode patch matching on escaped class names:
```css
:root[data-theme="light"] .nf-card :is(.bg-white\/5, .bg-white\/\[0\.04\], .bg-white\/\[0\.05\]) {
  background-color: var(--nf-surface-inset);
}
```
That rule is a confession. It is patching a leak by string-matching the leak.

---

#### P1-6. Semantic colour layer exists but is malnourished

There **is** a semantic layer: `success / warning / error / info` + matching `-surface` tints + `--nf-rating`
(`tokens.css:119-129`). Better than "brand + grey". Reservations:

- `--nf-state-warning` is **cyan** (`tokens.css:120`), by explicit decision. Cyan-as-warning is a comprehension
  risk — it reads "info", and it collides visually with `--nf-state-info` (sky). In light mode they are
  `#0E6E8C` and `#38BDF8`: same hue family, one dark, one washed out.
- `--nf-state-info` used **3 times**; `--nf-rating` **5 times**. Effectively a 2-colour semantic system
  (success 40, error 47, warning 39).
- No `-border`, `-strong`, or `-on` variants — every consumer hand-rolls `color-mix(… 32%, transparent)` for
  borders. 49 `color-mix()` calls in `.tsx` are largely this.

---

#### P1-7. Dead and duplicate tokens

Zero usage outside `tokens.css`:
`--nf-shadow-sm`, `--nf-glow-brand`, `--nf-glow-accent`, `--nf-glass-specular`, `--nf-gradient-primary`,
`--nf-gradient-surface`, `--nf-canvas-bloom-1/2/3`, `--nf-mist-200`, `--nf-mist-400`, `--nf-royal-500/600/700`,
`--nf-cyan-500`, `--nf-crimson-400`, `--nf-ink-500/600/700/950`, `--nf-sky-400` (direct), `--nf-emerald-400` (direct),
`--nf-rose-400` (direct), `--nf-text-hero`, `--nf-text-h4`, `--nf-text-body-sm`, `--nf-tracking-normal`,
`--nf-header-height`. **26 dead tokens.**

Note `--nf-canvas-bloom-1/2/3` (`tokens.css:182-184`) are documented as "the ingredients; the motion lives in the
`nf-ambient` layer in globals.css" — but `.nf-ambient` (`globals.css:2247,2258,2275`) hardcodes its own
`radial-gradient(circle, rgb(12 57 239 / 0.5) …)` and never reads them. The documented contract is fiction.

`--nf-text-body: 0.875rem` and `--nf-text-body-sm: 0.875rem` (`tokens.css:252-253`) are **the same value**.

`index.ts` drift, despite its comment claiming exact parity with Layer 1 (`index.ts:47-52`):

| Key | `index.ts` | `tokens.css` |
|---|---|---|
| `cyan400` | `#22D3EE` (81) | `#00C8FF` (44) |
| `emerald400` | `#34D399` (83) | `#10B981` (48) |
| `rose400` | `#FB7185` (84) | `#FF1744` (49) |

Any SVG drawn from `palette` paints a different green, cyan and red than the DOM.

---

#### P1-8. Radii: a scale exists, is mostly used, but the sheet radius is off-scale and nesting is uncorrected

`@theme inline` (`globals.css:29-33`) maps only `--radius-sm|md|lg|xl|2xl`. It does **not** map `--radius-3xl`,
so Tailwind's default 1.5rem/24px survives — and `rounded-t-3xl` is the radius of **every bottom sheet in the app**:
- `ListingOptionsSheet.tsx:74`, `AdminActions.tsx:113`, `ThreadOptionsSheet.tsx:92`, `MyBookings.tsx:183`

24px sits between `--nf-radius-xl` (22) and `--nf-radius-2xl` (32) and belongs to neither. The single most
prominent radius in the mobile product is off the scale.

Off-token one-offs: `rounded-[7px]`, `rounded-[4px]`, `rounded-[1.25rem]`.
`rounded-full` (104) vs `rounded-[var(--nf-radius-pill)]` (5) — equivalent output, two conventions.

**Optical nesting correction is applied in exactly one place** — `.nf-icon-tile` (`globals.css:320-353`) uses
`border-radius: 30%` outer with `inset: 7%; border-radius: 26%` inner. Genuinely correct, and clearly deliberate.
Nowhere else. Counter-example, `BalanceCard.tsx:105,177`: outer `--nf-radius-2xl` (32px) with `p-5` (20px) →
optically correct inner is 12px; the code uses `--nf-radius-md` (14px). Close by luck, not by rule. There is no
documented nesting rule and no `--nf-radius-inner-*` derivation.

---

### P2 — Hygiene

---

#### P2-1. Spacing has no token scale at all

`tokens.css` is asserted (line 4-5) to be "the single source of truth for every colour, radius, shadow, blur and
motion value" — spacing is not in that list, and there are no `--nf-space-*` tokens. Spacing is Tailwind's implicit
0.25rem scale, unconfigured (no `tailwind.config.*`).

In components this is fine: only **23 arbitrary `p|m|gap-[…]`** across the whole tree, and most are legitimate
(`max-w-[52ch]`, `pb-[max(1rem,env(safe-area-inset-bottom))]`).

In `globals.css` it is not. Component padding is magic rem off any grid:
- `.nf-btn` `padding: 0.72rem 1.2rem` (11.52 / 19.2px) — `globals.css:1341`
- `.nf-btn--lg` `0.92rem 1.65rem` (14.72 / 26.4px) — `globals.css:1439`
- `.nf-auth-row` `0.95rem 1.1rem` — `globals.css:1464`
- `.nf-field` `0.95rem 1.05rem` — `globals.css:1526`
- `.nf-chip` `0.45rem 0.9rem` — `globals.css:1663`
- `.nf-panel-sunken` `1.1rem 1.25rem` — `globals.css:1827`
- `.nf-page-header--verified` `0.5rem 0.625rem` — `globals.css:563`

Seven primitives, seven unrelated padding values, none on a 4px grid, none derived from anything.

#### P2-2. Copy-pasted control recipe (3×)

`.nf-icon-btn` (`globals.css:1583-1585`), `.nf-action-circle__ring` (`globals.css:1867-1869`) are **byte-identical**:
```css
border: 1px solid rgb(12 57 239 / 0.45);
background: linear-gradient(180deg, rgb(0 3 32 / 0.55), rgb(0 1 16 / 0.7));
box-shadow: 0 0 10px rgb(12 57 239 / 0.22), inset 0 0 10px rgb(12 57 239 / 0.1);
```
`.nf-chip` (`globals.css:1668-1670`) is the same recipe at 0.35/0.16/0.07. Their hover and active states are
duplicated too (lines 1590-1596, 1676-1692, 1880-1887). One `--nf-control-*` token set would collapse ~40 lines.

#### P2-3. Duplicated / split selector blocks

`.nf-hero-scene` is defined **4 separate times** (`globals.css:880, 910, 2597, 2936`) — an `@supports` scroll
animation, an infinite drift animation, a mask + opacity block, and a light override. The drift at 910 and the
scroll-linked animation at 880 both set `animation` on the same selector; the later one wins and silently kills the
scroll-driven version wherever `animation-timeline: view()` is supported.

`.nf-reveal` ×3 (2621, 2650, 2688), `.nf-icon-tile` split across 320/384/706, `.nf-story-art` ×2 (900, 958),
`.nf-tabbar` ×2, `.nf-skeleton` ×2, plus 11 more selectors defined twice.

#### P2-4. `!important`

28 total. 25 are `animation: none !important` inside `prefers-reduced-motion` — defensible. 3 at
`globals.css:1256-1258` are Leaflet third-party overrides — defensible. Two smells:
`globals.css:2922` `display: none !important` on a light-mode ambient span, and
`globals.css:3097` `filter: none !important` on the wallet sparkline. Both exist because the base rule is
over-specific, not because the override needs the weight.

#### P2-5. Overly specific / brittle selectors

`globals.css:3141` and `3159` match escaped Tailwind class names:
`.hover\:bg-\[var\(--nf-glass-fill\)\]:hover`, `:is(.bg-white\/5, .bg-white\/\[0\.04\], .bg-white\/\[0\.05\])`.
These break silently the moment someone writes `bg-white/[0.045]` or reorders a utility.

`globals.css:3071` `:root[data-theme="light"] select.nf-btn--primary` — a tag-qualified component override, meaning
the language switcher is styled by *being a `<select>`*, not by a modifier class.

#### P2-6. Two different dark bases

`html { background-color: var(--nf-surface-canvas) }` = `#000010` (`globals.css:73`), while
`.nf-ambient` paints `var(--nf-canvas-base)` = `#010118` (`globals.css:2219`), and
`layout.tsx:101` sets `themeColor: "#010118"`. Three surfaces, two values. During the ambient layer's paint gap
(and if the background image 404s) the seam is visible.

#### P2-7. Light mode has two contradictory navigation materials

`.nf-tabbar` light = white glass (`--nf-glass-fill-strong` = `rgb(255 255 255 / 0.96)`, `globals.css:2069`),
but `.nf-dock` light = **dark** (`rgb(18 21 26 / 0.92)`, `globals.css:2187-2190`). The mobile nav and the desktop
dock are opposite colours in the same theme, despite `globals.css:2138-2141` explicitly claiming they are "same
dark glass material … so the two read as one family."

#### P2-8. `* { border-color: var(--nf-border-subtle) }`

`globals.css:40-42`. A universal selector setting an inherited-looking property on every element in the document.
It works, but it means every `border` utility silently picks up a theme colour, and it is why removing a border
colour anywhere reveals subtle grey rather than the browser default. Low cost, but it is a global write.

---

## 3. CONCRETE UPGRADE RECOMMENDATIONS

### 3.1 SHIP THIS: the real glass system

Replace `tokens.css:135-146` and `globals.css:141-156` wholesale.

**Tokens — `packages/design-tokens/src/tokens.css`:**

```css
/* ---------------------------------------------------------------------
 * Glass. Four ingredients, always all four:
 *   1. backdrop blur + saturation lift  (the material)
 *   2. a bright 1px inner highlight on the top edge  (the lit leading edge)
 *   3. a hairline border  (the physical edge)
 *   4. a two-layer ambient shadow  (the object sitting in space)
 * A surface carrying fewer than four of these is not glass and must not
 * use these tokens.
 * ------------------------------------------------------------------ */

/* Fill: three depths, not two. Chrome sits over content; panels sit over canvas. */
--nf-glass-fill-thin:    rgb(255 255 255 / 0.045);
--nf-glass-fill:         rgb(255 255 255 / 0.075);
--nf-glass-fill-strong:  rgb(255 255 255 / 0.11);

/* Blur ladder, matched to the fill ladder. */
--nf-glass-blur-thin:    14px;
--nf-glass-blur:         26px;
--nf-glass-blur-strong:  40px;
--nf-glass-saturate:     165%;

/* Edges. Top rim is BRIGHTER than the border: that asymmetry is the tell. */
--nf-glass-border:       rgb(255 255 255 / 0.11);
--nf-glass-rim:          rgb(255 255 255 / 0.22);   /* inset 0 1px 0 */
--nf-glass-rim-strong:   rgb(255 255 255 / 0.34);
--nf-glass-floor:        rgb(0 0 0 / 0.22);         /* inset 0 -1px 0, the occluded trailing edge */

/* Ambient shadow, two layers: contact + spread. Composed at use site. */
--nf-glass-shadow:
  0 1px 2px rgb(0 0 0 / 0.34),
  0 12px 32px -8px rgb(0 0 0 / 0.46);
--nf-glass-shadow-lifted:
  0 2px 4px rgb(0 0 0 / 0.32),
  0 20px 56px -12px rgb(0 0 0 / 0.55);

/* Specular sweep, now actually consumed by .nf-glass::before. */
--nf-glass-specular: linear-gradient(
  152deg,
  rgb(255 255 255 / 0.14) 0%,
  rgb(255 255 255 / 0.04) 34%,
  transparent 62%
);
```

Light-theme override (`:root[data-theme="light"]`):
```css
--nf-glass-fill-thin:   rgb(255 255 255 / 0.72);
--nf-glass-fill:        rgb(255 255 255 / 0.86);
--nf-glass-fill-strong: rgb(255 255 255 / 0.95);
--nf-glass-border:      rgb(18 21 26 / 0.10);
--nf-glass-rim:         rgb(255 255 255 / 0.9);
--nf-glass-rim-strong:  rgb(255 255 255 / 1);
--nf-glass-floor:       rgb(18 21 26 / 0.05);
--nf-glass-shadow:
  0 1px 1px rgb(18 21 26 / 0.05),
  0 8px 24px -6px rgb(18 21 26 / 0.10);
--nf-glass-shadow-lifted:
  0 2px 3px rgb(18 21 26 / 0.06),
  0 18px 44px -10px rgb(18 21 26 / 0.16);
--nf-glass-specular: linear-gradient(
  152deg, rgb(255 255 255 / 0.9) 0%, rgb(255 255 255 / 0.3) 30%, transparent 60%);
```

**Component — `apps/web/src/app/globals.css`, replacing lines 141-156:**

```css
  /*
   * Glass. One class, four ingredients, no exceptions.
   *
   * ::before carries the specular sweep so the fill stays a flat token and
   * the highlight can be masked/animated independently. z-index 0 on the
   * pseudo + isolation on the host keeps it under content without needing
   * a z-index on every child.
   */
  .nf-glass {
    position: relative;
    isolation: isolate;
    background: var(--nf-glass-fill);
    border: 1px solid var(--nf-glass-border);
    backdrop-filter: blur(var(--nf-glass-blur)) saturate(var(--nf-glass-saturate));
    -webkit-backdrop-filter: blur(var(--nf-glass-blur)) saturate(var(--nf-glass-saturate));
    box-shadow:
      inset 0 1px 0 var(--nf-glass-rim),
      inset 0 -1px 0 var(--nf-glass-floor),
      var(--nf-glass-shadow);
  }
  .nf-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    background: var(--nf-glass-specular);
    opacity: 0.85;
    pointer-events: none;
  }
  .nf-glass > * { position: relative; z-index: 1; }

  /* Depth modifiers. Blur, fill and shadow move together or the illusion breaks. */
  .nf-glass--thin {
    background: var(--nf-glass-fill-thin);
    backdrop-filter: blur(var(--nf-glass-blur-thin)) saturate(var(--nf-glass-saturate));
    -webkit-backdrop-filter: blur(var(--nf-glass-blur-thin)) saturate(var(--nf-glass-saturate));
  }
  .nf-glass--strong {
    background: var(--nf-glass-fill-strong);
    backdrop-filter: blur(var(--nf-glass-blur-strong)) saturate(var(--nf-glass-saturate));
    -webkit-backdrop-filter: blur(var(--nf-glass-blur-strong)) saturate(var(--nf-glass-saturate));
    box-shadow:
      inset 0 1px 0 var(--nf-glass-rim-strong),
      inset 0 -1px 0 var(--nf-glass-floor),
      var(--nf-glass-shadow-lifted);
  }

  /*
   * Sticky chrome. The brief's "content visibly scrolls under the nav behind
   * a blur + gradient scrim". The scrim is a separate 1.5rem strip below the
   * bar so the blur has a soft exit instead of a hard seam.
   */
  .nf-glass--chrome {
    border-inline: 0;
    border-top: 0;
    box-shadow:
      inset 0 1px 0 var(--nf-glass-rim),
      0 1px 0 var(--nf-glass-border);
  }
  .nf-glass--chrome::after {
    content: "";
    position: absolute;
    inset: 100% 0 auto 0;
    height: 1.5rem;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--nf-surface-canvas) 70%, transparent) 0%,
      transparent 100%
    );
  }

  /* No backdrop-filter: fall back to an opaque surface, never a washed panel. */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .nf-glass,
    .nf-glass--thin,
    .nf-glass--strong {
      background: var(--nf-surface-elevated);
    }
    .nf-glass::before { display: none; }
  }
```

Then repoint `.nf-tabbar` (2068), `.nf-dock` (2142), `.nf-btn--glass` (1412), `.nf-auth-row` (1457) and the
`backdrop-blur-md` circular controls in `ListingActions.tsx` / `ListingGallery.tsx` at
`.nf-glass` + a modifier, and delete their bespoke shadow stacks.

---

### 3.2 SHIP THIS: the elevation ladder

Two changes are required together — the ladder alone does nothing until the dark base is lifted off `#000010`,
because black-on-black shadows are invisible (P0-2).

**Step 1 — lift the dark base and give the surface ramp real luminance separation.**
Replace `tokens.css:19-26` and `tokens.css:89-94`:

```css
/* Near-black with a navy bias, not pure black. Red and green must be nonzero
   or the ramp moves only in the 0.0722-weighted channel and no step is visible. */
--nf-ink-950: #06070F;
--nf-ink-900: #0A0C16;
--nf-ink-850: #0E111D;
--nf-ink-800: #131725;
--nf-ink-750: #191E2F;
--nf-ink-700: #212840;

--nf-surface-canvas:    #06070F;  /* L 0.0032 */
--nf-surface-primary:   #0A0C16;  /* L 0.0052 */
--nf-surface-secondary: #0E111D;  /* L 0.0077 */
--nf-surface-elevated:  #131725;  /* L 0.0114 */
--nf-surface-raised:    #191E2F;  /* L 0.0165 */
--nf-surface-inset:     #04050B;
```
canvas → raised now measures **1.22 : 1** by fill alone (vs 1.09), and a 45% black shadow on `#0A0C16` produces a
visible 1.44:1 delta instead of 1.003:1. Update `layout.tsx:101` `themeColor` and the PWA manifest to `#06070F`.

**Step 2 — the ladder. Replace `tokens.css:189-195`:**

```css
/* ---------------------------------------------------------------------
 * Elevation ladder. Six rungs. Every rung is ambient + direct, never one
 * flat drop. `-rim` is the inner top highlight that makes a surface read as
 * lit rather than pasted; it is part of the rung, not an optional extra.
 * ------------------------------------------------------------------ */

/* 0 · ground — no shadow, the page itself */
--nf-elev-0:        none;
--nf-elev-0-rim:    none;

/* 1 · card — resting content */
--nf-elev-1:
  0 1px 1px rgb(0 0 0 / 0.30),
  0 4px 12px -2px rgb(0 0 0 / 0.34);
--nf-elev-1-rim:    inset 0 1px 0 rgb(255 255 255 / 0.07);

/* 2 · raised — hover, selected, a card that has come forward */
--nf-elev-2:
  0 2px 3px rgb(0 0 0 / 0.32),
  0 10px 26px -4px rgb(0 0 0 / 0.42);
--nf-elev-2-rim:    inset 0 1px 0 rgb(255 255 255 / 0.10);

/* 3 · sheet — bottom sheets, drawers, popovers anchored to an edge */
--nf-elev-3:
  0 2px 4px rgb(0 0 0 / 0.34),
  0 -1px 0 rgb(255 255 255 / 0.05),
  0 -20px 48px -12px rgb(0 0 0 / 0.55);
--nf-elev-3-rim:    inset 0 1px 0 rgb(255 255 255 / 0.14);

/* 4 · modal — centred dialogs, detached from every edge */
--nf-elev-4:
  0 4px 8px rgb(0 0 0 / 0.34),
  0 24px 64px -12px rgb(0 0 0 / 0.62);
--nf-elev-4-rim:    inset 0 1px 0 rgb(255 255 255 / 0.16);

/* 5 · toast — the topmost transient object */
--nf-elev-5:
  0 2px 4px rgb(0 0 0 / 0.30),
  0 12px 28px -6px rgb(0 0 0 / 0.50),
  0 32px 72px -20px rgb(0 0 0 / 0.40);
--nf-elev-5-rim:    inset 0 1px 0 rgb(255 255 255 / 0.20);

/* Borders scale with the rung: higher surfaces need a stronger edge to
   survive against the brighter blur behind them. */
--nf-elev-1-border: rgb(255 255 255 / 0.08);
--nf-elev-2-border: rgb(255 255 255 / 0.11);
--nf-elev-3-border: rgb(255 255 255 / 0.14);
--nf-elev-4-border: rgb(255 255 255 / 0.16);
--nf-elev-5-border: rgb(255 255 255 / 0.18);
```

**Light-theme rungs — real dual shadows, per §3 "light top-left, dark bottom-right":**

```css
:root[data-theme="light"] {
  --nf-surface-canvas: #F6F4F1;   /* warm off-white: R > G > B */
  --nf-surface-primary: #FFFDFB;
  --nf-surface-raised:  #FFFFFF;
  --nf-surface-inset:   #EFEDE9;

  --nf-elev-1:
    -2px -2px 5px rgb(255 255 255 / 0.9),
     0 1px 1px rgb(60 50 40 / 0.05),
     3px 4px 12px -2px rgb(60 50 40 / 0.10);
  --nf-elev-1-rim: inset 0 1px 0 rgb(255 255 255 / 0.95);

  --nf-elev-2:
    -3px -3px 8px rgb(255 255 255 / 0.95),
     0 2px 3px rgb(60 50 40 / 0.06),
     5px 8px 22px -4px rgb(60 50 40 / 0.14);
  --nf-elev-2-rim: inset 0 1px 0 rgb(255 255 255 / 1);

  --nf-elev-3:
    -3px -3px 10px rgb(255 255 255 / 0.9),
     0 -18px 44px -12px rgb(60 50 40 / 0.18);
  --nf-elev-3-rim: inset 0 1px 0 rgb(255 255 255 / 1);

  --nf-elev-4:
    -4px -4px 12px rgb(255 255 255 / 0.9),
     0 4px 8px rgb(60 50 40 / 0.07),
     8px 20px 56px -12px rgb(60 50 40 / 0.20);
  --nf-elev-4-rim: inset 0 1px 0 rgb(255 255 255 / 1);

  --nf-elev-5:
    -3px -3px 10px rgb(255 255 255 / 0.9),
     0 12px 28px -6px rgb(60 50 40 / 0.16),
     0 32px 72px -20px rgb(60 50 40 / 0.12);
  --nf-elev-5-rim: inset 0 1px 0 rgb(255 255 255 / 1);

  --nf-elev-1-border: rgb(60 50 40 / 0.10);
  --nf-elev-2-border: rgb(60 50 40 / 0.13);
  --nf-elev-3-border: rgb(60 50 40 / 0.14);
  --nf-elev-4-border: rgb(60 50 40 / 0.16);
  --nf-elev-5-border: rgb(60 50 40 / 0.18);
}
```
`rgb(60 50 40)` is a warm shadow ink — a neutral-grey shadow on a warm ground is what makes light modes look dead.
The `-2px -2px` white layer is the light-source shadow the current theme has none of.

**Consumption — one class per rung, in `globals.css @layer components`:**

```css
  .nf-elev-1, .nf-elev-2, .nf-elev-3, .nf-elev-4, .nf-elev-5 {
    border: 1px solid var(--nf-elev-border);
    box-shadow: var(--nf-elev-rim), var(--nf-elev-shadow);
    transition: box-shadow var(--nf-duration-base) var(--nf-ease-standard);
  }
  .nf-elev-1 { --nf-elev-shadow: var(--nf-elev-1); --nf-elev-rim: var(--nf-elev-1-rim); --nf-elev-border: var(--nf-elev-1-border); background: var(--nf-surface-primary);   border-radius: var(--nf-radius-lg); }
  .nf-elev-2 { --nf-elev-shadow: var(--nf-elev-2); --nf-elev-rim: var(--nf-elev-2-rim); --nf-elev-border: var(--nf-elev-2-border); background: var(--nf-surface-elevated);  border-radius: var(--nf-radius-lg); }
  .nf-elev-3 { --nf-elev-shadow: var(--nf-elev-3); --nf-elev-rim: var(--nf-elev-3-rim); --nf-elev-border: var(--nf-elev-3-border); background: var(--nf-surface-elevated);  border-radius: var(--nf-radius-2xl) var(--nf-radius-2xl) 0 0; }
  .nf-elev-4 { --nf-elev-shadow: var(--nf-elev-4); --nf-elev-rim: var(--nf-elev-4-rim); --nf-elev-border: var(--nf-elev-4-border); background: var(--nf-surface-raised);    border-radius: var(--nf-radius-2xl); }
  .nf-elev-5 { --nf-elev-shadow: var(--nf-elev-5); --nf-elev-rim: var(--nf-elev-5-rim); --nf-elev-border: var(--nf-elev-5-border); background: var(--nf-surface-raised);    border-radius: var(--nf-radius-xl); }

  /* Raising is a rung change, not a bespoke hover shadow. */
  .nf-elev-1.nf-elev--hoverable:hover {
    --nf-elev-shadow: var(--nf-elev-2);
    --nf-elev-rim: var(--nf-elev-2-rim);
    --nf-elev-border: var(--nf-elev-2-border);
  }
  @media (prefers-reduced-motion: reduce) {
    .nf-elev-1, .nf-elev-2, .nf-elev-3, .nf-elev-4, .nf-elev-5 { transition: none; }
  }
```

Then: delete `--nf-shadow-sm|card|lifted|float` and `--nf-glow-brand|accent`; replace the 4 sheet call sites
(`ListingOptionsSheet.tsx:74`, `AdminActions.tsx:113`, `ThreadOptionsSheet.tsx:92`, `MyBookings.tsx:183`) with
`.nf-elev-3`; replace `.nf-card`'s hand-rolled `box-shadow` (`globals.css:202-204, 214-218`) with `.nf-elev-1
.nf-elev--hoverable`; delete the 16 arbitrary `shadow-[…]` utilities.

---

### 3.3 Contrast fixes (token-level, one line each)

```css
:root[data-theme="light"] {
  --nf-content-muted:  #5F666E;   /*  5.31 : 1 on #FFFFFF,  4.86 : 1 on #F4F5F7  (was 3.94 / 3.61) */
  --nf-state-info:     #0B6FA8;   /*  5.28 : 1 on white                          (was 2.14)        */
  --nf-state-success:  #07704B;   /*  6.03 : 1 on white,  5.23 : 1 on its chip    (was 4.37 / 3.79) */
  --nf-state-error:    #B00A2E;   /*  6.42 : 1 on white,  5.09 : 1 on its chip    (was 4.99 / 3.95) */

  /* Chips must derive from the THEMED token, not from Layer 1. */
  --nf-state-success-surface: color-mix(in oklab, var(--nf-state-success) 12%, transparent);
  --nf-state-warning-surface: color-mix(in oklab, var(--nf-state-warning) 12%, transparent);
  --nf-state-error-surface:   color-mix(in oklab, var(--nf-state-error)   12%, transparent);
  --nf-state-info-surface:    color-mix(in oklab, var(--nf-state-info)    12%, transparent);

  /* Hairlines you can actually see: 1.13:1 → 1.34:1 */
  --nf-border-subtle:  rgb(60 50 40 / 0.14);
  --nf-border-default: rgb(60 50 40 / 0.20);
  --nf-border-strong:  rgb(60 50 40 / 0.32);
}
```
Then delete the `.nf-overline` light patch at `globals.css:3013-3015` — it becomes redundant once the token is fixed.

Also change `tokens.css:126-129` (the base `:root` `-surface` tokens) to derive from `var(--nf-state-*)` rather than
`var(--nf-emerald-400)` / `var(--nf-cyan-400)` / `var(--nf-rose-400)` / `var(--nf-sky-400)`, so themes propagate
automatically instead of needing four parallel overrides.

### 3.4 Un-collapse the light brand tokens

Delete `--nf-electric-300: #0C2FE8;` from `tokens.css:340` — never override Layer 1 per theme. Instead:
```css
:root[data-theme="light"] {
  --nf-brand-primary:   #0C2FE8;
  --nf-brand-secondary: #4C6BFF;  /* stays distinct from primary */
  --nf-rating:          #1B4DD8;
  --nf-gradient-brand:  linear-gradient(135deg, #2450FF 0%, #0C39EF 100%);  /* first stop now 4.6:1 on white */
}
```
and repoint the 6 `var(--nf-electric-300)` consumers in `globals.css` (592, 758, 1159, 1230, 1710, 1758, 1800, 2179, 2199)
at `--nf-brand-secondary` / `--nf-rating` as appropriate.

### 3.5 Radii

- Add `--radius-3xl: var(--nf-radius-2xl);` to the `@theme inline` block (`globals.css:33`) so `rounded-t-3xl`
  snaps to 32px, or change the four sheets to `rounded-t-[var(--nf-radius-2xl)]`.
- Add a derived nesting scale and document the rule:
  ```css
  --nf-radius-inner-lg: calc(var(--nf-radius-lg) - 0.5rem);   /* outer − p-2 */
  --nf-radius-inner-xl: calc(var(--nf-radius-xl) - 0.75rem);  /* outer − p-3 */
  --nf-radius-inner-2xl: calc(var(--nf-radius-2xl) - 1.25rem);/* outer − p-5 */
  ```
- Kill `rounded-[7px]`, `rounded-[4px]`, `rounded-[1.25rem]`. Standardise on `rounded-full`, drop the 5
  `rounded-[var(--nf-radius-pill)]`.

### 3.6 Spacing

Add a scale and stop hand-tuning primitive padding:
```css
--nf-space-1: 0.25rem; --nf-space-2: 0.5rem;  --nf-space-3: 0.75rem;
--nf-space-4: 1rem;    --nf-space-5: 1.25rem; --nf-space-6: 1.5rem;
--nf-space-8: 2rem;    --nf-space-10: 2.5rem; --nf-space-12: 3rem;

/* Control heights, so every pill/field/button lines up in a row */
--nf-control-h-sm: 2rem; --nf-control-h: 2.75rem; --nf-control-h-lg: 3.25rem;  /* 44px meets the HIG target */
```
Then rewrite `.nf-btn` / `.nf-field` / `.nf-auth-row` / `.nf-chip` / `.nf-panel-sunken` padding in terms of these.
Note the current `.nf-btn` (`0.72rem` vertical + ~20px line-height ≈ 43px) is **one pixel under the 44pt minimum**
the App Store checklist in §8 asks for.

### 3.7 Enforcement (this is why the drift happened)

There is no lint gate anywhere. Add, in order of value:
1. **Stylelint** with `color-no-hex` + `declaration-property-value-allowed-list` for `box-shadow` /
   `background-color` / `border-color`, scoped to `apps/web/src/**/*.css`, allowing only `var(--nf-*)` and
   `color-mix(… var(--nf-*) …)`.
2. **ESLint** `no-restricted-syntax` on JSX `className` / `style` string literals matching
   `/#[0-9a-fA-F]{3,8}\b/`, `/rgba?\(/`, `/(bg|text|border|ring|from|to|via)-(white|black)\//`.
3. A CI script asserting `index.ts.palette` is byte-identical to Layer 1 of `tokens.css` — it has already drifted
   on `cyan400`, `emerald400`, `rose400` despite a comment claiming otherwise.

### 3.8 Cleanup

- Delete the 26 dead tokens (§P1-7).
- Delete `--nf-text-body-sm` (duplicate of `--nf-text-body`).
- Extract the shared placeholder gradient array into `packages/design-tokens` (or a
  `lib/placeholder-gradients.ts`) built from `--nf-ink-*` / `--nf-royal-*`, and delete the 6 copies of the
  indigo/slate array.
- Merge the 4 `.nf-hero-scene` blocks into one and fix the animation collision at `globals.css:880` vs `910`.
- Replace the escaped-class-name light patches (`globals.css:3141-3161`) with fixing the 53 `bg-white/N` call sites.
- Unify `--nf-surface-canvas` and `--nf-canvas-base` to one value; sync `layout.tsx:101` and the manifest.
- Give `.nf-dock` and `.nf-tabbar` the same light-mode material.

---

## 4. FINDINGS INDEX

**P0 (5)** — glass is a flat panel; dark shadows invisible; dark surface ladder 1.09:1; `--nf-content-muted` fails AA
at 296 sites; `--nf-state-info` 2.14:1 + success/error chips fail.

**P1 (8)** — elevation ladder has 3 usable rungs and a single-layer modal shadow; light mode is flat SaaS not
neumorphic and its hairlines are 1.10:1; light collapses brand-secondary + rating into brand-primary; ~250 raw
colours in `globals.css`; indigo/slate palette duplicated across 6 components; semantic layer has no border/strong
variants and warning-as-cyan; 26 dead tokens + `index.ts` drift on 3 values; sheet radius off-scale + no optical
nesting rule.

**P2 (8)** — no spacing scale, magic rem in 7 primitives; control recipe copy-pasted 3×; 15 duplicated selector
blocks incl. `.nf-hero-scene` ×4 with an animation collision; `!important` smells at 2922/3097; escaped-class-name
selectors; two dark bases; contradictory light nav materials; universal `*` border-color write.

**Total: 21 findings.**
