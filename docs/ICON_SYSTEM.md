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

**One size scale.** `UI_ICON_SIZES` is 16, 20, 24, 28, 32, 40: a 4px grid, and
nothing between the steps.

*Corrected 16 September 2026.* This file said 12, 16, 20, 24, 28, 32 and a
weight of 1.4, and so did `HANDOFF.md` rule 18 and one executable spec. The code
says 16 to 40 at 1.5 and carries the argument for each change beside the
constant: **12 came out** because a stroked glyph drawn on a 24 grid renders a
0.7 CSS pixel line at that size, which a display either drops or smears, and
**40 went in** because empty states and role rows use it. Three documents and a
spec all quoting a superseded number is not a stronger claim than the code, it
is one stale line copied three times. The spec now parses the constant instead
of restating it. `snapUiIconSize` rounds anything else onto the
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
