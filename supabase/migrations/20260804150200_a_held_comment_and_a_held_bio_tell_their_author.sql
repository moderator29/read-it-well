-- Two moderation transitions that happened in silence.
--
-- A post held, released or removed already tells its author, and so does a
-- story. A story comment and a bio did not: the scanner could hold either of
-- them and the person would simply find their words missing, with nothing to
-- read and nothing to appeal. Silence is the worst possible moderation
-- experience, because the only interpretation left is that the platform is
-- broken or that it does not like you.
--
-- Both triggers fire AFTER UPDATE OF status, and both are no-ops when the
-- status has not actually moved, so an ordinary edit says nothing.
--
-- The removal note only goes out when `hidden_by` is set, matching the post and
-- story rules: an author deleting their own words does not need to be told by
-- us that they did.

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
    perform private.notify(new.author_id, 'social', 'Your comment was removed',
      'It broke the rules of the place the story was posted in.',
      '/stories/' || new.story_id);
  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.author_id, 'social', 'Your comment is live',
      'The check finished and it is showing again.',
      '/stories/' || new.story_id);
  end if;

  return new;
end;
$fn$;

revoke execute on function private.notify_story_comment_status() from public, anon, authenticated;

drop trigger if exists story_comments_notify_status on public.story_comments;
create trigger story_comments_notify_status
  after update of status on public.story_comments
  for each row execute function private.notify_story_comment_status();

create or replace function private.notify_bio_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.bio_status is not distinct from old.bio_status then return new; end if;

  if new.bio_status = 'HELD' then
    perform private.notify(new.user_id, 'social', 'Your bio is being checked',
      'It is not showing on your profile while somebody looks at it. Most checks finish quickly.',
      '/u/' || new.handle);
  elsif new.bio_status = 'REMOVED' then
    perform private.notify(new.user_id, 'social', 'Your bio was removed',
      'It broke the rules. Write a new one on your profile whenever you are ready.',
      '/u/' || new.handle);
  elsif new.bio_status = 'LIVE' and old.bio_status = 'HELD' then
    perform private.notify(new.user_id, 'social', 'Your bio is live',
      'The check finished and it is showing on your profile again.',
      '/u/' || new.handle);
  end if;

  return new;
end;
$fn$;

revoke execute on function private.notify_bio_status() from public, anon, authenticated;

drop trigger if exists social_profiles_notify_bio_status on public.social_profiles;
create trigger social_profiles_notify_bio_status
  after update of bio_status on public.social_profiles
  for each row execute function private.notify_bio_status();
