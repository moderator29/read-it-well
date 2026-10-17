-- ZZ-DIAG-PERFORMANCE: a read-only advisor run by the 17 October audit (lead).
-- Always reports through PROBE_FAIL; writes nothing. Delete after reading.
do $$
declare
  r jsonb := '{}'::jsonb;
begin
  -- Foreign keys with no index whose leading columns cover them.
  r := r || jsonb_build_object('fk_unindexed', (select coalesce(jsonb_agg(x order by x), '[]') from (
      select c.conrelid::regclass::text || '(' || string_agg(a.attname, ',' order by k.ord) || ')' as x
        from pg_constraint c
        join pg_namespace n on n.oid = c.connamespace and n.nspname = 'public'
        cross join lateral unnest(c.conkey) with ordinality k(attnum, ord)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
       where c.contype = 'f'
         and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey)
       group by c.conrelid, c.conname) s));
  -- Policies that call auth.uid() or auth.jwt() without a select wrapper (per-row re-evaluation).
  r := r || jsonb_build_object('rls_initplan', (select coalesce(jsonb_agg(tablename || '.' || policyname order by tablename), '[]') from pg_policies
       where schemaname = 'public'
         and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.(uid|jwt|role)\(\)'
         and (coalesce(qual, '') || coalesce(with_check, '')) !~ '\(\s*SELECT\s+auth\.(uid|jwt|role)\(\)'));
  -- Tables with more than one permissive policy for the same role and command.
  r := r || jsonb_build_object('multi_permissive', (select count(*) from (
       select p.tablename, p.cmd, rl from pg_policies p cross join unnest(p.roles) rl
        where p.schemaname = 'public' and p.permissive = 'PERMISSIVE'
        group by p.tablename, p.cmd, rl having count(*) > 1) s));
  -- Duplicate indexes (same table, same columns, same predicate).
  r := r || jsonb_build_object('dup_indexes', (select coalesce(jsonb_agg(x), '[]') from (
       select string_agg(i.indexrelid::regclass::text, ' = ') x from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
        group by i.indrelid, i.indkey::text, coalesce(pg_get_expr(i.indpred, i.indrelid), ''), coalesce(pg_get_expr(i.indexprs, i.indrelid), '')
       having count(*) > 1) s));
  -- Never-scanned non-unique indexes on tables bigger than 1000 rows.
  r := r || jsonb_build_object('unused_indexes', (select coalesce(jsonb_agg(s.indexrelname || '@' || s.relname), '[]') from pg_stat_user_indexes s
       join pg_index i on i.indexrelid = s.indexrelid join pg_class c on c.oid = s.relid
        where s.schemaname = 'public' and s.idx_scan = 0 and not i.indisunique and not i.indisprimary and c.reltuples > 1000));
  -- Biggest tables.
  r := r || jsonb_build_object('biggest', (select jsonb_agg(x) from (select c.relname || ':' || c.reltuples::bigint as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' order by c.reltuples desc limit 12) s));
  if true then
    raise exception 'PROBE_FAIL zz-diag-performance: %', r::text;
  end if;
  raise exception 'PROBE_OK zz-diag-performance';
end
$$;
