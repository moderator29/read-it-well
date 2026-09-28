-- A support reply notification opens the ticket thread it is about.
--
-- private.notify_support_reply linked every admin reply to '/settings', a hub
-- that lists no ticket and shows no reply, so the member was told support had
-- answered and then shown nothing. The member inbox now lives at
-- /support/messages/<ticket id> (read under the owner's own RLS on
-- support_tickets and support_ticket_messages). This replaces the function
-- body with the live definition, changing only the link.

create or replace function private.notify_support_reply()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  owner_user uuid;
  ticket_ref text;
begin
  if new.sender_role = 'admin' then
    select t.user_id, t.reference into owner_user, ticket_ref
    from public.support_tickets t
    where t.id = new.ticket_id;

    perform private.notify(owner_user, 'support', 'Support replied',
      'Ticket ' || ticket_ref || ' has a new reply.', '/support/messages/' || new.ticket_id::text);
  end if;

  return new;
end;
$function$;

revoke execute on function private.notify_support_reply() from public, anon, authenticated;

do $$
declare
  def text := pg_get_functiondef('private.notify_support_reply'::regproc);
begin
  if position('''/support/messages/'' || new.ticket_id::text' in def) = 0 then
    raise exception 'notify_support_reply does not link to the ticket thread';
  end if;
  if position('''/settings''' in def) > 0 then
    raise exception 'notify_support_reply still links to /settings';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'support_ticket_messages_notify_after_insert'
      and tgrelid = 'public.support_ticket_messages'::regclass
      and not tgisinternal
  ) then
    raise exception 'the reply trigger is missing';
  end if;
  if has_function_privilege('authenticated', 'private.notify_support_reply()', 'execute') then
    raise exception 'authenticated can execute notify_support_reply';
  end if;
end;
$$;
