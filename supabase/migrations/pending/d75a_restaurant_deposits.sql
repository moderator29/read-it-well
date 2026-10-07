-- D75: restaurant deposits, the OpenTable no-show pattern, on the direct rail.
-- Pending: NOT applied. The lead reviews it, applies it through the MCP, and
-- commits it under the version the server stamps (scripts/check-migrations.mjs).
-- Its probe is supabase/tests/probes-pending/d75a-restaurant-deposits.sql.
--
-- Behind the switch `restaurant_deposits`, seeded OFF (a missing row reads off).
-- With it off: no rule applies, no deposit can be opened or settled, and the
-- confirm check below does nothing; reservations behave exactly as today.
--
-- WHAT A DEPOSIT IS. A restaurant may ask for a deposit on some service windows
-- or from some party size up (`restaurant_deposit_rules`). The guest pays it by
-- card through Paystack with the same split every stay uses: the venue's share
-- to the venue owner's own Paystack subaccount (`private.payee_subaccount`), and
-- Vallo's commission (`private.current_fee_bps('commission')`, 2 percent today,
-- money_policy_versions 2026-10-06.1) to Vallo. Vallo never holds it. It is
-- recorded against the reservation, deducted from the bill when the guest dines
-- (status `applied`), refunded by the restaurant's rule when cancelled in time or
-- by the venue (`refund_due`, then `refunded` once Paystack takes the refund),
-- and kept by the venue on a late cancellation or a no-show (`forfeited`).
--
-- WHY ITS OWN CHARGE ROW AND NOT `transactions`. `transactions.booking_id` is a
-- NOT NULL foreign key to bookings, and the payment gate, the split and
-- `settle_booking_charge` are all keyed on a booking and its deal agreement. A
-- reservation has neither, and making it a fake booking would put a dinner on
-- the stays sweeps, trips and reviews. So the deposit follows the precedent the
-- promotion purchase set (its own `rm-` prefix, open and settle functions, a
-- branch in the Paystack webhook) and reuses the same parts: the same split
-- functions, a BEFORE INSERT gate that refuses any charge row the database did
-- not compute (the shape of `transactions_00_payment_gate`), the settle rules of
-- `settle_booking_charge` (idempotent on the reference, a charge that cannot be
-- applied becomes refund-due with a high risk alert and an audit row), the
-- generic card refund claim (`claim_card_refund`, through lib/payments/refund.ts),
-- and the Vallo revenue ledger (`private.ledger_append`, as promotions post).
--
-- NO LIVE FUNCTION IS CHANGED. Two new triggers sit on `reservations`: one
-- refuses a venue confirming a reservation whose deposit is due and unpaid (only
-- with the switch on), and one decides the paid deposit's outcome when the
-- reservation is cancelled, completed or marked a no-show.

-- 0. The switch. --------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('restaurant_deposits', false,
        'D75: a restaurant may ask for a card deposit on some slots or party sizes, deducted from the bill and refunded by its own cancellation rule. Off until switched on.')
on conflict (key) do nothing;

create or replace function private.restaurant_deposits_on()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'restaurant_deposits'), false);
$$;
revoke all on function private.restaurant_deposits_on() from public, anon, authenticated;

-- 1. The restaurant's rules. -----------------------------------------------------
create table public.restaurant_deposit_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Null: every service window.
  service_window_id uuid references public.service_windows (id) on delete cascade,
  -- Null: every party size; otherwise this size and up.
  min_party_size smallint check (min_party_size is null or min_party_size between 1 and 50),
  -- At least 100 naira; per guest, or one amount for the table.
  amount_minor bigint not null check (amount_minor >= 10000 and amount_minor <= 100000000),
  per_guest boolean not null default true,
  -- A guest who cancels at least this long before the table gets it all back.
  refund_until_hours smallint not null default 24 check (refund_until_hours between 0 and 168),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurant_deposit_rules_business_idx on public.restaurant_deposit_rules (business_id) where active;
create trigger restaurant_deposit_rules_set_updated_at
  before update on public.restaurant_deposit_rules
  for each row execute function public.set_updated_at();

create or replace function private.restaurant_deposit_rule_is_valid()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.businesses b where b.id = new.business_id and b.kind = 'restaurant') then
    raise exception 'deposit_rule_not_a_restaurant: only a restaurant asks for a table deposit' using errcode = '23514';
  end if;
  if new.service_window_id is not null and not exists (
       select 1 from public.service_windows sw where sw.id = new.service_window_id and sw.business_id = new.business_id) then
    raise exception 'deposit_rule_window: the service window is not this restaurant''s' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger restaurant_deposit_rules_00_valid
  before insert or update on public.restaurant_deposit_rules
  for each row execute function private.restaurant_deposit_rule_is_valid();

alter table public.restaurant_deposit_rules enable row level security;
-- Guests read what a table will ask before they book it.
create policy restaurant_deposit_rules_read on public.restaurant_deposit_rules
  for select to anon, authenticated using (active or private.owns_business(business_id));
create policy restaurant_deposit_rules_owner_insert on public.restaurant_deposit_rules
  for insert to authenticated with check (private.owns_business(business_id));
create policy restaurant_deposit_rules_owner_update on public.restaurant_deposit_rules
  for update to authenticated using (private.owns_business(business_id)) with check (private.owns_business(business_id));
create policy restaurant_deposit_rules_owner_delete on public.restaurant_deposit_rules
  for delete to authenticated using (private.owns_business(business_id));
revoke all on public.restaurant_deposit_rules from anon, authenticated;
grant select on public.restaurant_deposit_rules to anon, authenticated;
grant insert, update, delete on public.restaurant_deposit_rules to authenticated;

-- 2. What a reservation owes. ----------------------------------------------------
-- The one computation: the gate, the open and the confirm check all call it.
create or replace function private.reservation_deposit_quote(p_reservation uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  local_at timestamp;
  rule public.restaurant_deposit_rules%rowtype;
  amount bigint;
  owner uuid;
  sub text;
  c_bps integer;
  commission bigint;
begin
  if not private.restaurant_deposits_on() then
    return jsonb_build_object('status', 'switched_off');
  end if;
  select * into r from public.reservations where id = p_reservation;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.business_id is null then
    return jsonb_build_object('status', 'no_deposit');
  end if;
  local_at := r.reserved_for at time zone 'Africa/Lagos';
  select d.* into rule
    from public.restaurant_deposit_rules d
    left join public.service_windows sw on sw.id = d.service_window_id
   where d.business_id = r.business_id and d.active
     and (d.min_party_size is null or r.party_size >= d.min_party_size)
     and (d.service_window_id is null
          or (sw.weekday = extract(dow from local_at)::smallint
              and sw.opens <= local_at::time and local_at::time <= sw.last_seating))
   order by (case when d.per_guest then d.amount_minor * r.party_size else d.amount_minor end) desc, d.created_at
   limit 1;
  if rule.id is null then
    return jsonb_build_object('status', 'no_deposit');
  end if;
  amount := case when rule.per_guest then rule.amount_minor * r.party_size else rule.amount_minor end;
  select b.owner_id into owner from public.businesses b where b.id = r.business_id;
  sub := private.payee_subaccount(owner);
  if sub is null then
    -- Nothing can be collected for a venue that cannot be paid: no deposit is asked.
    return jsonb_build_object('status', 'payee_not_set_up', 'rule_id', rule.id);
  end if;
  c_bps := private.current_fee_bps('commission');
  commission := (amount * c_bps) / 10000;
  return jsonb_build_object(
    'status', 'ok', 'rule_id', rule.id, 'reservation_id', r.id, 'guest_id', r.guest_id,
    'amount_minor', amount, 'currency', 'NGN', 'payee_user_id', owner, 'payee_subaccount_code', sub,
    'commission_bps', c_bps, 'commission_minor', commission, 'lister_share_minor', amount - commission,
    'refund_until', r.reserved_for - make_interval(hours => rule.refund_until_hours),
    'refund_until_hours', rule.refund_until_hours, 'per_guest', rule.per_guest);
end $$;
revoke all on function private.reservation_deposit_quote(uuid) from public, anon, authenticated;

-- The guest, or the venue, reads the quote for their own reservation.
create or replace function public.reservation_deposit_quote_for(p_reservation uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
begin
  select * into r from public.reservations where id = p_reservation;
  if r.id is null or not (r.guest_id = (select auth.uid())
                          or (r.business_id is not null and private.owns_business(r.business_id))) then
    return jsonb_build_object('status', 'not_found');
  end if;
  return private.reservation_deposit_quote(p_reservation) - 'payee_subaccount_code' - 'payee_user_id' - 'guest_id';
end $$;
revoke all on function public.reservation_deposit_quote_for(uuid) from public, anon;
grant execute on function public.reservation_deposit_quote_for(uuid) to authenticated, service_role;

-- 3. The charge record. ----------------------------------------------------------
create table public.reservation_deposits (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  rule_id uuid references public.restaurant_deposit_rules (id) on delete set null,
  guest_id uuid not null references auth.users (id) on delete restrict,
  payee_user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_ref text not null unique check (provider_ref ~ '^rm-dep-[0-9a-f-]{36}$'),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  payee_subaccount_code text not null,
  lister_share_minor bigint not null check (lister_share_minor >= 0),
  commission_minor bigint not null check (commission_minor >= 0),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  -- The restaurant's rule, frozen when the charge opened.
  refund_until timestamptz not null,
  paystack_mode text check (paystack_mode is null or paystack_mode in ('live', 'test')),
  authorization_url text check (authorization_url is null or authorization_url like 'https://%'),
  access_code text,
  status text not null default 'pending' check (status in (
    'pending', 'paid', 'applied', 'forfeited', 'refund_due', 'refunded', 'failed', 'abandoned')),
  paid_at timestamptz,
  decided_at timestamptz,
  outcome_reason text,
  processor_refund_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_deposits_split_adds_up check (lister_share_minor + commission_minor = amount_minor)
);
-- At most one deposit that is open or holds the guest's money with the venue,
-- per reservation. A refund_due or refunded row is outside it, so a late
-- payment on an abandoned checkout can always be recorded and sent back.
create unique index reservation_deposits_one_live_uidx
  on public.reservation_deposits (reservation_id)
  where status in ('pending', 'paid', 'applied', 'forfeited');
create index reservation_deposits_due_idx on public.reservation_deposits (status) where status = 'refund_due';
create trigger reservation_deposits_set_updated_at
  before update on public.reservation_deposits
  for each row execute function public.set_updated_at();

-- The gate: no deposit row that the database did not compute.
create or replace function private.reservation_deposits_gate()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  q jsonb := private.reservation_deposit_quote(new.reservation_id);
  r public.reservations%rowtype;
begin
  if new.status <> 'pending' then
    raise exception 'deposit_gate: a deposit opens as pending' using errcode = '42501';
  end if;
  if q ->> 'status' <> 'ok' then
    raise exception 'deposit_gate: no deposit is due on this reservation (%)', q ->> 'status' using errcode = '42501';
  end if;
  select * into r from public.reservations where id = new.reservation_id;
  if r.status not in ('PENDING', 'CONFIRMED') or r.reserved_for <= now() then
    raise exception 'deposit_gate: this reservation cannot take a deposit now' using errcode = '42501';
  end if;
  if new.guest_id <> r.guest_id
     or new.amount_minor <> (q ->> 'amount_minor')::bigint
     or new.payee_user_id <> (q ->> 'payee_user_id')::uuid
     or new.payee_subaccount_code <> q ->> 'payee_subaccount_code'
     or new.commission_minor <> (q ->> 'commission_minor')::bigint
     or new.lister_share_minor <> (q ->> 'lister_share_minor')::bigint
     or new.refund_until <> (q ->> 'refund_until')::timestamptz then
    raise exception 'deposit_gate: the deposit must be exactly what the restaurant''s rule asks' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger reservation_deposits_00_gate
  before insert on public.reservation_deposits
  for each row execute function private.reservation_deposits_gate();

alter table public.reservation_deposits enable row level security;
create policy reservation_deposits_guest_read on public.reservation_deposits
  for select to authenticated using (guest_id = (select auth.uid()));
create policy reservation_deposits_venue_read on public.reservation_deposits
  for select to authenticated using (payee_user_id = (select auth.uid()));
revoke all on public.reservation_deposits from anon, authenticated;
grant select (id, reservation_id, amount_minor, currency, commission_minor, lister_share_minor, refund_until,
              status, paid_at, decided_at, outcome_reason, created_at)
  on public.reservation_deposits to authenticated;

-- 4. Open (service role): the server writes the row, then opens Paystack. ------
create or replace function public.reservation_deposit_open(p_reservation uuid, p_guest uuid, p_mode text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  q jsonb;
  live public.reservation_deposits%rowtype;
  d public.reservation_deposits%rowtype;
begin
  q := private.reservation_deposit_quote(p_reservation);
  if q ->> 'status' <> 'ok' then
    return jsonb_build_object('status', q ->> 'status');
  end if;
  if (q ->> 'guest_id')::uuid <> p_guest then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into live from public.reservation_deposits
   where reservation_id = p_reservation and status in ('pending', 'paid', 'applied', 'forfeited');
  if live.id is not null then
    -- One deposit per reservation: a second press resumes the first checkout.
    return jsonb_build_object('status', case when live.status = 'pending' then 'pending' else 'already_' || live.status end,
                              'reference', live.provider_ref, 'amount_minor', live.amount_minor,
                              'authorization_url', live.authorization_url, 'access_code', live.access_code);
  end if;
  insert into public.reservation_deposits (reservation_id, rule_id, guest_id, payee_user_id, provider_ref, amount_minor,
                                           payee_subaccount_code, lister_share_minor, commission_minor, commission_bps,
                                           refund_until, paystack_mode)
  values (p_reservation, (q ->> 'rule_id')::uuid, p_guest, (q ->> 'payee_user_id')::uuid,
          'rm-dep-' || gen_random_uuid()::text, (q ->> 'amount_minor')::bigint, q ->> 'payee_subaccount_code',
          (q ->> 'lister_share_minor')::bigint, (q ->> 'commission_minor')::bigint, (q ->> 'commission_bps')::integer,
          (q ->> 'refund_until')::timestamptz, p_mode)
  returning * into d;
  return jsonb_build_object('status', 'ok', 'reference', d.provider_ref, 'amount_minor', d.amount_minor,
                            'payee_subaccount_code', d.payee_subaccount_code,
                            'lister_share_minor', d.lister_share_minor, 'commission_minor', d.commission_minor);
end $$;
revoke all on function public.reservation_deposit_open(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reservation_deposit_open(uuid, uuid, text) to service_role;

-- 5. Settle (service role): the Paystack webhook and the payer's return. --------
create or replace function public.reservation_deposit_settle(p_reference text, p_amount_minor bigint, p_currency text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  d public.reservation_deposits%rowtype;
  r public.reservations%rowtype;
  reason text;
  venue text;
begin
  select * into d from public.reservation_deposits where provider_ref = p_reference for update;
  if d.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if d.status not in ('pending', 'abandoned', 'failed') then
    return jsonb_build_object('outcome', 'duplicate', 'status', d.status);
  end if;
  select * into r from public.reservations where id = d.reservation_id for update;
  reason := case
    when p_currency is distinct from d.currency or p_amount_minor is distinct from d.amount_minor then 'amount_mismatch'
    when r.status not in ('PENDING', 'CONFIRMED') then 'reservation_' || lower(r.status::text)
    when r.reserved_for <= now() then 'time_passed'
    when exists (select 1 from public.reservation_deposits o
                  where o.reservation_id = d.reservation_id and o.id <> d.id
                    and o.status in ('pending', 'paid', 'applied', 'forfeited')) then 'superseded'
    else null
  end;
  if reason is not null then
    update public.reservation_deposits
       set status = 'refund_due', decided_at = now(), outcome_reason = reason
     where id = d.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A table deposit could not be applied and goes back to the card',
            format('Reference %s took %s kobo for reservation %s and could not be applied (%s).',
                   p_reference, p_amount_minor, d.reservation_id, reason),
            'reservation', d.reservation_id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'reservation.deposit_refund_due', 'reservation', d.reservation_id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', p_amount_minor, 'reason', reason));
    return jsonb_build_object('outcome', 'refund-due', 'reason', reason, 'reference', p_reference,
                              'amount_minor', p_amount_minor);
  end if;

  update public.reservation_deposits set status = 'paid', paid_at = now() where id = d.id;
  if d.commission_minor > 0 then
    perform private.ledger_append(
      'vallo_revenue', 'reservation_deposit:' || d.id::text, 'FEE_CHARGED', 'in', d.commission_minor, d.currency,
      'paystack', p_reference, null, 'direct', 'confirmed',
      jsonb_build_object('kind', 'reservation_deposit', 'deposit_id', d.id, 'reservation_id', d.reservation_id,
                         'commission_bps', d.commission_bps, 'gross_minor', d.amount_minor),
      null, d.guest_id);
  end if;
  select b.name into venue from public.businesses b where b.id = r.business_id;
  begin
    perform private.notify(d.guest_id, 'booking'::public.notification_kind, 'Deposit paid',
      coalesce(venue, 'The restaurant') || ' has your deposit. It comes off your bill on the night.', '/bookings');
    perform private.notify(d.payee_user_id, 'booking'::public.notification_kind, 'Deposit received',
      'A guest paid the deposit for their table. It is deducted from their bill.', '/host/reservations');
  exception when others then
    null;
  end;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'reservation.deposit_paid', 'reservation', d.reservation_id::text,
          jsonb_build_object('reference', p_reference, 'amount_minor', d.amount_minor,
                             'commission_minor', d.commission_minor));
  return jsonb_build_object('outcome', 'settled', 'reservation_id', d.reservation_id, 'amount_minor', d.amount_minor);
end $$;
revoke all on function public.reservation_deposit_settle(text, bigint, text) from public, anon, authenticated;
grant execute on function public.reservation_deposit_settle(text, bigint, text) to service_role;

-- A charge Paystack reports failed, or a checkout the payer abandoned: only from pending.
create or replace function public.reservation_deposit_close(p_reference text, p_status text)
returns text language plpgsql security definer set search_path to '' as $$
begin
  if p_status not in ('failed', 'abandoned') then
    return 'bad_request';
  end if;
  update public.reservation_deposits set status = p_status, decided_at = now()
   where provider_ref = p_reference and status = 'pending';
  return case when found then 'changed' else 'unchanged' end;
end $$;
revoke all on function public.reservation_deposit_close(text, text) from public, anon, authenticated;
grant execute on function public.reservation_deposit_close(text, text) to service_role;

-- Paystack took the refund (lib/payments/refund.ts holds the one-refund claim).
create or replace function public.reservation_deposit_refunded(p_reference text, p_processor_refund_id text)
returns text language plpgsql security definer set search_path to '' as $$
begin
  update public.reservation_deposits
     set status = 'refunded', processor_refund_id = p_processor_refund_id, decided_at = coalesce(decided_at, now())
   where provider_ref = p_reference and status = 'refund_due';
  return case when found then 'changed' else 'unchanged' end;
end $$;
revoke all on function public.reservation_deposit_refunded(text, text) from public, anon, authenticated;
grant execute on function public.reservation_deposit_refunded(text, text) to service_role;

-- 6. The reservation's side. -------------------------------------------------------
-- A venue cannot confirm a table whose deposit is due and unpaid (switch on only).
create or replace function private.reservation_deposit_before_confirm()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if old.status = 'PENDING' and new.status = 'CONFIRMED'
     and private.reservation_deposit_quote(new.id) ->> 'status' = 'ok'
     and not exists (select 1 from public.reservation_deposits d
                      where d.reservation_id = new.id and d.status = 'paid') then
    raise exception 'reservation_deposit_unpaid: the deposit for this table is not paid yet' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.reservation_deposit_before_confirm() from public, anon, authenticated;
create trigger reservations_01_deposit_before_confirm
  before update of status on public.reservations
  for each row execute function private.reservation_deposit_before_confirm();

-- The restaurant's cancellation rule, applied when the reservation ends.
--   cancelled by the guest at least refund_until_hours before -> refund_due
--   cancelled by the guest later                               -> forfeited
--   cancelled by the venue, the console or a sweep             -> refund_due
--   NO_SHOW                                                    -> forfeited
--   COMPLETED                                                  -> applied (deducted from the bill)
-- An unpaid deposit on a reservation that ends is abandoned.
create or replace function private.reservation_deposit_outcome()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  d public.reservation_deposits%rowtype;
  next_status text;
  why text;
begin
  if new.status is not distinct from old.status or new.status not in ('CANCELLED', 'NO_SHOW', 'COMPLETED') then
    return new;
  end if;
  update public.reservation_deposits set status = 'abandoned', decided_at = now(), outcome_reason = 'reservation_ended'
   where reservation_id = new.id and status = 'pending';
  select * into d from public.reservation_deposits where reservation_id = new.id and status = 'paid' for update;
  if d.id is null then
    return new;
  end if;
  if new.status = 'COMPLETED' then
    next_status := 'applied'; why := 'deducted_from_bill';
  elsif new.status = 'NO_SHOW' then
    next_status := 'forfeited'; why := 'no_show';
  elsif (select auth.uid()) = new.guest_id then
    if now() <= d.refund_until then
      next_status := 'refund_due'; why := 'guest_cancelled_in_time';
    else
      next_status := 'forfeited'; why := 'guest_cancelled_late';
    end if;
  else
    next_status := 'refund_due'; why := 'venue_cancelled';
  end if;
  update public.reservation_deposits set status = next_status, decided_at = now(), outcome_reason = why where id = d.id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'reservation.deposit_' || next_status, 'reservation', new.id::text,
          jsonb_build_object('reference', d.provider_ref, 'amount_minor', d.amount_minor, 'reason', why));
  return new;
end $$;
revoke all on function private.reservation_deposit_outcome() from public, anon, authenticated;
create trigger reservations_zz_deposit_outcome
  after update of status on public.reservations
  for each row execute function private.reservation_deposit_outcome();
