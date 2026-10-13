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

## 3. Owner proof of ownership: two constraints (run once, needed for the ownership upload)

The ownership document upload and the "Ownership seen" badge are built and the supporting
functions are live, but two CHECK constraints must be widened first. Until then an owner's
ownership document cannot attach and the "Letter of authority" answer is refused.

```sql
begin;

alter table public.agent_documents
  drop constraint if exists agent_documents_property_kinds_name_a_listing;
alter table public.agent_documents
  add constraint agent_documents_property_kinds_name_a_listing
    check (
      kind not in ('ownership', 'mandate')
      or listing_id is not null
      or (kind = 'ownership' and application_id is not null)
    );

alter table public.agent_applications
  drop constraint if exists agent_applications_ownership_document_known;
alter table public.agent_applications
  add constraint agent_applications_ownership_document_known
    check (
      ownership_document is null
      or ownership_document in (
        'certificate_of_occupancy',
        'deed_of_assignment',
        'governors_consent',
        'survey_plan',
        'utility_bill',
        'letter_of_authority',
        'none'
      )
    );

commit;
```
