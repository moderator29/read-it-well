-- A removed post could never be written, so deleting your own post was broken.
--
-- `posts_content_chk` requires a body, a listing, a quote or a payload, which is
-- right for a post being created: an empty row in a feed is a bug. But removing
-- a post has to empty it while keeping the row, because posts.parent_id cascades
-- and a real delete would take everybody's replies with it. So the correct
-- shape is a tombstone: status REMOVED, body null, row intact.
--
-- Those two rules collided. removePost() would have raised 23514 every time,
-- and nothing would have caught it before a person tried to delete something,
-- because the action typechecked, built and read as correct.
--
-- The check now exempts a REMOVED row and applies in full to every other state.

alter table public.posts drop constraint posts_content_chk;

alter table public.posts add constraint posts_content_chk check (
  status = 'REMOVED'
  or coalesce(btrim(body), '') <> ''
  or listing_id is not null
  or quoted_post_id is not null
  or payload is not null
);
