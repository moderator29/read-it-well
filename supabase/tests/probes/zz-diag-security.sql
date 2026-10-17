-- ZZ-DIAG-SECURITY: a read-only advisor run by the 17 October audit (lead),
-- because the session's connector cannot reach the project. It always reports
-- through PROBE_FAIL with what it found; it writes nothing. Delete after reading.
do $$
declare
  r jsonb := '{}'::jsonb;
begin
  r := r || jsonb_build_object('rls_off', (select coalesce(jsonb_agg(c.relname order by c.relname), '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity));
  r := r || jsonb_build_object('rls_no_policy', (select coalesce(jsonb_agg(c.relname order by c.relname), '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p') and c.relrowsecurity
          and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
          and (has_table_privilege('authenticated', c.oid, 'select') or has_table_privilege('anon', c.oid, 'select'))));
  r := r || jsonb_build_object('definer_public_anon_exec', (select coalesce(jsonb_agg(p.proname order by p.proname), '[]') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')));
  r := r || jsonb_build_object('definer_no_search_path', (select coalesce(jsonb_agg(n.nspname || '.' || p.proname), '[]') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public','private') and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')));
  r := r || jsonb_build_object('views_definer', (select coalesce(jsonb_agg(c.relname), '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v' and not coalesce((select bool_or(o = 'security_invoker=true' or o = 'security_invoker=on') from unnest(c.reloptions) o), false)));
  r := r || jsonb_build_object('flags_triggers', (select coalesce(jsonb_agg(t.tgname || ':' || t.tgenabled || ':' || t.tgfoid::regproc::text), '[]') from pg_trigger t where t.tgrelid = 'public.feature_flags'::regclass and not t.tgisinternal));
  r := r || jsonb_build_object('flag_guard_refuses_wallet', (select pg_get_functiondef('private.guard_feature_flag_write()'::regprocedure) like '%''wallet''%'));
  r := r || jsonb_build_object('booking_is_paid_def', (select regexp_replace(pg_get_functiondef('private.booking_is_paid(uuid)'::regprocedure), '\s+', ' ', 'g')));
  r := r || jsonb_build_object('storage_public_buckets', (select coalesce(jsonb_agg(id), '[]') from storage.buckets where public));
  if true then
    raise exception 'PROBE_FAIL zz-diag-security: %', r::text;
  end if;
  raise exception 'PROBE_OK zz-diag-security';
end
$$;
