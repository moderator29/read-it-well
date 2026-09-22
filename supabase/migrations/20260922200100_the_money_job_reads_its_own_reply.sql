-- THE DEFECT THAT LET A DEAD JOB REPORT SUCCESS EVERY HOUR FOR THREE WEEKS.
--
-- `net.http_get` is asynchronous. It queues a request and returns an id. The
-- reply lands later in `net._http_response`, and NOTHING EVER LOOKED AT IT.
-- So this function returned {"status":"requested"} the moment pg_net accepted
-- the call, pg_cron recorded "succeeded", and the scheduler dashboard was
-- green, while every call answered 404 DEPLOYMENT_NOT_FOUND. The last
-- reconciliation this platform actually performed was on 29 August.
--
-- "Did it try" and "did it work" are different questions, and only the second
-- is worth a green light. This teaches the job to ask the second one: it
-- remembers the id of the request it made last time and, at the start of the
-- next run, reads that reply and judges it. A non-2xx raises a HIGH risk
-- alert naming the status and the body, which is the channel the other
-- scheduled jobs already use and the admin desk already reads.
--
-- WHY AN ALERT AND NOT AN EXCEPTION. Raising would roll back the transaction
-- and cancel the new request with it, so one bad hour would stop every later
-- hour from even trying. The failure would be loud and permanent rather than
-- loud and self-clearing. An alert is loud and lets the next attempt through.

create table if not exists private.reconciliation_watch (
  /* Exactly one row, ever. The constraint is the schema saying so rather than
     a convention somebody has to know. */
  only_row boolean primary key default true check (only_row),
  last_request_id bigint,
  last_requested_at timestamptz,
  last_verdict text,
  last_judged_at timestamptz
);

alter table private.reconciliation_watch enable row level security;
revoke all on table private.reconciliation_watch from public, anon, authenticated;

insert into private.reconciliation_watch (only_row) values (true)
on conflict (only_row) do nothing;

create or replace function private.request_money_reconciliation()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  site_url text;
  secret text;
  request_id bigint;
  previous_id bigint;
  previous_at timestamptz;
  previous_status integer;
  previous_body text;
  verdict text;
begin
  /* The whitespace set is explicit. `btrim(x)` with one argument strips
     SPACES ONLY, which let a pasted newline through and took this job down on
     22 September. Never `btrim(x)` on a value a human pasted. */
  select btrim(decrypted_secret, E' \t\r\n') into site_url
    from vault.decrypted_secrets where name = 'vallo_site_url';
  select btrim(decrypted_secret, E' \t\r\n') into secret
    from vault.decrypted_secrets where name = 'vallo_reconcile_secret';

  if site_url is null or site_url = '' or secret is null or secret = '' then
    /* Named separately so the answer is actionable. "It is not working" sends
       somebody reading logs; "the site url is missing" sends them to Vault. */
    return jsonb_build_object(
      'status', 'unconfigured',
      'site_url_present', coalesce(site_url, '') <> '',
      'secret_present', coalesce(secret, '') <> ''
    );
  end if;

  -- WHAT HAPPENED TO THE LAST ONE. This is the whole point of this revision.
  select w.last_request_id, w.last_requested_at
    into previous_id, previous_at
    from private.reconciliation_watch w
   where w.only_row;

  if previous_id is not null then
    select r.status_code, left(coalesce(r.content, ''), 300)
      into previous_status, previous_body
      from net._http_response r
     where r.id = previous_id;

    if previous_status is null then
      /*
       * No reply row. pg_net keeps responses for a few hours only, so an old
       * request having aged out is ordinary and is NOT a failure. A request
       * made within the last hour with no reply means the call never
       * completed, which is.
       */
      verdict := case
        when previous_at > now() - interval '1 hour' then 'no_reply'
        else 'aged_out'
      end;
    elsif previous_status between 200 and 299 then
      verdict := 'ok_' || previous_status::text;
    else
      verdict := 'failed_' || previous_status::text;
    end if;

    if verdict like 'failed_%' or verdict = 'no_reply' then
      insert into public.risk_alerts (severity, status, title, description, entity_type)
      values (
        'high',
        'open',
        'Money reconciliation: the last call did not succeed',
        format(
          'The scheduled reconciliation called the platform and the reply was %s. '
          || 'Until this reads 2xx, no payment is being reconciled, however green the '
          || 'scheduler looks. Body: %s',
          coalesce(previous_status::text, 'never received'),
          coalesce(nullif(previous_body, ''), '(empty)')
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
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  ) into request_id;

  update private.reconciliation_watch
     set last_request_id = request_id,
         last_requested_at = now(),
         last_verdict = verdict,
         last_judged_at = now()
   where only_row;

  /* The return value now carries BOTH questions: what we just asked, and how
     the last thing we asked turned out. */
  return jsonb_build_object(
    'status', 'requested',
    'request_id', request_id,
    'previous_verdict', verdict
  );
end;
$function$;

-- BORN LOCKED, NEVER BORN PUBLIC, restated rather than assumed because
-- `create or replace` preserves grants.
revoke execute on function private.request_money_reconciliation() from public;
revoke execute on function private.request_money_reconciliation() from anon;
revoke execute on function private.request_money_reconciliation() from authenticated;

do $$
declare
  anon_fn boolean;
  auth_fn boolean;
  anon_tbl boolean;
  auth_tbl boolean;
begin
  select has_function_privilege('anon', 'private.request_money_reconciliation()', 'EXECUTE'),
         has_function_privilege('authenticated', 'private.request_money_reconciliation()', 'EXECUTE'),
         has_table_privilege('anon', 'private.reconciliation_watch', 'SELECT'),
         has_table_privilege('authenticated', 'private.reconciliation_watch', 'SELECT')
    into anon_fn, auth_fn, anon_tbl, auth_tbl;

  if anon_fn or auth_fn or anon_tbl or auth_tbl then
    raise exception 'REFUSING: fn anon=% auth=%, table anon=% auth=%',
      anon_fn, auth_fn, anon_tbl, auth_tbl;
  end if;
end $$;
