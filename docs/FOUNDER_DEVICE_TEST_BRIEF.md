# Founder device test brief

6 October 2026.

**The ask:** spend about ninety minutes with your iPhone and your Android
handset and run the nine P0 steps below. **Why:** no row of the 34-row native
test matrix has ever been run on a real device, no automated session can do it
(they run on Linux with no phone), and the last time this gap mattered a broken
screen reached every tester while thousands of tests passed. This is the single
highest-value action on the project (directive D43).

You do not need to be technical. You tap, you look, and you write down what
you saw. The record goes into `VALLO_NATIVE_TEST_MATRIX.md` (Observed, Result
and Evidence columns for each row).

## Count correction

The project notes say ten P0 rows. The matrix has **nine**: rows 1, 2, 3, 4,
7, 9, 21, 23 and 29. This brief covers those nine and nothing else.

## Read this first: row 21 and money

Row 21 is a card payment. **Use Paystack TEST keys and Paystack test cards
only. Never a real card against a live key.** A live key on a device test moves
real money.

There is a trap. The native app loads the production website
(`https://www.vallospaces.com`), and Production uses the LIVE Paystack key.
Test mode is refused on Production unless `PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION`
is exactly "yes" (`apps/web/.env.example`). So with the current builds, a
payment in the app is probably a live payment. Before step 7, open
`/admin/payments` on the website: it shows which mode is in use. If it says
live, **skip row 21 and write "skipped, app points at live Paystack"**. Do not
enter a real card to "see if it works". Testing row 21 properly needs a build
pointed at a test-mode deployment, which does not exist yet (engineering item).

## What to install

**iPhone.** Open the TestFlight app (App Store, free) and sign in with the
Apple ID that is on the App Store Connect team. A signed build was uploaded to
App Store Connect on 3 October (run 37103086939), so one may already be
waiting. In App Store Connect, open the app, TestFlight tab: the build must
show as processed, and you must be added as an internal tester. If no build
appears, I could not verify its state from here; the fallback is to run the
"Native iOS" workflow by hand with "upload" ticked.

**Android.** The debug APK is built on every run of
`.github/workflows/native-android.yml` (pushes to main touching the Android
files, pull requests, or "Run workflow" by hand). Click path:

1. github.com, the repository, **Actions** tab.
2. Click **Native Android** in the left list, then the latest run with a green
   tick.
3. Scroll to **Artifacts** at the bottom of the run page and download
   `vallo-android-debug-<commit>` (a zip, kept 14 days; if expired, use **Run
   workflow** and wait for the build).
4. Unzip on the phone or send it to the phone; you get `app-debug.apk`. Tap it
   and allow "install unknown apps" for your file app when asked.
5. The same run page also has `android-emulator-smoke-<commit>`: four
   screenshots from an emulator, a free preview of rows 1, 2 and 23.

## The nine steps

For each: do it, compare with "should happen", and if not, write down exactly
what you saw and take a screenshot or screen recording.

1. **Row 1, fresh install, first launch, online (both phones).** Delete the app
   if present, install, open it with Wi-Fi on. Should happen: splash, then the
   Welcome screen (you are signed out); no white flash; the clock and battery
   at the top are readable. Write down: any white or blank screen, how long it
   lasted.
2. **Row 2, launch with no internet (both).** Close the app fully, turn on
   airplane mode, open it. Should happen: splash goes away and a Vallo-branded
   "offline" card appears; turn airplane mode off, tap **Try again**, and the
   app loads. Write down: a stuck splash, a blank page, or Try again doing
   nothing.
3. **Row 3, sign in as an existing user (both).** Sign in with an account that
   exists. Should happen: you land on Home, the bottom dock is visible, and the
   keyboard never covers the Sign in button. Write down: where you landed and
   what the keyboard covered.
4. **Row 4, sign up as a new user and tap the email link (both).** Create an
   account with an email you can open on the same phone, then tap the
   confirmation link in the email. Should happen: the link opens the Vallo app
   (not the browser) and you are signed in. **Expect a configuration failure on
   Android**, see the next section. Write down: whether the link opened the app
   or the browser, and where you ended up.
5. **Row 7, stay signed in after closing (both).** Signed in, swipe the app
   away, reopen. Should happen: still signed in. Write down: any sign-in screen.
6. **Row 9, log out, close, reopen (both).** Log out, swipe the app away,
   reopen. Should happen: you are signed out. Then sign in again on the web or
   another device and open Settings, Devices: this phone's push entry should be
   gone. Write down: still signed in, or the device still listed.
7. **Row 21, Paystack card payment (both), TEST KEYS ONLY.** Only after the
   `/admin/payments` check above shows test mode. Pay for a booking with a
   Paystack test card. Should happen: the checkout appears inside the app, the
   3-D Secure step completes inside the app (no jump to the browser), and the
   booking shows paid. Write down: where it went wrong and the exact message.
8. **Row 23, Android back button (Android only).** Open a bottom sheet and press
   back; open a screen inside another screen and press back; on the main screen
   press back. Should happen: the sheet closes; you go to the parent screen;
   at the top level the app exits. Write down: any press that did the wrong
   thing, or exited too early.
9. **Row 29, delete the account (both).** Use a throwaway account, never a real
   one. Settings, delete account, confirm. Should happen: you are signed out,
   signing in with it is refused, and no more notifications arrive. Write down:
   any step that let you back in.

## Evidence

Take a screenshot or a screen recording for every step, pass or fail. The
matrix does not set a file name convention (it says only "a screenshot, screen
recording or log file name"), so use this: `row<number>-<ios|android>-<pass|fail>.png`
(or `.mp4`), for example `row04-android-fail.mp4`. Put the file name in the
Evidence column of the matrix and "PASS", "FAIL" or "BLOCKED" in Result.

## What will fail for a configuration reason, not a defect

Do not chase these; mark them BLOCKED with the reason.

- **Android, row 4 (and the Android half of any link opening the app):**
  `apps/web/public/.well-known/assetlinks.json` still holds two PLACEHOLDER
  fingerprints. `node scripts/check-deep-links.mjs --platform=android` reports
  "DEEP LINKS ARE DEAD". Android links open the browser. Real values need the
  Play Console account and a keystore (founder-blocked).
- **iOS, row 4:** the iOS association file is real per
  `check-deep-links.mjs --platform=ios` ("the iOS association file is real"),
  so the link should open the app. If it does not, that is worth reporting.
- **Android push:** `google-services.json` still holds the placeholder
  `PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE`, so the debug APK has no
  Firebase and notifications cannot work. No P0 row depends on push, but row
  9's Devices check may show nothing on Android for that reason.
- **Row 21:** see the warning above; likely not testable until a test-mode
  build exists.

## What this pass does NOT test

Ninety minutes on nine rows is a smoke test, not coverage. Not tested: the 25
other matrix rows (push receive and tap, camera, photo and document upload,
maps and location, share sheet, keyboard layout, offline mid-form, notch and
home indicator, themes, rotation, reinstall, upgrade, external links, App Links
verification); the oldest supported iOS (15) and Android 10 or 11 handsets,
which the matrix asks for because their behaviour differs; and any release
(signed, minified) Android build, which does not exist. The P1 and P2 rows
remain NOT RUN.
