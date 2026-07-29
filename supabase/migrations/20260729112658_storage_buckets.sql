-- Storage buckets: listing photos, avatars, message attachments.
--
-- Public buckets serve marketing-safe media (listing photos, avatars) straight
-- from the CDN; message attachments stay private and are read through signed
-- URLs gated by conversation membership. Path conventions carry the ownership
-- claim: listing-photos and avatars store under <user_id>/..., message
-- attachments under <conversation_id>/... A helper turns the attachment path
-- into an RLS decision without ever throwing on a malformed path.

insert into storage.buckets (id, name, public)
values
  ('listing-photos',      'listing-photos',      true),
  ('avatars',             'avatars',             true),
  ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- Does the current user belong to the conversation named by the first path
-- segment? Returns false, never errors, on paths that do not lead with a uuid.
create function private.attachment_path_access(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  conv uuid;
begin
  begin
    conv := ((storage.foldername(object_name))[1])::uuid;
  exception when others then
    return false;
  end;
  return private.in_conversation(conv);
end;
$$;

revoke execute on function private.attachment_path_access(text) from public, anon;
grant  execute on function private.attachment_path_access(text) to authenticated;

-- Listing photos: world-readable, agents write inside their own folder.
create policy "listing photos public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "listing photos owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing photos owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing photos owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars: world-readable, each user writes their own folder.
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Message attachments: private; conversation members read and write inside
-- their conversation's folder.
create policy "message attachments member read"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments' and private.attachment_path_access(name));

create policy "message attachments member insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and private.attachment_path_access(name));
