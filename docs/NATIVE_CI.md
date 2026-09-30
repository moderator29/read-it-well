# Native CI: real Android and iOS builds on GitHub Actions

Added 28 September 2026. The Claude sandbox cannot compile either app (no
macOS; `dl.google.com` blocked), so GitHub's runners do it.

| Workflow | Job | Runs | Needs | Proves |
| --- | --- | --- | --- | --- |
| `.github/workflows/native-android.yml` | Android debug build | every push to main or PR touching the native files, and by hand | nothing | the Android project compiles; gives a debug APK to install on a handset |
| `.github/workflows/native-android.yml` | Android emulator smoke (no account) | after every green debug build | nothing | the APK installs and launches on an emulated Pixel 6 (Android 14); screenshots of cold launch online and offline, a deep link to `/open` and the back button at the root (C15, 30 September 2026). Non-blocking: an emulator that fails to boot never fails the run |
| `.github/workflows/native-ios.yml` | iOS compile (unsigned, simulator) | every push to main touching the iOS files, and by hand | nothing | the iOS project and its Swift packages compile |
| `.github/workflows/native-ios.yml` | iOS signed archive | by hand only, with "archive" ticked | the four Apple secrets below | a signed App Store IPA, optionally uploaded to TestFlight |

Run by hand: GitHub, the repository, **Actions**, pick the workflow on the
left, **Run workflow**. The APK and the IPA are attached to the run under
**Artifacts** for 14 days.

## Secrets (encrypted Actions secrets, never files in the repository)

Add them at GitHub, the repository, **Settings**, **Secrets and variables**,
**Actions**, **New repository secret**. The names must match exactly.

**iOS, needed once Apple enrolment is finished.** Signing uses Xcode's
automatic, cloud-managed signing, authenticated with an App Store Connect API
key, so no `.p12` certificate or provisioning profile is ever exported or
stored anywhere.

| Secret | Where it comes from |
| --- | --- |
| `APPLE_TEAM_ID` | developer.apple.com, Account, Membership details, Team ID (10 characters) |
| `APP_STORE_CONNECT_KEY_ID` | appstoreconnect.apple.com, Users and Access, Integrations, App Store Connect API, Team Keys, generate a key with the **App Manager** role; the Key ID column |
| `APP_STORE_CONNECT_ISSUER_ID` | the same page, "Issuer ID" above the list |
| `APP_STORE_CONNECT_KEY_P8_BASE64` | the `AuthKey_XXXXXXXXXX.p8` file that downloads once, base64 encoded: `base64 -i AuthKey_XXXXXXXXXX.p8 \| pbcopy` on a Mac, then paste |

**All four come from the founder's personal Apple account first (the founder's
decision, 29 September 2026).** When the app is transferred to the VALLO SPACES
LTD account, the Team ID changes and the API key belongs to the old account, so
all four secrets are replaced with values from the company account. The full
list of what changes with the transfer is in `docs/MOBILE.md` section 7.

The App ID `com.vallospaces.app` must have **Push Notifications**,
**Associated Domains** and **Sign In with Apple** ticked, because
`ios/App/App/App.entitlements` carries all three and signing refuses an
entitlement the App ID lacks. Ticking Sign In with Apple is harmless while the
button cannot be shown (no Capacitor 8 plugin yet).

**Android, needed only when a signed release job is added.** Not used by any
workflow today; the names are fixed now so nothing has to be renamed later.

| Secret | What |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the upload keystore (`upload-keystore.jks`), base64 encoded |
| `ANDROID_KEYSTORE_PASSWORD` | its store password |
| `ANDROID_KEY_ALIAS` | `upload` unless chosen otherwise |
| `ANDROID_KEY_PASSWORD` | the key password |

The Firebase Android API key is **not** a secret and does not go here: it goes
into `apps/web/android/app/google-services.json` in the repository (the key is
public in every APK and locked to the package and signing certificate).

**Variable (not a secret), optional.** `IOS_RUNNER` overrides the macOS image
(default `macos-15`, which carries Xcode 26; `macos-14` tops out at Xcode 16,
older than Capacitor 8.5 is tested with and than App Store uploads accept).

## What each job deliberately does not do

- The Android job builds DEBUG only. A release `bundleRelease` refuses until
  the Firebase key is real (`app/build.gradle`), and needs the keystore.
- Both jobs use `cap:sync:dev`, which warns about the placeholder association
  values; the signed iOS archive uses the strict `cap:sync` and so refuses until
  the Team ID and Play fingerprints are in (`npm run check:deep-links`).
- Without the Firebase key, the debug APK runs normally but turning
  notifications on reports a failure after ten seconds; it does not crash
  (Capacitor's bridge catches the plugin's FirebaseApp exception).
