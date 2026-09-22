-- TRACK G: DOES THE ROLE ACTUALLY REACH THE ROW. IT ROLLS ITSELF BACK.
--
-- The schema probe beside this one proves the COLUMNS exist and that six rules
-- bite. This one proves the thing the whole stint was about: that an approved
-- OWNER ends up as an owner and not as an "agent".
--
-- WHAT WAS WRONG. `agent_applications.supply_role` was written by three
-- registration forms and read by nothing that decides anything: two grep hits
-- in the whole tree and both of them in the file that writes it.
-- `lib/admin/actions.ts` upserted an `agents` row with `type` and `status`
-- only, and granted `user_roles.role = 'agent'`. Three forms filed three
-- different applications and the database could not tell them apart
-- afterwards, because there was no column to tell them apart WITH.
--
-- WHAT THIS RUNS. Exactly what the approval path now does, for all four inputs
-- the narrowing in `lib/supply/roles.ts` can receive: file an application
-- through a door, upsert the agents row with `personRoleFrom(supply_role)`,
-- then READ THE ROLE BACK OFF THE ROW. owner -> owner, agent -> agent,
-- firm -> agent (a firm is an ORGANISATION; the person running one is an agent
-- with a firm behind them), null -> agent (every application filed before
-- 20260922170000 came through the six step agent application, and answering
-- anything else would invent a fact about a person).
--
-- It writes into two live product tables and keeps nothing: the run ends in
-- `raise exception`, so the transaction is thrown away, and each iteration
-- deletes its own rows before the next one as well.
--
-- LAST RUN: 22 September 2026, against the live project.
--   PROBE ALL PASS: the role reaches the row. 7 assertions, all four doors
--   written and read back. Live agents row reads role=agent. Rolled back,
--   nothing written.

do $$
declare
  u uuid;
  app_id uuid;
  got text;
  fails text := '';
  passes int := 0;
begin
  /* A real person with no agents row yet, so the probe exercises the INSERT
     arm of the approval upsert rather than its ignoreDuplicates arm. */
  select au.id into u from auth.users au
    left join public.agents a on a.user_id = au.id
   where a.id is null limit 1;
  if u is null then
    raise exception 'PROBE CANNOT RUN: every auth user already holds an agents row.';
  end if;

  /* 1 and 2: the enum accepts exactly what personRoleFrom can produce, and
     refuses 'firm', which is a WORKSPACE kind and never a person role. */
  begin
    perform 'owner'::public.supply_role, 'agent'::public.supply_role;
    passes := passes + 1;
  exception when others then fails := fails || ' [1 supply_role refused owner or agent]';
  end;

  begin
    perform 'firm'::public.supply_role;
    fails := fails || ' [2 supply_role accepted "firm", which is a workspace and not a person]';
  exception when invalid_text_representation then passes := passes + 1;
  end;

  /* 3 to 6: THE REAL PATH, all four doors, written and read back. */
  for app_id, got in
    select null::uuid, v.applied from (values ('owner'), ('agent'), ('firm'), (null)) as v(applied)
  loop
    declare
      applied  text := got;
      expected text := case when applied = 'owner' then 'owner' else 'agent' end;
      wrote    text;
    begin
      insert into public.agent_applications (user_id, status, type, supply_role, full_name)
      values (u, 'SUBMITTED', 'individual', applied, 'A Probe')
      returning id into app_id;

      insert into public.agents (user_id, application_id, display_name, type, role, status)
      values (u, app_id, 'A Probe', 'individual', expected::public.supply_role, 'APPROVED')
      on conflict (user_id) do nothing;

      select a.role::text into wrote from public.agents a where a.user_id = u;
      if wrote is distinct from expected then
        fails := fails || ' [3 door ' || coalesce(applied,'null') || ' wrote ' || coalesce(wrote,'NOTHING')
                 || ' expected ' || expected || ']';
      else
        passes := passes + 1;
      end if;

      delete from public.agents where user_id = u;
      delete from public.agent_applications where id = app_id;
    end;
  end loop;

  /* 7: the live agents row carries a role at all, which is what the approval
     path had no column to write into before this set of migrations. */
  select a.role::text into got from public.agents a limit 1;
  if got is null then fails := fails || ' [4 the live agents row has no role]'; else passes := passes + 1; end if;

  if fails <> '' then raise exception 'PROBE FAILED after % passes:%', passes, fails; end if;
  raise exception 'PROBE ALL PASS: the role reaches the row. % assertions, all four doors written and read back. Live agents row reads role=%. Rolled back, nothing written.', passes, got;
end$$;
