-- SEC-12 / DB-17: an identity document cannot be replaced or deleted by its
-- uploader once it has been filed against an application, and admins read
-- documents only through the audited viewer route.
--
-- Before: `*_objects_update_own` and `*_delete_own` on `agent-documents` and
-- `host-documents` let the owner overwrite or delete any object in their own
-- folder at any time, so an approved ID could be swapped after the reviewer
-- looked. And `*_objects_admin_select` let any admin read a document straight
-- from Storage with their own token, skipping `/api/documents/[id]` and its
-- `document.viewed` audit row.
--
-- After: UPDATE and DELETE by the owner still work on an object that is NOT
-- yet filed (no `agent_documents` / `business_documents` row names it), so
-- choosing a different file for a slot before submitting keeps working,
-- including for the deployed uploaders that upsert to a fixed slot path. Once a
-- row names the object it is fixed: only the service role (the account purge)
-- can remove it, and a resubmission is a new upload at a new path. The admin
-- storage SELECT policies go; the viewer route reads with the service role.

create or replace function private.kyc_object_is_filed(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_bucket
    when 'agent-documents' then exists (select 1 from public.agent_documents d where d.storage_path = p_name)
    when 'host-documents'  then exists (select 1 from public.business_documents d where d.storage_path = p_name)
    else false
  end;
$$;

revoke all on function private.kyc_object_is_filed(text, text) from public, anon;
-- The policies below apply to authenticated and call this, so it must stay executable by it.
grant execute on function private.kyc_object_is_filed(text, text) to authenticated;

alter policy agent_documents_objects_update_own on storage.objects
  using (bucket_id = 'agent-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name))
  with check (bucket_id = 'agent-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name));

alter policy agent_documents_objects_delete_own on storage.objects
  using (bucket_id = 'agent-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name));

alter policy host_documents_objects_update_own on storage.objects
  using (bucket_id = 'host-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name))
  with check (bucket_id = 'host-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name));

alter policy host_documents_objects_delete_own on storage.objects
  using (bucket_id = 'host-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.kyc_object_is_filed(bucket_id, name));

drop policy if exists agent_documents_objects_admin_select on storage.objects;
drop policy if exists host_documents_objects_admin_select on storage.objects;
