-- Photos attached to a post.
--
-- PRIVATE, unlike social-covers, and the difference is deliberate. A cover is a
-- public statement about yourself. A photo in a post is about a street, a flat,
-- a gate, and it is far more likely to be a picture of where somebody actually
-- lives. Private with signed URLs keeps it off the open internet even after the
-- post is removed, which a public bucket cannot do because the object URL
-- survives the row.
--
-- Path is <auth uid>/<post id>/<uuid>.<ext>. EXIF is stripped in the browser by
-- a canvas re-encode before upload, following stripMetadata() in ListingWizard,
-- and the upload is refused rather than attempted when the re-encode fails.

insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', false)
on conflict (id) do nothing;

create policy "social media owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'social-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "social media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'social-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Read is granted through the post's own visibility, not through ownership, so
-- a photo is exactly as visible as the post carrying it: live and unblocked
-- means readable, held or removed or blocked means not. Returns false rather
-- than raising on a malformed path, the same shape as attachment_path_access.
create function private.social_media_access(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  post uuid;
begin
  begin
    post := ((storage.foldername(object_name))[2])::uuid;
  exception when others then
    return false;
  end;
  return private.can_see_post(post);
end;
$$;

revoke execute on function private.social_media_access(text) from public;
grant  execute on function private.social_media_access(text) to anon, authenticated;

create policy "social media read by post"
  on storage.objects for select
  using (bucket_id = 'social-media' and private.social_media_access(name));
