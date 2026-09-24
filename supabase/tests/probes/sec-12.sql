-- SEC-12 / DB-17: a filed identity document is fixed; an unfiled upload can
-- still be replaced (choosing a different file before submitting); an admin
-- cannot read documents straight from Storage with their own token.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin_id constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  unfiled constant text := '957b3bd2-cce3-425d-bba9-5cd876ca3d62/probe-sec12/idFront.jpg';
  filed constant text := '957b3bd2-cce3-425d-bba9-5cd876ca3d62/probe-sec12/idBack.jpg';
  n int;
begin
  -- Fixtures, as the connecting role: two objects in the member's folder, one
  -- of them filed against a document row. All of it rolls back.
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('agent-documents', unfiled, member, '{"size": 1}'::jsonb),
         ('agent-documents', filed, member, '{"size": 1}'::jsonb);
  insert into public.agent_documents (kind, storage_path, uploader_id) values ('identity', filed, member);
  perform set_config('storage.allow_delete_query', 'true', true);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: the member can still replace an unfiled upload (re-choosing a
  -- file: the Storage API's upsert on an existing path is this UPDATE).
  update storage.objects set metadata = '{"size": 2}'::jsonb where bucket_id = 'agent-documents' and name = unfiled;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL sec-12: control failed, an unfiled upload could not be replaced (% rows)', n; end if;

  -- REFUSAL: a filed document cannot be overwritten (nor upserted over) ...
  update storage.objects set metadata = '{"size": 9}'::jsonb where bucket_id = 'agent-documents' and name = filed;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL sec-12: the owner overwrote a filed document (% rows)', n; end if;

  -- ... nor deleted.
  delete from storage.objects where bucket_id = 'agent-documents' and name = filed;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL sec-12: the owner deleted a filed document (% rows)', n; end if;

  -- REFUSAL: an admin's own token reads no other person's document from Storage.
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id in ('agent-documents', 'host-documents') and name like member::text || '/%';
  if n <> 0 then raise exception 'PROBE_FAIL sec-12: an admin token read % document objects straight from Storage', n; end if;

  raise exception 'PROBE_OK sec-12: unfiled uploads replaceable, filed documents fixed, admin storage reads closed';
end;
$$;
