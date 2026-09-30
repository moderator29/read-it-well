-- C7 AND C13: CLEAN AND REPEATED JOB RUNS LEAVE THE AUDIT TRAIL (30 September 2026).
--
-- Applied 30 September 2026 with the founder's approval. Adds one table and two functions and schedules
-- one purge. Rewrites no existing row, drops nothing, changes no existing
-- table, policy or function, and is safe to run twice.
--
-- WHY. `public.audit_log` held 8,487 rows on 30 September: 8,432 written by
-- scheduled jobs (`cron.push-drain.ok` 1,978, `cron.canary.ok` 1,730, ...)
-- and 55 by people. A staff decision was one row in 150, and
-- `cron.sanctions-screen.attention` was written 420 times for one standing
-- cause, which trains staff to ignore "attention".
--
-- WHAT. `public.job_runs` keeps one row per job, per day, per outcome, with a
-- run count, the first and last time, and the last run's metadata (counts
-- only, as the audit rows carry today). `public.record_job_run` upserts it and
-- is callable by the service role only. The app (apps/web/src/lib/cron/report.ts)
-- writes a CLEAN run, and an attention run whose alert folded into one already
-- open for the same cause, here instead of the trail. A failed run, the first
-- attention run for a cause, and every person's action stay in `audit_log`,
-- which stays append-only exactly as it is.
--
-- The app degrades gracefully: until this is applied the RPC is missing and
-- every run is written to `audit_log` as today. Run-history readers
-- (lib/cron/freshness.ts, lib/admin/reads/jobs.ts) read both.
--
-- RETENTION (founder decision; 90 days recommended in RECS_C C7):
-- `public.purge_job_runs(90)` runs daily at 03:55 Lagos (02:55 UTC).
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create table if not exists public.job_runs (
  job           text        not null check (length(job) between 1 and 80),
  day           date        not null,
  outcome       text        not null check (outcome in ('ok', 'attention', 'failed', 'repeat')),
  runs          integer     not null default 0 check (runs >= 0),
  first_at      timestamptz not null default now(),
  last_at       timestamptz not null default now(),
  last_metadata jsonb       not null default '{}'::jsonb,
  primary key (job, day, outcome)
);

comment on table public.job_runs is
  'C7: one row per scheduled job, per day, per outcome. Clean runs and repeats of an already open alert land here instead of audit_log. Written only through public.record_job_run (service role).';

create index if not exists job_runs_job_last_at_idx on public.job_runs (job, last_at desc);

alter table public.job_runs enable row level security;

-- Read: the same people who read the audit trail. No write policy at all:
-- writes go through the security definer function, which only the service
-- role may call.
drop policy if exists job_runs_admin_select on public.job_runs;
create policy job_runs_admin_select on public.job_runs
  for select to authenticated
  using (
    (select private.has_role((select auth.uid()), 'admin'::public.app_role))
    or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  );

revoke all on public.job_runs from anon, authenticated;
grant select on public.job_runs to authenticated;

create or replace function public.record_job_run(p_job text, p_outcome text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  v_job     text := btrim(coalesce(p_job, ''));
  v_outcome text := btrim(coalesce(p_outcome, ''));
  v_now     timestamptz := now();
  v_day     date := (v_now at time zone 'Africa/Lagos')::date;
begin
  if length(v_job) = 0 or length(v_job) > 80 then
    raise exception 'record_job_run: job name missing or too long' using errcode = '22023';
  end if;
  if v_outcome not in ('ok', 'attention', 'failed', 'repeat') then
    raise exception 'record_job_run: unknown outcome %', v_outcome using errcode = '22023';
  end if;

  insert into public.job_runs as r (job, day, outcome, runs, first_at, last_at, last_metadata)
  values (v_job, v_day, v_outcome, 1, v_now, v_now, coalesce(p_metadata, '{}'::jsonb))
  on conflict (job, day, outcome) do update
    set runs = r.runs + 1,
        last_at = excluded.last_at,
        last_metadata = excluded.last_metadata;
end;
$function$;

revoke all on function public.record_job_run(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_job_run(text, text, jsonb) to service_role;

create or replace function public.purge_job_runs(p_keep_days integer default 90)
returns integer
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.job_runs
   where day < ((now() at time zone 'Africa/Lagos')::date - greatest(coalesce(p_keep_days, 90), 7));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.purge_job_runs(integer) from public, anon, authenticated;
grant execute on function public.purge_job_runs(integer) to service_role;

-- cron.schedule with an existing name replaces that job, so this is idempotent.
select cron.schedule('vallo_purge_job_runs', '55 2 * * *', $cron$select public.purge_job_runs(90)$cron$);

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if to_regclass('public.job_runs') is null then
    raise exception 'job_runs missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.job_runs'::regclass) then
    raise exception 'job_runs has RLS off';
  end if;
  if to_regprocedure('public.record_job_run(text, text, jsonb)') is null then
    raise exception 'record_job_run missing';
  end if;
  if has_function_privilege('authenticated', 'public.record_job_run(text, text, jsonb)', 'execute') then
    raise exception 'record_job_run is callable by authenticated';
  end if;
  if to_regprocedure('public.purge_job_runs(integer)') is null then
    raise exception 'purge_job_runs missing';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_purge_job_runs') then
    raise exception 'vallo_purge_job_runs not scheduled';
  end if;
end;
$check$;
