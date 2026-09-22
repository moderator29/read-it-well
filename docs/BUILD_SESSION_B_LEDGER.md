# Session B build ledger

Session B's own record. The other session's ledger is `docs/BUILD_07_LEDGER.md`
and Session B does not write in it. Scope: `docs/SESSION_B_SCOPE.md`.

Every surface gets three sections before it can be called finished:
1. **The chain**: control, server action, validation, policy, table, trigger,
   notification, query, screen. Every broken link named.
2. **The comparison**: the governing image against the built page at 390px dark,
   property by property, with measured numbers.
3. **Light mode**: the same surface on paper, checked.

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
- **Header.** The render's back square and gear sit where a phone status bar would be; in the
  product the global app header (hamburger, lockup, bell, avatar; not Session B's) owns that
  band. The cover runs up behind the header (the header is transparent at rest, so it floats on
  the photograph as the render's status bar does) and the back and gear squares sit 8px under
  it. Everything below them keeps the render's spacing relative to the person.
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
  lands on the render's 49px plate. No new crops were needed. On paper those objects have no
  light twins, so the same slot draws a pale brand plate carrying the stroked `UiIcon`
  equivalent (`calendar-booking`, `bookmark`, `wallet`, `verified`, `switch-profile`); CSS
  chooses by theme, so there is never a dark square on white.
- **Type scale.** Measured render type is small for its phone (row subtitle 9.5px, row title
  10.7px at 390). Every text role ships at measured x 1.16, snapped to a step, which puts the
  subtitle on 11px (the dock label's size) and is the largest factor that still sets the
  render's longest subtitle ("Manage your balance, cards and transactions") on one line inside
  the row the render draws. Geometry (radii, plates, rows, gaps, avatar) ships at 1x.
- **Cover photo control.** The render draws nothing on the cover but back and gear, so the
  quiet change-cover square that used to sit on the cover is now a "Cover photo" row below the
  fold. Tapping the face still opens the avatar picker.
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
| Back | `useBack("/home")` (declared parent, or history) | | | | | |
| Gear | link `/settings` | | | | | |
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
| Back and gear squares | 55 image px: 33 square, radius about 10, navy glass (0 36 130) with a blue rim | 34 square, `--nf-radius-sm` 10, navy glass (sampled 45 59 99 over the sky), 1px blue rim, 44 target by hit area | yes |
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
| Counts gap and hairline | 24 each side of a 22 tall hairline (15 134 203) | 24 each side, 22 tall, 9 78 182 | position yes; the built hairline is dimmer |
| Counts to tabs | 24 | 22 | yes |
| Tab control | 598 x 71 image px: 355 x 42, radius about 14, one track, live half fills the full height | 354 x 44 (44 for the thumb), `--nf-radius-control` 14 (ratio 0.32), live half full height | yes |
| Live tab | lit: 1 126 254 top, 0 61 246 middle, 0 101 254 bottom, bright top rim (3 146 251), bloom | `--nf-gradient-cta`: 0 113 252, 27 96 253, 0 99 248; `--nf-rim-primary`; `--nf-bloom-lit-soft` | yes; middle a little lighter |
| Resting tab | glass 0 21 67, label 175 203 238, rim 1 46 134 | 0 16 74, label mist, rim 0 54 142 | yes |
| Tab label | 11.5px, 500 to 600, house and chat glyphs | 14px, 600 live and 500 resting, `home` and `chat-bubble` 24 | yes |
| Tabs to first row | 20 | 20 | yes |
| Row | 598 x 112 image px: 355 x 66, radius 23 image px: 14 (ratio 0.21) | 354 x 67, `--nf-radius-control` 14 (ratio 0.21) | yes |
| Row gap | 13 image px: 8 | 8 | yes |
| Row fill | 0 30 95 under the top, 0 17 59 middle, 1 26 82 at the foot, page 0 8 36 | 0 33 79, 0 21 52, 0 29 69, page 6 11 38 | yes |
| Row rim | top 0 42 126, sides 0 53 142, foot brighter 1 73 160, no white catchlight | top 0 54 133, side 0 56 138, foot 0 77 185 | yes |
| Row glow | soft blue bloom round the row | `0 6px 18px -10px` and `0 0 16px -8px` of `--nf-glow-2` | yes |
| Icon plate | 83 image px: 49, glass square with a blue line glyph about 27 (the render's objects) | 49, the pack crops of this very render (`calendar-grid`, `bookmark-ribbon`, `wallet-tile`, `shield-check-tile`) drawn so their square is 49 | yes; the plate interior samples 0 39 128 against the render's 1 52 167, a little dimmer |
| Plate to title | 24 image px: 14 | 14 | yes |
| Row title | 10.7px, 500 to 600, near white | 13px 600, 241 242 244 | size by the translation |
| Row subtitle | 9.5px, one line, mist (159 194 231) | 11px, one line for all four at 390, 154 187 234 | yes |
| Chevron | right edge 18 from the row edge, near white | 20px `chevron-right`, 12 padding plus the glyph's own margin | yes |
| Gap before Switch role | 39 image px: 23 | 23 | yes |
| Switch role row | 101 image px: 60, quieter plate (0 24 82), fill 0 16 59 | 62, `role-switch-tile` at 82 per cent, fill 0 20 50 | yes |
| Status badges | none on this screen | none | yes |
| Buttons | the lit segment is the only lit control | the lit segment; Claim your handle (no handle only) wears the same gradient, top rim and bloom | yes |
| Colours | one blue family | one blue family; the plate's sunset is photographic and graded towards blue | yes |

**Differences that remain, honestly.** (1) Everything below the back and gear squares sits
about 22 to 35px lower than in the render: the app header takes the status bar's band, and
the scaled type makes the text column 10px taller. (2) Type is 1.16 times the render's, on
purpose (1.1). (3) The plate interiors and the counts hairline sample dimmer than the render.
(4) The fixture has no photograph, so the face is a monogram; the product draws the person's
own `avatar_url`. (5) The glow identity (`docs/design/GLOW_IDENTITY.md`) proposes a cyan top
edge and a lit interior for cards and tiles; this render measures a dim blue top edge
(0 42 126) and a brighter foot, and its tiles are its own crops, so the governing image wins
here. The lit segment reads `--nf-gradient-cta`, `--nf-rim-primary` and `--nf-bloom-lit-soft`
and will follow the identity when Session A adopts it into the tokens. The paper plate follows
the identity's pale tile.

**Re-audit gate.** Pass one (image beside `v3`): the plate objects drew a second, lighter
square inside a brand wash, the back square read as a pale blue wash over the sky, and a third
glass square (change cover) sat on the cover where the render has none. Fixed: the wash went,
the objects were sized so their own square is the plate, the back and gear went navy, and the
cover control moved to a row. Pass two (image beside `v4`): the objects had collapsed to 16px
when the absolute centring lost its size. Fixed and re-shot (`v5`, the proofs). Final read of
the image beside `profile-390-dark.jpg`: composition, order, containers, radii and glow read as
the same design, with the differences listed above.

### 1.5 Light mode

Screens: `profile-390-light.jpg`, `profile-390-light-full.jpg`,
`profile-390-light-nohandle.jpg`, `profile-390-light-signedout.jpg`, `profile-1280-light.jpg`.
Same anatomy on paper, with explicit `:root[data-theme="light"]` rules in `profile.css`:
- The cover is still the photograph, with a lighter blue grade, fading into the paper canvas.
- Back and gear: white glass on a brand hairline with ink glyphs.
- The ring stays lit (brand accent to primary) round a white seam; the tick badge sits on white.
- Tabs: a white track on a brand hairline; the live half keeps the lit gradient.
- Rows: white, `--nf-border-brand` edge, `--nf-elev-2` shadow in place of the bloom.
- Plates: the glow identity's PALE tile (near white to pale brand blue, a brighter top edge,
  white rim, short brand shadow) carrying the stroked `UiIcon` in brand blue. The night objects
  have no light twins, so they are hidden on paper by CSS; there is no dark square on white
  anywhere on the page.
- Second lines are `--nf-content-secondary`, the chevron `--nf-content-muted`.
Checked by eye in all five screens. No white-on-white and no vanishing mark found.

### 1.6 Shape sweep, checks, and what was not verified

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3171 --shape-sweep --routes "/zz-pf,/zz-pf?v=nohandle,/zz-pf?v=signedout" --theme both`
(the throwaway harness renders the real components; `/profile` itself redirects to sign in
without a session and the sweep refuses to measure a redirected page):

```
shape sweep: /zz-pf, /zz-pf?v=nohandle, /zz-pf?v=signedout at 390px, 1536px in dark and light
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
```

`check-css-tokens.mjs`: clean. `tsc --noEmit`: clean. `eslint` on the profile folder: 0
errors, 1 warning (the set-state-in-effect warning in the unchanged details sheet, present
before this work). `vitest run src/app/(app)/profile`: 12 passed.

**Not verified, and why.**
- **Every proof is fixture-backed.** There is no test account on production and none may be
  created, so the screenshots come from a throwaway harness route (never committed) that renders
  `AccountHero`, `AccountBody` and `SignedOutHero` with fixture props inside the real app shell.
  Its header is the SIGNED-OUT header (Sign in, Sign up); a signed-in person sees the hamburger,
  lockup, bell and avatar there. The fixture counts (12,400 and 482) are fixture props, not a
  claim about anybody.
- The live wiring is proven by code, by the RLS and trigger read above, and by the unit tests,
  not by a signed-in browser. The Switch role row pressing the dock's trigger was not exercised
  in a signed-in browser.
- `saved_places` policies were not in the policy read (the query listed the seven tables it
  named); the count uses the same filter `getSavedPlaces` already reads under the same session.
- Storage policies on `avatars` and `social-covers` were not re-read; the upload code is
  unchanged.
- Row values (upcoming, saved, balance, open) were shot with fixture facts
  (`profile-390-dark-values.jpg`); against production the read returns what the account has.
- No side-by-side composite image was made; the comparison was done by reading the render and
  the screenshot together, twice, as recorded above.

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
  ice, because cyan is the pending state colour in the one blue family.

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
| Headline line 2 "One platform." | 419 src = 250 css; blue at left to ice at right | 249 wide; gradient brand primary, quiet, ice | width yes; hue end is ice not cyan (one blue family) |
| Baseline spacing | 61 src = 36.5 css | line box 36.5 | yes |
| Line 1 baseline from mark top | 107 css | 107 css | yes |
| Sub-line | 2 lines, 224 css first line, lines 21.5 apart, #88cafa brightest stroke | 14.5px, 223 css first line, 21.5 line, quiet blue at 40% into primary | yes |
| Sub cap top to line 2 baseline | 27 css | 13 css margin + half leading = 27 | yes |
| Stage top (tile tops) from mark top | 262 css | 262 (scene top 253 + 24.5 inside the crop, minus 16) | yes |
| Stage art | the render's | the render's own pixels, 636 x 530 src drawn 380 x 317 | yes, identical art |
| Tile radius, rim, thickness, glass, pillars, plinth, reflection | as drawn | as drawn (cropped) | yes |
| PROPERTY / STAYS | cap 15 src = 9 css, 116 src = 69 css wide, pale ice, glow | 11px, 0.19em, 70 css wide, ice with glow, turned with the tile | yes |
| Coin | centre 49.4% / 62.3% of the stage, long axis ~165 src (99 css) once turned, top leaning left | same centre, 103 css box, turned 55 deg, leaning 34 deg, faces from the pack's `flip-coin` crop, the drawn orbit swirl kept | close: our face is the drawer render's coin, a little brighter than this render's darker face |
| Coin motion | still in the render | turns once every 7 s, rests at the drawn pose 45% of the cycle; reduced motion holds the pose | by design |
| Dots | 4, pitch 23 css, active 9.5, rest 7 | 4, pitch 28 css (44 tall buttons), active 10, rest 7 | pitch wider on purpose for the tap |
| Dots centre from mark top | 583 css | 581 | yes |
| Button | 323 x 56 css, 34 in from each side, top 620 below mark top | 324 x 56, x 33, top 618 | yes |
| Button treatment | white rim along the top (#e4feff), bright edges (#0180fb sides), deeper core (#001fae), bloom below | gradient primary to deep core to primary, inset 1.5px lit rim, inset edge glow, 1px lit border, two-rung bloom | yes |
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

(pending)

## 4. Wallet

(pending)

## 5. Send money

(pending)

## 6. Admin shell, overview, operations, analytics

(pending)

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

### (b) The comparison, 390 dark

Scale: phone screen 668 render px (inner edge 177 to 845), so 1 CSS px = 0.584 render px.
The render's type is far below any phone's floor at that scale (row sub line 6.5px, row
title 7.8px, info labels 7px), so text is held at the platform rung for its role and
containers grow about 1.6 times to carry it; radii are taken up by the same factor so
every corner keeps the render's radius-to-height ratio. Built numbers are from
`getBoundingClientRect` / computed style on the fixture harness.

| Property | Image (measured) | Built (measured) | Match? |
|---|---|---|---|
| Page gutter | 16 CSS (card x 205 to 821) | 24 (the shared app shell's padding) | no: shell chrome, not this surface |
| Back button | glass rounded square in the header row | 44 x 44 glass square (`nf-icon-btn--glass`) on its own row above the title | shape yes; placement differs, the render's header row is shared chrome |
| Title | cap 28 render px = 16.4 CSS, about 23-24px, bold, white with a faint blue second word | 24px / 700, second word 82% white 18% brand quiet | yes |
| Sub line | blue (#47d0f6 peak), two lines, about 10.5px strict | 14px, `--nf-brand-secondary`, two lines | colour and lines yes; size at floor |
| Glass house | 153 render px object, 89 CSS, at the title's right, foot over the card's top edge | the render's own crop (`house-check.webp`), 108 x 81 box (object about 89), placed in the title block's top right and over the card edge by 8px, above it in z order | yes (crop, soft at 3x, see SOURCES.md) |
| Listing card | 616 x 142 render (360 x 83 strict), radius about 16 render (9 strict), fill #000f49 with lit bands top and foot, lit top rim, brand edge | 342 x about 150, radius 14, the glow identity's lit card (bands of lit ink top and foot, dark middle, cyan top and left edge, deep blue right, rim lines, 4px and 12px bloom) through `--nf-glow-ink` and `--nf-state-warning` | anatomy yes; taller because of type floor |
| Card photo | 180 x 129 render (105 x 75), radius about 10 render | 100 wide, stretches card height, radius 10 | width yes; aspect taller |
| Scheduled badge | 91 x 24 render, radius about 8 (0.33), emerald fill #018d93 / text #0febef | 24px tall, radius 6 (0.25), `--nf-state-success` on its surface tint | shape yes, hue: token emerald (the render's teal is off-family) |
| Card title | cap 14 render (about 12px strict), semibold white, one line, text face | 15px / 600 in the text face | yes at floor |
| Place and kind lines | pin and house glyphs in brand blue, text light | 16px glyphs brand quiet, 13px secondary | yes |
| Price | bold brand blue, "/ year" small | 16px / 700 brand quiet via `formatMoney`, "per year" 13px (the product's own `PERIOD_SUFFIX`) | yes; suffix wording is the product's |
| Chevron | right, muted | right chevron, secondary ink, does not rotate | yes |
| Info row | 616 x 88 render, three cells, hairlines, glyph left of text | 342 x about 124, three cells (1 : 1.25 : at least the badge), hairlines, glyph ABOVE text | no: at 12px floor the labels do not fit beside a glyph in 91px; side by side from 640px up |
| Info labels / values | label 10 render cap muted cyan, value white | 12px secondary / 13px 600 primary, time 12px | yes at floor |
| Pending badge | cyan, 72 x 24 render | cyan `--nf-state-warning` (the cyan rung), 24px, radius 6 | yes |
| Checklist panel | 616 x 506 render, rim #2cabf6 on top, fill #000c30 | 342 x about 330, same glass class, radius 14 | yes |
| Count and bar | "0 / 8 Completed" in blue, bar 124 x 6 render under the count only | "n / 4 Completed" 13px brand quiet, bar under the count only, 6px, round (a shape), identity progress on/off fills | yes; count is the record's four rungs |
| Checklist rows | 54 render tall, radius 12 (0.22), fill #011f5b, edge #023982, 1-2px gap | 56-60 tall, radius 10 (0.17), brand-tint-1 over the panel, brand edge soft, 4px gap | yes |
| Row icon plates | round glass discs 44 render px with cyan line glyphs | the render's own plates, cropped (house, shield, sofa, document), 40 CSS | yes (crop, soft at 3x) |
| Row title / sub | cap 10 render white semibold / light blue #6fb6f5 | 14px 600 primary / 12px brand quiet | yes at floor |
| Check circles | hollow, 20 render (12 strict), brand blue ring | 22px hollow, 1.5px brand ring; done = emerald fill with a drawn tick | yes |
| Notes panel | pencil glyph, "Notes", textarea well a step lighter than the panel (#00154b on #00113d), radius about 8 render | document glyph, "Notes", read-only well with brand tint over well fill, radius 10 | shape yes; not a textarea (nothing stores it, I1) |
| Add Photos | 616 x 56 render, gradient #016bfb / #0039fd / #0472f8, top rim, bloom below, camera + label centred, chevron right | 342 x 56 (`nf-btn--lg`), the identity's lit button: `--nf-gradient-cta` (#0074fc / #0042fd / #0069f7) under a pool of lit ink at its lower middle, cyan edge, `--nf-rim-primary`, bloom 0 6px 18px down and 0 -2px 10px up, picture glyph + label centred, chevron right | yes; glyph is picture (no camera in the stroked tier) |
| Submit Inspection Report | 616 x 50 render, fill #001e62, edge #003ab1, muted label #447cd3, paper plane glyph | 342 x 48 (`nf-btn--md`), brand-tint glass, brand edge, label brand quiet at 55%, `telegram` paper plane | yes |
| Radii ratio on text controls | 0.24 to 0.33 | 0.25 to 0.29 | yes |
| Colours | electric blue, quiet blue, emerald, cyan; no warm hues | same four token families; rose only for Declined | yes |

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
ran on the harness that renders the same components. `check-css-tokens.mjs`: clean.

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
   person. Each step you complete shows on your listings.
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
   person. Each step you complete shows on your listings.
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
   Tell us who you are, where you work and what you charge. Agents are
   checked more closely than owners, because you handle other people's
   property, and a person at Vallo reads every registration.
   Choose agent or firm: https://vallospaces.com/profile/setup

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
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
  tests, not by a signed-in browser. Switch role pressing the dock trigger not exercised signed
  in. `saved_places` and the two storage buckets' policies not re-read. New English copy not yet
  in `packages/i18n` (scope request 1b). No side-by-side composite image made. Details in 1.6.
- Inspection (section 9): proofs are fixture-backed (throwaway harness, not committed);
  the live write path and `InspectionsLive` were not exercised against production (no
  test user, every listing an example). `/inspections` and `/agent/inspections` could not
  be shape-swept directly (redirect to sign-in). The eight-row room checklist, report notes
  and report photos are not built (scope request I1). Crops soft at 3x.
