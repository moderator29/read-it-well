/*
 * The other SYSTEM entries `docs/SOCIAL_DESIGN.md` section 3 promises.
 *
 * Five were specified beyond the two that already greet every place. This
 * migration lands the two that have both a source table AND a source moment,
 * and it is deliberate that those are not the same test:
 *
 *   A listing going live   already ships, in `private.announce_published_listing`.
 *   A verified agent here  HERE. The moment is the agent's first published
 *                          listing in a place, because that is the first instant
 *                          at which "this agent" and "this place" are both true.
 *                          Approval cannot be the moment: an agent row is created
 *                          by the approval itself, so at approval an agent has no
 *                          listings and therefore belongs to no place.
 *   A stay completing      HERE, as a daily sweep. `booking_status` is
 *                          (PENDING, CONFIRMED, CANCELLED) and has no COMPLETED
 *                          value: a stay completes by the passage of time past
 *                          `check_out`, and nothing updates the row when that
 *                          happens. `lib/bookings/queries.ts` reaches the same
 *                          conclusion at read time with `check_out <= today`.
 *                          So there is no state transition to hang a trigger on,
 *                          and this is a `pg_cron` job rather than a trigger.
 *                          It could not have been written before the scheduler
 *                          landed on 2026-08-04.
 *   The utility record     NOT BUILT. There is no `utility_reports` table, no
 *                          `area_utility_state` and no `area_utility_daily`.
 *                          Specified in docs/SOCIAL_AUDIT.md, not begun here,
 *                          because the entry is the smallest part of it.
 *   The season             NOT BUILT and NOT SPECIFIABLE. There is no `seasons`
 *                          table and no definition of a season anywhere in this
 *                          repository. See docs/SOCIAL_AUDIT.md.
 *
 * Both entries obey the two rules the first two set: every sentence is TRUE at
 * the moment it is written, and every sentence stays true for ever, because a
 * post carries its timestamp for life. Neither carries a count that moves.
 * Neither names a guest. Neither is special cased anywhere in the application:
 * they are ordinary rows in `public.posts` with `author_kind = 'SYSTEM'`, and
 * the card the layer already has renders them.
 */

/* ------------------------------------------------------ 1. A verified agent */

/*
 * Once per agent per place, for ever.
 *
 * The idempotency key is the payload, not a unique index, because the same
 * shape is already how `listing_published` dedupes and because a partial unique
 * index on a jsonb expression is a lot of machinery for a check that runs at
 * most once per listing publication.
 *
 * The entry is written ONE SECOND OLDER than the listing announcement that
 * carries it in, so the feed reads downwards as "a flat opened" then "and here
 * is who put it there", which is the order somebody actually asks it in.
 * `open_place_entries` sets the same precedent for the same reason.
 */
create or replace function private.announce_agent_in_place(p_agent uuid, p_area uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  ag        record;
  place_nm  text;
  who       text;
  handle_of text;
  line      text;
begin
  if p_agent is null or p_area is null then return; end if;

  select a.id, a.user_id, a.display_name, a.status
    into ag
    from public.agents a
   where a.id = p_agent;
  if not found then return; end if;

  /* Only an approved agent is announced. A suspended or rejected one is not a
     fact this place needs told about it. */
  if ag.status <> 'APPROVED' then return; end if;

  if exists (
    select 1
      from public.posts p
     where p.area_id = p_area
       and p.author_kind = 'SYSTEM'
       and p.payload ->> 'reason' = 'agent_verified'
       and p.payload ->> 'agent_id' = p_agent::text
  ) then
    return;
  end if;

  select ar.name into place_nm from public.areas ar where ar.id = p_area;
  if place_nm is null then return; end if;

  who := coalesce(nullif(btrim(ag.display_name), ''), 'A RentMe agent');

  /* The handle turns the name into a link, because `PostBody` linkifies every
     `@handle` in a body. It notifies nobody: `private.fan_out_post` returns
     early on a null author, which every SYSTEM row has. That is correct here.
     Nobody has been mentioned; the platform has said who somebody is. */
  select s.handle into handle_of
    from public.social_profiles s
   where s.user_id = ag.user_id;

  line := who
    || case when handle_of is null then '' else ' (@' || handle_of || ')' end
    || ' is listing around ' || place_nm
    || '. RentMe checked who they are before the first one went up. '
    || 'Message them here, arrange the inspection, and pay after you have '
    || 'stood inside the place.';

  insert into public.posts (area_id, author_kind, kind, body, status, payload, created_at)
  values (
    p_area, 'SYSTEM', 'SYSTEM', line, 'LIVE',
    jsonb_build_object('reason', 'agent_verified', 'agent_id', p_agent),
    now() - interval '1 second'
  );
end;
$fn$;

revoke execute on function private.announce_agent_in_place(uuid, uuid) from public, anon, authenticated;

comment on function private.announce_agent_in_place(uuid, uuid) is
  'Writes the "a verified agent is here" SYSTEM entry, at most once per agent per place. Called from private.announce_published_listing, which is the only moment at which an agent and a place are both known.';

/*
 * The listing announcement now carries the agent announcement in with it.
 *
 * Two changes, both small, and the rest is byte for byte what was there:
 *
 * 1. The agent call sits ABOVE the three-a-day cap, so a place that has already
 *    had its three listing entries today still learns that a new agent has
 *    arrived. The cap exists to stop a bulk publication filling a feed with
 *    flats; it was never meant to swallow a different fact.
 * 2. Nothing else moved.
 */
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

  select a.id, a.name into target_area, place_name
    from public.areas a
   where a.status = 'ACTIVE'
     and a.state_code is not distinct from new.state_code
     and lower(a.city) = lower(new.city)
   order by a.member_count desc, a.created_at asc
   limit 1;

  if target_area is null then return new; end if;

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

/*
 * An agent who stops being approved stops being announced.
 *
 * A trust product cannot leave "RentMe checked who they are" standing in a
 * public feed about somebody it has since suspended. The entry is removed, not
 * rewritten, because the platform's own words are the platform's to withdraw.
 *
 * Only entries with no replies are removed, and that is load bearing.
 * `posts_parent_id_fkey` is ON DELETE CASCADE, so deleting a post that somebody
 * answered deletes their answer too, and section 8.3 of the design says plainly
 * that other people's words are never collateral. An announcement somebody has
 * replied to keeps its thread and simply stops being repeated.
 */
create or replace function private.retire_agent_announcements()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status = 'APPROVED' then return null; end if;

  delete from public.posts p
   where p.author_kind = 'SYSTEM'
     and p.payload ->> 'reason' = 'agent_verified'
     and p.payload ->> 'agent_id' = new.id::text
     and p.reply_count = 0;

  return null;
end;
$fn$;

revoke execute on function private.retire_agent_announcements() from public, anon, authenticated;

drop trigger if exists agents_retire_announcements on public.agents;
create trigger agents_retire_announcements
  after update of status on public.agents
  for each row execute function private.retire_agent_announcements();

/*
 * The same defect, in the function that was already there.
 *
 * `private.retire_listing_announcement` deleted every SYSTEM post for a deleted
 * listing outright, and `posts_parent_id_fkey` cascades, so it silently deleted
 * every reply anybody had written underneath. The migration that created it
 * reasoned carefully about not taking a person's SHOWCASE with the listing and
 * then took their replies instead.
 *
 * An announcement nobody answered still goes. One that somebody answered stays,
 * and the foreign key sets its `listing_id` to null on its own, so the card
 * renders as plain words rather than as a plate pointing at a dead page:
 * `readPostListings` only ever produces a plate for a listing it can still read.
 */
create or replace function private.retire_listing_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  delete from public.posts
   where listing_id = old.id
     and author_kind = 'SYSTEM'
     and reply_count = 0;
  return old;
end;
$fn$;

/* ------------------------------------------------------- 2. A stay finished */

/*
 * "Somebody stayed here", and nothing else about them.
 *
 * No guest, no listing, no address, no price, no dates. The entry exists to
 * prove that a place is real and transacting, which is exactly the thing a
 * first-time visitor cannot verify for themselves, and none of the rest of it
 * is any of the neighbourhood's business.
 *
 * ONE ENTRY PER PLACE PER SEVEN DAYS, and the number in it is the number of
 * stays that finished in the seven days behind it. That is both the anti-spam
 * rule and the privacy rule: a busy place says "9 guests" and identifies
 * nobody, and a quiet place says "a guest" once a week rather than announcing
 * each departure as it happens.
 *
 * The window is seven days rather than one, so a missed run leaves a gap in the
 * schedule and never a gap in the record.
 *
 * Returns the number of entries written, so a manual run says what it did.
 */
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
      join lateral (
        select a.id, a.name
          from public.areas a
         where a.status = 'ACTIVE'
           and a.state_code is not distinct from l.state_code
           and lower(a.city) = lower(l.city)
         order by a.member_count desc, a.created_at asc
         limit 1
      ) place on true
     where b.status = 'CONFIRMED'
       and b.check_out <= today
       and b.check_out > today - 7
       and coalesce(btrim(l.city), '') <> ''
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

revoke execute on function private.announce_completed_stays() from public, anon, authenticated;

comment on function private.announce_completed_stays() is
  'Daily sweep. Writes at most one "a stay finished here" SYSTEM entry per place per seven days. A trigger is impossible: booking_status has no COMPLETED value and a stay completes by the passage of time.';

/*
 * 05:20 UTC is 06:20 Lagos, which is morning here and is deliberately not on
 * the hour: the other four jobs sit at :00, :10, :20 and :30 past, and this one
 * takes the empty slot furthest from the quarter-hour hold sweep.
 *
 * Idempotent, so re-running this migration cannot leave two of it.
 */
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rentme_announce_completed_stays') then
    perform cron.unschedule('rentme_announce_completed_stays');
  end if;
end $$;

select cron.schedule(
  'rentme_announce_completed_stays',
  '20 5 * * *',
  $$select private.announce_completed_stays();$$
);
