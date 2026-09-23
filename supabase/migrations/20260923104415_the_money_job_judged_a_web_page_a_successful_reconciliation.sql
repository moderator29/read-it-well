/*
 * THE MONEY JOB READ A STATUS CODE AND CALLED IT A RECONCILIATION.
 *
 * Raised as R-P6 by the push worker, which had just found the identical fault
 * in its own scheduler and then went looking for the shape elsewhere rather
 * than filing one bug and stopping. Confirmed here against the live function
 * before changing anything.
 *
 * WHAT IT DID. `private.request_money_reconciliation` judged its previous
 * reply with `elsif previous_status between 200 and 299 then verdict :=
 * 'ok_' || previous_status`. Nothing looked at the body. It already SELECTED
 * the body, and used it only to decorate an alert it had decided to raise for
 * another reason.
 *
 * WHY THAT IS NOT A THEORETICAL COMPLAINT ON THIS PLATFORM. An unknown path on
 * this deployment does not answer 404. Next.js answers 200 with the Vallo HTML
 * shell. So the day `/api/paystack/reconcile` is renamed, moved, or shadowed
 * by a redirect, this job records `ok_200` at a web page, reconciles nothing,
 * and the scheduler's dashboard stays green. That is the 29 August fault
 * exactly, which ran for 24 days, pointed at payments instead of at
 * notifications. The push worker had already watched its own copy of it report
 * `ok_200` for four consecutive runs that all failed.
 *
 * THE FIX IS ONE CONDITION AND IT IS ABOUT THE OUTCOME, NOT THE ATTEMPT. The
 * route answers its own envelope: `{"ok":true,"apply":...,"window":{...},
 * "charges":{...},...}`. A 2xx whose body does not carry that envelope is now
 * its own verdict, `wrong_body_<status>`, and it raises the same high alert a
 * failure does. `charges` is the marker because it is emitted by this route
 * and by nothing else, and it sits inside the first hundred characters of the
 * reply, comfortably inside the window captured below.
 *
 * The capture widens from 300 to 1000 characters for the TEST, while the
 * alert still prints only 300, because an alert a person has to read is not
 * improved by a kilobyte of HTML.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not parse the JSON and act on
 * the numbers inside it. The job's business is whether the platform answered
 * as the platform; what the reconciliation found is the reconciliation's own
 * report and belongs on the money desk, not in a verdict string.
 */

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
  answered_as_the_route boolean;
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
    select r.status_code, left(coalesce(r.content, ''), 1000)
      into previous_status, previous_body
      from net._http_response r
     where r.id = previous_id;

    /* THE OUTCOME, NOT THE ATTEMPT. A 200 carrying the Vallo HTML shell is
       what this asks about, and it is what a renamed route produces. */
    answered_as_the_route :=
      coalesce(previous_body, '') like '%"charges"%'
      and coalesce(previous_body, '') like '%"ok"%';

    if previous_status is null then
      verdict := case
        when previous_at > now() - interval '1 hour' then 'no_reply'
        else 'aged_out'
      end;
    elsif previous_status between 200 and 299 and answered_as_the_route then
      verdict := 'ok_' || previous_status::text;
    elsif previous_status between 200 and 299 then
      verdict := 'wrong_body_' || previous_status::text;
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
          then 'Money reconciliation: the last call reached something that is not the reconciler'
          else 'Money reconciliation: the last call did not succeed'
        end,
        format(
          'The scheduled reconciliation called the platform and the reply was %s (%s). '
          || 'Until this reads ok_2xx, no payment is being reconciled, however green the '
          || 'scheduler looks. A 2xx that is not the reconciler usually means the route '
          || 'was renamed, moved or shadowed, because an unknown path here answers 200 '
          || 'with the site shell rather than 404. Body: %s',
          coalesce(previous_status::text, 'never received'),
          verdict,
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
      /* Who is calling. Not a credential: see the note at the head. */
      'X-Vallo-Scheduler', 'pg_cron'
    ),
    timeout_milliseconds := 30000
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

/* RULE 21. `create or replace` PRESERVES GRANTS, so the revoke is restated
   rather than assumed, and read back in this same migration. */
revoke all on function private.request_money_reconciliation() from public, anon, authenticated;

do $$
declare
  shell text := '<!DOCTYPE html><html lang="en"><head><title>Vallo</title></head><body>'
                || '<div id="__next">Find a home you will like</div></body></html>';
  real_reply text := '{"ok":true,"apply":false,"window":{"from":"2026-09-21T00:00:00Z",'
                || '"to":"2026-09-23T00:00:00Z","hours":48},"charges":{"seen":0}}';
begin
  -- The door is shut.
  if has_function_privilege('anon', 'private.request_money_reconciliation()', 'EXECUTE') then
    raise exception 'request_money_reconciliation is reachable by anon';
  end if;
  if has_function_privilege('authenticated', 'private.request_money_reconciliation()', 'EXECUTE') then
    raise exception 'request_money_reconciliation is reachable by authenticated';
  end if;
  -- And the control: the owner pg_cron runs as must still hold it, or this
  -- migration has shut the job rather than fixed it.
  if not has_function_privilege('postgres', 'private.request_money_reconciliation()', 'EXECUTE') then
    raise exception 'request_money_reconciliation lost the grant the scheduler needs';
  end if;

  -- THE PREDICATE ITSELF, exercised on both bodies, because a condition
  -- nobody ran is a condition nobody has.
  if (shell like '%"charges"%' and shell like '%"ok"%') then
    raise exception 'the body test accepts the site shell, which is the whole fault';
  end if;
  if not (real_reply like '%"charges"%' and real_reply like '%"ok"%') then
    raise exception 'the body test rejects a genuine reconciliation reply';
  end if;
end $$;

comment on function private.request_money_reconciliation() is
  'Calls the reconciler and judges the PREVIOUS reply by its body as well as '
  'its status. A 2xx that does not carry the route''s own envelope is '
  'wrong_body_<status> and raises a high alert, because an unknown path on '
  'this deployment answers 200 with the site shell rather than 404.';
