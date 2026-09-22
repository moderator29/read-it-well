-- TRANSCRIBED FROM THE LIVE DATABASE ON 22 SEPTEMBER 2026.
--
-- This migration was applied to `uccixoonmbhrnyczyigt` on 9 August 2026 as
-- version 20260809180952 and NO FILE FOR IT HAS EVER EXISTED IN THIS
-- REPOSITORY. It is reproduced here verbatim from
-- `supabase_migrations.schema_migrations.statements`, which is the runner's own
-- record of the exact SQL it executed, so that the live schema can be rebuilt
-- from this repository. Nothing below was written by hand and nothing was
-- modernised: the two Vault secret names it reads are the names that existed
-- when it ran, and they are renamed later by
-- `20260922130000_the_engine_stops_saying_rentme.sql`, which is why a rebuild
-- in filename order arrives at the same place the live database is in.
--
-- Four migrations were in this position. The other three are
-- 20260809153626, 20260809160547 and 20260919181950, transcribed the same way
-- on the same day.

/*
 * THE SCHEDULED RECONCILIATION HAS NEVER MADE AN HTTP REQUEST, and there were
 * TWO faults stacked on top of each other. The second one was invisible until
 * the first was fixed.
 *
 * FAULT ONE, CONFIGURATION. `request_money_reconciliation` reads its site URL
 * and its bearer token from Vault, and Vault was empty. The function has an
 * explicit branch for that which returns `{"status":"unconfigured"}` - a
 * perfectly successful SQL call. pg_cron recorded "succeeded, 1 row" every hour
 * since the job was created, and `net._http_response` stayed empty the whole
 * time. A job that reports success for doing nothing is worse than one that
 * fails, because nobody goes looking.
 *
 * FAULT TWO, THIS ONE. `extensions.net.http_get(...)` is a THREE PART name, and
 * Postgres reads three parts as database.schema.function. There is no database
 * called `extensions`, so this raises
 *
 *     0A000: cross-database references are not implemented
 *
 * every time it is reached. pg_net installs its functions into the schema `net`
 * - checked, not assumed: `net.http_get(url, params, headers,
 * timeout_milliseconds)` - so the correct name has two parts.
 *
 * The reason this survived review is exactly the reason fault one survived: the
 * unconfigured branch returns BEFORE the call, so with an empty Vault this line
 * was unreachable and no run ever executed it. Fixing the configuration is what
 * finally surfaced it.
 *
 * `search_path` is pinned to '' on this function, which is correct and is why
 * every name here has to be qualified. That is the discipline that turned a
 * typo into a hard error rather than a silent resolution to something else.
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

  /* `net.http_get`, two parts. See the note above for what the third part did. */
  select net.http_get(
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

revoke execute on function private.request_money_reconciliation() from public, anon, authenticated;
