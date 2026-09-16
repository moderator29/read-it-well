-- The notifier knew two transitions and now there are four. It used if/elsif with
-- no else, so the new states were silently unannounced rather than broken, which
-- is the kind of gap that survives a release.
--
-- COMPLETED tells the guest, because it is the moment a stay becomes a thing they
-- can be asked about. NO_SHOW tells nobody new: the agent recorded it and it
-- already shows on both sides' booking rows, and a push notification telling
-- somebody they failed to turn up is an accusation, not an update.
create or replace function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  host_user     uuid;
  listing_title text;
begin
  select a.user_id, l.title into host_user, listing_title
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;

  if tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      '/agent/bookings');
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(listing_title, 'this stay') || ' is with the host.',
      '/bookings');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(listing_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        '/bookings');
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'Your stay') || ' has been cancelled.',
        '/bookings');
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        '/agent/bookings');
    elsif new.status = 'COMPLETED' then
      perform private.notify(new.guest_id, 'booking', 'Stay complete',
        coalesce(listing_title, 'Your stay') || ' is recorded as complete. Thank you for staying.',
        '/bookings');
    end if;
  end if;

  return new;
end;
$function$;
