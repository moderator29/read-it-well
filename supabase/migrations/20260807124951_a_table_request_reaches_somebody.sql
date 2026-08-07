-- A reservation that nobody is told about is a reservation that does not exist.
--
-- The loop was complete except for this: a guest asked, the row landed PENDING,
-- and the restaurant found out only if they happened to open the console. The
-- notification triggers on this platform are all written against public.bookings
-- and none of them knows this table is here.
--
-- Both directions are covered, because both are somebody waiting on somebody
-- else. The restaurant learns a request arrived; the guest learns what was
-- decided. Neither is told anything the other's own screen would not already
-- show them.
--
-- Routed through private.notify rather than inserting into public.notifications
-- directly, and that matters: notify reads the recipient's own preferences and
-- stays silent when they have switched this kind off. Writing the row here would
-- bypass a choice somebody made in settings, which is the sort of thing that
-- teaches people to distrust a notification centre.
--
-- The kind is 'booking' rather than a new enum value. A table booked and a stay
-- booked are the same promise to the person waiting on it, they belong under the
-- same preference toggle, and a new value would have to be added to that toggle,
-- to the filter and to four locale files to say a thing the existing one already
-- says correctly.

create or replace function private.notify_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  host_user uuid;
  venue     text;
  guest     text;
  party     text;
  at_local  text;
begin
  select a.user_id, l.title
    into host_user, venue
  from public.listings l
  join public.agents a on a.id = l.agent_id
  where l.id = new.listing_id;

  /* Rendered in Lagos, never in the server's zone, so the hour in the
     notification is the hour the kitchen will serve it. This is the same
     pinning the board and the guest form both do, and a notification that
     disagreed with the screen it links to would be worse than none. */
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
      '/agent/bookings'
    );
    return new;
  end if;

  -- Only a decision is worth telling the guest about. Any other update to the
  -- row, including one that changes nothing, stays silent.
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
      /* Deliberately does not say who cancelled. The guest cancelling their own
         table would otherwise be told that they cancelled it, and the host
         declining reads the same from the guest's side: the table is not
         happening, and the next step is the same either way. */
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is not going ahead',
        coalesce(venue, 'The restaurant') || ' on ' || at_local || ' is cancelled. Message them if you want to try another time.',
        '/bookings'
      );
    end if;
  end if;

  return new;
end;
$$;

/* AFTER, not BEFORE. A notification about a row that then fails to commit is a
   message about something that never happened, and the validation trigger on
   this table can still refuse the write. */
drop trigger if exists reservations_notify on public.reservations;
create trigger reservations_notify
  after insert or update on public.reservations
  for each row execute function private.notify_reservation();
