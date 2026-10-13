-- PG01 (migration 20261013182504_pg01_testers_never_phone_gated): the two QA
-- accounts are never stopped at a database phone gate; a phone confirmed in
-- Settings (public.confirmed_phones) counts wherever a confirmed phone is
-- asked for; staff see it on a report; every signature the old site calls is
-- unchanged. Everything is rolled back by the final raise.
do $$
declare
  qa_member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  qa_admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  member uuid;
  rep uuid;
  sig boolean;
  def text;
  step_session constant uuid := gen_random_uuid();
begin
  -- 0. The two testers are the QA accounts the gates read.
  if not private.is_qa_account(qa_member) or not private.is_qa_account(qa_admin) then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: a tester is not in public.qa_accounts';
  end if;

  -- 1. A tester may host an event: no phone, any age (never blocked).
  if exists (select 1 from public.confirmed_phones c where c.user_id in (qa_member, qa_admin))
     or exists (select 1 from auth.users u where u.id in (qa_member, qa_admin) and u.phone_confirmed_at is not null) then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: fixtures changed (a tester has a phone)';
  end if;
  if not private.may_host_event(qa_member) or not private.may_host_event(qa_admin) then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: a tester is refused an event for want of a phone';
  end if;

  -- 2. A member past thirty days with no phone is still refused, and is let
  --    through by a phone confirmed in Settings (it used to count only an
  --    auth phone, so an email member could never host).
  select u.id into member
    from auth.users u join public.profiles p on p.id = u.id
   where p.created_at <= now() - interval '30 days'
     and u.phone_confirmed_at is null
     and not private.is_qa_account(u.id)
     and not exists (select 1 from public.confirmed_phones c where c.user_id = u.id)
     and not exists (select 1 from public.reports r
                      where r.target_type = 'user' and r.target_id = u.id::text
                        and r.status = 'resolved' and r.resolved_at >= now() - interval '90 days')
   order by p.created_at limit 1;
  if member is null then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: fixtures missing (an old member with no phone)';
  end if;
  if private.may_host_event(member) then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: a member with no phone may host an event';
  end if;
  insert into public.confirmed_phones (user_id, phone, confirmed_at) values (member, '+2348099990001', now());
  if not private.may_host_event(member) then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: a phone confirmed in Settings does not count for hosting';
  end if;

  -- 3. Staff see that phone on the reporter's report (moderation scope).
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (member, 'listing', gen_random_uuid()::text, 'pg01 probe')
  returning id into rep;
  /* Staff read under their console step-up, as the console does. */
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values (qa_admin, step_session, now() + interval '5 minutes');
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', qa_admin, 'role', 'authenticated', 'session_id', step_session)::text, true);
  select s.phone_confirmed into sig from public.admin_report_signals(array[rep]) s;
  reset role;
  if sig is distinct from true then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: the staff signal misses a phone confirmed in Settings (%)', sig;
  end if;

  -- 4. The truth autopause counts a tester's answer with phone_confirmation on.
  def := pg_get_functiondef('private.inspection_truth_consequences()'::regprocedure);
  if position('or private.is_qa_account(t.respondent_id)' in def) = 0 then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: the truth autopause still drops a tester''s answer';
  end if;

  -- 5. The old site calls the same signatures, with the same grants.
  if to_regprocedure('private.may_host_event(uuid)') is null
     or to_regprocedure('public.admin_report_signals(uuid[])') is null
     or not has_function_privilege('authenticated', 'public.admin_report_signals(uuid[])', 'execute')
     or not has_function_privilege('authenticated', 'private.may_host_event(uuid)', 'execute')
     or has_function_privilege('anon', 'private.inspection_truth_consequences()', 'execute') then
    raise exception 'PROBE_FAIL pg01-testers-never-phone-gated: a signature or grant changed';
  end if;

  raise exception 'PROBE_OK pg01-testers-never-phone-gated';
end
$$;
