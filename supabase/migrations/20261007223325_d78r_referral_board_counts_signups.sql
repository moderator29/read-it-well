-- D78r: the referrals board counts sign-ups. The founder, 7 October 2026:
-- "each is counted when users sign up; no need for the referral to make any
-- transaction before it counts; as long as they sign up fully it counts."
-- The board now counts every referral attributed at sign-up, dated by the
-- sign-up, except one reversed or rejected as fraud. Rewards are unchanged:
-- what a referral EARNS still follows the reward engine's own rule.
set local lock_timeout = '10s';

create or replace function private.leaderboard_scores(p_board text, p_state text, p_from timestamptz, p_to timestamptz)
returns table (
  subject_kind text, subject_id uuid, owner_id uuid, kind text, display_name text,
  ref text, avatar_url text, state_code text, verified boolean, score int
)
language sql stable set search_path = '' as $$
  -- Referrals (D78): every friend who signed up with the member's link counts,
  -- dated by the sign-up (attributed_at). No payment is needed for the board.
  -- A referral reversed or rejected as fraud never counts.
  select 'member', r.referrer_id, r.referrer_id, 'member',
         private.leaderboard_person_name(r.referrer_id),
         max(sp.handle), max(coalesce(nullif(sp.avatar_path, ''), nullif(p.avatar_url, ''))),
         max(coalesce(sp.state_code, p.state_code)), true, count(*)::int
    from public.referrals r
    left join public.social_profiles sp on sp.user_id = r.referrer_id
    left join public.profiles p on p.id = r.referrer_id
   where p_board = 'referrals'
     and r.status not in ('reversed', 'rejected')
     and r.attributed_at >= p_from and r.attributed_at < p_to
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

revoke all on function private.leaderboard_scores(text, text, timestamptz, timestamptz) from public, anon, authenticated;
