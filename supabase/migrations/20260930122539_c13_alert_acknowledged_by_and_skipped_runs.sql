-- C13: AN ALERT SAYS WHO HAS IT, AND A SWITCHED-OFF JOB SAYS IT SKIPPED (30 September 2026).
--
-- Applied 30 September 2026 with the founder's approval.
-- Adds two nullable columns, one index, one check constraint and one guard
-- trigger to public.risk_alerts; widens the outcome list of public.job_runs
-- and public.record_job_run by one word. Drops no data, rewrites no row,
-- changes no policy, and is safe to run twice.
--
-- ONE. "ACKNOWLEDGED BY" ON THE ALERTS DESK.
-- An open alert said when it was raised and nothing about whether anybody had
-- seen it. `acknowledged_by` / `acknowledged_at` record the first person who
-- took it ("I have this"), separately from `resolved_by`, which records who
-- closed it. RLS is untouched: the existing `risk_alerts_admin_all` policy
-- (admin or super_admin, for all commands) is what lets the console write the
-- columns, and nobody else can read or write the table. A guard trigger holds
-- the name honest: a signed-in caller can only acknowledge as themselves, and
-- the time is stamped by the database, not sent by the client.
--
-- TWO. A `skipped` OUTCOME FOR COUNTED JOB RUNS.
-- apps/web/src/lib/cron/run.ts now records a run whose feature flag is off
-- (today: landlord-line, flag `landlord_line`) as `skipped` instead of a clean
-- run. `record_job_run` refused any word but ok/attention/failed/repeat, so
-- until this lands the app counts a skip as `ok` with `skipped: true` in the
-- metadata (lib/cron/report.ts). After it lands, skips count under their own
-- outcome and the operations desk shows "Skipped (flag off)".
--
-- WHAT GOES LIVE AFTER APPLYING (no deploy needed, the app already probes):
--   * /admin/alerts shows an "I have this" button on open alerts and
--     "Acknowledged by <name>, <when>" on acknowledged ones
--     (apps/web/src/lib/admin/queries.ts readAcknowledgements,
--      apps/web/src/lib/admin/actions.ts acknowledgeRiskAlert).
--     Before applying, the read fails quietly and the button is not drawn.
--   * record_job_run accepts 'skipped' (lib/cron/report.ts tries it first).
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`), then regenerate the
-- types so `acknowledged_by` / `acknowledged_at` are typed.

-- ---------------------------------------------------------------------------
-- ONE: risk_alerts.acknowledged_by / acknowledged_at

alter table public.risk_alerts
  add column if not exists acknowledged_by uuid references auth.users (id) on delete set null;
alter table public.risk_alerts
  add column if not exists acknowledged_at timestamptz;

comment on column public.risk_alerts.acknowledged_by is
  'C13: the staff member who first took this alert ("I have this"). Set only by that person (guard trigger); null when nobody has, or the account was deleted.';
comment on column public.risk_alerts.acknowledged_at is
  'C13: when acknowledged_by took the alert. Stamped by the database.';

create index if not exists risk_alerts_acknowledged_by_idx on public.risk_alerts (acknowledged_by);

-- A name never stands without a time. (A time can outlive a name: the
-- account may be deleted, which sets the name null.)
do $c$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.risk_alerts'::regclass
       and conname = 'risk_alerts_acknowledged_has_a_time'
  ) then
    alter table public.risk_alerts
      add constraint risk_alerts_acknowledged_has_a_time
      check (acknowledged_by is null or acknowledged_at is not null);
  end if;
end;
$c$;

-- The guard. SECURITY INVOKER: it reads nothing, it only checks the row it is
-- given against the caller. A service-role or database write (auth.uid() is
-- null) is left alone, so a job can still file or tidy alerts.
create or replace function private.risk_alert_acknowledgement_is_the_caller()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_caller uuid := auth.uid();
begin
  if new.acknowledged_by is not distinct from old.acknowledged_by then
    return new;
  end if;
  if v_caller is not null then
    if new.acknowledged_by is not null and new.acknowledged_by <> v_caller then
      raise exception 'An alert can only be acknowledged by the person taking it.'
        using errcode = '42501';
    end if;
    if old.acknowledged_by is not null and new.acknowledged_by is null then
      raise exception 'An acknowledgement stays on the alert; resolve the alert instead.'
        using errcode = '42501';
    end if;
  end if;
  if new.acknowledged_by is not null then
    new.acknowledged_at := now();
  end if;
  return new;
end;
$function$;

revoke all on function private.risk_alert_acknowledgement_is_the_caller() from public, anon, authenticated;

drop trigger if exists risk_alerts_acknowledgement_is_the_caller on public.risk_alerts;
create trigger risk_alerts_acknowledgement_is_the_caller
  before update of acknowledged_by on public.risk_alerts
  for each row execute function private.risk_alert_acknowledgement_is_the_caller();

-- ---------------------------------------------------------------------------
-- TWO: job_runs accepts 'skipped'

alter table public.job_runs drop constraint if exists job_runs_outcome_check;
alter table public.job_runs
  add constraint job_runs_outcome_check
  check (outcome in ('ok', 'attention', 'failed', 'repeat', 'skipped'));

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
  if v_outcome not in ('ok', 'attention', 'failed', 'repeat', 'skipped') then
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

-- ---------------------------------------------------------------------------
-- READ-BACK: raise if anything above did not land, or if RLS moved.

do $check$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'risk_alerts' and column_name = 'acknowledged_by') then
    raise exception 'risk_alerts.acknowledged_by missing';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'risk_alerts' and column_name = 'acknowledged_at') then
    raise exception 'risk_alerts.acknowledged_at missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.risk_alerts'::regclass) then
    raise exception 'risk_alerts has RLS off';
  end if;
  if not exists (select 1 from pg_policy
                  where polrelid = 'public.risk_alerts'::regclass and polname = 'risk_alerts_admin_all') then
    raise exception 'risk_alerts_admin_all policy missing';
  end if;
  if (select count(*) from pg_policy where polrelid = 'public.risk_alerts'::regclass) <> 1 then
    raise exception 'risk_alerts has a policy this migration did not expect';
  end if;
  if not exists (select 1 from pg_trigger
                  where tgrelid = 'public.risk_alerts'::regclass
                    and tgname = 'risk_alerts_acknowledgement_is_the_caller') then
    raise exception 'acknowledgement guard trigger missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.risk_alerts'::regclass
                    and conname = 'risk_alerts_acknowledged_has_a_time') then
    raise exception 'risk_alerts_acknowledged_has_a_time missing';
  end if;
  if position('skipped' in (select pg_get_constraintdef(oid) from pg_constraint
                             where conrelid = 'public.job_runs'::regclass
                               and conname = 'job_runs_outcome_check')) = 0 then
    raise exception 'job_runs_outcome_check does not accept skipped';
  end if;
  if position('skipped' in pg_get_functiondef('public.record_job_run(text, text, jsonb)'::regprocedure)) = 0 then
    raise exception 'record_job_run does not accept skipped';
  end if;
  if has_function_privilege('authenticated', 'public.record_job_run(text, text, jsonb)', 'execute') then
    raise exception 'record_job_run is callable by authenticated';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.job_runs'::regclass) then
    raise exception 'job_runs has RLS off';
  end if;
end;
$check$;
