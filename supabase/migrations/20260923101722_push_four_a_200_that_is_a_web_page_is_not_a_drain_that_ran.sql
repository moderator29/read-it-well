-- A 200 THAT IS A WEB PAGE IS NOT A DRAIN THAT RAN.
--
-- ============================================================================
-- I BUILT THIS SCHEDULER TO CATCH A JOB THAT REPORTS SUCCESS WITHOUT READING
-- ITS REPLY, AND THEN MADE THE SAME MISTAKE ONE LAYER IN.
--
-- `20260923095900` reads the previous call's reply and judges it. It judged
-- it BY STATUS CODE ALONE. Within fifteen minutes of being scheduled it had
-- recorded four consecutive runs as `ok_200`, and every one of them was a
-- failure. This is the evidence, from `net._http_response`:
--
--   id 1074, 1075, 1076, 1077   status 200
--   body: "<!DOCTYPE html><html data-dpl-id=\"dpl_...\" lang=\"en\" ...>"
--
-- That is the Vallo web page. `/api/push/drain` was not deployed yet, and an
-- unknown path on this deployment does NOT answer 404: it answers 200 with
-- the application's HTML. So the scheduler asked "was it a 2xx", got yes, and
-- wrote down `ok_200` for a drain that had never run and did not exist.
--
-- HAD THIS NOT BEEN LOOKED AT, the push queue would have filled while a green
-- verdict sat on the watch row saying the drain was healthy. That is the
-- 24-day fault exactly: not a missing check, but a check that reads the
-- cheapest available signal and calls it proof. A status code is a fact about
-- a CONNECTION. It is not a fact about the WORK.
--
-- ============================================================================
-- THE FIX: THE REPLY MUST IDENTIFY ITSELF AS THE THING THAT WAS ASKED FOR.
--
-- `lib/cron/run.ts` wraps every scheduled job in one envelope, and that
-- envelope always carries the job's own name:
--
--   {"ok":true,"job":"push-drain","outcome":"ok",...}
--   {"ok":false,"job":"push-drain","reason":"unauthorized",...}
--
-- So the test is not "was it 2xx". It is "did the push drain answer". A page
-- of HTML cannot accidentally contain `"job":"push-drain"`, an old deployment
-- cannot, and a login redirect cannot. The verdict `wrong_body` is added for
-- exactly the state that has been true for the last twenty minutes, and it
-- alerts as loudly as a 500, because it means the same thing: nothing ran.
--
-- NOTE FOR WHOEVER OWNS THE MONEY JOB. `private.request_money_reconciliation`
-- judges by status alone in the same way. It has not misfired because
-- `/api/paystack/reconcile` exists and answers JSON. But the day that route
-- is renamed, moved, or shadowed by a redirect, that job will report `ok_200`
-- at a web page and reconcile nothing, silently, and money is a worse thing to
-- be wrong about than a notification. It is raised as a request in
-- `docs/BUILD_07_LEDGER.md` rather than changed here, because it is not this
-- worker's function.

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
  /* The whitespace set is explicit. `btrim(x)` with one argument strips
     SPACES ONLY, which let a pasted newline through and took the money job
     down on 22 September. */
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

  select w.last_request_id, w.last_requested_at
    into previous_id, previous_at
    from private.push_drain_watch w
   where w.only_row;

  if previous_id is not null then
    /* More of the body than the old 300 characters, because the thing being
       looked for can sit behind a long envelope, and because a body that is
       a web page needs to be recognisable as one in the alert. */
    select r.status_code, left(coalesce(r.content, ''), 1000)
      into previous_status, previous_body
      from net._http_response r
     where r.id = previous_id;

    if previous_status is null then
      verdict := case
        when previous_at > now() - interval '1 hour' then 'no_reply'
        else 'aged_out'
      end;
    elsif previous_status between 200 and 299 then
      /* THE WHOLE POINT OF THIS MIGRATION.
         A 2xx says a server answered. It does not say WHAT answered. The
         envelope from lib/cron/run.ts names the job, so the drain answering
         is the only thing that can produce this string. */
      if position('"job":"push-drain"' in coalesce(previous_body, '')) > 0 then
        verdict := 'ok_' || previous_status::text;
      else
        verdict := 'wrong_body_' || previous_status::text;
      end if;
    else
      verdict := 'failed_' || previous_status::text;
    end if;

    if verdict like 'failed_%' or verdict like 'wrong_body_%' or verdict = 'no_reply' then
      insert into public.risk_alerts (severity, status, title, description, entity_type)
      values (
        'high',
        'open',
        case
          when verdict like 'wrong_body_%'
            then 'Push drain: something answered, but it was not the drain'
          else 'Push drain: the last call did not succeed'
        end,
        case
          when verdict like 'wrong_body_%' then format(
            'The scheduled push drain called %s/api/push/drain and got a %s that '
            || 'was NOT the drain''s reply. On this deployment an unknown path '
            || 'answers 200 with the web page rather than 404, so this almost '
            || 'always means the route is not deployed, was renamed, or is being '
            || 'shadowed by a redirect. No notification is reaching any device. '
            || 'First 200 characters of what came back: %s',
            site_url, previous_status::text, left(coalesce(previous_body, '(empty)'), 200)
          )
          else format(
            'The scheduled push drain called the platform and the reply was %s. '
            || 'Until this reads 2xx with the drain''s own envelope, no '
            || 'notification is reaching any device, however healthy the queue '
            || 'looks from inside the application. A 401 means the bearer in '
            || 'Vault no longer matches the deployment. Body: %s',
            coalesce(previous_status::text, 'never received'),
            coalesce(nullif(left(previous_body, 200), ''), '(empty)')
          )
        end,
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
  'Calls /api/push/drain through pg_net AND reads the reply of its previous call, judging it on the drain''s own envelope rather than on the status code, because on this deployment an unknown path answers 200 with a web page. Raises a risk_alert on a non-2xx, on a 2xx that is not the drain, and on a reply that never arrived.';

-- BORN LOCKED. `create or replace` preserves grants, so this is restated
-- rather than assumed.
revoke execute on function private.request_push_drain() from public;
revoke execute on function private.request_push_drain() from anon;
revoke execute on function private.request_push_drain() from authenticated;

-- ----------------------------------------------------------------------------
-- READ IT BACK, AND PROVE THE NEW TEST ON THE EXACT BODIES THAT FOOLED THE
-- OLD ONE. A fix asserted against a hypothetical is a fix nobody has run.

do $$
declare
  v_html text := '<!DOCTYPE html><html data-dpl-id="dpl_G9u3Z4ojeN4ZMaPw39SWdJSzKmbe" lang="en" dir="ltr"><head>';
  v_envelope text := '{"ok":true,"job":"push-drain","outcome":"ok","startedAt":"2026-09-23T10:15:00.000Z"}';
  v_refusal text := '{"ok":false,"job":"push-drain","reason":"unauthorized","startedAt":"2026-09-23T10:15:00.000Z"}';
  v_other_job text := '{"ok":true,"job":"hold-sweep","outcome":"ok"}';
begin
  if position('"job":"push-drain"' in v_html) > 0 then
    raise exception 'REFUSING: the web page would still be read as a successful drain';
  end if;
  if position('"job":"push-drain"' in v_envelope) = 0 then
    raise exception 'REFUSING: a real drain reply would be read as a failure';
  end if;
  if position('"job":"push-drain"' in v_refusal) = 0 then
    raise exception 'REFUSING: the drain refusing is still the drain answering and must be judged on its status';
  end if;
  if position('"job":"push-drain"' in v_other_job) > 0 then
    raise exception 'REFUSING: another job''s envelope would be accepted as this one';
  end if;

  if has_function_privilege('anon', 'private.request_push_drain()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.request_push_drain()', 'EXECUTE') then
    raise exception 'REFUSING: request_push_drain is executable by anon or authenticated';
  end if;

  if not exists (select 1 from cron.job where jobname = 'vallo_push_drain' and active) then
    raise exception 'REFUSING: the push drain is not scheduled';
  end if;
end $$;
