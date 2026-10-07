-- D75: the stay journey after booking, checked against live on 7 October 2026.
-- Pending: NOT applied. The lead reviews it, applies it through the MCP, and
-- commits it under the version the server stamps (scripts/check-migrations.mjs).
-- Its probe is supabase/tests/probes-pending/d75b-stay-trip-details.sql.
-- Apply after d73a_stays_instant_pay.sql (the gap it closes is widest with it).
--
-- WHAT LIVE HAD
--  * `listings.address` and `accommodations.address` are not granted to members
--    at all, and nothing gave a guest the address of the place they booked: the
--    trip page showed area and city only.
--  * `listing_access` (estate, gate directions, security phone, access code) was
--    readable by a guest with a CONFIRMED booking, paid or not
--    (`private.can_see_listing_access`). CONFIRMED used to mean "the host
--    accepted"; with instant booking (D73) it is true the moment a guest books,
--    before a kobo is paid. A gate code must follow the money.
--  * Reviews (`reviews_insert_own`) were gated on a CONFIRMED or COMPLETED
--    booking whose check-out had passed, but not on payment.
--
-- WHAT THIS CHANGES
--  1. private.booking_is_paid(): a SUCCESSFUL transaction exists on the booking.
--  2. private.can_see_listing_access (LIVE FUNCTION CHANGED): the guest clause
--     also requires the booking to be paid. Owner and admin clauses unchanged.
--  3. reviews_insert_own (LIVE POLICY CHANGED, by ALTER POLICY so its roles and
--     name are kept): the booking must also be paid.
--  4. public.my_stay_details(): the trip page's one read. To the booking's own
--     guest only, once paid and while CONFIRMED or COMPLETED: the address, the
--     check-in and check-out times and house rules (hotels), the access details
--     (listing stays; the access code only until the stay is over), the host's
--     display name and where to message them. Unpaid, it answers 'unpaid' and
--     reveals nothing.
-- Live has 0 bookings, 0 transactions and 0 reviews today, so no existing row
-- changes meaning.

-- 1. ---------------------------------------------------------------------------
create or replace function private.booking_is_paid(p_booking uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.transactions t where t.booking_id = p_booking and t.status = 'SUCCESSFUL');
$$;
revoke all on function private.booking_is_paid(uuid) from public, anon;
-- Called from the reviews insert policy, so the member's role evaluates it.
grant execute on function private.booking_is_paid(uuid) to authenticated, service_role;

-- 2. Copied from the live definition; one line added. ---------------------------
create or replace function private.can_see_listing_access(p_listing uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select
    private.owns_listing(p_listing)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
    or exists (
      select 1
      from public.bookings b
      where b.listing_id = p_listing
        and b.guest_id = (select auth.uid())
        and b.status = 'CONFIRMED'
        -- D75: the gate code follows the money, not the acceptance.
        and private.booking_is_paid(b.id)
    );
$function$;

-- 3. Copied from the live WITH CHECK; one clause added. --------------------------
alter policy reviews_insert_own on public.reviews
  with check (
    ((select auth.uid()) = author_id)
    and (hidden_at is null)
    and (hidden_note is null)
    and (exists (
      select 1
        from public.bookings b
       where b.id = reviews.booking_id
         and b.guest_id = (select auth.uid())
         and b.status = any (array['CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status])
         and b.check_out <= ((now() at time zone 'Africa/Lagos'))::date
         and not private.booking_is_tenancy(b.id)
         -- D75: a review is for a stay that was paid for.
         and private.booking_is_paid(b.id)
         and (((reviews.listing_id is not null) and (reviews.accommodation_id is null) and (b.listing_id = reviews.listing_id))
              or ((reviews.accommodation_id is not null) and (reviews.listing_id is null)
                  and (b.accommodation_id = reviews.accommodation_id)))))
  );

-- 4. ---------------------------------------------------------------------------
create or replace function public.my_stay_details(p_booking uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  me uuid := (select auth.uid());
  b public.bookings%rowtype;
  l record;
  ac record;
  la record;
  host uuid;
  host_name text;
  over boolean;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or me is null or b.guest_id <> me or private.booking_is_tenancy(b.id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if b.status not in ('CONFIRMED', 'COMPLETED') then
    return jsonb_build_object('status', 'not_confirmed');
  end if;
  if not private.booking_is_paid(b.id) then
    -- Nothing about the place is revealed before payment.
    return jsonb_build_object('status', 'unpaid');
  end if;
  over := b.status = 'COMPLETED' or b.check_out < (now() at time zone 'Africa/Lagos')::date;
  host := private.booking_host(b.id);
  select p.display_name into host_name from public.profiles p where p.id = host;

  if b.listing_id is not null then
    select x.id, x.title, x.address, x.area, x.city into l from public.listings x where x.id = b.listing_id;
    select a.estate_name, a.gate_directions, a.security_phone, a.access_code into la
      from public.listing_access a where a.listing_id = b.listing_id;
    return jsonb_build_object(
      'status', 'ok', 'kind', 'listing', 'place_name', l.title,
      'address', l.address, 'area', l.area, 'city', l.city,
      'check_in_from', null, 'check_out_by', null, 'house_rules', null,
      'estate_name', la.estate_name, 'gate_directions', la.gate_directions, 'security_phone', la.security_phone,
      -- The code opens a gate: shown for the stay, not after it.
      'access_code', case when over then null else la.access_code end,
      'host_name', host_name, 'message_href', '/messages/new?listing=' || l.id::text);
  end if;

  select x.id, x.name, x.address, x.area, x.city, x.check_in_from, x.check_out_by, x.house_rules into ac
    from public.accommodations x where x.id = b.accommodation_id;
  return jsonb_build_object(
    'status', 'ok', 'kind', 'room', 'place_name', ac.name,
    'address', ac.address, 'area', ac.area, 'city', ac.city,
    'check_in_from', ac.check_in_from, 'check_out_by', ac.check_out_by, 'house_rules', ac.house_rules,
    'estate_name', null, 'gate_directions', null, 'security_phone', null, 'access_code', null,
    -- A hotel is messaged from its own page (lib/venue-messages, track F).
    'host_name', host_name, 'message_href', '/stay/' || ac.id::text);
end $$;
revoke all on function public.my_stay_details(uuid) from public, anon;
grant execute on function public.my_stay_details(uuid) to authenticated, service_role;
