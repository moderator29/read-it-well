-- MON-13: the reconciliation job judges its last call on what pg_net stored.
-- A missing response row and a timed-out one are both 'no_reply' and alert;
-- a 200 whose body says "ok":false is 'wrong_body_200' and alerts; a real
-- reconciler reply ('"ok":true' and "charges") is 'ok_200' and does not.
-- Failures open at most one alert a day, so an outage is one row, not 24.
-- The previous call is faked with negative ids in net._http_response; the
-- job's own new request is queued and rolled back with everything else.
do $$
declare r jsonb; res text := ''; a0 int; a1 int; open0 int; want text;
begin
  select count(*) into a0 from public.risk_alerts where entity_type = 'cron_job';
  select count(*) into open0 from public.risk_alerts where entity_type = 'cron_job' and status = 'open'
     and title like 'Money reconciliation:%' and created_at > now() - interval '24 hours';
  update private.reconciliation_watch set last_request_id = -424242, last_requested_at = now() - interval '61 minutes' where only_row;
  r := private.request_money_reconciliation(); res := res || ' missing_row=' || (r->>'previous_verdict');
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created) values (-424243, null, null, true, 'Timeout of 120000 ms reached', now());
  update private.reconciliation_watch set last_request_id = -424243 where only_row;
  r := private.request_money_reconciliation(); res := res || ' timed_out=' || (r->>'previous_verdict');
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created) values (-424244, 200, '{"ok":false,"charges":{"seen":0}}', false, null, now());
  update private.reconciliation_watch set last_request_id = -424244 where only_row;
  r := private.request_money_reconciliation(); res := res || ' ok_false=' || (r->>'previous_verdict');
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created) values (-424245, 200, '{"ok":true,"apply":true,"charges":{"seen":0}}', false, null, now());
  update private.reconciliation_watch set last_request_id = -424245 where only_row;
  r := private.request_money_reconciliation(); res := res || ' ok_true=' || (r->>'previous_verdict');
  select count(*) into a1 from public.risk_alerts where entity_type = 'cron_job';
  res := res || ' alerts_added=' || (a1 - a0);
  want := ' missing_row=no_reply timed_out=no_reply ok_false=wrong_body_200 ok_true=ok_200 alerts_added='
          || (case when open0 > 0 then 0 else 1 end)::text;
  if res <> want then
    raise exception 'PROBE_FAIL mon-13:%', res;
  end if;
  raise exception 'PROBE_OK mon-13';
end $$;
