-- Around: the notifications the social layer owes people, and the badges it owes them.
--
-- Two halves were sitting on the shelf. `notification_kind` gained 'social' in
-- its own migration and nothing ever wrote a row with it, so following somebody
-- was silent, being replied to was silent, and having your post held by the
-- scanner was silent, which is the worst of the three: moderation you cannot see
-- is moderation you cannot argue with. Separately, `public.badges` shipped
-- fourteen definitions and `public.user_badges` had no writer at all, so a table
-- that says "granted_by null means earned from an event we recorded" recorded
-- nothing.
--
-- Both halves close here, in the database rather than in application code, for
-- the same reason the booking and message fan-outs live here: a notification
-- that depends on a server action remembering to send it is a notification that
-- one new code path silently drops.
--
-- Three rules are applied once, centrally, in `private.notify_social`, so no
-- individual trigger can forget one:
--
--   You are never told about yourself.
--   A block in EITHER direction means silence, both ways.
--   A mute means silence one way, which is what a mute is.
--
-- A SAVE is deliberately not notified. `post_mark` carries LIKE and SAVE, and a
-- save is a private act of filing something away. Telling the author would turn
-- a bookmark into a signal the person who made it never agreed to send.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

/*
 * `private.blocked_with` answers for the CALLER, off `auth.uid()`. Inside a
 * trigger the caller is whoever did the write, and the question here is about
 * two other people entirely: may we tell A about B. So this is a second helper
 * rather than a reuse, and the pair is symmetric on purpose.
 */
create or replace function private.block_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.blocks b
     where (b.user_id = p_a and b.other_id = p_b)
        or (b.user_id = p_b and b.other_id = p_a)
  );
$$;

revoke execute on function private.block_between(uuid, uuid) from public, anon, authenticated;

create or replace function private.has_muted(p_user uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null and p_target is not null and exists (
    select 1 from public.mutes m
     where m.user_id = p_user and m.target_kind = 'USER' and m.target_id = p_target
  );
$$;

revoke execute on function private.has_muted(uuid, uuid) from public, anon, authenticated;

/*
 * The handle to name somebody by.
 *
 * A handle rather than a display name, deliberately. A handle is unique, it is
 * the address the recipient can act on, and it cannot be set to somebody else's
 * name. A notification saying "Chidi started following you" when four Chidis
 * exist tells the reader nothing they can use.
 *
 * Null when the person has not claimed one yet, and every caller below folds
 * that into a neutral word rather than printing "@null".
 */
create or replace function private.social_handle(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select handle from public.social_profiles where user_id = p_user;
$$;

revoke execute on function private.social_handle(uuid) from public, anon, authenticated;

/*
 * The single social writer. Every social trigger goes through this and none of
 * them repeats a suppression rule, because a rule written in six places is a
 * rule that is wrong in one of them.
 */
create or replace function private.notify_social(
  p_recipient uuid,
  p_actor     uuid,
  p_title     text,
  p_body      text,
  p_href      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient is null or p_actor is null then return; end if;
  if p_recipient = p_actor then return; end if;
  if private.block_between(p_recipient, p_actor) then return; end if;
  if private.has_muted(p_recipient, p_actor) then return; end if;

  perform private.notify(p_recipient, 'social', p_title, p_body, p_href);
end;
$$;

revoke execute on function private.notify_social(uuid, uuid, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Following
-- ---------------------------------------------------------------------------

create or replace function private.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  who := private.social_handle(new.follower_id);

  perform private.notify_social(
    new.followee_id,
    new.follower_id,
    'New follower',
    coalesce('@' || who, 'Somebody') || ' started following you.',
    coalesce('/u/' || who, '/around')
  );

  return new;
end;
$$;

revoke execute on function private.notify_follow() from public, anon, authenticated;

create trigger follows_notify_after_insert
  after insert on public.follows
  for each row execute function private.notify_follow();

-- ---------------------------------------------------------------------------
-- Replies and mentions
-- ---------------------------------------------------------------------------

/*
 * A reply tells the person replied to, and any handle named in the body tells
 * that person too.
 *
 * Split out of the trigger because it is called from two places: when a post is
 * born LIVE, and when a post the scanner had HELD is released. Without the
 * second call, every post that tripped the scanner and was then cleared would
 * arrive completely silently, which is exactly the case where the author most
 * wants somebody to see it.
 *
 * Mentions are capped at five. A body can name twenty handles and a body that
 * does is not a conversation, it is a broadcast, and five is enough for any
 * real one.
 */
create or replace function private.fan_out_post(p_post public.posts)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  who           text;
  named         text;
  named_id      uuid;
  sent          integer := 0;
  thread        uuid;
begin
  if p_post.author_id is null or p_post.status <> 'LIVE' then return; end if;

  who    := private.social_handle(p_post.author_id);
  thread := coalesce(p_post.root_id, p_post.id);

  if p_post.parent_id is not null then
    select author_id into parent_author from public.posts where id = p_post.parent_id;

    perform private.notify_social(
      parent_author,
      p_post.author_id,
      'New reply',
      coalesce('@' || who, 'Somebody') || ' replied: ' ||
        left(coalesce(nullif(btrim(p_post.body), ''), 'they answered you'), 120),
      '/post/' || thread
    );
  end if;

  /* The handle pattern is the one the column's own check constraint enforces,
     so a token that could never be a handle is never looked up. */
  for named in
    select distinct lower(tok[1])
      from regexp_matches(coalesce(p_post.body, ''), '@([a-z][a-z0-9_]{2,19})', 'gi') as m(tok)
  loop
    exit when sent >= 5;

    select user_id into named_id from public.social_profiles where handle = named;
    if named_id is null or named_id = parent_author then continue; end if;

    perform private.notify_social(
      named_id,
      p_post.author_id,
      'You were mentioned',
      coalesce('@' || who, 'Somebody') || ' mentioned you: ' ||
        left(coalesce(nullif(btrim(p_post.body), ''), 'in a post'), 120),
      '/post/' || thread
    );
    sent := sent + 1;
  end loop;
end;
$$;

revoke execute on function private.fan_out_post(public.posts) from public, anon, authenticated;

create or replace function private.notify_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
   * A post can be born HELD: `private.scan_post` is a BEFORE INSERT trigger and
   * it moves the status before this one ever runs. No UPDATE follows, so
   * without this branch the single most important moderation event on the
   * platform, "the thing you just wrote is not showing", would be the one that
   * never spoke.
   */
  if new.status = 'HELD' and new.author_id is not null then
    perform private.notify(new.author_id, 'social',
      'Your post is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/post/' || coalesce(new.root_id, new.id));
    return new;
  end if;

  perform private.fan_out_post(new);
  return new;
end;
$$;

revoke execute on function private.notify_post_insert() from public, anon, authenticated;

create trigger posts_notify_after_insert
  after insert on public.posts
  for each row execute function private.notify_post_insert();

-- ---------------------------------------------------------------------------
-- Moderation, said out loud
-- ---------------------------------------------------------------------------

/*
 * Nobody's post disappears quietly.
 *
 * The scanner can move a post to HELD before it is ever seen and a moderator
 * can move it to REMOVED afterwards, and until now both happened in silence.
 * An author who cannot tell the difference between "held" and "nobody liked it"
 * learns nothing and assumes the worst of us, so each transition says which one
 * it was, in a sentence, with a link to the post itself.
 */
create or replace function private.notify_post_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.author_id is null then return new; end if;

  if new.status = 'HELD' then
    perform private.notify(new.author_id, 'social',
      'Your post is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/post/' || coalesce(new.root_id, new.id));

  elsif new.status = 'REMOVED' then
    /* `hidden_by` null on a removal means the author removed it themselves.
       Telling somebody they deleted their own post is noise, so we do not. */
    if new.hidden_by is not null then
      perform private.notify(new.author_id, 'social',
        'Your post was removed',
        coalesce(nullif(btrim(new.hold_reason), ''),
                 'It broke the rules of the place it was posted in.'),
        '/post/' || coalesce(new.root_id, new.id));
    end if;

  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.author_id, 'social',
      'Your post is live',
      'The check finished and it is showing again.',
      '/post/' || coalesce(new.root_id, new.id));

    /* Held on the way in means the reply and the mentions never went out.
       They go now, once, rather than never. */
    perform private.fan_out_post(new);
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_post_status() from public, anon, authenticated;

create trigger posts_notify_after_status_change
  after update of status on public.posts
  for each row execute function private.notify_post_status();

-- ---------------------------------------------------------------------------
-- Likes and reposts
-- ---------------------------------------------------------------------------

create or replace function private.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.posts;
  who    text;
begin
  /* SAVE is a private act of filing. Only LIKE is a signal to anybody. */
  if new.mark <> 'LIKE' then return new; end if;

  select * into target from public.posts where id = new.post_id;
  if target.author_id is null or target.status <> 'LIVE' then return new; end if;

  who := private.social_handle(new.user_id);

  perform private.notify_social(
    target.author_id,
    new.user_id,
    'Somebody liked your post',
    coalesce('@' || who, 'Somebody') || ' liked ' ||
      left(coalesce(nullif(btrim(target.body), ''), 'what you posted'), 100),
    '/post/' || coalesce(target.root_id, target.id)
  );

  return new;
end;
$$;

revoke execute on function private.notify_reaction() from public, anon, authenticated;

create trigger post_reactions_notify_after_insert
  after insert on public.post_reactions
  for each row execute function private.notify_reaction();

create or replace function private.notify_repost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.posts;
  who    text;
begin
  select * into target from public.posts where id = new.post_id;
  if target.author_id is null or target.status <> 'LIVE' then return new; end if;

  who := private.social_handle(new.user_id);

  perform private.notify_social(
    target.author_id,
    new.user_id,
    'Somebody reposted you',
    coalesce('@' || who, 'Somebody') || ' passed on ' ||
      left(coalesce(nullif(btrim(target.body), ''), 'what you posted'), 100),
    '/post/' || coalesce(target.root_id, target.id)
  );

  return new;
end;
$$;

revoke execute on function private.notify_repost() from public, anon, authenticated;

create trigger post_reposts_notify_after_insert
  after insert on public.post_reposts
  for each row execute function private.notify_repost();

-- ---------------------------------------------------------------------------
-- Badges: the writer, and the events that earn one
-- ---------------------------------------------------------------------------

/*
 * `granted_by` stays null, which the table's own comment defines as "earned
 * from an event we recorded". An admin granting one by hand sets it, and the
 * surface shows that difference rather than hiding it.
 *
 * `on conflict do nothing` makes every award idempotent, which matters because
 * these fire on ordinary writes people repeat all day.
 */
create or replace function private.award_badge(
  p_user     uuid,
  p_code     text,
  p_reason   text,
  p_evidence jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;

  insert into public.user_badges (user_id, badge_code, reason, evidence)
  values (p_user, p_code, p_reason, p_evidence)
  on conflict (user_id, badge_code) do nothing;
end;
$$;

revoke execute on function private.award_badge(uuid, text, text, jsonb)
  from public, anon, authenticated;

/* Earning one is worth hearing about, so the award itself notifies. */
create or replace function private.notify_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  badge_name text;
  badge_desc text;
  who        text;
begin
  if new.revoked_at is not null then return new; end if;

  select name, description into badge_name, badge_desc
  from public.badges where code = new.badge_code;

  who := private.social_handle(new.user_id);

  perform private.notify(new.user_id, 'social',
    'You earned ' || coalesce(badge_name, 'a badge'),
    coalesce(badge_desc, 'It is on your profile now.'),
    coalesce('/u/' || who, '/profile'));

  return new;
end;
$$;

revoke execute on function private.notify_badge() from public, anon, authenticated;

create trigger user_badges_notify_after_insert
  after insert on public.user_badges
  for each row execute function private.notify_badge();

-- first_listing and estate_specialist.
create or replace function private.award_listing_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id  uuid;
  here      integer;
  where_txt text;
begin
  if new.status <> 'PUBLISHED' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'PUBLISHED' then return new; end if;

  select user_id into owner_id from public.agents where id = new.agent_id;
  if owner_id is null then return new; end if;

  perform private.award_badge(owner_id, 'first_listing',
    'Their first listing reached published.',
    jsonb_build_object('listing_id', new.id));

  /*
   * "One area" is read as one city within one state. `listings.area` is a free
   * text field a person types, so two spellings of the same estate would count
   * as two places and the badge would never land; city is the smallest unit
   * this schema holds reliably.
   */
  select count(*) into here
    from public.listings l
   where l.agent_id = new.agent_id
     and l.status = 'PUBLISHED'
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
$$;

revoke execute on function private.award_listing_badges() from public, anon, authenticated;

create trigger listings_award_badges_after_write
  after insert or update of status on public.listings
  for each row execute function private.award_listing_badges();

-- verified_agent.
create or replace function private.award_agent_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'APPROVED' or not new.verified then return new; end if;

  perform private.award_badge(new.user_id, 'verified_agent',
    'Identity and payout account verified, application approved.',
    jsonb_build_object('agent_id', new.id));

  return new;
end;
$$;

revoke execute on function private.award_agent_badges() from public, anon, authenticated;

create trigger agents_award_badges_after_write
  after insert or update on public.agents
  for each row execute function private.award_agent_badges();

-- honest_reviewer. A review is keyed to a booking one-to-one, so five reviews
-- is five real stays and cannot be farmed by writing the same one twice.
create or replace function private.award_review_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer;
begin
  select count(*) into written from public.reviews where author_id = new.author_id;

  if written >= 5 then
    perform private.award_badge(new.author_id, 'honest_reviewer',
      'Five reviews written after real completed stays.',
      jsonb_build_object('count', written));
  end if;

  return new;
end;
$$;

revoke execute on function private.award_review_badges() from public, anon, authenticated;

create trigger reviews_award_badges_after_insert
  after insert on public.reviews
  for each row execute function private.award_review_badges();

-- neighbour. Joining is the event; the badge says you are part of a place.
create or replace function private.award_membership_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  place text;
begin
  select name into place from public.areas where id = new.area_id;

  perform private.award_badge(new.user_id, 'neighbour',
    'Joined ' || coalesce(place, 'a place') || '.',
    jsonb_build_object('area_id', new.area_id));

  return new;
end;
$$;

revoke execute on function private.award_membership_badges() from public, anon, authenticated;

create trigger area_members_award_badges_after_insert
  after insert on public.area_members
  for each row execute function private.award_membership_badges();

-- guardian. `resolved` is a report a moderator acted on; `dismissed` is one
-- they did not. Only the first counts, or the badge would reward noise.
create or replace function private.award_report_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  upheld integer;
begin
  if new.status <> 'resolved' or old.status = 'resolved' then return new; end if;

  select count(*) into upheld
    from public.reports
   where reporter_id = new.reporter_id and status = 'resolved';

  if upheld >= 3 then
    perform private.award_badge(new.reporter_id, 'guardian',
      'Three reports upheld by a moderator.',
      jsonb_build_object('count', upheld));
  end if;

  return new;
end;
$$;

revoke execute on function private.award_report_badges() from public, anon, authenticated;

create trigger reports_award_badges_after_update
  after update of status on public.reports
  for each row execute function private.award_report_badges();

/*
 * Seven of the fourteen badges are still unawarded, and that is stated here
 * rather than left for somebody to discover:
 *
 *   first_stay, ten_stays  `booking_status` is PENDING, CONFIRMED, CANCELLED.
 *                          There is no COMPLETED, so "they stayed" is not an
 *                          event any trigger can fire on; it is the passage of
 *                          a date. Awarding at CONFIRMED would hand somebody a
 *                          stay badge for a booking they have not taken yet.
 *   year_one               The passage of a date again.
 *   fast_responder         A median across twenty conversations, recomputed.
 *   local_guide            Not yet defined in numbers anywhere.
 *   photo_pro              Needs a per-listing rejection history the schema
 *                          does not keep.
 *   rentme_elite           Depends on all of the above plus a ninety day clean
 *                          window.
 *
 * All seven want a scheduled sweep, and `pg_cron` is available but NOT
 * installed on this project. Recorded in KNOWN_GAPS.md rather than faked with
 * a trigger that fires at the wrong moment.
 */
