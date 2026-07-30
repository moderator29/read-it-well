-- Releasing a stale booking hold must release its calendar nights too.
--
-- NOT APPLIED. This file lives in supabase/migrations_pending on purpose: the
-- lead applies migrations. Move it into supabase/migrations with a timestamp
-- prefix when applying.
--
-- WHY THIS IS NOW A BUG WITHOUT THIS CHANGE. Until this round, availability
-- rows were only written when a booking was confirmed, so a PENDING hold left
-- no calendar trace and cancelling it needed no cleanup. Reserve now closes the
-- nights immediately (lib/bookings/actions.ts), because otherwise two guests see
-- the same open calendar and the second one only meets the database refusal
-- after filling in the whole form. That fix gives the auto-release job a new
-- responsibility: private.release_stale_booking_holds cancels the booking, and
-- if it does not also delete the nights it wrote, an abandoned request locks
-- that calendar as `booked` for ever, with no active booking behind it. The
-- guest-facing cancel path already deletes its nights; this brings the
-- scheduled path in line.
--
-- Only rows this platform marked `booked` are removed, so a night an agent
-- closed by hand stays closed. Nights half-open [check_in, check_out), matching
-- the booking range exactly, so one guest's checkout day is never released out
-- from under the next guest's check-in.

create or replace function private.release_stale_booking_holds()
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
    select id, listing_id, check_in, check_out
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

      -- The nights this hold closed at reserve go back on the calendar, in the
      -- same transaction as the cancellation, so the two can never disagree.
      delete from public.availability
       where listing_id = b.listing_id
         and status = 'booked'
         and date >= b.check_in
         and date <  b.check_out;
    end if;
  end loop;

  return released;
end;
$$;

comment on function private.release_stale_booking_holds() is
  'Cancels PENDING bookings older than 48 hours and releases the calendar nights they held, so abandoned requests cannot lock inventory.';

revoke execute on function private.release_stale_booking_holds() from public, anon, authenticated;
