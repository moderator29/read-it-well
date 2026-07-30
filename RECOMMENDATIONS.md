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

---

## Scale pass (2026-07-30)

Every loop named in the last two passes has now shipped and was read for this
one: bookings reserve/cancel/confirm with the GiST guarantee, the append-only
kobo wallet with Paystack and the atomic paired transfer, messaging with
realtime and the `private.scan_message` trigger, the streaming Claude
assistant with its `search_listings` tool, support tickets, agent listings
CRUD with the photo gate and the client-side re-encode that strips EXIF, the
admin console at `/admin` with `audit_log` writes on every decision, the
Supabase catalogue repository merged with the seed, the Amadeus and Places
partner providers, transactional email through Resend, the PWA with its
hand-written offline shell, durable Postgres rate limiting and idempotency,
four locales, and RLS everywhere with the init-plan rewrite applied.

That is a platform. This pass is about what happens next: the trajectory
moves (A), the genuine but unhurried improvements (B), and the small pieces
that separate a good product from a great one (C). Every item below names
something real in this repository. Nothing here proposes charging anyone
anything: the platform charges nothing, and the recommendations that touch
revenue take it from the supplier side or from measurement, never from a
guest or an agent.

---

### A. High value, 25 items

The moves a founder would reorder the roadmap for.

#### R-53. Reserve takes no money, so the money loop is still open

**Problem.** `lib/bookings/actions.ts reserve()` validates the session and
the flag, resolves the listing, computes integer kobo, inserts a `PENDING`
`bookings` row under the guest's own RLS client and sends two emails. It
never writes a `transactions` row, never calls `initTransaction` from
`lib/payments/paystack.ts`, and never debits the wallet. A repository-wide
check confirms `public.transactions` and `public.ledger_entries` have no
application writer at all. **Why now.** Every money item already in this
backlog reads rows nothing creates: R-28's payout hold sits on
`ledger_entries`, R-29's reconciliation compares `transactions` against
Paystack, R-30's refund needs a `SUCCESSFUL` transaction to reverse. None of
them can be built or tested until a booking can actually be paid for, and the
copy on `/bookings` already promises a payment step ("Confirm and pay") that
does not exist. **Approach.** Extend `reserve()` to write a `transactions`
row in the same call (`booking_id`, `provider 'paystack'`, `amount_minor =
total_minor`, `status 'PENDING'`), then offer two settlement routes on the
booking step: pay from the wallet, which posts a `wallet_entries` debit and
flips the transaction to `SUCCESSFUL` inside one service-role function so the
two can never disagree; or pay by card through `initTransaction`, settled by
the existing `/api/paystack/webhook` route on `charge.success` against a new
`rm-book-<uuid>` reference alongside the `rm-fund-*` and `rm-wd-*` prefixes
that route already dispatches on. Nothing here is a charge by RentMe: the
amount is exactly `bookings.total_minor`, the guest paying the host for the
stay, and no other number ever appears anywhere in the flow. **Phase.** B.
**Effort.** L.

#### R-54. Pin the platform share to zero in the schema, permanently

**Problem.** `public.listings` and `public.bookings` each carry a money
column, sitting between the cleaning amount and the total, whose very name
asserts a charge by the platform. `bookings_total_chk` folds it into
`total_minor`, and `reserve()` selects it straight off the listing row into
the booking snapshot. The platform charges nothing, so a schema that reserves
a slot for a charge is a loaded gun pointed at Master Rule 13.
**Why now.** R-53 is about to turn `total_minor` into a number a real person
is asked to pay, and agent listings CRUD is already live. The moment an agent
can set that column, or an admin sees it in the `/admin/listings` queue, the
promise breaks in public and in writing. **Approach.** Append only, nothing
destructive: a check constraint forcing that column to zero on `listings` and
on `bookings`, so the database itself enforces the rule that no copy review
can be trusted to catch. Drop it from the select list in `reserve()` and from
the projection in `lib/admin/queries.ts getListingSubmissions()`, keep it
absent from `draftInputSchema` where it already is, and add its name to the
banned-word scan in the HANDOFF section 10 verification ritual so no future
surface can render it. Deliberately leave the matching column on
`ledger_entries` free: that one records supplier-paid commission (R-55),
which never appears in any guest total. **Phase.** B. **Effort.** S.

#### R-55. Recognise partner commission as the revenue line that already exists

**Problem.** `HYBRID_INVENTORY.md` section 2 states it plainly: partner hotel
revenue is commission per booking, paid by the supplier.
`lib/inventory/providers/amadeus.ts` searches, maps offers into `Listing`
with `source: "partner"`, and stops. There is no Hotel Booking call, no order
record, and nothing anywhere that says a commission was earned.
**Why now.** Partner stock is the only inventory that can carry revenue with
no charge to any guest, and it is also the only inventory available at volume
while `public.listings` is still filling from agent supply. Building the
booking path later, across live orders, means retrofitting accounting onto
money that has already moved. **Approach.** Add the Amadeus Hotel Booking
call behind the existing `hybrid_hotels` feature flag; persist each order in
a `partner_orders` table (provider, provider order reference, guest id,
`amount_minor`, `commission_minor`, status, timestamps) since partner stock
has no `listings` row to hang off; and write one `ledger_entries` row per
settled order with the commission in the platform column and
`agent_share_minor` at zero. The guest pays the hotel's own quoted rate,
unchanged, which is the whole point: the money arrives from the supplier and
the guest never sees a different figure from the one the offer showed.
**Phase.** E. **Effort.** L.

#### R-56. Supplier-paid adjacent services, starting with the airport transfer

**Problem.** R-17 already names airport pickup and car rental as post-launch
ideas and notes the icon family anticipates them. Left as a page idea they
are a distraction; built as a fourth thing under `lib/inventory/` they are
supplier-paid revenue attached to demand that already exists.
**Why now.** The diaspora guest landing at Murtala Muhammed at 4am, with a
confirmed booking in Lekki and no safe way to get there, is the single
sharpest unserved moment on the platform, and it happens at the exact point
where RentMe already holds the guest's attention: the confirmed booking page.
**Approach.** An extras block on the confirmed booking view, fed by a partner
transfer provider registered the same way Amadeus and Places are in
`lib/inventory/index.ts`, deep linking to the operator with the booking's
own airport, date and destination area prefilled. Settlement is a
`partner_orders` row (R-55) with the operator's per-transfer commission in
`commission_minor`. Guarded by its own feature flag so it contributes nothing
until a real operator agreement exists, exactly like the existing providers.
**Phase.** E. **Effort.** M.

#### R-57. One rollup the business can steer by

**Problem.** There is no aggregate anywhere in the platform.
`lib/admin/queries.ts getQueueCounts()` reports moderation work in progress,
which is operational load, not marketplace health. Nobody can answer how many
listings went live this week, what share of `PENDING` bookings ever reach
`CONFIRMED`, or which searches returned nothing. **Why now.** R-53, R-58 and
R-63 are each about to change a conversion number, and without a baseline
recorded before they ship, none of them can be shown to have worked.
**Approach.** A nightly job on R-21's runway writing one `marketplace_daily`
row: listings by `listing_status`, agents approved, reserve attempts,
`PENDING` to `CONFIRMED` conversion, cancellations by actor, wallet volume in
and out from `wallet_entries`, partner orders, message threads opened, and
the ten most searched terms that returned zero results, which is the clearest
supply-gap signal RentMe can produce (it also feeds R-20's heatmap). Render
it at `/admin/metrics` next to the queue counts, reading through the same
`requireAdmin()` guard. Search and view counts need R-102's event table; the
booking and wallet figures need nothing new. **Phase.** D. **Effort.** M.

#### R-58. No host can accept a booking, because `/agent/bookings` is a placeholder

**Problem.** `lib/bookings/actions.ts confirm()` is a complete, correctly
authorised server action: it joins through `agents.user_id` exactly as the
HANDOFF section 9 gotcha demands, and it has no caller anywhere.
`app/agent/bookings/page.tsx` is eleven lines rendering `AgentComingSoon`. A
guest can reserve; nobody can say yes. **Why now.** The entire supply half of
the booking loop is one screen from working, and it compounds badly with
R-23: once the stale-hold job runs, requests will be auto-cancelled that no
host was ever shown. **Approach.** Replace the placeholder with the real
queue: `bookings` joined to `listings` for the caller's `agents.id`, grouped
Awaiting, Upcoming and Past, each awaiting row carrying Confirm and Decline
wired to `confirm()` and `cancel()`, with the guest's dates, party size and
`total_minor` on the card. Show the response deadline from R-24's
`held_until` so the host understands the clock, and derive a host response
time from `booking_state_events` onto `agents` so R-63's quality signals and
future ranking have something honest to read. **Phase.** D. **Effort.** M.

#### R-59. `/agent/earnings` and the payout tables nobody writes

**Problem.** `public.payout_accounts` has zero application code,
`public.ledger_entries` has zero writers, and `app/agent/earnings/page.tsx`
is another `AgentComingSoon`. An agent who lists, hosts and completes a stay
has nowhere to see what they earned and no way to take it.
**Why now.** Supply grows on the strength of agents telling other agents they
got paid. That sentence cannot be said yet. It also blocks R-05 and R-32,
both of which assume a payout surface exists to attach to. **Approach.**
Earnings reads `ledger_entries.agent_share_minor` joined through `bookings`
to the caller's listings, split into released and held using R-28's
`payout_available_at`. The payout action credits the agent's own `wallets`
row through the atomic transfer function added in
`20260730011651_wallet_atomic_transfer_and_reconciliation.sql`, so a payout
is an internal paired-leg transfer and the existing `withdraw()` path takes
it to a bank with no new money movement code at all. Account management
writes `payout_accounts` and hands R-32 the row it needs to name-check.
**Phase.** D. **Effort.** M.

#### R-60. Bulk intake for agencies that already hold a portfolio

**Problem.** `app/agent/list/ListingWizard.tsx` is a careful one-listing-at-a-
time flow: a 40 word description minimum, four photos minimum, per-photo
canvas re-encode, amenity selection, then `submitListing()`'s gate. An agency
with sixty flats across Lekki and Ikoyi will not do that sixty times, and
those agencies are precisely where supply density comes from.
**Why now.** Supply is the binding constraint (`public.listings` is still at
zero rows in the live database) and the wizard, though excellent, is priced
for an individual landlord rather than for the accounts that would move the
number. **Approach.** A `/agent/list/bulk` route that accepts a pasted
spreadsheet mapped column by column onto `draftInputSchema` fields, creating
one `DRAFT` listing per row through the existing `saveDraft()` path, followed
by a photo drop that assigns uploads to drafts by a reference column and
still routes every file through `stripMetadata()` and `addPhoto()`. Each
draft then passes `submitListing()`'s gate individually, so admission quality
is untouched: only the typing disappears. **Phase.** D. **Effort.** L.

#### R-61. `/agent/verification` and the documents table with no writer

**Problem.** `public.agent_documents` exists with RLS and has zero
application code. `app/agent/verification/page.tsx` is a placeholder. R-05's
BVN or NIN standard, on the backlog since the first pass, has nowhere to
land, so agent approval at `/admin/agents` currently rests on a form and a
human's judgement of it. **Why now.** R-59 is about to let money leave the
platform to an agent, and R-32's payout name check needs an identity on file
to compare against. Verification is the prerequisite for both.
**Approach.** A verification surface uploading identity documents into a
private bucket following the pattern `message-attachments` already
establishes (path-scoped RLS through a `private.*` helper that returns false
rather than throwing on a malformed path), writing `agent_documents` rows,
plus a NIN or BVN field resolved through Paystack's identity endpoints with
the outcome stored as a verification tier on `agents`. `/admin/agents` gains
the documents and the resolution result inside the existing review panel, and
`reviewAgentApplication()` records the tier in its `audit_log` detail.
**Phase.** D. **Effort.** M.

#### R-62. The date picker never shows a booked night, because nothing writes `availability`

**Problem.** `lib/bookings/queries.ts getBlockedDates()` reads
`public.availability` alone, filtered to `booked` and `unavailable`, and that
is the only source the calendar on `/listing/[id]` consults. Only `confirm()`
ever writes those rows, upserting `booked` nights after a host accepts, and
`confirm()` has no caller at all today (R-58). `reserve()` writes nothing, so
a `PENDING` booking, which the `bookings_no_overlap` exclusion constraint
absolutely does block, is invisible on the calendar. The result: two guests
see identical open calendars for the same nights, both fill in the entire
reserve form, and the second one meets the `23P01` refusal at the very end.
**Why now.** The GiST constraint is the platform's proudest correctness
guarantee and today it reaches the guest as an arbitrary failure after all the
work is done, which is the worst possible way to present a strength. It also
means an agent cannot block a weekend for repairs or for a friend, so
`availability_status`'s `unavailable` value has no writer anywhere.
**Approach.** Two halves. Server side, have `reserve()` upsert the range as
`booked` in the same service-role step R-53 adds, so the hold is visible
immediately and the deletion already written into `cancel()` and the
stale-hold job finally has the rows it expects. Agent side, a calendar on the
agent listing detail writing `unavailable` rows directly, which is what turns
the third enum value into a feature. **Phase.** D. **Effort.** M.

#### R-63. Nobody can review a stay

**Problem.** `public.reviews` has an insert policy, a unique `booking_id`,
and is read for aggregates in `lib/listings/supabase-repository.ts` and in
`lib/profile/queries.ts`. Nothing writes one. Every rating and review count
visible on a card today comes from the seed catalogue.
**Why now.** The first genuinely completed bookings arrive days after R-53
lands, and a review that is not asked for within about two days of checkout
is never written at all. Reviews are also the only supply-quality signal that
costs no admin time, which matters while `/admin` triage is one small team.
**Approach.** A job on R-21's runway that, the day after `check_out` on a
`CONFIRMED` booking, writes a `notifications` row and sends a transactional
email through `lib/email/messages.ts` (which already carries the booking
family) linking to a review form; the form posts through the guest's own RLS
insert policy, so the database decides who may review what. Add a host reply
column and surface it in `ListingReviews`, because an unanswered bad review
does more damage than the review itself, and route review text through the
same `private.scan_message` classification so an account number cannot be
smuggled into a public field. **Phase.** D. **Effort.** M.

#### R-64. Perceptual hashing against stolen and duplicated listing photos

**Problem.** `HYBRID_INVENTORY.md` section 5 lists duplicate photos across
listings as an admin rejection criterion, and no mechanism exists:
`addPhoto()` stores a path and a position, `submitListing()` counts rows. The
most common property scam in this market is a real agent's photographs
appearing on a fraudulent agent's listing. **Why now.** Photos are being
uploaded now, and a hash computed at upload time is free while a hash
backfilled across a catalogue is a migration. Every day of delay makes the
comparison corpus more expensive to build. **Approach.** Compute a perceptual
hash server side when a photo is attached; the client re-encode in
`stripMetadata()` already hands the server a normalised JPEG, so the hash is
stable. Store it on `listing_photos`, and in `submitListing()` compare every
photo against the stored corpus within a small Hamming distance. A collision
with another agent's listing writes a `risk_alerts` row at high severity and
routes the submission into `/admin/listings` with both images shown side by
side, rather than auto-rejecting, because an agency genuinely relisting its
own property is a real and frequent case. **Phase.** D. **Effort.** M.

#### R-65. Score the conversation, not only the message

**Problem.** `private.scan_message` flags a ten-digit run or a payment
keyword, per message, in isolation. A patient operator sends the digits
across several messages, writes the number in words, or simply says "call
me". Per-message regex cannot see a pattern that only exists across a thread.
**Why now.** Messaging is live and the flag table is filling; `/admin/alerts`
and `/admin/flags` are staffed by people whose time is the scarce resource,
and one alert per conversation is far cheaper to work than a list of
individually innocuous messages. **Approach.** A `conversation_risk` table
maintained by the same trigger, holding per conversation: flag count,
distinct `message_flag_reason` values seen, count of messages containing
digit runs of any length, whether payment language appeared before any
`inspection_confirmations` row exists for that conversation, and elapsed time
from first message to first money word. Past a threshold, write one
`risk_alerts` row for the conversation and surface it in `/admin/alerts` with
the thread inline, resolvable through the existing `resolveRiskAlert()`
action so the audit trail and R-48's `resolved_by` come for free.
**Phase.** D. **Effort.** M.

#### R-66. Turn a confirmed inspection into a recorded agreement for the RENT market

**Problem.** `inspection_confirmations` records that a guest inspected a
property. Then the trail stops. The RENT market has no Reserve button by
design (`HYBRID_INVENTORY.md` section 4), so the annual tenancy payment, by
far the largest single sum anyone will move in this market, happens entirely
outside anything RentMe records, at precisely the moment the canonical safety
copy tells people to stay inside the platform. **Why now.** The safety
promise is currently asymmetric: RentMe protects the conversation and then
waves goodbye at the transaction. The wallet already has atomic paired-leg
transfers and reconciliation, so the missing piece is the agreement, not the
money movement. **Approach.** Once an `inspection_confirmations` row exists
on a rental conversation, offer both sides an agreement step: the agent
states the annual amount and the term, the guest accepts, and the payment
moves through the existing atomic transfer function into a held state
released on a move-in confirmation from the guest (the same shape as R-28's
payout hold). RentMe charges nothing for any of it; the entire value is that
the sum is recorded, evidenced and reversible, which is exactly what the RENT
market has never had. **Phase.** D into E. **Effort.** L.

#### R-67. Identity tiers in front of the actions that can hurt someone

**Problem.** An email address is currently enough to open a conversation with
any agent, reserve real nights, and move wallet money.
`20260729175409_profile_identity_columns.sql` added identity columns to
`profiles` and nothing gates on them. **Why now.** R-36 and R-44 both propose
counting abuse after the fact; a phone number verified once is a cheaper and
more permanent answer than a rate limit, because it prices the creation of
the account rather than the use of it. It is also the prerequisite for
R-66's agreements to mean anything. **Approach.** Three tiers recorded on
`profiles` and enforced inside the server actions next to the existing
`resolveSession()` check, never in the UI: email only (browse, save, search,
ask the assistant), phone verified by OTP (start a conversation, reserve),
identity verified by NIN (wallet transfers above a threshold, rent
agreements). Every refusal returns the existing honest `fail()` envelope
naming the one step needed, and the tier is shown on the profile so nobody
discovers it mid-transaction. **Phase.** C into D. **Effort.** M.

#### R-68. A trip timeline, not a status badge

**Problem.** `app/(app)/bookings/MyBookings.tsx` shows three states through
`STATUS_BADGE`: Awaiting confirmation, Confirmed, Cancelled. Everything
between confirmation and arrival, which is exactly where a Nigerian guest's
real anxiety lives (is the address right, will the gate let me in, is there
power tonight, who do I call), is silent. **Why now.** `booking_state_events`
already records the transitions, `lib/email/messages.ts` already has the
booking family, and `private.notify` already fans out. The parts exist; only
the schedule and the presentation are missing, and retention is decided in
this gap. **Approach.** A timeline on the booking card driven by
`booking_state_events` plus dated steps from R-21's runway: confirmed, host
contact released, three days out with directions and R-73's estate access,
arrival day with the check-in window, day after checkout with R-63's review
prompt. Each step is one `notifications` row and one email, reusing the
writers already in place. **Phase.** D. **Effort.** M.

#### R-69. The referral field collects intent and nothing happens

**Problem.** Sign-up carries a referral input and a hear-about-us answer
(HANDOFF section 3, rule 11). Neither is joined to anything: no code is
issued, no attribution is recorded, no referrer ever learns their friend
joined. **Why now.** The field is already in front of every new user, so the
habit of entering a code is being trained with no payoff attached, which
teaches people it does not matter. Fixing it later means asking an existing
base to start doing something they have learnt to ignore.
**Approach.** A generated `referral_code` on `profiles` at signup and a
`referred_by` recorded when a code is entered, attributed through to first
booking in R-57's rollup so the loop is measured before it is tuned. The
reward costs the platform nothing to promise: the referred guest's first
conversation is marked as introduced, which agents see and answer faster, and
the referrer's stays inherit the same marker. If a monetary reward is ever
wanted it is platform-funded wallet credit, never a charge to any user.
**Phase.** E. **Effort.** M.

#### R-70. Rent savings goals, the reason to keep a balance

**Problem.** Nigerian annual rent is paid as one large lump saved for across
a year, usually in a thrift arrangement or a separate bank account. The
wallet is an append-only kobo ledger with a genuinely good surface
(`WalletDeck`, `BalanceCard`, `TransactionsSection`) and today it only ever
holds money between a funding and a spend. **Why now.** R-53 gives the wallet
its first real spend, which is the moment a balance stops being decorative,
and the RENT market is the one place where the saving behaviour already
exists offline and is waiting for somewhere better to live.
**Approach.** A `wallet_goals` table (owner, `target_minor`, target date,
optional `listing_id` for a specific rental) and a goal card in `WalletDeck`
that ring-fences part of the derived balance from the available figure R-25
computes, so a goal cannot be accidentally spent. Reminders on the user's own
chosen day through `private.notify`. Money remains fully withdrawable at any
time and the platform takes nothing for holding it; the value to RentMe is
that the wallet becomes the account people fund rather than the account they
pass through. **Phase.** E. **Effort.** M.

#### R-71. Power, as structure rather than a tick box

**Problem.** `AMENITY_CHOICES` in `lib/agent/listings-schema.ts` offers
`generator` labelled "Backup Power": one boolean for the first question every
Nigerian guest asks. It cannot distinguish "Band A, roughly twenty hours a
day" from "generator between 7pm and 11pm only" from "solar and inverter, no
generator at all", and those are three completely different products.
**Why now.** Agent listings CRUD is live and drafts are being created now.
Every listing written before the fields exist has to be revisited by its
agent, which is the one thing agents will not do twice.
**Approach.** Real columns on `listings`: `power_band` (A to E or unknown),
`power_hours_typical`, `power_backup` (none, shared generator, dedicated
generator, inverter, solar), `power_backup_hours`, `power_metered` (prepaid,
postpaid, included). Required by `submitRequirements()` for lodging and
rental alike, rendered as their own facts block on `/listing/[id]` above
amenities, exposed in `ListingSearchFilter` so `/search` can filter on them,
and included in the `search_listings` tool projection so the assistant can
answer the question directly. No competitor in this market answers it
structurally, and every guest asks. **Phase.** D. **Effort.** M.

#### R-72. Water, the same treatment

**Problem.** `water` labelled "Running Water" is the other single boolean in
`AMENITY_CHOICES`, standing in for a question with four genuinely different
answers and a large price consequence. **Why now.** Same reason as R-71: the
fields must exist before the catalogue fills, and both changes are one
migration and one wizard step if done together. **Approach.** Columns on
`listings`: `water_source` (borehole, mains, tanker delivery, well),
`water_storage_litres`, `water_heating` (none, electric, solar, instant),
`water_pump` boolean. Same rendering in the `/listing/[id]` facts block, same
`ListingSearchFilter` entry, same exposure to the assistant tool, same
`submitRequirements()` enforcement. **Phase.** D. **Effort.** S.

#### R-73. Estate access, released the moment a booking is confirmed

**Problem.** A large share of Nigerian shortlets sit inside gated estates
where arrival fails at the gate, not at the door: the guest's name is not on
the list, the security post has no record, a visitor's pass is demanded, or
entry closes at 10pm. `listings` carries `address` and `landmark` and nothing
at all about the gate. **Why now.** R-53 and R-58 together produce the first
real arrivals, and the first arrival that fails at a gate at 11pm is a review
the platform never recovers from. It is also a trust mechanic in its own
right: withholding the access details until confirmation is exactly the
"inspect before you pay" logic applied to arrival. **Approach.** Estate
columns on `listings` (`estate_name`, `gate_access`, `access_notes`,
`access_curfew_time`) deliberately excluded from the public listing
projection in `lib/listings/supabase-repository.ts`, plus a `booking_access`
row written when a booking becomes `CONFIRMED` carrying the code or the
security desk instruction, readable only by that booking's guest under RLS,
surfaced on their own booking detail and in the confirmation email, and
expiring at checkout. The public page shows only "gated estate, access
details on confirmation", which is honest and reassuring at once.
**Phase.** D. **Effort.** M.

#### R-74. Detty December as a first-class season

**Problem.** Nigerian inbound demand is not evenly distributed. It is a spike
from mid December to early January driven by diaspora return, with the search
intent starting in September and the inventory decision made even earlier.
The platform has no concept of a season anywhere in the schema or the
surfaces. **Why now.** The September intent window for this December is
weeks away. A season built in November is a season missed.
**Approach.** A `seasons` table (name, slug, search window, stay window,
cities) and three concrete behaviours reading it: `/search` offers the
December window as a preset date chip once R-79's real date filter exists;
`recommended()` in the repository weights Lagos, Abuja, Port Harcourt and
Calabar listings with open December availability during the September window;
and `/agent/listings` shows a September prompt to open the December calendar
through R-62, because stock that is not open in September is not found in
December. Measure the whole thing through R-57's rollup.
**Phase.** E. **Effort.** M.

#### R-75. Book for someone else, because the payer is often not the guest

**Problem.** `bookings.guest_id` is a single auth user, and every email goes
to `contactFromSession(session.user)`. The defining diaspora case is a
sibling in London paying for a cousin arriving in Lagos, and the platform
currently sends the arrival directions to London. **Why now.** It lands with
R-73 and R-68 or it lands as a rewrite of both: all three change who receives
which message about a booking. **Approach.** Optional columns on `bookings`
(`guest_name`, `guest_phone`, `guest_email`) captured in `ReservePanel`
behind a "this stay is for someone else" toggle, with `lib/email/messages.ts`
splitting the sends so the payer receives the confirmation and the arriving
guest receives the directions and R-73's access details. The arriving guest
opens the booking through a signed link with no account required, and the
host sees who is actually arriving, which is a safety improvement as much as
a convenience. **Phase.** D. **Effort.** M.

#### R-76. Campus, NYSC and festival demand, which arrive on a calendar

**Problem.** Three recurring, dated, geographically precise demand events the
catalogue cannot serve: university resumption and graduation weekends in
Ibadan, Nsukka, Ile Ife and Zaria; NYSC camp intake and passing out parades
on a published national calendar; and festivals fixed to a city and a date,
Calabar Carnival in December, Ojude Oba in Ijebu Ode after Eid, Argungu, the
Lagos concert season. **Why now.** `/search` carries
`robots: { index: false, follow: false }`, so RentMe currently has no
indexable demand-capture page at all, and these events are searched for by
name months ahead. **Approach.** Reuse R-74's `seasons` rows for each event,
seed the dates from published calendars, and give each one a real indexable
route `/season/[slug]` rendering that city's stock for that window with the
`ListingCard` the rest of discovery uses. It is the cheapest organic demand
available to this platform, and the cheapest supply pitch too: an agent in
Ijebu Ode has exactly one weekend a year that matters, and this is how they
hear that RentMe knows it. **Phase.** E. **Effort.** M.

#### R-77. Give the assistant the caller's own context, without breaking R-37

**Problem.** `/api/assistant` has exactly one tool, `search_listings`, and
R-37 rightly insists the tool layer never be argued into reaching bookings,
wallet or messages. The consequence is a concierge that cannot answer the
three things people actually open an in-app assistant to ask: where is my
booking, what is my balance, has the agent replied. A search box with a
personality is not a moat. **Why now.** The assistant is the most
differentiated surface RentMe has and currently the least useful one to a
signed-in user with a live trip. Competitors can copy a chat box in a week;
they cannot copy a chat box that knows your trip, your gate code and your
balance. **Approach.** Keep R-37's rule exactly and satisfy it a different
way: add tools that take no identity argument at all, `my_upcoming_bookings`,
`my_wallet_summary`, `my_unread_threads`. Each executes against the caller's
own RLS-bound client resolved server side from the session inside the route,
so the model cannot name another person's row even if a crafted prompt asks
it to, and each returns a deliberately narrow projection: never an account
number, never a message body, never R-73's `booking_access`. Every one of
them refuses outright when the session is signed out, before any tool result
is produced. **Phase.** C. **Effort.** M.

---

### B. Lower value, 30 items

Genuine improvements that are not urgent. Quality of life, secondary
surfaces, content and discoverability, analytics depth, agent tooling.

#### R-78. No route has a `loading.tsx`

**Problem.** There is not one `loading.tsx` anywhere under
`apps/web/src/app`. `/search`, `/listing/[id]`, `/bookings`, `/saved` and
`/notifications` are all async server components that now hit Supabase, so a
tap on a city chip holds the previous screen with no acknowledgement until the
query returns, which on a 3G connection reads as a dead button.
**Why now.** Not urgent, but it is the cheapest perceived-performance win
available and it gets harder to retrofit as each route grows.
**Approach.** A `loading.tsx` per app route rendering the same glass card
skeletons R-117 defines, using the existing `.nf-card` material so the
transition is a fade rather than a flash. `/search` gets a results-grid
skeleton, `/listing/[id]` a gallery-and-facts skeleton, `/wallet` deliberately
gets none, because a skeleton where a balance goes invites misreading.
**Phase.** F. **Effort.** S.

#### R-79. Discovery has every filter except the one about dates

**Problem.** `lib/listings/search-params.ts` now carries budget, bedrooms,
bathrooms, party size, amenities, instant book and verified-only, all in the
address bar, all counted honestly by `matchesFacts` through `FilterDrawer`.
It carries no check-in and no check-out. `getBlockedDates()` and
`public.availability` exist, so a guest can be shown a stay that cannot take
their nights and only discover it in `ReservePanel`.
**Why now.** Not urgent while the catalogue is small, but R-74's December
preset has nothing to attach to without it, and it is far cheaper to add to
`DiscoveryQuery` while the contract is newly written than after links
carrying the current parameter set are in circulation. **Approach.** Add
`checkIn` and `checkOut` to `DiscoveryQuery` and to `toFilter`/`toPoolFilter`
so they behave exactly like the existing bounds, have
`SupabaseListingRepository` exclude listings with a blocked night in the range
using the same union R-62 builds, and add the range as a first chip in
`ActiveFilters`. Dates belong in the pool filter, not the strict filter, so
the "waiting without them" count keeps working. **Phase.** E. **Effort.** M.

#### R-80. The map still plots cities, not listings

**Problem.** `RealMap` renders one pin per covered city from the
`CITY_COORDS` table hardcoded in the search page, with the city's price floor
on it. `listings.latitude` and `longitude` exist and are never populated
(R-100), so there is no listing-level geography anywhere, and the tile layer
runs on public Carto tiles with no production key.
**Why now.** Sequenced behind R-100; pointless before listings carry
coordinates. **Approach.** Once R-100 fills the columns, plot listing pins
from the same filtered result set the list view renders, clustered by
proximity so Lekki does not become one illegible blob, with the cluster
opening to the same `ListingCard`. Move the tiles to a keyed provider so the
map does not depend on an unmetered public endpoint, keeping the dark and
light tile choice the theme already drives. **Phase.** E. **Effort.** M.

#### R-81. `/search` has no pagination

**Problem.** `repo.search({ q, kind })` returns everything matching and the
page renders all of it. At seed scale that is 17 rows; at catalogue scale it
is an unbounded payload to a phone on a metered bundle, which is exactly the
user the service worker was written to protect. **Why now.** Only matters
once real listings exist in volume, which R-60 is designed to cause.
**Approach.** Cursor pagination on the repository interface (keyed on
`created_at` plus `id`, not offset, so a new listing cannot shift a page), a
Load more control that appends, and a hard page size. `recommended()` stays
uncapped since it already takes a limit. **Phase.** E. **Effort.** M.

#### R-82. `/search` runs three repository searches on every request

**Problem.** The page awaits `repo.search(toFilter(query))` for the results,
`repo.search(toPoolFilter(query))` for the filter drawer's honest counts, and
`repo.search({})` for the whole catalogue behind the city price floors, in one
`Promise.all`, on every request. The third runs even when `view` is not `map`
and the floors are never rendered. **Why now.** Harmless against the seed
repository, triples the database work per search once
`SupabaseListingRepository` is serving real volume, and search is the busiest
route on the platform. **Approach.** Keep the results and pool reads, which
both earn their keep, and lift the whole-catalogue read into one cached
computation (`unstable_cache` or an ISR-revalidated segment) since city floors
change only when listings do; skip it entirely when the request is not the map
view. **Phase.** E. **Effort.** S.

#### R-83. No `sitemap.ts` and no `robots.ts`

**Problem.** `app/manifest.ts` exists; neither `app/sitemap.ts` nor
`app/robots.ts` does. Nothing tells a crawler which of the 36 routes matter,
and nothing states the crawl rules for `/admin`, `/agent` and the app shell,
which are all currently discoverable in principle.
**Why now.** Post-launch work, but it is an afternoon and it gates every
other content item in this section. **Approach.** `app/robots.ts` disallowing
`/admin`, `/agent`, `/api` and the `(app)` shell while allowing the `(site)`
pages and the future `/season/[slug]` and city routes; `app/sitemap.ts`
enumerating the site pages plus published listings read through the
repository, with `lastModified` from `listings.published_at`.
**Phase.** F. **Effort.** S.

#### R-84. No structured data on listing pages

**Problem.** `/listing/[id]` has a `generateMetadata` implementation and no
JSON-LD. A property page with no structured data is invisible to every rich
result that would otherwise carry its price, rating and location.
**Why now.** Only worth doing once real listings are indexable, which needs
R-83 first. **Approach.** Emit `Product` or `LodgingBusiness` JSON-LD from
`/listing/[id]` built from the same `Listing` the page already has, with
`priceMinor` divided once through `formatMoney`'s own convention and the
aggregate rating taken from the `reviews` aggregate rather than the seed
value. Partner listings are excluded, since RentMe does not own that data and
`PartnerMeta.attribution` already signals whose it is. **Phase.** F.
**Effort.** S.

#### R-85. No per-listing social image

**Problem.** Sharing a listing link into WhatsApp, which is how property
links actually travel in Nigeria, produces whatever the root layout supplies.
`ListingCard` renders a gradient fallback tile with a deterministic `hue`, so
the ingredients for a decent card image exist. **Why now.** Cheap, and it
compounds with every share once R-60 fills the catalogue.
**Approach.** An `opengraph-image.tsx` under `app/(app)/listing/[id]/`
rendering the cover photo, title, area, city and price on the brand canvas
using the sampled palette anchors, falling back to the `hue` gradient when the
listing has no photo. **Phase.** F. **Effort.** S.

#### R-86. No indexable city pages

**Problem.** `/search` is explicitly `robots: { index: false, follow: false }`
and the `CITIES` list in that file (Lagos, Abuja, Port Harcourt, Ibadan,
Enugu, Calabar) is the only place the covered cities are enumerated as
destinations. There is no page a search engine can rank for "shortlet in
Lekki". **Why now.** Sequenced behind R-83 and shares its structure with
R-76's season routes. **Approach.** `/city/[slug]` reading the same
repository, seeded from `CITY_COORDS` and the `states` table, each page
carrying real content: the city's stock, its price floor, its areas, and the
`RealMap` centred on it. Link them from `PopularDestinations` and
`CoverageMap` on the landing page, which already exist. **Phase.** F.
**Effort.** M.

#### R-87. Grow the help centre from what people actually ask

**Problem.** `lib/support/faq.ts` answers from a hand-written client-side
store, and `support_tickets` is now accumulating the real questions that store
failed to answer. Nothing connects the two. **Why now.** Only useful once
ticket volume is real, but every ticket answered without feeding the FAQ is a
ticket the team will answer again. **Approach.** A recurring review surfaced
at `/admin/support`: tickets grouped by the FAQ match that failed, with a
one-click "this should be an FAQ entry" that drafts the entry. Then the
`(site)/help` page renders the same store so the public page and the in-app
chat can never diverge. **Phase.** F. **Effort.** M.

#### R-88. The assistant sidebar still cannot see persisted threads

**Problem.** `components/app/assistant/threads.ts` reads and writes
`localStorage` under `nf_ai_threads`. The route already persists to
`ai_conversations` and `ai_messages` for signed-in callers, so the rows exist
and nothing ever fetches them: a thread does not reappear on a second device
or after clearing storage. R-38 covers writing them; this is the read.
**Why now.** Lower value than it looks, because the thread that matters is
usually the current one, but it is the one place the assistant visibly forgets
something it demonstrably knows. **Approach.** A server read of the caller's
`ai_conversations` with the last message preview, merged with the local store
by id in `AssistantSidebar`, local-only threads keeping their existing offer
to import on sign-in. **Phase.** C. **Effort.** S.

#### R-89. Let the assistant act, not only answer

**Problem.** The assistant can find a listing and link to it and cannot do
the two things a person immediately wants next: save it, or remember the
search. `toggleSave()` and `saved_searches` both exist.
**Why now.** After R-77, not before: the context tools are what make an
acting assistant coherent. **Approach.** Two more no-identity-argument tools,
`save_listing` and `remember_search`, executing against the caller's own
RLS-bound client, each returning a plain confirmation the model reads back.
Both refuse when signed out. `remember_search` writes `saved_searches` and so
gives R-14's alerting foundation its first real writer. **Phase.** E.
**Effort.** S.

#### R-90. Let the assistant answer in Nigerian Pidgin

**Problem.** `SYSTEM_PROMPT` in `app/api/assistant/route.ts` specifies
British spelling and a warm brief voice, and the platform ships four locales,
none of which is the language a very large share of the audience is most
comfortable being helped in. **Why now.** Purely additive and needs no new
translation files, unlike the yo/ha/ig review R-08 covers.
**Approach.** Detect Pidgin in the incoming turn and add a single system
instruction permitting a Pidgin reply when the user writes in it, while
keeping listing names, prices and route paths verbatim. No dictionary work and
no change to `packages/i18n`, since this is generated voice rather than
interface copy. **Phase.** F. **Effort.** S.

#### R-91. Hand a stuck assistant conversation to support

**Problem.** `SupportChat` escalates into a real `support_tickets` row with
`fileSupportTicket()`. The assistant, which is where a confused person
actually is, has no escalation at all: it can only say it cannot help.
**Why now.** Small, and it converts the assistant's honest refusals into
resolved problems rather than abandoned sessions. **Approach.** An escalation
control in `AssistantChat` that calls `fileSupportTicket()` with the last few
turns attached as the ticket body and the `ai_conversations` id in the
metadata, so `/admin/support` can read the whole context. Rate-limited on the
same `consume()` bucket the route already uses. **Phase.** F. **Effort.** S.

#### R-92. Bulk actions on the admin listing queue

**Problem.** `reviewListing()` handles one listing per call, and
`/admin/listings` renders one decision per row. R-60's bulk intake will
produce sixty submissions from one agency in an afternoon, all with the same
photographer and the same estate. **Why now.** Sequenced directly behind
R-60; pointless before it. **Approach.** Multi-select in the queue calling
`reviewListing()` per selection inside one server action, writing one
`audit_log` row per listing (never one summary row, since the audit table's
whole value is per-entity granularity) and one notification per agent rather
than one per listing. Reject and request-changes keep their mandatory note.
**Phase.** F. **Effort.** M.

#### R-93. Queue ageing, so nothing rots quietly

**Problem.** `getQueueCounts()` returns counts. A count of eleven open flags
does not distinguish eleven arrived this morning from one that has been open
for nine days, and `message_flags`, `risk_alerts`, `reports` and
`support_tickets` all carry `created_at` already.
**Why now.** Matters as soon as volume is real, and it is a query change
rather than a schema change. **Approach.** Add oldest-open age to each queue
count on `/admin`, sort every queue oldest first by default rather than
newest, and colour past a threshold using the existing `alert_severity`
palette. **Phase.** F. **Effort.** S.

#### R-94. Reviewer assignment on the admin queues

**Problem.** R-48 adds `reviewed_by` and `resolved_by`, recorded at the moment
of decision. Nothing records who is currently working an item, so two admins
open the same flag and one of them wastes the effort.
**Why now.** Only once there is more than one admin, which is why it sits
here rather than in section A. **Approach.** A nullable `claimed_by` and
`claimed_at` on the four queue tables, claimed on open and released on
decision or after a short timeout, shown as an avatar in the row. The claim is
advisory, never an authorisation boundary: `requireAdmin()` remains the only
gate. **Phase.** F. **Effort.** S.

#### R-95. `/agent/analytics` is a placeholder with nothing to show

**Problem.** `app/agent/analytics/page.tsx` renders `AgentComingSoon`, and
even if it did not, there is no view or impression data anywhere to render.
**Why now.** Depends on R-102's event table, and agents will ask for it the
week after R-58 gives them bookings to compare against.
**Approach.** Once R-102 exists, an analytics surface per listing: views,
saves from `saved_items`, conversations started, reserve attempts, and
conversion between them, with a comparison against the median for the same
city and property type so the number means something. Read only, no
projections, no promises. **Phase.** F. **Effort.** M.

#### R-96. `/agent/reviews` is a placeholder, and the reply belongs there

**Problem.** Another `AgentComingSoon`. R-63 adds the review and the host
reply column; the agent needs somewhere to write it.
**Why now.** Strictly after R-63. **Approach.** The agent's reviews across
all their listings, newest first, with the reply composer inline, the reply
passing through the same text classification listing copy does so an account
number cannot be posted into a public field, and a rating trend per listing.
**Phase.** F. **Effort.** S.

#### R-97. `/agent/settings` is a placeholder

**Problem.** `app/agent/settings/page.tsx` renders `AgentComingSoon`. There
is no surface for the things an agent genuinely needs to set: their public
display name and photo, the areas they cover, their working hours for R-58's
response expectations, and their notification preferences.
**Why now.** Low urgency, real friction. **Approach.** An agent settings
surface writing to `agents` and to the `profiles.settings` jsonb column added
by `20260729112539_rental_pricing.sql`, reusing `SettingsGroups` and `Toggle`
from `components/app/account/` so the two settings surfaces stay visually
identical. **Phase.** F. **Effort.** S.

#### R-98. `/agent/messages` is a placeholder while the host side is live

**Problem.** Agents receive real conversations under RLS through
`private.in_conversation` and can only read them at `/messages`, the guest
surface, with no host framing: no listing context column, no unanswered
filter, no way to see which enquiry has been waiting longest.
**Why now.** The threads work today, so this is presentation rather than
capability. **Approach.** Reuse `ConversationList` and `MessageThread` with a
host-side wrapper grouping threads by listing, an Unanswered filter reading
`conversations.last_message_at` against the last message author, and the
inspection sheet from `ListingOptionsSheet` available from the host side too.
**Phase.** F. **Effort.** M.

#### R-99. Draft autosave and resume in the listing wizard

**Problem.** `ListingWizard` persists through `saveDraft()` and the agent has
to reach the step that triggers it. A ten-step form on an Android phone over
a patchy connection loses work, and that agent does not come back.
**Why now.** Compounds with R-60: bulk intake is worthless if the manual path
still loses drafts. **Approach.** Debounced autosave on field blur into the
existing `saveDraft()` (which already upserts by id), a saved-just-now
indicator, and a resume banner on `/agent/list` listing `DRAFT` rows with the
first unmet requirement from `submitRequirements()` named on each, so the
agent knows what is left rather than reopening to find out. **Phase.** F.
**Effort.** M.

#### R-100. Address to map pin in the wizard

**Problem.** `listings` carries `latitude` and `longitude`, `draftInputSchema`
collects neither, and `RealMap` places pins from the hardcoded `CITY_COORDS`
table in the search page. Every listing in Lagos therefore sits on the same
point. **Why now.** Needed before listing-level pins and clustering are worth
building. **Approach.** A pin step in the wizard: geocode the entered address
once server side, show the result on a small `RealMap` instance, and let the
agent drag to correct it, writing `latitude` and `longitude`. Store the
approximate point only for the public projection, since an exact pin before
inspection is the same disclosure R-73 is careful about. **Phase.** F.
**Effort.** M.

#### R-101. Sweep orphaned uploads out of `listing-photos`

**Problem.** `removePhoto()` and `deleteListing()` both remove storage objects
alongside their rows, which is right. What neither can catch is a file
uploaded by the wizard whose `addPhoto()` call never completed, or whose agent
closed the tab: the object sits in a public bucket forever with no row
pointing at it. **Why now.** Grows slowly and quietly, and R-21's runway makes
it a few lines. **Approach.** A weekly job listing objects under
`listing-photos` older than a day with no matching `listing_photos.storage_path`
and removing them, writing the count to the `job_runs` table R-21 defines.
**Phase.** F. **Effort.** S.

#### R-102. There is no first-party event table

**Problem.** Nothing records a search, a listing view, a card impression or a
reserve attempt that failed. Every recommendation in this section that needs
behaviour (R-95, R-57's search and view figures, R-20's heatmap) is blocked on
its absence, and `sortListings()`'s "recommended" order is currently a
placeholder because there is no signal to rank on.
**Why now.** Cheap now, and every week without it is a week of behaviour that
cannot be recovered later. **Approach.** One append-only `events` table
(kind, subject id, session id, user id nullable, `params jsonb`,
`created_at`), written from server components and server actions only, never
from the client, with no personal data beyond the user id and no third-party
script involved. RLS admin-read only. Aggregate through R-57's nightly job
and retain raw rows on a short window, the way R-51 treats notifications.
**Phase.** E. **Effort.** M.

#### R-103. No Web Vitals measurement on the real audience

**Problem.** The design system leans hard on `backdrop-filter`, multi-layer
backgrounds, a conic ribbon and Ken Burns transforms. R-11 proposes a device
tier ladder to degrade them and there is no measurement to decide the tiers
by. **Why now.** R-11 cannot be built correctly without it.
**Approach.** Report `web-vitals` INP, LCP and CLS into R-102's `events`
table, bucketed by device memory, connection type and theme, so the tier
ladder is set from what mid-range Android in Nigeria actually does rather
than from a laptop. **Phase.** F. **Effort.** S.

#### R-104. Server action failures are invisible

**Problem.** The action envelope in `lib/actions/envelope.ts` returns honest
`fail()` messages to users, and several paths deliberately swallow errors as
best effort: `bestEffortEmail()`, the `catch` blocks around notification and
audit writes in `lib/admin/actions.ts`, the storage removals. Nothing anywhere
records that a swallowed failure happened. **Why now.** The swallowing is
correct behaviour and the blindness is not, and the gap widens with every new
best-effort path. **Approach.** A small server-side error sink writing to a
table or to structured logs with the action name, a correlation id and the
error, called from every existing `catch` that currently discards. Surfaced as
a count on `/admin` so a silent regression in email delivery or audit writing
is visible within a day. **Phase.** F. **Effort.** M.

#### R-105. Notification preferences per kind

**Problem.** `notification_kind` distinguishes booking, message, wallet,
listing, support and system rows, and every one of them is delivered to every
recipient with no control. `profiles.settings` is a jsonb column sitting
unused for exactly this. **Why now.** Becomes a real irritation once R-68's
timeline multiplies the volume. **Approach.** A preferences group in
`SettingsGroups` writing per-kind in-app and email switches into
`profiles.settings`, read by `private.notify` before it inserts and by the
email senders before they send. Two kinds are deliberately not switchable:
wallet movements and security notices, because silence there is a safety
problem rather than a preference. **Phase.** F. **Effort.** M.

#### R-106. A weekly performance email for agents

**Problem.** `lib/email/` is a complete Resend integration with a typed
message family, and every message it sends is transactional and reactive.
Nothing ever tells an agent how their week went, so the only reason to open
the agent surfaces is a booking notification.
**Why now.** After R-95, when there is something true to put in it.
**Approach.** A weekly job composing one message per approved agent from
R-102's aggregates and their own `bookings` and `ledger_entries` rows: views,
enquiries, bookings, earnings released, and the single most useful next action
(open December availability, add the fourth photo, answer the thread waiting
three days). Honours R-105's preferences and carries a working unsubscribe.
**Phase.** F. **Effort.** M.

#### R-107. The newest surfaces are hardcoded English

**Problem.** `packages/i18n` is the typed source of truth and four locales are
wired, yet `ListingWizard`, the `/admin` console, `WalletActions`, the
booking steps on `/bookings` and the `EMPTY_COPY` and `STATUS_BADGE` tables in
`MyBookings` all carry English string literals inline.
**Why now.** Not urgent (the admin console is an internal surface and can stay
English deliberately), but the guest-facing strings should not have drifted
out of the dictionary, and each one that stays makes R-08's native review of
yo, ha and ig less complete. **Approach.** Move the guest-facing literals into
`packages/i18n/src/locales/en.ts` and translate them across yo, ha and ig,
leaving `/admin` explicitly and deliberately out of scope with a comment
saying so, so the omission reads as a decision rather than as an oversight.
**Phase.** F. **Effort.** M.

---

### C. Small pieces, 30 items

An hour or an afternoon each. The details that separate a good product from a
great one. Each names the file it lands in.

#### R-108. `formatDate` renders in the server's timezone, not Lagos

`packages/i18n/src/index.ts formatDate()` passes no `timeZone` to
`Intl.DateTimeFormat`, so on a UTC server a date near midnight in Lagos
renders as the previous day. Four call sites have already worked around it
individually with an inline `timeZone: "Africa/Lagos"`
(`LivingCanvas`, `app/admin/_components/ui.tsx`, `/profile`, and
`lagosToday()`), which is the tell. Default `timeZone` to `Africa/Lagos` in
`formatDate` and delete the four workarounds.
**Phase.** F. **Effort.** S.

#### R-109. Booking dates render in `en-GB` whatever the locale

`lib/bookings/queries.ts` builds `DAY_LABEL` as a module-level
`Intl.DateTimeFormat("en-GB", ...)`, then `getMyBookings(locale)` takes a
`Locale` argument it never gives to it, so a Yoruba speaker's trip dates come
back English. Build the formatter from the locale's own tag the way
`formatDate` does, and set `timeZone: "Africa/Lagos"` rather than the current
`"UTC"` plus midday-anchor trick. **Phase.** F. **Effort.** S.

#### R-110. `formatMoney` silently discards kobo

`packages/i18n/src/index.ts` sets `maximumFractionDigits: 0`, so a price of
8,500,050 kobo renders as the same figure as 8,500,000. The wallet already
solved this properly with `formatKoboExact` in
`components/app/wallet/money.ts`, which returns whole and kobo parts
separately. Give `formatMoney` an `exact` option that keeps a non-zero
remainder, and use it wherever a stored amount rather than a rounded display
figure is shown: `ReservePanel`'s total, the booking receipt, the admin
listing queue. **Phase.** F. **Effort.** S.

#### R-111. A naira glyph regression test across all four locales

The supplied mockups themselves showed the N-fallback bug, where a font
without the naira glyph renders a plain N. Add a spec beside the four existing
Playwright golden paths in `apps/web/tests/` that renders a money figure
through `formatMoney` in en, yo, ha and ig and asserts the naira sign is
present in each, dark and light. Cheap, and it catches a font or `Intl` data
regression that no typecheck can. **Phase.** F. **Effort.** S.

#### R-112. Compact notation is unverified in yo, ha and ig

`formatMoney`'s `compact` option maps to `notation: "compact"` against
`yo-NG`, `ha-NG` and `ig-NG` tags. Compact notation depends on per-locale CLDR
data that may not exist for all three, in which case the output silently falls
back to something that is not what the layout was measured against. Assert the
compact output for each locale in the same spec as R-111 and pin an explicit
fallback in `formatMoney` rather than trusting the runtime.
**Phase.** F. **Effort.** S.

#### R-113. The unread badge exists in the type and is never fed

`components/app/AppRail.tsx` declares `type RailItem = { ...; badge?: number }`
and renders `{item.badge ? <span className="nf-badge nf-badge--brand">` , and
no item literal anywhere sets `badge`. `MobileTabBar` has none at all.
Feed both from one count of `notifications` where `read_at is null`, which
`loadNotifications` already reads, and let the existing realtime subscription
on `/notifications` update it. **Phase.** F. **Effort.** S.

#### R-114. `reserve()` never checks the listing's minimum stay

`listings.min_stay_nights` exists, has a `> 0` check constraint, and is read
by nothing outside `database.types.ts`. A guest can reserve one night at a
property whose agent set a three-night minimum, and the agent finds out at
`confirm()`. Add it to the select in `reserve()` and refuse below it with a
message naming the number. **Phase.** B. **Effort.** S.

#### R-115. The `23514` refusal in `reserve()` says nothing useful

`lib/bookings/actions.ts` maps a check-constraint violation to "Those dates do
not work for this stay. Check them and try again." Four different constraints
can raise it (`bookings_dates_chk`, `bookings_nights_chk`,
`bookings_subtotal_chk`, `bookings_total_chk`) and only the first two are ever
the guest's doing. Branch on the constraint name in `insertError.message` and
say the true thing: check-out must be after check-in, or an honest service
failure for the two arithmetic ones, which are our bug and not theirs.
**Phase.** B. **Effort.** S.

#### R-116. The `/bookings` explainer promises a payment step that does not run

`app/(app)/bookings/page.tsx` renders three steps, the second being "Confirm
and pay: Secure payment in naira. You are never charged early." `reserve()`
takes no payment at all (R-53), so the copy describes a flow the platform does
not perform. Either ship R-53 or reword to what actually happens, that the
request goes to the host and payment is arranged once they accept. Never leave
a payment promise standing on a path with no payment.
**Phase.** B. **Effort.** S.

#### R-117. No route has a loading skeleton shaped like its content

`.nf-skeleton` exists in `globals.css` and is used only by `ComingSoon`.
Add a `ListingCardSkeleton` matching `ListingCard`'s real proportions (the
4:3 image frame, two text lines, the price row) so R-78's `loading.tsx` files
have something honest to render, and a `BookingCardSkeleton` for
`MyBookings`. A skeleton of the wrong shape is worse than none, because the
layout jumps when the content lands. **Phase.** F. **Effort.** S.

#### R-118. Two overlays predate the focus standard the newer ones set

`FilterDrawer`, `ListingOptionsSheet` and `AgentMobileNav` all do it properly:
`role="dialog"`, `aria-modal`, focus moved in on open, focus returned to the
opener on close, and `inert` on the closed drawer. `components/site/MobileMenu.tsx`
and the mobile drawer in `components/app/AppShell.tsx` have `role="dialog"`
and `aria-modal` and none of the focus handling. Bring both up to the pattern
the other three already prove. **Phase.** F. **Effort.** S.

#### R-119. Escape does not close the app shell drawer or the mobile menu

Same two components. Every full-page drawer should close on Escape, and both
of these are reachable on a phone with a keyboard attached and on any desktop
narrow enough to show them. One `keydown` listener each, removed on unmount.
**Phase.** F. **Effort.** S.

#### R-120. `ListingCard` has no image error fallback

`ListingGallery` handles a broken photo with an `onError` that flips into the
gradient tile. `ListingCard`, which renders the same remote CDN photos far
more often, passes the URL to `next/image` with no `onError`, so a dead URL
leaves a blank frame in the middle of a results grid. Reuse the same fallback,
keyed on the listing's deterministic `hue`. **Phase.** F. **Effort.** S.

#### R-121. Chips are below the 44px touch target the icon buttons already meet

`.nf-icon-btn` in `globals.css` is documented as a 44px target. `.nf-chip` is
`padding: 0.45rem 0.9rem` at caption size, which lands near 30px tall, and
chips are the primary control on `/search` (sort, city, category) and on
`ActiveFilters`. Raise the chip to a 44px minimum hit area using padding or a
transparent `::before` inset so the visual size is unchanged and the target is
not. **Phase.** F. **Effort.** S.

#### R-122. No haptic feedback anywhere

`navigator.vibrate` appears zero times in the repository, on a platform whose
audience is overwhelmingly Android. Add a single tiny helper and call it at
exactly four moments where something irreversible completed: a booking
reserved in `ReservePanel`, a booking cancelled in `MyBookings`, a transfer
completed in `WalletDeck`, and an inspection confirmed in
`ListingOptionsSheet`. Respect `prefers-reduced-motion` and never buzz on an
error, which is what makes haptics feel cheap. **Phase.** F. **Effort.** S.

#### R-123. No keyboard shortcuts on the surfaces built for repeat use

`/admin` and `/agent` are worked all day by the same few people and have no
shortcuts at all. Two are enough to matter: `/` focuses the search input
(`#search-q` on `/search`, the queue filter on `/admin`), and `j`/`k` move
through the current queue list in `/admin/flags`, `/admin/alerts` and
`/admin/listings`. No shortcut may perform a decision; navigation only, so a
stray keypress can never approve a listing. **Phase.** F. **Effort.** S.

#### R-124. Same-month date ranges repeat the month

`labelDate` in `lib/bookings/queries.ts` produces "Fri 14 Aug to Sun 16 Aug".
For a range inside one month that should read "Fri 14 to Sun 16 Aug", and for
a range crossing a year boundary it should carry the year, which it never
does. One formatting function, used by `MyBookings`, the confirmation emails
in `lib/email/messages.ts` and R-58's host queue. **Phase.** F. **Effort.** S.

#### R-125. Pluralisation is done by hand and only in one place

`KIND_NOUN` in `lib/listings/search-params.ts` carries a proper `one`/`many`
pair per listing kind, and it is the only pluralisation contract in the
codebase. `BookingView.nights` and `guests`, the photo counts in
`lib/agent/listings-schema.ts`, and the queue counts on `/admin` all build
their plurals inline or not at all. Add one `plural(count, one, many, locale)`
helper to `packages/i18n` and route all four through it, so yo, ha and ig get
a place to differ. **Phase.** F. **Effort.** S.

#### R-126. The agent phone field takes any string

`AccountProfile` sets `inputMode="tel"` and `ApplyWizard` collects a phone
with no formatting or validation, so `08012345678`, `+2348012345678` and
`234 801 234 5678` all land as different strings for the same person, which
breaks any future OTP (R-67) and any duplicate detection. Normalise to E.164
on blur, display in the local grouping, and store one canonical form.
**Phase.** F. **Effort.** S.

#### R-127. The bank account field does not look like a bank account field

`WalletActions` sets `inputMode="numeric"` on the account number and does
nothing else. Nigerian NUBAN numbers are exactly ten digits: enforce the
length in the input, group the display as `0123 456 789` while keeping the
stored value bare, and show the resolved account name from Paystack's resolve
call inline before the transfer button becomes active, which is the single
best mis-transfer prevention available and is already how every Nigerian
banking app behaves. **Phase.** F. **Effort.** S.

#### R-128. Wallet references cannot be copied

`rm-fund-<uuid>`, `rm-wd-<uuid>` and `rm-p2p-<uuid>-out` are a real contract
the webhook routes on, and they are the string a user needs when they contact
support about a missing payment. `TransactionsSection` renders them as plain
text. Add a copy control with a confirmation, and put the same reference in
the wallet email bodies in `lib/email/messages.ts` so it is reachable without
opening the app. **Phase.** F. **Effort.** S.

#### R-129. The offline page does not say what is unavailable

`app/offline/page.tsx` is the designed screen behind `sw.js`, and `sw.js`
carries an explicit `NEVER_CACHE_SEGMENTS` list: api, admin, agent, wallet,
messages, notifications, auth. The page should name that truth in plain words
(balances, messages and bookings need a connection because a stale one would
be worse than none) rather than a generic apology, since the honesty is the
whole reason the blocklist exists. **Phase.** F. **Effort.** S.

#### R-130. `SAFETY_EDUCATION_COPY` is canon in one place and paraphrased in others

`lib/messages/education.ts` holds the owner-canonical safety wording verbatim
with a comment saying it must not be edited. `GUEST_SAFETY_LINE` and
`HOST_SAFETY_LINE` in `lib/email/messages.ts`, and the disclaimer on
`/rent`, each carry their own phrasing of the same promise. Import the one
constant everywhere it is quoted whole, and where a shorter line is genuinely
needed, define it once beside the canonical one rather than in the file that
happens to need it. **Phase.** F. **Effort.** S.

#### R-131. One `error.tsx` for the whole application

`app/error.tsx` and `app/not-found.tsx` sit at the root and are the only error
boundaries in the tree. A thrown error inside `/admin/flags` or `/agent/list`
therefore unmounts the operations navigation and drops the person onto the
consumer error screen, with no way back into the queue or the wizard they were
in. Add a segment-level `error.tsx` to `app/admin/` and `app/agent/` that
keeps `AdminNav` and `AgentNav` mounted and offers a retry, which is the whole
reason Next allows nested boundaries. **Phase.** F. **Effort.** S.

#### R-132. Admin and agent routes should carry explicit robots metadata

`/search` sets `robots: { index: false, follow: false }` deliberately. The
`/admin/*` and `/agent/*` routes set page titles and no robots directive at
all, relying entirely on R-83's future `robots.ts`. Belt and braces: set the
directive in each route's own `metadata`, so a misconfigured
`robots.ts` cannot expose an operations console.
**Phase.** F. **Effort.** S.

#### R-133. The wallet is the one surface that does not use `.nf-numeric`

`.nf-numeric` exists so figures do not jitter as their digits change, and it
is applied in around ninety places across the platform, including
`ListingCard`, `ReservePanel`, `MyBookings`, `AppRail` and every admin table.
It appears exactly zero times in `components/app/wallet/` and in
`app/(app)/wallet/`: not in `BalanceCard`, not in `TransactionsSection`, not
in `WalletActions`, not in `WalletDeck`. The flagship money surface, whose
digits change while a transfer settles and whose balance card already
shimmers, is the only place where the amounts are set in proportional
figures. Apply it to every `formatKoboExact` output.
**Phase.** F. **Effort.** S.

#### R-134. `sleeps()` invents a guest capacity the database already stores

`app/(app)/listing/[id]/page.tsx` derives capacity as
`Math.max(2, listing.bedrooms * 2)` with a comment saying guest capacity is
not a stored field yet. `listings.max_guests` exists, is collected by
`draftInputSchema`, and is checked `> 0`. Carry it on the `Listing` type and
render the real number, keeping the derivation only as the fallback for seed
catalogue entries. **Phase.** F. **Effort.** S.

#### R-135. `stateLabel` handles the FCT and nothing else handles states

`stateLabel()` on the listing page correctly renders "the FCT" rather than
"FCT State", and it is a local function on one page while
`lib/data/nigeria.ts` is the canonical list and `public.states` is the
canonical table. Move it next to the data it describes so `/search`, the
season pages from R-76 and the agent wizard all read a state the same way.
**Phase.** F. **Effort.** S.

#### R-136. The photo width refusal does not say which photo

`PHOTO_TOO_NARROW_MESSAGE` in `lib/agent/listings-schema.ts` reads "Photos
must be at least 1600px wide so they look sharp on every screen." An agent
dropping eight files at once is told that one of them failed and not which,
and `ListingWizard` measures each file's `naturalWidth` individually, so the
information exists at the moment of refusal. Name the file and its actual
width. **Phase.** F. **Effort.** S.

#### R-137. Nothing tells an agent their draft is one field from submittable

`submitRequirements()` returns exactly the unmet list, and `submitListing()`
returns it as `fieldErrors` only when the agent presses submit and fails.
`ListingsWorkspace` shows a `DRAFT` row with no indication of distance. Render
the count and the single most impactful unmet requirement on each draft row,
from the same function, so the checklist is visible before the refusal rather
than after it. **Phase.** F. **Effort.** S.
