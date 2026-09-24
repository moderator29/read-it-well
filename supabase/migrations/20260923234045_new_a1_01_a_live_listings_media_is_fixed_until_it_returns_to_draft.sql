-- NEW-A1-01: a listing's photographs, walkthrough videos and amenities are
-- reviewed with it, so once the listing is through review the owner may not
-- add, reorder, swap or remove them over the API. This is the same rule the
-- listing row now carries (DB-02): take it back to a draft to change it. The
-- listing actions already refuse these writes unless the listing is DRAFT,
-- MORE_INFO_REQUIRED or REJECTED; this puts the rule where a direct API call
-- meets it.
--
-- Two layers, because the picture a renter sees is two things:
--   * the rows (listing_photos, listing_videos, listing_amenities): a guard
--     trigger with the listing guard's shape (API roles only, staff pass);
--   * the stored object: the owner's storage UPDATE and DELETE on a
--     listing-photos or listing-videos object are refused while any
--     through-review listing still shows that object, so the bytes behind an
--     approved photograph cannot be overwritten in place.
--
-- Business and property photographs are deliberately NOT covered: the host
-- flow files them at any status by design (a venue's pictures arrive after it
-- is approved; lib/host/actions.ts ownedBusiness).

create or replace function private.guard_listing_child_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  listing_ids uuid[];
  locked int;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return coalesce(new, old);
  end if;

  listing_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.listing_id end,
    case when tg_op <> 'DELETE' then new.listing_id end], null);

  -- Read under the caller's own RLS: a listing the caller cannot see is not
  -- one they may change, so an invisible parent counts as locked.
  select count(*) into locked
    from unnest(listing_ids) as t(id)
   where not exists (
     select 1 from public.listings l
      where l.id = t.id and l.status in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED'));
  if locked > 0 then
    raise exception 'this listing has been through review; take it back to a draft to change its %', tg_table_name
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.guard_listing_child_write() from public, anon, authenticated;

create trigger listing_photos_00_guard_owner_write
  before insert or update or delete on public.listing_photos
  for each row execute function private.guard_listing_child_write();
create trigger listing_videos_00_guard_owner_write
  before insert or update or delete on public.listing_videos
  for each row execute function private.guard_listing_child_write();
create trigger listing_amenities_00_guard_owner_write
  before insert or update or delete on public.listing_amenities
  for each row execute function private.guard_listing_child_write();

-- True when a listing that is through review still shows this object.
create or replace function private.listing_media_locked(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listing_photos p join public.listings l on l.id = p.listing_id
     where p.storage_path = p_name
       and l.status not in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED')
  ) or exists (
    select 1 from public.listing_videos v join public.listings l on l.id = v.listing_id
     where (v.storage_path = p_name or v.poster_path = p_name)
       and l.status not in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED')
  );
$$;

-- The storage policies below are for authenticated, which must keep EXECUTE.
revoke all on function private.listing_media_locked(text) from public;
grant execute on function private.listing_media_locked(text) to authenticated;

drop policy "listing photos owner update" on storage.objects;
create policy "listing photos owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.listing_media_locked(name))
  with check (bucket_id = 'listing-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy "listing photos owner delete" on storage.objects;
create policy "listing photos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.listing_media_locked(name));

drop policy listing_videos_objects_update_own on storage.objects;
create policy listing_videos_objects_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-videos'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.listing_media_locked(name))
  with check (bucket_id = 'listing-videos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy listing_videos_objects_delete_own on storage.objects;
create policy listing_videos_objects_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-videos'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not private.listing_media_locked(name));

-- listing_media_locked runs on every owner storage update and delete; these
-- keep its lookups off a sequential scan.
create index if not exists listing_photos_storage_path_idx on public.listing_photos (storage_path);
create index if not exists listing_videos_storage_path_idx on public.listing_videos (storage_path);
create index if not exists listing_videos_poster_path_idx on public.listing_videos (poster_path);
