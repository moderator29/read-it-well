-- B3 (Session 2, round 3). TAX SCHEDULE, ENTITLEMENTS, PROMOTION INVENTORY. DRAFT. NOT APPLIED.
-- Depends on: b3_money_policy_versions.sql (private.money_policy_append_only,
-- public.money_policy_at). Apply that first.
--
-- TAX (handoff 7.10, D4). A schedule table with effective dates, never rates
-- in code. Every line Session 2 was asked about is seeded with rate NULL,
-- because NONE has been confirmed by counsel: stamp duty on tenancy
-- agreements, withholding tax on rent to corporate landlords, VAT on Vallo's
-- service fee, capital gains on sale. `public.tax_line_at` returns
-- status 'unconfirmed' for a NULL rate, and the caller shows NO line. A rate
-- is added later as a NEW dated row with its source; nothing here guesses.
-- VAT is additionally governed by money_policy_versions.vat_registered (false):
-- even a confirmed VAT rate is not charged while unregistered (D51).
--
-- ENTITLEMENTS (7.13, D3). Plans with effective dates, feature keys, a check
-- function every gated feature calls, and a default plan ('free') granting
-- everything that is free today. Built now, exercised at zero: no price
-- column exists, and the paid keys are present but granted by no plan.
--
-- PROMOTION (7.13). Separate, clearly labelled inventory in its OWN schema,
-- `promotion`, with no grant to anon or authenticated, so nothing that ranks
-- organic results (lib/listings/ranking.ts, run with member or anon
-- credentials) can read it. The listings.featured=false constraint is NOT
-- lifted here: that waits for the ADR superseding V-06 and the labelled-slot
-- read, in the same change (7.13). No price is seeded.
--
-- Additive, idempotent, RLS on, no member write grant.

begin;

-- ---------------------------------------------------------------- TAX
create table if not exists public.tax_schedule_lines (
  id              bigint generated always as identity primary key,
  tax_kind        text not null check (tax_kind in
                    ('vat_on_vallo_fee', 'stamp_duty_tenancy', 'wht_rent_corporate_landlord', 'cgt_on_sale')),
  effective_from  timestamptz not null,
  effective_to    timestamptz,
  rate_bps        integer check (rate_bps between 0 and 10000),
  borne_by        text not null check (borne_by in ('lister', 'renter', 'vallo', 'undecided')),
  source          text,
  confirmed_by    text,
  note            text not null,
  created_at      timestamptz not null default now(),
  unique (tax_kind, effective_from),
  constraint tax_schedule_lines_window check (effective_to is null or effective_to > effective_from),
  -- A rate exists only with its source and who confirmed it.
  constraint tax_schedule_lines_confirmed check (rate_bps is null or (source is not null and confirmed_by is not null))
);

create or replace trigger tax_schedule_lines_append_only
  before update or delete on public.tax_schedule_lines
  for each row execute function private.money_policy_append_only();

alter table public.tax_schedule_lines enable row level security;
revoke all on public.tax_schedule_lines from anon, authenticated;
grant select on public.tax_schedule_lines to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tax_schedule_lines' and policyname = 'tax_schedule_lines_read') then
    create policy tax_schedule_lines_read on public.tax_schedule_lines for select to anon, authenticated using (true);
  end if;
end $$;

insert into public.tax_schedule_lines (tax_kind, effective_from, rate_bps, borne_by, note)
values
  ('vat_on_vallo_fee', timestamptz '2026-10-06 00:00:00+01', null, 'undecided',
   'Unconfirmed. Applies to Vallo''s fee only, never the rent, and only once Vallo is VAT registered (money_policy_versions.vat_registered). Own ledger line when on.'),
  ('stamp_duty_tenancy', timestamptz '2026-10-06 00:00:00+01', null, 'undecided', 'Unconfirmed by counsel. No line is shown.'),
  ('wht_rent_corporate_landlord', timestamptz '2026-10-06 00:00:00+01', null, 'undecided', 'Unconfirmed by counsel. No line is shown.'),
  ('cgt_on_sale', timestamptz '2026-10-06 00:00:00+01', null, 'undecided', 'Unconfirmed by counsel. No line is shown.')
on conflict (tax_kind, effective_from) do nothing;

create or replace function public.tax_line_at(p_kind text, p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare t public.tax_schedule_lines%rowtype;
begin
  select * into t from public.tax_schedule_lines
   where tax_kind = p_kind and effective_from <= p_at and (effective_to is null or effective_to > p_at)
   order by effective_from desc, id desc limit 1;
  if t.id is null then return jsonb_build_object('status', 'no_schedule'); end if;
  if t.rate_bps is null then return jsonb_build_object('status', 'unconfirmed', 'schedule_line_id', t.id); end if;
  if p_kind = 'vat_on_vallo_fee' and not coalesce((public.money_policy_at(p_at)).vat_registered, false) then
    return jsonb_build_object('status', 'not_registered', 'schedule_line_id', t.id);
  end if;
  return jsonb_build_object('status', 'ok', 'schedule_line_id', t.id, 'rate_bps', t.rate_bps, 'borne_by', t.borne_by);
end;
$$;
revoke all on function public.tax_line_at(text, timestamptz) from public;
grant execute on function public.tax_line_at(text, timestamptz) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- ENTITLEMENTS
create table if not exists public.entitlement_plans (
  id              bigint generated always as identity primary key,
  plan_key        text not null check (plan_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name            text not null,
  is_default      boolean not null default false,
  effective_from  timestamptz not null,
  effective_to    timestamptz,
  note            text,
  created_at      timestamptz not null default now(),
  unique (plan_key, effective_from),
  constraint entitlement_plans_window check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.entitlement_plan_features (
  plan_id      bigint not null references public.entitlement_plans(id),
  feature_key  text not null check (feature_key in (
                 'listing_create', 'listing_analytics', 'saved_search_alerts', 'team_members',
                 'listing_boost', 'listing_spotlight', 'listing_featured', 'listing_prime', 'business_pro')),
  granted      boolean not null,
  quota        integer check (quota >= 0),
  primary key (plan_id, feature_key)
);

create table if not exists public.member_entitlement_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  plan_id         bigint not null references public.entitlement_plans(id),
  effective_from  timestamptz not null default now(),
  effective_to    timestamptz,
  granted_by      uuid,
  reason          text not null,
  created_at      timestamptz not null default now(),
  constraint member_entitlement_plans_window check (effective_to is null or effective_to > effective_from)
);
create index if not exists member_entitlement_plans_user_idx on public.member_entitlement_plans (user_id, effective_from desc);

create or replace trigger entitlement_plans_append_only
  before update or delete on public.entitlement_plans
  for each row execute function private.money_policy_append_only();
create or replace trigger entitlement_plan_features_append_only
  before update or delete on public.entitlement_plan_features
  for each row execute function private.money_policy_append_only();

alter table public.entitlement_plans enable row level security;
alter table public.entitlement_plan_features enable row level security;
alter table public.member_entitlement_plans enable row level security;
revoke all on public.entitlement_plans, public.entitlement_plan_features, public.member_entitlement_plans from anon, authenticated;
grant select on public.entitlement_plans, public.entitlement_plan_features to anon, authenticated;
grant select on public.member_entitlement_plans to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entitlement_plans' and policyname = 'entitlement_plans_read') then
    create policy entitlement_plans_read on public.entitlement_plans for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entitlement_plan_features' and policyname = 'entitlement_plan_features_read') then
    create policy entitlement_plan_features_read on public.entitlement_plan_features for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_entitlement_plans' and policyname = 'member_entitlement_plans_own') then
    create policy member_entitlement_plans_own on public.member_entitlement_plans for select to authenticated
      using (user_id = (select auth.uid()) or private.is_staff());
  end if;
end $$;

insert into public.entitlement_plans (plan_key, name, is_default, effective_from, note)
values ('free', 'Free', true, timestamptz '2026-10-06 00:00:00+01', 'Default plan: everything free today stays free. No price exists.')
on conflict (plan_key, effective_from) do nothing;

insert into public.entitlement_plan_features (plan_id, feature_key, granted)
select p.id, f.key, f.granted
  from public.entitlement_plans p
  cross join (values ('listing_create', true), ('listing_analytics', true), ('saved_search_alerts', true), ('team_members', true),
                     ('listing_boost', false), ('listing_spotlight', false), ('listing_featured', false),
                     ('listing_prime', false), ('business_pro', false)) as f(key, granted)
 where p.plan_key = 'free' and p.effective_from = timestamptz '2026-10-06 00:00:00+01'
on conflict (plan_id, feature_key) do nothing;

-- The check every gated feature calls. A member's own plan in force, else the
-- default plan in force. Unknown feature or no plan: false (fail closed).
create or replace function public.entitlement_check(p_user uuid, p_feature text, p_at timestamptz default now())
returns boolean language sql stable security definer set search_path to '' as $$
  with plan as (
    select coalesce(
      (select m.plan_id from public.member_entitlement_plans m
        where m.user_id = p_user and m.effective_from <= p_at and (m.effective_to is null or m.effective_to > p_at)
        order by m.effective_from desc limit 1),
      (select p.id from public.entitlement_plans p
        where p.is_default and p.effective_from <= p_at and (p.effective_to is null or p.effective_to > p_at)
        order by p.effective_from desc limit 1)) as id)
  select coalesce((select f.granted from public.entitlement_plan_features f, plan
                    where f.plan_id = plan.id and f.feature_key = p_feature), false);
$$;
revoke all on function public.entitlement_check(uuid, text, timestamptz) from public;
grant execute on function public.entitlement_check(uuid, text, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------- PROMOTION
create schema if not exists promotion;
revoke all on schema promotion from public, anon, authenticated;
grant usage on schema promotion to service_role;

create table if not exists promotion.placements (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id),
  tier         text not null check (tier in ('boost', 'spotlight', 'featured', 'prime')),
  -- The label is fixed and always shown: promoted inventory is never unlabelled.
  label        text not null default 'Promoted' check (label = 'Promoted'),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  state        text not null default 'scheduled' check (state in ('scheduled', 'live', 'ended', 'cancelled')),
  bought_by    uuid not null,
  created_at   timestamptz not null default now(),
  constraint placements_window check (ends_at > starts_at)
);

-- Counts only from real events, never estimated (no manufactured numbers).
create table if not exists promotion.placement_metrics (
  placement_id  uuid not null references promotion.placements(id),
  day           date not null,
  impressions   bigint not null default 0 check (impressions >= 0),
  clicks        bigint not null default 0 check (clicks >= 0),
  saves         bigint not null default 0 check (saves >= 0),
  enquiries     bigint not null default 0 check (enquiries >= 0),
  primary key (placement_id, day)
);

alter table promotion.placements enable row level security;
alter table promotion.placement_metrics enable row level security;
revoke all on promotion.placements, promotion.placement_metrics from public, anon, authenticated;
grant select, insert, update on promotion.placements, promotion.placement_metrics to service_role;

-- READ-BACK.
do $$
declare n int;
begin
  select count(*) into n from public.tax_schedule_lines where rate_bps is not null;
  if n <> 0 then raise exception 'b3_tax_entitlements_promotion: % tax lines carry a rate nobody confirmed', n; end if;
  if public.tax_line_at('stamp_duty_tenancy', timestamptz '2026-10-07 00:00:00+01')->>'status' <> 'unconfirmed' then
    raise exception 'b3_tax_entitlements_promotion: an unconfirmed tax line resolved';
  end if;
  if not public.entitlement_check('00000000-0000-4000-8000-000000000000', 'listing_create', timestamptz '2026-10-07 00:00:00+01')
     or public.entitlement_check('00000000-0000-4000-8000-000000000000', 'listing_boost', timestamptz '2026-10-07 00:00:00+01')
     or public.entitlement_check('00000000-0000-4000-8000-000000000000', 'no_such_feature', timestamptz '2026-10-07 00:00:00+01') then
    raise exception 'b3_tax_entitlements_promotion: the default plan does not answer as seeded';
  end if;
  if has_schema_privilege('anon', 'promotion', 'usage') or has_schema_privilege('authenticated', 'promotion', 'usage') then
    raise exception 'b3_tax_entitlements_promotion: members can see the promotion schema';
  end if;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where (s.nspname, c.relname) in (('public', 'tax_schedule_lines'), ('public', 'entitlement_plans'), ('public', 'entitlement_plan_features'),
                                    ('public', 'member_entitlement_plans'), ('promotion', 'placements'), ('promotion', 'placement_metrics'))
     and c.relrowsecurity;
  if n <> 6 then raise exception 'b3_tax_entitlements_promotion: RLS on % of 6 tables', n; end if;
  if has_table_privilege('authenticated', 'public.member_entitlement_plans', 'insert') then
    raise exception 'b3_tax_entitlements_promotion: a member can grant themselves a plan';
  end if;
end $$;

commit;
