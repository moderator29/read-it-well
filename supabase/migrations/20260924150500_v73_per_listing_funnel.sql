/*
 * V-73. PER-LISTING FUNNEL: SEEN, OPENED, SAVED, ENQUIRED, VIEWING BOOKED, VIEWED.
 *
 * `/agent/analytics` says on screen that views and saves are not counted, so
 * an agent cannot tell a good listing from an unseen one, blames the platform
 * and goes back to WhatsApp, where at least the blue ticks show. The lower
 * funnel is already on the platform (`saved_items`, `conversations`,
 * `inspection_requests`); what was missing is the top: how often a listing was
 * shown in results and how often it was opened.
 *
 * WHAT IS STORED, AND WHAT IS NOT.
 *
 *   listing_daily_stats   one row per listing per Lagos day: unique viewers who
 *                         SAW it in results (the first twenty cards the page
 *                         drew) and unique viewers who OPENED it. Counts only.
 *   listing_view_marks    the one-day memory that makes "unique" true: a hash
 *                         of (viewer, day), never the viewer's id, deleted the
 *                         day after. It is discarded at roll-up, as V-73 says,
 *                         and nothing here can answer "who looked at my flat".
 *
 * Example listings are never counted (they must never feed a real aggregate),
 * and a lister opening their own listing is not a view.
 *
 * BORN LOCKED. Both tables have RLS on and no grants to anon or authenticated.
 * Writes happen only through `record_listing_views`, a security definer
 * function that reads the caller from `auth.uid()`; reads only through
 * `listing_funnel`, which answers only the listing's own lister or staff.
 */

begin;

create table if not exists public.listing_daily_stats (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null,
  impressions integer not null default 0 check (impressions >= 0),
  opens integer not null default 0 check (opens >= 0),
  primary key (listing_id, day)
);

comment on table public.listing_daily_stats is
  'V-73: unique viewers per listing per Lagos day who saw it in results (impressions) and who opened it (opens). Counts only; written by record_listing_views, read by listing_funnel.';

create table if not exists public.listing_view_marks (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null,
  kind "char" not null check (kind in ('i', 'o')),
  viewer_hash text not null,
  primary key (listing_id, day, kind, viewer_hash)
);

comment on table public.listing_view_marks is
  'V-73: one day of memory so a count is of unique viewers. Holds a hash of viewer and day, never an id, and rows older than yesterday are deleted by record_listing_views.';

alter table public.listing_daily_stats enable row level security;
alter table public.listing_view_marks enable row level security;
revoke all on public.listing_daily_stats from public, anon, authenticated;
revoke all on public.listing_view_marks from public, anon, authenticated;

/*
 * Record what a signed-in person saw and opened. Impressions are capped at the
 * first twenty ids per call, the cards a phone actually drew.
 */
create or replace function public.record_listing_views(p_seen uuid[], p_opened uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  today date := (now() at time zone 'Africa/Lagos')::date;
  who text;
  target uuid;
  inserted integer;
begin
  if viewer is null then
    return;
  end if;
  who := md5(viewer::text || ':' || today::text);

  delete from public.listing_view_marks where day < today - 1;

  for target in
    select distinct l.id
      from unnest(coalesce(p_seen[1:20], array[]::uuid[])) as s(id)
      join public.listings l on l.id = s.id
      join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED' and not l.is_demo and a.user_id <> viewer
  loop
    insert into public.listing_view_marks (listing_id, day, kind, viewer_hash)
    values (target, today, 'i', who)
    on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      insert into public.listing_daily_stats (listing_id, day, impressions)
      values (target, today, 1)
      on conflict (listing_id, day) do update
        set impressions = public.listing_daily_stats.impressions + 1;
    end if;
  end loop;

  if p_opened is not null then
    select l.id into target
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = p_opened and l.status = 'PUBLISHED' and not l.is_demo and a.user_id <> viewer;
    if target is not null then
      insert into public.listing_view_marks (listing_id, day, kind, viewer_hash)
      values (target, today, 'o', who)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 then
        insert into public.listing_daily_stats (listing_id, day, opens)
        values (target, today, 1)
        on conflict (listing_id, day) do update
          set opens = public.listing_daily_stats.opens + 1;
      end if;
    end if;
  end if;
end;
$$;

comment on function public.record_listing_views(uuid[], uuid) is
  'V-73: counts unique signed-in viewers who saw (first twenty ids) or opened a published, non-example listing today. The lister''s own views do not count.';

/*
 * One listing's last N days, and the median of similar listings (same
 * property type and city, published, not examples) beside each stage. Answers
 * only the listing's own lister or staff, and nothing for anybody else.
 */
create or replace function public.listing_funnel(p_listing uuid, p_days integer default 7)
returns table (
  stage text,
  mine bigint,
  area_median numeric,
  compared integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  since timestamptz;
  since_day date;
  kind text;
  town text;
begin
  if caller is null then
    return;
  end if;
  if not exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing and a.user_id = caller
  ) and not (private.has_role(caller, 'admin'::public.app_role) or private.has_role(caller, 'super_admin'::public.app_role)) then
    return;
  end if;

  since := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)));
  since_day := (since at time zone 'Africa/Lagos')::date;
  select l.property_type::text, l.city into kind, town from public.listings l where l.id = p_listing;

  return query
  with peers as (
    select l.id
      from public.listings l
     where l.status = 'PUBLISHED' and not l.is_demo
       and l.property_type::text = kind and l.city is not distinct from town
  ),
  per as (
    select p.id,
      coalesce((select sum(s.impressions) from public.listing_daily_stats s where s.listing_id = p.id and s.day >= since_day), 0) as seen,
      coalesce((select sum(s.opens) from public.listing_daily_stats s where s.listing_id = p.id and s.day >= since_day), 0) as opened,
      (select count(*) from public.saved_items si where si.listing_id = p.id and si.created_at >= since) as saved,
      (select count(*) from public.conversations c where c.listing_id = p.id and c.created_at >= since) as enquired,
      (select count(*) from public.inspection_requests r where r.listing_id = p.id and r.created_at >= since) as booked,
      (select count(*) from public.inspection_requests r where r.listing_id = p.id and r.state::text = 'COMPLETED' and r.updated_at >= since) as viewed
    from peers p
  ),
  me as (
    select
      coalesce((select sum(s.impressions) from public.listing_daily_stats s where s.listing_id = p_listing and s.day >= since_day), 0) as seen,
      coalesce((select sum(s.opens) from public.listing_daily_stats s where s.listing_id = p_listing and s.day >= since_day), 0) as opened,
      (select count(*) from public.saved_items si where si.listing_id = p_listing and si.created_at >= since) as saved,
      (select count(*) from public.conversations c where c.listing_id = p_listing and c.created_at >= since) as enquired,
      (select count(*) from public.inspection_requests r where r.listing_id = p_listing and r.created_at >= since) as booked,
      (select count(*) from public.inspection_requests r where r.listing_id = p_listing and r.state::text = 'COMPLETED' and r.updated_at >= since) as viewed
  ),
  others as (select * from per where id <> p_listing)
  select v.stage, v.mine::bigint, v.med, (select count(*)::integer from others)
    from (
      select 'seen' as stage, (select seen from me) as mine, (select percentile_cont(0.5) within group (order by seen) from others)::numeric as med, 1 as ord
      union all select 'opened', (select opened from me), (select percentile_cont(0.5) within group (order by opened) from others)::numeric, 2
      union all select 'saved', (select saved from me), (select percentile_cont(0.5) within group (order by saved) from others)::numeric, 3
      union all select 'enquired', (select enquired from me), (select percentile_cont(0.5) within group (order by enquired) from others)::numeric, 4
      union all select 'booked', (select booked from me), (select percentile_cont(0.5) within group (order by booked) from others)::numeric, 5
      union all select 'viewed', (select viewed from me), (select percentile_cont(0.5) within group (order by viewed) from others)::numeric, 6
    ) v
   order by v.ord;
end;
$$;

comment on function public.listing_funnel(uuid, integer) is
  'V-73: one listing''s last N days (seen, opened, saved, enquired, viewing booked, viewed) beside the median of published, non-example listings of the same type in the same city. Answers only the listing''s lister or staff.';

revoke execute on function public.record_listing_views(uuid[], uuid) from public, anon;
revoke execute on function public.listing_funnel(uuid, integer) from public, anon;
grant execute on function public.record_listing_views(uuid[], uuid) to authenticated;
grant execute on function public.listing_funnel(uuid, integer) to authenticated;

commit;
