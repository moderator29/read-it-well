-- V-15: A NEW LISTING IS MATCHED AGAINST SAVED SEARCHES WITHIN MINUTES.
--
-- The only alert run was `/api/cron/saved-search-alerts` at 07:40 UTC, so a
-- flat published at nine in the morning reached the person watching for it at
-- twenty to nine the NEXT morning. A good-value flat in Yaba is inspected the
-- day it is posted; the first person to see it wins.
--
-- THE SHAPE. Publication writes one row here (a trigger, below). A job every
-- five minutes (`/api/cron/new-match-alerts`) takes the unprocessed rows in
-- order of publication, matches ONLY those listings against the alerting
-- saved searches, and tells each person at once: a notification row, which
-- the existing push trigger queues for their handset under their own
-- preferences and quiet hours. The daily run stays as the morning digest and
-- its watermark logic is untouched, because the fast path moves the same
-- per-search watermark forward past what it has told somebody, so nothing is
-- announced twice.
--
-- THREE PUSHES A DAY, THEN THE DIGEST. `match_alert_quota` counts the instant
-- alerts each person has had on each Lagos day. At three, the fast path stops
-- telling them and leaves their watermark where it was, so the morning digest
-- picks up everything else in one notice. A person is never woken ten times by
-- a busy morning in Lekki.
--
-- EXAMPLES ARE NEVER QUEUED. An example listing describes a property that
-- does not exist and is never the subject of an alert (the daily job's rule,
-- enforced here at the source as well).
--
-- BORN LOCKED: both tables have RLS on and no client grants. Only the service
-- role, which runs the job, reads or writes them.

create table if not exists public.listing_match_queue (
  listing_id    uuid primary key references public.listings(id) on delete cascade,
  published_at  timestamptz not null,
  enqueued_at   timestamptz not null default now(),
  processed_at  timestamptz
);

comment on table public.listing_match_queue is
  'V-15. One row per listing that reached PUBLISHED, for the five-minute new-match job. Service role only. Examples are never queued.';

create index if not exists listing_match_queue_open_idx
  on public.listing_match_queue (published_at) where processed_at is null;

alter table public.listing_match_queue enable row level security;
revoke all on public.listing_match_queue from public, anon, authenticated;
grant all on public.listing_match_queue to service_role;

create table if not exists public.match_alert_quota (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  sent     integer not null default 0 check (sent >= 0),
  primary key (user_id, day)
);

comment on table public.match_alert_quota is
  'V-15. Instant new-match alerts per person per Lagos day, so the fast path stops at three and leaves the rest to the morning digest. Service role only. Counts, never contents.';

alter table public.match_alert_quota enable row level security;
revoke all on public.match_alert_quota from public, anon, authenticated;
grant all on public.match_alert_quota to service_role;

create or replace function private.queue_listing_for_matching()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'PUBLISHED'::public.listing_status
     and new.is_demo = false
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.listing_match_queue (listing_id, published_at)
    values (new.id, coalesce(new.published_at, now()))
    on conflict (listing_id) do update
      set published_at = excluded.published_at,
          enqueued_at = now(),
          processed_at = null;
  end if;
  return new;
exception when others then
  /* A queue that cannot be written must never cost the publication that
     raised it. The morning digest still covers this listing. */
  return new;
end;
$function$;

comment on function private.queue_listing_for_matching() is
  'V-15. AFTER INSERT OR UPDATE OF status on listings: queue a newly published, non-example listing for the five-minute match. Never throws.';

revoke all on function private.queue_listing_for_matching() from public, anon, authenticated;

drop trigger if exists listings_queue_for_matching on public.listings;
create trigger listings_queue_for_matching
  after insert or update of status on public.listings
  for each row execute function private.queue_listing_for_matching();
