# Icon sources

Where every mark on the platform comes from, so nobody ever redraws one from a
screenshot. Three tiers, three provenances. `docs/ICON_SYSTEM.md` says what each
tier is FOR; this file says where the artwork LIVES.

## Tier 1: BrandIcon, the commissioned 3D pack

- **Ships as:** `apps/web/public/brand/icons/*.png`, 57 objects.
- **Source:** `assets/icon-pack/raw/**` (198 originals across four category
  sheets) and `assets/source-sheets/*.png`, with `assets/icon-pack/manifest.json`
  recording each slot's name and its dimensions in the sheet.
- **Rebuilt by:** `scripts/extract-brand-assets.py`, then
  `scripts/build-icon-assets.py`.
- **There is no vector source, and there will not be one.** These are lit
  ceramic renders, not curves. The raw sheet crops are the masters. If a new
  object is needed it is commissioned into the same sheet; it is not traced.

## Tier 2: UiIcon, the stroked set

- **Ships as:** JSX path data in
  `apps/web/src/design-system/icons/UiIcon.tsx`, which is the single source of
  truth.
- **Vector source:** `assets/icons/ui/*.svg`, 33 files, one per glyph, on the
  same 24 grid at the platform's one stroke weight. Open them in any design
  tool.
- **Rebuilt by:** `node scripts/build-icon-vectors.mjs`. Run
  `node scripts/build-icon-vectors.mjs --check` to prove the checked-in files
  still match the component; it exits non-zero if they have drifted.
- Edit the TSX, then re-run the script. Never the other way round, or the two
  copies disagree and the platform starts shipping two versions of the same
  glyph.

## Tier 3: TrustIcon

- **Ships as:** inline SVG in
  `apps/web/src/design-system/icons/TrustIcon.tsx`. Six marks, landing trust
  strip only. Small enough to live in one file, and not exported because
  nothing outside that strip may use them.

## The scale and the weight

Both are stated once, in `UiIcon.tsx`, and derived everywhere else:

- `UI_ICON_SIZES`: 12, 16, 20, 24, 28, 32. A 4px grid. `snapUiIconSize` rounds
  anything else onto the nearest step, so a size cannot drift off the grid.
- `UI_ICON_STROKE_PX`: 1.4 rendered CSS pixels, at every step. The `stroke-width`
  attribute is computed from the size rather than passed in, because a fixed
  grid number renders thinner the smaller the glyph gets, which is what made
  thirty-two call sites each hand-tune their own weight.
- BrandIcon sizes sit on an 8px grid from 24 up. Below 24 the plinth in the
  artwork collapses into a coloured square.
