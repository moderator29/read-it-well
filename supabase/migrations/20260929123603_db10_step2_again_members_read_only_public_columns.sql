-- DB-10 STEP 2, AGAIN (29 September 2026): signed-in members read only the
-- public columns of listings, businesses and accommodations, and nobody but
-- the service role reads an exact point.
--
-- WHY IT WAS ROLLED BACK TWICE, AND WHY IT HOLDS NOW.
--  * 24 September (20260924071045): the deployed listing page still read the
--    exact point through the member's client. Every such read now goes
--    through `pointSelect` / `withPublicPoint`, and the app-wide check in
--    apps/web/src/lib/supabase/revoked-columns.test.ts reads THIS file's
--    lists (the newest `*_db10_step2_*`) and fails the build on any member
--    select that names one of them, or `*`.
--  * 29 September (20260929111058): four database probes (db-01..03, sec-06)
--    read moderator columns and `RETURNING *` as the member. PostgREST never
--    sends `RETURNING *`: it returns only the columns named in `select=`
--    (`RETURNING 1` for none), so the app's own saves were never at risk,
--    but a probe that claimed to be "the shape PostgREST sends" was not.
--    The probes now read moderator columns as the service role and return
--    what the app asks for, and s1-owner-writes-keep-working proves, against
--    this grant, that an owner still creates and edits a listing, a business
--    and a property exactly as the app does, reads their private fields back
--    through the definers, and that a stranger reads none of them.
--
-- The owner's and staff's private reads go through public.listing_private_fields
-- and public.business_private_fields (DB-10 step 1); the exact place through
-- public.listing_exact_location. `ownership_verified_at` and
-- `mandate_verified_at` stay readable: they are the public "checked" marks.
-- The column list is computed from the live table, so a column added later is
-- not readable by a member until it is granted.

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('listings', array['address', 'landmark', 'review_notes', 'reviewer_id', 'verified_by',
                         'listing_fee_minor', 'listing_fee_rate_id', 'listing_fee_charged_at',
                         'supply_verified_by', 'latitude', 'longitude', 'location']),
      ('businesses', array['address', 'phone', 'email', 'cac_number', 'registered_name', 'tin',
                           'representative_name', 'representative_phone', 'consents',
                           'reviewer_id', 'review_notes', 'verification_tier',
                           'latitude', 'longitude', 'location']),
      ('accommodations', array['address', 'reviewer_id', 'review_notes', 'latitude', 'longitude', 'location']),
      ('catalogue_entries', array['latitude', 'longitude', 'location'])
    ) as v(tbl, private_cols)
  loop
    execute format('revoke select on public.%I from authenticated', spec.tbl);
    execute format('grant select (%s) on public.%I to authenticated',
      (select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
         from pg_attribute a
        where a.attrelid = format('public.%I', spec.tbl)::regclass and a.attnum > 0 and not a.attisdropped
          and a.attname <> all (spec.private_cols)), spec.tbl);
  end loop;
end
$$;

-- Read back: the member holds no private column and every public one the app
-- reads; the owner's definers are still callable.
do $$
declare
  bad text;
begin
  select string_agg(t || '.' || c, ', ') into bad
    from (values ('listings', 'address'), ('listings', 'review_notes'), ('listings', 'latitude'),
                 ('businesses', 'phone'), ('businesses', 'tin'), ('businesses', 'cac_number'),
                 ('businesses', 'email'), ('accommodations', 'address'), ('catalogue_entries', 'location')) v(t, c)
   where has_column_privilege('authenticated', format('public.%I', t), c, 'select');
  if bad is not null then raise exception 'a member can still read %', bad; end if;

  select string_agg(t || '.' || c, ', ') into bad
    from (values ('listings', 'id'), ('listings', 'status'), ('listings', 'title'), ('listings', 'latitude_public'),
                 ('listings', 'ownership_verified_at'), ('businesses', 'id'), ('businesses', 'status'),
                 ('businesses', 'name'), ('accommodations', 'id'), ('catalogue_entries', 'latitude_public')) v(t, c)
   where not has_column_privilege('authenticated', format('public.%I', t), c, 'select');
  if bad is not null then raise exception 'a member lost a public column: %', bad; end if;

  if not has_function_privilege('authenticated', 'public.listing_private_fields(uuid[])', 'execute')
     or not has_function_privilege('authenticated', 'public.business_private_fields(uuid[])', 'execute') then
    raise exception 'the owner''s private-fields definers are not callable';
  end if;
end
$$;

notify pgrst, 'reload schema';
