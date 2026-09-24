-- V-72, REVIEW FIX: LOST REASONS READ ONE FIXED BLOCK, NEED THREE OTHER
-- LISTERS PER NAMED REASON, AND NO ONE LISTER MAY CARRY AN AREA; THE
-- CONFIRMED/COMPLETED STAMPS CANNOT BE WRITTEN BY HAND.
--
-- 1. lost_reasons_by_area took p_weeks, so two reads a week apart could be
--    subtracted to isolate one week's (or one lister's) losses. p_weeks is
--    now ignored: the board reads the last COMPLETED twelve-week block
--    (twelve-week blocks from Monday 5 January 2026, Lagos time), the same
--    idea as V-10's four-week demand block, so every read inside a block
--    returns the same figures.
-- 2. The caller's own lost enquiries are left out of every figure they are
--    shown, so a lister cannot subtract themselves out. An area still needs
--    lost enquiries from at least three listers across five listings, and no
--    single lister may account for more than 60% of an area's total (an area
--    one lister dominates is withheld). A reason is named only where at least
--    five enquiries from at least three different listers give it; the rest
--    fold into "other".
-- 3. The stamp trigger ran only on UPDATE OF state, so a client could write
--    confirmed_at or completed_at directly in any other update. It now runs on
--    every insert and update: on insert the stamps are set only for a row
--    born CONFIRMED or COMPLETED, and on update the old values are kept
--    unless the state transitions into that stage.

create or replace function private.stamp_inspection_transitions()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.confirmed_at := case when new.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state) then now() end;
    new.completed_at := case when new.state = 'COMPLETED'::public.inspection_state then now() end;
    return new;
  end if;

  new.confirmed_at := old.confirmed_at;
  new.completed_at := old.completed_at;
  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED'::public.inspection_state then
      new.confirmed_at := now();
    elsif new.state = 'COMPLETED'::public.inspection_state then
      new.completed_at := now();
      new.confirmed_at := coalesce(old.confirmed_at, now());
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.stamp_inspection_transitions() from public, anon, authenticated;

drop trigger if exists inspection_requests_stamp_transitions on public.inspection_requests;
create trigger inspection_requests_stamp_transitions
  before insert or update on public.inspection_requests
  for each row execute function private.stamp_inspection_transitions();

create or replace function private.lost_reasons_block()
returns tstzrange
language sql
stable
set search_path to ''
as $function$
  -- The last completed twelve-week block, Lagos midnights at both ends.
  with today as (select (now() at time zone 'Africa/Lagos')::date as d),
  this_block as (
    select date '2026-01-05' + (((t.d - date '2026-01-05') / 84) * 84) as starts from today t
  )
  select tstzrange(
           ((b.starts - 84)::timestamp) at time zone 'Africa/Lagos',
           (b.starts::timestamp) at time zone 'Africa/Lagos',
           '[)')
    from this_block b;
$function$;

revoke all on function private.lost_reasons_block() from public, anon, authenticated;

create or replace function public.lost_reasons_by_area(p_weeks integer default 12)
returns table (
  state_code  text,
  area        text,
  reason      text,
  lost        integer,
  area_lost   integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  block tstzrange := private.lost_reasons_block();
begin
  -- p_weeks is accepted for old callers and ignored: see the header.
  if caller is null or not (
       exists (select 1 from public.agents a where a.user_id = caller and a.status = 'APPROVED'::public.agent_application_status)
       or private.has_role(caller, 'admin'::public.app_role)
       or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'approved listers and staff only' using errcode = '42501';
  end if;

  return query
  with lost as (
    select l.state_code, private.public_neighbourhood(l.area, l.state_code) as area,
           s.lost_reason, c.agent_id, l.id as listing_id
      from public.enquiry_stages s
      join public.conversations c on c.id = s.conversation_id
      join public.listings l on l.id = c.listing_id
     where s.stage = 'lost'
       and s.set_at <@ block
       and l.is_demo = false
       and c.agent_id is distinct from caller
  ),
  per_lister as (
    select lo.state_code, lo.area, lo.agent_id, count(*) as n
      from lost lo
     where lo.area is not null
     group by lo.state_code, lo.area, lo.agent_id
  ),
  areas as (
    select lo.state_code, lo.area, count(*)::integer as area_lost
      from lost lo
     where lo.area is not null
     group by lo.state_code, lo.area
    having count(*) >= 5
       and count(distinct lo.agent_id) >= 3
       and count(distinct lo.listing_id) >= 5
  ),
  fair as (
    -- No single lister above 60% of the area's total.
    select a.*
      from areas a
     where not exists (
       select 1 from per_lister p
        where p.state_code = a.state_code and p.area = a.area
          and p.n * 10 > a.area_lost * 6)
  ),
  cells as (
    select f.state_code, f.area, lo.lost_reason, count(*)::integer as lost,
           count(distinct lo.agent_id)::integer as listers, f.area_lost
      from lost lo
      join fair f on f.state_code = lo.state_code and f.area = lo.area
     group by f.state_code, f.area, lo.lost_reason, f.area_lost
  )
  select c.state_code, c.area,
         case when c.lost >= 5 and c.listers >= 3 then c.lost_reason else 'other' end,
         sum(c.lost)::integer, c.area_lost
    from cells c
   group by c.state_code, c.area,
            case when c.lost >= 5 and c.listers >= 3 then c.lost_reason else 'other' end,
            c.area_lost
   order by c.area_lost desc, c.area, sum(c.lost) desc;
end;
$function$;

comment on function public.lost_reasons_by_area(integer) is
  'V-72. Why enquiries were lost, by closed-list neighbourhood, over the last completed twelve-week block (p_weeks is ignored), leaving out the caller''s own: an area needs lost enquiries from at least three listers across five listings with no lister above 60% of it; a reason is named only with at least five enquiries from three listers, the rest fold into "other". Real listings only. Approved listers and staff.';

revoke all on function public.lost_reasons_by_area(integer) from public, anon;
grant execute on function public.lost_reasons_by_area(integer) to authenticated;
