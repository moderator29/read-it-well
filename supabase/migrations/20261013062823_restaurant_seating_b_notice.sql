-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

CREATE OR REPLACE FUNCTION private.notify_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  host_user uuid;
  venue     text;
  guest     text;
  party     text;
  at_local  text;
  host_href text := '/agent/bookings';
begin
  if new.listing_id is not null then
    select a.user_id, l.title
      into host_user, venue
    from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = new.listing_id;
  else
    select b.owner_id, b.name
      into host_user, venue
    from public.businesses b
    where b.id = new.business_id;
    host_href := '/host/reservations';
  end if;

  /* Rendered in Lagos, never in the server's zone, so the hour in the
     notification is the hour the kitchen will serve it. */
  at_local := to_char(new.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI');
  party := new.party_size || case when new.party_size = 1 then ' guest' else ' guests' end;
  guest := coalesce(
    (select p.display_name from public.profiles p where p.id = new.guest_id),
    'A guest'
  );

  if tg_op = 'INSERT' then
    perform private.notify(
      host_user,
      'booking',
      'Table requested at ' || coalesce(venue, 'your restaurant'),
      guest || ' asked for ' || party || ' on ' || at_local || '. Nothing is held until you accept.',
      host_href
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is confirmed',
        coalesce(venue, 'The restaurant') || ' is expecting ' || party || ' on ' || at_local || '.',
        '/bookings'
      );
    elsif new.status = 'CANCELLED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is not going ahead',
        coalesce(venue, 'The restaurant') || ' on ' || at_local || ' is cancelled. Message them if you want to try another time.',
        '/bookings'
      );
    elsif new.status = 'NO_SHOW'
          and coalesce(current_setting('vallo.seating_by', true), '') <> 'diner' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Marked as not arriving',
        coalesce(venue, 'The restaurant') || ' recorded that nobody arrived for the table on ' || at_local
          || '. If you were there, reply in the thread and they can put it right.',
        '/bookings'
      );
    end if;
  end if;

  return new;
end;
$function$;
