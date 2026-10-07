# Session report: the single build session (started 7 October 2026)

Written as the session goes, so an interrupted session still leaves usable state.

**Audit base:** `f94963c7` (main) merged with `93ac365b`
(`claude/rentme-v2-platform-audit-xuvg0a`, the docs-only branch carrying the handoff,
the founder corpus, ADR 0003 and D68 to D69, which was never merged to main).
Branch: `claude/zen-bohr-k3fb81`.

## 0. Environment, as found

- `VALLO_TEST_EMAIL_A/B` and `VALLO_TEST_PASSWORD_A/B` are **not set** in this
  environment. The sign-in walk (handoff 2.5) could not be done with real accounts.
  Signed-out surfaces and a local build are walked instead; everything behind a
  sign in is reported from source and local rendering, and said so per surface.
- `PAYSTACK_TEST_SECRET_KEY` and a Payluk `sk_test_` key are **not set** either. The
  Payluk adapter is built against the committed documentation
  (`docs/payments/payluk-source/`) with tests on recorded shapes, and is not yet
  exercised against staging.
- No physical Android device exists here. The four startup numbers the handoff asks
  for (A.2) need one; what can be measured on a throttled headless Chromium is
  measured and labelled as such.

## 0b. Live database, as applied (7 October 2026, under the founder's go-ahead)

One migration at a time through the Supabase connector; after each, a read-only
structural check (RLS on, no anonymous read, no member write where none is meant,
switch rows off), then the file committed under the stamped version and recorded in
`APPLIED.txt`. Its probe moves into `supabase/tests/probes/`, which the CI
`db-probes` job runs on the next push to main. Probes cannot run through the
connector here: they write and roll back, and that outlasts its 60-second limit.

| Version | Migration | Check after |
| --- | --- | --- |
| 20261007132951 | d73a switch | `stays_instant_pay` row off |
| 20261007145850 | b3 rate agreement gate | gate resolver present, kill switch off |
| 20261007145948 | b3x fee record unify | applied straight after b3 |
| 20261007150611 | b6 member money rail | RLS on, no anon read, no member write |
| 20261007150649 | d73a trigger | instant step behind the switch |
| 20261007150712 | d73a notices | |
| 20261007151000 | d73b provider arrangements | three tables RLS on, no anon read, no member write |
| 20261007151321 | d75a restaurant deposits | deposits read-only to the two parties; switch off |
| 20261007151348 | d75b stay trip details | live review policy matched the copy before altering; `my_stay_details` not callable signed out |
| 20261007151629 | p2 follow suggestions | runs; 0 rows today (no lister has a public handle yet) |
| 20261007151806 | d76 leaderboards and directory | boards empty (no qualifying activity, nothing invented); directory 1 real agent; anon cannot hide; opt-outs unreadable. Lead added revokes on its five private helpers |

**Not applied yet:**
- `d73a_stays_instant_pay_sweep` (pending folder): replaces the live 15-minute sweep
  to release unpaid instant bookings. Twice it timed out with nothing holding a lock;
  the connector holds statements of this shape for a confirmation it cannot show
  here. Run it in the Supabase SQL editor before `stays_instant_pay` goes on. Its
  probe stays in `probes-pending/` until then (it exercises the sweep).
- `b2_rail_at_open`, then `d68d_the_rail_decides_the_gate`: after the main deploy
  that writes the rail, as their headers require.

## 0c. The failed background commands, and whether they matter

- **Typecheck and dev servers killed (exit 137), several times:** memory, with up to
  six agents on a 16 GB machine. No code fault; the same checks passed when the
  machine was quiet. Does not matter.
- **One shell killed itself (exit 144):** `pkill -f "next dev"` matched its own command
  line. Harmless.
- **vitest "Target crashed" and mass timeouts in the DOM suite:** memory again; all 147
  DOM files passed on a quiet run. Does not matter.
- **Connector timeouts:** the first whole-file d73a apply (rolled back, nothing
  changed; then applied in pieces), two attempts at the d73a sweep (not applied,
  see 0b), and every probe run through the connector (moved to CI). Only the sweep
  matters, and it is listed above.
- **GitHub push 500s (15:12 to 15:16):** server side on GitHub; the same commits went
  through a few minutes later. Does not matter.

## 0d. Switches turned on

| When (UTC) | Switches | Checked |
| --- | --- | --- |
| 7 Oct 15:24 | `listing_board`, `commute_by_the_clock`, `neighbours_account`, `show_me` | Code already on main. Audited by the `feature_flags` trigger. Read uncached by every visitor (select policy is open), so production sees them at once. Walked signed in as the QA member against production (`scripts/design/session-b-shots/flags-live-walk.mjs`, read-only): sign-in fine, the board door answers 200, no page errors. Nothing new is visible yet: all four hide on example listings by design, and live has no real published listing (64 examples, 1 draft). They show on the first real rental or sale. |

Next: group 2 (`room_bookings`, `stays_instant_pay`, `restaurant_deposits`) after the main deploy carries their code; `stays_instant_pay` also waits for the d73a sweep. The old `wallet` key is a retired custody switch the database refuses to turn on; the balance runs on the b6 rail's own switch.

## 0e. On main (7 October, evening)

Main `95e9ab6ea` carries the whole session: the QA fixes, the payments round (funding
screen, risk settings, lister fee write, Payluk adapter ready on its key), the fixer's
round (the four styling tests, page files exporting only what Next allows, Send's code
step, Add money no longer cancelling a deposit that may be paid, story composer errors,
swipe stack, unread count without a session). Unit suite 845 files, 10,018 passed;
typecheck clean; lint 0 errors.

Applied after the deploy that writes the rail: b2 (20261007154008), d68d (20261007154216),
d77 (20261007154344). Live after d77: direct threshold 500,000 naira, sale never direct,
first-deal signal scoped, `payments_payluk_on` seeded off.

Still open:
- The d73a sweep (section 0b): run in the Supabase SQL editor before `stays_instant_pay`.
- A deposit left waiting for payment never expires: nothing reads it back from the
  provider or ends it, so an unpaid one stays pending in the activity list. Needs a
  read-back or expiry job (money is never at risk; it is a stale row).
- A missing-key React warning on signed-in pages (`OuterLayoutRouter`, and SavedBoard
  from SavedPage) not yet reproduced; needs one signed-in dev run.
- The Payluk escrow flow is tested only against fixtures from Payluk's documentation.

## 1. Built, with evidence

| Item | Commit | Evidence |
| --- | --- | --- |
| Money group in the side navigation: Payments, Receipts, Payouts, Refunds, Rewards, Invite friends | (this commit) | `nav-money.test.ts` asserts all six rows on both sides, none signed out; typecheck clean |
| Unification decisions written once | (this commit) | `docs/design/ONE-PRODUCT-DECISIONS.md` |
| **The logo never shows on app open.** Native launch image is a plain `#010118` field on all 26 Android and 9 iOS images, generated by `scripts/build-native-icons.mjs`. The `StartupSequence` logo overlay is off the startup path. The opening is the page arriving: header and dock from frame one, content rising, about 1,500ms first open, 400ms returning (within 6h), a tap settles it, one settled frame under reduced motion, Calm, Off and save-data. | `639e6c928`, `1fead55ee` | `native-splash.test.ts` fails on any non-navy pixel; `StartupOpening.dom.test.tsx` (real Chromium) asserts no brand art at 300, 700 and 1,200ms, header and dock in frame one, tap-to-settle, and the bridge hide firing before any frame; `startup-css.test.ts` fails if the logo overlay returns. 191 tests across startup, native, passcode and motion pass after merge. Frames: `docs/sessions/shots/threshold/` |
| Native splash hidden from the first script in the document via the raw bridge, with retries at 100ms for 3s and re-sends at 400 and 1,200ms, and a boot trace | `1fead55ee` | On the device, `localStorage.nf_boot_trace` (or the `[vallo-boot]` console lines) names each stage, so the 8 second hold can be diagnosed from his phone rather than guessed |
| **Plus button:** never an empty slot (the dock now falls back to the real plus for its side), and the native keyboard state also clears on `keyboardDidHide`, which could leave the whole dock `display: none`. The sheet is **three plain options**, titles only: List a property, Post to the feed, Book a viewing (Stays: Create a stay listing, Post, Book a stay). Workspace switch left the sheet; it stays on `/profile`. | `92dcb0a56` | `CreateDock.dom.test.tsx` rewritten to assert three plain options per side, no workspace row; shots in `docs/sessions/shots/surface/` |
| **Profiles: one system, two states.** `components/app/identity/IdentityHeader.tsx` renders both `/profile` (mine: photo picker, edit) and `/u/[handle]` (theirs: Follow, Message, menu). Message opens the conversation on their newest listing. | `5a0460303` | profile and social tests pass; preview-harness shots (no signed-in account here) |
| **Feed:** each part of a card rises on its own scroll timeline in reading order, media parallax bounded at 0.6, felt press, one favourite payoff (1.0 to 1.04 to 1.0, 180ms) on the feed and the listing | `1cfe2d11d` | css and social tests pass |
| **Flip card:** a slab with lit edges, a mid-turn state it pauses on at 108 degrees, real 3D scenes on its face, and Calm and Off now get the crossfade | `f2da47e4d` | matched to `GOVERNING-flip-mid-turn.png`; shots in `shots/surface/` |
| **The Payluk adapter and the member money rail** (phases 4 to 10 and 15): adapter registered behind the capability seam (declares `hold_in_escrow` and `member_wallet`, not refund or split), naira major units converted at the boundary, the 10 a minute limit, the four balance figures each with when it was confirmed, deposits by payment intent, withdrawals with the provider's own fee, bank checks, sends by phone, the signed and idempotent webhook, and `/wallet` (labelled "Balance") with Add money, Withdraw and Send. Escrow flows stay off until phases 11 and 12. | `cfb4112e3` to `28a45cb6c` | 761 money, payments, webhook and nav tests pass after merge, including a test that catches a hundredfold naira and kobo error, an unsigned webhook writing nothing, and a redelivery changing nothing. **Not exercised against Payluk staging: no key here.** |
| **D73, two ways to pay.** Instant booking and direct card payment for fixed-price stays (hotel rooms and nightly listings), behind `stays_instant_pay` (off): the guest's own booking runs every existing check, a trigger writes the stay agreement approved by the system at the database total, the existing payment gate, split, Paystack charge and settlement run unchanged, and an unpaid instant booking is released after 30 to 45 minutes. Escrow for rentals (standard and milestone) through Payluk, behind `rentals_protected_pay` (off) and `PAYLUK_ESCROW_FLOWS_BUILT = false`; release only when the renter confirms. Restaurants take no payment today (a reservation has no price). | `ab6266295`, `130667e53` | 616 tests across bookings, stays, money, payments, checkout and the webhook pass after merge; both migrations ran 20 scenarios in a scratch database; switch-off proven unchanged by tests and probe steps. **Migrations pending, not applied.** |
| Passcode feel: haptic on press not release, keys press and spring back, dots land with weight (280ms), one sharp 320ms shake on a wrong code with "Try again:" | `b51add6e0` | passcode tests pass; not screenshotted (needs a signed-in account with a passcode) |

## 2. Scored (honest, out of 100)

| Surface | Before | After | What would raise it |
| --- | --- | --- | --- |
| Side navigation (reachability) | 35 | 70 | Pro and the wallet surfaces need to exist before they can be routed |
| App open | 15 | 70 | A recording on his device after a **new native build**, and the four numbers measured there |
| Native launch image | 30 | 90 | Shipping it: he only loses the native logo after installing a new build |
| Passcode | 55 | 65 | Biometric first, the greeting with his avatar, and seeing it on his phone |
| Plus button and sheet | 25 | 70 | Seeing it on his device |
| Profiles (mine and theirs) | 30 | 62 | Identity motion, role renders, a reviews block for non-agents |
| Feed | 45 | 66 | The premium pass now running (action capsules, hierarchy, blur-up) |
| Flip card | 20 | 68 | The dimmed real page behind the card, as in the ruled frame |
| Wallet | n/a | 68 | Running against Payluk staging, sharper icons, a receipt per movement |
| Sign in and sign up | 60 | 60 | Unchanged; already restored by `6627006ab` at his request |

## 3. Route audit

Published at `docs/sessions/ROUTE-AUDIT.md`, generated by
`scripts/audit/route-reach.mjs` (re-runnable, reach computed from the link graph, not
guessed). 224 pages outside `(dev)` and previews. With the Money group: 27 in the side
navigation or dock, 125 one tap from a destination, 13 deeper, 50 dynamic children of
a reachable list, 4 reached only from outside the product (email, SMS, share link,
service worker), and **5 orphans**, all deliberate or stubs: `/areas/[state]/[area]`
(404 until real listings), `/settings/invite/referrals/[id]` (placeholder),
`/styleguide` (internal), `/host/start` and `/sign-in/email` (redirect stubs).
`/legal/disclaimer` was a real orphan and now has a link from Terms.

"Is it good" scores are a heuristic read of the source, capped at 88 because source
cannot show the look, and are not a signed-in walk. Average 79; lowest `/offline` 50,
`/auth/callback` 59, public legal, `/guides`, `/r` and `/welcome` at 63.

Admin on a phone: not walked (no staff sign-in here). The audit flagged five desks
whose tables might overflow; on review both table families (`nf-md-table` in
`admin/money/_desk/desk.css`, `nf-rv-table` in `admin/_review/review.css`) already
collapse to one card per row under 768px and 720px. False positive, nothing changed.

## 4. Not built, and why

- **App open, measured on a device.** No physical Android here. Headless Chromium on the
  dev server (390x844, CPU 2x, 150ms round trip), labelled as such: before, first real
  content at 2,300 to 3,300ms and the logo alone on screen for about 850 to 1,950ms;
  after, first real content at a median of about 1,140ms on a first open and 440 to
  610ms on a returning one, and **0ms of logo alone**. Still frames before and after
  are in `docs/sessions/shots/threshold/`; the 1,200ms "before" frame is the logo alone
  on navy, which fails his test, and the "after" frames are the welcome page arriving.
- **Get Started redesign (A.3).** Not reached. `/welcome` was restored to the
  pre-redesign version at his request in `6627006ab`, so the monotone redesign and the
  trust line ("Vallo does not hold your money, a licensed provider does") wait for his
  word that the restore is not final.
- **Biometric first on the passcode.** Opening the passkey prompt automatically needs a
  user gesture on iOS, so it stays a key on the pad.

- **Pro.** No `/pro` route exists in the tree, so "the pro and etc too" cannot be
  given a navigation row yet.

## 5. Decided for him

- Sign in and sign up were **not** changed: `6627006ab` (7 October, 02:45) had already
  restored them, with the passcode and Get Started, to the pre-redesign versions he asked
  for. The handoff's A.4 instruction predates that commit.
- `BrandAssemble` stays in the Settings motion preview; it is off the opening.
- `/open` keeps its session check. The startup agent suspected its 3,000ms deadline as
  the cause of the 8 second hold; it only applies to a signed-in cookie, the check runs
  next to the auth server, and its normal cost is a few hundred milliseconds. The boot
  trace on his device will say which stage is slow before anything else is changed.

- Money is its own navigation group, and Payouts shows to every signed-in member,
  not only listers, because its page has an honest empty state and hiding a door is
  the failure being fixed.
- Invite friends and Rewards moved from the account block into Money.

## 6. Blocked on him

- **Pro:** `/pro` exists and is in the side navigation. It reads the member's real plan
  (only "Free" exists in the database) and shows "Price coming"; nothing is sold. Needed
  from him: the price and billing period, which plans launch, which plan is the top
  (gold) one, what each includes, and whether to run a trial or offer.
- **Push notifications in production** need these server variables confirmed in Vercel:
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `FCM_PROJECT_ID`,
  `FCM_SERVICE_ACCOUNT_JSON`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`,
  `APNS_BUNDLE_ID`; and the iOS `aps-environment` must be `production` for the App
  Store build (it is `development`).
- **Face ID** on the phone needs a native rebuild; on Android it also needs the real
  SHA-256 signing fingerprints in `assetlinks.json` (placeholders today).

- **Final apply order (D68d, supersedes the list below):** 1. `b3_rate_agreement_gate`
  then immediately `b3x_fee_record_unify`; 2. `b2_rail_at_open` (only after the app build
  that writes the rail is deployed); 3. `b6_member_money_rail`; 4. `d73a_stays_instant_pay`
  (its switch row alone is live, `20261007132951`); 5. `d73b_provider_arrangements`;
  6. `d75a_restaurant_deposits`, `d75b_stay_trip_details`; 7. `d68d_the_rail_decides_the_gate`;
  then `p2_social_follow_suggestions` and `d76_leaderboards_and_directory`. Probes in
  `supabase/tests/probes-pending/`. **His calls:** whether a brand-new hotel's first booking
  goes to review (the first-deal signal applies to stays; `check_first_deal` can be turned
  off or stays exempted); the direct-rail threshold (seeded at 3,000,000 naira). Rentals
  have no payment path once b2 is applied until escrow is live (Payluk key).
- **Apply order for every pending money migration (reviewed, none applied):**
  `d73a_stays_instant_pay`, `b6_member_money_rail`, `d73b_provider_arrangements`,
  `d75a_restaurant_deposits`, `d75b_stay_trip_details`, each with its probe in
  `supabase/tests/probes-pending/`. Live commission is 2 percent (from
  `money_policy_versions` 2026-10-06.1). The lister bears Payluk's escrow fee (wired).
  D75b changes one live function (`private.can_see_listing_access`, gate code only after
  payment) and one live policy (`reviews_insert_own`, a review needs a paid booking).
- **D73 switches and migrations.** Apply order: `pending/d73a_stays_instant_pay.sql`
  (stands alone; then turn on `stays_instant_pay` on `/admin/switches`), and, with a
  Payluk key, `pending/b6_member_money_rail.sql` then `pending/d73b_provider_arrangements.sql`.
  Probes are in `supabase/tests/probes-pending/`. **His decision needed:** who pays
  Payluk's 2% escrow fee (renter, lister, or shared). Not built yet: renter-facing escrow
  screens, a funded escrow marking the agreement paid, phases 13 to 15 for escrow.

- **The money rail's migration** (`supabase/migrations/pending/b6_member_money_rail.sql`)
  and its probe (`supabase/tests/probes-pending/b6-member-money-rail.sql`) are reviewed
  and ready, not applied. Nothing reads those tables until the rail is configured and
  switched on (`readMyBalance` returns not-live first), and it cannot be switched on
  without a Payluk key, so they are applied together with the key. Needed from him: a
  Payluk `sk_test_` key in the environment and in Vercel as `PAYLUK_API_KEY`.
- **The Payluk rate limit** is 10 requests a minute per key, shared across the whole
  platform, and one withdrawal uses about four. That will not hold past a handful of
  members; it needs a raised limit from Payluk.

- **"The pay is still taking me to agreement": the cause is found, and the fix is
  his decision.** It is not the pending `b3_rate_agreement_gate.sql`, which the
  handoff guessed: that file gates a lister publishing, not a renter paying, and it
  stays pending. The live cause is two functions. `private.transactions_payment_gate`
  refuses a charge unless the agreement is `approved`, and
  `public.agreement_confirm_as` moves an agreement both parties confirmed to
  `in_review`, where it waits for a person at Vallo to approve it on Money >
  Agreements (`admin_decide_agreement`). So after both people agree, the pay screen
  shows "Payment is not open yet" and sends them back to the agreement. His own
  lifecycle (`02-master-prompt.md` section 17) goes DRAFT to AGREED to
  AWAITING_PAYMENT, with no staff step. **The proposed fix:** a
  `feature_flags` row `agreement_staff_review` on `/admin/switches`. Off, the second
  confirmation of the same terms approves the agreement, writes the event log and
  audit row, and sends the same `agreement.approved` emails a staff approval sends.
  On, today's behaviour exactly. A missing row reads as on. Agreements already in
  review stay in the queue. The session's safety check blocked changing a live
  payment gate without his explicit yes, so it is **not applied**. One sentence from
  him ("apply the agreement review switch, default off" or "default on") unblocks it.

- Test account credentials and test payment keys in the environment settings
  (blocks the signed-in walk and staging verification of the Payluk adapter).

## 7. Before and after screenshots

Pending.

## 8. What I think is still wrong

- The feed's delete (`components/social/feed/Feed.tsx`) uses `window.confirm`,
  against the one-destructive-confirm rule (`DragToConfirm`).
- `/settings/invite/referrals` and its `[id]` page are placeholders while
  `/rewards/referrals` draws the real list. They should fold into Rewards;
  `invite-honesty.test.ts` currently locks the placeholder in.
- Signed-out walk (`docs/sessions/shots/breadth/before-*`): the landing's six
  feature chips are 43px tall (one short of the 44px target), Get Started has about
  300px of empty dark space between the art and the headline, and the sign-up legal
  links are 15px tall.

- The session prompt and handoff live on an unmerged branch; main does not carry
  them.
