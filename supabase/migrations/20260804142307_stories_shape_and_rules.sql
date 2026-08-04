-- Superseded twenty minutes later by 20260804143149. Kept as an empty file
-- rather than deleted, because the version is recorded on the live database and
-- a migration history with a hole in it is worse than one with a scar in it.
--
-- What was here: a check constraint and a DEFERRED constraint trigger that made
-- `post_kind = 'STORY'` carry a headline in `payload` and a picture in
-- `post_media`. It was undone because a story is not a post. See the next
-- migration for why, and for what replaced it.
select 1;
