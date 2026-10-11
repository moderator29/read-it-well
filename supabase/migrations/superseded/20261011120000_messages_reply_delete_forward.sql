-- Messages: a reply, delete for me, delete for everyone, and forward.
--
-- The rules this file holds, in one place:
--   * Reply quotes a message in the SAME conversation. A trigger refuses any
--     other, so a reply cannot point across a conversation.
--   * Delete for me hides a message for the person who asked, on their side
--     only. The other person still has it.
--   * Delete for everyone is the sender's, and only inside the window below.
--     It blanks the words and removes the photos for both sides. The window
--     is the industry standard for this (two days and twelve hours, the same
--     as WhatsApp), kept in ONE function so it can be changed in one place.
--   * Forward copies the words of a message into another conversation, and
--     only when the sender follows the person in that conversation and no
--     block stands between them. Photos are not forwarded yet.
--
-- messages has no update or delete grant for the browser (db06), so every
-- change here runs as a security definer function that checks the caller
-- first. Nothing here widens who can read a message.

alter table public.messages
  add column if not exists reply_to_id            uuid references public.messages (id) on delete set null,
  add column if not exists forwarded              boolean not null default false,
  add column if not exists deleted_for_everyone_at timestamptz;

create index if not exists messages_reply_to_idx on public.messages (reply_to_id);

comment on column public.messages.reply_to_id is
  'The message this one replies to. Always in the same conversation (trigger messages_reply_same_conversation).';
comment on column public.messages.deleted_for_everyone_at is
  'Set when the sender deletes for everyone inside the window. The words are blanked and the photos removed.';

create or replace function private.delete_for_everyone_window()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '2 days 12 hours' $$;

create or replace function private.messages_reply_is_same_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages r
     where r.id = new.reply_to_id and r.conversation_id = new.conversation_id
  ) then
    raise exception 'a reply must quote a message in the same conversation'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_reply_same_conversation on public.messages;
create trigger messages_reply_same_conversation
  before insert on public.messages
  for each row execute function private.messages_reply_is_same_conversation();

-- Delete for me: a row per person and message. Read only by its owner.
create table if not exists public.message_hidden (
  user_id   uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

comment on table public.message_hidden is
  'Messages a person deleted for themselves. Written only by delete_message; a person sees only their own rows.';

alter table public.message_hidden enable row level security;

drop policy if exists message_hidden_own_select on public.message_hidden;
create policy message_hidden_own_select
  on public.message_hidden for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.message_hidden from anon, authenticated;
grant select on public.message_hidden to authenticated;

create or replace function public.delete_message(p_message_id uuid, p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m  public.messages%rowtype;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select * into m from public.messages where id = p_message_id;
  if not found or not exists (
    select 1 from public.conversations c
     where c.id = m.conversation_id and me in (c.guest_id, c.agent_id)
  ) then
    raise exception 'message not found' using errcode = 'P0002';
  end if;

  if p_scope = 'me' then
    insert into public.message_hidden (user_id, message_id)
    values (me, m.id)
    on conflict do nothing;
    return jsonb_build_object('scope', 'me', 'messageId', m.id);
  elsif p_scope = 'everyone' then
    if m.sender_id <> me then
      raise exception 'only the sender can delete for everyone' using errcode = '42501';
    end if;
    if m.deleted_for_everyone_at is not null then
      return jsonb_build_object('scope', 'everyone', 'messageId', m.id);
    end if;
    if now() - m.created_at > private.delete_for_everyone_window() then
      raise exception 'the delete window has closed' using errcode = 'P0001';
    end if;
    delete from public.message_attachments where message_id = m.id;
    update public.messages
       set body = '', deleted_for_everyone_at = now()
     where id = m.id;
    return jsonb_build_object('scope', 'everyone', 'messageId', m.id);
  end if;

  raise exception 'unknown delete scope' using errcode = '22023';
end;
$$;

create or replace function public.forward_message(p_message_id uuid, p_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me    uuid := auth.uid();
  m     public.messages%rowtype;
  c     public.conversations%rowtype;
  other uuid;
  new_id uuid;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select * into m from public.messages where id = p_message_id;
  if not found or not exists (
    select 1 from public.conversations c0
     where c0.id = m.conversation_id and me in (c0.guest_id, c0.agent_id)
  ) then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  if m.deleted_for_everyone_at is not null then
    raise exception 'this message was deleted' using errcode = 'P0001';
  end if;
  if m.body = '' or exists (select 1 from public.message_attachments a where a.message_id = m.id) then
    raise exception 'photos cannot be forwarded yet' using errcode = '0A000';
  end if;

  select * into c from public.conversations where id = p_conversation_id;
  if not found or me not in (c.guest_id, c.agent_id) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  other := case when c.guest_id = me then c.agent_id else c.guest_id end;

  if not exists (select 1 from public.follows f where f.follower_id = me and f.followee_id = other) then
    raise exception 'you can forward only to people you follow' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.blocks b
     where (b.user_id = me and b.other_id = other) or (b.user_id = other and b.other_id = me)
  ) then
    raise exception 'this message cannot be sent' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body, forwarded)
  values (p_conversation_id, me, m.body, true)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.delete_message(uuid, text) from public, anon;
revoke all on function public.forward_message(uuid, uuid) from public, anon;
grant execute on function public.delete_message(uuid, text) to authenticated;
grant execute on function public.forward_message(uuid, uuid) to authenticated;
