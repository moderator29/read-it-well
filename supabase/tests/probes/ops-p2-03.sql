-- OPS-P2-03: an alert cannot be open and carry a resolution time. The
-- constraint came with DB-19 (Agent 1, 20260924023518); this pins it from the
-- ops side: none live, and an attempt to write one is refused. Rolls back.
do $$
declare
  n int;
begin
  select count(*) into n from public.risk_alerts where status = 'open' and resolved_at is not null;
  if n <> 0 then raise exception 'PROBE_FAIL ops-p2-03: % open alerts carry a resolution time', n; end if;
  begin
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id, resolved_at)
    values ('low', 'open', 'probe ops-p2-03', 'probe', 'probe', 'probe', now());
    raise exception 'PROBE_FAIL ops-p2-03: an open alert with a resolution time was stored';
  exception when check_violation then null; end;
  raise exception 'PROBE_OK ops-p2-03';
end $$;
