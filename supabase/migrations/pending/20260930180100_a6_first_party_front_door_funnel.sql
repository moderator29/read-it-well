-- A6. A first-party funnel you can read: from landing to first result.
-- PENDING: written by the front door build (Recommendations A, 30 September
-- 2026) for the lead to review and apply. Idempotent. Nothing destructive.
--
-- WHAT IS RECORDED, and it is deliberately little: a step name from a fixed
-- list, when it happened, the locale, the surface (web, ios, android), the
-- door that led there (hero, header, footer, ...), and a random visit id the
-- browser makes for itself in session storage. No IP, no user agent, no
-- cookie beyond the session, and no third party.
--
-- NO PERSON BEFORE VERIFICATION. `user_id` is written only for the steps
-- after an account exists (verified, first search, first save or enquiry),
-- by the function from `auth.uid()`, never from the caller's input; and it is
-- what makes "first" mean first: one row per account per step.
--
-- RETENTION: 90 days, purged nightly (docs/RETENTION_SCHEDULE.md).
--
-- Written through `record_funnel_event` only (callable signed out, as the
-- landing is); read through `admin_funnel_summary` only, by admins. The table
-- itself has RLS on and no policy, so no client reads or writes it directly.

create table if not exists public.funnel_events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  step        text not null check (step in (
                'landing_view', 'get_started', 'signup_opened', 'step_one_done', 'step_two_done',
                'code_sent', 'code_resent', 'verified', 'first_search', 'first_result')),
  visit_id    uuid not null,
  locale      text not null check (locale in ('en', 'ha', 'yo', 'ig')),
  surface     text not null check (surface in ('web', 'ios', 'android')),
  door        text check (door in ('hero', 'search', 'category', 'header', 'footer', 'check', 'calculator', 'guide', 'supply', 'close', 'other')),
  user_id     uuid references auth.users (id) on delete set null
);

create index if not exists funnel_events_occurred_at on public.funnel_events (occurred_at);
create unique index if not exists funnel_events_one_first_per_account
  on public.funnel_events (user_id, step) where user_id is not null;
-- One landing view per visit, so a reload is not a second visitor.
create unique index if not exists funnel_events_one_step_per_visit
  on public.funnel_events (visit_id, step);

alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon, authenticated;

create or replace function public.record_funnel_event(
  p_step text, p_visit uuid, p_locale text, p_surface text, p_door text default null)
returns void
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  who uuid := null;
begin
  if p_visit is null then
    return;
  end if;
  if p_step in ('verified', 'first_search', 'first_result') then
    who := (select auth.uid());
    if who is null then
      return;
    end if;
  end if;
  insert into public.funnel_events (step, visit_id, locale, surface, door, user_id)
  values (p_step, p_visit, p_locale, p_surface, p_door, who)
  on conflict do nothing;
exception when check_violation then
  -- An unknown step, locale, surface or door is dropped, never an error to a page.
  return;
end;
$function$;

revoke all on function public.record_funnel_event(text, uuid, text, text, text) from public;
grant execute on function public.record_funnel_event(text, uuid, text, text, text) to anon, authenticated;

-- The desk's read: distinct visits (or accounts) per step, split by locale
-- and surface, over the last p_days. Admins only.
create or replace function public.admin_funnel_summary(p_days int default 7)
returns table (step text, locale text, surface text, visits bigint)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not (private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) then
    return;
  end if;
  -- Two rows come from auth itself rather than from an event, so they need
  -- no hook in the sign-up form: accounts created, and accounts whose email
  -- was confirmed, in the window. They carry no locale or surface.
  return query
    select f.step, f.locale, f.surface, count(distinct f.visit_id)
      from public.funnel_events f
     where f.occurred_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
     group by f.step, f.locale, f.surface
    union all
    select 'accounts_created'::text, null::text, null::text, count(*)
      from auth.users u
     where u.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
    union all
    select 'accounts_confirmed'::text, null::text, null::text, count(*)
      from auth.users u
     where u.email_confirmed_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
        or u.phone_confirmed_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)));
end;
$function$;

revoke all on function public.admin_funnel_summary(int) from public, anon;
grant execute on function public.admin_funnel_summary(int) to authenticated;

create or replace function private.purge_funnel_events()
returns void
language sql
volatile security definer
set search_path to ''
as $function$
  delete from public.funnel_events where occurred_at < now() - interval '90 days';
$function$;

revoke all on function private.purge_funnel_events() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'vallo_purge_funnel_events') then
    perform cron.unschedule('vallo_purge_funnel_events');
  end if;
  perform cron.schedule('vallo_purge_funnel_events', '50 2 * * *', 'select private.purge_funnel_events();');
end $$;

-- Read back.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.funnel_events'::regclass) then
    raise exception 'funnel_events must have RLS on';
  end if;
  if has_table_privilege('anon', 'public.funnel_events', 'select')
     or has_table_privilege('authenticated', 'public.funnel_events', 'insert') then
    raise exception 'funnel_events must not be reachable directly';
  end if;
  if not has_function_privilege('anon', 'public.record_funnel_event(text,uuid,text,text,text)', 'execute') then
    raise exception 'the landing must be able to record a view';
  end if;
  if has_function_privilege('anon', 'public.admin_funnel_summary(int)', 'execute') then
    raise exception 'anon must not read the funnel';
  end if;
  if exists (select 1 from public.admin_funnel_summary(7)) then
    raise exception 'admin_funnel_summary must answer nothing to a non-admin';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_purge_funnel_events') then
    raise exception 'the 90-day purge must be scheduled';
  end if;
end $$;

notify pgrst, 'reload schema';
