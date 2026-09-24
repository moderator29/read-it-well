-- MON-07: "spendable" is computed in exactly one place,
-- private.wallet_spendable_locked(uuid).
--
-- The guard in migration 20260922221800 asserted this with the regex
-- status\s*=\s*'PENDING'\s*and\s*direction\s*=\s*'debit', which cannot see an
-- aliased column (`e.status = 'PENDING' and e.direction = 'debit'`) or the
-- clauses in the other order, so it passed while public.move_into_pot kept its
-- own copy of the arithmetic. This asks the question independently of
-- spelling: which function bodies sum ledger rows AND mention a PENDING status
-- AND a debit direction, in any order, with or without a table alias.
--
-- Control: the pattern must find wallet_spendable_locked itself, so a pattern
-- that has gone blind (the failure this probe exists to stop) is red too.
do $$
declare
  hits text[];
begin
  select array_agg(p.oid::regprocedure::text order by 1)
    into hits
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosrc ~* '(\m\w+\.)?status\s*=\s*''PENDING'''
     and p.prosrc ~* '(\m\w+\.)?direction\s*=\s*''debit'''
     and p.prosrc ~* '\msum\s*\(';

  if hits is null or not ('private.wallet_spendable_locked(uuid)' = any (hits)) then
    raise exception 'PROBE_FAIL mon-07: control, the pattern no longer finds private.wallet_spendable_locked, so it is blind (hits: %)', hits;
  end if;
  hits := array_remove(hits, 'private.wallet_spendable_locked(uuid)');
  if cardinality(hits) > 0 then
    raise exception 'PROBE_FAIL mon-07: spendable is still computed outside private.wallet_spendable_locked in: %', array_to_string(hits, ', ');
  end if;

  raise exception 'PROBE_OK mon-07: spendable is computed in one function only';
end;
$$;
