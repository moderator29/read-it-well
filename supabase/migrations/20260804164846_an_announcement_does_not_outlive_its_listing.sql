-- Found by cleaning up after a probe, which is a good reason to clean up.
--
-- `posts.listing_id` is `on delete set null`, so deleting a listing left its
-- SYSTEM announcement behind: "A new apartment is now open in Yaba", pointing
-- at nothing. Four of them were sitting in the feed. A card the platform wrote
-- itself, about a thing that no longer exists, that goes nowhere when tapped,
-- is the exact dead end the rules forbid, and it is worse than a person's
-- because nobody can delete it.
--
-- The fix is not `on delete cascade` on the column. That would take a person's
-- SHOWCASE post with the listing too, and their words are theirs: a showcase
-- whose listing is gone is still something somebody chose to say, and it
-- becomes an ordinary post rather than disappearing.
--
-- So only the platform's own words are swept, and only its own.

create or replace function private.retire_listing_announcement()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.posts
   where listing_id = old.id and author_kind = 'SYSTEM';
  return old;
end;
$fn$;

revoke execute on function private.retire_listing_announcement() from public, anon, authenticated;

drop trigger if exists listings_retire_announcement on public.listings;

/* BEFORE DELETE, so the rows are gone before the foreign key sets them null and
   loses the only handle we have on them. */
create trigger listings_retire_announcement
  before delete on public.listings
  for each row execute function private.retire_listing_announcement();

/* The four already orphaned, identified by a null listing_id plus the payload
   only the announcement trigger writes. */
delete from public.posts
 where author_kind = 'SYSTEM'
   and listing_id is null
   and payload ->> 'reason' = 'listing_published';
