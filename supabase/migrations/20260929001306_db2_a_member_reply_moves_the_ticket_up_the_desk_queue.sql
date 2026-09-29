-- DB2 / SUPPORT QUEUE: a member's reply bumps the ticket in the admin queue.
--
-- A member writes support_ticket_messages (policy support_ticket_messages_
-- insert_own) but holds no UPDATE on support_tickets, and should not be given
-- one: the row carries status, rating and resolution that only the desk sets.
-- So a reply left the ticket's updated_at where it was, and the desk's queue
-- (lib/admin/queries.ts getSupportTickets) never moved it up.
--
-- An AFTER INSERT trigger on support_ticket_messages, SECURITY DEFINER with an
-- empty search_path, stamps the ticket when the message is the ticket
-- OWNER's (sender_role 'user' and sender_id = support_tickets.user_id):
-- updated_at (the queue orders on it now) and a new last_member_reply_at, so
-- the desk can also tell "the member answered" from "somebody edited the row".
-- A staff reply does not stamp last_member_reply_at. The trigger function is
-- not callable by any API role.

alter table public.support_tickets
  add column if not exists last_member_reply_at timestamptz;

comment on column public.support_tickets.last_member_reply_at is
  'DB2: when the ticket owner last wrote a message on it. Set only by private.support_ticket_member_replied.';

create or replace function private.support_ticket_member_replied()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender_role = 'user' then
    update public.support_tickets t
       set updated_at = now(),
           last_member_reply_at = now()
     where t.id = new.ticket_id
       and t.user_id = new.sender_id;
  end if;
  return null;
end;
$$;

revoke all on function private.support_ticket_member_replied() from public, anon, authenticated, service_role;

drop trigger if exists support_ticket_messages_member_replied on public.support_ticket_messages;
create trigger support_ticket_messages_member_replied
  after insert on public.support_ticket_messages
  for each row execute function private.support_ticket_member_replied();

create index if not exists support_tickets_updated_at_idx
  on public.support_tickets (updated_at desc, created_at desc);

-- Read back.
do $check$
begin
  if not exists (select 1 from pg_trigger where tgname = 'support_ticket_messages_member_replied'
                  and tgrelid = 'public.support_ticket_messages'::regclass and tgenabled = 'O') then
    raise exception 'DB2 support: the reply trigger is not in place';
  end if;
  if has_function_privilege('authenticated', 'private.support_ticket_member_replied()', 'EXECUTE')
     or has_function_privilege('anon', 'private.support_ticket_member_replied()', 'EXECUTE') then
    raise exception 'DB2 support: a client role can call the trigger function';
  end if;
  if has_table_privilege('authenticated', 'public.support_tickets', 'UPDATE') and exists (
       select 1 from pg_policies where schemaname = 'public' and tablename = 'support_tickets'
          and cmd in ('UPDATE', 'ALL') and policyname <> 'support_tickets_admin_all') then
    raise notice 'DB2 support: note, support_tickets has a member UPDATE policy; this migration did not add it';
  end if;
end
$check$;
