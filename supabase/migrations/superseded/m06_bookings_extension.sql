-- M6 of the two-side platform: the bookings extension. DRAFT. NOT APPLIED.
--
-- THIS FILE WAITS FOR THE FOUNDER'S WORD. It contains the one non-additive
-- change in the whole two-side v1: relaxing public.bookings.listing_id from
-- NOT NULL to NULL (TWO_MODE_BACKEND_RESEARCH 5.4). Everything else here is
-- additive, but it is all written in the same file because the CHECK that
-- makes the relaxation safe only makes sense beside it. When the word comes,
-- move this file into supabase/migrations/ with a timestamp, apply it with the
-- same name, and probe bookings_no_overlap immediately after.
--
-- WHY EXTEND bookings AND NOT ADD stay_bookings. Ledger, pay_booking_from_wallet,
-- transactions, booking_refunds, reviews, notifications and
-- booking_state_events all point at bookings. Two booking spines are two
-- money paths that can disagree, which this platform has already been burned
-- by once. One table, one money path, one state machine.
--
-- WHAT THIS ADDS.
--   1. accommodation_id, room_type_id, rate_plan_id (nullable FKs, indexed)
--      and rooms (smallint, default 1, > 0).
--   2. listing_id relaxed to NULL, and a CHECK that a booking targets exactly
--      one spine: listing_id, or (accommodation_id AND room_type_id).
--   3. The GiST exclusion bookings_no_overlap keeps its scope and gains
--      `AND listing_id IS NOT NULL`, so room bookings (which legitimately
--      overlap across units) never trip it and whole-place bookings keep
--      every guarantee they have today.
--   4. bookings_guard_transition: legal edges only. PENDING to CONFIRMED or
--      CANCELLED; CONFIRMED to COMPLETED, NO_SHOW or CANCELLED; terminals
--      immutable. Modelled on private.escrow_guard_transition.
--   5. booking_state_events written BY TRIGGER on insert and on every status
--      change, like escrow's audit insert. NOTE FOR BE2: four places in the
--      application write booking_state_events today (bookings-actions.ts and
--      friends). When this lands they must stop, or history doubles.
--   6. Room bookings hold and release inventory BY TRIGGER: a PENDING insert
--      with a room_type_id calls private.reserve_room_nights, a move to
--      CANCELLED (or NO_SHOW) calls release. The rule lives in the database
--      so no future writer can forget it. Overselling is therefore refused at
--      INSERT, inside the same transaction, by M5's counted UPDATE.
--   7. The demo-refusal trigger on bookings also fires on accommodation_id
--      (the function already reads both columns since M3).
--   8. notify_booking_change and is_booking_host taught the accommodation
--      spine: the title comes from accommodations.name and the host from
--      businesses.owner_id when listing_id is null.
--
-- PROBE AFTER APPLYING (rolled-back DO block, the BE1 method):
--   a. a whole-place booking still trips bookings_no_overlap on an overlap;
--   b. two room bookings on the same room type and dates both insert when
--      inventory allows, and the third is refused by reserve_room_nights;
--   c. PENDING to COMPLETED is refused; CONFIRMED to CANCELLED releases;
--   d. booking_state_events gains exactly one row per insert and transition;
--   e. a booking with both listing_id and room_type_id is refused by the CHECK.

begin;

/* ------------------------------------------------------------ 1. columns */

alter table public.bookings
  add column if not exists accommodation_id uuid references public.accommodations (id) on delete restrict,
  add column if not exists room_type_id     uuid references public.room_types (id) on delete restrict,
  add column if not exists rate_plan_id     uuid references public.rate_plans (id) on delete set null,
  add column if not exists rooms            smallint not null default 1 check (rooms > 0);

create index if not exists bookings_accommodation_idx on public.bookings (accommodation_id);
create index if not exists bookings_room_type_dates_idx on public.bookings (room_type_id, check_in, check_out) where status in ('PENDING', 'CONFIRMED');
create index if not exists bookings_rate_plan_idx on public.bookings (rate_plan_id);

/* --------------------------------------- 2. the relaxation and the CHECK

   FOUNDER-GATED. Every existing row keeps its listing_id; no data changes.
   -------------------------------------------------------------------------- */

alter table public.bookings alter column listing_id drop not null;

alter table public.bookings drop constraint if exists bookings_one_spine_chk;
alter table public.bookings
  add constraint bookings_one_spine_chk
  check (
    (listing_id is not null and accommodation_id is null and room_type_id is null and rate_plan_id is null)
    or
    (listing_id is null and accommodation_id is not null and room_type_id is not null)
  );

/* --------------------------------------------- 3. the exclusion's scope */

alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (listing_id with =, during with &&)
  where (status in ('PENDING', 'CONFIRMED') and listing_id is not null);

/* -------------------------------------------- 4. the transition guard */

create or replace function private.booking_transition_is_legal(from_state public.booking_status, to_state public.booking_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when from_state = 'PENDING'   then to_state in ('CONFIRMED', 'CANCELLED')
    when from_state = 'CONFIRMED' then to_state in ('COMPLETED', 'NO_SHOW', 'CANCELLED')
    else false
  end;
$$;

create or replace function private.bookings_guard_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not private.booking_transition_is_legal(old.status, new.status) then
    raise exception 'A booking cannot go from % to %.', old.status, new.status
      using errcode = 'check_violation';
  end if;
  -- The spine is fixed at birth.
  if new.listing_id is distinct from old.listing_id
     or new.accommodation_id is distinct from old.accommodation_id
     or new.room_type_id is distinct from old.room_type_id then
    raise exception 'A booking cannot change what it is for.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_guard_transition on public.bookings;
create trigger bookings_guard_transition
  before update on public.bookings
  for each row execute function private.bookings_guard_transition();

/* ---------------------------------------- 5. trigger-written history */

create or replace function private.bookings_record_state_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_state_events (booking_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.booking_state_events (booking_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_record_state_event on public.bookings;
create trigger bookings_record_state_event
  after insert or update of status on public.bookings
  for each row execute function private.bookings_record_state_event();

/* ------------------------------------ 6. inventory held by the booking */

create or replace function private.bookings_hold_and_release_rooms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.room_type_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status in ('PENDING', 'CONFIRMED') then
      perform private.reserve_room_nights(new.room_type_id, new.check_in, new.check_out, new.rooms, new.rate_plan_id);
    end if;
  elsif old.status in ('PENDING', 'CONFIRMED') and new.status in ('CANCELLED', 'NO_SHOW') then
    perform private.release_room_nights(new.room_type_id, new.check_in, new.check_out, new.rooms);
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_hold_and_release_rooms on public.bookings;
create trigger bookings_hold_and_release_rooms
  after insert or update of status on public.bookings
  for each row execute function private.bookings_hold_and_release_rooms();

/* ----------------------------------------------- 7. the demo refusal */

drop trigger if exists bookings_never_against_a_demo_listing on public.bookings;
create trigger bookings_never_against_a_demo_listing
  before insert or update of listing_id, accommodation_id on public.bookings
  for each row execute function public.refuse_transaction_on_demo_listing();

/* -------------------------------------------- 8. host and notification */

create or replace function private.is_booking_host(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.bookings b
    left join public.listings l on l.id = b.listing_id
    left join public.agents   a on a.id = l.agent_id
    left join public.accommodations ac on ac.id = b.accommodation_id
    left join public.businesses bu on bu.id = ac.business_id
    where b.id = target_booking_id
      and (a.user_id = auth.uid() or bu.owner_id = auth.uid())
  );
$function$;

create or replace function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  host_user  uuid;
  stay_title text;
  host_href  text := '/agent/bookings';
begin
  if new.listing_id is not null then
    select a.user_id, l.title into host_user, stay_title
    from public.listings l
    join public.agents   a on a.id = l.agent_id
    where l.id = new.listing_id;
  else
    select bu.owner_id, ac.name into host_user, stay_title
    from public.accommodations ac
    join public.businesses bu on bu.id = ac.business_id
    where ac.id = new.accommodation_id;
    host_href := '/host/bookings';
  end if;

  if tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(stay_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      host_href);
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(stay_title, 'this stay') || ' is with the host.',
      '/bookings');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(stay_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        '/bookings');
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(stay_title, 'Your stay') || ' has been cancelled.',
        '/bookings');
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(stay_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        host_href);
    elsif new.status = 'COMPLETED' then
      perform private.notify(new.guest_id, 'booking', 'Stay complete',
        coalesce(stay_title, 'Your stay') || ' is recorded as complete. Thank you for staying.',
        '/bookings');
    end if;
  end if;

  return new;
end;
$function$;

/* --------------------------------- 9. RLS for the accommodation spine

   Existing policies: guest insert (own, PENDING), guest select, host select
   via listings JOIN agents, admin ALL. The host policies need the business
   owner too; is_booking_host already answers both spines after step 8.
   -------------------------------------------------------------------------- */

create policy bookings_select_business_host
  on public.bookings for select
  using (accommodation_id is not null and private.owns_accommodation(accommodation_id));

create policy bookings_update_business_host
  on public.bookings for update
  using (accommodation_id is not null and private.owns_accommodation(accommodation_id))
  with check (accommodation_id is not null and private.owns_accommodation(accommodation_id));

commit;
