-- A reservation is the venue's to answer, and a guest's to call off while
-- the table is still ahead.
--
-- A guest could create a reservation already CONFIRMED and confirm their own
-- table (and edit any column) through reservations_update_own over a
-- table-wide UPDATE grant.
--
-- private.guard_reservation_write, for a signed-in or anonymous API caller
-- who is not staff:
--   INSERT: the row starts PENDING and unanswered, created now, with no
--     thread yet (the app attaches it once the thread exists).
--   UPDATE: who the row is for, where and when, and how many never change. A
--     thread is attached once, and only the reservation's own thread.
--     The guest is whoever booked, even at their own venue or a colleague's.
--     The venue (the business owner, or the listing's own agent, the same
--       test as the RLS policies) moves PENDING -> CONFIRMED or CANCELLED,
--       CONFIRMED -> CANCELLED, and CONFIRMED -> COMPLETED or NO_SHOW once
--       the reserved time has passed. The guest's note is theirs.
--     The guest cancels a PENDING request at any time and a CONFIRMED table
--       while it is still ahead, may edit their note, and stamps
--       responded_at only with their cancellation.
-- The service role and staff pass. A NO_SHOW now tells the guest, as
-- CONFIRMED and CANCELLED already did. The five reservation policies read
-- auth.uid() once per statement instead of once per row.

create or replace function private.guard_reservation_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  is_host boolean;
begin
  if coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.has_role(me, 'admin'::public.app_role) or private.has_role(me, 'super_admin'::public.app_role) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'PENDING'::public.booking_status then
      raise exception 'reservation_starts_pending: a new reservation waits for the venue'
        using errcode = '42501';
    end if;
    new.responded_at := null;
    new.created_at := now();
    new.conversation_id := null;
    return new;
  end if;

  if new.guest_id is distinct from old.guest_id
     or new.business_id is distinct from old.business_id
     or new.listing_id is distinct from old.listing_id
     or new.party_size is distinct from old.party_size
     or new.reserved_for is distinct from old.reserved_for
     or new.created_at is distinct from old.created_at then
    raise exception 'reservation_fixed: who, where, when and how many do not change; make a new reservation'
      using errcode = '42501';
  end if;
  if new.conversation_id is distinct from old.conversation_id then
    if old.conversation_id is not null
       or not exists (select 1 from public.conversations c
                       where c.id = new.conversation_id and c.reservation_id = old.id) then
      raise exception 'reservation_conversation: a reservation carries its own thread, attached once'
        using errcode = '42501';
    end if;
  end if;

  is_host := old.guest_id is distinct from me
             and ((old.business_id is not null and private.owns_business(old.business_id))
                  or (old.listing_id is not null and exists (
                        select 1 from public.listings l
                         where l.id = old.listing_id and private.listing_agent_is_me(l.agent_id))));

  if is_host then
    if new.note is distinct from old.note then
      raise exception 'reservation_note_is_the_guests: the venue answers in the thread'
        using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not ((old.status = 'PENDING' and new.status in ('CONFIRMED', 'CANCELLED'))
                or (old.status = 'CONFIRMED' and new.status = 'CANCELLED')
                or (old.status = 'CONFIRMED' and new.status in ('COMPLETED', 'NO_SHOW')
                    and old.reserved_for <= now())) then
      raise exception 'reservation_transition: the venue cannot move this reservation from % to % now', old.status, new.status
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and not ((old.status = 'PENDING' and new.status = 'CANCELLED')
              or (old.status = 'CONFIRMED' and new.status = 'CANCELLED' and old.reserved_for > now())) then
    raise exception 'reservation_is_the_venues_to_answer: a guest can cancel a request, or a confirmed table that is still ahead'
      using errcode = '42501';
  end if;
  if new.responded_at is distinct from old.responded_at
     and not (new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED') then
    raise exception 'reservation_answer_is_the_venues: only the venue answers a request'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reservation_write() from public, anon;
grant execute on function private.guard_reservation_write() to authenticated, service_role;

drop trigger if exists reservations_00_guard_write on public.reservations;
create trigger reservations_00_guard_write
  before insert or update on public.reservations
  for each row execute function private.guard_reservation_write();

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
    elsif new.status = 'NO_SHOW' then
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

alter policy reservations_insert_own on public.reservations
  with check (guest_id = (select auth.uid()));
alter policy reservations_select_own on public.reservations
  using (guest_id = (select auth.uid()));
alter policy reservations_update_own on public.reservations
  using (guest_id = (select auth.uid()))
  with check (guest_id = (select auth.uid()));
alter policy reservations_select_host on public.reservations
  using (exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                  where l.id = reservations.listing_id and a.user_id = (select auth.uid())));
alter policy reservations_update_host on public.reservations
  using (exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                  where l.id = reservations.listing_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                       where l.id = reservations.listing_id and a.user_id = (select auth.uid())));
