# 30 UI/UX recommendations: the clean, unified sweep

29 September 2026. The build plan that applies
`docs/design/CLEAN_UNIFIED_DIRECTION.md` (the spec, written first) from the
landing page to the admin console, plus the landing upgrade and the motion
layer. Every item is meant to be built next, by three builder agents, in the
file buckets at the end.

**How this was made.** Read `docs/DESIGN_DIRECTION.md`,
`docs/TRACK_M_MOTION_PLAN.md`, `docs/ICON_SYSTEM.md`,
`docs/MOTION_SWEEP_2026-09-29.md` (lane A); the landing code
(`app/(landing)/page.tsx`, `components/site/landing/*`,
`components/cinema/LandingCinema.tsx`, the i18n strings); and the app
screens through their preview harnesses. Screenshots on the running dev
server: the landing at 1440x900 and 390x844 in dark, three shots in light,
and `/preview/f1/home`, `/preview/f3/{search,listing,stay,saved}`,
`/preview/f4/{profile,settings}`, `/preview/f5/{inbox,thread-booking-card,host-landing}`
and `/sign-in` at 390; then the founder's references 30 to 38 in
`docs/design/references/2026-09-29/`, which the spec maps. The perf (B) and responsive (C) sweep docs did not
exist yet when this was written, so overlaps with those lanes are named by
file rather than by their plan.

**Standing rules for every item.** Brand blue is the only accent; logo and
icon set unchanged; nav chrome glyphs bold, inner glyphs lean; the shape law
(no capsule on a text control, radius at most 0.30 of the short side); no
container behind the active dock tab; only `transform` and `opacity`
animate; every motion has a reduced-motion answer and respects the Calm and
Off settings (`lib/motion/gate.ts`, `data-motion` on the root); no invented
figures; "Example" on every example listing; sentence case; no em dashes in
copy.

**Groups:** Foundations 1 to 5, Landing 6 to 12, Screens 13 to 23 (app,
workspaces, admin, outbound), Motion 24 to 30. Effort: S is under half a day, M a day, L two or more.

---

## Foundations (the spec, as tokens and primitives)

### 1. Light mode on warm paper: canvas, white cards, one hairline

- **Today.** The light palette paints the canvas and the cards the same
  `#FFFFFF` (`packages/design-tokens/src/tokens.css`, the
  `:root[data-theme="light"]` block at about line 3524), so cards only exist
  because of their borders; on the landing bento in light the seven cards and
  the page are one white sheet (screenshot `Lt_land-1`). Shadows come from the
  generic `--nf-elev-*` ladder, and there is no single card border token.
- **Change.** Apply spec section 1.1: canvas and canvas-base `#F4F4F1`,
  cards `#FFFFFF`, raised wells `#F0F0EC`, the new `--nf-card-border`,
  `--nf-card-shadow`, `--nf-float-shadow`, `--nf-card-shadow-hover`, the four
  inks retuned for 4.5:1 on both grounds, the new radius tokens
  (`--nf-radius-card`, `-card-sm`, `-well`, `-control-sm`, `-badge`,
  `-plate`). Point the shared card classes at them: `.nf-card`, `.nf-panel`,
  `.nf-glass` in light (`app/css/glass.css`, `app/css/system.css`,
  `app/css/light.css`). Re-run `apps/web/scripts/design/light/sweep.mjs`
  and fix any ink under 4.5:1.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** none (C only if a breakpoint moves; none should).

### 2. The night, calmed: no neon rim on ordinary cards, a glow budget

- **Today.** `--nf-container-edge` at night is the electric blue at 70%
  (`tokens.css` line ~1832), so every settings group, profile row, listing
  card, search chip and inbox tab is outlined in bright blue
  (`/preview/f4/settings`, `/preview/f4/profile`, `/preview/f3/search`). Cards
  use the lit panel gradient; icon plates glow; three or four things glow per
  screen and none is the point.
- **Change.** Spec sections 1.2 and 12: `--nf-container-edge` to 20%, cards
  flat `--nf-surface-primary` (`#040A1F`) with `--nf-card-border`, the
  `--nf-panel-*` and `--nf-glow-*` consumers on cards, rows, chips and
  plates switched off, glow kept for the primary button, dock, centre "+",
  logo, selected segmented thumb and focus ring. Files: `tokens.css` dark
  block, `app/css/glass.css`, `app/css/system.css`, `app/css/chips.css`,
  `app/css/controls.css` (`.nf-plate`).
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** none.

### 3. Type scale, figures and section labels

- **Today.** In-app titles are Poppins 700 at several sizes; section labels
  vary between sentence case ("Account", "Preferences" on settings) and
  tracked caps (landing eyebrows at 0.1em); figures are not consistently
  tabular; the landing headline at -0.035em makes letters touch at 1440
  ("Rent, buy or stay." in `L1440-0`).
- **Change.** Spec section 2: add `--nf-text-title-lg` (30/36),
  `--nf-text-row` (15px), `--nf-text-figure` (40px), `--nf-text-figure-xl`
  (88px), `--nf-tracking-label` (0.06em); a `.nf-label` class (11px, 600,
  caps, 0.06em, muted) in `app/css/typography.css`; `.nf-numeric` gets
  `tabular-nums` everywhere; in-app titles at 600; landing display to
  -0.03em. Rule in the file header: three weights per screen.
- **Reduced motion.** Not applicable.
- **Effort** S. **Lane** none.

### 4. Icon plate v2: the soft square, neutral by default

- **Today.** `IconPlate` (`components/ui/IconPlate.tsx`, material `.nf-plate`
  in `app/css/controls.css`) is "lit blue glass": fill, rim, inner light and
  glow, brand tone by default, so every row on settings and profile is a
  glowing blue tile and the accent is everywhere. Sizes are 36/44/56 with a
  16 or 24 glyph.
- **Change.** Spec section 4: tones `neutral` (new default), `brand`,
  `success`, `warning`, `error`, `info`, `solid`; sizes 36/44/56 on radii
  10/12/14 with glyphs 18/20/24 at stroke 1.5; no rim, no inner light, no
  glow in either theme. Add `InitialsTile` (same box, initials 13/600) for
  businesses, firms and photo-less listings. Update the 27 call sites to
  pass `tone="brand"` only where the row is the point of the screen (the
  primary workspace row, the verification row while incomplete).
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** none.

### 5. The primitive set: buttons, segmented, badges, grouped list, summary card

- **Today.** Buttons glow in several levels at once; `StatusBadge.tsx` and
  `StatusPill.tsx` are two badge systems; `Segmented.tsx` has one look (a
  glowing blue thumb, the inbox's "Property" in `/preview/f5/inbox`);
  there is no grouped-list primitive, so settings rows, profile rows,
  inbox rows and host rows each build their own card per row or per group;
  there is no summary card.
- **Change.** Spec sections 3, 5, 6, 7 and 9, as components:
  - `Button.tsx` / `buttons.css`: `primary`, `secondary`, `quiet`, `icon`
    (`ghost` aliases `quiet`), one glow at night on primary only.
  - `Segmented.tsx`: `variant="quiet" | "solid"`, quiet by default.
  - `StatusBadge.tsx`: kinds `badge`, `dot`, `count`; `StatusPill.tsx`
    re-exports it so no call site breaks; radius `--nf-radius-badge`.
  - NEW `components/ui/ListGroup.tsx` (`ListGroup`, `ListRow` with
    `leading`, `title`, `sub`, `value`, `status`, `trailing`) over NEW
    `app/css/list-group.css`, inset dividers from the text column.
  - NEW `components/ui/SummaryCard.tsx`, and `components/ui/charts/StatusBar.tsx`
    restyled to the 6px segmented bar with a dot legend.
  - NEW `components/ui/MetaStrip.tsx` (spec section 6, the hairline strip).
  - NEW `components/ui/charts/Gauge.tsx` (spec section 13, the tick half-ring
    with its legend list) and `TimeSeries.tsx` restyled (1.5px line, dashed
    target, dark tooltip), for item 14.
  - NEW `components/ui/KpiTile.tsx` (label with glyph, figure, delta chip
    that renders only when given a previous-period value, corner link).
  - A `/preview/g1` update so all of it is screenshotted in both themes
    (rule R-G).
- **Reduced motion.** Segmented thumb jumps (it already does under the
  collapsed tokens).
- **Effort** L. **Lane** A for the press states only (lane A already added
  `:active` press to rows and buttons in `app/css/press-motion.css`; the new
  classes must carry the same press class names, not new ones).

---

## Landing page upgrade and cleanup

### 6. Say "Example" on every landing listing card

- **Today.** The landing prints real-looking listings in three rooms (the AI
  showcase, the Property/Stays switch and the community stack) through
  `ListingMini`, fed by `toMiniListing` in `lib/site/listing-card.ts`, which
  does not carry `isDemo`. The in-app `ListingCard.tsx` shows the
  `nf-badge--example` mark; the landing never does, so "Two bedroom flat in
  Ikeja GRA, N2.8m /yr" reads as live inventory. `lib/listings/types.ts`
  (the `isDemo` note) says every surface must say so on the card.
- **Change.** Add `example: boolean` to `MiniListing` (from
  `listing.isDemo`); `ListingMini.tsx` renders the neutral Example badge
  (spec section 6) in place of the market badge, and the card's link keeps
  working. `AiShowcase.tsx` and `TwoWorlds.tsx` get it for free. Add the card
  renderer to the source guard in `components/app/listing/example-notice.test.ts`.
- **Reduced motion.** Not applicable.
- **Effort** S. **Lane** none.

### 7. The hero, tightened: two-line headline, calmer type, one fact row

- **Today.** At 1440 the headline breaks into three lines ("Without the /
  runaround.") and the letters touch; the sub-line is small against it; the
  only proof under the action is nothing (`Hero.tsx`, `app/css/landing.css`).
- **Change.**
  - `.nf-landing-title`: `max-width: 15ch` removed in favour of
    `max-width: min(100%, 44rem)` so line two fits on one line from 1280;
    tracking -0.03em; sub-line 18px on desktop, 16 on phone,
    `--nf-content-secondary` on the plate scrim.
  - Under the search, a fact row of three short items, each a 16px lean check
    glyph and 14px text, from existing constants only: the inspection line
    from `NO_INSPECTION_FEE`, the move-in total line, and the agreement line
    from `PAYMENT_GATE_SENTENCE`, shortened as new i18n keys
    (`landing.face.hero.facts.*`) that a test pins to the constants' meaning.
    No figures.
  - Sentence case on the button ("Explore properties", see item 12).
- **Reduced motion.** The fact row is simply there.
- **Effort** S. **Lane** C (the hero's phone layout is lane C's; keep to type
  and the new row, do not change the grid).

### 8. The search pill, rebuilt as one surface

- **Today.** `SearchPill.tsx` draws a bordered box with a second bordered
  segment group inside it, a filter glyph floating alone, and a blue go
  button (box in box in box, `L1440-0`). On the phone it stacks into three
  rows with the filter glyph orphaned left of the Search button (`L390-0`).
- **Change.** One card (`--nf-surface-elevated` at night on the plate,
  `--nf-float-shadow`), radius 18, height 64 on desktop: field, then the
  `Segmented variant="quiet"` for Buy / Rent / Stay (order still from
  `segments.ts`, `headline-coupling.test.ts` untouched), then a 44px icon
  button for filters and the primary go button. On the phone: segmented row
  on top (full width), then the field with the go button inside its right
  end; filters become a quiet text button "Filters" under it. No inner
  borders.
- **Reduced motion.** Thumb jumps.
- **Effort** M. **Lane** C (phone layout; agree the stack order with C, or C
  leaves `SearchPill` to this item).

### 9. Twelve rooms to ten: cut the repeats

- **Today.** `LandingBody.tsx` renders twelve rooms; the page is 8,525px at
  1440 and 10,666px at 390. Three repeat a neighbour: `PlacesBand`
  (`components/cinema/LandingCinema.tsx`, a wall of fifteen photos, a large
  empty left column on desktop in `L1440-1`, four full rows of tiles on the
  phone in `L390-1`) repeats the category tiles' photographs; `NigeriaMap`
  repeats its own city chips, and on the phone the pins carry no labels
  (`L390-4`); the community stack puts the same villa photo behind a listing
  card that shows the villa photo again (`L390-4`).
- **Change.** New order: Hero, Journey, Bento, Worlds (Property/Stays with
  Example-tagged listings), AI, Categories with Cities, Community, App, FAQ,
  Close. Specifically:
  - remove `PlacesBand` from the landing (the component stays for any other
    caller; `reel.places` strings stay);
  - fold the map into the category room: the eight tiles, then a "Cities"
    label and the chip row; the drawn map shows only from 64rem, beside the
    chips, and is dropped on the phone;
  - community keeps the copy, the figures (only when `statTiles` returns two
    or more) and the Third party card; the listing card over the photo goes.
  - Target height: under 6,500px at 1440 and under 8,000px at 390.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** C (touches room layouts; coordinate on
  `landing-rooms.css`).

### 10. The landing on the clean spec: paper bands, white cards, one head rule

- **Today.** In light every room is white on white; the bento's glass objects
  sit on 100px navy tiles that dominate the white cards (`Lt_land-1`); the
  journey cards have uneven bottoms and large empty space; the tall bento
  cells are half empty at night (`L1440-1`). Section heads alternate centred
  and left with no rule (Journey, Bento and Worlds centred; Places, AI,
  Categories, Map, Community and FAQ left), the Places head sits at the
  bottom of an empty column, and ledes run to different widths.
- **Change.**
  - Rooms alternate ground in light: warm canvas `#F4F4F1` and a full-bleed
    white band (`--nf-surface-primary`) for Journey, Worlds and FAQ, so rooms
    separate by ground rather than by 96px of air. At night the same rooms
    alternate `--nf-surface-canvas` and `#020819`.
  - Bento and journey cards: `--nf-radius-card`, `--nf-card-border`,
    `--nf-card-shadow`; the navy tile behind each glass object shrinks to 64px
    radius 16 (spec Q3); tall cells put the object top-left and the text at
    the bottom so no cell is half empty.
  - Journey: card grid with `grid-template-rows: subgrid` (or a fixed chip
    slot) so the chip rows align along one baseline; body text 15px.
  - One head rule in `SectionHead.tsx`: centred only when the content below
    is a full-width grid (Journey, Bento, Worlds); left in every split room,
    aligned to the top of the content, never the bottom; eyebrow uses
    `.nf-label` (item 3); title max 20ch, lede max 52ch; head to content 32px
    on desktop, 24 on phone; room padding from `--nf-gap-section` only.
  - Files: `app/css/landing.css`, `app/css/landing-rooms.css`,
    `SectionHead.tsx`, `Bento.tsx`, `Journey.tsx`, the landing part of
    `app/css/light.css`.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** C (spacing only; no breakpoint changes).

### 11. App band, FAQ and footer: no box inside a box

- **Today.** The app band is a panel holding an install card and a second
  card with the logo and three points (three nested borders, `L1440-4`); the
  FAQ is twelve loose rows; the footer has a skyline strip with a floating
  shield badge that says nothing.
- **Change.**
  - `AppBand.tsx`: one panel, two columns, no inner cards; the install line
    becomes a plain row with a 36px neutral plate; the three points become a
    `ListGroup` without a card (dividers only).
  - `LandingFaq.tsx`: the twelve `<details>` sit in one white `ListGroup`
    card with inset dividers, grouped under three labels (Renting and buying,
    Stays, Money and safety) taken from the existing items' keys; `FAQPage`
    JSON-LD unchanged.
  - `SiteFooter.tsx`: remove the skyline and shield flourish; one hairline
    above the legal row; "Delete account" stays (store requirement).
- **Reduced motion.** FAQ open is covered by item 30.
- **Effort** M. **Lane** none.

### 12. Copy casing and honest doors

- **Today.** Buttons mix Title Case and sentence case on one page: "Sign In",
  "Get Started", "Explore Properties" (`packages/i18n/src/locales/en.ts`,
  `landing.face.nav` and `hero.explore`) beside "Explore properties",
  "Create your account", "Ask the assistant". And the hero's one action goes
  to `/search`, which `proxy.ts` sends a stranger to sign-in with
  `notice=sign-in-required` while `VALLO_PUBLIC_CATALOGUE` is off (checked:
  `/search`, `/stays` both 307), so the landing's main door is a surprise
  sign-in.
- **Change.** Sentence case for every landing and site button string. When
  `publicCatalogueEnabled()` (`lib/catalogue/public-access.ts`) is false, the
  hero, bento and category doors point at `/start?next=<destination>` and the
  hero button reads "Get started"; the sub-line under it says the existing
  truthful line "Create a free account to see every listing, save the ones
  that fit, and talk to the person who listed them." When it is true, nothing
  changes.
- **Reduced motion.** Not applicable.
- **Effort** S. **Lane** none.

---

## Screen-level polish (app, workspaces, admin, outbound)

### 13. Page headers: the large title on phones, the frame on desktop

- **Today.** `/preview/f3/saved` has a back button in a glowing box beside a
  title; `/preview/f5/inbox` puts "Mark all read (3)" as loose text between
  the title and a glowing search box; settings has a title and a sub-line;
  host has a title under a chip row. Five pages, five header anatomies.
- **Change.** `components/app/PageHeader.tsx` gains `variant="large"` (spec
  8.1: title 30/36, one muted sub-line, up to two 44px icon buttons) and
  `variant="desk"` (spec 8.2: 72px strip, breadcrumb, title, dot badge,
  actions right, one primary). Adopt on Saved ("Saved", "4 places"), Inbox
  ("Inbox", actions search and a quiet "Mark all read"), Settings, Profile,
  Bookings, Notifications, Host, Agent dashboard.
- **Reduced motion.** See item 29 for the scroll collapse.
- **Effort** M. **Lane** C (header height on phones; the component is this
  item's).

### 14. The workspace dashboard: host, agent and admin overview

- **Today.** The host landing (`app/host/page.tsx`, `/preview/f5/host-landing`)
  opens on a big glowing "Continue the application" and chips; the agent
  dashboard (`app/agent/dashboard/RealDashboard.tsx`) and the admin overview
  (`app/admin/_components/ConsoleOverview.tsx`, `OverviewView.tsx`) each
  draw their own panels. None says what needs the person now in one glance.
- **Change.** Spec section 13 (reference 38) on desktop, reference 31 on the
  phone:
  - Top bar: search, range select (`app/admin/_components/RangeSelect.tsx`
    generalised into `components/app/desk/RangeSelect.tsx` for all three),
    Filter, bell, one primary.
  - Four KPI tiles per desk as listed in spec 13.1 (host: arriving today,
    staying tonight, requests waiting, unread; agent: live listings,
    inspection requests, agreements to confirm, unread; admin: queue open,
    reviews due, money decisions, alerts). Each tile links to its filtered
    list. **The delta chip renders only when the same query ran for the
    previous period;** otherwise no chip.
  - Pipeline gauge (NEW `components/ui/charts/Gauge.tsx`, bucket 1) over the
    record's real statuses (`app/host/reservations/board.ts`, listing
    statuses, `app/admin/_components/due.ts`), with the legend list.
  - "Needs attention" `ListGroup` card (tinted plates, badges, "View all").
  - Line chart (`components/ui/charts/TimeSeries.tsx`) only with four or more
    weeks of data, target line only where the product has a promise (admin
    SLA); schedule bars and load list only where the desk has scheduled
    items or capacity. A card with no source is left out.
  - Phone: large title "Today" plus the date, a `SummaryCard` "Needs you
    today" (the four KPI counts as the bar's segments), then "Needs
    attention"; charts collapse behind "See the numbers".
  - If everything is zero the summary says "Nothing needs you today." with no
    figure.
- **Reduced motion.** Figure and bar per item 26.
- **Effort** L. **Lane** B (the desks' loading states are B's; use B's
  skeleton, do not write one).

### 15. Home for renters and guests, on the spec

- **Today.** `/preview/f1/home`: greeting, a glowing city select, a photo hero
  with its own search, four big glowing glass doors, then featured cards;
  every element carries a blue rim.
- **Change.** `components/app/home/HomeScreen.tsx`, `HomeHero.tsx`,
  `CategoryRow.tsx`: keep the photo hero (spec Q2); the city select becomes a
  quiet row under the greeting ("Lekki, Lagos" with a chevron, no box); the
  four doors become 44px neutral plates with labels in one white card, a row
  of four; add an "Up next" `ListGroup` only when the person has an upcoming
  inspection, booking or unread thread (real data, hidden otherwise);
  featured cards per item 17.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** B (home streaming) and C (grid); touch only the
  surface styles and the new group.

### 16. Settings and profile as grouped lists

- **Today.** `/preview/f4/settings` and `/preview/f4/profile`: every group is a
  rimmed card, rows carry glowing brand plates, the data saver is its own card,
  "Your workspaces" is its own card, section labels are sentence-case grey.
- **Change.** `components/app/account/SettingsGroups.tsx`, `rows.tsx`,
  `DataSaverRow.tsx`, `ProfileIdentityCard.tsx`, `app/settings-rows.css` move
  onto `ListGroup`/`ListRow`: labels as `.nf-label`, neutral plates, trailing
  value then chevron, switches as trailing; profile's Belongings (Plans,
  Saved, Agreements, Workspaces) become one group, "More of your account"
  another. The identity card keeps the avatar round.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** A (row press, already in `press-motion.css`; reuse
  its class).

### 17. Listing and stay cards: calm cards, tinted badges, one price line

- **Today.** `/preview/f3/search` and `/saved`: each card has a blue rim,
  three overlaid badges on the photo (Verified, For rent, heart), a meta row
  with a "+1" chip, and in Saved a separate "Remove" button floating under the
  card.
- **Change.** `components/app/ListingCard.tsx`,
  `components/app/stays/StayCard.tsx`, `app/css/list-views.css`,
  `app/css/catalogue.css`: card on `--nf-radius-card` and `--nf-card-border`;
  one badge on the photo (Verified or Example, never both, as the check
  constraint already guarantees), the market as a word above the title
  ("To rent" 12px muted), price 17/600 tabular with the period muted, meta as
  a `MetaStrip`-style line of plain text; Saved moves Remove into the card's
  overflow and into a swipe action (item 28). The result count line above
  becomes a `MetaStrip` ("7 properties" | "Recommended").
- **Reduced motion.** Heart and removal per item 28.
- **Effort** M. **Lane** C (grid columns) and A (the card morph: keep the
  click-time `view-transition-name` code untouched).

### 18. The listing's move-in total as a summary card

- **Today.** `/preview/f3/listing`: the move-in block is a glowing card in a
  glowing card, with the rent line, a note and a nested beds/baths card; the
  fees are only visible behind "Breakdown".
- **Change.** `components/app/listing/ListingMoveInBlock.tsx` renders a
  `SummaryCard`: label "Move-in total", figure, one sentence ("Rent plus every
  fee the agent named, added up."), and a `StatusBar` whose segments are the
  real lines from `move-in-lines.ts` (rent, caution, agency, legal,
  agreement), legend under it with each amount; "Breakdown" stays as the
  quiet link to the full sheet. Beds and baths leave the block for
  `ListingSpecChips.tsx`. For an example listing the card still says Example.
- **Reduced motion.** Bar per item 26.
- **Effort** M. **Lane** none.

### 19. Inbox and threads on the row spec

- **Today.** `/preview/f5/inbox`: a glowing Property/Stays segmented, four
  glowing filter chips that do not fit at 390 ("Reported" is clipped), rows
  with round avatars for hotels, a context line in brand blue, a blue count.
- **Change.** `app/(app)/messages/` inbox and `components/app/threads/*`:
  Property/Stays as `Segmented quiet`; the four filters as a second quiet
  segmented or a horizontally scrolling chip row with the neutral chip
  style; rows on `ListRow` (people round avatars, businesses `InitialsTile`),
  context line 13px muted with its kind glyph, time 12px muted, unread as a
  `count` badge and a bold title. The thread's booking card
  (`BookingFace.tsx`) takes the summary-card anatomy with a
  `MetaStrip` for check-in, check-out, guests.
- **Reduced motion.** Not applicable.
- **Effort** M. **Lane** C (the chip row overflow at 390).

### 20. Host, agent and admin desks on the workspace frame

- **Today.** Host (`app/host/layout.tsx`) is a chip row of sections above
  the page; agent (`app/agent/layout.tsx`) and admin (`app/admin/layout.tsx`,
  `app/admin/_components/panels.tsx`, `app/css/admin.css`) each have their own
  chrome and panel look. Reference 24 in the same folder shows the agent
  workspace header as it is now.
- **Change.** From 1024px, spec 8.2 and 8.3 (references 30 and 38): the
  grouped sidebar (desk switcher; MAIN, OPERATIONS, ACCOUNT groups; bold
  glyphs; real count badges; active with no container; person block at the
  foot) shared by the three desks as `components/app/desk/DeskSidebar.tsx`
  over each desk's own nav list (`app/admin/_components/AdminNav.tsx` keeps
  its routes); the top bar from item 14; a list pane where the desk has
  records (reservations, listings, queue); main; an inspector for the
  selected record with a `Segmented solid` at its top where a record has
  modes and the primary pinned at the foot. Desk headers use
  `PageHeader variant="desk"`. Admin panels and tables
  (`app/admin/_components/panels.tsx`, `QueueTable.tsx`, `app/css/admin.css`)
  take `--nf-card-border`, `.nf-label` column heads, neutral plates, the
  badge kinds. Below 1024px nothing moves (lane C).
- **Reduced motion.** Pane and inspector changes are instant; no slide.
- **Effort** L. **Lane** C (breakpoints and pane collapse are C's; this item
  is the look inside the panes).

### 21. The live status tracker for bookings, viewings, agreements and payouts

- **Today.** Status is spread across screens as words: the booking detail
  (`app/(app)/bookings/[bookingId]/BookingDetailCard.tsx`) and the thread's
  booking face (`components/app/threads/BookingFace.tsx`, steps derived in
  `booking-steps.ts`) show a timeline of their own; viewings
  (`components/app/plans/InspectionsBoard.tsx`), agreements
  (`components/app/agreements/status.ts`, `AgreementControls.tsx`,
  `PaymentGate.tsx`) and payouts (`app/host/earnings/page.tsx`,
  `app/agent/earnings/EarningsWorkspace.tsx`) show a badge only. Nobody can
  see, in one line, where a thing is and what happens next.
- **Change.** Spec section 14 (reference 36): NEW
  `components/app/status/StatusTrack.tsx` (horizontal from 640px, vertical
  under it; done, current with halo, upcoming, failed), fed only by real
  state events; step sets per record as in the spec table (stay booking uses
  the four steps `booking-steps.ts` already derives). Each record page opens
  with the record strip, then the tracker; the booking and agreement pages
  gain the "What the other side sees right now" card (a real render of the
  counterpart's status card), and a pending decision (a booking request to
  accept, an agreement to confirm, a refund to approve) shows as the tinted
  "Awaiting you" decision card with itemised lines, total, one primary and
  two secondaries. Checklists (host go-live list, check-in steps) use the
  checklist card.
- **Reduced motion.** The current node's halo never pulses; it fades in once
  over 240ms, and is simply there under reduced motion, Calm and Off.
- **Effort** L. **Lane** none (lane B's loading states for these pages stay
  B's).

### 22. One confirm panel for every consequential action

- **Today.** Confirmations are each built their own way: checkout
  (`app/(app)/checkout/[bookingId]/PayPanel.tsx`, `CheckoutSummary.tsx`),
  cancelling (`components/app/bookings/CancelBookingSheet.tsx`), refunds
  (`components/app/after-gate/RefundRequestForm.tsx`), agreements
  (`AgreementControls.tsx`), reservations (`app/host/reservations/ReservationsBoard.tsx`),
  admin money decisions (`app/admin/_components/MoneyDecisions.tsx`). Some say
  what happens next, few say who is told, none shows what the other person
  will receive.
- **Change.** Spec section 15 (references 35 and 37): NEW
  `components/app/confirm/ConfirmPanel.tsx` (content only, rendered inside the
  existing dialog on desktop and lane A's `Sheet` on phones, neither changed):
  action-and-amount title, three-cell summary strip, itemised lines from the
  record's own line builders (`move-in-lines.ts`, `purchase-lines.ts`,
  `payment-copy.ts`), total, a success-tinted reassurance row only from
  `lib/money/copy.ts` constants or the record, "What happens next", the
  optional "What everyone gets" preview rendered from the real
  `lib/email/*-messages.ts` and `lib/push/*` builders (guest and host, or
  tenant and agent), and a foot line naming who is told. Adopt in the six
  places above; the primary repeats the action ("Pay N360,000", "Accept
  booking", "Approve payout").
- **Reduced motion.** The panel uses the sheet or dialog motion as it is; the
  panel itself has none.
- **Effort** L. **Lane** A (renders inside A's `Sheet`; does not edit it).

### 23. Outbound: share cards and emails written for the lock screen

- **Today.** Price Check's share image (`app/(app)/price/area/[id]/opengraph-image.tsx`,
  `components/app/price/ShareAreaButton.tsx`) and the share door image
  (`app/s/[token]/door-image.tsx`) are each drawn their own way. Email sender
  is already "Vallo" (`lib/email/client.ts`) and subjects are honest, but
  several are long for a phone: "A request to move your Vallo account to
  another email address" (62 characters), "Your listing was not published:
  {title}" (grows with the title) in `lib/email/messages.ts`; push titles and
  bodies (`lib/push/*`) have no length rule.
- **Change.**
  - Share cards, spec section 10: one `ShareCardFrame` used by both images
    and by an in-app share preview: 88px numeral, 10-segment meter with the
    band word, up to four checklist lines with round marks, the honest line
    (Price Check: "What similar places nearby are advertised for. Not a
    valuation."), a stat strip only when two or more real figures exist, logo
    lockup at the foot. Too few comparables: "Not enough to tell", no
    numeral.
  - Emails and push, spec section 11: subjects 45 or fewer, fact first;
    preheader 90 or fewer, adds the one missing fact; push title 40, body 110;
    long listing titles cut at a word boundary by a shared `fitSubject()` in
    `lib/email/render.ts`; a test walks every builder's fixture
    (`lib/email/fixtures.ts`) and fails over the limits. The email shell
    (`render.ts`) takes the paper tokens: `#F4F4F1` ground, white card,
    hairline, blue primary button. The same builders feed item 22's "What
    everyone gets" preview, so what is previewed is what is sent.
- **Reduced motion.** Static images and email.
- **Effort** L. **Lane** none.

---

## Motion and micro-interactions (lane A has routes, press, sheets, toast and tab ink; these are the rest)

### 24. The landing intro, shorter and sharper

- **Today.** `DepthWords` brings each hero word from depth and blur, 70ms
  apart, then the sub, the button and the search rise (`Hero.tsx`,
  `app/css/threshold.css`, `landing-rooms.css`); with eight words the
  headline takes over a second before the search can be used, and the plate
  does nothing on arrival.
- **Change.** Word stagger 45ms, each word 420ms `--nf-ease-entrance` with
  blur 6px to 0 (drop the blur under `data-motion-lite`); the sub, button and
  fact row rise 12px at 480ms starting at 300ms; the search at 420ms; the
  plate settles from `scale(1.04)` to 1 over 1200ms `--nf-ease-standard`
  (desktop only). Total under 900ms. Once per visit (`data-intro` as now).
- **Reduced motion.** Everything present at once; Calm: a 160ms fade only.
- **Effort** S. **Lane** none (lane A does not touch the landing intro).

### 25. One reveal, not two

- **Today.** Two reveal systems ship on one page: `components/motion/Reveal.tsx`
  (`MotionReveal`, most rooms) and `components/site/Reveal.tsx` (category
  tiles, community band), with different offsets and delays (category tiles
  delay `i * 40` with no cap).
- **Change.** `components/site/Reveal.tsx` becomes a re-export of
  `MotionReveal`. One spec: rise 16px and fade, 480ms `--nf-ease-entrance`,
  children stagger 50ms, at most six staggered (the rest arrive with the
  sixth), triggered once at 15% visibility; CSS `animation-timeline: view()`
  where supported, the IntersectionObserver fallback otherwise.
- **Reduced motion.** Shown at once; Off: shown at once; Calm: fade only.
- **Effort** S. **Lane** none.

### 26. Figures and bars that arrive once

- **Today.** `CountUp.tsx` counts the landing figures; nothing else animates a
  number, and there is no bar motion.
- **Change.** `SummaryCard` and `KpiTile` figures use `CountUp` (600ms, ease-out, from 0 on
  first view only, the server prints the final number so no-JS is correct);
  `StatusBar` segments grow with `scaleX` from 0, left origin, 620ms
  `--nf-ease-entrance`, 40ms apart; the legend fades in at 300ms; the
  gauge's ticks light in order, 12ms apart, 480ms in all; the line chart
  draws with `stroke-dashoffset` over 700ms (the one non-transform property
  allowed, on an SVG path only). A figure
  that changes live (a new request arrives) crossfades 160ms, never recounts.
- **Reduced motion.** Final number and full bar at once.
- **Effort** S. **Lane** none.

### 27. Hover and focus, one system for pointers

- **Today.** Landing cards lift 2px on hover; app cards, rows and buttons each
  have their own hover or none; focus rings vary between surfaces.
- **Change.** In the primitive CSS (`buttons.css`, `list-group.css`,
  `list-views.css` card class, `controls.css`), under
  `@media (hover: hover) and (pointer: fine)` only: pressable cards
  `translateY(-2px)` and `--nf-card-shadow-hover` at 160ms
  `--nf-ease-standard`; listing photos `scale(1.03)` over 600ms inside their
  clip; rows `--nf-surface-secondary` fill at 120ms; buttons one step brighter.
  Focus: one ring everywhere, 2px `--nf-focus-ring` at 2px offset, radius
  following the element, appearing instantly.
- **Reduced motion.** Colour and shadow change only, no translate or scale.
- **Effort** S. **Lane** A (press is A's `:active`; hover must not fight it:
  hover lift is removed while `:active` applies).

### 28. Save, unsave and remove

- **Today.** The heart changes colour; in Saved, "Remove" is a button under
  the card and the card vanishes with a layout jump.
- **Change.** `components/app/SaveControl.tsx`: on save the heart scales
  1 to 1.22 to 1 on `--nf-ease-spring` over 380ms and fills; on unsave it
  empties with no pop. In Saved, removing collapses the card: opacity to 0
  in 160ms, then `grid-template-rows: 1fr` to `0fr` over 240ms
  `--nf-ease-exit`, and lane A's toast offers "Undo" for 5 seconds (the
  toast component is A's; this item only calls it). Swipe-left on a Saved
  row reveals Remove on touch.
- **Reduced motion.** Instant fill, instant removal, the toast still offers
  Undo.
- **Effort** M. **Lane** A (uses A's toast).

### 29. The large title that folds into the bar

- **Today.** Headers do not respond to scroll in the app; the site header has
  `NavScrollState.tsx` for the landing only.
- **Change.** With `PageHeader variant="large"` (item 13): a scroll-driven
  animation (`animation-timeline: scroll()` on the page scroller, range 0 to
  56px) fades the large title from 1 to 0 and moves it up 8px, while the app
  bar's centred title fades in and the bar's bottom hairline appears
  (`app/css/chrome.css`, `.nf-app-header`). Where scroll timelines are
  missing, an IntersectionObserver on the title toggles a class with a 160ms
  fade.
- **Reduced motion.** The bar title and hairline switch at the threshold with
  no fade.
- **Effort** M. **Lane** A (chrome must not move during route transitions:
  the fold reads scroll only) and C (header height).

### 30. Disclosure: rows that open smoothly everywhere

- **Today.** The landing FAQ eases height and turns its chevron
  (`landing-rooms.css`); `components/app/Disclosure.tsx`, settings
  sub-sections and the host wizard's sections open instantly.
- **Change.** One disclosure motion in `list-group.css`: the panel animates
  `grid-template-rows: 0fr` to `1fr` with the content fading from 0 to 1 over
  240ms `--nf-ease-standard`, the chevron rotates 180 degrees on the same
  curve; built on `<details>` where possible (`interpolate-size:
  allow-keywords` where supported, the grid fallback otherwise).
  `Disclosure.tsx` and the landing FAQ share the class.
- **Reduced motion.** Instant open and close.
- **Effort** S. **Lane** none.

---

## The three builder buckets (no file in two buckets)

**Order.** Bucket 1 commits the tokens and primitive APIs (items 1 to 5)
first, as early as possible; buckets 2 and 3 start with the items that do not
need them (bucket 2: 6, 9, 12; bucket 3: the data and step logic of 14 and
21, the structure of 13 and 22) and code against the names in the spec,
which are fixed. Strings: each bucket adds i18n keys only under its own
namespaces in `packages/i18n/src/locales/en.ts` (`landing`, `landingRooms`,
`reel`, `home` are bucket 2's; every other namespace touched is bucket 3's;
bucket 1's copy lives in `lib/email` and `lib/push`) and rebases before
commit.

**Keep out of all three:** lane A's `components/motion/RouteTransition.tsx`,
`app/css/route-motion.css`, `app/css/press-motion.css`, `overlays.css`,
`components/ui/Sheet.tsx`, `components/ui/Toast.tsx`, the tab ink; lane B's
`components/ui/Skeleton.tsx`, `components/app/ScreenSkeleton.tsx` and every
`loading.tsx`; lane C's `(auth)` routes, `app/css/auth.css` and any breakpoint
or grid-column change.

### Bucket 1: System and outbound (items 1, 2, 3, 4, 5, 23, 26, 27, 30)

Owns: `packages/design-tokens/src/tokens.css`; `apps/web/src/app/css/`
`light.css` (except its landing rules, bucket 2), `theme.css`, `base.css`,
`typography.css`, `system.css`, `glass.css`, `controls.css`, `buttons.css`,
`chips.css`, NEW `list-group.css`; `components/ui/*` except `Sheet`, `Toast`,
`Skeleton` (includes `IconPlate`, `Button`, `Segmented`, `StatusBadge`,
`StatusPill`, NEW `ListGroup`, `SummaryCard`, `MetaStrip`, `InitialsTile`,
`KpiTile`, `charts/StatusBar`, `charts/TimeSeries`, NEW `charts/Gauge`);
`components/motion/CountUp.tsx`; `components/app/Disclosure.tsx` (item 30;
the one `components/app` file this bucket owns); `lib/email/**`;
`lib/push/**`; the share images (`app/s/[token]/door-image.tsx`,
`app/(app)/price/area/[id]/opengraph-image.tsx`, NEW `ShareCardFrame`);
`app/(dev)/preview/g1`. Commits items 1 to 5 first.

### Bucket 2: Landing, site and the renter home (items 6 to 12, 15, 24, 25)

Owns: `app/(landing)/**`; `components/site/**` (landing, header, footer,
`Reveal.tsx`, `NavScrollState.tsx`); `components/cinema/**`;
`components/motion/Reveal.tsx`, `DepthWords.tsx`, `useInView.ts`;
`app/css/landing.css`, `landing-rooms.css`, `cinema.css`, `site.css`,
`threshold.css` (hero rules only), the landing rules in `light.css`;
`lib/site/listing-card.ts`; the landing half of
`components/app/listing/example-notice.test.ts`; for item 15,
`components/app/home/**` and `app/css/home.css`; `app/(dev)/preview/f2` and
`f1/home`.

### Bucket 3: App, workspaces and admin (items 13, 14, 16 to 22, 28, 29)

Owns: `components/app/**` except `home/**`, `Disclosure.tsx`,
`ScreenSkeleton.tsx`; NEW `components/app/desk/*` (`DeskSidebar`,
`RangeSelect`), `components/app/status/StatusTrack.tsx`,
`components/app/confirm/ConfirmPanel.tsx`; `app/(app)/**` pages;
`app/host/**`, `app/agent/**`, `app/admin/**` (layouts, pages,
`_components`); `app/settings-rows.css`, `app/css/list-views.css`,
`catalogue.css`, `detail-m.css`, `threads.css`, `chrome.css`, `shell-m.css`
(surfaces only, never the dock's active-tab rules), `admin.css`, `agent.css`,
`stays.css`; `app/(dev)/preview/f3`, `f4`, `f5` and `f1` except `f1/home`.
Uses bucket 1's `ListGroup`, `SummaryCard`, `KpiTile`, `Gauge`, `Segmented`,
`StatusBadge` and item 23's message builders by name; never edits them.
