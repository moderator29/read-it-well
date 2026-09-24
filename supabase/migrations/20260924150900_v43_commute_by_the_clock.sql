/*
 * V-43. COMMUTE BY THE CLOCK, NOT BY THE KILOMETRE. FIRST SLICE.
 *
 * In Lagos distance is a lie: Ikorodu to Victoria Island is 30km and anything
 * from fifty minutes to three hours. Renters choose by bridge and corridor.
 * This stores two LABELLED sources of the same fact, a time band from an
 * origin area to a named anchor (`public.landmarks`) in a rush-hour window:
 *
 *   commute_bands    the route guide: a range of minutes in the morning or
 *                    evening peak, with the named route. Written by a person
 *                    who knows the corridor (source first_party). THIS
 *                    MIGRATION SHIPS IT EMPTY: a guide is knowledge, not code,
 *                    and a builder typing minutes would be inventing a claim.
 *                    The landmarks it points at are the founder-approved seed
 *                    in supabase/migrations/pending (also not applied here).
 *   commute_reports  members' own one-tap reports ("How long did it take you
 *                    this morning?"), from a member of the Around place for 14
 *                    days, one per anchor per day, stamped with the Lagos
 *                    peak window it was made in. Born locked.
 *
 * `commute_for` answers ONE origin, ONE anchor: per window, the residents'
 * interquartile range of each member's own median, once five different
 * members reported in the last 30 days and the range has width (source
 * 'residents', with the count), else the guide's band with its named route
 * (source 'guide'), else nothing. Never a single number, always a range and a window.
 * No third-party routing API is called anywhere: free-flow engines are wrong
 * for Lagos, and a live call would send the member's anchor to a third party.
 *
 * OFF UNTIL THE FOUNDER TURNS IT ON: both functions check the fail-closed
 * `feature_flags` row 'commute_by_the_clock' (open it once the landmark seed
 * is approved and the route guide is written):
 *   update public.feature_flags set enabled = true where key = 'commute_by_the_clock';
 */

begin;

insert into public.feature_flags (key, enabled, note)
values ('commute_by_the_clock', false, 'V-43: rush-hour times to named places, from the route guide and residents. Off until the founder opens it.')
on conflict (key) do nothing;

create or replace function private.commute_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'commute_by_the_clock'), false);
$$;
revoke all on function private.commute_open() from public, anon, authenticated;

create table if not exists public.commute_bands (
  id          uuid primary key default gen_random_uuid(),
  state_code  text not null references public.states (code),
  origin_area text not null check (length(btrim(origin_area)) between 2 and 80),
  anchor_id   uuid not null references public.landmarks (id) on delete cascade,
  peak        text not null check (peak in ('am', 'pm')),
  low_min     integer not null check (low_min between 1 and 360),
  high_min    integer not null check (high_min between 1 and 360),
  route_label text check (route_label is null or length(btrim(route_label)) between 2 and 80),
  source      public.source_kind not null default 'first_party',
  created_at  timestamptz not null default now(),
  constraint commute_bands_range check (low_min <= high_min)
);

create unique index if not exists commute_bands_one_per_window
  on public.commute_bands (state_code, lower(btrim(origin_area)), anchor_id, peak);

comment on table public.commute_bands is
  'V-43 route guide: minutes from an origin area to a landmark in the morning (am) or evening (pm) peak, with the named route. Written by a person who knows the corridor. Shipped empty.';

create table if not exists public.commute_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  area_id    uuid not null references public.areas (id) on delete cascade,
  anchor_id  uuid not null references public.landmarks (id) on delete cascade,
  peak       text not null check (peak in ('am', 'pm')),
  minutes    integer not null check (minutes between 5 and 300),
  day        date not null default ((now() at time zone 'Africa/Lagos')::date),
  created_at timestamptz not null default now(),
  constraint commute_reports_one_a_day unique (user_id, anchor_id, day)
);

create index if not exists commute_reports_area_anchor_idx on public.commute_reports (area_id, anchor_id, created_at desc);

alter table public.commute_bands enable row level security;
alter table public.commute_reports enable row level security;
revoke all on public.commute_bands from public, anon, authenticated;
revoke all on public.commute_reports from public, anon, authenticated;

/*
 * One report from a member of an Around place, about this morning's or this
 * evening's journey. The window is the server's Lagos clock: 05:00 to 11:59 is
 * the morning peak, 15:00 to 21:59 the evening; any other hour is refused.
 */
create or replace function public.report_commute(p_area uuid, p_anchor uuid, p_minutes integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  joined timestamptz;
  lagos_hour integer := extract(hour from (now() at time zone 'Africa/Lagos'))::integer;
  window_now text;
begin
  if not private.commute_open() then
    return 'off';
  end if;
  if caller is null then
    return 'signed-out';
  end if;
  select m.joined_at into joined from public.area_members m where m.area_id = p_area and m.user_id = caller;
  if joined is null then
    return 'not-member';
  end if;
  if joined > now() - interval '14 days' then
    return 'too-new';
  end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 300 then
    return 'bad-minutes';
  end if;
  if not exists (select 1 from public.landmarks l where l.id = p_anchor) then
    return 'bad-anchor';
  end if;
  window_now := case when lagos_hour between 5 and 11 then 'am' when lagos_hour between 15 and 21 then 'pm' else null end;
  if window_now is null then
    return 'off-peak';
  end if;
  insert into public.commute_reports (user_id, area_id, anchor_id, peak, minutes)
  values (caller, p_area, p_anchor, window_now, p_minutes)
  on conflict (user_id, anchor_id, day) do nothing;
  if not found then
    return 'already';
  end if;
  return 'ok';
end;
$$;

/*
 * The commute from one origin to one anchor, per peak window: residents'
 * range (25th to 75th percentile) once five members reported in 30 days,
 * else the guide's band, else no row.
 */
create or replace function public.commute_for(p_state text, p_area text, p_anchor uuid)
returns table (peak text, low_min integer, high_min integer, route_label text, source text, reports integer)
language sql
stable
security definer
set search_path = ''
as $$
  with place as (
    select ar.id
      from public.areas ar
     where ar.state_code = p_state
       and lower(btrim(ar.area)) = lower(btrim(p_area))
       and ar.status = 'ACTIVE'
  ),
  open as (select private.commute_open() as yes),
  recent as (
    select r.peak, r.minutes, r.user_id
      from public.commute_reports r
      join place p on p.id = r.area_id
     where r.anchor_id = p_anchor
       and r.created_at > now() - interval '30 days'
  ),
  /* One figure per member first (their median), so one person reporting
     every day cannot become the range (review). */
  per_member as (
    select r.peak, r.user_id, percentile_cont(0.5) within group (order by r.minutes) as minutes
      from recent r
     group by r.peak, r.user_id
  ),
  residents_raw as (
    select m.peak,
           round(percentile_cont(0.25) within group (order by m.minutes))::integer as low_min,
           round(percentile_cont(0.75) within group (order by m.minutes))::integer as high_min,
           count(*)::integer as reports
      from per_member m
     group by m.peak
    having count(*) >= 5
  ),
  /* A range with no width is not a range: the guide stands instead. */
  residents as (
    select * from residents_raw where high_min > low_min
  ),
  guide as (
    select b.peak, b.low_min, b.high_min, b.route_label
      from public.commute_bands b
     where b.state_code = p_state
       and lower(btrim(b.origin_area)) = lower(btrim(p_area))
       and b.anchor_id = p_anchor
  )
  select w.peak,
         coalesce(res.low_min, g.low_min),
         coalesce(res.high_min, g.high_min),
         /* The named route belongs to the guide, never to residents' times. */
         case when res.peak is null then g.route_label end,
         case when res.peak is not null then 'residents' else 'guide' end,
         coalesce(res.reports, 0)
    from (values ('am'), ('pm')) as w(peak)
    left join residents res on res.peak = w.peak
    left join guide g on g.peak = w.peak
   where (res.peak is not null or g.peak is not null)
     and (select yes from open)
   order by w.peak;
$$;

revoke execute on function public.report_commute(uuid, uuid, integer) from public, anon;
revoke execute on function public.commute_for(text, text, uuid) from public, anon;
grant execute on function public.report_commute(uuid, uuid, integer) to authenticated;
grant execute on function public.commute_for(text, text, uuid) to authenticated;

commit;
