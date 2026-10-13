# Escrow release runbook

Founder instruction, 13 October 2026: "make escrow functional and let escrow
work". Everything here is on branch `track/escrow-live`. Nothing is applied to
the live database and nothing is on `main` until the founder says "push to
main". The lead runs these steps; each one says how to check it and how to undo
it.

Project: `uccixoonmbhrnyczyigt`. Pending SQL: `supabase/migrations/pending/`.
Rollback SQL: `supabase/migrations/pending/rollback/`. Probes:
`supabase/tests/probes-pending/`.

## 0. Before you start

What is true live today (read 13 October 2026):

- `payments_payluk_on` is **on**. Since D77 it is the only escrow switch: the
  app reads it (`PROTECTED_PAY_FLAG`) and the database reads it
  (`private.rentals_protected_pay_on`). `rentals_protected_pay` is read by
  nothing.
- No Payluk key is set in Vercel, so escrow is closed in practice.
- There are no `deal_agreements` and no `provider_arrangements` rows yet.

Consequence: **the moment `PAYLUK_SECRET_KEY` is set in production with this
branch deployed, escrow opens to every rent and shortlet payer.** To release
in steps, keep one of these closed until the smoke tests in section 4 are
ready:

- set `PAYMENTS_KILL_PAYLUK=1` in Vercel production (stops every Payluk call,
  no database needed; recording from the partner still works), or
- turn `payments_payluk_on` off in the admin switches.

While escrow is closed the app offers card to a rent or shortlet payer, tells
a buyer on a sale that escrow is paused and takes nothing, and never shows a
held balance it cannot read.

Dry run evidence: all eight pending files were applied in one `DO` block, in
order, followed by the eight probes and four behaviour checks through the real
entry points, and the block ended with `raise exception` so nothing stayed.
Result on 13 October 2026: pov01 to pov08 applied; probes pov01 to pov08 PASS;
S1 (pg_cron sweep keeps held and unknown stays, cancels an unfunded stay with
its arrangement and a plain stale hold), S2 (the cron route's sweep, same), S3a
(a bare private refund-and-cancel on a held stay is refused), S3b (the staff
wrapper cancels it), S4 (a plain cancel while the partner's answer is unknown is
refused) all OK.

## 1. Order of work

| Step | What | When |
| --- | --- | --- |
| 1 | Apply `pov01` to `pov07`, in order, one at a time, with the check after each | Before the app deploy |
| 2 | Deploy `track/escrow-live` to production (after "push to main") | After step 1 |
| 3 | Apply `pov08` | Only after step 2 is serving traffic |
| 4 | Set the Payluk keys and the webhook, keep escrow closed | After step 2 |
| 5 | Smoke tests, then open escrow | After step 4 |

Why this order:

- `pov01` to `pov06` change nothing the current app can see except the hotel
  room commission (`pov06`, 10 percent from the hotel's share), which is the
  founder's ruling and is computed in the database for whichever app is live.
  Rent and shortlet rails stay escrow by default (a missing choice reads as
  escrow), which today's app already refuses as not open.
- `pov07` adds `agent_applications.consents`, which the new app writes on
  every application submit and resubmit. It must exist first.
- `pov08` refuses any application or host setup sent without the pay-on-Vallo
  statement. The old app does not record it, so `pov08` before the new app
  would block every new application.

Tooling note: `pov06` contains the trigger events that some SQL connectors
stall on (it guards the rates table against removal). Apply it from the
Supabase SQL editor, not through an agent connector.

## 2. Each migration: apply, check, undo

Apply each file as one migration, with the file name as the migration name.
Run its check straight after. If a check does not return what is written,
stop and run that file's rollback.

### pov01_payer_rail_choice_columns

Check:

```sql
select column_name from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'deal_agreements' and column_name in ('payer_rail_choice', 'payer_rail_chosen_at'))
     or (table_name = 'payment_rail_policy' and column_name = 'payer_may_choose'));
-- expect 3 rows
select conname from pg_constraint
 where conname in ('deal_agreements_payer_rail_choice_known', 'deal_agreements_payer_rail_choice_dated',
                   'payment_rail_policy_choice_is_rent_only');
-- expect 3 rows
```

Undo: `rollback/rb01_payment_rail_policy_guard.sql` (restores the guard). The
new columns and constraints are additive and stay; nothing reads them once
`pov03` is undone.

### pov02_rent_and_shortlet_policy_rows

Check:

```sql
select property_type, lister_kind, rail, payer_may_choose from public.payment_rail_policy
 where effective_to is null and listing_intent = 'rent' and payer_may_choose order by 1, 2;
-- expect 9 rows, all escrow: apartment (business), apartment (individual), home, land,
-- office, rental, shop, shortlet, villa
select count(*) from public.payment_rail_policy
 where id in ('7d8b0368-d092-4d87-b304-f106841f4769', '64a15101-8c87-4055-86a9-0602f6882f35',
              '8176a4a2-dda7-49e2-a243-555a04ed9407', '48ab9c08-ed77-4b6c-a460-a1ba949c427d',
              '054fa444-4b0a-459e-bf55-5f8f423a4de4', '087f5394-e941-4d45-a3b7-4669908d2427',
              'ab87c6d0-1d2b-479d-befc-f72bf5d03873', '87d20cc3-7f87-459e-a1b1-bbaccf1f352b',
              '671e4bc1-012c-47c3-9ef5-e54a7728a286') and effective_to is not null;
-- expect 9 (the rows of 5 October retired, kept as history)
```

Undo: `rollback/rb02_rent_and_shortlet_policy_rows.sql` (retires the nine new
rows and adds the nine 5 October answers back as new rows; no row is removed).

### pov03_rail_resolution_honours_the_choice

Check:

```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'private' and proname in ('rail_business_scope', 'rail_policy_lets_payer_choose',
   'rail_base_for_accommodation', 'rail_base_for_listing', 'rail_base_for_booking', 'rail_base_for_agreement',
   'rail_options_for_agreement');
-- expect 7 rows
select private.rail_business_scope(k) from unnest(array['hotel', 'guest_house', 'resort',
  'serviced_apartments', 'shortlet_operator', 'restaurant']) k;
-- expect hotel, hotel, hotel, hotel, shortlet, restaurant
select has_function_privilege('authenticated', 'private.rail_for_agreement(uuid)', 'execute');
-- expect false
```

Undo: `rollback/rb03_rail_for_booking_and_agreement.sql` (restores the live
`rail_for_booking`, `rail_for_agreement` and `agreement_review_required`; the
new helpers stay and are unused).

### pov04_payer_rail_choice_rpcs

Check:

```sql
select has_function_privilege('authenticated', 'public.payment_rail_choose(uuid, text)', 'execute'),
       has_function_privilege('anon', 'public.payment_rail_choose(uuid, text)', 'execute'),
       has_function_privilege('authenticated', 'public.payment_rail_options(uuid)', 'execute'),
       has_function_privilege('authenticated', 'public.payment_rail_for_booking(uuid)', 'execute');
-- expect true, false, true, false
select pg_get_functiondef('private.settle_booking_charge(text, bigint, bigint, uuid)'::regprocedure)
       like '%partner_holds_payment%';
-- expect true
select pg_get_functiondef('public.payment_rail_choose(uuid, text)'::regprocedure) like '%card_needs_review%';
-- expect false (the dead end is gone: card under a risk signal goes to a person, it is never refused)
```

Undo: `rollback/rb04_settle_booking_charge.sql` (restores the live settlement;
its last statement revokes `payment_rail_choose` from members so no choice can
be stored while the rest is rolled back).

### pov05_escrow_for_shortlet_stays

Check:

```sql
select tgname, tgenabled from pg_trigger
 where tgname in ('bookings_00_partner_hold_keeps_the_stay', 'provider_arrangements_02_paid_twice_alert');
-- expect both, tgenabled = 'O'
select pg_get_functiondef('private.release_stale_booking_holds()'::regprocedure) like '%vallo.hold_sweep%',
       pg_get_functiondef('public.expire_booking_holds(interval, integer)'::regprocedure) like '%vallo.hold_sweep%';
-- expect true, true
select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private') and p.proname ~ '(^|_)escrows?(_|$)';
-- expect 0 (the custody naming guard)
select has_function_privilege('authenticated', 'public.partner_hold_unwind_cancel(uuid, text)', 'execute'),
       has_function_privilege('service_role', 'public.partner_hold_unwind_cancel(uuid, text)', 'execute');
-- expect false, true
select jobname, command from cron.job where command ilike '%release_stale_booking_holds%';
-- expect the hourly hold sweep, unchanged
```

Undo: `rollback/rb05_partner_hold_and_sweep.sql` (disables the two new
triggers and restores the live `provider_arrangement_open`, `booking_is_paid`,
both sweep entry points, `rent_split_cancel` and
`public.refund_and_cancel_booking`).

### pov06_hotel_room_commission (SQL editor)

Check:

```sql
select private.scoped_commission_bps('hotel_room', now());
-- expect 1000
select has_table_privilege('service_role', 'public.scoped_commission_rates', 'update'),
       has_table_privilege('authenticated', 'public.scoped_commission_rates', 'select');
-- expect false, false
select tgname from pg_trigger where tgrelid = 'public.scoped_commission_rates'::regclass and not tgisinternal;
-- expect scoped_commission_rates_00_history and scoped_commission_rates_01_never_truncated
```

Undo: `rollback/rb06_b3_commission_for_booking.sql` (restores the live
commission function; the rates table stays as history and is read by nothing).

### pov07_workspace_acceptance_record

Check:

```sql
select is_nullable, column_default from information_schema.columns
 where table_schema = 'public' and table_name = 'agent_applications' and column_name = 'consents';
-- expect NO, '{}'::jsonb
```

Undo: none needed; the column and the reader are additive. Leave them.

### pov08_workspace_acceptance_required (after the app is live)

Before applying, confirm the new app is serving: submit one professional
application on a test account and check

```sql
select consents -> 'agreements' from public.agent_applications order by created_at desc limit 1;
-- expect terms, privacy and pay_on_vallo entries, each with version and at
```

Check after:

```sql
select tgname, tgenabled from pg_trigger
 where tgname in ('agent_applications_03_acceptance_required', 'businesses_02_acceptance_required');
-- expect both, 'O'
```

Undo: `rollback/rb08_workspace_acceptance_required.sql` (disables both
triggers).

### Rolling back more than one

Run the rollbacks in reverse order: rb08, rb06, rb05, rb04, rb03, rb02, rb01.
None of them removes a row, a table or a function.

## 3. Keys, webhook and switches (after the deploy)

1. Vercel production: set `PAYLUK_SECRET_KEY` (an `sk_live_` key). Vercel
   preview: set `PAYLUK_TEST_SECRET_KEY` (an `sk_test_` key) only.
   `paylukMerchantConfig` refuses the live key on any deployment whose
   `VERCEL_ENV` is not `production`, so a preview can never move real money.
   Keep `PAYMENTS_KILL_PAYLUK=1` (or `payments_payluk_on` off) for now.
2. Payluk dashboard, production merchant: webhook URL
   `https://<production domain>/api/payluk/webhook`. The route checks
   `x-payluk-signature` (HMAC SHA-512 of the raw body with the secret key).
   For staging, point the test merchant's webhook at a preview URL.
3. Check the recorder is live without opening escrow: the route answers 503
   `not_configured` without a key and 401 `signature_invalid` on an unsigned
   post. Expect 401 now:
   `curl -s -X POST https://<production domain>/api/payluk/webhook -d '{}'`.
4. Check the reconcile cron: `/admin/jobs` lists `arrangements-reconcile`
   every ten minutes (minutes 8, 18, ... 58). It verifies at most three open
   arrangements per run, inside Payluk's 10 requests per minute per key.

## 4. Production smoke tests

Use two real accounts the team owns (a payer and a lister), never a member's.
Both must have linked a Payluk account through the Wallet
(`financial_provider_accounts`, provider `payluk`, status `ACTIVE`), and the
payer's Payluk balance must cover the test amount. Open escrow for the test
(`PAYMENTS_KILL_PAYLUK` unset and `payments_payluk_on` on), and close it again
straight after if the founder has not said to leave it open.

### A. Rent through escrow: funded, held, released

1. On a rental listing the lister owns, agree a small rent (at least 1,000
   naira, the partner's minimum) and reach an approved agreement.
2. As the payer, the payment step shows Escrow (selected) and Pay by card.
   Keep Escrow and continue to the escrow step. Fund it.
3. Check:

   ```sql
   select status, provider_arrangement_id, amount_minor from public.provider_arrangements
    where agreement_id = '<agreement id>';
   -- expect protected once the partner reports the payment (webhook escrow.ongoing,
   -- or the reconcile cron within ten minutes)
   select from_status, to_status, source from public.provider_arrangement_events
    where arrangement_id = '<arrangement id>' order by created_at;
   -- expect preparing, awaiting_payment, (payment_processing,) protected, every move
   -- after preparing sourced from the partner
   ```

4. As the payer, confirm the deal. Expect `release_requested`, then
   `released` once the partner reports `escrow.completed`. The agreement reads
   paid, and the lister's Payluk balance shows the amount less the partner's
   fee.
5. Nothing is marked paid before the partner says so: between steps 2 and 3
   the agreement must still read approved, not paid.

### B. Hotel room by card, 10 percent from the hotel's share

1. Book a room at a published hotel (or guest house, resort, serviced
   apartments) with a payout subaccount. The payment step shows card only.
2. Pay by card. Check:

   ```sql
   select t.amount_minor, t.commission_minor, t.lister_share_minor, t.guarantee_minor, t.status
     from public.transactions t where t.booking_id = '<booking id>';
   -- expect commission_minor = amount_minor * 1000 / 10000 (rounded down),
   -- commission + lister share + guarantee = amount, status SUCCESSFUL
   select gross_minor, platform_fee_minor, agent_share_minor from public.ledger_entries
    where booking_id = '<booking id>';
   ```

3. The guest's total on the checkout equals the room price shown before
   booking: the 10 percent is never added to it.

### C. Shortlet paid by card, by the payer's choice

1. On a nightly shortlet, reach an approved agreement. The payment step shows
   Escrow (selected) and Pay by card. Pick Pay by card and continue.
2. Check:

   ```sql
   select payer_rail_choice, payer_rail_chosen_at, status from public.deal_agreements where id = '<agreement id>';
   -- expect card, a time, approved (or in_review if a risk signal asked a person;
   -- then approve it in /admin/agreements and continue)
   select action, metadata from public.audit_log where entity_id = '<agreement id>' order by created_at;
   -- expect agreement.rail_chosen with choice card
   select count(*) from public.provider_arrangements where agreement_id = '<agreement id>';
   -- expect 0
   ```

3. Pay on the card checkout. The transaction settles SUCCESSFUL and the
   agreement reads paid. The choice is now locked: the payment step no longer
   offers escrow.

### D. The way out (no money needed)

With escrow closed (`PAYMENTS_KILL_PAYLUK=1`), open the payment step of a
rent agreement: it offers card and says escrow is paused. On a sale it says
escrow is paused and offers nothing to pay. Reopen escrow afterwards only if
the founder said so.

## 5. Watching after release

- `/admin/agreements` watch list: held payments (protected, release
  requested, disputed). Staff can refund to the payer or release to the
  lister; both go through the partner's dispute and resolve calls and are
  audited. Parties to the deal cannot use them.
- Risk alerts: "A deal paid by card was also funded at the payment partner"
  (high) means refund the partner payment; "A card payment could not be
  applied" with reason `partner_holds_payment` means refund the card.
- A stay whose money the partner holds is never cancelled by the hold sweep
  or by a plain cancel; staff cancel it through the refund flow, and when the
  partner reports the money refunded the app cancels the stay itself
  (`partner_hold_unwind_cancel`).

## 6. Not confirmed from the partner's documents

Proven only in production, or against the partner's staging with a test key:

- Real money movement, the partner's real webhook signature and delivery, and
  the read-back by reference.
- `DELETE /v1/escrow/delete/{paymentToken}` (withdraw an unfunded escrow so
  the payer can switch to card): from the vendored page only; the changelog has
  no entry after 2 October 2026.
- Whether `POST /v1/escrow/dispute/resolve/{escrowId}` accepts an escrow
  straight from DISPUTED without an INVESTIGATING step (the page does not say).
- The fee on a refund: the page says the fee is never refunded; the payer's
  wording assumes the partner's fee is kept.
- Whether a second create with the same reference is refused or duplicated
  (when a create's answer is unknown the app reads the seller's escrows back by
  reference and amount instead of creating again, and raises an alert, but the
  partner's own behaviour is not confirmed).
- The 10 requests per minute per key budget under real load (the reconcile
  cron uses at most three per run).
