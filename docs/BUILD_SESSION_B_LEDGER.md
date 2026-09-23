# Session B build ledger

Session B's own record. The other session's ledger is `docs/BUILD_07_LEDGER.md`
and Session B does not write in it. Scope: `docs/SESSION_B_SCOPE.md`.

Every surface gets three sections before it can be called finished:
1. **The chain**: control, server action, validation, policy, table, trigger,
   notification, query, screen. Every broken link named.
2. **The comparison**: the governing image against the built page at 390px dark,
   property by property, with measured numbers.
3. **Light mode**: the same surface on paper, checked.

## 0. Lead rulings (22 September, after the first closing audit)

These are the lead's decisions on questions the auditor found were choices, not
rules. Every Session B surface follows them, so the same question gets the same
answer everywhere.

**R-A. Type at the render's size, with a floor, per role.** The render governs
every text role's size. A role is raised only where the render's size would be
unreadable, and only to the floor, never by a whole-surface factor:
- body, subtitle, caption and label: floor 11px
- a value typed into an input: 16px (iOS zooms the page below that)
- everything else (names, titles, headings, figures): the render's measured size,
  not scaled.
A uniform scale factor (1.16, 1.36, 1.15) is withdrawn on every surface.

**R-B. Controls at the render's height, with a floor.** A pressable control
takes the render's measured height unless that is under 44px, in which case it
is 44px. Everything around it keeps the render's proportions; only the control
grows.

**R-C. Containers at the render's measured width.** The lead's earlier "about
300 to 310px" for the sign-in card was an estimate and it was wrong: the render
measures 61.6% of the screen, about 240px at 390. Containers take the render's
measured width. Where a real string cannot fit at the floor sizes, the text
wraps before the container grows, and the ledger says so.

**R-D. Controls clear the shape review line.** "Zero" in the shape sweep means
zero at or above 0.35, not only zero at or above 0.5. The shared console chip
and the queue search field are brought under 0.35.

**R-E. The console lands on the overview on every entry, including by address.**
The first request to any `/admin/**` desk in a browser session goes to `/admin`
first, which offers the desk the operator was heading for as its first link.

**R-F. Real function beats pixel parity, and is drawn compactly.** Where the
product needs a control the render does not draw (the inspection outcome
choice), it stays, drawn in the render's register as compactly as the render's
own nearest element, so the primary actions stay on the first screen.

**R-G. Proofs are reproducible.** Every fixture harness a proof came from is
committed under `apps/web/src/app/(dev)/preview/session-b/<surface>/`, behind the
existing preview gate, so anyone can re-run the shots and the sweep.

## 1. Profile

Route `/profile`. Governing image `50E032EA-4141-4237-88D5-01B3720D87B6.png` (repo root;
re-sent by the founder as `images/2.jpg`). Worker: profile. Files: `app/(app)/profile/`
`page.tsx`, `AccountHero.tsx`, `AccountBody.tsx`, `SignedOutHero.tsx`, `loading.tsx`,
`profile.css` (new, `nf-pf-*`), `belongings.ts`, `belongings-queries.ts`,
`SwitchRoleRow.tsx`, `belongings.test.ts` (all new except the first five).

### 1.1 What was decided

- **Own classes.** The page used the social layer's classes from `social.css` (the other
  session's file), shared with `/u/[handle]`, so any change to one moved the other. It now
  draws from `profile.css` (`nf-pf-*`), imported by the route and its components. `social.css`
  and `/u/[handle]` are untouched.
- **The top band (round two, lead review).** Members see the signed-in app header (menu,
  lockup, bell, avatar; global chrome, not Session B's). Round one put the render's back and
  settings squares on a second row under it, and beside the render that read as two rows of
  floating buttons (`profile-header-before-dark.jpg`). Now: the cover runs full bleed behind the
  header, the settings gear sits ON the header's row, 8px left of the bell, as the header's own
  control (`nf-icon-btn`, 44px, radius 14, top 8, the same material as menu and bell), and back
  is dropped: `/profile` is a dock destination, and the menu and the dock are the way off it
  (`profile-header-after-dark.jpg`). Measured clear of the lockup: gear left 188 against lockup
  right 185 at 360, 218 against 191 at 390, 258 against 199 at 430; top 8 at all three, same as
  the bell. From 640 the cover is a framed band in the column and the gear sits on its upper
  right. The gear is placed by `profile.css` from the header's geometry and stacked above the
  header (z 41); a real slot is scope request 1d.
- **Dock.** Global chrome, not built here. The render's four-tab dock is not copied.
- **Cover.** The person's own `social_profiles.cover_path` when set. Otherwise
  `/brand/photos/villa-pool-skyline-02.jpg` (the same file as `scenes/villa.jpg`): the dusk
  villa on the water with the skyline to its left, the scene the render opens on. Chosen over
  cropping the render because the render's cover has the back and gear squares, the avatar and
  the status bar painted into it (not clean), and its source is 658 image px across for a
  390 CSS px band, 1.69 px per CSS px, which is soft at 2x and 3x. A `color` blend brand
  wash leans the plate's sky blue, as the render's is; the lower third fades into the canvas.
- **Row icons.** Exactly the shared pack's crops of this render, through `BrandIcon`:
  `calendar-grid`, `bookmark-ribbon`, `wallet-tile`, `shield-check-tile`, `role-switch-tile`.
  Each is drawn at 68px (62 for Switch role) so its glass square, 72 per cent of the artwork,
  lands on the render's 49px plate. (Paper renditions removed with light mode, 23 September.)
- **Type (round four, ruling R-A).** The 1.16 factor is withdrawn. Every text role ships at the
  render's measured size: cap height in image px x 0.593, divided by the face's cap ratio
  (Poppins 0.697 for the name, Inter 0.727 for the rest). Names, titles and figures ship exactly
  that; a body, subtitle, caption or label role measuring under 11px ships at 11px and no larger.
  Weights from stroke widths: the name's O measures 0.12 em (Poppins medium, 500), the row
  title's M 0.13 em and the count's 1 0.11 em (Inter semibold, 600). Geometry ships at 1x.
- **Cover photo control.** The render draws nothing on the cover but back and gear, so the
  quiet change-cover square that used to sit on the cover is now a "Cover photo" row below the
  fold. Tapping the face still opens the avatar picker.
- **Copy (round two).** Every new word on the page is in `packages/i18n` under
  `socialProfile.accountPage`, added in all four locales (ha, ig, yo are drafts awaiting a
  native speaker). The Switch role line joins role words with the dictionary's own two
  patterns. Strings that were already in the old page (Your details, Where you are, Help and so
  on) are unchanged and still English literals, as before this work.
- **Nothing lost below the fold.** Edit profile, Your public page, Cover photo, Your details
  (sheet), Email, Where you are, What you do, Member since, Reviews (with its count), Messages,
  Notifications, Help: all kept, in the register's grouped rows after Switch role.
- **The old role sheet.** `/profile?switch=owner|professional` is a live link (`/agents`
  redirects to it; the home and search empty states point at it). The page answers it with a
  server redirect to where the old sheet sent the person, decided from the account's real
  `agents` row: not set up goes to `/profile/setup/<role>`, set up and unverified to
  `/profile/application`, verified to `/agent/dashboard` (`switchParamTarget`, tested).

### 1.2 The chain

| Control | Action / read | Validation | RLS policy | Table | Trigger / notification | Screen |
|---|---|---|---|---|---|---|
| Name | `loadProfileState` | none (read) | `profiles_select_own` | `profiles.display_name` (first and surname fallback) | `profiles_sync_display_name`, `profiles_sync_social_identity` keep the social row in step | `AccountHero` h1 |
| Handle, bio, cover, counts, tick | `loadAccountSocialIdentity` | none | `social_profiles_select` (not blocked) | `social_profiles` (`handle, bio, cover_path, follower_count, following_count, is_agent`) | `follows_count` -> `bump_follow_counts` increments and decrements both counts on every follow and unfollow; `follows_notify_after_insert` -> `notify_follow` tells the followee; `agents_sync_social_flag` sets `is_agent = (status = 'APPROVED')` | counts compact from 10,000 (12.4K); the badge is now read from `public.person_badge` (see the final pass) |
| Followers, Following | links to `/u/<handle>/followers`, `/following` | | `follows_select` (true) | `follows` | | existing routes |
| Avatar tap | canvas re-encode (strips GPS) -> storage `avatars` -> `setAvatar` | type, size (10MB), re-encode must succeed | storage policy on `avatars` (not re-checked live) | `profiles.avatar_url` | | face |
| Cover photo row | re-encode -> storage `social-covers` -> `setSocialCover` | same | same, `social-covers` | `social_profiles.cover_path` | | cover |
| Back | dropped in round two: `/profile` is a dock destination; the header menu and the dock leave it | | | | | |
| Gear | link `/settings`, on the header row | | | | | |
| Belongings / Posts | client tab state | | | | | |
| My Bookings | link `/bookings`; value from `loadBelongings` head count, `guest_id = me`, status `PENDING`/`CONFIRMED`, `check_out > today (Lagos)` | | `bookings_guest_select` | `bookings` | | "N upcoming", nothing at 0 or on a failed read |
| Saved | link `/saved`; head counts of `saved_items` (`user_id = me`) plus `saved_places` (`accommodation`, `restaurant`) | | `saved_items_own`; `saved_places` owner policy (not listed in the policy read, see 1.6) | | | "N saved" |
| Wallet | link `/wallet`; `wallet_balances` (`wallet_id, balance_minor, currency`) | | view is `security_invoker = true`, so the ledger's own policies decide | `wallet_balances` view | | balance through `formatMoney` (kobo), only when a wallet row exists |
| Inspections | link `/inspections`; head count `requester_id = me`, state `REQUESTED`/`PROPOSED`/`CONFIRMED` | | `inspection_requests_select_party` | `inspection_requests` | | "N open" |
| Switch role | `SwitchRoleRow` presses the dock's own trigger, opening `ProfileSwitcher` (Personal, every workspace held with its standing, the operations console for staff, Add a workspace); falls back to `/profile/setup` | the sheet writes view cookies only; every `/agent/*` and `/admin` route re-gates server side | `agents_select_own`, `businesses_owner_all`, `user_roles_select_own` | `agents`, `businesses`, `user_roles` via `resolveWorkspaces` (React-cached, shared with the layout) | | sub-line from `switchRoleLine(held)`: "admin" appears only when a `user_roles` admin row exists |
| Posts tab | `getProfileFeed(userId)` -> `ProfilePosts` (the public page's own panel) | | posts policies (unchanged) | `posts` | | real posts; unclaimed handle gets the honest claim empty state |
| Claim your handle | link `/u/me/edit` | | | | | shown only with no `social_profiles` row |
| Verify prompt | `VerifyPrompt` from the `agents` row | | | | | only for an owner or agent who applied and is unverified |

**Broken or weak links.**
1. Switch role opens the sheet by clicking the dock's trigger (a class-name coupling). Scope
   request 1, open: asks for a trigger prop.
2. The settings gear is placed over the app header's row by geometry. Scope request 1d, open:
   asks for a header slot.
Withdrawn and done: 1b (the copy is in `packages/i18n` under `socialProfile.accountPage`) and
1c (`tests/profile.spec.mjs` now asserts `.nf-pf-cover`).
Nothing else in the chain is broken as far as code and the policy read can show.

### 1.3 Refused from the render

| Render element | Why refused |
|---|---|
| 12.4K followers, 482 following | Example figures. The built counts are `social_profiles` values; only the format (compact from 10,000) follows the render. |
| Blue tick beside the name, tick badge on the avatar | Drawn only when `social_profiles.is_agent` is true, which the `agents_sync_social_flag` trigger sets only for an APPROVED agent row. Everybody else gets no name tick and a quiet picture badge that says the face is a control. |
| "Change between user, agent or admin" | Printed only for an account holding an agent workspace and a staff role. Otherwise the line names exactly what is held ("Change between user and owner"), or, with nothing held, what can be applied for ("Add an owner, agent or firm workspace"). Never "admin" to a non-admin (tested). |
| The person's photograph | A fixture has no face; the product draws the person's own `avatar_url`, or their initial. |
| Four-tab dock (Home, Search, Saved, Profile) | Global chrome, the platform's five-slot dock stays as it is. |
| Status bar, phone frame, neon frame glow | Presentation, not UI. |
| "&" in the row subtitles | The dictionary's own wording ("and") is used, in all four locales. |

No invented counts are drawn anywhere. The row values the render does not draw appear only
where the database returns a non-zero figure (the wallet balance also at zero, when a wallet
exists).

### 1.4 The comparison (390 x 844, dark)

Scale: phone screen 658 image px wide (inner edge 182 to 840), so CSS px = image px x 0.593.
Built values measured in Chromium off the running page (`getBoundingClientRect` and pixel
samples of the screenshot at 2x). Proof screenshots are fixture-backed (see 1.6).

Vertical positions in the render are from the screen's top edge, which includes a 44px status
bar; in the product the 60px app header takes that band, so every built position sits about
22px lower and the spacing between elements is what is compared.

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Page gutter | 30 image px: 18 | 18 | yes |
| Cover | full bleed, dusk villa and skyline, fades out by 164 from screen top | full bleed, `villa-pool-skyline-02`, runs behind the header, fades out by 206 (header shift) | yes (plate, not a crop; see 1.1) |
| Top controls | back square top left and gear top right, 55 image px: 33, radius about 10, navy glass (0 36 130), one row under the status bar | one row: the header's menu, lockup, then the gear, bell and avatar; gear 44 at top 8 (the header's control size and rhythm), radius 14, fill 3 5 22 with the header's lit rim; back dropped (tab root) | deliberate difference: the header owns the band (1.1) |
| Avatar | ROUND, 149 image px: 88, left 18, ring about 3.5 lit blue with glow, 1px seam | 88 round, left 18, 3px gradient ring, glow `--nf-glow-3` | yes |
| Avatar tick | filled blue disc about 21 at the ring's lower right (71 158 251) | 22 disc, brand blue tick on white, canvas cut-out; only for an approved agent | yes (claims rule) |
| Avatar top to name cap | 28 | 26 | yes |
| Text column start | 17 right of the ring | 17 | yes |
| Name | cap 21 image px: 12.45 CSS, 17.9px; stroke 0.12 em (medium); 238 241 249 | 18px Poppins 500; built cap 12.5 CSS; 246 246 247 | yes |
| Name tick | blue verified disc beside the name (110 190 252) | `verified-badge` 20, brand blue with glow; only when `is_agent` | yes |
| Handle | about 10px (x-height 7 image px, 53 CSS wide), mist blue (160 198 239) | 11px 400 (a subtitle role, floored), 161 194 243 | yes, by R-A's floor |
| Bio | cap 12 image px: 9.8px, one line, mist blue (162 201 242) | 11px 400 (body, floored), one line at 390, 159 191 238 | yes, by R-A's floor |
| Count value | cap 14 image px: 11.4px, stroke 0.11 em (semibold), near white | 11.4px 600, built cap 8.5 CSS against 8.3, 245 246 247 | yes |
| Count label | cap 12 image px: 9.8px, mist (148 193 236) | 11px 400 (label, floored), 155 187 235 | yes, by R-A's floor |
| Counts gap and hairline | 24 each side of a 22 tall hairline (15 134 203) | 24 each side, 1 x 22, 43 125 244 with a soft glow (round two, was 9 78 182) | yes; the built rule is 41 levels bluer, 9 less green |
| Counts to tabs | 24 | 22 | yes |
| Tab control | 598 x 71 image px: 355 x 42, radius about 14, one track, live half fills the full height | 354 x 44 (44 for the thumb), `--nf-radius-control` 14 (ratio 0.32), live half full height | yes |
| Live tab | lit: 1 126 254 top, 0 61 246 middle, 0 101 254 bottom, bright top rim (3 146 251), bloom | `--nf-gradient-cta`: 0 113 252, 27 96 253, 0 99 248; `--nf-rim-primary`; `--nf-bloom-lit-soft` | yes; middle a little lighter |
| Resting tab | glass 0 21 67, label 175 203 238, rim 1 46 134 | 0 16 74, label mist, rim 0 54 142 | yes |
| Tab label | cap 14 image px: 11.4px, 500 to 600, house and chat glyphs | 11.4px, 600 live and 500 resting, `home` and `chat-bubble` 24 | yes |
| Tabs to first row | 20 | 20 | yes |
| Row | 598 x 112 image px: 355 x 66, radius 23 image px: 14 (ratio 0.21) | 354 x 67, `--nf-radius-control` 14 (ratio 0.21) | yes |
| Row gap | 13 image px: 8 | 8 | yes |
| Row fill, rim, halo | see the round three sample table below | see below | yes, every point within 10 per channel except the two noted |
| Row rim | top 2 112 219 (a hot 1px line), sides 1 75 175, foot 2 73 161 | top 0 110 220, foot 0 68 162, sides the ink at 76 per cent | yes |
| Row glow | 1px dark seam under the foot, then a faint halo: 4px out 1 12 49 above, 0 11 42 below | seam in the canvas, `0 0 8px -2px` glow-2 and `0 4px 12px -6px` glow-3; 4px out 0 9 46 above, 2 12 50 below | yes |
| Icon plate | 83 image px: 49, the render's objects; lit from inside (see table below) | 49 (radius 10), the pack crops of this render on a plate built in `profile.css`: per-side rims, a vertical body, a radial inner light, a little side light, `saturate(1.4)` on the plate only | yes, within 10 on every channel at seven points |
| Plate to title | 24 image px: 14 | 14 | yes |
| Row title | cap 13 image px: 7.7 CSS, 10.6px, M stem 0.13 em (semibold), near white | 10.6px 600, built cap 8.0 CSS, 241 242 244 | yes |
| Row subtitle | cap 11 image px: 9.0px, one line, mist (159 194 231) | 11px 400 (subtitle, floored), one line for all four at 390, 154 187 234 | yes, by R-A's floor |
| Chevron | right edge 18 from the row edge, near white | 20px `chevron-right`, 12 padding plus the glyph's own margin | yes |
| Gap before Switch role | 39 image px: 23 | 23 | yes |
| Switch role row | 101 image px: 60, its own falloff and a quieter plate (see table below) | 62, plate 44, the same recipe with its own stops | yes, within 10 |
| Vertical rhythm from the avatar's top | name cap 25.5, tabs 139.4, first row 201.6, Switch role 512.4 | name cap 25.5, tabs 138, first row 202, Switch role 517 | yes (Switch 4.6 lower: rows 67 against 66.4) |
| Text column, measured built (round four) | | name 18/500 at y 192; handle 11/400; bio 11/400; count 11.4/600; count label 11/400; tab 11.4 (600 live, 500 resting); row title 10.6/600; row subtitle 11/400; all second lines oklab 0.845 (mist blue) | per rows above |
| Status badges | none on this screen | none | yes |
| Buttons | the lit segment is the only lit control | the lit segment; Claim your handle (no handle only) wears the same gradient, top rim and bloom | yes |
| Colours | one blue family | one blue family; the plate's sunset is photographic and graded towards blue | yes |

**Differences that remain, honestly.** (1) Everything below the top band sits about 22px lower
than in the render, because the app header takes the status bar's band; measured from the
avatar's top the rhythm matches (row above). The render's back square is dropped and its gear
joins the header row (1.1). (2) Four roles (handle, bio, count label, row subtitle) measure under
11px in the render and ship at 11px by ruling R-A; every other role is at the render's size. (3) The counts hairline samples 43 125 244 against 15 134 203 (raised in round two). The rows
and plates are matched point by point in round three (table below).
(4) The fixture has no photograph, so the face is a monogram; the product draws the person's
own `avatar_url`. (5) The glow identity (`docs/design/GLOW_IDENTITY.md`) proposes a cyan top
edge and a lit interior for cards and tiles; this render measures a dim blue top edge
(0 42 126) and a brighter foot, and its tiles are its own crops, so the governing image wins
here. The lit segment reads `--nf-gradient-cta`, `--nf-rim-primary` and `--nf-bloom-lit-soft`
and will follow the identity when Session A adopts it into the tokens. (Light mode removed by the founder on 23 September; dark only.)

**Round three: rows and plates lit to the render (lead review).** Sampled at the same points
in the render and in the built page (390 dark, 2x, the final build, harness in the signed-in
shell), render y mapped to CSS by 0.593 from the row's top rim. Built by `profile.css`: the row
fill is sRGB mixes of `--nf-container-ink` and the canvas painted on a `::before` layer at
`saturate(1.35)` (the render's blue has a green-to-blue ratio near 0.3 that no token ink holds;
saturation on the layer, not the text, gets there), a hot top rim of the ink with a fifth of
`--nf-state-warning` (the cyan) in it, the foot rim at 70 per cent, a canvas seam and a halo.

| Point | Render | Built | Within 10? |
|---|---|---|---|
| 4px above the row | 1 12 49 | 0 9 46 | yes |
| Top rim | 2 112 219 | 0 110 220 | yes |
| 1px under the rim | 0 52 148 | 0 51 146 | yes |
| 9px down | 0 33 105 | 0 38 110 | yes |
| 20px down | 0 24 79 | 0 29 83 | yes |
| 26px down | 0 22 70 | 0 25 73 | yes |
| Middle | 0 19 63 | 0 22 65 | yes |
| 52px down | 0 17 61 | 0 21 61 | yes |
| 4px above the foot | 0 25 76 | 0 27 78 | yes |
| 1.5px above the foot | 0 30 87 | 0 31 89 | yes |
| Foot rim | 2 73 161 | 0 68 162 | yes |
| 4px below the row | 0 11 42 | 2 12 50 | yes (blue 8) |
| Plate top rim | 0 49 164 | 0 52 164 | yes |
| Plate body, top | 0 38 132 | 0 35 132 | yes |
| Plate inner light by the glyph | 0 46 233 | 0 39 232 | yes |
| Plate body, low | 0 22 108 | 0 23 108 | yes |
| Plate foot rim | 2 82 211 | 0 84 213 (round four: a little cyan in the rim) | yes |
| Plate, left middle | 1 30 101 | 0 30 110 | yes |
| Plate, right middle | 0 29 112 | 0 35 104 | yes |
| Switch row top rim | 5 90 189 | 0 93 192 | yes |
| Switch row under the rim | 0 42 135 | 0 46 132 | yes |
| Switch row 5px down | 0 31 101 | 0 37 106 | yes |
| Switch row middle | 0 19 64 | 0 23 69 | yes |
| Switch row low | 0 16 58 | 0 20 60 | yes |
| Switch row foot | 0 26 90 | 0 29 94 | yes |
| Switch row foot rim | 0 65 166 | 0 63 156 | yes (blue 10) |
| Switch plate top rim | 0 48 144 | 0 53 145 | yes |
| Switch plate body | 0 36 115 | 0 41 116 | yes |
| Switch plate by the glyph | 0 38 164 | 0 47 156 | yes |
| Switch plate low | 0 25 90 | 0 26 87 | yes |

Every row and plate point is within 10 on every channel; the tightest is the Switch foot rim
(blue 10). Re-sampled on the round-four build (the harness at `/preview/session-b/profile`), rows
11px higher than round three because the text column is shorter: identical values.

**Re-audit gate.** Pass one (image beside `v3`): the plate objects drew a second, lighter
square inside a brand wash, the back square read as a pale blue wash over the sky, and a third
glass square (change cover) sat on the cover where the render has none. Fixed: the wash went,
the objects were sized so their own square is the plate, the back and gear went navy, and the
cover control moved to a row. Pass two (image beside `v4`): the objects had collapsed to 16px
when the absolute centring lost its size. Fixed and re-shot (`v5`, the proofs). Final read of
the image beside `profile-390-dark.jpg`: composition, order, containers, radii and glow read as
the same design, with the differences listed above.

Round two (lead review), with the render and `profile-side-by-side-390-dark.jpg` open twice.
Pass one: in the signed-in shell the top band had two rows of floating controls; paper swapped
the row objects for line glyphs; the plates and hairline sampled dim. Fixed as recorded in 1.1
and the table. Pass two: the gear rendered at x -128 because `.nf-tap` is unlayered and beat the
surface's `position: absolute`; fixed by dropping `nf-tap` (`.nf-icon-btn` carries its own hit
area) and re-measured (x 218, y 8, `elementFromPoint` at its centre is the `/settings` link).
The paper objects showed white holes where the tile's faint body keyed out; fixed with the
tile's measured rounded square as the mask. Re-shot after the last change: every proof in the
folder is from the final build.

**Side by side:** `docs/design/proofs/session-b/profile/profile-side-by-side-390-dark.jpg`
(render screen left, built 390 dark right, both at 780px wide).

### 1.5 Light mode, and the nine items

Light mode removed by the founder on 23 September; dark only. The paper rules in `profile.css`, the `-day` object renditions, their crop block in `scripts/design/session-b-crops.mjs` and the light proofs are removed.
Item 7 (inspection, not viewing): the profile's copy was swept in all four locales; it already says "inspections" everywhere and never "viewing", so nothing changed. Item 5 (badges): waiting on Session A's B-BADGE derivation; nothing drawn meanwhile.

### 1.6 Shape sweep, checks, and what was not verified

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3171 --shape-sweep --routes "/preview/session-b/profile,/preview/session-b/profile?v=nohandle,/preview/session-b/profile?v=signedout" --theme both`
on the final build (`/preview/session-b/profile` is the committed harness inside the SIGNED-IN app shell, ruling R-G;
`/profile` itself redirects to sign in without a session and the sweep refuses a redirect):

```
shape sweep: /preview/session-b/profile, /preview/session-b/profile?v=nohandle, /preview/session-b/profile?v=signedout at 390px, 1536px in dark and light
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
```

`check-css-tokens.mjs`: clean. `tsc --noEmit`: clean. `eslint` on the profile folder: 0
errors, 1 warning (the set-state-in-effect warning in the unchanged details sheet, present
before this work). `vitest run src/app/(app)/profile`: 12 passed.

**Proofs** (`docs/design/proofs/session-b/profile/`, all from the final build):
`profile-side-by-side-390-dark.jpg`, `profile-390-dark.jpg`, `profile-390-dark-full.jpg`,
`profile-1280-dark.jpg`, `profile-390-dark-values.jpg` (row values), `-nohandle`, `-posts`,
`-posts-empty`, `-signedout`, `profile-390-dark-switch-sheet.jpg`
(Switch role pressed: the dock's workspace sheet open), `profile-header-before-dark.jpg` and
`profile-header-after-dark.jpg`.

**Not verified, and why.**
- **Every proof is fixture-backed.** There is no test account on production and none may be
  created, so the screenshots come from the committed harness
  `apps/web/src/app/(dev)/preview/session-b/profile/` (ruling R-G, behind the preview gate) that renders
  `AccountHero`, `AccountBody` and `SignedOutHero` with fixture props inside the real app shell.
  Round two renders it inside `AppShell` with `signedIn`, so the header and dock are the
  member's. The signed-out variant is shot in the signed-out shell. The fixture counts (12,400
  and 482) are fixture props, not a claim about anybody.
- The live wiring is proven by code, by the RLS and trigger read above, and by the unit tests,
  not by a real signed-in session. The Switch role row pressing the dock's trigger WAS exercised
  in the signed-in harness shell: the sheet opens (Switch profile, Personal, Add a workspace).
- `saved_places` policies were not in the policy read (the query listed the seven tables it
  named); the count uses the same filter `getSavedPlaces` already reads under the same session.
- Storage policies on `avatars` and `social-covers` were not re-read; the upload code is
  unchanged.
- Row values (upcoming, saved, balance, open) were shot with fixture facts
  (`profile-390-dark-values.jpg`); against production the read returns what the account has.
- The ha, ig and yo strings for `socialProfile.accountPage` are drafts awaiting a native speaker.

### 1.7 Final pass, 23 September

**Re-checked.** The governing image beside the re-shot `profile-side-by-side-390-dark.jpg`;
every control in the committed harness on a production build; read-only SQL on the live
project for the badge view.

**Fixed in this pass.** The blue ticks beside the name and on the avatar were the profile's own,
drawn from `social_profiles.is_agent`. The badge is Session A's end to end (scope B-BADGE), so
they are gone. The profile now reads `tier` from `public.person_badge` (live: a view, SELECT
granted to anon and authenticated, `relacl` read on 23 September) through
`loadOwnBadgeTier` and hands it to `BadgeSlot` beside the name and on the avatar. Session A's
badge component was not in the tree at this pass, so the slot rendered NOTHING. (Later the same day e3c90797 wired the slot to Session A's `TierBadge`; see 13.P.) The
render's two ticks are therefore absent from the side by side on purpose. No tier is derived
and no badge artwork or colour is drawn by the profile.

**Commands and output (this pass, final build).**
- `npx vitest run src/app/(app)/profile`: 22 passed (belongings, the Switch role line, the
  `?switch=` targets, `badgeTierFrom`, and the R14 setup back test).
- `npx tsc --noEmit -p .`: no output (clean).
- `npx eslint src/app/(app)/profile`: 0 errors, 1 warning (the existing set-state-in-effect in
  the details sheet).
- `node scripts/check-css-tokens.mjs`: clean.
- `compare-surface.mjs --shape-sweep --routes /preview/session-b/profile,...?v=nohandle,...?v=signedout --theme dark`:
  BREACHES 0, WORTH AN EYE 0, ROUND ICON-ONLY 0.
- Harness: Switch role pressed, the dock's workspace sheet opened (Switch profile, Personal,
  Add a workspace); the name carries `data-badge-tier="none"` and no badge mark.

**BUILT AND UNPROVEN** (this box cannot reach Supabase over HTTP, so no signed-in run exists):
- every data read on the page against a real account: profile row, social identity and counts,
  posts, the four row figures, the workspaces behind Switch role, the badge tier. Proving it
  needs one signed-in session on a deployed build, opening `/profile`, checking each figure
  against the account's rows;
- avatar and cover uploads end to end (storage bucket policies not re-read);
- the `?switch=` redirects for a real owner or agent row;
- Session A's badge once B-BADGE lands (one line in `BadgeSlot`).

**Percentage, with its denominator.**
- Close gate items met: 5 of 5 (second closing audit PASS; badge recorded as blocked).
- Controls exercised in the committed harness on a production build: 3 of 15 (tabs, Switch role,
  the settings gear's target); the other 12 are links and pickers rendered but not driven.
- Chain links proven against a live signed-in session: 0 of 15.

## 2. Get started

Route `/welcome`, governing image `2A49E2F7` (root; the founder re-sent the same
art as `images/1.jpg`). Files: `app/welcome/**`, `components/app/welcome/**`,
`app/(auth)/start/route.ts`, one line of `proxy.ts`, the crops in
`public/brand/session-b/welcome/` cut by `scripts/design/session-b-crops.mjs`.
Proofs: `docs/design/proofs/session-b/welcome/`.

### What it is now

The real first run, not a splash. Four slides on one stage, the render's four
dots: (1) Two worlds. One platform, Property and Stays with the coin between;
(2) what the verified tick means; (3) talk first, pay on Vallo; (4) the ending:
Create account and Sign in for a stranger, one Continue into the app for
somebody signed in. Skippable, shown EVERY time it is asked for (the founder,
23 September, item 6), reachable signed out, swipe, arrow keys, dots and back,
each move announced in a polite live region, 44px taps, safe-area padding,
reduced motion.

**Founder's items of 23 September, applied here.**
- Item 6: `/welcome` never redirects. Everybody who asks for it, signed in or
  not, seen or not, answered or not, gets the slides from the first one. The
  ending fits who is looking: signed out, Create account and Sign in;
  signed in, one Continue (through the interests question only while it is
  unanswered, else into the app). The device cookie no longer suppresses the
  screen; it is still written, for the sign up and sign in detour (W1, W2).
- Item 8: "Look around first" is gone, with its key in all four locales:
  nothing inside the platform is visible signed out. The ending's copy says
  what an account unlocks instead.
- Item 7: "viewing" is "inspection" on slide three, slide four and the art
  label, in all four locales; a sweep of the surface's files finds no
  "viewing" left.
- Item 2: Light mode removed by the founder on 23 September; dark only.
- R14 (Session A, section 49ter): back works. See "Back" below.

Decisions recorded:
- **The interests question stays** for a signed-in person who has not
  answered it. It is the only answer the product acts on at the door (it ranks
  home and search) and `InterestChoices` is its tested implementation, so it
  follows the slides as a fifth beat with no dot. A member's last slide reads
  "You are in. Make it yours." with one Continue and nothing else.
- **Back.** Every slide move pushes a history entry on the same address
  (carrying the App Router's own state, so going back does not reload), and a
  `popstate` listener restores the slide. So the browser's back, a swipe-back
  gesture and Android's hardware back all step to the previous slide. Slides
  two to four draw a 44px glass back square at the top left, level with the
  lockup; slide one draws none, as the render draws none, and back there
  leaves first run the way it came. Found while doing this: the Android back
  handler (`components/app/NativeRuntime.tsx`) is not mounted anywhere in
  `src`, so today Capacitor's default applies (the web view's history, then
  exit), which is exactly what the slide history is built on. When Session A
  mounts it, its `chooseBack` would push `/home` from any slide; request
  **GS5** (welcome's block of the scope file) asks it to honour an in-page
  history entry first. **GS6** asks Session A to update the one check in
  `tests/signup-verify.spec.mjs` that item 6 retires. Proved in the
  browser spec (drawn back and history back from slide three).
- **The device memory**: a stranger's device holds the first-party cookie
  `vallo_first_run=seen` (400 days, Lax, Secure on https), written on Skip, on
  reaching the last slide, or on taking a door; never while rendering. Since
  item 6 it no longer decides whether `/welcome` shows; sign up and sign in
  read it to decide whether a first-time visitor detours here (W1, W2). A
  member's Continue still records `profiles.settings.welcomeSeen`. If the
  browser refuses the cookie, exits carry `welcomed=1` so a page that gates on
  it cannot loop.
- **Intent is kept**: `/welcome?next=/sign-in?next=%2Fwallet` makes Sign in the
  lit door with that address; Skip carries on to `next`.
- **`/start` is a 307** to `/welcome?next=/sign-up` (a route handler, so no
  loading frame streams first). Every landing Get started link already points
  at `/start`, so the landing needed no change. StartCarousel is deleted.
- **Dark only.** Light mode removed by the founder on 23 September; dark only.
- **Header**: the render's page has only the lockup; there is no app chrome on
  this screen by design, so no dock or header is drawn; the back square above
  is the one addition, on slides two to four only.

### (a) The chain

| Link | What | State |
|---|---|---|
| Control | Get Started / Next / dots / arrows / swipe | client state only, nothing to write |
| Control | Back (drawn square, browser, hardware) | `history.pushState` per slide, `popstate` restores it; proved by the browser spec |
| Control | Skip, stranger | `rememberFirstRunSeen()` writes the cookie, then `router.push(next)` or the last slide. Proved by `tests/session-b-welcome.spec.mjs` |
| Control | the two doors | real `<Link>`s to `/sign-up` and `/sign-in`, both open signed out |
| Query | `/welcome` page | `loadInterestsState()` (profiles.interests, profiles.settings under the caller's RLS) into `planFirstRun` (pure, 12 unit tests in `app/welcome/plan.test.ts`), which only chooses the ending |
| Proxy | `proxy.ts` | `welcome` removed from `PRODUCT_SEGMENTS` (claimed in scope first, 9b50916). Before this, a stranger was bounced to sign in and could never meet first run |
| Server action | Continue / Skip, member | `markWelcomeSeen` and `skipInterests` in `lib/interests/actions.ts` (unchanged). No input, so no validation beyond the session |
| RLS | `profiles` | `profiles_update_own` (auth.uid() = id, USING and WITH CHECK), `profiles_select_own`; read live with SELECT on pg_policies, 22 Sept |
| Table | `profiles.settings` jsonb (`welcomeSeen`, `interestsAsked`), `profiles.interests` property_type[] | |
| Triggers | `profiles_set_updated_at`, `profiles_sync_social_identity` (after update), two that fire only on place and name columns | none of them touch these keys |
| Notification | none | none deserved: nothing another person needs to know |
| Screen | `/home` redirects to `/welcome` while `askIntent`; a member's Continue goes to the question or into the app | |
| Stats | none shown | the render shows none; `platform_stats` is not needed |

Broken links found and where they went:
- The proxy blocked the whole surface signed out: fixed (one line, in scope).
- Sign up and sign in pages do not yet send a first-time visitor to first
  run: requests **W1** (Session A, sign up) and **W2** (Session B signin
  worker, sign in and the AuthChoices "What Vallo is" link). The helper they
  call exists: `firstRunHref`, `isFirstRunSeen`, `FIRST_RUN_PASSED_PARAM` in
  `components/app/welcome/first-run-seen.ts`.
- The native app's first launch opens the landing, not first run: **W3**.
  Found: `capacitor.config.ts` sets `server.url` from `CAPACITOR_SERVER_URL`
  (the bare origin) and `webDir: native-shell` holds only the offline card
  (`errorPath`), so a store install loads `/`. Fix is either the env value
  with `/welcome` or a native-only replace on the landing.
- `tests/gate.spec.mjs` is stale on main for reasons unrelated to this
  surface (8 product routes now open by design, 13 unclassified segments, and
  it reads `src/middleware.ts`, now `proxy.ts`): **W4**. Its public list, which
  now holds `/welcome` and `/start`, passes: 23 of 23.

### Claims on the slides, each one checked

| Sentence | Evidence |
|---|---|
| Flip between Property and Stays with a single account | the side flip and one session (`lib/side.ts`, the drawer's flip coin) |
| The tick means someone at Vallo checked the agent's government ID by hand. It is about the person, not the property | `agent_badges.verified := verification_tier >= 1`, rung 1 = identity, "a named member of staff's recorded decision" (`lib/trust/verification.ts`, `lib/trust/agent-badge-derivation.test.ts`). The older "it shows the date" wording was dropped: I could not find the date on a listing surface |
| Message the agent or host and book an inspection first. When you pay, pay on Vallo, never to anybody outside it | messaging and inspection requests exist (`app/(app)/inspections`); the pay sentence is advice, not a guarantee. No "safe", "protected" or insurance wording anywhere |
| An account lets you search, save, message agents and hosts, and book inspections | every one of those is behind the account (item 8: nothing inside is visible signed out) |

### Refused from the render

- The "HOTEL" lettering on the Stays building: retouched blank in the crop
  (harmonic fill from the sign's own glass), the building otherwise as drawn.
- PROPERTY and STAYS as pixels: retouched out and laid back as live text.
- The capsule reading of the button: the render's corner is about 10 css on a
  56 css bar (ratio 0.18, already a rectangle); built on
  `--nf-radius-control` (14px, ratio 0.25) per the shape law.
- The neon phone frame and the status bar: presentation, not drawn.
- The active dot's cyan (#43e2fe): drawn as the brand quiet blue lifted to
  ice, because cyan is the pending state colour in the one blue family. (Cyan
  IS used as light in the headline gradient and the button's lift, where the
  lead allowed it; a dot is a state-shaped mark, so it stays ice.)

### (b) The comparison, 390 x 844 dark, measured

Scale: screen inner edge x 185 to 837 = 652 source px, so 0.598 css per
source px (390/652); screen top y 59, bottom 1458 (1399 px = 837 css).
The web has no status bar, so vertical positions are compared from the top of
the logo mark (render 63 css below the screen top, built 16 css below the
viewport top). Built numbers from `getBoundingClientRect` on the production
server.

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Logo mark | 74 x 70 src = 44 x 42 css | 44 x 42 | yes |
| Wordmark | 166 src wide = 99 css | 99 x 22 | yes |
| Lockup glow, sampled outward from the glyph edge (blue channel over the ground: render ground #010518, built #00041f) | under the wordmark +57 / +9 / 0 at 2 / 6 / 12 css px; under the mark +35 / +16 / +5; over the mark +87 / +36 / +10 | under the wordmark +61 / +23 / +8; under the mark +55 / +17 / +6; over the mark +43 / +10 / 0 (two drop shadows, 2px at 70% and 8px at 50% of the brand blue) | yes on average: the render's halo is uneven (strongest over the mark, where its art glows) and ours is even, so ours is 20 over at 2px under the mark and 44 under at 2px over it; every other point within 14. Within the render's own spread round the lockup |
| Headline line 1 "Two worlds." | cap 46 src = 27.5 css; width 355 src = 212 css; white, heavy | Poppins 700 37px, 212 wide | yes (face is Poppins, the brand display face; the render's reads like SF Display) |
| Headline line 2 "One platform." | 419 src = 250 css; the gradient runs DOWN the letters, the same at every x (sampled in six bands): stroke tops #b6e9fa, middles #52d4fa, feet #0294f9 | 249 wide; built top #9de9ff, middle #66dcff, feet #18a1fe (same method on the 2x shot), from the state cyan and brand blue mixed in sRGB | yes. The lead's note read it as cyan to blue left to right; the samples show it vertical, and the samples decided |
| Baseline spacing | 61 src = 36.5 css | line box 36.5 | yes |
| Line 1 baseline from mark top | 107 css | 107 css | yes |
| Sub-line | 2 lines, 224 css first line, lines 21.5 apart, regular weight (stroke 2 src px, 1.2 css), #88cafa brightest stroke | Inter 400 14.5px, 223 css first line, 21.5 line, quiet blue at 40% into primary | yes |
| Sub cap top to line 2 baseline | 27 css | 13 css margin + half leading = 27 | yes |
| Stage top (tile tops) from mark top | 262 css | 262 (scene top 253 + 24.5 inside the crop, minus 16) | yes |
| Stage art | the render's | the render's own pixels, 636 x 530 src drawn 380 x 317 | yes, identical art |
| Tile radius, rim, thickness, glass, pillars, plinth, reflection | as drawn | as drawn (cropped) | yes |
| PROPERTY / STAYS | cap 15 src = 9 css, 116 src = 69 css wide, pale ice, glow | 11px, 0.19em, 70 css wide, ice with glow, turned with the tile | yes |
| Coin size and place | in a 3x zoom of the stage (3 zoom px per css px): bounding box x 85 to 320, y 60 to 355, overlapping the plinth's front rim, rim low on the left | 101 css face at (49.8%, 62.4%) of the stage, leaning 20 deg, turned 52 deg and tipped 12: bounding box x 85 to 325, y 60 to 350 in the same zoom | yes, within 2 css px on every side (`welcome-coin-render-vs-built-3x.jpg`) |
| Coin face | this render's coin: front face an ellipse, centre (515, 884) src, semi axes 80 and 52, long axis 20 deg from vertical | THIS render's face, cut by the crop script (`coin-face.webp`, 160 px): un-projected from that ellipse to a circle, then turned back by the live coin to the drawn pose (`welcome-coin-face-crop.jpg`) | yes: the same pixels |
| Coin rim | sampled across the band at render row 900 (x 450 to 472, 20 src px = 12 css): outer lip #f2f7ff, body #1f82fd falling to #0f6dfd, front lip #c5f0ff; at row 930 a white specular streak across the band, #fbfffe, low on the left | 15 discs 1px apart, 16 css thick, tipped back 12 deg so the band shows low on the left; each disc an angular gradient, sampled on the built 2x shot: outer lip #94c9ff, body #117fff, front lip #67b0ff; the streak low on the left #eef5ff (208 to 236 deg of the face, so it rides the rim as the coin turns) | yes: body, lips and streak drawn and sampled; the built lips are a little less white (#94c9ff against #f2f7ff) because a 2px lip is half a device pixel wider than the drawn one at 3x and was kept soft to avoid a hard ring |
| Coin motion | still in the render | turns once every 7 s, rests at the drawn pose 45% of the cycle; reduced motion holds the pose | by design |
| Dots | 4, pitch 23 css, active 9.5, rest 7 | 4, pitch 28 css (44 tall buttons), active 10, rest 7 | pitch wider on purpose for the tap |
| Dots centre from mark top | 583 css | 581 | yes |
| Button | 323 x 56 css, 34 in from each side, top 620 below mark top | 324 x 56, x 33, top 618 | yes |
| Button fill, down the centre | #047bfb top, #002cdb a third down, #0027d1 two thirds, #026dfa at the foot | #3c9dfb top (the 1px rim sits in the sample), #0058d3, #0072f1, #0084fe: GLOW_IDENTITY's lit primary (d01a5d7) with its radial cyan lift low in the middle | close: the render's core is a more violet blue (green channel 44) than any brand token mix can reach without a layer-1 token (ours 88); the lightness and the bright top and bottom bands match |
| Button edge and rim | lit all round: #e4feff top, #d6faff bottom, #0180fb sides | 1px border: cyan 22% into white on top, 32% into white at the foot, brand 70% into cyan on the sides; inset 1px rim | yes |
| Button bloom, blue channel over the ground below the bar (render ground #000823, built #000830) | centre: +136 / +65 / +25 at 4 / 10 / 20 css px; halfway to the ends: +64 / +24 / +2. A pool under the middle, not a band | centre +129 / +77 / +20; halfway +65 / +22 / +1 (a short even shadow plus a radial pool under the middle) | yes, within 12 at every point. Hue: the render's pool is a deeper violet blue (#0120ab at 4px) than any brand token reaches (ours #0044b1); no layer-1 token may be used |
| Button label "Get Started" | cap height 18 src (10.8 css), 134 src wide (80.1 css), stems 2 to 3 src (1.5 css): Inter-like, medium; arrow 24 src (14 css) wide | Inter 500 at 15px: cap 10.9, 81.6 css wide (measured with a text range), arrow 20px box (14 css glyph) | yes |
| Button radius | ~10 css | 14 (`--nf-radius-control`) | shape law, recorded |
| Skip | cap 14 src (8.4 css), 37 src wide (22.1 css), stems 2 src (1.2 css): medium; quiet (#345fb7 mean, #60a5fa brightest); centre 705 css below the mark top | Inter 500 at 11.5px (R-A floor 11 respected): cap 8.4, 23.9 css wide; quiet blue at 78%; 44px tap; centre 702 | yes |
| Ground | #000518 top, #000d3e at 36%, #00092d at 73%, #000926 foot, faint grid top | night ink stirred with strong blue in sRGB: #00041a, #000e3c, #00092f, #00072e; 28px grid fading by 55% | yes |
| Glow identity (`docs/design/GLOW_IDENTITY.md`, revised d01a5d7) | | the lit button already has the identity's structure (gradient, top rim, edge glow, bloom); where the identity's numbers differ (its cyan lift), this surface keeps the values measured from `2A49E2F7`, as the lead's note allows | noted |

Two re-audits were done with the render and the 390 dark shot open side by
side. The first found: coin too face-on and too large, button label heavier
and larger than drawn, Skip too loud, the desktop headline lines colliding at
52px on a fixed line box, the desktop sub-line breaking after "and", the dot
buttons drawing a 0.5 ratio in the sweep. All fixed and reshot. The second
pass found no further difference I could fix within the rules above.

Lead polish round (after the lead's review of the side-by-side): the button
rebuilt on the identity's lit primary and re-sampled against the render; the
second headline line re-sampled in bands, which showed a vertical ice to cyan
to electric gradient, now built; the coin matched in a 3x zoom to within 2 css
px and turned the other way so its left rim shows, as drawn. Every proof in
`docs/design/proofs/session-b/welcome/` was re-shot after these changes.

Closing audit round (the audit's three items): the lockup halo sampled at 2,
6 and 12 css px from the glyph edges and matched (row above); the coin now
turns THIS render's own face, cut by `scripts/design/session-b-crops.mjs`
(un-projected from the drawn ellipse, see `SOURCES.md`), in the drawn pose;
the button's bloom rebuilt as the pool the render draws, sampled at 4, 10 and
20 css px at the centre and halfway out. Lead rulings: R-A (type at the
render's size, floor 11px) holds: every role here is at its measured size and
the smallest is the tile label at 11px; R-B holds: the button is the render's
56px, the dots and Skip are raised to 44px tap targets only; R-C holds: the
button is the render's 323 css wide; R-D: the sweep reports 0 at or above
0.35; R-E and R-F do not apply; R-G: the fixture harness is committed at
`app/(dev)/preview/session-b/welcome/page.tsx` (member, `?viewer=guest`,
`?viewer=done`), behind the preview gate, and the member proof now comes from
it rather than Session A's `/preview/f1/welcome`. All proofs re-shot after the
last change.

Second closing audit round: the button label and Skip measured on the image
side (cap height, width and stem width, rows above) and set to 15px and 11.5px
Inter 500 to match (they were 16px and 13px); the coin rim drawn with its
measured body, white lips and the specular streak low on the left. The coin
zoom and the side-by-side re-shot after the change.

Resolution, honestly: the stage is 636 source px for 380 css, 1.67 source px
per css px. At 2x it is sharp; at 3x it is visibly softer than the live text
around it. Nothing is upscaled.

### (c) Light mode

Light mode removed by the founder on 23 September; dark only.

### (d) Shape sweep

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3172
--shape-sweep --routes /welcome --theme both`, 390 and 1536 (light since removed; re-run dark only on 23 September, same result):
BREACHES 0, WORTH AN EYE 0. (The first run flagged the four dot buttons at
14/28 = 0.50; they now use `--nf-radius-xs`.) `check-css-tokens.mjs`: clean.

### (e) Skipped or not verified

- Signed-in proof: no test account may be created, so the member path (slides,
  Continue, the question) is proved by `planFirstRun`'s tests and by the
  committed harness `/preview/session-b/welcome` (fixture props), not by a
  live session.
- Sign in / sign up first-time routing (W1, W2) and the native first launch
  (W3) are requests, not built.
- The translations for the new keys in ha, yo and ig are mine and need a
  native speaker, like the rest of those files.
- Git stash: I used `git stash` once (stash, pull, pop in one command) before
  the lead's warning. The pop restored exactly my three files and the stash
  list was empty afterwards; I have not used it since.

### Final pass, 23 September

**Re-checked.** The render and the 390 dark side-by-side opened together again
(`welcome-render-vs-built-390.jpg`, re-shot on this build): lockup, headline,
sub-line, stage, coin, dots, button, Skip all where the measured rows put them;
nothing close-but-not-right found on slide one. Slides two to four, the
always-shows flow, back on every slide and both signed-in endings exercised
on a fresh production build (`next build` + `next start` with the preview
harness open).

**Fixed in this pass.** Leaving first run for the app (a member's Continue
with nothing left to answer, and a member's Skip) hung with the button busy
when `/home` answered with a redirect: a client-side `router.replace` to a
redirecting route stalled mid-transition here. `leave` is now a full
`window.location.replace`, which follows any redirect and leaves no slide
entries in the app's back stack. Found by exercising the harness, now covered
by the spec. Added the swipe to the spec, the one input it never drove.

**Commands and output.**
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` over `app/welcome`, `components/app/welcome`, `app/(auth)/start`,
  `app/(dev)/preview/session-b/welcome`, the spec: 0 errors, 1 warning (the
  existing `set-state-in-effect` in `InterestChoices.tsx`, unchanged).
- `node scripts/check-css-tokens.mjs`: clean.
- `npx vitest run src/app/welcome`: 12 passed (12).
- `BASE_URL=http://127.0.0.1:3172 node tests/session-b-welcome.spec.mjs`: 24
  checks, all passed (reachability, /start, slides by button, key, dot and
  swipe, live region, back by square and by history, shown every time, the two
  doors, no look-around door, cookie written, intent kept, the signed-in
  ending: one Continue, Continue to the real interests question, Continue into
  the app).
- `node scripts/design/compare-surface.mjs --shape-sweep --routes
  /welcome,/preview/session-b/welcome --theme dark`: BREACHES 0, WORTH AN EYE
  0, ROUND ICON-ONLY 0.

**Badge.** First run draws no person's name or avatar, so there is no badge
slot on this surface.

**BUILT AND UNPROVEN** (this box cannot reach Supabase over HTTP, so no live
signed-in run is possible):
- A member's Continue writing `profiles.settings.welcomeSeen`, and Skip
  writing `interestsAsked` (`markWelcomeSeen`, `skipInterests`): the calls run
  in the harness signed out, where they return without writing. Proving it
  needs a signed-in session against the live project.
- The interests question's Save and Skip (`saveInterestsAction`,
  `skipInterests`): rendered and reached; the write needs a session.
- A signed-in `/welcome` read (`loadInterestsState` with a session): proved
  by the plan's unit tests and the harness, not by a live row.
- Android's hardware back on a device: proved through the web view's history
  in Chromium; a device run needs the native shell (and GS5 once NativeRuntime
  is mounted).
- The store first launch opening `/welcome` (W3) and sign up and sign in
  detouring a first-time visitor here (W1, W2): requests, not built here.

**Percentages.**
- Close gate items met: 5 / 5 (measured match, wired, no claims, dark checks
  and sweep, pushed; light removed by the founder, so not counted).
- Controls exercised in a browser: 12 / 15 (Get Started, Next, dots, arrow
  keys, swipe, stranger's Skip, back square, history back, Create account,
  Sign in, Continue to the question, Continue into the app; not exercised
  with a write: a member's Skip, the question's Save and Skip).
- Chain links proven: 7 / 10 (control, cookie persistence, the page query's
  signed-out path, RLS policies, table and triggers read live on 22 September,
  screen; unproven: the member write, the signed-in read, the question's
  write). Notification: none deserved, not counted.

## 3. Welcome back

Route `/sign-in` (the chooser) and `/sign-in/email` (the password step).
Governing image `55A56F21-0654-4F2D-984B-60A8CE97BB17.png`. The same shell
frames `/sign-up`, `/sign-up/email`, `/sign-up/verify`, `/forgot-password`,
`/reset-password` and the welcome worker's `/start`; they inherit it and were
swept with it. Proofs: `docs/design/proofs/session-b/signin/`.

### (a) The chain, every link

| # | Link | What it is | State |
|---|---|---|---|
| 1 | Control: email field + Continue | `AuthChoices` GET form to `/sign-in/email`, carrying `email` and `next` | Works. The address goes by query string by design (the chooser needs no action); `emailFromQuery` drops anything not shaped like an address |
| 2 | Next step decided on the server | `sign-in/email/page.tsx` calls `signUpMethodForEmail` (service-role RPC `public.signup_method_for_email(text)`, SECURITY DEFINER, EXECUTE held by `postgres` and `service_role` only, confirmed in `pg_proc`), behind the per-connection limiter (60 an hour, `public.consume_rate_limit`, service role only) | NEW this session. "google": the screen says there is no password and offers the real Google door; "none": says no account uses it and links to `/sign-up/email` with the address and `next` carried; anything else: the ordinary password step |
| 3 | Control: password + Sign in | `EmailAuthForm` (client, controlled fields) posting to the server action `signInWithEmail` | Works |
| 4 | Validation | `validateCredentials` on the server (address shape, 8 to 200 characters) | Works; field errors land on the fields |
| 5 | Throttle | 10 a minute per IP (`sign_in`), 60 an hour per address (`sign_in_address`) with a `risk_alerts` row when the ceiling trips | Works; message "Too many attempts just now. Try again in ..." |
| 6 | Supabase auth | `supabase.auth.signInWithPassword` via the server client (cookies written server side) | Works. Errors mapped by `authMessage`: wrong password, unconfirmed address, rate limit; deactivated accounts get their own notice with a way out |
| 7 | Error on screen | `role="alert"` block, now `.nf-auth__alert`: ROSE (`--nf-state-error`), where it wore `--nf-state-warning`, the pending cyan | FIXED here |
| 8 | Profile row | `on_auth_user_created` on `auth.users` runs `public.handle_new_user` (SECURITY DEFINER), confirmed in `pg_trigger`. Sign-in reads nothing else; `profiles` RLS is select/update own plus admin select | Present. Not exercised live (no user may be created) |
| 9 | Redirect | `landingAfterAuth` re-validates `next` with `safeReturnPath` (no scheme, no `//`, no backslash, no control characters), defaults to `/home`; `revalidatePath("/", "layout")` then `redirect` | Works. `next` survives chooser, password step, Google, and the "none" hand-off to sign-up |
| 10 | Intent | `proxy.ts` sends a signed-out product visit to `/sign-in?next=<path incl. ?do=verb>&notice=sign-in-required`; `auth-intent.ts` reads `do` back on arrival | Works; `next` is the carrier |
| 11 | Google | `startGoogleOAuth` form action, provider fixed server side, `redirectTo` = `/auth/callback?next=...&intent=sign-in`; the callback page runs `completeEmailVerification` (code exchange) and shows the sign-in moment, not "Verifying your email" | Works in code. Drawn only when `getProviderStates` says Google is on |
| 12a | First run (request W2) | `/sign-in` sends a device without `vallo_first_run=seen` to `/welcome?next=<the whole sign-in address>`; straight through on the cookie, on `welcomed=1`, and on the account notices (`first-run-gate.ts`, six unit tests) | NEW. Measured: a cookieless browser opening `/sign-in?next=/home` lands on `/welcome?next=%2Fsign-in%3Fnext%3D%252Fhome`. It arrives as a streamed redirect (HTTP 200 with the `NEXT_REDIRECT` marker and a meta refresh), not a 307 header, because the auth layout has begun streaming; a header-level 307 would need `proxy.ts`, which is not mine |
| 12 | Sign up link | `/sign-up` (the real entry; the welcome worker may route it through `/welcome`) | Works |
| 12c | Back (Session A's R14) | `AuthBackBar` in the (auth) layout mounts the shared `BackButton` when `parentOf` answers "parent"; a 44 px glass square top left, opposite the language control. Walked on the production build, pressing it on each route: `/sign-in` to `/welcome`, `/sign-in/email` to `/sign-in`, `/sign-up` to `/welcome`, `/sign-up/email` to `/sign-up`, `/sign-up/verify` to `/sign-up/email`, `/forgot-password` and `/reset-password` to `/sign-in`. `/auth/callback` sits outside the group (a moment that navigates itself) and draws none, confirmed. `auth-back.test.ts` holds all eight parents and that none is an app root | NEW. `/sign-in`'s parent is already `/welcome` in `route-parents.ts` (not `/start`), so back from sign in no longer heads to sign up; no request needed |
| 12b | "What Vallo is" | On the sign-up card only; now `/welcome?next=/sign-up` with prefetch off (it was `/start`, a redirect prefetched on every render, which kept the page's network from ever settling). Sign-in carries no such link: a first-time visitor is already sent to first run by 12a | CHANGED |

Broken links found and not in my files (none blocking):
- `authMessage` says "Open the link we sent you" for an unconfirmed address,
  but sign-up now confirms with a CODE at `/sign-up/verify`. The better answer
  is an `action` link to `/sign-up/verify`, which needs `lib/auth/actions.ts`
  (not mine) to set the pending-email cookie on that refusal. Scope request
  SIGNIN-1 in `docs/SESSION_B_SCOPE.md`.

### (b) The comparison, 390 dark (round three, under lead rulings R-A to R-G)

**Scale.** The render's card is 633 of 1024 px, 61.6 per cent of the width;
under R-C the built card is the same share: **240 CSS px at 390, so
s = 240 / 633 = 0.379**, and every "at s" below is a render measurement times
0.379. Font sizes come from measured cap heights (cap / 0.72). R-A: each text
role at the render's size, raised only to its floor (11 px for sub, label,
caption, button and link text; 16 px for a typed value); headings at the
render's size. No surface-wide factor. R-B: controls at the render's height
unless under 44, so all three are 44; the gaps around them are the render's
px times s. Strings wrap before the card grows (none needs to at 390). The
240 px card applies to the two screens the render draws (the chooser, its
sign-up twin, and the password step, marked `.nf-auth--narrow`); the
nine-field sign-up form, the code, the reset and the recovery keep the wider
shell card. Built values are `getBoundingClientRect` / `getComputedStyle` on
the production build; colours are pixel samples of the 2x shot.

**Height.** Scaled by width, the whole 1024 x 1536 render covers only 582 of
844 px, so its heights as shares of the screen and its proportions cannot
both hold. The proportions hold (R-C); the composition is centred on the
render's own midpoint (tile top 14.5 per cent to plinth foot 92.4, midpoint
53.5), which puts the tile centre at 29 per cent.

| Property | Image (measured) | Built (measured) | Match / why not |
|---|---|---|---|
| Card width | 633 of 1024 = 61.6% | 240 of 390 = 61.5% | yes |
| Card height | 632 render = 240 at s | 309 | +69: three controls at 44 against 27, 29, 27 (R-B, +49) and text at its floors |
| Aurora margins | 196 and 196 render = 74 each | 75 and 75 | yes |
| Tile centre height | 23.4% | 29.0% (y 245) | centred on the render's midpoint instead; see Height |
| Wordmark centre height | 37.4% | 38.6% (y 326) | yes |
| Card top | 46.0% | 43.6% (y 368) | the slogan's line closed by half |
| Plinth | 87.1 to 92.4%, 725 x 84 render, whole | 80.2 to 84.0% (y 677 to 709), 275 x 32, whole: x 58 to 333 | shape and size yes (render pixels); position follows the taller card |
| Stage (sky, curtains, horizon, floor) | render | render pixels (`stage.webp`) at 388 x 582, on a 3072 x 2304 canvas drawn 1165 x 874: the render's light continued 1024 px each side and 768 below from just inside its own vignette, blurred and dimmed with distance, feathered only at the canvas's far edges. Measured: largest step between neighbouring 2 px samples in the side 30 px bands 6 (of 765) at 390 and at 430; no step under the plinth apart from the terms text; no hard edge at 1440 | yes, and no edge, band or strip in frame at 390 x 844, 430 x 932 or 1440 x 900 |
| App tile + wordmark | tile 258, wordmark 382 x 70 | render crop 176 x 171: tile 98, wordmark 145; sky keyed out (floor 110), served as cut (`unoptimized`). Measured with the lockup shown and hidden: identical pixels outside the lit marks (#01298D / #01298D, #001C6F / #001C6F, #010D40 / #010D40), so no box | yes (pixels); 464 source px for 528 device px at 3x (1.14x), under 1x at 2x |
| Slogan | "Real Estate reimagined!" | none | REFUSED (claims rule, founder) |
| Card corner | 42 render = 16 | 18 (`--nf-radius-lg`) | +2, the nearest rung |
| Card inset | 60 render = 23 | 23 sides and top, 16 foot | yes |
| Card glass | top-left #001A64, top-right under a curtain #0A2C7C, foot #001658 / #001A62 | translucent (58% canvas tint, lit-ink bands, 14 px backdrop blur): top-left #001A4C, top-right #001D5D, middle #002051, foot #001C6B / #001A65 | yes, within about 12 levels per channel; the render's curtain-lit corner (#0A2C7C) is brighter than ours |
| Lit rim | left edge at y 1000: one hot line #9BE2FE, electric band #0551D0 > #0040D8 > #0137BC, 3 px | 1 px hot line (white + quiet blue), 3 px electric inset band | yes |
| Top highlight | centre #9EE5FE, fading to the corners | 2 px white-to-rim-hot line over the middle 84%, cyan radial 55% x 16 px (glow identity d01a5d7) | yes |
| Card glow | tight bloom | 1 px ring, 8 and 28 px blooms at glow rungs 3 and 4 | yes |
| Title | "Welcome Back", caps 25 = 9.5 at s: 13.2 px, semibold | "Welcome back", Poppins 600, 13.5 px | size yes (R-A, a heading at the render's size); sentence case is house style |
| Sub | caps 15 = 7.8 px, regular | Inter 400, 11 px | raised to the floor (R-A) |
| Title to sub | 21 render = 8 | 5 between line boxes (caps about 8) | yes |
| Sub to field | 43 = 16 | 16 | yes |
| Email field | 71 tall = 27; corner 12 = 5; fill #00144C; edge #0B4FD0 | 44 tall (R-B); corner 14 (`--nf-radius-control`, shape law); navy glass; electric edge | height R-B; corner the shape law |
| Placeholder | caps 15 = 7.8 px | 11 px | floor (R-A); a typed value is 16 px (R-A, iOS zoom) |
| Envelope glyph | 24 render = 9, 32 from the edge = 12 | UiIcon `mail` 14, 12 from the edge | glyph 14 so the stroke survives |
| Field to button | 42 = 16 | 16 | yes |
| Continue button | 77 tall = 29; fill #0380FE > #0038E8 > #004BFD, top hairline #F6FEFE, foot line #D7FAFE, bloom | 44 (R-B); `--nf-gradient-cta` plus 18% white top sheen, 1.5 px white top inset, rim-hot foot inset, 14 + 32 px bloom | treatment yes; height R-B |
| Continue label | caps 18 = 9.4 px, semibold, arrow | 11 px 600, arrow 12 | floor |
| Button to OR centre | 47 = 18 | 19.5 | yes |
| OR | caps 13 = 6.8 px, regular, 1 px hairlines | 11 px 500, 1 px hairlines | floor |
| OR centre to Google | 39 = 15 | 16.5 | yes |
| Google button | 70 = 27; glass outline #1481DC | 44 (R-B); glass, electric edge | height R-B |
| Google label | caps 17 = 8.9 px, medium | 11 px 500 | floor |
| Google G | 31 render = 12 | 12, Google's own colours (a file, not tokens) | yes; the one third-party mark |
| Google to foot line caps | 45 = 17 | 14 + half-leading 3 = 17 | yes |
| Foot line | "Don't have an account? Sign up", caps 13 = 6.8 px | "New to Vallo? Sign up", 11 px, Sign up 600 `--nf-content-link` | floor; wording on the lead's request (`auth.newToVallo`, four locales) |
| Foot line to card foot | 49 = 19 | 16 + half-leading 3 = 19 | yes |
| Icon plates | none | none | n/a |
| Status badges | none | none | n/a |
| Language control | not drawn | 44 px glass rounded rectangle, top right, clear of the tile | kept: a working control |
| Back control | not drawn | 44 px glass rounded rectangle (corner 14, ratio 0.32), top left at 16, 16, clear of the tile; card and lockup positions unchanged (card 75, 368, 240 x 309) | added: R14, Android back |
| Terms line | not drawn | 12 px muted, two lines, under the floor's lit reflection | kept: a Google sign-up passes no tick |
| Colours | one blue family | one blue family plus Google's G | yes |

Password step and its states (the render does not draw them) take the same
card and the same floors: labels, notices, refusals, the way back and
"Forgot password?" at 11 px, fields 44 with 16 px typed values, Sign in 44.

Desktop (1440 x 900): the same card at 280 px, centred, the stage scaled with
it. Derived from the phone; no desktop render governs it.

### Refused from the render
- "Real Estate reimagined!" under the wordmark: a positioning statement, removed
  by the founder on 22 September; not drawn, not in alt text, not in the crops
  (the stage hole lifts it out; the lockup box ends above it). Nothing replaces it.
- Nothing else on this render makes a claim.

### Glow identity (`docs/design/GLOW_IDENTITY.md`, d01a5d7)

The identity's structure is followed (lit edge as bands, lit primary with a
bright top line and a bloom under it, the top-centre highlight and the
lit-ink bands in the glass). Where 55A56F21 measures differently it wins on
this surface, per the lead's instruction: the card's edge is the render's hot
hairline over an electric band rather than the identity's four per-side
colours, its glass tint is sampled from the render (a dark translucent tint
under the lit-ink bands) rather than the identity's gradient alone, and the
Continue button keeps the render's white top hairline (#F6FEFE) and lit foot
(#D7FAFE) rather than the identity's cyan edge. Card corner: the render
measures 42 render px, 16 CSS at s = 0.379; built 18 px (`--nf-radius-lg`,
the nearest rung), against the identity's 12. These agree with the table
above.

### (c) Light mode

~~Light mode: 0 computed-style differences on five routes.~~ Light mode removed
by the founder on 23 September; dark only.

### (d) Shape sweep

Round three, production build, 390 and 1536, dark and light, three runs
(`welcomed=1` keeps the sweep on the page rather than following first run):
`/sign-in?welcomed=1`, `/sign-in/email`; `/sign-up?welcomed=1`,
`/forgot-password`; `/preview/session-b/signin?state=refused` and
`?state=google`. Every run:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
```

`check-css-tokens.mjs`: clean. `tsc --noEmit`: clean. eslint on the changed
files: 0 errors. Unit tests: 49 passing across `app/(auth)/sign-in`,
`components/auth`, `lib/auth`.

### Proofs (`docs/design/proofs/session-b/signin/`)
Re-shot after the final round-three change, production build, 390 x 844 at 2x
unless named. LIVE (no fixtures): `signin-vs-55A56F21-390.jpg` (the render
beside the build), `signin-390-dark.jpg`, `signin-email-390-dark.jpg`, `signup-390-dark-inherits.jpg`,
`forgot-390-dark-inherits.jpg`, `signin-1440-dark.jpg`. FIXTURE-BACKED (R-G,
harness committed at `apps/web/src/app/(dev)/preview/session-b/signin/`, open
with `VALLO_PREVIEW_HARNESS=1`): `harness-google-390.jpg`,
`harness-none-390.jpg`, `harness-refused-390.jpg`, the three password-step
answers that need an account to exist.
Audit rounds: one fixed the grey card and flat edge; two (lead) the
proportion, glass, plinth and terms line; three (lead rulings) the card to
the render's 61.6 per cent and every text role to the render's size with its
floor; four (second closing audit) the crop box behind the lockup (the old
cut, keyed at floor 70, was also being served from the image optimiser's
cache across builds; it is now keyed at 110 and served as cut), the stage's
hard edge and side strips (the plate now continues the render's own light
past every edge), and the corner numbers in the glow identity paragraph.
`signin-430-dark.jpg` added for the 430 x 932 check.

### Crop resolution
The lockup draws 176 CSS px from 464 source px (1.14x the source on a 3x
phone, under 1x on 2x); the stage 388 CSS px from 1024 (1.14x at 3x). Close
to source resolution at 3x; no upscaling filter was applied.

### (e) Skipped or not verified
- No live sign-in, OAuth round trip, rate-limit trip or error message was
  exercised against production: no test user may be created. Proven by code
  reading, SQL introspection (`pg_trigger`, `pg_proc`, `pg_policies`) and the
  existing auth unit tests (43 passing).
- `signUpMethodForEmail` on the password step: its "google" and "none"
  branches were not seen live (the local build returned the ordinary step).
- New keys `auth.accountUsesGoogle`, `auth.accountNotFound`,
  `auth.accountCreate` are in English only; Yoruba, Hausa and Igbo fall back
  to English until a speaker writes them.
- No new test file was added for this surface.

### Final pass, 23 September

**Re-checked.** The governing image beside the latest side-by-side
(`signin-vs-55A56F21-390.jpg`): card 240 x 309 at 75, 368, lockup, stage and
plinth unchanged since the passing third audit; nothing found close but not
right that the rulings allow changing. Every auth route walked on the
production build of this worktree, and every refusal the password step can
show exercised through the committed harness, now extended with
`?state=unconfirmed`, `throttled`, `deactivated` and `fields` beside
`google`, `none` and `refused` (proofs `harness-*-390.jpg`).

**Commands and output (worktree, production build, 390 x 844, dark).**

```
vitest run src/app/(auth) src/components/auth src/lib/auth
  Test Files  7 passed (7)   Tests  58 passed (58)
tsc --noEmit -p apps/web                                  clean
eslint (auth layout, sign-in, harness, AuthChoices, EmailAuthForm, fields)
  0 errors (28 warnings, all pre-existing raw-spacing notes in untouched files)
check-css-tokens.mjs   clean: 0 raw colours, 0 unresolved var(), 0 capsules
compare-surface --shape-sweep --theme dark, /sign-in?welcomed=1, /sign-in/email,
  /sign-up?welcomed=1, /forgot-password, harness refused, deactivated, fields:
  BREACHES 0   WORTH AN EYE 0   ROUND ICON-ONLY 0
harness states (role=alert / role=status text, card width 240 on every one):
  chooser      status "Sign in to open that. ..."
  google       status "This address signs in with Google ..." + Google button
  none         status "No account uses this address yet. Create one with it"
               -> /sign-up/email?email=ada%40example.com
  refused      alert  "That email and password do not match. ..."
  unconfirmed  alert  "Confirm your email first. ..."
  throttled    alert  "Too many attempts just now. Try again in a minute."
  deactivated  alert  real deactivatedAccountNotice(), link /delete-account#restore
  fields       two field alerts under their fields
  submit       typing a password and pressing Sign in posts through the real
               form to the fixture action and draws its refusal
  continue     /sign-in -> /sign-in/email?email=ada%40example.com, field filled
back control, pressed on each route:
  /sign-in -> /welcome   /sign-in/email -> /sign-in   /sign-up -> /welcome
  /sign-up/email -> /sign-up   /sign-up/verify -> /sign-up/email
  /forgot-password -> /sign-in   /reset-password -> /sign-in
  /auth/callback: none drawn (outside the group, navigates itself)
```

**Fixed in this pass.** The harness now covers every refusal the server can
return, so the rose alert, the deactivated notice's restore link and the
field errors are proven drawn, not assumed.

**Badge.** Not applicable: no auth screen draws a person's name or avatar.

**BUILT AND UNPROVEN.** This box cannot reach Supabase over HTTP (egress
refused), and no test user may be created, so none of these has run live:
1. `signInWithPassword` succeeding and the session cookies landing the person
   on `next` (links 6, 9). Proving it needs one test account on a preview
   deployment and one sign-in with `next=/listing/x`.
2. The real refusals from GoTrue mapped by `authMessage` (links 5, 6, 7 live);
   drawn here from the same sentences, not from GoTrue's answers.
3. `signUpMethodForEmail` answering "google" or "none" on the password step
   (link 2); proven drawn, not proven looked up. Needs a Google-made account.
4. The throttle tripping (`consume_rate_limit`) and its risk alert (link 5).
5. Google OAuth to `/auth/callback` and back with `intent=sign-in` (link 11).
6. `handle_new_user` writing the profile row (link 8): present in `pg_trigger`
   by read-only SQL on 22 September, never fired from here.

**Percentages.**
- Gate items: 5 / 5 met (third closing audit PASS; light struck by ruling).
- Chain links proven end to end on this box: 7 / 15 (1 the chooser's hand-off,
  7 the refusal on screen, 12 sign-up link, 12a first run, 12b What Vallo is,
  12c back, 10 the intent carried in `next` through the chooser). The other 8
  are built, read and introspected, and listed above as unproven.
- Controls on the built page, 17 in all (chooser: email field, Continue,
  Google door, Sign up, back, language control, three terms links; password
  step: email field, password field, show/hide, Sign in, Forgot password,
  Other ways; notices: their Google button, Create one, Restore).
  Pressed and followed to their result: 5 / 17 (chooser email field and
  Continue, password field and Sign in, back). Drawn with their destination
  read off the page and correct: 14 / 17 (adds Sign up, Forgot password,
  Other ways, Create one, Restore, the three terms links, show/hide). Not
  proven: the two Google buttons (OAuth) and the language round trip.


## 4. Wallet

Governing image: `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` (repo root). Route
`/wallet`. Worker: wallet. Round three, 23 September, under lead rulings R-A to
R-G and the closing gate.

**Scale.** The render's phone screen runs x=177 to x=844: 667 image px for a
390px viewport, 1.71 image px per CSS px. Font sizes are measured two ways and
must agree: the string's rendered width divided by its width in ems, and a
single glyph's cap height divided by the face's cap ratio (Inter 0.727).

**Header row.** The render's back square is now drawn: `WalletBack` mounts the
platform `BackButton` to the route's declared parent (`/wallet` -> `/home`,
`/wallet/send` -> `/wallet`, R14, tested in `session-b-wallet.test.ts`), top
left above the balance card, as the render's 37px glass square at 44px (R-B).
The app tile with VALLO, bell and profile button are the app bar `AppShell` draws on every
in-app page (DESIGN_DIRECTION 3.2). It is not Session B's. The page adds no
second header row; the balance card is the first thing under the app bar.

**Proofs** (all fixture-backed, from the committed harness
`apps/web/src/app/(dev)/preview/session-b/wallet/`, R-G, on a production
server, shot after every animation settled):
`docs/design/proofs/session-b/wallet/wallet-side-by-side.jpg` (render left,
built right, same scale), `wallet-390-dark.jpg`,
`wallet-390-dark-reduced-motion.jpg`,
`wallet-1280-dark.jpg`, and `wallet-roll-frozen-midway.png` (every digit strip
frozen half-way between two digits, the worst frame the roll can paint: each
digit is clipped to its own band and nothing overlaps).

### (a) The chain

Balance and statement (read):

| Link | What it is | State |
| --- | --- | --- |
| Screen | `app/(app)/wallet/page.tsx` renders `WalletDeck` (balance card, `WalletTiles`, Quick Actions), `RecentActivity`, the pots | OK |
| Query | `getWalletForViewer()` -> `readStatement()` (`lib/wallet/repository.ts`): `wallet_balances` for the figure, the newest 100 `wallet_entries`, both on the viewer's own Supabase client | OK |
| Policy | `wallets_select_own` (`auth.uid() = user_id`), `wallet_entries_select_own` (the entry's wallet is the viewer's), admin select policies; RLS on for `wallets`, `wallet_entries`, `notifications` (read in `pg_class`) | OK |
| View | `public.wallet_balances` = `private.wallet_balance(id)`: COMPLETED credits minus debits, returned only to the owner or an admin | OK |
| "this week" line | `weekChange()` (`components/app/wallet/week-change.ts`): the net of the viewer's COMPLETED rows in the last 7 days as a percentage of the balance the week began on; no line when there are no rows; the net amount when the week began at zero. Computed from real rows; the render's 12.5 is never drawn | OK |
| Live | `LiveWallet` subscribes to INSERTs on `public.notifications` for this user (`supabase_realtime` publishes `messages` and `notifications`, not `wallet_entries`, read in `pg_publication_tables`). Every COMPLETED ledger row fires `wallet_entries_notify_after_change` -> `private.notify_wallet_entry()` -> `private.notify(owner, 'wallet', ...)`; wallet notices have no mute preference, so a `kind = 'wallet'` insert means the ledger moved, and the page calls `router.refresh()` | OK (added in round one) |
| Live, pending rows | A PENDING row (a withdrawal hold) notifies nobody, so it shows on the next read | BROKEN, scope request W2 (migration: publish the table) |
| Back | `WalletBack` -> `BackButton` -> `useBack` -> the declared parent from `lib/nav/route-parents.ts`, so Android's hardware back no longer closes the app on these pages | FIXED (R14, `24eac4c6`) |
| Eye | `balance-mask.ts`: the hide/show choice in this device's storage, guarded, default shown; shared with the send page | OK |

Every control on the page:

| Control | Goes to | Real end to end? |
| --- | --- | --- |
| Send tile | `/wallet/send` | Yes, section 5 |
| Receive tile | `/wallet/receive` (address, handle, shareable request) | Yes |
| Add money tile | funding sheet -> `fundWallet` (hosted Paystack) or `fundWalletWithSavedCard` -> webhook / `verifyFunding` -> `recordFunding` | Yes: one COMPLETED deposit in the production ledger (9 August 2026) |
| History tile | `/wallet/transactions` | Yes |
| Quick: Send / Request / Cards / Settings | `/wallet/send`, `/wallet/receive`, `/settings/payments`, the wallet settings sheet | Yes |
| See all | `/wallet/transactions` | Yes |
| A row | `/wallet/transactions/[id]`, the receipt | Yes |

### Refused from the render

| Render element | Why |
| --- | --- |
| Swap tile | No second currency; crypto is dark by ruling. BUILD_07 section 49, R2 |
| "Top Up" label | A render label (CLAIMS_RULE). The path is real, so the tile says "Add money", the product's own name |
| Buy Airtime, Pay Bills | Products Vallo does not sell (R2) |
| Quick Actions "See all" | All four actions are on screen; the link would go nowhere |
| Withdraw (not in the render; the natural fourth tile) | Not drawn: the only production withdrawal FAILED with Paystack's "You cannot initiate third party payouts as a starter business". Scope W4 |
| ₦245,680.00, +12.5%, every row | Example content; the page prints the ledger |
| Cyan "Completed" | The platform's one success colour is emerald (DESIGN_DRIFT_SURVEY 3.4, option a) |
| The trust copy that used to ride in the wallet dictionary ("Your money is safe", "Encrypted in transit", "256-bit TLS") | Removed in `d84a4832`. `TrustStrip` now carries two true sentences (a naira record, not a bank deposit; a completed send cannot be recalled), is not drawn on the wallet home, and survives only because Session A's older harness imports it |

Founder questions: should Withdraw come back once Paystack payouts work; does
the wallet home want a reassurance card (the render has none, so none is
drawn).

### (b) The comparison, 390px dark

Built values are the browser's (`getBoundingClientRect`, computed style,
sampled pixels) on `next build && next start`, harness above.

| Property | Image (measured) | Built (measured) | Match? |
| --- | --- | --- | --- |
| Card width, gutter | 364px, 13.5px gutter | 362px: the money page reaches 10px into the shell's 24px gutter on a phone (R-C) | Yes (2px) |
| Card height | 185px | 195px | Near: 10px, the 44px eye tap target in the label row |
| Card radius | rim reaches the side 24 image px down = 14px | 14px | Yes |
| Card fill, top / middle / foot | rgb(0 39 123) / (0 17 63) / (0 21 96) over a page of (0 7 37) | (0 50 126) / (0 29 74) / (0 41 100) | Yes: the same blue glass, a touch brighter mid-card |
| Rim | 1px: (14 125 204) top, (6 172 246) sides, (37 188 255) foot | 1px per-side edge (glow identity): pale cyan top, deep blue right, lit bottom, sky left | Yes in form; ours a shade less cyan |
| Glow | none off the card: the page reads (0 7 37) up to the left rim; 2px above the top rim rises to (3 13 43) | the identity's tight halo only (4px and 12px), the two wide blooms removed in round three | Yes |
| "Total Balance" | 67.8px wide = 11px, regular, soft white | 11px / 500, `--nf-content-secondary` | Yes (R-A) |
| Figure | one digit's cap 24.0px = 33px Inter bold; whole string 186px wide | 33px / 700, whole string 188px wide; kobo 0.6em; never wraps | Yes. The survey's "40px" read the naira sign and comma into the cap height |
| Change line | "+12.5% this week" 105px wide = 14px, the good colour | 14px / 500, `--nf-state-success`, 16px arrow | Yes (emerald, see refusals) |
| Wallet object | 138 x 150 image px = 81 x 88 | the render's own object (`wallet-naira`, cut from this image, ICON_SYSTEM.md), in a 128px box | Yes in form; sized to clear the figure |
| Tiles | 76 x 63, gap 8, radius 8 | 75 x 62, gap 8, radius 14 (shape law, ratio 0.23) | Size yes; corner is the law's |
| Tile label | "Send" 22.8px wide, "Receive" 35.1px = 10.5px | 11px / 500 (floor), "Add money" 56px in a 71px interior | Yes (R-A floor) |
| Tile glyph | 22px | 22px stroked, 1.5 stroke | Yes |
| Lit tile | (0 125 255) -> (0 49 247) -> (0 139 253), white top edge | `--nf-gradient-cta`, specular top rim, the identity's cyan edge | Yes |
| Resting tile | (0 22 80) with an inward glow | 32% brand over canvas, inset glow | Yes |
| Section heads | "Quick Actions" 87.7px wide Poppins 600 = 13px | 13px / 600 | Yes (R-A) |
| See all | 29.2px wide = 8.6px | 11px / 500, 44px tall tap target (R-B) | Yes (floors) |
| Quick cards | 87 x 70 | 84.5 x 82 | Near: two 11px lines under a 31px tile |
| Quick plates | 31px glass tile, 9px in from top and left | the render's own tiles (`send-plane-tile` is this image's), tile edge 10px in | Yes |
| Quick title / sub | 9.4px / 7.7px | 11px / 600 and 11px / 400, one line each | Yes (floor) |
| Panel | one card, head and five rows, radius 14 | one card, radius 14 | Yes |
| Head to first row | 18px (title baseline to first row) | 18px | Yes |
| Rows | 57px | 56px | Yes |
| Row title / counterparty / date / amount | 10.1 / 10 / 10 / 10.7px | 11 / 11 / 11 / 11px (floor); counterparty in `--nf-content-link` | Yes (floor) |
| Row circle | 61 image px = 36px | 36px, 20px glyph | Yes |
| Badge | 17px tall, "Completed" 39.2px wide = 7.5px | 11px / 700, 18px tall, 6px corner (ratio 0.33), with the platform's shape mark | Yes; the mark stays (survey part six, 8) |
| Hairlines | between rows | `--nf-divider` between rows | Yes |

Three differences a side-by-side still shows, each on purpose: the shell's
header (shared chrome); the object sits slightly smaller; our tile corners are
14px against the render's 8px (the shape law).

### (c) Light mode

Light mode removed by the founder on 23 September; dark only. Every
`[data-theme="light"]` rule, paper twin and paper plate is gone from
`wallet.css`, `QuickPlate.tsx` and `SendFlow.tsx` (`24eac4c6`).

### (d) Shape sweep and checks

```
shape sweep (23 Sept, after R14 and item 3, dark only): /preview/session-b/wallet, .../send, .../send-filled, .../send-bank
BREACHES: 0   WORTH AN EYE: 0   ROUND ICON-ONLY: 0   COVERED: 4 routes, 0 refusals

earlier run: /preview/session-b/wallet, /preview/session-b/wallet/send, /preview/session-b/wallet/send-filled at 390px, 1536px in dark and light
BREACHES (ratio >= 0.5): 0
WORTH AN EYE (> 0.35): 0
ROUND ICON-ONLY CONTROLS: 0
COVERED: 3 route(s) asked for, 0 refusal(s), 6 route/width/theme combination(s) actually measured.
```
(The tool counts a combination only when it reported a control in it.) Round
three's first run found 20 status badges at 0.44 after they were squeezed to
14px; they are back at the render's 18px (ratio 0.33) and the run above is
after that fix.
tsc clean, eslint clean on every wallet file, `check-css-tokens.mjs` clean,
`vitest run src/components/app/wallet`: 23 passed.

### (e) Skipped or not verified

- Live refresh not exercised against production (no test user may be
  created); proved by code and read-only SQL.
- All proofs fixture-backed.
- The page gutter beyond the money page is the shell's.

## 5. Send money

Governing image: `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` (repo root; the
founder's send target, governing over `95840448`). Route `/wallet/send`. Same
1.71 scale and method.

**Header row:** shared chrome, as section 4.

**Proofs:** `docs/design/proofs/session-b/send/send-side-by-side.jpg`,
`send-390-dark.jpg` (empty), `send-filled-390-dark.jpg`, 
`send-1280-dark.jpg`; harness
`apps/web/src/app/(dev)/preview/session-b/wallet/send/` and `.../send-filled/`
(R-G; the recipient lookup there is a fixture that answers "found").

### (a) The chain

| Link | What it is | State |
| --- | --- | --- |
| Control | `SendFlow` compose (Recipient email, Amount, Narration) -> "Send Money" opens the confirm step -> its button submits | OK |
| Double tap, client | `submit-guard.ts`: a synchronous latch in the confirm form's submit handler refuses a second submit in the same frame, and the button is disabled from the first press until the result returns (`session-b-wallet.test.ts`, 2 cases) | OK. It narrows the window; the server guard below closes it |
| Lookup | `lookupRecipient` (`app/(app)/wallet/send/recipient-action.ts`): signed in, paced 40 per 10 minutes, found / none / self / unknown | OK |
| Action | `transferToUser` (`lib/wallet/actions.ts`): feature flag, session, validation, `guardMoney`, recipient resolved again, self refused | OK |
| Validation | zod `transferSchema`: email, `nairaAmountSchema` (integer kobo, bounds), note up to 140, and `idempotencyKey` | OK |
| Idempotency, server | `transferToUser` runs inside `withIdempotency` keyed on the form's key (`transfer-idempotency.test.ts`) | FIXED by Session A in `7763ff39`; scope W1 marked closed. The round-two chain that said BROKEN was stale |
| RPC | `public.transfer_between_wallets` (EXECUTE: `service_role` only, `has_function_privilege`) -> `private.transfer_between_wallets`: locks the sender's wallet `FOR UPDATE`, settled minus pending debits, `insufficient` refused, both legs in ONE insert, a unique violation is `duplicate` | OK |
| Policy | the RPC is `security definer` under the service role; reads back are under `wallet_entries_select_own` | OK |
| Trigger | `wallet_entries_notify_after_change` on both legs | OK |
| Notification | "Wallet debited" to the sender, "Wallet credited" to the recipient; the later caption update keeps COMPLETED, which the trigger ignores | OK; the text names nobody (scope W3) |
| Read back | `revalidatePath("/wallet")`; `router.refresh()` on success; the receipt read by reference via `getStatement()` | OK |
| Screen, live | the send page carries the balance card and `LiveWallet`, so the new balance lands without a reload | OK |

### Refused from the render

| Render element | Why |
| --- | --- |
| "NDIC INSURED" | False: `lib/legal/terms.tsx` section 15 (R1) |
| "256 BIT ENCRYPTION" | An uncheckable security claim (R1) |
| Bank row | Removed by founder directive, 23 September (see below): sending to someone else's bank account is licensed activity |
| Scan / QR button | No scanner exists |
| Swap, "Top Up" tiles | As section 4 |
| "Quick. Safe. Reliable." | Adjectives that are claims; replaced by "Wallet to wallet, by email". The dead dictionary key `walletSend.tagline` ("Fast. Safe. Always.") now carries the same true words |
| Example values | The page prints the ledger |

Kept, each with its evidence: "Instant transfer" (both legs in one database
statement); three reassurance lines: the wallet is a naira record, not a bank
deposit (terms section 15); a failed send moves nothing (one insert, both legs);
a completed send cannot be recalled (no user reversal path). Founder
questions: who holds the money, and how long a refund takes, are not
established and are not stated.

### (b) The comparison, 390px dark

| Property | Image (measured) | Built (measured) | Match? |
| --- | --- | --- | --- |
| Balance card | as section 4, "Available Balance", a wallet glyph and "Wallet Balance" | the same card and `WalletTiles`, Send lit with `aria-current` | Yes |
| "Wallet Balance" | 75px wide = 11px | 11px / 500, 16px glyph | Yes |
| Title | "Send Money" 103.5px wide, Poppins 600 = 17.5px | 17.5px / 600 ("Send money", house sentence case) | Yes |
| Line under it | 102.9px wide = 14px, quiet blue | 14px / 400 `--nf-content-link` | Yes |
| Instant chip | 30px tall, "Instant Transfer" 67.3px = 9.2px | 30px, 11px / 600, 6px corner (0.2) | Yes (type at floor) |
| Form panel | radius 10 to 12 (rim reaches the side 16 to 20 image px down), rim rgb(0 67 131), fill rgb(0 12 43) between rows | 10px (`--nf-radius-sm`, the nearest rung), the identity's lit card | Yes (audit run two) |
| Rows | sub-panels, radius 10.5 (18 image px), fill rgb(0 21 61), edge rgb(0 75 167), 52px tall | radius 10, fill 20% brand over canvas, edge `--nf-brand-edge-soft`, 60px | Yes; 8px taller for the 16px typed value (R-A) |
| Row gap | 9px | 10px | Yes |
| Row plates | 57 image px = 34px round glass | the render's own plates, cropped from this image, 34px | Yes |
| Row labels | about 9.3px | 11px / 500 | Yes (floor) |
| Placeholder | 215px for 23em = 9.3px | 11px | Yes (floor) |
| Typed value | (not drawn) | 16px | R-A: iOS zooms below 16 |
| Amount chips | 24px tall, "₦5,000" 31px wide = 9.4px, equal widths | 44px (R-B), 11px / 500, four equal 64px cells, text centred, 10px corner (0.23) | Yes (floors) |
| Counter | 7px | 11px, real limit 0/140 | Yes (floor; the limit is the schema's) |
| Button | 44.5px, (0 137 254) -> (0 89 253) -> (0 165 251), white-hot top, plane on a darker disc, arrow right | 44.5px, `--nf-gradient-cta`, specular rim, cyan per-side edge, plane on a 34px `--nf-brand-primary-strong` disc, arrow | Yes |
| Button label | 77.8px wide Poppins = 13px | 13px / 600 | Yes |
| Reassurance card | one slim strip, radius 10, shield plate, title 7.7px, one line 7px, two badges | radius 10, the render's own shield plate, title 11px / 600, three 11px lines, no badges | Anatomy yes; taller, because three true lines at the 11px floor cannot fit the render's one 7px line |
| "Sends to" row (not in the render) | none | the rows' left edge and padding, 56px, radius 10 | Aligned to the rows |

### (c) Light mode

Light mode removed by the founder on 23 September; dark only. Every
`[data-theme="light"]` rule, paper twin and paper plate is gone from
`wallet.css`, `QuickPlate.tsx` and `SendFlow.tsx` (`24eac4c6`).

### (d) Shape sweep

The same run as section 4 (d), covering the empty and filled send harness in
both themes at 390 and 1536: 0 breaches, 0 over 0.35, 0 round icon-only.

### (e) Skipped or not verified

- No transfer run against production (no test user may be created); the RPC
  was read, not called. The production ledger holds no transfer yet.
- Proofs fixture-backed.
- The plates are 64 source px for 34px: sharp at 2x, a 1.6x upscale at 3x.
- The three reassurance lines are English in ha, ig and yo until translated.


### Final pass, 23 September (wallet and send)

**Re-checked.** Both renders re-opened beside `wallet-side-by-side.jpg` and
`send-side-by-side.jpg`. Fixed in this last hour: the doubled focus ring on
the send rows (one ring, drawn on the row in the focus token, `92d6eb2b`), and
the badge wiring below.

**The badge (B-BADGE).** Session A's `PersonBadge` component does not exist
on main at this push, so nothing is drawn. Wired: the send recipient lookup
(`recipient-action.ts`) now reads `tier` from `public.person_badge`, the one
source, never computed here (the service role can read the view, confirmed by
`has_table_privilege`), and `SendFlow` renders `BadgeSlot` beside the
confirmed name. `BadgeSlot` renders nothing until the component lands; its
docstring names the one line that changes. **Blocked on B-BADGE.** The
statement rows and the receipt have no counterparty id to read a tier for:
**blocked on scope W6** (the id is in the ledger row and
`lib/wallet/repository.ts` drops it). The bank recipient has no Vallo
account, so no badge applies to it.

**Commands and output (23 September):**
```
npx tsc --noEmit -p .                                  clean
npx eslint src/components/app/wallet "src/app/(app)/wallet"   clean
node scripts/check-css-tokens.mjs                      clean
npx vitest run src/components/app/wallet "src/app/(app)/wallet"
  Tests  35 passed (35)   (includes the badge tier read: gold carried; no row,
  an unknown value and a failed read all answer no badge)
compare-surface --shape-sweep --theme dark, harness wallet, send, send-filled,
  send-bank (after 24eac4c6; the focus fix after it changes an outline only):
  BREACHES 0   WORTH AN EYE 0   ROUND ICON-ONLY 0   4 routes, 0 refused
```

**BUILT AND UNPROVEN** (this box cannot reach Supabase over HTTP, so no
signed-in run is possible here):
- The live refresh (`LiveWallet`): proving it needs a signed-in session on a
  deployed build and a wallet notification arriving.
- A wallet-to-wallet send end to end: needs two test accounts and a funded
  wallet; the production ledger holds 0 transfers.
- The bank name check against Paystack (`resolveBankAccount`): needs a
  signed-in session with Paystack keys; proved here only on the harness
  with a fixture resolver.
- The badge tier read: needs a person with a `person_badge` row and the
  component from B-BADGE.
- The back control on the real routes: `/wallet` and `/wallet/send` redirect
  a signed-out browser, so it was proved by the resolver test and on the
  harness.

**Percentages.**
- Closing gate items met: 10 / 10 (five per surface).
- Chain links working in code: 22 / 24 (wallet 8 / 9, W2 open; send 14 / 15,
  the bank send open on B-BANK (b) and W4).
- Chain links proven live against production: 0 / 24 (none reachable from
  this box; each is proved by code, tests and read-only SQL instead).
- Badge slots rendering the real badge: 0 / 3 (recipient wired and blocked on
  B-BADGE; rows and receipt blocked on W6).

### Bank send removed (founder directive, 23 September)

**What changed** (`32830d5b`): the "To bank" choice, `BankRecipient.tsx`
(the bank picker and the payout-side name check), the `BANK_SEND_OPEN`
constant, the send-bank harness, the bank plate crop, the bank-send styles and
every bank-send word in all four locales are gone. Kept, untouched:
wallet-to-wallet send, receive, withdraw to your OWN bank account (the
withdraw sheet and `lib/wallet/banks.ts`), funding, statements, receipts.
Nothing in Session B imports `transferToBank`; scope request B-BANK is
withdrawn so Session A can remove it.

**The regulatory line, recorded as the founder gave it.** When VALLO SPACES
LTD's CAC objects clause carried payment, escrow and wallet wording, CAC
demanded N500,000,000 share capital; the company was incorporated at
N1,000,000 with that wording removed. Pushing money on bank rails to an
unrelated third party is licensed activity in Nigeria; movement inside our
ledger between two Vallo accounts is a different shape. This is a regulatory
line, not a design gap: it is not to be rebuilt.

**Re-measured against 77A54EA3 after the cut** (390 dark, harness
`send-filled`, production build, 23 September): balance card 362 x 196 at
y 144 under the back square; head "Send money" 17.5px / 600 with the Instant
transfer chip 124 x 30 (6px corner, 0.2); ONE form panel, 362 wide, 10px
corner, holding Recipient (60px row), the confirmed name (56px), Amount with
its four 64 x 44 chips (10px corner, 0.23, equal widths), Narration (60px),
the lit button 340 x 44.5 (14px corner, 0.31) and the reassurance card (141px,
now four true lines: record not deposit, a failed send moves nothing, no
recall, and the founder's refund time, "Refunds reach your wallet in 3 to 5
business days"). Shape sweep, dark, send and send-filled: 0 breaches, 0 over
0.35; controls measured by hand above because the tool reports combinations
only when it finds something.

**What the screen looks like with one mode instead of two.** The render
draws a single form that mixes both shapes: its Recipient row asks for "bank
name, account number or phone number" and a Bank select sits under it. With
one mode the form is Recipient (a Vallo email, checked as it is typed) ->
Amount -> Narration -> Send, and the panel is one row shorter than the
render's. Intentionally absent from the drawn image: the Bank row (select and
its chevron), the bank and account-number wording in the Recipient
placeholder, the scan square (no scanner), and, as before, the NDIC and
256-bit badges, "Quick. Safe. Reliable." and the Swap and Top Up labels. No
mode choice is drawn, because there is nothing to choose between.
`send-side-by-side.jpg` shows the render beside the cut screen.


## 6. Admin shell, overview, operations, analytics

Worker admin-shell. Governing images: `5EAA44CB` (overview, one full desktop
window, 1586 image px for a 1440 CSS px window, so 1 image px = 0.908 CSS px),
`01F7DFC7` panels two and three (operations, analytics; each panel window is
about 492 image px wide and drawn at a much smaller scale, so it governed
composition and anatomy while `5EAA44CB` governed every size), and
`8E9602E2` and `C1D98B3C` for the shell every desk shares (rail, bar,
identity at the foot). Built desktop first at 1440, then 390 (dark only since 23 September).

Files: `app/admin/layout.tsx`, `page.tsx`, `loading.tsx`, `_components/**`
(AdminFrame, AdminNav, AdminGlyph, panels, metrics, nav, ConsoleClock,
LiveRefresh, RangeSelect, OverviewView, console-shapes), `operations/**`,
`analytics/**`, `settings/page.tsx` (new: the render's Settings row had no
page), `app/css/admin.css`, `components/agent/charts/{Sparkline,
AreaTimeChart, GroupedBarChart, MeterBar}.tsx` (additive; `AreaSparkline` and
`DonutChart` untouched), `lib/admin/reads/{shared, overview, operations,
analytics, jobs, shapes}.ts` with `overview.test.ts`, and
`_components/session-b-admin-shell.test.ts`.

### 6.1 The chain, per page

Every link is a READ; none of these three desks writes anything. Reads run
through `requireAdmin()` and the operator's own session client
(`lib/admin/reads/shared.ts: adminReader`), never the service role, so the
admin SELECT policies decide. Checked live in `pg_policies` on 22 September:
`listings_admin_all`, `profiles_select_admin`, `transactions_admin_select`,
`wallet_entries_select_admin`, `audit_log_admin_select`,
`risk_alerts_admin_all`, `agents_select_admin`,
`agent_applications_select_admin`, `bookings_admin_all`.

**Landing by address (R-E, 2fc66f60).** `/admin/<desk>` ->
`layout.tsx` reads the session cookie `nf_admin_entry` and compares it with the
operator's user id -> `EntryGate` (client, sees the path) -> no entry: renders
nothing of the desk (server and browser alike) and replaces the address with
`/admin?next=<desk>` (`entryRedirect`) -> the overview writes the session
cookie (no Max-Age, ends with the browser) and draws "You were heading to
<desk>" with Continue as its first line (`safeDesk` accepts only a console
path). Covers a typed address, a bookmark, a sent link and the sign-in bounce
(`/sign-in?next=/admin/money` returns to the desk, which the gate catches), all
inside `app/admin` with no proxy change. A client navigation after the
overview reads the cookie in the browser, so the layout (not re-rendered on
client navigations) cannot send the operator back. **JavaScript off (after the second closing audit).** The
browser-written cookie alone left a JavaScript-off operator offered the
overview again at every desk. `app/admin/enter/route.ts` closes that loop:
`GET /admin/enter?next=<target>` -> `requireAdmin()` (not an admin: 303 to
`/admin`, no cookie) -> `enterTarget(next)`, which answers ONLY the
overview: `/admin`, or `/admin?next=<desk>` for a console desk accepted by
`safeDesk` (never another origin, never outside `/admin/`, never a `..`
segment, never `/admin/enter` itself). A bare desk (`?next=/admin/money`)
becomes the overview carrying it, so a typed, bookmarked or sent
`/admin/enter?next=/admin/money` can no longer skip the overview (third
closing audit; the first version answered the desk itself, which R-E
forbids) -> sets `nf_admin_entry=<user id>` with the browser's own
attributes (`ENTRY_COOKIE_OPTIONS`: path `/admin`, SameSite Lax, readable by
the page, no expiry) -> 303 to the overview. The gate's "Opening the
overview first." link is `enterHref("/admin?next=<desk>")`; the overview's
"Continue" is a plain link to the desk, because by then the cookie is set
(by the overview in the browser, or by `/admin/enter` without JavaScript).
Tests: `session-b-admin-enter.test.ts` (8: the overview-only answers, a bare
desk turned into the overview carrying it, the refusals, the gate-to-overview
round trip, and the handler itself with `requireAdmin` mocked: 303, Location
always the overview, Set-Cookie attributes, refusal for signed-out,
not-admin and unconfigured). Earlier tests:
`_components/session-b-admin-entry.test.ts` (4). Not exercised end to end with
a real admin session (none may be created); the redirect and the round trip
are unit tested and the overview's link is in `overview-heading-to-1440-dark.jpg`.

**Access.** `/admin/*` -> `app/admin/layout.tsx` -> `requireAdmin()`
(`user_roles` has `admin` or `super_admin`) -> otherwise `AccessScreen`, no
data markup. Unchanged from before. **Landing:** `/admin` is the overview; no
redirect exists in `app/admin`, the proxy (`admin` is only in the
signed-in list) or `components/app/nav-model.ts` (Console row -> `/admin`).
The founder's "drops straight into an area" was the previous overview (a wall
of desk tiles); it is now the overview the render draws.

**Shell.** Rail counts: `getQueueCounts()` (existing, seven exact counts) ->
row badges (listings; applications on Supply; held + flags + reports on
Moderation; tickets on Support; open alerts on Operations). Identity:
`getShellIdentity()` (existing) for name, avatar and unread count ->
`IdentityBlock`, bell dot. Search -> the current desk's `?q=` or
`/admin/queue`. `LiveRefresh` -> `router.refresh()` every 60s while visible
and on return to the tab (the "real time" link: new rows appear without a
manual reload).

**Overview.** Strip and cards -> `getConsolePulse(now)`: exact counts of
live listings (`status='PUBLISHED' and is_demo=false`) now and with
`published_at` seven days back; `readAll` of `profiles.created_at`,
`listings.submitted_at` (examples out), `listings.published_at` (live, for the
daily live line), `transactions` (SUCCESSFUL) and `wallet_entries` (deposit,
COMPLETED) over fourteen Lagos days -> `assemblePulse` (tested). Open reviews
-> `getQueueCounts().listings`. Jobs healthy -> `getJobHealth(now)` (below).
Money chart -> `getCollectedSeries(range)` with `rangeBuckets` (30 days, 13
weeks, 12 months) and the `?range=` select. Supply by type ->
`getSupplyByType()`, seven exact counts. Lister role ->
`getNewListingsByRole()`: listings (examples out) + `agents` embedding
`agent_applications(supply_role)` -> `listerRole` (tested). Recent alerts ->
`getRiskAlerts()` (existing), first five. **Broken links: none in the chain;**
the approximations are stated on screen and in the handbook ("live a week ago"
counts listings live now that were live then, because nothing records a
withdrawal date).

**Operations.** Jobs -> `getJobHealth`: one `audit_log` read per Vercel job,
newest first (`entity_type='cron_job' and entity_id=<job>`, or
`action='wallet.reconciliation.run'` for the reconcile job), -> `jobRow`,
`jobStatus`, `durationLabel` (tested); schedules from `VERCEL_JOBS`, which a
test holds equal to `vercel.json`. Database jobs -> the newest
`pg-cron-watch` row's metadata -> `databaseJobsSummary`. **The job counts are
derived (third closing audit), because they drifted twice:** the Vercel count
is `VERCEL_JOBS.length` (held equal to `vercel.json`), the database count is
`PG_CRON_JOBS.length`, one list in `lib/admin/reads/jobs.ts` that
`lib/admin/reads/jobs.test.ts` holds equal to every `cron.schedule` the
migrations leave in place (scanning `supabase/migrations`, applying the
`rentme*` to `vallo*` rename) and to the handbook's table and its stated
counts. The console's jobs table note and the In flight panel print
`PG_CRON_JOBS.length` and the names; A5 names the list, not a number. On 23
September that is 8 Vercel jobs (`email-outbox` added) and 14 pg_cron jobs
(`vallo_push_drain`, `vallo_purge_email_outbox` added). **Broken link:** the
pg_cron jobs cannot be listed one by one with their runs (cron schema not
exposed, `cron_job_failures` is service role only) -> **Request A5**. Jobs line ->
`getRunDays` (every cron audit row for 14 days, `readAll`). Active alerts ->
`getAlertTrend`: exact open count now and open a week ago from `created_at`
and `resolved_at`, daily raised. Alerts tab and panel -> `getRiskAlerts()`.
Audit tab and panel -> `getAuditLog()` and `getAuditActivity()` (existing;
the activity read's 5,000 row cap is shown on screen when hit).
Notifications tab (third closing audit) -> push: `push_queue` and
`push_deliveries` under `push_queue_staff_read` and
`push_deliveries_staff_read` (checked in `pg_policies` on 23 September) ->
`getPushActivity(now, 7)` in `lib/admin/reads/operations.ts`: exact counts of
queue rows by the state they are in now (six states), of rows settled in the
window by outcome (six outcomes), and of device attempts in the window by
state (four), plus the eight newest attempts and the eight newest failures
(`pushDeliveryRow`, tested: no token, no device reference, the provider's
error cut to 160 characters) -> four panels: Push queue now, Push outcomes,
Device attempts with the newest attempts, Newest failures. **Broken links
left:** in-app `notifications` has only `notifications_select_own` ->
**Request A6** (narrowed to in-app volumes by kind); `email_outbox` has RLS on
and no admin policy -> **Request A14** (new); both panels say so.

**Analytics.** Successful bookings -> `getBookingOutcomes(range)`, two exact
counts (confirmed or completed, this window and the one before). Supply ->
`getSupplySeries(range)`. Areas with fewest listings -> `getThinAreas(5)` ->
`thinnest` (tested). **Demand (second closing audit):** `price_check_events`
(migration `20260922222424`, policy `price_check_events_admin_read`, checked
in `pg_policies` on 23 September) -> `getPriceCheckDemand(range)`: every row
at stage `submit` or `outcome` in the range, paged whole by `readAll`, plus
an exact count of the window before -> `assembleDemand` (tested: buckets,
answered, refused, top areas by `lga_code` named from `local_governments`,
refusals by `refusal_code`) -> KPIs Price checks and Checks answered, panels
Demand vs supply (checks beside listings created), Top areas by price checks,
Price checks vs answered and Top common refusals. The table is not in the
generated types yet, so it is reached through an untyped view of the same
session client. **Broken links left:** searches of the listings (A7, partly
withdrawn), listing views (A8), and reasons on a person's decline of an
inspection or reservation (A11, partly covered). Listing views reads "Not
recorded" naming A8.

**In flight (fa4f4673), from the closing audit's coverage map.** Inspections:
Operations > In flight -> `getInspectionActivity()` -> six exact counts on
`inspection_requests` by `state` (REQUESTED, PROPOSED, CONFIRMED, COMPLETED,
DECLINED, WITHDRAWN) and the eight newest with `listings(title)`, under
`inspection_requests_select_admin` (checked in `pg_policies`) -> the state
table with a word and a meter per state and the newest list. **Broken links:**
`account_deletion_requests` (only `_select_own`) -> **Request A12**;
`business_transfers` (only `_select_party`) -> **Request A13**; per-job
pg_cron -> A5; notifications -> A6; `private.reconciliation_watch` ->
admin-money's request 10. Each has its panel on In flight saying so. Held
events (`scan_event`) and blocked terms are admin-review's, by the lead's
split.

**Console copy (1464eca5).** Every heading, label, tab, table head, job status
word, calm note and panel sentence on the shell and the three desks reads
from `admin.shell` in the dictionary (en complete; yo, ha and ig carry the
rail's names from their own `admin.nav`, the rest falls back to English and is
marked NATIVE REVIEW). Still English in code: the job schedule words and job
titles derived from the job names (`lib/admin/reads/jobs.ts`), relative times
("12m ago"), the alert words (Resolved, High, Medium, Info), the audit row
labels (System, Admin), the inspection state words on In flight and the
"did not load" captions on KPI tiles. Recorded in 6.7.

**Demo rows.** Every supply figure on these desks filters `is_demo = false`.
The 64 example listings appear only on the Examples desk. Decided and stated
in the handbook section 1.

### 6.2 Comparison tables (measured)

Built values measured with `getComputedStyle` and `getBoundingClientRect` on
the running production build at 1440x900 (`atools/measure.mjs`), on the
fixture harness. Image values are image px x 0.908.

**Overview (`5EAA44CB`)**

| Property | Image (measured) | Built (measured) | Match |
|---|---|---|---|
| Canvas | #000921 | #000612 (`--nf-surface-canvas`) plus a faint blue radial | yes |
| Rail | floating panel, 197 wide, 11px corners, edge #004EBE, fill #001031, full height of the screen with the operator at the foot | 200 wide, 10px (`--nf-radius-sm`), per-side lit edge, fill brand 15% to 11% over canvas (measured #00112B), the column runs the page's full height and its contents stick to the viewport, Settings and the operator pinned at the foot | yes |
| Rail row | 42 tall, 44 pitch, 15px label, line glyph 18 | 42 tall, 44 pitch, 15px/500, glyph 20 | yes |
| Open row | solid #0065FD, brighter top #0298FC, blue bloom, ~7px corners | `--nf-gradient-cta`, inset white top rim, 18px bloom, 14px `--nf-radius-control` | yes, radius per the shape law (0.33 of 42) |
| Wordmark | "Vallo" white bold, 28 | 28px/700 display face, content-primary | yes |
| V mark | cyan line V | the product's own mark (`/brand/vallo-mark.png`) | no: brand asset kept, the render's glyph is not our mark |
| Pulse strip | 88 tall, 10 corners (re-measured), lit top edge glow | 96 tall, 10px, blue catchlight + top glow | yes |
| Strip plate | 44, 9 corners, lit blue | 44, 10px, brand 66% to 40%, white rim | yes |
| Strip label / figure | 14 / 22 bold | 14px/500 / 22px/700 | yes |
| KPI card | 147 tall, 298 wide, corner 9.1 (re-measured) | 148 tall, 284 wide, 10px | yes |
| Card title / figure / change / caption | 15 semibold / 34 bold / 14 bold emerald / 12.5 | 15px/600 / 32.2px/700 (clamp; 34 at 1536) / 14px/700 #10B981 / 13px | yes |
| Sparkline | glowing blue line, bottom right | same, `drop-shadow` glow, bottom right | yes |
| Panel | corner 9.8 (re-measured), 1px edge #004EBE, fill #00173A to #002E77, no outer bloom | 10px, 1px per-side lit edge, lit fill, top catchlight, 3px outer glow | yes |
| Panel title | 16 semibold | 16px/600 | yes |
| Area chart | glowing line, blue fill fading down, grid, M axis, hover card | same; axis `formatMoney` compact ("₦80m"); crosshair, dot and card on hover or arrow keys | yes |
| Range select | "Last 12 months", 32 tall | native select, 36 tall, 10px | yes |
| Supply by type | coloured dots (blue, green, grey-green, rose), cyan and blue bars | one blue ramp by rank for dots and meters (10px track, 6px) | translated: off-palette dots refused |
| Grouped bars | three blues, round legend dots | one blue at three strengths, third hatched, square swatches, readout on hover | translated (research 4.2) |
| Alert rows | tinted plates, title, blue sub-line, time, badge | same; plates tinted fill | yes |
| Badges | capsules ("Info", "High", "Success") | 24 tall, 6px (0.25), word + tint + border | shape law, deliberate |
| Top bar | date and time, bell; no search on this render | search, Lagos date and time, bell, operator (the three-panel renders' bar) | partial, deliberate: one bar for every desk |

**Why a shared part can differ from a panel.** The KPI card, the panel title
and the page head are ONE component on every desk. Their sizes are taken from
`5EAA44CB`, the one full-resolution console render (card label 15, figure 34,
panel title 16), which under R-A is the render's measured size for that
component; the three-panel renders draw the same components smaller and not
consistently with each other (page title 25.6 on Operations, 20.8 on
Analytics). Where a panel's size differs from the shared size, the row says
so; none of them is a whole-surface scale factor.

**How the panels of `01F7DFC7` were measured.** Each panel is a narrower
window drawn smaller, so its scale is taken from the one element every
render shares with the overview: the rail row pitch. In panel two and three
the pitch is 34.4 image px (Overview y 166 to Listings y 200); on the overview
render and on the build it is 44 CSS px. So 1 image px = 44 / 34.4 = 1.28 CSS
px for both panels. Sizes were read on 3x crops of the image (so 1 crop px =
0.427 CSS px); a type size is the cap height divided by 0.72. Built values
are `getComputedStyle` on the production build at 1440 x 900.

**Operations (`01F7DFC7` panel two)**

| Property | Image (measured, CSS px) | Built (measured) | Match |
|---|---|---|---|
| Page title "Operations" | cap 43 crop px, 25.6px bold | 26px/700 | yes |
| Lede | 12.8px, cyan-blue #3FB8F5 | 13px, `--nf-brand-secondary` #5C9FFF | yes (0.2px); hue translated into the blue family |
| KPI card box | 223 x 122.5, corner 7.7 | 343 x 148, corner 14 | width follows the wider window (two cards in a 44rem row); height +25 because the build carries a caption line the render does not; corner the console's 10 (re-measured on all four renders, 66c2ecf5) |
| Card plate | none | none | yes (plates removed in 1636070) |
| Card label | 12.8px, medium | 15px/600 | larger: the console's one card type size from 5EAA44CB (15) |
| Card figure "24 / 27" | cap 47 crop, 27.8px bold | 32.2px/700 at 1440 (34 at 1536) | larger: one figure size across every console card |
| Share "89%" | 17.9px, emerald | 13px caption "86% on schedule" | smaller: carried as a caption with its words, not a bare percent |
| Change "down 62%" | 17.9px emerald, down arrow | 14px/700, arrow, "vs a week ago" | smaller, same anatomy |
| Sparkline | 92 x 40, bottom right, glow | 96 x 44, bottom right, 4px drop-shadow glow | yes |
| Tab | 137 x 45, corner 6, label 12.8 | 137 x 44, corner 14 (0.32), 14px/500 | size yes; corner per the shape law's control radius, under 0.35 |
| Open tab fill | #0A7BF6 to #1B97F8, top rim, bloom ~12 px | `--nf-gradient-cta`, 1px white 55% rim, 18px bloom | yes |
| Table header | 11.5px, muted | 13px, `--nf-content-secondary` | 1.5px over; `5EAA44CB` draws its table header at 12.7 (14 image px), so the shared table sits between the two |
| Table row pitch | 39 | 57 | taller: each cell carries a second line (cron expression, "19m ago") the render does not have |
| Status badge | 71 x 25, corner 5, FILLED: Healthy fill #005353, ring #027F7D, pale mint word #A8D7C6; Failed fill #7C2251, ring #C2285B | 64 x 24, corner 6 (0.25), 12px/600, filled: the state at 40% over the canvas, a 65% ring, the word lifted towards white; Failed 58% rose behind a full rose ring | yes (was an outlined chip on a faint tint until the second closing audit) |
| Lower panels title | 14.4px semibold | 16px/600 | +1.6, the console's one panel title size |

**Analytics (`01F7DFC7` panel three)**

| Property | Image (measured, CSS px) | Built (measured) | Match |
|---|---|---|---|
| Page title "Analytics" | cap 35 crop, 20.8px bold | 26px/700 | larger: one page title size across the console (operations measures 25.6) |
| Lede | 11.9px | 13px | 1.1px over: one lede component, sized to Operations' 12.8 |
| Date range field | 257 x 35, corner 5 | range select 158 x 36, corner 10 (0.28) | height yes; one select, not a date field plus area select (area filter not built, 6.7) |
| KPI card | 110 x 117 (four in a narrow window) | 284 x 148 | wider window; same four-across grid at 1440 |
| Card label | 12px | 15px/600 | the console's card label size |
| Card figure "48,732" | cap 39 crop, 23px bold | 32.2px/700 ("Not recorded" 18px/600) | larger, one figure size |
| Change and caption | 12.8px emerald arrow; 12px "vs last month" | 14px/700; 13px "vs the 30 days before" | +1 each |
| Panel title "Demand vs supply" | cap 34 crop, 20px semibold | 16px/600 | smaller: one panel title size across the console, taken from 5EAA44CB (16) |
| Area line and fill | glowing line, fill fading down | same, `drop-shadow` 5px, fill 42% to 2% | yes |
| Distribution rows ("Areas with fewest listings") | row pitch 32, bar 9 tall | row pitch 40, meter 10 tall, corner 6 | taller rows (44px floor region for dense lists) |

**The glow, measured on 5EAA44CB.** The open rail row: fill #0065FD, top edge
#0298FC, a bloom that rises from the canvas #002B6B at 14 image px above the
row to #0030A9 at 1px (so about 12 CSS px of spread, at roughly 55% of the
brand over the canvas). Built: `--nf-gradient-cta`, a 1px white 55% inset top
rim, `0 0 18px` brand 55% and `0 6px 16px -6px` brand 70%. Panels: the edge is
#004CB0 to #004EBE, 2 image px, and the canvas beside it is flat #00091F right
up to the edge (the render draws almost no outer glow on its cards; the
light is inside, #00184F just inside the edge). Built: per-side lit edges, an
inner catchlight, `0 0 4px` info 38% and `0 0 12px` brand 18% (the glow
identity's revised numbers, which the founder asked for platform-wide).

**The console container, measured on all four renders (23 September,
after admin-money's report).** Corners read on 10x and 12x crops of one card
per render, from the edge's straight run to the tangent; each converted at
that render's own scale.

| Render, element | Corner (image px) | CSS at 0.908 (overview) or 1.28 (panels, rail pitch) | At admin-money's 1.57 | Edge | Outer halo |
|---|---|---|---|---|---|
| `5EAA44CB`, KPI card | 10 | 9.1 | n/a | 1 image px lit line, #004CB0 to #004EBE | canvas #00091F flat to within 2 image px (about 2 CSS) |
| `5EAA44CB`, Supply by type panel | 10.8 | 9.8 | n/a | same | same |
| `01F7DFC7` p2, Jobs healthy card | 5.7 | 7.3 | 9.0 | 1 image px | about 1 to 2 image px |
| `8E9602E2` p1, Live escrows panel | 4.8 | 6.2 | 7.6 | 1 image px | about 1 to 2 image px |
| `C1D98B3C` p1, listings table panel | 3.8 | 4.9 | 6.0 | 1 image px | about 1 image px |

One value set, the renders governing over GLOW_IDENTITY where they differ:
- **Corner: 10px** (`--nf-radius-sm`, via `--nf-admin-radius`) on the rail,
  panels, KPI cards, pulse strip, every desk's cards and tables. The measured
  range is 4.9 to 9.8 CSS; the full-resolution overview (9.1 and 9.8) decides
  between the two token rungs (6 and 10). Was 14.
- **Edge: 1px**, per-side lit colours (unchanged).
- **Outer glow: 3px** (`0 0 3px` info 34%), plus the inner top and left
  catchlights. Was a 4px, 12px and 22px stack. The pulse strip's top glow is
  6px (was 18px) and a KPI card's hover glow 8px (was 30px). The renders put
  the light inside the edge, not around it.

Built, measured with `getComputedStyle` after the change: `.nf-admin-panel`
and `.nf-admin-kpi` border-radius 10px, border 1px, box-shadow outer blur 3px.

**Rail badges (lead review, 22 September).** Each badge is work waiting on
that one desk, from `getQueueCounts()` (exact `head: true` counts), with a
`title` tooltip and an accessible label naming what it counts:

| Row | Key | Read and filter | Label |
|---|---|---|---|
| Listings | `listings` | `listings.status in (SUBMITTED, UNDER_REVIEW, APPROVED)` | listings waiting on a review decision |
| Moderation | `moderation` | `posts`, `stories`, `story_comments` with `status = HELD`, plus `social_profiles.bio_status = HELD` | held posts, stories, comments and bios waiting on a decision |
| Support | `tickets` | `support_tickets.status in (open, pending)` | support tickets open or pending |
| Operations, and Alerts under it | `alerts` | `risk_alerts.status = open` | alerts open, waiting on a person |
| Applications (under Supply) | `applications` | `agent_applications.status in (SUBMITTED, UNDER_REVIEW)` | applications waiting on a decision |
| Message flags (under Moderation) | `flags` | `message_flags.status = open` | flagged messages waiting on a decision |
| Reports (under Moderation) | `reports` | `reports.status in (open, reviewing)` | reports open or under review |
| All desks | sum of the child rows above | | waiting across the desks below |

Supply and the other parent rows carry no badge: their desks show supply, not
a queue. Moderation no longer adds flags and reports into its own badge; they
sit on their own rows. The Listings badge and the overview's Open reviews card
read the SAME figure (`getQueueCounts().listings`), so they cannot disagree; it
includes an example listing if one were ever submitted for review (none is).
The earlier empty proof paired fixture badge counts (73, 10 ...) with the
empty page, which was a harness mistake: the empty proofs now use the
database's real queue counts on 22 September (flags 3, tickets 6, every other
queue 0), so Listings reads nothing beside Open reviews 0.

**Empty charts.** An empty chart now draws the full scale it would use at its
smallest real range, in muted ink with gridlines (₦0 to ₦1m for money, 0 to
10 for counts), and no line or bar; its frame fills the panel's height, so no
panel carries dead space under it.

**390 (derived).** Rail becomes a drawer behind a rounded-square menu button
(44x44) with a cyan waiting dot; strip one figure per row; cards and panels
stack; tables scroll inside their panel; chart axes drop alternate labels in
a container query. `overflowX` measured 0 on every proof.

**Second closing audit: material re-sampled (23 September).** The
side-by-sides read flatter and darker than the renders and the badges were
outlined where the renders fill them. Column scans on 5EAA44CB (chart panel,
KPI card, Recent alerts) and 01F7DFC7 (jobs table), against the build at
1440 on the committed harness (`atools/scan.mjs`, `samp.mjs`):

| Property | Render (sampled) | Built before | Built now |
|---|---|---|---|
| Canvas | #000921 to #000C27 | #000612 | #000C20 (brand 7% over the canvas token) |
| Rail glass, mid height | #001032 | #000E24 | #00112B |
| Rail height | the screen's full height, operator at the foot | a box ending under All desks | full height, sticky contents, Settings and operator pinned at the foot |
| Panel top edge | #0066D1 to #0078E8 (blue) | #89C1E6 then #67A4FC (near white) | #007BFE, #007FFE |
| Fill under the top edge | #00246D (chart) to #002E89 (card), #001B4C by 14 CSS px | #144D9A falling to #001C45 by 15 px | #0C3E84 falling to #002252 by 26 px (card) |
| Panel middle | #001537 to #00173C | #00102A | #001637 |
| Left edge | #004CB0 to #004EBE | #27ABFA (cyan) | #004DBA |
| Foot lift and edge | #001843, #001B50, #01205D, edge #0181F5 | #001B41 to #002965, edge #007DFE | #001B42 to #002458, edge #0586FD |
| Info badge | fill #002D67, ring #014291, cyan word | faint info tint, cyan outline, cyan word | fill #00275D, ring #003F96, cyan word |
| Success badge | fill #00424A to #005353, ring #047E70 to #027F7D, mint word | #003432 tint, bright outline | fill #00473B, ring #216264, word #7BC9B3 (emerald 40% over the canvas, 65% ring, word lifted towards white) |
| High / Failed badge | fill #351B40 to #7C2251, ring #842550 to #C2285B | rose tint outline; Failed solid bright rose | rose 40% fill, 65% ring; Failed fill #852438, ring #AC3C60 (58% fill, full rose ring) |

### 6.3 Light mode

~~Light mode rows, the paper twins and the light proofs.~~ Light mode removed
by the founder on 23 September; dark only. `admin.css` carries no
`[data-theme="light"]` rule and no paper twin any more, and the light proofs
are deleted.

### 6.4 Shape sweep (after the closing audit, R-D)

The audit found 128 controls at exactly 0.35 on the committed admin
harnesses, all on two shared controls: the status chip `.nf-admin-chip` and
the queue search field (40px tall at 14px). Both, and the console bar's
search, now draw `--nf-radius-sm` (10px, 0.25) in 2fc66f60. Re-run on every
admin harness in the tree, including the committed session-b harness:

```
node scripts/design/compare-surface.mjs --base http://127.0.0.1:3175 --shape-sweep --theme both --routes
  /preview/session-b/admin/overview,/preview/session-b/admin/operations,
  /preview/session-b/admin/analytics,/preview/f5/admin-desks,/preview/f5/admin-overview,
  /preview/f5/admin-queue,/preview/f5/admin-frame,/preview/bd/reservations,/preview/bd/refunds,
  /preview/bd/payments,/preview/bd/alerts,/preview/bc/audit,/preview/c1/listing-review,
  /preview/p3/admin-businesses
at 390px, 1536px in dark and light
BREACHES (ratio at or above 0.5): 0
WORTH AN EYE (over 0.35): 0
ROUND ICON-ONLY CONTROLS: 0
ROUTES REFUSED: 0
COVERED: 14 route(s) asked for, 0 refusal(s), 32 route/width/theme combination(s) actually measured.
```

Zero at or above 0.35. The harness is committed under
`apps/web/src/app/(dev)/preview/session-b/admin/` (R-G), so anyone can re-run
it with `VALLO_PREVIEW_HARNESS=1`.

**Re-run after the container reconciliation (23 September)** on every admin
harness in the tree, now including admin-money's and admin-review's committed
harnesses (23 routes: session-b admin, admin-money money, escrow, payments,
bookings, supply, admin-review listings, review, moderation, kyc, and the f5,
bd, bc, c1 and p3 admin harnesses), dark and light, 390 and 1536: **0
breaches, 0 at or above 0.35, 0 round icon-only controls, 0 routes refused;
the tool reports 31 route/width/theme combinations measured.**

**Re-run after the second closing audit (23 September)**, 26 routes: the
session-b admin harness (overview and analytics each fixture and
`?state=live`, operations and `?tab=inflight`), admin-money's money, escrow,
payments, bookings, supply, admin-review's listings, review, moderation,
kyc, and the f5, bd, bc, c1 and p3 admin harnesses, dark and light, 390 and
1536: **0 breaches, 0 over 0.35, 0 round icon-only controls, 0 routes
refused; the tool reports 32 route/width/theme combinations measured.**

### 6.4a Glow identity and the designed empty state

`docs/design/GLOW_IDENTITY.md` section 9 (revised, d01a5d7) is applied in
`admin.css` for every desk, built from existing tokens because the sheet takes
no raw colour: the lit card fill (bright top 4px and 11px, dark middle, lifting
foot, cyan catchlight), per-side lit edges, the inset rims and near glow, the
icon tile (lit centre, inset edges, glowing glyph; a pale tile on paper, never
a dark plate), the lit primary edges on the open rail row and tab, and the calm
info panel. Where the admin renders measure differently they win for the
console's density: 10px corners (re-measured on all four renders, 66c2ecf5)
rather than the identity's 12, and a middle of about 16% lit (re-sampled,
render #001537 to #00173C; see "Second closing audit" in 6.2).

Every empty panel on these desks is the calm note (round glyph disc, what
fills the panel, what creates that data, a link to the producing desk) and a
chart keeps its height, axis, grid, bucket labels and legend with no data
mark: see `overview-1440-dark-empty.jpg`, `overview-390-dark-empty.jpg`,
`analytics-1440-dark-empty.jpg`. The primitives (`CalmNote`, `EmptyChart`)
are shared in `_components/panels.tsx` for the other admin workers.

### 6.5 Refused from the render

- Every count, figure, percentage and change in the three renders (1,248
  listings, 342 sign-ups, ₦18,450,000, 98%, 24 / 27, 3 alerts, 48,732
  searches, the ₦52,780,000 tooltip). The database on 22 September has 0 real
  listings and 0 money collected; the empty state is the designed state
  (`overview-1440-dark-empty.jpg`, `analytics-1440-dark-empty.jpg`).
- The render's job names ("Sync listings", "Update search index", "Payout
  processing", "Image optimization") are jobs the platform does not run; the
  real seven Vercel jobs and the twelve database jobs (one summary row until
  A5) are listed instead.
- The render's alert rows ("Payment webhook failed", "Search index delay")
  and audit rows ("Tunde A. approved listing") are not drawn; the real rows
  are.
- Off-palette dots (grey-green Hotels, rose Restaurants, green Land) and a
  rose "+9%" on Open reviews; capsule badges; the render's cyan V glyph in
  place of the product mark.
- Analytics figures whose source does not exist (searches of the listings,
  listing views, conversion): drawn as price checks where the price check
  log answers the same question, and as "Not recorded" with a request where
  nothing does, never estimated. Question for the founder: should search and view logging be
  built (A7, A8)? That is a product decision, not a pixel one.

### 6.6 Proofs

Side by side, render left and built right, re-shot after the final change:
`side-by-side-overview.jpg`, `side-by-side-operations.jpg`,
`side-by-side-analytics.jpg`. Desktop 1440 and 390, dark only (light mode
removed on 23 September), for all three desks, plus the empty (real
database) variants, the heading-to proof, In flight and Notifications (push
fixture and `?state=live` empty).

`docs/design/proofs/session-b/admin/`, all re-shot on 23 September after the
landing change, the rail, the badge fills and the re-sampled material, from
the running production build on the COMMITTED fixture harness
(`apps/web/src/app/(dev)/preview/session-b/admin/**`, routes
`/preview/session-b/admin/{overview,operations,analytics}` with
`?state=live` for the empty variants, `?tab=` for the Operations tabs and
`?next=` for the heading-to proof; run with `VALLO_PREVIEW_HARNESS=1`), which
renders the real `AdminFrame`, `OverviewView`, `OperationsView` and
`AnalyticsView` on fixture props, because no admin session can be created on
the production database). The `-fixture` shots use figures shaped like the
render to compare composition; the `-empty` shots use the production
database's real state on 22 September (0 live, 0 money, 1 sign-up, alerts all
resolved). In the proofs the open rail row is lit by adding its class in the
browser, because the harness path is not `/admin`; the class is exactly the
one `AdminRail` sets.

### 6.6a Third closing audit answers (23 September)

- **R13 (Session A's `email-outbox` line in `jobs.ts`).** It stays. It is
  data only, it keeps the `VERCEL_JOBS` = `vercel.json` equality test green,
  and nothing else in the file moved. Its comment is reworded to say so;
  the schedule text ("Every 15 minutes", allowance 2 hours) is kept.
- **R14 (Session A's ledger `49ter`, the missing back control).** The shared
  `BackButton` is mounted once, in `app/admin/layout.tsx`, and handed to
  `AdminFrame` as its `back` slot, which leads the top bar before the search
  (the arrow alone, 44px hit region, as the component draws it). Every one
  of the 23 admin routes renders through that layout, so every one draws it,
  and it goes to the route's declared parent in `lib/nav/route-parents.ts`
  (a desk to `/admin`, a record to its desk, `/admin` itself to `/home`, which
  is what that file declares). Test: `session-b-admin-back.test.ts` (a desk
  resolves to `/admin`, a record to its desk, every rail destination has a
  declared parent, and the layout mounts the control).
- **A new request, A14, for `email_outbox`**, and its panel on Operations >
  Notifications in the designed not-wired state.
- **ITEM 7 (inspection, not viewing).** The one "view" in this surface's copy
  (In flight's empty note) now says "asks for an inspection".

### 6.6b Final pass, 23 September

**Re-checked.** The three side-by-sides against 5EAA44CB and 01F7DFC7 (panel
fill, edges, filled badges, full-height rail, the back arrow now drawn on the
overview harness too, which it lacked); every job count against the
migrations and `vercel.json` (8 Vercel, 14 pg_cron, now derived and tested);
the handbook's numbers against code (rail: eleven rows plus Settings = the
"twelve rows"; pages of forty, `QUEUE_PAGE_SIZE`; the audit chart's 5,000
cap, `WINDOW_CAP`; fourteen days of runs, `lastDays(14)`); every desk in
handbook section 15 now carries Shows, Actions, Effects, Limits and Rejected
(15.1 and 15.12 gained Effects; 15.5 points to admin-money's section 12);
15.16 names where push, price checks, mandates, firm members, escrow
evidence and float snapshots are shown.

**Fixed in this pass.** The overview harness drew no back arrow (it builds
`AdminFrame` directly); a comment path the token check flagged.

**The badge (B-BADGE): wired, blocked on B-BADGE.** `getPersonTiers` in
`lib/admin/reads/shared.ts` reads `tier` from `public.person_badge` (the one
source, SELECT granted to authenticated; nothing derived here); `tierMap`
is tested. One shared slot, `app/admin/_components/PersonTier.tsx`, sits
beside every name the shared components draw: the operator in the rail and
bar (`IdentityBlock`, fed by the layout) and the named person in audit and
alert rows (`AlertList`, fed on Operations). admin-review's and
admin-money's desks render `<PersonTier tier={...} />` beside a name, with the
tier from `getPersonTiers`, or pass `tier` on an `AlertRow`. Session A's
component (`components/app/badge/PersonBadge`) has not landed, so the slot
renders NOTHING (tested) and no badge appears in the console: blocked on
B-BADGE.

**Commands and output (run 23 September, final pass):**

```
npx tsc --noEmit -p .                                -> exit 0, no output
npx eslint <admin-shell files>                       -> 0 errors, 1 warning
  (react-hooks/set-state-in-effect, _components/AdminActions.tsx:762,
   not an admin-shell change)
node scripts/check-css-tokens.mjs                    -> css tokens: clean
npx vitest run src/lib/admin/reads src/app/admin     -> 23 files, 145 tests passed
node scripts/design/compare-surface.mjs --shape-sweep --theme dark (27 admin
  harness routes)                                    -> BREACHES 0, WORTH AN EYE 0,
  ROUND ICON-ONLY 0, ROUTES REFUSED 0, 16 combinations measured
```

**BUILT AND UNPROVEN.** This box cannot reach Supabase over HTTP (egress
refused) and no admin session may be created, so no read below has run
against the live project with a signed-in admin. Each is built, typechecked
against the schema, its policy checked in `pg_policies`, its pure half unit
tested, and its panel drawn on the committed harness in a production build.
Proving each needs one signed-in admin load of the page in a deployed build:
- Overview: `getConsolePulse`, `getCollectedSeries`, `getSupplyByType`,
  `getNewListingsByRole`, `getRiskAlerts` (existing).
- Operations: `getJobHealth`, `getRunDays`, `getAlertTrend`,
  `getInspectionActivity`, `getPushActivity`, `getAuditLog` and
  `getAuditActivity` (existing).
- Analytics: `getBookingOutcomes`, `getSupplySeries`, `getThinAreas`,
  `getPriceCheckDemand`.
- Shell: `getQueueCounts` badges, `getPersonTiers`, the entry cookie round
  trip (`EntryGate`, `/admin/enter`, unit tested with `requireAdmin`
  mocked), the back arrow's landing on a live desk.

**Percentage.** Gate items for this surface: 23 met of 24 (96%). The 24:
the second audit's six items, its JavaScript-off note and its three handbook
lines (10); the lead's server-side entry (1); the third audit's six items
(6); the founder's items 1, 2, 5 and 7 (4); this final hour's real pass,
ledger block and complete handbook (3). The one not met is item 5, the
badge, blocked on B-BADGE (the read and the slot are wired; nothing draws). Chain links proven live: 0 of 17 (the list above), for
the reason given; built, typed and unit tested: 17 of 17.

### 6.6c R19, the back arrow pressed in a browser (fourth audit)

The source-text test was the only proof, because no harness address has a
console parent. The committed harness `/preview/session-b/admin/back`
(`app/(dev)/preview/session-b/admin/back/`) renders the real `AdminFrame` and
the real `BackButton` inside `AsDesk`, which gives every `usePathname()` below
it the value `/admin/money` (the router is untouched), so the arrow resolves
exactly as on that desk. `scripts/design/session-b-shots/admin-back.mjs` opens
it in Chromium against the production build, finds the control by
`data-nav-back`, checks it drew, presses it and records the navigation:

```
VALLO_PREVIEW_HARNESS=1 npx next start -p 3175
node scripts/design/session-b-shots/admin-back.mjs http://127.0.0.1:3175 \
  docs/design/proofs/session-b/admin/back-arrow-as-admin-money-1440-dark.jpg
PASS back control: 1 found by data-nav-back, drawn at 240,18 44x44; rail lit
on "Money"; press requested /admin?_rsc=...; landed
/sign-in?next=%2Fadmin&notice=sign-in-required
```

The press asked for `/admin`, the declared parent; the signed-out browser is
then sent to sign in with `next=/admin` by the proxy, as it would be for
anyone without a session. Proof: `back-arrow-as-admin-money-1440-dark.jpg`.

### 6.6d Live proof, 23 September (the network opened)

Run against a production build (`next build` + `next start` under the heavy
lock) whose `.env.local` points at the live project `uccixoonmbhrnyczyigt`.

| Link | State | Evidence |
|---|---|---|
| Signed out at `/admin` | LIVE PROVEN, 16:02 UTC, build of 4b1d8c35 plus the sweep | 307 to `/sign-in?next=%2Fadmin&notice=sign-in-required`; `docs/design/proofs/session-b/admin/live/signed-out-doors.json` |
| Signed out at a desk (`/admin/money`, `/admin/operations?tab=jobs`) | LIVE PROVEN, same run | 307 to sign in carrying the desk and its query as `next` |
| Signed out at `/admin/enter?next=/admin/money` | LIVE PROVEN, same run | 307 to sign in carrying the whole entry address, so signing in resumes through the entry route |
| A forged session cookie at each of the four doors | LIVE PROVEN for the build, same run | 307 to sign in, as signed out. The project's edge logs for that minute show no `/auth/v1/user` call, so the forged token was refused before the project was asked: this proves the running build's doors, not the project's token check |
| Signed in as a non-admin at `/admin` (access screen, no console) | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 6 of `scripts/design/session-b-shots/admin-live-signed-in.mjs` |
| Landing: a desk as the first request of a session lands on the overview carrying it | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 1 |
| Overview reads against live data (no panel unavailable; Live listings 0, the 64 examples excluded; Supply by type all 0) | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 2 |
| Continue opens the desk; a second desk opens directly | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 3 |
| Every Operations tab, Analytics at 30d, 90d and 12m, Settings load without "This did not load" | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 4 |
| `/admin/enter?next=/admin/money` signed in lands on the overview, never the desk | WAITING ON QA CREDENTIALS (accounts exist, passwords not in this box) | step 5 |

The signed-in script reads `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` (and
optionally `QA_MEMBER_EMAIL`, `QA_MEMBER_PASSWORD`) from the environment only,
signs in through the real form, opens pages and writes nothing. Without the
variables it exits 2 with "WAITING ON QA ACCOUNTS".

### 6.6e The QA accounts, out of every statistic (founder, 23 September)

One list, `QA_ACCOUNT_IDS` in `lib/admin/reads/shapes.ts` (re-exported with
`QA_NOT_IN`, `isQaAccount` and `withoutQa` from `reads/shared.ts`), names the
two accounts the founder created for live proof: the member
957b3bd2-cce3-425d-bba9-5cd876ca3d62 and the admin
03f3dd52-ea28-4852-9abe-e5b0a67c2a43. Left out of: sign-ups (the pulse's
profiles read), the new people total (`peopleTotal`, an exact count, shown as
"7 people in all" under Sign-ups today), successful bookings (by
`guest_id`), and price checks and their answers (by `user_id`, anonymous
checks still counted). Still present and labelled: a QA account's audit rows
read "QA" instead of "Admin". Tests: `reads/qa-accounts.test.ts` (4).

Live check, read-only SQL on the project, 23 September: profiles 9, profiles
less the two QA accounts 7; sign-ups in 14 days 5, less QA 3; the QA accounts
own no agent, business, booking or price check yet. The console reading 7 on
screen is step 2 of the signed-in script: WAITING ON QA CREDENTIALS.

Not done, and why: money collected is keyed by wallet, not person, and a QA
account never moves real money (LIVE_PROOF); the Supply desk's counts
(admin-money's `reads/supply.ts`) count agents and businesses, which the QA
accounts are not; if that changes, `withoutQa` is the one call to add there.

### 6.6f Live proof signed in as the QA admin, 23 September 16:57 UTC

Production build of `baad755f` plus the `/admin/enter` fix below, `next start`
with `NODE_USE_ENV_PROXY=1` and the box's CA bundle, against the live project,
signed in through the real form as phantomfcalls+qaadmi@gmail.com (admin
grant applied by Session A). Read only: the script opens pages and presses
only navigation (Continue, the back arrow). Evidence: `docs/design/proofs/session-b/admin/live/signed-in/` (a shot per step
and `steps.json`); the run log is 23 of 44 script steps passing, and every
failing step is one of the three service-role reads below. Checked against
read-only SQL at the same minute: 0 real live listings, 64 examples, 9
profiles (7 without the QA accounts), 1 open alert, 0 push rows, 0
inspection requests, 0 price checks, 0 successful bookings.

**Found live and fixed: `/admin/enter` sent a signed-in admin to sign in.**
The redirect was built from `request.url`, which `next start` knows as
`localhost`; a browser on 127.0.0.1 (or any proxied host) followed it to
another origin without its session cookies and the proxy sent it to sign in.
The route now answers a path-only `Location` (`seeOther` in
`app/admin/enter/route.ts`), tests updated; re-run: lands on
`/admin?next=%2Fadmin%2Fmoney`.

| Link | State | Evidence |
|---|---|---|
| Signed out: `/admin`, a desk, a desk with a query, `/admin/enter` (4) | LIVE PROVEN, 16:02 UTC | `signed-out-doors.json` (6.6d) |
| Landing: a desk as the first address after sign in lands on the overview carrying it | LIVE PROVEN | `01-landing.jpg` |
| Continue opens the desk | LIVE PROVEN | `02-continue-money.jpg` |
| A second desk opens directly for the rest of the session | LIVE PROVEN | `03-second-desk.jpg` |
| The back arrow on `/admin/money` goes to `/admin` | LIVE PROVEN | `04-back-arrow.jpg` |
| `/admin/enter?next=/admin/money` lands on the overview, never the desk | LIVE PROVEN after the fix | `20-enter.jpg` |
| A signed-in member at `/admin` gets no console | LIVE PROVEN (QA member) | `30-member-at-admin.jpg` |
| `getConsolePulse` (Listings live 0, sign-ups, "7 people in all", naira today, new supply) | LIVE PROVEN | `01-landing.jpg`, `10-overview.jpg` |
| `getCollectedSeries` (twelve months, one August spike) | LIVE PROVEN | `10-overview.jpg` |
| `getSupplyByType` (every type 0, examples excluded) | LIVE PROVEN | `10-overview.jpg` |
| `getNewListingsByRole` (empty state, full scale) | LIVE PROVEN | `10-overview.jpg` |
| `getJobHealth` (8 of 8 healthy, real last runs) and the database jobs summary | LIVE PROVEN | `11-ops-jobs.jpg` |
| `getRunDays` (the jobs sparkline) | LIVE PROVEN | `11-ops-jobs.jpg` |
| `getAlertTrend` (1 open, +1 on a week ago; SQL: 1 open) | LIVE PROVEN | `11-ops-jobs.jpg` |
| `getInspectionActivity` (six states at 0; SQL: 0) | LIVE PROVEN | `15-ops-inflight.jpg` |
| `getPushActivity` (queue, outcomes, attempts at 0; SQL: 0 and 0) | LIVE PROVEN | `14-ops-notifications.jpg` |
| `getBookingOutcomes`, `getSupplySeries`, `getThinAreas`, `getPriceCheckDemand` (30d, 90d, 12m) | LIVE PROVEN (4 links) | `16-analytics-30d.jpg` to `18-analytics-12m.jpg` |
| `getPersonTiers` (the operator's badge beside the name) | LIVE PROVEN | the identity in every shot |
| `getQueueCounts` (rail badges, Open reviews) | NOT PROVABLE ON THIS BOX: `lib/admin/queries.ts` (Session A's) reads through the service role, and `SUPABASE_SERVICE_ROLE_KEY` is not in this box's environment; the card says "Unavailable" as designed | `10-overview.jpg` |
| `getRiskAlerts` (Recent alerts, Alerts desk) | NOT PROVABLE ON THIS BOX, same reason | `10-overview.jpg`, `219-alerts.jpg` |
| `getAuditLog`, `getAuditActivity` (Audit log panel and tab) | NOT PROVABLE ON THIS BOX, same reason (2 links) | `13-ops-audit.jpg` |

**Admin-shell links proven live: 25 of 29.** The other desks' pages opened
too (`200-*.jpg` to `223-*.jpg`): the ones that read through the service role
(queue, listings, agents, businesses, money, reservations, flags, reports,
support, alerts, audit, switches) show their designed failure state for the
same reason, and the Supply desk's Firm rosters read (admin-money's) says it
could not be read; those are the owning workers' links and are reported to
the lead, not counted here.

### 6.6g The escrow ruling control's copy on the locale layer (after ledger 8.14)

`EscrowRuling` in `_components/MoneyDecisions.tsx`: 13 visible strings (the
two stand-in names, the label, the placeholder, the direction prompt, the
two direction buttons, the confirmation line, the two "does not" lines, the
finality sentence, the two confirm buttons) move to `admin.escrow.rulingControl`
in `en.ts` (13 English keys, no Yoruba, Hausa or Igbo word), and Cancel
reuses `admin.payments.sweep.cancel` (1 key reused). Placeholders fill by a
`{name}` replace, so the English renders the same characters as before:
checked by reading the old and new text side by side, not by rendering (the
control needs a router). The console-wide page titles and loading labels on
the money desks are left as they are.

### 6.6h Live proof on production (www.vallospaces.com), 23 September 17:19 to 17:24 UTC

The same read-only script (`admin-live-signed-in.mjs`) against
`https://www.vallospaces.com`, signed in as the QA admin, through the box's
HTTPS proxy (the proxy's CA pinned by SPKI, `CHROMIUM_TRUST_SPKI`, not
certificate checks turned off). Pressed only navigation (Continue, the back
arrow). **Deployed commit: unknown.** The pages name their Vercel deployment:
`dpl_MmeTx6ViCFMJN3PwEgKoSDQQphuo` when the run began and
`dpl_7dLACdyXnQwYzzzVQGgWqsMNRr2q` when it ended (production was redeployed
during the run); reading the commit behind a deployment id needs a Vercel
lookup this session was not approved for. Evidence: `docs/design/proofs/session-b/admin/live/production/` (a shot per step,
`steps.json`).

An earlier run at 17:12 on `dpl_62vNjAT4VYD3s1EM9K62QBjDbak6` passed 44 of
46: the back arrow did nothing, because the browser refused a script chunk
of a newer deployment under the page's Content Security Policy while
production was switching deployments; on the settled run it passes.

| Link | State |
|---|---|
| `getQueueCounts`: rail badges and Open reviews | LIVE PROVEN ON PRODUCTION: Open reviews 0, rail badges 6, 1, 4 |
| `getRiskAlerts`: Recent alerts and the Alerts desk | LIVE PROVEN ON PRODUCTION: the newest real alert shown ("Push drain: something answered, but it was not the drain") |
| `getAuditLog` and `getAuditActivity`: Operations > Audit log and the Audit desk (2) | LIVE PROVEN ON PRODUCTION: `13-ops-audit.jpg`, `220-audit.jpg` |
| Every link of 6.6f proven locally (25) | LIVE PROVEN ON PRODUCTION as well (landing, Continue, second desk, back arrow, entry route, member refused, every read on Overview, Operations, Analytics) |
| Desks the missing key broke locally: queue, listings, agents, businesses, money, reservations, flags, reports, support, alerts, audit, switches (12) | LIVE PROVEN ON PRODUCTION: each renders its desk with no failure copy (`200-*.jpg` to `223-*.jpg`) |
| Supply desk, "Firm rosters" (admin-money's read) | FAILED ON PRODUCTION: "Firm rosters could not be read. Who works at each firm, pending, active and revoked. The read did not answer just now; reload in a moment." The project's Postgres log at the same seconds: `infinite recursion detected in policy for relation "firm_members"`. Filed as request A15 (Session A's policy) |

**Totals.** Admin shell: 29 of 29 links proven live (25 on the local build
against the live project, all 29 on production). Whole console as the script
walks it: 4 signed-out doors plus 46 signed-in steps = 50; 49 LIVE PROVEN ON
PRODUCTION, 1 FAILED (Firm rosters, A15).

### 6.7 Skipped or not verified

- No proof from the live `/admin` pages with a real admin session (none may be
  created). The reads are proven by SQL introspection of the tables and
  policies, typecheck against `database.types.ts`, and unit tests of every
  aggregation; the PostgREST calls themselves were not executed as an admin.
- The "All areas" filter on Analytics is not built.
- The register sweep of the other desks (agents, businesses, examples, fees,
  flags, reference, reports, social, standing, stops, switches, alerts, audit)
  is styling through the shared stylesheet only (their cards and tables now
  take the panel material, their heads the new page head); no desk's logic
  was changed and none was screenshotted with a session.
- i18n: the console's copy is in `admin.shell` (1464eca5); the few data words
  listed under "Console copy" in 6.1 are still English in code, and yo, ha and
  ig translate only the rail's names so far (the rest falls back to English).
- Coverage of "every notification" is blocked by RLS (Request A6); the eight
  notification kinds are listed on the tab and in the handbook, not counted.
- The other swept desks have no admin render of their own; they inherit the
  register through the shared stylesheet and carry no measured table.
- The pg_cron schedules in the handbook are taken from the migrations that
  schedule them (twelve jobs, the count the second closing audit gave) and
  assumed to be UTC (pg_cron's default).
- The empty Analytics proof shows no price checks. Whether the production
  table holds rows today was not read (row counts are outside the catalog
  reads this worker may run); the live page reads it through the admin's
  session.

## 7. Admin review desks: listings queue, listing under review, moderation, verification

Worker admin-review. Routes `/admin/listings`, `/admin/listings/[id]`,
`/admin/moderation`, `/admin/kyc` (verification); `/admin/queue` and
`/admin/support` keep their behaviour and inherit the console register from the
shell. Governing images: `C1D98B3C` panels 1 and 2 (listings queue, listing
under review), `01F7DFC7` panel 1 (moderation), `8E9602E2` panel 2
(verification); flow and actions from `roles/GOVERNING-12` panels 1 and 2.
Files: `app/admin/_review/**` (area stylesheet `review.css`, presentational
`parts.tsx`, pure `metrics.ts` and `map-tiles.ts`, `LiveRefresh.tsx`,
`contracts.ts`), `app/admin/listings/**`, `app/admin/moderation/**`,
`app/admin/kyc/**`, reads `lib/admin/reads/listings.ts`, `moderation.ts`,
`verification.ts` (read only, admin's RLS-bound client, never the service
role), harness `app/(dev)/preview/session-b/admin-review/[desk]` (R-G).

Commits: 739a5bf (requests, later withdrawn), e0de89b (reads), c615b23
(listings), 41197b1 (moderation, verification), d6f886e (handbook sections 4
to 7, 16 to 18), d646d25 (proof-shot fixes), d08117f (glow identity), 2470bdf
(designed empty states), 5fe0293 (phone layout), 846819a (held events, blocked
terms, harness), b09beea (R-B 44px controls), c565f38 (R-A measured type).

### (a) The chain, per desk

**Listings queue.** Control: status tab, search, date range, pager (all URL
params). Action: none (a read). Query: `getListingSubmissions` (Session A,
`lib/admin/queries.ts`, waiting bucket paged 40, decided bucket 10) for rows;
`getListingStatusCounts` (16 head-only exact counts, real and example apart),
`getListingReviewTimes` (every `audit_log` row `listing.review` in 14 days, a
thousand a page, paired with `listings.submitted_at`, plus the latest ever),
`getQueueRowExtras` (`is_demo`, lister role from
`agent_applications.supply_role` falling back to `agents.type`). Policy:
`listings_admin_all`, `listing_photos_select` and `listing_videos_select`
(admin branch), `agents_select_admin`, `agent_applications_select_admin`,
`audit_log_admin_select` (all read live in `pg_policies`, 22 Sept). Screen:
tabs with exact counts for every listing state except DRAFT, the table with an
Example tag on every `is_demo` row, Queue health over real listings only with
examples counted apart, median review time this week vs last. Refresh:
`LiveRefresh` every 30 s while visible, and on return to the tab.
**Broken link, named:** the Live, Rejected and Suspended tabs can only show the
ten newest, because Session A's read does not page its decided bucket; the tab
says so (AR-5, left as a stated limit).

**Listing under review.** Control: Approve (Publish once approved), Ask for
more (disabled until a reason is typed), Reject (press twice). Action:
`reviewListing` (Session A, `lib/admin/actions.ts`) unchanged. Validation:
`reviewListingSchema`; notes required for request_changes; DRAFT refused;
publish only from APPROVED. Policy: the update runs on the admin's own client
under `listings_admin_all`. Table: `listings.status`, `reviewer_id`,
`reviewed_at`, `review_notes`, `published_at`. Triggers on `listings`:
`listings_assign_reference` (the code at publish), `listings_announce_after_publish`,
`listings_block_suspended_agent`, `listings_catalogue_sync`,
`listings_location_sync` (read in `pg_trigger`). Notification: `announce`
(in-app row plus email: `listingPassedReview`, `listingApproved`,
`listingRejected`, `listingChangesRequested`) to the agent's user. Audit:
`writeAudit` `listing.review` with before and after status. Query back:
`getListingReviewExtras(id, status)` (by id: pin, amenity labels via
`listing_amenities -> amenities`, `available_from`, `is_demo`, lister
verification from `agents`, `profiles.avatar_url`,
`agent_verification_checks`, and `nextId` in the queue's order) and the
listing view from `getListingSubmissions({status, q: title})`. Screen: after
success the next listing opens (`router.push(nextHref)` then refresh), or the
queue at the end. Costs name their payee (`t.moveIn.keptByLister/Agent/Estate`,
`t.purchase.keptBySeller/Agent/State`): rule 15 holds.
**Named weak link:** the page finds the listing view by title inside Session
A's read (so the checklist and costs are computed once); a title Session A's
`orSafe` search cannot match would show "could not be opened" rather than a
guess.

**Mandates (on the Listings desk).** Control: none that writes (rows open).
Query: `getMandateQueue` (`lib/admin/reads/listings.ts`: three head-only exact
counts on `listing_mandates.review_status`, every pending row read whole a
thousand at a time, the twenty latest decisions, joined to
`listings(title, reference)`), tested in `listings.test.ts`. Policy:
`listing_mandates_staff_all` (admin or super_admin, read in `pg_policies`);
no trigger on the table (read in `pg_trigger`). Table checks: a refusal needs
a reason of 8+ characters and a decider. Screen: the Mandates panel under the
queue, a status bar with words, the rows, the reason on a refused one, the
principal's number only inside the opened row. **Broken link, named and
filed:** no action in Session A's `lib/admin` decides a mandate (scope AR-12);
each pending row says so. Live count on 23 Sept: 0 rows, so the empty state is
what production shows. Commit b72f4be.

**Moderation.** Controls: reason tabs (the eight real `reports_category_chk`
values), Held by the scan, search, dates, pager on a reason tab, and per row
`ReportDecision` (Start review, Resolve, Dismiss) or `HoldDecision` (Let it
through, Take it down). Actions: `resolveReport` and `decideHeldItem` (Session
A) unchanged. Validation: `resolveReportSchema`; takedown needs a reason
(client and server). Policies: `reports_admin_all`, `posts_admin_write`,
`stories_admin_write`, `story_comments_admin_write`,
`social_profiles_admin_write`, `events_admin_write`. Triggers:
`reports_notify` (`private.notify_report`: reporter told on insert, serious
categories raise a `risk_alerts` row), `posts_notify_after_status_change`,
`stories_notify_status`, `story_comments_notify_status`,
`social_profiles_notify_bio_status` (author told on release or removal),
`scan_*` triggers that hold. Audit: `report.review` and the moderation
action's own row. Queries: `getReports` (Session A) on All;
`getReportsByCategory` (reason narrowed in the query, paged 40) on a reason
tab; `getModerationQueue` (Session A, 50 per kind, the cap stated on screen)
for held posts, stories, comments and bios; `getHeldEvents` (every held event,
whole); `getModerationSummary` (exact counts incl. held events, over 24 hours,
by reason, response time this week vs last, 14-day new-report series).
**Broken links, named and filed:** a held EVENT cannot be decided: Session A's
`decideHeldItem` has no event target (scope AR-10); each held event row says
so. `public.blocked_terms` has RLS on, no policy and no SELECT grant for
`authenticated` (read in `pg_policies` and `has_table_privilege`), so the
console cannot show the list (scope AR-11); the Blocked terms panel says so.

**Verification.** Controls: status filter, date range, per document Approve or
Reject (reason of 12+ characters) in `DocumentDecision`, and the document
opened in `DocumentViewer` (bytes from `/api/documents/<id>`, never a storage
URL). Action: `reviewKycDocument` (Session A) -> RPC
`public.review_kyc_document` -> `private.review_kyc_document` (read live: it
writes the audit row and the notification). Validation: zod refine (reason
12+ on reject), a check constraint, and the function. Policies:
`agent_documents_admin`, `agent_documents_admin_review`,
`agent_verification_checks_admin_all`, `profiles_select_admin`,
`agent_applications_select_admin`. Queries: `getKycQueue` (Session A, grouped
by person) for the queue; `getVerificationSummary` (exact counts: awaiting,
passed and failed today and yesterday on the Lagos day, awaiting a week ago,
decision times over 14 days read whole, per-rung passed, pending, failed, the
ten latest decisions); `getSupplyRoles` for the Role column. Every
verification rung is covered: identity, address, payout account, met in
person (Results by rung). **Named limit:** `getKycQueue` reads the 300 newest
documents; its `pendingCount` is therefore NOT printed; the cards come from
exact counts.

**Queue and Support.** Unchanged behaviour (`getQueueCounts`, the five
readers; `getSupportTickets`, `getTicketThread`, `replySupportTicket`,
`setTicketStatus`); they take the shell's register from `admin.css`. Not
restyled beyond it (see skipped).

### (b) The comparison, measured

Scale. Each render panel is about 495 image px wide for a desktop window, but
the render compresses vertically: the text and control heights read
consistently at x1.5 image px to CSS (table text cap 6.3 image px /0.72 x1.5 =
13px; badge 18 -> 27; tab 25.5 -> 38), so type and heights use x1.5 and widths
follow the window's proportions (content column about 57 per cent, the side
rail about 16 per cent, drawn at 300px so its labels fit). Built values are
read from the browser (`getComputedStyle`, bounding boxes) at 1440 dark on the
harness. Font size from cap height / 0.72 (R-A).

**Listings queue (C1D98B3C panel 1)**

| Property | Image (measured) | Built (measured) | Match |
| --- | --- | --- | --- |
| Page title | cap 10.5 image px -> 22px, semibold, white | 22px Poppins 600, #FFF | yes (R-A) |
| Sub-line | cap 6.25 -> 13px, cyan-blue #36AEF1 max | 13px 400, `--nf-brand-secondary` #5C9FFF | size yes; colour in the one blue family's quiet blue rather than the render's cyan (cyan is reserved for pending) |
| Tabs | 25.5 image px tall -> 38; label cap 7.5 -> 15.6px; radius 3 -> 4.5 | 44 tall, 15px 500, radius 14 (ratio 0.32) | label yes; height R-B floor 44; radius the shape law's control radius |
| Active tab | lit blue #71A0FD face, #93BCFE highlight, bloom | brand gradient over `--nf-admin-cta-edges` lit edges, top inset rim, 8/22px bloom | yes |
| Tab counts | none drawn (render has no counts) | exact counts beside each word | deliberate: the brief asks for real counts |
| Panel | radius 6.5 -> 10; fill #00143A; edge #00358A | radius 10 (the shell's reconciled `--nf-admin-radius`, 66c2ecf5); `--nf-admin-panel-fill` lit gradient; per-side lit edges; rim; the shell's glow | yes |
| Column heads | cap 5.5 -> 11.5px, #169EE0 | 12px 500, #5C9FFF | yes (floor) |
| Row | 54 image px -> 81 | 81 | yes |
| Thumbnail | 29.5 x 37.5 -> 44 x 56, radius ~4 | 44 x 56, radius 6 | yes |
| Listing code | cap 6.25 -> 13px 500 | 13px 500, tabular | yes |
| Role tag | 24 x 15 -> 36 x 22, blue fill #2A76D0 | 22 tall, 12px, brand 22% fill, brand edge | yes |
| Status badge | 29.5 x 18 -> 44 x 27, filled tone, radius 5 -> 7.5 | 26 tall, radius 6 (0.23), tone fill 42% on navy, tone edge, glow | yes; words are the tab's words ("Waiting", "More info needed") |
| Badge colours | green #027657/#08A47B, red #861833, blue #4F94EC | success #10B981, error #FF1744, pending #00C8FF, info brand | family yes; render's "Under review" green is translated to pending cyan |
| Queue health donut | 50 image px -> 75 in a 75-wide rail; four slices | 128px ring in the 300px rail; four slices, legend with counts | proportion to rail kept; size up because the rail is wider (R-C note) |
| Average review time | figure cap 12.5 -> 26px; delta emerald with arrow | 26px 600 (measured); emerald arrow delta; caption with the N | yes |
| Pager | 22 image px -> 33; active lit; in its own panel; numbered to 12 | 44 x 44 (R-B), active lit, in its own lit panel; numbers only pages it has evidence for | yes; the page count is honest by design (a cursor read has no total) |

**Listing under review (C1D98B3C panel 2, GOVERNING-12 flow)**

| Property | Image | Built | Match |
| --- | --- | --- | --- |
| Head | back square, title ~22px, "Under review" badge | 44px back (R-B), 22px title, status badge | yes |
| ID line | cap 9 -> 19px semibold | 20px Poppins 600 | yes |
| Summary | 13px quiet blue | 13px `--nf-brand-secondary` | yes |
| Photo strip | lead photo, video tile with play, 6 small, "+6" | lead, walkthrough (poster and play when unsigned), 8 small, "+N" | yes |
| Property details | icon, label in blue, value right | 16px line icons, blue labels, values right, rows 34 tall | yes |
| Power and water | glass plates 32 with glyph | 32px plates on `--nf-admin-tile-edges`, lit; bolt, bolt, and a stroked water drop drawn in the line tier | yes; the identity pack's `water-drop-plinth` is a glass object and the plates carry line glyphs, so a glass object would break the set |
| Amenities | tick rows | tick rows from `amenities.label` | yes |
| Location | dark map with pin, place label, "View on map" | real tiles from `lib/maps/tiles.ts` (dark set), pin, place, credit | "View on map" not drawn (it would leave Vallo) |
| Move-in costs | lines + "Total to move in" | lines each naming its payee + total, stated or summed | deliberate: payee added (R5, rule 15) |
| Lister verification | avatar, name, role tag, Verified, "ID verified, Bank verified" | same from `agents` and the rungs | yes |
| Reason for review | one sentence | the status in words, every failing check, last note | yes, real |
| Action bar | field + Approve (emerald), Ask for more (blue), Reject (rose) | field + three lit buttons 44 tall, gradient, top rim, own-ink bloom | yes; Reject asks twice; Ask disabled until a reason |
| Extra (not in render) | none | Description, full admission checklist | R-F: real function kept, compact |

**Moderation (01F7DFC7 panel 1)**

| Property | Image | Built | Match |
| --- | --- | --- | --- |
| Title / sub | 22px / 13px quiet blue | 22px / 13px | yes |
| Reason tabs | All, Abuse, Fraud, Spam, Sexual content, Impersonation | All, the eight real reasons (short words), Held by the scan | translated: the render's five are not recorded categories |
| KPI cards | two, figure cap 20 -> ~40px, sparkline, delta | two, 40px figure (measured), sparkline of 14 real days, delta vs last week; Over 24 hours title in rose | yes |
| Table | item with thumb, reporter + "User", reason, age, status | item with lit plate (a report has no photo), reporter + Member or Safety scan, reason, age, status; rows open to the decision | yes; plate for thumbnail because a report target is not always a listing |
| Row height | ~47 image -> 71 | 71 (measured) | yes |
| Breakdown donut | ring, total, five reasons with % | ring, total waiting, every reason with its count, blue ramp by magnitude | palette translated (render teal and pink are off-family; research part four) |
| Queue health | "Human review 24/7", avg response time | open, in review, held, median response this week vs last | "24/7" refused (a claim) |
| Community safety | shield, "Our priority" | shield, one sentence of what actually happens | slogan replaced by a fact |
| Added | none | Blocked terms panel, held events | brief and lead ruling |

**Verification (8E9602E2 panel 2)**

| Property | Image | Built | Match |
| --- | --- | --- | --- |
| KPI row | four cards, figure cap 15 -> 31px, delta, "vs last week" | four cards, 31px (measured), delta vs yesterday or a week ago, from exact counts | yes |
| Queue table | avatar, name, role, tier chip, match score, submitted, Pass/Fail | avatar initial, name, role, Tier badge, rungs passed of 4, latest upload, documents to decide | "match score" refused (not recorded), rungs instead |
| Row | ~42 image -> 64, avatar 24 -> 36 | 64 (measured), avatar 36 | yes |
| Funnel | tapered funnel, four figures | one status bar with words and counts (awaiting, passed, failed) | translated: the render's funnel is not a funnel (Passed > Under review); one status bar per the founder's chart rule |
| Provider performance | NIMC, BVN, Bank, Selfie with % | Results by rung: identity, address, payout, met in person, passed, pending, failed | refused provider names and rates (not recorded); every rung covered |
| Recent verifications | name, role, result, time | name, document, result, time | role column replaced by the document (what was decided) |

Side-by-side proofs (render left, built right, re-shot after the last change):
`docs/design/proofs/session-b/admin-review/sbs-listings.jpg`,
`sbs-review.jpg`, `sbs-moderation.jpg`, `sbs-kyc.jpg`. Desktop and phone, dark only:
`<desk>-1440-dark.jpg`, `<desk>-390-dark.jpg` for listings, review,
moderation, kyc;
`listings-1536-dark.jpg`; the review page's two failure states (a walkthrough
that could not be signed, a listing with no pin) in
`review-failure-states-1440-dark.jpg`; the empty state as it is live today:
`listings-empty-1440-dark.jpg`,
`moderation-empty-1440-dark.jpg`, `kyc-empty-1440-dark.jpg`. ALL FIXTURE-BACKED
(R-G): harness `/preview/session-b/admin-review/<desk>` (`?empty=1`), real
components, invented figures that never reach a database. THE MAP TILES IN
`review-*.jpg` AND `sbs-review.jpg` ARE A STAND-IN: the sandbox's egress proxy
refuses the tile hosts (`basemaps.cartocdn.com`, `tile.openstreetmap.org`,
connect_rejected, checked 23 Sept), so the shot script answers tile requests
with a plain navy grid. The layout, the pin position (projected from the
fixture's latitude and longitude by `tileMosaic`) and the credit line are
real; the street detail on a live page comes from the provider. The
walkthrough tile shows the player with its poster and controls (the fixture
file is not a real video and is never fetched: `preload="none"`).

Re-audit. Round one (images beside the first shots) found: badges in a word
different from their tab; the media strip ending in a "+2" with empty tiles; a
broken-image mark where a map tile failed; KPI figures floating low in their
card; tab words too long for moderation. All fixed (d646d25). Round two (after
R-A to R-G and the glow identity): title 26 -> 22 and tabs 14 -> 15 from cap
heights, thumbnail 52 -> 44 wide, role tag 20 -> 22, all controls 40 -> 44,
the lit fill and per-side edges taken from the shell's identity variables
rather than a flatter local copy (c565f38, b09beea, d08117f). Round three
(5ce9249), closing the four differences this section had listed as not
matching: the listings pager in its own panel, moderation rows 71 and
verification rows 64 (avatar 36), KPI figures per desk at 26, 31 and 40, and
a line water drop; panels on the shell's reconciled 10px corner and glow
(66c2ecf5). Side-by-sides re-shot after it; they hold.

### (c) Light mode

Light mode removed by the founder on 23 September; dark only. Every paper rule
left `review.css`, the map draws only the dark tile set, and the light proofs
were deleted (67b3c88).

### (d) Shape sweep (R-D)

`node scripts/design/compare-surface.mjs --shape-sweep --routes
/preview/session-b/admin-review/{listings,review,moderation,kyc} --widths
390,1440 --theme both`: BREACHES 0; WORTH AN EYE (0.35 to 0.5) 0; round
icon-only 0. Because that tool lists only controls at or above 0.35, a census
of every text-bearing control was also taken (`scratchpad/ar/ratios.mjs`):
listings max 0.318 (tab 44 tall, radius 14); review max 0.318 (reason
field); moderation max 0.318; kyc max 0.231 (badge 26 tall, radius 6);
identical in dark and light, re-run after round three.
`check-css-tokens.mjs`: clean. tsc: clean. eslint on every changed file:
clean. vitest `src/lib/admin/reads` and `src/app/admin/_review`: 80 passed.

### (e) Refused from the render, with the reason

- Every count, price and percentage in the four panels (73, 28, 8h 24m, 42%,
  137, 18%, 2h 36m, 86, 92% ...): figures come from the database only.
- "Match score" and "Provider performance" (NIMC, BVN, Bank, Selfie): nothing
  records a provider or a score. If the founder wants a provider, that is a
  product decision, asked here as a question.
- "Human review 24/7": an operating claim nobody can evidence.
- "Community safety, Our priority": a slogan; replaced by what the system does.
- Abuse, Fraud, Spam, Sexual content, Impersonation as tabs: not categories the
  platform records.
- "Agency fee (10%)", "Legal fee (2%)" with no owner: each line names who is
  paid (R5); Vallo takes no fee.
- "View on map" (to a third-party map): not drawn; the tiles are shown in place.
- Off-family colours (teal, pink slices): the blue ramp by magnitude.
- The lister's notification centre and search by listing ID (GOVERNING-12
  panels 3 and 4): Session A's (R5), not built.

### (f) Skipped or not verified

- No signed-in run of any desk: there is no admin test user and none may be
  created. Wiring is proven by code, `pg_policies`, `pg_trigger` and
  `pg_proc` reads (22 Sept, project uccixoonmbhrnyczyigt), and unit tests of
  the reads' aggregation; not by a live decision. No decision was taken on
  production (reports 0, documents 0, held items 0, waiting listings 0).
- Held events cannot be decided (AR-10); the blocked terms list cannot be read
  (AR-11); listing mandates cannot be decided (AR-12). All filed in the scope
  file.
- The map in the proofs uses stand-in tiles (the tile hosts are unreachable
  from the sandbox); no proof shows real street tiles.
- `/admin/queue` and `/admin/support` inherit the shell's register and were not
  rebuilt to an image (none governs them).
- The Live, Rejected and Suspended tabs show the ten newest (Session A's read).
- Most desk copy is English literals (R-107 console decision); the shared words
  come from the dictionary.

### Requests to admin-shell

None outstanding: the review desks use the shared `CalmNote`, `Sparkline`,
the glow identity variables and the frame as they are.

### Final pass, 23 September

**Re-checked.** Each governing panel against its side-by-side, re-shot on the
shell's full-height rail and dark-only material (3f1405d) from the committed
harness with the committed script
(`node scripts/design/session-b-shots/admin-review-shots.mjs`; the machine
was under a load average of 35 and two runs crashed the renderer mid-set, so
the set is assembled from the first full run plus the side-by-sides built with
the same crop boxes). Light mode stripped from every review file (67b3c88).
"Viewing" swept: none on these desks (item 7).

**Commands and output (23 Sept).**
- `npx tsc --noEmit -p apps/web`: no errors.
- `npx eslint` on every review file, the three reads and the harness: no
  problems.
- `npx vitest run src/lib/admin/reads src/app/admin/_review`: 17 files,
  110 tests passed.
- `node scripts/check-css-tokens.mjs`: every stylesheet check clean
  (0 layer-1, 0 raw colours, 0 unresolved var(), 0 capsules, 0 dull
  controls); the comment-path check reports 2 paths, neither in these desks'
  files (`tokens.css` naming the deleted `light.css`, and
  `components/app/wallet/BadgeSlot.tsx`).
- Shape sweep, dark, `/preview/session-b/admin-review/{listings,review,
  moderation,kyc}` at 390 and 1440 (run on 5ce9249, before the badge slot,
  which adds no text-bearing control): breaches 0, worth an eye 0, round
  icon-only 0; the census of every text-bearing control: max 0.318.

**Fixed in this pass.** The shot script wrote into `scripts/docs` (wrong repo
root): fixed. The badge: each lister (queue rows, the listing under review)
and each applicant (verification) has its tier READ from
`public.person_badge` through the console's `getPersonTiers` and drawn with
the shared `PersonTier` (Session A's `TierBadge`); nothing is computed here
(ed247e2 and this commit). The harness no longer names a `-day` asset.

**Not covered by the badge yet, named:** reporters and held-content authors on
Moderation, and requesters on Support: the reads these desks use
(`getReports`, `getModerationQueue`, `getSupportTickets`, Session A's) return
names, not user ids, so the tier cannot be read for them without a change to
those reads or new reads of my own. Left undone for time.

**BUILT AND UNPROVEN** (this box cannot reach Supabase over HTTP, so no
signed-in run is possible here). Proving each needs a signed-in admin on a
build that can reach the project:
1. Approve, Publish, Ask for more and Reject on a real submission, and the
   next listing loading after each (`reviewListing`, `announce`, audit row).
2. Report decisions and held-item decisions on Moderation.
3. Document decisions and the in-app DocumentViewer on Verification.
4. Every read in `lib/admin/reads/{listings,moderation,verification}.ts`
   against live rows: proven by unit tests of their aggregation and by
   read-only SQL of the policies they depend on, never executed through the
   app.
5. The map tiles and the walkthrough player with a real file (proofs use a
   stand-in tile grid and an unfetched video).
6. `LiveRefresh` picking up new work without a reload.

**Percentage.** Gate items met: 4 of 5 fully (measured match, no claims,
checks and sweep, pushed) and 1 partly (wired real: every chain link is
named and verified by code and read-only SQL, none exercised live), so 4/5.
Chain links proven by execution: 0 of 5 desks end to end; links verified by
code and live `pg_*` reads: 5 of 5 desks. Controls exercised through a real
server action: 0 of 14 (Approve, Publish, Ask for more, Reject; Start review,
Resolve, Dismiss; Let it through, Take it down; Approve and Reject on a
document; the queue, listings and moderation search forms, pager) because no
signed-in run is possible here; controls exercised in the harness on a
production build (navigation, tabs, rows opening, pager links): all of them.
Open requests: AR-10, AR-11, AR-12.

## 8. Admin money desks: money, escrow, supply

Worker admin-money. Governing images: panel 3 of `C1D98B3C` (Money), panels 1
and 3 of `8E9602E2` (Escrow, Supply). Routes `/admin/money`, `/admin/escrow`,
`/admin/supply` (new). `/admin/bookings` and `/admin/payments` keep their
behaviour and wear the shell's register; they were not restyled beyond it.

Files: `app/admin/money/{page,MoneyDesk,MoneyRows}.tsx`,
`app/admin/money/_desk/{Desk,charts,ChartReadout,Reconciliation}.tsx` and
`desk.css`, `app/admin/escrow/{page,EscrowDesk}.tsx`,
`app/admin/supply/{page,SupplyDesk,loading}.tsx`, and the reads
`lib/admin/reads/{money,escrow,supply,money-derive,money-types}.ts` with
`money.test.ts`, `escrow.test.ts`, `supply.test.ts`, `money-derive.test.ts`
(40 tests). Handbook: `docs/ADMIN_CONSOLE.md` sections 8 to 12, and the money
desks' parts of 16, 17 and 18.

### 8.1 The chain, per desk

**Money.**
- Screen: `/admin/money` (server component, `force-dynamic`, `LiveRefresh`
  re-runs the reads every 60 seconds and on tab focus).
- Query: `getMoneyDesk` (`lib/admin/reads/money.ts`): `requireAdmin()` then the
  admin's RLS client, `readEvery` over `wallet_entries`, `wallets`, `escrows`,
  FAILED `transactions` of the last 14 days, the count checked against
  `count: "exact"`. `getReconciliationHealth`: every
  `wallet.reconciliation.run` row in `audit_log` in 7 days, plus the newest
  clean run and newest run of all time. Existing reads kept:
  `getMoneyConsole` (stuck debits, wallets), `getRefundConsole`,
  `getEscrowConsole({ status: "DISPUTED" })`.
- Policies (read live, `pg_policies`): `wallet_entries_select_admin`,
  `wallets_select_admin`, `escrows_select_admin`,
  `transactions_admin_select`, `audit_log_admin_select`,
  `profiles_select_admin`, all `private.has_role(auth.uid(), admin |
  super_admin)`. No policy was widened; no service role is used by the new
  reads.
- Writers of the rows it reads: the Paystack webhook and reconcile route
  (`wallet_entries`, `transactions`), `recordMoneyAudit` (the reconciliation
  audit rows, `app/api/paystack/reconcile/route.ts`), the escrow functions.
- Control: the dispute ruling (`EscrowRuling`, Session A's
  `_components/MoneyDecisions.tsx`), unchanged. Action `resolveEscrow`
  (`lib/admin/money-actions.ts`), zod validation (uuid, release | refund, note
  20 to 1000 chars), RPC `public.escrow_admin_resolve` (security definer,
  repeats the role check, refuses non-DISPUTED), `private.escrow_settle`,
  trigger `escrows_guard_transition` writes the audit row, notification
  `private.notify(payer | payee, 'wallet', ...)` with the ruling word for word,
  then `revalidatePath("/admin/escrow")`. Read from `pg_proc` source on 22
  September. The money page is `force-dynamic` and live-refreshed, so it shows
  the new state too.
- Broken links: `private.reconciliation_watch` (the job's last HTTP reply and
  verdict) is unreachable by any admin read; request 10 in the scope file asks
  for an admin-callable function. Nothing else is broken on this chain.

**Escrow.**
- Screen `/admin/escrow`, `LiveRefresh`. Query `getEscrowDesk`
  (`lib/admin/reads/escrow.ts`): every `escrows` row with `listings ( title )`
  once, count checked, pipeline by state and purpose, the seven transition
  timestamps into "recent activity", the float, every dispute unpaged, the
  narrowed numbered page; names from `profiles`. Policies
  `escrows_select_admin`, `listings_admin_all`, `profiles_select_admin`.
- Controls: the six pipeline tiles are links (`?status=`), the shared
  `QueueFilters` (search by property, status chips, date range), numbered
  pager (`?page=`), and the dispute ruling (chain as above).
- Broken links: none found. `escrows` holds zero rows today, so the ruling
  path was verified by reading code and function source, not by running it.

**Supply.**
- Screen `/admin/supply` (new route; admin-shell's rail already carries the
  Supply row), `LiveRefresh`. Query `getSupplyDesk`
  (`lib/admin/reads/supply.ts`): `agents`, `agent_applications (supply_role)`,
  `businesses`, `listings`, `accommodations`, released `escrows`,
  CONFIRMED and COMPLETED `bookings`, each read whole. Role resolution mirrors
  `lib/supply/workspaces-queries.ts` and `kindFromAgentType`. Policies
  `agents_select_admin`, `agent_applications_select_admin`,
  `businesses_admin_all`, `listings_admin_all`, `accommodations_admin_all`,
  `escrows_select_admin`, `bookings_admin_all`.
- Controls: role cards are links (`?role=`), the examples toggle
  (`?examples=1`), numbered pager. No writes.
- Demo rule (founder claims ruling R4): `is_demo` rows are excluded from every
  figure unless the operator asks, and the page prints how many were left
  out. On 22 September that is every supply row there is, so the live desk
  reads zero across the board and says why.

### 8.2 Measured comparison, per desk

**How the render was measured and converted.** Each panel is a browser
window about 486 render px wide. The brief's first rule (486 render px =
1440 CSS) gives 2.96 CSS px per render px and puts the ledger's body text at
25px and a KPI figure at 49px, which is a zoomed drawing, not a 1440
console. So the scale was CALIBRATED on the one element drawn in both a
three-panel render and the full-window overview render (`5EAA44CB`, 1550
render px = 1440 CSS, 0.929 CSS per render px): the rail label "Supply"
measures 44 render px wide in the overview and 26 in every panel of
`C1D98B3C` and `8E9602E2`. So one panel render px = 44 / 26 x 0.929 =
**1.57 CSS px**, and the panels draw a window about 763 CSS px wide. Cap
heights were read with an ink scanner (`ink.mjs`: the rows and columns of
pixels brighter than a threshold inside a box) and converted: CSS cap =
render cap x 1.57, font size = CSS cap / 0.72 (the cap-height ratio of
Poppins and Inter). Colours are 3x3 means (`samp.mjs`); the corner and glow
were read along lines across the edge. Built values are `getComputedStyle`
in Chromium at 1440 (`m2.mjs`), fixture-backed harness, after the final
change.

Under lead ruling R-A every text role takes its render's measured size; the
three panels do not draw their roles at one size, so money, escrow and supply
each carry their own (`.nf-md--escrow`, `.nf-md--supply` in `desk.css`).

**Money** (`C1D98B3C` panel 3; side-by-side `side-by-side-money.jpg`)

| Property | Render (measured) | Converted | Built (measured) | Match |
|---|---|---|---|---|
| Page title "Money" | ink 16 render px incl. the y descender, cap 12 | 18.8 CSS cap, 26px | 26px, 700, white | yes |
| Lede | cap 7, blue `#1085bc` family | 11 cap, 15px | 14px, `--nf-brand-quiet` rgb(92 159 255) | yes (1px) |
| KPI label "Wallet float" | ascender 7, `#1085bc` | 11 cap, 15px | 15px, 500, quiet blue | yes |
| KPI figure "₦842,500" | digit cap 12 (ink 15 with the naira bar) | 18.8 cap, 26px | 24.6px at 1440 (clamp to 26 at 1500+), 700 | yes (1px) |
| Change "12%" | cap 7, emerald | 11 cap, 15px | 15px, 600, `--nf-state-success` | yes |
| "vs last week" | smaller than the figure | about 12px | 12px, muted | yes |
| Panel titles | cap 9 ("Money in vs money out", "Ledger") | 14 cap, 20px | 20px, 600 | yes |
| Table head | cap 6, quiet blue | 9.4 cap, 13px | 13px, 500, quiet blue | yes |
| Table row text | cap 6 | 9.4 cap, 13px | 13px | yes |
| Table row pitch | 25 render px | 39px | 64px | no: each row carries the payment reference on a second line, which support needs and the render omits |
| Pager box | 25 render px | 39px | 44 x 44 (R-B floor) | yes (R-B) |
| Pager digit | cap 9 | 14 cap, 20px | 20px | yes |
| KPI card box | 79 x 85 render px | 124 x 133 | 284 x 124 at 1440 (four across a wider window) | height yes; width follows the 1440 grid |
| Card corner | about 5 render px, traced by eye (the scanner could not separate the rim from the fill) | about 8px | 10px (`--nf-admin-radius`, admin-shell's measured corner since `66c2ecf5`; the desk inherits it) | yes (within the 6 to 9 CSS px band admin-shell measured at this scale) |
| Card fill | top under the rim `#002c7c`, 8px down `#001b53`, middle `#00153f`, foot `#011e55` | a lit top, dark middle, lift at the foot | the shell's `--nf-admin-panel-fill`: the same four-stop lit ink over the canvas | yes |
| Lit rim | top edge `#0373d8`, 1px | a bright top line | inset 0 1px 0 rim-lit ink at 55% plus the centred catchlight | yes |
| Side edge | left `#003780`, 1px | per-side edge | `--nf-admin-panel-edges` (per side, lit top left) | yes |
| Outer glow | none: ground `#000a27` flat from 1px outside; a 1px contact line `#000522` | none | the shell's `--nf-admin-panel-glow` since `66c2ecf5`: light kept inside the edge, a 3px outer halo | yes (a hair, not a bloom) |
| Chart | filled rising area, second series quieter, legend top right | | two filled monotone curves on the ramp, dashed second series, legend top right, hover readout | yes in anatomy; the fixture's monthly sums oscillate, the render's rise |
| Recon ring | emerald ring, % in the middle, Healthy badge | | emerald ring, %, badge on the shape law | yes |
| Credit colour | `#1aba8d` | | `--nf-state-success` rgb(16 185 129) | yes |
| Status badge | pill-like | | `StatusPill` 23 to 28px tall, 6px corner (ratio 0.26) | shape law wins |

**Escrow** (`8E9602E2` panel 1; `side-by-side-escrow.jpg`)

| Property | Render (measured) | Converted | Built (measured) | Match |
|---|---|---|---|---|
| Page title "Escrow" | cap 14 | 22 cap, 30px | 30px at 1440 (clamp), 700 | yes |
| Stage label "Funded" | ascender 7 | 11 cap, 15px | 15px, 500 | yes |
| Stage count "124" | cap 12 | 18.8 cap, 26px | 24.6px at 1440, 600 | yes (1px) |
| Stage tile | 6 tiles with arrows, 52 x 70 render px | 82 x 110 | 6 linked tiles with arrow glyphs, 177 x 104 | height yes; width follows 1440 |
| Panel titles | cap 9 | 14 cap, 20px | 20px | yes |
| Float figure | digit cap 11 | 17 cap, 24px | 24px, 600 | yes |
| Float accent rule | short cyan bar | | 48 x 3px, `--nf-state-warning` (the cyan) | yes |
| Table head, rows | cap 6 | 13px | 13px | yes |
| Row thumbnail | property photograph, 26 render px | 41px | a 44px line-glyph plate | no: `escrows` carries no photograph |
| Countdown | emerald "4d 12h" | | emerald "4d 12h", `--nf-state-success` | yes |
| Donut | teal, mauve, pink slices | | blue ramp by lightness, sixth step hatched, word + share + count | translated (colour law) |
| Activity dots | emerald, rose, blue, cyan | | the status four with a word beside each | yes |
| Radius, rim, fill, glow | as money | | as money | as money |

**Supply** (`8E9602E2` panel 3; `side-by-side-supply.jpg`)

| Property | Render (measured) | Converted | Built (measured) | Match |
|---|---|---|---|---|
| Page title "Supply" | ink 19 incl. pp and y, cap 14 | 22 cap, 30px | 30px at 1440, 700 | yes |
| KPI label "Owners" | ascender 8 | 12.6 cap, 17px | 17px | yes |
| KPI figure "1,248" | cap 13 | 20.4 cap, 28px | 26.2px at 1440, 700 | yes (1px) |
| Change "12%" | cap 9 | 14 cap, 20px | 20px, 600 | yes |
| Panel titles | cap 10 | 15.7 cap, 22px | 22px | yes |
| Table head, rows | cap 6 | 13px | 13px | yes |
| Verified mark | tick or cross | | tick or cross with the word Yes or No | yes, plus the word |
| Growth chart | four filled lines in four hues, legend | | four lines on the blue ramp, dash patterns, labels spread at the line ends, legend | translated (research part four) |
| Top areas bars | gradient bars on a track | | gradient bars on a track | yes |
| Property type donut | six hues | | ramp by lightness plus hatching for the sixth, words, shares, counts | translated |
| Examples control | absent | | "Examples left out" toggle, 44px, 14px corner (0.32) | added (R-F: real function, drawn compactly) |

**Bookings and payments, against the register** (no render governs them;
the register is the money desk above; `side-by-side-bookings-vs-register.jpg`,
`side-by-side-payments-vs-register.jpg`)

| Property | Register (money desk, measured) | Bookings (measured) | Payments (measured) | Match |
|---|---|---|---|---|
| Page title | 26px 700 | 26px 700 | 26px 700 | yes |
| Lede | 14px quiet blue | 14px quiet blue | 14px quiet blue | yes |
| KPI card | 10px corner, per-side lit edges, lit fill | same, five across (224 x 138) | same, four across (284 x 124) | yes |
| KPI label / figure | 15px 500 / 24.6px 700 | 15 / 24.6 | 15 / 24.6 | yes |
| Change | 15px 600, emerald or rose | none drawn (state counts, no earlier period of the same thing) | 15px, rose when failures rise | yes |
| Panel title | 20px 600 | 20px | 20px | yes |
| Table head / rows | 13px / 13px | 13 / 13 | 13 / 13 | yes |
| Pager | 44 x 44, 10px corner, lit current page | same | same | yes |
| Status badge | `StatusPill`, 6px corner | same | same | yes |
| Status bar | none on money | 28px track, words on segments | 28px track, words on segments | new element, register colours |
| Chips and toggles | 44px, 14px corner (0.32) | shared status chips | outcome and kind toggles, 44px (0.32) | yes |
| Empty state | shared `CalmNote` over the kept frame | same | same | yes |

### 8.3 Refused from the render

- Every count, amount and percentage drawn in the three panels (₦842,500 float,
  548 escrows, 1,248 owners and the rest). The desks print only what the
  database returns.
- The render's off-palette donut slices (teal, mauve, pink) and the four-hue
  growth chart: research part four proved no four-slot palette passes our
  colour law; translated to the blue ramp plus words and dash patterns.
- Property photographs in the escrow rows: `escrows` has no photo and the read
  does not join one; a line glyph plate stands in.
- "Last successful run 98%" as a single figure: built as the share of runs in
  the last seven days, and the badge reports silence before the share.

### 8.4 Light mode

~~Checked at 1440 and 390 on all five desks in light.~~ Light mode removed by the founder on 23 September; dark only. The desks'
light rules (`desk.css` "on paper" block) are deleted, and light proofs are no
longer shot.

### 8.5 Phone 390

One defect found and fixed: on the escrow desk the page grid's auto column
grew to the status chip row's min-content (1,007px measured) so everything
ran off the right edge. `.nf-md` now declares `minmax(0, 1fr)`. Tables become
self-naming rows below 768px; the pipeline is two columns; charts scale.

### 8.6 Measured built values, shape sweep and checks

Built values are `getComputedStyle` in Chromium at 1440 dark on the committed
harness after the final change (`m2.mjs`, 23 September), and are the "Built"
column of the tables in 8.2. Shared by every desk: KPI and panel card corner
10px (the shell's `--nf-admin-radius`), per-side lit edges, inset rim; pager 44 x 44, corner 10px (ratio 0.23),
current page on the lit primary with rim and bloom; table head and rows 13px;
status badge 23 to 28px tall, 6px corner (0.26); calm note corner 10px;
toggles and chips 44px tall, 14px corner (0.32). Per desk: money title 26 /
KPI label 15 / KPI figure 24.6 / change 15 / panel title 20; escrow title 30
/ stage label 15 / stage count 24.6 / float 24 / panel title 20; supply
title 30 / KPI label 17 / KPI figure 26.2 / change 20 / panel title 22;
bookings and payments at the money register. KPI cards: money and payments
284 x 124, supply 284 x 136, bookings 224 x 138 (five across), escrow stage
tiles 177 x 104.

Shape sweep, `node scripts/design/compare-surface.mjs --base
http://127.0.0.1:3177 --shape-sweep --theme both --routes` over all ten
harness routes (`/preview/session-b/admin-money/{money,escrow,supply,bookings,payments}?state={full,live}`)
at 390 and 1536:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
ROUTES REFUSED, so nothing is claimed about them either way: 0
COVERED: 10 route(s) asked for, 0 refusal(s), 0 route/width/theme combination(s) actually measured.
```

The "0 combinations actually measured" line counts only combinations that
produced a finding at or above 0.35, so a clean run prints 0 there. To prove
the pages were opened and swept, the same selector was run independently
(`scratchpad/am/sweepcount.mjs`): 40 route/width/theme combinations, every
page's `h1` present, 1,096 controls measured, highest text-bearing ratio
**0.32** (the 44px toggles and chips). Under R-D that is sweep zero. The 45
shell items seen in round one (the "All desks" row at 0.39, the bar search at
0.35) are gone since admin-shell's `2fc66f60`.

Phone 390: page scroll width is 390 on all ten routes (`wide.mjs`); the items
that sit past the right edge are inside the chip-row scroller or are the
sr-only table twins.

Checks on the final tree: `check-css-tokens.mjs` clean, 0 layer-1
references; `tsc --noEmit` clean; `next build` exit 0; `eslint` over
`app/admin/{money,escrow,supply,bookings,payments}`, `lib/admin/reads` and the
harness: clean; `vitest run src/lib/admin/reads`: 10 files, 70 tests passed.

### 8.7 Proofs

All desk screenshots come from the committed harness under R-G,
`apps/web/src/app/(dev)/preview/session-b/admin-money/{money,escrow,supply,bookings,payments}`
(gated by `VALLO_PREVIEW_HARNESS`), which renders the real desk components
inside admin-shell's real `AdminFrame` with FIXTURE props, because no admin
session exists on this box. Two fixture states (`fixtures.ts`): `live`
mirrors what the production database held when read with SQL (one wallet,
a deposit on 9 August and a withdrawal on 10 August, no escrows, no bookings,
64 listings all examples, 7 accounts), so it shows the designed empty
states; `full` is invented data used only to prove the layout against the
render and never shown on a real page. The live wiring is proven by the
reads' code, the SQL introspection in 8.1 and 8.9 and the 70 unit tests, not
by a signed-in screenshot.

`docs/design/proofs/session-b/admin-money/`: 40 shots, each desk x
`full`/`live` x 1440/390, dark (light shots deleted: light mode removed by the founder on 23 September; dark only); `side-by-side-{money,escrow,supply}.jpg`
(render crop beside the built page at 1440 dark);
`side-by-side-{bookings,payments}-vs-register.jpg`.

### 8.8 Skipped or not verified

- No signed-in run of the real pages: no admin test user may be created.
- The escrow ruling and the admin booking cancel were not exercised end to
  end: zero escrows and zero bookings exist.
- `private.reconciliation_watch` not surfaced (request 10, a migration,
  Session A's).
- `rent_payments` was the one money path on no desk; closed in round three
  (8.10). No charge exists, so the panel has only been seen full on the
  fixture.
- Card corner and outer glow: reported here at 14px and 22px against the
  render's about 8px and none; admin-shell re-measured and changed the shared
  values (`66c2ecf5`: 10px corner, 3px halo). `.nf-md-card` had pinned
  `--nf-radius-md` itself; it now reads `--nf-admin-radius`, so no desk
  overrides the shell. Measured after the change: 10px on every desk's cards.
- Ledger row pitch 64px against the render's 39: the second line carries the
  payment reference.
- The render's escrow row photographs: `escrows` has no photo.
- The `full` money fixture's monthly sums oscillate where the render's rise;
  a fixture matter only.
- An incident during the work: once, before the coordinator's warning, this
  worker ran `git stash` and `git stash pop` in its worktree; the stash is
  shared across worktrees. The popped change set was this worker's own (the
  file list matched), but it is recorded here in case another worker lost
  work around 20:35.

### 8.9 Round two: bookings, payments, designed empty states, the glow identity

**Bookings** (`/admin/bookings`): chain. Screen, `LiveRefresh`. Query
`getBookingsDesk` (`lib/admin/reads/bookings.ts`): `bookings` with
`listings (title, area, city)`, SUCCESSFUL `transactions`, `booking_refunds`,
guest names from `profiles` where the booking carries none; every table read
whole, bookings checked against an exact count. Policies `bookings_admin_all`,
`listings_admin_all`, `transactions_admin_select`,
`booking_refunds_select_admin`, `profiles_select_admin` (read live). Controls:
three KPI cards link to status filters, the shared filter, the numbered pager,
each row opens `/admin/bookings/[bookingId]` where Session A's
`cancelBookingAsAdmin` (validation, `refund_and_cancel_booking`, the wallet
credit, the `booking_refunds` row) is unchanged; the restaurant tables link
and `getReservationWaitingCount` are kept. "Checked in" has no status in
`booking_status`, so the card is "In stay now": CONFIRMED with today inside
the dates, and the handbook says so. No broken link; zero bookings exist, so
nothing on the cancel path was exercised.

**Payments** (`/admin/payments`): chain. Query `getPaymentsDesk`
(`lib/admin/reads/payments.ts`): every `transactions` row (booking checkouts)
and every `wallet_entries` row of kind `deposit` (top-ups), each checked
against an exact count. "Initialised" and "abandoned" are not statuses in the
schema: both are PENDING, split at 24 hours, and the desk says "Started" and
"Abandoned" with that definition in the handbook. "Channel" is recorded only
on top-ups (`metadata.channel`); checkouts show "checkout, unrecorded"
rather than a guessed channel. Kept unchanged: `getPaymentHealth`,
`SweepHolds` (`expireStaleWithdrawalHolds`), `LookupPanel` with
`getSavedMethods`, `getTermsStanding` and the removal actions.

**Designed empty states.** Every empty panel on the five desks now keeps its
frame (a chart's grid, axis labels and legend through admin-shell's shared
`EmptyChart`; a table's head; a donut's track and its named categories at
zero; the ranked bars' five empty tracks) and shows the shared `CalmNote`
(glow identity section 7): what fills the panel, what creates that data, and
a link to where it is made (Supply by role to the verification queue, growth
to agent applications, areas and property types to listing review, the
ledger and the flow chart to payments, stays to listing review, refunds to
bookings). Over a ghosted frame the note takes a solid ground so the frame's
words do not read through it (seen on the first round two proof and fixed).
A read that failed draws the same note as an error.

**Glow identity (d01a5d7).** Panels take `--nf-admin-panel-edges` (per-side
lit edge) and the shell's lit fill. Selected KPI cards and pipeline stages
take section 3's anatomy: cyan-lit edges, a 1px ring of the lit cyan, the fill
lifted under the rim, the 14px and 30px bloom; ~~paper twin: brand edge and
ring, pale lift, soft shadow.~~ (Light mode removed by the founder on 23 September; dark only.) The current pager page and pressed toggles take
the lit primary edge. The escrow Release and Refund controls are
admin-shell's `EscrowRuling`; they are rounded rectangles (sweep below) and
are deliberately equal glass controls, because drawing one direction as the
lit primary would press an operator towards it; the committing button is the
second step. Request to admin-shell below.

**Charts.** The growth chart's end labels are spread to a 14 unit minimum
gap (`spreadLabels`), so Hosts and Firms no longer collide. Past the fifth
ramp step every donut slice is the fifth step hatched, at alternating angles,
with its word, share and count; the sixth property type is now distinct.
Status bars carry the word on every segment of 7% or more, the count on
narrower ones, and a key naming all segments with counts. Axis ticks no
longer collide at the right edge.

**Requests to admin-shell.**
1. `EscrowRuling` (`_components/MoneyDecisions.tsx`): make the second-step
   committing button the lit primary and keep the two direction choices as
   equal glass rounded rectangles. Done by admin-shell in `66c2ecf5`.

### 8.10 Coverage and the lead's rulings

**Every money path.** Wallet top-up (`wallet_entries` deposit: money flow,
ledger, payments attempts), withdrawal (`wallet_entries` withdrawal and its
hold: ledger, `SweepHolds` on payments), booking checkout (`transactions`:
payments, bookings, failed charges on money), booking refund
(`booking_refunds`: money refunds panel, bookings "Refunded", Session A's
`cancelBookingAsAdmin`), escrow in every state including `CANCELLED`
(pipeline, table, activity) and every purpose including `agency_fee` (the
by-purpose donut and the handbook section 9), the admin ruling (Session A's
`escrow_admin_resolve` through admin-shell's `EscrowRuling`, both parties
notified, read with SQL), reconciliation (`wallet.reconciliation.run` in
`audit_log`: ring on money, check on escrow), tenancy charges
(`rent_payments`, riding a `bookings` row: the money desk's "Tenancy charges"
panel, exact counts by state from the booking's status and whether a
SUCCESSFUL transaction settled it, paid and awaited sums in kobo, the six
newest; `getRentCharges` in `lib/admin/reads/money.ts` under
`rent_payments_admin_select`, read live, tested in `money-rent.test.ts` and
`money-derive.test.ts`). No money path is left off the console. Run two of the closing audit added dispute evidence, the float's daily booking and firm rosters (8.11).

**Every supply role.** Owner, agent, firm and host, from the application's
`supply_role` with a fallback to the agent type; businesses count as firms
when they are agencies and as hosts otherwise; example rows left out unless
the toggle asks for them, and the count left out is printed.

**Rulings.**

| Ruling | Where it stands |
|---|---|
| R-A type at the render's measured size, floor 11px | per desk, 8.2; smallest built text 12px |
| R-B controls at the render's height, floor 44px | pager, toggles, chips 44px; the render's 39px pager raised to the floor |
| R-C containers at the render's width | grid fractions and column shares from the render; absolute widths follow the 1440 grid, 8.2 |
| R-D sweep zero means under 0.35 | 0.32 highest, 8.6 |
| R-E entering the console lands on the overview | admin-shell's; no money desk redirects |
| R-F real function drawn compactly | the supply examples toggle, the payments outcome and kind toggles, the reference line under ledger rows |
| R-G harnesses committed | `apps/web/src/app/(dev)/preview/session-b/admin-money/` |

**Round three (coordinator, 23 September).** Tenancy charges added as above.
The money proofs (`money-{full,live}-{1440,390}-dark.jpg`,
`side-by-side-money.jpg`) were reshot after it; the shape sweep over both
money routes at 390 and 1536 in both themes is still 0 breaches and 0 worth
an eye; page width at 390 is 390. `vitest run src/lib/admin/reads`: 11 files,
75 tests passed; `tsc` and `eslint` clean; `next build` exit 0. The shared
panel corner and glow stay with admin-shell, which is reconciling them
against the renders; nothing here overrides them. `EscrowRuling` lives in
`app/admin/_components/MoneyDecisions.tsx`, admin-shell's; admin-shell made
its second step the lit primary in `66c2ecf5`. After rebasing onto that
commit every desk proof and side-by-side was reshot again; the cards now
measure 10px on all five desks (`.nf-md-card` inherits `--nf-admin-radius`
instead of pinning its own corner), the independent sweep reads 40
combinations, 1,200 controls, highest ratio 0.32, and the official sweep over
all ten routes is 0 breaches and 0 worth an eye.

### 8.11 Closing audit, run two: evidence, the float's daily booking, firm rosters

The audit found three tables no desk showed. Each is now read select-only
through `requireAdmin()` and the RLS client, tested, drawn with a designed
empty state, and in the handbook. Live counts read with SQL on 23 September:
`escrow_evidence` 0, `escrow_float_snapshots` 1, `firm_members` 0.

| Table | Where it is drawn | Read and policy | Test | Empty state |
|---|---|---|---|---|
| `escrow_evidence` | On every ruling: Escrow's "Waiting on a ruling" and Money's "Disputed holds", above `EscrowRuling`: side (Payer or Payee, in words and by the stripe), who, the fact in words with its date or amount, or the file with name, caption, type, size and "Open file", and when | `getDisputeEvidence()` (`lib/admin/reads/escrow.ts`): `escrow_evidence_select_admin`, `escrows_select_admin`, `profiles_select_admin`; files signed for ten minutes under the bucket policy `escrow_evidence_objects_admin_read` (read live). No in-console document viewer exists, so a file opens in the browser's own | `escrow-evidence.test.ts`: side placement, order, names, signing, an unsigned file kept, no write | "Nothing has been filed on this dispute"; a failed read is "The evidence could not be read", never "nothing filed" |
| `escrow_float_snapshots` | Escrow, "Float, booked daily": escrow float and ledger float as two lines, hover readout with the difference, and the invariant (`difference_minor`, zero is Balanced) with days balanced and the last day that was not | `getEscrowFloatHistory()`: every row against an exact count, `escrow_float_snapshots_select_admin` | `escrow-evidence.test.ts`: ordering, unbalanced days, exact count | One day booked so far (the real 23 September row): no line, the verdict printed, Balanced |
| `firm_members` | Supply, "Firm rosters": counts Pending, Active, Revoked on a status bar with words, then each firm's roster under its name | `getFirmRosters()` (`lib/admin/reads/supply.ts`): every row against an exact count, `firm_members_staff_all` used for select only; firm names from `businesses`, agents from `agents`; example firms left out unless asked | `supply-firms.test.ts`: counts by state, grouping, order, examples | Bar at zero, table head, "No firm has a roster yet" and how a member is admitted |

Neither `escrow_evidence` nor `escrow_float_snapshots` is in the generated
types yet; each read goes through one narrow untyped door with the columns
checked against the live table, and the mappers treat every field as unknown.

The rail and the flat panels are admin-shell's and were not touched.

### 8.12 Closing audit run three, and the founder's items 2 and 7

- Every proof and side-by-side reshot on main after admin-shell's
  `949930e2` (full-height rail, sampled panel material) by the committed
  script `scripts/design/session-b-shots/admin-money.mjs`, from the
  committed harness (`0da05f2f`).
- Item 2: Light mode removed by the founder on 23 September; dark only. The "on paper" block in `desk.css` and
  the light-twin note in `charts.tsx` are removed; no component in these
  desks branches on theme. The 20 `*-light.jpg` proofs are deleted and the
  shot script shoots dark only. Earlier sweep figures quoted "both themes";
  from here the sweep is dark only.
- Item 7: the two evidence facts that said "viewing" now say "The inspection
  happened" and "The inspection did not happen". The enum values
  (`viewing_attended`, `viewing_missed`) are the schema's and unchanged. The
  console copy is English only; no other "viewing" appears in these desks.

### 8.13 Final pass, 23 September

**Re-checked.** Each governing panel (`C1D98B3C` panel 3, `8E9602E2` panels
1 and 3) beside the latest side-by-side, reshot on main after admin-shell's
`949930e2`: the rail runs full height, cards take the shell's 10px corner and
3px halo, and per-desk type is at the converted sizes in 8.2. Every read's
code path is exercised by unit tests over the real functions against a fake
RLS client (no write is ever attempted); each desk renders in a production
build through the committed harness; read-only SQL on the live project gave
the counts the empty states mirror.

**Commands and output (dark only).**

```
npx vitest run src/lib/admin/reads          Test Files 15 passed, Tests 96 passed
tsc --noEmit (6 GB heap)                    no output (clean)
eslint app/admin/{money,escrow,supply,bookings} lib/admin/reads harness   clean
node scripts/check-css-tokens.mjs           clean, 0 layer-1 references
next build (6 GB heap; a first run was OOM-killed, 137)   exit 0
compare-surface --shape-sweep, 10 routes, 390 and 1536, dark
  BREACHES 0, WORTH AN EYE 0, ROUND ICON-ONLY 0, ROUTES REFUSED 0
```

**Fixed in this pass.** The badge (below). Nothing close-but-not-right was
left from the side-by-sides after 8.12.

**The badge: BLOCKED ON B-BADGE.** The tier is read, never derived:
`getBadgeTiers` (`lib/admin/reads/badges.ts`, tested in `badges.test.ts`)
reads `public.person_badge` for exactly the people a page names, through the
admin's RLS client; a failed read returns no tiers (a missing badge is
recoverable, a wrong one is not). Grants read live: `authenticated` holds
SELECT on the view and EXECUTE on its helpers. The slot, `BadgeSlot`
(`app/admin/money/_desk/BadgeSlot.tsx`), sits beside 9 of the 14 places these
desks draw a person's name: Money's wallets list, ledger owner, tenancy charge
tenant and evidence authors; Escrow's table payer and payee, ruling card payer
and payee, and evidence authors; Supply's role table and firm roster members;
Bookings' guest. It renders NOTHING: Session A's component
(`components/app/badge/PersonBadge.tsx`) had not landed, and drawing our own
artwork is ruled out. When it lands, that one file returns it. The other 5
places read Session A's `lib/admin/money-queries.ts`, which returns names
without user ids (Money's disputed holds payer and payee, Money's recent
entries and refunds guest, Payments' wallets and stale holds): they need a
user id added there, which is Session A's file.

**English-only copy.** Not moved into the dictionaries in this pass. The
money, escrow, supply and payments desks' copy is still English in the
components (bookings reads `t.admin.bookings`). Recorded as not done.

**BUILT AND UNPROVEN.** This box cannot reach Supabase over HTTP, so no
signed-in run is possible.
- Every desk page as a signed-in admin: proving it needs one admin session on
  a machine with egress, opening each of the five routes.
- The escrow ruling with its evidence (zero disputes exist): needs one
  disputed test escrow with a filed fact and a file, then a ruling.
- "Open file" on evidence: needs a filed file and a signed-in admin (the
  bucket policy is read live; the signing is unit-tested only).
- The admin booking cancel from a stay (zero bookings exist).
- Tenancy charges, float history beyond one day, firm rosters with members:
  proven on fixtures and unit tests only; the live tables hold 0, 1 and 0 rows.
- The badge tier read: unit-tested; live grants read; no signed-in read.

**Percentage.** Close-gate items met: 5 of 5 (measured match and
side-by-sides; chain; no claims; checks, dark only; pushed). Chain links
proven live: read-only SQL proves policies and counts for the tables all 5 desks read,
but signed-in runs 0 of 5 desks, so **chain links proven end to end:
0 / 5**. Controls exercised in a production build through the harness: 5 / 5
desks rendered, every filter link, pager, toggle and hover readout drawn; the
two writes (escrow ruling, booking cancel) 0 / 2 exercised. Badge: 9 / 14
name places wired, 0 / 14 drawing (blocked on B-BADGE). Copy in the
dictionaries: 1 / 5 desks.

### 8.14 The four desks' copy moves onto the locale layer (founder directive, 23 September)

Supersedes "English-only copy" in 8.13. Money, Escrow, Supply and Payments,
and the furniture they share in `money/_desk`, now read their words through
`getDictionary(locale)` like the rest of the console. **Copy in the
dictionaries: 5 / 5 desks** (bookings already did).

**Where the words went.** Where an existing key said the same thing it is
reused. Where none existed the key was added to `packages/i18n/src/locales/en.ts`
ONLY, as new desk blocks inside the existing `admin` namespace (`admin.money`,
`admin.escrow`, `admin.supply`, `admin.payments`), the same `admin.<desk>`
pattern `admin.bookings` already uses. Nothing was restructured and no other
locale file was touched: Yoruba, Hausa and Igbo fall back to these English
strings through `withFallback`, exactly as for any key they have not declared,
and no Yoruba, Hausa or Igbo word was written. Counted strings use the
existing `plural()` with `{ one, other }` forms (the `settings.devices`
pattern) instead of `n === 1` ternaries, so a speaker can write the forms
their language has. Placeholders are filled with the console's `fill`.
Money is still formatted only by `formatMoney`, unchanged; the four literal
`"₦0"` axis labels now come from `formatMoney(0, locale)`, which returns the
same `₦0`.

**Counts.** "Moved" is distinct visible strings (aria labels, captions,
placeholders and `data-label`s included; a plural pair is one string; a string
drawn in several places is counted once).

| Desk | Moved | Existing keys reused | English keys added (leaves) | Left hardcoded | Denominator |
|---|---|---|---|---|---|
| Shared furniture (`money/_desk`: pager, KPI, delta, charts, reconciliation, dispute evidence) | 66 | 1 | 65 | 0 | 66 / 66 |
| Money | 109 | 4 | 109 | 17 | 109 / 126 |
| Escrow | 101 | 3 | 101 | 18 | 101 / 119 |
| Supply | 100 | 9 | 95 | 2 | 100 / 102 |
| Payments | 138 | 5 | 141 | 4 | 138 / 142 |
| **Total** | **514** | **22** | **511** | | |

Leaves exceed distinct strings where a plural carries two forms (19 pairs).

**Keys reused (22).** `shell.nav.money`, `shell.nav.escrow` (twice: the
title and the link in Money's disputes paragraph), `shell.nav.supply`,
`shell.nav.payments`; `shell.operations.vsWeekAgo`, `shell.overview.vsLastWeek`,
`shell.operations.healthy` (the reconciliation verdict); `shell.overview.owner`,
`.agent`, `.firm` (supply roles, singular) and `shell.overview.kinds.land`,
`.hotels`, `.shortlets`, `.restaurants` (property types);
`common.status.CANCELLED` (tenancy charges and escrow);
`common.searchPlaceholders.escrow`; `common.noMatchTitle`; `common.notNow`;
`common.columns.transactionStatus.FAILED` and `.REFUNDED` (payment outcomes).
Near misses NOT reused because the English differs or the sense does: the
bookings desk's cancellation reasons ("The host cancelled" against the
refund row's "The agent cancelled"), and `columns.walletEntryStatus.COMPLETED`
("Settled" as a status is not "Settled" as a balance heading).

**Left hardcoded, with reasons.**
- All four desks: the static `metadata.title` in each `page.tsx` (4) and the
  `QueueSkeleton` label in each `loading.tsx` (4). Every console route does
  both this way; moving them means `generateMetadata` and an awaited locale on
  the loading path across the console, which is admin-shell's convention to
  change, not one desk's.
- Money and Escrow: `EscrowRuling` in `app/admin/_components/MoneyDecisions.tsx`
  (11 strings: placeholder, prompt, both direction buttons, both consequence
  lines, the warning, the confirm verb pair, "to", Cancel). A shared
  `_components` file, admin-shell's; counted against both desks.
- Money: the four refund reason labels come from `CANCELLATION_REASONS` in
  `lib/trust/cancellation.ts` (Session A's file).
- Escrow: the `ES-` short id prefix (an identifier format), and the four
  countdown formats (`due`, `{d}d {h}h`, `{h}h {m}m`, `{m}m`) built by
  `countdown()` in `lib/admin/reads/money-derive.ts`, a pure read helper with
  its own tests; moving them changes a read's return shape, so it is a
  separate change.
- Payments: `channelLabel()`'s two fallbacks ("checkout, unrecorded",
  "top-up, unrecorded") in `lib/admin/reads/payments.ts`, same reason.
- Not copy, not counted: the `·` separators, `%`, the `????` shown for a
  missing card tail, and the acceptance date printed as ISO `yyyy-mm-dd`.
- Now dead, left for its owner: `ESCROW_STATE_WORDS` in
  `components/app/untranslated.ts` (Session A's staging file). Its words now
  live at `admin.escrow.state`, the destination the block itself names; the
  escrow desk was its only reader.
- The bookings desk also draws the shared furniture and passes no locale, so
  its pager and KPI words stay English there; bookings was not in this
  directive.

**Same English, proven.** Production build with `VALLO_PREVIEW_HARNESS=1`,
under the lock, before (origin/main `b6f41ceb` plus the unused English keys)
and after; the committed harness `(dev)/preview/session-b/admin-money/{money,escrow,supply,payments}`
in both fixture states, and the two older harnesses that draw the refund panel
and the payment-method lookup (`preview/bd/refunds`, `preview/bd/payments`),
each at 1440 and 390, dark: 20 page states. For each: a full-page PNG and a
dump of `innerText`, raw `textContent`, and every `aria-label`, `title`,
`placeholder`, `data-label`, `id` and `aria-labelledby` inside the console.
- Text: **20 / 20 dumps byte-identical**.
- Pixels: two baseline runs differ only in rows 42 to 52 at 1440 (the frame's
  top bar); outside that band 13 single-line clusters differ, 33 to 442
  pixels each, max channel delta 36 to 60, every one inside a line where
  adjacent text nodes became one (for example `{amount}` and ` kept`), which
  moves glyph anti-aliasing by a sub-pixel. Viewed at 3x before over after:
  no visible change.
- Not covered by a harness: the payments page's own health panel, overdrawn
  and stuck tables and the sweep control (no harness draws them); proven by
  the whole typecheck and by reading, not by a shot.
- One English difference is possible and not reached by the fixtures: a count
  of 1,000 or more in a pluralised phrase now prints grouped ("1,234
  charges"), because `plural()` formats through `Intl`.

**Checks.** Listed in the commit's gate below (whole tsc, whole vitest,
`check-css-tokens`, a `page.tsx` at the root of every harness directory).

## 9. Inspection

Governing image `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` (catalogue: "Checklist
progress bar and disabled-until-complete submit are the patterns to keep"), plus the
founder folder (`GOVERNING-thread-rental-enquiry.jpg` for the thread that Add Photos
opens, `home-light-black-icon-plates-as-shipped.jpg` for what light mode must not do).
Routes: `/inspections` (both sides of every inspection the reader is party to) and
`/agent/inspections` (the lister's side inside the agent console), both drawing
`components/app/inspections/InspectionSheet.tsx` from `app/css/inspection.css`
(classes `nf-ix-*`; the old `nf-insp-*` rules in `threads.css` no longer reach it,
scope request I4).

**Who the screen is for.** The render shows an inspection being carried out with the
assigned agent named, so it reads as the inspector's view. In the data model either
party may move a CONFIRMED inspection to COMPLETED (`private.guard_inspection_transition`
allows `COMPLETED` from `CONFIRMED` for requester or lister), so the same sheet serves
both: the requester sees "Listed by" and the lister's number, the lister sees
"Requested by" and the requester's, and the controls follow whose move it is.

**It is an inspection, not a viewing (founder's item 7, 23 September).** Every
"viewing" in this surface's copy now says inspection: the checklist rows read
"Inspection requested" and "Inspection happened", the empty notes well "No notes on this
inspection yet.", the Add Photos accessible name "in the conversation about this
inspection", the agent page's empty state "Nobody has asked to inspect a property yet"
and "every request to inspect one of your properties", the example refusal in
`lib/inspections/actions.ts` "there is nothing to inspect", and in all four locales
`inspectionsPage.lede` ("Every inspection you asked for or were asked to host") and
`inspectionsPage.emptyBody` ("Request an inspection from a property's page"). Comments and
test names in these files were swept the same way.

### (a) The chain

| Link | What is there | State |
|---|---|---|
| Controls | Confirm, Offer another time, Decline (lister, REQUESTED/PROPOSED); Take that time, Withdraw (requester); outcome radio group and Submit Inspection Report (either, CONFIRMED); Add Photos (link to the thread) | wired |
| Server actions | `lib/inspections/actions.ts`: `answerInspection`, `acceptProposedTime`, `closeInspection` (COMPLETED with `outcome`, or WITHDRAWN), `requestInspection` | wired, unchanged |
| Validation | zod in each action (uuid, state enum, future time within 90 days, note max 400, outcome only with COMPLETED) | wired |
| RLS | `inspection_requests_select_party`, `_update_party` (requester_id or lister_id = auth.uid()), `_insert_requester` (published listing, not own), admin all. Read live 22 Sept | verified by SQL |
| Table | `public.inspection_requests` (state, requested_at, slot_at, note, lister_note, outcome, conversation_id) | verified by SQL |
| Triggers | `guard_transition` (who may move what), `freeze_parties`, `set_lister`, `never_against_a_demo_listing`, `set_updated_at`, `notify` | verified by SQL |
| Notification | `private.notify_inspection_change`: INSERT tells the lister; CONFIRMED, PROPOSED, DECLINED tell the requester; WITHDRAWN tells the lister; COMPLETED tells both. Links `/inspections` and `/agent/inspections` | verified by reading the function |
| Query | `lib/inspections/queries.ts` `readInspectionsForRequester` / `ForLister` under the caller's RLS; names from `social_profiles`; numbers through `lib/security/counterpart-contact.ts`; listing facts (place, kind, price through `formatMoney`, cover photo, `is_demo`) from `app/(app)/inspections/facts.ts` | wired |
| Screen, own action | `router.refresh()` after every successful action plus `revalidatePath` in the action | wired |
| Screen, the other side's action | `InspectionsLive`: subscribes to the reader's own `notifications` INSERTs (the table IS in `supabase_realtime`; `inspection_requests` is NOT, checked by SQL) and re-reads when the href is an inspection link; also re-reads on tab return | wired; publication of the table itself is request I2 |
| Checklist rows, report notes, report photos | no table, column or bucket in production | BROKEN, not drawn: request I1 (exact migration written) |
| Add Photos | goes to `/messages/<id>?attach=1`, the one real photo path an inspection has (message-attachments bucket) | works; the thread ignores `?attach=1`, request I3 |

Nothing in this chain was written to production. The live write path (a real party
completing a real inspection) was not exercised: there is no test user I may create and
every listing is `is_demo`, so the demo trigger refuses any new inspection. The wiring is
proven by code, the SQL introspection above and the unit tests
(`components/app/inspections/status.test.ts`, `ladder.test.ts`, `grouping.test.ts`,
`lib/inspections/*.test.ts`, 33 passing).

### (b) The comparison, 390 dark (round four, after the second closing audit)

Scale: phone screen 668 render px (inner edge 177 to 845), so 1 CSS px at 390 = 0.584
render px; "strict" means render px x 0.584. Rulings applied (ledger section 0):
**R-A** every text role at the render's measured size, raised only to the 11px floor
where it would be unreadable, no uniform factor; **R-B** a pressed control at the
render's height or 44px, whichever is larger, everything around it at the render's
proportions; **R-C** containers at the render's width (342 against 360: the 24px shell
gutter, below); **R-D** no text-bearing control at or above 0.35; **R-F** the outcome
choice kept, drawn as one row of three; **R-G** the harness is committed at
`apps/web/src/app/(dev)/preview/session-b/inspection/page.tsx`. Built numbers are
`getBoundingClientRect` and computed style at 390 x 844 on that harness and on its
in-shell twin, `apps/web/src/app/(dev)/preview/session-b/inspection/shell/page.tsx`
(the same fixture inside the real `AppShell` with the same server facts
`app/(app)/layout.tsx` passes; committed, R-G). Side by side at matched scale:
`docs/design/proofs/session-b/inspection/inspection-render-vs-built-390-dark.jpg`.

**Overall: title top to Submit bottom, render 1132 render px = 661 CSS; built 688, 1.04
times.** Inside the app shell at 390 x 844, Add Photos ends at y 784 and Submit at 836:
both on the first screen (the harness's shell is the signed-out header; a signed-in
dock would cover the foot of Submit, not Add Photos).

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Page gutter | 28 render = 16 CSS | 24 (the app shell's padding on every consumer page) | no, by decision: the shell's 24px is the platform standard, not this surface's to change; containers are 342 against 360 for that reason |
| Back button | glass rounded square in the header row | 44 x 44 glass square on its own row | shape yes; the render's header row is shared chrome |
| Title size | cap 28 render = 16.4 strict, 23px, bold | 23px / 700, h 26 | yes |
| Title colour | "Property" letter cores #eef0f7; "Inspection" lit cyan, running left to right #b2e9f7, #6ad4f7, #2cb1f6, #22a8f7 (four bands, cores with a channel over 200) | "Property" `--nf-content-primary`; "Inspection" a left-to-right gradient from the cyan rung (`--nf-state-warning`, #00c8ff) mixed 35% into white, through 65%, to cyan leaning into the lit blue | yes (tokens, so within a few steps of the sampled hexes, not on them) |
| Sub line | about 10.5px strict, blue #47d0f6 peak, 2 lines | 11px / 400 (floor), 2 lines, h 30, brand quiet | yes |
| Glass house | object 153 render = 89 CSS, foot over the card edge | the render's own crop, box 100 x 75, foot over the card edge, above it | yes (crop, soft at 3x, SOURCES.md) |
| Listing card | 616 x 142 render = 360 x 83 | 342 x 94 | yes (1.13 in height) |
| Container radius (card, info row, panels) | 16 render on the 142 card (0.11) | the 10px rung (`--nf-radius-sm`, the console's container rung) on 94 (0.106) | yes. Correction: the earlier reason given here ("14 is the smallest container radius that is not a control's") was wrong; 10 exists, is the console's container rung, and matches the render's ratio |
| Card photo | 180 x 129 = 105 x 75, radius 10 render (0.08) | 104 x 84, radius 10 (0.12) | yes |
| Scheduled / Pending badge | 91 x 24 render = 53 x 14, corner 8 render (0.33) | 18 tall, 11px / 600, corner 6 (0.33), emerald / cyan tokens | yes; 18 not 14 because 11px text needs it; hue emerald (render teal is off-family) |
| Card title | about 11.7px strict, semibold | 12px / 600, one line | yes |
| Place and kind lines | about 9px strict | 11px / 400 (floor), 12px glyphs | yes |
| Price | about 11.4px strict, bold brand blue; "/ year" | 12px / 700 via `formatMoney`; "per year" 11px (the product's `PERIOD_SUFFIX`) | yes |
| Info row | 616 x 88 = 360 x 51, three cells side by side, glyph left of text | 342 x 73, three cells side by side, glyph left of text | 1.43: the number is visible under the name and wraps to a second line (R-C) |
| Info label / value / second line | about 7 / 9 / 7px strict | 11 / 11 / 11px (floor), value 600 | yes |
| Phone | the number, 7px strict, visible under the name | the grouped number, visible under the name, 11px / 500 link colour, itself the tel: link with a 44px target (padding and negative margin), wrapping between groups where the cell is narrow (R-C) | yes |
| Checklist panel | 616 x 506 (8 rows) = 360 x 296 | 342 x 181 (4 rows, request I1) | per row, below |
| Checklist head | title about 11px strict, count about 8px, bar 72 x 3.5 under the count | 11px / 600, 11px, bar 4px under the count | yes |
| Checklist row | 54 render = 31.5 CSS, corner 12 (0.22), 1 to 2 render apart | 32, the 6px rung (0.19), 2 apart | yes |
| Row plate | a lit round disc 47 to 48 render across (27.5 CSS, 0.89 of the row); sampled down the Exterior disc: lit top rim #003e98, navy body #00236b, light pooling at the foot #003da9 to #0060b0, cyan line glyph #47e9ff | 28px disc (0.875 of the row): the identity's lit tile, round (hot rim, navy body, lit pool at the foot, 8px outer glow) through `--nf-glow-ink` and `--nf-state-warning`, with the stroked glyph (house, shield, bed, document) at 16px in cyan with a 3px glow| yes. The earlier 24px keyed crops came out dim and are withdrawn |
| Check circle | 20 of 54 (0.37) | 14 of 32 (0.44), done: emerald fill and a drawn tick | yes |
| Row title / sub | about 7.8 / 6.5px strict | 11 / 11px (floor), 600 / 400 | yes |
| Notes panel | 616 x 88 = 360 x 51; well 45 render tall, corner 8 render (0.18) | 342 x 53; well 22 tall, the 6px rung (0.27); label 11px / 600, text 11px | yes (1.04) |
| Outcome choice | not drawn | one row of three at 44 (R-B), corner 10 (0.23), "Inspected", "Deal done", "No deal", each with its full meaning as its accessible name; panel 79 tall | added by ruling R-F |
| Add Photos | 56 render = 33 CSS, corner 14 render (0.25), gradient #016bfb / #0039fd / #0472f8 | 44 (floor), corner 14 (0.32), 11px / 650 label, identity lit button over the token gradient (#0074fc / #0042fd / #0069f7) | yes |
| Submit | 50 render = 29 CSS, fill #001e62, edge #003ab1, muted label | 44 (floor), brand-tint glass, brand edge, label brand quiet at 55% while disabled, 11px / 650 | yes |
| Block spacing | 13 to 16 render = 8 to 9 CSS | 8 | yes |
| Glass fill, rim, glow | #000f49 on #01071e with lit bands, top rim #2cabf6, soft bloom | the glow identity's lit card through `--nf-glow-ink` and `--nf-state-warning` | yes |
| Colours | electric blue, quiet blue, emerald, cyan | the same four token families; rose only for Declined | yes |

Shape ratios, built: badges 0.33, outcome options 0.23, Add Photos 0.32, Submit 0.32.

Added over the render, because the data model needs it: the outcome chooser ("How did
it go?", one row of three options, R-F) before Submit, and a hint line under Submit saying why it is
disabled. Refused from the render: see below.

### Refused from the render

- **"Assigned Agent".** Nobody is assigned on this platform: the other party is whoever
  lists the property, owner or agent. The cell says "Listed by" (requester side) or
  "Requested by" (lister side).
- **The eight room rows with 0 / 8** (Exterior to Overall Condition). A tick nothing
  stores would be a picture of a feature; the panel counts the four things the row can
  prove. Request I1 carries the migration; whether a room checklist should exist is the
  founder's product decision.
- **The notes textarea and Add Photos as part of a report.** No column or bucket holds
  them (I1). The notes shown are the two on the record, read-only; Add Photos opens the
  conversation, where photos are real.
- **Every figure in the render** (the address, "2 Bedroom Apartment", 2,500,000 per year,
  Jun 24 2025 10:00 AM, Tunde Adebayo, +234 801 234 5678). All of them come from the
  row, the listing and the counterpart read; nothing is typed in.
- **The teal fill of the Scheduled badge.** Off the blue family; drawn in the emerald
  token.
- **The app icon tile, VALLO wordmark, bell and profile.** Shared app header, not this
  page; not cropped, not rebuilt.

Examples: a listing with `is_demo` shows an "Example listing" badge beside its state
badge on the card (read from `listings.is_demo` in `facts.ts`), so an example can never
pass as a property somebody is going to see. The trigger already refuses a new
inspection against one.

**Glow identity.** `docs/design/GLOW_IDENTITY.md` (d01a5d7) is applied in
`inspection.css` with surface classes: lit card, progress on/off, lit button, and
their paper answers. Its values are raw colours and a stylesheet may not carry one
(`check-css-tokens.mjs` rule 3), so each is expressed as a `color-mix` of
`--nf-glow-ink` (the identity's lit ink), `--nf-state-warning` (its cyan) and
`black`/`white`; the hues land within a few steps of the identity's hexes, not on
them. Where F6A8A482 differs the render wins and is noted: container radius 14
(identity 12); the icon slot is the render's own round cropped plate, not the
identity's square 64px tile; the selected-card treatment is not used because this
screen has no selectable card (the outcome options use it only as a checked border).

### (c) Light mode

~~Light mode rows and proofs.~~ Light mode removed by the founder on 23 September; dark
only. The paper twin in `inspection.css`, the daylight cut of the glass house
(`house-check-day.webp`) and the two light proofs are deleted; the surface draws dark only.

### Desktop

Derived from the phone: the same column held at 42rem by the page, the title at 32px, the
house at 136px, the info cells side by side (glyph left of text, as the render draws it),
the four checklist rows in two columns, the outcome options in three. Proof:
`inspection-1280-dark.jpg`.

### (d) Shape sweep

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3178 --shape-sweep --routes /preview/session-b/inspection,/preview/session-b/inspection/shell --theme dark`
on the committed harness and its in-shell twin (R-G), final build after the founder's items 2 and 7 (dark only), at
390 and 1536, dark. Verbatim: BREACHES (at or above 0.5) 0; WORTH AN EYE
(0.35 to 0.5) 0; ROUND ICON-ONLY CONTROLS 0; ROUTES REFUSED 0; "COVERED: 2 route(s)
asked for, 0 refusal(s), 1 route/width/theme combination(s) actually measured" (the
tool's own count, quoted as printed). `/inspections` and `/agent/inspections` redirect
to sign-in without a session, so the sweep runs on the harness, which renders the same
components. `check-css-tokens.mjs`: clean.

### (e) Proofs, and what I could not verify

- Every screenshot is FIXTURE-BACKED, from the committed harness
  `apps/web/src/app/(dev)/preview/session-b/inspection/page.tsx` (R-G; run with
  `VALLO_PREVIEW_HARNESS=1`), and the first-screen shot `inspection-390-dark-first-screen-in-shell.jpg` comes from its
  committed in-shell twin
  `.../inspection/shell/page.tsx` (signed-out shell header). Earlier rounds used a throwaway harness route (not committed)
  rendering `InspectionHero` and `InspectionSheet` with the F5 fixture inspection
  (CONFIRMED, requester side) and listing facts. No signed-in production render exists.
- Not verified live: a real party moving a real inspection, the notification arriving,
  and `InspectionsLive` refreshing the other screen. No test user may be created and all
  64 listings are examples, so no inspection can be created.
- The house crop is soft at 3x (0.62 of the pixels needed; the plate crops are withdrawn); numbers in
  `public/brand/session-b/inspection/SOURCES.md`.

### Final pass, 23 September

**Re-checked.** The governing image beside the latest side-by-side
(`inspection-render-vs-built-390-dark.jpg`): anatomy, the lit cyan second word, the lit
round plates, the 10px container corners, the visible number, the one-row outcome and
Add Photos on the first screen all hold; nothing close-but-not-right found in this pass.
The production database, read-only as `supabase_read_only_user` on 23 September:
`public.person_badge` is a view with SELECT for `authenticated` (and EXECUTE on
`is_platform_staff` and `is_checked_person` for `authenticated` and `anon`, so the view
evaluates for a reader; the read-only role itself is refused EXECUTE, so its rows could not
be counted from here); `public.inspection_requests` holds 0 rows; `notifications` is in
`supabase_realtime` and `inspection_requests` is not (request I2).

**The badge (item 2 of the final hour).** The other party's tier is read from
`public.person_badge`, Session A's one source, in `lib/inspections/queries.ts`
(`readBadgeTiers`, both reads), narrowed by `lib/inspections/badge.ts`
(`badgeTierFrom`, tested) and carried on `Inspection.counterpartBadge`. The slot
(`components/app/inspections/BadgeSlot.tsx`) sits beside the name in the sheet's "Listed
by" / "Requested by" cell and beside the requester's name in the agent's rows, and renders
NOTHING: **blocked on B-BADGE**, because Session A's badge component is not on main at the
time of this push. No artwork or colour of our own is drawn.

**Commands and output (this pass, worktree on main after 65edefe1):**
- `npx tsc --noEmit -p .` : exit 0.
- `npx eslint src/components/app/inspections "src/app/(app)/inspections" src/app/agent/inspections src/lib/inspections "src/app/(dev)/preview/session-b/inspection"` : exit 0, no output.
- `node scripts/check-css-tokens.mjs` : "css tokens: clean" (after fixing one comment that
  named the not-yet-written badge component as a path).
- `npx vitest run src/components/app/inspections src/lib/inspections` : "Test Files 6
  passed (6), Tests 35 passed (35)".
- Shape sweep, dark, on the committed harness and its in-shell twin: `compare-surface.mjs --shape-sweep --routes
  /preview/session-b/inspection,/preview/session-b/inspection/shell --theme dark` printed
  BREACHES 0, WORTH AN EYE 0, ROUND ICON-ONLY 0, ROUTES REFUSED 0, but also "COVERED: 2
  route(s) asked for, 0 refusal(s), 0 route/width/theme combination(s) actually measured",
  so on its own that zero proves nothing (the tool changed with the dark-only work and I did
  not debug it). I therefore measured directly on the same production build with a
  throwaway Playwright script: every text-bearing control and badge inside the surface
  (`.nf-ix` buttons, links, radios, badges), both harness pages, at 390 and 1536: 9 controls
  per page, maximum radius-to-short-side 0.33, 0 at or above 0.35. Add Photos ends at y 784
  of 844 inside the shell.

**Fixed in this pass.** The comment path above; nothing visual needed changing.

**BUILT AND UNPROVEN** (this box cannot reach Supabase over HTTP, so no signed-in run is
possible here; each is proven by code, unit tests and read-only SQL only):
1. Every write: Confirm, Offer another time, Decline, Take that time, Withdraw, and Submit
   Inspection Report through `closeInspection` with an outcome. Proving it needs a signed-in
   party on a real (non-example) listing: all 64 listings are examples, so the demo trigger
   refuses any new inspection and 0 exist.
2. The notification each transition fires (`private.notify_inspection_change`), and
   `InspectionsLive` re-reading the other party's screen when it lands. Needs two signed-in
   parties and one real inspection.
3. The badge tier read against live rows (the view evaluates for `authenticated`; the rows
   were not readable from the read-only role). Needs a signed-in read, and Session A's
   component to show anything.
4. The call link and Add Photos landing in the thread (Add Photos cannot open the picker:
   request I3).
Not built, by the founder's rule, until a table exists: the eight-room checklist, report
notes and report photos (request I1).

**Percentage, with its denominator.**
- Close-gate items met: 5 / 5 = 100% (measured match, wired in code with broken links
  named, no claims, checks green, pushed; the third audit passed this surface).
- Chain links verified in code and by read-only SQL: 10 / 12 = 83% (control, action,
  validation, policy, table, trigger, notification function, query, own-screen refresh,
  other-screen refresh wiring). The two not verified: report storage (I1, does not exist)
  and table-level realtime (I2, not published).
- Chain links exercised live: 0 / 12 = 0% (no network path to Supabase from this box, and
  no real listing to inspect).
- Controls exercised live: 0 / 12 = 0% (Confirm, Offer another time, Decline, Take that
  time, Withdraw, Withdraw the request, three outcome choices, Submit, Add Photos, the call
  link). Their pure logic (status, ladder, grouping, badge narrowing) is covered by the 35
  unit tests.

### Round five, 23 September: the eight rooms, I1 live, the shared layer

**The founder's instruction.** "Build the inspection exactly like this, those glows etc
all exactly, fully functional like that, make it work end to end." Target
`docs/design/references/founder/inspection-target.jpg` (the same render as F6A8A482).

**What is built.**
- The **eight-room checklist** exactly as drawn: Exterior, Interior, Kitchen, Bathrooms,
  Utilities, Appliances, Safety, Overall Condition, each with the render's subtitle
  (`lib/inspections/report.ts`, `ROOM_COPY`), the render's own glyph cropped
  (`room-*.webp`, `session-b-crops.mjs`) on the shared `IconPlate` drawn round (the render
  draws round discs; the one local change is the corner), and a round check circle with a
  44px hit area. The count ("n / 8 Completed") and bar read what was saved.
- The **Notes field** is a real textarea (16px type so iOS does not zoom, R-A); it saves on
  blur. The two notes on the request row still show above it.
- **Add Photos** is drawn as the render draws it but, with the report on, disabled with
  "Photos can be added once this is switched on.": recording a photo needs Session A's
  `addReportPhoto` (request I1b). With the report off it opens the conversation.
- **Submit Inspection Report** stays disabled until all eight rooms are ticked, the same
  rule I1's trigger holds; submitting closes the inspection in the database, which fires the
  existing notification to both sides.
- The **lifecycle** (Requested, Time agreed, Inspected, Recorded) stays, as one line of dots
  between the facts and the checklist.
- **"Assigned Agent"**: the data model has no assigned agent (`inspection_requests` holds a
  requester and a lister, nothing else), so the cell keeps the honest "Listed by".
- **The shared layer** (Phase 1 released, 42ea43d9 / 9da8f86f): every container is `Panel`
  (the listing card and facts row as `variant="card"`), the room plates `IconPlate`, Add
  Photos the shared lit primary, Submit the shared glass secondary. `.nf-ix-glass` and its
  pasted identity values are deleted; this surface's stylesheet now lays out only what sits
  inside the primitives. One deliberate local rule, from the render: Submit while disabled
  keeps the blue panel material (#001e62 fill, #003ab1 edge in the render) instead of the
  shared greyed state.

**I1 landed while this was built, and the screen is switched on.** Session A applied
migration `20260923135847` (commits 49be9282, a5afdee7). Read-only SQL on production, 23
September: the three tables with the columns I1 named; RLS on all three (select for a party
or an admin, insert and update for a party, no delete policy or grant anywhere); the
triggers `inspection_reports_set_updated_at` and `inspection_reports_submission`; the bucket
`inspection-photos` private, 10MB, jpeg/png/webp/heic/pdf, with party read, party insert and
admin read policies; `anon` cannot read the reports; 0 reports exist. The screen writes
only through Session A's `saveInspectionReport` (one call for ticks, notes and submit). The flag (`lib/inspections/report-flag.ts`) is ON by default;
`VALLO_INSPECTION_REPORTS=0` turns the report off in one place, and then the rows draw, the
circles cannot be pressed and a plain line says so. A tick is drawn only from what the
action read back from the database.

**Differences from what I1 asked, found against the landed code, and filed:**
- **I1a**: `inspection_reports` has no outcome column, and the parent's outcome can be
  written only on its move to COMPLETED, which the report's trigger makes. So "Inspected /
  Deal done / No deal" cannot be recorded with a report. With the report on, the outcome
  choice is not drawn (drawn and dropped would be worse); with it off, it records through
  the close action as before.
- **I5**: `saveInspectionReport` writes `notes: notes ?? null` on every call, so a tick sent
  without the notes would clear them. The screen sends the current notes with every call;
  pinned in `report-wiring.test.ts`.

**Broke / corrected.** 890acbde added `recordReportPhoto` in
`lib/inspections/report-actions.ts`, an insert into `inspection_report_photos` written by
this surface. That broke the standing rule: Session B never writes a mutation and never
calls one it did not receive from Session A. Corrected in the next commit: the action, its
schema and its tests are deleted, Add Photos uploads and writes nothing, and request I1b asks
Session A for `addReportPhoto({ inspectionId, storagePath, item? })` with the same RLS and
refusal sentences. When it lands, `REPORT_PHOTOS_LIVE` (`lib/inspections/report.ts`) flips and
the button calls it.

**Exercised, as far as this box allows (no HTTP path to Supabase, so no signed-in run):**
`lib/inspections/report-wiring.test.ts` runs Session A's real `saveInspectionReport` over a
recording client: a tick writes the report row and the item with its stamp, an untick clears
the stamp, a submit stamps `submitted_at` in the same call, and the database's eight-tick
refusal and the RLS refusal come back as the screen's sentences. `report.test.ts` pins the
eight rooms, their words, the Submit rule and the read-back.

**BUILT AND UNPROVEN**: a signed-in party ticking, typing and submitting against
production, and the other side's screen refreshing. Every listing is an example, which the
database refuses inspections on, so no real inspection exists to report on.

**Five audit passes, 23 September** (each against `founder/inspection-target.jpg`, production
build under the heavy lock, the committed harness; side-by-sides in
`docs/design/proofs/session-b/inspection/audit-pass-*.jpg`):
- **Pass 1** (after the first build of the eight rooms): the empty progress track was
  invisible; the room glyph sat off-centre inside its plate with a second ring; the Exterior
  subtitle wrapped to two lines where the render keeps one; Submit while waiting went grey
  where the render keeps blue glass; the lifecycle's last label wrapped. Fixed: track in a mid
  blue, glyph fills the round plate, plate 28px and row 32px (the render's), Submit keeps the
  panel material while disabled, the label is "Recorded".
- **Pass 2** (after the correction commit): my own ratio check found the notes field at 0.39
  (14px corner on 36px); Add Photos, disabled while photos wait on I1b, went grey where the
  render draws it lit; the field showed a resize grip the render does not have. Fixed: field
  44px (0.32), no grip; Add Photos keeps the lit material while not pressable, with the line
  under it.
- **Pass 3** (after that rebuild): the whole screen beside the render. Anatomy, lit title,
  card, facts, eight rooms with their words and glyphs, notes, Add Photos, Submit all in
  place. Remaining differences are the recorded ones: type at the readable floor (11px, 16px
  in the field), the facts row's wrapped number, the lifecycle strip, "Listed by".
- **Pass 4** (states): eight ticked (`?rooms=8`): emerald circles with ticks, "8 / 8", Submit
  enabled as the shared glass secondary. Report off (`?rooms=off`): the plain line, circles not
  pressable, the outcome choice and the thread link back. Found: the notes field was darker
  than its panel where the render's is a step lighter. Fixed.
- **Pass 5** (desktop 1280 and the lister's side): the column holds at 42rem, rooms in two
  columns, the house over the card edge; the lister sees "Requested by" and Confirm / Offer
  another time / Decline. Nothing found to fix; desktop type stays at the phone's sizes by
  R-A (noted, not changed).
Shape check after pass 5 (my own measure; the sweep tool's "combinations measured" line is not
proof): 7 text-bearing controls per page, maximum 0.33, none at or above 0.35, at 390 and 1536,
bare and in the shell.

**R18, re-run in a browser, 23 September 15:21 UTC.** Production build of the worktree on
main after 521f91cc (built under the heavy lock), the committed harness
`/preview/session-b/inspection` and its in-shell twin `/preview/session-b/inspection/shell`,
at 390 x 844 and 1440 x 900, arriving from `/home` first so a history entry sits behind the
sheet. The back control is found by its attribute (`.nf-ix-hero [data-nav-back]`, the
e3c90797 fix) on all four; pressing it lands on the route's declared parent by path, not on
the history entry: `/preview/session-b/inspection` goes to `/preview` and
`/preview/session-b/inspection/shell` goes to `/preview/session-b/inspection`, at both
widths, which is what `useBack` does when the previous page cannot be proved to be the
parent. On the real route the declared parent is `/home` (`lib/nav/route-parents.ts`,
`"/inspections": "/home"`) and for the agent's page `/agent/dashboard`; walking the real
`/inspections` needs a signed-in session, which is not yet agreed (no sign-in attempted).
Screenshots of where back lands: `docs/design/proofs/session-b/inspection/r18-back-*.jpg`.
Result: PASS on the harness; the real route BUILT AND UNPROVEN until a QA account exists.

## 10. The welcome email

Owner: Session B worker "email", design and words only. The send is Session
A's and was not touched.

### The chain as it stands

1. **Trigger.** A person confirms their address. Two paths do that, both in
   `apps/web/src/lib/auth/actions.ts` (Session A): the six digit code path
   (`verifyOtp({ type: "signup" })`, then `welcomeOnce(data.user.id)`) and the
   emailed link path (`exchangeCodeForSession` / `verifyOtp({ token_hash })` /
   `setSession`, then `welcomeOnce(confirmed.user.id)`).
2. **Guard.** `apps/web/src/lib/notify/welcome.ts` `welcomeOnce` (Session A):
   refuses unless `auth.users.email_confirmed_at` is set and less than a day
   old; claims the send with a conditional update
   `profiles set welcomed_at = now() where id = $1 and welcomed_at is null
   returning signup_role`, so two confirmations race on the row and exactly one
   wins; releases the stamp if nothing was sent, so a missing Resend key does
   not burn the welcome.
3. **Recipient.** `contactForUser` in `lib/email/recipients.ts`: the auth
   address and `profiles.display_name` as the name.
4. **Template.** `welcome({ name, role })`, now in
   `apps/web/src/lib/email/welcome-message.ts`, re-exported from
   `messages.ts`. The version is picked from `profiles.signup_role`
   (`renter`, `buyer`, `landlord`, `seller`, `agent`, confirmed live as the
   enum's five values) and null gets the general version.
5. **Client.** `sendMessage` in `lib/email/client.ts` (Resend REST, HTML and
   text parts), wrapped in `bestEffortEmail`, which does nothing when
   `RESEND_API_KEY` is absent.
6. **Landing.** The button goes to `/welcome`, the first run screen (Session B
   "welcome" worker, its files untouched here). Signed in: the first run, or on
   to `/home` once it has been seen. Signed out on another device: the same
   slides ending on Sign in. The line under the button says exactly that and
   nothing more.

Live DB, read only: `profiles.welcomed_at`, `profiles.signup_role` and
`profiles.display_name` exist; the enum holds the five roles. No usernames live
on `profiles`; the only handle is `social_profiles.handle` (scope request E1).

Broken links found and fixed in the template: the old landlord and seller
buttons pointed at `/agent/listings/new` and the agent button at
`/agent/apply`. **Neither route exists** (no page, no redirect), so three of
the six versions sent a new lister to a 404. Every link now resolves; the test
file walks `apps/web/src/app` and fails if any allowed route loses its page.

### What changed

- `32687e3`: pure move of `welcome`, `WelcomeData`, `SignupRole` and the one
  helper only it used into `welcome-message.ts`; one re-export line in
  `messages.ts`; no caller changed; the whole email suite green.
- `ac5e07a`: the new design and words, the tests, the proofs.

**Design.** Its own document rather than the shared `compose()`, because the
shell's closed block set cannot draw tiles, numbered plates or a lit button.
Everything comes from `theme.ts` (palette, type stack, 600 max width, 40px
card padding, lockup, sign-off, legal line) and `render.ts` (`escapeHtml`,
`appUrl`, `siteUrl`, `greetingName`, `hello`), so it is the same family as
every other message and it passes every catalogue rule in `shell.test.ts`
(tables only, one style block, ground painted three times, exactly the two
lockup images, hidden inbox line, legal line once, under 40KB: about 21KB).

Top to bottom: the lit rim (the gradient cap rule, solid electric blue for
Outlook) on the navy glass card with its blue rim; the lockup; a small
letter-spaced eyebrow "Welcome to Vallo"; a two line headline, "Hello Ada." in
white and "Make yourself at home." in quiet blue, the email's echo of the first
run's "Two worlds. / One platform."; one sentence on what Vallo is; the two
worlds as glass tiles (Property, Stays) with a lit top edge, side by side at
600 and stacked at 375; the role's opening line; "Where to begin" over a glass
panel of three numbered steps (numbered plate on a rounded rectangle, title,
one or two sentences, a text link underlined as well as coloured); the lit
button "Step inside" to `/welcome`; one quiet line under it; the calm panel
with a small round glyph and the one safety sentence; the small print outside
the card (why you got this, "Change what Vallo emails you", sign-off, legal).

No glass object icons: `shell.test.ts` holds every message to exactly two
images, and a step number in live text survives images off, costs no bytes on
a metered connection and cannot carry words in a picture.

### The copy, every version

Shared by all six (HTML and text): eyebrow "Welcome to Vallo"; headline
"Hello {first name}." / "Make yourself at home."; "Vallo is one account with
two sides to it, and you can flip between them whenever you like."; tiles
"Property: Homes to rent, buy or sell." and "Stays: Hotels, shortlets and
restaurant tables."; section "Where to begin"; button "Step inside";
"Opening this on another device? Sign in there with this same address.";
footer "You are receiving this because you created a Vallo account with this
address." and "Change what Vallo emails you". Subject "Welcome to Vallo,
{first name}", or "Welcome to Vallo" with no usable name.

The plain text of each version, exactly as rendered (proof names used; the
general version is shown with no name to show the fallback):

**Renter.**

```
Subject: Welcome to Vallo, Adaeze

Vallo

Welcome to Vallo
----------------

Hello Adaeze.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking for somewhere to live. Here is where we
would start.

Where to begin
--------------

1. Search where you want to live
   Filter by area and budget. Where a listing states its total move-in
   cost, sort by that rather than the rent, because the rent is rarely
   the whole of what it takes to move in.
   Search homes to rent: https://vallospaces.com/search?market=rent&sort=move-in-asc

2. Ask, then go and see it
   Message the lister from the listing and keep your questions in
   writing. When you are ready, request an inspection and see the place
   in person before any money moves.
   Your inspections: https://vallospaces.com/inspections

3. Keep what you like
   Save homes and searches as you go, so they are waiting for you when
   you come back.
   Your saved homes: https://vallospaces.com/saved

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Buyer.**

```
Subject: Welcome to Vallo, Tunde

Vallo

Welcome to Vallo
----------------

Hello Tunde.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking to buy. Here is where we would start, and
the one thing we would want you to know first.

Where to begin
--------------

1. Search property for sale
   Filter by area and price, and read each listing's title before its
   photographs.
   Browse property for sale: https://vallospaces.com/search?market=buy

2. Read the title first
   Every listing for sale states the title the seller claims, or says
   plainly that none was given. We record the claim and we cannot verify
   it. Have your lawyer search it at the land registry before any money
   moves.
   How Vallo thinks about safety: https://vallospaces.com/safety

3. See it in person
   Message the seller inside Vallo, keep every answer in writing, and
   inspect the property before you commit to anything.
   Your inspections: https://vallospaces.com/inspections

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Landlord.**

```
Subject: Welcome to Vallo, Ngozi

Vallo

Welcome to Vallo
----------------

Hello Ngozi.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to let. Here is how it gets onto Vallo.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Once a person at Vallo has checked your identity, your
   listings carry the verified tick.
   Start verification: https://vallospaces.com/verification

3. Put the whole cost in
   When your listing goes up, state the total a tenant needs to move in,
   not only the rent. Photographs bring people to an inspection; a
   walkthrough video answers the questions before anybody asks them.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Seller.**

```
Subject: Welcome to Vallo, Ibrahim

Vallo

Welcome to Vallo
----------------

Hello Ibrahim.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to sell. Here is how it gets onto Vallo,
starting with the part buyers read first.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. State the title you hold
   Buyers read the title before the price. Name the certificate of
   occupancy, governor's consent or deed you hold, and have the document
   to hand.
   Open the listing form: https://vallospaces.com/agent/list

3. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Once a person at Vallo has checked your identity, your
   listings carry the verified tick.
   Start verification: https://vallospaces.com/verification

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Agent.**

```
Subject: Welcome to Vallo, Chinedu

Vallo

Welcome to Vallo
----------------

Hello Chinedu.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You do this for a living, so here is the short route in.

Where to begin
--------------

1. Register as an agent or a firm
   Tell us who you are, how long you have done this and what you charge,
   with your ID and a selfie if you have them to hand. A person at Vallo
   reads every registration before you can publish.
   Choose agent or firm: https://vallospaces.com/profile/setup

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Once a person at Vallo has checked your identity, your
   listings carry the verified tick.
   Start verification: https://vallospaces.com/verification

3. List, and state the full cost
   Once you are approved, the listing form walks you through a property
   from the photographs to the total a tenant will actually pay to move
   in.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**General (no role declared), no name.**

```
Subject: Welcome to Vallo

Vallo

Welcome to Vallo
----------------

Hello there.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You have not told us what brought you here, and you do not need to. Any
of these is a good place to begin.

Where to begin
--------------

1. Look for a home
   Rent or buy, filtered by area and budget, with the full move-in cost
   shown wherever the lister has stated it.
   Search homes: https://vallospaces.com/search

2. Find somewhere to stay
   Hotels, shortlets and restaurant tables live on the Stays side of the
   same account.
   Open Stays: https://vallospaces.com/stays

3. Have property to let or sell
   Register as an owner, an agent or a firm. A person at Vallo reads
   every registration before listings go up.
   Register your property: https://vallospaces.com/profile/setup

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

### Client compatibility checklist

| Rule | How | Checked by |
|---|---|---|
| Table layout, no flex, grid, float or positioning | every block is a `role="presentation"` table | shell.test, welcome-message.test |
| Inline styles | every colour and size inline beside its background; style block carries nothing load bearing | shell.test (count), stripped proof |
| Bulletproof button | solid `background-color` first, gradient image over it; padding on the anchor; VML `v:roundrect` in `<!--[if mso]>` with the HTML anchor in `<!--[if !mso]><!-->` | welcome-message.test, stripped proof |
| Lit button | gradient, `border-top` in quiet blue plus inset highlight, bloom by `box-shadow` where rendered | welcome-message.test, 600 and 375 proofs |
| Shape law | 14px radius on a 52px button (0.27), plates 10px on 36px, tiles 16px; only the tiny info glyph is round (a shape, not a control) | proofs |
| Outlook conditionals | 600px ghost table for Word, VML button, `o:OfficeDocumentSettings` 96 dpi, `mso-line-height-rule` on fixed-height cells | markup |
| Dark mode | `color-scheme` meta pair, `:root { color-scheme: dark }`, `prefers-color-scheme` re-assertion, `[data-ogsc]` twin for Outlook.com; ground painted on body, outer table `bgcolor` and card | shell.test |
| No web fonts | system stack only | shell.test |
| Alt text | mark alt empty (decorative), wordmark alt "Vallo"; both sized so a blocked image keeps its box | tests, images-off proofs |
| 600px max, fluid, mobile stacking | `max-width:600px;width:100%`; at 480px and below the tiles stack, the button goes full width, the card and step panel tighten | 375 proofs |
| Preheader | hidden span first in the body with spacer entities, per version | tests |
| Plain text | own renderer, same words in the same order, every link printed as "Label: URL" | tests, `*-plain.txt` |
| Escaping | every interpolated value through `escapeHtml`; a name `<b>O'Neil&"Co"` renders as text | test |
| Weight | about 21KB of HTML, under the 40KB budget | tests |

Proofs in `docs/design/proofs/session-b/email/`: `{role}-600.jpg`,
`{role}-375.jpg`, `{role}-600-images-off.jpg`, `{role}-375-images-off.jpg` for
all six, `renter-fallback-600.jpg` (style block, gradients, shadows and radii
stripped: a rough stand in for Outlook's Word engine and Gmail's stripping),
and `{role}-plain.txt`. Rendered in Chromium through Playwright with the
lockup served from `apps/web/public`, dark colour scheme. The email has no
light variant by design (theme.ts: dark in the layer every client honours).

### Inspection, not viewing (founder item 7, 23 September)

Swept all six versions, HTML and plain text, for "viewing". One hit, in the
landlord's third step: "Photographs earn a viewing" is now "Photographs bring
people to an inspection". The test's banned list now carries `viewings?`, and a
dedicated test checks subject, HTML and text of every version. Only the
landlord proofs changed and only they were re-rendered. Nothing else in the
email was touched: it stays dark as designed, whatever the platform's theme.

### Evidence for every statement about how Vallo works

Added after the closing audit (`docs/design/proofs/session-b/CLOSING_AUDIT.md`)
failed two sentences that had no evidence. Both were rewritten to what the code
does; the tests now fail if either returns.

| Statement in the email | Evidence |
|---|---|
| ~~"Agents are checked more closely than owners"~~ (agent step 1, removed) | None found. `ownerRegistrationSchema` and `agentRegistrationSchema` in `lib/supply/registration.ts` ask different questions, but both file the same submitted application to the same admin review; no code checks agents harder. Rewritten to what the agent form asks: "Tell us who you are, how long you have done this and what you charge, with your ID and a selfie if you have them to hand." (fields `experience`, `agencyFeeBps`, `legalFeeBps`, `idPath`, `selfiePath`). |
| ~~"Each step you complete shows on your listings."~~ (verification step, removed) | False as written. The listing tick is `verified: !row.is_demo && verifiedAgents.has(row.agent_id)` in `lib/listings/supabase-repository.ts`, fed by `agent_badges.verified`, which migration `20260919230000_p2_a_verified_agent_means_a_person_was_checked.sql` defines as `verification_tier >= 1`: one passed identity rung. Later rungs light nothing a listing reader sees. Rewritten: "Once a person at Vallo has checked your identity, your listings carry the verified tick." |
| "Identity, then address, then your payout account, then a check in person." | `VERIFICATION_RUNGS = ["identity", "address", "payout", "in_person"]`, `lib/trust/verification.ts`; the tier counts rungs passed with no gap below (`lib/agent/verification-queries.ts`). |
| "A person at Vallo reads every registration before you can publish" / "before listings go up" | `lib/supply/registration-actions.ts` files a submitted row in `agent_applications` and creates no `agents` row; insert on `public.agents` is admin only by policy, and `/agent/list` shows the pitch, not the form, to anybody without one (`app/agent/list/page.tsx`, `context.state === "not-agent"`). |
| "Every listing for sale states the title the seller claims, or says plainly that none was given." | `components/app/listing/ListingTenure.tsx`, rendered on sale listings: the `land_tenure` label, or "No title stated". |
| "Report them from the listing." | `ReportSheet` on `app/(app)/listing/[id]/page.tsx`. |
| "Sort by [total move-in cost]" | `sort=move-in-asc` in `lib/listings/search-params.ts`, read by `/search`. |
| "Save homes and searches" | `/saved` and `/saved/searches`; `lib/saved/searches.ts`. |
| "Request an inspection" | `/inspections` and the listing's inspection request. |

### Refused claims (from the old copy; none of them had evidence)

- "Every listing on Vallo was put up by a real person on Vallo." The live DB
  has 64 published listings, all example rows (`is_demo`), and zero real
  supply. False today.
- "Applications and verification documents are answered within 3 days." A
  schedule promise nobody can stand behind.
- "A verified agent's listings rank above an unverified one ... the only thing
  on this platform that money cannot buy." A ranking claim this worker could
  not find evidence for, so it does not ship.
- "Listings that state the total get far fewer wasted viewings." A statistic
  with no data behind it.
- "Vallo charges you nothing to list or to be verified." Dropped from the
  email rather than restated: rule 15 says Vallo charges no platform fee, but a
  pricing statement belongs to the founder's copy, not the welcome.
- The verification ladder "phone, identity document, address, physical
  inspection" was wrong: the rungs in `lib/trust/verification.ts` are
  identity, address, payout account and in person. The new copy says those.
- Nothing says insured, guaranteed, protected, vetted or checked; no count, no
  percentage; no stock or availability promise.

### Not verified

- **Real inbox rendering.** Not sent to any real client: Outlook desktop
  (Word), Outlook.com, Gmail web and app, Apple Mail and iOS Mail were not
  seen. The VML button, the Outlook ghost table and Gmail's dark-mode repaint
  are built to the known rules and proven only in markup and in the stripped
  Chromium render.
- **That the welcome sends at all in production.** It needs `RESEND_API_KEY`
  on the deployment; this worker cannot read it. Without it `welcomeOnce`
  releases the stamp and nothing leaves.
- **Every link as a signed-in person.** Routes proven to exist as pages by the
  test; not clicked through with a session.

## 11. Platform identity and the roles icon pack

Worker "identity", 22 September. Scope: `docs/SESSION_B_SCOPE.md` section 10.
Two hand-over deliverables for Session A; no product surface was edited, no
token, no shared stylesheet, no shared icon file. Requests ID1 and ID2.

### What was delivered

- `docs/design/GLOW_IDENTITY.md`: the identity measured off the renders, as
  proposed token values for dark and paper, mapped to the tokens they replace
  or extend, with a paste-ready CSS block. Revised once the same evening on the
  lead's review (paper tile, and three dark values raised after re-sampling).
- `docs/design/proofs/session-b/identity/identity-side-by-side.jpg`: each
  element as the render draws it, as the proposed CSS draws it, and its paper
  twin, at 2x. The CSS came from a throwaway static page rendered in headless
  Chromium (not committed; it lived in the scratchpad).
- `apps/web/public/brand/session-b/roles/`: 113 objects and 1 stage.
  Per object: `<name>.png` and `.webp` at native size, `-256.png` and
  `-256.webp`, and the paper rendition `-day.png`, `-day.webp`,
  `-day-256.png`, `-day-256.webp`. `SOURCES.md` carries render, box, native
  px, square edge, the screen that uses it, what it is, and a `RENDER_CROPS`
  entry per object ready to paste into `scripts/icon-manifest.mjs`.
- `scripts/design/session-b-crops.mjs`, block `roles`
  (`node scripts/design/session-b-crops.mjs --surface roles`).
- Contact sheets: `docs/design/proofs/session-b/identity/roles-pack-dark.png`
  (on the render's night ground) and `roles-pack-paper.png` (the `-day` files
  bare on paper).

### How the pack was cut

- All twelve `roles/` images were opened and every glass object and glass
  icon tile was boxed by hand on 2x to 8x zooms with a 10 px grid, each box
  stopping short of the card border, the caption, the tick badge and the next
  tile so the edge ring is ground.
- **The key is the shared pipeline's own code.** `cut-icon-ground.mjs`
  exports nothing and rewrites `assets/brand-cut` when imported, so the roles
  block reads that file's text and evaluates its keying section (FLOOR
  through `squareWithMargin`, stopping before `cutOne`): `keyRender` (two-pass
  plane fit on the ring, brightest-channel key, one scale for all three
  channels so the hue is the render's), `dropEdgeStrays`, `squareWithMargin`.
  If that file is restructured the block throws rather than keying with
  something else. (The inspection block above it restates the functions; mine
  evaluates the originals. Both are honest; they are not identical code.)
- Retouched before the key, by harmonic fill from the surrounding glass:
  the tick badges overlapping `list-rent-house` (06) and `shortlet-entire-flat`
  (11), and the lettering on the `list-sale-sign` board (06), which ships
  blank. `owner-map-pin` (03) has a soft elliptical keep mask against the
  drawn map.
- Duplicates. Checked against all 144 objects in `public/brand/glass`: none is
  the same drawing as anything here (the nearest, `home-ring`, `key-ring`,
  `chart-ring`, `building-chip`, `doc-shield`, `pin-map`, `land-plot`, `duplex`,
  `bungalow`, `mini-flat`, `shop-retail`, `office-space`, `id-card-check`,
  `hotel-bed`, `concierge-bell`, `info`, `home-check`, `camera`, were compared
  side by side and are different drawings). Within the set, where two screens
  draw the same object only the larger drawing was cut and its row names both:
  the Owner orb (01 drawer over 01 sheet), the plus orb (01 over 05 and 09), the
  firm block on its plinth (05 screen 4 over screen 1), the clock orb (16 to 20
  over 8 to 12), the prohibition orb (three screens), the generator and the tap
  (07 amenities over 07 light and water), the document orb (Certificate over
  Deed and None), the hotel scene (10 over 09), the Nearby pin (09 over the 06
  map pin).

### Inventory

| Render | Objects (native px) |
| --- | --- |
| 01 | `home-buy-tile` (76), `home-rent-tile` (76), `home-manage-tile` (76), `home-invest-tile` (76), `switch-owner-orb` (74), `switch-agent-orb` (64), `switch-firm-orb` (64), `switch-add-orb` (64) |
| 02 | `door-owner-house` (114), `door-agent-key` (108), `door-firm-building` (112), `ask-person-tile` (86), `ask-pin-tile` (86), `ask-doc-shield-tile` (86), `ask-clock-tile` (56) |
| 03 | `owner-house-orb` (78), `owner-shield-tile` (62), `owner-map-pin` (62), `doc-certificate-orb` (52), `doc-consent-orb` (52), `doc-survey-orb` (52), `doc-utility-orb` (52), `ownership-proof-orb` (72), `info-orb` (40), `owner-set-up-house` (212) |
| 04 | `agent-id-card` (94), `agent-selfie-orb` (92), `agent-key-plinth` (228) |
| 05 | `firm-building-plinth` (248), `firm-letter` (88), `firm-stamp` (94) |
| 06 | `list-rent-house` (94), `list-sale-sign` (86), `list-land-plot` (90), `type-flat` (72), `type-duplex` (72), `type-bungalow` (72), `type-self-contain` (70), `type-shop` (70), `type-office` (70), `room-bedrooms` (58), `room-bathrooms` (60), `room-toilets` (60), `room-size` (66), `room-furnishing` (64), `room-floor` (62), `condition-fair` (56), `condition-good` (74), `condition-new` (62), `condition-off-plan` (76) |
| 07 | `light-bulb-plinth` (114), `power-sun` (42), `power-clock-orb` (42), `none-orb` (42), `power-inverter` (42), `power-solar` (44), `water-drop-plinth` (94), `water-borehole` (54), `water-well` (50), `amenity-parking` (60), `amenity-security` (50), `amenity-water-heater` (50), `amenity-air-conditioning` (60), `amenity-wifi` (52), `amenity-fitted-kitchen` (52), `amenity-wardrobe` (50), `amenity-balcony` (50), `amenity-gated-estate` (54), `amenity-borehole` (50), `amenity-generator` (52), `amenity-running-water` (52), `amenity-pop-ceiling` (60), `amenity-tiled-floor` (56), `amenity-garden` (52), `media-camera-plinth` (66), `media-video-tile` (52) |
| 08 | `price-rent-house` (52), `price-agency-person` (52), `price-legal-doc` (52), `price-caution-shield` (52), `price-service-gear` (52), `price-total-coins` (68), `review-sent-house` (186) |
| 09 | `stays-hotels-bed` (94), `stays-shortlets-house` (94), `stays-restaurants-cloche` (90), `stays-nearby-pin` (76), `stays-switch-person-orb` (70), `stays-switch-hotel-orb` (70), `stays-door-hotel` (94), `stays-door-shortlet` (94), `stays-door-restaurant` (94) |
| 10 | `facility-pool` (52), `facility-gym` (54), `facility-parking` (52), `facility-restaurant` (48), `facility-airport-shuttle` (50), `facility-generator` (46), `facility-wifi` (54), `facility-air-conditioning` (46), `add-tile` (44) |
| 11 | `shortlet-entire-flat` (66), `shortlet-whole-house` (62), `shortlet-private-room` (62), `restaurant-plate-orb` (110) |
| 12 | `notify-listing-live` (54), `notify-message` (54), `notify-viewed` (54), `notify-approved` (54), `notify-reminder` (54), `notify-follower` (54), `notify-system` (54), `admin-avatar-orb` (42) |
| 10 (stage) | `hotel-scene` (310 x 122, cut with its ground, feathered) |

### Measured identity (dark; paper values are in GLOW_IDENTITY.md)

| Element | Measured (render px, converted at 0.933 CSS/px for 02, 1.171 for 04) | Proposed |
| --- | --- | --- |
| Page ground | `#000D34` (02), `#000828` (04) | flagged, not adopted blind |
| Lit ink | one ink solves card, tile and panel: rgb(0 90 255) | `--nf-lit-ink` |
| Card fill | ink alpha 0.68 under the rim, 0.31 at 11 px, 0.19 at 34, 0.08 to 0.14 mid, 0.41 at the bottom edge; reflection brighter in the middle third of the top | eight-stop gradient plus a top radial |
| Card border | 1 px: top `#58F0FE`, left `#02B9EF`, bottom `#048CE1`, right `#0050B4`; each a three-row band | per-side `border-color` plus inner and outer rows |
| Card radius | 13 render px, 12 CSS | 12px (today 18) |
| Card glow | +14 blue within 3 px, gone by 8 | 4 px halo 0.38, 12 px field 0.18 |
| Selected | border `#C7FEFF`, fill alpha 0.49 mid, cyan under the rim, bloom still +50 at 14 px and +60 at 20 px, tick 24 CSS `#0079F8` ring `#00A5FF` | selected fill, edge, two-layer bloom |
| Icon tile | 70 px (65 CSS), radius 14 (0.20), lit left column `#02BEF8`, lit top and bottom rows, dark middle except a glyph halo to blue 254 | lit tile recipe; PALE tile on paper |
| Lit button | `#017DF9` / floor `#0153FC` at 61% / `#029AF2`; border `#0BEEFC` top, `#02B3FB` sides, `#01E5FE` bottom; middle of the lower half 45 green levels over the ends; bloom above gone by 12 px, below steady to 24 | radial low lift over six-stop gradient, cyan edge, offset bloom |
| Progress | 35 x 10 CSS, gap 8, radius 3; on `#0188FD` with `#02B1FE` top row; off `#01358F` to `#002977`, edge `#003D95` | progress tokens |
| Info panel | flat ink 0.28, edge `#0D4393`, no glow, radius 9 CSS, glyph disc `#2BB1FC` 35 CSS | info tokens |
| Text | heading `#FFFFFF`, body `#C4D9F4`, card body `#A4D7F9`, muted `#98CEF9`, accent `#35EEFD` | 12.1, 11.3, 10.4, 12.3 to 1 on the card middle |

### Could not crop cleanly, and why

- **The 06 map pin on its disc.** Drawn over the street map; the map's lines
  run into the disc and survive any key that keeps the disc's glow. Not
  shipped; the same pin on its disc is `stays-nearby-pin` (09), on a clean
  ground.
- **`owner-map-pin` (03)** ships, but soft: it too stands on the map, and the
  keep mask leaves a faint haze round it. Prefer `ask-pin-tile` or
  `stays-nearby-pin` where either fits.
- **The 11 house rules orbs** (no smoking, no pets, no parties, no children):
  about 26 render px and the glyphs are garbled at source.
- **The 08 "What happens next" tiles**: about 26 px, glyphs indistinct.
- **Small flat glyphs** (03 drag-the-pin, 06 form rows, 07 prepaid bolt, the 04
  clock and check discs, the flat info discs of 04, 05 and 08): not glass;
  they are the UiIcon tier. The lit glass version of the info glyph is
  `info-orb` (03).
- **Not objects at all**: the 01 drawer and the 12 admin rail (line glyphs,
  UiIcon tier), the dock's centre switch (a control), every avatar and photo,
  the selected tick badges (CSS, section 3 of GLOW_IDENTITY).
- **Soft by size.** Native is the object's longer side in render px; a crop is
  sharp to native / 3 CSS at 3x and acceptable to native / 2. Under 50 native:
  `info-orb` (40), `power-sun` (42), `power-clock-orb` (42), `none-orb` (42), `power-inverter` (42), `power-solar` (44), `facility-restaurant` (48), `facility-generator` (46), `facility-air-conditioning` (46), `add-tile` (44), `admin-avatar-orb` (42). These belong in 16 to 24 CSS px slots.
- **Retouch residue.** Where a tick badge was painted out (`list-rent-house`,
  `shortlet-entire-flat`) a faint lighter patch survives at the top right,
  visible on mid grey at 200 px and not on the night ground. The blanked board
  of `list-sale-sign` reads slightly smudged. On `hotel-scene`, three small
  lettering-like panels were blanked and the top one softens a short run of the
  roof's rim line.
- **`shortlet-private-room`** ships as drawn, and the render drew a car for
  "Private room". It is flagged in SOURCES as not reading as a room; I would
  not use it for that caption.
- **Faint square wash on paper.** A night crop's outer bloom, composited on
  white, shows as a pale square round the larger objects (the shared pack's
  crops do the same). That is why every object has a `-day` rendition, which
  drops the bloom. Use `-day` on paper, always.

### Refused from the render

- The lettering on the for-sale board (06): retouched blank (no text baked
  into an object).
- The "Short Let" home tile (01): not cut, per `roles/README.md` point 5.
- The Apple Maps mark (03), the star ratings (09, 10), every count badge
  (01 drawer 3 and 1), every count, price and statistic: not cropped, not
  objects, and not ours to state.
- Nothing in the pack asserts anything about the world: no badge, licence,
  seal or certification object was cut. The emerald tick tile
  (`notify-approved`) is a state glyph for a real state (a listing approved),
  not a claim.

### Light mode

The first proof put the dark artwork on a navy plate on a white card. The lead
caught it as the survey's condemned dark-plate defect; corrected the same
evening. Paper now takes a pale glass tile and each object's `-day` rendition,
bare or on that tile; stages (`hotel-scene`) sit in a framed deep-navy panel
with a lit edge, a picture rather than an icon chip. Proof:
`roles-pack-paper.png` and the right-hand column of the side-by-side.

### Not verified

- No product surface uses any of this yet; adoption is Session A's (ID1, ID2).
  Nothing here was seen in the running app.
- The harness used the system sans, not Poppins and Inter.
- `sample-reference.mjs` is hard-wired to other references and was read, not
  run; the sampling was my own sharp code and `measure-glow.mjs`.
- The `-day` rendition is a derived recolour, not light artwork; it has been
  looked at on paper in the contact sheet and the harness, at 88 and 92 px,
  and nowhere else.

## 12. Deleted posts

Founder, item 4 (23 September): "A DELETED POST IS DELETED. ... It should
simply not be there. Deleted means gone from every surface that lists posts,
including my profile grid and the feed. The only place a tombstone is ever
acceptable is inside a conversation that would otherwise break, where somebody
replied to it. Nowhere else, and never on a profile."

Commits: `c3fbba35` (scope claim, pushed first), `1385bfc8` (the fix and its
tests). Files are listed under "Deleted posts (item 4, new)" in
`docs/SESSION_B_SCOPE.md`.

### 12.1 How deletion is recorded (read-only SQL, 23 September)

- `public.posts.status` is `social_status` (`LIVE`, `HELD`, `REMOVED`), with
  `removed_at` and `hidden_by`. There is no `deleted_at`. Live: 74 LIVE, 1
  REMOVED (a root with no replies, the founder's own, 12 September).
- The author's delete (`removePost`, `lib/social/posts-actions.ts`) is an
  UPDATE to `status = 'REMOVED'`, `body = null`, `removed_at`. The row is kept
  on purpose: `parent_id` cascades, so a hard delete would take other people's
  replies with it.
- `posts_update_own` allows exactly that transition; `posts_zz_guard_update`
  guards the rest.
- **The cause of the bug:** `posts_select` is `(LIVE and visible place and not
  blocked) OR author_id = auth.uid() OR admin`. The middle branch hands an
  author their OWN removed rows back, so every listing read returned the
  founder's deleted post on his own profile and his own feed, and `PostCard`
  drew it as "This post was removed." The database was never going to hide it
  from its author; the reads had to.
- Triggers on the transition: `posts_drop_media_on_remove` deletes the
  `post_media` rows; `posts_status_counters` (`private.bump_post_status_counters`)
  decrements the parent's `reply_count`, the place's `areas.post_count` and the
  author's `social_profiles.post_count`, and re-increments on a restore;
  `posts_notify_after_status_change` tells the author only when an admin
  removed it (`hidden_by` set).
- Stories: `stories.status` and `story_comments.status` carry the same enum.

### 12.2 Every surface that lists posts, its read, before and after

| Surface | Read | Before | After |
|---|---|---|---|
| Around, everywhere (`/around`) | `getEverywhereFeed` then `readFeedPage` (`posts-queries.ts`) | author's own removed roots came back through RLS and drew a tombstone in the timeline | `.neq("status", "REMOVED")` at the query |
| Around, joined places | `getJoinedFeed` then `readFeedPage` | same | same filter (one function) |
| A place's feed (`/around/[slug]`) and the assistant's `area_intel` | `getAreaFeed` then `readFeedPage` | same | same filter |
| Own profile Posts (`/profile`, `ProfilePosts`) | `getProfileFeed` | the founder's deleted post drew "This post was removed." | filtered at the query |
| Public profile Posts (`/u/[handle]`) | `getProfileFeed` | same for the owner viewing their own page | filtered |
| Profile Replies | `getProfileReplies` | own deleted replies listed as tombstones | filtered |
| Profile Media (cards) | `getProfileMedia` | a removed post with media rows still stored would list | filtered |
| Profile media grid | `getProfileMediaGrid` (`profile-tabs-queries.ts`) | relied on the media trigger alone | filtered at the query as well |
| Profile Activity (likes, reposts) | `getProfileActivity` | a like on your own since-deleted post listed a tombstone | filtered; the entry drops |
| Post thread (`/post/[id]`) | `getThread` | every removed reply shown as a tombstone, answered or not; a removed root with nothing under it opened as a lone tombstone | `pruneDeleted`: a removed reply stays only while a reply that is still there hangs off it; a removed root with nothing left reads as not found |
| Comments sheet | `getComments` (`comments-queries.ts`) | every removed comment a tombstone | same pruning |
| Story page (`/stories/[id]`) | `getStory` (`stories-queries.ts`) | a removed story opened with its headline and place still printed | not found when no comment still hangs off it; otherwise the headline is the removed sentence, no picture, no place |
| Story comments | `getStoryComments` | every removed comment a tombstone | same pruning |
| Story rails, story count | `listStories`, `countStories` | already `status = LIVE` | unchanged |
| Home trending (posts and stories) | `home-queries.ts` | already `status = LIVE` | unchanged (Session A's file, not touched) |
| Admin moderation queue and counts | `lib/admin/moderation-queries.ts`, `lib/admin/reads/moderation.ts`, `lib/admin/queries.ts` | `status = HELD` only; never lists removed rows | unchanged |
| Search | none | no read lists posts in search today (search is listings) | nothing to change |
| Notifications | `notifications` rows written by triggers, linking `/post/<id>` | a list of notifications, not of posts | unchanged; see 12.5 |

`posts-media.ts` `readPostViews` has no caller and was left alone.

### 12.3 The chain

Delete control (card or thread menu, "Delete") then `removePost` (server
action, `posts-actions.ts`: post id validated, signed-in author, scoped by
`author_id`, no time window on removal; a HELD post is refused with its own
sentence) then `posts_update_own` (RLS; the fifteen minutes apply to edits only)
then `public.posts` UPDATE to REMOVED then triggers (media dropped, counters
decremented, author told if an admin did it) then the READ (every listing
function above excludes REMOVED; the thread and comment reads prune) then the
screen (`PostCard` returns nothing for a removed post; `ThreadView.card` draws
`Tombstone` for a removed post it was handed, which only `getThread` can hand
it). After deleting in a feed, `Feed` drops the card locally and refreshes;
after deleting a thread's root with nothing live under it, the thread view
now goes to `/around` rather than refreshing into not found; after deleting a
comment, `CommentsSheet` prunes it locally by the same rule.

Counts: `areas.post_count` (the only post count drawn: CityHero, place page)
matches the live non-removed root count in all 9 places. Every `reply_count`
matches its non-removed children (75 of 75). `social_profiles.post_count` is
decremented on delete, but it is not drawn on any profile today (AccountHero
takes it and does not print it), and it drifts on one account: 6 stored
against 8 non-removed rows (4 roots, 4 replies). The drift predates and is
not caused by the delete (the removed row is correctly out of the 6). If a
profile count is ever drawn, it needs a recount first: request for Session A,
not filed as blocking because nothing renders it.

### 12.4 Tests

- `lib/social/deleted-posts.test.ts` (6): the pruning rule (unanswered
  deleted reply goes, answered one stays, a deep live answer keeps the chain,
  a dead chain goes, a cycle does not hang), and `conversationIsGone`.
- `lib/social/reads-deleted.test.ts` (16): each read against an in-memory
  table that, like `posts_select` for an author, hands back every row including
  deleted ones: everywhere, a place, joined, profile Posts, Replies, Media,
  media grid, Activity, no tombstone in any profile read, the thread (pruned,
  answered kept), a deleted root not found, an answered deleted root as the
  tombstone, the comments sheet, a deleted story not found, an answered one
  with none of its words, story comments pruned. Run against the previous
  reads, 14 of the 15 then-existing cases FAILED (the one that passed is the
  answered root, which was already a tombstone); all pass now.
- `lib/social/tombstone-placement.test.ts` (4): only `ThreadView` imports
  `Tombstone`; only the tombstone and the conversation renderers
  (`ThreadView`, `CommentsSheet`) print the removed sentence; `PostCard` has
  `if (post.removed) return null;` and no `<Tombstone`; `ThreadView` draws it
  only under `post.removed`. The unit config renders no component, so this is
  a source test, said plainly.
- Checks at `1385bfc8`: `tsc --noEmit` clean; `eslint` on the twelve changed
  files clean; `check-css-tokens` clean; `vitest run src/lib/social
  src/components` 34 files, 285 tests passed.

### 12.5 Not verified

- No live signed-in run: no test account may be created, so the founder's own
  profile was not opened after the change. Proven by the SQL read of the
  policy and triggers, the code and the tests above.
- No screenshot: the change removes a card rather than drawing one.
- A notification that links to a post which has since been deleted (a like,
  a reply, or "Your post was removed") now opens not found when nothing is
  left under that post. The notification rows are written by Session A's
  triggers; deciding whether they should be withdrawn on delete is a question
  for Session A, not changed here.
- `social_profiles.post_count` drift on one account (12.3), not drawn today.
  Both are filed by the lead as DP-1 and DP-2 in the scope file.

### 12.6 Final pass, 23 September

**Re-checked against main.** `git grep 'from("posts")' origin/main -- apps/web/src`
after the last pull: no new read of `posts` since `1385bfc8`, and no commit
from Session A touched `posts-queries.ts`, `profile-tabs-queries.ts`,
`comments-queries.ts` or `stories-queries.ts`. The seven `neq("status",
DELETED_STATUS)` filters and the four `pruneDeleted` calls are all on main.
The other `posts` reads are writes or single-row lookups inside actions
(`posts-actions.ts`, `bot-actions.ts`, `moderation-actions.ts`), the replying-to
parent lookup in `getProfileReplies` (it names a person and lists nothing), the
HELD-only admin reads, the LIVE-only home read, and `readPostViews`, which has
no caller.

**Exercised in a production build.** New committed harness
`/preview/session-b/posts` (`app/(dev)/preview/session-b/posts/page.tsx`,
FIXTURE PROPS). It hands the real `Feed`, `ProfilePosts` (Posts tab, owner) and
`ThreadView` a live post, a deleted post with no replies and a deleted post
with one reply. The thread rows go through `pruneDeleted`, the function
`getThread` uses. Built with `next build` (exit 0) and served with
`VALLO_PREVIEW_HARNESS=1 next start -p 3183`. It was shot at 390 dark and the
DOM counted per panel (`scratchpad/tools/posts-shot.mjs`, not committed):

```
{"1":{"tombstones":0,"liveBody":1,"replies":[]},
 "2":{"tombstones":0,"liveBody":1,"replies":[]},
 "3":{"tombstones":1,"liveBody":1,"replies":["Same here","Which junction"]},
 "4":{"tombstones":1,"liveBody":0,"replies":["I saw this before"]}}
```

Feed and profile: live post only, no tombstone. Thread: one tombstone, for the
deleted reply somebody answered; the one nobody answered is gone. The deleted
root somebody answered is the tombstone. Proof:
`docs/design/proofs/session-b/posts/posts-390-dark-full.jpg`, re-shot after the
fix below.

**Fixed in this pass (`d4e66ffe`).** The first shot drew the always-open reply
box under a deleted root. `private.place_post` refuses any reply to a parent
that is not LIVE ("You cannot reply to a post that has been removed ..."),
so the box would only ever fail. `ThreadView` no longer offers it under a
removed root.

**Commands and output at the final commit:**
- `npx vitest run src/lib/social/deleted-posts.test.ts src/lib/social/reads-deleted.test.ts src/lib/social/tombstone-placement.test.ts`:
  3 files, 26 tests passed.
- `npx tsc --noEmit -p .`: no output, exit 0.
- `npx eslint "src/app/(app)/post/[id]/ThreadView.tsx" "src/app/(dev)/preview/session-b/posts/page.tsx"`:
  no output, exit 0.
- `node scripts/check-css-tokens.mjs`: "css tokens: clean".
- `compare-surface.mjs --shape-sweep --routes /preview/session-b/posts --theme dark`:
  0 breaches, 0 worth an eye, 0 refused. However, it reported "0
  route/width/theme combination(s) actually measured", so the sweep measured
  nothing and proves nothing here. This pass draws no new control; the cards
  and composer are Session A's.

**BUILT AND UNPROVEN:**
- The live reads on a signed-in session. The box cannot reach Supabase over
  HTTP, so no read ran against production. Proving it needs a signed-in author
  with a deleted post opening `/profile`, `/u/<handle>` and `/around`.
- The delete control end to end (menu, `removePost`, the row turning REMOVED,
  the card leaving, the thread root going to `/around`). Proven only by code
  reading and read-only SQL of the policy and triggers.
- The story page's deleted-story tombstone (the removed sentence as the
  headline). Proven by unit test only; not in the harness.

**Known edge, not fixed.** At the depth cap, a reply to a depth-three reply
whose parent is deleted is retargeted by `replyTargetOf` to that deleted
parent, which `place_post` refuses. The thread "N replies" line also counts a
tombstone.

**Percentage.** Listing surfaces in 12.2: 18. Correct at the read: 17 of 18
(94%). The one open is notifications linking to a deleted post (DP-1, Session
A). Of the 17, 13 are proved by unit tests over the real read functions and 4
by reading the code (story rails, home, admin, search: none). Chain links in 12.3: 9 (control, action,
validation, policy, table, trigger, notification, query, screen). Proven: 6 of
9 (67%): policy, table and trigger by SQL; query by unit tests; screen by the
harness in a production build; validation by code reading. The control and
the action were not exercised live; the notification link is DP-1.

## 13.0 Platform sweep: the shared layer (Phase 1, worker "shared")

Released: 42ea43d9 (the layer), 9da8f86f (one step more glow, the Switch).
Everything the console and Get started drew for themselves (container,
edge, rim, glow, corner, icon plate, selected state, lit primary, glass
secondary) now comes from one token block and three components. The values
were moved exactly, not re-measured: where a value came from is in the
table.

### Use these (for the Phase 2 workers)

| Primitive | File | Props | Classes it writes |
|---|---|---|---|
| `Panel` | `components/ui/Panel.tsx` | `as?` (element, default `section`), `variant?: "panel" \| "card"`, `flush?`, `glass?`, `className?`, plus the element's own props; also `panelClass({variant, flush, glass, className})` for a `Link` or other element you cannot swap | `.nf-panel`, `.nf-panel--card`, `.nf-panel--flush`, `.nf-panel--glass` (glass.css) |
| `IconPlate` | `components/ui/IconPlate.tsx` | `size?: "sm" \| "md" \| "lg"` (36 / 44 / 56), `tone?: "brand" \| "success" \| "error" \| "pending" \| "info"`, `className?`, `children` (the glyph; `ICON_PLATE_GLYPH[size]` gives 16 / 24 / 24); also `iconPlateClass()` | `.nf-plate`, `.nf-plate--{tone}`, `.nf-plate--{size}` (controls.css) |
| `Button` / `ButtonLink` | `components/ui/Button.tsx` (API unchanged) | `variant="primary"` is now Get started's lit bar; `variant="secondary"` is Get started's glass door; `glow` is now inert (the primary is lit at rest) | `.nf-btn--primary`, `.nf-btn--glass` (buttons.css) |
| `Switch` | `components/ui/Switch.tsx` (API unchanged) | | `.nf-switch` (controls.css): glass track off, lit bar on, rimmed thumb |

Rules: a surface adds layout through `className` and never restates the
material. The selected state has no component: use the `--nf-selected-*`
tokens on the surface's own tab or row (the console's `.nf-admin-seg__item--on`
and `.nf-admin-nav__row--on` are the worked examples).

### The token table

All in `packages/design-tokens/src/tokens.css`, block "THE REFERENCE ANATOMY".
"admin" is `app/css/admin.css` as it stood at ccf594ba (the `.nf-admin` custom
properties), "welcome" is `app/welcome/welcome.css` at the same commit.

| Token | Value (measured; the glow step's value in brackets) | Came from |
|---|---|---|
| `--nf-lit` | `var(--nf-brand-primary)` | admin `--nf-admin-lit` |
| `--nf-lit-cyan` | info 55% into white | admin `--nf-admin-lit-cyan` |
| `--nf-container-radius` | `var(--nf-radius-sm)` = 10px (was `--nf-radius-lg`, no reader) | admin `--nf-admin-radius` (re-measured 10 on the four renders, ledger 6.2) |
| `--nf-panel-fill` | radial cyan catch 55% x 14px at top centre + ten-stop ramp, lit 42/38/31/26/20% at 0/3/8/15/36px, 16% mid, 20/26/32/37% up the foot | admin `--nf-admin-panel-fill` (5EAA44CB column scans) |
| `--nf-panel-fill-card` | same catch + lit 50/44/38/32% at 0/6/13/22px, 18% mid, 22/28/34% foot | admin `--nf-admin-card-fill` |
| `--nf-panel-blur` | `var(--nf-glass-blur-soft)` (12px), applied only by `.nf-panel--glass` | new role; the console's panels are opaque on flat canvas and carry no blur |
| `--nf-panel-edge` | brand 62% | admin `--nf-admin-panel-edge` |
| `--nf-panel-edges` | top lit 82% + info, right lit 72% + canvas, foot lit 70% + info, left lit 74% + canvas | admin `--nf-admin-panel-edges` (re-sampled #0066D1..#0078E8 top etc.) |
| `--nf-panel-catch` | lit 78% + info [lit 68% + info] | admin `--nf-admin-catch` |
| `--nf-panel-rim` | `inset 0 1px 0 var(--nf-panel-catch)` | admin, the `inset 0 1px 0 var(--nf-admin-catch)` every container restated |
| `--nf-panel-halo` | `0 0 3px` info 34% [`0 0 5px` info 46%] | admin, third layer of `--nf-admin-panel-glow` |
| `--nf-panel-glow` | inset top lit 90%, inset left lit 70% + canvas, `var(--nf-panel-halo)` | admin `--nf-admin-panel-glow` |
| `--nf-panel-hair` | brand 22% | admin `--nf-admin-hair` |
| `--nf-plate-size-sm` / `-md` / `-lg` | 2.25rem / 2.75rem / 3.5rem | admin `.nf-admin-plate--sm` / `--md`; `-lg` is a new rung for hero plates |
| `--nf-plate-radius` / `-radius-sm` | `--nf-radius-sm` (10) / `--nf-radius-xs` (6) | admin `.nf-admin-plate`, `--sm` |
| `--nf-plate-fill` | radial lit 55% centre + lit 72/46/38/66% ramp | admin `--nf-admin-tile-fill` |
| `--nf-plate-edge` / `-edges` | brand 70% / per side (info 80% top, lit 60% sides, info 90% + white left) | admin `.nf-admin-plate` border, `--nf-admin-tile-edges` |
| `--nf-plate-rim` | inset left info 70%, inset top lit-cyan 55% | admin `--nf-admin-tile-shadow` layers 1, 2 |
| `--nf-plate-inner-light` | `inset 0 -2px 3px -1px` lit 60% | admin `--nf-admin-tile-shadow` layer 3 |
| `--nf-plate-glow` | `0 0 8px` lit 25% [`0 0 10px` lit 34%] | admin `--nf-admin-tile-shadow` layer 4 |
| `--nf-plate-shadow` | rim, inner light, glow | admin `--nf-admin-tile-shadow` |
| `--nf-plate-glyph-glow` | `drop-shadow(0 0 4px` lit-cyan 80%) | admin `.nf-admin-plate > svg` |
| `--nf-selected-fill` | `var(--nf-gradient-cta)` | admin `.nf-admin-nav__row--on`, `.nf-admin-seg__item--on` |
| `--nf-selected-edge` / `-edges` | rim-lit-ink 60% + brand / cyan-lit per side | admin row border, `--nf-admin-cta-edges` |
| `--nf-selected-rim` | `inset 0 1px 0` white 55% | admin, both selected rules |
| `--nf-selected-shadow` | rim, `0 0 18px` brand 55% [22px 64%], `0 6px 16px -6px` brand 70% | admin `.nf-admin-nav__row--on` |
| `--nf-selected-shadow-inline` | rim, `0 0 18px` brand 50% [22px 58%] | admin `.nf-admin-seg__item--on` |
| `--nf-btn-lit-edges` | top warning 22% into on-brand, sides brand 70% + warning, foot warning 32% into on-brand | welcome `.nf-gs-btn--lit` (#e4feff top, #0180fb sides, #d6faff foot on 2A49E2F7) |
| `--nf-btn-lit-fill` | radial cyan lift 45% x 75% at 50% 88% + ramp brand 92% / 74% / 68% / 100% / 70% at 0 / 24 / 62 / 88 / 100% (sRGB) | welcome (#047bfb, #002cdb, #0027d1, #026dfa down the centre) |
| `--nf-btn-lit-rim` | `inset 0 1px 0` warning 30% into on-brand [20%] | welcome |
| `--nf-btn-lit-inner` / `-inner-hover` | `inset 0 0 12px` 70% / `16px` 80% | welcome |
| `--nf-btn-lit-bloom` | `0 5px 14px -2px` 65%, `0 -2px 10px` 22% [`0 6px 16px -2px` 74%, `0 -2px 12px` 30%] | welcome |
| `--nf-btn-lit-bloom-hover` | `0 4px 12px -2px` 70%, `0 -2px 12px` 28% [`0 5px 14px -2px` 78%, `0 -2px 14px` 34%] | welcome `:hover` |
| `--nf-btn-lit-shadow` / `-shadow-hover` | rim, inner, bloom | welcome |
| `--nf-btn-lit-text-glow` | `0 0 10px` on-brand 35% | welcome |
| `--nf-btn-lit-pool` | radial 50% x 55% at 50% 16%, brand 58% / 16% / 0 [68% / 22%] | welcome `.nf-gs-btn--lit::after` (+136 / +65 / +25 blue at 4 / 10 / 20px) |
| `--nf-btn-lit-pool-height` / `-blur` | 48px / 3px | welcome `::after` |
| `--nf-btn-glass-fill` | brand 22% to 8% | welcome `.nf-gs-btn--glass` |
| `--nf-btn-glass-edge` | `var(--nf-container-edge)` | welcome |
| `--nf-btn-glass-shadow` | rim-lit-ink inset, `0 0 18px -6px` glow-3 [`0 0 20px -5px`] | welcome |
| `--nf-btn-glass-blur` | `var(--nf-glass-blur-soft)` | welcome |
| `--nf-badge-gold-*`, `--nf-badge-platinum-*` | the ten metal stops, unchanged | `app/css/trust-badge.css` (TK-1; moved so no stylesheet under `app/` holds a raw colour) |

Existing names all still resolve. `--nf-gradient-cta`, `--nf-rim-primary`,
`--nf-bloom-lit*` are untouched; the primary button no longer reads them.

### The glow step (founder addendum item 3)

One block after the main token block, "A LITTLE MORE GLOW: ONE STEP", redeclares
the ten tokens bracketed above. Deleting that block restores the measured
values. No ink, fill or text-shadow token moves; no blur is animated; the
widest halo (the selected row) grows 18 to 22px, inside the console's 16px
gaps plus the neighbour's own edge.

### More glow and a glass reflection (founder's second message)

Still one block, now called "MORE GLOW AND A GLASS REFLECTION". The fills are
split so the reflection can be tuned on its own: `--nf-panel-fill` =
`var(--nf-glass-sheen), var(--nf-panel-fill-base)` (the same for
`--nf-panel-fill-card`), and `--nf-plate-fill` = `var(--nf-plate-sheen),
var(--nf-plate-fill-base)`. The measured block sets both sheens to `none`, so
deleting the glow block restores the console exactly.

| Token | Measured | Glow +1 (9da8f86f) | Glow +2 and reflection |
|---|---|---|---|
| `--nf-glass-sheen` | none | none | radial lit-cyan 12% at the top-left corner (60% x 70%), and a 135deg white wash: 7% at the corner, 2% at 22%, clear by 38% |
| `--nf-plate-sheen` | none | none | a 135deg white glint: 26% at the corner, 6% at 30%, clear by 50% |
| `--nf-panel-halo` | 0 0 3px info 34% | 0 0 5px 46% | 0 0 6px 52% |
| `--nf-panel-catch` | lit 78% + info | lit 68% | lit 62% |
| `--nf-plate-glow` | 0 0 8px lit 25% | 0 0 10px 34% | 0 0 12px 40% |

Sampled against `founder/inspection-target.jpg`: every card there is paler
in its top-left corner and fades diagonally into the body, and every plate
has a glint on its upper left. Text sits on the body below the 38% stop.

### Identity diff (the proof that the extraction changed nothing)

Method: `origin/main` at ccf594ba built for production and started with the
harness gate, 38 full-page shots from the committed harnesses
(`/preview/session-b/admin/{overview, overview?state=live, operations,
analytics, back}`, `/preview/session-b/admin-money/{money, escrow, payments,
bookings, supply}` each bare and `?state=full`, `/preview/session-b/welcome`
as member, and walked to the last slide as guest, done and member), at 390
(DPR 2) and 1440 (DPR 1), dark, reduced motion, clock fixed. Then the same
shots from the extracted build (before the glow step) and a pixel diff.
Shots were compared against a fresh shot of committed code rather than the
committed JPEG proofs, because a JPEG cannot show a zero diff; the committed
proofs are older than several later commits to the same harnesses.

| Result | Shots |
|---|---|
| 0 pixels different | 35 of 38: every console route, every money desk bare and full except escrow full, every Get started state at both widths except the guest doors |
| Guest doors (Sign in / Create account) | 390: 27,119 px differ by at most 4 levels of 255 (not visible). 1440: 21 px differ by more than 8, all on the two left corners of Create account: corner antialiasing from a sub-pixel shift, no colour or geometry change |
| Escrow desk, `?state=full` | The desk's two secondary buttons ("Release to", "Refund to") change on purpose: the platform secondary now IS Get started's glass door (blue glass, container edge, white label) instead of the old grey glass. The rest of that page's diff is text antialiasing mode (grayscale to subpixel), which Chrome switches when a backdrop-filter layer changes. No layout moved (page heights identical) |

The admin-money desks' primary buttons showed 0 difference: the desks' actions
were already drawn by the console's own classes where the harness shows them.

With the glow step: all page heights identical, differences at most 15 to 40
levels of 255, only on panel edges, halos, plates, the selected row and tab,
and the lit button's bloom and pool. The console and Get started therefore read
"identical anatomy, glow +1 step".

Proofs (JPEG, `docs/design/proofs/session-b/sweep-shared/`):
`overview-390-before-vs-extracted.jpg`, `welcome-doors-390-before-vs-extracted.jpg`,
`escrow-secondary-390-before-vs-shared-glass.jpg`,
`overview-1440-measured-vs-glow-step.jpg`, `welcome-390-measured-vs-glow-step.jpg`,
`switch-on-390-thumb-centred.jpg`.

### The Switch

The thumb carried Tailwind's `-translate-y-1/2` (the CSS `translate`
property) and an inline `transform: translate(x, -50%)`, so it was lifted
twice. Dropped the class. Measured in the production build on `/preview/g1`
at 390: the 52x32 track, thumb 4px from the top and 4px from the bottom on
and off; 5px from the near side and 23px from the far one in both states.
Anatomy: off is the glass door's fill over the well on a blue panel edge with
the lit rim; on is the lit primary's fill, edges and shadow; the thumb has a
1px panel-edge ring (the catchlight when on).

### Checks

tsc clean; eslint clean on every changed TS file; `check-css-tokens` exit 0
(clean, all ten checks) for the first time since TK-1, because the badge's
ten literals moved into tokens and the tokens header no longer names the
deleted light stylesheet; vitest `app/admin`, `app/welcome`,
`components/app/welcome`, `components/ui`: 8 files, 62 tests passed. Shape:
the sweep tool measured no controls on the harness routes (its "0 combinations
measured"), so I measured them: welcome primary and glass 324x56 and 156x56,
radius 14, ratio 0.25; console tabs 44 tall r14 0.32, rail rows 42 tall r14
0.33, child rows r10 0.28, badges r6 0.25; escrow buttons 0.28 and 0.32.
Nothing at or above 0.35.

### Not done or not verified

- Other stylesheets still override `.nf-btn--primary` for their own surface
  (auth.css, landing.css, agent.css, home.css): those are Phase 2 groups'
  to delete. Until they do, those surfaces keep their local primary.
- `.nf-card` (glass.css) is not re-pointed at the panel anatomy: it has
  hundreds of readers and Get started's interest tiles use it; moving it is a
  surface-by-surface decision for Phase 2 (use `Panel`).
- The pool under the primary sits at z-index -1 in the nearest stacking
  context: over a card that is not itself a stacking context the card's fill
  can cover it. Where a sweep worker sees no pool, give the card
  `isolation: isolate`.
- The shared `.nf-btn--primary` lost its press ripple (it needed
  `overflow: hidden`, which clips the pool); the press scale remains.
- The Switch was checked on `/preview/g1` only; `settings-rows.css` had its
  own `.nf-switch` rules, removed by sweep-settings in 790d8c2a.

## 13. Platform sweep: stays (stays, stay detail, trips, restaurants, checkout, held payments; worker "sweep-stays")

Group files (scope ccf594ba): `app/css/stays.css`, `app/css/escrow.css` and the route components:
`app/(app)/{stays,stays/search,stay/[id],trips,restaurants,restaurant/[id],checkout,checkout/[bookingId],escrow,escrow/[id]}/**`,
`components/app/stays/**`, `components/app/escrow/**`. Harness (new, fixture-backed, R-G):
`app/(dev)/preview/session-b/sweep-stays/**`, which re-exports the committed F3 pages for the
routes F3 already draws and adds the stays home, both payment sheets and the three held-payment
faces. The host set-up panels that `stays.css` dresses are shot from the committed `imgc` harness.

#### Inventory, written before any change (23 September)

Owner column: **mine** = a file of this group, swept here. **shared** = Phase 1's layer
(`glass.css`, `buttons.css`, `controls.css`, `Button.tsx`, the new primitives), which lands
everywhere by itself. **other** = another group's file; drawn on my routes, not mine to edit,
listed so the route's status is honest.

**Route 1, `/stays` (stays home, governing FD3DFE84, GOVERNING-09)**

| Visible item | Drawn by | Owner |
|---|---|---|
| greeting, name, logo mark, city row | `components/app/home/CityRow`, route markup (type only) | other (home) / mine (no container) |
| hero plate: title, lede, search field, filter square | `components/app/home/HomeHero`, `home.css` | other (home) |
| four doors (hotels, shortlets, restaurants, nearby) | `components/app/home/CategoryRow`, `home.css` | other (home) |
| featured band head, see all link | `components/app/home/FeaturedBand` | other (home) |
| stay card: glass card, photo, verified mark, example mark, save heart, title, place, rating, price, per night, total, amenity chips, open/closed badge | `components/app/stays/StayCard.tsx` on `.nf-glass--card` (shared) + `.nf-pcard*`, `.nf-stay-card__*`, `.nf-reg-open*` (`catalogue.css`) | mine (markup) / shared (glass) / other (catalogue.css) |
| empty band (EmptyState + primary ButtonLink) | `components/app/Screen`, `Button` | shared |
| loading skeleton | `stays/loading.tsx` on `LoadingShell` + `Skeleton` | mine (no container of its own) |

**Route 2, `/stays/search`**

| Visible item | Drawn by | Owner |
|---|---|---|
| page header, count line | `PageHeader` | other (chrome) |
| search bar: field, go, filter square | `StaySearchBar.tsx` on `.nf-shelf-field*`, `.nf-shelf-square` (`catalogue.css`) | mine (markup) / other (css) |
| category tiles (selected, pressed, focus) | `StayCategoryTiles.tsx` on `.nf-glass--tile` (shared) + `.nf-stays-tile*` (`catalogue.css`; `stays.css` defines a DIFFERENT `.nf-stays-tile` for the host panels, same class name, two recipes) | mine (markup) / shared / other |
| filter sheet: backdrop, grip, head, clear, groups, tiles (3 and 5 wide), price range track and fill, rows, selects, switches, foot and apply | `StayFilterSheet.tsx` on `.nf-filters*`, `.nf-range*` (`catalogue.css`), `nf-icon-btn`, `Switch` | mine (markup) / other (css) / shared |
| result cards | `StayCard` (as route 1) | as route 1 |
| empty (no results) | `EmptyState` + `ButtonLink` | shared |
| loading | `stays/search/loading.tsx` | mine (no container) |

**Route 3, `/stay/[id]` (governing 84054CE9, BB0C2C85)**

| Visible item | Drawn by | Owner |
|---|---|---|
| gallery, counter, back/save/share | `components/app/listing/ListingGallery` | other (listing) |
| lead card: name, place, price row, rating, amenity capsules | `.nf-glass--card` + `.nf-detail-lead` (`catalogue.css`), `DetailPriceRow`, `DetailCapsules` | shared / other |
| about card, host row, message | `DetailAboutCard` | other (listing) |
| dates and party: check in, check out, guests pickers, check availability action, total note | `DetailAvailabilityCard` | other (listing) |
| amenity tiles | `.nf-glass--tile` + `.nf-amenity-tile` | shared / other |
| property type card with glass object | `.nf-stay-type*` (`catalogue.css`) | other |
| room tiles (photo, glass mark, name, count) | `.nf-room-tile*` (`catalogue.css`) | other |
| room types list (rows, role mark, from price) | `RoomTypes.tsx` on `Row`/`RowList`, `.nf-role-mark` (`controls.css`) | mine (markup) / shared |
| rate sheet: rate cards, meal plan, policy line, StatusPill, total, Reserve button | `RoomTypes.tsx`: `nf-card rounded-[var(--nf-radius-lg)] p-card-sm` (**local radius override on the shared card**), `Sheet`, `StatusPill`, `ButtonLink primary` | **mine: sweep** / shared |
| policy panel, house rules | `.nf-detail-panel` (`catalogue.css`) | other |
| loading: two `nf-card rounded-[var(--nf-radius-xl)]` blocks and a hairline list | `stay/[id]/loading.tsx` (**local radius override**) | **mine: sweep** |
| not a stay: falls through to the listing page | `listing/[id]/page` | other |

**Route 4, `/trips`**

| Visible item | Drawn by | Owner |
|---|---|---|
| header, page scene art | `PageHeader`, `PageScene` | other (chrome) |
| spine rule, today marker, hollow marker | `TripSpine.tsx` inline style (a dot and ring, not a container) | mine (keeps: a shape, not a surface) |
| trip row: link hover wash `hover:bg-[var(--nf-glass-fill)]` on `--nf-radius-lg` | `TripSpine.tsx` (**local hover surface**) | **mine: sweep** |
| trip thumbnail plate: 64px `rounded-[--nf-radius-md] bg-[--nf-surface-secondary]` holding a photo or a glass object | `TripSpine.tsx` (**its own icon plate**) | **mine: sweep onto IconPlate** |
| status pills (today, status) | `StatusPill` | shared |
| pay now (`nf-btn nf-btn--primary nf-btn--sm` on a Link), review link, cancel control and its sheet | `TripSpine.tsx`, `components/app/bookings/CancelBookingSheet` | mine (markup) / shared / other (bookings) |
| past disclosure | `Disclosure` | shared |
| empty, loading (`nf-card` blocks) | `EmptyState`, `trips/loading.tsx` | shared / mine (plain shared card, fine) |

**Route 5, `/restaurants`** : header, `StayCard` list with open/closed badge, empty state, loading. Nothing drawn locally; as route 1.

**Route 6, `/restaurant/[id]`**

| Visible item | Drawn by | Owner |
|---|---|---|
| gallery | `ListingGallery` | other (listing) |
| lead card: name, cuisine, open/closed badge, price band | `.nf-glass--card` + `.nf-detail-lead`, `.nf-reg-open*` | shared / other |
| reserve a table form | `listing/[id]/ReserveTable` | other (listing) |
| plates, hours surface, message ButtonLink secondary | `Section`, `Surface`, `ButtonLink` | shared |
| loading: `nf-card rounded-[var(--nf-radius-xl)]` blocks | `restaurant/[id]/loading.tsx` (**local radius override**) | **mine: sweep** |

**Route 7, `/checkout` (room pick)** : room card `nf-card` with hairline `dl`, `ResultScreen` expired state (shared), caption with verified glyph. Container is the shared card; no local recipe.

**Route 8, `/checkout/[bookingId]` (and the payment sheets)**

| Visible item | Drawn by | Owner |
|---|---|---|
| header, page scene, 3 segment progress | `PageHeader`, `PageScene`, `SegmentedProgress` | other / shared |
| summary card, hairline rows, total | `CheckoutSummary.tsx` on `nf-card` | mine (shared card) |
| hold countdown: sunken panel, 44px glass object **with no plate** | `HoldCountdown.tsx` on `.nf-panel-sunken` (`chips.css`) | **mine: sweep glyph onto IconPlate** / other (chips.css) |
| pay method cards (card, saved card, wallet): `nf-card` li, 48px glass object **with no plate** | `PayPanel.tsx` `MethodCard` | **mine: sweep onto IconPlate** |
| saved card picker | `components/app/payments/SavedCardPicker` | other (payments) |
| buttons: pay, pay with saved card, wallet, top up | `Button`, `ButtonLink` | shared |
| action bar with total | `ActionBar` | shared |
| footnote with 20px glass object, closing note `nf-card` with 20px glass object | `checkout/[bookingId]/page.tsx` | mine (inline glyphs, no plate needed at 20px: they are type-sized marks) |
| payment sheets: pending (blocking), still checking, received, failed, card declined, wallet short | `PaymentReturn.tsx`, `PayPanel.tsx` into `components/app/ResultSheet` + `wallet.css` `.nf-result-*` | mine (copy and call) / other (ResultSheet, wallet.css) |
| hold expired / not yours / paid: `ResultScreen` | `ResultSheet` | other |
| loading: `nf-card` blocks | `checkout/[bookingId]/loading.tsx` | mine (plain shared card, fine) |

**Route 9, `/escrow` (held payments list)** and **Route 10, `/escrow/[id]`**

| Visible item | Drawn by | Owner |
|---|---|---|
| agreement card: `.nf-esc-sheet` glass fill, rim, 1px brand ring, drop glow, `--nf-radius-lg` | `escrow.css` (**its own card recipe**) | **mine: sweep onto the shared panel** |
| amount, purpose overline, state word + dot, meaning line | `escrow.css` type roles | mine (type, keeps) |
| payout date box `.nf-esc-when` (thin glass, soft ring, control radius) | `escrow.css` (**its own inset plate**) | **mine: sweep** |
| receipt box `.nf-esc-receipt` | `escrow.css` (**its own inset plate**) | **mine: sweep** |
| evidence row `.nf-esc-filed` with the side stripe | `escrow.css` (**its own inset plate**; the stripe stays, it carries whose) | **mine: sweep plate, keep stripe** |
| actions `.nf-esc-action` ("Open it", "Pay it out now", "Ask to be paid", "Raise a problem", "File it", ...) | `escrow.css`: radius and height only, **no fill, no rim, no bloom: an unlit text control** | **mine: sweep onto Button variants** |
| evidence filer: fields `.nf-esc-field` (raised surface, divider border), file input, fact textarea, date, amount | `escrow.css` (**its own field recipe**) | **mine: sweep onto the shared control well** |
| filer hairline blocks | `escrow.css` | mine (hairlines keep) |
| proposal in a thread `.nf-esc-thread` (raised surface, divider border), who-pays choices | `escrow.css` classes, drawn by `components/app/messages/ProposeHeldPayment.tsx` | **mine (css)** / other (the component is the messages group's) |
| light-theme paper twin (`:root[data-theme="light"]` rules) | `escrow.css` | **mine: delete (dark only)** |
| empty, not found, read failed | `EmptyState` | shared |

**Host set-up panels (`stays.css`, GOVERNING-10 and 11; components are the host wizard group's `components/host/stays/**`)**

| Visible item | Class | Recipe today |
|---|---|---|
| step head segments (done, at) | `.nf-stays-head__seg` | pill track, brand gradient, `0 0 12px --nf-glow-3` (a progress bar: keeps shape) |
| labelled plate | `.nf-stays-plate` | **own card**: `--nf-radius-xl`, brand edge, well fill, rim + `0 0 18px glow-1` |
| input, select | `.nf-stays-input`, `.nf-stays-select` | **own field well**: deep well, soft edge, rim |
| row list | `.nf-stays-list` | **own inset plate** |
| stepper | `.nf-stays-stepper*` | **own control**: control radius, brand edge, deep well |
| tile (place type, policy, band), selected, tick | `.nf-stays-tile*` | **own tile + own selected state** (`tint-2`, `0 0 22px glow-3`) |
| cuisine chip, pressed | `.nf-stays-chip` | **own chip + own lit state** (brand gradient, `0 0 18px glow-3`) |
| rule row | `.nf-stays-rule` | **own card** (`--nf-radius-lg`, rim + `0 0 14px glow-1`) |
| round glyph | `.nf-stays-glyph` | **own icon plate, round** |
| rate card, thumb | `.nf-stays-card`, `.nf-stays-thumb` | **own card** (`--nf-radius-2xl`, rim, glow, bloom) and **own plate** |
| calm note | `.nf-stays-note` | **own card** |
| stars | `.nf-stays-stars` | type colour only |

**Findings from the inventory, before any change.** (1) Every `.nf-esc-action` on `/escrow/[id]`
and in the thread proposal is an UNLIT text control: radius and height only, no fill, no rim, no
bloom, so "Say the work was done", "Choose a file" and "File this" read as loose words (before
shot `escrow-detail-390-before.jpg`). (2) `.nf-stays-tile` is defined twice with two recipes,
`catalogue.css` (the search category tiles) and `stays.css` (the host panels); they never meet on
one page today, but the name collision is a trap. (3) The payment failed and pending sheets draw
their glass object on a visible dark square (`pay-failed-390-before.jpg`); that square is
`ResultSheet`/`wallet.css`, not this group's, and is reported to the lead rather than fixed here.
(4) The stays home, stay detail and restaurant detail are dressed almost entirely by the home and
listing groups' files (`home.css`, `catalogue.css`, `components/app/home/**`,
`components/app/listing/**`); this group can only make them match by what Phase 1 and those
groups ship.

#### Before proofs (23 September, production build, harness, dark, 390 at 2x and 1440 at 1x)
`docs/design/proofs/session-b/sweep-stays/before/<route>-{390,1440}-before.jpg` for: stays,
stays-empty, stays-search, stays-filters (sheet open), stay, trips, restaurants, restaurant,
checkout, pay-pending, pay-failed, escrow, escrow-detail (disputed, filer open), escrow-held,
escrow-released, and the eight host panels (host-hotel, host-room-types, host-rates, host-place,
host-house-rules, host-restaurant, host-tables, host-facilities). All fixture-backed. Horizontal
overflow 0 on every shot.

#### Applied on the shared layer (Phase 1 RELEASED 9da8f86f), 23 September

What moved, item by item from the inventory above (local recipe deleted in the same change):
- **Held payments.** Agreement card `.nf-esc-sheet` -> `Panel variant="card"` (its fill, rim,
  ring and drop glow deleted). Evidence rows `.nf-esc-filed` and the receipt `.nf-esc-receipt` ->
  `Panel variant="card"` (thin glass and soft ring deleted; the whose-it-is stripe kept, redrawn
  inside the card on `--nf-panel-hair` / `--nf-lit`). The objection box and the file-caption box
  -> `Panel variant="card"` (`.nf-esc-form`, layout only). The payout date inside the card is now
  a row under the panel hairline, not a second box. Every `.nf-esc-action` on the two routes ->
  `Button`/`ButtonLink`: "Pay it out now", "Ask to be paid", "Confirm the payout", "Send it to
  Vallo", "File this" are the lit primary; "Open it", "Withdraw it"/"Decline it", "Say what is
  wrong", "Say the work was (not) done", "Choose a file" are the glass secondary; "Remove" is
  ghost. Fields `.nf-esc-field` -> the shared `.nf-field` (the objection textarea had been
  wearing the action class). Light paper twin deleted. What stays in `escrow.css` is type,
  layout, the state dot and the stripe, and the thread proposal's layout.
- **Checkout.** Summary card, room pick card, hold note, the three pay-method cards and every
  loading card: `nf-card` -> `Panel variant="card"` (hairlines on `--nf-panel-hair`). Hold
  countdown: `.nf-panel-sunken` -> `Panel`, its bare 44px glass object -> `IconPlate md`. Pay
  methods: bare 48px glass objects -> `IconPlate lg` (the cards carry `isolation: isolate` so the
  lit primary's pool is not covered, per Phase 1's note).
- **Stay detail.** Rate cards in the room sheet: `nf-card` with a local `--nf-radius-lg` override
  -> `Panel variant="card"` (isolated for the Reserve pool). Room rows: the round `.nf-role-mark`
  -> `IconPlate md`. Loading: two `nf-card` blocks with a local `--nf-radius-xl` -> `panelClass`.
- **Restaurant detail.** Loading cards with a local `--nf-radius-xl` -> `panelClass`.
- **Trips.** Thumbnail: its own 64px `--nf-radius-md` plate on `--nf-surface-secondary` ->
  `IconPlate lg` (the photo fills it; the glass object sits on it when there is no photo); the
  controls' indent follows `--nf-plate-size-lg`. The row's own hover wash on `--nf-glass-fill`
  deleted. Loading cards -> `panelClass`.
- **Host set-up panels (`stays.css`).** Plate, rule row, rate card and calm note -> the panel
  tokens (`--nf-panel-fill`/`-fill-card`, `-edge`, `-edges`, `-rim`, `-glow`,
  `--nf-container-radius`); tiles, chips and the stepper -> the glass door tokens
  (`--nf-btn-glass-*`); every chosen tile and chip -> `--nf-selected-*` (the console's lit
  selection); the round glyph -> the plate tokens at the small rung; the thumbnail -> plate
  tokens; list hairlines -> `--nf-panel-hair`. The classes stay because the host wizard's
  components write them; every local fill, edge, glow and bloom is gone. The field well stays
  until SW-ST2.

- **The held payment in a conversation** (`ProposeHeldPayment.tsx`, unclaimed by any group
  and drawn only by `escrow.css`, so claimed here): its raised-surface block -> `Panel
  variant="card"`; "Set this money aside" and "Propose it" -> lit primary; "Decline it" /
  "Withdraw it", "Open it" and the closed composer -> glass secondary; "Not now" -> ghost; the
  amount field -> `.nf-field`; the who-pays fieldset -> the panel hairline row. The block
  `escrow.css` had been holding for it is deleted: nothing in the file draws a surface now.

Requests in the scope file (subsection "Sweep group: stays"; ids `SW-ST*` because the social
group already uses `SW-S1`): **SW-ST1** closed here (the thread proposal above), **SW-ST2** (host
wizard: `nf-field` on the stays inputs and selects), **SW-ST3** (wallet family: the dark square
behind `ResultSheet`'s glass object on the payment sheets).

#### Audit passes (production build, harness, dark, 390 at 2x and 1440)

**Pass 1, 23 September.** Re-opened every changed route (escrow list, detail disputed, held,
released; checkout; trips; stay; five host panels). Found and fixed: (1) on `/escrow/[id]` the
set-aside sentence and the controls sat hard against the card's lit edge -> `.nf-esc-controls`
and `.nf-esc-sheet + .nf-esc-line` take `--nf-space-sm` of air; (2) the route drew a "Receipt"
heading over nothing whenever the agreement had not settled (the receipt component returns
null) -> the section renders only for RELEASED, REFUNDED, RESOLVED, in the route and the
harness; (3) the chosen-tile tick overlapped the "e" of Flexible -> the title gives up the tick
plus `--nf-space-xs`. (Also found: the first after-shots came from a stale server still holding
the port on the old build; they were discarded and re-shot on the new build.)

**Pass 2, 23 September.** Every route in the group re-shot. Found and fixed: (1) the room rows on
`/stay/[id]` still carried the round `.nf-role-mark` plate beside the square shared plates ->
`IconPlate md`; (2) host tiles wore the panel fill, whose pixel-set ramp is meant for a container
and read wrong at a 48px band tile -> tiles are controls and now wear the glass door like the
chips and stepper. Checked and left: the naira mark's double bar in the band tiles is the glyph,
not a seam.

**Pass 3, 23 September.** Every route re-shot again (`after/*-pass3.jpg`), plus the room rate
sheet opened by a real tap (`stay-rates-sheet-390-pass3.jpg`). Nothing new of this group's
found. Controls measured by hand in the build (drawn radius / short side): escrow and checkout
buttons 51 tall r14 0.28; cuisine chips 44 tall r14 0.32; band tiles 48 tall 0.29; policy tiles
56 tall 0.25; steppers 46 tall 0.30. Shape sweep (`compare-surface --shape-sweep`, dark, 10
routes, 12 combinations measured): **0 breaches**; "worth an eye" only the gallery counter "1/5"
at 0.36 (`ListingGallery`, the listing group's); the host step segments at 0.50 carry no text
(progress bars, allowed).

**The thread proposal (claimed after the group's first push), three passes, 23 September.**
Harness `sweep-stays/escrow-thread` (new: the payer's view of a proposal and the composer, opened
by a real tap and filled). No before shot exists: the component had no harness and the messages
route needs a session; its before state is the old `.nf-esc-thread` recipe (raised surface,
divider border, unlit text buttons), as the inventory records. Pass 1 (`escrow-thread-open-390-
pass1.jpg`): every control on the shared buttons, measured 51 tall r14 0.28; found the who-pays
radios drawn in the browser's grey -> `accent-color: var(--nf-lit)` at 18px. Pass 2 (after a
rebuild; an injected stylesheet was refused by the page's CSP, which is correct): radio lit,
"Propose it" lit once a side and an amount are chosen, the field's focus ring is the shared one.
Pass 3: re-shot with the escrow routes on the same build; nothing further. (In the pass 2 and 3
full-page shots the sticky app header is drawn mid-page where the page had scrolled to the
focused field; that is the screenshot, not the page.)

#### Per-route result

Reference: the console panel, plate and lit primary, and Get started's glass door, as in
`docs/design/proofs/session-b/sweep-shared/`. Before: `before/<route>-*-before.jpg`. After:
`after/<route>-*-pass3.jpg`.

| Route | Status | Container | Edge / rim | Glow | Button | Plate | Match |
|---|---|---|---|---|---|---|---|
| `/escrow` | **swept** | own glass sheet, r18 -> Panel card r10 | 1px ring + rim -> per-side panel edges + catch | own drop glow -> panel halo | unlit "Open it" -> glass secondary | none | yes |
| `/escrow/[id]` | **swept** | sheet, when, receipt, filed, form boxes -> Panel card | as above | as above | 8 unlit actions -> lit primary / glass / ghost | none | yes |
| `/checkout` (room pick) | **swept** | nf-card -> Panel card | panel | panel | shared (ResultScreen) | none | yes |
| `/checkout/[bookingId]` + sheets | **swept in this group's files**; SW-ST3 open on `ResultSheet` | 5 nf-card + sunken panel -> Panel | panel | panel | shared lit primary (pool visible, isolated) | bare glass objects -> IconPlate md / lg | yes, bar SW-ST3 |
| `/trips` | **swept in this group's files**; the Cancel control is `components/app/bookings` | loading nf-card -> Panel | panel | panel | shared | own 64px plate -> IconPlate lg | yes |
| `/stay/[id]` | **this group's items swept** (rate cards, room plates, loading); lead card, about, availability pickers, amenity and room tiles, policy panel are `catalogue.css` / `components/app/listing` (home group) | rate card -> Panel card | panel | panel | shared lit Reserve | role mark -> IconPlate md | yes for this group's items |
| `/restaurant/[id]` | **this group's items swept** (loading); the rest is `catalogue.css` / listing components | loading -> panelClass | panel | panel | shared | none | yes for this group's items |
| `/stays` | **nothing of this group's to sweep**: `StayCard` markup only; material is `catalogue.css` + shared glass, home group | n/a | n/a | n/a | n/a | n/a | depends on home group |
| `/stays/search` | as `/stays`; filter sheet and bar in `catalogue.css` | n/a | n/a | n/a | n/a | n/a | depends on home group |
| `/restaurants` | as `/stays` | n/a | n/a | n/a | n/a | n/a | depends on home group |
| host set-up panels (`stays.css`) | **swept**, bar the field well (SW-ST2) | own plates, r18 / r22 / r32 -> panel tokens r10 | own brand edge + rim-lit -> panel edges + catch | own 14 to 22px glows and bloom -> panel halo / selected shadow | tiles, chips, stepper -> glass door; chosen -> selected | round glyph -> plate tokens | yes |

**Routes swept / routes in group: 5 of 10 fully** (`/escrow`, `/escrow/[id]`, `/checkout`,
`/checkout/[bookingId]` bar SW-ST3, `/trips`), **2 with every item of this group's swept and the
rest owned by the home group** (`/stay/[id]`, `/restaurant/[id]`), **3 with nothing of this
group's to move** (`/stays`, `/stays/search`, `/restaurants`), plus the host panels' stylesheet
swept bar SW-ST2.

Governing images re-checked after the sweep (FD3DFE84, 84054CE9, BB0C2C85, 9F384CFE): this
group changed none of the stays home, the stay lead card or the availability card they govern
(those are the home group's files), and the checkout and rate cards now carry the lit panel and
the plate the move-in ledger 9F384CFE draws (square plates with line glyphs, lit edge, lit
primary with its bloom).

Checks, after `git pull --rebase` and through the heavy lock: whole-project tsc exit 0; whole
vitest 232 files, 3784 passed, 1 skipped; `check-css-tokens` clean (all ten); eslint clean on
every changed TS file; every directory under the harness has its own `page.tsx`. Reflection: inherited from the shared tokens when "shared" ships it;
nothing here restates a sheen.

**Founder's second message, taken in (23 September).** At least three dated audit passes per
route (none of this group's routes is on the five-pass list; the thread booking card is the
messages group's), recorded below as Pass 1, 2, 3 with what each found and fixed. The extra
glow and the glass reflection come ONLY from the shared tokens and primitives Phase 1 ships:
nothing in `stays.css` or `escrow.css` will restate a sheen, rim or glow value. A route closes
only when no old local recipe is left on it; items drawn by another group's file are recorded
per route as not closable here, never as done.

## 13. Platform sweep: settings (settings and every child, notifications, the system pages; worker "sweep-settings")

Group files (scope ccf594ba, claimed in full in the scope file's sweep section): `app/settings-rows.css`,
`app/css/overlays.css`, `app/css/system.css`, and the route components `app/(app)/settings/**`,
`app/(app)/notifications/**`, `components/app/account/**`, `components/app/push/**`,
`app/(app)/legal/**`, `app/offline/SystemMoment.tsx`, `app/not-found.tsx`,
`app/error.tsx`, `app/(app)/error.tsx`, `app/loading.tsx`. By the lead's ruling the notifications
anatomy (`.nf-notif*`) moves out of `home.css` into `app/(app)/notifications/notifications.css`.
Governing images: settings `7F96BE6C` (root copy in `docs/design/references/`); the notification
centre panel of `roles/GOVERNING-12`. Harness (new, fixture-backed, R-G):
`app/(dev)/preview/session-b/sweep-settings/` (`?v=` one view per route and inner state, inside the
real `AppShell`, signed in). Every settings route and `/notifications` sit behind the sign-in gate
(checked: 307 to `/sign-in` on this server), so every shot of them is FIXTURE-BACKED; `/offline` is
the real route. Shot script: `scripts/design/session-b-shots/sweep-settings.mjs --phase before|after`.

#### Inventory, written before any change (23 September)

Owner column: **mine** = a file of this group, swept here. **shared** = Phase 1's layer
(`glass.css` `.nf-card`/`.nf-glass--*`, `buttons.css` `.nf-btn*`, `controls.css`, `Button.tsx`,
`Switch.tsx`, `Sheet.tsx`, the new primitives), which lands everywhere by itself. **other** = another
group's file, drawn on my routes, listed so each route's status is honest.

**Route 1, `/settings` (hub, governing 7F96BE6C)**

| Visible item | Drawn by | Owner |
|---|---|---|
| back square | `BackButton` (`nf-icon-btn`) | other (chrome) / shared |
| headline, lede | `.nf-hub-head*` (`settings-rows.css`), type only | mine (no container) |
| profile card: container, avatar ring with bloom, name, verified tick, email, chevron | `SettingsHub.tsx` `.nf-card.nf-hub-profile` + **local lit-edge override** (`settings-rows.css` "THE LIT EDGE": `--nf-brand-edge` border, `--nf-glow-edge`, floor inset, `--nf-bloom-card`) + **own radius** `--nf-radius-xl`; avatar ring **own gradient border and glow** `.nf-hub-profile__avatar` | **mine: sweep** |
| hub group: container | `SettingsGroup` `.nf-sgroup__body.nf-card` + **own radius** (`--nf-radius-xl`, doubled selector) + **the same local lit-edge override** | **mine: sweep** |
| six rows: glyph slot 38px with glass object, label, sub, value, chevron, hairline rail, hover, focus ring | `rows.tsx` `.nf-srow*`, `.nf-hub .nf-srow*` | mine (rows; no container of their own; icon slot is the plate question, see note A) |
| Verified value with emerald tick | `.nf-hub-value--ok` | mine (type) |
| Notifications switch, on/off word, disabled while saving, save error alert | `RowSwitch` -> `Switch.tsx` (`.nf-switch` material in `controls.css`; **duplicate dead `.nf-switch`/`__knob` rules in `settings-rows.css`**) | shared / **mine: delete dead copy** |
| language row (native select, chevron turned right) | `LanguageRow` `RowSelect` | mine |
| payment methods block: head plate, Add button, card row with Verve plate, Default badge, bank row with plate, Verified badge, add sheet | `PaymentMethodsPanel.tsx`, `AddBankAccountSheet.tsx`, `wallet.css` `.nf-pay-*`, `.nf-glyph-tile`, `.nf-rows-sheet` | other (wallet family, lead ruling) / sheet CSS mine |
| Log Out group | `LogOutRow` `SettingsGroup` + `RowButton` | mine (as hub group) |
| loading skeleton | `settings/loading.tsx`: `nf-card p-md` + `Skeleton` | mine (uses shared card, no override) |

**Route 2, `/settings/account`**

| Visible item | Drawn by | Owner |
|---|---|---|
| page header with back square, title, sub | `PageHeader` | other (chrome) |
| group labels, notes | `.nf-sgroup__label`, `__note` | mine (type) |
| Account group (payment methods row, signed-in value, sign out row, sign-out error) | `AccountSection.tsx` on `SettingsGroup` | mine (group container as route 1) |
| Delete my account button | `DeleteAccountPanel.tsx` `Button variant="danger"` | shared |
| delete blockers panel | `DeleteAccountPanel.tsx:157` **inline** `rounded-[--nf-radius-md] border-[--nf-border-subtle] bg-[--nf-surface-raised] p-md` | **mine: sweep** |
| deletion scheduled panel, restore button, restore error | `DeleteAccountPanel.tsx:248` **inline** error-edged box | **mine: sweep** (a state tone on the shared panel) |
| delete flow (full-screen layer): scrim, surface, title, close square, "what happens" card, bullet dots, confirm form card, password field, email code button, phrase field, field errors, error box, cancel and delete buttons, done card | `DeleteAccountPanel.tsx:348-560`: **own scrim** (`bg-[--nf-overlay-backdrop] backdrop-blur-sm`), **own surface** (`bg-[--nf-surface-primary]`), `nf-card` x3, `nf-field`, `Button`, **inline error box** (`:535`) | **mine: sweep** |
| Where you are group (place rows, interests row) | `PlaceCard.tsx`, `InterestsCard.tsx` on `SettingsGroup` | mine |
| Search group (default area select, currency value, distances select) | `SearchCard` in `SettingsGroups.tsx` | mine |

**Route 3, `/settings/notifications`**

| Visible item | Drawn by | Owner |
|---|---|---|
| channels group, four switches, saved/error note | `AccountNotificationsCard` (`AccountToggles.tsx`) on `SettingsGroup`, `RowSwitch` | mine / shared switch |
| On your phone: push setting card, turn on button, states | `PushSetting.tsx`: `nf-card`, `nf-btn nf-btn--sm nf-btn--ghost` (hand-written class string, not `Button`) | mine (markup) / shared |
| push device rows, stop one (armed turns danger), stop all, outcome line, unreadable card | `PushDevices.tsx`: `nf-card p-card` rows, hand-written `nf-btn` strings | mine (markup) / shared |

**Route 4, `/settings/privacy` (privacy and security)**

| Visible item | Drawn by | Owner |
|---|---|---|
| privacy group (hide activity, data saver switches, note) | `AccountPrivacyCard` | mine |
| security group (sign-out-everywhere switch, signed-in-on value, row buttons), devices row | `SecurityCard`, `DevicesRow` | mine |
| data group (export, clear rows) | `DataCard` | mine |

**Route 5, `/settings/payments`**: page header (stacked), the payment methods block (other, wallet), the
cards note (type), signed-out empty state (`EmptyState` + `EmptyActions`, shared), loading
(`payments/loading.tsx`: `nf-card` with **own radius override** `rounded-[var(--nf-radius-xl)]`,
hairline list) = **mine: sweep** (the loading card).

**Route 6, `/settings/help`**

| Visible item | Drawn by | Owner |
|---|---|---|
| support chat card, topic chips, answer panel, my bubble, their bubble, typing dots, composer field, send button, contact row, handoff boxes (x2) | `SupportChat.tsx`: `nf-card p-card`, `nf-chip`, **inline** answer panel (`:396` own radius and border), **inline** bubbles (`:431`, `:478`, `:585` `rounded-2xl` plus own fills), **inline** handoff boxes (`:607`, `:682` own brand-tint fill and edge), send `Button` with **own radius** (`:526`) | **mine: sweep** |
| About group (help, terms, privacy, version, licences) | `SettingsGroup` + `RowLink`/`RowValue` | mine |

**Route 7, `/settings/appearance`**: Appearance group (text size select, reduce motion, sound
switches), language row = `AppearanceCard`, `LanguageRow` on `SettingsGroup` = mine.

**Route 8, `/settings/devices`**: intro, device cards (`nf-card p-card`), end-this / end-others
buttons (hand-written `nf-btn nf-btn--sm` strings that turn danger when armed), outcome line,
unreadable card, signed-out card with glass object and primary link = `DeviceList.tsx`, page = mine
(markup on shared card and button classes).

**Route 9, `/settings/place`**: form card (`nf-card p-lg`), state, local government and occupation
pickers (`PlaceFields`, other: auth/place), save button (hand-written `nf-btn nf-btn--primary`),
**inline** error box (`PlaceForm.tsx:75`), states-unavailable card, signed-out card, loading = mine
(error box: **sweep**).

**Route 10, `/settings/interests`**: card (`nf-card p-lg`) around `InterestChoices` (other, welcome),
signed-out card, loading = mine (no override).

**Route 11, `/notifications` (governing GOVERNING-12 panel 3)**

| Visible item | Drawn by | Owner |
|---|---|---|
| header: back, title, unread count line, Mark all read | `LiveNotifications.tsx`, `PageHeader`, `Button` | mine / shared |
| section head New / Earlier with count plate | `.nf-notif__head`, `.nf-notif__count` (**own fill** `--nf-brand-tint-2`) | **mine: sweep** (moves from `home.css`) |
| list card | `.nf-glass.nf-glass--card.nf-notif__list` | shared material, mine (layout) |
| row, unread tint, hover, press | `.nf-notif__row` (**own radius and tint**) | **mine: sweep** |
| glyph plate, unread plate lit | `.nf-glass--tile.nf-notif__tile` + **own size, radius**, **own unread edge/glow** (`--nf-brand-edge-strong`, `--nf-glow-edge-strong`) | **mine: sweep onto the shared IconPlate** |
| title, body, time, unread dot | type, `.nf-notif__dot` (shape, own glow) | mine |
| empty state (primary ButtonLink) | `EmptyState` | shared |
| signed-out and unreachable states | `EmptyState`, `Unreachable`, `PageScene` | shared / other |
| loading skeleton | `notifications/loading.tsx`: `nf-card nf-notif__list` | mine |

**Route 12, the system pages (`/offline`, not found, the two error boundaries, the root wait) and
the in-app legal reader (`/legal/terms`, `/legal/privacy`)**

| Visible item | Drawn by | Owner |
|---|---|---|
| aurora plate, lockup, wordmark | `.nf-system__plate`, `__icon`, `__wordmark` | mine (art, no container) |
| system card: fill, border, rim, glow, specular | `.nf-system__card` (`system.css`): **own full recipe** (58% canvas fill, `--nf-glow-brand-rim` border, six-layer shadow, `--nf-glass-specular` ::before, `--nf-radius-2xl`) | **mine: sweep** |
| 404 numeral, overline, title, body, reference, status line, aside | type | mine |
| search field with glyph, Search and Back to home buttons | `.nf-field`, `Button`/`ButtonLink` | shared |
| podium ring and pool | `.nf-system__podium` (shape art from the sign-in render) | mine (keeps, see note B) |
| root wait: mark, search stand-in, grid of skeletons | `.nf-wait__pill`: **own container** (brand edge, glass fill, `--nf-glow-edge`, `--nf-elev-1`) | **mine: sweep** |
| legal contents card | `.nf-legal__toc`: **own container** (brand edge, glass fill, blur, `--nf-glow-edge`, specular, `--nf-radius-xl`) | **mine: sweep** |
| legal prose, sections, back-to-top, foot | type and hairlines | mine |

**Overlays (`overlays.css`), drawn on every group's routes**

| Visible item | Drawn by | Owner |
|---|---|---|
| side drawer panel and scrim | `.nf-drawer`, `--left`, `--right`, `.nf-drawer-scrim`: **own glass fill, own `--nf-glow-edge-strong` edge, own radius** | **mine: sweep** (the drawer's CONTENTS are the chrome group's) |
| bottom sheet: backdrop, surface, grip, body | `.nf-sheet*` (`components/ui/Sheet.tsx`): **own fill (88% elevated), own conic stride edge, `--nf-elev-3-rim`** | **mine: sweep** |
| rows sheet (payments and profile sheets) | `.nf-rows-sheet*` (`settings-rows.css`): **own fill, own border, own radius, own close square** | **mine: sweep** |

Dead code found in the inventory (to delete while sweeping): `.nf-switch`, `.nf-switch__knob`
(the switch primitive's material is `controls.css`; these lose the cascade and its thumb class is
`__thumb`) and `.nf-segment*` (no markup since `RowSegment` became `Segmented`) in `settings-rows.css`.

Note A, the row glyph. `7F96BE6C` draws one glass tile per hub row. The hub passes pack objects that
carry their own tile (`BrandIcon` at 38), so the row slot must NOT draw a second one (ledger history
in `settings-rows.css`). The shared IconPlate applies to the stroked-glyph rows on the child pages only
if the reference draws plates there; the account screens' rows are stroked line glyphs with no plate
in the render family, so they stay line glyphs.

Note B, the podium. The system card stands on the sign-in render's podium; it is art, not a
container, and stays.

Found while inventorying, not mine (reported to the lead 23 September): `components/ui/Switch.tsx`
lifts the thumb twice (Tailwind `-translate-y-1/2` plus an inline `translate(x, -50%)`), so on every
switch in the product the knob sits 8px above the top of its track (measured 390, hub: track 52x32,
thumb top -8, expected +4). Visible in `before/hub-390.jpg`.

#### Before proofs (23 September, fixture-backed harness except `/offline`)

`docs/design/proofs/session-b/sweep-settings/before/`, each at 390 (2x) and 1440: `hub`, `account`,
`delete-sheet`, `delete-scheduled`, `notification-prefs`, `privacy`, `payments`, `help`,
`appearance`, `devices`, `place`, `interests`, `inbox`, `inbox-empty`, `terms`, `error`,
`loading-settings`, `loading-payments`, `loading-place`, `loading-interests`, `loading-inbox`,
`offline` (real route), `not-found` (unknown path under the harness, real 404). 46 shots.

#### Applied (23 September, on Phase 1 as released at 9da8f86f)

What moved onto the shared layer, and what was deleted with it:

- **Every settings group** (`SettingsGroup`): `.nf-card` plus a local radius (`--nf-radius-xl`) plus the
  local "LIT EDGE" block (brand edge, `--nf-glow-edge`, floor inset, `--nf-bloom-card`) became
  `.nf-panel.nf-panel--card`; the radius rule and the lit-edge block are deleted. The group keeps only
  `padding: 0; overflow: hidden`.
- **The profile card** on the hub: same, `.nf-panel.nf-panel--card`; its radius override deleted.
- **Every row glyph** on every settings screen: `RowGlyph` draws the shared `IconPlate` (sm, 36px, r6,
  brand; error tone on a danger row) around a line glyph at 20. The hub's pack objects with baked
  tiles (`person-card`, `bell-tile`, `shield-check-tile`, `globe`, `headset`) and the hub-only 38px
  slot are gone; `UiIcon` `user` and `bell` plus a new `components/app/account/SettingsGlyph.tsx`
  (ticked shield, globe, headset, log-out door, the four `UiIcon` lacks) draw the render's glyphs.
  Log Out now carries the render's door glyph.
- **The rows sheet** (`.nf-rows-sheet`): own surface, border, 2xl corner and rung-3 rim replaced by the
  panel tokens with the panel blur and the container corner; the lit round close became the shared
  `.nf-icon-btn` square.
- **The bottom sheet** (`.nf-sheet`, `components/ui/Sheet.tsx`'s material, in `overlays.css`): own
  88% elevated veil, conic stride border and rung-3 rim replaced by the panel tokens and blur.
- **The side drawer panel** (`.nf-drawer`, `--left`, `--right`): own veil, `--nf-glow-edge-strong`
  ring, rung-4 rim and 2xl corner replaced by the panel tokens and blur, the container corner and a
  rung-4 lift. Its contents stay the chrome group's.
- **The system card** (offline, not found, both error boundaries): its whole own recipe (58% canvas
  fill, `--nf-glow-brand-rim` border, six shadows, specular `::before`, 2xl) deleted;
  `SystemMoment` draws `.nf-panel.nf-panel--glass`.
- **The root wait's search stand-in** and **the legal contents card**: own edges, fills, glows,
  specular and corner deleted; both drawn as `.nf-panel`.
- **The notifications screen** (moved out of `home.css` first, byte-identical, 790d8c2a): one glass
  card with rules became one panel per notification as GOVERNING-12 draws it; the resized
  `.nf-glass--tile` became `IconPlate` md; the unread row wears the `--nf-selected-*` edge and
  shadow instead of a local tint and a local strong glow; the skeleton follows.
- **Every other card in the group** (`nf-card` in DeviceList, PushDevices, PushPrompt, SupportChat,
  place, interests, devices, the delete flow, the six loading skeletons) became
  `.nf-panel.nf-panel--card`; the inline boxes (delete blockers, deletion scheduled, the two error
  boxes, the support answer panel and both handoff boxes) lost their own radius, border and fill and
  became panels (the error ones keep a rose edge as their state); the payments skeleton's radius
  override and the support send button's radius override are deleted.
- **Buttons**: every primary here already went through `Button` or `.nf-btn--primary` and takes the
  lit bar from Phase 1 with no change. The device and push actions (hand-written `nf-btn--ghost`)
  became the glass secondary (`nf-btn--glass`), which is what the console gives a card's action.
- **Dead code deleted**: `.nf-switch`, `.nf-switch__knob`, `.nf-segment*` in `settings-rows.css`.
- **Kept on purpose**: the avatar ring on the profile card (an avatar, round by law), the unread dot,
  the podium under the system card (art from the sign-in render), the delete flow's full-screen layer
  (a screen, not a container), chat bubbles in the support chat (the messages group's anatomy).

Files changed: `app/settings-rows.css`, `app/css/overlays.css`, `app/css/system.css`,
`app/(app)/notifications/{notifications.css,LiveNotifications.tsx,loading.tsx}`,
`app/(app)/settings/{SettingsHub.tsx,DeleteAccountPanel.tsx,loading.tsx,devices/*,place/*,interests/*,payments/loading.tsx}`,
`components/app/account/{rows.tsx,SettingsGlyph.tsx (new),SupportChat.tsx}`,
`components/app/push/{PushDevices.tsx,PushPrompt.tsx,PushSetting.tsx}`, `app/offline/SystemMoment.tsx`,
`app/loading.tsx`, `app/(app)/legal/{LegalDocument.tsx,terms/loading.tsx,privacy/loading.tsx}`.

#### Per-route result

Container / edge / rim / glow / button / plate. "ref" is the console panel (`.nf-panel`, 10px, per-side
lit edge, catchlight, glow +1 step) and plate (`.nf-plate`); "match" means the built element IS the
shared primitive, not a copy of its values.

| Route | Status | Container before -> after | Plate before -> after | Buttons | Match |
|---|---|---|---|---|---|
| `/settings` (hub) | swept | `.nf-card` 22px + local lit edge -> panel card 10px | pack tile artwork 38px -> IconPlate sm 36 r6 + line glyph 20 | switch: shared, thumb now centred (Phase 1) | yes, except the payment methods block (wallet family, not swept here) |
| `/settings/account` | swept | as hub | bare stroked glyph -> IconPlate sm | danger button shared; delete panels -> panel | yes |
| delete flow (sheet, scheduled, done, form, errors) | swept | `nf-card` + inline boxes -> panel card (rose edge on the two alerts) | n/a | shared primary, danger, ghost | yes |
| `/settings/notifications` | swept | groups and push cards -> panel card | IconPlate sm | device actions ghost -> glass; prompt primary lit | yes |
| `/settings/privacy` | swept | as hub | IconPlate sm | switches shared | yes |
| `/settings/payments` | partly | skeleton card -> panel; the block itself is the wallet family's | n/a | n/a | the block: not mine, still `.nf-card` 22px |
| `/settings/help` | swept | support card, answer panel, handoff boxes -> panel; about group -> panel | IconPlate sm | send button override deleted | yes (bubbles kept, see above) |
| `/settings/appearance` | swept | as hub | IconPlate sm | n/a | yes |
| `/settings/devices` | swept | device cards -> panel card | n/a | ghost -> glass | yes |
| `/settings/place` | swept | form card, error box -> panel | n/a | lit primary (shared) | yes |
| `/settings/interests` | swept | card -> panel | n/a | chips are the welcome group's | yes |
| `/notifications` | swept | one glass card -> a panel per row (GOVERNING-12) | glass tile -> IconPlate md | Mark all read (shared ghost) | yes; the render's filter tabs are Session A's (R5, the lister's notification centre) |
| offline, not found, error boundaries | swept | own card recipe -> panel glass | n/a | shared primary and glass | yes |
| root wait, legal reader | swept | own containers -> panel | n/a | n/a | yes |
| rows sheet, bottom sheet, side drawer | swept (material) | own surfaces -> panel tokens + blur + lift | n/a | close: own circle -> shared square | yes |

Routes swept: 18 of 19 (every route and state above but the payments block, which the lead gave to
the wallet family; `/settings/payments` is otherwise swept).

Governing-image comparison, hub at 390 against `7F96BE6C` (screen 658px wide in the render, so
1 CSS px = 1.69 image px; built values measured in the production build):

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| container corner | 18 image px = 10.7 | 10px (`--nf-container-radius`) | yes |
| container edge | bright 1px blue, brighter along the top | 1px per-side panel edges, catchlight inset, halo | yes |
| icon plate | 55 image px = 33, corner about 10 = 6 | 36 x 36, r6, lit rim, inner light, glow | yes (3px larger, the shared sm rung) |
| row glyph | 30 image px = 18, white line | 20, white line, `--nf-plate-glyph-glow` | yes |
| row height | 79 image px = 47 | 60 | no: the rows keep the 56px floor and the platform's readable type |
| title | about 42 image px = 25, heavy | 24.6px / 800 | yes |
| profile name / email | about 27 / 22 image px = 16 / 13 | 17 / 700, 14 | yes, within a px |
| row label / sub / value | about 17 / 14 / 15 image px = 10 / 8.3 / 9 | 14 / 650, 12, 13 / 600 | no, deliberately: the render's type is under the platform's 12px floor |
| switch | lit capsule, white thumb, centred | 52 x 32 lit bar, thumb 4px from top and bottom | yes |
| Verified value | emerald word and tick | emerald word and tick | yes |
| payment methods block | lit panel, Verve plate, filled badges | wallet's block, still `.nf-card` 22px | no (wallet family) |
| Appearance row | present (Dark) | absent | no, deliberately: light mode is gone, so the row has no choice to offer |

#### Audit passes

**Pass 1 (23 September, production build, harness).** Re-opened all 23 views at 390 and 1440.
Found: (1) "What you do / Product designer" pushed its chevron onto a second line, because the plate
slot grew 8px (28 to 36); fixed by lowering the label column's floor from 7.5 to 6.5rem.
(2) The push prompt, now on a padded panel, showed its heading and list as unstyled browser type;
fixed with the platform's title, body and list type and a button row. (3) The device and push
actions were bare ghost text inside lit cards; moved to the glass secondary. Switch thumb
re-measured: track 52 x 32, thumb at 4px from the top (was -8 before Phase 1), on the hub and on all
four notification switches. Shape measured myself on every view at 390 and 1440 (the tool measured
2 combinations): every text control at or under 0.32; panels r10; plates 36 r6 (rows) and 44 r10
(inbox); the only ratio over 0.35 is the header's round monogram avatar (chrome, an avatar).

**Pass 2 (23 September, rebuilt).** Re-shot all views. Pass 1's three fixes hold. Added the states
the first two passes had not photographed: the side drawer open, the rows sheet (Add a payment
method, This card) and a bottom sheet (the wallet's top up, the one `.nf-sheet` reachable from a
harness). Found: (4) the danger row "Remove this card" drew its glyph on a blue plate beside rose
text; fixed with the plate's error tone on danger rows. (5) The rows sheet's close square sat in the
middle of the title: `.nf-tap` in `base.css` is unlayered and set `position: relative` over the
close's absolute placement. This was true of the old round close as well (it predates the sweep).

**Pass 3 (23 September, rebuilt).** Removed `nf-tap` from the close (the shared square is already
44px); measured the close at x 343, 12px from the edge, vertically centred in the head. Found
(6): the hub's back control was the shared `BackButton`'s bare 20px arrow (the tool's one "round
icon-only" finding), where `7F96BE6C` draws a glass square and every child page's `PageHeader`
draws one; the hub now passes `nf-icon-btn nf-icon-btn--glass h-11 w-11` to it (44 x 44, control
radius, ratio 0.32), the component itself untouched. Re-shot
everything (54 shots) and drew the 27 side-by-sides (before, after, console reference, and the
governing render for the hub and the inbox). Nothing further found on the group's own surfaces.
Open at the close of Pass 3: the payment methods block (wallet family) and the header avatar
(chrome).

#### Shape sweep (the tool, dark, 390 and 1536, 15 routes)

BREACHES 0; WORTH AN EYE 0; ROUND ICON-ONLY 2 (the hub's back arrow, 20x20 at 390 and 1536: the
shared `BackButton` draws a bare arrow; fixed in Pass 3, see there); ROUTES REFUSED 0; "2 route/width/theme combination(s) actually
measured", so the numbers above from my own measurement are the proof, not this line.

#### Checks

Whole-project `tsc` clean; `check-css-tokens` adds nothing (its one finding at the time is a path
comment in the sweep-social harness, not this group's); whole vitest: see the commit; eslint on the
changed files: 0 errors (existing `set-state-in-effect` warnings in PlaceForm and SupportChat, on
untouched lines).

#### Proofs

`docs/design/proofs/session-b/sweep-settings/before/` (46), `after/` (54, adds drawer, rows sheet x2,
bottom sheet), `side-by-side-<view>.jpg` (27). All fixture-backed harness shots except `/offline`.

#### Not swept or not verified, honestly

- The payment methods block on `/settings` and `/settings/payments` (wallet family, lead's ruling).
- No before shots of the drawer and the three sheets: they were added in Pass 2, after the old
  build was gone; their before anatomy is the inventory's code description.
- `.nf-sheet` was only photographed through the wallet harness; the other readers of
  `components/ui/Sheet.tsx` (listing, price, disclosure) inherit the same rule but were not shot.
- The notification centre's filter tabs in GOVERNING-12 do not exist; that feature is Session A's.
- `components/app/account/ProfileIdentityCard.tsx` (no reader today) is NOT swept: the profile worker
  is removing its email change affordance on the founder's order, and the lead asked this group to
  wait for that to land. It still draws `.nf-card`.

## 13. Platform sweep: chrome (side drawer, dock and switch sheet, app header, host wizard, agent workspace, landing and site pages; worker "sweep-chrome")

Scope (SESSION_B_SCOPE, "THE WIDE PLATFORM SWEEP"): `app/css/chrome.css`,
`app/side-nav.css`, `app/css/agent.css`, `app/css/landing.css`,
`app/css/site.css`, `app/css/chips.css` and the components they style.
Governing images: `roles/GOVERNING-01` (home, dock, switch sheet, drawer),
`BCD39CA8` (drawer), `GOVERNING-landing-desktop-hero.png` and
`founder/landing-fullpage-target.png` (landing), `roles/GOVERNING-02` to `11`
(host and supplier flows). The dock keeps its five slots and destinations
(Home, Search, the switch in line, Feed, Profile); nothing here moves them.

### 13.1 Inventory (written before any change, 23 September)

Method: every rule in the six stylesheets that sets `background`,
`box-shadow`, `border`, `border-radius`, `backdrop-filter` or `filter` was
listed with a comment-stripping parser (`scratchpad/blocks.mjs`), every
component of the group was grepped for the classes it draws and for inline
`style={{ background }}`, Tailwind `rounded-*`, `bg-*` and `shadow-*`, and every
route was shot at 390 and 1440 (13.4). "Local" means the rule paints its own
material instead of reading a shared primitive. "Other owner" means the thing
is drawn on my routes by a stylesheet another group or Phase 1 owns; I do not
edit it and it is listed so the route's coverage is honest.

**A. The app header (`AppShell.tsx`, chrome.css).** Every signed-in and
signed-out app route.
| Item | Drawn by | Local material | Owner |
|---|---|---|---|
| Header bar, resting | `.nf-app-header` transparent | none | mine |
| Header bar, scrolled | `.nf-app-header[data-scrolled]`: brand-tint 1 over canvas 88%, strong blur, `--nf-glow-edge` | local glass fill + edge | mine |
| Menu button, bell button | `.nf-icon-btn` (controls.css / buttons.css) + `.nf-app-header__btn` position only | shared | Phase 1 |
| Unread dot on the bell | `.nf-app-header__dot` rose dot, canvas ring | shape (dot), keeps | mine |
| Avatar | `.nf-app-header__avatar`: brand gradient disc, canvas ring, brand-edge ring, 14px glow-2 | local ring and glow (round is allowed: avatar) | mine |
| Wordmark and mark | `.nf-logo*` | type only | mine |

**B. The dock (`MobileTabBar.tsx`, chrome.css).** Five slots, every app route
below 64rem.
| Item | Drawn by | Local material | Owner |
|---|---|---|---|
| Dock bar | `.nf-tabbar`: brand 10% over canvas 92%, `--nf-brand-edge-soft` 1px, `--nf-radius-xl`, strong blur, `--nf-glow-edge` + floor + `0 10px 40px -12px glow-3` + lifted shadow | local panel material, radius xl (not the 10px container) | mine |
| Active slot plate | `.nf-tabbar__pill`: side accent 10%, inset rim-thin, control radius | local selected state | mine |
| Slot link, label, icon | `.nf-tab__link`, `__label` 11px/600, `__icon`; active colour brand-secondary + text-shadow, icon drop-shadow glow-3 | local active glow | mine |
| The switch in line | `.nf-switch-dock` 38px on control radius, brand colour; its plate `nf-switch-mark` | size mine; plate in controls.css | mine / Phase 1 |
| Dock island (standalone button, Around) | `.nf-dock-island`: canvas 90%, brand edge, blur, glow-edge; `border-radius: pill` on a 56px icon-only circle | local | mine |
| Hidden on keyboard, reduced motion, no-blur fallback | `.nf-dockrow[data-dock-hidden]`, `@supports not` fallbacks | behaviour | mine |

**C. The switch sheet (`ProfileSwitcher.tsx`).** Opened from the dock switch.
| Item | Drawn by | Owner |
|---|---|---|
| Sheet panel, grabber, head, close | `.nf-sheet*` (overlays.css) | settings group |
| Profile rows, divider | `.nf-row`, `.nf-row--tap`, `.nf-row-divider-lead` (controls.css, utilities.css) | Phase 1 |
| Row plates (photo, owner, agent, firm, add) | `.nf-switch-mark*`, `.nf-switch-add` (controls.css) | Phase 1 |
| Standing badge ("Verified", "Pending review") | `.nf-switch-standing` colour only in chrome.css; badge body is `.nf-badge` (chips.css) | mine |
| Selected tick | UiIcon | shared |

**D. The side drawer (`AppRail.tsx`, `NavTree.tsx`, side-nav.css) and the
desktop rail.**
| Item | Drawn by | Local material | Owner |
|---|---|---|---|
| Drawer panel and scrim | `.nf-drawer`, `.nf-drawer-scrim` (overlays.css) | | settings group |
| Rail column (>= 64rem) | `.nf-nav--rail`: surface-primary, 1px subtle right border | local flat column (no lit edge) | mine |
| Close button | `.nf-nav__close` md radius, glass-fill hover | local hover | mine |
| Person card (drawer) | `.nf-nav__who--card` + `nf-glass nf-glass--card` (glass.css) | shared glass, local padding | mine + Phase 1 |
| Avatar in a lit ring | `.nf-nav__who--card .nf-nav__avatar` 60px, 3px brand rim, glow 24 + 48 | avatar (round allowed), local glow | mine |
| "View profile" capsule | `.nf-nav__whocta`: xs radius, brand edge, brand tint 1 fill | local secondary control | mine |
| Rail person row | `.nf-nav__who`: md radius, subtle border, glass-fill-thin | local | mine |
| Section heading ("WORKSPACES") | `.nf-nav__heading` | type only | mine |
| Nav rows (rail) | `.nf-nav__row` lg radius, glass-fill-thin hover | local hover | mine |
| Open row (rail) | `.nf-nav__row--on`: brand 20% flat fill | local selected (flat, not lit) | mine |
| Nav rows (drawer), chevron | `.nf-nav--drawer .nf-nav__row` lg radius, `::after` chevron corner | local | mine |
| Open row (drawer) | `.nf-nav--drawer .nf-nav__row--on`: brand to accent gradient, lit-ink rim, glow 20 + 48 | local lit primary | mine |
| Count badges (Messages, Notifications) | `.nf-nav__badge`: xs radius, brand fill | local filled badge | mine |
| Agent-mode rows and badges | `.nf-nav__scroll--agent` mode-agent tints | local | mine |
| The Flip card ("Switch to Stays") | `SideSwitch` + `.nf-side-switch` (side-flip.css; spacing only in side-nav.css) | | not claimed by any group: request SW-C1 |
| Legal row | `.nf-nav__legal` divider + type | none | mine |
| Theme control | `.nf-nav__theme` rules | DEAD: the component was deleted with light mode | mine, delete |

**E. The host flow (`components/host/**`, `app/host/**`, agent.css).**
Routes `/host`, `/host/start`, `/host/apply`, `/host/rooms`, `/host/photos`,
`/host/reservations`, `/host/transfer`. All are behind the sign-in gate
(`proxy.ts` PUBLIC_SEGMENTS has no `host`), so a stranger is sent to
`/welcome`; proofs come from the committed `f5`, `c2` and `imgc` harnesses.
| Item | Drawn by | Local material | Owner |
|---|---|---|---|
| Host top bar | `nf-glass nf-glass--chrome` (glass.css) | shared | Phase 1 |
| Page head ("Host", "Rooms") | `.nf-agent-head__title` 800 display h1 | type | mine |
| Door / choice rows (StaysDoors, wizard host type, standing) | `.nf-host-choice`: lg radius, brand edge, well fill, rim-lit + 16px glow-1; selected: edge strong, glow-3 22 + bloom-card | local card and selected state | mine |
| Choice plate (glass object) | `.nf-host-choice__mark` 36px bare BrandIcon | no plate | mine |
| Choice radio ring | `.nf-host-choice__ring` circle, brand fill when on | shape (ring) | mine |
| Field groups (business, registration, representative, payout, consent) | `.nf-host-group`: xl radius, brand edge, well fill, rim-lit + 18px glow-1 | local panel | mine |
| Upload drop zone, done state | `.nf-host-drop` lg radius dashed edge, well fill; `--done` emerald edge | local | mine |
| Missing-items list rows | `.nf-host-missing` hairline rows | none | mine |
| Wizard foot (Back, Next) | `Button` primary / glass | shared | Phase 1 |
| Saved note | `.nf-host-saved` | type | mine |
| Every `.nf-card` inside `.nf-host` (reservations board, standing) | `.nf-host .nf-card` override: well fill, brand edge, rim-lit + 18px glow-1 | local override of the shared card | mine |
| Badges inside host | `.nf-host .nf-badge` radius override | local | mine |
| Status pills | `StatusPill` | shared | Phase 1 |
| Facilities chips | `.nf-chip` (chips.css) | chip | mine |
| Drawn stays steps (hotel, room types, rates, place, house rules, facilities, restaurant, tables) | `.nf-stays-tile`, `.nf-stays-plate` (stays.css, catalogue.css) | | stays group |
| Transfer form fields | `.nf-field` (controls.css) | shared | Phase 1 |

**F. The agent workspace (`components/agent/**`, `app/agent/**`,
agent.css).** Routes `/agent/dashboard`, `/analytics`, `/bookings`,
`/earnings`, `/inspections`, `/list`, `/listings`,
`/listings/[id]/calendar`, `/messages`, `/reviews`, `/settings`,
`/verification`, plus loading and error states. Gated like host.
| Item | Drawn by | Local material | Owner |
|---|---|---|---|
| Workspace top bar | `nf-glass nf-glass--chrome` | shared | Phase 1 |
| Top bar search field | `.nf-agent-bar__search input`: control radius, brand edge, well fill, rim-lit; focus 3px glow-2 ring | local input | mine |
| Top bar avatar | `.nf-agent-bar__avatar` circle, brand tint 2 | avatar | mine |
| Language switch in bar | `.nf-agent-bar__lang .nf-btn--primary` repainted as a quiet well button | local override of the primary button | mine |
| Desktop rail | `AgentRail` on `.nf-nav--rail` (side-nav.css) | as D | mine |
| Mobile nav sheet | `AgentMobileNav.tsx` inline Tailwind: surface-primary panel, md radius buttons, glass-fill hover, `nf-elev-4` | local in TSX | mine |
| Mode switcher menu | `ModeSwitcher.tsx` inline Tailwind: xl radius menu, md radius rows, elevated surface, `nf-elev-4` | local in TSX | mine |
| Mode pill + avatar in AgentNav | `AgentNav.tsx` inline `background: mode-agent 20%`, `rounded-full` 36px avatar with agent gradient | local in TSX (avatar round allowed) | mine |
| KYC banner | `KycBanner.tsx` md radius, 3px left rule, info or warning surface | local banner | mine |
| Stat cards | `.nf-agent-stat`: xl radius, brand edge, well fill, rim-lit + floor + 20px glow-2 + bloom-card | local card | mine |
| Every `.nf-card` inside `.nf-agent` (lists, tables, forms, charts, settings, reviews, messages, verification, earnings, calendar, loading skeleton cards) | `.nf-agent .nf-card, .nf-agent-panel` override: well fill, brand edge, rim-lit + floor + glow-2 + bloom-card | local override of the shared card | mine |
| Badges and count badges | `.nf-agent .nf-badge/.nf-count-badge` radius override; bodies in chips.css | local | mine |
| Signed-out / not-agent state | `dashboard/page.tsx`: blurred `rounded-full` agent-gradient halo behind a glass object, `nf-card--interactive` tiles, `nf-icon-tile` | local halo in TSX | mine |
| Apply wizard step dots | `ApplyWizard.tsx` inline `rounded-full` numbered dots with agent gradient or raised fill (text in a circle) | local; SHAPE: a numeral in a circle, looked at in the sweep | mine |
| Apply wizard success / warning notes | inline `state-*-surface` | local | mine |
| Warning notes on earnings, analytics, bookings, listings | inline `background: state-warning-surface` | local | mine |
| Listing wizard (`/agent/list`) choices, details, done screen | `.nf-lw-*` (catalogue.css) | | home group |
| Charts, meters | `.nf-chart*`, `.nf-meter*` (admin.css) | | Session B admin (already on the console) |
| Analytics bars | inline agent gradient, `rounded-t-xs` | local fill | mine |
| Reservations board note | `rounded-lg bg-surface-raised` | local | mine |
| Verification notes | `rounded-lg` tinted | local | mine |
| Video walkthrough progress | `rounded-full` track and fill | shape (progress bar), keeps | mine |
| Payout accounts, calendar, settings, reviews, inbox buttons | `nf-btn--primary/--glass/--ghost` | shared | Phase 1 |
| Inspections list | `.nf-console`, `.nf-ix-list` (inspection.css) | | Session B inspection |
| Error page | `app/agent/error.tsx` | type | mine |

**G. The landing page (`/`, `components/site/landing/**`, landing.css).**
| Item | Drawn by | Local material |
|---|---|---|
| Site bar over the hero, scrolled | `.nf-site-bar` (landing.css) transparent until scrolled; `.nf-site-nav-glass` md radius glass buttons (Sign in, search), `--icon` circle | local glass button |
| Nav links, current underline | `.nf-site-nav-link` control radius; `::after` pill underline (shape: bar) | local |
| "More" menu | `.nf-site-nav-menu` lg radius strong glass + elev-3; rows sm radius | local popover |
| Mobile menu (`MobileMenu.tsx`) | full-screen surface-primary sheet, `nf-card nf-group nf-rows`, `nf-row--tap` | shared card and rows, local sheet |
| Hero plate and scrims | `.nf-landing-hero-plate::after` gradients | photo scrim, keeps |
| Hero headline gradient word | `.nf-landing-title .nf-gradient-text` drop-shadow glow-2 | type glow |
| City chips, lead city | `.nf-landing-city` control radius glass; `--lead` CTA gradient + 18px glow-2 | local chip and lit chip |
| Hero listing float card | `.nf-landing-float` lg radius ink 70% + blur + rim; media md; `-badge` sm filled brand + glow; `--quiet`; save button circle | local card and badge |
| Hero pager | `.nf-landing-pager button > span` circle glass (icon only) | local |
| Search pill | `.nf-landing-pill` xl then control radius, landing pane + strong blur + rim + glow ring; segments control radius; checked segment CTA + 16px glow-2; submit brand fill | local panel, lit segment, flat submit |
| Stats band and tiles | `.nf-landing-stats` xl band fill + rim + glow ring; `.nf-landing-stat` lg tile fill + rim + 18px glow-1 | local panels |
| Orbs (icon plates) | `.nf-landing-orb` circle drop-shadow; `--ring` brand tint 1 + edge + rim + 26px glow-2 | local icon plate |
| Feature tiles and chip row | `.nf-landing-tile` lg + rim + glow-1 (hover glow-2); `.nf-landing-chiprow` xl band | local panels |
| Community photo stack, cards, tags | `.nf-landing-stack-photo` xl; `-stack-card` lg canvas 82% + blur + rim; `.nf-landing-tag` sm brand fill, `--third` outline | local card and badge |
| How it works steps | `.nf-landing-step-num` circle brand fill (a numeral in a circle), `.nf-landing-steps::before` rule | local; SHAPE looked at |
| Category tiles | `.nf-landing-cat` lg + brand edge + rim + glow ring; `-cat-icon` sm plate brand 30% + edge + rim + 12px glow-2 | local tile and icon plate |
| Stays band | `.nf-landing-band` 2xl band fill + rim + glow ring; photo; list glyph plates sm glass | local panel and icon plate |
| Buttons on landing | `.nf-landing .nf-btn--primary` and `--glass` shadow overrides (12px glow, 18px glow) | local override of the shared lit button |
| Store badges | `.nf-landing-store` control radius ink + edge + rim + glow-1 | local |
| App band phones | `.nf-landing-phone` 2xl, edge, 60px glow-2, elev-4; screen; brand screen | device drawing (presentation), keeps |

**H. The site pages (`(site)/**`, site.css, SiteHeader, SiteHead,
SiteFooter).** `/about`, `/help`, `/contact`, `/terms`, `/privacy`, `/eula`,
`/safety`, `/standards`, `/careers`, `/cancellations`, `/delete-account`,
`/docs`, `/docs/[slug]` (public), `/styleguide` (gated).
| Item | Drawn by | Local material |
|---|---|---|
| Site bar icon buttons | `.nf-site-bar .nf-icon-btn` md radius glass + brand edge + rim + 14px glow-1 | local override |
| Page head, plate, chip | `.nf-site-head*`; plate 2xl + glow ring + elev-2; `.nf-site-head .nf-chip` | local plate |
| Every `.nf-card` on a site page | `.nf-site .nf-card` override: xl radius, glow-1 rim, brand edge ring, 28px glow-1 | local override of the shared card |
| Footer, glow wash, skyline, seal | `.nf-site-footer*`; seal circle with rim + 22px glow-2 (mark, not text) | local |
| Newsletter field and send | `.nf-site-newsletter-field` control radius glass + rim; send 40px CTA gradient + 14px glow-2 | local input and lit icon button |
| Social links | `.nf-site-footer-social__link` control radius well fill, hover glow-edge | local icon button |
| Site badge | `.nf-site-badge` sm radius raised | local badge |
| Docs sidebar, on-this-page | `DocsSidebar.tsx`, `OnThisPage.tsx` | read in the sweep |

**I. chips.css, the shared small controls (used across the platform).**
| Item | Local material |
|---|---|
| `.nf-chip`, `--active`, `--pill` (+ active, hover) | control radius, glass thin; active CTA gradient + `--nf-rim-primary` + `--nf-bloom-lit-soft` (already the token lit recipe) |
| `.nf-feedtab(s)` | control radius; current CTA + rim + bloom |
| `.nf-badge` family (success, brand, warning, pending, approved, rejected, verified, example, neutral), `.nf-badge-overlap`, `.nf-count-badge`, `.nf-tag-pill*` | xs or sm radius, tinted surface; NOT the console's filled badge (state 40% over canvas, 65% ring, lifted word) |
| `.nf-panel-sunken` | lg radius, deep well, inset shade |
| `.nf-segmented--pill` and capsule, items, links | control radius glass; capsule brand + rim + 16px glow-3; current link CTA + rim + bloom |
| `.nf-action-bar-pinned(--lit)`, `.nf-sheet__foot::before` | fades, lit bar rim + upward glow |
| `.nf-table--glass`, header cells | xl radius, glass thin, rim-thin, elev-1 |
| `.nf-progress--glass`, `__fill--lit` | progress (shape), well fill, lit fill |

Counted: 6 stylesheets, 174 rules that set a background, shadow, border, radius, blur or filter (not all are materials: fades and scrims are included); 41 components; routes in
the group listed in 13.4.

**Requests raised by the inventory (to the lead):**
- **SW-C1.** `SideSwitch` and `side-flip.css` (the Flip card at the foot of
  the drawer, drawn in `BCD39CA8`) are claimed by no sweep group. Either give
  them to this group or name the owner; until then the drawer route cannot be
  closed as swept.
- **SW-C2.** The drawer panel, the switch sheet body and the scrim are
  `overlays.css` (settings group). The drawer and switch sheet routes close
  when that group releases.
- **SW-C3.** `/agent/list` draws its choices through `catalogue.css` (home
  group) and the drawn stays steps through `stays.css` (stays group); those
  items close with those groups.
- **SW-C4.** The host wizard harness only reaches its first step (Next saves
  through a server action, which needs a session). The later non-drawn steps
  (business, registration, representative, payout, consent, review) share the
  same three classes (`.nf-host-group`, `.nf-host-drop`, `.nf-host-choice`) as
  the first, so their material is covered by the same change, but they are not
  individually shot unless the wizard takes an initial-step prop for the
  harness.

### 13.2 Applied (after Phase 1 RELEASED 9da8f86f)

Every item below reads the Phase 1 layer (`Panel`, `IconPlate`/`.nf-plate`,
`--nf-panel-*`, `--nf-plate-*`, `--nf-selected-*`, `--nf-btn-lit-*`,
`--nf-btn-glass-*`, `--nf-container-radius`). No colour, radius or shadow
value was written: every new declaration is a token reference.

**Containers to `Panel`, in the markup.** 162 `nf-panel` uses across 58
files of the group, where there was `.nf-card` or a hand-drawn box: `nf-panel nf-panel--card`
(`app/agent/**`, `app/host/**`, `app/(site)/**`, `components/agent/**`,
`components/host/**`, `components/site/MobileMenu.tsx`), plus the host
groups, doors, choices and drop zones (`.nf-host-group`, `.nf-host-choice`,
`.nf-host-drop`), the agent identity card, the mode menu and its options, the
mobile workspace panel, the inner bordered boxes (payout notes, reply form,
earnings and analytics sub-cards, listing wizard summaries, transfer offers,
contact and careers asides) and the drawer's person card
(`panelClass({ variant: "card" })` in `AppRail`). `Panel` lays out as a padded
flex column; where the old card was a block, `block` is added so no layout
moved, and where it was a row, `flex-row`.

**Local material deleted.**
- agent.css: the dead `.nf-agent-stat` tile (no markup), the
  `.nf-agent .nf-card, .nf-agent-panel` well, `.nf-host .nf-card`,
  `.nf-host-group`/`-choice`/`-drop` materials, the language control's
  primary override (`LanguageSwitcher` now draws the shared glass door, so the
  locale picker is no longer a second lit primary in any header).
  One bridge rule remains, `:is(.nf-agent, .nf-host) .nf-card` on the panel
  tokens, for the `.nf-card` that `Screen`'s `RowList boxed` draws (not this
  group's file; SW-C5).
- landing.css: the `.nf-landing/.nf-site .nf-btn--primary` and `--glass`
  overrides (the shared lit bar and glass door now show), the landing's own
  glow ring, glass edge, tile fill and band fill tokens; stats band, chip row,
  stays band, stat tiles, feature tiles, category tiles, float card, stack
  photos and cards, the "More" menu and the search pill take the panel;
  city chips, pill segments, Sign in and search take the glass door; the lead
  city and the checked segment take the selected state; the pill's submit
  takes the lit bar; orb rings, category icons and the stays list glyphs take
  the icon plate.
- site.css: `.nf-site .nf-card` deleted; the bar's opener, the social links
  take the glass door; the newsletter field the shared field material; its
  send button the lit bar; the footer seal the plate's light on a disc; the
  page-head photo plate the panel edge and glow.
- side-nav.css: the dead theme control rules (the component went with light
  mode) deleted; the rail column takes the panel fill, edge and halo; the
  person row and card the panel; "View profile" the glass door; the open row,
  rail and drawer, and in Agent Mode too, the shared selected state (the flat
  20% tint and the hand-made gradient and 20 + 48px bloom are gone).
- chips.css: chips and pill chips take the glass door with its rim and without
  its bloom (a row of eight lit chips is the shouting the rule was written
  against); the active chip, current feed tab, segmented capsule and current
  segment take the selected state; `.nf-table--glass` the panel; the lit
  action bar the panel edge and rim. Two new rules: a `Panel` that is a link
  keeps its light on hover (`.nf-panel.nf-card--interactive:hover`, SW-C5
  asks for it in glass.css), and a panel holding the lit primary gets
  `isolation: isolate` so the pooled bloom is not drawn under the panel's
  fill (the lead's instruction).
- Notes and banners (`KycBanner`, the warning notes on earnings, analytics,
  bookings, listings, the reservations and verification notes, the restore
  form's notices): corner to `--nf-container-radius`. Their state tint stays:
  a notice is not a panel.
- Icon squares on the listing pitch and the empty listings state: the shared
  icon plate (lg) with a 24px line glyph, not a hand-painted gradient square.
- Docs sidebar and "On this page" toggles: the glass door; the chapter list
  on a phone the panel.

**Left alone, on purpose.**
- THE DOCK, its switch and the dock island: the founder's ruling ("don't copy
  the bottom nav, don't touch it") and the governing image: `GOVERNING-01`
  draws a dark translucent bar with a lit blue edge and the switch as a lit
  square in line, which is what the dock already draws (`.nf-tabbar` lit edge
  and lifted glow, `.nf-switch-dock` on the Phase 1 plate). Destinations,
  layout and material unchanged; chrome.css has no diff.
- The app header: its scrolled state already carries `--nf-glow-edge` along
  its foot; there is no shared token for a bottom-edged bar and swapping it
  for the panel hairline dimmed it, so it was reverted.
- Avatars and their rings (round is allowed), the glass objects' own
  drop-shadow glow, the hero's photo scrims, the phones in the app band
  (presentation), divider gradients, progress tracks.
- Status badges (`.nf-badge` family, `.nf-count-badge`, `.nf-nav__badge`,
  landing tags): Phase 1 extracted no shared badge, so they keep their tints;
  request SW-C6.

### 13.3 Audit passes

All three on `next start` of this worktree's own build (compile then
generate mode, run through the shared heavy-job lock), port 3190,
`VALLO_PREVIEW_HARNESS=1`, dark (the only theme), 390x844 at dpr 2 and
1440x900, full page after scrolling the whole page so every `Reveal` section
has fired. Every route in 13.4 was re-opened in each pass and set beside its
before shot and the console / Get started reference (ledger 6.2 panel row:
10px corner, per-side lit edge, top catchlight, 3px outer glow).

**Pass 1, 23 September (after the first apply).**
Found and fixed:
1. The first "before" set of the landing and the site pages was blank below
   the fold (their sections reveal on scroll and a full-page screenshot does
   not scroll). The shooter now scrolls the page in 300px steps first, and
   the before set was re-taken from a clean build of the pre-sweep tree
   (2104275e) in a throwaway worktree, so before and after are both whole.
2. A CSS editing slip left four hover rules inside `@media (hover: hover)`
   in landing.css with their bodies outside their braces (nav glass, lead
   city, feature tile, category tile). `check-css-tokens` caught it
   ("Unexpected end of input"); repaired and re-checked, every partial
   parses.
3. The landing nav's search glyph had lost its circle with the glass door;
   `DESIGN_DIRECTION` section 1 names it the one icon button the governing
   hero draws round. The circle is back.
4. Landing tags ("Third party") measured 10px on 28px = 0.36 in the shape
   sweep; moved to `--nf-radius-xs` (0.21).
5. A panel holding the lit primary drew the primary's pooled bloom under its
   own fill; `isolation: isolate` on `.nf-panel:has(.nf-btn--primary)`.
Found and NOT fixable here: `Screen`'s `RowList boxed` forces
`rounded-[var(--nf-radius-xl)]` as a Tailwind utility, which outranks any
component rule, so the boxed lists on `/agent/dashboard`, `/host/transfer`
and the host standing page take the panel's material but keep a 22px corner
(SW-C5).

**Pass 2, 23 September.**
Re-opened every route plus the open states the first pass had not shot:
the agent workspace's mobile drawer, the landing "More" menu, the site
mobile menu, the switch sheet, the drawer's foot. Measured in the browser
(13.5). Found and fixed:
1. THE AGENT WORKSPACE'S MOBILE DRAWER OPENED 60PX TALL. It is a
   `position: fixed` dialog rendered inside the top bar, whose glass
   (`nf-glass--chrome`) has a backdrop blur, and a backdrop filter makes the
   bar the containing block for fixed descendants: the drawer was the height
   of the bar, with no scrim and no navigation. Present before the sweep (the
   bar's blur is unchanged); found here because the sweep shot the open
   state. `AgentMobileNav` now portals the dialog to `document.body`.
2. Nav rows (rail and drawer) and the open row measured 18px on 52px = 0.35;
   moved to `--nf-radius-control` (0.27), the console's open-row corner.
Checked and left: the "More" menu and the site mobile menu open full size
and read as panels; the switch sheet is the settings group's sheet over the
Phase 1 plates; the agent search field sits at 14 on 40 = 0.35, the pill
segments at 0.35 (at the line, not over it).

(Pass 3 below.)

**Pass 3, 23 September (final build, after SW-ST2).**
Every route re-shot (`after/`), every open state re-opened, the refused
routes of the first shape sweep re-run, the stays set-up steps added.
Found and fixed:
1. With the drawer now full height, its Account rows (Verification,
   Settings) sat out of sight: the nav list was a shrinking inner scroller
   squeezed under the identity card. `.nf-agent-drawer .nf-nav__scroll`
   lets the drawer scroll as one column, as the app drawer does. Re-shot:
   every row, the identity card and the mode switch in one column.
2. SW-ST2 (the lead's request): the sixteen stays set-up inputs and selects
   in `components/host/stays/**` draw the shared `nf-field nf-field--glass`
   (the glass well of `GOVERNING-10`, fixed in eb9afe04); `stays.css` keeps
   only their rhythm (height, gap, padding), the select's chevron (carrying
   the field's two layers under it, in the same tokens) and the inline width,
   and its own well is deleted. Before and after on all eight steps.
Checked and left: the "AI" nav link draws 14px on a 38px-wide label (0.37);
its corner only ever draws the focus ring, and 0.37 is under the capsule
line. The agent search field and the pill segments sit at 0.35.
Shape sweep, Pass 3: **0 breaches**; 10 worth an eye (the three above);
180 round icon-only (the stays step progress dashes, drawn in `stays.css`,
and the footer's scroll glyph; none carries text); 1 refusal (a site page
timing out on `networkidle` in the tool, shot and read by hand in `after/`).
Pass 1 sweep over all 36 routes: 0 breaches, 32 worth an eye (all of them
the items above plus the tag fixed in Pass 1), 5 refusals of the same kind.

### 13.4 Routes in the group and the before proofs

Taken 23 September on `next start` of `origin/main` at ccf594ba
(nothing of mine changed), port 3190, `VALLO_PREVIEW_HARNESS=1`, dark,
390x844 at dpr 2 and 1440x900 at dpr 1, full page. Stored in
`docs/design/proofs/session-b/sweep-chrome/before/` downscaled for the
repository (390 shots to 390 px wide, 1440 shots to 960 px, JPEG 68); the dpr 2
originals stay in the worker's scratchpad for measuring. "Fixture" means a
committed preview harness rendering the real component on fixture props.

| # | Route | Proof source | Before proof |
|---|---|---|---|
| 1 | Home with header and dock (chrome) | fixture `/preview/f1/switch` (AppShell) | `chrome-switch-*` |
| 2 | Switch sheet open | fixture `/preview/f1/switch`, dock switch pressed | `chrome-switch-sheet-390` (the dock is not drawn at 1440) |
| 3 | Side drawer | fixture `/preview/lead/drawer` and `/preview/f1/drawer` | `chrome-drawer-*`, `chrome-f1drawer-*` |
| 4 | Dock alone | fixture `/preview/lead/dock` | `chrome-dock-*` |
| 5 | Home body under the chrome | fixture `/preview/f1/home` | `chrome-home-*` |
| 6 | Landing `/` | live | `landing-*` |
| 7 to 19 | `/about`, `/help`, `/contact`, `/terms`, `/privacy`, `/eula`, `/safety`, `/standards`, `/careers`, `/cancellations`, `/delete-account`, `/docs`, `/docs/getting-started` | live | `<name>-*` |
| 20 | `/host` standing | fixture `/preview/f5/host-landing` | `host-landing-*` |
| 21 | `/host/start` doors | fixture `/preview/c2/stays-doors` | `stays-doors-*` |
| 22 | Host wizard, first step | fixture `/preview/f5/host-wizard` | `host-wizard-*` |
| 23 | `/host/transfer` | fixture `/preview/f5/host-transfer` | `host-transfer-*` |
| 24 to 36 | `/agent/dashboard`, `analytics`, `bookings`, `earnings`, `inspections`, `list`, list sent, `listings`, `messages`, `reviews`, `settings`, `verification`, `listings/[id]/calendar` | fixture `/preview/f5/agent-*`, `/preview/o3/agent-calendar` | `agent-*` |

Not shootable signed out and without a harness: `/host/rooms`,
`/host/photos`, `/host/reservations`, `/host/apply`, `/styleguide` and every
signed-out state of `/agent/*` and `/host/*`: the sign-in gate (`proxy.ts`)
sends a stranger to `/welcome` before the page renders, so those states are
no longer reachable by anyone signed out. They are covered by class: the
rooms, photos and reservations pages draw only `.nf-agent-head`, `.nf-chip`,
`.nf-host-group`, `.nf-host-drop` and `.nf-card`, all of which are shot on
routes 20 to 23.

Routes in group: 36 (plus the gated five above), and from SW-ST2 the eight
drawn stays set-up steps (`/preview/imgc/{hotel,room-types,rates,place,
house-rules,facilities,restaurant,tables}`), shot before in `before/`
(`stays-*-before`) and after. The before set of the landing and the site
pages was re-taken in Pass 1 from a clean build of the pre-sweep tree, full
page and scrolled.

### 13.5 Per route: swept or not, and the comparison

Reference (ledger 6.2 and the Phase 1 tokens): container corner 10px
(`--nf-container-radius`), per-side lit edge (`--nf-panel-edges`), top
catchlight (`--nf-panel-rim`), 3px outer halo plus inset top and side light
(`--nf-panel-glow`), the panel fill with its reflection
(`--nf-panel-fill-card`, a white 12% radial at the top left), lit primary
(`--nf-btn-lit-*`), glass door (`--nf-btn-glass-*`), selected state
(`--nf-selected-*`), icon plate (`--nf-plate-*`). Measured with
`getComputedStyle` on the Pass 2 build (`scratchpad/chrome/measure.mjs`,
`measure2.txt`).

| Item (route) | Before | After (measured) | Reference | Match |
|---|---|---|---|---|
| Host door / choice (`/host/start`, wizard) | 18px, brand edge, well fill, 16px glow-1 | 10px, per-side edges (top L 0.60, side L 0.45), panel fill with reflection, rim + halo | panel | yes |
| Chosen door | edge strong, 22px glow-3 + bloom-card | selected edges (top L 0.88), panel rim, 22px bloom at 64% + drop 16px | selected state | yes |
| Workspace card (`/agent/settings` etc.) | 22px `.nf-card` conic hairline + agent well override | 10px panel, same edges and fill as above | panel | yes |
| Boxed row list (`/agent/dashboard`, `/host/transfer`) | 22px `.nf-card` | panel material, corner still 22px | panel | material yes, corner no (SW-C5) |
| Glass button (`/agent/settings`) | flat raised fill | 14px, glass fill 22% to 8%, edge 70%, rim, 20px bloom -5 | glass door | yes |
| Primary button (`/agent/dashboard`) | local override removed in agent bar | lit edges, rim, inner 12px, 6px/16px bloom | lit bar | yes |
| Rail / drawer open row | flat brand 20% (rail), hand gradient + 20/48px bloom (drawer) | CTA gradient, white 55% rim, 22px bloom at 58%; 14px on 52 (0.27) | selected, console open row | yes |
| Drawer person card | `.nf-glass--card` 22px | 10px panel card | panel | yes |
| "View profile" | brand tint capsule on 6px | glass door on 6px (0.19) | glass door | yes |
| Landing feature strip, stats, stays band (`/`) | 22 to 28px, band fill, glow ring 30px | 10px panel | panel | yes |
| Landing search pill | 22px then 14px, pane + glow ring + elev-4 | pane kept (photo legibility), panel edges, rim, glow, blur, 14px (a bar, control corner) | panel over imagery | yes |
| Lead city, checked segment | CTA + 18px / 16px glow-2 | selected state | selected | yes |
| Pill submit | flat brand | lit bar | lit bar | yes |
| Category icon, stays list glyph, orb ring | brand 30% square + 12px glow, glass square, tint ring + 26px | plate fill, per-side plate edges, plate rim, inner light, 10px glow; 6px corner on 36px | icon plate | yes |
| Site cards (`/about` and 12 more) | `.nf-site .nf-card` xl + 28px glow-1 | 10px panel | panel | yes |
| Newsletter send | CTA + 14px glow | lit bar | lit bar | yes |
| Footer seal | canvas disc + 22px glow | plate light on a disc | icon plate | yes (round: a mark) |
| Stays set-up fields (host wizard drawn steps) | local deep well, soft edge | shared `nf-field nf-field--glass` | shared field | yes (SW-ST2) |
| Dock (every app route) | lit edge bar, 22px, switch plate | unchanged | `GOVERNING-01` | yes, untouched by ruling |
| Drawer panel, switch sheet body | `overlays.css` | unchanged here | settings group | not this group |
| Flip card | `side-flip.css` | unchanged here | | SW-C1 |
| Status badges and counts | tinted | unchanged | no shared badge in Phase 1 | SW-C6 |

**Routes swept / routes in group: 44 of 49** (the 36 rows of 13.4, the five
gated routes, and the eight drawn stays set-up steps SW-ST2 brought in).
Swept, every inventory item of this group on the shared layer: the landing,
the thirteen public site pages, `/styleguide` (by class), the host standing,
doors, wizard (first step shot; later steps by class, SW-C4), transfer,
rooms, photos, reservations (by class), the eight drawn stays set-up steps
(fields, SW-ST2), and all thirteen agent routes with their loading states
(by class) and the workspace drawer and mode menu.
Not closed (the five chrome rows of 13.4: home with header and dock, the
switch sheet, the side drawer, the dock, the home body under the chrome):
the drawer's panel and Flip card and the sheet are other files (SW-C1, the
settings group), the dock and header are left by ruling, and the home body is
the home group's. Noted but counted as swept:
1. `/agent/dashboard` and `/host/transfer` and the host standing page: the
   boxed row lists keep a 22px corner from `Screen.tsx` (SW-C5). Counted as
   swept for this group's files; the corner is another file's.
   Everything else on those three routes is on the shared layer.

### 13.6 Requests and releases

- **SW-C1 (to the lead):** `components/app/SideSwitch.tsx` and
  `app/css/side-flip.css`, the Flip card at the foot of the drawer
  (`BCD39CA8`), are claimed by no sweep group; it still draws
  `nf-glass nf-glass--card`.
- **SW-C2:** the drawer panel, its scrim and the switch sheet are
  `overlays.css` (settings group).
- **SW-C3:** `/agent/list`'s choices are `catalogue.css` (home group); the
  drawn stays steps' tiles and plates are `stays.css` (stays group, released;
  this group touched only the field rules there, for SW-ST2).
- **SW-C4:** the host wizard harness reaches only its first step; the later
  non-drawn steps share its three classes and are swept by class, not shot.
- **SW-C5 (to Phase 1 / the lead):** re-point `.nf-card` itself at the panel
  tokens, or move `Screen`'s `RowList boxed` to `panelClass` and drop its
  `rounded-[var(--nf-radius-xl)]` utility; then delete agent.css's bridge rule
  and chips.css's panel hover rule, and add the panel hover state to glass.css.
- **SW-C6 (to Phase 1):** no shared badge came out of the console; the
  platform's status badges and counts keep their own tints until one does.
- **SW-ST2: closed by this group** (see Pass 3).
- The dock and its switch: not touched, on the founder's ruling.

### 13.7 Proofs

`docs/design/proofs/session-b/sweep-chrome/`: `before/` (pre-sweep build,
every route at 390 and 1440, plus `stays-*-before` for SW-ST2), `after/` (the
final build, every route, the drawer foot, the open workspace drawer, the
open "More" menu), `sheets/` (before, after and the console overview side by
side for the workspace settings, the host wizard and the drawer; the landing
and the hotel step before and after; the open workspace drawer beside the
app drawer's foot). All from `next start` with `VALLO_PREVIEW_HARNESS=1`;
every `/preview/**` shot is fixture-backed, the landing and site pages are
live. Downscaled for the repository (390 shots to 390px, 1440 to 960px, JPEG
68); the dpr 2 originals are in the worker's scratchpad.

### 13.8 Skipped or not verified

- The host wizard's later non-drawn steps are not individually shot (SW-C4).
- `/host/rooms`, `/host/photos`, `/host/reservations`, `/host/apply` and
  `/styleguide` sit behind the sign-in gate and have no harness; covered by
  class only.
- Hover states were not shot; the rules were read and the panel hover rule
  measured in code only.
- The shape sweep's refusals (site pages timing out on `networkidle` in the
  tool) were covered by hand-read shots, not by the tool.

## 13. Platform sweep: social (public profile, follow lists, edit profile, messages, the three thread faces)

Worker "sweep-social", 23 September. Brief: `SWEEP.md` Phase 2 and the founder
addendum (every visible thing, three dated audit passes). Governing images
that still hold form on this group: `GOVERNING-chat-booking-card.png`,
`founder/GOVERNING-thread-hotel-booking.jpg`,
`founder/GOVERNING-thread-rental-enquiry.jpg`, `9E06F51C`. Reference anatomy:
the console (`admin.css`, ledger 6.2) and Get started (ledger 2), through the
Phase 1 shared layer. Status: INVENTORY AND BEFORE PROOFS DONE; applying waits
for "Phase 1 RELEASED" in the scope file.

### 13.S.1 Routes in the group (12)

| # | Route | How it is proved | Harness face |
|---|---|---|---|
| 1 | `/u/[handle]` public profile, every tab (agent bar: Properties, Stories, Reviews, Activity; member bar: Posts, Replies, Media, Activity), menu sheet, block sheet, share | live (public read, handle `phantomfcalls`) and fixture | `profile`, `&tab=`, `&m=1`, `&e=1` |
| 2 | `/u/[handle]/followers` | live and fixture | `followers`, `followers-empty` |
| 3 | `/u/[handle]/following` | live (same component as 2) | (2) |
| 4 | `/u/[handle]/edit` | fixture (needs a session) | `edit` |
| 5 | `/u` people search | live | (none needed) |
| 6 | `/messages` inbox: All / Requests tabs, search, rows, unread count, mark read, empty | fixture signed in, live signed out | `inbox`, `inbox-empty` |
| 7 | `/messages/[id]` booking face (stay: context fold, chat card, bubbles, composer) | fixture | `booking` |
| 8 | `/messages/[id]` rental enquiry face (context card, role tags, photo bundle, inspection face) | fixture | `rental` |
| 9 | `/messages/[id]` plain thread (no listing, no context) | fixture | `plain` |
| 10 | `/messages/[id]` options sheet, attach, report | fixture | `booking` + click |
| 11 | `/messages/share/[kind]/[id]` share picker | fixture | `share` |
| 12 | `/messages/new` bridge | shared `EmptyState` only, nothing of its own | none |

Loading skeletons for 1, 2/3, 4, 5, 6 and 7 to 9 are the route `loading.tsx`
files rendered directly by the harness (`load-*` faces). Not in the group:
`/agent/messages` (agent workspace group, `agent.css`), `/profile` (already
swept, Session B's reference).

Harness: `app/(dev)/preview/session-b/sweep-social/page.tsx`, the real
components on the shared fixtures (`_fixtures/people.ts`, `f4/fixtures.ts`,
`f5/fixtures.ts`, read, not edited) inside the real `AppShell`. Every proof
from it is FIXTURE-BACKED.

### 13.S.2 Who draws what today (the ownership finding)

Every rule the THREAD faces draw is in `threads.css`, which this group owns.
Every rule the PROFILE family draws (cover, avatar ring, chips, counts, trust
row, cards, tab segment, sheets, person rows, people search) is in
`app/social.css` and `app/social-feed.css`, which the scope gives to the
"feed" worker. So on the profile family this group can move the MARKUP onto
the shared primitives (Panel, IconPlate, Button variants) and must ask the
feed worker to delete the orphaned rules; it cannot delete them itself. Filed
as SW-ST1 in the scope file. Two more are outside the group: the held-payment
composer inside a thread (`ProposeHeldPayment.tsx`, drawn by `escrow.css`,
stays group) and the `.nf-insp-*` half of `threads.css` (the inspection
surface, already Session B's; left as it is unless the inspection owner asks).

### 13.S.3 Inventory: every place that draws its own container, edge, rim, glow, button or plate

Legend: file, selector or element, what it draws, the shared target once Phase 1
lands.

**threads.css (owned, deletions happen here)**

| # | Selector | Draws | Shared target |
|---|---|---|---|
| T1 | `.nf-thread__ring` | avatar ring: brand-edge-strong border, well fill, rim-lit + 16px glow-3 + inner wash | avatar ring stays round (shape law); glow from the shared outer-glow token |
| T2 | `.nf-msg__avatar` | small avatar ring, own rim + 12px glow-2 | as T1 |
| T3 | `.nf-role-tag` | Tenant/Agent lozenge: own border, well fill, rim-lit, radius-xs | shared small badge (status badge role) |
| T4 | `.nf-thread__place .nf-badge` ... `.nf-insp-fact .nf-badge` | per-surface radius override on badges (chips.css capsule fix) | delete once the shared badge carries the right radius |
| T5 | `.nf-bubble--theirs` | incoming bubble: tint-3 fill, brand edge, rim-lit, inner wash, 14px glow-2 | KEEPS its material (image governs: sampled blue glass bubble), edge and glow move to shared per-side edge + outer glow tokens |
| T6 | `.nf-bubble--mine` | sent bubble: CTA gradient, strong edge, rim-lit, 22px bloom | shared lit-primary fill, rim and bloom tokens (image governs: the lit gradient bubble) |
| T7 | `.nf-bubble--failed` | rose outline | stays (state, not material) |
| T8 | `.nf-bubble__photo`, `.nf-photo-bundle__cell`, `__more` | media plates, inset fill | media, not material; radius to the container role |
| T9 | `.nf-chat-card` | the booking/listing card: strong edge, well fill, blur, rim-lit, floor, 26px glow-3, bloom-card | shared Panel (lit, strong), image governs its extra glow |
| T10 | `.nf-chat-card__badge` | plate behind Confirmed on a photo | shared badge on media plate |
| T11 | `.nf-chat-card__facts`, `__fact + __fact` | brand hairlines between cells | shared inner divider token |
| T12 | `.nf-chat-card__room` | room row: own edge, well fill, rim-lit | shared inner Panel (quiet) |
| T13 | `.nf-chat-card__chip` | "3 Nights" chip: tint-2 fill | shared chip |
| T14 | `.nf-chat-card__forward` | text control, radius-control | shared ghost Button |
| T15 | `.nf-context-card` | rental/booking/reservation context card: edge, well fill, rim-lit, 20px glow-2, bloom-card | shared Panel |
| T16 | `.nf-context-card__mark` | the house glyph box (BrandIcon in a 40px box, no plate) | shared IconPlate (the image draws the house on a lit plate) |
| T17 | `.nf-booking-fold*` | fold summary inside the context card | layout only |
| T18 | `.nf-composer__field` | field: radius-control, edge, well fill, rim-lit, 14px glow-1, focus ring | shared input/field material |
| T19 | `.nf-composer__send` | send: CTA gradient, strong edge, rim-lit, 20px glow-3 bloom | shared lit primary icon button |
| T20 | `.nf-composer__pending` | brand hairline | shared divider |
| T21 | `.nf-inbox-row` hover | glass-fill on hover | shared selected/hover state |
| T22 | `.nf-inbox-row__ring` | avatar ring (also used by VerifiedAvatar, SharePicker) | as T1 |
| T23 | `.nf-inbox-row__count` | unread count plate, flat brand fill | shared count badge |
| T24 | `.nf-share-row` hover | glass-fill on hover | as T21 |

**Thread route components (`components/app/threads/**`, `components/app/messages/ChatCard.tsx`, `ListingOptionsSheet.tsx`, `app/(app)/messages/**`)**

| # | Where | Draws | Shared target |
|---|---|---|---|
| C1 | ThreadView header: `nf-icon-btn` back, call, kebab | icon buttons (controls.css, shared already) | shared secondary glass button |
| C2 | ThreadView safety note `nf-context-card mb-xs` | a context card used as a banner | shared calm info panel (GLOW_IDENTITY 7) |
| C3 | ThreadView attach `nf-icon-btn`, pending photo `rounded-xl` thumb, remove | icon button, raw Tailwind radius | shared button; media radius token |
| C4 | ThreadView typing dots `rounded-full` | dots (shape, exempt) | stays |
| C5 | ChatCard two faces (booking, listing): `nf-btn--primary`, `nf-btn--glass` | lit primary and glass buttons via buttons.css | shared Button variants (already shared, check they pick up Phase 1) |
| C6 | ThreadContextBanner: three banners, `nf-card--interactive` on one | context cards + buttons | shared Panel (interactive) + Button |
| C7 | BookingFace: fold, step dots `rounded-full` | card, dots | shared Panel; dots stay |
| C8 | RentalFace: context card, 11 Buttons, 3 Sheets, `nf-field` | card, sheets | shared Panel; Sheet is shared |
| C9 | ReservationFace: context card, StatusPill, Sheet | card | shared Panel |
| C10 | ThreadOptionsSheet: `nf-card nf-card--interactive` listing row, `nf-card mt-md p-md` block, `nf-badge--*`, `nf-share-row` rows, `nf-icon-btn` close | cards inside a sheet | shared Panel (interactive and quiet) |
| C11 | ListingOptionsSheet: `nf-card` row, `rounded-[var(--nf-radius-md)]` photo, `nf-icon-btn` | card | shared Panel |
| C12 | Inbox: Segmented (All/Requests), TextField search, `nf-btn--primary`/`--ghost` in the empty state, `nf-btn--ghost --sm` mark read, `nf-icon-btn` find | shared controls | Button variants; Segmented from the shared layer |
| C13 | `/messages` paused note `nf-card nf-body p-card` | card | shared calm Panel |
| C14 | `messages/loading.tsx`, `[id]/loading.tsx`, `new/loading.tsx` | `nf-card` skeleton boxes, `divide-y` hairlines | shared Panel skeleton |
| C15 | SharePicker: `nf-context-card` confirm, `nf-btn--primary` x2, `nf-inbox-row__ring`, `nf-share-row` | card, buttons | shared Panel, Button |
| C16 | VerifiedAvatar: `rounded-full` initials disc with a 22 per cent brand mix, tick dot with `border-2 surface-primary` | avatar (round, exempt), tick | glow and edge from the avatar ring token |
| C17 | `components/app/messages/MessageThread.tsx` | a whole second thread with its own bubbles (`rounded-2xl`, raw brand mix) | DEAD: imported nowhere. Delete in the sweep (claimed below) |
| C18 | ProposeHeldPayment `nf-esc-*` | held-payment composer inside a thread | escrow.css, stays group: not swept here |

**Profile family (`components/social/profile/**`, `app/(app)/u/**`); rules live in social.css / social-feed.css (feed worker)**

| # | Where | Draws | Shared target |
|---|---|---|---|
| P1 | ProfileHeader cover `nf-social-cover*`, plate, scrim | photo band with a border | media, not material; the hairline to the shared edge token |
| P2 | ProfileHeader floats `nf-social-float` + BackChevron/ProfileShare/ProfileMenu `nf-social-round` | round glass buttons on the cover (`--pill` variant) | shared secondary glass icon button on the control radius |
| P3 | `nf-profile-avatar`, `__disc`, `__badge` | lit ring with own gradient border + 30px glow | avatar stays round; glow from the shared outer-glow token |
| P4 | `nf-social-chip`, `--brand` (occupation, area, standing) | chips | shared chip |
| P5 | `nf-social-count*` | count links with a rule | type only, no container |
| P6 | ProfileHeader `nf-card nf-social-card mt-md p-md` about card + `nf-social-trust` cells | card with cells | shared Panel + inner divider |
| P7 | FollowButton `nf-btn--primary` / `--glass` | follow / following | shared Button variants |
| P8 | ProfileTabs `nf-glass-seg`, `__tab[aria-selected]` | segment track with its own glass, selected tab flat brand + 22px glow | shared segmented control and selected state |
| P9 | PropertyList `nf-card nf-post nf-post--listing`, `nf-post__plate` | listing card borrowed from the feed post | shared Panel (feed worker owns `nf-post`) |
| P10 | ReviewList `nf-card nf-social-card p-md`, stars `text-[var(--nf-border-default)]` | review card | shared Panel |
| P11 | ProfilePosts empty `nf-card nf-social-card p-lg` | empty card | shared EmptyState/Panel |
| P12 | MediaGrid `nf-media-grid__tile` | media tiles | media radius |
| P13 | ActivityList | posts via PostCard (feed worker) | not this group |
| P14 | EmptyPanel `nf-card nf-social-card` + `nf-btn` | the social empty state | shared EmptyState/Panel + Button |
| P15 | ProfileMenu `nf-social-sheet`, `__panel`, `nf-post__menu*`, `nf-social-more__menu`, danger rows, block confirm | menu popover and sheet | shared Sheet/menu panel |
| P16 | PeopleList `nf-card nf-social-card nf-social-person`, `__face`, the AGENT tag (`rounded-[var(--nf-radius-control)] border-[var(--nf-border-brand)]`, a hand-drawn badge), empty cards | person rows, badge | shared Panel rows; shared badge |
| P17 | LoadingPeople skeleton `nf-card nf-social-card nf-social-person` | skeleton card | shared Panel skeleton |
| P18 | ProfileEditor: six `nf-card p-md sm:p-lg` sections, the warning card with an inline `borderColor` style, the contact-policy radio cards (`rounded-[var(--nf-radius-md)] border` + inline `borderColor` for selected), the pidgin checkbox card, `nf-field` inputs | cards, choice cards, selected state | shared Panel, shared selected state (GLOW_IDENTITY 3), shared field |
| P19 | ProfilePhotos `nf-card nf-social-card overflow-hidden`, cover art, `nf-social-avatar__edit`, two glass Buttons | photo editor card | shared Panel + Button |
| P20 | `/u` people search `nf-card nf-social-card nf-people__row`, `nf-people__search` field, `nf-people__go` | person rows, search field | shared Panel rows, field |
| P21 | `/u/loading`, `/u/[handle]/loading`, `edit/loading` | skeleton cards (`nf-card p-lg`), cover skeleton | shared Panel skeleton |
| P22 | FollowListPage `nf-chip` handle links | chips | shared chip |

Count: 24 in `threads.css`, 18 in thread components, 22 in the profile family:
64 items. The 22 profile items are drawn by the feed worker's stylesheets
(SW-ST1) and C18 by `escrow.css`, so 23 of the 64 can only be swept in markup
here, with the rule deletion done by their owners.

### 13.S.4 Before proofs

`docs/design/proofs/session-b/sweep-social/before/`, 390 x 844 at 2x (full
page where the route scrolls) and 1440 x 900, dark, JPEG q80, from a
production build of `ccf594ba` plus the harness only. Faces: profile (agent
bar, reviews tab, member posts tab, every tab empty, menu open), followers,
followers empty, edit, inbox, inbox requests, inbox empty, the booking face
(bottom and top), the rental face (bottom and top), the plain face, the
options sheet, the share picker and the six loading skeletons. The live
public routes (`/u`, `/u/<handle>`, its followers and following, `/messages`
signed out) were shot too and every one landed on `/welcome`: the item 8 sign
in gate now covers them, so no live proof exists for any route in this group
and all of them are fixture-backed. `/u` people search has no harness face
(its rows are inline in a server page reading `findPeople`); its skeleton is
proved, its rows are proved by code only.

**Defects the before proofs show (fixed with the sweep, not before it):**
- D1, P15: the profile's "More actions" popover opens off the left edge at 390
  (`profile-menu-390.jpg`): every row's first letters are cut ("opy link",
  "ute", "eport"). The popover is anchored to the kebab's right edge and is
  wider than the space to its left. Its rule (`.nf-social-more__menu`) is in
  `social-feed.css`; the fix is in the component's anchoring or in SW-ST1.
- D2, P16: the AGENT tag in follow lists is a hand-drawn badge in Tailwind
  (raw border and radius classes) rather than the shared badge.
- D3, C17: `MessageThread.tsx` is a second, dead thread renderer with its own
  bubble recipe.

### 13.S.5 The thread booking and listing card (founder, 23 September)

Founder: "make it a bit smaller on mobile and desktop, a bit smaller in width
and height, make it clean and magnificent". Target
`docs/design/references/founder/thread-booking-card-target.jpg` (the same
drawing as `GOVERNING-chat-booking-card.png`). Measured with a sharp pixel
reader, screen 660 image px inner edge to inner edge, 0.591 CSS px per image
px at 390.

| Property | Image (measured) | Before | After (pass 1) | Match? |
|---|---|---|---|---|
| Card width at 390 | 524 px = 310 CSS, left edge on the bubble column (82 px in = 48 CSS) | 340 CSS, on the screen gutter | 300 CSS, on the bubble column (avatar column kept empty) | yes, 10px narrower |
| Card width at 1440 | derived from the phone | 686 CSS | 400 CSS (capped at 25rem) | yes (founder: smaller) |
| Card height | 520 px = 307 CSS | about 560 CSS | 392 CSS | closer; the 44px tap law (buttons 44 against 30 in the render) and our type one rung larger account for the rest |
| Photo | inset 6 px (4 CSS) from the card edge, 303 x 82 CSS, 3.7 to 1 | flush, 3 to 1 | inset 4, 37 to 10, corner radius under the card's | yes |
| Container | per-side lit edge (top `#1159BD`, left `#2553A9` band, right `#004591`, bottom `#11308B`), bright bottom band `#011C8F` | own brand edge, well fill, 26px glow | shared `.nf-panel--card` + `--glass`: the console's per-side edges, lit rim, reflection, glow | yes (shared layer) |
| Room row | no box, a hairline above (y 706) and below (y 816) | boxed well with its own edge | two `--nf-panel-hair` hairlines, no box | yes |
| Facts row | 53 CSS, hairlines between cells | 110 CSS, labels wrapping | 64 CSS, labels one line | yes |
| Buttons | lit primary + glass, 1.26 to 1, 8 apart, 30 tall | `--md` 48 tall | shared lit primary and glass door, `--sm` 44 tall, 1.26 to 1, 8 apart | yes except height (tap law) |
| Chips (3 nights) | small rounded rectangle, cyan hairline | 23px, tint fill | panel-edge hairline, `--nf-radius-xs` | yes |
| Forward | not drawn | a foot row, 50px | a 44px glyph in the title row, no height of its own | recorded exception (a real route) |

### 13.S.6 Per route result

| Route | Swept | Container | Edge / rim | Glow | Button | Plate |
|---|---|---|---|---|---|---|
| 1 `/u/[handle]` | yes in markup (SW-ST1 for the rule deletion) | about and trust on `.nf-panel--card`; tabs on the panel track | panel edges, rim | panel glow | Follow on the shared lit primary; cover and kebab on the glass door | none drawn |
| 2, 3 followers / following | yes | person rows and empty card on `.nf-panel--card` | panel | panel | shared | AGENT tag on the shared role tag |
| 4 `/u/[handle]/edit` | yes | six sections on `.nf-panel--card`; held bio on `--held` | panel; choice cards take `--nf-selected-*` when checked | panel | Save on the lit primary | none |
| 5 `/u` | yes (rows, skeleton) | `.nf-panel--card` rows | panel | panel | shared | none |
| 6 `/messages` | yes | rows hover on the panel fill and rim; paused note on the panel | ring on `--nf-plate-*` | plate glow | shared | unread count on the lit fill |
| 7 booking face | yes | context fold and chat card on the shared card | panel | panel | shared | the bed on `IconPlate` |
| 8 rental face | yes | context and inspection cards on the shared card | panel; bubbles on panel edges (theirs) and the lit primary (mine) | panel / lit bloom | shared | the house on `IconPlate` |
| 9 plain face | yes | bubbles and safety note (calm panel) | as 8 | as 8 | shared | none |
| 10 options sheet | yes | listing row and block confirm on the shared card | panel | panel | shared | none |
| 11 share picker | yes | confirm card on the shared card | panel | panel | shared | ring on the plate tokens |
| 12 `/messages/new` | nothing of its own | | | | | |

Routes swept: 11 of 12 (the twelfth draws nothing of its own). Deleted local
recipes: `.nf-chat-card` material, `.nf-chat-card__room` box, `.nf-context-card`
material and its 40px mark box, the three avatar ring recipes, both bubble
edge and glow recipes, the composer field and send recipes, the role tag's
well, the inbox and share row hover fills, `MessageThread.tsx` whole (dead).
Not deleted, because they are the feed worker's (SW-ST1):
`.nf-social-card`, `.nf-social-more`, `.nf-social-more__menu` offsets,
`.nf-social-round` material, `.nf-social-chip` edge, `.nf-social-trust` well,
`.nf-glass-seg__tab[aria-selected]`, `.nf-social-sheet__panel` material,
`.nf-card.nf-post` for the profile's property cards. The profile family now
wears `components/social/profile/social-profile.css` (new, shared tokens only)
and the shared classes in markup; the rules above have no profile consumer
left except where the feed uses the same selector.

Found for others: the inbox segment's selected state ("All") is still a flat
navy fill from the shared `Segmented`, which Phase 1 did not touch; reported to
the lead.

### 13.S.7 Audit passes

**Pass 1, 23 September, after applying** (production build, harness, 390 and
1440, `proofs/session-b/sweep-social/pass1/`). Found and fixed:
1. The chat card was 285 wide at 390, narrower than the render: the stack was
   capped at 84 per cent of a row that already lost the avatar column. Now the
   column's full width, capped at 25rem: 300 at 390.
2. The Forward foot row cost 50px of height the founder asked back: moved into
   the title row as a 44px glyph.
3. "Check out" and "2 adults" wrapped inside their fact cells: labels are one
   line, cells a rung tighter.
4. At 390 the primary's chevron was clipped by its own label: padding a rung
   down, label and glyph a hairline apart.
5. The profile "More actions" menu (D1) now opens from its left edge and ends
   at 362 on a 390 screen: fixed and proven (`pass1/profile-menu-390.jpg`).
6. A two-word standing chip ("Fast replies") broke over two lines: chips are
   one line.
7. The shooter's Requests click hit the wrong tab; corrected for pass 2.

**Pass 2, 23 September** (`pass2/`, the card set beside the target at the
same crop). Found and fixed on the card:
1. The name and the price were set in the display face at bold and read as
   headlines; the render sets both in the text face at a semibold weight.
2. The two dates broke over two lines at 390 ("22 Jun / 2026"): the facts
   grid gives the dates more room than the guests (1.12, 1.12, 0.76, as the
   render spaces them), the glyphs step down to 12 and the values to 500.
3. The primary's chevron was back but crowded against the label: a 4px gap,
   labels at 600 as the render draws them.
Other routes, re-opened at 390 and 1440: no new fault in this group's files.
One outside it: the inbox segment's selected tab is still the shared
`Segmented`'s flat navy (reported). The Requests tab now proven
(`pass2/inbox-requests-*.jpg`).

**Pass 3, 23 September** (`pass3/`). Card: "22 Jun 2026" now keeps to one
line, but the weighted columns moved the wrap to "25 Jun / 2026" and "2 /
adults". Fixed by removing the indent instead: the glyph sits on the label's
line and the value runs from the cell's edge, three equal columns. The
primary's chevron drew at 14 and read as a speck beside a 13px label: 16.
Other routes, third look at every inventory item at 390 and 1440 (profile
agent and member bars, every tab, the empty profile, the menu, followers and
its empty state, edit, inbox and its requests and empty states, the three
thread faces top and bottom, the options sheet, the share picker, the six
skeletons): nothing left drawing its own container, edge, glow, button or
plate in this group's files. Routes 1 to 11 close on pass 3.

**Pass 4, 23 September, the card only** (`pass4/`, 390 and 1440 beside the
target). Every fact now holds one line at 390; the desktop card (400 wide)
reads as the render at its proportions. Found: at 390 the primary's chevron
was still squeezed to a speck, because the flex row shrank the glyph beside a
label that filled the bar. Fixed: the glyph never shrinks, and under 480px the
button labels step down a rung.

**Pass 5, 23 September, the card only** (`pass5/`, both faces: the booking
card in the thread and the listing card in the share picker, beside the
target). The chevron draws full size after its label; every fact is one line;
the listing face's title, Verified, price and period chip sit as the render's
anatomy would put them. Nothing found. Card closes on pass 5. Still differing
from the render, on purpose: the buttons are 44 tall against its 30 (tap law),
our type is a rung larger than its 390 rendering, so the card is 392 tall at
390 against its 307; the "Confirmed" badge is the shared emerald StatusPill
with its dot where the render draws a teal label; Contact carries the chat
glyph because it opens a conversation, not a call.

Final figures: routes in the group 12, swept 11 (the twelfth draws nothing of
its own), audit passes 3 on every route, 5 on the card.


## 13. Platform sweep: home (both sides), search and filters, listing detail, price check (worker "sweep-home")

Scope (SESSION_B_SCOPE, "Sweep group: home, search and filters, listing
detail"): `app/css/home.css`, `explore.css`, `catalogue.css`, `map.css`,
`price-check.css` and the components they style (`components/app/home/**`,
`search/**`, `filters/**`, `listing/**`, `price/**`, `ListingCard.tsx`,
`app/(app)/{home,search,listing,price}/**`). Governing images, which the
swept result must still match: `founder/GOVERNING-home-markets-target.png`
(in-app home chrome and tiles), `roles/GOVERNING-01` screen one (property
home), `roles/GOVERNING-09` screen one (Stays home), `3EB3E2A9` (search
results and the filter sheet), `9E8B56ED` (listing detail: lead card,
Move-in Total, amenity tiles, section tabs, agent card, the Calculate
Breakdown and Book Inspection foot), with `7B5335E0` and `0D3D34D2` for the
gallery. All five images draw the same anatomy the console and Get started
now carry (glass fill, lit top rim, per-side edge, small outer glow, lit
primary), so no surface here needs to keep a different anatomy on the
image's say-so; where one does, the row below says why.

The notifications block that used to live in `home.css` moved to the
settings group in 790d8c2a and is not in this inventory.

### 13.H.1 Routes in the group (8)

| # | Route | What draws it | Proof source |
|---|---|---|---|
| 1 | `/home` | `HomeScreen`: greeting, `CityRow`, `HomeHero`, `CategoryRow` (four tiles), `FeaturedBand` of `ListingCard`, `EmptyState` + `EmptyActions` | harness `home` (fixture rows), `home-empty` (the route's own page; this box cannot reach the database, so its reads come back empty and the empty shelf draws) |
| 2 | `/stays` | the same `HomeHero`, `CategoryRow` (two columns, four doors), `FeaturedBand` of `StayCard` (the card is the stays group's; its `nf-pcard`/`nf-stay-card__chip` rules are in `catalogue.css`, so here) | harness `stays` (fixture cards) |
| 3 | `/search` | `ShelfBar` (field, filters square, chips), `ShelfCount` (count, sort menu), `ListingCard` grid, `FilterDrawer` sheet, `MapCanvas`/`MapDock` in map view, `EmptyState`, `loading.tsx` | harness `search`, `search?filters=open`, `search-empty`, `search-empty?view=map`, `loading?of=search` |
| 4 | `/listing/[id]` | `ListingGallery`, `ListingActions`, `PhotoViewer`, lead card, `ListingMoveInBlock`, `ListingSpecChips`, `ListingAmenityTiles`, `ListingSectionTabs`, description panel, `ListingMoveIn`, `ListingPurchase`, `ListingTenure`, `ListingAmenities`, `ListingUtilities`, `ListingReviews`, `ListingCodeRow`, `ListingPhotoGrid`, `ListingWalkthrough`, `ListingAgentCard` + `VerifiedAgentBadge`, `RentalPanel`, `ReservePanel`, `ReserveTable`, `TenancyTerm`, `ExampleNotice`, `ListingStickyBar`, `loading.tsx` | harness `listing` (the f3 rental composition), `listing-parts` (every other panel), photo viewer opened by a click, `loading?of=listing` |
| 5 | `/price` | `PriceCheckScreen` (ladder rungs, place suggest list, `PinMap`), `ResultPanel`, `AreaPanel`, `ShareAreaButton` | harness `price` (no pin yet), `price-area`, `price-answered` (fixture) |
| 6 | `/price/area/[id]` | the shared area card `nf-pc-card` | not shot: needs a stored share row; the card's rules are swept with the rest of the file |
| 7 | `/rent/move-in/[listingId]` | `MoveInLedger` (`nf-ledger-card`, `nf-detail-tag`): the Calculate Breakdown target, styled in `catalogue.css` | not in a harness yet (added in the apply step) |
| 8 | `/assistant` | `AssistantChat` (`nf-ai__*` in `home.css`): no group names this route, the rules are in a file this group holds | not shot yet; flagged to the lead |

### 13.H.2 Inventory: every place that draws its own container, button, rim, glow, glass or plate (written before any change, 23 September)

Shared already (inherits Phase 1 with no edit here): every `Button` and
`ButtonLink` (8 primary, 6 secondary, 2 ghost across the group, plus the
filter sheet's Reset and Apply and the price check's six), `nf-glass`,
`nf-glass--card`, `--tile`, `--strong`, `--chrome`, `nf-card`, `Switch`,
`nf-range`, `nf-icon-btn`, `EmptyState`, `Section`. Everything below is
LOCAL: a rule or a utility in this group that paints its own fill, edge,
rim, glow, radius or blur. Line numbers are `catalogue.css` (C), `home.css`
(H), `price-check.css` (P), `map.css` (M), `explore.css` (E) at 3621452c.

**Home, both sides (routes 1, 2)**

| ID | Item (state) | Where | Draws today |
|---|---|---|---|
| H1 | location chip, rest / hover / pressed | H `.nf-home__loc` | `nf-glass--tile` + own hover edge `--nf-brand-edge-strong`, own press scale |
| H2 | hero plate (photo card) | H `.nf-hero-plate` | own radius `--nf-radius-xl` (the console's container is 10px), own 1px edge, `--nf-glow-edge` |
| H3 | hero place chip on the photo | H `.nf-hero-plate__chip` | own glass: canvas mix, rim-thin edge, raw `blur(10px)` |
| H4 | hero search well, rest / focus | H `.nf-hero-plate__search` | own well: canvas 78 per cent, raw `blur(14px)`, own focus edge |
| H5 | hero filters button | H `.nf-hero-plate__filters` | own quiet button: brand 18 per cent, soft edge, no rim, no glow |
| H6 | category tile icon plate, rest / hover | H `.nf-cat-tile__plate` | own plate: 160deg brand wash, 1px edge, rim, 22px glow, radius-lg |
| H7 | two-column door tile (Stays), rest / hover | H `.nf-cat-row[data-columns="2"] .nf-cat-tile` | own well card, soft edge, no rim, no glow; plate stripped |
| H8 | featured head, See all link | `FeaturedBand` | type only, nothing to sweep |
| H9 | property card, rest / hover / focus | C `.nf-pcard`, `:hover` | `nf-glass--card` + own hover glow stack (`--nf-glow-edge-strong`, floor, `--nf-bloom-card`) |
| H10 | card photo plate, no-photo plate, note | C `.nf-pcard__media`, `__nophoto`, `__note` | own radius-md, media ground; own overlay chips |
| H11 | card status badges: Verified, For rent/sale, Example | C `.nf-pcard__mark`, `--market`, `--example` | own glass badge: brand 38 per cent over media, 14px glow; Example on the WARNING ink (an amber edge, off the one blue family) |
| H12 | card heart, rest / saved / pressed | C `.nf-pcard__heart` | own media glass square |
| H13 | card "+1" fact chip | C `.nf-pcard__fact--more` | own well chip |
| H14 | empty shelf | `EmptyState`, `EmptyActions` | shared |
| H15 | unmounted: market tiles, featured cities, invest band, trending strip, city hero, category rail, recent strip, host panel | `MarketTiles`, `FeaturedCities`, `InvestBand`, `TrendingStrip`, `CityHero`, `CategoryRail`, `RecentStrip`, `ListingHostPanel`; H `.nf-home__market*`, `.nf-home__city*`, `.nf-home__invest*`, `.nf-home__search*`; E `.nf-market__*` | no route imports them (grep, 23 Sept). They draw their own tiles, chips, plates and a flat search plate. To be DELETED with their rules, not moved |
| H16 | Stays card chips (stays group's card) | C `.nf-stay-card__chip` | own well chip |

**Search and filters (route 3)**

| ID | Item (state) | Where | Draws today |
|---|---|---|---|
| S1 | shelf bar under the header | C `.nf-shelf-bar` | `nf-glass--chrome` + own bottom hairline |
| S2 | search field, rest / focus | C `.nf-shelf-field`, `:focus-within` | own well: soft edge, rim, 3px focus glow ring |
| S3 | field go arrow | C `.nf-shelf-field__go` | own radius-sm |
| S4 | filters square (with the count badge) | C `.nf-shelf-square` | own glass button: 1px edge, rim, 16px glow, radius-md |
| S5 | filter chips (market, beds, price), rest / on / focus | C `.nf-shelf-chip`, `--on` | own chip on control radius; own selected fill (brand 26 per cent), rim, 16px glow |
| S6 | result count line, sort button | C `.nf-shelf-sort > summary` | own well button, subtle edge, no rim |
| S7 | sort menu (popover), item current / hover | C `.nf-shelf-sort__menu`, `__item` | own popover: elevated surface, soft edge, `--nf-elev-3`; own tints |
| S8 | results grid cards | H9 to H13 | as home |
| S9 | filter sheet panel, backdrop, grip, head, close | C `.nf-filters`, `__grip`, `__head`; `FilterDrawer` backdrop utility | own glass sheet: canvas 92 per cent, strong blur, left edge, `--nf-elev-3`; grip on `--nf-radius-pill` (a shape, allowed) |
| S10 | sheet option tiles (type, market, beds, baths), rest / hover / pressed | C `.nf-filters__tile`, `[aria-pressed]` | own well tile; selected is a FLAT `--nf-brand-primary` fill + 18px glow, not the lit button |
| S11 | sheet amenity switches | `Switch` | shared |
| S12 | sheet price range | `nf-range` | shared |
| S13 | sheet input rows (location, sort), rest / focus | C `.nf-filters__row`, `:focus-within` | own well, rim, 3px focus ring |
| S14 | sheet group dividers, foot band | C `.nf-filters__group + ...`, `__foot` | hairlines only |
| S15 | sheet Reset / Apply (count) | `Button` secondary / primary | shared |
| S16 | map view: canvas, pins, clusters, user dot, floating card, dock card, zoom | `MapCanvas` (inline `LIFT`/`CARD_LIFT` shadows, Tailwind `bg-[var(--nf-surface-primary)]` x8, `border-*`), `MapDock` (`nf-card`, Tailwind), M `.leaflet-*` (`!important` zoom skin), M `.nf-map-pin-drop` ring | own surfaces and shadows throughout |
| S17 | empty results | `EmptyState` | shared |
| S18 | loading skeleton | `search/loading.tsx` | `nf-glass` + own `border-[var(--nf-border-subtle)]` |
| S19 | active filter chips, view toggle, filter links | `filters/ActiveFilters`, `ViewToggle`, `FilterLink` | shared `nf-chip`; checked in the apply step |

**Listing detail (route 4, and 7)**

| ID | Item (state) | Where | Draws today |
|---|---|---|---|
| L1 | gallery: back, counter, arrows, dots | `ListingGallery` Tailwind `bg-[var(--nf-overlay-media*)]`, `border-on-media`, `backdrop-blur-md` x5 | own media glass buttons |
| L2 | gallery marks: For rent, Verified | C `.nf-gallery-mark`, `--market` | own badge: brand 30/62 per cent over media, 16px glow, radius-sm |
| L3 | save and share on the photo | `ListingActions` Tailwind (`bg-black/45`, overlay, blur) | own media glass, one raw `black/45` |
| L4 | photo viewer chrome | `PhotoViewer` Tailwind overlay x4, blur x4 | own |
| L5 | lead card | `nf-glass--card nf-detail-lead` | shared material |
| L6 | market tag, verified badge | C `.nf-detail-tag`, `--market`, `.nf-detail-verified` | own badges; verified carries rim + 18px glow |
| L7 | spec tiles | C `.nf-spec-tile` | own well tile + rim, no edge light |
| L8 | Move-in Total panel and its rooms plate | C `.nf-detail-movein`, `__rooms` | own lit panel: 135deg brand wash, edge, rim, 28px glow, radius-lg |
| L9 | amenity tiles, More | C `.nf-amenity-tile` + `nf-glass--tile` | shared material, own radius-md |
| L10 | section tabs, active underline | C `.nf-detail-tabs`, `[aria-current]::after` | own sticky bar ground; underline glow 10px (a shape, allowed) |
| L11 | description / location panel | C `.nf-detail-panel` | own well card, subtle edge, rim |
| L12 | agent card, avatar, Verified Agent pill, verify steps | C `.nf-agent-card`, `__avatar`, `__pill`, `.nf-verify-step` | own well card + rim; own filled pill; own circle steps |
| L13 | move-in and purchase rows, total | C `.nf-movein__row`, `[data-declared]`, `__total` | own well rows; own lit total (a copy of L8) |
| L14 | sticky foot: price, Calculate Breakdown, Book Inspection | `ListingStickyBar` (`nf-card`, `nf-action-bar-pinned`, `ButtonLink`) | shared buttons on a shared card |
| L15 | rental / sale / reserve / table panels | `RentalPanel`, `ReservePanel`, `ReserveTable`, `TenancyTerm` (`nf-card` + Tailwind `border-[var(--nf-border-subtle)]` x14, `bg-[var(--nf-brand-primary)]` selected slot, `bg-[var(--nf-glass-fill)]`, warning-tinted note) | own inner rows, selected slot a flat fill |
| L16 | reviews, utilities, walkthrough, code row | `ListingReviews`, `ListingUtilities` (`nf-card`, own borders), `ListingWalkthrough` (`surface-inset`), `ListingCodeRow` (Button) | own inner borders |
| L17 | example notice | `ExampleNotice` (`border-[var(--nf-state-warning)]`, warning surface) | amber, off the one blue family |
| L18 | loading skeleton | `listing/[id]/loading.tsx` | `nf-card nf-glass--strong` |
| L19 | stay / restaurant detail anatomy (stays group's routes, rules here) | C `.nf-spec-strip`, `.nf-detail-field`, `.nf-detail-capsule`, `.nf-host-row__avatar` (pill radius on a round avatar, allowed), `.nf-stay-type`, `.nf-room-tile`, `.nf-stay-fact(s)` | own well cards |
| L20 | move-in ledger (route 7) | C `.nf-ledger-card`, `__glyph` plate, `.nf-ledger-compare__verdict` | own card + 24px glow; own icon plate |

**Price check (routes 5, 6)**

| ID | Item (state) | Where | Draws today |
|---|---|---|---|
| P1 | map panel, offline state, credit | P `.nf-pc-map`, `--offline`, `__credit` | own panel: radius-lg, edge, `--nf-glow-edge` |
| P2 | pin | P `.nf-pc-pin__head`, `__stem` | own (a shape, allowed) |
| P3 | place suggest list, item hover / focus | P `.nf-pc-suggest__list`, `__item` | own popover, no rim |
| P4 | confidence badges high / medium / low | P `.nf-pc-confidence--*` | own FILLED / quiet / outline badges on control radius |
| P5 | disclaimer, share none, share why, share link | P `.nf-pc-disclaimer`, `.nf-pc-share*` | own inset cards, no rim, no glow |
| P6 | strip plot, fact tiles | P `.nf-pc-strip`, `.nf-pc-fact` | own inset tiles |
| P7 | shared area card | P `.nf-pc-card` | own raised card with a brand top border |
| P8 | LIGHT RULES (seven blocks) | P `:root[data-theme="light"] ...` | dead since light mode left the platform; to delete |

**Other rules this group's files hold (other groups' components)**

| ID | Item | Where | Note |
|---|---|---|---|
| O1 | listing wizard (`nf-lw-*`: rail, back, note, choice, tile, fact plate, step, shot, add, details, id) | C lines 2353 to 2940, used by `app/agent/list/**` | host wizard is the chrome group's route; the rules are here, so they are swept here |
| O2 | stays category tile selected, stays hero object | C `.nf-stays-tile--on`, `.nf-stays-hero__object` | used by stays and host components |
| O3 | tenancy chip | C `.nf-tenancy-chip` | `bookings/TenancyCard` (stays group) |
| O4 | `nf-cat-surface .nf-card` glow override | C | every catalogue page (listing, stay, restaurant, trips, bookings, checkout, saved) |
| O5 | assistant (`nf-ai__*`: avatar, bubbles, result card, result mark, thinking, ring, chips, well, send) | H | route 8 |
| O6 | `nf-reg-card*` | C | no component uses it; to delete |

Counted: 57 local items across 8 routes (H1 to H16, S1 to S19, L1 to L20,
P1 to P8, O1 to O6, less the rows marked shared).

### 13.H.3 Before proofs

`docs/design/proofs/session-b/sweep-home/before/`, each at 390 (dark, 2x)
and 1440, from a production build of 3621452c with
`VALLO_PREVIEW_HARNESS=1`, harness `app/(dev)/preview/session-b/sweep-home/`:
`home`, `home-empty`, `stays`, `search`, `search-filters`, `search-sort-open`,
`search-chip-focus`, `search-empty`, `search-map`, `search-loading`,
`listing`, `listing-viewer`, `listing-parts`, `listing-loading`, `price`,
`price-area`, `price-answered`. FIXTURE-BACKED except `home-empty`,
`search-empty` and `search-map`, which are the routes' own pages drawing the
empty state because this sandbox's egress refuses the Supabase host (so no
proof here shows a live row, and none claims to).

### 13.H.4 Applied (on Phase 1 as released in 9da8f86f)

The vocabulary used, so every row below reads the same way (all from
ledger 13.0; no value is written in this group's files, only token names):

| Role | Shared primitive | Where a class cannot be put on the element |
|---|---|---|
| Container, card | `Panel` / `panelClass()` (`.nf-panel`, `--card`, `--glass`) | the panel tokens by name: `--nf-panel-fill(-card)`, `--nf-panel-edge(s)`, `--nf-container-radius`, `--nf-panel-rim`, `--nf-panel-glow` (rules other groups' components draw, e.g. `nf-pcard` under `StayCard`, `nf-lw-*` in the wizard) |
| Icon plate | `IconPlate` / `iconPlateClass()` (`.nf-plate`) | `--nf-plate-fill`, `-edges`, `-shadow`, `-radius`, `-glyph-glow` |
| Primary action | `Button` / `ButtonLink variant="primary"` (lit bar, pooled bloom) | none left in this group |
| Secondary, quiet control, chip at rest, words on a photograph | `Button` / `ButtonLink variant="secondary"` or the class `nf-btn--glass` | `--nf-btn-glass-fill`, `-edge`, `-blur`, `-shadow` |
| Selected, pressed, filled status badge | none (13.0: "use the `--nf-selected-*` tokens") | `--nf-selected-fill`, `-edge(s)`, `-shadow(-inline)` |
| Field | `nf-glass nf-glass--well` | `--nf-glass-well-fill` over `--nf-brand-edge-soft` (the well's own two tokens) |
| Divider | | `--nf-panel-hair` |
| Hover / focus on a container | | `border-color: var(--nf-selected-edges)` / `var(--nf-selected-edge)` |

**Deleted rather than moved** (no route mounted them; each drew its own
tile, chip, plate or search plate): `MarketTiles`, `FeaturedCities`,
`InvestBand`, `TrendingStrip`, `CityHero` (home), `CategoryRail`,
`RecentStrip` (search), `ListingHostPanel` (listing), with their rules
(`.nf-home__market*`, `__city*`, `__invest*`, `__search*`, `__head`,
`__more`, all of `explore.css`'s `.nf-market*`, and `catalogue.css`'s
`.nf-reg-card*`, `.nf-stay-fact(s)*`, `.nf-stay-price-row`), and the seven
light-theme blocks of `price-check.css`. `markets.ts` stays: its types feed
`app/(app)/home/market-queries.ts`. `AiAssistantBanner` is unmounted too but
is KEPT, with its `.nf-home__ai*` rules, because `ambient.css` and
`chrome.css` (not this group's) cite it by path and the token check fails
on a dangling path; request R-SH1 below.

| ID | Item | Before | After | Reference (console / Get started) | Match |
|---|---|---|---|---|---|
| H1 | location chip | `nf-glass--tile` + own hover edge | `panelClass({variant:"card"})`, hover `--nf-selected-edges` | console figure card | yes |
| H2 | hero plate | own radius 22, edge, `--nf-glow-edge` | `panelClass()`, padding off for the photo | console panel | yes |
| H3 | hero place chip | own glass, raw `blur(10px)` | glass door tokens, radius 6 | Get started glass door | yes |
| H4 | hero search well | own well, raw `blur(14px)` | `nf-glass nf-glass--well`, focus `--nf-selected-edge` | console search | yes |
| H5 | hero filters | own quiet square | `ButtonLink variant="secondary" size="sm" iconOnly` | Get started glass door | yes |
| H6 | category plates (property) | own plate, 22px glow | `iconPlateClass({size:"lg"})` | console icon tile | yes, and now matches GOVERNING-01's four lit squares |
| H7 | Stays doors | own well card, object beside words | `panelClass({variant:"card"})`, object over the words as GOVERNING-09 draws them | console figure card | yes |
| H9 | property card, hover | `nf-glass--card` + own hover glow | `panelClass({variant:"card"})`, hover `--nf-selected-edges` | console figure card | yes |
| H10 | card photo, no-photo mark, saved note | own chips | photo inset on the container radius; chips on the glass door; the no-photo mark centred (it collided with the market tag, pass 1) | glass door | yes |
| H11 | Verified, For rent/sale | own glass badge + 14px glow | selected tokens (filled lit badge, as 3EB3E2A9) | console filled badge | yes |
| H11b | Example | own override over the shared badge | override deleted: the shared `nf-badge--example` (cyan outline, the pending family) draws it | | yes |
| H12 | heart | own media glass | glass door tokens | glass door | yes |
| H13 | "+1" fact chip | own well chip | glass door tokens | glass door | yes |
| H14 | empty shelf | shared | shared | | yes |
| H16 | stay card chips | own well chip | glass door tokens | glass door | yes |
| HL | home loading | radii 18/14, `nf-home__tiles` (no rule) | panel for chip and hero, `iconPlateClass` for the four, card skeletons on the panel card | | yes |
| S1 | shelf bar | own hairline | `--nf-panel-hair` | console | yes |
| S2 | search field | own well, 3px glow ring | well tokens, focus `--nf-selected-edge` | console search | yes |
| S4 | filters square | own glass + 16px glow | glass door tokens | glass door | yes |
| S5 | chips rest / on | own well / own 26 per cent fill + glow | glass door / selected | console segment | yes |
| S6 | sort button | own well, 40px tall (ratio 0.35) | glass door, 44px (0.32) | glass door | yes |
| S7 | sort menu, current item | own elevated popover | panel card; current on the selected state | console panel, nav row on | yes |
| S9 | filter sheet | own canvas glass, left edge, `--nf-elev-3` | panel material with the panel blur, grip on `--nf-panel-catch`, hairlines `--nf-panel-hair` | console panel | yes, and 3EB3E2A9's lit sheet |
| S10 | option tiles rest / hover / pressed | own well / flat brand fill + 18px glow | glass door / `--nf-selected-edges` / selected state | console segment | yes |
| S13 | location and sort rows | own well + 3px ring | well tokens, focus `--nf-selected-edge` | | yes |
| S15 | Reset / Apply | shared | shared (now Get started's glass door and lit bar) | | yes |
| S16 | map: pins, clusters, cards, controls, list, dock, zoom | inline `--nf-elev-*` lifts, `surface-primary` x8, own borders | chosen pin and cluster on the selected state, resting pin and every control on the glass door, the empty card, list and dock on the panel card, Leaflet's zoom on glass door tokens | | yes |
| S18 | search loading | radii pill/lg/md, own hairline | radius 10, `--nf-panel-hair`, card skeletons on the panel card | | yes |
| S19 | active filters, view toggle, filter link | shared `nf-chip`, `nf-segmented`, `nf-icon-btn` | unchanged (chips.css and controls.css, not this group's) | | inherits |
| L1, L3, L4 | gallery, save/share, photo viewer controls | Tailwind overlay fill + border + `backdrop-blur-md`, one `black/45` | `nf-btn nf-btn--glass nf-btn--sm nf-btn--icon` | glass door | yes, as 9E8B56ED's lit squares |
| L1b | frame counter, caption, notes on photos | Tailwind overlay + blur | `.nf-media-chip` on glass door tokens, radius 6 | glass door | yes |
| L2 | For rent, Verified on the photo | own badge + 16px glow | selected tokens | filled badge | yes (9E8B56ED) |
| L5 | lead card | `nf-glass--card` | `panelClass({variant:"card"})` | console figure card | yes |
| L6 | market tag, Verified listing | own badges | glass door / selected | | yes |
| L7 | spec tiles | own well | panel card | | yes |
| L8 | Move-in Total panel, rooms plate | own 135deg wash + 28px glow | panel card / glass door, radius 14 | console figure card | yes (9E8B56ED) |
| L9 | amenity tiles | `nf-glass--tile` + own radius | `panelClass({variant:"card"})` | | yes |
| L10 | section tabs, underline | own ground, 10px glow | `--nf-panel-hair`, underline `--nf-panel-catch` with `--nf-panel-halo` | console tab | yes |
| L11 | description, location panels | own well card | panel card | | yes |
| L12 | agent card, avatar ring, Verified Agent pill, steps | own well card, own pill | panel card, `--nf-panel-edge` ring with the halo, selected pill (no wrap, pass 1), plate steps | | yes |
| L13 | move-in and purchase rows, totals | own wells, own lit total | well tokens, `--nf-panel-edge` on a declared row, panel card total | | yes |
| L14 | sticky foot | shared `ActionBar` and buttons | unchanged | | inherits |
| L15 | rental, sale, reserve, table panels | `nf-card` + 14 own borders, flat brand slots | `nf-panel nf-panel--card`, `--nf-panel-hair`, slots `.nf-choice` (glass door / selected), steppers the glass door at radius 10 | | yes |
| L16 | reviews, utilities, walkthrough, photo grid | own borders, radius 18/14 | `--nf-panel-hair`, `--nf-panel-edge`, container radius | | yes |
| L17 | example notice | cyan warning rule | unchanged: the cyan is the pending family, not amber | | yes |
| L18 | listing loading | a rounded sheet (28px top) no longer drawn by the page | the panel card lead and the panel aside, radius 10 | | yes |
| L19 | stay / restaurant anatomy (stays group's routes) | own wells | panel card, glass door, well, plate tokens | | yes (rules here) |
| L20 | move-in ledger | own card + 24px glow, own glyph plate | panel, plate tokens, hairlines | | yes (route 7, not shot) |
| P1 to P7 | price check map, pin, suggest list, confidence, disclaimer, strip, facts, share, area card | own panels without rim or glow, flat fills | panel / panel card, selected pin and high confidence, glass door medium, hair outline low, well strip | | yes |
| P8 | light twin | seven blocks | deleted | | yes |
| O1 | listing wizard `nf-lw-*` | own wells, plates, glows, circles | panel card, plate, well, glass door, selected edges and shadow for chosen cards | | yes (rules here; the wizard is the chrome group's route) |
| O2, O3 | stays tile on, tenancy chip | own | selected / glass door | | yes |
| O4 | `.nf-cat-surface .nf-card` | glow override over the stride card | DELETED: the chrome group moves `.nf-card` itself onto the panel tokens once for every surface (lead, 23 Sept), so a second copy here would be the duplicate this sweep exists to remove; this group's own `nf-card` uses are `nf-panel nf-panel--card` | | yes |
| O5 | assistant | own avatar, bubble, result card, mark, chip, well and send overrides | plate avatars, panel card bubble and result, selected own bubble and marks, glass door chips and thinking pill, well tokens, the send override deleted (the shared lit primary draws it; dimmed on the lit fill when empty) | | yes |
| O6 | `nf-reg-card` | own | deleted (no reader) | | yes |

Kept on purpose: the glass OBJECTS' own glow (`.nf-stays-hero__object`,
`.nf-ai__lockup img`), which is the artwork's light and not a container's;
the spinner ring and the pin-drop ring (shapes); the grip and the rail
segments' pill ends (shapes, no letters); `.nf-media-chip--lg`, the "+N"
scrim over the last grid photo (a scrim, not a chip).

Every panel that holds a lit primary (the rental, sale, reserve and table
panels, the example panel, the map's empty card, the filter sheet) carries
`isolation: isolate` so the button's pooled bloom is not painted under the
panel's fill (13.0, known work).

**Routes swept / routes in group: 8 / 8.** `/home`, `/stays` (the home
components; `StayCard` is the stays group's and still carries
`nf-glass--card` as its own class, so its container will move when that
group sweeps the component: the `nf-pcard` rule now holds layout only),
`/search`, `/listing/[id]`, `/price`, `/price/area/[id]`,
`/rent/move-in/[listingId]`, `/assistant`. Not shot: `/price/area/[id]`
(needs a stored share) and `/rent/move-in/[listingId]` (no harness); their
rules are swept with the files and were read, not photographed.

Requests (to the lead):
- **R-SH1.** `AiAssistantBanner.tsx` is unmounted. Delete it with its
  `.nf-home__ai*` rules once `ambient.css` (451) and `chrome.css` (93) stop
  naming it; those two comments are the chrome group's.
- **R-SH2.** `StayCard` (stays group) should take `panelClass({ variant:
  "card", className: "nf-pcard ..." })` as `ListingCard` now does.
- **R-SH3.** A shared filled status badge (the console's `.nf-admin-badge`
  anatomy) belongs in the shared layer; this group draws its filled badges
  on the selected-state tokens meanwhile.

### 13.H.5 Audit passes

Method for every pass: a production build of the branch with
`VALLO_PREVIEW_HARNESS=1`, all 19 harness states shot at 390 (2x) and 1440,
each opened beside its before shot and beside the console / Get started
anatomy (panel, plate, glass door, lit bar, selected state), and every
text-bearing control with a box measured for radius over short side
(`ratio.mjs`: buttons, links, inputs, selects, summaries, badges, chips,
tags, pills, marks).

**Pass 1, 23 September.** Found: (1) the "No photographs yet" mark sat on
the market tag at the photo's foot on every narrow card (it predates the
sweep; both were bottom corners); centred it on the photo. (2) The
Verified Agent pill wrapped to two lines in the agent card at 390; no wrap.
(3) Measured 178 controls, 18 at or over 0.35: the header avatar on nine
routes (round by rule), the sort button (14 over 40 = 0.35; raised to 44
tall, 0.32), the gallery counter and photo notes (14 over 30 = 0.47 after I
had put them on the control radius; back to 6, 0.20), the reserve and
tenancy steppers and the party input (14 over 32 to 40; radius 10), the day
slots (14 over 37 wide; given side padding), the medium confidence badge (14
over 40; radius 10). (4) The listing harness drew the lead card from the f3
harness's old `nf-glass--card`; the group's own harness copy now matches the
route.

**Pass 2, 23 September.** 201 controls measured, 9 at or over 0.35, all nine
the round header avatar (allowed). Re-opened every state: cards, badges,
heart, fact chip, sort menu and its current row, filter sheet (sheet, grip,
option tiles at rest and pressed, rows, Reset and Apply), map (empty card,
note, controls, zoom), gallery and photo viewer controls, lead card, Move-in
Total, amenity tiles, tabs and the focused tab, description, agent card,
every panel in `listing-parts`, price check (map, suggest, confidence,
disclaimer, strip, facts), assistant, and both loading skeletons. Found: the
lead asked for no second copy of `.nf-card` (the chrome group moves it for
every surface), so the catalogue override (O4) was deleted; and every panel
holding a lit primary got `isolation: isolate` so the pooled bloom shows.

**Pass 3, 23 September** (after the founder's C3.2 and C3.3 went in). 201
controls measured, 9 at or over 0.35, all nine the round header avatar.
Re-opened every state again, and the two new things: the lister line on the
home and search cards, and the lit primaries inside panels (Message agent
on the rental and sale panels, Request a table, Browse real listings), whose
pooled bloom now shows under the button. Found: on the two-up search card
the single ellipsised line cut "Listed by Emeka Johnson, agent" before the
role word, which is the one word the line exists for; the line now clamps at
two lines. Verified by applying that rule to the running pass 3 build
(`search-lister-two-lines-390.jpg`) rather than by a fourth full build, on
the brief's "do not rebuild for a CSS-only change". Nothing else found.
Every route in the group is closed.

**Proofs.** `docs/design/proofs/session-b/sweep-home/before/` (13.H.3) and
`after/` (pass 3 build, same 19 names, 390 at 2x and 1440, plus
`search-lister-two-lines-390.jpg`). Before, after and the console / Get
started anatomy were compared side by side at each pass (contact sheets in
the worker's scratch, not committed).

### 13.H.6 The founder's answers in this group (23 September, through the lead)

**C3.2, browsing is signed in only; back goes to the landing page.**
`lib/nav/route-parents.ts` now declares `"/search": "/"` and
`"/around": "/"` (was `/home`, which lands a signed-out reader on the
sign-in wall), and both screens' hard-coded `BackButton` fallbacks say "/".
Test: a new case in `lib/nav/resolve.test.ts` (search, search with a query,
around, all to "/"); `lib/native/back-button.test.ts` had `/search` as its
sample non-root with `/home` as the expected declared parent, and now
expects "/". The map test ("every route climbs to a root") still passes,
since "/" is a root. `/listing/[id]` still climbs to `/search`.

**C3.3, the lister line goes on the listing card.** Under the claims rule:
The founder deliberately overrides GOVERNING-01 here: the images govern
form, and he has taken this one form decision back. Track G exists so a
person can tell an owner from an agent from a firm, and the card is where
they look. `ListingCard` (the home featured card and the search results
card, one component) now mounts the existing `ListerRoleLine` under the
place line when the row carries `listerRole`, with `listerName` from
`public.listing_lister`: "Listed by the owner", "Listed by {name}, agent",
"Listed by {firm}". It is words in the muted ink at the card's fact size
(`--nf-pcard-fact`), one line, ellipsised, so the card grows by one caption
row and nothing else moves; no badge shape, because `listing_role` is a
claim until a member of staff dates it. A row with no role (the seed
catalogue) draws nothing, as the agent card already does.
NOT DONE, AND WHY: the person's TierBadge beside the name. The listing read
carries the lister's name and nothing else about them (`listing_lister` is
a two-column view by design), so there is no tier to hand `TierBadge`
without a new read. Request R-SH4 below.
Proof: `docs/design/proofs/session-b/sweep-home/after/home-390.jpg` and
`search-390.jpg`, fixture rows carrying the three states (agent with a
name, owner, firm with a name; `sweep-home/lister-fixtures.ts`).

- **R-SH4 (Session A).** Add the lister's badge tier to the public lister
  read (the `person_badge` tier beside `listing_lister`'s name, or a
  `listing_lister_tier` view) so the card and the agent card can draw
  `TierBadge` beside the name. Session B mounts it the day it lands.



## 13. Platform sweep: auth (Welcome back and every auth screen; worker "signin")

Scope: every auth route and every state the password step can show. Files
this group may change: `app/(auth)/layout.tsx`, `app/(auth)/sign-in/**`,
`app/(auth)/AuthBackBar.tsx`, `components/auth/AuthChoices.tsx`,
`EmailAuthForm.tsx`, `fields.tsx`, `app/css/auth.css`, the harness under
`app/(dev)/preview/session-b/signin/`. The render (55A56F21) still governs
Welcome back; the shared layer (Phase 1, RELEASED 9da8f86f) governs
everything the render does not measure.

#### Inventory (before any change), per route

Every place the group drew its own card, panel, button, rim, glow, glass or
plate, read off the source and the running build:

| Item | Where | Drawn by | Routes it appears on |
|---|---|---|---|
| I1 the card | `.nf-auth__card` (+ `::after` top highlight, narrow modifier) | auth.css: own translucent fill, own hot edge, own 3 px band, own bloom, own radius | every auth route |
| I2 the lit primary | `.nf-auth[data-theme="dark"] .nf-auth__card .nf-btn--primary` (+ hover, active), `.nf-auth__cta` | auth.css: own gradient sheen, own top and foot insets, own bloom, over the shared `.nf-btn--primary` | Continue (chooser), Sign in, the Google-account notice's button, sign-up's Continue and Sign up, verify, forgot and reset submits |
| I3 the Google door | `.nf-auth__door` | auth.css: own glass fill, own edge, own glow, own hover | chooser (sign in and sign up) |
| I4 the fields | `.nf-auth[data-theme="dark"] .nf-auth__card .nf-field` (+ focus, placeholder) | auth.css: own navy glass fill, own electric edge, own glows, over the shared `.nf-field` | every field on every auth route |
| I5 the language control | `[data-theme="dark"] .nf-auth__lang select.nf-btn.nf-btn--primary` | auth.css: own glass square over the site's filled pill | every auth route |
| I6 the back control | `.nf-auth .nf-auth__back-btn` | auth.css: own glass square | every auth route with a parent |
| I7 the notice plate | `.nf-auth__notice` | auth.css: own tint and edge | chooser notice, Google-account and no-account answers, provider-off line |
| I8 the refusal plate | `.nf-auth__alert` | auth.css: own rose tint and edge | refused, unconfirmed, throttled, deactivated |
| I9 the OR rule | `.nf-auth__rule` | auth.css: hairlines | chooser |
| I10 the password eye | `fields.tsx` PasswordField toggle, `rounded-[var(--nf-radius-lg)]` | own radius (18 on a 44 box: 0.41, over the shape review line when painted) | every password field |
| I11 the Optional chip | `fields.tsx` LabelRow, `nf-chip` | shared chip | sign-up form |
| I12 group dividers | `fields.tsx` FormGroup, `border-[var(--nf-border-subtle)]` | a neutral hairline | sign-up form |
| I13 strength meter | `fields.tsx` StrengthMeter bars | shapes (bars), not controls | sign-up form |
| I14 stage, lockup, plinth, terms line | auth.css | the render's own art (crop rule) and small print | every auth route |

Outside this group's files, drawn on its routes, and filed rather than
edited (request SW-A1 in the scope file): the four inline warning plates in
`ForgotPasswordForm.tsx` (2), `ResetPasswordForm.tsx`, `VerifyCodeForm.tsx`
and `EmailTakenNotice.tsx`, which paint refusals in the pending cyan
(`--nf-state-warning`) and should take `.nf-auth__alert`; the `nf-card`
confirmation box in `ForgotPasswordForm.tsx`, which should be the shared
Panel; the reset page's own `nf-btn--lg` primary (shared already, no change
needed).

#### What moved onto the shared layer (Phase 1, RELEASED 9da8f86f; reflection f440fd21)

| Item | Before | After | Local left, and why |
|---|---|---|---|
| I1 card | own fill, hot edge, band, bloom, radius | `Panel` anatomy by class: `.nf-panel .nf-panel--glass` (per-side lit edges, catchlight rim, halo, blur) | corner 18 (the render's 16, not the 10 px container corner), translucent fill so the render's stage shows through (the panel fill is opaque), the render's 3 px electric band and bloom added to the panel glow, the hot top highlight. The render governs Welcome back |
| I2 lit primary | local override (sheen, insets, bloom) | shared `.nf-btn--primary` (Get started's bar: edges, rim, inner glow, bloom, pooled light) | height 44 and label sizes only (R-A, R-B). Override DELETED |
| I3 Google door | own glass, edge, glow, hover | shared `.nf-btn .nf-btn--glass` | height, gap, label size only |
| I4 fields | own navy fill, electric edge, glows | shared `.nf-field .nf-field--glass` (well fill, focus halo), in `fields.tsx` and the chooser | height 44; the resting edge takes `--nf-panel-edge` (token) because the render draws a clear electric field edge and the shared glass edge vanishes on this card (pass 3) |
| I5 language control | own well fill and edge | shared glass button tokens (`--nf-btn-glass-fill/-edge/-shadow`) | the selector itself, because the site component draws a filled pill (not this group's file) |
| I6 back control | own well fill and edge | shared glass button tokens | size 44 |
| I7 notice plate | own edge | `--nf-panel-edge` and `--nf-panel-rim` | the brand tint fill (a calm note inside a card) |
| I8 refusal plate | rose tint and edge | unchanged: status colour, not anatomy | none |
| I9 OR rule | own hairline colour | `--nf-panel-edge` | none |
| I10 password eye | radius-lg (0.41 on 44) | `--nf-radius-control` (0.32) | none |
| I11 Optional chip | shared chip | unchanged | none |
| I12 group dividers | neutral hairline | `--nf-panel-hair` | none |
| I13 strength meter | shapes | unchanged (shapes, not controls) | none |
| I14 stage, lockup, plinth | the render's art | unchanged (crop rule) | none |

#### Per route

| Route | Swept | Container | Edge | Rim | Glow | Button | Plate |
|---|---|---|---|---|---|---|---|
| `/sign-in` | yes | panel (render corner, translucent) | panel edges | panel catch + hot top highlight | panel halo + render bloom | shared lit bar, shared glass door | n/a |
| `/sign-in/email` (+ harness google, none, refused, unconfirmed, throttled, deactivated, fields) | yes | same card | same | same | same | shared lit bar; notice's Google button shared lit bar | n/a |
| `/sign-up` | yes | same | same | same | same | shared | n/a |
| `/sign-up/email` | yes for this group's parts (fields, card, Sign up button); the Optional chip shared | same | same | same | same | shared | n/a |
| `/sign-up/verify` | card and fields yes; its refusal plate NO (SW-A1, not this group's file) | same | same | same | same | shared | n/a |
| `/forgot-password` | card and fields yes; its refusal plate and its `nf-card` confirmation box NO (SW-A1) | same | same | same | same | shared | n/a |
| `/reset-password` | card yes; its refusal plate NO (SW-A1) | same | same | same | same | shared | n/a |
| `/auth/callback` | n/a: outside the auth layout, draws the Verifying moment only | | | | | | |

Routes swept in full: 3 of 7 drawn auth routes (`/sign-in`, `/sign-in/email`,
`/sign-up`); swept in this group's files but with a remainder filed to the
lead as SW-A1: 4 (`/sign-up/email` is complete in practice; verify, forgot and
reset each keep one cyan refusal plate until SW-A1 lands).

#### Checks (whole project, under the heavy lock, after pull --rebase)

```
tsc --noEmit -p apps/web (NODE_OPTIONS=--max-old-space-size=6144)   TSC-OK
vitest run (whole suite)   Test Files 232 passed (232)   Tests 3784 passed | 1 skipped
check-css-tokens.mjs   clean
eslint on the changed files   0 errors
shape sweep, dark, 390 and 1536: /sign-in?welcomed=1, /sign-in/email, /sign-up?welcomed=1,
  /sign-up/email, /sign-up/verify, /forgot-password, /reset-password, harness refused,
  google, deactivated: BREACHES 0   WORTH AN EYE 0   ROUND ICON-ONLY 0
by hand: 59 controls on nine routes, worst radius / short side 0.32
```

#### Audit passes

**Pass 1, 23 September.** Re-opened every inventory item on the production
build, against the render and the Get started bar. Found: the plain shared
`.nf-field` rendered near black (#00050F) where the render's field is navy
glass (#00144C). Fixed: fields moved to `.nf-field--glass`.

**Pass 2, 23 September.** Found: the glass field drew no fill and no edge at
all (measured `background-image: none`): the shared `.nf-field--glass`
nested a gradient token inside `linear-gradient()`. Filed SW-A2 to "shared";
fixed on main as eb9afe04; the stand-in was removed here. Found: with the
field painted, the envelope glyph sat under it. Fixed: the glyph is lifted
above the field.

**Pass 3, 23 September.** Found: with SW-A2 fixed, the shared glass edge all
but disappears on the render's card (the render's field edge is a clear
electric line). Fixed: the resting edge takes `--nf-panel-edge`. Re-measured
on the build: field fill #001C53 (render #00144C), field edge #004AB8 (render
#0895FA at its brightest pixel, #00309B beside it: ours is between the two), card, button and door
unchanged in size and place (card 75, 368, 240 x 309; controls 44). Every
control on nine routes measured by hand: 59 controls, worst radius ratio
0.32. Nothing left drawing its own version in this group's files.

#### Proofs (`docs/design/proofs/session-b/sweep-auth/`)

`before-<route>-390.jpg` and `-1440.jpg`, `after-<route>-390.jpg` and
`-1440.jpg` for fifteen routes and states (the seven auth routes, the
callback, and the harness's seven password-step states), shot from the
production build (after: pass 3, the final CSS applied to the running build);
`card-render-before-after.jpg`: the render's card, before, after.

#### Live (LIVE PROOF RULE, 23 September)

| Link | Result |
|---|---|
| Gate: signed-out `/home` goes to `/sign-in?next=%2Fhome&notice=sign-in-required` with the notice drawn | LIVE PROVEN 2026-09-23 15:45 UTC, build of ba451343, `tests/session-b-signin-live.spec.mjs`, `sweep-auth/live/live-gate-home.png` |
| `/welcome` shows signed out | LIVE PROVEN, same run (200) |
| Chooser hands the address to the password step | LIVE PROVEN, same run |
| A made-up address (`@example.invalid`) and a wrong password: the real auth server refuses (`invalid_credentials`), drawn as "That email and password do not match. Check them and try again.", still signed out | LIVE PROVEN, same run, `sweep-auth/live/live-refused.png`; the raw reply captured separately: 400 `invalid_credentials` |
| The no-account and Google-account lookups (`signup_method_for_email`) | NOT PROVABLE on this box: the function is service-role only and this box holds no service key; the page falls back to the ordinary step, as designed |
| The rate limiter (`consume_rate_limit`) | NOT PROVABLE on this box, same reason: the limiter fails open without the service key, by design |
| A real sign-in landing on `next` | LIVE PROVEN 2026-09-23 16:34 UTC, build of 96a8bb87 (production, `next start`, NODE_USE_ENV_PROXY and the CA bundle set), as the QA member (957b3bd2), password from the environment only: `/sign-in?next=/wallet`, email-first Continue carried `next` to `/sign-in/email?next=%2Fwallet&...`, Sign in with the real password landed on `/wallet`, the `sb-...-auth-token` session cookie set; the wallet drew the member's real empty state (N0.00, "Nothing has moved through your wallet yet"). Run twice, both passed. Evidence: `tests/session-b-signin-live.spec.mjs --signed-in`, `sweep-auth/live/live-signed-in.png` |

Note for anyone running it: the server needs `NODE_USE_ENV_PROXY=1` and
`NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` on this box, or Node's fetch
never reaches the project and the sign-in spins.

## 13. Platform sweep: console (every admin desk, all three workers' desks; worker "admin-shell")

Dated 23 September. Phase 1 (42ea43d9, 9da8f86f) moved the console's own
anatomy into the shared layer and pointed `Panel` and `IconPlate` at it. This
section closes the rest: nothing in `app/css/admin.css`, the money desks'
`money/_desk/desk.css` or the review desks' `_review/review.css` draws its own
panel, card, button, plate or selected state any more.

### 13.c1 Inventory (before changing anything)

Scanned with a rule-by-rule reader over the three stylesheets for every
`background`, `border`, `box-shadow` and `backdrop-filter` that did not come
from `--nf-panel-*`, `--nf-plate-*`, `--nf-selected-*`, `--nf-btn-*` or the
container radius (48 rules in admin.css, 12 in desk.css, 24 in review.css),
then read each against what it draws.

| Item | Where | What it drew | Now |
|---|---|---|---|
| Desk cards `.nf-card` | 53 class uses in 28 files under `app/admin` (switches, standing, stops, examples, reference, fees, flags, reports, social, agents, businesses, support, alerts, audit charts, bookings, reservations, listings, money rows, payments) | a local re-skin, `.nf-admin .nf-card`, painting the panel recipe over `.nf-card` | the shared `.nf-panel .nf-panel--card` in the markup (`nf-admin-card` keeps the old block layout); the re-skin rule deleted |
| KPI card, pulse strip | `_components/panels.tsx` | the panel recipe restated in `.nf-admin-kpi` and `.nf-admin-strip` (plus a local top glow) | `panelClass({ variant: "card" })` in the markup; the material declarations deleted |
| Queue and audit tables | `QueueTable.tsx`, `audit/AuditList.tsx` | the panel recipe in `.nf-admin-table` | `.nf-panel .nf-panel--flush` in the markup |
| Money cards | `money/_desk/Desk.tsx`, `MoneyDesk.tsx`, `escrow/EscrowDesk.tsx` | `.nf-md-card` restating the recipe, and a `::before` catchlight of its own | `.nf-panel` (panels) and `.nf-panel .nf-panel--card` (KPIs, stages) in the markup; the recipe and the `::before` deleted |
| Review panels | 37 class uses of `nf-rv-panel` | `.nf-rv-panel` restating the recipe with its own rim | `.nf-panel` in the markup; the recipe deleted |
| Tabs | `.nf-admin-tab`, `.nf-rv-tab` | own well fill, brand edge, glow ladder | glass door (`--nf-btn-glass-*`); open tab on `--nf-selected-*` |
| Pagers | `.nf-admin-pager__page`, `.nf-md-pager__item`, `.nf-rv-pager__item` | own well fill; current page on a pasted gradient | glass door; current page on `--nf-selected-*` |
| Segments, chips, row View, menu, icon button hover, money toggle, review back and quiet buttons | admin.css, desk.css, review.css | own fills and rims | glass door; "All" chip on `--nf-selected-*` |
| Selected child row in the rail | admin.css | own 26% wash | glass door with the selected edge |
| Row tile, review plate | `.nf-admin-row__tile`, `.nf-rv-plate` | own well or gradient and glow | `--nf-plate-*` |
| Desk tile (console overview), drawer panel | admin.css | own glass card and gradient | `--nf-panel-*` |
| KPI hovers | `a.nf-admin-kpi`, `a.nf-md-kpi` | own inset and glow | the selected edge on the shared material |
| Switch | none in the console | the switches desk uses Switch on / Switch off buttons, not a switch | nothing to move |

Kept, each for a reason: the rail (5EAA44CB draws it as a flatter glass
column than a panel, ledger 6.2); status badges, chip state tints, review
status dots and roles (a state's colour carries meaning, not material); the
review desk's approve and reject action buttons (their tone is the decision);
the calm note (the console's designed empty state, kept by Phase 1); meters,
bars and chart marks (data, not containers); the glass bar and search fields
(fields are not in this sweep's list); imagery (thumbnails, media, map).

### 13.c2 Per route

28 harness routes, 1440 and 390, dark. Before from main at 6fbc57d1, after
from this commit, both production builds.

| Route | Surface | State | Container, edge, rim, glow, button, plate | Match to the console reference |
|---|---|---|---|---|
| `/preview/session-b/admin/overview` | Overview (fixture) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/overview?state=live` | Overview (empty) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/operations` | Operations, jobs | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/operations?tab=inflight` | Operations, In flight | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/operations?tab=notifications` | Operations, Notifications | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/analytics` | Analytics (fixture) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/analytics?state=live` | Analytics (empty) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin/back` | Back arrow as /admin/money | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-money/money` | Money | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-money/escrow` | Escrow | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-money/payments` | Payments | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-money/bookings` | Bookings (stays) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-money/supply` | Supply | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-review/listings` | Listings queue | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-review/review` | Listing under review | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-review/moderation` | Moderation | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/session-b/admin-review/kyc` | Verification | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/f5/admin-desks` | Desks (switches, standing, stops, examples, reference) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/f5/admin-overview` | Console overview (desk tiles) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/f5/admin-queue` | Unified queue | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/f5/admin-frame` | Frame and access screen | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/bd/reservations` | Reservations | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/bd/refunds` | Refunds | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/bd/payments` | Payments (old harness) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/bd/alerts` | Alerts | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/bc/audit` | Audit log | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/c1/listing-review` | Listing review (old harness) | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |
| `/preview/p3/admin-businesses` | Businesses | swept | panel, card, table on `.nf-panel`; controls on the glass door; open states on the selected tokens; plates on `--nf-plate-*` | yes |

Routes swept: 28 of 28. The three old deck harnesses (`bd/*`, `p3/*` and the
`f5/admin-*` frame) draw a narrow rail whose labels wrap letter by letter at
1440; it is the same before and after, a harness width, not this sweep.

### 13.c3 Audit passes

- **Pass 1, 23 September.** After the first application, every route
  re-shot and paired with its before (`pairs-1440/*-before-after.jpg`,
  mean pixel difference per route ranked). Found: the converted desk cards
  took the shared panel's flex column, so a card's action (Switch off,
  Switch on) fell under its text on the switches desk; the old `nf-card` had
  no padding and the panel adds some. Fixed: `.nf-admin-card` restores the
  block box and zero padding (Tailwind's `p-*` still wins).
- **Pass 2, 23 September.** Re-shot: the switches desk was unchanged,
  because the `f5` harness renders the desk outside `.nf-admin`, where the
  first fix was scoped. Fixed by marking the converted cards with
  `nf-admin-card` in the markup instead of scoping by ancestor.
- **Pass 3, 23 September.** Re-shot: a card that lays itself out as a row
  (`flex flex-wrap`) still wrapped as a column, because the shared panel sets
  `flex-direction: column`. Fixed with `flex-direction: row` on
  `.nf-admin-card`. Re-shot all 28: the switches desk now matches its before
  in layout, every card and control is on the shared material, and the
  remaining differences are the intended ones (the lit panel replacing the
  dull `.nf-card` on the listing review, businesses and refunds harnesses;
  the glass tabs and chips). Shape sweep, dark, 26 of these routes: BREACHES
  0, over 0.35 0, round icon-only 0, refused 0 (the tool reports 16
  combinations measured).

Proofs: `docs/design/proofs/session-b/sweep-console/pairs-1440/` (before left,
after right, 28) and `after-390/` (28).

## 13. Platform sweep: wallet family (wallet, send, receive, top up, withdraw, transactions, receipt, pots, result sheets, payment methods; worker "wallet")

Dated 23 September. Commits de290b2b (SW-ST3, every money card on `Panel`,
every glyph plate on `IconPlate`, the local material deleted) and 24bbdda5
(the balance card's positioning context, the pay row hover, the after
proofs). Reference for every container, edge, rim, glow, button and plate:
the shared layer of Phase 1 (42ea43d9, 9da8f86f), which is the console's
anatomy and Get started's buttons. The governing renders 6AF37222 (`/wallet`)
and 77A54EA3 (`/wallet/send`) still win where they measure something the
shared layer does not; those are listed as governed exceptions below.

### 13.w1 Inventory (before changing anything)

| Item | Where | What it drew | Now |
|---|---|---|---|
| Money card material | `wallet.css` `.nf-money .nf-card` and the `--nf-wallet-lit-edge`, `-lit-fill`, `-lit-glow` vars | its own per-side edge, banded fill and halo, 14px corner | deleted; every money card is `panelClass({ variant: "card" })` |
| Cards in markup | `nf-card` in RecentActivity, TransactionsSection, SendFlow (form, sent, confirm), ReceiveCard (2), Receipt, TrustStrip, MoneySheet, PaymentMethodsPanel, FundingVerifier, three `loading.tsx` skeletons (two with a 22px `radius-xl` override) | the legacy 22px stride card, re-skinned by the rule above | `Panel` (`.nf-panel .nf-panel--card`), 10px container corner |
| Glyph tiles | `wallet.css` `.nf-glyph-tile`, `--lg`, `--solid`; used by Receipt, TrustStrip, ReceiveCard, PaymentMethodsPanel (2) | own tint, brand edge, drop glow, 14 to 16px corners; a solid blue circle on receive | deleted; `IconPlate` (sm in rows, md in heads) |
| Transaction circle | `wallet.css` `.nf-tx-tile` (EntryRow, Receipt) | own tint, a local rim var, own glow | `IconPlate size="sm"`; the one local line left is its circle (governed, below) |
| Result marks | `ResultSheet.tsx`, SendFlow sent and confirm, `.nf-result-mark` | a glass object on a visible dark square (SW-ST3) | `IconPlate size="lg"` with the state's tone (success, error, pending, brand, info); the mark rules deleted |
| Quick cards, send rows, send trust card, recipient found, pay rows | `wallet.css` | own lit fills and rims | `--nf-panel-edges`, `--nf-panel-fill-card`, `--nf-panel-rim`, `--nf-panel-glow`, container radius |
| Hero tiles, back control, amount chips, Instant chip | `wallet.css` | own tile fill and rim vars | glass door (`--nf-btn-glass-*`) |
| Send tile, Send Money CTA | `wallet.css` | own lit fill and cyan edge var | lit bar (`--nf-btn-lit-*`) |
| Pressed amount chip, pay row hover | `wallet.css` | own gradient and brand-edge ring | `--nf-selected-*` |
| Round-three overrides | `wallet.css` (hero `--nf-wallet-lit-glow`, radius-sm on rows and form, `brand-edge-soft` row edges, a third copy of the hero rule) | fought the shared tokens | deleted |
| Unused trust badge | `wallet.css` `.nf-trust__badge` | nothing (no markup uses it) | deleted |
| Local vars | `--nf-wallet-tile-fill`, `-rim-top`, `-rim-side`, `-rim-foot`, `-lit-edge`, `-lit-fill`, `-lit-glow`, `-cta-edge` | | deleted; only the balance card's three governed fill stops remain |
| State notices | MoneyWait, ErrorNotice, AddBankAccountSheet notice | 14 to 16px corners | container radius (their state tint stays: a notice, not a panel) |
| Pot cards | PotsSection | a control-radius box with a brand edge | `Panel` card |

### 13.w2 Governed exceptions (kept, and why)

- The balance card on `/wallet`, `/wallet/send`, top up and withdraw keeps
  6AF37222's measured fill (three stops) and its 14px corner, on the shared
  panel edges, rim and glow. The governing image wins for its own surface.
- The transaction circle stays a circle (`.nf-tx-tile.nf-plate`, one line):
  6AF37222 draws a 36px circle; the plate's material is the shared one.
- The send rows' plates are the render's own crops (crop rule), not
  `IconPlate`.
- The card brand word plate (`.nf-pay-brand`) is a brand mark, not an icon
  plate.
- The status notices keep their state tint.

### 13.w3 Routes (390 and 1440)

Material read from computed style on the running build (24bbdda5, harness
`/preview/session-b/...`). Panel = 10px, `--nf-panel-edges`, panel fill,
rim, glow. Plate = `.nf-plate`. Before = the legacy card (22px or 14px local
lit card), local glyph tiles.

| Route (harness) | Container | Edge | Rim | Glow | Buttons | Plate | Match |
|---|---|---|---|---|---|---|---|
| `/wallet` (`wallet`) | panel x1 + governed hero | panel | panel | panel | glass door tiles, lit Send | 5 plates (tx circles) | yes |
| `/wallet/send` (`wallet/send`, `wallet/send-filled`) | panel x1 (form) + governed hero | panel | panel | panel | lit CTA, glass chips, selected chip | render crops (governed) | yes |
| `/wallet/receive` (`sweep-wallet/receive`) | panel x3 | panel | panel | panel | shared Button | 5 plates | yes |
| `/wallet/top-up` (`sweep-wallet/topup`) | panel x1 + governed hero | panel | panel | panel | shared Button | none drawn | yes |
| `/wallet/withdraw` (`sweep-wallet/withdraw`) | panel x1 + governed hero | panel | panel | panel | shared Button | none drawn | yes |
| `/wallet/transactions` (`sweep-wallet/transactions`) | panel x1 | panel | panel | panel | none | 6 plates | yes |
| `/wallet/transactions/[id]` (`sweep-wallet/receipt`) | panel x2 | panel | panel | panel | shared Button x4 | 3 plates | yes |
| Pots (`sweep-wallet/pots`) | panel x2 | panel | panel | panel | shared Button x4 | none drawn | yes |
| Result sheet pending, failed (`sweep-wallet/result?state=`) | the shared Sheet | sheet | sheet | sheet | shared Button x3 | lg plate, pending and error tones | yes (SW-ST3 closed) |
| `/settings/payments` and the block on `/settings` (`sweep-wallet/payments`, `sweep-settings?v=payments`, `?v=hub`) | panel x1, pay rows on panel tokens | panel | panel | panel | shared Button (Add), selected hover | 2 plates | yes |

Routes swept: 10 of 10 (12 harness views, 14 with the two settings views).

### 13.w4 Three passes

1. 23 Sept, computed style on every route above: zero `.nf-card`, zero
   `.nf-glyph-tile` left in the family; every container 10px on the panel
   edges, the hero 14px (governed). `check-css-tokens`: clean.
2. 23 Sept, overflow and shape: every 390 proof is 780 device px wide (the
   send pages first came out 812: the balance card had lost `position:
   relative` with the deleted duplicate rule, so its wallet object escaped
   the clip; restored in 24bbdda5). `compare-surface --shape-sweep` on
   wallet, send, send-filled, payments, receive, receipt and the settings
   payments view: no text-bearing control is a capsule. By hand: hero tiles
   75x62 r14 (0.23), quick cards 85x82 r10 (0.12), rows 332x56 r10 (0.18),
   amount chips 64x44 r10 (0.23), Send Money 340x45 r14 (0.31), Add 85x44
   r14 (0.32), receipt buttons 150x51 r14 (0.28). All under 0.35.
3. 23 Sept, before beside after at 390 read by eye on every route: the
   wallet and send surfaces unchanged in layout (the renders still hold);
   the receipt, receive, payments and pots cards now read as the console's
   panel; the result sheet's dark square is gone.

### 13.w5 Proofs

`docs/design/proofs/session-b/sweep-wallet/<route>-<390|1440>-<before|after>.jpg`
for wallet, send, send-filled, receive, topup, withdraw, transactions,
receipt, pots, result-pending, result-failed, payments; and
`settings-hub-*-after.jpg`, `settings-payments-*-after.jpg` (their before is
`payments-*-before.jpg`, the same block drawn by the same component).

### 13.w6 Live proof, signed in as the QA member (reads only)

Run 23 Sept 17:02 UTC against the live project from the production build of
24bbdda5 on port 3174 (`next start`, `NODE_USE_ENV_PROXY=1`), by
`scripts/design/session-b-shots/wallet-live-reads.mjs`; credentials from the
environment only. Nothing was funded, sent, withdrawn or moved: the only
POSTs were the sign-in form and the recipient lookup server action. Every
typed address is blurred in the shots. Read-only SQL beforehand: neither QA
account has a `wallets` row, so the true balance is N0.00 and the history is
empty. Evidence: `docs/design/proofs/session-b/wallet-live/` (shots and
`steps.json`).

| Link | Result |
|---|---|
| Sign in as the member, land on `/wallet` | LIVE PROVEN (17:02, 24bbdda5, steps.json) |
| `/wallet` balance read | LIVE PROVEN: the hero reads N0.00, no failure copy (`01-wallet.jpg`) |
| `/wallet/transactions` history read | LIVE PROVEN: "No transactions yet", no failure copy (`02-transactions.jpg`) |
| `/wallet/receive` details read | LIVE PROVEN: the identity panel drawn, no failure copy (`03-receive.jpg`) |
| `/wallet/send` in wallet-to-wallet mode only | LIVE PROVEN: recipient field drawn, zero bank controls (`04-send.jpg`) |
| Recipient lookup of the QA admin (by email: the schema has no handle, the send form looks up by address) | NOT PROVABLE ON THIS BOX: the server action ran live (POST observed) but answered "unknown" with no reason, because `lookupRecipient` needs the service-role client and this box's `.env.local` carries only the URL and anon key (`05-send-recipient-found.jpg` shows no answer). Proves the moment `SUPABASE_SERVICE_ROLE_KEY` is set for the build; that key is the founder's to give. |
| Recipient lookup of the QA admin, ON PRODUCTION | LIVE PROVEN ON PRODUCTION (23 Sept 17:23 UTC; production's commit unknown: no version the member can read, `/api/version` answers 401, x-vercel-id iad1::4vpmn-1790184205432-808cf5483866). Signed in as the QA member, production's `/wallet/send` rendered signed in, and its `lookupRecipient` server action, given the QA admin's address, answered `found` with the account's display name and tier `platinum`. Send never pressed; no transfer, fund or withdraw action called. Run over HTTP (`scripts/design/session-b-shots/wallet-live-lookup-production.mjs`), not a browser: this box's Chromium fails every public site with ERR_CERT_AUTHORITY_INVALID. Production appears to still ship the bank mode (its page HTML matches the bank choice's markup or words), so the removal (32830d5b) has most likely not deployed there yet. Evidence: `docs/design/proofs/session-b/wallet-live-production/lookup-run.txt`. |

Links proven live: 6 of 6 (five on this box's build, the lookup on production).

## Push enrolment blind light (founder, 23 Sept)

Worker "push". Files: `components/app/push/{enrol.ts,PushSetting.tsx,PushPrompt.tsx}`,
new `device-state.ts`, `device-state.test.ts`, `enrol.test.ts`, one prop in
`app/(app)/settings/notifications/page.tsx`, proof script
`scripts/design/session-b-shots/push-blind-light.mjs`.

**The defect.** `push_tokens` has 0 rows ever (read-only SQL, 16:28:
`rows_ever 0, live 0`). The founder allowed notifications in the iPhone home
screen app, signed in, and the control looked on, with no message.

**The branch he hit (from the code at the time, not from device logs).**
`PushSetting` read its phase from `Notification.permission` alone. The tap:
permission granted, then `GET /api/push/key` answered 401
`sign-in-required` (proxy gated it; the home screen app has its own cookie
store), `enrol` mapped that to `not_configured`, `setNote` ran but the phase
was never settled. The first render after showed a wrong note ("not switched
on for this version") under granted copy; every load after that read
permission "granted" and drew "Notifications are allowed on this device" with
the button "Switch this device back on" and NO note. That is the light with no
words. Session A's `dab5a688` (16:13) opened the key route, split out a
`sign_in_required` reason and made ON need `registeredDevices > 0` (an account
count).

**What was still wrong after `dab5a688`, proven live on production at
16:39 to 16:40** (`docs/design/proofs/session-b/push/before/`, QA member, cookies
cleared after the page loaded to stand in for the separate cookie store):
the key now answers 200, the browser subscribes, and `/api/push/register`
answers 401. `enrol` mapped that to `not_saved`, so the screen said "That did
not work. This device was not registered. Try again in a moment.": the wrong
advice, trying again goes round the same loop. And ON from an account count
lets a laptop's row light an iPhone that has none.

**The fix.**
- `enrol.ts`: reasons are `not_configured` (no key on the deployment, or
  register 503) and a new `signed_out` (a 401 or 403 from the key route OR from
  register). `sign_in_required` is gone. On register ok, and only then, the
  device records `{deviceRef, endpoint}` locally; every register failure clears
  that record.
- `device-state.ts`: `deviceIsLive` is the only way to ON: permission granted,
  the local `device_ref` from register is among the live refs the page just read
  from `push_tokens` (`revoked_at is null`), and the browser still holds the
  endpoint that was registered. `controlState` decides what the control draws:
  "checking" (reads off) until that check has run; a register ok on this visit
  reads on only until `router.refresh()` hands a new list, then the list
  decides. `failureMessage` gives every reason one plain sentence; signed_out
  in the iPhone home screen app reads "You're not signed in inside this app.
  Sign in here, then turn notifications on. The app on your home screen signs
  in separately from Safari." with an "Open sign in" link to
  `/sign-in?next=/settings/notifications`; elsewhere "You're not signed in on
  this device any more, so it was not registered. Sign in, then turn
  notifications on." `not_configured` keeps "Nothing for you to do."
- `PushPrompt`: an already-granted permission now reports `allowed`, never
  `enrolled` (it used to report `enrolled` with no register call at all);
  `enrolled` carries the server's `deviceRef`; failures use `failureMessage`.
- `PushSetting`: takes `registeredRefs` (the page passes
  `rows.map(r => r.ref)`); `registeredDevices` is accepted and ignored. A
  success note is shown only while the control reads on.

**Tests** (`npx vitest run src/components/app/push`, 54 pass):
`enrol.test.ts` (11) drives `enrol` with the browser stubbed and then asks the
settings rule whether the device reads on: permission granted + key 401 ->
`signed_out`, register never called, not on; key ok + register 401 ->
`signed_out` (not `not_saved`), not on although the browser holds a
subscription; register 500, 200 without a ref, network failure -> `not_saved`,
not on; a failure after an earlier record clears it; no key -> `not_configured`;
offline key fetch -> `failed`; refused permission -> no request; register ok ->
on only when the page lists the ref. `device-state.test.ts` (32): every
`deviceIsLive` and `controlState` branch, including the empty-list-both-times
refresh that a content key got wrong in the first build (caught by the proof
run, fixed, re-shot), every reason has a sentence with no dash or exclamation
mark, signed_out and not_configured differ, the iOS copy.

**Proof runs** (Chromium 390x844 @2x, dark; `replies.json` beside each set
holds every `/api/push/*` status with time):

| Scenario | Before: production, 16:39 to 16:40 | After: local `next build` + `next start` of this change, real Supabase, throwaway local VAPID pair, 16:45 to 16:46 |
|---|---|---|
| 1 loaded, permission granted, no row | "allowed ... not registered yet", off | "allowed ... not registered", off |
| 2 tap, no session (desktop UA) | key 200, register 401, "That did not work ... Try again in a moment." | key 200, register 401, "You're not signed in on this device any more ..." + Open sign in |
| 2b tap, no session, iPhone UA + `navigator.standalone` | key 200, register 401, same wrong advice | key 200, register 401, "You're not signed in inside this app. Sign in here ..." |
| 3 tap signed in (local only) | not run on production | key 200, register 500 (no service role key locally, so no write), "We could not register this device ...", off |
| 4 FIXTURE: register reply replaced with ok + made-up ref (local only) | not run | ON with "This device is registered"; after the refresh the real list does not hold the ref, so off and the note goes (4b) |

Stand-ins, said plainly: headless Chromium has no push service here, so
`PushManager.subscribe` returns a made-up endpoint (`https://push.invalid/...`)
from an init script; the signed-out register refuses it before any write. The
iPhone case is a desktop Chromium with an iPhone user agent and
`navigator.standalone` forced true, which shows the copy, not Safari's cookie
behaviour. Shot 4's `state` in `replies.json` was read a moment after the
image, when the refresh had already landed; the image and text are the ON
moment. Scenario 3 and 4 were never run against production.

**Links.**
- `/api/push/key` open to signed-out requests: LIVE PROVEN (23 Sept 16:20
  curl and 16:39 run, production, evidence `push/before/replies.json`).
- `/api/push/register` refuses a signed-out request before any write: LIVE
  PROVEN (production 16:39 to 16:40, 401 twice; `push_tokens` still 0 rows
  afterwards).
- signed_out copy on screen after a refused register: LIVE PROVEN on a local
  production build against the real project (16:45 to 16:46,
  `push/after/2*.jpg`); on production only after this deploys.
- A real device registering a row in `push_tokens` and the control reading
  ON from it: NOT PROVEN. It needs a person on a real phone on production
  after this deploys (signed in inside the home screen app, then Turn on).
  Nothing on this box can make a real push subscription, and no row was
  written.

## 13. Platform sweep: profile (the account page, its states and sheets, and the add-a-workspace chooser; worker "profile")

Routes: `/profile` (signed in: Belongings and Posts, with and without a handle; signed out;
loading) and `/profile/setup` (the chooser). Harness: `apps/web/src/app/(dev)/preview/session-b/profile/`
(committed, R-G), inside the signed-in app shell, `?v=` full, values, nohandle, noposts,
signedout, loading, setup. Governing image `50E032EA` still governs where it measures.

### 13.P.1 Inventory (every visible item, before any change, 23 September)

| # | Item | Drawn by, before | Shared primitive it belongs on |
|---|---|---|---|
| 1 | Cover band, grade and fade | `profile.css` `.nf-pf-cover*` | none (a photograph, not a container) |
| 2 | Settings gear on the header row | `nf-icon-btn` (shared) placed by `.nf-pf-gear` | already shared |
| 3 | Avatar, lit ring, picture mark | `profile.css` `.nf-pf-avatar*` | none (a shape, not a container) |
| 4 | Tier badge beside the name and on the avatar | Session A's `TierBadge` through `BadgeSlot` | already shared |
| 5 | Followers and Following, hairline | `profile.css` `.nf-pf-count*` | none (text) |
| 6 | Claim your handle (no handle) | `.nf-pf-litbtn`, a local lit button | `ButtonLink variant="primary"` |
| 7 | Belongings / Posts segment, track and live half | `.nf-pf-tabs`, `.nf-pf-tab[aria-selected]` (gradient-cta, rim-primary, bloom-lit-soft) | selected tokens `--nf-selected-*` |
| 8 | Four belongings rows (container) | `.nf-pf-row` + `::before` fill, per-side rims, halo | `Panel` / panel tokens |
| 9 | Row icon plates (glass objects) | `.nf-pf-plate` + pack crops | `IconPlate` / plate tokens |
| 10 | Row value, title, subtitle, chevron | `.nf-pf-row__*` | none (text) |
| 11 | Switch role row and its quiet plate | `.nf-pf-row--switch`, `.nf-pf-plate--switch` | `Panel` / plate tokens |
| 12 | Switch role sheet (the dock's) | `ProfileSwitcher` (chrome group) | chrome group's |
| 13 | Below the fold: More of your account, Your activity | `SettingsGroup`, `RowLink`, `RowButton`, `RowValue` (`components/app/account/rows`) | settings group's |
| 14 | Your details sheet, its fields and Save | `Sheet`, `.nf-field`, `.nf-btn--primary` | shared already (Button class) |
| 15 | Details sheet error | a local bordered error line in `AccountBody.tsx` | none (inline text state) |
| 16 | Posts tab, cards and empty state | `ProfilePosts`, `EmptyState` (social group) | social group's |
| 17 | Verify prompt (applied, unverified) | `VerifyPrompt` (roles) | not claimed by this group |
| 18 | Signed out: the note panel | `.nf-pf-note`, a local glass card | `Panel` |
| 19 | Signed out: Sign in | `.nf-pf-litbtn` | `ButtonLink variant="primary"` |
| 20 | Signed out: On this device rows and sheet | `SettingsGroup`, `Sheet` | settings group's |
| 21 | Loading: skeleton rows | `.nf-pf-skel-row`, a local bordered row | `Panel variant="card"` |
| 22 | Chooser (`/profile/setup`): step bars, doors, door marks, calm panel, Continue | `.nf-steprow`, `.nf-door`, `.nf-door__mark`, `.nf-calmpanel` (all in `controls.css`, the shared layer's file), `Button variant="primary"` | `Panel`, `IconPlate`, `Button` |
| 23 | Chooser back control | `nf-icon-btn--glass` (shared) | already shared |

### 13.P.2 Applied (23 September, on Phase 1 RELEASED 9da8f86f)

| # | Item | After | Local version deleted |
|---|---|---|---|
| 6, 19 | Claim your handle; signed-out Sign in | `ButtonLink variant="primary" size="lg" full` (the Get started lit bar, pooled bloom) | yes: `.nf-pf-litbtn` and its hover, focus and media rules |
| 18 | Signed-out note | `Panel` (the console panel material) | yes: the note's border, fill and shadow; only its top margin stays |
| 21 | Loading skeleton rows | `Panel as="div" variant="card"` | yes: the skeleton row's own border; only row layout stays |
| 7 | Live tab fill | `--nf-selected-fill` (the shared selected state) | the `--nf-gradient-cta` reference; rim and bloom stay the render's (see below) |
| 2, 4, 14, 23 | Gear, tier badge, details sheet Save, chooser back | already shared (`nf-icon-btn`, `TierBadge`, `.nf-btn--primary`, `nf-icon-btn--glass`) | nothing local existed |

**Kept, because the governing image measures differently (render governs, per the lead).** Each
was tried on the shared tokens in the running production build (a stylesheet injected over the
page, then the same points sampled as ledger 1.4's table):
- **Rows (8, 11) on the panel tokens:** 6 of 12 sampled points leave the render by more than 10:
  top rim 0 122 254 against 2 112 219; 1px under it 22 75 142 against 0 52 148; 9px 11 56 117
  against 0 33 105; foot rim 5 135 253 against 2 73 161; 4px below 4 21 56 against 0 11 42;
  radius 10 against the render's 14. The render-matched rows stay (all 12 within 10).
- **Plates (9, 11) on the plate tokens:** top rim 40 167 250 against 0 49 164, body 13 74 180
  against 0 38 132; and the render draws its own glass objects in them, which `IconPlate`
  (a line-glyph plate) does not carry. The render-matched plates stay.
- **Tab track (7) on the panel tokens:** middle 0 35 86 against 0 21 67, rim 0 124 254 against
  1 46 134. Kept. **Live tab rim:** the shared selected rim samples 171 223 253 against the
  render's 3 146 251, so the render's blue rim stays; the fill is the shared token.

**Not swept, and why.**
- **Chooser (22):** its doors, door marks and calm panel are `.nf-door`, `.nf-door__mark` and
  `.nf-calmpanel` in `controls.css`, the shared layer's own file (Phase 1's claim), still drawn on
  the older edge tokens. The marks carry the roles render's glass objects, so `IconPlate` does not
  fit them either. Request **SW-P1** (scope file): repoint those three onto `--nf-panel-*`,
  `--nf-plate-*` and `--nf-selected-*` in `controls.css`; the chooser markup needs no change.
- **Below the fold (13, 20), details sheet fields (14), Posts tab (16), Verify prompt (17), the
  Switch role sheet (12):** drawn by components other groups claim (settings, social, roles,
  chrome); they inherit their groups' sweeps.

### 13.P.3 Audit passes

- **Pass 1, 23 September.** Every state in the harness on the production build (`?v=` full,
  values, nohandle, noposts, signedout, loading, setup; Posts tab; Your details sheet; the Switch
  role sheet), 390 and 1440, beside the console panel and Get started's lit bar. Found: the rows,
  plates and track, tried on the shared tokens, left the render (numbers above); kept. The Claim
  and Sign in buttons now draw the shared lit bar with its pooled bloom; the note is the console
  panel; the skeleton rows are panel cards.
- **Pass 2, 23 September.** Re-read the same states against `50E032EA`. Found: the skeleton rows
  (panel cards) read brighter at the edge than the real rows they stand for, because the real
  rows are render-matched and the panel carries the +1 glow step. Accepted: the wait is the
  shared material by the sweep's rule and the render draws no loading state. The live tab's rim
  would turn white on the shared selected shadow; kept the render's rim, took the shared fill.
- **Pass 3, 23 September.** The 1440 shots: the column, the rows and the lit segment hold at
  desktop width; the tier badge (Session A's `TierBadge`, gold is its one allowed colour) sits
  beside the name and on the ring. Nothing further found.

### 13.P.4 Per route

| Route | Result | Container | Edge | Rim | Glow | Button | Plate |
|---|---|---|---|---|---|---|---|
| `/profile` (signed in) | swept where the render allows | rows kept (render), skeleton and note on `Panel` | kept (render) | kept (render) | kept (render) | shared lit primary | kept (render objects) |
| `/profile` (signed out) | swept | `Panel` | shared | shared | shared | shared lit primary | none |
| `/profile` (loading) | swept | `Panel` card | shared | shared | shared | none | none |
| `/profile/setup` | not swept (SW-P1) | `.nf-door` (shared file, older tokens) | same | same | same | shared lit primary | `.nf-door__mark` |

Routes swept, fully or where the render allows: 3 of 4 states; the chooser waits on SW-P1.

### 13.P.5 Proofs

Before: the final-pass proofs already on main (`docs/design/proofs/session-b/profile/`,
0b74eef9, before the shared layer and before `TierBadge`); no separate 1440 before exists.
After: `docs/design/proofs/session-b/profile/sweep/after-<state>-390.jpg` and `-1440.jpg` for
full, values, nohandle, noposts, signedout, loading and setup, plus `after-posts-390.jpg`,
`after-details-sheet-390.jpg`, `after-switch-sheet-390.jpg` and `contact.jpg`.

### 13.P.6 Email lock (founder rule, 23 September)

`components/app/account/ProfileIdentityCard.tsx`: the email input and its writer are removed;
the email is drawn as fixed text with the line "Your email address cannot be changed.", and the
card's `save` is only ever called with a name (test `profile-identity-card.test.ts`, 3 passing).
The account page's own Email row says the same line. **The button is removed, but the server
door is Session A's, and this is NOT handled until their refusal has a test** (an
account-takeover surface): scope request EMAIL-LOCK. The button went in fefc0b4f.

### 13.P.7 Live proofs (network open, 23 September)

Script `apps/web/tests/session-b-profile-live.spec.mjs`, run against the production build of
abd0653d (next build and next start, real project, `NODE_USE_ENV_PROXY=1`). Signed in as the
QA member only (957b3bd2), credentials from the scratchpad env, never in the repo. Nothing was
saved: the details sheet was opened and closed, the email never touched. The badge figure is
checked against a second, independent read of `person_badge` over the REST door as the same
member. Run: 18 of 18 passed. abd0653d was rebased onto main as fefc0b4f (the email lock's commit): the profile route's files are unchanged by
the rebase; the settings group's shared rows (`rows.tsx`, `SettingsGlyph.tsx`) moved under it,
so the below-the-fold rows proven here are the pre-rebase drawing, same links. Live proofs
pushed in 9868f652. Screenshots in `docs/design/proofs/session-b/profile/live/`.

| Link | Status |
|---|---|
| signed out `/profile` redirects to sign in with the way back | LIVE PROVEN (2026-09-23 16:41 UTC, abd0653d, `signed-out-profile-redirect.jpg`) |
| signed out `/profile/setup` redirects | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| signed out `/profile/setup/owner` redirects | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| signed out `/profile?switch=owner` redirects | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| sign in as the member lands on `/profile` (next rides) | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| identity read: name and handle from the member's profile | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-profile.jpg`) |
| badge tier from `person_badge`: none for a member, no badge drawn; REST read agrees | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| Followers and Following counts (0 and 0) | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-profile.jpg`) |
| four belongings rows link to `/bookings`, `/saved`, `/wallet`, `/inspections`; no figure drawn at zero | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-profile.jpg`) |
| Switch role line offers workspaces and never says admin to a member | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-profile.jpg`) |
| Switch role opens the workspace sheet | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-switch-sheet.jpg`) |
| Posts tab renders its panel | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-posts.jpg`) |
| settings gear links to `/settings` and opens it signed in | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-settings.jpg`) |
| below the fold links: edit profile, public page, `/settings/place`, `/reviews`, `/messages`, `/notifications`, `/help` | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| email drawn as a fixed fact: no email field on the page, the member's address, "Your email address cannot be changed." | LIVE PROVEN (16:41 UTC, abd0653d, script output) |
| Your details sheet carries no email field | LIVE PROVEN (16:41 UTC, abd0653d, `signed-in-details-sheet.jpg`) |
| Log Out on `/settings`, then `/profile` is gated again | LIVE PROVEN (16:41 UTC, abd0653d, script output) |

Links proven live: 17 of 17 (4 signed out, 13 signed in). The server refusal of an email
change is not among them: it is Session A's (EMAIL-LOCK).

## 13. Platform sweep: feed and bloom (the feed, stories, posts, the plus bloom; worker "feed")

Governing image: the founder's `docs/design/references/founder/feed-plus-bloom-target.jpg`
(the same pixels as `GOVERNING-feed-plus-bloom.png`, catalogue line 64). His rulings:
plain LINE icons in the feed and the bloom, never glass objects; the Post, Story and
Review plates as rounded rectangles on `--nf-radius-control`, everything else about them
exactly as drawn; the bottom navigation NOT copied (ours stays five). His second message
(relayed 23 September): "no one single difference from this image". So on this surface
the image's measured size wins over the lead's floors R-A (11px type) and R-B (44px
controls) wherever they disagree; every tap target stays 44px by a pseudo-element that
paints nothing, so the drawn pixels and the reachable target are both honoured. This
supersedes the R-A/R-B values an earlier commit of this section used; the lead should
know the floors are not applied here, on the founder's words.

### 13.F.1 Scale

The screen in the 1024 x 1536 image runs x 178 to 843 (inner edge to inner edge,
brightness profile at y 300, 700 and 1000), 665 image px for a 390 CSS px viewport:
**1 image px = 0.5865 CSS px**, and a screenshot at device scale 1.7051 is one image pixel
per screenshot pixel, which is what the overlay (13.F.6) uses.

### 13.F.2 Routes and every visible item (the inventory, written before the change)

Route `/around` (`app/(app)/around/page.tsx`, signed in; proofs from the committed harness
`/preview/session-b/feed`, fixture props, ruling R-G). Where each item was drawn BEFORE
this sweep, and what it is on now:

| # | Item | Before (own drawing) | After |
|---|---|---|---|
| 1 | Back control beside the bar | `BackButton` (site) | unchanged; it points at the landing `/` (founder C3.2, FEED-4 closed as ruled) |
| 2 | Location bar, and its place menu | `.nf-feed-chip` own glass, 44 tall, 14 corner; menu on `.nf-post__menu` (surface-raised, radius-lg) | drawn 359 x 33.4, 8 corner, hit 44 by ::after; menu on the shared panel (`--nf-panel-*`, container corner) |
| 3 | Story rings, Your story plus, names | own ring, 56px, names 12px | measured ring 50, pitch 62.7, plus badge 19 lit, names 9.1px |
| 4 | For You / Following track and lit half | own track, 3px inset, brand flat fill | drawn 359 x 35.2, lit half flush; track on `--nf-panel-edges`/`--nf-panel-glow`, lit half on `--nf-selected-*` |
| 5 | Post card container | `.nf-card` plus local `--nf-glow-edge` and 22px corner | shared `Panel` card (`panelClass({variant:"card"})`), 10px container corner, local overrides deleted |
| 6 | Card head: avatar ring, name, verified mark, handle, time, overflow | avatar 40, name 14px, tick = `verified-badge` for `isAgent` | avatar 38, name 11.3/600, **Session A's `TierBadge` from `public.person_badge`** (12), handle 8.6px and time 8.5px pale blue, overflow 16 |
| 7 | Body | 14px, author line breaks collapsed | 9.2px on 14.1, the author's line breaks kept |
| 8 | Photograph (1 to 4) | 16:9, radius 18 | single 2.8:1 as drawn, radius 7 |
| 9 | Action row: like, repost, reply counts, share right | 34 tall, 13px counts, vertical repost glyph | 28 painted / 44 hit, 8.5px counts in fixed columns, the drawn LEVEL repost loop (`LineGlyph`), glyphs 20/16 |
| 10 | Overflow action sheet (`nf-actions`) | surface-primary, radius 22 | shared panel fill, per-side edges, glow, container corner |
| 11 | Toast | surface-raised | shared panel card |
| 12 | Inline composer, loading skeleton, review empty card, story composer cards | `.nf-card` | shared panel card classes |
| 13 | Composer sheet, review picker sheet, place and stay rows | surface-primary sheet, bordered rows | shared panel sheet; rows on the panel card with the selected edge on focus |
| 14 | Comments sheet (`nf-comments`) | surface-primary | shared panel, container corner |
| 15 | The plus | 60px glass disc, 16px in | 58px lit sphere where drawn (1px in), halo ring, glyph 32 |
| 16 | The three plates | 104 x 40 dark glass, chat/picture glyphs, slots thrown too far | 91 x 37 on the control radius, measured centres and tilts, star/camera/pencil line glyphs at 28, lit glass with the shared selected edges, trails |
| 17 | Empty states (For You, Following) | `EmptyState` | unchanged component; sits on the page (proofs) |
| 18 | Story viewer, story rail, story plates | own on-media glass, 22 corner | corner now the container radius; the on-media glass stays (it sits over a photograph, the one place a panel would hide the picture) |

### 13.F.3 The chain (control to screen)

- **Like**: heart -> `toggleMark` (`lib/social/posts-actions.ts`) -> session and zod in the
  action -> `post_reactions_insert_self` / `_delete_self` -> `public.post_reactions` ->
  `post_reactions_count` (`bump_post_counters`) and `post_reactions_notify_after_insert`
  (`notify_reaction`) -> `posts.like_count` -> the card's count. Verified live 23 Sept
  (pg_policies, pg_trigger).
- **Repost**: loop -> `toggleRepost` -> `post_reposts_insert_self` -> `public.post_reposts`
  -> `bump_post_counters`, `notify_repost` -> `posts.repost_count`.
- **Reply**: bubble -> `/post/[id]?reply=1` -> `replyToPost` -> `posts_insert_self` ->
  `posts` -> `bump_post_tree_counters`, `notify_post_insert` -> `reply_count`.
- **Share**: the sheet's share (native share or copy link); writes nothing.
- **Overflow**: the action sheet -> save, repost, share, copy, mute (`mutes_insert_own`),
  report (`reports_insert_own`), block.
- **Verified mark**: `public.person_badge` (view; anon and authenticated both hold SELECT,
  and EXECUTE on `badge_tier`, `is_checked_person`, `is_platform_staff`, checked live) ->
  `readPersonBadges` (Session A, `lib/trust/badge-tier.ts`) -> `stampAuthorTiers`
  (`lib/social/author-badges.ts`, new) on page one (`/around`, `/around/[slug]`) and on
  every next page (`around/feed-actions.ts`) -> `PostAuthor.tier` -> `TierBadge`. Never
  derived; unknown or failed read = no mark (test `author-badges.test.ts`).
- **Counts** are the row's own columns (`like_count`, `repost_count`, `reply_count`),
  kept by triggers. Nothing on the screen is invented; the fixture harness's counts are
  fixture props and labelled so.
- **Deleted posts** stay excluded: `posts-queries` filters `REMOVED` at the read and
  `PostCard` returns null for one (section 12); live: 74 LIVE, 1 REMOVED.
- **Bloom**: plus -> Post: the existing `Composer` in the sheet with the place picker
  (`posts_insert_self` refuses a non-ACTIVE place, so only ACTIVE ones are offered); Story:
  `/stories/new` (`StoryComposer`, `stories_insert_self`, `scan_story`,
  `notify_story_insert`); Review: the picker of stays `getMyBookings` marks reviewable
  (mirrors `reviews_insert_own`) -> `/bookings/[id]/review`; none: the honest empty sheet
  with the way to the bookings list. Signed out, every action is the sign-in door.
- **Broken links named**: FEED-3 (other `PostCard` surfaces show no mark until they stamp),
  FEED-4 (closed as ruled: the back control goes to the landing). None routed around.

### 13.F.4 Refused from the render (claims)

The render's counts (243, 37, 56, 89, 12, 24), its names and faces, "2h ago", "Lekki,
Lagos" and the key and house emoji are the image's content, not ours: the built feed
draws the database's rows. The verified tick is drawn only where `person_badge` says so.
The render's bottom navigation (Home, Search, Saved, Profile) is not copied, on the
founder's ruling.

### 13.F.5 Comparison (image measured vs built measured)

Image px from the render; built px measured in the production build by
`scripts/design/session-b-shots/feed-overlay.mjs` at one image px per screenshot px
(the table it writes is `docs/design/proofs/session-b/feed/overlay-<pass>-numbers.md`).
CSS px = image px x 0.5865.

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Screen gutter | 28 img (16.4 CSS) | 16 CSS (`.nf-feed-page` on a phone) | yes |
| Location bar | 612 x 57 img, corner 14 img (8.2), fill #011748 | 33.4 CSS tall, corner 8, fill lit 16% into canvas; hit 44 by ::after | height, corner, fill yes; width shared with the back control (C3.2) |
| Pin / chevron | 14 / 11.7 CSS glyphs | 20 / 24 boxes = 14.2 / 12 glyph | yes |
| Location words | "Lekki, Lagos" 110 img | 11.5px, 64.5 CSS | yes |
| Story ring | 86 img (50 CSS), rim #1d93f1, first ring at 207 | 50, info-blue rim, first ring at 207.0 | yes |
| Ring pitch | 112, 107, 107, 107, 101 img (uneven in the render) | 107.4 even | ring 1 exact, ring 2 -4.6 img, the rest within 3 |
| Your story plus | 32 img (19 CSS) at the ring's lower right | 19, lit, same place | yes |
| Ring names | "Your story" 77 img | 9.1px, 75.2 img | yes |
| For You / Following track | 612 x 60 img, corner 8 CSS | 610.4 x 60, corner 8 | yes (1.6 img: the 358 vs 359 screen) |
| Lit half | 297 x 60 img, #0468fe / #0144f3, rim #058efb | 298 x 60 on `--nf-selected-*` | yes |
| Segment labels | cap 13 img, 10.5px | 10.5px / 500 | yes |
| Card | 612 x 403 img, corner 15 img (8.8), fill #00133d, edges #0f459e / #123779 / #144395 / #0c2b6d | 610.4 x 405.8, 10px container corner, shared card tuned darker with brighter per-side edges | yes (corner 1.2 CSS rounder: the platform's container corner) |
| Avatar | 65 img at 222,521 | 64.8 at 222.0,521.7 | yes |
| Name | "Tunde Adebayo" 132 img, 600 | 11.3px / 600, 134.7 img | yes |
| Verified mark | a tick after the name, 16 img | `TierBadge` 12 CSS from `person_badge` (gold or platinum art, Session A's) | anatomy yes; the tier's own colour, never a blue render tick |
| Handle | 130 img | 8.6px, 129.3 img | yes |
| Time | 47 img at 715,531 | 8.5px, 47.2 img at 714.3,531.1 | yes |
| Overflow | dots centre 790,541 | centre 790.5,541 +-4 | within 4 img |
| Body | 486 img first line, 24 img line pitch | 9.2px on 14.1, 476 img first line, the author's breaks kept | yes |
| Photograph | 573 x 204 img at 226,650, corner 12 img | 570.6 x 205.9 at 225.9,649.9, corner 7 CSS | yes |
| Action row | heart 240.5, repost 355, reply 450, share 782.5 (centres, img) | 240.5, 355.3, 448, 781 | yes |
| Counts | "243" 27 img, pale blue | 8.5px, 28.2 img, pale blue | yes |
| Repost glyph | a LEVEL loop | `LineGlyph` repost (level) | yes |
| Plus | 98 img (57.7 CSS), centre 30 CSS in, #1557fa core to #17a4fe, #3abffb rim, halo ring | 58 (98.9 img), 1px in, indigo core to info-blue rim, halo ring | yes |
| Plates, centres from the plus | Review -0.7,-50; Story -30.4,-84; Post -63.5,-114.8 CSS | the same (overlay: within 0.1 img) | yes |
| Plate tilt | -13, -17, -20 | -13, -17, -20 (computed transform) | yes |
| Plate size | 155 x 63 img (91 x 37) | 155.2 x 63.1 img | yes |
| Plate shape | capsules | control radius 14 on 37 (0.378) | the founder's one translation |
| Plate material | indigo top, #001f78 middle, lit foot, cyan rim, glow | indigo derived (FEED-5), deep middle, shared selected edges 1.5px, glow | yes by sample (13.F.6) |
| Plate glyphs | pencil, camera, star, line | `LineGlyph` pencil, camera; `UiIcon` star; 28 boxes (19 CSS) | yes |
| Plate labels | "Post" cap 12.8 img, 10.3px | 10.3px / 500 | yes |
| Trails and haze | glowing curves into the plus, blue haze #012dd4 | three trails, indigo glow; the fan's haze | anatomy yes; the render's ribbon is brighter (13.F.8) |
| Stack order | Review over Story over Post | the same (z-index by nearness) | yes |
| Scrim | none | transparent tap target | yes |
| Motion | thrown, caught | the existing spring (overshoot about 8%, settle under 450ms), 55ms stagger, fold inward | as before, tests green |
| Bottom navigation | Home, Search, Saved, Profile | not copied (ours stays five) | the founder's ruling |

### 13.F.6 The overlay and the five passes

Every pass: production build, the committed harness, `feed-overlay.mjs --tag passN`
(blend at 50 per cent, difference image, the numbers), then `feed.mjs` for the state
shots. Mean absolute difference is over the whole region, so the fixture photographs and
the monogram avatars (the render's faces and photos are not ours to use) keep it high;
the per-element numbers are the measure.

**Pass 1, 23 September.** Found against the image: the fan thrown too far and 10px left
(the earlier R-B/shift reading), the plates 44 tall, type at the 11px floor, the card at
the shared default (brighter fill, dimmer edges), the scrim dimming the feed, the plus and
plates azure where the image is indigo, the repost glyph standing on end, the count columns
evenly spaced where the image sets fixed columns, the first ring 3.4 CSS in, the lit half
at 50 per cent where the image draws 48.5, authors' line breaks collapsed. Fixed all of
them (13.F.5). Proofs: `overlay-pass1-*`, `side-by-side-feed.jpg`,
`side-by-side-bloom.jpg`, the state shots. Left for pass 2: card 2 runs 7 img tall, the
overflow dots 4 img off, ring 2 at -4.6 img.

**Pass 2, 23 September.** Re-opened every inventory item in the pass-1 build.
Found: the location bar shrank to its words when it shared its row with the back control
(a live defect on `/around`, not only in the harness: `LocationChip`'s root did not grow),
fixed (`min-w-0 flex-1`), the bar now 562.7 img wide beside the control; the action
sheet's glyph squares still drew their own box, moved onto the shared icon plate
(`--nf-plate-*`, middle step, glyph glow); the feed's inline notice, the held-post notice
and the listing plate inside a card drew their own boxes, moved onto the shared card and a
quiet inner panel on `--nf-panel-hair`; the card's foot sat 2.8 img low, now 403 exactly.
The overflow dots measured 4 img off by box corner but land within 0.5 img by centre (a
measuring slip, nothing moved). Card 2 stays 4.5 img tall because the image draws card
2's head 4 img higher inside its card than card 1's, and one rule cannot draw both.
SW-S1 applied (the social group's list): `.nf-social-card` deleted, and the orphaned
material of `.nf-social-more`, `.nf-social-more__menu`'s offsets, `.nf-social-trust`'s box
and `.nf-social-chip`'s glow deleted after grepping every consumer; `.nf-social-round`
KEPT because the story viewer still draws with it; `.nf-social-sheet__panel` kept (the
bloom's sheets, now on the shared panel). One stale `nf-social-card` class remains in
`app/(app)/stories/new/loading.tsx`, which this worker does not own; it has no rule now
and draws nothing of its own. Proofs: `overlay-pass2-*`, the state shots re-taken.

**Pass 3, 23 September.** Production build of the pass-2 commit plus this pass. Found:
the bar sat 7.6 img high because the back control makes its row 44 tall; the rings' top
margin now absorbs it (bar at 217.5 against the drawn 218). At 1440 the phone-drawn type
(9.2px body in a 48rem column) read as captions: from 768 every type role and both text
controls step up by the same half again (name 15, body 14 on 21, handle and time 12.5,
counts 13, bar and segment 44 tall), keeping the phone's proportions; measured live at
1440 (name 15px, body 14px, bar 44, segment 44). Coverage widened to the story viewer,
its menu, its comments sheet, the story composer and a thread (the committed f4 harnesses,
read only): the menu and the comments sheet are on the shared panel; the story card keeps
its on-media glass over the photograph; nothing there drew a container of its own after
pass 2. Bloom and cards unchanged and still exact (plates within 0.1 img, plus within 1).
Proofs: `overlay-pass3-*`, `story-*-390-dark.jpg`, `post-thread-390-dark.jpg`,
`feed-1440-dark.jpg`, `bloom-open-1440-dark.jpg`.

**Pass 4, 23 September.** Sampled outward from the plus's rim along two rays, render
against build. Found: the render's rim peaks near white cyan (#abf9fc) where ours read
#2fa8f5, and outside the rim the render lays a dense indigo field (#0855e2 to #012aa5,
about 18 CSS px deep, the thin halo ring inside it) where ours let the card underneath
show through. Fixed: the rim is `--nf-lit-cyan` lifted toward white, the fill's last
tenth runs into the cyan, and the glow is a 5px indigo band, the 6px halo hair, a 16px
field and a 40px falloff (rim now #66bef9, 4 img out #5080ed against #0777f0; what
remains is the fixture photograph under the glow, a warm dusk where the render's is a
dark night skyline). Checked and left: the rings' outer glow (the samples were landing on
the ring's own edge; visually the rims match), and the card and lit-half glows, which are
the shared layer's glow +1 step (the coordinator's instruction: use the shared glow and
only go further where the image shows more; the image shows less there, recorded).
Proofs: `overlay-pass4-*`, `side-by-side-*.jpg` and every state shot re-taken.

**Pass 5, 23 September.** The whole inventory re-opened on the pass-4 build, every state
shot laid side by side (feed, bloom open, bloom under reduced motion, a tap caught at
90ms, composer, review picker, review empty, the post menu, Following, both empty states,
the story viewer, its menu and comments, the story composer, a thread, 1440). Found: the
action sheet's danger rows (Report, Block) wore the shared plate's cyan glyph glow over a
rose glyph, which softens a warning; the glow is off for those two
(`pass5-danger-rows-before-after.jpg`). Nothing else drew its own container, rim, glow or
plate; bloom geometry still exact (overlay-pass5). Final proofs re-taken after this last
change.

### 13.F.6a Live proof, signed in (23 September, 17:47 to 17:48 UTC)

Production build of main at `8428129a` (`next build` under the shared lock, `next start` with
`NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS`), signed in as the QA member through the
real sign-in form (credentials from env only), talking to project `uccixoonmbhrnyczyigt`.
Script: `apps/web/tests/session-b-feed-live.spec.mjs`, expected values taken from a
read-only SQL check made minutes before the run. Result **17 of 17 passed**. READ AND
OPEN ONLY: after the run the member has 0 posts, 0 stories, 0 reactions, 0 reposts
(SQL), and live posts are still 74 (the database holds 74 LIVE and 1 REMOVED; the brief
said 75, the rows say 74). Evidence: `docs/design/proofs/session-b/feed/live/`.

| Link | Status |
|---|---|
| Real sign-in lands on `/around` (`next` carried) | LIVE PROVEN (17:47:33, 8428129a, run log) |
| Feed read (For You; the member is in no place, so everything readable, newest first): 20 real cards, the newest live root `07de48f8` first | LIVE PROVEN (`live-around-390.jpg`) |
| The removed post `09f263a9` drawn on no page | LIVE PROVEN (pages one and two) |
| Counts are the row columns: `f8c57ef4` 1 / 1 / 0 and `07de48f8` 1 / 0 / 0 (like, repost, reply) | LIVE PROVEN (screen text against SQL) |
| TierBadge from `person_badge`: `dc2a175c`'s author (a platform `super_admin`) drawn `platinum`; platform posts carry no person mark | LIVE PROVEN (`live-tier-card.jpg`) |
| Next page through `loadMoreAround` with the same badge stamp: 20 -> 40 | LIVE PROVEN |
| The bloom opens Review, Story, Post in that order | LIVE PROVEN (`live-bloom-open-390.jpg`) |
| Post opens the real composer (place picker, Say something / Ask a question); Escape closes it, nothing posted | LIVE PROVEN (`live-bloom-post-composer-390.jpg`) |
| Review opens the picker over the member's real stays: none reviewable, the honest empty sheet | LIVE PROVEN (`live-bloom-review-390.jpg`) |
| Story opens `/stories/new`, the real composer (the member is in no place, so it says so and offers one) | LIVE PROVEN (`live-story-composer-390.jpg`) |
| Back control on `/around` goes to the landing `/` (founder ruling C3.2, b2a1ef5f) | LIVE PROVEN |
| Writes (like, repost, reply, post, story) | NOT EXERCISED by instruction (open and close only); their policies and triggers are verified by SQL in 13.F.3 |

The first run read 0 cards on page one: the script sampled the streamed loading skeleton,
which also wears `.nf-post`. The script now waits for a real card's open link; the feed
itself was right both times (page two held 40 real cards in that first run).

### 13.F.7 Checks

Every push ran the gate after `git pull --rebase` (BRIEF: whole-project tsc, whole
vitest, the token check), each heavy job through the shared lock:
- `check-css-tokens.mjs`: exit 0 (nothing added; the stylesheet reads layer-2 tokens and
  the shared anatomy, the deeper indigo derived from `--nf-brand-primary`, FEED-5).
- `tsc --noEmit -p .` (whole project): exit 0.
- `vitest run` (whole suite): 238 files, 3850 passed, 1 skipped at the last push
  (`physics.test.ts` 9 tests: the measured centres and tilts, the arc, screen fit,
  the trails, the spring; `author-badges.test.ts` 4). Two unrelated tests timed out
  once each under the box's load (`service-worker.browser.test.ts`,
  `proxy-session.test.ts`); both pass alone and the gate was re-run clean before pushing.
- eslint on every changed file: clean.
- Controls, measured in the build (`feed.mjs` prints them): location bar 33.4 tall,
  radius 8 (0.24); segment halves 35.2, radius 8 (0.23); action controls 28 painted,
  radius 6 (0.21), 44 hit; plates 37, radius 14 (0.378, the founder's own ruling:
  the control radius on the drawn plate; R-D's 0.35 line is exceeded by his choice, not
  by drift); sheet rows 64, radius 18 (0.28); the plus, the rings and the avatars round
  (shapes, not text controls).
- Behaviour: Escape closes the fan and returns focus to the plus; focus order Review,
  Story, Post; reduced motion shows the plates at rest (a real defect fixed: the
  reduced-motion paint ran before the plates mounted and left them folded on the plus);
  every action lands on its real composer (Post sheet, `/stories/new`, the review picker
  or its honest empty sheet).

### 13.F.8 Not matched, and why

- The location bar's width: the back control sits in its row. The founder ruled
  `/around`'s parent is the landing `/` (C3.2, b2a1ef5f), so the control stays and points
  there (FEED-4 closed as ruled; proved live, 13.F.6a).
- The canvas between the cards is #010d3c in the image and #000612 here: the platform
  canvas is chrome, not the feed's (FEED-2).
- "For You" is the image's capitalisation; the dictionary says "For you" and this worker
  may add keys, not change values. A copy decision for the lead.
- Faces and photographs in the proofs are fixture props (monograms, the platform's own
  photography); the live feed draws each person's avatar and each post's own pictures.
- The verified mark is the tier's own artwork (gold or platinum), which is Session A's; the
  render's blue tick is not a tier this platform has.
- The render's type is a narrower face than Inter; each role is sized to its drawn WIDTH
  (so lines break where the image breaks) and so sits a little shorter in cap height.

## Skipped or not verified
- (13.H, sweep-home) No live row on any proof: this box's egress refuses the Supabase host, so every card, panel and figure in the home group's proofs is fixture-backed or an empty state; the wiring is unchanged by the sweep (material only). `/price/area/[id]` and `/rent/move-in/[listingId]` were swept in their stylesheets and not photographed. The lister's TierBadge on the card waits on R-SH4. `StayCard` still wears `nf-glass--card` itself (stays group, R-SH2). The unmounted `AiAssistantBanner` stays until R-SH1.

- Sweep, settings group (23 September): the payment methods block on `/settings` and
  `/settings/payments` is not swept here (wallet family); no before shots of the drawer and the
  three sheets (added in audit Pass 2); `.nf-sheet` photographed only through the wallet harness;
  `ProfileIdentityCard.tsx` not swept (profile worker in flight); the notification centre's filter
  tabs in GOVERNING-12 are Session A's feature and do not exist; every settings and notifications
  proof is fixture-backed (the routes sit behind the sign-in gate).
- **Platform sweep, chrome group (13, "sweep-chrome"):** the host wizard's
  later non-drawn steps not shot (SW-C4); five gated routes covered by class
  only; hover states read, not shot; the boxed row lists' 22px corner
  (SW-C5), the Flip card (SW-C1) and the status badges (SW-C6) not moved,
  being other files.

(appended honestly as work proceeds)

- Deleted posts (section 12): no live signed-in run (no test user); proven by
  read-only SQL, code and 26 unit tests. Notifications pointing at a deleted
  post open not found; profile `post_count` drifts on one account and is not
  drawn.

- admin-review (section 7): no signed-in run of the listings, moderation or
  verification desks (no admin test user); every proof is fixture-backed
  through `(dev)/preview/session-b/admin-review`. No decision was exercised on
  production. Held events cannot be decided (AR-10) and the blocked terms list
  cannot be read (AR-11). Queue and support take the shell's register only.

- Welcome email (section 10): not rendered in any real mail client (Outlook,
  Gmail, Apple Mail); the Resend key in production not verified; links not
  clicked through signed in.
- admin-money: no signed-in run of `/admin/money`, `/admin/escrow`,
  `/admin/supply` (no admin test user); proofs are fixture-backed through a
  harness. The escrow ruling was not exercised (zero escrows). The
  reconciliation job's HTTP reply (`private.reconciliation_watch`) is not on
  the desks (scope request 10). Bookings and payments were not restyled beyond
  the shell's register. Escrow row photographs not drawn.
- Get started: the signed-in path (slides, Continue, the interests question) is
  proved by unit tests and the fixture harness, not a live session; sign in and
  sign up do not yet route a first-time visitor to first run (scope W1, W2);
  the native first launch still opens the landing (W3); gate.spec is stale on
  main (W4); ha, yo and ig strings for the new keys need a native speaker.
- **Profile.** Badge blocked on B-BADGE (tier read, slot empty). Every proof is fixture-backed (the committed harness
  `(dev)/preview/session-b/profile`, in the signed-in shell). The live wiring is proven by code, the RLS and trigger read, and unit
  tests, not by a real session (the Switch role sheet was opened in the signed-in harness). `saved_places` and the two storage buckets' policies not re-read. New English copy not yet
  in `packages/i18n` was scope request 1b, now done (ha, ig, yo are drafts for a native speaker).
  The settings gear is overlaid on the header row by geometry until request 1d. Details in 1.6.
- Inspection (section 9): proofs are fixture-backed (throwaway harness, not committed);
  the live write path and `InspectionsLive` were not exercised against production (no
  test user, every listing an example). `/inspections` and `/agent/inspections` could not
  be shape-swept directly (redirect to sign-in). The eight-row room checklist, report notes
  and report photos are not built (scope request I1). Crops soft at 3x.

- Welcome back (signin): no live sign-in, Google round trip, rate-limit trip
  or error message was exercised against production (no user may be created);
  the password step's "google" and "none" branches were not seen live; the
  three new `auth.account*` keys are English only; the first-run redirect is
  streamed, not a 307 header.

- Wallet and send (wallet worker): the live refresh and the transfer were not
  run against production (no test user may be created); both are proved by
  code and read-only SQL. Proofs are fixture-backed. The send plates are soft
  at 3x (64 source px for 34px). The 24px page gutter is `AppShell`'s. The
  three reassurance lines are English in ha, ig and yo until translated. Who
  holds the wallet's money and how long a refund takes are founder questions,
  not stated.

- (admin-shell) No live `/admin` proof with an admin session; reads proven by
  SQL introspection, typecheck and unit tests, not executed as an admin.
  Analytics "All areas" filter not built. Notification volumes blocked by RLS
  (A6); database jobs summarised, not listed (A5); searches, views and refusal
  reasons not recorded (A7, A8, A11). New console copy is English only.
- Platform identity and roles pack (section 11): no product surface uses the
  pack or the proposed tokens yet (ID1, ID2 with Session A); the `-day` paper
  renditions are derived recolours checked only on contact sheets and a
  harness; `eslint` on `scripts/design/session-b-crops.mjs` timed out on the
  loaded box and was not completed (`node --check` passes).
- admin-money copy (8.14): ha, yo and ig serve the new English keys until a native speaker writes them; no word was invented. Left in English: each desk's metadata title and loading label, the shared `EscrowRuling` (admin-shell's), the refund reason labels (`lib/trust`), the escrow countdown formats and the payment channel fallbacks (`lib/admin/reads`). The payments health, overdrawn, stuck and sweep sections are proven by typecheck, not by a harness shot.
- Push enrolment blind light: a real device registering a `push_tokens` row
  and the control reading ON from it is not proven; it needs a person on a real
  phone on production after deploy. The iPhone home screen condition was
  simulated (cleared cookies, iPhone user agent, forced `navigator.standalone`),
  not run in Safari. Push subscribe was stood in by an init script.


- Feed and bloom (section 13, feed): the design proofs are fixture-backed through
  `/preview/session-b/feed`; the wiring is proved live signed in as the QA member (13.F.6a,
  17 of 17). Not live: a gold author on screen (no gold person has a live post; platinum
  is proved), and every write, which the live run deliberately does not make.

