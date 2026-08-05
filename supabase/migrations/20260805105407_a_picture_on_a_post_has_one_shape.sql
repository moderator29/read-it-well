/*
 * A picture on a post: the shape of its path, and the object nobody named.
 *
 * `public.post_media` has existed since the content core and nothing has ever
 * written a row into it. The writer arrives with this migration, and it brings
 * two rules that belong in the database rather than in the composer.
 *
 * 1. The path is `<author id>/<post id>/<file>`, and that is now enforced.
 *
 *    `private.social_media_access` resolves the post out of the SECOND folder
 *    segment of the object name, and the bucket's insert policy checks only the
 *    FIRST. So the layout is load bearing in two policies and was written down
 *    in a document. A third shape has already cost this layer one blocker: a
 *    story went to `<uid>/<file>` and no story picture in the product could be
 *    read by anybody, including its own author. The shape is a rule now, so a
 *    fourth surface cannot invent a fourth one.
 *
 * 2. An object no row names is not readable.
 *
 *    The post branch of the access function trusted the path alone: any object
 *    at `<anything>/<a visible post id>/<anything>` was readable by everybody
 *    who could see that post, whether or not `post_media` had ever heard of it.
 *    The upload happens before the row is written, so an upload that succeeded
 *    where the insert failed was a readable orphan. The story branch already
 *    required its row and the comment on it says exactly why. The post branch
 *    does now too, and it still parses the segment first, so the row can only
 *    speak for the post its path names. That matters: without the parse, a row
 *    on my own post pointing at somebody else's object would make their picture
 *    readable, which is the escalation this ordering closes.
 *
 * The index is not an optimisation. Without it the access function is a
 * sequential scan of `post_media` inside a storage policy, once per signed URL,
 * and a media grid asks for sixty at a time.
 *
 * `post_media` is empty and the bucket holds no objects, so nothing existing
 * has to be migrated to satisfy either rule.
 *
 * Probed through the real policy path, as `authenticated` after
 * `private.probe_as` and as `anon`, in transactions that were rolled back:
 *
 *   the story shape on a post                 refused RM014
 *   somebody else's folder                    refused RM014
 *   the right folder, the wrong post          refused RM014
 *   the shape the composer writes             accepted
 *   a fifth picture                           refused 23514
 *   the same position twice                   refused 23505
 *   a second person, objects readable         0.jpg, and not the orphan
 *   signed out, objects readable              0.jpg, and not the orphan
 *   the post held by the scanner              none
 *   a row of mine pointing at their object    refused 42501
 */

create index if not exists post_media_path_idx
  on public.post_media (storage_path);

create or replace function private.enforce_post_media_path()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  owner uuid;
  parts text[];
begin
  select p.author_id into owner from public.posts p where p.id = new.post_id;

  if owner is null then
    raise exception 'A picture belongs to a post somebody wrote.'
      using errcode = 'RM014';
  end if;

  parts := storage.foldername(new.storage_path);

  if coalesce(array_length(parts, 1), 0) <> 2
     or parts[1] <> owner::text
     or parts[2] <> new.post_id::text then
    raise exception 'A post picture is stored at <author>/<post>/<file>.'
      using errcode = 'RM014';
  end if;

  return new;
end;
$fn$;

create or replace trigger post_media_path
  before insert or update of storage_path, post_id on public.post_media
  for each row execute function private.enforce_post_media_path();

create or replace function private.social_media_access(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  post uuid;
begin
  /* Posts: <uid>/<post id>/<file>. The id is in the name because a post's
     pictures are read as a set and resolving them one row at a time inside a
     storage policy would be a query per picture. The row is still required, so
     an upload nobody finished naming stays private to whoever uploaded it. */
  begin
    post := ((storage.foldername(object_name))[2])::uuid;
  exception when others then
    post := null;
  end;

  if post is not null
     and exists (
       select 1
         from public.post_media m
        where m.post_id = post
          and m.storage_path = object_name
     )
     and private.can_see_post(post)
  then
    return true;
  end if;

  /* Stories: <uid>/<file>. One picture per story, named by the row. */
  return exists (
    select 1
      from public.stories s
     where s.image_path = object_name
       and private.can_see_story(s.id)
  );
end;
$fn$;

revoke execute on function private.social_media_access(text) from public;
grant execute on function private.social_media_access(text) to authenticated, anon;
