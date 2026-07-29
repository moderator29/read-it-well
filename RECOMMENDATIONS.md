# Recommendations

The living backlog required by Master Rule 21. Each entry states the problem, why
it matters, the approach, and the phase it belongs to. Recommendations are not
approved scope.

Last updated: 2026-07-28

---

## Critical before MVP

### R-01. Decide the admin navigation
**Problem.** Four incompatible admin rails across four source-of-truth
references. **Why it matters.** Navigation determines routing, layout shells,
permission boundaries and the entire admin section list. Building against the
wrong one is the most expensive single mistake available right now.
**Approach.** Owner picks one. Reference 04's rail is the only one that looks
purpose built; the others carry consumer leftovers such as Saved Items and
Upgrade to Pro inside a Super Admin rail. **Phase.** Before Phase 3.

### R-02. NDPA 2023 compliance
**Problem.** Nigeria's Data Protection Act is not mentioned in any specification.
**Why it matters.** A Nigeria-first platform processing personal data at scale
has statutory obligations including data controller registration and a
designated protection officer. Registration has lead time measured in weeks.
**Approach.** Legal review now, in parallel with build. **Phase.** Start
immediately, must complete before public launch.

### R-03. Define the commercial model
**Problem.** No commission or take rate exists. Reference 09 shows a guest-paid
service fee but no recipient, and reference 08 offers "zero service fees" to Pro
members. **Why it matters.** Build §16 requires recording gross, platform fee,
agent share, processor charges and net settlement. None of that is computable.
**Approach.** Owner sets the rate and decides whether the service fee is
platform revenue. **Phase.** Before Phase 4.

### R-04. Money as integer minor units, everywhere
**Status.** Already implemented in `packages/i18n` and the listing types.
**Why it keeps its entry.** It must be enforced across the API and database when
those land. A single float column reintroduces the defect.

### R-05. KYC standard for agent payouts
**Problem.** The agent application collects bank and payout details at step 5
with no identity verification standard. **Why it matters.** Paying out to
unverified identities is how marketplaces become money laundering vectors.
**Approach.** BVN or NIN verification during agent onboarding. **Phase.** Before
the first payout.

### R-06. Test suite
**Problem.** No specs exist. **Why it matters.** Master Rule 71 requires tests,
and Master Rule 72 requires end to end coverage of signup, login, listing
approval, booking, payment and agent mode. **Approach.** Start with the auth
flow, since it is the first real business logic. **Phase.** With Phase 1.

---

## Important before launch

### R-07. Content Security Policy
Nonce based, compatible with Next streaming. Other security headers are already
set at the edge.

### R-08. Native review of Yoruba, Hausa and Igbo
Current translations are functional but were not written by native speakers.
Marketing copy especially should be rewritten rather than translated.

### R-09. Accept-Language negotiation
A first time visitor with a Yoruba browser currently gets English.

### R-10. Light theme design pass
Tokens are scaffolded so components stay token driven, but no reference is light
and the theme has had no design review.

### R-11. Device tier degradation ladder
Glass and blur are expensive on low end Android. `.nf-glass` already falls back
to a solid surface without `backdrop-filter`, but a real tier system that also
drops the aurora and the isometric scene detail is needed. Master Rule 52.

### R-12. Add a Request Changes action to admin listing review
The designed screen offers only Approve and Reject. Build §8 mandates
`CHANGES_REQUESTED`, and rejecting a listing over one bad photo is a poor agent
experience that Design §15 explicitly warns against.

### R-13. Replace placeholder listing imagery
Cards currently draw a gradient skyline. Real photography arrives with the media
pipeline and Cloudinary.

---

## Post launch

### R-14. Saved searches with alerts
Already designed in reference 09, including price bands and email toggles, and
listed as a future idea in both specifications. Build the event foundations
early so it is cheap later.

### R-15. Boost and Feature listing
Paid promotion products visible in reference 09 with no specification behind
them. Real revenue potential, needs a product definition.

### R-16. Video, virtual tours and floor plans
The icon set and reference 09's media manager both anticipate them. Out of the
10 photo MVP cap.

### R-17. Airport pickup and car rentals
Consumer entry points in reference 08. The icon family already carries Car
Rental, Taxi, Bus, Train, Flights and Airport, so the expansion path is
anticipated in the assets.

---

## Experimental

### R-18. Multi-currency
The icon pack ships Naira, Dollar, Euro, Pound, Yen and **Cedi**. Cedi is
Ghanaian, which suggests West African expansion was in mind when the assets were
made. `formatMoney` already takes a currency argument, so the formatting layer
is ready.

### R-19. Vector sources for the icon pack
If genuine vector or high resolution sources exist for the 192 icon set, they
would beat hand authoring the remaining glyphs. The `Icon3D` API is designed so
this swap touches no call site.

### R-20. Demand heatmap
Capture search events from the first query so the business can see where users
look before inventory exists there.


---

## Strategy pass, 2026-07-28: 150-item inbox reviewed and accepted

A full product strategy pass produced 150 one-line candidates, now reviewed by
the lead and accepted as the standing idea bank: see
`docs/recommendations-inbox.md`. Items promote into numbered entries here as
they enter scope. Lead's first-tier picks, flagged for the next planning round:

- Pay-by-transfer and USSD as first-class checkout beside cards (NIGERIA 1).
- Power and water disclosure fields on every listing (NIGERIA 2, 3): the two
  questions every Nigerian guest asks first, answered structurally.
- Estate gate access data released after confirmation (NIGERIA 4).
- Detty December seasonal mode with a September diaspora window, plus the
  payer/guest split for book-for-someone-else (NIGERIA 5, 6, 7).
- Total-price-first display and a booking hold countdown that makes the
  database no-double-booking guarantee visible product truth (UX tier).
- Escrow-style payout release after check-in, image perceptual hashing against
  stolen listing photos, and off-platform payment steering detection (TRUST
  tier): these three convert the fraud-bot architecture into a moat.
- Transactional outbox, idempotency keys and a webhook inbox with replay
  (ARCH tier) before the first live payment.
- Naira glyph regression test across all four locales (DESIGN tier): the
  supplied mockups themselves show the N-fallback bug this prevents.

---

## Loop-closure pass (2026-07-29)

Four builder agents are closing the bookings reserve/cancel loop, the wallet
with Paystack, messaging with realtime and the trust scanner, and the
Claude-API assistant, on top of Phase A foundations that just landed
(notifications fan-out, support tickets, assistant threads, feature flags,
storage buckets, rental `price_period`). The twenty recommendations below are
the highest-leverage next moves given exactly that state: mostly hardening
the money and trust loops that are about to carry real value, ahead of growth
work. Each cites the inbox item it promotes where one applies, and names the
actual tables and routes already in the schema.

### R-21. A background job runway before anything time-based ships
**Problem.** At least five recommendations below (booking hold expiry,
webhook queue drainage, payout release, nightly reconciliation, agent payout
account checks) need code to run on a schedule, not on a request. Nothing in
the repository currently runs outside a request or a database trigger.
**Why now.** The bookings and wallet loops closing this week are the first
features whose correctness depends on something happening later, not just on
what a client posts right now. Building each of them against an ad hoc
approach guarantees a rewrite. **Approach.** Enable `pg_cron` (the project
already enables `btree_gist` the same way) and schedule a small set of
Postgres functions directly, with a thin `job_runs` append-only table
(job name, started_at, finished_at, rows_affected, error) written by each job
for observability. Where a job needs to call an external API (Paystack
verification, Amadeus quota checks) rather than only touch Postgres, use a
Supabase Edge Function invoked by `pg_cron` via `pg_net`. This single piece
of infrastructure unblocks R-22, R-23, R-28 and R-29. **Phase.** A.
**Effort.** M.

### R-22. A Paystack webhook inbox with signature verification, dedupe and replay
**Problem.** The wallet loop closing now will fund and withdraw through
Paystack webhooks, and nothing ingests them yet. **Why now.** `wallet_entries`
already gives idempotency at the ledger layer (`reference` is unique), but
that protects the ledger only after a webhook is trusted, parsed and
processed; it does nothing for a forged request, a redelivery racing a slow
handler, or an event that arrives before its booking row exists. Verified
current Paystack guidance: the `x-paystack-signature` header is an HMAC
SHA512 of the *raw* body and must be checked before the body is parsed at
all, requests should be checked against Paystack's published sender IPs, and
because Paystack retries on timeout the recommended shape is to verify, park
the raw event, return 200 immediately, then process from a queue rather than
inline. **Approach.** A `payment_webhook_events` table (`provider`,
`provider_event_id` unique, `signature_valid`, `payload jsonb`, `status`
enum `received/processing/processed/failed`, timestamps), written by the
webhook route handler after HMAC verification against the raw body and
nothing else; the route returns 200 immediately. A job (R-21) drains
`received` rows, upserts into `transactions` and `wallet_entries` using each
row's own idempotency key, and marks the event `processed` or `failed` with
the error captured. This is inbox item 108 and pairs with inbox item 102.
**Phase.** A, must land before the first live payment in Phase B.
**Effort.** M.

### R-23. Auto-release stale PENDING bookings
**Problem.** `bookings_no_overlap` (the GiST exclusion constraint) blocks new
reservations against any listing with a `PENDING` or `CONFIRMED` row for the
same nights. A `PENDING` booking whose payment never completes, because the
guest closes the tab or the transaction fails, holds those nights forever
with nothing that ever moves it out of `PENDING`. **Why now.** The reserve
action is landing this week; the first abandoned checkout will lock real
inventory the same day. **Approach.** A job (R-21) selects
`bookings` where `status = 'PENDING'` and `created_at` is older than the
checkout window (align to Paystack's own transaction expiry, roughly 15 to
30 minutes) and no row in `transactions` for that booking is `SUCCESSFUL`,
then drives it through the same transition the manual cancel action uses: an
update to `CANCELLED`, which the existing `bookings_notify_after_change`
trigger already turns into guest and host notifications, plus a
`booking_state_events` row with `note = 'hold expired'`. No new notification
plumbing needed, only the transition. This is inbox item 181's natural
complement and inbox item 107. **Phase.** B, ships with reserve/cancel.
**Effort.** S to M.

### R-24. A booking hold countdown reading the same expiry contract as R-23
**Problem.** Inbox item 25 asks for a visible countdown once payment starts,
so the database's no-double-booking guarantee reads as a fair race rather
than a silent failure. Built against a hard-coded duration in the UI, it will
drift from whatever window R-23's job actually enforces. **Why now.** Both
land in the same sprint; building them from one source avoids a countdown
that lies. **Approach.** Expose the expiry as a generated value the client
can read directly, either a `held_until` column on `bookings` set at insert
(`created_at + interval` matching R-23's window) or a view computing it, and
drive both the cancel job's `WHERE` clause and the checkout countdown
component from that same column. Render it on the booking detail route and
in the checkout step. **Phase.** B. **Effort.** S.

### R-25. A wallet withdrawal overdraft guard against concurrent debits
**Problem.** `wallet_balances` derives balance as
`sum(COMPLETED credits) - sum(COMPLETED debits)`. A withdrawal or transfer is
correctly inserted `PENDING` first, but a `PENDING` debit does not reduce the
figure a client reads before deciding to withdraw again. Two withdrawal
requests fired close together, or one legitimate retry racing a slow
Paystack Transfer call, can each read a balance that looks sufficient and
both proceed. **Why now.** Fund, withdraw and P2P are all landing at once;
this is the exact class of bug ADR-004's derived-balance design was meant to
prevent, reintroduced one layer up. **Approach.** Wrap the check-then-insert
in the withdraw and transfer server actions inside one transaction that takes
a row lock on the caller's `wallets` row (`select ... for update`) before
computing an "available" figure as COMPLETED credits minus COMPLETED debits
minus any still-PENDING debits for that wallet, and only inserts the new
`wallet_entries` row if it clears. This serialises concurrent debit attempts
on the same wallet without ever storing a balance column. **Phase.** B.
**Effort.** M.

### R-26. Atomic, paired P2P transfer entries
**Problem.** A peer-to-peer transfer needs exactly one `transfer_out` row on
the sender's wallet and one `transfer_in` row on the recipient's, and nothing
today ties the two together beyond both existing. A crash between the two
inserts leaves money that left one wallet and never arrived at the other,
invisible to any single-row check. **Why now.** P2P is explicitly part of
this week's wallet build. **Approach.** Perform both inserts inside a single
Postgres function called under the service role (one round trip, one
transaction), generate a shared `pair_id` once, and derive each entry's
unique `reference` from it (for example `pair_id:out` and `pair_id:in`) so a
client retry with the same idempotency key can never create a second pair.
Statements and CSV/PDF exports (inbox 76, 177) can then join the two sides of
every transfer by `pair_id` instead of guessing from amount and timestamp
proximity. **Phase.** B. **Effort.** S.

### R-27. Idempotency keys on every mutating booking and wallet action
**Problem.** Inbox item 102 names the general risk: mobile networks retry,
and the double-booking guard deserves a double-charging twin. Nigerian
network drops mid-flow are routine (inbox 39), and a retried POST to reserve,
cancel, fund, withdraw or transfer must return the original result, not
create a second one. **Why now.** This is the single control that makes
R-23 through R-26 trustworthy under real network conditions, and all of them
are landing this week. **Approach.** Accept a client-generated
`idempotency_key` on the reserve, cancel, fund, withdraw and transfer server
actions. For wallet actions this can reuse the existing unique `reference`
column directly (the client generates it, the insert is a no-op on conflict,
the original row is returned). For bookings, add a unique
`(guest_id, idempotency_key)` index and return the existing row rather than
raising the GiST conflict a second time. This also gives the typed action
envelope work (inbox 221, 222) a concrete first use. **Phase.** A
groundwork, B for the wired actions. **Effort.** M.

### R-28. Escrow-style agent payout release gated on check-in or inspection
**Problem.** The moment a `transactions` row is `SUCCESSFUL`, nothing stops
the corresponding `agent_share_minor` in `ledger_entries` from being treated
as available to the agent's wallet. Paying an agent before the guest has
actually arrived, or before either side has confirmed the stay is real, is
the single biggest structural weakness a fake-listing operator can exploit.
**Why now.** The wallet withdraw path and the messaging trust migration
(`inspection_confirmations`, already drafted and applying this week) are
closing in the same window; this recommendation is the one place they should
be wired together rather than shipped as two unrelated features. **Approach.**
Add a `payout_available_at` timestamp to `ledger_entries` (or a small
companion `payout_holds` table keyed to `booking_id`), set at settlement time
to 24 hours after `bookings.check_in`. The wallet's available-balance
computation (R-25) excludes any `agent_share_minor` still on hold. A job
(R-21) flips holds to available on schedule; where an `inspection_confirmations`
row already exists for the booking's conversation before the 24-hour mark,
the same job can release early. This is inbox item 55 and 180 turned into a
concrete schema change rather than a slogan. **Phase.** B into C.
**Effort.** M.

### R-29. Nightly ledger and wallet reconciliation with drift alerting
**Problem.** `wallet_entries` and `ledger_entries` are both append-only and
derived, which is the right design, but a derived-balance design is only as
trustworthy as the checks that confirm it never silently drifted from the
processor's own record. **Why now.** Real Paystack money starts moving this
week; every day without a reconciliation job is a day a bug in R-22's ingest
path could go unnoticed. **Approach.** A nightly job (R-21) sums
`wallet_entries` and `ledger_entries` by day, compares the total against
Paystack's own transaction list for the same window via their API, and on
any mismatch writes a `risk_alerts` row and a `system`-kind notification to
admins rather than failing silently. This is inbox item 179. **Phase.** B.
**Effort.** M.

### R-30. Instant wallet refund on cancellation, bank refund as the slower fallback
**Problem.** `transaction_status` already includes `REFUNDED` and
`wallet_entries` already has a `refund` kind with a `credit` direction, but
nothing today triggers either when a booking is cancelled after payment.
**Why now.** Bookings and wallet are closing together this week, and refund
speed is what turns a cancellation into a rebooking instead of churn (inbox
118). **Approach.** When a booking transitions to `CANCELLED` and has a
`SUCCESSFUL` transaction, the cancel action credits the guest's wallet
immediately (`wallet_entries`, `kind = 'refund'`, `status = 'COMPLETED'`,
referencing the original `transaction_id`), while an explicit bank reversal
via Paystack stays the slower opt-in path for guests who want cash rather
than wallet credit. Pair with a plain-language cancellation window on the
listing (inbox 184, rendered as the visual timeline in inbox 66) so the
refunded amount can correctly be full or partial. **Phase.** B.
**Effort.** M.

### R-31. A transaction PIN gate before the first wallet-moving action
**Problem.** The wallet has no second factor of its own; a signed-in session
alone authorises fund, withdraw and transfer. **Why now.** Nigerian phones
are shared and borrowed far more than the implicit Western threat model
assumes (inbox 176), and this week is when wallet actions first move real
value rather than seed data. **Approach.** Require a PIN set-up step the
first time a user reaches `/wallet` with intent to withdraw, transfer or pay
(not to view balance or fund), store only a salted hash server-side, and
verify it inside the same server action that performs the debit, before the
insert into `wallet_entries`. **Phase.** B. **Effort.** S.

### R-32. Verify agent payout accounts against the name on file
**Problem.** Nothing today checks that the bank account an agent supplies
for payout actually belongs to them. **Why now.** Wallet withdraw is landing
this week, and it is the first time an agent's `agent_share_minor` can
actually leave the platform; a payout-name mismatch is the cleanest early
fraud signal available (inbox 192) and R-05's KYC standard has nowhere to
attach without it. **Approach.** Before an agent's first payout, call
Paystack's account-resolve endpoint and compare the returned account name
against the identity on file from R-05's BVN/NIN verification; an exact or
close match clears automatically, anything else routes to a manual entry in
the admin risk queue (R-34) rather than blocking outright, since transliteration
and maiden-name mismatches are common and legitimate. **Phase.** B.
**Effort.** M.

### R-33. A scaling path for realtime beyond `postgres_changes`
**Problem.** `messages` and `notifications` both join the
`supabase_realtime` publication via `postgres_changes`, which is the correct,
simplest choice at current scale but authorises every event against every
subscriber individually. **Why now.** Messaging realtime is landing this
week; verified current Supabase guidance puts the practical ceiling near
3,000 concurrent subscribers on one changefeed before "Broadcast from
Database" (trigger-driven, privately authorised channels, columns chosen per
message rather than the full row) becomes necessary for the same job. **Approach.**
Ship `postgres_changes` now, it is the right call at this size and changing
it today would be premature optimisation. Record the migration path as a
named follow-up gated on a concrete subscriber count (for example, review
before any marketing push that could spike concurrent connections), so the
switch happens on a metric, not a guess. **Phase.** C now, flagged
follow-up before growth work. **Effort.** S to record the plan, M when
executed.

### R-34. Minimal triage queues for the trust signal already being generated
**Problem.** `message_flags` (written by the `scan_message` trigger),
`risk_alerts`, and `support_tickets` all exist and, once messaging and
support ship this week, all three start filling with real rows. No screen
reads any of them; the full admin console (Phase 6) is blocked on the
navigation ruling in R-01. **Why now.** Inbox item 186 states it exactly: a
trigger that flags into a table nobody reads is compliance theatre, and that
becomes true the day messaging ships unless something reads it. **Approach.**
Build a minimal `/admin/queues` route, independent of the full admin shell
decision, that lists `message_flags` where `status = 'open'`, `risk_alerts`,
and `support_tickets` where `status = 'open'`, each with a single action
(mark reviewed, resolve, reply) using the RLS policies that already scope
these tables to admin roles. This is deliberately not R-01's navigation
question; it is a bare list-and-act surface that can be replaced wholesale
once the rail is chosen. **Phase.** C into D. **Effort.** M.

### R-35. Surface the scanner's own signal to the guest, in the moment
**Problem.** `private.scan_message` already classifies account numbers and
payment keywords server-side the instant a risky message is sent, but today
that classification is invisible to the two people in the conversation.
**Why now.** Inbox item 187 names the mechanism precisely: the moment of
temptation is the only moment education works, and the trigger doing the
classification is landing this week regardless. **Approach.** When a message
produces a `message_flags` row, render an inline system card immediately
following that message in the thread UI, quoting the canonical safety
copy already defined in `HYBRID_INVENTORY.md` §6 ("pay only after you have
inspected the property"), reusing the flag's own `reason` to pick the
wording (account number sighted versus payment language sighted). This adds
no new detection, only a client read of a decision already made.
**Phase.** C. **Effort.** S.

### R-36. Rate-limit new conversations per guest per day at the database
**Problem.** Messaging opening up as a live write path this week also opens
the obvious abuse of an open messaging surface: scraping agents' contact
details through mass first-message DMs. **Why now.** Nothing about the send
action, currently landing, checks conversation-creation volume.
**Approach.** A check inside the conversation-create path (or a trigger on
`conversations`) counting rows where `guest_id = auth.uid()` and
`created_at > now() - interval '1 day'`, rejecting past a threshold with a
clear client error rather than a generic failure. This is inbox item 188.
**Phase.** C. **Effort.** S.

### R-37. Scope enforcement and a cost ceiling on the assistant's tool layer
**Problem.** The assistant is being wired to a real Claude API key and a
real listing-search tool this week; nothing yet stops the model from being
argued, via prompt content, into calling a tool outside the current user's
own scope, and nothing meters the real API spend it now incurs per message.
**Why now.** This is the exact risk MASTER_TODO's own Phase 7 plan calls out
(P7-3, P7-4) and it becomes live the day the tool is real rather than a
mock. **Approach.** The tool executor checks resource ownership in server
code independent of anything the model outputs (the listing-search tool can
only ever read public listing fields; it is never given a path to bookings,
wallet or messages regardless of what a crafted prompt asks for). Separately,
gate the `/api/assistant` route with a per-user daily request or token
counter (a lightweight counter table, or a column on `ai_conversations`
aggregated per user per day) that degrades to a friendly "try again
tomorrow" message rather than an unbounded bill. **Phase.** C. **Effort.** M.

### R-38. Persist assistant threads immediately, and reconcile anonymous ones on sign-in
**Problem.** `ai_conversations` and `ai_messages` exist and are ready, but a
thread only becomes durable once someone decides when to write to them.
**Why now.** The assistant is moving from localStorage-only to real
persistence this week; the transition point is exactly where continuity is
usually lost. **Approach.** Write to `ai_conversations`/`ai_messages` as soon
as a signed-in user sends their first message in a thread, not batched at
session end, and on sign-in, offer to import the current localStorage thread
(if any) into a new `ai_conversations` row rather than discarding it. This
is inbox item 169. **Phase.** C. **Effort.** S.

### R-39. Session and device management before wallet balances are real
**Problem.** There is no screen today where a user can see or revoke active
sessions, and no alert fires when a login happens from an unrecognised
device. **Why now.** The wallet becoming real money this week is exactly the
moment a lost or borrowed phone stops being a minor inconvenience and starts
being an account-takeover vector; inbox item 249 calls this the breach that
ends trust permanently. **Approach.** A sessions list on `/settings` reading
Supabase auth's own session records with a remote sign-out action, plus a
`system`-kind row through the existing `private.notify` writer the moment a
sign-in is seen from a new device fingerprint. This is inbox items 67 and
249. **Phase.** B, alongside the wallet closing. **Effort.** M.

### R-40. A quota and cost guard on the Amadeus provider, built in from the start
**Problem.** `HYBRID_INVENTORY.md` §3 specifies `providers/amadeus.ts` as
Phase E work, not this week's four loops, but the failure mode it needs
guarding against is cheap to build in now and expensive to retrofit once the
provider is live and merged into search results. **Why now.** Verified
current Amadeus guidance: the test environment caps near 10 transactions per
second, and production carries a fixed monthly free-call allotment per API
(for example roughly 2,000 free Hotel Search calls a month) after which every
further call is billed per transaction, silently, unless something is
watching. **Approach.** Cache Amadeus hotel search responses briefly (a
short, minutes-level TTL keyed by the search parameters, not a persistent
store of hotel data) and maintain a monitored monthly call counter that hard
stops outbound calls, contributing zero results rather than accruing
uncontrolled spend, once it approaches the free quota, exactly matching the
"a provider that errors or has no key contributes zero results" failure rule
already written into the spec. **Phase.** E. **Effort.** S.

---

## Post-closure audit (2026-07-29, second pass)

Bookings, wallet with Paystack, messaging with realtime and the trust
scanner, and the Claude-powered assistant with support tickets have now
shipped and were read end to end for this pass: `bookings/actions.ts`,
`wallet/actions.ts`, `wallet/ledger.ts`, the Paystack webhook route,
`messages/actions.ts`, `api/assistant/route.ts` and `support/actions.ts`.
Four more builders are closing now: agent listings CRUD with the photo
quality gate, the admin console queues, the Supabase catalogue repository
swap with the saved loop, and profile plus settings. The twelve
recommendations below are grounded directly in what the shipped code does
today, not in what it is planned to do: gaps a careful reading of the
actual files reveals, ahead of the four builds now landing on top of them.

### R-41. The wallet notification trigger tells nobody when a withdrawal fails or reverses
**Problem.** `private.notify_wallet_entry()` in
`supabase/migrations/20260729112606_notifications.sql` only fires
`where (tg_op = 'INSERT' and new.status = 'COMPLETED') or (tg_op = 'UPDATE'
and new.status = 'COMPLETED' ...)`. The Paystack webhook route
(`api/paystack/webhook/route.ts`) calls `settleWithdrawal(admin, reference,
"FAILED")` and `settleWithdrawal(admin, reference, "REVERSED")` on
`transfer.failed` and `transfer.reversed`, and `wallet/actions.ts` itself
sets a hold to `FAILED` when `initiateTransfer` throws. None of those three
status writes reach the user: the row updates silently and the wallet page
only shows it on next visit. **Why now.** Withdrawals are live money now,
and a failed or reversed transfer is exactly the moment a user most needs to
know their money did not leave, or did not arrive, without refreshing the
wallet page to find out. **Approach.** Extend the trigger's `where` clause
to also fire on `new.status in ('FAILED', 'REVERSED')` regardless of the old
status, with its own copy ("Your withdrawal could not be completed, and your
balance is unaffected" for FAILED, "Your withdrawal was reversed by the
bank, and the funds are back in your wallet" for REVERSED), reusing the
existing direction/amount formatting already in the function. **Phase.** B.
**Effort.** S.

### R-42. Privileged actions write nothing to the audit log the schema already promises
**Problem.** `public.audit_log` exists precisely for this
(`supabase/migrations/20260728152539_admin_trust.sql`: "every privileged
action gets a row, and there is no update or delete policy"), but a
repository-wide check shows no application code writes to it: not
`bookings/actions.ts confirm()` (an agent or admin overriding a guest's
booking state), not the wallet withdraw or transfer paths, not
`support/actions.ts`. The table is read-ready for admins and completely
unfed. **Why now.** `confirm()` is exactly the kind of privileged,
cross-user action Master Rule 13 exists to cover, and it is live today with
zero audit trail; every further privileged surface landing this phase
(agent approvals, listing review, admin queue actions) will repeat the same
gap unless the pattern is set now. **Approach.** Add a small
`recordAudit(admin, { actorId, action, entityType, entityId, metadata })`
helper next to the ledger and wallet helpers, call it from `confirm()`
first (action `booking.confirm`, entity the booking id), then require it in
review for every admin-console mutation landing in this phase. **Phase.** B
into D. **Effort.** S.

### R-43. The assistant's request throttle lives in one process's memory
**Problem.** `api/assistant/route.ts`'s `allowRequest()` reads and writes a
module-level `Map<string, Bucket>`, keyed by the caller's IP, to cap
requests. On any deployment that runs more than one server instance, or that
recycles instances (cold starts, redeploys, autoscaling), each instance
keeps its own bucket: a caller effectively gets one full `BUCKET_CAPACITY`
allowance per instance rather than one allowance total, and every restart
resets it to full. **Why now.** The route now calls the real Claude API and
bills real tokens per message (the exact risk R-37 already names for the
tool layer); the one throttle standing between a scripted caller and an
unbounded bill is not actually global. **Approach.** Move the bucket to a
shared store the deployment already has (a Postgres table read and written
through the service role with a single upsert-and-check, or Redis if one is
provisioned), keyed by IP and, once R-37's per-user counter lands, by user
id too. Keep the in-memory map only as a same-instance fast path in front of
it. **Phase.** C. **Effort.** S to M.

### R-44. Booking reserve has no rate limit at all, unlike the messaging create-path already planned
**Problem.** `bookings/actions.ts reserve()` validates the session, the
feature flag and the input shape, then inserts directly. Nothing counts how
many `PENDING` bookings one guest has created recently. R-36 already flags
this exact class of risk for conversation creation; reserve carries the
same shape of risk against a scarcer resource. **Why now.** Until R-23's
hold-expiry job ships, a `PENDING` booking holds real inventory for the
whole abandonment window; a guest (or a script using a leaked session)
repeatedly reserving and abandoning different listings can lock out
genuine bookers across many properties at once, at zero cost to the actor.
**Approach.** The same shape of guard as R-36: reject `reserve()` past a
small per-guest count of `PENDING` bookings created in the last hour
(count `bookings` where `guest_id = auth.uid()` and `status = 'PENDING'`
and `created_at > now() - interval '1 hour'`), with a clear client message
rather than the generic failure. **Phase.** B. **Effort.** S.

### R-45. A P2P transfer's two ledger legs can still be split by a process crash, not just a thrown error
**Problem.** `wallet/actions.ts transferToUser()` posts the sender's
`transfer_out` leg, then posts the recipient's `transfer_in` leg inside a
`try`/`catch` that reverses the first leg if the second call *throws*. That
covers a Paystack-style failure, but the two legs are still two separate
JavaScript-level awaits: if the process is killed between them (a deploy,
an OOM, a platform restart) rather than the second call throwing, the
sender's leg is left `COMPLETED` with the money genuinely gone and no
`transfer_in` row and no reversal ever runs, because the catch block that
would reverse it never executes. R-26 already proposes the correct fix, a
single paired-insert Postgres function; this item is the interim
mitigation while that lands. **Why now.** P2P is live and moving real
balances today, and this exact crash window exists in the shipped code
right now, not just hypothetically. **Approach.** A short reconciliation
query, run by R-21's job runway, that finds `wallet_entries` with
`kind = 'transfer_out'` and `status = 'COMPLETED'` whose reference
`rm-p2p-<pair_id>-out` has no matching `rm-p2p-<pair_id>-in` row after a
short grace period (a minute or two, to avoid racing the action's own
awaits), and reverses the orphaned leg automatically, writing a
`risk_alerts` row so the case is visible. **Phase.** B. **Effort.** S.

### R-46. Stuck PENDING withdrawal holds need a per-entry Paystack status check, not only a nightly total
**Problem.** `withdraw()`'s own catch block says it plainly: if
`setEntryStatus(admin, reference, "FAILED", ...)` itself fails after
`initiateTransfer` has already thrown, "the hold stays PENDING;
reconciliation settles it against Paystack." R-29's nightly reconciliation
compares day-level sums against Paystack's transaction list, which will
notice the total is off but will not identify or resolve the specific
stuck row, and a withdrawal whose Paystack call never definitively
succeeded or failed (a timeout mid-call, for instance) never gets a webhook
event to settle it at all. **Why now.** This is a named, acknowledged gap
in the code that ships with real transfers this phase, not a hypothetical.
**Approach.** A job (R-21) distinct from the nightly totals check: list
`wallet_entries` where `kind = 'withdrawal'` and `status = 'PENDING'` and
`created_at` older than a short window (a few minutes, well past normal
transfer latency), and for each, call Paystack's transfer-status endpoint
directly by reference and settle it to `COMPLETED`, `FAILED` or `REVERSED`
accordingly, or leave it and alert if Paystack itself has no record of the
reference. **Phase.** B. **Effort.** M.

### R-47. The P2P transfer form lets anyone probe which email addresses have a RentMe wallet
**Problem.** `transferToUser()` returns the field error "No RentMe account
uses that email address yet" when `findUserByEmail()` comes back empty, and
a different, generic path otherwise. Paired with having no rate limit of
its own, a script can iterate a list of emails against this action and
learn, one HTTP response at a time, which ones are RentMe users. **Why
now.** Wallet actions are the first surface this phase where account
existence is directly and cheaply enumerable through a signed-in session.
**Approach.** Do the recipient lookup after the amount and balance checks
pass, and on no match, return the same shape of generic failure used
elsewhere ("We could not complete this transfer. Check the recipient's
email and try again.") rather than a distinguishing field error; add this
action to whatever per-user throttle R-43's shared store ends up backing.
**Phase.** B. **Effort.** S.

### R-48. message_flags, risk_alerts and reports record no reviewer, only a status
**Problem.** All three tables (`supabase/migrations/20260728222112_messaging_trust.sql`
and `20260728152539_admin_trust.sql`) carry a `status` column and, for two
of the three, a `resolved_at` timestamp, but none of them carry a
`reviewed_by` or `resolved_by` user id. Once R-34's queue (or the full
admin console now being built) lets an admin mark a flag reviewed or an
alert resolved, there will be no record of which admin did it. **Why now.**
This is a schema change, cheapest to make before the admin console's mutate
actions are written against the current shape, not after. **Approach.** Add
`reviewed_by uuid references auth.users(id)` to `message_flags` and
`resolved_by uuid references auth.users(id)` to `risk_alerts` and
`reports`, set by the admin action at the same moment as the status change,
and surfaced in the console list so a reviewed item shows who closed it.
Pairs directly with R-42's audit log helper, which should also fire on
these same actions. **Phase.** D. **Effort.** S.

### R-49. Nothing server-side enforces the photo quality gate that `HYBRID_INVENTORY.md` §5 specifies
**Problem.** `supabase/migrations/20260729112658_storage_buckets.sql`
creates the public `listing-photos` bucket with a write policy of
`(storage.foldername(name))[1] = auth.uid()::text`: any signed-in user,
approved agent or not, can upload any file, of any size, count or
resolution, into their own folder in a public bucket today. None of §5's
admission rules (minimum 4 photos, minimum 1600px wide, landscape cover,
auto-enhance, EXIF strip, duplicate and watermark detection) exist
anywhere in the storage layer or, since the CRUD flow is not built yet, in
application code either. **Why now.** Agent listings CRUD is the builder
closing right now; the bucket and its RLS already ship ahead of it, so the
quality gate needs to land in the same slice as the submit action, not as a
follow-up once agents are already uploading. **Approach.** Enforce the
count, size and dimension checks in the submit server action before a
listing can move out of draft (reading the uploaded objects back via the
service role), run the auto-enhance and blurhash pipeline server-side on
accept as §5 specifies, and keep the bucket write policy as the coarse
ownership check it already is, not the quality gate. **Phase.** D.
**Effort.** M.

### R-50. Scaffold the hybrid inventory provider layer's own cache tables now, ahead of the Amadeus and Places integrations
**Problem.** `apps/web/src/lib/inventory/` does not exist yet: none of
`providers/rentme.ts`, `providers/amadeus.ts` or `providers/places.ts` from
`HYBRID_INVENTORY.md` §3 have been started. Both third-party providers need
a persistence shape the spec already implies but has not been designed:
Amadeus needs an OAuth2 client-credentials token cached across requests
(re-fetching a token per search call is wasteful and adds latency to every
partner result), and Places needs the `place_id` cache §2 describes,
distinct from a details cache, because Google's terms allow caching a
`place_id` indefinitely but only allow caching place *details* (name,
photos, hours) briefly. **Why now.** The catalogue repository swap landing
in this same phase is the natural moment to also lay down the two small
tables this needs, so the provider files land against a ready shape instead
of inventing one under time pressure later. **Approach.** Two small tables:
`amadeus_tokens` (a single-row or short-lived cache of the current bearer
token and its expiry, read-and-refresh pattern) and `places_cache`
(`place_id` primary key, cached `details jsonb`, `details_fetched_at`, with
application code treating `details` as stale and re-fetching after a short
TTL while the `place_id` row itself is kept indefinitely), each written
only by the service role from the provider files R-40 and this item both
depend on. **Phase.** E. **Effort.** M.

### R-51. The notifications table has no retention job and only supports owner-delete
**Problem.** `public.notifications` (`supabase/migrations/20260729112606_notifications.sql`)
grows by one row per recipient for every booking, message, wallet movement
and support reply, forever, with the only delete path being a signed-in
user clearing their own rows one at a time from the client. Four loops
that each fan out notifications are now live at once. **Why now.** This is
exactly the kind of unbounded-growth table R-21's job runway is meant to
keep in check, and it is cheap to add while the runway is being built
rather than as a separate migration later. **Approach.** A job (R-21) that
deletes `notifications` rows where `read_at` is not null and older than a
set window (say ninety days), leaving unread rows untouched regardless of
age so nothing genuinely unseen is ever silently dropped. **Phase.** B.
**Effort.** S.

### R-52. Support ticket filing has no rate limit, and the anonymous path runs through the service role
**Problem.** `support/actions.ts fileSupportTicket()` checks the feature
flag and validates the input, then inserts, using `createAdminClient()`
directly for anyone not signed in, since "the tickets table has no
anonymous insert policy by design." Nothing counts how many tickets one
caller, signed in or not, can file. **Why now.** This is a service-role
write path reachable by anyone on the internet with no session at all,
and support tickets are live today. **Approach.** A lightweight per-IP (and
per-email, for the anonymous path) throttle, the same shared mechanism
R-43 needs for the assistant route, rejecting past a small hourly count
with the existing honest failure copy rather than a silent flood into the
admin queue. **Phase.** C. **Effort.** S.
