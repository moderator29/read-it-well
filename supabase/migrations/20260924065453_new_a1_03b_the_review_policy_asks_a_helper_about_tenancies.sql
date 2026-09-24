-- The review policy asks whether a booking is a tenancy through a definer
-- helper, not through the reviewer's own read of rent_payments.
--
-- reviews_insert_own refused a tenancy by reading public.rent_payments under
-- the reviewer's RLS, which only worked while authenticated kept SELECT on
-- that table and the tenant's select policy stood. Either one changing would
-- have let a tenancy be reviewed as a stay without anything failing.
-- private.booking_is_tenancy answers from the table itself. It returns only a
-- boolean for a booking id the caller already names.

create or replace function private.booking_is_tenancy(p_booking uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.rent_payments rp where rp.booking_id = p_booking);
$$;
revoke all on function private.booking_is_tenancy(uuid) from public, anon;
grant execute on function private.booking_is_tenancy(uuid) to authenticated, service_role;
comment on function private.booking_is_tenancy(uuid) is
  'NEW-A1-03. True when the booking carries a rent charge (a tenancy, not a stay). reviews_insert_own calls it, so authenticated must keep EXECUTE.';

alter policy reviews_insert_own on public.reviews
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
        from public.bookings b
       where b.id = reviews.booking_id
         and b.guest_id = (select auth.uid())
         and b.listing_id = reviews.listing_id
         and b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)
         and b.check_out <= (now() at time zone 'Africa/Lagos')::date
         and not private.booking_is_tenancy(b.id)
    )
  );
