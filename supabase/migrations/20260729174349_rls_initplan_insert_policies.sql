-- Finish the init-plan rewrite: the insert-only policies.
--
-- The previous pass guarded with `qual not like ...`, and an INSERT policy has
-- no USING clause, so its qual is NULL and the comparison yielded NULL rather
-- than true: twelve policies were quietly skipped. The guards below are
-- null-safe through coalesce, so every remaining policy carrying a bare
-- auth.uid() is rewritten. Same mechanical change, same semantics: evaluate
-- the caller's id once per statement rather than once per row.

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
      and coalesce(qual, '') not like '%( SELECT auth.uid()%'
      and coalesce(with_check, '') not like '%( SELECT auth.uid()%'
  loop
    execute format(
      'alter policy %I on public.%I%s%s',
      p.policyname,
      p.tablename,
      case when p.qual is not null
        then ' using (' || replace(p.qual, 'auth.uid()', '(select auth.uid())') || ')'
        else '' end,
      case when p.with_check is not null
        then ' with check (' || replace(p.with_check, 'auth.uid()', '(select auth.uid())') || ')'
        else '' end
    );
  end loop;
end $$;
