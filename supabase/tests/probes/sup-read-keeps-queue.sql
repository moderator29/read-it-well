-- SUP-READ-KEEPS-QUEUE: a member opening their support thread (the mark-read
-- stamp) does not move the ticket in the staff queue, which orders on
-- updated_at; a real change such as resolving it still does. Migration
-- 20260929010610. Always rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  tid uuid;
  before_ts timestamptz;
  after_ts timestamptz;
  r jsonb;
begin
  insert into public.support_tickets (reference, user_id, name, email, body, status)
  values ('VAL-SUP-PRB77', member, 'Probe', 'probe@example.invalid', 'Probe', 'open') returning id into tid;
  set local session_replication_role = replica;
  update public.support_tickets set updated_at = now() - interval '2 days' where id = tid;
  set local session_replication_role = origin;
  select updated_at into before_ts from public.support_tickets where id = tid;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  r := public.support_ticket_member_mark_read(tid);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-read-keeps-queue: mark read %', r; end if;
  select updated_at into after_ts from public.support_tickets where id = tid;
  if after_ts <> before_ts then raise exception 'PROBE_FAIL sup-read-keeps-queue: reading moved the queue'; end if;

  -- CONTROL: resolving is a real change and does move it.
  r := public.support_ticket_member_resolve(tid);
  select updated_at into after_ts from public.support_tickets where id = tid;
  if not after_ts > before_ts then raise exception 'PROBE_FAIL sup-read-keeps-queue: resolve did not bump updated_at'; end if;

  raise exception 'PROBE_OK sup-read-keeps-queue';
end $$;
