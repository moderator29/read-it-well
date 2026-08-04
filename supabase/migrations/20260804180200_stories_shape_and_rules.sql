-- What makes a story a story.
--
-- A story is a root post with a headline and a picture. Both are required,
-- because a story without a headline is a gist and a story without a picture is
-- an empty frame, and the surface would have to invent something to fill it.

alter table public.posts drop constraint if exists posts_story_payload_chk;

alter table public.posts add constraint posts_story_payload_chk check (
  kind <> 'STORY'
  or (
    payload ? 'headline'
    and length(btrim(payload ->> 'headline')) between 3 and 120
  )
);

comment on constraint posts_story_payload_chk on public.posts is
  'A story carries its headline in payload.headline. Three to a hundred and twenty characters: shorter is not a headline, longer does not fit the card it was designed for.';

/*
 * The picture, checked at the end of the statement.
 *
 * A story and its `post_media` row are two inserts. A plain check constraint on
 * `posts` runs on the first of them, before the picture exists, so it would
 * refuse every story ever written. A deferred constraint trigger asks the
 * question at commit, which is the only moment the answer is knowable.
 *
 * The consequence, probed and confirmed on the live database: the insert
 * appears to succeed and the TRANSACTION is refused at commit with RM022. Any
 * write path that creates a story has to expect its failure there rather than
 * on the statement, and turn RM022 into the one true sentence for it. That is
 * the price of a rule no future code path can get around, and it is worth
 * paying: a story with no picture is a screen with a hole in it.
 */
create or replace function private.story_needs_a_picture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'STORY' or new.status = 'REMOVED' then return null; end if;

  if not exists (select 1 from public.post_media where post_id = new.id) then
    raise exception 'A story needs a picture.' using errcode = 'RM022';
  end if;

  return null;
end;
$$;

revoke execute on function private.story_needs_a_picture() from public, anon, authenticated;

drop trigger if exists posts_story_needs_a_picture on public.posts;

create constraint trigger posts_story_needs_a_picture
  after insert on public.posts
  deferrable initially deferred
  for each row execute function private.story_needs_a_picture();

/*
 * Stories on a profile, and stories in a place. The profile prints a count next
 * to the Stories tab and the area feed has a Stories chip: the same question
 * asked twice, so both get an index rather than one of them quietly doing a
 * sequential scan on every profile view.
 */
create index if not exists posts_story_author_idx
  on public.posts (author_id, created_at desc)
  where kind = 'STORY' and status = 'LIVE';

create index if not exists posts_story_area_idx
  on public.posts (area_id, created_at desc)
  where kind = 'STORY' and status = 'LIVE';

/*
 * How many stories somebody has, for the tab.
 *
 * A function rather than a seventh counter column to keep in step, and security
 * INVOKER on purpose: it runs under the caller's own visibility, so a story the
 * scanner is holding is counted for its author and not for a stranger, which is
 * exactly what `posts_select` already decided.
 */
create or replace function public.story_count(p_author uuid)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.posts
   where author_id = p_author and kind = 'STORY' and status = 'LIVE';
$$;

comment on function public.story_count(uuid) is
  'Stories by one person, counted under the caller''s own row level security rather than the platform''s.';

grant execute on function public.story_count(uuid) to anon, authenticated;
