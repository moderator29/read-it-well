-- B4, R3 finding F-07. A stay notification lands on the Stays side.
--
-- private.notify_booking_change() writes '/bookings' as the guest href on
-- every branch. '/bookings' is a PROPERTY path: lib/side.constants.ts lists it
-- in PROPERTY_PATHS and a side-owned route forces its side whatever the
-- cookie says. So a guest who books a hotel room, gets the confirmation and
-- taps it is flipped out of the Stays shell BY THE PRODUCT'S OWN
-- NOTIFICATION. The flip between the two sides is this platform's signature
-- interaction and this made it work against the person holding the phone.
--
-- WHAT DECIDES. public.listings.rate_period, which is exactly the fact being
-- asked about: 'night' means the place is let by the night, which is a stay,
-- and the /trips shelf is where a stay belongs. A null rate_period is an
-- annual or monthly tenancy priced in rent_amount_minor, which is Property and
-- keeps '/bookings'. 'guest' is a restaurant cover, which never reaches this
-- trigger because a table is a public.reservations row and not a booking.
-- Nothing here reads property_type: a home can be let by the night and an
-- apartment can be let by the year, so the type says what the building is and
-- the rate period says which side the guest is standing on.
--
-- WHAT THIS DOES NOT TOUCH.
--   * The host lines. A host answers from /agent/bookings or /agent/earnings,
--     which are the agent console and not the guest's shelf.
--   * The tenancy branch. A rent charge is Property by definition and already
--     sends the tenant to /rent/pay/<inspection> or /bookings, both correct.
--   * Anything about what the notifications SAY. Only the href moves.
--
-- THIS REPLACES THE B3 BODY, NOT THE 20260916 ONE. R3 read
-- 20260916193831_notify_booking_change_covers_completion.sql, but
-- 20260918140000 (B3's rent charge) replaced the function afterwards and added
-- the tenancy branch. The body below is B3's, line for line, with the guest
-- href branched and the rate_period read added to the lookup, so applying this
-- after B3 loses nothing B3 added.
--
-- ADDITIVE. One CREATE OR REPLACE of a trigger function. No table, column,
-- policy, grant or row changes; the trigger itself is untouched and keeps
-- pointing at the same function.
--
-- WHEN M6 LANDS. M6 gives bookings an accommodation_id, and a room booking has
-- no listing_id at all, so `stay` must then become
-- `new.accommodation_id is not null or l.rate_period = 'night'`. That line is
-- the whole of the change and it belongs in M6's own file, because the column
-- it names does not exist until M6 is applied and this file has to be
-- appliable today.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead, through the Supabase MCP, as ONE statement batch that
-- ends in ROLLBACK. NOT RUN FROM THE SANDBOX, which holds no database
-- credentials, so nothing below has been executed by its author.
--
-- It proves four things: a nightly stay sends the guest to /trips on every one
-- of the three guest branches; an annual tenancy listing still sends them to
-- /bookings; the host lines are unmoved; and THE CROSS-USER READ FAILS, which
-- is the assertion that matters, because a notification row is a person's own
-- and a policy nobody has tried from the wrong account is a policy nobody has
-- tested.
--
--   begin;
--
--   insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
--   values
--     ('00000000-0000-4000-8000-00000000f7a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f7-probe-host@example.invalid',   'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-00000000f7a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f7-probe-guest@example.invalid',  'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-00000000f7a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f7-probe-third@example.invalid',  'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');
--
--   insert into public.agents (id, user_id, display_name)
--   values ('00000000-0000-4000-8000-00000000f7b1', '00000000-0000-4000-8000-00000000f7a1', 'F7 probe host');
--
--   -- One let by the night (a stay) and one let by the year (a tenancy).
--   insert into public.listings (id, agent_id, title, property_type, is_demo, status, rate_period)
--   values ('00000000-0000-4000-8000-00000000f7c1', '00000000-0000-4000-8000-00000000f7b1', 'F7 probe hotel room', 'hotel', false, 'PUBLISHED', 'night'),
--          ('00000000-0000-4000-8000-00000000f7c2', '00000000-0000-4000-8000-00000000f7b1', 'F7 probe flat',       'apartment', false, 'PUBLISHED', null);
--
--   do $probe$
--   declare
--     guest uuid := '00000000-0000-4000-8000-00000000f7a2';
--     third uuid := '00000000-0000-4000-8000-00000000f7a3';
--     host  uuid := '00000000-0000-4000-8000-00000000f7a1';
--     today date := (now() at time zone 'Africa/Lagos')::date;
--     price bigint := 5000000;
--     n     integer;
--   begin
--     -- 1. A nightly stay: request, confirm, complete.
--     insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
--     values ('00000000-0000-4000-8000-00000000f7d1', '00000000-0000-4000-8000-00000000f7c1', guest, today + 10, today + 12, 2, price, price * 2, price * 2, 'PENDING');
--     select count(*) into n from public.notifications
--      where user_id = guest and title = 'Booking request sent' and href = '/trips';
--     if n <> 1 then raise exception 'FAIL 1: request sent href is not /trips (% rows)', n; end if;
--
--     update public.bookings set status = 'CONFIRMED' where id = '00000000-0000-4000-8000-00000000f7d1';
--     select count(*) into n from public.notifications
--      where user_id = guest and title = 'Booking confirmed' and href = '/trips';
--     if n <> 1 then raise exception 'FAIL 1: confirmed href is not /trips (% rows)', n; end if;
--
--     update public.bookings set status = 'COMPLETED' where id = '00000000-0000-4000-8000-00000000f7d1';
--     select count(*) into n from public.notifications
--      where user_id = guest and title = 'Stay complete' and href = '/trips';
--     if n <> 1 then raise exception 'FAIL 1: complete href is not /trips (% rows)', n; end if;
--     raise notice 'PASS 1: a nightly stay sends the guest to /trips on all three branches';
--
--     -- 2. A cancelled nightly stay, and the host line that must NOT move.
--     insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
--     values ('00000000-0000-4000-8000-00000000f7d2', '00000000-0000-4000-8000-00000000f7c1', guest, today + 20, today + 22, 2, price, price * 2, price * 2, 'PENDING');
--     update public.bookings set status = 'CANCELLED' where id = '00000000-0000-4000-8000-00000000f7d2';
--     select count(*) into n from public.notifications
--      where user_id = guest and title = 'Booking cancelled' and href = '/trips';
--     if n <> 1 then raise exception 'FAIL 2: cancelled guest href is not /trips (% rows)', n; end if;
--     select count(*) into n from public.notifications
--      where user_id = host and title = 'Booking cancelled' and href = '/agent/bookings';
--     if n <> 1 then raise exception 'FAIL 2: the host line moved (% rows on /agent/bookings)', n; end if;
--     raise notice 'PASS 2: a cancelled stay sends the guest to /trips and leaves the host on /agent/bookings';
--
--     -- 3. An annual tenancy listing keeps /bookings.
--     insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
--     values ('00000000-0000-4000-8000-00000000f7d3', '00000000-0000-4000-8000-00000000f7c2', guest, today + 30, today + 31, 1, price, price, price, 'PENDING');
--     select count(*) into n from public.notifications
--      where user_id = guest and title = 'Booking request sent' and href = '/bookings';
--     if n <> 1 then raise exception 'FAIL 3: a tenancy listing did not keep /bookings (% rows)', n; end if;
--     raise notice 'PASS 3: a listing with no nightly rate keeps the Property href';
--
--     -- 4. THE CROSS-USER READ, WHICH MUST FAIL.
--     perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.notifications where title in ('Booking confirmed', 'Stay complete', 'Booking cancelled');
--     if n < 3 then raise exception 'FAIL 4: the guest reads only % of their own booking notifications', n; end if;
--     reset role;
--
--     perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.notifications where user_id = guest;
--     if n <> 0 then raise exception 'FAIL 4: A STRANGER READ % OF THE GUEST''S NOTIFICATIONS', n; end if;
--     select count(*) into n from public.bookings where guest_id = guest;
--     if n <> 0 then raise exception 'FAIL 4: A STRANGER READ % OF THE GUEST''S BOOKINGS', n; end if;
--     reset role;
--     perform set_config('request.jwt.claims', '', true);
--     raise notice 'PASS 4: the guest reads their own; a third account reads 0 notifications and 0 bookings';
--
--     raise notice 'ALL PASS. Rolling back.';
--   end $probe$;
--
--   rollback;
-- ---------------------------------------------------------------------------

create or replace function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  host_user     uuid;
  listing_title text;
  night_rate    public.rate_period;
  guest_href    text;
  tenancy       boolean;
  tenant_name   text;
  charge        public.rent_payments%rowtype;
begin
  select a.user_id, l.title, l.rate_period
    into host_user, listing_title, night_rate
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;

  -- Which shelf this guest's own copy of the booking lives on. A place let by
  -- the night is a stay and belongs on /trips, which forces the Stays shell;
  -- everything else stays on /bookings, which forces Property. The side law is
  -- in lib/side.constants.ts and this is the database's half of obeying it.
  guest_href := case when night_rate = 'night' then '/trips' else '/bookings' end;

  -- A tenancy charge, not a stay. On INSERT the rent_payments row is not
  -- written yet, so the writer says so through a transaction-local setting;
  -- afterwards the row itself is the evidence.
  tenancy := coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
             or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id);

  if tenancy then
    select * into charge from public.rent_payments rp where rp.booking_id = new.id;
    tenant_name := coalesce(
      (select p.display_name from public.profiles p where p.id = new.guest_id),
      'The tenant'
    );
    if tg_op = 'INSERT' then
      perform private.notify(host_user, 'booking', 'Rent payment started',
        tenant_name || ' is paying the move-in total for ' || coalesce(listing_title, 'your listing') || ' on Vallo.',
        '/agent/earnings');
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'CONFIRMED' then
        perform private.notify(new.guest_id, 'booking', 'Rent paid',
          coalesce(listing_title, 'Your new home') || ': the move-in total is paid and recorded to the kobo.',
          case when charge.inspection_id is null then '/bookings' else '/rent/pay/' || charge.inspection_id end);
        perform private.notify(host_user, 'booking', 'Rent received',
          tenant_name || ' has paid the move-in total for ' || coalesce(listing_title, 'your listing') || '.',
          '/agent/earnings');
      elsif new.status = 'CANCELLED' then
        perform private.notify(new.guest_id, 'booking', 'Rent payment step closed',
          coalesce(listing_title, 'Your listing') || ': the payment step closed unpaid. Open it again from the inspection when you are ready.',
          case when charge.inspection_id is null then '/inspections' else '/rent/pay/' || charge.inspection_id end);
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      '/agent/bookings');
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(listing_title, 'this stay') || ' is with the host.',
      guest_href);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(listing_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        guest_href);
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'Your stay') || ' has been cancelled.',
        guest_href);
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        '/agent/bookings');
    elsif new.status = 'COMPLETED' then
      perform private.notify(new.guest_id, 'booking', 'Stay complete',
        coalesce(listing_title, 'Your stay') || ' is recorded as complete. Thank you for staying.',
        guest_href);
    end if;
  end if;

  return new;
end;
$function$;

comment on function private.notify_booking_change() is
  'Booking fan-out. The host hears on /agent/bookings; the guest hears on the shelf their own side owns, /trips for a place let by the night and /bookings for a tenancy, because a notification that flips a person out of the shell they are standing in is the product working against them. The tenancy branch is B3''s rent charge and is unchanged.';
