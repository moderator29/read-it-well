/*
 * The money sweep gets a scheduler, and it costs nothing.
 *
 * WHY THIS IS HERE RATHER THAN ON THE HOST. The reconcile endpoint recovers
 * payments Paystack took that never reached the ledger, which is the exact
 * failure that lost the owner's own funding. It needs to run on a schedule.
 * The obvious place is the web host's cron, and the owner is right to refuse
 * to pay for one: there is no revenue yet.
 *
 * There is already a scheduler here. This database runs seven pg_cron jobs on
 * the current plan, releasing stale booking holds every fifteen minutes and
 * sweeping escrow timeouts hourly. Reconciliation was the only money job not
 * on it, for one reason: the others act inside Postgres, and this one has to
 * reach Paystack over the internet. `pg_net` is the piece that was missing.
 *
 * IT IS INERT UNTIL CONFIGURED, AND THAT IS DELIBERATE. Two secrets have to
 * exist in Supabase Vault before this does anything:
 *
 *   rentme_site_url          the production origin, e.g. https://rentme.ng
 *   rentme_reconcile_secret  the same value as RECONCILE_CRON_SECRET on the host
 *
 * With either missing the job returns 'unconfigured' and makes no request. It
 * does not throw and it does not retry, because a scheduled job that errors
 * every hour into a log nobody reads is worse than one that is quietly off.
 * The owner can see which state it is in by selecting the function directly.
 *
 * THE SECRET IS NEVER WRITTEN INTO THIS FILE OR INTO THE JOB DEFINITION. It is
 * read from Vault at call time. `cron.job` is readable, so a secret pasted into
 * a schedule is a secret published to anybody who can read that table.
 *
 * WHY apply IS ON. A dry run tells nobody anything at 3am. The sweep only
 * posts entries for charges Paystack has already confirmed and that are
 * missing from our ledger, it is idempotent on the payment reference, and
 * every entry it writes is logged. Recovering a real payment automatically is
 * the entire point. A human should still run it dry the first time, by hand,
 * to read the report before trusting it.
 *
 * The window is 48 hours against an hourly schedule, so a payment has roughly
 * forty-eight chances to be recovered before it falls out of range, and a few
 * hours of host downtime cannot lose one.
 *
 * Verified after applying: the function returns
 * {"status":"unconfigured","secret_present":false,"site_url_present":false}
 * and issues no request, and the job is present and active.
 */

create extension if not exists pg_net with schema extensions;

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
begin
  select decrypted_secret into site_url
    from vault.decrypted_secrets where name = 'rentme_site_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'rentme_reconcile_secret';

  if site_url is null or btrim(site_url) = '' or secret is null or btrim(secret) = '' then
    /*
     * Named separately so the answer is actionable. "It is not working" sends
     * somebody reading logs; "the site url is missing" sends them to Vault.
     */
    return jsonb_build_object(
      'status', 'unconfigured',
      'site_url_present', site_url is not null and btrim(coalesce(site_url, '')) <> '',
      'secret_present', secret is not null and btrim(coalesce(secret, '')) <> ''
    );
  end if;

  select extensions.net.http_get(
    url := rtrim(btrim(site_url), '/') || '/api/paystack/reconcile?hours=48&apply=1',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || btrim(secret),
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  ) into request_id;

  /*
   * The response is not waited for. pg_net is asynchronous by design: the
   * reply lands in net._http_response, which is where a failure is read from
   * afterwards. Blocking a cron worker on somebody else's HTTP call is how a
   * scheduler seizes up.
   */
  return jsonb_build_object('status', 'requested', 'request_id', request_id);
end;
$function$;

revoke all on function private.request_money_reconciliation() from public, anon, authenticated;

comment on function private.request_money_reconciliation() is
  'Asks the web app to sweep Paystack for payments missing from the ledger. Inert until rentme_site_url and rentme_reconcile_secret exist in Vault.';

/*
 * Hourly at forty-seven minutes past, following the escrow sweep's habit of
 * avoiding the top of the hour where every other system on the internet piles
 * up. Unscheduled first so re-running this migration cannot leave two.
 */
do $$
begin
  perform cron.unschedule('rentme_reconcile_payments');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'rentme_reconcile_payments',
  '47 * * * *',
  $job$ select private.request_money_reconciliation(); $job$
);
