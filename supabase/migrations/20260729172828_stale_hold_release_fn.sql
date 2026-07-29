-- Releasing stale booking holds: the function, ready for its schedule.
--
-- The GiST no-double-booking constraint makes a PENDING booking a real hold
-- on inventory, which is right while confirmation is in flight and wrong when
-- a request is abandoned: the nights would stay locked forever. This function
-- cancels PENDING bookings unconfirmed for 48 hours; each status update fires
-- the existing notification trigger so the guest hears about the release.
-- Scheduling lands separately once pg_cron is enabled; until then the service
-- layer may invoke it directly.

create function private.release_stale_booking_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released integer := 0;
  b record;
begin
  for b in
    select id
    from public.bookings
    where status = 'PENDING'
      and created_at < now() - interval '48 hours'
  loop
    update public.bookings set status = 'CANCELLED'
    where id = b.id and status = 'PENDING';

    if found then
      released := released + 1;
      insert into public.booking_state_events (booking_id, from_status, to_status, note)
      values (b.id, 'PENDING', 'CANCELLED',
              'Auto-released: the request was not confirmed within 48 hours.');
    end if;
  end loop;

  return released;
end;
$$;

comment on function private.release_stale_booking_holds() is
  'Cancels PENDING bookings older than 48 hours so abandoned requests cannot lock inventory.';

revoke execute on function private.release_stale_booking_holds() from public, anon, authenticated;
