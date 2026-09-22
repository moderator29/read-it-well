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
- **Type scale.** Measured render type is small for its phone (row subtitle 9.5px, row title
  10.7px at 390). Every text role ships at measured x 1.16, snapped to a step, which puts the
  subtitle on 11px (the dock label's size) and is the largest factor that still sets the
  render's longest subtitle ("Manage your balance, cards and transactions") on one line inside
  the row the render draws. Geometry (radii, plates, rows, gaps, avatar) ships at 1x.
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
| Name | cap 21 image px: 17px, semibold, near white (238 241 249) | 20px Poppins 600 (x1.16), 246 246 247 | size by the translation, weight and colour yes |
| Name tick | blue verified disc beside the name (110 190 252) | `verified-badge` 20, brand blue with glow; only when `is_agent` | yes |
| Handle | about 10.3px, mist blue (160 198 239) | 13px, 161 194 243 | size by the translation, colour yes |
| Bio | 10px, one line, mist blue (162 201 242) | 12px, one line at 390, 159 191 238 | yes |
| Count value | 11.5px semibold, near white | 14px 600, 245 246 247 | size by the translation |
| Count label | 10px mist (148 193 236) | 12px, 155 187 235 | yes |
| Counts gap and hairline | 24 each side of a 22 tall hairline (15 134 203) | 24 each side, 1 x 22, 43 125 244 with a soft glow (round two, was 9 78 182) | yes; the built rule is 41 levels bluer, 9 less green |
| Counts to tabs | 24 | 22 | yes |
| Tab control | 598 x 71 image px: 355 x 42, radius about 14, one track, live half fills the full height | 354 x 44 (44 for the thumb), `--nf-radius-control` 14 (ratio 0.32), live half full height | yes |
| Live tab | lit: 1 126 254 top, 0 61 246 middle, 0 101 254 bottom, bright top rim (3 146 251), bloom | `--nf-gradient-cta`: 0 113 252, 27 96 253, 0 99 248; `--nf-rim-primary`; `--nf-bloom-lit-soft` | yes; middle a little lighter |
| Resting tab | glass 0 21 67, label 175 203 238, rim 1 46 134 | 0 16 74, label mist, rim 0 54 142 | yes |
| Tab label | 11.5px, 500 to 600, house and chat glyphs | 14px, 600 live and 500 resting, `home` and `chat-bubble` 24 | yes |
| Tabs to first row | 20 | 20 | yes |
| Row | 598 x 112 image px: 355 x 66, radius 23 image px: 14 (ratio 0.21) | 354 x 67, `--nf-radius-control` 14 (ratio 0.21) | yes |
| Row gap | 13 image px: 8 | 8 | yes |
| Row fill, rim, halo | see the round three sample table below | see below | yes, every point within 10 per channel except the two noted |
| Row rim | top 2 112 219 (a hot 1px line), sides 1 75 175, foot 2 73 161 | top 0 110 220, foot 0 68 162, sides the ink at 76 per cent | yes |
| Row glow | 1px dark seam under the foot, then a faint halo: 4px out 1 12 49 above, 0 11 42 below | seam in the canvas, `0 0 8px -2px` glow-2 and `0 4px 12px -6px` glow-3; 4px out 0 9 46 above, 2 12 50 below | yes |
| Icon plate | 83 image px: 49, the render's objects; lit from inside (see table below) | 49 (radius 10), the pack crops of this render on a plate built in `profile.css`: per-side rims, a vertical body, a radial inner light, a little side light, `saturate(1.4)` on the plate only | yes, within 10 on every channel at seven points |
| Plate to title | 24 image px: 14 | 14 | yes |
| Row title | 10.7px, 500 to 600, near white | 13px 600, 241 242 244 | size by the translation |
| Row subtitle | 9.5px, one line, mist (159 194 231) | 11px, one line for all four at 390, 154 187 234 | yes |
| Chevron | right edge 18 from the row edge, near white | 20px `chevron-right`, 12 padding plus the glyph's own margin | yes |
| Gap before Switch role | 39 image px: 23 | 23 | yes |
| Switch role row | 101 image px: 60, its own falloff and a quieter plate (see table below) | 62, plate 44, the same recipe with its own stops | yes, within 10 |
| Text column, measured built | | name 20/600 at y 192; handle 13/400; bio 12/400; count 14/600; count label 12/400; tab 14/600 live, 500 resting; row title 13/600; row subtitle 11/400; all second lines oklab 0.845 (mist blue) | per rows above |
| Status badges | none on this screen | none | yes |
| Buttons | the lit segment is the only lit control | the lit segment; Claim your handle (no handle only) wears the same gradient, top rim and bloom | yes |
| Colours | one blue family | one blue family; the plate's sunset is photographic and graded towards blue | yes |

**Differences that remain, honestly.** (1) Everything below the top band sits about 22 to 35px
lower than in the render: the app header takes the status bar's band, and the scaled type makes
the text column 10px taller. The render's back square is dropped and its gear joins the header
row (1.1). (2) Type is 1.16 times the render's, on
purpose (1.1). (3) The counts hairline samples 43 125 244 against 15 134 203 (raised in round two). The rows
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
| Plate foot rim | 2 82 211 | 0 72 203 | yes (green 10) |
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

Every row and plate point is within 10 on every channel; the tightest are the plate foot rim
(green 10) and the Switch foot rim (blue 10). Paper resets all of it: the fill layer is white,
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

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3171 --shape-sweep --routes "/zz-pfs,/zz-pfs?v=nohandle,/zz-pf?v=signedout" --theme both`
on the final build (`/zz-pfs` is the throwaway harness inside the SIGNED-IN app shell;
`/profile` itself redirects to sign in without a session and the sweep refuses a redirect):

```
shape sweep: /zz-pfs, /zz-pfs?v=nohandle, /zz-pf?v=signedout at 390px, 1536px in dark and light
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
  created, so the screenshots come from a throwaway harness route (never committed) that renders
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
| Headline line 1 "Two worlds." | cap 46 src = 27.5 css; width 355 src = 212 css; white, heavy | Poppins 700 37px, 212 wide | yes (face is Poppins, the brand display face; the render's reads like SF Display) |
| Headline line 2 "One platform." | 419 src = 250 css; the gradient runs DOWN the letters, the same at every x (sampled in six bands): stroke tops #b6e9fa, middles #52d4fa, feet #0294f9 | 249 wide; built top #9de9ff, middle #66dcff, feet #18a1fe (same method on the 2x shot), from the state cyan and brand blue mixed in sRGB | yes. The lead's note read it as cyan to blue left to right; the samples show it vertical, and the samples decided |
| Baseline spacing | 61 src = 36.5 css | line box 36.5 | yes |
| Line 1 baseline from mark top | 107 css | 107 css | yes |
| Sub-line | 2 lines, 224 css first line, lines 21.5 apart, #88cafa brightest stroke | 14.5px, 223 css first line, 21.5 line, quiet blue at 40% into primary | yes |
| Sub cap top to line 2 baseline | 27 css | 13 css margin + half leading = 27 | yes |
| Stage top (tile tops) from mark top | 262 css | 262 (scene top 253 + 24.5 inside the crop, minus 16) | yes |
| Stage art | the render's | the render's own pixels, 636 x 530 src drawn 380 x 317 | yes, identical art |
| Tile radius, rim, thickness, glass, pillars, plinth, reflection | as drawn | as drawn (cropped) | yes |
| PROPERTY / STAYS | cap 15 src = 9 css, 116 src = 69 css wide, pale ice, glow | 11px, 0.19em, 70 css wide, ice with glow, turned with the tile | yes |
| Coin size and place | in a 3x zoom of the stage: bounding box x 85 to 320, y 60 to 360 (zoom px, 3 per css px), overlapping the plinth's front rim, thick rim showing on the lower left | 114 css box at (49.5%, 62.8%) of the stage, leaning 34 deg, turned 62 deg: bounding box x 80 to 325, y 65 to 360 in the same zoom, left rim showing | yes, within 2 css px on every side (`welcome-coin-render-vs-built-3x.jpg`) |
| Coin face | a clear dark glass face, a white-cyan rim, the bars mark lit | the pack's `flip-coin` face (the drawer render's coin) lifted 25%, a lit white-cyan ring, an 11-layer lit edge | close, not identical: the face art is the drawer render's coin, so its glass is a little lighter and its edge reads as fine ridges at 3x where the render's is one smooth band |
| Coin motion | still in the render | turns once every 7 s, rests at the drawn pose 45% of the cycle; reduced motion holds the pose | by design |
| Dots | 4, pitch 23 css, active 9.5, rest 7 | 4, pitch 28 css (44 tall buttons), active 10, rest 7 | pitch wider on purpose for the tap |
| Dots centre from mark top | 583 css | 581 | yes |
| Button | 323 x 56 css, 34 in from each side, top 620 below mark top | 324 x 56, x 33, top 618 | yes |
| Button fill, down the centre | #047bfb top, #002cdb a third down, #0027d1 two thirds, #026dfa at the foot | #3c9dfb top (the 1px rim sits in the sample), #0058d3, #0072f1, #0084fe: GLOW_IDENTITY's lit primary (d01a5d7) with its radial cyan lift low in the middle | close: the render's core is a more violet blue (green channel 44) than any brand token mix can reach without a layer-1 token (ours 88); the lightness and the bright top and bottom bands match |
| Button edge and rim | lit all round: #e4feff top, #d6faff bottom, #0180fb sides | 1px border: cyan 22% into white on top, 32% into white at the foot, brand 70% into cyan on the sides; inset 1px rim | yes |
| Button bloom | below the bar: #0225b8 at 6px, #001269 at 15px, ground by 30px; little above | #003490 at 6px, #001651 at 15px, ground by 30px; a faint 10px lift above | yes (ours slightly less saturated at 6px) |
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
  preview harness `/preview/f1/welcome` (fixture props), not by a live session.
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

### (b) The comparison, 390 dark (round two, re-shot after the final change)

**Scale.** The render is a 1024 x 1536 poster with no phone frame. Its card is
633 px, 62 per cent of the width; at 390 that is 305 CSS px, so
**s = 305 / 633 = 0.482**, and every "at s" below is a render measurement
times 0.482. (Round one used the full phone column, s = 0.566, which the lead
rejected: the card filled the screen and everything sat high.) Font sizes are
derived from measured cap heights (cap / 0.72 for this sans). Two stated
floors: controls are 44 px (the tap rule; at s they would be 34 to 37), and
running copy is 13 to 15 px, the type factor about 1.15 over s. Built values
are `getBoundingClientRect` and `getComputedStyle` on the production build,
colours are pixel samples of the 2x screenshot. Vertical positions are as a
share of 844 against the render's share of 1536.

| Property | Image (measured) | Built (measured) | Match / why not |
|---|---|---|---|
| Card width | 633 of 1024 = 62% | 305 of 390 = 78% | The render's 62% would be a 241 px card with 34 px controls; 305 is the lead's round-two target and keeps both aurora margins (43 px each) |
| Tile centre height | y 360 = 23.4% | y 203 = 24.0% | yes |
| Wordmark centre height | y 575 = 37.4% | y 306 = 36.3% | yes |
| Card top | y 706 = 46.0% | y 360 = 42.7% | 3.3 points high: the slogan's line is closed by half (lead), and the card is taller (below) |
| Card height | 632 (305 at s) | 354 | 49 taller: three controls at 44 against 34 to 37 at s |
| Plinth | y 1338 to 1420 = 87.1 to 92.4%, whole | y 714 to 753 = 84.6 to 89.2%, whole: 349 px wide, x 21 to 370 | position: follows the taller card; shape: yes (render pixels), both ends in frame |
| Stage (sky, curtains, horizon, floor) | render | the render's own pixels, UI lifted out (`stage.webp`), 493 x 740 at 1024/633 of the card; a blurred cover copy continues the sky above it | yes |
| App tile + wordmark | tile 258, wordmark 382 x 70, gap 38 | render crop, 224 x 218 (tile 124, wordmark 184) | yes (pixels); 2x source at 3x density, slightly soft |
| Slogan | "Real Estate reimagined!" | none | REFUSED (claims rule, founder) |
| Card corner | 42 render = 20 at s | 22 (`--nf-radius-xl`) | yes, +2 |
| Card inset | 60 render = 29 | 28 sides, 28 top, 22 foot | yes |
| Card glass fill | top-left #001A64, top-right under a curtain #0A2C7C, foot #001658 / #001A62 | top-left #00215F, top-right #01246E, middle #001A56, foot #001F71 / #001D70; translucent (58% tint + lit-ink bands + 14px backdrop blur) so the stage shows through | yes, within about 8 levels per channel |
| Card lit rim | across the left edge at y 1000: one hot line #9BE2FE, then an electric band #0551D0 > #0040D8 > #0137BC, 3 px | hot line #C0DCFF (1 px), band #0062EE > #0060ED (3 px inset) | yes; the band is a shade brighter |
| Top-edge highlight | centre #9EE5FE, edge #0027A1 just under | 2 px white-to-rim-hot line over the middle 84%, cyan radial highlight 55% x 16 px (glow identity), measured #0469F8 just under | yes |
| Card glow | tight bloom, sky #000B4C 10 px out | 1 px ring + 8 px + 28 px blooms at glow rungs 3 and 4 | yes |
| Title | "Welcome Back", caps 25 = 17.3 px at s, semibold | "Welcome back", Poppins 600, 20 px | size 1.16x s; sentence case is house style |
| Sub | caps 15 = 9.9 px at s, regular | Inter 400, 14 px | floored for running copy |
| Title to sub | 21 render = 10 | 4 px between boxes (line boxes; caps gap about 9) | yes |
| Sub to field | 43 = 21 | 19 | yes |
| Email field | 881 to 952, 71 tall = 34; corner 12 = 6; fill #00144C; edge #0B4FD0 | 44 tall, corner 14 (`--nf-radius-control`, shape law), fill #00174A, edge electric | height floored; corner is the shape law's control radius |
| Placeholder | caps 15 = 9.9 px | 16 px Inter | 16 keeps iOS from zooming the page on focus |
| Envelope glyph | line icon, 24 render wide = 12 | UiIcon `mail`, 20 | stroked line tier as the image draws |
| Field to button | 42 = 20 | 20 | yes |
| Continue button | 994 to 1071, 77 tall = 37; top hairline #F6FEFE, fill #0380FE > #0038E8 > #004BFD, foot line #D7FAFE, bloom | 44 tall; fill #2282FC > #004DFD > #0061F8, 1.5 px white top inset, rim-hot foot inset, 14 + 32 px bloom | treatment yes; height floored |
| Continue label | caps 18 = 11.9 px, semibold, arrow | 15 px 600, `arrow-right` 20 | 1.26x s |
| Button to OR | 47 = 23 (to its centre) | 23.5 | yes |
| OR | caps 13 = 8.6 px, regular, hairlines both sides | 12 px 500, 1 px hairlines | floored |
| OR to Google | 39 = 19 | 23.5 | 4 px looser |
| Google button | 1157 to 1227, 70 = 34; glass outline #1481DC | 44; glass fill #001A50, edge #0061EC | height floored |
| Google label | caps 17 = 11.3 px, medium | 15 px 500 | 1.3x s |
| Google G | 31 render = 15 | 20, Google's own four colours (a file, not tokens) | the one third-party mark; Google's branding rules |
| Google to foot line | 45 = 22 | 16 + leading = 20 | yes |
| Foot line | "Don't have an account? Sign up", caps 13 = 8.6 px, Sign up blue | "New to Vallo? Sign up", 13 px, Sign up 600 in `--nf-content-link` | wording changed on the lead's request (`auth.newToVallo`, four locales) |
| Foot line to card foot | 49 = 24 | 22 + 2 | yes |
| Icon plates | none in the card | none | n/a |
| Status badges | none drawn | none | n/a |
| Language control | not in the render | 44 px glass rounded rectangle, top right, clear of the tile | kept: a working control |
| Terms line | not in the render | 12 px muted, two lines, below the floor's lit reflection (y 797 to 834), off the art | kept: needed, a Google sign-up passes no tick |
| Colours | one blue family | one blue family plus Google's G | yes |

Desktop (1440 x 900, `signin-1440-dark.jpg`): the same object at a 340 px
card, centred, the stage and plinth scaled with it. Derived from the phone
character; no desktop render governs it.

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
`/sign-in/email` and `/sign-up`**. Two light leaks were found and closed on
the way: `light.css` repainted `.nf-field` rgb(0,0,32) and took the primary's
edge to transparent inside the pinned subtree (fixed by leading with
`.nf-auth[data-theme="dark"]`); and `.nf-aurora` / `.nf-grid-veil`, which
`light.css` hid in light mode (survey 9.5, item 1), are no longer used here.
The logo is the render crop on a night stage in both themes, so it cannot
vanish.

### (d) Shape sweep

`compare-surface.mjs --shape-sweep --routes "/sign-in?welcomed=1,/sign-in/email" --theme both`, and again for `/sign-up?welcomed=1`
(the `welcomed=1` keeps the sweep on sign-in rather than following first run)
at 390 and 1536, dark and light:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
```

`check-css-tokens.mjs`: clean. Unit tests: 49 passing across
`app/(auth)/sign-in`, `components/auth`, `lib/auth`.

### Proofs (`docs/design/proofs/session-b/signin/`)
Re-shot after the final round-two change, from the production build of this
worktree, 390 x 844 at 2x unless named: `signin-vs-55A56F21-390.jpg` (the
render beside the build), `signin-390-dark.jpg`, `signin-390-light.jpg`
(rule 22: the same dark screen), `signin-email-390-dark.jpg` (the password
step with an address carried), `signup-390-dark-inherits.jpg`,
`signin-1440-dark.jpg`. None is fixture-backed: these screens need no session.
Audited against the render three times. Round one fixed the grey card
(#172E52 against #001554) and the flat edge. Round two (lead's review) fixed
the proportion (card 358 to 305, composition lowered to the render's
percentages), the opaque glass (now translucent over the stage), the plinth
(now whole at 390) and the terms line (now below the art).

### Crop resolution
The lockup draws 224 CSS px from 464 source px: 1.45x the source on a 3x phone,
under 1x on 2x. The stage draws 493 CSS px from 1024: 1.44x at 3x. Slightly
soft on 3x screens; no upscaling filter was applied.

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
| KPI card | 147 tall, 298 wide, 11 corners | 148 tall, 284 wide, 14px | yes |
| Card title / figure / change / caption | 15 semibold / 34 bold / 14 bold emerald / 12.5 | 15px/600 / 32.2px/700 (clamp; 34 at 1536) / 14px/700 #10B981 / 13px | yes |
| Sparkline | glowing blue line, bottom right | same, `drop-shadow` glow, bottom right | yes |
| Panel | 13 corners, edge #004EBE, fill #00173A to #002E77 | 14px, brand 62% edge, brand 14% to 8% fill, top catchlight, bloom | yes |
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
| Lede | 12.8px, cyan-blue #3FB8F5 | 14px, `--nf-brand-secondary` #5C9FFF | 1.2px over (not yet brought to 12.8, recorded as a difference); hue translated into the blue family |
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
| Lede | 11.9px | 14px | 2.1px over, the same lede component as Operations; a difference, recorded |
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

### 6.4 Shape sweep

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3175 --shape-sweep --routes /preview/sbadmin/overview,/preview/sbadmin/operations,/preview/sbadmin/analytics --theme both`
(the harness renders the real shell and views; the live `/admin` routes
answer the access screen without a session, which the tool rightly refuses):

```
at 390px, 1536px in dark and light
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, over 0.35 but not a capsule: 5
  the console search input, 352x40, radius 14px, ratio 0.35 (overview, operations, analytics; dark and light)
ROUND ICON-ONLY CONTROLS: 0
no text-bearing control is a capsule.
```

The search field sits exactly at 0.35: a 40px field on `--nf-radius-control`,
drawn 40 tall because the render's field is 36 to 40. Accepted and recorded.
An earlier sweep also flagged the rail's 36px child rows at 0.39; they moved
to `--nf-radius-sm` (0.28) in c237af4.

`apps/web/scripts/check-css-tokens.mjs`: clean (0 layer-1 references, 0 raw
colour literals, 0 capsules on a control). `tsc --noEmit`: clean. eslint on
every changed file: 0 errors (one existing warning in `AdminActions.tsx`,
not introduced here). vitest: `session-b-admin-shell.test.ts` (16) and
`lib/admin/reads/overview.test.ts` (11) pass.

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
- i18n: the new console copy is English in the components, like the rail's
  existing English labels; not added to the four dictionaries.
- Coverage of "every notification" is blocked by RLS (Request A6); the eight
  notification kinds are listed on the tab and in the handbook, not counted.
- The other swept desks have no admin render of their own; they inherit the
  register through the shared stylesheet and carry no measured table.
- The pg_cron schedules in the handbook are read from `cron.job` and assumed
  to be UTC (pg_cron's default).

## 7. Admin review desks: listings queue, listing under review, moderation, verification

(pending)

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

### 8.2 Measured comparison

Scale. Each render panel is a browser window 485 image px wide
(`C1D98B3C` panel 3: x 1033 to 1518; `8E9602E2` panels: 490 px). At the
brief's 1440 CSS px per window that is 2.97 CSS px per image px, and it puts
body text at about 36 CSS px and KPI cards at 252 CSS px tall, which is not a
console at 1440; the renders are zoomed. Type-consistent scale, from ledger
row text (cap height 6 image px against a 13 to 14 px body), is about 1.7. So
PROPORTIONS (grid fractions, aspect of cards, column shares) are taken from
the image, and SIZES follow the shell's measured type scale so every desk
reads alike. Colours sampled with `sample` over 3x3 boxes.

| Property | Image (measured) | Built (measured, 1440 dark) | Match |
|---|---|---|---|
| Page ground | `#000d2a` | shell canvas, same token as every desk | yes (shell's) |
| Card fill | `#00153e` to `#001646` | `--nf-admin-panel-fill` (shell) | yes |
| Card border | `#003c8a` to `#1085bc`, lit | `--nf-admin-panel-edge`, 1px | yes |
| Top rim | brighter hairline on top edge | inset 1px rim at 55% plus a centred catchlight `::before` | yes |
| Glow | soft blue outside each card | `--nf-admin-panel-glow` (0 0 22px, 22%) | yes |
| Card radius | 5 img px on 82 px cards (6%) | 14px on ~330px cards (4%), `--nf-radius-md` | close |
| KPI row | 4 equal cards, gap 7 img px | 4 equal, gap 16px | yes |
| KPI label | 10 img px wide cap, `#1085bc` blue | 13px 500, `--nf-brand-quiet` | yes |
| KPI figure | cap 12 img px, white bold | clamp 22 to 34px 700 display face | yes |
| Delta | green arrow, `+12%`, "vs last week" muted | emerald/rose arrow glyph, whole %, muted "vs ..." | yes |
| Money chart | full width, 2 series, smooth, filled, legend top right | full width, 2 series, monotone curves, filled, legend top right, dashed second series, hover readout | yes |
| Recon + summary | 54 : 46 split | 1.17fr : 1fr | yes |
| Recon ring | emerald ring, % centre, "Last successful run", Healthy badge | same; badge on the shape law | yes |
| Ledger columns | Date 17%, Description 31%, Type 12%, Amount 17%, Balance 23% | Date, Description (reference under it), Type, Amount, Balance | yes |
| Credit colour | `#1aba8d` emerald | `--nf-state-success` | yes |
| Pager | squares, active lit blue, 1 2 3 4 5 ... 12 | rounded squares 44px, active gradient + rim + bloom, same numbering | yes |
| Escrow pipeline | 6 cards with arrows | 6 linked cards with arrow glyphs | yes |
| Escrow table | photo thumb, id, amount, from to, purpose, days, countdown in emerald | line glyph plate (no photo in the read), same columns, emerald countdown | partly (no photo) |
| Float total | figure with short cyan rule | same | yes |
| Recon check | emerald check disc, Healthy, last run | same, centred | yes |
| Donuts | teal, mauve, pink slices | one blue ramp by lightness, word + share + count per slice | translated |
| Supply table | name, role, listings, tick, transacted, joined | same, tick carries the word Yes/No | yes |
| Supply growth | 4 lines, 4 hues | 4 lines on the blue ramp, dash patterns, direct labels | translated |
| Top areas | ranked bars | ranked bars | yes |
| Status badges | pill-ish chips | `StatusPill` rounded rectangle | shape law wins |

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

Checked at 1440 on all three desks (`docs/design/proofs/session-b/admin-money/`).
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

Built, measured in the browser at 1440 dark (`getComputedStyle`): page title
26px 700 white; lede 14px `rgb(92 159 255)`; KPI card 284 x 122, radius 14px,
edge the shell's panel edge; KPI label 13px 500 `rgb(92 159 255)`; KPI figure
28.96px 700; delta 13px 600 `rgb(16 185 129)`; panel title 16px 600; table
head 13px 500 quiet blue; table row 65px (the render's rows are about 42px at
the type-consistent scale; ours carry the payment reference on a second line,
which the render omits and which support needs); pager items 44 x 44, radius
10px (ratio 0.23), the current one on the lit primary gradient with the
primary rim and bloom.

`node scripts/design/compare-surface.mjs --shape-sweep --theme both` over
`/preview/zz-am/{money,escrow,supply}?state=full` and
`/preview/zz-am/{money,supply}?state=live` at 390 and 1536:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 45
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
no text-bearing control is a capsule.
```

All 45 "worth an eye" are the shell's (the "All desks" nav row at 0.39, the
bar's search input and the shared status chips at 0.35); none is on a money
desk's own control. `check-css-tokens.mjs`: clean. `tsc --noEmit`: clean (also
by `next build`). `eslint` on every changed file: clean. `vitest run
src/lib/admin/reads`: 40 passed.

### 8.7 Proofs

All desk screenshots come from an uncommitted harness at
`/preview/zz-am/{money,escrow,supply}` that renders the real desk components
inside admin-shell's real `AdminFrame` with FIXTURE props, because no admin
session exists on this box. Two fixture states: `live` mirrors the rows the
production database held on 22 September (read with SQL: one wallet, two
entries, no escrows, every supply row an example); `full` is invented data
used only to prove the layout against the render. The live wiring is proven by
the reads' code, the SQL introspection above and the 40 unit tests, not by a
signed-in screenshot.

### 8.8 Skipped or not verified

- No signed-in run of the real pages: no admin test user may be created.
- The escrow ruling was not exercised end to end (zero escrows exist).
- `private.reconciliation_watch` not surfaced (request 10).
- Bookings and payments were not restyled beyond the shell's register.
- The render's escrow row photographs.
- An incident during the work: once, before the coordinator's warning, this
  worker ran `git stash` and `git stash pop` in its worktree; the stash is
  shared across worktrees. The popped change set was this worker's own (the
  file list matched), but it is recorded here in case another worker lost
  work around 20:35.

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

### (b) The comparison, 390 dark (density round two, final)

Scale: phone screen 668 render px (inner edge 177 to 845), so 1 CSS px at 390 = 0.584
render px; "strict" below means render px x 0.584. The model, on the lead's review: TEXT
takes the smallest readable size for its role (11px labels and sub lines, 13px row
titles and values); CONTAINERS keep the render's own ratios to the row they hold (plate
0.78 of the row, check circle 0.37, corner 0.22), not one uniform factor; anything
pressed keeps a 44px target. Built numbers are `getBoundingClientRect` and computed
style on the fixture harness at 390 x 844 (scripts in the session scratchpad, not
committed). Side by side at matched scale:
`docs/design/proofs/session-b/inspection/inspection-render-vs-built-390-dark.jpg`.

**Overall height, title top to Submit bottom: render 1132 render px = 661 CSS; built
912, 1.38 times.** Where the difference is: the built screen carries the outcome panel
("How did it go?", 182px plus an 8px gap), which the render does not draw and the data
model needs; without it the built column is 722, 1.09 times. The render's checklist has
eight rows where the built one has four (request I1), so the like-for-like rows are
compared per row below rather than by panel height.

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Page gutter | 28 render = 16 CSS | 24 (the app shell's padding on every consumer page) | no, by decision: the shell's 24px is the platform standard and not this surface's to change |
| Back button | glass rounded square in the header row | 44 x 44 glass square on its own row above the title | shape yes; the render's header row is shared chrome, so the back square is this page's own row |
| Title | cap 28 render = 16.4 strict, so 23 to 24px, bold, second word faintly blue | 24px / 700, h 28, "Inspection" 82% white 18% brand quiet | yes |
| Sub line | 2 lines, 10.5px strict, blue #47d0f6 peak | 13px / 400, 2 lines, h 36, `--nf-brand-secondary` | colour and lines yes; size at the readable minimum |
| Title top to card top | 132 render = 77 CSS | 84 | yes (1.09) |
| Glass house | object 153 render = 89 CSS, foot over the card's top edge | the render's own crop, box 100 x 75, foot 16px over the card edge, above it in z order | yes (crop, soft at 3x, SOURCES.md) |
| Listing card | 616 x 142 render = 360 x 83 strict | 342 x 114 | proportion 1.37 in height, carrying 14/12/15px text |
| Card radius | 16 render on 142 (0.11) | 14 on 114 (0.12) | yes |
| Card photo | 180 x 129 render = 105 x 75, radius 10 render (0.08) | 104 x 96, radius 10 (0.10) | width yes; taller with the card |
| Photo to text | 19 render = 11 CSS | 12 | yes |
| Scheduled badge | 91 x 24 render = 53 x 14, corner 8 (0.33), teal fill, cyan text | 75 x 20, 11px / 600, corner 6 (0.30), emerald token on its tint | shape yes; hue: emerald token (the render's teal is off-family) |
| Card title | cap 14 render = 12px strict, semibold, one line | 14px / 600, one line, h 18 | yes |
| Place and kind lines | about 9px strict, pin and house glyphs in brand blue | 12px / 400, 16px glyphs brand quiet | yes at minimum |
| Price | about 11px strict bold brand blue, "/ year" small | 15px / 700 via `formatMoney`, "per year" 12px / 500 (the product's `PERIOD_SUFFIX`) | yes; suffix wording is the product's |
| Chevron | right, muted | right, secondary ink, does not rotate | yes |
| Info row | 616 x 88 render = 360 x 51, three cells side by side, glyph left of text, hairlines | 342 x 84, three cells SIDE BY SIDE, glyph left of text, hairlines; date and status cells take their content's width, the middle takes the rest | yes; 1.65 in height only because the grouped phone number wraps to a second line (allowed by the lead); 66 without it |
| Info glyphs | 38 render = 22 CSS strict | 16 | smaller: the three cells fit side by side only at 16 |
| Info label / value / second line | about 7 / 8 / 7px strict | 11px / 400, 13px / 600, 11px / 400 | yes at minimum |
| Phone | 7px strict, white | 11px / 500 link colour, 44px target via negative margin | yes; weight 500 so it is as narrow as it can be |
| Pending badge | 72 x 24 render = 42 x 14, cyan | 20 tall, 11px / 600, corner 6, cyan `--nf-state-warning` | yes |
| Checklist panel | 616 x 506 render (8 rows); inset 15 render = 9 CSS | 342 x 240 (4 rows); inset 8 | inset yes; row count per I1 |
| Checklist head | title cap 13 render = about 10.7px, count about 8px, bar 124 x 6 render = 72 x 3.5 under the count only | title 15px / 600, count 12px / 500, bar 5px under the count only, identity fills | yes |
| Checklist row | 54 render = 31.5 strict, corner 12 (0.22), 1 to 2 render apart | 44, corner 10 (0.23), 2px apart | height at the minimum for 13 + 11px text (1.40 per row); corner yes; gap yes |
| Row plate | 42 of 54 (0.78), the render's glass disc | 34 of 44 (0.77), the render's own crop | yes |
| Check circle | 20 of 54 (0.37), brand ring | 18 of 44 (0.41), 1.5px brand ring; done: emerald fill and a drawn tick | yes |
| Row inset / plate to text | 9 render (0.17 of the row) / 22 render (0.41) | 4 / 12 | tighter, so the text column keeps its width |
| Row title / row sub | about 7.8 / 6.5px strict, white / light blue #6fb6f5 | 13px / 600 primary, 11px / 400 brand quiet | yes at minimum |
| Notes panel | 616 x 88 render = 360 x 51; well 545 x 45 render, corner 8 (0.18), a step lighter than the panel | 342 x 70; well h 28, corner 10 (0.36), brand tint over well fill; label 13px / 600, well text 12px | panel 1.37; the well's corner ratio is higher than the render's (a read-only box, not a control; noted); read-only, no textarea (I1) |
| Outcome panel | not in the render | 342 x 182: head 15px / 600, three rows of 44 (the pressed minimum), 13px / 600, the checklist's ring, corner 10 (0.23), 2px apart | added, in the checklist's register and density |
| Add Photos | 56 render = 33 strict, corner 14 (0.25), gradient #016bfb / #0039fd / #0472f8, bloom below, camera and label centred, chevron right | 46, corner 14 (0.30), label 14px / 650, identity lit button (token gradient #0074fc / #0042fd / #0069f7 with a lit pool, cyan edge, bloom down and up), picture glyph, chevron right | yes; picture not camera (no camera in the stroked tier) |
| Submit | 50 render = 29 strict (0.89 of Add Photos), fill #001e62, edge #003ab1, muted label #447cd3, paper plane | 44 (0.96 of Add Photos), brand-tint glass, brand edge, label brand quiet at 55% while disabled, `telegram` paper plane, 14px / 650 | yes |
| Block spacing | 13 to 16 render = 8 to 9 CSS; Add Photos to Submit 11 render = 6.5 | 8 throughout | yes |
| Glass fill, rim, glow | fill #000f49 on ground #01071e with lit bands, top rim #2cabf6, soft blue bloom | the glow identity's lit card: bands of lit ink top and foot, dark middle, cyan top and left edge, deep blue right, rim lines, 4px and 12px bloom | yes |
| Colours | electric blue, quiet blue, emerald, cyan; no warm hues | the same four token families; rose only for Declined | yes |

Shape ratios of every text-bearing control, built: badges 0.30, options 0.23, Add
Photos 0.30, Submit 0.32; the sweep (section d) reports none over 0.35.

Added over the render, because the data model needs it: the outcome chooser ("How did
it go?", three options) before Submit, and a hint line under Submit saying why it is
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

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3178 --shape-sweep --routes /ix-harness --theme both`
at 390 and 1536, dark and light: BREACHES 0; WORTH AN EYE (0.35 to 0.5) 0; round
icon-only controls 0. `/inspections` and `/agent/inspections` themselves cannot be swept
without a session (the tool refuses a route that redirects to /sign-in), so the sweep
ran on the harness that renders the same components. Re-run after the density round (final
build): same result, 0 / 0 / 0. `check-css-tokens.mjs`: clean.

### (e) Proofs, and what I could not verify

- Every screenshot is FIXTURE-BACKED: a throwaway harness route (not committed)
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
- **Profile.** Every proof is fixture-backed (throwaway harness, never committed; its header is
  the signed-out header). The live wiring is proven by code, the RLS and trigger read, and unit
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
