-- Reverting an over-build, before anything depends on it.
--
-- The finding was that an agent could not record that a stay happened, and the
-- part of that which is genuinely a schema gap is the two enum values added in
-- 20260916193730. Those stay. What was built around them does not.
--
-- public.booking_state_events ALREADY EXISTS and is the better design: id,
-- booking_id, actor_id, from_status, to_status, note, created_at, with a select
-- policy covering guest, host and admin, an index on each foreign key, and
-- cascade delete from the booking. Four places in the application already write
-- it and two already read it. Adding confirmed_at, cancelled_at,
-- stay_recorded_at, stay_recorded_by and stay_note to public.bookings was a
-- second, worse, partial copy of the same history on the row it is history
-- about. Two sources of truth for one fact is the debt this sprint exists to
-- remove, not to add.
--
-- public.record_booking_stay goes with them, for a different reason. This
-- codebase does transitions as a server action that authorises through the
-- caller's own client and then writes through the service role, appending a
-- state event: see acceptBooking and declineBooking in
-- apps/web/src/lib/agent/bookings-actions.ts. A database RPC beside them is a
-- second door into the same state machine, and the argument of that file is
-- that the state machine has one.
--
-- private.is_listing_agent goes too: private.is_booking_host already answers
-- that question and the booking_state_events policy already uses it.
--
-- NOTHING IS LOST. public.bookings held zero rows, the five columns held zero
-- non-null values, and they were created in the same session as this revert.
drop trigger if exists bookings_stamp_transition on public.bookings;
drop function if exists private.stamp_booking_transition();
drop function if exists public.record_booking_stay(uuid, public.booking_status, text);
drop function if exists private.is_listing_agent(uuid, uuid);

drop index if exists public.bookings_stay_recorded_by_idx;
drop index if exists public.bookings_awaiting_record_idx;

alter table public.bookings drop constraint if exists bookings_stay_record_chk;
alter table public.bookings drop constraint if exists bookings_stay_actor_chk;
alter table public.bookings drop constraint if exists bookings_stay_note_len_chk;

alter table public.bookings
  drop column if exists confirmed_at,
  drop column if exists cancelled_at,
  drop column if exists stay_recorded_at,
  drop column if exists stay_recorded_by,
  drop column if exists stay_note;

-- What survives, and the only index the new states actually need: the queue an
-- agent opens, which is confirmed stays whose dates have passed. Partial on
-- status, so it stays small however large the table grows, and it needs no
-- denormalised column because a recorded stay is no longer CONFIRMED.
create index if not exists bookings_awaiting_record_idx
  on public.bookings (listing_id, check_out)
  where status = 'CONFIRMED';
