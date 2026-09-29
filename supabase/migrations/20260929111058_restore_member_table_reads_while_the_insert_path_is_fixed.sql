-- ROLL BACK THE MEMBER HALF OF 20260929110457 (29 September 2026).
--
-- Narrowing `authenticated` to a column list on listings, businesses,
-- accommodations and catalogue_entries broke an owner's own inserts (the
-- database probes db-01, db-02 and db-03: "permission denied for table
-- listings/businesses"), so agents could not create listings. The table-wide
-- member read is restored until the insert path is fixed; everything else in
-- 20260929110457 stays (the public-point dispatchers, the exact-location
-- function, and anon's loss of the exact point).
grant select on public.listings, public.businesses, public.accommodations, public.catalogue_entries to authenticated;
notify pgrst, 'reload schema';
