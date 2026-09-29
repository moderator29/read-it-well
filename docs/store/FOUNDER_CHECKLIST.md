# Getting Vallo into the App Store and Google Play: your checklist

Written 28 September 2026, for you rather than for a developer. Each item says
where to go, what to click and what to copy. When you have done one, send the
copied value to whoever is doing the engineering (or paste it into a Claude
session) and they finish it in the code. The technical version of all of this
is `docs/VALLO_NATIVE_RELEASE_AUDIT.md`.

Two rules the whole way through:

- **Never paste a password, a `.p8` key file or a keystore into a chat, an email
  or the code.** Where something is secret, this list says so and says where it
  goes instead (GitHub's encrypted "secrets" or Vercel's settings).
- **Apple is two stages (your decision, 29 September 2026).** You register,
  sign and submit the iPhone app under your PERSONAL Apple Developer account
  first, so TestFlight and submission are not held up. Once VALLO SPACES LTD's
  own Apple enrolment is complete (it needs the D-U-N-S number), the app is
  transferred to the company account. The transfer, and everything that must
  be redone after it, is in `docs/MOBILE.md` section 7. **Google Play is still
  the company, VALLO SPACES LTD, from the start.**

---

## 1. Enrol with Apple

**Stage 1, now: your personal account.**

1. Go to **developer.apple.com/programs/enroll**, sign in with your own Apple
   ID (two-factor authentication on), and enrol as an **Individual**. No
   D-U-N-S number is needed for this.
2. Pay the 99 USD yearly fee when asked.
3. When you get the "Welcome" email, go to **developer.apple.com**, **Account**,
   **Membership details**. Copy the **Team ID** (10 letters and numbers).
   → Send it over. It is not secret.
4. Note: while the app is in your personal account, the App Store shows your
   own legal name as the seller, not VALLO SPACES LTD (to be confirmed on
   Apple's side). Decide with your lawyer whether the privacy policy and terms
   need a line about that. Nothing has been changed in them.

**Stage 2, later: the company account, then the transfer.**

1. When Dun & Bradstreet emails your D-U-N-S number, enrol again at
   **developer.apple.com/programs/enroll** with a company Apple ID, choose
   **Organization**, and enter the company details exactly as they appear on
   the D-U-N-S record. Pay the fee; Apple may phone to verify.
2. Send over the company account's **Team ID**.
3. Transfer the app from your personal account to the company account in App
   Store Connect. Read `docs/MOBILE.md` section 7 first: the Team ID changes,
   and the push key, the Sign in with Apple setup, the GitHub build secrets
   and the link file all have to be redone for the new account.

## 2. Register the app with Apple

1. **developer.apple.com**, **Certificates, IDs & Profiles**, **Identifiers**,
   the **+** button, **App IDs**, **App**.
2. Description: `Vallo`. Bundle ID: **Explicit**, `com.vallospaces.app`
   (exactly this, it can never change).
3. Tick **Associated Domains**, **Push Notifications** and **Sign In with
   Apple**. Continue, Register.
4. Go to **appstoreconnect.apple.com**, **Apps**, **+**, **New App**: platform
   iOS, name `Vallo`, language English, bundle ID `com.vallospaces.app`, SKU
   `vallo-ios`.

## 3. Get the push notification key (APNs)

1. **developer.apple.com**, **Certificates, IDs & Profiles**, **Keys**, **+**.
2. Name it `Vallo push`, tick **Apple Push Notifications service (APNs)**,
   Continue, Register, **Download**. The `.p8` file downloads **once only**;
   keep it safe (a password manager). Note the **Key ID** shown on that page.
3. **This one is secret.** Do not email it. Put it in **vercel.com**, the
   project `read-it-well-web`, **Settings**, **Environment Variables**,
   Production, adding four variables:
   - `APNS_KEY_ID` = the Key ID
   - `APNS_TEAM_ID` = your Team ID
   - `APNS_PRIVATE_KEY` = open the `.p8` in a text editor, copy everything
   - `APNS_PRODUCTION` = `true`
4. This key belongs to the account that made it. After the transfer to the
   company account, make a new one there and replace the first three values.

## 4. Let GitHub build and sign the iPhone app

1. **appstoreconnect.apple.com**, **Users and Access**, **Integrations**,
   **App Store Connect API**, **Team Keys**, **+**. Name `GitHub build`, access
   **App Manager**. Download the key (once only). Copy the **Key ID** and the
   **Issuer ID** shown on that page.
2. **github.com/moderator29/read-it-well**, **Settings**, **Secrets and
   variables**, **Actions**, **New repository secret**, four times:
   - `APPLE_TEAM_ID` = your Team ID
   - `APP_STORE_CONNECT_KEY_ID` = the Key ID
   - `APP_STORE_CONNECT_ISSUER_ID` = the Issuer ID
   - `APP_STORE_CONNECT_KEY_P8_BASE64` = on a Mac, open Terminal and run
     `base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8 | pbcopy` (use your file's
     name), then paste.

## 5. Set up Google Play

1. Go to **play.google.com/console**, sign up as an **Organization** (25 USD,
   once). Google verifies the organisation; this can take a few days.
2. **Create app**: name `Vallo`, default language English, App, Free. Accept the
   declarations.
3. Tell the engineer when this is done: the first build has to be uploaded
   before step 7 can be finished.

## 6. Add the Firebase Android key (for Android notifications)

1. Go to **console.firebase.google.com**, open the project **vallo-44059**.
2. The gear icon, **Project settings**, **General**, scroll to **Your apps**,
   the Android app `com.vallospaces.app`.
3. Click **google-services.json** to download it.
   → Send the file over. It is **not** secret: the key inside ships in every
   copy of the app and only works for Vallo. (The secret half, the service
   account, is already set up in Vercel.)

## 7. Add the Play signing fingerprints (so shared links open the app)

After the engineer has uploaded the first Android build to Play's **Internal
testing**:

1. **play.google.com/console**, Vallo, **Test and release**, **Setup**, **App
   signing**.
2. Copy the **SHA-256 certificate fingerprint** under **App signing key
   certificate**, and the one under **Upload key certificate**.
   → Send both over. They are not secret.

## 8. What the engineer does with what you send

| You send | It goes into |
| --- | --- |
| Team ID (personal now, the company's after the transfer) | `apple-app-site-association` (so links open the iPhone app) and the `APPLE_TEAM_ID` build secret |
| `google-services.json` | the Android project (turns on Android notifications) |
| Two SHA-256 fingerprints | `assetlinks.json` (so links open the Android app) |

Once all three are in, the builds are made and uploaded, the app is tested on
real phones, and both stores' listings (screenshots, privacy answers, reviewer
login) are filled in from the prepared text in `docs/store/`.

## Already done, nothing for you to do

- The Firebase service account for Android notifications is in Vercel.
- GitHub now builds the Android app automatically on every relevant change,
  and compiles the iPhone app (unsigned) the same way.
