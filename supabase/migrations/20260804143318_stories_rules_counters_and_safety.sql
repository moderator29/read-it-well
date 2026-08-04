-- Stories: who may see what, who may write what, and the bookkeeping.

create or replace function private.can_see_story(p_story uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.stories s left join public.areas a on a.id = s.area_id
     where s.id = p_story
       and (s.status = 'LIVE' or s.author_id = (select auth.uid()))
       and (s.area_id is null or a.status in ('ACTIVE', 'PAUSED'))
       and not private.blocked_with(s.author_id)
  );
$fn$;
revoke execute on function private.can_see_story(uuid) from public;
grant  execute on function private.can_see_story(uuid) to anon, authenticated;

-- ----------------------------------------------------------------- safety

create or replace function private.scan_story()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  words text; reason text; sev public.alert_severity;
begin
  if tg_op = 'UPDATE'
     and new.headline is not distinct from old.headline
     and new.standfirst is not distinct from old.standfirst then
    return new;
  end if;

  words := coalesce(new.headline, '') || ' ' || coalesce(new.standfirst, '');

  if words ~ '\d{10}' then
    reason := 'an account number'; sev := 'high';
  elsif words ~* keyword_pattern then
    reason := 'payment language'; sev := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Story held for review',
      'A story contained ' || reason || ' and was held before it became public.',
      'story', new.id::text);
  end if;

  return new;
end;
$fn$;
revoke execute on function private.scan_story() from public, anon, authenticated;
drop trigger if exists stories_scan on public.stories;
create trigger stories_scan before insert or update on public.stories
  for each row execute function private.scan_story();

create or replace function private.scan_story_comment()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  reason text;
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then return new; end if;
  if new.body ~ '\d{10}' then
    reason := 'an account number';
  elsif new.body ~* keyword_pattern then
    reason := 'payment language';
  end if;
  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
  end if;
  return new;
end;
$fn$;
revoke execute on function private.scan_story_comment() from public, anon, authenticated;
drop trigger if exists story_comments_scan on public.story_comments;
create trigger story_comments_scan before insert or update on public.story_comments
  for each row execute function private.scan_story_comment();

/*
 * One level of nesting, enforced rather than hoped for. The design draws a
 * comment and a reply under it, and nothing under that. A reply aimed at a
 * reply is re-pointed at its parent, so the conversation still happens and the
 * screen still renders, instead of growing a third rail with no design and no
 * width left for it.
 */
create or replace function private.flatten_story_comment()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare grandparent uuid; parent_story uuid;
begin
  if new.parent_id is null then return new; end if;

  select parent_id, story_id into grandparent, parent_story
    from public.story_comments where id = new.parent_id;

  if parent_story is null then
    raise exception 'That comment is gone.' using errcode = 'RM023';
  end if;

  /* A reply always belongs to the story its parent belongs to, whatever the
     client claimed. */
  new.story_id := parent_story;
  if grandparent is not null then new.parent_id := grandparent; end if;
  return new;
end;
$fn$;
revoke execute on function private.flatten_story_comment() from public, anon, authenticated;
drop trigger if exists story_comments_zz_flatten on public.story_comments;
create trigger story_comments_zz_flatten before insert on public.story_comments
  for each row execute function private.flatten_story_comment();

-- --------------------------------------------------------------- counters
-- Depth guarded, because this platform has already frozen every counter it had
-- once by letting a client guard revert its own triggers.

create or replace function private.bump_story_counters()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_table_name = 'story_reactions' then
    if tg_op = 'INSERT' then
      if new.mark = 'LIKE' then
        update public.stories set like_count = like_count + 1 where id = new.story_id;
      else
        update public.stories set save_count = save_count + 1 where id = new.story_id;
      end if;
    else
      if old.mark = 'LIKE' then
        update public.stories set like_count = greatest(like_count - 1, 0) where id = old.story_id;
      else
        update public.stories set save_count = greatest(save_count - 1, 0) where id = old.story_id;
      end if;
    end if;

  elsif tg_table_name = 'story_views' then
    update public.stories set view_count = view_count + 1 where id = new.story_id;

  elsif tg_table_name = 'story_comments' then
    if tg_op = 'INSERT' then
      if new.status = 'LIVE' then
        update public.stories set comment_count = comment_count + 1 where id = new.story_id;
      end if;
    elsif tg_op = 'DELETE' then
      if old.status = 'LIVE' then
        update public.stories set comment_count = greatest(comment_count - 1, 0) where id = old.story_id;
      end if;
    else
      /* A removed comment stops counting. The tree counter on posts only ever
         went up for exactly this reason and it took an audit to find. */
      if old.status = 'LIVE' and new.status <> 'LIVE' then
        update public.stories set comment_count = greatest(comment_count - 1, 0) where id = new.story_id;
      elsif old.status <> 'LIVE' and new.status = 'LIVE' then
        update public.stories set comment_count = comment_count + 1 where id = new.story_id;
      end if;
    end if;

  elsif tg_table_name = 'story_comment_reactions' then
    if tg_op = 'INSERT' then
      update public.story_comments set like_count = like_count + 1 where id = new.comment_id;
    else
      update public.story_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    end if;
  end if;

  return null;
end;
$fn$;
revoke execute on function private.bump_story_counters() from public, anon, authenticated;

drop trigger if exists story_reactions_count on public.story_reactions;
create trigger story_reactions_count after insert or delete on public.story_reactions
  for each row execute function private.bump_story_counters();
drop trigger if exists story_views_count on public.story_views;
create trigger story_views_count after insert on public.story_views
  for each row execute function private.bump_story_counters();
drop trigger if exists story_comments_count on public.story_comments;
create trigger story_comments_count after insert or delete or update of status on public.story_comments
  for each row execute function private.bump_story_counters();
drop trigger if exists story_comment_reactions_count on public.story_comment_reactions;
create trigger story_comment_reactions_count after insert or delete on public.story_comment_reactions
  for each row execute function private.bump_story_counters();

/* The client sends a story id and nothing else. The bucket is filled from
   auth.uid() by the database, exactly as it is for posts, so it cannot be
   chosen, forged or replayed for somebody else. */
drop trigger if exists story_views_fill_bucket on public.story_views;
create trigger story_views_fill_bucket before insert on public.story_views
  for each row execute function private.fill_view_bucket();

-- ----------------------------------------------------------- write guards

create or replace function private.guard_story_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if pg_trigger_depth() > 1 then return new; end if;

  new.id         := old.id;
  new.author_id  := old.author_id;
  new.created_at := old.created_at;

  new.like_count    := old.like_count;
  new.save_count    := old.save_count;
  new.comment_count := old.comment_count;
  new.view_count    := old.view_count;

  if not (private.has_role((select auth.uid()), 'admin')
          or private.has_role((select auth.uid()), 'super_admin')) then
    if old.status = 'HELD'    then new.status := old.status; end if;
    if old.status = 'REMOVED' then new.status := old.status; end if;
    new.hidden_by   := old.hidden_by;
    new.hold_reason := old.hold_reason;
  end if;

  if (new.headline is distinct from old.headline
      or new.standfirst is distinct from old.standfirst)
     and new.status <> 'REMOVED' then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$fn$;
revoke execute on function private.guard_story_update() from public, anon, authenticated;
drop trigger if exists stories_zz_guard on public.stories;
create trigger stories_zz_guard before update on public.stories
  for each row execute function private.guard_story_update();

-- -------------------------------------------------------------------- RLS

alter table public.stories                 enable row level security;
alter table public.story_reactions         enable row level security;
alter table public.story_comments          enable row level security;
alter table public.story_comment_reactions enable row level security;
alter table public.story_views             enable row level security;

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories for select
  using (
    (status = 'LIVE' or author_id = (select auth.uid()))
    and (area_id is null or exists (
      select 1 from public.areas a where a.id = area_id and a.status in ('ACTIVE', 'PAUSED')
    ))
    and not private.blocked_with(author_id)
  );

/*
 * LIVE is what a client asks for. HELD is what the scanner may have turned that
 * into before this check runs, because Postgres evaluates WITH CHECK after
 * BEFORE triggers. Leaving HELD out is the exact mistake that made every
 * flagged post fail with 42501 on this platform once already.
 */
drop policy if exists stories_insert_self on public.stories;
create policy stories_insert_self on public.stories for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status in ('LIVE', 'HELD')
    and (area_id is null or exists (
      select 1 from public.areas a where a.id = area_id and a.status = 'ACTIVE'
    ))
  );

drop policy if exists stories_update_own on public.stories;
create policy stories_update_own on public.stories for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists stories_admin_write on public.stories;
create policy stories_admin_write on public.stories for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

drop policy if exists story_reactions_select on public.story_reactions;
create policy story_reactions_select on public.story_reactions for select
  using (private.can_see_story(story_id));
drop policy if exists story_reactions_insert_self on public.story_reactions;
create policy story_reactions_insert_self on public.story_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_story(story_id));
drop policy if exists story_reactions_delete_self on public.story_reactions;
create policy story_reactions_delete_self on public.story_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists story_comments_select on public.story_comments;
create policy story_comments_select on public.story_comments for select
  using (
    (status = 'LIVE' or author_id = (select auth.uid()))
    and private.can_see_story(story_id)
    and not private.blocked_with(author_id)
  );
drop policy if exists story_comments_insert_self on public.story_comments;
create policy story_comments_insert_self on public.story_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status in ('LIVE', 'HELD')
    and private.can_see_story(story_id)
  );
drop policy if exists story_comments_update_own on public.story_comments;
create policy story_comments_update_own on public.story_comments for update to authenticated
  using (author_id = (select auth.uid()) and status = 'LIVE')
  with check (author_id = (select auth.uid()));
drop policy if exists story_comments_admin_write on public.story_comments;
create policy story_comments_admin_write on public.story_comments for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

drop policy if exists story_comment_reactions_select on public.story_comment_reactions;
create policy story_comment_reactions_select on public.story_comment_reactions for select
  using (exists (select 1 from public.story_comments c where c.id = comment_id and private.can_see_story(c.story_id)));
drop policy if exists story_comment_reactions_insert_self on public.story_comment_reactions;
create policy story_comment_reactions_insert_self on public.story_comment_reactions for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists story_comment_reactions_delete_self on public.story_comment_reactions;
create policy story_comment_reactions_delete_self on public.story_comment_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

/* A view is written and never read back by anybody but staff. The count on the
   story is the public answer; the rows behind it are not, because a per-viewer
   record is a tracking record however it is salted. */
drop policy if exists story_views_insert on public.story_views;
create policy story_views_insert on public.story_views for insert to anon, authenticated
  with check (private.can_see_story(story_id));
drop policy if exists story_views_admin_select on public.story_views;
create policy story_views_admin_select on public.story_views for select
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- ----------------------------------------------- what a story says out loud

create or replace function private.notify_story_event()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare s public.stories; who text; parent uuid;
begin
  if tg_table_name = 'story_reactions' then
    if new.mark <> 'LIKE' then return new; end if;
    select * into s from public.stories where id = new.story_id;
    if s.author_id is null or s.status <> 'LIVE' then return new; end if;
    who := private.social_handle(new.user_id);
    perform private.notify_social(s.author_id, new.user_id, 'Somebody liked your story',
      coalesce('@' || who, 'Somebody') || ' liked ' || left(s.headline, 100),
      '/stories/' || s.id);

  elsif tg_table_name = 'story_comments' then
    if new.status <> 'LIVE' then return new; end if;
    select * into s from public.stories where id = new.story_id;
    who := private.social_handle(new.author_id);

    perform private.notify_social(s.author_id, new.author_id, 'New comment on your story',
      coalesce('@' || who, 'Somebody') || ' said: ' || left(new.body, 120),
      '/stories/' || s.id);

    if new.parent_id is not null then
      select author_id into parent from public.story_comments where id = new.parent_id;
      /* Not the story's author twice for the same event. */
      if parent is distinct from s.author_id then
        perform private.notify_social(parent, new.author_id, 'New reply',
          coalesce('@' || who, 'Somebody') || ' replied: ' || left(new.body, 120),
          '/stories/' || s.id);
      end if;
    end if;
  end if;

  return new;
end;
$fn$;
revoke execute on function private.notify_story_event() from public, anon, authenticated;
drop trigger if exists story_reactions_notify on public.story_reactions;
create trigger story_reactions_notify after insert on public.story_reactions
  for each row execute function private.notify_story_event();
drop trigger if exists story_comments_notify on public.story_comments;
create trigger story_comments_notify after insert on public.story_comments
  for each row execute function private.notify_story_event();

/* Moderation says so, here as everywhere. A held story tells its author, a
   release tells them, and a removal by a moderator tells them why. Removing
   your own story says nothing, because telling somebody they deleted their own
   work is noise. */
create or replace function private.notify_story_status()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your story is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/stories/' || new.id);
  elsif new.status = 'REMOVED' and new.hidden_by is not null then
    perform private.notify(new.author_id, 'social', 'Your story was removed',
      coalesce(nullif(btrim(new.hold_reason), ''), 'It broke the rules of the place it was posted in.'),
      '/stories/' || new.id);
  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your story is live',
      'The check finished and it is showing again.',
      '/stories/' || new.id);
  end if;

  return new;
end;
$fn$;
revoke execute on function private.notify_story_status() from public, anon, authenticated;
drop trigger if exists stories_notify_status on public.stories;
create trigger stories_notify_status after update of status on public.stories
  for each row execute function private.notify_story_status();

/* A story born HELD never fires an UPDATE, so without this the author would be
   told nothing at the one moment they most need telling. */
create or replace function private.notify_story_insert()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your story is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/stories/' || new.id);
  end if;
  return new;
end;
$fn$;
revoke execute on function private.notify_story_insert() from public, anon, authenticated;
drop trigger if exists stories_notify_insert on public.stories;
create trigger stories_notify_insert after insert on public.stories
  for each row execute function private.notify_story_insert();

create or replace function public.story_count(p_author uuid)
returns integer language sql stable set search_path = public, pg_temp as $fn$
  select count(*)::integer from public.stories
   where author_id = p_author and status = 'LIVE';
$fn$;
comment on function public.story_count(uuid) is
  'Stories by one person, counted under the caller''s own row level security rather than the platform''s.';
grant execute on function public.story_count(uuid) to anon, authenticated;
