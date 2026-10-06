-- THE REFERRAL ENGINE (D51 referral; Session 2 R3-29). Pending: NOT applied.
--
-- What this adds, all additive and idempotent:
--
-- 1. public.referral_policy: the rates as DATED ROWS, never constants. 70 naira
--    a qualified referral, 1,500 qualified a member a month, a platform-wide
--    monthly budget, a 1,000 naira withdrawal minimum, the hold before a
--    reward becomes withdrawable, and the risk score that routes to review.
--    A row is retired by setting effective_to; never rewritten (trigger).
-- 2. public.referrals: one row per referred member (attribution is SERVER
--    SIDE ONLY: the referral_code written into auth metadata at sign-up and
--    matched against public.referral_codes, never browser storage). Lifecycle
--    pending, qualified, under_review, approved, available, processing, paid,
--    reversed, with the allowed transitions enforced by trigger.
-- 3. public.referral_events: append-only history of every transition, with
--    actor and reason.
-- 4. public.rewards_ledger: the Rewards Balance. APPEND ONLY. A balance is the
--    sum of entries, never `balance += 70`. A reversal is a new entry with a
--    reason and an actor. Update and delete are refused by trigger.
-- 5. public.rewards_payouts: payouts from Vallo's MARKETING FLOAT through
--    Paystack transfers, idempotent by reference, never marked paid before the
--    provider confirms, a timeout stays `unknown` and is never `failed`.
--
-- QUALIFICATION ("a real action", never a signup): the referred member's
-- phone is confirmed (public.confirmed_phones) AND a payment of theirs has
-- SETTLED: a public.transactions row reaches SUCCESSFUL with amount_minor > 0,
-- paid by them (share_payer_id, or the guest of the booking it pays for).
-- Whichever of the two arrives second qualifies the referral.
--
-- REVERSAL: the qualifying transaction going REFUNDED, a refund recorded in
-- public.booking_refunds for the qualifying booking, or a chargeback reported
-- through private.referral_reverse_for_transaction(...).
--
-- RISK: device, network, velocity, payout-account reuse and referral-graph
-- clustering raise a score. A score at or above the policy threshold routes
-- the referral (or payout) to under_review. NOTHING HERE BANS ANYONE: shared
-- Wi-Fi is how a family or an office looks, so it is a review, not a verdict.
--
-- TRIGGER SAFETY. The triggers on live tables (transactions, confirmed_phones,
-- booking_refunds) can never abort the host transaction: risk is computed
-- before any lock; the referral row is taken with SKIP LOCKED and the
-- platform-budget lock with pg_try_advisory_xact_lock, so a busy lock leaves
-- the referral pending instead of waiting; each function carries a short
-- lock_timeout (a lock_not_available is caught); every body is wrapped in an
-- exception handler. public.referral_qualify_pending() (service role) retries
-- whatever a trigger skipped. CRON WIRING IS NOT IN THIS FILE: the scheduler
-- must call referral_qualify_pending() and referral_release_due() (e.g. every
-- 15 minutes) and the app sweep sweepRewardsPayouts(); owner: the cron lane.
--
-- PARTIAL REFUNDS (D51: the reward is released after the protection window).
-- A reward is reversed only when the qualifying payment is FULLY refunded
-- (booking_refunds.refund_minor >= paid_minor, or the transaction itself
-- going REFUNDED). A partial goodwill refund never claws a reward back.
--
-- REVERSAL decides by whether the `earn:` ledger entry exists, never by the
-- referral's status, so a reward moved to under_review after it was earned is
-- still taken back.
--
-- PAYOUTS ARE OFF BY DEFAULT. The marketing float is Vallo's own money and
-- must not be the main Paystack balance (which holds customer settlement
-- money). No separate float account is configured yet, so the dated policy
-- flag referral_policy.payouts_enabled starts false, and the app also needs
-- PAYSTACK_FLOAT_SECRET_KEY (the float account's own key). With either
-- missing, a withdrawal answers 'not_available' and nothing is held or sent.
--
-- `paid` on a referral means its reward was in a payout the provider
-- confirmed: a payout includes whole referrals only, as many as the ledger
-- balance covers, and its amount is exactly their sum.
--
-- PRIVACY: members never read risk_score, risk_reasons, account_key,
-- recipient_code or the policy thresholds and budget (column grants; the
-- member-facing figures come through my_rewards_summary()).
--
-- No trigger or row removal statements (the lead's tooling hangs on them).

set local lock_timeout = '5s';

-- ------------------------------------------------------------------ policy

create table if not exists public.referral_policy (
  id                            uuid primary key default gen_random_uuid(),
  reward_minor                  bigint not null check (reward_minor >= 0),
  member_monthly_cap            int    not null check (member_monthly_cap >= 0),
  platform_monthly_budget_minor bigint not null check (platform_monthly_budget_minor >= 0),
  withdrawal_min_minor          bigint not null check (withdrawal_min_minor > 0),
  hold_days                     int    not null default 7 check (hold_days between 0 and 120),
  review_risk_score             int    not null default 40 check (review_risk_score between 1 and 1000),
  velocity_per_day              int    not null default 50 check (velocity_per_day > 0),
  -- Payouts stay off until a dated row turns them on, once a separate
  -- marketing-float Paystack account exists (see the header).
  payouts_enabled               boolean not null default false,
  effective_from                timestamptz not null default now(),
  effective_to                  timestamptz,
  reason                        text not null check (length(btrim(reason)) >= 12),
  created_by                    uuid references auth.users(id) on delete set null,
  created_at                    timestamptz not null default now(),
  constraint referral_policy_window check (effective_to is null or effective_to > effective_from)
);

comment on table public.referral_policy is
  'Referral rates as dated rows (D51). The current row is the latest effective_from with no effective_to in the past. Retire a row by setting effective_to; never rewrite it.';

alter table public.referral_policy enable row level security;
-- Members never read thresholds or the budget; my_rewards_summary() hands
-- them the member-facing figures. Service role reads only.
revoke all on public.referral_policy from public, anon, authenticated, service_role;
grant select on public.referral_policy to service_role;

create or replace function private.referral_policy_frozen()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A referral policy row is retired with effective_to, never deleted.' using errcode = 'RM401';
  end if;
  if (to_jsonb(new) - 'effective_to') is distinct from (to_jsonb(old) - 'effective_to')
     or old.effective_to is not null then
    raise exception 'A referral policy row is never rewritten; add a new dated row.' using errcode = 'RM401';
  end if;
  return new;
end $$;

create or replace trigger referral_policy_frozen
  before update or delete on public.referral_policy
  for each row execute function private.referral_policy_frozen();

-- The founder's numbers (D51). The platform budget below is a STARTING
-- figure the founder has not set; it is a row, so it is changed by adding one.
insert into public.referral_policy
  (reward_minor, member_monthly_cap, platform_monthly_budget_minor, withdrawal_min_minor,
   hold_days, review_risk_score, velocity_per_day, payouts_enabled, effective_from, reason)
select 7000, 1500, 100000000, 100000, 7, 40, 50, false, '2026-10-06T00:00:00Z',
       'D51 founder rates: 70 naira, 1,500 a month, 1,000 naira minimum. Platform budget 1,000,000 naira a month is a placeholder pending the founder. Payouts off until a separate marketing-float account exists.'
where not exists (select 1 from public.referral_policy);

create or replace function private.referral_policy_now()
returns public.referral_policy language sql stable set search_path = '' as $$
  select p.* from public.referral_policy p
   where p.effective_from <= now() and (p.effective_to is null or p.effective_to > now())
   order by p.effective_from desc
   limit 1;
$$;

create or replace function private.lagos_month(p_at timestamptz default now())
returns date language sql stable set search_path = '' as $$
  select date_trunc('month', p_at at time zone 'Africa/Lagos')::date;
$$;

-- --------------------------------------------------------------- referrals

create table if not exists public.referrals (
  id                 uuid primary key default gen_random_uuid(),
  -- No foreign key to auth.users, on purpose: these are money records and
  -- outlive an account. Erasure anonymises; it never deletes a ledger.
  referrer_id        uuid not null,
  referred_id        uuid not null unique,
  code               text not null,
  status             text not null default 'pending' check (status in
                       ('pending','qualified','under_review','approved','available','processing','paid','reversed')),
  qualifying_tx_id   uuid,
  qualifying_booking_id uuid,
  referred_phone_key text,
  policy_id          uuid references public.referral_policy(id),
  reward_minor       bigint check (reward_minor is null or reward_minor >= 0),
  month              date,
  risk_score         int not null default 0,
  risk_reasons       jsonb not null default '[]'::jsonb,
  review_reason      text,
  payout_id          uuid,
  attributed_at      timestamptz not null default now(),
  qualified_at       timestamptz,
  approved_at        timestamptz,
  available_at       timestamptz,
  updated_at         timestamptz not null default now(),
  constraint referrals_not_self check (referrer_id <> referred_id)
);

comment on table public.referrals is
  'One row per referred member, attributed server-side from the sign-up referral_code. Lifecycle pending > qualified > approved|under_review > available > processing > paid, or reversed. Rewards Balance, never a wallet (D51).';

create index if not exists referrals_referrer_month on public.referrals (referrer_id, month);
create index if not exists referrals_status on public.referrals (status);
create index if not exists referrals_payout on public.referrals (payout_id) where payout_id is not null;
-- ONE REWARD PER VERIFIED IDENTITY: a confirmed phone earns its referrer once.
create unique index if not exists referrals_one_per_phone
  on public.referrals (referred_phone_key)
  where referred_phone_key is not null and status <> 'reversed';

alter table public.referrals enable row level security;
revoke all on public.referrals from public, anon, authenticated, service_role;
grant select on public.referrals to service_role;
-- Members read their referrals through public.my_referrals(), which never
-- hands back who was referred; staff read through the admin functions.

create table if not exists public.referral_events (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete restrict,
  from_status  text,
  to_status    text not null,
  reason       text not null,
  actor_id     uuid,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists referral_events_referral on public.referral_events (referral_id, created_at);
alter table public.referral_events enable row level security;
revoke all on public.referral_events from public, anon, authenticated, service_role;
grant select on public.referral_events to service_role;

-- Row and statement level: TRUNCATE skips row triggers, so it is refused too.
create or replace function private.referral_refuse_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only: add a new entry instead.', tg_table_name using errcode = 'RM402';
end $$;

create or replace trigger referral_events_append_only
  before update or delete on public.referral_events
  for each row execute function private.referral_refuse_rewrite();
create or replace trigger referral_events_no_truncate
  before truncate on public.referral_events
  for each statement execute function private.referral_refuse_rewrite();
create or replace trigger referrals_no_truncate
  before truncate on public.referrals
  for each statement execute function private.referral_refuse_rewrite();
create or replace trigger referral_policy_no_truncate
  before truncate on public.referral_policy
  for each statement execute function private.referral_refuse_rewrite();

-- The transitions a referral may make. Anything else is a bug and refused.
create or replace function private.referral_transition_ok(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select p_from = p_to or (p_from, p_to) in (
    ('pending','qualified'), ('pending','reversed'),
    ('qualified','approved'), ('qualified','under_review'), ('qualified','reversed'),
    ('under_review','approved'), ('under_review','reversed'),
    ('approved','available'), ('approved','under_review'), ('approved','reversed'),
    ('available','processing'), ('available','reversed'), ('available','under_review'),
    ('processing','paid'), ('processing','available'), ('processing','reversed'),
    ('paid','reversed')
  );
$$;

create or replace function private.referrals_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if not private.referral_transition_ok(old.status, new.status) then
      raise exception 'A referral cannot move from % to %.', old.status, new.status using errcode = 'RM403';
    end if;
    if new.referrer_id <> old.referrer_id or new.referred_id <> old.referred_id or new.code <> old.code then
      raise exception 'A referral''s attribution is written once.' using errcode = 'RM403';
    end if;
    -- The reward is fixed by the policy row in force at qualification.
    if old.reward_minor is not null and new.reward_minor is distinct from old.reward_minor then
      raise exception 'A referral''s reward is fixed when it qualifies.' using errcode = 'RM403';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

create or replace trigger referrals_guard
  before update on public.referrals
  for each row execute function private.referrals_guard();

-- ----------------------------------------------------------- rewards ledger

create table if not exists public.rewards_payouts (
  id                     uuid primary key default gen_random_uuid(),
  member_id              uuid not null,
  amount_minor           bigint not null check (amount_minor > 0),
  reference              text not null unique,
  status                 text not null default 'processing'
                           check (status in ('under_review','processing','unknown','paid','failed')),
  bank_code              text not null,
  account_last4          text not null check (account_last4 ~ '^\d{4}$'),
  account_key            text,
  account_name           text not null,
  recipient_code         text,
  transfer_code          text,
  -- Set when the transfer is claimed for sending (once); a payout with a
  -- recipient and no initiation is sent by the sweep (e.g. after release).
  transfer_initiated_at  timestamptz,
  provider_status        text,
  risk_score             int not null default 0,
  risk_reasons           jsonb not null default '[]'::jsonb,
  failure_reason         text,
  created_at             timestamptz not null default now(),
  settled_at             timestamptz,
  updated_at             timestamptz not null default now()
);
comment on table public.rewards_payouts is
  'Rewards Balance payouts, paid by Paystack transfer from Vallo''s marketing float (D51), never Payluk and never customer funds. Paid only on provider confirmation; a timeout is unknown, never failed.';
create index if not exists rewards_payouts_member on public.rewards_payouts (member_id, created_at desc);
create index if not exists rewards_payouts_open on public.rewards_payouts (status) where status in ('processing','unknown','under_review');
create index if not exists rewards_payouts_account on public.rewards_payouts (account_key) where account_key is not null;
alter table public.rewards_payouts enable row level security;
revoke all on public.rewards_payouts from public, anon, authenticated, service_role;
-- Members see their own payouts without the fraud signals or provider handles.
grant select (id, member_id, amount_minor, status, account_last4, account_name, created_at, settled_at)
  on public.rewards_payouts to authenticated;
grant select on public.rewards_payouts to service_role;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rewards_payouts' and policyname = 'rewards_payouts_own') then
    create policy rewards_payouts_own on public.rewards_payouts for select to authenticated
      using (member_id = (select auth.uid()));
  end if;
end $p$;

do $fk$ begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_payout_fk') then
    alter table public.referrals add constraint referrals_payout_fk
      foreign key (payout_id) references public.rewards_payouts(id) on delete restrict;
  end if;
end $fk$;

create or replace function private.rewards_payouts_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A payout is a record of money; it is never deleted.' using errcode = 'RM404';
  end if;
  if new.member_id <> old.member_id or new.amount_minor <> old.amount_minor or new.reference <> old.reference then
    raise exception 'A payout''s member, amount and reference are written once.' using errcode = 'RM404';
  end if;
  -- Terminal states stay terminal.
  if old.status in ('paid','failed') and new.status <> old.status then
    raise exception 'A % payout cannot become %.', old.status, new.status using errcode = 'RM404';
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace trigger rewards_payouts_guard
  before update or delete on public.rewards_payouts
  for each row execute function private.rewards_payouts_guard();
create or replace trigger rewards_payouts_no_truncate
  before truncate on public.rewards_payouts
  for each statement execute function private.referral_refuse_rewrite();

create table if not exists public.rewards_ledger (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null,
  kind            text not null check (kind in
                    ('reward_earned','reward_reversed','payout_hold','payout_release')),
  amount_minor    bigint not null check (amount_minor <> 0),
  referral_id     uuid references public.referrals(id) on delete restrict,
  payout_id       uuid references public.rewards_payouts(id) on delete restrict,
  reason          text not null check (length(btrim(reason)) > 0),
  actor_id        uuid,
  idempotency_key text not null unique,
  created_at      timestamptz not null default now(),
  constraint rewards_ledger_sign check (
    (kind in ('reward_earned','payout_release') and amount_minor > 0) or
    (kind in ('reward_reversed','payout_hold') and amount_minor < 0))
);
comment on table public.rewards_ledger is
  'The Rewards Balance, append-only (D51). Balance = sum(amount_minor). A reversal is a new negative entry with reason and actor. Not a wallet: Vallo owes this money, it does not hold the member''s money.';
create index if not exists rewards_ledger_member on public.rewards_ledger (member_id, created_at);
alter table public.rewards_ledger enable row level security;
revoke all on public.rewards_ledger from public, anon, authenticated, service_role;
grant select (id, member_id, kind, amount_minor, referral_id, payout_id, reason, created_at)
  on public.rewards_ledger to authenticated;
grant select on public.rewards_ledger to service_role;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rewards_ledger' and policyname = 'rewards_ledger_own') then
    create policy rewards_ledger_own on public.rewards_ledger for select to authenticated
      using (member_id = (select auth.uid()));
  end if;
end $p$;

create or replace trigger rewards_ledger_append_only
  before update or delete on public.rewards_ledger
  for each row execute function private.referral_refuse_rewrite();
create or replace trigger rewards_ledger_no_truncate
  before truncate on public.rewards_ledger
  for each statement execute function private.referral_refuse_rewrite();

-- --------------------------------------------------------------- helpers

create or replace function private.referral_log(p_id uuid, p_from text, p_to text, p_reason text, p_actor uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.referral_events (referral_id, from_status, to_status, reason, actor_id, detail)
  values (p_id, p_from, p_to, p_reason, p_actor, coalesce(p_detail, '{}'::jsonb));
$$;

create or replace function private.referral_move(p_id uuid, p_to text, p_reason text, p_actor uuid, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from text;
begin
  select status into v_from from public.referrals where id = p_id for update;
  if v_from is null or v_from = p_to then return; end if;
  update public.referrals
     set status = p_to,
         approved_at  = case when p_to = 'approved'  then now() else approved_at end,
         available_at = case when p_to = 'available' then now() else available_at end,
         review_reason = case when p_to = 'under_review' then p_reason else review_reason end
   where id = p_id;
  perform private.referral_log(p_id, v_from, p_to, p_reason, p_actor, p_detail);
end $$;

-- Who referred this member, from what sign-up recorded server-side.
create or replace function private.referral_attribute(p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_code text; v_referrer uuid; v_id uuid;
begin
  select id into v_id from public.referrals where referred_id = p_user;
  if v_id is not null then return v_id; end if;
  select upper(btrim(u.raw_user_meta_data ->> 'referral_code')) into v_code from auth.users u where u.id = p_user;
  if v_code is null or v_code = '' then return null; end if;
  select r.user_id into v_referrer from public.referral_codes r where r.code = v_code;
  if v_referrer is null or v_referrer = p_user then return null; end if;
  insert into public.referrals (referrer_id, referred_id, code)
  values (v_referrer, p_user, v_code)
  on conflict (referred_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.referrals where referred_id = p_user;
  else
    perform private.referral_log(v_id, null, 'pending', 'attributed from the sign-up referral code', null);
  end if;
  return v_id;
end $$;

-- ------------------------------------------------------------------- risk

-- A score and the reasons for it. Never a ban: the caller routes a high score
-- to under_review for a person to decide.
create or replace function private.referral_risk(p_referral uuid, p_phone_key text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r public.referrals; pol public.referral_policy;
  score int := 0; reasons jsonb := '[]'::jsonb; n int;
begin
  select * into r from public.referrals where id = p_referral;
  if r.id is null then return jsonb_build_object('score', 0, 'reasons', reasons); end if;
  pol := private.referral_policy_now();

  -- DEVICE: the referrer and the referred signed in on the same device.
  if exists (select 1 from public.known_devices a join public.known_devices b on b.fingerprint = a.fingerprint
              where a.user_id = r.referrer_id and b.user_id = r.referred_id) then
    score := score + 40; reasons := reasons || '"shared_device_with_referrer"'::jsonb;
  end if;
  -- DEVICE: this referrer's other referred members share a device with this one.
  select count(distinct o.referred_id) into n
    from public.referrals o
    join public.known_devices a on a.user_id = o.referred_id
    join public.known_devices b on b.fingerprint = a.fingerprint and b.user_id = r.referred_id
   where o.referrer_id = r.referrer_id and o.referred_id <> r.referred_id;
  if n > 0 then score := score + 25; reasons := reasons || '"device_shared_across_referred"'::jsonb; end if;

  -- NETWORK: the same address as the referrer. Shared Wi-Fi is common (a
  -- family, an office), so this raises the score and nothing more.
  if exists (select 1 from auth.sessions a join auth.sessions b on b.ip = a.ip
              where a.user_id = r.referrer_id and b.user_id = r.referred_id and a.ip is not null) then
    score := score + 20; reasons := reasons || '"shared_network_with_referrer"'::jsonb;
  end if;
  select count(distinct o.referred_id) into n
    from public.referrals o
    join auth.sessions a on a.user_id = o.referred_id
    join auth.sessions b on b.ip = a.ip and b.user_id = r.referred_id
   where o.referrer_id = r.referrer_id and o.referred_id <> r.referred_id and a.ip is not null;
  if n >= 3 then score := score + 15; reasons := reasons || '"network_shared_across_referred"'::jsonb; end if;

  -- VELOCITY: more qualifications in a day than a person makes.
  select count(*) into n from public.referrals o
   where o.referrer_id = r.referrer_id and o.qualified_at > now() - interval '24 hours' and o.id <> r.id;
  if n >= coalesce(pol.velocity_per_day, 50) then
    score := score + 30; reasons := reasons || '"velocity"'::jsonb;
  end if;

  -- PAYOUT ACCOUNT REUSE: an account the referrer was paid to has paid
  -- another member too, or the referred member was paid to it.
  if exists (select 1 from public.rewards_payouts a join public.rewards_payouts b
               on b.account_key = a.account_key and b.member_id <> a.member_id
              where a.member_id = r.referrer_id and a.account_key is not null) then
    score := score + 50; reasons := reasons || '"payout_account_reused"'::jsonb;
  end if;

  -- GRAPH: a ring (the referred member referred the referrer, directly or
  -- one step removed), or the referrer was itself referred by someone whose
  -- referred members cluster on devices.
  if exists (select 1 from public.referrals x
              where x.referrer_id = r.referred_id and x.referred_id = r.referrer_id)
     or exists (select 1 from public.referrals x join public.referrals y on y.referrer_id = x.referred_id
                 where x.referrer_id = r.referred_id and y.referred_id = r.referrer_id) then
    score := score + 40; reasons := reasons || '"referral_ring"'::jsonb;
  end if;

  -- IDENTITY: the referred phone matches an identity stopped for fraud.
  if coalesce(p_phone_key, r.referred_phone_key) is not null and exists (
       select 1 from private.identity_denylist d where d.key_kind = 'phone'
          and d.key_hmac = coalesce(p_phone_key, r.referred_phone_key)) then
    score := score + 100; reasons := reasons || '"identity_denylisted"'::jsonb;
  end if;

  return jsonb_build_object('score', score, 'reasons', reasons);
end $$;

-- ----------------------------------------------------------- qualification

-- The two caps for one referral, read under the platform-budget lock the
-- caller holds. Null when within both caps, else the reason.
create or replace function private.referral_cap_reason(p_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare r public.referrals; pol public.referral_policy; v_member_n int; v_spent bigint;
begin
  select * into r from public.referrals where id = p_id;
  if r.id is null then return 'not_found'; end if;
  select * into pol from public.referral_policy where id = r.policy_id;
  if pol.id is null then pol := private.referral_policy_now(); end if;
  select count(*) into v_member_n from public.referrals
   where referrer_id = r.referrer_id and month = r.month and id <> r.id
     and status in ('qualified','approved','available','processing','paid');
  select coalesce(sum(reward_minor), 0) into v_spent from public.referrals
   where month = r.month and id <> r.id and status in ('approved','available','processing','paid');
  if v_member_n >= pol.member_monthly_cap then return 'member monthly cap reached'; end if;
  if v_spent + coalesce(r.reward_minor, pol.reward_minor) > pol.platform_monthly_budget_minor then
    return 'platform monthly budget reached';
  end if;
  return null;
end $$;

-- Qualify when BOTH conditions hold: the referred phone is confirmed and a
-- payment of theirs has settled. Safe to call any number of times. NEVER
-- WAITS: a referral row or budget lock someone else holds leaves it pending
-- ('pending_lock') for referral_qualify_pending() to retry.
create or replace function private.referral_try_qualify(p_user uuid)
returns text language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare
  v_id uuid; r public.referrals; pol public.referral_policy;
  v_phone text; v_key text; v_tx uuid; v_booking uuid;
  v_month date := private.lagos_month(now());
  risk jsonb; v_to text; v_reason text;
begin
  v_id := private.referral_attribute(p_user);
  if v_id is null then return 'not_referred'; end if;
  select * into r from public.referrals where id = v_id for update skip locked;
  if r.id is null then return 'pending_lock'; end if;
  if r.status <> 'pending' then return r.status; end if;

  select phone into v_phone from public.confirmed_phones where user_id = p_user;
  if v_phone is null then return 'pending_phone'; end if;

  select t.id, t.booking_id into v_tx, v_booking
    from public.transactions t
    left join public.bookings b on b.id = t.booking_id
   where t.status = 'SUCCESSFUL' and t.amount_minor > 0
     and coalesce(t.share_payer_id, b.guest_id) = p_user
   order by t.updated_at, t.created_at
   limit 1;
  if v_tx is null then return 'pending_action'; end if;

  -- One reward per verified identity FAILS CLOSED: without the vault secret
  -- there is no key to check, so nothing qualifies until it is back.
  v_key := private.identity_key('phone', v_phone);
  if v_key is null then return 'pending_identity_key'; end if;
  pol := private.referral_policy_now();
  if pol.id is null then return 'pending_policy'; end if;

  if exists (select 1 from public.referrals o
              where o.referred_phone_key = v_key and o.status <> 'reversed' and o.id <> r.id) then
    perform private.referral_move(r.id, 'reversed', 'this phone already earned a referral reward', null,
                                  jsonb_build_object('rule', 'one_per_identity'));
    return 'reversed';
  end if;

  -- Risk first, outside any lock: it is the expensive part.
  risk := private.referral_risk(r.id, v_key);

  -- The platform cap is read under one lock so two qualifications at once
  -- cannot both fit into the last 70 naira. TRY only: if it is busy, stay
  -- pending and let the sweep come back.
  if not pg_try_advisory_xact_lock(hashtext('referral_platform_budget'), hashtext(v_month::text)) then
    return 'pending_lock';
  end if;

  update public.referrals
     set status = 'qualified', qualified_at = now(), qualifying_tx_id = v_tx, qualifying_booking_id = v_booking,
         referred_phone_key = v_key, policy_id = pol.id, reward_minor = pol.reward_minor, month = v_month,
         risk_score = (risk ->> 'score')::int, risk_reasons = risk -> 'reasons'
   where id = r.id;
  perform private.referral_log(r.id, 'pending', 'qualified', 'phone confirmed and a payment settled', null,
                               jsonb_build_object('transaction_id', v_tx));

  v_reason := private.referral_cap_reason(r.id);
  if v_reason is not null then
    v_to := 'under_review';
  elsif (risk ->> 'score')::int >= pol.review_risk_score then
    v_to := 'under_review'; v_reason := 'risk score at or above the review threshold';
  else
    v_to := 'approved'; v_reason := 'qualified within caps and below the risk threshold';
  end if;
  perform private.referral_move(r.id, v_to, v_reason, null, risk);
  return v_to;
end $$;

create or replace function private.referral_after_phone()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
begin
  perform private.referral_try_qualify(new.user_id);
  return new;
exception when others then
  -- A referral must never stop a phone being confirmed; the sweep retries.
  raise warning 'referral qualification skipped: %', sqlerrm;
  return new;
end $$;

create or replace trigger confirmed_phones_referral
  after insert or update of phone on public.confirmed_phones
  for each row execute function private.referral_after_phone();

-- The retry for anything a trigger skipped (a busy lock, a swallowed error, a
-- missing vault secret since restored). Service role; the cron lane wires it.
create or replace function public.referral_qualify_pending(p_limit int default 500)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_user uuid; v_out text; n int := 0; moved int := 0; failed int := 0;
begin
  for v_user in
    select u.id from (
      select r.referred_id as id from public.referrals r where r.status = 'pending'
      union
      select au.id from auth.users au
       where nullif(btrim(au.raw_user_meta_data ->> 'referral_code'), '') is not null
         and not exists (select 1 from public.referrals r where r.referred_id = au.id)
    ) u
    where exists (select 1 from public.confirmed_phones c where c.user_id = u.id)
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
  loop
    n := n + 1;
    begin
      v_out := private.referral_try_qualify(v_user);
      if v_out in ('approved','under_review','reversed') then moved := moved + 1; end if;
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
revoke all on function public.referral_qualify_pending(int) from public, anon, authenticated;
grant execute on function public.referral_qualify_pending(int) to service_role;

-- ---------------------------------------------------------------- reversal

-- Reverse a referral and, if its reward ever entered the balance (an `earn:`
-- entry exists, whatever the status says now), write the negative entry.
-- Reason and actor are always recorded.
create or replace function private.referral_reverse(p_id uuid, p_reason text, p_actor uuid)
returns void language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare r public.referrals;
begin
  select * into r from public.referrals where id = p_id for update;
  if r.id is null or r.status = 'reversed' then return; end if;
  if exists (select 1 from public.rewards_ledger where idempotency_key = 'earn:' || r.id) then
    insert into public.rewards_ledger (member_id, kind, amount_minor, referral_id, reason, actor_id, idempotency_key)
    select r.referrer_id, 'reward_reversed', -e.amount_minor, r.id, p_reason, p_actor, 'reverse:' || r.id
      from public.rewards_ledger e where e.idempotency_key = 'earn:' || r.id
    on conflict (idempotency_key) do nothing;
  end if;
  perform private.referral_move(r.id, 'reversed', p_reason, p_actor);
end $$;

create or replace function private.referral_reverse_for_transaction(p_tx uuid, p_reason text, p_actor uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_id uuid; n int := 0;
begin
  for v_id in select id from public.referrals where qualifying_tx_id = p_tx and status <> 'reversed' loop
    perform private.referral_reverse(v_id, p_reason, p_actor);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function private.referral_after_transaction()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare v_payer uuid;
begin
  if new.status = 'SUCCESSFUL' and new.amount_minor > 0
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select coalesce(new.share_payer_id, b.guest_id) into v_payer
      from (select 1) one left join public.bookings b on b.id = new.booking_id;
    if v_payer is not null then perform private.referral_try_qualify(v_payer); end if;
  elsif tg_op = 'UPDATE' and new.status = 'REFUNDED' and old.status is distinct from new.status then
    -- The transaction itself going REFUNDED is a full refund of it.
    perform private.referral_reverse_for_transaction(new.id, 'the qualifying payment was refunded');
  end if;
  return new;
exception when others then
  -- A referral must never stop a payment settling; the sweep retries.
  raise warning 'referral step skipped: %', sqlerrm;
  return new;
end $$;

create or replace trigger transactions_referral
  after insert or update of status on public.transactions
  for each row execute function private.referral_after_transaction();

-- Only a FULL refund of the qualifying booking reverses (D51: the reward is
-- released after the protection window; a partial goodwill refund is not a
-- clawback).
create or replace function private.referral_after_booking_refund()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare v_id uuid;
begin
  if coalesce(new.refund_minor, 0) > 0 and new.paid_minor is not null
     and new.refund_minor >= new.paid_minor then
    for v_id in select id from public.referrals
                 where qualifying_booking_id = new.booking_id and status <> 'reversed' loop
      perform private.referral_reverse(v_id, 'the qualifying booking was fully refunded', new.decided_by);
    end loop;
  end if;
  return new;
exception when others then
  raise warning 'referral reversal skipped: %', sqlerrm;
  return new;
end $$;

create or replace trigger booking_refunds_referral
  after insert on public.booking_refunds
  for each row execute function private.referral_after_booking_refund();

-- ------------------------------------------------------- hold, then balance

-- Approved referrals older than the hold window become available, and only
-- then does the reward enter the ledger. Service role (a cron) and the payout
-- opening both call it.
create or replace function public.referral_release_due()
returns int language plpgsql security definer set search_path = '' as $$
declare r public.referrals; pol public.referral_policy := private.referral_policy_now(); n int := 0;
begin
  for r in select * from public.referrals
            where status = 'approved'
              and approved_at <= now() - make_interval(days => coalesce(pol.hold_days, 7))
            for update skip locked loop
    insert into public.rewards_ledger (member_id, kind, amount_minor, referral_id, reason, idempotency_key)
    values (r.referrer_id, 'reward_earned', r.reward_minor, r.id, 'referral reward after the hold', 'earn:' || r.id)
    on conflict (idempotency_key) do nothing;
    perform private.referral_move(r.id, 'available', 'hold window passed', null);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.referral_release_due() from public, anon, authenticated;
grant execute on function public.referral_release_due() to service_role;

-- -------------------------------------------------------------- member read

create or replace function public.my_rewards_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id), pol as (select * from private.referral_policy_now())
  select case when (select id from me) is null then null else jsonb_build_object(
    'balance_minor',      (select coalesce(sum(amount_minor), 0) from public.rewards_ledger where member_id = (select id from me)),
    'available_minor',    (select coalesce(sum(reward_minor), 0) from public.referrals where referrer_id = (select id from me) and status = 'available'),
    'on_hold_minor',      (select coalesce(sum(reward_minor), 0) from public.referrals where referrer_id = (select id from me) and status in ('qualified','approved')),
    'processing_minor',   (select coalesce(sum(amount_minor), 0) from public.rewards_payouts where member_id = (select id from me) and status in ('processing','unknown','under_review')),
    'paid_minor',         (select coalesce(sum(amount_minor), 0) from public.rewards_payouts where member_id = (select id from me) and status = 'paid'),
    'pending_count',      (select count(*) from public.referrals where referrer_id = (select id from me) and status = 'pending'),
    'under_review_count', (select count(*) from public.referrals where referrer_id = (select id from me) and status = 'under_review'),
    'qualified_this_month', (select count(*) from public.referrals where referrer_id = (select id from me)
                              and month = private.lagos_month(now()) and status not in ('pending','reversed')),
    'reward_minor',        (select reward_minor from pol),
    'member_monthly_cap',  (select member_monthly_cap from pol),
    'withdrawal_min_minor',(select withdrawal_min_minor from pol),
    'payouts_enabled',     coalesce((select payouts_enabled from pol), false)
  ) end;
$$;
revoke all on function public.my_rewards_summary() from public, anon;
grant execute on function public.my_rewards_summary() to authenticated;

-- A member's referrals, never naming who was referred beyond a first name.
create or replace function public.my_referrals(p_limit int default 50)
returns table (id uuid, status text, first_name text, reward_minor bigint, attributed_at timestamptz, qualified_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.status,
         nullif(split_part(btrim(coalesce(p.first_name, p.display_name, '')), ' ', 1), ''),
         r.reward_minor, r.attributed_at, r.qualified_at
    from public.referrals r left join public.profiles p on p.id = r.referred_id
   where r.referrer_id = (select auth.uid())
   order by r.attributed_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;
revoke all on function public.my_referrals(int) from public, anon;
grant execute on function public.my_referrals(int) to authenticated;

-- ------------------------------------------------------------------ payouts

-- Open a payout of everything available. Service role only: the server
-- action has already resolved the account name with the bank.
-- p_recipient_code is the Paystack recipient the app made on the FLOAT
-- account before opening (no money moves when a recipient is made), so a
-- payout released from review later can be sent without the account number.
-- OFF unless the policy row in force has payouts_enabled.
create or replace function public.rewards_payout_open(
  p_member uuid, p_bank_code text, p_account_number text, p_account_name text, p_recipient_code text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare
  pol public.referral_policy := private.referral_policy_now();
  v_amount bigint; v_balance bigint; v_key text; v_id uuid; v_ref text;
  v_score int := 0; v_reasons jsonb := '[]'::jsonb; v_status text := 'processing'; v_ids uuid[];
begin
  if pol.id is null or not pol.payouts_enabled then
    return jsonb_build_object('status', 'not_available');
  end if;
  if p_member is null or coalesce(btrim(p_account_name), '') = '' or p_account_number !~ '^\d{10}$'
     or coalesce(btrim(p_recipient_code), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if not exists (select 1 from public.confirmed_phones where user_id = p_member) then
    return jsonb_build_object('status', 'phone_required');
  end if;
  perform pg_advisory_xact_lock(hashtext('rewards_payout'), hashtext(p_member::text));
  if exists (select 1 from public.rewards_payouts where member_id = p_member and status in ('processing','unknown','under_review')) then
    return jsonb_build_object('status', 'already_open');
  end if;
  perform public.referral_release_due();

  select coalesce(sum(amount_minor), 0) into v_balance from public.rewards_ledger where member_id = p_member;
  -- WHOLE REFERRALS ONLY, oldest first, as many as the ledger balance covers
  -- (a reversal after payment is recovered by leaving later rewards unpaid).
  -- The payout amount is exactly their sum, so `paid` on a referral means its
  -- reward was paid.
  select coalesce(array_agg(x.id), '{}'::uuid[]), coalesce(sum(x.reward_minor), 0) into v_ids, v_amount from (
    select id, reward_minor,
           sum(reward_minor) over (order by available_at, id rows between unbounded preceding and current row) as run
      from public.referrals where referrer_id = p_member and status = 'available'
  ) x where x.run <= v_balance;
  if v_amount < pol.withdrawal_min_minor then
    return jsonb_build_object('status', 'below_minimum', 'available_minor', greatest(v_amount, 0),
                              'withdrawal_min_minor', pol.withdrawal_min_minor);
  end if;

  v_key := private.identity_key('payout', p_account_number);
  if v_key is not null and exists (select 1 from public.rewards_payouts where account_key = v_key and member_id <> p_member) then
    v_score := v_score + 50; v_reasons := v_reasons || '"payout_account_reused"'::jsonb;
  end if;
  if v_key is not null and exists (select 1 from private.identity_denylist where key_kind = 'payout' and key_hmac = v_key) then
    v_score := v_score + 100; v_reasons := v_reasons || '"payout_account_denylisted"'::jsonb;
  end if;
  if v_key is null then
    -- No vault secret, so account reuse cannot be checked: a person looks.
    v_score := v_score + pol.review_risk_score; v_reasons := v_reasons || '"identity_key_unavailable"'::jsonb;
  end if;
  if v_score >= pol.review_risk_score then v_status := 'under_review'; end if;

  v_id := gen_random_uuid();
  v_ref := 'vallo-rw-' || replace(v_id::text, '-', '');
  insert into public.rewards_payouts (id, member_id, amount_minor, reference, status, bank_code, account_last4,
                                      account_key, account_name, recipient_code, risk_score, risk_reasons)
  values (v_id, p_member, v_amount, v_ref, v_status, btrim(p_bank_code), right(p_account_number, 4),
          v_key, btrim(p_account_name), btrim(p_recipient_code), v_score, v_reasons);
  insert into public.rewards_ledger (member_id, kind, amount_minor, payout_id, reason, idempotency_key)
  values (p_member, 'payout_hold', -v_amount, v_id, 'held for a Rewards Balance payout', 'hold:' || v_id);
  update public.referrals set status = 'processing', payout_id = v_id where id = any(v_ids);
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, 'available', 'processing', 'included in a payout', jsonb_build_object('payout_id', v_id)
    from public.referrals where payout_id = v_id;

  return jsonb_build_object('status', v_status, 'payout_id', v_id, 'reference', v_ref, 'amount_minor', v_amount);
end $$;
revoke all on function public.rewards_payout_open(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.rewards_payout_open(uuid, text, text, text, text) to service_role;

-- Record what the provider said. Idempotent: settling a settled payout to the
-- same outcome is a no-op; to another outcome it is refused. `unknown` is a
-- timeout: the money may have moved, so nothing is released.
create or replace function public.rewards_payout_settle(
  p_reference text, p_outcome text, p_provider_status text default null,
  p_transfer_code text default null, p_recipient_code text default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts;
begin
  if p_outcome not in ('paid','failed','unknown','processing') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into p from public.rewards_payouts where reference = p_reference for update;
  if p.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if p.status = p_outcome then
    -- Same state: keep what the provider told us, change nothing else.
    update public.rewards_payouts
       set provider_status = coalesce(p_provider_status, provider_status),
           transfer_code = coalesce(p_transfer_code, transfer_code),
           recipient_code = coalesce(p_recipient_code, recipient_code)
     where id = p.id and status not in ('paid','failed');
    return jsonb_build_object('status', p.status, 'changed', false);
  end if;
  if p.status in ('paid','failed') then
    return jsonb_build_object('status', p.status, 'changed', false, 'conflict', p_outcome);
  end if;
  if p.status = 'under_review' and p_outcome <> 'failed' then
    return jsonb_build_object('status', p.status, 'changed', false);
  end if;

  update public.rewards_payouts
     set status = p_outcome,
         provider_status = coalesce(p_provider_status, provider_status),
         transfer_code = coalesce(p_transfer_code, transfer_code),
         recipient_code = coalesce(p_recipient_code, recipient_code),
         failure_reason = case when p_outcome = 'failed' then coalesce(p_reason, 'the transfer failed') else failure_reason end,
         settled_at = case when p_outcome in ('paid','failed') then now() else settled_at end
   where id = p.id;

  if p_outcome = 'paid' then
    insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
    select id, 'processing', 'paid', 'the provider confirmed the transfer', jsonb_build_object('payout_id', p.id)
      from public.referrals where payout_id = p.id and status = 'processing';
    update public.referrals set status = 'paid' where payout_id = p.id and status = 'processing';
  elsif p_outcome = 'failed' then
    insert into public.rewards_ledger (member_id, kind, amount_minor, payout_id, reason, idempotency_key)
    values (p.member_id, 'payout_release', p.amount_minor, p.id, coalesce(p_reason, 'the transfer failed'), 'release:' || p.id)
    on conflict (idempotency_key) do nothing;
    insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
    select id, 'processing', 'available', 'the transfer failed; back in the balance', jsonb_build_object('payout_id', p.id)
      from public.referrals where payout_id = p.id and status = 'processing';
    update public.referrals set status = 'available', payout_id = null where payout_id = p.id and status = 'processing';
  end if;
  return jsonb_build_object('status', p_outcome, 'changed', true, 'member_id', p.member_id, 'amount_minor', p.amount_minor);
end $$;
revoke all on function public.rewards_payout_settle(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.rewards_payout_settle(text, text, text, text, text, text) to service_role;

-- Payouts the sweep should ask the provider about: only ones whose transfer
-- was actually initiated (Paystack has never seen the others).
create or replace function public.rewards_payouts_to_verify(p_older_than_minutes int default 10)
returns table (reference text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select reference, status, created_at from public.rewards_payouts
   where status in ('processing','unknown') and transfer_initiated_at is not null
     and updated_at < now() - make_interval(mins => greatest(1, coalesce(p_older_than_minutes, 10)))
   order by created_at limit 100;
$$;
revoke all on function public.rewards_payouts_to_verify(int) from public, anon, authenticated;
grant execute on function public.rewards_payouts_to_verify(int) to service_role;

-- Payouts to SEND: processing, with a recipient, never initiated (the normal
-- path initiates at once; this catches a release from review and a crash
-- between opening and sending).
create or replace function public.rewards_payouts_to_send(p_older_than_minutes int default 2)
returns table (reference text, amount_minor bigint, recipient_code text)
language sql stable security definer set search_path = '' as $$
  select reference, amount_minor, recipient_code from public.rewards_payouts
   where status = 'processing' and transfer_initiated_at is null and recipient_code is not null
     and updated_at < now() - make_interval(mins => greatest(0, coalesce(p_older_than_minutes, 2)))
   order by created_at limit 100;
$$;
revoke all on function public.rewards_payouts_to_send(int) from public, anon, authenticated;
grant execute on function public.rewards_payouts_to_send(int) to service_role;

-- Claim one payout for sending, exactly once. True only for the caller that
-- set transfer_initiated_at; anyone else must not send.
create or replace function public.rewards_payout_claim_send(p_reference text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.rewards_payouts set transfer_initiated_at = now()
   where reference = p_reference and status = 'processing'
     and transfer_initiated_at is null and recipient_code is not null
  returning id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.rewards_payout_claim_send(text) from public, anon, authenticated;
grant execute on function public.rewards_payout_claim_send(text) to service_role;

-- No payout sits in flight forever unseen: anything processing or unknown
-- past the age is returned for an alert (the sweep raises it to ops).
create or replace function public.rewards_payouts_stuck(p_older_than_hours int default 24)
returns table (reference text, status text, created_at timestamptz, initiated boolean)
language sql stable security definer set search_path = '' as $$
  select reference, status, created_at, transfer_initiated_at is not null from public.rewards_payouts
   where status in ('processing','unknown')
     and created_at < now() - make_interval(hours => greatest(1, coalesce(p_older_than_hours, 24)))
   order by created_at limit 200;
$$;
revoke all on function public.rewards_payouts_stuck(int) from public, anon, authenticated;
grant execute on function public.rewards_payouts_stuck(int) to service_role;

-- -------------------------------------------------------------------- staff

create or replace function public.admin_referral_decide(p_referral uuid, p_decision text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.referrals; actor uuid := (select auth.uid()); v_cap text;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into r from public.referrals where id = p_referral for update;
  if r.id is null then return 'not_found'; end if;
  if p_decision in ('approve','approve_over_cap') and r.status = 'under_review' then
    -- Both caps are rechecked under the budget lock. Exceeding one needs the
    -- explicit 'approve_over_cap' decision and a fuller reason, logged.
    perform pg_advisory_xact_lock(hashtext('referral_platform_budget'), hashtext(coalesce(r.month, private.lagos_month(now()))::text));
    v_cap := private.referral_cap_reason(r.id);
    if v_cap is not null and p_decision <> 'approve_over_cap' then
      return 'over_cap';
    end if;
    if v_cap is not null and length(btrim(p_reason)) < 20 then
      raise exception 'An approval over a cap needs the reason for the override.' using errcode = '22023';
    end if;
    perform private.referral_move(r.id, 'approved', p_reason, actor,
      case when v_cap is null then '{}'::jsonb
           else jsonb_build_object('cap_override', v_cap, 'override_reason', p_reason) end);
    if v_cap is not null then
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (actor, 'referral_cap_override', 'referral', r.id::text, jsonb_build_object('cap', v_cap, 'reason', p_reason));
    end if;
  elsif p_decision = 'reverse' then
    perform private.referral_reverse(r.id, p_reason, actor);
  elsif p_decision = 'review' and r.status in ('approved','available') then
    perform private.referral_move(r.id, 'under_review', p_reason, actor);
  else
    return 'refused';
  end if;
  return (select status from public.referrals where id = p_referral);
end $$;
revoke all on function public.admin_referral_decide(uuid, text, text) from public, anon;
grant execute on function public.admin_referral_decide(uuid, text, text) to authenticated;

-- Staff decide a payout held for review: release it to the transfer queue or
-- refuse it (which puts the money back in the balance).
create or replace function public.admin_rewards_payout_decide(p_payout uuid, p_decision text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into p from public.rewards_payouts where id = p_payout for update;
  if p.id is null or p.status <> 'under_review' then return 'refused'; end if;
  if p_decision = 'release' then
    if p.recipient_code is null then return 'no_recipient'; end if;
    -- The sweep (rewards_payouts_to_send) sends it.
    update public.rewards_payouts set status = 'processing' where id = p.id;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_released', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'processing';
  elsif p_decision = 'refuse' then
    perform public.rewards_payout_settle(p.reference, 'failed', null, null, null, 'refused on review: ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_refused', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'failed';
  end if;
  return 'refused';
end $$;
revoke all on function public.admin_rewards_payout_decide(uuid, text, text) from public, anon;
grant execute on function public.admin_rewards_payout_decide(uuid, text, text) to authenticated;

-- The graph around one member: who referred them, whom they referred, and
-- two steps out, with status and risk.
create or replace function public.admin_referral_graph(p_member uuid, p_depth int default 2)
returns table (referrer_id uuid, referred_id uuid, status text, risk_score int, risk_reasons jsonb, depth int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then return; end if;
  return query
  with recursive g as (
    select r.referrer_id, r.referred_id, r.status, r.risk_score, r.risk_reasons, 1 as depth,
           array[r.id] as seen
      from public.referrals r where r.referrer_id = p_member or r.referred_id = p_member
    union all
    select r.referrer_id, r.referred_id, r.status, r.risk_score, r.risk_reasons, g.depth + 1, g.seen || r.id
      from g join public.referrals r
        on (r.referrer_id in (g.referrer_id, g.referred_id) or r.referred_id in (g.referrer_id, g.referred_id))
     where g.depth < greatest(1, least(coalesce(p_depth, 2), 4)) and not r.id = any(g.seen)
  )
  select distinct on (g.referrer_id, g.referred_id) g.referrer_id, g.referred_id, g.status, g.risk_score, g.risk_reasons, g.depth
    from g order by g.referrer_id, g.referred_id, g.depth limit 500;
end $$;
revoke all on function public.admin_referral_graph(uuid, int) from public, anon;
grant execute on function public.admin_referral_graph(uuid, int) to authenticated;

-- Clusters: referrers whose referred members share devices or networks, the
-- shape a farm has. Largest first. A list for a person to look at.
create or replace function public.admin_referral_clusters(p_min_size int default 3)
returns table (referrer_id uuid, signal text, shared_by int, referred_ids uuid[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then return; end if;
  return query
  select x.referrer_id, x.signal, count(distinct x.referred_id)::int, array_agg(distinct x.referred_id)
    from (
      select r.referrer_id, 'device:' || left(d.fingerprint, 12) as signal, r.referred_id
        from public.referrals r join public.known_devices d on d.user_id = r.referred_id
      union all
      select r.referrer_id, 'network:' || host(s.ip), r.referred_id
        from public.referrals r join auth.sessions s on s.user_id = r.referred_id where s.ip is not null
    ) x
   group by x.referrer_id, x.signal
  having count(distinct x.referred_id) >= greatest(2, coalesce(p_min_size, 3))
   order by 3 desc limit 200;
end $$;
revoke all on function public.admin_referral_clusters(int) from public, anon;
grant execute on function public.admin_referral_clusters(int) to authenticated;

-- The liability and the month's spend against the platform budget.
create or replace function public.admin_referral_liability()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pol public.referral_policy := private.referral_policy_now(); m date := private.lagos_month(now());
begin
  if not private.is_staff() then return null; end if;
  return jsonb_build_object(
    'owed_minor', (select coalesce(sum(amount_minor), 0) from public.rewards_ledger),
    'accruing_minor', (select coalesce(sum(reward_minor), 0) from public.referrals where status in ('qualified','approved')),
    'month', m,
    'month_committed_minor', (select coalesce(sum(reward_minor), 0) from public.referrals
                               where month = m and status in ('approved','available','processing','paid')),
    'platform_monthly_budget_minor', pol.platform_monthly_budget_minor,
    'under_review', (select count(*) from public.referrals where status = 'under_review'),
    'payouts_under_review', (select count(*) from public.rewards_payouts where status = 'under_review'),
    'payouts_unknown', (select count(*) from public.rewards_payouts where status = 'unknown'),
    'payouts_stuck', (select count(*) from public.rewards_payouts where status in ('processing','unknown')
                        and created_at < now() - interval '24 hours'),
    'payouts_enabled', coalesce(pol.payouts_enabled, false));
end $$;
revoke all on function public.admin_referral_liability() from public, anon;
grant execute on function public.admin_referral_liability() to authenticated;

-- `authenticated` has USAGE on schema private and private has no default ACL
-- (PUBLIC gets EXECUTE), so every helper this file made there is closed to
-- the API explicitly.
do $rv$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private'
              and (p.proname like 'referral\_%' or p.proname in ('rewards_payouts_guard','lagos_month'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $rv$;
grant execute on function private.referral_reverse_for_transaction(uuid, text, uuid) to service_role;

-- Public functions: default privileges grant anon EXECUTE, so each is closed
-- to anon (and to PUBLIC) explicitly; the per-function lines above set the rest.
do $rp$
declare f text;
begin
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)',
    'public.my_rewards_summary()', 'public.my_referrals(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.admin_referral_decide(uuid,text,text)', 'public.admin_rewards_payout_decide(uuid,text,text)',
    'public.admin_referral_graph(uuid,int)', 'public.admin_referral_clusters(int)',
    'public.admin_referral_liability()']
  loop
    execute format('revoke all on function %s from public, anon', f);
  end loop;
end $rp$;

-- ---------------------------------------------------------------- read back

do $check$
declare missing text := ''; t text; f text;
begin
  if to_regclass('public.referral_policy') is null then missing := missing || ' referral_policy'; end if;
  if to_regclass('public.referrals') is null then missing := missing || ' referrals'; end if;
  if to_regclass('public.referral_events') is null then missing := missing || ' referral_events'; end if;
  if to_regclass('public.rewards_ledger') is null then missing := missing || ' rewards_ledger'; end if;
  if to_regclass('public.rewards_payouts') is null then missing := missing || ' rewards_payouts'; end if;
  if (private.referral_policy_now()).reward_minor is distinct from 7000 then missing := missing || ' policy_row'; end if;
  if (select bool_or(payouts_enabled) from public.referral_policy) then missing := missing || ' payouts_must_start_off'; end if;
  foreach t in array array['rewards_ledger_append_only','rewards_ledger_no_truncate','referral_events_append_only',
                           'referral_events_no_truncate','referrals_no_truncate','referral_policy_no_truncate',
                           'rewards_payouts_no_truncate','transactions_referral','confirmed_phones_referral',
                           'booking_refunds_referral'] loop
    if not exists (select 1 from pg_trigger where tgname = t) then missing := missing || ' trigger:' || t; end if;
  end loop;
  if exists (select 1 from pg_class where relname in ('referrals','rewards_ledger','rewards_payouts','referral_events','referral_policy')
               and relnamespace = 'public'::regnamespace and not relrowsecurity) then
    missing := missing || ' rls';
  end if;

  -- Table grants.
  foreach t in array array['public.referral_policy','public.referrals','public.referral_events',
                           'public.rewards_ledger','public.rewards_payouts'] loop
    if has_table_privilege('anon', t, 'SELECT') then missing := missing || ' anon_select:' || t; end if;
    if has_table_privilege('authenticated', t, 'INSERT') or has_table_privilege('authenticated', t, 'UPDATE')
       or has_table_privilege('authenticated', t, 'DELETE') or has_table_privilege('authenticated', t, 'TRUNCATE') then
      missing := missing || ' member_write:' || t;
    end if;
    if has_table_privilege('service_role', t, 'TRUNCATE') or has_table_privilege('service_role', t, 'INSERT')
       or has_table_privilege('service_role', t, 'UPDATE') or has_table_privilege('service_role', t, 'DELETE') then
      missing := missing || ' service_write:' || t;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.referral_policy', 'SELECT')
     or has_table_privilege('authenticated', 'public.referrals', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_events', 'SELECT') then
    missing := missing || ' member_reads_internal_table';
  end if;
  -- Members never see the fraud signals or the provider handles.
  foreach t in array array['risk_score','risk_reasons','account_key','recipient_code','transfer_code','bank_code','failure_reason'] loop
    if has_column_privilege('authenticated', 'public.rewards_payouts', t, 'SELECT') then
      missing := missing || ' member_column:' || t;
    end if;
  end loop;
  if has_column_privilege('authenticated', 'public.rewards_ledger', 'actor_id', 'SELECT')
     or has_column_privilege('authenticated', 'public.rewards_ledger', 'idempotency_key', 'SELECT') then
    missing := missing || ' member_column:ledger';
  end if;

  -- Function grants.
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)',
    'public.my_rewards_summary()', 'public.my_referrals(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.admin_referral_decide(uuid,text,text)', 'public.admin_rewards_payout_decide(uuid,text,text)',
    'public.admin_referral_graph(uuid,int)', 'public.admin_referral_clusters(int)',
    'public.admin_referral_liability()'] loop
    if has_function_privilege('anon', f, 'EXECUTE') then missing := missing || ' anon_exec:' || f; end if;
  end loop;
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)'] loop
    if has_function_privilege('authenticated', f, 'EXECUTE') then missing := missing || ' member_exec:' || f; end if;
    if not has_function_privilege('service_role', f, 'EXECUTE') then missing := missing || ' service_exec:' || f; end if;
  end loop;
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private'
              and (p.proname like 'referral\_%' or p.proname in ('rewards_payouts_guard','lagos_month')) loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      missing := missing || ' private_exec:' || f;
    end if;
  end loop;
  -- The trigger functions never wait long.
  foreach f in array array['private.referral_try_qualify(uuid)','private.referral_after_phone()',
                           'private.referral_after_transaction()','private.referral_after_booking_refund()'] loop
    if not exists (select 1 from pg_proc where oid = f::regprocedure
                     and proconfig::text like '%lock_timeout%') then
      missing := missing || ' lock_timeout:' || f;
    end if;
  end loop;

  if missing <> '' then raise exception 'b4_referral_rewards_engine did not land:%', missing; end if;
end $check$;
