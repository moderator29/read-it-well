-- Applied to live as 20260922224616 and recorded here from
-- supabase_migrations.schema_migrations, so the repository carries every
-- migration the database has run. The SQL is as applied.

do $guard$
declare
  def text := pg_get_functiondef('private.escrow_invariants_check()'::regprocedure);
begin
  if def ~ '\mtitle\s*=\s*title\M' then
    raise exception
      'private.escrow_invariants_check() compares a column with a same-named variable again. The deduplication would go quiet after its first finding.';
  end if;

  if position('ra.entity_id' in def) = 0 then
    raise exception
      'private.escrow_invariants_check() no longer deduplicates on the invariant name. Read 20260923011500 before changing it.';
  end if;
end;
$guard$;
