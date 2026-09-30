-- M1: B11 (NOTIFICATIONS THAT SAY WHAT NEEDS YOU) AND B13 (CHANGES ON THINGS
-- YOU SAVED). 30 September 2026.
--
-- Applied 30 September 2026 with the founder's approval. Additive only: one nullable column on
-- public.notifications (with a column grant and a stamping trigger), one new
-- table with RLS on (public.listing_changes), two trigger functions and three
-- triggers. Drops nothing, rewrites no policy, touches no payment table.
-- Safe to run twice.
--
-- B11. `notifications` has a kind and no severity, so "confirm who you are
-- letting for" and "somebody liked your post" weigh the same. This adds
--   * public.notifications.severity text ('action' | 'update' | 'fyi'), null
--     for a row written before this (the app reads its own table then);
--   * public.notification_severity(kind, title, href): THE SEVERITY TABLE, a
--     mirror of apps/web/src/lib/notify/severity.ts (keep the two in step;
--     the founder signs the table off in docs/recs/RECS_B_2026-09-30.md);
--   * a BEFORE INSERT trigger that stamps it on every new row, and a one-time
--     backfill of existing rows;
--   * `grant select (severity)` to authenticated (the table's grants are per
--     column; read_at stays the only column a client may update).
--
-- B13. A save is a silent bookmark. This adds
--   * public.listing_changes: one row per price change, availability change
--     or new viewing window on a listing. RLS on; a person may read the rows
--     of listings THEY saved (saved_items) and nothing else; nobody writes
--     through the API (the triggers are SECURITY DEFINER);
--   * private.record_listing_change(): AFTER UPDATE on listings. When the
--     lead price moves (rent_amount_minor on a rental, sale_price_minor on a
--     sale, rate_minor on a stay) or the listing stops or starts being
--     available (status leaves or returns to PUBLISHED, or closed_at is set),
--     it records the change and tells each person who saved it (never the
--     lister, never on an example listing) through private.notify, kind
--     'listing', in-app. The href carries `?change=price-down`,
--     `price-up` or `gone` so the push drain can apply the "price drops on
--     saved places" setting (default on);
--   * private.record_viewing_windows(): AFTER INSERT on viewing_windows (an
--     active window) records 'viewing_windows' for each of its listings. No
--     notification: the Saved card says it.
--
-- APP PATHS THAT GO LIVE AFTER THIS IS APPLIED:
--   * apps/web/src/lib/saved/changes.ts `readSavedChanges` starts returning
--     rows (until then the relation is missing and it returns none, so Saved
--     shows no change lines; the phone's own shelf check, ShelfSync, still
--     reports price moves it can see).
--   * New notifications arrive stamped with severity; the app's own table
--     (lib/notify/severity.ts) answers for older rows either way.
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

-- ------------------------------------------------------------------ B11

alter table public.notifications add column if not exists severity text;

do $c$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'notifications_severity_check'
       and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_severity_check
      check (severity is null or severity in ('action', 'update', 'fyi'));
  end if;
end
$c$;

comment on column public.notifications.severity is
  'B11: action (only you can move it), update (a record changed), fyi (never wakes the phone). Stamped by notifications_set_severity from public.notification_severity; mirrors apps/web/src/lib/notify/severity.ts.';

create or replace function public.notification_severity(
  n_kind  public.notification_kind,
  n_title text,
  n_href  text
)
returns text
language sql
immutable
set search_path = ''
as $f$
  select case
    when coalesce(n_href, '') ~ '^/settings/devices/alert' then 'action'
    when n_kind = 'message' and btrim(n_title) ~* '^new message' then 'action'
    when n_title ~* 'confirm who you are letting for' then 'action'
    when btrim(n_title) ~* '^(new booking request|table requested)' then 'action'
    when n_title ~* 'needs more information' then 'action'
    when n_title ~* 'could not complete' then 'action'
    when n_title ~* 'mandate is running out' then 'action'
    when n_title ~* 'invited to share a move-in' then 'action'
    when n_title ~* 'held payment is paused' then 'action'
    when btrim(n_title) ~* '^a new support ticket' then 'action'
    when n_kind = 'social' and n_title ~* '(liked|reposted|new follower|you earned)' then 'fyi'
    when btrim(n_title) ~* '( is live$| is being checked$)' then 'fyi'
    when btrim(n_title) ~* '^(we have your question|booking request sent)' then 'fyi'
    when n_kind = 'social' then 'fyi'
    when n_kind = 'message' then 'action'
    else 'update'
  end;
$f$;

grant execute on function public.notification_severity(public.notification_kind, text, text) to authenticated, service_role;

create or replace function private.stamp_notification_severity()
returns trigger
language plpgsql
set search_path = ''
as $f$
begin
  if new.severity is null then
    new.severity := public.notification_severity(new.kind, new.title, new.href);
  end if;
  return new;
end;
$f$;

drop trigger if exists notifications_set_severity on public.notifications;
create trigger notifications_set_severity
  before insert on public.notifications
  for each row execute function private.stamp_notification_severity();

update public.notifications
   set severity = public.notification_severity(kind, title, href)
 where severity is null;

grant select (severity) on public.notifications to authenticated;

-- ------------------------------------------------------------------ B13

create table if not exists public.listing_changes (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  change      text not null check (change in ('price', 'availability', 'viewing_windows')),
  old_minor   bigint,
  new_minor   bigint,
  available   boolean,
  changed_at  timestamptz not null default now()
);

comment on table public.listing_changes is
  'B13: price, availability and viewing-window changes on listings, read by the people who saved them (Saved card lines). Written by triggers only.';

create index if not exists listing_changes_listing_idx
  on public.listing_changes (listing_id, changed_at desc);

alter table public.listing_changes enable row level security;

drop policy if exists listing_changes_savers_read on public.listing_changes;
create policy listing_changes_savers_read
  on public.listing_changes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.saved_items s
       where s.listing_id = listing_changes.listing_id
         and s.user_id = (select auth.uid())
    )
  );

revoke all on public.listing_changes from anon;
revoke insert, update, delete on public.listing_changes from authenticated;
grant select on public.listing_changes to authenticated;

create or replace function private.record_listing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
declare
  old_price bigint;
  new_price bigint;
  was_live  boolean;
  is_live   boolean;
  lister    uuid;
  saver     uuid;
  amount    text;
begin
  old_price := case when old.listing_intent::text = 'sale' then old.sale_price_minor
                    else coalesce(old.rent_amount_minor, old.rate_minor) end;
  new_price := case when new.listing_intent::text = 'sale' then new.sale_price_minor
                    else coalesce(new.rent_amount_minor, new.rate_minor) end;
  was_live := old.status::text = 'PUBLISHED' and old.closed_at is null;
  is_live  := new.status::text = 'PUBLISHED' and new.closed_at is null;

  select a.user_id into lister from public.agents a where a.id = new.agent_id;

  if old_price is not null and new_price is not null and old_price <> new_price and is_live then
    insert into public.listing_changes (listing_id, change, old_minor, new_minor)
    values (new.id, 'price', old_price, new_price);

    if not coalesce(new.is_demo, false) then
      amount := '₦' || to_char(new_price / 100, 'FM999,999,999,999');
      for saver in
        select s.user_id from public.saved_items s
         where s.listing_id = new.id and s.user_id is distinct from lister
      loop
        perform private.notify(
          saver,
          'listing'::public.notification_kind,
          case when new_price < old_price then 'Price down on a place you saved'
               else 'Price changed on a place you saved' end,
          new.title || ' is now ' || amount || '.',
          '/listing/' || new.id || '?change=' || case when new_price < old_price then 'price-down' else 'price-up' end
        );
      end loop;
    end if;
  end if;

  if was_live is distinct from is_live then
    insert into public.listing_changes (listing_id, change, available)
    values (new.id, 'availability', is_live);

    if not is_live and not coalesce(new.is_demo, false) then
      for saver in
        select s.user_id from public.saved_items s
         where s.listing_id = new.id and s.user_id is distinct from lister
      loop
        perform private.notify(
          saver,
          'listing'::public.notification_kind,
          'A place you saved is no longer available',
          new.title || ' is off the market for now. It stays in Saved.',
          '/saved?change=gone'
        );
      end loop;
    end if;
  end if;

  return null;
end;
$f$;

revoke execute on function private.record_listing_change() from public, anon, authenticated;

drop trigger if exists listings_record_change on public.listings;
create trigger listings_record_change
  after update of rent_amount_minor, sale_price_minor, rate_minor, status, closed_at
  on public.listings
  for each row execute function private.record_listing_change();

create or replace function private.record_viewing_windows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
begin
  if coalesce(new.active, true) and new.listing_ids is not null then
    insert into public.listing_changes (listing_id, change)
    select l.id, 'viewing_windows'
      from public.listings l
     where l.id = any (new.listing_ids);
  end if;
  return null;
end;
$f$;

revoke execute on function private.record_viewing_windows() from public, anon, authenticated;

drop trigger if exists viewing_windows_record_change on public.viewing_windows;
create trigger viewing_windows_record_change
  after insert on public.viewing_windows
  for each row execute function private.record_viewing_windows();

-- ------------------------------------------------------------- read-back

do $check$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'notifications' and column_name = 'severity') then
    raise exception 'B11: notifications.severity is missing';
  end if;
  if public.notification_severity('message'::public.notification_kind, 'New message', '/messages/x') <> 'action'
     or public.notification_severity('social'::public.notification_kind, 'Somebody liked your post', null) <> 'fyi'
     or public.notification_severity('booking'::public.notification_kind, 'Booking confirmed', '/bookings') <> 'update' then
    raise exception 'B11: the severity table does not answer as the app does';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'notifications_set_severity'
                  and tgrelid = 'public.notifications'::regclass) then
    raise exception 'B11: the severity trigger is missing';
  end if;
  if exists (select 1 from public.notifications where severity is null) then
    raise exception 'B11: the backfill left rows without a severity';
  end if;
  if to_regclass('public.listing_changes') is null then
    raise exception 'B13: listing_changes is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.listing_changes'::regclass) then
    raise exception 'B13: RLS is off on listing_changes';
  end if;
  if not exists (select 1 from pg_policy where polname = 'listing_changes_savers_read'
                  and polrelid = 'public.listing_changes'::regclass) then
    raise exception 'B13: the savers policy is missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'listings_record_change'
                  and tgrelid = 'public.listings'::regclass)
     or not exists (select 1 from pg_trigger where tgname = 'viewing_windows_record_change'
                  and tgrelid = 'public.viewing_windows'::regclass) then
    raise exception 'B13: a change trigger is missing';
  end if;
end
$check$;
