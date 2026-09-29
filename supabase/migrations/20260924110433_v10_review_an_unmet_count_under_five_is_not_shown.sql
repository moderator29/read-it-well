-- V-10, REVIEW FIX: AN UNMET COUNT UNDER FIVE IS NOT SHOWN.
--
-- A board cell needs five different people, but its "unmet" figure could be
-- one or two, which points at one or two people's searches. demand_board now
-- returns unmet as null when it is under five, or when the people it leaves
-- over (searches - unmet) are between one and four, since either figure then
-- counts fewer than five people. The board says "people searched" alone for
-- such a cell. Ordering uses the shown figure only. Otherwise unchanged from
-- 20260924122200.

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
  this_block date := private.demand_block(date_trunc('week', (now() at time zone 'Africa/Lagos'))::date);
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
     -- The last COMPLETE four-week block only: one salt covers it, so a
     -- person is one hash in it, and k counts people, not person-weeks.
     where e.week < this_block
       and e.week >= this_block - 28
       and e.area_key is not null
     group by e.state_code, e.area_key, e.market, e.bedrooms_min, e.budget_band
    having count(distinct e.person_hash) >= 5
  )
  -- Fewer than five people is not shown as a count, either way round: the
  -- unmet figure is withheld when it is under five, or when the people it
  -- leaves over (people - unmet) are between one and four.
  select c.state_code, c.area_key, c.market, c.bedrooms_min, c.budget_band, c.people,
         case when c.unmet >= 5 and (c.people - c.unmet = 0 or c.people - c.unmet >= 5)
              then c.unmet end,
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
   order by case when c.unmet >= 5 and (c.people - c.unmet = 0 or c.people - c.unmet >= 5)
                 then c.unmet else 0 end desc, c.people desc
   limit 50;
end;
$function$;

comment on function public.demand_board(integer) is
  'V-10. What people searched for in the last complete four-week block, by closed-list neighbourhood, only where five different people searched; unmet is null when it, or the people it leaves over, would count fewer than five; real published matches now. Approved listers and staff only. p_weeks is ignored.';

revoke all on function public.demand_board(integer) from public, anon;
grant execute on function public.demand_board(integer) to authenticated;
