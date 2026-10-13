-- PENDING, NOT APPLIED. MONEY: a stay's refund terms are the cancellation
-- policy on the rate the guest booked, not the platform schedule.
--
-- WHY. Hosts now pick Flexible, Moderate, Firm or Strict in the wizard, the
-- policy is stored on every rate (`rate_plans.cancellation_policy_id`) and the
-- stay page and checkout print its tiers. But the terms frozen into a stay
-- agreement (`private.stay_agreement_carries_cancellation_terms`, V-20,
-- 20260929000803) are always `platform_cancellation_terms_v1()`: full refund
-- until 72 hours, half after. So the policy a guest is shown is not the one
-- their refund is computed from. This makes the frozen terms the booked
-- rate's policy whenever there is one with readable tiers.
--
-- THE CLOCK. Deadlines count on the Lagos clock from check-in at the
-- property's own stated hour (`accommodations.check_in_from`), 15:00 when it
-- has none, which is the hour the frozen terms already carry.
--
-- WHAT IT CHANGES. One function body, nothing else. The trigger, the table,
-- the freeze on acceptance and the payment backstop are unchanged; terms
-- already frozen are never rewritten (the table refuses updates). A booking
-- with no rate plan (a listing stay), or whose policy has no usable tiers,
-- keeps the platform schedule exactly as today. The source is recorded as
-- `policy:<id>`, which `booking_cancellation_terms_source` already allows.
--
-- REVIEW BEFORE APPLYING: this decides how much of a guest's money comes back.
-- It is written by the setup track and needs the money owner's sign-off.
-- Probe after applying: an agreement for a booking on a Firm rate freezes
-- three tiers (720/10000, 168/5000, 0/0) with source policy:<firm id>, and an
-- agreement for a listing stay still freezes platform_schedule_v1.

create or replace function private.stay_agreement_carries_cancellation_terms()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  policy_id uuid;
  policy_rules jsonb;
  stated_hour int;
  tiers jsonb;
begin
  if new.kind <> 'stay' or (new.terms ? 'cancellation') then
    return new;
  end if;

  if new.booking_id is not null then
    select cp.id, cp.rules, extract(hour from a.check_in_from)::int
      into policy_id, policy_rules, stated_hour
      from public.bookings b
      join public.rate_plans rp on rp.id = b.rate_plan_id
      join public.cancellation_policies cp on cp.id = rp.cancellation_policy_id
      left join public.accommodations a on a.id = b.accommodation_id
     where b.id = new.booking_id;
  end if;

  if policy_id is not null
     and jsonb_typeof(policy_rules) = 'array'
     and jsonb_array_length(policy_rules) > 0
     and not exists (
       select 1 from jsonb_array_elements(policy_rules) r
        where jsonb_typeof(r -> 'hours_before') <> 'number'
           or jsonb_typeof(r -> 'refund_bps') <> 'number'
           or (r ->> 'hours_before')::numeric < 0
           or (r ->> 'refund_bps')::numeric not between 0 and 10000) then
    select jsonb_agg(
             jsonb_build_object('closes_hours_before', (r ->> 'hours_before')::int,
                                'refund_bps', (r ->> 'refund_bps')::int)
             order by (r ->> 'hours_before')::int desc)
      into tiers
      from jsonb_array_elements(policy_rules) r;
    new.terms := new.terms || jsonb_build_object(
      'cancellation', jsonb_build_object('version', 1, 'check_in_hour', coalesce(stated_hour, 15), 'tiers', tiers),
      'cancellation_source', 'policy:' || policy_id::text);
  else
    new.terms := new.terms || jsonb_build_object(
      'cancellation', private.platform_cancellation_terms_v1(),
      'cancellation_source', 'platform_schedule_v1');
  end if;
  return new;
end;
$function$;

revoke all on function private.stay_agreement_carries_cancellation_terms() from public, anon, authenticated;
