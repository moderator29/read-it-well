-- MONEY 2 / V-20: THE CANCELLATION TERMS THAT PRICED A STAY ARE FROZEN WHEN
-- THE HOST ACCEPTS, AND CONFIRMED AT PAYMENT.
--
-- Supersedes the unapplied 20260924140200_v20 (moved to superseded/). The
-- original froze the terms from a trigger on `transactions` at payment and
-- named the retired wallet pay path; there is only the split card path now.
--
-- WHERE THE TERMS ARE FROZEN.
--   1. AT ACCEPTANCE. A stay's agreement is drawn up when the host accepts
--      (`private.agreement_open_for_stay`, Track A.2). A BEFORE INSERT trigger
--      on `deal_agreements` writes the schedule into the agreement's own
--      terms (`terms -> 'cancellation'`), so the guest and the host confirm
--      the refund schedule as part of the version they confirm, and an AFTER
--      INSERT trigger copies it into `booking_cancellation_terms`.
--   2. AT PAYMENT, as the backstop. An AFTER trigger on `transactions`
--      reaching SUCCESSFUL writes the row if acceptance did not (a booking
--      whose agreement predates this file). `on conflict do nothing`: the
--      terms frozen at acceptance are never overwritten.
--   Rent charges get no row: a tenancy is settled in its own agreement.
--
-- SETTLEMENT IS NEVER BROKEN BY THIS FILE. Both triggers catch every error of
-- their own and raise a medium risk alert instead; the probe shipped with the
-- MONEY work settles a charge with the trigger in place.
--
-- The table is append-only, readable by whoever may read the booking, and
-- writable by nobody but these triggers.

create table if not exists public.booking_cancellation_terms (
  booking_id  uuid primary key references public.bookings(id) on delete cascade,
  source      text not null check (source = 'platform_schedule_v1' or source like 'policy:%'),
  terms       jsonb not null,
  frozen_at   timestamptz not null default now(),
  constraint booking_cancellation_terms_shape check (
    jsonb_typeof(terms -> 'tiers') = 'array'
    and jsonb_typeof(terms -> 'check_in_hour') = 'number')
);

comment on table public.booking_cancellation_terms is
  'V-20. The cancellation terms that price a stay''s refund, frozen when the host accepts (from the agreement both parties confirm) or, as a backstop, when the split charge settles. Append-only. A refund to the card is computed from this row, never from the live schedule.';

alter table public.booking_cancellation_terms enable row level security;
revoke all on public.booking_cancellation_terms from public, anon, authenticated;
grant select on public.booking_cancellation_terms to authenticated;
grant select, insert on public.booking_cancellation_terms to service_role;

drop policy if exists booking_cancellation_terms_read on public.booking_cancellation_terms;
create policy booking_cancellation_terms_read on public.booking_cancellation_terms for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_cancellation_terms.booking_id));

create or replace function private.booking_cancellation_terms_are_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.bookings b where b.id = old.booking_id) then
    return old;
  end if;
  raise exception 'public.booking_cancellation_terms is frozen: terms that priced a stay never change'
    using errcode = '42501';
end;
$function$;
revoke all on function private.booking_cancellation_terms_are_frozen() from public, anon, authenticated;
drop trigger if exists booking_cancellation_terms_no_update on public.booking_cancellation_terms;
create trigger booking_cancellation_terms_no_update
  before update or delete on public.booking_cancellation_terms
  for each row execute function private.booking_cancellation_terms_are_frozen();

/* The platform schedule, as data. Twin of CANCELLATION_STOPS in
   lib/trust/cancellation.ts; cancellation.test.ts holds them equal. */
create or replace function private.platform_cancellation_terms_v1()
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select '{"version":1,"check_in_hour":15,"tiers":[{"closes_hours_before":72,"refund_bps":10000},{"closes_hours_before":0,"refund_bps":5000}]}'::jsonb;
$function$;
revoke all on function private.platform_cancellation_terms_v1() from public, anon, authenticated;

/* 1a. The schedule goes into the stay agreement both parties confirm. */
create or replace function private.stay_agreement_carries_cancellation_terms()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.kind = 'stay' and not (new.terms ? 'cancellation') then
    new.terms := new.terms || jsonb_build_object('cancellation', private.platform_cancellation_terms_v1(),
                                                 'cancellation_source', 'platform_schedule_v1');
  end if;
  return new;
end;
$function$;
revoke all on function private.stay_agreement_carries_cancellation_terms() from public, anon, authenticated;
drop trigger if exists deal_agreements_01_stay_cancellation_terms on public.deal_agreements;
create trigger deal_agreements_01_stay_cancellation_terms
  before insert on public.deal_agreements
  for each row execute function private.stay_agreement_carries_cancellation_terms();

/* 1b. And is frozen against the booking the moment the agreement exists. */
create or replace function private.freeze_cancellation_terms_on_acceptance()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.kind <> 'stay' or new.booking_id is null or not (new.terms ? 'cancellation') then
    return new;
  end if;
  begin
    insert into public.booking_cancellation_terms (booking_id, source, terms)
    values (new.booking_id, coalesce(new.terms ->> 'cancellation_source', 'platform_schedule_v1'), new.terms -> 'cancellation')
    on conflict (booking_id) do nothing;
  exception when others then
    begin
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'Cancellation terms were not frozen at acceptance',
              format('Booking %s was accepted but its terms row was not written: %s', new.booking_id, sqlerrm),
              'booking', new.booking_id::text);
    exception when others then
      null;
    end;
  end;
  return new;
end;
$function$;
revoke all on function private.freeze_cancellation_terms_on_acceptance() from public, anon, authenticated;
drop trigger if exists deal_agreements_freeze_cancellation_terms on public.deal_agreements;
create trigger deal_agreements_freeze_cancellation_terms
  after insert on public.deal_agreements
  for each row execute function private.freeze_cancellation_terms_on_acceptance();

/* 2. The backstop at payment. Inside the settlement transaction: never raises. */
create or replace function private.freeze_cancellation_terms_on_payment()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  agreed jsonb;
  agreed_source text;
begin
  if new.booking_id is null or new.status <> 'SUCCESSFUL' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'SUCCESSFUL' then
    return new;
  end if;
  begin
    if exists (select 1 from public.rent_payments rp where rp.booking_id = new.booking_id)
       or exists (select 1 from public.booking_cancellation_terms c where c.booking_id = new.booking_id) then
      return new;
    end if;
    select a.terms -> 'cancellation', a.terms ->> 'cancellation_source' into agreed, agreed_source
      from public.deal_agreements a where a.booking_id = new.booking_id and a.kind = 'stay';
    insert into public.booking_cancellation_terms (booking_id, source, terms)
    values (new.booking_id, coalesce(agreed_source, 'platform_schedule_v1'),
            coalesce(agreed, private.platform_cancellation_terms_v1()))
    on conflict (booking_id) do nothing;
  exception when others then
    begin
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'Cancellation terms were not frozen at payment',
              format('Booking %s settled but its terms row was not written: %s', new.booking_id, sqlerrm),
              'booking', new.booking_id::text);
    exception when others then
      null;
    end;
  end;
  return new;
end;
$function$;
revoke all on function private.freeze_cancellation_terms_on_payment() from public, anon, authenticated;
drop trigger if exists transactions_freeze_cancellation_terms on public.transactions;
create trigger transactions_freeze_cancellation_terms
  after insert or update of status on public.transactions
  for each row execute function private.freeze_cancellation_terms_on_payment();

-- Stays already accepted or paid (none live).
insert into public.booking_cancellation_terms (booking_id, source, terms)
select a.booking_id, 'platform_schedule_v1', private.platform_cancellation_terms_v1()
  from public.deal_agreements a
 where a.kind = 'stay' and a.booking_id is not null
on conflict (booking_id) do nothing;
insert into public.booking_cancellation_terms (booking_id, source, terms, frozen_at)
select distinct on (t.booking_id) t.booking_id, 'platform_schedule_v1', private.platform_cancellation_terms_v1(), t.created_at
  from public.transactions t
 where t.status = 'SUCCESSFUL' and t.booking_id is not null
   and not exists (select 1 from public.rent_payments rp where rp.booking_id = t.booking_id)
 order by t.booking_id, t.created_at
on conflict (booking_id) do nothing;

/* ------------------------------------------------------------------ read back */
do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.booking_cancellation_terms'::regclass and relrowsecurity) then
    raise exception 'booking_cancellation_terms has no RLS';
  end if;
  if has_table_privilege('authenticated', 'public.booking_cancellation_terms', 'INSERT, UPDATE, DELETE, TRUNCATE')
     or has_table_privilege('anon', 'public.booking_cancellation_terms', 'SELECT') then
    raise exception 'booking_cancellation_terms is writable or anon-readable';
  end if;
  if (select count(*) from pg_trigger where tgname in ('deal_agreements_01_stay_cancellation_terms',
        'deal_agreements_freeze_cancellation_terms', 'transactions_freeze_cancellation_terms')) <> 3 then
    raise exception 'a V-20 trigger is missing';
  end if;
  if (private.platform_cancellation_terms_v1() -> 'tiers' -> 0 ->> 'refund_bps')::int <> 10000 then
    raise exception 'the platform schedule is not the twin of CANCELLATION_STOPS';
  end if;
end $$;
