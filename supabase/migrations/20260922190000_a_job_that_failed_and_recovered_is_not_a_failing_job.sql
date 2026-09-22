-- A JOB THAT FAILED AT 15:47 AND HAS SUCCEEDED THREE TIMES SINCE IS NOT A
-- FAILING JOB, AND THE DESK COULD NOT TELL THE DIFFERENCE.
--
-- `private.cron_job_failures` returns every failed run inside a 25 hour
-- window. `cronWatchVerdict` raises one CRITICAL alert if that list is not
-- empty. Neither of them asks the only question that matters, which is whether
-- the job is failing NOW.
--
-- Measured on this project on 22 September. `vallo_reconcile_payments` run
-- 8187 failed at 15:47 with `invalid URL "https://www.vallospaces.com\n/api/
-- paystack/reconcile..."`, which was the pasted newline in `vallo_site_url`.
-- That was fixed at 17:37 and the job has returned 200 on its own schedule
-- since, verdict `ok_200`. At 18:20 the watch raised the 15:47 failure as a
-- fresh critical alert anyway, and it would have gone on doing so, hourly,
-- until the run aged out of the window around 16:47 the following day.
--
-- TWENTY-TWO CRITICAL ALERTS ABOUT ONE FIXED FAULT. This is how a desk gets
-- switched off, and this platform has already paid once for a desk nobody
-- opened: 256 rows reading "unauthorised" at MEDIUM while every scheduled job
-- on the platform was dead.
--
-- IT IS THE SAME FAULT AS THE DAY'S OTHERS. The watch observes THAT A FAILURE
-- EXISTS IN A WINDOW. It does not observe WHETHER THE JOB IS FAILING. Those
-- are different questions and only the second one is worth waking somebody up
-- for.
--
-- SO EACH FAILURE NOW CARRIES ITS OWN RECOVERY. `recovered_at` is the start
-- time of the most recent SUCCEEDED run of THE SAME JOB that began after this
-- failure, or null when there has not been one. Null means the failure still
-- stands. A timestamp means the job picked itself up, and the caller counts it
-- rather than shouting about it.
--
-- NOTHING IS HIDDEN AND NOTHING IS FILTERED AWAY HERE. Every failed run in the
-- window is still returned, with everything it carried before. The judgement
-- is left to the caller, which is where it can be tested, and the recovered
-- ones stay in the envelope on every run so a job that flaps between failing
-- and recovering is visible as exactly that.
--
-- THE SUCCESS IS LOOKED FOR OUTSIDE THE WINDOW ON PURPOSE. A failure at the
-- oldest edge of a 25 hour window may have been put right 24 hours ago, and
-- restricting the recovery search to the same window would report it as
-- standing. Only the failures are windowed; recovery is the whole table.

create or replace function private.cron_job_failures(
  p_since interval default '25:00:00'::interval,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  failures jsonb := '[]'::jsonb;
begin
  if p_since is null or p_since < interval '1 minute' then
    raise exception 'A failure window is at least one minute.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'A failure report carries between 1 and 1000 rows.' using errcode = '22023';
  end if;
  if to_regclass('cron.job_run_details') is null then
    return jsonb_build_object('available', false, 'failures', '[]'::jsonb);
  end if;
  execute $q$
    select coalesce(jsonb_agg(jsonb_build_object(
             'jobid',          d.jobid,
             'jobname',        j.jobname,
             'runid',          d.runid,
             'status',         d.status,
             'start_time',     d.start_time,
             'return_message', left(d.return_message, 300),
             'recovered_at',   d.recovered_at
           ) order by d.start_time desc), '[]'::jsonb)
      from (
        select r.jobid, r.runid, r.status, r.start_time,
               r.return_message,
               (
                 /* The most recent success of THIS job AFTER this failure.
                    Deliberately not restricted to the window: a failure at the
                    old edge of it may have been put right long ago. */
                 select max(s.start_time)
                   from cron.job_run_details s
                  where s.jobid = r.jobid
                    and s.status = 'succeeded'
                    and s.start_time > r.start_time
               ) as recovered_at
          from cron.job_run_details r
         where r.status = 'failed'
           and r.start_time >= now() - $1
         order by r.start_time desc
         limit $2
      ) d
      left join cron.job j on j.jobid = d.jobid
  $q$
  into failures
  using p_since, p_limit;
  return jsonb_build_object('available', true, 'failures', failures);
end;
$function$;

create or replace function public.cron_job_failures(
  p_since interval default '25:00:00'::interval,
  p_limit integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select private.cron_job_failures(p_since, p_limit);
$function$;

-- BORN LOCKED, NEVER BORN PUBLIC (rule 21). `create or replace` PRESERVES the
-- existing grants, so these are restated rather than assumed: a future reader
-- must be able to see the lock in the same migration that writes the function,
-- and must never have to go and check whether an older one is still holding.
-- The measured state before this migration was `postgres=X` on the private one
-- and `postgres=X, service_role=X` on the public wrapper, and that is exactly
-- what is re-established here.
revoke all on function private.cron_job_failures(interval, integer) from public, anon, authenticated;
revoke all on function public.cron_job_failures(interval, integer)  from public, anon, authenticated;
grant execute on function public.cron_job_failures(interval, integer) to service_role;
