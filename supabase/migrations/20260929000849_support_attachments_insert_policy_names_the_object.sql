-- The support-attachments upload policy names the object, not the ticket.
--
-- "support attachments owner insert" (20260929000412) read the ticket id from
-- `storage.foldername(name)` inside a subquery on support_tickets, and
-- support_tickets has a `name` column of its own (the filer's name). Inside
-- that subquery the bare `name` bound to the ticket's column, so the folder
-- never matched a ticket id and every member upload was refused. The column is
-- now qualified as `objects.name`. The rule is unchanged: the first folder is
-- the uploader, the second is an open ticket the uploader owns.

drop policy "support attachments owner insert" on storage.objects;

create policy "support attachments owner insert" on storage.objects
  for insert to authenticated
  with check (
    objects.bucket_id = 'support-attachments'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and exists (select 1 from public.support_tickets t
                 where t.id::text = (storage.foldername(objects.name))[2]
                   and t.user_id = (select auth.uid())
                   and t.status in ('open', 'pending'))
  );

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'support attachments owner insert'
                   and with_check like '%foldername(objects.name)%') then
    raise exception 'support attachments owner insert does not name the object';
  end if;
end;
$$;
