/*
 * THE PROBE EARNED ITS KEEP ON ITS FIRST RUN, AND THIS IS THE RECORD OF IT.
 *
 * The revision of `private.escrow_invariants_check()` that reached the live
 * database first declared a variable called `title` and then wrote:
 *
 *     where status = 'open' and title = title and entity_type = ...
 *
 * Postgres refuses that as ambiguous, which is the lucky half of the outcome.
 * Had the variable been named anything the table does not also use, the
 * condition would have been a tautology, the `not exists` would have been
 * false the moment ANY open escrow alert existed, and the second and every
 * later breach kind would never have opened an alert at all. A check that goes
 * quiet after its first finding is worse than no check, and it would have
 * looked like a check that was passing.
 *
 * It was found because `scripts/probes/escrow_invariants.sql` seeds a real
 * breach and asserts the check catches it, rather than asserting the function
 * exists. The function existed and did not work.
 *
 * The live database was corrected by replacing the body. The corrected body is
 * what `20260923011000` carries in this repository, so a database built from
 * these files never sees the fault. This migration is the standing guard
 * against it coming back, and the note that it was once there.
 */

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
