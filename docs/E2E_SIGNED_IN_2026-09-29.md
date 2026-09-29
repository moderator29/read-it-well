# Signed-in end-to-end run, 29 September 2026

Target: local `next dev` on :3210 (Next 16.3.6, Turbopack) against the real Supabase project. Accounts: the founder's QA member and QA admin. Their credentials were loaded from a scratchpad env file and appear nowhere in the repo. Chromium is at `/opt/pw-browsers`.

Screenshots (171) and raw logs are in the session scratchpad (`e2e-signed/`), not in the repo. Some of them show the QA account's email address, so they must not be committed.

## Safety

- **Payments.** No card payment was attempted and no charge was submitted. The Paystack pay step was never reached, for the reason given below.
- **Bookings, messages, reports.** None were created. No message thread was opened (only the inbox was read). Nothing was reported.
- **Writes, all reversed.**
  - Saved listing `ed000000-…003e`: unsaved, then saved again. The `saved_items` row is present, as it was before.
  - Language: English → Yorùbá → English. The value lives in a cookie.
  - The workspace switcher was opened and closed without choosing anything.
- **AI consent was not given.** The assistant's consent sheet was checked and dismissed with "Not now". I did not tap "I understand, continue", because nothing in the app can withdraw consent (bug 2).
- **Passcodes.** Both QA accounts showed the passcode setup screen, so a passcode was set on each. The codes are recorded only in the scratchpad (`qa-passcode.txt`).
- **Notification setting changed by a spec.** `profile.spec` left the member's `notifications.bookings` at `false`. It was back at `true` (the default) by 14:19, before this run's own check, and a read-only query confirmed it.
- **Environment during the run.**
  - The first dev server grew to 12.9 GB RSS. Load average reached 50–80 and I/O pressure stayed above 80%, so I killed and restarted the server.
  - The container itself restarted mid-run. After that I cleared the Turbopack cache and started one server on :3210.
  - Specs and walks ran one browser at a time, gated on load average below 20.

## 1. Credential-gated specs (`apps/web/tests`)

- **When they ran:** the 44 specs that SKIP without `QA_MEMBER_*` ran one at a time. This was before PR #70 (the polish pass) was merged and before the container restart.
- **Result:** 22 pass, 1 skip, 21 fail. After my spec fix, `admin` passes on a rerun against the current tree.
- **What the failures were:**
  - Most are **stale specs**: the product changed on purpose and the spec did not.
  - Two are **environment** issues: the dev server does not prefetch, and a spec process lacked the public env.
  - Three are **real UI findings**: map-pin tap targets, the "Saved searches" link, and the email clipped on `/settings`.

| Spec | Result | ok / fail / skip | Why (for failures) |
|---|---|---|---|
| checkout | PASS | 104/0/0 | |
| wallet | SKIP | 2/0/1 | The member has no balance section to check |
| messages | PASS | 15/0/0 | |
| admin | FAIL → **PASS after fix** | 105/3 → 108/0 | Stale: since 0d598077 `/admin` is a plain 404 for non-staff. Spec updated (see Fixes) |
| admin-bookings | FAIL | 33/6/0 | Stale, same 404 change. The site 404 page carries an `input[name=q]` search box, which the spec reads as a desk search |
| inbox | PASS | 67/0/0 | |
| notifications | PASS | 34/0/0 | |
| notification-preferences | PASS | 46/0/0 | |
| profile | FAIL | 42/1/0 | Toggle did not survive a reload. The spec reloads 600 ms after an optimistic switch, before the server action lands on a slow dev server. Its "put it back" click then flipped the real setting (restored since) |
| profile-renders | PASS | 17/0/0 | |
| assistant | FAIL | 15/2/0 | Stale: the AI consent sheet now comes before the first message |
| rate-limit | FAIL | 19/1/0 | Same consent sheet. The limiter also fails open without its key (environment) |
| session-b-signin-live | PASS | 10/0/0 | |
| session-b-profile-live | FAIL | 15/3 | Stale: expects a `/wallet` row (now `/agreements`) and a `/reviews` link (no such route). Its REST cross-check needs `NEXT_PUBLIC_SUPABASE_*` in the spec's own environment |
| session-b-feed-live | FAIL | 9/2 | Stale selector: the composer dialog is named by `aria-labelledby`, not `aria-label="Post"`. It opens fine (probed) |
| session-memory | FAIL | 8/0 + crash | Sign-in `waitForURL` timed out while the machine was thrashing (load above 50). Environment |
| theme-choice | FAIL | 3/0 + crash | Stale: the drawer control is now a `ThemeRow` disclosure (`components/site/ThemeControl.tsx:100`), so its radios are hidden until the row is tapped |
| interests-settings | PASS | 52/0/0 | |
| intent-tune | PASS | 49/0/0 | |
| listing-exits | FAIL | 39/1 + crash | On a stay, the CDP swipe did not scroll the page. With a real scroll the 44 px floating back appears (probed: 44×44 at y=8, not inert) |
| capacity | PASS | 17/0/2 | |
| filters | FAIL | 28/14 | Data and stale: 52 results are paginated to 24 cards. The ₦100,000 cap matches nothing in the seed data ("No matches yet", Apply disabled). `category-hotel` test id is gone |
| filters-drawer | PASS | 101/0/0 | |
| discovery-behaviour | FAIL | 35/1 | Check 33 (prefetch on press) only means something on a production build |
| hybrid | FAIL | 23/2 | Stale: cards now carry an "Example" badge, and the rent safety sentence was reworded |
| map, map-keyboard, around-feed | PASS | 39, 35, 70 ok | |
| reviews | PASS | 24/0/2 | |
| trust-surfaces | PASS | 85/0/1 | |
| dock-autohide | FAIL | 17/4 | Data: for this member `/home` scrolls only 328 px, so the end-of-page rule keeps the dock visible. It passes on the harness page |
| styleguide | FAIL | 77/4 | Spec measures the element box. The 20×20 Back button uses `.nf-tap`, whose `::after` gives it 44×44 (`app/css/base.css:296`) |
| agent-identity | PASS | 132/0/0 | |
| agent-listings | FAIL | 21/1/1 | The first `a[href="/profile/setup"]` is a hidden duplicate. The visible "Apply to list" button is there (probed) |
| agent-messages, agent-reviews | PASS | 38, 40 ok | |
| social-district, social-people, social-profile | PASS | 51, 77, 37 ok | |
| social-profile-header | FAIL | 55/4 | Source checks on `ProfileHeader`, which the polish pass owned and was editing mid-run. Not touched |
| money-and-numbers | PASS | 33/0/0 | |
| icons-and-targets | FAIL | 34/2 | **Real**: map price pins are 65×37. `/saved` "Saved searches" link was 108×22 (fixed) |
| polish-overlays-copy-status | FAIL | 59/1 | **Real, polish-owned**: the member's email is clipped on `/settings` (`.nf-hub-profile__email`, 214/255 px) |
| truncation | PASS | 58/0/0 | |

## 2. Browser walk (real routes, signed in)

The member walked 30 routes at 390 and 1440 px, in dark and light. The theme was set with the app's own `nf_theme` choice, since dark is the product default. The admin walked 21 console routes at 390 dark.

| Run | Routes | HTTP 200 | Overflow at width | Median TTFB | Worst LCP |
|---|---|---|---|---|---|
| member 390 dark | 30 | 30 | 0 | first compile (not meaningful) | listing 6.1 s (compile) |
| member 390 light | 30 | 30 | 0 | 1.5 s | listing detail 5.4 s |
| member 1440 dark | 30 | 30 | 0 | 0.33 s | listing detail 5.1 s |
| member 1440 light | 30 | 30 | 0 | 0.33 s | `/around` 3.1 s |
| admin 390 dark | 21 | 21 | 0 | 2.2 s | `/admin/money` 6.9 s (TTFB 6.8 s) |

- **Member routes:** `/home`, `/search`, a listing, `/stays`, a stay, `/saved`, `/saved/searches`, `/messages`, `/notifications`, `/profile`, `/settings` and 8 sub-pages, `/agreements`, `/bookings`, `/payments`, `/support`, `/support/messages`, `/assistant`, `/around`, `/verification`, `/price`, `/restaurants`, `/checkout?stay=…`.
- **Admin routes:** `/admin`, `queue`, `money`, `compliance`, `bookings`, `people`, `support`, `staff`, `kyc`, `listings`, `payments`, `audit`, `operations`, `oversight`, `fees`, `switches`, `alerts`, `analytics`, `social`, `agents`, `standing`.
- **Console errors:**
  - Every page with realtime logged one error: the Supabase realtime WebSocket failed with `ERR_CERT_AUTHORITY_INVALID`. That is the sandbox's TLS proxy.
  - `/price` map tiles from `basemaps.cartocdn.com` were blocked by the egress proxy.
  - Neither is a product fault.
- **Other console output:** one React "unique key" warning in `SavedBoard`, once at 1440 dark (bug 7). No hydration warnings, no page errors, no 4xx/5xx responses from the app.

### Flows

| Flow | Result |
|---|---|
| Sign in (one screen) | PASS. Email and password are on one screen and land on `/home`. After an idle Supabase warm-up it takes about 3 s; on a cold compile, 13–20 s |
| Passcode setup / lock | PASS. Setup appeared once per account (6 digits, typed twice). The lock ("Welcome back, …") appears and unlocks on the keypad. See bug 1 for why it reappears on every full load after 5 minutes |
| Home, search, listing, stays, stay | PASS |
| Saved: save and unsave | PASS. The heart toggles and "Removed from saved" shows. It persists across navigation and restores cleanly |
| Messages inbox (read only) | PASS |
| Notifications | PASS |
| Profile header and rows | PASS. Rows: Plans, Saved (3), Agreements, Workspaces, Edit profile, Public page, Cover photo, Details, Place, and so on |
| Settings language row | PASS. `en` → `yo` sets `<html lang="yo">` and the h1 reads "Ètò". Back to `en` persists after reload |
| Agreements, bookings (plans) | PASS. The member has no bookings |
| Checkout to the pay button | **NOT REACHABLE** (not a crash). Every listing in the catalogue is an "Example" and cannot be reserved: the CTA is "Get told when real homes arrive". The member has no bookings, and `/checkout?stay=` shows "cannot hold this room". `checkout.spec` covers the `/checkout/[id]` states (104 checks pass). Reaching the Paystack button needs a bookable QA listing |
| + Create sheet | PASS. Rows: List, Post, Viewing, Switch workspace |
| Switch workspace | PASS. The switcher opens: Personal, no workspaces, "Add a workspace" |
| Support chat | PASS. "Ask a question" opens the AI support sheet with suggested questions and a composer. Nothing was sent |
| Assistant | PASS up to consent. The first question raises the "Before you ask" consent sheet. "Not now" dismisses it and keeps the draft. No question was sent (bug 2) |
| Admin console | **GATED**. All 21 desks answer 200 with "Confirm it is you… Confirm with my security key" (WebAuthn step-up). Desk contents (queue, money desk, compliance) could not be exercised headless. No desk data leaks behind the gate |
| Staff scopes | PASS. The member gets a plain 404 on every console address, with nothing leaked (`admin.spec` 108/108). The admin without step-up sees only the step-up screen |

## 3. Bugs, ranked

1. **High (config). The passcode unlock never persists without `SUPABASE_SERVICE_ROLE_KEY`.**
   - `passcodeKey()` returns null when the key is absent (`src/lib/passcode/unlock-cookie.ts:45-48`). `writeUnlock` then returns false (`src/lib/passcode/state.ts:106-112`), and `/api/passcode/touch` answers `{"state":"unlocked","slid":false}` (`src/app/api/passcode/touch/route.ts:24`).
   - Effect: once the 5-minute fresh-sign-in window ends, every full page load or new tab shows the lock, even for an active member.
   - `apps/web/.env.local` has no service-role key. Confirm that Vercel has it.
   - Nothing is logged when this happens. Suggest a one-time server warning, like `warnIfNonCommercialTiles`.
2. **Medium (privacy). AI consent cannot be withdrawn.**
   - `withdrawAiConsent()` exists (`src/lib/ai/consent-actions.ts:50`), but nothing in the UI calls it.
   - A member who taps "I understand, continue" has no way back. Suggest a row under Settings → Privacy or Help.
3. **Medium (a11y). Map price pins are 37 px tall, below the 44 px target** (`src/components/app/search/MapCanvas.tsx:716`).
   - Not fixed here: the pin is anchored with `-translate-y-full`, so growing it moves the pin. Use an expanded `::after` hit area instead, like `.nf-tap`.
4. **Low (polish-owned). The member's email is clipped on `/settings`** (`.nf-hub-profile__email`). Left for the polish agent (truncation CSS).
5. **Low (test data). No signed-in path to the pay button.** The catalogue is all Example listings. Seed one bookable listing owned by a QA host so checkout can be walked to the Paystack button.
6. **Low (testability). The admin console has no automation path.** The step-up needs a real security key. A staging-only virtual authenticator, or a QA admin with a registered test key, would let the desks be walked.
7. **Low (unconfirmed). React duplicate-key warning in `SavedBoard`, seen once** (`src/app/(app)/saved/SavedBoard.tsx:253`, `key={id}`). There are no duplicate saved rows in the database. It may have been an HMR refresh while other edits landed.
8. **Low (test hygiene). `profile.spec` can leave a real setting flipped** (`tests/profile.spec.mjs:154-168`).
   - It reloads 600 ms after an optimistic toggle, then clicks "put it back" without checking the state.
   - It should wait for `settings-saved`, and restore only if the value actually changed.
9. **Performance (dev server).**
   - `/admin/money` TTFB is 6.8 s.
   - Listing detail LCP is about 5 s at both widths.
   - The dev server's RSS reached 12.9 GB and thrashed a 16 GB box. A 9.5 GB Turbopack cache was cleared on restart.
   - Measure again on a production build before acting.
10. **Stale specs to update.** `admin-bookings`, `assistant`, `rate-limit`, `session-b-profile-live`, `session-b-feed-live`, `theme-choice`, `listing-exits` (stay swipe), `filters`, `hybrid`, `dock-autohide`, `styleguide` (does not count `.nf-tap`), `agent-listings`. The reason for each is in the table above.

## 4. Fixes made

- `apps/web/tests/admin.spec.mjs`: a non-staff member now expects the site 404 ("We could not find that page"), matching commit 0d598077. The access-screen headings are still accepted. Result: 108/108 pass.
- `apps/web/src/app/(app)/saved/page.tsx`: the "Saved searches" header link gets `inline-flex min-h-11 items-center`, the repo's own 44 px pattern. It was 22 px tall.

## 5. Not covered

- **Admin desk contents** (queue actions, money desk, compliance). They are behind the security-key step-up.
- **Paystack pay button.** There is nothing bookable in the catalogue.
- **Assistant answer.** Blocked by the consent sheet, which cannot be withdrawn afterwards.
- **Opening message threads.** Left alone on purpose (read receipts).
- **Some specs** were not rerun after the polish merge (PR #70) and the container restart. Only `admin` was rerun.
- **Remaining admin variants** (390 light, 1440 dark and light). Stopped once it was clear every desk shows the step-up gate.
- **Reservation and restaurant pages**, after the coordinator's request to stay off them. `/restaurants` had loaded earlier with 200.
