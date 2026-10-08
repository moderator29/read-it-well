-- D84: THE FOUNDER'S RULINGS OF 8 OCTOBER 2026 (DIRECTIVES-2026-10-05.md, D83).
-- Base read from the live database on 8 October before writing: the live
-- public.agreement_confirm_as, private.agreement_review_required,
-- private.agreement_risk_signals and private.agreement_tell_both are exactly
-- d68d (20261007154216) and d77 (20261007154344); public.entitlement_plans
-- holds one row, `free`; no `agreement_staff_review` row exists.
--
-- RULING 1. No staff approval before payment, behind a switch, default OFF.
--   `agreement_staff_review` is written as a row, enabled = false, because a
--   missing row reads as ON (fail towards review, like every switch on
--   /admin/switches). The switch governs the step after the second
--   confirmation of the same terms in public.agreement_confirm_as:
--     OFF  the second confirmation approves the agreement (status approved,
--          decided_by null, the event log, the audit row, and the same
--          `agreement.approved` notification and emails a staff approval
--          sends, through private.agreement_tell_both). D68d's resolver
--          still decides first, unchanged: the kill switch, no rail, and a
--          risk signal on the direct rail still go to in_review, because the
--          payment gate (private.agreement_payable, unchanged) would refuse
--          a system-approved agreement on those, and telling both parties
--          "payment is open" there would be untrue. Rulings 2 and 3 tune
--          exactly that direct-rail review, so it stays.
--     ON   every fully confirmed agreement waits for a person (the gate as it
--          was before D68d), reason `staff_review`.
--   `agreement_review_all` (the D68d kill switch, off) keeps its meaning: on,
--   everything goes to review and nothing a person has not approved is
--   payable. Agreements already in review are not touched: no row moves.
--
-- RULING 2. The first-deal signal is scoped: a first deal AND (an unverified
--   business OR an amount over the threshold). Already live since d77
--   (private.agreement_risk_signals + private.lister_business_verified, read
--   back on 8 October). Nothing to change; the probe holds it.
--
-- RULING 3. The direct-rail threshold is 500,000 naira (50,000,000 minor).
--   Already live since d77: agreement_risk_settings.amount_threshold_minor =
--   50000000, column default 50000000, updated_by null. Nothing to change.
--
-- RULING 4. The lister pays Payluk's escrow fee: whoPays `seller`
--   (provider_arrangements.who_pays_fee check, LISTER_BEARS_THE_FEE in
--   lib/money/provider-arrangements.ts, the Paystack split's bearer
--   subaccount on the direct rail). Nothing to change.
--
-- RULING 5. Vallo Pro (9,500 naira a month) and Vallo Business (35,000 naira
--   a month) as plan rows with grants of the existing feature keys, a monthly
--   price on the plan row, and a trial whose length is CONFIGURATION:
--   public.subscription_settings.trial_days. The founder asked for 2 days,
--   was advised 7, and decided 4 on 8 October; it is seeded as 4. A later
--   change is one statement, never code:
--     update public.subscription_settings set trial_days = 4, updated_at = now() where id = 1;
--   No checkout, no billing and no trial start exist yet: nothing here takes
--   money or grants a plan to anybody. entitlement_plans stays append-only.
--
-- Additive and idempotent: create or replace, add column if not exists,
-- insert ... on conflict. No drop, no delete.

set local lock_timeout = '10s';

-- 1. The switch. -----------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('agreement_staff_review', false,
        'D84: a Vallo person approves every agreement after both parties confirm, before payment opens. Off by the founder''s ruling of 8 October: the second confirmation approves it. The direct-rail risk review (D68d) and the incident switch agreement_review_all still apply. A missing row reads as on.')
on conflict (key) do nothing;

-- On unless the row exists and says off (a missing row reads as on).
create or replace function private.agreement_staff_review_on()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'agreement_staff_review'), true);
$$;
revoke all on function private.agreement_staff_review_on() from public, anon, authenticated;

-- 2. The second confirmation. Copied from the live definition (d68d); the
-- decision after both confirmations asks the switch as well. ----------------------
create or replace function public.agreement_confirm_as(p_actor uuid, p_agreement uuid, p_version integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  mandate uuid;
  has_mandates boolean;
  before_status public.agreement_status;
  rv jsonb;
  why text;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status <> 'awaiting_parties' then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if p_version is distinct from ag.terms_version then
    return jsonb_build_object('status', 'terms_changed', 'terms_version', ag.terms_version);
  end if;
  if p_actor = ag.renter_id then
    update public.deal_agreements
       set renter_confirmed_version = ag.terms_version, renter_confirmed_at = now(), updated_at = now()
     where id = ag.id returning * into ag;
  else
    select exists (select 1 from public.listing_mandates m where m.listing_id = ag.listing_id) into has_mandates;
    if has_mandates then
      select m.id into mandate from public.listing_mandates m
       where m.listing_id = ag.listing_id
         and m.review_status = 'approved'
         and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
         and m.principal_consent_withdrawn_at is null
       order by m.reviewed_at desc nulls last limit 1;
      if mandate is null then
        return jsonb_build_object('status', 'mandate_not_live');
      end if;
    end if;
    update public.deal_agreements
       set owner_confirmed_version = ag.terms_version, owner_confirmed_at = now(),
           mandate_id = mandate, updated_at = now()
     where id = ag.id returning * into ag;
  end if;
  perform private.agreement_log(ag, p_actor, 'confirmed', ag.status, null);
  if ag.renter_confirmed_version = ag.terms_version and ag.owner_confirmed_version = ag.terms_version then
    before_status := ag.status;
    -- D68d's resolver first (kill switch, no rail, a direct-rail risk signal),
    -- then D84's switch: on, a person approves every agreement.
    rv := private.agreement_review_required(ag.id);
    if not (rv ->> 'required')::boolean and private.agreement_staff_review_on() then
      rv := jsonb_build_object('required', true, 'rail', rv -> 'rail', 'reasons', jsonb_build_array('staff_review'));
    end if;
    if not (rv ->> 'required')::boolean then
      -- D84: the second confirmation of the same terms approves the agreement.
      why := format('No review needed: %s rail, no risk signal.', rv ->> 'rail');
      update public.deal_agreements
         set status = 'approved', submitted_at = now(), decided_at = now(), decided_by = null,
             decision_reason = why, updated_at = now()
       where id = ag.id returning * into ag;
      perform private.agreement_log(ag, null, 'approved', before_status, why);
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'agreement.approve', 'deal_agreement', ag.id::text,
              jsonb_build_object('reason', why, 'decided_by', 'system', 'rail', rv ->> 'rail',
                                 'staff_review', false,
                                 'terms_version', ag.terms_version, 'amount_minor', ag.amount_minor, 'kind', ag.kind));
      -- The same notification and `agreement.approved` emails a staff approval sends.
      perform private.agreement_tell_both(ag, 'agreement.approved');
    else
      update public.deal_agreements set status = 'in_review', submitted_at = now(), updated_at = now()
       where id = ag.id returning * into ag;
      perform private.agreement_log(ag, null, 'submitted', before_status,
        'Both parties confirmed. Waiting for Vallo review: ' ||
        coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(rv -> 'reasons') x), 'review') || '.');
    end if;
  end if;
  return jsonb_build_object('status', 'ok', 'agreement_status', ag.status,
                            'review', case when ag.status = 'in_review' then rv -> 'reasons' else '[]'::jsonb end);
end;
$function$;

-- 3. Pro and Business. ----------------------------------------------------------
-- The plan row carries its monthly price and the list of what the plan
-- includes beyond its promotion quotas (`perks`, the app words each one; an
-- unknown one is never drawn). Team members is a feature key every plan
-- grants today and is listed as a perk because the founder named it for
-- Business. The free plan keeps a null price and no perks.
alter table public.entitlement_plans
  add column if not exists price_minor bigint check (price_minor is null or price_minor > 0),
  add column if not exists billing_interval text check (billing_interval is null or billing_interval = 'month'),
  add column if not exists perks text[] not null default '{}'::text[]
    check (perks <@ array['deep_analytics', 'pro_badge', 'priority_support',
                          'team_members', 'command_centre', 'bulk_tools', 'export']::text[]);

insert into public.entitlement_plans (plan_key, name, is_default, effective_from, note, price_minor, billing_interval, perks)
values
  ('pro', 'Vallo Pro', false, timestamptz '2026-10-08 00:00:00+01',
   'D84: for an individual agent or landlord. 9,500 naira a month. 4 Boosts a month (quota per billing month), deep analytics, pro badge, priority support. Not on sale until a subscription checkout exists.',
   950000, 'month', array['deep_analytics', 'pro_badge', 'priority_support']),
  ('business', 'Vallo Business', false, timestamptz '2026-10-08 00:00:00+01',
   'D84: the top plan, for an agency, hotel or serviced apartments. 35,000 naira a month. 2 Spotlights and 1 Featured a month (quota per billing month), team members, command centre, bulk tools, export. Not on sale until a subscription checkout exists.',
   3500000, 'month', array['team_members', 'command_centre', 'bulk_tools', 'export'])
on conflict (plan_key, effective_from) do nothing;

-- Everything free stays granted on a paid plan; the promotion keys carry the
-- monthly quota the founder set.
insert into public.entitlement_plan_features (plan_id, feature_key, granted, quota)
select p.id, f.key, f.granted, f.quota
  from public.entitlement_plans p
  join (values
    ('pro', 'listing_create', true, null::integer), ('pro', 'listing_analytics', true, null), ('pro', 'saved_search_alerts', true, null),
    ('pro', 'team_members', true, null), ('pro', 'listing_boost', true, 4), ('pro', 'listing_spotlight', false, null),
    ('pro', 'listing_featured', false, null), ('pro', 'listing_prime', false, null), ('pro', 'business_pro', false, null),
    ('business', 'listing_create', true, null), ('business', 'listing_analytics', true, null), ('business', 'saved_search_alerts', true, null),
    ('business', 'team_members', true, null), ('business', 'listing_boost', false, null), ('business', 'listing_spotlight', true, 2),
    ('business', 'listing_featured', true, 1), ('business', 'listing_prime', false, null), ('business', 'business_pro', true, null)
  ) as f(plan_key, key, granted, quota) on f.plan_key = p.plan_key
 where p.effective_from = timestamptz '2026-10-08 00:00:00+01'
on conflict (plan_id, feature_key) do nothing;

-- The trial length: one settings row, read by anyone (the plans page says it),
-- written only by the service role (staff through SQL today).
create table if not exists public.subscription_settings (
  id smallint primary key default 1 check (id = 1),
  trial_days smallint not null default 4 check (trial_days between 0 and 60),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  note text
);
alter table public.subscription_settings enable row level security;
revoke all on public.subscription_settings from public, anon, authenticated;
grant select on public.subscription_settings to anon, authenticated;
grant select, insert, update on public.subscription_settings to service_role;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_settings'
                   and policyname = 'subscription_settings_read') then
    create policy subscription_settings_read on public.subscription_settings for select to anon, authenticated using (true);
  end if;
end $$;
insert into public.subscription_settings (id, trial_days, note)
values (1, 4, 'D84: the free trial on Vallo Pro and Vallo Business, in days. The founder decided 4 on 8 October (he had asked for 2 and was advised 7). A change is a value here, not a code change.')
on conflict (id) do nothing;
