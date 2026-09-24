-- NEW-A4-01 STEP 2 of 2 (after the release that reads the public point is
-- deployed; step 1 must be live). A signed-out caller reads a property's
-- point to about a kilometre, never to the door.
--
-- 1. anon loses the exact latitude, longitude and location on listings,
--    accommodations, businesses and catalogue_entries. A column revoke is a
--    no-op against a table-wide grant, and revoking the table grant drops
--    every column grant, so catalogue_entries' table grant becomes a column
--    list of every column except the exact three.
-- 2. The five coordinate functions' public names become dispatchers: a
--    signed-out caller (role anon) is served <name>_public, everyone else
--    <name>_exact. Signatures, defaults and grants are unchanged.

do $$
declare
  t text;
begin
  foreach t in array array['listings', 'accommodations', 'businesses', 'catalogue_entries'] loop
    if exists (select 1 from pg_class c, aclexplode(c.relacl) a
                where c.oid = format('public.%I', t)::regclass
                  and a.grantee = 'anon'::regrole and a.privilege_type = 'SELECT') then
      execute format('revoke select on public.%I from anon', t);
      execute format('grant select (%s) on public.%I to anon',
        (select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
           from pg_attribute a
          where a.attrelid = format('public.%I', t)::regclass and a.attnum > 0 and not a.attisdropped
            and a.attname not in ('latitude', 'longitude', 'location')), t);
    else
      execute format('revoke select (latitude, longitude, location) on public.%I from anon', t);
    end if;
  end loop;
end
$$;

do $$
declare
  fn record;
  args_call text;
begin
  for fn in
    select p.oid, p.proname
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('listings_in_bounds', 'comparable_listings', 'comparable_supply_near',
                         'area_supply_census', 'stays_search')
  loop
    if to_regproc('public.' || fn.proname || '_public') is null
       or to_regproc('public.' || fn.proname || '_exact') is null then
      raise exception 'NEW-A4-01 step 2: % has no _public/_exact twin; apply step 1 first', fn.proname;
    end if;
    select string_agg(quote_ident(x), ', ' order by o)
      into args_call
      from unnest((select p.proargnames from pg_proc p where p.oid = fn.oid)) with ordinality as u(x, o)
     where o <= (select p.pronargs from pg_proc p where p.oid = fn.oid);

    execute format($d$
      create or replace function public.%1$I(%2$s)
      returns %3$s
      language plpgsql
      stable
      set search_path = ''
      as $body$
      begin
        -- NEW-A4-01: a signed-out caller gets the public point.
        if coalesce(current_setting('role', true), '') = 'anon' then
          return query select * from public.%4$I(%5$s);
        else
          return query select * from public.%6$I(%5$s);
        end if;
      end;
      $body$
    $d$, fn.proname, pg_get_function_arguments(fn.oid), pg_get_function_result(fn.oid),
         fn.proname || '_public', args_call, fn.proname || '_exact');
  end loop;
end
$$;

notify pgrst, 'reload schema';
