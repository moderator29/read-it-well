/*
 * V-42. THE OWNER'S BUILDINGS, AND AGENTS PITCHING FOR THE MANDATE.
 *
 * An owner (a lister whose listings carry `listing_role = 'owner'`) sees every
 * unit they list, grouped by place: which are let, until when (the tenancy end
 * worked out from the paid rent charge's move-in date and period), what each
 * let achieved, which agents list the same flat (V-37's property identity),
 * and which agent the owner has given the mandate to.
 *
 * For a unit that is not let, the owner can invite agents to pitch. The brief
 * an agent sees is facts only: the place from the closed list (never the
 * area the owner typed, never the address), bedrooms, type and the owner's
 * asking band. Only a VERIFIED, trading agent who already lists in the same
 * place (or, failing a place on the list, the same city and state) sees it.
 * The agent answers with a short note, and the owner reads each pitch beside
 * the agent's record as the platform knows it: lets through Vallo, live
 * listings, time on Vallo. (V-34's Record replaces that line when it lands.)
 * The owner awards one or more pitches; the awarded agent is told to list the
 * unit with the owner named as principal, which is where `listing_mandates`
 * takes it from.
 *
 * Depends on 20260924110000 (`listings.property_id`) and 20260924110500
 * (`private.listing_place_name`).
 */

create table if not exists public.mandate_invitations (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references public.listings(id) on delete cascade,
  owner_user        uuid not null references auth.users(id) on delete cascade,
  place_name        text not null,
  city              text,
  state_code        text,
  bedrooms          integer,
  property_type     public.property_type,
  asking_min_minor  bigint not null check (asking_min_minor > 0),
  asking_max_minor  bigint not null,
  rent_period       public.rent_period not null default 'year',
  status            text not null default 'open' check (status in ('open', 'awarded', 'withdrawn')),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '14 days',
  constraint mandate_invitations_band check (asking_max_minor >= asking_min_minor)
);

comment on table public.mandate_invitations is
  'V-42: an owner inviting verified agents in the area to pitch for the mandate on one unit. The brief carries facts only: a place from the closed list, bedrooms, type and the asking band; never the address or anything the owner typed.';

create unique index if not exists mandate_invitations_one_open
  on public.mandate_invitations (listing_id) where status = 'open';
create index if not exists mandate_invitations_place_idx
  on public.mandate_invitations (state_code, place_name) where status = 'open';

create table if not exists public.mandate_pitches (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid not null references public.mandate_invitations(id) on delete cascade,
  agent_id       uuid not null references public.agents(id) on delete cascade,
  note           text not null check (char_length(btrim(note)) between 10 and 600),
  created_at     timestamptz not null default now(),
  awarded_at     timestamptz,
  unique (invitation_id, agent_id)
);

comment on table public.mandate_pitches is
  'V-42: a verified agent answering an owner''s invitation. The owner awards one or more.';

revoke all on public.mandate_invitations from public, anon, authenticated;
revoke all on public.mandate_pitches from public, anon, authenticated;
grant all on public.mandate_invitations to service_role;
grant all on public.mandate_pitches to service_role;
alter table public.mandate_invitations enable row level security;
alter table public.mandate_pitches enable row level security;
/* No client policy: every read and write goes through the definer functions
   below, which decide who may see a brief. Staff read through them too. */

/* A verified, trading, non-example agent row for the caller, or null. */
create or replace function private.my_verified_agent()
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select a.id
    from public.agents a
   where a.user_id = (select auth.uid())
     and a.status = 'APPROVED'::public.agent_application_status
     and a.is_demo = false
     and (a.verified or a.verification_tier > 0)
   limit 1;
$function$;

revoke all on function private.my_verified_agent() from public, anon, authenticated;

/* Does this agent list in the invitation's place? The closed-list place first;
   an invitation whose place is only a city or state matches on that. */
create or replace function private.agent_works_in(p_agent uuid, p_invitation uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.mandate_invitations i
      join public.listings l on l.agent_id = p_agent
     where i.id = p_invitation
       and l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
       and l.state_code is not distinct from i.state_code
       and private.listing_place_name(l.id) = i.place_name);
$function$;

revoke all on function private.agent_works_in(uuid, uuid) from public, anon, authenticated;

create or replace function public.mandate_invite(
  p_listing uuid,
  p_min_minor bigint,
  p_max_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l public.listings%rowtype;
  inv uuid;
  a record;
  n integer := 0;
  words text;
begin
  if (select auth.uid()) is null or not private.owns_listing(p_listing) then
    raise exception 'only the owner of this unit can invite agents' using errcode = 'insufficient_privilege';
  end if;
  select * into l from public.listings where id = p_listing;
  if l.listing_role is distinct from 'owner'::public.listing_role or l.is_demo
     or l.listing_intent <> 'rent'::public.listing_intent then
    raise exception 'agents are invited for a rental you list as its owner' using errcode = 'check_violation';
  end if;
  if l.closed_at is not null and l.close_reason in ('let_through_vallo', 'let_elsewhere', 'let_owner_confirmed', 'let_same_property') then
    raise exception 'this unit is let, so there is no mandate to give' using errcode = 'check_violation';
  end if;
  if p_min_minor is null or p_min_minor <= 0 or p_max_minor is null or p_max_minor < p_min_minor
     or p_max_minor > p_min_minor * 3 then
    raise exception 'give an asking range, lowest first, the highest no more than three times the lowest' using errcode = 'check_violation';
  end if;

  insert into public.mandate_invitations
    (listing_id, owner_user, place_name, city, state_code, bedrooms, property_type,
     asking_min_minor, asking_max_minor, rent_period)
  values
    (l.id, (select auth.uid()), private.listing_place_name(l.id), nullif(btrim(l.city), ''), l.state_code,
     l.bedrooms, l.property_type, p_min_minor, p_max_minor, coalesce(l.rent_period, 'year'::public.rent_period))
  returning id into inv;

  words := private.listing_place_words(l.id);
  for a in
    select distinct ag.id, ag.user_id
      from public.agents ag
     where ag.status = 'APPROVED'::public.agent_application_status
       and ag.is_demo = false
       and (ag.verified or ag.verification_tier > 0)
       and ag.id <> l.agent_id
       and private.agent_works_in(ag.id, inv)
     limit 50
  loop
    perform private.notify(a.user_id, 'agent'::public.notification_kind,
      'An owner is choosing an agent',
      'The owner of a ' || words || ' is inviting verified agents who work there to pitch for the mandate.',
      '/agent/portfolio');
    n := n + 1;
  end loop;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'mandate.invite', 'listing', l.id::text,
          jsonb_build_object('invitation_id', inv, 'agents_told', n));
  return jsonb_build_object('invitation_id', inv, 'agents_told', n);
end;
$function$;

revoke all on function public.mandate_invite(uuid, bigint, bigint) from public, anon;
grant execute on function public.mandate_invite(uuid, bigint, bigint) to authenticated;

create or replace function public.mandate_withdraw(p_invitation uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  update public.mandate_invitations
     set status = 'withdrawn'
   where id = p_invitation and owner_user = (select auth.uid()) and status = 'open';
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.mandate_withdraw(uuid) from public, anon;
grant execute on function public.mandate_withdraw(uuid) to authenticated;

/* The briefs a verified agent may see: open, unexpired, in a place they list in. */
create or replace function public.mandate_briefs()
returns table (
  invitation_id uuid,
  place_name text,
  bedrooms integer,
  property_type public.property_type,
  asking_min_minor bigint,
  asking_max_minor bigint,
  rent_period public.rent_period,
  expires_at timestamptz,
  pitched boolean,
  awarded boolean
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  me uuid := private.my_verified_agent();
begin
  if me is null then
    return;
  end if;
  return query
  select i.id, i.place_name, i.bedrooms, i.property_type, i.asking_min_minor, i.asking_max_minor,
         i.rent_period, i.expires_at,
         exists (select 1 from public.mandate_pitches p where p.invitation_id = i.id and p.agent_id = me),
         exists (select 1 from public.mandate_pitches p where p.invitation_id = i.id and p.agent_id = me and p.awarded_at is not null)
    from public.mandate_invitations i
    join public.listings l on l.id = i.listing_id
   where ((i.status = 'open' and i.expires_at > now())
          or exists (select 1 from public.mandate_pitches p where p.invitation_id = i.id and p.agent_id = me))
     and l.agent_id <> me
     and private.agent_works_in(me, i.id)
   order by i.created_at desc
   limit 50;
end;
$function$;

revoke all on function public.mandate_briefs() from public, anon;
grant execute on function public.mandate_briefs() to authenticated;

create or replace function public.mandate_pitch(p_invitation uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me uuid := private.my_verified_agent();
  i public.mandate_invitations%rowtype;
begin
  if me is null then
    raise exception 'only a verified agent can pitch for a mandate' using errcode = 'insufficient_privilege';
  end if;
  select * into i from public.mandate_invitations where id = p_invitation;
  if i.id is null or i.status <> 'open' or i.expires_at <= now() or not private.agent_works_in(me, i.id)
     or exists (select 1 from public.listings l where l.id = i.listing_id and l.agent_id = me) then
    raise exception 'this invitation is not open to you' using errcode = 'insufficient_privilege';
  end if;
  if p_note is null or char_length(btrim(p_note)) not between 10 and 600 then
    raise exception 'say in a few lines why you are the agent for this unit' using errcode = 'check_violation';
  end if;
  insert into public.mandate_pitches (invitation_id, agent_id, note)
  values (i.id, me, btrim(p_note))
  on conflict (invitation_id, agent_id) do update set note = excluded.note, created_at = now()
    where public.mandate_pitches.awarded_at is null;
  perform private.notify(i.owner_user, 'listing'::public.notification_kind,
    'An agent has pitched for your unit',
    'A verified agent answered your invitation for the ' || private.listing_place_words(i.listing_id) || '. Compare their record and choose.',
    '/agent/portfolio');
  return jsonb_build_object('state', 'pitched');
end;
$function$;

revoke all on function public.mandate_pitch(uuid, text) from public, anon;
grant execute on function public.mandate_pitch(uuid, text) to authenticated;

/* The owner's side: every pitch on their invitation, with the record as the
   platform knows it. Never the agent's number. */
create or replace function public.mandate_pitches_for(p_invitation uuid)
returns table (
  pitch_id uuid,
  agent_name text,
  verified_tier smallint,
  on_vallo_since timestamptz,
  lets_through_vallo integer,
  live_listings integer,
  note text,
  created_at timestamptz,
  awarded_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not exists (select 1 from public.mandate_invitations i
                  where i.id = p_invitation and (i.owner_user = (select auth.uid()) or private.is_staff())) then
    raise exception 'only the owner can read the pitches' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.id,
         coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), ''), 'A verified agent'),
         a.verification_tier,
         a.created_at,
         (select count(*)::integer from public.listings x
           where x.agent_id = a.id and x.close_reason = 'let_through_vallo'),
         (select count(*)::integer from public.listings x
           where x.agent_id = a.id and x.status = 'PUBLISHED'::public.listing_status and x.is_demo = false),
         p.note, p.created_at, p.awarded_at
    from public.mandate_pitches p
    join public.agents a on a.id = p.agent_id
    left join public.businesses b on b.id = a.firm_id
   where p.invitation_id = p_invitation
   order by p.awarded_at nulls last, p.created_at;
end;
$function$;

revoke all on function public.mandate_pitches_for(uuid) from public, anon;
grant execute on function public.mandate_pitches_for(uuid) to authenticated;

create or replace function public.mandate_award(p_pitch uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  p public.mandate_pitches%rowtype;
  i public.mandate_invitations%rowtype;
  agent_user uuid;
begin
  select * into p from public.mandate_pitches where id = p_pitch for update;
  select * into i from public.mandate_invitations where id = p.invitation_id;
  if i.id is null or i.owner_user is distinct from (select auth.uid()) then
    raise exception 'only the owner can give the mandate' using errcode = 'insufficient_privilege';
  end if;
  if i.status = 'withdrawn' then
    raise exception 'this invitation was withdrawn' using errcode = 'check_violation';
  end if;
  if p.awarded_at is not null then
    return jsonb_build_object('state', 'already');
  end if;
  update public.mandate_pitches set awarded_at = now() where id = p.id;
  update public.mandate_invitations set status = 'awarded' where id = i.id;
  select a.user_id into agent_user from public.agents a where a.id = p.agent_id;
  perform private.notify(agent_user, 'agent'::public.notification_kind,
    'You have the mandate',
    'The owner of the ' || private.listing_place_words(i.listing_id) || ' chose you. List the unit and attach the mandate with the owner named as principal.',
    '/agent/listings');
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'mandate.award', 'mandate_invitation', i.id::text,
          jsonb_build_object('agent_id', p.agent_id, 'listing_id', i.listing_id));
  return jsonb_build_object('state', 'awarded');
end;
$function$;

revoke all on function public.mandate_award(uuid) from public, anon;
grant execute on function public.mandate_award(uuid) to authenticated;

/* The owner's units: let or not, until when, for how much, who else lists the
   same flat, and whom they gave the mandate. */
create or replace function public.my_buildings()
returns table (
  listing_id uuid,
  place_name text,
  bedrooms integer,
  property_type public.property_type,
  status public.listing_status,
  let_state text,
  tenancy_ends_on date,
  achieved_rent_minor bigint,
  rent_period public.rent_period,
  other_listers text[],
  mandate_holders text[],
  invitation_id uuid,
  invitation_status text,
  pitch_count integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  with mine as (
    select l.*
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where a.user_id = (select auth.uid())
       and l.listing_role = 'owner'::public.listing_role
       and l.is_demo = false
       and l.listing_intent = 'rent'::public.listing_intent
  ),
  paid as (
    select distinct on (rp.listing_id) rp.listing_id, rp.move_in, rp.rent_period, rp.rent_minor
      from public.rent_payments rp
      join mine m on m.id = rp.listing_id
     where exists (select 1 from public.transactions tx
                    where tx.booking_id = rp.booking_id
                      and tx.status = 'SUCCESSFUL'::public.transaction_status)
     order by rp.listing_id, rp.move_in desc nulls last, rp.created_at desc
  )
  select m.id,
         private.listing_place_name(m.id),
         m.bedrooms,
         m.property_type,
         m.status,
         case
           when p.listing_id is not null
                and (p.move_in + case p.rent_period when 'month' then interval '1 month'
                                                    when 'quarter' then interval '3 months'
                                                    else interval '1 year' end)::date >= current_date then 'let'
           when m.close_reason in ('let_through_vallo', 'let_elsewhere', 'let_owner_confirmed', 'let_same_property') then 'let'
           else 'vacant'
         end,
         case when p.listing_id is not null then
           (p.move_in + case p.rent_period when 'month' then interval '1 month'
                                          when 'quarter' then interval '3 months'
                                          else interval '1 year' end)::date end,
         p.rent_minor,
         p.rent_period,
         array(select distinct coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), ''))
                 from public.listings o
                 join public.agents ag on ag.id = o.agent_id
                 left join public.businesses b on b.id = o.firm_id
                where m.property_id is not null and o.property_id = m.property_id and o.id <> m.id
                  and o.is_demo = false and o.closed_at is null
                  and o.status = 'PUBLISHED'::public.listing_status),
         array(select coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), ''))
                 from public.mandate_invitations i
                 join public.mandate_pitches pt on pt.invitation_id = i.id and pt.awarded_at is not null
                 join public.agents ag on ag.id = pt.agent_id
                 left join public.businesses b on b.id = ag.firm_id
                where i.listing_id = m.id
                order by pt.awarded_at),
         inv.id, inv.status,
         (select count(*)::integer from public.mandate_pitches pt where pt.invitation_id = inv.id)
    from mine m
    left join paid p on p.listing_id = m.id
    left join lateral (
      select i.id, i.status from public.mandate_invitations i
       where i.listing_id = m.id and i.status <> 'withdrawn'
       order by i.created_at desc limit 1) inv on true
   order by 2, m.bedrooms, m.created_at;
$function$;

revoke all on function public.my_buildings() from public, anon;
grant execute on function public.my_buildings() to authenticated;
