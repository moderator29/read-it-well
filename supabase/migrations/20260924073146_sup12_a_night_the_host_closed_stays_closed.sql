-- SUP-12: a night the host closed stays closed.
--
-- A booking cannot be made over a closed night: private.price_booking_from_listing
-- refuses one at insert (ESC-02/ESC-03), and bookings_no_overlap refuses two
-- live stays on one night. What was left is the overwrite. Every writer that
-- marks a stay's nights (settle_booking_charge, pay_booking_from_wallet and
-- lib/bookings/settlement.ts writeBookedNights) upserts with
-- `on conflict do update set status = 'booked'`. A night the host closed
-- after a stay was requested became 'booked', and when that stay was
-- cancelled the release, which deletes only 'booked' rows, opened it again:
-- the host's closure was lost without anyone choosing that.
--
-- One trigger holds that for every writer, present and future: an update from
-- 'unavailable' to 'booked' leaves the row 'unavailable'. The host can still
-- reopen the night themselves (unavailable to available is untouched). A live
-- stay over a closed night then shows as a missing_night in
-- private.inventory_drift, which is the conflict staff should see.

create or replace function private.availability_keeps_a_closed_night()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'unavailable' and new.status = 'booked' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

revoke all on function private.availability_keeps_a_closed_night() from public;

drop trigger if exists availability_keeps_a_closed_night on public.availability;
create trigger availability_keeps_a_closed_night
  before update of status on public.availability
  for each row execute function private.availability_keeps_a_closed_night();
