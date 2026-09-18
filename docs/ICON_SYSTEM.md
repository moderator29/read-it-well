# Vallo Icon System

**Two tiers, each with one job, plus one landing-only mark set that is not a
tier. Never mix them.**

Corrected 2026-08-09. This file said three tiers, which disagreed with ADR-011,
and it carried a section describing `Icon3D` as retired-but-kept-in-the-repository
when those files do not exist at all. It also said 33 checked-in UI vectors when
there are 40, and told the reader to wrap objects in a `.nf-icon-chip` class that
is defined nowhere in the codebase.

## Tier 1: BrandIcon, the commissioned 3D pack (content)

`apps/web/src/design-system/icons/BrandIcon.tsx`, artwork in
`apps/web/public/brand/icons/*.png`.

**THE SWAP LANDED, 16 September 2026.** `BrandIcon` draws from
`apps/web/public/brand/glass/`: 103 glass objects in the logo's own language,
23 of them with a light twin that swaps in automatically on paper, and 12 hero
scenes under `glass/hero/` that are scenes, never icons, and are painted with
`next/image` at their own call sites rather than through this component.

**What the swap deleted, and each deletion is a rule now:**

- `mix-blend-mode: multiply` is gone. The clay artwork was opaque RGB on white
  and multiply removed the white at paint time; the glass artwork carries a
  real alpha channel. Never reintroduce a blend mode to rescue artwork: fix
  the artwork.
- The near-white ground plate on dark is gone, and **its absence is the
  standing acceptance test**: if an object ever needs a plate behind it to be
  visible on the night canvas, the cutout is wrong.
- In daylight the single objects sit on one navy chip through one token,
  `--nf-icon-ground`, and the transaction marks use their light twin instead.
- Seven clay names live on as `LEGACY_ALIASES` in `BrandIcon.tsx`, resolving
  to their glass substitutes so 36 call sites keep working. The renames belong
  to the files' owners. Two objects still need commissioning: `homes-sparkle`
  and `house-sparkle` are standing in as `cluster-home` and `modern-house`.

The clay set remains on disk at `brand/icons/` as an archive and nothing draws
it. The inventory below is the OLD inventory, kept for the historical name
mapping at the bottom of this file; `BRAND_ICONS` in `BrandIcon.tsx` is
generated from the glass directory and is the authority now.

White ceramic objects with brand blue accents, each on a soft plinth, lit
from the upper left, sliced from the four supplied pack sheets. This is the
platform's signature iconography: features, categories, facts, empty states,
settings rows, wallet kinds, showcase panels. 57 objects:

bell-alert, bell-badge, booking-instant, bot, bot-chat, bot-home,
calendar-check, calendar-clock, calendar-home, calendar-time, camera,
card-lock, chart-growth, chat, chat-duo, cleaning, clock-check, doc-lock,
doc-shield, gift, gift-star, globe-pin, heart-home, home-cam, home-check,
home-refresh, home-search, home-swap, homes-sparkle, hotel-star,
house-sparkle, key-cycle, keys-home, keys-tag, listing-review,
listing-search, luggage-check, luggage-plane, map-route, map-spot,
naira-hand, phone-home, pin-map, report-stats, reviews, search-home,
shield-check, shield-home, shield-lock, support-chat, support-shield,
tag-hash, tag-percent, tour-360, user-check, user-verified, wallet-secure.

Usage: `<BrandIcon name="shield-check" size={44} />` or `fill` inside a sized
wrapper. Props are `name`, `size`, `fill`, `label`, `priority` and `className`.
**There is no `ramp` prop.** The artwork is rendered on white: in daylight it
composites with multiply so the ground disappears on paper, at night it is
masked and lifted so the object reads on the dark canvas.

**That mechanism is why `--nf-icon-ground` exists, and it is the single thing the
glass set changes most.** Multiply against the night canvas returns the night
canvas, so an untiled object with nothing light behind it is not understated, it
is invisible, and the flat plate is what rescues it. The glass artwork carries
its own alpha, so on the day of the swap the blend mode and the dark plate both
become unnecessary. **Deleting `--nf-icon-ground` on dark is the acceptance test
for the replacement**: if an object still needs a plate, the cutout is wrong.

**Do not reach for `.nf-icon-chip`.** This file used to tell you to wrap an
object in that class when it needed its own tile. The class is defined in no
stylesheet in the repository and never was. A tinted tile behind a glyph came
from the retired reference brief, not from this system: see
`RECOMMENDATIONS.md` D-2 and D-5.

**The percentage padding trap.** Percentage padding resolves against the
containing block, not the element. A 22px icon tile inside a 330px button got
about 30px of padding per side and rendered a 0x0 image, so every non-`fill`
`BrandIcon` was an empty white chip and nothing caught it but a screenshot.

Sizing convention: 20 to 24px inline in dense rows, 40 to 48px in feature
cards and list rows, 64 to 96px in showcase and empty states, and larger only
in hero or story panels.

<!-- render-crops:start -->
## Tier 1, continued: the 41 objects cropped from the reference renders

**Added 18 September 2026 by G2, on the ruling in `docs/DESIGN_DIRECTION.md`
section 3.5:** where a governing render uses a glass object the ten sheets do
not carry, crop it from the render, key it through the existing pipeline, file
it through the manifest under a lowercase-hyphen name, and use it, provided it
carries no baked text. `BrandIcon` now lists 144 objects: the 103 sheet objects
and these 41.

**Where they live in the pipeline.** `RENDER_CROPS` in `scripts/icon-manifest.mjs`
is the filing: each entry names the render under `docs/design/references/`,
the box in that render's own pixels, the object's longer edge at source and what
it is. `slice-icon-sheets.mjs` cuts the declared boxes into the pseudo-sheet
`renders`, `cut-icon-ground.mjs` keys them, and `name-icon-objects.mjs`
emits them at the pack's 256 edge like every other object. The three commands in
`assets/README.md` rebuild them with the rest; nothing was dropped into
`public/brand/glass` by hand.

**How the key differs, and why.** A render's ground is not black. Under the
wallet it is around rgb(0, 44, 128), under a settings tile rgb(0, 13, 52), and
it is a gradient, so the sheet key would return the panel as a square wash with
the object inside it. The cutter therefore fits a plane per channel to a thin
ring at the edge of each box (twice: the second fit drops ring pixels the first
fit shows to be object), subtracts it, and uses the result for ONE thing: how
much of each pixel's brightest channel is object rather than ground. The render
pixel is scaled by that fraction, all three channels by the same number, and
keyed exactly as a sheet object is. The hue is the render's hue by
construction. The first cut subtracted channel by channel instead and came back
green and yellow, because the render's blue channel is already clipped at 255
wherever an object is lit; that account is in the cutter's header, next to the
one about luminance.

**They are not all one size, and the size is recorded.** The wallet and the
hotel are around 190 and 250 pixels at source and lose nothing at 256. The
profile tiles are 84, the settings tiles 56, the landing rings and chips 36 to
48, and those are upsampled to 256 and read soft at 96 on a 3x display. The
`native` column below is the honest number: a `-ring` or a `-chip` belongs in
a 24 to 48 slot, the tiles in 32 to 64, the wallet and the hotel anywhere up to
an empty state.

**Light theme.** None of the 41 has a light twin, because no render draws them
on white and, as section 3 of `docs/BRAND_MARKS.md` established, no filter
makes one. They take the same recipe as the other 80 untwinned objects: on
paper `BrandIcon` paints the navy chip `--nf-icon-ground` behind them, and the
tile-form objects (which arrive on their own glass tile, like the transaction
marks) read as a tile on the chip. The preview at `/preview/g2` shows every
one at 32, 48 and 96 on canvas, card, elevated and the glass card, in both
themes; the proofs are `docs/design/proofs/g2/objects-390-dark.png` and
`objects-390-light.png`.

**What was looked at and left out, and why.** The HOTEL-lettered building on
`2A49E2F7` (baked text, never cropped). The onboarding coin on the same render
(its motion rings run under both flanking cards, so no clean box exists; the
drawer's coin is the `flip-coin`). The Verve card on `7F96BE6C` (a real brand
mark with lettering). The settings shield (a smaller drawing of
`shield-check-tile`). The landing grid's Buy ring (the same house as the
Properties stat, which is larger and is `home-ring`). The wallet render's
fourth quick action, a person (the same glyph as `person-card`). The two
fullpage chips that carry the Vallo bars mark (that is the logo, which has its
own assets, not an object). The Verify, Experience and Manage rings of the
How-it-works row (35 pixels at source on a 780-wide render; Verify duplicates
`shield-ring`, the other two are a blur at that size). Nothing warm-tinted was
found among the candidates; the gold stars on the stays render are in the
listing cards, not in any object.

| Name | Render | Box (left, top, size) | Native px | What it is |
| --- | --- | --- | ---: | --- |
| `wallet-naira` | `6AF37222` | 614, 226, 182x180 | 186 | The 3D glass wallet with the naira sign, from the balance card |
| `send-plane-tile` | `6AF37222` | 209, 606, 64x64 | 52 | Paper plane on a rounded glass tile, the Send Money quick action |
| `phone-tile` | `6AF37222` | 371, 606, 64x64 | 52 | Handset on a rounded glass tile, the airtime quick action |
| `bill-tile` | `6AF37222` | 527, 606, 64x64 | 52 | Lined document on a rounded glass tile, the bills quick action |
| `stays-hotel-palms` | `FD3DFE84` | 568, 198, 252x180 | 252 | The hotel block between two palms on a glass slab, the Stays side's mark |
| `hotel-bed` | `FD3DFE84` | 241, 481, 54x54 | 42 | Double bed glyph, from the lit Hotels category tile (glyph only, above its caption) |
| `apartment-block` | `FD3DFE84` | 366, 479, 56x56 | 40 | Apartment block glyph, from the Apartments category tile |
| `palm-tree` | `FD3DFE84` | 489, 479, 56x56 | 38 | Palm glyph, from the Resorts category tile |
| `guest-house` | `FD3DFE84` | 612, 479, 56x56 | 38 | House with door glyph, from the Guest Houses category tile |
| `serviced-block` | `FD3DFE84` | 736, 479, 56x56 | 40 | Tower with wings glyph, from the Serviced Apartments category tile |
| `flip-coin` | `BCD39CA8` | 222, 1132, 98x98 | 86 | The two-faced glass coin with the bars mark, from the drawer's Flip Coin card |
| `calendar-grid` | `50E032EA` | 231, 657, 96x96 | 84 | Calendar with a six-dot grid on a glass tile, the My Bookings row |
| `bookmark-ribbon` | `50E032EA` | 231, 781, 96x96 | 84 | Bookmark ribbon on a glass tile, the Saved row |
| `wallet-tile` | `50E032EA` | 231, 906, 96x96 | 84 | Outline wallet on a glass tile, the Wallet row |
| `shield-check-tile` | `50E032EA` | 231, 1031, 96x96 | 84 | Shield with a tick on a glass tile, the Inspections row |
| `role-switch-tile` | `50E032EA` | 229, 1174, 84x84 | 70 | Person with a swap arrow on a glass tile, the Switch role row |
| `person-card` | `7F96BE6C` | 226, 433, 68x68 | 56 | Person glyph on a glass tile, the Account Information row |
| `bell-tile` | `7F96BE6C` | 226, 513, 68x68 | 56 | Bell glyph on a glass tile, the Notifications row |
| `palette` | `7F96BE6C` | 226, 672, 68x68 | 56 | Painter's palette on a glass tile, the Appearance row |
| `globe` | `7F96BE6C` | 226, 752, 68x68 | 56 | Globe on a glass tile, the Language row |
| `headset` | `7F96BE6C` | 226, 832, 68x68 | 56 | Headset on a glass tile, the Help and Support row |
| `card-tile` | `7F96BE6C` | 226, 926, 68x68 | 56 | Payment card on a glass tile, the Payment Methods header |
| `bank-column` | `7F96BE6C` | 241, 1126, 64x64 | 52 | Bank portico on a glass tile, the bank account row |
| `home-ring` | `GOVERNING-landing-desktop-hero` | 496, 689, 60x60 | 46 | House outline in a glowing ring, the Properties stat (also the grid's Buy) |
| `people-ring` | `GOVERNING-landing-desktop-hero` | 711, 689, 60x60 | 46 | Two people in a glowing ring, the Agents stat |
| `city-ring` | `GOVERNING-landing-desktop-hero` | 929, 689, 60x60 | 46 | Three towers in a glowing ring, the Cities stat |
| `shield-ring` | `GOVERNING-landing-desktop-hero` | 1169, 689, 60x60 | 46 | Shield with a tick in a glowing ring, the Verified stat |
| `key-ring` | `GOVERNING-landing-desktop-hero` | 721, 811, 48x48 | 36 | Key in a glowing ring, the grid's Rent |
| `bed-ring` | `GOVERNING-landing-desktop-hero` | 890, 811, 48x48 | 36 | Bed in a glowing ring, the grid's Stays |
| `chart-ring` | `GOVERNING-landing-desktop-hero` | 1061, 811, 48x48 | 36 | Rising line chart in a glowing ring, the grid's Invest |
| `brain-ring` | `GOVERNING-landing-desktop-hero` | 1235, 811, 48x48 | 36 | Brain in a glowing ring, the grid's AI Assistant |
| `wallet-ring` | `GOVERNING-landing-desktop-hero` | 550, 911, 48x48 | 36 | Wallet in a glowing ring, the grid's Wallet |
| `calendar-ring` | `GOVERNING-landing-desktop-hero` | 721, 911, 48x48 | 36 | Calendar with a tick in a glowing ring, the grid's Bookings |
| `chat-ring` | `GOVERNING-landing-desktop-hero` | 890, 911, 48x48 | 36 | Speech bubble in a glowing ring, the grid's Messaging |
| `inspect-ring` | `GOVERNING-landing-desktop-hero` | 1061, 911, 48x48 | 36 | Shield-framed lens in a glowing ring, the grid's Inspections |
| `manage-ring` | `GOVERNING-landing-desktop-hero` | 1240, 911, 48x48 | 36 | Gear cluster in a glowing ring, the grid's Management |
| `brain-chip` | `GOVERNING-landing-desktop-fullpage` | 193, 473, 64x60 | 40 | Brain on a soft glass chip, the AI Powered feature |
| `wallet-chip` | `GOVERNING-landing-desktop-fullpage` | 308, 473, 64x60 | 40 | Wallet on a soft glass chip, the Secure Wallet feature |
| `globe-chip` | `GOVERNING-landing-desktop-fullpage` | 419, 473, 64x60 | 40 | Globe on a soft glass chip, the One Platform feature |
| `building-chip` | `GOVERNING-landing-desktop-fullpage` | 641, 473, 64x60 | 40 | Building on a soft glass chip, the Property Management feature |
| `search-ring` | `GOVERNING-landing-desktop-fullpage` | 38, 1033, 48x48 | 36 | Magnifier in a glowing ring, the Discover step |
<!-- render-crops:end -->

## Tier 2: UiIcon, stroked glyphs (navigation and controls)

`apps/web/src/design-system/icons/UiIcon.tsx`. A 24 grid, SF-quality stroked
set. Used for ALL navigation (rails, tab bar, headers, chips) and small
controls. Never replaced by the 3D pack: navigation must stay flat and fast.

**One weight.** `UI_ICON_STROKE_PX` is 1.5 RENDERED CSS pixels, and the
`stroke-width` attribute is computed from the size rather than passed in.
There is no `strokeWidth` prop. A fixed number on the 24 grid renders thinner
the smaller the glyph gets, which is why thirty-two call sites had each
hand-tuned a value between 1.5 and 2.6 and the platform ended up with a dozen
weights. State is carried by colour and by the filled pill behind an active
tab, never by a heavier line.

**One size scale.** `UI_ICON_SIZES` is 12, 16, 20, 24, 28, 32, 40: a 4px grid
from 12 to 32, plus 40 for display, and nothing between the steps.

*Corrected 16 September 2026, and corrected again on the 17th. The second
correction is the one worth reading, because the first one was wrong and being
consistent was what hid it.*

On the 16th this file said 12, 16, 20, 24, 28, 32 at a weight of 1.4, and so did
`HANDOFF.md` rule 18 and one executable spec, while the code said 16 to 40 at
1.5. Three documents quoting a superseded number is not a stronger claim than
the code, so the prose was corrected to match. That reasoning was right and the
result was wrong, because **the argument the code was relying on had already
been retired two hundred lines below the decision.**

The argument was that a stroked glyph drawn on a 24 grid renders a 0.7 CSS
pixel line at 12px, which a display either drops or smears. That is true of a
FIXED `strokeWidth`: a constant 1.8 renders 1.8 at 24 and 0.9 at 12. It is the
very thing the weight fix addressed. `stroke-width` is computed per size now,
`(UI_ICON_STROKE_PX * 24) / edge`, which at 12 is 3 grid units, and 3 units on a
glyph drawn at half the grid renders at **1.5 CSS pixels, not 0.7**. The
objection was dead before the ban was written down.

And 12 is the SECOND MOST REQUESTED SIZE IN THE PRODUCT. Counted across `src`,
197 call sites pass an explicit number, and 12 appears at 35 of them, behind
only 16 at 92. Thirty-five call sites were off-scale by decree while rendering
exactly what they should. Adding the step takes on-scale coverage from 137 of
197 to 172.

**The lesson is about the shape of the mistake, not about icons.** A prose line
and a constant disagreed; the prose was corrected to match the constant; the
two then said the same thing and the agreement read as confirmation. Two things
saying the same wrong thing is harder to spot than one of them saying it alone,
because the check most people run is "do these agree" rather than "is the
argument still true". When correcting a document to match code, read the code's
own reasoning and check it has not been superseded somewhere else in its file.

**40 went in** because empty states and role rows use it, and that part was
right both times. The spec parses the constant instead of restating it. `snapUiIconSize` rounds anything else onto the
nearest one, so a size cannot drift off the grid whatever a caller passes.
BrandIcon sits on an 8px grid from 24 up; below 24 the plinth in the artwork
collapses into a coloured square.

**Vector sources are checked in.** `assets/icons/ui/*.svg`, **40 files**, one per
glyph, generated from this component by `node scripts/build-icon-vectors.mjs` and
verified by `--check`, which exits non-zero if the two copies have drifted. Edit
the TSX and re-run the script, never the other way round. Nobody has to trace a
glyph from a screenshot. See `assets/icons/README.md` for where the artwork
lives.

## Deleted: TrustIcon

Six marks (globe, shield, ai-chip, africa, app-store, play-store) that existed
for one consumer, the landing trust strip. The strip was deleted in the
September 2026 landing rebuild, its claims having been the most template-shaped
copy on the page, and the component went with it: a mark set with zero
consumers is where retired branding hides from the next sweep. ADR-011 stands
at two tiers, now with nothing beside them.

## Deleted: Icon3D

`Icon3D.tsx`, `glyphs.tsx` and the `Icon` wrapper were the previous content tier,
hand-built SVG 3D objects on gradient tiles with per-instance paint servers.
ADR-003 chose them; ADR-010 reversed that and they were **deleted**.

This section used to say they were kept in the repository, unused, as a fallback,
and asked the reader not to delete them without the owner's word. That has been
wrong for some time. `apps/web/src/design-system/icons/` contains exactly three
files. Never import `Icon3D`; the standing pre-commit scan greps for it and must
return empty.

Historical name mapping, old vector name to pack object, kept because old
screenshots and old comments still use the left-hand names:
help to support-chat, apartment to homes-sparkle, wallet to wallet-secure,
secure to shield-lock, star to reviews, search to home-search, ai-assistant
to bot-home, verified to shield-check, profile to user-check, location to
pin-map, booking to calendar-check, map to map-route, hotel to hotel-star,
home to house-sparkle, experience to luggage-check, favorites to heart-home,
notification to bell-alert, language to globe-pin, settings to doc-shield.
