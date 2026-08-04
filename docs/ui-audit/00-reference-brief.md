# Premium Reference Brief — NaijaFinds UI Audit

The owner supplied 15 reference screenshots of best-in-class iOS/product design.
This file distils the design language extracted from them. **Audit the codebase
against this standard.** The platform is going to the Apple App Store; the bar is
"looks like it was designed by a top-tier product studio", not "looks fine".

---

## 1. Icon system

- **SF-Symbols-grade geometry.** Consistent stroke weight, optical sizing, matched
  corner radii and terminals across the entire set. No mixed icon sources, no
  hand-drawn one-offs sitting next to a library glyph.
- **Filled / outline / duotone variants** of the same glyph, switched by state
  (inactive = outline, active = filled). Tab bars in the references do exactly this.
- **Symbol effects on state change** — bell rings/wiggles on new notification,
  refresh rotates, heart pulses + fills on save, send icon flies, speaker emits
  waves, spinner has real radial segments. Icons are animated participants, not
  static decals.
- **Tinted icon tiles**: a rounded-square container with a low-opacity tint of the
  icon's own colour (blue calculator, orange sleep, pink steps). Far more premium
  than bare monochrome glyphs in a list row.
- **Imagery inside chips**: category pills that carry a real photo thumbnail inside
  the pill (Houses / Commercial / Land), not a flat icon.
- **Brand/provider marks** rendered at correct colour (Bitcoin orange, ETH violet,
  Qatar Airways lockup) rather than greyed-out generic shapes.

## 2. Navigation

- **Floating pill / island tab bar**, detached from the screen edge with margin on
  all sides, sitting *over* blurred scrolling content. Never a flat opaque bar
  welded to the bottom.
- **Active tab expands into a labelled capsule** (icon + text on a light/solid
  capsule with its own shadow) while inactive tabs remain icon-only. The
  expand/collapse is spring-animated and the indicator slides between positions.
- **Offset circular FAB** either inside the bar (dark pill with `+`) or floating
  beside it, visually dominant.
- Content **visibly scrolls under** the nav behind a blur + gradient scrim — depth,
  not a flat opaque cut-off.
- **Desktop / admin: three-pane** — narrow icon rail (with tooltips + active pill),
  middle list pane, right detail pane. Soft radii, avatar-led rows, unread dots,
  count badges, filter chips at the top of the list pane.
- Sidebar groups with small-caps section labels ("Inbox", "Agents", "Team",
  "Filters"), coloured status dots, per-row trailing badges.

## 3. Surfaces, glass and elevation

- **Real layered glass**: backdrop blur + saturation boost, a bright 1px inner
  highlight along the top edge, a hairline border, and a soft wide ambient shadow.
  A flat `rgba(255,255,255,0.08)` panel is NOT glass and reads as cheap.
- **Dark mode is near-black** (#08080A–#0B0B0F) with a **coloured ambient glow**
  bleeding from the top/corners of the screen, not a flat #111 slab.
- **Light mode neumorphism** as the paper twin: warm off-white ground, dual
  shadows (light top-left, dark bottom-right), cards that feel physically raised.
- **Elevation is a ladder**, not one shadow: ground → card → raised card → sheet →
  modal → toast, each with its own blur/shadow/border recipe.
- **Radii scale is deliberate** and consistently applied; nested radii are optically
  corrected (inner radius = outer radius − padding).
- **Hero media runs edge-to-edge under the status bar** with floating circular
  glass controls (back / share / save) on top of it.
- **Sticky bottom action bars** are blurred, not solid.

## 4. Typography and data display

- **Massive display numerals** for the hero metric (260, ₦90,000,000, $64,151) with
  **two-tone treatment**: the primary figure in full-weight near-black/white and the
  secondary part (".00", "of 300", "/8hrs") in muted grey at smaller size. This
  single detail is one of the strongest premium tells in the whole reference set.
- **Tabular / lining figures** for anything in a column (prices, stats, tables) so
  digits align.
- Strict three-part metric hierarchy: small grey label → huge value → small grey unit.
- **Mixed-emphasis paragraphs** — the actionable clause in solid bold, connective
  words in grey, inside one sentence.
- Tight, intentional line-height and letter-spacing on display sizes (negative
  tracking on large text).
- Section headers paired with a muted trailing action ("Show all", "See all").

## 5. Buttons and controls

- **Primary = full-width high-contrast pill** (solid black / brand blue) with a
  confident label; **secondary = ghost or hairline-outline pill** beside it. Pair
  them in a blurred pinned footer.
- Press states: scale-down + shadow compression, spring back. Real haptic pairing.
- **Segmented controls** where the active segment is a floating capsule with its own
  shadow that *slides* between positions.
- **Horizontal chip rows** for dates/times/filters: selected chip gets a coloured
  ring or fill; the next chip **bleeds off the right edge** to signal scrollability.
- **Status pills**: small, tinted background, icon + label (FOR SALE, Good, New,
  Tracking, Paid $500). Semantic colour, never generic grey.
- **Toggle switches** with a real thumb shadow and animated track fill.
- Progress bars that animate their fill, with the percentage riding on the bar.
- Inputs with a leading icon, generous height, and a trailing filter/clear affordance.

## 6. Layout and screen composition

- Immersive media hero → content sheet that overlaps it with a large top radius.
- **Gradient hero fading into flat content** (blue → white) rather than a hard seam.
- Empty states are **designed**: full-bleed illustration or photograph, a real
  headline ("No trips yet — your credits are waiting"), one sentence of body, and a
  single primary CTA. Never a centred grey sentence.
- Onboarding: full-bleed atmospheric imagery, editorial serif or tight sans display
  headline, dot/segment progress indicator, huge black primary pill, quiet
  "Already have an account? Log in" beneath.
- Multi-step flows show a **segmented progress bar** at the very top.
- Cards carry **avatar stacks** for participants, and trailing timestamps.
- Lists are grouped under sticky/section headers with a coloured context row.

## 7. Motion

- Everything has a state transition: press scale, spring sheet snapping, tab
  indicator slide, icon symbol effects, number roll-up on metrics, progress fill,
  skeleton shimmer → content crossfade.
- Sheets have detents and a drag handle.
- Reduced-motion must be honoured everywhere (collapse to opacity-only).

## 8. App Store readiness

- Safe-area insets respected top and bottom (notch + home indicator).
- 44×44pt minimum touch targets.
- Haptics on primary actions.
- Dark and light both fully designed, not one as an afterthought.
- Real app icon, splash, PWA manifest, maskable icons.
- No layout shift, no unstyled flash, no scrollbars on mobile.
- Contrast passes WCAG AA in both themes.

---

## Reference screens supplied (for context on what "premium" means here)

1. SF Symbol animation grid (Expo UI native symbol effects) — bell, wifi, heart,
   chat, refresh, spinner, send, star, speaker, all animated.
2. Health dashboard, light — blue gradient hero fading to white, glass metric card
   with three columns, huge "260 of 300" two-tone numeral, green "Good" status pill,
   floating labelled pill nav.
3. Real-estate detail, dark — edge-to-edge video hero with glass circular controls,
   FOR SALE pill, ₦90,000,000 display numeral, spec row with icons, outline "Book a
   tour" pill, pinned blurred footer with ghost + solid CTA pair.
4. Real-estate booking sheet, dark — glass sheet over the hero, horizontal date
   chips and time chips with blue selected ring, chips bleeding off-edge, full-width
   blue submit.
5. Real-estate home, dark — search bar with Map toggle, category chips with photo
   thumbnails inside, blue promo card, For Rent/For Sale segmented, Sort pill,
   listing cards with New badge and rating chip.
6. Health dashboard, dark — near-black with coloured ambient glow, three vertical
   gradient progress bars with icons riding on top and % labels, right-aligned
   metric stack, to-do card with tinted icon tile, floating labelled pill nav.
7. Desktop SaaS inbox — three-pane, icon rail, grouped sidebar with coloured dots
   and count badges, chat detail with bubbles, agent list.
8. Crypto wallet, light neumorphic — huge two-tone "$3,430.00", dark/light button
   pair, filter chips, coin rows with brand marks and green deltas, sparkline chart
   with dotted grid, floating pill nav.
9. Project manager, light neumorphic — raised cards, dual-shadow, mini charts,
   avatar stacks, day-strip calendar, timeline schedule, pill nav + black FAB.
10. Team chat, light — three screens: home with coloured dashed-border task/note
    zones, chat with reply-quote bubbles and a voice-note waveform, activity feed
    with pink highlighted unread group, filter chips, tab bar with central black FAB.
11. Onboarding set (4 apps) — atmospheric cloud/sky gradients, editorial headlines,
    segmented progress, black and blue primary pills, designed empty state ("No
    trips yet"), 3D glass logo badge, floating icon constellation.
12. Task manager, teal — coloured header block, day strip with white selected pill,
    tasks grouped under "Today" / "Upcoming · Tue 23 Sep" headers, each row carrying
    a small coloured category tag (Work / Design / Personal), a time range and a
    metadata row of tiny icon+count triples (attachments, comments, participants),
    dark floating pill nav with a WHITE circular FAB in the centre, bottom sheet
    "Task detail" with a drag handle, icon-led setting rows, a real toggle switch,
    coloured tag dots with stepper chevrons, and a full-width black "Add Task".
13. Health detail, light — segmented Day/Week/Month/Year control, 2×2 metric grid
    where each tile is icon+coloured label / big value / small grey goal, multi-arc
    radial gauge, pink line chart with a soft gradient fill and labelled axes, "Heart
    rate zones" as four labelled mini progress bars in semantic colours, a tinted
    "Insights" card with a lightning icon and one sentence, weekly goal row of seven
    ring badges (filled vs empty), and a compact dark pill nav.
14. Design studio marketing site — light neutral ground, centred editorial sections,
    "Recent work" chip label above the headline, a stat line above the H1, paired
    dark + light CTA pills with tiny brand icons inside, a work gallery of rounded
    cards, a greyed logo wall with a "30+ More" pill, a 3-then-2 grid of icon +
    bold title + grey body value props, testimonial cards each led by a client logo
    and signed with an avatar + name, a tools logo strip, a team grid of portrait
    tiles with name/role and a "5+ More" tile, pricing as two cards with a segmented
    Landing/Full Site/Brand/Product switcher and check-list features, and an FAQ
    accordion with chevron rotation.
15. SaaS marketing site (6 hero variants) — soft mesh/aurora gradient backgrounds
    (pink→lavender→blue), a display headline with **inline brand logo chips set into
    the sentence**, an inline email capture where the input and the CTA share one
    pill, a social-proof cluster of overlapping avatars + five stars + "1,000+
    startups", a thin top announcement bar, floating tilted UI fragments and
    annotation cards orbiting the hero, and a large product screenshot presented in
    a soft-shadowed frame that fades into the background.
