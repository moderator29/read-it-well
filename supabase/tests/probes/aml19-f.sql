-- AML-19 (f): the ruling door itself answers 'conflicted' to a super admin who
-- opened the escrow, before any state, float or money check. Rolls back.
do $$
declare
  payer  constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  payee  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  opener constant uuid := '67c5afad-d144-450f-ba18-ad3586f40917';
  e uuid; r jsonb;
begin
  insert into public.user_roles (user_id, role) values (opener, 'super_admin') on conflict do nothing;
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (payer, payee, 'agency_fee', 100000, opener) returning id into e;
  perform set_config('request.jwt.claims', json_build_object('sub', opener, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.escrow_admin_resolve(e, 'refund', 'A ruling from the person who opened it.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if r ->> 'status' <> 'conflicted' then
    raise exception 'PROBE_FAIL aml19-f: the opener''s ruling was %, not conflicted', r;
  end if;
  raise exception 'PROBE_OK aml19-f';
end $$;
