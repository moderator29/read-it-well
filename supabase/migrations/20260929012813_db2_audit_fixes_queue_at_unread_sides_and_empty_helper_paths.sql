-- DB2 AUDIT FIXES: a queue position only a member reply moves, unread counts
-- that say which side of the thread they are on, and two helpers with an
-- empty search_path.
--
-- 1. support_tickets.queue_at. The desk queue ordered on updated_at, which
--    every UPDATE stamps (set_updated_at), so a status change or a note by the
--    desk re-sorted the queue as if the member had written. queue_at is a
--    STORED generated column, coalesce(last_member_reply_at, created_at): it
--    moves when the ticket is filed and when its owner replies
--    (private.support_ticket_member_replied, 20260929001306), and on nothing
--    else. Indexed for the queue's order.
--    SUPPORT's private.support_ticket_read_keeps_updated_at compares
--    to_jsonb(new) with to_jsonb(old) minus the read columns. A generated
--    column is not computed yet in a BEFORE trigger (NEW carries null there),
--    so the new column would make every read look like an edit; the function
--    is recreated here with queue_at excluded as well, otherwise unchanged.
-- 2. public.my_unread_counts() gains as_agent: whether the caller is the
--    agent (lister) side of that conversation, so the agent dashboard sums
--    its side without first listing its conversation ids. The return type
--    changes, so the function is dropped and recreated with the same grants.
-- 3. public.is_platform_staff(uuid) and public.is_checked_person(uuid) ran
--    with search_path 'public'. Recreated with every name qualified, then
--    pinned to an empty search_path. Grants are untouched (create or replace
--    keeps them): service_role only since 20260929000714.

alter table public.support_tickets
  add column if not exists queue_at timestamptz
  generated always as (coalesce(last_member_reply_at, created_at)) stored;

comment on column public.support_tickets.queue_at is
  'DB2: the desk queue position. Filing, then each reply by the ticket owner; nothing else moves it.';

create index if not exists support_tickets_queue_at_idx
  on public.support_tickets (queue_at desc, created_at desc);

create or replace function private.support_ticket_read_keeps_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.member_read_at is distinct from old.member_read_at
     and (to_jsonb(new) - 'member_read_at' - 'updated_at' - 'queue_at')
       = (to_jsonb(old) - 'member_read_at' - 'updated_at' - 'queue_at') then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$function$;

drop function if exists public.my_unread_counts();
create function public.my_unread_counts()
returns table (conversation_id uuid, unread integer, as_agent boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.conversation_id,
         count(*)::integer as unread,
         bool_or(c.agent_id = (select auth.uid())) as as_agent
    from public.conversations c
    join public.messages m on m.conversation_id = c.id
   where (c.guest_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
     and m.read_at is null
     and m.sender_id <> (select auth.uid())
   group by m.conversation_id
$$;

comment on function public.my_unread_counts() is
  'DB2: the caller''s unread messages per conversation (as guest or agent), exact, from messages_unread_idx; as_agent says the caller is the agent side. Sum the rows for the total.';

revoke all on function public.my_unread_counts() from public, anon;
grant execute on function public.my_unread_counts() to authenticated, service_role;

create or replace function public.is_platform_staff(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    private.has_role(check_user_id, 'admin'::public.app_role)
    or private.has_role(check_user_id, 'super_admin'::public.app_role),
    false);
$function$;

create or replace function public.is_checked_person(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
      from public.agents a
      join public.agent_badges ab on ab.agent_id = a.id
     where a.user_id = check_user_id
       and ab.verified
  ) or exists (
    select 1
      from public.businesses b
     where b.owner_id = check_user_id
       and b.verified
  );
$function$;

do $check$
declare
  n_bad int;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
                  and table_name = 'support_tickets' and column_name = 'queue_at' and is_generated = 'ALWAYS') then
    raise exception 'DB2 fixes: queue_at is not a generated column';
  end if;
  select count(*) into n_bad from public.support_tickets where queue_at is distinct from coalesce(last_member_reply_at, created_at);
  if n_bad <> 0 then raise exception 'DB2 fixes: % ticket(s) with a wrong queue_at', n_bad; end if;
  if has_function_privilege('anon', 'public.my_unread_counts()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.my_unread_counts()', 'EXECUTE') then
    raise exception 'DB2 fixes: my_unread_counts grants are wrong';
  end if;
  if has_function_privilege('anon', 'public.is_platform_staff(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.is_checked_person(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_platform_staff(uuid)', 'EXECUTE') then
    raise exception 'DB2 fixes: the helper grants moved';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname in ('is_platform_staff', 'is_checked_person')
                and not (p.proconfig @> array['search_path=""'])) then
    raise exception 'DB2 fixes: a helper search_path is not empty';
  end if;
  -- The badge view still answers through the helpers with the new path.
  perform count(*) from public.person_badge;
end
$check$;
