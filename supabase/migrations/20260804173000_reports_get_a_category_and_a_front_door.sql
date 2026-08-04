-- Reporting, with a category on it and somewhere to do it from.
--
-- public.reports has had a correct owner policy and an admin queue since the
-- trust migration, and exactly one writer: the social layer's report-a-post
-- action. Nothing on the platform let anyone report a LISTING, which is the
-- object the money moves against and therefore the one that gets faked.
--
-- Two changes, both small, because the table and its RLS were already right:
--
--   1. A category. reason was free text, so triage meant reading every row.
--      A queue that cannot be sorted by what happened is a queue that gets
--      worked in arrival order, and "the host is asking me to pay into an
--      account" is not the same urgency as "the photos are stale". Nullable,
--      because the social writer predates it and its rows are still valid.
--
--   2. One open report per person per thing. A partial unique index, so the
--      same target can be reported again after the first is resolved, but a
--      double tap or an angry evening cannot flood the queue.
--
-- The categories deliberately mirror what a Nigerian shortlet guest actually
-- runs into. off_platform_payment is first among the serious ones because it
-- is simultaneously the scam vector and the disintermediation, and it is the
-- one the message scanner already watches for.

alter table public.reports
  add column if not exists category text;

alter table public.reports
  drop constraint if exists reports_category_chk;

alter table public.reports
  add constraint reports_category_chk check (
    category is null or category in (
      'off_platform_payment',
      'scam',
      'unsafe',
      'not_as_described',
      'unavailable',
      'offensive',
      'duplicate',
      'other'
    )
  );

comment on column public.reports.category is
  'Structured triage signal. Null on rows written before categories existed.';

create unique index if not exists reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id)
  where status = 'open';

/* ------------------------------------------------------- acknowledgement --
   A report that vanishes teaches people not to report. The reporter hears
   that it arrived, through the same trigger fan-out every other notification
   on this platform uses, so no application path can forget it. */

create or replace function private.notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  serious constant text[] := array['off_platform_payment', 'scam', 'unsafe'];
  target_href text;
begin
  target_href := case new.target_type
    when 'listing' then '/listing/' || new.target_id
    when 'post'    then '/post/' || new.target_id
    else '/notifications'
  end;

  perform private.notify(
    new.reporter_id,
    'support',
    'Report received',
    'Thank you. Our team reviews every report, and we will act on this one without you having to chase it.',
    target_href
  );

  -- The serious three go straight onto the admin risk board as well as into
  -- the reports queue, because those are the ones where waiting for a queue to
  -- be worked in order is itself the harm.
  if new.category = any (serious) then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      -- Cast, not inference. A bare case expression here is text, and
      -- risk_alerts.severity is alert_severity: the DDL applies cleanly and
      -- every report then raises 42804 from inside the trigger. Caught by a
      -- functional probe, which is the only thing that could have caught it.
      'high'::alert_severity,
      'Reported: ' || replace(new.category, '_', ' '),
      'A member reported a ' || new.target_type || '. Their words: ' || left(new.reason, 400),
      new.target_type,
      new.target_id
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_report() from public, anon, authenticated;

drop trigger if exists reports_notify on public.reports;
create trigger reports_notify
  after insert on public.reports
  for each row execute function private.notify_report();
