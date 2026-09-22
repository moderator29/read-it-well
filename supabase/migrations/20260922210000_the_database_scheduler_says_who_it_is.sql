-- OUR OWN DATABASE WAS BEING LOGGED AS A STRANGER.
--
-- There are two schedulers on this platform: Vercel Cron, which identifies
-- itself in the user agent, and pg_cron inside the database, which calls out
-- through pg_net and identified itself as nothing at all.
--
-- The cost was measured at 16:47 on 22 September. This job was refused, and
-- because the caller could not be recognised the desk recorded
-- "Cron: paystack reconcile, unauthorised" at MEDIUM severity, the colour
-- reserved for somebody trying a door. What had actually happened is that OUR
-- OWN DATABASE could not get in. Same event, same cost, quieter colour, for
-- want of a name. That is the identical fault that let 256 rows of
-- "unauthorised" hide four days of the whole fleet being dead.
--
-- So it says who it is: `X-Vallo-Scheduler: pg_cron`, read by
-- `fromPlatformScheduler` in `lib/cron/auth.ts`.
--
-- THE HEADER GRANTS NOTHING AND IS NOT A CREDENTIAL. It never opens the door;
-- the bearer does that, and the request is refused exactly as before. It only
-- chooses how loudly the refusal is said. A forged one buys a critical row on
-- our own desk instead of a warning row, which is a false alarm rather than a
-- way in. Our own header is used rather than pg_net's user agent because that
-- string is one we neither choose nor control and it changes with the
-- extension version.
--
-- Everything else in this function is unchanged from
-- 20260922200000_the_money_job_reads_its_own_reply.

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
    select r.status_code, left(coalesce(r.content, ''), 300)
      into previous_status, previous_body
      from net._http_response r
     where r.id = previous_id;

    if previous_status is null then
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

-- BORN LOCKED, NEVER BORN PUBLIC, restated because `create or replace`
-- preserves grants.
revoke execute on function private.request_money_reconciliation() from public;
revoke execute on function private.request_money_reconciliation() from anon;
revoke execute on function private.request_money_reconciliation() from authenticated;

do $$
declare
  anon_fn boolean;
  auth_fn boolean;
begin
  select has_function_privilege('anon', 'private.request_money_reconciliation()', 'EXECUTE'),
         has_function_privilege('authenticated', 'private.request_money_reconciliation()', 'EXECUTE')
    into anon_fn, auth_fn;
  if anon_fn or auth_fn then
    raise exception 'REFUSING: anon=% authenticated=% still hold EXECUTE', anon_fn, auth_fn;
  end if;
end $$;
