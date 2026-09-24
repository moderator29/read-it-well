/*
 * V-41. THE NEIGHBOURS' ACCOUNT: LIGHT, WATER AND FLOODING AS RESIDENTS
 * REPORT THEM, BESIDE THE LISTER'S CLAIM. FIRST SLICE.
 *
 * A power band is the lister's claim, and a Band A feeder can still mean
 * rationed light. Flooding decides Lagos rents and no listing in Nigeria
 * states it. This adds a second, labelled source beside the lister's:
 *
 *   listings.flooding   the lister's own answer: none, road (the road, not
 *                       the compound) or compound. Null is "the lister has
 *                       not said", never good news.
 *   area_pulses         one-tap answers from members of an Around area:
 *                       light (most / some / none), water (normal / tanker /
 *                       none), flood (none / road / compound).
 *
 * The rules live in the functions, not in a client:
 *
 *   record_area_pulse   the caller must be a member of the area, and must
 *                       have joined it at least 14 days ago (a drive-by
 *                       cannot brigade an area). A lister with a published
 *                       listing in the area cannot pulse it (the collusion
 *                       principle). Light at most twice in seven days, water
 *                       once in 28, flood once in 90. Returns a word the UI
 *                       says in full; it never raises for a refusal.
 *   area_pulse_summary  counts per answer over a window (light 30 days, water
 *                       90, flood 365), for the Around area whose state and
 *                       area name match a listing's. A kind is returned ONLY
 *                       when at least five different members answered it (a
 *                       k-threshold): counts, never a grade, never a name.
 *   my_pulse_areas      the caller's own areas and what each may be asked
 *                       now, for the one-tap card.
 *
 * BORN LOCKED: area_pulses has RLS on and no grants; only the three functions
 * touch it. No existing table or policy is changed; `flooding` is an additive
 * nullable column written by the agent's own update.
 *
 * OFF UNTIL THE FOUNDER TURNS IT ON (review): every function checks the
 * fail-closed `feature_flags` row 'neighbours_account' and does nothing
 * (refuses, or returns no rows) unless it exists and says true. To open it:
 *   update public.feature_flags set enabled = true where key = 'neighbours_account';
 */

begin;

insert into public.feature_flags (key, enabled, note)
values ('neighbours_account', false, 'V-41: residents'' light, water and flood reports beside the lister''s claim. Off until the founder opens it.')
on conflict (key) do nothing;

/* True only when the flag row exists and says true. */
create or replace function private.neighbours_account_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'neighbours_account'), false);
$$;
revoke all on function private.neighbours_account_open() from public, anon, authenticated;

alter table public.listings
  add column if not exists flooding text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'listings_flooding_known' and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_flooding_known
        check (flooding is null or flooding in ('none', 'road', 'compound'));
  end if;
end
$$;

comment on column public.listings.flooding is
  'The lister''s answer to "in heavy rain, does water cut off the road or enter the compound?": none, road, compound. Null is unanswered (V-41).';

create table if not exists public.area_pulses (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references public.areas (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('light', 'water', 'flood')),
  answer     text not null,
  created_at timestamptz not null default now(),
  constraint area_pulses_answer_known check (
    (kind = 'light' and answer in ('most', 'some', 'none'))
    or (kind = 'water' and answer in ('normal', 'tanker', 'none'))
    or (kind = 'flood' and answer in ('none', 'road', 'compound'))
  )
);

create index if not exists area_pulses_area_kind_idx on public.area_pulses (area_id, kind, created_at desc);
create index if not exists area_pulses_user_idx on public.area_pulses (user_id, kind, created_at desc);

alter table public.area_pulses enable row level security;
revoke all on public.area_pulses from public, anon, authenticated;

comment on table public.area_pulses is
  'Residents'' one-tap reports of light, water and flooding per Around area (V-41). Read only through area_pulse_summary, which applies a five-member threshold.';

/* The gap each kind must leave since the caller's last answer to it. */
create or replace function private.area_pulse_allowed(p_user uuid, p_area uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_kind
    when 'light' then (
      select count(*) < 2 from public.area_pulses
       where user_id = p_user and area_id = p_area and kind = 'light'
         and created_at > now() - interval '7 days')
    when 'water' then not exists (
      select 1 from public.area_pulses
       where user_id = p_user and area_id = p_area and kind = 'water'
         and created_at > now() - interval '28 days')
    when 'flood' then not exists (
      select 1 from public.area_pulses
       where user_id = p_user and area_id = p_area and kind = 'flood'
         and created_at > now() - interval '90 days')
    else false
  end;
$$;

revoke execute on function private.area_pulse_allowed(uuid, uuid, text) from public, anon, authenticated;

/* True when the caller lists a published home in the area (the collusion rule). */
create or replace function private.area_pulse_lister(p_user uuid, p_area uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.areas ar
      join public.listings l
        on l.state_code = ar.state_code
       and lower(btrim(l.area)) = lower(btrim(ar.area))
      join public.agents a on a.id = l.agent_id
     where ar.id = p_area and a.user_id = p_user and l.status = 'PUBLISHED'
  );
$$;

revoke execute on function private.area_pulse_lister(uuid, uuid) from public, anon, authenticated;

create or replace function public.record_area_pulse(p_area uuid, p_kind text, p_answer text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  joined timestamptz;
begin
  if not private.neighbours_account_open() then
    return 'off';
  end if;
  if caller is null then
    return 'signed-out';
  end if;
  select m.joined_at into joined
    from public.area_members m
   where m.area_id = p_area and m.user_id = caller;
  if joined is null then
    return 'not-member';
  end if;
  if joined > now() - interval '14 days' then
    return 'too-new';
  end if;
  if not (
    (p_kind = 'light' and p_answer in ('most', 'some', 'none'))
    or (p_kind = 'water' and p_answer in ('normal', 'tanker', 'none'))
    or (p_kind = 'flood' and p_answer in ('none', 'road', 'compound'))
  ) then
    return 'bad-answer';
  end if;
  if private.area_pulse_lister(caller, p_area) then
    return 'lister';
  end if;
  if not private.area_pulse_allowed(caller, p_area, p_kind) then
    return 'already';
  end if;
  insert into public.area_pulses (area_id, user_id, kind, answer)
  values (p_area, caller, p_kind, p_answer);
  return 'ok';
end;
$$;

create or replace function public.area_pulse_summary(p_state text, p_area text)
returns table (area_name text, kind text, answer text, reports integer, members integer, window_days integer)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select ar.id, ar.name
      from public.areas ar
     where ar.state_code = p_state
       and lower(btrim(ar.area)) = lower(btrim(p_area))
       and ar.status = 'ACTIVE'
       and private.neighbours_account_open()
     order by (ar.kind = 'AREA') desc, ar.created_at
     limit 1
  ),
  windows (kind, days) as (
    values ('light', 30), ('water', 90), ('flood', 365)
  ),
  recent as (
    select p.kind, p.answer, p.user_id, w.days
      from public.area_pulses p
      join target t on t.id = p.area_id
      join windows w on w.kind = p.kind
     where p.created_at > now() - make_interval(days => w.days)
  ),
  enough as (
    select r.kind, count(distinct r.user_id)::integer as members
      from recent r
     group by r.kind
    having count(distinct r.user_id) >= 5
  )
  select (select name from target), r.kind, r.answer, count(*)::integer, e.members, max(r.days)::integer
    from recent r
    join enough e on e.kind = r.kind
   group by r.kind, r.answer, e.members
   order by r.kind, count(*) desc;
$$;

create or replace function public.my_pulse_areas()
returns table (area_id uuid, area_name text, eligible boolean, lister boolean, light boolean, water boolean, flood boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.area_id,
         ar.name,
         m.joined_at <= now() - interval '14 days',
         private.area_pulse_lister(m.user_id, m.area_id),
         private.area_pulse_allowed(m.user_id, m.area_id, 'light'),
         private.area_pulse_allowed(m.user_id, m.area_id, 'water'),
         private.area_pulse_allowed(m.user_id, m.area_id, 'flood')
    from public.area_members m
    join public.areas ar on ar.id = m.area_id
   where m.user_id = auth.uid() and ar.status = 'ACTIVE'
     and private.neighbours_account_open()
   order by m.joined_at;
$$;

revoke execute on function public.record_area_pulse(uuid, text, text) from public, anon;
revoke execute on function public.area_pulse_summary(text, text) from public, anon;
revoke execute on function public.my_pulse_areas() from public, anon;
grant execute on function public.record_area_pulse(uuid, text, text) to authenticated;
grant execute on function public.area_pulse_summary(text, text) to authenticated;
grant execute on function public.my_pulse_areas() to authenticated;

commit;
