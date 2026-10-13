-- B4 referral campaigns (D62, D63, D64). APPLIED 2026-10-06 as 20261006154817.
-- D63, D64; docs/referral/REFERRAL_ARCHITECTURE.md sections 2, 3, 10).
-- Pending: NOT applied. Requires b4_referral_rewards_engine to be applied
-- first and assumes it was: every statement is ALTER / ADD / CREATE OR
-- REPLACE against that schema, and rows that engine may already hold are
-- carried across (status names mapped, a campaign attached).
--
-- The rule everything here serves: Vallo rewards genuine network growth, not
-- account creation.
--
-- WHAT THIS ADDS
--  1. public.referral_requirements: the FIXED REGISTRY of named checks, each
--     its own SQL function (private.referral_req_<key>) called by name from
--     one CASE dispatcher. Never an expression language; a new campaign never
--     needs a new key.
--  2. public.referral_campaigns: THE ORGANISING DIMENSION. Reward, per-member
--     cap in naira per month, review window, ordered requirement keys. Terms
--     written once. Seeded: the LAUNCH campaign carrying b4's applied launch
--     policy (70 naira, 1,500 a month = 105,000 naira, 7-day hold, phone plus
--     a settled payment) as ACTIVE, so qualification behaves as it did; and
--     the three D62 example campaigns as DRAFT, marked PROPOSED.
--  3. public.referral_budget_periods: THE PLATFORM CAP (D64), DECIDED: 700,000
--     naira a month. Checked and written in ONE conditional UPDATE, so racers
--     for the last of it cannot both win. At 75 percent a high risk_alert
--     fires once per month. At 100 percent new qualification PAUSES: the
--     referral stays attributed with blocked_on = 'budget_paused' and the
--     sweep retries it when the cap rises or the month turns. A pause never
--     touches a reward that already qualified; those are honoured and paid.
--     public.referral_programme_status() tells members open or paused.
--     A month's row is created from the latest cap on first use.
--  4. public.referral_member_period_spend: the campaign's per-member cap,
--     reserved in the same transaction.
--  5. public.referral_budget_releases: a reward reversed or rejected before
--     any money left gives its budget back, once, append-only; committed
--     totals fall only by such a row.
--  6. The full lifecycle (section 2) on public.referrals, replacing b4's
--     shorter set: attributed, qualified, pending (review window),
--     under_review, approved, rejected, available, withdrawal_requested, sent,
--     paid, reversed. b4 rows are mapped: pending > attributed, processing >
--     withdrawal_requested (or sent once its transfer was initiated).
--  7. public.rewards_transfer_events and public.rewards_payout_webhook: PAID
--     ONLY ON A WEBHOOK recorded against the transfer reference, idempotent;
--     rewards_payout_settle (the transfer API and verify) can no longer pay.
--     Payouts add a `sent` state.
--  8. Payouts stay off unless a budget period exists for the month (D63/D64),
--     on top of b4's payouts_enabled flag.
--
-- GUARDRAILS THAT ARE NOT CONFIGURATION: append-only ledger and history;
-- referral money apart from customer money (paid posts go to the marketing
-- float book); paid only on webhook; the reward frozen at qualification;
-- nothing available before the review window; one reward per verified phone;
-- the platform cap.
--
-- RISK never bans. Edges are weighted (payout destination strongest; device
-- and circular referral strong; sequential phones, timing, velocity moderate;
-- the same network WEAK, capped, and never sufficient alone).
--
-- b4 OBJECTS LEFT IN PLACE, UNUSED: referral_policy.reward_minor,
-- member_monthly_cap, platform_monthly_budget_minor and hold_days (now
-- campaign and budget-period terms), referrals.policy_id, referrals.month and
-- approved_at, private.referral_cap_reason, public.admin_referral_clusters
-- (kept; the exposure-ranked view is public.admin_referral_cluster_exposure).
--
-- House rules: no trigger or row removal statements, no transaction control.
-- Two CHECK constraints are replaced to widen status lists (that is the only
-- way to widen a CHECK); nothing else is removed.

set local lock_timeout = '5s';

create or replace function private.lagos_month(p_at timestamptz default now())
returns date language sql stable set search_path = '' as $$
  select date_trunc('month', p_at at time zone 'Africa/Lagos')::date;
$$;

-- Row and statement level refusal shared by every append-only table here.
create or replace function private.referral_refuse_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only: add a new entry instead.', tg_table_name using errcode = 'RM402';
end $$;

-- ------------------------------------------------------ requirement registry

create table if not exists public.referral_requirements (
  key             text primary key check (key ~ '^[a-z][a-z0-9_]{2,40}$'),
  check_function  text not null unique check (check_function ~ '^private\.referral_req_[a-z0-9_]+$'),
  description     text not null check (length(btrim(description)) >= 12),
  takes_params    boolean not null default false,
  created_at      timestamptz not null default now()
);
comment on table public.referral_requirements is
  'D62 fixed registry of named qualification checks. Each key is one SQL function in private, called by name from private.referral_requirement_check. Never an expression language. Rows are never rewritten or removed.';

alter table public.referral_requirements enable row level security;
revoke all on public.referral_requirements from public, anon, authenticated, service_role;
grant select on public.referral_requirements to service_role;

create or replace trigger referral_requirements_fixed
  before update or delete on public.referral_requirements
  for each row execute function private.referral_refuse_rewrite();
create or replace trigger referral_requirements_no_truncate
  before truncate on public.referral_requirements
  for each statement execute function private.referral_refuse_rewrite();

-- Each check answers NULL when it passes, or a short reason when it fails.
-- The reason is stored on the referral (blocked_on) for the admin breakdown.

create or replace function private.referral_req_phone_verified(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.confirmed_phones c where c.user_id = p_user)
              then null else 'phone_not_verified' end;
$$;

create or replace function private.referral_req_email_verified(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from auth.users u where u.id = p_user and u.email_confirmed_at is not null)
              then null else 'email_not_verified' end;
$$;

-- Onboarding is complete when the terms are accepted (a fixed record) and a
-- first name is set.
create or replace function private.referral_req_onboarding_completed(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.profiles p where p.id = p_user
                             and p.terms_accepted_at is not null
                             and nullif(btrim(coalesce(p.first_name, '')), '') is not null)
              then null else 'onboarding_incomplete' end;
$$;

-- A real action, chosen by parameter rather than by a new key:
--   {"action": "settled_payment", "min_minor": <bigint, optional>}
-- settled_payment: a public.transactions row of theirs reached SUCCESSFUL with
-- a positive amount (and at least min_minor), paid by them as the booking's
-- guest or as a share payer. It is the only action defined today; any other
-- value is refused when the campaign is saved, and fails here.
create or replace function private.referral_req_meaningful_activity(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when coalesce(p_params ->> 'action', 'settled_payment') <> 'settled_payment' then 'unknown_activity_parameter'
    when exists (select 1 from public.transactions t left join public.bookings b on b.id = t.booking_id
                  where t.status = 'SUCCESSFUL' and t.amount_minor > 0
                    and t.amount_minor >= coalesce((p_params ->> 'min_minor')::bigint, 0)
                    and coalesce(t.share_payer_id, b.guest_id) = p_user)
      then null
    else 'no_meaningful_activity' end;
$$;

create or replace function private.referral_req_business_profile_completed(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.businesses b where b.owner_id = p_user and not b.is_demo
                             and nullif(btrim(b.name), '') is not null
                             and nullif(btrim(coalesce(b.phone, '')), '') is not null
                             and nullif(btrim(coalesce(b.address, '')), '') is not null
                             and b.state_code is not null and b.submitted_at is not null)
              then null else 'business_profile_incomplete' end;
$$;

-- businesses.verified is derived from staff-recorded verification rungs and
-- cannot be set by hand (businesses_verified_means_identity_chk).
create or replace function private.referral_req_business_verified(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.businesses b where b.owner_id = p_user and not b.is_demo and b.verified)
              then null else 'business_not_verified' end;
$$;

create or replace function private.referral_req_property_owner_verified(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                            where a.user_id = p_user and not l.is_demo
                              and l.listing_role = 'owner' and l.ownership_verified_at is not null)
              then null else 'ownership_not_verified' end;
$$;

create or replace function private.referral_req_space_published(p_user uuid, p_params jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                            where a.user_id = p_user and not l.is_demo
                              and l.status = 'PUBLISHED' and l.published_at is not null)
              then null else 'no_published_space' end;
$$;

-- THE DISPATCHER. A fixed CASE over the registry keys; no dynamic SQL.
create or replace function private.referral_requirement_check(p_key text, p_user uuid, p_params jsonb default null)
returns text language sql stable security definer set search_path = '' as $$
  select case p_key
    when 'phone_verified'             then private.referral_req_phone_verified(p_user, p_params)
    when 'email_verified'             then private.referral_req_email_verified(p_user, p_params)
    when 'onboarding_completed'       then private.referral_req_onboarding_completed(p_user, p_params)
    when 'meaningful_activity'        then private.referral_req_meaningful_activity(p_user, p_params)
    when 'business_profile_completed' then private.referral_req_business_profile_completed(p_user, p_params)
    when 'business_verified'          then private.referral_req_business_verified(p_user, p_params)
    when 'property_owner_verified'    then private.referral_req_property_owner_verified(p_user, p_params)
    when 'space_published'            then private.referral_req_space_published(p_user, p_params)
    else 'unknown_requirement:' || coalesce(p_key, 'null')
  end;
$$;

-- Whether a key's parameters are well formed. Fixed per key, like the checks.
create or replace function private.referral_requirement_params_ok(p_key text, p_params jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case
    when p_params is null or p_params = '{}'::jsonb then true
    when jsonb_typeof(p_params) <> 'object' then false
    when p_key = 'meaningful_activity' then
      not exists (select 1 from jsonb_object_keys(p_params) k where k not in ('action', 'min_minor'))
      and coalesce(p_params ->> 'action', 'settled_payment') = 'settled_payment'
      and (not (p_params ? 'min_minor')
           or (jsonb_typeof(p_params -> 'min_minor') = 'number' and (p_params ->> 'min_minor') ~ '^\d{1,15}$'))
    else false
  end;
$$;

insert into public.referral_requirements (key, check_function, description, takes_params) values
  ('phone_verified',             'private.referral_req_phone_verified',             'The referred person''s own phone, confirmed by one-time code.', false),
  ('email_verified',             'private.referral_req_email_verified',             'The referred person''s own email address, confirmed.', false),
  ('onboarding_completed',       'private.referral_req_onboarding_completed',       'Terms accepted and a first name set.', false),
  ('meaningful_activity',        'private.referral_req_meaningful_activity',        'A real action, chosen by parameter (today: a settled payment of their own).', true),
  ('business_profile_completed', 'private.referral_req_business_profile_completed', 'A business they own with name, phone, address and state, submitted.', false),
  ('business_verified',          'private.referral_req_business_verified',          'A business they own that passed verification by its own record.', false),
  ('property_owner_verified',    'private.referral_req_property_owner_verified',    'An owner listing of theirs whose ownership evidence was accepted.', false),
  ('space_published',            'private.referral_req_space_published',            'A listing of theirs published after passing review.', false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------- campaigns

create table if not exists public.referral_campaigns (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{2,40}$'),
  kind                text not null check (kind in ('consumer', 'business', 'supply')),
  title               text not null check (length(btrim(title)) between 3 and 80),
  reward_minor        bigint not null check (reward_minor > 0),
  -- The most one member may earn under this campaign in one budget period.
  member_cap_minor    bigint not null,
  -- The window may be tuned; that a window exists may not.
  review_window       interval not null check (review_window >= interval '1 hour' and review_window <= interval '90 days'),
  requirement_keys    text[] not null,
  requirement_params  jsonb not null default '{}'::jsonb check (jsonb_typeof(requirement_params) = 'object'),
  status              text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  starts_at           timestamptz not null,
  ends_at             timestamptz,
  reason              text not null check (length(btrim(reason)) >= 12),
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint referral_campaigns_cap_covers_reward check (member_cap_minor >= reward_minor),
  constraint referral_campaigns_dates check (ends_at is null or ends_at > starts_at),
  constraint referral_campaigns_has_keys check (cardinality(requirement_keys) between 1 and 16)
);
comment on table public.referral_campaigns is
  'D62: the organising dimension of the referral engine. Reward, per-member cap per budget period, review window and the ordered requirement keys live here. Money terms are written once; a change is a new campaign.';

-- One live campaign per kind, so attribution is never ambiguous.
create unique index if not exists referral_campaigns_one_active_per_kind
  on public.referral_campaigns (kind) where status = 'active';

alter table public.referral_campaigns enable row level security;
revoke all on public.referral_campaigns from public, anon, authenticated, service_role;
grant select on public.referral_campaigns to service_role;

create or replace function private.referral_campaign_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_param text; bad text;
begin
  if tg_op = 'DELETE' then
    raise exception 'A campaign is ended, never removed.' using errcode = 'RM420';
  end if;
  -- Every key must resolve against the registry, once each.
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
  -- One reward per verified identity is anchored on the confirmed phone.
  if not ('phone_verified' = any(new.requirement_keys)) then
    raise exception 'Every campaign requires phone_verified (one reward per verified phone).' using errcode = 'RM421';
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

create or replace trigger referral_campaigns_guard
  before insert or update or delete on public.referral_campaigns
  for each row execute function private.referral_campaign_guard();
create or replace trigger referral_campaigns_no_truncate
  before truncate on public.referral_campaigns
  for each statement execute function private.referral_refuse_rewrite();

-- PROPOSED campaigns from the architecture's section 3, seeded as DRAFT.
-- Draft never qualifies anyone. Reward figures are the founder's examples;
-- the per-member caps are section 3's arithmetic (1,500 a month at each
-- reward); the 7-day window is the earlier hold. ALL PROPOSED, NOT DECIDED.
insert into public.referral_campaigns
  (slug, kind, title, reward_minor, member_cap_minor, review_window, requirement_keys, requirement_params, status, starts_at, reason)
values
  ('consumer-proposed', 'consumer', 'Invite and Earn', 7600, 11400000, interval '7 days',
   array['phone_verified', 'email_verified', 'onboarding_completed', 'meaningful_activity'],
   '{"meaningful_activity": {"action": "settled_payment"}}'::jsonb, 'draft', '2026-10-06T00:00:00Z',
   'PROPOSED, NOT DECIDED (D62 campaign A): 76 naira, cap 114,000 naira a month, 7-day window. Founder to confirm before activating.'),
  ('business-proposed', 'business', 'Bring a business', 15000, 22500000, interval '7 days',
   array['phone_verified', 'business_profile_completed', 'business_verified'],
   '{}'::jsonb, 'draft', '2026-10-06T00:00:00Z',
   'PROPOSED, NOT DECIDED (D62 campaign B): 150 naira, cap 225,000 naira a month, 7-day window. Founder to confirm before activating.'),
  ('supply-proposed', 'supply', 'Bring a space', 30000, 45000000, interval '7 days',
   array['phone_verified', 'property_owner_verified', 'space_published'],
   '{}'::jsonb, 'draft', '2026-10-06T00:00:00Z',
   'PROPOSED, NOT DECIDED (D62 campaign C): 300 naira, cap 450,000 naira a month, 7-day window. Founder to confirm before activating.')
on conflict (slug) do nothing;

-- THE LAUNCH CAMPAIGN: b4's applied launch policy (D51) carried over exactly,
-- ACTIVE, so qualification keeps its terms: 70 naira, 1,500 a month
-- (105,000 naira), the 7-day hold as the review window, a confirmed phone
-- and a settled payment. Replaced by a new campaign when the founder sets one.
insert into public.referral_campaigns
  (slug, kind, title, reward_minor, member_cap_minor, review_window, requirement_keys, requirement_params, status, starts_at, reason)
values
  ('launch-d51', 'consumer', 'Invite and Earn', 7000, 10500000, interval '7 days',
   array['phone_verified', 'meaningful_activity'], '{"meaningful_activity": {"action": "settled_payment"}}'::jsonb,
   'active', '2026-10-06T00:00:00Z',
   'D51 launch policy as applied in b4_referral_rewards_engine (D63: qualification defaults to the launch policy until a campaign replaces it).')
on conflict (slug) do nothing;

-- --------------------------------------------------------- platform budget

create table if not exists public.referral_budget_periods (
  period_month     date primary key check (extract(day from period_month) = 1),
  cap_minor        bigint not null check (cap_minor >= 0),
  committed_minor  bigint not null default 0 check (committed_minor >= 0),
  reason           text not null check (length(btrim(reason)) >= 12),
  -- Set once, when committed first reaches 75 percent and the alert fires.
  alerted_at       timestamptz,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- The real ceiling: no reservation can carry the committed total past it.
  constraint referral_budget_within_cap check (committed_minor <= cap_minor)
);
comment on table public.referral_budget_periods is
  'D64: the platform referral cap per Lagos calendar month, in kobo (700,000 naira, decided). Checked and written by one conditional UPDATE per qualification; at 75 percent an alert fires; at 100 percent new qualification pauses. A month''s row is created from the latest cap on first use.';
alter table public.referral_budget_periods enable row level security;
revoke all on public.referral_budget_periods from public, anon, authenticated, service_role;
grant select on public.referral_budget_periods to service_role;

-- D64, DECIDED BY THE FOUNDER ON 6 OCTOBER 2026: 700,000 naira a month.
insert into public.referral_budget_periods (period_month, cap_minor, reason)
values ('2026-10-01', 70000000, 'D64: platform cap of 700,000 naira a month, decided by the founder on 6 October 2026.')
on conflict (period_month) do nothing;

create table if not exists public.referral_member_period_spend (
  campaign_id      uuid not null references public.referral_campaigns(id) on delete restrict,
  member_id        uuid not null,
  period_month     date not null check (extract(day from period_month) = 1),
  committed_minor  bigint not null check (committed_minor >= 0),
  updated_at       timestamptz not null default now(),
  primary key (campaign_id, member_id, period_month)
);
comment on table public.referral_member_period_spend is
  'D62: what one referrer has committed under one campaign in one budget period. Checked against the campaign''s member cap in the same statement that reserves it.';
alter table public.referral_member_period_spend enable row level security;
revoke all on public.referral_member_period_spend from public, anon, authenticated, service_role;
grant select on public.referral_member_period_spend to service_role;

-- RELEASES: a reward reversed or rejected before any money left gives its
-- budget back, once, as an append-only row. The committed totals then go down
-- by exactly that row's amount, and by nothing else.
create table if not exists public.referral_budget_releases (
  referral_id    uuid primary key,
  campaign_id    uuid not null references public.referral_campaigns(id) on delete restrict,
  member_id      uuid not null,
  period_month   date not null,
  amount_minor   bigint not null check (amount_minor > 0),
  reason         text not null check (length(btrim(reason)) > 0),
  created_at     timestamptz not null default now()
);
comment on table public.referral_budget_releases is
  'D62: budget handed back by a reward reversed or rejected before payment. One row per referral, append-only; the only thing that may lower a committed total.';
alter table public.referral_budget_releases enable row level security;
revoke all on public.referral_budget_releases from public, anon, authenticated, service_role;
grant select on public.referral_budget_releases to service_role;
create or replace trigger referral_budget_releases_append_only
  before update or delete on public.referral_budget_releases
  for each row execute function private.referral_refuse_rewrite();
create or replace trigger referral_budget_releases_no_truncate
  before truncate on public.referral_budget_releases
  for each statement execute function private.referral_refuse_rewrite();

-- Committed totals rise freely (by reservation) and fall only by the amount
-- of the release row private.referral_release_budget wrote for the referral
-- named in this transaction's vallo.referral_budget_release setting. A
-- period's month never changes, and the check constraints keep both >= 0.
create or replace function private.referral_committed_only_rises()
returns trigger language plpgsql set search_path = '' as $$
declare v_rel text := nullif(current_setting('vallo.referral_budget_release', true), '');
begin
  if tg_op = 'DELETE' then
    raise exception '% rows are a record of committed money; they are never removed.', tg_table_name using errcode = 'RM412';
  end if;
  if new.period_month <> old.period_month
     or (to_jsonb(old) ->> 'alerted_at' is not null
         and (to_jsonb(new) ->> 'alerted_at') is distinct from (to_jsonb(old) ->> 'alerted_at')) then
    raise exception 'A committed total keeps its month, and an alert once raised stays raised.' using errcode = 'RM412';
  end if;
  if new.committed_minor < old.committed_minor and (
       v_rel is null or v_rel !~ '^[0-9a-f-]{36}$'
       or not exists (select 1 from public.referral_budget_releases r
                       where r.referral_id = v_rel::uuid and r.period_month = new.period_month
                         and r.amount_minor = old.committed_minor - new.committed_minor
                         and r.created_at = now())) then
    raise exception 'A committed total only falls by a recorded budget release.' using errcode = 'RM412';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Give a qualified reward's budget back, once. Only before money can have
-- left: never for a reward withdrawal_requested, sent or paid.
create or replace function private.referral_release_budget(p_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.referrals; v_done uuid;
begin
  select * into r from public.referrals where id = p_id;
  if r.id is null or r.qualified_at is null or r.reward_minor is null
     or r.status in ('withdrawal_requested', 'sent', 'paid')
     or exists (select 1 from public.referral_events e where e.referral_id = r.id and e.to_status in ('sent', 'paid')) then
    return false;
  end if;
  insert into public.referral_budget_releases (referral_id, campaign_id, member_id, period_month, amount_minor, reason)
  values (r.id, r.campaign_id, r.referrer_id, r.period_month, r.reward_minor, coalesce(p_reason, 'reversed before payment'))
  on conflict (referral_id) do nothing
  returning referral_id into v_done;
  if v_done is null then return false; end if;
  perform set_config('vallo.referral_budget_release', r.id::text, true);
  update public.referral_member_period_spend set committed_minor = committed_minor - r.reward_minor
   where campaign_id = r.campaign_id and member_id = r.referrer_id and period_month = r.period_month
     and committed_minor >= r.reward_minor;
  update public.referral_budget_periods set committed_minor = committed_minor - r.reward_minor
   where period_month = r.period_month and committed_minor >= r.reward_minor;
  perform set_config('vallo.referral_budget_release', '', true);
  return true;
end $$;

create or replace trigger referral_budget_periods_guard
  before update or delete on public.referral_budget_periods
  for each row execute function private.referral_committed_only_rises();
create or replace trigger referral_budget_periods_no_truncate
  before truncate on public.referral_budget_periods
  for each statement execute function private.referral_refuse_rewrite();
create or replace trigger referral_member_period_spend_guard
  before update or delete on public.referral_member_period_spend
  for each row execute function private.referral_committed_only_rises();
create or replace trigger referral_member_period_spend_no_truncate
  before truncate on public.referral_member_period_spend
  for each statement execute function private.referral_refuse_rewrite();

-- The month's budget row, created on first use from the latest cap set
-- (D64: one number, carried month to month until the founder changes it).
-- Null when no cap was ever set: then nothing qualifies and nothing pays.
create or replace function private.referral_budget_period_ensure(p_month date)
returns date language plpgsql security definer set search_path = '' as $$
begin
  insert into public.referral_budget_periods (period_month, cap_minor, reason)
  select p_month, b.cap_minor, 'carried from ' || to_char(b.period_month, 'YYYY-MM') || ' (D64 monthly cap)'
    from public.referral_budget_periods b
   where b.period_month < p_month
   order by b.period_month desc limit 1
  on conflict (period_month) do nothing;
  return (select period_month from public.referral_budget_periods where period_month = p_month);
end $$;

-- RESERVE: member cap, then the platform cap, each ONE conditional statement
-- whose row lock serialises racers (the loser re-reads the committed total
-- after the winner commits and its WHERE no longer holds). Both or neither.
-- Past the platform cap the answer is 'budget_paused': the referral waits,
-- attributed, for the cap to rise or the month to turn; it is never refused.
-- Crossing 75 percent raises one high risk_alert for the month.
-- Null on success, else the reason.
create or replace function private.referral_reserve(
  p_campaign uuid, p_member uuid, p_month date, p_amount bigint, p_member_cap bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare v_ok int; v_committed bigint; v_cap bigint; v_alert date;
begin
  if p_amount is null or p_amount <= 0 or p_amount > p_member_cap then
    return 'member_cap_reached';
  end if;
  if private.referral_budget_period_ensure(p_month) is null then
    return 'budget_paused';
  end if;
  begin
    insert into public.referral_member_period_spend as s (campaign_id, member_id, period_month, committed_minor)
    values (p_campaign, p_member, p_month, p_amount)
    on conflict (campaign_id, member_id, period_month) do update
      set committed_minor = s.committed_minor + excluded.committed_minor
      where s.committed_minor + excluded.committed_minor <= p_member_cap
    returning 1 into v_ok;
    if v_ok is null then
      raise exception 'member cap' using errcode = 'RM410';
    end if;
    update public.referral_budget_periods
       set committed_minor = committed_minor + p_amount
     where period_month = p_month and committed_minor + p_amount <= cap_minor
    returning committed_minor, cap_minor into v_committed, v_cap;
    if v_committed is null then
      raise exception 'platform cap' using errcode = 'RM411';
    end if;
  exception
    when sqlstate 'RM410' then return 'member_cap_reached';
    when sqlstate 'RM411' then return 'budget_paused';
  end;
  if v_committed * 4 >= v_cap * 3 then
    update public.referral_budget_periods set alerted_at = now()
     where period_month = p_month and alerted_at is null
    returning period_month into v_alert;
    if v_alert is not null then
      insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
      values ('high', 'Referral budget at 75 percent',
              format('Referral rewards committed for %s are %s of %s kobo. At 100 percent new qualification pauses; raise the cap or wind the campaign down.',
                     to_char(p_month, 'YYYY-MM'), v_committed, v_cap),
              'referral_budget_period', p_month::text);
    end if;
  end if;
  return null;
end $$;

-- What members are told: open, or paused (and why, in a word). Paused when no
-- campaign is running, no cap is set, or the cap cannot fit one more of the
-- smallest live reward. Never names amounts or other members.
create or replace function public.referral_programme_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  with m as (select private.lagos_month(now()) as month),
       live as (select min(reward_minor) as smallest from public.referral_campaigns
                 where status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now())),
       b as (select coalesce(p.cap_minor, (select x.cap_minor from public.referral_budget_periods x
                                           order by x.period_month desc limit 1)) as cap,
                    coalesce(p.committed_minor, 0) as committed
               from (select 1) one left join public.referral_budget_periods p on p.period_month = (select month from m))
  select case
    when (select smallest from live) is null then jsonb_build_object('status', 'paused', 'reason', 'no_campaign')
    when (select cap from b) is null then jsonb_build_object('status', 'paused', 'reason', 'no_budget')
    when (select committed from b) + (select smallest from live) > (select cap from b)
      then jsonb_build_object('status', 'paused', 'reason', 'budget_reached')
    else jsonb_build_object('status', 'open') end;
$$;

-- ------------------------------------------------------------------ policy

-- Platform settings that are not a campaign's stay on b4's dated policy
-- rows; this adds the cluster threshold. Rows are still never rewritten.
alter table public.referral_policy
  add column if not exists cluster_flag_score int not null default 50
  check (cluster_flag_score between 1 and 1000);

create or replace function private.referral_policy_now()
returns public.referral_policy language sql stable set search_path = '' as $$
  select p.* from public.referral_policy p
   where p.effective_from <= now() and (p.effective_to is null or p.effective_to > now())
   order by p.effective_from desc
   limit 1;
$$;

-- --------------------------------------------------------------- referrals

alter table public.referrals
  add column if not exists campaign_id     uuid references public.referral_campaigns(id) on delete restrict,
  add column if not exists blocked_on      text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists period_month    date,
  add column if not exists review_until    timestamptz;
alter table public.referrals alter column status set default 'attributed';
comment on table public.referrals is
  'One row per referred member, attributed server-side to a campaign. Lifecycle attributed > qualified > pending (review window) > available > withdrawal_requested > sent > paid, with under_review > approved|rejected and reversed. Rewards Balance (D51, D62).';

-- Carry b4's rows across, with the status guard stood down for this one
-- statement block only (owner DDL; it is re-enabled immediately).
alter table public.referrals disable trigger referrals_guard;
alter table public.referrals drop constraint if exists referrals_status_check;
update public.referrals r
   set status = case
         when r.status = 'pending' then 'attributed'
         when r.status = 'processing' then
           case when exists (select 1 from public.rewards_payouts p where p.id = r.payout_id and p.transfer_initiated_at is not null)
                then 'sent' else 'withdrawal_requested' end
         else r.status end,
       campaign_id  = coalesce(r.campaign_id, (select c.id from public.referral_campaigns c where c.slug = 'launch-d51')),
       period_month = coalesce(r.period_month, r.month),
       review_until = coalesce(r.review_until,
                        case when r.qualified_at is not null
                             then coalesce(r.approved_at, r.qualified_at) + interval '7 days' end)
 where r.status in ('pending', 'processing') or r.campaign_id is null
    or (r.qualified_at is not null and (r.period_month is null or r.review_until is null));
alter table public.referrals enable trigger referrals_guard;

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_status_lifecycle') then
    alter table public.referrals add constraint referrals_status_lifecycle check (status in
      ('attributed','qualified','pending','under_review','approved','rejected',
       'available','withdrawal_requested','sent','paid','reversed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'referrals_qualified_has_terms') then
    alter table public.referrals add constraint referrals_qualified_has_terms check (
      qualified_at is null
      or (reward_minor is not null and campaign_id is not null and period_month is not null and review_until is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'referrals_live_was_qualified') then
    alter table public.referrals add constraint referrals_live_was_qualified check (
      status in ('attributed', 'reversed') or qualified_at is not null);
  end if;
end $c$;

create index if not exists referrals_referrer_period on public.referrals (referrer_id, period_month);
create index if not exists referrals_status on public.referrals (status);
create index if not exists referrals_due on public.referrals (review_until) where status in ('pending', 'approved');
create index if not exists referrals_attributed on public.referrals (last_checked_at nulls first) where status = 'attributed';
create index if not exists referrals_payout on public.referrals (payout_id) where payout_id is not null;
create index if not exists referrals_campaign on public.referrals (campaign_id);
-- ONE REWARD PER VERIFIED IDENTITY: a confirmed phone earns its referrer once.
create unique index if not exists referrals_one_per_phone
  on public.referrals (referred_phone_key)
  where referred_phone_key is not null and status <> 'reversed';

create or replace trigger referrals_no_truncate
  before truncate on public.referrals
  for each statement execute function private.referral_refuse_rewrite();

-- The transitions a referral may make. Anything else is refused.
create or replace function private.referral_transition_ok(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select p_from = p_to or (p_from, p_to) in (
    ('attributed','qualified'), ('attributed','reversed'),
    ('qualified','pending'), ('qualified','under_review'), ('qualified','reversed'),
    ('pending','available'), ('pending','under_review'), ('pending','reversed'),
    ('under_review','approved'), ('under_review','rejected'), ('under_review','reversed'),
    ('approved','available'), ('approved','under_review'), ('approved','reversed'),
    ('rejected','reversed'),
    ('available','withdrawal_requested'), ('available','under_review'), ('available','reversed'),
    ('withdrawal_requested','sent'), ('withdrawal_requested','available'), ('withdrawal_requested','reversed'),
    ('sent','paid'), ('sent','available'), ('sent','reversed'),
    ('paid','reversed')
  );
$$;

create or replace function private.referrals_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A referral is a money record; it is reversed, never removed.' using errcode = 'RM403';
  end if;
  if not private.referral_transition_ok(old.status, new.status) then
    raise exception 'A referral cannot move from % to %.', old.status, new.status using errcode = 'RM403';
  end if;
  if new.referrer_id <> old.referrer_id or new.referred_id <> old.referred_id or new.code <> old.code then
    raise exception 'A referral''s attribution is written once.' using errcode = 'RM403';
  end if;
  -- FROZEN AT QUALIFICATION: the amount, campaign, period and window.
  if old.qualified_at is not null and (
       new.reward_minor is distinct from old.reward_minor
       or new.campaign_id is distinct from old.campaign_id
       or new.period_month is distinct from old.period_month
       or new.review_until is distinct from old.review_until
       or new.qualified_at is distinct from old.qualified_at) then
    raise exception 'A referral''s reward is frozen when it qualifies.' using errcode = 'RM403';
  end if;
  -- THE REVIEW WINDOW IS NOT OPTIONAL: nothing is available before it ends.
  if new.status = 'available' and old.status <> 'available'
     and (new.review_until is null or new.review_until > now()) then
    raise exception 'A reward cannot be available before its review window ends (%).', new.review_until using errcode = 'RM405';
  end if;
  -- PAID ONLY ON WEBHOOK: the payout must already be paid, which itself needs
  -- a recorded webhook (see rewards_payouts_guard).
  if new.status = 'paid' and old.status <> 'paid' and not exists (
       select 1 from public.rewards_payouts p where p.id = new.payout_id and p.status = 'paid') then
    raise exception 'A referral is paid only when its payout is confirmed by webhook.' using errcode = 'RM406';
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace trigger referrals_guard
  before update or delete on public.referrals
  for each row execute function private.referrals_guard();

-- ------------------------------------------------- payouts and the ledger

-- Payouts gain `sent`: the transfer was initiated; paid only on webhook.
alter table public.rewards_payouts drop constraint if exists rewards_payouts_status_check;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'rewards_payouts_status_lifecycle') then
    alter table public.rewards_payouts add constraint rewards_payouts_status_lifecycle
      check (status in ('under_review','processing','sent','unknown','paid','failed'));
  end if;
end $c$;
create index if not exists rewards_payouts_inflight on public.rewards_payouts (status)
  where status in ('under_review','processing','sent','unknown');
-- b4 payouts already initiated become sent.
alter table public.rewards_payouts disable trigger rewards_payouts_guard;
update public.rewards_payouts set status = 'sent' where status = 'processing' and transfer_initiated_at is not null;
alter table public.rewards_payouts enable trigger rewards_payouts_guard;

-- What the provider told us about a transfer, by webhook. Append-only. The
-- idempotency key is the reference, the event and the amount, so the same
-- webhook twice is one row and one effect, and a mismatched delivery recorded
-- as an incident never swallows the correct one.
create table if not exists public.rewards_transfer_events (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null,
  event           text not null check (event in ('transfer.success', 'transfer.failed', 'transfer.reversed')),
  amount_minor    bigint,
  transfer_code   text,
  -- applied_paid / applied_failed changed the payout; the others are incidents
  -- for a person (never retried silently).
  outcome         text not null check (outcome in
                    ('applied_paid', 'applied_failed', 'amount_mismatch', 'unknown_reference', 'conflict', 'no_change')),
  idempotency_key text not null unique,
  payload         jsonb not null default '{}'::jsonb,
  received_at     timestamptz not null default now()
);
create index if not exists rewards_transfer_events_reference on public.rewards_transfer_events (reference, received_at);
alter table public.rewards_transfer_events enable row level security;
revoke all on public.rewards_transfer_events from public, anon, authenticated, service_role;
grant select on public.rewards_transfer_events to service_role;
create or replace trigger rewards_transfer_events_append_only
  before update or delete on public.rewards_transfer_events
  for each row execute function private.referral_refuse_rewrite();
create or replace trigger rewards_transfer_events_no_truncate
  before truncate on public.rewards_transfer_events
  for each statement execute function private.referral_refuse_rewrite();

create or replace function private.rewards_payouts_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A payout is a record of money; it is never removed.' using errcode = 'RM404';
  end if;
  if new.member_id <> old.member_id or new.amount_minor <> old.amount_minor or new.reference <> old.reference then
    raise exception 'A payout''s member, amount and reference are written once.' using errcode = 'RM404';
  end if;
  if new.status <> old.status and (old.status, new.status) not in (
       ('under_review','processing'), ('under_review','failed'),
       ('processing','sent'), ('processing','unknown'), ('processing','failed'), ('processing','paid'),
       ('sent','unknown'), ('sent','paid'), ('sent','failed'),
       ('unknown','sent'), ('unknown','paid'), ('unknown','failed')) then
    raise exception 'A % payout cannot become %.', old.status, new.status using errcode = 'RM404';
  end if;
  if new.status = 'sent' and new.transfer_initiated_at is null then
    raise exception 'A payout is sent only once its transfer was initiated.' using errcode = 'RM404';
  end if;
  -- PAID ONLY ON WEBHOOK CONFIRMATION, never on the transfer API's answer.
  if new.status = 'paid' and old.status <> 'paid' and not exists (
       select 1 from public.rewards_transfer_events e
        where e.reference = new.reference and e.event = 'transfer.success'
          and e.outcome = 'applied_paid' and e.amount_minor = new.amount_minor) then
    raise exception 'A payout is paid only on a recorded webhook for its reference.' using errcode = 'RM406';
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
         available_at  = case when p_to = 'available' then now() else available_at end,
         review_reason = case when p_to = 'under_review' then p_reason else review_reason end
   where id = p_id;
  perform private.referral_log(p_id, v_from, p_to, p_reason, p_actor, p_detail);
end $$;

-- The campaign a new referral belongs to: the one named at sign-up if it is
-- active, else the active consumer campaign. Null when none is running; the
-- referral is still attributed and picks one up at qualification.
create or replace function private.referral_campaign_for(p_slug text)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.referral_campaigns c
   where c.status = 'active' and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now())
     and (c.slug = p_slug or c.kind = 'consumer')
   order by (c.slug = coalesce(p_slug, '')) desc, c.starts_at desc
   limit 1;
$$;

-- Who referred this member, from what sign-up recorded server-side.
create or replace function private.referral_attribute(p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_code text; v_slug text; v_referrer uuid; v_id uuid;
begin
  select id into v_id from public.referrals where referred_id = p_user;
  if v_id is not null then return v_id; end if;
  select upper(btrim(u.raw_user_meta_data ->> 'referral_code')),
         nullif(lower(btrim(u.raw_user_meta_data ->> 'referral_campaign')), '')
    into v_code, v_slug from auth.users u where u.id = p_user;
  if v_code is null or v_code = '' then return null; end if;
  select r.user_id into v_referrer from public.referral_codes r where r.code = v_code;
  if v_referrer is null or v_referrer = p_user then return null; end if;
  insert into public.referrals (referrer_id, referred_id, code, campaign_id)
  values (v_referrer, p_user, v_code, private.referral_campaign_for(v_slug))
  on conflict (referred_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.referrals where referred_id = p_user;
  else
    perform private.referral_log(v_id, null, 'attributed', 'attributed from the sign-up referral code', null);
  end if;
  return v_id;
end $$;

-- ------------------------------------------------------------------- risk

-- One referral's score, its reasons, and whether any NON-NETWORK signal is
-- present. Weights are engineering, not campaign configuration. The network
-- edge is weak and capped: alone it can never route anything to review.
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
  -- STRONG: the same device as the referrer, or across this referrer's referred.
  if exists (select 1 from public.known_devices a join public.known_devices b on b.fingerprint = a.fingerprint
              where a.user_id = r.referrer_id and b.user_id = r.referred_id) then
    score := score + 40; non_network := true; reasons := reasons || '"shared_device_with_referrer"'::jsonb;
  end if;
  select count(distinct o.referred_id) into n
    from public.referrals o
    join public.known_devices a on a.user_id = o.referred_id
    join public.known_devices b on b.fingerprint = a.fingerprint and b.user_id = r.referred_id
   where o.referrer_id = r.referrer_id and o.referred_id <> r.referred_id;
  if n > 0 then score := score + 30; non_network := true; reasons := reasons || '"device_shared_across_referred"'::jsonb; end if;
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
  if n >= 2 then score := score + 40 * (n - 1); non_network := true; reasons := reasons || '"shared_device"'::jsonb; end if;
  if exists (select 1 from public.referrals x where x.referrer_id = any(members) and x.referred_id = p_referrer) then
    score := score + 40; non_network := true; reasons := reasons || '"circular_referral"'::jsonb;
  end if;
  select count(distinct a.user_id) into n from auth.sessions a join auth.sessions b
      on b.ip = a.ip and b.user_id <> a.user_id
   where a.ip is not null and a.user_id = any(members) and b.user_id = any(members);
  if n >= 2 then score := score + least(10, 2 * n); reasons := reasons || '"shared_network"'::jsonb; end if;
  return jsonb_build_object('score', score, 'reasons', reasons, 'non_network', non_network);
end $$;

-- ----------------------------------------------------------- qualification

-- The settled payment that satisfied meaningful_activity, for reversal.
create or replace function private.referral_qualifying_tx(p_user uuid)
returns table (tx_id uuid, booking_id uuid) language sql stable security definer set search_path = '' as $$
  select t.id, t.booking_id from public.transactions t left join public.bookings b on b.id = t.booking_id
   where t.status = 'SUCCESSFUL' and t.amount_minor > 0 and coalesce(t.share_payer_id, b.guest_id) = p_user
   order by t.updated_at, t.created_at limit 1;
$$;

-- Qualify when EVERY key of the campaign passes, in order. Callable any
-- number of times. NEVER WAITS LONG: a referral row someone else holds, or a
-- budget row past the lock timeout, leaves it attributed for the sweep.
create or replace function private.referral_try_qualify(p_user uuid)
returns text language plpgsql security definer set search_path = '' set lock_timeout = '500ms' as $$
declare
  v_id uuid; r public.referrals; c public.referral_campaigns; pol public.referral_policy;
  k text; v_fail text; v_phone text; v_key text; v_tx uuid; v_booking uuid;
  v_month date := private.lagos_month(now());
  risk jsonb; v_to text; v_reason text;
begin
  v_id := private.referral_attribute(p_user);
  if v_id is null then return 'not_referred'; end if;
  select * into r from public.referrals where id = v_id for update skip locked;
  if r.id is null then return 'pending_lock'; end if;
  if r.status <> 'attributed' then return r.status; end if;

  -- The campaign actually used: the referral's own if it is still live, else
  -- the live campaign of the same kind (an ended campaign never strands a
  -- referral), else the live consumer campaign. Recorded on the row; the
  -- reward is frozen from it below.
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

  -- One reward per verified identity FAILS CLOSED: no vault secret, no key,
  -- nothing qualifies until it is back.
  select phone into v_phone from public.confirmed_phones where user_id = p_user;
  v_key := private.identity_key('phone', v_phone);
  if v_key is null then
    update public.referrals set blocked_on = 'identity_key_unavailable', last_checked_at = now() where id = r.id;
    return 'identity_key_unavailable';
  end if;
  pol := private.referral_policy_now();
  if pol.id is null then return 'no_policy'; end if;
  if exists (select 1 from public.referrals o
              where o.referred_phone_key = v_key and o.status <> 'reversed' and o.id <> r.id) then
    perform private.referral_move(r.id, 'reversed', 'this phone already earned a referral reward', null,
                                  jsonb_build_object('rule', 'one_per_identity'));
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

  select q.tx_id, q.booking_id into v_tx, v_booking from private.referral_qualifying_tx(p_user) q;
  -- THE AMOUNT IS FROZEN HERE, from the campaign, and never changes after.
  update public.referrals
     set status = 'qualified', qualified_at = now(), reward_minor = c.reward_minor, period_month = v_month,
         review_until = now() + c.review_window, referred_phone_key = v_key,
         qualifying_tx_id = v_tx, qualifying_booking_id = v_booking, blocked_on = null, last_checked_at = now(),
         risk_score = (risk ->> 'score')::int, risk_reasons = risk -> 'reasons'
   where id = r.id;
  perform private.referral_log(r.id, 'attributed', 'qualified', 'every requirement of the campaign passed', null,
                               jsonb_build_object('campaign', c.slug, 'reward_minor', c.reward_minor,
                                                  'requirements', to_jsonb(c.requirement_keys), 'transaction_id', v_tx));

  -- Review only on a score at the threshold that includes a non-network edge.
  if (risk ->> 'score')::int >= pol.review_risk_score and (risk ->> 'non_network')::boolean then
    v_to := 'under_review'; v_reason := 'risk score at or above the review threshold';
  else
    v_to := 'pending'; v_reason := 'qualified; waiting out the campaign review window';
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

-- The retry for anything a trigger skipped, and the only path for
-- requirements no trigger watches. Oldest-checked first, so members who fail
-- a requirement for weeks never starve the rest. Service role; cron wires it.
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
    -- phone_verified is required by every campaign, so nobody without one can qualify.
    where exists (select 1 from public.confirmed_phones c where c.user_id = u.id)
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

-- ---------------------------------------------------------------- reversal

-- Reverse a referral and, if its reward ever entered the balance (an `earn:`
-- entry exists, whatever the status says now), write the negative entry. A
-- reward under review is rejected on the way, so the history reads
-- under_review > rejected > reversed. Reason and actor are always recorded.
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
  -- Before payment, the budget comes back in the same transaction.
  perform private.referral_release_budget(r.id, p_reason);
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

create or replace function public.referral_reverse_for_chargeback(p_tx uuid, p_reason text)
returns int language sql security definer set search_path = '' as $$
  select private.referral_reverse_for_transaction(p_tx, p_reason, null) $$;

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
    perform private.referral_reverse_for_transaction(new.id, 'the qualifying payment was refunded');
  end if;
  return new;
exception when others then
  raise warning 'referral step skipped: %', sqlerrm;
  return new;
end $$;

create or replace trigger transactions_referral
  after insert or update of status on public.transactions
  for each row execute function private.referral_after_transaction();

-- Only a FULL refund of the qualifying booking reverses.
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

-- ------------------------------------------ review window, then balance

-- Pending and approved rewards whose window has passed become available,
-- and only then does the reward enter the ledger.
create or replace function public.referral_release_due()
returns int language plpgsql security definer set search_path = '' as $$
declare r public.referrals; n int := 0;
begin
  for r in select * from public.referrals
            where status in ('pending', 'approved') and review_until <= now()
            for update skip locked loop
    insert into public.rewards_ledger (member_id, kind, amount_minor, referral_id, reason, idempotency_key)
    values (r.referrer_id, 'reward_earned', r.reward_minor, r.id, 'referral reward after the review window', 'earn:' || r.id)
    on conflict (idempotency_key) do nothing;
    perform private.referral_move(r.id, 'available', 'review window passed', null);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Flag clusters: move a cluster's live rewards to under_review when its
-- weighted score crosses the threshold with a non-network edge. Returns the
-- number of referrals moved. Reversible: staff approve or reject each.
create or replace function public.referral_flag_clusters(p_limit int default 500)
returns int language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare pol public.referral_policy := private.referral_policy_now(); v_ref uuid; s jsonb; v_id uuid; n int := 0;
begin
  for v_ref in select distinct referrer_id from public.referrals
                where status in ('qualified','pending','approved','available')
                limit greatest(1, least(coalesce(p_limit, 500), 5000)) loop
    s := private.referral_cluster_score(v_ref);
    if (s ->> 'non_network')::boolean and (s ->> 'score')::int >= coalesce(pol.cluster_flag_score, 50) then
      for v_id in select id from public.referrals
                   where referrer_id = v_ref and status in ('qualified','pending','approved','available') loop
        perform private.referral_move(v_id, 'under_review', 'cluster flagged for review', null, s);
        n := n + 1;
      end loop;
    end if;
  end loop;
  return n;
end $$;

-- -------------------------------------------------------------- member read

-- The member's figures. under_review is shown as pending: a held amount with
-- an honest line, never an accusation. "sent" until the webhook, then "paid".
create or replace function public.my_rewards_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
       pol as (select * from private.referral_policy_now()),
       camp as (select * from public.referral_campaigns
                 where status = 'active' and kind = 'consumer' and starts_at <= now()
                   and (ends_at is null or ends_at > now()) limit 1)
  select case when (select id from me) is null then null else jsonb_build_object(
    'balance_minor',        (select coalesce(sum(amount_minor), 0) from public.rewards_ledger where member_id = (select id from me)),
    'available_minor',      (select coalesce(sum(reward_minor), 0) from public.referrals where referrer_id = (select id from me) and status = 'available'),
    'pending_minor',        (select coalesce(sum(reward_minor), 0) from public.referrals where referrer_id = (select id from me)
                               and status in ('qualified','pending','approved','under_review')),
    'next_available_at',    (select min(review_until) from public.referrals where referrer_id = (select id from me)
                               and status in ('pending','approved') and review_until > now()),
    'sent_minor',           (select coalesce(sum(amount_minor), 0) from public.rewards_payouts where member_id = (select id from me)
                               and status in ('under_review','processing','sent','unknown')),
    'paid_minor',           (select coalesce(sum(amount_minor), 0) from public.rewards_payouts where member_id = (select id from me) and status = 'paid'),
    'qualified_count',      (select count(*) from public.referrals where referrer_id = (select id from me)
                               and status not in ('attributed','rejected','reversed')),
    'invited_count',        (select count(*) from public.referrals where referrer_id = (select id from me) and status = 'attributed'),
    'campaign',             (select jsonb_build_object('slug', slug, 'reward_minor', reward_minor,
                               'member_cap_minor', member_cap_minor, 'requirement_keys', to_jsonb(requirement_keys),
                               'review_window_hours', (extract(epoch from review_window) / 3600)::int) from camp),
    'programme',            public.referral_programme_status(),
    'withdrawal_min_minor', (select withdrawal_min_minor from pol),
    'payouts_enabled',      coalesce((select payouts_enabled from pol), false)
  ) end;
$$;

-- A member's referrals in member words, never naming who was referred beyond
-- a first name, and never saying "under review".
create or replace function public.my_referrals(p_limit int default 50)
returns table (id uuid, status text, first_name text, reward_minor bigint, attributed_at timestamptz, qualified_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id,
         case when r.status = 'attributed' then 'invited'
              when r.status in ('qualified','pending','approved','under_review') then 'pending'
              when r.status = 'available' then 'available'
              when r.status in ('withdrawal_requested','sent') then 'sent'
              when r.status = 'paid' then 'paid'
              else 'not_rewarded' end,
         nullif(split_part(btrim(coalesce(p.first_name, p.display_name, '')), ' ', 1), ''),
         r.reward_minor, r.attributed_at, r.qualified_at
    from public.referrals r left join public.profiles p on p.id = r.referred_id
   where r.referrer_id = (select auth.uid())
   order by r.attributed_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- ------------------------------------------------------------------ payouts

-- Open a payout of everything available (WITHDRAWAL REQUEST and ELIGIBILITY
-- CHECK). Service role only. OFF unless the policy row in force says so.
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
  -- D63/D64: no payout path runs until the platform cap exists for the month.
  if private.referral_budget_period_ensure(private.lagos_month(now())) is null then
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
  if exists (select 1 from public.rewards_payouts where member_id = p_member and status in ('under_review','processing','sent','unknown')) then
    return jsonb_build_object('status', 'already_open');
  end if;
  perform public.referral_release_due();

  select coalesce(sum(amount_minor), 0) into v_balance from public.rewards_ledger where member_id = p_member;
  -- WHOLE REFERRALS ONLY, oldest first, as many as the ledger balance covers.
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
    v_score := v_score + 60; v_reasons := v_reasons || '"shared_payout_destination"'::jsonb;
  end if;
  if v_key is not null and exists (select 1 from private.identity_denylist where key_kind = 'payout' and key_hmac = v_key) then
    v_score := v_score + 100; v_reasons := v_reasons || '"payout_account_denylisted"'::jsonb;
  end if;
  if v_key is null then
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
  update public.referrals set status = 'withdrawal_requested', payout_id = v_id where id = any(v_ids);
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, 'available', 'withdrawal_requested', 'included in a payout', jsonb_build_object('payout_id', v_id)
    from public.referrals where payout_id = v_id;

  return jsonb_build_object('status', v_status, 'payout_id', v_id, 'reference', v_ref, 'amount_minor', v_amount);
end $$;

-- A payout that did not happen: money back in the balance once, its
-- referrals back to available.
create or replace function private.rewards_payout_fail(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts;
begin
  select * into p from public.rewards_payouts where id = p_id for update;
  if p.id is null or p.status in ('paid', 'failed') then return; end if;
  update public.rewards_payouts set status = 'failed', failure_reason = coalesce(p_reason, 'the transfer failed'), settled_at = now()
   where id = p.id;
  insert into public.rewards_ledger (member_id, kind, amount_minor, payout_id, reason, idempotency_key)
  values (p.member_id, 'payout_release', p.amount_minor, p.id, coalesce(p_reason, 'the transfer failed'), 'release:' || p.id)
  on conflict (idempotency_key) do nothing;
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, status, 'available', 'the payout did not complete; back in the Rewards Balance', jsonb_build_object('payout_id', p.id)
    from public.referrals where payout_id = p.id and status in ('withdrawal_requested', 'sent');
  update public.referrals set status = 'available', payout_id = null
   where payout_id = p.id and status in ('withdrawal_requested', 'sent');
end $$;

-- A high risk_alert for a person: the admin console's alert queue.
create or replace function private.rewards_incident_alert(p_reference text, p_detail text)
returns void language sql security definer set search_path = '' as $$
  insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
  values ('high', 'Rewards payout needs a person', p_detail, 'rewards_payout', p_reference);
$$;

-- Record what the transfer API or a verify call said. NEVER PAYS AND NEVER
-- RELEASES: only the signed webhook or a staff decision may end a payout.
--   'processing'     after a send: records the provider handles (and turns
--                    unknown back into sent);
--   'unknown'        a timeout: nothing moves;
--   'verify_failed'  verify answered failed or reversed: records the
--                    provider status and raises a high risk_alert for staff.
--                    Releasing here could pay twice if transfer.success
--                    arrives later.
-- 'paid' and 'failed' are answered without changing anything.
create or replace function public.rewards_payout_settle(
  p_reference text, p_outcome text, p_provider_status text default null,
  p_transfer_code text default null, p_recipient_code text default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts;
begin
  if p_outcome not in ('paid','failed','unknown','processing','verify_failed') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into p from public.rewards_payouts where reference = p_reference for update;
  if p.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if p.status in ('paid','failed') then
    return jsonb_build_object('status', p.status, 'changed', false,
                              'conflict', case when p.status <> p_outcome then p_outcome end);
  end if;
  update public.rewards_payouts
     set provider_status = coalesce(p_provider_status, provider_status),
         transfer_code = coalesce(p_transfer_code, transfer_code),
         recipient_code = coalesce(p_recipient_code, recipient_code)
   where id = p.id;
  if p_outcome = 'paid' then
    return jsonb_build_object('status', p.status, 'changed', false, 'awaiting_webhook', true);
  elsif p_outcome = 'failed' then
    return jsonb_build_object('status', p.status, 'changed', false, 'awaiting_webhook', true);
  elsif p_outcome = 'verify_failed' then
    perform private.rewards_incident_alert(p.reference,
      format('Paystack verify reports %s for rewards payout %s (%s kobo) with no failure webhook. Nothing was released; staff decide in the Paystack dashboard.',
             coalesce(p_provider_status, 'failed'), p.reference, p.amount_minor));
    return jsonb_build_object('status', p.status, 'changed', false, 'needs_staff', true);
  elsif p_outcome = 'unknown' and p.status in ('processing', 'sent') and p.transfer_initiated_at is not null then
    update public.rewards_payouts set status = 'unknown' where id = p.id;
    return jsonb_build_object('status', 'unknown', 'changed', true);
  elsif p_outcome = 'processing' and p.status = 'unknown' then
    update public.rewards_payouts set status = 'sent' where id = p.id;
    return jsonb_build_object('status', 'sent', 'changed', true);
  end if;
  return jsonb_build_object('status', p.status, 'changed', false);
end $$;

-- THE WEBHOOK. The only path to PAID. Idempotent on (reference, event, amount): the
-- same webhook twice is one row and one effect. A mismatched amount, an
-- unknown reference or a contradiction is recorded as an incident and never
-- applied. On success, the marketing float book records the outflow.
create or replace function public.rewards_payout_webhook(
  p_reference text, p_event text, p_amount_minor bigint, p_transfer_code text default null,
  p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts; v_outcome text; v_key text; v_row uuid;
begin
  if p_event not in ('transfer.success', 'transfer.failed', 'transfer.reversed') or coalesce(btrim(p_reference), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;
  v_key := p_reference || ':' || p_event || ':' || coalesce(p_amount_minor::text, '-');
  select * into p from public.rewards_payouts where reference = p_reference for update;
  if exists (select 1 from public.rewards_transfer_events where idempotency_key = v_key) then
    return jsonb_build_object('status', coalesce(p.status, 'not_found'), 'duplicate', true);
  end if;

  v_outcome := case
    when p.id is null then 'unknown_reference'
    when p_amount_minor is distinct from p.amount_minor then 'amount_mismatch'
    when p_event = 'transfer.success' and p.status in ('processing', 'sent', 'unknown') then 'applied_paid'
    when p_event = 'transfer.success' and p.status = 'paid' then 'no_change'
    when p_event <> 'transfer.success' and p.status in ('processing', 'sent', 'unknown') then 'applied_failed'
    when p_event <> 'transfer.success' and p.status = 'failed' then 'no_change'
    else 'conflict' end;

  insert into public.rewards_transfer_events (reference, event, amount_minor, transfer_code, outcome, idempotency_key, payload)
  values (p_reference, p_event, p_amount_minor, p_transfer_code, v_outcome, v_key, coalesce(p_payload, '{}'::jsonb))
  on conflict (idempotency_key) do nothing
  returning id into v_row;
  if v_row is null then
    return jsonb_build_object('status', coalesce(p.status, 'not_found'), 'duplicate', true);
  end if;

  if v_outcome = 'applied_paid' then
    update public.rewards_payouts
       set status = 'paid', settled_at = now(), provider_status = 'success',
           transfer_code = coalesce(p_transfer_code, transfer_code)
     where id = p.id;
    insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
    select id, status, 'paid', 'the provider confirmed the transfer by webhook', jsonb_build_object('payout_id', p.id)
      from public.referrals where payout_id = p.id and status in ('withdrawal_requested', 'sent');
    update public.referrals set status = 'paid' where payout_id = p.id and status = 'sent';
    -- A referral still at withdrawal_requested passes through sent first.
    update public.referrals set status = 'sent' where payout_id = p.id and status = 'withdrawal_requested';
    update public.referrals set status = 'paid' where payout_id = p.id and status = 'sent';
    perform private.ledger_append('marketing_float', 'rewards-paid:' || p.reference, 'TRANSFER_COMPLETED', 'out',
                                  p.amount_minor, 'NGN', 'paystack', p.reference, null, null, 'confirmed',
                                  jsonb_build_object('rewards_payout_id', p.id, 'member_id', p.member_id));
  elsif v_outcome = 'applied_failed' then
    perform private.rewards_payout_fail(p.id, 'provider webhook ' || p_event);
  elsif v_outcome in ('conflict', 'amount_mismatch', 'unknown_reference') then
    perform private.rewards_incident_alert(p_reference,
      format('Rewards transfer webhook %s for %s recorded as %s (webhook amount %s, payout %s, payout status %s). Nothing was applied.',
             p_event, p_reference, v_outcome, coalesce(p_amount_minor::text, 'none'),
             coalesce(p.amount_minor::text, 'none'), coalesce(p.status, 'none')));
  end if;
  return jsonb_build_object('status', case when v_outcome = 'applied_paid' then 'paid'
                                           when v_outcome = 'applied_failed' then 'failed'
                                           else coalesce(p.status, 'not_found') end,
                            'outcome', v_outcome, 'duplicate', false);
end $$;

-- Payouts to ask the provider about (RECONCILIATION): initiated and not yet
-- terminal. A verify answer can fail one; only a webhook pays one.
create or replace function public.rewards_payouts_to_verify(p_older_than_minutes int default 10)
returns table (reference text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select reference, status, created_at from public.rewards_payouts
   where status in ('processing','sent','unknown') and transfer_initiated_at is not null
     and updated_at < now() - make_interval(mins => greatest(1, coalesce(p_older_than_minutes, 10)))
   order by created_at limit 100;
$$;

create or replace function public.rewards_payouts_to_send(p_older_than_minutes int default 2)
returns table (reference text, amount_minor bigint, recipient_code text)
language sql stable security definer set search_path = '' as $$
  select reference, amount_minor, recipient_code from public.rewards_payouts
   where status = 'processing' and transfer_initiated_at is null and recipient_code is not null
     and updated_at < now() - make_interval(mins => greatest(0, coalesce(p_older_than_minutes, 2)))
   order by created_at limit 100;
$$;

-- Claim one payout for sending, exactly once (PAYSTACK step): it becomes
-- sent, and so do its referrals. True only for the caller that claimed it.
create or replace function public.rewards_payout_claim_send(p_reference text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.rewards_payouts set transfer_initiated_at = now(), status = 'sent'
   where reference = p_reference and status = 'processing'
     and transfer_initiated_at is null and recipient_code is not null
  returning id into v_id;
  if v_id is null then return false; end if;
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, 'withdrawal_requested', 'sent', 'transfer initiated', jsonb_build_object('payout_id', v_id)
    from public.referrals where payout_id = v_id and status = 'withdrawal_requested';
  update public.referrals set status = 'sent' where payout_id = v_id and status = 'withdrawal_requested';
  return true;
end $$;

-- Anything in flight past the age with no terminal state, for an alert.
create or replace function public.rewards_payouts_stuck(p_older_than_hours int default 24)
returns table (reference text, status text, created_at timestamptz, initiated boolean)
language sql stable security definer set search_path = '' as $$
  select reference, status, created_at, transfer_initiated_at is not null from public.rewards_payouts
   where status in ('processing','sent','unknown')
     and created_at < now() - make_interval(hours => greatest(1, coalesce(p_older_than_hours, 24)))
   order by created_at limit 200;
$$;

-- -------------------------------------------------------------------- staff

-- approve: under_review -> approved (it still waits out its window).
-- reject:  under_review -> rejected -> reversed.
-- reverse: any live state -> reversed.
-- review:  pending, approved or available -> under_review.
create or replace function public.admin_referral_decide(p_referral uuid, p_decision text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.referrals; actor uuid := (select auth.uid());
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into r from public.referrals where id = p_referral for update;
  if r.id is null then return 'not_found'; end if;
  if p_decision = 'approve' and r.status = 'under_review' then
    perform private.referral_move(r.id, 'approved', p_reason, actor);
  elsif p_decision = 'reject' and r.status = 'under_review' then
    perform private.referral_move(r.id, 'rejected', p_reason, actor);
    perform private.referral_reverse(r.id, p_reason, actor);
  elsif p_decision = 'reverse' then
    perform private.referral_reverse(r.id, p_reason, actor);
  elsif p_decision = 'review' and r.status in ('pending','approved','available') then
    perform private.referral_move(r.id, 'under_review', p_reason, actor);
  else
    return 'refused';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'referral_' || p_decision, 'referral', r.id::text, jsonb_build_object('reason', p_reason, 'from', r.status));
  return (select status from public.referrals where id = p_referral);
end $$;

create or replace function public.admin_rewards_payout_decide(p_payout uuid, p_decision text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.rewards_payouts;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into p from public.rewards_payouts where id = p_payout for update;
  if p.id is null then return 'refused'; end if;
  if p_decision = 'fail_unsent' then
    if p.status not in ('processing','sent','unknown') or p.created_at > now() - interval '24 hours' then
      return 'refused';
    end if;
    if length(btrim(p_reason)) < 20 then
      raise exception 'Say what the provider dashboard showed.' using errcode = '22023';
    end if;
    perform private.rewards_payout_fail(p.id, 'never sent (staff): ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_failed_unsent', 'rewards_payout', p.id::text,
            jsonb_build_object('reason', p_reason, 'prior_status', p.status, 'transfer_initiated_at', p.transfer_initiated_at));
    return 'failed';
  end if;
  if p.status <> 'under_review' then return 'refused'; end if;
  if p_decision = 'release' then
    if p.recipient_code is null then return 'no_recipient'; end if;
    update public.rewards_payouts set status = 'processing' where id = p.id;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_released', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'processing';
  elsif p_decision = 'refuse' then
    perform private.rewards_payout_fail(p.id, 'refused on review: ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_refused', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'failed';
  end if;
  return 'refused';
end $$;

-- Set a month's platform budget cap (never below what is committed; the
-- table constraint refuses that). Staff, audited.
create or replace function public.admin_referral_budget_set(p_month date, p_cap_minor bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m date := date_trunc('month', p_month)::date; b public.referral_budget_periods;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 12 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  insert into public.referral_budget_periods as t (period_month, cap_minor, reason, created_by)
  values (m, p_cap_minor, p_reason, (select auth.uid()))
  on conflict (period_month) do update set cap_minor = excluded.cap_minor, reason = excluded.reason
  returning * into b;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'referral_budget_set', 'referral_budget_period', m::text,
          jsonb_build_object('cap_minor', p_cap_minor, 'reason', p_reason));
  return jsonb_build_object('period_month', b.period_month, 'cap_minor', b.cap_minor, 'committed_minor', b.committed_minor);
end $$;

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

-- Clusters ranked by NAIRA EXPOSURE, not member count: twelve accounts worth
-- 900 naira is noise, three worth 90,000 is not.
create or replace function public.admin_referral_cluster_exposure(p_limit int default 100)
returns table (referrer_id uuid, score int, non_network boolean, reasons jsonb, exposure_minor bigint, members int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then return; end if;
  return query
  select x.referrer_id, (x.s ->> 'score')::int, (x.s ->> 'non_network')::boolean, x.s -> 'reasons', x.exposure, x.n
    from (select r.referrer_id, private.referral_cluster_score(r.referrer_id) as s,
                 coalesce(sum(r.reward_minor) filter (where r.status not in ('attributed','rejected','reversed')), 0)::bigint as exposure,
                 count(*)::int as n
            from public.referrals r group by r.referrer_id) x
   where (x.s ->> 'score')::int > 0
   order by x.exposure desc, (x.s ->> 'score')::int desc
   limit greatest(1, least(coalesce(p_limit, 100), 500));
end $$;

-- The liability, per campaign, against the period budget. Reversed amounts
-- sit beside paid amounts and are never netted into them.
create or replace function public.admin_referral_liability()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pol public.referral_policy := private.referral_policy_now(); m date := private.lagos_month(now());
begin
  if not private.is_staff() then return null; end if;
  return jsonb_build_object(
    'owed_minor', (select coalesce(sum(amount_minor), 0) from public.rewards_ledger),
    'pending_minor', (select coalesce(sum(reward_minor), 0) from public.referrals where status in ('qualified','pending','approved','under_review')),
    'paid_minor', (select coalesce(sum(amount_minor), 0) from public.rewards_payouts where status = 'paid'),
    'reversed_after_paid_minor', (select coalesce(sum(r.reward_minor), 0) from public.referrals r
                                   where r.status = 'reversed' and exists (select 1 from public.referral_events e
                                     where e.referral_id = r.id and e.to_status = 'paid')),
    'month', m,
    'budget_cap_minor', (select cap_minor from public.referral_budget_periods where period_month = m),
    'budget_committed_minor', (select committed_minor from public.referral_budget_periods where period_month = m),
    'by_campaign', (select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'status', c.status,
                       'committed_minor', (select coalesce(sum(s.committed_minor), 0) from public.referral_member_period_spend s
                                            where s.campaign_id = c.id and s.period_month = m))), '[]'::jsonb)
                      from public.referral_campaigns c),
    'blocked_on', (select coalesce(jsonb_object_agg(b.blocked_on, b.n), '{}'::jsonb) from (
                     select blocked_on, count(*) as n from public.referrals where status = 'attributed' and blocked_on is not null
                      group by blocked_on) b),
    'under_review', (select count(*) from public.referrals where status = 'under_review'),
    'payouts_under_review', (select count(*) from public.rewards_payouts where status = 'under_review'),
    'payouts_unknown', (select count(*) from public.rewards_payouts where status = 'unknown'),
    'payouts_stuck', (select count(*) from public.rewards_payouts where status in ('processing','sent','unknown')
                        and created_at < now() - interval '24 hours'),
    'transfer_incidents', (select count(*) from public.rewards_transfer_events
                            where outcome in ('amount_mismatch','unknown_reference','conflict')),
    'payouts_enabled', coalesce(pol.payouts_enabled, false));
end $$;

-- ------------------------------------------------------------------ grants

-- Private helpers: `authenticated` has USAGE on private and PUBLIC gets
-- EXECUTE by default there, so each is closed explicitly.
do $rv$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private'
              and (p.proname like 'referral\_%' or p.proname like 'rewards\_payout%' or p.proname = 'rewards_incident_alert'
                   or p.proname = 'lagos_month')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $rv$;

-- Public functions: default privileges grant anon EXECUTE, so every one is
-- closed to anon and PUBLIC, then opened to exactly its caller.
do $rp$
declare f text;
begin
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)', 'public.referral_flag_clusters(int)',
    'public.my_rewards_summary()', 'public.my_referrals(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payout_webhook(text,text,bigint,text,jsonb)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.admin_referral_decide(uuid,text,text)', 'public.admin_rewards_payout_decide(uuid,text,text)',
    'public.admin_referral_budget_set(date,bigint,text)',
    'public.admin_referral_graph(uuid,int)', 'public.admin_referral_cluster_exposure(int)',
    'public.admin_referral_liability()', 'public.referral_reverse_for_chargeback(uuid,text)',
    'public.referral_programme_status()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
  -- Service role only (cron, server actions, the webhook route).
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)', 'public.referral_flag_clusters(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payout_webhook(text,text,bigint,text,jsonb)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.referral_reverse_for_chargeback(uuid,text)']
  loop
    execute format('grant execute on function %s to service_role', f);
  end loop;
  -- Members (each answers only for the signed-in member) and staff (each
  -- checks private.is_staff() itself).
  foreach f in array array[
    'public.my_rewards_summary()', 'public.my_referrals(int)', 'public.referral_programme_status()',
    'public.admin_referral_decide(uuid,text,text)', 'public.admin_rewards_payout_decide(uuid,text,text)',
    'public.admin_referral_budget_set(date,bigint,text)',
    'public.admin_referral_graph(uuid,int)', 'public.admin_referral_cluster_exposure(int)',
    'public.admin_referral_liability()']
  loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $rp$;

-- New tables: default privileges hand service_role (and the API roles) every
-- table privilege, TRUNCATE and MAINTAIN included. Revoked above table by
-- table; restated here for the whole set so nothing is missed.
do $rt$
declare t text;
begin
  foreach t in array array['public.referral_requirements','public.referral_campaigns','public.referral_budget_periods',
                           'public.referral_member_period_spend','public.referral_budget_releases','public.referral_policy',
                           'public.referrals','public.referral_events','public.rewards_payouts','public.rewards_transfer_events',
                           'public.rewards_ledger'] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on %s from public, anon, authenticated, service_role', t);
    if current_setting('server_version_num')::int >= 170000 then
      execute format('revoke maintain on %s from public, anon, authenticated, service_role', t);
    end if;
  end loop;
end $rt$;

-- ---------------------------------------------------------------- read back

do $check$
declare missing text := ''; t text; f text; k record; p text;
begin
  foreach t in array array['public.referral_requirements','public.referral_campaigns','public.referral_budget_periods',
                           'public.referral_member_period_spend','public.referral_budget_releases','public.referral_policy',
                           'public.referrals','public.referral_events','public.rewards_payouts','public.rewards_transfer_events',
                           'public.rewards_ledger'] loop
    if to_regclass(t) is null then missing := missing || ' table:' || t; continue; end if;
    if not (select relrowsecurity from pg_class where oid = t::regclass) then missing := missing || ' rls:' || t; end if;
    if has_table_privilege('anon', t, 'SELECT') then missing := missing || ' anon_select:' || t; end if;
    foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('authenticated', t, p) then missing := missing || ' member_' || lower(p) || ':' || t; end if;
      if has_table_privilege('service_role', t, p) then missing := missing || ' service_' || lower(p) || ':' || t; end if;
    end loop;
  end loop;
  if current_setting('server_version_num')::int >= 170000 then
    foreach t in array array['public.referral_requirements','public.referral_campaigns','public.referral_budget_periods',
                             'public.referral_member_period_spend','public.referral_budget_releases','public.referral_policy',
                             'public.referrals','public.referral_events','public.rewards_payouts','public.rewards_transfer_events',
                             'public.rewards_ledger'] loop
      for k in execute format('select has_table_privilege(''service_role'', %L, ''MAINTAIN'') as m', t) loop
        if k.m then missing := missing || ' service_maintain:' || t; end if;
      end loop;
    end loop;
  end if;

  -- Object names stay clear of the live custody guard.
  for t in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace
            and (c.relname like 'referral%' or c.relname like 'rewards%')
            and (c.relname ~ '(^|_)(wallets?|escrows?|pots?)(_|$)' or c.relname like 'held\_payment%') loop
    missing := missing || ' custody_name:' || t;
  end loop;

  foreach t in array array['rewards_ledger_append_only','rewards_ledger_no_truncate','referral_events_append_only',
                           'referral_events_no_truncate','referrals_no_truncate','referrals_guard','referral_policy_no_truncate',
                           'referral_policy_frozen','rewards_payouts_guard','rewards_payouts_no_truncate',
                           'rewards_transfer_events_append_only','rewards_transfer_events_no_truncate',
                           'referral_requirements_fixed','referral_requirements_no_truncate',
                           'referral_campaigns_guard','referral_campaigns_no_truncate',
                           'referral_budget_periods_guard','referral_budget_periods_no_truncate',
                           'referral_member_period_spend_guard','referral_member_period_spend_no_truncate',
                           'referral_budget_releases_append_only','referral_budget_releases_no_truncate',
                           'transactions_referral','confirmed_phones_referral','booking_refunds_referral'] loop
    if not exists (select 1 from pg_trigger where tgname = t) then missing := missing || ' trigger:' || t; end if;
  end loop;

  -- The registry: every key has its own function and a dispatcher arm.
  for k in select key, check_function from public.referral_requirements loop
    if to_regprocedure(k.check_function || '(uuid,jsonb)') is null then
      missing := missing || ' registry_fn:' || k.key;
    elsif coalesce(private.referral_requirement_check(k.key, gen_random_uuid(), null), '') like 'unknown_requirement%' then
      missing := missing || ' registry_dispatch:' || k.key;
    end if;
  end loop;
  if (select count(*) from public.referral_requirements) < 8 then missing := missing || ' registry_rows'; end if;
  -- Every campaign's keys resolve.
  if exists (select 1 from public.referral_campaigns c, unnest(c.requirement_keys) as ck(key_name)
              where not exists (select 1 from public.referral_requirements r where r.key = ck.key_name)) then
    missing := missing || ' campaign_unknown_key';
  end if;
  -- Nothing seeded is live: proposed campaigns are draft and payouts are off.
  if exists (select 1 from public.referral_campaigns where slug like '%-proposed' and status <> 'draft') then
    missing := missing || ' proposed_campaign_live';
  end if;
  if not exists (select 1 from public.referral_budget_periods where period_month = '2026-10-01' and cap_minor = 70000000) then
    missing := missing || ' d64_budget_row';
  end if;
  if not exists (select 1 from public.referral_campaigns where slug = 'launch-d51' and reward_minor = 7000) then
    missing := missing || ' launch_campaign';
  end if;
  if exists (select 1 from public.referrals r where r.status not in
               ('attributed','qualified','pending','under_review','approved','rejected',
                'available','withdrawal_requested','sent','paid','reversed')) then
    missing := missing || ' unmapped_status';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'referral_budget_within_cap') then
    missing := missing || ' budget_ceiling_constraint';
  end if;

  -- Member reads go through functions only, without fraud signals.
  if has_table_privilege('authenticated', 'public.referrals', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_policy', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_campaigns', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_budget_periods', 'SELECT')
     or has_table_privilege('authenticated', 'public.rewards_transfer_events', 'SELECT') then
    missing := missing || ' member_reads_internal_table';
  end if;
  if has_table_privilege('authenticated', 'public.referral_budget_releases', 'SELECT') then
    missing := missing || ' member_reads_releases';
  end if;
  foreach t in array array['risk_score','risk_reasons','account_key','recipient_code','transfer_code','bank_code','failure_reason'] loop
    if has_column_privilege('authenticated', 'public.rewards_payouts', t, 'SELECT') then
      missing := missing || ' member_column:' || t;
    end if;
  end loop;

  -- Function grants.
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)', 'public.referral_flag_clusters(int)',
    'public.my_rewards_summary()', 'public.my_referrals(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payout_webhook(text,text,bigint,text,jsonb)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.admin_referral_decide(uuid,text,text)', 'public.admin_rewards_payout_decide(uuid,text,text)',
    'public.admin_referral_budget_set(date,bigint,text)',
    'public.admin_referral_graph(uuid,int)', 'public.admin_referral_cluster_exposure(int)',
    'public.admin_referral_liability()', 'public.referral_reverse_for_chargeback(uuid,text)',
    'public.referral_programme_status()'] loop
    if has_function_privilege('anon', f, 'EXECUTE') then missing := missing || ' anon_exec:' || f; end if;
  end loop;
  foreach f in array array[
    'public.referral_release_due()', 'public.referral_qualify_pending(int)', 'public.referral_flag_clusters(int)',
    'public.rewards_payout_open(uuid,text,text,text,text)',
    'public.rewards_payout_settle(text,text,text,text,text,text)',
    'public.rewards_payout_webhook(text,text,bigint,text,jsonb)',
    'public.rewards_payouts_to_verify(int)', 'public.rewards_payouts_to_send(int)',
    'public.rewards_payout_claim_send(text)', 'public.rewards_payouts_stuck(int)',
    'public.referral_reverse_for_chargeback(uuid,text)'] loop
    if has_function_privilege('authenticated', f, 'EXECUTE') then missing := missing || ' member_exec:' || f; end if;
    if not has_function_privilege('service_role', f, 'EXECUTE') then missing := missing || ' service_exec:' || f; end if;
  end loop;
  for f in select p2.oid::regprocedure::text from pg_proc p2 join pg_namespace n on n.oid = p2.pronamespace
            where n.nspname = 'private'
              and (p2.proname like 'referral\_%' or p2.proname like 'rewards\_payout%' or p2.proname = 'rewards_incident_alert'
                   or p2.proname = 'lagos_month') loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      missing := missing || ' private_exec:' || f;
    end if;
  end loop;
  -- The trigger functions never wait long.
  foreach f in array array['private.referral_try_qualify(uuid)','private.referral_after_phone()',
                           'private.referral_after_transaction()','private.referral_after_booking_refund()'] loop
    if not exists (select 1 from pg_proc where oid = f::regprocedure and proconfig::text like '%lock_timeout%') then
      missing := missing || ' lock_timeout:' || f;
    end if;
  end loop;

  if missing <> '' then raise exception 'b4_referral_campaigns did not land:%', missing; end if;
end $check$;
