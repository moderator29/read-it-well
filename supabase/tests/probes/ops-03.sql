-- OPS-03: a HIGH alert written by the database (not by the app's service role)
-- queues exactly one page through pg_net to the Vault secret
-- `vallo_ops_alert_webhook_url`, once an hour per title; medium alerts and the
-- app's own rows do not. Uses a throwaway secret value inside the rolled-back
-- transaction, so nothing is ever sent (pg_net sends only committed requests)
-- and the real secret, if one exists, is never read by this probe.
do $$
declare
  q0 bigint; q1 bigint; q2 bigint; q3 bigint; q4 bigint;
  had_secret boolean;
begin
  if not exists (select 1 from pg_trigger where tgname = 'risk_alerts_page_on_high'
                   and tgrelid = 'public.risk_alerts'::regclass and not tgisinternal) then
    raise exception 'PROBE_FAIL ops-03: no paging trigger on public.risk_alerts';
  end if;
  if has_function_privilege('anon', 'private.page_on_high_alert()', 'execute')
     or has_function_privilege('authenticated', 'private.page_on_high_alert()', 'execute') then
    raise exception 'PROBE_FAIL ops-03: the API roles can call private.page_on_high_alert()';
  end if;

  select exists (select 1 from vault.secrets where name = 'vallo_ops_alert_webhook_url') into had_secret;
  if had_secret then
    perform vault.update_secret((select id from vault.secrets where name = 'vallo_ops_alert_webhook_url'),
                                'https://ntfy.sh/probe-ops03-never-sent');
  else
    perform vault.create_secret('https://ntfy.sh/probe-ops03-never-sent', 'vallo_ops_alert_webhook_url');
  end if;

  select count(*) into q0 from net.http_request_queue;
  -- CONTROL: a database-written high alert pages.
  insert into public.risk_alerts (severity, status, title) values ('high', 'open', 'Probe OPS-03 ' || gen_random_uuid());
  select count(*) into q1 from net.http_request_queue;
  if q1 - q0 <> 1 then
    raise exception 'PROBE_FAIL ops-03: a database-written high alert queued % pages, expected 1', q1 - q0;
  end if;
  -- The same title again within the hour: no second page.
  insert into public.risk_alerts (severity, status, title)
    select 'high', 'open', title from public.risk_alerts where title like 'Probe OPS-03 %' limit 1;
  select count(*) into q2 from net.http_request_queue;
  if q2 <> q1 then raise exception 'PROBE_FAIL ops-03: a repeat within the hour paged again'; end if;
  -- Medium: no page.
  insert into public.risk_alerts (severity, status, title) values ('medium', 'open', 'Probe OPS-03 medium');
  select count(*) into q3 from net.http_request_queue;
  if q3 <> q2 then raise exception 'PROBE_FAIL ops-03: a medium alert paged'; end if;
  -- The app's service-role writes page from the app, not here.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  insert into public.risk_alerts (severity, status, title) values ('high', 'open', 'Probe OPS-03 app ' || gen_random_uuid());
  select count(*) into q4 from net.http_request_queue;
  if q4 <> q3 then raise exception 'PROBE_FAIL ops-03: an app (service_role) alert was paged twice'; end if;

  raise exception 'PROBE_OK ops-03: database high alerts page once an hour; medium and app-written rows do not';
end;
$$;
