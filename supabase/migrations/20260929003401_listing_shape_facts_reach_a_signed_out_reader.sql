-- The unit shape (V-66), the compound's five answers (V-28), the service
-- charge's answers (V-68) and the lister's flooding answer (V-41) were added
-- to public.listings without the column grant anon needs. public.listings is
-- granted to anon column by column, so with VALLO_PUBLIC_CATALOGUE on a
-- signed-out reader's read of these facts was refused (42501) and the listing
-- page, search cards and the "Serviced" and "no flooding" filters silently
-- lost them. Signed-in members already read them.
--
-- Column SELECT only. Row visibility is unchanged: the anon select policy on
-- listings still decides which rows a signed-out reader sees (published,
-- non-demo). None of these columns is an address or a private field; the
-- estate's name and gate details stay in listing_access.
grant select (
  unit_shape, ensuite_count, has_bq,
  parking_type, flats_in_compound, landlord_on_site, waste_disposal, car_access,
  service_charge_covers, service_charge_reconciled, estate_type, is_serviced,
  flooding
) on public.listings to anon;

do $$
declare
  missing text;
begin
  select string_agg(c, ', ') into missing
    from unnest(array['unit_shape','ensuite_count','has_bq','parking_type','flats_in_compound',
                      'landlord_on_site','waste_disposal','car_access','service_charge_covers',
                      'service_charge_reconciled','estate_type','is_serviced','flooding']) as c
   where not has_column_privilege('anon', 'public.listings', c, 'SELECT');
  if missing is not null then
    raise exception 'anon still cannot read: %', missing;
  end if;
  -- The private columns must stay private.
  if has_column_privilege('anon', 'public.listings', 'address', 'SELECT')
     or has_column_privilege('anon', 'public.listings', 'landmark', 'SELECT')
     or has_column_privilege('anon', 'public.listings', 'review_notes', 'SELECT') then
    raise exception 'a private listing column is readable by anon';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.listings'::regclass) then
    raise exception 'RLS is off on public.listings';
  end if;
end $$;
