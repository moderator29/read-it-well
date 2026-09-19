# R1 second pass: shape and colour, measured

**19 September 2026, on `claude/brave-feynman-9g0ykr`.** Second of the two
audits the founder's standing order requires before a frontend scope closes.

Every number below was taken off a PRODUCTION server, `NEXT_DIST_DIR=.next-r1
npx next build && VALLO_PREVIEW_HARNESS=1 NEXT_DIST_DIR=.next-r1 npx next start
-p 3167`, built from the tree at `184ef31`. No proof taken earlier today is
cited. Where I could not measure something I say so rather than implying
coverage; section 6 is the list of what I did not reach.

Tools: `scripts/design/compare-surface.mjs` (colour checks, shape ratios and
`--shape-sweep`), with a `home` surface, a `chrome` surface and two harness
repairs added by me; `scripts/design/sample-reference.mjs`, re-run rather than
quoted, so the reference column is mine and not inherited prose.

**The rule everything here is held against**, `docs/DESIGN_DIRECTION.md`
section 1.4:

> **AND THE PART A NAME CHECK CANNOT SEE, WHICH IS WHY THIS LAW HAS BEEN
> BROKEN TWICE WITH EVERY GREP PASSING: A SHAPE RULING IS ABOUT THE RATIO,
> NEVER ABOUT THE TOKEN NAME.** The same `--nf-radius-*` value is a rounded
> rectangle on a tall element and a capsule on a short one. We shipped
> `--nf-radius-sm` at 14px on a 28px chip, which is a capsule, and
> `--nf-radius-2xl` at 32px on a 66px dock, which draws semicircular ends, and
> neither contains the word pill, so rule 10 passed both. THE TEST IS THE
> DRAWN RADIUS AS A FRACTION OF THE DRAWN SHORT SIDE: at or above 0.5 the
> element is a capsule however it was spelled.

---

## 0. The finding that governs the rest of the sweep

**One material is painting two surfaces the reference paints differently, and
retuning that material would fix one and break the other.**

`.nf-home__market` and `.nf-home__city` resolve to BYTE-IDENTICAL paint on a
running page. Measured computed styles at 390 on `/preview/f1/home`:

| property | `.nf-home__market` | `.nf-home__city` |
| --- | --- | --- |
| `border-top` | `1px oklab(0.568226 -0.0396168 -0.232808 / 0.5)` | identical |
| `background-image` | `linear-gradient(rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 60%)` | identical |
| `background-color` | `oklab(0.217615 -0.0173372 -0.0678539 / 0.92)` | identical |
| `box-shadow` | brand ring + glow | identical |

Both take `.nf-glass--tile`. The reference does not agree that they are the
same object:

| | reference fill | reference top border |
| --- | --- | --- |
| market tile | `#000C27` | `#1A5CA5` |
| city chip | `#030C23` | `#002051` |

That is a 75-point spread on blue between the two borders. This is the
founder's own finding seen from the other side: the reference's edge
brightness is per surface, so **nobody should close A6 or A7 below by editing
`.nf-glass--tile`, `--nf-brand-edge` or any shared token.** The market tile
needs its own edge under `.nf-home__market`; the city chip already sits close
to its target and must not be dragged along.

---

## 1. Shape-law breaches, measured as a ratio

### A1. The "Verified agent" chip is a capsule at desktop width
**Ratio 0.62.** Highest-ranked shape finding: it carries a trust word, and
trust wording is the one thing rule 12 calls sacred.

- Surface and route: the listing detail agent card, `/preview/f3/listing`
  (product route `/listing/[id]`), at 1536.
- Selector: `.nf-agent-card__pill`, `apps/web/src/app/css/catalogue.css:1205`.
- Measured: drawn box **126x23**, drawn radius **14px**, ratio **0.62**.
- At 390 the same element draws 90x41, ratio 0.34, and is compliant. The label
  stops wrapping at desktop width, the height collapses from 41px to 23px, and
  the identical token becomes a capsule. This is the ratio trap exactly as the
  design direction describes it, and a source grep sees nothing: the
  declaration reads `border-radius: var(--nf-radius-control)`.
- Held against: the shape law's "every button, chip, segment, tab, filter chip
  ... is a rounded rectangle on `--nf-radius-control`", and
  `GOVERNING-landing-desktop-hero.png`, in which the founder found not one
  capsule.
- Smallest change: in `.nf-agent-card__pill`, either `border-radius:
  var(--nf-radius-xs)` (6px, giving 0.26 at 23px and 0.15 at 41px, compliant at
  both widths), or keep 14px and add `min-block-size: 2.25rem` so the chip
  never draws shorter than 36px (14/36 = 0.39). One line either way. The
  radius change is the safer of the two because it cannot be undone by a
  future layout change.

### A2. The notification count badge is a capsule
**Ratio 0.58.**

- Surface and route: the notifications section headers, `/preview/f1/notifications`
  (product route `/notifications`, which redirects when signed out), at 390.
- Selector: `.nf-notif__count`, `apps/web/src/app/css/home.css`, rendered at
  `apps/web/src/app/(app)/notifications/LiveNotifications.tsx:161`.
- Measured: drawn box **24x24**, declared radius **14px**, ratio **0.58**. At
  24px square the browser clamps the radius to 12px, so what is actually
  painted is a perfect circle carrying the digit "2".
- Held against: the same clause. The exemption list in the design direction is
  closed and specific, and it reads "a dot, a spinner, a progress bar, a range
  track, a sheet grip, a switch track and knob, an avatar ring, a story ring
  and a skeleton placeholder". A badge carrying a number is in none of it.
- This one is worth reading twice, because it was written by somebody reaching
  for the rectangle: the declaration is `var(--nf-radius-control)`, the
  approved token, and it still drew a circle. There is no spelling of this
  defect that a grep can catch.
- Smallest change: `border-radius: var(--nf-radius-xs)` on `.nf-notif__count`
  (6px on 24px = 0.25).

### A3. The landing search pill's two actions are circles above 640px
**Ratio 0.50, twice.**

- Surface and route: the hero search pill, `/` at 1536. Not present as a circle
  at 390.
- Selectors: `.nf-landing-pill-actions > a` and
  `.nf-landing-pill-actions > button[type="submit"]`,
  `apps/web/src/app/css/landing.css:953-975`.
- Measured: both **44x44** at `border-radius: 50%`, drawn radius 22px, ratio
  **0.50**, a true circle. The submit is additionally filled
  `var(--nf-brand-primary)`, so it is the loudest circle in the hero.
- Held against: `docs/DESIGN_DIRECTION.md` section 1.4, which reads "a BARE
  ICON BUTTON that carries no text and is drawn round in a governing image, **which today
  means the landing nav's search glyph and nothing else**", and the founder's
  reading of `GOVERNING-landing-desktop-hero.png`: "the only circle in it is
  the search glyph at the top right". These two controls are in the hero's
  search pill, not in the nav at the top right, so the exemption does not
  reach them.
- Worth recording, because it sharpens the finding: **the one control the law
  does exempt is not round, and these two are.** The landing nav's search
  glyph is real (`components/site/SiteHeader.tsx:78-85`,
  `.nf-site-nav-glass--icon`) and it draws 44x44 at 14px, **ratio 0.32**, a
  rounded rectangle. That is compliant, since the exemption permits a circle
  rather than requiring one. So the product spends no circle on the control the
  law allows and two on controls it does not.
- The `@media (max-width: 639px)` block directly below already does the right
  thing: it gives the submit `var(--nf-radius-control)` and a visible word.
  Smallest change: lift that radius out of the media query so it applies at
  every width, and give the filters link beside it the same.

### A4. The footer newsletter submit is a circle
**Ratio 0.50.**

- Surface and route: the landing footer, `/` at both 390 and 1536.
- Selector: `.nf-site-newsletter-field button`,
  `apps/web/src/app/css/site.css:187`.
- Measured: **40x40**, `border-radius: var(--nf-radius-circle)` (50%), drawn
  radius 20px, ratio **0.50**, filled `var(--nf-gradient-cta)`.
- Held against: the same "and nothing else" clause.
- **I did not sample `GOVERNING-landing-desktop-fullpage.png` to see how it
  draws this control**, and that image is the one that governs the footer
  newsletter field. I am reporting the ratio, which is certain, and flagging
  that the reference should be opened before anyone changes it. If it is round
  in that image, rule 3 governs and it still becomes a rectangle; if it is a
  rectangle there, this is simply wrong.
- Smallest change: `border-radius: var(--nf-radius-control)`.

### A5. The assistant result chevron is a circle
**Ratio: radius 999px on a 22px box.**

- Surface and route: the assistant's result chips, `/preview/f1/assistant` at
  390 (product route `/assistant`, session-gated).
- Selector: `.nf-ai__result-go`, `apps/web/src/app/css/home.css`, rendered at
  `components/app/assistant/AssistantChat.tsx:913`.
- Measured: **22x22**, declared `var(--nf-radius-pill)`, drawn as a circle.
  It is `aria-hidden` and carries no text, so it is an icon-only control, and
  the "nothing else" clause reaches it.
- Lowest-visibility of the shape findings: it is 22px, inside a chip, on a
  surface behind a session.
- Smallest change: `border-radius: var(--nf-radius-xs)`.

### What I checked and found COMPLIANT, so nobody re-opens it
- **The dock bar.** `.nf-tabbar` draws 358x70 at 22px, ratio **0.31**. The
  `--nf-radius-2xl`-on-a-66px-bar defect named in the design direction is
  closed on this build. `.nf-tabbar__pill` and `.nf-tab__link` both draw 66x56
  at 14px, ratio 0.25.
- **The feed's + button.** `.nf-bloom__fab` is 60x60 at 50%, ratio 0.50, a true
  circle, and it is **correct**. `GOVERNING-feed-plus-bloom.png` is a
  governing image and it draws "a floating glass circle bottom-right above the
  dock". Do not square it.
- **The header avatar**, 40x40 at 50%. Exempt by name.
- **The landing nav's search glyph**, `.nf-site-nav-glass--icon`, 44x44 at 14px,
  ratio 0.32. The one control the law would allow to be round, and it is a
  rectangle.
- **The home market tile** (0.17), **city chip** (0.33), **location chip**
  (0.35), **search field** (0.25), **search submit** (0.32), **header
  hamburger** (0.32), all rounded rectangles.
- **`.nf-dock-island`** is a 56px circle in `chrome.css:441` with a comment
  defending it under the icon-only exemption. It is **dead CSS**: no TSX in
  `apps/web/src` references the class, and it did not appear on any route I
  swept. Not a live breach; worth deleting, not worth arguing about.

---

## 2. Colour, measured against pixels sampled out of the governing PNGs

All reference values re-read by me with `sample-reference.mjs --chrome`
(`docs/design/references/founder/GOVERNING-home-markets-target.png`, 1024x1536)
and `sample-reference.mjs` (`GOVERNING-landing-desktop-hero.png`, 1536x1024).
They agree with the values in the brief.

### A6. The home market tiles read as mid-slate cards, not near-black navy
**The most visible colour miss in the product.** Nine tiles, three across, in
the top third of the first in-app screen.

- Surface and route: `/preview/f1/home` at 390 (product route `/home`, which
  307s to `/sign-in` when signed out).
- Selector: `.nf-home__market`, `apps/web/src/app/css/home.css:124`, material
  from `.nf-glass--tile`.
- Reference: **`#000C27`**, a single flat fill (`market tile: fill`).
- Measured, vertical scan down the drawn 109x104 tile:

  | position | ours | per-channel delta from `#000C27` |
  | --- | --- | --- |
  | y=0.05 (top) | `#243856` | +36 / +44 / +47 |
  | y=0.25 | `#162C4B` | +22 / +32 / +36 |
  | y=0.50 | `#081F40` | +8 / +19 / +25 |
  | y=0.70 (bottom) | `#01183A` | +1 / +12 / +19 |

  Horizontal scan at mid-height, away from the label: `#0E2444` at the left
  end falling to `#041B3C` at the right.
- So the tile is lifted **everywhere**, since even its darkest corner is 19 points
  brighter on blue, and lifted **dramatically near its mark**, which is the
  top-left, where both scans peak.
- Two contributors, and they are separable:
  1. `.nf-glass--tile` paints `linear-gradient(rgba(255,255,255,0.08) 0%,
     rgba(0,0,0,0) 60%)`. That is a white wash over a near-black ground and it
     is a declaration, not a side effect.
  2. The glyph plate's `box-shadow: var(--nf-glow-edge)`, added deliberately in
     `glass.css:1073` for this exact grid, blooms across the tile interior.
     Both scans peaking at the mark's corner is that bloom.
- Smallest change: under `.nf-home__market` only (NOT in `.nf-glass--tile`, see
  section 0), drop the white top wash and re-measure; if the tile is still
  above the reference, pull the plate's glow rung down one for this grid. Take
  them one at a time, because either alone may be enough and both together
  will overshoot.

### A7. The city chip has no visible border
- Surface and route: the featured-cities row, `/preview/f1/home` at 390.
- Selector: `.nf-home__city`, `apps/web/src/app/css/home.css:377`.
- Reference: **`#002051`** (`city chip: top border`).
- Measured: **`#040A26`**. Worst channel **43** (blue: 38 against 81).
  Sampled at the element's own top row with a 2px box, the same method used on
  the reference. A scan down the chip shows a flat `#020619` with no distinct
  edge row at all, so there is effectively nothing drawn there.
- The chip's FILL is fine: `#03071C` against `#030C23`, worst channel 7.
- Smallest change: give `.nf-home__city` its own border colour, roughly one
  rung up from the shared edge. Per section 0, do not reach for the shared
  token, because the same token also paints the market tile, whose reference target is
  75 points brighter on blue.

### A8. The active dock glyph is the wrong blue
Ranked high because it is the brightest ink in the chrome and it is on screen
on every in-app page.

- Surface and route: `/preview/lead/dock` at 390.
- Selector: `.nf-tab__link[aria-current] .nf-tab__icon`.
- Reference: **`#0257FD`** (`dock: the active slot ink`), rgb(2 87 253).
- Measured: **`#5DA0FF`**, rgb(93 160 255). Worst channel **91**.
- This is not a sampling artefact. A vertical scan across the 24px glyph reads
  `#5DA0FF` solidly from y=0.20 through y=0.60, so it is the ink's own colour,
  not an average of stroke and ground.
- The direction is "washed toward white": our glyph is a pale sky blue where
  the reference is the saturated brand blue. Red is 91 high and green 73 high
  while blue is within 2.
- Smallest change: the active tab's icon colour wants the brand ink rather than
  a lightened variant of it; `#0257FD` is `--nf-brand-primary`'s neighbourhood,
  so this is a token reference swap on one rule and not a new colour.

### A9. The home search submit is a dark gradient where the reference is a flat lighter blue
- Surface and route: `/preview/f1/home` at 390.
- Selector: `.nf-home__search-go`, `apps/web/src/app/css/home.css:106`.
- Reference: **`#3C7CFC`**, rgb(60 124 252), flat.
- Measured, vertical scan down the drawn 44x44 button:

  | position | ours | per-channel delta from `#3C7CFC` |
  | --- | --- | --- |
  | y=0.05 (top) | `#1D75F0` | -31 / -7 / -12 |
  | y=0.35 | `#0462E5` | -56 / -26 / -23 |
  | y=0.90 (bottom) | `#0044A4` | -60 / -56 / -88 |

- Computed background: `linear-gradient(rgb(12,106,239) 0%, rgb(0,93,224) 50%,
  rgb(0,63,152) 100%)`. Ours is darker than the reference at its BRIGHTEST
  point and is roughly a third as bright at its foot.
- Smallest change: this button takes `.nf-btn--primary`'s three-stop gradient.
  For this control the reference draws a flat plate, so the honest fix is a
  flat `#3C7CFC`-family fill scoped under `.nf-home__search-go` rather than
  retuning the primary button gradient, which governs every CTA in the product.

### A10. The market tile border is the wrong blue, in the opposite direction to the dock
- Selector: `.nf-home__market` border.
- Reference: **`#1A5CA5`**, rgb(26 92 165).
- Measured: **`#01429E`**, rgb(1 66 158). Worst channel **26** (red).
- Ours is a purer, darker blue; the reference's tile edge is lighter and
  slightly desaturated. Note the direction: the dock's edge is now correct at
  `#002E72` against `#012E78`, and the tile's is 26 short. Two surfaces, two
  targets, one shared token between them today. Section 0.

### A11. The home search field's top border is marginally dim
- Selector: `.nf-home__search` (material `.nf-glass--well`).
- Reference: **`#002E7A`**. Measured: **`#002769`**. Worst channel **17**
  (blue: 105 against 122).
- Lowest-ranked colour finding; visible only beside the reference. Listing it
  because the standard is exact, not because anyone would notice it cold.

### What I checked and found COMPLIANT
- **The app header draws no bar and no hairline, and this is correct.**
  `GOVERNING-home-markets-target.png` reads `#000311` at the lockup row against
  `#000312` for the canvas, one point on one channel, which is the reference
  saying there is nothing there. Ours, sampled at the only run of empty ground
  across the header (fx 0.60 to 0.75 at 390, established by scanning the row):
  `#01041D`. Its bottom row: `#01021A` against a reference `#000312`, worst
  channel 8. No bar, no hairline. **Caveat: at rest only.**
  `.nf-app-header[data-scrolled]` adds a canvas-mix fill AND
  `box-shadow: var(--nf-glow-edge)`, which is a lit line under the header. The
  reference has no scrolled state to measure, so I am not calling it a defect,
  but somebody should decide whether a lit edge appears under a header the
  reference draws bare.
- **The dock's fill** `#000D26` against `#000C2E`, worst channel 8.
- **The dock's top border** `#002E72` against `#012E78`, worst channel 6. The
  `#003C94`-was-a-quarter-too-bright fix landed and holds on this build.
- **A resting dock slot** `#000D26` against `#001237`, worst channel 17.
- **The canvas** `#000612` against `#000612`, worst channel **0**.
- **The city chip fill** `#03071C` against `#030C23`, worst channel 7.
- **The second trap is closed on running pages.** The unlayered
  `* { border-color }` that beat every layered rule is now inside
  `@layer base` (`base.css:49`), and I confirmed the effect rather than the
  source: `.nf-ai__chip` and `.nf-home__market` compute their border to
  `oklab(0.568226 -0.0396168 -0.232808 / 0.5)`, the brand edge, not
  `rgba(255,255,255,0.08)`. Elements that still report white 8% (for example
  `.nf-notif__count`) all have `border-width: 0`, so nothing is drawn.

---

## 3. One measurement I could not make honestly

**The market tile's glyph plate.** `compare-surface` reported ours at
`#233E6F` against a reference `#0785FD`, a worst channel of 142, which would
be the largest colour miss in this document. **I am not reporting it as a
finding, because both samples land on the glass OBJECT rather than on the
plate behind it.** A scan across our 28px plate shows the object occupying the
middle (`#0741E5` to `#2B72EC`) with the plate ground visible only at the
edges. A scan of the reference PNG across the same region (x 215 to 300 at
y=505, and x=246 from y=470 to y=545) shows bright blue throughout,
`#0184FB`, `#0683FE`, `#1691FC`, `#85C4FC`, with the tile fill only beginning
around x=290 at `#010F33`. So the named reference point is somewhere on a
bright blue mark and the reference shows no dull ground at all.

What can be said with the pixels in hand, and it is worth acting on: **in the
reference the tile's mark region reads bright blue across its whole ~60px
width; in ours a dull slate ground is visible around the object, measuring
`#1D3250` at x=0.05 to 0.15 and `#13294E` at y=0.85 to 0.95.** Somebody should
add named plate-edge and plate-ground points to `sample-reference.mjs` before
this is tuned, so the comparison is between two known things.

---

## 4. Defects in the measurement harness itself

Three of these would have put false findings in this document, so they matter
more than their size suggests. I fixed the first two in
`scripts/design/compare-surface.mjs` and left the work uncommitted so the lead
owns the promotion; the third and fourth are reported, not fixed.

1. **A percentage radius was being read as a pixel radius, and it invented a
   capsule.** The sweep and the shape checks both did
   `parseFloat(getComputedStyle(el).borderTopLeftRadius)`. `border-radius: 26%`
   computes as the string `"26%"` and `parseFloat` returns `26`, which was then
   divided by the element's short side as though it were pixels. The home
   tile's glyph plate was reported at **ratio 0.93, a capsule**. Its real
   figure is 26 per cent of 28px, which is 7.3px, **ratio 0.26, compliant.** The
   header avatar was likewise reported at 1.25. `--nf-radius-squircle` is 26%
   and `--nf-radius-circle` is 50%, so every icon plate and every avatar in the
   product was measured this way. It errs BOTH directions: a percentage on a
   small element invents a breach, and on a large element it hides one (26% on
   a 200px tile reports 0.13 where the truth is 0.26). Fixed: the ratio now
   resolves percentages against the short side.

2. **The reveal guard's fixed 900ms wait made it the flakiest thing in the
   harness.** Four sweeps of `/` in a row died on "1 on-screen reveal band(s)
   still at opacity < 0.5". I instrumented it: the landing's second Reveal band
   is at opacity 0 at 1s and settled by 3s on this box. The guard is right and
   should stay, because a band at opacity 0 means every sample under it reads
   the ground, but it now polls to a 12s deadline instead of throwing on a page
   that is merely slow. A page that genuinely never reveals still throws.

3. **`hasText` counts screen-reader-only text, so icon-only buttons are
   misclassified as text-bearing capsules.** The sweep's single BREACH on `/`
   was `button "Search" 44x44 ratio 0.50`, and the "Search" is a
   `<span className="sm:sr-only">` inside an otherwise bare icon button
   (`SearchPill.tsx:97`). The element IS a violation, but of the icon-only
   clause, not the text-bearing one, and the distinction decides which fix is
   right. Suggest `hasText` ignore descendants that are visually hidden
   (`.sr-only`, and the `sm:sr-only` responsive variant) and read only text
   that has layout.

4. **`CONTROL_SELECTOR` misses real controls, and one of them is finding A2.**
   `.nf-notif__count`, a confirmed 0.58 capsule, never appeared in any sweep,
   because the list has no badge or count selector. Others the list does not
   reach, each of which I found by static scan and confirm below is absent from
   every sweep result: `.nf-badge` (the StatusPill base), `.nf-inbox-row__count`,
   `.nf-segment__option`, `.nf-detail-tag`, `.nf-landing-tag`,
   `.nf-feedtab`, `.nf-admin-chip`, `.nf-nav__row`, and anchors that are
   controls without carrying `.nf-btn`, namely `.nf-home__market`, `.nf-home__city`,
   `.nf-home__loc`. Suggest adding `a[href]` scoped to elements with a
   background or border, plus `label`, `summary`, `[class*=chip]`,
   `[class*=badge]`, `[class*=count]`, `[class*=tag]`, `[class*=seg]`.
   `SHAPE_EXEMPT` looked right to me; `[class*=switch]` correctly caught
   `.nf-switch` at 0.47 and nothing in the exempt list swallowed a real
   control.

5. **Not a harness defect but worth a line:** the app-shell routes log a CSP
   refusal on a production server: `Refused to load the script
   /_next/static/chunks/11-*.js ... script-src 'self' https: 'nonce-...'
   'strict-dynamic'`. `/` is clean; `/preview/f1/chrome` and the not-found page
   are not. Outside my scope and outside this audit's subject, but if a chunk
   is being blocked in production then something on those routes is not
   hydrating, and that is worth somebody's half hour.

---

## 5. Static leads I could not confirm in a browser

Found by scanning every stylesheet for rules that declare both a height and a
radius and computing the ratio. **These are leads, not findings**, because a static
ratio is still source text, and the whole point of this audit is that source
text does not prove what the browser drew. They are listed so the next sweep
knows where to point a browser.

| ratio | selector | file | why it is only a lead |
| --- | --- | --- | --- |
| 45.4 | `.nf-inbox-row__count` | `threads.css:943` | `--nf-radius-pill` on a 22px box carrying digits. A comment above it argues it is a badge and not a control. It is not in the law's exemption list. I reached no route that renders it. |
| 0.44 | `.nf-segment__option` | `settings-rows.css` | 14px on 32px. Under the line, worth an eye. Not rendered on any route I swept. |
| 0.44 | `.nf-detail-tag` | `catalogue.css` | 14px on 32px. Same. |
| 0.39 | `.nf-story__send` | `social-feed.css` | 14px on 34px. Same. |
| 0.36 | `.nf-landing-tag`, `.nf-landing-float-badge` | `landing.css` | 10px on 28px. Present on `/` but did not surface in the sweep, which is the `CONTROL_SELECTOR` gap above. |

Confirmed by browser and under the line, so no action: `.nf-segmented__item`
on `/preview/e/crypto` at 0.39; `.nf-tab__link` "More" at 0.39 on every route
carrying the dock; `.nf-landing-pill-seg` at 0.35 on `/`; `.nf-site-nav-link`
"AI" at 0.37 at 1536.

---

## 6. Coverage: what I measured and what I did not

**Colour, measured at 390 in dark, against sampled reference pixels:** the
in-app home body (canvas, search field, search submit, market tile fill, market
tile border, city chip fill, city chip border) on `/preview/f1/home`; the app
header (fill and hairline) on `/preview/f1/chrome`; the dock (fill, top border,
active slot ink, resting slot ink) and the canvas beneath it on
`/preview/lead/dock`.

**Shape, swept in a real browser at 390 AND 1536:** `/`, `/search`, `/sign-in`,
`/around`, `/stays`, `/sign-up`, `/preview/f1/home`, `/preview/f1/chrome`,
`/preview/f1/welcome`, `/preview/f1/notifications`, `/preview/f1/assistant`,
`/preview/lead/drawer`, `/preview/f4/public-profile`, `/preview/f4/feed`,
`/preview/f4/profile`, `/preview/f4/settings`, `/preview/f4/post-thread`,
`/preview/f4/thread-empty`, `/preview/f3/listing`, `/preview/f3/search`,
`/preview/f3/checkout`, `/preview/f3/stays`, `/preview/e/wallet`,
`/preview/e/crypto`, `/preview/e/send`, `/preview/f5/admin-queue`,
`/preview/bd/reservations`. Twenty-seven routes, each at two widths.

**What I did NOT reach, and no claim in this document covers it:**

- **Light theme. Not measured at all, at any width, on any surface.** Rule 6
  says a finding that only works in dark is half a finding, so by that standard
  the colour half of this audit is half done. The shape findings hold in both
  themes because no radius in the product is theme-conditional, which I did
  check.
- **Colour at 1536.** Every colour number here is from 390. The reference that
  governs colour for the chrome is a phone image, so this is defensible, but
  the landing hero is a desktop composition and I sampled none of its surfaces
  against `GOVERNING-landing-desktop-hero.png`. The hero's buttons, chips,
  search container, stats tiles and feature tiles are unaudited for colour.
- The three remaining governing images, `GOVERNING-landing-desktop-fullpage.png`,
  `GOVERNING-chat-booking-card.png`, `GOVERNING-flip-mid-turn.png`, were not
  sampled. So the whole messaging register, the flip, and everything below the
  landing fold are uncovered on colour.
- **Routes with no preview harness and a session gate:** `/messages/[id]`,
  `/wallet/*` product routes, `/verification`, the host wizard, the agent
  console beyond `/preview/f5/admin-queue`, `/trips`, `/bookings`,
  `/stories/*`. Their preview equivalents that exist were swept for shape;
  those that do not exist were not reached at all.
- **Motion, glow falloff, glass depth and spacing rhythm.** This audit is shape
  and colour only. `sample-reference.mjs` prints a glow falloff series for both
  references and nobody has yet held ours against it; that is the obvious next
  measurement and it is not in here.
- **Hover, focus and pressed states.** Everything measured is at rest.
- The `/preview/g1` controls gallery deliberately passes `shape="pill"` to
  `Button`, `Chip` and `StatusPill` in eighteen places. Those are live capsules
  in the tree, on a dev-only route that 404s without `VALLO_PREVIEW_HARNESS=1`.
  I did not sweep it, because a gallery demonstrating a retired prop is not the
  product. Somebody should decide whether the retired `shape="pill"` prop and
  its last call sites come out entirely; while the prop exists, the law depends
  on nobody passing it.

---

## 7. Priority order

1. **A6** market tile fill, `#243856` to `#01183A` against a flat `#000C27`: the
   largest block of wrong colour on the first in-app screen.
2. **A8** active dock glyph `#5DA0FF` against `#0257FD`, worst channel 91: the
   brightest ink in the chrome, on every in-app page.
3. **A1** "Verified agent" chip at ratio 0.62 at 1536, a shape-law breach on a
   trust word.
4. **A7** city chip border `#040A26` against `#002051`, worst channel 43, an
   edge that is effectively not drawn.
5. **A2** notification count at ratio 0.58, a shape-law breach written with
   the approved token.
6. **A3** landing search-pill actions, two circles at ratio 0.50 in the hero.
7. **A9** home search submit, darker than the reference at every point.
8. **A10** market tile border, worst channel 26.
9. **A4** footer newsletter submit at ratio 0.50; confirm against the fullpage
   reference first.
10. **A11** search field border, worst channel 17.
11. **A5** assistant result chevron, a 22px circle behind a session.

And before any of them: **section 0.** Four of these eleven are edge or fill
colours on surfaces that share one material today, and the reference paints
those surfaces differently on purpose. Fixing them through
`.nf-glass--tile` or a shared token will close one and open another.
