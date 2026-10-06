-- B4 referral: a browser fingerprint is not a device (D62). Follows
-- 20261006154817_b4_referral_campaigns.sql.
--
-- Found by CI's first run of probes/b4-referral-campaigns.sql: "a shared network
-- alone flagged a cluster". The cause is upstream of the referral engine.
-- public.known_devices.fingerprint is written by private.enqueue_new_device_email
-- as left(md5(user_agent), 16), with every session lacking a user agent mapped
-- to md5('unrecorded'). It names a browser build, not a handset, so on Nigeria's
-- common Android Chrome builds thousands of honest members share one. The
-- engine scored it as a STRONG edge (40 and 30 points, non_network true),
-- which would put honest members under review: the exact harm D62 forbids.
--
-- Change: the three known_devices edges in private.referral_risk and
-- private.referral_cluster_score become WEAK (a few points, non_network stays
-- false), the same standing as a shared network. Nothing else changes; both
-- functions keep their signatures. A real device identifier would restore a
-- strong device edge; until one exists the payout destination, circular
-- referral, sequential phones, timing, velocity and the denylist carry the
-- weight. Nothing has qualified yet (phone sign-in is off), so no row needs
-- rescoring.
--
-- RESIDUAL GAP, accepted and tracked: one operator farming accounts on one
-- handset, with different payout accounts, scattered SIMs, spaced sign-ups,
-- volume under velocity and no circular link, is now caught only when the
-- ring converges on a payout destination. The old edge never caught that
-- ring for a real reason (it matched any two members on one browser build).
-- A real device identifier is the follow-up that closes it.

set local lock_timeout = '5s';

create or replace function private.referral_risk(p_referral uuid, p_phone_key text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r public.referrals; pol public.referral_policy;
  score int := 0; reasons jsonb := '[]'::jsonb; non_network boolean := false; n int;
begin
  select * into r from public.referrals where id = p_referral;
  if r.id is null then return jsonb_build_object('score', 0, 'reasons', reasons, 'non_network', false); end if;
  pol := private.referral_policy_now();

  -- STRONGEST: a payout destination the referrer shares with another member.
  if exists (select 1 from public.rewards_payouts a join public.rewards_payouts b
               on b.account_key = a.account_key and b.member_id <> a.member_id
              where a.member_id in (r.referrer_id, r.referred_id) and a.account_key is not null) then
    score := score + 60; non_network := true; reasons := reasons || '"shared_payout_destination"'::jsonb;
  end if;
  -- WEAK (D62, corrected): known_devices.fingerprint is md5(user agent), a browser
  -- version, not a device; thousands share it. Weak like the network, never alone.
  if exists (select 1 from public.known_devices a join public.known_devices b on b.fingerprint = a.fingerprint
              where a.user_id = r.referrer_id and b.user_id = r.referred_id) then
    score := score + 5; reasons := reasons || '"same_browser_as_referrer"'::jsonb;
  end if;
  select count(distinct o.referred_id) into n
    from public.referrals o
    join public.known_devices a on a.user_id = o.referred_id
    join public.known_devices b on b.fingerprint = a.fingerprint and b.user_id = r.referred_id
   where o.referrer_id = r.referrer_id and o.referred_id <> r.referred_id;
  if n > 0 then score := score + 3; reasons := reasons || '"same_browser_across_referred"'::jsonb; end if;
  -- STRONG: mutual or circular referral (one or two steps).
  if exists (select 1 from public.referrals x where x.referrer_id = r.referred_id and x.referred_id = r.referrer_id)
     or exists (select 1 from public.referrals x join public.referrals y on y.referrer_id = x.referred_id
                 where x.referrer_id = r.referred_id and y.referred_id = r.referrer_id) then
    score := score + 40; non_network := true; reasons := reasons || '"circular_referral"'::jsonb;
  end if;
  -- MODERATE: sequential phone numbers confirmed within a day of each other.
  if exists (select 1 from public.referrals o
               join public.confirmed_phones po on po.user_id = o.referred_id
               join public.confirmed_phones pr on pr.user_id = r.referred_id
              where o.referrer_id = r.referrer_id and o.referred_id <> r.referred_id
                and left(po.phone, length(po.phone) - 3) = left(pr.phone, length(pr.phone) - 3)
                and abs(right(po.phone, 3)::int - right(pr.phone, 3)::int) <= 5
                and abs(extract(epoch from po.confirmed_at - pr.confirmed_at)) <= 86400) then
    score := score + 20; non_network := true; reasons := reasons || '"sequential_phones"'::jsonb;
  end if;
  -- MODERATE: near-identical timing, and velocity.
  if exists (select 1 from public.referrals o where o.referrer_id = r.referrer_id and o.id <> r.id
               and o.qualified_at > now() - interval '2 minutes') then
    score := score + 15; non_network := true; reasons := reasons || '"near_identical_timing"'::jsonb;
  end if;
  select count(*) into n from public.referrals o
   where o.referrer_id = r.referrer_id and o.qualified_at > now() - interval '24 hours' and o.id <> r.id;
  if n >= coalesce(pol.velocity_per_day, 50) then
    score := score + 20; non_network := true; reasons := reasons || '"velocity"'::jsonb;
  end if;
  -- IDENTITY: the referred phone matches an identity stopped for fraud.
  if coalesce(p_phone_key, r.referred_phone_key) is not null and exists (
       select 1 from private.identity_denylist d where d.key_kind = 'phone'
          and d.key_hmac = coalesce(p_phone_key, r.referred_phone_key)) then
    score := score + 100; non_network := true; reasons := reasons || '"identity_denylisted"'::jsonb;
  end if;
  -- WEAK, NEVER SUFFICIENT ALONE: the same network. Carrier NAT, shared
  -- Wi-Fi, campuses and offices make this the normal case. Capped at 5.
  if exists (select 1 from auth.sessions a join auth.sessions b on b.ip = a.ip
              where a.user_id = r.referrer_id and b.user_id = r.referred_id and a.ip is not null) then
    score := score + 5; reasons := reasons || '"shared_network"'::jsonb;
  end if;

  return jsonb_build_object('score', score, 'reasons', reasons, 'non_network', non_network);
end $$;

-- A referrer's cluster: the referrer and everyone they referred, with
-- weighted edges among them. Flags only on a combination that crosses the
-- threshold AND includes a non-network edge.
create or replace function private.referral_cluster_score(p_referrer uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  members uuid[]; score int := 0; reasons jsonb := '[]'::jsonb; non_network boolean := false; n int;
begin
  select array_agg(x) into members from (
    select p_referrer as x union select referred_id from public.referrals where referrer_id = p_referrer) s;
  if coalesce(cardinality(members), 0) < 2 then
    return jsonb_build_object('score', 0, 'reasons', reasons, 'non_network', false);
  end if;
  select count(distinct a.member_id) into n from public.rewards_payouts a join public.rewards_payouts b
      on b.account_key = a.account_key and b.member_id <> a.member_id
   where a.account_key is not null and a.member_id = any(members) and b.member_id = any(members);
  if n >= 2 then score := score + 60 * (n - 1); non_network := true; reasons := reasons || '"shared_payout_destination"'::jsonb; end if;
  select count(distinct a.user_id) into n from public.known_devices a join public.known_devices b
      on b.fingerprint = a.fingerprint and b.user_id <> a.user_id
   where a.user_id = any(members) and b.user_id = any(members);
  if n >= 2 then score := score + least(10, 2 * n); reasons := reasons || '"same_browser"'::jsonb; end if;
  if exists (select 1 from public.referrals x where x.referrer_id = any(members) and x.referred_id = p_referrer) then
    score := score + 40; non_network := true; reasons := reasons || '"circular_referral"'::jsonb;
  end if;
  select count(distinct a.user_id) into n from auth.sessions a join auth.sessions b
      on b.ip = a.ip and b.user_id <> a.user_id
   where a.ip is not null and a.user_id = any(members) and b.user_id = any(members);
  if n >= 2 then score := score + least(10, 2 * n); reasons := reasons || '"shared_network"'::jsonb; end if;
  return jsonb_build_object('score', score, 'reasons', reasons, 'non_network', non_network);
end $$;



revoke all on function private.referral_risk(uuid, text) from public, anon, authenticated;
revoke all on function private.referral_cluster_score(uuid) from public, anon, authenticated;

do $check$
declare d text;
begin
  d := pg_get_functiondef('private.referral_risk(uuid,text)'::regprocedure)
    || pg_get_functiondef('private.referral_cluster_score(uuid)'::regprocedure);
  if d like '%shared_device%' or d like '%device_shared%' then
    raise exception 'b4_referral_browser_is_not_a_device: a strong device edge survived';
  end if;
  if has_function_privilege('anon', 'private.referral_risk(uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.referral_cluster_score(uuid)', 'EXECUTE') then
    raise exception 'b4_referral_browser_is_not_a_device: an API role can execute a risk function';
  end if;
end $check$;
