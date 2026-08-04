-- `pg_cron` is installed, and three things that were waiting on it now run.
--
-- WHY NOT VERCEL. The obvious alternative was a route Vercel's cron calls, and
-- on the Hobby plan that is ONE invocation per day. Releasing a stale booking
-- hold once a day means a guest who abandons a checkout at nine in the morning
-- keeps somebody else's room until the following night: a real bed nobody could
-- book, for a whole day. Rate limit rows would pile up for twenty four hours
-- between sweeps.
--
-- `pg_cron` runs inside Postgres. It is not an HTTP request, so it does not
-- touch the deployment's cron budget at all, it cannot be lost to a cold start
-- or a function timeout, and it keeps running when the web app is down. The one
-- Vercel cron is now free for something that genuinely has to be a request.
--
-- ALL TIMES ARE UTC, which is what pg_cron reads, and which this project has
-- already been caught by once: the server runs UTC and Lagos is UTC+1, so a
-- daily job written for a Lagos hour must be shifted here rather than hoped
-- about. Each schedule below names the Lagos time it means.
--
-- The badge sweep is NOT scheduled here. Agent 1 had already scheduled
-- `rentme-nightly-badges` at 02:20 UTC by the time this ran, and
-- `private.sweep_badges` is idempotent, so a second job would have been the
-- same work done twice twenty minutes apart. One job, in the migration that
-- created the function it calls.
--
-- The view salt is deliberately not scheduled either. `private.view_bucket`
-- mints the day's salt on first use and deletes anything older than yesterday
-- on every call, so it maintains itself and a cron job would only be a second
-- way for it to go wrong.

create extension if not exists pg_cron;

do $$
declare
  j record;
begin
  -- Idempotent: re-running this migration must not leave two of each job.
  for j in
    select jobname from cron.job
     where jobname in ('rentme_release_stale_holds',
                       'rentme_purge_rate_limits',
                       'rentme_purge_idempotency')
  loop
    perform cron.unschedule(j.jobname);
  end loop;
end $$;

/*
 * Every fifteen minutes. A hold is a room somebody else cannot book, so the
 * cost of being slow here is measured in beds rather than in rows.
 */
select cron.schedule(
  'rentme_release_stale_holds',
  '*/15 * * * *',
  $$select private.release_stale_booking_holds();$$
);

/* Hourly, on the half hour so it is not competing with the quarter-hour job. */
select cron.schedule(
  'rentme_purge_rate_limits',
  '30 * * * *',
  $$select private.purge_rate_limits();$$
);

/* 03:10 Lagos, which is 02:10 UTC. Quiet, and past the Lagos day boundary, so
   a record written at 23:59 is a full day old before it is considered. */
select cron.schedule(
  'rentme_purge_idempotency',
  '10 2 * * *',
  $$select private.purge_idempotency_records();$$
);
