-- D76: two public leaderboards (referrals, and the top performers on Vallo)
-- and one directory of the people and businesses behind the supply, on both
-- sides. Applied 7 October 2026; the lead added the revokes on the private
-- helpers at the end. Full rationale in the pending header (git history of
-- supabase/migrations/pending/d76_leaderboards_and_directory.sql).
--
--  * Boards rank by COUNTS over a period, never by money. No naira figure,
--    email, phone, address, reward or member id leaves these functions.
--  * Only VERIFIED, APPROVED or PUBLISHED, non-demo workspaces, and only real
--    activity: a subject with a count of zero is not on a board. Nothing is
--    seeded and nothing is invented to fill one.
--  * OPT-OUT: one table, written only through leaderboard_set_hidden(); RLS
--    on and no policy at all.
-- Read-only for everybody but the opt-out. No RLS on an existing table, no
-- payment, agreement or auth logic is touched.

-- ------------------------------------------------------------------ opt-out

create table if not exists public.leaderboard_opt_outs (
  subject_kind text not null check (subject_kind in ('member', 'business')),
  subject_id   uuid not null,
  owner_id     uuid not null,
  created_at   timestamptz not null default now(),
  primary key (subject_kind, subject_id)
);

comment on table public.leaderboard_opt_outs is
  'D76: a member or a business taken off the public leaderboards (and a member off the directory). Written only by public.leaderboard_set_hidden(); RLS on with no policy.';

alter table public.leaderboard_opt_outs enable row level security;
revoke all on table public.leaderboard_opt_outs from public, anon, authenticated;

create or replace function private.leaderboard_hidden(p_kind text, p_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.leaderboard_opt_outs o where o.subject_kind = p_kind and o.subject_id = p_id);
$$;

-- ------------------------------------------------------------------ windows

-- [from, to) for a period. 'month' is the Lagos calendar month; anything else
-- is all time. p_previous gives the window movement is measured against.
create or replace function private.leaderboard_window(p_period text, p_previous boolean)
returns table (from_at timestamptz, to_at timestamptz)
language plpgsql stable set search_path = '' as $$
declare
  local_start timestamp := date_trunc('month', now() at time zone 'Africa/Lagos');
  month_start timestamptz := local_start at time zone 'Africa/Lagos';
begin
  if p_period = 'month' then
    if p_previous then
      return query select (local_start - interval '1 month') at time zone 'Africa/Lagos', month_start;
    else
      return query select month_start, 'infinity'::timestamptz;
    end if;
  elsif p_previous then
    return query select '-infinity'::timestamptz, month_start;
  else
    return query select '-infinity'::timestamptz, 'infinity'::timestamptz;
  end if;
end $$;

-- A person's public name: the label they chose for their public profile, else
-- their first name and the initial of their surname. Never an email.
create or replace function private.leaderboard_person_name(p_user uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce(
    (select nullif(btrim(sp.display_label), '') from public.social_profiles sp where sp.user_id = p_user),
    (select nullif(btrim(concat_ws(' ', nullif(btrim(p.first_name), ''),
                                  case when nullif(btrim(p.surname), '') is null then null
                                       else left(btrim(p.surname), 1) || '.' end)), '')
       from public.profiles p where p.id = p_user),
    'Vallo member');
$$;

-- Where a business opens: a restaurant at /restaurant/<business id>, a stay
-- business at /stay/<its first published accommodation id>. Both ids are
-- already public (the catalogue links them). A firm has no public page yet.
create or replace function private.business_ref(p_business uuid, p_kind text)
returns text language sql stable set search_path = '' as $$
  select case
    when p_kind = 'restaurant' then p_business::text
    when p_kind = 'agency' then null
    else (select ac.id::text from public.accommodations ac
           where ac.business_id = p_business and ac.status::text = 'PUBLISHED' and not ac.is_demo
           order by ac.published_at nulls last, ac.id limit 1)
  end;
$$;

-- ------------------------------------------------------------------- scores

-- Every subject on a board with its count in a window. Private: the public
-- read below strips subject_id and owner_id before anything leaves.
create or replace function private.leaderboard_scores(p_board text, p_state text, p_from timestamptz, p_to timestamptz)
returns table (
  subject_kind text, subject_id uuid, owner_id uuid, kind text, display_name text,
  ref text, avatar_url text, state_code text, verified boolean, score int
)
language sql stable set search_path = '' as $$
  -- Referrals: qualified and onward, never pending or reversed.
  select 'member', r.referrer_id, r.referrer_id, 'member',
         private.leaderboard_person_name(r.referrer_id),
         max(sp.handle), max(coalesce(nullif(sp.avatar_path, ''), nullif(p.avatar_url, ''))),
         max(coalesce(sp.state_code, p.state_code)), true, count(*)::int
    from public.referrals r
    left join public.social_profiles sp on sp.user_id = r.referrer_id
    left join public.profiles p on p.id = r.referrer_id
   where p_board = 'referrals'
     and r.status in ('qualified', 'approved', 'available', 'processing', 'paid')
     and r.qualified_at >= p_from and r.qualified_at < p_to
     and (p_state is null or coalesce(sp.state_code, p.state_code) = p_state)
     and not private.leaderboard_hidden('member', r.referrer_id)
   group by r.referrer_id

  union all

  -- Property: rent deals paid through Vallo, credited to the listing's agent.
  select 'agent', a.id, a.user_id,
         case when a.role::text = 'owner' then 'landlord' else 'agent' end,
         coalesce(nullif(btrim(a.display_name), ''), private.leaderboard_person_name(a.user_id)),
         max(sp.handle), max(nullif(sp.avatar_path, '')),
         mode() within group (order by l.state_code), true, count(distinct d.id)::int
    from public.agents a
    join public.listings l on l.agent_id = a.id and not l.is_demo
    join public.deal_agreements d on d.listing_id = l.id and d.kind = 'rent' and d.status = 'paid'
    left join public.social_profiles sp on sp.user_id = a.user_id
   where p_board = 'property'
     and a.status::text = 'APPROVED' and a.verified and not a.is_demo
     -- A landlord is a private person: ranked only once they chose a public handle.
     and (a.role::text <> 'owner' or sp.handle is not null)
     and d.paid_at >= p_from and d.paid_at < p_to
     and (p_state is null or l.state_code = p_state)
     and not private.leaderboard_hidden('member', a.user_id)
   group by a.id, a.user_id, a.role, a.display_name

  union all

  -- Property: the same deals, credited to the listing's firm.
  select 'business', b.id, b.owner_id, 'firm', b.name, null::text, null::text,
         b.state_code, true, count(distinct d.id)::int
    from public.businesses b
    join public.listings l on l.firm_id = b.id and not l.is_demo
    join public.deal_agreements d on d.listing_id = l.id and d.kind = 'rent' and d.status = 'paid'
   where p_board = 'property'
     and b.kind::text = 'agency' and b.status::text = 'PUBLISHED' and b.verified and not b.is_demo
     and d.paid_at >= p_from and d.paid_at < p_to
     and (p_state is null or l.state_code = p_state)
     and not private.leaderboard_hidden('business', b.id)
   group by b.id

  union all

  -- Hotels and stays: completed stays, dated by check-out.
  select 'business', b.id, b.owner_id, b.kind::text, b.name, private.business_ref(b.id, b.kind::text), null::text,
         b.state_code, true, count(distinct bk.id)::int
    from public.businesses b
    join public.accommodations ac on ac.business_id = b.id
    join public.bookings bk on bk.accommodation_id = ac.id and bk.status::text = 'COMPLETED'
   where p_board = 'hotels'
     and b.kind::text in ('hotel', 'resort', 'guest_house', 'serviced_apartments', 'shortlet_operator')
     and b.status::text = 'PUBLISHED' and b.verified and not b.is_demo
     and (bk.check_out::timestamp at time zone 'Africa/Lagos') >= p_from
     and (bk.check_out::timestamp at time zone 'Africa/Lagos') < p_to
     and (p_state is null or b.state_code = p_state)
     and not private.leaderboard_hidden('business', b.id)
   group by b.id

  union all

  -- Restaurants: completed reservations.
  select 'business', b.id, b.owner_id, 'restaurant', b.name, b.id::text, null::text,
         b.state_code, true, count(distinct rv.id)::int
    from public.businesses b
    join public.reservations rv on rv.business_id = b.id and rv.status::text = 'COMPLETED'
   where p_board = 'restaurants'
     and b.kind::text = 'restaurant' and b.status::text = 'PUBLISHED' and b.verified and not b.is_demo
     and rv.reserved_for >= p_from and rv.reserved_for < p_to
     and (p_state is null or b.state_code = p_state)
     and not private.leaderboard_hidden('business', b.id)
   group by b.id;
$$;

-- --------------------------------------------------------------- the boards

-- One board: the top p_limit (at most 100) and, wherever they are, the
-- caller's own rows (is_me). Ties share a rank. next_score is the count of the
-- nearest rank above (null at the top), so "3 more to reach #4" is honest.
create or replace function public.leaderboard(
  p_board text, p_state text default null, p_period text default 'month', p_limit int default 50)
returns table (
  rank int, previous_rank int, kind text, display_name text, ref text, avatar_url text,
  place_code text, place_name text, verified boolean, score int, next_score int, total int, is_me boolean
)
language sql stable security definer set search_path = '' as $$
  with
  cw as (select * from private.leaderboard_window(p_period, false)),
  pw as (select * from private.leaderboard_window(p_period, true)),
  cur as (
    select s.* from cw, lateral private.leaderboard_scores(p_board, nullif(btrim(p_state), ''), cw.from_at, cw.to_at) s
     where s.score > 0),
  prev as (
    select s.subject_kind, s.subject_id, rank() over (order by s.score desc)::int as rnk
      from pw, lateral private.leaderboard_scores(p_board, nullif(btrim(p_state), ''), pw.from_at, pw.to_at) s
     where s.score > 0),
  ds as (
    select x.score, lag(x.score) over (order by x.score desc) as above
      from (select distinct c.score from cur c) x),
  ranked as (
    select c.*,
           rank() over (order by c.score desc)::int as rnk,
           count(*) over ()::int as n,
           row_number() over (order by c.score desc, c.display_name, c.subject_id) as pos
      from cur c)
  select r.rnk, p.rnk, r.kind, r.display_name, r.ref, r.avatar_url,
         r.state_code, st.name, r.verified, r.score, ds.above, r.n,
         coalesce(r.owner_id = (select auth.uid()), false)
    from ranked r
    join ds on ds.score = r.score
    left join prev p on p.subject_kind = r.subject_kind and p.subject_id = r.subject_id
    left join public.states st on st.code = r.state_code
   where p_board in ('referrals', 'property', 'hotels', 'restaurants')
     and (r.pos <= greatest(1, least(coalesce(p_limit, 50), 100))
          or r.owner_id = (select auth.uid()))
   order by r.pos;
$$;

revoke all on function public.leaderboard(text, text, text, int) from public;
grant execute on function public.leaderboard(text, text, text, int) to anon, authenticated;

-- ---------------------------------------------------------------- the opt-out

-- What the caller can hide: themselves, and each business they own.
create or replace function public.my_leaderboard_visibility()
returns table (subject_kind text, business_id uuid, name text, kind text, hidden boolean)
language sql stable security definer set search_path = '' as $$
  select 'member', null::uuid, private.leaderboard_person_name((select auth.uid())), 'member',
         private.leaderboard_hidden('member', (select auth.uid()))
   where (select auth.uid()) is not null
  union all
  select 'business', b.id, b.name, b.kind::text, private.leaderboard_hidden('business', b.id)
    from public.businesses b
   where b.owner_id = (select auth.uid()) and not b.is_demo
   order by 1 desc, 3;
$$;

revoke all on function public.my_leaderboard_visibility() from public, anon;
grant execute on function public.my_leaderboard_visibility() to authenticated;

-- Hide or show the caller (p_business null) or one business the caller owns.
create or replace function public.leaderboard_set_hidden(p_hidden boolean, p_business uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  kind text := case when p_business is null then 'member' else 'business' end;
  subject uuid := coalesce(p_business, me);
begin
  if me is null then
    raise exception 'Sign in to change this.' using errcode = '42501';
  end if;
  if p_business is not null and not exists (
       select 1 from public.businesses b where b.id = p_business and b.owner_id = me) then
    raise exception 'Only the owner can change this.' using errcode = '42501';
  end if;
  if coalesce(p_hidden, false) then
    insert into public.leaderboard_opt_outs (subject_kind, subject_id, owner_id)
    values (kind, subject, me)
    on conflict (subject_kind, subject_id) do nothing;
  else
    delete from public.leaderboard_opt_outs o where o.subject_kind = kind and o.subject_id = subject;
  end if;
  return coalesce(p_hidden, false);
end $$;

revoke all on function public.leaderboard_set_hidden(boolean, uuid) from public, anon;
grant execute on function public.leaderboard_set_hidden(boolean, uuid) to authenticated;

-- ---------------------------------------------------------------- directory

create or replace function public.directory(
  p_side text, p_state text default null, p_query text default null, p_limit int default 60)
returns table (
  kind text, display_name text, ref text, avatar_url text, place_code text, place_name text,
  area text, verified boolean, verification_tier int, completed int, live_listings int, since date
)
language sql stable security definer set search_path = '' as $$
  with q as (
    select nullif(btrim(p_state), '') as st,
           case when nullif(btrim(p_query), '') is null then null
                else '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' end as pat
  ),
  people as (
    -- Agents, and landlords who chose a public handle.
    select case when a.role::text = 'owner' then 'landlord' else 'agent' end as kind,
           coalesce(nullif(btrim(a.display_name), ''), private.leaderboard_person_name(a.user_id)) as display_name,
           sp.handle as ref,
           nullif(sp.avatar_path, '') as avatar_url,
           coalesce(sp.state_code,
                    (select mode() within group (order by l.state_code) from public.listings l
                      where l.agent_id = a.id and l.status::text = 'PUBLISHED' and not l.is_demo)) as place_code,
           null::text as area,
           a.verified, coalesce(a.verification_tier, 0)::int as verification_tier,
           (select count(distinct d.id) from public.listings l
              join public.deal_agreements d on d.listing_id = l.id and d.kind = 'rent' and d.status = 'paid'
             where l.agent_id = a.id and not l.is_demo)::int as completed,
           (select count(*) from public.listings l
             where l.agent_id = a.id and l.status::text = 'PUBLISHED' and not l.is_demo)::int as live_listings,
           a.created_at::date as since
      from public.agents a
      left join public.social_profiles sp on sp.user_id = a.user_id
     where p_side = 'property'
       and a.status::text = 'APPROVED' and not a.is_demo
       and (a.role::text <> 'owner' or sp.handle is not null)
       and not private.leaderboard_hidden('member', a.user_id)
  ),
  firms as (
    select 'firm'::text, b.name, null::text, null::text, b.state_code, b.area,
           b.verified, coalesce(b.verification_tier, 0)::int,
           (select count(distinct d.id) from public.listings l
              join public.deal_agreements d on d.listing_id = l.id and d.kind = 'rent' and d.status = 'paid'
             where l.firm_id = b.id and not l.is_demo)::int,
           (select count(*) from public.listings l
             where l.firm_id = b.id and l.status::text = 'PUBLISHED' and not l.is_demo)::int,
           coalesce(b.published_at, b.created_at)::date
      from public.businesses b
     where p_side = 'property' and b.kind::text = 'agency' and b.status::text = 'PUBLISHED' and not b.is_demo
  ),
  stays as (
    select case when b.kind::text in ('hotel', 'resort') then 'hotel'
                when b.kind::text = 'shortlet_operator' then 'shortlet'
                else 'host' end,
           b.name, private.business_ref(b.id, b.kind::text), null::text, b.state_code, b.area,
           b.verified, coalesce(b.verification_tier, 0)::int,
           (select count(distinct bk.id) from public.accommodations ac
              join public.bookings bk on bk.accommodation_id = ac.id and bk.status::text = 'COMPLETED'
             where ac.business_id = b.id)::int,
           (select count(*) from public.accommodations ac
             where ac.business_id = b.id and ac.status::text = 'PUBLISHED' and not ac.is_demo)::int,
           coalesce(b.published_at, b.created_at)::date
      from public.businesses b
     where p_side = 'stays'
       and b.kind::text in ('hotel', 'resort', 'guest_house', 'serviced_apartments', 'shortlet_operator')
       and b.status::text = 'PUBLISHED' and not b.is_demo
  ),
  everyone as (
    select * from people union all select * from firms union all select * from stays
  )
  select e.kind, e.display_name, e.ref, e.avatar_url, e.place_code, st.name, e.area,
         e.verified, e.verification_tier, e.completed, e.live_listings, e.since
    from everyone e
    cross join q
    left join public.states st on st.code = e.place_code
   where (q.st is null or e.place_code = q.st)
     and (q.pat is null or e.display_name ilike q.pat or coalesce(e.area, '') ilike q.pat)
   order by e.verified desc, e.completed desc, e.live_listings desc, e.display_name
   limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

revoke all on function public.directory(text, text, text, int) from public;
grant execute on function public.directory(text, text, text, int) to anon, authenticated;

-- Lead addition: the private helpers are only for the definer reads above.
revoke all on function private.leaderboard_hidden(text, uuid) from public, anon, authenticated;
revoke all on function private.leaderboard_window(text, boolean) from public, anon, authenticated;
revoke all on function private.leaderboard_person_name(uuid) from public, anon, authenticated;
revoke all on function private.business_ref(uuid, text) from public, anon, authenticated;
revoke all on function private.leaderboard_scores(text, text, timestamptz, timestamptz) from public, anon, authenticated;
