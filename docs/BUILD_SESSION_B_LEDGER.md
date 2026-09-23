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
  lands on the render's 49px plate. On paper the SAME five objects are drawn in their paper
  rendition (round two): `public/brand/session-b/profile/<name>-day.webp`, cut from the same
  render boxes by the PROFILE block of `scripts/design/session-b-crops.mjs` with the glow
  identity's method (keyed, everything outside the tile's measured rounded square dropped,
  re-inked on the brand ramp `#9CC2FF` to `#06379A` by how lit it was). The icon is identical in
  both themes; there is never a dark square on white. Source 96 image px for 57 CSS px is 1.7 px
  per CSS px, so at 2x and 3x the paper files are soft (`SOURCES.md` there says so).
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
| Handle, bio, cover, counts, tick | `loadAccountSocialIdentity` | none | `social_profiles_select` (not blocked) | `social_profiles` (`handle, bio, cover_path, follower_count, following_count, is_agent`) | `follows_count` -> `bump_follow_counts` increments and decrements both counts on every follow and unfollow; `follows_notify_after_insert` -> `notify_follow` tells the followee; `agents_sync_social_flag` sets `is_agent = (status = 'APPROVED')` | name tick and avatar tick only when `is_agent`; counts compact from 10,000 (12.4K) |
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
   request 1 asks for a trigger prop.
2. New English copy lives in `COPY` (`belongings.ts`), not in `packages/i18n`. Scope request 1b.
3. `tests/profile.spec.mjs` asserts `.nf-social-cover`; the profile now draws `.nf-pf-cover`.
   Scope request 1c.
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
and will follow the identity when Session A adopts it into the tokens. The paper plate follows
the identity's pale tile.

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
11px higher than round three because the text column is shorter: identical values. Paper resets all of it: the fill layer is white,
the plate draws no ground, rim or filter, and the paper objects sit on it as before.

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

### 1.5 Light mode

Screens: `profile-390-light.jpg`, `profile-390-light-full.jpg`,
`profile-390-light-nohandle.jpg`, `profile-390-light-signedout.jpg`, `profile-1280-light.jpg`.
Same anatomy on paper, with explicit `:root[data-theme="light"]` rules in `profile.css`:
- The cover is still the photograph, with a lighter blue grade, fading into the paper canvas.
- The gear is the header's own control on paper (white glass, brand hairline, ink glyph).
- The ring stays lit (brand accent to primary) round a white seam; the tick badge sits on white.
- Tabs: a white track on a brand hairline; the live half keeps the lit gradient.
- Rows: white, `--nf-border-brand` edge, `--nf-elev-2` shadow in place of the bloom.
- Plates: the SAME five objects in their paper rendition (pale blue glass tiles with the line
  work in deep brand blue, the glow identity's method), with the identity's short brand shadow
  under them. The night files are hidden on paper by CSS; there is no dark square on white
  anywhere on the page.
- Second lines are `--nf-content-secondary`, the chevron `--nf-content-muted`.
Checked by eye in all five screens. No white-on-white and no vanishing mark found.

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
`profile-side-by-side-390-dark.jpg`, `profile-390-dark.jpg`, `profile-390-light.jpg`,
`profile-390-dark-full.jpg`, `profile-390-light-full.jpg`, `profile-1280-dark.jpg`,
`profile-1280-light.jpg`, `profile-390-dark-values.jpg` (row values), `-nohandle` dark and
light, `-posts` and `-posts-empty`, `-signedout` dark and light, `profile-390-dark-switch-sheet.jpg`
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

## 2. Get started

Route `/welcome`, governing image `2A49E2F7` (root; the founder re-sent the same
art as `images/1.jpg`). Files: `app/welcome/**`, `components/app/welcome/**`,
`app/(auth)/start/route.ts`, one line of `proxy.ts`, the crops in
`public/brand/session-b/welcome/` cut by `scripts/design/session-b-crops.mjs`.
Proofs: `docs/design/proofs/session-b/welcome/`.

### What it is now

The real first run, not a splash. Four slides on one stage, the render's four
dots: (1) Two worlds. One platform, Property and Stays with the coin between;
(2) what the verified tick means; (3) talk first, pay on Vallo; (4) the choice:
Create account, Sign in, Look around first. Skippable on every slide, seen
once, reachable signed out, swipe, arrow keys and dots, each move announced in
a polite live region, 44px tall taps, safe-area padding, reduced motion.

Decisions recorded:
- **The interests question stays** for a signed-in person who has not
  answered it. It is the only answer the product acts on at the door (it ranks
  home and search) and `InterestChoices` is its tested implementation, so it
  follows the slides as a fifth beat with no dot. A member's last slide reads
  "You are in. Make it yours." with Continue (to the question) or Go to home.
- **Seen once**: a stranger's device holds the first-party cookie
  `vallo_first_run=seen` (400 days, Lax, Secure on https), written on Skip, on
  reaching the last slide, or on taking a door; never while rendering. The
  server reads it before painting, so a returning stranger with `?next=` goes
  straight there and one without lands on the choice. A member keeps
  `profiles.settings.welcomeSeen`; a device that saw the slides before sign up
  counts as seen, so the question follows sign up without the slides again.
  If the browser refuses the cookie, exits carry `welcomed=1` so a page that
  gates on it cannot loop.
- **Intent is kept**: `/welcome?next=/sign-in?next=%2Fwallet` makes Sign in the
  lit door with that address; Skip carries on to `next`.
- **`/start` is a 307** to `/welcome?next=/sign-up` (a route handler, so no
  loading frame streams first). Every landing Get started link already points
  at `/start`, so the landing needed no change. StartCarousel is deleted.
- **Dark in both themes**, by rule 22 (BUILD_06 12.2 names first run with sign
  in and sign up). The stage pins `data-theme="dark"` and uses no shared class
  that carries a `:root[data-theme="light"]` rule (not `.nf-aurora`,
  `.nf-grid-veil` or `.nf-brand-icon-ground`, the three leaks the light survey
  found on the old welcome), so paper cannot reach it.
- **Header**: the render's page has only the lockup; there is no app chrome on
  this screen by design, so no back button, dock or header is drawn.

### (a) The chain

| Link | What | State |
|---|---|---|
| Control | Get Started / Next / dots / arrows / swipe | client state only, nothing to write |
| Control | Skip, stranger | `rememberFirstRunSeen()` writes the cookie, then `router.push(next)` or the choice slide. Proved by `tests/session-b-welcome.spec.mjs` |
| Control | the three doors | real `<Link>`s to `/sign-up`, `/sign-in`, `/search`; the proxy leaves all three open signed out (checked live: 200) |
| Query | `/welcome` page | `cookies()` + `loadInterestsState()` (profiles.interests, profiles.settings under the caller's RLS) into `planFirstRun` (pure, 14 unit tests in `app/welcome/plan.test.ts`) |
| Proxy | `proxy.ts` | `welcome` removed from `PRODUCT_SEGMENTS` (claimed in scope first, 9b50916). Before this, a stranger was bounced to sign in and could never meet first run |
| Server action | Continue / Skip, member | `markWelcomeSeen` and `skipInterests` in `lib/interests/actions.ts` (unchanged). No input, so no validation beyond the session |
| RLS | `profiles` | `profiles_update_own` (auth.uid() = id, USING and WITH CHECK), `profiles_select_own`; read live with SELECT on pg_policies, 22 Sept |
| Table | `profiles.settings` jsonb (`welcomeSeen`, `interestsAsked`), `profiles.interests` property_type[] | |
| Triggers | `profiles_set_updated_at`, `profiles_sync_social_identity` (after update), two that fire only on place and name columns | none of them touch these keys |
| Notification | none | none deserved: nothing another person needs to know |
| Screen | `/home` redirects to `/welcome` while `askIntent`; `/welcome` sends a finished member home | |
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
| Message the agent or host and arrange a viewing first. When you pay, pay on Vallo, never to anybody outside it | messaging and inspections exist; the pay sentence is advice, not a guarantee. No "safe", "protected" or insurance wording anywhere |
| An account lets you save, message and ask for viewings. Browsing needs none | the proxy's product list (saved, messages, inspections) against its open routes (`/search`) |

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
| Coin rim | a smooth band about 20 src px (12 css) showing low on the left, deep blue with white lips | 15 discs 1px apart in the brand blue, the outer two with a lit lip, 16 css thick, tipped back 12 deg so it shows low on the left | close: one smooth band now (no ridges); ours is a flat colour where the render's band carries a highlight streak |
| Coin motion | still in the render | turns once every 7 s, rests at the drawn pose 45% of the cycle; reduced motion holds the pose | by design |
| Dots | 4, pitch 23 css, active 9.5, rest 7 | 4, pitch 28 css (44 tall buttons), active 10, rest 7 | pitch wider on purpose for the tap |
| Dots centre from mark top | 583 css | 581 | yes |
| Button | 323 x 56 css, 34 in from each side, top 620 below mark top | 324 x 56, x 33, top 618 | yes |
| Button fill, down the centre | #047bfb top, #002cdb a third down, #0027d1 two thirds, #026dfa at the foot | #3c9dfb top (the 1px rim sits in the sample), #0058d3, #0072f1, #0084fe: GLOW_IDENTITY's lit primary (d01a5d7) with its radial cyan lift low in the middle | close: the render's core is a more violet blue (green channel 44) than any brand token mix can reach without a layer-1 token (ours 88); the lightness and the bright top and bottom bands match |
| Button edge and rim | lit all round: #e4feff top, #d6faff bottom, #0180fb sides | 1px border: cyan 22% into white on top, 32% into white at the foot, brand 70% into cyan on the sides; inset 1px rim | yes |
| Button bloom, blue channel over the ground below the bar (render ground #000823, built #000830) | centre: +136 / +65 / +25 at 4 / 10 / 20 css px; halfway to the ends: +64 / +24 / +2. A pool under the middle, not a band | centre +129 / +77 / +20; halfway +65 / +22 / +1 (a short even shadow plus a radial pool under the middle) | yes, within 12 at every point. Hue: the render's pool is a deeper violet blue (#0120ab at 4px) than any brand token reaches (ours #0044b1); no layer-1 token may be used |
| Button label | ~16px medium, "Get Started" 81 css wide, arrow | 16px 500, arrow 20px | yes |
| Button radius | ~10 css | 14 (`--nf-radius-control`) | shape law, recorded |
| Skip | centre 705 css below mark top, small, quiet (#345fb7 mean) | 13px, quiet blue at 78%, 44px tap, centre 702 | yes |
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

Resolution, honestly: the stage is 636 source px for 380 css, 1.67 source px
per css px. At 2x it is sharp; at 3x it is visibly softer than the live text
around it. Nothing is upscaled.

### (c) Light mode

Checked on the production server with `nf_theme=light` (document
`data-theme="light"`): the surface renders identically to dark, as rule 22
requires. No light-keyed rule reaches it (no shared class with a daylight
rule is used), the lockup, stage and buttons are unchanged, and the ground
covers the viewport. Proof: `welcome-light-390.jpg`.

### (d) Shape sweep

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3172
--shape-sweep --routes /welcome --theme both`, 390 and 1536, dark and light:
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
| Stage (sky, curtains, horizon, floor) | render | render pixels (`stage.webp`), 388 x 582, anchored at the card foot; a blurred copy of its sky above; the floor continues lit blue below | yes |
| App tile + wordmark | tile 258, wordmark 382 x 70 | render crop 176 x 171: tile 98, wordmark 145 | yes (pixels); 464 source px for 528 device px at 3x (1.14x), under 1x at 2x |
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
bright top line and a bloom under it). Where 55A56F21 measures differently it
wins on this surface, per the lead's instruction: the card's edge is the
render's hot hairline over an electric band rather than the identity's four
per-side colours, its glass is the render's #001554 rather than the
identity's gradient of lit ink, and the Continue button keeps the render's
white top hairline (#F6FEFE) and lit foot (#D7FAFE) rather than the
identity's cyan edge. Card corner 22px against the identity's 12: the render
measures 42 render px, 24 CSS.

### (c) Light mode

Rule 22 keeps the auth family dark in both themes, so light mode's duty is to
render the SAME screen. Measured: every element and pseudo-element under
`main` compared by computed colour, background, border, shadow, display,
opacity and filter, dark against light: **0 differences on `/sign-in`,
`/sign-in/email`, `/sign-up`, `/forgot-password` and the harness's refused
state** (round three). Two light leaks were found and closed on
the way: `light.css` repainted `.nf-field` rgb(0,0,32) and took the primary's
edge to transparent inside the pinned subtree (fixed by leading with
`.nf-auth[data-theme="dark"]`); and `.nf-aurora` / `.nf-grid-veil`, which
`light.css` hid in light mode (survey 9.5, item 1), are no longer used here.
The logo is the render crop on a night stage in both themes, so it cannot
vanish.

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
beside the build), `signin-390-dark.jpg`, `signin-390-light.jpg` (rule 22: the
same dark screen), `signin-email-390-dark.jpg`, `signup-390-dark-inherits.jpg`,
`forgot-390-dark-inherits.jpg`, `signin-1440-dark.jpg`. FIXTURE-BACKED (R-G,
harness committed at `apps/web/src/app/(dev)/preview/session-b/signin/`, open
with `VALLO_PREVIEW_HARNESS=1`): `harness-google-390.jpg`,
`harness-none-390.jpg`, `harness-refused-390.jpg`, the three password-step
answers that need an account to exist.
Audit rounds: one fixed the grey card and flat edge; two (lead) the
proportion, glass, plinth and terms line; three (lead rulings) the card to
the render's 61.6 per cent and every text role to the render's size with its
floor.

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

## 4. Wallet

Governing image: `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` (repo root). Route
`/wallet`. Worker: wallet (worktree `wt-wallet`, port 3174).

**Measuring scale.** The phone screen in the render runs from x=177 to x=844,
667 image px for a 390px viewport, so 1.71 image px make one CSS px. Every
image figure below is converted through that.

**Header row: shared chrome, not built.** The render's back square, app-icon
tile with VALLO, bell with its dot and profile button are the app bar
`AppShell` already draws on every in-app page (hamburger, lockup, bell,
avatar, per DESIGN_DIRECTION 3.2). It is the other session's chrome and was
not touched. The page draws no second header row: the balance card is the
first thing under the app bar, as in the render.

### (a) The chain

Balance and statement (read):

| Link | What it is | State |
| --- | --- | --- |
| Screen | `app/(app)/wallet/page.tsx` renders `WalletDeck` (balance card, tiles, quick actions), `RecentActivity`, then the pots | OK |
| Query | `getWalletForViewer()` -> `readStatement()` (`lib/wallet/repository.ts`): `wallet_balances` for the figure, the newest 100 `wallet_entries`, both through the viewer's own Supabase client | OK |
| RLS | `wallets_select_own` (`auth.uid() = user_id`), `wallet_entries_select_own` (the entry's wallet belongs to `auth.uid()`), admin select policies beside them. RLS is enabled on `wallets`, `wallet_entries`, `notifications` (checked in `pg_class`) | OK |
| View | `public.wallet_balances` = `private.wallet_balance(id)`: the sum of COMPLETED credits minus debits, returning only for the owner or an admin | OK |
| "+12.5% this week" | `weekChange()` (`components/app/wallet/week-change.ts`): the net of the viewer's COMPLETED rows in the last seven days as a percentage of the balance the week began on; absent when there are no rows, and the net amount instead of a percentage when the week began at zero. Computed from real ledger rows, so it is drawn; the render's 12.5 is never drawn | OK |
| Live | NEW `LiveWallet`: subscribes to INSERTs on `public.notifications` for this user. `supabase_realtime` publishes `messages` and `notifications` only (checked in `pg_publication_tables`), NOT `wallet_entries`. Every COMPLETED ledger row fires `wallet_entries_notify_after_change` -> `private.notify_wallet_entry()` -> `private.notify(owner, 'wallet', ...)`, and wallet notifications have no mute preference in `private.notify`, so a `kind = 'wallet'` insert is a reliable "the ledger moved" signal. On it the page calls `router.refresh()` and re-reads on the server | FIXED (was: no live update at all on the wallet home) |
| Live, pending rows | A PENDING row (a withdrawal hold) notifies nobody, so it shows on the next read only | BROKEN, scope request W2 |
| Eye | NEW `balance-mask.ts`: the hide/show choice kept in this device's storage (guarded, defaults to shown), read by the wallet home and the send page alike | FIXED (was: reset on every visit, and not shared with send) |

Controls on the page and where each goes:

| Control | Destination | Real end to end? |
| --- | --- | --- |
| Send tile | `/wallet/send` | Yes, see section 5 |
| Receive tile | `/wallet/receive` (address, handle, shareable request link) | Yes |
| Add money tile | the funding sheet -> `fundWallet` (hosted Paystack) or `fundWalletWithSavedCard` -> webhook / `verifyFunding` -> `recordFunding` | Yes: one COMPLETED `deposit` in the production ledger, 9 August 2026 |
| History tile | `/wallet/transactions` | Yes |
| Quick: Send | `/wallet/send` | Yes |
| Quick: Request | `/wallet/receive` | Yes |
| Quick: Cards | `/settings/payments` (saved cards and bank accounts) | Yes (the page exists and lists what is saved) |
| Quick: Settings | the wallet settings sheet | Yes |
| See all (transactions) | `/wallet/transactions` | Yes |
| A transaction row | `/wallet/transactions/[id]`, the receipt | Yes |

### Refused from the render

| Render element | Why it is not drawn |
| --- | --- |
| Swap tile | Vallo holds one currency and sells no exchange; crypto is dark by ruling (`/crypto` is `notFound()`). BUILD_07 section 49, R2 |
| "Top Up" label | Refused as a render label (CLAIMS_RULE). The funding path it names is real, so the tile ships under the product's own name for it, "Add money" |
| Buy Airtime quick action | Not a product Vallo sells (R2) |
| Pay Bills quick action | Not a product Vallo sells (R2) |
| Quick Actions "See all" | All four actions are on screen; the link would lead nowhere |
| Withdraw (the obvious fourth tile) | Not a render element, recorded here because it was the natural substitute and is deliberately NOT drawn: the only production withdrawal (10 August) FAILED with Paystack's "You cannot initiate third party payouts as a starter business". A bank payout does not work end to end today. Scope request W4 |
| ₦245,680.00, +12.5%, every row, name, time and amount | Example content. The page prints what the ledger returns and nothing else |
| Emerald vs cyan "Completed" | The render's badge samples cyan; the platform's one success colour is emerald and the brief names emerald. Emerald ships (DESIGN_DRIFT_SURVEY 3.4, option a) |

Founder questions (not drawn, asked): (1) Should Withdraw come back once the
Paystack business can make third-party payouts? (2) Should the wallet home
carry a reassurance card like the send page's? The render has none, so none is
drawn.

### (b) The comparison, 390px dark

**The glow identity** (`docs/design/GLOW_IDENTITY.md` section 9) is adopted in
`wallet.css` under `.nf-money`, restated from tokens because the stylesheet may
not carry a raw colour: the lit card (per-side edge, banded fill, tight halo)
on the transactions panel, the quick cards and the send form; the lit button's
cyan edge on the Send tile and the Send Money button; the paper answers in
light. Where 6AF37222 measures differently the image wins, and these are the
differences: the balance card keeps the render's own measured fill (a brighter
middle than the identity's generic card), and every corner is the render's
14px rather than the identity's 12px.

Built values are the browser's own (`getBoundingClientRect` and computed
style on a production server, `next build && next start`), fixture-backed
through a throwaway harness that renders the real `WalletDeck` and
`RecentActivity` with the fixture props from `(dev)/preview/e/fixtures.ts`
(not committed). Colours are sampled pixels off the render and off our
screenshot.

| Property | Image (measured) | Built (measured) | Match? |
| --- | --- | --- | --- |
| Page gutter | 13.5px | 24px | NO: the gutter is `AppShell`'s, shared chrome. Every width below is narrower by that |
| Balance card size | 364 x 185 | 342 x ~206 | Height within 21px (our figure line box and 13px tile labels); width is the gutter |
| Card radius | 24 image px = 14px | 14px (`--nf-radius-md`) | Yes |
| Card fill, top / middle / foot | rgb(0 39 123) / (0 17 63) / (0 21 96) over a page of (0 7 37) | srgb mixes of the brand and canvas, sampled (0 50 126) / (0 29 74) / (0 41 100) | Close; the same blue glass, brighter than the page. Was (3 10 26), darker than the page |
| Rim | 1px, rgb(14 125 204) top, (6 172 246) sides, (37 188 255) foot | 1px per-side edge from the glow identity: pale cyan top, deep blue right, lit bottom, sky left, brand mixed with `--nf-state-info` (used as a colour) | Yes in form; slightly less cyan |
| Glow | soft blue bloom off every edge | `0 0 22px -4px glow-3` + `0 14px 36px -14px glow-4` | Yes |
| "Total Balance" | ~14px regular, soft white, eye in quiet blue | 14px / 500, `--nf-content-secondary`, eye 20px `--nf-brand-secondary` | Yes |
| Figure | cap height 28.2px = a 40px face; kobo at 0.58 | 40.17px / 800, kobo 0.6em, never wraps | Yes. The survey's 33.5px defect is closed |
| Change line | 14px, good colour, arrow | 14px / 500, `--nf-state-success`, 16px arrow | Yes (emerald, see refusals) |
| Glass wallet object | 138 x 150 image px, about 81 x 88 | the pack's `wallet-naira`, which IS the render's object cut from this image (ICON_SYSTEM.md table: 6AF37222, box 614, 226), in a 128px box, drawn mark about 72 | Near: 72 against 81, kept smaller so it clears a 40px figure in our wider face |
| Tiles | 76 x 63, 8px gap, radius 8 | 70 x 62, 8px gap, radius 14 (`--nf-radius-control`, ratio 0.23) | Size yes; radius follows the shape law, not the image |
| Lit tile | gradient rgb(0 125 255) -> (0 49 247) -> (0 139 253), white top edge, bloom | `--nf-gradient-cta`, specular top rim, inner foot glow, two-rung bloom | Yes |
| Resting tiles | blue glass rgb(0 22 80) with a bright rim glowing inward | srgb 32% brand over canvas, rim + inset glow | Yes |
| Tile glyph and label | 22px glyph; ~14px label | 22px glyph; 13px / 500 label | Label one px smaller so "Add money" holds one line |
| Section heads | ~14px (cap 8.8px) semibold | 17px (`--nf-text-h4`) / 600 | NO, deliberately: the platform does not set a heading below h4 (DESIGN_DRIFT_SURVEY part six, 1) |
| Quick cards | 87 x 70, 8px gap | 79.5 x 78.8, 8px gap | Near; the height is the 12px type floor on two lines |
| Quick plates | 31px glass tile | the pack's crops of the render's tiles (`send-plane-tile` is this image's own), drawn at 31px | Yes |
| Quick title / sub | ~12px semibold / ~11px muted, one line each | 12px / 600 and 12px muted, one line each (strings chosen to fit, measured in the browser) | Yes |
| Transactions panel | one glass card, head + five rows, 322px | one glass card, head + rows, radius 14 | Yes |
| Row height | 57px | about 61px | Near |
| Row type | title ~13px; counterparty in blue; date and time muted | 14px / 600; 12px `--nf-content-link`; 12px muted | Yes |
| Row circle | 61 image px = 36px | 36px, 20px stroked glyph | Yes |
| Amount | ~14px semibold, "-" white, "+" in the good colour | 14px / 600, signed, credit `--nf-state-success` | Yes |
| Status badge | 17px tall rounded rectangle, no mark | 19px tall, 6px corner (ratio 0.32), with the platform's shape mark | Near; the mark stays (survey part six, 8) |
| Hairlines between rows | yes | `--nf-divider` between rows (the old `.nf-tx-row + .nf-tx-row` never matched, because each row is inside an `li`) | FIXED |

### (c) Light mode

`data-theme="light"` on the root. The page is paper; the quick cards and the
transactions panel become white glass with a brand-tinted top and a brand
hairline, no bloom. The balance card stays a DEEP BLUE card on paper by
decision: it is the one physical card on the screen, the glass wallet object
needs something to be glass against, and on white the untwinned object would
sit on the pack's navy chip. The chip is switched off inside the card only;
the card's text is white; the lit Send tile becomes a white tile with brand
ink. The quick plates switch from the render's crops (which would sit on navy
chips on paper) to stroked glyphs on brand-tint plates; the row circles are
brand tint with brand ink. No dark plate sits on white anywhere. Proof:
`docs/design/proofs/session-b/wallet/wallet-390-light.png`.

### (d) Shape sweep

```
shape sweep: /preview/sbw/wallet, /preview/sbw/send, /preview/sbw/send-filled at 390px, 1536px in dark and light
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
no text-bearing control is a capsule.
```
`node apps/web/scripts/check-css-tokens.mjs`: clean, all ten checks.

Proofs: `docs/design/proofs/session-b/wallet/wallet-390-dark.jpg`, `wallet-390-light.jpg`, `wallet-1280-dark.jpg` (fixture-backed).

`/wallet` itself redirects a signed-out browser to `/sign-in`, and the sweep
refuses to measure a redirected page, so the sweep ran on the harness route
that renders the same components.

### (e) Skipped or not verified

- The live wiring (a real notification arriving, `router.refresh` re-reading)
  was not exercised against production: there is no test user this session
  may create. It is proved by the SQL introspection above and by code.
- Proof screenshots are fixture-backed (the harness), not a signed-in session.
- The gutter (24 against 13.5) is `AppShell`'s and was not changed.

## 5. Send money

Governing image: `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` (repo root; the
founder uploaded it as the send target, so it governs over `95840448`).
Route `/wallet/send`. Same 1.71 scale.

**Header row: shared chrome, not built** (as section 4).

### (a) The chain

| Link | What it is | State |
| --- | --- | --- |
| Control | `SendFlow` compose: Recipient (email), Amount, Narration, then "Send Money" opens the confirm step; the confirm step's "Send" submits the form | OK |
| Lookup | `lookupRecipient` (`app/(app)/wallet/send/recipient-action.ts`): signed in, paced 40 per 10 minutes, answers found / none / self / unknown; the name is shown before any money moves | OK |
| Server action | `transferToUser` (`lib/wallet/actions.ts`): feature flag, session, validation, `guardMoney` rate limit, recipient resolved again, self refused | OK |
| Validation | zod `transferSchema`: email, `nairaAmountSchema` (integer kobo, 100 naira to 10,000,000 naira), note up to 140 | OK |
| Idempotency | `SendFlow` posts one `idempotencyKey` per mount; `transferSchema` drops it and the pair id is a fresh `randomUUID()` per call, so a second submit is a second transfer | BROKEN, scope request W1 (not Session B's file) |
| RPC | `public.transfer_between_wallets` (EXECUTE: `service_role` only; `anon` and `authenticated` cannot call it, checked with `has_function_privilege`) -> `private.transfer_between_wallets`: locks the sender's wallet `FOR UPDATE`, settled minus pending debits, refuses `insufficient`, inserts BOTH legs in one statement (`transfer_out` debit, `transfer_in` credit, both COMPLETED), a unique violation is `duplicate` | OK |
| RLS | the RPC is `security definer` and is called by the service role, so the writes do not go through RLS; the reads back are under `wallet_entries_select_own` | OK |
| Trigger | `wallet_entries_notify_after_change` fires for both inserted legs | OK |
| Notification | `private.notify_wallet_entry()` -> "Wallet debited" to the sender and "Wallet credited" to the recipient. `labelTransferLegs` then updates the status to the same COMPLETED, which the trigger ignores (no second notice) | OK, but the text names nobody: scope request W3 |
| Read back | `revalidatePath("/wallet")` in the action; `SendFlow` calls `router.refresh()` on success and reads the receipt by reference through `getStatement()` | OK |
| Screen, live | NEW: the send page now carries the balance card and `LiveWallet`, so after a send the card shows the new balance without a reload, and a recipient with the page open sees money land | FIXED |
| PIN | none exists (the settings sheet now says so plainly); the confirm step is the confirmation | As built |
| Receipt | `Receipt` on success, the ledger's own row | OK |

### Refused from the render

| Render element | Why it is not drawn |
| --- | --- |
| "NDIC INSURED" badge | False: `lib/legal/terms.tsx` section 15 says in bold that a wallet balance is not insured by the NDIC and Vallo is not a bank (R1) |
| "256 BIT ENCRYPTION" badge | A security claim a person cannot check or act on (R1) |
| Bank row ("Select bank") | A send is wallet to wallet by email; bank payouts do not complete today (W4) |
| Scan / QR button | There is no scanner and no QR on receive |
| Swap and "Top Up" tiles | As section 4 |
| "Quick. Safe. Reliable." | Adjectives that are claims. Replaced by a plain description: "Wallet to wallet, by email" |
| ₦245,680.00 and every example value | Example content |

Kept, and why each is true: the "Instant transfer" chip (both legs are
written in one database transaction). The reassurance card carries exactly
three statements, each checked on 22 September: "Your wallet is Vallo's naira
record of your money, not a bank deposit" (terms section 15); "If a send
fails, nothing leaves your wallet: both sides move together or not at all"
(the one-statement insert in `private.transfer_between_wallets`); "A completed
send cannot be recalled. Only the person you paid can send it back" (no user
reversal path exists).

Founder questions: (1) WHO HOLDS THE MONEY is not established anywhere this
worker could read (which account or custodian the naira sits with), so the
card says what the wallet is, not where the money is. (2) HOW LONG A REFUND
TAKES is not established for any path (the terms say refunds go to the wallet,
not how fast), so no refund time is stated. Each needs the founder's answer
before it can be printed.

### (b) The comparison, 390px dark

Built values are the browser's own on a production server, fixture-backed
through a throwaway harness rendering the real `SendFlow` (not committed).

| Property | Image (measured) | Built (measured) | Match? |
| --- | --- | --- | --- |
| Balance card | as section 4, "Available Balance" over the figure, a wallet glyph and "Wallet Balance" under it, the same four tiles | the same card: label, 40px figure, card glyph with "Wallet Balance", `WalletTiles` with Send lit and `aria-current` | Yes (the tiles are the refusal-corrected set) |
| Title | "Send Money", about 20px semibold | "Send money" (the dictionary's sentence case), 20px / 600 Poppins | Yes |
| Line under it | 14 to 15px quiet blue | 14px `--nf-content-link` | Yes (words changed, see refusals) |
| Instant chip | about 100 x 30, rounded rectangle, bolt, cyan-blue ink | 142 x 36, 10px corner (ratio 0.28), bolt 16px | Taller so the corner stays a rectangle; wider for the word "transfer" in lower case |
| Form panel | one glass panel, rows as sub-panels with lit edges | one `nf-card` on the identity's lit card, rows as sub-panels, 14px corners | Yes |
| Row plates | round glass plates, 57 image px = 34px | the render's own plates cropped from this image, 34px | Yes (softer at 3x, see (e)) |
| Row type | label ~14px white; placeholder ~14px muted blue | label 14px / 500; input 16px, placeholder muted | Input is 16px on purpose: below 16px iOS zooms the page on focus |
| Recipient row | "Enter bank name, account number or phone number" and a scan square | "Their Vallo email"; no scan square | Words are what the lookup really accepts; scan refused |
| Amount chips | ₦5,000, ₦10,000, ₦20,000, ₦50,000, about 24px tall | the same four amounts, 36px tall, 10px corner, 12px type, chosen one filled with the lit gradient | Values yes; taller for the shape law and the thumb |
| Narration counter | 0/50 | 0/140, the schema's real limit | Limit is the real one |
| Button | 44.5px, gradient rgb(0 137 254) -> (0 89 253) -> (0 165 251), white-hot top edge, bloom, plane on a darker disc at the left, arrow at the right | 50px, `--nf-gradient-cta` sampled (0 97 252) -> (0 72 253) -> (16 133 249), specular rim, cyan per-side edge from the identity, two-rung bloom, plane on a `--nf-brand-primary-strong` disc, arrow right | Yes |
| Reassurance card | shield plate, "Your money is safe", one line, two badges | shield plate cropped from the render, "How a send works", three checked facts, no badges | Anatomy yes; words and badges per the claims rule |
| Status after send | not drawn | the ledger receipt, and the balance card re-reads | Kept |


### (c) Light mode

Same anatomy on paper: the balance card stays deep blue (section 4), the form
panel and its rows are white with brand hairlines, the row plates switch from
the render's crops (a white glyph that would vanish on white) to stroked
glyphs on brand-tint discs, the chips are white with brand edges and the
chosen one fills brand, the button stays the lit gradient. Proof:
`docs/design/proofs/session-b/send/send-390-light.png`.

### (d) Shape sweep

The same run as section 4 (d) covers `/wallet/send`'s components, empty and filled: zero breaches, zero over 0.35.

Proofs: `docs/design/proofs/session-b/send/send-390-dark.jpg` (empty), `send-filled-390-dark.jpg`, `send-390-light.jpg` (fixture-backed).

### (e) Skipped or not verified

- The transfer itself was not run against production (no test user may be
  created); `private.transfer_between_wallets` was read, not called. Zero
  transfers exist in the production ledger, so the path has never run live.
- Proofs are fixture-backed (a throwaway harness rendering the real
  `SendFlow` with a fixture recipient lookup, not committed).
- The recipient, amount, narration and shield plates are cropped from
  77A54EA3 (`public/brand/session-b/send/`, SOURCES.md there): 64 source px
  for a 34px plate, so 68 device px at 2x (sharp) and 102 at 3x (a 1.6x
  upscale, visibly softer on a 3x phone). The plane inside the lit button is
  drawn in CSS: it sits on saturated blue, which the key cannot separate from
  its ground.
- Hausa, Igbo and Yoruba have the new send labels; the three reassurance
  lines fall back to English in those locales until a speaker translates them,
  because a legal statement should not be machine-guessed.

## 6. Admin shell, overview, operations, analytics

Worker admin-shell. Governing images: `5EAA44CB` (overview, one full desktop
window, 1586 image px for a 1440 CSS px window, so 1 image px = 0.908 CSS px),
`01F7DFC7` panels two and three (operations, analytics; each panel window is
about 492 image px wide and drawn at a much smaller scale, so it governed
composition and anatomy while `5EAA44CB` governed every size), and
`8E9602E2` and `C1D98B3C` for the shell every desk shares (rail, bar,
identity at the foot). Built desktop first at 1440, then 390, then light.

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
client navigations) cannot send the operator back. Tests:
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
`pg-cron-watch` row's metadata -> `databaseJobsSummary`. **Broken link:** the
eight pg_cron jobs cannot be listed one by one (cron schema not exposed,
`cron_job_failures` is service role only) -> **Request A5**. Jobs line ->
`getRunDays` (every cron audit row for 14 days, `readAll`). Active alerts ->
`getAlertTrend`: exact open count now and open a week ago from `created_at`
and `resolved_at`, daily raised. Alerts tab and panel -> `getRiskAlerts()`.
Audit tab and panel -> `getAuditLog()` and `getAuditActivity()` (existing;
the activity read's 5,000 row cap is shown on screen when hit).
Notifications tab -> **broken link:** `notifications` has only
`notifications_select_own` -> **Request A6**; the tab says so.

**Analytics.** Successful bookings -> `getBookingOutcomes(range)`, two exact
counts (confirmed or completed, this window and the one before). Demand vs
supply -> `getSupplySeries(range)` for the supply line. Areas with fewest
listings -> `getThinAreas(5)` -> `thinnest` (tested). **Broken links:**
searches (A7), listing views (A8), refusal reasons (A11) are not recorded
anywhere; Total searches, Listing views and Conversion read "Not recorded",
Top areas by searches, Searches vs results and Top common refusals read "Not
wired yet", each naming its request.

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
| Rail | floating panel, 197 wide, 11px corners, edge #004EBE, fill #001031 | 200 wide, 14px (`--nf-radius-md`), edge brand 62%, fill brand 9% to 5% over canvas | yes (radius on the nearest rung) |
| Rail row | 42 tall, 44 pitch, 15px label, line glyph 18 | 42 tall, 44 pitch, 15px/500, glyph 20 | yes |
| Open row | solid #0065FD, brighter top #0298FC, blue bloom, ~7px corners | `--nf-gradient-cta`, inset white top rim, 18px bloom, 14px `--nf-radius-control` | yes, radius per the shape law (0.33 of 42) |
| Wordmark | "Vallo" white bold, 28 | 28px/700 display face, content-primary | yes |
| V mark | cyan line V | the product's own mark (`/brand/vallo-mark.png`) | no: brand asset kept, the render's glyph is not our mark |
| Pulse strip | 88 tall, 14 corners, lit top edge glow | 96 tall, 14px, inset rim + top glow | yes |
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
| KPI card box | 223 x 122.5, corner 7.7 | 343 x 148, corner 14 | width follows the wider window (two cards in a 44rem row); height +25 because the build carries a caption line the render does not; corner deliberately the console's 14 (render 13 on 5EAA44CB) |
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
| Status badge | 71 x 25, corner 5, "Healthy" tinted emerald, "Failed" solid rose | 64 x 24, corner 6 (0.25), 12px/600; Failed solid rose | yes |
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

### 6.3 Light mode

Same anatomy on paper: the canvas `#F4F5F7`, rail and panels on
`--nf-surface-on-paper` with a brand hairline at 26% and the paper shadow
instead of blooms; the open row and open tab keep the lit brand fill (white on
brand); plates become a pale brand tint with brand ink (no dark tile on white);
status plates keep their ink on paper; badges keep word, ink and tint; the
wordmark is type in the page ink, so it never vanishes; chart glow filters are
removed on paper. Proofs: `overview-1440-light-fixture.jpg`,
`overview-390-light-fixture.jpg`, `operations-1440-light.jpg`,
`analytics-1440-light.jpg`.

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

### 6.4a Glow identity and the designed empty state

`docs/design/GLOW_IDENTITY.md` section 9 (revised, d01a5d7) is applied in
`admin.css` for every desk, built from existing tokens because the sheet takes
no raw colour: the lit card fill (bright top 4px and 11px, dark middle, lifting
foot, cyan catchlight), per-side lit edges, the inset rims and near glow, the
icon tile (lit centre, inset edges, glowing glyph; a pale tile on paper, never
a dark plate), the lit primary edges on the open rail row and tab, and the calm
info panel. Where the admin renders measure differently they win for the
console's density: 14px corners (render 13) rather than the identity's 12, a
middle of about 11% lit (render #00173A) rather than 10%.

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
  real seven Vercel jobs and eight database jobs are listed instead.
- The render's alert rows ("Payment webhook failed", "Search index delay")
  and audit rows ("Tunde A. approved listing") are not drawn; the real rows
  are.
- Off-palette dots (grey-green Hotels, rose Restaurants, green Land) and a
  rose "+9%" on Open reviews; capsule badges; the render's cyan V glyph in
  place of the product mark.
- Analytics figures whose source does not exist (searches, views,
  conversion, refusal reasons): drawn as "Not recorded" with requests, never
  estimated. Question for the founder: should search and view logging be
  built (A7, A8)? That is a product decision, not a pixel one.

### 6.6 Proofs

Side by side, render left and built right, re-shot after the final change:
`side-by-side-overview.jpg`, `side-by-side-operations.jpg`,
`side-by-side-analytics.jpg`. Desktop 1440 dark and light, 390 dark and light,
for all three desks, plus the empty (real database) variants.

`docs/design/proofs/session-b/admin/`, all from the running production build
on the uncommitted fixture harness (`app/(dev)/preview/sbadmin/**`, which
renders the real `AdminFrame`, `OverviewView`, `OperationsView` and
`AnalyticsView` on fixture props, because no admin session can be created on
the production database). The `-fixture` shots use figures shaped like the
render to compare composition; the `-empty` shots use the production
database's real state on 22 September (0 live, 0 money, 1 sign-up, alerts all
resolved). In the proofs the open rail row is lit by adding its class in the
browser, because the harness path is not `/admin`; the class is exactly the
one `AdminRail` sets.

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
- The pg_cron schedules in the handbook are read from `cron.job` and assumed
  to be UTC (pg_cron's default).

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
| Location | dark map with pin, place label, "View on map" | real tiles from `lib/maps/tiles.ts` (dark and paper sets), pin, place, credit | "View on map" not drawn (it would leave Vallo) |
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
`sbs-review.jpg`, `sbs-moderation.jpg`, `sbs-kyc.jpg`. Desktop, phone and paper:
`<desk>-1440-dark.jpg`, `<desk>-1440-light.jpg`, `<desk>-390-dark.jpg`,
`<desk>-390-light.jpg` for listings, review, moderation, kyc;
`listings-1536-dark.jpg`; the empty state as it is live today:
`listings-empty-1440-dark.jpg`, `listings-empty-1440-light.jpg`,
`moderation-empty-1440-dark.jpg`, `kyc-empty-1440-dark.jpg`. ALL FIXTURE-BACKED
(R-G): harness `/preview/session-b/admin-review/<desk>` (`?empty=1`), real
components, invented figures that never reach a database.

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

Every rule in `review.css` has a paper twin under `:root[data-theme="light"]`:
panels take the shell's paper `--nf-admin-panel-fill` and edges (the same
variables), tabs, pager, back and quiet buttons white with the brand edge,
the active tab and page keep the brand fill with white type, badges a 12 per
cent tone wash with dark tone ink (the moved daylight state tokens, not a
re-derived hex), plates and avatars pale brand wells with brand ink (no dark
tile on white), map tiles switch to the provider's light set, glows off.
Checked on `*-1440-light.jpg` and `*-390-light.jpg`: no white-on-white, no
vanishing text, the empty calm note readable.

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
  (AR-11). Both filed in the scope file.
- `/admin/queue` and `/admin/support` inherit the shell's register and were not
  rebuilt to an image (none governs them).
- The Live, Rejected and Suspended tabs show the ten newest (Session A's read).
- Most desk copy is English literals (R-107 console decision); the shared words
  come from the dictionary.

### Requests to admin-shell

None outstanding: the review desks use the shared `CalmNote`, `Sparkline`,
the glow identity variables and the frame as they are.

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

Checked at 1440 and 390 on all five desks, both fixture states (`docs/design/proofs/session-b/admin-money/*-light.jpg`).
Cards take the shell's paper surface and edge; no glow; charts follow the
ramp tokens' light twins; the credit colour and badges take the daylight state
tokens from `2596ed9`. One defect found and fixed: the escrow row plate was a
dark glass object on paper; replaced with a line glyph.

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
`full`/`live` x 1440/390 x dark/light; `side-by-side-{money,escrow,supply}.jpg`
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
lifted under the rim, the 14px and 30px bloom; paper twin: brand edge and
ring, pale lift, soft shadow. The current pager page and pressed toggles take
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
`money-derive.test.ts`). No money path is left off the console.

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
The money proofs (`money-{full,live}-{1440,390}-{dark,light}.jpg`,
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

### (b) The comparison, 390 dark (round three, on the lead's rulings R-A to R-G)

Scale: phone screen 668 render px (inner edge 177 to 845), so 1 CSS px at 390 = 0.584
render px; "strict" means render px x 0.584. Rulings applied (ledger section 0):
**R-A** every text role at the render's measured size, raised only to the 11px floor
where it would be unreadable, no uniform factor; **R-B** a pressed control at the
render's height or 44px, whichever is larger, everything around it at the render's
proportions; **R-C** containers at the render's width (342 against 360: the 24px shell
gutter, below); **R-D** no text-bearing control at or above 0.35; **R-F** the outcome
choice kept, drawn as one row of three; **R-G** the harness is committed at
`apps/web/src/app/(dev)/preview/session-b/inspection/page.tsx`. Built numbers are
`getBoundingClientRect` and computed style at 390 x 844 on that harness and on the same
components inside the app shell. Side by side at matched scale:
`docs/design/proofs/session-b/inspection/inspection-render-vs-built-390-dark.jpg`.

**Overall: title top to Submit bottom, render 1132 render px = 661 CSS; built 672, 1.02
times.** Inside the app shell at 390 x 844, Add Photos ends at y 768 and Submit at 820:
both on the first screen (the harness's shell is the signed-out header; a signed-in
dock would cover the foot of Submit, not Add Photos).

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Page gutter | 28 render = 16 CSS | 24 (the app shell's padding on every consumer page) | no, by decision: the shell's 24px is the platform standard, not this surface's to change; containers are 342 against 360 for that reason |
| Back button | glass rounded square in the header row | 44 x 44 glass square on its own row | shape yes; the render's header row is shared chrome |
| Title | cap 28 render = 16.4 strict, 23px, bold | 23px / 700, h 26 | yes |
| Sub line | about 10.5px strict, blue #47d0f6 peak, 2 lines | 11px / 400 (floor), 2 lines, h 30, brand quiet | yes |
| Glass house | object 153 render = 89 CSS, foot over the card edge | the render's own crop, box 100 x 75, foot over the card edge, above it | yes (crop, soft at 3x, SOURCES.md) |
| Listing card | 616 x 142 render = 360 x 83 | 342 x 94 | yes (1.13 in height) |
| Card radius | 16 render on 142 (0.11) | 14 on 94 (0.15) | near: the 14 rung is the smallest container radius in the tokens that is not a control's |
| Card photo | 180 x 129 = 105 x 75, radius 10 render (0.08) | 104 x 84, radius 10 (0.12) | yes |
| Scheduled / Pending badge | 91 x 24 render = 53 x 14, corner 8 render (0.33) | 18 tall, 11px / 600, corner 6 (0.33), emerald / cyan tokens | yes; 18 not 14 because 11px text needs it; hue emerald (render teal is off-family) |
| Card title | about 11.7px strict, semibold | 12px / 600, one line | yes |
| Place and kind lines | about 9px strict | 11px / 400 (floor), 12px glyphs | yes |
| Price | about 11.4px strict, bold brand blue; "/ year" | 12px / 700 via `formatMoney`; "per year" 11px (the product's `PERIOD_SUFFIX`) | yes |
| Info row | 616 x 88 = 360 x 51, three cells side by side, glyph left of text | 342 x 57, three cells side by side, glyph left of text, no wrap | yes (1.12) |
| Info label / value / second line | about 7 / 9 / 7px strict | 11 / 11 / 11px (floor), value 600 | yes |
| Phone | the number, 7px strict, under the name | a phone glyph (16px) on the name's line, 44px target, tel: link, the grouped number in its accessible name | by ruling: the number cannot fit at the floor without wrapping |
| Checklist panel | 616 x 506 (8 rows) = 360 x 296 | 342 x 181 (4 rows, request I1) | per row, below |
| Checklist head | title about 11px strict, count about 8px, bar 72 x 3.5 under the count | 11px / 600, 11px, bar 4px under the count | yes |
| Checklist row | 54 render = 31.5 CSS, corner 12 (0.22), 1 to 2 render apart | 32, corner 10 (0.31), 2 apart | height yes; corner a rung larger |
| Row plate | 42 of 54 (0.78) | the render's own crop, 24 of 32 (0.75) | yes |
| Check circle | 20 of 54 (0.37) | 14 of 32 (0.44), done: emerald fill and a drawn tick | yes |
| Row title / sub | about 7.8 / 6.5px strict | 11 / 11px (floor), 600 / 400 | yes |
| Notes panel | 616 x 88 = 360 x 51; well corner 8 render | 342 x 53; well 22 tall, corner 10; label 11px / 600, text 11px | yes (1.04) |
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

Same anatomy on paper: containers become `--nf-surface-on-paper` with
`--nf-shadow-on-paper` and the brand hairline; rows and options `--nf-surface-raised`;
no bloom. The glass house swaps to its daylight cut (floor lifted from 12 to 70 so the
night bloom does not smudge the white) and stands on the paper with no chip. The row
plates do NOT use their daylight cut: at 48 render px the glass disc keys to a pale
bubble on white and its cyan glyph all but vanishes (the "Outcome recorded" plate was
unreadable in the first light proof), so on paper each plate is drawn as a pale brand
disc with the brand edge and the stroked glyph (house, shield, bed, document), same
anatomy, crisp. No daylight plate is cut. For the house: `home-check` has no light twin in the pack, so `BrandIcon` would have put it on
a navy chip, which is exactly the rejected "black icon plate". Lit CTA keeps the token
gradient's light twin. Badges take the daylight state colours from the tokens
(2596ed9), not re-derived hexes. Proof: `docs/design/proofs/session-b/inspection/inspection-390-light.jpg`.

### Desktop

Derived from the phone: the same column held at 42rem by the page, the title at 32px, the
house at 136px, the info cells side by side (glyph left of text, as the render draws it),
the four checklist rows in two columns, the outcome options in three. Proof:
`inspection-1280-dark.jpg`.

### (d) Shape sweep

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3178 --shape-sweep --routes /preview/session-b/inspection --theme both`
on the committed harness (R-G), final build of round three, at 390 and 1536, dark and
light: BREACHES (at or above 0.5) 0; WORTH AN EYE (0.35 to 0.5) 0; round icon-only
controls 0. The first run of round three found the 16px badges at 0.38; they are 18px
now (0.33). `/inspections` and `/agent/inspections` redirect to sign-in without a
session, so the sweep runs on the harness, which renders the same components.
`check-css-tokens.mjs`: clean.

### (e) Proofs, and what I could not verify

- Every screenshot is FIXTURE-BACKED, from the committed harness
  `apps/web/src/app/(dev)/preview/session-b/inspection/page.tsx` (R-G; run with
  `VALLO_PREVIEW_HARNESS=1`), except `inspection-390-dark-first-screen-in-shell.jpg`, taken
  from a throwaway copy of the same page inside the app shell (not committed) to show the
  first screen with the shell's header. Earlier rounds used a throwaway harness route (not committed)
  rendering `InspectionHero` and `InspectionSheet` with the F5 fixture inspection
  (CONFIRMED, requester side) and listing facts. No signed-in production render exists.
- Not verified live: a real party moving a real inspection, the notification arriving,
  and `InspectionsLive` refreshing the other screen. No test user may be created and all
  64 listings are examples, so no inspection can be created.
- Crops are soft at 3x (house 0.56, plates 0.42 of the pixels needed); numbers in
  `public/brand/session-b/inspection/SOURCES.md`.

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
   not only the rent. Photographs earn a viewing; a walkthrough video
   answers the questions before anybody asks them.
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

## Skipped or not verified

(appended honestly as work proceeds)

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
- **Profile.** Every proof is fixture-backed (the committed harness
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
