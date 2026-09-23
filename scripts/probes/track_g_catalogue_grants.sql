-- TRACK G: CAN A STRANGER READ THE CATALOGUE AT ALL, AND CAN THEY LEARN A NAME.
--
-- TWO probes, a BEFORE and an AFTER, either side of migration
-- `20260923103430_track_g_7_...`. Each is one transaction that ends in a
-- deliberate `raise exception`, so the whole thing rolls back and nothing is
-- written to a live product table. Run one at a time through
-- `mcp__Supabase__apply_migration` on project `uccixoonmbhrnyczyigt`.
--
-- WHY NOT `execute_sql`. That tool runs read-only as a role carrying
-- `rolbypassrls`, so it can NEVER demonstrate an RLS refusal and it cannot
-- `set role`. A probe about refusals has to be able to become the role that is
-- refused, which means a transaction, which means `apply_migration`.
--
-- WHY EVERY BLOCK CARRIES CONTROLS. A column of refusals proves only that the
-- harness is broken unless something in the same transaction, as the same
-- role, SUCCEEDS. The BEFORE block's controls are two successful anon reads
-- (`agent_badges`, `amenities`). The AFTER block's controls are the opposite
-- shape, two reads that must STILL be refused (`public.agents`, and
-- `listings.supply_verified_by`), because once every assertion is a success a
-- harness that silently stayed `postgres` would pass them all.
--
-- WHERE THE PRIVILEGE READS COME FROM. `pg_proc.proacl`, `pg_class.relacl`,
-- `pg_attribute.attacl` and the `has_*_privilege` family, never
-- `information_schema`. Those views only return rows where the QUERYING role
-- is grantor or grantee, and the read door here is `supabase_read_only_user`,
-- so an empty result is a fact about the observer and not about the table.
--
-- ===========================================================================
-- BEFORE. Last run 2026-09-23, immediately prior to 20260923103430.
-- Result: PROBE ALL PASS track-g-before, 8 assertions, 2 controls green.
-- ===========================================================================

do $probe$
declare
  n integer;
  passes integer := 0;
  fails  text := '';
  caught text;
  pubs   integer;
begin
  select count(*) into pubs from public.listings where status = 'PUBLISHED';
  if pubs < 1 then
    raise exception 'PROBE CANNOT RUN: no published listing to read.';
  end if;

  /* CONTROL A. anon CAN read a published table whose policies call nothing it
     lacks. agent_badges is the precedent the name door copies. */
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from public.agent_badges;
    passes := passes + 1;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL A anon cannot read agent_badges: ' || caught || ']';
  end;
  perform set_config('role', 'postgres', true);

  /* CONTROL B. The same role, one statement later, reading amenities. */
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from public.amenities;
    passes := passes + 1;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL B anon cannot read amenities: ' || caught || ']';
  end;
  perform set_config('role', 'postgres', true);

  /* 1. THE OUTAGE. A signed-out visitor cannot read the catalogue AT ALL, over
     columns it plainly holds, because `listings_owner_all` is FOR ALL and calls
     `private.owns_listing`, whose EXECUTE anon lost on 22 September. */
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from (select id, title from public.listings where status = 'PUBLISHED' limit 1) s;
    perform set_config('role','postgres',true);
    fails := fails || ' [1 anon read the catalogue, so the outage is not what I measured]';
  exception when insufficient_privilege then
    perform set_config('role','postgres',true); passes := passes + 1;
  when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [1 anon failed with ' || caught || ' rather than 42501]';
  end;
  perform set_config('role', 'postgres', true);

  /* 2. AND SO DOES A SIGNED-IN READER. */
  perform set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-000000000000','role','authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    select count(*) into n from (select id, title from public.listings where status = 'PUBLISHED' limit 1) s;
    perform set_config('role','postgres',true);
    fails := fails || ' [2 a signed-in reader read the catalogue]';
  exception when insufficient_privilege then
    perform set_config('role','postgres',true); passes := passes + 1;
  when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [2 signed-in reader failed with ' || caught || ' rather than 42501]';
  end;
  perform set_config('role', 'postgres', true);

  /* 3. READ FROM THE CATALOGUE, NEVER information_schema. */
  if has_function_privilege('anon','private.owns_listing(uuid)','execute')
     or has_function_privilege('authenticated','private.owns_listing(uuid)','execute') then
    fails := fails || ' [3 pg_proc.proacl says the grant is there after all]';
  else
    passes := passes + 1;
  end if;

  /* 4. SECOND DEFECT, UNDERNEATH THE FIRST: the column Track G added is not in
     the anon column grant, and a missing column privilege fails the whole
     SELECT. The `title` line beside it is the control for this pair. */
  if has_column_privilege('anon','public.listings','listing_role','select') then
    fails := fails || ' [4 anon holds listing_role after all]';
  else
    passes := passes + 1;
  end if;
  if not has_column_privilege('anon','public.listings','title','select') then
    fails := fails || ' [4 control: anon does not hold title either, so the column grant is not the shape I think]';
  else
    passes := passes + 1;
  end if;

  /* 5. THE NAME HAS NO DOOR, and the refusal is not vacuous: the rows exist. */
  select count(*) into n from public.agents where btrim(coalesce(display_name,'')) <> '';
  if n < 1 then
    fails := fails || ' [5 vacuous: no agent row carries a display name]';
  else
    perform set_config('role','anon',true);
    begin
      select count(*) into n from public.agents;
      perform set_config('role','postgres',true);
      if n <> 0 then fails := fails || ' [5 anon read ' || n || ' agent rows]'; else passes := passes + 1; end if;
    exception when others then
      caught := SQLSTATE; perform set_config('role','postgres',true);
      fails := fails || ' [5 unexpected ' || caught || ']';
    end;
  end if;
  perform set_config('role','postgres',true);

  if fails <> '' then raise exception 'PROBE FAILED after % passes:%', passes, fails; end if;
  raise exception 'PROBE ALL PASS track-g-before, % assertions, 2 controls green. THE PUBLIC CATALOGUE IS REFUSED 42501 TO anon AND TO authenticated over % published listings, because private.owns_listing lost EXECUTE on 22 September while 17 RLS policies still call it. Separately anon holds no column privilege on listings.listing_role, which both listing selects now name. And anon reads 0 rows of public.agents, so no lister name has a public door. Rolled back on purpose.', passes, pubs;
end;
$probe$;

-- ===========================================================================
-- AFTER. Last run 2026-09-23, immediately following 20260923103430.
-- Result: PROBE ALL PASS track-g-after, 10 assertions, 2 controls green.
-- ===========================================================================

do $probe$
declare
  n integer; passes integer := 0; fails text := ''; caught text; pubs integer; drafted uuid;
begin
  select count(*) into pubs from public.listings where status='PUBLISHED';

  /* CONTROL A, A REFUSAL THAT MUST STILL HAPPEN. Once every assertion below is
     a success, a harness that silently ran as postgres would pass them all. So
     the controls here are the opposite shape. */
  perform set_config('role','anon',true);
  begin
    select count(*) into n from public.agents;
    perform set_config('role','postgres',true);
    if n <> 0 then fails := fails || ' [CONTROL A the harness is not switching role: anon read ' || n || ' agent rows]';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL A unexpected ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* CONTROL B, a column this file did not grant, still refused. */
  perform set_config('role','anon',true);
  begin
    select count(*) into n from (select supply_verified_by from public.listings limit 1) s;
    perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL B anon read listings.supply_verified_by]';
  exception when insufficient_privilege then
    perform set_config('role','postgres',true); passes := passes + 1;
  when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL B unexpected ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* 1. THE CATALOGUE READS AGAIN FOR A SIGNED-OUT VISITOR, over the exact
     Track G column set `LISTING_SELECT` names. */
  perform set_config('role','anon',true);
  begin
    select count(*) into n from (select id, title, agent_id, listing_role, is_demo from public.listings where status='PUBLISHED') s;
    perform set_config('role','postgres',true);
    if n <> pubs then fails := fails || ' [1 anon saw ' || n || ' of ' || pubs || ' published listings]';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [1 anon still refused: ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* 2. AND THE JOINED TABLES THE SAME READ EMBEDS, every one of which carries
     a policy that calls owns_listing. */
  perform set_config('role','anon',true);
  begin
    select count(*) into n from public.listing_photos;
    select count(*) into n from public.listing_amenities;
    select count(*) into n from public.listing_videos;
    select count(*) into n from public.reviews;
    select count(*) into n from public.availability;
    perform set_config('role','postgres',true);
    passes := passes + 1;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [2 a joined catalogue table is still refused: ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* 3. A SIGNED-IN READER TOO. */
  perform set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000000','role','authenticated')::text, true);
  perform set_config('role','authenticated',true);
  begin
    select count(*) into n from (select id, listing_role from public.listings where status='PUBLISHED') s;
    perform set_config('role','postgres',true);
    if n <> pubs then fails := fails || ' [3 a signed-in reader saw ' || n || ' of ' || pubs || ']'; else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [3 signed-in reader still refused: ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* 4. THE FAILURE MODE THE JULY MIGRATION WARNED ABOUT: an unpublished row
     makes the planner evaluate the other policies. A DRAFT must be INVISIBLE
     to anon rather than fatal to the whole read. Rolled back with the rest. */
  insert into public.listings (agent_id, title, property_type, status, bedrooms, bathrooms, listing_role)
    select agent_id, 'PROBE DRAFT, ROLLED BACK', property_type, 'DRAFT', bedrooms, bathrooms, listing_role
      from public.listings limit 1
    returning id into drafted;
  perform set_config('role','anon',true);
  begin
    select count(*) into n from (select id, listing_role from public.listings) s;
    perform set_config('role','postgres',true);
    if n <> pubs then fails := fails || ' [4 with a draft present anon saw ' || n || ' rows, expected ' || pubs || ']';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [4 a draft row brought the anonymous read down with ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  /* 5. PRIVILEGES FROM THE CATALOGUE, and nothing wider than was asked for. */
  if not has_function_privilege('anon','private.owns_listing(uuid)','execute') then fails := fails || ' [5 anon execute missing]'; else passes := passes + 1; end if;
  if not has_function_privilege('authenticated','private.owns_listing(uuid)','execute') then fails := fails || ' [5 authenticated execute missing]'; else passes := passes + 1; end if;
  if has_table_privilege('anon','public.listings','select') then fails := fails || ' [5 anon gained a table-wide select on listings]'; else passes := passes + 1; end if;
  if has_column_privilege('anon','public.listings','firm_id','select')
     or has_column_privilege('anon','public.listings','ownership_verified_at','select')
     or has_column_privilege('anon','public.listings','mandate_verified_at','select')
     or has_column_privilege('anon','public.listings','supply_verified_by','select') then
    fails := fails || ' [5 a Track G column that must stay dark is readable by anon]';
  else passes := passes + 1; end if;

  if fails <> '' then raise exception 'PROBE FAILED after % passes:%', passes, fails; end if;
  raise exception 'PROBE ALL PASS track-g-after, % assertions, 2 opposite-shape controls green (anon still reads 0 agents rows and is still refused listings.supply_verified_by). anon and a signed-in reader each read all % published listings including listing_role, every joined catalogue table reads, a DRAFT row is filtered rather than fatal, and no table-wide or extra column privilege appeared. Rolled back on purpose, the draft row is gone.', passes, pubs;
end;
$probe$;
