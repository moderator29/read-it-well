-- P-7, THE EXECUTE HALF, WITH A CONTROL THAT ANSWERS.
--
-- Run through `mcp__Supabase__apply_migration` against the live project. It
-- ENDS IN A DELIBERATE `raise exception`, so the whole transaction rolls back
-- and nothing reaches a live product table.
--
-- WHAT P-7 ASKS. "An anon key and a plain authenticated user key call each of
-- the revoked verbs and each must receive a permission error, not a
-- business-logic answer."
--
-- THAT SENTENCE HAS TWO LAYERS AND THIS FILE ANSWERS ONE OF THEM.
--
--   The EXECUTE layer: does Postgres refuse `anon` and `authenticated` on
--   these function signatures? That is what this file proves, by switching to
--   each role inside a transaction and calling every verb.
--
--   The HTTP layer: does PostgREST, with a real anon key and a real user JWT,
--   also refuse? That is `escrow_revoke.sh` and IT HAS STILL NOT RUN. The
--   egress policy in this sandbox denies `*.supabase.co`, re-checked on
--   23 September. See escrow_revoke.log. The two are not the same question:
--   PostgREST can expose an overload the catalogue no longer names, and its
--   schema cache can serve something the grants no longer permit.
--
-- WHY THE CONTROL IS NOT OPTIONAL. Twenty two refusals in a row look exactly
-- like twenty two closed doors AND exactly like a harness whose `set role`
-- never reached a function body. The previous run of the HTTP half reported
-- FAIL for precisely this reason and was right to. So this probe ends by
-- calling `escrow_admin_resolve` UNDER THE SAME ROLE SWITCH, IN THE SAME
-- TRANSACTION. That function KEEPS its grant to `authenticated` on purpose,
-- because an admin is an authenticated user and the function guards itself at
-- its own boundary. It must come back speaking escrow's own vocabulary. It
-- returns `{"status": "forbidden"}`, which is a business answer: the role
-- switch reaches function bodies, so the refusals above are refusals.
do $probe$
declare
  verbs text[] := array[
    'select public.escrow_fund_from_wallet(null, null, ''agency_fee''::escrow_purpose, 1, ''p'', 21)',
    'select public.escrow_fund_from_wallet_as(null, null, null, ''agency_fee''::escrow_purpose, 1, ''p'', 21)',
    'select public.escrow_confirm(null)',
    'select public.escrow_request_release(null)',
    'select public.escrow_raise_dispute(null, ''p'')',
    'select public.escrow_hold(null, null, 1, ''p'', null, 21)',
    'select public.escrow_cancel_as(null, null, ''p'')',
    'select public.escrow_propose_as(null, null, null, ''agency_fee''::escrow_purpose, 1, true)',
    'select public.escrow_fund_proposal_as(null, null, 21)',
    'select public.escrow_open(null, null, null, ''agency_fee''::escrow_purpose, 1)',
    'select public.escrow_file_evidence_as(null, null, ''fact''::escrow_evidence_kind, null, null, null, null, null, null, null, null)'
  ];
  who text;
  stmt text;
  refused integer := 0;
  reached integer := 0;
  control jsonb;
  control_answered boolean := false;
begin
  foreach who in array array['anon', 'authenticated'] loop
    foreach stmt in array verbs loop
      begin
        execute format('set local role %I', who);
        execute stmt;
        execute 'set local role none';
        reached := reached + 1;
        raise exception
          'PROBE FAILED. Role % executed the body of: %', who, stmt;
      exception
        when insufficient_privilege then
          execute 'set local role none';
          refused := refused + 1;
        when others then
          execute 'set local role none';
          if sqlstate = 'P0001' then raise; end if;
          raise exception
            'PROBE FAILED. Role % got % (%) from %, which is not a permission refusal.',
            who, sqlstate, sqlerrm, stmt;
      end;
    end loop;
  end loop;

  begin
    execute 'set local role authenticated';
    execute 'select public.escrow_admin_resolve(null, ''refund'', ''a control call, twenty plus characters'')'
      into control;
    execute 'set local role none';
    control_answered := control is not null and (control ? 'status');
  exception
    when others then
      execute 'set local role none';
      raise exception
        'PROBE INCONCLUSIVE. The control call did not answer either (% %), so the refusals above prove nothing about the grants.',
        sqlstate, sqlerrm;
  end;

  if not control_answered then
    raise exception
      'PROBE INCONCLUSIVE. The control returned % rather than a business answer.', control;
  end if;

  raise exception
    'PROBE ALL PASS (rolled back). % refusals over 11 verbs and 2 roles, 0 reached a body. THE CONTROL ANSWERED: escrow_admin_resolve, under role authenticated in the same transaction, returned %. This is the EXECUTE layer; the HTTP layer is a separate claim and is not made here.',
    refused, control;
end
$probe$;
