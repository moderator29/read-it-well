# Vallo Android release checklist

28 September 2026. Status words: READY (verified by a static check or test),
NEEDS CONFIGURATION, BLOCKED BY CREDENTIALS, BLOCKED BY GOOGLE (Play Console
status unconfirmed), UNVERIFIED (needs the Android SDK or a device). Release
status and findings: `VALLO_NATIVE_RELEASE_AUDIT.md`.

## Project (`apps/web/android`)

| Item | Value | Status |
| --- | --- | --- |
| `applicationId` / `namespace` | `com.vallospaces.app` | READY (`brand-domain.test.ts`) |
| SDK levels | min 24, compile 36, target 36 | READY; Android 15+ edge-to-edge handled by Capacitor 8 `SystemBars` |
| Toolchain | AGP 8.13.0, Gradle wrapper 8.14.3, google-services 4.4.4, Java `MainActivity` | Gradle scripts parse; **build UNVERIFIED** (`dl.google.com` blocked here) |
| Versions | `versionCode 100000`, `versionName "0.1.0"` from `npm run sync:versions` (refuses to move backwards) | READY |
| Release build type | `debuggable false`, R8 on, `shrinkResources false` (splash resolved by name) | READY; R8 output UNVERIFIED |
| Signing | `keystore.properties` + `*.jks` gitignored; absent file gives an unsigned artefact, never debug-signed | BLOCKED BY CREDENTIALS (upload keystore) |
| Firebase | `app/google-services.json` for project `vallo-44059`, package matches; `current_key` is a placeholder; release refuses until real | BLOCKED BY CREDENTIALS (Android API key). Server side (`FCM_*`) already in Vercel |

## Manifest

| Item | Status |
| --- | --- |
| Permissions: INTERNET, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION (`maxSdkVersion 30`), POST_NOTIFICATIONS; VIBRATE merged from haptics; Firebase's normal permissions | READY; no CAMERA (capture works by intent, see manifest), no media or storage permission, no background location |
| `allowBackup="false"` + `dataExtractionRules` (cloud and device transfer excluded) | READY (F-12) |
| `usesCleartextTraffic="false"` | READY |
| Exported components: the launcher activity only; FileProvider not exported | READY |
| App Links: `autoVerify`, host `www.vallospaces.com` only, shareable paths + `/auth/callback` | READY in the binary; BLOCKED on the two fingerprints in `assetlinks.json` |
| FCM defaults (channel `vallo_default`, `ic_stat_vallo`, colour) as `<application>` meta-data | READY (F-02) |
| `<queries>` for https VIEW (Custom Tabs resolution) | READY |

## Steps, in order

1. [ ] Play Console account (organisation); create the app `com.vallospaces.app`.
2. [ ] Firebase console, project `vallo-44059`: copy the Android API key into `current_key` in `google-services.json` and commit it (not a secret).
3. [ ] Create the upload keystore; write `apps/web/android/keystore.properties`; store both outside git and in the CI secret store.
4. [ ] On a machine with Android Studio: `npm ci`, `CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync:dev --workspace @vallo/web`, `./gradlew assembleDebug`, install, run `VALLO_NATIVE_TEST_MATRIX.md`.
5. [ ] `VALLO_BUILD=<n> npm run sync:versions`, `./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
6. [ ] Upload to Internal testing; enrol in Play App Signing.
7. [ ] Copy the app-signing SHA-256 and the upload-key SHA-256 into `assetlinks.json`; deploy; then `npm run cap:sync` passes; verify with `adb shell pm get-app-links com.vallospaces.app`.
8. [ ] Store listing (`store/LISTING_COPY.md`), feature graphic, phone screenshots from this build, Data safety (`store/PRIVACY_LABELS.md` Part B), content rating, target audience, app access (reviewer account, `STORE_SUBMISSION_NOTES.md`), privacy URL `https://www.vallospaces.com/privacy`, account deletion URL `https://www.vallospaces.com/delete-account`.
9. [ ] Closed testing if the account type requires it, then production.
