-- PUSH, PART THREE: SOMETHING ACTUALLY CALLS THE DRAIN, AND IT READS THE
-- REPLY OF ITS OWN LAST CALL BEFORE MAKING THE NEXT ONE.
--
-- ============================================================================
-- WHY THIS MIGRATION EXISTS AT ALL.
--
-- A queue that nothing drains is worse than no queue. It fills, it looks
-- healthy from inside the application, every notification is "queued
-- successfully", and nobody hears from the platform again. The seven existing
-- scheduled jobs are declared in `apps/web/vercel.json`, which is not this
-- worker's file to edit, and the request to add a line for `/api/push/drain`
-- is recorded in `docs/BUILD_07_LEDGER.md`.
--
-- WAITING FOR THAT LINE WOULD BE THE EXACT FAILURE THIS BUILD WAS WRITTEN
-- AGAINST. So the drain is scheduled from the database, through pg_cron and
-- pg_net, which is a mechanism this platform already runs the money
-- reconciliation on. When the `vercel.json` line lands, either caller is
-- harmless: the drain claims rows with a filtered UPDATE, so two callers
-- arriving together take different rows rather than the same ones twice.
--
-- ============================================================================
-- THE MEMORY, WHICH IS THE WHOLE POINT OF THE SHAPE BELOW.
--
-- `net.http_get` RETURNS A REQUEST ID, NOT A RESPONSE. It hands the call to a
-- background worker and returns immediately. A function that calls it and
-- returns "ok" has reported success for handing a payload to something it
-- never read the reply from. THAT IS THE FAULT THAT COST THIS PLATFORM 24
-- DAYS OF DEAD SCHEDULED JOBS, and it is the reason
-- `20260922200000_the_money_job_reads_its_own_reply` exists for the money
-- job.
--
-- This is that same shape, deliberately, for push. Each run looks up what
-- happened to the PREVIOUS run's request in `net._http_response` before
-- issuing a new one, and a non-2xx or a reply that never arrived becomes a
-- row on `/admin/alerts`. The verdict is also kept on the watch row so the
-- history is readable without joining to a table pg_net prunes.
--
-- A scheduler that cannot tell a 200 from a 401 is a green dashboard over a
-- dead job. This one can.

create table if not exists private.push_drain_watch (
  /* Exactly one row, for ever. The unique index below is what enforces it;
     a scheduler with two memories has none. */
  only_row boolean primary key default true,
  last_request_id bigint,
  last_requested_at timestamptz,
  last_verdict text,
  last_judged_at timestamptz,
  constraint push_drain_watch_single check (only_row)
);

insert into private.push_drain_watch (only_row) values (true)
on conflict (only_row) do nothing;

create or replace function private.request_push_drain()
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
  /* THE WHITESPACE SET IS EXPLICIT AND THIS IS NOT FUSSINESS.
     `btrim(x)` with one argument strips SPACES ONLY. A pasted trailing
     newline in a Vault secret took the money job down on 22 September, and
     the same two secrets are read here. Never `btrim(x)` on a value a human
     pasted into a form. */
  select btrim(decrypted_secret, E' \t\r\n') into site_url
    from vault.decrypted_secrets where name = 'vallo_site_url';
  select btrim(decrypted_secret, E' \t\r\n') into secret
    from vault.decrypted_secrets where name = 'vallo_reconcile_secret';

  if site_url is null or site_url = '' or secret is null or secret = '' then
    /* Unconfigured is a real state and it is reported rather than retried.
       The push queue is durable, so nothing is lost while this is true. */
    return jsonb_build_object(
      'status', 'unconfigured',
      'site_url_present', coalesce(site_url, '') <> '',
      'secret_present', coalesce(secret, '') <> ''
    );
  end if;

  -- WHAT HAPPENED TO THE LAST ONE. The memory.
  select w.last_request_id, w.last_requested_at
    into previous_id, previous_at
    from private.push_drain_watch w
   where w.only_row;

  if previous_id is not null then
    select r.status_code, left(coalesce(r.content, ''), 300)
      into previous_status, previous_body
      from net._http_response r
     where r.id = previous_id;

    if previous_status is null then
      /* pg_net prunes its response table, so an old request having no row is
         expected and is NOT a failure. Only a recent one with no reply is. */
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
        'Push drain: the last call did not succeed',
        format(
          'The scheduled push drain called the platform and the reply was %s. '
          || 'Until this reads 2xx, no notification is reaching any device, '
          || 'however healthy the queue looks from inside the application. '
          || 'A 401 means the bearer in Vault no longer matches the deployment. '
          || 'Body: %s',
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
    url := rtrim(site_url, '/') || '/api/push/drain',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json',
      /* Who is calling. NOT a credential and it opens nothing: the bearer
         does that. It only decides how loudly a refusal is recorded, so our
         own database being locked out reads as critical rather than as
         somebody rattling a door. See
         20260922210000_the_database_scheduler_says_who_it_is. */
      'X-Vallo-Scheduler', 'pg_cron'
    ),
    timeout_milliseconds := 30000
  ) into request_id;

  update private.push_drain_watch
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

comment on function private.request_push_drain() is
  'Calls /api/push/drain through pg_net every few minutes AND reads the reply of its previous call, raising a risk_alert on a non-2xx or a reply that never arrived. A scheduler that cannot tell a 200 from a 401 is a green dashboard over a dead job.';

-- BORN LOCKED. Rule 21, and `create or replace` PRESERVES GRANTS, so this is
-- restated on every replacement rather than assumed from the first one.
revoke all on function private.request_push_drain() from public;
revoke all on function private.request_push_drain() from anon;
revoke all on function private.request_push_drain() from authenticated;

revoke all on table private.push_drain_watch from public;
revoke all on table private.push_drain_watch from anon;
revoke all on table private.push_drain_watch from authenticated;

-- ----------------------------------------------------------------------------
-- THE SCHEDULE.
--
-- Every five minutes. Not every minute, because a push that is four minutes
-- late is still a push and a minutely job is sixty pointless requests an hour
-- on a queue that is usually empty. Not every fifteen, because "somebody just
-- messaged you" fifteen minutes later is not the product.
--
-- Unscheduled first so re-running this migration cannot leave two jobs
-- calling the same drain.

select cron.unschedule('vallo_push_drain')
 where exists (select 1 from cron.job where jobname = 'vallo_push_drain');

select cron.schedule('vallo_push_drain', '*/5 * * * *', 'select private.request_push_drain();');

-- ----------------------------------------------------------------------------
-- READ IT BACK.

do $$
begin
  if has_function_privilege('anon', 'private.request_push_drain()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.request_push_drain()', 'EXECUTE') then
    raise exception 'REFUSING: request_push_drain is executable by anon or authenticated';
  end if;

  if has_table_privilege('anon', 'private.push_drain_watch', 'SELECT')
    or has_table_privilege('authenticated', 'private.push_drain_watch', 'SELECT') then
    raise exception 'REFUSING: the scheduler watch table is readable by anon or authenticated';
  end if;

  if not exists (select 1 from cron.job where jobname = 'vallo_push_drain' and active) then
    raise exception 'REFUSING: the push drain is not scheduled, so nothing would ever call it';
  end if;

  if (select count(*) from cron.job where jobname = 'vallo_push_drain') <> 1 then
    raise exception 'REFUSING: the push drain is scheduled more than once';
  end if;

  if (select count(*) from private.push_drain_watch) <> 1 then
    raise exception 'REFUSING: the scheduler has % memories, it must have exactly one',
      (select count(*) from private.push_drain_watch);
  end if;
end $$;
