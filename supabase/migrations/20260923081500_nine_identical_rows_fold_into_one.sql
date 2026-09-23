-- I REBUILT THE 256-ROW FAULT ONE NIGHT AFTER REMOVING IT.
--
-- `content.filter.empty` was raised on every run of an HOURLY job. recordAlert
-- folds a repeat into an open alert only inside a ten minute window, so each
-- hourly run cleared that window and wrote a NEW ROW. Nine identical rows
-- between 23:20 and 07:20, growing, every one of them true.
--
-- That is the exact shape that buried the scheduler outage: 256 rows on this
-- same desk all saying the same true thing, at a volume that made the desk not
-- worth opening. Removed on 22 September, reintroduced by me at 23:20 the same
-- evening.
--
-- AN EMPTY TERM LIST IS A STATE, NOT AN EVENT. It does not happen hourly; it
-- simply is, from the moment the table shipped empty until somebody seeds it.
-- A state belongs on the desk once, open, until it changes.
--
-- THE OLDEST ROW IS THE ONE KEPT, deliberately. It carries 23:20, which is when
-- the condition started being reported, and that is the number a person wants
-- when they ask how long this has been true. Keeping the newest would reset
-- that clock every hour, which is its own small lie.
--
-- Idempotent: on a rebuilt database it matches nothing.

with keep as (
  select id from public.risk_alerts
  where entity_type = 'content_filter' and status = 'open'
  order by created_at limit 1
)
update public.risk_alerts a
   set status = 'resolved', resolved_at = now()
 where a.entity_type = 'content_filter'
   and a.status = 'open'
   and a.id not in (select id from keep);
