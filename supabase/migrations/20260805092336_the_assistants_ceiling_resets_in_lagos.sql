-- Two things Agent 2 found in its own work and handed over rather than
-- reaching. Both are one line and both matter the day the assistant is on.
--
-- 1. THE CEILINGS RESET AN HOUR LATE.
--
--    `created_at >= (now() at time zone 'Africa/Lagos')::date` compares a
--    `timestamptz` against a `date`. Postgres resolves that by casting the date
--    to a timestamptz AT THE SERVER'S timezone, and the server runs UTC. Lagos
--    is UTC+1. So the daily ceiling reset at 01:00 Lagos and the monthly one on
--    the first of the month at 01:00, and every invocation in that hour counted
--    against the wrong day.
--
--    Measured on the live database before the fix: the old boundary resolved to
--    `2026-08-05 00:00:00+00`, which is one in the morning in Lagos.
--
--    Harmless today because the assistant ships off, and a paid API behind a
--    spending ceiling is not a thing to leave an hour wrong. Fixed by comparing
--    in one frame throughout: `created_at` is shifted into Lagos and compared
--    to a Lagos date, so both sides mean the same midnight.
--
-- 2. `public.bot_may_run` WAS GRANTED TO `authenticated`.
--
--    Anybody signed in could call it with any user's id. What it returns is
--    only `off`, `month`, `day`, `person` or `ok`, so it leaks nothing about a
--    person, but three of those five are the PLATFORM'S OWN SPEND STATE, and
--    the audit specified service role from the start. The application calls it
--    through the admin client, so nothing notices the revoke.
--
--    Keeping the wrapper is still right: without it the summon has no PostgREST
--    endpoint at all, which was the defect the wrapper was written to fix. It
--    is the grant that was wrong, not the door. Proven after: `authenticated`
--    false, `anon` false, `service_role` true.

create or replace function private.bot_may_run(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  s            public.bot_settings;
  spent_month  bigint;
  used_day     integer;
  used_person  integer;
  lagos_today  date := (now() at time zone 'Africa/Lagos')::date;
begin
  select * into s from public.bot_settings limit 1;

  if s.enabled is distinct from true then return 'off'; end if;

  /*
   * Both sides of every comparison are now in Lagos. Casting the date to a
   * timestamptz instead would resolve it at the SERVER's timezone, which is
   * UTC, and that is the hour this was losing.
   */
  select coalesce(sum(cost_minor), 0) into spent_month
    from public.bot_invocations
   where (created_at at time zone 'Africa/Lagos')::date
         >= date_trunc('month', lagos_today)::date;

  if spent_month >= s.month_ceiling_minor then return 'month'; end if;

  select count(*) into used_day
    from public.bot_invocations
   where (created_at at time zone 'Africa/Lagos')::date = lagos_today;

  if used_day >= s.day_limit then return 'day'; end if;

  select count(*) into used_person
    from public.bot_invocations
   where user_id = p_user
     and (created_at at time zone 'Africa/Lagos')::date = lagos_today;

  if used_person >= s.person_day_limit then return 'person'; end if;

  return 'ok';
end;
$fn$;

revoke execute on function private.bot_may_run(uuid) from public, anon, authenticated;
revoke execute on function public.bot_may_run(uuid)  from public, anon, authenticated;
