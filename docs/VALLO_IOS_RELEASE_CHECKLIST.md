# Vallo iOS release checklist

28 September 2026. Status words: READY (verified by a static check or test),
NEEDS CONFIGURATION (a repository or Xcode step, no account needed),
BLOCKED BY APPLE DEVELOPER ACCOUNT (the founder's personal enrolment, see step 1), UNVERIFIED (needs Xcode
or a device). Release status and findings: `VALLO_NATIVE_RELEASE_AUDIT.md`.
Console click paths: `store/FOUNDER_STEPS.md`.

## Project (`apps/web/ios/App`)

| Item | Value | Status |
| --- | --- | --- |
| Bundle ID | `com.vallospaces.app` (Debug and Release) | READY (`brand-domain.test.ts`) |
| Deployment target | iOS 15.0; iPhone only (`TARGETED_DEVICE_FAMILY = 1`) | READY (`ios-project.test.ts`) |
| Dependencies | Swift Package Manager, `CapApp-SPM/Package.swift`, `capacitor-swift-pm` exact 8.5.0 + 9 plugins; no CocoaPods | READY (`cap sync`); resolution UNVERIFIED |
| Lifecycle | `AppDelegate` + `SceneDelegate` exactly as Capacitor 8's template | READY (diffed against `ios-spm-template.tar.gz`) |
| `AppDelegate.swift` | APNs token success/failure posted to Capacitor; no notification-centre delegate (Capacitor's router owns it) | READY; the compile error fixed 28 Sep (F-01). **Compilation UNVERIFIED** |
| Versions | `MARKETING_VERSION 0.1.0`, `CURRENT_PROJECT_VERSION 100000` from `npm run sync:versions` | READY (`--check` in sync) |
| Signing | Automatic, no team | BLOCKED BY APPLE DEVELOPER ACCOUNT |
| Archive | never run | UNVERIFIED: XCODE ENVIRONMENT REQUIRED |

## Info.plist

| Key | Status |
| --- | --- |
| `NSLocationWhenInUseUsageDescription` (map locate; host pin saved to listing) | READY |
| `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` (walkthrough video) | READY |
| No `Always` location, contacts, calendar, tracking, Face ID keys | READY (nothing uses them) |
| `UIBackgroundModes: remote-notification` | READY |
| `ITSAppUsesNonExemptEncryption = false` | READY (https and platform storage only) |
| `NSAllowsArbitraryLoads = false` | READY |
| `UIRequiredDeviceCapabilities: arm64` | READY |
| `UIViewControllerBasedStatusBarAppearance = true` (StatusBar plugin needs it) | READY |

## Entitlements (`App/App.entitlements`, inert until adopted in Xcode)

| Entitlement | Value | Status |
| --- | --- | --- |
| Associated Domains | `applinks:www.vallospaces.com` only (apex removed, F-06) | NEEDS CONFIGURATION in Xcode; BLOCKED BY APPLE DEVELOPER ACCOUNT |
| `aps-environment` | `development` (distribution signing writes `production`) | BLOCKED BY APPLE DEVELOPER ACCOUNT; check the archive's entitlements once |
| Sign in with Apple | present | Tick the capability on the App ID anyway: signing refuses an entitlement the App ID lacks. The button still cannot show until a Capacitor 8 plugin exists (F-10) |

## Steps, in order

1. [ ] Apple Developer Program enrolment under the founder's PERSONAL account (Individual, no D-U-N-S needed). The app moves to the VALLO SPACES LTD account by an App Store transfer once the company's Organization enrolment completes; the Team ID then changes, and the capabilities on the App ID, the APNs key (step 3), the link file (step 4) and the CI secrets are redone for the new team (`docs/MOBILE.md` section 7).
2. [ ] App ID `com.vallospaces.app` with Push Notifications, Associated Domains and Sign In with Apple (all three are in the entitlements file).
3. [ ] APNs key: set `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION=true` in Vercel Production. Never commit the `.p8`.
4. [ ] Team ID into `apps/web/public/.well-known/apple-app-site-association`; deploy; confirm at `https://app-site-association.cdn-apple.com/a/v1/www.vallospaces.com`.
5. [ ] On the Mac: `npm ci`, then `CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web` (refuses until step 4 and the Android fingerprints are in; use `cap:sync:dev` for a device test before then).
6. [ ] Xcode: open `apps/web/ios/App/App.xcodeproj`, choose the team, add Push Notifications and Associated Domains (Xcode adopts the entitlements file).
7. [ ] Build to a device; run `VALLO_NATIVE_TEST_MATRIX.md`.
8. [ ] `VALLO_BUILD=<n> npm run sync:versions`, archive, validate, upload.
9. [ ] App Store Connect: app record, App Privacy (`store/PRIVACY_LABELS.md` Part A), age rating, screenshots from this build, review notes and reviewer account (`STORE_SUBMISSION_NOTES.md`), support URL `https://www.vallospaces.com/help`, privacy URL `https://www.vallospaces.com/privacy`.
10. [ ] TestFlight internal testing, then submit.

Steps 5 to 8 can instead run on GitHub Actions (`.github/workflows/native-ios.yml`, the signed archive job) once the four secrets in `docs/NATIVE_CI.md` exist; no Mac is then needed for the build itself.

A personal (free) team can build step 7 to a device before enrolment finishes,
without the Push and Associated Domains capabilities. That is the fastest way
to learn whether the project compiles at all.
