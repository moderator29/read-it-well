/*
 * V-80. SPEED MEASURED ON THE PHONES PEOPLE ACTUALLY USE.
 *
 * Every speed number in THE_HUNDRED came from a US container emulating
 * Lagos. The truth is on Tecno and Infinix phones on MTN and Airtel, and the
 * only way to have it is to let the phones say. `/api/vitals` accepts one
 * sample per page view from one page view in ten: the route TEMPLATE (never
 * the URL a person typed, never a query string), the Core Web Vitals, the
 * connection class the browser reports, whether Save-Data was on, and how
 * many kilobytes the page could measure.
 *
 * WHAT IS NOT HERE, ON PURPOSE. No user id, no session, no IP, no user
 * agent, no timestamp finer than the row's own insert time. A sample cannot
 * be joined to a person, which is why it needs no consent screen and why the
 * table is not in the account purge: there is nothing in it about anybody.
 * Thirty days, then `vallo_purge_web_vitals` deletes it.
 *
 * Written only by the service role (the API route); read only by
 * `admin_field_speed()`, which answers the admin desk with p75 per route per
 * connection class and nothing row-level.
 */

create table if not exists public.web_vitals_samples (
  id bigint generated always as identity primary key,
  route text not null check (char_length(route) between 1 and 120 and route like '/%'),
  metric text not null check (metric in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  value double precision not null check (value >= 0 and value < 600000),
  effective_type text check (effective_type in ('slow-2g', '2g', '3g', '4g')),
  save_data boolean not null default false,
  transfer_kb integer check (transfer_kb is null or (transfer_kb >= 0 and transfer_kb < 1000000)),
  at timestamptz not null default now()
);

create index if not exists web_vitals_samples_at_idx on public.web_vitals_samples (at desc);
create index if not exists web_vitals_samples_route_metric_idx on public.web_vitals_samples (route, metric, at desc);

alter table public.web_vitals_samples enable row level security;
/* BORN LOCKED: no API role reads or writes it. */
revoke all on table public.web_vitals_samples from public, anon, authenticated;

comment on table public.web_vitals_samples is
  'V-80. Field Core Web Vitals, one page view in ten, by route template and connection class. No user, session, IP or agent. Written by the service role through /api/vitals; purged after 30 days; read only through admin_field_speed().';

-- ----------------------------------------------------------------------------
-- THE DESK'S READ: p75 BY ROUTE AND CONNECTION, LAST SEVEN DAYS.

create or replace function public.admin_field_speed()
returns table (
  route text,
  effective_type text,
  samples bigint,
  p75_lcp_ms double precision,
  p75_inp_ms double precision,
  p75_cls double precision,
  p75_transfer_kb double precision
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null
     or not (private.has_role(actor, 'admin'::public.app_role)
             or private.has_role(actor, 'super_admin'::public.app_role)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select s.route,
         coalesce(s.effective_type, 'unknown') as effective_type,
         count(*) filter (where s.metric = 'LCP') as samples,
         percentile_cont(0.75) within group (order by s.value) filter (where s.metric = 'LCP'),
         percentile_cont(0.75) within group (order by s.value) filter (where s.metric = 'INP'),
         percentile_cont(0.75) within group (order by s.value) filter (where s.metric = 'CLS'),
         percentile_cont(0.75) within group (order by s.transfer_kb) filter (where s.metric = 'LCP' and s.transfer_kb is not null)
    from public.web_vitals_samples s
   where s.at > now() - interval '7 days'
   group by 1, 2
  having count(*) filter (where s.metric = 'LCP') > 0
   order by 3 desc, 1, 2
   limit 200;
end;
$$;

revoke all on function public.admin_field_speed() from public, anon, authenticated;
grant execute on function public.admin_field_speed() to authenticated;

-- ----------------------------------------------------------------------------
-- THIRTY DAYS.

create or replace function private.purge_web_vitals()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_deleted integer;
begin
  delete from public.web_vitals_samples where at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.purge_web_vitals() from public, anon, authenticated;

select cron.unschedule('vallo_purge_web_vitals')
 where exists (select 1 from cron.job where jobname = 'vallo_purge_web_vitals');

select cron.schedule('vallo_purge_web_vitals', '35 2 * * *', 'select private.purge_web_vitals();');

-- ----------------------------------------------------------------------------
-- READ BACK.

do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'web_vitals_samples'
       and grantee in ('anon', 'authenticated', 'PUBLIC')
  ) then
    raise exception 'web_vitals_samples is not born locked';
  end if;
  if has_function_privilege('anon', 'public.admin_field_speed()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.purge_web_vitals()', 'EXECUTE') then
    raise exception 'a V-80 function is executable by a role that should not hold it';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_purge_web_vitals') then
    raise exception 'the thirty-day purge is not scheduled';
  end if;
end
$$;
