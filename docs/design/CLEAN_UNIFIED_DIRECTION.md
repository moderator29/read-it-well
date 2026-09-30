# Clean, unified: the design spec for every layer

Written 29 September 2026 on the founder's direction of that evening:
"follow it deeply ... clean unified looks ... wide platform sweep ... premium
icons ... from landing page to backend every single layer, consistency upgrade
in looks, icons, UX. Also dark mode (our system default) unified too."

**Governing images** (all in `docs/design/references/2026-09-29/`):

| File | Governs |
|---|---|
| `30-clean-light-desktop-builder.jpg` | Light mode, desktop: canvas, cards, hairlines, icon plates, section labels, segmented control, badges, three-pane workspace, page header |
| `31-clean-light-mobile-today.jpg` | Mobile: large title and date, icon buttons, summary card with big figure, segmented bar and dot legend, grouped list card with inset dividers, initials tiles, status dots, floating white bottom nav |
| `32-notification-lockscreen.jpg` | How our emails and push notifications read on a phone |
| `33-share-card-odds.png`, `34-share-card-review.png` | Share cards: big numeral, segmented meter with a word, checklist with round status marks, honest estimate line, three-column stat strip |
| `38-fixtrack-dashboard.png` | The workspace DASHBOARD: grouped sidebar with count badges, top bar, four KPI tiles, a pipeline gauge with a legend list, a line chart with a target line, "Needs attention", a schedule chart, a load list (section 13) |
| `36-fixtrack-live-job.png` | The LIVE STATUS page: record strip, the status stepper with timestamps, a checklist with times, a photo strip, the tinted "awaiting you" decision card, and "What the other side sees right now" (section 14) |
| `35-fixtrack-assign-modal.png`, `37-fixtrack-approve-extra.png` | The CONFIRM MODAL: glyph, title, one-line context, a three-column summary strip, itemised lines and a total, a reassurance row, "What happens next", "What everyone gets" message previews, a "who gets told" foot line, Cancel and one primary (section 15) |

The FixTrack references are photographed from a phone playing a video, so
their exact pixel values are not measurable; take their composition,
hierarchy and anatomy, and take every value from the tokens below.

This file is the build spec. `docs/UIUX_30_RECOMMENDATIONS_2026-09-29.md` is
the plan that applies it. `docs/DESIGN_DIRECTION.md` still governs everything
this file does not change; where the two disagree, this file is the later
ruling, **except the five standing rules in section 0, which this file does
not reopen.**

---

## 0. What stays exactly as it is (translate the references, never copy them)

1. **Brand blue is the one accent.** The references' green (primary button,
   active segment, "See all 8", toggle) becomes our `--nf-brand-primary`. Their
   red, yellow and grey priority colours become our state hues
   (`--nf-state-error`, `--nf-state-warning`, `--nf-content-muted`); their
   lilac "AI estimate" tint becomes `--nf-brand-tint-2`. No new hue enters the
   system.
2. **The logo and the icon set stay.** Nav chrome glyphs (dock, header,
   rail, drawer) stay BOLD; inner glyphs stay LEAN at 1.5px (shipped
   29 September). The glass objects (`BrandIcon`) stay for feature moments
   (landing, empty states, category tiles, success); rows and lists use the
   line-glyph plate in section 4.
3. **The shape law holds** (`DESIGN_DIRECTION.md` section 1, rule 4, and
   R-D). The references draw capsule badges, a capsule "Add node" button, a
   capsule segmented track and round header buttons. **Every one of those is
   translated to a rounded rectangle whose radius is at most 0.30 of its short
   side.** Allowed circles stay: avatars, status dots, round status marks in a
   checklist (they are shapes, not controls), meter segments, switch tracks.
   The round search and bell buttons of reference 31 become 44px rounded
   squares (the chat render already rules this; see open question Q1).
4. **The bottom nav has no container behind the active tab**, in either
   theme (founder, 29 September). Reference 31's green blob behind "Today" is
   NOT adopted. Active = filled glyph + brand label + heavier weight + 4px
   dot, as shipped.
5. **Honest data.** A figure prints only when the platform can answer for it.
   Examples say "Example". No invented counts on share cards, summaries or
   the landing. No em dashes in copy.

---

## 1. Surfaces, edges, shadows (the "paper" and the "night")

The references' whole feel comes from three moves: a canvas that is **not
white**, cards that **are** white, and edges drawn with **one hairline and a
barely-there shadow** rather than colour. Dark mode takes the same three
moves at night: a canvas, a card one step up, a hairline, and **no coloured
rim on ordinary cards**.

### 1.1 Token values

All in `packages/design-tokens/src/tokens.css`. Light values go in the
`:root[data-theme="light"]` block (line ~3524); dark values in the `:root`
block. Names marked NEW are added; everything else is a retune of an
existing token.

| Token | Light (was) | Light (new) | Dark (new) | Role |
|---|---|---|---|---|
| `--nf-surface-canvas` | `#FFFFFF` | `#F4F4F1` | `#000612` (keep) | The page ground. Warm off-white in light |
| `--nf-canvas-base` | `#FFFFFF` | `#F4F4F1` | keep | Same, for the shell |
| `--nf-surface-primary` | `#FFFFFF` | `#FFFFFF` | `#040A1F` | Cards, list groups, panels |
| `--nf-surface-secondary` | `#F6F7F9` | `#FAFAF8` | `#060D26` | Row hover, table head, header strip |
| `--nf-surface-elevated` | `#FFFFFF` | `#FFFFFF` | `#08102C` | Popovers, menus, sheets |
| `--nf-surface-raised` | `#F3F5F8` | `#F0F0EC` | `#0A1231` | Wells inside a card (the share card's inner panel, the "Test runs" block, a segmented track, the neutral icon plate) |
| `--nf-surface-inset` | `#EEF1F5` | `#ECECE7` | keep | Pressed wells, code, disabled fields |
| `--nf-card-border` NEW | | `rgb(17 19 24 / 0.08)` | `rgb(255 255 255 / 0.08)` | The one hairline on every card |
| `--nf-divider` | `rgb(11 13 23 / .09)` | `rgb(17 19 24 / 0.07)` | `rgb(255 255 255 / 0.07)` | Inset row dividers |
| `--nf-border-default` | `/0.12` | `rgb(17 19 24 / 0.12)` | keep `/0.13` | Inputs, secondary buttons |
| `--nf-border-strong` | `/0.22` | `rgb(17 19 24 / 0.20)` | keep | Focus-adjacent, selected outlines |
| `--nf-container-edge` | `rgb(11 13 23/.12)` | `var(--nf-card-border)` | **`color-mix(in oklab, var(--nf-electric-500) 20%, transparent)`** (was 70%) | THE NEON RIM. At 70% every settings group, profile row, listing card and inbox tab at night is outlined in bright blue (seen on `/preview/f4/settings`, `/preview/f4/profile`, `/preview/f3/search`). At 20% it is a hairline with a blue breath |
| `--nf-card-shadow` NEW | | `0 1px 2px rgb(17 19 24 / 0.04), 0 2px 8px -2px rgb(17 19 24 / 0.05)` | `none` | Resting card |
| `--nf-float-shadow` NEW | | `0 1px 3px rgb(17 19 24 / 0.05), 0 8px 24px -6px rgb(17 19 24 / 0.10)` | `0 8px 24px -8px rgb(0 0 0 / 0.6)` | Dock, header icon buttons, popovers, the floating search pill |
| `--nf-card-shadow-hover` NEW | | `0 2px 4px rgb(17 19 24 / 0.05), 0 10px 24px -8px rgb(17 19 24 / 0.10)` | `0 0 0 1px rgb(255 255 255 / 0.12)` | Desktop hover on a pressable card |

Contrast is re-measured on `#F4F4F1` AND `#FFFFFF` with
`apps/web/scripts/design/light/sweep.mjs`; every ink below must hold 4.5:1
on both.

| Ink | Light (new) | Dark (keep) | Use |
|---|---|---|---|
| `--nf-content-primary` | `#111318` | `--nf-mist-100` | Titles, row titles, figures |
| `--nf-content-secondary` | `#4A505A` | `--nf-mist-300` | Body, sub-lines |
| `--nf-content-subtle` | `#5C626C` | `--nf-mist-400` | Row sub-lines |
| `--nf-content-muted` | `#686E78` | `--nf-mist-500` | Section labels, meta, legends, "Edited 2 min ago" |

### 1.2 The glow budget (dark)

Glow is the brand at night, so it is rationed, not removed. **Allowed
to glow:** the primary button, the dock and its centre "+", the logo pill's
rim light, a selected segmented thumb, the focus ring. **Never glows:** a
card, a list group, a row, a chip, an icon plate, a badge, an input.
Implementation: `--nf-glow-scale` stays, and the card-level consumers of
`--nf-glow-*` and `--nf-panel-*` (the lit panel gradient) are pointed at
`--nf-surface-primary` + `--nf-card-border`. The `.nf-glass` ladder stays for
media overlays and the dock only.

### 1.3 Radii (all obey the 0.30 ratio)

| Token | Value | Where |
|---|---|---|
| `--nf-radius-card` NEW | `var(--nf-radius-lg)` 18px | List groups, summary cards, listing cards, panels |
| `--nf-radius-card-sm` NEW | `var(--nf-radius-md)` 14px | Node-size cards (ref 30's canvas cards), bento cells under 160px tall |
| `--nf-radius-well` NEW | `var(--nf-radius-md)` 14px | A well inside a card (inner panel of a share card: outer 24, inset 8, inner 16) |
| `--nf-radius-control` | 14px on 44px+ (keep) | Buttons, inputs |
| `--nf-radius-control-sm` NEW | 10px | Controls 32 to 40px tall (segmented thumb, small buttons) |
| `--nf-radius-badge` NEW | 6px | Badges 22 to 24px tall |
| `--nf-radius-plate` NEW | 10px on 36px, 12px on 44px | Icon plates, initials tiles |

### 1.4 Spacing rhythm

Existing scale, used this way (the references' calm density):

- Page gutter: 16px phone, 24px tablet, 32px desktop.
- Card padding: 16px phone, 20px desktop (`--nf-space-md` / 1.25rem).
- Between cards in a stack: 12px (`--nf-gap-row`). Between groups: 24px.
- Section label to its card: 8px. Title block to first card: 20px.
- Row: 12px vertical padding minimum, 12px between leading tile and text.

---

## 2. Type

The references set everything in one neutral grotesk at light weights, with
large figures at a REGULAR weight. Ours keeps Poppins for display and Inter
for everything else, re-weighted:

| Role | Face | Size / line | Weight | Tracking | Token |
|---|---|---|---|---|---|
| Landing display | Poppins | `--nf-text-display` | 700 (keep) | -0.03em (loosen from -0.035) | keep |
| Mobile large title ("Today") | Poppins | 30/36 | 600 | -0.02em | `--nf-text-title-lg` NEW |
| Desktop page title | Poppins | 24/30 | 600 | -0.015em | `--nf-text-h2` at 600 |
| Card title | Inter | 17/24 | 600 | -0.01em | `--nf-text-h4` |
| Row title | Inter | 15/20 | 500 | 0 | `--nf-text-row` NEW (0.9375rem) |
| Row sub / body-sm | Inter | 13/18 | 400 | 0 | `--nf-text-caption` |
| Section label | Inter | 11/14 | 600, UPPERCASE | 0.06em | `--nf-text-overline` + `--nf-tracking-label` NEW 0.06em |
| Hero figure (summary) | Inter | 40/44 | 500 | -0.03em, tabular | `--nf-text-figure` NEW |
| Share numeral | Inter | 88/88 | 500 | -0.04em, tabular | `--nf-text-figure-xl` NEW |
| Row value (price, amount) | Inter | 15/20 | 600 | tabular | `.nf-numeric` |

Rules: sentence case everywhere (buttons included: "Sign in", "Get started",
"Explore properties"); figures always `font-variant-numeric: tabular-nums`;
never more than three weights on one screen (400, 500 or 600, and 700 only
for the landing display).

---

## 3. Buttons (four levels, one per job)

| Level | Light | Dark | Height / radius | When |
|---|---|---|---|---|
| **Primary** | Solid `--nf-brand-primary`, white label, inner top 1px `rgb(255 255 255/.18)`, `--nf-card-shadow`. No gradient glow | `--nf-gradient-cta` + today's glow at `--nf-glow-scale` | 44 / 12 (48 / 14 for full-width) | ONE per view: "Publish", "Book inspection", "Save and test" |
| **Secondary** | White, `--nf-border-default`, ink label, `--nf-card-shadow` | `--nf-surface-elevated`, `--nf-card-border`, mist-100 label | 44 / 12 | "Save", "Run test", "Breakdown" |
| **Quiet** | No fill, brand ink label, hover `--nf-interactive-hover` | same | 36 to 44 / 10 | "See all 8", "Manage", row actions |
| **Icon** | 44 square, white, `--nf-card-border`, `--nf-float-shadow` on floating headers, glyph 20px lean | `--nf-surface-elevated` | 44 / 12 | Back, prev/next, search, bell |

Destructive = secondary with `--nf-state-error` label; confirmed destructive =
solid error. Files: `apps/web/src/app/css/buttons.css`,
`apps/web/src/components/ui/Button.tsx` (variants `primary`, `secondary`,
`quiet`, `icon`; `ghost` maps to `quiet`).

---

## 4. The icon plate (the references' soft squares)

The line glyph on a soft tinted square is the references' most repeated
object. Ours is `IconPlate` (`components/ui/IconPlate.tsx`, material
`.nf-plate` in `app/css/controls.css`). Version 2:

| Size | Box | Radius | Glyph | Use |
|---|---|---|---|---|
| `sm` | 36 | 10 | 18, stroke 1.5 | Rows, list items, node cards |
| `md` | 44 | 12 | 20, stroke 1.5 | Card heads, summary heads |
| `lg` | 56 | 14 | 24, stroke 1.5 | Empty states that do not use a glass object |

| Tone | Light fill / glyph | Dark fill / glyph |
|---|---|---|
| `neutral` NEW, **the default** | `--nf-surface-raised` / `--nf-content-primary` | `rgb(255 255 255 / 0.06)` / `--nf-mist-200` |
| `brand` | `--nf-brand-tint-1` / `--nf-brand-primary` | `--nf-brand-tint-2` / `--nf-brand-quiet` |
| `success` / `warning` / `error` / `info` | the state `-surface` token / the state ink | same tokens at night |
| `solid` NEW | `--nf-content-primary` / white (ref 30's black "Check order" tile: an external system or a done step) | `--nf-mist-100` / `--nf-ink-900` |

No rim, no inner light, no glow on any plate in either theme (the "lit glass"
material goes). Accent is rationed: a screen of rows is mostly `neutral`
plates; `brand` marks the one row that is the point of the screen.
Initials tiles (businesses, firms, listings without a photo) are the same box
with the initials at 13/600 in `--nf-content-primary`; **people stay round
avatars.**

---

## 5. Grouped list and rows (reference 31's "Chase first")

One white card holds the whole group; rows sit inside it with inset
hairlines. This replaces per-row cards and per-group neon rims.

```
section label (11 caps, muted)            quiet action ("See all 8")
+--------------------------------------------------------------+  card: surface-primary,
| [plate 36]  Row title 15/500                 Value 15/600     |  card-border, card-shadow,
|             Sub-line 13/400 muted       (dot) Status 13       |  radius-card, overflow clip
|            --------------------------------------------------|  divider inset to text column
| [plate 36]  ...                                               |
+--------------------------------------------------------------+
```

- Row min-height 60 (two lines) or 52 (one line); padding 12 / 16.
- Divider: 1px `--nf-divider`, starts at the text column (16 + 36 + 12 = 64px
  from the card edge), never full width, none after the last row.
- Trailing: value, then a status (6px dot + word, 13px), or a chevron
  (16px, `--nf-content-muted`), or a switch. Never two chevrons, never a
  chevron beside a switch.
- Hover (pointer only): row fill `--nf-surface-secondary`. Press: lane A's
  row press.
- Implementation: a `ListGroup` + `ListRow` pair in `components/ui/` over
  `.nf-list-group` / `.nf-list-row` in a new `app/css/list-group.css`, which
  `app/settings-rows.css` and `components/app/account/rows.tsx` then consume.

---

## 6. Badges, status dots and pills

| Kind | Anatomy | Shape | Example |
|---|---|---|---|
| **Badge** | 12/600 word, 8px side padding, 22 to 24 tall, state `-surface` fill, state ink | radius 6 (`--nf-radius-badge`) | "Live", "Draft", "To rent", "Example" |
| **Dot badge** | badge + 6px dot before the word | same | "Unpublished changes", "Needs more from you" |
| **Status dot** | 6px dot + 13px word, no fill | dot is a circle | "High", "Paid", "Awaiting reply" in a row's trailing slot |
| **Count** | 12/600 tabular on `--nf-brand-tint-2`, min 20x20 | radius 6 | Unread "2" |
| **Meta strip** | 13px muted items separated by 1px vertical hairlines, inside one `--nf-card-border` box | radius 12, height 36 | ref 30's "12 nodes / 4 conditions / Edited 2 min ago"; our "7 properties / sorted by recommended" |

The Example badge (the `isDemo` disclosure, word "Example", never "demo" or
"sample") uses the neutral tone: `--nf-surface-raised` fill,
`--nf-content-secondary` ink, and a 12px outline glyph. Files:
`components/ui/StatusBadge.tsx`, `StatusPill.tsx` (both converge on these
four kinds), `app/css/chips.css`, `small-badge-shape.test.ts` (keeps the
shape guard).

---

## 7. Segmented control

`components/ui/Segmented.tsx` (it already measures and slides its thumb).
Two variants:

| Variant | Track | Thumb | Label on / off | Use |
|---|---|---|---|---|
| `quiet` (default) | `--nf-surface-raised`, 4px inset, radius 12, height 40 | white (light) / `--nf-surface-elevated` (dark), `--nf-card-shadow`, radius 10 | ink 500 / muted 500 | Filters and views: Property/Stays in the inbox, Buy/Rent/Stay in the landing search, list/map |
| `solid` | same | `--nf-brand-primary`, white label, glow at night | white 600 / muted 500 | The one page-level mode switch: Setup / Configure / Test in a workspace editor |

Thumb slides 240ms `--nf-ease-standard`; under reduced motion it jumps.
Counts inside a segment are tabular 12px muted.

---

## 8. Page headers

### 8.1 Mobile (reference 31)

Below the app bar (hamburger, logo, bell: chrome, unchanged and bold), a
**large-title block**:

- Title 30/36 Poppins 600, then one sub-line 15px `--nf-content-muted`
  (a date on dashboards, a count or place elsewhere: "Tuesday 29 September",
  "4 places saved", "Lekki, Lagos").
- Up to two 44px icon buttons (rounded squares, section 3) right-aligned on
  the title's first line, `--nf-float-shadow` in light.
- 8px above, 20px below. No card around it.
- On scroll the large title fades and the app bar gains the title at 15/600
  (motion item M6 in the plan).
- Component: `components/app/PageHeader.tsx` gains `variant="large"` with
  `title`, `sub`, `actions`.

### 8.2 Desktop and workspaces (reference 30)

A 72px strip with a bottom `--nf-divider`:

- Left: back icon button (when there is a parent), then a two-line block:
  breadcrumb 13px muted with a middle dot separator ("Agent · Listings"),
  title 22/600. A dot badge may sit after the title ("Draft", "Unpublished
  changes").
- Right: prev/next icon buttons when paging records, then secondary
  buttons, then ONE primary. 8px between buttons, 16px before the primary.
- The strip is `--nf-surface-primary` in light over the warm canvas, so the
  workspace reads as a white frame on paper.

### 8.3 Workspace frame (reference 30's three panes)

For host, agent and admin desks at 1024px and above:

| Pane | Width | Surface | Content |
|---|---|---|---|
| Sidebar (reference 38) | 232 (88 collapsed to icons) | `--nf-surface-primary`, right divider | Desk switcher at the top (logo plate, desk name, the account's business or firm name, chevron). Groups under `.nf-label` headings: MAIN (the desk's records), OPERATIONS (calendar, reports, team), ACCOUNT (messages, settings). Row: bold 20px nav glyph, 14/500 label, a trailing `count` badge only when the count is real and non-zero (unread, pending requests). Active = filled glyph + brand label + 600 weight + the 4px dot, **no container** (the dock law; reference 38's grey tint is not adopted). The person block (avatar, name, email) sits at the foot |
| List | 320 | `--nf-surface-primary`, right divider | Scope picker (select), search field, collapsible groups (section label + count + chevron) of small cards |
| Main | fluid | `--nf-surface-canvas` (dotted grid only on true canvases) | The record |
| Inspector | 400 | `--nf-surface-primary`, left divider | Section labels, fields, a solid segmented at the top, the primary action pinned at the foot, full width |

Below 1024px the list becomes the page and the inspector becomes a sheet
(lane C owns the breakpoints; this spec only names the panes).

---

## 9. Summary card and segmented bar (reference 31's top card)

```
Label 13 muted                                   [badge]
40px figure, tabular
One sentence 14 secondary: what the figure means.
[==== bar segment ====][== segment ==][= seg =]      6px tall, 4px gaps
(dot) 3 high   (dot) 4 medium   (dot) 1 low          12px legend
```

- Segments are proportional to real parts and each carries its own state
  or brand tint; 6px tall, radius 3 (a shape). Legend dots match.
- Component: `components/ui/SummaryCard.tsx` NEW, with the bar as
  `components/ui/charts/StatusBar.tsx` (exists; restyle to this).
- Where it goes: the listing's move-in total (rent, caution, agency, legal,
  agreement as the segments), a host's or agent's "Today", Price Check's
  result, a booking's total.

---

## 10. Share cards (references 33 and 34)

Rendered as Open Graph images and in-app share sheets.

```
+----------------------------------------------+  outer: radius 24, white (light) or
| Title 20/600                    [badge]      |  #040A1F (dark), 8px frame
| +------------------------------------------+ |  inner well: surface-raised, radius 16
| | 88px numeral        [||||||||..] meter   | |
| |                     Word · qualifier     | |
| | (o) Check line 15                         | |  round marks 24px: success solid,
| | (o) Check line                            | |  warning solid, pending outline
| | (!) Missing line                          | |
| | Honest line 13 muted.                     | |
| | +------------+-------------+-----------+ | |  stat strip: card-border box,
| | | Label 12   | Label       | Label     | | |  radius 14, 1px vertical dividers
| | | Value 15   | Value       | Value     | | |
| | +------------+-------------+-----------+ | |
| +------------------------------------------+ |
|  Vallo logo lockup, small, bottom left        |
+----------------------------------------------+
```

- Meter: 10 segments, each 10x28, radius 5, 4px gaps; filled
  `--nf-brand-primary`, empty `--nf-wash-3` (light) or
  `rgb(255 255 255 / 0.12)` (dark). The word after it is the band ("High",
  "Typical", "Not enough to tell").
- The honest line is mandatory whenever the numeral is an estimate: e.g.
  "What similar places nearby are advertised for. Not a valuation."
- A stat strip cell prints only a figure the platform can answer for; with
  fewer than two real figures the strip is left out (the landing's rule).
- Where: Price Check (`app/(app)/price/area/[id]/opengraph-image.tsx`,
  `components/app/price/ShareAreaButton.tsx`), share doors
  (`app/s/[token]/door-image.tsx`), public profile share, agent standing.

---

## 11. Emails and notifications (reference 32)

What arrives on the lock screen is: **sender, subject in bold, one line of
preheader.** Everything is written for that view.

- **Sender name is "Vallo"** (already `DEFAULT_FROM` in
  `lib/email/client.ts`). So the subject never needs "Vallo" to say who is
  talking; it may still name "your Vallo account" when the account is the
  subject.
- **Subject: the fact first, 45 characters or fewer, sentence case, no
  full stop, no emoji.** "Inspection booked for Sat 4 Oct", "Payment
  received from Tunde", "Your listing is live". Anything past about 45
  characters is cut on a phone. Today's "A request to move your Vallo account
  to another email address" (62) becomes "Your email address is changing".
- **Preheader: one sentence, 90 characters or fewer, says the one thing the
  subject does not.** Never repeats the subject. Ends with a full stop.
  "2:00 pm at 14 Admiralty Way. The agent is Tunde Adebayo."
- **Push:** title 40 characters or fewer, body 110 or fewer (two lines),
  same rules; a count goes in the body ("3 new replies"), never the title.
- Security messages keep their rule: no code or link in a subject or
  preheader that grants access (the password reset rule in
  `lib/email/messages.ts`).
- A test pins it: every builder in `lib/email/*-messages.ts` and
  `lib/email/messages.ts` returns `subject.length <= 45` and
  `preheader.length <= 90` for its fixture.

---

## 12. Dark mode, unified

The night is the default and gets the same system, not a different one:

| Thing | Night today | Night after |
|---|---|---|
| Card edge | 70% electric rim on every card | `--nf-container-edge` at 20% + `--nf-card-border` |
| Card fill | Lit panel gradient | Flat `--nf-surface-primary` (`#040A1F`) |
| Row icons | Lit blue glass plates with rim and glow | Neutral plate `rgb(255 255 255/.06)`, mist glyph; `brand` only for the one row that matters |
| Buttons | Several glowing | One glowing primary per view |
| Section labels | Mixed sizes, sentence case | 11px caps muted, as in light |
| Chips | Glowing outlines | Quiet segmented or neutral chips, no rim |

Photography, the dock, the logo, the hero and the flip keep their glass and
glow. Everything is one token set that answers in both themes, so a builder
never writes a `[data-theme]` rule for a card, row, plate or badge.

---

## 13. The workspace dashboard (reference 38)

The first screen of every desk at 1024px and above. On a phone the same
content stacks in the reference 31 order (large title, summary card, "Needs
attention" group, the rest as cards).

**Top bar** (64px, bottom `--nf-divider`, over the main and inspector panes):
search field left (`Search reservations, guests or rooms`, 40px, radius 12,
`--nf-surface-raised`); right: a range select ("Last 30 days", a quiet
select with a calendar glyph), "Filter" (secondary, small), the bell, ONE
primary ("New listing", "Add a room", "New ticket").

**KPI tiles** (a row of four, 12px gaps, two by two under 1024px):

```
+----------------------------------------+
| [glyph 14] LABEL (11 caps muted)    [↗] |   ↗ = 32px quiet icon button to the list
| 28  open (13 muted)                     |   figure: --nf-text-figure at 32px
| [▲ 12%] vs last 30 days (12 muted)      |   delta: count-style badge, success/error tint
+----------------------------------------+
```

- A tile is a door: the whole tile links to the filtered list.
- **The delta chip prints only when the same query answers for the previous
  period.** No previous period (a new desk, a new metric), no chip; never a
  made-up trend. Direction is a lean arrow glyph plus the word, never colour
  alone.
- A tile whose figure is zero still shows (0 is true), with the delta hidden.

**Pipeline gauge card:** a half-ring of 24 radial ticks (each 3x14, radius
1.5, a shape) coloured by stage, the total in the middle (`--nf-text-figure`,
label under it), then a legend list: dot, stage name 13/500, one muted
sub-line ("12 requests, oldest 3 h ago"), share on the right, tabular. Stages
are the record's real statuses (section 13.1). Built as SVG in
`components/ui/charts/Gauge.tsx` NEW; colours from `components/ui/charts/palette.ts`.

**Line chart card:** `components/ui/charts/TimeSeries.tsx` (exists) restyled:
1.5px brand line, 4px points only on hover, a dashed `--nf-content-muted`
target line when a target exists in the product (a response-time promise, a
review deadline), a hover band `--nf-brand-tint-1`, a dark tooltip
(`--nf-surface-inverse`, white 12px, radius 10) in both themes. Axis labels
11px muted, no gridlines but the baseline.

**"Needs attention" list:** a `ListGroup` inside a card: tinted plate by
kind (error for urgent, warning for waiting on someone, neutral otherwise),
title 14/500 ("Late check-out request · Room 204"), muted sub-line (who and
how long ago), trailing badge ("Urgent", "Reassign", "Waiting"). Foot row:
quiet full-width "View all 12 flagged" with a chevron.

**Schedule bar card** (reference 38's "Today's schedule"): vertical bars on a
`--nf-surface-raised` capacity track, filled brand (or warning when over
capacity), the count inside the bar's foot in white 12/600, time windows
under. Only where the desk has scheduled items (inspections, arrivals).

**Load list card:** rows with avatar or InitialsTile, name, a 4px progress
bar (brand, warning past 90%) and the percentage, tabular. Only where the
product knows capacity (a host's rooms occupied tonight, an agent firm's
inspections per agent this week).

### 13.1 What each desk's dashboard shows (real data only)

| Desk | Where | KPI tiles | Gauge (stages) | Chart | Needs attention | Schedule / load |
|---|---|---|---|---|---|---|
| Host | `app/host/page.tsx`, `app/host/reservations/board.ts` | Arriving today, Staying tonight, Requests waiting, Unread messages | Reservations by status (requested, confirmed, checked in, completed) from `board.ts` | Nights booked per week, only with 4 or more weeks of bookings | Requests past the reply window, arrivals without a confirmed time, drafts blocking go-live | Arrivals by time window today; rooms occupied tonight |
| Agent | `app/agent/dashboard/RealDashboard.tsx` | Live listings, Inspection requests, Agreements to confirm, Unread | Listings by status (draft, in review, live, paused) | Enquiries per week, only with 4 or more weeks | Inspection requests unanswered, listings returned from review, agreements awaiting you | Inspections by time window today; per-agent load for firms (`app/agent/firm`) |
| Admin | `app/admin/_components/ConsoleOverview.tsx`, `OverviewView.tsx`, `metrics.ts`, `RangeSelect.tsx` | Queue open, Reviews due, Money decisions, Alerts | Queue by stage (`due.ts`) | The metrics `metrics.ts` already computes, with the SLA as the target line when one exists | The oldest due items across lanes | Staff load where assignments exist |

When a desk has nothing in a card's source, the card is left out, not drawn
empty with zeros; the dashboard reflows.

---

## 14. The live status page (reference 36)

For any record that moves through steps while two sides watch: a booking, a
viewing (inspection), an agreement, a payout, a refund.

**Record strip:** one card with a `.nf-label` title ("BOOKING VB-1842 · FROM
REQUEST ..."), then a row of label/value cells separated by hairlines:
Status (a dot badge), Counterpart (avatar + name), a time ("Checked in
since"), Amount, Elapsed. Values 14/600, labels 11 caps muted.

**The status stepper** (`StatusTrack`, NEW in `components/app/status/`):

```
(✓)━━━━━━━━(✓)━━━━━━━━(●)┈┈┈┈┈┈┈┈( )
Reserved     Paid       Arrival    Completed
10:02        10:06      4 Oct      -
```

- Nodes 20px: done = solid brand circle with a white check; current = brand
  ring with a filled centre and a 4px `--nf-brand-tint-2` halo; upcoming = a
  1.5px `--nf-border-strong` ring. A cancelled or failed step is the error
  hue with a cross, and the track after it is not drawn.
- Connector 2px: brand between done nodes, dashed muted after the current
  node.
- Label 13/500 under each node (current in brand, 600); time 12 muted
  tabular under that, "-" when not happened. **Times only from real state
  events** (`components/app/threads/booking-steps.ts` already derives them
  and never invents one).
- Header row: `.nf-label` "LIVE STATUS" left, "Updated 6 min ago" right,
  muted.
- Under 640px the track turns vertical: nodes down the left, label and time
  to the right, same states.
- Step sets (the keys exist or map from existing enums):

| Record | Steps | Source |
|---|---|---|
| Stay booking | Reserved, Paid, Arrival day, Completed (the four `booking-steps.ts` already derives; add a step only when a real state event backs it) | `booking-steps.ts`, `app/(app)/bookings/[bookingId]/BookingDetailCard.tsx`, `components/app/threads/BookingFace.tsx` |
| Viewing | Requested, Confirmed, On the day, Inspected, Report filed | `components/app/plans/InspectionsBoard.tsx`, `app/(app)/inspections/gate` |
| Agreement | Drawn up, You confirmed, They confirmed, Vallo approved, Payment open | `components/app/agreements/status.ts`, `AgreementControls.tsx`, `PaymentGate.tsx` |
| Payout / refund | Requested, Approved, Sent to bank, Received | `app/host/earnings`, `app/agent/earnings/EarningsWorkspace.tsx`, `components/app/after-gate/RefundRequestForm.tsx` |

**Checklist card:** `.nf-label` title with "3 of 5" right; rows with a 18px
rounded-square checkbox (radius 5), label 14, time right 12 muted; an
undone next item carries "now" in the warning ink. Used for check-in
steps, a host's go-live list ("17 things still to add"), a viewing report.

**The decision card ("awaiting you"):** the one place a warm tint appears:
`--nf-state-warning-surface` fill, no border, radius 18. `.nf-label` "AWAITING
YOU" plus time; the quoted request in a white inner well; photos if any;
itemised lines (label left, amount right, tabular), a hairline, the total
17/700; ONE primary (full width) and two secondaries side by side ("Ask a
question", "Decline"). In light the tint is the warning hue at 10%; at night
at 14%.

**"What the other side sees right now":** a card with `.nf-label` title,
holding a scaled (0.9) rendering of the counterpart's own status card (their
badge, their headline, their sub-line), and a foot line with a check glyph:
"Sent automatically. Nothing for you to write." This is a render of the real
component the other side sees, with the real record, never a mock.

---

## 15. The confirm modal (references 35 and 37)

Every consequential action confirms in the same panel: pay rent, pay for a
stay (checkout), accept or decline a booking request, sign an agreement,
approve a payout, request a refund, publish a listing, assign a viewing.

```
+-----------------------------------------------------+  width 480, radius 20,
| [plate 36] Title 17/600                          [x] |  surface-elevated,
|            One line of context 13 muted            |  float-shadow
| +-------------+---------------+-----------------+  |
| | LABEL       | LABEL         | LABEL           |  |  summary strip: raised well,
| | Value 14    | Value         | Value           |  |  radius 14, hairline dividers
| +-------------+---------------+-----------------+  |
| Line item                                  N280,000 |  itemised: 14 / tabular right
| Line item                                   N80,000 |
| ---------------------------------------------------- |
| Total                                    N360,000   |  17/700
| [✓ Reassurance line, success tint]                  |  e.g. "Paid straight to their bank"
| WHAT HAPPENS NEXT                                    |
| [glyph] Step one, in a sentence                     |  16px lean glyphs, 13/400
| [glyph] Step two                                    |
| WHAT EVERYONE GETS              (optional, below)   |
| ---------------------------------------------------- |
| Who gets told, 12 muted        [Cancel] [Primary]   |  foot: hairline above
+-----------------------------------------------------+
```

- **Title is the action and the amount**: "Pay N360,000 to Tunde Adebayo?",
  "Accept Seyi's booking?", "Sign the agreement?".
- **Summary strip:** three facts that identify what is being confirmed
  (Counterpart, Dates or Place, Method).
- **Itemised lines come from the record** (`move-in-lines.ts`,
  `purchase-lines.ts`, `app/(app)/checkout/[bookingId]/CheckoutSummary.tsx`,
  `payment-copy.ts`), never retyped.
- **Reassurance row** only states a product fact, from `lib/money/copy.ts`
  (`NO_CUSTODY_SENTENCE`, `PAYMENT_GATE_SENTENCE`) or the record ("Inside the
  free cancellation window until 2 Oct"). Success tint, check glyph. Never a
  promise the product does not keep.
- **What happens next:** two or three steps, each a sentence, in the order
  they happen.
- **What everyone gets** (reference 35): for actions that notify others, a
  card per recipient (avatar, name, role, channel badge "Email + app",
  "App"), holding the exact text they will receive, rendered from the same
  builders as the real email and push (`lib/email/*-messages.ts`,
  `lib/push/*`), so the preview cannot drift from what is sent. Editable only
  where the product lets the sender add a note.
- **Foot:** "Tunde and Seyi are told at once." left; Cancel (secondary) and
  ONE primary right. The primary repeats the action ("Pay N360,000",
  "Accept booking").
- Phone: the same content in a bottom sheet (lane A's `Sheet`), the foot
  pinned with the safe area.
- Component: `components/app/confirm/ConfirmPanel.tsx` NEW (content only;
  it renders inside the existing `Sheet` or dialog, which it does not
  change).

---

## 16. Open questions for the founder (defaults chosen so nothing waits)

- **Q1. Round header buttons.** Reference 31 draws the search and bell as
  circles. The shape law allows circles only for the landing search glyph.
  Default: 44px rounded squares. A "yes" makes the two header icon buttons
  circles and nothing else.
- **Q2. The navy top block in light** (`app/css/light.css`, "THE NAVY TOP
  BLOCK" and "THE HOME TOP BLOCK", reference 05). Reference 31 has no dark
  band. Default: the band stays on Home only (its photo hero needs the
  night), and every other light screen starts on the warm canvas. It is one
  selector either way.
- **Q3. Glass objects on navy tiles in light** (`light.css`, "THE GLASS
  OBJECTS IN DAYLIGHT"). Default: they stay on landing feature cards but the
  tile shrinks from about 100px to 64px so the card reads as white paper;
  rows never use a glass object.

**Decided by the lead (29 September 2026; the founder asked for no questions,
"follow it deeply"):**

- **Q1: yes.** The two header icon buttons (search and bell, and their
  workspace twins) are 44px circles, white on the warm canvas in light, a
  raised surface in dark, soft shadow, as in reference 31. Nothing else
  becomes a circle.
- **Q2: the founder widened it (29 September): "use it in many other areas
  that would make it lovely".** The navy band is the light theme's one
  signature moment, used as a HERO BLOCK at the top of the screens that open
  a world or carry a headline number, never as a full-page fill and never on
  forms or dense lists: Home; the host and agent workspace home (the KPI row
  sits on it); the profile and trust hero (the person and their tier); the
  money and earnings summaries (the big figure); the booking, stay and
  agreement live-status headers (the stepper's top); the landing hero and the
  landing app band; success moments. Settings, search results, inbox,
  threads, forms and admin tables stay on the warm canvas. One shared class,
  the same navy, radius and inner spacing everywhere, glass-free, with white
  type and the brand-blue accent at the one action it holds.
- **Q3: flat, not glass.** Landing feature cards use the flat icon plate
  (section 4) like every other surface, so the whole platform reads as one
  family. The glass objects retire from light mode.

## 17. Founder references 44 and 45 (30 September): these override earlier shape rules

The founder asked for every screen to fit the style of refs 44 and 45 in both themes. Where this section conflicts with sections 0 to 16, this section wins:

- **Pill buttons.** Primary and secondary buttons are full pills: the primary filled in brand blue, the secondary white (in light) or a raised night surface (in dark), with a soft shadow. The capsule ban on controls is lifted for buttons.
- **Round header buttons.** Back, search, bell, more and similar buttons are 44px white circles with a soft shadow (Q1, extended to back and more).
- **The soft top.** Light screens open on a soft lavender-white gradient behind the header, fading into the warm canvas. Dark screens get the same shape as a faint night glow.
- **Centred hero figures.** A screen's one headline figure (a total, a score or a balance) sits centred, large, with a muted caption above and a quiet sub-line under.
- **Round coloured icon plates in list rows.** Rows may use a ROUND plate tinted in one of the palette tones, as in ref 44's AI rating list. Settings-style utility rows keep the neutral square plate; content rows (ranking, stats, categories, notifications) use the round tinted plate.
- **Figure tiles.** A 2x2 grid of white tiles, each with a label and chevron, a big number, and a small coloured delta or sub-line (the delta only where a real previous value exists).
- **The dock.** The active tab is a tinted pill with its icon and label; inactive tabs are icon only; the glyphs are solid cutout shapes (ref 45). This replaces section 16's "no container behind the active tab".
- **Notifications** read as ONE grouped list with inset dividers, not separate cards.
