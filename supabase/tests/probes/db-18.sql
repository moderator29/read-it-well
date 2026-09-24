-- DB-18: the two functions the advisor named run with a pinned search_path
-- and still answer as before.
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
  raise exception 'PROBE_OK db-18';
end
$$;
