# Mobile build and release

How to build, sign and ship the Android and iOS applications. The reasoning
behind the architecture is in `docs/MOBILE_READINESS.md`; this file is the
operating manual.

Written 2026-08-07, against Capacitor 8.5.0. Current release status: `docs/VALLO_NATIVE_RELEASE_AUDIT.md` (28 September 2026).

---

## 1. What exists

```
apps/web/capacitor.config.ts     the configuration, and the long WHY
apps/web/native-shell/           the offline fallback the binary carries
apps/web/assets/                 icon and splash sources, generated
apps/web/android/                the Android project
apps/web/ios/                    the iOS project
apps/web/src/lib/native/         the runtime integration
apps/web/public/.well-known/     deep link association files
scripts/build-native-icons.mjs   regenerates the icon and splash sources
scripts/sync-native-versions.mjs the single source of truth for versions
```

The shell loads the live origin over https and falls back to `native-shell/`
when it cannot be reached. It does not package a static build of the site,
because this application cannot produce one. `capacitor.config.ts` explains
that in full and `MOBILE_READINESS.md` section 2 has the evidence.

---

## 2. The one variable that decides whether a build works

```bash
export CAPACITOR_SERVER_URL="https://www.vallospaces.com"    # the production origin
```

Use the **www** host. The apex `https://vallospaces.com` answers every path
with a 308 to www, and a shell whose `server.url` redirects to another host can
hand its first launch to the system browser. `capacitor.config.ts` rewrites an
apex value to www and lists both hosts in `server.allowNavigation`, and
`capacitor-origin.test.ts` pins that.

`capacitor.config.ts` reads it when `npx cap sync` runs. Set it in the shell
that performs the sync, and set it in CI.

**Unset, the build still succeeds and is not shippable.** The binary opens on
the offline shell's second state, which says in plain words that it was
packaged without a server. That is deliberate: a silent failure here would ship
an application that opens to nothing.

---

## 3. Routine workflow

```bash
npm install
npm run build                       # the web build, still the source of truth

cd apps/web
CAPACITOR_SERVER_URL="https://www.vallospaces.com" npx cap sync
```

`cap sync` copies `native-shell/` into both projects, writes the resolved
config, and updates the native plugin lists. Run it after any change to
`capacitor.config.ts`, after adding or removing a plugin, and after changing
`native-shell/`.

Open the projects with `npx cap open android` and `npx cap open ios`. Both need
tooling this repository cannot provide: Android Studio with the Android SDK, and
Xcode on macOS.

### Icons and splash screens

```bash
node scripts/build-native-icons.mjs
cd apps/web && npx @capacitor/assets generate \
  --iconBackgroundColor '#010118' --iconBackgroundColorDark '#010118' \
  --splashBackgroundColor '#010118' --splashBackgroundColorDark '#010118'
```

The first command rebuilds `apps/web/assets/` from the canonical brand cutout,
cropping the house-and-R mark out of the full lockup. It refuses to run if a
change would enlarge the mark past 1.6x. The second fans those into 74 Android
resources and the iOS asset catalogue.

**`@capacitor/assets` also writes two things this project does not want**, and
they must be deleted after every run: `apps/web/icons/` and
`apps/web/public/manifest.webmanifest`. The second is the dangerous one. This
app serves its manifest from the typed route `src/app/manifest.ts`, and a static
file in `public/` shadows a route, so leaving it replaces a carefully built
manifest with a generated one that has relative `../icons/` paths and declares
its `.webp` files as `image/png`.

### Versions

```bash
npm run sync:versions              # writes the native versions from package.json
npm run sync:versions -- --check   # CI form, writes nothing, fails on drift
npm run sync:versions -- --help    # the full release procedure
```

One source of truth: `version` in `apps/web/package.json`. The build number
comes from `VALLO_BUILD` in the environment, which CI already has
(`$PROJECT_BUILD_NUMBER` on Codemagic, `$GITHUB_RUN_NUMBER` on Actions). The
script refuses to move a `versionCode` backwards, which is the mistake Play
rejects an upload for.

---

## 4. Signing

**Android.** Create an upload keystore, then `apps/web/android/keystore.properties`:

```properties
storeFile=/absolute/path/to/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Both that file and `*.jks` are gitignored, and that was a deliberate change:
Capacitor's template ships those ignore lines commented out. The upload key is
the application's identity on Play and cannot be rotated after the first release
without Google's intervention.

When the file is absent, `assembleRelease` produces an unsigned artefact rather
than silently falling back to the debug key.

**iOS.** Signing is Xcode and the Apple Developer portal. Nothing in this
repository holds a certificate or a profile, and nothing should.

---

## 5. What only the owner can do

Nothing below can be done from inside this repository.

### Accounts and money
- [ ] Apple Developer Program enrolment, 99 USD per year
- [ ] Google Play Console registration, 25 USD once
- [ ] Codemagic (or another CI) account connected to the repository

### The two values the deep link files are waiting for

Both association files carry loud placeholders that fail verification rather
than looking plausible.

- [ ] **`apps/web/public/.well-known/assetlinks.json` needs two SHA-256 fingerprints, not one.**
  The Play app signing certificate fingerprint, from Play Console, the app,
  Release, Setup, App signing. That is the one that matters on a shipped
  install, because Play strips our signature and re-signs with Google's key.
  Plus the upload key fingerprint from
  `keytool -list -v -keystore upload-keystore.jks -alias upload`, which is what
  makes App Links verify on hand-installed test builds. Leaving either out
  costs a day.
- [ ] **`apps/web/public/.well-known/apple-app-site-association` needs the Apple Team ID**,
  ten alphanumerics, from Apple Developer, Membership details. The entry must
  read `<TeamID>.com.vallospaces.app`.

### iOS associated domains
- [ ] `apps/web/ios/App/App/App.entitlements` exists and is deliberately inert:
  `CODE_SIGN_ENTITLEMENTS` is not set in the project file, because setting it
  fails every build until the Associated Domains capability exists on a real App
  ID. The three activation steps are written inside the file.

### Store listings
- [ ] Bundle identifier `com.vallospaces.app` reserved on both stores.

  THE IDENTIFIER HAS CHANGED ONCE AND MUST NEVER CHANGE AGAIN. This file said
  `ng.rentme.app` until 19 September, which was the name from before the
  rename. The code then carried `ng.vallo.app`, reverse DNS of a domain that
  was never registered and has since been dropped. On the founder's word, and
  only because NO STORE RECORD EXISTS YET on either platform, it is now
  `com.vallospaces.app`, reverse DNS of the domain we actually own.

  A bundle identifier is fixed at first submission. On Google Play it cannot
  be changed at all once an app record exists; on Apple it means a new app.
  So the window for this change was open only until the first store record is
  created, and it is now closed to further changes.

  `apps/web/src/lib/brand-domain.test.ts` fails if any of the seven places that
  carry it ever disagree: `capacitor.config.ts`, the Android `namespace` and
  `applicationId`, the Java package path, `strings.xml`, the iOS
  `PRODUCT_BUNDLE_IDENTIFIER`, `assetlinks.json` and the Apple App Site
  Association `appIDs`.

  ENROLMENT. Google Play: enrol as the organisation, VALLO SPACES LTD. Apple:
  the founder's decision of 29 September 2026 is a two-stage plan, set out in
  section 7 below. The app is registered, signed and submitted under the
  founder's personal Apple Developer account first, and transferred to the
  VALLO SPACES LTD organisation account once its enrolment (and the D-U-N-S
  number it needs) completes.

  `MOBILE_READINESS.md` section 6 is the checklist to follow; this file is
  background.
- [ ] Screenshots at every required device size
- [ ] Privacy questionnaires. `MOBILE_READINESS.md` section 5 answers them
- [ ] Age rating questionnaires

### A brand asset worth supplying
- [ ] **A 1024px or vector master of the house-and-R mark on its own.** The only
  master that exists is a 910x857 lockup whose mark is 511x598, so the App Store
  icon enlarges it about 1.5x. It is the single place in the whole pipeline that
  enlarges anything, and a proper master removes the compromise.

### Platform
- [x] **`pg_cron` is enabled**, corrected 2026-08-09. It was installed on
  2026-08-04 and six jobs are active. This checkbox sat unticked for five days
  and appears in three other documents; it is not blocking anything.

---

## 6. Known limitations, and what has NOT been verified

Read this before trusting anything above.

**No native build has ever run.** This sandbox's proxy denies `dl.google.com`
by policy, so neither the Android SDK nor the Android Gradle Plugin can be
fetched, and there is no macOS and no Xcode. What was actually verified here:

| Checked | How |
|---|---|
| Both native projects generate | `npx cap add android`, `npx cap add ios`, both succeeded |
| The config loads and syncs | `npx cap sync`, succeeded; 9 plugins for each platform on 28 September 2026 |
| Every Gradle file is valid Groovy | Parsed with Gradle 8.14.3's own Groovy 3.0.24 |
| Gradle itself runs | `./gradlew --version`, 8.14.3 on JDK 21 |
| The manifest, plist and entitlements are well formed | `xml.dom.minidom` and `plistlib` |
| Icons survive the launcher mask | Composited both adaptive layers and masked at Android's real 66 of 108 |
| The association files serve correctly | Against a running production build, both 200, AASA as `application/json` |
| The website is unchanged by any of it | Typecheck, lint, production build, and the browser specs |

**Not verified, and each needs a real device or a real toolchain:**

- That the Android project compiles, that R8 with `minifyEnabled true` produces
  a working bundle, and that the manifest merges cleanly.
- That the hand-edited `project.pbxproj` opens in Xcode.
- **Sign in with Google is not closed on native.** The OAuth handoff opens the
  system browser correctly, but the return journey needs a working universal
  link or App Link, and those need the two owner values above. Until then the
  exchange completes in the browser's cookie jar and the app stays signed out.
  Card payments survive the same gap, because the Paystack webhook settles
  server to server.
- That the location permission behaves as reasoned. The Android manifest caps
  `ACCESS_FINE_LOCATION` at `maxSdkVersion="30"` because Capacitor's
  `BridgeWebChromeClient` requests coarse and fine together and ANDs the result,
  with a coarse-only rescue path guarded on Android 12 or newer. That reading
  comes from the bridge source, not from a handset, and it deserves a real
  Android 10 or 11 device before the first release.
- Apple's App Review guideline 4.2. The native integration in `src/lib/native/`
  is the argument that this is more than a web view, and it is not a guarantee.

**Firebase is now real, and the release build guards it.** *(28 Sep)* Push
uses FCM on Android: `app/google-services.json` is committed for Firebase
project `vallo-44059` with a placeholder `current_key`, and `app/build.gradle`
applies `com.google.gms.google-services` only when the file is valid, failing
any release build until the owner pastes the real Android API key in.

---

## 7. Apple: personal account first, company account later

**The founder's decision, 29 September 2026.** Apple is done in two stages.
Google Play is not affected and is still enrolled as the organisation.

1. **Now.** The app is registered, signed and submitted under the founder's
   PERSONAL Apple Developer account (an Individual enrolment, which needs no
   D-U-N-S number). That unblocks TestFlight and submission.
2. **Later.** When the VALLO SPACES LTD Organization enrolment completes (it
   needs the D-U-N-S number), the app is transferred from the personal account
   to the company account with Apple's app transfer.

No code or architecture changes. Only the account the app is first
registered and signed under changes, and with it the Team ID.

### What an App Store app transfer involves

Everything in this section marked **[VERIFY]** is from general knowledge of
Apple's process, not from Apple's documentation read on the day. Check each
against Apple's current "Transfer an app" page in the App Store Connect help
before relying on it.

- **It is done in App Store Connect**, started by the Account Holder of the
  personal account and accepted by the Account Holder of the company account.
- **Prerequisites [VERIFY]:**
  - both accounts are in good standing, and the company account has accepted
    the latest agreements (the Paid Apps agreement too, if the app ever has
    paid features);
  - no version of the app is in review or waiting for review, and no TestFlight
    build is in beta review;
  - at least one version of the app has been released on the App Store (an app
    that was never released cannot be transferred).
- **What stays the same:** the bundle identifier `com.vallospaces.app`, the App
  Store record, its reviews and ratings.
- **What does not come across [VERIFY]:** TestFlight builds and testers,
  certificates, provisioning profiles, and keys. Plan to re-invite testers.
- **The Team ID changes.** The App ID prefix is the Team ID, so every place
  that carries the old one must be updated to the new Team ID straight after
  the transfer:
  - `apps/web/public/.well-known/apple-app-site-association`: the `appIDs`
    entry becomes `<new Team ID>.com.vallospaces.app`, then deploy and confirm
    at `https://app-site-association.cdn-apple.com/a/v1/www.vallospaces.com`;
  - the entitlements in `apps/web/ios/App/App/App.entitlements` (Associated
    Domains, push) and the capabilities on the App ID, re-enabled in the new
    team, with new provisioning profiles and a new distribution certificate;
  - the GitHub Actions secret `APPLE_TEAM_ID` (read by
    `.github/workflows/native-ios.yml`), and the App Store Connect API key
    secrets `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` and
    `APP_STORE_CONNECT_KEY_P8_BASE64`, because an API key belongs to the
    account that created it;
  - Associated Domains (`applinks:www.vallospaces.com`) on the new App ID.
- **The APNs key belongs to the account.** A key made in the personal account
  stops being usable for the app once it moves [VERIFY the exact moment].
  Create a new APNs key in the company account and replace `APNS_KEY_ID`,
  `APNS_TEAM_ID` and `APNS_PRIVATE_KEY` in Vercel.
- **Sign in with Apple is tied to the team.** The Services ID and the Sign in
  with Apple key belong to the account, so the Apple provider settings in the
  Supabase dashboard (client IDs and the secret generated from the key, Team
  ID and Key ID) must be remade from the company account. They are not app
  environment variables (`docs/DEPLOY.md` section 2.4). **[VERIFY, and this is the one that can lose people:]** the user
  identifier Apple gives an app is scoped to the team, so after a transfer an
  existing Apple sign-in may arrive with a new identifier. Apple provides a
  user migration process (transfer identifiers) for this, with a time limit.
  Read Apple's "Transferring your apps and users to another team" guidance
  before starting the transfer, not after.

### For the founder: the name on the App Store

While the app sits in the personal account, the seller and developer name the
App Store shows is the account holder's personal legal name, not VALLO SPACES
LTD [VERIFY]. The privacy policy and the terms name VALLO SPACES LTD as the
company people deal with. **Flagged for the founder:** decide, with legal
advice, whether the privacy policy and terms need a note explaining that the
app is published by you personally on the company's behalf until the transfer.
Nothing has been written into them. If the app is offered in the EU, Apple's
trader status declaration may also publish the account holder's contact
details [VERIFY].

The earlier advice in this repository to enrol on Apple only as the
organisation is superseded by this plan. Its reason (`docs/THE_AUDIT.md`
STORE-09) was the custodial wallet, which was retired on 25 September 2026.
Whether Apple's guideline 5.1.1(ix) still expects this app to come from the
legal entity is **[VERIFY]**; the transfer answers it either way once it is
done.
