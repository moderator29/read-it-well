-- DB-18: the two functions the advisor named run with a pinned search_path
-- and still answer as before; verification_is_required answers for any user
-- id, so only the service role may call it.
do $$
declare
  n int;
begin
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where ((s.nspname = 'private' and p.proname = 'escrow_evidence_is_append_only')
       or (s.nspname = 'public' and p.proname = 'badge_tier'))
     and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%');
  if n <> 2 then raise exception 'PROBE_FAIL db-18: % of 2 functions pin search_path', n; end if;
  if public.badge_tier(true, false)::text <> 'platinum' or public.badge_tier(false, true)::text <> 'gold'
     or public.badge_tier(false, false)::text <> 'none' then
    raise exception 'PROBE_FAIL db-18: badge_tier answers differently';
  end if;
  if has_function_privilege('authenticated', 'public.verification_is_required(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.verification_is_required(uuid)', 'EXECUTE') then
    raise exception 'PROBE_FAIL db-18: a client can ask verification_is_required about anybody';
  end if;
  if not has_function_privilege('service_role', 'public.verification_is_required(uuid)', 'EXECUTE') then
    raise exception 'PROBE_FAIL db-18: the service role lost verification_is_required';
  end if;
  raise exception 'PROBE_OK db-18';
end
$$;
