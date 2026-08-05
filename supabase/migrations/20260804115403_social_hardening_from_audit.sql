-- Fixes from the social layer audit. Four blockers and five serious findings.
--
-- BLOCKER 1. Every post the scanner caught was REFUSED, not held.
--
-- private.scan_post sets status = 'HELD' in a BEFORE INSERT trigger.
-- posts_insert_self demanded status = 'LIVE' in its WITH CHECK. Postgres
-- evaluates WITH CHECK AFTER BEFORE triggers have run, so the row the policy
-- saw was already HELD and it was rejected with 42501. The whole hold path was
-- dead, and because the insert rolled back so did the risk_alerts row: a post
-- containing an account number produced an error and no trace anywhere.
--
-- My own probes did not catch this because they ran through the service role,
-- where RLS does not apply at all. A probe that cannot fail on a policy cannot
-- test a policy. private.probe_as at the end of this file is what makes an
-- honest probe possible from here.

drop policy posts_insert_self on public.posts;

create policy posts_insert_self
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and author_kind = 'USER'
    -- LIVE is what a client asks for. HELD is what the scanner may turn that
    -- into before this check runs. REMOVED is neither of theirs.
    and status in ('LIVE', 'HELD')
    and hidden_by is null
    and removed_at is null
    and edited_at is null
    and reply_count = 0 and like_count = 0 and repost_count = 0 and view_count = 0
    and (
      area_id is null
      or exists (select 1 from public.areas a where a.id = area_id and a.status = 'ACTIVE')
    )
  );

-- SERIOUS. posts_update_own guarded WHO and nothing else, so an author could
-- rewrite all four counters, move a post into a paused area past the ACTIVE
-- check, re-parent it under somebody else's thread (place_post is BEFORE INSERT
-- only), set or omit their own edited_at, and lift a hold the scanner had just
-- applied. RLS WITH CHECK can only see the new row, so the fix is a trigger
-- that restores every column an author does not own.

create or replace function private.guard_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id             := old.id;
  new.author_id      := old.author_id;
  new.author_kind    := old.author_kind;
  new.parent_id      := old.parent_id;
  new.root_id        := old.root_id;
  new.depth          := old.depth;
  new.area_id        := old.area_id;
  new.kind           := old.kind;
  new.listing_id     := old.listing_id;
  new.quoted_post_id := old.quoted_post_id;
  new.created_at     := old.created_at;

  new.reply_count  := old.reply_count;
  new.like_count   := old.like_count;
  new.repost_count := old.repost_count;
  new.view_count   := old.view_count;

  if not (private.has_role((select auth.uid()), 'admin')
          or private.has_role((select auth.uid()), 'super_admin')) then
    if old.status = 'HELD' then new.status := old.status; end if;
    if old.status = 'REMOVED' then
      new.status := old.status;
      new.body := null;
    end if;
    new.hidden_by   := old.hidden_by;
    new.hold_reason := old.hold_reason;
  end if;

  if new.body is distinct from old.body and new.status <> 'REMOVED' then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;

create trigger posts_zz_guard_update
  before update on public.posts
  for each row execute function private.guard_post_update();

-- SERIOUS. The three public profile counts were the owner's to type, and
-- social_profiles_update_self had no WITH CHECK on the live database at all.

drop policy if exists social_profiles_update_self on public.social_profiles;

create policy social_profiles_update_self
  on public.social_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Without this a held bio was held for ever: only its owner could write the row
-- and the owner cannot clear their own hold.
create policy social_profiles_admin_write
  on public.social_profiles for all
  using (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
           or private.has_role((select auth.uid()), 'super_admin'));

create or replace function private.guard_social_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id         := old.user_id;
  new.follower_count  := old.follower_count;
  new.following_count := old.following_count;
  new.post_count      := old.post_count;
  new.created_at      := old.created_at;

  if not (private.has_role((select auth.uid()), 'admin')
          or private.has_role((select auth.uid()), 'super_admin')) then
    if old.bio_status = 'HELD' and new.bio is not distinct from old.bio
       and new.link is not distinct from old.link then
      new.bio_status := old.bio_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger social_profiles_zzz_guard
  before update on public.social_profiles
  for each row execute function private.guard_social_profile_update();

-- SERIOUS. post_count only ever went up: the tree counter fired on INSERT and
-- DELETE, but removing a post is a status change, not a delete.

create or replace function private.bump_post_status_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'REMOVED' and new.status = 'REMOVED' then
    if new.parent_id is not null then
      update public.posts set reply_count = greatest(reply_count - 1, 0) where id = new.parent_id;
    elsif new.area_id is not null then
      update public.areas set post_count = greatest(post_count - 1, 0) where id = new.area_id;
    end if;
    if new.author_id is not null then
      update public.social_profiles set post_count = greatest(post_count - 1, 0) where user_id = new.author_id;
    end if;
  elsif old.status = 'REMOVED' and new.status <> 'REMOVED' then
    if new.parent_id is not null then
      update public.posts set reply_count = reply_count + 1 where id = new.parent_id;
    elsif new.area_id is not null then
      update public.areas set post_count = post_count + 1 where id = new.area_id;
    end if;
    if new.author_id is not null then
      update public.social_profiles set post_count = post_count + 1 where user_id = new.author_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger posts_status_counters
  after update of status on public.posts
  for each row execute function private.bump_post_status_counters();

-- SERIOUS. follows and social_profiles_select ignored blocks entirely, so a
-- blocked person's profile stayed readable and followable. private.blocked_with
-- lives in a schema PostgREST does not expose, so the answer is used inside the
-- policies rather than handed to application code.

drop policy social_profiles_select on public.social_profiles;

create policy social_profiles_select
  on public.social_profiles for select
  using (not private.blocked_with(user_id));

drop policy follows_insert_self on public.follows;

create policy follows_insert_self
  on public.follows for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and exists (select 1 from public.social_profiles p where p.user_id = followee_id)
    and not private.blocked_with(followee_id)
  );

-- MINOR. Two foreign keys with no covering index. The feed index on
-- posts(area_id, created_at) is PARTIAL, so it does not cover an area delete.

create index if not exists posts_area_idx on public.posts (area_id);
create index if not exists area_mod_apps_area_idx on public.area_moderator_applications (area_id);

-- MINOR. Three private helpers still had EXECUTE granted to PUBLIC.

revoke execute on function private.view_bucket(text)             from public, anon, authenticated;
revoke execute on function private.bot_spend_this_month()         from public, anon, authenticated;
revoke execute on function private.guard_post_update()            from public, anon, authenticated;
revoke execute on function private.guard_social_profile_update()  from public, anon, authenticated;

-- The probe helper. Everything above exists because a probe running through the
-- service role cannot fail on a policy, so it cannot test one. This lets a probe
-- become a specific signed-in person for the rest of its transaction.
--
-- It sets the JWT claim only: Postgres forbids changing `role` inside a security
-- definer function, so the caller does `set local role authenticated` itself.

create or replace function private.probe_as(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
end;
$$;

comment on function private.probe_as(uuid) is
  'Testing only. Sets the JWT claim so a probe runs as a real user under RLS; the caller then does `set local role authenticated` itself. Never called from application code.';

revoke execute on function private.probe_as(uuid) from public, anon, authenticated;
