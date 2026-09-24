-- Revert of the grant half of DB-10 step 2 and NEW-A4-01 step 2. The
-- deployed listing page still selects ownership_verified_at,
-- mandate_verified_at, latitude and longitude from listings through the
-- caller's own client, and those reads began failing (403 signed in, 401
-- signed out) the moment the grants went. Restore the step-1 state: the
-- table-wide SELECT for authenticated, and the exact point for anon. The
-- NEW-A4-01 dispatchers stay (they are correct on either grant state).
grant select on public.listings, public.businesses, public.accommodations to authenticated;
do $$
declare t text;
begin
  foreach t in array array['listings', 'accommodations', 'businesses', 'catalogue_entries'] loop
    execute format('grant select (latitude, longitude, location) on public.%I to anon', t);
  end loop;
end $$;
notify pgrst, 'reload schema';
