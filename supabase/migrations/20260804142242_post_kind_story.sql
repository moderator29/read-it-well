-- One line, its own migration, for the reason this project has learned twice:
-- Postgres will not let a newly added enum value be USED in the transaction
-- that adds it. Everything that references 'STORY' comes in the next migration.
--
-- A story is a post rather than a table of its own. That is the ONE TABLE
-- decision paying off: likes, saves, reposts, comments, views, moderation,
-- blocks and mutes all work on it the day it exists, and none of them needs a
-- special case. The headline and the place live in `payload`, the standfirst in
-- `body`, and the picture is a `post_media` row.
alter type public.post_kind add value if not exists 'STORY';
