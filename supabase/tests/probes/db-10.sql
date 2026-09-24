-- DB-10 STEP 1 (live now): the owners' and staff's door to the private
-- columns. The lister (and staff) read a listing's address, landmark and
-- reviewer note through listing_private_fields; a business owner (and staff)
-- read its contact, registration and tier through business_private_fields;
-- anyone else gets no row, and anon cannot call either. The step 2 probe
-- (authenticated loses the columns on the tables) is
-- tests/pending/db-10-step2.sql.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  agent uuid;
  lid uuid := gen_random_uuid();
  biz uuid;
  n int;
  r record;
begin
  insert into public.agents (user_id, display_name) values (member, 'Probe DB-10 lister') returning id into agent;
  insert into public.listings (id, agent_id, title, property_type, status, listing_role, address, landmark, review_notes)
  values (lid, agent, 'Probe DB-10', 'apartment', 'PUBLISHED', 'agent', '12 Probe Close', 'By the probe', 'probe note');
  insert into public.businesses (owner_id, kind, name, slug, status, tin, cac_number, representative_phone)
  values (member, 'hotel', 'Probe DB-10 hotel', 'probe-db10-' || gen_random_uuid(), 'PUBLISHED', '12345678-0001', 'RC123456', '+2348031234567')
  returning id into biz;

  set local role authenticated;

  -- The lister and the owner read their own private fields.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  select * into r from public.listing_private_fields(array[lid]);
  if r.address is distinct from '12 Probe Close' or r.review_notes is distinct from 'probe note' then
    raise exception 'PROBE_FAIL db-10: lister private read %', row_to_json(r);
  end if;
  select * into r from public.business_private_fields(array[biz]);
  if r.tin is distinct from '12345678-0001' then
    raise exception 'PROBE_FAIL db-10: owner private read %', row_to_json(r);
  end if;

  -- Staff read them too.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  select count(*) into n from public.listing_private_fields(array[lid]);
  if n <> 1 then raise exception 'PROBE_FAIL db-10: staff listing private rows=%', n; end if;
  select count(*) into n from public.business_private_fields(array[biz]);
  if n <> 1 then raise exception 'PROBE_FAIL db-10: staff business private rows=%', n; end if;

  -- Any other member gets nothing through the door.
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into n from public.listing_private_fields(array[lid]);
  if n <> 0 then raise exception 'PROBE_FAIL db-10: stranger listing private rows=%', n; end if;
  select count(*) into n from public.business_private_fields(array[biz]);
  if n <> 0 then raise exception 'PROBE_FAIL db-10: stranger business private rows=%', n; end if;

  -- anon cannot call it at all.
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform * from public.listing_private_fields(array[lid]);
    raise exception 'PROBE_FAIL db-10: anon called listing_private_fields';
  exception when insufficient_privilege then null; end;

  raise exception 'PROBE_OK db-10';
end
$$;
