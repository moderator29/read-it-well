-- Owner ruling, 2026-08-04: the social layer is a normal social layer. People
-- connect with people. A profile carries Followers, Following and Posts, not a
-- private standing score, and follower counts are public.
--
-- This reverses the earlier decision in docs/SOCIAL_DESIGN.md section 5.3 to cut
-- the follow graph. That call was made on the reasoning that standing should
-- come from usefulness rather than audience size. The owner wants the ordinary,
-- legible thing, and they are right that a place-only subscription model gives
-- people no way to keep up with a person they trust.

alter table public.social_profiles drop column like_count;
alter table public.social_profiles drop column correct_count;
alter table public.social_profiles drop column repost_count;

alter table public.social_profiles
  add column follower_count  integer not null default 0 check (follower_count >= 0),
  add column following_count integer not null default 0 check (following_count >= 0),
  add column post_count      integer not null default 0 check (post_count >= 0),
  add column cover_path      text;

comment on column public.social_profiles.cover_path is
  'Object path in the public social-covers bucket. A cover is public by definition.';

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self_chk check (follower_id <> followee_id)
);

comment on table public.follows is
  'Who follows whom. Counts are public, which is the ordinary expectation and what the owner asked for.';

-- The primary key covers follower_id. Following direction needs its own index or
-- every "who follows me" read is a sequential scan.
create index follows_followee_idx on public.follows (followee_id, created_at desc);

create function private.bump_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.social_profiles set following_count = following_count + 1
      where user_id = new.follower_id;
    update public.social_profiles set follower_count = follower_count + 1
      where user_id = new.followee_id;
  elsif tg_op = 'DELETE' then
    update public.social_profiles set following_count = greatest(following_count - 1, 0)
      where user_id = old.follower_id;
    update public.social_profiles set follower_count = greatest(follower_count - 1, 0)
      where user_id = old.followee_id;
  end if;
  return null;
end;
$$;

create trigger follows_count
  after insert or delete on public.follows
  for each row execute function private.bump_follow_counts();

alter table public.follows enable row level security;

-- Public, because a follower count nobody can verify is a number nobody trusts.
create policy follows_select
  on public.follows for select
  using (true);

-- You follow as yourself, and only someone who has claimed a handle can be
-- followed, so a follow always points at a real social identity.
create policy follows_insert_self
  on public.follows for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and exists (select 1 from public.social_profiles p where p.user_id = followee_id)
  );

create policy follows_delete_self
  on public.follows for delete
  using (follower_id = (select auth.uid()));

-- No update policy. A follow is created or it is removed; there is nothing to edit.
