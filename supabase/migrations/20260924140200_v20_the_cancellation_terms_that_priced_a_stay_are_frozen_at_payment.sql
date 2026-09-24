-- V-20: THE CANCELLATION TERMS THAT PRICED A STAY ARE FROZEN WHEN IT IS PAID.
--
-- The platform schedule lives in code (`lib/trust/cancellation.ts`, 72 hours)
-- and the per-property `cancellation_policies` live in an editable table, so a
-- deploy or a host's edit could silently change the refund on a stay somebody
-- has already paid for. `rent_payments` freezes its parts for exactly this
-- reason, and docs/PRODUCT.md section 3 says a booking made under one rate
-- completes under that rate. This file gives stays the same guarantee.
--
-- A SIDE TABLE, NOT A COLUMN ON `bookings`. The entry proposed
-- `bookings.cancellation_terms`. `bookings` is written by the guest, the host
-- and the admin under RLS, carries the audit's pending pricing trigger, and
-- announces every update through `notify_booking_change`. A frozen fact does
-- not belong on a row three parties can update; a one-row-per-booking table
-- with no write grant, append-only like `booking_refunds`, cannot be edited by
-- anybody, and a read of it rides the bookings RLS through its policy.
--
-- FROZEN AT PAYMENT, BY A TRIGGER ON `transactions`. Both pay paths
-- (`pay_booking_from_wallet` and the card webhook's settlement) are the audit
-- session's and are not touched. They both end in a `transactions` row that
-- is SUCCESSFUL, so an AFTER trigger on that row writes the terms in the same
-- database transaction as the payment. `on conflict do nothing` means terms
-- written earlier (by the future room-reserve path, which knows the rate
-- plan's own policy) are never overwritten by the platform default.
--
-- RENT CHARGES ARE NOT STAYS and get no terms: a tenancy is settled in its own
-- agreement, as the cancellations page says.
--
-- THE SHAPE. `tiers` in order, each `{closes_hours_before, refund_bps}`: the
-- first tier whose window is still open decides, and after the last one
-- nothing comes back. Basis points out of 10,000, integer. `check_in_hour` is
-- the Lagos hour the hours are measured to.

create table if not exists public.booking_cancellation_terms (
  booking_id  uuid primary key references public.bookings(id) on delete cascade,
  source      text not null check (source = 'platform_schedule_v1' or source like 'policy:%'),
  terms       jsonb not null,
  frozen_at   timestamptz not null default now(),
  constraint booking_cancellation_terms_shape check (
    jsonb_typeof(terms -> 'tiers') = 'array'
    and jsonb_typeof(terms -> 'check_in_hour') = 'number'
  )
);

comment on table public.booking_cancellation_terms is
  'V-20. The exact cancellation terms that priced a paid stay, frozen at the moment of payment by a trigger on transactions. Append-only. Refunds are computed from this row, never from the live schedule or the editable policies table.';

alter table public.booking_cancellation_terms enable row level security;
revoke all on public.booking_cancellation_terms from public, anon, authenticated;
grant select on public.booking_cancellation_terms to authenticated;
grant all on public.booking_cancellation_terms to service_role;

-- Whoever may read the booking may read its terms: the subquery runs under
-- the reader's own bookings RLS (guest, host, admin).
drop policy if exists booking_cancellation_terms_read on public.booking_cancellation_terms;
create policy booking_cancellation_terms_read
  on public.booking_cancellation_terms for select to authenticated
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
  raise exception 'public.booking_cancellation_terms is frozen: terms that priced a paid stay never change'
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

create or replace function private.freeze_cancellation_terms_on_payment()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.booking_id is null or new.status <> 'SUCCESSFUL' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'SUCCESSFUL' then
    return new;
  end if;
  if exists (select 1 from public.rent_payments rp where rp.booking_id = new.booking_id) then
    return new;
  end if;
  insert into public.booking_cancellation_terms (booking_id, source, terms)
  values (new.booking_id, 'platform_schedule_v1', private.platform_cancellation_terms_v1())
  on conflict (booking_id) do nothing;
  return new;
end;
$function$;

revoke all on function private.freeze_cancellation_terms_on_payment() from public, anon, authenticated;

drop trigger if exists transactions_freeze_cancellation_terms on public.transactions;
create trigger transactions_freeze_cancellation_terms
  after insert or update of status on public.transactions
  for each row execute function private.freeze_cancellation_terms_on_payment();

-- Stays already paid before this file were priced under the platform schedule,
-- which is the only schedule a catalogue booking has ever had. On the live
-- database there are none.
insert into public.booking_cancellation_terms (booking_id, source, terms, frozen_at)
select distinct on (t.booking_id) t.booking_id, 'platform_schedule_v1', private.platform_cancellation_terms_v1(), t.created_at
  from public.transactions t
 where t.status = 'SUCCESSFUL'
   and t.booking_id is not null
   and not exists (select 1 from public.rent_payments rp where rp.booking_id = t.booking_id)
 order by t.booking_id, t.created_at
on conflict (booking_id) do nothing;
