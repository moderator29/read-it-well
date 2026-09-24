# Store: the founder's steps

Only what the code cannot do by itself. Each step says where to click and what
changes when it is done. Written 23 September 2026.

## 1. Sign in with Apple (STORE-02)

The code is finished and switched off. It switches ON by itself, on the
website and in the iPhone app, the moment Supabase reports the Apple provider
enabled (the sign-in screens ask Supabase every five minutes). You need an
Apple Developer account (organisation, VALLO SPACES LTD) first.

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

## 6. The native build, on a Mac (STORE-04, STORE-15)

1. `npm ci`, then `CAPACITOR_SERVER_URL=https://www.vallospaces.com npm run cap:sync --workspace @vallo/web`.
   This refuses until section 3 is done; use `cap:sync:dev` for a test build.
2. Open `apps/web/ios/App/App.xcodeproj`. In Signing & Capabilities add Push
   Notifications and Associated Domains (Xcode adopts `App/App.entitlements`).
3. In Vercel: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (from an APNs
   `.p8` key), and `APNS_PRODUCTION=true` for App Store builds.
4. Put the Firebase Android API key into `apps/web/android/app/google-services.json`
   (`current_key`). It is not a secret.
5. Record 30 seconds for the review notes: a push arriving, the share sheet on
   a listing, and "Take a photo" in the listing wizard.

## 7. Account deletion: two things only you can settle (SEC-13, STORE-P2-02)

1. **The AML retention period.** When an approved agent deletes their account,
   their identification is kept for five years: the identity and agency
   documents, and the name, address, ID number, business registration and
   payout details. This follows `docs/RETENTION_SCHEDULE.md` 3.1, and the
   privacy notice §7 says it. Confirm the period with counsel. If it changes,
   change the interval in `purge_account_rows` and the notice in the same
   commit. The records are stamped `agent_applications.kyc_retain_until`.
   Nothing expires before 2031, and the job that destroys them on that date
   is a recorded follow-up. It is not built yet.
2. **The key in the vault.** A deleted account keeps a keyed hash of its
   mailbox, so staff can see when a new account uses the same mailbox. The
   key is the Supabase Vault secret `account_identity_pepper`.
   - Include the Vault in any backup or restore plan. A restored database
     without the key can no longer match erased mailboxes.
   - Never rotate the key without re-hashing every erased row.
