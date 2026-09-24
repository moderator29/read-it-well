-- OPS-03: a high alert written BY THE DATABASE pages a person, through the
-- database, so it still leaves when the web app (and its crons) are down.
--
-- Eleven database functions write public.risk_alerts directly: the escrow
-- float invariant check, the money reconciliation and push drain watchers,
-- the content scanners, report intake. None of those rows told anybody.
-- The app's own alerts page through lib/ops/page.ts (OPS_ALERT_EMAIL /
-- OPS_ALERT_WEBHOOK_URL); this trigger covers every other writer, so it skips
-- rows the app writes with the service role, and a person is not paged twice.
--
-- Where it pages: the Vault secret `vallo_ops_alert_webhook_url`, an https URL
-- that takes a JSON POST {"title","text"} (for example https://ntfy.sh/<topic>).
-- Absent, it does nothing. At most once an hour per alert title, like the app.
-- The POST goes through pg_net, which sends after the transaction commits, so
-- a rolled-back insert pages nobody. The trigger can never block or fail the
-- alert row: any error is swallowed and the row stands.
create or replace function private.page_on_high_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook text;
  writer text;
  recent integer;
begin
  -- The app's service-role writes page from the app; do not page twice.
  writer := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  if writer = 'service_role' then
    return null;
  end if;

  select btrim(decrypted_secret, E' \t\r\n') into hook
    from vault.decrypted_secrets where name = 'vallo_ops_alert_webhook_url';
  if hook is null or hook !~ '^https://' then
    return null;
  end if;

  select count(*) into recent
    from public.risk_alerts
   where title = new.title
     and id <> new.id
     and severity = 'high'
     and created_at > now() - interval '1 hour';
  if recent > 0 then
    return null;
  end if;

  perform net.http_post(
    url := hook,
    body := jsonb_build_object(
      'title', '[Vallo database] ' || left(new.title, 160),
      'text', left(new.title || E'\n\n' || coalesce(new.description, '') || E'\n\nOpen alerts: /admin/alerts', 2000)
    ),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  return null;
end;
$$;

revoke all on function private.page_on_high_alert() from public, anon, authenticated;

drop trigger if exists risk_alerts_page_on_high on public.risk_alerts;
create trigger risk_alerts_page_on_high
  after insert on public.risk_alerts
  for each row
  when (new.severity = 'high')
  execute function private.page_on_high_alert();
