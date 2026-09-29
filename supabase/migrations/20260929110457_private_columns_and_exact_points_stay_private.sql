-- PRIVATE COLUMNS AND EXACT POINTS STAY PRIVATE (29 September 2026).
--
-- DB-10 step 2 took the private columns of listings, businesses and
-- accommodations away from `authenticated`, and was reverted four minutes
-- later (20260924071045) because the deployed listing page still read the
-- exact point through the member's client. The table-wide grant it restored
-- let ANY signed-in account read every published listing's street address,
-- landmark and moderator note, and every published business's phone, email,
-- TIN, CAC number and representative's phone. The repository is public now,
-- so that is one PostgREST call away from anybody who signs up.
--
-- The app no longer reads any of these through a member's client (the
-- release before this migration moved the last readers to the public point,
-- the *_private_fields functions, or the service role after a staff check),
-- so the grant goes, and this time the exact point goes with it:
--
--  1. `authenticated` selects every column of listings, businesses and
--     accommodations EXCEPT the private ones and the exact point; catalogue
--     entries lose only the exact point. The column list is computed from the
--     live table, so a column added later is not readable until granted.
--  2. `anon` loses the exact point it was given back by the revert.
--  3. The five map and comparison dispatchers answer every caller from their
--     public twin; the invoker-rights _exact twins are no longer callable by
--     members (they would now be refused anyway).
--  4. public.listing_exact_location(listing) gives the street address,
--     landmark and exact point to the people with a reason to go there: the
--     lister (or their firm), staff holding listing_approval, a member with a
--     CONFIRMED or COMPLETED inspection, or a party to a live agreement on it.
--     Anybody else gets no row.
--
-- ownership_verified_at and mandate_verified_at stay readable: they are the
-- public "checked" marks, not private facts.

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
    execute format('revoke select (latitude, longitude, location) on public.%I from anon', spec.tbl);
  end loop;
end
$$;

-- 3. Every caller gets the public point from the dispatchers.
do $$
declare
  f text;
  def text;
begin
  foreach f in array array[
    'public.listings_in_bounds', 'public.stays_search', 'public.comparable_listings',
    'public.area_supply_census', 'public.comparable_supply_near'] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p where p.oid = (select min(q.oid) from pg_proc q join pg_namespace n on n.oid = q.pronamespace
                                     where n.nspname || '.' || q.proname = f);
    if position('if coalesce(current_setting(''role'', true), '''') = ''anon'' then' in def) = 0 then
      raise exception '%: dispatcher shape not found', f;
    end if;
    execute replace(def,
      'if coalesce(current_setting(''role'', true), '''') = ''anon'' then',
      'if true then -- 29 Sept: every caller gets the public point');
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('listings_in_bounds_exact', 'stays_search_exact', 'comparable_listings_exact',
                         'area_supply_census_exact', 'comparable_supply_near_exact',
                         'listings_in_bounds_public', 'stays_search_public', 'comparable_listings_public',
                         'area_supply_census_public', 'comparable_supply_near_public')
  loop
    if r.proname like '%\_exact' then
      execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    else
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    end if;
  end loop;
end $$;

-- 4. The exact place, for the people with a reason to go there.
create or replace function public.listing_exact_location(p_listing uuid)
returns table (address text, landmark text, latitude double precision, longitude double precision, why text)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
  l record;
  reason text;
begin
  if me is null or p_listing is null then
    return;
  end if;
  select x.id, x.agent_id, x.firm_id, x.address, x.landmark, x.latitude, x.longitude
    into l from public.listings x where x.id = p_listing;
  if l.id is null then
    return;
  end if;
  if private.listing_agent_is_me(l.agent_id) or private.firm_member_is_me(l.firm_id) then
    reason := 'lister';
  elsif private.staff_can(me, 'listing_approval') then
    reason := 'staff';
  elsif exists (select 1 from public.inspection_requests i
                 where i.listing_id = p_listing and i.requester_id = me
                   and i.state in ('CONFIRMED', 'COMPLETED')) then
    reason := 'inspection';
  elsif exists (select 1 from public.deal_agreements d
                 where d.listing_id = p_listing and me in (d.renter_id, d.owner_id)
                   and d.status in ('awaiting_parties', 'in_review', 'approved', 'paid')) then
    reason := 'agreement';
  else
    return;
  end if;
  return query select l.address, l.landmark, l.latitude, l.longitude, reason;
end;
$function$;

revoke all on function public.listing_exact_location(uuid) from public, anon;
grant execute on function public.listing_exact_location(uuid) to authenticated;

-- Read back.
do $$
declare
  bad text;
begin
  select string_agg(table_name || '.' || column_name || ':' || grantee, ', ') into bad
    from information_schema.column_privileges
   where table_schema = 'public' and privilege_type = 'SELECT' and grantee in ('anon', 'authenticated')
     and ((table_name = 'listings' and column_name in ('address', 'landmark', 'review_notes', 'reviewer_id', 'latitude', 'longitude', 'location'))
       or (table_name = 'businesses' and column_name in ('address', 'phone', 'email', 'tin', 'cac_number', 'representative_phone', 'latitude', 'longitude', 'location'))
       or (table_name = 'accommodations' and column_name in ('address', 'review_notes', 'latitude', 'longitude', 'location'))
       or (table_name = 'catalogue_entries' and column_name in ('latitude', 'longitude', 'location')));
  if bad is not null then
    raise exception 'still granted: %', bad;
  end if;
  if not has_column_privilege('authenticated', 'public.listings', 'latitude_public', 'SELECT')
     or not has_column_privilege('authenticated', 'public.listings', 'ownership_verified_at', 'SELECT')
     or not has_column_privilege('authenticated', 'public.listings', 'title', 'SELECT')
     or not has_column_privilege('authenticated', 'public.businesses', 'name', 'SELECT')
     or not has_column_privilege('authenticated', 'public.catalogue_entries', 'latitude_public', 'SELECT') then
    raise exception 'a public column lost its grant';
  end if;
  if has_function_privilege('authenticated', 'public.listings_in_bounds_exact(double precision,double precision,double precision,double precision,public.listing_intent,public.property_type,bigint,bigint,integer,integer)', 'EXECUTE') then
    raise exception 'exact dispatcher twin still callable';
  end if;
end $$;

notify pgrst, 'reload schema';
