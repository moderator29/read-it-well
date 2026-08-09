-- The listing-videos bucket had no object policies at all.
--
-- The bucket was created with a size ceiling and a MIME allowlist and nothing
-- could be written to it or read from it, because storage.objects has RLS on
-- and no policy named this bucket. An upload would have failed with a 42501 and
-- the wizard would have shown "that upload did not complete" forever.
--
-- The four owner policies mirror listing-photos exactly, keyed on the first
-- path segment being the uploader's auth id, so the path convention
-- <auth uid>/<listing id>/<uuid>.<ext> carries the ownership claim and storage
-- can decide access without reading any application table.
--
-- READ IS THE ONE THAT DIFFERS, and deliberately. listing-photos is a public
-- bucket: anybody with the URL gets the object, which is correct for a
-- photograph on a published listing. listing-videos is private, because a
-- walkthrough is the strongest evidence a listing is real and therefore the
-- most valuable thing on this platform to steal for a fake listing on another
-- one. It is served through a short-lived signed URL minted server side, and
-- the two policies below cover the only two readers who need the object
-- directly: the person who uploaded it, and an admin reviewing the listing.
--
-- Everybody else reads it through the signed URL, which the server mints with
-- the service role after checking the listing is PUBLISHED.

begin;

create policy listing_videos_objects_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_videos_objects_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_videos_objects_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'listing-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_videos_objects_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_videos_objects_admin_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-videos'
    and (
      private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin')
    )
  );

commit;
