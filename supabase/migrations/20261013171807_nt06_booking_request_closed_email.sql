-- Applied 13 October 2026. NOTIFICATIONS 6. Needs nt01 (not required, but apply in
-- order). Apply BEFORE the app of track/notifications is deployed: the new
-- template (booking.request_closed) is built there, and the drain discards a row
-- whose template the running code does not know.
--
-- GAP: a guest whose booking REQUEST the host declines (or that lapses, or that
-- staff close) is told in the app and by push (declineBooking writes the host's
-- reason; private.notify_booking_change writes "Booking cancelled") and by NO
-- email at all. Everything else about a stay request has an email (requested,
-- confirmed, cancelled by the guest, refunded); the one answer the guest is
-- most likely to be waiting for by email, a "no", had none.
--
-- WHAT THIS ADDS: a trigger on public.bookings. When a booking moves from
-- PENDING to CANCELLED and the person making the change is NOT the guest, the
-- guest gets one email (booking.request_closed). The guest cancelling their own
-- request is excluded: that path sends bookingCancelled directly from the
-- server action, so a second email would be a duplicate. A tenancy (rent)
-- charge is excluded too (its own in-app words, "Rent payment step closed"),
-- and so is a booking that was ever paid (the refund emails own that).
--
-- The email carries no reason: the host's own words are written to the app a
-- moment after this status change, so the email opens the booking, where they
-- are. It answers to the Bookings switch (the template's channel). One per
-- booking, by key. The trigger swallows its own errors and never touches the
-- booking write.
--
-- Additive only, nothing is removed: one function, one trigger.
-- Probe: supabase/tests/probes-pending/nt06-booking-request-closed-email.sql
set lock_timeout = '5s';

create or replace function private.tell_booking_request_closed(
  p_booking uuid,
  p_guest uuid,
  p_place text,
  p_check_in date,
  p_check_out date
)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  return private.email_outbox_enqueue(
    p_guest, 'booking.request_closed', 'booking:' || p_booking::text || ':request_closed',
    jsonb_build_object('booking_id', p_booking, 'place', p_place, 'check_in', p_check_in, 'check_out', p_check_out)
  ) is not null;
end;
$fn$;

create or replace function private.notify_booking_request_closed()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  place text;
begin
  begin
    if old.status::text <> 'PENDING' or new.status::text <> 'CANCELLED' then
      return new;
    end if;
    /* The guest closed it themselves: bookingCancelled is sent by the action. */
    if (select auth.uid()) is not distinct from new.guest_id then
      return new;
    end if;
    if exists (select 1 from public.rent_payments rp where rp.booking_id = new.id)
       or exists (select 1 from public.transactions t where t.booking_id = new.id and t.status::text = 'SUCCESSFUL') then
      return new;
    end if;
    place := coalesce(
      (select l.title from public.listings l where l.id = new.listing_id),
      (select ac.name || coalesce(', ' || rt.name, '')
         from public.accommodations ac
         left join public.room_types rt on rt.id = new.room_type_id
        where ac.id = new.accommodation_id),
      'your request');
    perform private.tell_booking_request_closed(new.id, new.guest_id, place, new.check_in, new.check_out);
  exception when others then
    raise warning '[notify] request closed email failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger bookings_zz_notify_request_closed
  after update of status on public.bookings
  for each row execute function private.notify_booking_request_closed();

revoke all on function
  private.tell_booking_request_closed(uuid, uuid, text, date, date),
  private.notify_booking_request_closed()
  from public, anon, authenticated, service_role;
