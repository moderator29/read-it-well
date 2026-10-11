-- D73 Part A, third piece: an agreement born approved sends no "waiting" email, and an
-- instant booking is told as a booking, not a request.
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
    if template = 'agreement.waiting' and who = (select auth.uid()) then
      continue;
    end if;
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
