-- THE TWO BADGE TIERS, PROVED AGAINST THE LIVE PROJECT AS THE ROLES THAT READ.
--
-- Migration 20260923111950. Run through `mcp__Supabase__apply_migration` on
-- project uccixoonmbhrnyczyigt. It ends in a deliberate `raise exception`
-- either way, so it rolls back and writes nothing to a live product table.
--
-- `mcp__Supabase__execute_sql` cannot do this job. It runs as a role with
-- rolbypassrls, so it answers every RLS question with a success, and it holds
-- neither the anon nor the authenticated grant, so it cannot even evaluate
-- public.is_platform_staff. Measured: `permission denied for function
-- is_platform_staff` from that tool on 23 September.
--
-- EVERY COLUMN OF REFUSALS HAS A CONTROL IN THE SAME TRANSACTION THAT MUST
-- SUCCEED. Step 2's refusals sit beside a read of agent_badges that must return
-- rows. Step 7's refusal sits beside a read of the very row it then fails to
-- write, so a refusal cannot be mistaken for an absence.
--
-- AND IT SELECTS THE COLUMN, NEVER count(*). An earlier draft of this design
-- kept the three helpers locked in `private`, and `select count(*) from
-- public.person_badge` PASSED as anon while selecting `tier` raised 42501,
-- because count(*) never evaluates the expression. A check that counted rows
-- would have gone green over a view nobody could read.
--
-- LAST RUN: 2026-09-23, live project, PROBE ALL PASS, full text in ledger 69.

begin;

do $probe$
declare
  founder        uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d';
  fixture        uuid;
  ag             uuid;
  t              text;
  pt             text;
  n              integer;
  ctl            integer;
  roles_seen     integer;
  wrote_view     text := 'refused';
  wrote_badge    text := 'refused';
  acl            text;
begin
  /* ---- 1. THE GRANTS, off pg_proc.proacl and pg_class.relacl ----------- */

  if has_function_privilege('anon', 'private.refresh_agent_badge_tier(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.refresh_agent_badge_tier(uuid)', 'execute') then
    raise exception 'FAIL 1a: refresh_agent_badge_tier is reachable by a signed-in caller';
  end if;

  if not has_function_privilege('anon', 'public.badge_tier(boolean,boolean)', 'execute')
     or not has_function_privilege('anon', 'public.is_platform_staff(uuid)', 'execute')
     or not has_function_privilege('anon', 'public.is_checked_person(uuid)', 'execute') then
    raise exception 'FAIL 1b: anon cannot evaluate a helper the view calls';
  end if;

  select string_agg(p.proacl::text, ' | ') into acl
    from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace
   where n2.nspname = 'public' and p.proname in ('badge_tier','is_platform_staff','is_checked_person');
  if acl is null or acl ~ '(^|[^a-z_])=X' then
    raise exception 'FAIL 1c: a helper is granted to PUBLIC: %', coalesce(acl, '(null)');
  end if;

  select c.relacl::text into acl from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
   where n2.nspname = 'public' and c.relname = 'person_badge';
  if acl is null or acl not like '%anon=r/%' or acl not like '%authenticated=r/%' then
    raise exception 'FAIL 1d: person_badge does not hold SELECT for the two readers: %', coalesce(acl,'(null)');
  end if;
  if acl ~ '(anon|authenticated)=r[awdDxtm]' then
    raise exception 'FAIL 1d: person_badge is still writable by a reader role: %', acl;
  end if;

  -- CONTROLS on the grants: two objects this work must not have disturbed.
  if has_function_privilege('anon', 'private.derive_agent_badge()', 'execute') then
    raise exception 'FAIL 1e: private.derive_agent_badge is open to anon';
  end if;
  if not has_function_privilege('authenticated', 'public.agent_trust(uuid)', 'execute')
     or has_function_privilege('anon', 'public.agent_trust(uuid)', 'execute') then
    raise exception 'FAIL 1e: agent_trust no longer reads authenticated yes, anon no';
  end if;

  /* ---- 2. THE FOUNDER, READ AS THE STRANGER WHO SEES THE BADGE --------- */

  perform set_config('role', 'anon', true);

  -- CONTROL, must SUCCEED, or a missing tier below would mean nothing.
  select count(*) into ctl from public.agent_badges;
  if ctl < 1 then
    raise exception 'FAIL 2: the control read 0 agent_badges rows, so nothing below is evidence';
  end if;

  select pb.tier::text into pt from public.person_badge pb where pb.user_id = founder;
  if pt is distinct from 'platinum' then
    raise exception 'FAIL 2: a signed-out reader sees the founder as %, not platinum', coalesce(pt,'(no row)');
  end if;

  -- OPPOSITE-SHAPE CONTROL: the same anon cannot read user_roles itself.
  select count(*) into roles_seen from public.user_roles;
  if roles_seen <> 0 then
    raise exception 'FAIL 2: anon read % user_roles rows directly', roles_seen;
  end if;

  -- CONTROL C, section 65's twin rule: the view is not a write door.
  begin
    insert into public.person_badge (user_id, tier) values (gen_random_uuid(), 'platinum');
    wrote_view := 'ACCEPTED';
  exception when others then
    wrote_view := 'refused';
  end;
  if wrote_view <> 'refused' then
    raise exception 'FAIL 2: anon wrote a platinum badge through the view';
  end if;

  perform set_config('role', 'postgres', true);

  /* ---- 3. AN AGENT NOBODY HAS CHECKED DRAWS NOTHING -------------------- */

  select u.id into fixture
    from auth.users u
   where not exists (select 1 from public.agents a where a.user_id = u.id)
     and not public.is_platform_staff(u.id)
   order by u.created_at
   limit 1;
  if fixture is null then
    raise exception 'PROBE NEEDS ONE NON-STAFF AUTH USER WITH NO AGENT ROW AND THE ESTATE HAS NONE';
  end if;

  insert into public.agents (user_id, display_name, type, status, verified)
  values (fixture, 'Probe agent, rolled back', 'individual', 'APPROVED', true)
  returning id into ag;

  select ab.tier::text into t from public.agent_badges ab where ab.agent_id = ag;
  if t is distinct from 'none' then
    raise exception 'FAIL 3: approval alone drew a % badge at tier 0', t;
  end if;
  select count(*) into n from public.person_badge where user_id = fixture;
  if n <> 0 then
    raise exception 'FAIL 3: the person view drew a badge for somebody nobody has checked';
  end if;

  /* ---- 4. ONE PASSED RUNG LIGHTS GOLD, AND BOTH DOORS AGREE ------------ */

  insert into public.agent_verification_checks (agent_id, kind, status) values (ag, 'identity', 'passed');

  select ab.tier::text into t  from public.agent_badges ab where ab.agent_id = ag;
  select pb.tier::text into pt from public.person_badge  pb where pb.user_id  = fixture;
  if t is distinct from 'gold' or pt is distinct from 'gold' then
    raise exception 'FAIL 4: a checked agent reads % on the published row and % on the person view', t, pt;
  end if;

  /* ---- 5. PRECEDENCE, ON A PERSON WHO SATISFIES BOTH ------------------- */

  insert into public.user_roles (user_id, role) values (fixture, 'admin');

  select ab.tier::text into t  from public.agent_badges ab where ab.agent_id = ag;
  select pb.tier::text into pt from public.person_badge  pb where pb.user_id  = fixture;
  if t is distinct from 'platinum' or pt is distinct from 'platinum' then
    raise exception 'FAIL 5: a checked agent who is also staff reads % and %, not platinum on both', t, pt;
  end if;

  /* ---- 6. AND IT FOLLOWS THE ROLE BACK DOWN ---------------------------- */

  delete from public.user_roles where user_id = fixture and role = 'admin';

  select ab.tier::text into t  from public.agent_badges ab where ab.agent_id = ag;
  select pb.tier::text into pt from public.person_badge  pb where pb.user_id  = fixture;
  if t is distinct from 'gold' or pt is distinct from 'gold' then
    raise exception 'FAIL 6: after the role was withdrawn the row still reads % and %', t, pt;
  end if;

  /* ---- 7. A SIGNED-IN STRANGER CANNOT HAND THEMSELVES A BADGE ---------- */

  perform set_config('request.jwt.claims',
                     json_build_object('sub', fixture, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- CONTROL, must succeed in the same breath: this role CAN read the row, so
  -- the refusal below is a refusal and not an absence.
  select count(*) into ctl from public.agent_badges where agent_id = ag;
  if ctl <> 1 then
    raise exception 'FAIL 7: the refusal would be vacuous, this role cannot even see the row';
  end if;

  begin
    update public.agent_badges set tier = 'platinum' where agent_id = ag;
    get diagnostics n = row_count;
    wrote_badge := case when n > 0 then 'ACCEPTED' else 'refused' end;
  exception when others then
    wrote_badge := 'refused';
  end;
  perform set_config('role', 'postgres', true);
  if wrote_badge <> 'refused' then
    raise exception 'FAIL 7: a signed-in caller set their own tier to platinum by hand';
  end if;

  select ab.tier::text into t from public.agent_badges ab where ab.agent_id = ag;
  if t is distinct from 'gold' then
    raise exception 'FAIL 7: the hand write left the row reading %', t;
  end if;

  raise exception 'PROBE ALL PASS badge tiers: grants born locked with the three view helpers granted deliberately to anon and authenticated and to nobody else, person_badge SELECT-only for the two readers and it refused an anon insert, derive_agent_badge and agent_trust both undisturbed; a SIGNED-OUT reader sees the founder as PLATINUM while reading 0 rows of user_roles directly; approval at tier 0 drew NO badge on either door; one passed identity rung drew GOLD on BOTH doors in the same statement; the same person granted admin read PLATINUM on both and fell back to GOLD when the role was withdrawn; a signed-in caller who demonstrably CAN read the row could not write platinum into it. Rolled back on purpose.';
end;
$probe$;

rollback;
