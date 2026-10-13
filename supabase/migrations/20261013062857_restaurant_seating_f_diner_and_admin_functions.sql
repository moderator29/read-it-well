-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- ============================================================ 5. the diner
-- "Did you dine at X?" The diner answers once the restaurant has had a day.
-- A yes with no answer from the restaurant counts as seated. A diner who
-- disagrees with the restaurant opens a dispute for Vallo.
create or replace function public.reservation_diner_answer(p_reservation uuid, p_dined boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
  said text := case when p_dined then 'dined' else 'did_not_dine' end;
  wanted text := case when p_dined then 'SEATED' else 'NO_SHOW' end;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r.id is null or r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into s from public.reservation_seatings where reservation_id = p_reservation for update;
  if s.reservation_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if s.diner_answer is not null then
    return jsonb_build_object('status', 'already', 'answer', s.diner_answer);
  end if;
  if s.restaurant_answer is null and s.diner_asked_at is null and r.reserved_for > now() - interval '24 hours' then
    return jsonb_build_object('status', 'too_early');
  end if;
  update public.reservation_seatings
     set diner_answer = said, diner_answered_at = now()
   where reservation_id = p_reservation;
  if s.restaurant_answer is not null then
    if s.restaurant_answer is distinct from wanted then
      update public.reservation_seatings set disputed_at = coalesce(disputed_at, now())
       where reservation_id = p_reservation;
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'reservation.seating_disputed', 'reservation', p_reservation::text,
              jsonb_build_object('restaurant', s.restaurant_answer, 'diner', said));
      return jsonb_build_object('status', 'disputed');
    end if;
    return jsonb_build_object('status', 'agreed');
  end if;
  if r.status <> 'CONFIRMED' then
    return jsonb_build_object('status', 'not_open');
  end if;
  perform private.settle_seating(p_reservation, wanted, 'diner');
  return jsonb_build_object('status', 'recorded', 'outcome', wanted);
end $$;
revoke all on function public.reservation_diner_answer(uuid, boolean) from public, anon;
grant execute on function public.reservation_diner_answer(uuid, boolean) to authenticated;

-- Hourly: a confirmed table a day past its time that the restaurant never
-- marked asks the diner. Once per table, and only for the last 30 days.
create or replace function private.ask_diners_about_unmarked_tables()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  row record;
  asked integer := 0;
begin
  for row in
    select r.id, r.guest_id, r.reserved_for, coalesce(b.name, l.title, 'the restaurant') as venue
      from public.reservations r
      join public.reservation_seatings s on s.reservation_id = r.id
      left join public.businesses b on b.id = r.business_id
      left join public.listings l on l.id = r.listing_id
     where r.status = 'CONFIRMED'
       and r.reserved_for <= now() - interval '24 hours'
       and r.reserved_for > now() - interval '30 days'
       and s.outcome is null
       and s.diner_asked_at is null
     limit 500
  loop
    update public.reservation_seatings set diner_asked_at = now() where reservation_id = row.id;
    begin
      perform private.notify(row.guest_id, 'booking'::public.notification_kind,
        'Did you dine at ' || row.venue || '?',
        'Tell us whether you had your table on '
          || to_char(row.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon') || '. It takes one tap.',
        '/bookings?side=stays');
    exception when others then
      null;
    end;
    asked := asked + 1;
  end loop;
  return asked;
end $$;
revoke all on function private.ask_diners_about_unmarked_tables() from public, anon, authenticated;

-- Vallo decides a dispute. Staff only.
create or replace function public.reservation_resolve_seating(p_reservation uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not (private.has_role(auth.uid(), 'admin'::public.app_role)
          or private.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'not_staff');
  end if;
  if p_outcome not in ('SEATED', 'NO_SHOW') then
    return jsonb_build_object('status', 'bad_outcome');
  end if;
  perform private.settle_seating(p_reservation, p_outcome, 'admin');
  update public.reservation_seatings
     set dispute_resolved_at = now(), dispute_resolved_by = auth.uid()
   where reservation_id = p_reservation;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'reservation.seating_resolved', 'reservation', p_reservation::text,
          jsonb_build_object('outcome', p_outcome));
  return jsonb_build_object('status', 'resolved', 'outcome', p_outcome);
end $$;
revoke all on function public.reservation_resolve_seating(uuid, text) from public, anon;
grant execute on function public.reservation_resolve_seating(uuid, text) to authenticated;
