create or replace function private.delete_for_everyone_window()
returns interval language sql immutable set search_path = ''
as $fn$ select interval '2 days 12 hours' $fn$;

create or replace function private.messages_reply_is_same_conversation()
returns trigger language plpgsql set search_path = ''
as $fn$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages r where r.id = new.reply_to_id and r.conversation_id = new.conversation_id
  ) then
    raise exception 'a reply must quote a message in the same conversation' using errcode = '22023';
  end if;
  return new;
end;
$fn$;

do $blk$
begin
  if not exists (select 1 from pg_trigger where tgname = 'messages_reply_same_conversation') then
    create trigger messages_reply_same_conversation before insert on public.messages
      for each row execute function private.messages_reply_is_same_conversation();
  end if;
end;
$blk$;
