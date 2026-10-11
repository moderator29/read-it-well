-- P2 SOCIAL FOLLOW SUGGESTIONS (pending migration p2_social_follow_suggestions):
-- the function exists, is SECURITY DEFINER with a pinned search_path, is
-- executable by anon and authenticated and by nobody else; every row it
-- returns has a public handle and a kind from the five; no demo listing or
-- business is the reason for a row; a city filter only returns accounts with
-- published work in that city; a kind filter only returns that kind; and the
-- limit is capped at 50. Read-only: the block ends in a raise either way, so
-- nothing it touches survives.
do $$
declare
  fn regprocedure := 'public.social_follow_suggestions(text, text, text, integer, integer)'::regprocedure;
  r record;
  n integer;
  some_city text;
begin
  if not (select prosecdef from pg_proc where oid = fn) then
    raise exception 'PROBE_FAIL p2-social-follow-suggestions: not security definer';
  end if;
  if not exists (
    select 1 from pg_proc where oid = fn and array_to_string(proconfig, ',') like '%search_path=public, pg_temp%'
  ) then
    raise exception 'PROBE_FAIL p2-social-follow-suggestions: search_path not pinned';
  end if;
  if not has_function_privilege('anon', fn, 'execute')
     or not has_function_privilege('authenticated', fn, 'execute') then
    raise exception 'PROBE_FAIL p2-social-follow-suggestions: anon or authenticated cannot execute';
  end if;
  if has_function_privilege('public', fn, 'execute') then
    raise exception 'PROBE_FAIL p2-social-follow-suggestions: PUBLIC can execute';
  end if;

  for r in select * from public.social_follow_suggestions(null, null, null, 50, 0) loop
    if r.handle is null or r.kind not in ('agent', 'agency', 'landlord', 'hotel', 'restaurant') then
      raise exception 'PROBE_FAIL p2-social-follow-suggestions: bad row % %', r.handle, r.kind;
    end if;
    if not exists (
      select 1 from public.agents a join public.listings l on l.agent_id = a.id
      where a.user_id = r.user_id and l.status = 'PUBLISHED' and coalesce(l.is_demo, false) = false
      union all
      select 1 from public.businesses b
      where b.owner_id = r.user_id and b.status = 'PUBLISHED' and coalesce(b.is_demo, false) = false
    ) then
      raise exception 'PROBE_FAIL p2-social-follow-suggestions: % suggested with no published, non-demo work', r.handle;
    end if;
  end loop;

  select r2.city into some_city from public.social_follow_suggestions(null, null, null, 1, 0) r2;
  if some_city is not null then
    for r in select * from public.social_follow_suggestions(some_city, null, null, 50, 0) loop
      if not exists (
        select 1 from public.agents a join public.listings l on l.agent_id = a.id
        where a.user_id = r.user_id and l.status = 'PUBLISHED' and lower(btrim(l.city)) = lower(btrim(some_city))
        union all
        select 1 from public.businesses b
        where b.owner_id = r.user_id and b.status = 'PUBLISHED' and lower(btrim(b.city)) = lower(btrim(some_city))
      ) then
        raise exception 'PROBE_FAIL p2-social-follow-suggestions: % returned for % with no work there', r.handle, some_city;
      end if;
    end loop;
  end if;

  for r in select * from public.social_follow_suggestions(null, 'restaurant', null, 50, 0) loop
    if r.kind <> 'restaurant' then
      raise exception 'PROBE_FAIL p2-social-follow-suggestions: kind filter leaked %', r.kind;
    end if;
  end loop;

  select count(*) into n from public.social_follow_suggestions(null, null, null, 500, 0);
  if n > 50 then
    raise exception 'PROBE_FAIL p2-social-follow-suggestions: limit not capped (%)', n;
  end if;

  raise exception 'PROBE_OK p2-social-follow-suggestions';
end
$$;
