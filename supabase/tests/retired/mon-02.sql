-- MON-02: the age-only hold releasers cannot be reached by an API role. An
-- admin, through their own signed-in client, and the service role both get
-- 42501 from admin_expire_stale_withdrawal_holds and
-- expire_stale_withdrawal_holds. Control: the verifying sweep's read path
-- (stale_withdrawal_holds for the service role) still answers. Rolls back.
do $$
declare
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  begin
    perform public.admin_expire_stale_withdrawal_holds(30);
    raise exception 'PROBE_FAIL mon-02: an admin can still run the age-only release';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role service_role;
  begin
    perform public.expire_stale_withdrawal_holds(30);
    raise exception 'PROBE_FAIL mon-02: the service role can still run the age-only release';
  exception when insufficient_privilege then null; end;
  select count(*) into n from public.stale_withdrawal_holds(30);
  reset role;
  raise exception 'PROBE_OK mon-02';
end $$;
