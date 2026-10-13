-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- ============================================================ 3. who answers
create or replace function private.reservation_is_mine_to_host(p_reservation uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.reservations r
     where r.id = p_reservation
       and r.guest_id is distinct from auth.uid()
       and ((r.business_id is not null and private.owns_business(r.business_id))
            or (r.listing_id is not null and exists (
                  select 1 from public.listings l
                   where l.id = r.listing_id and private.listing_agent_is_me(l.agent_id)))));
$$;
revoke all on function private.reservation_is_mine_to_host(uuid) from public, anon;
grant execute on function private.reservation_is_mine_to_host(uuid) to authenticated;

-- Record an outcome on the reservation and its seating, in one place.
create or replace function private.settle_seating(p_reservation uuid, p_outcome text, p_by text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
begin
  select * into r from public.reservations where id = p_reservation for update;
  insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
  values (r.id, r.business_id, private.new_check_in_code())
  on conflict (reservation_id) do nothing;
  if p_by = 'diner' then
    perform set_config('vallo.seating_by', 'diner', true);
  end if;
  update public.reservations
     set status = case when p_outcome = 'SEATED' then 'COMPLETED' else 'NO_SHOW' end::public.booking_status,
         updated_at = now()
   where id = p_reservation
     and status is distinct from (case when p_outcome = 'SEATED' then 'COMPLETED' else 'NO_SHOW' end)::public.booking_status;
  update public.reservation_seatings
     set outcome = p_outcome,
         outcome_by = p_by,
         outcome_at = now(),
         seated_guests = case when p_outcome = 'SEATED' then r.party_size else null end
   where reservation_id = p_reservation;
  perform set_config('vallo.seating_by', '', true);
end $$;
revoke all on function private.settle_seating(uuid, text, text) from public, anon, authenticated;

-- ============================================================ 4. the restaurant
-- The guest shows the code; the restaurant types it. Matched among this
-- host's confirmed tables from three hours before to a day after the time.
create or replace function public.reservation_seat_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  hits uuid[];
  r public.reservations%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then
    return jsonb_build_object('status', 'bad_code');
  end if;
  select array_agg(r2.id) into hits
    from public.reservation_seatings s
    join public.reservations r2 on r2.id = s.reservation_id
   where s.check_in_code = p_code
     and r2.status = 'CONFIRMED'
     and r2.reserved_for between now() - interval '24 hours' and now() + interval '3 hours'
     and private.reservation_is_mine_to_host(r2.id);
  if hits is null or cardinality(hits) = 0 then
    return jsonb_build_object('status', 'no_match');
  end if;
  if cardinality(hits) > 1 then
    return jsonb_build_object('status', 'ambiguous');
  end if;
  perform private.settle_seating(hits[1], 'SEATED', 'code');
  update public.reservation_seatings
     set restaurant_answer = 'SEATED', restaurant_answered_at = now()
   where reservation_id = hits[1];
  select * into r from public.reservations where id = hits[1];
  return jsonb_build_object('status', 'seated', 'reservation_id', r.id, 'party_size', r.party_size);
end $$;
revoke all on function public.reservation_seat_by_code(text) from public, anon;
grant execute on function public.reservation_seat_by_code(text) to authenticated;

-- Seated or No-show, tapped by the restaurant. Seated from three hours
-- before the time; No-show only once the time has passed. A restaurant that
-- disagrees with what the diner already said opens a dispute for Vallo.
create or replace function public.reservation_record_outcome(p_reservation uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
begin
  if p_outcome not in ('SEATED', 'NO_SHOW') then
    return jsonb_build_object('status', 'bad_outcome');
  end if;
  if not private.reservation_is_mine_to_host(p_reservation) then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into r from public.reservations where id = p_reservation for update;
  select * into s from public.reservation_seatings where reservation_id = p_reservation for update;
  if p_outcome = 'NO_SHOW' and r.reserved_for > now() then
    return jsonb_build_object('status', 'too_early');
  end if;
  if p_outcome = 'SEATED' and r.reserved_for > now() + interval '3 hours' then
    return jsonb_build_object('status', 'too_early');
  end if;
  if s.outcome_by in ('diner', 'bill', 'admin') then
    if s.outcome is distinct from p_outcome and s.outcome_by = 'diner' then
      update public.reservation_seatings
         set restaurant_answer = p_outcome, restaurant_answered_at = now(), disputed_at = coalesce(disputed_at, now())
       where reservation_id = p_reservation;
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'reservation.seating_disputed', 'reservation', p_reservation::text,
              jsonb_build_object('restaurant', p_outcome, 'diner', s.diner_answer));
      return jsonb_build_object('status', 'disputed');
    end if;
    return jsonb_build_object('status', 'already', 'outcome', s.outcome);
  end if;
  if r.status not in ('CONFIRMED', 'COMPLETED', 'NO_SHOW') then
    return jsonb_build_object('status', 'not_open');
  end if;
  perform private.settle_seating(p_reservation, p_outcome, 'restaurant');
  update public.reservation_seatings
     set restaurant_answer = p_outcome, restaurant_answered_at = now()
   where reservation_id = p_reservation;
  return jsonb_build_object('status', 'recorded', 'outcome', p_outcome);
end $$;
revoke all on function public.reservation_record_outcome(uuid, text) from public, anon;
grant execute on function public.reservation_record_outcome(uuid, text) to authenticated;
