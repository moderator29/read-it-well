-- SEC-09: a member writing straight through PostgREST meets the same kind of
-- limit the server actions apply: the 61st message in ten minutes and the
-- 31st report in an hour are refused (54000); up to the limit every insert
-- lands; the service role is not counted.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  convo uuid;
  i int;
  refused text;
begin
  select id into convo from public.conversations where guest_id = member or agent_id = member limit 1;
  if convo is null then raise exception 'PROBE_FAIL sec-09: the member has no conversation to write into'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: sixty messages in a burst all land.
  for i in 1..60 loop
    insert into public.messages (conversation_id, sender_id, body) values (convo, member, 'probe ' || i);
  end loop;

  -- REFUSAL: the sixty-first.
  refused := null;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (convo, member, 'probe 61');
  exception when others then refused := sqlstate; end;
  if refused is distinct from '54000' then
    raise exception 'PROBE_FAIL sec-09: the 61st message in ten minutes was not refused (%)', coalesce(refused, 'inserted');
  end if;

  -- CONTROL then REFUSAL on reports: thirty land, the thirty-first is refused.
  for i in 1..30 loop
    insert into public.reports (reporter_id, target_type, target_id, reason)
    values (member, 'listing', gen_random_uuid()::text, 'probe');
  end loop;
  refused := null;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason)
    values (member, 'listing', gen_random_uuid()::text, 'probe');
  exception when others then refused := sqlstate; end;
  if refused is distinct from '54000' then
    raise exception 'PROBE_FAIL sec-09: the 31st report in an hour was not refused (%)', coalesce(refused, 'inserted');
  end if;

  -- CONTROL: the service role is not counted.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
  insert into public.messages (conversation_id, sender_id, body) values (convo, member, 'probe by the service');

  raise exception 'PROBE_OK sec-09: members are limited at the table (messages 60/10 min, reports 30/h); the service role is not';
end;
$$;
