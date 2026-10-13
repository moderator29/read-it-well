-- PENDING, NOT APPLIED. A restaurant's own sitting length, how long it holds a
-- late table, and how much notice it asks for a cancellation.
--
-- WHAT IT CHANGES. Three nullable columns on public.restaurant_profiles, each
-- with a CHECK on the values the wizard offers. Nothing else: no grant or
-- policy changes (the owner already writes the row through
-- `restaurant_profiles` owner RLS, and the public already reads it).
--
--   sitting_minutes      how long a table is the party's: 60, 90, 120 or 180.
--   hold_minutes         how long a confirmed table is held for a late party
--                        before it may be given away: 10, 15, 20 or 30.
--   cancel_notice_hours  how long ahead the restaurant asks a guest to cancel:
--                        1, 2, 4 or 24.
--
-- These are the restaurant's stated house rules, shown to the guest before
-- they ask for a table. A table is free to request, is confirmed by the
-- restaurant when one is free, and the bill is paid at the restaurant: none of
-- these columns charges anybody anything. A table's outcome after its time is
-- recorded on the reservation itself, as COMPLETED (seated) or NO_SHOW, which
-- `private.guard_reservation_write` already allows the venue to set once the
-- time has passed.
--
-- The app writes these in their own update and reads the row with `select *`,
-- so it runs before this is applied (the three answers are then not kept, and
-- the wizard says so) and after.

alter table public.restaurant_profiles
  add column if not exists sitting_minutes smallint
    check (sitting_minutes is null or sitting_minutes in (60, 90, 120, 180)),
  add column if not exists hold_minutes smallint
    check (hold_minutes is null or hold_minutes in (10, 15, 20, 30)),
  add column if not exists cancel_notice_hours smallint
    check (cancel_notice_hours is null or cancel_notice_hours in (1, 2, 4, 24));

comment on column public.restaurant_profiles.sitting_minutes is
  'How long a table is the party''s, in minutes, as the restaurant set it in the wizard.';
comment on column public.restaurant_profiles.hold_minutes is
  'How long a confirmed table is held for a late party before it may be given away, in minutes.';
comment on column public.restaurant_profiles.cancel_notice_hours is
  'How many hours ahead the restaurant asks a guest to cancel a table. A request, not a charge: tables are never prepaid.';
