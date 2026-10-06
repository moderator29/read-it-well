# Vallo native release audit

28 September 2026. Branch `claude/native-release-audit-pk17jh`, from `main` at
`1115298` (Tracks A to M merged).

This is the native (Capacitor iOS and Android) release audit. It re-verified
`docs/MOBILE.md` and `docs/MOBILE_READINESS.md` (last rewritten 18 September)
against the tree, fixed what could be fixed in the repository, and states
plainly what could not be verified.

Companion files:

- [`VALLO_IOS_RELEASE_CHECKLIST.md`](VALLO_IOS_RELEASE_CHECKLIST.md)
- [`VALLO_ANDROID_RELEASE_CHECKLIST.md`](VALLO_ANDROID_RELEASE_CHECKLIST.md)
- [`VALLO_NATIVE_TEST_MATRIX.md`](VALLO_NATIVE_TEST_MATRIX.md)

- [`NATIVE_CI.md`](NATIVE_CI.md): the GitHub Actions builds (Android debug APK and unsigned iOS compile run on every relevant push; the signed iOS archive waits on four secrets)
- [`store/FOUNDER_CHECKLIST.md`](store/FOUNDER_CHECKLIST.md): the same next actions in plain English, for the founder

Still authoritative and not repeated here: `store/FOUNDER_STEPS.md` (console
click paths), `store/PRIVACY_LABELS.md` (App Privacy and Data safety answers),
`store/LISTING_COPY.md`, `STORE_SUBMISSION_NOTES.md` (reviewer account).

> **CORRECTION, 6 October 2026 (directive D41, "Measure, never quote").** This
> audit was written on 28 September and several of its Apple-side statements
> have since become false, in the direction of overstating how blocked iOS is.
> Each was re-measured against the repository on 6 October, and the corrections
> below are marked (D41) with the file and line they rest on:
>
> - **The Apple Team ID is real and committed**: `X74KD52994.com.vallospaces.app`
>   at `apps/web/public/.well-known/apple-app-site-association:6`, and
>   `DevelopmentTeam = X74KD52994;` at `apps/web/ios/App/App.xcodeproj/project.pbxproj:117`.
> - **The entitlements file is adopted**: `CODE_SIGN_ENTITLEMENTS = App/App.entitlements`
>   at `project.pbxproj:305` (Debug) and `:328` (Release).
> - **A signed App Store archive ran and succeeded on 3 October 2026**: GitHub
>   Actions run 37103086939, jobs `iOS compile (unsigned, simulator)` and
>   `iOS signed archive (App Store)` both conclusion `success`, all four Apple
>   secrets present. `Keep the IPA` was skipped and is gated on
>   `success() && !inputs.upload` (`.github/workflows/native-ios.yml:272`), so the
>   export ran with `destination=upload` (`:247` to `:248`): the IPA went to App
>   Store Connect. Whether it is visible to TestFlight testers is UNKNOWN from the
>   repository.
> - **The iOS association file passes its own checker**:
>   `cd apps/web && node scripts/check-deep-links.mjs --platform=ios` exits 0 and
>   prints "the iOS association file is real".
> - **Store screenshots exist**: `docs/store/screenshots/app-store/` holds 35 PNGs
>   at 1320 x 2868; `docs/store/screenshots/google-play/` holds 35 PNGs at
>   1440 x 2560 plus `feature-graphic.png` at 1024 x 500; four overview JPEGs sit
>   beside them (handbook: `store/APP_STORE_SCREENSHOTS_HANDBOOK.md`). They were
>   composed on 30 September, not from a shipped device build, which is the
>   remaining gap.
> - **Android is the genuinely blocked platform**: both fingerprints in
>   `assetlinks.json` are still `PLACEHOLDER_...` and `google-services.json`
>   `current_key` (line 18) is still `PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE`.
> - **Still true, and stated as a number**: nothing has been tested on a physical
>   device, ever. 0 of 34 matrix rows are run, 0 of 10 P0 (D43).

> **UPDATE, 30 September 2026 (C15).** This file said below that no Android
> or iOS build had ever run. That stopped being true on 29 September: GitHub
> Actions compiles both on every relevant push. `native-android.yml` has 33
> runs and every recent one succeeds (first APK: run 36500914409; latest:
> run 36572375537, 29 September, success); `native-ios.yml` has 20 runs, the
> unsigned simulator compile succeeding (latest: run 36572375519, success).
> The rows below that say "no build has ever run" are corrected in place and
> marked (C15). What is STILL true: nobody has run the app on a physical
> device. Section 8 is the script for the founder's first handset session.
> Also new on 30 September: F-14 and F-15 are fixed (section 3), the iOS app
> target carries a privacy manifest, and an Android emulator smoke job runs
> after every debug build (screenshots under the run's Artifacts).

**What the 28 September session could and could not run (historical; see the
6 October correction above for the iOS build and signing).** The container has no macOS and
no Xcode, and its network policy blocks `dl.google.com` (re-confirmed: HTTP 000),
so the Android SDK and the Android Gradle Plugin cannot be fetched. **(D41: "No iOS build and no Android build has ever run" was already
superseded by C15 and is false: both compile on CI, and a signed iOS archive was
exported to App Store Connect on 3 October.) No physical device has ever run the
app: 0 of 34 test rows, 0 of 10 P0.** Everything below marked VERIFIED was
verified by a static check, a unit test, a production web build or a read of
the live database, and says which.

---

## 1. Architecture map (verified against the tree)

| Item | Value | Where |
| --- | --- | --- |
| Architecture | Remote-origin Capacitor shell: the binary loads the live Next.js origin over https; `webDir` is a packaged offline card, not the app | `apps/web/capacitor.config.ts` |
| App ID / bundle ID | `com.vallospaces.app` (seven places, held equal by `brand-domain.test.ts`) | config, `android/app/build.gradle`, `project.pbxproj` |
| Production origin | `https://www.vallospaces.com` (canonical; the apex 308s to it) | `CAPACITOR_SERVER_URL` at sync; `native-shell/shell-config.js` |
| Start path | `/open` (server sends signed-in to `/home`, others to `/welcome`) | `native-shell/start-path.json` |
| Offline fallback | `server.errorPath: index.html` loads the packaged card on a failed main-frame load | `native-shell/index.html`, `shell.js` |
| Shell marker | User agent suffix `VALLO-NATIVE`; `data-shell="native"` on `<html>` | config, `lib/native/boot.ts` |
| Capacitor | core, cli, android, ios 8.5.0 | `apps/web/package.json` |
| Plugins (9, all used) | app 8.1.1, browser 8.0.4, camera 8.2.4, haptics 8.0.2, keyboard 8.0.5, push-notifications 8.1.2, share 8.0.2, splash-screen 8.0.2, status-bar 8.0.3 | `cap sync` output, 28 Sep |
| Next.js / React / Node | Next ^16.3.6, React ^19.2.0, Node >=20.9 (22.22 here) | `package.json` files |
| iOS | Deployment target 15.0; iPhone only (`TARGETED_DEVICE_FAMILY = 1`); Swift Package Manager (no CocoaPods); automatic signing with team `X74KD52994` (D41: this row said "no team set"; `project.pbxproj:117`); UIScene lifecycle (Capacitor 8 template) | `ios/App/App.xcodeproj/project.pbxproj`, `CapApp-SPM/Package.swift` |
| Android | minSdk 24, compileSdk 36, targetSdk 36; AGP 8.13.0; Gradle 8.14.3; google-services 4.4.4; Java `MainActivity` (no Kotlin); R8 on, resource shrinking off (splash looked up by name) | `android/variables.gradle`, `build.gradle` |
| Versions | 0.1.0 / build 100000 on both, written by `npm run sync:versions` from `apps/web/package.json`; `--check` reports in sync | `scripts/sync-native-versions.mjs` |
| Runtime modules | `boot` (single entry, two native guards), `splash`, `status-bar`, `keyboard`, `back-button`, `external-links`, `share-bridge` (new), `push-taps`, `deep-links`, `device` (share, haptics, camera), `shell`, `widget` | `apps/web/src/lib/native/` |
| Auth | Supabase email + password with HTTP-only cookies in the web view's jar. Google is hidden in the shell by the server (`providers.ts`); Apple is coded but its plugin is absent (section 4, F-10) | `lib/auth/` |
| Push | Tokens table + queue + pg_cron drain every 5 min + hand-written FCM v1, APNs and Web Push transports; permission asked in context only | `lib/push/`, `components/app/push/` |
| Payments | Paystack inline popup (iframe) with server-side verification by HMAC-verified webhook, `verifyTransaction` and hourly reconcile; idempotent checkout | `components/app/payments/`, `lib/payments/` |

Each native module was classified: splash, status bar, keyboard, back button,
external links, deep links (code), push taps, device: **production-ready code,
unverified on a device**. Push enrolment: **partial** (fixed a listener leak;
token refresh on launch absent). Apple sign-in: **placeholder in practice**
(plugin cannot be installed on Capacitor 8 yet). Offline shell: **broken on
the airplane-mode path until this session** (F-03).

---

## 2. What this session fixed (all pushed, each with a test that fails on the old tree where a test was possible)

| # | Pri | Finding | Fix | Evidence |
| --- | --- | --- | --- | --- |
| F-01 | P0 | `ios/App/App/AppDelegate.swift` posted `Notification.Name.capacitorDidReceiveNotificationResponse`, which Capacitor 8.5 does not define: **the first Xcode build would not have compiled** | Removed the `UNUserNotificationCenterDelegate` extension and the delegate claim. It was also dead code: `CapacitorBridge` installs its `NotificationRouter` as the delegate after launch, and the push plugin already applies `presentationOptions` and raises the tap event | `native-projects.test.ts` checks every `capacitor*` name against the installed `CAPNotifications.swift` |
| F-02 | P0 | FCM's three default `<meta-data>` entries (channel `vallo_default`, silhouette icon, colour) were nested **inside the FileProvider's `<provider>`**, where Firebase never reads them | Moved to `<application>` | `native-projects.test.ts` |
| F-03 | P0 | `launchAutoHide: false` leaves hiding the splash to the live web app. When the origin is unreachable (App Review's airplane-mode cold start) the packaged offline card loaded **under a splash nothing would ever hide** | `native-shell/shell.js` calls the injected bridge's `nativePromise("SplashScreen","hide")` in every state | `offline-shell.test.ts` (2 new tests fail on old shell) |
| F-04 | P1 | Sign-out never retired the device's push token: a signed-out or handed-on phone kept receiving the account's notifications | `signOut(deviceRef)` retires this device's row, `signOutEverywhere` retires all, both before the session ends, best effort, owner-filtered | `sign-out-scope.test.ts`, `devices.test.ts` |
| F-05 | P1 | Scheduling account deletion left push live for the 30-day grace window (drain only skips revoked rows) | `startDeletion` retires every token | code review; `revokeTokens` covered by tests |
| F-06 | P1 | Apex `vallospaces.com` 308s `/.well-known/*` to www; App Links and AASA never follow redirects, and on Android 11 and below one failing host un-verifies **every** host | Manifest and entitlements claim `www.vallospaces.com` only; the way back is written in the manifest | `brand-domain.test.ts`; live `curl` |
| F-07 | P2 | `deep-links.ts` dropped any link whose origin was not exactly the web view's | Accepts either brand host over https, refuses look-alikes | `deep-links.test.ts` |
| F-08 | P2 | Android System WebView has no `navigator.share`: seven share controls copied a link instead of opening the share sheet | `share-bridge.ts` supplies `navigator.share` from the Share plugin, only in the shell, only where missing, with the Web Share contract | `share-bridge.test.ts` |
| F-09 | P2 | Safe areas: of the six open rows from 18 Sep, four were still open (report sheet, site mobile menu, delete-account sheet, calendar save card); the sweep found three more (agent drawer, assistant drawer, choice picker head) plus foot-less rows sheets | `calc(token + env(safe-area-inset-*))` on each element's own padding | production `next build` emits every utility |
| F-11 | P2 | `enrol.ts` added a `registration`/`registrationError` listener pair on every attempt and never removed it | Handles removed when the attempt settles | `enrol.test.ts` passes |
| F-12 | P2 | `allowBackup="false"` does not stop Android 12+ device-to-device transfer at target 31+, so the session cookie jar could move to a new phone | `dataExtractionRules` excludes every domain from cloud backup and device transfer | `native-projects.test.ts` |
| F-13 | P3 | Documentation drift: "Wallet" shortcut, "push not wired", 5 plugins, "no Firebase", "no `capture` attribute", Apple plugin "is added", wallet return paths, callback "route handler" | Corrected in `MOBILE_READINESS.md`, `MOBILE.md`, `store/FOUNDER_STEPS.md`, the manifest and `deep-links.ts` | this commit series |

## 3. Found and deliberately NOT changed

| # | Pri | Finding | Why not, and what is needed |
| --- | --- | --- | --- |
| F-10 | P2 | **Sign in with Apple cannot ship on iOS today.** The code (`NativeAppleSignIn.tsx`) needs the `SignInWithApple` plugin, which is not installed. The only release, `@capacitor-community/apple-sign-in` 7.1.0, pins `capacitor-swift-pm from: "7.0.0"` (i.e. `< 8.0.0`) in its `Package.swift`; the app pins `8.5.0`, so adding it would break iOS package resolution | Not a submission blocker: the shell offers no third-party login, so guideline 4.8 does not require Apple. Wait for a Capacitor 8 release. Also still owed: provider sign-ups record no terms acceptance or 18+ statement (`FOUNDER_STEPS.md` section 1) |
| F-14 | P2 | Native push tokens are only registered when the person taps Yes; nothing re-registers at launch, so a rotated FCM/APNs token goes stale until the provider says "gone" | **FIXED 30 September (C15).** At launch the shell reads the permission with `checkPermissions` (never prompts) and, for a device enrolled before on this install whose permission is still granted, re-registers silently (`refreshNativeRegistration` in `components/app/push/enrol.ts`, called from `lib/native/boot.ts`; `enrol-native.test.ts`). Still to watch on a device: the token row's `last_seen` moves on relaunch |
| F-15 | P2 | `currentPermission()` always answers `default` in the shell, so the Vallo explainer can be offered again to someone who already granted; the moments cooldown limits it | **FIXED 30 September (C15)** with F-14: the launch read is remembered and `currentPermission()` answers it |
| F-16 | P2 | Paystack's inline popup runs in an iframe inside the web view. Whether a bank's 3-D Secure page stays inside it on iOS and Android is **unverified** (`PaystackCheckout.tsx` says so itself); the hosted-page fallback opens the system browser tab | Test on a device with a real card in Paystack **test** mode. Never against live keys |
| F-17 | P3 | HEIC is allowed by the listing schema, but Android WebView cannot decode it for the canvas re-encode, so such a photo is refused client-side. iOS converts to JPEG for file inputs | Low incidence on Android pickers; revisit if reports appear |
| F-18 | P3 | No upload progress or resumable retry on any upload | Product work, out of native scope |
| F-19 | P3 | `FacilitiesStep.tsx` asks for a position with no timeout (MapCanvas has 11 s) | Small follow-up |
| F-20 | P3 | The Agreements PWA shortcut still uses `shortcut-wallet.png` art | Needs new art, not code |
| F-21 | P3 | `res/xml/file_paths.xml` exposes `external-path "."` to the non-exported FileProvider (Capacitor template default, used by the camera flow) | Per-URI grants only; narrow when a build can prove the camera flow still works |

## 4. Area-by-area status

**Capacitor configuration.** Resolved config shipped in the binary (read from
`ios/App/App/capacitor.config.json` after `cap sync`): https origin,
`cleartext: false`, `androidScheme: https`, `errorPath` to the packaged card,
`webContentsDebuggingEnabled: false` on Android, iOS inspectability off by
Capacitor default in release. No localhost can ship: `write-shell-config.mjs`
refuses a non-https origin and `cap:sync` refuses placeholder association files.
Android 15+ edge-to-edge is handled by Capacitor 8's `SystemBars`
(`insetsHandling: "css"` default): with `viewport-fit=cover` (set in
`app/layout.tsx`) and a modern WebView the real insets reach `env()`,
otherwise the WebView's parent is padded. Verified by reading the bridge source.

**Environment separation.** One production origin; dev builds use
`cap:sync:dev`, which warns instead of refusing on placeholders. Server
secrets (APNs, FCM service account, Paystack secret) live only in Vercel;
nothing secret is in the repository. `google-services.json` is committed with a
placeholder key; the Android key is not a secret, and the release build refuses
it until replaced.

**Authentication.** Email + password only inside the shell (Google hidden by
the server on the shell user agent, and `startOAuth` refuses it off the web).
Session is HTTP-only Supabase cookies in the web view's own jar, so it survives
backgrounding and relaunch; it is excluded from backup and device transfer
(F-12). Email confirmation and password reset return to `/auth/callback`,
which is claimed by both association files so the exchange runs in the web
view that holds the PKCE verifier, **once the association files verify**.
Until then the link opens in the browser and the person signs in there
instead. Account deletion: `/settings` entry, re-authentication, 30-day grace
with ban, sessions ended, now push retired (F-05), purge anonymises; public
instructions at `/delete-account`. Session behaviour across restart, resume and
expiry is **unverified on a device**.

**Deep links.** Paths claimed: `/listing/`, `/stay/`, `/stays/`,
`/restaurant/`, `/restaurants/`, `/around/`, `/u/`, `/post/`, `/stories/`,
`/auth/callback`; excluded: `/api/`, `/checkout/`, `/wallet`, `/trips`, the
rest of `/auth/`. Host: www only (F-06). (D41) iOS half: **READY in the
repository**, Team ID real, entitlements adopted (`project.pbxproj:305`, `:328`),
checker exits 0; Apple's CDN copy and a device are UNVERIFIED. Android half:
**BLOCKED** on the two Play fingerprints, which are placeholders.

**Push.** Implemented end to end in code; **zero rows in `push_tokens` in
production** (read 28 Sep), so nothing has ever been delivered to any device.
Tap routing is restricted to same-origin paths (`sameOriginPath`), falling back
to `/notifications`. Android channel `vallo_default` is created at boot.
Vercel Production already holds `FCM_PROJECT_ID` and
`FCM_SERVICE_ACCOUNT_JSON` (names read 28 Sep, values not read), so the server
half of Android push is configured. **BLOCKED** on the Android API key in
`google-services.json` (client half). (D41) The Apple account is no longer
pending; the APNs key is UNKNOWN: no `APNS_*` variable existed on 28 September
and the repository holds no later reading.

**Permissions.** Location when in use (coarse; fine only up to Android 11,
reasoning in the manifest), camera and photo library through the system
pickers and the Camera plugin in the listing wizard, microphone for walkthrough
video on iOS, notifications asked in context. No background location, contacts,
calendar, tracking or broad storage permission. Denied-state fallbacks exist
in MapCanvas and the push settings screen; real-device behaviour **unverified**.

**Payments.** No digital goods are sold (no boosts, subscriptions or paid
placement; `lib/listings/ranking.ts`), so in-app purchase rules do not apply:
bookings and rent are physical services. Payment truth is server-side. F-16 is
the open device question.

**Security.** No secrets in source; release not debuggable; cleartext off on
all three layers; `allowBackup` off plus extraction rules; only the launcher
activity is exported; FileProvider not exported; deep-link and push-tap targets
are same-origin paths only; external http(s) opens in the system browser tab.

**Performance.** The website pays nothing for native code (dynamic imports
behind `looksNative()`). Every native listener has a teardown (`boot.ts`
collects them). Startup, memory and jank on a device are **unverified**.

**Privacy.** No analytics SDK, no advertising identifier, no tracking.
Declarations are maintained in `store/PRIVACY_LABELS.md`; the push token is a
device identifier collected for app functionality, and location is collected
and stored when a host drops a pin. Crash reporting is Sentry-shaped and only
active if configured. `SENTRY_DSN` is **not set** in Vercel Production (28
Sep), so per that file the Crash Data / Crash logs answers are **No** today and
must change the day it is switched on. With no crash reporting, native crashes
in the field will be invisible; that is a founder decision with a privacy cost.

**Store assets.** Icons and splash generated for both platforms (iOS single
1024 icon, Android adaptive icons in all densities, splash light and dark).
(D41) Store screenshots at store device sizes **are made**: 35 at 1320 x 2868 for
the App Store, 35 at 1440 x 2560 plus a 1024 x 500 feature graphic for Google Play,
under `docs/store/screenshots/` (composed 30 September; not captured from a shipped
device build, which remains open). Listing copy is drafted in `store/LISTING_COPY.md`.

---

## 5. Checks run in this session

| Check | Result |
| --- | --- |
| `npx vitest run --project unit` (whole web suite) | 499 files, 5,773 passed, 1 skipped, 0 failed |
| `npx tsc --noEmit` | clean |
| `npm run lint` (eslint within the warning budget, CSS tokens, valuation words, em dashes, claims) | passed |
| `next build` (production) | passed; generated CSS contains every new inset utility |
| `CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync` | **refused**, correctly: the three association placeholders (historical, 28 Sep; D41: the Apple one is now real, the two Android fingerprints still refuse the all-platform sync, and `cap:sync:ios` passes) |
| `... npm run cap:sync:dev` | passed; 9 plugins per platform; tree unchanged |
| Gradle scripts parsed with Gradle 8.14.3's Groovy 3.0.24 | all six parse |
| `plistlib` on `Info.plist` and `App.entitlements`; `minidom` on 14 Android XML files and both storyboards | all valid |
| `npm run sync:versions -- --check` | in sync |
| Live `curl` of both association files on apex and www | www 200 JSON; apex 308 (F-06) |
| Supabase (read only): RLS and columns on `push_tokens`, `push_queue`, `push_deliveries`; token count | RLS on, `device_ref = left(md5(token),12)`; 0 tokens |
| Vercel (names only, nothing decrypted) | `FCM_*` and VAPID set; no `APNS_*`, no `SENTRY_DSN` |
| **iOS build (`xcodebuild archive`)** | **UNVERIFIED in this container (no macOS/Xcode).** (C15) The unsigned simulator compile runs on GitHub Actions and succeeds (`native-ios.yml`, 20 runs, latest 36572375519 success). (D41) The SIGNED archive no longer waits: run 37103086939 on 3 October exported a signed IPA to App Store Connect |
| **Android build (`./gradlew bundleRelease`)** | **UNVERIFIED in this container.** (C15) `./gradlew assembleDebug` runs on GitHub Actions and succeeds (`native-android.yml`, 33 runs, latest 36572375537 success). `bundleRelease` still waits on the keystore and the Firebase key |

---

# VALLO NATIVE RELEASE STATUS

## 1. PRODUCT / WEB
READY. Production build, typecheck and the full unit suite pass; the live
origin serves.

## 2. CAPACITOR
READY in configuration (resolved config verified, sync passes, offline and
splash path fixed). Not proven on a device.

## 3. IOS CODEBASE
COMPILES (C15). The unsigned simulator build succeeds on GitHub Actions on
every relevant push. (D41) Signing is PROVEN on CI: the signed archive job succeeded on 3 October (run 37103086939). The
app target now carries `PrivacyInfo.xcprivacy` (no tracking; collected types
as in `store/PRIVACY_LABELS.md`).

## 4. ANDROID CODEBASE
COMPILES (C15). `assembleDebug` succeeds on GitHub Actions on every relevant
push, and an emulator smoke job installs the APK and screenshots the
no-account P0 rows. R8 and release signing are unproven until the keystore
and Firebase key exist.

## 5. IOS BUILD
(D41) BUILT AND SIGNED ON CI. Run 37103086939 (3 October 2026) compiled for the
simulator and produced a signed App Store export that uploaded to App Store
Connect. Xcode is not available in this container, which is a limit of the
container. Still open: TestFlight distribution state is UNKNOWN from the
repository, and no device has run the build. The later transfer to the VALLO
SPACES LTD account changes the Team ID (`docs/MOBILE.md` section 7).

## 6. ANDROID BUILD
DEBUG BUILD VERIFIED ON CI (C15): download `vallo-android-debug-<sha>` from
the latest `Native Android` run and `adb install` it. A release build still
needs the Firebase key and the upload keystore.

## 7. DEEP LINKS
(D41) iOS: association file real and passing its checker, entitlements adopted;
Apple's CDN copy UNKNOWN, device test not run. Android: BLOCKED on the Play
app-signing and upload-key fingerprints. Code and claims are ready.

## 8. PUSH NOTIFICATIONS
PARTIAL. Server and client complete and hardened; FCM server credentials are
set in Vercel. BLOCKED on the Android API key in `google-services.json`. The
APNs key is UNKNOWN from the repository (D41: it is not blocked on the Apple
account). Never delivered to a device.

## 9. AUTHENTICATION
PARTIAL. Email + password complete in code. Email-link return depends on the
deep links above. Apple sign-in blocked by plugin compatibility (F-10), not
required for submission. Lifecycle behaviour unverified on a device.

## 10. PAYMENTS
PARTIAL. Server-side verification complete, no IAP exposure. The 3-D Secure
flow inside the web view is unverified (F-16).

## 11. PERMISSIONS
READY in declarations and purpose strings; runtime prompts and denial paths
unverified on devices.

## 12. SECURITY
READY after this session's fixes, by static review. No open finding above P3.

## 13. PERFORMANCE
UNVERIFIED on devices. No static issue found.

## 14. PRIVACY / DATA DISCLOSURE
NEEDS CONFIRMATION: answers exist in `store/PRIVACY_LABELS.md` and already list
the push token as a Device ID. Sentry is not configured in production, so crash
data is answered No; the founder confirms the whole form on submission day.
(C15) ONE ANSWER TO CHANGE: field speed samples (`web_vitals_samples`, the
route template, the metric and the connection type, no user id) are collected
from the app too, so Diagnostics > Performance Data is YES, not linked to the
user, App Functionality. The iOS privacy manifest already says so.

## 15. STORE ASSETS
(D41) MOSTLY DONE. Icons, splash, listing copy, 35 App Store screenshots
(1320 x 2868), 35 Google Play screenshots (1440 x 2560) and the Play feature
graphic (1024 x 500) exist under `docs/store/screenshots/`. Open: screenshots
captured from a real device build, and a founder check of which to submit.

## 16. APPLE DEVELOPER ACTIONS
(D41) NOT BLOCKED ON ENROLMENT. The programme is held (team `X74KD52994`) and
a signed upload has already happened. What is left on the Apple side is the
APNs key and Vercel variables (UNKNOWN), App Store Connect record and
metadata (UNKNOWN), TestFlight distribution (UNKNOWN) and the later transfer to
the company account. See section 7 below, `VALLO_IOS_RELEASE_CHECKLIST.md`
and `docs/MOBILE.md` section 7.

## 17. GOOGLE PLAY ACTIONS
Status of the Play Console account is unconfirmed; treated as not started. See
section 7 and `VALLO_ANDROID_RELEASE_CHECKLIST.md`.

## 18. REAL DEVICE TESTING
Nothing has been tested on a physical device, by anyone, ever: 0 of 34 matrix
rows run, 0 of 10 P0 (D43). The full list is
`VALLO_NATIVE_TEST_MATRIX.md`; every row reads NOT RUN. (C15) The emulator
smoke job covers rows 1, 2 and 23 plus a deep link to `/open` on an emulated
Pixel 6 (Android 14); its screenshots are evidence for an emulator, not a
phone. The founder's first handset session is section 8.

## 19. RELEASE BLOCKERS
1. ~~No native build has compiled (both platforms).~~ FALSE (C15, D41). Both compile on CI, and a SIGNED iOS archive succeeded and uploaded on 3 October (run 37103086939). A signed Android build has not.
2. ~~Apple Developer enrolment.~~ DONE (D41). Team `X74KD52994` is committed in the project and the association file. Remaining Apple items, none of them enrolment: APNs key and `APNS_*` variables (UNKNOWN), App Store Connect metadata (UNKNOWN), TestFlight distribution (UNKNOWN). The later transfer to the VALLO SPACES LTD account changes the Team ID (`docs/MOBILE.md` section 7).
3. Play Console account, upload keystore and Play App Signing: blocks the AAB and App Links. GENUINELY OPEN.
4. Association file values: ~~Team ID~~ DONE; the two Android fingerprints are GENUINELY OPEN (still placeholders) and the all-platform `cap:sync` refuses without them. The iOS file passes its checker.
5. Firebase Android API key in `google-services.json` (the FCM service account is already in Vercel): the release build refuses without it. GENUINELY OPEN (`current_key` is a placeholder).
6. No device test pass: 0 of 34 rows, 0 of 10 P0. GENUINELY OPEN and now the highest-value item (D43).
7. ~~Store-size screenshots.~~ MADE (35 + 35 + feature graphic). Open: captures from a real device build, and a founder check.

## 20. NEXT ACTIONS
1. Founder: (D41) Apple enrolment is done, skip it. Ship the existing iOS build to TestFlight testers if not already done (state UNKNOWN) and spend one afternoon on the P0 rows (D43); create the Play Console account; create the upload keystore; paste the Firebase Android key.
2. On a machine with Android Studio: `npm ci`, `cap:sync:dev`, `./gradlew assembleDebug`, install on a handset, run the P0 rows of the test matrix; fix what breaks.
3. On an iPhone: install the TestFlight build (or build from a Mac with Xcode), run the same rows.
4. Once the Play account exists: fill the two Android fingerprints and the FCM/APNs secrets, `cap:sync`, `bundleRelease`. (D41: the iOS capabilities, Team ID and entitlements adoption are already done.)
5. Internal testing (Play) and TestFlight; run the full matrix on devices; make screenshots from that build.
6. Submit, with the review notes from `STORE_SUBMISSION_NOTES.md`.

---

## 6. Native release matrix

| Area | Status | Evidence | Remaining action |
|------|--------|----------|------------------|
| Capacitor | Ready (static) | resolved config, `cap:sync:dev`, 9 plugins | device run |
| iOS | Built and signed (CI) | unsigned simulator build green; signed archive green and exported to App Store Connect, run 37103086939, 3 Oct (D41) | TestFlight state UNKNOWN; device run |
| Android | Compiles (CI) | `assembleDebug` green on `native-android.yml`; emulator smoke job (C15) | release bundle after keystore and Firebase key |
| Auth | Partial | email flow in code; cookies in web view jar | device lifecycle tests; deep links |
| Apple Login | Blocked | plugin 7.1.0 pins Capacitor < 8 | wait for a Capacitor 8 plugin; provider terms step |
| Push | Partial | 0 tokens live; FCM server creds set; F-04, F-05, F-11, F-14, F-15 fixed | Android API key, APNs key, device test |
| Deep Links | iOS ready, Android blocked | www-only claims; iOS checker exits 0, Team ID real, entitlements adopted (D41) | two Android fingerprints; Apple CDN check; device test |
| Camera | Unverified | Camera plugin + capture intents; no CAMERA permission needed | device test |
| Photos | Unverified | system pickers; iOS purpose strings | device test |
| Documents | Unverified | file inputs, size limits, server MIME scrub | device test |
| Location | Unverified | coarse + fine<=30; iOS when-in-use | Android 10/11 and 12+ handsets |
| Share | Ready (code) | native sheet on both (F-08) | device test |
| Payments | Partial | webhook HMAC, verify, reconcile, idempotency | 3-D Secure in the web view, Paystack test mode |
| Offline | Ready (code) | errorPath card; splash hidden (F-03) | airplane-mode cold start on device |
| Security | Ready (static) | section 4 | none open above P3 |
| Privacy | Needs confirmation | `store/PRIVACY_LABELS.md`; no `SENTRY_DSN` in production | founder confirms forms; decide on crash reporting |
| Performance | Unverified | no static issue | device profiling |
| Signing | iOS done, Android blocked | iOS: team `X74KD52994`, signed export succeeded (D41); Android: release refuses without keystore | Android keystore and Firebase key |
| Store Assets | Mostly done (D41) | icons, splash, copy, 35 + 35 screenshots, feature graphic | captures from a real build |
| TestFlight | UNKNOWN (D41) | an archive was uploaded 3 Oct (run 37103086939); the repository cannot show App Store Connect | founder reads App Store Connect |
| Google Play | Blocked | needs Play account and an AAB | after account + build |

## 7. Human-action checklist (outside the codebase, genuinely outstanding)

Apple, stage 1 (the founder's personal account; no D-U-N-S needed). D41: enrolment, App ID capabilities, Team ID, entitlements adoption and the first signed upload are DONE; do not repeat them.

- [x] DONE: Apple Developer Program enrolment (team `X74KD52994`)
- [x] DONE in effect: App ID `com.vallospaces.app` with Push Notifications, Associated Domains, Sign In with Apple (the signed export of 3 October succeeded); Sign In with Apple still cannot show until a Capacitor 8 plugin exists (F-10)
- [ ] OPEN, UNKNOWN: create the APNs key (.p8); set `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION=true` in Vercel Production
- [x] DONE: Team ID in `apps/web/public/.well-known/apple-app-site-association`
- [x] DONE: team selected and `App/App.entitlements` adopted (`project.pbxproj:117`, `:305`, `:328`)
- [ ] OPEN, UNKNOWN: App Store Connect app record and metadata (an upload implies a record exists; its fields are not visible here)
- [x] DONE once: archive and upload (run 37103086939). OPEN, UNKNOWN: TestFlight distribution to testers

Apple, stage 2 (after the D-U-N-S number arrives):

- [ ] Complete Apple Developer Program enrolment as an Organization, VALLO SPACES LTD
- [ ] Transfer the app to the company account in App Store Connect, then redo everything tied to the Team ID: the association file, the capabilities and profiles, the APNs key, the Sign in with Apple setup and the CI secrets (`docs/MOBILE.md` section 7)

Google (Play Console status unconfirmed):

- [ ] Create or confirm the Play Console account (organisation)
- [ ] Paste the Firebase Android API key into `apps/web/android/app/google-services.json` (project `vallo-44059`)
- [ ] Create the upload keystore and `android/keystore.properties` (never committed)
- [ ] Create the Play app; enrol in Play App Signing on first upload
- [ ] Put the app-signing and upload-key SHA-256 fingerprints into `assetlinks.json`
- [ ] Internal testing track, then closed or production

Both stores:

- [ ] Device test pass (`VALLO_NATIVE_TEST_MATRIX.md`)
- [ ] Store screenshots from the shipped build; Play feature graphic
- [ ] App Privacy and Data safety forms from `store/PRIVACY_LABELS.md`
- [ ] Content and age rating questionnaires
- [ ] Reviewer account and review notes (`STORE_SUBMISSION_NOTES.md`)
- [ ] Optional: decide whether the apex should serve `/.well-known/*` (F-06)

## 8. The founder's first handset session (C15)

One Android phone and one iPhone, in this order, which is the order of risk.
Use the debug APK from the latest `Native Android` run (Artifacts) and, for
iOS, Xcode with a free personal team until the Apple account is ready. Fill in
the matching rows of `VALLO_NATIVE_TEST_MATRIX.md` as you go, with a screenshot
each.

1. **Cold launch, online, then offline** (rows 1 and 2). Splash, then
   `/welcome`. Airplane mode, kill, relaunch: the branded offline card, and
   Try again works once online.
2. **Sign in** (row 3) with the QA account, not your own. Kill and reopen
   (row 7): still signed in.
3. **Passcode.** Set it, background the app 6 minutes, return: the lock. Wrong
   code five times: the cool-down. On a device where a passkey is registered,
   "Unlock with Face ID or fingerprint" appears (C14, when the setting is on).
4. **Push to a host** (rows 11 to 13). Needs the Firebase Android key in
   `google-services.json` (Android) or the APNs key in Vercel (iOS). Accept the
   Vallo explainer, then the system prompt; from a second account send the host
   a request; the banner arrives with the app closed, backgrounded and open;
   the tap opens that request. Kill and relaunch: `/settings/devices` still
   shows one row for this phone, not two (F-14).
5. **Paystack test card with 3-D Secure** (row 21), TEST keys only, never live:
   the bank page stays inside the app or returns to it, and the booking shows
   paid. This is F-16 and the single most likely failure.
6. **Back button and keyboard** (rows 22 and 23) on Android.
7. **Sign out, kill, reopen** (row 9): signed out, and the device row is gone.

Anything that fails: note the row, the phone model and OS version, and the
screen reference if an error screen shows one ("Reference ABCD1234"): support
and engineering find the report by it (C13).

Which phones: the founder's decision (RECS_C C15). Recommended pair: a Samsung
or Pixel on Android 14 or newer, and the newest iPhone to hand on iOS 17 or
newer; then one Android 10 or 11 phone for App Links and location.
