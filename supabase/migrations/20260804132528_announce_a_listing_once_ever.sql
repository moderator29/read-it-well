-- The fix a probe caught in the migration twenty minutes before this one.
--
-- The first version asked "was the previous status PUBLISHED?", so suspending a
-- listing and restoring it announced it a second time. The test true to the
-- sentence "a listing is announced once, ever" is whether an entry for this
-- listing already exists, so that is what it asks now.
create or replace function private.announce_published_listing()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  target_area   uuid;
  already_today integer;
  place_name    text;
  headline      text;
begin
  if new.status <> 'PUBLISHED' then return new; end if;
  if coalesce(btrim(new.city), '') = '' then return new; end if;

  if exists (
    select 1 from public.posts where listing_id = new.id and author_kind = 'SYSTEM'
  ) then
    return new;
  end if;

  select a.id, a.name into target_area, place_name
    from public.areas a
   where a.status = 'ACTIVE'
     and a.state_code is not distinct from new.state_code
     and lower(a.city) = lower(new.city)
   order by a.member_count desc, a.created_at asc
   limit 1;

  if target_area is null then return new; end if;

  select count(*) into already_today
    from public.posts p
   where p.area_id = target_area
     and p.author_kind = 'SYSTEM'
     and p.listing_id is not null
     and p.created_at >= (now() at time zone 'Africa/Lagos')::date;

  if already_today >= 3 then return new; end if;

  headline := 'A new '
    || lower(replace(new.property_type::text, '_', ' '))
    || ' is now open in '
    || coalesce(nullif(btrim(new.area), ''), place_name)
    || '.';

  insert into public.posts (area_id, author_id, author_kind, kind, body, listing_id, payload)
  values (target_area, null, 'SYSTEM', 'SYSTEM', headline, new.id,
          jsonb_build_object('reason', 'listing_published', 'agent_id', new.agent_id));

  return new;
end;
$fn$;

revoke execute on function private.announce_published_listing() from public, anon, authenticated;
