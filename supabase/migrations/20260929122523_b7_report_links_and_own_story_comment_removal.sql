-- B-7 (a) and (b). APPLIED 29 September 2026 (version 20260929122523) with founder approval.
--
-- Weakens no policy. Adds no DELETE policy. Grants one SECURITY INVOKER
-- function to `authenticated`, which can do nothing the existing
-- `story_comments_update_own` policy does not already allow.
--
-- (a) A REPORT NOTIFICATION LINKS TO WHAT WAS REPORTED.
--
-- `private.notify_report()` chose the link with a case-sensitive
-- `case new.target_type when 'post'`, and the social actions wrote `POST`,
-- `STORY_COMMENT` and `SOCIAL_PROFILE`. So every social report's "Report
-- received" notification linked to /notifications. The app now writes lower
-- case (apps/web/src/lib/social/report-kinds.ts), which fixes new POST reports
-- against the live trigger on its own; this migration:
--   1. makes the trigger case-insensitive and teaches it the two kinds it did
--      not know: a story comment links to its story, a social profile to
--      /u/<handle>. Anything unresolvable still links to /notifications.
--   2. lower-cases the kinds already filed, except where that would put a
--      second OPEN report on the same (reporter, kind, target) and trip
--      `reports_one_open_per_target`; those few stay as they are.
--   3. repoints the "Report received" notifications those rows already sent.
--      The trigger writes the notification in the same transaction as the
--      report, so both carry the same now(): (reporter, created_at) pins the
--      pair exactly.
--
-- WHAT A REPORTER CAN SEE BY FOLLOWING THE LINK is exactly what anybody who
-- opens that address can see, under their own RLS: a removed, held or blocked
-- post renders the same not found as a post that never existed, and a removed
-- comment is not returned to anybody but its author. The link carries an id
-- and nothing else; the notification body names nothing of the content.
--
-- (b) YOU CAN DELETE YOUR OWN STORY COMMENT.
--
-- Deletion in the social model is soft (`status = 'REMOVED'`), because
-- `parent_id` cascades and a hard delete would take other people's replies
-- with it. So there is deliberately still NO delete policy on story_comments.
-- The author could already set their own LIVE comment to REMOVED under
-- `story_comments_update_own`; what stopped the app offering it:
--   4. `private.notify_story_comment_status()` then told the author "Your
--      comment was removed. It broke the rules of the place the story was
--      posted in." Its own header says the removal note is for moderation
--      only; it never checked. It now stays silent when the person changing
--      the row is the author.
--   5. `public.remove_own_story_comment(uuid)`: the one call the app makes.
--      SECURITY INVOKER, so the update is held to the caller's RLS (own row,
--      LIVE only). Returns the story id, or null when nothing matched. Its
--      existence is also the app's switch: until this file is applied the app
--      answers "not switched on yet" rather than risk the false notice.
--
-- Rollback: re-run the two function bodies from
-- 20260804140802_reports_notify_severity_cast.sql and
-- 20260804152755_a_held_comment_and_a_held_bio_tell_their_author.sql, and
-- `drop function public.remove_own_story_comment(uuid)`. Steps 2 and 3 are
-- data corrections and need no rollback.

begin;

-- 1 -------------------------------------------------------------- notify_report

create or replace function private.notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  serious constant text[] := array['off_platform_payment', 'scam', 'unsafe'];
  kind        text := lower(coalesce(new.target_type, ''));
  target_href text;
  v_story     uuid;
  v_handle    text;
begin
  if kind = 'story_comment' then
    select c.story_id into v_story from public.story_comments c where c.id::text = new.target_id;
  elsif kind = 'social_profile' then
    select p.handle into v_handle from public.social_profiles p where p.user_id::text = new.target_id;
  end if;

  target_href := case kind
    when 'listing'        then '/listing/' || new.target_id
    when 'post'           then '/post/' || new.target_id
    when 'story_comment'  then case when v_story is not null then '/stories/' || v_story::text end
    when 'social_profile' then case when v_handle is not null then '/u/' || v_handle end
  end;

  perform private.notify(
    new.reporter_id,
    'support',
    'Report received',
    'Thank you. Our team reviews every report, and we will act on this one without you having to chase it.',
    coalesce(target_href, '/notifications')
  );

  if new.category = any (serious) then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high'::alert_severity,
      'Reported: ' || replace(new.category, '_', ' '),
      'A member reported a ' || new.target_type || '. Their words: ' || left(new.reason, 400),
      new.target_type,
      new.target_id
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_report() from public, anon, authenticated;

-- 3 (before 2, so the upper-case rows are still findable) ------ old links

update public.notifications n
   set href = case upper(r.target_type)
                when 'POST' then '/post/' || r.target_id
                when 'STORY_COMMENT' then (
                  select '/stories/' || c.story_id::text from public.story_comments c where c.id::text = r.target_id)
                when 'SOCIAL_PROFILE' then (
                  select '/u/' || p.handle from public.social_profiles p where p.user_id::text = r.target_id)
              end
  from public.reports r
 where r.target_type in ('POST', 'STORY_COMMENT', 'SOCIAL_PROFILE')
   and n.user_id = r.reporter_id
   and n.created_at = r.created_at
   and n.title = 'Report received'
   and n.href = '/notifications'
   and case upper(r.target_type)
         when 'POST' then true
         when 'STORY_COMMENT' then exists (select 1 from public.story_comments c where c.id::text = r.target_id)
         when 'SOCIAL_PROFILE' then exists (select 1 from public.social_profiles p where p.user_id::text = r.target_id)
       end;

-- 2 ------------------------------------------------------- lower-case kinds

update public.reports r
   set target_type = lower(r.target_type)
 where r.target_type in ('POST', 'STORY_COMMENT', 'SOCIAL_PROFILE')
   and not (
     r.status = 'open'
     and exists (
       select 1 from public.reports o
        where o.reporter_id = r.reporter_id
          and o.target_type = lower(r.target_type)
          and o.target_id = r.target_id
          and o.status = 'open'
     )
   );

-- 4 ------------------------------------- a self-deletion is not moderation

create or replace function private.notify_story_comment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your comment is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/stories/' || new.story_id);
  elsif new.status = 'REMOVED' then
    /* B-7b: the author deleting their own words is not told by us that they
       broke the rules. A moderator (moderation_decide, or an admin) is never
       the author's own session, so their removals still say so. */
    if (select auth.uid()) is distinct from new.author_id then
      perform private.notify(new.author_id, 'social', 'Your comment was removed',
        'It broke the rules of the place the story was posted in.',
        '/stories/' || new.story_id);
    end if;
  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your comment is live',
      'The check finished and it is showing again.',
      '/stories/' || new.story_id);
  end if;

  return new;
end;
$fn$;

revoke execute on function private.notify_story_comment_status() from public, anon, authenticated;

-- 5 --------------------------------------------- remove your own comment

create or replace function public.remove_own_story_comment(p_comment_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  update public.story_comments
     set status = 'REMOVED'::public.social_status
   where id = p_comment_id
     and author_id = (select auth.uid())
     and status = 'LIVE'::public.social_status
  returning story_id;
$$;

comment on function public.remove_own_story_comment(uuid) is
  'B-7b. Soft-delete your own LIVE story comment. SECURITY INVOKER: held to story_comments_update_own. Returns the story id, or null when nothing matched.';

revoke all on function public.remove_own_story_comment(uuid) from public, anon;
grant execute on function public.remove_own_story_comment(uuid) to authenticated;

-- Read back ------------------------------------------------------------------

do $$
begin
  if (select p.prosecdef from pg_proc p where p.oid = 'public.remove_own_story_comment(uuid)'::regprocedure) then
    raise exception 'b7: remove_own_story_comment must be security invoker';
  end if;
  if has_function_privilege('anon', 'public.remove_own_story_comment(uuid)', 'execute') then
    raise exception 'b7: anon can execute remove_own_story_comment';
  end if;
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'story_comments' and cmd = 'DELETE'
       and policyname <> 'story_comments_admin_write'
  ) then
    raise exception 'b7: story_comments grew a member delete policy';
  end if;
  if position('auth.uid()' in pg_get_functiondef('private.notify_story_comment_status()'::regprocedure)) = 0 then
    raise exception 'b7: notify_story_comment_status does not tell a self-deletion apart';
  end if;
  if position('lower(' in pg_get_functiondef('private.notify_report()'::regprocedure)) = 0 then
    raise exception 'b7: notify_report is still case-sensitive';
  end if;
end;
$$;

commit;
