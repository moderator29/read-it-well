-- Track A: there is no wallet. A refund goes back to the card or account the
-- guest paid with, through the processor, and the notification says so.
create or replace function private.notify_booking_refund()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  listing_title text;
  night_rate    public.rate_period;
  amount_txt    text;
begin
  select l.title, l.rate_period
    into listing_title, night_rate
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  where b.id = new.booking_id;
  if new.refund_minor > 0 then
    amount_txt := 'NGN ' || to_char((new.refund_minor::numeric) / 100, 'FM999,999,999,990.00');
    perform private.notify(
      new.guest_id,
      'booking',
      'Refund on its way',
      amount_txt || ' for ' || coalesce(listing_title, 'a cancelled stay')
        || ' is going back to the card or account you paid with. Banks usually show it within 5 to 10 working days.',
      case when night_rate = 'night' then '/trips' else '/bookings' end
    );
  else
    perform private.notify(
      new.guest_id,
      'booking',
      'Cancellation recorded',
      coalesce(listing_title, 'Your stay') || ' is cancelled and the published schedule returned nothing on this one. '
        || 'If you could not get in, or the place was not what was listed, reply to support and a person will look at the booking again.',
      case when night_rate = 'night' then '/trips' else '/bookings' end
    );
  end if;
  return new;
end;
$function$;
