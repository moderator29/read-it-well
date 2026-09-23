-- TRACK G: DOES THE NAME DOOR OPEN EXACTLY AS WIDE AS A LISTING, AND NO WIDER.
--
-- One transaction, ended by a deliberate `raise exception`, so everything
-- including the two fixture rows it writes is rolled back. Run through
-- `mcp__Supabase__apply_migration` on project `uccixoonmbhrnyczyigt`.
--
-- WHY NOT `execute_sql`. That tool runs read-only as a role carrying
-- `rolbypassrls`. It can never demonstrate an RLS refusal and it cannot
-- `set role`. A probe about who is refused has to become the refused role.
--
-- THE CONTROLS ARE THE OPPOSITE SHAPE ON PURPOSE. Every assertion here is a
-- SUCCESS, so a harness that quietly stayed `postgres` would pass all of them.
-- The two controls are therefore reads that must STILL be refused: `anon` must
-- still read zero rows of `public.agents`, and must still be refused
-- `listings.supply_verified_by`. If either of those succeeds the harness is
-- broken and nothing below it means anything.
--
-- ASSERTION 5 AND 6 ARE A PAIR AND NEITHER IS WORTH ANYTHING ALONE. 5 says an
-- OWNER listing publishes no name. On today's data that is vacuously true,
-- because no live row is an owner listing. So 6 takes THE SAME ROW, changes
-- one column to `agent`, and requires a name to appear. Same row, one column,
-- the answer changes: that is what makes 5 a measurement rather than a
-- coincidence.
--
-- ASSERTION 3 IS THE ONE THAT WOULD BE A BREACH. `public.listing_lister` is a
-- non-invoker view, so it reads and would WRITE as its OWNER, which is to say
-- a write accepted through it is a write to `public.agents` with RLS bypassed.
-- `pg_default_acl` on this project grants `arwdDxtm` on every new relation in
-- `public` to `anon`, so the view is BORN with those verbs. All three are
-- tried, as anon, and all three must be refused.
--
-- LAST RUN: 2026-09-23, immediately after migration 20260923103838.
--   PROBE ALL PASS track-g-name-door, 12 assertions, 2 opposite-shape controls
--   green (anon still reads 0 rows of public.agents and is still refused
--   listings.supply_verified_by). anon and a signed-in reader each read 64
--   named rows of public.listing_lister; INSERT, UPDATE and DELETE through the
--   view are all refused to anon; a DRAFT publishes no name; the SAME row
--   publishes no name as owner and a name as agent; anon and authenticated
--   hold SELECT and nothing wider; the view exposes exactly two columns.
--   Rolled back on purpose, the draft row is gone.

do $probe$
declare
  n integer; passes integer := 0; fails text := ''; caught text; named integer; draft_id uuid;
begin
  perform set_config('role','anon',true);
  begin
    select count(*) into n from public.agents;
    perform set_config('role','postgres',true);
    if n <> 0 then fails := fails || ' [CONTROL A anon read ' || n || ' agents rows, the harness is not switching role]';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [CONTROL A unexpected ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

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

  perform set_config('role','anon',true);
  begin
    select count(*) into named from public.listing_lister where lister_name is not null;
    perform set_config('role','postgres',true);
    if named < 1 then fails := fails || ' [1 anon read the view and every lister_name was null]';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [1 anon cannot read the view: ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  perform set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000000','role','authenticated')::text, true);
  perform set_config('role','authenticated',true);
  begin
    select count(*) into n from public.listing_lister where lister_name is not null;
    perform set_config('role','postgres',true);
    if n <> named then fails := fails || ' [2 a signed-in reader saw ' || n || ' named rows, anon saw ' || named || ']';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [2 signed-in reader refused: ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  perform set_config('role','anon',true);
  begin
    insert into public.listing_lister (listing_id, lister_name) values (gen_random_uuid(), 'X');
    perform set_config('role','postgres',true);
    fails := fails || ' [3 anon INSERTED into the view]';
  exception when others then
    perform set_config('role','postgres',true); passes := passes + 1;
  end;
  perform set_config('role','postgres',true);

  perform set_config('role','anon',true);
  begin
    update public.listing_lister set lister_name = 'X';
    perform set_config('role','postgres',true);
    fails := fails || ' [3 anon UPDATED through the view]';
  exception when others then
    perform set_config('role','postgres',true); passes := passes + 1;
  end;
  perform set_config('role','postgres',true);

  perform set_config('role','anon',true);
  begin
    delete from public.listing_lister;
    perform set_config('role','postgres',true);
    fails := fails || ' [3 anon DELETED through the view]';
  exception when others then
    perform set_config('role','postgres',true); passes := passes + 1;
  end;
  perform set_config('role','postgres',true);

  insert into public.listings (agent_id, title, property_type, status, bedrooms, bathrooms, listing_role)
    select agent_id, 'PROBE DRAFT, ROLLED BACK', property_type, 'DRAFT', bedrooms, bathrooms, listing_role
      from public.listings where status = 'PUBLISHED' limit 1
    returning id into draft_id;
  if draft_id is null then
    fails := fails || ' [4 the draft fixture was not created, the assertion would be vacuous]';
  else
    perform set_config('role','anon',true);
    begin
      select count(*) into n from public.listing_lister where listing_id = draft_id;
      perform set_config('role','postgres',true);
      if n <> 0 then fails := fails || ' [4 an unpublished listing published its lister name]'; else passes := passes + 1; end if;
    exception when others then
      caught := SQLSTATE; perform set_config('role','postgres',true);
      fails := fails || ' [4 unexpected ' || caught || ']';
    end;
  end if;
  perform set_config('role','postgres',true);

  update public.listings set listing_role = 'owner', status = 'PUBLISHED' where id = draft_id;
  perform set_config('role','anon',true);
  begin
    select count(*) into n from public.listing_lister where listing_id = draft_id;
    if n <> 1 then
      perform set_config('role','postgres',true);
      fails := fails || ' [5 the published owner row is not in the view at all, so the next assertion would be vacuous]';
    else
      select count(*) into n from public.listing_lister where listing_id = draft_id and lister_name is not null;
      perform set_config('role','postgres',true);
      if n <> 0 then fails := fails || ' [5 an OWNER listing published a name]'; else passes := passes + 1; end if;
    end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [5 unexpected ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  update public.listings set listing_role = 'agent' where id = draft_id;
  perform set_config('role','anon',true);
  begin
    select count(*) into n from public.listing_lister where listing_id = draft_id and lister_name is not null;
    perform set_config('role','postgres',true);
    if n <> 1 then fails := fails || ' [6 the same row as an AGENT listing published no name, so assertion 5 proves nothing]';
    else passes := passes + 1; end if;
  exception when others then
    caught := SQLSTATE; perform set_config('role','postgres',true);
    fails := fails || ' [6 unexpected ' || caught || ']';
  end;
  perform set_config('role','postgres',true);

  if (select count(*) from aclexplode((select relacl from pg_class where oid='public.listing_lister'::regclass)) a
       where a.grantee in ('anon'::regrole,'authenticated'::regrole) and a.privilege_type <> 'SELECT') > 0 then
    fails := fails || ' [7 a reader role holds more than SELECT on the view]';
  else passes := passes + 1; end if;

  if (select string_agg(attname, ',' order by attnum) from pg_attribute
       where attrelid='public.listing_lister'::regclass and attnum>0 and not attisdropped)
     is distinct from 'listing_id,lister_name' then
    fails := fails || ' [8 the view no longer exposes exactly listing_id,lister_name]';
  else passes := passes + 1; end if;

  if fails <> '' then raise exception 'PROBE FAILED after % passes:%', passes, fails; end if;
  raise exception 'PROBE ALL PASS track-g-name-door, % assertions, 2 opposite-shape controls green (anon still reads 0 rows of public.agents and is still refused listings.supply_verified_by). anon and a signed-in reader each read % named rows of public.listing_lister; INSERT, UPDATE and DELETE through the view are all refused to anon; a DRAFT publishes no name; the SAME row publishes no name as owner and a name as agent; anon and authenticated hold SELECT and nothing wider; the view exposes exactly two columns. Rolled back on purpose, the draft row is gone.', passes, named;
end;
$probe$;
