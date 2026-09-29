-- THE CONSOLE'S SECOND FACTOR (29 September 2026): an admin or a staff member
-- holds their role, to the database, only while their session has proved a
-- security key (public.console_step_ups, written by the service role after a
-- WebAuthn assertion). A stolen password gets a member's view and nothing more.
--
--  * signed in as a real admin with NO proof: has_role(self, admin) is false,
--    staff_can(self, *) is false, my_staff_access says is_admin but not
--    console_verified, and an admin-only table reads like a member's;
--  * a proof for ANOTHER session of the same account opens nothing;
--  * an EXPIRED proof opens nothing;
--  * a live proof for THIS session opens it all again;
--  * asked about somebody else, or with no caller (jobs, triggers), has_role
--    answers from user_roles as before;
--  * a live staff grant with no proof gets no scope, and with one gets its own;
--  * members can neither read nor write console_step_ups.
do $$
declare
  boss uuid;
  staffer uuid;
  staff_scope text;
  sess constant uuid := gen_random_uuid();
  other_sess constant uuid := gen_random_uuid();
  j jsonb;
  seen_without int;
  seen_with int;
  n int;
begin
  select user_id into boss from public.user_roles where role = 'admin' order by granted_at limit 1;
  if boss is null then raise exception 'PROBE_FAIL sec-console-mfa: no admin to probe with'; end if;

  -- No caller: unchanged.
  if not private.has_role(boss, 'admin'::public.app_role) then
    raise exception 'PROBE_FAIL sec-console-mfa: has_role changed for a caller-less check';
  end if;

  -- Signed in as the admin, no proof.
  perform set_config('request.jwt.claims',
    json_build_object('sub', boss, 'role', 'authenticated', 'session_id', sess)::text, true);
  if private.has_role(boss, 'admin'::public.app_role) then
    raise exception 'PROBE_FAIL sec-console-mfa: admin role held with no key proof';
  end if;
  if private.staff_can(boss, 'support') then
    raise exception 'PROBE_FAIL sec-console-mfa: staff scope held by an admin with no key proof';
  end if;
  set local role authenticated;
  j := public.my_staff_access();
  if (j ->> 'is_admin')::boolean is not true or (j ->> 'console_verified')::boolean is not false then
    raise exception 'PROBE_FAIL sec-console-mfa: my_staff_access without a proof is %', j;
  end if;
  select count(*) into seen_without from public.audit_log;
  begin
    select count(*) into n from public.console_step_ups;
    raise exception 'PROBE_FAIL sec-console-mfa: a member read console_step_ups';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.console_step_ups (user_id, session_id, expires_at) values (boss, sess, now() + interval '1 hour');
    raise exception 'PROBE_FAIL sec-console-mfa: a member wrote their own console proof';
  exception when insufficient_privilege then null; end;
  reset role;

  -- A proof for another session, and an expired one for this session: nothing.
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values (boss, other_sess, now() + interval '1 hour'), (boss, sess, now() - interval '1 minute');
  if private.has_role(boss, 'admin'::public.app_role) then
    raise exception 'PROBE_FAIL sec-console-mfa: another session''s or a lapsed proof opened the console';
  end if;

  -- A live proof for this session: the role is back.
  update public.console_step_ups set expires_at = now() + interval '1 hour' where user_id = boss and session_id = sess;
  if not private.has_role(boss, 'admin'::public.app_role) or not private.staff_can(boss, 'support') then
    raise exception 'PROBE_FAIL sec-console-mfa: a live proof did not open the console';
  end if;
  set local role authenticated;
  j := public.my_staff_access();
  if (j ->> 'console_verified')::boolean is not true then
    raise exception 'PROBE_FAIL sec-console-mfa: my_staff_access with a proof is %', j;
  end if;
  select count(*) into seen_with from public.audit_log;
  reset role;
  if seen_with <= seen_without then
    raise exception 'PROBE_FAIL sec-console-mfa: audit_log read % rows without a proof and % with one', seen_without, seen_with;
  end if;

  -- Somebody else asking about the admin still gets the plain answer.
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'session_id', gen_random_uuid())::text, true);
  if not private.has_role(boss, 'admin'::public.app_role) then
    raise exception 'PROBE_FAIL sec-console-mfa: has_role about another person changed';
  end if;

  -- A scoped staff member (when there is one who has read the handbook).
  select g.user_id, (g.scopes::text[])[1] into staffer, staff_scope
    from public.staff_grants g
   where g.revoked_at is null and cardinality(g.scopes) > 0
     and not exists (select 1 from public.user_roles r where r.user_id = g.user_id and r.role in ('admin', 'super_admin'))
     and exists (select 1 from public.staff_handbook_acks a where a.user_id = g.user_id and a.version = private.staff_handbook_version())
   limit 1;
  if staffer is not null then
    perform set_config('request.jwt.claims',
      json_build_object('sub', staffer, 'role', 'authenticated', 'session_id', sess)::text, true);
    if private.staff_can(staffer, staff_scope) then
      raise exception 'PROBE_FAIL sec-console-mfa: staff scope held with no key proof';
    end if;
    insert into public.console_step_ups (user_id, session_id, expires_at) values (staffer, sess, now() + interval '1 hour');
    if not private.staff_can(staffer, staff_scope) then
      raise exception 'PROBE_FAIL sec-console-mfa: a staff member''s live proof did not open their scope';
    end if;
  end if;

  raise exception 'PROBE_OK sec-console-mfa (staff case %)', case when staffer is null then 'skipped: no acknowledged staff' else 'run' end;
end
$$;
