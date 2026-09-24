-- V-10, REVIEW FIX: ONE SALT PER WINDOW, SO k COUNTS PEOPLE.
--
-- 20260924121400 salted each WEEK, so one person searching the same cell for
-- five weeks was five different hashes, and one or two accounts could reach
-- k = 5 across a four-week board; "41 people searched" was not true. Now the
-- window is a fixed FOUR-WEEK BLOCK (blocks start on 5 January 2026, a Monday,
-- and run 28 days), one salt covers the whole block, and the board reads only
-- the last complete block. Within it one person is exactly one hash, so a
-- cell appears only when five different people searched it in that block,
-- and the count shown is people. The block's salt is deleted as soon as the
-- next block starts. `p_weeks` is kept for the signature and no longer read.

create or replace function private.demand_block(p_week date)
returns date
language sql
immutable
set search_path to ''
as $function$
  select date '2026-01-05' + (((p_week - date '2026-01-05') / 28) * 28);
$function$;

revoke all on function private.demand_block(date) from public, anon, authenticated;

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
  this_block date := private.demand_block(this_week);
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

  -- ONE SALT PER FOUR-WEEK BLOCK, so one person is one hash across the
  -- whole window the board reads. The last block's salt goes the moment a
  -- new block starts.
  delete from private.demand_salts where week < this_block;
  insert into private.demand_salts (week, salt)
  values (this_block, extensions.gen_random_bytes(32))
  on conflict (week) do nothing;
  select s.salt into week_salt from private.demand_salts s where s.week = this_block;

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
  'V-10. The demand board over the last complete four-week block: cells searched by at least five different people in it (one salt per block, so one person is one hash), how many of them found fewer than three results, and how many real published listings in that closed-list neighbourhood match now. Approved listers and staff only. p_weeks is ignored.';

revoke all on function public.record_search_demand(uuid, text, text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.record_search_demand(uuid, text, text, text, integer, integer, integer) to service_role;
revoke all on function public.demand_board(integer) from public, anon;
grant execute on function public.demand_board(integer) to authenticated;
