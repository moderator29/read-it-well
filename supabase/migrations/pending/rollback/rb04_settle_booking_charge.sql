-- ROLLBACK for pov04's settlement change.
-- The live definition of private.settle_booking_charge, read from the live
-- database (pg_get_functiondef) on 13 October 2026, before pov04 adds the
-- `partner_holds_payment` refund-due reason. Running this restores it as it
-- was. The choice functions pov04 adds stay in place; to stop members using
-- them, run the revoke at the end of this file.
set lock_timeout = '5s';

CREATE OR REPLACE FUNCTION private.settle_booking_charge(p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint DEFAULT NULL::bigint, p_fallback_booking uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

-- Optional: stop members picking a rail while pov04 is rolled back.
revoke execute on function public.payment_rail_choose(uuid, text) from authenticated;
