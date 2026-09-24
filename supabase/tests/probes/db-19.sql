-- DB-19: an open risk alert carries no resolution time. The desk's own
-- writes (open, then resolved with its time) still go through.
do $$
declare
  aid uuid;
  n int;
begin
  select count(*) into n from public.risk_alerts where status = 'open' and resolved_at is not null;
  if n <> 0 then raise exception 'PROBE_FAIL db-19: % open alerts say they were resolved', n; end if;

  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values ('low', 'open', 'Probe DB-19', 'Probe DB-19 control.', 'probe', 'db-19') returning id into aid;
  update public.risk_alerts set status = 'resolved', resolved_at = now() where id = aid;
  update public.risk_alerts set status = 'open', resolved_at = null where id = aid;

  begin
    update public.risk_alerts set resolved_at = now() where id = aid;
    raise exception 'PROBE_FAIL db-19: an open alert took a resolution time';
  exception when check_violation then null; end;

  raise exception 'PROBE_OK db-19';
end
$$;
