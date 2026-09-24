-- ESC-03 and SUP-P2-02: the free calendar squat. OPS-02 (b): the hold sweep
-- cancelled a booking whose payment was still in flight.
--
-- 1. private.price_booking_from_listing (ESC-02) gains the hold limits: at most
--    90 nights, 3 unconfirmed stays per guest and 1 per listing, a cooldown
--    after two released unpaid holds on the same listing within 7 days, and
--    10 bookings a day per guest. The rent charge (open_rent_charge) is exempt,
--    as it is from pricing.
-- 2. private.expire_booking_holds spares a hold whose payment attempt started
--    within the last two hours, and never beyond two hours past its TTL.
-- 3. private.open_rent_charge answers `date_taken` when the move-in date is
--    held by a stay, instead of raising 23P01 (ESC-03 pass-two amendment).

create or replace function private.price_booking_from_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lst         record;
  -- The role PostgREST switched to. current_user cannot be used here: in a
  -- SECURITY DEFINER function it is always the owner. SET ROLE is not
  -- changed by the definer, so this still names the API caller.
  api_caller  boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
  n           integer;
begin
  if tg_op = 'UPDATE' then
    if (new.listing_id, new.guest_id, new.check_in, new.check_out, new.nights,
        new.price_per_night_minor, new.cleaning_fee_minor, new.service_fee_minor,
        new.subtotal_minor, new.total_minor, new.currency)
       is distinct from
       (old.listing_id, old.guest_id, old.check_in, old.check_out, old.nights,
        old.price_per_night_minor, old.cleaning_fee_minor, old.service_fee_minor,
        old.subtotal_minor, old.total_minor, old.currency) then
      raise exception 'booking_terms_are_fixed: a booking''s listing, guest, dates and price are fixed when it is made'
        using errcode = '42501',
              hint = 'ESC-02 / ESC-P2-01: cancel and book again instead.';
    end if;
    return new;
  end if;

  -- INSERT. The rent charge is priced by private.open_rent_charge.
  if not api_caller and coalesce(current_setting('vallo.rent_charge', true), '') = 'true' then
    return new;
  end if;

  select l.id, l.status, l.is_demo, l.rate_minor, l.rate_period
    into lst
    from public.listings l
   where l.id = new.listing_id;
  if lst.id is null or lst.is_demo then
    return new;  -- the foreign key and the demo trigger answer in their own words
  end if;
  if lst.status <> 'PUBLISHED'
     or lst.rate_period is distinct from 'night'
     or coalesce(lst.rate_minor, 0) <= 0 then
    raise exception 'booking_listing_not_bookable: this place is not taking stay bookings'
      using errcode = '23514',
            hint = 'ESC-02: only a published listing with a nightly rate can carry a stay booking.';
  end if;

  if new.check_in < lagos_today then
    raise exception 'booking_check_in_past: check-in has already passed'
      using errcode = '23514';
  end if;
  n := new.check_out - new.check_in;
  if n is null or n < 1 then
    raise exception 'booking_dates_reversed: check-out has to be after check-in'
      using errcode = '22000';
  end if;

  -- ESC-03 / SUP-P2-02: holding a calendar costs something. A stay is at
  -- most 90 nights; a guest holds at most 3 unconfirmed stays, and 1 per
  -- listing; a guest whose unpaid holds on a listing were released twice in
  -- the last 7 days waits; and at most 10 bookings a day per guest.
  if n > 90 then
    raise exception 'booking_too_long: a stay is at most 90 nights'
      using errcode = '23514';
  end if;
  -- The limits are on what a member can hold through the API. The service
  -- role and the definer functions (tests, repairs, the rent charge) are not
  -- squatting anybody's calendar.
  if api_caller and new.status = 'PENDING' then
    if (select count(*) from public.bookings b
         where b.guest_id = new.guest_id and b.status = 'PENDING'
           and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)) >= 3
       or exists (select 1 from public.bookings b
                   where b.guest_id = new.guest_id and b.listing_id = new.listing_id
                     and b.status = 'PENDING') then
      raise exception 'booking_hold_limit: too many unconfirmed stays are already held'
        using errcode = '23514';
    end if;
    -- The cooldown counts holds the guest let lapse or withdrew, never a host's
    -- decline: the cancellation event was written by the sweep (no actor) or by
    -- the guest.
    if (select count(*) from public.bookings b
         where b.guest_id = new.guest_id and b.listing_id = new.listing_id
           and b.status = 'CANCELLED' and b.created_at > now() - interval '7 days'
           and not exists (select 1 from public.transactions t
                            where t.booking_id = b.id and t.status in ('SUCCESSFUL', 'REFUNDED'))
           and exists (select 1 from public.booking_state_events e
                        where e.booking_id = b.id and e.to_status = 'CANCELLED'
                          and (e.actor_id is null or e.actor_id = new.guest_id))) >= 2
       or (select count(*) from public.bookings b
            where b.guest_id = new.guest_id and b.created_at > now() - interval '1 day'
              and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)) >= 10 then
      raise exception 'booking_rate_limit: too many bookings in a short time'
        using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1 from public.availability a
     where a.listing_id = new.listing_id
       and a.status = 'unavailable'
       and a.date >= new.check_in and a.date < new.check_out
  ) then
    raise exception 'booking_dates_blocked: the host has closed some of these nights'
      using errcode = '23P01';
  end if;

  new.nights                := n;
  new.price_per_night_minor := lst.rate_minor;
  new.cleaning_fee_minor    := 0;
  new.service_fee_minor     := 0;
  new.subtotal_minor        := lst.rate_minor * n;
  new.total_minor           := lst.rate_minor * n;
  new.currency              := 'NGN';
  return new;
end;
$$;


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
  ttl_hours     integer;
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
  return jsonb_build_object(
    'released',     to_jsonb(released),
    'paid_pending', to_jsonb(paid_pending),
    'payment_in_flight', to_jsonb(paying),
    'ttl_hours',    ttl_hours
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.open_rent_charge(p_tenant uuid, p_inspection uuid, p_move_in date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  insp        public.inspection_requests%rowtype;
  lst         public.listings%rowtype;
  lister_user uuid;
  existing    public.rent_payments%rowtype;
  existing_bk public.bookings%rowtype;
  parts_sum   bigint;
  total       bigint;
  stated      boolean;
  v_booking   uuid;
  charge_id   uuid;
begin
  if p_tenant is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < current_date then
    return jsonb_build_object('status', 'move_in_past');
  end if;
  select * into insp from public.inspection_requests where id = p_inspection;
  if insp.id is null or insp.requester_id <> p_tenant then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not (insp.state = 'CONFIRMED'
          or (insp.state = 'COMPLETED' and coalesce(insp.outcome, 'inspected') <> 'no_deal')) then
    return jsonb_build_object('status', 'not_accepted', 'state', insp.state);
  end if;
  select * into lst from public.listings where id = insp.listing_id;
  if lst.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if lst.status <> 'PUBLISHED' then
    return jsonb_build_object('status', 'not_published');
  end if;
  if lst.listing_intent <> 'rent' or lst.rent_amount_minor is null then
    return jsonb_build_object('status', 'not_a_rental');
  end if;
  select a.user_id into lister_user from public.agents a where a.id = lst.agent_id;
  if lister_user is null then
    return jsonb_build_object('status', 'no_lister');
  end if;
  if lister_user = p_tenant then
    return jsonb_build_object('status', 'own_listing');
  end if;
  parts_sum := coalesce(lst.rent_amount_minor, 0)
             + coalesce(lst.caution_deposit_minor, 0)
             + coalesce(lst.service_charge_minor, 0)
             + coalesce(lst.agency_fee_minor, 0)
             + coalesce(lst.legal_fee_minor, 0)
             + coalesce(lst.agreement_fee_minor, 0);
  if lst.total_move_in_cost_minor is not null then
    total  := lst.total_move_in_cost_minor;
    stated := true;
  else
    total  := parts_sum;
    stated := false;
  end if;
  if total <= 0 then
    return jsonb_build_object('status', 'no_amount');
  end if;
  select * into existing from public.rent_payments where inspection_id = p_inspection;
  if existing.id is not null then
    select * into existing_bk from public.bookings where id = existing.booking_id;
    if existing_bk.status <> 'CANCELLED'
       or exists (select 1 from public.transactions t where t.booking_id = existing_bk.id and t.status = 'SUCCESSFUL') then
      return jsonb_build_object(
        'status', 'exists',
        'rent_payment_id', existing.id,
        'booking_id', existing.booking_id,
        'total_minor', existing.total_minor
      );
    end if;
  end if;
  perform set_config('vallo.rent_charge', 'true', true);
  /* ESC-03. A stay held on the move-in date makes this insert collide with
     the calendar; say so rather than failing as "could not be opened". */
  begin
    insert into public.bookings (
      listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor,
      subtotal_minor, total_minor, currency, status
    ) values (
      lst.id, p_tenant, p_move_in, p_move_in + 1, 1, 1, 0,
      total, 0, 0, total, total, 'NGN', 'PENDING'
    )
    returning id into v_booking;
  exception when exclusion_violation then
    perform set_config('vallo.rent_charge', '', true);
    return jsonb_build_object('status', 'date_taken');
  end;
  perform set_config('vallo.rent_charge', '', true);
  if existing.id is not null then
    update public.rent_payments
       set booking_id = v_booking, move_in = p_move_in,
           rent_minor = lst.rent_amount_minor, caution_minor = lst.caution_deposit_minor,
           service_minor = lst.service_charge_minor, agency_minor = lst.agency_fee_minor,
           legal_minor = lst.legal_fee_minor, agreement_minor = lst.agreement_fee_minor,
           total_minor = total, total_stated = stated,
           rent_period = coalesce(lst.rent_period, 'year')
     where id = existing.id;
    charge_id := existing.id;
  else
    insert into public.rent_payments (
      inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, rent_period,
      rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
      total_minor, total_stated
    ) values (
      insp.id, lst.id, p_tenant, lister_user, v_booking, p_move_in, coalesce(lst.rent_period, 'year'),
      lst.rent_amount_minor, lst.caution_deposit_minor, lst.service_charge_minor,
      lst.agency_fee_minor, lst.legal_fee_minor, lst.agreement_fee_minor,
      total, stated
    )
    returning id into charge_id;
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'rent_payment_id', charge_id,
    'booking_id', v_booking,
    'total_minor', total
  );
end;
$function$;
