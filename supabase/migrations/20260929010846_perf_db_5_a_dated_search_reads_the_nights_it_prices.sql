/*
 * PERF-DB 5. A DATED STAY SEARCH READS THE NIGHTS IT PRICES, AND THE CRON
 * HEALTH CHECK READS ITS HISTORY ONCE.
 *
 * WHY, 1: stays_search. For every candidate rate plan, the nightly total is
 *   `generate_series(check_in, check_out - 1) d
 *      left join rate_calendar rc on rc.rate_plan_id = rp.id and rc.date = d::date`
 * The join condition is on a cast, so the planner cannot use the
 * (rate_plan_id, date) primary key for the date and reads EVERY calendar row
 * of the plan (90 today, growing daily), hashing them, for each plan: ~1.5 ms
 * x 22 plans, 33 of the 40 ms the priced branch costs with RLS bypassed.
 * Signed in, each of those rows also passes rate_calendar's RLS policy, which
 * is why an authenticated dated search measured ~700 ms per call.
 * Fix: add `and rc.date >= p_check_in and rc.date < p_check_out` to that join
 * in `stays_search_exact` and `stays_search_public`. Every `d` lies in
 * [check_in, check_out), so the added bounds are implied by `rc.date = d::date`:
 * the result is identical, and the index now bounds the read to the nights
 * being priced. Nothing else in either function changes; signatures, owner,
 * grants, SECURITY INVOKER and search_path are kept by CREATE OR REPLACE.
 *
 * WHY, 2: cron_job_failures (ops health, 151 calls a day, 128 ms mean). For
 * each failed run it re-scanned all of cron.job_run_details (11.6K rows, no
 * usable index, owned by supabase_admin) to find a later success. Now the
 * failures are read once and the successes once (only jobs that failed, only
 * after the earliest failure, which the original predicate already implies),
 * and each failure looks up its recovery in that small set. Same rows, same
 * order, same jsonb.
 *
 * PROOF. Before replacing anything the DO block captures, as the migration
 * owner, the full output of both stays functions for 24 dated windows (1 to 4
 * nights over the next 45 days, rooms 1 and 2) plus an undated call, and of
 * cron_job_failures for 1 day, 7 days and 60 days. After replacing, it
 * recomputes all of them and raises (rolling back) on any difference. It also
 * asserts each definition changed in exactly the one intended place.
 */
do $mig$
declare
  old_join constant text := 'left join public.rate_calendar rc on rc.rate_plan_id = rp.id and rc.date = d::date';
  new_join constant text := 'left join public.rate_calendar rc on rc.rate_plan_id = rp.id and rc.date = d::date and rc.date >= p_check_in and rc.date < p_check_out';
  fn text;
  def text;
  new_def text;
  before jsonb;
  after jsonb;
  probe constant text := $p$
    select jsonb_agg(x order by w.n, x.id) from (
      select row_number() over () n, ci, co, rooms from (
        select (current_date + s) ci, (current_date + s + nights) co, rooms
          from unnest(array[3, 10, 24, 45]) s, unnest(array[1, 2, 4]) nights, unnest(array[1, 2]) rooms
         where (s, nights) in ((3,1),(3,2),(10,2),(10,4),(24,1),(24,4),(45,2),(45,1),(3,4),(10,1),(24,2),(45,4))
        union all select null, null, 1
      ) q
    ) w,
    lateral (select to_jsonb(r) - 'total_count' || jsonb_build_object('total_count', r.total_count) x, r.id
               from public.%I(array['listing','accommodation']::public.catalogue_entity_kind[],
                    null, null, null, null, w.ci, w.co, w.rooms, null, null, null, null, null, null,
                    null, null, null, null, null, null, 'recommended', 200, 0) r) x
  $p$;
begin
  foreach fn in array array['stays_search_exact', 'stays_search_public'] loop
    select pg_get_functiondef(p.oid) into def from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn;
    if (length(def) - length(replace(def, old_join, ''))) / length(old_join) <> 1 then
      raise exception 'PERF-DB 5: % does not hold the calendar join exactly once', fn;
    end if;

    execute format(probe, fn) into before;
    new_def := replace(def, old_join, new_join);
    execute new_def;
    execute format(probe, fn) into after;

    if before is distinct from after then
      raise exception 'PERF-DB 5: % answers differently after the change', fn;
    end if;
    select pg_get_functiondef(p.oid) into def from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn;
    if def is distinct from new_def or position(new_join in def) = 0 then
      raise exception 'PERF-DB 5: % was not replaced as intended', fn;
    end if;
    raise notice 'PERF-DB 5: % bounded (% probe rows identical)', fn, coalesce(jsonb_array_length(after), 0);
  end loop;

  /* cron_job_failures: capture, replace, compare. */
  select jsonb_build_array(private.cron_job_failures('1 day', 1000),
                           private.cron_job_failures('7 days', 1000),
                           private.cron_job_failures('60 days', 1000),
                           private.cron_job_failures('60 days', 5))
    into before;

  create or replace function private.cron_job_failures(p_since interval default '25:00:00'::interval, p_limit integer default 100)
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
  as $fn$
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
      with f as materialized (
        select r.jobid, r.runid, r.status, r.start_time, r.return_message
          from cron.job_run_details r
         where r.status = 'failed'
           and r.start_time >= now() - $1
         order by r.start_time desc
         limit $2
      ),
      s as materialized (
        select s.jobid, s.start_time
          from cron.job_run_details s
         where s.status = 'succeeded'
           and s.jobid in (select jobid from f)
           and s.start_time > (select min(start_time) from f)
      ),
      d as (
        select f.*,
               (select max(s.start_time) from s
                 where s.jobid = f.jobid and s.start_time > f.start_time) as recovered_at
          from f
      )
      select coalesce(jsonb_agg(jsonb_build_object(
               'jobid',          d.jobid,
               'jobname',        j.jobname,
               'runid',          d.runid,
               'status',         d.status,
               'start_time',     d.start_time,
               'return_message', left(d.return_message, 300),
               'recovered_at',   d.recovered_at
             ) order by d.start_time desc), '[]'::jsonb)
        from d
        left join cron.job j on j.jobid = d.jobid
    $q$
    into failures
    using p_since, p_limit;
    return jsonb_build_object('available', true, 'failures', failures);
  end;
  $fn$;

  select jsonb_build_array(private.cron_job_failures('1 day', 1000),
                           private.cron_job_failures('7 days', 1000),
                           private.cron_job_failures('60 days', 1000),
                           private.cron_job_failures('60 days', 5))
    into after;
  if before is distinct from after then
    raise exception 'PERF-DB 5: cron_job_failures answers differently after the change';
  end if;
  raise notice 'PERF-DB 5: cron_job_failures reads its history once (answers identical)';
end
$mig$;
