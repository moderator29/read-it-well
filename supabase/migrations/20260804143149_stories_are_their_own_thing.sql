-- Stories, corrected. A story is not a post.
--
-- I folded stories into `post_kind = 'STORY'` because it was cheap for me: one
-- table, and likes, comments, views and moderation all came free. The owner
-- corrected it, and the correction is right. A story is not a variant of a feed
-- item. It is a piece with a picture, a headline and a standfirst, read on its
-- own full screen, and building it as a post made it a passenger in somebody
-- else's design.
--
-- The clearest proof I was wrong is what falls out. Under the old shape a story
-- and its picture were two inserts, so "a story must have a picture" needed a
-- DEFERRED constraint trigger that failed at COMMIT with a custom SQLSTATE, and
-- every write path had to know to catch it there. Here the picture is a NOT NULL
-- column on the story itself. The rule that took a deferred trigger, a function,
-- a custom error code and a paragraph of explanation is now the word `not null`.
--
-- What a story owns: its own reactions, its own comments with their own likes,
-- its own views, its own moderation, its own counters. What it borrows: nothing
-- except `private.blocked_with`, because a block is a fact about two people and
-- it must mean the same thing everywhere.

-- --------------------------------------------------------------------- scar

drop trigger if exists posts_story_needs_a_picture on public.posts;
drop function if exists private.story_needs_a_picture();
drop function if exists public.story_count(uuid);
drop index if exists public.posts_story_author_idx;
drop index if exists public.posts_story_area_idx;
alter table public.posts drop constraint if exists posts_story_payload_chk;

/*
 * `post_kind` still carries the label STORY and it cannot be taken out without
 * rewriting the type every table and policy depends on, which is a real outage
 * for a cosmetic tidy. So the label stays orphaned and the database refuses it
 * instead. Anybody who finds it in `pg_enum` and wonders should find this too.
 */
alter table public.posts drop constraint if exists posts_kind_not_story_chk;
alter table public.posts add constraint posts_kind_not_story_chk check (kind <> 'STORY');

comment on constraint posts_kind_not_story_chk on public.posts is
  'A story is not a post. The STORY label on post_kind is a scar from a wrong turn and nothing may use it. Stories live in public.stories.';

-- ------------------------------------------------------------------ stories

create table if not exists public.stories (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references auth.users (id) on delete cascade,
  area_id       uuid references public.areas (id) on delete set null,
  listing_id    uuid references public.listings (id) on delete set null,

  image_path    text not null,
  headline      text not null check (length(btrim(headline)) between 3 and 120),
  standfirst    text check (standfirst is null or length(standfirst) <= 400),
  place_label   text check (place_label is null or length(place_label) <= 80),

  status        public.social_status not null default 'LIVE',
  hold_reason   text,
  hidden_by     uuid references auth.users (id) on delete set null,

  like_count    integer not null default 0 check (like_count    >= 0),
  save_count    integer not null default 0 check (save_count    >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  view_count    integer not null default 0 check (view_count    >= 0),

  created_at    timestamptz not null default now(),
  edited_at     timestamptz,
  removed_at    timestamptz
);

comment on table public.stories is
  'A story: one picture, a headline, a standfirst and a place. Its own object, read full screen, not a row in the feed.';
comment on column public.stories.image_path is
  'Object path in the social-media bucket. NOT NULL because the picture is the story; there is no story without it.';

create index if not exists stories_author_idx  on public.stories (author_id, created_at desc);
create index if not exists stories_area_idx    on public.stories (area_id, created_at desc) where status = 'LIVE';
create index if not exists stories_live_idx    on public.stories (created_at desc) where status = 'LIVE';
create index if not exists stories_listing_idx on public.stories (listing_id);
create index if not exists stories_hidden_idx  on public.stories (hidden_by);

create table if not exists public.story_reactions (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  mark       public.post_mark not null,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id, mark)
);

comment on table public.story_reactions is
  'LIKE is a signal to the author. SAVE is a private act of filing and is never announced.';

create index if not exists story_reactions_user_idx on public.story_reactions (user_id, mark, created_at desc);

create table if not exists public.story_comments (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.stories (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  parent_id   uuid references public.story_comments (id) on delete cascade,
  body        text not null check (length(btrim(body)) between 1 and 1000),
  status      public.social_status not null default 'LIVE',
  hold_reason text,
  like_count  integer not null default 0 check (like_count >= 0),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  constraint story_comments_not_self_parent_chk check (parent_id is distinct from id)
);

comment on table public.story_comments is
  'Comments on a story. One level of nesting is what the design draws, and the guard enforces it: a reply to a reply attaches to the same parent rather than growing a third rail nothing can render.';

create index if not exists story_comments_story_idx  on public.story_comments (story_id, created_at);
create index if not exists story_comments_parent_idx on public.story_comments (parent_id);
create index if not exists story_comments_author_idx on public.story_comments (author_id, created_at desc);

create table if not exists public.story_comment_reactions (
  comment_id uuid not null references public.story_comments (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists story_comment_reactions_user_idx on public.story_comment_reactions (user_id);

/*
 * Views, counted the same way posts count them: a salted daily bucket rather
 * than a viewer id, so "who read this" is a question the table cannot answer
 * even to us, while "how many read it" stays exact per day.
 */
create table if not exists public.story_views (
  story_id      uuid not null references public.stories (id) on delete cascade,
  viewer_bucket text not null,
  seen_on       date not null default (now() at time zone 'Africa/Lagos')::date,
  primary key (story_id, viewer_bucket, seen_on)
);
