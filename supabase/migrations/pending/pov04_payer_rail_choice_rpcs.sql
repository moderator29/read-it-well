-- DRAFT, not applied. PAY ON VALLO 4 of 8. Needs pov03.
-- The payer's choice, as members reach it:
--
--   public.payment_rail_options(agreement)  a party reads what may be picked,
--     what is picked, and whether it can still change. Authenticated.
--   public.payment_rail_choose(agreement, 'escrow' | 'card')  the payer sets
--     it. Only the payer (the renter or guest), only while nothing is paid or
--     moving (no settled charge, no card attempt in flight, no live escrow
--     arrangement), only on an open agreement, and only a rail the policy
--     offers: a sale refuses card (sale_escrow_only), a hotel room refuses
--     escrow (card_only). Card on an agreement the system approved is
--     refused while a risk signal fires on the direct rail
--     (card_needs_review): nobody could approve it then, because
--     admin_decide_agreement decides only an agreement in review. Written to
--     audit_log (deal_agreement_events' action list has no word for it).
--   public.payment_rail_for_booking(booking)  the rail a charge opens on, for
--     the app's router (service role), so the app and the database read one
--     answer.
-- Probe: supabase/tests/probes-pending/pov04-payer-rail-choice-rpcs.sql
set lock_timeout = '5s';

/* Why the choice can no longer move, or null while it can. */
create or replace function private.payer_rail_locked(p_agreement uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  ag public.deal_agreements%rowtype;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then
    return 'not_found';
  end if;
  if ag.status not in ('awaiting_parties', 'in_review', 'approved') then
    return 'closed';
  end if;
  if ag.booking_id is not null
     and exists (select 1 from public.transactions t where t.booking_id = ag.booking_id and t.status = 'SUCCESSFUL') then
    return 'already_paid';
  end if;
  if exists (select 1 from public.provider_arrangements pa
              where pa.agreement_id = ag.id and pa.status not in ('failed', 'cancelled')) then
    return 'payment_started';
  end if;
  if ag.booking_id is not null and private.booking_payment_in_flight(ag.booking_id) then
    return 'payment_started';
  end if;
  return null;
end;
$fn$;

create or replace function public.payment_rail_options(p_agreement uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  me uuid := auth.uid();
  role_name text := coalesce(current_setting('role', true), 'none');
  ag public.deal_agreements%rowtype;
  opts text[];
  live_rail text;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null or not (role_name = 'service_role' or me in (ag.renter_id, ag.owner_id)) then
    return jsonb_build_object('status', 'not_found');
  end if;
  opts := private.rail_options_for_agreement(ag.id);
  live_rail := private.rail_for_agreement(ag.id);
  return jsonb_build_object(
    'status', 'ok',
    'options', to_jsonb(opts),
    'default', case when 'escrow' = any (opts) then 'escrow' when 'card' = any (opts) then 'card' end,
    'chosen', ag.payer_rail_choice,
    'rail', case live_rail when 'direct' then 'card' when 'escrow' then 'escrow' end,
    'payer', me is not distinct from ag.renter_id,
    'locked', private.payer_rail_locked(ag.id));
end;
$fn$;

create or replace function public.payment_rail_choose(p_agreement uuid, p_choice text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  me uuid := auth.uid();
  ag public.deal_agreements%rowtype;
  b record;
  opts text[];
  why text;
begin
  if me is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_choice is null or p_choice not in ('escrow', 'card') then
    return jsonb_build_object('status', 'bad_choice');
  end if;
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or me not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if me <> ag.renter_id then
    return jsonb_build_object('status', 'not_payer');
  end if;
  why := private.payer_rail_locked(ag.id);
  if why is not null then
    return jsonb_build_object('status', why, 'agreement_status', ag.status);
  end if;
  b := private.rail_base_for_agreement(ag.id);
  opts := private.rail_options_for_agreement(ag.id);
  if not (p_choice = any (opts)) then
    return jsonb_build_object('status',
      case when b.is_sale then 'sale_escrow_only'
           when opts = array['card'] then 'card_only'
           when opts = array['escrow'] then 'escrow_only'
           else 'no_rail' end);
  end if;
  if ag.payer_rail_choice is not distinct from p_choice then
    return jsonb_build_object('status', 'ok', 'choice', p_choice, 'changed', false);
  end if;
  -- The card rail is reviewed when a risk signal fires (D68d). An agreement
  -- the system already approved cannot be put in front of a person from
  -- here, so card waits until nothing fires; escrow is open meanwhile.
  if p_choice = 'card' and 'escrow' = any (opts) and ag.status = 'approved' and ag.decided_by is null
     and (coalesce((select f.enabled from public.feature_flags f where f.key = 'agreement_review_all'), false)
          or coalesce(array_length(private.agreement_risk_signals(ag.id), 1), 0) > 0) then
    return jsonb_build_object('status', 'card_needs_review');
  end if;
  update public.deal_agreements
     set payer_rail_choice = p_choice, payer_rail_chosen_at = now(), updated_at = now()
   where id = ag.id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'agreement.rail_chosen', 'deal_agreement', ag.id::text,
          jsonb_build_object('choice', p_choice, 'previous', ag.payer_rail_choice,
                             'agreement_status', ag.status, 'amount_minor', ag.amount_minor));
  return jsonb_build_object('status', 'ok', 'choice', p_choice, 'changed', true);
end;
$fn$;

create or replace function public.payment_rail_for_booking(p_booking uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  r record;
  b record;
begin
  r := private.rail_for_booking(p_booking);
  b := private.rail_base_for_booking(p_booking);
  return jsonb_build_object('rail', r.rail, 'policy_id', r.policy_id,
                            'milestones', coalesce((select p.milestones from public.payment_rail_policy p where p.id = r.policy_id), false),
                            'payer_may_choose', coalesce(b.may_choose, false) and not coalesce(b.is_sale, false));
end;
$fn$;

revoke all on function private.payer_rail_locked(uuid) from public, anon, authenticated;
revoke all on function public.payment_rail_options(uuid) from public, anon;
revoke all on function public.payment_rail_choose(uuid, text) from public, anon;
revoke all on function public.payment_rail_for_booking(uuid) from public, anon, authenticated;
grant execute on function public.payment_rail_options(uuid) to authenticated, service_role;
grant execute on function public.payment_rail_choose(uuid, text) to authenticated;
grant execute on function public.payment_rail_for_booking(uuid) to service_role;
