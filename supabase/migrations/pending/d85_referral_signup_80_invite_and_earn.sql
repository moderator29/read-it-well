-- D85 INVITE AND EARN: 80 naira when the invited person signs up fully.
-- PENDING, NOT APPLIED. Follows 20261006154817_b4_referral_campaigns.sql,
-- 20261006155720_b4_referral_browser_is_not_a_device.sql and the two
-- leaderboard migrations (d76x, d78r). Additive: CREATE OR REPLACE, new
-- triggers, a new campaign row, one campaign moved active > ended (the move
-- the campaign guard allows), two cron jobs. Nothing is dropped or deleted.
--
-- THE RULING. The founder, 8 October 2026: "it's only count when someone sign
-- up fully ... users supposed to have their earning dashboard and make it all
-- end to end". A referral earns 80 naira (8,000 kobo) once the invited person
-- has signed up fully, with no payment required. Amended the same day by the
-- lead: phone codes cannot be sent in production yet (TERMII_SENDER_ID is not
-- set; the phone_confirmation flag is off), and the founder wants referrals
-- earning now, so "fully" is, for this campaign:
--     email_verified        their own email address, confirmed
--     onboarding_completed  terms accepted and a first name set
-- phone_verified is to be added by a successor campaign once TERMII_SENDER_ID
-- is set (a campaign's terms are written once; the change is a new campaign).
--
-- WHAT IS CONFIGURATION AND WHAT IS NOT. The reward, the requirements, the
-- 7-day review window and the per-member cap are a new campaign row
-- (`signup-80`), as the engine intends. The reward is read from the campaign,
-- never from referral_policy (b4_referral_campaigns: "referral_policy.
-- reward_minor ... left in place, unused"), so no policy row is added: the
-- withdrawal minimum (1,000 naira), payouts_enabled = false, the risk and
-- cluster thresholds and the velocity limit stay exactly as they are. The
-- platform budget (700,000 naira a month, referral_budget_periods) is
-- unchanged. The risk score, the cluster score, the one-per-identity rule and
-- the review routing are unchanged in substance.
--
-- WHAT HAD TO CHANGE IN THE ENGINE FOR A CAMPAIGN WITHOUT A PHONE KEY:
--  1. private.referral_campaign_guard refused any campaign without
--     phone_verified, because one reward per verified identity was anchored
--     on the confirmed phone. It now accepts phone_verified OR email_verified.
--  2. private.referral_try_qualify computed the identity key from the
--     confirmed phone only, so with no phone every referral would have sat at
--     identity_key_unavailable. It now uses the phone key when a phone is
--     confirmed, else the key of the confirmed mailbox, canonicalised so one
--     Gmail inbox cannot earn twice through dots or a +tag
--     (private.referral_mailbox_key). Same column, same unique index, same
--     fail-closed rule when the vault secret is missing.
--     It also records a qualifying payment only when the campaign requires
--     one (meaningful_activity): under a sign-up campaign a later refund of an
--     unrelated payment must not take the reward back.
--  3. public.referral_qualify_pending only looked at people with a confirmed
--     phone. It now looks at anyone with a confirmed phone or email.
--
-- WHAT WAS MISSING END TO END (found 8 October, read live):
--  4. ATTRIBUTION AT SIGN-UP. A referrals row was written only when
--     qualification was tried, and qualification was tried only on a phone
--     confirmation or a settled payment. A person who signed up with a code
--     and never confirmed a phone was invisible to the member who invited
--     them. Now: auth.users AFTER INSERT attributes from the sign-up
--     referral_code (users_referral_attribute).
--  5. RE-EVALUATION when a step completes. Now: auth.users AFTER UPDATE OF
--     email_confirmed_at, and profiles AFTER UPDATE OF terms_accepted_at,
--     first_name, each try qualification (never failing the host write).
--  6. SIGN-UPS THAT CARRY NO METADATA (Google, Apple, phone sign-in) never
--     recorded the invite. public.referral_claim_code(code) lets a NEW account
--     (made in the last 24 hours, not yet attributed, no sign-up code, not its
--     own code) record the invite the /join/<code> link left in the browser.
--  7. THE SWEEPS WERE NEVER SCHEDULED. No cron job ran
--     referral_qualify_pending, referral_release_due or referral_flag_clusters,
--     so no reward could ever leave its review window. Scheduled here.
--  8. THE MEMBER'S PER-REFERRAL PROGRESS. my_referrals says only invited /
--     pending / ...; a member could not see "waiting for email confirmation"
--     or "in review until <date>". public.my_referral_progress(limit) answers
--     in member words, first name at most, never a risk reason.
--
-- House rules: no trigger or row removal statements, no transaction control.

set local lock_timeout = '5s';

-- --------------------------------------------- 1. the campaign guard

create or replace function private.referral_campaign_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_param text; bad text;
begin
  if tg_op = 'DELETE' then
    raise exception 'A campaign is ended, never removed.' using errcode = 'RM420';
  end if;
  if exists (select 1 from unnest(new.requirement_keys) k where k is null) then
    raise exception 'A campaign requirement key is null.' using errcode = 'RM420';
  end if;
  if (select count(distinct k) from unnest(new.requirement_keys) k) <> cardinality(new.requirement_keys) then
    raise exception 'A campaign lists a requirement key twice.' using errcode = 'RM420';
  end if;
  select string_agg(k, ', ') into bad from unnest(new.requirement_keys) k
   where not exists (select 1 from public.referral_requirements r where r.key = k);
  if bad is not null then
    raise exception 'Unknown requirement key(s): %. Keys come from public.referral_requirements.', bad using errcode = 'RM420';
  end if;
  -- ONE REWARD PER VERIFIED IDENTITY (D85): anchored on the confirmed phone,
  -- or, until phone codes can be sent, on the confirmed mailbox.
  if not ('phone_verified' = any(new.requirement_keys) or 'email_verified' = any(new.requirement_keys)) then
    raise exception 'Every campaign requires phone_verified or email_verified (one reward per verified identity).' using errcode = 'RM421';
  end if;
  for v_param in select jsonb_object_keys(new.requirement_params) loop
    if not (v_param = any(new.requirement_keys)) then
      raise exception 'Parameters given for %, which the campaign does not require.', v_param using errcode = 'RM420';
    end if;
    if not private.referral_requirement_params_ok(v_param, new.requirement_params -> v_param) then
      raise exception 'The parameters for % are not valid.', v_param using errcode = 'RM420';
    end if;
  end loop;

  if tg_op = 'UPDATE' then
    -- Money terms are frozen: only status and the end date move.
    if (to_jsonb(new) - array['status', 'ends_at', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'ends_at', 'updated_at']) then
      raise exception 'A campaign''s terms are written once; create a new campaign instead.' using errcode = 'RM422';
    end if;
    if old.status = 'ended' and new.status <> 'ended' then
      raise exception 'An ended campaign stays ended.' using errcode = 'RM422';
    end if;
    if new.status <> old.status and (old.status, new.status) not in
       (('draft', 'active'), ('draft', 'ended'), ('active', 'paused'), ('active', 'ended'), ('paused', 'active'), ('paused', 'ended')) then
      raise exception 'A campaign cannot move from % to %.', old.status, new.status using errcode = 'RM422';
    end if;
    new.updated_at := now();
  end if;
  if new.status = 'active' and new.ends_at is not null and new.ends_at <= now() then
    raise exception 'A campaign past its end date cannot be active.' using errcode = 'RM422';
  end if;
  return new;
end $$;

-- ------------------------------------- 2. the identity key, and qualification

-- The confirmed mailbox as an identity key: lower-cased, the +tag dropped,
-- and for Gmail the dots dropped and googlemail.com folded in, so one inbox
-- is one identity. Null when the address is not confirmed or the vault
-- secret is missing (qualification then fails closed, as for a phone).
create or replace function private.referral_mailbox_key(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  with e as (
    select lower(btrim(u.email)) as email from auth.users u
     where u.id = p_user and u.email_confirmed_at is not null and nullif(btrim(coalesce(u.email, '')), '') is not null
  ), parts as (
    select split_part(email, '@', 1) as local, split_part(email, '@', 2) as domain from e
     where position('@' in email) > 1 and split_part(email, '@', 2) <> ''
  ), canon as (
    select case when domain in ('gmail.com', 'googlemail.com')
                then replace(split_part(local, '+', 1), '.', '') || '@gmail.com'
                else split_part(local, '+', 1) || '@' || domain end as v
      from parts
  )
  select private.identity_key('mailbox', v) from canon where v !~ '^@';
$$;

-- Qualify when EVERY key of the campaign passes, in order. Unchanged from
-- b4_referral_campaigns except: the identity key falls back to the confirmed
-- mailbox when no phone is confirmed, and a qualifying payment is recorded
-- only when the campaign requires one.
create or replace function private.referral_try_qualify(p_user uuid)
returns text language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare
  v_id uuid; r public.referrals; c public.referral_campaigns; pol public.referral_policy;
  k text; v_fail text; v_phone text; v_key text; v_anchor text; v_tx uuid; v_booking uuid;
  v_month date := private.lagos_month(now());
  risk jsonb; v_to text; v_reason text;
begin
  v_id := private.referral_attribute(p_user);
  if v_id is null then return 'not_referred'; end if;
  select * into r from public.referrals where id = v_id for update skip locked;
  if r.id is null then return 'pending_lock'; end if;
  if r.status <> 'attributed' then return r.status; end if;

  -- The campaign actually used: the referral's own if it is still live, else
  -- the live campaign of the same kind, else the live consumer campaign.
  select c2.* into c from public.referral_campaigns c2
   where c2.status = 'active' and c2.starts_at <= now() and (c2.ends_at is null or c2.ends_at > now())
     and (c2.id = r.campaign_id
          or c2.kind = (select o.kind from public.referral_campaigns o where o.id = r.campaign_id)
          or (r.campaign_id is null and c2.kind = 'consumer'))
   order by (c2.id = r.campaign_id) desc, c2.starts_at desc
   limit 1;
  if c.id is not null and c.id is distinct from r.campaign_id then
    update public.referrals set campaign_id = c.id where id = r.id;
    perform private.referral_log(r.id, 'attributed', 'attributed', 'campaign ended or unset; using the live campaign of its kind', null,
                                 jsonb_build_object('from_campaign', r.campaign_id, 'to_campaign', c.id));
    r.campaign_id := c.id;
  end if;
  if c.id is null then
    update public.referrals set blocked_on = 'no_active_campaign', last_checked_at = now() where id = r.id;
    return 'no_active_campaign';
  end if;

  -- The registry, in the campaign's order; the first failure is the reason.
  foreach k in array c.requirement_keys loop
    v_fail := private.referral_requirement_check(k, p_user, c.requirement_params -> k);
    if v_fail is not null then
      update public.referrals set blocked_on = v_fail, last_checked_at = now() where id = r.id;
      return v_fail;
    end if;
  end loop;

  -- ONE REWARD PER VERIFIED IDENTITY, failing closed: the confirmed phone,
  -- else the confirmed mailbox (D85). No key, nothing qualifies.
  select phone into v_phone from public.confirmed_phones where user_id = p_user;
  if v_phone is not null then
    v_key := private.identity_key('phone', v_phone); v_anchor := 'phone';
  else
    v_key := private.referral_mailbox_key(p_user); v_anchor := 'mailbox';
  end if;
  if v_key is null then
    update public.referrals set blocked_on = 'identity_key_unavailable', last_checked_at = now() where id = r.id;
    return 'identity_key_unavailable';
  end if;
  pol := private.referral_policy_now();
  if pol.id is null then return 'no_policy'; end if;
  if exists (select 1 from public.referrals o
              where o.referred_phone_key = v_key and o.status <> 'reversed' and o.id <> r.id) then
    perform private.referral_move(r.id, 'reversed',
                                  case when v_anchor = 'phone' then 'this phone already earned a referral reward'
                                       else 'this email address already earned a referral reward' end,
                                  null, jsonb_build_object('rule', 'one_per_identity', 'anchor', v_anchor));
    return 'reversed';
  end if;

  -- Risk first, outside the budget lock: it is the expensive part.
  risk := private.referral_risk(r.id, v_key);

  -- Member cap and platform budget, each one conditional statement.
  v_reason := private.referral_reserve(c.id, r.referrer_id, v_month, c.reward_minor, c.member_cap_minor);
  if v_reason is not null then
    update public.referrals set blocked_on = v_reason, last_checked_at = now() where id = r.id;
    return v_reason;
  end if;

  -- A qualifying payment exists only for a campaign that requires one.
  if 'meaningful_activity' = any(c.requirement_keys) then
    select q.tx_id, q.booking_id into v_tx, v_booking from private.referral_qualifying_tx(p_user) q;
  end if;
  -- THE AMOUNT IS FROZEN HERE, from the campaign, and never changes after.
  update public.referrals
     set status = 'qualified', qualified_at = now(), reward_minor = c.reward_minor, period_month = v_month,
         review_until = now() + c.review_window, referred_phone_key = v_key,
         qualifying_tx_id = v_tx, qualifying_booking_id = v_booking, blocked_on = null, last_checked_at = now(),
         risk_score = (risk ->> 'score')::int, risk_reasons = risk -> 'reasons'
   where id = r.id;
  perform private.referral_log(r.id, 'attributed', 'qualified', 'every requirement of the campaign passed', null,
                               jsonb_build_object('campaign', c.slug, 'reward_minor', c.reward_minor,
                                                  'requirements', to_jsonb(c.requirement_keys), 'transaction_id', v_tx,
                                                  'identity', v_anchor));

  -- Review only on a score at the threshold that includes a non-network edge.
  if (risk ->> 'score')::int >= pol.review_risk_score and (risk ->> 'non_network')::boolean then
    v_to := 'under_review'; v_reason := 'risk score at or above the review threshold';
  else
    v_to := 'pending'; v_reason := 'qualified; waiting out the campaign review window';
  end if;
  perform private.referral_move(r.id, v_to, v_reason, null, risk);
  return v_to;
end $$;

-- ------------------------------------------------- 3. the retry sweep

-- Unchanged from b4_referral_campaigns except the first loop's filter: anyone
-- with a confirmed phone OR a confirmed email can qualify now.
create or replace function public.referral_qualify_pending(p_limit int default 500)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_user uuid; v_out text; n int := 0; moved int := 0; failed int := 0;
begin
  for v_user in
    select u.id from (
      select r.referred_id as id, r.last_checked_at as at from public.referrals r where r.status = 'attributed'
      union all
      select au.id, null from auth.users au
       where nullif(btrim(au.raw_user_meta_data ->> 'referral_code'), '') is not null
         and not exists (select 1 from public.referrals r where r.referred_id = au.id)
    ) u
    -- Every campaign requires a confirmed phone or email, so nobody without
    -- one of them can qualify.
    where exists (select 1 from public.confirmed_phones c where c.user_id = u.id)
       or exists (select 1 from auth.users v where v.id = u.id and v.email_confirmed_at is not null)
    order by u.at nulls first, u.id
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
  loop
    n := n + 1;
    begin
      v_out := private.referral_try_qualify(v_user);
      if v_out in ('pending','under_review','reversed') then moved := moved + 1; end if;
    exception when others then
      failed := failed + 1;
      raise warning 'referral_qualify_pending: % for %', sqlerrm, v_user;
    end;
  end loop;

  -- Reversals a trigger skipped: a fully refunded qualifying payment.
  for v_user in
    select r.id from public.referrals r
     where r.status <> 'reversed' and (
       exists (select 1 from public.transactions t where t.id = r.qualifying_tx_id and t.status = 'REFUNDED')
       or exists (select 1 from public.booking_refunds br where br.booking_id = r.qualifying_booking_id
                    and br.paid_minor is not null and br.refund_minor >= br.paid_minor and br.refund_minor > 0))
     limit 500
  loop
    begin
      perform private.referral_reverse(v_user, 'the qualifying payment was fully refunded (sweep)', null);
      moved := moved + 1;
    exception when others then
      failed := failed + 1;
      raise warning 'referral_qualify_pending reversal: % for %', sqlerrm, v_user;
    end;
  end loop;
  return jsonb_build_object('checked', n, 'moved', moved, 'failed', failed);
end $$;

-- ------------------------------ 4 and 5. attribution and re-evaluation

-- At sign-up: the referral_code the sign-up wrote into the auth metadata
-- (lib/auth/actions.ts signUpWithEmail) becomes a referrals row at once, so
-- the member who invited sees the person from the first minute.
create or replace function private.referral_after_signup()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
begin
  if nullif(btrim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')), '') is not null then
    perform private.referral_attribute(new.id);
  end if;
  return new;
exception when others then
  -- A referral must never stop an account being made; the sweep retries.
  raise warning 'referral attribution skipped: %', sqlerrm;
  return new;
end $$;

-- A step done (email confirmed, onboarding finished): try to qualify. Only
-- for somebody who was referred, so every other account pays one index read.
create or replace function private.referral_after_step()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
begin
  if exists (select 1 from public.referrals r where r.referred_id = new.id and r.status = 'attributed')
     or exists (select 1 from auth.users u where u.id = new.id
                  and nullif(btrim(coalesce(u.raw_user_meta_data ->> 'referral_code', '')), '') is not null
                  and not exists (select 1 from public.referrals r2 where r2.referred_id = u.id)) then
    perform private.referral_try_qualify(new.id);
  end if;
  return new;
exception when others then
  -- A referral must never stop a confirmation or a profile save; the sweep retries.
  raise warning 'referral qualification skipped: %', sqlerrm;
  return new;
end $$;

create or replace trigger users_referral_attribute
  after insert on auth.users
  for each row execute function private.referral_after_signup();

create or replace trigger users_referral_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.referral_after_step();

create or replace trigger profiles_referral_onboarding
  after update of terms_accepted_at, first_name on public.profiles
  for each row when (new.terms_accepted_at is distinct from old.terms_accepted_at
                     or new.first_name is distinct from old.first_name)
  execute function private.referral_after_step();

-- ----------------------------- 6. an invite kept in the browser, claimed

-- For an account whose sign-up could not carry the code (Google, Apple, a
-- phone code): the code the /join/<code> link left in a first-party cookie,
-- recorded by the app right after the first session. Only a NEW account
-- (made in the last 24 hours), never one already attributed or one whose
-- sign-up carried a code, never its own code. Answers a word; never says
-- whose code it was.
create or replace function public.referral_claim_code(p_code text)
returns text language plpgsql volatile security definer set search_path = '' set lock_timeout = '2s' as $$
declare
  me uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_created timestamptz; v_meta text; v_referrer uuid; v_id uuid;
begin
  if me is null then return 'signed_out'; end if;
  if exists (select 1 from public.referrals where referred_id = me) then return 'already_attributed'; end if;
  select u.created_at, nullif(btrim(coalesce(u.raw_user_meta_data ->> 'referral_code', '')), '')
    into v_created, v_meta from auth.users u where u.id = me;
  if v_meta is not null then
    -- The sign-up carried its own code, and that one wins.
    perform private.referral_attribute(me);
    return 'already_attributed';
  end if;
  if v_created is null or v_created < now() - interval '24 hours' then return 'too_late'; end if;
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then return 'invalid'; end if;
  select r.user_id into v_referrer from public.referral_codes r where r.code = v_code;
  if v_referrer is null then return 'unknown_code'; end if;
  if v_referrer = me then return 'own_code'; end if;
  insert into public.referrals (referrer_id, referred_id, code, campaign_id)
  values (v_referrer, me, v_code, private.referral_campaign_for(null))
  on conflict (referred_id) do nothing
  returning id into v_id;
  if v_id is null then return 'already_attributed'; end if;
  perform private.referral_log(v_id, null, 'attributed',
                               'attributed from the invite link kept in the browser, claimed after a provider sign-up', null,
                               jsonb_build_object('path', 'claim'));
  begin
    perform private.referral_try_qualify(me);
  exception when others then
    raise warning 'referral qualification after claim skipped: %', sqlerrm;
  end;
  return 'attributed';
end $$;

-- ---------------------------------- 8. the member's referrals, in progress

-- One row per person this member invited, in member words:
--   stage        signing_up | counting | in_review | earned | not_eligible
--   waiting_on   for signing_up: email | setup | phone | other_step (the
--                first step of the live campaign they have not done);
--                for counting: rewards_paused | monthly_limit, or null while
--                it is being counted
--   review_until the end of the review window, while one runs (never for a
--                reward a person at Vallo is looking at)
--   earned_state available | on_its_way | paid
--   not_eligible_reason already_rewarded | not_approved | reversed
-- First name at most; never a risk score, reason or check name.
create or replace function public.my_referral_progress(p_limit int default 100)
returns table (id uuid, stage text, first_name text, reward_minor bigint, joined_at timestamptz,
               qualified_at timestamptz, review_until timestamptz, waiting_on text, earned_state text,
               not_eligible_reason text)
language sql stable security definer set search_path = '' as $$
  select r.id,
         case when r.status = 'attributed' and w.first_missing is not null then 'signing_up'
              when r.status = 'attributed' then 'counting'
              when r.status in ('qualified','pending','approved','under_review') then 'in_review'
              when r.status in ('available','withdrawal_requested','sent','paid') then 'earned'
              else 'not_eligible' end,
         nullif(split_part(btrim(coalesce(p.first_name, p.display_name, '')), ' ', 1), ''),
         r.reward_minor, r.attributed_at, r.qualified_at,
         case when r.status in ('qualified','pending','approved') then r.review_until end,
         case when r.status <> 'attributed' then null
              when w.first_missing = 'email_verified' then 'email'
              when w.first_missing = 'onboarding_completed' then 'setup'
              when w.first_missing = 'phone_verified' then 'phone'
              when w.first_missing is not null then 'other_step'
              when w.camp_id is null or r.blocked_on in ('budget_paused','no_active_campaign') then 'rewards_paused'
              when r.blocked_on = 'member_cap_reached' then 'monthly_limit'
              else null end,
         case when r.status = 'available' then 'available'
              when r.status in ('withdrawal_requested','sent') then 'on_its_way'
              when r.status = 'paid' then 'paid' end,
         case when r.status not in ('rejected','reversed') then null
              when exists (select 1 from public.referral_events e
                            where e.referral_id = r.id and e.detail ->> 'rule' = 'one_per_identity') then 'already_rewarded'
              when exists (select 1 from public.referral_events e
                            where e.referral_id = r.id and e.to_status = 'rejected') then 'not_approved'
              else 'reversed' end
    from public.referrals r
    left join public.profiles p on p.id = r.referred_id
    left join lateral (
      select c.id as camp_id,
             (select u.k from unnest(c.requirement_keys) with ordinality as u(k, ord)
               where private.referral_requirement_check(u.k, r.referred_id, c.requirement_params -> u.k) is not null
               order by u.ord limit 1) as first_missing
        from public.referral_campaigns c
       where r.status = 'attributed'
         and c.status = 'active' and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now())
         and (c.id = r.campaign_id
              or c.kind = (select o.kind from public.referral_campaigns o where o.id = r.campaign_id)
              or (r.campaign_id is null and c.kind = 'consumer'))
       order by (c.id = r.campaign_id) desc, c.starts_at desc
       limit 1
    ) w on true
   where r.referrer_id = (select auth.uid())
   order by r.attributed_at desc
   limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

-- ------------------------------------------------------------ the campaign

-- launch-d51 is ended (the move the guard allows: active > ended, with its
-- end date set), then signup-80 starts. One active campaign per kind is a
-- unique index, so the order matters. Any referral still attributed under
-- launch-d51 qualifies under signup-80 (try_qualify takes the live campaign
-- of its kind); nothing qualified under launch-d51 changes (frozen).
update public.referral_campaigns
   set status = 'ended', ends_at = now()
 where slug = 'launch-d51' and status in ('active', 'paused');

-- The member cap keeps launch-d51's logic: 1,500 qualified a month at the
-- campaign's reward (1,500 x 80 naira = 120,000 naira).
insert into public.referral_campaigns
  (slug, kind, title, reward_minor, member_cap_minor, review_window, requirement_keys, requirement_params, status, starts_at, reason)
select 'signup-80', 'consumer', 'Invite and Earn', 8000, 12000000, interval '7 days',
       array['email_verified', 'onboarding_completed'], '{}'::jsonb, 'active', now(),
       'Founder ruling 8 October 2026: 80 naira when the invited person signs up fully (email confirmed, terms accepted and first name set; no payment). phone_verified to be added by a successor campaign once TERMII_SENDER_ID is set. Supersedes launch-d51.'
 where not exists (select 1 from public.referral_campaigns where slug = 'signup-80')
   and not exists (select 1 from public.referral_campaigns where kind = 'consumer' and status = 'active');

-- ------------------------------------------------------- 7. the schedule

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job
     where jobname in ('vallo_referral_qualify', 'vallo_referral_release_due', 'vallo_referral_flag_clusters');
    -- Qualification the triggers skipped (a busy lock, a cap that rose).
    perform cron.schedule('vallo_referral_qualify', '3,18,33,48 * * * *', $job$select public.referral_qualify_pending(500);$job$);
    -- Cluster review before release, so a flagged reward never becomes available.
    perform cron.schedule('vallo_referral_flag_clusters', '26 * * * *', $job$select public.referral_flag_clusters(500);$job$);
    -- Rewards whose review window has passed become Available.
    perform cron.schedule('vallo_referral_release_due', '11,41 * * * *', $job$select public.referral_release_due();$job$);
  end if;
end $cron$;

-- ------------------------------------------------------------------ grants

do $rv$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private' and p.proname like 'referral\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $rv$;

revoke all on function public.my_referral_progress(int) from public, anon, authenticated, service_role;
grant execute on function public.my_referral_progress(int) to authenticated;
revoke all on function public.referral_claim_code(text) from public, anon, authenticated, service_role;
grant execute on function public.referral_claim_code(text) to authenticated;
revoke all on function public.referral_qualify_pending(int) from public, anon, authenticated;
grant execute on function public.referral_qualify_pending(int) to service_role;

-- --------------------------------------------------------------- read back

do $check$
declare missing text := ''; t text; f text;
begin
  if not exists (select 1 from public.referral_campaigns where slug = 'signup-80' and status = 'active'
                   and reward_minor = 8000 and requirement_keys = array['email_verified', 'onboarding_completed']
                   and review_window = interval '7 days' and member_cap_minor = 12000000) then
    missing := missing || ' signup_80_active';
  end if;
  if exists (select 1 from public.referral_campaigns where slug = 'launch-d51' and status <> 'ended') then
    missing := missing || ' launch_d51_not_ended';
  end if;
  if (select count(*) from public.referral_campaigns where kind = 'consumer' and status = 'active') <> 1 then
    missing := missing || ' one_consumer_campaign';
  end if;
  if exists (select 1 from public.referral_campaigns where slug like '%-proposed' and status <> 'draft') then
    missing := missing || ' proposed_campaign_live';
  end if;
  if coalesce((private.referral_policy_now()).payouts_enabled, false) then
    missing := missing || ' payouts_turned_on';
  end if;
  if (private.referral_policy_now()).withdrawal_min_minor is distinct from 100000 then
    missing := missing || ' withdrawal_minimum_changed';
  end if;
  foreach t in array array['users_referral_attribute', 'users_referral_email_confirmed', 'profiles_referral_onboarding',
                           'confirmed_phones_referral', 'transactions_referral', 'booking_refunds_referral'] loop
    if not exists (select 1 from pg_trigger where tgname = t) then missing := missing || ' trigger:' || t; end if;
  end loop;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    foreach t in array array['vallo_referral_qualify', 'vallo_referral_release_due', 'vallo_referral_flag_clusters'] loop
      if not exists (select 1 from cron.job where jobname = t and active) then missing := missing || ' cron:' || t; end if;
    end loop;
  end if;
  foreach f in array array['public.my_referral_progress(int)', 'public.referral_claim_code(text)'] loop
    if has_function_privilege('anon', f, 'EXECUTE') then missing := missing || ' anon_exec:' || f; end if;
    if not has_function_privilege('authenticated', f, 'EXECUTE') then missing := missing || ' member_exec:' || f; end if;
  end loop;
  if has_function_privilege('authenticated', 'public.referral_qualify_pending(int)', 'EXECUTE') then
    missing := missing || ' member_exec:referral_qualify_pending';
  end if;
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private' and p.proname like 'referral\_%' loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      missing := missing || ' private_exec:' || f;
    end if;
  end loop;
  foreach f in array array['private.referral_try_qualify(uuid)', 'private.referral_after_signup()', 'private.referral_after_step()'] loop
    if not exists (select 1 from pg_proc where oid = f::regprocedure and proconfig::text like '%lock_timeout%') then
      missing := missing || ' lock_timeout:' || f;
    end if;
  end loop;
  if missing <> '' then raise exception 'd85_referral_signup_80_invite_and_earn did not land:%', missing; end if;
end $check$;
