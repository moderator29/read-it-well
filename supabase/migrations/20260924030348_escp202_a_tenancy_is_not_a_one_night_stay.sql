-- ESC-P2-02: a tenancy's move-in charge is stored as a one-night booking
-- (private.open_rent_charge: check_in = move-in, check_out = move-in + 1), so
-- the stay lifecycle treated a year's tenancy as a finished night: the next
-- morning private.announce_completed_stays posted "a guest finished a stay"
-- in the area, and the night after private.complete_ended_stays moved it to
-- COMPLETED.
--
-- A booking that carries a rent charge (a rent_payments row) is now left out
-- of both. ESC-04 already refuses a no show on one and ESC-14 never lapses
-- one; a refund of a paid tenancy goes through
-- private.refund_booking_payment, which works in any status (MON-P2-02).

CREATE OR REPLACE FUNCTION private.complete_ended_stays(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b            record;
  completed    uuid[] := '{}';
  unpaid_ended uuid[] := '{}';
  today        date   := (now() at time zone 'Africa/Lagos')::date;
  host_user    uuid;
  stay_title   text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep completes between 1 and 5000 stays per run.' using errcode = '22023';
  end if;
  for b in
    select bk.id, bk.listing_id, bk.check_out
      from public.bookings bk
     where bk.status = 'CONFIRMED'
       and bk.check_out < today
       -- ESC-P2-02. A move-in charge is a tenancy, not a night that ended.
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id)
     order by bk.check_out
     limit p_limit
       for update of bk skip locked
  loop
    if not exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'SUCCESSFUL'
    ) then
      unpaid_ended := unpaid_ended || b.id;
      continue;
    end if;
    update public.bookings
       set status = 'COMPLETED'
     where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;
    completed := completed || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'COMPLETED',
            format('Checked out: the stay ended on %s and was recorded automatically.',
                   to_char(b.check_out, 'DD Mon YYYY')));
    select a.user_id, l.title
      into host_user, stay_title
      from public.listings l
      join public.agents   a on a.id = l.agent_id
     where l.id = b.listing_id;
    perform private.notify(
      host_user, 'booking', 'Stay complete',
      coalesce(stay_title, 'A stay') || ' ended on ' || to_char(b.check_out, 'DD Mon')
        || ' and is recorded as complete.',
      '/agent/bookings'
    );
  end loop;
  return jsonb_build_object(
    'completed',    to_jsonb(completed),
    'unpaid_ended', to_jsonb(unpaid_ended),
    'today',        today
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.announce_completed_stays()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  today   date := (now() at time zone 'Africa/Lagos')::date;
  r       record;
  written integer := 0;
  line    text;
begin
  for r in
    select place.id as area_id, place.name as area_name, count(*)::integer as stays
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join public.areas place
        on place.id = private.area_for_listing(l.state_code, l.city, l.area)
     where b.status = 'CONFIRMED'
       and b.check_out <= today
       and b.check_out > today - 7
       -- ESC-P2-02. A tenant moving in is not a guest who finished a stay.
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
     group by place.id, place.name
  loop
    if exists (
      select 1
        from public.posts p
       where p.area_id = r.area_id
         and p.author_kind = 'SYSTEM'
         and p.payload ->> 'reason' = 'stay_completed'
         and p.created_at > now() - interval '7 days'
    ) then
      continue;
    end if;

    if r.stays = 1 then
      line := 'A guest finished a stay around ' || r.area_name
        || ' in the last week. No name, no address, no price: only that '
        || 'somebody came, stayed and went home.';
    else
      line := r.stays || ' guests finished stays around ' || r.area_name
        || ' in the last week. No names, no addresses, no prices: only that '
        || 'they came, stayed and went home.';
    end if;

    insert into public.posts (area_id, author_kind, kind, body, status, payload)
    values (
      r.area_id, 'SYSTEM', 'SYSTEM', line, 'LIVE',
      jsonb_build_object('reason', 'stay_completed', 'stays', r.stays)
    );
    written := written + 1;
  end loop;

  return written;
end;
$function$;
