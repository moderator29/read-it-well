-- How many videos a listing may hold, counted where it cannot be argued with.
--
-- listing_photos has always had a ceiling and it is a good one: position is
-- constrained to 0..9 and unique per listing, so ten photos is not a rule
-- anybody enforces, it is a shape the table cannot exceed. listing_videos was
-- created with a position column and no such constraint, so a listing could
-- carry a thousand walkthroughs at fifty megabytes each and the only thing
-- standing in the way was a number in a React component.
--
-- THREE, and the number is a product decision rather than a technical one. A
-- walkthrough is one continuous walk through the property. A second is for the
-- compound or the street. A third is for a specific room somebody asked about.
-- A fourth is somebody uploading their whole camera roll, and the person
-- deciding whether to travel across Lagos to see the place is not helped by it.
-- Three at fifty megabytes is also a hundred and fifty megabytes per listing,
-- which is a storage bill somebody can predict.
--
-- A TRIGGER RATHER THAN A POSITION CONSTRAINT. Copying the photos approach
-- (position 0..2, unique) would work and would be cheaper, but it makes
-- reordering require the same park-and-replace dance that applyOrder in
-- listings-actions.ts had to grow, and three videos do not justify that
-- machinery. Counting on insert is the simpler correct thing.

begin;

create or replace function private.listing_video_ceiling()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  held integer;
begin
  -- FOR UPDATE on the parent listing, not on the videos: two concurrent
  -- uploads counting the same three rows would both see three and both insert.
  -- Serialising on the listing row is what makes the count mean anything.
  perform 1 from public.listings where id = new.listing_id for update;

  select count(*) into held from public.listing_videos where listing_id = new.listing_id;
  if held >= 3 then
    raise exception 'a listing holds up to 3 videos'
      using errcode = 'check_violation',
            hint = 'Remove one of the existing walkthroughs before adding another.';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_videos_ceiling on public.listing_videos;
create trigger listing_videos_ceiling
  before insert on public.listing_videos
  for each row
  execute function private.listing_video_ceiling();

comment on function private.listing_video_ceiling is
  'Three walkthroughs per listing, counted under a lock on the parent listing row so two concurrent uploads cannot both see room for one more.';

/*
 * The storage path has to point inside this listing's own folder.
 *
 * The bucket policy will restrict writes to the uploader's folder, but the ROW
 * is what a reader follows: a listing_videos row naming somebody else's object
 * would serve that object under this listing's name. The photos table never had
 * this check and has always relied on the server action alone, which is one
 * forgotten validation away from being wrong.
 */
alter table public.listing_videos
  add constraint listing_videos_path_has_no_traversal
    check (storage_path !~ '(^|/)\.\.(/|$)' and storage_path !~ '^/'),
  add constraint listing_videos_poster_has_no_traversal
    check (
      poster_path is null
      or (poster_path !~ '(^|/)\.\.(/|$)' and poster_path !~ '^/')
    );

commit;
