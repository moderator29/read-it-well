# Session B closing audit

Four runs, newest first: the fourth (23 September, `aa522bee`, dark only),
the third (`24453445`), the second (`625e47c6`) and the first (22 September,
`486cb23`), each kept as written.

# FOURTH RUN, 23 September, `main` at `aa522bee`

Auditor: Session B worker "auditor". No product code was changed. This run is
judged against the lead's rulings R-A to R-G and the founder's nine items
(scope file, `023e8403`). Light mode is out of the platform, so the audit is
dark only. Main was pulled three times during the run. The last pull
(`aa522bee`) brought in admin-review's re-shoot (`3f1405d5`), profile's badge
slot and re-shoot (`a4ba8a10`, `0b74eef9`), the send focus ring (`92d6eb2b`),
Session A's light removal (`9b9359eb`), Session A's badge renderer
(`dd840fee`), and Session A's requests to Session B (`2adeadbc`, renumbered R18 and R19 in `d6cd053b`). I rebuilt
at `a4ba8a10`; the build that followed `9b9359eb` was OOM-killed once, so it
was re-run. Every surface below is judged on what is on main.

## Result

| Surface | Owner | Fourth run | Still ours | Blocked only on Session A |
|---|---|---|---|---|
| Profile | profile | **PASS** | the badge swap (below) | request 1, 1d |
| Get started | welcome | **PASS** | none | W1, W3 (the landing link and the store's first launch) |
| Welcome back | signin | **PASS** | none | SIGNIN-1 |
| Inspections | inspection | **FAIL, narrow** | R18 (Session A's ledger `49quinquies`): `InspectionSheet.tsx`'s back arrow carries no `data-nav-back`, so no browser check can find it; one attribute. Plus the badge swap | I1 to I4 |
| Wallet | wallet | **PASS** | the badge swap on the send recipient | W2, W3, W4; B-BANK: the action exists (`6887f050`), the licensing question is the founder's, `BANK_SEND_OPEN` stays false |
| Send money | wallet | **PASS** | as Wallet | as Wallet |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL, narrow** | R19: the console's back arrow is proved only by a text test (`session-b-admin-back.test.ts` reads the source). No committed harness renders it (the harness paths declare no parent). A harness that mounts `AdminFrame` with `BackButton` under a declared desk path would close it. Plus the badge swap in the shared console components | A5, A6, A8, A11, A12, A13, A14 (`email_outbox`) |
| Admin review desks | admin-review | **PASS** | the badge swap. Proof note: in `sbs-kyc.jpg` and `sbs-listings.jpg` the rail's open row is not lit (the harness path matches no row); the shell's proofs light it | AR-5, AR-10, AR-11, AR-12 |
| Admin money desks | admin-money | **PASS** | the badge swap (`_desk/BadgeSlot.tsx` on money, escrow, evidence) | request 10 |
| Welcome email | email | **PASS** | none | E1, E2 |
| Deleted posts (item 4) | posts | **PASS** | none | DP-1 (notifications to a deleted post), DP-2 (post count drift) |
| Handbook | admin workers | **PASS** | none | none |

**Item 5, the badge: the wait on Session A has ended. The swap is now ours.**
Session A landed the one renderer at 11:44 (`dd840fee`,
`components/trust/TierBadge.tsx`, `lib/trust/badge-tier.ts`, R16 in their
ledger). Every Session B surface still draws a `BadgeSlot` that returns
`null` "until Session A's component lands":
- `app/(app)/profile/BadgeSlot.tsx`;
- `app/admin/money/_desk/BadgeSlot.tsx`, used by money, escrow, evidence, bookings and supply;
- `components/app/inspections/BadgeSlot.tsx`;
- `components/app/wallet/BadgeSlot.tsx` (`SendFlow.tsx:643`);
- `app/admin/_components/PersonTier.tsx`, admin-shell's shared console slot (`9042610c`), in the rail and the operator block.

In each file the swap is one line: `return tier === "none" || !tier ? null : <TierBadge tier={tier} size={16} />`.
I did not fail any gate on this, because it became possible 30 minutes
before this run closed. It is the next thing every owner does.

## B4. Sweep, token check, dark only

- `check-css-tokens.mjs`: **clean**, all ten checks. It walks all of
  `src/app`, which includes every route stylesheet.
- Shape sweep, `--theme dark`, 390 and 1536, one route per run: **63 routes,
  every one HTTP 200, 0 breaches, 0 at or above 0.35, 0 round icon-only.** The
  routes: every committed `/preview/session-b/**` harness and variant,
  including the new `wallet/send-bank` and `inspection/shell`; the signed-out
  routes (`/welcome`, `/sign-in`, `/sign-in/email`, `/sign-up`,
  `/sign-up/email`, `/sign-up/verify`, `/forgot-password`, `/reset-password`);
  and Session A's admin and wallet harnesses.
- In-browser measurement of the send screen (Chromium): the form panel, rows,
  chips and reassurance card all draw a 10px corner. The run-three 14px panel
  is closed.

## Item 2, light rules left in Session B files

I parsed every Session B stylesheet for rule blocks with the comments
stripped: `auth.css`, `admin.css`, `wallet.css`, `inspection.css`,
`review.css`, `desk.css`, `welcome.css` and `profile.css`. All eight have
**0 selectors mentioning light or paper.** No Session B TSX branches on a
light theme. The light proofs are deleted. The ledger's light halves are
struck through or replaced, 7(c) included.

One leftover is in a Session B folder:
`public/brand/session-b/roles/` still carries 452 `-day` paper renditions,
from the identity worker's handover pack. Nothing references them. Delete
them, or record that the pack is kept for Session A.

## Item 7, "viewing" in Session B copy

- Rendered strings in Session B files: **none.**
- The `inspectionsPage` namespace: none. The only hit is a code comment at
  `en.ts:4009`, not rendered.
- The email plain-text proofs: 0 in all six.
- The slides now say "book an inspection".
- `threads.accepted`, "The viewing is confirmed", is in Session A's `threads`
  namespace and is not used by the inspection surface.

## Item 4, deleted posts

- Every reader of `posts` in `src`: the listing reads in `posts-queries.ts`
  (feed, profile posts, replies, media, activity),
  `profile-tabs-queries.ts`, `comments-queries.ts`, `stories-queries.ts` and
  `home-queries.ts`. Each excludes REMOVED or reads LIVE only; the thread,
  comment and story reads prune.
- The admin reads list HELD only.
- `posts-media.ts` `readPostViews` has no caller.
- `bot-actions.ts` reads one post and refuses anything not LIVE.
- Tests: `deleted-posts`, `reads-deleted` and `tombstone-placement` pass,
  26 in all.
- Live: 74 LIVE, 1 REMOVED.

## Items 6 and 8, Get started

`/welcome` never redirects. The last slide offers Sign in and Create account
only; "Look around first" is gone (checked in `welcome-four-slides-dark-390.jpg`).
Slides two to four draw a 44px back square that carries `data-nav-back`. Back
steps through the slides by history.

## R14, back control on the 38 routes

- **Auth, 7 routes:** `AuthBackBar` mounts `BackButton`. Checked in the served
  HTML: `/sign-in`, `/sign-in/email`, `/sign-up`, `/sign-up/email`,
  `/sign-up/verify`, `/forgot-password` and `/reset-password` each draw one
  `aria-label="Back"`.
- **`/auth/callback`:** draws none, a recorded exception. It is a moment that
  navigates itself, and it sits outside the auth route group.
- **`/wallet`, `/wallet/send`:** `WalletBack` mounts `BackButton`. Both harness
  pages draw one.
- **`/welcome`:** slide one draws none, on purpose (the render draws none), and
  back leaves the way it came. Slides two to four draw it.
- **23 admin routes:** mounted once in `layout.tsx`, but seen by no browser
  (R19, above).
- **`/profile/setup`:** four states drawn in `f925f2b5`.

## Coverage (E4)

Unchanged since the third run except the rows below. Push volumes are on
Notifications (`getPushActivity`, from `push_queue` and `push_deliveries`).
The job counts are derived: 8 Vercel jobs and 14 pg_cron jobs, matching the
live `cron.job`. `email_outbox` still has no admin policy, filed as A14.

# THIRD RUN, 23 September, `main` at `24453445`

Auditor: Session B worker "auditor". No product code was changed. The
worktree `wt-auditor` was rebuilt at `24453445` and served with
`VALLO_PREVIEW_HARNESS=1`. I ran the shape sweep and the CSS token check
myself over every committed harness and every signed-out route. Everything is
judged against R-A to R-G. The live database was read with SELECT only.

**Wallet and Send money: their fixes had not landed on main.** Before judging,
I fetched `origin/main` again. The latest commit, `366d0ad6`, contains no
wallet commit after `62173c3e`. The wallet worker's tree holds the changes
uncommitted: `WalletSettingsSheet.tsx`, `wallet.css`, the four locales and the
ledger. So both surfaces are judged on main as it stands.

## Result

"Ours" means fixable by a Session B worker in Session B files. "Blocked on
Session A" means only a Session A request stands, and the surface says so
honestly.

| Surface | Owner | Third run | Still ours | Blocked only on Session A |
|---|---|---|---|---|
| Profile | profile | **PASS** | none | request 1 (switcher trigger prop), 1d (header slot) |
| Get started | welcome | **PASS** | R14 (below): `/welcome` declares parent `/home` and draws no back control | W1 (sign up routes to first run), W3 (native first launch), W4 (stale gate spec) |
| Welcome back | signin | **PASS** | R14: the eight auth routes draw no back control | SIGNIN-1 (unconfirmed address answer) |
| Inspections | inspection | **PASS** | none | I1 (report tables), I2 (publish the table), I3 (`?attach=1`), I4 (dead `nf-insp-*` rules) |
| Wallet | wallet | **FAIL (not landed)** | "How your money is protected" still on main, `WalletSettingsSheet.tsx:82`; R14: `/wallet` draws no back control | W2 (publish `wallet_entries`), W3 (transfer notice names), W4 (payouts) |
| Send money | wallet | **FAIL (not landed)** | `.nf-send-form` still on `--nf-radius-control` (14) against the measured 10 to 12, `wallet.css:752`; R14: `/wallet/send` draws no back control | as Wallet |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL** | (1) the landing gap, by address (below); (2) job counts drifted again (below); (3) push notifications now readable by an admin and not shown (below); (4) R14: 23 admin routes draw no back control | A5 (per-job pg_cron), A6 (the notifications table), A8 (listing views), A11 (refusal reasons outside price checks), A12, A13, a new one for `email_outbox` |
| Admin review desks | admin-review | **FAIL (narrow)** | the Moderation and Verification proofs, `sbs-moderation.jpg`, `sbs-kyc.jpg` and every `moderation-*` and `kyc-*` shot, are from 09:21, before the shell's full-height rail and re-sampled material (`949930e2`, 10:10), so they show the old short rail | AR-5 (paging decided listings), AR-10 (held events cannot be decided), AR-11 (blocked terms unreadable), AR-12 (mandates cannot be decided) |
| Admin money desks | admin-money | **FAIL (narrow)** | every proof and side-by-side is from 09:53 or earlier, before `949930e2`; `side-by-side-escrow.jpg` plainly shows the short rail | request 10 (reconciliation watch) |
| Welcome email | email | **PASS** | none (`welcome-message.ts` untouched this round; 111 tests pass) | E1 (greet by handle), E2 (lit button in `render.ts`) |
| Handbook `docs/ADMIN_CONSOLE.md` | admin-shell (jobs), all three (desks) | **FAIL (narrow)** | "seven Vercel Cron jobs" at lines 138 and 607 (there are eight), and twelve pg_cron jobs (there are fourteen) | none |

### The three admin-shell items, exactly

1. **Landing by address has a new gap.** `app/admin/enter/route.ts` answers
   `GET /admin/enter?next=/admin/<desk>` for any admin. It sets the entry cookie
   and sends a 303 straight to the desk. `enterTarget` allows a bare desk
   (`allowedDesk(next)`). So a typed, bookmarked or sent
   `/admin/enter?next=/admin/money` skips the overview, which is exactly what
   R-E forbids.
   - The fix: `enterTarget` never returns a bare desk, only `/admin` or
     `/admin?next=<desk>`. The overview's Continue can then be a plain link to
     the desk, because by then the cookie is already set: by the overview in
     the browser, or by `/admin/enter` without JavaScript.
   - Everything else in R-E holds. `EntryGate` has a plain link now, and
     JavaScript off works through `/admin/enter`. The tests pass (139 across
     `app/admin` and `lib/admin/reads`).
2. **The job counts moved under the handbook again.** Session A scheduled two
   more database jobs and one more Vercel job today:
   - Database jobs (`cron.job` read live): `vallo_push_drain` `*/5 * * * *` and
     `vallo_purge_email_outbox` `25 2 * * *`, 14 in all.
   - Vercel: `email-outbox` `*/15 * * * *`, 8 in `vercel.json`. `jobs.ts`
     already carries it (R13, Session A's one data line).
   - The handbook table, the In flight copy and A5 say twelve and seven. Fix the
     text, and derive the number wherever the copy states one, so it cannot
     drift a third time.
   - R13 asks admin-shell to say in the ledger whether the `email-outbox` line
     in `jobs.ts` may stay. The ledger does not answer it yet.
3. **Every notification.** `public.push_queue` (`state`, `outcome`) and
   `public.push_deliveries` (`state`, `provider_status`) now have admin read
   policies (`pg_policies`). The Notifications tab still reads "Not wired yet"
   and names only A6.
   - Push volumes can now be counted by state from those two tables, the way
     price checks were.
   - `public.email_outbox` (`status`) has RLS on and no admin policy, so it
     needs a request like A12.

### R14 (Session A's ledger `49ter`, 10:30 today), unanswered

Thirty-eight routes declare a parent in `lib/nav/route-parents.ts` and draw no
back control. They are all Session B's:
- the 23 admin routes;
- the 8 auth routes;
- `/welcome`, `/wallet`, `/wallet/send`.

None of those trees mounts `BackButton`. I checked with grep:
`app/admin`, `app/(auth)`, `app/welcome`, `components/auth`,
`components/app/welcome`, `app/(app)/wallet` and `components/app/wallet` have
no `BackButton` or `useBack`. On Android the hardware back on such a route
closes the app.

This does not reopen the design gate. It is a wiring defect that is ours to
fix, and each owner above carries it. Two notes for the lead:
- `route-parents.ts` gives `/sign-in` the parent `/start`, which is a 307 to
  `/welcome?next=/sign-up`. So back from sign in would lead towards sign up.
  The file is not Session B's; raise it with Session A.
- R14 also lists `/profile/setup`, which the scope file says is NOT Session
  B's. The two sessions disagree about who owns it.

R15 (open shelves under a gated `/home`) is a founder question. Session A says
the same.

## B3. Sweep and token check, from the committed harnesses

- `node apps/web/scripts/check-css-tokens.mjs`: **clean**, all ten checks. It
  walks all of `src/app`, which includes the route stylesheets:
  `admin/_review/review.css`, `admin/money/_desk/desk.css`,
  `(app)/profile/profile.css`, `welcome/welcome.css`, `app/css/*`.
- `compare-surface.mjs --shape-sweep --theme both`, one route per run, at 390
  and 1536: **60 routes, every one HTTP 200, every one 0 breaches, 0 at or
  above 0.35, 0 round icon-only.** The routes:
  - the signed-out routes;
  - `/preview/session-b/{welcome (3 viewers), profile (3), signin (4 states), inspection (3), inspection/shell, wallet, wallet/send, wallet/send-filled}`;
  - `admin/{overview, analytics, operations}`, with all five Operations tabs;
  - `admin-review/{listings, review, moderation, kyc}` with `?empty=1`;
  - `admin-money/{money, escrow, supply, bookings, payments}`, live and full;
  - Session A's `f5`, `bd`, `bc`, `p3`, `c1` and `e` admin and wallet harnesses.

## D3. Visual reading, this run

- **Get started.** The coin rim now has its lips and streak
  (`welcome-coin-render-vs-built-3x.jpg`). Skip and the button label are
  measured and set to 11.5 and 15px. There is nothing left beyond the recorded
  departures (the ice dot, the token-limited violet).
- **Welcome back.** I brightened `signin-390-dark.jpg` 2.5 times. There is no
  box behind the lockup and no edge or side strip on the stage. The corner
  numbers agree in all three places.
- **Inspections.** "Inspection" is lit cyan. The number is visible under the
  name and wraps between groups. The row plates are lit discs. Containers are
  on 10px. Add Photos and Submit are on the first screen in the committed
  in-shell twin.
- **Admin shell.** The rail runs the full height, with the foot pinned. The
  badges are filled, with the word (checked against the render's badges on a
  3x crop). Analytics reads `price_check_events` for demand, checks answered,
  top areas and refusals. What is still missing is only what the table above
  lists.
- **Admin review.** `sbs-review.jpg` (10:40) shows the player tile and a map
  frame. It carries a note that the tiles are a stand-in, because the sandbox
  proxy refuses the tile hosts. I saw the same refusal myself (`connect_rejected`),
  so this is honest. The shot script that serves the stand-in is not in the
  committed harness. The failure states have their own proof.
- **Admin money.** The ruling shows the evidence filed, oldest first. "Float,
  booked daily" and firm rosters are on their desks. The proofs predate the
  shell's rail.

## E3. Coverage, the rows that changed

| Item | Run two | Now |
|---|---|---|
| `listing_mandates` | MISSING | Listings desk, Mandates panel, read only, exact counts by decision; deciding is AR-12 |
| `escrow_evidence` | MISSING | on each ruling, oldest first |
| `escrow_float_snapshots` | MISSING | Escrow, "Float, booked daily", beside the ledger float |
| `firm_members` | MISSING | Supply, firm rosters, pending / active / revoked |
| `price_check_events` | MISSING | Analytics: price checks, checks answered, demand vs supply, top areas, refusals |
| pg_cron jobs | 12, 8 named | 14 live; the handbook names 12; the console summarises them (A5) |
| Vercel jobs | 7 | 8 live and in `jobs.ts`; the handbook text says seven |
| `push_queue`, `push_deliveries` (new, admin-readable) | n/a | **MISSING** (admin-shell) |
| `email_outbox` (new, no admin policy) | n/a | **MISSING**, needs a request |

# SECOND RUN, 23 September, `main` at `625e47c6` (Wallet and Send money at `62173c3e`; R12 re-checked at `57df9fe9`)

Auditor: Session B worker "auditor". I changed no product code. I rebuilt the
worktree `wt-auditor` at `625e47c6`, served it with
`VALLO_PREVIEW_HARNESS=1 npx next start -p 3181`, and swept it myself from the
committed harnesses. I read the lead's rulings R-A to R-G (ledger section 0,
`4e41679d`) and judged against them: where a ruling settles a choice, that
choice is not failed again. The live database was read with SELECT only:
64 published listings, all 64 examples, 7 accounts, 1 open risk alert.
Wallet and Send money were added when their round closed. I pulled `62173c3e`,
rebuilt, and swept and judged them the same way.

## Result

| Surface | Owner | Second run | Remaining reasons, exactly |
|---|---|---|---|
| Profile | profile | **PASS** | None blocking. Tidy-up: ledger 1.2 "Broken or weak links" still lists 1b and 1c as open, although both are withdrawn and done. |
| Get started | welcome | **FAIL** (narrow) | (1) The Skip text role has no measured size or weight on the image side ("small, quiet"), and the button label is "~16px". R-A requires every text role at its measured size. (2) The coin rim is a flat band of colour; the render's rim carries a highlight streak and white lips (the ledger's own row says "close"). |
| Welcome back | signin | **FAIL** | (1) A crop seam: in `signin-390-dark.jpg` a darker rectangle sits behind the lockup (about 158 x 155 CSS px round the tile and wordmark). CROP_RULE says "no visible box or seam". (2) The stage ends in a hard horizontal edge under the floor reflection, with a flat navy band below it, and dark vertical strips at both sides of the floor. The render's lake runs to the foot. (3) Stale text: the "Glow identity" paragraph still says the card corner is 22px and 24 CSS; table 3(b) says 18 and 16. |
| Inspections | inspection | **FAIL** | (1) Title colour: the render's second word, "Inspection", is electric blue. The built title reads white, and the round-three table has no colour row for it. (2) The phone number is replaced by a glyph. R-C says a string that cannot fit wraps before the container grows; it does not say the string disappears (it now lives only in the accessible name). (3) The row plates are 24 of 32 CSS px and dim. The render's plates are lit discs with bright cyan glyphs, which the side-by-side shows plainly. (4) The card corner is 14 on a 94px card (0.15) against the render's 0.11. The reason given, "the 14 rung is the smallest container radius that is not a control's", is not true: the console's containers use `--nf-radius-sm` (10). (5) R-G: the in-shell first-screen proof `inspection-390-dark-first-screen-in-shell.jpg` came from an uncommitted copy of the harness. |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL** | (1) The database now has 12 pg_cron jobs, not 8. The four new ones are `vallo_escrow_book_the_float` `5 3 * * *`, `vallo_escrow_invariants` `23 * * * *`, `vallo_sweep_price_check_events` `40 3 * * *` and `vallo_sweep_price_check_watches` `50 5 * * *`. None is in the handbook's job table (section 13), which still says "eight" at line 1038. The In flight panel's copy (`admin.shell...inflightEachOfTheEightDatabase`) and request A5's text also say eight. (2) Stale ledger: 6.2's Operations row gives the KPI corner as "deliberately the console's 14"; 6.4a says "14px corners"; the shell is now 10. (3) R-G: 6.6 says the proofs come from the uncommitted `(dev)/preview/sbadmin/**`, not the committed `session-b/admin`. Five proofs (`analytics-1440-light-empty`, `operations-390-light`, `operations-inflight-1440-light`, `operations-notifications-1440-dark`, `overview-heading-to-1440-dark`) predate the 10px change `66c2ecf5`. `overview-390-dark-fixture` also predates the landing change. (4) The rail is a box that ends under All desks, about a third of the page down (visible on Operations, Money, Escrow and Listings). On every render the rail is a full-height lit column. (5) The side-by-sides are darker and flatter than the renders: the renders' panels, rail edge and status badges are bright, and the badges are filled. The ledger measures glow on `5EAA44CB` only. |
| Admin landing by address (R-E) | admin-shell | **PASS, with two notes** | `EntryGate` catches every `/admin/<desk>` without the session cookie `nf_admin_entry` and replaces the address with `/admin?next=<desk>`. The overview offers the desk first. This covers a typed address, a bookmark and the sign-in bounce, and 4 unit tests cover it. Notes: (a) the redirect runs in the browser. With JavaScript off, the page shows "Opening the overview first." and no link, which is a dead end. (b) The server still renders the desk, and its data rides in the RSC payload. That is harmless for an admin, but the first request is not literally "sent to /admin". |
| Admin review desks | admin-review | **FAIL** | (1) Coverage: `public.listing_mandates` is a review queue on no desk. It has `review_status` pending/approved/rejected, a rejection reason of at least 8 characters, and `kind` letting/sale/management. No app code reads or writes it yet (0 rows; only `database.types.ts` names it), so it is on no desk, and the ledger does not say so. (2) The committed `sbs-review.jpg` shows the Location panel as an empty navy square with a pin (no tiles), and the walkthrough tile reads "This walkthrough could not be opened". The render draws a street map and a playable tile. Either re-shoot with tiles and video reachable, or record in 7(b) that the proof shows the failure state. (3) The rail box, as for the shell. (4) Recorded, not failing: desk copy is English literals. |
| Admin money desks | admin-money | **FAIL** | (1) Closed while this run was being written: main was red on `agent-badge-derivation.test.ts` because `lib/admin/reads/supply.ts` read `agents.verified`. `33c537e0` (R12 closed) moved the read to the published badge, and both tests pass here on `57df9fe9` (15 passed). (2) Coverage: `escrow_evidence` (the dispute's files and facts, commit `b1bafcc7`) is not on the ruling panel. An operator rules on a dispute without seeing the evidence the platform now holds. (3) Coverage: `escrow_float_snapshots` (the float identity the new `vallo_escrow_book_the_float` job books) and `firm_members` (pending/active/revoked staff of a firm, a supply role) are on no desk. (4) Visual: the rail box and flatness, as for the shell. Table and ledger density are stated departures. |
| Wallet | wallet | **FAIL** (narrow) | (1) A claim is left in the wallet: the settings sheet (the Quick Actions "Settings" card) is headed "How your money is protected" (`components/app/wallet/WalletSettingsSheet.tsx:82`). Its two rows are true: the writes are server-only, and the ledger is kobo-exact and permanent (no delete function, no delete policy, `ON DELETE RESTRICT`, read in `pg_proc` and `pg_constraint`). But "protected" is the security claim the render's "Your money is safe" made. Retitle it to what the rows say, for example "How your wallet is kept". Everything else closes. The `TrustStrip` claims are gone from the component and from all four locales (`d84a4832`; `/preview/e/wallet` now renders "How your wallet works"). The proofs show the settled balance (₦245,680.00). The frozen mid-roll frame (`wallet-roll-frozen-midway.png`, zoomed 3x here) clips each digit to its own band, with no overlap with the naira sign. The figure is 33px from a measured digit cap of 24.0 CSS px, which matches. The card keeps the tight halo only, which also matches: the render's page reads (0 7 37) right up to the rim. `wallet-side-by-side.jpg` exists. Chain: W2 (publish `wallet_entries`) is named, and it is a migration. |
| Send money | wallet | **FAIL** (narrow) | (1) The form panel's corner is 14px against the render's measured 10 to 12. The ledger's row says "Near" and gives the reason "the money family's one card corner". No rule forces that: `--nf-radius-sm` (10) is a container rung the console already uses. Everything else closes. The W1 chain is marked FIXED against `7763ff39` (`transferToUser` inside `withIdempotency`, `transfer-idempotency.test.ts`), plus a same-frame client latch (`submit-guard.ts`, `8c93b285`). `send-side-by-side.jpg` and `send-1280-dark.jpg` now exist. Every text role has a measured row. `walletSend.tagline` now carries "Wallet to wallet, by email". The "Sends to" row and "After this send" are real function, drawn in the rows' register (R-F). |
| Welcome email | email | **PASS** | Both first-run statements were rewritten with evidence (ledger 10, "Evidence for every statement"). The new line "Once a person at Vallo has checked your identity, your listings carry the verified tick" holds: `agent_badges.verified := verification_tier >= 1`. |
| Handbook `docs/ADMIN_CONSOLE.md` | admin-shell, admin-review, admin-money | **FAIL** | Section 15 is now full: every desk has shows, sources, actions, effects and limits. Still missing: (1) the 12 pg_cron jobs (above); (2) "Rejected" on 15.9 Around and 15.14 Reference data, and "Limits" on 15.12 Audit log; (3) nothing on `listing_mandates`, `firm_members`, `escrow_evidence`, `escrow_float_snapshots` or `price_check_events`, not even in 15.16 "What no desk shows yet". |

**The shape sweep is at zero.** R-D counts 0.35 and above as a failure, and
nothing reaches it.

**Claims are clean except one wallet heading** (above). `TrustStrip`'s "256-bit TLS", "Encrypted in transit" and
"Your money is safe" are gone from the dictionary (`d84a4832`). There is no
NDIC, airtime, bills, swap, "reimagined" or demo copy. There are no em dashes
in the files, the locales or this session's commits.

## B2. Shape sweep, from the committed harnesses

`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3181 --shape-sweep --routes <route> --theme both`,
one route per run, 390 and 1536, dark and light. Every route answered 200. I
checked the `h1` on four of the harnesses to be sure a real page was measured.

| Route | Breaches | Over 0.35 | Round icon-only |
|---|---|---|---|
| `/welcome`, `/sign-in?welcomed=1`, `/sign-in/email`, `/sign-up?welcomed=1`, `/sign-up/email`, `/forgot-password` | 0 | 0 | 0 |
| `/preview/session-b/welcome` (member, `?viewer=guest`, `?viewer=done`) | 0 | 0 | 0 |
| `/preview/session-b/profile` (member, `?v=nohandle`, `?v=signedout`) | 0 | 0 | 0 |
| `/preview/session-b/signin` (chooser, `?state=google`, `none`, `refused`) | 0 | 0 | 0 |
| `/preview/session-b/inspection` (requester, `?side=lister`, `?side=lister&state=REQUESTED`) | 0 | 0 | 0 |
| `/preview/session-b/admin/{overview,analytics}`, `operations` and its five tabs (`jobs`, `alerts`, `audit`, `notifications`, `inflight`) | 0 | 0 | 0 |
| `/preview/session-b/admin-review/{listings,review,moderation,kyc}`, with `?empty=1` where there is one | 0 | 0 | 0 |
| `/preview/session-b/admin-money/{money,escrow,supply,bookings,payments}`, live and `?state=full` | 0 | 0 | 0 |
| `/preview/session-b/wallet`, `/wallet/send`, `/wallet/send-filled`, and Session A's `/preview/e/{wallet,send,receive,transactions,receipt,wallet-topup}` (on `62173c3e`) | 0 | 0 | 0 |
| Session A's admin harnesses `f5/admin-{frame,queue,overview,desks}`, `bd/{alerts,reservations,payments,refunds}`, `bc/audit`, `p3/admin-businesses`, `c1/listing-review` | 0 | 0 | 0 |

That is 64 route variants, all at 0 / 0 / 0. The 128 at 0.35 from the first
run are gone: the chip and the queue search are on `--nf-radius-sm` in
`2fc66f60`. The signed-in routes still redirect to sign in, so those surfaces
still have fixture-only proof. The harnesses are now committed, so anybody can
reproduce every figure here.

## C2. Admin landing, re-read

Code path: `proxy.ts` (unchanged; a signed-out request goes to
`/sign-in?next=/admin/<desk>`) -> sign in returns to the desk ->
`app/admin/layout.tsx` compares the `nf_admin_entry` cookie with
`access.user.id` -> `_components/EntryGate.tsx` calls `entryRedirect(path,
search, entered)`. With no entry it renders the status line and calls
`router.replace('/admin?next=<desk>')`. On `/admin` it writes the session
cookie, and `page.tsx` passes `safeDesk(next)` to `OverviewView` as
"You were heading to". Nothing bypasses it except a browser without
JavaScript, which sees the status line with no link. Verdict: the rule is met
for every real entry. Two notes: add a plain link in the status line so no
browser is stranded, and optionally do the redirect on the server.

## D2. Per surface, the three largest remaining differences (my own reading)

**Profile** (`profile-side-by-side-390-dark.jpg`, after round four). (1) The
glyphs inside the plates read a little smaller than the render's, which fill
their squares. (2) The row foot's light band is slightly quieter than the
render's, though the samples are within 10 per channel. (3) The top band
belongs to the header by design, and the render's back square is dropped
(recorded). None of these is a resemblance; the page is the image.

**Get started** (`welcome-render-vs-built-390.jpg`,
`welcome-coin-render-vs-built-3x.jpg`). (1) The coin rim is a flat blue band
with no highlight. (2) The active dot is ice, not the render's cyan (refused
under the colour law, recorded). (3) The button core is less violet (the token
limit, recorded). Only (1) is fixable inside the rules.

**Welcome back** (`signin-vs-55A56F21-390.jpg`, and the 390 proof brightened
to show the seams). (1) The box behind the lockup. (2) The stage's lower edge
and its side strips; the floor does not run to the foot. (3) The card is 309
tall against 240 at the render's scale (R-B, 44px controls, accepted), so the
plinth sits higher up the screen than drawn.

**Inspections** (`inspection-render-vs-built-390-dark.jpg`). (1) The title's
blue second word is missing. (2) The row plates are small and dim. (3) The
phone number is gone from the info row. The overall height now matches
(1.02), and the outcome row is compact (R-F).

**Admin shell** (`side-by-side-overview.jpg`, `side-by-side-operations.jpg`,
`operations-inflight-1440-dark.jpg`). (1) The short rail box. (2) Less light:
the renders' panels, rail edge and open row glow brighter, and the built
3px halo is fainter than they look. (3) Status badges are small outlined
chips where the renders draw filled, tinted badges.

**Admin review** (`sbs-listings.jpg`, `sbs-review.jpg`). (1) The empty map and
the failed walkthrough in the review proof. (2) The short rail. (3) The
listing table is denser and smaller than the zoomed render, a scale choice
the ledger records.

**Admin money** (`side-by-side-money.jpg`, `side-by-side-escrow.jpg`). (1) The
short rail. (2) The panels are flatter than the render's lit cards. (3) The
`full` fixture's Wallets panel says "Nobody has a wallet yet" beside a ledger
full of entries, so the proof contradicts itself (fixture only).

**Wallet** (`wallet-side-by-side.jpg`). (1) The resting tiles wear a bright
lit outline all round, where the render's are darker glass with a soft inner
rim. (2) Text at the 11px floor makes the transaction rows and badges read
larger than the render's 7.5 to 10px (R-A, accepted). (3) The shell's header
row replaces the render's (chrome, accepted). Only (1) is a styling choice,
and the ledger's "Resting tile" row calls it a match. Minor.

**Send money** (`send-side-by-side.jpg`). (1) The panel corner (above).
(2) The reassurance card is three lines at 11px, where the render has one
slim strip (true words at the floor, accepted). (3) The added "Sends to" and
"After this send" lines make the form taller (R-F, accepted).

## E2. Coverage, re-checked against the live schema

| Item | First run | Now |
|---|---|---|
| Inspections, 6 states and outcome | MISSING | Operations > In flight, exact counts by state (`inspection_requests_select_admin`) |
| Held events | MISSING | Moderation: listed; cannot be decided (AR-10, Session A's `decideHeldItem`) |
| Blocked terms | MISSING | Moderation: a panel says the list cannot be read (AR-11: RLS on, no policy) |
| Account deletions, business transfers | MISSING | In flight panels name A12 and A13; still no admin policy (`pg_policies`: none) |
| Notification kinds (8) | MISSING | Still A6; listed on the tab, not counted |
| pg_cron per job | Partial (8) | Partial, and now **12 jobs, of which the console and handbook name 8** |
| Reconciliation watch | MISSING | Still request 10; a panel on In flight says so |
| Escrow `agency_fee`, `CANCELLED` | handbook gap | Counted on the escrow desk and in the handbook |
| Tenancy charges (`rent_payments`) | not mapped | Money > Tenancy charges (`rent_payments_admin_select`) |
| `listing_mandates` (review queue) | not found in the first run | **MISSING** (admin-review) |
| `firm_members` (pending/active/revoked) | not found in the first run | **MISSING** (admin-money, supply) |
| `escrow_evidence` | new since the first run | **MISSING** on the ruling (admin-money) |
| `escrow_float_snapshots` | new since the first run | **MISSING** (admin-money) |
| `price_check_events` (stage, outcome; admin read policy exists) | new since the first run | **MISSING** from Analytics. It is the first real demand log, the thing A7 asked for (admin-shell) |

The remaining rows of the first run's map (queues, money paths, supply roles,
verification rungs, listing states, bookings, alerts) still hold.

# FIRST RUN, 22 September, `main` at `486cb23` (kept as written)

Auditor: Session B worker "auditor". Read only: no product file was changed.
Audited on 22 September 2026 against `main` at `486cb23` (worktree
`wt-auditor`, a production build of that commit served on port 3181 with
`VALLO_PREVIEW_HARNESS=1`). A first draft of this file was written against
`2470bdf`; twenty commits landed while it was being written (profile round
two, welcome polish, sign in round two, inspection density, admin-shell's
ledger section and proofs, the W1 fix), so every section below was redone on
`486cb23`, with a fresh build and a fresh sweep. Live database read with
SELECT only (project `uccixoonmbhrnyczyigt`): 64 published listings, 64 of
them `is_demo`, 0 real supply, 7 accounts, 0 open risk alerts, the same as R4.

The founder's closing standard, applied strictly: (1) every surface closes
with a measured side-by-side comparison in the ledger (property | image
measured | built measured | match) and a render-vs-built image; (2) every
screen walks its whole chain with broken links named; (3) nothing ships a
claim; plus light mode correct and the shape ratio sweep at zero. A
resemblance is a FAIL. A missing measured row is a FAIL. A claim is a FAIL.

## Result at a glance

| Surface | Owner | Gate | The deciding reasons |
|---|---|---|---|
| Profile `/profile` | profile | **FAIL** (one decision from a pass) | every text role at 1.16 times the render by choice, not by a law; `21425a5e` closed the row, plate and glow gaps |
| Get started `/welcome`, `/start` | welcome | **FAIL** | lockup glow not measured and visibly weaker; coin face "close, not identical" by its own ledger |
| Welcome back `/sign-in`, `/sign-in/email` (+ `/sign-up`, `/forgot-password`) | signin | **FAIL** | one open departure that no law requires: card 78 per cent of the width against the render's 62 |
| Wallet `/wallet` | wallet | **FAIL** | a claim kept in a Session B component and the wallet dictionary, rendered on the committed harness (`TrustStrip`: "256-bit TLS", "Encrypted in transit", "Your money is safe"); no side-by-side; proof shot mid-animation; "Add money" overflows its tile |
| Send money `/wallet/send` | wallet | **FAIL** | missing measured rows; no desktop proof; no side-by-side; chain still says W1 is broken although `7763ff39` fixed it |
| Inspections `/inspections`, `/agent/inspections` | inspection | **FAIL** | still 1.38 times the render's height; the phone number wraps in the info row |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL** | sweep not at zero (128 controls at 0.35); the landing rule is not enforced for addresses; operations and analytics tables unmeasured |
| Admin review desks (listings, moderation, kyc, queue, support) | admin-review | **FAIL** | ledger section 7 is "(pending)"; no proofs |
| Admin money desks (money, escrow, supply, bookings, payments) | admin-money | **FAIL** | no side-by-side; image values not converted; bookings and payments not compared |
| Welcome email | email | **FAIL** | two unevidenced statements in the copy |
| Handbook `docs/ADMIN_CONSOLE.md` | admin-shell, admin-review, admin-money | **FAIL** | thirteen acting desks have one line each |

Nothing passes today. Sign in and profile are closest: each ledger is
complete and one stated departure stands between it and a pass. Welcome is
close. The
wallet claim, the admin landing rule, section 7 and the handbook's thin desks
are real faults, not paperwork.

## A. Claims sweep

Grep over every Session B-owned file (scope file sections Profile to 8, about 260
files, tests excluded for the claim words) and the i18n namespaces they read
(`auth`, `signUp`, `welcomeCards`, `socialProfile`, `wallet`, `walletSend`, `walletReceive`,
`admin`, `inspectionsPage`) for NDIC, insur, encrypt, 256, airtime, bills,
swap, reimagined, guarantee, certified, demo, sample, preview, coming soon,
welcome aboard, plus safe, secure, protect and instant.

| File:line | Text | Verdict |
|---|---|---|
| `packages/i18n/src/locales/en.ts:2909` (`wallet.home.trustTitle`) | "Your money is safe" | **FAIL, claim.** Read by `components/app/wallet/TrustStrip.tsx` (Session B's file), rendered on `/preview/e/wallet` under the harness. Same key in ha, ig, yo. |
| `en.ts:2910` (`wallet.home.trustBody`) | "Encrypted in transit and recorded to the kobo. Nothing moves without you." | **FAIL, claim** (encryption claim R1 refuses). ha.ts:2136, ig.ts:2141, yo.ts:2136 carry the same. |
| `en.ts:2911` (`wallet.home.trustBadge`) | "256-bit TLS" | **FAIL, claim** (the 256 bit badge R1 refuses, reworded). ha.ts:2137, ig.ts:2142, yo.ts:2137. |
| `apps/web/src/components/app/wallet/TrustStrip.tsx:7-11` | comment: "The second [256 bit] is a fact about every request this product makes" | **FAIL.** The component keeps the encryption badge the ledger (5, refused) says was refused. Delete the component and the three keys; `(dev)/preview/e/wallet/page.tsx:4,28` (Session A's) imports it, so the deletion needs a line in section 49 or a scope request. |
| `en.ts:3869` (`walletSend.tagline`) | "Fast. Safe. Always." | FAIL (dead). No reader in `src` (the send page no longer draws it; the receive page reads `walletReceive.tagline`), but it is the render's "Quick. Safe. Reliable." claim kept in the dictionary. Remove. |
| `apps/web/src/components/app/wallet/WalletSettingsSheet.tsx:28-37` | hard-coded English "Moved only by our servers", "Every movement lives in a permanent, kobo-exact ledger." | NOTE. Not i18n (four locales get English); "permanent" is an unevidenced claim (ledger rows are append-only by policy, but "permanent" is not established in the ledger section). Evidence or reword. |
| `WalletSettingsSheet.tsx:117-118` | "...is not insured by the Nigeria Deposit Insurance Corporation." | NOTE. A true negative disclaimer that mirrors `lib/legal/terms.tsx` section 15, not a claim; but the founder's line is "no NDIC", so it needs the founder's yes. |
| `en.ts:2913`, `en.ts:2919` (`wallet.topUpHint`, `wallet.opening`) | "secure Paystack window", "Opening the secure payment window" | NOTE. A statement about Paystack's hosted page, not Vallo; acceptable, flagged for the founder. |
| `en.ts:3830` (`walletSend.instantChip`) | "Instant transfer" | PASS. Evidence in the ledger (both legs in one statement). |
| `components/app/wallet/SendFlow.tsx:603-606`, `WalletDeck.tsx:52,251-252`, `WalletTiles.tsx:10` | NDIC, 256, Airtime, Bills, Swap in comments explaining the refusal | PASS (comments, not rendered). |
| `lib/email/welcome-message.ts:252` | "Agents are checked more closely than owners" | **FAIL, unevidenced claim.** Neither the ledger (section 10) nor `lib/supply`/`lib/trust` shows a stricter check for agents than for owners. |
| `lib/email/welcome-message.ts:163` | "Each step you complete shows on your listings." | **FAIL, unevidenced claim.** Only `agent_badges.verified` (tier >= 1) is shown to a renter on the evidence in section 2; that every rung shows on listings is not established. |
| `lib/email/welcome-message.ts:30` | "nothing insured or guaranteed" in a comment | PASS. |
| `app/admin/**` "preview" hits (AdminActions, alerts, audit, reservations, listings, money, payments) | code identifiers and comments about the preview harness and `previewCancellation` | PASS (not UI copy). |
| `app/admin/examples/page.tsx:31`, `lib/admin/reads/listings.ts:67-98` | "demo" in a comment and a variable | PASS. UI says "Example". |
| `app/admin/standing/page.tsx:47`, `lib/inspections/actions.ts:80` | "guarantee" in comments | PASS. |
| `profile.css`, `auth.css`, `wallet.css`, `welcome.css`, `inspection.css` "sampled" | comments recording measurements | PASS. |
| `admin/_review/map-tiles.ts:51-52`, `WelcomeScene.tsx:52-116` "256" | tile maths, image dimensions | PASS. |

No hit for reimagined, certified, airtime or bills in rendered copy, no
"coming soon", no "welcome aboard".

**Hard-coded figures in JSX.** Pattern search over every Session B `.tsx`
for digits in JSX text and for currency or percent literals: the only hits
are skeleton widths, SVG gradient stops, and `yLabels={["₦0", ...]}` on the
empty-chart axis in `admin/_components/OverviewView.tsx:271`,
`admin/money/MoneyDesk.tsx:328` and `admin/payments/PaymentsFlow.tsx:81`
(a zero baseline, true). No render figure (1,248, 18,450, 137, 548, 42,
245,680, 12.5, 64) appears in code. PASS.

**Em dashes.** Session B files: one hit,
`lib/email/welcome-message.test.ts:208`, the assertion that the email carries
none. PASS. Locale files: zero em dashes in all five. Session B docs (scope,
ledger, handbook): zero. Commit messages since `2a5ff60` carrying this
session's trailer, `2a5ff60..486cb23`: 63 commits, zero em dashes. PASS.

## B. Shape and light sweep

Production build of `main` at `486cb23`, served with
`VALLO_PREVIEW_HARNESS=1 npx next start -p 3181`. Every run:
`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3181 --shape-sweep --routes <route> --theme both`,
at 390 and 1536, dark and light. Columns: BREACHES (ratio >= 0.5) /
WORTH AN EYE (> 0.35) / ROUND ICON-ONLY.

**Signed-out routes (real pages, no fixture).**

| Route | Breaches | Worth an eye | Round icon-only |
|---|---|---|---|
| `/welcome` | 0 | 0 | 0 |
| `/start` | 307 to `/welcome?next=%2Fsign-up` (curl; nothing to sweep) | | |
| `/sign-in?welcomed=1` | 0 | 0 | 0 |
| `/sign-in/email` | 0 | 0 | 0 |
| `/sign-up` | 0 | 0 | 0 |
| `/sign-up?welcomed=1` | 0 | 0 | 0 |
| `/sign-up/email` | 0 | 0 | 0 |
| `/forgot-password` | 0 | 0 | 0 |

(On `2470bdf` `/sign-up` never reached network idle: the "What Vallo is"
link prefetched the `/start` redirect on every render. `486cb23` points it at
`/welcome` with prefetch off, and the sweep now completes.)

**Signed-in routes redirect** (curl, 307 to
`/sign-in?next=<path>&notice=sign-in-required`): `/profile`, `/wallet`,
`/wallet/send`, `/inspections`, `/agent/inspections`, `/admin` and every
`/admin/**` desk. The sweep refuses a redirected page, so **these surfaces
have fixture-only proof: Profile, Wallet, Send money, Inspections (both
routes) and the whole admin console.** No signed-in page has been measured
by anybody in Session B.

**Committed `(dev)/preview` routes that render Session B components**
(fixture props).

| Route | Renders | Breaches | Worth an eye | Round icon-only |
|---|---|---|---|---|
| `/preview/f1/welcome` | first run, member path | 0 | 0 | 0 |
| `/preview/f4/profile` | profile components | 0 | 0 | 0 |
| `/preview/e/wallet` | `WalletDeck`, `RecentActivity`, `TrustStrip` | 0 | 0 | 0 |
| `/preview/e/send` | `SendFlow` | 0 | 0 | 0 |
| `/preview/e/receive` | receive | 0 | 0 | 0 |
| `/preview/e/transactions` | statement | 0 | 0 | 0 |
| `/preview/e/receipt` | receipt | 0 | 0 | 0 |
| `/preview/e/wallet-topup` | funding sheet | 0 | 0 | 0 |
| `/preview/f5/inspection` | `InspectionSheet` | 0 | 0 | 0 |
| `/preview/f5/agent-inspections` | lister side | 0 | 2 | 0 |
| `/preview/f5/admin-overview` | `ConsoleOverview`, `AdminNav`, `QueueTable` | 0 | 2 | 0 |
| `/preview/f5/admin-frame` | `QueueFilters`, `ui` | 0 | 20 | 0 |
| `/preview/f5/admin-desks` | examples, held, reference, social, standing, stops, switches | 0 | 0 | 0 |
| `/preview/f5/admin-queue` | queue | 0 | 22 | 0 |
| `/preview/c1/listing-review` | listing card | 0 | 0 | 0 |
| `/preview/bd/alerts` | `AlertCards` | 0 | 14 | 0 |
| `/preview/bd/payments` | `LookupPanel` | 0 | 2 | 0 |
| `/preview/bd/refunds` | `MoneyRows` | 0 | 2 | 0 |
| `/preview/bd/reservations` | `ReservationCard` | 0 | 26 | 0 |
| `/preview/bc/audit` | `AuditList` | 0 | 2 | 0 |
| `/preview/p3/admin-businesses` | businesses desk | 0 | 38 | 0 |

Consumer surfaces: **0 / 0 / 0 everywhere.** Admin harnesses: **0 breaches,
128 worth an eye.** Every one of the 128 is one of two shared admin
controls, admin-shell's (`app/admin/_components/QueueFilters.tsx`,
`app/css/admin.css`): the status chip `.nf-admin-chip` (40 px tall, radius 14,
ratio 0.35) and the "Search this queue" input (352 x 40, radius 14, ratio
0.35). Ledger 6.4 records the search input's 0.35 as "accepted"; the chips it
does not mention. The 2 on `/preview/f5/agent-inspections` are the agent
console's "Search my listings" input (448 x 40, radius 14), agent chrome
rather than the inspection sheet. **The founder's "shape ratio sweep at zero"
is not met on the console.** A 44 px control, or `--nf-radius-sm` on these
two, clears it.

No committed harness renders the money, escrow, supply, analytics,
operations, kyc, moderation, listings-queue, support or bookings desks. The
workers' proofs came from uncommitted harnesses (`/preview/zz-am/*`,
`/preview/sbadmin/*`, `/zz-pfs`, `/ix-harness`, `/preview/sbw/*`), which
nobody else can re-run, so those numbers rest on the workers' word.

**Light.** Every sweep above ran in light as well as dark. Beyond shape, I
read the light proofs: profile (now the same objects in their paper
rendition), wallet, send and inspection hold their anatomy on paper with no
dark plate on white; welcome and sign in are dark in both themes by rule 22,
and sign in proves it with a computed-style diff (0 differences). Admin:
light proofs exist for overview, operations, analytics (admin-shell) and the
three money desks at 1440 (money also at 390). Admin review has none.

## C. Admin landing

Code path, read on `main`:

1. `apps/web/src/proxy.ts:84`: `admin` is in `PRODUCT_SEGMENTS`. A signed-out
   request to ANY `/admin/**` path is redirected (`proxy.ts:198-211`) to
   `/sign-in?next=<that exact path>&notice=sign-in-required`.
2. `lib/auth/actions.ts` `landingAfterAuth` honours `next` after sign-in.
   So a signed-out operator who opens `/admin/money` signs in and lands on
   `/admin/money`, not the overview.
3. `app/admin/layout.tsx:36-38`: `requireAdmin()`; a non-admin gets
   `AccessScreen` (links to `/`, `/sign-in`, `/home`). An admin gets the frame
   around whichever child was requested. There is no redirect, cookie or
   "first visit this session" check in the layout, `page.tsx` or anywhere
   under `app/admin/` (`grep redirect( app/admin` returns nothing).
4. Every in-product entry point lands on `/admin`: the drawer's Console row
   (`components/app/nav-model.ts:276`), the workspace switcher
   (`lib/supply/workspaces.ts:147`, `workspaces-queries.ts:103`), the
   "You are now a Vallo administrator" notification
   (`private.grant_staff_role`, href `/admin`, read from `pg_proc`), and
   `BackButton`'s declared parent. No email, cron alert or database
   notification links a desk directly (grep of `lib/email`, `lib/notify`,
   `lib/cron`, `app/api` and `pg_proc` source).

**Verdict: FAIL (admin-shell).** The founder's rule is "entering the console
lands on the overview, every time, before any desk". Entry through the
product's own doors does. Entry by address does not: (a) the sign-in bounce
carries `next=/admin/<desk>` and returns there; (b) a signed-in admin who
types, bookmarks or is sent a desk URL (`/admin/money`,
`/admin/listings/<id>`, `/admin/escrow?status=DISPUTED`) gets the desk with no
overview first. `docs/ADMIN_CONSOLE.md` section 1 ("Nothing redirects you to
a desk first") and the layout comment state the landing rule as met; they
are accurate about the doors and silent about the addresses. Either the
founder accepts deep links as not "entering", recorded in the handbook, or
the layout needs an entry check (for example a session cookie set by the
overview, and a redirect to `/admin?next=<desk>` when it is absent), which
also needs the proxy's `next` for `/admin/**` to point at `/admin`. Ledger 6.1 (added
after the first draft of this audit) says the same as the handbook ("no
redirect exists"), which is accurate and does not close the gap. Checked
live on the production build: `curl /admin/money` signed out answers 307 to
`/sign-in?next=%2Fadmin%2Fmoney&notice=sign-in-required`.

## D. Ledger gate, per surface

Columns: chain with every link named; comparison table with measured image
and built values for container radii, rim, glass fill, glow, icon plates,
every text role's size and weight, spacing, button treatment, badges,
colours; light mode check; shape sweep numbers; refused-from-render list;
skipped or unverified list; proofs at 390 dark, 390 light (or the rule 22
note), desktop; a render-vs-built side-by-side. Then my own reading of the
side-by-side (or, where there is none, the governing image beside the 390
dark proof), naming the three largest visual differences that remain.

### 1. Profile (`/profile`), owner: profile. GATE FAIL (one decision from a pass)

Re-judged after `21425a5e` ("Profile rows and plates lit to the render,
point by point"), which landed while this audit was being committed.

| Check | Result |
|---|---|
| Chain | Yes (1.2); requests 1 and 1d open, 1b and 1c withdrawn (done) |
| Comparison rows | radii, rim, fill, plates, every text role with size and weight, spacing, button, badges, colours; round three adds 30 sampled points (row fill top to foot, rims, halo 4 px out, plate body, inner light, side light), every one within 10 per channel of the render. Glow now measured on both sides. |
| Light | Yes (1.5), the same five objects in their paper rendition; paper resets the round-three layers |
| Sweep numbers | Worker: harness `/zz-pfs` 0 / 0 / 0. This audit: committed `/preview/f4/profile` 0 / 0 / 0 on `486cb23`, before `21425a5e`, which changed only row and plate painting in `profile.css` (no text-bearing control) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark and light, 1280 dark and light, `profile-side-by-side-390-dark.jpg` (re-shot in round three): present |

Three largest differences (from the round-three `profile-side-by-side-390-dark.jpg`):
1. Type is 1.16 times the render on every text role and the name is heavier,
   so the text column, the tabs and the rows read larger and the Switch role
   row ends about 60 px lower than drawn. Ledger 1.1 calls it a choice (the
   longest subtitle still fits one line); no law requires it.
2. The glyphs inside the plates read smaller and quieter than the render's,
   which fill their squares (the plate glass itself now matches within 10).
3. At the foot of the side-by-side the next group's heading ("More of your
   account") shows through the translucent dock; harmless in use, but it is
   in the proof.

Fail reason: difference 1 is a departure the image does not make and no rule
requires. If the founder accepts the 1.16 type step, profile passes.

### 2. Get started (`/welcome`, `/start` redirect), owner: welcome. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W1 (Session A), W3, W4 open, W2 done by signin |
| Comparison rows | lockup, headline (now sampled in bands), sub-line, stage, coin size and place (matched in a 3x zoom), dots, button fill, edge and bloom (all sampled), Skip, ground: measured. **Lockup glow: not measured**, and it is the most visible glow above the stage. Sub-line weight not stated. |
| Light | Yes, rule 22, `welcome-light-390.jpg` |
| Sweep numbers | Yes, 0 / 0; confirmed 0 / 0 / 0 in this audit |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1440, `welcome-render-vs-built-390.jpg`, `welcome-coin-render-vs-built-3x.jpg`: present |

Three largest differences (from the two side-by-sides):
1. The lockup: the render's mark and wordmark glow blue into the ground; the
   built lockup is crisp with little or no halo.
2. The coin face: the ledger's own row says "close, not identical"; its face
   art is the drawer render's coin, lighter glass with ridged edges at 3x
   where the render draws one smooth band.
3. The button's bloom is fainter and less saturated than drawn (sampled
   #003490 against #0225b8 at 6 px), so the lit bar does not cast the pool of
   blue the render shows under it.

Fail reasons: the unmeasured lockup glow; the coin face is not the drawn
coin. Everything else here matches.

### 3. Welcome back (`/sign-in`, `/sign-in/email`; inherits to `/sign-up`, `/forgot-password`), owner: signin. GATE FAIL (one decision from a pass)

| Check | Result |
|---|---|
| Chain | Yes, 12 links plus 12b; SIGNIN-1 named |
| Comparison rows | complete: proportions as shares of the screen, card glass sampled at four points, rim, top highlight, glow, every text role with size and weight, every gap, both buttons, the G, colours. Each departure carries its reason. |
| Light | Yes, computed-style diff, 0 differences |
| Sweep numbers | Yes; confirmed 0 / 0 / 0 on `/sign-in?welcomed=1`, `/sign-in/email`, `/sign-up`, `/sign-up/email`, `/forgot-password` in this audit |
| Refused list | Yes (the slogan) |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1440 dark, `signin-vs-55A56F21-390.jpg`: present. `/forgot-password` has no proof of its own (it inherits the shell; swept here). |

Three largest differences (from `signin-vs-55A56F21-390.jpg`, re-shot):
1. The card is 78 per cent of the width against the render's 62 (ledger row
   "Card width"): the aurora margins are 43 px where the render leaves about
   a fifth of the screen each side. The ledger names this the lead's target,
   not a rule.
2. The controls are 44 px against 34 to 37 at the render's scale (the tap
   rule, a platform law) and the card is 49 px taller, so the plinth sits
   lower and the card reads chunkier.
3. The card's lit edge is a steady electric line; the render's is brighter at
   the top centre and fades towards the corners more strongly. Small.

Fail reason: difference 1 is a departure no law requires. If the founder
accepts 78 per cent (or the card goes to 62 with 44 px controls), this
surface passes on everything else.

### 4. Wallet (`/wallet`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W2, W4 named |
| Comparison rows | measured, with two recorded NO rows (page gutter 24 vs 13.5, section heads 17 vs 14). **Glow: image side "soft blue bloom off every edge", not measured.** |
| Light | Yes. The ledger cites `wallet-390-light.png`; the file is `.jpg` |
| Sweep numbers | Yes, harness `/preview/sbw/*` 0 / 0 / 0; committed `/preview/e/wallet` 0 / 0 / 0 here |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark. **Side-by-side: none.** |
| Claims | **FAIL**: `TrustStrip.tsx` and `wallet.home.trustTitle/Body/Badge` (section A) |

Three largest differences (render `6AF37222` beside `wallet-390-dark.jpg`):
1. The committed dark proof was shot mid-animation: the balance reads
   "₦245,6̆70.00" with a half-rolled digit clipped by its line box (the light
   proof shows 245,680.00). Retake it, and check the roll's clipping, which a
   slow phone would show too.
2. "Add money" overflows its tile at 390 in dark and light (the label touches
   both edges); the render's tiles have air round every label.
3. The quick-action cards are cramped: the plate is hard against the top
   left edge and the two lines crowd the foot, where the render's cards are
   roomy with the plate inset. The shell's 24 px gutter (render 13.5)
   narrows every card.

Fail reasons: the claim; no side-by-side; the proof defect; the overflowing
label; the unmeasured glow row.

### 5. Send money (`/wallet/send`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Present, but **stale**: it still reads "BROKEN, scope request W1" for idempotency, and scope W1 still stands as a blocker. `7763ff39` ("a second tap on Send moved the money twice") added `idempotencyKey` to `transferSchema` (`lib/wallet/schema.ts:81,92`) with `transfer-idempotency.test.ts`. The chain must be re-walked and W1 closed or re-stated. |
| Comparison rows | balance card, title, chip, panel, plates, row type, chips, counter, button, reassurance: present. **Missing: the panel's and rows' radii on the image side, rim, glow, spacing and colours.** |
| Light | Yes. The ledger cites `send-390-light.png`; the file is `.jpg` |
| Sweep numbers | Shared with wallet: 0 / 0; committed `/preview/e/send` 0 / 0 / 0 here |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark (empty and filled), 390 light. **Desktop: none. Side-by-side: none.** |

Three largest differences (render `77A54EA3` beside `send-390-dark.jpg`):
1. Every row sub-panel wears a thick bright outline; the render's rows are
   quiet sub-panels with a soft lit edge inside one panel.
2. The four amount chips are crammed (the figures touch the chip edges), and
   the proof shows the Send Money label dim grey-blue (disabled); the render's
   label is white on a bright bar.
3. The reassurance card is a large three-paragraph block where the render
   draws one slim strip (the words are right by the claims rule; the form is
   not).

Fail reasons: missing measured rows, no desktop, no side-by-side, a stale
chain.

### 6. Inspections (`/inspections`, `/agent/inspections`), owner: inspection. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; I1 to I4 named |
| Comparison rows | complete, measured, per-row ratios, with NO rows recorded (gutter; overall height) |
| Light | Yes |
| Sweep numbers | Yes, 0 / 0 / 0; committed `/preview/f5/inspection` 0 / 0 / 0 here; `/preview/f5/agent-inspections` 0 / 2 (the agent console's search input, not this sheet) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark, lister view, `inspection-render-vs-built-390-dark.jpg`: present |

Three largest differences (from the side-by-side, re-shot after the density
round):
1. The page is 1.38 times the render's height (ledger's own number): the
   outcome chooser the render does not draw pushes Add Photos and Submit
   below the first screen, where the render keeps both in view.
2. The info row's phone number wraps onto a second line ("+234 801 000 /
   0000"), which the render never does; the cells are cramped at 390.
3. Text runs at the platform's readable minimums against the render's much
   smaller type, so every row and card reads heavier and larger (the
   checklist is four rungs, not eight, by I1, recorded).

Fail reasons: 1 and 2. The ledger is the most complete in Session B; the
composition is the gap.

### 7. Admin shell, overview, operations, analytics, owner: admin-shell. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, per page (6.1), A5 to A11 named |
| Comparison rows | Overview: measured with hexes and sizes. **Operations and Analytics tables: image values are words ("26ish bold", "four cards"), not measurements.** Glow on the open row and panels: image side "blue bloom", not measured. |
| Light | Yes (6.3), four light proofs |
| Sweep numbers | 0 breaches, 5 worth an eye "accepted" (6.4). **This audit finds 128 on the committed admin harnesses, all on the shell's chip and search input** (section B). Not zero. |
| Refused list | Yes (6.5) |
| Skipped list | Yes (6.7), including: console copy English only, not in the dictionaries |
| Proofs | `docs/design/proofs/session-b/admin/`: 1440 dark and light, 390 dark and light, empty and fixture variants, `side-by-side-overview.jpg`, `-operations.jpg`, `-analytics.jpg`. From an uncommitted harness. |
| Landing | **FAIL**, section C |

Three largest differences (from `side-by-side-overview.jpg`):
1. The money chart: the render's is a glowing line over a deep, saturated
   blue fill with a hover card; the built line has no glow and its fill is
   thinner and paler, so the panel reads darker and emptier.
2. The KPI sparklines are faint flat marks where the render draws bright,
   glowing curves in each card's corner.
3. The vertical rhythm is looser: the render fits the pulse strip, four
   cards, both charts and both lower panels in one 1440 x 900 window; the
   built page runs the lower panels off the foot.

Fail reasons: the sweep, the landing rule, the unmeasured operations and
analytics rows, and English-only console copy.

### 8. Admin review desks (listings, listing under review, moderation, kyc, queue, support), owner: admin-review. GATE FAIL

- **Ledger section 7 on `main` reads "(pending)".** No chain, no comparison,
  no light check, no sweep numbers, no refused list, no skipped list.
- **No proofs** under `docs/design/proofs/session-b/` for these desks; no
  side-by-side with `C1D98B3C` panels 1 and 2, `01F7DFC7` panel 1 or
  `8E9602E2` panel 2.
- The one committed harness that touches them, `/preview/c1/listing-review`,
  sweeps 0 / 0 / 0; the queue page's chips and search input are the shell's
  0.35 controls.
- The handbook sections 4 to 7 and their parts of 16 to 18 are written and
  good; that is the only part of the gate met.

### 9. Admin money desks (money, escrow, supply; bookings and payments in register), owner: admin-money. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, per desk; request 10 named |
| Comparison rows | Present, but **type sizes are left in image px ("cap 12 img px") and never converted to CSS; card radius "close"; escrow rows "partly"; glow "soft blue outside each card", not measured.** Bookings and payments: no table. |
| Light | Yes (1440 for all three, 390 for money only) |
| Sweep numbers | 0 breaches, 45 worth an eye, attributed to the shell (true, and it is still not zero) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 1440 dark and light, 390 dark for all three. **Side-by-side: none.** Uncommitted harness. |

Three largest differences (render `C1D98B3C` panel 3 beside
`money-full-1440-dark.jpg`):
1. The rail in the proof is a short floating box that ends a third of the way
   down; the render's rail is a full-height lit panel (the shell's rail; the
   overview proof shows it full height, so this proof predates or bypasses
   the shell's fix).
2. The money chart is two steep oscillating curves; the render's is one
   rising filled mountain with a quiet second series.
3. The panels are darker and flatter than the render's lit cards; the built
   edge is a thin line.

Fail reasons: no side-by-side, unconverted and unmeasured rows, bookings and
payments not compared, sweep not at zero.

### 10. Welcome email (`lib/email/welcome-message.ts`), owner: email. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, six links; the send is Session A's |
| Comparison | No governing image exists for the email, so no table is owed. Accepted as N/A. |
| Light | Dark only by design (`theme.ts`), recorded |
| Sweep | N/A (not a page); shape ratios listed in the checklist |
| Refused list | Yes (the old copy's claims) |
| Skipped list | Yes |
| Proofs | 600 and 375, images on and off, stripped fallback, plain text: present |
| Claims | **FAIL**: "Agents are checked more closely than owners" (line 252) and "Each step you complete shows on your listings." (line 163): section A |

## E. Admin coverage map

Enumerated from the live schema (enums in `public`, status-like columns,
check constraints, `cron.job`, `notification_kind`, `risk_alerts`, and the
functions that write alerts), then mapped to the desk and panel that shows
each. "MISSING" means no admin route reads it.

### Queues

| Queue (table, waiting state) | Desk and panel |
|---|---|
| Listings `SUBMITTED`, `UNDER_REVIEW`, `MORE_INFO_REQUIRED`, `APPROVED` | `/admin/listings` status tabs; `/admin/queue` |
| Agent applications `SUBMITTED`..`MORE_INFO_REQUIRED` | `/admin/agents` (Supply > Applications); `/admin/queue` |
| Agent documents `pending` | `/admin/kyc` Identity verification queue |
| Businesses (listing_status) and `business_documents` | `/admin/businesses` |
| Reports `open`, `reviewing` | `/admin/moderation`, `/admin/reports`; `/admin/queue` |
| Held posts, stories, story comments, bios (`social_status` `HELD`) | `/admin/moderation` Held by the scan |
| Message flags `open` | `/admin/flags`; `/admin/queue` |
| Support tickets `open`, `pending` | `/admin/support`; `/admin/queue` |
| Areas `PROPOSED`, moderator applications `PENDING` | `/admin/social` (Around) |
| Escrows `DISPUTED` | `/admin/escrow` Waiting on a ruling; `/admin/money` Disputed holds |
| Reservations `PENDING` | `/admin/bookings/reservations` |
| Stuck withdrawal holds | `/admin/payments` |
| Events `HELD` (`event_status`, raised by `private.scan_event`) | **MISSING**: no admin read of `events` |
| Account deletions `SCHEDULED`, `PURGING` (`account_deletion_requests`) | **MISSING** (only the account-purge job's run is on Operations) |
| Business transfers `PENDING` (`business_transfers`) | **MISSING** |

### Money paths

| Path | Desk and panel |
|---|---|
| Card charges (`transactions` SUCCESSFUL, PENDING, FAILED, REFUNDED) | `/admin/money` Failed charges; `/admin/payments` Waiting on the provider, Money in per day; Overview Naira transacted |
| Wallet entries, all 11 kinds and 4 statuses | `/admin/money` Ledger (every entry, kind and status badge), Wallet float, Settled this week |
| Deposits (top-ups) | Overview Naira transacted; `/admin/money` |
| Withdrawals and payouts | `/admin/payments` stuck holds; `/admin/money` ledger. Payout accounts: only masked lookup on `/admin/payments` |
| Transfers between people | `/admin/money` ledger (kind shown) |
| Pots (`pot_hold`, `pot_release`) | `/admin/money` ledger only, no panel of its own |
| Escrow, all 9 states | `/admin/escrow` pipeline (6 tiles: Funded, Held, Release requested, Released, Refunded, Disputed) plus status chips for every state; INITIATED, RESOLVED, CANCELLED only as chips and badges |
| Escrow purposes (5, including `agency_fee`) | `/admin/escrow` Escrow by purpose (grouped from rows). **Handbook section 9 lists four and omits `agency_fee`.** |
| Booking refunds (`booking_refunds`, 4 reasons) | `/admin/money` Refunds; `/admin/bookings/[id]` |
| Fee rates, revenue sources | `/admin/fees` |
| Reconciliation (`private.reconciliation_watch`) | Audit-row history on `/admin/money` and `/admin/escrow`; the watch table itself **MISSING** (request 10) |

### Supply roles

Owner, Agent (agents by `supply_role`), Firm, Host (businesses by kind):
`/admin/supply` role cards and table; Overview New listings by role.
`agent_type`, `business_kind` (7) feed the resolution. Complete.

### Verification rungs

| Rungs | Desk |
|---|---|
| Agent: identity, address, payout, in_person (`agent_verification_checks`, passed/failed/pending); agent document kinds identity, address, business, selfie, association | `/admin/kyc` Results by rung, queue, funnel |
| Business: identity, registration, payout, on_site (`business_verification_checks`); business document kinds identity, registration, association, licence, hygiene | `/admin/businesses` ladder |

Complete, with the render's provider and match score refused.

### Listing states

`DRAFT, SUBMITTED, UNDER_REVIEW, MORE_INFO_REQUIRED, APPROVED, PUBLISHED,
REJECTED, SUSPENDED`: every state but `DRAFT` has a tab on
`/admin/listings` (drafts deliberately not shown, recorded). `sale_status`
(available, under offer, sold) is read on the queue card and the listing
under review (`ListingCard.tsx`, `ListingReview.tsx`); the handbook does not
mention it. Accommodations and room types use `listing_status`:
`/admin/businesses`. Examples (`is_demo`) on `/admin/examples` and tagged on
every list.

### Inspections

`inspection_state` (REQUESTED, CONFIRMED, PROPOSED, DECLINED, COMPLETED,
WITHDRAWN) and `outcome`: **MISSING** from the console. No admin route reads
`inspection_requests`.

### Bookings

`booking_status` (5, including NO_SHOW): `/admin/bookings` board;
`booking_state_events` on the stay's page. Reservations: reservations desk.

### Notifications

`notification_kind`: booking, message, wallet, listing, agent, support,
system, social. **MISSING, all eight**: Operations > Notifications says
"Not wired yet" (request A6; admins cannot read `notifications`). Email
sends are not tracked anywhere an admin can read.

### Scheduled jobs

| Job | Desk |
|---|---|
| Vercel Cron: hold-sweep, paystack-reconcile, pg-cron-watch, complete-stays, inventory-drift, account-purge, saved-search-alerts | Operations jobs table, row by row, from `audit_log` |
| pg_cron (live `cron.job`, all active): vallo_announce_completed_stays `20 5 * * *`, vallo_escrow_sweep_timeouts `17 * * * *`, vallo_purge_idempotency `10 2 * * *`, vallo_purge_rate_limits `30 * * * *`, vallo_reconcile_payments `47 * * * *`, vallo_release_stale_holds `*/15 * * * *`, vallo-daily-note `0 6 * * *`, vallo-nightly-badges `20 2 * * *` | **Partial**: one summary row from the newest pg-cron-watch audit row; per-job last run and status MISSING (request A5). Schedules in the handbook match `cron.job`. |

### Alerts

`risk_alerts` (severity low, medium, high; status open, resolved): Overview
Recent alerts, Operations Active alerts and tab, `/admin/alerts` to
resolve. Writers found in `pg_proc`: `scan_post`, `scan_story`,
`scan_event`, `scan_review`, `scan_review_response`,
`scan_social_profile`, `notify_report`, `request_money_reconciliation`, plus
the cron reporters (`cron`, `cron_job` entity types in the rows). All land on
the same desks. `blocked_terms` (severity) has no admin editor: **MISSING**
if the founder wants the scan's word list managed in the console.

### Handbook completeness (`docs/ADMIN_CONSOLE.md`)

Per desk: data sources, actions, permissions, effects, limits, options
rejected.

| Desk | Sources | Actions | Permissions | Effects | Limits | Rejected |
|---|---|---|---|---|---|---|
| Overview (3) | yes | none (reads) | section 1 | n/a | yes (3, 17) | yes (18) |
| Listings (4) | yes | yes | yes | yes | yes | yes |
| Moderation (5) | yes | yes | section 1 only | yes | yes | yes |
| Verification (6) | yes | yes | section 1 only | yes | yes | yes |
| Support, queue (7) | partly (functions, no tables) | yes | section 1 only | partly | **no** | **no** |
| Money (8) | yes | yes | yes | yes | yes | yes |
| Escrow (9) | yes | yes | yes | yes | yes | yes |
| Supply (10) | yes | none | yes | n/a | yes | yes |
| Bookings (11) | yes | yes | **no** | yes | **no** | **no** |
| Payments (12) | yes | yes | **no** | yes | **no** | **no** |
| Operations (13) | yes | none | section 1 | n/a | yes | yes |
| Analytics (14) | yes | none | section 1 | n/a | yes | yes |
| The other desks (15): agents, businesses, stops, fees, flags, reports, social, standing, alerts, audit, switches, reference, examples | **one line each** | **no** | **no** | **no** | **no** | **no** |

**Verdict: FAIL** on coverage of every desk. Thirteen desks in section 15
have a purpose line and nothing else, although several of them act
(Applications admits and refuses, Businesses verifies and puts live, Stops
suspends, Switches turns surfaces off, Alerts resolves, Standing grants
badges, Around opens areas). Bookings and payments carry no permissions,
limits or rejected options. Escrow purposes omit `agency_fee`. Inspections,
events, account deletions and business transfers are not on any desk and
the handbook does not say so.

## Routes under `/admin` (from the filesystem)

`/admin`, `/admin/agents`, `/admin/alerts`, `/admin/analytics`,
`/admin/audit`, `/admin/bookings`, `/admin/bookings/[bookingId]`,
`/admin/bookings/reservations`, `/admin/businesses`, `/admin/escrow`,
`/admin/examples`, `/admin/fees`, `/admin/flags`, `/admin/kyc`,
`/admin/listings`, `/admin/listings/[id]`, `/admin/moderation`,
`/admin/money`, `/admin/operations`, `/admin/payments`, `/admin/queue`,
`/admin/reference`, `/admin/reports`, `/admin/settings`, `/admin/social`,
`/admin/standing`, `/admin/stops`, `/admin/supply`, `/admin/support`,
`/admin/switches`: 30 pages. Every one redirects a signed-out browser to
sign in, so none has a live shape sweep; see B for which have harness
proof.
