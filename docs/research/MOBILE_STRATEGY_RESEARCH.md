# Mobile strategy research: Capacitor shell versus a React Native rewrite

Written 22 September 2026 against the tree at `/home/user/read-it-well`, by a
read-only pass. Every count was measured with a command quoted beside it, or is
marked as an estimate. Nothing was changed, built, run on a device or deployed.

The question: should Vallo rebuild the mobile app in React Native with Expo,
possibly in a separate repository sharing one database, before a launch
targeted at 10 October 2026 on about 2,200 US dollars with a small temporary
team?

**The answer, up front.** No. Not before launch, and on the evidence below
probably not for a good while after. The Capacitor shell is the only path that
reaches a store inside the money and the calendar available. A React Native
rewrite is 82 to 124 engineer-weeks by the measurements in sections 2 and 3,
and its largest part, an HTTP API a native client can talk to, does not exist
and is not partly built. What the remaining budget should buy is push
notifications and a real device pass, not a second frontend.

---

## 0. Corrections to the established facts

Seven of the eight figures in the brief are close. One is materially wrong.

| Claim | Measured 22 Sept 2026 | Verdict |
| --- | --- | --- |
| 674 tsx files | 680 | Revise |
| ~107,000 lines TSX | 109,906 | Revise |
| ~31,500 lines CSS | 28,186 in `apps/web/src` + 3,398 in `packages/design-tokens/src/tokens.css` = 31,584 | Correct |
| 235 page.tsx routes | 235 | Correct, but see below |
| 229 server components | 229 (6 of 235 carry `"use client"`) | Correct |
| 69 server-action files | 69 | Correct |
| 18 API routes | 19 `route.ts`; 18 under `src/app/api/`, plus `src/app/home-or-landing/route.ts` | Revise |
| Capacitor configured, projects generated, runtime in `lib/native/` | All present as described | Correct |

**The material correction.** Of the 235 `page.tsx` files, **106 live in the
`(dev)` route group** (`(dev)/gallery`, `(dev)/preview`), which is the design
gallery and preview harness, not product. **The product surface is 129
routes.** That is the number any rewrite estimate must be built on. It cuts the
worst-case frontend figure by nearly half and does not change the
recommendation.

**A second correction, to the tree.** Two comments in
`apps/web/capacitor.config.ts` are stale: it says "40 files declare server
actions" (the count is 69), and it names `src/middleware.ts` as the session
lock. No `middleware.ts` exists anywhere in source. Next 16 renamed the file;
the session lock is **`apps/web/src/proxy.ts`**, 244 lines, exporting
`async function proxy`. The reasoning survives intact, only the filename is
wrong. Neither error affects behaviour; both will mislead the next reader.

---

## 1. What the Capacitor shell actually is today

### 1.1 The architecture

`apps/web/capacitor.config.ts` configures a **remote-origin shell**. The binary
carries no static build of the site. It reads `CAPACITOR_SERVER_URL` at
`cap sync` time into `server.url`, so the web view loads the live production
origin over https. `webDir` points at `apps/web/native-shell/`, a 218-line
single file shown when the origin is unreachable, and shown permanently if the
binary was packaged with the variable unset. The config refuses to emit an
empty `server.url`, because Capacitor treats an empty string as a URL and loads
nothing at all.

The reason for this shape is sound and still true: 69 files declare server
actions so `output: 'export'` refuses the project; `src/proxy.ts` is the
session lock and static export runs no middleware; the root layout reads
cookies so every route is dynamic anyway. A static bundle is not available.

### 1.2 Inventory: wired, declared, absent

**Wired in code.** Nine modules, 965 lines, in `apps/web/src/lib/native/`.

| Capability | File (lines) | What it does |
| --- | --- | --- |
| Native detection | `platform.ts` (75) | Reads the injected `window.Capacitor` bridge rather than importing `@capacitor/core`, so the website pays nothing. Two gates: cheap global check, then real `isNativePlatform()` in `boot.ts` |
| Runtime boot | `boot.ts` (134) | Dynamic-imports each module behind its own try/catch, collects teardowns; a failed plugin degrades to web behaviour |
| Splash | `splash.ts` (93) | `launchAutoHide: false`; hidden after two rAF passes post-load, 4,000ms failsafe, 220ms fade |
| Status bar | `status-bar.ts` (67), `theme.ts` (85) | Paints `CHROME_COLOUR[theme]`, repaints on a `MutationObserver` watching `data-theme` |
| Keyboard inset | `keyboard.ts` (114) | Sets `--nf-keyboard-inset` and `data-keyboard="open"`, scrolls the focused field into view honouring reduced motion. Config sets `resize: KeyboardResize.Native` |
| Hardware back | `back-button.ts` (91) | Three-way: dismiss an open overlay (detected by `document.body.style.overflow === "hidden"`, dispatching a synthetic Escape), else `canGoBackInApp()`, else `App.exitApp()` |
| External links | `external-links.ts` (197) | Capturing click listener plus the Navigation API, sending cross-origin http(s) URLs to `@capacitor/browser` in a themed full-screen tab. This is what keeps Paystack and OAuth out of the app's own web view |
| Deep links | `deep-links.ts` (109) | Listens for `appUrlOpen`, closes the in-app browser, navigates only when the origin matches |

**None of the eight has ever run on a device.** The logic reads correctly, which
is a different claim. The `back-button.ts` overlay heuristic is the piece I
would expect to misbehave first.

Five plugins are installed on the 8.x line against `@capacitor/core` 8.5.0:
`@capacitor/app`, `browser`, `keyboard`, `splash-screen`, `status-bar`.

**Declared and generated, unproven**

- Both native projects exist. Android: `applicationId com.vallospaces.app`,
  `minSdk 24`, `compileSdk`/`targetSdk 36`, `versionCode 100000`,
  `versionName "0.1.0"`, `debuggable false`, `minifyEnabled true`. iOS:
  generated project with a hand-edited `project.pbxproj`.
- Icons and splash generated and committed: 60 files under
  `android/app/src/main/res` (29 of them `ic_launcher*`, splash drawables at
  every density, both orientations, night variants); 13 files in
  `ios/App/App/Assets.xcassets` covering `AppIcon.appiconset` and
  `Splash.imageset` with dark variants.
- Android hardening that is right and untested: `allowBackup="false"` (the
  reasoning, that Auto Backup would carry the Supabase session cookie to a
  second handset, is correct), `usesCleartextTraffic="false"`,
  `launchMode="singleTask"`.
- Permissions: Android `INTERNET`, `ACCESS_COARSE_LOCATION`,
  `ACCESS_FINE_LOCATION` capped at `maxSdkVersion="30"`. iOS
  `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSCameraUsageDescription`. `ITSAppUsesNonExemptEncryption` already `<false/>`,
  which pre-answers export compliance at upload.
- App Links intent filter on `vallospaces.com` and `www.vallospaces.com` with
  nine path prefixes: `/listing/`, `/stay/`, `/stays/`, `/restaurant/`,
  `/restaurants/`, `/around/`, `/u/`, `/post/`, `/stories/`.
- Version pipeline: `scripts/sync-native-versions.mjs` (272 lines) drives both
  platforms' versions from `apps/web/package.json` plus `VALLO_BUILD`, with a
  `--check` CI form and a refusal to move `versionCode` backwards.
- Icon pipeline: `scripts/build-native-icons.mjs` (208 lines), with a guard
  against enlarging the mark past 1.6x.

**Absent entirely**

- **Push notifications.** No plugin, no `google-services.json`, no APNs
  anything, no device token table, no permission request. Section 5.
- **Crash reporting and analytics.** No dependency of either kind. Nobody will
  know why a release fails in the field.
- **iOS associated domains binding.** `ios/App/App/App.entitlements` exists with
  both `applinks:` entries and is deliberately inert: `CODE_SIGN_ENTITLEMENTS`
  is unset, because setting it fails every build until the capability exists on
  a real App ID.
- **Signing material.** `android/keystore.properties` absent and gitignored, so
  `assembleRelease` produces an unsigned artefact rather than silently using the
  debug key. That is the right failure.
- **Both association files are placeholders.** `assetlinks.json` carries
  `PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256_...` and
  `PLACEHOLDER_REPLACE_WITH_UPLOAD_KEY_SHA256_...`;
  `apple-app-site-association` carries
  `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app`. Both fail
  verification rather than looking plausible, which is correct posture.
- **Pull to refresh.** Nowhere. Named in Play guidance as a wrapper tell.
- **Native tab bar, share sheet, haptics, biometrics, camera capture, local
  notifications, background fetch, offline data.** None exist.

### 1.3 What a user on a phone would experience today

Assuming the build succeeds on a machine with the toolchains, which has never
been demonstrated:

1. A navy splash held until the web layer paints, with a 4-second failsafe. On
   a Nigerian mobile connection this is likely to be the full four seconds
   often, because first paint is a cold request to a live origin with no cached
   HTML.
2. The product loads looking exactly like the website, because it is the
   website. Status bar navy, keyboard resizes the view, hardware back navigates
   within the app.
3. Email and password sign-in works. **Sign in with Google does not complete.**
   The handoff opens the system browser correctly, the exchange finishes there,
   and the app stays signed out, because the return needs a verified universal
   link or App Link and both association files carry placeholders.
4. A Paystack card payment opens the system browser and settles, because the
   webhook is server to server. The user returns to the app by hand.
5. A shared `vallospaces.com/listing/...` link opens in a browser, not the app,
   for the same association-file reason.
6. Airplane mode from cold start shows the branded offline card with a retry;
   from a warm session, `/offline` served by `apps/web/public/sw.js`.
7. **No notification ever arrives.** They exist only as rows in
   `public.notifications`, rendered in-product.

### 1.4 What has never been run

`docs/MOBILE.md` section 6 and `docs/MOBILE_READINESS.md` section 3 are honest
and nothing contradicts them. In one place: no native build has ever run (the
sandbox proxy denies `dl.google.com`, no macOS, no Xcode); no device has ever
run it, so every mobile claim in the tree, including the 34-line safe-area
audit, is about stylesheets and a 390px headless viewport; the hand-edited
`project.pbxproj` has never been opened by Xcode; R8 with `minifyEnabled true`
has never produced a bundle; the location-permission reasoning comes from
reading Capacitor's `BridgeWebChromeClient` source, not a handset.

One live detail: `android/app/build.gradle` still resolves
`com.google.gms:google-services` and never applies it, because there is no
`google-services.json`. When push ships that file appears and the plugin starts
applying, changing the Gradle graph for the first time on a project nobody has
ever compiled.

---

## 2. The API surface problem, quantified

This is the decisive section. React Native cannot call a Next.js server action.
Server actions are a framework-internal RPC: a POST to the same origin with a
build-time action ID in a header, a React Flight-encoded body and a Flight
response only the React DOM client runtime can decode. There is no stable
public protocol and no supported client outside React DOM. A React Native
client can only call HTTP endpoints.

### 2.1 What exists today

- **69 files** declare `"use server"`. 57 at file level (every export is an
  action); 12 inside individual function bodies.
- Those files export **233 functions** (`grep -cE '^export (async )?function '`,
  summed). That is the working count of distinct server actions.
- **19 `route.ts` handlers.** The 18 under `src/app/api/` are: 2 webhooks
  (`paystack/webhook`, `yellowcard/webhook`), 6 cron endpoints
  (`account-purge`, `complete-stays`, `hold-sweep`, `inventory-drift`,
  `pg-cron-watch`, `saved-search-alerts`), 3 crypto proxy routes, plus
  `assistant`, `auth/email-hook`, `client-error`, `csp-report`, `map/listings`,
  `paystack/reconcile`, `support`. **`map/listings` is the only route in the
  tree a mobile client would use as a product data API.**
- The read path is not an API either: **755 `.from("` call sites** across the
  source, against only **48 exported functions in `lib/**/queries.ts`** and
  **5 in `lib/**/repository.ts`**. Most reads are inline in server components.

### 2.2 The 233 actions by domain

| Domain | Files | Actions | Composition |
| --- | --- | --- | --- |
| `lib/social` | 11 | 41 | posts 15, stories 6, areas 6, profiles 6, follows 2, admin 3, bot 1 |
| `lib/admin` | 12 | 36 | business 10, core 8, payments 4, bookings 3, money/standing/suspension/reference 2 each, kyc/moderation/verification 1 each |
| `lib/agent` | 7 | 24 | listings 12, payouts 4, bookings 3, calendar 2, reviews 2, application 1 |
| `lib/saved` | 4 | 18 | places 13, searches 4, items 1 |
| `lib/auth` | 4 | 14 | core 12, deactivated notice 2 |
| `lib/wallet` | 3 | 13 | core 8, pots 3, recovery 2 |
| `lib/payments` | 3 | 11 | bank accounts 6, methods 4, charge saved card 1 |
| `lib/host` | 1 | 10 | the Stays host console |
| `lib/messages` | 2 | 9 | threads 8, notifications 1 |
| `lib/bookings` | 4 | 9 | checkout 4, actions 3, lifecycle 1, payment subject 1 |
| `lib/interests` / `business-transfer` / `account-deletion` | 3 | 18 | 6 each |
| `lib/profile` | 1 | 5 | |
| co-located in `app/` | 5 | 5 | around feed, verification, wallet send recipient, two saved-card actions |
| `lib/places` / `inspections` | 2 | 8 | 4 each |
| `lib/reservations` | 1 | 3 | |
| `lib/support` / `security` / `rent` | 3 | 6 | 2 each |
| `lib/site` / `reviews` / `reports` | 3 | 3 | 1 each |
| **Total** | **69** | **233** | |

### 2.3 What a React Native client would need

Feature parity means **233 write endpoints** (one per action, fewer if folded)
and **roughly 70 to 110 read endpoints**. The 129 product routes each need
their data; the 53 exported query functions cover perhaps a third of the read
surface and the rest sits inline as one of the 755 `.from()` calls, needing
extraction before it can be served. Then the cross-cutting work, which is where
projects of this shape actually go wrong:

**Auth for a non-cookie client.** `resolveSession()` in
`apps/web/src/lib/actions/session.ts` is `server-only`, React-`cache`d, reads
`cookies()` through `@supabase/ssr`, calls `supabase.auth.getUser()`, and is
referenced by **87 files**. A native client holds access and refresh tokens in
secure storage and sends `Authorization: Bearer`. Every endpoint needs a second
resolver reading that header and constructing a client bound to that JWT so RLS
still applies, returning the same `SessionState` union. The resolver is a day.
Threading it through 233 endpoints without regressing the web path is not.

**Validation reuse.** The one piece of genuinely good news. Zod 4 schemas
already sit beside the actions (`lib/admin/schema.ts`,
`lib/social/posts-schema.ts`, `lib/agent/bookings-schema.ts`,
`lib/account-deletion/schema.ts` and others), and `validate()` plus the
`ActionResult` envelope in `apps/web/src/lib/actions/envelope.ts` already
produce JSON-shaped `{ok, data} | {ok, error, fieldErrors}`. **That envelope is
already an API contract.** An endpoint that parses JSON, calls
`validate(schema, body)` and returns the envelope is near-mechanical.

**RLS posture.** 100 `enable row level security` statements and 302
`create policy` statements across 213 migrations. RLS is the real boundary and
it holds identically for a bearer-token client, because both are the anon key
plus a user JWT. Second piece of good news.

**Rate limiting.** `apps/web/src/lib/security/rate-limit.ts` (229 lines) is
`server-only`, database-backed through `callSecurityRpc`, keyed on
`user:`/`ip:`/`email:` subjects. 21 files call `consume()`. It works unchanged
from a route handler, but the IP subject comes from `x-forwarded-for`, which
behaves differently for app traffic and needs a look.

**Versioning.** Not present and not needed today, because the only client ships
with the server. Old binaries live on phones for months, so a mobile API needs a
version prefix and a deprecation policy from day one or the first breaking
change bricks every unupgraded install.

### 2.4 Can React Native talk to Supabase directly?

Partly, and the boundary is sharp.

**Yes for plain RLS-protected reads and simple writes.** `supabase-js` v2 runs
in React Native with a SecureStore adapter. Listings, stays, saved items,
profile rows, notifications and messages would read under their policies, and
`lib/messages/useRealtime.ts` shows the realtime pattern already in use. This
covers a real fraction of the read surface and is why a read-mostly RN
prototype always looks deceptively easy.

**No, and here is where it breaks down:**

1. **Service-role paths.** 18 `SERVICE_ROLE` references across 15 files:
   `lib/wallet/ledger.ts`, `wallet/reconciliation.ts`, `wallet/recovery-actions.ts`,
   `account-deletion/actions.ts`, `business-transfer/actions.ts`,
   `alerts/record.ts`, `security/service-rpc.ts`, `email/recipients.ts`,
   `cron/run.ts`, `api/paystack/webhook/route.ts`. Money, deletion, ownership
   transfer and rate limiting all run above RLS. None can reach a client.
2. **`SECURITY DEFINER` with revoked execute.** 43 occurrences across 27
   migration files. The pattern throughout is `security definer` followed by
   `revoke execute ... from public, anon, authenticated`. `private.notify` is
   canonical: it is the single notification writer and clients cannot call it.
   Of 66 distinct `grant execute on function public.*` statements, 26 grant to
   `authenticated`, so a minority of the RPC surface is client-reachable and
   the rest deliberately is not.
3. **Server-only business logic.** The 30 distinct RPCs the app calls include
   `pay_booking_from_wallet`, `refund_and_cancel_booking`,
   `escrow_admin_resolve`, `open_rent_charge`, `purge_account_rows`,
   `set_fee_rate`, `suspend_agent`, `review_kyc_document`. Even where the grant
   exists, the surrounding logic (Paystack calls, idempotency records, audit
   rows, email dispatch, rate limiting) lives in TypeScript on the server.
4. **Everything in Node.** `createHash` from `node:crypto`, `headers()`,
   `revalidatePath`/`revalidateTag` (59 files), the Resend client, webhook
   signature verification. None is portable to a client.

**Summary:** Supabase-direct covers browsing and a handful of self-service
writes. It does not cover payments, bookings, escrow, payouts, KYC, admin,
deletion, transfer, or anything that sends an email. A thin-client RN app would
be a browsing app with a broken wallet.

### 2.5 Effort estimate for the API layer

**Estimates, not measurements.** One competent engineer already fluent in this
codebase, 40-hour weeks, including tests (the tree has 211 test files and a
test-first culture; a bare endpoint would not pass this project's own bar).

| Work | Basis | Estimate |
| --- | --- | --- |
| Bearer-token session resolver parallel to `resolveSession()`, with tests | One module, one hard problem: refresh rotation | 1 week |
| Route-handler wrapper, envelope passthrough, error contract, CORS, version prefix | Scaffolding | 1 week |
| 233 write endpoints wrapping existing actions, reusing schemas, dropping `revalidatePath`, swapping the session resolver | 1.5 to 2.5 hours each with a test | 9 to 15 weeks |
| 70 to 110 read endpoints, most needing extraction from inline server-component queries first | 755 `.from()` sites against 53 exported query functions is the difficulty signal | 6 to 10 weeks |
| Token-subject rate limiting, abuse posture, API headers pass | | 1 week |
| Contract documentation and a typed client package | | 1 to 2 weeks |
| **Total, API parity only, no mobile UI** | | **19 to 30 engineer-weeks** |

Five to seven engineer-months before a single React Native screen is drawn. At
the budget in the brief this line item alone is unaffordable by roughly two
orders of magnitude.

A narrower API covering only what a native v1 must do (auth, browse, listing
detail, booking, checkout, wallet balance, messages, notifications, profile:
perhaps 55 to 70 endpoints) is **6 to 9 engineer-weeks**. That is the only
version worth costing, and it still ships a native app that does less than the
website.

---

## 3. The frontend rewrite cost, quantified

### 3.1 What does not survive

**The CSS custom property token system.** `packages/design-tokens/src/tokens.css`
is 3,398 lines with **451 custom property declarations**, and its own
`package.json` calls it "a stylesheet, and only a stylesheet". React Native has
no custom properties, no cascade, no `var()`. The values survive; the mechanism
does not. Somebody emits a TS object from that file, then rebuilds every
consumer to read it through a theming context.

**Tailwind classes and the component layer.** 581 `.tsx` files use `className`;
Tailwind v4 is in the build. NativeWind is the usual answer, supports a subset,
and does not support the arbitrary-value and layer tricks this codebase leans
on. Beneath it sit **1,352 distinct `.nf-` selectors** across 32 stylesheets in
`apps/web/src/app/css/` (22,016 lines) plus the root-level `social-feed.css`,
`side-nav.css`, `settings-rows.css` and `globals.css`, 1,899 class rule
selectors in total. Each is a component style to be re-expressed as a style
object or dropped, and every `className` string needs reviewing either way.

**The glass material.** `glass.css` is 1,286 lines and is the foundation the
whole product sits on: `backdrop-filter` (**157 usages** tree-wide), conic
gradient border-box strides on a registered `@property` angle, a single
152-degree light source, layered inset shadows, and a `light.css` paper twin
(717 lines). React Native has **no `backdrop-filter` and no gradient borders**.
The nearest equivalents are `expo-blur` (iOS-accurate, historically weaker and
costlier on Android) plus `react-native-svg` or Skia for the edges. You can get
*a* glass look; you cannot get *this* one, because the strides are a conic
gradient painted into a 1px border box and no React Native primitive does that.
Reproducing it means an SVG or Skia overlay per card, which is real work and a
real performance question on the low-end Android this market runs.

**The CSS motion system.** `motion.css` (683), `animation.css` (441),
`ambient.css` (644): **54 `@keyframes`**, 7 `@property` registrations, named
curves, token-driven durations read at runtime by JS (`SideFlip.tsx` reads
`--nf-*` durations from `getComputedStyle`), and a reduced-motion collapse that
turns all of it off from one place. Reanimated is capable, but nothing maps:
every animation is rewritten by hand and the one-place reduced-motion collapse
becomes a prop threaded through everything.

**View Transitions.** Three places: `ListingCard.tsx` calls
`document.startViewTransition` and sets `viewTransitionName`,
`ListingGallery.tsx` matches the name on the lead pane, `base.css` declares the
pseudo-element rules. No RN equivalent; Reanimated shared-element transitions
are a known source of fragility.

**The 3D side flip.** `components/app/flip/SideFlip.tsx` (282 lines) plus
`side-flip.css` (590 lines): a five-phase machine (`idle`, `lift`, `turn`,
`hold`, `reveal`) driving a `preserve-3d` `rotateY` of the whole application
between the Property and Stays sides, with a cookie write, a first-flip
localStorage flag, an 8-second hold ceiling and a reduced-motion path. This is
the product's signature moment. React Native supports `perspective` and
`rotateY`, so a flip is possible, but flipping **the entire navigation stack**
with two live route trees mounted at once is a different problem and it
interacts badly with native navigators. Budget this as hard and uncertain.

**`next/image`.** 39 files import it. Gone: automatic sizing, format
negotiation, blur placeholders, Supabase transforms through the Next loader.
`expo-image` is good, but every call site changes and the pipeline is
re-decided.

**Server components and streaming.** 229 of 235 pages are server components.
This is the single largest structural loss: each becomes a client screen that
fetches over HTTP (section 2) and manages loading, error and empty states
explicitly. The 9 `layout.tsx` files, the `loading.tsx` boundaries and the
Suspense structure all disappear.

**The route group structure.** `(app)`, `(auth)`, `(site)`, `(dev)`, plus
`admin`, `agent`, `host`, `welcome`, `api`. File-system routing with groups
becomes an explicit navigator tree (Expo Router is closest, not the same). The
`proxy.ts` session lock, which today guards 22 `PRODUCT_SEGMENTS` in one place
with a CSP nonce attached, has no equivalent; route guarding becomes
per-navigator logic.

Also gone: `revalidatePath`/`revalidateTag` (59 files), `useActionState`
progressive enhancement (36 files), `next/link` (197 files),
`next/navigation` (104 files), the service worker and `/offline`, the web
manifest, `env(safe-area-inset-*)` in 34 places (fairly traded for
`react-native-safe-area-context`), and 227 `@media` queries.

### 3.2 What does carry over

Genuinely, and it is not nothing: **the database** (170 tables, 213 migrations,
100 RLS-enabled tables, 302 policies, untouched); **the generated types**
(`database.types.ts`, 5,697 lines, framework-agnostic, imports cleanly);
**i18n** (`packages/i18n`, 14,072 lines of pure TypeScript across en, ha, ig,
yo plus `negotiate.ts` and `plural.ts`, no web dependency, moves as-is, the
cleanest carry-over in the tree); **design token values** (451 decisions, not
code, transferable as data once extracted); **business rules** (kobo money
handling, fee logic, validation schemas, state machines, the `ActionResult`
shape); **every word of copy** including four translations; **brand assets**
and the icon pipeline.

### 3.3 Effort estimate for the frontend

**Estimates, not measurements.** Basis: 129 product routes, 239 component files
totalling 48,092 lines, at the current quality bar (390px dark first, then
wider, then light, proven by screenshot, per `docs/BUILD_06_LEDGER.md`
section 0).

| Work | Basis | Estimate |
| --- | --- | --- |
| Expo project, navigator tree, auth and secure token storage, theming context, token extraction build step | Foundation | 3 to 4 weeks |
| Design system primitives: glass surface, card, icon tile, buttons, controls, chips, sheets, overlays | 1,352 `.nf-` selectors condense to perhaps 60 to 90 real primitives | 6 to 9 weeks |
| 129 product screens | 2 to 3 days each; screen count measured, day rate a judgement | 52 to 78 weeks |
| Motion: 54 keyframes re-expressed, reduced-motion discipline, the flip | The flip alone is 2 to 4 weeks and may fail | 6 to 10 weeks |
| Maps (Leaflet has no RN equivalent), media upload, gallery, photo viewer, story viewer | Known-hard specialist surfaces | 5 to 8 weeks |
| Device QA, both platforms, low-end Android | | 4 to 6 weeks |
| **Total, frontend only** | | **76 to 115 engineer-weeks** |

Adding the narrow API from 2.5 gives a realistic floor for a reduced-scope RN
v1 of **82 to 124 engineer-weeks**. One engineer: 18 to 28 months. Three
engineers working well together: 7 to 11 calendar months, and three engineers
working well together is not what a temporary team on 2,200 dollars is.

**The genuinely hard pieces, named:**

1. **The glass depth.** `expo-blur` plus SVG edges is a different material.
   Matching the current product on a mid-range Android is a research task with
   an uncertain answer.
2. **The side flip.** Flipping two mounted route trees in 3D inside a native
   navigator is not a solved pattern. It might simply not be reproducible and
   might have to be redesigned.
3. **The glow discipline.** The rule is one ambient animation per viewport,
   every glow from one 152-degree source, all collapsing under reduced motion
   from one declaration. In CSS that is enforced by the cascade and a lint
   script (`scripts/check-css-tokens.mjs`). React Native has no cascade to
   enforce it, so discipline becomes convention, and convention decays. Expect
   the design to drift.

---

## 4. Apple guideline 4.2 in reality

### 4.1 The actual text

Fetched 22 September 2026 from
`https://developer.apple.com/app-store/review/guidelines/`. The page as
returned did not expose a "last updated" date; logged in section 9.

> **4.2 Minimum Functionality.** Your app should include features, content, and
> UI that elevate it beyond a repackaged website. If your app is not
> particularly useful, unique, or "app-like," it doesn't belong on the App
> Store.

> **4.2.2** Other than catalogs, apps shouldn't primarily be marketing
> materials, advertisements, web clippings, content aggregators, or a
> collection of links.

> **4.2.3(i)** Your app should work on its own without requiring installation
> of another app to function.

> **4.2.6** Apps created from a commercialized template or app generation
> service will be rejected unless they are submitted directly by the provider
> of the app's content.

Three observations for Vallo. **4.2 does not ban a web view and does not
mention one**; the test is "elevate it beyond a repackaged website", a
judgement made by a human. **4.2.2's "web clippings" is the phrase that
bites**, and Vallo is a marketplace with accounts, money and messaging, which
is not a catalogue, not marketing material and not a collection of links; that
is a genuinely strong position. **4.2.6 does not apply**, because Capacitor is
an open-source framework and the app is submitted by the content's owner. Say
so explicitly in the review notes, because reviewers reach for 4.2.6 when they
see a wrapper.

### 4.2 What gets rejected, what passes

Sources here are secondary and mostly vendor content; weight accordingly and
see section 9. Consistent across them:

**Rejected:** a single view controller holding a full-screen `WKWebView`
loading a remote URL, with no native navigation, no offline behaviour, nothing
that works without a live connection, no platform integration. A site wrapped
in an afternoon. A blank white screen when the network drops.

**Passes:** substantial functionality, adaptation to iOS rather than a shrunken
desktop site, and native capabilities that are present and visible. Guidance
converges on push notifications, native navigation and genuine offline handling
as the three things reviewers actually look for.

**On appeals:** vendor sources claim 4.2 appeals mostly fail and that the
reliable fix is a new build plus new review notes rather than an argument. I
could not verify that against any primary source; treat it as folklore with a
plausible direction. The actionable part is not folklore: a 4.2 rejection costs
a build and a resubmission, days rather than weeks, and is not fatal.

### 4.3 Where Vallo actually stands

**For, all verifiable in the tree:** a real marketplace (170 tables, wallet,
escrow, bookings, KYC, messaging, social); native capabilities wired and
nameable in `apps/web/src/lib/native/`; a designed offline state rather than a
white page; safe-area handling in 34 places; a 390px mobile-first origin; deep
links declared on both platforms with a considered include and exclude list.

**Against, also verifiable:** **no push notifications**, the loudest single
absence; **no native navigation chrome**, since even the tab bar is HTML; **it
genuinely cannot function without a connection**, and while 4.2.3 is about
downloads rather than connectivity, "requires a constant internet connection to
show any meaningful UI" is exactly the shape reviewers describe; and **nothing
has been tested on a device**, so nobody knows what a reviewer will see.

Honest judgement, and it is a judgement: **as it stands, a first submission is
more likely than not to draw a 4.2 rejection, and the cost of that is a
resubmission, not a dead product.** With push shipped and good review notes I
would put it closer to even or better. Nobody can promise more.

### 4.4 Ranked mitigations for this app

| Rank | Change | Why | Effort |
| --- | --- | --- | --- |
| 1 | **Push, permission prompt and a delivered notification** | The most-named native capability, and visible to a reviewer in 30 seconds | 3 to 5 weeks, section 5 |
| 2 | **Review notes written for 4.2**, naming `src/lib/native/`, what the app does that a bookmark cannot, and that this is not template-generated (4.2.6) | Free, and fully in the founder's control | Half a day, founder |
| 3 | **A demo account** with money, bookings in both states and messages, credentials in the notes | A reviewer stuck at a sign-in wall sees a web page and nothing else | 1 day |
| 4 | **Pull to refresh** on main scroll surfaces | Named in both stores' wrapper guidance; absent today | 2 to 3 days |
| 5 | **Native share sheet** (`@capacitor/share`) on listing, stay, post, profile | Cheap, visible, fits a market where WhatsApp forwarding is the growth loop | 2 to 3 days |
| 6 | **Haptics** (`@capacitor/haptics`) on confirm, flip, payment success | Unmistakably native; the motion system already defines the moments | 1 to 2 days |
| 7 | **Biometric unlock for the wallet** | Strong 4.2 evidence, genuinely useful for a money product | 1 to 2 weeks |
| 8 | **Working universal links** (needs the Team ID, section 8) | Lets a reviewer open a shared link straight into the app, which a website cannot do | Founder value, then half a day |
| 9 | **Offline reading of saved items and recent listings** | Turns "requires a connection" into "degrades gracefully" | 2 to 3 weeks |
| 10 | Native camera capture (`@capacitor/camera`) | Replaces a file input with a real native flow | 1 week, adds a privacy question |

Items 1 to 6 are roughly **4 to 7 engineer-weeks** together and move this app
from arguable to defensible. That is the highest-return spend available.

### 4.5 Google Play, assessed separately

Play is materially more tolerant. Its equivalent is the Spam and Minimum
Functionality policy, and 2026 guidance describes rejecting "lazy wrappers": a
bare browser window, a back button that instantly closes the app, a blank white
page when the network drops. It explicitly accepts a Capacitor build wrapping
an HTTPS URL, and Trusted Web Activities over a valid PWA are Google's own
recommended route.

Vallo already has all three things Play looks for: a splash screen
(`splash.ts` plus the generated drawables), a back button that walks history
and exits only at the root (`back-button.ts`), and a designed offline screen
with a retry. Pull to refresh is the only item on the standard list missing.

**Assessment: Android approval is very likely on first submission.** The real
Android risks are mechanical, not policy: an unsigned or debuggable build, a
`versionCode` collision, R8 breaking something (never tested), and a carelessly
answered Data safety form. **Ship Android first.** It de-risks the programme,
proves the binary, and produces a store presence while iOS is worked on.

---

## 5. The push notification gap

### 5.1 What exists

`supabase/migrations/20260729112606_notifications.sql` creates
`public.notifications` (`id`, `user_id`, `kind`, `title`, `body`, `href`,
`read_at`, `created_at`), the seven-value `notification_kind` enum, two
indexes, and the single writer `private.notify(...)`, declared
`security definer` and followed by
`revoke execute ... from public, anon, authenticated`. Around it, **22 distinct
`private.notify_*` trigger functions** fan events out: `notify_booking_change`,
`notify_booking_refund`, `notify_inspection_change`, `notify_reservation`,
`notify_wallet_entry`, `notify_review`, `notify_review_response`,
`notify_report`, `notify_badge`, `notify_event_change`, `notify_event_insert`,
`notify_follow`, `notify_post_insert`, `notify_post_status`, `notify_reaction`,
`notify_repost`, `notify_social`, `notify_story_insert`, `notify_story_event`,
`notify_story_status`, `notify_story_comment_status`, `notify_bio_status`. The
table joins `supabase_realtime` so unread badges update live in an open
session.

**What does not exist:** no device token table, no
`@capacitor/push-notifications`, no `google-services.json`, no APNs key, no
permission request anywhere, no send path, no deep-link routing for a tap. The
only reference to push in the whole build is the dormant
`com.google.gms:google-services` classpath entry.

**So 22 trigger functions produce notifications that reach a device zero per
cent of the time.** That is the gap in one sentence.

### 5.2 What wiring it requires, end to end

1. **Apple Developer account** (founder). Enrol as VALLO SPACES LTD, which
   needs a D-U-N-S number from Dun and Bradstreet, free to request but slow if
   the company does not have one. 99 USD per year. Registering an App ID with
   the Push Notifications capability and generating an APNs key both require an
   active paid membership: there is no way to prototype iOS push without paying
   first.
2. **APNs key** (founder). Certificates, Identifiers and Profiles, enable Apple
   Push Notifications service, download the `.p8`, note the Key ID and the Team
   ID. That Team ID is the same value the AASA file is waiting for, so this step
   unblocks universal links too.
3. **Firebase and FCM** (founder plus build). `@capacitor/push-notifications`
   routes Android through FCM and the usual path routes iOS through FCM as
   well, meaning the `.p8` is uploaded to the Firebase console.
   `google-services.json` lands in `android/app/` and `GoogleService-Info.plist`
   in `ios/App/App/`; **both are secrets-adjacent, must be gitignored and
   injected in CI**, as `keystore.properties` is. The moment
   `google-services.json` exists the dormant Gradle plugin starts applying,
   changing the Android build graph for the first time on a project that has
   never compiled. Do this on a machine that can build, not blind.
4. **Xcode capabilities**: Push Notifications, and Background Modes with Remote
   notifications.
5. **A device token table** (build): roughly
   `device_tokens (id, user_id, token, platform, app_version, last_seen_at, created_at)`,
   unique on `token`, RLS so a user inserts and deletes only their own rows and
   never reads another's, service-role read for the sender. Tokens rotate, so
   the client re-registers every launch and the sender deletes tokens FCM
   reports unregistered.
6. **The send path** (build). Not from inside the trigger: an outbound HTTP call
   inside 22 triggers means a slow FCM response slows a booking insert. Use a
   queue. `private.notify` also inserts into a `push_outbox`; a worker drains
   it. The machinery exists: six `pg_cron` jobs are live and six cron route
   handlers under `src/app/api/cron/` share an established auth pattern. A
   seventh, `api/cron/push-drain`, grouping by user, respecting preferences and
   quiet hours, calling FCM with the service-role client and recording failures,
   reuses everything. `20260804134543_notification_preferences_are_honoured.sql`
   already exists, so preferences are a solved concept the sender must honour.
7. **Permission prompting at the right moment** (build). Not at launch: iOS
   gives one chance and a denial is close to permanent. The right moments here:
   after a first booking is confirmed ("we will tell you when the host
   replies"), after a first message is sent, and on the notification settings
   screen. A pre-prompt in the product's own voice, calling the OS prompt only
   on a yes, is the standard pattern and worth the extra screen.
8. **Deep linking the tap** (build). Every notification row already carries an
   `href`, which is most of the work. Then the two-side problem appears:
   `lib/side.constants.ts` forces the Stays shell for `/stay/` and
   `/restaurant/`, and the side cookie decides which shell the app is in. A tap
   on a stays notification while the app is in the Property side must set the
   cookie and land on the right shell without springing the flip animation as a
   surprise. Small, fiddly, only findable on a device.
9. **Store questionnaires.** Apple: a new App Privacy entry, since a device
   token is an identifier. Android 13+: declare `POST_NOTIFICATIONS` and handle
   the runtime prompt. Play Data safety gains an identifier entry. If a
   notification body ever carries message content, that is user content leaving
   to third-party push infrastructure and the form must say so; cleanest answer
   is generic bodies ("You have a new message") with content fetched in the app.
   `docs/MOBILE_READINESS.md` section 5 is the document that changes.

### 5.3 Effort

**Estimate.** Build: token table and RLS (3 days), client registration and
permission flow with pre-prompt (4), outbox and cron sender with preferences and
failure handling (5), tap routing including the two-side problem (3), settings
UI (2), tests (3), device debugging on both platforms (5). **Roughly 25 working
days, call it 3 to 5 engineer-weeks**, of which a meaningful share cannot start
until the founder's accounts exist. Founder: Apple enrolment (days to weeks,
D-U-N-S dependent), APNs key, Firebase project, Xcode capabilities (an hour
each).

### 5.4 Is it the highest-value native addition?

**Yes, and it is not close.** On retention: this is a two-side marketplace, and
a host who does not learn about a booking request for six hours loses the
booking, while a guest who does not learn a host replied does not come back.
All 22 trigger functions are currently messages written and never delivered.
The product already believes notifications matter; it just cannot send them. On
guideline 4.2: push is the capability reviewers name most often and it is
demonstrable inside a review session rather than argued in notes. And it is the
only item that is simultaneously the best retention feature, the best 4.2
mitigation and a prerequisite for nothing else; every other item in 4.4 is
smaller on all three axes.

One caveat: iOS push cannot start until the founder enrols. Android push can
start immediately on a free Firebase project, another reason to ship Android
first.

---

## 6. If React Native later, the right shape

Assessed: a separate repository sharing one database, against a second
workspace package inside the existing monorepo (`apps/web` as `@vallo/web`,
plus `packages/design-tokens` and `packages/i18n`, per the root
`workspaces: ["apps/*", "packages/*"]`).

### 6.1 The comparison

| Concern | Separate repository | `apps/native` in this monorepo |
| --- | --- | --- |
| **Type sharing** | Needs a published package or a submodule; every shared type change is a version bump and two PRs | `import type { Database }` resolves through the workspace. No ceremony |
| **Generated Supabase types** | `database.types.ts` is 5,697 lines regenerated from migrations. In two repos it drifts silently, and drift between a mobile client and the schema is a production incident, not a lint error | One file, one generator, one CI check |
| **Design tokens** | Needs a JS export added in either case, plus publishing in a split | Add a generated `tokens.ts` beside `tokens.css`; both apps consume it and `scripts/check-css-tokens.mjs` can be extended to gate both |
| **i18n** | 14,072 lines of plain TypeScript with no web dependency. Splitting means publishing and versioning 14,000 lines of translations, and a key added on web is missing on native until someone releases | Already works today |
| **Validation schemas** | Schemas live beside actions across 69 files; sharing means extracting to a published package first | Extract to `packages/schemas` once, both apps import. Same refactor, one repo, one PR |
| **CI** | Two pipelines. `.github/workflows/ci.yml` runs typecheck, lint, test and build from the root so workspaces resolve; a split loses that. Cross-repo breakage is found after merge | One pipeline. A schema change that breaks native fails the same PR that made it |
| **Versioning** | `scripts/sync-native-versions.mjs` derives every native version from `apps/web/package.json`; a split breaks that single source of truth outright | Unchanged |
| **Solo founder, temporary team** | Two checkouts, two dependency trees, two onboarding paths, two places a contractor can strand work | One clone, one `npm install` |
| **The one real advantage of a split** | A contractor can be given the native repo without seeing service-role code, the wallet ledger or admin | Not available; the monorepo is all-or-nothing on read access |

### 6.2 Recommendation

**A second workspace package, `apps/native`, in this repository. Not a separate
repository.**

The only argument for a split is contractor access control, and there are
cheaper answers than permanently paying a coordination tax: a scoped brief,
code review, and the fact that the sensitive paths are 15 files that can be
pointed at explicitly. Against it stands type drift, which for a mobile client
against a 170-table schema is the failure mode that actually bites, and the
loss of a version pipeline that already works.

The "shared database" framing is worth unpicking too. The database is shared
either way, because Supabase is hosted and both clients point at the same
project. Sharing a database is not the design decision. Sharing *types,
schemas, tokens, translations and CI* is, and a monorepo gives all five free.

### 6.3 Migration sequence, if ever taken

Nothing here starts before the Capacitor app is live on both stores and
earning. Each step is useful on its own, which is the point: none is a bet.

1. The Capacitor app shipped on Play and the App Store, with push working and
   at least one release cycle behind it. Without this there is no fallback.
2. `packages/types`: `database.types.ts` moved out of `apps/web/src/lib/supabase/`
   with the generator and a CI drift check. Useful immediately. Half a week.
3. `packages/schemas`: Zod schemas extracted from the 69 action files. A tidy-up
   the web app benefits from. 2 to 3 weeks.
4. `packages/design-tokens` gains a generated `tokens.ts` alongside
   `tokens.css`, both emitted from one source, with the token lint extended.
   Useful immediately. 1 week.
5. The narrow API from 2.5, versioned under `/api/v1/` with bearer-token
   sessions. **Build it for the Capacitor app first**, and have it in production
   carrying real traffic before any native client depends on it. 6 to 9 weeks.
6. Only then `apps/native`, an Expo app consuming `@vallo/types`,
   `@vallo/schemas`, `@vallo/design-tokens` and `@vallo/i18n`, one surface at a
   time. Start with the Stays side or the social feed: read-heavy, visually
   simpler than the wallet, and shippable as a partial native experience while
   the Capacitor shell still serves everything else. Do not start with the
   wallet or checkout, where being wrong is expensive.

**The decision point:** if after steps 2 to 5 the Capacitor app passes review,
retains users and generates no platform complaints, step 6 may never be worth
doing, and that is a good outcome rather than a sunk cost. Steps 2 to 5 are
things this codebase should have anyway.

---

## 7. The honest recommendation and a dated plan

### 7.1 The constraints

Launch before 10 October 2026, **18 days from today**. About 2,200 USD. A small
temporary team. No macOS, no Xcode, and `dl.google.com` blocked so no Android
SDK either. No device testing has ever happened. A design sweep is mid-flight
(`docs/BUILD_06_LEDGER.md`, opened 18 September).

Two hard facts follow from the arithmetic:

- **A React Native rewrite cannot happen.** 82 to 124 engineer-weeks against 18
  days and 2,200 dollars is not a trade-off, it is a category error.
- **Both stores probably cannot happen by 10 October either.** Apple enrolment
  as an organisation needs a D-U-N-S number and Apple's own verification, which
  routinely takes one to four weeks and is outside anybody's control. Read the
  10 October date as *web product live, Android app submitted*, with iOS
  following.

### 7.2 The recommended path

**Phase 0, now to 29 September: unblock the founder's dependencies.** Apple
enrolment started as VALLO SPACES LTD (D-U-N-S first). Play Console registered.
A Mac decided: a borrowed machine, MacStadium or MacinCloud at roughly 25 to 80
USD a month, or Codemagic's free macOS tier, which is cheapest and already
anticipated by `scripts/sync-native-versions.mjs`. Production domain confirmed
and `CAPACITOR_SERVER_URL` set in CI. Two Android test devices sourced, ideally
one low-end and one on Android 10 or 11 for the location path. Cost roughly 130
to 200 USD. Risk: Apple verification is the long pole and nobody controls it.
**Decision point:** if Apple enrolment has not completed by 6 October, iOS moves
to November and Android ships alone. That is fine.

**Phase 1, 23 September to 3 October: prove the Android build.** A machine with
Android Studio runs `docs/MOBILE.md` section 3 for the first time ever.
`assembleRelease` with the upload keystore. Confirm R8 does not break the shell.
Install on real hardware and work the device checklist in
`MOBILE_READINESS.md` section 6: notched phone both themes, airplane mode cold
and warm, the location prompt, a Paystack payment, a wallet top-up. Fix the six
safe-area gaps already listed in `MOBILE_READINESS.md` section 2 (side drawer
head, `ReportSheet`, `MobileMenu`, `AccountSection`, `CalendarEditor`,
`StoryViewer`). Cost: 1 to 1.5 engineer-weeks. **This is where the
unknown-unknowns live**, because no Gradle build has ever run; budget for it
going badly. **Decision point:** if the Android build cannot be made to work in
a week, the mobile programme pauses and the web PWA carries launch. The web app
is already a complete installable PWA and that is a real fallback, not a
face-saving one.

**Phase 2, 29 September to 12 October: Android push, and submit.** Firebase
project, `google-services.json`, device token table and RLS, client
registration, permission pre-prompt, outbox plus `api/cron/push-drain`, tap
routing including the two-side problem. Pull to refresh and the native share
sheet ride along if there is room. Store screenshots from the shipped build.
Data safety and age rating from `MOBILE_READINESS.md` section 5, updated for
the device token. Submit. Cost: 3 to 4 engineer-weeks, no new money. Risk: Play
review is usually days, slower for a first submission from a new account.

**Phase 3, once Apple enrolment completes: close iOS, then submit.** Team ID
into `apple-app-site-association`; both SHA-256 fingerprints into
`assetlinks.json`; Associated Domains on the App ID, then the three steps
written inside `App.entitlements`. Verify against
`https://app-site-association.cdn-apple.com/a/v1/vallospaces.com`, allowing a
day for Apple's CDN. Confirm Sign in with Google now completes. APNs key, iOS
push. Archive from Xcode or Codemagic. Write the 4.2 review notes and provision
the demo account. Haptics if there is time. Submit. Cost: 2 to 3
engineer-weeks plus Mac access. **Plan for one 4.2 rejection.** The response is
a new build carrying one or two more items from 4.4 plus rewritten notes, not
an appeal. **Decision point:** after a second 4.2 rejection, stop and re-plan.
Two rejections means a reviewer sees something the arguments do not address,
and at that point the Expo question genuinely reopens with evidence behind it
rather than anxiety.

**Phase 4, after launch: optionality, not the rewrite.** Steps 2 to 5 of
section 6.3, in order, as money allows. Each is useful to the web app alone.
Revisit React Native no earlier than Q1 2027, and only with a funded team.

### 7.3 Cost of each path

**Estimates.** Contract rates assumed at 2,000 to 5,000 USD per engineer-month,
the realistic Nigerian and remote-contractor band; a Western agency is 4 to 8
times that.

| Path | Engineer-weeks | Cash at contract rates | Calendar | Fits the brief? |
| --- | --- | --- | --- | --- |
| Capacitor as-is, both stores | 3 to 5 | 130 to 200 USD accounts | 3 to 6 weeks | Yes |
| Capacitor plus push and the 4.2 pack (items 1 to 6) | 7 to 12 | accounts, plus 3,500 to 15,000 USD if contracted | 5 to 9 weeks | Only if the existing team does it |
| Narrow HTTP API only, no native client | 6 to 9 | 3,000 to 11,000 USD | 2 to 3 months | No |
| React Native, reduced-scope v1 | 82 to 124 | 41,000 to 155,000 USD | 7 to 28 months | No |
| React Native at full parity | 95 to 145 | 47,000 to 181,000 USD | 8 to 33 months | No |

The 2,200 dollars covers the store accounts, a cloud Mac for a few months, two
test devices, and nothing else. Every engineer-week above assumes the founder
or the existing temporary team supplies the labour.

### 7.4 What the founder personally must do

Section 8 is the full checklist. The items that are his alone, and that nobody
else can start:

- **Apple Developer enrolment as VALLO SPACES LTD**, using the company
  registration, never as an individual, D-U-N-S number first (free, allow up to
  two weeks), 99 USD/year. Moving an app from a personal to a company account
  afterwards needs both parties and an Apple support case.
- **Google Play Console registration**, 25 USD once, also as the organisation.
- **A Mac or cloud Mac access.** Codemagic's free macOS minutes are cheapest and
  the version script already anticipates it (`$PROJECT_BUILD_NUMBER`).
- **Two Android test devices**, one low-end, ideally one on Android 10 or 11.
- **The Android upload keystore**, backed up somewhere that is not the build
  laptop. It cannot be rotated after first release without Google's
  intervention.
- **The three values the tree waits for:** Apple Team ID, Play app-signing
  SHA-256, upload-key SHA-256.
- **Store assets**, including a 1024px or vector master of the house-and-R mark
  alone (today's only master is a 910x857 lockup whose mark is 511x598, so the
  App Store icon enlarges about 1.5x).
- **The 4.2 review notes and the demo account.**
- **The privacy questionnaires, answered personally.** They are a legal
  statement about the company, not an engineering artefact.

---

## 8. What is missing for store submission

From `docs/MOBILE.md` section 5, `docs/MOBILE_READINESS.md` section 6, and my
own reading. **F** = founder task, **B** = build task.

**Accounts and money**
- [ ] F. Apple Developer Program, organisation, D-U-N-S first. 99 USD/year.
- [ ] F. Google Play Console, organisation. 25 USD once.
- [ ] F. CI account (Codemagic or equivalent), or a Mac plus an Android Studio machine.

**Origin and identity**
- [ ] F. Production domain confirmed and live.
- [ ] F/B. `CAPACITOR_SERVER_URL` exported in every shell and CI job that runs `npx cap sync`. Unset, the binary ships the offline card.
- [ ] F. `com.vallospaces.app` reserved on both stores. `apps/web/src/lib/brand-domain.test.ts` already fails if the seven places carrying it disagree.

**Signing**
- [ ] F. Android upload keystore created; `android/keystore.properties` written (both gitignored). Absent today, confirmed.
- [ ] F. Keystore backed up off the build machine.
- [ ] F. iOS distribution certificate and provisioning profiles.
- [ ] B. Confirm `assembleRelease` signs once the keystore exists. Never run.

**Deep link association, with the required values**
- [ ] F. `assetlinks.json`: replace **both** placeholders. The Play app-signing SHA-256 (Play Console, the app, Release, Setup, App signing) **and** the upload-key SHA-256 (`keytool -list -v -keystore upload-keystore.jks -alias upload`). Omitting either costs a day.
- [ ] F. `apple-app-site-association`: replace `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID` with the ten-character Team ID. The entry must read `<TeamID>.com.vallospaces.app`.
- [ ] F. Associated Domains capability on the App ID, then the three steps inside `ios/App/App/App.entitlements`.
- [ ] B. Verify against `https://app-site-association.cdn-apple.com/a/v1/vallospaces.com` and `adb shell pm get-app-links com.vallospaces.app`.

**The build**
- [ ] B. First-ever `./gradlew assembleRelease`; confirm the R8-minified bundle opens.
- [ ] B. First-ever Xcode open of the hand-edited `project.pbxproj`; archive.
- [ ] B. `node scripts/build-native-icons.mjs`, then `npx @capacitor/assets generate` with the four `#010118` flags, **then delete `apps/web/icons/` and `apps/web/public/manifest.webmanifest`**, which that command writes and this project must not serve.
- [ ] B. `npm run sync:versions` with `VALLO_BUILD` set; `-- --check` in CI.
- [ ] B. Consider removing the dormant `com.google.gms:google-services` classpath entry once somebody can build.

**Device testing, none of which has happened**
- [ ] B. Android 10 or 11 handset: the location prompt and the coarse-only rescue path.
- [ ] B. Notched phone, both themes: the six safe-area gaps in `MOBILE_READINESS.md` section 2.
- [ ] B. Airplane mode, cold start and warm session.
- [ ] B. Sign in with Google on both platforms, once the association files verify.
- [ ] B. A Paystack card payment and a wallet top-up returning to the app.

**Store listings**
- [ ] F/B. Screenshots at every required device class from the shipped build. Today only PWA install-card shots exist at 390x844 at 2x, which is not a store device size.
- [ ] F. Apple App Privacy questionnaire from `MOBILE_READINESS.md` section 5, **plus a device-token entry once push ships**.
- [ ] F. Play Data safety questionnaire, same source, same addition.
- [ ] F. Age rating on both stores. The social layer matters: user-generated posts, stories and comments raise the rating and require the reporting and blocking answers. `reports`, `blocks` and `mutes` tables all exist, so the answers are true.
- [ ] F. Review notes for Apple addressing 4.2: name `src/lib/native/`, list what the app does that a bookmark cannot, state this is not template-generated (4.2.6).
- [ ] B/F. A demo account with money, bookings in both states and messages, credentials in the notes.
- [ ] F. Privacy policy URL `/privacy` on the production origin; support URL and contact.

**Account deletion, verified present in this pass**
- [x] B. `apps/web/src/lib/account-deletion/` holds 20 files including
      `actions.ts` (6 exported actions), `preconditions.ts`, `plan.ts`,
      `purge.ts`, `restore-code.ts`, `reauthenticate.ts`, `storage.ts`,
      `emails.ts` and five test files. The RPCs `purge_account_rows`,
      `due_account_purges`, `finish_account_purge` and `fail_account_purge`
      exist in the migrations and `api/cron/account-purge/route.ts` drains them.
      A 30-day grace window with a restore code, rate limiting and an audit
      trail.
- [x] B. **A web-reachable deletion page exists** at
      `apps/web/src/app/(site)/delete-account/page.tsx` with a `RestoreForm`.
      This is the URL Play requires in the Data safety declaration.
- [ ] F. Enter that URL in Play Console and App Store Connect. Apple
      additionally requires deletion to be reachable *from inside the app*;
      confirm the settings route surfaces it on a device.

**Export compliance and miscellany**
- [x] B. `ITSAppUsesNonExemptEncryption` is already `<false/>` in
      `ios/App/App/Info.plist`, pre-answering export compliance at upload.
      Verified.
- [ ] F. Confirm that answer stays correct if cryptography beyond standard https
      is ever added.
- [ ] B. `POST_NOTIFICATIONS` in the Android manifest when push ships. Absent today.
- [ ] F. A 1024px or vector master of the house-and-R mark alone.
- [ ] F. A transparent re-render of the glass tile for the Android adaptive foreground.
- [ ] F. Decide on crash reporting. Without it nobody will know why a release
      fails in the field; with it, the privacy questionnaires change. A real
      decision that belongs in the questionnaire the day it is made.

---

## 9. Honesty log

**Measured, reproducible today.** Every count in sections 0, 1, 2.1, 2.2, 3.1
and 5.1 came from a command run against the tree on 22 September 2026, quoted
or obvious from the text: file and line counts, action counts, selector counts,
table counts, policy counts, trigger counts, dependency versions.

**Estimated, not measured.** Every figure in sections 2.5, 3.3, 4.4, 5.3, 6.3
and 7.3. They come from measured surface area plus a judgement about pace, and
assume an engineer fluent in this codebase working at the project's existing
quality bar. A different team could land anywhere in a two-fold band either
side. The per-screen day rate (2 to 3 days) and the per-endpoint hour rate (1.5
to 2.5 hours) move the totals most; both are stated explicitly so they can be
argued with. **Contract rates in 7.3 are a judgement about the market, not a
quote.**

**Web sources.**
- `https://developer.apple.com/app-store/review/guidelines/` fetched
  successfully on 22 September 2026. The 4.2 text in section 4.1 is verbatim
  from that fetch. **The page as returned did not expose a "last updated"
  date**, so I cannot date the guideline revision.
- Search results on 4.2 outcomes and Play policy came predominantly from vendor
  marketing pages (MobiLoud, AscAuto, Code2Native, Median, Tapbound, Nativine,
  Webvify, Testers Community, SaaSto). **Every one of them sells a web-to-app
  product.** Their description of what gets rejected is consistent and matches
  Apple's own text, so I have used the direction. I have used none of their
  numbers as fact.
- The claim that "4.2 appeals fail about 85 per cent of the time" appears in
  vendor content only. **I could not verify it against any Apple source and it
  should not be relied on.** Flagged as folklore in 4.2.
- Apple organisation enrolment requiring a D-U-N-S number, and the 99 USD annual
  fee, are consistent across Apple's own enrolment help page and multiple
  secondary sources as of mid-2026.
- Play Console's 25 USD one-off fee is carried from `docs/MOBILE.md`; not
  independently re-verified.
- **No host was blocked during this research.** `developer.apple.com` was
  reached directly. The `dl.google.com` block reported in `docs/MOBILE.md`
  section 6 is carried from that document and was not re-tested, because
  nothing in this read-only pass needed to fetch it.

**Could not be established from inside this repository.**
- Whether the Android project compiles, whether R8 breaks anything, whether the
  hand-edited `project.pbxproj` opens in Xcode.
- What any of `src/lib/native/` does on a handset. The code reads correctly;
  that is a different claim.
- Whether Apple will reject this app. The judgement in 4.3 is worth what such
  judgements are worth.
- Whether the six safe-area gaps in `MOBILE_READINESS.md` section 2 have been
  fixed since 18 September. Not re-audited; the design sweep is mid-flight.
- Whether `pg_cron` jobs currently run correctly in production. I read the
  migrations, not the live scheduler, and did not touch the database.
- Real Nigerian device and network conditions, the variable that most decides
  whether a remote-origin shell feels acceptable. The 4-second splash failsafe
  in `splash.ts` is where it will show first.

---

*This document changed nothing in the tree. Every other file is exactly as it
was found.*
