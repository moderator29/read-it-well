-- Reviews write path.
--
-- public.reviews has had an insert policy, a unique booking_id and two readers
-- since the engagement migration, and no writer at all. This migration makes the
-- database the authority on who may review what, gives every review a publicly
-- readable author label that the client cannot forge, tells the host, and puts
-- review text through the same safety classification message bodies already get.
--
-- Three deliberate tightenings over the original insert policy:
--   1. the booking must be CONFIRMED, so an abandoned request cannot be reviewed;
--   2. the stay must have checked out in Lagos time, so a review is always
--      after the fact rather than before it;
--   3. the review's listing must be the booking's listing, which the original
--      policy never checked, so a guest could have attached a review to a
--      property they never booked.

-- A publicly readable, shortened reviewer name. public.profiles is strictly
-- private (own row or admin), so a listing page could otherwise never name a
-- reviewer. The column is written by a definer trigger, never by the client,
-- so it cannot be forged and no profile row is exposed.
alter table public.reviews
  add column if not exists author_label text;

comment on column public.reviews.author_label is
  'Shortened public reviewer name, set by private.label_review. Never client supplied.';

-- Only a stay that actually happened, by the guest who took it, on the listing
-- it was for.
drop policy if exists reviews_insert_own on public.reviews;

create policy reviews_insert_own
  on public.reviews for insert
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.bookings b
      where b.id         = reviews.booking_id
        and b.guest_id   = (select auth.uid())
        and b.listing_id = reviews.listing_id
        and b.status     = 'CONFIRMED'
        and b.check_out <= (now() at time zone 'Africa/Lagos')::date
    )
  );

-- The reviewer label. First name plus a surname initial, a nickname when one is
-- set, and an honest fallback otherwise. Scalar variables rather than a record,
-- so an author with no profile row cannot raise.
create function private.label_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first   text;
  v_surname text;
  v_nick    text;
  v_display text;
  v_label   text;
begin
  select first_name, surname, nickname, display_name
    into v_first, v_surname, v_nick, v_display
  from public.profiles
  where id = new.author_id;

  v_label := nullif(btrim(coalesce(v_nick, '')), '');

  if v_label is null then
    v_label := nullif(btrim(coalesce(v_first, '')), '');
    if v_label is not null and nullif(btrim(coalesce(v_surname, '')), '') is not null then
      v_label := v_label || ' ' || upper(left(btrim(v_surname), 1)) || '.';
    end if;
  end if;

  if v_label is null then
    v_label := nullif(btrim(coalesce(v_display, '')), '');
  end if;

  new.author_label := coalesce(v_label, 'RentMe guest');
  return new;
end;
$$;

revoke execute on function private.label_review() from public, anon, authenticated;

create trigger reviews_label_before_insert
  before insert on public.reviews
  for each row execute function private.label_review();

-- The host hears about it. Kind 'listing' is an existing enum value, and the
-- href points at the listing page, which renders the review today, rather than
-- at a route that is still a placeholder.
create function private.notify_review()
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
    '/listing/' || new.listing_id::text
  );

  return new;
end;
$$;

revoke execute on function private.notify_review() from public, anon, authenticated;

create trigger reviews_notify_after_insert
  after insert on public.reviews
  for each row execute function private.notify_review();

-- Review bodies are public text on a published listing, so they get the same
-- classification message bodies get. risk_alerts.entity_type is already text, so
-- no enum work is needed. Clients have no insert policy on risk_alerts at all,
-- which is why this runs as definer.
create function private.scan_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
begin
  if new.body is null then
    return new;
  end if;

  if new.body ~ '\d{10}' then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Account number in a review',
      'A review body carries a 10 digit run: ' || substring(new.body from '\d{10}'),
      'review',
      new.id::text
    );
  end if;

  if new.body ~* keyword_pattern then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'medium',
      'Payment language in a review',
      'A review body carries payment language: ' || substring(lower(new.body) from keyword_pattern),
      'review',
      new.id::text
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.scan_review() from public, anon, authenticated;

create trigger reviews_scan_after_insert
  after insert on public.reviews
  for each row execute function private.scan_review();
