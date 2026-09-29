/*
 * PERF-DB 2. "IS THIS MINE?" IS ANSWERED AS ONE SET PER STATEMENT, NOT ONE
 * QUERY PER ROW.
 *
 * WHY. The ownership and publication helpers used by 49 policies
 * (`private.owns_listing(listing_id)`, `listing_agent_is_me(agent_id)`,
 * `firm_member_is_me(firm_id)`, `owns_business`, `owns_accommodation`,
 * `owns_room_type`, `business_is_public`, `accommodation_is_public`,
 * `room_type_is_public`) take a column of the row, so each is a SECURITY
 * DEFINER query run once for every candidate row. Permissive policies are
 * OR'd, so a signed-out catalogue read of 65 listings still asks "is this
 * listing's agent me?" 65 times, and every embedded photo / amenity / video
 * row asks `owns_listing` again. That is where the 3.5M sequential scans on
 * the 2-row `agents` table and the 9M index scans on `listings` come from,
 * and it is most of `stays_search`'s cost inside its per-entry LATERAL over
 * room_types, rate_plans, rate_calendar and room_inventory.
 *
 * WHAT. Nine set-returning helpers return exactly the ids for which the
 * matching boolean helper is true (same tables, same joins, same predicates,
 * same SECURITY DEFINER owner and an empty search_path). Each policy call
 * `private.f(col)` becomes `((col IS NOT NULL) AND (col IN (SELECT
 * private.f_ids())))`. The sub-select is uncorrelated, so Postgres builds it
 * once per statement as a hashed sub-plan and each row is a hash probe.
 *
 * WHY IT IS THE SAME PREDICATE. Every boolean helper is `exists (... where
 * <pk> = arg and ...)`: false for a NULL arg, otherwise true exactly when arg
 * is in the set. The rewrite is false for NULL (the AND short-circuits) and,
 * for a non-NULL arg, a membership test over a set of primary keys that holds
 * no NULL, so it is TRUE or FALSE and never NULL, i.e. identical in every
 * context, including under NOT. Policy names, commands, roles and kinds are
 * untouched (`ALTER POLICY` changes only the expression). The boolean helpers
 * themselves stay, unchanged, for every other caller.
 *
 * PROOF (the DO block raises, and the migration rolls back, unless all hold):
 *   1. for every agent, business owner, firm member, staff member, a random
 *      stranger and a signed-out caller, and for every row of listings,
 *      agents, firms, businesses, accommodations and room_types (plus NULL),
 *      old helper = new form;
 *   2. the policy set (name, table, cmd, roles, kind) is unchanged;
 *   3. for every policy, the new expression with the rewrite reversed is
 *      textually identical to the expression before;
 *   4. no policy still calls one of the nine helpers.
 */

create or replace function private.my_agent_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select a.id from public.agents a where a.user_id = (select auth.uid()) $$;

create or replace function private.my_firm_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select m.firm_id from public.firm_members m
    join public.agents a on a.id = m.agent_id
   where m.firm_id is not null and m.status = 'active' and a.user_id = (select auth.uid())
$$;

create or replace function private.my_listing_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select l.id from public.listings l
    join public.agents a on a.id = l.agent_id
   where a.user_id = (select auth.uid())
  union
  select l.id from public.listings l
    join public.firm_members m on m.firm_id = l.firm_id
    join public.agents a on a.id = m.agent_id
   where l.firm_id is not null and m.status = 'active' and a.user_id = (select auth.uid())
$$;

create or replace function private.my_business_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select b.id from public.businesses b where b.owner_id = (select auth.uid()) $$;

create or replace function private.my_accommodation_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select a.id from public.accommodations a
    join public.businesses b on b.id = a.business_id
   where b.owner_id = (select auth.uid())
$$;

create or replace function private.my_room_type_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select rt.id from public.room_types rt
    join public.accommodations a on a.id = rt.accommodation_id
    join public.businesses b on b.id = a.business_id
   where b.owner_id = (select auth.uid())
$$;

create or replace function private.public_business_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select b.id from public.businesses b where b.status = 'PUBLISHED' $$;

create or replace function private.public_accommodation_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select a.id from public.accommodations a
    join public.businesses b on b.id = a.business_id
   where a.status = 'PUBLISHED' and b.status = 'PUBLISHED'
$$;

create or replace function private.public_room_type_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select rt.id from public.room_types rt
    join public.accommodations a on a.id = rt.accommodation_id
    join public.businesses b on b.id = a.business_id
   where rt.status = 'PUBLISHED' and a.status = 'PUBLISHED' and b.status = 'PUBLISHED'
$$;

do $grants$
declare f text;
begin
  foreach f in array array['my_agent_ids','my_firm_ids','my_listing_ids','my_business_ids',
    'my_accommodation_ids','my_room_type_ids','public_business_ids',
    'public_accommodation_ids','public_room_type_ids'] loop
    execute format('alter function private.%I() owner to postgres', f);
    execute format('revoke all on function private.%I() from public', f);
    execute format('grant execute on function private.%I() to anon, authenticated, service_role', f);
  end loop;
end
$grants$;

/* Proof-only helper, dropped at the end of this migration: undoes the rewrite
   on a deparsed policy expression. */
create function private.perf_db_2_reverse(t text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  map constant text[][] := array[
    ['owns_listing','my_listing_ids'], ['listing_agent_is_me','my_agent_ids'],
    ['firm_member_is_me','my_firm_ids'], ['owns_business','my_business_ids'],
    ['owns_accommodation','my_accommodation_ids'], ['owns_room_type','my_room_type_ids'],
    ['business_is_public','public_business_ids'], ['accommodation_is_public','public_accommodation_ids'],
    ['room_type_is_public','public_room_type_ids']];
  i int;
begin
  for i in 1 .. array_length(map, 1) loop
    /* the rewrite standing alone, or as the right operand of AND / any operand of OR */
    t := regexp_replace(t,
      '\(\(([a-z_]+(?:\.[a-z_]+)?) IS NOT NULL\) AND \(\1 IN \( SELECT private\.' || map[i][2]
        || '\(\) AS ' || map[i][2] || '\)\)\)',
      'private.' || map[i][1] || '(\1)', 'g');
    /* the rewrite as the LEFT operand of AND, which the parser flattens into
       that AND's argument list ("a AND b AND c" is one node): the same
       conjunction, one pair of parentheses fewer */
    t := regexp_replace(t,
      '\(([a-z_]+(?:\.[a-z_]+)?) IS NOT NULL\) AND \(\1 IN \( SELECT private\.' || map[i][2]
        || '\(\) AS ' || map[i][2] || '\)\)',
      'private.' || map[i][1] || '(\1)', 'g');
  end loop;
  return t;
end
$$;
revoke all on function private.perf_db_2_reverse(text) from public;

do $mig$
declare
  /* old helper -> set helper */
  map constant text[][] := array[
    ['owns_listing',            'my_listing_ids'],
    ['listing_agent_is_me',     'my_agent_ids'],
    ['firm_member_is_me',       'my_firm_ids'],
    ['owns_business',           'my_business_ids'],
    ['owns_accommodation',      'my_accommodation_ids'],
    ['owns_room_type',          'my_room_type_ids'],
    ['business_is_public',      'public_business_ids'],
    ['accommodation_is_public', 'public_accommodation_ids'],
    ['room_type_is_public',     'public_room_type_ids']];
  col constant text := '([a-z_]+(?:\.[a-z_]+)?)';
  any_old constant text := 'private\.(owns_listing|listing_agent_is_me|firm_member_is_me|owns_business|owns_accommodation|owns_room_type|business_is_public|accommodation_is_public|room_type_is_public)\(';
  before jsonb;
  r record;
  u uuid;
  i int;
  q text;
  c text;
  stmt text;
  changed int := 0;
  bad int;
begin
  /* ---- 1. the set helpers answer exactly what the boolean helpers answer */
  for u in
    select x from (
      select user_id as x from public.agents
      union select owner_id from public.businesses
      union select a.user_id from public.firm_members m join public.agents a on a.id = m.agent_id
      union select user_id from public.user_roles
      union select gen_random_uuid()
    ) s
    union all select null::uuid
  loop
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims',
      case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);

    select count(*) into bad from (
      select 1 from public.listings l
       where private.owns_listing(l.id) is distinct from (l.id is not null and l.id in (select private.my_listing_ids()))
      union all
      select 1 from public.agents a
       where private.listing_agent_is_me(a.id) is distinct from (a.id is not null and a.id in (select private.my_agent_ids()))
      union all
      select 1 from (select firm_id f from public.listings union select firm_id from public.firm_members union select null::uuid) f
       where private.firm_member_is_me(f.f) is distinct from (f.f is not null and f.f in (select private.my_firm_ids()))
      union all
      select 1 from public.businesses b
       where private.owns_business(b.id) is distinct from (b.id is not null and b.id in (select private.my_business_ids()))
          or private.business_is_public(b.id) is distinct from (b.id is not null and b.id in (select private.public_business_ids()))
      union all
      select 1 from public.accommodations a
       where private.owns_accommodation(a.id) is distinct from (a.id is not null and a.id in (select private.my_accommodation_ids()))
          or private.accommodation_is_public(a.id) is distinct from (a.id is not null and a.id in (select private.public_accommodation_ids()))
      union all
      select 1 from public.room_types rt
       where private.owns_room_type(rt.id) is distinct from (rt.id is not null and rt.id in (select private.my_room_type_ids()))
          or private.room_type_is_public(rt.id) is distinct from (rt.id is not null and rt.id in (select private.public_room_type_ids()))
      union all
      select 1 where private.owns_listing(null) or private.listing_agent_is_me(null)
          or private.owns_business(null) or private.owns_accommodation(null) or private.owns_room_type(null)
          or private.business_is_public(null) or private.accommodation_is_public(null) or private.room_type_is_public(null)
    ) d;
    if bad <> 0 then
      raise exception 'PERF-DB 2: a set helper disagrees with its boolean helper (% rows) for caller %', bad, u;
    end if;
  end loop;
  perform set_config('request.jwt.claims', '', true);

  /* ---- rewrite the policies */
  select jsonb_agg(jsonb_build_object(
           's', schemaname, 't', tablename, 'p', policyname, 'cmd', cmd,
           'roles', roles::text, 'perm', permissive, 'q', qual, 'c', with_check))
    into before from pg_policies;

  for r in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('public', 'private')
       and tablename !~ '(wallet|escrow|custody)'
       and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ any_old
  loop
    q := r.qual; c := r.with_check;
    for i in 1 .. array_length(map, 1) loop
      q := regexp_replace(q, 'private\.' || map[i][1] || '\(' || col || '\)',
             '((\1 IS NOT NULL) AND (\1 IN (SELECT private.' || map[i][2] || '())))', 'g');
      c := regexp_replace(c, 'private\.' || map[i][1] || '\(' || col || '\)',
             '((\1 IS NOT NULL) AND (\1 IN (SELECT private.' || map[i][2] || '())))', 'g');
    end loop;
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
    changed := changed + 1;
  end loop;

  /* ---- 2. the same policies, commands, roles and kinds */
  select count(*) into bad from (
    select b->>'s', b->>'t', b->>'p', b->>'cmd', b->>'roles', b->>'perm' from jsonb_array_elements(before) b
    except
    select schemaname, tablename, policyname, cmd, roles::text, permissive from pg_policies
  ) x;
  if bad <> 0 or (select count(*) from pg_policies) <> jsonb_array_length(before) then
    raise exception 'PERF-DB 2: policy set changed (% differ)', bad;
  end if;

  /* ---- 3. reversed, every expression is the one it was */
  select count(*) into bad
    from jsonb_array_elements(before) b
    join pg_policies p on p.schemaname = b->>'s' and p.tablename = b->>'t' and p.policyname = b->>'p'
   where private.perf_db_2_reverse(coalesce(p.qual, '∅')) is distinct from coalesce(b->>'q', '∅')
      or private.perf_db_2_reverse(coalesce(p.with_check, '∅')) is distinct from coalesce(b->>'c', '∅');
  if bad <> 0 then
    select format('%s.%s: now [%s] reversed [%s] was [%s]', p.tablename, p.policyname,
                  coalesce(p.qual, p.with_check),
                  private.perf_db_2_reverse(coalesce(p.qual, p.with_check)),
                  coalesce(b->>'q', b->>'c'))
      into stmt
      from jsonb_array_elements(before) b
      join pg_policies p on p.schemaname = b->>'s' and p.tablename = b->>'t' and p.policyname = b->>'p'
     where private.perf_db_2_reverse(coalesce(p.qual, '∅')) is distinct from coalesce(b->>'q', '∅')
        or private.perf_db_2_reverse(coalesce(p.with_check, '∅')) is distinct from coalesce(b->>'c', '∅')
     limit 1;
    raise exception 'PERF-DB 2: % policy expressions do not reverse to what they were; first: %', bad, stmt;
  end if;

  /* ---- 4. no policy still asks per row */
  select count(*) into bad from pg_policies
   where (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ any_old;
  if bad <> 0 or changed = 0 then
    raise exception 'PERF-DB 2: % policies still call a per-row ownership helper (changed %)', bad, changed;
  end if;

  raise notice 'PERF-DB 2: % policies now ask ownership once per statement', changed;
end
$mig$;

drop function private.perf_db_2_reverse(text);
