# Database notes: statements the migration connector cannot run

The Supabase connector used by agents waits for a confirmation on any statement that contains
`DELETE` or `DROP`, and the confirmation never arrives, so those statements time out after 60
seconds. Run them in the Supabase dashboard SQL editor instead. Everything else is applied through
the connector and recorded in `supabase/migrations/APPLIED.txt`.

## 1. Reminder purge (run once)

`private.send_member_reminders()` used to delete reminder rows older than 400 days. The new version
only sends reminders, so the purge moves into its own function and its own daily job.

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

Nothing breaks if this is delayed: the ledgers are small.

## 2. Leftover probe functions (run once)

Seven `private.tmp_probe*` test functions were left from an earlier session. They are neutralised
and revoked. Drop them:

```sql
select 'drop function ' || p.oid::regprocedure || ';' as stmt
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'private' and p.proname like 'tmp_probe%';
```

Run the statements it prints.
