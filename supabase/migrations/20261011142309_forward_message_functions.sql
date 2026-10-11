create or replace function private.forward_guard(p_message_id uuid, p_conversation_id uuid, p_me uuid)
returns text language plpgsql set search_path = ''
as $fn$
declare
  m public.messages%rowtype;
  c public.conversations%rowtype;
  other uuid;
begin
  select * into m from public.messages where id = p_message_id;
  if not found or not exists (
    select 1 from public.conversations c0
     where c0.id = m.conversation_id and p_me in (c0.guest_id, c0.agent_id)
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
  if not found or p_me not in (c.guest_id, c.agent_id) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  other := case when c.guest_id = p_me then c.agent_id else c.guest_id end;
  if not exists (select 1 from public.follows f where f.follower_id = p_me and f.followee_id = other) then
    raise exception 'you can forward only to people you follow' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.blocks b
     where (b.user_id = p_me and b.other_id = other) or (b.user_id = other and b.other_id = p_me)
  ) then
    raise exception 'this message cannot be sent' using errcode = '42501';
  end if;
  return m.body;
end;
$fn$;

create or replace function public.forward_message(p_message_id uuid, p_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $fn$
declare
  me uuid := auth.uid();
  body text;
  new_id uuid;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  body := private.forward_guard(p_message_id, p_conversation_id, me);
  insert into public.messages (conversation_id, sender_id, body, forwarded)
  values (p_conversation_id, me, body, true)
  returning id into new_id;
  return new_id;
end;
$fn$;

revoke all on function public.delete_message(uuid, text) from public, anon;
revoke all on function public.forward_message(uuid, uuid) from public, anon;
grant execute on function public.delete_message(uuid, text) to authenticated;
grant execute on function public.forward_message(uuid, uuid) to authenticated;
revoke all on function private.delete_message_for_everyone(uuid, uuid) from public, anon, authenticated;
revoke all on function private.blank_message_for_everyone(uuid) from public, anon, authenticated;
revoke all on function private.forward_guard(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.messages_reply_is_same_conversation() from public, anon, authenticated;
revoke all on function private.delete_for_everyone_window() from public, anon, authenticated;
