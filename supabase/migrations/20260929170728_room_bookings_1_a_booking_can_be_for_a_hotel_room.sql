-- ROOM BOOKINGS 1: A BOOKING CAN BE FOR A HOTEL ROOM, AND IT IS PAID THE WAY
-- EVERY STAY IS (29 September 2026, the founder's word on M6).
--
-- One bookings table, one money path: a booking targets a listing (unchanged)
-- or a room (accommodation_id + room_type_id + rate_plan_id, and rooms).
-- The room path is the stay path: requested (PENDING, priced here from the
-- host's rate plan and calendar, nights held by trigger), accepted by the host
-- (the stay agreement is drawn up with the business owner), agreed and
-- approved, paid by card with Paystack splitting to the HOST's subaccount,
-- settled, and shown in the host's earnings. Cancelling, declining, a lapsed
-- hold or a no-show release the nights by trigger.
--
-- OFF until switched on: feature_flags 'room_bookings' starts OFF and the
-- pricing trigger refuses a room booking while it is off, whoever writes it.
-- Not taken from the 18 September draft (pending/m06_bookings_extension.sql):
-- trigger-written booking_state_events (the app and sweeps write them) and a
-- new transition guard. Proven by supabase/tests/probes/room-bookings.sql.

insert into public.feature_flags (key, enabled, note) values ('room_bookings', false, 'Hotel rooms can be requested and paid for on Vallo. Off until the founder switches it on.') on conflict (key) do nothing;
alter table public.bookings
  add column if not exists accommodation_id uuid references public.accommodations (id) on delete restrict,
  add column if not exists room_type_id     uuid references public.room_types (id) on delete restrict,
  add column if not exists rate_plan_id     uuid references public.rate_plans (id) on delete restrict,
  add column if not exists rooms            smallint not null default 1;
alter table public.bookings drop constraint if exists bookings_rooms_chk;
alter table public.bookings add constraint bookings_rooms_chk check (rooms between 1 and 10);
create index if not exists bookings_accommodation_idx on public.bookings (accommodation_id) where accommodation_id is not null;
create index if not exists bookings_room_type_dates_idx on public.bookings (room_type_id, check_in, check_out) where room_type_id is not null and status in ('PENDING', 'CONFIRMED');
create index if not exists bookings_rate_plan_idx on public.bookings (rate_plan_id) where rate_plan_id is not null;
alter table public.bookings alter column listing_id drop not null;
alter table public.bookings drop constraint if exists bookings_one_spine_chk;
alter table public.bookings add constraint bookings_one_spine_chk check (
  (listing_id is not null and accommodation_id is null and room_type_id is null and rate_plan_id is null and rooms = 1)
  or (listing_id is null and accommodation_id is not null and room_type_id is not null and rate_plan_id is not null));
alter table public.bookings drop constraint if exists bookings_subtotal_chk;
alter table public.bookings add constraint bookings_subtotal_chk check (listing_id is null or subtotal_minor = price_per_night_minor * nights);
grant insert (accommodation_id, room_type_id, rate_plan_id, rooms) on public.bookings to authenticated;
alter table public.deal_agreements add column if not exists accommodation_id uuid references public.accommodations (id) on delete restrict;
create index if not exists deal_agreements_accommodation_idx on public.deal_agreements (accommodation_id) where accommodation_id is not null;
alter table public.deal_agreements alter column listing_id drop not null;
alter table public.deal_agreements drop constraint if exists deal_agreements_one_subject_chk;
alter table public.deal_agreements add constraint deal_agreements_one_subject_chk check (
  (listing_id is not null and accommodation_id is null) or (listing_id is null and accommodation_id is not null and kind = 'stay'));
create or replace function private.price_room_booking(b public.bookings, api_caller boolean)
returns public.bookings language plpgsql security definer set search_path to '' as $function$
declare
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
  n integer; rt public.room_types%rowtype; rp public.rate_plans%rowtype; ac public.accommodations%rowtype;
  biz public.businesses%rowtype; closed_nights integer; subtotal bigint;
begin
  if not coalesce((select f.enabled from public.feature_flags f where f.key = 'room_bookings'), false) then
    raise exception 'room_bookings_off: hotel rooms cannot be booked on Vallo yet' using errcode = '23514';
  end if;
  select * into rt from public.room_types where id = b.room_type_id;
  select * into rp from public.rate_plans where id = b.rate_plan_id;
  select * into ac from public.accommodations where id = b.accommodation_id;
  select * into biz from public.businesses where id = ac.business_id;
  if rt.id is null or rp.id is null or ac.id is null or biz.id is null or rt.accommodation_id <> ac.id or rp.room_type_id <> rt.id then
    raise exception 'room_booking_mismatch: that room and rate are not sold at this place' using errcode = '23514';
  end if;
  if rt.status <> 'PUBLISHED' or ac.status <> 'PUBLISHED' or biz.status <> 'PUBLISHED'
     or coalesce(rt.is_demo, false) or coalesce(ac.is_demo, false) or not rp.active then
    raise exception 'room_not_bookable: this room is not taking bookings' using errcode = '23514';
  end if;
  if rp.currency <> 'NGN' then raise exception 'room_not_bookable: this rate is not in naira' using errcode = '23514'; end if;
  if biz.owner_id = b.guest_id then raise exception 'room_own_venue: you cannot book a room at your own place' using errcode = '23514'; end if;
  if b.check_in < lagos_today then raise exception 'booking_check_in_past: check-in has already passed' using errcode = '23514'; end if;
  n := b.check_out - b.check_in;
  if n is null or n < 1 then raise exception 'booking_dates_reversed: check-out has to be after check-in' using errcode = '22000'; end if;
  if n > 90 then raise exception 'booking_too_long: a stay is at most 90 nights' using errcode = '23514'; end if;
  if b.rooms < 1 or b.rooms > rt.units_total then
    raise exception 'room_count: this place has % room(s) of this type', rt.units_total using errcode = '23514';
  end if;
  if api_caller and b.status = 'PENDING' then
    if (select count(*) from public.bookings x where x.guest_id = b.guest_id and x.status = 'PENDING'
           and not exists (select 1 from public.rent_payments r where r.booking_id = x.id)) >= 3
       or exists (select 1 from public.bookings x where x.guest_id = b.guest_id and x.accommodation_id = b.accommodation_id and x.status = 'PENDING') then
      raise exception 'booking_hold_limit: too many unconfirmed stays are already held' using errcode = '23514';
    end if;
    if (select count(*) from public.bookings x where x.guest_id = b.guest_id and x.created_at > now() - interval '1 day') >= 10 then
      raise exception 'booking_rate_limit: too many bookings in a short time' using errcode = '23514';
    end if;
  end if;
  select count(*) into closed_nights from public.rate_calendar rc
   where rc.rate_plan_id = rp.id and rc.date >= b.check_in and rc.date < b.check_out and rc.closed;
  if closed_nights > 0 then raise exception 'booking_dates_blocked: the host has closed some of these nights' using errcode = '23P01'; end if;
  select sum(coalesce(rc.rate_minor, rp.rate_minor)) into subtotal
    from generate_series(b.check_in, b.check_out - 1, interval '1 day') as d(day)
    left join public.rate_calendar rc on rc.rate_plan_id = rp.id and rc.date = d.day::date;
  subtotal := subtotal * b.rooms;
  if subtotal is null or subtotal <= 0 then raise exception 'room_not_bookable: this rate has no price' using errcode = '23514'; end if;
  b.nights := n; b.price_per_night_minor := subtotal / n; b.cleaning_fee_minor := 0; b.service_fee_minor := 0;
  b.subtotal_minor := subtotal; b.total_minor := subtotal; b.currency := 'NGN';
  return b;
end;
$function$;
revoke all on function private.price_room_booking(public.bookings, boolean) from public, anon, authenticated;
do $$
declare
  def text := pg_get_functiondef('private.price_booking_from_listing()'::regprocedure);
  a1 text := 'if (new.listing_id, new.guest_id,';
  a2 text := '(old.listing_id, old.guest_id,';
  a3 text := '  select l.id, l.status, l.is_demo, l.rate_minor, l.rate_period';
begin
  if position(a1 in def) = 0 or position(a2 in def) = 0 or position(a3 in def) = 0 then raise exception 'price_booking_from_listing: anchor not found'; end if;
  def := replace(def, a1, 'if (new.listing_id, new.accommodation_id, new.room_type_id, new.rate_plan_id, new.rooms, new.guest_id,');
  def := replace(def, a2, '(old.listing_id, old.accommodation_id, old.room_type_id, old.rate_plan_id, old.rooms, old.guest_id,');
  def := replace(def, a3, E'  -- ROOM BOOKINGS 1: a hotel room is priced from its own rate plan.\n' || E'  if new.listing_id is null and new.room_type_id is not null then\n' || E'    return private.price_room_booking(new, api_caller);\n' || E'  end if;\n\n' || a3);
  execute def;
end $$;
create or replace function private.bookings_hold_and_release_rooms() returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.room_type_id is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.status in ('PENDING', 'CONFIRMED') then
      perform private.reserve_room_nights(new.room_type_id, new.check_in, new.check_out, new.rooms, new.rate_plan_id);
    end if;
  elsif old.status in ('PENDING', 'CONFIRMED') and new.status in ('CANCELLED', 'NO_SHOW') then
    perform private.release_room_nights(new.room_type_id, new.check_in, new.check_out, new.rooms);
  end if;
  return new;
end;
$function$;
revoke all on function private.bookings_hold_and_release_rooms() from public, anon, authenticated;
drop trigger if exists bookings_hold_and_release_rooms on public.bookings;
create trigger bookings_hold_and_release_rooms after insert or update of status on public.bookings for each row execute function private.bookings_hold_and_release_rooms();
drop trigger if exists bookings_never_against_a_demo_listing on public.bookings;
create trigger bookings_never_against_a_demo_listing before insert or update of listing_id, accommodation_id on public.bookings for each row execute function public.refuse_transaction_on_demo_listing();
create or replace function private.booking_host(p_booking uuid) returns uuid language sql stable security definer set search_path to '' as $function$
  select coalesce(
    (select a.user_id from public.bookings b join public.listings l on l.id = b.listing_id join public.agents a on a.id = l.agent_id where b.id = p_booking),
    (select bu.owner_id from public.bookings b join public.accommodations ac on ac.id = b.accommodation_id join public.businesses bu on bu.id = ac.business_id where b.id = p_booking));
$function$;
revoke all on function private.booking_host(uuid) from public, anon, authenticated;
create or replace function private.is_booking_host(target_booking_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select auth.uid() is not null and private.booking_host(target_booking_id) = auth.uid();
$function$;
drop policy if exists bookings_business_host_select on public.bookings;
create policy bookings_business_host_select on public.bookings for select to authenticated using (accommodation_id is not null and private.owns_accommodation(accommodation_id));
do $$
declare
  def text := pg_get_functiondef('private.notify_booking_change()'::regprocedure);
  a1 text := E'  where l.id = new.listing_id;\n  guest_href :=';
begin
  if position(a1 in def) = 0 or position('''/agent/bookings''' in def) = 0 then raise exception 'notify_booking_change: anchor not found'; end if;
  def := replace(def, a1, E'  where l.id = new.listing_id;\n' || E'  -- ROOM BOOKINGS 1: a hotel room''s host is the business owner.\n' || E'  if new.listing_id is null then\n'
    || E'    select bu.owner_id, ac.name || coalesce('', '' || rt.name, '''') into host_user, listing_title\n' || E'      from public.accommodations ac\n'
    || E'      join public.businesses bu on bu.id = ac.business_id\n' || E'      left join public.room_types rt on rt.id = new.room_type_id\n'
    || E'     where ac.id = new.accommodation_id;\n' || E'    night_rate := ''night'';\n' || E'  end if;\n' || E'  guest_href :=');
  def := replace(def, '''/agent/bookings''', 'case when new.listing_id is null then ''/host/bookings'' else ''/agent/bookings'' end');
  execute def;
end $$;
do $$
declare
  def text := pg_get_functiondef('private.agreement_open_for_stay()'::regprocedure);
  a1 text := E'  select * into lst from public.listings where id = new.listing_id;\n  select a.user_id into host from public.agents a where a.id = lst.agent_id;';
  a2 text := E'  insert into public.deal_agreements (kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms)\n  values (''stay'', lst.id, new.id,';
  a3 text := '''inspection_fee_minor'', 0))';
begin
  if position(a1 in def) = 0 or position(a2 in def) = 0 or position(a3 in def) = 0 then raise exception 'agreement_open_for_stay: anchor not found'; end if;
  def := replace(def, a1, a1 || E'\n  -- ROOM BOOKINGS 1: a hotel room''s agreement is with the business owner.\n' || E'  if new.listing_id is null then\n' || E'    host := private.booking_host(new.id);\n' || E'  end if;');
  def := replace(def, a2, E'  insert into public.deal_agreements (kind, listing_id, accommodation_id, booking_id, renter_id, owner_id, amount_minor, terms)\n  values (''stay'', lst.id, new.accommodation_id, new.id,');
  def := replace(def, a3, '''inspection_fee_minor'', 0, ''room_type_id'', new.room_type_id, ''rate_plan_id'', new.rate_plan_id, ''rooms'', new.rooms))');
  execute def;
end $$;
do $$
declare
  def text := pg_get_functiondef('private.complete_ended_stays(integer)'::regprocedure);
  a1 text := 'where l.id = b.listing_id;';
begin
  if position(a1 in def) = 0 then raise exception 'complete_ended_stays: anchor not found'; end if;
  def := replace(def, a1, a1 || E'\n    if b.listing_id is null then\n' || E'      host_user := private.booking_host(b.id);\n'
    || E'      select ac.name into stay_title from public.bookings x join public.accommodations ac on ac.id = x.accommodation_id where x.id = b.id;\n' || E'    end if;');
  execute def;
end $$;
do $$
declare
  def text := pg_get_functiondef('private.settle_booking_charge(text,bigint,bigint,uuid)'::regprocedure);
  a1 text := E'    insert into public.availability (listing_id, date, status)\n    select bk.listing_id, d::date, ''booked''\n      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval ''1 day'') as d\n    on conflict (listing_id, date) do update set status = ''booked'';';
begin
  if position(a1 in def) = 0 then raise exception 'settle_booking_charge: anchor not found'; end if;
  def := replace(def, a1, E'    if bk.listing_id is not null then\n' || a1 || E'\n    end if;');
  execute def;
end $$;
do $$
declare
  def text := pg_get_functiondef('private.freeze_arrival_charges_on_payment()'::regprocedure);
  a1 text := 'join public.bookings b on b.listing_id = d.listing_id';
begin
  if position(a1 in def) = 0 then raise exception 'freeze_arrival_charges_on_payment: anchor not found'; end if;
  def := replace(def, a1, 'join public.bookings b on (b.listing_id = d.listing_id or b.accommodation_id = d.accommodation_id)');
  execute def;
end $$;
do $$
declare
  def text := pg_get_functiondef('private.agreement_tell_both(public.deal_agreements,text)'::regprocedure);
  a1 text := 'select l.title into listing_title from public.listings l where l.id = p_agreement.listing_id;';
begin
  if position(a1 in def) = 0 then raise exception 'agreement_tell_both: anchor not found'; end if;
  def := replace(def, a1, a1 || E'\n  if listing_title is null and p_agreement.accommodation_id is not null then\n'
    || E'    select ac.name into listing_title from public.accommodations ac where ac.id = p_agreement.accommodation_id;\n' || E'  end if;');
  execute def;
end $$;
alter table public.bank_accounts add column if not exists paystack_subaccount_code text, add column if not exists subaccount_created_at timestamptz;
create or replace function private.payee_subaccount(p_user uuid) returns text language sql stable security definer set search_path to '' as $function$
  select coalesce(
    (select pa.paystack_subaccount_code from public.payout_accounts pa join public.agents a on a.id = pa.agent_id
      where a.user_id = p_user and pa.paystack_subaccount_code is not null order by pa.is_default desc, pa.created_at desc limit 1),
    (select ba.paystack_subaccount_code from public.bank_accounts ba
      where ba.user_id = p_user and ba.deleted_at is null and ba.paystack_subaccount_code is not null order by ba.is_default desc, ba.created_at desc limit 1));
$function$;
do $$
declare
  f text; def text; hits integer;
begin
  foreach f in array array['public.my_earnings_history(integer,timestamp with time zone)','public.my_payments_history(integer,timestamp with time zone)','public.admin_money_history(integer,timestamp with time zone,timestamp with time zone,timestamp with time zone)'] loop
    def := pg_get_functiondef(f::regprocedure);
    hits := (length(def) - length(regexp_replace(def, 'left join public\.listings l on l\.id = (\w+)\.listing_id', '', 'g')));
    if hits = 0 then raise exception '%: listings join not found', f; end if;
    def := regexp_replace(def, 'left join public\.listings l on l\.id = (\w+)\.listing_id', 'left join public.listings l on l.id = \1.listing_id left join public.accommodations room_ac on room_ac.id = \1.accommodation_id', 'g');
    def := regexp_replace(def, '\ml\.title\M', 'coalesce(l.title, room_ac.name)', 'g');
    execute def;
  end loop;
end $$;
do $$
begin
  if coalesce((select enabled from public.feature_flags where key = 'room_bookings'), true) then raise exception 'room_bookings must start OFF'; end if;
  if not exists (select 1 from pg_trigger where tgname = 'bookings_hold_and_release_rooms') then raise exception 'the hold trigger is missing'; end if;
  if position('price_room_booking' in pg_get_functiondef('private.price_booking_from_listing()'::regprocedure)) = 0 then raise exception 'the pricing trigger does not price rooms'; end if;
  if has_function_privilege('authenticated', 'private.price_room_booking(public.bookings,boolean)', 'execute') then raise exception 'members can call price_room_booking'; end if;
end $$;
notify pgrst, 'reload schema';
