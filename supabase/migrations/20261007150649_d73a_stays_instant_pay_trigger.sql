-- D73 Part A, second piece: the instant step for a fixed-price stay, behind stays_instant_pay (off).
create or replace function private.book_stay_instantly()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
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
  if api_role <> 'authenticated' or auth.uid() is distinct from new.guest_id then
    return new;
  end if;
  if coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
     or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id) then
    return new;
  end if;
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
      return new;
  end;
  return new;
end;
$function$;

revoke all on function private.book_stay_instantly() from public, anon, authenticated;

create trigger bookings_instant_when_fixed_price
  after insert on public.bookings
  for each row execute function private.book_stay_instantly();
