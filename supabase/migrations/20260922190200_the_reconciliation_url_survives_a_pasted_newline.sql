-- A TRAILING NEWLINE IN A VAULT VALUE TOOK THE MONEY JOB DOWN, AND THE GUARD
-- THAT LOOKED LIKE IT HANDLED WHITESPACE ONLY HANDLED SPACES.
--
-- The 15:47 run on 22 September failed with:
--   invalid URL "https://www.vallospaces.com\n/api/paystack/reconcile?hours=48&apply=1"
--
-- `vallo_site_url` had just been re-saved with a trailing newline, which is
-- what happens when a URL is pasted. The function already trimmed it, or
-- appeared to: `btrim(site_url)`. **`btrim(text)` WITH ONE ARGUMENT STRIPS
-- SPACES AND NOTHING ELSE.** Not a newline, not a tab, not a carriage return.
-- Measured rather than assumed:
--   btrim(E'https://x.com\n')              -> unchanged, length 14
--   btrim(E'https://x.com\n', E' \t\r\n')  -> trimmed,   length 13
--
-- So every guard here was whitespace-blind: the emptiness checks, the URL
-- build and the bearer alike. A SECRET pasted with a newline would have sent
-- `Bearer <secret>\n` and been refused 401 by our own door, which is the same
-- symptom from a different cause and just as hard to read.
--
-- Name the characters being trimmed rather than trusting a default that means
-- less than it looks like it means. A person pasting a URL into a form is not
-- making a mistake; infrastructure that breaks on it is the one at fault.

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
  /* The whitespace set is explicit and is the point of this revision.
     Never `btrim(x)` on a value a human pasted. */
  select btrim(decrypted_secret, E' \t\r\n') into site_url
    from vault.decrypted_secrets where name = 'vallo_site_url';
  select btrim(decrypted_secret, E' \t\r\n') into secret
    from vault.decrypted_secrets where name = 'vallo_reconcile_secret';

  if site_url is null or site_url = '' or secret is null or secret = '' then
    /*
     * Named separately so the answer is actionable. "It is not working" sends
     * somebody reading logs; "the site url is missing" sends them to Vault.
     */
    return jsonb_build_object(
      'status', 'unconfigured',
      'site_url_present', coalesce(site_url, '') <> '',
      'secret_present', coalesce(secret, '') <> ''
    );
  end if;

  select net.http_get(
    url := rtrim(site_url, '/') || '/api/paystack/reconcile?hours=48&apply=1',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  ) into request_id;

  /*
   * The response is not waited for. pg_net is asynchronous by design: the
   * reply lands in net._http_response, which is where a failure is read from
   * afterwards. Blocking a cron worker on somebody else's HTTP call is how a
   * scheduler seizes up.
   *
   * THAT THE REPLY IS NEVER READ IS A SEPARATE, KNOWN DEFECT, and it is the
   * reason this job reported success every hour for three weeks while every
   * call answered 404. It is recorded in the ledger as still open. This
   * revision fixes the URL, not the blindness.
   */
  return jsonb_build_object('status', 'requested', 'request_id', request_id);
end;
$function$;

-- BORN LOCKED, NEVER BORN PUBLIC. `create or replace` preserves existing
-- grants, so this is restated rather than assumed: nothing but the scheduler
-- and the service role may ask the platform to move money.
revoke execute on function private.request_money_reconciliation() from public;
revoke execute on function private.request_money_reconciliation() from anon;
revoke execute on function private.request_money_reconciliation() from authenticated;

do $$
declare
  anon_can boolean;
  auth_can boolean;
begin
  select has_function_privilege('anon', 'private.request_money_reconciliation()', 'EXECUTE'),
         has_function_privilege('authenticated', 'private.request_money_reconciliation()', 'EXECUTE')
    into anon_can, auth_can;

  if anon_can or auth_can then
    raise exception 'REFUSING: anon=% authenticated=% still hold EXECUTE', anon_can, auth_can;
  end if;
end $$;
