-- Two ways the trust rule leaks out of the listings table, found by reading the
-- triggers that already fire on publish rather than by testing the surface.
--
-- The previous migrations make it impossible for an example listing to CARRY a
-- trust mark. Neither of them stops the platform DERIVING one somewhere else,
-- and two existing triggers do exactly that the moment such a row reaches
-- PUBLISHED.
--
-- 1. `private.announce_published_listing` writes a SYSTEM post into the area
--    feed saying "A new apartment is now open in Lekki Phase 1." That sentence
--    is a factual claim that a property is available, published as news, in a
--    table that has no is_demo column and no way to qualify it. Publishing this
--    catalogue would have posted that claim up to three times per area per day.
--
-- 2. `private.award_listing_badges` awards `first_listing` and, at five in one
--    city, `estate_specialist`. A badge is a trust signal by definition, and
--    this one would have been earned entirely by inventory that does not exist.
--
-- Both are fixed the same way and at the same place: the trigger asks whether
-- the row is an example before it does anything, and an example is silent.

create or replace function private.announce_published_listing()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_area   uuid;
  already_today integer;
  place_name    text;
  headline      text;
begin
  if new.status <> 'PUBLISHED' then return new; end if;
  -- An example listing is not news. The feed states that a property is open,
  -- and no such property is open.
  if new.is_demo then return new; end if;
  if coalesce(btrim(new.city), '') = '' then return new; end if;

  if exists (
    select 1 from public.posts where listing_id = new.id and author_kind = 'SYSTEM'
  ) then
    return new;
  end if;

  target_area := private.area_for_listing(new.state_code, new.city, new.area);
  if target_area is null then return new; end if;

  select a.name into place_name from public.areas a where a.id = target_area;

  perform private.announce_agent_in_place(new.agent_id, target_area);

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
$function$;

create or replace function private.award_listing_badges()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare owner_id uuid; here integer; where_txt text;
begin
  if new.status <> 'PUBLISHED' then return new; end if;
  -- A badge is a trust signal, and inventory that does not exist earns none.
  -- Note the count below is also filtered, so example rows cannot push a real
  -- lister over the estate_specialist threshold either.
  if new.is_demo then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'PUBLISHED' then return new; end if;

  select user_id into owner_id from public.agents where id = new.agent_id;
  if owner_id is null then return new; end if;

  perform private.award_badge(owner_id, 'first_listing',
    'Their first listing reached published.',
    jsonb_build_object('listing_id', new.id));

  select count(*) into here
    from public.listings l
   where l.agent_id = new.agent_id
     and l.status = 'PUBLISHED'
     and l.is_demo = false
     and l.state_code is not distinct from new.state_code
     and lower(coalesce(l.city, '')) = lower(coalesce(new.city, ''));

  if here >= 5 and coalesce(btrim(new.city), '') <> '' then
    where_txt := new.city;
    perform private.award_badge(owner_id, 'estate_specialist',
      'Five published listings in ' || where_txt || '.',
      jsonb_build_object('city', where_txt, 'count', here));
  end if;

  return new;
end;
$function$;
