-- A host can answer a review, in public, once.
--
-- Reviews became writable on 2026-08-04 and are final by design: there is no
-- update policy on public.reviews, because a guest editing a passed review is
-- the hole reviews_final_and_scan_on_update closed. A host's answer is a
-- different object, not an edit, so it lives in its own table and cannot touch
-- a single character of what the guest wrote.
--
-- One answer per review, so the primary key IS the review. There is no second
-- reply, no thread, and no last word to fight over: the host may correct their
-- own answer or withdraw it, and that is the whole surface.
--
-- Ownership is never taken from the client. A BEFORE trigger stamps agent_id
-- from the caller's own agent row, so the insert payload is review_id and body
-- and nothing else can be asserted. The policies then only have to answer one
-- question, which is whether this caller owns the listing being reviewed.

create table if not exists public.review_responses (
  review_id  uuid primary key references public.reviews(id) on delete cascade,
  agent_id   uuid not null references public.agents(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_responses_body_chk
    check (length(btrim(body)) between 1 and 1200)
);

comment on table public.review_responses is
  'One public answer from the host to a guest review. The review itself stays final.';

create index if not exists review_responses_agent_idx on public.review_responses (agent_id);

/* ------------------------------------------------------------- helpers ----
   Security definer, because a policy expression is still subject to the RLS of
   every table it reads. Without these, an agent whose listing is PAUSED could
   not see the join rows that prove they own it, and their own answer would
   vanish from their own console. */

create or replace function private.owns_review_listing(p_review uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews r
    join public.listings l on l.id = r.listing_id
    join public.agents   a on a.id = l.agent_id
    where r.id = p_review and a.user_id = (select auth.uid())
  );
$$;

comment on function private.owns_review_listing(uuid) is
  'True when the caller is the agent whose listing the review is about.';

create or replace function private.review_response_visible(p_review uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews r
    join public.listings l on l.id = r.listing_id
    where r.id = p_review
      and (
        l.status = 'PUBLISHED'
        or r.author_id = (select auth.uid())
        or private.owns_review_listing(p_review)
        or private.has_role((select auth.uid()), 'admin')
        or private.has_role((select auth.uid()), 'super_admin')
      )
  );
$$;

comment on function private.review_response_visible(uuid) is
  'Mirrors reviews_select: an answer is readable wherever its review is.';

-- anon needs this one to render a listing page. It discloses nothing but a
-- boolean about a row anon can already read, and deliberately NOT the
-- ownership helper, which answers a question about somebody else's identity.
grant execute on function private.review_response_visible(uuid) to anon, authenticated;
grant execute on function private.owns_review_listing(uuid) to authenticated;

/* ------------------------------------------------------------ ownership --- */

create or replace function private.stamp_review_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_agent uuid;
begin
  select a.id into caller_agent
  from public.agents a
  where a.user_id = auth.uid();

  if caller_agent is null then
    raise exception 'Only an agent can answer a review'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.agent_id := caller_agent;
    new.created_at := now();
  else
    -- The answer belongs to whoever wrote it, and to the review it answers.
    -- Neither can be moved by a PATCH.
    new.agent_id := old.agent_id;
    new.review_id := old.review_id;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.stamp_review_response() from public, anon, authenticated;

drop trigger if exists review_responses_stamp on public.review_responses;
create trigger review_responses_stamp
  before insert or update on public.review_responses
  for each row execute function private.stamp_review_response();

/* ----------------------------------------------------------- the scanner --
   Same reasoning as scan_review: a public text surface written by one side of
   a marketplace gets scanned for account numbers and payment steering, on
   insert and on update, and only when the text actually changed. */

create or replace function private.scan_review_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then
      return new;
    end if;
  end if;

  if new.body ~ '\d{10}' then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Account number in a host reply',
      'A host reply to a review carries a 10 digit run: ' || substring(new.body from '\d{10}'),
      'review_response',
      new.review_id::text
    );
  end if;

  if new.body ~* keyword_pattern then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'medium',
      'Payment language in a host reply',
      'A host reply to a review carries payment language: ' || substring(lower(new.body) from keyword_pattern),
      'review_response',
      new.review_id::text
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.scan_review_response() from public, anon, authenticated;

drop trigger if exists review_responses_scan on public.review_responses;
create trigger review_responses_scan
  after insert or update on public.review_responses
  for each row execute function private.scan_review_response();

/* ------------------------------------------------------ the notification --
   The guest who wrote the review hears about the answer. Fan-out is a trigger,
   like every other notification on this platform, so no application code can
   forget it. */

create or replace function private.notify_review_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_user    uuid;
  listing_id    uuid;
  listing_title text;
begin
  select r.author_id, l.id, l.title
    into guest_user, listing_id, listing_title
  from public.reviews r
  join public.listings l on l.id = r.listing_id
  where r.id = new.review_id;

  if guest_user is not null then
    perform private.notify(
      guest_user,
      'listing',
      'The host answered your review',
      'Your review of ' || coalesce(listing_title, 'a stay') || ' has a reply.',
      '/listing/' || listing_id::text
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_review_response() from public, anon, authenticated;

drop trigger if exists review_responses_notify on public.review_responses;
create trigger review_responses_notify
  after insert on public.review_responses
  for each row execute function private.notify_review_response();

/* ------------------------------------------------------------------ RLS --- */

alter table public.review_responses enable row level security;

drop policy if exists review_responses_select on public.review_responses;
create policy review_responses_select on public.review_responses
  for select using (private.review_response_visible(review_id));

drop policy if exists review_responses_insert_own on public.review_responses;
create policy review_responses_insert_own on public.review_responses
  for insert with check (private.owns_review_listing(review_id));

drop policy if exists review_responses_update_own on public.review_responses;
create policy review_responses_update_own on public.review_responses
  for update using (private.owns_review_listing(review_id))
  with check (private.owns_review_listing(review_id));

drop policy if exists review_responses_delete_own on public.review_responses;
create policy review_responses_delete_own on public.review_responses
  for delete using (private.owns_review_listing(review_id));

revoke all on public.review_responses from anon, authenticated;
grant select on public.review_responses to anon;
grant select, insert, update, delete on public.review_responses to authenticated;

/* --------------------------------------------- the host's own reviews ----
   reviews_select published the review to the world but not to the host of a
   listing that is not currently PUBLISHED, so a paused listing hid its own
   reviews from the only person who could answer them. */

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select using (
    (exists (
      select 1 from public.listings l
      where l.id = reviews.listing_id and l.status = 'PUBLISHED'
    ))
    or (select auth.uid()) = author_id
    or private.owns_listing(reviews.listing_id)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

/* --------------------------------------------- point the host somewhere ---
   The new-review notification sent the host to the public listing page, which
   is the one place they cannot do anything about it. /agent/reviews is where
   they can answer. */

create or replace function private.notify_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_user     uuid;
  listing_title text;
begin
  select a.user_id, l.title
    into host_user, listing_title
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;

  perform private.notify(
    host_user,
    'listing',
    'New review',
    'A guest rated ' || coalesce(listing_title, 'your listing') || ' ' || new.rating || ' out of 5.',
    '/agent/reviews'
  );

  return new;
end;
$$;
