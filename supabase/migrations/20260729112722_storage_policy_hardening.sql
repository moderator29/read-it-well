-- Storage and function hardening, straight from the security advisor.
--
-- Public buckets serve objects through their public URL without consulting
-- RLS, so a broad SELECT policy on storage.objects only adds the ability to
-- LIST every file in the bucket. Replace the two broad read policies with
-- owner-scoped reads (agents manage their own photo folders, users their own
-- avatars). Also revoke client EXECUTE on the platform's rls_auto_enable
-- event-trigger function, closing the one long-standing advisor warning.

drop policy "listing photos public read" on storage.objects;
drop policy "avatars public read"        on storage.objects;

create policy "listing photos owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
