-- Track G (2): archive a conversation for yourself. APPLIED LIVE 25 September 2026.
--
-- The inbox gains Recent / Archived / Reported. Archiving is PER PERSON: the
-- guest archiving a thread must not hide it from the agent, so it cannot be a
-- column on `conversations`. One row per (person, conversation); present means
-- archived, deleting it unarchives. A new message does NOT unarchive on its
-- own here: the app shows an archived thread with unread messages back in
-- Recent (it compares last_message_at with archived_at), which keeps this
-- table write-only-by-its-owner and free of triggers.
--
-- The app side (`apps/web/src/lib/messages/archive.ts`) is written against
-- this shape and answers in words while the table does not exist.
--
-- Verified against the live schema on 25 September 2026: no archive column or
-- table exists for conversations.

create table if not exists public.conversation_archives (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  archived_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

comment on table public.conversation_archives is
  'A person''s own archive of their conversations. Per person: archiving never hides a thread from the other party.';

create index if not exists conversation_archives_conversation_idx
  on public.conversation_archives (conversation_id);

alter table public.conversation_archives enable row level security;

-- Read and delete your own rows.
create policy conversation_archives_select_own on public.conversation_archives
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy conversation_archives_delete_own on public.conversation_archives
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Insert only for yourself, and only a conversation you are a party to.
create policy conversation_archives_insert_own on public.conversation_archives
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.guest_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
    )
  );

-- archived_at may be refreshed (archive again after new messages).
create policy conversation_archives_update_own on public.conversation_archives
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.conversation_archives from anon;
grant select, insert, update, delete on public.conversation_archives to authenticated;
