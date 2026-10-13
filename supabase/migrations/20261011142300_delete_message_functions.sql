create or replace function private.delete_message_for_everyone(p_message_id uuid, p_me uuid)
returns jsonb language plpgsql set search_path = ''
as $fn$
declare
  m public.messages%rowtype;
begin
  select * into m from public.messages where id = p_message_id;
  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  if m.sender_id <> p_me then
    raise exception 'only the sender can delete for everyone' using errcode = '42501';
  end if;
  if now() - m.created_at > private.delete_for_everyone_window() then
    raise exception 'the delete window has closed' using errcode = 'P0001';
  end if;
  return jsonb_build_object('scope', 'everyone', 'messageId', m.id);
end;
$fn$;

create or replace function private.blank_message_for_everyone(p_message_id uuid)
returns void language plpgsql set search_path = ''
as $fn$
begin
  delete from public.message_attachments where message_id = p_message_id;
  update public.messages set body = '', deleted_for_everyone_at = now() where id = p_message_id;
end;
$fn$;

create or replace function public.delete_message(p_message_id uuid, p_scope text)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  me uuid := auth.uid();
  m  public.messages%rowtype;
  r  jsonb;
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
    insert into public.message_hidden (user_id, message_id) values (me, m.id) on conflict do nothing;
    return jsonb_build_object('scope', 'me', 'messageId', m.id);
  end if;
  if p_scope = 'everyone' then
    if m.deleted_for_everyone_at is not null then
      return jsonb_build_object('scope', 'everyone', 'messageId', m.id);
    end if;
    r := private.delete_message_for_everyone(m.id, me);
    perform private.blank_message_for_everyone(m.id);
    return r;
  end if;
  raise exception 'unknown delete scope' using errcode = '22023';
end;
$fn$;
