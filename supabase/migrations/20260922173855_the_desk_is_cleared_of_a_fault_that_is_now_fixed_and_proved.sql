-- Clearing 267 open alert rows is the move this whole day was about, so the
-- reason is written down rather than assumed.
--
-- Every one of those rows said the same thing: a scheduled job was refused at
-- the door and therefore did not run. They accumulated hourly from 19 September
-- because `CRON_SECRET` was first misspelt as `CRONS_SECRET` and then
-- re-created carrying whitespace, which made Vercel refuse every production
-- build outright. The condition was real and the rows were honest.
--
-- The condition was fixed AND PROVED before they were cleared, which is the
-- only thing that makes this an honest clear rather than a green light painted
-- over a red one: `private.request_money_reconciliation()` was fired against
-- the new deployment at 17:37 and `net._http_response` recorded status 200 with
-- a real 48 hour window, charges and holds both examined.
--
-- NOTHING WAS DELETED. `status` moved to resolved and `resolved_at` was
-- stamped, so every row, its title, its severity and its hour survive for
-- anybody counting how long this lasted. `resolved_by` stays null because no
-- person resolved these and recording one would be a small lie of exactly the
-- kind being swept out that day.
--
-- Only rows raised BEFORE the successful run were touched. Anything a refused
-- job raises after it is a new fault and must be read as one.
--
-- Idempotent: on a rebuilt database it matches nothing.

update public.risk_alerts
   set status      = 'resolved',
       resolved_at = now()
 where (entity_type = 'cron_job' or title ilike 'cron%')
   and status      = 'open'
   and created_at  < timestamptz '2026-09-22 17:37:38+00';
