-- Track K: KYC review is a staff scope. The acting reviewer is still
-- auth.uid() (never an argument), now admitted by private.staff_can(...,
-- 'kyc_review'), which an admin passes as before. New: nobody reviews their
-- own document.
create or replace function public.review_kyc_document(p_document uuid, p_approve boolean, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not private.staff_can(actor, 'kyc_review') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return private.review_kyc_document(actor, p_document, p_approve, p_reason);
end;
$function$;

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
           ) = owner_user;

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
      '/verify'
    );
  end if;

  return jsonb_build_object('status', 'ok', 'document_id', doc.id, 'approved', p_approve);
end;
$function$;
