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
