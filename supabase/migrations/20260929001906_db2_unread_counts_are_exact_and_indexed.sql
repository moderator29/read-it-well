-- DB2 / UNREAD COUNTS: exact, from an index, in one call.
--
-- The inbox counted unread messages from a sweep of the 400 newest messages
-- across all of a person's threads (lib/messages/live.ts), so a busy inbox
-- undercounted: anything unread below the 400th message did not exist. The
-- agent badge counted `messages where read_at is null and sender <> me` under
-- RLS with no conversation filter, which for an admin (who may read every
-- conversation) counted the whole platform.
--
-- The read marker already exists and is per participant: a conversation has
-- exactly two parties (guest_id, agent_id), and messages.read_at is set by
-- markThreadRead / markAllRead on the messages addressed to the reader. So no
-- new cursor table is needed; what was missing was an indexed count.
--
-- public.my_unread_counts() returns one row per conversation of the CALLER's
-- (as guest or as agent, never as admin) with its unread count: messages
-- addressed to the caller (sender is the other party) with read_at null. The
-- total is the sum of the rows. SECURITY DEFINER with an empty search_path,
-- keyed on auth.uid(): it can only ever count the caller's own threads.
-- EXECUTE for authenticated only.
--
-- messages_unread_idx is partial on read_at is null, so it holds only the
-- unread rows and stays small however large the history grows.

create index if not exists messages_unread_idx
  on public.messages (conversation_id, sender_id)
  where read_at is null;

create or replace function public.my_unread_counts()
returns table (conversation_id uuid, unread integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.conversation_id, count(*)::integer as unread
    from public.conversations c
    join public.messages m on m.conversation_id = c.id
   where (c.guest_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
     and m.read_at is null
     and m.sender_id <> (select auth.uid())
   group by m.conversation_id
$$;

comment on function public.my_unread_counts() is
  'DB2: the caller''s unread messages per conversation (as guest or agent), exact, from messages_unread_idx. Sum the rows for the total.';

revoke all on function public.my_unread_counts() from public, anon;
grant execute on function public.my_unread_counts() to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.my_unread_counts()', 'EXECUTE') then
    raise exception 'DB2 unread: anon can call my_unread_counts';
  end if;
  if not has_function_privilege('authenticated', 'public.my_unread_counts()', 'EXECUTE') then
    raise exception 'DB2 unread: authenticated cannot call my_unread_counts';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'messages_unread_idx') then
    raise exception 'DB2 unread: the partial index is missing';
  end if;
end
$check$;
