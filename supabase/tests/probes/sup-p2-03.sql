-- SUP-P2-03: an owner cannot self-publish, so the publish triggers (the
-- public reference, the area-feed announcement, the badges) never fire
-- without staff. Closed by DB-02's owner write guard; this probe proves the
-- blast radius is gone. Always rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  agent uuid;
  lid uuid := gen_random_uuid();
  posts_before int;
  posts_after int;
  ref text;
begin
  insert into public.agents (user_id, display_name) values (member, 'Probe SUP-P2-03 lister')
  returning id into agent;
  select count(*) into posts_before from public.posts where author_kind = 'SYSTEM';

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: the owner's own draft.
  insert into public.listings (id, agent_id, status, title, description, property_type, listing_intent,
    state_code, city, area, bedrooms, bathrooms, rent_amount_minor, rent_period)
  values (lid, agent, 'DRAFT', 'Probe SUP-P2-03 flat', 'Probe', 'apartment', 'rent',
    'LA', 'Lagos', 'Yaba', 2, 2, 150000000, 'year');

  -- REFUSAL: the owner's PATCH to PUBLISHED.
  begin
    update public.listings set status = 'PUBLISHED' where id = lid;
    raise exception 'PROBE_FAIL sup-p2-03: owner published their own listing';
  exception when insufficient_privilege then null;
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  select reference into ref from public.listings where id = lid;
  select count(*) into posts_after from public.posts where author_kind = 'SYSTEM';
  if ref is not null then
    raise exception 'PROBE_FAIL sup-p2-03: a reference was minted without a staff publish: %', ref;
  end if;
  if posts_after <> posts_before then
    raise exception 'PROBE_FAIL sup-p2-03: a system announcement was posted without a staff publish';
  end if;

  raise exception 'PROBE_OK sup-p2-03';
end $$;
