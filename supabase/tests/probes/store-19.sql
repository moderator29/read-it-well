-- STORE-19: the 18-or-over statement has a place in terms_acceptances, only
-- the server can write it, and nothing else can be recorded as a document.
-- Always rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
begin
  -- Control: the server (the table owner here) records the statement.
  insert into public.terms_acceptances (user_id, document, version, source)
  values (member, 'age_18_or_over', '18+', 'probe')
  on conflict do nothing;
  if not exists (select 1 from public.terms_acceptances
                  where user_id = member and document = 'age_18_or_over' and version = '18+') then
    raise exception 'PROBE_FAIL store-19: the server could not record the age statement';
  end if;

  -- An unknown document is still refused by the check.
  begin
    insert into public.terms_acceptances (user_id, document, version, source)
    values (member, 'anything_else', '1', 'probe');
    raise exception 'PROBE_FAIL store-19: an unknown document was recorded';
  exception when check_violation then null;
  end;

  -- A member cannot write their own statement: there is no insert policy.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    insert into public.terms_acceptances (user_id, document, version, source)
    values (member, 'age_18_or_over', '18+', 'forged');
    raise exception 'PROBE_FAIL store-19: a member wrote their own age statement';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise exception 'PROBE_OK store-19';
end $$;
