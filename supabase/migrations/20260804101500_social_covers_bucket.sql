-- The social-covers bucket: profile cover images and avatars for the social layer.
--
-- Public, because a cover photo on a public profile is public by definition and
-- an object in a public bucket serves through its public URL regardless of RLS.
-- The write policies are what actually matter here, and they are path scoped to
-- <auth uid>/... exactly as listing-photos and avatars already are.
--
-- Note the read policy is deliberately broad, unlike the owner-scoped reads that
-- storage_policy_hardening applied to listing-photos and avatars. Those two were
-- tightened because a broad SELECT policy lets any signed-in caller LIST every
-- file in the bucket, which for a private user's avatar folder is a disclosure.
-- Here it is not: a social profile cover is meant to be seen by strangers, that
-- is its entire purpose, and the public URL serves it to anonymous visitors
-- anyway. Making the policy owner-scoped would break nothing and protect nothing.
--
-- EXIF is stripped in the browser by a canvas re-encode before upload, the same
-- way ApplyWizard already handles identity documents. A geotagged photo of your
-- own street, in a public bucket, tells the internet where you sleep.

insert into storage.buckets (id, name, public)
values ('social-covers', 'social-covers', true)
on conflict (id) do nothing;

create policy "social covers read"
  on storage.objects for select
  using (bucket_id = 'social-covers');

create policy "social covers owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'social-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "social covers owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'social-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'social-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "social covers owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'social-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
