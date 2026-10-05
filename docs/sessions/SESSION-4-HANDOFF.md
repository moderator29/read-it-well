# SESSION 4 HANDOFF: QA, release and store

**From Session 1, 5 October 2026.** Copy this whole file as your opening brief.

**You own:** test suites, device testing, end-to-end repair, the Android release
lane, both store submissions, the legal and policy pages, documentation
consolidation.

**You do not own:** feature work. If you find a bug, write it up with a
reproduction and hand it to whichever session owns that layer. Fix only what is
inside your own files.

**Read first:** `docs/sessions/SESSION-1-RESPONSE.md` (sections 3, 10, 13, 14,
20), then Session 2's and Session 3's response documents, then
`docs/VALLO_NATIVE_TEST_MATRIX.md`, `docs/MOBILE.md`,
`docs/STORE_SUBMISSION_NOTES.md`, `docs/NATIVE_CI.md`.

---

## Binding rules

1. **Never skip, disable or quarantine a test to get green.** If a test fails,
   either the code is wrong or the test is wrong, and you say which.
2. **A failing test is never an infrastructure flake** until you have proved it
   twice and named the cause.
3. **Do not change a money, identity or compliance outcome** to make a test pass.
   Escalate instead.
4. **Do not rotate, create or delete a credential.**
5. **Report faithfully.** If something was not run, say it was not run. Every row
   of the current native test matrix reads NOT RUN, which is the right answer
   honestly recorded, and that standard continues.
6. **Maximum four agents**, file ownership declared up front.

---

## Tasks, in order

### Task 1: Prove one payment, end to end, on a real phone

**Nothing else in this session matters more.** The money layer has never carried
a single real naira. The only top-up ever recorded was credited by the reconciler
16 hours late rather than by the webhook, so the webhook has never been proven in
production. Paystack 3-D Secure inside the Capacitor WebView is untested and the
native audit calls it the single most likely failure in the whole app.

Needs from the founder first: `PAYSTACK_GUARANTEE_SUBACCOUNT` set, the webhook
registered, and one lister subaccount to exist.

Then, in test mode, on a real device, through the installed app:

1. Open a payment and reach the Paystack sheet inside the WebView.
2. Complete a 3-D Secure challenge.
3. Confirm the webhook lands and `settle_booking_charge` runs.
4. Confirm the split is recorded with the three parts summing to the charge.
5. Confirm the receipt renders and verifies.
6. Then abandon one attempt and confirm the sweep marks it `ABANDONED`.
7. Then refund one and confirm all three refund stamps move.

**Write the result up whether it passes or fails.** A failure here is the most
valuable finding available to this project.

### Task 2: Repair the test suite after the sweep

Session 3's full redesign will break end-to-end specs. Expect it; that cost was
accepted deliberately.

- Repair the 95 Playwright specs in `apps/web/tests/`. Selectors will have moved.
  Prefer role and accessible-name selectors over class names so the next redesign
  does not break them again.
- Re-run the whole vitest suite (5,773 tests) and fix what the sweep legitimately
  changed.
- Keep the guard tests green and untouched in intent: `banned-phrases`,
  `button-classes`, `css-diet`, `revoked-columns`, `anon-columns`,
  `no-committed-secrets`, `workspace-terms`, `claims`.
- Wire the end-to-end suite into a package script and into CI. Today only
  `check:a11y` is wired, so 95 specs run only when somebody remembers.

### Task 3: Device testing, for the first time ever

Every row of `docs/VALLO_NATIVE_TEST_MATRIX.md` reads NOT RUN. Fill it in.

- **iOS,** on real hardware through TestFlight: cold start with the startup
  animation, warm resume, no network, slow network, airplane mode mid-payment,
  deep link from a cold start, push tap routing once the APNs key exists, back
  gesture at a root, keyboard behaviour on every form, safe areas on a notched
  and a non-notched device, the dock never covering content.
- **Android,** on a real handset: all of the above, plus the hardware back button
  at a root and mid-flow, and **the Android 12+ system splash**, which currently
  shows the launcher icon rather than the splash because
  `windowSplashScreenAnimatedIcon` is unset. Verify Session 3 fixed it.
- **The offline card:** kill the network at launch and confirm the card appears
  with the real logo, and that Try again recovers.
- Record device, OS version, and what actually happened. "Probably fine" is not
  an entry.

### Task 4: The Android release lane

Android has only ever built debug. Build the release lane.

Needs from the founder: the Play account enrolled as the organisation, the upload
keystore, Play App Signing enabled, the real `assetlinks.json` SHA-256 values,
and a real Firebase `current_key`.

Then:

1. Replace the two `PLACEHOLDER_` SHA-256 values in
   `public/.well-known/assetlinks.json`. Strict `cap:sync` refuses until they are
   real, which is the guard working correctly.
2. Replace the placeholder Firebase key, which currently makes `bundleRelease`
   refuse.
3. Add a release workflow mirroring `native-ios.yml`: signed AAB, keystore from
   secrets using the `ANDROID_KEYSTORE_*` names already reserved in
   `docs/NATIVE_CI.md`, manual trigger with an upload input.
4. Verify App Links resolve on a device once `assetlinks.json` is live.
5. Internal testing track before production.

### Task 5: Store submission, both platforms

**Apple:** screenshots from the shipped build at every required size, the privacy
form with **Diagnostics and Performance Data changed to yes** once Sentry exists,
a reviewer account with credentials and a passcode that works, the What to Test
notes, Associated Domains verified, and the APNs key before claiming push.

**Google:** the full listing, the 1024x500 feature graphic, the Data Safety form
matching the privacy policy exactly, the Financial Services declaration, and the
account deletion URL, which already exists at `/delete-account`.

**Both:** confirm no banned word reaches a store screenshot, and that the
reviewer can reach real content. **If no listing is published at submission time,
say so to the founder before submitting**, because a reviewer who finds an empty
marketplace is a rejection risk independent of anything technical.

### Task 6: Legal and policy pages

These are content pages and they are yours. Each needs the founder's or counsel's
answers first; build the page and leave a clearly marked gap rather than inventing
a policy.

- **Payout terms:** settlement timing, fees, chargebacks, reversals, withholding.
  There is no such page and listers are being asked to accept terms that do not
  describe how they are paid.
- **Dispute resolution policy:** SLA, escalation, forum, FCCPC reference. This
  becomes urgent if Payluk Track 2 ever proceeds, because Payluk does not
  arbitrate: the merchant does, meaning Vallo would.
- **KYC and KYB policy:** NIN, BVN, CAC for agents and hosts.
- **Cookie consent**, after the founder's policy decision.
- **NDPC registration number** into `lib/legal/company.ts`, where it is currently
  null, and a Data Protection Officer who is not the founder.
- **Date the cancellations page.** It carries none.
- Legal pages are English only. Note it; do not machine-translate a contract.

### Task 7: Documentation consolidation

60 top-level documents, five overlap clusters, and 21 live documents linking to
`archive/HANDOFF_*` files that were deleted.

1. **Fix the 21 broken links.** The docs README calls one deleted file "the only
   written record of the company's obligations". Reconstruct that content into a
   live `docs/COMPANY.md` from the founder's knowledge. This is the most important
   item in this task.
2. **Collapse the clusters** to one document each: design direction (now
   `VISUAL_NORTH_STAR_2026-10-05.md`), icons (same), mobile, recommendations,
   navigation.
3. **Archive the finished dated sweeps:** the audit fixes, the UI/UX
   recommendations, and the motion, pixel, performance, responsive, integration
   and e2e sweeps, the founder trace and the gap audit.
4. **Keep** `THE_HUNDRED.md` and `RECOMMENDATIONS.md`, because code comments cite
   their identifiers. Merge `recs/` into `RECOMMENDATIONS.md`.
5. Re-date `security/GRANT_STATE.md` after any grant change.

### Task 8: The gaps nobody is watching

- **No error reporting.** `SENTRY_DSN` is unset, so nobody learns when a member
  hits an exception. The founder must create the project; you wire it and set the
  store privacy answer to match.
- **No pager.** `OPS_ALERT_WEBHOOK_URL` is unset and the database pager pages
  nobody until a Vault secret exists.
- **No uptime monitor** on `/api/health/catalogue`.
- **Supabase is on Free**, which means no restorable backup of a money ledger.
  Founder item, and the one Session 1 would lose sleep over. Do not let the first
  real payment happen before it is fixed.

---

## Your response document

Write `docs/sessions/SESSION-4-RESPONSE.md`. It must contain:

1. The Task 1 result, in full, pass or fail.
2. The device matrix, filled in, with device and OS per row. NOT RUN stays NOT
   RUN where it is true.
3. Test suite state: counts, what you repaired, what you could not and why.
4. Store readiness per platform, with what is still missing and who holds it.
5. Every bug you found, with a reproduction, routed to the owning session.
6. What is blocked on the founder, with the exact value needed.
