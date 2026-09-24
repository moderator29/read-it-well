-- DB-10 STEP 2 of 2 (after the release that reads the private columns
-- through listing_private_fields / business_private_fields is deployed;
-- step 1 must be live). `authenticated` loses SELECT on the private columns
-- of listings, businesses and accommodations.
--
-- `authenticated` holds a table-wide SELECT on each, and a column cannot be
-- subtracted from a table grant, so the table grant becomes a column list of
-- every other column. A column added to these tables later is not readable
-- by `authenticated` until it is granted.

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('listings', array['address', 'landmark', 'review_notes', 'reviewer_id', 'verified_by',
                         'listing_fee_minor', 'listing_fee_rate_id', 'listing_fee_charged_at',
                         'ownership_verified_at', 'mandate_verified_at', 'supply_verified_by']),
      ('businesses', array['address', 'phone', 'email', 'cac_number', 'registered_name', 'tin',
                           'representative_name', 'representative_phone', 'consents',
                           'reviewer_id', 'review_notes', 'verification_tier']),
      ('accommodations', array['address', 'reviewer_id', 'review_notes'])
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

notify pgrst, 'reload schema';
