-- SUP-05 (with DB-08): "Needs more information" becomes a state an applicant
-- can answer, and an applicant can no longer decide their own application.
--
-- Before: agent_applications_update_draft allowed updates only while DRAFT,
-- so an application sent back as MORE_INFO_REQUIRED could not be answered,
-- and agent_documents_insert_own refused a document for it. At the same time
-- the update policy's WITH CHECK was only "it is mine", and the insert policy
-- the same, so an applicant could write their own row straight to APPROVED
-- with a reviewer and a review date of their choosing (DB-08).
--
-- Now:
--   * the applicant may edit while DRAFT or MORE_INFO_REQUIRED, and may move
--     it only to SUBMITTED (or leave it where it is);
--   * a guard trigger (the DB-01 shape: API roles only, staff pass) keeps
--     the reviewer's columns, the reference, the owner and, once submitted,
--     the fee terms and the supply role out of the applicant's hands, and
--     stamps submitted_at itself;
--   * documents can be attached while MORE_INFO_REQUIRED, only to a listing
--     the uploader owns, only replacing one of their own documents, and a
--     document an uploader files is always pending (nobody reviews their own
--     papers);
--   * the application reference is always the sequence's;
--   * applicant_response carries the applicant's answer to the reviewer's
--     note, so "your bvn" can be answered in words as well as with a file.

alter table public.agent_applications
  add column if not exists applicant_response text
  check (applicant_response is null or char_length(applicant_response) <= 2000);

comment on column public.agent_applications.applicant_response is
  'The applicant''s answer to the reviewer''s MORE_INFO_REQUIRED note (SUP-05). Written by the applicant when they send the application back.';

create or replace function private.guard_application_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  issued bigint;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- The reference is the sequence's, never the caller's. When the column
    -- default ran in this statement, currval is the number it issued and the
    -- reference matches it; anything else was supplied, and is replaced.
    begin
      issued := currval('public.agent_ref_seq');
    exception when others then
      issued := null;
    end;
    if issued is null or new.reference is distinct from 'VL-AGT-' || lpad(issued::text, 5, '0') then
      new.reference := 'VL-AGT-' || lpad(nextval('public.agent_ref_seq')::text, 5, '0');
    end if;
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'an application is filed as a draft or a submission'
        using errcode = '42501';
    end if;
    new.reviewer_id := null;
    new.reviewed_at := null;
    new.review_notes := null;
    new.submitted_at := case when new.status = 'SUBMITTED' then now() else null end;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.reference is distinct from old.reference
     or new.reviewer_id is distinct from old.reviewer_id
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_notes is distinct from old.review_notes then
    raise exception 'the review of an application is written by Vallo staff'
      using errcode = '42501';
  end if;

  if old.status <> 'DRAFT'
     and (new.agency_fee_bps is distinct from old.agency_fee_bps
          or new.legal_fee_bps is distinct from old.legal_fee_bps
          or new.supply_role is distinct from old.supply_role) then
    raise exception 'the fee terms and the role are fixed once an application is sent'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (old.status in ('DRAFT', 'MORE_INFO_REQUIRED') and new.status = 'SUBMITTED') then
      raise exception 'an applicant cannot move an application from % to %', old.status, new.status
        using errcode = '42501';
    end if;
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_application_write() from public, anon, authenticated;

create trigger agent_applications_00_guard_applicant_write
  before insert or update on public.agent_applications
  for each row execute function private.guard_application_write();

drop policy agent_applications_update_draft on public.agent_applications;
create policy agent_applications_update_own on public.agent_applications
  for update
  using ((select auth.uid()) = user_id and status in ('DRAFT', 'MORE_INFO_REQUIRED'))
  with check ((select auth.uid()) = user_id and status in ('DRAFT', 'MORE_INFO_REQUIRED', 'SUBMITTED'));

drop policy agent_applications_insert_own on public.agent_applications;
create policy agent_applications_insert_own on public.agent_applications
  for insert
  with check ((select auth.uid()) = user_id
              and status in ('DRAFT', 'SUBMITTED')
              and reviewer_id is null and reviewed_at is null);

drop policy agent_documents_insert_own on public.agent_documents;
create policy agent_documents_insert_own on public.agent_documents
  for insert
  with check (
    uploader_id = (select auth.uid())
    and (listing_id is null or private.owns_listing(listing_id))
    and (application_id is null
         or exists (select 1 from public.agent_applications a
                     where a.id = agent_documents.application_id
                       and a.user_id = (select auth.uid())
                       and a.status in ('DRAFT', 'SUBMITTED', 'MORE_INFO_REQUIRED'))));

-- A document an applicant files is pending review, whatever the insert said,
-- and it may only supersede one of the uploader's own documents.
create or replace function private.guard_document_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return new;
  end if;
  if new.supersedes_id is not null
     and not exists (select 1 from public.agent_documents d
                      where d.id = new.supersedes_id and d.uploader_id = uid) then
    raise exception 'a document can only replace one of your own'
      using errcode = '42501';
  end if;
  new.review_status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.rejection_reason := null;
  return new;
end;
$$;

revoke all on function private.guard_document_write() from public, anon, authenticated;

create trigger agent_documents_00_guard_uploader_write
  before insert on public.agent_documents
  for each row execute function private.guard_document_write();
