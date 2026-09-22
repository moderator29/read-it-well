# Store rejection risk research: Vallo on the App Store and Google Play

Research date: 22 September 2026.
Subject: `com.vallospaces.app`, a Capacitor 8.5 shell (`apps/web/capacitor.config.ts:64`) loading a remote Next.js 16 origin.
Publisher: VALLO SPACES LTD, a Nigerian private company limited by shares.

## 0. How to read this document

Every risk below is written in the same five parts.

1. **The rule.** The guideline or policy number and what it actually requires, quoted or paraphrased tightly from the source fetched during this research.
2. **What we do today.** Our repository, cited as `path:line`. Nothing in this section is asserted without a line reference.
3. **Verdict.** One of `BLOCKER` (we will be rejected), `RISK` (a reviewer could reasonably reject, or we will be rejected on a later pass), `CLEAR` (verified compliant).
4. **Fix.** An instruction a build agent can carry out with no further research: which file, what to add, what the copy says.
5. **Founder.** Only where the fix cannot be done from inside the repository. Those are collected again in Part F so the founder has one list.

British spelling throughout. No claim is made about anything that was not opened and read; see the honesty log in Part G for the list of things that could not be verified from here.

---

## 1. Ranked summary

### 1.1 Will get us rejected on submission one (Apple)

| # | Risk | Guideline | Where |
|---|---|---|---|
| A1 | Sign in with Google is wired, Sign in with Apple is not, and the OAuth return journey is broken on the native shell so Google sign-in cannot complete at all | 4.8, 2.1 | `apps/web/src/lib/auth/providers.ts:69`, `apps/web/src/lib/native/deep-links.ts:62-64`, `apps/web/public/.well-known/apple-app-site-association:8-11` |
| A2 | Associated Domains entitlement is inert, and the AASA file carries a placeholder Team ID, so universal links never verify | 2.1 | `apps/web/ios/App/App/App.entitlements:6-14`, `apps/web/public/.well-known/apple-app-site-association:5` |
| A3 | A social feed with no filter for objectionable material, no EULA acceptance, and no report or block control anywhere in one-to-one messaging | 1.2 | `supabase/migrations/20260804105404_social_content_core.sql:292-325`, `apps/web/src/app/(app)/messages/[id]/ThreadOptionsSheet.tsx:14-19` |
| A4 | Airplane-mode launch shows a blank web view, not our offline card, because `server.url` is set and no `errorPath` is configured | 4.2 | `apps/web/capacitor.config.ts:146-156`, `apps/web/native-shell/index.html:160-167` |
| A5 | The location purpose string states the position never leaves the device; two code paths send it to our server | 5.1.1(ii), 5.1.5 | `apps/web/ios/App/App/Info.plist:91` versus `apps/web/src/components/app/listing/TravelTime.tsx:83-95` and `apps/web/src/components/host/HostWizard.tsx:607-620` |
| A6 | A shipped control that cannot work: `TravelTime` posts to `/api/travel-time`, which does not exist in the route tree | 2.1 | `apps/web/src/components/app/listing/TravelTime.tsx:86`; no `apps/web/src/app/api/travel-time` directory exists |
| A7 | Forty two fabricated property listings are browsable in production and will be the first thing a reviewer sees | 2.1, 1.1.6 | `apps/web/src/lib/listings/syndication.ts:9-16` |
| A8 | The privacy policy claims analytics collection and analytics cookies that the codebase does not perform, so the policy, the privacy label and the Data safety form cannot all be true | 5.1.1(i) | `apps/web/src/lib/legal/privacy.tsx:162`, `apps/web/src/lib/legal/privacy.tsx:312` versus `apps/web/package.json:14-33` |
| A9 | No demo account and no built-in demo mode; the product is browsable signed out but every transacting feature is behind a wall | 2.1(a) | `apps/web/src/proxy.ts:54-88` |

### 1.2 Will get us rejected on submission one (Google Play)

| # | Risk | Policy | Where |
|---|---|---|---|
| G1 | No in-app block control on one-to-one messaging, and no report control on a conversation | User Generated Content | `apps/web/src/app/(app)/messages/[id]/ThreadOptionsSheet.tsx:14-19` |
| G2 | `assetlinks.json` carries two placeholder fingerprints, so App Links never verify | not a rejection by itself, but a Pre-launch report finding and a broken product | `apps/web/public/.well-known/assetlinks.json:8-9` |
| G3 | Data safety form cannot be answered truthfully as the manifest comment instructs, because precise location does leave the device | Data safety accuracy | `apps/web/android/app/src/main/AndroidManifest.xml:254-258` versus `apps/web/src/components/app/listing/TravelTime.tsx:86` |
| G4 | Crypto market surface plus a crypto funding route into a custodial naira wallet, with no Financial Features declaration decision made | Cryptocurrency Exchanges and Software Wallets, Financial Features | `apps/web/src/app/(app)/crypto/page.tsx:24-36`, `CRYPTO_DEPOSITS.md:1-9` |
| G5 | Fabricated inventory presented as a marketplace catalogue | Misrepresentation, Deceptive Behaviour | `apps/web/src/lib/listings/syndication.ts:9-16` |

### 1.3 Will get us rejected on a later update

| # | Risk | Rule | Where |
|---|---|---|---|
| L1 | Builds must be made with Xcode 26 or later against the iOS 26 SDK; this is already in force since 28 April 2026 | Apple SDK minimum | build machine, not the repository |
| L2 | Play target API level 36 required for new apps and updates from 31 August 2026; we already target 36, so this is a "do not regress" item | Play target API | `apps/web/android/variables.gradle:2-4` |
| L3 | Age rating questionnaire answers, including the social media questions, are required with every submission from September 2026; a social feed forces a 13+ floor | Apple age ratings | product fact, see Part D.6 |
| L4 | 16 KB page size support required for updates from 1 May 2026, enforced from 1 February 2027 | Play 16 KB | no `.so` files found under `apps/web/android`, so currently satisfied |
| L5 | Play developer verification (D-U-N-S for organisation accounts) enforcement expands globally in 2027 | Play developer verification | founder action |

### 1.4 Merely risky

| # | Risk | Rule |
|---|---|---|
| R1 | 4.2 minimum functionality: the native capability set is thin (status bar, splash, keyboard, back button, deep links, external browser handoff) and contains no push, no biometrics, no share sheet, no widgets |
| R2 | 2.5.2 self-contained bundles: a shell whose entire UI is served remotely |
| R3 | 4.7 mini apps and chatbots: we ship an AI assistant |
| R4 | 3.1.1 versus 3.1.3(e): a stored-value naira wallet funded by card could be read as in-app currency |
| R5 | 5.1.1(ix) highly regulated fields: wallet, escrow, payouts and a crypto on-ramp, submitted by a company whose RC number is not yet in the codebase |
| R6 | Privacy manifest (`PrivacyInfo.xcprivacy`) absent from our own App target |
| R7 | Support contact is a web form rather than a mailbox, and `NEXT_PUBLIC_SUPPORT_EMAIL` is unset |
| R8 | The privacy policy omits the RC number and the NDPC registration because both constants are null |

---

# Part A. Apple App Store, guideline by guideline

## A.1 Guideline 4.2, Minimum Functionality

### The rule

"Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store." 4.2.2 adds that "other than catalogs, apps shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."

Two practical enforcement behaviours are well documented in recent write-ups of 4.2 rejections: reviewers put the device into airplane mode and reject an app that shows a blank white view or a browser error page instead of a native offline state; and reviewers look for native capabilities the website cannot deliver.

### What we do today

`apps/web/capacitor.config.ts:27-33` already states the exposure in the repository's own words. The native surface actually wired is:

- Status bar colour and style, `apps/web/src/lib/native/status-bar.ts`
- Splash held until first paint rather than on a timer, `apps/web/capacitor.config.ts:110` and `apps/web/src/lib/native/boot.ts`
- Native keyboard resize, `apps/web/capacitor.config.ts:136`
- Android hardware back button with three correct answers, `apps/web/src/lib/native/back-button.ts:17-37`
- Universal and App Link handling, `apps/web/src/lib/native/deep-links.ts:87-107`
- External payment and OAuth handoff into `SFSafariViewController`, `apps/web/src/lib/native/external-links.ts:36-52`

There is no push notification plugin, no biometric unlock, no share extension, no widget and no haptics. `apps/web/package.json:14-33` lists six Capacitor plugins and none of them is `@capacitor/push-notifications`, `@capacitor/share` or `@capacitor/haptics`. `apps/web/ios/App/App/Info.plist:135-137` records that `NSFaceIDUsageDescription` is deliberately absent because nothing implements biometrics.

The offline story is worse than the config comment implies, and this is the single highest-value 4.2 finding in this document. `apps/web/native-shell/index.html:160-167` contains a genuinely good branded offline card. It is only ever reached when `webDir` is what the binary loads, which happens only when `CAPACITOR_SERVER_URL` is unset (`apps/web/capacitor.config.ts:146-156`). In a shipping build `server.url` **is** set, so the web view is pointed at the live origin; when that origin cannot be reached, `WKWebView` fails the provisional navigation and shows a blank view. The offline card is never seen by the person the app was built for.

Capacitor has the exact mechanism for this and we do not use it. `node_modules/@capacitor/cli/dist/declarations.d.ts:602-609` documents `server.errorPath`: "Specify path to a local html page to display in case of errors. On Android the html file won't have access to Capacitor plugins."

### Verdict

`RISK` for the overall 4.2 judgement. `BLOCKER` for the airplane-mode behaviour, which is a mechanical test a reviewer performs and which we currently fail.

### Fix

1. In `apps/web/capacitor.config.ts`, inside the conditional `server` block at lines 146 to 156, add `errorPath: "index.html"` so the block reads:

```ts
server: {
  url: liveOrigin,
  androidScheme: "https",
  cleartext: false,
  /* When the live origin cannot be reached the web view would otherwise show a
     blank view, which is the exact failure App Review's airplane-mode test is
     looking for. This redirects to the packaged shell in `native-shell/`,
     which draws the offline card and a Try again button. */
  errorPath: "index.html",
},
```

2. In `apps/web/native-shell/index.html`, the `retry` button handler must reload the live origin rather than the local file. Change the retry handler so that when `window.Capacitor.getConfig().server.url` is present it calls `window.location.replace(serverUrl)`, and only falls back to `window.location.reload()` when it is not.

3. Add at least two native capabilities that the website cannot deliver, in this order of cost against 4.2 value:
   - **Share sheet.** Add `@capacitor/share` to `apps/web/package.json` dependencies, create `apps/web/src/lib/native/share.ts` exporting `shareNative(url: string, title: string): Promise<boolean>` which returns `false` on web so callers fall back to the existing copy-link behaviour, and call it from the listing share control in `apps/web/src/app/(app)/listing/[id]/page.tsx` and from the profile share copy.
   - **Haptics.** Add `@capacitor/haptics`, create `apps/web/src/lib/native/haptics.ts` exporting `tapLight()`, `tapSuccess()` and `tapWarning()`, each a no-op off-native, and call `tapSuccess()` on a completed booking and `tapWarning()` on a refused payment.

4. Write the 4.2 argument into the review notes verbatim; the text is in Part D.2.

### Founder

Decide whether push notifications ship in v1. They are the strongest single 4.2 signal and they also change the Android manifest (`POST_NOTIFICATIONS`) and the Play Data safety form. This document assumes they do **not** ship in v1, which is consistent with `apps/web/android/app/src/main/AndroidManifest.xml:294-298`.

---

## A.2 Guideline 4.8, Login Services

### The rule

"Apps that use a third-party or social login service (such as Facebook Login, Google Sign-In, Log in with X, Sign In with LinkedIn, Login with Amazon, or WeChat Login) to set up or authenticate the user's primary account with the app must also offer as an equivalent option another login service with the following features: the login service limits data collection to the user's name and email address; the login service allows users to keep their email address private as part of setting up their account; and the login service does not collect interactions with your app for advertising purposes without consent."

The exemption that matters to us: "Another login service is not required if: Your app exclusively uses your company's own account setup and sign-in systems." The word is *exclusively*.

### What we do today

`apps/web/src/lib/auth/providers.ts:69` sets `DEFAULT_SOCIALS = ["google"]`, so Google Sign-In is on by default with no environment variable set. `apps/web/src/lib/auth/providers.ts:33-37` records the decision that Apple stays off until the founder has an Apple Developer team, a Services ID and a signing key.

Our own email sign-up collects only an email address and a password: `apps/web/src/lib/auth/actions.ts:283-292` passes `email` and `password` to `supabase.auth.signUp` and nothing else. It does not offer a private relay address.

So we use a third-party social login for the primary account, we are not exclusively on our own system, and our own system meets two of Apple's three conditions but not the second one (keeping the email address private).

There is a second, worse problem sitting behind this. Even if Apple accepted our email login as the equivalent option, Google sign-in does not work on the native shell at all. `apps/web/src/lib/native/deep-links.ts:62-64` states it plainly: "For OAuth it is not survivable: the exchange happens in the tab's cookie jar and the application stays signed out. Sign in with Google is therefore NOT closed on the native shell until the association files ship." And the association file we ship deliberately excludes the one path that would close it: `apps/web/public/.well-known/apple-app-site-association:8-11` excludes `/auth/*` with the comment "OAuth finishes in the system browser where the PKCE verifier and the cookies for the exchange live". That comment and the one in `deep-links.ts:36-43` contradict each other, and `deep-links.ts` is the one that matches the code: `startOAuth` runs as a server action from the web view (`apps/web/src/lib/auth/actions.ts:664-679`), so the PKCE verifier cookie is in the **web view's** jar, not Safari's.

Net effect on a reviewer's device: they tap "Continue with Google", a Safari sheet opens, they authenticate, the sheet lands on `/auth/callback?code=...`, the exchange fails because the verifier is not in that jar, and they are returned to an app that is still signed out. That is a 2.1 rejection on its own and it makes the 4.8 question academic.

### Verdict

`BLOCKER`, twice over.

### Fix

1. **Make Sign in with Apple real.** In `apps/web/src/lib/auth/providers.ts:69`, change `DEFAULT_SOCIALS` to `["google", "apple"] as const` once the founder confirms the Services ID and key are configured in the Supabase dashboard. Until then, the safer build is to set `NEXT_PUBLIC_AUTH_PROVIDERS=none` for the iOS-facing deployment so no social button is drawn at all, which puts us inside the "exclusively uses your company's own account setup" exemption. Do not ship Google-on, Apple-off.

2. **Fix the OAuth return path, which is required whichever of the two above is chosen.** In `apps/web/public/.well-known/apple-app-site-association`, remove the `/auth/*` exclusion at lines 7 to 11 and replace it with an explicit include for the single callback path:

```json
{
  "/": "/auth/callback*",
  "comment": "The OAuth return. It MUST be handed to the app rather than opened in the in-app tab: startOAuth runs as a server action from the web view, so Supabase's PKCE verifier cookie is in the web view's jar and the code exchange can only succeed there. See src/lib/native/deep-links.ts."
},
{
  "/": "/auth/*",
  "exclude": true,
  "comment": "Everything else under /auth stays out. Only the callback is a return journey."
}
```

Order matters in an AASA components array: the include for `/auth/callback*` must come **before** the exclude for `/auth/*`.

3. In `apps/web/android/app/src/main/AndroidManifest.xml`, add to the `autoVerify` intent filter at lines 152 to 167:

```xml
<data android:pathPrefix="/auth/callback" />
```

and update the long comment at lines 104 to 109 which currently says `/auth/` is deliberately absent, so the file does not contradict itself.

4. Leave `/checkout/` and `/wallet` excluded. Payment is settled by the Paystack server-to-server webhook (`apps/web/src/app/api/paystack/webhook`), so the return trip is cosmetic there, and `apps/web/src/lib/native/deep-links.ts:58-61` already says so correctly.

5. After the entitlement lands (see A.3), test on a device and read `apps/web/src/lib/native/deep-links.ts:66-74`, which names the exact failure mode to check for: the in-app tab consuming the single-use code first.

### Founder

- Enrol in the Apple Developer Program as VALLO SPACES LTD (Part F.1).
- Create a Services ID and a Sign in with Apple key, and enter them in Supabase Authentication, Providers, Apple.
- Confirm which of the two paths in fix 1 we are taking before the build agent changes `providers.ts`.

---

## A.3 Guideline 2.1, App Completeness

### The rule

"Submissions to App Review ... should be final versions with all necessary metadata and fully functional URLs included; placeholder text, empty websites, and other temporary content should be scrubbed before submission. Make sure your app has been tested on-device for bugs and stability before you submit it, and include demo account info (and turn on your back-end service!) if your app includes a login. If you are unable to provide a demo account due to legal or security obligations, you may include a built-in demo mode in lieu of a demo account with prior approval by Apple."

### What we do today

Four separate 2.1 exposures.

**Placeholders that ship.** `apps/web/public/.well-known/apple-app-site-association:5` contains `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app`. `apps/web/public/.well-known/assetlinks.json:8-9` contains two placeholder fingerprints. These are served on the live origin. They are not in the binary, but they are "fully functional URLs" that are not functional, and an App Review engineer testing a universal link will find nothing works.

**An inert entitlement.** `apps/web/ios/App/App/App.entitlements:6-14` states that the file is not referenced by the Xcode project at all, deliberately, because the founder had no Apple Developer account when it was written. Confirmed: `grep CODE_SIGN_ENTITLEMENTS apps/web/ios/App/App.xcodeproj/project.pbxproj` returns nothing. Without it, universal links cannot work even with a correct AASA file.

**A control that cannot work.** `apps/web/src/components/app/listing/TravelTime.tsx:86` posts to `/api/travel-time`. That route does not exist: the API tree under `apps/web/src/app/api` contains `assistant`, `auth/email-hook`, `client-error`, `cron/*`, `crypto/*`, `csp-report`, `map/listings`, `paystack/*`, `support` and `yellowcard/webhook`, and nothing else. The component is rendered twice on the listing page (`apps/web/src/app/(app)/listing/[id]/page.tsx:962` and `:1119`). Its designed failure behaviour (`apps/web/src/components/app/listing/TravelTime.tsx:20-27`) is to hide itself silently, so what a reviewer experiences is: tap a control, grant a location permission whose alert text promises the position stays on the device, then watch the control vanish. That is a bug, a broken promise and a permission prompt with no payoff, in one tap.

**Fabricated inventory.** `apps/web/src/lib/listings/syndication.ts:9-16` states it: "Forty two example listings are in the catalogue because the catalogue is otherwise empty. They describe properties that DO NOT EXIST." The mitigation built is a gate that stops machines republishing them (`apps/web/src/lib/listings/syndication.ts:53-73`) and a two-word on-screen label, `EXAMPLE_LABEL = "Example listing"` at `apps/web/src/lib/listings/syndication.ts:95`. The full sentence `EXAMPLE_STATEMENT` at `apps/web/src/lib/listings/syndication.ts:76-77` is written for crawlers and Open Graph cards, not for the screen. `apps/web/src/lib/listings/syndication.ts:84-88` records the founder's judgement that the full band read as an error message.

A human reviewer opening a property marketplace and finding forty two properties that do not exist is a 2.1 problem ("placeholder ... and other temporary content should be scrubbed") and, if the label is missed, a 1.1.6 problem ("False information and features"). The saving grace is that the label exists at all; the exposure is that two words in a badge are easy to miss and the review notes have never been written.

**No demo account.** Browsing is open (`apps/web/src/proxy.ts:54-88` keeps `search`, `listing`, `around`, `u`, `post`, `stay`, `stays`, `restaurant`, `restaurants` out of the protected set), which is a genuine strength and should be said in the notes. But `bookings`, `checkout`, `messages`, `wallet`, `settings`, `trips`, `host`, `agent` and `admin` all require a session, and those are where the product lives. Apple will want an account.

### Verdict

`BLOCKER` on all four.

### Fix

1. **TravelTime.** The cheapest correct answer is to remove the control, because building a routing integration is a feature, not a fix. Delete the two render sites at `apps/web/src/app/(app)/listing/[id]/page.tsx:962` and `:1119` and the import at `:31`, and delete `apps/web/src/components/app/listing/TravelTime.tsx`. If the founder wants the feature kept, then `apps/web/src/app/api/travel-time/route.ts` must be created, and that is a separate work order with its own provider key, not a rejection fix.

2. **Placeholders.** See Part F.2 and F.3; the values can only come from the founder. The build agent's job is to verify after the founder supplies them: `apps/web/public/.well-known/apple-app-site-association` must contain no string beginning `PLACEHOLDER_`, and `apps/web/public/.well-known/assetlinks.json` must contain two 32-pair uppercase hex fingerprints.

3. **Entitlement.** In Xcode, App target, Signing and Capabilities, add the Associated Domains capability. Xcode will adopt the existing `apps/web/ios/App/App/App.entitlements` and set `CODE_SIGN_ENTITLEMENTS` in `project.pbxproj`. Do not hand-edit `project.pbxproj`; `apps/web/ios/App/App/App.entitlements:19-25` already gives the exact click path.

4. **Example listings.** Two changes, both small.
   - Raise the on-screen label from two words to a full sentence on the **detail** page only, keeping the two-word badge on cards. In the listing detail page, where `EXAMPLE_LABEL` is rendered, render `EXAMPLE_STATEMENT` instead. The card grid keeps the badge so the founder's "do not make the product look broken" judgement still holds where it was made.
   - Disclose them in the review notes. The text is in Part D.2 and it must be word for word, because an undisclosed fabricated catalogue is a 1.1.6 rejection and a disclosed one is a reviewer who now understands the product.

5. **Demo account.** Create a real account on the production origin, fund its wallet with a small amount, give it one completed booking, one live conversation and one published listing, so the reviewer can exercise every surface. Put the credentials in App Store Connect's demo account fields, not only in the notes.

### Founder

Apple Team ID, the Play app signing SHA-256, the upload key SHA-256, and the demo account credentials. All four are in Part F.

---

## A.4 Guideline 1.2, User-Generated Content

### The rule

The published guideline requires four things of an app with user-generated content or social networking:

- "A method for filtering objectionable material from being posted to the app"
- "A mechanism to report offensive content and timely responses to concerns"
- "The ability to block abusive users from the service"
- "Published contact information so users can easily reach you"

The published text does not contain a 24-hour number. That number comes from the rejection message App Review sends, which is widely reported as requiring a EULA stating there is no tolerance for objectionable content or abusive users, and that the developer acts on reports within 24 hours by removing the content and ejecting the user. We should build to the rejection message, not to the published text, because the rejection message is what we will receive.

### What we do today

**Filtering.** There is a scanner, and it is the wrong scanner. `supabase/migrations/20260804105404_social_content_core.sql:292-325` defines `private.scan_post()`, which holds a post when the body matches `\d{10}` (a Nigerian account number) or the keyword pattern `(payment|transfer|pay me|account number|acct|bank)`. It is a **fraud** filter. It catches nobody posting abuse, hate speech, sexual content or a threat. `supabase/migrations/20260804100526_social_foundations.sql:313-362` extends the same fraud classifier to profile bios. There is no filtering of images at all: none of the nine storage buckets in `apps/web/src/lib/account-deletion/constants.ts:24-34` has a moderation step in front of it.

**Reporting.** Good coverage on the social surfaces and on listings, and a complete hole in messaging.
- Post: `apps/web/src/lib/social/posts-actions.ts:517`
- Profile: `apps/web/src/lib/social/posts-actions.ts:566`
- Listing: `apps/web/src/lib/reports/actions.ts:36`, with `REPORT_TARGETS = ["listing"]` at `apps/web/src/lib/reports/schema.ts:78`
- UI: `ReportSheet` is mounted on the feed (`apps/web/src/components/social/feed/Feed.tsx:624`), comments (`apps/web/src/components/social/comments/CommentsSheet.tsx:440`), stories (`apps/web/src/components/social/story/StoryViewer.tsx:502`), the post thread (`apps/web/src/app/(app)/post/[id]/ThreadView.tsx:395`), the profile menu (`apps/web/src/components/social/profile/ProfileMenu.tsx:376`) and the listing page (`apps/web/src/app/(app)/listing/[id]/page.tsx:1017`)
- Messaging: nothing. `apps/web/src/app/(app)/messages/[id]/ThreadOptionsSheet.tsx:14-19` says "Three things live here and nothing else", and names the listing, sharing into the chat, and the safety copy. There is no report control on a conversation and no report control on a message.

**Blocking.** The database is right and the messaging UI is missing. `supabase/migrations/20260804105502_social_safety_bot_badges.sql:7-17` creates `public.blocks` with bidirectional invisibility, `apps/web/src/lib/social/posts-actions.ts:603` is `blockUser`, and `apps/web/src/lib/messages/blocks.ts:7-23` correctly enforces a block inside messaging in both directions. But the only surface that can **create** a block is the social profile menu. A person being harassed inside a listing conversation, which on this product is the most likely place for it to happen, has no control to press.

**Published contact information.** `apps/web/src/lib/support-email.ts:31-34` resolves to `/contact` when `NEXT_PUBLIC_SUPPORT_EMAIL` is unset, and `/contact` writes a real `support_tickets` row. That satisfies "published contact information", and App Store Connect's own Support URL field satisfies it again.

**EULA.** Nothing found. A repository-wide grep for `eula`, `licence agreement`, `license agreement`, `zero tolerance`, `community guidelines` and `community standards` across `apps/web/src` returned no match. `apps/web/src/components/auth/AuthChoices.tsx:144` and `apps/web/src/components/auth/EmailAuthForm.tsx:352` render `t.auth.termsNotice`, which is a passive notice, not an acceptance. There is a `/standards` page (`apps/web/src/app/(site)/standards/page.tsx`, 298 lines) but nothing in the posting path requires agreement to it.

### Verdict

`BLOCKER`. Three of the four required precautions are incomplete and the EULA that the rejection message asks for does not exist.

### Fix

1. **Add report and block to messaging.** In `apps/web/src/app/(app)/messages/[id]/ThreadOptionsSheet.tsx`, add two rows below the safety copy block at lines 152 to 160:
   - "Report this conversation", opening the existing `ReportSheet` with a new target type.
   - "Block {counterpartName}", calling `blockUser` from `apps/web/src/lib/social/posts-actions.ts:603` with a confirmation sheet whose copy reads: "They will not be able to message you, see your profile or find your listings, and you will not see theirs. They are not told. You can undo this in Settings, Privacy."

   Update the doc comment at lines 12 to 20 so it no longer says "Three things live here and nothing else".

2. **Widen the report targets.** In `apps/web/src/lib/reports/schema.ts:78`, change `REPORT_TARGETS` to `["listing", "conversation", "message"] as const`. The database column `public.reports.target_type` is already `text` (stated at `apps/web/src/lib/social/posts-actions.ts:535-536`), so no migration is needed. Add the two new copy entries to `REPORT_CATEGORY_COPY` only if the existing eight categories do not fit; they do, so no copy change is required.

3. **Remove the social block dependency on the social kill switch.** `apps/web/src/lib/social/posts-actions.ts:603-608` refuses `blockUser` when `isSocialEnabled()` is false. A safety control must not be switched off by a feature flag for a different feature. Extract `blockUser` and `unblockUser` into `apps/web/src/lib/safety/blocks-actions.ts`, drop the `isSocialEnabled()` guard from both, and re-export from `posts-actions.ts` so existing imports keep working.

4. **Add an objectionable-content filter.** The current scanner is fraud-only. Add a second classifier that runs in the same trigger. Create `supabase/migrations/<timestamp>_a_post_is_scanned_for_abuse_as_well_as_fraud.sql` which:
   - creates `private.objectionable_pattern()` returning a `text` regular expression built from a term list held in a new table `public.blocked_terms (term text primary key, severity public.alert_severity not null)`, readable only by `private`;
   - amends `private.scan_post()` so that after the existing fraud branch it also tests `new.body ~* private.objectionable_pattern()` and, on a match, sets `status = 'HELD'` with `hold_reason` "This may break our content standards. Somebody is reading it before it goes up." and raises a `risk_alerts` row with `title = 'Post held for review'`;
   - applies the same amendment to `private.scan_social_profile()` in `supabase/migrations/20260804100526_social_foundations.sql:321`;
   - seeds `public.blocked_terms` with a slur and sexual-content list. The list itself is content the founder must approve; the build agent should seed an empty table and leave a `-- SEED REQUIRED` comment rather than invent one.

   State honestly in the review notes that image moderation is human-in-the-loop via the reports queue rather than automated, and that the platform is 18+ (see A.8).

5. **Write the EULA and require acceptance.** Create `apps/web/src/lib/legal/eula.tsx` exporting `EULA_SECTIONS` in the same shape as `apps/web/src/lib/legal/terms.tsx`, and a route at `apps/web/src/app/(site)/eula/page.tsx`. The operative clause, which is the sentence App Review looks for, must read:

   > There is no tolerance for objectionable content or abusive behaviour on Vallo. If you post content that is abusive, threatening, hateful, sexually explicit, or that harasses another person, we will remove it and we will end your account. We act on every report within 24 hours. You agree not to post such content as a condition of using Vallo.

   Then make acceptance active rather than passive: in `apps/web/src/components/auth/EmailAuthForm.tsx` and `apps/web/src/components/auth/AuthChoices.tsx`, replace the passive `t.auth.termsNotice` paragraph with a required checkbox whose label reads "I agree to the Terms, the Privacy Policy and the Community Rules, and I understand that abusive content gets an account removed", linking to `/terms`, `/privacy` and `/eula`. Block submission until it is ticked, and record the acceptance: add `terms_accepted_at timestamptz` to `public.profiles` in the same migration as fix 4, written on first sign-in.

6. **Commit to the 24-hour response in writing and in the console.** The reports queue exists (`apps/web/src/lib/admin/moderation-actions.ts:59` is `decideHeldItem`). Add a "Reports older than 24 hours" counter to the admin dashboard so the commitment is measurable, and state the commitment in the review notes and in the EULA.

### Founder

- Approve the blocked-terms seed list.
- Commit personally to the 24-hour turnaround on reports; it is a promise made in the EULA and Apple enforces it after approval, not only at review.

---

## A.5 Guideline 5.1.1, Data Collection and Storage

### The rule, in the parts that bind us

**(i) Privacy Policies.** "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner. The privacy policy must clearly and explicitly: Identify what data, if any, the app/service collects, how it collects that data, and all uses of that data. Confirm that any third party with whom an app shares user data ... will provide the same or equal protection of user data ... Explain its data retention/deletion policies and describe how a user can revoke consent and/or request deletion of the user's data."

**(ii) Permission.** "Ensure your purpose strings clearly and completely describe your use of the data."

**(v) Account Sign-In.** "If your app supports account creation, you must also offer account deletion within the app."

**(ix)** Apps in highly regulated fields such as banking and financial services "should be submitted by a legal entity that provides the services, and not by an individual developer."

### What we do today

**Account deletion is our strongest area and it should be said in the review notes.** `apps/web/src/app/(app)/settings/DeleteAccountPanel.tsx:26-29` explicitly names 5.1.1(v) as the rejection case it was written to avoid. The in-app control lives in Settings, Account (`apps/web/src/app/(app)/settings/AccountSection.tsx:119`). The public web page is `apps/web/src/app/(site)/delete-account/page.tsx`, and it is reachable signed out because `delete-account` is not in `PRODUCT_SEGMENTS` (`apps/web/src/proxy.ts:54-88`). The grace window is 30 days (`apps/web/src/lib/account-deletion/constants.ts:10`), the confirm phrase is `DELETE MY ACCOUNT` (`apps/web/src/lib/account-deletion/constants.ts:13`), the purge sweeps nine storage buckets (`apps/web/src/lib/account-deletion/constants.ts:24-34`), and the public page's destroyed and retained lists are generated from `apps/web/src/lib/account-deletion/plan.ts` rather than written by hand (`apps/web/src/app/(site)/delete-account/page.tsx:33-36`).

The one exposure is the preconditions. `apps/web/src/lib/account-deletion/preconditions.ts:50-57` blocks deletion on seven conditions: wallet balance, wallet held, active bookings, active reservations, pending payouts, published listings and owned businesses. Apple's position is that deletion must be available in the app; a precondition that a person cannot clear is a deletion they cannot perform. Our preconditions all carry a route out (`apps/web/src/lib/account-deletion/preconditions.ts:9-13` makes that a design rule), which is the right answer, but a reviewer with a test account that has a booking in progress will see a disabled Delete button. The notes must address this.

**The purpose string is false.** `apps/web/ios/App/App/Info.plist:91` reads, in part: "Your position is used on this device only and is never sent to Vallo." Two code paths falsify it:
- `apps/web/src/components/app/listing/TravelTime.tsx:83-95` obtains a precise fix and POSTs `{ listingId, lat, lng }` to our own origin.
- `apps/web/src/components/host/HostWizard.tsx:612-618` obtains a precise fix and writes it into `addAccommodationDraft` as `latitude` and `longitude`, which is stored server-side on the accommodation row.

Only `apps/web/src/components/app/search/MapCanvas.tsx:489` matches the promise: it recentres the map and posts nothing. The Info.plist comment at lines 83 to 89 asserts MapCanvas is the only consumer, and that is no longer true.

**The privacy policy claims collection we do not perform.** `apps/web/src/lib/legal/privacy.tsx:162` names "Hosting, analytics and communication providers" as recipients, and `apps/web/src/lib/legal/privacy.tsx:312` says the product sets "analytics that help us understand how the product is used". There is no analytics anywhere. `apps/web/package.json:14-33` contains no analytics or crash-reporting SDK, and `apps/web/ios/App/App/Info.plist:139-143` independently records that "There is no analytics vendor and no crash reporting anywhere in this codebase". A policy that claims more collection than the privacy label declares is a direct contradiction between two documents Apple reads side by side.

**The controller is under-identified.** `apps/web/src/lib/legal/company.ts:54` sets `COMPANY_RC_NUMBER = null` and `:65` sets `COMPANY_NDPC_REGISTRATION = null`, so `COMPANY_FORMAL_NAME` (`apps/web/src/lib/legal/company.ts:104-106`) renders as "VALLO SPACES LTD" with no RC number. The founder has since supplied RC 9870413, so the null is now stale.

**Third parties are not named.** The policy says "licensed Nigerian payment processors" (`apps/web/src/lib/legal/privacy.tsx:84-86`) rather than naming Paystack, and does not name Supabase, Vercel, MapTiler or Yellow Card at all.

### Verdict

- Account deletion: `CLEAR`, with a `RISK` on the preconditions that the review notes must pre-empt.
- Purpose string: `BLOCKER`.
- Privacy policy accuracy: `BLOCKER`.
- Controller identification and third-party naming: `RISK`.

### Fix

1. **Rewrite the location purpose string.** Replace `apps/web/ios/App/App/Info.plist:91` with:

```
Vallo uses your location in three places you choose: to centre the search map on where you are, to tell you how long it takes to reach a place you are looking at, and to drop the pin when you are listing a property you are standing in. The first stays on your device. The second sends your coordinates to Vallo once, to calculate the journey, and they are not stored. The third saves the coordinates as the address of the property you are listing.
```

   If the `TravelTime` control is removed per A.3 fix 1, remove the middle sentence and the word "three" becomes "two".

   Also correct the explanatory comment at `apps/web/ios/App/App/Info.plist:83-89`, which names MapCanvas as the only consumer.

2. **Correct the Android manifest comment.** `apps/web/android/app/src/main/AndroidManifest.xml:204-215` asserts there is "exactly one consumer of location on this platform" and that "nothing stores the position: it is read in the browser and never posted". Both are false. Replace with the three-consumer statement above. Critically, `apps/web/android/app/src/main/AndroidManifest.xml:254-258` instructs whoever fills the Data safety form to answer "approximate location, used for app functionality, not shared, not stored". Following that instruction would be a false declaration. Replace that paragraph with a pointer to Part D.5 of this document.

3. **Strip the analytics claims from the privacy policy.** In `apps/web/src/lib/legal/privacy.tsx:162`, change "Hosting, analytics and communication providers" to "Hosting, database, email and payment providers, named in the list below". In `apps/web/src/lib/legal/privacy.tsx:310-315`, replace the cookie sentence with:

```
We use a small number of cookies and similar technologies, and all of them are strictly necessary: they keep you signed in, remember your language and your theme, and carry the security token that protects a form you submit. Vallo runs no analytics and no advertising cookies at all. We do not track you across other websites or applications, and there is no third party measuring your behaviour inside Vallo.
```

4. **Name the third parties.** Add to section 5 of `apps/web/src/lib/legal/privacy.tsx` a named sub-list, with the Apple-required assurance sentence: "Each of these processes your data under a written contract that requires it to protect your data to the same standard this notice promises." The list: Supabase (authentication, database and file storage), Vercel (hosting and delivery), Paystack (card payments, payouts and saved cards), Yellow Card (cryptocurrency top-ups, when enabled), MapTiler and CARTO (map tiles, which receive only the map area being viewed and never an account identifier; see `apps/web/src/lib/maps/tiles.ts:77` and `:87`), and the transactional email provider.

5. **Fill in the RC number.** Change `apps/web/src/lib/legal/company.ts:54` to `export const COMPANY_RC_NUMBER: string | null = "9870413";` and update the comment above it, which currently describes an application that is still pending. Both legal documents then render "VALLO SPACES LTD (RC 9870413)" with no other edit, which is the design at `apps/web/src/lib/legal/company.ts:99-106`.

6. **Pre-empt the deletion preconditions in the review notes.** Text in Part D.2.

### Founder

- Confirm RC 9870413 against the certificate before the build agent types it; `apps/web/src/lib/legal/company.ts:49-53` is emphatic that no number should be entered that has not been read off the certificate.
- File the NDPC registration and supply the number, so `apps/web/src/lib/legal/company.ts:65` can stop being null.
- Confirm the transactional email provider's name for the third-party list.

---

## A.6 Guideline 5.1.2, Data Use and Sharing

### The rule

"Unless otherwise permitted by law, you may not use, transmit, or share someone's personal data without first obtaining their permission ... You must receive explicit permission from users via the App Tracking Transparency APIs to track their activity ... Your app may not require users to enable system functionalities (e.g. push notifications, location services, tracking) in order to access functionality."

### What we do today

No tracking, and this is genuinely true rather than merely claimed. `apps/web/package.json:14-33` contains no advertising, attribution or analytics SDK. `apps/web/ios/App/App/Info.plist:139-143` deliberately omits `NSUserTrackingUsageDescription`. The edge sends `Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()` on every response (`apps/web/next.config.ts:206-208`), which closes FLoC and cohort-based advertising at the browser.

No feature is gated on granting a permission: `apps/web/src/components/app/listing/TravelTime.tsx:15-19` explicitly refuses to prompt on mount, and the map works without a fix.

### Verdict

`CLEAR`, provided the privacy policy stops claiming analytics (A.5 fix 3). Answer "No" to App Tracking Transparency in App Store Connect and ship no `NSUserTrackingUsageDescription`.

### Fix

None beyond A.5 fix 3. Add a note to `apps/web/ios/App/App/Info.plist:139-143` that this absence is now load-bearing for the privacy label answer, so a future agent does not add a vendor without revisiting the label.

---

## A.7 Guideline 5.1.5, Location Services

### The rule

"Use Location Services in your app only when it is directly relevant to the features and services provided by the app ... Ensure that you notify and obtain consent before collecting, transmitting, or using location data."

### What we do today

Relevance is not in doubt for a property marketplace. `apps/web/ios/App/App/Info.plist:90` declares `NSLocationWhenInUseUsageDescription` and nothing else; there is no `Always` variant, correctly, because nothing runs in the background. `apps/web/android/app/src/main/AndroidManifest.xml:220` declares `ACCESS_COARSE_LOCATION` and `:261` declares `ACCESS_FINE_LOCATION` capped at `maxSdkVersion="30"`, with a long and convincing explanation at lines 222 to 259 of a Capacitor bridge defect below Android 12. `ACCESS_BACKGROUND_LOCATION` is absent.

The two problems are the false purpose string (A.5) and the fact that `HostWizard` passes `enableHighAccuracy: true` and stores a six-decimal fix (`apps/web/src/components/host/HostWizard.tsx:614-617`), which is precise location collection, not approximate.

### Verdict

`RISK`, becoming `CLEAR` once the purpose string is corrected.

### Fix

Covered by A.5 fixes 1 and 2. One addition: the Android `maxSdkVersion="30"` cap on fine location (`apps/web/android/app/src/main/AndroidManifest.xml:261`) means that on Android 12 and above the host pin cannot obtain a precise fix, so `HostWizard`'s `enableHighAccuracy: true` is a hint that will not be honoured. That is acceptable and the fallback (typing coordinates) exists at `apps/web/src/components/host/HostWizard.tsx:617`, but it should be written into the comment so nobody later "fixes" the manifest by widening the permission.

---

## A.8 Guideline 3.1.1 versus 3.1.3(e), In-App Purchase

### The rule

3.1.1: "If you want to unlock features or functionality within your app, (by way of example: subscriptions, in-game currencies, game levels, access to premium content, or unlocking a full version), you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality."

3.1.3(e), which is the exemption we rely on: "If your app enables people to purchase physical goods or services that will be consumed outside of the app, you must use purchase methods other than in-app purchase to collect those payments, such as Apple Pay or traditional credit card entry."

Note the word **must**. Using Apple's in-app purchase for a hotel night would itself be a violation. This is the strongest possible position and the argument should be made confidently.

3.1.3 also carries a restriction that matters to us: "Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront." Because our entire transaction set is physical services, there is no in-app purchase to steer away from, so this restriction has nothing to bite on.

### What we do today

Every money movement on the platform buys a real-world thing:
- A stay, a shortlet or a hotel night.
- A restaurant table reservation.
- A rent payment or a move-in payment (`apps/web/src/app/(app)/rent/pay`, `apps/web/src/app/(app)/rent/move-in`).
- A property inspection.
- Agent payouts out of the wallet.

There is no digital good anywhere. A repository-wide grep for `subscription`, `premium`, `boost`, `promote listing`, `featured listing`, `upgrade plan`, `pro plan`, `membership fee`, `verification fee` and `listing fee` across `apps/web/src/lib` returned no monetised digital feature; the only hits were unrelated (a search memory module, a crypto test fixture, a realtime subscription in messaging, an i18n hook and a bookings action). Agent verification is free (`apps/web/src/app/(app)/verification`). There is no tipping, no donation and no paid boost.

Payment is taken by Paystack on Paystack's own hosted page. `apps/web/src/lib/native/external-links.ts:19-21` describes it: `lib/wallet/actions.ts` and `lib/bookings/checkout.ts` mint an authorisation URL on Paystack's domain, and the navigation is intercepted and handed to `SFSafariViewController`. No card number is ever entered inside our web view for a new card.

The only wrinkle is the wallet. It holds a naira balance in integer kobo, it can be funded by card and (when enabled) by crypto, and it can be spent. Apple could read a stored balance as "in-game currency". The answer is that the balance can only ever be spent on the physical services above, and savings pots earn nothing: `SAVINGS_POTS.md:5-11` states "Pots earn nothing. No interest, no yield, no return, no lock-in, no penalty ... The schema is written so that a return is not something it can express, there is no column that could hold a rate."

### Verdict

`CLEAR` on the substance, `RISK` on the presentation, because a reviewer who sees a wallet and a top-up button before they see what it buys may open with a 3.1.1 rejection. The answer is to pre-empt it in the review notes.

### The argument, written out for the appeal

Use this text verbatim if 3.1.1 is raised:

> Vallo sells no digital goods, no digital content, no subscriptions and no in-app features. Every payment in the application buys a physical service consumed outside the application: a night in a hotel or shortlet, a restaurant table, a rent or move-in payment on a real tenancy, or a property inspection. Under guideline 3.1.3(e) these must be collected by a method other than in-app purchase, which is what we do, using Paystack, a licensed Nigerian payment processor, on its own hosted page in the system browser.
>
> The naira wallet is a settlement balance for those same physical services and nothing else. It cannot buy any feature, any content or anything inside the application. It holds no interest and no yield. It is funded by the same card entry, and its balance is withdrawable to a Nigerian bank account at any time. It is an escrow and payout mechanism for real-world lettings, in the same shape as a deposit held by a letting agency, not an in-app currency.
>
> There is nothing in Vallo that in-app purchase could be used for. Applying in-app purchase to a hotel night would itself violate 3.1.3(e).

### Fix

1. Put the argument above into the App Review notes as a standing paragraph, not only in an appeal.
2. Make the wallet self-evidently a settlement balance rather than a currency. On the wallet screen, under the balance, render a line that reads: "Your Vallo balance pays for stays, tables, rent and inspections, and you can withdraw it to your bank at any time. It cannot be spent on anything inside the app." Add it to the wallet page at `apps/web/src/app/(app)/wallet/page.tsx`.
3. Never introduce a paid digital feature (a boost, a featured listing, a subscription, a verification fee) without revisiting this section. Add that sentence as a comment at the top of `apps/web/src/lib/payments/paystack.ts`.

---

## A.9 Guideline 3.1.5, Cryptocurrencies, and 5.1.1(ix), Highly Regulated Fields

### The rule

3.1.5(i) Wallets: "Apps may facilitate virtual currency storage, provided they are offered by developers enrolled as an organization."
3.1.5(iii) Exchanges: "Apps may facilitate transactions or transmissions of cryptocurrency on an approved exchange, provided they are offered only in countries or regions where the app has appropriate licensing and permissions to provide a cryptocurrency exchange."
5.1.1(ix): apps in highly regulated fields, explicitly including "banking and financial services" and "crypto exchanges", "should be submitted by a legal entity that provides the services, and not by an individual developer."

### What we do today

`apps/web/src/app/(app)/crypto/page.tsx:15-18` describes `/crypto` as "The market surface in the side drawer: prices, movers, pairs, and the entry to fund the wallet with crypto. Display only." The price data comes from CoinGecko and GeckoTerminal through our own proxy (`apps/web/src/lib/crypto/coingecko.ts`, `apps/web/src/lib/crypto/geckoterminal.ts`, routes under `apps/web/src/app/api/crypto`). The funding entry is gated on `isYellowCardConfigured()` (`apps/web/src/app/(app)/crypto/page.tsx:35`), which is a server-side check of three environment variables.

`CRYPTO_DEPOSITS.md:1-5` is unambiguous about the architecture: "Vallo accepts crypto through Yellow Card, a licensed pan-African on-ramp that settles to naira. Nothing in this repository holds a private key, watches a chain, or decides an exchange rate." `CRYPTO_DEPOSITS.md:13-30` explains why we are deliberately not a custodian, not an exchange and not a chain operator.

That is a strong position. The exposures are:

- We are a **custodial naira wallet** (the balance is ours to hold and pay out), which is "banking and financial services" under 5.1.1(ix) regardless of crypto.
- A price table for hundreds of tokens, inside a property app, is hard to justify under 4.2 ("features ... that elevate it beyond a repackaged website" cuts both ways: a token ticker is a content aggregator, which 4.2.2 names).
- Even a funding on-ramp is a "transmission of cryptocurrency", and 3.1.5(iii) asks for licensing where the app is offered.

### Verdict

`RISK`, high, and entirely avoidable on submission one.

### Fix

**Ship v1 with crypto off, and with the surface absent rather than merely gated.**

1. Confirm `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET` and `YELLOWCARD_BASE_URL` are unset in the production Vercel project so `isYellowCardConfigured()` returns false (`apps/web/src/lib/payments/yellowcard.ts`).
2. Gate the route itself, not only the funding control. Add to `apps/web/src/app/(app)/crypto/page.tsx`, as the first statement of `CryptoPage`, and to `apps/web/src/app/(app)/crypto/[id]/page.tsx`:

```ts
// The market surface is not part of the store build. A token price table inside
// a property marketplace invites App Review guideline 4.2.2 (content
// aggregator) and 3.1.5(iii) (crypto transmission without stated licensing),
// and it buys us nothing at launch. It returns when Yellow Card is live and the
// licensing question has an answer. See docs/research/STORE_REJECTION_RISK_RESEARCH.md A.9.
if (!isYellowCardConfigured()) notFound();
```

3. Remove the `/crypto` entry from the side drawer navigation so the route is not linked from anywhere.
4. Keep `apps/web/src/lib/crypto/**` and the three API routes in the tree; they are inert without a link and gating the pages is enough.

If the founder insists crypto ships in v1, then: enrol as an organisation (3.1.5(i) requires it), state in the review notes that Vallo holds no keys and that Yellow Card is the licensed counterparty, and expect a request for Yellow Card's licence documentation.

### Founder

Decide: crypto in v1, or crypto in v1.1. This document strongly recommends v1.1.

---

## A.10 Guideline 4.7, Mini apps, mini games, streaming games, chatbots, plug-ins

### The rule

"Apps may offer certain software that is not embedded in the binary, specifically HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins ... You are responsible for all such software offered in your app." 4.7.1 then requires that such software follow guideline 5.1 on privacy, "include a method for filtering objectionable material, a mechanism to report content and timely responses to concerns, and the ability to block abusive users", and follow 3.1 for digital goods.

### What we do today

We ship an AI assistant. `apps/web/src/app/api/assistant` is a Server-Sent Events route and `apps/web/src/lib/assistant/protocol.ts:24-29` defines its event stream: `text`, `listings`, `thread`, `done`. `apps/web/src/lib/assistant/protocol.ts:15-17` shows it returns real catalogue rows with hrefs built server-side per the side law.

The whole application is also HTML and JavaScript served from a remote origin rather than embedded in the binary, which is what 4.7 is literally about.

### Verdict

`RISK`, low to moderate. 4.7 is aimed at mini-app **platforms** that host third-party software, not at a first-party app that happens to be web-hosted. Our assistant is our own software answering questions about our own catalogue, not third-party software we host. But 4.7.1's requirements are the same ones 1.2 already imposes on us, so complying with A.4 discharges 4.7.1 as well.

### Fix

1. Do not describe the assistant as a "chatbot platform", an "agent" or anything that implies third-party software. In the App Store description and review notes, call it "a search assistant that answers questions about Vallo's own listings".
2. Ensure the assistant cannot produce arbitrary open-domain content that would raise the age rating. Verify the system prompt in `apps/web/src/app/api/assistant/route.ts` constrains it to property and stays questions and refuses everything else. This was not read line by line during this research; see the honesty log.
3. Answer the age rating questionnaire honestly about the assistant. Apple's September 2026 guidance is explicit that AI assistants and chatbots count when assessing how often sensitive content can surface.

---

## A.11 Guideline 2.5, Technical Requirements

### 2.5.1, public APIs and current OS

`apps/web/ios/App/App.xcodeproj/project.pbxproj:237,288,305,327` sets `IPHONEOS_DEPLOYMENT_TARGET = 15.0`. That is the deployment target and is fine. The **SDK** requirement is separate and is already in force: Apple's upcoming requirements page states that since 28 April 2026, "Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26". Verdict: `RISK`, resolved by the build machine, not the repository. The founder's Mac must run Xcode 26 or later.

### 2.5.2, self-contained bundles

"Apps should be self-contained in their bundles ... nor may they download, install, or execute code which introduces or changes features or functionality of the app."

We load the entire product from a remote origin (`apps/web/capacitor.config.ts:146-156`). In practice App Review has long accepted WebView applications that load a remote site; 2.5.2 has been enforced against downloading and executing **native** code, and JavaScript in a web view has not been treated as a violation. But it is the guideline with which a 4.2 rejection is sometimes paired. Verdict: `RISK`. Mitigation: the 4.2 argument in Part D.2 covers it; do not volunteer the phrase "we load our website".

### 2.5.5, IPv6

"Apps must be fully functional on IPv6-only networks." Nothing in the repository hardcodes an IPv4 address; the shell resolves a hostname over https. Verdict: `CLEAR`, unverified on an IPv6-only network. See the honesty log.

### 2.5.6, WebKit

"Apps that browse the web must use the appropriate WebKit framework." Capacitor uses `WKWebView` and we do not request an alternative engine entitlement. Verdict: `CLEAR`.

### 2.5.14, recording indication

"Apps must request explicit user consent and provide a clear visual and/or audible indication when recording, logging, or otherwise making a record of user activity." Nothing records. `apps/web/ios/App/App/Info.plist:130` records that `NSMicrophoneUsageDescription` is absent because nothing records audio. Verdict: `CLEAR`.

---

## A.12 Guideline 3.2.2, Unacceptable Business Model Requirements

**(v) "Arbitrarily restricting who may use the app, such as by location or carrier."** We intend to ship Nigeria-only. That is not arbitrary: the product sells Nigerian property, prices in naira, collects through a Nigerian processor and is governed by Nigerian law. State the reason in the review notes rather than leaving the geographic restriction unexplained. Verdict: `RISK`, low.

**(ix) personal loans.** We offer none. `SAVINGS_POTS.md:5-11` confirms no yield and no lending. Verdict: `CLEAR`.

**(iv) collecting funds for charities.** None. Verdict: `CLEAR`.

---

## A.13 Guideline 5.3, Gaming, Gambling and Lotteries; 5.1.4, Kids

No real-money gaming, no sweepstakes, no loot boxes. Verdict: `CLEAR`.

`apps/web/src/lib/legal/privacy.tsx:319-327` states the platform is for adults and requires an account holder to be at least 18. That is the correct posture for a product that holds a wallet and lets strangers meet at a property. It also sets the floor for the age rating (Part D.6) and it means 5.1.4 Kids does not apply. Verdict: `CLEAR`, provided the age rating is set consistently and the store listing carries no term implying a child audience (2.3.8).

---

# Part B. Google Play, policy by policy

## B.1 Target API level

Play requires new apps and updates to target Android 16 (API 36) from 31 August 2026, with an extension available to 1 November 2026. `apps/web/android/variables.gradle:2-4` sets `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`. Verdict: `CLEAR`. Do not lower it; `apps/web/android/app/src/main/AndroidManifest.xml:22-29` already warns that `usesCleartextTraffic` silently flips back if anyone does.

One unverified consequence: API 36 removes the opt-out from edge-to-edge display. We set `overlaysWebView: false` on the status bar (`apps/web/capacitor.config.ts:126`). Whether the web view is inset correctly on Android 16 has not been checked on a device. See the honesty log.

## B.2 16 KB page size

Required for updates from 1 May 2026 and enforced from 1 February 2027. Apps with no native code are compatible without changes. A search for `*.so` under `apps/web/android` returned nothing, and the dependency list at `apps/web/android/app/build.gradle:123-133` is AndroidX plus Capacitor, none of which ships native libraries. Verdict: `CLEAR`.

## B.3 Account deletion and Data safety

Play requires an in-app path to delete the account **and** a publicly reachable web URL where deletion can be requested without installing the app and without signing in, and the URL must be declared in the Data safety form. The requirement applies to any app that offers account creation at all, optional or not.

`apps/web/src/app/(site)/delete-account/page.tsx:19-25` was written to this requirement and names it. The page is public (`delete-account` is absent from `PRODUCT_SEGMENTS`, `apps/web/src/proxy.ts:54-88`). It explains what is destroyed and what is retained, generated from `apps/web/src/lib/account-deletion/plan.ts`. Verdict: `CLEAR`.

The Data safety URL to declare is `https://vallospaces.com/delete-account`, or whatever `NEXT_PUBLIC_SITE_URL` resolves to.

The Data safety **answers** are a different matter and are currently set up to be wrong, because `apps/web/android/app/src/main/AndroidManifest.xml:254-258` instructs a future filler to declare location as "approximate, not shared, not stored". Fixed in A.5 fix 2. The correct answers are in Part D.5.

## B.4 User Generated Content

Play's UGC policy requires clear terms of use, an in-app system for reporting objectionable content, and a function for users to block others. Specifically: UGC features that enable one-to-one user interaction with specific users must provide in-app functionality for blocking users. Play also expects robust, effective and ongoing moderation, requires that users accept the terms of use before creating or uploading UGC, and expects automated moderation at scale rather than manual review alone.

Our gaps are identical to A.4: no block control in messaging, no report control in messaging, no active terms acceptance, and a fraud-only filter. Verdict: `BLOCKER`. Fix: A.4 fixes 1 to 5, which serve both stores.

One Play-specific addition: Play's reviewers look for the reporting control to be reachable from every piece of UGC. After A.4 fix 2, audit that a report control exists on: a post, a comment, a story, a profile, a listing, an area page (`apps/web/src/app/(app)/around/[slug]`), and a conversation. The area page was not checked during this research; see the honesty log.

## B.5 Payments

Play's payments policy exempts physical goods and physical services from Google Play Billing: "Purchases or rentals of physical goods (such as groceries, clothing, home appliances, or electronics) and purchases of physical services (such as transportation services, airfare, gym memberships, or food delivery) are not supported by Google Play's billing system." Accommodation booking and rent fall squarely inside that exemption.

Verdict: `CLEAR`. The Paystack hosted flow is correct and no Play Billing integration is needed or permitted. Declare in the Play Console app content section that the app does not sell digital goods.

## B.6 Financial Features declaration, and the crypto policy

Play's Cryptocurrency Exchanges and Software Wallets policy, updated August 2025 and in force since 29 October 2025, requires developers of custodial crypto wallet apps and exchange apps to hold the appropriate regulatory licences and to declare the app as such in the Financial Features Declaration. Non-custodial wallets are out of scope. The policy names roughly fifteen markets; Nigeria was not confirmed in the sources reachable from here (see the honesty log).

Our position: we hold no keys and operate no exchange (`CRYPTO_DEPOSITS.md:1-5`). We do hold a custodial **naira** balance, which is a payments question rather than a crypto one.

Verdict: `RISK`. Fix: ship with crypto off per A.9, and answer the Financial Features Declaration as "no" for cryptocurrency exchange and "no" for software wallet. If crypto ships, the declaration must say yes and Yellow Card's licence becomes a document the founder has to be able to produce.

There is a second Play declaration to consider. Play's Financial Features section also asks about personal loans, and about apps that facilitate financial products. We offer neither lending nor investment; `SAVINGS_POTS.md:5-11` is the evidence that savings pots pay no return. Answer no.

## B.7 Photo and Video Permissions policy

Since 22 January 2025, apps declaring `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO` must either withdraw the permissions or submit a declaration justifying broad access, with the Android photo picker named as the expected alternative.

`apps/web/android/app/src/main/AndroidManifest.xml:284-289` deliberately declares neither, with the correct reasoning: uploads go through `<input type="file">`, the Storage Access Framework hands back a content URI we already have rights to, and declaring a media permission would trigger a declaration we could not justify.

Verdict: `CLEAR`. Declare "no broad photo or video access" in Play Console and do not add these permissions.

## B.8 Camera permission and the Capacitor file chooser

`apps/web/android/app/src/main/AndroidManifest.xml:272-282` states that Capacitor's `onShowFileChooser` requests the camera permission only when `fileChooserParams.isCaptureEnabled()` is true, which comes from the `capture` attribute, and that no `capture` attribute exists anywhere in `src`. Verdict: `CLEAR`, and the comment already names the consequence if anyone adds one.

Note the asymmetry with iOS, which is correct and should not be "fixed": `apps/web/ios/App/App/Info.plist:125-126` **does** declare `NSCameraUsageDescription`, because iOS terminates an app that reaches the camera from the system picker with no purpose string. The reasoning is at `apps/web/ios/App/App/Info.plist:100-124`.

## B.9 POST_NOTIFICATIONS and foreground services

Android 13 and above require `POST_NOTIFICATIONS` to be declared and requested at runtime before any notification can be shown. Android 14 and above require every foreground service to declare a `foregroundServiceType` and to justify it in Play Console.

We declare neither, correctly. `apps/web/android/app/src/main/AndroidManifest.xml:294-298`: notifications are database rows rendered in-product, Web Push is not wired and there is no FCM registration. `apps/web/android/app/build.gradle:137-144` applies the Google Services plugin only if `google-services.json` exists, and it does not exist in the tree. No `<service>` element appears in the manifest at all.

Verdict: `CLEAR`. If push ships later, this section must be revisited together with the Data safety form and the Apple privacy label.

## B.10 Permissions declared

The complete declared set is three lines: `INTERNET` (`apps/web/android/app/src/main/AndroidManifest.xml:198`), `ACCESS_COARSE_LOCATION` (`:220`) and `ACCESS_FINE_LOCATION` capped at API 30 (`:261`), plus a `<queries>` block for `https` VIEW intents (`:312-317`) which is package visibility rather than a permission. No restricted permission is declared, so no Permissions Declaration Form is required. Verdict: `CLEAR`.

## B.11 Release build hygiene

`apps/web/android/app/build.gradle:88` sets `debuggable false` explicitly, `:110` enables R8, `:111` leaves `shrinkResources` off with a stated reason (the splash drawable is resolved by name through `Resources.getIdentifier`, which resource shrinking cannot see). `apps/web/capacitor.config.ts:79` sets `webContentsDebuggingEnabled: false`. `apps/web/android/app/src/main/AndroidManifest.xml:4` sets `allowBackup="false"` with the correct reasoning about the session cookie travelling through Google Drive. Release signing reads an untracked `keystore.properties` and produces an unsigned artefact rather than a debug-signed one when absent (`apps/web/android/app/build.gradle:25-30, 63-77`). Verdict: `CLEAR`, and unusually well done.

`versionCode 100000` and `versionName "0.1.0"` at `apps/web/android/app/build.gradle:54-55` are written by `scripts/sync-native-versions.mjs`. Run `npm run sync:versions` before every release build.

## B.12 Misrepresentation and Deceptive Behaviour

Play's Misrepresentation policy prohibits apps that deceive users about their functionality or content. Forty two fabricated property listings (`apps/web/src/lib/listings/syndication.ts:9-16`) presented in a marketplace catalogue are exactly the shape that policy addresses, and Play has no review-notes field where the disclosure can be made. Verdict: `RISK`, higher on Play than on Apple precisely because there is nowhere to explain.

Fix: A.3 fix 4 (full sentence on the detail page) plus, for Play specifically, add the example statement to the store listing's short description if the example listings are still in the catalogue at launch. Better: get real inventory in before submitting to Play.

---

# Part C. Nigeria specifics

## C.1 Developer accounts

**Apple.** Enrolment as an organisation requires a legal entity name matching the registration, a D-U-N-S number for the entity, and a website on a domain owned by the entity. VALLO SPACES LTD, RC 9870413, registered office at Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, FCT, Abuja (`apps/web/src/lib/legal/company.ts:43-44`). Apple's 5.1.1(ix) requires a financial-services app to be submitted by the legal entity, so enrolling as an individual would be a rejection in itself.

**Google Play.** Organisation accounts must supply a D-U-N-S number as part of verification. Play developer verification enforcement begins 30 September 2026 in Brazil, Indonesia, Singapore and Thailand and expands globally in 2027, so Nigeria is not yet in the enforcement wave, but an organisation account needs the D-U-N-S now regardless.

One D-U-N-S number serves both stores. Request it free from Dun and Bradstreet against VALLO SPACES LTD at the registered office above, and expect the legal name and address to have to match the CAC certificate exactly.

## C.2 Payments

Paystack is a licensed Nigerian payment processor and is the correct counterparty for both stores under Apple 3.1.3(e) and Play's physical-services exemption. Nothing in either store's policy requires a Nigerian app to use a local processor, but both require the processor to be legitimate, and Apple's 5.1.1(ix) makes the entity identity matter.

`CRYPTO_DEPOSITS.md:38-45` records that Yellow Card business onboarding will ask for the CAC certificate, directors' identity documents, proof of address and a description of the money flow, which is the same wall as Paystack Transfers. That is founder work, not build work.

## C.3 Local regulatory declarations

**Nigeria Data Protection Act 2023.** `apps/web/src/lib/legal/company.ts:57-65` records that Vallo is a data controller of major importance because of what agent verification collects, and that NDPC registration has not been filed. Neither store asks for an NDPC number, but the privacy policy is defective under the Act without a correctly identified controller, and Apple 5.1.1(i) requires the policy to identify the controller. Filing it, and filling `COMPANY_NDPC_REGISTRATION`, closes both.

**SCUML.** `apps/web/src/app/(site)/delete-account/page.tsx:133-140` states publicly that "Vallo is registered with the Special Control Unit against Money Laundering". That is a factual claim made on a public page. It must be true before submission, because it is also the justification given for retaining transaction records after deletion, and a retention justification that rests on a registration we do not hold is a defective privacy notice.

**Age.** `apps/web/src/lib/legal/privacy.tsx:319-327` sets 18 as the minimum age. Consistent with a wallet and with Nigerian contracting capacity.

## C.4 Store availability

Ship Nigeria-only on submission one. Both stores allow per-territory availability. It keeps us out of the EU Digital Services Act trader-status requirement on Apple's side, out of the UK and EU age-assurance regimes, and out of the fifteen-market crypto licensing schedule on Play's side. State the reason in the Apple review notes so 3.2.2(v) does not bite.

---

# Part D. The submission metadata itself

## D.1 Demo account

Apple 2.1(a) requires demo account information when the app includes a login. Create one real account on the production origin, not a fixture, and prepare its state before submitting:

- Email and password entered in the App Store Connect demo account fields (not only in the notes).
- Wallet funded with a small real balance, so the wallet screen is not empty.
- One completed booking in `/trips` and one in `/bookings`.
- One live conversation with at least one inbound message, so the reviewer can find the new report and block controls.
- One published listing under the agent console.
- Crucially: **no** blocker that would disable the Delete Account button, or else the reviewer cannot test 5.1.1(v). If the account has a wallet balance, the Delete button will be disabled (`apps/web/src/lib/account-deletion/preconditions.ts:80-82`). Provide a **second** demo account with a zero balance and nothing open, whose only purpose is to demonstrate deletion, and say so in the notes.

Google Play has the same requirement in the App access section of Play Console. Enter the same two accounts there, with instructions.

## D.2 App Review notes, to be entered verbatim

```
Vallo is a Nigerian property and stays marketplace operated by VALLO SPACES LTD
(RC 9870413), Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, Federal Capital
Territory, Abuja, Nigeria. The application is available in Nigeria only because
it sells Nigerian property, prices in naira, and settles through a Nigerian
licensed payment processor.

DEMO ACCOUNTS
1. <email> / <password>. A full account: wallet balance, a completed booking,
   a live conversation, a published listing.
2. <email> / <password>. A clean account with nothing open, provided so you can
   test account deletion end to end. Deletion is in Settings, then Account.

BROWSING WITHOUT AN ACCOUNT
You do not need an account to see the product. Property search, listing pages,
Stays, restaurants, area pages and member profiles are all open signed out. An
account is required only to transact: saving, messaging, booking, paying,
listing and the wallet.

WHY THERE IS NO IN-APP PURCHASE (guideline 3.1.3(e))
Vallo sells no digital goods, no digital content, no subscriptions and no in-app
features. Every payment buys a physical service consumed outside the
application: a night in a hotel or shortlet, a restaurant table, a rent or
move-in payment on a real tenancy, or a property inspection. Guideline 3.1.3(e)
requires these to be collected by a method other than in-app purchase, which is
what we do, through Paystack on its own hosted page in the system browser. The
naira wallet is a settlement balance for those same physical services. It cannot
buy any feature or content inside the application, it earns no interest, and it
is withdrawable to a Nigerian bank account at any time.

EXAMPLE LISTINGS (guideline 2.1)
The catalogue currently contains 42 example listings, clearly labelled "Example
listing" on every card and carrying the full statement "This is an example
listing. No such property is available. Vallo has not verified anything on this
page." on the listing page itself. They exist because the marketplace is
launching and real inventory is being onboarded now. They are excluded from the
sitemap, from structured data and from Open Graph cards, so nothing about them
can be republished by a search engine or shared as a card. They are not
presented as verified and they carry no rating and no trust mark.

USER-GENERATED CONTENT (guideline 1.2)
Vallo includes a social feed, profiles, comments, stories and one-to-one
messaging. We have: a Community Rules document that every person must accept
before creating an account, stating that we have no tolerance for objectionable
content or abusive users; an automated filter that holds a post or a bio for
human review before it becomes public; a Report control on every post, comment,
story, profile, listing and conversation; a Block control on every profile and
every conversation, which makes the two people invisible to each other
everywhere on the platform; and a moderation queue staffed by our team. We act
on reports within 24 hours by removing the content and removing the account that
posted it. Our contact page is at <origin>/contact and is reachable without an
account.

ACCOUNT DELETION (guideline 5.1.1(v))
Deletion is in Settings, then Account, inside the application. It is also
explained on a public page at <origin>/delete-account that needs no account.
Deleting deactivates the account immediately and destroys the data 30 days
later, with a restore code in between. Where a person still has money in their
wallet or a booking in progress, the screen names exactly what is in the way and
links to the control that clears it, because destroying an account with an
unsettled payment in it would lose somebody money. Demo account 2 above has
nothing outstanding so the flow runs straight through.

LOCATION (guideline 5.1.5)
Location is requested only when a person taps a control that needs it, never on
launch. It is used to centre the search map and to set the pin when a host is
listing a property they are standing in. There is no background location.

NATIVE APPLICATION (guideline 4.2)
Vallo is not a web page in a wrapper. The shell handles the Android hardware
back button with overlay-aware behaviour, holds the splash screen until the
first paint rather than on a timer, paints the status bar to match the current
theme, resizes natively for the keyboard, opens every third-party URL in
SFSafariViewController so a payment or a sign-in never replaces the application,
receives universal links back from those flows, shares through the system share
sheet, and gives haptic feedback on confirmations. With no connection it shows
its own offline screen rather than a browser error.

ENCRYPTION
The application uses only HTTPS and the operating system's own keychain and
cookie storage. ITSAppUsesNonExemptEncryption is set to false in Info.plist.
```

Replace `<origin>` with the live domain and the two `<email>` / `<password>` pairs before submitting. Delete the share sheet and haptics sentence if A.1 fix 3 is not done.

## D.3 Export compliance

`apps/web/ios/App/App/Info.plist:49-50` already sets `ITSAppUsesNonExemptEncryption` to `false`, with the reasoning at lines 38 to 48. The answer in App Store Connect is therefore pre-answered and no annual self-classification report is required.

This is a legal declaration. It remains true only while the application adds no cryptography of its own. Using HTTPS and the platform keychain is the exemption Apple's own documentation describes. If a future release encrypts anything itself, `apps/web/ios/App/App/Info.plist:45-47` says to revisit this, and that instruction stands.

Verdict: `CLEAR`.

## D.4 Content rating questionnaires

**Google Play (IARC).** Answer:
- Violence: none.
- Sexuality: none.
- Language: none in first-party content.
- Controlled substances: references to alcohol are possible on restaurant pages. Answer honestly that the app lists restaurants which may serve alcohol; this does not by itself raise the rating above a teen tier in most boards.
- Gambling: none, simulated or real.
- **User interaction: yes.** Users can interact, share content, and share their location with other users (a listing's pin is a location shared with other users). This is the answer that sets the floor.
- **Digital purchases: no.** Purchases are of physical services.
- **Unrestricted internet access: yes**, in the sense that the app opens third-party URLs in the system browser.

Expect Teen or higher. Set the Play target audience to 18 and over, consistent with `apps/web/src/lib/legal/privacy.tsx:319-327`, which also keeps us out of Families policy entirely.

**Apple.** See D.6.

## D.5 Privacy labels and Data safety, row by row, from our actual code

This is derived from what the repository does, not from what the documents claim. Two data types that the privacy policy asserts (analytics and advertising) are **not** collected and must not be declared.

| Data type | Collected | Linked to identity | Used for tracking | Purpose | Evidence |
|---|---|---|---|---|---|
| Name | Yes | Yes | No | App functionality | Profile, displayed to counterparties; `apps/web/src/lib/legal/privacy.tsx:75-78` |
| Email address | Yes | Yes | No | App functionality, account management | `apps/web/src/lib/auth/actions.ts:283-292` |
| Phone number | Yes | Yes | No | App functionality | `apps/web/src/lib/legal/privacy.tsx:75-78`; `apps/web/src/lib/phone.ts` |
| Physical address | Yes | Yes | No | App functionality | Listing addresses entered by agents and hosts |
| Other contact info | No | - | - | - | - |
| Precise location | **Yes** | Yes | No | App functionality | `apps/web/src/components/host/HostWizard.tsx:612-618` stores a six-decimal fix; `apps/web/src/components/app/listing/TravelTime.tsx:86` transmits one |
| Coarse location | Yes | No | No | App functionality | `apps/web/src/components/app/search/MapCanvas.tsx:489`, used on device only |
| Financial info, payment info | Yes | Yes | No | App functionality | Payment references, amounts, wallet balance, saved card tokens and bank accounts; `apps/web/src/lib/payments/methods.ts`, `apps/web/src/lib/payments/bank-accounts-actions.ts`. Full card numbers are **not** stored; Paystack holds them |
| Credit info or credit score | No | - | - | - | - |
| Health, fitness | No | - | - | - | - |
| Sensitive info (government ID) | **Yes** | Yes | No | App functionality, legal obligation | Agent and host verification documents; bucket `agent-documents` and `host-documents` at `apps/web/src/lib/account-deletion/constants.ts:24-34`; `supabase/migrations/20260730122616_agent_documents_bucket_and_insert_policy.sql:21` |
| Contacts | No | - | - | - | `apps/web/ios/App/App/Info.plist:132-133` |
| Photos or videos | Yes | Yes | No | App functionality | Listing photos, avatars, covers, message attachments, story media; nine buckets at `apps/web/src/lib/account-deletion/constants.ts:24-34` |
| Audio | No | - | - | - | Nothing records; `apps/web/ios/App/App/Info.plist:130` |
| Files and documents | Yes | Yes | No | App functionality | Verification documents and message attachments |
| Messages (other user content) | Yes | Yes | No | App functionality | `public.messages`, `public.posts`, `public.comments`, `public.reviews` |
| Browsing history | No | - | - | - | No analytics; `apps/web/package.json:14-33` |
| Search history | Yes | Yes | No | App functionality | Saved searches at `apps/web/src/app/(app)/saved/searches` and `apps/web/src/lib/search/memory.ts` |
| Device ID | Yes | Yes | No | App functionality, security | Session rows carry a user agent; `supabase/migrations/20260809094236_a_person_can_see_where_they_are_signed_in_and_end_it.sql:45` |
| User ID | Yes | Yes | No | App functionality | Supabase `auth.users` id |
| Purchase history | Yes | Yes | No | App functionality | Bookings, reservations, wallet ledger |
| Product interaction, advertising data, other usage data | **No** | - | - | - | No analytics SDK exists |
| Crash data, performance data, other diagnostics | No | - | - | - | No crash reporting SDK exists; `apps/web/ios/App/App/Info.plist:139-143`. Note `apps/web/src/app/api/client-error` exists; if it records a user identifier, declare Diagnostics. See the honesty log |

App Tracking Transparency: **no tracking**. Do not ship `NSUserTrackingUsageDescription` and answer "No" to the tracking question for every row.

Data sharing with third parties, for the Play Data safety form: data is **processed by** Supabase, Vercel, Paystack and the email provider under contract, which Play treats as processing rather than sharing. Declare "Data is not shared with third parties" only if you are confident every one of those is a processor and not an independent controller. Paystack is the one worth checking, because a payment processor is frequently an independent controller for fraud purposes. If in doubt, declare Financial info as shared with a payment processor.

Also declare, on the Play form: data is encrypted in transit (HSTS with preload at `apps/web/next.config.ts:210-212`), and users can request deletion (URL at `<origin>/delete-account`).

## D.6 Age rating

Apple replaced the 12+ and 17+ tiers with 13+, 16+ and 18+. Responses to the updated questionnaire, including the new social media questions, are required with every new app or update submission from September 2026. A social media capability, defined as the ability to redistribute, amplify or interact with user-generated content through a feed or similar discovery method, locks the app to a minimum 13+ and puts a "Social Media" descriptor on the product page.

Vallo has a feed, follows, comments, stories and messaging (`apps/web/src/lib/social/posts-actions.ts`, `apps/web/src/lib/social/follows-actions.ts`, `apps/web/src/lib/social/stories-actions.ts`). So the social media flag is a yes and 13+ is the floor.

Answer the questionnaire as follows:
- Unrestricted web access: **yes** (the app opens third-party URLs in the system browser, `apps/web/src/lib/native/external-links.ts`).
- User-generated content: **yes**, with content moderation and reporting, and the ability to block.
- Messaging between users: **yes**, one to one.
- Friend or follower systems: **yes**.
- Livestreaming: no.
- Content creation tools: **yes**.
- In-app advertising: no.
- AI chatbot or assistant: **yes**, constrained to the app's own catalogue (see A.10).
- Gambling, contests, violence, sexual content, drugs, horror: none.

Set the rating to **18+**, not the 13+ floor, and say why in the notes: the product is a financial and property marketplace where the terms require an account holder to be at least 18 (`apps/web/src/lib/legal/privacy.tsx:319-327`), it holds a wallet, and it arranges meetings between strangers at physical properties. A rating that matches your own terms is defensible; a rating below your own terms is a contradiction a reviewer will notice.

## D.7 App Store Connect fields that cause avoidable rejections

- **Privacy Policy URL.** Must be `<origin>/privacy` and must resolve signed out. Verified public at `apps/web/src/proxy.ts:54-88`.
- **Support URL.** Must be a page with a working contact route. `<origin>/contact` qualifies; `apps/web/src/lib/support-email.ts:14-18` describes the working channel behind it.
- **Marketing URL.** Optional. Leave empty rather than pointing at an empty site (2.1 names "empty websites").
- **App name and subtitle.** Do not use any term implying a child audience (2.3.8). "Vallo" plus a subtitle naming property and stays.
- **Description.** Do not claim "verified listings". `apps/web/src/app/manifest.ts:37-50` records that this exact claim was removed once already because zero listings are verified and a check constraint enforces it. The manifest description at `apps/web/src/app/manifest.ts:49-50` is the safe wording to reuse.
- **Screenshots.** Must show the real product on the required device sizes. Do not screenshot an example listing without its label visible.
- **Trader status (EU).** Not applicable while Nigeria-only.

---

# Part E. Consolidated build agent work orders

Ordered by the sequence a build agent should execute them. Each references the section that explains it.

1. `apps/web/capacitor.config.ts:148-153`: add `errorPath: "index.html"` to the `server` block. (A.1)
2. `apps/web/native-shell/index.html`: make the retry button reload the configured server URL when one exists. (A.1)
3. `apps/web/public/.well-known/apple-app-site-association:7-11`: replace the `/auth/*` blanket exclusion with an include for `/auth/callback*` ordered before an exclusion for the rest of `/auth/*`. (A.2)
4. `apps/web/android/app/src/main/AndroidManifest.xml:152-167`: add `<data android:pathPrefix="/auth/callback" />`, and correct the comment at lines 104 to 109. (A.2)
5. `apps/web/src/lib/auth/providers.ts:69`: either add `"apple"` to `DEFAULT_SOCIALS` once the founder confirms the Supabase Apple provider is live, or set the production deployment to `NEXT_PUBLIC_AUTH_PROVIDERS=none`. Do not leave Google on and Apple off. (A.2)
6. Delete `apps/web/src/components/app/listing/TravelTime.tsx` and its import and two render sites in `apps/web/src/app/(app)/listing/[id]/page.tsx:31,962,1119`. (A.3)
7. `apps/web/ios/App/App/Info.plist:83-91`: rewrite the location purpose string and its explanatory comment to match what the code actually does. (A.5)
8. `apps/web/android/app/src/main/AndroidManifest.xml:204-258`: rewrite the location comment and remove the incorrect Data safety instruction. (A.5)
9. `apps/web/src/lib/legal/privacy.tsx:162` and `:310-315`: remove the analytics claims. (A.5)
10. `apps/web/src/lib/legal/privacy.tsx` section 5: add the named third-party list with the Apple assurance sentence. (A.5)
11. `apps/web/src/lib/legal/company.ts:54`: set `COMPANY_RC_NUMBER = "9870413"` and update its comment. (A.5)
12. `apps/web/src/app/(app)/messages/[id]/ThreadOptionsSheet.tsx`: add Report and Block rows, and update the doc comment at lines 12 to 20. (A.4)
13. `apps/web/src/lib/reports/schema.ts:78`: widen `REPORT_TARGETS` to include `conversation` and `message`. (A.4)
14. New file `apps/web/src/lib/safety/blocks-actions.ts`: move `blockUser` and `unblockUser` out from behind the social kill switch at `apps/web/src/lib/social/posts-actions.ts:603-655`, re-exporting for compatibility. (A.4)
15. New migration: add `public.blocked_terms`, extend `private.scan_post()` and `private.scan_social_profile()` with an objectionable-content branch, and add `profiles.terms_accepted_at`. Leave the term list unseeded with a `-- SEED REQUIRED` marker. (A.4)
16. New files `apps/web/src/lib/legal/eula.tsx` and `apps/web/src/app/(site)/eula/page.tsx`, carrying the 24-hour and zero-tolerance clause verbatim from A.4 fix 5. (A.4)
17. `apps/web/src/components/auth/EmailAuthForm.tsx:352` and `apps/web/src/components/auth/AuthChoices.tsx:144`: replace the passive terms notice with a required acceptance checkbox that blocks submission. (A.4)
18. `apps/web/src/app/(app)/crypto/page.tsx` and `apps/web/src/app/(app)/crypto/[id]/page.tsx`: `notFound()` when `isYellowCardConfigured()` is false, and remove the drawer link. (A.9)
19. The listing detail page: render `EXAMPLE_STATEMENT` rather than `EXAMPLE_LABEL` on the detail view, keeping the two-word badge on cards. (A.3)
20. `apps/web/src/app/(app)/wallet/page.tsx`: add the settlement-balance line under the balance. (A.8)
21. New file `apps/web/ios/App/App/PrivacyInfo.xcprivacy`, added to the App target, declaring `NSPrivacyTracking` false, an empty `NSPrivacyTrackingDomains`, the collected data types from Part D.5, and an empty `NSPrivacyAccessedAPITypes` unless a required-reason API is found in the App target sources. (R6)
22. Optional but recommended for 4.2: add `@capacitor/share` and `@capacitor/haptics`, with `apps/web/src/lib/native/share.ts` and `apps/web/src/lib/native/haptics.ts`, both no-ops off-native. (A.1)
23. Add a "Reports older than 24 hours" counter to the admin moderation dashboard beside `apps/web/src/lib/admin/moderation-queries.ts`. (A.4)
24. Run `npm run sync:versions` and `npm run sync:versions -- --check` before the release build, per `apps/web/android/app/build.gradle:39-53`.
25. Audit that a report control is reachable from an area page at `apps/web/src/app/(app)/around/[slug]`, which was not checked during this research. (B.4)

---

# Part F. FOUNDER ACTIONS

These cannot be done from inside the repository. Each one blocks something.

**F.1 Apple Developer Program enrolment as VALLO SPACES LTD.** Not as an individual. Apple guideline 5.1.1(ix) requires a financial-services app to be submitted by the legal entity. You will need the D-U-N-S number (F.4), the CAC certificate, and a website on a domain the company owns. Blocks: everything on iOS.

**F.2 Apple Team ID.** Ten alphanumeric characters, from Apple Developer, Membership details, or in Xcode beside the selected team in Signing and Capabilities. It replaces `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID` in `apps/web/public/.well-known/apple-app-site-association:5`. It is not your Apple ID email and not the bundle identifier. Blocks: universal links, therefore Google sign-in on iOS.

**F.3 The two Android SHA-256 fingerprints.** Both go into `apps/web/public/.well-known/assetlinks.json:8-9`, and leaving either out is the failure people spend a day on.
- The Play app signing key fingerprint: Play Console, the app, Release, Setup, App signing, "SHA-256 certificate fingerprint" under App signing key certificate. This is the one that matters on a shipped install.
- The upload key fingerprint: run `keytool -list -v -keystore upload-keystore.jks -alias upload` and take the line beginning SHA256.
Blocks: App Links verification.

**F.4 A D-U-N-S number for VALLO SPACES LTD.** Free from Dun and Bradstreet. The legal name and registered office must match the CAC certificate exactly. One number serves both Apple and Google. Blocks: F.1 and the Play organisation account.

**F.5 Sign in with Apple credentials.** An Apple Services ID and a Sign in with Apple key from the Apple Developer portal, entered in Supabase, Authentication, Providers, Apple. Blocks: the 4.8 decision in work order 5.

**F.6 Two demo accounts on the production origin**, prepared as described in D.1, with credentials handed to the build agent for the review notes and entered in App Store Connect and Play Console. Blocks: submission.

**F.7 The Community Rules content decision.** Approve the zero-tolerance clause in A.4 fix 5 and approve the blocked-terms seed list for the objectionable-content filter. Nobody else can decide what Vallo's standards forbid. Blocks: work orders 15 and 16.

**F.8 Confirm RC 9870413 against the certificate** before it is typed into `apps/web/src/lib/legal/company.ts:54`.

**F.9 File the NDPC registration** and supply the number for `apps/web/src/lib/legal/company.ts:65`.

**F.10 Confirm the SCUML registration exists.** `apps/web/src/app/(site)/delete-account/page.tsx:133-140` states publicly that Vallo is registered with the Special Control Unit against Money Laundering, and uses that registration as the justification for retaining transaction records after a deletion. If it is not true yet, that sentence has to come off the page until it is.

**F.11 Set `NEXT_PUBLIC_SUPPORT_EMAIL`** once a real mailbox exists. Until then `/contact` is a working channel and satisfies both stores, so this is an improvement rather than a blocker (`apps/web/src/lib/support-email.ts:14-22`).

**F.12 Decide: crypto in v1 or v1.1.** This document recommends v1.1 (A.9).

**F.13 Decide: push notifications in v1 or v1.1.** They are the strongest single 4.2 signal but they change the Android manifest, the Data safety form and the Apple privacy label (A.1).

**F.14 Xcode 26 or later on the build machine.** Uploads have required an iOS 26 SDK build since 28 April 2026.

**F.15 Real inventory.** The single best thing that can be done for both stores is to have real listings before submitting. Forty two fabricated properties is the most reviewer-visible weakness in the product and it is not a code problem.

**F.16 A support commitment to act on reports within 24 hours.** It is written into the EULA and Apple enforces it after approval, not only at review.

---

# Part G. Honesty log: things I could not verify

1. **Google's own policy pages could not be fetched.** `support.google.com` is blocked by this environment's egress proxy. Every Play policy statement in this document comes from web search result summaries and third-party write-ups rather than from Google's published text read directly. The target API level, account deletion, Data safety, UGC, payments, photo and video permissions, 16 KB page size and crypto policy statements should be re-read against `support.google.com` before acting on them.

2. **The 24-hour figure in guideline 1.2 is not in Apple's published text.** I fetched the App Review Guidelines and the published 1.2 text contains no 24-hour requirement. The 24-hour figure and the EULA requirement come from the rejection message App Review sends, as reported consistently in third-party accounts. I have treated it as binding because that is what we would receive, but it is not quotable from the guidelines page.

3. **Nothing has been run on a device or a simulator.** Every claim about runtime behaviour, including the airplane-mode blank view, the Android 12 location bridge behaviour described at `apps/web/android/app/src/main/AndroidManifest.xml:222-259`, and the OAuth cookie-jar failure, is reasoned from source and from the repository's own comments. The manifest comment itself says at lines 256 to 259 that its claim "has not been on a handset".

4. **`server.errorPath` behaviour on a failed remote load is inferred.** I verified the option exists and read its documented description at `node_modules/@capacitor/cli/dist/declarations.d.ts:602-609`. I did not read the iOS or Android bridge source to confirm that a failed provisional navigation to a remote `server.url` triggers it, as opposed to only a WebView version failure. Test this before relying on it.

5. **The AI assistant's system prompt was not read.** I read `apps/web/src/lib/assistant/protocol.ts` and `apps/web/src/lib/assistant/types.ts` but not `apps/web/src/app/api/assistant/route.ts`. Whether the assistant is constrained to property topics, and therefore whether it can surface content that changes the age rating, is unverified (A.10).

6. **`apps/web/src/app/api/client-error` was not read.** If it records a user identifier alongside an error, the Apple privacy label needs a Diagnostics row and the Play Data safety form needs a Crash logs row. Part D.5 currently declares neither.

7. **The area page's report control was not checked.** `apps/web/src/app/(app)/around/[slug]` was not opened. Work order 25 covers it.

8. **The `is_demo` count of 42 is the repository's own figure**, taken from `apps/web/src/lib/listings/syndication.ts:9`. I did not query the database and was instructed not to. The live count may differ.

9. **Whether Nigeria is inside Play's crypto licensing market list was not confirmed.** The sources reachable from here named roughly fifteen markets and Nigeria was not among those listed, but the list was not exhaustive (B.6).

10. **Play's treatment of Paystack as processor versus independent controller was not confirmed**, which is why Part D.5 offers a conservative alternative answer for the sharing question.

11. **Android 16 edge-to-edge behaviour in the Capacitor web view was not tested.** `overlaysWebView: false` at `apps/web/capacitor.config.ts:126` may or may not inset correctly on API 36 (B.1).

12. **No claim is made about whether the App Store Connect or Play Console records already exist**, or about the current state of the production Vercel environment variables. Every statement about configuration is about what the repository does when a variable is set or unset, not about what is actually set.

13. **The contradiction between `apps/web/public/.well-known/apple-app-site-association:8-11` and `apps/web/src/lib/native/deep-links.ts:36-43`** is resolved in this document in favour of `deep-links.ts`, on the reasoning that `startOAuth` is a server action executed from the web view (`apps/web/src/lib/auth/actions.ts:664-679`) and therefore sets the PKCE verifier cookie on the web view's jar. That is a reading of the code, not an observation of a device. It is the single most important thing on this list to test first.
