-- V-10, REVIEW FIX: DEMAND IS RECORDED BY THE SERVER, FROM THE CLOSED LIST,
-- AND COUNTED BY DISTINCT PEOPLE.
--
-- Review found that `record_search_demand` (20260924120800) was granted to
-- every signed-in account with no ceiling of its own, took a free-text area
-- and a result count from the client, and so one account wrote five rows for
-- "14 Admiralty Way" and crossed the k = 5 threshold alone. All of that
-- changes here:
--
--   - EXECUTE IS THE SERVICE ROLE'S ONLY. The search page records the search
--     on the server after it has run it, with the result count it computed
--     itself, under a per-person daily ceiling. No client can call it.
--   - THE AREA MUST BE ON THE CLOSED NEIGHBOURHOOD LIST, in its state
--     (`private.public_neighbourhood`, 20260924121300), and is stored in the
--     list's spelling. Anything else records no area.
--   - k COUNTS DISTINCT PEOPLE. Each row carries a hash of the searcher's id
--     salted with THIS WEEK'S salt. One person searching the same cell twenty
--     times in a week is one row (a unique index), and a cell is shown only
--     when five different hashes sit in it. The salt for a week is deleted as
--     soon as that week is over, so a past week's hashes can no longer be
--     tied to anybody, by us or by anybody holding the table; they remain
--     only good for counting.
--   - THE BOARD READS COMPLETED WEEKS ONLY, in fixed windows (the last N
--     whole weeks before this one), so a cell cannot be watched filling up
--     search by search. Readers must be staff or an agent whose application
--     is APPROVED. `real_supply` compares a budget band with yearly rents
--     only.

alter table public.search_demand_events add column if not exists person_hash text;
update public.search_demand_events set person_hash = 'legacy-' || id::text where person_hash is null;
alter table public.search_demand_events alter column person_hash set not null;

create unique index if not exists search_demand_events_one_per_person_cell
  on public.search_demand_events (week, person_hash, coalesce(state_code, ''), coalesce(area_key, ''), market,
                                  coalesce(bedrooms_min, -1), coalesce(budget_band, -1));

comment on column public.search_demand_events.person_hash is
  'sha256 of the searcher''s id with that week''s salt from private.demand_salts. The salt is deleted when the week ends, so a completed week''s hashes identify nobody and serve only to count distinct people (k = 5).';

create table if not exists private.demand_salts (
  week  date primary key,
  salt  bytea not null
);

comment on table private.demand_salts is
  'V-10. One random salt per Lagos week for search_demand_events.person_hash. Deleted as soon as its week is over.';

revoke all on private.demand_salts from public, anon, authenticated;

drop function if exists public.record_search_demand(text, text, text, integer, integer, integer);

create or replace function public.record_search_demand(
  p_user uuid,
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
declare
  this_week date := date_trunc('week', (now() at time zone 'Africa/Lagos'))::date;
  week_salt bytea;
  area text;
begin
  if p_user is null then
    return;
  end if;
  area := private.public_neighbourhood(p_area_key, p_state_code);
  if area is null and p_bedrooms_min is null and p_budget_band is null then
    return; -- an empty search, or one naming only a place off the list, says nothing
  end if;

  -- Last week's salt, and every older one, goes the moment a new week starts.
  delete from private.demand_salts where week < this_week;
  insert into private.demand_salts (week, salt)
  values (this_week, extensions.gen_random_bytes(32))
  on conflict (week) do nothing;
  select s.salt into week_salt from private.demand_salts s where s.week = this_week;

  insert into public.search_demand_events (week, state_code, area_key, market, bedrooms_min, budget_band, results_band, person_hash)
  values (
    this_week,
    case when area is null then nullif(upper(btrim(p_state_code)), '') else upper(btrim(p_state_code)) end,
    area,
    coalesce(nullif(p_market, ''), 'any'),
    case when p_bedrooms_min is null then null else least(greatest(p_bedrooms_min, 0), 5) end,
    p_budget_band,
    case when coalesce(p_results, 0) <= 0 then 0 when p_results <= 2 then 1 else 2 end,
    encode(extensions.digest(week_salt || convert_to(p_user::text, 'UTF8'), 'sha256'), 'hex')
  )
  on conflict do nothing;

  if random() < 0.005 then
    delete from public.search_demand_events where week < (current_date - 365);
  end if;
end;
$function$;

comment on function public.record_search_demand(uuid, text, text, text, integer, integer, integer) is
  'V-10. Records one search as a cell, called by the server only (service role) with the result count it computed. The area is kept only when on the closed list. One row per person per cell per week, keyed by a hash salted with a salt deleted when the week ends.';

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
  this_week date := date_trunc('week', (now() at time zone 'Africa/Lagos'))::date;
  weeks integer := greatest(least(coalesce(p_weeks, 4), 26), 1);
begin
  if caller is null or not (
       exists (select 1 from public.agents a where a.user_id = caller and a.status = 'APPROVED'::public.agent_application_status)
       or private.has_role(caller, 'admin'::public.app_role)
       or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'approved listers and staff only' using errcode = '42501';
  end if;

  return query
  with cells as (
    select e.state_code, e.area_key, e.market, e.bedrooms_min, e.budget_band,
           count(distinct e.person_hash)::integer as people,
           count(distinct e.person_hash) filter (where e.results_band < 2)::integer as unmet
      from public.search_demand_events e
     -- Completed weeks only, in a fixed window: the last N whole weeks.
     where e.week < this_week
       and e.week >= this_week - weeks * 7
       and e.area_key is not null
     group by e.state_code, e.area_key, e.market, e.bedrooms_min, e.budget_band
    having count(distinct e.person_hash) >= 5
  )
  select c.state_code, c.area_key, c.market, c.bedrooms_min, c.budget_band, c.people, c.unmet,
         (select count(*)::integer
            from public.listings l
           where l.status = 'PUBLISHED'::public.listing_status
             and l.is_demo = false
             and (c.state_code is null or l.state_code = c.state_code)
             and private.public_neighbourhood(l.area, l.state_code) = c.area_key
             and (c.market = 'any' or l.listing_intent::text = c.market)
             and (c.bedrooms_min is null or l.bedrooms >= c.bedrooms_min)
             and (c.budget_band is null or c.market = 'sale' or (
                   l.rent_period::text = 'year'
                   and coalesce(l.rent_amount_minor, 0) <=
                     case c.budget_band when 1 then 100000000 when 2 then 200000000 when 3 then 350000000
                                        when 4 then 500000000 when 5 then 1000000000 else 9223372036854775807 end))
         )
    from cells c
   order by c.unmet desc, c.people desc
   limit 50;
end;
$function$;

comment on function public.demand_board(integer) is
  'V-10. The demand board over the last N completed weeks (1 to 26): cells searched by at least five different people, how many of them found fewer than three results, and how many real published listings in that closed-list neighbourhood match now (yearly rents only against a budget band). Approved listers and staff only. Counts only.';

revoke all on function public.record_search_demand(uuid, text, text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.record_search_demand(uuid, text, text, text, integer, integer, integer) to service_role;
revoke all on function public.demand_board(integer) from public, anon;
grant execute on function public.demand_board(integer) to authenticated;
