-- ESC-02 (with SUP-03, DB-P2-01, SEC-P2-01) and ESC-P2-01.
--
-- A guest inserted their own bookings row under RLS, and the row carried its
-- own price: checkout then charged `total_minor` as written. 3 kobo bought
-- three nights listed at N255,000; a booking could be dated in the past, or
-- made against a DRAFT or a rent/sale listing, or over nights the host blocked.
--
-- The deployed app still inserts under the guest's client
-- (lib/bookings/actions.ts reserve), so INSERT stays granted and the row is
-- priced HERE instead, from the listing, on every insert: whatever the caller
-- wrote in the price columns is overwritten with listings.rate_minor x nights
-- and zero fees, which is exactly the arithmetic reserve() does today. The
-- rent charge (private.open_rent_charge) prices from the listing's move-in
-- figures and marks itself with the transaction-local `vallo.rent_charge`;
-- that mark is honoured only when the session role is not an API role
-- (`current_setting('role')`, which a definer does not rewrite), so a guest
-- who manages to set it is still priced from the listing.
--
-- After insert, the money and the dates of a booking never change. And admins
-- lose their direct write over the API (ESC-P2-01): every admin change to a
-- booking already goes through a SECURITY DEFINER function or the service
-- role, both of which write their own history; the AFTER UPDATE trigger adds
-- an audit_log row for every status change, whoever made it.

create or replace function private.price_booking_from_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lst         record;
  -- The role PostgREST switched to. current_user cannot be used here: in a
  -- SECURITY DEFINER function it is always the owner. SET ROLE is not
  -- changed by the definer, so this still names the API caller.
  api_caller  boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
  n           integer;
begin
  if tg_op = 'UPDATE' then
    if (new.listing_id, new.guest_id, new.check_in, new.check_out, new.nights,
        new.price_per_night_minor, new.cleaning_fee_minor, new.service_fee_minor,
        new.subtotal_minor, new.total_minor, new.currency)
       is distinct from
       (old.listing_id, old.guest_id, old.check_in, old.check_out, old.nights,
        old.price_per_night_minor, old.cleaning_fee_minor, old.service_fee_minor,
        old.subtotal_minor, old.total_minor, old.currency) then
      raise exception 'booking_terms_are_fixed: a booking''s listing, guest, dates and price are fixed when it is made'
        using errcode = '42501',
              hint = 'ESC-02 / ESC-P2-01: cancel and book again instead.';
    end if;
    return new;
  end if;

  -- INSERT. The rent charge is priced by private.open_rent_charge.
  if not api_caller and coalesce(current_setting('vallo.rent_charge', true), '') = 'true' then
    return new;
  end if;

  select l.id, l.status, l.is_demo, l.rate_minor, l.rate_period
    into lst
    from public.listings l
   where l.id = new.listing_id;
  if lst.id is null or lst.is_demo then
    return new;  -- the foreign key and the demo trigger answer in their own words
  end if;
  if lst.status <> 'PUBLISHED'
     or lst.rate_period is distinct from 'night'
     or coalesce(lst.rate_minor, 0) <= 0 then
    raise exception 'booking_listing_not_bookable: this place is not taking stay bookings'
      using errcode = '23514',
            hint = 'ESC-02: only a published listing with a nightly rate can carry a stay booking.';
  end if;

  if new.check_in < lagos_today then
    raise exception 'booking_check_in_past: check-in has already passed'
      using errcode = '23514';
  end if;
  n := new.check_out - new.check_in;
  if n is null or n < 1 then
    raise exception 'booking_dates_reversed: check-out has to be after check-in'
      using errcode = '22000';
  end if;

  if exists (
    select 1 from public.availability a
     where a.listing_id = new.listing_id
       and a.status = 'unavailable'
       and a.date >= new.check_in and a.date < new.check_out
  ) then
    raise exception 'booking_dates_blocked: the host has closed some of these nights'
      using errcode = '23P01';
  end if;

  new.nights                := n;
  new.price_per_night_minor := lst.rate_minor;
  new.cleaning_fee_minor    := 0;
  new.service_fee_minor     := 0;
  new.subtotal_minor        := lst.rate_minor * n;
  new.total_minor           := lst.rate_minor * n;
  new.currency              := 'NGN';
  return new;
end;
$$;

revoke all on function private.price_booking_from_listing() from public, anon, authenticated;

-- Fires after bookings_never_against_a_demo_listing (name order), so an
-- example listing is still refused in its own words.
create trigger bookings_priced_by_the_listing
  before insert or update on public.bookings
  for each row execute function private.price_booking_from_listing();

create or replace function private.audit_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'booking.status_changed', 'booking', new.id::text,
      jsonb_build_object(
        'from', old.status, 'to', new.status,
        'db_role', coalesce(current_setting('role', true), 'none'),
        'total_minor', new.total_minor
      ));
  end if;
  return new;
end;
$$;

revoke all on function private.audit_booking_change() from public, anon, authenticated;

create trigger bookings_audit_after_change
  after update on public.bookings
  for each row execute function private.audit_booking_change();

-- ESC-P2-01: admins read bookings; they do not write them over the API.
drop policy bookings_admin_all on public.bookings;
create policy bookings_admin_select on public.bookings
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
