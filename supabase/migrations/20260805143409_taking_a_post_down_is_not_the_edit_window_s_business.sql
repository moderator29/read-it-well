/*
 * Taking a post down is not the edit window's business.
 *
 * `posts_update_own` read
 *
 *   using (author_id = uid and status = 'LIVE'
 *          and created_at > now() - '00:15:00')
 *
 * and removal in this product is an UPDATE, not a DELETE, because
 * `posts_parent_id_fkey` cascades and a real delete would take other people's
 * replies with it. So the fifteen minutes meant for editing was silently also
 * the only fifteen minutes in which anybody could take down their own words.
 * After that the card still offered "Delete this post" and the copy told the
 * person to write to support and ask.
 *
 * Both planning documents put the window on the edit alone: SOCIAL_TODO lists
 * `editGist (15 minute window)` and `removeGist` with none, and SOCIAL_BUILD
 * says the same. The window on removal is what merging the two verbs into one
 * SQL statement cost, not a decision anybody made.
 *
 * It matters more now than it did last week, because a post can carry a
 * photograph since `a_picture_on_a_post_has_one_shape`, and in this product
 * that photograph is usually of the street somebody lives on. "You can put a
 * picture of your gate up, and after fifteen minutes only support can take it
 * down" is not a rule this platform should have.
 *
 * Three changes, and the first two are the same shape the rest of this layer
 * already uses: the policy says WHO may write, the guard trigger says WHAT a
 * write may change.
 *
 * 1. The window moves from USING to WITH CHECK, where it can see the row that
 *    is being written and therefore tell an edit from a removal. USING now says
 *    only that a live post belongs to the person writing. WITH CHECK admits the
 *    write if the post is still inside its fifteen minutes OR if what is being
 *    written is a tombstone: REMOVED with no words left. Nothing else gets
 *    through, so this widens removal without widening editing by a second.
 *
 *    WITH CHECK runs AFTER the BEFORE triggers, which is what makes this safe:
 *    `guard_post_update` has already pinned `created_at` back to the stored
 *    value, so the age in the check is the post's real age and not one the
 *    client sent. It is also why the scanner still works on an edit inside the
 *    window: `posts_scan` may have moved the row to HELD by then, and the first
 *    branch admits it on age alone.
 *
 *    One consequence for the application: a refused edit now RAISES 42501
 *    rather than quietly returning no rows, so `editPost` reads that code
 *    before the shared mapper, which treats 42501 on this table as "you are
 *    not in this place".
 *
 * 2. `removed_at` stops being the client's to type. It is now derived from the
 *    status transition itself: set when a post becomes REMOVED, kept while it
 *    stays REMOVED, and cleared if an admin ever puts one back. The action
 *    still sends it, and it is now a courtesy rather than the record.
 *
 * 3. A post that goes down takes its pictures with it. `post_media` rows are
 *    deleted when the status reaches REMOVED, which is what makes the object in
 *    the bucket unreadable by everybody: after `a_picture_on_a_post_has_one_
 *    shape`, `private.social_media_access` refuses any object no row names. The
 *    read layer already dropped the body of a removed post; without this it
 *    kept every picture on it, and the author of a post an admin removed could
 *    still open the photograph.
 *
 *    SECURITY DEFINER on purpose. `post_media_delete_own` lets an author delete
 *    their own rows and nobody else's, so an admin removing somebody's post
 *    under `posts_admin_write` would otherwise leave the pictures behind, which
 *    is the case that most needs them gone.
 *
 * A HELD post still cannot be taken down by its author, and that is left as it
 * was rather than overlooked: USING requires LIVE, nobody but its author and a
 * moderator can see a held post, and it is mid-review. `removePost` now says
 * that instead of blaming a clock.
 *
 * What this deliberately does NOT do: it does not delete the object from the
 * bucket. Removing a `storage.objects` row leaves the bytes behind it
 * untracked, which is worse than an object no policy will ever sign. The
 * picture becomes unreadable the moment the row goes; reclaiming the bytes is a
 * sweep somebody can write against the same rule.
 *
 * Probed through the real policy path, as `authenticated` after
 * `private.probe_as`, in a transaction that was rolled back. The first run of
 * this probe disagreed with the migration and was right to: the backdating step
 * had been swallowed by this very guard, which pins `created_at` for everybody
 * including the owner, so the trigger had to be disabled inside the transaction
 * to age a post at all. With a post genuinely three hours old:
 *
 *   the old post really is old                03:00:00
 *   edit inside the window                    changed
 *   edit after three hours                    refused 42501
 *   make it young again                       refused 42501
 *   removed_at without removing               refused 42501
 *   take it down and keep the words           refused 42501
 *   take it down after three hours            taken down
 *   the old post now reads                    REMOVED, body null, removed_at set
 *   its pictures                              0
 */

drop policy if exists posts_update_own on public.posts;

create policy posts_update_own
  on public.posts
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'LIVE'
  )
  with check (
    author_id = (select auth.uid())
    and (
      created_at > now() - interval '15 minutes'
      or (status = 'REMOVED' and body is null)
    )
  );

create or replace function private.guard_post_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
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

  /* When it went down, from the transition rather than from the caller. */
  if new.status = 'REMOVED' then
    if old.status is distinct from 'REMOVED' then
      new.removed_at := now();
    else
      new.removed_at := old.removed_at;
    end if;
  else
    new.removed_at := null;
  end if;

  return new;
end;
$fn$;

create or replace function private.drop_post_media_on_remove()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status = 'REMOVED' and old.status is distinct from 'REMOVED' then
    delete from public.post_media where post_id = new.id;
  end if;
  return null;
end;
$fn$;

revoke execute on function private.drop_post_media_on_remove() from public;

create or replace trigger posts_drop_media_on_remove
  after update of status on public.posts
  for each row execute function private.drop_post_media_on_remove();
