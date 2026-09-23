# Independent audit of the Session B platform sweep (23 September)

Auditor: independent, read-only on source. Nothing was fixed; this folder is the only write.

## Method

- Tree: `origin/main` at `8d1ba5a7`, worktree `wt-audit`. One production build (`next build`,
  `VALLO_PREVIEW_HARNESS=1`, run through the heavy lock, exit 0), served by `next start -p 3288`.
- Shot and measured with `shoot.mjs.txt` (in this folder): 152 routes and states x 2 widths =
  **304 full-page shots**, dark, reduced motion, 390x844 at 2x and 1440x900 at 1x. Covered: every
  committed harness under `app/(dev)/preview/session-b/**` with every state its page reads
  (`?v=`, `?f=`, `?state=`, `?rooms=`, `?viewer=`), `/preview/g1` and its two sub-pages, and a
  sample of 18 chrome-group routes (landing, site pages, `f1`, `f5`, `lead`, `c2`, `imgc`).
  Shots: `shots/` (downscaled for the repository). Raw measurements: `measure.json`.
- Measured per page, in the browser: horizontal layout width past the viewport; every visible
  text run under 11px; every text-bearing control with radius / short side at or over 0.35;
  every `.nf-btn--primary` without a gradient fill (unlit or grey); every selected element
  (`aria-selected/pressed/current/checked`, `--on`, `--active`) painted as a flat fill with no
  gradient; every element still wearing legacy material classes (`.nf-card` not `.nf-panel`,
  `.nf-glass--card`, `.nf-glass--tile`, `.nf-social-card`, `.nf-glyph-tile`); every box-drawing
  container on a corner other than the 10px container / 14px control radius.
- Also ran `compare-surface.mjs --shape-sweep --theme dark` over 14 key routes
  (`shape-sweep.txt`; the tool measured 13 combinations, so my own measurement above is the proof).
- `node scripts/check-css-tokens.mjs`: clean, all ten checks.
- Source greps (case-insensitive) over `apps/web/src` and `packages/i18n/src`, and git history
  checks: every non-merge commit since 13:00 on 23 September was tested for whether its change is
  still on main (`git apply --check` forward and reverse, per file, confirmed by reading the file).

Severity: **blocker** (the sweep's claim is false on main, or the founder's bar is broken
platform-wide), **should-fix**, **note**. Numbers carry denominators.

## Headline findings

### Blockers

- **B1. The social group's release was silently reverted.** `e6f82a9a` (15:43, "the thread card
  through five audit passes, the rest through three, and the group released") changed
  `threads.css`, `ChatCard.tsx`, the ledger (passes 2 to 5) and added 112 proof files
  (`sweep-social/pass2..pass5`). Two minutes later the stays group's `dc52e031` (parent
  `e6f82a9a`) was committed from a stale index and undid all of it: the two code files, the 47
  ledger lines, the scope release line and all 112 proofs. Main today has only Pass 1 for the
  social group, the thread booking card in its pass-1 state (display face at 700, dates
  wrapping "22 Jun / 2026", the primary's chevron a speck: `sbs-booking.jpg`), and
  `docs/SESSION_B_SCOPE.md` line 202 still says "RELEASED (sweep-social) 8ac45997, e6f82a9a",
  naming a commit whose content is not on main. The thread card is a five-pass founder surface.
- **B2. The shared selected state for tabs and segments was reverted, so flat navy is back.**
  `361eabe5` (16:10, "The selected tab takes the shared lit selected state", from the social
  sweep's inbox finding) put `Segmented`'s capsule, its link form and `.nf-segment--on` on
  `--nf-selected-*`. Three minutes later `d3d1620c` (stays group, parent `361eabe5`) restored
  the old `buttons.css`, `controls.css`, `Segmented.tsx` and `chips.css` lines. Main today:
  `.nf-segmented__capsule` and `.nf-segmented__link[aria-current]` paint
  `--nf-surface-raised` with an elevation shadow (buttons.css 462 to 470, 511 to 515) and
  `.nf-segment--on` a flat brand fill (controls.css 137). Measured: `/messages` inbox "All" tab
  flat navy, `/search` view toggle `rgb(0, 0, 80)` flat, every `Segmented` user
  (`selected-states-390.jpg`, `shots/session-b_sweep-social_f_inbox-390.jpg`,
  `m-session-b_sweep-home_search-390`). The founder's bar names "any flat navy selected state".
  (The pill variant in chips.css was re-applied later by the chrome group; the capsule and link
  were not.)
- **B3. The platform-wide claim has 23 routes that no group owns and no register lists.**
  Founder: "every single area ... is going on this sweep". These routes are in no group's scope
  and still draw the legacy 22px stride `.nf-card` (which the sweep has not re-pointed, SW-C5):
  `/around/[slug]` (10 uses), `/around/settings` (7), `/around/new` (5), `/around/manage`,
  `/bookings`, `/bookings/[bookingId]`, `/bookings/[bookingId]/review` (4), `/crypto` and
  `/crypto/[id]` (13 in `components/app/crypto`), `/verification` (+6 in
  `components/verification`), `/rent`, `/rent/pay/[inspectionId]`, `/saved`, `/saved/searches`,
  `/post/[id]`, `/stories/[id]`, `/stories/new`, `/inspections`, `/profile/application`,
  `/profile/setup/[role]`, `/profile/setup/agent`, `/profile/setup/firm`,
  `/profile/setup/owner`. Shared pieces with the same legacy card and no owner:
  `ReportSheet.tsx` (4), `ScreenSkeleton.tsx`, `ui/Skeleton.tsx` (the listing card skeleton),
  `Screen.tsx` `RowList boxed` and `Surface`. (The feed worker opened the story viewer, story
  composer and a post thread in pass 3 but did not claim those routes.)

### Should-fix

- **S1. The shared `Chip` paints its selected state as an inline flat fill**
  (`components/ui/Chip.tsx` 163 to 167, `SELECTED_STYLE: background var(--nf-brand-primary)`),
  not `--nf-selected-*`. Measured flat `rgb(0,105,254)`, no rim, no glow: `/wallet/transactions`
  "All", the listing day slots "Fri 25" and "Weekend", `/preview/g1` chips. No group claimed
  `Chip.tsx`.
- **S2. Console: the payments desk filter toggle has a local selected recipe.**
  `.nf-md-toggle[aria-pressed="true"]` (`money/_desk/desk.css` 963 to 970) is a pasted
  `color-mix(lit 34%, canvas)` navy fill with its own glow, measured flat
  `oklab(0.27 -0.02 -0.10)` on "All outcomes" and "Checkouts and top-ups". The console ledger
  (13.c1) says every open state is on `--nf-selected-*`.
- **S3. A disabled primary goes unlit.** The shared `.nf-btn--primary` in its disabled state has
  no gradient (measured `lit: false`): escrow "File this" (`/escrow/[id]` filer), posts
  "Reply", assistant "Send message", the thread composer's send (dim). Founder's bar: "any
  greyed/unlit primary". The inspection screen already keeps its disabled buttons lit by a
  local rule; the shared layer does not.
- **S4. The leftovers work is not on main and nothing records that.** Claimed 16:56
  (`5de8290a`, `a754c1c9`), no release line, no ledger section, no proofs folder. Still visible:
  the Flip card `.nf-side-switch.nf-glass--card` on every AppShell page at 1440 (78 of 78 in-shell
  1440 shots) and in the 390 drawer (SW-C1); `RowList boxed` at 22px on `/stay/[id]`, the host
  standing page, `/host/transfer`, `/agent/dashboard` (SW-C5); `StayCard` on
  `.nf-glass--card` 22px on `/stays`, `/stays/search`, `/restaurants`, `/home` (stays side)
  (R-SH2); `/stays/search` category tiles on `.nf-glass--tile`; the lead card and amenity tiles
  of `/stay/[id]` and `/restaurant/[id]` on `.nf-glass--card` / `--tile`; the chooser on
  `/profile/setup` (SW-P1); status badges (SW-C6); `AiAssistantBanner` still present (R-SH1).
- **S5. Badges over the 0.35 review line (R-D says zero at or above 0.35).** "Confirmed" on the
  chat card 108x28 r10 = 0.36; "Verified" 80x27 r10 = 0.38 on the rental context card and the
  share picker (`shape-sweep.txt`). `StatusPill` still ships `shape="pill"` (r999): 12 capsule
  breaches on `/preview/g1` (dev gallery only; no production call site).
- **S6. Text under 11px outside the feed ruling.** `/profile` belongings row labels 10.6px ("My
  Bookings", "Saved", "Wallet", "Inspections", "Switch role": 5 of 5 on 4 of 4 signed-in states);
  `/u/[handle]` trust labels 10px ("Trust score", "Completed deals", "Response time");
  `/messages` unread count 10.5px; `/listing/[id]` "/ year" and "asking price" 10.3px; the review
  desk's map credit 10px. R-A's floor for labels and captions is 11px.
- **S7. The followers / following loading skeleton is broken at 390.** Its text bars sit outside
  their panel and push the layout to 505px (clipped by `html { overflow-x: clip }`, so no scroll,
  but the skeleton is visibly wrong): `followers-loading-overflow-390.jpg`.
- **S8. Escrow desk, full state, 390:** the status chip row runs to 1131px and widens the layout
  to 472px; the chips past 390 cannot be reached (clipped, not scrollable):
  `escrow-full-chips-overflow-390.jpg`. (Supply full, 390 and 1440: an `sr-only` table widens
  the layout by 55 / 41px; invisible, note only.)
- **S9. "Swept" counted without an after proof.** Home: `/price/area/[id]` and
  `/rent/move-in/[listingId]` (8 of 8 claimed, 6 photographed). Chrome: `/host/rooms`,
  `/host/photos`, `/host/reservations`, `/host/apply`, `/styleguide` and the later host wizard
  steps are "swept by class" and counted inside "44 of 49". Settings: the rows sheet and bottom
  sheet photographed only through the wallet harness.
- **S10. `/assistant` is counted swept (home 8 of 8) but still draws legacy cards:**
  `AssistantChat.tsx` 613 (history aside, 22px, measured at 1440) and 827 (mobile drawer),
  `assistant/loading.tsx`; the suggestion button's selected state is a flat 20% tint.
- **S11. `/settings/interests`:** the interest tiles are `.nf-card` buttons with a flat tint as
  their selected state (`InterestChoices.tsx`, welcome group, 11 of 11 tiles legacy), and the
  harness draws the container as `.nf-card` while the route draws `.nf-panel`, so the committed
  proof does not show the route.
- **S12. Inspection differences from `founder/inspection-target.jpg` that the ledger does not
  record** (see the comparison below).
- **S13. The close-out register is stale.** `SESSIONS_CLOSE_OUT.md` B5b (written at `b6f41ceb`)
  still says home 0 of 8, stays 0, settings 0, chrome 0, feed 0, social "Passes 2 to 5 pending".
  Every group but leftovers has since written a release line.

### Notes

- Claims grep: NDIC, "256-bit", "your money is safe", Buy Airtime, Pay Bills, Swap: comments
  only (SendFlow.tsx 746, TrustStrip.tsx 11, WalletDeck.tsx 51 and 250, en.ts 2931), plus
  `(dev)/gallery/GalleryBoard.tsx` 186 drawing "Top up" and "Swap" labels (dev only). "Top Up"
  exists as the real wallet funding action (`wallet.topUp`, `topUpTitle`), not a render tile.
  "viewing": test strings and a variable name in `lib/email/messages.ts`; no user copy.
  `BankRecipient`, `BANK_SEND_OPEN`: 0. "To bank": one CSS comment (`wallet.css` 1167).
  Em dashes: 0 in source. "coming soon": comments and the banned-phrase list only.
  "Real Estate reimagined!" survives as the `slogan` value in en, ha, ig, yo, but no component
  reads the key any more (dead key; the claims rule says removed entirely).
- Email change: no server path writes an email (`auth.updateUser` only for password; the email
  hook refuses `email_change`; `ProfileIdentityCard` draws the address as fixed text). One email
  input remains: the signed-out "On this device" sheet in `profile/SignedOutHero.tsx` 232, which
  stores a contact address in the browser for support replies, not an account address, on a page
  that now redirects signed-out visitors. Note only.
- Light mode: 0 live `[data-theme="light"]` or `prefers-color-scheme: light` selectors in any
  stylesheet (13 mentions, all comments); every shot rendered with no light attribute.
- Horizontal scroll: 0 of 304 shots scroll sideways (`html` and `body` clip), but 4 of 304 lay
  out wider than the viewport (S7, S8).
- The bottom navigation is untouched (the dock rules in `chrome.css` have no sweep diff; dock
  harness clean).
- Round header avatar (0.5) on every in-shell 390 shot: allowed (avatar). Feed plates 0.378:
  the founder's own ruling. Feed type 8.5 to 10.3px: the feed ruling. Kobo decimals at 6.8 to
  10.9px on wallet, checkout and price figures: part of a figure (R-A: render size), noted.
- The landing's search segments and the "AI" nav link sit at 0.35 and 0.37, recorded by chrome.

## Founder images, side by side

### Feed and bloom (`sbs-feed.jpg`, `sbs-bloom.jpg`; viewport 390x844 of the harness)

| Visible difference | In the ledger as deliberate? |
|---|---|
| Back arrow sits beside the location bar, bar narrower | yes, C3.2 / FEED-4 (13.F.8) |
| App header (logo, bell, avatar) absent from the harness | not stated in 13.F; it is chrome, but the proof never shows the feed under the real header |
| Monogram and fixture photos instead of faces and the render's photographs | yes (13.F.8) |
| Gold / platinum TierBadge instead of a blue tick | yes (13.F.5, 13.F.8) |
| "For you" instead of "For You" | yes, left to the lead (13.F.8) |
| Emoji in the post bodies missing | yes, refused as the render's content (13.F.4) |
| Canvas between cards darker (#000612 vs #010d3c) | yes, FEED-2 |
| Card two's overflow is a horizontal "···"; the render draws a vertical "⋮" on card two | **no** |
| The fan and plus sit over card three's head; in the render Post overlaps card two's action row just above the dock. The harness has no dock, so the fan anchors to the viewport foot | **no** (13.F.6 measures centres relative to the plus only) |
| The haze and glowing ribbon around the fan are weaker than the render's | yes, "the render's ribbon is brighter" (13.F.8) |
| Names read heavier and narrower | yes, face difference (13.F.8) |

### Inspection (`sbs-inspection.jpg`; full page of `/preview/session-b/inspection`, 390)

| Visible difference | In the ledger as deliberate? |
|---|---|
| Type larger throughout (11px floor, 16px field), page about 1.4x taller | yes (R-A, round five pass 3) |
| "Listed by" instead of "Assigned Agent" | yes |
| Phone number wraps in the facts cell | yes |
| Lifecycle strip (Requested, Time agreed, Inspected, Recorded) added | yes (R-F) |
| "per year" instead of "/ year" | yes (comparison row "Price") |
| Header row: logo, bell and profile absent; back control alone on its own row | yes (shared chrome) |
| Notes glyph is a document, the render draws a pencil | **no** |
| Add Photos glyph is a picture, the render draws a camera | **no** |
| Submit's paper plane is filled, the render's is outlined | **no** |
| Checklist head glyph is three lines, the render draws a bulleted list | **no** |
| Date and status cell glyphs differ (calendar with tick, history clock vs plain calendar and clock) | **no** |
| Helper lines under Add Photos and Submit, and an "Open the chat" link at the foot | the photos line yes (round five); "Tick all eight rooms..." and "Open the chat" **no** |
| The back control is a dark square, not the render's lit glass square | **no** |

### Thread booking card (`sbs-booking.jpg`; `/preview/session-b/sweep-social?f=booking`)

Card on main measures **302 x 394 at 390** and **400 x 402 at 1440** (target 310 x 307 at 390).
It is smaller in width than before the sweep (340 then) but 87px taller than the target, and
because of B1 it is the pass-1 card, not the pass-5 card the ledger once described.

| Visible difference | In the ledger as deliberate? |
|---|---|
| Card taller (buttons 44 vs 30, type a rung up) | was recorded in the reverted pass 5; on main only pass 1's "closer" |
| Name "Grand Vista Hotel" in the display face at 700; the render sets the text face at 600 | the fix is in the reverted pass 2: **not on main** |
| Check in / Check out dates wrap to two lines ("22 Jun / 2026") | fixed in reverted passes 2 and 3: **not on main** |
| "View booking details" chevron a speck after the label | fixed in reverted passes 4 and 5: **not on main** |
| Share / forward glyph in the title row | yes, "recorded exception" (13.S.5) |
| "Contact host" with a chat glyph vs "Contact Hotel" with a phone | only in the reverted pass 5 |
| "Confirmed" badge: emerald StatusPill with a dot, 0.36 ratio | only in the reverted pass 5; ratio breaches R-D |
| Header name truncated "Grand Vista H..." beside a round G monogram with a second badge | **no** |
| Kebab horizontal; render vertical | **no** |
| Composer: picture glyph for attach, send button dim and unlit when empty | **no** (S3) |

## Per group

### Shared layer (phase 1)
Routes checked / claimed: n/a (tokens and primitives). `42ea43d9`, `9da8f86f`, `f440fd21` are on
main. Findings: B2 (a later shared-layer fix reverted), S1 (`Chip` not on the layer), S3
(disabled primary unlit), S5 (`StatusPill` capsule variant). Ledger 13.0 is otherwise consistent
with the code.

### Console (admin-shell) : checked 18 of 28 claimed routes
- should-fix: `/admin/payments` local selected toggle (S2), `m-session-b_admin-money_payments-*`.
- should-fix: `/admin/escrow` full state, chip row wider than the phone (S8).
- should-fix: `/preview/f5/admin-desks` still draws a `div.nf-card.p-card` at 22px
  (`shots/f5_admin-desks-390.jpg`); ledger 13.c1 says all 53 desk `.nf-card` uses moved.
- note: review desk map credit at 10px.
- Passes 1 to 3 dated 23 September, proofs `sweep-console/pairs-1440` (28) and `after-390` (28).

### Auth (signin) : checked 2 of 7 claimed routes (the harness chooser and password-step states)
- No finding on the checked states: panel card, lit primary, glass door, fields on the shared
  layer; 0 capsules, 0 small text, 0 overflow. SW-A1 (verify, forgot, reset refusal plates) is
  open as the ledger says; `ForgotPasswordForm.tsx` 52 still `.nf-card`.

### Settings : checked 15 of 19 claimed routes and states (21 harness views)
- should-fix: `/settings/interests` (S11).
- should-fix: the drawer carries the unswept Flip card (S4, SW-C1).
- Passes 1 to 3 dated; proofs present (46 before, 54 after, 27 side-by-sides).

### Stays : checked 12 of 12 rows (10 routes, the thread proposal, the host panels via `imgc/hotel`)
- should-fix: `/escrow/[id]` "File this" unlit while disabled (S3).
- should-fix (S4): `/stays`, `/stays/search`, `/restaurants` still show `StayCard` on
  `.nf-glass--card` 22px; `/stays/search` tiles on `.nf-glass--tile`; `/stay/[id]` lead card
  and amenity tiles on legacy glass and a 22px boxed list; `/restaurant/[id]` lead card legacy
  and a `Surface` at 22px. The group recorded these as other groups' files; they remain unswept.
- note: the stays group's two commits `dc52e031` and `d3d1620c` are the cause of B1 and B2.

### Home : checked 7 of 8 claimed routes
- blocker (B2): `/search` view toggle flat navy.
- should-fix: `/assistant` (S10); `/listing/[id]` day slots flat Chip (S1) and "/ year" 10.3px
  (S6); `/stays` StayCard (S4); `/price/area/[id]` and `/rent/move-in` unproven (S9).
- note: `listing-parts` harness wraps the panels in its own `nf-card` (harness only).

### Social : checked 10 of 12 claimed routes (options sheet not opened; `/messages/new` draws nothing)
- blocker (B1): passes 2 to 5 and the card fixes are not on main; every route in this group has
  one dated pass on main, not three (five for the card).
- blocker (B2): `/messages` "All" tab flat navy.
- should-fix: "Confirmed" 0.36 and "Verified" 0.38 (S5); `/u/[handle]` 10px trust labels and
  `/messages` 10.5px count (S6); followers loading skeleton broken (S7).

### Wallet family : checked 10 of 10 claimed routes (12 views)
- should-fix: `/wallet/transactions` "All" chip flat (S1).
- note: kobo decimals 6.8 to 7.5px beside the figures. Passes 1 to 3 dated; proofs complete.

### Profile : checked 4 of 4 claimed states (7 views)
- should-fix: belongings row labels 10.6px on every signed-in state (S6).
- `/profile/setup` not swept, as the ledger says (SW-P1, S4). Rows kept on the render's
  measured recipe (recorded exception, sampled numbers in 13.P.2).

### Feed and bloom : checked 1 of 1 route (5 states, 390 and 1440)
- note: two visible differences not recorded (card two's kebab orientation; the fan's position
  over the content in a harness without the dock). Five passes dated; overlay proofs present;
  17 of 17 live links.

### Inspection : checked 1 of 1 surface (5 states)
- should-fix (S12): seven visible glyph and copy differences not recorded. Shape max 0.33 by my
  measure; round check circles and plates are shapes.

### Chrome : checked 17 of 49 claimed rows
- should-fix: boxed lists at 22px on host standing, `/host/transfer`, `/agent/dashboard` (counted
  swept, SW-C5); Flip card (SW-C1) in the drawer and rail; `/docs` "All chapters" selected link
  a flat 20% tint at 1440; 5 gated routes and the later wizard steps counted without proof (S9).
- note: agent search field 0.35 at 1440, landing segments 0.35, "AI" link 0.37 (recorded).

### Leftovers : not released; no ledger section, no proofs (S4)

## Per-route register

Verdicts: SWEPT (every visible item measured on the shared layer, no finding), PARTIAL (on the
layer with a finding above), NOT SWEPT (legacy material or no proof). "claimed" is the group's
own word in ledger 13.

| Route | Claimed | Audit verdict | Why |
|---|---|---|---|
| `/admin` overview (fixture) | swept | SWEPT | clean |
| `/admin` overview (empty) | swept | SWEPT | clean |
| `/admin/operations` jobs | swept | SWEPT | clean |
| `/admin/operations` in flight | swept | SWEPT | clean |
| `/admin/operations` notifications | swept | SWEPT | clean |
| `/admin/analytics` (fixture) | swept | SWEPT | clean |
| `/admin/analytics` (empty) | swept | SWEPT | clean |
| back arrow as `/admin/money` | swept | SWEPT | clean |
| `/admin/money` | swept | SWEPT | clean |
| `/admin/escrow` | swept | PARTIAL | chip row past 390 in full state (S8) |
| `/admin/payments` | swept | PARTIAL | local navy selected toggle (S2) |
| `/admin/bookings` | swept | SWEPT | clean |
| `/admin/supply` | swept | SWEPT | clean (sr-only table widens layout, note) |
| `/admin/listings` queue | swept | SWEPT | clean |
| listing under review | swept | SWEPT | clean (10px map credit, note) |
| `/admin/moderation` | swept | SWEPT | clean |
| `/admin/verification` | swept | SWEPT | clean |
| console desks (`f5/admin-desks`) | swept | PARTIAL | a 22px `.nf-card` left |
| `/sign-in` chooser | swept | SWEPT | clean |
| `/sign-in/email` and its 6 states | swept | SWEPT | clean |
| `/settings` hub | swept | SWEPT | clean (Flip card in drawer counted under chrome) |
| `/settings/account` | swept | SWEPT | clean |
| delete flow | swept | SWEPT | clean |
| `/settings/notifications` | swept | SWEPT | clean |
| `/settings/privacy` | swept | SWEPT | clean |
| `/settings/payments` | swept | SWEPT | clean |
| `/settings/help` | swept | SWEPT | clean |
| `/settings/appearance` | swept | SWEPT | clean |
| `/settings/devices` | swept | SWEPT | clean |
| `/settings/place` | swept | SWEPT | clean |
| `/settings/interests` | swept | PARTIAL | legacy tiles, flat selected, proof not the route (S11) |
| `/notifications` | swept | SWEPT | clean |
| error boundary | swept | SWEPT | clean |
| `/legal/terms` | swept | SWEPT | clean |
| side drawer panel | swept | PARTIAL | holds the unswept Flip card (S4) |
| `/stays` | nothing of the group's | NOT SWEPT | StayCard on legacy glass 22px (S4) |
| `/stays/search` | nothing of the group's | NOT SWEPT | StayCard and category tiles legacy (S4) |
| `/stay/[id]` | group's items swept | PARTIAL | lead card, amenity tiles, boxed list legacy |
| `/trips` | swept | SWEPT | clean |
| `/restaurants` | nothing of the group's | NOT SWEPT | StayCard legacy (S4) |
| `/restaurant/[id]` | group's items swept | PARTIAL | lead card legacy, `Surface` 22px |
| `/checkout` | swept | SWEPT | clean |
| `/checkout/[bookingId]` and sheets | swept | SWEPT | clean (kobo decimals note) |
| `/escrow` | swept | SWEPT | clean |
| `/escrow/[id]` | swept | PARTIAL | disabled primary unlit (S3) |
| held payment in a thread | swept | SWEPT | clean |
| host set-up panels (`imgc`) | swept | SWEPT | clean |
| `/home` | swept | SWEPT | clean |
| `/stays` (home components) | swept | PARTIAL | cards are StayCard legacy (S4) |
| `/search` | swept | PARTIAL | view toggle flat navy (B2) |
| `/listing/[id]` | swept | PARTIAL | flat Chip slots (S1), 10.3px caption (S6) |
| `/price` | swept | SWEPT | clean |
| `/price/area/[id]` | swept | NOT SWEPT | no proof (S9) |
| `/rent/move-in/[listingId]` | swept | NOT SWEPT | no proof (S9) |
| `/assistant` | swept | PARTIAL | legacy cards, flat tint, unlit send (S10, S3) |
| `/u/[handle]` | swept | PARTIAL | 10px labels (S6); passes 2 and 3 not on main (B1) |
| `/u/[handle]/followers` | swept | PARTIAL | skeleton broken (S7); passes lost (B1) |
| `/u/[handle]/following` | swept | PARTIAL | same component as followers |
| `/u/[handle]/edit` | swept | PARTIAL | passes lost (B1) |
| `/u` people search | swept | PARTIAL | only the skeleton is provable; passes lost (B1) |
| `/messages` | swept | PARTIAL | flat navy "All" (B2), 10.5px count |
| booking face and card | swept, five passes | NOT SWEPT | card fixes and passes 2 to 5 reverted (B1) |
| rental face | swept | PARTIAL | "Verified" 0.38 (S5); passes lost |
| plain face | swept | PARTIAL | passes lost (B1) |
| options sheet | swept | not audited | needs a tap; not opened |
| share picker | swept | PARTIAL | "Verified" 0.38 (S5); passes lost |
| `/messages/new` | nothing of its own | n/a | shared EmptyState only |
| `/wallet` | swept | SWEPT | clean (kobo note) |
| `/wallet/send` | swept | SWEPT | clean |
| `/wallet/receive` | swept | SWEPT | clean |
| top up | swept | SWEPT | clean |
| withdraw | swept | SWEPT | clean |
| `/wallet/transactions` | swept | PARTIAL | flat Chip "All" (S1) |
| `/wallet/transactions/[id]` | swept | SWEPT | clean |
| pots | swept | SWEPT | clean |
| result sheets | swept | SWEPT | clean |
| payment methods | swept | SWEPT | clean |
| `/profile` signed in | swept where the render allows | PARTIAL | row labels 10.6px (S6) |
| `/profile` signed out | swept | SWEPT | clean |
| `/profile` loading | swept | SWEPT | clean |
| `/profile/setup` | not swept | NOT SWEPT | SW-P1 open |
| `/around` feed and bloom | swept, five passes | PARTIAL | two unrecorded visible differences |
| inspection | swept, five passes | PARTIAL | seven unrecorded visible differences (S12) |
| `/` landing | swept | SWEPT | clean (0.35 segments recorded) |
| `/about` | swept | SWEPT | clean |
| `/help` | swept | SWEPT | clean |
| `/docs` | swept | PARTIAL | flat tinted selected chapter at 1440 |
| home with header and dock (`f1/switch`) | not closed | NOT SWEPT | as the ledger says |
| drawer (`lead/drawer`) | not closed | PARTIAL | Flip card legacy |
| dock (`lead/dock`) | left by ruling | ruled | untouched by the founder's ruling |
| Flip card (`lead/flip`) | not closed | NOT SWEPT | SW-C1 |
| home body (`f1/home`) | swept | SWEPT | clean |
| host standing (`f5/host-landing`) | swept | PARTIAL | boxed list 22px |
| host wizard first step | swept | SWEPT | clean |
| `/host/transfer` | swept | PARTIAL | boxed list 22px |
| `/host/start` doors | swept | SWEPT | clean |
| `/agent/dashboard` | swept | PARTIAL | boxed lists 22px |
| `/agent/settings` | swept | SWEPT | clean |
| `/agent/listings` | swept | SWEPT | clean |
| 5 gated host routes and `/styleguide`, later wizard steps | swept by class | NOT SWEPT | no after proof (S9) |
| `/around/[slug]` | no group | NOT SWEPT | 10 legacy cards (B3) |
| `/around/manage` | no group | NOT SWEPT | legacy card (B3) |
| `/around/new` | no group | NOT SWEPT | 5 legacy cards (B3) |
| `/around/settings` | no group | NOT SWEPT | 7 legacy cards (B3) |
| `/bookings` | no group | NOT SWEPT | legacy cards (B3) |
| `/bookings/[bookingId]` | no group | NOT SWEPT | legacy card (B3) |
| `/bookings/[bookingId]/review` | no group | NOT SWEPT | 4 legacy cards (B3) |
| `/crypto` | no group | NOT SWEPT | legacy cards (B3) |
| `/crypto/[id]` | no group | NOT SWEPT | legacy cards (B3) |
| `/inspections` | no group | NOT SWEPT | never in a group (B3) |
| `/post/[id]` | no group | NOT SWEPT | legacy loading cards (B3) |
| `/profile/application` | no group | NOT SWEPT | never in a group (B3) |
| `/profile/setup/[role]` | no group | NOT SWEPT | never in a group (B3) |
| `/profile/setup/agent` | no group | NOT SWEPT | never in a group (B3) |
| `/profile/setup/firm` | no group | NOT SWEPT | never in a group (B3) |
| `/profile/setup/owner` | no group | NOT SWEPT | never in a group (B3) |
| `/rent` | no group | NOT SWEPT | 3 legacy cards (B3) |
| `/rent/pay/[inspectionId]` | no group | NOT SWEPT | 2 legacy cards (B3) |
| `/saved` | no group | NOT SWEPT | legacy card (B3) |
| `/saved/searches` | no group | NOT SWEPT | never in a group (B3) |
| `/stories/[id]` | no group | NOT SWEPT | opened in feed pass 3, never claimed (B3) |
| `/stories/new` | no group | NOT SWEPT | legacy loading card (B3) |
| `/verification` | no group | NOT SWEPT | 7 legacy cards (B3) |

**Register totals: 123 rows. SWEPT 57 of 123, PARTIAL 30 of 123, NOT SWEPT 33 of 123
(10 claimed by a group, 23 in no group), other 3 of 123 (1 not audited, 1 n/a, 1 left by
ruling).** Of the 97 group-owned rows audited (any claim), 57
are SWEPT (59%).

Claimed routes I did not open: console 10 of 28 (the old `bd`, `bc`, `c1`, `p3`, `f5` frame
harnesses), auth 5 of 7 (the live sign-up, verify, forgot and reset pages), chrome 32 of 49,
settings `/offline` and not-found, the social options sheet.

## Evidence in this folder

- `shots/` 304 full-page shots (`<harness>-<390|1440>.jpg`), `measure.json` per shot.
- `sbs-feed.jpg`, `sbs-bloom.jpg`, `sbs-inspection.jpg`, `sbs-booking.jpg`: founder image screen
  crop (x 180 to 844, y 120 to 1360) beside the built page at the same 390 scale.
- `selected-states-390.jpg`: `/search`, `/messages`, `/admin/payments`, `/wallet/transactions`.
- `followers-loading-overflow-390.jpg`, `escrow-full-chips-overflow-390.jpg`.
- `shape-sweep.txt`, `shoot.mjs.txt` (the measuring script, to re-run).
