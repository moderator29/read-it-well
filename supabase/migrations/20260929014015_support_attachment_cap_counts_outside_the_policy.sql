-- The attachment cap counts outside the policy.
--
-- 20260929013912 capped a ticket at 40 attachments by counting
-- support_ticket_attachments inside that table's own insert policy. The
-- subquery is itself subject to the table's row security, so Postgres refused
-- every member insert with "infinite recursion detected in policy". The count
-- now runs in a SECURITY DEFINER function, which reads the table without
-- re-entering its policies. The rule is unchanged: fewer than 40 per ticket.

create or replace function private.support_ticket_attachment_count(p_ticket uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.support_ticket_attachments a where a.ticket_id = p_ticket;
$$;

revoke all on function private.support_ticket_attachment_count(uuid) from public;
grant execute on function private.support_ticket_attachment_count(uuid) to authenticated;

drop policy support_ticket_attachments_insert_own on public.support_ticket_attachments;
create policy support_ticket_attachments_insert_own on public.support_ticket_attachments
  for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and split_part(storage_path, '/', 2) = ticket_id::text
    and exists (select 1 from public.support_tickets t
                 where t.id = support_ticket_attachments.ticket_id
                   and t.user_id = (select auth.uid())
                   and t.status in ('open', 'pending'))
    and (message_id is null or exists (
          select 1 from public.support_ticket_messages m
           where m.id = support_ticket_attachments.message_id
             and m.ticket_id = support_ticket_attachments.ticket_id
             and m.sender_id = (select auth.uid())))
    and private.support_ticket_attachment_count(ticket_id) < 40
  );

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'support_ticket_attachments'
                   and policyname = 'support_ticket_attachments_insert_own'
                   and with_check like '%support_ticket_attachment_count%') then
    raise exception 'attachment insert policy does not use the counter';
  end if;
end;
$$;
