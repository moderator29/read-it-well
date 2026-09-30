-- C8: THE DUPLICATE-PHOTO HASHES FILL THEMSELVES, NIGHTLY (30 September 2026).
--
-- Applied 30 September 2026 with the founder's approval. Adds one private function and schedules it.
-- Changes no table, policy or existing function; safe to run twice.
--
-- WHY. `listing_photo_hashes` held 0 rows against 228 `listing_photos` on
-- 30 September: hashing older photographs was a button on the review desk
-- that nobody pressed, so "Photo seen on another listing" could never fire.
--
-- WHAT. `private.request_photo_hash_backfill()` asks the app to run
-- `/api/cron/photo-hash-backfill` (apps/web/src/app/api/cron/photo-hash-backfill),
-- with the same Vault values and bearer the push drain uses
-- (`vallo_site_url`, `vallo_reconcile_secret`). The route hashes up to four
-- batches of 60 per run and reports through lib/cron/run.ts like every job.
-- Nightly at 03:05 Lagos (02:05 UTC), a quiet hour; about four nights clear
-- today's backlog, after which a run is a clean no-op. New uploads are already
-- hashed on submit.
--
-- The route is deployed with the app code; until this migration is applied
-- nothing calls it and the desk's button still works by hand.
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create or replace function private.request_photo_hash_backfill()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  site_url   text;
  secret     text;
  request_id bigint;
begin
  select btrim(decrypted_secret, E' \t\r\n') into site_url
    from vault.decrypted_secrets where name = 'vallo_site_url';
  select btrim(decrypted_secret, E' \t\r\n') into secret
    from vault.decrypted_secrets where name = 'vallo_reconcile_secret';

  if site_url is null or site_url = '' or secret is null or secret = '' then
    return jsonb_build_object('status', 'unconfigured');
  end if;

  select net.http_get(
    url := rtrim(site_url, '/') || '/api/cron/photo-hash-backfill',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json',
      'X-Vallo-Scheduler', 'pg_cron'
    ),
    timeout_milliseconds := 300000
  ) into request_id;

  return jsonb_build_object('status', 'requested', 'request_id', request_id);
end;
$function$;

revoke all on function private.request_photo_hash_backfill() from public, anon, authenticated;

select cron.schedule('vallo_photo_hash_backfill', '5 2 * * *', $cron$select private.request_photo_hash_backfill()$cron$);

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if to_regprocedure('private.request_photo_hash_backfill()') is null then
    raise exception 'request_photo_hash_backfill missing';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_photo_hash_backfill') then
    raise exception 'vallo_photo_hash_backfill not scheduled';
  end if;
end;
$check$;
