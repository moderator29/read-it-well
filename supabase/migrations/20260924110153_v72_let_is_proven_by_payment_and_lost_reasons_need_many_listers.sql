-- V-72, REVIEW FIX: LET IS PROVEN BY PAYMENT, STAGES ARE DATED BY THEIR OWN
-- TRANSITIONS, AND LOST REASONS NEED MANY LISTERS BEFORE THEY SHOW.
--
-- 1. A rent_payments row is created UNPAID when an inspection is accepted,
--    so "Let" was proven by a charge nobody paid, and it overrode a Lost.
--    Let is now proven only by a SUCCESSFUL transaction on the charge's
--    booking, the proof close_listing already uses.
-- 2. Stages were dated by updated_at, which any edit to the row moves, so an
--    old viewing could "reopen" a thread marked Lost. inspection_requests now
--    records confirmed_at and completed_at when those transitions happen
--    (a trigger; backfilled from the best dates the rows hold), and the desk
--    reads those.
-- 3. lost_reasons_by_area showed an area on five lost THREADS, which one
--    lister with one listing could supply. An area now needs lost enquiries
--    from at least three different listers across at least five different
--    listings, a reason is shown only where at least five enquiries give it
--    (the rest are counted as "other reasons"), and only APPROVED agents and
--    staff may read it.

alter table public.inspection_requests add column if not exists confirmed_at timestamptz;
alter table public.inspection_requests add column if not exists completed_at timestamptz;

comment on column public.inspection_requests.confirmed_at is
  'V-72. When the viewing became CONFIRMED (a trigger stamps it). Backfilled from responded_at for rows confirmed before it existed.';
comment on column public.inspection_requests.completed_at is
  'V-72. When the viewing became COMPLETED (a trigger stamps it). Backfilled from updated_at for rows completed before it existed.';

-- One statement, from values captured before it runs: a first UPDATE would
-- move updated_at (set_updated_at) and a second would then date every
-- COMPLETED row to the migration. COMPLETED rows take both stamps here.
with before as (
  select ir.id, ir.state, ir.responded_at, ir.updated_at
    from public.inspection_requests ir
   where ir.state in ('CONFIRMED', 'COMPLETED')
     and (ir.confirmed_at is null or (ir.state = 'COMPLETED' and ir.completed_at is null))
)
update public.inspection_requests ir
   set completed_at = case when b.state = 'COMPLETED' then coalesce(ir.completed_at, b.updated_at) else ir.completed_at end,
       confirmed_at = coalesce(ir.confirmed_at, b.responded_at, b.updated_at)
  from before b
 where ir.id = b.id;

create or replace function private.stamp_inspection_transitions()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.state = 'CONFIRMED'::public.inspection_state
     and (tg_op = 'INSERT' or old.state is distinct from new.state) then
    new.confirmed_at := now();
  end if;
  if new.state = 'COMPLETED'::public.inspection_state
     and (tg_op = 'INSERT' or old.state is distinct from new.state) then
    new.completed_at := now();
  end if;
  return new;
end;
$function$;

revoke all on function private.stamp_inspection_transitions() from public, anon, authenticated;

drop trigger if exists inspection_requests_stamp_transitions on public.inspection_requests;
create trigger inspection_requests_stamp_transitions
  before insert or update of state on public.inspection_requests
  for each row execute function private.stamp_inspection_transitions();

create or replace function public.enquiry_stage_facts()
returns table (
  conversation_id  uuid,
  proven_stage     text,
  proven_at        timestamptz,
  manual_stage     text,
  lost_reason      text,
  manual_at        timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  with mine as (
    select c.id, c.guest_id, c.agent_id, c.listing_id
      from public.conversations c
     where c.agent_id = (select auth.uid())
       and c.context_kind = 'listing'::public.thread_context
  ),
  proof as (
    select m.id,
           -- LET IS PROVEN BY MONEY THAT MOVED: a rent charge for this listing
           -- and this renter whose booking has a SUCCESSFUL transaction (the
           -- same proof close_listing uses). A charge opened at acceptance and
           -- never paid proves nothing.
           (select min(tx.created_at) from public.rent_payments rp
              join public.transactions tx on tx.booking_id = rp.booking_id
             where rp.listing_id = m.listing_id and rp.tenant_id = m.guest_id
               and tx.status = 'SUCCESSFUL'::public.transaction_status) as let_at,
           -- Each stage dated by ITS OWN transition (confirmed_at,
           -- completed_at), never by updated_at, which any edit moves.
           (select max(ir.completed_at) from public.inspection_requests ir
             where (ir.conversation_id = m.id or (ir.listing_id = m.listing_id and ir.requester_id = m.guest_id))
               and ir.state = 'COMPLETED'::public.inspection_state and ir.outcome = 'deal_done') as offer_at,
           (select max(ir.completed_at) from public.inspection_requests ir
             where (ir.conversation_id = m.id or (ir.listing_id = m.listing_id and ir.requester_id = m.guest_id))
               and ir.state = 'COMPLETED'::public.inspection_state) as viewed_at,
           (select max(ir.confirmed_at) from public.inspection_requests ir
             where (ir.conversation_id = m.id or (ir.listing_id = m.listing_id and ir.requester_id = m.guest_id))
               and ir.state = 'CONFIRMED'::public.inspection_state) as booked_at,
           (select min(msg.created_at) from public.messages msg
             where msg.conversation_id = m.id and msg.sender_id = m.agent_id) as replied_at
      from mine m
  )
  select p.id,
         case when p.let_at is not null then 'let'
              when p.offer_at is not null then 'offer'
              when p.viewed_at is not null then 'viewed'
              when p.booked_at is not null then 'viewing_booked'
              when p.replied_at is not null then 'replied'
              else 'new' end,
         coalesce(p.let_at, p.offer_at, p.viewed_at, p.booked_at, p.replied_at),
         s.stage,
         s.lost_reason,
         s.set_at
    from proof p
    left join public.enquiry_stages s on s.conversation_id = p.id;
$function$;

comment on function public.enquiry_stage_facts() is
  'V-72. For each of the caller''s listing enquiries: the furthest stage an event proves (Let only by a SUCCESSFUL payment) and when, dated by the transition itself, beside the stage set by hand.';

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
begin
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
       and s.set_at >= now() - make_interval(weeks => greatest(least(coalesce(p_weeks, 12), 52), 1))
       and l.is_demo = false
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
  cells as (
    select a.state_code, a.area, lo.lost_reason, count(*)::integer as lost, a.area_lost
      from lost lo
      join areas a on a.state_code = lo.state_code and a.area = lo.area
     group by a.state_code, a.area, lo.lost_reason, a.area_lost
  )
  -- A reason given fewer than five times is not shown by name; it is folded
  -- into "other".
  select c.state_code, c.area, case when c.lost >= 5 then c.lost_reason else 'other' end,
         sum(c.lost)::integer, c.area_lost
    from cells c
   group by c.state_code, c.area, case when c.lost >= 5 then c.lost_reason else 'other' end, c.area_lost
   order by c.area_lost desc, c.area, sum(c.lost) desc;
end;
$function$;

comment on function public.lost_reasons_by_area(integer) is
  'V-72. Why enquiries were lost, by closed-list neighbourhood, over the last N weeks (1 to 52): only areas with lost enquiries from at least three listers across at least five listings; a reason under five is folded into "other". Real listings only. Approved listers and staff.';

revoke all on function public.enquiry_stage_facts() from public, anon;
revoke all on function public.lost_reasons_by_area(integer) from public, anon;
grant execute on function public.enquiry_stage_facts() to authenticated;
grant execute on function public.lost_reasons_by_area(integer) to authenticated;
