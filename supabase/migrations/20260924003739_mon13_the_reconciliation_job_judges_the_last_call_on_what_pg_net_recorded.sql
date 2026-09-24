-- MON-13: the reconciliation job judges the last call on what pg_net recorded.
--
-- A missing status used to read 'no_reply' only when the previous request was
-- under an hour old, and 'aged_out' (silent) otherwise. The job runs hourly,
-- so the branch was a coin flip on millisecond jitter, and a reconciler that
-- always timed out could look healthy for ever. pg_net records the outcome
-- itself: `timed_out` and `error_msg` on net._http_response, and no row at all
-- when the response was never stored. Any of those is 'no_reply', and it
-- alerts. The body test now requires `"ok":true`, not just the word "ok"
-- (which `"ok":false` also contains). The timeout rises from 30 to 120
-- seconds, because the route pages up to ten Paystack list calls plus a
-- verify per stale hold.

CREATE OR REPLACE FUNCTION private.request_money_reconciliation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  site_url text;
  secret text;
  request_id bigint;
  previous_id bigint;
  previous_at timestamptz;
  previous_status integer;
  previous_body text;
  previous_timed_out boolean;
  previous_error text;
  previous_row_id bigint;
  answered_as_the_route boolean;
  verdict text;
  alert_title text;
begin
  /* The whitespace set is explicit. `btrim(x)` with one argument strips
     SPACES ONLY, which let a pasted newline through and took this job down on
     22 September. Never `btrim(x)` on a value a human pasted. */
  select btrim(decrypted_secret, E' \t\r\n') into site_url
    from vault.decrypted_secrets where name = 'vallo_site_url';
  select btrim(decrypted_secret, E' \t\r\n') into secret
    from vault.decrypted_secrets where name = 'vallo_reconcile_secret';

  if site_url is null or site_url = '' or secret is null or secret = '' then
    return jsonb_build_object(
      'status', 'unconfigured',
      'site_url_present', coalesce(site_url, '') <> '',
      'secret_present', coalesce(secret, '') <> ''
    );
  end if;

  -- WHAT HAPPENED TO THE LAST ONE, which is why this function has a memory.
  select w.last_request_id, w.last_requested_at
    into previous_id, previous_at
    from private.reconciliation_watch w
   where w.only_row;

  if previous_id is not null then
    select r.id, r.status_code, left(coalesce(r.content, ''), 1000), r.timed_out, r.error_msg
      into previous_row_id, previous_status, previous_body, previous_timed_out, previous_error
      from net._http_response r
     where r.id = previous_id;

    /* THE OUTCOME, NOT THE ATTEMPT. A 200 carrying the Vallo HTML shell is
       what this asks about, and it is what a renamed route produces. */
    answered_as_the_route :=
      coalesce(previous_body, '') like '%"charges"%'
      and coalesce(previous_body, '') ~ '"ok"\s*:\s*true';

    if previous_row_id is null
       or coalesce(previous_timed_out, false)
       or previous_error is not null
       or previous_status is null then
      verdict := 'no_reply';
    elsif previous_status between 200 and 299 and answered_as_the_route then
      verdict := 'ok_' || previous_status::text;
    elsif previous_status between 200 and 299 then
      verdict := 'wrong_body_' || previous_status::text;
    else
      verdict := 'failed_' || previous_status::text;
    end if;

    -- One open alert per kind of failure, keyed on the full title: an outage
    -- of a day is one row the desk resolves, not twenty-four, and a different
    -- failure inside the same day still gets its own row.
    alert_title := case
      when verdict like 'wrong_body_%'
      then 'Money reconciliation: the last call reached something that is not the reconciler'
      when verdict = 'no_reply'
      then 'Money reconciliation: the last call got no reply'
      else 'Money reconciliation: the last call did not succeed'
    end;
    if (verdict like 'failed_%' or verdict like 'wrong_body_%' or verdict = 'no_reply')
       and not exists (
         select 1 from public.risk_alerts a
          where a.entity_type = 'cron_job' and a.status = 'open'
            and a.title = alert_title
            and a.created_at > now() - interval '24 hours') then
      insert into public.risk_alerts (severity, status, title, description, entity_type)
      values (
        'high',
        'open',
        alert_title,
        format(
          'The scheduled reconciliation called the platform and the reply was %s (%s). '
          || 'Until this reads ok_2xx, no payment is being reconciled, however green the '
          || 'scheduler looks. A 2xx that is not the reconciler usually means the route '
          || 'was renamed, moved or shadowed, because an unknown path here answers 200 '
          || 'with the site shell rather than 404. pg_net: timed_out=%s error=%s row=%s. Body: %s',
          coalesce(previous_status::text, 'never received'),
          verdict,
          coalesce(previous_timed_out::text, 'null'),
          coalesce(previous_error, 'none'),
          case when previous_row_id is null then 'missing' else 'present' end,
          coalesce(nullif(left(previous_body, 300), ''), '(empty)')
        ),
        'cron_job'
      );
    end if;
  else
    verdict := 'first_run';
  end if;

  select net.http_get(
    url := rtrim(site_url, '/') || '/api/paystack/reconcile?hours=48&apply=1',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json',
      /* Who is calling. Not a credential. */
      'X-Vallo-Scheduler', 'pg_cron'
    ),
    timeout_milliseconds := 120000
  ) into request_id;

  update private.reconciliation_watch
     set last_request_id = request_id,
         last_requested_at = now(),
         last_verdict = verdict,
         last_judged_at = now()
   where only_row;

  return jsonb_build_object(
    'status', 'requested',
    'request_id', request_id,
    'previous_verdict', verdict
  );
end;
$function$;
