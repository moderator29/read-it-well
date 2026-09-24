-- ESC-14: a stay the host accepted but the guest never paid had no timeout.
--
-- A request-to-book the host CONFIRMED is payable, and if the guest vanished
-- it stayed CONFIRMED, holding the nights under the exclusion constraint until
-- check-out. private.expire_booking_holds now also cancels a CONFIRMED stay
-- with no SUCCESSFUL payment once 24 hours have passed since it was accepted,
-- or once check-in day (Lagos) has arrived and it was accepted at least two
-- hours ago, whichever is first; a stay accepted on the day itself keeps two
-- hours to pay. A payment started in the last two hours is waited for, on
-- check-in day too, but never past 26 hours after acceptance, so opening
-- checkouts cannot hold the nights for ever. A rent
-- charge (rent_payments) is never touched here. The notify trigger on
-- bookings tells the guest and the host, as it does for any cancellation.

CREATE OR REPLACE FUNCTION private.expire_booking_holds(p_ttl interval DEFAULT '48:00:00'::interval, p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b             record;
  released      uuid[] := '{}';
  paid_pending  uuid[] := '{}';
  paying        uuid[] := '{}';
  unpaid        uuid[] := '{}';
  ttl_hours     integer;
  lagos_today   date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_ttl is null or p_ttl < interval '1 hour' then
    raise exception 'A hold lives for at least one hour before it can expire.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep releases between 1 and 5000 holds per run.' using errcode = '22023';
  end if;
  ttl_hours := floor(extract(epoch from p_ttl) / 3600)::integer;
  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out, bk.created_at
      from public.bookings bk
     where bk.status = 'PENDING'
       and bk.created_at < now() - p_ttl
     order by bk.created_at
     limit p_limit
       for update of bk skip locked
  loop
    if exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'SUCCESSFUL'
    ) then
      paid_pending := paid_pending || b.id;
      continue;
    end if;
    /* OPS-02. A payment started in the last two hours may still land (a card
       whose webhook is late, a bank transfer awaiting settlement), so the hold
       waits for it. Two hours and not Paystack's 72-hour retry window: a
       longer grace would let anybody keep dates by opening checkouts. A charge
       that lands after the release is not lost: private.settle_booking_charge
       returns it to the guest's wallet and raises an alert. */
    -- The grace is capped absolutely: no hold outlives its TTL by more than two
    -- hours however many checkouts are opened, or opening one every two hours
    -- would keep dates held for ever.
    if b.created_at > now() - (p_ttl + interval '2 hours') and exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'PENDING'
         and t.created_at > now() - interval '2 hours'
    ) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings
       set status = 'CANCELLED'
     where id = b.id and status = 'PENDING';
    if not found then
      continue;
    end if;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'PENDING', 'CANCELLED',
            format('Auto-released: the request was not confirmed within %s hours.', ttl_hours));
    delete from public.availability av
     where av.listing_id = b.listing_id
       and av.status = 'booked'
       and av.date >= b.check_in
       and av.date <  b.check_out;
  end loop;

  /* ESC-14. Accepted but never paid: 24 hours after the host accepted, or on
     check-in day once the acceptance is two hours old, the nights go back. */
  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out,
           coalesce((select max(e.created_at) from public.booking_state_events e
                      where e.booking_id = bk.id and e.to_status = 'CONFIRMED'), bk.updated_at) as accepted_at
      from public.bookings bk
     where bk.status = 'CONFIRMED'
       and not exists (select 1 from public.transactions t
                        where t.booking_id = bk.id and t.status = 'SUCCESSFUL')
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id)
     order by bk.check_in
     limit p_limit
       for update of bk skip locked
  loop
    if not (b.accepted_at < now() - interval '24 hours'
            or (b.check_in <= lagos_today and b.accepted_at < now() - interval '2 hours')) then
      continue;
    end if;
    if b.accepted_at > now() - interval '26 hours' and exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'PENDING'
         and t.created_at > now() - interval '2 hours'
    ) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings
       set status = 'CANCELLED'
     where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;
    unpaid := unpaid || b.id;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'CANCELLED',
            'Auto-released: the stay was accepted but not paid for within 24 hours, or by check-in day.');
    delete from public.availability av
     where av.listing_id = b.listing_id
       and av.status = 'booked'
       and av.date >= b.check_in
       and av.date <  b.check_out;
  end loop;

  return jsonb_build_object(
    'released',     to_jsonb(released),
    'paid_pending', to_jsonb(paid_pending),
    'payment_in_flight', to_jsonb(paying),
    'accepted_unpaid', to_jsonb(unpaid),
    'ttl_hours',    ttl_hours
  );
end;
$function$;
