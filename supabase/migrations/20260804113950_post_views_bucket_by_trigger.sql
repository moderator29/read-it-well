-- The viewer bucket is computed by the database, never sent by a client.
--
-- The first cut had the action ask for a bucket and then insert it, which is
-- wrong twice over. private.view_bucket lives in the private schema and is not
-- reachable by RPC at all, so the call would have failed at runtime while the
-- code looked correct. And exposing a wrapper to fix that would have handed
-- clients a way to mint buckets for arbitrary subjects, which is precisely the
-- linkage the salted hash exists to prevent.
--
-- Now the client inserts a post id and nothing else. A BEFORE INSERT trigger
-- fills the bucket from auth.uid(), so it cannot be chosen, cannot be forged,
-- and cannot be replayed for somebody else.

create or replace function private.fill_view_bucket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  subject text;
begin
  -- Signed out readers all share one bucket per day. That undercounts, and it
  -- is the right trade: the alternative is a per-device identifier, which is a
  -- tracking record built to make a number look bigger.
  subject := coalesce('user:' || (select auth.uid())::text, 'anon');
  new.viewer_bucket := private.view_bucket(subject);
  new.seen_on := (now() at time zone 'Africa/Lagos')::date;
  return new;
end;
$$;

create trigger post_views_fill_bucket
  before insert on public.post_views
  for each row execute function private.fill_view_bucket();

comment on table public.post_views is
  'A view is a salted daily hash of the viewer, computed by trigger from auth.uid() and never supplied by a client. The salt rotates at midnight Lagos and the previous day is deleted, so the record cannot be walked back to a person.';
