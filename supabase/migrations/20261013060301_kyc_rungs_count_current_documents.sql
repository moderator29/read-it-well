-- Applied 13 October 2026 (part 1 of 2). Two fixes to the verification ladder, found while
-- walking the landlord, agent and professional applications.
--
-- 1. A RESUBMITTED DOCUMENT COULD NEVER PASS ITS RUNG.
--
--    `private.review_kyc_document` decides the identity or address rung from
--    bool_and(review_status = 'approved') over EVERY document of that kind the
--    person has ever filed. A rejected document is never edited or deleted:
--    a resubmission is a new row whose `supersedes_id` names the one it
--    replaces (20260809052558). So once any identity document had been
--    rejected, the rejected row stayed in the set for ever, bool_and stayed
--    false, and approving the replacement left the rung at "Waiting on a
--    document." The only way past was a reviewer recording the rung by hand.
--    Measured on the live definition on 13 October 2026: the body uses
--    bool_and and never mentions supersedes_id.
--
--    Now only CURRENT documents count: a row that a later row supersedes is
--    history. Both sides of a two sided ID stay current (neither supersedes
--    the other), so both must still be approved. The app side files the
--    supersedes chain on every resubmission path
--    (apps/web/src/lib/agent/supersedes.ts).
--

set lock_timeout = '5s';
create or replace function private.review_kyc_document(acting_admin uuid, p_document uuid, p_approve boolean, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  doc public.agent_documents;
  owner_user uuid;
  target_agent uuid;
  rung text;
  all_approved boolean;
begin
  if acting_admin is null or not private.staff_can(acting_admin, 'kyc_review') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not p_approve and (p_reason is null or char_length(btrim(p_reason)) < 8) then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into doc from public.agent_documents where id = p_document for update;
  if doc.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  owner_user := coalesce(
    doc.uploader_id,
    (select a.user_id from public.agent_applications a where a.id = doc.application_id)
  );
  if owner_user = acting_admin then
    return jsonb_build_object('status', 'own_document');
  end if;

  update public.agent_documents
     set review_status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = acting_admin,
         reviewed_at = now(),
         rejection_reason = case when p_approve then null else btrim(p_reason) end
   where id = doc.id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    acting_admin,
    case when p_approve then 'kyc.document.approved' else 'kyc.document.rejected' end,
    'agent_document', doc.id::text,
    jsonb_build_object(
      'kind', doc.kind,
      'subtype', doc.subtype,
      'subject_user', owner_user,
      'reason', case when p_approve then null else btrim(p_reason) end
    )
  );

  rung := case doc.kind when 'identity' then 'identity' when 'address' then 'address' else null end;
  select a.id into target_agent from public.agents a where a.user_id = owner_user;

  if rung is not null and target_agent is not null then
    select bool_and(d.review_status = 'approved')
      into all_approved
      from public.agent_documents d
     where d.kind = doc.kind
       and coalesce(
             d.uploader_id,
             (select a2.user_id from public.agent_applications a2 where a2.id = d.application_id)
           ) = owner_user
       /* Only current documents decide the rung: a row a later row replaces
          is history, and a rejection it carries is already answered. */
       and not exists (select 1 from public.agent_documents s where s.supersedes_id = d.id);

    perform private.record_verification_check(
      target_agent, rung,
      case when coalesce(all_approved, false) then 'passed' else 'pending' end,
      case when coalesce(all_approved, false)
           then 'Documents approved by review.'
           else 'Waiting on a document.' end,
      acting_admin
    );
  end if;

  if owner_user is not null then
    perform private.notify(
      owner_user, 'agent',
      case when p_approve then 'A document was approved' else 'A document needs redoing' end,
      case when p_approve
           then 'One of your verification documents has been accepted.'
           else btrim(p_reason) end,
      '/verification'
    );
  end if;

  return jsonb_build_object('status', 'ok', 'document_id', doc.id, 'approved', p_approve);
end;
$function$;
