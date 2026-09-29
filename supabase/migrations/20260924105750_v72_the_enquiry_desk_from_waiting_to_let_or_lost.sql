-- V-72: THE ENQUIRY DESK. FROM "WAITING" TO LET OR LOST, WITH A REASON.
--
-- A good agent runs twenty conversations at once with nothing but memory. The
-- inbox listed them by waiting time, which is the right first opinion and not
-- a tool. Each listing enquiry now has a stage: New, Replied, Viewing booked,
-- Viewed, Offer made, then Let or Lost (with one reason).
--
-- STAGES ADVANCE BY THEMSELVES WHERE AN EVENT PROVES THEM, and by hand
-- otherwise. `enquiry_stage_facts` reads the proof for each of the caller's
-- threads: a reply from the lister (Replied), an inspection CONFIRMED (Viewing
-- booked), COMPLETED (Viewed), COMPLETED with the outcome `deal_done` (Offer
-- made), and a `rent_payments` row for this listing and this renter (Let). It
-- returns the proven stage and when it was proven beside whatever the lister
-- set by hand, and the page combines them (`lib/enquiry/stage.ts`): the
-- further of the two wins, a payment always wins, and a thread marked Lost
-- stays lost until an event AFTER the marking proves it moved on.
--
-- ONE ROW PER THREAD, THE LISTER'S OWN. `enquiry_stages` holds only what the
-- lister set by hand. It is readable by that thread's lister and written only
-- through `set_enquiry_stage`, which checks the caller is the thread's lister,
-- that the stage is one of the six, and that Lost carries exactly one reason
-- from the closed list and nothing else does. The renter never sees the stage
-- or the reason.
--
-- LOST REASONS ARE MARKET DATA ONLY IN AGGREGATE. `lost_reasons_by_area`
-- counts them by the listing's area (a neighbourhood name that passes the
-- rule-ten test, `private.public_text_is_safe`), only where at least five
-- threads were lost in that area in the window (k = 5), never naming a
-- listing, a lister or a renter, and never counting an example listing.
-- Listers and staff only.

create table if not exists public.enquiry_stages (
  conversation_id  uuid primary key references public.conversations(id) on delete cascade,
  stage            text not null check (stage in ('replied', 'viewing_booked', 'viewed', 'offer', 'let', 'lost')),
  lost_reason      text check (lost_reason in ('price', 'fees', 'location', 'condition', 'went_elsewhere', 'no_response')),
  set_at           timestamptz not null default now(),
  set_by           uuid references auth.users(id) on delete set null,
  constraint enquiry_stages_reason_only_when_lost check ((stage = 'lost') = (lost_reason is not null))
);

comment on table public.enquiry_stages is
  'V-72. The stage a lister set BY HAND on one listing enquiry, and the one reason when it was lost. Proven stages are read live by enquiry_stage_facts and never stored here. Read by the thread''s lister; written only through set_enquiry_stage.';

create index if not exists enquiry_stages_lost_idx on public.enquiry_stages (set_at) where stage = 'lost';

alter table public.enquiry_stages enable row level security;
revoke all on public.enquiry_stages from public, anon, authenticated;
grant select on public.enquiry_stages to authenticated;
grant all on public.enquiry_stages to service_role;

drop policy if exists enquiry_stages_lister_reads on public.enquiry_stages;
create policy enquiry_stages_lister_reads on public.enquiry_stages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
     where c.id = enquiry_stages.conversation_id
       and c.agent_id = (select auth.uid())
  ));

create or replace function public.set_enquiry_stage(p_conversation uuid, p_stage text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.conversations c
     where c.id = p_conversation and c.agent_id = caller and c.context_kind = 'listing'::public.thread_context
  ) then
    raise exception 'not your enquiry' using errcode = '42501';
  end if;

  -- "New" by hand means: forget what I set, and show only what is proven.
  if p_stage is null or p_stage = 'new' then
    delete from public.enquiry_stages where conversation_id = p_conversation;
    return;
  end if;
  if p_stage not in ('replied', 'viewing_booked', 'viewed', 'offer', 'let', 'lost') then
    raise exception 'unknown stage' using errcode = '22023';
  end if;
  if (p_stage = 'lost') <> (p_reason is not null) then
    raise exception 'a lost enquiry takes exactly one reason, and nothing else takes one' using errcode = '22023';
  end if;

  insert into public.enquiry_stages (conversation_id, stage, lost_reason, set_at, set_by)
  values (p_conversation, p_stage, p_reason, now(), caller)
  on conflict (conversation_id) do update
    set stage = excluded.stage,
        lost_reason = excluded.lost_reason,
        set_at = excluded.set_at,
        set_by = excluded.set_by;
end;
$function$;

comment on function public.set_enquiry_stage(uuid, text, text) is
  'V-72. The thread''s lister sets a stage by hand ("new" clears it). Lost takes exactly one reason from the closed list. Listing enquiries only.';

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
           (select min(rp.created_at) from public.rent_payments rp
             where rp.listing_id = m.listing_id and rp.tenant_id = m.guest_id) as let_at,
           (select max(coalesce(ir.responded_at, ir.updated_at)) from public.inspection_requests ir
             where (ir.conversation_id = m.id or (ir.listing_id = m.listing_id and ir.requester_id = m.guest_id))
               and ir.state = 'COMPLETED'::public.inspection_state and ir.outcome = 'deal_done') as offer_at,
           (select max(coalesce(ir.responded_at, ir.updated_at)) from public.inspection_requests ir
             where (ir.conversation_id = m.id or (ir.listing_id = m.listing_id and ir.requester_id = m.guest_id))
               and ir.state = 'COMPLETED'::public.inspection_state) as viewed_at,
           (select max(coalesce(ir.responded_at, ir.updated_at)) from public.inspection_requests ir
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
  'V-72. For each of the caller''s listing enquiries: the furthest stage an event proves and when, beside the stage set by hand. Only the caller''s own threads; the page combines them.';

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
       exists (select 1 from public.agents a where a.user_id = caller)
       or private.has_role(caller, 'admin'::public.app_role)
       or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'listers and staff only' using errcode = '42501';
  end if;

  return query
  with lost as (
    select l.state_code, btrim(l.area) as area, s.lost_reason
      from public.enquiry_stages s
      join public.conversations c on c.id = s.conversation_id
      join public.listings l on l.id = c.listing_id
     where s.stage = 'lost'
       and s.set_at >= now() - make_interval(weeks => greatest(least(coalesce(p_weeks, 12), 52), 1))
       and l.is_demo = false
       and private.public_text_is_safe(l.area)
  ),
  areas as (
    select lo.state_code, lower(lo.area) as area_key, min(lo.area) as area, count(*)::integer as area_lost
      from lost lo
     group by lo.state_code, lower(lo.area)
    having count(*) >= 5
  )
  select a.state_code, a.area, lo.lost_reason, count(*)::integer, a.area_lost
    from lost lo
    join areas a on a.state_code is not distinct from lo.state_code and a.area_key = lower(lo.area)
   group by a.state_code, a.area, lo.lost_reason, a.area_lost
   order by a.area_lost desc, a.area, count(*) desc;
end;
$function$;

comment on function public.lost_reasons_by_area(integer) is
  'V-72. Why enquiries were lost, by area, over the last N weeks (1 to 52): only areas with at least five lost enquiries, only real listings, only area names that pass the rule-ten test. Counts only. Listers and staff.';

revoke all on function public.set_enquiry_stage(uuid, text, text) from public, anon;
revoke all on function public.enquiry_stage_facts() from public, anon;
revoke all on function public.lost_reasons_by_area(integer) from public, anon;
grant execute on function public.set_enquiry_stage(uuid, text, text) to authenticated;
grant execute on function public.enquiry_stage_facts() to authenticated;
grant execute on function public.lost_reasons_by_area(integer) to authenticated;
