# Second independent audit of the Session B platform sweep (23 September)

Auditor: second independent auditor, read-only on source. Nothing was fixed; this folder is the
only write. Baseline: the first audit, `../audit-sweep/AUDIT.md` (a6c7a80a, measured at 8d1ba5a7).

## Method

- **Measured at `0ab215f6`** ("Orphans, Pass 4: SW-O1 to SW-O4 closed ..."). I waited for the
  SW-O fix as briefed: polled `origin/main` every 2 minutes from 20:18 UTC; `0ab215f6` landed at
  20:24 and was seen at 20:26. `origin/main` was still `0ab215f6` when the measuring finished.
- Worktree `wt-audit2` from `origin/main`, `wt-setup.sh`. One production build
  (`VALLO_PREVIEW_HARNESS=1 next build`, through `flock heavy.lock`, exit 0, 20:28 UTC), served by
  `next start -p 3299`.
- **Restart.** The coordinator reported a container restart during the run. On checking, the
  worktree, the 20:28 build (BUILD_ID written after checkout of `0ab215f6`, tree clean), the
  server (pid alive, 48 min) and all 402 shots had survived; `origin/main` had not moved. What
  died was a waiting shell (exit 137) and the 44px hit-area probe had hung. Redone: the hit-area
  probe (rewritten to stream results, 390 only; it reached 175 of 201 routes before Chromium
  refused a new tab, so its coverage is 175 of 201). Not redone: the build (same commit, intact;
  a second heavy build of an identical tree was not worth the shared lock), the 402 shots.
- Shot and measured with the first audit's script plus two checks (`shoot.mjs.txt`): **201
  routes and states x 2 widths = 402 full-page shots**, dark, reduced motion, 390x844 at 2x and
  1440x900 at 1x. Covered: every route of the first audit's list (162) plus everything new since:
  `sweep-home/move-in`, `sweep-home/price-share`, the settings `sheet-bottom` and `sheet-rows`
  views, the orphans harness (index and 35 views including `district` and `picker` from
  `0ab215f6`), the six harness index pages. All 402 returned 200.
- Measured per page, as audit 1: layout width past the viewport; text under 11px; text controls
  at radius / short side >= 0.35; `.nf-btn--primary` without a gradient (unlit or grey,
  including disabled); flat selected states; legacy material classes (now with the computed
  radius, because `.nf-card` draws the panel since SW-C5); box containers on odd corners. New:
  controls under 44px, and a second probe (`hit.mjs.txt`, `hit.jsonl`) that credits `::before` /
  `::after` hit extenders.
- The thread options sheet (not opened by audit 1) was opened by a click at 390 and 1440.
- `compare-surface.mjs --shape-sweep --theme dark` over the audit-1 set plus the two new orphans
  views (`shape-sweep.txt`). `check-css-tokens`: clean, all ten.
- Source greps over `apps/web/src` and `packages/i18n/src` at `0ab215f6`.
- No-revert check (`norevert.sh.txt`, `norevert.txt`): every non-merge commit `a6c7a80a..0ab215f6`
  (25), every file touched by more than one of them; for each earlier commit, every added line
  of 12 characters or more must still be in the file at `0ab215f6`; each missing line traced with
  `git log -S` to the commit that removed it, and that commit's intent read.

Severity as audit 1: **blocker**, **should-fix**, **note**.

## Summary

**Register (the first audit's 123 rows, re-judged): SWEPT 115 of 123, PARTIAL 5 of 123,
NOT SWEPT 1 of 123, other 2 of 123 (1 n/a, 1 left by ruling).** Audit 1: 57 / 30 / 33 / 3.
Of the 121 judged rows (excluding n/a and ruled), 115 are SWEPT (95%).

Audit-1 findings: **16 of 16 re-checked (B1 to B3, S1 to S13): FIXED 13, PARTLY FIXED 1 (S9),
NOT FIXED 2 (S5, S13).**

| Finding | Verdict | Evidence |
|---|---|---|
| B1 social release reverted | **FIXED** | e93bb8a9 restored it; every line `e6f82a9a` added to `threads.css` (29), `ChatCard.tsx` (5) and the ledger (42) is on `0ab215f6`; proofs `sweep-social/pass2..pass5` present (48, 48, 10, 10); the card now reads "22 Jun 2026" on one line, 600 text face, chevron full size (`sbs-booking.jpg`) |
| B2 selected tab reverted to flat navy | **FIXED** | a6edcaaf restored it; all 13 lines `361eabe5` added are present; `.nf-segmented__capsule`, `__link[aria-current]`, `.nf-segment--on` on `--nf-selected-*` (a gradient); flat selected on `/messages`, `/search`: 0 |
| B3 23 routes in no group | **FIXED** | orphans group claimed and swept all 23 (64074bec, 0ab215f6); legacy classes on 22px on the 35 orphans views: 0 |
| S1 Chip flat selected | **FIXED** | `SELECTED_STYLE` on `--nf-selected-*`; flat selected on transactions, listing slots, g1: 0 |
| S2 payments toggle local navy | **FIXED** | flat selected on `admin-money/payments` both states: 0 |
| S3 disabled primary unlit | **FIXED** | primaries without a gradient (enabled or disabled) on 402 shots: 0 |
| S4 leftovers not on main | **FIXED** | released ffe8989e + ae3f4818, ledger 13.L, proofs `sweep-leftovers/`; StayCard, tiles, lead cards, RowList boxed, Surface, Flip card on the panel (see S-B for the one harness that still draws the old card) |
| S5 badges over 0.35 | **NOT FIXED (partly)** | "Verified" 0.38 gone and `StatusPill` capsule gone; the chat card's "Confirmed" is still 102x26 r10 = **0.38** at 390 and 108x28 = **0.36** at 1440 (`shape-sweep.txt`). 13.L.1 says the threads badges moved to 0.21 to 0.33: `.nf-chat-card__badge` (`threads.css` 525, `--nf-radius-sm`) did not |
| S6 text under 11px | **FIXED** | 0 on `/profile`, `/u`, `/messages`, `/listing`; what remains is the feed ruling, kobo decimals and the map credit (notes) |
| S7 followers skeleton | **FIXED** | overflow 0 on `load-followers` |
| S8 escrow chips past 390 | **FIXED** | overflow 0 on `escrow?state=full`; the supply `sr-only` table (audit-1 note) still widens by 26px (note N1) |
| S9 swept without proof | **PARTLY FIXED** | home: `/price/area` and `/rent/move-in` now have harnesses and shots; settings sheets now in the group's own harness; chrome: `/host/rooms`, `/host/photos`, `/host/reservations`, `/host/apply`, `/styleguide` and the later wizard steps still have no after proof (no legacy class found in their source) |
| S10 `/assistant` legacy | **FIXED** | 0 legacy classes, 0 flat selected, send lit |
| S11 `/settings/interests` | **FIXED** | 0 legacy, 0 flat selected, the harness draws the route's panel |
| S12 inspection glyphs and copy | **FIXED** | pencil, camera, outlined plane, list, calendar / person / clock, lit back square: all as the target (`sbs-inspection.jpg`) |
| S13 close-out register stale | **NOT FIXED** | `docs/SESSIONS_CLOSE_OUT.md` B5b still says home 0 of 8 and social "Passes 2 to 5 pending"; last touched 6e0ee6df |

No-revert check: **no commit since a6c7a80a reverted another worker's work.** 119 files were
touched by more than one commit (most are proof images, checked by path only). Every missing
added line traces to a removal the removing commit intended:

| Earlier commit, file | Lines missing | Removed by | Intended? |
|---|---|---|---|
| 9da21a53 `home.css` (`.nf-ai__send:disabled`) | 5 | c7639c33 | yes: the scope's auditfix claim names "home.css ONLY deleting `.nf-ai__send:disabled`" (one shared disabled primary) |
| d1f69c6b `PlaceRows.tsx` | 26 | 64074bec | yes: same worker (orphans), its own harness lift re-cut in the sweep |
| d1f69c6b sweep-orphans `page.tsx` (one import) | 1 | 0ab215f6 | yes: same worker, two views added |
| 64074bec `orphans.css`, `RegisterField.tsx` | 10, 2 | 0ab215f6 | yes: SW-O3 moved the fields into one panel and deleted `.nf-orph-fieldgroup` |
| 55470695 ledger, `welcome-question.mjs` | 6, 4 | 089cee05 | yes: same worker, five minutes later, rewrote the note it had just written |
| c7639c33 ledger (gate paragraph) | 3 | 4957a8fe | yes: same worker replaced it with the gate results |
| 155ac97a, 64074bec, ebf0d0e5 ledger (orphans) | 2, 37, 7 | ebf0d0e5, 0ab215f6 | yes: the same worker updating its own section (hashes, Pass 3, the rows SW-O closed) |
| 1bd26df0, 01b0c057, ae3f4818 scope | 1, 2, 1 | 1bd26df0 (reflow), c7639c33, 261e3257 | yes: own lines reworded, `<pending hash>` filled in |

The two audit-1 reverts are undone: `e6f82a9a` and `361eabe5` have 0 missing lines in their code
files (only the scope line of `e6f82a9a` was rewritten, on purpose, by e93bb8a9).

## Findings

### Blockers

None. B1, B2 and B3 are fixed and no new revert was found.

### Should-fix

- **S-A. The chat card's "Confirmed" badge is still over the review line** (audit-1 S5, not
  fully closed): 0.38 at 390, 0.36 at 1440. `threads.css` 525 `.nf-chat-card__badge` keeps
  `--nf-radius-sm` (10px) on a 26 to 28px badge. The leftovers ledger (13.L.1) records the
  threads badges as fixed; this one is not. Social group's file.
- **S-B. The committed restaurant proof is not the route.** `sweep-stays/restaurant` re-exports
  `(dev)/preview/f3/restaurant/page.tsx`, which still writes `nf-glass nf-glass--card
  nf-detail-lead` (22px) itself, so the proof shows the pre-sweep lead card
  (`shots/session-b_sweep-stays_restaurant-390.jpg`). The route (`restaurant/[id]/page.tsx` 311)
  is on `panelClass`. Same class of problem as audit-1 S11. (`f3/listing` has the same stale
  lines; the home group's own listing harness does not.)
- **S-C. The thread options sheet's second header row is clipped** (never opened by audit 1).
  "Conversation with Grand Vista Hotel" and the Close button sit at y 502 inside
  `.nf-sheet__body` whose top is 510, so the top of the line and the top of the Close square are
  cut off at 390 and 1440 (`options-sheet-390.jpg`, `-1440.jpg`); the sheet also carries two
  headings ("Conversation" and the line under it) and the Close is `h-9` (36px).
  `app/(app)/messages/[id]/ThreadOptionsSheet.tsx` 124 to 156, social group.
- **S-D. Feed: one visible difference from `feed-plus-bloom-target.jpg` is not recorded.** In
  the real shell the location row starts about 45 CSS px lower than drawn: the app header ends
  at y 60 and the location bar starts at y 104 (the render puts the bar directly under the
  header, bar centre at about 95 against ours 120), which pushes the stories, tabs and cards
  down by the same amount (`sbs-feed-viewport.jpg`, `sbs-bloom-viewport.jpg`). 13.F.8 records
  the bar's width, not this band. Five-pass founder surface.
- **S-E. Pressable controls under 44px with no hit extender** (R-B; audit 1 did not measure
  this). From `hit.jsonl` (390, 175 of 201 routes):
  - `SaveControl` media heart `.nf-pcard__heart` 36x36 (`catalogue.css` 292): 10 routes
    (`/home`, `/stays`, `/search` and its filter state, `/stays/search` x2, `/restaurants`,
    `/saved`, `f1/home`).
  - Text "Cancel" buttons 19.5 to 20px tall: `/bookings` (`MyBookings.tsx`), `/bookings/[id]`
    (`BookingDetailCard.tsx`), `/trips` (`TripSpine.tsx`); "Take it down" 20px on
    `/agent/listings`; "Read more" 21.7px on `/listing/[id]`; "Clear" 18.6px on
    `/settings/place`.
  - Fields and small buttons: wallet send row inputs 28px; listing-parts quantity input 39.7px
    on `nf-glass--well`; newsletter field and Subscribe 40px (site pages); the landing search
    segments 40px; `/search` shelf "Search" 40px; console range `select` 36px; the host wizard's
    Back 40px; console desks' role rows 42.3px.
  The orphans ledger (13.O.3) says "zero controls under 44px" for its files; `/bookings` and
  `/bookings/[id]` Cancel are its files.
- **S-F. `/docs` selected chapter is still a flat tint at 1440** (audit-1 chrome should-fix, not
  fixed): "All chapters" `oklab(0.57 -0.04 -0.23 / 0.2)`, no gradient, no rim.
- **S-G. "sample" in user copy.** `en.ts` 2691, the console analytics empty state: "...because a
  sample chart would tell you about nobody." The brief bans demo, sample, preview and coming
  soon in UI copy. Present since before audit 1 (missed there).
- **S-H. S9 remainder and S13 unchanged:** the five gated host routes, `/styleguide` and the
  later wizard steps are still counted swept with no after proof; the close-out register B5b is
  still the interim one.

### Notes

- **N1.** `admin-money/supply?state=full` at 390: a `sr-only` chart table widens the layout to
  416 (26px, clipped, invisible). S8's fix wrapped the escrow chart's table only.
- **N2.** Hit extenders at 42, not 44: `Switch` (32px track, 41 uses on 14 routes), the
  inspection check circles (18px), the feed's tab links and location chip.
- **N3.** Text under 11px outside the feed ruling: the review desk's map credit 10px; kobo
  decimals 6.8 to 10.9px (wallet, checkout, price) as audit 1 noted (part of a figure).
- **N4.** Capsules >= 0.35 besides S-A: header avatars and profile, person and edit avatars
  (0.5, allowed); the agent search field 0.35 at 1440 and the landing's "Buy" segment 0.35
  (recorded by chrome); dev gallery `Segmented` items 0.39 (dev only). Round icon-only controls:
  the bloom plus and the inspection check circles (drawn round in their governing images).
- **N5.** Harness filler: `f1/ChromePreview.tsx` fills the page under the chrome with three
  `nf-glass--card` articles (22px). Not product; the chrome it proves is swept.
- **N6.** Claims grep: NDIC, 256-bit, Buy Airtime, Pay Bills, Swap: comments only, plus
  `GalleryBoard.tsx` 186 (dev). "Real Estate reimagined!" and "reimagined." remain as values of
  `landing.slogan` and `landing.hero.title1/2` in all four locales, read by nothing that renders
  (the hero reads `landing.face.hero`: "Rent, buy or stay."); dead keys, as audit 1 said.
- **N7.** `BankRecipient`, `BANK_SEND_OPEN`: 0. "To bank": one CSS comment (`wallet.css` 1167).
- **N8.** Email change: unchanged from audit 1. No path writes an email (`updateUser` only for
  the password, `actions.ts` 970; the hook refuses `email_change`, `email-hook/route.ts` 211).
  Email inputs exist only for sign-in, sign-up, verify, forgot, contact, newsletter, support,
  firm registration, host transfer, reserve contact, send-by-email and the signed-out device
  sheet; none edits the account address.
- **N9.** Em dashes: 0 in user strings; 5 in test files, each the character a test asserts is
  absent (`shell.test.ts` 67 and four `not.toContain` assertions, U+2014), all present at a6c7a80a too.
- **N10.** Light mode: 0 live `[data-theme="light"]` or `prefers-color-scheme: light`
  selectors (4 mentions, all in comments); every shot rendered with no theme attribute.
- **N11.** 390 overflow: 1 of 201 routes lays out wider than 390 (N1); 0 of 402 shots scroll
  sideways.

## Founder images, side by side (audit-2 build, 390 dark)

### Feed and bloom (`sbs-feed.jpg`, `sbs-bloom.jpg`, `sbs-feed-viewport.jpg`, `sbs-bloom-viewport.jpg`)

| Visible difference | Recorded as deliberate? |
|---|---|
| Location row starts about 45px lower under the header; everything below follows | **no** (S-D) |
| Menu button beside the logo in the header, monogram avatar | yes (shared chrome; fixture) |
| Back arrow beside the location bar, bar narrower | yes, C3.2 / FEED-4 (13.F.8) |
| Story rings show photographs and an "S" monogram, not faces | yes, fixture props (13.F.8) |
| Gold / platinum tier mark instead of the blue tick | yes (13.F.5, 13.F.8) |
| "For you" instead of "For You" | yes, left to the lead (13.F.8) |
| Emoji missing from post bodies | yes, refused content (13.F.4) |
| Post photograph differs | yes, fixture (13.F.8) |
| Canvas darker between cards | yes, FEED-2 |
| Horizontal "..." on every card (render: vertical on card two) | yes, since c4a519f8 (13.F.8) |
| Fan sits higher from the screen foot (real dock taller) | yes, since c4a519f8 (13.F.6) |
| Real five-slot dock drawn under the fan | yes, founder ruling (dock not copied) |
| Names heavier and narrower; type sized to drawn width | yes (13.F.8) |

### Inspection (`sbs-inspection.jpg`)

| Visible difference | Recorded as deliberate? |
|---|---|
| Header row (logo, bell, profile) absent; back square alone | yes (shared chrome) |
| Type larger, page taller | yes (R-A) |
| "Listed by" for "Assigned Agent", phone wraps | yes |
| Lifecycle strip added | yes (R-F) |
| "per year" at the price's size for "/ year" | yes (comparison row "Price") |
| Dates "24 Jun 2026" and "10:00" against "Jun 24, 2025" and "10:00 AM" | the values come from the row (recorded); the day-month order and 24-hour clock are not recorded as a choice: **no** (note) |
| Checklist progress: render draws a lit bar at 0 / 8, built draws a faint track | partly (Pass 1: "track in a mid blue") |
| Submit dimmed while waiting | yes (comparison row "Submit") |
| "Scheduled" badge emerald, not teal | yes (off the blue family) |
| Glyphs, back square, helper lines | fixed since audit 1 (a5459f08) |

### Thread booking card (`sbs-booking.jpg`; card 302 x 394 at 390, 400 x 402 at 1440)

| Visible difference | Recorded as deliberate? |
|---|---|
| Card taller (44px buttons, type a rung up): 394 against 307 | yes (pass 5, 13.S.7) |
| Share glyph in the title row | yes (13.S.5) |
| "Contact host" with a chat glyph | yes (pass 5) |
| "Confirmed" emerald badge with a dot, ratio 0.36 to 0.38 | colour yes (pass 5); the ratio breaches R-D (S-A) |
| Header name truncated "Grand Vista H..." beside a round monogram with a tier badge | **no** |
| Header overflow horizontal "...", render vertical | **no** |
| Times "09:18" 24-hour against "9:18 AM" | **no** |
| Composer: picture glyph for attach, send lit | send fixed (S3); the attach glyph **no** |
| Name in the text face at 600, dates on one line, chevron full size | fixed (B1 restored) |

## Per group

- **Shared layer:** B2 and S3 fixed; S1 fixed. Nothing reverted.
- **Console (18 rows):** 18 SWEPT. S2, S8 fixed; the desks' 22px card gone. Notes N1, N3; range
  `select` 36px (S-E).
- **Auth (2):** 2 SWEPT.
- **Settings (15):** 15 SWEPT. S11 fixed; drawer Flip card on the panel. "Clear" 18.6px (S-E).
- **Stays (12):** 11 SWEPT, 1 PARTIAL (`/restaurant/[id]` proof, S-B). Trips "Cancel" (S-E).
- **Home (8):** 8 SWEPT. `/price/area` and `/rent/move-in` now proven. Heart 36px (S-E).
- **Social (12):** 9 SWEPT, 2 PARTIAL (booking card S-A; options sheet S-C), 1 n/a. B1 fixed.
- **Wallet (10):** 10 SWEPT. Kobo note.
- **Profile (4):** 4 SWEPT. `/profile/setup` chooser on the panel, plate and selected state.
- **Feed (1):** PARTIAL (S-D). Audit-1 differences recorded.
- **Inspection (1):** SWEPT (S12 fixed; date format note).
- **Chrome (17):** 14 SWEPT, 1 PARTIAL (`/docs`, S-F), 1 NOT SWEPT (gated host routes, S-H),
  1 ruled (dock).
- **Orphans (23):** 23 SWEPT on material. `/bookings`, `/bookings/[id]` Cancel and `/saved`
  heart under 44px (S-E).

## Per-route register

Verdicts as audit 1: SWEPT (every visible item measured on the shared layer, no should-fix on
the material), PARTIAL (on the layer with a should-fix above), NOT SWEPT (legacy material or no
proof). Controls under 44px (S-E) are listed as "+44" in the why column and do not change a
verdict, so the columns compare with audit 1.

| Route | Owner group | Audit-1 verdict | Audit-2 verdict | Why |
|---|---|---|---|---|
| `/admin` overview (fixture) | console | SWEPT | SWEPT | clean |
| `/admin` overview (empty) | console | SWEPT | SWEPT | clean |
| `/admin/operations` jobs | console | SWEPT | SWEPT | clean |
| `/admin/operations` in flight | console | SWEPT | SWEPT | clean |
| `/admin/operations` notifications | console | SWEPT | SWEPT | clean |
| `/admin/analytics` (fixture) | console | SWEPT | SWEPT | clean; +44 range select 36px; "sample" copy in the empty state (S-G) |
| `/admin/analytics` (empty) | console | SWEPT | SWEPT | as above |
| back arrow as `/admin/money` | console | SWEPT | SWEPT | clean |
| `/admin/money` | console | SWEPT | SWEPT | clean |
| `/admin/escrow` | console | PARTIAL | SWEPT | S8 fixed: overflow 0, chips 44px |
| `/admin/payments` | console | PARTIAL | SWEPT | S2 fixed: flat selected 0 |
| `/admin/bookings` | console | SWEPT | SWEPT | clean |
| `/admin/supply` | console | SWEPT | SWEPT | sr-only table +26px at 390 (N1) |
| `/admin/listings` queue | console | SWEPT | SWEPT | clean |
| listing under review | console | SWEPT | SWEPT | 10px map credit (N3) |
| `/admin/moderation` | console | SWEPT | SWEPT | clean |
| `/admin/verification` | console | SWEPT | SWEPT | clean |
| console desks (`f5/admin-desks`) | console | PARTIAL | SWEPT | 22px card gone; +44 role rows 42.3px |
| `/sign-in` chooser | auth | SWEPT | SWEPT | clean |
| `/sign-in/email` and its 6 states | auth | SWEPT | SWEPT | clean |
| `/settings` hub | settings | SWEPT | SWEPT | clean |
| `/settings/account` | settings | SWEPT | SWEPT | clean |
| delete flow | settings | SWEPT | SWEPT | clean |
| `/settings/notifications` | settings | SWEPT | SWEPT | clean (Switch hit 42, N2) |
| `/settings/privacy` | settings | SWEPT | SWEPT | clean (N2) |
| `/settings/payments` | settings | SWEPT | SWEPT | clean |
| `/settings/help` | settings | SWEPT | SWEPT | clean |
| `/settings/appearance` | settings | SWEPT | SWEPT | clean (N2) |
| `/settings/devices` | settings | SWEPT | SWEPT | clean |
| `/settings/place` | settings | SWEPT | SWEPT | +44 "Clear" 18.6px |
| `/settings/interests` | settings | PARTIAL | SWEPT | S11 fixed |
| `/notifications` | settings | SWEPT | SWEPT | clean |
| error boundary | settings | SWEPT | SWEPT | clean |
| `/legal/terms` | settings | SWEPT | SWEPT | clean |
| side drawer panel | settings | PARTIAL | SWEPT | Flip card on the panel (SW-C1 closed) |
| `/stays` | stays | NOT SWEPT | SWEPT | StayCard on the panel (R-SH2); +44 heart |
| `/stays/search` | stays | NOT SWEPT | SWEPT | StayCard and tiles on the panel; +44 heart |
| `/stay/[id]` | stays | PARTIAL | SWEPT | lead card, tiles, boxed list on the panel |
| `/trips` | stays | SWEPT | SWEPT | +44 "Cancel" 19.5px |
| `/restaurants` | stays | NOT SWEPT | SWEPT | StayCard on the panel; +44 heart |
| `/restaurant/[id]` | stays | PARTIAL | PARTIAL | route on the panel, but the committed proof is f3's legacy lead card (S-B) |
| `/checkout` | stays | SWEPT | SWEPT | clean (kobo note) |
| `/checkout/[bookingId]` and sheets | stays | SWEPT | SWEPT | clean (kobo note) |
| `/escrow` | stays | SWEPT | SWEPT | clean |
| `/escrow/[id]` | stays | PARTIAL | SWEPT | S3 fixed: disabled primary lit |
| held payment in a thread | stays | SWEPT | SWEPT | clean |
| host set-up panels (`imgc`) | stays | SWEPT | SWEPT | clean; +44 Back 40px |
| `/home` | home | SWEPT | SWEPT | +44 heart |
| `/stays` (home components) | home | PARTIAL | SWEPT | StayCard on the panel |
| `/search` | home | PARTIAL | SWEPT | B2 fixed; +44 heart, shelf "Search" 40px |
| `/listing/[id]` | home | PARTIAL | SWEPT | S1 and S6 fixed; +44 "Read more" |
| `/price` | home | SWEPT | SWEPT | clean |
| `/price/area/[id]` | home | NOT SWEPT | SWEPT | harness `price-area` and `price-share` shot; kobo decimals (N3) |
| `/rent/move-in/[listingId]` | home | NOT SWEPT | SWEPT | harness `move-in` shot, clean |
| `/assistant` | home | PARTIAL | SWEPT | S10 fixed |
| `/u/[handle]` | social | PARTIAL | SWEPT | S6 fixed; passes restored (B1) |
| `/u/[handle]/followers` | social | PARTIAL | SWEPT | S7 fixed; passes restored |
| `/u/[handle]/following` | social | PARTIAL | SWEPT | same component |
| `/u/[handle]/edit` | social | PARTIAL | SWEPT | passes restored |
| `/u` people search | social | PARTIAL | SWEPT | passes restored |
| `/messages` | social | PARTIAL | SWEPT | B2 and S6 fixed |
| booking face and card | social | NOT SWEPT | PARTIAL | pass-5 card restored; "Confirmed" 0.36 to 0.38 (S-A) |
| rental face | social | PARTIAL | SWEPT | "Verified" 0.38 gone |
| plain face | social | PARTIAL | SWEPT | passes restored |
| options sheet | social | not audited | PARTIAL | opened: header row clipped, Close 36px (S-C) |
| share picker | social | PARTIAL | SWEPT | "Verified" 0.38 gone |
| `/messages/new` | social | n/a | n/a | shared EmptyState only |
| `/wallet` | wallet | SWEPT | SWEPT | kobo note; +44 send row inputs 28px on send |
| `/wallet/send` | wallet | SWEPT | SWEPT | +44 send row inputs 28px |
| `/wallet/receive` | wallet | SWEPT | SWEPT | kobo note |
| top up | wallet | SWEPT | SWEPT | clean |
| withdraw | wallet | SWEPT | SWEPT | clean |
| `/wallet/transactions` | wallet | PARTIAL | SWEPT | S1 fixed |
| `/wallet/transactions/[id]` | wallet | SWEPT | SWEPT | clean |
| pots | wallet | SWEPT | SWEPT | clean |
| result sheets | wallet | SWEPT | SWEPT | clean |
| payment methods | wallet | SWEPT | SWEPT | clean |
| `/profile` signed in | profile | PARTIAL | SWEPT | S6 fixed (11px) |
| `/profile` signed out | profile | SWEPT | SWEPT | clean |
| `/profile` loading | profile | SWEPT | SWEPT | clean |
| `/profile/setup` | profile (leftovers SW-P1) | NOT SWEPT | SWEPT | chooser on panel, plate, selected state |
| `/around` feed and bloom | feed | PARTIAL | PARTIAL | audit-1 differences recorded; header-to-bar band unrecorded (S-D) |
| inspection | inspection | PARTIAL | SWEPT | S12 fixed; date format note |
| `/` landing | chrome | SWEPT | SWEPT | segments 0.35 recorded; +44 segments and Subscribe 40px |
| `/about` | chrome | SWEPT | SWEPT | +44 newsletter 40px |
| `/help` | chrome | SWEPT | SWEPT | +44 newsletter 40px |
| `/docs` | chrome | PARTIAL | PARTIAL | flat tinted selected chapter at 1440 (S-F) |
| home with header and dock (`f1/switch`) | chrome | NOT SWEPT | SWEPT | chrome swept; the page filler cards are harness only (N5) |
| drawer (`lead/drawer`) | chrome | PARTIAL | SWEPT | Flip card on the panel |
| dock (`lead/dock`) | chrome | ruled | ruled | founder ruling, untouched |
| Flip card (`lead/flip`) | chrome (leftovers SW-C1) | NOT SWEPT | SWEPT | SW-C1 closed; the 32px faces are the full-screen turn, not a card |
| home body (`f1/home`) | chrome | SWEPT | SWEPT | +44 heart |
| host standing (`f5/host-landing`) | chrome | PARTIAL | SWEPT | boxed list on the panel |
| host wizard first step | chrome | SWEPT | SWEPT | +44 Back 40px |
| `/host/transfer` | chrome | PARTIAL | SWEPT | boxed list on the panel |
| `/host/start` doors | chrome | SWEPT | SWEPT | clean |
| `/agent/dashboard` | chrome | PARTIAL | SWEPT | boxed lists on the panel; search field 0.35 at 1440 (recorded) |
| `/agent/settings` | chrome | SWEPT | SWEPT | clean |
| `/agent/listings` | chrome | SWEPT | SWEPT | +44 "Take it down" 20px |
| 5 gated host routes and `/styleguide`, later wizard steps | chrome | NOT SWEPT | NOT SWEPT | still no after proof (S-H); no legacy class in source |
| `/around/[slug]` | orphans | NOT SWEPT | SWEPT | SW-O2 closed: district tabs on the shared chip, 44px, lit selected |
| `/around/manage` | orphans | NOT SWEPT | SWEPT | loading swept |
| `/around/new` | orphans | NOT SWEPT | SWEPT | clean |
| `/around/settings` | orphans | NOT SWEPT | SWEPT | SW-O2 closed (picker chips) |
| `/bookings` | orphans | NOT SWEPT | SWEPT | +44 "Cancel" 20px |
| `/bookings/[bookingId]` | orphans | NOT SWEPT | SWEPT | +44 "Cancel" 19.5px |
| `/bookings/[bookingId]/review` | orphans | NOT SWEPT | SWEPT | clean |
| `/crypto` | orphans | NOT SWEPT | SWEPT | `notFound()`; loading swept |
| `/crypto/[id]` | orphans | NOT SWEPT | SWEPT | as `/crypto` |
| `/inspections` | orphans | NOT SWEPT | SWEPT | clean |
| `/post/[id]` | orphans | NOT SWEPT | SWEPT | feed ruling type |
| `/profile/application` | orphans | NOT SWEPT | SWEPT | clean |
| `/profile/setup/[role]` | orphans | NOT SWEPT | SWEPT | clean |
| `/profile/setup/agent` | orphans | NOT SWEPT | SWEPT | clean |
| `/profile/setup/firm` | orphans | NOT SWEPT | SWEPT | SW-O3 closed: fields in one panel |
| `/profile/setup/owner` | orphans | NOT SWEPT | SWEPT | SW-O3 closed |
| `/rent` | orphans | NOT SWEPT | SWEPT | SW-O4 closed ("/yr" at 12px); SW-O1 closed |
| `/rent/pay/[inspectionId]` | orphans | NOT SWEPT | SWEPT | clean |
| `/saved` | orphans | NOT SWEPT | SWEPT | +44 heart |
| `/saved/searches` | orphans | NOT SWEPT | SWEPT | clean (Switch hit 42, N2) |
| `/stories/[id]` | orphans | NOT SWEPT | SWEPT | loading swept; viewer is the feed's |
| `/stories/new` | orphans | NOT SWEPT | SWEPT | clean |
| `/verification` | orphans | NOT SWEPT | SWEPT | clean |

**Totals: 123 rows. SWEPT 115, PARTIAL 5 (`/restaurant/[id]`, booking card, options sheet,
feed, `/docs`), NOT SWEPT 1 (gated host routes), n/a 1, ruled 1.** Rows carrying a "+44"
control finding: 22 of 123.

Not opened by either audit: the console's old frame harnesses (`bd`, `bc`, `c1`, `p3`), the live
auth pages (verify, forgot, reset), settings `/offline` and not-found, the gated host routes.

## Evidence in this folder

- `shots/`: 402 full-page shots (`<route>-<390|1440>.jpg`, downscaled), `measure.json` (every
  shot's measurement), `flags.txt` (per-shot findings), `hit.jsonl` (controls under 44px with
  their hit extenders credited, 390).
- `sbs-feed.jpg`, `sbs-bloom.jpg` (full page), `sbs-feed-viewport.jpg`, `sbs-bloom-viewport.jpg`
  (the 390x844 viewport in the real shell), `sbs-inspection.jpg`, `sbs-booking.jpg`: founder
  screen crop beside the build at the same 390 scale.
- `options-sheet-390.jpg`, `options-sheet-1440.jpg` (S-C).
- `shape-sweep.txt`, `norevert.txt`, and the scripts `shoot.mjs.txt`, `hit.mjs.txt`,
  `norevert.sh.txt`.
