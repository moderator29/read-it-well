# Discovery B: systems, money, trust and operations

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

Agent B of 3, read-only discovery for the visual-redesign session. Written 18
September 2026 against the working tree at `/home/user/read-it-well` (HEAD
`b9b0eab1`, "ledger: the showcase, the spine, and the ten pitches taken") and
the live Supabase project `uccixoonmbhrnyczyigt` (Postgres 17), queried through
`list_tables` and SELECT-only `execute_sql` over `information_schema`,
`pg_catalog`, `pg_policy`, `pg_extension` and `storage.buckets`. No DDL, no
DML, no git command was run. This file is the mission's only output.

A build session (Build 05, the two-side platform) is pushing to main
concurrently. This snapshot reflects the tree as pulled today, after the Build
05 commits `bb36563`, `a8fad5b`, `70c98d9` and `b9b0eab1` had landed. The
build's own ledger (`docs/archive/BUILD_05_LEDGER.md`) and brief
(`docs/archive/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`) were read in full;
`docs/research/TWO_MODE_BACKEND_RESEARCH.md` and
`docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md` were mined and their
claims re-verified live where this file relies on them.

Status vocabulary used on every item: EXISTS AND WORKS, EXISTS BUT INCOMPLETE,
PARTIALLY CONNECTED, FRONTEND ONLY, BACKEND ONLY, MOCK-DEMO, PLACEHOLDER,
NOT IMPLEMENTED, UNCLEAR.

One headline number up front, because the earlier research is already stale on
it: the live database now holds **94 public base tables** (live count this
session), up from the 75-table census taken earlier today. The Build 05
migrations M1 to M5 and M7 to M15 are applied and live; M6 (the bookings
extension and the `listing_id` relaxation) is drafted in
`supabase/migrations/pending/` and is NOT applied, on the founder's gate.

---

## 1. Technology architecture

### 1.1 Monorepo layout

npm workspaces (root `package.json`, name `vallo`, "Nigeria-first property
marketplace"). Node >= 20.9 required.

- `apps/web` (`@vallo/web`): the entire product. Next.js App Router.
- `packages/design-tokens`: the token system (Agent C's territory; noted here
  only as a workspace member consumed as `@vallo/design-tokens`).
- `packages/i18n` (`@vallo/i18n`): dictionaries for four locales (`en`, `yo`,
  `ha`, `ig` in `packages/i18n/src/locales/`), plural rules, `formatMoney`,
  locale negotiation.
- `supabase/`: `config.toml`, `migrations/` (the applied history plus a
  `pending/` folder), `templates/` (auth email HTML: confirmation,
  email-change, invite, magic-link, recovery).
- `scripts/`: build helpers (`build-scene-manifest.mjs`,
  `sync-native-versions.mjs`, probe scripts under
  `scripts/probes/` per the ledger).

### 1.2 Framework versions (from `apps/web/package.json`)

Next `^16.2.12`, React `^19.2.0`, TypeScript `^5.7.3`, Tailwind `^4.1.14`
(via `@tailwindcss/postcss`), zod `^4.4.3`, `@supabase/ssr` `^0.12.3`,
`@supabase/supabase-js` `^2.110.9`, Leaflet `^1.9.4`, Capacitor `^8.5.0`
(app, browser, core, keyboard, splash-screen, status-bar plugins), vitest
`^3.0.5`, `playwright-core` (used for headless probes, not a test suite),
eslint 9 with local rules in `apps/web/eslint-rules/`. No UI component
library, no client state manager, no CSS-in-JS: hand-built components on
tokens. Build 05 baseline: typecheck, lint, test (49 files, 1484 tests) and
build all exit 0 at `66f168b`.

### 1.3 Supabase usage

- **Auth**: GoTrue via `@supabase/ssr`; session refreshed in
  `apps/web/src/middleware.ts` on every request. Custom auth emails leave
  through the Send Email Hook route (`app/api/auth/email-hook/route.ts`),
  signed with `SUPABASE_AUTH_HOOK_SECRET`.
- **RLS posture**: 94 of 94 public base tables have RLS enabled
  (live-verified this session). The four `private`-schema tables
  (`reserved_handles`, `released_handles`, `view_salts`, `daily_notes`) have
  RLS disabled and the Supabase advisor flags this as critical; it is item 4
  on the ledger's "needs the founder" list. Whether the `private` schema is
  exposed through PostgREST was not verified this session; the advisor's own
  wording assumes exposure. UNCLEAR at that level, and it must be resolved:
  if `private` is in the exposed schema list, those four tables are readable
  and writable with the anon key.
- **`private` schema**: roughly 185 functions (full inventory read live),
  holding every SECURITY DEFINER money function
  (`wallet_balance`, `transfer_between_wallets`, `pay_booking_from_wallet`,
  `escrow_settle`, `reserve_room_nights`, `release_room_nights`,
  `refund_and_cancel_booking`), every guard trigger, every `notify_*`
  fanout, the safety scanners (`scan_message`, `scan_post`, ...), catalogue
  projection triggers, and RLS helper predicates (`has_role`,
  `in_conversation`, `owns_business`, ...).
- **Cron**: 8 pg_cron jobs, derived from migrations (the live `cron.job`
  read was denied this session; see honesty log). Names still carry the old
  brand: `rentme_release_stale_holds` (every 15 min, booking hold TTL),
  `rentme_purge_rate_limits` (hourly), `rentme_purge_idempotency` (daily),
  `rentme-nightly-badges`, `rentme_announce_completed_stays`,
  `rentme-daily-note`, `rentme_escrow_sweep_timeouts` (hourly),
  `rentme_reconcile_payments` (hourly at :47).
- **Vault**: live (`supabase_vault` extension installed). Two secrets are
  read by `private.request_money_reconciliation()`: `rentme_site_url` and
  `rentme_reconcile_secret`, used with `pg_net` to POST to
  `/api/paystack/reconcile` from inside the database.
- **Storage buckets** (live): public: `accommodation-photos`, `avatars`,
  `listing-photos`, `social-covers`; private: `agent-documents`,
  `host-documents`, `listing-videos`, `message-attachments`, `social-media`.
  Policies follow an owner-folder pattern (`storage.foldername(name)[1] =
  auth.uid()`), with admin SELECT on the document buckets and
  path-predicate reads for message attachments
  (`private.attachment_path_access`) and social media
  (`private.social_media_access`). Live-verified via `pg_policy` on
  `storage.objects`.
- **Extensions** (live): postgis, pg_trgm, btree_gist, unaccent (installed
  by M9, confirming the search plan), pg_cron, pg_net, pgcrypto,
  pg_stat_statements, supabase_vault, uuid-ossp.
- **Realtime**: `postgres_changes` subscriptions only, in
  `lib/messages/useRealtime.ts` (open-thread messages and the signed-in
  user's notifications). RLS applies to the change feed; delivery is best
  effort by design.

### 1.4 Capacitor shells

`apps/web/capacitor.config.ts`: the native shell loads the LIVE origin over
https (server URL from the environment) because the app cannot be statically
exported (40 files declare server actions; middleware is the session lock).
`webDir` holds a small branded offline fallback (`native-shell/index.html` and
`tokens.css`). `android/` and `ios/` projects exist;
`src/lib/native/` wires status bar, splash, keyboard insets, hardware back,
and external payment/OAuth handoff. The config's own comment flags the Apple
4.2 web-wrapper rejection risk honestly. Native app identifiers are on the
stop list (founder-owned). Status: EXISTS BUT INCOMPLETE (shells built, store
identity and store submission not).

### 1.5 API route inventory (all of `apps/web/src/app/api`, 8 routes)

1. `api/assistant/route.ts` (1023 lines). The Vallo concierge. POST, SSE
   streaming; talks to the Claude API directly over fetch
   (`api.anthropic.com/v1/messages`, default model `claude-sonnet-5`,
   override `ASSISTANT_MODEL`) with three tools: `search_listings`,
   `compare_listings` (both read the same listing repository the product
   reads, so it can only cite real rows) and `area_intel` (resident posts).
   Auth: requires a session for persistence (`ai_conversations`,
   `ai_messages`); rate limited (`assistant` bucket); answers a graceful 200
   JSON without `ANTHROPIC_API_KEY`. EXISTS AND WORKS.
2. `api/auth/email-hook/route.ts` (194 lines). Supabase Send Email Hook;
   verifies the standard-webhooks signature with `SUPABASE_AUTH_HOOK_SECRET`,
   renders Vallo-branded auth mail (six-digit code, not a link) through the
   Resend client. EXISTS AND WORKS (dark without the secret).
3. `api/csp-report/route.ts`. Open by necessity; receives CSP violation
   reports, answers 204 to everything, dedupes on directive + blocked URL.
   EXISTS AND WORKS.
4. `api/map/listings/route.ts`. Pins for the visible map box; public
   (signed-out browsing is deliberate), PUBLISHED rows only, IP rate limited
   (`map_bounds`). EXISTS AND WORKS.
5. `api/paystack/webhook/route.ts` (636 lines). The money truth. HMAC
   SHA-512 signature verified before anything is persisted; status codes
   are semantic (200 decided, 400 unreadable, 401 unauthenticated, 503
   environment incomplete PLEASE RETRY, 500 unknown write state PLEASE
   RETRY), a lesson paid for with a real lost credit (the file documents
   it). Routes by reference prefix: `rm-fund-` wallet credits, `rm-wd-`
   withdrawal settlement (success, failed, reversed), `rm-book-` booking
   charge settlement. On every owned `charge.success` it upserts
   `payment_methods` when Paystack says the authorization is reusable.
   Writes `audit_log` delivery rows and `[money]` log lines. EXISTS AND
   WORKS.
6. `api/paystack/reconcile/route.ts` (158 lines). Scheduled reconciliation;
   bearer token compared in constant time against `RECONCILE_CRON_SECRET`;
   called hourly by pg_cron through Vault + pg_net (not Vercel cron).
   Compares processor truth against the ledger via
   `lib/wallet/reconciliation.ts` (918 lines). EXISTS AND WORKS.
7. `api/support/route.ts` (472 lines). Support agent, same SSE shape as the
   assistant (`SUPPORT_MODEL`); personal reads run on the caller's own
   RLS-bound client; can file `support_tickets`. EXISTS AND WORKS.
8. `api/yellowcard/webhook/route.ts` (218 lines). Crypto on-ramp webhook,
   HMAC verified, same semantic status codes as Paystack, acts only on
   references this platform generated. EXISTS BUT INCOMPLETE: the whole
   Yellow Card lane is dark until three env vars are set, and `A2-133`
   (verify the settlement currency) is still open.

### 1.6 Server action pattern

Uniform and genuinely enforced: every server action returns the
`ActionResult` envelope (`lib/actions/envelope.ts`: `ok`, `fail`, `validate`,
`formDataToObject`) and starts with `resolveSession()`
(`lib/actions/session.ts`), which answers one of three states: unconfigured
(no Supabase env, the app still renders its signed-out repository mode),
signed-out, or a session with an RLS-bound client. Zod schemas per domain
(`lib/*/schema.ts`); money enters as naira text and becomes integer kobo
exactly once, in the schema. Service-role escalation is confined to named
modules (`lib/wallet/ledger.ts` `getAdminClient`, `lib/wallet/rpc.ts`
`callMoneyRpc`, `lib/security/service-rpc.ts`), with EXECUTE on the money
functions revoked from client roles in the migrations. EXISTS AND WORKS.

### 1.7 Middleware

`apps/web/src/middleware.ts` (244 lines): mints a per-request CSP nonce,
refreshes the Supabase session, forwards the browser's real User-Agent so
`auth.sessions` records the true device (SEC-5; the IP is deliberately not
forwarded), and gates the product on a first-segment allowlist
(`PRODUCT_SEGMENTS`: assistant, bookings, checkout, home, legal, messages,
notifications, profile, saved, settings, stories, wallet, trips, host,
inspections, admin, agent, welcome). Browsing is deliberately open
(`/search`, `/listing`, `/stays`, `/stay`, `/restaurants`, `/restaurant`,
`/around`, `/u`, `/post`). The matcher was rewritten to close a real bypass
(any path ending in an image extension used to skip the middleware
entirely; documented in the file). EXISTS AND WORKS.

### 1.8 Feature flags

`lib/flags.ts` + `public.feature_flags`. Fail-open kill switches: a missing
table, row or config means enabled; they can only turn things OFF in an
incident, with a 30-second in-process cache. Type carries ten keys
(bookings, wallet, messaging, assistant, support, agent_listings,
hybrid_hotels, hybrid_restaurants, social, events). Live table has 8 rows,
all enabled (live-read this session; the two `hybrid_*` rows are absent,
and the code paths they once guarded were removed with the partner engine).
Admin surface: `/admin/switches` flips them; `/admin/flags` is the message
safety-flag queue (a different thing, naming collision worth knowing).
EXISTS AND WORKS.

### 1.9 Environment variable names used in code (names only)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AUTH_HOOK_SECRET`,
`PAYSTACK_SECRET_KEY`, `RECONCILE_CRON_SECRET`, `RESEND_API_KEY`,
`EMAIL_FROM`, `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL`, `SUPPORT_MODEL`,
`YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`, `YELLOWCARD_API_BASE`,
`NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_AUTH_PROVIDERS` (deliberately
unset, owner decision), `NEXT_PUBLIC_NGN_USD_RATE`, `NF_DATA_SOURCE`,
`CSP_ENFORCE`, `NODE_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`.
Plus the two Vault secrets named in 1.3.

### 1.10 Third-party integrations actually wired

- **Paystack** (EXISTS AND WORKS): `lib/payments/paystack.ts` (602 lines):
  initialize, verify, list charges, `chargeAuthorization` (added by Build
  05), webhook signature, transfer recipient, transfer, verify transfer,
  bank list, account resolve. Entry points: wallet actions, booking
  checkout, card setup, bank account resolve, both webhook/reconcile routes.
- **Resend** (EXISTS AND WORKS, dark without key): `lib/email/client.ts`
  (thin fetch, no SDK, never throws), ~24 typed templates in
  `lib/email/messages.ts` and `lib/email/listings.ts` (welcome, verification
  code, password reset, wallet funded, withdrawal outcome and failure,
  escrow funded and released, inspection scheduled, listing approved and
  rejected, verification rung passed, new enquiry, booking requested,
  requested-host, confirmed, arrival details, cancelled, refunded, support
  ticket filed). `bestEffortEmail` can never move money or fail an action.
- **Anthropic** (EXISTS AND WORKS): assistant route, support route, and the
  social bot (`bot_invocations` records every summon with token count and
  kobo cost; `bot_settings` holds the monthly ceiling the summon path
  checks).
- **MapTiler** (PARTIALLY CONNECTED): Leaflet + `NEXT_PUBLIC_MAPTILER_KEY`;
  the key is a founder licensing item (`M-1`) and is not funded, so map
  tiles are the missing half.
- **Yellow Card** (EXISTS BUT INCOMPLETE): full client
  (`lib/payments/yellowcard.ts`, 310 lines: HMAC auth, createCollection,
  webhook parse/verify), gated by `isYellowCardConfigured()`; invisible in
  the product until the three env vars exist. `CRYPTO_DEPOSITS.md` documents
  the merchant application the founder must make.
- **Not integrations**: no Sentry or any APM (the only instrumentation file,
  `instrumentation-client.ts`, exists to stop Zod tripping the CSP), no
  analytics vendor, no SMS (Termii parked), no push service, no LiteAPI or
  Booking.com code in the tree at snapshot (Phase F is future work).

---

## 2. Wallet, money, payments, savings

### 2.1 The ledger core (EXISTS AND WORKS)

`public.wallets` is one row per user with deliberately NO balance column
(table comment live-verified): the balance is derived as credits minus
debits over COMPLETED `wallet_entries` by `private.wallet_balance`, so the
balance can never disagree with the ledger. `wallet_entries` is append-only,
service-role-written, integer kobo, amount always positive, `direction`
credit or debit, UNIQUE `reference` (the idempotency spine), kinds
(live enum): deposit, withdrawal, payment, refund, transfer_in,
transfer_out, escrow_hold, escrow_release, escrow_refund. Statuses PENDING,
COMPLETED, FAILED, REVERSED. A CHECK binds kind to direction. Live counts
today: 1 wallet, 2 entries (the platform is pre-launch).

### 2.2 The flows, end to end

- **Fund** (EXISTS AND WORKS): `fundWallet` (`lib/wallet/actions.ts`, 1380
  lines) mints `rm-fund-<uuid>`, opens hosted Paystack checkout; the webhook
  credits a COMPLETED deposit idempotently on the reference;
  `verifyFunding` + the `FundingVerifier` component on `/wallet` are the
  verify-on-redirect fallback so a missed webhook still credits. Email
  `walletFunded` after the ledger, never instead of it.
- **Withdraw** (EXISTS AND WORKS): `withdraw` posts a PENDING debit hold
  under `rm-wd-<uuid>` (spendable computed under the wallet row lock via
  RPC), resolves the account, mints a Paystack transfer recipient,
  initiates the transfer; webhook settles COMPLETED, FAILED or REVERSED.
  With M12 live there is also `withdrawToSavedAccountSchema` and
  `bank_accounts.recipient_code` is cached, ending the mint-and-discard
  recipient pattern for saved accounts.
- **Send / receive** (EXISTS AND WORKS): `transferToUser` writes both legs
  (`rm-p2p-<uuid>-out` / `-in`) through
  `private.transfer_between_wallets` under lock. Build 05 graduated send
  and receive from sheets to full pages (`/wallet/send`, `/wallet/receive`)
  with the rolling amount odometer and live balance-after-send.
- **Statement / history UI** (EXISTS AND WORKS): `/wallet` (WalletDeck,
  RecentActivity, BalanceCard + BalanceBreakdownSheet),
  `/wallet/transactions` and `/wallet/transactions/[id]` with `Receipt.tsx`
  and share actions.
- **Crypto top-up** (EXISTS BUT INCOMPLETE): `startCryptoDeposit` +
  Yellow Card as in 1.10; invisible until configured.

### 2.3 Escrow: the honest picture (BACKEND ONLY, deliberately unreachable)

The machinery is real and well built: `public.escrows` with an eight-state
machine (INITIATED through RESOLVED) enforced by
`private.escrow_guard_transition`, four purposes (rent_deposit, first_rent,
purchase_deposit, purchase_balance), an audit trigger, an hourly timeout
sweep, a locking `escrow_settle`, ledger legs through the three escrow
entry kinds, and an admin resolution action (`resolveEscrow` behind
`/admin/escrow`). But **nothing routes a user's money into it**:
`holdEscrow` / `releaseEscrow` / `refundEscrow` (`lib/wallet/escrow.ts`)
have no callers in any page or user action (grep-verified), and
`private.pay_booking_from_wallet` debits payer and credits payee in one
transaction with no hold.

The known contradiction is RESOLVED in the current tree, in the honest
direction: `lib/legal/terms.tsx` documents (in a long dated comment) that
the old section 4 escrow promise was removed on 15 September 2026 because
it was a binding contractual promise no money had ever moved under, AND
because holding client funds is CBN-regulated ground the company's own
memorandum deliberately avoids; the live clause now says plainly "We do not
hold your money in escrow". `BalanceBreakdownSheet.tsx` had the word
escrow removed the same day; it now shows Available / Held for you /
Coming to you, computed by `lib/wallet/breakdown.ts` from
escrow-referenced entries, with deliberately no summed total. Rule 30 of
the build ledger ("Escrow is promised nowhere") is holding. For the
redesign: do not draw escrow anywhere user-facing.

### 2.4 Fees and revenue

`fee_rates`: 2 rows, every rate zero by the owner's decision, append-only
(live table comment). `platform_revenue`: append-only, 0 rows.
`private.compute_fee` and `set_fee_rate` exist; `/admin/fees` is the
console ("the engine is built, everything is zero today"). `ledger_entries`
decomposes settled charges (gross = platform + agent + processor), 0 rows.
The platform currently charges nothing anywhere, and copy must say so.
EXISTS AND WORKS (as a zero-rate engine).

### 2.5 Saved cards and bank accounts (M12, landed this build)

- `payment_methods` (EXISTS AND WORKS as storage; PARTIALLY CONNECTED as a
  payment option): token material only (authorization_code, signature,
  last4, bin, exp, email_used), never a PAN; INSERT is service-role only
  from the webhook (`savePaymentMethodFromCharge`); owner may only pick a
  default or soft-delete (single-default enforced by trigger, live).
  `startCardSetup` runs a small hosted charge to mint an authorization
  (rate bucket `card_setup`). `chargeSavedCard`
  (`lib/payments/charge-saved-card.ts`, bucket `card_charge`, 3DS fallback
  that never retries silently) **has no caller yet outside its own
  module**: "pay with saved card" is not wired into checkout or funding at
  snapshot. The `/settings/payments` surface lists and manages both stores.
- `bank_accounts` (EXISTS AND WORKS): user-scoped (unlike agent-only
  `payout_accounts`), resolve-before-save structural
  (`resolved_account_name NOT NULL`; the name is the bank's answer, never
  the person's typing), cached `recipient_code`, soft delete,
  single-default trigger. Flow: pick bank, type number, see resolved name,
  confirm.
- `payout_accounts` (EXISTS AND WORKS): agent settlement, untouched.

### 2.6 Savings: what SAVINGS actually means here

Savings = **savings pots**, and the honest status is EXISTS BUT INCOMPLETE
(shipped code, unapplied schema). Root-level `SAVINGS_POTS.md` specifies
pots as money set aside inside one's own wallet, explicitly earning nothing
(no rate column can even exist, a deliberate regulatory posture). Two
migrations exist in `supabase/migrations/`
(`20260812090000_a_wallet_can_set_money_aside.sql`,
`20260812090100_pots_move_money_under_the_wallet_lock.sql`) but were never
applied to the live project: live-verified, there is no `wallet_pots`
table and the `wallet_entry_kind` enum carries no pot values. The app layer
(`lib/wallet/pots.ts`, `pot-actions.ts` with createPot / moveIntoPot /
moveOutOfPot, `PotsSection.tsx`) detects the missing table and renders
nothing, so the feature is invisible today and lights up the moment the
founder runs the SQL. No other savings feature exists; anything else the
word suggests is aspirational.

### 2.7 Money observability and reconciliation

`lib/payments/observability.ts` writes structured `[money]` log lines;
`lib/wallet/audit.ts` writes money decisions and webhook deliveries to
`audit_log`; `lib/wallet/reconciliation.ts` (918 lines) compares Paystack's
charge list against the ledger hourly (route in 1.5), with
`wallets_overdrawn()` and `stale_withdrawal_holds()` surfaced on
`/admin/payments` and a manual `expireStaleWithdrawalHolds` action.
`lib/wallet/recovery-actions.ts` exists for stuck-money recovery. What is
missing is alerting: nothing reads the logs or `cron.job_run_details`
automatically (A2-121, A2-123). EXISTS AND WORKS, unwatched.

### 2.8 Known money-safety gaps (from RECOMMENDATIONS, still open)

A2-046 no money surface is rate limited (fund, withdraw, transfer have no
bucket; card_setup/card_charge do), A2-052 no per-transaction ceiling,
A2-041 withdraw fallback path, A2-013 no re-authentication before
withdrawal, A2-133 Yellow Card currency check, A2-047 reserve idempotency
(checkout actions have `withIdempotency`; `reserve` itself was flagged).

---

## 3. Bookings and reservations

### 3.1 The booking spine (live shape)

`public.bookings` (0 rows live): guest bookings against a listing, integer
kobo, arithmetic constraint-enforced (nights, subtotal, total), enum
`booking_status` = PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED
(live), GiST exclusion `bookings_no_overlap` on `(listing_id, during)`
where status in PENDING/CONFIRMED. Live triggers this session:
demo-refusal, `notify_booking_change`, `set_updated_at`, and **no
transition-guard trigger**: state legality still lives in application code
and the RPCs. The guard plus the spine's extension to rooms is M6, drafted
in `supabase/migrations/pending/m06_bookings_extension.sql` and NOT
applied (founder-gated: it relaxes `bookings.listing_id` to nullable, the
one non-additive change). `booking_state_events` exists live (append-only
history, 0 rows), written by the settlement RPCs
(`pay_booking_from_wallet`, `record_booking_stay`,
`refund_and_cancel_booking`); the September 16 migrations record a
build-and-revert episode that settled on it as the one history table.
Status of the spine: EXISTS AND WORKS for listing stays; EXISTS BUT
INCOMPLETE for room-type bookings (blocked on M6).

### 3.2 Hold TTL and checkout

`reserve()` (`lib/bookings/actions.ts`) inserts PENDING and holds the
nights; a PENDING booking holds for **48 hours**, swept every 15 minutes by
`private.release_stale_booking_holds` (pg_cron); `HoldCountdown.tsx` draws
the clock on checkout. `/checkout/[bookingId]` with `PayPanel.tsx` offers
exactly two paths: `payWithWallet` (server re-prices spendable, then ONE
database function debits, records the transaction, writes the ledger row,
confirms, appends the state event and closes the nights, all or nothing)
and `startCardCheckout` (PENDING `transactions` row under `rm-book-`,
hosted checkout; settlement belongs to the webhook and
`settleCardPayment` return path, whichever lands first). Both wrapped in
`withIdempotency`. Saved cards are NOT yet a checkout option (2.5).
EXISTS AND WORKS.

### 3.3 Completion, NO_SHOW, cancellation, refunds

- COMPLETED and NO_SHOW are recorded by the host through `recordStay`
  (`lib/agent/bookings-actions.ts`) calling `private.record_booking_stay`
  (legal edges from CONFIRMED only). `notify_booking_change` covers
  completion (guest notified); NO_SHOW deliberately notifies nobody (the
  migration's own comment: it tells nobody new).
  `announce_completed_stays` (cron) posts the social announcement.
- Cancellation: one shared flow for `/bookings` and `/trips` landed in
  `70c98d9` (`cancel()` in `lib/bookings/actions.ts`). Admin cancellation
  with refund: `cancelBookingAsAdmin` + `previewCancellation`
  (`lib/admin/bookings-actions.ts`) through
  `private.refund_and_cancel_booking`; the decision record is
  `booking_refunds` (append-only: what was paid, what went back to the
  guest wallet, what the host kept, why, who decided). Refunds go to the
  wallet only (`cancellation_policies.refund_to = 'wallet'` CHECK).
  Guest-side self-serve policy-priced refunds: not present; cancellation
  policies exist as schema (0 rows) with no pricing engine wired to guest
  cancel. EXISTS BUT INCOMPLETE.
- Stays inventory: `room_inventory` + `private.reserve_room_nights` /
  `release_room_nights` are live and the two-concurrent-taps oversell
  probe passed (ledger section 6, script in `scripts/probes/`). BACKEND
  ONLY until M6 lets a booking row point at a room type.

### 3.4 Restaurant reservations

`public.reservations` (0 rows): party size 1 to 50 at a moment, reuses
`booking_status`, `reservation_is_valid` trigger (first-party PUBLISHED
restaurants only, no past times; M7 added the `business_id` branch and
covers capacity against `service_windows`), `notify_reservation` (Lagos
times; host on request, guest on CONFIRMED/CANCELLED, silent on who
cancelled). Actions: `reserveTable` (bucket `reservation_create`),
`respondToReservation`, `cancelReservation`. `/restaurant/[id]` is the
reservation-first surface (landed `70c98d9`), refusing to guess open-now;
the reservation's chat lives in its thread via `startReservationThread`.
No payment attaches to a reservation, deliberately. EXISTS AND WORKS
(against listing-kind restaurants; `restaurant_profiles` and
`service_windows` are live schema with 0 rows awaiting host onboarding).

### 3.5 Mid-flight at snapshot

Landed: M1 to M5, M7 to M15 applied and probed; stays shells, `/stays`,
`/stays/search`, `/stay/[id]` showcase, `/trips` spine, restaurant page.
Pending: M6 (and the landmark seed `m08_landmarks_seed.sql`) in
`supabase/migrations/pending/`; `lib/stays/queries.ts` (the read layer
over accommodations) explicitly not written yet; the Host onboarding
wizard, `/host/*` console and `admin/businesses` queue (Phase D/E) not in
the tree yet. `/stay/[id]` currently re-exports the listing page and
renders catalogue listings; its `detail-model.ts` is a typed seam waiting
for the stays read layer (its comment says so plainly).

---

## 4. Messaging and notifications

### 4.1 Threads and messages (live shape)

`conversations` (7 rows): two-party (`guest_id`, `agent_id`), nullable
`listing_id`, unique triple, `last_message_at`. Build 05's M10 added
`context_kind` (enum listing / reservation / booking, default listing),
nullable `reservation_id` / `booking_id` FKs, the exclusive-shape CHECK,
partial uniques (one thread per transaction object) and the
`conversation_context_is_valid` party-validation trigger, all live-verified
this session. `messages` (7 rows): NOT NULL `sender_id`, RLS insert
requires sender = auth.uid() AND membership; read-marking goes through the
service role after an RLS membership proof (`markThreadRead`). Policies
live-verified; admins can SELECT all conversations and messages (the
A2-025 privacy concern). EXISTS AND WORKS.

### 4.2 Thread contexts and faces (landed)

`components/app/threads/`: `ThreadContextBanner.tsx` is the single fork
point with three faces: `RentalFace` (inspection card and controls),
`ReservationFace` (state pill), `BookingFace` (steps timeline interleaving
`booking_state_events` at read time; `booking-steps.ts`). Sibling actions
`startReservationThread` and `startBookingThread` exist beside
`startConversation` (which keeps the daily `conversation_new` limiter;
transaction-keyed threads bypass it by construction). The six original
message actions are unchanged. EXISTS AND WORKS.

### 4.3 Attachments, safety, blocking, reporting

- Attachments: `message_attachments` + private `message-attachments`
  bucket, membership-predicate read policy. EXISTS AND WORKS.
- Safety scanning: `private.scan_message` AFTER INSERT files
  `message_flags` (reasons: account_number, payment_keyword) into the
  `/admin/flags` queue; escalation raises `risk_alerts`. The account-number
  flag carries the four-hour review commitment `/standards` publishes.
  EXISTS AND WORKS.
- Blocking: `blocks` (bidirectional invisibility) and `mutes` exist and are
  enforced across the SOCIAL surfaces via `private.block_between` in
  policies. Messaging does NOT consult blocks: the live
  conversations/messages policies contain no block predicate and
  `lib/messages/actions.ts` performs no block check. A blocked person can
  still message. PARTIALLY CONNECTED, and a real gap.
- Reporting: `reports` table, `ReportSheet` component, `report` rate
  bucket, `/admin/reports` queue with `resolveReport`. EXISTS AND WORKS.

### 4.4 Notifications

One table (`notifications`, 10 rows), one primitive (`private.notify`),
written by AFTER triggers and the service role only; RLS select-own;
unread partial index; pruned after 90 days read
(`prune_read_notifications`, cron). Kinds enum: booking, message, wallet,
listing, agent, support, system, social. Trigger inventory (live function
list): message, booking change (INSERT both parties; CONFIRMED both;
CANCELLED both; COMPLETED guest; NO_SHOW deliberately silent),
reservation, inspection change (NEW in M11: every transition now
notifies), wallet entry, payout account, support reply, review, review
response, and the social family (follow, reaction, repost, post, story
events and statuses, badge, bio status, report). Delivery UI:
`/notifications` page with `LiveNotifications` realtime top-up. Known
seam: notification `href` values are Property-side paths; the side-aware
href law (URL wins over cookie) is queued work (MK-67). EXISTS AND WORKS.

### 4.5 Email and push

Email: section 1.10; auth mail through the hook, transactional mail
best-effort after ledger writes. EXISTS AND WORKS (dark without
`RESEND_API_KEY`). Push notifications: NOT IMPLEMENTED. No FCM, no APNs,
no `@capacitor/push-notifications`, no token table; "push identifiers"
is an explicitly parked founder decision. Realtime in-app is the only live
channel besides email.

---

## 5. Inspections

The six-state machine (REQUESTED, CONFIRMED, PROPOSED, DECLINED, COMPLETED,
WITHDRAWN) is live with `guard_inspection_transition` (terminals immutable,
illegal edges raise), `set_inspection_lister`, `freeze_inspection_parties`,
demo refusal, and (new, M11) `notify_inspection_change` on every
transition: live trigger list on `inspection_requests` verified this
session. The additive `outcome` column landed ('inspected', 'deal_done',
'no_deal'), CHECK-bound to COMPLETED and stamped only with that transition.

Surfaces at snapshot (all landed in `a8fad5b`):
- `RequestInspection` on the listing page; `requestInspection` now stamps
  `conversation_id`, so the request and the chat share one row.
- The thread's `RentalFace`: lister answers (confirm, propose, decline) and
  requester accept-proposed, wired to the EXISTING actions
  (`answerInspection`, `acceptProposedTime`, `closeInspection`), so the
  thread and the inspections page cannot disagree.
- `/inspections` (consumer, Property side): Open (REQUESTED, PROPOSED,
  CONFIRMED, with whose-move labelling) and Closed (COMPLETED, DECLINED,
  WITHDRAWN) sections, with the row-just-changed pulse (ledger pitch 8).
- Agent side reads via `readInspectionsForLister`.

Notification gap closed this build; the remaining soft gap is email (only
`inspectionScheduled` exists as a template; other transitions are in-app
only). `inspection_confirmations` (the in-chat "I viewed it" record) is a
separate table and still distinct. Status: EXISTS AND WORKS.

---

## 6. Admin panel (deep walk)

### 6.1 Gating

`lib/admin/guard.ts` `requireAdmin()`: reads the caller's OWN `user_roles`
rows through their RLS-bound client (so the answer comes from the
database, not a cookie), returns one of four states (unconfigured,
signed-out, not-admin as an honest calm refusal, admin with
`isSuperAdmin`). Every admin page and action starts here. Roles: user,
agent, admin, super_admin (`app_role` enum). `admin_bootstrap` (1 row)
grants an elevated role at signup for named emails, admin-readable only.
Middleware additionally requires a session for `/admin`. There is no
admin-specific second factor and no IP allowlist. EXISTS AND WORKS.

### 6.2 The desks, what each reads and can do

Twenty-one destinations under `apps/web/src/app/admin/` (root dashboard
plus twenty). The `QueueFilters` frame (search, enum-derived status chips,
date range, query-pushed pagination) is used by fifteen. Actions live in
`lib/admin/*` and every mutation pairs with an `audit_log` row through
`writeAudit`.

- `/admin` root: the console dashboard.
- `agents`: agent applications with the whole six-step form inline;
  `reviewAgentApplication` (approve, reject, request more info); document
  views via signed URLs.
- `alerts`: `risk_alerts` queue with the `/standards` clock;
  `resolveRiskAlert`. Escalated message flags land here.
- `bookings` (+ `[bookingId]` detail): all bookings, five-status chips from
  the enum; `cancelBookingAsAdmin` with `previewCancellation` (the refund
  preview); reads reservations oversight is planned, not present.
- `escrow`: the dispute queue and state console over `escrows`;
  `resolveEscrow` (the admin resolution RPC). Note: with no user flow into
  escrow, this desk currently governs an empty table. BACKEND ONLY in
  effect.
- `examples`: the demo catalogue as a set (`is_demo` rows, all 64 listings
  today); `retireExampleListings` (`RetireExamples`).
- `fees`: rates (all zero) and revenue; `setFeeRate` appends a row.
- `flags`: the message safety-flag queue (`message_flags`);
  `reviewMessageFlag` (clear or escalate to a risk alert).
- `kyc`: document review grouped by person; `reviewKycDocument`
  (approve/reject a document through `private.review_kyc_document`).
- `listings`: the admission checklist queue; `reviewListing`
  (approve, publish gate, reject, more info).
- `moderation`: the four held-content queues (post, story, story comment,
  bio) with `decideHeldItem` (`HoldDecision`).
- `money`: the money desk. Wallets, ledger search, stuck entries; the
  `MoneyDecisions` component; money actions and escrow resolution are
  ResultSheet-confirmed.
- `payments`: payment and wallet health: overdrawn wallets, stale
  withdrawal holds, `expireStaleWithdrawalHolds` (`SweepHolds`).
- `reference`: the closed vocabularies (749 occupations, 774 LGAs);
  `saveOccupation`, `saveLocalGovernment`.
- `reports`: abuse reports queue; `resolveReport`.
- `social`: Around's console (owner rulings, moderator applications).
- `standing`: hand-granted badges; `grantStandingBadge`,
  `revokeStandingBadge` (the UI distinguishes granted from earned).
- `stops`: agent suspensions; `stopAgentTrading`, `liftAgentStop` (lift is
  an update of four columns on the same append-only-ish row).
- `support`: ticket queue and thread; `replySupportTicket`,
  `setTicketStatus`.
- `switches`: the kill switches (feature_flags), off-only by design;
  `toggleFeatureFlag`.
- Verification rungs: `recordVerificationCheck`
  (`lib/admin/verification-actions.ts`) writes
  `agent_verification_checks` rungs (identity, address, payout,
  in_person); tier is derived, never set by hand. The business twin
  (`business_verification_checks`, rungs identity, registration, payout,
  on_site) is live schema awaiting its console.

### 6.3 Audit logging reality

`public.audit_log` (482 rows live) is append-only in the strongest sense:
UPDATE, DELETE and TRUNCATE are revoked from every client role AND refused
by trigger for all roles (three live triggers verified). Writers: every
admin action through `writeAudit` (best-effort AFTER the mutation commits,
so a log failure cannot roll back a decision), the money paths through
`recordMoneyAudit`, and webhook deliveries through
`recordWebhookDelivery`. Reads: admin SELECT policy exists, but there is
**no audit log viewer page** in the console. Known gap A2-036: opening an
identity document writes no audit row. EXISTS AND WORKS (writing);
FRONTEND ONLY missing (reading).

### 6.4 What a serious production company still needs (document, not build)

- The `admin/businesses` queue, accommodation publish-gate review,
  restaurant chip and reservation oversight (Phase D/E of the live build,
  specified in the backend research section 7; not in the tree at
  snapshot).
- An audit log viewer, admin action search, and per-admin activity review.
- Admin session hardening: a second factor for staff, shorter sessions, an
  IP story; today an admin is one phished password away.
- A payment-method lookup panel ("which card was charged") on
  `admin/payments`.
- Provider health and kill-switch surfaces for the Phase F partner lane.
- Impersonation tooling deliberately does not exist; support answers from
  RLS-bound reads plus admin SELECTs. Keep it that way, but note A2-025:
  the console currently loads whole private conversations for review.
- No bulk operations, no CSV export of queues, no saved views.

---

## 7. Settings inventory

`/settings` (one page of grouped cards plus subpages), all real:

- **Account**: profile fields (first name, surname, nickname, display
  name, phone), avatar upload (`setAvatar`), social identity card. EXISTS
  AND WORKS.
- **Appearance**: theme (dark default, OS does not override), text size,
  motion; device-local by design. Language is a row here (en, yo, ha, ig;
  cookie-based `lib/locale.ts`). EXISTS AND WORKS.
- **Notifications**: toggles persisted in `profiles.settings` JSON under
  RLS (`AccountNotificationsCard` + `NotificationsCard`). EXISTS AND
  WORKS, but granularity is coarse and there is no per-channel
  (email versus in-app) matrix.
- **Privacy**: toggles in `profiles.settings` (`AccountPrivacyCard` +
  `PrivacyCard`). Known defect A1-004: "Hide my activity" is read by
  nothing. EXISTS BUT INCOMPLETE.
- **Devices / sessions** (`/settings/devices`): real. `public.my_sessions()`
  RPC lists GoTrue sessions (user agent mapped to a fixed browser/platform
  vocabulary; IP and location deliberately absent, and the middleware
  forwards the true UA so rows stop reading "Vercel Edge Functions");
  `endSession` and `endOtherSessions` in
  `lib/security/sessions-actions.ts`. EXISTS AND WORKS.
- **Payments** (`/settings/payments`, landed this build): saved cards
  (webhook-fed, set default, soft delete, add via `startCardSetup`) and
  bank accounts (resolve-verified add flow, default, remove). EXISTS AND
  WORKS.
- **Interests** (`/settings/interests`) and **Place**
  (`/settings/place`: state and LGA). EXISTS AND WORKS.
- **Delete account**: real and immediate (`deleteAccount` signs out, then
  service-role `auth.admin.deleteUser`), gated on the service key.
  EXISTS BUT INCOMPLETE: A2-026 records that deletion has never been
  audited for what it leaves behind (storage objects, ledger references,
  messages), and there is no grace period, no export-before-delete, and no
  deactivate (temporary) option.
- **Sign out**: EXISTS AND WORKS.

Materially missing settings: change email (templates exist server-side;
no surface found; UNCLEAR), change password from inside settings (the
reset flow exists; an authenticated change surface was not found), 2FA
(nothing), login alerts, data export/download (an NDPA right the notice
implies), blocked and muted lists management (blocks exist; no settings
surface found), notification channel matrix, and closing the account of a
host/agent with live obligations (no flow).

---

## 8. Auth and security (architecture level)

### 8.1 Auth flows

Email + password with a six-digit verification code (not a link):
`signUpWithEmail`, `verifySignUpCode`, `resendSignUpCode`,
`completeEmailVerification`, `signInWithEmail`, plus a deliberate
`signup_email_probe` rate bucket on `signUpMethodForEmail`. Password
reset: `requestPasswordReset` (`resetPasswordForEmail`) and
`updatePassword` on `/reset-password`. OAuth: Google and Apple code paths
exist (`startGoogleOAuth`, `startAppleOAuth`) but are OFF unless
`NEXT_PUBLIC_AUTH_PROVIDERS` names them, and the owner's standing decision
(DEPLOY.md) is email-only permanently, with `N-4` (delete the OAuth code)
still open. Status: EXISTS AND WORKS (email); OAuth remnants EXISTS BUT
INCOMPLETE by intention.

### 8.2 Sessions, 2FA

Sessions are GoTrue's, refreshed in middleware, listed and revocable from
settings (7.x). 2FA: NOT IMPLEMENTED (the `factor_*` enums in the live
database are GoTrue's own built-ins, unused by the product). Known opens:
A2-001 (`/reset-password` must require a recovery session), A2-002 (a
password change must revoke other sessions), A2-013 (re-authenticate
before withdrawal or deletion).

### 8.3 Rate limiting inventory

Durable fixed-window counters in Postgres (`rate_limits`,
`private.consume_rate_limit`), fail-open by explicit design, purged
hourly. Buckets found in code: `assistant`, `support_ticket`,
`contact_form`, `conversation_new`, `reservation_create`, `report`,
`map_bounds` (IP), `signup_email_probe`, `card_setup`, `card_charge`, and
the social family (`social:post`, `post-day`, `reply`, `edit`, `mark`,
`repost`, `report`, `block`, `summon-bot`, `propose-area`, `enter-place`,
`join-area`, `apply-moderate`, `social_profile_update`, `social_follow`,
`social_handle_claim`). NOT covered: fundWallet, withdraw, transferToUser
(A2-046). Idempotency: `idempotency_records` + `withIdempotency` wraps
both checkout payment actions; the wallet paths rely on the unique
reference discipline instead.

### 8.4 Input validation

zod 4 everywhere through the `validate()` envelope; schema files per
domain (wallet, bookings, messages, reservations, admin, auth). Naira to
kobo conversion happens exactly once at the schema boundary. Coverage is
broad and consistent; no unvalidated action was noticed in the files read
(not an exhaustive claim).

### 8.5 CSP and headers

Nonce-based CSP minted per request in middleware, applied on every exit;
enforced by default (`CSP_ENFORCE !== "false"` in `lib/security/csp.ts`,
after an enumeration pass; the report endpoint remains). The old
extension-suffix middleware bypass is documented and closed.

### 8.6 Webhook and cross-service authentication

Paystack HMAC SHA-512 verified before any persistence; Yellow Card HMAC
verified; auth email hook standard-webhooks signature; reconcile route
constant-time bearer. All verified in code this session.

### 8.7 RLS and storage posture

94/94 public tables RLS-enabled; policies were spot-checked live this
session on conversations, messages and storage.objects and matched the
research's claims. The four `private` tables without RLS are the one
advisor-critical item (1.3). Storage buckets follow the owner-folder
pattern with admin reads on document buckets.

### 8.8 Known security-shaped open items (headlines from RECOMMENDATIONS)

Money: A2-001, A2-002, A2-013, A2-046, A2-041, A2-052, A2-047, A2-133.
Privacy/NDPA: A2-024 (plaintext bank account numbers), A2-025 (admin
loads whole conversations), A2-026 (deletion completeness), A2-029 (purge
identity documents on rejection), A2-036 (audit on document opens),
A1-004 (dead privacy switch). Operations: A2-141 (no CI), A2-063 (RPC
signature drift), A2-121 (cron failure alerting), A2-123 (money failure
alerting). Areas needing hardening beyond the register: admin second
factor, block enforcement in messaging, per-transaction money ceilings,
and the `private` schema exposure question.

---

## 9. Privacy and personal data map

Never printed here: any actual row of user data. This map is from schema,
policies and code only.

### 9.1 What is collected, by table and bucket

- **Account and contact**: `profiles` (display name, first name, surname,
  nickname, phone, locale, state, LGA, occupation code, interests, signup
  role, settings JSON); `auth.users` (email, password hash with GoTrue);
  `auth.sessions` (user agent as forwarded).
- **Identity and KYC**: `agent_applications` (full name, phone, email,
  residential address, ID type from a closed list including NIN card,
  passport, driver's licence, voter's card, and the **`id_number`**
  itself; business name, RC number, tax id, bank name, account number,
  account name); `agent-documents` bucket (the document images);
  `businesses` (CAC number, TIN, registered name, representative name and
  phone, consents JSON, attestation timestamps); `business_documents` +
  `host-documents` bucket. There is NO BVN column anywhere in the live
  schema (verified by column enumeration); NIN appears only as an ID-type
  choice with its number in `id_number`.
- **Money**: `bank_accounts` and `payout_accounts` (ten-digit NUBAN in
  plain text, A2-024), `payment_methods` (Paystack token, last4, bin,
  expiry, the email the authorization was minted under; never a PAN),
  `wallet_entries` metadata, `transactions` provider refs,
  `booking_refunds`.
- **Communication**: `messages` bodies, `message_attachments` (private
  bucket), `support_tickets` and their threads, `ai_conversations` /
  `ai_messages` (assistant threads, owner-private).
- **Transactional**: `bookings` (guest name, phone, email columns),
  `reservations`, `inspection_requests`, `listing_access` (how a guest
  physically gets in; tightly scoped read policy).
- **Location**: profile state/LGA, listing geography; no device GPS
  collection found.
- **Behavioural**: `post_views` is deliberately privacy-preserving (salted
  daily hash of the viewer, salt rotated at midnight Lagos, previous day
  deleted); `event_attendees` never public by policy.
- **Device**: user agent on sessions, mapped to a fixed vocabulary before
  display; IP deliberately not read back.

### 9.2 Where it flows

Supabase (hosting, eu-west-1 per HANDOFF_01), Paystack (email, amounts,
references, bank details for transfers and resolves), Anthropic (assistant
and support message content plus catalogue rows; personal reads in the
support route run on the caller's own RLS client), Resend (email
addresses, names, amounts in transactional mail), Yellow Card (when
configured), MapTiler (client tile fetches once keyed). No analytics
vendor receives anything today.

### 9.3 Legal pages versus behaviour

`lib/legal/privacy.tsx` names VALLO SPACES LTD as controller (the RentMe
misidentification HANDOFF_01 flagged is fixed in copy; the company was
incorporated 18 September 2026, RC 9870413 per the commit log).
`lib/legal/terms.tsx` no longer promises escrow and states money is not
held (2.3). Public originals live at `(site)/privacy` and `(site)/terms`
with in-product copies under `(app)/legal`.

### 9.4 Retention and NDPA posture (docs/HANDOFF_01_COMPANY.md section 3
and 4, docs/RETENTION_SCHEDULE.md)

The platform is, in HANDOFF_01's own words, a data controller of major
importance under the NDPA 2023. Committed but NOT done: NDPC registration
(pre-launch commitment), annual compliance audit via a licensed DPCO, a
named DPO. `RETENTION_SCHEDULE.md` is a DRAFT awaiting founder and
solicitor approval, and **nothing in the database enforces any retention
period**: the sharpest documented case is a rejected agent applicant whose
identity document and ID number remain stored after the lawful basis
expired (A2-029). HANDOFF_01's readiness table bolds four honest gaps:
retention unenforced, deletion unaudited, logs uninventoried, export not
built. The engineering (RLS, private buckets, signed URLs, salted views)
is ahead of the paperwork. Gaps requiring attention, in order: retention
enforcement, deletion completeness, plaintext NUBANs, admin conversation
access narrowing, the export right, and the notice's NDPC registration
number once issued.

---

## 10. Missing platform capabilities (production expectations)

Tied to what was actually observed:

1. **CI**: none. No workflow files; A2-141 open; the build session runs
   checks by hand. A funded team would gate main on typecheck, lint, test,
   build and type generation (`A2-064`/`P-5`).
2. **Error monitoring / APM**: none. No Sentry, no tracing; errors surface
   as console `[money]` lines and Next error pages.
3. **Alerting**: none. Eight cron jobs run unwatched (A2-121); a failed
   money line alerts nobody (A2-123); `risk_alerts` is a queue somebody
   must open. The reconcile route computes drift hourly and nobody is
   paged on it.
4. **Analytics**: none. No product analytics vendor, no event pipeline;
   `platform-stats.ts` reads live counts for copy; search behaviour,
   funnel, and flip adoption are unmeasurable today.
5. **Support tooling**: the assistant-to-ticket path works and the desk
   exists, but there is no SLA machinery beyond published copy, no inbound
   email to ticket, no macros.
6. **Data export**: not built, for users (NDPA right) or operators (no
   CSV export from any admin queue).
7. **Backups and restore**: Supabase-managed, undocumented, never
   restore-tested (HANDOFF_01's own table says backup handling is not
   documented anywhere).
8. **Push and SMS**: neither exists; the only reach channels are in-app
   realtime and best-effort email.
9. **Operational runbooks**: DEPLOY.md is strong on setup; there is no
   incident runbook beyond the kill switches, and no on-call story.
10. **Booking lifecycle jobs**: hold sweep exists; automatic COMPLETED at
    checkout date and NO_SHOW nudges (MK-14, MK-17) are queued, not built.
11. **Reviews for stays**: `reviews` and `review_responses` exist for the
    listing spine; verified-stay reviews on COMPLETED bookings (MK-59)
    are queued.
12. **The audit viewer** (6.3) and the admin business console (6.4).

---

## Honesty log

- The live `cron.job` read was denied by the user mid-session; the eight
  jobs and their schedules are read from migration files instead, and I
  could not confirm none has been unscheduled since. The Vault secret
  NAMES come from the same migration, not from reading Vault.
- Table count 94 public / 4 private, enum labels, trigger lists on nine
  key tables, policies on conversations/messages/storage.objects, bucket
  list, extension list, feature_flags keys and enabled state, and the
  private-function inventory were all live-verified this session.
  Everything else about the database is from migrations, code or the two
  research files.
- `QueueFilters` is imported by fifteen admin pages (research's grep); I
  did not re-verify the full frame contract page by page.
- I did not read every admin page body; purposes come from each page's
  own doc comment plus the actions inventory, both read this session.
- Whether the `private` schema is API-exposed (which decides how bad the
  four RLS-disabled tables are) was not verified; flagged in 1.3 and 8.7.
- Change-email and in-settings password-change surfaces: I searched and
  found none, but I did not exhaustively walk every settings component;
  marked UNCLEAR in section 7.
- `pending/m06_bookings_extension.sql` was not read line by line; its
  contents are described from the ledger and the backend research.
- NO_SHOW notification silence is from the 20260916 migration's own
  comment; I did not read the current full body of
  `notify_booking_change`.
- No typecheck, lint, test or build was run (read-only mission); baseline
  numbers quoted are the build ledger's own, recorded at `66f168b`.
- KNOWN_GAPS.md at the repo root is partially stale (it still says escrow
  is zero percent implemented and that `booking_status` lacks COMPLETED;
  both are outdated, and terms.tsx's comment says so too). I have relied
  on live checks over that file wherever they disagree.
- No row of personal data was read or reproduced; every SQL query this
  session was against catalogues, `information_schema`, `pg_policy`,
  `storage.buckets` metadata and the `feature_flags` config table.
