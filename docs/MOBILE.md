# Mobile build and release

How to build, sign and ship the Android and iOS applications. The reasoning
behind the architecture is in `docs/MOBILE_READINESS.md`; this file is the
operating manual.

Written 2026-08-07, against Capacitor 8.5.0.

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
export CAPACITOR_SERVER_URL="https://rentme.ng"    # the production origin
```

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
CAPACITOR_SERVER_URL="https://rentme.ng" npx cap sync
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
  read `<TeamID>.ng.rentme.app`.

### iOS associated domains
- [ ] `apps/web/ios/App/App/App.entitlements` exists and is deliberately inert:
  `CODE_SIGN_ENTITLEMENTS` is not set in the project file, because setting it
  fails every build until the Associated Domains capability exists on a real App
  ID. The three activation steps are written inside the file.

### Store listings
- [ ] Bundle identifier `ng.rentme.app` reserved on both stores
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
| The config loads and syncs | `npx cap sync`, succeeded, 5 plugins found for each platform |
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

**One template dependency left in place deliberately.** The Android build
resolves `com.google.gms:google-services`, which is Capacitor's scaffolding for
Firebase. This product has no Firebase, no push and no `google-services.json`,
so the plugin is never applied, only the classpath entry resolves. It was left
alone rather than removed because no Gradle build can be run here to prove the
removal safe, and an unverified edit to a build file is worse than an unused
dependency. Remove it when somebody can build.
