-- Staff notes on the person file (/admin/people/<id>).
--
-- An operator who rings a lister, checks a story with a guest or hands a case
-- to the next shift had nowhere to write it down on the person: the audit log
-- records decisions, not context. public.member_notes is that place.
--
--  * Append-only. There is an insert policy and a select policy and nothing
--    else, so no client can edit or delete a note; a correction is a new note.
--  * Admin and super admin only, under RLS, through the operator's own client.
--    Scoped staff (public.staff_grants) are not given it: the person file
--    itself (public.admin_person_file) is admin-only.
--  * The author is the caller and the time is the server's: the insert policy
--    pins author_id to auth.uid(), and a before-insert trigger overwrites
--    created_at with now(), so a note cannot be backdated or signed as
--    somebody else.
--  * Every note writes an audit_log row (member_note.add, entity 'user', the
--    subject's id) carrying the note id and its length, never its words, so
--    the person file's timeline shows that a note was written.
--  * A deleted account takes its notes with it (on delete cascade on the
--    subject), which is what the thirty-day account purge promises. A deleted
--    author leaves the note with no author rather than blocking the purge.

create table public.member_notes (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references auth.users (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  body        text not null check (char_length(btrim(body)) between 3 and 2000),
  created_at  timestamptz not null default now()
);

comment on table public.member_notes is
  'Append-only staff notes on a person file. Admin and super admin read and write under RLS; each insert is audited as member_note.add.';

create index member_notes_subject_created_idx on public.member_notes (subject_id, created_at desc);
create index member_notes_author_idx on public.member_notes (author_id);

alter table public.member_notes enable row level security;

revoke all on public.member_notes from public, anon, authenticated;
grant select, insert on public.member_notes to authenticated;

create policy member_notes_select_admin on public.member_notes
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

create policy member_notes_insert_admin on public.member_notes
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
    )
  );

create or replace function private.member_notes_stamp()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  new.created_at := now();
  return new;
end;
$function$;

create or replace function private.member_notes_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (new.author_id, 'member_note.add', 'user', new.subject_id::text,
          jsonb_build_object('note_id', new.id, 'characters', char_length(new.body)));
  return new;
end;
$function$;

revoke all on function private.member_notes_stamp() from public, anon, authenticated;
revoke all on function private.member_notes_audit() from public, anon, authenticated;

create trigger member_notes_00_stamp
  before insert on public.member_notes
  for each row execute function private.member_notes_stamp();

create trigger member_notes_10_audit
  after insert on public.member_notes
  for each row execute function private.member_notes_audit();

-- Read back what was just made, and refuse to commit if any of it is missing.
do $$
declare
  n integer;
begin
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.member_notes'::regclass) then
    raise exception 'member_notes: row level security is not on';
  end if;

  select count(*) into n from pg_policy p where p.polrelid = 'public.member_notes'::regclass;
  if n <> 2 then
    raise exception 'member_notes: expected exactly 2 policies, found %', n;
  end if;

  if not exists (select 1 from pg_policy p where p.polrelid = 'public.member_notes'::regclass
                  and p.polname = 'member_notes_select_admin' and p.polcmd = 'r')
     or not exists (select 1 from pg_policy p where p.polrelid = 'public.member_notes'::regclass
                  and p.polname = 'member_notes_insert_admin' and p.polcmd = 'a') then
    raise exception 'member_notes: the select and insert policies are not the ones written';
  end if;

  if has_table_privilege('anon', 'public.member_notes', 'select')
     or has_table_privilege('anon', 'public.member_notes', 'insert') then
    raise exception 'member_notes: anon holds a privilege it must not';
  end if;

  if has_table_privilege('authenticated', 'public.member_notes', 'update')
     or has_table_privilege('authenticated', 'public.member_notes', 'delete') then
    raise exception 'member_notes: authenticated can update or delete, which makes notes editable';
  end if;

  if not has_table_privilege('authenticated', 'public.member_notes', 'insert') then
    raise exception 'member_notes: authenticated cannot insert, so no operator can write a note';
  end if;

  select count(*) into n from pg_trigger t
   where t.tgrelid = 'public.member_notes'::regclass
     and t.tgname in ('member_notes_00_stamp', 'member_notes_10_audit')
     and not t.tgisinternal;
  if n <> 2 then
    raise exception 'member_notes: expected the stamp and audit triggers, found %', n;
  end if;
end;
$$;
