-- D73 Part A: a booking at a price the business fixed is booked and paid in
-- one flow, the shape of a hotel booking API such as LiteAPI (DIRECTIVES D73).
-- Pending: NOT applied. The lead reviews it, applies it through the MCP, and
-- commits it under the version the server stamps (scripts/check-migrations.mjs).
-- Its probe is supabase/tests/probes-pending/d73a-stays-instant-pay.sql.
--
-- Behind the switch `stays_instant_pay`, seeded OFF. A missing row reads OFF.
-- With it off, every function below behaves exactly as it does today: the new
-- trigger returns before doing anything, and the three changed functions only
-- take their new branch for a booking the new trigger marked.
--
-- WHICH BOOKINGS (read from the live schema, 7 October 2026)
--  * a hotel room: bookings.room_type_id set, priced by private.price_room_booking
--    from the host's rate plan and calendar;
--  * a listing stay (shortlet, serviced apartment): a listing whose rate_period
--    is 'night', priced by private.price_booking_from_listing at the published
--    nightly rate.
--  Nothing else. A rent charge (vallo.rent_charge, rent_payments) is never
--  touched. A 'guest' rate (a restaurant's per-head price) is refused by the
--  stay pricing already. Restaurants take no payment on Vallo at all:
--  public.reservations carries no price and no transaction names it.
--
-- WHAT HAPPENS, WITH THE SWITCH ON, WHEN A GUEST BOOKS FOR THEMSELVES
--  1. The guest's own insert runs every existing check unchanged: the RLS
--     insert policy (PENDING, own guest_id), the database price, the hold
--     limits, closed nights, the room inventory hold. Any refusal refuses.
--  2. AFTER INSERT, bookings_instant_when_fixed_price (sorted after the
--     inventory hold and before the notification trigger) draws up the stay
--     agreement at the booking's database total, with the same terms the host
--     acceptance path writes, plus instant_booking = true. The platform
--     cancellation schedule is added and frozen by the existing agreement
--     triggers. The agreement is written APPROVED with decided_by NULL (the
--     system, not a person) and decision_reason 'Fixed price, instant
--     booking.'; deal_agreement_events gets 'opened' and 'approved' (actor
--     NULL), and audit_log gets 'agreement.approve' with decided_by 'system'.
--  3. If the split for the booking is not ready (payment_split_for_booking is
--     not 'ok', usually a host with no payout subaccount yet) or anything in
--     step 2 fails, the whole step is undone and the booking stays a PENDING
--     request, today's flow. A failure that is not "not ready" is recorded as a
--     risk alert. The guest is never refused because of the instant path.
--  4. Otherwise the booking is moved to CONFIRMED and a booking_state_events
--     row says why. The existing agreement trigger sees the agreement and draws
--     nothing more.
--  5. Payment: private.transactions_payment_gate, payment_split_for_booking,
--     the Paystack charge and settle_booking_charge are all UNCHANGED. The gate
--     already demands an approved agreement at the charge's amount; this one is.
--  6. Unpaid: the existing sweep (private.expire_booking_holds, every 15
--     minutes) releases an instant booking 30 minutes after it was made, or up
--     to 2 hours while Paystack says a payment is still moving.
--
-- LIVE FUNCTIONS CHANGED (each copied from pg_get_functiondef on 7 October)
--  * private.expire_booking_holds: one new branch for instant agreements. Every
--    other booking takes the unchanged code.
--  * private.notify_booking_change: an instant booking tells the host "New
--    booking" and the guest "pay to keep it" instead of "request sent" and
--    "confirmed". Every other booking is told exactly what it is told today.
--  * private.enqueue_agreement_lifecycle_email: an agreement inserted already
--    approved does not send "terms waiting for your confirmation". Today every
--    insert is awaiting_parties, so nothing changes for them.
-- NOT CHANGED: private.transactions_payment_gate, private.agreement_open_for_stay,
-- private.price_booking_from_listing, private.price_room_booking,
-- public.payment_split_for_booking, private.settle_booking_charge.

-- 1. The switch. ---------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('stays_instant_pay', false,
        'D73: a hotel room or nightly stay at the published price is booked and paid in one flow, with no host acceptance or Vallo review step. Off until the founder switches it on.')
on conflict (key) do nothing;

create or replace function private.stays_instant_pay_on()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'stays_instant_pay'), false);
$$;

-- How long an unpaid instant booking is held. The app mirrors it
-- (INSTANT_PAY_WINDOW_MINUTES in lib/bookings/instant-pay.ts).
create or replace function private.instant_pay_window()
returns interval
language sql
immutable
set search_path to ''
as $$ select interval '30 minutes' $$;

revoke all on function private.stays_instant_pay_on() from public, anon, authenticated;
revoke all on function private.instant_pay_window() from public, anon, authenticated;

-- 2. The instant step. -------------------------------------------------------
create or replace function private.book_stay_instantly()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  -- The role PostgREST switched to (see private.price_booking_from_listing):
  -- SET ROLE is not changed by a definer, so this names the API caller.
  api_role     text := coalesce(current_setting('role', true), 'none');
  lst          record;
  host         uuid;
  has_mandates boolean := false;
  mandate      uuid;
  ag           public.deal_agreements%rowtype;
  split        jsonb;
begin
  if tg_op <> 'INSERT' or new.status <> 'PENDING' then
    return new;
  end if;
  if not private.stays_instant_pay_on() then
    return new;
  end if;
  -- A guest booking for themselves through their own session. The service
  -- role, repairs, tests and the rent charge keep today's flow.
  if api_role <> 'authenticated' or auth.uid() is distinct from new.guest_id then
    return new;
  end if;
  if coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
     or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id) then
    return new;
  end if;
  -- A price the business fixed: a room from its rate plan, or a listing's
  -- published nightly rate exactly as the pricing trigger wrote it.
  if new.listing_id is null then
    if new.room_type_id is null or new.rate_plan_id is null or new.accommodation_id is null then
      return new;
    end if;
  else
    select l.id, l.rate_period, l.rate_minor into lst from public.listings l where l.id = new.listing_id;
    if lst.id is null or lst.rate_period is distinct from 'night'
       or new.price_per_night_minor is distinct from lst.rate_minor then
      return new;
    end if;
  end if;
  if exists (select 1 from public.deal_agreements a where a.booking_id = new.id) then
    return new;
  end if;
  host := private.booking_host(new.id);
  if host is null or host = new.guest_id then
    return new;
  end if;
  -- An agent acting for an owner needs a live mandate to confirm a stay
  -- (agreement_confirm_as). Without one the stay stays a request.
  if new.listing_id is not null then
    select exists (select 1 from public.listing_mandates m where m.listing_id = new.listing_id) into has_mandates;
    if has_mandates then
      select m.id into mandate from public.listing_mandates m
       where m.listing_id = new.listing_id
         and m.review_status = 'approved'
         and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
         and m.principal_consent_withdrawn_at is null
       order by m.reviewed_at desc nulls last limit 1;
      if mandate is null then
        return new;
      end if;
    end if;
  end if;

  begin
    -- Read by notify_booking_change for this booking only; undone with the
    -- rest of this block if the instant step does not complete.
    perform set_config('vallo.instant_booking', new.id::text, true);

    insert into public.deal_agreements (
      kind, listing_id, accommodation_id, booking_id, renter_id, owner_id, amount_minor, terms,
      renter_confirmed_version, renter_confirmed_at, owner_confirmed_version, owner_confirmed_at, mandate_id,
      status, submitted_at, decided_at, decided_by, decision_reason)
    values (
      'stay', new.listing_id, new.accommodation_id, new.id, new.guest_id, host, new.total_minor,
      jsonb_build_object('check_in', new.check_in, 'check_out', new.check_out, 'nights', new.nights,
                         'adults', new.adults, 'children', new.children,
                         'price_per_night_minor', new.price_per_night_minor,
                         'cleaning_fee_minor', new.cleaning_fee_minor,
                         'service_fee_minor', new.service_fee_minor,
                         'total_minor', new.total_minor,
                         'guarantee_bps', (select m.guarantee_bps from public.money_policy m),
                         'commission_bps', private.current_fee_bps('commission'),
                         'inspection_fee_minor', 0, 'room_type_id', new.room_type_id,
                         'rate_plan_id', new.rate_plan_id, 'rooms', new.rooms,
                         'instant_booking', true, 'priced_by', 'database'),
      1, now(), 1, now(), mandate,
      'approved', now(), now(), null, 'Fixed price, instant booking.')
    returning * into ag;

    perform private.agreement_log(ag, null, 'opened', null,
      'Drawn up at the published price when the guest booked (instant booking).');
    perform private.agreement_log(ag, null, 'approved', null,
      'Fixed price, instant booking: approved by the system, not by a person.');
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'agreement.approve', 'deal_agreement', ag.id::text,
            jsonb_build_object('reason', 'fixed price, instant booking', 'decided_by', 'system',
                               'instant_booking', true, 'booking_id', new.id,
                               'terms_version', ag.terms_version, 'amount_minor', ag.amount_minor,
                               'kind', ag.kind));

    split := public.payment_split_for_booking(new.id);
    if coalesce(split ->> 'status', '') <> 'ok' then
      raise exception 'stays_instant_not_ready' using detail = coalesce(split ->> 'status', 'no answer');
    end if;

    update public.bookings set status = 'CONFIRMED' where id = new.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (new.id, 'PENDING', 'CONFIRMED', null,
            'Instant booking at the published price: accepted when it was made.');
  exception
    when others then
      if sqlerrm <> 'stays_instant_not_ready' then
        begin
          insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
          values ('medium', 'open', 'An instant booking fell back to a request',
                  format('Booking %s could not be booked instantly and waits for the host instead: %s (%s)',
                         new.id, sqlerrm, sqlstate),
                  'booking', new.id::text);
        exception when others then
          null;
        end;
      end if;
      -- Today's flow: the booking is a PENDING request for the host.
      return new;
  end;
  return new;
end;
$function$;

revoke all on function private.book_stay_instantly() from public, anon, authenticated;

-- Sorted after bookings_hold_and_release_rooms (the nights are held first) and
-- before bookings_notify_after_change (which reads vallo.instant_booking).
create trigger bookings_instant_when_fixed_price
  after insert on public.bookings
  for each row execute function private.book_stay_instantly();

-- 3. The agreement email: an agreement born approved waits for nobody. ---------
create or replace function private.enqueue_agreement_lifecycle_email()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  template text;
  who uuid;
begin
  if tg_op = 'INSERT' then
    -- D73: an instant booking's agreement is inserted already approved; there
    -- are no terms waiting for anybody's confirmation.
    if new.status <> 'awaiting_parties' then
      return new;
    end if;
    template := 'agreement.waiting';
  elsif new.status is distinct from old.status and new.status = 'in_review' then
    template := 'agreement.submitted';
  elsif new.status is distinct from old.status and new.status = 'cancelled' then
    template := 'agreement.cancelled';
  else
    return new;
  end if;

  foreach who in array array[new.renter_id, new.owner_id] loop
    /* "Terms waiting for your confirmation" is not news to the person who
       just drew the terms up. When the caller is visible (auth.uid(), a
       member's own client) they are skipped. public.agreement_open_rent_as
       runs with p_actor and sets no session value this trigger could read,
       so under the service role both parties are told, which is what the
       stay path's private.agreement_tell_both already does. */
    if template = 'agreement.waiting' and who = (select auth.uid()) then
      continue;
    end if;
    /* The key private.agreement_tell_both composes, exactly, so an event
       both paths announce is one email. */
    perform private.email_outbox_enqueue(
      who, template,
      template || ':' || new.id::text || ':' || new.terms_version::text || ':' || who::text,
      jsonb_build_object('agreement_id', new.id, 'listing_id', new.listing_id,
                         'kind', new.kind, 'amount_minor', new.amount_minor,
                         'viewer', case when who = new.renter_id then 'renter' else 'owner' end));
  end loop;
  return new;
end;
$function$;

-- 4. The notices: an instant booking is a booking, not a request. -------------
create or replace function private.notify_booking_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  host_user     uuid;
  listing_title text;
  night_rate    public.rate_period;
  guest_href    text;
  tenancy       boolean;
  tenant_name   text;
  charge        public.rent_payments%rowtype;
  instant       boolean := coalesce(current_setting('vallo.instant_booking', true), '') = new.id::text;
begin
  select a.user_id, l.title, l.rate_period
    into host_user, listing_title, night_rate
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;
  -- ROOM BOOKINGS 1: a hotel room's host is the business owner.
  if new.listing_id is null then
    select bu.owner_id, ac.name || coalesce(', ' || rt.name, '') into host_user, listing_title
      from public.accommodations ac
      join public.businesses bu on bu.id = ac.business_id
      left join public.room_types rt on rt.id = new.room_type_id
     where ac.id = new.accommodation_id;
    night_rate := 'night';
  end if;
  guest_href := case when night_rate = 'night' then '/trips' else '/bookings' end;
  tenancy := coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
             or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id);
  if tenancy then
    select * into charge from public.rent_payments rp where rp.booking_id = new.id;
    tenant_name := coalesce(
      (select p.display_name from public.profiles p where p.id = new.guest_id),
      'The tenant'
    );
    if tg_op = 'INSERT' then
      perform private.notify(host_user, 'booking', 'Rent payment started',
        tenant_name || ' is paying the move-in total for ' || coalesce(listing_title, 'your listing') || ' on Vallo.',
        '/agent/earnings');
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'CONFIRMED' then
        perform private.notify(new.guest_id, 'booking', 'Rent paid',
          coalesce(listing_title, 'Your new home') || ': the move-in total is paid and recorded to the kobo.',
          case when charge.inspection_id is null then '/bookings' else '/rent/pay/' || charge.inspection_id end);
        perform private.notify(host_user, 'booking', 'Rent received',
          tenant_name || ' has paid the move-in total for ' || coalesce(listing_title, 'your listing') || '.',
          '/agent/earnings');
      elsif new.status = 'CANCELLED' then
        perform private.notify(new.guest_id, 'booking', 'Rent payment step closed',
          coalesce(listing_title, 'Your listing') || ': the payment step closed unpaid. Open it again from the inspection when you are ready.',
          case when charge.inspection_id is null then '/inspections' else '/rent/pay/' || charge.inspection_id end);
      end if;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' and instant then
    -- D73: booked at the published price; the guest is told on the CONFIRMED
    -- step below, so only the host is told here.
    perform private.notify(host_user, 'booking', 'New booking',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon')
        || ', booked at your published price. The guest is paying now.',
      case when new.listing_id is null then '/host/bookings' else '/agent/bookings' end);
  elsif tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      case when new.listing_id is null then '/host/bookings' else '/agent/bookings' end);
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(listing_title, 'this stay') || ' is with the host.',
      guest_href);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' and instant then
      perform private.notify(new.guest_id, 'booking', 'Pay to keep your booking',
        coalesce(listing_title, 'Your stay') || ' for ' || to_char(new.check_in, 'DD Mon')
          || ' is held for 30 minutes while you pay.',
        '/checkout/' || new.id);
    elsif new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(listing_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        guest_href);
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'Your stay') || ' has been cancelled.',
        guest_href);
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        case when new.listing_id is null then '/host/bookings' else '/agent/bookings' end);
    elsif new.status = 'COMPLETED' then
      perform private.notify(new.guest_id, 'booking', 'Stay complete',
        coalesce(listing_title, 'Your stay') || ' is recorded as complete. Thank you for staying.',
        guest_href);
    end if;
  end if;
  return new;
end;
$function$;

-- 5. The sweep: an unpaid instant booking gives its nights back quickly. ------
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
    -- D73: an instant booking (approved by the system at the published price)
    -- is held for private.instant_pay_window(), or up to 2 hours while a
    -- payment is in flight. Every other stay takes the unchanged rules below.
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
    -- A payment in flight spares the stay, but never past 26 hours from the
    -- moment it became payable (ESC-14).
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
