-- THE APPEND-ONLY LEDGER, IN THREE POTS (Session 2, 7.5; feature register
-- E5.1 to E5.3; D50, D51 "the three pots, separated in the schema").
--
-- Three pots, three tables, never a column on one table, so no query, grant
-- or bug can mix customer money with Vallo's:
--
--   public.ledger_customer_funds   the member's money at the provider
--                                  (Paystack in flight, Payluk held). Vallo
--                                  never holds it (ADR-0002, ADR-0003); this
--                                  pot records where the provider says it is.
--   public.ledger_vallo_revenue    Vallo's own money: commission, withdrawal
--                                  fees, promotion. VAT, when it is ever
--                                  charged, is NOT revenue and gets its own
--                                  line, never this pot (D51).
--   public.ledger_marketing_float  Vallo's own money set aside to fund
--                                  referral payouts (D51). Never customer funds.
--
-- WHAT EXISTED, INSPECTED 6 OCTOBER 2026, AND WHY THIS IS NOT A DUPLICATE.
-- `ledger_entries` (0 rows) is one row per settled booking charge with the
-- split as columns: a settlement record, not an event ledger, and it can be
-- edited. `guarantee_reserve_entries` (0 rows) is the Guarantee's own
-- append-only book, retired at guarantee_bps = 0 (D51) and left as it is.
-- `platform_revenue` (0 rows, no append-only trigger, written by nothing) is
-- left untouched; the revenue pot here supersedes it and it should be retired
-- in a later change once nothing reads it (D5: never dropped in the same change).
--
-- Every pot carries the E5.1 columns and the fourteen E5.2 event types.
-- CORRECTIONS ARE NEW ENTRIES (E5.3): a correcting entry names the entry it
-- corrects and moves the opposite way; no row is ever updated, deleted or
-- truncated (trigger, reusing private.history_is_fixed).
--
-- WRITERS. Nothing writes these tables directly, not even service_role:
--  - private.ledger_append(...) for one entry, idempotent on its key;
--  - public.ledger_record_escrow_commission(...): on the escrow rail Payluk
--    cannot split, so Vallo's commission is a separate recorded movement OUT
--    of customer funds and INTO revenue, both entries in one transaction;
--  - the AFTER INSERT trigger on ledger_entries, so the existing direct-rail
--    settlement (private.settle_booking_charge) writes the pot entries without
--    that function being rewritten. A direct charge is split at the moment of
--    payment, so its customer-funds entries net to zero: the ledger itself
--    shows that nothing is held on the direct rail. A posting failure never
--    blocks a settlement of money already taken: it raises a risk alert.
--
-- Additive, idempotent, RLS on. Probe: supabase/tests/probes/b2-ledger.sql.

set local lock_timeout = '5s';

-- The fourteen event types (E5.2), in one place.
create or replace function private.is_ledger_event(p text)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select p in (
    'DEPOSIT_INITIATED', 'DEPOSIT_CONFIRMED',
    'WITHDRAWAL_INITIATED', 'WITHDRAWAL_COMPLETED',
    'TRANSFER_INITIATED', 'TRANSFER_COMPLETED',
    'ESCROW_CREATED', 'ESCROW_FUNDED', 'ESCROW_RELEASED',
    'REFUND_INITIATED', 'REFUND_COMPLETED',
    'FEE_CHARGED',
    'DISPUTE_OPENED', 'DISPUTE_RESOLVED')
$function$;

-- One shape, three tables. Written out three times on purpose: a pot is its
-- own object with its own grants, never a filtered view of a shared table.
create table if not exists public.ledger_customer_funds (
  id                 uuid primary key default gen_random_uuid(),
  idempotency_key    text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  transaction_id     uuid references public.transactions(id),
  provider           text not null check (provider in ('paystack', 'payluk')),
  provider_reference text,
  rail               text check (rail in ('escrow', 'direct')),
  event_type         text not null check (private.is_ledger_event(event_type)),
  amount_minor       bigint not null check (amount_minor > 0),
  currency           text not null check (currency ~ '^[A-Z]{3}$'),
  direction          text not null check (direction in ('in', 'out')),
  status             text not null default 'confirmed' check (status in ('pending', 'confirmed', 'failed', 'unknown')),
  corrects_entry_id  uuid references public.ledger_customer_funds(id),
  metadata           jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);

create table if not exists public.ledger_vallo_revenue (
  id                 uuid primary key default gen_random_uuid(),
  idempotency_key    text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  transaction_id     uuid references public.transactions(id),
  provider           text not null check (provider in ('paystack', 'payluk', 'vallo')),
  provider_reference text,
  rail               text check (rail in ('escrow', 'direct')),
  -- Revenue is never held in escrow and never a deposit.
  event_type         text not null check (private.is_ledger_event(event_type)
                                          and event_type not in ('ESCROW_CREATED', 'ESCROW_FUNDED', 'ESCROW_RELEASED',
                                                                 'DEPOSIT_INITIATED', 'DEPOSIT_CONFIRMED')),
  amount_minor       bigint not null check (amount_minor > 0),
  currency           text not null check (currency ~ '^[A-Z]{3}$'),
  direction          text not null check (direction in ('in', 'out')),
  status             text not null default 'confirmed' check (status in ('pending', 'confirmed', 'failed', 'unknown')),
  corrects_entry_id  uuid references public.ledger_vallo_revenue(id),
  metadata           jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);

create table if not exists public.ledger_marketing_float (
  id                 uuid primary key default gen_random_uuid(),
  idempotency_key    text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  transaction_id     uuid references public.transactions(id),
  provider           text not null check (provider in ('paystack', 'vallo')),
  provider_reference text,
  rail               text check (rail in ('escrow', 'direct')),
  -- The float is Vallo's money for referral payouts: never escrow, never a dispute.
  event_type         text not null check (private.is_ledger_event(event_type)
                                          and event_type not in ('ESCROW_CREATED', 'ESCROW_FUNDED', 'ESCROW_RELEASED',
                                                                 'DISPUTE_OPENED', 'DISPUTE_RESOLVED')),
  amount_minor       bigint not null check (amount_minor > 0),
  currency           text not null check (currency ~ '^[A-Z]{3}$'),
  direction          text not null check (direction in ('in', 'out')),
  status             text not null default 'confirmed' check (status in ('pending', 'confirmed', 'failed', 'unknown')),
  corrects_entry_id  uuid references public.ledger_marketing_float(id),
  metadata           jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);

comment on table public.ledger_customer_funds is
  'POT 1 of 3: customer money at the provider, never Vallo''s. Append-only; corrections are new entries. Session 2, 7.5.';
comment on table public.ledger_vallo_revenue is
  'POT 2 of 3: Vallo revenue (commission, withdrawal fees, promotion). Never VAT, never customer money. Append-only. Session 2, 7.5.';
comment on table public.ledger_marketing_float is
  'POT 3 of 3: Vallo''s marketing float funding referral payouts. Append-only. Session 2, 7.5.';

create index if not exists ledger_customer_funds_tx on public.ledger_customer_funds (transaction_id) where transaction_id is not null;
create index if not exists ledger_vallo_revenue_tx on public.ledger_vallo_revenue (transaction_id) where transaction_id is not null;
create index if not exists ledger_marketing_float_tx on public.ledger_marketing_float (transaction_id) where transaction_id is not null;
create index if not exists ledger_customer_funds_corrects on public.ledger_customer_funds (corrects_entry_id) where corrects_entry_id is not null;
create index if not exists ledger_vallo_revenue_corrects on public.ledger_vallo_revenue (corrects_entry_id) where corrects_entry_id is not null;
create index if not exists ledger_marketing_float_corrects on public.ledger_marketing_float (corrects_entry_id) where corrects_entry_id is not null;

-- RLS on, no policy: no member and no anonymous caller reads or writes a pot.
-- service_role reads (the admin desks); nobody writes except the functions below.
alter table public.ledger_customer_funds enable row level security;
alter table public.ledger_vallo_revenue enable row level security;
alter table public.ledger_marketing_float enable row level security;
revoke all on public.ledger_customer_funds, public.ledger_vallo_revenue, public.ledger_marketing_float from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ledger_customer_funds, public.ledger_vallo_revenue, public.ledger_marketing_float from service_role;
grant select on public.ledger_customer_funds, public.ledger_vallo_revenue, public.ledger_marketing_float to service_role;

-- APPEND-ONLY. private.history_is_fixed already exists (guarantee_reserve_entries).
create or replace trigger ledger_customer_funds_fixed
  before update or delete on public.ledger_customer_funds
  for each row execute function private.history_is_fixed();
create or replace trigger ledger_customer_funds_no_truncate
  before truncate on public.ledger_customer_funds
  for each statement execute function private.history_is_fixed();
create or replace trigger ledger_vallo_revenue_fixed
  before update or delete on public.ledger_vallo_revenue
  for each row execute function private.history_is_fixed();
create or replace trigger ledger_vallo_revenue_no_truncate
  before truncate on public.ledger_vallo_revenue
  for each statement execute function private.history_is_fixed();
create or replace trigger ledger_marketing_float_fixed
  before update or delete on public.ledger_marketing_float
  for each row execute function private.history_is_fixed();
create or replace trigger ledger_marketing_float_no_truncate
  before truncate on public.ledger_marketing_float
  for each statement execute function private.history_is_fixed();

-- A CORRECTION moves the opposite way to the entry it corrects, in the same
-- currency, by no more than it, and only once in full.
create or replace function private.ledger_correction_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  o_direction text;
  o_amount bigint;
  o_currency text;
  already bigint;
begin
  if new.corrects_entry_id is null then
    return new;
  end if;
  execute format('select direction, amount_minor, currency from %I.%I where id = $1', tg_table_schema, tg_table_name)
    into o_direction, o_amount, o_currency using new.corrects_entry_id;
  if o_direction is null then
    raise exception 'a correction must name an entry in the same pot' using errcode = '23503';
  end if;
  if new.direction = o_direction or new.currency <> o_currency then
    raise exception 'a correction moves the opposite way, in the same currency' using errcode = '23514';
  end if;
  execute format('select coalesce(sum(amount_minor), 0) from %I.%I where corrects_entry_id = $1', tg_table_schema, tg_table_name)
    into already using new.corrects_entry_id;
  if already + new.amount_minor > o_amount then
    raise exception 'corrections cannot exceed the entry they correct' using errcode = '23514';
  end if;
  return new;
end;
$function$;

create or replace trigger ledger_customer_funds_00_correction
  before insert on public.ledger_customer_funds
  for each row execute function private.ledger_correction_guard();
create or replace trigger ledger_vallo_revenue_00_correction
  before insert on public.ledger_vallo_revenue
  for each row execute function private.ledger_correction_guard();
create or replace trigger ledger_marketing_float_00_correction
  before insert on public.ledger_marketing_float
  for each row execute function private.ledger_correction_guard();

-- THE ONE DOOR. Idempotent on the key: a replay returns the entry already
-- written and writes nothing. A replay that disagrees with what was written
-- under the same key is an error, never silently accepted.
create or replace function private.ledger_append(
  p_pot text,
  p_key text,
  p_event text,
  p_direction text,
  p_amount bigint,
  p_currency text,
  p_provider text,
  p_provider_reference text default null,
  p_transaction uuid default null,
  p_rail text default null,
  p_status text default 'confirmed',
  p_metadata jsonb default '{}'::jsonb,
  p_corrects uuid default null,
  p_actor uuid default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_table text;
  v_id uuid;
  v_same boolean;
begin
  v_table := case p_pot
    when 'customer_funds' then 'ledger_customer_funds'
    when 'vallo_revenue' then 'ledger_vallo_revenue'
    when 'marketing_float' then 'ledger_marketing_float'
  end;
  if v_table is null then
    raise exception 'unknown ledger pot %', p_pot using errcode = '22023';
  end if;
  execute format(
    'insert into public.%I (idempotency_key, transaction_id, provider, provider_reference, rail, event_type,
                           amount_minor, currency, direction, status, metadata, corrects_entry_id, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     on conflict (idempotency_key) do nothing
     returning id', v_table)
    into v_id
    using p_key, p_transaction, p_provider, p_provider_reference, p_rail, p_event,
          p_amount, p_currency, p_direction, coalesce(p_status, 'confirmed'), coalesce(p_metadata, '{}'::jsonb), p_corrects, p_actor;
  if v_id is not null then
    return v_id;
  end if;
  execute format(
    'select id, (event_type = $2 and direction = $3 and amount_minor = $4 and currency = $5
                 and transaction_id is not distinct from $6)
       from public.%I where idempotency_key = $1', v_table)
    into v_id, v_same
    using p_key, p_event, p_direction, p_amount, p_currency, p_transaction;
  if v_same is not true then
    raise exception 'ledger key % already holds a different entry', p_key using errcode = '23505';
  end if;
  return v_id;
end;
$function$;

revoke all on function private.ledger_append(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid) from public, anon, authenticated;

-- The server's door (service_role only), for the app's event writers.
create or replace function public.ledger_record(
  p_pot text, p_key text, p_event text, p_direction text, p_amount bigint, p_currency text, p_provider text,
  p_provider_reference text default null, p_transaction uuid default null, p_rail text default null,
  p_status text default 'confirmed', p_metadata jsonb default '{}'::jsonb, p_corrects uuid default null,
  p_actor uuid default null)
returns uuid
language sql
security definer
set search_path to ''
as $function$
  select private.ledger_append(p_pot, p_key, p_event, p_direction, p_amount, p_currency, p_provider,
                               p_provider_reference, p_transaction, p_rail, p_status, p_metadata, p_corrects, p_actor)
$function$;

revoke all on function public.ledger_record(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.ledger_record(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid) to service_role;

-- ESCROW COMMISSION. Payluk cannot split, so Vallo's commission on an escrow
-- payment is its own movement: out of customer funds, into revenue, together
-- or not at all. Only for a transaction that opened on the escrow rail.
create or replace function public.ledger_record_escrow_commission(
  p_transaction uuid, p_amount bigint, p_provider_reference text default null, p_actor uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx public.transactions%rowtype;
  v_out uuid;
  v_in uuid;
begin
  select * into tx from public.transactions where id = p_transaction;
  if tx.id is null then
    raise exception 'no such transaction' using errcode = '22023';
  end if;
  if tx.rail is distinct from 'escrow' then
    raise exception 'escrow commission is recorded only on the escrow rail' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > tx.amount_minor then
    raise exception 'the commission must be positive and no more than the payment' using errcode = '22023';
  end if;
  v_out := private.ledger_append('customer_funds', 'escrow-commission:' || tx.id::text || ':out', 'FEE_CHARGED', 'out',
                                 p_amount, tx.currency, 'payluk', coalesce(p_provider_reference, tx.provider_ref), tx.id,
                                 'escrow', 'confirmed', jsonb_build_object('leg', 'commission'), null, p_actor);
  v_in := private.ledger_append('vallo_revenue', 'escrow-commission:' || tx.id::text || ':in', 'FEE_CHARGED', 'in',
                                p_amount, tx.currency, 'payluk', coalesce(p_provider_reference, tx.provider_ref), tx.id,
                                'escrow', 'confirmed', jsonb_build_object('leg', 'commission', 'pair', v_out), null, p_actor);
  return jsonb_build_object('customer_funds_entry', v_out, 'revenue_entry', v_in);
end;
$function$;

revoke all on function public.ledger_record_escrow_commission(uuid, bigint, text, uuid) from public, anon, authenticated;
grant execute on function public.ledger_record_escrow_commission(uuid, bigint, text, uuid) to service_role;

-- DIRECT-RAIL SETTLEMENT. Paystack splits at the charge, so the customer's
-- money comes in and goes straight out to the lister, the processor, the
-- reserve (zero today) and Vallo's commission: it nets to zero, and the
-- commission lands in revenue. Keyed on the transaction, so a replay is a no-op.
create or replace function private.ledger_post_direct_settlement(p_entry public.ledger_entries)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx public.transactions%rowtype;
  k text;
  ref text;
begin
  if p_entry.transaction_id is null then
    return;
  end if;
  select * into tx from public.transactions where id = p_entry.transaction_id;
  if tx.id is null or tx.provider <> 'paystack' then
    return;
  end if;
  k := 'settle:' || tx.id::text || ':';
  ref := tx.provider_ref;
  if p_entry.gross_minor > 0 then
    perform private.ledger_append('customer_funds', k || 'collected', 'DEPOSIT_CONFIRMED', 'in', p_entry.gross_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'charge', 'booking_id', p_entry.booking_id));
  end if;
  if p_entry.agent_share_minor > 0 then
    perform private.ledger_append('customer_funds', k || 'lister', 'TRANSFER_COMPLETED', 'out', p_entry.agent_share_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'lister', 'subaccount', tx.payee_subaccount_code));
  end if;
  if p_entry.processor_fee_minor > 0 then
    perform private.ledger_append('customer_funds', k || 'processor', 'FEE_CHARGED', 'out', p_entry.processor_fee_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'processor_fee'));
  end if;
  if p_entry.guarantee_reserve_minor > 0 then
    perform private.ledger_append('customer_funds', k || 'reserve', 'TRANSFER_COMPLETED', 'out', p_entry.guarantee_reserve_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'guarantee_reserve', 'subaccount', tx.reserve_subaccount_code));
  end if;
  if p_entry.platform_fee_minor > 0 then
    perform private.ledger_append('customer_funds', k || 'commission', 'FEE_CHARGED', 'out', p_entry.platform_fee_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'commission'));
    perform private.ledger_append('vallo_revenue', k || 'commission', 'FEE_CHARGED', 'in', p_entry.platform_fee_minor,
      tx.currency, 'paystack', ref, tx.id, tx.rail, 'confirmed', jsonb_build_object('leg', 'commission'));
  end if;
end;
$function$;

revoke all on function private.ledger_post_direct_settlement(public.ledger_entries) from public, anon, authenticated;

create or replace function private.ledger_entries_post_pots()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  begin
    perform private.ledger_post_direct_settlement(new);
  exception when others then
    -- Money already taken is never refused because its bookkeeping failed.
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A settled charge could not be written to the ledger pots',
            format('Transaction %s settled but its pot entries failed (%s). Post them by hand as new entries.',
                   new.transaction_id, sqlerrm),
            'booking', new.booking_id::text);
  end;
  return new;
end;
$function$;

create or replace trigger ledger_entries_zz_post_pots
  after insert on public.ledger_entries
  for each row execute function private.ledger_entries_post_pots();

-- What each pot holds, per currency. security_invoker, so it is exactly as
-- readable as the pots (service_role only).
create or replace view public.ledger_pot_balances
with (security_invoker = true) as
  select 'customer_funds'::text as pot, currency,
         sum(case direction when 'in' then amount_minor else -amount_minor end)::bigint as balance_minor,
         count(*) as entries
    from public.ledger_customer_funds where status = 'confirmed' group by currency
  union all
  select 'vallo_revenue', currency,
         sum(case direction when 'in' then amount_minor else -amount_minor end)::bigint, count(*)
    from public.ledger_vallo_revenue where status = 'confirmed' group by currency
  union all
  select 'marketing_float', currency,
         sum(case direction when 'in' then amount_minor else -amount_minor end)::bigint, count(*)
    from public.ledger_marketing_float where status = 'confirmed' group by currency;

revoke all on public.ledger_pot_balances from public, anon, authenticated;
grant select on public.ledger_pot_balances to service_role;

-- READ-BACK: fails the migration if anything did not land as intended.
do $check$
declare
  t text;
  trg text;
begin
  foreach t in array array['ledger_customer_funds', 'ledger_vallo_revenue', 'ledger_marketing_float'] loop
    if to_regclass('public.' || t) is null then raise exception '% missing', t; end if;
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise exception '% has no RLS', t;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t) then
      raise exception '% has a policy; pots are read by service_role only', t;
    end if;
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('authenticated', 'public.' || t, 'select')
       or has_table_privilege('authenticated', 'public.' || t, 'insert') then
      raise exception '% is reachable by an app role', t;
    end if;
    if has_table_privilege('service_role', 'public.' || t, 'insert')
       or has_table_privilege('service_role', 'public.' || t, 'update')
       or has_table_privilege('service_role', 'public.' || t, 'delete') then
      raise exception '% is writable by service_role directly; only the ledger functions write', t;
    end if;
    foreach trg in array array[t || '_fixed', t || '_no_truncate', t || '_00_correction'] loop
      if not exists (select 1 from pg_trigger where tgname = trg and tgrelid = ('public.' || t)::regclass
                      and not tgisinternal and tgenabled = 'O') then
        raise exception 'trigger % missing or disabled', trg;
      end if;
    end loop;
  end loop;
  if not exists (select 1 from pg_trigger where tgname = 'ledger_entries_zz_post_pots'
                  and tgrelid = 'public.ledger_entries'::regclass and tgenabled = 'O') then
    raise exception 'settlement posting trigger missing';
  end if;
  if (select count(*) from unnest(array['DEPOSIT_INITIATED','DEPOSIT_CONFIRMED','WITHDRAWAL_INITIATED','WITHDRAWAL_COMPLETED',
        'TRANSFER_INITIATED','TRANSFER_COMPLETED','ESCROW_CREATED','ESCROW_FUNDED','ESCROW_RELEASED','REFUND_INITIATED',
        'REFUND_COMPLETED','FEE_CHARGED','DISPUTE_OPENED','DISPUTE_RESOLVED']) e where private.is_ledger_event(e)) <> 14
     or private.is_ledger_event('BALANCE_ADJUSTED') then
    raise exception 'the fourteen event types did not land exactly';
  end if;
  if has_function_privilege('authenticated', 'public.ledger_record(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid)', 'execute')
     or has_function_privilege('anon', 'public.ledger_record(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.ledger_record_escrow_commission(uuid, bigint, text, uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.ledger_append(text, text, text, text, bigint, text, text, text, uuid, text, text, jsonb, uuid, uuid)', 'execute') then
    raise exception 'a ledger writer is callable by an app role';
  end if;
  if has_table_privilege('authenticated', 'public.ledger_pot_balances', 'select') or has_table_privilege('anon', 'public.ledger_pot_balances', 'select') then
    raise exception 'pot balances readable by an app role';
  end if;
end;
$check$;
