-- V-10: THE DEMAND BOARD. WHAT RENTERS LOOKED FOR, COUNTED BY CELL, NEVER BY
-- PERSON.
--
-- Agents list what they have; the good ones hunt for what is wanted, and today
-- they guess from WhatsApp groups. Vallo is the one party that sees demand
-- before supply exists. This records it without recording anybody.
--
-- A SEARCH BECOMES A CELL, AND THE CELL IS ALL THAT IS KEPT. One row per
-- distinct search per browsing session (the page deduplicates in the tab's
-- own storage and nothing identifying is sent): the week it happened in, the
-- state and a neighbourhood from a CLOSED LIST (never the typed words), to
-- let or for sale, a bedroom minimum capped at five, a budget BAND rather than
-- a figure, and a result-count band. There is no user column, no session id,
-- no query string, no coordinate and no exact time. The precedent is
-- `price_check_events` (20260922222424), counted by cell and never by address.
--
-- A CELL IS SHOWN ONLY WHEN FIVE SEARCHES SIT IN IT (k = 5), and only as a
-- count, so no row on any screen can describe one person's search. Example
-- listings never count as supply in the matching figure beside it.
--
-- BORN LOCKED. The table has RLS on and no client grants. Rows arrive only
-- through `record_search_demand`, which validates every band, and leave only
-- through `demand_board`, which applies the threshold itself and is for
-- listers and staff. Both are SECURITY DEFINER with pinned search paths and
-- their own guards (rule 21).

create table if not exists public.search_demand_events (
  id            bigint generated always as identity primary key,
  week          date not null,
  state_code    text references public.states(code),
  area_key      text check (area_key is null or (length(area_key) between 2 and 60 and area_key ~ '^[A-Za-z0-9 ]+$')),
  market        text not null check (market in ('rent', 'sale', 'any')),
  bedrooms_min  smallint check (bedrooms_min is null or bedrooms_min between 0 and 5),
  budget_band   smallint check (budget_band is null or budget_band between 1 and 6),
  results_band  smallint not null check (results_band between 0 and 2)
);

comment on table public.search_demand_events is
  'V-10. One row per distinct search per browsing session, as a cell: week, state, a closed-list neighbourhood, market, bedroom minimum (capped at 5), budget band, result band. No user, session, query text, coordinate or exact time. Service role and the two definer functions only; shown only in cells of at least five.';

comment on column public.search_demand_events.budget_band is
  '1: up to N1m, 2: N1m to N2m, 3: N2m to N3.5m, 4: N3.5m to N5m, 5: N5m to N10m, 6: over N10m. A band, never the figure.';
comment on column public.search_demand_events.results_band is
  '0: no results, 1: one or two, 2: three or more. What the searcher could find, not what they wanted.';

create index if not exists search_demand_events_week_idx on public.search_demand_events (week, state_code, area_key);

alter table public.search_demand_events enable row level security;
revoke all on public.search_demand_events from public, anon, authenticated;
grant all on public.search_demand_events to service_role;

create or replace function public.record_search_demand(
  p_state_code text,
  p_area_key text,
  p_market text,
  p_bedrooms_min integer,
  p_budget_band integer,
  p_results integer
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if p_state_code is null and p_area_key is null and p_bedrooms_min is null and p_budget_band is null then
    return; -- an empty search says nothing about demand
  end if;
  insert into public.search_demand_events (week, state_code, area_key, market, bedrooms_min, budget_band, results_band)
  values (
    date_trunc('week', (now() at time zone 'Africa/Lagos'))::date,
    nullif(upper(btrim(p_state_code)), ''),
    nullif(btrim(p_area_key), ''),
    coalesce(nullif(p_market, ''), 'any'),
    case when p_bedrooms_min is null then null else least(greatest(p_bedrooms_min, 0), 5) end,
    p_budget_band,
    case when coalesce(p_results, 0) <= 0 then 0 when p_results <= 2 then 1 else 2 end
  );
  /* RETENTION, WITHOUT A SCHEDULER: roughly one call in two hundred sweeps
     cells older than a year. The board reads at most 26 weeks; a year keeps
     one full cycle for comparison and nothing beyond it. */
  if random() < 0.005 then
    delete from public.search_demand_events where week < (current_date - 365);
  end if;
end;
$function$;

comment on function public.record_search_demand(text, text, text, integer, integer, integer) is
  'V-10. Records one search as a cell. Signed in only (search is behind the gate). Keeps no caller identity; every band is checked by the table.';

create or replace function public.demand_board(p_weeks integer default 4)
returns table (
  state_code    text,
  area_key      text,
  market        text,
  bedrooms_min  smallint,
  budget_band   smallint,
  searches      integer,
  unmet         integer,
  real_supply   integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not (
       exists (select 1 from public.agents a where a.user_id = caller)
       or private.has_role(caller, 'admin'::public.app_role)
       or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'listers and staff only' using errcode = '42501';
  end if;

  return query
  with cells as (
    select e.state_code, e.area_key, e.market, e.bedrooms_min, e.budget_band,
           count(*)::integer as searches,
           count(*) filter (where e.results_band < 2)::integer as unmet
      from public.search_demand_events e
     where e.week >= (date_trunc('week', (now() at time zone 'Africa/Lagos'))::date - (greatest(least(coalesce(p_weeks, 4), 26), 1) - 1) * 7)
       and e.area_key is not null
     group by e.state_code, e.area_key, e.market, e.bedrooms_min, e.budget_band
    having count(*) >= 5
  )
  select c.state_code, c.area_key, c.market, c.bedrooms_min, c.budget_band, c.searches, c.unmet,
         (select count(*)::integer
            from public.listings l
           where l.status = 'PUBLISHED'::public.listing_status
             and l.is_demo = false
             and (c.state_code is null or l.state_code = c.state_code)
             and lower(btrim(l.area)) = lower(c.area_key)
             and (c.market = 'any' or l.listing_intent::text = c.market)
             and (c.bedrooms_min is null or l.bedrooms >= c.bedrooms_min)
             and (c.budget_band is null or c.market = 'sale' or coalesce(l.rent_amount_minor, 0) <=
                  case c.budget_band when 1 then 100000000 when 2 then 200000000 when 3 then 350000000
                                     when 4 then 500000000 when 5 then 1000000000 else 9223372036854775807 end)
         )
    from cells c
   order by c.unmet desc, c.searches desc
   limit 50;
end;
$function$;

comment on function public.demand_board(integer) is
  'V-10. The demand board: cells of at least five searches in the last N weeks (1 to 26), with how many of them found fewer than three results and how many real published listings match the cell now. Listers and staff only. Counts only; examples never count as supply.';

revoke all on function public.record_search_demand(text, text, text, integer, integer, integer) from public, anon;
revoke all on function public.demand_board(integer) from public, anon;
grant execute on function public.record_search_demand(text, text, text, integer, integer, integer) to authenticated;
grant execute on function public.demand_board(integer) to authenticated;
