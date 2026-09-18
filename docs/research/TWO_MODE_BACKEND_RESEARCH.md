# Two-side backend research

Agent 2 of 2, read-only. Written 18 September 2026 against the working tree at
`/home/user/read-it-well` and the live Supabase project `uccixoonmbhrnyczyigt`
(Postgres 17), queried exclusively through `list_tables` and SELECT-only
`execute_sql` over `information_schema` and `pg_catalog`. No DDL, no DML, no
git command was run. This file is the mission's only output.

The founder's direction this file serves: one backend, one account, two
frontend sides flipped by a "Switch mode" control (Property: the current
rentals and sales app; Stays: hotels, serviced apartments, guest houses,
resorts, shortlets, restaurants), and his ruling that the old partner-feed
hybrid engine moves from core scope to an optional later widener: "I don't
even think we need the old hybrid system, let's build the new one in new
style". Reconciled throughout against
`docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`,
`docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md`, `docs/API_INVENTORY.md`,
`docs/HANDOFF_04_MARKETPLACE.md` section 2 and `RECOMMENDATIONS.md` section 0
(MK-01 to MK-68), all read in full except as the honesty log states.

House rules honoured here and binding on everything proposed: additive-only
migrations; money is integer kobo bigint; no balance columns, balances are
derived; RLS on every new table; SECURITY DEFINER functions live in the
`private` schema; `is_demo` discipline designed into new tables before any
example row; British spelling; no em dashes.

---

## 1. Mode is presentation, and the schema already agrees

### 1.1 What the cookie actually is today

`apps/web/src/lib/mode.ts` plus `apps/web/src/lib/mode.constants.ts`: the
`nf_mode` cookie holds a `Mode` of `"personal" | "agent"`, default
`"personal"`. Its own comment states the law this whole section rests on:
"the mode is a view preference, never an authorisation". Note precisely: the
existing `nf_mode` cookie is the WORKSPACE mode (guest versus agent console),
not the Property/Stays side. The side flip is a second cookie of exactly the
same pattern (say `nf_side: "property" | "stays"`, its own constants module,
server-readable before first byte the way `nf_view` is in
`apps/web/src/lib/search/memory.ts`). No `nf_side` or side cookie exists yet
anywhere in `apps/web/src` (grep, 18 September).

### 1.2 Verified: the backend needs no user-level side column

Live-verified from `list_tables` and column enumeration:

- `public.profiles` carries identity and preference columns only; no side,
  mode or market column exists on it (live-verified column list; see honesty
  log for the one caveat). One `auth.users`, one `profiles` row, one
  `user_roles` set serve both sides.
- `public.wallets` is one row per user with NO balance column (table comment
  live-verified: balance derived via `private.wallet_balance` over COMPLETED
  `wallet_entries`). Money is side-blind by construction; a wallet entry never
  knows which side spent it beyond its `metadata`.
- `public.notifications` is one row per recipient per event
  (`user_id, kind, title, body, href, read_at`), written by triggers and the
  service role only (table comment, live-verified). Nothing about it is
  per-side except where `href` points.
- Sessions: `resolveSession()` (`apps/web/src/lib/actions/session.ts`) is
  side-ignorant; every server action already works this way.

Conclusion, and it is firm: the side is a cookie the layout reads, and not
one row of user, money or notification data forks on it. Do not add a
`profiles.side` column, a per-side wallet, or a per-side notification feed.

### 1.3 Where the side legitimately leaks into data, exhaustively

Five places, each specified:

1. **Catalogue projection `entity_kind`.** The planned
   `catalogue_entries.entity_kind` (MARKETPLACE_ARCHITECTURE_RESEARCH section
   2.5) is the one durable "which shelf" fact. The Property side reads
   listing-kind entries; the Stays side reads accommodation and restaurant
   entries. This is entity taxonomy, not user state, and it is correct for it
   to exist.
2. **Notification deep links.** `private.notify(user, kind, title, body,
   href)` is the single fanout primitive (live-verified in
   `private.notify_message`, `private.notify_booking_change`,
   `private.notify_reservation`). `href` values today are paths like
   `/bookings`, `/agent/bookings`, `/messages/<id>`. Under two sides the path
   must be sufficient to open the right side: either stays surfaces get
   side-distinct paths (`/stays/bookings`, recommended) or the app shell must
   derive the side from the path and set `nf_side` on navigation. Rule to
   adopt: the URL wins over the cookie; tapping a stays notification while the
   cookie says property flips the cookie, never 404s. No schema change needed;
   `href` already carries it.
3. **Saved lists.** `public.saved_items` is `(user_id, listing_id,
   created_at)` with `listing_id NOT NULL` (live-verified). It cannot save an
   accommodation or a restaurant business. Additive fix in the messaging era
   of this plan: either a sibling table (`saved_places`: `user_id`,
   `entity_kind`, `entity_id`) or nullable per-kind FKs on `saved_items` with
   a CHECK that exactly one is set. Either way the Saved surface filters by
   entity kind per side. Recommendation: sibling table keyed on the catalogue
   projection's `entity_kind`, so Saved reads one shape.
4. **Recently viewed and recent searches.** Client-side only,
   `apps/web/src/lib/search/memory.ts` (localStorage plus the `nf_view`
   cookie). Namespacing per side is a frontend storage-key change, zero
   backend.
5. **The agent gate, unchanged.** `mode.ts`'s KNOWN_GAPS note stands: agent
   routes gate on approved agent status, never on any cookie. The stays host
   console must inherit exactly this posture: `businesses.owner_id` and RLS
   decide, `nf_side` and `nf_mode` only decide what is painted.

Everything else (auth, wallet, messages inbox, profile, support) is one
surface rendered under whichever side's chrome is active.

---

## 2. Live schema ground truth

75 base tables in `public`, RLS enabled on all 75 (live `list_tables`, 18
September 2026, matching MARKETPLACE_ARCHITECTURE_RESEARCH section 2.1).
Compact shapes for the tables this mission turns on; every claim below is
from `information_schema`/`pg_catalog` this session.

### 2.1 inspection_requests

Columns: `id uuid pk`, `listing_id uuid NOT NULL`, `requester_id uuid NOT
NULL`, `lister_id uuid NOT NULL`, `conversation_id uuid NULL`, `state
inspection_state NOT NULL default 'REQUESTED'`, `requested_at timestamptz NOT
NULL`, `slot_at timestamptz NULL`, `note text`, `lister_note text`,
`responded_at timestamptz NULL`, `created_at`, `updated_at`.

Enum `inspection_state`: `REQUESTED, CONFIRMED, PROPOSED, DECLINED,
COMPLETED, WITHDRAWN` (live-verified).

Constraints: `inspection_requests_parties_differ` CHECK (`requester_id <>
lister_id`); `inspection_requests_slot_when_confirmed` CHECK (state <>
'CONFIRMED' OR slot_at IS NOT NULL).

RLS (5 policies, live-verified): insert by requester only, with `state =
'REQUESTED'` and an EXISTS against `listings` in the check; select by either
party; update by either party (legality delegated to the trigger); admin ALL;
admin select. No DELETE policy, deliberately (withdrawing is a state, not a
vanishing).

Triggers (live-verified): `private.set_inspection_lister` BEFORE INSERT
(resolves the lister from the listing, overwriting whatever the caller
supplied); `private.guard_inspection_transition` BEFORE UPDATE (full body
read live, section 4.1); `private.freeze_inspection_parties` BEFORE UPDATE;
`refuse_transaction_on_demo_listing`; `set_updated_at`. **There is NO notify
trigger on inspection_requests.** Inspection transitions currently emit no
notifications at all (live-verified against the trigger list).

Indexes: pk; `(lister_id, state, created_at DESC)`; `(requester_id, state,
created_at DESC)`; `(listing_id, created_at DESC)`; `(conversation_id)`.

### 2.2 Threads and messages

`conversations`: `id pk`, `guest_id uuid NOT NULL`, `agent_id uuid NOT NULL`,
`listing_id uuid NULL`, `last_message_at NOT NULL default now()`,
`created_at`. UNIQUE `(guest_id, agent_id, listing_id)`. **There is no thread
type or context column.** A thread binds to a listing by the nullable
`listing_id`; participants are exactly the two uuid columns (table comment:
"a two-party thread between a guest and an agent"). RLS: insert when caller
is either party; select by either party or admin. Indexes on `agent_id`,
`listing_id`, plus the unique triple.

`messages`: `id pk`, `conversation_id NOT NULL`, `sender_id uuid NOT NULL`,
`body text NOT NULL`, `read_at NULL`, `created_at`. RLS: insert requires
`sender_id = auth.uid()` AND `private.in_conversation(conversation_id)`;
select via `in_conversation` or admin; **no participant UPDATE policy**
(read-marking goes through the service role after an RLS membership proof,
`apps/web/src/lib/messages/actions.ts` `markThreadRead`). Triggers:
`private.notify_message` AFTER INSERT (bumps `conversations.last_message_at`
AND writes the recipient's notification row, body truncated to 120 chars,
href `/messages/<id>`; full body read live) and `private.scan_message` AFTER
INSERT (safety pipeline into `message_flags`). Index `(conversation_id,
created_at)`.

`message_attachments`: `message_id`, `storage_path`, `width`, `height`.
`inspection_confirmations`: `(conversation_id, user_id, listing_id,
confirmed_at)`, the in-chat "I viewed it" record, distinct from
`inspection_requests`.

### 2.3 bookings

Columns: `id pk`, `listing_id uuid NOT NULL`, `guest_id NOT NULL`,
`check_in date`, `check_out date`, `nights int`, `adults int default 1`,
`children int default 0`, `price_per_night_minor bigint`,
`cleaning_fee_minor bigint default 0`, `service_fee_minor bigint default 0`,
`subtotal_minor bigint`, `total_minor bigint`, `currency text default 'NGN'`,
`status booking_status default 'PENDING'`, `during daterange NULL`,
`guest_name/phone/email text NULL` (shape-checked), timestamps.

Enum `booking_status`: `PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED`
(live-verified).

Arithmetic is constraint-enforced (all live-verified): `nights = check_out -
check_in`; `subtotal = price_per_night * nights`; `total = subtotal +
cleaning + service`; all `>= 0` checks. The exclusion constraint:
`bookings_no_overlap EXCLUDE USING gist (listing_id WITH =, during WITH &&)
WHERE (status IN ('PENDING','CONFIRMED'))`.

RLS: guest insert (own, PENDING only), guest select, host select via
`listings JOIN agents`, admin ALL. Triggers:
`refuse_transaction_on_demo_listing`, `private.notify_booking_change` AFTER
INSERT OR UPDATE (full body read live: INSERT notifies host and guest; status
changes notify on CONFIRMED, CANCELLED both sides, COMPLETED guest; NO_SHOW
sends nothing today), `set_updated_at`. **No transition-guard trigger exists
on bookings** (live-verified trigger list), confirming the research file:
MK-13 remains open and is the cheapest big win.

### 2.4 reservations

`id pk`, `listing_id NOT NULL`, `guest_id NOT NULL`, `party_size int CHECK
1..50`, `reserved_for timestamptz`, `status booking_status default PENDING`
(reuses the booking enum), `note <= 500 chars`, `responded_at`, timestamps.
Unique partial index `(listing_id, guest_id, reserved_for) WHERE status <>
'CANCELLED'`. Triggers: `private.reservation_is_valid` BEFORE INSERT OR
UPDATE (first-party published restaurant listings only, no past times) and
`private.notify_reservation` AFTER INSERT OR UPDATE (full body read live:
Lagos-pinned times, host notified on request, guest on CONFIRMED and
CANCELLED, deliberately silent on who cancelled). RLS: authenticated guest
insert/select/update own; host select/update via listings-agents join.

### 2.5 Money surfaces

`wallets`: `(id, user_id, currency default 'NGN', timestamps)`, no balance
column. `wallet_entries`: `(wallet_id, kind wallet_entry_kind, direction
credit|debit, amount_minor bigint > 0, reference UNIQUE, status
wallet_entry_status default PENDING, metadata jsonb)`, with the live CHECK
binding kind to direction (deposit/refund/transfer_in/escrow_release/
escrow_refund credit; withdrawal/payment/transfer_out/escrow_hold debit).
RLS: select own via wallet join, select admin; no client write policies.

`payout_accounts`: `(id, agent_id FK agents NOT NULL, bank_name,
account_number CHECK ten digits, account_name, is_default, bank_code NULL,
resolved_account_name NULL, resolved_at NULL, created_at)`, UNIQUE
`(agent_id, account_number)`. RLS: owner ALL via agents join, admin read.
**Agent-scoped only**: an ordinary user has nowhere to file a bank account.
No `recipient_code` column exists anywhere in `public` (live-verified: zero
columns matching `%recipient%`); `apps/web/src/lib/wallet/actions.ts` calls
`createTransferRecipient` at withdrawal time (line ~512) and the code is used
once and discarded.

`transactions`: `(booking_id, provider default 'paystack', provider_ref,
amount_minor, currency, status transaction_status)`.

### 2.6 Saved cards: nothing exists

Live-verified: zero columns in `public` matching `%authoriz%` or `%card%`.
`apps/web/src/lib/payments/paystack.ts` (read in full, 483 lines) implements
initialize, verify, list charges, webhook HMAC SHA-512 verification, transfer
recipient, transfer, verify transfer, bank list and account resolve, and has
**no `charge_authorization` call and no storage of any authorization
object**. Every charge today is a fresh hosted checkout. Section 6 designs
the standard version.

---

## 3. Context-typed messaging

### 3.1 The three thread kinds the two-side product needs

1. **Rental threads** (today's behaviour): guest and agent about a listing,
   with the inspection tooling (`inspection_confirmations`, and the section 4
   accept-in-thread flow).
2. **Restaurant reservation threads**: chat attached to one reservation, so
   "we are running 20 minutes late" has somewhere to live.
3. **Hotel booking threads**: an optional contact channel attached to one
   booking, whose page also renders booking-step events as a timeline.

### 3.2 The schema decision: typed context on the one table, per-kind FKs

Keep `public.conversations` as the one threads table. Additive migration:

- New enum `thread_context`: `listing | reservation | booking` (a general
  thread with `listing_id NULL` stays `listing`; today's rows all map to it).
- `context_kind thread_context NOT NULL DEFAULT 'listing'` (default makes the
  migration additive against 7 live rows and every existing writer).
- `reservation_id uuid NULL` FK `reservations(id)`, `booking_id uuid NULL`
  FK `bookings(id)`.
- CHECK, the honest shape:
  `(context_kind = 'listing' AND reservation_id IS NULL AND booking_id IS NULL)
   OR (context_kind = 'reservation' AND reservation_id IS NOT NULL AND booking_id IS NULL)
   OR (context_kind = 'booking' AND booking_id IS NOT NULL AND reservation_id IS NULL)`.
- Partial unique indexes: `UNIQUE (reservation_id) WHERE reservation_id IS
  NOT NULL` and `UNIQUE (booking_id) WHERE booking_id IS NOT NULL` (one
  thread per transaction object). The existing `(guest_id, agent_id,
  listing_id)` unique triple keeps governing listing threads; note NULLs are
  distinct under it, which is already today's semantics.

Why both a kind column and per-kind FKs rather than a bare
`(context_kind, context_id)` pair: a uuid with no FK is a foreign key the
database cannot enforce, and every join back to the transaction object would
be polymorphic. The CHECK gives one branch point for rendering; the FKs give
integrity and index-backed joins. This is also the shape the platform already
chose for the analogous problem (`reservations.business_id` plan, research
section 2.3).

### 3.3 RLS: no policy change required

The participant model stays `guest_id` and `agent_id` on the row.
`conversations_insert` already admits either party;
`private.in_conversation()` keys on the conversation row, not the listing.
When a reservation or booking thread is created, the server action resolves
the counterpart (host user via `listings JOIN agents`, or later
`businesses.owner_id`) exactly the way `startConversation` does today,
service role for the agents read, then inserts with both parties set. One
addition worth making in the same migration: a BEFORE INSERT trigger
validating that `booking_id`/`reservation_id` actually belongs to the two
parties on the row (the `reservation_is_valid` posture: the rule lives in the
database).

### 3.4 System and step messages: do not relax messages.sender_id

`messages.sender_id` is NOT NULL and RLS insert requires it to equal
`auth.uid()`. The tempting design (nullable sender plus a `kind` column for
system rows) is a NOT NULL relaxation on a live chat table, the exact class
of change this platform gates. It is also unnecessary:

- **Booking-step events already have a home**: `booking_state_events`
  (append-only history) plus the MK-13 trigger-written events. The booking
  thread page interleaves human `messages` rows with the booking's state
  events by timestamp at read time. A step event is not a message; storing it
  as one would let it be "replied to" and would double-write history.
- **Reservation threads** need no system rows in v1: the notify triggers
  already tell each party what changed, and the thread is for words.
- Human versus system is therefore distinguished by SOURCE TABLE, not by a
  sender-null convention. If a later need for in-thread system text appears
  (say, "policy reminder" cards), add an additive `kind message_kind NOT NULL
  DEFAULT 'human'` column then, written only by the service role, with
  sender_id pointed at a platform actor; decide it when it is real.

### 3.5 What survives unchanged, verified against the code

- `apps/web/src/lib/messages/schema.ts`: all six schemas survive verbatim;
  `startConversationSchema` stays; two new schemas are added beside it
  (`startReservationThreadSchema`, `startBookingThreadSchema`, each one uuid).
- `apps/web/src/lib/messages/repository.ts`: unchanged (it is the empty
  signed-out repository; real reads live in `live.ts`).
- `apps/web/src/lib/messages/actions.ts`: `sendMessage`, `attachImage`,
  `markThreadRead`, `markInboxRead`, `confirmInspection` key only on
  `conversation_id` and survive byte-identical. `startConversation` survives
  for listing threads; two sibling actions are added for the new contexts,
  reusing its counterpart-resolution and 23505 race pattern. The daily
  new-conversation limiter applies to listing threads; reservation and
  booking threads are keyed to a transaction the caller already holds, so
  they bypass the scrape limiter by construction.
- `private.notify_message` survives unchanged: recipient derivation reads
  `guest_id`/`agent_id`, which every context populates. Only its hardcoded
  href `/messages/<id>` needs the section 1.3 side-awareness treatment when
  stays paths land (one function replacement, additive in effect).
- `live.ts`, `useRealtime.ts` filter by conversation id and survive; the
  inbox list gains a context badge from the new column.

Migration is additive-only; nothing is renamed; every existing row is a
`listing` context by default.

---

## 4. Inspections to CLOSED

### 4.1 The current machine, from code and the live guard

Flow (all in `apps/web/src/lib/inspections/actions.ts`, 239 lines, plus the
live `private.guard_inspection_transition` body, read in full):

- `requestInspection`: insert REQUESTED; `private.set_inspection_lister`
  resolves the lister from the listing; RLS refuses unpublished listings and
  own-property requests; the demo trigger refuses demo listings; max 90 days
  ahead.
- `answerInspection` (lister): CONFIRMED (slot defaults to the requested
  time), PROPOSED (slot required), or DECLINED; guard stamps `responded_at`.
- `acceptProposedTime` (requester): PROPOSED to CONFIRMED only, slot never
  re-supplied so a requester cannot accept a different time.
- `closeInspection`: requester WITHDRAWN from any live state; either party
  COMPLETED, but only from CONFIRMED.
- Guard: DECLINED, COMPLETED, WITHDRAWN are terminal and immutable; illegal
  edges raise `check_violation`; a null `auth.uid()` (service role) passes.
- Reads (`queries.ts`): `readInspectionsForLister` /
  `readInspectionsForRequester`, same rows, two `eq` filters under RLS,
  open-first sort in JS; `readOpenInspectionFor(listingId)` treats
  REQUESTED, PROPOSED, CONFIRMED as live. `types.ts` `OPEN_STATES` is
  `[REQUESTED, PROPOSED]`, meaning "somebody must act", with `waitingOn`
  naming whose move it is.

### 4.2 The OPEN versus CLOSED lifecycle, honestly

The founder's ask ("closed = inspection happened or deal done") needs no new
enum and no new state machine. The six live states already partition:

- **OPEN** (user-facing): `REQUESTED`, `PROPOSED`, `CONFIRMED`. Within open,
  the existing `waitingOn` distinction survives: REQUESTED and PROPOSED are
  "action needed", CONFIRMED is "scheduled".
- **CLOSED** (user-facing): `COMPLETED` (it happened), `DECLINED`,
  `WITHDRAWN`. Terminality is already trigger-enforced.

One honest addition for "deal done": an additive `outcome text NULL CHECK
(outcome IN ('inspected','deal_done','no_deal'))` column, writable only
alongside the transition to COMPLETED (enforced in the guard). "Deal done" is
a closure REASON on the completed state, not a seventh state; inventing a
`DEAL_DONE` state would fork every `Record<InspectionState, ...>` in the
components (the exact enum-widening wound commit `3044c2aa` documents). If
the founder wants zero schema change, COMPLETED alone is defensible and
`outcome` can wait; the column is the recommendation because the review and
tenancy seams will want to know which kind of completion it was.

Keep `OPEN_STATES` in `types.ts` exactly as is (it answers "whose move"), and
add `isClosed(state) = state in (DECLINED, COMPLETED, WITHDRAWN)` as the
user-facing bucket. The inspections page for both roles is the existing
`readSide()` query shape, resorted into Open and Closed sections; the
`(lister_id, state, created_at DESC)` and requester twin indexes already
serve it (live-verified).

### 4.3 Accept from inside the message thread

The row already carries `conversation_id uuid NULL` with an index
(live-verified), and today nothing populates it (no writer in
`lib/inspections`). Design, additive:

1. On `requestInspection`, find-or-create the guest-agent-listing
   conversation (reuse `startConversation`'s logic) and stamp
   `conversation_id` on the inspection row. No schema change.
2. The thread page reads the open inspection for its conversation
   (`inspection_requests where conversation_id = X and state in open`) and
   renders an inspection card with the lister's three answers and the
   requester's accept, wired to the EXISTING actions `answerInspection` and
   `acceptProposedTime`. Accept from the thread writes the same row through
   the same guard; the inspections page and the thread cannot disagree
   because there is one row and one state machine.
3. Nothing new is authorised: RLS update-by-party plus the guard already
   bound who may do what.

### 4.4 Notifications per transition, on the existing architecture

The architecture to reuse is live-verified: `private.notify(user_id, kind,
title, body, href)` called from AFTER triggers (`notify_message`,
`notify_booking_change`, `notify_reservation` all read in full), writing
`public.notifications`, RLS select-own, unread partial index. Inspections
currently send NOTHING (section 2.1). One additive migration:

- `private.notify_inspection_change()` AFTER INSERT OR UPDATE trigger on
  `inspection_requests`, exactly the `notify_reservation` pattern (Lagos
  times, silence on non-status updates).
- Fanout table: INSERT notifies the lister ("Inspection requested",
  href to the agent inspections queue). CONFIRMED notifies the requester
  (and the lister when it was the requester accepting a proposed time).
  PROPOSED notifies the requester ("Another time offered"). DECLINED
  notifies the requester. WITHDRAWN notifies the lister. COMPLETED notifies
  both (the review seam later hangs here).
- `notification_kind` is a live enum (`booking, message, wallet, listing,
  agent, support, system, social`). Reuse `listing` for inspection events in
  v1 rather than widening the enum; if the product wants a distinct icon, an
  additive `inspection` enum value is a one-line migration later. Widening
  an enum means walking every reader (the `3044c2aa` lesson), so do not do
  it casually.
- hrefs: requester side `/bookings` (where inspections render today per the
  `revalidatePath` calls in actions.ts), lister side `/agent/inspections`.
  Both are Property-side paths; no side ambiguity, inspections are
  Property-only.

---

## 5. The stays schema under "no old hybrid"

### 5.1 What stands unchanged from MARKETPLACE_ARCHITECTURE_RESEARCH

The first-party stays core (research section 2.3) survives intact, because
none of it depended on partner rows: `cancellation_policies`, `businesses`,
`accommodations` (+ photos, amenities joins), `room_types`, `units`,
`rate_plans`, `rate_calendar`, `room_inventory` with
`private.reserve_room_nights` and the two-tap oversell probe, the `bookings`
extension with the transition-guard trigger, `restaurant_profiles`,
`service_windows`, the `reservations.business_id` branch in
`reservation_is_valid`, `landmarks`, `catalogue_entries` with `unaccent` and
the tsvector, and the enums `business_kind`, `meal_plan`, `landmark_kind`.
The one-search query path (research 3.5) and the Postgres-first search
verdict stand word for word.

### 5.2 What moves to the later widener phase

Everything whose only customer is a partner feed, i.e. MK-33 to MK-42 in
full: the `lib/inventory` restoration (registry, envelope, http, dedupe),
`hybrid_hotels`/`hybrid_restaurants` flag re-insertion, `places_cache`,
`partner_stay_intents` and the prebook route, the source label component,
the fulfilment-honest CTA, provider health admin, freshness policy, the
partner image hosts decision, referral commission recording plus the
`revenue_source + 'referral_commission'` enum addition, and the
`fx_snapshots`/`partner_price_conversions` pair (already deferred in the
research). Also deferred: HANDOFF_05 Phase C entirely, founder decisions 2,
3, 4 (Places for restaurants), 5, and ADR-015's commit becomes non-urgent
(nothing renders a partner row in v1, so no code comment goes stale). The
vault stays in git history, catalogued in HANDOFF_04 section 2; nothing is
lost by waiting, and restoration remains "a new migration, not a revert".

### 5.3 What gets SIMPLER with partner rows out of v1

1. **`source_kind` collapses to a default.** Keep the enum and the
   `businesses.source` column (defaulting `'first_party'`) so the widener is
   additive later, but v1 may add `CHECK (source = 'first_party')` as a
   temporary tightener only if written as droppable; simpler still, ship the
   column, default it, and let the existing owner CHECK ((source =
   'first_party') = (owner_id IS NOT NULL)) make `owner_id` effectively NOT
   NULL for every v1 row. **Defer `provider_name`, `provider_ref` and
   `attribution` columns entirely**: they have no first-party meaning, and
   adding columns later is the platform's cheapest migration class.
2. **`fulfilment_mode` fixes to one value.** Keep the column (the Model 2
   seam HANDOFF_04 section 5 demands), default `'vallo'`; the source-implies-
   vallo CHECK is trivially true in v1. No branching code ships.
3. **No dedupe pass in v1 search.** The merged shelf is first-party only, so
   the 150-metre-plus-name-token rule, the strength ladder and the comparison
   classes stay in the vault. The ranking law simplifies to: dated inventory
   first for dated queries, then the standing catalogue order; "first party
   above partner at equal relevance" is vacuously satisfied.
4. **No provider budget, no 2.5s race, no kill-switch flags** on the search
   path. The one search is one SQL statement family against local tables
   under RLS.
5. **`catalogue_entries.source` and `verified`** still ship (cheap, and the
   projection is rebuildable), but every v1 row is `first_party`.
6. **`reservation_is_valid`'s first-party-only law needs no partner
   branch** in v1; the `business_id` branch it gains checks kind, status and
   (already) first-party.

### 5.4 The one founder-gated migration, restated crisply

**Relax `public.bookings.listing_id` from NOT NULL to NULL.** It is the only
non-additive change in the entire two-side v1. It touches the money path's
table (`private.pay_booking_from_wallet`, `transactions`, `ledger_entries`,
`booking_refunds`, reviews and the notify trigger all point at `bookings`).
The change loses no data, every existing row keeps its value, and the paired
CHECK (`exactly one of listing_id / room_type_id is set`) plus extending the
GiST exclusion's WHERE with `AND listing_id IS NOT NULL` keep every current
guarantee intact. The alternative is a rival `stay_bookings` spine, meaning a
second money path that can disagree with the first, which this platform has
already been burned by once. Recommendation unchanged from Agent 1's
research: take the relaxation, with the founder's explicit word, and probe
`bookings_no_overlap` behaviour immediately after. Note `notify_booking_change`
joins `listings` on `new.listing_id` and returns empty names on a null; the
same migration must extend it to resolve the accommodation title instead.

### 5.5 Revised additive migration sequence for the two-side v1

Each migration mirrored into `supabase/migrations/`, applied, then probed
(insert as a test user, read back under RLS, exercise the trigger). All
tables: uuid pk, timestamps, `set_updated_at`, RLS enabled with policies in
the same migration, every FK indexed, `is_demo boolean NOT NULL DEFAULT
false` with the demo-refusal trigger extended (only `listings` and `agents`
carry `is_demo` today, live-verified; MK-10 executes here, not later).

- **M1** Enums `business_kind`, `meal_plan`, `landmark_kind`, `source_kind`,
  `fulfilment_mode`, `thread_context`; `cancellation_policies` (rules jsonb,
  plain-words summary, `refund_to = 'wallet'` CHECK). (MK-08)
- **M2** `businesses`: owner CHECK, `source` defaulted, location trigger on
  the `private.sync_listing_location` pattern, GiST partial index, trigram on
  name, status on the existing `listing_status` enum, RLS (public SELECT
  PUBLISHED, owner ALL), `is_demo`. (MK-01, MK-10)
- **M3** `accommodations` + `accommodation_photos` +
  `accommodation_amenities` + storage bucket policy with size limits.
  (MK-02, MK-09)
- **M4** `room_types`, `units`, `rate_plans`, `rate_calendar`, NGN-only
  CHECKs, kobo bigint throughout. (MK-03 to MK-06)
- **M5** `room_inventory` + `private.reserve_room_nights` /
  `private.release_room_nights` (SECURITY DEFINER, in `private`, the
  one-statement counted UPDATE) + **the two-concurrent-taps oversell probe.
  Nothing after M5 is real until this holds.** (MK-07)
- **M6** [FOUNDER-GATED] `bookings` extension: `accommodation_id`,
  `room_type_id`, `rate_plan_id`, `rooms smallint DEFAULT 1 CHECK (> 0)`;
  the `listing_id` NULL relaxation; the target-exclusivity CHECK; GiST WHERE
  extension; `bookings_guard_transition` trigger (edges: PENDING to
  CONFIRMED or CANCELLED; CONFIRMED to COMPLETED, NO_SHOW or CANCELLED;
  terminals immutable) plus trigger-written `booking_state_events`;
  `notify_booking_change` extended for accommodation titles. (MK-12, MK-13)
- **M7** Restaurants: `restaurant_profiles`, `service_windows`,
  `reservations.business_id` (additive nullable FK + exactly-one CHECK) and
  the `reservation_is_valid` branch with covers capacity. (MK-27 to MK-29)
- **M8** `landmarks` + curated Lagos and Abuja seed (founder approves the
  one-page list first). (MK-11)
- **M9** `CREATE EXTENSION unaccent`; `catalogue_entries` projection,
  triggers on the three source tables, backfill. (MK-43)
- **M10** Messaging context (section 3.2): `conversations.context_kind`,
  `reservation_id`, `booking_id`, CHECK, partial uniques, party-validation
  trigger.
- **M11** Inspection notifications (section 4.4) + optional
  `inspection_requests.outcome` column.
- **M12** `payment_methods` + `bank_accounts` (section 6) +
  `payout_accounts.recipient_code` additive column.
- **M13** `saved_places` (section 1.3) if the Saved surface ships in v1.
- Later, widener phase, unchanged from research 2.6 step 10:
  `places_cache`, `partner_stay_intents`, flag rows, `revenue_source`
  addition.

Only M6 needs the founder's word; M1 to M5 and M7 to M13 are unconditionally
additive, and M7 to M11 do not depend on M6.

---

## 6. Payment methods and bank accounts

### 6.1 What exists, verified

Section 2.5 and 2.6 hold the evidence: Paystack client with initialize/
verify/webhook/transfers/resolve, no `charge_authorization`, no stored
authorization anywhere in `public`; `payout_accounts` agent-only with
resolve columns but no `recipient_code`; wallet withdrawals mint a fresh
Paystack recipient every time and discard the code
(`lib/wallet/actions.ts`). Ordinary users (guests booking stays) have no
bank account storage at all.

### 6.2 `payment_methods`: reusable card authorizations, PCI never touched

Paystack tokenises: after any successful charge, the verify/webhook payload
carries an `authorization` object (`authorization_code`, `card_type`,
`last4`, `exp_month`, `exp_year`, `bin`, `bank`, `channel`, `reusable`,
`signature`). The platform stores only that token material, never a PAN, so
PCI scope stays SAQ-A-shaped exactly as today.

Proposed table (additive, M12):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid NOT NULL FK auth.users | |
| `provider` | text NOT NULL DEFAULT 'paystack' | |
| `authorization_code` | text NOT NULL | the Paystack token, e.g. AUTH_xxx |
| `signature` | text NOT NULL | Paystack's stable card fingerprint |
| `card_type` | text | brand, e.g. visa |
| `last4` | text CHECK four digits | |
| `exp_month`, `exp_year` | smallint | display and expiry pruning only |
| `bin` | text NULL | first six, optional |
| `bank` | text NULL | |
| `channel` | text NULL | card, bank, etc. |
| `reusable` | boolean NOT NULL | only true rows are ever charged |
| `is_default` | boolean NOT NULL DEFAULT false | partial unique `(user_id) WHERE is_default AND deleted_at IS NULL` |
| `email_used` | text NOT NULL | the email the authorization was minted under; charge_authorization must send the same one |
| `deleted_at` | timestamptz NULL | soft delete; delete is an UPDATE |
| `created_at`, `updated_at` | | |

`UNIQUE (user_id, signature) WHERE deleted_at IS NULL` so re-paying with the
same card updates the row instead of duplicating it. RLS: SELECT own; UPDATE
own limited in practice to `is_default` and `deleted_at` (server actions
enforce the field discipline; participants get no INSERT policy). **INSERT is
service-role only**, from the webhook/verify path: authorization data is
never accepted from a client. No `is_demo` column: a payment method can never
be a demo row, and the demo discipline's purpose (no transactions against
example inventory) is already enforced by the demo-refusal triggers on the
transaction tables.

Charge-saved-card flow and its constraints:

1. First charge: today's hosted checkout, unchanged, with metadata naming the
   purpose. On `charge.success` (webhook, and the verify fallback), if
   `authorization.reusable` is true, upsert the payment_methods row keyed on
   `(user_id, signature)`.
2. Repeat charge: `POST /transaction/charge_authorization` with
   `authorization_code`, the SAME email, integer kobo amount and a fresh
   platform reference (the existing reference discipline,
   `lib/payments/references.ts`). Server-side only.
3. **3DS honesty**: `charge_authorization` cannot present a challenge. When
   the issuing bank insists on authentication, or the authorization has
   gone stale, Paystack declines; the action must then fall back to a hosted
   checkout (`initializeTransaction`) rather than retrying, and may mark the
   row `reusable = false` on the specific "authorization not reusable"
   decline. Never loop a saved-card charge.
4. Webhook implications: `charge.success` events arrive for
   charge_authorization exactly as for checkout, so the existing webhook's
   idempotency by `reference` (UNIQUE `wallet_entries.reference`,
   `idempotency_records`) already covers them; the webhook handler gains the
   authorization-upsert branch and must tolerate the metadata
   string-or-object quirk `metadataObject` already solves. The reconcile
   route (`app/api/paystack/reconcile/route.ts`) needs no change: a saved-
   card charge is just a charge with a reference.

### 6.3 Bank accounts

Two honest options; recommendation is (a):

(a) **New `public.bank_accounts`, user-scoped**, because the two-side
platform pays out to stays hosts and refunds guests who may never be agents:
`user_id FK auth.users`, `bank_code`, `bank_name`, `account_number CHECK ten
digits`, `resolved_account_name NOT NULL` (from `resolveAccountNumber`, the
name is never taken from the person filing it; the column being NOT NULL
makes resolve-before-save structural), `resolved_at NOT NULL`,
`recipient_code text NULL` (cached on first transfer, so the recipient stops
being re-minted per withdrawal), `is_default`, `deleted_at` soft delete,
`UNIQUE (user_id, account_number) WHERE deleted_at IS NULL`. RLS owner-only
(SELECT/INSERT/UPDATE own; no DELETE policy, soft delete only), admin read.
`payout_accounts` stays untouched for agent settlement and gains only an
additive `recipient_code` column; consolidating the two is a later,
non-blocking cleanup (`V-2`'s payout identity standard applies to both).

(b) The smaller alternative: extend `payout_accounts` with a nullable
`user_id` and loosen its agent join. Rejected: it turns an agent-RLS table
into a dual-identity table and every policy grows an OR, which is how RLS
bugs are born.

---

## 7. Admin expansion map

Today's admin surfaces (`ls apps/web/src/app/admin`, 18 September): `agents`,
`alerts`, `bookings`, `escrow`, `examples`, `fees`, `flags`, `kyc`,
`listings`, `moderation`, `money`, `payments`, `reference`, `reports`,
`social`, `standing`, `stops`, `support`, `switches`, plus the root page: the
"twenty console destinations" of commit `3044c2aa`. That commit put the
`QueueFilters` frame (search, status chips bound to the real enum, date
range, pagination pushed into the query) on ten of them; today the component
is imported by fifteen admin pages (grep: agents, alerts, bookings, escrow,
examples, flags, kyc, listings, moderation, money, reports, social,
standing, stops, support), so the frame spread further after the commit; the
commit's own text records the deliberate exceptions (no pager on
dual-ordered pages, no search on kyc, stat tiles reading separately from
filtered lists).

What the two-side platform adds, each with its data and one-line scope, and
the frame that absorbs it:

1. **Stays business approval queue.** Reads `businesses` in SUBMITTED /
   UNDER_REVIEW / MORE_INFO_REQUIRED (the reused `listing_status` machine)
   joined to owner profile and verification checks. Scope: approve, request
   more info, reject an operator entity. Absorbs into a new
   `admin/businesses` page on the QueueFilters frame, the `listings` queue's
   sibling, same chips-from-enum pattern.
2. **Accommodation review.** Reads `accommodations` + photos + amenities +
   parent business status. Scope: the property-level gate (photos honest,
   pin present at the APPROVED-to-PUBLISHED transition per MK-55). Either a
   second tab of `admin/businesses` or its own framed queue; keep it a
   separate destination if it has its own status flow, per the commit's
   one-?q=-per-queue rule.
3. **Restaurant approval.** Reads `businesses WHERE kind = 'restaurant'` +
   `restaurant_profiles` + `service_windows` completeness. Scope: a
   restaurant is approvable only with at least one service window and a
   price band. A filter chip on the businesses queue (kind is an enum chip),
   not a separate page.
4. **Reservation oversight.** Reads `reservations` joined to venue
   (listing today, business after M7) and guest. Scope: see today's tables
   across venues, intervene on disputes, spot no-show patterns. Absorbs into
   the existing `admin/bookings` framed queue as a second panel or a
   `kind=reservation` chip; the commit warns one ?q= must not silently
   narrow one panel of a multi-bucket console, so if it shares the page it
   shares the whole contract.
5. **Inventory integrity.** Reads the MK-65 nightly sweep's output
   (`units_booked` versus live bookings drift) surfaced as `risk_alerts`
   rows. Scope: see drift the moment it exists, with the affected room type
   and dates. Absorbs into the existing `admin/alerts` framed queue: drift
   is an alert, not a new console.
6. **Refund console.** Reads `booking_refunds` + `cancellation_policies`
   rules + wallet entries by reference. Scope: apply a policy-priced refund
   (MK-64's function), see who decided and why; append-only record. Absorbs
   into `admin/money` (the money desk already exists and refunds are money
   lines), with the decision UI on ResultSheet like every money-path
   confirmation.
7. **Payment-method audit.** Reads `payment_methods` metadata (never a PAN:
   brand, last4, reusable, created, soft-deleted) + `audit_log`. Scope:
   support answers "which card was charged" and can disable a method
   (soft-delete) on fraud signals; every disable writes `audit_log`. Absorbs
   into `admin/payments` (which exists) as a lookup panel, not a queue.

Also inherited from the deferred widener, later: provider health (MK-39) and
partner-source queues, which land in `admin/switches`/`flags` territory when
the partner lane returns. The pattern conclusion: no new admin architecture
is needed; every new surface is either a new QueueFilters page
(`businesses`), a chip on an existing frame, or a panel on an existing desk.

---

## 8. Risk and order

Top ten build risks for the two-side v1, ordered, each with its build-order
consequence.

1. **Inventory oversell.** The whole stays promise rests on
   `reserve_room_nights` refusing the last room twice. Consequence: M5 ships
   with the two-concurrent-taps probe IN the definition of done, before any
   booking surface exists; HANDOFF_05 already states "nothing above this is
   real until this holds".
2. **The `bookings.listing_id` relaxation without the founder's word.** The
   one non-additive change sits on the money path. Consequence: sequence M6
   last among the schema spine; M7 to M11 are deliberately independent of it
   so a slow answer blocks room bookings only, not restaurants, messaging,
   inspections or search.
3. **Thread-context migration touching live chat.** `conversations` and
   `messages` are live (7 rows each) with realtime subscriptions
   (`useRealtime.ts`) and a service-role read-marking path. Consequence: M10
   is default-valued and column-additive only; `sender_id` is NOT relaxed
   (section 3.4); every existing messages action must pass unchanged, which
   is testable because they key on `conversation_id` alone.
4. **No transition guard on `bookings` while writers multiply.** Today state
   legality lives in application code; stays add checkout jobs, NO_SHOW
   recording and refund flows as new writers. Consequence: the guard trigger
   and trigger-written `booking_state_events` land in the SAME migration as
   the bookings extension (M6), never after it.
5. **Notification fanout multiplying without consolidation (MK-67).** Five
   notify triggers exist after M11 (message, booking, reservation,
   inspection, payout) plus side-aware hrefs. Consequence: before stays
   surfaces ship, fix the href convention once (section 1.3, URL wins over
   cookie) and route every new trigger through `private.notify` unchanged;
   the full consolidation can trail, the href law cannot.
6. **RLS gaps on roughly twelve new tables.** Every current `public` table
   has RLS; one new table shipped open undoes the posture. Consequence:
   policies live in the same migration as each table (the M-sequence states
   this), and each migration's probe includes a cross-user read that must
   fail; `catalogue_entries` public read is PUBLISHED-partial from day one.
7. **Stored card authorizations raise the stakes of account takeover.** An
   `authorization_code` plus a session equals spendable money. Consequence:
   `payment_methods` INSERT is webhook/service-role only, charges from it
   require the wallet-grade confirmation surface, rate limits (`W-2`,
   `A2-046`) extend to charge_authorization, and the 3DS fallback never
   retries silently. Build after the booking spine, not before.
8. **`is_demo` discipline missing from new tables.** Live ground truth: only
   `listings` and `agents` carry `is_demo`; all 64 listings are demo rows.
   Consequence: `businesses` and `accommodations` carry the column, the
   CHECK and the demo-refusal trigger extension from M2/M3, because
   retrofitting it after example stays exist is the DEMO-1 wound again.
9. **Side leakage delivering people to the wrong side.** Saved lists,
   recently viewed and notification taps that ignore the side make the
   two-side illusion leak at exactly the moments users cross sides.
   Consequence: the `nf_side` cookie, the URL-wins rule and the saved-items
   generalisation (M13) are shell work scheduled with the first stays
   surface, not after launch feedback.
10. **Catalogue projection drift.** `catalogue_entries` is maintained by
    triggers on three source tables; a missed UPDATE path shows stale
    titles, prices or vanished rows in the one search. Consequence: M9 ships
    with a rebuild function (it is a projection, drop and refill is legal),
    a trigger test per source-table mutation, and the nightly drift sweep
    (MK-65 pattern) counts projection rows against sources.

---

## Honesty log

Unverified or partially verified claims, stated plainly:

- **`profiles` columns**: I verified via `list_tables` that `profiles`
  exists with its comment, and I searched all `public` columns for
  side/mode/market-like names via the pattern queries I ran
  (`%authoriz%`, `%card%`, `%recipient%`, `is_demo`); I did NOT enumerate
  every `profiles` column individually. The claim "no side column exists on
  profiles" rests on the absence of any such column in the docs, the code
  that reads profiles, and the absence of any side concept anywhere in the
  schema; marked UNVERIFIED at the single-column level.
- **`private.in_conversation` body**: existence verified through the live
  messages policies that call it; the function body was not read.
- **`private.notify` body**: its signature and behaviour are inferred from
  the four live trigger functions that `perform` it and from the
  notifications table shape; the body itself was not read.
- **`private.pay_booking_from_wallet`, `escrow_guard_transition`,
  `set_inspection_lister`, `freeze_inspection_parties`,
  `reservation_is_valid`, `scan_message` bodies**: existence and wiring
  live-verified via `pg_trigger`; bodies not read this session (Agent 1
  read `reservation_is_valid` and reported it; cited as their finding).
- **Paystack `charge_authorization` behaviour** (same-email requirement,
  no-3DS-challenge, reusable flag semantics, authorization object fields):
  from my knowledge of the Paystack API, not verified against provider
  documentation from this sandbox (no web access used). The API_INVENTORY
  cost-honesty rule applies: confirm against Paystack's docs before build.
- **The `nf_mode` cookie as the "flip" pattern**: the task brief calls it
  the mode cookie; live code shows it is workspace mode
  (`personal | agent`), and the Property/Stays side cookie does not exist
  yet. Section 1.1 states this precisely rather than assuming.
- **QueueFilters coverage**: fifteen importing pages is a grep fact; whether
  each renders the full frame contract (query pushdown, chips, pager) was
  not verified page by page.
- **`docs/FRONTEND_REVAMP.md`, `docs/HANDOFF_03_FRONTEND.md`,
  `docs/research/API_INVENTORY_RESEARCH.md`**: not read this session;
  consumed through the files that index them, per my assigned reading.
- **RECOMMENDATIONS.md** was read for section 0 in full and sections 1 to 3
  in part; the remaining register rows (through line 1389) were not re-read
  line by line this session.
- No typecheck, lint, test or build was run: read-only mission.
- Row-level personal data was neither read nor reproduced; every SQL query
  this session was against catalogues and `information_schema` only.
