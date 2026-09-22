# The glow identity, measured

Written 22 September 2026 by Session B (worker "identity") on the founder's
instruction, with `docs/design/references/roles/` GOVERNING-01, 02, 04, 05 and
06 open: "The glowing shiny etc should be across the platform, platform wide.
This is the identity and that should flow, the glowing, the reflection,
shining etc on the platform. All areas, containers, like these images."

**Every number here was read off the render's pixels, not described.** The
tools: `scripts/design/measure-glow.mjs` for the lit buttons (fill row by row,
rim, bloom walked outward), and a pixel sampler with sharp for everything else
(rows and columns across each edge, a corner tracer for radii, top-4-per-cent
pixel means for text colour). `scripts/design/sample-reference.mjs` is
hard-wired to the landing hero and the phone home target, so it was read for
method and not run on these images. The proof that the values reproduce the
look is `docs/design/proofs/session-b/identity/identity-side-by-side.jpg`:
the render on the left, the values below built in plain CSS in the middle,
the paper twin on the right, at 2x.

**Revised the same evening on the lead's review** (second push): the paper
icon tile no longer puts a dark plate behind an object (a pale glass tile and
an ink rendition of the object instead, section 4), and three dark values were
re-sampled and raised because the first proof read under-lit: the card's edge
halo and its top and bottom edge bands (section 2), the icon tile's inner
light (section 4) and the button's lower cyan lift (section 5).

Session B does not edit the tokens. This file is a proposal for Session A to
adopt into `packages/design-tokens/src/tokens.css` (request in
`docs/SESSION_B_SCOPE.md`). Each value names the token it would replace or
extend.

---

## 0. Scale and the ground

The roles renders are 1536 x 1024 with three or four phones side by side, and
each image draws its phone at its own size, so every pixel measure is
converted per image:

| Image | Screen, inner edge to inner edge | CSS px per render px at 390 |
| --- | --- | --- |
| GOVERNING-02 | x 77 to 495 = 418 px | 0.933 |
| GOVERNING-04 | x 45 to 378 = 333 px | 1.171 |

The page ground the glass sits on is not our canvas:

| Where | Measured | Token today |
| --- | --- | --- |
| 02, between cards | `#000D34` rgb(0 13 52) | `--nf-surface-canvas` `#000612`, `--nf-canvas-base` `#010118` |
| 04, beside the info panel | `#000828` rgb(0 8 40) | same |
| 03, far from any control | `#010620` | same |

The renders' page is 20 to 40 levels bluer than our canvas. Every alpha below
was solved against the measured ground, so on our darker canvas the same alpha
reads a little deeper. **Proposed:** leave `--nf-surface-canvas` alone (it
feeds too much) and let the ambient field carry the difference, or, if Session A
wants the page itself to match, `--nf-surface-canvas: #000A2C` (the mean of
the three). This is the one value here I would not adopt blind: look at it.

## 1. The lit ink

Solving `ground + a * (ink - ground)` on the card fill, the tile fill and the
info panel gives one ink for all three: **rgb(0 90 255)**, `#005AFF`. Blue
reaches 255 at every alpha, and green lands at 90 within 3 levels in each case.

| Proposed | Dark | Paper | Relation |
| --- | --- | --- | --- |
| `--nf-lit-ink` | `0 90 255` (an rgb triplet, so it can take any alpha) | `9 75 169` (`--nf-brand-primary` `#094BA9`) | EXTENDS `--nf-glow-ink` (`--nf-electric-300` `#0069FE`, 15 levels greener). Keep `--nf-glow-ink` for blooms; the glass fills use this. |

## 2. The glass card (panel)

Sampled across the "I own the property" card, 02 screen 1, box x 93 to 481,
y 285 to 413 (363 x 120 CSS).

**Fill.** Dark in the middle, lit at both edges, brightest under the top rim.
Alpha of the lit ink, down the card's centre line:

| From the top edge | 0 (under the rim) | 11 px | 22 px | 34 px | middle | 22 px from bottom | 11 px from bottom | bottom edge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Measured blue | 190 | 115 | 98 | 91 | 67 to 80 | 81 | 95 | 136 |
| Alpha of `#005AFF` | 0.68 | 0.31 | 0.23 | 0.19 | 0.08 to 0.14 | 0.14 | 0.21 | 0.41 |

The left edge carries the same inner light over about 9 px (blue 143 at the
border falling to 110 at 9 px); the right edge almost none (93 to 94). The
light comes from the top left, which is `--nf-light-angle` 152deg already.

**The reflection highlight.** Along the top 4 px the fill is brighter in the
middle third than at the corners: blue 185 to 192 at x 264 to 312 against 153
to 160 near the corners. That is the glass reflecting a light above it, and it
is what makes the render's rim read as shine rather than as a line.

**Border.** 1 px, and a different colour on each side, because it is lit
from the top left:

| Side | Measured |
| --- | --- |
| top | `#58F0FE` rgb(88 240 254), with `#1074C9` above and `#0075EA` below it (anti-alias) |
| left | `#02B9EF` |
| bottom | `#048CE1` |
| right | `#0050B4` |

**Radius.** The corner trace runs from x 104 at y 286 to x 93 at y 298:
13 render px, **12 CSS px** on a 120 CSS card (ratio 0.10).

**Outer glow.** Small but visible at rest. Outside the left edge the ground
lifts from blue 52 to 66 within 3 px and is back by 8; above the second card
it lifts about 10 levels over 4 px. The edges read brighter than a 1 px line
because each is a three-row band: above the top rim `#1074C9`, the rim
`#58F0FE`, below it `#0075EA`; at the bottom `#002C91`, the edge `#048CE1`,
then `#0165B7` outside. The first proof drew only the middle row and read dull
beside the render; the snippet now draws all three. A 1 px darker line sits just outside the bottom edge (`#000837`
against ground `#00134E`): a contact shadow.

| Proposed | Dark | Paper | Replaces or extends |
| --- | --- | --- | --- |
| `--nf-glass-lit-fill` | see snippet: the eight-stop gradient plus the reflection radial | `linear-gradient(180deg, rgb(9 75 169 / 0.10) 0, rgb(255 255 255 / 0.96) 12px, #FFFFFF 60%, rgb(9 75 169 / 0.05) 100%)` | REPLACES `--nf-glass-card-fill` for the lit card role (`--nf-container-fill` points at it) |
| `--nf-glass-lit-edge` | `#5CF0FE #0050B4 #048CE1 #02B9EF` (a `border-color` list: top right bottom left) | `#2D6BD6 rgb(9 75 169 / 0.30) rgb(9 75 169 / 0.40) rgb(9 75 169 / 0.45)` | EXTENDS `--nf-container-edge` (`#005DE0` at 70 per cent, one colour on four sides) |
| `--nf-glass-lit-glow` | the six-layer list in the snippet: the rows just inside and outside the top and bottom edges (`#0075EA` below the rim, `#1074C9` above it, `#0165B7` below the bottom edge), a 4 px halo `rgb(0 150 255 / 0.38)` and a 12 px field `rgb(0 90 255 / 0.18)` | `0 1px 2px rgb(9 30 80 / 0.10), 0 6px 16px -8px rgb(9 75 169 / 0.30)` | REPLACES the bloom in `--nf-glow-edge` for resting cards (its `0 0 10px -3px` rung 2 and `0 0 22px -12px` rung 1 are already this quiet; the difference is the per-side edge and the fill, not the glow) |
| `--nf-container-radius` | `12px` measured | same | today `--nf-radius-lg` 18px. The render's card is 6px tighter. |

**The rim is cyan in the render.** `tokens.css` records a deliberate choice
to ship the rim white with the glow ink in it ("THE RIM IS BLUE-WHITE, NOT
WHITE"). The measured top edge is `#58F0FE`, a cyan. I have proposed the
measured value in `--nf-glass-lit-edge` and left `--nf-rim-lit-ink` alone; the
side-by-side shows the cyan edge is what makes the render's card read lit.
That is Session A's call to make with the image open.

## 3. The selected card

02 screen 2, "I own the property" selected, box x 574 to 965, y 287 to 413.

| Part | Measured | Proposed dark | Paper |
| --- | --- | --- | --- |
| Border | `#C7FEFF` at the top, `#BCFAFF` left, `#AEFCFF` right, `#3BFAFF` bottom; a 3 px bright band inside the top (`#63D1FE`, `#C7FEFF`, `#01E7FE`) | `border-color: #C7FEFF` plus `0 0 0 1px rgb(0 200 254 / 0.55)` | `#094BA9` and a 1 px ring of the same |
| Fill lift | blue 151 in the middle against 67 to 80 at rest: alpha 0.49 against 0.08 to 0.14. Under the rim `#01E7FE`, then `#0084FF` at 6 px, `#004DD9` at 13 px | the `--nf-glass-selected-fill` gradient in the snippet | `linear-gradient(180deg, rgb(9 75 169 / 0.16), rgb(9 75 169 / 0.06) 40%, rgb(9 75 169 / 0.10))` |
| Glow | 14 px outside the left edge the ground is still 50 levels up (blue 102 against 52); 20 px above the top, 60 up. A real bloom, unlike the resting card | `0 0 14px 1px rgb(0 110 255 / 0.62), 0 0 30px 4px rgb(0 90 255 / 0.34)` | `0 8px 22px -8px rgb(9 75 169 / 0.45)` |
| Tick badge | a circle 26 render px (24 CSS), fill `#0077F8` to `#0082F9`, rim 1 px `#00A5FF`, the check in `#A4D1FF` | 24 px circle, `#0079F8`, ring `#00A5FF`, check white | `#094BA9` circle, white check |

Replaces `--nf-bloom-lit-soft` for chosen cards (its `0 0 16px rgb(12 106 239 / 0.28)`
is half the measured near glow) and adds `--nf-glass-selected-fill` and
`--nf-glass-selected-edge`. The GOVERNING-06 tick is a cyan disc with a navy
check (`#1BC5FB`-ish); 02, which the founder sent, draws it blue with a white
check, and I propose 02's.

## 4. The icon tile

The "Who you are" tile, 02 screen 3: x 1085 to 1155, y 311 to 381.

| Part | Measured | Proposed | Token |
| --- | --- | --- | --- |
| Size | 70 render px | 65 CSS (a 64 slot) | new `--nf-icon-tile-size: 64px` |
| Radius | corner trace x 1101 at y 311 to x 1085 at y 324: 14 px, 13 CSS, ratio 0.20 | `--nf-radius-md` 14px | reuse, ratio 0.22 |
| Fill | a 5 px grid across the tile: rows under the top (blue 191 to 203) and above the bottom (199 to 211) are lit, the left column brightest of all (`#02BEF8`), the middle darker (blue 133 to 150) EXCEPT round the glyph, where a halo lifts it to 234 to 254. Lit from inside, not a flat square | `radial-gradient(60% 55% at 50% 48%, rgb(0 140 255 / 0.55), transparent 70%)` over `linear-gradient(180deg, rgb(0 100 255 / 0.72) 0, rgb(0 90 255 / 0.46) 18%, rgb(0 90 255 / 0.38) 60%, rgb(0 100 255 / 0.66) 100%)` | new `--nf-icon-tile-fill` |
| Edge | top `#039BEC`, left `#02C2F9` (brightest), bottom `#0070E0` with a lit row above it, right `#0058D2` | `border-color: #05A2F1 #0058D2 #0070E0 #02C2F9` | new `--nf-icon-tile-edge` |
| Inner light and shadow | the left column and the top and bottom rows lit; a soft glow a few px outside; a 1 px darker line below (`#001A6B` against the card's `#001E60`) | `inset 1px 0 0 rgb(2 190 248 / 0.7), inset 0 1px 0 rgb(80 200 255 / 0.55), inset 0 -2px 3px -1px rgb(0 120 240 / 0.6), 0 0 8px rgb(0 120 255 / 0.25), 0 2px 3px rgb(0 0 20 / 0.4)` | new `--nf-icon-tile-shadow` |
| Glyph | a FILLED glass glyph, white at the top to `#5FD6FF`, with its own halo | filled glyph plus `filter: drop-shadow(0 0 4px rgb(80 200 255 / 0.8))`; the roles pack's `-tile` crops ARE this tile, drawn, where the tile carries an object | new `--nf-icon-tile-glyph-glow`; `public/brand/session-b/roles/` |

**On paper the tile is a pale glass tile, never a dark plate.** The first
proof put the dark artwork on a navy plate on a white card, which is the
"dark plates behind icons on a white page" defect `docs/research/LIGHT_MODE_SURVEY.md`
condemns. The paper tile is `linear-gradient(180deg, #F2F7FF 0%, #DCE9FF 100%)`,
edge `#5B95EE` on top and `rgb(9 75 169 / 0.35)` to `0.40` round the rest,
`inset 0 1px 0 #FFFFFF`, `0 4px 10px -6px rgb(9 75 169 / 0.45)`, and the glyph
in `#094BA9`.

**And the object on it is the paper rendition, not the night file.** A night
object keyed for a dark ground goes green and washed on white, and its faint
outer bloom shows as a pale square. Every object in the roles pack therefore
ships a `-day` twin, cut by the same script from the same key: the faint bloom
below alpha 50 is dropped, and each pixel is re-inked on the brand ramp by how
lit it was, from `#9CC2FF` (glass body) to `#06379A` (the brightest edges), so
the object reads as blue glass drawn on paper, with its edges darkest where
the night file is brightest. It is a derived rendition, not commissioned light
artwork, and it says so in `SOURCES.md`. See the right-hand column of the proof.

## 5. The lit primary button

Three buttons measured with `measure-glow.mjs`:

| | 02 Continue as an owner | 03 Continue | 06 Continue |
| --- | --- | --- | --- |
| Box | 577, 771, 387 x 62 | 50, 758, 306 x 52 | 53, 789, 315 x 51 |
| Top stop | `#017DF9` | `#016FFB` | `#078EFB` |
| Floor | `#0153FC` at 61 per cent | `#0042FD` at 62 per cent | `#0164E9` at 98 per cent |
| Bottom stop | `#029AF2` | `#0090F5` | (none, it ends on the floor) |
| Rim, first row | `#039DF1`, L +49 over the fill | `#01A4F6`, L +65 | `#089AF0`, L +27 |
| Border | 1 px: top `#0BEEFC`, sides `#02B3FB`, bottom `#01E5FE` | | |
| Radius | 14 render px, 13 CSS | | |
| Height | 64 render px, 60 CSS | | |
| Bloom above | +48 L at 2 px, +14 at 4, +8 at 8, +5 at 12, gone by 24 | +30, +26, +14, +9, +4 at 24 | none |
| Bloom below | +12 to +14 L steady from 8 to 24 px (the bezel glow takes over at 32) | +14 at 4, +9 at 8, +6 at 16 to 32 | +3 to +4 |

02 and 03 agree and 06 is a flatter drawing, so the proposal is 02's (the
image the founder sent first). Re-sampled after the lead's review, the lower
half is where the light is: down the left third the fill falls from `#0077FC`
to the floor `#0043F9` at 62 per cent and climbs back through `#0058FF` to
`#0288F9` two rows from the bottom and `#00D1FD` on the bottom edge; across
the row 8 px above the bottom, the middle (`#0078FF` at x 800) is 45 green
levels above the ends (`#004AFC` at x 620). That is a cyan lift centred low,
which the radial layer draws:

| Proposed | Dark | Paper | Replaces |
| --- | --- | --- | --- |
| `--nf-gradient-cta` | `radial-gradient(45% 75% at 50% 88%, rgb(0 128 255 / 0.75), transparent)` over `linear-gradient(180deg, #0177FC 0%, #0153FC 30%, #0043F9 62%, #0058FF 88%, #0288F9 97%, #029AF2 100%)` | `linear-gradient(180deg, #0A6BF2 0%, #0040D6 61%, #0060EC 100%)` (today's paper stops, the floor moved to 61) | REPLACES today's `#0074FC 0%, #0042FD 64%, #0069F7 100%`. The measured difference is the bottom: the render lifts to a cyan-blue `#029AF2`, a light reflected up off the page. Ours ends at `#0069F7`. |
| `--nf-cta-edge` (new) | `#0BEEFC #02B3FB #01E5FE #02B3FB` | `#3A86F0 #0A4FC0 #0A4FC0 #0A4FC0` | new; today the button has no drawn border |
| `--nf-rim-primary` | `inset 0 1px 0 #05A9F8` | `inset 0 1px 0 rgb(255 255 255 / 0.45)` | REPLACES the white 30 per cent specular with the measured blue rim |
| `--nf-bloom-lit` | `0 6px 18px -2px rgb(0 90 255 / 0.45), 0 -2px 10px rgb(0 90 255 / 0.20)` | `0 6px 16px -6px rgb(9 75 169 / 0.55)` | today `0 0 24px rgb(12 106 239 / 0.5), 0 0 88px rgb(12 106 239 / 0.14)`. On these renders the light below the button is steady for 24 px and the light above is gone by 12, so the measured bloom is offset downward. Today's token note argues for zero offset from a different render; both readings belong in the ledger and the images decide. |

## 6. Progress segments

02 screen 1, the three segments at y 130 to 140.

| Part | Measured | Proposed |
| --- | --- | --- |
| Segment | 38 x 11 render px = 35 x 10 CSS | `width: 35px; height: 10px` (or `flex: 1` with a 35px basis) |
| Gap | 9 px = 8 CSS | `gap: 8px` |
| Radius | about 3 px | `3px` (ratio 0.3; a shape, not a control, but kept clear of a capsule) |
| Active fill | `#0188FD` body, `#02B1FE` top row, `#0292FD` bottom row | `linear-gradient(180deg, #02B1FE 0, #0188FD 20%, #0186FC 80%, #0292FD 100%)` |
| Active glow | the ground above lifts 14 levels within 3 px | `0 0 4px rgb(0 136 254 / 0.55)` |
| Rest fill | `#01358F` to `#002977`, 1 px edge `#003D95` | `linear-gradient(180deg, #01358F, #002977)`, `inset 0 0 0 1px #003D95` |
| Paper | | active `#094BA9`; rest `rgb(9 75 169 / 0.14)` with `inset 0 0 0 1px rgb(9 75 169 / 0.25)` |

New tokens `--nf-progress-on`, `--nf-progress-on-glow`, `--nf-progress-off`,
`--nf-progress-off-edge`. The README calls these "the progress row of small
filled rectangles"; it is on every wizard in the set.

## 7. The calm info panel and its round glyph

04 screen 1, "Agents are checked harder": x 64 to 361, y 591 to 686.

| Part | Measured | Proposed dark | Paper |
| --- | --- | --- | --- |
| Fill | `#062360`-ish over ground `#000828`: alpha 0.28 of the lit ink, flat (no top gradient) | `rgb(0 90 255 / 0.28)` | `rgb(9 75 169 / 0.06)` |
| Edge | 1 px `#094094` top, `#0D4393` left: a quarter the brightness of a card edge | `1px solid #0D4393`, `inset 0 1px 0 #094094` | `rgb(9 75 169 / 0.30)` |
| Glow | none: the ground is flat to the border | none | none |
| Radius | 8 render px = 9 CSS | `--nf-radius-sm` 10px | same |
| Glyph | a flat disc, 30 render px = 35 CSS, `#2BB1FC`, the "i" in deep navy | 32 to 36 px disc `#2BB1FC`, glyph `#03124A` | `#094BA9` disc, white glyph |

The calm panel is calm BY MEASUREMENT: no bloom, a dim edge, a flat fill. It
is the one container in the set that must not wear the lit recipe. New tokens
`--nf-info-fill`, `--nf-info-edge`, `--nf-info-glyph`, `--nf-info-glyph-ink`
(today the pattern is `--nf-state-info-surface`, `--nf-sky-400` at 15 per
cent, which is sky rather than the lit ink and reads green-blue beside it).
GOVERNING-03 draws the same glyph as a lit glass orb; that one is in the pack
as `info-orb`.

## 8. Text

Top-4-per-cent pixel mean of each text run (the cores of the glyphs, not the
anti-aliasing):

| Role | Where | Measured | Token today | Proposed |
| --- | --- | --- | --- | --- |
| Heading | 02 "Add a workspace", card titles | `#FFFFFF`, `#FEFFFF` | `--nf-content-primary` `#FFFFFF` | keep |
| Body | 04 subtitle, info panel, field labels | `#C4D9F4`, `#BDD7F6`, `#CCE4F7` | `--nf-content-secondary` `#D5DEFF` | `#C4D9F4`: the render's body is cooler and bluer |
| Card body | 02 "List it yourself" | `#A4D7F9` | `--nf-content-subtle` `#B4C0E0` | `#A4D7F9` |
| Muted | 02 "It should not take long" | `#98CEF9` | `--nf-content-muted` `#8E9CC4` | `#98CEF9`: the render's muted text is blue, not grey |
| Accent | 02 "About five minutes", "supplier" in the lead | `#35EEFD`, `#80F1FD` | `--nf-cyan-400` `#00C8FF` | `#35EEFD` as `--nf-content-accent` (new) |
| Accent heading | 02 "What we will ask you for" | `#CAF9FD` (cyan-white) | none | `--nf-content-accent-strong: #CAF9FD` |

Contrast on the measured card middle (`#00154A`), WCAG relative luminance:
body `#C4D9F4` 12.1:1, card body `#A4D7F9` 11.3:1, muted `#98CEF9` 10.4:1,
accent `#35EEFD` 12.3:1. On paper these do not move
across: paper keeps `#16181D`, `#41464F`, `#676E76` and `--nf-brand-quiet`
`#094DAF`, which the light survey already measured.

---

## 9. Ready to paste

Dark first, then the paper answers. Names are the proposed tokens above; where
an existing token is replaced the comment says so.

```css
:root {
  /* the lit ink, measured on card, tile and info panel alike */
  --nf-lit-ink: 0 90 255;

  /* THE GLASS CARD. Replaces --nf-glass-card-fill for the lit card role. */
  --nf-container-radius: 12px;
  --nf-glass-lit-fill:
    radial-gradient(55% 16px at 50% 0, rgb(120 235 255 / 0.28), transparent),
    linear-gradient(180deg,
      rgb(var(--nf-lit-ink) / 0.80) 0px,
      rgb(var(--nf-lit-ink) / 0.52) 4px,
      rgb(var(--nf-lit-ink) / 0.31) 11px,
      rgb(var(--nf-lit-ink) / 0.19) 34px,
      rgb(var(--nf-lit-ink) / 0.10) 50%,
      rgb(var(--nf-lit-ink) / 0.14) calc(100% - 22px),
      rgb(var(--nf-lit-ink) / 0.24) calc(100% - 9px),
      rgb(var(--nf-lit-ink) / 0.50) 100%);
  --nf-glass-lit-edge: #5CF0FE #0050B4 #048CE1 #02B9EF; /* border-color: top right bottom left */
  --nf-glass-lit-glow:
    inset 0 1px 0 rgb(0 117 234 / 0.9),
    inset 1px 0 0 rgb(0 92 189 / 0.8),
    0 -1px 0 rgb(16 116 201 / 0.8),
    0 1px 0 rgb(1 101 183 / 0.8),
    0 0 4px rgb(0 150 255 / 0.38),
    0 0 12px rgb(var(--nf-lit-ink) / 0.18);

  /* SELECTED */
  --nf-glass-selected-fill:
    linear-gradient(180deg,
      rgb(0 230 254 / 0.95) 0px,
      rgb(0 132 255 / 0.95) 5px,
      rgb(0 80 255 / 0.80) 12px,
      rgb(0 80 255 / 0.50) 40%,
      rgb(0 80 255 / 0.62) calc(100% - 10px),
      rgb(0 120 255 / 0.95) 100%);
  --nf-glass-selected-edge: #C7FEFF;
  --nf-glass-selected-glow:
    0 0 0 1px rgb(0 200 254 / 0.55),
    0 0 14px 1px rgb(0 110 255 / 0.62),
    0 0 30px 4px rgb(var(--nf-lit-ink) / 0.34);
  --nf-tick-fill: #0079F8;
  --nf-tick-ring: #00A5FF;

  /* ICON TILE */
  --nf-icon-tile-size: 64px;
  --nf-icon-tile-fill:
    radial-gradient(60% 55% at 50% 48%, rgb(0 140 255 / 0.55), transparent 70%),
    linear-gradient(180deg, rgb(0 100 255 / 0.72) 0, rgb(0 90 255 / 0.46) 18%, rgb(0 90 255 / 0.38) 60%, rgb(0 100 255 / 0.66) 100%);
  --nf-icon-tile-edge: #05A2F1 #0058D2 #0070E0 #02C2F9;
  --nf-icon-tile-shadow:
    inset 1px 0 0 rgb(2 190 248 / 0.7),
    inset 0 1px 0 rgb(80 200 255 / 0.55),
    inset 0 -2px 3px -1px rgb(0 120 240 / 0.6),
    0 0 8px rgb(0 120 255 / 0.25),
    0 2px 3px rgb(0 0 20 / 0.4);
  --nf-icon-tile-glyph-glow: drop-shadow(0 0 4px rgb(80 200 255 / 0.8));

  /* LIT PRIMARY. Replaces --nf-gradient-cta, --nf-rim-primary, --nf-bloom-lit. */
  --nf-gradient-cta:
    radial-gradient(45% 75% at 50% 88%, rgb(0 128 255 / 0.75), transparent),
    linear-gradient(180deg, #0177FC 0%, #0153FC 30%, #0043F9 62%, #0058FF 88%, #0288F9 97%, #029AF2 100%);
  --nf-cta-edge: #0BEEFC #02B3FB #01E5FE #02B3FB;
  --nf-rim-primary: inset 0 1px 0 #05A9F8;
  --nf-bloom-lit: 0 6px 18px -2px rgb(var(--nf-lit-ink) / 0.45), 0 -2px 10px rgb(var(--nf-lit-ink) / 0.20);

  /* PROGRESS */
  --nf-progress-on: linear-gradient(180deg, #02B1FE 0, #0188FD 20%, #0186FC 80%, #0292FD 100%);
  --nf-progress-on-glow: 0 0 4px rgb(0 136 254 / 0.55);
  --nf-progress-off: linear-gradient(180deg, #01358F, #002977);
  --nf-progress-off-edge: #003D95;

  /* CALM INFO PANEL */
  --nf-info-fill: rgb(var(--nf-lit-ink) / 0.28);
  --nf-info-edge: #0D4393;
  --nf-info-rim: inset 0 1px 0 #094094;
  --nf-info-glyph: #2BB1FC;
  --nf-info-glyph-ink: #03124A;

  /* TEXT */
  --nf-content-secondary: #C4D9F4;
  --nf-content-subtle: #A4D7F9;
  --nf-content-muted: #98CEF9;
  --nf-content-accent: #35EEFD;
  --nf-content-accent-strong: #CAF9FD;
}

:root[data-theme="light"] {
  --nf-lit-ink: 9 75 169;
  --nf-glass-lit-fill: linear-gradient(180deg, rgb(9 75 169 / 0.10) 0, rgb(255 255 255 / 0.96) 12px, #FFFFFF 60%, rgb(9 75 169 / 0.05) 100%);
  --nf-glass-lit-edge: #2D6BD6 rgb(9 75 169 / 0.30) rgb(9 75 169 / 0.40) rgb(9 75 169 / 0.45);
  --nf-glass-lit-glow: 0 1px 2px rgb(9 30 80 / 0.10), 0 6px 16px -8px rgb(9 75 169 / 0.30);
  --nf-glass-selected-fill: linear-gradient(180deg, rgb(9 75 169 / 0.16), rgb(9 75 169 / 0.06) 40%, rgb(9 75 169 / 0.10));
  --nf-glass-selected-edge: #094BA9;
  --nf-glass-selected-glow: 0 0 0 1px #094BA9, 0 8px 22px -8px rgb(9 75 169 / 0.45);
  --nf-tick-fill: #094BA9;
  --nf-tick-ring: transparent;
  /* a PALE glass tile on paper, never a dark plate; objects on it use their -day rendition */
  --nf-icon-tile-fill: linear-gradient(180deg, #F2F7FF 0%, #DCE9FF 100%);
  --nf-icon-tile-edge: #5B95EE rgb(9 75 169 / 0.35) rgb(9 75 169 / 0.40) rgb(9 75 169 / 0.35);
  --nf-icon-tile-shadow: inset 0 1px 0 #FFFFFF, 0 4px 10px -6px rgb(9 75 169 / 0.45);
  --nf-icon-tile-glyph-glow: none;
  --nf-gradient-cta: linear-gradient(180deg, #0A6BF2 0%, #0040D6 61%, #0060EC 100%);
  --nf-cta-edge: #3A86F0 #0A4FC0 #0A4FC0 #0A4FC0;
  --nf-rim-primary: inset 0 1px 0 rgb(255 255 255 / 0.45);
  --nf-bloom-lit: 0 6px 16px -6px rgb(9 75 169 / 0.55);
  --nf-progress-on: #094BA9;
  --nf-progress-on-glow: none;
  --nf-progress-off: rgb(9 75 169 / 0.14);
  --nf-progress-off-edge: rgb(9 75 169 / 0.25);
  --nf-info-fill: rgb(9 75 169 / 0.06);
  --nf-info-edge: rgb(9 75 169 / 0.30);
  --nf-info-rim: none;
  --nf-info-glyph: #094BA9;
  --nf-info-glyph-ink: #FFFFFF;
  /* text keeps the paper values already in tokens.css */
}

/* How the parts compose. Classes are illustrative; Session A owns the names. */
.lit-card     { border-radius: var(--nf-container-radius); border: 1px solid; border-color: var(--nf-glass-lit-edge);
                background: var(--nf-glass-lit-fill); box-shadow: var(--nf-glass-lit-glow); }
.lit-card[aria-checked="true"], .lit-card[aria-pressed="true"]
              { border-color: var(--nf-glass-selected-edge); background: var(--nf-glass-selected-fill);
                box-shadow: var(--nf-glass-selected-glow); }
.icon-tile    { inline-size: var(--nf-icon-tile-size); aspect-ratio: 1; border-radius: var(--nf-radius-md);
                border: 1px solid; border-color: var(--nf-icon-tile-edge); background: var(--nf-icon-tile-fill);
                box-shadow: var(--nf-icon-tile-shadow); }
.icon-tile > svg { filter: var(--nf-icon-tile-glyph-glow); }  /* glyph ink: #BFF6FF at night, #094BA9 on paper */
.lit-button   { border-radius: var(--nf-radius-control); border: 1px solid; border-color: var(--nf-cta-edge);
                background: var(--nf-gradient-cta); box-shadow: var(--nf-rim-primary), var(--nf-bloom-lit); }
.progress-seg { block-size: 10px; border-radius: 3px; background: var(--nf-progress-off);
                box-shadow: inset 0 0 0 1px var(--nf-progress-off-edge); }
.progress-seg[data-done] { background: var(--nf-progress-on); box-shadow: var(--nf-progress-on-glow); }
.info-panel   { border-radius: var(--nf-radius-sm); border: 1px solid var(--nf-info-edge);
                background: var(--nf-info-fill); box-shadow: var(--nf-info-rim); }
```

## 10. What the proof shows, and what it does not

`docs/design/proofs/session-b/identity/identity-side-by-side.jpg` puts each
render element beside the same element built from the snippet above (a
throwaway static page, not committed, rendered in headless Chromium at 2x).

Matches by eye and by the numbers: the card's dark middle and lit edges, the
per-side border, the selected card's bright border and lift, the button's
three stops and cyan edge, the tile, the calm panel's flatness, the progress
row.

Still short of the render, and why:
- **The selected card's bloom** in the render reaches further into the gutter
  than 30 px; the phone gutter itself is lit by it, and a gutter is not
  available on every surface. I stopped at 30 px so a chosen card in a grid
  does not light its neighbours.
- **Type.** The harness uses the system sans; the product's Poppins and Inter
  are not part of this proposal.
- **The icon tile's own specular** (a diagonal sheen across the glass) is in
  the render's pixels, not in the CSS, and the render's glyph is a drawn glass
  person where the harness has a filled SVG. Where the tile carries an object, the
  cropped `-tile` objects in `apps/web/public/brand/session-b/roles/` carry it.
- **The ground.** The harness paints the render's `#000D34`. On our canvas
  `#000612` every alpha reads slightly deeper (section 0).

## 11. Where it goes

Every container on the platform, per the founder: every card is the lit card,
every chosen card is the selected card, every object slot is the icon tile,
every primary is the lit button, every wizard's step row is the progress row,
every explanation is the calm panel. The pack in
`apps/web/public/brand/session-b/roles/` (113 objects and one stage, with
`SOURCES.md`) supplies the icons those containers hold. Session B's own
surfaces adopt this recipe in their own stylesheets; the token layer is
Session A's.
