# The unfinished work audit

**Read-only audit of the Vallo platform, taken 22 September 2026.** Nothing in
this repository was changed to produce it. A build session was pushing to main
while it ran, so every finding below is a snapshot of the working tree and of
the live Supabase project `uccixoonmbhrnyczyigt` as they stood on that date.
`docs/BUILD_06_LEDGER.md` and `docs/BUILD_05_LEDGER.md` were read first to know
what the build believes it landed; every claim here was then re-derived from
code, from the live database, or from a script run against the tree, and where
the ledger and the tree disagree the tree wins and the disagreement is named.

**Status vocabulary used throughout.** NOT IMPLEMENTED, FRONTEND ONLY,
BACKEND ONLY, PARTIALLY WIRED, PLACEHOLDER, BROKEN, UNVERIFIED.

**The finding, in one paragraph.** This codebase is far more finished than its
page count suggests and its gaps are not scattered stubs but a few sharp holes.
No TODO or FIXME markers in the source, no empty click handlers, no forms
without a submit path, no unresolved imports, three empty catch blocks and all
three correct, and a dead-control sweep over 561 components reporting zero high
findings. What is unfinished: a live database that still answers to a dead brand
and leaves the platform's own handle claimable; a catalogue that is one hundred
per cent example stock counted as real supply on the public landing page; three
Nigerian locales at 97 per cent by key count that still leave hundreds of English
sentences on screen because those sentences were never put in the dictionary;
two deep-link files still carrying the word PLACEHOLDER; no push notifications;
no Apple sign in; and several built-but-unreachable backend capabilities whose
UI was never drawn.

---

## 0. The baseline this audit measured against

| Measure | Value | How it was taken |
| --- | --- | --- |
| `page.tsx` files, total | 235 | `find apps/web/src/app -name page.tsx` |
| Product pages (excluding `(dev)`) | 129 | same, minus `app/(dev)/**` |
| Dev preview pages | 106 | `app/(dev)/preview/**`, gated, see 1.6 |
| `loading.tsx` | 86 | `find apps/web/src/app -name loading.tsx` |
| `error.tsx` | 6 | includes `global-error.tsx` and `(app)/error.tsx` |
| `not-found.tsx` | 1 | `apps/web/src/app/not-found.tsx` |
| Files declaring `"use server"` | 69 | matches the brief's count exactly |
| Exported functions in those files | 233 | script, see section 2 |
| API route handlers | 18 | `apps/web/src/app/api/**/route.ts` |
| Migration files on disk | 212 | `supabase/migrations/*.sql` |
| Migrations applied live | 213 | `supabase_migrations.schema_migrations` |
| Migrations parked in `pending/` | 4 SQL + 1 markdown | `supabase/migrations/pending/` |
| Public tables live | 102 | `pg_class` where `relkind='r'` |
| Tables with RLS enabled | 102 of 102 | `pg_class.relrowsecurity` |
| i18n leaf keys, English | 2,497 | script over the unmerged dictionaries |
| TODO / FIXME / HACK / XXX in source | 0 | grep over `apps/web/src` and `packages` |
| `@ts-ignore` / `@ts-expect-error` | 0 | same grep |
| Empty `catch {}` blocks | 3 | all three are inline boot scripts, correct |
| Unresolved local imports | 0 | script resolving every `@/` and relative import |

**Live data reality, and it is the context for everything else.** Published
listings 64, of which `is_demo` is true for 64. Accommodations 5, all demo.
Businesses 8, of which 7 demo. Agents 1, demo. Landmarks 0. Reviews 0. Bookings
0. Reservations 1. Profiles 6. Posts 74. Areas 9. The marketplace has no real
supply and no real transactions yet. That is not a code defect, but it changes
which findings matter: anything that dresses example stock as real inventory is
a launch blocker, and anything that only breaks under load is not.

---

## 1. Incomplete pages and surfaces

### 1.1 The headline: the page layer is not where the unfinished work is

Every one of the 129 product pages renders, exports a default, and is reachable.
`scripts/audit/route-inventory.mjs` walks 254 routes and reports zero orphan
pages, zero self-only pages and zero non-rendering pages.
`scripts/audit/states-checklist.mjs` reports zero data surfaces with no empty
state, zero with no loading state and zero with no error state. I re-derived the
import graph independently and found zero broken local imports. The small pages
that look like stubs by line count are thin delegating shells, not placeholders:
`app/(app)/around/manage/page.tsx` is a 16-line `permanentRedirect`,
`app/(auth)/forgot-password/page.tsx` is a 14-line locale read wrapping
`ForgotPasswordForm`, `app/(app)/u/[handle]/following/page.tsx` is a 25-line
flag check wrapping `FollowListPage`.

So the INCOMPLETE page table below is short on purpose. Padding it would have
hidden the seven surfaces that genuinely are not finished.

### 1.2 The incomplete surfaces, with what is missing

| # | Surface | File | Status | What is missing |
| --- | --- | --- | --- | --- |
| 1.2.1 | Profile, "What you have here" | `apps/web/src/app/(app)/profile/AccountBody.tsx:262` | BROKEN | `RowLink href="/reviews"` points at a route this build does not serve, and `next.config.ts` has no redirect for it (it has four, for `/agents`, `/agents/apply`, `/agents/status`, `/support`, `/agent`). A signed-in person taps a row labelled "Reviews" showing a real count and gets a 404. Verified by cross-checking all 83 distinct literal internal hrefs in TSX against the route tree; this is the only genuine miss. |
| 1.2.2 | App chrome, verified tick | `apps/web/src/lib/app/shell-queries.ts:118` | PARTIALLY WIRED | `getShellIdentity` returns `verified: false` unconditionally for every signed-in user. `components/app/AppRail.tsx:149` draws the tick only when `verified` is true, so the tick in the drawer can never appear, for anybody, including a genuinely verified agent. The comment at `AppRail.tsx:71` says so and has not been closed. |
| 1.2.3 | App chrome, failed identity read | `apps/web/src/lib/app/shell-queries.ts:126` | BROKEN under failure | `catch { return GUEST; }` means any throw in the profile, social-profile, unread, agent or role reads renders full signed-out chrome to a signed-in person. They keep their session but lose their name, avatar, unread count, agent nav and admin nav with no error state anywhere. This is the one place in the codebase where a swallowed failure produces a wrong screen rather than a missing one. |
| 1.2.4 | Wallet, savings pots | `apps/web/src/app/(app)/wallet/page.tsx:52`, `apps/web/src/lib/wallet/pots.ts:90` | BACKEND ONLY, and the backend is not applied | `readPots` queries `wallet_pots`, which does not exist in the live database. Confirmed: `information_schema.tables` has no table matching `%pot%` or `%saving%`, and `wallet_entry_kind` carries no pot labels. The two migrations that would create it sit unapplied (section 3.2). The page handles it correctly, drawing `state: "unavailable"`, so nothing is broken, but `components/app/wallet/PotsSection.tsx` and `app/(site)/docs/chapters.tsx:1295` document a feature the product does not have. |
| 1.2.5 | Landing, the trusted-stats band | `apps/web/src/lib/platform-stats.ts`, `public.platform_stats()` | BROKEN as a truth claim | The function body, read live, is four `count(*)` reads with no `is_demo` filter: `select count(*) from public.listings where status = 'PUBLISHED'` and so on. All 64 published listings are `is_demo`. The public landing page therefore advertises 64 listings and their cities and states as platform inventory. `lib/platform-stats.ts` itself says "Zero is a real answer and is reported as zero", which is exactly the discipline the SQL does not implement. This violates the platform's own rule 13 on invented counts. |
| 1.2.6 | Landing, category tile counts | `apps/web/src/components/site/landing/CategoryGrid.tsx:96`, `components/site/landing/LandingBody.tsx:30-44` | BROKEN as a truth claim | `landingData` tallies `repo.search()` by kind and prints "n listings" per tile whenever `catalogue.length === stats.listings`. Both sides of that equality are example stock, so the check passes and the tiles print example counts as real. The `complete` guard is careful about completeness and says nothing about provenance. |
| 1.2.7 | Restaurants, hours and open-now | `apps/web/src/app/(app)/restaurant/[id]/page.tsx` (464 lines), `service_windows` 23 rows over 3 `restaurant_profiles` | PARTIALLY WIRED | The surface refuses to guess open-now when hours are absent, which is right. But only 3 restaurant profiles exist and 2 of the 3 businesses behind them are demo, so in production this surface is a well-built page with almost nothing to show. Not a code defect; a supply gap that the launch plan has to answer. |

### 1.3 Pages that are complete but will render empty in production

These are not defects. They are listed because a founder walking the product
before launch will meet them and should not mistake an honest empty state for a
broken page.

`app/(app)/bookings/**` and `app/(app)/trips` (`bookings` 0);
`app/(app)/bookings/[bookingId]/review` (`reviews` 0, and none can exist until a
booking completes); `app/(app)/inspections` (`inspection_requests` 0);
`app/(app)/saved` and `/saved/searches` (both 0); landmark-aware search
(`landmarks` 0, the M8 seed unapplied); `app/admin/escrow` and `app/admin/money`
(`escrows` 0, `platform_revenue` 0, `transactions` 0);
`app/(app)/wallet/transactions` (`wallet_entries` 2, `wallets` 1).

### 1.4 TODO, FIXME and dead documentation references

There are no TODO or FIXME markers in the application source. There are five
comment references to `docs/MASTER_TODO.md`, a file that does not exist:
`app/(app)/checkout/[bookingId]/page.tsx:31`, `lib/payments/references.ts:66`,
`lib/bookings/settlement.ts:30`, `lib/bookings/checkout.ts:28`,
`lib/bookings/checkout-view.ts:182`. Each cites "section 5b" of it for the
commercial rule. The rule is correctly implemented in all five places; the
citation is dangling. Status: PLACEHOLDER, cosmetic, S.

### 1.5 The one dead-end control the sweep found in a dev surface

`app/(dev)/preview/f3/move-in/page.tsx:47` renders a `ButtonLink href="#"`. It
is inside the gated preview harness and ships to nobody. Recorded for
completeness only.

### 1.6 The preview harness is correctly fenced, and the fence is worth knowing

106 of the 235 pages are `app/(dev)/preview/**`. They are gated by
`app/(dev)/preview/layout.tsx`, which calls `previewHarnessIsOpen` from
`lib/preview-harness.ts:37`. That function returns true in development, returns
false whenever `process.env.VERCEL` is set whatever else is true, and otherwise
requires `VALLO_PREVIEW_HARNESS === "1"`. A variable set by mistake in Vercel
project settings cannot expose fixture pages full of invented listings. This is
correct and it is tested. The one gap: `VALLO_PREVIEW_HARNESS` is not documented
in `apps/web/.env.example`, not even on its "NOT WIRED TO ANYTHING YET" list.
Status: PLACEHOLDER, S.

---

## 2. Dead controls and unwired actions

### 2.1 What the instruments say, and what I checked independently

`scripts/audit/dead-controls.mjs` parses 561 `.tsx` files with the TypeScript
JSX parser and reports **total 0, high 0**. I did not take that on trust. I
re-ran the primitive checks myself over the same tree:

- `onClick={() => {}}`, `onClick={()=>{}}`, `onClick={noop}`: zero occurrences.
- `href="#"`, `href=""`, `href={"#"}`: one occurrence, in the gated preview
  harness (1.5).
- `<form` elements: 69, and 69 carry an `action` or `onSubmit` on the element or
  within three lines of it.
- Literal internal hrefs: 83 distinct, cross-checked against the route tree and
  `next.config.ts` redirects. One genuine miss (`/reviews`, 1.2.1). Five
  apparent misses are dynamic-route instances that do resolve (`/around/eti-osa`
  to `[slug]`, `/docs/*` to `[slug]`, `/profile/setup/owner` to `[role]`,
  `/u/chii_realty` and `/u/me/edit` to `[handle]`). Four more are covered by the
  redirects at `apps/web/next.config.ts:114-155`.

The dead-control layer of this product is genuinely clean. The unwired work is
one level down: server actions that exist and are never called, and database
capabilities whose UI was never drawn.

### 2.2 Exported server actions with no caller anywhere in the tree

Method: extract every `export function` and `export async function` from the 69
`"use server"` files (233 exports), then grep the whole of `apps/web/src` for
each name and for its `<name>Action` wrapper, excluding the defining file, test
files and the dev harness. Sixteen have no caller.

| Export | File | Status | What it means |
| --- | --- | --- | --- |
| `recordNoShow` | `apps/web/src/lib/bookings/lifecycle-actions.ts` | BACKEND ONLY | The NO_SHOW leg of the booking lifecycle is complete in the database (`booking_status` carries `NO_SHOW`, `public.record_booking_no_show` exists and is called by exactly this action) and has no control anywhere in the product. A host can never record a no-show. This was on BA's queue in `BUILD_06_LEDGER.md` section 3 as "NO_SHOW recording and its notification". |
| `getMyListings` | `apps/web/src/lib/agent/listings-actions.ts` | dead code | The agent listings surface reads through queries instead. |
| `addVideo` | `apps/web/src/lib/agent/listings-actions.ts` | BACKEND ONLY | `listing_videos` exists live with RLS and 2 policies and 0 rows. No UI can add one. |
| `removeVideo` | `apps/web/src/lib/agent/listings-actions.ts` | BACKEND ONLY | Same. |
| `recordIdentityCheck` | `apps/web/src/lib/admin/business-actions.ts` | BACKEND ONLY | The M15 business verification ladder. `business_verification_checks` is live with 2 policies and 0 rows, and no admin surface can record a rung. `app/admin/businesses/page.tsx` is 506 lines and does not call these four. This was BC's queue item "host verification rungs completed". |
| `recordRegistrationCheck` | same | BACKEND ONLY | Same ladder. |
| `recordPayoutCheck` | same | BACKEND ONLY | Same ladder. |
| `recordOnSiteCheck` | same | BACKEND ONLY | Same ladder. |
| `startAppleOAuth` | `apps/web/src/lib/auth/actions.ts:659` | NOT IMPLEMENTED at the product level | The bound form action exists. Apple is off by default in `lib/auth/providers.ts` because it needs an Apple Developer team, a Services ID and a key. See 6.3: this is an App Store blocker, not merely dead code. |
| `recoverFundingByReference` | `apps/web/src/lib/wallet/recovery-actions.ts` | BACKEND ONLY | The manual recovery path for a Paystack charge whose webhook never arrived. Built, tested, no console. |
| `runReconciliationNow` | `apps/web/src/lib/wallet/recovery-actions.ts` | BACKEND ONLY | Same. Reconciliation can only be triggered by the cron schedule or by hand-crafting a bearer request to `/api/paystack/reconcile`. |
| `startBookingThread` | `apps/web/src/lib/messages/actions.ts:387` | dead code | Only its schema is referenced. |
| `skipInterestsAction` | `apps/web/src/lib/interests/actions.ts` | dead code | `saveInterestsAction` is used by `components/app/welcome/InterestChoices.tsx`; the skip wrapper is not. |
| `offerBusinessTransferAction` | `apps/web/src/lib/business-transfer/actions.ts:201` | dead code | `app/host/transfer/TransferWorkspace.tsx:11-15` imports the three raw functions (`offerBusinessTransfer`, `respondToBusinessTransfer`, `closeBusiness`) and never the `*Action` wrappers. The feature works; the wrappers are orphans. |
| `respondToBusinessTransferAction` | same | dead code | Same. |
| `closeBusinessAction` | same | dead code | Same. |

Two exports that my first pass flagged and that are in fact reachable, recorded
so nobody re-derives them: `savePlace` and `unsavePlace` in
`lib/saved/places-actions.ts` are internal helpers behind `saveStay`,
`unsaveStay`, `saveRestaurant` and `unsaveRestaurant`, all of which are called
from `components/app/SaveControl.tsx`, `components/app/listing/ListingActions.tsx`
and `app/(app)/saved/SavedBoard.tsx`.

### 2.3 UI calling actions that do not exist

None found. Every server action imported by a component resolves to an export,
verified by the import-resolution script in section 0 and by the absence of any
unresolved `@/lib/**` specifier.

### 2.4 Database capability with no control above it

| Capability | Where it lives | Status |
| --- | --- | --- |
| No-show recording | `public.record_booking_no_show`, `booking_status.NO_SHOW` | BACKEND ONLY, 2.2 |
| Business verification rungs | `public.business_verification_checks`, four `record*Check` actions | BACKEND ONLY, 2.2 |
| Listing videos | `public.listing_videos` | BACKEND ONLY, 2.2 |
| Overdrawn wallet detection | `public.wallets_overdrawn()` | BACKEND ONLY, zero callers in `apps/web/src`. Nothing on this platform ever asks whether a wallet has gone negative. |
| Stale withdrawal hold reader | `public.stale_withdrawal_holds()` | BACKEND ONLY, zero callers. Its writing sibling `admin_expire_stale_withdrawal_holds` has one. |
| Fee rate lookup | `public.fee_rate_at()` | zero callers from the app. `fee_rates` holds 2 rows. |
| Escrow open | `public.escrow_open()` | superseded by `escrow_fund_from_wallet`; zero callers. |
| Required-verification predicate | `public.verification_is_required()` | zero callers, and it still holds an `authenticated` EXECUTE grant. See 7.2. |
| Landmark resolution | `public.landmarks_resolve()` | 2 callers, but `landmarks` holds 0 rows, so every call returns nothing. |

---

## 3. Backend gaps and pipeline health

### 3.1 The live database no longer matches the repository, in four places

`supabase_migrations.schema_migrations` holds 213 rows.
`supabase/migrations/` holds 212 files. Comparing by migration NAME rather than
by timestamp (the applied timestamps do not match the filenames, so a version
comparison is useless here):

**Applied live, no file in the repository (4).** Status: BROKEN as a record.
The repository cannot reproduce the live schema.

- `lead_the_first_first_party_venue_and_the_reservation_loop_proved_against_it`
  (applied 19 September 2026 at 18:19:50). This is the migration
  `BUILD_06_LEDGER.md` section 12.5 describes as creating the platform's first
  non-demo business. `grep -rl 'first_first_party_venue' --include='*.sql'` over
  the whole repository returns nothing. It created a real row (`businesses` has
  8 rows, 7 demo) and left no file behind.
- `stock_the_demo_catalogue_with_rent_homes_and_shortlets`
- `the_reconciliation_job_calls_a_function_that_exists`
- `the_verified_badge_follows_kyc_not_the_demo_flag`

The last three are older and may have been applied under filenames later
renamed, but no file with a matching name exists today, so the set of SQL that
produced the live database cannot be reconstructed from this repository. A fresh
environment built from `supabase/migrations/` will not equal production.

**In the repository's applied folder, never applied (3).** These are NOT in
`pending/`, so nothing marks them as awaiting a decision, and a reader would
reasonably assume they are live.

| File | What it does | Consequence of it being unapplied |
| --- | --- | --- |
| `supabase/migrations/20260915090000_the_database_stops_saying_rentme.sql` | Replaces `private.validate_social_handle`, reserves `vallo`, renames three badges, rewrites three function bodies | **LAUNCH BLOCKER. See 3.2.** |
| `supabase/migrations/20260812090000_a_wallet_can_set_money_aside.sql` | Adds the two `wallet_entry_kind` labels pots need | Savings pots do not exist |
| `supabase/migrations/20260812090100_pots_move_money_under_the_wallet_lock.sql` | Creates `wallet_pots` and its locking functions | Savings pots do not exist; `lib/wallet/pots.ts` permanently answers "unavailable" |

### 3.2 The unapplied rename migration is a live impersonation hole

This is the single most serious finding in this audit and it was verified
against the live database, not read from a file.

`supabase/migrations/20260915090000_the_database_stops_saying_rentme.sql` is
unapplied. Its own header at line 10 states that it is "not optional" and why.
I confirmed every part of its claim live:

1. `private.validate_social_handle()` in production still reads
   `if new.handle like '%rentme%' or new.handle like '%naijafinds%' then`. It
   does not test for `vallo`.
2. `private.reserved_handles` holds 32 rows and **zero** of them match
   `%vallo%`. There is no exact `vallo` row.
3. `apps/web/src/lib/social/bot-schema.ts` exports `BOT_HANDLE = 'vallo'` and its
   comment states the validator refuses any handle containing the bot's name.
   That statement is false of the live database.

**Therefore, today, any signed-in user can claim `/u/vallo`, `/u/vallo_support`
or `/u/vallo_official` and impersonate the platform inside a product whose
entire argument is trust.** Status: BROKEN, live, BLOCKS LAUNCH.

The same unapplied migration leaves user-facing dead-brand copy in production.
Read live from `public.badges`:

- `rentme_elite`, named "RentMe Elite"
- `year_one`, described as "One year since joining RentMe."
- `top_contributor`, described as "Given by RentMe to somebody whose answers
  have made a place better. Never earned automatically."

And the refusal message a person sees when a handle is rejected still reads
"That handle is too close to an official RentMe name."

### 3.3 Cron jobs: defined, scheduled, watched

Seven jobs are declared in `apps/web/vercel.json` and all seven have a matching
route handler. Every route wraps `runCronJob` from `lib/cron/run.ts` and is
guarded by `lib/cron/auth.ts`, which does a constant-time bearer comparison
against `RECONCILE_CRON_SECRET` and refuses everything when that is unset. This
is correct and well built.

| Schedule (UTC) | Path | Handler exists | On the watch list |
| --- | --- | --- | --- |
| `5 * * * *` | `/api/cron/hold-sweep` | yes | yes |
| `10 * * * *` | `/api/paystack/reconcile` | yes | **no** |
| `20 * * * *` | `/api/cron/pg-cron-watch` | yes | yes |
| `30 2 * * *` | `/api/cron/complete-stays` | yes | yes |
| `45 2 * * *` | `/api/cron/inventory-drift` | yes | yes |
| `15 3 * * *` | `/api/cron/account-purge` | yes | yes |
| `40 7 * * *` | `/api/cron/saved-search-alerts` | yes | yes |

**Gap.** `WATCHED_JOBS` at `apps/web/src/lib/cron/freshness.ts:69-87` lists six
jobs. `paystack/reconcile` is scheduled hourly and is the only money-recovering
job on the platform, and it is not watched for staleness. If it silently stops
firing, nothing raises. The same file's own comment at line 78 explains that the
account purge was found missing from this list for exactly this reason; the
reconcile job is the one that was not noticed. Status: PARTIALLY WIRED, S,
HURTS LAUNCH.

**UNVERIFIED and worth the founder checking:** Vercel's Hobby plan caps cron
jobs at two, running once a day. Seven hourly and daily jobs need a Pro plan. I
could not read the project's plan (section 9, honesty log).

### 3.4 Webhooks: registered versus handled

| Webhook | Route | Verification | Status |
| --- | --- | --- | --- |
| Paystack | `apps/web/src/app/api/paystack/webhook/route.ts` (713 lines) | HMAC, plus `countRouteFailure` from `lib/security/money-limits.ts` | wired |
| Supabase Send Email Hook | `apps/web/src/app/api/auth/email-hook/route.ts` (194 lines) | standard-webhooks HMAC with skew window and rotation support; refuses everything when `SUPABASE_AUTH_HOOK_SECRET` is unset | wired in code, **UNVERIFIED whether the hook is enabled in the Supabase dashboard** |
| Yellowcard (crypto deposits) | `apps/web/src/app/api/yellowcard/webhook/route.ts` (302 lines) | signature plus route failure limits | wired in code; `YELLOWCARD_API_KEY` and `YELLOWCARD_API_SECRET` are not in `apps/web/.env.example` at all, so this integration is undocumented for an operator |

The email hook is an either-or with `supabase/templates/*.html`. If the hook is
enabled, those ten template files are dead. If it is not, then every auth email
comes from Supabase's built-in templates and the carefully designed
`verificationCode` message at `lib/email/messages.ts:426` never sends. One of
those two statements is true and this repository cannot tell which. Status:
UNVERIFIED, and it is a founder question.

### 3.5 Transactional emails: built versus sent

`apps/web/src/lib/email/messages.ts` exports 20 message builders. Eleven are
sent from production code. **Nine have no sender anywhere.**

| Builder | Status |
| --- | --- |
| `escrowFunded` | NOT WIRED |
| `escrowReleased` | NOT WIRED |
| `inspectionScheduled` | NOT WIRED. An inspection is confirmed in-app and by a notification row only; nobody is emailed about a viewing appointment. |
| `listingApproved` | NOT WIRED |
| `listingRejected` | NOT WIRED. An agent whose listing is refused learns it only if they open the app. |
| `newEnquiry` | NOT WIRED |
| `passwordReset` | NOT WIRED, and duplicated: `supabase/templates/recovery.html` is a second, different password-reset email. Two designs, one job, neither provably in use (3.4). |
| `verificationRungPassed` | NOT WIRED |
| `withdrawalOutcome` | NOT WIRED. `withdrawalFailed` sends; a successful withdrawal emails nobody. |

Also absent: there is no `welcome` email sender. The builder exists at
`lib/email/messages.ts:212` and nothing calls it. Nobody who signs up for Vallo
receives a welcome message.

Wired and correct: `verificationCode`, `walletFunded`, `withdrawalFailed`,
`bookingRequested`, `bookingRequestedHost`, `bookingCancelled`,
`bookingConfirmed`, `stayArrivalDetails`, `bookingRefunded`,
`supportTicketFiled`.

### 3.6 Notifications: written versus delivered

`notification_kind` is `booking, message, wallet, listing, agent, support,
system, social`. Notifications are database rows read by
`app/(app)/notifications/page.tsx`. There is no push delivery of any kind
(section 6.4) and, per 3.5, nine of the events that deserve an email do not get
one. So for eight of the eight kinds, delivery is in-app only, and a person who
does not open the app learns nothing. Status: PARTIALLY WIRED by design, but it
is a design that will cost bookings.

### 3.7 API routes: stubs and orphans

Eighteen route handlers. None is a stub; the smallest are the six cron routes at
22 lines each, and each of those is a correct three-line delegation to
`runCronJob`. Two routes are genuinely unreachable:

`/api/map/listings` (`apps/web/src/app/api/map/listings/route.ts`, 176 lines) is
BACKEND ONLY: nothing in the product fetches it, the only references outside the
file are its own test at line 49 and a comment at `lib/listings/bounds.ts:46`.
It is rate-limited and complete and the map reads its data another way. The
other seven routes the orphan sweep names (`/api/yellowcard/webhook`,
`/api/auth/email-hook` and the five `/api/cron/*`) are false positives: each is
called from outside and correctly has no in-tree referrer.

### 3.8 Migrations in `supabase/migrations/pending/`, and what each blocks

| File | Status | What it blocks |
| --- | --- | --- |
| `20260918150300_b5_verification_is_required_is_not_a_client_call.sql` | drafted, not applied | Revokes the `authenticated` EXECUTE grant on `public.verification_is_required(uuid)`. Confirmed live: the advisor still reports that grant. Until applied, any signed-in caller can learn, for any user id, whether that person is a seller, landlord or agent. Parked because revokes are on the build's stop list. |
| `20260919101800_b4_the_flags_already_written_lose_their_digits.sql` | drafted, not applied, needs the founder | Masks bank account digits already stored in `public.message_flags.matched`. `message_flags` holds 4 rows live. Its forward-looking half (`20260919101700`) IS applied, so no new row keeps digits. This one is a rewrite of existing rows, hence the hold. |
| `m06_bookings_extension.sql` | drafted, not applied, needs the founder | Relaxes `bookings.listing_id` to nullable and adds `accommodation_id`, `room_type_id`, `rate_plan_id`, `rooms` plus the CHECK that keeps one booking spine. **Until applied, a stay cannot be booked at all**: there is no column on `bookings` to hold the accommodation. `bookings` holds 0 rows, so nothing is at risk in applying it. |
| `m08_landmarks_seed.sql` + `LANDMARKS.md` | drafted, not applied, needs the founder | `landmarks` is live and empty. Landmark-aware search ("near the airport", "near VI") resolves nothing. One page of hand-written, unscraped rows awaiting approval. |

### 3.9 Places where the data model supports something the product never reads

Beyond section 2.4: `platform_revenue` (0 rows, one reader);
`booking_state_events` (0 rows, written by a trigger for transitions that have
never happened); `units` (0 rows, the per-unit spine M6 would make reachable);
`availability` (0 rows, 2 policies); `listing_access` (0 rows, 5 policies);
`story_views`, `story_reactions` and `story_comments` (all 0, the story layer is
built and unused).

---

## 4. The i18n truth

### 4.1 Why the home page grid mixes Yoruba and English, exactly

The founder's report is correct and I have reproduced its cause precisely.

The grid is `apps/web/src/components/app/home/MarketTiles.tsx`, rendered by
`app/(app)/home/page.tsx`. Line 27 reads `const copy = t.home.markets;` and line
32 prints `copy[market.key]` as the tile name, with a count line built from
`copy.listingOne` and `copy.listingMany` on lines 34-40.

Read from the raw, unmerged dictionaries, `home.markets` is:

| key | en | yo | ha | ig |
| --- | --- | --- | --- | --- |
| label | Browse by market | Ṣàwárí ọjà | Bincika kasuwanni | Chọgharịa ahịa |
| rent | Rent | Yá | Haya | Mgbazinye |
| buy | Buy | Rà | Saya | Zụta |
| **shortlet** | Shortlets | **Shortlet** | **Shortlet** | **Shortlet** |
| hotel | Hotels | Hotẹ́ẹ̀lì | Otal | Họtel |
| **villa** | Villas | **Villa** | **Villa** | **Villa** |
| apartment | Apartments | Fláàtì | Falat | Flat |
| restaurant | Restaurants | Ilé oúnjẹ | Gidan abinci | Ụlọ nri |
| office | Offices | Ọ́fíìsì | Ofis | Ọfịs |
| land | Land | Ilẹ̀ | Fili | Ala |
| **listingOne** | {count} listing | **absent** | **absent** | **absent** |
| **listingMany** | {count} listings | **absent** | **absent** | **absent** |

So there are two distinct causes on the same grid, and only one of them is a
missing key.

**Cause one: two values were translated as English loanwords.** `villa` and
`shortlet` are written out as "Villa" and "Shortlet" in all three Nigerian
locales at `packages/i18n/src/locales/yo.ts:1047-1049`,
`packages/i18n/src/locales/ha.ts` and `packages/i18n/src/locales/ig.ts`. They
are present, typed, and identical to English. No tool can distinguish a
deliberate loanword from an untranslated string, so nothing caught it. This is
the "Shortlet" and "Villa" the founder saw sitting beside "Hotẹ́ẹ̀lì" and
"Fláàtì".

**Cause two: `listingOne` and `listingMany` were added to English and never
propagated.** They fall back to English, so the line under every tile reads
"12 listings" in a Yoruba interface.

**The systemic cause of cause two, and it is the important one.**
`packages/i18n/src/locales/fallback.ts` was introduced on commit `776ba64`
("A missing translation can no longer break the build"). Before it, every locale
was typed as the full `Dictionary`, so adding a namespace to English broke the
build until all four files caught up. That was painful and it was also the only
gate. It is now gone: a locale declares `DeepPartial<Dictionary>` and
`withFallback` silently fills the rest from English at module load. **There is
no test, no lint rule and no CI step anywhere in this repository that measures
locale completeness.** I looked: `npm run test` runs vitest per workspace, and
`packages/i18n/package.json` declares only a `typecheck` script and no test.
Nothing will ever tell anybody that a key is missing again.

### 4.2 Coverage, measured

Method: `esbuild` bundles a copy of `packages/i18n/src` in which `withFallback`
is replaced by the identity function, so the raw partials can be compared
against English. Nothing in the repository was modified.

| Locale | Leaf keys | Missing vs English | Coverage | Values identical to English |
| --- | --- | --- | --- | --- |
| en | 2,497 | reference | 100% | reference |
| yo | 2,417 | 80 | 96.8% | 93 |
| ha | 2,421 | 76 | 97.0% | 95 |
| ig | 2,417 | 80 | 96.8% | 100 |

No locale has an extra or misspelled key; the type system still catches those.

### 4.3 The missing keys, and they are the same in all three locales

The 76 to 80 missing keys are almost exactly the same set in yo, ha and ig,
which tells you they are the three most recent English namespaces and nobody
propagated any of them.

**`settings.delete.*`, 44 keys.** The entire account deletion surface: the grace
notice, what is destroyed, what is kept, the confirm dialogue, the password and
code labels, the "send code" states, the scheduled and restore states, and all
sixteen blocker strings and their plurals and their calls to action. A Yoruba,
Hausa or Igbo speaker deleting their Vallo account reads the whole flow, including
every legal statement about what is destroyed and what is retained, in English.
This is the newest work in the product (`b5_an_account_can_ask_to_be_deleted`,
applied 19 September) and no locale caught up.

**`landing.face.*`, 25 keys.** `hero.citiesLabel`; all twelve `chips.*` strings
(verified, ai, wallet, one, stays, manage, each with a title and a sub); the four
`app.*` store-badge strings; and seven `footer.*` links including buy, rent,
about us, help and support, terms of service, privacy policy and cookies. So the
landing page's feature chip row, its app band and its footer are English in every
locale. `landing.footer.deleteAccount` is missing too.

**`home.markets.listingOne`, `home.markets.listingMany`**, as diagnosed in 4.1.

**`home.invest.*`, 5 keys**: `eyebrow`, `titleLead`, `titleAccent`, `body`,
`action`. The Invest band on the signed-in home page is English everywhere.

**`counts.*.one`, 4 keys in yo and ig only.** This is NOT a gap and should not be
"fixed". `packages/i18n/src/locales/yo.ts:11-17` explains it: Yoruba and Igbo
have one CLDR plural category, `other`, so `Intl` will never select `one` and a
`one` form would be unreachable. Hausa does not report these as missing because
Hausa does use `one`. This is correct and deliberate.

### 4.4 The values that are English sitting inside a translated dictionary

93 to 100 leaf values per locale are byte-identical to English. About 40 of them
are correct: proper nouns (`Instagram`, `TikTok`, `X`, `WhatsApp`, `SMS`,
`Crypto`, `WiFi`, `TV`, `m²`, `24h`, `7d`, `VALLO SPACES LTD`, `256-bit TLS`),
format strings (`{adults}, {children}`, `{price} {period}`, `{who}, {when}`,
`+{count}`), and the `ltr` direction marker.

The rest are not. **Roughly 55 complete English sentences are shipped inside all
three Nigerian dictionaries.** They cluster by namespace, which means whole
screens were added to English and copied across rather than translated:

- `inspectionsPage.*`: `lede`, `openDescription`, `readFailed`, `emptyBody`.
- `threads.rental.*`: `waitingOnYou`, `offeredByYou`, `declineBody`,
  `proposeBody`. `threads.reservation.cancelBody`.
- `walletSend.*`: fourteen strings including `lede`, `consequence`,
  `sendingBody`, `sentBody`, `failedTitle`, `unreadableBody`, `recipientNone`.
  Every sentence on the send-money screen that explains what happens to
  somebody's money.
- `walletReceive.*`: six, including `where` and both share texts.
- `paymentsPage.*`: fifteen, including `cardsNote` ("Your card number never
  touches Vallo"), `removeCardBody`, `banksNote`, `accountNumberHint`.
- `stayDetail.*`: eight, including `freeUntil`, `minStay`, `maxStay`,
  `noRatesYet`.
- `restaurantPage.*`: four, including the long `hoursUnknown` explanation.
- `stays.tripsNothingAhead`.

A person using Vallo in Yoruba therefore meets an entirely Yoruba wallet home
and an entirely English send-money screen.

### 4.5 The larger gap: user-visible strings that never reached the dictionary

The dictionary has 2,497 keys. I scanned every non-dev, non-test `.tsx` file
under `apps/web/src` for literal JSX text nodes of two words or more, excluding
comments and all-caps tokens. **727 such strings in 167 files.** These can never
be translated by any locale because they are not keys.

| Area | Literal English strings | Worst files |
| --- | --- | --- |
| Public site and legal | 259 | `app/(site)/docs/chapters.tsx` 118, `lib/legal/privacy.tsx` 30, `app/(site)/safety/page.tsx` 17, `lib/legal/terms.tsx` 14 |
| Signed-in product | 185 | `components/app/inspections/InspectionSheet.tsx` 13, `app/(app)/listing/[id]/ReservePanel.tsx` 10, `app/(app)/rent/pay/[inspectionId]/PayPanel.tsx` 9, `app/(app)/checkout/[bookingId]/PayPanel.tsx` 9 |
| Admin console | 78 | `app/admin/social/page.tsx` 8, `app/admin/stops/StopsDesk.tsx` 7 |
| Social | 77 | `components/social/story/StoryComposer.tsx` 8, `components/social/bloom/CreateBloom.tsx` 7, `components/social/profile/ProfileEditor.tsx` 6 |
| Agent console | 50 | `app/agent/list/ListingWizard.tsx` 13, `components/agent/PayoutAccounts.tsx` 8, `app/agent/settings/page.tsx` 8 |
| Host wizard | 46 | `components/host/HostWizard.tsx` 28 |
| Auth | 15 | |

The admin console being English is defensible; an operator can be required to
read English. The host wizard, the listing wizard, the payment panels and the
inspection sheet are not: those are the screens a Nigerian landlord or guest
uses to commit money, and they are hardcoded English regardless of the chosen
language.

### 4.6 Machine-translated placeholders

`packages/i18n/src/locales/yo.ts:4-9` carries an explicit header: "NEEDS NATIVE
REVIEW BEFORE LAUNCH. These strings are functional and carry the correct
diacritics, but marketing copy in particular should be rewritten by a native
speaker rather than translated literally." The Hausa and Igbo files carry the
same warning. `packages/i18n/src/index.ts` also notes that Hausa's compact-number
suffix ("D" for dubu) "sits inside the same native review the locale files are
already waiting on." **No native review has happened.** Every one of the 2,400
strings per locale is unreviewed machine or hand translation by the build.

### 4.7 The recommendation on locales at launch

**Ship English only at launch. Keep the switcher, hide yo, ha and ig behind it
until a native speaker has signed off.**

The reasoning is not the 3 per cent of missing keys, which is a day's work. It is
the combination of three things this audit measured: no native speaker has read
any of the 7,200 translated strings; 55 of them are English sentences sitting in
a Nigerian dictionary where the reader will read them as a fault; and 727
user-visible strings are outside the dictionary entirely, including the payment
panels and the host wizard, so even a perfect locale file cannot produce a
coherent Yoruba product today. Offering a half-translated interface to a Yoruba
speaker in a product whose argument is trust costs more than offering none.

Mechanically: `packages/i18n/src/index.ts:16` is the single line
(`export const LOCALES = ["en", "yo", "ha", "ig"] as const;`) that decides what
the switcher offers and what `Accept-Language` negotiates over. Narrowing it to
`["en"]` hides all three without deleting a single translation, and widening it
again later is one line. Effort S.

If the founder wants a Nigerian language at launch instead, the honest order is:
(1) narrow `LOCALES` to `["en", "yo"]`; (2) close the 80 missing yo keys; (3)
re-translate the 55 English sentences; (4) move at least
`components/host/HostWizard.tsx`, `app/agent/list/ListingWizard.tsx`, both
`PayPanel.tsx` files and `components/app/inspections/InspectionSheet.tsx` into
the dictionary; (5) pay a native speaker to read all of it. That is M to L work
and it is a person, not a build session.

### 4.8 The gate that has to exist afterwards

Whatever is decided, `packages/i18n` needs a test that fails when a locale is
incomplete. It has none today and no CI step could catch this. The test is
twenty lines: import the raw partials, walk English's leaf keys, assert each
shipped locale has every one, and assert no shipped locale value is
byte-identical to English outside a small named allowlist of proper nouns.
Without it this exact fault recurs on the next namespace anybody adds. Effort S,
and it should land before the locales are widened again.

---

## 5. Design system drift and the shape law

### 5.1 The name checks pass, and I confirmed it independently

`apps/web/scripts/check-css-tokens.mjs` runs as part of `npm run lint` and
therefore in CI. Run fresh for this audit it reports: 36 partials bundle
cleanly, zero layer-1 references in stylesheets, zero in components, zero raw
colour literals, zero unresolved `var()` references, zero `var()` references of
the wrong type, zero duplicate declarations, zero comment paths that do not
resolve, zero resting controls edged in a neutral border token, and zero
capsules on a control in stylesheets or in TSX. All ten rules enforced.

Independently: 51 `rounded-full` occurrences remain in TSX and I read the first
thirty. All are avatars (`components/messages/VerifiedAvatar.tsx:159`,
`components/agent/AgentNav.tsx:96`,
`components/app/account/ProfileIdentityCard.tsx:92`), dots, sheet grips, map
pins, progress caps or a wizard step marker whose comment at
`components/agent/ApplyWizard.tsx:414` correctly separates the indicator from
the button around it. No raw `9999px` or `999px` survives in TSX outside three
comments describing their own removal.

**The shape law is genuinely being held.** That is unusual and it should be said
plainly rather than buried.

### 5.2 The ratio test, run statically, and what it found

The law's real test is the drawn radius over the drawn short side. I wrote a
scanner that resolves every `--nf-radius-*` token to pixels, walks every CSS
rule in `apps/web/src/app/**/*.css` plus `packages/design-tokens/src/tokens.css`
that declares BOTH a `border-radius` and a `height` or `min-height`, and reports
the ratio. Thirty-two rules score 0.35 or above.

Twenty-three of the thirty-two are exempt by the law's own text: underline
`::after` bars at 2px, sheet grips at 4px, range tracks at 5.6px, welcome dots
at 8px, and one avatar (`.nf-host-row__avatar`, 48px, `css/catalogue.css:1435`).

The nine that are worth naming:

| Ratio | Selector | File | Verdict |
| --- | --- | --- | --- |
| 17.84 | `.nf-dock-island` (56px, `--nf-radius-pill`) | `apps/web/src/app/css/chrome.css:417` | **CONTESTED.** It is a full circle. Its own comment at line 432 and the allowlist entry at `apps/web/scripts/check-css-tokens.mjs:821` both argue it is the ruling's second exception, a bare icon button. The ruling in `docs/DESIGN_DIRECTION.md` section 1 rule 4 says the second exception is "a BARE ICON BUTTON that carries no text and is drawn round in a governing image, **which today means the landing nav's search glyph and nothing else**". The dock island is not that glyph. Either the law's "and nothing else" is amended in writing, or the island becomes a rounded rectangle. Today the code and the law disagree and the lint rule has been taught to say the code is right. |
| 0.47 | `.nf-switch` | `apps/web/src/app/settings-rows.css:313` | exempt, the law names switch tracks |
| 0.44 | `.nf-detail-tag` (14px on 32px) | `apps/web/src/app/css/catalogue.css:866` | text-bearing, above the "look at it on the running page" threshold of 0.35, below 0.5. Not a capsule, but close enough that the law asks for eyes on it. |
| 0.44 | `.nf-segment__option` (14px on 32px) | `apps/web/src/app/settings-rows.css:395` | same |
| 0.41 | `.nf-nav--drawer .nf-nav__row` (18px on 44px) | `apps/web/src/app/side-nav.css:290` | same |
| 0.41 | `.nf-story__send`, `.nf-enter__back` (14px on 34px) | `apps/web/src/app/social-feed.css:1745`, `:2640` | same |
| 0.39 | `.nf-site-footer-social__link`, `.nf-nav__close`, `.nf-story__card-share`, `.nf-glyph-tile--lg` | four files | same |
| 0.37 | `.nf-feedtab`, `.nf-district__chip` (14px on 38px) | `css/chips.css:174`, `social-feed.css:2400` | same |
| 0.35 | `.nf-admin-chip`, `.nf-agent-bar__search input`, `.nf-landing-pill-seg`, `.nf-glyph-tile`, `.nf-enter__chip`, `.nf-bloom__item` | six files | at the threshold |

**The limit of this measurement, stated plainly.** A static scan can only see
rules that declare their own height. The controls the law was written about are
mostly sized by padding and line height, and those never appear in this table.
`scripts/design/compare-surface.mjs --shape-sweep` is the only instrument that
can see them and it needs a running browser, which this audit could not provide
(section 9). So: no capsule was found, and the class of fault that has broken
this law twice before remains unmeasured on most controls.

### 5.3 Surfaces not yet swept to the reference images

`docs/design/SWEEP.md` is generated by `scripts/design/sweep-register.mjs` from
the route tree and the proofs directory, so it cannot flatter itself. Its count,
which I read but did not regenerate:

- 129 surfaces.
- **49** carry at least one proof taken on the honest harness.
- **20** carry only VOID proofs from the broken harness and must be retaken.
- **60** have no proof at all.

217 PNGs sit under `docs/design/proofs/` across sixteen worker folders. Every
proof taken before commit `c32cd9c` is void by the founder's order. The money
surfaces are the worst covered: `/checkout`, `/checkout/[bookingId]`, `/wallet`,
`/wallet/send`, `/wallet/receive`, `/wallet/transactions`, `/trips`, `/crypto`
and `/crypto/[id]` are all VOID, and `/rent/move-in/[listingId]`,
`/rent/pay/[inspectionId]` and `/bookings/[bookingId]/review` have no proof at
all. Status for the sweep as a whole: PARTIALLY WIRED, 80 of 129 surfaces
unproven.

### 5.4 Raw colour and spacing that escaped tokens

None. `check-css-tokens.mjs` reports zero raw colour literals and zero layer-1
references in both stylesheets and components, and it runs in CI on every push
via `npm run lint`. The seven `DULL_ALLOWED` and two `PILL_ALLOWED` entries are
the complete set of named exceptions, each carrying a written reason.

### 5.5 Components existing in two versions

`BUILD_06_LEDGER.md` section 16.6 records one that is still open and I confirmed
it live: **`agents.verified` was not dropped.** It is now a derived copy of
`agent_badges.verified` and dropping it is a data-losing migration on the stop
list. Two columns, one meaning, kept in step by a trigger. That is the
"components in two versions" case that matters, and it is a database one.

Three smaller duplications, all S:

- `passwordReset` in `lib/email/messages.ts:456` versus
  `supabase/templates/recovery.html`. Two password-reset emails, one job, and
  3.4 cannot tell which is in use.
- The three dead `*Action` wrappers in `lib/business-transfer/actions.ts`
  alongside the three raw functions the UI actually imports (2.2).
- `--nf-radius-control` and `--nf-radius-md` are both 14px and both live, which
  `packages/design-tokens/src/tokens.css:1820` documents as deliberate. Noted so
  nobody "fixes" it.

Nothing else was found. `escrow_open` versus `escrow_fund_from_wallet` (2.4) is
the same shape at the database layer.

---

## 6. Mobile and store blockers

This section stays at the code level. The strategy work is
`docs/research/MOBILE_STRATEGY_RESEARCH.md` and is not duplicated here.

### 6.1 The bundle identifier is consistent, and that window can be closed

`BUILD_06_LEDGER.md` section 9 item 5 raised this as urgent. It is resolved in
the tree. `com.vallospaces.app` appears identically in all seven places:

| Place | Value |
| --- | --- |
| `apps/web/capacitor.config.ts:64` (`appId`) | `com.vallospaces.app` |
| `apps/web/android/app/build.gradle:33` (`namespace`) | `com.vallospaces.app` |
| `apps/web/android/app/build.gradle:36` (`applicationId`) | `com.vallospaces.app` |
| `apps/web/android/app/src/main/java/com/vallospaces/app/` | the package path exists |
| `apps/web/android/app/src/main/res/values/strings.xml` | `package_name` and `custom_url_scheme` |
| `apps/web/ios/App/App.xcodeproj/project.pbxproj:312` and `:333` | `PRODUCT_BUNDLE_IDENTIFIER` |
| `apps/web/public/.well-known/assetlinks.json` | `package_name` |

No trace of `ng.vallo.app` remains. Versions are consistent too: `versionCode
100000` / `versionName 0.1.0` in `build.gradle:54-55`,
`CURRENT_PROJECT_VERSION = 100000` / `MARKETING_VERSION = 0.1.0` in the pbxproj,
both written by `scripts/sync-native-versions.mjs` from `apps/web/package.json`.
`Info.plist` reads both as build settings rather than literals, which is right.

### 6.2 Deep link association files still carry PLACEHOLDER. BLOCKS LAUNCH.

| File | Placeholder | Consequence |
| --- | --- | --- |
| `apps/web/public/.well-known/assetlinks.json` | `PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256_SEE_ANDROIDMANIFEST_XML` and `PLACEHOLDER_REPLACE_WITH_UPLOAD_KEY_SHA256_SEE_ANDROIDMANIFEST_XML` | `AndroidManifest.xml:152` sets `android:autoVerify="true"` for `vallospaces.com` and `www.vallospaces.com`. Android fetches this file at install, fails to match either fingerprint, and App Links verification fails. Every shared listing link opens the disambiguation dialogue or the browser. |
| `apps/web/public/.well-known/apple-app-site-association` | `appIDs: ["PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app"]` | Apple's CDN cannot parse a team id, so Universal Links silently never work. Apple gives no error for this; the link simply keeps opening in Safari. |

Both files are otherwise excellent. The AASA excludes `/auth/*`, `/api/*`,
`/checkout/*`, `/wallet*` and `/trips*` with a written reason for each, and
`apps/web/next.config.ts:175` sets `Content-Type: application/json` on the
extensionless AASA path, which is the detail most teams miss. The only thing
missing from both is a value only the founder can supply: the Apple Team ID and
the two Play signing SHA-256 fingerprints. Status: PLACEHOLDER, S once the
values exist, **BLOCKS LAUNCH** for deep links.

### 6.3 Apple Sign In is not configured. BLOCKS APP STORE.

`apps/web/src/lib/auth/providers.ts:32-33` sets the defaults explicitly: Google
on, because it is configured in the Supabase dashboard and works today; Apple
off, because it needs an Apple Developer team, a Services ID and a key.
`startAppleOAuth` at `lib/auth/actions.ts:659` is built and has no caller.
`apps/web/.env.example` states the rule correctly: "Apple is not optional once
Google is offered: App Store guideline 4.8."

So an App Store submission that offers Google sign-in and not Apple will be
rejected. The code side is one environment variable
(`NEXT_PUBLIC_AUTH_PROVIDERS=google,apple`); the work is the Apple Developer
configuration, which is the founder's. Status: NOT IMPLEMENTED at the product
level, **BLOCKS LAUNCH** for iOS.

### 6.4 Push notifications do not exist. HURTS LAUNCH.

No `@capacitor/push-notifications`, no Firebase, no FCM, no APNs and no web push
in the tree. `apps/web/src/lib/native/` holds six modules (back button, boot,
deep links, external links, keyboard, platform, splash, status bar, theme) and
none of them is push. `apps/web/public/sw.js` contains zero occurrences of
"push". `AndroidManifest.xml:294` documents the absence deliberately:
POST_NOTIFICATIONS is not requested because notifications on this platform are
database rows.

That is honest, and it is also the reason a booking request, an inspection
answer, a message and a refund all reach a person only if they open the app.
Combined with the nine unwired emails in 3.5, several of this product's core
loops have no out-of-app delivery at all. Status: NOT IMPLEMENTED, L,
HURTS LAUNCH badly.

### 6.5 Phone experience: what the code actually does

This is in better shape than the rest of the mobile picture.

- `apps/web/src/app/layout.tsx:201` sets `viewportFit: "cover"`.
- 26 uses of `env(safe-area-inset-*)` across the stylesheets, including the
  dock clearance calculation at `css/chrome.css:112` and the thread composer at
  `css/threads.css:854`, which uses `max()` rather than a bare `calc`.
- Zero CSS rules declare a fixed `width` or `min-width` of 400px or more outside
  a media query. I scanned for them specifically. Nothing assumes a desktop.
- `capacitor.config.ts` sets `KeyboardResize.Native` with a written reason (the
  alternative leaves the submit button behind the keyboard),
  `launchAutoHide: false` so the splash is dismissed by `lib/native/boot.ts`
  once the web layer paints, `webContentsDebuggingEnabled: false` for Android
  release, `limitsNavigationsToAppBoundDomains: false` so payments and OAuth
  open in the system browser, and `cleartext: false`.
- `Info.plist` sets `ITSAppUsesNonExemptEncryption` false with the reasoning
  written out, and `NSAllowsArbitraryLoads` false.

**The one code-level phone risk that is real:** `CAPACITOR_SERVER_URL` is read
at `capacitor.config.ts:52` and, when unset, the `server` block is omitted
entirely and the binary loads `webDir: "native-shell"`, which is the offline
card. The config's own comment says "It is NOT a shippable state". A `cap sync`
run in a shell without that variable produces a binary that shows an offline
card and nothing else. `CAPACITOR_SERVER_URL` is not in `apps/web/.env.example`.
Status: PLACEHOLDER risk, S, and it will bite exactly once, at the worst moment.

### 6.6 Account deletion, verified end to end

Built recently and it holds up. The chain:

`app/(app)/settings/account/page.tsx:32` reads `readDeletionScreen()`, which
never throws. Preconditions come from `public.account_deletion_blockers(uuid)`,
verified live as SECURITY DEFINER raising `insufficient_privilege` unless the
caller is the service role or `auth.uid() = p_user`; seven blocker classes.
`lib/account-deletion/actions.ts` exposes `sendDeletionCode`, `startDeletion`,
`cancelDeletion` and `restoreWithCode`, with re-authentication by password or
emailed code and a typed confirmation phrase (`constants.ts:13`).
`public.open_account_deletion(uuid)` carries the same self-only guard, verified
live. The grace window is 30 days and the purge is `/api/cron/account-purge` at
`15 3 * * *`, on the watch list at `lib/cron/freshness.ts:86`.
`lib/account-deletion/purge.ts` calls `close_future_commitments` before
`purge_account_rows`, so `BUILD_06_LEDGER.md` section 14 is stale and 16.1 is
right. The public page `app/(site)/delete-account/page.tsx` is reachable signed
out, generates every list from `lib/account-deletion/plan.ts`, and carries the
restore form, the one step a banned account cannot do signed in; `plan.test.ts`
checks its promises against the purge migration.

The states-checklist flags this page as "never considers a signed-out reader".
That is a **false positive**: being readable signed out is the entire point, and
the page's own comment at line 19 explains the Play requirement.

**Two real gaps on this path.** First, all 44 `settings.delete.*` strings are
missing from yo, ha and ig (4.3), so the whole flow including every legal
statement is English in three of four locales. Second,
`lib/account-deletion/emails.ts` builds `deletionStarted` and
`deletionCompleted`; I did not trace whether those two send, and record that in
the honesty log.

### 6.7 Other store-facing items

iOS purpose strings are present in `Info.plist` with a written policy generated
against `docs/MOBILE_READINESS.md` section 4. Android permissions are INTERNET
and the two location permissions, with POST_NOTIFICATIONS deliberately absent
(6.4). Store listing URLs are unset and the badges fall back to `/start` rather
than to a dead listing, which is correct. Crash reporting is wired through
`lib/observability/report.ts:110` and `instrumentation.ts`, server side only,
with an allowlist scrubber, and `.env.example` says "SET IT BEFORE THE STORES"
because neither store forwards crash data; **whether `SENTRY_DSN` is set in
production is UNVERIFIED**. The offline shell is `app/offline/page.tsx` plus
`webDir: "native-shell"`.

---

## 7. Security, data and production readiness

### 7.1 Row Level Security: complete

All 102 public tables have `relrowsecurity` true. Three have zero policies,
which is deny-all and correct for each: `idempotency_records`,
`platform_revenue` and `rate_limits`, all reached only through SECURITY DEFINER
functions by the service role (`lib/security/service-rpc.ts`); the advisor
reports them at INFO only. **No newer table has an RLS gap.** Every M1 to M15
table carries policies, from `saved_places` and `account_deletion_requests` at 1
to `reservations` at 7. `relforcerowsecurity` is false everywhere, which only
affects the table owner and is the Supabase norm.

### 7.2 SECURITY DEFINER functions and their grants

The advisor reports 2 functions executable by `anon` and 23 by `authenticated`.
I read the source of the twelve that looked most dangerous.

**Correctly guarded, verified live.** The six `admin_*` functions plus
`set_fee_rate`, `escrow_admin_resolve` and `review_kyc_document` all carry an
internal admin or staff check. `account_deletion_blockers`,
`open_account_deletion` and `business_transfer_board` each take a `p_user uuid`
and refuse unless the caller is the service role or `auth.uid() = p_user`. The
escrow family checks `auth.uid()` as payer.

**One open item, and it is the one the build already knows about.**
`public.verification_is_required(uuid)` still holds its `authenticated` EXECUTE
grant. The revoke is drafted at
`supabase/migrations/pending/20260918150300_b5_verification_is_required_is_not_a_client_call.sql`
and was parked because revokes are on the build's stop list. Nothing in
`apps/web` calls it over PostgREST. Any signed-in user can ask, for any uuid,
whether that person is a seller, landlord or agent. Small, real, one line to
close. Status: PARTIALLY WIRED, S, HURTS LAUNCH.

**One low-grade write exposure worth a decision.** `public.enter_place(text)` is
SECURITY DEFINER, executable by `authenticated`, and does not check
`auth.uid()`. It creates an `areas` row for a local government code. It is
bounded: 774 LGAs exist and an existing area is returned rather than recreated,
so the worst case is a signed-in user creating up to 774 area rows that a
moderator then has to pause. Not a breach; a spam surface. Status: UNVERIFIED as
to whether it is intended, S.

**Two anon-executable functions.** `agent_trust(uuid)` and `platform_stats()`.
Both are deliberate: `BUILD_06_LEDGER.md` section 16.2 records the grant on
`agent_trust` as intentional, and `platform_stats` feeds the public landing
page. `platform_stats` returns four integers and never a row, so an anonymous
caller learns nothing search would not tell them. Its problem is truthfulness,
not exposure (1.2.5).

### 7.3 Rate limits on anything that costs money or sends mail

Comprehensive and verified. `lib/security/money-limits.ts` defines thirteen
`MoneyAction` buckets and `guardMoney` is called at nineteen sites:

`lib/wallet/actions.ts` at 177, 315, 436, 719, 956, 1167, 1344 and 1479;
`lib/payments/methods-actions.ts:176`,
`lib/payments/bank-accounts-actions.ts:135` and `:169`,
`lib/payments/charge-saved-card.ts:92`; `lib/bookings/checkout.ts:353`, `:452`
and `:600`.

Everything BC's queue named is covered: fund, send, withdraw, charge saved card,
checkout. On top of that, `countRouteFailure` with `ROUTE_FAILURE_LIMITS` guards
`/api/paystack/webhook`, `/api/paystack/reconcile` and
`/api/yellowcard/webhook`, and `consume` guards `/api/assistant`,
`/api/support`, `/api/map/listings`, the crypto proxy and
`wallet/send/recipient-action.ts`. The newsletter field at
`lib/site/newsletter.ts` inherits the support desk's limiter rather than
inventing one. The counter lives in Postgres (`consume_rate_limit`), not in
process, so it survives a serverless cold start.

**No mail-sending path is unlimited.** `sendMessage` is reached from the auth
hook (which Supabase itself throttles) and from the Paystack webhook (limited).
The support desk, which is the only user-triggered mail path, is limited.

### 7.4 Error paths that swallow failures

Only three empty `catch {}` blocks exist, all inline boot scripts in
`app/layout.tsx:283`, `:304` and `:326` (theme pre-paint, side pre-paint, data
saver), and swallowing is correct in all three: the page must render if
`localStorage` throws.

The one swallow that produces a wrong screen is
`lib/app/shell-queries.ts:126`, covered at 1.2.3. It is the only instance found.

Elsewhere the discipline is the opposite of swallowing and is worth naming:
`app/api/auth/email-hook/route.ts:180` deliberately returns a non-2xx when a
send fails so Supabase retries, with a comment explaining that this is the one
place an email failure must not be swallowed. `lib/wallet/pots.ts:103` refuses
to log a missing table as a money failure so real incidents are not buried.

### 7.5 Logging personal data

None found. I grepped every `console.*` call in `apps/web/src` for email, phone,
name, address, token, password, BVN and account number and the only hits are
three log lines that contain the words and not the values:
`lib/cron/run.ts:72` (`[cron] <name> rejected: cron_secret_invalid`),
`lib/email/client.ts:134` and `:149` (send failure reason and HTTP status).
`lib/observability/report.ts` passes every event through an explicit allowlist
and then a credential-key vocabulary before anything reaches Sentry.

One live data-protection item remains, and it is already drafted:
`public.message_flags.matched` holds 4 rows. The forward fix
(`20260919101700_b4_a_flag_stops_keeping_the_account_number.sql`) IS applied so
no new row keeps a bank account number. The backfill that masks the existing
rows is parked in `pending/` awaiting the founder's word because it rewrites
data. Four rows. Status: PARTIALLY WIRED, S.

### 7.6 Secrets referenced but never configured

`apps/web/.env.example` is unusually good: it documents every variable, states
what each absence costs, and carries an explicit "NOT WIRED TO ANYTHING YET"
list so nobody configures a dead key. The root `.env.example` is a signpost that
names the eighteen variables a previous root template declared that nothing
reads. I cross-checked the 35 `process.env.*` references in the tree against it.

**Referenced in code, absent from `apps/web/.env.example` entirely:**
`YELLOWCARD_API_BASE`, `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`,
`VALLO_PREVIEW_HARNESS`, `CAPACITOR_SERVER_URL`, `R2_BASE`, `R2_TIMEOUT_MS`,
`NF_DATA_SOURCE` (documented), `VALLO_BUILD`, `VALLO_AUTH_EMAIL_OUT_DIR`. The
first three are a whole payment integration (crypto deposits, see
`CRYPTO_DEPOSITS.md`) that an operator cannot configure from the template. The
fifth will silently produce an unshippable native binary (6.5). Status:
PLACEHOLDER, S.

**Documented, and each absence costs something specific:**
`NEXT_PUBLIC_MAPTILER_KEY` (CARTO's non-commercial basemaps on a commercial
marketplace, a licence breach, and `.env.example` says so in capitals);
`RECONCILE_CRON_SECRET` (all seven cron jobs and reconciliation refuse
everything with 401); `SENTRY_DSN` (no crash data from store builds);
`SUPABASE_AUTH_HOOK_SECRET` (no verification codes);
`COINGECKO_API_KEY`; `NEXT_PUBLIC_NGN_USD_RATE`; `NEXT_PUBLIC_SUPPORT_EMAIL`.
**Which of these are set in Vercel is UNVERIFIED** (section 9).

### 7.7 Content Security Policy

`src/proxy.ts:137` mints a per-request nonce and `withSecurityPolicy` applies it
on every exit path. The matcher at `:241` anchors on asset directories rather
than file extensions, closing a hole its own comment documents: the old rule let
`/checkout/abc.png`, `/listing/abc.png` and `/u/somebody.png` through with no
policy, no nonce, no signed-out gate and no Supabase token refresh.

`CSP_ENFORCE` defaults to reporting rather than blocking, and only the literal
string `true` switches enforcement on. `BUILD_06_LEDGER.md` section 15.10 names
an open worry: "A CSP refusal of Next's own chunks on app-shell routes in
production, which if real means those routes never hydrate for a visitor." So
long as `CSP_ENFORCE` is unset that worry is contained, because a report-only
policy blocks nothing. **If anybody sets `CSP_ENFORCE=true` before that refusal
is understood, app-shell routes stop hydrating.** Status: UNVERIFIED, and it is
a tripwire rather than a current fault.

### 7.8 CI and observability

`.github/workflows/ci.yml` runs on push to main and on pull requests with two
independent jobs: `checks` (typecheck, lint including `check-css-tokens.mjs`,
test, each with `if: !cancelled()` so one red gate does not hide the others) and
`build` (`next build`, deliberately not depending on `checks`, because it is the
only gate that sees a type re-export from a `"use server"` module, the line that
took production down on 19 September). Node 22, cache keyed on the lockfile,
concurrency per ref. This is a good CI file.

**What CI does not have:** no Playwright run (the specs in `apps/web/tests/`
including `csp.spec.mjs` and `signup-i18n.spec.mjs` never execute in CI), no
locale completeness check (4.8), no migration drift check that would have caught
section 3.1, and no shape sweep. Status: PARTIALLY WIRED.

Observability: Sentry through `lib/observability/report.ts`, browser errors via
`/api/client-error`, CSP violations via `/api/csp-report`, cron staleness via
`lib/cron/freshness.ts`, money events via `logMoney`, and `risk_alerts` holds
233 rows so the alerting path is demonstrably live. The gaps are the reconcile
job not being watched (3.3) and `wallets_overdrawn()` having no caller (2.4).

### 7.9 The one dashboard item only the founder can set

**Leaked password protection is disabled** on the Supabase project, confirmed
live by the advisor. It checks a new password against HaveIBeenPwned and refuses
one already in a breach corpus. On a platform holding a naira wallet this is the
cheapest security win available and it cannot be set through the API. One click.

---

## 8. The prioritised list

One ranked table of everything this audit found. Effort is S (under a day), M
(a few days), L (a week or more). Verdict is BLOCKS LAUNCH, HURTS LAUNCH or CAN
WAIT.

| # | What | Where | Why it matters | Effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | `/u/vallo` is claimable by any signed-in user | live `private.validate_social_handle`; fix is `supabase/migrations/20260915090000_the_database_stops_saying_rentme.sql`, unapplied | Anyone can take the platform's own handle and impersonate Vallo. Verified live: the trigger tests only `%rentme%` and `%naijafinds%`, and `private.reserved_handles` has no `vallo` row | S | **BLOCKS LAUNCH** |
| 2 | Live database still says RentMe to users | same unapplied migration; `public.badges` rows `rentme_elite`, `year_one`, `top_contributor`; the handle refusal message | A dead brand on a live profile badge and in a live error message | S | **BLOCKS LAUNCH** |
| 3 | Landing advertises 64 example listings as real supply | `public.platform_stats()`, `lib/platform-stats.ts`, `components/site/landing/CategoryGrid.tsx:96` | 64 of 64 published listings are `is_demo`. The stats band and every category tile count them. Breaks the platform's own honest-counts rule on its most-hit page | S | **BLOCKS LAUNCH** |
| 4 | `assetlinks.json` and AASA carry PLACEHOLDER values | `apps/web/public/.well-known/` | Android App Links verification fails; iOS Universal Links silently never work. Needs the Apple Team ID and two Play SHA-256 fingerprints | S after the founder supplies the values | **BLOCKS LAUNCH** |
| 5 | Apple Sign In not configured while Google is offered | `lib/auth/providers.ts:32`, `startAppleOAuth` uncalled | App Store guideline 4.8 rejection | S in code, M for the founder's Apple setup | **BLOCKS LAUNCH** |
| 6 | Three Nigerian locales are unreviewed and incoherent on screen | `packages/i18n/src/locales/{yo,ha,ig}.ts`; 76 to 80 missing keys each; 55 English sentences inside each; 727 hardcoded strings outside the dictionary | A Yoruba user meets a Yoruba wallet and an English send-money screen. No native speaker has read any of it | S to hide, L to finish | **BLOCKS LAUNCH** (as a decision: hide or finish) |
| 7 | Account deletion flow is English-only in yo, ha and ig | 44 missing `settings.delete.*` keys | Every legal statement about what is destroyed and retained is untranslated. Store-facing | S | **BLOCKS LAUNCH** if locales ship |
| 8 | M6 not applied, so a stay cannot be booked | `supabase/migrations/pending/m06_bookings_extension.sql` | `bookings` has no column for an accommodation. The Stays half of a two-side marketplace cannot take money. `bookings` is empty so applying it risks nothing | S, needs the founder's word | **BLOCKS LAUNCH** |
| 9 | Live schema cannot be rebuilt from the repository | 4 applied migrations have no file; 3 files were never applied | A fresh environment will not equal production. One of the four created a real business row | M | **BLOCKS LAUNCH** |
| 10 | Leaked password protection disabled | Supabase dashboard | One click, on a platform holding a naira wallet | S | **BLOCKS LAUNCH** |
| 11 | `NEXT_PUBLIC_MAPTILER_KEY` unset means a commercial licence breach | `lib/maps/tiles.ts`, `apps/web/.env.example` | CARTO's public basemaps are non-commercial only and this is a marketplace | S | **BLOCKS LAUNCH** |
| 12 | No push notifications anywhere | no plugin, no FCM, no APNs, `public/sw.js` has no push | A booking request, an inspection answer, a message and a refund reach a person only if they open the app | L | HURTS LAUNCH |
| 13 | Nine transactional emails built and never sent | `lib/email/messages.ts`: `inspectionScheduled`, `listingRejected`, `listingApproved`, `newEnquiry`, `withdrawalOutcome`, `escrowFunded`, `escrowReleased`, `verificationRungPassed`, `passwordReset` | With no push either, several core loops have no out-of-app delivery at all | M | HURTS LAUNCH |
| 14 | Nobody receives a welcome email | `lib/email/messages.ts:212`, no sender | First impression of a trust product is silence | S | HURTS LAUNCH |
| 15 | The verified tick can never draw | `lib/app/shell-queries.ts:118` hardcodes `verified: false` | The trust mark is the product's whole argument and the chrome cannot show it | S | HURTS LAUNCH |
| 16 | A failed identity read renders signed-out chrome to a signed-in user | `lib/app/shell-queries.ts:126` | Silent, wrong, and loses the agent and admin nav | S | HURTS LAUNCH |
| 17 | `/reviews` is a 404 behind a labelled row with a real count | `app/(app)/profile/AccountBody.tsx:262` | The only dead internal link in the product | S | HURTS LAUNCH |
| 18 | Reconcile cron is scheduled but not watched | `lib/cron/freshness.ts:69`, `vercel.json` | The only money-recovering job can go quiet without raising | S | HURTS LAUNCH |
| 19 | 80 of 129 surfaces unproven against the references | `docs/design/SWEEP.md`: 60 with no proof, 20 VOID | Every money surface is VOID or unproven: checkout, wallet, send, receive, transactions, trips, crypto, rent pay, move-in, review | L | HURTS LAUNCH |
| 20 | `verification_is_required` still executable by `authenticated` | `supabase/migrations/pending/20260918150300_...sql` | Any signed-in user can learn any user's role | S, needs the founder's word on the revoke | HURTS LAUNCH |
| 21 | No-show cannot be recorded by anybody | `recordNoShow` uncalled; `record_booking_no_show` has no UI | A host has no way to report a guest who did not arrive | M | HURTS LAUNCH |
| 22 | Business verification rungs have no admin surface | four `record*Check` actions uncalled in `lib/admin/business-actions.ts` | The M15 ladder cannot be climbed, so no business can be verified | M | HURTS LAUNCH |
| 23 | No locale completeness gate exists | `packages/i18n` has no test; CI has no check | The exact fault in finding 6 recurs on the next namespace | S | HURTS LAUNCH |
| 24 | `CAPACITOR_SERVER_URL` undocumented | `capacitor.config.ts:52`, absent from `.env.example` | A `cap sync` without it ships a binary that only shows the offline card | S | HURTS LAUNCH |
| 25 | Yellowcard credentials undocumented | `YELLOWCARD_API_*`, absent from `.env.example` | A whole payment integration an operator cannot configure | S | HURTS LAUNCH |
| 26 | Landmarks table empty, seed unapplied | `pending/m08_landmarks_seed.sql`, `landmarks` 0 rows | "near the airport" search resolves nothing | S, needs the founder to approve one page | HURTS LAUNCH |
| 27 | Savings pots documented but non-existent | two unapplied migrations; `lib/wallet/pots.ts`; `app/(site)/docs/chapters.tsx:1295` | The public docs describe a feature the database cannot hold | S | HURTS LAUNCH |
| 28 | `.nf-dock-island` is a circle the shape law does not exempt | `css/chrome.css:417`, allowlisted at `check-css-tokens.mjs:821` | The law says the exception is the landing nav search glyph "and nothing else". Code and law disagree and the linter was taught the code is right | S (amend the law or the CSS) | CAN WAIT |
| 29 | `message_flags.matched` backfill unapplied | `pending/20260919101800_...sql`, 4 rows | Four stored bank account numbers. The forward fix is already live | S, needs the founder's word | CAN WAIT |
| 30 | `wallets_overdrawn()` has no caller | live function, zero references | Nothing ever checks whether a wallet went negative | S | CAN WAIT |
| 31 | `/api/map/listings` unreachable | `app/api/map/listings/route.ts`, 176 lines | Built, rate-limited, fetched by nothing | S (delete or wire) | CAN WAIT |
| 32 | Listing videos have a table and no UI | `addVideo`, `removeVideo` uncalled; `listing_videos` 0 rows | | M | CAN WAIT |
| 33 | Manual payment recovery has no console | `recoverFundingByReference`, `runReconciliationNow` uncalled | Recovery needs a hand-crafted bearer request | M | CAN WAIT |
| 34 | Two password-reset emails, neither provably in use | `lib/email/messages.ts:456` vs `supabase/templates/recovery.html` | Depends on whether the Supabase Send Email Hook is enabled | S | CAN WAIT |
| 35 | Five dangling `docs/MASTER_TODO.md` citations | `checkout/[bookingId]/page.tsx:31` and four others | The rule is implemented; the citation is dead | S | CAN WAIT |
| 36 | Six dead server-action exports | `getMyListings`, `startBookingThread`, `skipInterestsAction`, three `*Action` wrappers in `lib/business-transfer/actions.ts` | Dead code only | S | CAN WAIT |
| 37 | `enter_place` writable by any signed-in user | live SECURITY DEFINER with no `auth.uid()` check | Bounded spam surface, 774 possible rows | S | CAN WAIT |
| 38 | `agents.verified` duplicates `agent_badges.verified` | live | Two columns, one meaning, held in step by a trigger. Dropping is data-losing | S, needs the founder's word | CAN WAIT |
| 39 | Playwright specs never run in CI | `apps/web/tests/*.spec.mjs`, `.github/workflows/ci.yml` | `csp.spec.mjs` and `signup-i18n.spec.mjs` exist and are never executed | M | CAN WAIT |
| 40 | `VALLO_PREVIEW_HARNESS` undocumented | `lib/preview-harness.ts:46` | Gate is correct; only the documentation is missing | S | CAN WAIT |

### 8.1 Founder must do

Nothing on this list can be done by a build session. Each needs a decision, a
credential or an account only the founder holds.

1. **Enable leaked password protection** in the Supabase dashboard (item 10).
2. **Supply the Apple Team ID** and the **two Play App Signing SHA-256
   fingerprints** for the association files (item 4).
3. **Set up Apple Sign In**: Apple Developer team, Services ID, key, then enable
   the provider in Supabase (item 5).
4. **Decide the locale question**: hide yo, ha and ig at launch, or fund a
   native-speaker review. Either answer unblocks; no answer blocks (item 6).
5. **Give the word on four parked migrations**: M6 (item 8), the M8 landmark
   seed (item 26), the `verification_is_required` revoke (item 20), the
   `message_flags` backfill (item 29).
6. **Buy the MapTiler key** before money moves through the deployment (item 11).
7. **Confirm the production environment**: is `SENTRY_DSN` set, is
   `RECONCILE_CRON_SECRET` set, is `SUPABASE_AUTH_HOOK_SECRET` set, and is the
   Supabase Send Email Hook actually enabled in the dashboard (7.6, 3.4).
8. **Confirm the Vercel plan carries seven cron jobs** (3.3).
9. **Answer the three deletion rulings** still open in `BUILD_06_LEDGER.md`
   section 9 item 6: the anonymous-host event, the orphaned business, the
   retained pseudonymised report.
10. **Decide whether the shape law's "and nothing else" is amended** for the
    dock island, or the island becomes a rectangle (item 28).

### 8.2 Build session must do, in this order

1. Apply `20260915090000_the_database_stops_saying_rentme.sql` and probe it as
   its own footer instructs (items 1 and 2). This is first because it is the
   only finding that is exploitable today.
2. Filter `is_demo` out of `public.platform_stats()` and out of the landing's
   category tally, and let a zero print as no claim (item 3).
3. Reconcile the migration ledger: write files for the four applied-with-no-file
   migrations, and either apply or move to `pending/` the three files that were
   never applied (item 9).
4. Derive `verified` in `lib/app/shell-queries.ts` and stop returning GUEST from
   its catch (items 15 and 16).
5. Fix or redirect `/reviews` (item 17).
6. Add `paystack-reconcile` to `WATCHED_JOBS` (item 18).
7. Write the locale completeness test in `packages/i18n` and wire it into
   `npm run test` (item 23). Then, on the founder's answer, either narrow
   `LOCALES` to `["en"]` or close the 80 missing keys and the 55 English
   sentences (items 6 and 7).
8. Document `CAPACITOR_SERVER_URL`, `YELLOWCARD_API_*` and
   `VALLO_PREVIEW_HARNESS` in `apps/web/.env.example` (items 24, 25, 40).
9. Wire the nine unsent emails, starting with `inspectionScheduled`,
   `listingApproved` and `listingRejected`, and send a welcome (items 13, 14).
10. Draw the two missing admin surfaces: the business verification rungs and the
    no-show control (items 21, 22).
11. Take the 60 missing proofs and retake the 20 VOID ones, money surfaces first
    (item 19).

---

## 9. Honesty log

Everything below is something this audit could not verify, with the reason. No
claim in sections 1 to 8 rests on any of it.

1. **No commit SHA is recorded.** The brief forbids running git, so this
   snapshot is dated rather than pinned. A build session was pushing to main
   throughout, so some findings may already have moved.
2. **`npm run typecheck` and `npm run test` could not be run meaningfully.**
   `node_modules/@vallo/` does not exist in this sandbox, so every import of
   `@vallo/i18n` fails to resolve and the run produces cascading TS2307 and
   TS2532 errors. That is an environment artefact, not a repository fault: CI
   runs `npm ci`, which creates the workspace links. I therefore cannot state
   whether main typechecks or passes its tests today. `BUILD_06_LEDGER.md`
   section 4 records 1,903 tests passing at the last committed gate.
3. **`next build` was not run**, for the same reason. The CI file makes it an
   independent job precisely because it is the only gate that sees certain
   faults, so its result is not knowable from here.
4. **No browser was available**, so `scripts/design/compare-surface.mjs
   --shape-sweep` could not run. Section 5.2 is a static scan and can only see
   controls whose CSS rule declares its own height. Controls sized by padding
   and line height, which is most of them, are unmeasured. This is the exact
   class of fault that has broken the shape law twice.
5. **No screenshot was taken.** Nothing in section 5 is argued from a rendered
   surface. The light theme and the 1536px desktop remain unaudited for colour,
   as `BUILD_06_LEDGER.md` section 15.10 already states.
6. **Vercel project environment variables could not be read.** The project
   `read-it-well-web` (`prj_WAF4HD9tdWZiPXiQD16BYT5g36QC`) returned 404 for
   `filter_project_envs` under the team this session can see. So every
   statement about what is or is not configured in production is UNVERIFIED and
   is written as a question for the founder.
7. **The Vercel plan is unknown**, so I cannot say whether seven cron jobs are
   permitted (3.3).
8. **Whether the Supabase Send Email Hook is enabled is unknown.** The MCP
   surface does not expose auth hook configuration. This decides whether ten
   files in `supabase/templates/` are live or dead and whether
   `verificationCode` ever sends (3.4).
9. **`deletionStarted` and `deletionCompleted` senders were not traced.**
   `lib/account-deletion/emails.ts` builds them; I did not confirm a call site.
   They are excluded from the nine unsent emails in 3.5 because I did not check.
10. **The four migrations applied with no file were not reconstructed.** I
    confirmed by name that no file matches and that
    `first_first_party_venue` appears in no `.sql` in the tree. I did not dump
    the live schema to work out what each one did.
11. **The 727 hardcoded strings were counted by pattern, not by eye.** The
    scanner matches JSX text nodes of two words or more starting with a capital,
    excluding comments and all-caps tokens. It will over-count some proper nouns
    and brand names and will under-count strings passed as props. The order of
    magnitude is right; the exact figure is not load-bearing.
12. **RLS policy CORRECTNESS was not tested, only presence.**
    `BUILD_06_LEDGER.md` section 11.1 records that the probe tool cannot see
    RLS and that every earlier probe claiming it did is suspect. I counted
    policies per table and read no policy bodies. A table with four policies can
    still have a wrong one.
13. **No live write was performed anywhere.** Every database statement in this
    audit is a SELECT against `pg_catalog`, `information_schema`,
    `supabase_migrations` or a product table's counts. No row was created,
    changed or deleted, and no personal data was read or reproduced.
14. **`docs/research/MOBILE_STRATEGY_RESEARCH.md` was not read**, so section 6
    may overlap it. That was the brief's instruction and the risk is duplication,
    not contradiction.
15. **The 106 preview pages were not individually reviewed.** They are gated out
    of production by a tested guard (1.6) and reviewing them would have been
    volume rather than density.
