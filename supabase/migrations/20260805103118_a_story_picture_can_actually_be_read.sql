/*
 * Every story picture in the product was unreadable.
 *
 * `social-media` is a private bucket with one read policy,
 * `private.social_media_access(name)`, and it knew about only one of the two
 * things stored in it. It resolves a POST id out of the second folder segment
 * of the object name and asks `private.can_see_post`. A story is uploaded by
 * `StoryComposer` to `<uid>/<uuid>.jpg`, which has no second segment at all, so
 * the cast raised, the handler returned false, and `createSignedUrls` could
 * never sign a story image for anybody, including its own author.
 *
 * `stories.image_path` is `not null` and the picture IS the story: the composer
 * refuses to publish without one, the viewer is built around it, the rail is a
 * row of them and the grid is nothing else. So the whole surface would have
 * rendered with an empty frame everywhere, for every reader, for ever.
 *
 * Probed live before the fix and rolled nothing back, because it needed no rows:
 *   storage.foldername('<uid>/abcd.jpg')            -> {<uid>}
 *   private.social_media_access('<uid>/abcd.jpg')   -> false
 *
 * The fix belongs in the function rather than in the upload path. Moving the
 * object to `<uid>/<story id>/<file>` would not help: segment two would then be
 * a story id handed to `can_see_post`, which would answer false about a post
 * that does not exist. The bucket has two tenants and its access function has
 * to know both.
 *
 * The story branch matches on the stored path rather than parsing the name,
 * which is stricter than the post branch and deliberately so: an object nobody
 * has written a `stories` row for is not readable at all, so an upload that
 * was abandoned halfway is private to its uploader and is not a public URL
 * somebody guessed.
 *
 * The index is not an optimisation. Without it every signed URL request is a
 * sequential scan of `stories` inside an RLS policy, which is the shape that
 * turns one slow page into a slow database.
 *
 * Proven after applying, through the real policy path rather than by calling
 * the function: a story row plus two objects in the bucket, read as `anon`.
 * The story's object comes back and the orphan does not.
 */

create index if not exists stories_image_path_idx
  on public.stories (image_path);

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
     storage policy would be a query per picture. */
  begin
    post := ((storage.foldername(object_name))[2])::uuid;
  exception when others then
    post := null;
  end;

  if post is not null and private.can_see_post(post) then
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
