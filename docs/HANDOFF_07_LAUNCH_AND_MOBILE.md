# HANDOFF 07: the launch and mobile handoff

**Written 22 September 2026.** This file is additive to
`docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` (third edition), which
remains the build brief. It answers one question the founder asked
directly: what stands between today and a product live in both app stores,
who does each piece, and in what order. The build session takes the build
tasks here alongside its current work; the founder tasks are the founder's
alone and several have external clocks that start the day he begins them.

Two research files are written beside this one and are part of it:
`docs/research/MOBILE_STRATEGY_RESEARCH.md` (the Capacitor versus React
Native decision, quantified) and `docs/research/UNFINISHED_WORK_AUDIT.md`
(everything in the tree that is not finished or not wired, ranked). Read
both before planning from this file.

---

## 1. The architecture ruling: Capacitor ships, React Native waits

The founder asked whether to rebuild the mobile app in React Native with
Expo, possibly in a separate repository. **The answer is no, not before
launch, and never in a separate repository.** Three measured facts decide
it:

1. **The mobile app already exists.** `apps/web/capacitor.config.ts`, a
   generated `android/` and `ios/` project, a native runtime in
   `apps/web/src/lib/native/` covering status bar, splash, keyboard inset,
   hardware back, deep links, external link and theme, an offline fallback
   shell, an icon pipeline and a version sync script. `docs/MOBILE.md` is
   the operating manual and it is complete. Shipping it on both stores is
   **3 to 5 engineer-weeks and 130 to 200 US dollars of accounts**.
2. **There is no API for a React Native client to call.** The decisive
   fact. **233 server actions across 69 files**, 755 inline `.from()` read
   sites against 53 exported query functions, and **exactly one product
   data API route in the entire tree** (`app/api/map/listings`). React
   Native cannot call a server action. Building the API layer it would need
   is **19 to 30 engineer-weeks**, or 6 to 9 for a reduced scope.
3. **The frontend does not survive the move.** 680 tsx files, 109,906
   lines, 1,352 distinct `.nf-` selectors, 157 `backdrop-filter` usages,
   54 `@keyframes`, 451 CSS custom properties, and 229 of 235 page files
   are server components. The signature 3D side flip has no React Native
   equivalent pattern. Parity is **76 to 115 engineer-weeks**.

**The arithmetic that closes it.** A reduced-scope React Native version one
is 82 to 124 engineer-weeks, which is **41,000 to 155,000 US dollars** at
realistic contract rates and 7 to 28 months. The brief is 18 days and about
2,200 dollars. This is not a trade-off to weigh; it is two orders of
magnitude out.

**Ship Android first.** Google Play is materially more tolerant of a
remote-origin shell than Apple is. Releasing on Play first puts the product
in real hands, earns real usage, and makes the Apple submission a stronger
one when it comes. And on Apple: **plan for one guideline 4.2 rejection
rather than contorting the product to avoid it.** A rejection is a
conversation with review notes, not a death sentence, and the mitigation
pack below is what wins that conversation.

**If React Native is ever taken**, it is a fourth workspace package in this
monorepo beside `@vallo/web`, `@vallo/design-tokens` and `@vallo/i18n`,
sharing tokens, translations and the generated database types. Never a
separate repository: that splits the types, doubles the work and drifts
within weeks. The prerequisite is the HTTP API layer, which the platform
needs anyway for partner integrations, so building that API after launch is
the move that keeps the option open without paying for it now.

---

## 2. The founder's runbook, with the clocks that matter

These are the founder's tasks. Two of them have external waiting periods,
so they are started first and everything else proceeds in parallel.

### 2.1 The D-U-N-S number, START TODAY, up to 5 business days

Apple requires organisations to enrol with a D-U-N-S number registered to
the legal entity, and Google requires the same for an organisation
developer account. It is free and it is the long pole.

1. Go to Apple's D-U-N-S lookup at
   `developer.apple.com/enroll/duns-lookup` and search for VALLO SPACES LTD
2. If it is not found, request one through that same page, free
3. Details must match the CAC record exactly: legal name VALLO SPACES LTD,
   registered address Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council,
   FCT, Abuja
4. Dun and Bradstreet answer within about five business days. Nothing
   speeds this up, so it starts before anything else

### 2.2 Apple Developer Program, organisation, 99 USD a year

Enrol as **VALLO SPACES LTD**, never as an individual. Moving an app from a
personal account to a company account later is a migration with real pain
and it cannot be undone casually. Needs: the D-U-N-S number, the legal
entity name, the company website (vallospaces.com), and a person with
authority to bind the company, which is the founder as a director. Apple
may telephone to verify. Budget one to two weeks from application to
approval once the D-U-N-S exists.

### 2.3 Google Play Console, 25 USD once

Organisation account, same legal entity, same D-U-N-S. Google verifies the
organisation and may ask for the CAC certificate. Play also requires a
publicly reachable account deletion request page, which is why
`/delete-account` was built.

### 2.4 The Mac question: no Mac is needed

Xcode only runs on macOS, but the founder does not need to own one. A cloud
macOS build service compiles, signs and uploads the iOS build from a Linux
or Windows machine. **Codemagic is the recommended choice** because
`scripts/sync-native-versions.mjs` already reads `$PROJECT_BUILD_NUMBER`,
which is Codemagic's variable, so a previous session already aimed at it.
Alternatives are Bitrise and Capawesome Cloud. All of them spin up a real
Mac, handle certificates and provisioning through an App Store Connect API
key, and upload straight to TestFlight.

What the founder still needs physically: **a real phone to test on**, iOS
and Android, because nothing in this project has ever run on a device. A
borrowed iPhone for an afternoon is enough to catch what a headless browser
cannot.

### 2.5 The rest of the founder list

- Resend DNS records for vallospaces.com, and the ImprovMX forwarding, so
  hello@ and support@ work
- The seeded login for the build session, still outstanding and still the
  highest-leverage gift
- The Supabase leaked-password toggle
- M6 and the landmark seed, when asked
- The CoinGecko API key when the crypto surface needs it
- Store assets the build cannot produce: the light wordmark render, and
  approval of the store screenshots once they are taken from a real build

---

## 3. The build session's mobile and launch work

Detail and effort estimates are in `MOBILE_STRATEGY_RESEARCH.md`; the
ranked list of everything unfinished is in `UNFINISHED_WORK_AUDIT.md`. The
mobile-specific work, in priority order:

**M1. Push notifications, end to end.** The highest-value item on this
list, for two reasons at once: it is the retention loop the product has no
substitute for, and it is the strongest single argument that this is an
application rather than a web view when Apple reads guideline 4.2 against
us. Notifications exist today as database rows that never reach a device
and the app never requests the permission. Wire: the Capacitor push plugin,
FCM for Android and APNs for iOS, a device token table with RLS, the send
path from the existing `private.notify` triggers, permission requested at a
moment that earns it rather than on first launch, and the tap deep-linking
into the correct side of the two-side app. Update the store data-safety
answers to match.

**M2. Deep links closed.** The association files under
`apps/web/public/.well-known/` carry placeholder values. Fill them with the
real team and package identifiers once the store accounts exist, verify
both hosts, and prove that a shared Vallo link opens the installed app
rather than a browser. This also closes Google sign-in on native, which
currently opens the system browser and cannot complete the return.

**M3. The bundle identifier, before any store record exists.** It is
`ng.vallo.app`, derived from a domain that was dropped. It becomes
permanent the day a store record is created. Change it to
`com.vallospaces.app` everywhere, with the drift test extended to cover it.

**M3b. Two factual errors inside `capacitor.config.ts` itself.** Its
header claims "40 files declare server actions" when the real count is 69,
and it names `src/middleware.ts` as the session lock, **a file that does not
exist anywhere in source**. Next 16 renamed it: the session lock is
`apps/web/src/proxy.ts`, 244 lines. Correct both, because this file is the
first thing any future session reads about the mobile architecture and it
is currently teaching them something false.

**M4. A real device pass.** Everything mobile in this repository has been
verified in headless Chromium at 390px. Nothing has run on a phone. Once
the first build exists, walk every core journey on a real device in both
themes, with a notch and with a metered connection, and record what only a
device can show: safe areas, keyboard behaviour, scroll physics, the flip
under a real compositor, image weight on a slow bundle.

**M5. Store submission assets and answers.** Screenshots at the sizes each
device class demands, taken from the shipped build rather than a browser;
the privacy and data-safety questionnaires, for which `MOBILE_READINESS.md`
section 5 already holds the data inventory; the age rating; export
compliance; and review notes for Apple that name each native capability in
`lib/native/` and state plainly what the app does that a bookmark cannot.

---

## 4. The home page category grid, a founder correction

The built category grid on the home page does not match
`docs/design/references`. In the reference the glass object icon is the
dominant element in each tile and the listing count is quiet supporting
text. In the build the icon is small and the count is loud. Correct it to
the reference: **grow the icon substantially, reduce the listing count to
secondary size and weight**, keep the label as the second element, and
carry the same correction to every tile grid that inherited the wrong
proportion. Judge it against the reference image, not against the current
build.

---

## 5. The i18n finding, which is a launch blocker

The live home page renders its category labels in a mixture of Yoruba and
English in the same grid: "Yá", "Rà", "Hotẹ́ẹ̀lì", "Fláàtì", "Ilé oúnjẹ",
"Ọ́fíìsì", "Ilẹ̀" beside untranslated "Shortlet" and "Villa". That is a
half-populated locale reaching a user. `UNFINISHED_WORK_AUDIT.md` section 4
carries the full audit. The ruling this handoff makes: **no locale ships
that cannot render a complete surface.** Either a locale is finished, or it
is not offered in the language picker at launch. A product that switches
language halfway through a grid reads as broken, and on a first impression
that costs more than the locale earns.

---

## 6. Definition of done for this handoff

1. The bundle identifier corrected before any store record exists
2. Push notifications delivering to a real device, both platforms
3. Deep links verified, a shared link opening the installed app
4. One full journey walked on a real iOS device and a real Android device
5. Store accounts approved, the first build uploaded to TestFlight and to
   Play internal testing
6. Screenshots, questionnaires and review notes complete
7. Every locale offered is complete, or it is not offered
8. The category grid and every other surface matching the reference images
