-- SUP-05 (with DB-08): an application sent back as MORE_INFO_REQUIRED can be
-- answered, given documents and sent back; an applicant can never approve,
-- review or re-date their own application, and a document they file is
-- always pending. The admin still decides through their own signed-in client.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  app uuid;
  doc uuid;
  others_doc uuid;
  others_listing uuid;
  n int;
  r record;
begin
  -- Somebody else's listing and document, for the two ownership refusals.
  select id into others_listing from public.listings limit 1;
  insert into public.agent_documents (uploader_id, kind, storage_path)
  values (admin, 'identity', admin::text || '/probe-sup-05/other.jpg')
  returning id into others_doc;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- REFUSAL: an application filed already decided.
  begin
    insert into public.agent_applications (user_id, status, supply_role, full_name, agree_terms)
    values (member, 'APPROVED', 'owner', 'Probe SUP-05', true);
    raise exception 'PROBE_FAIL sup-05: applicant filed an APPROVED application';
  exception when insufficient_privilege then null; end;
  -- A submission that names a reviewer keeps none of it (the guard clears it
  -- before the policy's check sees the row).
  insert into public.agent_applications (user_id, status, supply_role, full_name, agree_terms, reviewer_id, reviewed_at, review_notes)
  values (member, 'SUBMITTED', 'owner', 'Probe SUP-05 forged', true, member, now(), 'approved')
  returning id into app;
  select reviewer_id, reviewed_at, review_notes into r from public.agent_applications where id = app;
  if r.reviewer_id is not null or r.reviewed_at is not null or r.review_notes is not null then
    raise exception 'PROBE_FAIL sup-05: applicant filed with a reviewer: %', row_to_json(r);
  end if;

  -- CONTROL: the registration forms' insert (status SUBMITTED), RETURNING.
  -- A reference is the sequence's: a supplied one is replaced.
  insert into public.agent_applications (user_id, status, supply_role, full_name, agree_terms, reference)
  values (member, 'SUBMITTED', 'owner', 'Probe SUP-05 ref', true, 'VL-AGT-99999')
  returning id into app;
  if (select reference from public.agent_applications where id = app) = 'VL-AGT-99999' then
    raise exception 'PROBE_FAIL sup-05: applicant chose their own reference';
  end if;

  insert into public.agent_applications (user_id, status, supply_role, full_name, agree_terms, submitted_at)
  values (member, 'SUBMITTED', 'owner', 'Probe SUP-05', true, now())
  returning id into app;

  -- The admin sends it back, through their own client.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.agent_applications
     set status = 'MORE_INFO_REQUIRED', reviewer_id = admin, reviewed_at = now(), review_notes = 'your bvn'
   where id = app;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL sup-05: admin send-back rows=%', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- REFUSALS: deciding or rewriting the review.
  begin update public.agent_applications set status = 'APPROVED' where id = app;
    raise exception 'PROBE_FAIL sup-05: applicant approved their own application';
  exception when insufficient_privilege then null; end;
  begin update public.agent_applications set reviewer_id = member where id = app;
    raise exception 'PROBE_FAIL sup-05: applicant stamped a reviewer';
  exception when insufficient_privilege then null; end;
  begin update public.agent_applications set review_notes = 'approved by me' where id = app;
    raise exception 'PROBE_FAIL sup-05: applicant rewrote the review note';
  exception when insufficient_privilege then null; end;
  begin update public.agent_applications set supply_role = 'agent' where id = app;
    raise exception 'PROBE_FAIL sup-05: applicant changed role after sending';
  exception when insufficient_privilege then null; end;

  -- CONTROL: a document for the sent-back application, filed pending even
  -- though the insert claims it was approved.
  insert into public.agent_documents (application_id, uploader_id, kind, storage_path, review_status, reviewed_by, reviewed_at)
  values (app, member, 'identity', member::text || '/probe-sup-05/identity.jpg', 'approved', member, now())
  returning id into doc;
  select review_status::text as st, reviewed_by into r from public.agent_documents where id = doc;
  if r.st <> 'pending' or r.reviewed_by is not null then
    raise exception 'PROBE_FAIL sup-05: applicant document kept a decision: %', row_to_json(r);
  end if;

  -- REFUSALS: a document filed against somebody else's listing, or
  -- replacing somebody else's document.
  begin
    insert into public.agent_documents (uploader_id, kind, storage_path, listing_id)
    values (member, 'mandate', member::text || '/probe-sup-05/mandate.pdf', others_listing);
    raise exception 'PROBE_FAIL sup-05: document attached to another lister''s listing';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.agent_documents (application_id, uploader_id, kind, storage_path, supersedes_id)
    values (app, member, 'identity', member::text || '/probe-sup-05/id2.jpg', others_doc);
    raise exception 'PROBE_FAIL sup-05: document superseded somebody else''s';
  exception when insufficient_privilege then null; end;

  -- CONTROL: the answer and the send-back.
  update public.agent_applications
     set applicant_response = 'My BVN is on the identity document attached.', phone = '+2348031234567',
         status = 'SUBMITTED'
   where id = app and status = 'MORE_INFO_REQUIRED';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL sup-05: applicant answer rows=%', n; end if;
  select status::text as st, submitted_at, reviewer_id into r from public.agent_applications where id = app;
  if r.st <> 'SUBMITTED' or r.submitted_at is null or r.reviewer_id is distinct from admin then
    raise exception 'PROBE_FAIL sup-05: after answer: %', row_to_json(r);
  end if;

  -- Once sent, it is the reviewer's again.
  update public.agent_applications set full_name = 'changed while in review' where id = app;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL sup-05: applicant edited while in review rows=%', n; end if;

  -- CONTROL: the admin approves.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.agent_applications set status = 'APPROVED', reviewer_id = admin, reviewed_at = now(), review_notes = 'ok'
   where id = app;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL sup-05: admin approve rows=%', n; end if;

  raise exception 'PROBE_OK sup-05';
end
$$;
