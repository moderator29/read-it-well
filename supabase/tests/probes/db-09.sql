-- DB-09 (the columns part): a signed-out reader sees which badge a person
-- holds and the fee schedule, but not the staff member who granted or
-- revoked a badge, the reason or the evidence, or who set a fee. Signed-in
-- staff still read all of it (the standing desk).
do $$
declare
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  n int;
  col text;
begin
  -- 29 September: the console's second factor. The QA admin holds their role
  -- only on a session that proved a security key, so this probe's session
  -- carries one (rolled back with everything else).
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from (select user_id, badge_code, granted_at, revoked_at from public.user_badges) s;
  select count(*) into n from (select b.badge_code, bd.name from public.user_badges b join public.badges bd on bd.code = b.badge_code) s;
  select count(*) into n from (select id, kind, basis_points, flat_minor, effective_from, note from public.fee_rates) s;
  foreach col in array array['granted_by', 'revoked_by', 'reason', 'evidence'] loop
    begin
      execute format('select count(%I) from public.user_badges', col) into n;
      raise exception 'PROBE_FAIL db-09: anon read user_badges.%', col;
    exception when insufficient_privilege then null; end;
  end loop;
  begin
    execute 'select count(created_by) from public.fee_rates' into n;
    raise exception 'PROBE_FAIL db-09: anon read fee_rates.created_by';
  exception when insufficient_privilege then null; end;

  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  select count(*) into n from (select user_id, badge_code, granted_at, granted_by, reason, revoked_at from public.user_badges) s;
  select count(*) into n from (select id, created_by from public.fee_rates) s;

  raise exception 'PROBE_OK db-09';
end
$$;
