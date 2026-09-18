-- B5. A block holds in messaging, in the database as well as in the action.
--
-- public.blocks promised "bidirectional invisibility" and messaging never read
-- it: messages_insert checks the sender and the membership and nothing else,
-- so a blocked person could keep writing to the person who blocked them. The
-- action layer (apps/web/src/lib/messages/blocks.ts) now refuses in words;
-- this file makes the refusal a fact of the table.
--
-- ADDITIVE, AND messages_insert IS NOT TOUCHED. The two new policies are
-- RESTRICTIVE: Postgres ANDs a restrictive policy with the permissive ones,
-- so the existing rule (auth.uid() = sender_id and in_conversation) stands
-- word for word and gains a further condition. Nothing here can relax
-- messages.sender_id, and a rollback is "drop policy", not a data change.
--
-- The helpers are SECURITY DEFINER because blocks_select_own shows a caller
-- only the rows they wrote, and the half that matters for safety is the half
-- they cannot see. Each helper answers one boolean about the caller's own
-- thread or counterpart and reveals nothing else.
--
-- Idempotent: create or replace, drop policy if exists before create.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead, inside a transaction that is rolled back. Not run from
-- the sandbox, which has no database credentials.
--
--   begin;
--   select proname, prosecdef
--     from pg_proc
--    where pronamespace = 'private'::regnamespace
--      and proname in ('blocked_between', 'blocked_in_conversation');
--   -- expect two rows, prosecdef true
--   select polname, polpermissive, pg_get_expr(polwithcheck, polrelid) as with_check
--     from pg_policy
--    where polrelid in ('public.messages'::regclass, 'public.conversations'::regclass)
--      and polcmd = 'a'
--    order by polrelid::text, polname;
--   -- expect messages_insert (permissive, unchanged expression),
--   --        messages_insert_not_across_block (polpermissive = false),
--   --        conversations_insert (permissive, unchanged),
--   --        conversations_insert_not_across_block (polpermissive = false)
--   select private.blocked_between(
--     '00000000-0000-0000-0000-000000000001'::uuid,
--     '00000000-0000-0000-0000-000000000002'::uuid);
--   -- expect false (no such rows)
--   rollback;
-- ---------------------------------------------------------------------------

create or replace function private.blocked_between(person_a uuid, person_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.blocks b
     where (b.user_id = person_a and b.other_id = person_b)
        or (b.user_id = person_b and b.other_id = person_a)
  );
$$;

comment on function private.blocked_between(uuid, uuid) is
  'True when either person has blocked the other. Security definer so a caller can be refused by a block they cannot see.';

revoke execute on function private.blocked_between(uuid, uuid) from public;
grant execute on function private.blocked_between(uuid, uuid) to authenticated, anon;

create or replace function private.blocked_in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.conversations c
     where c.id = target_conversation_id
       and private.blocked_between(c.guest_id, c.agent_id)
  );
$$;

comment on function private.blocked_in_conversation(uuid) is
  'True when the two parties of this conversation have a block between them, in either direction.';

revoke execute on function private.blocked_in_conversation(uuid) from public;
grant execute on function private.blocked_in_conversation(uuid) to authenticated, anon;

-- The wall. Restrictive, so it can only ever narrow messages_insert.
drop policy if exists messages_insert_not_across_block on public.messages;
create policy messages_insert_not_across_block
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (not private.blocked_in_conversation(messages.conversation_id));

-- Opening a thread across a block is refused at the same level, so a
-- reservation or booking thread cannot be minted around the wall either.
drop policy if exists conversations_insert_not_across_block on public.conversations;
create policy conversations_insert_not_across_block
  on public.conversations
  as restrictive
  for insert
  to authenticated
  with check (not private.blocked_between(conversations.guest_id, conversations.agent_id));
