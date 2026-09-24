-- ESC-04: a host could record a paid stay NO_SHOW from 00:00 WAT on check-in
-- day, which also deleted the calendar nights, and because the exclusion
-- constraint ignored NO_SHOW the same nights could be sold again at once. The
-- same button worked on a tenant's move-in charge.
--
-- private.record_booking_no_show now:
--   * refuses any booking that carries a rent charge (rent_payments): a missed
--     move-in is a support matter ('rent_charge');
--   * records a no show only from 12:00 WAT on the day after check-in
--     ('too_early' before then, with the moment it opens);
--   * leaves the booked nights where they are.
-- bookings_no_overlap now counts NO_SHOW, so a no-show's nights stay held
-- until its check-out and cannot be resold. What happens to the guest's
-- payment is a founder decision (ESC-04 in the fixes ledger); until then it is
-- unchanged, and the guest is told to contact support.
--
-- A caller that does not know 'too_early' or 'rent_charge' (deployed main's
-- parser) fails closed and records nothing.

alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (listing_id with =, during with &&)
  where (status = any (array['PENDING'::public.booking_status, 'CONFIRMED'::public.booking_status,
                             'NO_SHOW'::public.booking_status]));

CREATE OR REPLACE FUNCTION private.record_booking_no_show(p_booking uuid, p_actor uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bk         record;
  today      date := (now() at time zone 'Africa/Lagos')::date;
  opens_at   timestamptz;
  host_user  uuid;
  stay_title text;
  is_admin   boolean;
begin
  if p_booking is null or p_actor is null then
    raise exception 'A no show needs a booking and the person recording it.' using errcode = '22023';
  end if;
  select b.id, b.listing_id, b.guest_id, b.status, b.check_in, b.check_out
    into bk
    from public.bookings b
   where b.id = p_booking
     for update;
  if not found then
    return jsonb_build_object('outcome', 'missing');
  end if;
  select a.user_id, l.title
    into host_user, stay_title
    from public.listings l
    join public.agents   a on a.id = l.agent_id
   where l.id = bk.listing_id;
  is_admin := private.has_role(p_actor, 'admin') or private.has_role(p_actor, 'super_admin');
  if p_actor is distinct from host_user and not is_admin then
    raise exception 'That booking is not yours to record.' using errcode = '42501';
  end if;
  if bk.status = 'NO_SHOW' then
    return jsonb_build_object('outcome', 'already');
  end if;
  if bk.status <> 'CONFIRMED' then
    return jsonb_build_object('outcome', 'not_confirmed', 'status', bk.status);
  end if;
  -- A tenant's move-in charge is never a host's no show.
  if exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id) then
    return jsonb_build_object('outcome', 'rent_charge');
  end if;
  if bk.check_in > today then
    return jsonb_build_object('outcome', 'not_arrived');
  end if;
  -- A guest may arrive late on the day: a no show opens at 12:00 WAT the day after check-in.
  opens_at := ((bk.check_in + 1)::timestamp + time '12:00') at time zone 'Africa/Lagos';
  if now() < opens_at then
    return jsonb_build_object('outcome', 'too_early', 'opens_at', opens_at);
  end if;
  update public.bookings
     set status = 'NO_SHOW'
   where id = bk.id and status = 'CONFIRMED';
  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, 'CONFIRMED', 'NO_SHOW', p_actor, nullif(btrim(p_note), ''));
  -- The nights stay booked: a no show is disputable, and bookings_no_overlap
  -- keeps them held until check-out.
  perform private.notify(
    bk.guest_id, 'booking', 'Stay recorded as not attended',
    coalesce(stay_title, 'Your stay') || ': the host recorded that nobody arrived for '
      || to_char(bk.check_in, 'DD Mon')
      || '. If that is not right, contact support from your bookings and we will look into it.',
    '/bookings'
  );
  if is_admin and p_actor is distinct from host_user then
    perform private.notify(
      host_user, 'booking', 'Stay recorded as no show',
      coalesce(stay_title, 'A stay') || ' for ' || to_char(bk.check_in, 'DD Mon')
        || ' was recorded as a no show by Vallo support.',
      '/agent/bookings'
    );
  end if;
  return jsonb_build_object('outcome', 'recorded', 'booking_id', bk.id);
end;
$function$;
