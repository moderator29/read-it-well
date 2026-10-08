-- D73 Part A, fourth piece: the 15-minute sweep releases an unpaid instant booking after
-- private.instant_pay_window(); every other booking takes the unchanged rules.
create or replace function private.expire_booking_holds(p_ttl interval default '48:00:00'::interval, p_limit integer default 500)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b             record;
  released      uuid[] := '{}';
  paid_pending  uuid[] := '{}';
  paying        uuid[] := '{}';
  unpaid        uuid[] := '{}';
  waiting       uuid[] := '{}';
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
    if exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL') then
      paid_pending := paid_pending || b.id;
      continue;
    end if;
    if b.created_at > now() - (p_ttl + interval '2 hours') and private.booking_payment_in_flight(b.id) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'PENDING';
    if not found then
      continue;
    end if;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'PENDING', 'CANCELLED',
            format('Auto-released: the request was not confirmed within %s hours.', ttl_hours));
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out,
           coalesce((select max(e.created_at) from public.booking_state_events e
                      where e.booking_id = bk.id and e.to_status = 'CONFIRMED'), bk.updated_at) as accepted_at,
           ag.status as agreement_status, ag.decided_at as approved_at,
           coalesce((ag.terms ->> 'instant_booking')::boolean, false) and ag.decided_by is null as instant
      from public.bookings bk
      left join public.deal_agreements ag on ag.booking_id = bk.id
     where bk.status = 'CONFIRMED'
       and not exists (select 1 from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL')
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id)
     order by bk.check_in
     limit p_limit
       for update of bk skip locked
  loop
    if b.instant and b.agreement_status = 'approved' then
      if b.approved_at >= now() - private.instant_pay_window() then
        continue;
      end if;
      if b.approved_at > now() - interval '2 hours' and private.booking_payment_in_flight(b.id) then
        paying := paying || b.id;
        continue;
      end if;
      update public.bookings set status = 'CANCELLED' where id = b.id and status = 'CONFIRMED';
      if not found then
        continue;
      end if;
      unpaid := unpaid || b.id;
      released := released || b.id;
      insert into public.booking_state_events (booking_id, from_status, to_status, note)
      values (b.id, 'CONFIRMED', 'CANCELLED',
              'Auto-released: the instant booking was not paid for in time.');
      update public.deal_agreements set status = 'cancelled', updated_at = now()
       where booking_id = b.id and status not in ('paid', 'cancelled');
      delete from public.availability av
       where av.listing_id = b.listing_id and av.status = 'booked'
         and av.date >= b.check_in and av.date < b.check_out;
      continue;
    end if;
    if b.agreement_status in ('awaiting_parties', 'in_review', 'rejected') then
      if b.accepted_at > now() - interval '72 hours' and b.check_in > lagos_today then
        waiting := waiting || b.id;
        continue;
      end if;
    elsif b.agreement_status = 'approved' then
      if not (b.approved_at < now() - interval '24 hours'
              or (b.check_in <= lagos_today and b.approved_at < now() - interval '2 hours')) then
        continue;
      end if;
    elsif not (b.accepted_at < now() - interval '24 hours'
               or (b.check_in <= lagos_today and b.accepted_at < now() - interval '2 hours')) then
      continue;
    end if;
    if coalesce(case when b.agreement_status = 'approved' then b.approved_at end, b.accepted_at)
         > now() - interval '26 hours'
       and private.booking_payment_in_flight(b.id) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;
    unpaid := unpaid || b.id;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'CANCELLED',
            'Auto-released: the stay was accepted but not paid for in time.');
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  return jsonb_build_object('released', to_jsonb(released), 'paid_pending', to_jsonb(paid_pending),
                            'payment_in_flight', to_jsonb(paying), 'accepted_unpaid', to_jsonb(unpaid),
                            'agreement_pending', to_jsonb(waiting), 'ttl_hours', ttl_hours);
end;
$function$;
