-- DB-04 / DB-20: four RLS policies applied to PUBLIC while calling helpers the
-- anon role cannot execute, so every anon statement that evaluated them died
-- with 42501 instead of seeing nothing:
--   storage.objects  inspection_photos_objects_party_read    private.inspection_photo_path_access
--   storage.objects  inspection_photos_objects_party_insert  private.inspection_photo_path_access
--   public.listing_access  listing_access_select            private.can_see_listing_access
-- The first two broke EVERY signed-out list or sign in EVERY storage bucket
-- (the Storage API selects from storage.objects as the caller), public buckets
-- included. Nobody signed out has any business with inspection photos or gate
-- codes, so the policies are scoped to the role that uses them rather than the
-- helpers widened to anon. inspection_photos_objects_admin_read is scoped the
-- same way for consistency (its helper is anon-executable, so it was harmless).
--
-- Every caller in the application is signed in (InspectionSheet,
-- lib/inspections/actions.ts, lib/listings/access-queries.ts through the
-- session client) or the service role (lib/bookings/arrival.ts,
-- lib/agent/listings-actions.ts), so no working path changes. anon now gets an
-- empty result from these tables where it got an error.
--
-- Checked by supabase/tests/probes/db-20.sql and db-04-anon-storage-read.sql.
alter policy inspection_photos_objects_party_read on storage.objects to authenticated;
alter policy inspection_photos_objects_party_insert on storage.objects to authenticated;
alter policy inspection_photos_objects_admin_read on storage.objects to authenticated;
alter policy listing_access_select on public.listing_access to authenticated;

do $$
declare
  n int;
begin
  select count(*) into n
    from pg_policy
   where polname in ('inspection_photos_objects_party_read', 'inspection_photos_objects_party_insert',
                     'inspection_photos_objects_admin_read', 'listing_access_select')
     and polroles = array['authenticated'::regrole::oid];
  if n <> 4 then
    raise exception 'DB-04: expected 4 policies scoped to authenticated, found %', n;
  end if;
end;
$$;
