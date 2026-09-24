-- NEW-A4-01 STEP 1 of 2 (additive; before the release). With SUP-06's
-- "coarsen the public point": a signed-out caller will read a property's
-- point to about a kilometre, never to the door.
--
-- Step 1 adds the public point, grants it to anon, adds each coordinate
-- function's _exact and _public twins and teaches the owner-write guard to
-- ignore the generated columns. Nothing is taken away, so the deployed app
-- keeps working. Step 2 (after the release that reads the public point is
-- deployed) withdraws the exact columns from anon and turns the public
-- function names into dispatchers.
--
-- anon held column SELECT on latitude, longitude and location in listings,
-- accommodations, businesses and catalogue_entries, so the publishable key
-- read exact coordinates whatever the app showed, and five anon-callable
-- search functions returned them (two with an exact distance, which
-- triangulates a point even after it is hidden).
--
-- 1. Each table gains a public point rounded to two decimal places (about
--    1.1 km at Lagos's latitude), computed by the database so it can never
--    drift from the exact one. anon may read it (step 2 makes it the only
--    point anon reads).
-- 2. Each coordinate function gains <name>_exact (a copy of today's body, not
--    executable by anon) and a <name>_public twin over the public point, with
--    any distance rounded to 500 m. The public names are untouched here; step
--    2 turns them into dispatchers. The twins are derived from the live definitions by
--    text replacement, and every replacement is counted so a definition that
--    has drifted stops the migration instead of producing a half-coarse twin.
-- 3. The owner-write guard (DB-01/DB-02) ignores the generated columns when it
--    compares a row before and after an owner's edit.
-- landmarks_resolve is untouched: landmarks are public places.

-- 1. The public point.
do $$
declare
  t text;
begin
  foreach t in array array['listings', 'accommodations', 'businesses', 'catalogue_entries'] loop
    execute format($f$
      alter table public.%I
        add column if not exists latitude_public double precision
          generated always as (round(latitude::numeric, 2)::double precision) stored,
        add column if not exists longitude_public double precision
          generated always as (round(longitude::numeric, 2)::double precision) stored,
        add column if not exists location_public extensions.geography(Point, 4326)
          generated always as (
            case when latitude is null or longitude is null then null
                 else extensions.st_setsrid(
                        extensions.st_makepoint(round(longitude::numeric, 2)::double precision,
                                                round(latitude::numeric, 2)::double precision),
                        4326)::extensions.geography
            end) stored
    $f$, t);
    -- anon may read the public point. Where anon holds a column list, the
    -- three public columns are added to it; catalogue_entries' table-wide
    -- grant already covers them. The exact columns are withdrawn in step 2.
    if not exists (select 1 from pg_class c, aclexplode(c.relacl) a
                    where c.oid = format('public.%I', t)::regclass
                      and a.grantee = 'anon'::regrole and a.privilege_type = 'SELECT') then
      execute format('grant select (latitude_public, longitude_public, location_public) on public.%I to anon', t);
    end if;
  end loop;
end
$$;

-- 2. The exact bodies and their public twins.
do $$
declare
  fn record;
  def text;
  exact_def text;
  public_def text;
  pair text[];
  ce_cols text;
  n int;
begin
  select string_agg('ce.' || quote_ident(a.attname), ', ' order by a.attnum)
    into ce_cols
    from pg_attribute a
   where a.attrelid = 'public.catalogue_entries'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname not in ('latitude', 'longitude', 'location',
                           'latitude_public', 'longitude_public', 'location_public');

  for fn in
    select p.oid, p.proname
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('listings_in_bounds', 'comparable_listings', 'comparable_supply_near',
                         'area_supply_census', 'stays_search')
  loop
    def := pg_get_functiondef(fn.oid);

    -- The exact body, renamed.
    exact_def := replace(def, 'FUNCTION public.' || fn.proname || '(',
                              'FUNCTION public.' || fn.proname || '_exact(');

    -- The public twin: the exact point replaced by the public one, in the
    -- order that never rewrites an already rewritten name.
    public_def := replace(def, 'FUNCTION public.' || fn.proname || '(',
                               'FUNCTION public.' || fn.proname || '_public(');
    foreach pair slice 1 in array (case fn.proname
      when 'listings_in_bounds' then array[
        array['l.location', 'l.location_public', '2'],
        array['l.latitude,', 'l.latitude_public,', '1'],
        array['l.longitude,', 'l.longitude_public,', '1']]
      when 'comparable_supply_near' then array[
        array['l.location', 'l.location_public', '2']]
      when 'area_supply_census' then array[
        array['l.location', 'l.location_public', '1']]
      when 'comparable_listings' then array[
        array['l.location', 'l.location_public', '4'],
        array['extensions.st_distance(l.location_public, s.origin) as distance_m',
              '(round(extensions.st_distance(l.location_public, s.origin) / 500.0) * 500.0)::double precision as distance_m', '1']]
      when 'stays_search' then array[
        array['ce.location', 'ce.location_public', '4'],
        array['then extensions.st_distance(ce.location_public, pr.origin) else null end as distance_m',
              'then (round(extensions.st_distance(ce.location_public, pr.origin) / 500.0) * 500.0)::double precision else null end as distance_m', '1'],
        array['select ce.*, pr.nights',
              'select ' || ce_cols || ', ce.latitude_public as latitude, ce.longitude_public as longitude, ce.location_public as location, pr.nights', '1']]
    end) loop
      n := (length(public_def) - length(replace(public_def, pair[1], ''))) / length(pair[1]);
      if n <> pair[3]::int then
        raise exception 'NEW-A4-01: % has % occurrence(s) of "%", expected %', fn.proname, n, pair[1], pair[3];
      end if;
      public_def := replace(public_def, pair[1], pair[2]);
    end loop;

    -- No exact column may survive in the twin.
    if public_def ~ '(l|ce)\.(latitude|longitude|location)\M' then
      raise exception 'NEW-A4-01: % twin still names an exact column', fn.proname;
    end if;

    execute exact_def;
    execute public_def;

    execute format('revoke all on function public.%I(%s) from public, anon',
                   fn.proname || '_exact', pg_get_function_identity_arguments(fn.oid));
    execute format('grant execute on function public.%I(%s) to authenticated, service_role',
                   fn.proname || '_exact', pg_get_function_identity_arguments(fn.oid));
    execute format('revoke all on function public.%I(%s) from public',
                   fn.proname || '_public', pg_get_function_identity_arguments(fn.oid));
    execute format('grant execute on function public.%I(%s) to anon, authenticated, service_role',
                   fn.proname || '_public', pg_get_function_identity_arguments(fn.oid));
  end loop;
end
$$;

-- 3. The owner-write guard ignores the generated public point.
do $$
declare
  def text;
begin
  def := pg_get_functiondef('private.guard_owner_write()'::regprocedure);
  if position('bookkeeping constant text[] := array[''status'', ''updated_at'', ''submitted_at''];' in def) = 0 then
    raise exception 'NEW-A4-01: guard_owner_write bookkeeping line not found';
  end if;
  execute replace(def,
    'bookkeeping constant text[] := array[''status'', ''updated_at'', ''submitted_at''];',
    'bookkeeping constant text[] := array[''status'', ''updated_at'', ''submitted_at'', ''latitude_public'', ''longitude_public'', ''location_public''];');
end
$$;

-- The anon twins filter and sort on the public point.
create index if not exists listings_location_public_gist on public.listings
  using gist (location_public) where status = 'PUBLISHED' and location_public is not null;
create index if not exists catalogue_entries_location_public_gist on public.catalogue_entries
  using gist (location_public);

notify pgrst, 'reload schema';
