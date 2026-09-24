-- Applied to live as 20260923132517 and recorded here from
-- supabase_migrations.schema_migrations, so the repository carries every
-- migration the database has run. One change for replay: where the applied
-- SQL raised because there was nothing to close ("none open", "still true"),
-- this file raises a notice and returns, so a fresh database (a reset or a
-- branch) replays it as the no-op it is there.

/*
 * A DESK THAT STILL SHOWS RED FOR A FAULT THAT PASSED IS THE SAME DEFECT AS A
 * DESK THAT SHOWS GREEN FOR ONE THAT HAS NOT.
 *
 * Two `high` alerts, "Push drain: something answered, but it was not the
 * drain", raised at 10:20Z and 10:25Z on 23 September. They were correct when
 * raised: the scheduled drain called its route and got a 200 carrying
 * `<!DOCTYPE html>`, because an unknown path on this deployment answers 200
 * with the site shell rather than 404. That is the same trap the money
 * reconciliation job was fixed for earlier the same day.
 *
 * The condition passed at about 10:25. `cron.push-drain.ok` has recorded a
 * genuine drain on every run since. The alerts stayed `open` for hours over a
 * fault that no longer existed, which is what the pg_cron failure watch did
 * for twenty five hours before it was corrected, and it teaches the operator
 * to stop reading the desk.
 *
 * THE CONDITION IS RE-READ HERE RATHER THAN ASSUMED. This resolves the two
 * rows ONLY if the drain has since recorded a successful run LATER than the
 * newest of them. If it has not, the alerts are still true and nothing is
 * touched, and the notice below says so.
 */
do $$
declare
  newest_alert timestamptz;
  latest_ok timestamptz;
  closed integer := 0;
begin
  select max(created_at) into newest_alert
    from public.risk_alerts
   where status = 'open'
     and title = 'Push drain: something answered, but it was not the drain';

  if newest_alert is null then
    raise notice 'PUSH ALERTS: none open, nothing to do';
    return;
  end if;

  select max(created_at) into latest_ok
    from public.audit_log
   where entity_type = 'cron_job' and action = 'cron.push-drain.ok';

  if latest_ok is null or latest_ok <= newest_alert then
    raise notice 'PUSH ALERTS: STILL TRUE. newest alert % and last good drain %. Left open deliberately.',
      newest_alert, coalesce(latest_ok::text, 'never');
    return;
  end if;

  update public.risk_alerts
     set status = 'resolved'
   where status = 'open'
     and title = 'Push drain: something answered, but it was not the drain';
  get diagnostics closed = row_count;

  raise notice 'PUSH ALERTS RESOLVED: % rows. newest alert %, last good drain %.',
    closed, newest_alert, latest_ok;
end $$;
