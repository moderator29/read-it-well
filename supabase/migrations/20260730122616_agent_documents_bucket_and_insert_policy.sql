-- Somewhere for agent verification documents to actually live.
--
-- Until now the apply wizard read the chosen file, made a blob URL for the
-- preview and threw the bytes away when the tab closed. agent_documents had
-- RLS, a covering index and an admin read policy, and not one row had ever been
-- written, so the admin reviewer saw "0 documents" on every application and
-- could not verify anybody. This is the storage half of closing that.
--
-- THE BUCKET IS PRIVATE, and that is not a preference. These objects are
-- driving licences, voter cards, NINs and CAC certificates. A public bucket
-- serves straight from the CDN to anyone holding the path, so identity
-- documents in one would be an identity theft supply line. Nothing here is ever
-- served publicly: the reviewer reads through a short-lived signed URL.
--
-- Path convention carries the ownership claim, exactly like listing-photos:
--   <auth uid>/<application id>/<kind>-<uuid>.<ext>
-- so storage RLS can decide access from the first path segment alone, and the
-- application row it belongs to is readable from the second.

insert into storage.buckets (id, name, public)
values ('agent-documents', 'agent-documents', false)
on conflict (id) do nothing;

-- The applicant owns their own folder and nothing else. Read included, so the
-- wizard can show a real preview of what was actually uploaded rather than a
-- local blob that may not match what the server holds.
create policy agent_documents_objects_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agent-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy agent_documents_objects_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'agent-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Replacing a blurry photo of an ID is a normal thing to need to do, right up
-- until a reviewer has the application in front of them.
create policy agent_documents_objects_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'agent-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'agent-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy agent_documents_objects_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'agent-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- The reviewer. Read only, and only for the two admin roles, because approving
-- an agent is exactly the job that requires seeing the document.
create policy agent_documents_objects_admin_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'agent-documents'
    and (
      private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin')
    )
  );

-- The row-level half. The original policy only allowed a document row while the
-- application was still DRAFT, but this platform's wizard files the application
-- as SUBMITTED in one action, so that policy could never have been satisfied by
-- the real flow: it would have refused every document row ever attempted.
-- SUBMITTED is therefore allowed too, and APPROVED and REJECTED are still
-- refused, so nobody can add paperwork to an application after it is decided.
drop policy if exists agent_documents_insert_own on public.agent_documents;
create policy agent_documents_insert_own
  on public.agent_documents for insert
  with check (exists (
    select 1 from public.agent_applications a
    where a.id = agent_documents.application_id
      and a.user_id = (select auth.uid())
      and a.status in ('DRAFT', 'SUBMITTED')
  ));
