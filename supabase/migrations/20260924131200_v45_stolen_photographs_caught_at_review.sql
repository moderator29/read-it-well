-- V-45 (THE HASH HALF), STOLEN PHOTOGRAPHS CAUGHT AT REVIEW.
--
-- `/standards` says duplicate and stolen photographs are checked before a
-- listing is published, and nothing checked them (A1-118). Lifted photographs
-- are where the fake-agent scam begins: the same sitting room, posted by a
-- second "agent" who has never held the keys.
--
-- Every listing photo gets a 64-bit difference hash (dHash): the photograph
-- shrunk to 9 by 8 grey pixels, one bit per pair of neighbours saying which is
-- brighter. It survives resizing, recompression and a WhatsApp round trip, and
-- two photographs of the same scene land a few bits apart. At review, the desk
-- sees which of this listing's photographs sit within six bits of a photograph
-- on ANOTHER lister's listing, or on any listing Vallo rejected.
--
--   public.listing_photo_hashes   one row per hashed photo: the hash as a
--                             signed 64-bit integer (the bits are the point;
--                             the sign is two's complement) and when. Its own
--                             table, born locked, rather than a column on
--                             `listing_photos`: members hold table-wide
--                             grants there, and a column cannot be taken back
--                             from under a table grant.
--   public.set_listing_photo_phash(photo, hash)
--                             SERVICE ROLE ONLY. The server computes the hash
--                             from the stored object; a lister can never write
--                             their own, or they would write one that matches
--                             nothing.
--   public.listing_photo_matches(listing)
--                             STAFF ONLY. One row per close pair: this
--                             listing's photo, the other listing (its code and
--                             status), the distance in bits, and whether the
--                             other listing was rejected.
--
-- THE CAMERA HALF IS NOT HERE. "Photographed at the property by the lister"
-- needs the native camera plugin and a signed header from the native shell,
-- which is a new native dependency; it is deferred, and nothing on a screen
-- says a photograph was taken in Vallo.
--
-- The comparison is a scan with `bit_count` over hashed photos, which is
-- cheap at today's thousands of photos; past a few hundred thousand it wants a
-- BK-tree or a bucketed index, and the function signature does not change.

create table if not exists public.listing_photo_hashes (
  photo_id  uuid primary key references public.listing_photos(id) on delete cascade,
  phash     bigint not null,
  hashed_at timestamptz not null default now()
);

comment on table public.listing_photo_hashes is
  'V-45. 64-bit difference hash of each listing photograph (9 by 8 grey, neighbour comparisons), two''s complement. Written by the service role from the stored object, never by the lister. Read only through public.listing_photo_matches, by staff.';

create index if not exists listing_photo_hashes_phash_idx on public.listing_photo_hashes (phash);

revoke all on public.listing_photo_hashes from public, anon, authenticated;
alter table public.listing_photo_hashes enable row level security;
grant all on public.listing_photo_hashes to service_role;

create or replace function public.set_listing_photo_phash(p_photo uuid, p_hash bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into public.listing_photo_hashes (photo_id, phash, hashed_at)
  select p.id, p_hash, now() from public.listing_photos p where p.id = p_photo
  on conflict (photo_id) do update set phash = excluded.phash, hashed_at = now()
  returning true;
$$;

comment on function public.set_listing_photo_phash(uuid, bigint) is
  'V-45. Service role only: record the hash the server computed from the stored photograph.';

revoke all on function public.set_listing_photo_phash(uuid, bigint) from public, anon, authenticated;
grant execute on function public.set_listing_photo_phash(uuid, bigint) to service_role;

create or replace function public.listing_photo_matches(p_listing uuid)
returns table (
  photo_id uuid,
  photo_position integer,
  match_listing_id uuid,
  match_reference text,
  match_status public.listing_status,
  match_rejected boolean,
  distance integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) then
    return;
  end if;
  return query
    select p.id, p.position, ol.id, ol.reference, ol.status,
           ol.status = 'REJECTED'::public.listing_status,
           bit_count((ph.phash # oh.phash)::bit(64))::integer
      from public.listing_photos p
      join public.listing_photo_hashes ph on ph.photo_id = p.id
      join public.listings l on l.id = p.listing_id
      join public.agents a on a.id = l.agent_id
      join public.listing_photo_hashes oh on bit_count((ph.phash # oh.phash)::bit(64)) <= 6
      join public.listing_photos o on o.id = oh.photo_id and o.listing_id <> p.listing_id
      join public.listings ol on ol.id = o.listing_id
      join public.agents oa on oa.id = ol.agent_id
     where p.listing_id = p_listing
       and (oa.user_id <> a.user_id or ol.status = 'REJECTED'::public.listing_status)
     order by p.position, 7, ol.id;
end;
$$;

comment on function public.listing_photo_matches(uuid) is
  'V-45. Staff only. This listing''s photographs that sit within six bits of a photograph on another lister''s listing or on a rejected listing.';

revoke all on function public.listing_photo_matches(uuid) from public, anon;
grant execute on function public.listing_photo_matches(uuid) to authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'public.listing_photo_hashes', 'select')
     or has_table_privilege('authenticated', 'public.listing_photo_hashes', 'insert') then
    bad := bad || ' [a member can read or write a hash]';
  end if;
  if has_function_privilege('authenticated', 'public.set_listing_photo_phash(uuid, bigint)', 'execute') then
    bad := bad || ' [a member can set a hash]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
