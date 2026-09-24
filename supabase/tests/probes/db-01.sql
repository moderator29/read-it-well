-- DB-01: a member cannot publish or verify their own business, property or
-- room; the owner's own steps (draft, edit, submit, close) still work; an
-- admin writing through their own signed-in client still decides.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid;
  forged uuid;
  acc uuid;
  room uuid;
  n int;
  r record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: the host wizard's first save (lib/host/actions.ts) as the member.
  insert into public.businesses (owner_id, source, status, kind, name, slug)
  values (member, 'first_party', 'DRAFT', 'hotel', 'Probe DB-01 hotel', 'probe-db01-' || gen_random_uuid())
  returning id into biz;
  if biz is null then raise exception 'PROBE_FAIL db-01: owner draft insert returned nothing'; end if;

  -- REFUSAL: a business created straight into PUBLISHED.
  begin
    insert into public.businesses (owner_id, kind, name, slug, status, verification_tier, source, published_at)
    values (member, 'restaurant', 'Probe DB-01 forged', 'probe-db01-f-' || gen_random_uuid(), 'PUBLISHED', 3, 'first_party', now());
    raise exception 'PROBE_FAIL db-01: member inserted a PUBLISHED business';
  exception when insufficient_privilege then null;
  end;

  -- A draft that names a tier, a reviewer and a publish date keeps none of them.
  insert into public.businesses (owner_id, kind, name, slug, status, verification_tier, verified, reviewer_id, reviewed_at, published_at, is_demo)
  values (member, 'restaurant', 'Probe DB-01 forged draft', 'probe-db01-g-' || gen_random_uuid(), 'DRAFT', 3, true, member, now(), now(), false)
  returning id into forged;
  select verification_tier, verified, reviewer_id, reviewed_at, published_at into r from public.businesses where id = forged;
  if r.verification_tier <> 0 or r.verified or r.reviewer_id is not null or r.reviewed_at is not null or r.published_at is not null then
    raise exception 'PROBE_FAIL db-01: forged draft kept a moderator column: %', row_to_json(r);
  end if;

  -- REFUSALS: each moderator column and each forbidden status on update.
  begin update public.businesses set verification_tier = 3 where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set verification_tier';
  exception when insufficient_privilege then null; end;
  begin update public.businesses set verified = true where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set verified';
  exception when insufficient_privilege then null; end;
  begin update public.businesses set reviewer_id = member, reviewed_at = now() where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set reviewer';
  exception when insufficient_privilege then null; end;
  begin update public.businesses set published_at = now() where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set published_at';
  exception when insufficient_privilege then null; end;
  begin update public.businesses set status = 'PUBLISHED' where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set PUBLISHED';
  exception when insufficient_privilege then null; end;
  begin update public.businesses set status = 'APPROVED' where id = biz;
    raise exception 'PROBE_FAIL db-01: owner set APPROVED';
  exception when insufficient_privilege then null; end;

  -- CONTROL: descriptive edit.
  update public.businesses set description = 'Probe description' where id = biz;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner description edit rows=%', n; end if;

  -- Property and room under the member's draft business.
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe DB-01 property', 'probe-db01-a-' || gen_random_uuid(), 'DRAFT')
  returning id into acc;
  begin
    insert into public.accommodations (business_id, name, slug, status, featured)
    values (biz, 'Probe DB-01 live property', 'probe-db01-b-' || gen_random_uuid(), 'PUBLISHED', true);
    raise exception 'PROBE_FAIL db-01: owner inserted a PUBLISHED property';
  exception when insufficient_privilege then null; end;
  begin update public.accommodations set featured = true where id = acc;
    raise exception 'PROBE_FAIL db-01: owner featured the property';
  exception when insufficient_privilege then null; end;
  begin update public.accommodations set status = 'PUBLISHED' where id = acc;
    raise exception 'PROBE_FAIL db-01: owner published the property';
  exception when insufficient_privilege then null; end;
  update public.accommodations set description = 'Probe', star_rating = 3 where id = acc;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner property edit rows=%', n; end if;

  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe room', 'double', 2, 1, 5000000, 'DRAFT')
  returning id into room;
  begin update public.room_types set status = 'PUBLISHED' where id = room;
    raise exception 'PROBE_FAIL db-01: owner published the room';
  exception when insufficient_privilege then null; end;

  -- CONTROL: submit (submitHostApplication), then close back to a draft
  -- (closeBusiness), then submit again.
  update public.businesses set status = 'SUBMITTED', submitted_at = now()
   where id = biz and owner_id = member and status in ('DRAFT', 'MORE_INFO_REQUIRED');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner submit rows=%', n; end if;
  if (select submitted_at from public.businesses where id = biz) is null then
    raise exception 'PROBE_FAIL db-01: submit left submitted_at empty';
  end if;
  update public.businesses set status = 'DRAFT' where id = biz and owner_id = member;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner close rows=%', n; end if;
  update public.businesses set status = 'SUBMITTED' where id = biz;

  -- REFUSAL: content edits once the application is with the reviewers.
  begin update public.businesses set description = 'changed after submit' where id = biz;
    raise exception 'PROBE_FAIL db-01: owner edited a submitted business';
  exception when insufficient_privilege then null; end;

  -- CONTROL: the admin decides through their own authenticated client.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.businesses
     set status = 'PUBLISHED', verification_tier = 3, reviewer_id = admin, reviewed_at = now(),
         review_notes = 'probe', published_at = now()
   where id = biz;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: admin publish rows=%', n; end if;
  update public.accommodations set status = 'PUBLISHED', published_at = now(), reviewer_id = admin, featured = true where id = acc;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: admin property publish rows=%', n; end if;
  update public.room_types set status = 'PUBLISHED' where id = room;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: admin room publish rows=%', n; end if;
  select status, verified, verification_tier into r from public.businesses where id = biz;
  if r.status <> 'PUBLISHED' or not r.verified or r.verification_tier <> 3 then
    raise exception 'PROBE_FAIL db-01: admin decision did not land: %', row_to_json(r);
  end if;

  -- REFUSALS: the owner rewrites what the reviewer published, or deletes it.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin update public.businesses set name = 'Pay the deposit to 0123456789', phone = null where id = biz;
    raise exception 'PROBE_FAIL db-01: owner rewrote a live business';
  exception when insufficient_privilege then null; end;
  begin update public.accommodations set description = 'rewritten live' where id = acc;
    raise exception 'PROBE_FAIL db-01: owner rewrote a live property';
  exception when insufficient_privilege then null; end;
  begin update public.room_types set base_rate_minor = 1 where id = room;
    raise exception 'PROBE_FAIL db-01: owner repriced a live room';
  exception when insufficient_privilege then null; end;
  begin delete from public.room_types where id = room;
    raise exception 'PROBE_FAIL db-01: owner deleted a live room';
  exception when insufficient_privilege then null; end;
  begin delete from public.businesses where id = biz;
    raise exception 'PROBE_FAIL db-01: owner deleted a live business';
  exception when insufficient_privilege then null; end;

  -- CONTROL: the owner closes it (closeBusiness: properties first, then the
  -- business), and then edits the still-PUBLISHED room as part of the draft.
  update public.accommodations set status = 'DRAFT' where business_id = biz and status in ('PUBLISHED', 'APPROVED');
  update public.businesses set status = 'DRAFT' where id = biz and owner_id = member;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner unpublish rows=%', n; end if;
  update public.room_types set base_rate_minor = 6000000 where id = room;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner room edit under a draft business rows=%', n; end if;
  update public.businesses set description = 'edited as a draft again' where id = biz;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner edit after close rows=%', n; end if;
  delete from public.businesses where id = forged;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-01: owner delete of a draft business rows=%', n; end if;

  raise exception 'PROBE_OK db-01';
end
$$;
