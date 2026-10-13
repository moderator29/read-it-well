# Database notes: statements the migration connector cannot run

The Supabase connector used by agents waits for a confirmation on any statement that contains
`DELETE` or `DROP`, and the confirmation never arrives, so those statements time out after 60
seconds. Run them in the Supabase dashboard SQL editor instead. Everything else is applied through
the connector and recorded in `supabase/migrations/APPLIED.txt`.

## What is left, and it is optional

Two housekeeping statements cannot be run through the connector (it freezes on `DELETE` and on
`DROP FUNCTION`). Neither blocks anything. Run them in the dashboard SQL editor when convenient.

Tried again through the connector on 13 October 2026, word for word: item 1 through `execute_sql`
and then `apply_migration`, item 2 as one `apply_migration` named `drop_tmp_probes`. All three
calls timed out after 60 seconds and nothing landed (no `private.purge_old_reminders`, no
`vallo_purge_old_reminders` job, `cron.job` still 40 rows, the seven `tmp_probe*` functions still
there, nothing recorded in `schema_migrations`). Both still wait for the SQL editor. After item 1
runs, `select count(*) from cron.job` should read 41. If item 2 is run as a migration, record it
like any other (`node scripts/check-migrations.mjs --record ...`).

1. Purge of old reminder rows (the ledgers are tiny, so this can wait a year):

```sql
create or replace function private.purge_old_reminders()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.member_reminders where sent_at < now() - interval '400 days';
  delete from public.viewing_reminders where sent_at < now() - interval '400 days';
$$;

revoke all on function private.purge_old_reminders() from public, anon, authenticated;

select cron.schedule('vallo_purge_old_reminders', '23 3 * * *', 'select private.purge_old_reminders();');
```

2. Seven leftover `private.tmp_probe*` test functions. They are neutralised and revoked, so they
   are harmless:

```sql
drop function if exists private.tmp_probe_rowtype();
drop function if exists private.tmp_probe2();
drop function if exists private.tmp_probe3(uuid);
drop function if exists private.tmp_probe4(uuid);
drop function if exists private.tmp_probe5(uuid);
drop function if exists private.tmp_probe6(uuid, uuid);
drop function if exists private.tmp_probe7(timestamp with time zone);
```

3. The old renter passport (V-100), retired in the app on 13 October 2026. Paste this only
   AFTER the release has applied `pass01_passport_settings.sql`, because pass01 reads
   `renter_passports` once to carry members' choices over to the new Vallo passport.
   pass01 was applied on 13 October 2026 (20261013171854; the one `renter_passports` row was
   carried over), but this STILL WAITS for the deploy: production runs the old site from `main`,
   which still calls these functions. Run it only once the new app is serving traffic:

```sql
drop function if exists public.share_renter_passport(uuid, boolean);
drop function if exists public.passport_shared_here(uuid);
drop function if exists public.renter_passport_for_thread(uuid);
drop function if exists public.set_renter_passport(boolean);
drop function if exists public.my_renter_passport();
drop function if exists private.passport_facts(uuid);
drop table if exists public.passport_shares;
drop table if exists public.renter_passports;
```

   Then regenerate `database.types.ts`. `public.record_vnin_check` stays: it is still called.
