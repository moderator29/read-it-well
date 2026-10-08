-- SUBSCRIPTIONS CHECKOUT: Vallo Pro and Vallo Business can be tried and paid for.
-- APPLIED LIVE 8 October 2026 (20261008200007).
--
-- Base read from the live database on 8 October 2026 before writing:
-- public.entitlement_plans holds `free` (1), `pro` (2, 950000 a month) and
-- `business` (3, 3500000 a month) from d84; public.member_entitlement_plans
-- is empty; public.subscription_settings (id 1) holds trial_days = 4;
-- private.ledger_append and ledger_vallo_revenue are b2's; pg_cron is
-- installed; no `subscriptions_checkout` switch row exists.
--
-- WHAT THIS ADDS
--   public.subscription_provider_plans  the Paystack plan code for each Vallo
--        plan, per mode (test / live) and per price. Created lazily by the app
--        through Paystack's API the first time a plan is sold at a price, and
--        recorded here (public.subscription_provider_plan_record). The amount
--        is always the plan row's price_minor; a new price is a new code.
--   public.member_subscriptions  one row per subscription a member holds, a
--        trial or a paid one:
--          trial  trialing -> converted (paid during the trial) | expired
--          paid   incomplete (checkout opened) -> active -> past_due -> active
--                 active | past_due -> non_renewing (cancelled; access to the
--                 end of the paid period) -> cancelled
--                 past_due -> expired (the grace after the period ran out)
--                 incomplete -> abandoned (nobody paid in a day; a late
--                 charge.success still activates) | mismatch (money arrived
--                 that does not match what was sold: never activated, the desk
--                 decides)
--        ONE TRIAL PER MEMBER, EVER: a unique index on (user_id) where the row
--        is a trial. ONE LIVE SUBSCRIPTION PER MEMBER: a unique index on
--        (user_id) over trialing, active, non_renewing and past_due.
--   public.subscription_events  every Paystack subscription event this
--        platform received (and every move the app or the sweep made), unique
--        per provider, mode and event key, so a redelivery is a no-op. Only
--        normalised fields are kept: no card data, no email address.
--   subscription_settings.renewal_grace_days  how long a paid plan stays
--        granted after its period ends while the renewal is still arriving
--        (Paystack charges on the due date; the webhook can be late). 3 days.
--
-- THE GRANT IS THE EXISTING ONE. A trialing or paid subscription holds exactly
-- one public.member_entitlement_plans row (grant_id), written only by the
-- functions here, so public.entitlement_check answers for it as it does for
-- any plan. Every grant is time-bounded (effective_to): a trial to its end, a
-- paid plan to the end of its period plus the grace. Access therefore ends on
-- time even if the sweep never runs; the sweep only moves the status.
--
-- DOORS (security definer, search_path ''):
--   public.subscription_start_trial(plan_key)            authenticated, for themselves
--   public.subscription_checkout_open(...)               service_role
--   public.subscription_provider_plan_record(...)        service_role
--   public.subscription_apply_event(mode, event, key, data)  service_role, THE ONLY
--        ACTIVATION of a paid plan: called by the Paystack webhook, and by the
--        return page after the server itself verified the charge with Paystack
--        (same event key, so the two can never both apply)
--   public.subscription_mark_cancelled(user, subscription)  service_role, after
--        Paystack confirmed subscription/disable
--   private.subscriptions_sweep()                        pg_cron vallo_subscriptions_sweep
--
-- THE SWITCH. `subscriptions_checkout` in public.feature_flags, seeded ON (the
-- founder, 8 October: "it supposed to be open and people can pay"). A missing
-- row reads OFF: no trial starts and no checkout opens. Events for money
-- already taken are always applied, whatever the switch says.
--
-- REVENUE. A live-mode charge.success posts FEE_CHARGED 'in' to
-- ledger_vallo_revenue under 'subscription:<reference>' (idempotent). Test-mode
-- charges are not revenue and post nothing.
--
-- Additive and idempotent: create ... if not exists, create or replace,
-- add column if not exists, on conflict do nothing. No drop, no delete.
--
-- ON APPLY, ALSO: add `vallo_subscriptions_sweep` (pg_cron `9,24,39,54 * * * *`)
-- to PG_CRON_JOBS in apps/web/src/lib/admin/reads/jobs.ts and to the job table
-- and the counts in docs/ADMIN_CONSOLE.md, and move the probe
-- (supabase/tests/probes-pending/subscriptions-checkout.sql) into the suite.

set local lock_timeout = '10s';

do $$
begin
  if to_regclass('public.entitlement_plans') is null or to_regclass('public.member_entitlement_plans') is null
     or to_regclass('public.subscription_settings') is null
     or to_regprocedure('private.ledger_append(text,text,text,text,bigint,text,text,text,uuid,text,text,jsonb,uuid,uuid)') is null then
    raise exception 'subscriptions_checkout: apply b2_ledger, b3_tax_entitlements_promotion and d84_founder_rulings_8_october first';
  end if;
end $$;

-- 1. The switch. -------------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('subscriptions_checkout', true,
        'Vallo Pro and Vallo Business can be tried (no card) and paid for through Paystack. On by the founder''s word of 8 October. Off: no trial starts and no checkout opens; payments already taken are still applied. A missing row reads as off.')
on conflict (key) do nothing;

create or replace function private.subscriptions_checkout_on()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'subscriptions_checkout'), false);
$$;
revoke all on function private.subscriptions_checkout_on() from public, anon, authenticated;

-- 2. The grace after a paid period. ------------------------------------------------
alter table public.subscription_settings
  add column if not exists renewal_grace_days smallint not null default 3
    check (renewal_grace_days between 0 and 14);

create or replace function private.subscription_grace()
returns interval language sql stable security definer set search_path to '' as $$
  select make_interval(days => coalesce((select s.renewal_grace_days from public.subscription_settings s where s.id = 1), 3)::int);
$$;
revoke all on function private.subscription_grace() from public, anon, authenticated;

-- 3. Paystack plan codes. ----------------------------------------------------------
create table if not exists public.subscription_provider_plans (
  id                  bigint generated always as identity primary key,
  plan_key            text not null check (plan_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  provider            text not null default 'paystack' check (provider = 'paystack'),
  mode                text not null check (mode in ('test', 'live')),
  provider_plan_code  text not null check (provider_plan_code ~ '^PLN_[A-Za-z0-9]+$'),
  amount_minor        bigint not null check (amount_minor > 0),
  currency            text not null default 'NGN' check (currency = 'NGN'),
  billing_interval    text not null default 'monthly' check (billing_interval = 'monthly'),
  created_at          timestamptz not null default now(),
  unique (provider, mode, plan_key, amount_minor, billing_interval),
  unique (provider, mode, provider_plan_code)
);
comment on table public.subscription_provider_plans is
  'The Paystack plan code for a Vallo plan at a price, per mode. Recorded by the app after it created (or found) the plan at Paystack. Read and written by the service role only.';

alter table public.subscription_provider_plans enable row level security;
revoke all on public.subscription_provider_plans from public, anon, authenticated, service_role;
grant select on public.subscription_provider_plans to service_role;
revoke all on sequence public.subscription_provider_plans_id_seq from public, anon, authenticated;

-- 4. Subscriptions. ----------------------------------------------------------------
create table if not exists public.member_subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  plan_id                     bigint not null references public.entitlement_plans (id),
  plan_key                    text not null check (plan_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  kind                        text not null check (kind in ('trial', 'paid')),
  status                      text not null check (status in ('trialing', 'converted', 'expired', 'incomplete', 'active',
                                                              'past_due', 'non_renewing', 'cancelled', 'abandoned', 'mismatch')),
  mode                        text check (mode in ('test', 'live')),
  provider                    text check (provider = 'paystack'),
  amount_minor                bigint check (amount_minor > 0),
  currency                    text check (currency = 'NGN'),
  checkout_reference          text unique check (checkout_reference ~ '^rm-sub-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  -- The lowercase email the checkout was opened with, hashed (sha256 hex), so
  -- subscription.create can find its checkout without this table holding an
  -- address. Never shown to anybody.
  checkout_email_sha256       text check (checkout_email_sha256 ~ '^[0-9a-f]{64}$'),
  provider_plan_code          text,
  provider_customer_code      text,
  provider_subscription_code  text unique,
  -- Paystack's token for managing the subscription (subscription/disable).
  -- Not readable by members (column grants below).
  provider_email_token        text,
  trial_ends_at               timestamptz,
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  cancel_requested_at         timestamptz,
  ended_at                    timestamptz,
  end_reason                  text,
  grant_id                    uuid references public.member_entitlement_plans (id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint member_subscriptions_shape check (
    (kind = 'trial' and provider is null and mode is null and checkout_reference is null and amount_minor is null
       and trial_ends_at is not null and status in ('trialing', 'converted', 'expired'))
    or
    (kind = 'paid' and provider = 'paystack' and mode is not null and checkout_reference is not null
       and amount_minor is not null and currency is not null and provider_plan_code is not null
       and status in ('incomplete', 'active', 'past_due', 'non_renewing', 'cancelled', 'expired', 'abandoned', 'mismatch')))
);
create unique index if not exists member_subscriptions_one_trial_ever
  on public.member_subscriptions (user_id) where kind = 'trial';
create unique index if not exists member_subscriptions_one_live
  on public.member_subscriptions (user_id) where status in ('trialing', 'active', 'past_due', 'non_renewing');
create index if not exists member_subscriptions_user_idx on public.member_subscriptions (user_id, created_at desc);
create index if not exists member_subscriptions_customer_idx
  on public.member_subscriptions (provider_customer_code) where provider_customer_code is not null;
create index if not exists member_subscriptions_sweep_idx
  on public.member_subscriptions (status) where status in ('trialing', 'incomplete', 'active', 'past_due', 'non_renewing');
comment on table public.member_subscriptions is
  'A member''s trial or paid subscription to a plan. Grants the plan through public.member_entitlement_plans (grant_id). Written only by the subscription_* functions.';

alter table public.member_subscriptions enable row level security;
revoke all on public.member_subscriptions from public, anon, authenticated, service_role;
-- A member reads their own rows, and only the columns that describe the plan
-- to them: never the email hash or Paystack's management token.
grant select (id, user_id, plan_id, plan_key, kind, status, mode, amount_minor, currency, checkout_reference,
              trial_ends_at, current_period_start, current_period_end, cancel_requested_at, ended_at, end_reason,
              created_at, updated_at)
  on public.member_subscriptions to authenticated;
grant select on public.member_subscriptions to service_role;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_subscriptions'
                   and policyname = 'member_subscriptions_own') then
    create policy member_subscriptions_own on public.member_subscriptions for select to authenticated
      using (user_id = (select auth.uid()) or private.is_staff());
  end if;
end $$;

-- 5. Events. -----------------------------------------------------------------------
create table if not exists public.subscription_events (
  id                          bigint generated always as identity primary key,
  provider                    text not null check (provider in ('paystack', 'vallo')),
  mode                        text check (mode in ('test', 'live')),
  event_key                   text not null check (length(event_key) between 8 and 300),
  event_type                  text not null,
  subscription_id             uuid references public.member_subscriptions (id) on delete cascade,
  reference                   text,
  provider_subscription_code  text,
  invoice_code                text,
  amount_minor                bigint,
  currency                    text,
  provider_status             text,
  outcome                     text not null,
  from_status                 text,
  to_status                   text,
  received_at                 timestamptz not null default now()
);
create unique index if not exists subscription_events_key
  on public.subscription_events (provider, coalesce(mode, '-'), event_key);
create index if not exists subscription_events_subscription_idx on public.subscription_events (subscription_id, received_at desc);
comment on table public.subscription_events is
  'Every subscription event received from Paystack (normalised, no card or email data) and every move Vallo made. Unique per provider, mode and event key: a redelivery is a no-op.';

alter table public.subscription_events enable row level security;
revoke all on public.subscription_events from public, anon, authenticated, service_role;
grant select on public.subscription_events to authenticated, service_role;
revoke all on sequence public.subscription_events_id_seq from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_events'
                   and policyname = 'subscription_events_own') then
    create policy subscription_events_own on public.subscription_events for select to authenticated
      using (private.is_staff() or exists (select 1 from public.member_subscriptions s
                                            where s.id = subscription_id and s.user_id = (select auth.uid())));
  end if;
end $$;

-- 6. Helpers. ----------------------------------------------------------------------
-- The plan on sale now: in force, not the default, with a monthly price.
create or replace function private.subscription_plan_now(p_plan_key text)
returns public.entitlement_plans language sql stable security definer set search_path to '' as $$
  select p.* from public.entitlement_plans p
   where p.plan_key = p_plan_key and not p.is_default
     and p.price_minor is not null and p.price_minor > 0 and p.billing_interval = 'month'
     and p.effective_from <= now() and (p.effective_to is null or p.effective_to > now())
   order by p.effective_from desc limit 1
$$;
revoke all on function private.subscription_plan_now(text) from public, anon, authenticated;

-- Grant (or move the end of) the plan a subscription holds. Never shortens a
-- grant below its own start (the window check), never touches a grant the
-- subscription did not write.
create or replace function private.subscription_grant_until(p_subscription uuid, p_until timestamptz)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  s public.member_subscriptions;
  g public.member_entitlement_plans;
  v_id uuid;
begin
  select * into s from public.member_subscriptions where id = p_subscription;
  if s.id is null then raise exception 'subscription % not found', p_subscription using errcode = 'P0002'; end if;
  if s.grant_id is null then
    insert into public.member_entitlement_plans (user_id, plan_id, effective_from, effective_to, granted_by, reason)
    values (s.user_id, s.plan_id, now(), greatest(p_until, now() + interval '1 second'), null,
            'subscription:' || s.kind || ':' || s.id::text)
    returning id into v_id;
    update public.member_subscriptions set grant_id = v_id where id = s.id;
    return v_id;
  end if;
  select * into g from public.member_entitlement_plans where id = s.grant_id for update;
  update public.member_entitlement_plans
     set effective_to = greatest(p_until, g.effective_from + interval '1 second')
   where id = g.id;
  return g.id;
end;
$$;
revoke all on function private.subscription_grant_until(uuid, timestamptz) from public, anon, authenticated;

-- End a grant at p_at, or keep an earlier end. Never extends.
create or replace function private.subscription_grant_end(p_subscription uuid, p_at timestamptz)
returns void language plpgsql security definer set search_path to '' as $$
declare
  g public.member_entitlement_plans;
begin
  select m.* into g from public.member_entitlement_plans m
    join public.member_subscriptions s on s.grant_id = m.id
   where s.id = p_subscription for update of m;
  if g.id is null then return; end if;
  update public.member_entitlement_plans
     set effective_to = greatest(least(coalesce(g.effective_to, p_at), p_at), g.effective_from + interval '1 second')
   where id = g.id;
end;
$$;
revoke all on function private.subscription_grant_end(uuid, timestamptz) from public, anon, authenticated;

create or replace function private.subscription_log(
  p_provider text, p_mode text, p_key text, p_type text, p_subscription uuid, p_outcome text,
  p_from text, p_to text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path to '' as $$
  insert into public.subscription_events (provider, mode, event_key, event_type, subscription_id, reference,
                                          provider_subscription_code, invoice_code, amount_minor, currency,
                                          provider_status, outcome, from_status, to_status)
  values (p_provider, p_mode, p_key, p_type, p_subscription, nullif(p_data ->> 'reference', ''),
          nullif(p_data ->> 'subscription_code', ''), nullif(p_data ->> 'invoice_code', ''),
          case when (p_data ->> 'amount_minor') ~ '^[0-9]{1,15}$' then (p_data ->> 'amount_minor')::bigint end,
          nullif(p_data ->> 'currency', ''), nullif(p_data ->> 'provider_status', ''), p_outcome, p_from, p_to)
  on conflict do nothing;
$$;
revoke all on function private.subscription_log(text, text, text, text, uuid, text, text, text, jsonb) from public, anon, authenticated;

-- 7. The trial: no card, the plan at once, once per member ever. ---------------------
create or replace function public.subscription_start_trial(p_plan_key text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid := (select auth.uid());
  v_plan public.entitlement_plans;
  v_days int;
  v_id uuid := gen_random_uuid();
  v_ends timestamptz;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  if not private.subscriptions_checkout_on() then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  v_plan := private.subscription_plan_now(p_plan_key);
  if v_plan.id is null then return jsonb_build_object('ok', false, 'reason', 'unknown_plan'); end if;
  select s.trial_days into v_days from public.subscription_settings s where s.id = 1;
  if v_days is null or v_days < 1 then return jsonb_build_object('ok', false, 'reason', 'no_trial'); end if;
  perform pg_advisory_xact_lock(hashtextextended('subscription:' || v_user::text, 0));
  if exists (select 1 from public.member_subscriptions s where s.user_id = v_user and s.kind = 'trial') then
    return jsonb_build_object('ok', false, 'reason', 'trial_used');
  end if;
  if exists (select 1 from public.member_subscriptions s where s.user_id = v_user
               and s.status in ('trialing', 'active', 'past_due', 'non_renewing')) then
    return jsonb_build_object('ok', false, 'reason', 'already_subscribed');
  end if;
  v_ends := now() + make_interval(days => v_days);
  begin
    insert into public.member_subscriptions (id, user_id, plan_id, plan_key, kind, status, trial_ends_at)
    values (v_id, v_user, v_plan.id, v_plan.plan_key, 'trial', 'trialing', v_ends);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'trial_used');
  end;
  perform private.subscription_grant_until(v_id, v_ends);
  perform private.subscription_log('vallo', null, 'trial.started:' || v_id::text, 'trial.started', v_id, 'applied', null, 'trialing');
  return jsonb_build_object('ok', true, 'subscription_id', v_id, 'plan_key', v_plan.plan_key,
                            'trial_ends_at', v_ends, 'trial_days', v_days);
end;
$$;
revoke all on function public.subscription_start_trial(text) from public, anon;
grant execute on function public.subscription_start_trial(text) to authenticated;

-- 8. Plan codes. -----------------------------------------------------------------
-- Records the code the app created or found at Paystack. The first recorded
-- code for a plan, mode and price wins; the one stored is returned.
create or replace function public.subscription_provider_plan_record(
  p_plan_key text, p_mode text, p_plan_code text, p_amount_minor bigint)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_code text;
begin
  insert into public.subscription_provider_plans (plan_key, provider, mode, provider_plan_code, amount_minor)
  values (p_plan_key, 'paystack', p_mode, p_plan_code, p_amount_minor)
  on conflict do nothing;
  select pp.provider_plan_code into v_code from public.subscription_provider_plans pp
   where pp.provider = 'paystack' and pp.mode = p_mode and pp.plan_key = p_plan_key
     and pp.amount_minor = p_amount_minor and pp.billing_interval = 'monthly';
  return v_code;
end;
$$;
revoke all on function public.subscription_provider_plan_record(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.subscription_provider_plan_record(text, text, text, bigint) to service_role;

-- 9. Open a paid checkout. The amount is the plan row's, never the client's. ---------
-- Returns {ok, reason?, subscription_id, reference, amount_minor, currency,
-- plan_key, plan_name, in_trial}.
create or replace function public.subscription_checkout_open(
  p_user uuid, p_plan_key text, p_mode text, p_plan_code text, p_amount_minor bigint, p_email_sha256 text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_plan public.entitlement_plans;
  v_id uuid := gen_random_uuid();
  v_ref text;
begin
  if p_user is null or p_mode not in ('test', 'live') then
    return jsonb_build_object('ok', false, 'reason', 'missing_input');
  end if;
  if not private.subscriptions_checkout_on() then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  v_plan := private.subscription_plan_now(p_plan_key);
  if v_plan.id is null then return jsonb_build_object('ok', false, 'reason', 'unknown_plan'); end if;
  if p_amount_minor is distinct from v_plan.price_minor then
    return jsonb_build_object('ok', false, 'reason', 'price_changed');
  end if;
  if not exists (select 1 from public.subscription_provider_plans pp
                  where pp.provider = 'paystack' and pp.mode = p_mode and pp.plan_key = v_plan.plan_key
                    and pp.amount_minor = v_plan.price_minor and pp.provider_plan_code = p_plan_code) then
    return jsonb_build_object('ok', false, 'reason', 'plan_code_unknown');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('subscription:' || p_user::text, 0));
  if exists (select 1 from public.member_subscriptions s where s.user_id = p_user and s.kind = 'paid'
               and s.status in ('active', 'past_due', 'non_renewing')) then
    return jsonb_build_object('ok', false, 'reason', 'already_subscribed');
  end if;
  -- An earlier checkout nobody finished is left behind (a late payment on it
  -- still activates, through apply_event).
  update public.member_subscriptions set status = 'abandoned', updated_at = now()
   where user_id = p_user and status = 'incomplete';
  v_ref := 'rm-sub-' || v_id::text;
  insert into public.member_subscriptions (id, user_id, plan_id, plan_key, kind, status, mode, provider, amount_minor,
                                           currency, checkout_reference, checkout_email_sha256, provider_plan_code)
  values (v_id, p_user, v_plan.id, v_plan.plan_key, 'paid', 'incomplete', p_mode, 'paystack', v_plan.price_minor,
          'NGN', v_ref, nullif(lower(p_email_sha256), ''), p_plan_code);
  perform private.subscription_log('vallo', p_mode, 'checkout.opened:' || v_id::text, 'checkout.opened', v_id,
                                   'applied', null, 'incomplete',
                                   jsonb_build_object('reference', v_ref, 'amount_minor', v_plan.price_minor, 'currency', 'NGN'));
  return jsonb_build_object('ok', true, 'subscription_id', v_id, 'reference', v_ref, 'amount_minor', v_plan.price_minor,
                            'currency', 'NGN', 'plan_key', v_plan.plan_key, 'plan_name', v_plan.name,
                            'in_trial', exists (select 1 from public.member_subscriptions t where t.user_id = p_user
                                                  and t.kind = 'trial' and t.status = 'trialing'));
end;
$$;
revoke all on function public.subscription_checkout_open(uuid, text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.subscription_checkout_open(uuid, text, text, text, bigint, text) to service_role;

-- 10. Paystack's word. THE ONLY ACTIVATION OF A PAID PLAN. ----------------------------
-- p_data is normalised by the app from the signed payload (or from the
-- server's own verify of a charge): reference, amount_minor, currency, paid_at,
-- customer_code, email_sha256, plan_code, subscription_code, email_token,
-- next_payment_date, invoice_code, provider_status, paid, period_end.
-- Returns {outcome, subscription_id?, status?}. Outcomes:
--   applied, recorded (nothing to move), duplicate, unmatched, mismatch,
--   amount_differs (a renewal charged a different amount: applied, and the
--   desk is told), late_charge (money on a finished subscription), ignored.
create or replace function public.subscription_apply_event(p_mode text, p_event text, p_event_key text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  d jsonb := coalesce(p_data, '{}'::jsonb);
  s public.member_subscriptions;
  t public.member_subscriptions;
  v_id uuid;
  v_user uuid;
  v_ref text := nullif(d ->> 'reference', '');
  v_amount bigint := case when (d ->> 'amount_minor') ~ '^[0-9]{1,15}$' then (d ->> 'amount_minor')::bigint end;
  v_currency text := nullif(d ->> 'currency', '');
  v_paid_at timestamptz := coalesce(nullif(d ->> 'paid_at', '')::timestamptz, now());
  v_customer text := nullif(d ->> 'customer_code', '');
  v_email_sha text := lower(nullif(d ->> 'email_sha256', ''));
  v_plan_code text := nullif(d ->> 'plan_code', '');
  v_sub_code text := nullif(d ->> 'subscription_code', '');
  v_token text := nullif(d ->> 'email_token', '');
  v_next timestamptz := nullif(d ->> 'next_payment_date', '')::timestamptz;
  v_period_end timestamptz := nullif(d ->> 'period_end', '')::timestamptz;
  v_pstatus text := nullif(d ->> 'provider_status', '');
  v_paid boolean := coalesce((d ->> 'paid')::boolean, false);
  v_grace interval := private.subscription_grace();
  v_outcome text := 'applied';
  v_from text;
  v_end timestamptz;
  v_other_live boolean;
begin
  if p_mode is null or p_mode not in ('test', 'live') then
    raise exception 'subscription_apply_event: mode must be test or live' using errcode = '22023';
  end if;
  if p_event not in ('charge.success', 'subscription.create', 'subscription.not_renew', 'subscription.disable',
                     'invoice.create', 'invoice.update', 'invoice.payment_failed') then
    return jsonb_build_object('outcome', 'ignored');
  end if;
  if p_event_key is null or length(p_event_key) < 8 or length(p_event_key) > 300 then
    raise exception 'subscription_apply_event: an event key is required' using errcode = '22023';
  end if;

  -- One delivery at a time per event, then the replay check.
  perform pg_advisory_xact_lock(hashtextextended('subscription_event:' || p_mode || ':' || p_event_key, 0));
  if exists (select 1 from public.subscription_events e
              where e.provider = 'paystack' and e.mode = p_mode and e.event_key = p_event_key) then
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  -- Which subscription this is about, without locking yet.
  if v_ref is not null and v_ref like 'rm-sub-%' then
    select ms.id into v_id from public.member_subscriptions ms where ms.checkout_reference = v_ref and ms.mode = p_mode;
  end if;
  if v_id is null and v_sub_code is not null then
    select ms.id into v_id from public.member_subscriptions ms
     where ms.provider_subscription_code = v_sub_code and ms.mode = p_mode;
  end if;
  if v_id is null and p_event = 'charge.success' and v_customer is not null and v_plan_code is not null then
    select ms.id into v_id from public.member_subscriptions ms
     where ms.kind = 'paid' and ms.mode = p_mode and ms.provider_customer_code = v_customer
       and ms.provider_plan_code = v_plan_code
     order by (ms.status in ('active', 'past_due', 'non_renewing')) desc, ms.created_at desc limit 1;
  end if;
  if v_id is null and p_event = 'subscription.create' and v_email_sha is not null and v_plan_code is not null then
    select ms.id into v_id from public.member_subscriptions ms
     where ms.kind = 'paid' and ms.mode = p_mode and ms.provider_subscription_code is null
       and ms.checkout_email_sha256 = v_email_sha and ms.provider_plan_code = v_plan_code
       and ms.status in ('incomplete', 'active', 'abandoned')
     order by (ms.status = 'active') desc, ms.created_at desc limit 1;
  end if;
  if v_id is null then
    perform private.subscription_log('paystack', p_mode, p_event_key, p_event, null, 'unmatched', null, null, d);
    return jsonb_build_object('outcome', 'unmatched');
  end if;

  -- Lock order everywhere: the member, then the rows.
  select ms.user_id into v_user from public.member_subscriptions ms where ms.id = v_id;
  perform pg_advisory_xact_lock(hashtextextended('subscription:' || v_user::text, 0));
  select * into s from public.member_subscriptions where id = v_id for update;
  v_from := s.status;

  if p_event = 'charge.success' then
    if s.status in ('incomplete', 'abandoned') then
      -- The first charge.
      v_other_live := exists (select 1 from public.member_subscriptions o
                               where o.user_id = s.user_id and o.id <> s.id and o.kind = 'paid'
                                 and o.status in ('active', 'past_due', 'non_renewing'));
      if v_amount is distinct from s.amount_minor or v_currency is distinct from s.currency then
        update public.member_subscriptions
           set status = 'mismatch', end_reason = 'amount_or_currency', ended_at = now(), updated_at = now(),
               provider_customer_code = coalesce(v_customer, provider_customer_code)
         where id = s.id;
        v_outcome := 'mismatch';
      elsif v_other_live then
        -- Money for a second subscription while one is live: not granted twice; the desk refunds.
        update public.member_subscriptions
           set status = 'mismatch', end_reason = 'already_subscribed', ended_at = now(), updated_at = now(),
               provider_customer_code = coalesce(v_customer, provider_customer_code)
         where id = s.id;
        v_outcome := 'mismatch';
      else
        -- Paying during a trial ends the trial: the paid month starts now.
        for t in select * from public.member_subscriptions
                  where user_id = s.user_id and kind = 'trial' and status = 'trialing' for update loop
          perform private.subscription_grant_end(t.id, now());
          update public.member_subscriptions
             set status = 'converted', ended_at = now(), end_reason = 'paid', updated_at = now()
           where id = t.id;
          perform private.subscription_log('vallo', null, 'trial.converted:' || t.id::text, 'trial.converted', t.id,
                                           'applied', 'trialing', 'converted');
        end loop;
        v_end := coalesce(v_next, v_paid_at + interval '1 month');
        update public.member_subscriptions
           set status = 'active', current_period_start = v_paid_at, current_period_end = v_end,
               provider_customer_code = coalesce(v_customer, provider_customer_code),
               ended_at = null, end_reason = null, updated_at = now()
         where id = s.id;
        perform private.subscription_grant_until(s.id, v_end + v_grace);
        if p_mode = 'live' and v_ref is not null then
          perform private.ledger_append('vallo_revenue', 'subscription:' || v_ref, 'FEE_CHARGED', 'in', v_amount, v_currency,
            'paystack', v_ref, null, 'direct', 'confirmed',
            jsonb_build_object('kind', 'subscription', 'subscription_id', s.id, 'plan_key', s.plan_key, 'charge', 'first'),
            null, s.user_id);
        end if;
      end if;
    elsif s.status in ('active', 'past_due', 'non_renewing', 'expired') then
      -- A renewal. Money already taken is always recorded.
      v_other_live := exists (select 1 from public.member_subscriptions o
                               where o.user_id = s.user_id and o.id <> s.id
                                 and o.status in ('trialing', 'active', 'past_due', 'non_renewing'));
      if p_mode = 'live' and v_ref is not null and v_amount is not null and v_amount > 0 and v_currency is not null then
        perform private.ledger_append('vallo_revenue', 'subscription:' || v_ref, 'FEE_CHARGED', 'in', v_amount, v_currency,
          'paystack', v_ref, null, 'direct', 'confirmed',
          jsonb_build_object('kind', 'subscription', 'subscription_id', s.id, 'plan_key', s.plan_key, 'charge', 'renewal'),
          null, s.user_id);
      end if;
      if s.status = 'expired' and v_other_live then
        v_outcome := 'late_charge';
      else
        v_end := greatest(coalesce(s.current_period_end, v_paid_at), coalesce(v_next, v_paid_at + interval '1 month'));
        update public.member_subscriptions
           set status = case when status in ('past_due', 'expired') then 'active' else status end,
               current_period_start = v_paid_at, current_period_end = v_end,
               provider_customer_code = coalesce(v_customer, provider_customer_code),
               ended_at = null, end_reason = null, updated_at = now()
         where id = s.id;
        perform private.subscription_grant_until(s.id, v_end + case when s.status = 'non_renewing' then interval '0' else v_grace end);
        if v_amount is distinct from s.amount_minor then v_outcome := 'amount_differs'; end if;
      end if;
    else
      -- cancelled, converted, mismatch: money on a finished subscription.
      if p_mode = 'live' and v_ref is not null and v_amount is not null and v_amount > 0 and v_currency is not null then
        perform private.ledger_append('vallo_revenue', 'subscription:' || v_ref, 'FEE_CHARGED', 'in', v_amount, v_currency,
          'paystack', v_ref, null, 'direct', 'confirmed',
          jsonb_build_object('kind', 'subscription', 'subscription_id', s.id, 'plan_key', s.plan_key, 'charge', 'late'),
          null, s.user_id);
      end if;
      v_outcome := 'late_charge';
    end if;

  elsif p_event = 'subscription.create' then
    update public.member_subscriptions
       set provider_subscription_code = coalesce(provider_subscription_code, v_sub_code),
           provider_email_token = coalesce(v_token, provider_email_token),
           provider_customer_code = coalesce(provider_customer_code, v_customer),
           current_period_end = case when status = 'active' and v_next is not null then v_next else current_period_end end,
           updated_at = now()
     where id = s.id;
    if s.status = 'active' and v_next is not null then
      perform private.subscription_grant_until(s.id, v_next + v_grace);
    elsif s.status <> 'active' then
      v_outcome := 'recorded';
    end if;

  elsif p_event = 'subscription.not_renew' then
    if s.status in ('active', 'past_due') then
      update public.member_subscriptions
         set status = 'non_renewing', cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now(),
             provider_email_token = coalesce(v_token, provider_email_token)
       where id = s.id;
      -- No renewal is coming: the plan runs to the end of the paid period, no grace.
      perform private.subscription_grant_until(s.id, greatest(coalesce(s.current_period_end, now()), now()));
    else
      v_outcome := 'recorded';
    end if;

  elsif p_event = 'subscription.disable' then
    if s.status in ('active', 'non_renewing') and s.current_period_end > now() then
      update public.member_subscriptions
         set status = 'non_renewing', cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now()
       where id = s.id;
      perform private.subscription_grant_until(s.id, s.current_period_end);
    elsif s.status in ('active', 'past_due', 'non_renewing') then
      update public.member_subscriptions
         set status = 'cancelled', ended_at = now(), end_reason = coalesce(end_reason, 'disabled'), updated_at = now()
       where id = s.id;
      perform private.subscription_grant_end(s.id, now());
    else
      v_outcome := 'recorded';
    end if;

  elsif p_event = 'invoice.create' then
    v_outcome := 'recorded';

  elsif p_event = 'invoice.update' and (v_paid or v_pstatus = 'success') then
    v_end := coalesce(v_next, v_period_end);
    v_other_live := exists (select 1 from public.member_subscriptions o
                             where o.user_id = s.user_id and o.id <> s.id
                               and o.status in ('trialing', 'active', 'past_due', 'non_renewing'));
    if s.status in ('active', 'past_due', 'non_renewing') or (s.status = 'expired' and not v_other_live) then
      if v_end is not null then
        v_end := greatest(coalesce(s.current_period_end, v_end), v_end);
        update public.member_subscriptions
           set status = case when status in ('past_due', 'expired') then 'active' else status end,
               current_period_end = v_end, ended_at = null, end_reason = null, updated_at = now()
         where id = s.id;
        perform private.subscription_grant_until(s.id, v_end + case when s.status = 'non_renewing' then interval '0' else v_grace end);
      elsif s.status in ('past_due', 'expired') then
        update public.member_subscriptions set status = 'active', ended_at = null, end_reason = null, updated_at = now()
         where id = s.id;
        perform private.subscription_grant_until(s.id, greatest(coalesce(s.current_period_end, now()), now()) + v_grace);
      else
        v_outcome := 'recorded';
      end if;
    else
      v_outcome := 'recorded';
    end if;

  elsif p_event = 'invoice.payment_failed' or (p_event = 'invoice.update' and v_pstatus = 'failed') then
    if s.status = 'active' then
      update public.member_subscriptions set status = 'past_due', updated_at = now() where id = s.id;
    else
      v_outcome := 'recorded';
    end if;

  else
    v_outcome := 'recorded';
  end if;

  select * into t from public.member_subscriptions where id = s.id;
  perform private.subscription_log('paystack', p_mode, p_event_key, p_event, s.id, v_outcome, v_from, t.status, d);
  return jsonb_build_object('outcome', v_outcome, 'subscription_id', s.id, 'status', t.status,
                            'user_id', s.user_id, 'plan_key', s.plan_key);
end;
$$;
revoke all on function public.subscription_apply_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.subscription_apply_event(text, text, text, jsonb) to service_role;

-- 11. The member cancelled, and Paystack confirmed it. ------------------------------
-- The plan runs to the end of the period already paid for, and does not renew.
create or replace function public.subscription_mark_cancelled(p_user uuid, p_subscription uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  s public.member_subscriptions;
begin
  perform pg_advisory_xact_lock(hashtextextended('subscription:' || p_user::text, 0));
  select * into s from public.member_subscriptions where id = p_subscription and user_id = p_user for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status = 'non_renewing' then
    return jsonb_build_object('ok', true, 'status', s.status, 'ends_at', s.current_period_end);
  end if;
  if s.kind <> 'paid' or s.status not in ('active', 'past_due') then
    return jsonb_build_object('ok', false, 'reason', 'not_cancellable', 'status', s.status);
  end if;
  if s.current_period_end is not null and s.current_period_end > now() and s.status = 'active' then
    update public.member_subscriptions
       set status = 'non_renewing', cancel_requested_at = now(), updated_at = now()
     where id = s.id;
    perform private.subscription_grant_until(s.id, s.current_period_end);
    perform private.subscription_log('vallo', s.mode, 'member.cancelled:' || s.id::text, 'member.cancelled', s.id,
                                     'applied', s.status, 'non_renewing');
    return jsonb_build_object('ok', true, 'status', 'non_renewing', 'ends_at', s.current_period_end);
  end if;
  update public.member_subscriptions
     set status = 'cancelled', cancel_requested_at = now(), ended_at = now(), end_reason = 'member_cancelled', updated_at = now()
   where id = s.id;
  perform private.subscription_grant_end(s.id, now());
  perform private.subscription_log('vallo', s.mode, 'member.cancelled:' || s.id::text, 'member.cancelled', s.id,
                                   'applied', s.status, 'cancelled');
  return jsonb_build_object('ok', true, 'status', 'cancelled', 'ends_at', now());
end;
$$;
revoke all on function public.subscription_mark_cancelled(uuid, uuid) from public, anon, authenticated;
grant execute on function public.subscription_mark_cancelled(uuid, uuid) to service_role;

-- 12. The sweep: statuses follow the clock. Access already does (every grant ends
-- on its own); this keeps what the member is shown true. ---------------------------
create or replace function private.subscriptions_sweep()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  r public.member_subscriptions;
  v_grace interval := private.subscription_grace();
  n integer := 0;
  v_to text;
begin
  for r in
    select * from public.member_subscriptions
     where (status = 'trialing' and trial_ends_at <= now())
        or (status = 'non_renewing' and current_period_end <= now())
        or (status in ('active', 'past_due') and current_period_end + v_grace <= now())
        or (status = 'incomplete' and created_at < now() - interval '1 day')
     order by created_at
     limit 500
     for update skip locked
  loop
    v_to := case
      when r.status = 'trialing' then 'expired'
      when r.status = 'non_renewing' then 'cancelled'
      when r.status in ('active', 'past_due') then 'expired'
      else 'abandoned' end;
    update public.member_subscriptions
       set status = v_to, updated_at = now(),
           ended_at = case when v_to = 'abandoned' then ended_at else now() end,
           end_reason = case when v_to = 'abandoned' then end_reason
                             when r.status = 'trialing' then 'trial_ended'
                             when r.status = 'non_renewing' then 'not_renewed'
                             else 'lapsed' end
     where id = r.id;
    if v_to <> 'abandoned' then
      perform private.subscription_grant_end(r.id, now());
    end if;
    perform private.subscription_log('vallo', r.mode, 'sweep:' || r.id::text || ':' || v_to, 'sweep', r.id,
                                     'applied', r.status, v_to);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function private.subscriptions_sweep() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('vallo_subscriptions_sweep', '9,24,39,54 * * * *', 'select private.subscriptions_sweep();');
  end if;
end;
$$;

-- 13. Read-back. -------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname in ('subscription_provider_plans', 'member_subscriptions', 'subscription_events')
     and c.relrowsecurity;
  if n <> 3 then raise exception 'subscriptions_checkout: RLS on % of 3 tables', n; end if;
  if exists (select 1 from unnest(array['public.subscription_provider_plans', 'public.member_subscriptions',
                                        'public.subscription_events']) t(name)
              cross join unnest(array['insert', 'update', 'delete', 'truncate']) pr(priv)
              where has_table_privilege('authenticated', t.name, pr.priv) or has_table_privilege('anon', t.name, pr.priv)) then
    raise exception 'subscriptions_checkout: a member can write a subscription table';
  end if;
  if has_column_privilege('authenticated', 'public.member_subscriptions', 'provider_email_token', 'select')
     or has_column_privilege('authenticated', 'public.member_subscriptions', 'checkout_email_sha256', 'select') then
    raise exception 'subscriptions_checkout: a member can read the management token or the email hash';
  end if;
  if exists (select 1 from unnest(array[
                'public.subscription_checkout_open(uuid,text,text,text,bigint,text)',
                'public.subscription_provider_plan_record(text,text,text,bigint)',
                'public.subscription_apply_event(text,text,text,jsonb)',
                'public.subscription_mark_cancelled(uuid,uuid)']) f(sig)
              where has_function_privilege('authenticated', f.sig, 'execute') or has_function_privilege('anon', f.sig, 'execute')) then
    raise exception 'subscriptions_checkout: a member can open, apply or cancel a subscription directly';
  end if;
  if has_function_privilege('anon', 'public.subscription_start_trial(text)', 'execute') then
    raise exception 'subscriptions_checkout: anon can start a trial';
  end if;
end $$;
