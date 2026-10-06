-- W7-R1: a member sees and writes only their own first-run rows; marking
-- twice is a no-op; anonymous callers can do neither. Rolls back.
do $$
declare
  me    uuid;
  other uuid;
  n int;
  ok boolean;
begin
  select id into me from auth.users order by created_at limit 1;
  select id into other from auth.users where id <> me order by created_at limit 1;
  if me is null or other is null then
    raise exception 'PROBE_FAIL b4-first-run: needs two users to test isolation';
  end if;

  insert into public.first_runs_seen (user_id, feature) values (other, 'probe-other');

  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if not public.mark_first_run_seen('probe-feature') then
    raise exception 'PROBE_FAIL b4-first-run: the first mark did not write';
  end if;
  if public.mark_first_run_seen('probe-feature') is not null then
    raise exception 'PROBE_FAIL b4-first-run: a second mark wrote again';
  end if;
  select count(*) into n from public.first_runs_seen where feature like 'probe-%';
  if n <> 1 then
    raise exception 'PROBE_FAIL b4-first-run: a member sees % probe rows, expected only their own', n;
  end if;

  ok := false;
  begin
    insert into public.first_runs_seen (user_id, feature) values (other, 'probe-forged');
  exception when insufficient_privilege or check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-first-run: a member wrote a row for someone else'; end if;

  ok := false;
  begin
    perform public.mark_first_run_seen('Not A Feature!');
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-first-run: a malformed feature key was accepted'; end if;

  reset role;
  if has_table_privilege('anon', 'public.first_runs_seen', 'SELECT')
     or has_table_privilege('authenticated', 'public.first_runs_seen', 'DELETE') then
    raise exception 'PROBE_FAIL b4-first-run: grants are wider than read and insert';
  end if;

  raise exception 'PROBE_OK b4-first-run';
end $$;
