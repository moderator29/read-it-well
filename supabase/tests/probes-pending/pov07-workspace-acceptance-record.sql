-- POV07 (pending migration pov07_workspace_acceptance_record): an
-- application carries its consents like a host's business does, and the one
-- reader accepts only a dated, versioned entry for the named document.
-- Everything is rolled back by the final raise.
do $$
declare
  good constant jsonb := jsonb_build_object('agreements', jsonb_build_array(
    jsonb_build_object('document', 'terms', 'version', '2026-10-13', 'at', '2026-10-13T10:00:00Z'),
    jsonb_build_object('document', 'privacy', 'version', '2026-09-25', 'at', '2026-10-13T10:00:00Z'),
    jsonb_build_object('document', 'pay_on_vallo', 'version', '2026-10-13', 'at', '2026-10-13T10:00:00Z')));
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'agent_applications' and column_name = 'consents'
                    and is_nullable = 'NO') then
    raise exception 'PROBE_FAIL pov07-workspace-acceptance-record: agent_applications.consents is missing';
  end if;
  if not private.consents_accepted(good, 'terms') or not private.consents_accepted(good, 'privacy')
     or not private.consents_accepted(good, 'pay_on_vallo') then
    raise exception 'PROBE_FAIL pov07-workspace-acceptance-record: a recorded acceptance was not read';
  end if;
  if private.consents_accepted(good, 'host_agreement') then
    raise exception 'PROBE_FAIL pov07-workspace-acceptance-record: a document never accepted was read as accepted';
  end if;
  if private.consents_accepted('{}'::jsonb, 'terms')
     or private.consents_accepted('{"agreements": "yes"}'::jsonb, 'terms')
     or private.consents_accepted('{"agreements": [{"document": "terms"}]}'::jsonb, 'terms')
     or private.consents_accepted('{"agreements": [{"document": "terms", "version": "1"}]}'::jsonb, 'terms')
     or private.consents_accepted(null, 'terms') is true then
    raise exception 'PROBE_FAIL pov07-workspace-acceptance-record: an undated or unversioned entry was read as accepted';
  end if;
  if has_function_privilege('authenticated', 'private.consents_accepted(jsonb, text)', 'execute') then
    raise exception 'PROBE_FAIL pov07-workspace-acceptance-record: a member can call the reader';
  end if;
  raise exception 'PROBE_OK pov07-workspace-acceptance-record';
end
$$;
