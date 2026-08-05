/*
 * A flat in Yaba was announced in UNILAG.
 *
 * `private.announce_published_listing` matched a place on `state_code` and
 * `city` alone. Every Lagos place carries city 'Lagos', so five ACTIVE places
 * matched every Lagos listing and the tie-break, `member_count desc,
 * created_at asc`, handed all of them to whichever Lagos place was created
 * first. That is UNILAG, a campus.
 *
 * Probed before the fix, on a real PUBLISHED listing with area 'Yaba', inside a
 * rolled back transaction. Both SYSTEM entries landed in UNILAG, and the
 * headline read "A new apartment is now open in Yaba" INSIDE the UNILAG feed,
 * which is the worst version of the defect: the sentence names the right place
 * and sits in the wrong one, so nobody reading it can tell anything is wrong.
 *
 * `areas.area` exists and holds exactly the vocabulary `listings.area` holds,
 * and the whole catalogue is already filtered on that pair of strings. The join
 * simply never used it.
 *
 * One resolver, used by both entry writers, because two copies of "which place
 * is this listing in" is two chances for them to disagree, and the stay sweep
 * had inherited the same lateral join an hour after it was written.
 *
 * The fallback chain is `areas.area`, then `areas.name`, then the city, and it
 * is the same chain `getPlaceReviews` already uses for the same reason: UNILAG
 * is named UNILAG and filed under Akoka, because that is where the flats are.
 */

create or replace function private.area_for_listing(p_state text, p_city text, p_area text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.id
    from public.areas a
   where a.status = 'ACTIVE'
     and a.state_code is not distinct from p_state
     and (
       (
         nullif(btrim(p_area), '') is not null
         and (
           lower(a.area) = lower(btrim(p_area))
           or lower(a.name) = lower(btrim(p_area))
         )
       )
       or lower(a.city) = lower(coalesce(nullif(btrim(p_city), ''), '~none~'))
     )
   order by
     case
       when nullif(btrim(p_area), '') is not null
        and (
          lower(a.area) = lower(btrim(p_area))
          or lower(a.name) = lower(btrim(p_area))
        )
       then 0
       else 1
     end,
     a.member_count desc,
     a.created_at asc
   limit 1;
$fn$;

revoke execute on function private.area_for_listing(text, text, text) from public, anon, authenticated;

comment on function private.area_for_listing(text, text, text) is
  'The place a listing belongs to. Prefers a match on the area name, falls back to the city. The only answer to this question; both SYSTEM entry writers call it.';

create or replace function private.announce_published_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
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
$fn$;

create or replace function private.announce_completed_stays()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  today   date := (now() at time zone 'Africa/Lagos')::date;
  r       record;
  written integer := 0;
  line    text;
begin
  for r in
    select place.id as area_id, place.name as area_name, count(*)::integer as stays
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join public.areas place
        on place.id = private.area_for_listing(l.state_code, l.city, l.area)
     where b.status = 'CONFIRMED'
       and b.check_out <= today
       and b.check_out > today - 7
     group by place.id, place.name
  loop
    if exists (
      select 1
        from public.posts p
       where p.area_id = r.area_id
         and p.author_kind = 'SYSTEM'
         and p.payload ->> 'reason' = 'stay_completed'
         and p.created_at > now() - interval '7 days'
    ) then
      continue;
    end if;

    if r.stays = 1 then
      line := 'A guest finished a stay around ' || r.area_name
        || ' in the last week. No name, no address, no price: only that '
        || 'somebody came, stayed and went home.';
    else
      line := r.stays || ' guests finished stays around ' || r.area_name
        || ' in the last week. No names, no addresses, no prices: only that '
        || 'they came, stayed and went home.';
    end if;

    insert into public.posts (area_id, author_kind, kind, body, status, payload)
    values (
      r.area_id, 'SYSTEM', 'SYSTEM', line, 'LIVE',
      jsonb_build_object('reason', 'stay_completed', 'stays', r.stays)
    );
    written := written + 1;
  end loop;

  return written;
end;
$fn$;
