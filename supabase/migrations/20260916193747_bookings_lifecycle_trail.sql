-- SUPERSEDED BY 20260916194150_bookings_lifecycle_trail_revert_to_state_events.sql.
-- Kept so the folder replays to the database that is actually running. Everything
-- this file adds, the revert takes back out, and the reason is written there:
-- public.booking_state_events already held this history and held it better.
alter table public.bookings
  add column if not exists confirmed_at     timestamptz,
  add column if not exists cancelled_at     timestamptz,
  add column if not exists stay_recorded_at timestamptz,
  add column if not exists stay_recorded_by uuid references auth.users(id) on delete set null,
  add column if not exists stay_note        text;

alter table public.bookings drop constraint if exists bookings_stay_record_chk;
alter table public.bookings
  add constraint bookings_stay_record_chk
  check ((status in ('COMPLETED', 'NO_SHOW')) = (stay_recorded_at is not null));

alter table public.bookings drop constraint if exists bookings_stay_actor_chk;
alter table public.bookings
  add constraint bookings_stay_actor_chk
  check (stay_recorded_by is null or stay_recorded_at is not null);

alter table public.bookings drop constraint if exists bookings_stay_note_len_chk;
alter table public.bookings
  add constraint bookings_stay_note_len_chk
  check (stay_note is null or (length(btrim(stay_note)) between 1 and 500));

create index if not exists bookings_stay_recorded_by_idx
  on public.bookings (stay_recorded_by);

create index if not exists bookings_awaiting_record_idx
  on public.bookings (listing_id, check_out)
  where status = 'CONFIRMED' and stay_recorded_at is null;
