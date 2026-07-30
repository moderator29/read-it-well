# Dead Ends: a systematic hunt for half loops

Branch `integration/rentme-next`. Audited against the working tree, 31 applied
migrations under `supabase/migrations/` (37 tables), 267 TypeScript files under
`apps/web/src`, 49 routes.

**Freshness.** A parallel session was writing to this tree throughout the audit,
so every finding is stated as of the last check. The most likely thing to have
moved on by the time you read this is B2: as I finished,
`apps/web/src/app/(app)/checkout/[bookingId]/` had appeared containing only
`HoldCountdown.tsx`, with no `page.tsx` and still nothing importing
`lib/bookings/checkout.ts`. Re-verify B2, B3 and S4 before acting on them. B1,
B4, B5, B6 and every S and M finding were untouched by that work.

## Honest summary

The two defects found by accident were not isolated. They are the house style of
this repository: a module is written completely, carefully, with a good doc
comment, and then nothing imports it. I found **28 instances**, of which **6 are
blockers**, **12 serious** and **10 minor**.

The single most important finding is not on the original list. **No code path
anywhere grants the `admin` or `super_admin` role.** Both signup triggers insert
`'user'`, the only role write in application code inserts `'agent'`, and the
admin console is the sole gate that can approve an agent or move a listing to
`PUBLISHED`. Search reads only `PUBLISHED`. So the supply loop cannot start at
all, and every downstream loop that was carefully wired to write against real
rows has no real rows to write against. That is the root of the "zero listings"
condition, and it is one `insert` away from being fixed.

Two things the reader should know about timing, because they change the shape of
this report:

1. **Work landed underneath this audit.** Between my first file listing and my
   last check, a parallel session created `lib/bookings/checkout.ts`,
   `lib/bookings/settlement.ts`, `lib/payments/money.ts`,
   `lib/payments/references.ts`, `lib/agent/bookings-{schema,queries,actions}.ts`,
   `lib/agent/earnings-queries.ts` and
   `supabase/migrations_pending/booking_pay_from_wallet.sql`. These target
   exactly the two known gaps. They are real and they are good. **None of them
   is reachable from any page yet**, so at this moment they reproduce the defect
   one layer higher up rather than closing it. I have reported the tree as it
   stands, not as it is about to stand.
2. **`docs/HANDOFF.md` section 8 is materially stale in both directions.** It
   says agent listings CRUD and the admin console are "NOT BUILT" (both exist),
   that `/saved` is a "Static grid" (it is fully wired), and that "there is
   still no Resend integration anywhere in the codebase" (there are seven
   message builders and five live send sites). Please do not use section 8 as
   the completion record. I have flagged each disagreement below.

One clarification, because getting it wrong would waste your time: a table with
no application write is **not** automatically a gap. Ten of them are written
only by triggers, security-definer functions or the signup path, which is
correct and intended. Those are listed and cleared in the final section, with
the reason. The distinction I applied is **reachability**, not authorship: a
writer that exists but that no user action can ever reach is a dead end even
though `grep` finds a writer.

Counts: **6 BLOCKER, 12 SERIOUS, 10 MINOR.**

---

## Blockers

A core loop cannot complete.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| B1 | **Nothing ever grants the `admin` or `super_admin` role.** Both signup triggers hardcode `'user'`; the only role write in application code inserts `'agent'`. No migration, no script, no doc, no seed grants either admin role. | `supabase/migrations/20260728151133_identity_core.sql:81` and `supabase/migrations/20260730013143_signup_trigger_identity_metadata.sql:55` both `insert into public.user_roles ... values (new.id, 'user')`. Only role write in app code: `apps/web/src/lib/admin/actions.ts:300`, `{ role: "agent" }`. Gate: `apps/web/src/lib/admin/guard.ts:56-59` requires `super_admin` or `admin`. | Nobody can enter the admin console. Since `apps/web/src/lib/admin/actions.ts:393-400` is the only writer of `PUBLISHED` and `apps/web/src/lib/listings/supabase-repository.ts:312` reads only `PUBLISHED`, no listing can ever go live and no agent application can ever be approved. The catalogue is permanently empty. |
| B2 | **Payment initiation is orphaned.** `startCardCheckout` and `payWithWallet` are complete and imported by nothing, so a guest is never offered a way to pay. | `apps/web/src/lib/bookings/checkout.ts:294` (`startCardCheckout`) and `:454` (`payWithWallet`). No file outside `lib/bookings/` and `lib/payments/` imports `bookings/checkout`. `apps/web/src/lib/bookings/actions.ts:149` inserts the booking and stops. | A guest reserves, and no charge is ever created. `public.transactions` and `public.ledger_entries` now have writers (`lib/bookings/settlement.ts:185`, `:214`) reachable through the Paystack webhook at `apps/web/src/app/api/paystack/webhook/route.ts:18`, but the webhook can only settle a charge that something created, and nothing creates one. No booking can take money. |
| B3 | **`confirm()` still has no caller, and neither does the new host console.** | `apps/web/src/lib/bookings/actions.ts:350` (`confirm`). The only imports from that module are `reserve` at `apps/web/src/app/(app)/listing/[id]/ReservePanel.tsx:6` and `cancel` at `apps/web/src/app/(app)/bookings/MyBookings.tsx:8`. The replacement, `acceptBooking` and `declineBooking` at `apps/web/src/lib/agent/bookings-actions.ts:163` and `:209`, is imported by nothing. `apps/web/src/app/agent/bookings/page.tsx` is still 11 lines of `AgentComingSoon`. | No booking can move `PENDING` to `CONFIRMED`. A guest's request is received and can never be answered. |
| B4 | **The Google and Apple sign-in buttons are wired to nothing.** They carry no `onClick`, sit in no form and have no `action`. The completed action that would drive them is imported nowhere. | `apps/web/src/components/auth/AuthPanel.tsx:250`: `<button key={p.id} type="button" disabled={!configured(p.id)} className="nf-auth-row">`. `startOAuth` at `apps/web/src/lib/auth/actions.ts:208` has no importer; `signInWithOAuth` appears only inside it. | The buttons are disabled only while unconfigured (`apps/web/src/lib/auth/providers.ts:47-50`). The moment `NEXT_PUBLIC_AUTH_PROVIDERS` lists `google`, the button becomes enabled and clicking it does nothing at all. The front door breaks silently on the day the keys land. |
| B5 | **Agent identity documents never leave the browser, and the reviewer is shown a count that is always zero.** | `apps/web/src/components/agent/ApplyWizard.tsx:61-68` turns each chosen file into a `URL.createObjectURL` blob held in local state. No storage upload. The insert payload at `apps/web/src/lib/agent/application.ts:117-136` carries no document reference. `public.agent_documents` (`supabase/migrations/20260728152104_agents_core.sql:90`) has no writer in code or SQL. Yet `apps/web/src/lib/admin/queries.ts:324` selects `agent_documents ( id )` and `apps/web/src/app/admin/agents/page.tsx:88-94` renders `documentCount`. | An applicant uploads ID front, ID back and business registration, sees previews, and submits. Nothing is stored. The reviewer opens the application and is told there are zero documents, forever, so no agent's identity can ever actually be verified. |
| B6 | **The wallet-payment RPC is called by name but its migration is not in the applied set.** | `apps/web/src/lib/bookings/checkout.ts:380` calls `caller.rpc("pay_booking_from_wallet", ...)`. The function is defined only in `supabase/migrations_pending/booking_pay_from_wallet.sql:41` and `:208`, a directory outside `supabase/migrations/`. | Even once B2 is wired, paying for a stay from the wallet fails at runtime against the live database, because the function does not exist there. |

---

## Serious

A real user hits a dead end.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| S1 | **Business applicants are silently filed as individuals and their company details discarded.** | `apps/web/src/components/agent/ApplyWizard.tsx:26` and `:130-147` offer an individual/business toggle; `:174-175` collect `businessName` and `rcNumber`. `apps/web/src/lib/agent/application.ts:121` hardcodes `type: "individual"`, and the payload at `:117-136` omits `business_name` and `business_rc`, both of which `apps/web/src/lib/admin/queries.ts:324` selects. | A company completes a business application, and its registered name and RC number vanish between the browser and the database. It is then reviewed and approved as an individual. |
| S2 | **The booking notification sends the host to a coming-soon page.** | `supabase/migrations/20260729112606_notifications.sql:81` and `:96` write `href` `'/agent/bookings'`. That route is `apps/web/src/app/agent/bookings/page.tsx`, 11 lines rendering `AgentComingSoon`. | A host is notified "New booking request", taps it, and lands on "This part of the agent workspace is being built". |
| S3 | **`public.reviews` has no writer, and a control promises otherwise.** | Table at `supabase/migrations/20260728152458_engagement.sql`, insert policy at `:109`. Reads only: `apps/web/src/lib/listings/supabase-repository.ts:218` (rating aggregates) and `apps/web/src/lib/profile/queries.ts:76` (a review count on the profile). No insert anywhere in code or SQL. Compounded by `apps/web/src/components/app/bookings/BookingsTabs.tsx:97-103`, a control labelled "Leave a review" that is a `Link` to `/listing/${b.listingId}`. | A guest finishes a stay, taps "Leave a review", arrives at the listing page and finds nothing to review with. Every real listing shows no rating for ever, and the profile's review count is permanently zero. |
| S4 | **An approved agent has no way to be paid and no way to see earnings.** | `public.payout_accounts` (`supabase/migrations/20260728152104_agents_core.sql:100`) has no writer in code or SQL. Bank details collected by the wizard land on `agent_applications` columns instead (`apps/web/src/lib/agent/application.ts:131-133`) and are never promoted on approval (`apps/web/src/lib/admin/actions.ts:283-305` writes only `agents` and `user_roles`). `apps/web/src/app/agent/earnings/page.tsx` is an 11-line stub, and the new `apps/web/src/lib/agent/earnings-queries.ts:98` (`readAgentEarnings`) is imported by nothing. | Money can in principle arrive in the ledger and no agent can ever see it or withdraw it. |
| S5 | **The listing calendar never blocks a booked night.** | `apps/web/src/lib/bookings/queries.ts:32` reads `availability` for the blocked-dates calendar. Every writer is unreachable or nearly so: `apps/web/src/lib/bookings/actions.ts:417` sits inside the uncallable `confirm()` (B3), and `apps/web/src/lib/bookings/settlement.ts:64` is reachable only through the webhook that nothing feeds (B2). `apps/web/src/lib/bookings/actions.ts:281` and `apps/web/src/lib/agent/bookings-actions.ts:278` delete rows that were never written. | Two guests are shown the same nights as free. The GiST exclusion constraint still prevents the double booking, so the second guest gets a late conflict message at the moment of reserving instead of seeing the date greyed out. |
| S6 | **The whole hybrid inventory layer is unreachable, and two switches read only from it.** | `apps/web/src/lib/inventory/index.ts` is imported by nothing; `http.ts`, `mapping.ts`, `providers/amadeus.ts` and `providers/places.ts` are imported only from inside that directory. `providers/places.ts:155` is the sole writer of `public.places_cache`, so that table has no reachable writer. The `hybrid_hotels` and `hybrid_restaurants` flags (`supabase/migrations/20260729112643_feature_flags.sql:30-31`) are read only at `inventory/index.ts:94` and `:183`. | Partner hotel and restaurant inventory can never appear. Three provider keys and two kill switches advertise a capability that is not connected to the app. |
| S7 | **Seeded notifications are presented as real, unlabelled, to every signed-out visitor.** | `apps/web/src/components/app/NotificationsList.tsx:35-80` hardcodes "Booking confirmed / Lekki Palm Grove Shortlet is locked in", "Your wallet is ready" and three more. No sample marker anywhere in the component, unlike `apps/web/src/app/agent/dashboard/page.tsx:64-66`, which does label its seed. | A visitor who has never booked anything is told a booking is confirmed and that their wallet is ready. |
| S8 | **A hardcoded unread count on a route that cannot be opened.** | `apps/web/src/components/agent/AgentNav.tsx:26`: `{ href: "/agent/messages", ..., badge: 3 }`. `apps/web/src/app/agent/messages/page.tsx` is an 11-line stub. | Every agent sees three unread messages permanently, and tapping through reaches a placeholder. The badge can never clear. |
| S9 | **The public landing page advertises inventory counts that are hardcoded.** | `apps/web/src/components/site/landing/NumbersBand.tsx:15-19` hardcodes Listings 17, Cities 6, rendered with a `+` suffix. 17 is exactly the size of the seed catalogue. Meanwhile `apps/web/src/lib/platform-stats.ts:22` deliberately returns `null` to avoid publishing invented counts, and that module is imported by nothing. | The marketing page claims 17 listings while the database holds none. The deliberate refusal in `platform-stats.ts` is undercut by the component that actually renders. |
| S10 | **The assistant sidebar never reads back a persisted thread.** Known and documented; still open. | `apps/web/src/app/api/assistant/route.ts:395-431` writes `ai_conversations` and `ai_messages`. `apps/web/src/components/app/assistant/threads.ts` reads only `localStorage` (`nf_ai_threads`). Nothing selects those tables. | History vanishes on a new device or after clearing storage, though the rows exist. Matches `docs/HANDOFF.md` section 8 feature 12. |
| S11 | **Abuse controls are not applied to the booking or money surfaces.** | `consume` (`apps/web/src/lib/security/rate-limit.ts:151`) is called only from `apps/web/src/app/api/assistant/route.ts:6-11` and `apps/web/src/app/api/support/route.ts:3-8`. No booking or wallet action rate limits anything. | Reserve, cancel, fund, withdraw and transfer are unthrottled. Mitigating, and the reason this is not a blocker: wallet writes are idempotent at the database level on the unique `reference` column (`supabase/migrations/20260728202225_wallet.sql:57`, honoured at `apps/web/src/lib/wallet/ledger.ts:91`). |
| S12 | **A complete second wallet deck is dead, taking three exported actions with it.** | `apps/web/src/components/app/wallet/WalletActions.tsx` is imported by nothing, and it is the only caller of `requestDeposit` (`apps/web/src/lib/wallet/actions.ts:576`), `requestWithdrawal` (`:590`) and `requestTransfer` (`:634`). The live page renders `./WalletDeck` (`apps/web/src/app/(app)/wallet/page.tsx:12` and `:64`), which uses `fundWallet`, `withdraw` and `transferToUser`. `getStatement` (`:528`) is imported by nothing. | Roughly 200 lines of forms and three server actions are unreachable. The doc comment at `WalletDeck.tsx:28-29` claims withdrawals "re-read the statement"; they do not, they call `router.refresh()` (`WalletDeck.tsx:244`), which happens to give the right result, so the behaviour is fine and the comment is wrong. |

---

## Minor

Cosmetic or internal.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| M1 | `public.saved_searches` has no writer and no UI offers saving a search. | `supabase/migrations/20260728152458_engagement.sql:59`. Zero references in `apps/web/src`. No "save this search" control exists. | Unbuilt feature with no promise made to the user. Schema is ahead of the product, which is harmless. |
| M2 | The `notification_kind` value `'system'` is never written. | Enum at `supabase/migrations/20260729112606_notifications.sql:12-20`. Writers cover `booking`, `message`, `wallet`, `support` in SQL and `agent`, `listing` in `apps/web/src/lib/admin/actions.ts:323` and `:442`. | An unused enum value. No user impact. |
| M3 | The "Offers" filter can never match anything, and the signed-in inbox has no filters at all. | `apps/web/src/components/app/NotificationsList.tsx:22` defines an `offers` chip; no notification kind maps to it. `apps/web/src/app/(app)/notifications/LiveNotifications.tsx` renders no filter chips. | Signing in silently removes the filter row, and one chip is decorative. |
| M4 | A raw NUL byte is embedded in source, which makes the file invisible to text tooling. | `apps/web/src/lib/security/rate-limit.ts:99`: `` return `${bucket}\x00${subject}`; `` with a literal U+0000. `file` reports `data`; ripgrep, grep and GitHub code search all skip the file as binary. | The intent (a collision-proof cache-key separator) is sound, but writing it as a literal control byte rather than `\x00` means this file drops out of every code search. It is exactly how an audit misses a file, and it did so on my first pass. |
| M5 | Dead modules with no importer. | `apps/web/src/components/app/MomentScreen.tsx`; `apps/web/src/components/app/messages/MessageThread.tsx` (superseded by `apps/web/src/app/(app)/messages/[id]/ThreadView.tsx`, whose own comment at `:5-9` still says the composer "adopts" the server path "once the messaging backend is connected", which it now is); `apps/web/src/lib/assistant/protocol.ts`; `apps/web/src/lib/mode.ts` (only `mode.constants.ts` is imported, at `apps/web/src/components/agent/ModeSwitcher.tsx:6`); `getMyListings` (`apps/web/src/lib/agent/listings-actions.ts:657`), unused because `ListingsWorkspace` reads through `lib/agent/listings-queries.ts` instead. | Dead weight and a stale comment that misdescribes live behaviour. |
| M6 | Environment drift in both directions against `apps/web/.env.example`. | Read by code, absent from the file: `NF_DATA_SOURCE` (the switch that selects seed versus live repositories, the single most consequential setting in the app) and `SUPPORT_MODEL` (`ASSISTANT_MODEL` is documented, this one is not). Declared but read by nothing: `NEXT_PUBLIC_MAPTILER_KEY` (the map uses Carto tiles), `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (funding redirects to hosted checkout, so only the secret key is read), `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `SENTRY_DSN`, `TERMII_API_KEY`. | An operator can set six keys that change nothing, and can miss the one switch that decides whether the app serves seed or live data. `NODE_ENV` and `VERCEL_URL` are platform-provided and correctly absent. |
| M7 | Three maintenance functions exist with no schedule, two of them undocumented. | `private.release_stale_booking_holds()` (`supabase/migrations/20260729172828_stale_hold_release_fn.sql:11`), documented in `docs/HANDOFF.md` section 7. Not documented: `private.purge_rate_limits()` (`supabase/migrations/20260730013645_rate_limits_and_idempotency.sql:146`) and `private.purge_idempotency_records()` (`:360`). `pg_cron` is not installed. | Abandoned holds never expire, and `public.rate_limits` and `public.idempotency_records` grow without bound once traffic starts. |
| M8 | The `bookingConfirmed` email is defined and effectively unsendable. | `apps/web/src/lib/email/messages.ts:175`. Sent at `apps/web/src/lib/bookings/actions.ts:422-434`, inside the uncallable `confirm()`, and from the webhook path gated behind B2. | A guest never receives a confirmation email. Follows from B2 and B3, listed separately so it is not lost when those are fixed. |
| M9 | The public contact form never persists, although a working ticket action exists. | `apps/web/src/app/(site)/contact/ContactForm.tsx:19-22` sets local state only. `apps/web/src/lib/support/actions.ts:91` (`fileSupportTicket`) already handles anonymous visitors through the service role and would serve it directly. | Minor only because the copy is honest before and after submitting (`ContactForm.tsx:68-72` and `:75-82`). Nobody is misled; there is simply a finished write path sitting one import away. |
| M10 | The coming-soon pages present a seeded agent identity with no sample marker. | `apps/web/src/components/agent/AgentComingSoon.tsx:27` calls `getAgentRepository().getProfile()`, which returns `SEED_PROFILE` (`apps/web/src/lib/agent/repository.ts:16-24`): "Demo Agent", status `APPROVED`, `verified: true`. Unlike the dashboard, this surface renders no sample label. | Any visitor to one of the seven agent stubs sees the workspace chrome addressing them as an approved, verified agent. |

---

## Correct by design, do not fix

Everything below looked like a gap under a naive `grep` and is not one. I checked
each and cleared it.

**Tables with no application write, correctly.**

- `public.rate_limits` and `public.idempotency_records`. Written only by
  security-definer functions: `consume_rate_limit`
  (`supabase/migrations/20260730013645_rate_limits_and_idempotency.sql:113`),
  `claim_idempotency` (`:237`), `record_idempotency_result` (`:269`) and
  `release_idempotency` (`:307`), reached through the single narrow door at
  `apps/web/src/lib/security/service-rpc.ts:88-95`. Client grants are
  deliberately revoked at `:62` and `:196`. A table written only through a
  security-definer function is not a dead end; here it is the point.
- `public.notifications`. There is no client insert policy anywhere, by design.
  Rows come from `private.notify` via triggers
  (`supabase/migrations/20260729112606_notifications.sql:79-96`, `:130`,
  `:167-171`; `20260729172743_wallet_notify_failures.sql:26-43`;
  `20260729112624_support_tickets.sql:66`) and from the service role at
  `apps/web/src/lib/admin/actions.ts:321` and `:440`.
- `public.states` and `public.amenities`. Reference data seeded by migration and
  read-only at runtime (`apps/web/src/lib/agent/application.ts:112`,
  `apps/web/src/lib/agent/listings-queries.ts:284`,
  `apps/web/src/lib/listings/supabase-repository.ts:141` and `:151`).
- First `public.profiles` and `public.user_roles` rows. Created by the signup
  trigger (`supabase/migrations/20260728151133_identity_core.sql:78-83`;
  `20260730013143_signup_trigger_identity_metadata.sql:38-57`), not by
  application code. Note that B1 is about the *absence* of an admin grant, not
  about this trigger, which is correct.
- `public.message_flags`. Written by the `private.scan_message` trigger and only
  reviewed from the app (`apps/web/src/lib/admin/actions.ts:56` and `:67`).
- `conversations.last_message_at`. Bumped by the message trigger, never by
  application code.
- `public.booking_state_events`. Genuinely written, at
  `apps/web/src/lib/bookings/actions.ts:274` and `:404`,
  `apps/web/src/lib/bookings/settlement.ts:242`.
- `wallet_balances`. A view, not a table. The reads at
  `apps/web/src/lib/wallet/actions.ts:101`,
  `apps/web/src/lib/wallet/ledger.ts:108` and
  `apps/web/src/lib/wallet/repository.ts:182` are correct; the balance is
  derived and never stored, which is the intended invariant.

**Exports with no external caller, correctly.**

- `deleteAccount` (`apps/web/src/lib/profile/actions.ts:223`) and
  `updateProfile` (`:82`). This is the form-wrapper pattern, not an orphan:
  `deleteAccountAction` (`:252`) and `updateProfileAction` (`:127`) are the
  `useActionState` wrappers the UI imports, and each delegates to the inner
  function in the same file.

**Placeholder pages that are not dead ends.**

- All seven agent stubs (`analytics`, `bookings`, `earnings`, `messages`,
  `reviews`, `settings`, `verification`, each 11 lines) render inside the
  workspace chrome with an honest message and a way out, rather than a 404.
  `apps/web/src/components/agent/AgentComingSoon.tsx:8-14` states the reasoning
  explicitly. They are gaps in feature completeness, correctly reported in
  `docs/HANDOFF.md` section 8 features 15 and 16, and they are *not* navigation
  dead ends. Two of them are nevertheless implicated in findings above, for
  reasons independent of being stubs: `/agent/bookings` because a notification
  points at it (S2), and `/agent/messages` because a hardcoded badge points at
  it (S8).
- `apps/web/src/app/(app)/assistant/page.tsx` is 16 lines because it is a thin
  server shell over a client component, not because it is unfinished.
- `apps/web/src/lib/platform-stats.ts:22` returning `null` is a deliberate
  refusal to publish invented inventory counts, documented in
  `KNOWN_GAPS.md`. The module being unimported is untidy rather than defective.
  The actual problem is S9, the component that hardcodes numbers instead.
- `apps/web/src/app/(site)/contact/ContactForm.tsx` not persisting is honest and
  says so before you type. Recorded as M9 only because a finished write path
  exists.

**Links.** Every internal link resolves. I extracted all 39 static `href`
strings, all 39 object-form `href` values and all 14 template `href`
expressions, and checked each against the 49-route inventory. There are no
broken links and no 404s anywhere in the app. The only link-shaped defect is S2,
where the target route exists but renders a placeholder.

**Admin surfaces.** `admin/flags` and `admin/switches` are not duplicates:
`flags` is the message-safety queue
(`apps/web/src/app/admin/flags/page.tsx:20`) and `switches` is the
feature-flag kill switch board (`apps/web/src/app/admin/switches/page.tsx:18`).

**Wallet idempotency.** Not a gap despite `withIdempotency` having looked
orphaned earlier in the audit. It now has a caller
(`apps/web/src/lib/bookings/checkout.ts:459`), and independently of that, wallet
writes are idempotent at the database level on the unique `reference` column.

---

## Things that surprised me by being complete

Worth recording, because `docs/HANDOFF.md` section 8 understates all four and
someone may otherwise rebuild them.

1. **`/saved` is fully wired.** Section 8 feature 11 says "Static grid". In fact
   `apps/web/src/app/(app)/saved/page.tsx` reads `public.saved_items` through
   `apps/web/src/lib/saved/queries.ts`, with a cookie mirror so a guest's
   hearts survive signing in, and `toggleSave`
   (`apps/web/src/lib/saved/actions.ts:41`) has seven call sites.
2. **The admin console and agent listings CRUD both exist.** Section 8 features
   15 and 16 say "NOT BUILT". There are eight admin pages, eight admin server
   actions with audit-log writes, and nine listing actions including a photo
   quality gate. The only reason none of it functions is B1.
3. **The transactional email layer is real.** Section 8 feature 19 says "there
   is still no Resend integration anywhere in the codebase". There are seven
   message builders in `apps/web/src/lib/email/messages.ts` and live sends from
   reserve, cancel, the Paystack webhook, wallet withdrawal and support ticket
   filing, all wrapped in `bestEffortEmail` so a mail failure never rolls back
   a committed write.
4. **The rate limiter is durable, not in-memory.** Section 8 feature 12 calls it
   "in-memory per server instance". It is Postgres-backed through
   `consume_rate_limit`, with an in-process cache used only to skip work the
   database has already done and never to invent a denial
   (`apps/web/src/lib/security/rate-limit.ts:88-99`).

## Suggested order

B1 first and alone. It is a single `insert into public.user_roles` for the
owner's operations account, and until it exists nothing downstream can be tested
with real data, including every fix below it. Then B6 (move the pending
migration into `supabase/migrations/`), then B2 and B3 together with the pages
that call the modules a parallel session has just finished, then B4, then B5.
S2, S8 and S3 are each a few lines and remove the three places where the product
actively promises something it cannot do.
