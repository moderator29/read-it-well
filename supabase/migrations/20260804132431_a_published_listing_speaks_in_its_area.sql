-- A listing going live says so in the place it is in.
--
-- Around has a cold start problem that no amount of design solves: the first
-- person to open a place sees an empty room and leaves, and because they left
-- the second person sees an empty room too. `docs/SOCIAL_DESIGN.md` answers it
-- with the SYSTEM author kind, which exists precisely so the platform can put
-- something true in a room before anybody has said anything. This is that
-- answer's first real writer.
--
-- The entry is a SYSTEM post, not a SHOWCASE. A SHOWCASE is an agent choosing
-- to show their listing off, and nobody chose this: it is the platform stating
-- a fact. Keeping the two kinds apart means the day we let agents post their
-- own showcases, a reader can still tell which is which.
--
-- Two things stop this becoming spam, and they matter more than the feature:
--
--   A listing is announced once, ever. The first version of this checked that
--   the previous status was not PUBLISHED, and a probe caught it: suspending a
--   listing and putting it back announced it a second time. The test that is
--   actually true to the sentence is whether an entry for this listing already
--   exists, so that is what it asks.
--
--   At most three of these per place per day. An agency uploading forty flats
--   in one afternoon would otherwise bury every real conversation in the area,
--   and a feed that is all machine is a feed nobody comes back to.
--
-- The place is matched on city and state, which are the two fields both tables
-- hold reliably. `listings.area` is free text a person typed, so two spellings
-- of one estate would be two places, and matching on it would put the entry
-- nowhere most of the time. When no ACTIVE place matches, nothing is written:
-- an area is not invented to hold an announcement.

create or replace function private.announce_published_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_area   uuid;
  already_today integer;
  place_name    text;
  headline      text;
begin
  if new.status <> 'PUBLISHED' then return new; end if;
  if coalesce(btrim(new.city), '') = '' then return new; end if;

  /* Once, ever. Not "once per crossing": a listing suspended and restored is
     the same listing and the room has already been told about it. */
  if exists (
    select 1 from public.posts
     where listing_id = new.id and author_kind = 'SYSTEM'
  ) then
    return new;
  end if;

  /* The busiest matching place, because an announcement is worth most where
     there are people to read it. */
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

  /*
   * The sentence names the kind of place and the neighbourhood, and nothing
   * else. No price, because a price on a feed card ages badly and the listing
   * itself is one tap away with the real one. No superlative, because the
   * platform saying "amazing" about a listing it has not stayed in is the kind
   * of small lie that costs a reader's trust for good.
   */
  headline := 'A new '
    || lower(replace(new.property_type::text, '_', ' '))
    || ' is now open in '
    || coalesce(nullif(btrim(new.area), ''), place_name)
    || '.';

  insert into public.posts (area_id, author_id, author_kind, kind, body, listing_id, payload)
  values (
    target_area,
    null,
    'SYSTEM',
    'SYSTEM',
    headline,
    new.id,
    jsonb_build_object('reason', 'listing_published', 'agent_id', new.agent_id)
  );

  return new;
end;
$$;

revoke execute on function private.announce_published_listing()
  from public, anon, authenticated;

drop trigger if exists listings_announce_after_publish on public.listings;

create trigger listings_announce_after_publish
  after insert or update of status on public.listings
  for each row execute function private.announce_published_listing();
