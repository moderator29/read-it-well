# Icon upgrade, 29 September 2026

The founder's direction: premium, clean, unified icons "like the references"
(`docs/design/references/2026-09-29/30-clean-light-desktop-builder.jpg`,
`31-clean-light-mobile-today.jpg`, `38-fixtrack-dashboard.png`). The build spec
is `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 4 (the icon plate) and
section 12 (dark mode). The lead decided Q3: landing feature cards use the flat
plate like every other surface, and the glass objects retire from light mode.

## What the references draw

- Lean line glyphs, about 1.5px, one family (Lucide geometry), round caps and
  joins.
- On a row or a card, the glyph sits on a soft tinted square: 36 to 44px, a
  10 to 12px corner, a subtle neutral or accent tint, and the glyph in a deeper
  tone of the same hue. There is no rim, no glow and no 3D.
- 20px glyphs in row and card plates, 16px glyphs inline in chips and buttons.
- One style per screen, never mixed.

## Findings (inventory at the start of the pass)

1. **`IconPlate` was lit blue glass.** It had a fill gradient, a cyan rim, an
   inner light, its own glow and a glowing glyph, and the brand tone was the
   default. As a result every settings and profile row was a glowing blue tile,
   and the accent was everywhere.
2. **Glass 3D objects (`BrandIcon`) were used as icons at about 130 call
   sites** in about 90 product files (the dev previews excluded), well beyond
   feature moments. They appeared at 24px inside admin
   queue rows, inside primary buttons ("Add listing", "Start an application"),
   on agent KPI tiles, on share-picker and thread-sheet rows, on motion-level
   options, on the mode switcher chip, and as the hero of 12 workspace empty
   states. At row size a glass object blurs into a coloured square beside
   type. This was the main "mixed styles" fault.
3. **Four hand-drawn glyph sets sat beside `UiIcon`, each with its own
   geometry:**
   - `SettingsGlyph` (shield-check, globe, headset, log-out)
   - `LineGlyph` (pencil, camera, people, repost)
   - `AdminGlyph` (18 console marks: clipboard, check-square, bars, the circle
     marks, shields, user marks)
   - `FeatureGlyph` (motion, animated)

   Their live areas, corner radii and dots differed from Lucide's, which made
   the seams visible beside `UiIcon`.
4. **About 15 ad-hoc tiles read the lit-glass `--nf-plate-*` tokens directly**
   rather than using `IconPlate`. They include the admin row tile, the inbox
   and thread rings, the landing category mark, the ledger, stays and
   price-check glyphs, the side-switch ring and the AI avatar. They glow
   whatever `IconPlate` does.
5. **No emoji is used as an icon** anywhere in product code. Arrows and ticks
   appear only as typography in copy. Inline `<svg>` outside the icon set is
   limited to charts, the QR code, the success animation, the read-receipt
   ticks and brand marks, and all of those are legitimate.
6. **Some glyphs read wrong for their meaning:**
   - The thread sheet's "Block" row showed a ticked shield (it means safe, not
     block).
   - Bookings' "Confirm and pay" showed a padlock shield.
   - The agent dashboard's "Manage listings" showed a ticked shield.
   - The dashboard's primary "Add listing" drew a glass house cluster where a
     plus belongs.

## What changed

- **`IconPlate` v2** (`components/ui/IconPlate.tsx`, material in
  `app/css/symbols.css`):
  - Tones: `neutral` (the new default), `brand`, `success`, `warning`,
    `danger`, `info` and `solid`. The old names `error` and `pending` still
    resolve.
  - Sizes: 36/44/56 on 10/12/14 corners.
  - `ICON_PLATE_GLYPH` is 20/20/24.
  - Flat in both themes. At night the neutral plate is the primary ink at 7%,
    so it reads as a slightly lighter surface than the card. In daylight it is
    the paper well. The brand plate is `--nf-brand-tint-2` with a
    `--nf-brand-quiet` glyph.
  - There is no theme rule: every value is a token that answers in both
    themes.
- **`UiIcon` gained 38 Lucide glyphs:**
  - shield-check, shield-lock, globe, headset, log-out
  - camera, pencil, users, lock
  - calendar-check, calendar-clock, clock
  - credit-card, bank, hand-coins, banknote, receipt
  - concierge-bell, alert-triangle, chart-bar, trending-up
  - file-text, file-check, file-search, clipboard-list, square-check
  - user-check, user-pen, messages, bot, id-card, hourglass
  - circle-check, circle-x, circle-play, circle-pause, repost-loop

  The vectors in `assets/icons/ui` were regenerated (125 files).
- **`SettingsGlyph`, `LineGlyph` and `AdminGlyph` became name maps onto
  `UiIcon`.** `AdminGlyph` keeps only the marks Lucide has no drawing for (the
  filled home, the two naira marks, moderation and operations), redrawn on
  Lucide's square and hexagon outlines.
- **Rows go neutral:** settings rows, profile belongings, the switch-role row
  and `DetailGlyph` (the listing and stay detail rows). `brand` is kept only
  for the one row that is the point of a screen.
- **Glass-to-plate swaps** (icon swaps only):
  - Admin: money refunds, payments lookup (card and bank), reservations and
    alerts.
  - Agent workspace: dashboard, earnings, analytics, reviews, bookings, inbox,
    settings, verification and calendar.
  - Other surfaces: the host door, the mode switcher, the motion levels, the
    thread options sheet, the share picker, bookings "How booking works" and
    the signed-out settings panels.

- **The glass-to-line table** (`design-system/icons/glass-to-line.ts`,
  `lineGlyphFor`) gives every BrandIcon name, the aliases included, a lean
  twin chosen for its meaning. The `State` kit draws the twin on its plate,
  which converts every empty state in one place.
- **Later swaps, icon-only:**
  - Support, the report and safety sheets, the assistant and support chat.
  - The social empty states and the story composer.
  - The listing wizard and "sent for review".
  - Host and stays setup, the supply doors and register shell.
  - The trip spine and map empty state, the reserve confirmation, and the
    stays category tiles.
  - The docs, help, contact, careers, about and safety pages, the site head
    chip, the landing AI showcase and the profile standing chips.
- **Glyphs fixed because they read wrong:**
  - Agent rail: Analytics was a folded map (now a chart), Earnings a price tag
    (now a wallet).
  - Host rail: Earnings was history (now a wallet), Room bookings a second bed
    (now a calendar), "Charges at the door" a price tag (now a receipt).
  - Help and support was a ticket in every nav (now a headset, matching the
    settings row).
  - The agreements empty state was a payment card (now a document).
- **The icon scale:** plate glyphs drawn at an off-scale 18 moved to 20.

## Verified

- Screenshots in the icon lane's scratchpad (`icons/shots2/`): settings,
  profile, listing detail, bookings, saved, agent dashboard and earnings,
  admin queue and alerts, and the share picker at 390, light and dark; admin
  overview, agent dashboard and the landing at 1440; and signed in as the QA
  member, /profile, /bookings, /saved and /agreements at 390, light and dark.
- Gates: `tsc --noEmit` clean apart from errors in other lanes' in-progress
  files, `npm run lint` clean (0 errors), and vitest for the icons,
  components/app, agent, host, ui and admin components (412 tests) passing.
  In `tests/icons-and-targets.spec.mjs` the scale, vectors and names checks
  pass; its remaining failure is the landing stack dots at 24x44, which
  belong to another lane.

## Open items

- **Payments boundary, not touched:** glass objects still stand in checkout
  (`checkout/[bookingId]` page, PayPanel, HoldCountdown), rent pay, the
  move-in ledger, `PaymentMethodsPanel`, `CryptoPayOption` and
  `PayoutAccounts`. Each is a one-line swap to `lineGlyphFor` whenever the
  owner of payments allows it.
- **Scenes and heroes kept for now:** the flip (`SideCover`, `SideSwitch`,
  kept by spec section 12), `PageScene`, `SceneBanner`, `WelcomeIntro`, the
  firm and register hero objects (128 to 176px) and the home category row.
  Q3 retires glass from light mode. If that should cover these too, the next
  step is a light-mode rule in light.css (builder 1's file) or a swap per
  surface.
- **`components/app/price/ResultPanel.tsx`:** the icon swap is in the
  working tree, beside another builder's uncommitted share-card work, and
  goes in with their commit.
- **Dead CSS for builder 1:** the light.css rules that tile a glass object
  inside `.nf-plate` (`.nf-plate:has(> .nf-brand-icon-ground)`) and the
  `.nf-door__mark--glass` sizes in controls.css have no remaining callers.
