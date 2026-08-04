-- Two defects the audit hardening introduced, both found by probing rather than
-- by reading. Neither would have shown up in a screenshot.
--
-- 1. EVERY SOCIAL COUNTER WAS FROZEN AT ZERO.
--
--    `private.guard_post_update` and `private.guard_social_profile_update` pin
--    the counter columns back to their old values on every UPDATE, so that a
--    client cannot type their own follower count. They were written to constrain
--    a CLIENT. They ran on every update from anybody, including our own counter
--    triggers, which maintain those columns by doing exactly the UPDATE the
--    guards revert.
--
--    Measured on the live database before this migration, with real rows:
--
--      follower_count after one follow    0   (expect 1)
--      following_count after one follow   0   (expect 1)
--      post_count after one post          0   (expect 1)
--      reply_count after one reply        0   (expect 1)
--      like_count after one like          0   (expect 1)
--      repost_count after one repost      0   (expect 1)
--      areas.post_count after one post    1   (correct: areas has no guard)
--
--    Six of the seven numbers the feed and the profile show would have read zero
--    for ever, no matter what anybody did. The one that worked is the one on the
--    only counted table with no guard on it, which is the whole proof.
--
--    The fix is a discriminator, not a loosening. `pg_trigger_depth()` is 1 for
--    a statement a client issued and greater than 1 for anything running inside
--    another trigger, which is precisely what these guards mean by "not the
--    client". Depth one keeps every pin it ever had; the database's own
--    bookkeeping is let through. Every path above depth one is one of our own
--    security definer functions writing one named column, so nothing a client
--    can reach is unguarded now that was guarded before.
--
-- 2. NOBODY WHO HAD EVER POSTED COULD DELETE THEIR ACCOUNT.
--
--    `posts.author_id` is `on delete set null`, so deleting the user should
--    leave the words and drop the name. The referential action is an UPDATE, and
--    `guard_post_update` pinned `author_id` straight back to the id that was
--    being deleted, so the delete failed on its own foreign key:
--
--      deleting an account that had posted: FAILED 23503
--      insert or update on table "posts" violates foreign key constraint
--      "posts_author_id_fkey"
--
--    The depth fix above clears the pin, and then the row hits
--    `posts_author_kind_chk`, which insists a USER post has an author. That
--    constraint is right about a post being written and wrong about a post being
--    orphaned, so it is relaxed to allow a USER post with no author, which is
--    what a post by a departed account IS. It stays a USER post rather than
--    becoming a SYSTEM one, because a person wrote it and rewriting that would
--    be a lie about who spoke.
--
--    Nothing opens up. `posts_insert_self` requires `author_id = auth.uid()`,
--    which no client can satisfy with null, so the insert path is unchanged.

-- ---------------------------------------------------------------------------

create or replace function private.guard_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
   * Depth one is a client statement. Anything deeper is the database
   * maintaining itself: a counter trigger, or a referential action clearing the
   * author of somebody who has left. Guarding those was never the intent and
   * doing it froze every counter on the table.
   */
  if pg_trigger_depth() > 1 then return new; end if;

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

create or replace function private.guard_social_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;

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

revoke execute on function private.guard_post_update()           from public, anon, authenticated;
revoke execute on function private.guard_social_profile_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------

alter table public.posts drop constraint if exists posts_author_kind_chk;

alter table public.posts add constraint posts_author_kind_chk check (
  /* A person wrote it. author_id goes null when they delete their account and
     the words stay, unowned. */
  (author_kind = 'USER')
  /* The assistant and the platform never have one. */
  or (author_kind in ('BOT', 'SYSTEM') and author_id is null)
);

comment on constraint posts_author_kind_chk on public.posts is
  'A BOT or SYSTEM post never has an author. A USER post may lose one, because deleting an account sets author_id null and the post survives without a name on it.';
