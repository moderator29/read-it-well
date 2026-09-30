# Integration QA, 30 September 2026

A platform re-audit after nine engineers landed the clean unified redesign in
parallel (PR #74, branch `claude/vallo-production-audit-a2dgqs`). Scope: the
landing page, the first-run flow, the member app, the host and agent desks
and the admin console, in dark (the default) and light, at 360, 390 and 430
wide, iPad portrait (820 x 1180) and landscape (1180 x 820), and desktop
(1440 x 900). Governing documents: `docs/design/CLEAN_UNIFIED_DIRECTION.md`,
`docs/UIUX_30_RECOMMENDATIONS_2026-09-29.md`, references 30 to 41, and the
founder's light references 44 and 45 (added during the sweep).

## How it was checked

A headless Chromium crawler, run against the shared dev server, loaded each
route per theme and width, then recorded:

- elements that cross the viewport edge with no clipping ancestor below the
  root (`tests/_overflow.mjs`; `scrollWidth` cannot fail here because the
  root clips);
- text whose computed ink against its computed ground falls under 4.5:1
  (3:1 for large text), skipping text on photographs and gradients;
- text clipped inside an `overflow: hidden` box with no ellipsis;
- one bordered box wrapping another of the same size (double borders);
- the border radius of every card-like container;
- every pseudo-element running an edge-light animation (`nf-edge-*`,
  `nf-logo-lap`) and its host;
- console errors, warnings and page errors.

Every page was also screenshotted and read by eye. The signed-in member used
the QA account with a fresh sign-in per batch, which clears the passcode
layer. The admin console stops at the security-key step-up, which a headless
browser cannot pass, so the console and the host and agent desks (the QA
member has no workspace) were read through the preview harness
(`/preview/f5/*`, `/preview/g1`, `/preview/cards`).

Routes read: `/`, `/welcome` (fresh and returning device), `/sign-in`,
`/help`, `/home`, `/search`, `/stays`, `/saved`, `/bookings`, `/messages`,
`/notifications`, `/settings`, `/profile`, `/price`, `/agreements`,
`/payments`, `/assistant`, `/around`, `/support`, `/restaurants`, a listing,
a stay, `/admin/*` (step-up door only), and the previews
`f5/admin-overview`, `f5/admin-queue`, `f5/agent-dashboard`,
`f5/agent-listings`, `f5/agent-earnings`, `f5/host-landing`, `f5/confirm`,
`g1`, `cards`.

No route had horizontal overflow at any width in either theme. No hydration
warnings appeared.

## Fixed

| # | What was wrong | Fix | Commit |
|---|---|---|---|
| F1 | The large page title (`PageHeader variant="large"`, new in this PR) set `overflow-wrap: anywhere` in a row that could not wrap, so with a back square and a text action beside it "Notifications" broke as "Notification / s" at 360 to 430. The inline header had already fixed exactly this; the new variant lost it | The row wraps, the text block is never narrower than its longest word (`min-width: min(100%, min-content)`), the title breaks only between words, and the action takes its own right-aligned line when the three cannot share one | `2172c441` |
| F2 | Unread notifications drew the selected edge and its glow: a bright blue rim round every unread card, in both themes (spec 1.1 and 1.2: a card never takes a coloured rim or a glow) | Unread is the dot, the title at full weight and primary ink; hover is `--nf-card-shadow-hover` | `2172c441` |
| F3 | Two header sizes for section openers: Settings, Saved, Plans and Notifications opened on the 30px large title, Agreements and Price Check on the smaller inline title | Agreements and Price Check use `variant="large"` | `2172c441` |
| F4 | The inline header centred its back square on the whole title and subtitle block, so with a two or three line subtitle the square sat BELOW the title's line (Restaurants, Price Check area, Stays search, rent and tenancy pages) | With a subtitle the row aligns to the top and the title's first line is centred on the 44px square (`lh` unit, falls back to no offset) | `fccfa8cd` |
| F5 | The member rail and drawer drew the current row as a lit glass pill with a glow, while the host, agent and admin sidebars had moved to spec 8.3 (brand ink at 600, a 4px dot, no container). The platform had two rail languages, and the pill broke the glow budget | The member rail takes the desks' rule | Landed inside `2ac4b48f` (another engineer's path commit on `shell-m.css` carried the edit while it was uncommitted); the dark-ink follow-up is in `6b2b69c5` |
| F6 | At night the current rail label in `--nf-brand-primary` measures 4.3:1 on the canvas, under AA for 14 to 15px text, in the member rail, `DeskSidebar` and the console rail | At night the label and glyph take `--nf-content-link` (about 7:1); the dot keeps the brand (a shape, 3:1 bar) | `6b2b69c5` |
| F7 | Desk and console count badges were brand-primary on `--nf-brand-tint-2` at night, 4.2:1 | Link ink at night | `b561cf35` |
| F8 | The site footer's column labels (Product, Company, Support, Stay connected) were brand blue while every other section label on the landing and in the app is the muted 11px caps label (spec 2) | Muted ink | `a30e26dd` |
| F9 | `npm run lint` failed on a committed `no-console` error in `src/lib/i18n/review-status.test.ts` (its coverage report is its output) | Marked deliberate with a reasoned disable | `1d1904bc` |

## The moving edge light: the ruling

Spec 1.2 rations glow: allowed on the primary button, the dock and its "+",
the logo pill's rim light, a selected segmented thumb and the focus ring;
never on a card, a list group, a row, a chip, a plate, a badge or an input.
The lead's Q2 ruling adds the hero band. So the edge light belongs on:

- the landing's capsules (`.nf-edge-lap`: the header capsule, the hero
  eyebrow, the closing plate) and the landing app band;
- hero bands (`.nf-hero-band`: Home, host and agent workspace homes,
  payments and earnings summaries);
- the dock capsule, its round More button and its "+", and the logo.

What the crawler found drawing it today, beyond that list:

- `.nf-summary` (every `SummaryCard`, including the listing's move-in total
  card `.nf-detail-movein-card` and three cards on `/preview/g1`) runs the
  `edge-m.css` long and side runners. A summary card is a card: it should
  not.
- `edge-m.css` still targets `.nf-panel`, `.nf-door`, `.nf-shelf-square` and
  every full-size `.nf-btn` (secondary included). The crawler saw no runner on
  ordinary cards in the routes read (those surfaces have mostly moved to the
  list group and card primitives), but the selectors remain live for any page
  that still uses them.

Decision: keep the light on capsules, hero bands, the dock and the logo; take
it off `.nf-summary`, `.nf-panel`, `.nf-door`, `.nf-shelf-square`, and every
button except the one primary. **The gap-closer engineer owns this change**
(the lead's assignment during this sweep), so this document records the
ruling and the evidence, and does not edit `edge-m.css`.

## Checked and correct

- **Get started once (`/welcome`).** A new device opening `/home` is sent to
  `/welcome?next=...` and lands on the "Sign in to open that page" choice.
  After that the `vallo_first_run` cookie is set: `/welcome` opens on the
  closing choice ("Ready when you are.") and `/home` goes straight to sign in.
  Both themes, no console errors. The landing's Get started goes to
  `/sign-up?next=/search` directly, by design. The slides stay one dot away
  from the choice (swipe, keys and dots move back), as the plan says.
- **Back.** Tapping a listing on Home and pressing Back reads "Back to Home"
  and lands on `/home`. Cold notifications and cold threads land on their
  parents (the `back-destinations` spec's cold section passes). No route
  reloads itself: one document load per route; the extra main-frame
  navigation events are same-document URL replaces.
- **Contrast.** Apart from F6 and F7, every flagged pair was a false positive
  on inspection: white words on photographs (landing categories, listing
  badges over the hero photo) and white labels on brand-filled thumbs and
  pills.
- **Radius census.** Cards are 18px (`--nf-radius-card`) or 14px
  (`--nf-radius-card-sm`) on every route read; the share card frame on
  `/preview/cards` is 22px, which spec 10 draws deliberately.
- **Passcode lock** inverts its top block by theme (a light cap at night, the
  navy cap in daylight). That is the doors' documented rule
  (`passcode.css` header), not a leak.

## Open

| # | Where | What | Owner |
|---|---|---|---|
| O1 | `edge-m.css` | The edge light still runs on `SummaryCard` and remains wired to panels, doors, shelf squares and secondary buttons (see the ruling above) | Gap-closer |
| O2 | `/admin/queue` (`/preview/f5/admin-queue`) | Two filter languages on one screen: brand-filled lane tabs ("All 42", "Listings 18") over brand-filled status chips ("All", "Pending"). Spec 7 asks for the quiet segmented control for filters | Console |
| O3 | `/around` | The feed's floating "+" sits just above the dock's own "+", two create buttons a thumb apart | Feed |
| O4 | `/assistant` | Next warns that `/brand/vallo-wordmark(-light).png` has one dimension changed by CSS without the other set to `auto` | Assistant |
| O5 | Listing, stays, saved, home | Next's LCP warning: the first photo above the fold is lazily loaded (`loading="eager"` or `priority` wanted) | Performance |
| O6 | `/messages` (once) | "Can't perform a React state update on a component that hasn't mounted yet" appeared on one dark load and did not reproduce in three further loads. Likely a race with the unread-count subscription during a hot reload; worth a look if it returns | Messages |
| O7 | Gates | `npx tsc --noEmit` reports 12 errors and `npm run lint` 5 errors, all in other engineers' uncommitted work at the time of the sweep (`src/app/host/decide/page.tsx`, `src/app/(dev)/preview/host-c/`, `src/app/email/preferences/page.tsx`, `src/app/host/bookings/page.tsx`, `src/lib/i18n/locale-completeness.ts`). Committed code is clean on both | Their authors |
| O8 | `tests/back-destinations.spec.mjs` | The walked-in section failed in this run ("a back control is drawn") and then crashed on a dev server connection reset. The same walk by hand works (see "Back" above). The spec drives `window.next.router.push`, which did not navigate while other engineers' edits were hot-reloading `/home`. Re-run on a quiet server before reading anything into it | QA |
| O9 | Admin console | Not read signed in: the security-key step-up cannot be passed headless. Read through the preview harness instead | QA, with a key |

## Founder references 44 and 45 (light): where the platform differs

The lead forwarded two light-mode references during the sweep: a soft
lavender-white top gradient, round white header buttons with a soft shadow,
a big centred figure with a muted caption, rounded white cards with generous
padding, 2 x 2 figure tiles (label, chevron, figure, small coloured delta),
rows with ROUND coloured icon plates and inset dividers, labelled segmented
bars, PILL buttons (primary filled, secondary white), and a floating white
dock whose current tab is a tinted pill (team M1 owns the dock).

Three of those contradict the standing spec, which says of section 0 that it
"does not reopen" it:

1. **Pill buttons** (ref 45's "Add funds" / "Withdrawal") against the shape
   law (section 0.3: controls are rounded rectangles, radius at most 0.30 of
   the short side). Today only the auth doors and `/welcome` draw pills
   (`.nf-slate-pill`); every other button is a 12 to 14px rounded rectangle.
2. **Round coloured icon plates** (ref 44's "AI rating" rows) against section
   4 (rounded-square plates, `neutral` by default, accent rationed to the one
   row that matters).
3. **A tinted pill behind the current dock tab** (both references) against
   section 0.4 (no container behind the active tab). M1 is building it.

These need a founder or lead ruling before anyone restyles platform-wide.
Nothing here was changed to follow them.

Where the platform differs without a conflict (light, phone):

| Reference trait | Pages that do not match yet |
|---|---|
| Lavender-white top gradient | Every in-app page starts on the flat warm canvas (`#F4F4F1`): Settings, Saved, Plans, Notifications, Agreements, Price Check, Payments, Messages, Restaurants, Support, Search. Home and the desk homes open on the navy hero band instead (the Q2 ruling). A top wash would be one shared class on the app shell's ground |
| Round white header buttons with a soft shadow | The app bar's bell already is. The back square on every page header (Settings, Saved, Notifications, Agreements, Price Check, Payments, Messages, Restaurants) is still a grey rounded square. The gap-closer owns the header buttons |
| Big centred figure, muted caption | Payments ("Paid through Vallo N0.00"), the listing's move-in total and Price Check's answer print the figure left-aligned inside a card or band |
| 2 x 2 figure tiles with chevron and delta | Host and agent workspace homes match (label, arrow, figure). Earnings (`/preview/f5/agent-earnings`) puts an icon plate above the label and has no chevron. Home's Buy / Rent / Pay / List are glyph tiles without figures, which is right for doors |
| Rows with plate, title, value, inset dividers | Settings, Profile, Support and the desks' "Needs attention" match. Notifications is a stack of separate cards, not one grouped list |
| Segmented bar with values | The move-in total bar carries a dot legend below it rather than values in the bar. Price Check's meter matches spec 10 |

## Screenshots

In `/tmp/claude-0/-home-user-read-it-well/1f6b951d-e7a6-5422-90c7-ea17c43968d4/scratchpad/qa/`
(outside the repository): `g-L390l-*.png` and `g-L390d-*.png` (the landing,
light and dark, in segments), `g-app-*.png` and `g-app2-*.png` (member app),
`g-fix1.png` (F1 to F3 after the fix, 360 light), `fix2-rail-desk-*.png`
(F5 and F6), `g-wide-desk-l.png` (desktop), `g-prv-*.png` (desks and
console previews), `g-welcome.png` (first run), `back-walked-listing.png`,
and one PNG per route, theme and width with a JSON record per crawl
(`pub.json`, `app.json`, `app2.json`, `wide.json`, `adm.json`, `prv.json`).
