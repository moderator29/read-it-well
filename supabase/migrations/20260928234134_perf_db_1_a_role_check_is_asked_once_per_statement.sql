/*
 * PERF-DB 1. A ROLE CHECK IS ASKED ONCE PER STATEMENT, NOT ONCE PER ROW.
 *
 * WHY. 126 row-level policies call `private.has_role((select auth.uid()),
 * '<role>')` (and a few call `private.is_staff()` / `private.show_me_open()`)
 * as a bare function call. The argument is already an init-plan, but the call
 * itself is not: Postgres cannot fold a SECURITY DEFINER SQL function, so it
 * runs it for EVERY candidate row, and each run is a fresh query on
 * `user_roles` (532K sequential scans on an 18-row table) or `feature_flags`.
 * Because permissive policies are OR'd, every signed-out and signed-in read of
 * listings, catalogue_entries, room_types, rate_plans, rate_calendar,
 * room_inventory and the rest pays this per row, including inside
 * `stays_search`'s per-entry LATERAL.
 *
 * WHAT. Each such call is wrapped as `(select <the same call>)`, which the
 * planner turns into an init-plan evaluated at most once per statement. The
 * function, its arguments, the policy's name, command, roles and
 * permissive/restrictive kind are all unchanged: `ALTER POLICY ... USING /
 * WITH CHECK` touches only the expression. The functions are STABLE with
 * constant arguments, so one evaluation per statement returns exactly what the
 * per-row evaluation returned.
 *
 * SCOPE. Policies in `public` and `private` only (storage.objects is owned by
 * supabase_storage_admin and is left alone). Money tables are excluded on
 * purpose (wallet, escrow, custody, ledger, payouts, rent payments, refunds,
 * guarantees, bank/payment methods); they are low-traffic and out of scope.
 *
 * PROOF (the DO block raises, and the migration rolls back, unless all hold):
 *   - the same set of policies exists before and after (name, table, cmd,
 *     roles, permissive);
 *   - for EVERY policy, the expression with the `(select ...)` wrapper removed
 *     is textually identical to the expression before;
 *   - no targeted policy still holds a bare call.
 */
do $mig$
declare
  wrap_re   constant text := '(?<!SELECT )(private\.has_role\(\( SELECT auth\.uid\(\) AS uid\), ''[a-z_]+''::app_role\)|private\.is_staff\(\)|private\.show_me_open\(\))';
  unwrap_re constant text := '\( SELECT (private\.(?:has_role\(\( SELECT auth\.uid\(\) AS uid\), ''[a-z_]+''::app_role\)|is_staff\(\)|show_me_open\(\))) AS (?:has_role|is_staff|show_me_open)\)';
  excluded  constant text[] := array[
    'account_money_holds','bank_accounts','booking_refunds','ledger_entries',
    'payment_methods','payout_accounts','rent_payments','rent_refunds_owed',
    'transactions','guarantee_claims','guarantee_reserve_entries',
    'deal_agreements','deal_agreement_events','money_policy'];
  before    jsonb;
  r         record;
  new_q     text;
  new_c     text;
  stmt      text;
  changed   int := 0;
  bad       int;
begin
  select jsonb_agg(jsonb_build_object(
           's', schemaname, 't', tablename, 'p', policyname, 'cmd', cmd,
           'roles', roles::text, 'perm', permissive, 'q', qual, 'c', with_check))
    into before
    from pg_policies;

  for r in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('public', 'private')
       and tablename <> all (excluded)
       and tablename !~ '(wallet|escrow|custody)'
       and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ wrap_re
  loop
    new_q := case when r.qual is null then null
                  else regexp_replace(r.qual, wrap_re, '(SELECT \1)', 'g') end;
    new_c := case when r.with_check is null then null
                  else regexp_replace(r.with_check, wrap_re, '(SELECT \1)', 'g') end;
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if new_q is not null then stmt := stmt || format(' using (%s)', new_q); end if;
    if new_c is not null then stmt := stmt || format(' with check (%s)', new_c); end if;
    execute stmt;
    changed := changed + 1;
  end loop;

  /* Read-back 1: the same policies, the same commands, roles and kinds. */
  select count(*) into bad
    from (
      select b->>'s' s, b->>'t' t, b->>'p' p, b->>'cmd' cmd, b->>'roles' roles, b->>'perm' perm
        from jsonb_array_elements(before) b
      except
      select schemaname, tablename, policyname, cmd, roles::text, permissive from pg_policies
    ) x;
  if bad <> 0 or (select count(*) from pg_policies) <> jsonb_array_length(before) then
    raise exception 'PERF-DB 1: policy set changed (% differ)', bad;
  end if;

  /* Read-back 2: every expression, unwrapped, equals the expression before. */
  select count(*) into bad
    from jsonb_array_elements(before) b
    join pg_policies p
      on p.schemaname = b->>'s' and p.tablename = b->>'t' and p.policyname = b->>'p'
   where regexp_replace(coalesce(p.qual, '∅'), unwrap_re, '\1', 'g')
           is distinct from regexp_replace(coalesce(b->>'q', '∅'), unwrap_re, '\1', 'g')
      or regexp_replace(coalesce(p.with_check, '∅'), unwrap_re, '\1', 'g')
           is distinct from regexp_replace(coalesce(b->>'c', '∅'), unwrap_re, '\1', 'g');
  if bad <> 0 then
    raise exception 'PERF-DB 1: % policy expressions are not the same call once unwrapped', bad;
  end if;

  /* Read-back 3: nothing targeted is left bare. */
  select count(*) into bad
    from pg_policies
   where schemaname in ('public', 'private')
     and tablename <> all (excluded)
     and tablename !~ '(wallet|escrow|custody)'
     and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ wrap_re;
  if bad <> 0 or changed = 0 then
    raise exception 'PERF-DB 1: % policies still call a role helper per row (changed %)', bad, changed;
  end if;

  raise notice 'PERF-DB 1: % policies now ask their role check once per statement', changed;
end
$mig$;
