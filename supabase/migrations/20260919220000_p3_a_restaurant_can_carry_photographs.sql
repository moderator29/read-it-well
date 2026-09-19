-- P3. A restaurant can carry photographs.
--
-- WHAT WAS OPEN. Ledger section 12.6, blocker three: there is no photo table
-- on the business spine at all. `listing_photos` hangs off `listings` and
-- `accommodation_photos` off `accommodations`, and a restaurant business has
-- neither. The restaurant detail page therefore hard-codes `photos: []` and
-- draws a category plate under an honest "No photographs yet" chip, so nobody
-- is misled, and an owner's own photographs cannot go up on the day they sign.
-- `docs/ONBOARDING_A_RESTAURANT.md` item 21 has to tell the founder, out loud
-- across a table, not to promise the owner their pictures. This closes that.
--
-- MODELLED ON `accommodation_photos`, DELIBERATELY AND CLOSELY. Same column
-- set, same "position 0 is the cover" convention, same ten-photo ceiling, same
-- unique (parent, position), same three-branch read policy through a private
-- helper, same owner-or-admin write policy. A second shape here would be a
-- second set of rules for the same job, and the surfaces that already read
-- accommodation photos would need a branch to tell them apart.
--
-- THE BUCKET IS `accommodation-photos`, AND NO NEW BUCKET IS CREATED.
--
-- This was read before it was decided, as the brief required. That bucket is
-- already public, already capped at 10MB, already limited to the five image
-- types a phone produces, and already carries the four uid-prefixed storage
-- policies that let an owner write only into their own folder. Three further
-- facts settled it:
--
--   1. `lib/account-deletion/constants.ts` lists the buckets a purge sweeps,
--      and `accommodation-photos` is on that list. A new bucket would be
--      invisible to the purge until somebody remembered to add it, which is
--      exactly the shape of fault that is found a year later by a regulator.
--   2. `catalogue_entries.cover_path` is resolved by ONE helper on the
--      application side (`accommodationPhotoUrl`), which every shelf card
--      already calls for every projected row. A second bucket would make the
--      card resolve a restaurant's cover against the wrong bucket unless a
--      branch were added to a file the shelf shares with stays.
--   3. The objects are public either way. The bucket's name is the only thing
--      a second bucket would buy, and a name is not worth a purge gap.
--
-- The path convention is the bucket's own and is unchanged: the first folder
-- is the uploader's auth uid, which is what the storage policies check.
--
-- THE COVER REACHES THE SHELF, which is the half that would otherwise be
-- missing. `private.catalogue_refresh_restaurant` wrote `cover_path` as a
-- literal null because there was nothing to read, so a venue with photographs
-- would still have drawn a stand-in plate everywhere search results are shown.
-- The function is replaced with the identical body but for that one
-- expression, and a trigger on the new table re-projects the venue when a
-- photograph is added, moved or removed, exactly as
-- `accommodation_photos_catalogue_sync` does on the other spine. THE
-- `verified` EXPRESSION IS COPIED BYTE FOR BYTE AND IS NOT TOUCHED: the two
-- derivations of that badge do not agree with each other yet (ledger 12.6,
-- final paragraph) and reconciling them is not this migration's work. Nothing
-- here can light a badge.
--
-- RULE 21, AND WHAT THE REVOKES MEAN HERE. Supabase ships
-- `alter default privileges ... grant all on functions to anon, authenticated`,
-- so every function below is born reachable. All three are revoked from
-- `public`, `anon` and `authenticated` in this same migration, and exactly one
-- of them is granted back:
--
--   private.business_is_public(uuid)        -> anon, authenticated. It is read
--       inside the photo table's SELECT policy, so a signed-out visitor
--       looking at a published venue's page must be able to execute it. This
--       is the same grant `private.accommodation_is_public(uuid)` carries for
--       the same reason.
--   private.catalogue_on_business_photo()   -> nobody. A trigger function.
--   private.catalogue_refresh_restaurant()  -> nobody. Called by trigger
--       functions and by `private.rebuild_catalogue_entries()`, all of which
--       are SECURITY DEFINER owned by the same role, so EXECUTE is checked
--       against that owner and never against a client role.
--
-- Postgres does not check EXECUTE on a trigger function when firing a trigger,
-- so the revoke cannot break the projection, and the probe demonstrates that
-- rather than asserting it.
--
-- ADDITIVE ONLY. One new table, one new helper, one new trigger function, one
-- new trigger, and one `create or replace` of an existing function whose body
-- is unchanged but for the cover expression. Nothing is dropped, no data is
-- lost, and no grant anybody legitimately held is removed.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead to run through `apply_migration`. It ends in a
-- deliberate raise, so the whole transaction rolls back and no probe row ever
-- survives on a live product table. The RLS reads wear a real JWT, because the
-- MCP SQL runner's own role carries `rolbypassrls` and can never demonstrate a
-- refusal (ledger 11.1).
--
--   do $probe$
--   declare
--     u_owner uuid; u_stranger uuid; b_id uuid;
--     visible_to_owner integer; leaked integer; public_rows integer;
--     cover text; caught text;
--     can_anon boolean; can_auth boolean;
--   begin
--     select id into u_owner from auth.users order by created_at limit 1;
--     select id into u_stranger from auth.users where id <> u_owner
--       order by created_at desc limit 1;
--     if u_stranger is null then
--       raise exception 'PROBE NEEDS TWO AUTH USERS';
--     end if;
--
--     -- Setup: a DRAFT venue of the owner's, with two photographs.
--     insert into public.businesses (kind, name, slug, owner_id, status, source, is_demo)
--     values ('restaurant', 'Probe Photo Kitchen', 'probe-photo-' || gen_random_uuid(),
--             u_owner, 'DRAFT', 'first_party', false)
--     returning id into b_id;
--     insert into public.business_photos (business_id, storage_path, position)
--     values (b_id, u_owner || '/probe/one.jpg', 0),
--            (b_id, u_owner || '/probe/two.jpg', 1);
--
--     -- 1. THE CEILING AND THE ORDER ARE THE COLUMN'S, not the caller's.
--     begin
--       insert into public.business_photos (business_id, storage_path, position)
--       values (b_id, u_owner || '/probe/three.jpg', 0);
--       raise exception 'FAIL 1: two photographs share position 0';
--     exception when unique_violation then null;
--     end;
--     begin
--       insert into public.business_photos (business_id, storage_path, position)
--       values (b_id, u_owner || '/probe/eleven.jpg', 10);
--       raise exception 'FAIL 1b: an eleventh position was accepted';
--     exception when check_violation then null;
--     end;
--
--     -- 2. THE COVER REACHES THE PROJECTION, lowest position first.
--     select ce.cover_path into cover from public.catalogue_entries ce
--      where ce.entity_kind = 'restaurant' and ce.entity_id = b_id;
--     if cover is distinct from (u_owner || '/probe/one.jpg') then
--       raise exception 'FAIL 2: the shelf cover is % rather than the first photograph', cover;
--     end if;
--     delete from public.business_photos where business_id = b_id and position = 0;
--     select ce.cover_path into cover from public.catalogue_entries ce
--      where ce.entity_kind = 'restaurant' and ce.entity_id = b_id;
--     if cover is distinct from (u_owner || '/probe/two.jpg') then
--       raise exception 'FAIL 2b: removing the cover did not promote the next photograph: %', cover;
--     end if;
--
--     -- 3. THE BADGE IS UNTOUCHED. A venue with photographs and no human check
--     --    is not verified, on the row or on the shelf.
--     if (select verified from public.catalogue_entries
--          where entity_kind = 'restaurant' and entity_id = b_id) is not false then
--       raise exception 'FAIL 3: photographs lit the shelf badge';
--     end if;
--     if (select verified from public.businesses where id = b_id) is not false then
--       raise exception 'FAIL 3b: photographs lit the business badge';
--     end if;
--
--     -- 4. RLS: A STRANGER READS NONE OF AN UNPUBLISHED VENUE'S PHOTOGRAPHS,
--     --    and the zero is not vacuous, because the count that SHOULD be
--     --    visible is taken first and asserted to be non-zero.
--     select count(*) into visible_to_owner from public.business_photos
--      where business_id = b_id;
--     if visible_to_owner < 1 then
--       raise exception 'FAIL 4 setup: there is no photograph to leak, so a zero proves nothing';
--     end if;
--
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', u_stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     select count(*) into leaked from public.business_photos where business_id = b_id;
--     perform set_config('role', 'postgres', true);
--     if leaked <> 0 then
--       raise exception 'FAIL 4: a stranger read % of the % photographs on a DRAFT venue',
--         leaked, visible_to_owner;
--     end if;
--
--     -- 4b. AND THE OWNER READS THEIR OWN, so the policy is not simply shut.
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     select count(*) into public_rows from public.business_photos where business_id = b_id;
--     perform set_config('role', 'postgres', true);
--     if public_rows <> visible_to_owner then
--       raise exception 'FAIL 4b: the owner read % of their own % photographs',
--         public_rows, visible_to_owner;
--     end if;
--
--     -- 5. PUBLISHING OPENS IT TO EVERYONE, which is what the helper is for.
--     update public.businesses set status = 'PUBLISHED', published_at = now() where id = b_id;
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', u_stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     select count(*) into public_rows from public.business_photos where business_id = b_id;
--     perform set_config('role', 'postgres', true);
--     if public_rows <> visible_to_owner then
--       raise exception 'FAIL 5: a published venue showed % of its % photographs',
--         public_rows, visible_to_owner;
--     end if;
--
--     -- 6. A STRANGER CANNOT WRITE ONE, published or not.
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', u_stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     begin
--       insert into public.business_photos (business_id, storage_path, position)
--       values (b_id, u_stranger || '/probe/forged.jpg', 7);
--       perform set_config('role', 'postgres', true);
--       raise exception 'FAIL 6: a stranger hung a photograph on somebody else''s venue';
--     exception when insufficient_privilege then
--       perform set_config('role', 'postgres', true);
--     end;
--
--     -- 7. RULE 21: the grants are exactly what the header says they are.
--     select has_function_privilege('anon', 'private.business_is_public(uuid)', 'EXECUTE')
--       into can_anon;
--     select has_function_privilege('authenticated', 'private.business_is_public(uuid)', 'EXECUTE')
--       into can_auth;
--     if not can_anon or not can_auth then
--       raise exception 'FAIL 7: the read helper is not callable by the roles the policy needs (anon %, authenticated %)',
--         can_anon, can_auth;
--     end if;
--     select has_function_privilege('anon', 'private.catalogue_on_business_photo()', 'EXECUTE')
--       into can_anon;
--     select has_function_privilege('authenticated', 'private.catalogue_on_business_photo()', 'EXECUTE')
--       into can_auth;
--     if can_anon or can_auth then
--       raise exception 'FAIL 7b: a trigger function is still a REST endpoint (anon %, authenticated %)',
--         can_anon, can_auth;
--     end if;
--     select has_function_privilege('anon', 'private.catalogue_refresh_restaurant(uuid)', 'EXECUTE')
--       into can_anon;
--     select has_function_privilege('authenticated', 'private.catalogue_refresh_restaurant(uuid)', 'EXECUTE')
--       into can_auth;
--     if can_anon or can_auth then
--       raise exception 'FAIL 7c: the projection is still callable by a client role (anon %, authenticated %)',
--         can_anon, can_auth;
--     end if;
--
--     -- 8. AND THE PROJECTION STILL FIRES AFTER THE REVOKE, which is the
--     --    thing that makes 7c safe rather than merely tidy.
--     insert into public.business_photos (business_id, storage_path, position)
--     values (b_id, u_owner || '/probe/after-revoke.jpg', 0);
--     select ce.cover_path into cover from public.catalogue_entries ce
--      where ce.entity_kind = 'restaurant' and ce.entity_id = b_id;
--     if cover is distinct from (u_owner || '/probe/after-revoke.jpg') then
--       raise exception 'FAIL 8: the trigger did not re-project after the revoke: %', cover;
--     end if;
--
--     raise exception 'PROBE ALL PASS p3 business photographs: % photographs on the venue, a stranger read 0 of them while it was DRAFT and % once it was PUBLISHED, a forged write was refused, the shelf cover follows position, no badge lit, and the three functions carry exactly the grants the header names. Rolled back on purpose.',
--       visible_to_owner, public_rows;
--   end
--   $probe$;
--
-- WHAT THE PROBE DELIBERATELY DOES NOT CLAIM. It does not upload an object to
-- storage: the bucket and its four policies already exist and are unchanged by
-- this migration, so there is nothing new there to prove. It does not call
-- anything over REST, for the reason the lead's own probe gives: this sandbox's
-- proxy refuses `*.supabase.co`, and `has_function_privilege` answers the same
-- question from the catalogue PostgREST itself reads it from.
-- ---------------------------------------------------------------------------

/* ------------------------------------------------------------ the table */

create table if not exists public.business_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null check (length(storage_path) between 1 and 400),
  -- Position 0 is the cover, as on listing_photos and accommodation_photos.
  position     integer not null default 0 check (position >= 0 and position < 10),
  created_at   timestamptz not null default now(),
  unique (business_id, position)
);

comment on table public.business_photos is
  'Up to 10 photographs of a business, for the spine that has no accommodation: a restaurant. Position 0 is the cover. storage_path is a path in the public accommodation-photos bucket, uid-prefixed, never a URL.';

comment on column public.business_photos.storage_path is
  'Path inside the public accommodation-photos bucket. The first folder is the uploader''s auth uid, which is what the bucket''s own policies check.';

create index if not exists business_photos_business_idx
  on public.business_photos (business_id, position);

/* ----------------------------------------------------------- the helper */

-- Is this business on the public shelf? Its own status, nothing else, because
-- a business has no parent to inherit from. The twin of
-- private.accommodation_is_public, and read by the photo table's SELECT policy
-- so that unpublishing a venue takes its photographs off the shelf with it.
create or replace function private.business_is_public(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.status = 'PUBLISHED'
  );
$$;

comment on function private.business_is_public(uuid) is
  'True when the business is PUBLISHED. Read inside RLS policies on the business spine, so anon and authenticated both hold EXECUTE and nothing else does.';

revoke all    on function private.business_is_public(uuid) from public, anon, authenticated;
grant  execute on function private.business_is_public(uuid) to anon, authenticated;

/* ------------------------------------------------------------- the rules */

alter table public.business_photos enable row level security;

create policy business_photos_select
  on public.business_photos for select
  using (
    private.business_is_public(business_id)
    or private.owns_business(business_id)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

create policy business_photos_write
  on public.business_photos for all
  using (
    private.owns_business(business_id)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  )
  with check (
    private.owns_business(business_id)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

/* --------------------------------------------------- the shelf projection */

-- The same function M9 created, with ONE expression changed: cover_path was a
-- literal null and now reads the lowest-positioned photograph. Every other
-- line, including the `verified` derivation, is byte for byte what was there.
create or replace function private.catalogue_refresh_restaurant(p_business uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.businesses%rowtype;
begin
  select * into b from public.businesses where id = p_business and kind = 'restaurant';
  if not found then
    delete from public.catalogue_entries where entity_kind = 'restaurant' and entity_id = p_business;
    return;
  end if;

  insert into public.catalogue_entries as ce (
    entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, status,
    featured, published_at, headline_price_minor, headline_price_period, price_band, max_sleeps,
    cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation,
    room_categories, amenity_codes
  )
  select
    'restaurant', b.id, b.name, b.area, b.city, b.state_code, 'restaurant', b.source,
    b.source = 'first_party' and not b.is_demo
      and coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = b.agent_id), false),
    b.is_demo, b.status, false, b.published_at,
    null, null,
    (select rp.price_band from public.restaurant_profiles rp where rp.business_id = b.id),
    null,
    (select bp.storage_path from public.business_photos bp
      where bp.business_id = b.id order by bp.position limit 1),
    b.latitude, b.longitude,
    null, 0, false, false, '{}'::public.room_category[],
    coalesce((select array_remove(array[
        case when rp.parking then 'parking' end,
        case when rp.power_backup then 'generator' end,
        case when rp.outdoor then 'outdoor' end
      ], null) from public.restaurant_profiles rp where rp.business_id = b.id), '{}'::text[])
  on conflict (entity_kind, entity_id) do update set
    title = excluded.title, area = excluded.area, city = excluded.city, state_code = excluded.state_code,
    kind = excluded.kind, source = excluded.source, verified = excluded.verified, is_demo = excluded.is_demo,
    status = excluded.status, featured = excluded.featured, published_at = excluded.published_at,
    headline_price_minor = excluded.headline_price_minor, headline_price_period = excluded.headline_price_period,
    price_band = excluded.price_band, max_sleeps = excluded.max_sleeps, cover_path = excluded.cover_path,
    latitude = excluded.latitude, longitude = excluded.longitude,
    rating_avg = excluded.rating_avg, rating_count = excluded.rating_count,
    has_breakfast = excluded.has_breakfast, has_free_cancellation = excluded.has_free_cancellation,
    room_categories = excluded.room_categories, amenity_codes = excluded.amenity_codes;
end;
$$;

-- A photograph added, moved or removed re-projects its venue. The twin of
-- private.catalogue_on_accommodation_child, which does the same job for the
-- other spine's photos, amenities and room types.
create or replace function private.catalogue_on_business_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.catalogue_refresh_restaurant(coalesce(new.business_id, old.business_id));
  return null;
end;
$$;

drop trigger if exists business_photos_catalogue_sync on public.business_photos;
create trigger business_photos_catalogue_sync
  after insert or update or delete on public.business_photos
  for each row execute function private.catalogue_on_business_photo();

/* --------------------------------------------- born locked (rule 21) */

-- Neither of these has a caller outside a trigger or another SECURITY DEFINER
-- function, and Postgres does not check EXECUTE when firing a trigger, so the
-- revoke removes nothing anybody legitimately had. The probe proves both
-- halves: the grants are gone, and the projection still fires.
revoke all on function private.catalogue_on_business_photo()    from public, anon, authenticated;
revoke all on function private.catalogue_refresh_restaurant(uuid) from public, anon, authenticated;
