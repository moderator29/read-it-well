-- CRYPTO agent, 29 September 2026. Crypto as an alternative way to pay an
-- existing charge (a stay, a rent charge, an agreement payment), with NO
-- custody.
--
-- THE MODEL. Every charge on Vallo is a booking with an approved agreement and
-- a split computed by public.payment_split_for_booking. Paying it in crypto is
-- one more payment ATTEMPT on that same charge: a public.transactions row with
-- provider 'yellowcard' and reference rm-yc-<uuid>, opened through the same
-- payment gate (transactions_00_payment_gate) and settled through the same
-- private.settle_booking_charge. The payer sends crypto to an address that
-- belongs to the licensed provider (never to Vallo). The provider converts it
-- and settles NAIRA straight to the same three legs the Paystack split pays:
-- the lister's verified payout account, the Guarantee reserve, and Vallo's
-- commission to Vallo's own account. Vallo never receives, holds or forwards
-- crypto or naira for anybody. There is no wallet, balance or escrow here, and
-- nothing in this file touches a retired custody object.
--
-- WHAT THIS ADDS.
--  1. feature_flags.crypto_payments, OFF. Fail-closed in the app.
--  2. public.crypto_payments: one row per crypto attempt (quote, deposit
--     instructions issued by the provider, status). Crypto figures are
--     numeric (exact decimal), never float, with the asset's precision stored
--     beside them. Naira figures are bigint kobo. The payer reads their own
--     row; staff read all; nobody but the service role writes.
--  3. public.crypto_payment_events: append-only history of every provider
--     report (webhook or reconcile) and app step, unique on
--     (provider, provider_event_id), which is the webhook's idempotency key.
--  4. public.crypto_aml_records: append-only, staff-only. What SCUML/AML needs
--     for every settled crypto payment: the payer's KYC identity (the matched
--     identity_verifications row and its legal name), naira amount, asset,
--     network, crypto amount, tx hash, provider and provider reference. Plain
--     uuids, no foreign keys, so an account deletion never erases the record
--     (SCUML item 11). Nothing here is shown to the member (no tipping off).
--  5. private.crypto_transition_allowed(from, to): the status machine, twin of
--     apps/web/src/lib/crypto/state-machine.ts (held equal by the probe and the
--     vitest table).
--  6. public.crypto_open_attempt(payment, reserve_code): service role only.
--     Opens the transactions attempt for a quoted crypto payment through the
--     normal gate and returns the split and the lister's verified payout
--     destination, which the provider needs to settle naira directly.
--  7. public.crypto_payment_apply(...): service role only. Records one event
--     (idempotent), checks the transition, updates the row, keeps the attempt
--     visible to the in-flight predicate while money is moving, and on
--     'settled' calls private.settle_booking_charge and writes the AML record
--     in the same transaction.
--
-- RLS is on for all three tables with narrow policies. anon has nothing;
-- authenticated has SELECT on crypto_payments only (own rows); every write is
-- the service role's, through the definer functions or its own grants.
set local lock_timeout = '5s';

/* ------------------------------------------------------------------ 1. flag */

insert into public.feature_flags (key, enabled, note)
values ('crypto_payments', false,
        'Pay a charge in crypto through a licensed on/off-ramp that settles naira straight to the lister, the Guarantee reserve and Vallo. OFF until the founder confirms direct settlement in writing, the provider is configured, and the SEC VASP question is answered (docs/MONEY_ARCHITECTURE.md). Also needs payer KYC.')
on conflict (key) do nothing;

/* ------------------------------------------------------- 2. crypto_payments */

create table if not exists public.crypto_payments (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique
                           check (reference ~ '^rm-yc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  booking_id             uuid not null references public.bookings(id) on delete restrict,
  agreement_id           uuid references public.deal_agreements(id) on delete restrict,
  transaction_id         uuid unique references public.transactions(id) on delete restrict,
  payer_id               uuid not null,
  provider               text not null check (provider in ('yellowcard')),
  provider_quote_id      text check (provider_quote_id is null or length(provider_quote_id) between 1 and 200),
  provider_payment_id    text check (provider_payment_id is null or length(provider_payment_id) between 1 and 200),
  state                  text not null default 'quoted'
                           check (state in ('quoted', 'awaiting_payment', 'confirming', 'underpaid', 'overpaid',
                                            'converting', 'settled', 'expired', 'refunded', 'failed')),
  asset                  text not null check (asset ~ '^[A-Z0-9]{2,10}$'),
  network                text not null check (network ~ '^[A-Z0-9_]{2,20}$'),
  asset_decimals         smallint not null check (asset_decimals between 0 and 18),
  amount_minor           bigint not null check (amount_minor > 0),
  fee_minor              bigint not null default 0 check (fee_minor >= 0),
  currency               text not null default 'NGN' check (currency = 'NGN'),
  rate_ngn               numeric not null check (rate_ngn > 0),
  crypto_amount          numeric not null check (crypto_amount > 0),
  crypto_received        numeric check (crypto_received is null or crypto_received >= 0),
  crypto_overpaid        numeric check (crypto_overpaid is null or crypto_overpaid >= 0),
  crypto_refunded        numeric check (crypto_refunded is null or crypto_refunded >= 0),
  settled_minor          bigint check (settled_minor is null or settled_minor >= 0),
  deposit_address        text check (deposit_address is null or (length(deposit_address) between 10 and 200 and deposit_address !~ '\s')),
  deposit_memo           text check (deposit_memo is null or length(deposit_memo) <= 100),
  hosted_url             text check (hosted_url is null or (length(hosted_url) <= 500 and hosted_url like 'https://%')),
  refund_address         text check (refund_address is null or (length(refund_address) between 10 and 200 and refund_address !~ '\s')),
  tx_hash                text check (tx_hash is null or (length(tx_hash) between 10 and 200 and tx_hash !~ '\s')),
  refund_tx_hash         text check (refund_tx_hash is null or (length(refund_tx_hash) between 10 and 200 and refund_tx_hash !~ '\s')),
  confirmations          integer check (confirmations is null or confirmations >= 0),
  confirmations_required integer check (confirmations_required is null or confirmations_required >= 0),
  quote_expires_at       timestamptz not null,
  charge_outcome         text check (charge_outcome is null or charge_outcome in ('settled', 'already-settled', 'refund-due', 'unknown-reference')),
  failure_reason         text check (failure_reason is null or length(failure_reason) <= 200),
  settled_at             timestamptz,
  last_event_at          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Crypto figures carry no more precision than the asset has.
  constraint crypto_payments_decimals_fit check (
    crypto_amount = round(crypto_amount, asset_decimals)
    and (crypto_received is null or crypto_received = round(crypto_received, asset_decimals))
    and (crypto_overpaid is null or crypto_overpaid = round(crypto_overpaid, asset_decimals))
    and (crypto_refunded is null or crypto_refunded = round(crypto_refunded, asset_decimals))),
  constraint crypto_payments_settled_has_facts check (
    state <> 'settled' or (settled_at is not null and settled_minor is not null))
);

comment on table public.crypto_payments is
  'One crypto payment attempt against one charge. The deposit address is the PROVIDER''s, never Vallo''s; the provider settles naira straight to the split legs. Crypto figures are exact numeric at asset_decimals; naira is bigint kobo. Written by the service role only.';

create index if not exists crypto_payments_booking_idx on public.crypto_payments (booking_id);
create index if not exists crypto_payments_payer_idx on public.crypto_payments (payer_id, created_at desc);
create index if not exists crypto_payments_agreement_idx on public.crypto_payments (agreement_id);
create index if not exists crypto_payments_open_idx on public.crypto_payments (updated_at)
  where state not in ('settled', 'refunded', 'failed', 'expired');
create unique index if not exists crypto_payments_provider_payment_key
  on public.crypto_payments (provider, provider_payment_id) where provider_payment_id is not null;

drop trigger if exists crypto_payments_set_updated_at on public.crypto_payments;
create trigger crypto_payments_set_updated_at before update on public.crypto_payments
  for each row execute function public.set_updated_at();

/* A quote is written only for the booking's own guest, for the booking's own
   stored total, and only for a KYC-verified payer. Defence in depth: the app
   checks all three first so the person is told why in a sentence. */
create or replace function private.crypto_payments_quote_guard()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  bk public.bookings%rowtype;
begin
  select * into bk from public.bookings where id = new.booking_id;
  if bk.id is null or bk.guest_id is distinct from new.payer_id then
    raise exception 'crypto_gate: only the booking''s guest can pay it' using errcode = '42501';
  end if;
  if bk.total_minor <> new.amount_minor or bk.currency <> 'NGN' then
    raise exception 'crypto_gate: the amount must be the booking''s stored naira total' using errcode = '42501';
  end if;
  if not exists (select 1 from public.identity_verifications v
                  where v.subject_id = new.payer_id and v.outcome = 'matched') then
    raise exception 'crypto_gate: the payer must be identity verified' using errcode = '42501';
  end if;
  if new.state <> 'quoted' then
    raise exception 'crypto_gate: a crypto payment opens as quoted' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.crypto_payments_quote_guard() from public, anon, authenticated;

drop trigger if exists crypto_payments_00_quote_guard on public.crypto_payments;
create trigger crypto_payments_00_quote_guard before insert on public.crypto_payments
  for each row execute function private.crypto_payments_quote_guard();

alter table public.crypto_payments enable row level security;
revoke all on public.crypto_payments from anon, authenticated;
grant select on public.crypto_payments to authenticated;
grant select, insert, update on public.crypto_payments to service_role;

drop policy if exists crypto_payments_payer_select on public.crypto_payments;
create policy crypto_payments_payer_select on public.crypto_payments
  for select to authenticated
  using (payer_id = (select auth.uid()));

drop policy if exists crypto_payments_staff_select on public.crypto_payments;
create policy crypto_payments_staff_select on public.crypto_payments
  for select to authenticated
  using ((select private.has_role((select auth.uid()), 'admin'::public.app_role))
      or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role)));

/* -------------------------------------------------- 3. crypto_payment_events */

create table if not exists public.crypto_payment_events (
  id                 uuid primary key default gen_random_uuid(),
  crypto_payment_id  uuid not null references public.crypto_payments(id) on delete restrict,
  provider           text not null check (provider in ('yellowcard')),
  provider_event_id  text not null check (length(provider_event_id) between 1 and 300),
  source             text not null check (source in ('webhook', 'reconcile', 'app')),
  from_state         text not null,
  to_state           text not null,
  applied            boolean not null,
  outcome            text not null check (outcome in ('applied', 'updated', 'stale', 'refused')),
  facts              jsonb not null default '{}'::jsonb,
  received_at        timestamptz not null default now(),
  constraint crypto_payment_events_once unique (provider, provider_event_id)
);

comment on table public.crypto_payment_events is
  'Append-only. Every provider report and app step for a crypto payment. Unique on (provider, provider_event_id): a webhook delivered five times is recorded and acted on once.';

create index if not exists crypto_payment_events_payment_idx on public.crypto_payment_events (crypto_payment_id, received_at);

alter table public.crypto_payment_events enable row level security;
revoke all on public.crypto_payment_events from anon, authenticated;
grant select, insert on public.crypto_payment_events to service_role;

drop policy if exists crypto_payment_events_staff_select on public.crypto_payment_events;
create policy crypto_payment_events_staff_select on public.crypto_payment_events
  for select to authenticated
  using ((select private.has_role((select auth.uid()), 'admin'::public.app_role))
      or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role)));
-- Staff read it through their own session, so they need the table grant too;
-- the policy above is what narrows it to staff.
grant select on public.crypto_payment_events to authenticated;

/* ---------------------------------------------------- 4. crypto_aml_records */

create table if not exists public.crypto_aml_records (
  id                        uuid primary key default gen_random_uuid(),
  crypto_payment_id         uuid not null unique,
  reference                 text not null,
  booking_id                uuid not null,
  agreement_id              uuid,
  payer_id                  uuid not null,
  payer_legal_name          text,
  payer_kyc_verification_id uuid,
  payer_kyc_method          text,
  payee_user_id             uuid,
  amount_minor              bigint not null check (amount_minor > 0),
  currency                  text not null default 'NGN' check (currency = 'NGN'),
  asset                     text not null,
  network                   text not null,
  asset_decimals            smallint not null,
  crypto_amount             numeric not null,
  crypto_received           numeric,
  rate_ngn                  numeric not null,
  tx_hash                   text,
  deposit_address           text,
  refund_address            text,
  provider                  text not null,
  provider_reference        text,
  charge_outcome            text,
  settled_at                timestamptz not null,
  recorded_at               timestamptz not null default now()
);

comment on table public.crypto_aml_records is
  'SCUML/AML: one row per settled crypto payment, written in the settling transaction. Payer identity from KYC, naira amount, asset, network, crypto amount, tx hash, provider reference. Append-only, staff-only, no foreign keys so an account deletion leaves it whole. The SCUML threshold and STR observers read this table.';

create index if not exists crypto_aml_records_payer_idx on public.crypto_aml_records (payer_id, settled_at);
create index if not exists crypto_aml_records_settled_idx on public.crypto_aml_records (settled_at);

alter table public.crypto_aml_records enable row level security;
revoke all on public.crypto_aml_records from anon, authenticated;
grant select on public.crypto_aml_records to authenticated;
grant select, insert on public.crypto_aml_records to service_role;

drop policy if exists crypto_aml_records_staff_select on public.crypto_aml_records;
create policy crypto_aml_records_staff_select on public.crypto_aml_records
  for select to authenticated
  using ((select private.has_role((select auth.uid()), 'admin'::public.app_role))
      or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role)));

/* Append-only: nobody, including the service role, updates or deletes. */
create or replace function private.crypto_append_only()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  raise exception 'append_only: % rows are never changed or removed', tg_table_name using errcode = '42501';
end;
$function$;

revoke all on function private.crypto_append_only() from public, anon, authenticated;

drop trigger if exists crypto_payment_events_append_only on public.crypto_payment_events;
create trigger crypto_payment_events_append_only before update or delete on public.crypto_payment_events
  for each row execute function private.crypto_append_only();
drop trigger if exists crypto_aml_records_append_only on public.crypto_aml_records;
create trigger crypto_aml_records_append_only before update or delete on public.crypto_aml_records
  for each row execute function private.crypto_append_only();

/* --------------------------------------------------- 5. the status machine */

create or replace function private.crypto_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select case p_from
    when 'quoted'           then p_to in ('awaiting_payment', 'expired', 'failed')
    when 'awaiting_payment' then p_to in ('confirming', 'underpaid', 'overpaid', 'converting', 'settled', 'expired', 'failed')
    when 'confirming'       then p_to in ('underpaid', 'overpaid', 'converting', 'settled', 'refunded', 'failed')
    when 'underpaid'        then p_to in ('confirming', 'overpaid', 'converting', 'settled', 'expired', 'refunded', 'failed')
    when 'overpaid'         then p_to in ('converting', 'settled', 'refunded', 'failed')
    when 'converting'       then p_to in ('settled', 'refunded', 'failed')
    -- A report of money moving outranks a clock or an earlier failure: late
    -- funds on an expired quote, or a failure the provider later settles.
    when 'expired'          then p_to in ('confirming', 'underpaid', 'overpaid', 'converting', 'settled', 'refunded')
    when 'failed'           then p_to in ('settled', 'refunded')
    else false  -- settled and refunded are final
  end;
$function$;

revoke all on function private.crypto_transition_allowed(text, text) from public, anon, authenticated;

/* ------------------------------------------------ 6. open the attempt */

create or replace function public.crypto_open_attempt(p_payment uuid, p_reserve_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cp    public.crypto_payments%rowtype;
  split jsonb;
  tx_id uuid;
  dest  record;
begin
  if p_reserve_code is null or length(btrim(p_reserve_code)) = 0 then
    return jsonb_build_object('status', 'reserve_not_set_up');
  end if;
  select * into cp from public.crypto_payments where id = p_payment for update;
  if cp.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if cp.state <> 'quoted' then return jsonb_build_object('status', 'not_quoted', 'state', cp.state); end if;
  if cp.quote_expires_at <= now() then return jsonb_build_object('status', 'quote_expired'); end if;
  if cp.transaction_id is not null then return jsonb_build_object('status', 'already_open'); end if;
  if exists (select 1 from public.transactions t where t.booking_id = cp.booking_id and t.status = 'SUCCESSFUL') then
    return jsonb_build_object('status', 'already_paid');
  end if;

  split := public.payment_split_for_booking(cp.booking_id);
  if split->>'status' <> 'ok' then return jsonb_build_object('status', split->>'status'); end if;
  if (split->>'amount_minor')::bigint <> cp.amount_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;

  -- The lister's verified payout account: the same row whose Paystack
  -- subaccount the card split pays, so both rails settle to one destination.
  select pa.bank_code, pa.account_number, coalesce(pa.resolved_account_name, pa.account_name) as account_name
    into dest
    from public.payout_accounts pa
    join public.agents a on a.id = pa.agent_id
   where a.user_id = (split->>'payee_user_id')::uuid
     and pa.paystack_subaccount_code = split->>'payee_subaccount_code'
     and pa.resolved_at is not null
     and pa.bank_code is not null
   order by pa.is_default desc, pa.created_at desc
   limit 1;
  if dest.account_number is null then return jsonb_build_object('status', 'payee_not_set_up'); end if;

  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
                                   payee_user_id, payee_subaccount_code, reserve_subaccount_code,
                                   lister_share_minor, guarantee_minor, commission_minor, checkout_opened_at)
  values (cp.booking_id, 'yellowcard', cp.reference, cp.amount_minor, 'NGN', 'PENDING',
          (split->>'agreement_id')::uuid, (split->>'payee_user_id')::uuid, split->>'payee_subaccount_code',
          p_reserve_code, (split->>'lister_share_minor')::bigint, (split->>'guarantee_minor')::bigint,
          (split->>'commission_minor')::bigint, now())
  returning id into tx_id;

  update public.crypto_payments
     set transaction_id = tx_id, agreement_id = (split->>'agreement_id')::uuid
   where id = cp.id;

  return jsonb_build_object(
    'status', 'ok', 'transaction_id', tx_id, 'reference', cp.reference, 'amount_minor', cp.amount_minor,
    'agreement_id', split->>'agreement_id', 'payee_user_id', split->>'payee_user_id',
    'lister_share_minor', (split->>'lister_share_minor')::bigint,
    'guarantee_minor', (split->>'guarantee_minor')::bigint,
    'commission_minor', (split->>'commission_minor')::bigint,
    'lister_bank_code', dest.bank_code, 'lister_account_number', dest.account_number,
    'lister_account_name', dest.account_name);
end;
$function$;

revoke all on function public.crypto_open_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.crypto_open_attempt(uuid, text) to service_role;

/* ------------------------------------------------ 7. apply one event */

create or replace function public.crypto_payment_apply(
  p_reference text,
  p_provider text,
  p_event_id text,
  p_source text,
  p_to_state text,
  p_facts jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cp      public.crypto_payments%rowtype;
  f       jsonb := coalesce(p_facts, '{}'::jsonb);
  settle  jsonb;
  kyc     record;
  same    boolean;
  v_outcome text;
  v_settled bigint;
  mismatch boolean := false;
begin
  if p_reference is null or p_event_id is null or p_to_state is null then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  if p_source is null or p_source not in ('webhook', 'reconcile', 'app') then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  select * into cp from public.crypto_payments where reference = p_reference for update;
  if cp.id is null then return jsonb_build_object('outcome', 'unknown-reference'); end if;
  if cp.provider <> p_provider then return jsonb_build_object('outcome', 'wrong-provider'); end if;

  -- Idempotency: one event id, one effect. The row lock above serialises two
  -- deliveries of the same event; the unique constraint is the backstop.
  if exists (select 1 from public.crypto_payment_events e where e.provider = p_provider and e.provider_event_id = p_event_id) then
    return jsonb_build_object('outcome', 'duplicate', 'state', cp.state);
  end if;

  same := cp.state = p_to_state;
  if same then
    -- The same state again is a progress update (more confirmations, a hash)
    -- while money is moving, and a no-op on a final or clocked state.
    v_outcome := case when cp.state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting')
                      then 'updated' else 'stale' end;
  elsif private.crypto_transition_allowed(cp.state, p_to_state) then
    v_outcome := 'applied';
  else
    v_outcome := 'refused';
  end if;

  -- The provider must settle exactly the charge in naira. Anything else is
  -- not a settlement of THIS charge: refused, recorded, and a person told.
  if v_outcome = 'applied' and p_to_state = 'settled' then
    v_settled := nullif(f->>'settled_minor', '')::bigint;
    if v_settled is null or v_settled <> cp.amount_minor then
      mismatch := true;
      v_outcome := 'refused';
    end if;
  end if;

  insert into public.crypto_payment_events (crypto_payment_id, provider, provider_event_id, source, from_state, to_state, applied, outcome, facts)
  values (cp.id, p_provider, p_event_id, p_source, cp.state, p_to_state, v_outcome in ('applied', 'updated'), v_outcome, f);

  if mismatch then
    update public.crypto_payments set failure_reason = 'settled_amount_mismatch', last_event_at = now() where id = cp.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A crypto settlement did not match the charge',
            format('Crypto payment %s reported %s kobo settled against a charge of %s kobo. Check with the provider before anything else.',
                   p_reference, coalesce(v_settled::text, 'no'), cp.amount_minor),
            'booking', cp.booking_id::text);
    return jsonb_build_object('outcome', 'amount-mismatch', 'state', cp.state);
  end if;

  if v_outcome not in ('applied', 'updated') then
    return jsonb_build_object('outcome', v_outcome, 'state', cp.state);
  end if;

  update public.crypto_payments set
    state                  = p_to_state,
    provider_payment_id    = coalesce(provider_payment_id, nullif(f->>'provider_payment_id', '')),
    deposit_address        = coalesce(nullif(f->>'deposit_address', ''), deposit_address),
    deposit_memo           = coalesce(nullif(f->>'deposit_memo', ''), deposit_memo),
    hosted_url             = coalesce(nullif(f->>'hosted_url', ''), hosted_url),
    refund_address         = coalesce(refund_address, nullif(f->>'refund_address', '')),
    tx_hash                = coalesce(nullif(f->>'tx_hash', ''), tx_hash),
    refund_tx_hash         = coalesce(nullif(f->>'refund_tx_hash', ''), refund_tx_hash),
    crypto_received        = coalesce(nullif(f->>'crypto_received', '')::numeric, crypto_received),
    crypto_overpaid        = coalesce(nullif(f->>'crypto_overpaid', '')::numeric, crypto_overpaid),
    crypto_refunded        = coalesce(nullif(f->>'crypto_refunded', '')::numeric, crypto_refunded),
    confirmations          = greatest(coalesce(confirmations, 0), coalesce(nullif(f->>'confirmations', '')::integer, confirmations, 0)),
    confirmations_required = coalesce(nullif(f->>'confirmations_required', '')::integer, confirmations_required),
    quote_expires_at       = coalesce(nullif(f->>'expires_at', '')::timestamptz, quote_expires_at),
    failure_reason         = case when p_to_state in ('failed', 'refunded', 'expired')
                                  then coalesce(nullif(left(f->>'reason', 200), ''), failure_reason) else failure_reason end,
    settled_minor          = case when p_to_state = 'settled' then v_settled else cp.settled_minor end,
    settled_at             = case when p_to_state = 'settled' then coalesce(settled_at, now()) else settled_at end,
    last_event_at          = now()
  where id = cp.id
  returning * into cp;

  -- Keep the card attempt's in-flight predicate honest while money moves, so
  -- an agreement is not cancelled under a confirming payment.
  if cp.transaction_id is not null then
    if p_to_state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting') then
      update public.transactions set processor_status = 'processing', processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    elsif p_to_state = 'expired' then
      update public.transactions set status = 'ABANDONED', processor_status = 'expired', processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    elsif p_to_state in ('failed', 'refunded') then
      update public.transactions set status = 'FAILED', processor_status = p_to_state, processor_checked_at = now()
       where id = cp.transaction_id and status in ('PENDING', 'ABANDONED');
    end if;
  end if;

  if p_to_state = 'settled' and not same then
    settle := private.settle_booking_charge(p_reference, cp.amount_minor, 0, null);
    update public.crypto_payments set charge_outcome = settle->>'outcome' where id = cp.id;

    select v.id, v.legal_name, v.method into kyc
      from public.identity_verifications v
     where v.subject_id = cp.payer_id and v.outcome = 'matched'
     order by v.decided_at desc limit 1;

    insert into public.crypto_aml_records (crypto_payment_id, reference, booking_id, agreement_id, payer_id,
      payer_legal_name, payer_kyc_verification_id, payer_kyc_method, payee_user_id, amount_minor, asset, network,
      asset_decimals, crypto_amount, crypto_received, rate_ngn, tx_hash, deposit_address, refund_address, provider,
      provider_reference, charge_outcome, settled_at)
    select cp.id, cp.reference, cp.booking_id, cp.agreement_id, cp.payer_id, kyc.legal_name, kyc.id, kyc.method,
           t.payee_user_id, cp.amount_minor, cp.asset, cp.network, cp.asset_decimals, cp.crypto_amount,
           cp.crypto_received, cp.rate_ngn, cp.tx_hash, cp.deposit_address, cp.refund_address, cp.provider,
           cp.provider_payment_id, settle->>'outcome', cp.settled_at
      from (select 1) one
      left join public.transactions t on t.id = cp.transaction_id
    on conflict (crypto_payment_id) do nothing;

    return jsonb_build_object('outcome', v_outcome, 'state', cp.state, 'charge', settle);
  end if;

  return jsonb_build_object('outcome', v_outcome, 'state', cp.state);
end;
$function$;

revoke all on function public.crypto_payment_apply(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.crypto_payment_apply(text, text, text, text, text, jsonb) to service_role;

/* The reconcile job's read: crypto payments still moving, oldest update first. */
create or replace function public.crypto_payments_due_for_check(p_limit integer default 25)
returns table (reference text, provider text, provider_payment_id text, state text, quote_expires_at timestamptz,
               updated_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select c.reference, c.provider, c.provider_payment_id, c.state, c.quote_expires_at, c.updated_at
    from public.crypto_payments c
   where c.state not in ('settled', 'refunded', 'failed', 'expired')
      or (c.state = 'expired' and c.updated_at > now() - interval '24 hours' and c.provider_payment_id is not null)
   order by c.updated_at asc
   limit greatest(1, least(coalesce(p_limit, 25), 200));
$function$;

revoke all on function public.crypto_payments_due_for_check(integer) from public, anon, authenticated;
grant execute on function public.crypto_payments_due_for_check(integer) to service_role;

/* ---------------------------------------------------------------- read-back */

do $$
begin
  if not exists (select 1 from public.feature_flags where key = 'crypto_payments' and enabled = false) then
    raise exception 'read-back: crypto_payments flag is missing or on';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.crypto_payments'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.crypto_payment_events'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.crypto_aml_records'::regclass) then
    raise exception 'read-back: RLS is off on a crypto table';
  end if;
  if has_table_privilege('anon', 'public.crypto_payments', 'select')
     or has_table_privilege('anon', 'public.crypto_aml_records', 'select')
     or has_table_privilege('anon', 'public.crypto_payment_events', 'select') then
    raise exception 'read-back: anon can read a crypto table';
  end if;
  if has_table_privilege('authenticated', 'public.crypto_payments', 'insert')
     or has_table_privilege('authenticated', 'public.crypto_payments', 'update')
     or has_table_privilege('authenticated', 'public.crypto_payments', 'delete')
     or has_table_privilege('authenticated', 'public.crypto_aml_records', 'insert')
     or has_table_privilege('authenticated', 'public.crypto_payment_events', 'insert') then
    raise exception 'read-back: authenticated can write a crypto table';
  end if;
  if has_function_privilege('authenticated', 'public.crypto_payment_apply(text,text,text,text,text,jsonb)', 'execute')
     or has_function_privilege('anon', 'public.crypto_payment_apply(text,text,text,text,text,jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.crypto_open_attempt(uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.crypto_payments_due_for_check(integer)', 'execute') then
    raise exception 'read-back: an API role can call a crypto door';
  end if;
  if not has_function_privilege('service_role', 'public.crypto_payment_apply(text,text,text,text,text,jsonb)', 'execute') then
    raise exception 'read-back: service_role cannot apply crypto events';
  end if;
  if private.crypto_transition_allowed('settled', 'failed') or private.crypto_transition_allowed('refunded', 'settled')
     or not private.crypto_transition_allowed('converting', 'settled')
     or private.crypto_transition_allowed('converting', 'confirming') then
    raise exception 'read-back: the crypto status machine is wrong';
  end if;
end $$;
