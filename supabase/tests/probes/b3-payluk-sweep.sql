-- B3-PAYLUK-SWEEP: the commission sweep log is the server's, append only, and
-- read by finance staff only through the desk function.
-- Needs supabase/migrations/pending/b3_payluk_commission_sweep.sql applied.
--  1. a row writes; an edit of it is refused
--  2. a failed run must carry an error code
--  3. a member reads 0 rows and gets 'forbidden' from the desk function
do $$
declare
  rid uuid;
  n int;
  j jsonb;
begin
  insert into public.payluk_commission_sweeps (environment, outcome, main_balance_minor, escrow_balance_minor, currency)
  values ('staging', 'withdrawal_unavailable', 123450, 0, 'NGN') returning id into rid;
  begin
    update public.payluk_commission_sweeps set main_balance_minor = 0 where id = rid;
    raise exception 'PROBE_FAIL b3-payluk-sweep 1: a sweep row was edited';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.payluk_commission_sweeps where id = rid;
    raise exception 'PROBE_FAIL b3-payluk-sweep 1b: a sweep row was deleted';
  exception when insufficient_privilege then null;
  end;
  begin
    truncate public.payluk_commission_sweeps;
    raise exception 'PROBE_FAIL b3-payluk-sweep 1c: the sweep log was truncated';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.payluk_commission_sweeps (environment, outcome) values ('staging', 'failed');
    raise exception 'PROBE_FAIL b3-payluk-sweep 2: a failure without a code was written';
  exception when check_violation then null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', '957b3bd2-cce3-425d-bba9-5cd876ca3d62', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select count(*) into n from public.payluk_commission_sweeps;
    raise exception 'PROBE_FAIL b3-payluk-sweep 3a: a member read % sweep rows', n;
  exception when insufficient_privilege then null;
  end;
  j := public.admin_payluk_commission_sweep();
  if j->>'status' <> 'forbidden' then
    raise exception 'PROBE_FAIL b3-payluk-sweep 3b: a member got the desk: %', j->>'status';
  end if;
  reset role;

  raise exception 'PROBE_OK b3-payluk-sweep';
end $$;
