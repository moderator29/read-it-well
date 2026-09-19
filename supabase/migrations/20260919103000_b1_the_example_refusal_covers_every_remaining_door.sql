-- B1 of the third-edition build: the example refusal, finished on the doors
-- the earlier passes left open.
--
-- Additive throughout. Nothing is dropped, nothing is revoked, no column
-- loses a value, no row is deleted. Two functions are replaced in place with
-- `create or replace` and each replacement only WIDENS a refusal; one trigger
-- is created, dropped by name first so the file replays.
--
-- WHAT WAS ALREADY CLOSED, VERIFIED AGAINST THE LIVE PROJECT BEFORE WRITING
-- THIS. `public.refuse_transaction_on_demo_listing` sits on five tables:
-- `bookings`, `reviews`, `inspection_requests`, `inspection_confirmations`
-- (all four from 20260809080630) and `reservations` and `rent_payments`
-- (20260918140000). `private.reservation_is_valid` refuses an example
-- business on the M7 spine. So a booking, an inspection, a review, a table or
-- a tenancy charge against an example LISTING is refused by the database on
-- every door that exists today, service role included, and the application
-- cannot forget the rule because it never had to call it. This migration does
-- not re-close any of that.
--
-- ONE. THE REVERSE DIRECTION, FOR A BUSINESS. `listings` has carried
-- `listings_demo_flag_needs_a_clean_history` since 20260809080630: a listing
-- with a commitment against it cannot afterwards be declared an example,
-- because that strands a real booking against a property the platform has
-- just called imaginary. M2 gave businesses their own `is_demo` and M7 gave
-- them reservations, and nothing carried the reverse rule across: a
-- first-party restaurant holding live tables could be flipped to
-- `is_demo = true`, and `businesses_fan_out_source` would then push that flag
-- down to its accommodations and, through M4, to their room types. Guests
-- would be sitting on a booking at a venue the catalogue had begun labelling
-- an example. This file gives businesses the same guard listings have.
--
-- Accommodations deliberately get no such trigger: nothing in the live schema
-- points a commitment at an accommodation yet (`bookings.listing_id` is still
-- NOT NULL; M6 is drafted in `supabase/migrations/pending/`), so a guard
-- there would be a rule with nothing to guard. It belongs in M6, beside the
-- column that first makes it possible.
--
-- TWO. TWO COMMITMENTS THE LISTING GUARD DID NOT COUNT.
-- `refuse_demo_flag_on_committed_listing` looks for bookings, reviews,
-- inspections and (since b3) reservations. It never looked at
-- `inspection_confirmations`, which is the row written when somebody records
-- inside a thread that they HAVE ALREADY VIEWED the property, and which can
-- exist with no `inspection_requests` row behind it because the confirmation
-- is taken from the conversation rather than from a scheduled request. It
-- never looked at `rent_payments` either; that one is covered transitively
-- through its booking, and is listed here anyway for the same reason reviews
-- were listed twice in 20260809080630: this is the one rule the whole
-- exercise exists to keep, and it should not rest on a foreign key somebody
-- could later make nullable.
--
-- THE PROBE. One block, rolled back, so nothing persists and no row is left
-- on a live product table. It builds its own fixtures from two existing
-- `auth.users` rows, asserts each refusal and each control, and raises
-- 'ALL PASS' at the end. Run it AFTER applying this file; before applying it,
-- assertions 1 and 3 fail, which is the hole this file closes.
--
--   begin;
--   do $probe$
--   declare
--     u_owner uuid;
--     u_guest uuid;
--     b_id    uuid;
--     b_clean uuid;
--     a_id    uuid;
--     l_id    uuid;
--     c_id    uuid;
--     d       date;
--     slot    timestamptz;
--     caught  text;
--   begin
--     select id into u_owner from auth.users order by created_at limit 1;
--     select id into u_guest from auth.users where id <> u_owner order by created_at limit 1;
--     if u_guest is null then
--       raise exception 'this probe needs two auth.users rows';
--     end if;
--
--     -- A real first-party restaurant with a real table held at it.
--     insert into public.businesses (kind, name, slug, owner_id, status, source, is_demo)
--     values ('restaurant', 'Probe Kitchen', 'probe-kitchen-' || gen_random_uuid(),
--             u_owner, 'PUBLISHED', 'first_party', false)
--     returning id into b_id;
--
--     d    := (now() at time zone 'Africa/Lagos')::date + 1;
--     slot := (d + time '19:00') at time zone 'Africa/Lagos';
--
--     insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
--     values (b_id, extract(dow from d)::smallint, '18:00', '21:00', '23:00', 50);
--
--     insert into public.reservations (business_id, guest_id, party_size, reserved_for)
--     values (b_id, u_guest, 2, slot);
--
--     -- 1. THE HOLE THIS FILE CLOSES. A venue holding a table cannot be
--     --    turned into an example.
--     begin
--       update public.businesses set is_demo = true where id = b_id;
--       raise exception 'FAIL 1: a business with a live reservation was made an example';
--     exception when check_violation then
--       get stacked diagnostics caught = message_text;
--       if caught not like '%reservations%' then
--         raise exception 'FAIL 1: refused, but not for the reservation: %', caught;
--       end if;
--     end;
--
--     -- 2. THE CONTROL. A venue nobody has committed to still flips.
--     insert into public.businesses (kind, name, slug, owner_id, status, source, is_demo)
--     values ('restaurant', 'Probe Empty', 'probe-empty-' || gen_random_uuid(),
--             u_owner, 'PUBLISHED', 'first_party', false)
--     returning id into b_clean;
--     update public.businesses set is_demo = true where id = b_clean;
--     if not (select is_demo from public.businesses where id = b_clean) then
--       raise exception 'FAIL 2: a clean business was refused';
--     end if;
--
--     -- 3. THE SECOND HOLE. A listing somebody has recorded as inspected
--     --    cannot be turned into an example either.
--     insert into public.agents (user_id, display_name) values (u_owner, 'Probe Agent')
--     on conflict (user_id) do update set display_name = excluded.display_name
--     returning id into a_id;
--     insert into public.listings (agent_id, title, property_type, is_demo)
--     values (a_id, 'Probe Listing', 'apartment', false) returning id into l_id;
--     insert into public.conversations (guest_id, agent_id, listing_id)
--     values (u_guest, u_owner, l_id) returning id into c_id;
--     insert into public.inspection_confirmations (conversation_id, user_id, listing_id)
--     values (c_id, u_guest, l_id);
--     begin
--       update public.listings set is_demo = true where id = l_id;
--       raise exception 'FAIL 3: a listing recorded as inspected was made an example';
--     exception when check_violation then
--       null;
--     end;
--
--     -- 4. THE CONTROL AGAIN, and the proof that nothing else was tightened:
--     --    a listing with no commitment at all still flips.
--     insert into public.listings (agent_id, title, property_type, is_demo)
--     values (a_id, 'Probe Listing Two', 'apartment', false) returning id into l_id;
--     update public.listings set is_demo = true where id = l_id;
--     if not (select is_demo from public.listings where id = l_id) then
--       raise exception 'FAIL 4: a clean listing was refused';
--     end if;
--
--     -- 5. THE DOORS THAT WERE ALREADY SHUT, re-proved on the way past: a
--     --    table at an example listing is still refused by the b3 trigger.
--     begin
--       insert into public.reservations (listing_id, guest_id, party_size, reserved_for)
--       select id, u_guest, 2, slot from public.listings where is_demo limit 1;
--       raise exception 'FAIL 5: a table was held at an example listing';
--     exception when check_violation then
--       null;
--     end;
--
--     raise notice 'ALL PASS';
--   end
--   $probe$;
--   rollback;
--
-- Nothing in this file has been run against the live project by its author,
-- who holds no write credentials. The lead applies it and runs the probe.

/* ------------------------- one: a venue with a table is not an example */

create or replace function public.refuse_demo_flag_on_committed_business()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_demo is not true or old.is_demo is true then
    return new;
  end if;

  if exists (select 1 from public.reservations r where r.business_id = new.id) then
    raise exception
      'Business % has real reservations against it and cannot be marked as an example.', new.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.refuse_demo_flag_on_committed_business() is
  'The businesses twin of refuse_demo_flag_on_committed_listing: a venue '
  'somebody is holding a table at is never turned into an example, because '
  'is_demo fans out to its accommodations and room types and would leave a '
  'real guest booked at a venue the catalogue calls imaginary.';

drop trigger if exists businesses_demo_flag_needs_a_clean_history on public.businesses;
create trigger businesses_demo_flag_needs_a_clean_history
  before update of is_demo on public.businesses
  for each row execute function public.refuse_demo_flag_on_committed_business();

/* ----------------- two: the listing guard counts every commitment */

create or replace function public.refuse_demo_flag_on_committed_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_demo is not true or old.is_demo is true then
    return new;
  end if;

  if exists (select 1 from public.bookings b where b.listing_id = new.id)
     or exists (select 1 from public.reviews r where r.listing_id = new.id)
     or exists (select 1 from public.inspection_requests i where i.listing_id = new.id)
     or exists (select 1 from public.inspection_confirmations ic where ic.listing_id = new.id)
     or exists (select 1 from public.reservations rv where rv.listing_id = new.id)
     or exists (select 1 from public.rent_payments rp where rp.listing_id = new.id)
  then
    raise exception
      'Listing % has real bookings, reviews, inspections, reservations or a tenancy charge against it and cannot be marked as an example.', new.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.refuse_demo_flag_on_committed_listing() is
  'Refuses turning a listing into an example once anybody has committed to '
  'it: a booking, a review, an inspection request, a recorded inspection, a '
  'table or a tenancy charge. The mirror of '
  'refuse_transaction_on_demo_listing, which refuses the commitment when the '
  'listing is already an example.';
