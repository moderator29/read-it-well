# Store: the founder's steps

Only what the code cannot do by itself. Each step says where to click and what
changes when it is done. Written 23 September 2026.

## 1. Sign in with Apple (STORE-02)

The code is finished and switched off. It switches ON by itself, on the
website and in the iPhone app, the moment Supabase reports the Apple provider
enabled (the sign-in screens ask Supabase every five minutes). You need an
Apple Developer account (organisation, VALLO SPACES LTD) first.

> **A precondition, not a step: do not enable Apple (or Google) in Supabase
> yet.** An account made through a provider never passes the sign-up form, so
> today it records no agreement to the Terms and no 18-or-over statement
> (STORE-19, NEW-A4-04). Email sign-up asks for both and refuses without them.
> The provider path must first hold a new account at a step that asks for both
> and records them. That is engineering work, noted in
> `apps/web/src/lib/auth/providers.ts`. Until it ships, email is the only way
> in, which is also the recorded decision.

1. **Apple Developer → Certificates, Identifiers & Profiles → Identifiers →
   the App ID `com.vallospaces.app`.** Tick **Sign In with Apple**, save.
2. **Identifiers → + → Services IDs.** Identifier `com.vallospaces.signin`
   (any name you like, it is the "Services ID"). Tick Sign In with Apple →
   Configure → Primary App ID `com.vallospaces.app`; Domains
   `uccixoonmbhrnyczyigt.supabase.co`; Return URL
   `https://uccixoonmbhrnyczyigt.supabase.co/auth/v1/callback`. Save.
3. **Keys → +.** Tick Sign In with Apple → Configure → the same App ID. Download
   the `.p8` (it downloads once). Note the Key ID and your Team ID
   (Membership details).
4. **Supabase dashboard → Authentication → Sign In / Providers → Apple → Enable.**
   - Client IDs: `com.vallospaces.signin,com.vallospaces.app` (the Services
     ID for the website, the bundle ID for the native sheet; both, comma
     separated).
   - Secret key: generate it from the `.p8`, Team ID, Key ID and Services ID
     with Supabase's own generator linked on that panel. **It expires after six
     months**; put a reminder in the calendar.
   - Save.
5. **The iPhone app only:** it also needs the `SignInWithApple` plugin in the
   binary. It is added to `apps/web/package.json` with the other native
   plugins; on the Mac that builds the app run
   `npm ci && CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web`,
   then in Xcode → App target → Signing & Capabilities → **+ Sign In with
   Apple** (Xcode adopts `App/App.entitlements`, which already carries it).

That is all. Nothing in Vercel changes. To switch Apple off again without the
dashboard: set `VALLO_SOCIAL_SIGN_IN=none` in Vercel and redeploy.

## 2. Google sign-in is off (STORE-02, STORE-03)

The recorded decision is email and password only. The app no longer draws
"Continue with Google", refuses to start it, and ends any Google session that
reaches the callback. **One step makes the refusal complete at the source:**

- **Supabase dashboard → Authentication → Sign In / Providers → Google →
  Disable.** Until then someone could still build the Google URL by hand; the
  app ends that session, but Supabase would still create the account.

Your own account was made with Google and already has a password: sign in with
**email and password**. If you do not know it, use **Forgot password** on the
email sign-in screen.

To reverse the decision for the website only (never the apps, where it cannot
complete): `VALLO_SOCIAL_SIGN_IN=google` in Vercel.

## 3. Deep links (STORE-03, DOC-13)

`npm run cap:sync` refuses to sync a native build until these are real, and CI
marks every run with them.

- **Apple Team ID** into `apps/web/public/.well-known/apple-app-site-association`:
  replace `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID` with the ten-character Team
  ID (Membership details), so the entry reads `ABCDE12345.com.vallospaces.app`.
- **Two SHA-256 fingerprints** into `apps/web/public/.well-known/assetlinks.json`:
  Play Console → the app → Test and release → Setup → App signing → "App
  signing key certificate" SHA-256, and the "Upload key certificate" SHA-256.
  Both, uppercase, colon separated, replacing the two placeholders.
- Then `npm run check:deep-links --workspace @vallo/web` must print "both
  association files are real", and the `continue-on-error: true` line under
  "Deep links (founder values)" in `.github/workflows/ci.yml` can be deleted.

## 4. The reviewer account (STORE-10)

Both stores need a login a reviewer can use. The script creates one account,
accepts the Terms and Privacy versions the app serves today (it reads them
from `apps/web/src/lib/legal/versions.ts`), and proves the login works.

```
SEED_REVIEWER_EMAIL=appreview@vallospaces.com SEED_REVIEWER_PASSWORD='<12+ characters>' \
NEXT_PUBLIC_SUPABASE_URL=https://uccixoonmbhrnyczyigt.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the publishable key> SUPABASE_SERVICE_ROLE_KEY=<service role key> \
node scripts/seed/store-reviewer.mjs --dry-run
```

Run it once with `--dry-run`, then again without it. Paste the address and
password into App Store Connect → App Review Information → Sign-In
Information, and into Play Console → App content → App access. **Run it again
after any change to PRIVACY_VERSION or TERMS_VERSION**, so the reviewer is
not asked to accept again halfway through a review.

## 5. The sign-in wall (STORE-P2-04)

Your decision. `VALLO_PUBLIC_CATALOGUE=on` in Vercel (Production), then
redeploy. Strangers can then read search, stays, restaurants and each
listing. Profiles, messages and money stay behind sign-in either way. Unset
it to close the catalogue again.

## 6. The native build and native push, on a Mac (STORE-04, STORE-15)

**Where it stands, measured on 24 September 2026:**
- The push plugin IS in both native projects (`ios/App/CapApp-SPM/Package.swift`,
  `android/capacitor.settings.gradle`) and in the lockfile.
- The server has both transports (`lib/push/transport/apns.ts`, `fcm.ts`).
- The iPhone home-screen web push path is proven on the server.
- **No native notification has ever reached a device.**
- The four things only you can supply are listed below.
- Until they exist, the drain simply leaves native rows queued, so nothing is
  lost by waiting. `describeCredentials()` in `lib/push/credentials.ts` names
  whatever is missing.

**Android (Firebase, free):**
1. Firebase console → a project → add an Android app with package
   `com.vallospaces.app`.
2. Download `google-services.json` into `apps/web/android/app/`, replacing the
   placeholder. Today `current_key` reads
   `PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE`, and the release build refuses
   on purpose until it is replaced. The file is not a secret; commit it.
3. Project settings → Service accounts → Generate new private key. In Vercel
   (Production), set `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_JSON` (the whole
   JSON, one line). **This one is a secret.**

**iPhone (APNs, needs the 99 USD Apple Developer membership):**
4. Certificates, Identifiers & Profiles:
   - On the App ID `com.vallospaces.app`, enable Push Notifications, Sign in
     with Apple and Associated Domains.
   - Under Keys, create a key with Apple Push Notifications service. The `.p8`
     downloads **once**.
5. In Vercel (Production), set:
   - `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_PRIVATE_KEY` (the `.p8` contents);
   - `APNS_PRODUCTION=true` for TestFlight and App Store builds. A development
     build's sandbox token sent to the production gateway fails with
     BadDeviceToken.
   - `APNS_BUNDLE_ID` is optional. It defaults to `com.vallospaces.app`.

**The build:**
6. Run `npm ci`, then
   `CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web`.
   This refuses until section 3 (deep links) is done. Use `cap:sync:dev` for a
   test build.
7. Open `apps/web/ios/App/App.xcodeproj`. In Signing & Capabilities, add Push
   Notifications, Sign in with Apple and Associated Domains. Xcode adopts
   `App/App.entitlements`.
   - `aps-environment` reads `development` in the file. Archiving for
     distribution signs it as `production` from the distribution profile.
     Check the archive's entitlements once.
8. For Android, run `./gradlew bundleRelease`. It writes
   `app/build/outputs/bundle/release/app-release.aab`, which is what Play
   accepts; an APK is not. Enrol in Play App Signing on the first upload.

**The proof, before submission:**
9. On a real iPhone and a real Android phone, both signed in:
   - Turn on notifications in Settings → Notifications and check a row
     appears in `/settings/devices`.
   - Have the other QA account send a message, and watch it arrive with the
     app closed.
10. Record 30 seconds for the review notes: a push arriving, the share sheet
    on a listing, and "Take a photo" in the listing wizard.

**Still owed, and small:**
- Android shows the browser's generic mark in the status bar, because there is
  no monochrome Vallo notification icon. The fix is one 72×72 white-on-transparent
  PNG, which goes with the icon work in section 8.

## 7. Account deletion: two things only you can settle (SEC-13, STORE-P2-02)

1. **The AML retention period.** When an approved agent deletes their account,
   their identification is kept for five years: the identity and agency
   documents, and the name, address, ID number, business registration and
   payout details. This follows `docs/RETENTION_SCHEDULE.md` 3.1, and the
   privacy notice §7 says it. Confirm the period with counsel. If it changes,
   change the interval in `purge_account_rows` and the notice in the same
   commit. The records are stamped `agent_applications.kyc_retain_until`.
   Nothing expires before 2031. On that date the daily account-purge job
   destroys them: it removes the files first, then the rows, and writes an
   audit line (`account.kyc.destroyed`).
2. **The key in the vault.** A deleted account keeps a keyed hash of its
   mailbox, so staff can see when a new account uses the same mailbox. The
   key is the Supabase Vault secret `account_identity_pepper`.
   - Include the Vault in any backup or restore plan. A restored database
     without the key can no longer match erased mailboxes.
   - Never rotate the key without re-hashing every erased row.

## 8. The icon master, for the designer (STORE-18)

The stores accept today's icon, so this is craft, not a blocker. The current
art is a rounded tile with its own glowing border, drawn inside a square
(`public/brand/vallo-icon.png`). Each OS then applies its own mask, and the
result is a ring and dark corners inside Apple's squircle, and a small tile on
Android. What to commission, as files:

| File | Size | What it is |
|---|---|---|
| `vallo-icon-master.png` | 1024×1024, RGB, **no alpha** | The mark on the navy ground `#010118`, **full bleed**. No drawn tile, border, rounded corners or glow at the edge: the OS draws the shape. Keep the mark inside the centre 80%. No wordmark (at 60 px it is texture). |
| `vallo-icon-foreground.png` | 432×432, **transparent** | The mark alone, for Android's adaptive icon. Keep it inside the centre 66% (the part every launcher mask keeps). |
| `vallo-icon-monochrome.png` | 432×432, transparent, one flat colour | The same mark as a silhouette. Android 13 themed icons use it, and so does the status-bar notification icon (a 72×72 export of it, white on transparent). |
| `splash-mark.png` | 1024×1024, transparent | The mark only. It is centred on exactly `#010118`, so no square shows around it. |

Then run `node scripts/build-native-icons.mjs` and `npx @capacitor/assets
generate`. Put back the full-bleed Android background (the note in the script
says how; `lib/theme/native-chrome.test.ts` fails until it is back), and check:
- on an iPhone home screen, no ring inside the rounded shape;
- on a Pixel with circle and squircle masks, the mark is whole and not tiny;
- the splash shows no visible square.
