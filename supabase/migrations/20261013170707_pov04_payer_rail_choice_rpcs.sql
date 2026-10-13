-- Applied 13 October 2026. PAY ON VALLO 4 of 8. Needs pov03.
-- The payer's choice, as members reach it, and one payment per deal:
--
--   public.payment_rail_options(agreement)  a party reads what may be picked,
--     what is picked, and whether it can still change. Authenticated.
--   public.payment_rail_choose(agreement, 'escrow' | 'card')  the payer sets
--     it. Only the payer (the renter or guest), only on an open agreement,
--     only a rail the policy offers (a sale refuses card: sale_escrow_only;
--     a hotel room refuses escrow: card_only), and only while nothing is
--     paid or moving: no settled charge, NO card attempt row still PENDING
--     for the booking or the agreement (whatever its age), and no escrow
--     arrangement that is not failed, cancelled or refunded. Written to
--     audit_log (deal_agreement_events has no word for it).
--     The gate follows the rail (D68d). Card on an agreement the system
--     approved is re-read by the gate: when a person must now look, the
--     agreement goes to in_review (admin_decide_agreement decides it), the
--     answer says so, and the payer can go back to escrow, which needs no
--     review and is approved by the system again. No choice is a dead end.
--   public.payment_rail_for_booking(booking)  the rail a charge opens on, for
--     the app's router (service role), so the app and the database read one
--     answer.
--   private.settle_booking_charge (live definition saved in
--     pending/rollback/rb04): a card charge on a booking whose money the
--     partner already holds, or is taking, is never settled. It becomes
--     refund-due with reason partner_holds_payment (the card is refunded in
--     full, as for every refund-due charge), so a deal is never paid twice.
-- Probe: supabase/tests/probes-pending/pov04-payer-rail-choice-rpcs.sql
set lock_timeout = '5s';

/* Whether the partner holds, or may be taking, this booking's money: any
   arrangement that is not failed, cancelled or refunded. Named for what it
   reads; the custody guard refuses a name with the provider's product in it. */
create or replace function private.booking_partner_payment_live(p_booking uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select exists (
    select 1 from public.provider_arrangements pa
      join public.deal_agreements a on a.id = pa.agreement_id
     where a.booking_id = p_booking
       and pa.status not in ('failed', 'cancelled', 'refunded'));
$fn$;

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
  if exists (select 1 from public.transactions t
              where t.status = 'SUCCESSFUL'
                and (t.agreement_id = ag.id or (ag.booking_id is not null and t.booking_id = ag.booking_id))) then
    return 'already_paid';
  end if;
  -- Any card attempt still PENDING, however old: a charge that completes on
  -- it must land on the rail it was opened on.
  if exists (select 1 from public.transactions t
              where t.status = 'PENDING'
                and (t.agreement_id = ag.id or (ag.booking_id is not null and t.booking_id = ag.booking_id))) then
    return 'payment_started';
  end if;
  if exists (select 1 from public.provider_arrangements pa
              where pa.agreement_id = ag.id and pa.status not in ('failed', 'cancelled', 'refunded')) then
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
    'locked', private.payer_rail_locked(ag.id),
    'agreement_status', ag.status);
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
  rv jsonb;
  before_status public.agreement_status;
  review boolean := false;
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
    return jsonb_build_object('status', 'ok', 'choice', p_choice, 'changed', false,
                              'agreement_status', ag.status);
  end if;
  update public.deal_agreements
     set payer_rail_choice = p_choice, payer_rail_chosen_at = now(), updated_at = now()
   where id = ag.id
  returning * into ag;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'agreement.rail_chosen', 'deal_agreement', ag.id::text,
          jsonb_build_object('choice', p_choice, 'agreement_status', ag.status, 'amount_minor', ag.amount_minor));

  -- D68d: the rail decides the gate, so a new rail is read by the gate again.
  if ag.status = 'approved' and ag.decided_by is null then
    rv := private.agreement_review_required(ag.id);
    if (rv ->> 'required')::boolean then
      -- A person must look before this rail is paid: in front of the desk,
      -- never a dead end (the payer can still go back to escrow).
      before_status := ag.status;
      update public.deal_agreements
         set status = 'in_review', submitted_at = now(), decided_at = null,
             decision_reason = null, updated_at = now()
       where id = ag.id
      returning * into ag;
      perform private.agreement_log(ag, me, 'submitted', before_status,
        'The payer chose ' || case p_choice when 'card' then 'card' else 'escrow' end
        || '. Waiting for Vallo review: '
        || coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(rv -> 'reasons') x), 'review') || '.');
      review := true;
    end if;
  elsif ag.status = 'in_review'
        and ag.renter_confirmed_version = ag.terms_version
        and ag.owner_confirmed_version = ag.terms_version then
    rv := private.agreement_review_required(ag.id);
    if not (rv ->> 'required')::boolean then
      -- The same step as agreement_confirm_as: nothing asks for a person on
      -- this rail, so the system approves it.
      before_status := ag.status;
      update public.deal_agreements
         set status = 'approved', decided_at = now(), decided_by = null,
             decision_reason = format('No review needed: %s rail, no risk signal.', rv ->> 'rail'), updated_at = now()
       where id = ag.id
      returning * into ag;
      perform private.agreement_log(ag, null, 'approved', before_status,
        format('No review needed: %s rail, no risk signal.', rv ->> 'rail'));
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'agreement.approve', 'deal_agreement', ag.id::text,
              jsonb_build_object('reason', 'payer chose a rail that needs no review', 'decided_by', 'system',
                                 'rail', rv ->> 'rail', 'terms_version', ag.terms_version,
                                 'amount_minor', ag.amount_minor, 'kind', ag.kind));
    end if;
  end if;
  return jsonb_build_object('status', 'ok', 'choice', p_choice, 'changed', true,
                            'agreement_status', ag.status, 'review', review);
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

/* Settlement: the live definition with one more refund-due reason,
   partner_holds_payment, checked before already_paid. */
create or replace function private.settle_booking_charge(p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint DEFAULT NULL::bigint, p_fallback_booking uuid DEFAULT NULL::uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  tx          public.transactions%rowtype;
  bk          public.bookings%rowtype;
  ag          public.deal_agreements%rowtype;
  rp          public.rent_payments%rowtype;
  gross       bigint;
  fee         bigint;
  reason      text;
  was_pending boolean;
  is_rent     boolean;
  is_share    boolean;
  paid_before bigint;
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_reference is null or length(btrim(p_reference)) = 0 then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  select * into tx from public.transactions where provider_ref = p_reference;
  if tx.id is null then
    if p_fallback_booking is null
       or not exists (select 1 from public.bookings where id = p_fallback_booking) then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    perform set_config('vallo.recording_unknown_charge', '', true);
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;
  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;
  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', tx.status);
  end if;
  -- Audit fix: a charge already found refund-due is not refunded again on a
  -- replay (webhook, return page, sweep). The refund-due audit row is the record.
  if tx.status = 'FAILED' and exists (
       select 1 from public.audit_log a
        where a.action = 'booking.charge_refund_due' and a.entity_type = 'booking'
          and a.entity_id = bk.id::text and a.metadata ->> 'reference' = p_reference) then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', 'REFUND_DUE');
  end if;
  select * into ag from public.deal_agreements where id = tx.agreement_id for update;
  is_rent := exists (select 1 from public.rent_payments r where r.booking_id = bk.id);
  if is_rent then
    perform 1 from public.listings where id = bk.listing_id for update;
    select * into rp from public.rent_payments where booking_id = bk.id;
  end if;
  is_share := tx.share_payer_id is not null;
  select coalesce(sum(t.amount_minor), 0) into paid_before
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id;
  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;
  reason := case
    when tx.lister_share_minor is null or ag.id is null then 'no_split'
    when ag.status <> 'approved' then 'agreement_' || ag.status::text
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    -- Pay on Vallo (pov04): the partner already holds, or is taking, this
    -- booking's money, so this card charge would pay the deal twice.
    when private.booking_partner_payment_live(bk.id)
         or exists (select 1 from public.provider_arrangements pa
                     where pa.agreement_id = ag.id and pa.status not in ('failed', 'cancelled', 'refunded'))
      then 'partner_holds_payment'
    when not is_share and exists (select 1 from public.transactions t
                                   where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id) then 'already_paid'
    when is_share and rp.id is null then 'no_split'
    when is_share and exists (select 1 from public.transactions t
                               where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id
                                 and (t.share_payer_id is null or t.share_payer_id = tx.share_payer_id)) then 'already_paid'
    when is_share and paid_before + tx.amount_minor > rp.total_minor then 'over_total'
    when is_rent and private.listing_is_let(bk.listing_id, bk.id) then 'already_let'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    when gross <> tx.amount_minor then 'amount_mismatch'
    else null
  end;
  if reason is not null then
    update public.transactions set status = 'FAILED', updated_at = now() where id = tx.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A card payment could not be applied and must be refunded to the card',
            format('Reference %s took %s kobo for booking %s (status %s) and could not be applied (%s). '
                   || 'Refund the full amount to the card through Paystack.',
                   p_reference, gross, bk.id, bk.status, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_refund_due', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross, 'reason', reason,
                               'share_payer_id', tx.share_payer_id));
    return jsonb_build_object('outcome', 'refund-due', 'booking_id', bk.id, 'reason', reason,
                              'amount_minor', gross, 'reference', p_reference);
  end if;
  update public.transactions set status = 'SUCCESSFUL', updated_at = now() where id = tx.id;
  fee := least(tx.lister_share_minor, greatest(0, coalesce(p_processor_fee_minor, 0)));
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor,
     processor_fee_minor, guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, tx.commission_minor, tx.lister_share_minor - fee, fee, tx.guarantee_minor,
          tx.lister_share_minor - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;
  if tx.guarantee_minor > 0 then
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, transaction_id, note)
    values ('in', 'contribution', tx.guarantee_minor, bk.id, tx.id, 'Guarantee contribution settled with the charge')
    on conflict (transaction_id) do nothing;
  end if;
  -- V-86: a share that leaves the move-in short. It settled to the lister;
  -- the charge, the agreement and the booking wait for the rest.
  if is_share and paid_before + gross < rp.total_minor then
    begin
      perform private.notify(rp.tenant_id, 'booking'::public.notification_kind, 'A share of the move-in was paid',
        'Your tenancy file shows every share and what is still to pay.', '/tenancy/' || rp.id::text);
    exception when others then
      null;
    end;
    return jsonb_build_object(
      'outcome', 'share-settled', 'booking_id', bk.id, 'amount_minor', gross,
      'paid_minor', paid_before + gross, 'total_minor', rp.total_minor, 'share_payer_id', tx.share_payer_id,
      'ledger', jsonb_build_object(
        'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
        'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
  end if;
  update public.deal_agreements set status = 'paid', paid_at = now(), updated_at = now() where id = ag.id
  returning * into ag;
  perform private.agreement_log(ag, null, 'paid', 'approved',
    case when is_share then 'Paid in shares. The last share completed the move-in; each share settled to the lister and the Guarantee as it was paid.'
         else 'Paid. The lister''s share and the Guarantee settled with the charge.' end);
  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the booking is confirmed.');
    if bk.listing_id is not null then
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
    end if;
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;
  return jsonb_build_object(
    'outcome', 'settled', 'booking_id', bk.id, 'confirmed', was_pending, 'amount_minor', gross,
    'total_minor', coalesce(rp.total_minor, gross),
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
      'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
end;
$fn$;

revoke all on function private.booking_partner_payment_live(uuid) from public, anon, authenticated;
revoke all on function private.payer_rail_locked(uuid) from public, anon, authenticated;
revoke all on function private.settle_booking_charge(text, bigint, bigint, uuid) from public, anon, authenticated;
revoke all on function public.payment_rail_options(uuid) from public, anon;
revoke all on function public.payment_rail_choose(uuid, text) from public, anon;
revoke all on function public.payment_rail_for_booking(uuid) from public, anon, authenticated;
grant execute on function public.payment_rail_options(uuid) to authenticated, service_role;
grant execute on function public.payment_rail_choose(uuid, text) to authenticated;
grant execute on function public.payment_rail_for_booking(uuid) to service_role;
