-- Applied 13 October 2026. PAY ON VALLO 6 of 8. Independent of pov01 to pov05.
-- Ruling 3: Vallo's commission on a hotel room is 10 percent (1,000 basis
-- points) of the charge, taken from the hotel's share, never added to the
-- guest's price, and only on a paid booking. "A hotel room" is a room type
-- sold by a business of kind hotel, guest_house, resort or
-- serviced_apartments. A shortlet operator's room and a nightly shortlet
-- listing carry no room fee. Every other commission stays where it is
-- (fee_rates and money_policy_versions are not touched).
--
-- 1. public.scoped_commission_rates: dated, append-only rates for a named
--    scope. One scope today, 'hotel_room'. No member grant; the service role
--    may read and add (every other right revoked first, its own included).
--    A rate is changed by adding a row with a later effective_from; a row is
--    never edited or removed (row and statement guards), and a new row may
--    not take effect before the moment it is written.
-- 2. private.scoped_commission_bps(scope, at): the rate in force at a moment.
-- 3. private.b3_commission_for_booking (live definition in
--    pending/rollback/rb06): a room booking at one of the four business kinds
--    takes the hotel-room rate in force when the BOOKING was made, ahead of
--    the rate written into the agreement's terms. So a room booked before
--    this is applied keeps its terms, and the rate cannot move under a
--    booking already made.
--
-- payment_split_for_booking is unchanged: it already takes the commission
-- from the lister's share (lister = total - guarantee - commission), refuses
-- a split whose parts exceed the total, and the transactions check
-- (transactions_split_adds_up) holds the three parts to the charge exactly.
-- The guest's price is the booking's total, which this never reads or moves.
--
-- Note for whoever applies it: the row guard names the removal event, so the
-- statement carries the word the MCP connector stalls on. Apply this file
-- from the SQL editor (docs/payments/RELEASE_RUNBOOK.md, step 6).
-- Probe: supabase/tests/probes-pending/pov06-hotel-room-commission.sql
set lock_timeout = '5s';

create table if not exists public.scoped_commission_rates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('hotel_room')),
  basis_points integer not null check (basis_points between 0 and 10000),
  effective_from timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) between 12 and 500),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (scope, effective_from)
);
alter table public.scoped_commission_rates enable row level security;
revoke all on table public.scoped_commission_rates from public, anon, authenticated, service_role;
grant select, insert on table public.scoped_commission_rates to service_role;

comment on table public.scoped_commission_rates is
  'Founder ruling 3 (13 Oct 2026): a commission for a named scope (hotel_room = 1000 bps, rooms at hotel, guest_house, resort and serviced_apartments businesses), dated and append-only, read by private.b3_commission_for_booking.';

create or replace function private.scoped_commission_rates_are_history()
 returns trigger
 language plpgsql
 set search_path to ''
as $fn$
begin
  if tg_op = 'INSERT' then
    -- A rate takes effect from the moment it is written, or later; never
    -- reaching back under a booking already made.
    if new.effective_from < now() then
      raise exception 'a scoped commission rate takes effect from now or later, never backdated'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;
  raise exception 'a scoped commission rate is history: add a row with a later effective_from'
    using errcode = 'insufficient_privilege';
end;
$fn$;

create or replace trigger scoped_commission_rates_00_history
  before insert or update or delete on public.scoped_commission_rates
  for each row execute function private.scoped_commission_rates_are_history();

create or replace trigger scoped_commission_rates_01_never_truncated
  before truncate on public.scoped_commission_rates
  for each statement execute function private.scoped_commission_rates_are_history();

insert into public.scoped_commission_rates (scope, basis_points, reason)
select 'hotel_room', 1000, 'Founder ruling 13 Oct 2026: 10 percent of a paid hotel room, from the hotel''s share.'
 where not exists (select 1 from public.scoped_commission_rates where scope = 'hotel_room');

create or replace function private.scoped_commission_bps(p_scope text, p_at timestamptz)
 returns integer
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select r.basis_points from public.scoped_commission_rates r
   where r.scope = p_scope and r.effective_from <= p_at
   order by r.effective_from desc
   limit 1;
$fn$;

create or replace function private.b3_commission_for_booking(p_booking uuid, p_amount_minor bigint, p_agreement uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  bk public.bookings%rowtype;
  ag public.deal_agreements%rowtype;
  v public.money_policy_versions%rowtype;
  acc record;
  fee bigint;
  bps integer;
  v_kind text;
begin
  select * into bk from public.bookings where id = p_booking;
  select * into ag from public.deal_agreements where id = p_agreement;
  if bk.id is null or ag.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if bk.listing_id is not null then
    select x.* into acc from (
      select a.id, a.accepted_at, a.commission_bps, a.cap_threshold_minor, a.cap_minor, 'rate' as record
        from public.listing_rate_acceptances a
       where a.listing_id = bk.listing_id and a.accepted_at <= ag.created_at
      union all
      select f.id, f.accepted_at, f.commission_bps, f.cap_threshold_minor, f.cap_minor, 'fee' as record
        from public.listing_fee_acceptances f
       where f.listing_id = bk.listing_id and f.accepted_at <= ag.created_at
    ) x order by x.accepted_at desc, x.id desc limit 1;
    if acc.id is not null then
      fee := (p_amount_minor * acc.commission_bps) / 10000;
      if acc.cap_threshold_minor is not null and p_amount_minor > acc.cap_threshold_minor then
        fee := least(fee, acc.cap_minor);
      end if;
      return jsonb_build_object('status', 'ok', 'commission_bps', acc.commission_bps, 'source', 'acceptance',
                                'commission_minor', fee, 'acceptance_id', acc.id, 'acceptance_record', acc.record);
    end if;
    if coalesce((select f.enabled from public.feature_flags f where f.key = 'lister_fee_gate_blocking'), false) then
      return jsonb_build_object('status', 'rate_not_accepted');
    end if;
    v := public.money_policy_at(ag.created_at);
    if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
    return jsonb_build_object('status', 'ok', 'commission_bps', v.commission_bps, 'source', 'policy_no_acceptance',
                              'commission_minor', (p_amount_minor * v.commission_bps) / 10000,
                              'acceptance_id', null, 'policy_version_id', v.id);
  end if;
  -- Ruling 3 (13 October 2026): a room at a hotel, guest house, resort or
  -- serviced apartments business carries the hotel-room rate in force when
  -- the booking was made, from the hotel's share. A shortlet operator's room
  -- does not.
  if bk.room_type_id is not null and bk.accommodation_id is not null then
    select bz.kind::text into v_kind
      from public.accommodations ac join public.businesses bz on bz.id = ac.business_id
     where ac.id = bk.accommodation_id;
    if v_kind in ('hotel', 'guest_house', 'resort', 'serviced_apartments') then
      bps := private.scoped_commission_bps('hotel_room', bk.created_at);
      if bps is not null then
        return jsonb_build_object('status', 'ok', 'commission_bps', bps, 'source', 'scope:hotel_room',
                                  'commission_minor', (p_amount_minor * bps) / 10000, 'acceptance_id', null);
      end if;
    end if;
  end if;
  if ag.terms ? 'commission_bps' and jsonb_typeof(ag.terms->'commission_bps') = 'number' then
    bps := (ag.terms->>'commission_bps')::integer;
    if bps < 0 or bps > 10000 then return jsonb_build_object('status', 'amount_mismatch'); end if;
    return jsonb_build_object('status', 'ok', 'commission_bps', bps, 'source', 'terms',
                              'commission_minor', (p_amount_minor * bps) / 10000, 'acceptance_id', null);
  end if;
  v := public.money_policy_at(ag.created_at);
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  return jsonb_build_object('status', 'ok', 'commission_bps', v.commission_bps, 'source', 'policy',
                            'commission_minor', (p_amount_minor * v.commission_bps) / 10000,
                            'acceptance_id', null, 'policy_version_id', v.id);
end;
$fn$;

revoke all on function private.scoped_commission_bps(text, timestamptz) from public, anon, authenticated;
revoke all on function private.scoped_commission_rates_are_history() from public, anon, authenticated;
revoke all on function private.b3_commission_for_booking(uuid, bigint, uuid) from public, anon, authenticated;
