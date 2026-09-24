-- SUP-09: one home is let to one tenant.
--
-- A move-in charge held the calendar for its move-in day only, so two tenants
-- with accepted inspections and different move-in days could each open a
-- charge and each pay the full move-in total for the same home.
--
-- private.listing_is_let answers whether another tenancy holds the home: a
-- rent charge on the listing that is paid, not cancelled, not refunded in
-- full, and still inside its term (move-in plus one rent period). A home whose
-- tenancy ended, was cancelled or was refunded can be let again. Each door
-- that takes rent asks it under a lock on the listing row, so two payments
-- cannot both pass:
--   * private.open_rent_charge refuses a new charge ('already_let');
--   * private.pay_booking_from_wallet refuses before it debits anything
--     ('already_let');
--   * private.settle_booking_charge returns a card payment to the payer's
--     wallet with reason 'already_let', as it does for any payment that
--     cannot be applied, and raises the same alert.
-- The listing lock is taken after the locks each function already takes
-- (wallet, booking, attempt), so the lock order is unchanged. Whether a let
-- home is also taken off the catalogue is a founder decision (SUP-09 item 3).

create or replace function private.listing_is_let(p_listing uuid, p_except_booking uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- A tenancy holds the home while it is paid, not cancelled, not refunded in
  -- full, and inside its term (move-in plus one rent period, in Lagos days).
  select exists (
    select 1
      from public.rent_payments rp
      join public.bookings b on b.id = rp.booking_id
     where rp.listing_id = p_listing
       and rp.booking_id is distinct from p_except_booking
       and b.status <> 'CANCELLED'
       and exists (select 1 from public.transactions t
                    where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL')
       and coalesce((select sum(br.refund_minor) from public.booking_refunds br
                      where br.booking_id = rp.booking_id), 0) < rp.total_minor
       and (rp.move_in + case rp.rent_period::text
                           when 'month' then interval '1 month'
                           when 'quarter' then interval '3 months'
                           else interval '1 year'
                         end)::date > (now() at time zone 'Africa/Lagos')::date
  );
$$;
revoke all on function private.listing_is_let(uuid, uuid) from public, anon, authenticated;
grant execute on function private.listing_is_let(uuid, uuid) to service_role;

CREATE OR REPLACE FUNCTION private.open_rent_charge(p_tenant uuid, p_inspection uuid, p_move_in date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  insp        public.inspection_requests%rowtype;
  lst         public.listings%rowtype;
  lister_user uuid;
  existing    public.rent_payments%rowtype;
  existing_bk public.bookings%rowtype;
  parts_sum   bigint;
  total       bigint;
  stated      boolean;
  v_booking   uuid;
  charge_id   uuid;
begin
  if p_tenant is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'move_in_past');
  end if;
  select * into insp from public.inspection_requests where id = p_inspection;
  if insp.id is null or insp.requester_id <> p_tenant then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not (insp.state = 'CONFIRMED'
          or (insp.state = 'COMPLETED' and coalesce(insp.outcome, 'inspected') <> 'no_deal')) then
    return jsonb_build_object('status', 'not_accepted', 'state', insp.state);
  end if;
  select * into lst from public.listings where id = insp.listing_id;
  if lst.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if lst.status <> 'PUBLISHED' then
    return jsonb_build_object('status', 'not_published');
  end if;
  if lst.listing_intent <> 'rent' or lst.rent_amount_minor is null then
    return jsonb_build_object('status', 'not_a_rental');
  end if;
  select a.user_id into lister_user from public.agents a where a.id = lst.agent_id;
  if lister_user is null then
    return jsonb_build_object('status', 'no_lister');
  end if;
  if lister_user = p_tenant then
    return jsonb_build_object('status', 'own_listing');
  end if;
  parts_sum := coalesce(lst.rent_amount_minor, 0)
             + coalesce(lst.caution_deposit_minor, 0)
             + coalesce(lst.service_charge_minor, 0)
             + coalesce(lst.agency_fee_minor, 0)
             + coalesce(lst.legal_fee_minor, 0)
             + coalesce(lst.agreement_fee_minor, 0);
  if lst.total_move_in_cost_minor is not null then
    total  := lst.total_move_in_cost_minor;
    stated := true;
  else
    total  := parts_sum;
    stated := false;
  end if;
  if total <= 0 then
    return jsonb_build_object('status', 'no_amount');
  end if;
  select * into existing from public.rent_payments where inspection_id = p_inspection;
  if existing.id is not null then
    select * into existing_bk from public.bookings where id = existing.booking_id;
    if existing_bk.status <> 'CANCELLED'
       or exists (select 1 from public.transactions t where t.booking_id = existing_bk.id and t.status = 'SUCCESSFUL') then
      return jsonb_build_object(
        'status', 'exists',
        'rent_payment_id', existing.id,
        'booking_id', existing.booking_id,
        'total_minor', existing.total_minor
      );
    end if;
  end if;
  -- SUP-09. Once a move-in total on this home is paid, no other charge opens.
  perform 1 from public.listings where id = lst.id for update;
  if private.listing_is_let(lst.id, null) then
    return jsonb_build_object('status', 'already_let');
  end if;
  perform set_config('vallo.rent_charge', 'true', true);
  /* ESC-03. A stay held on the move-in date makes this insert collide with
     the calendar; say so rather than failing as "could not be opened". */
  begin
    insert into public.bookings (
      listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor,
      subtotal_minor, total_minor, currency, status
    ) values (
      lst.id, p_tenant, p_move_in, p_move_in + 1, 1, 1, 0,
      total, 0, 0, total, total, 'NGN', 'PENDING'
    )
    returning id into v_booking;
  exception when exclusion_violation then
    perform set_config('vallo.rent_charge', '', true);
    return jsonb_build_object('status', 'date_taken');
  end;
  perform set_config('vallo.rent_charge', '', true);
  if existing.id is not null then
    update public.rent_payments
       set booking_id = v_booking, move_in = p_move_in,
           rent_minor = lst.rent_amount_minor, caution_minor = lst.caution_deposit_minor,
           service_minor = lst.service_charge_minor, agency_minor = lst.agency_fee_minor,
           legal_minor = lst.legal_fee_minor, agreement_minor = lst.agreement_fee_minor,
           total_minor = total, total_stated = stated,
           rent_period = coalesce(lst.rent_period, 'year')
     where id = existing.id;
    charge_id := existing.id;
  else
    insert into public.rent_payments (
      inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, rent_period,
      rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
      total_minor, total_stated
    ) values (
      insp.id, lst.id, p_tenant, lister_user, v_booking, p_move_in, coalesce(lst.rent_period, 'year'),
      lst.rent_amount_minor, lst.caution_deposit_minor, lst.service_charge_minor,
      lst.agency_fee_minor, lst.legal_fee_minor, lst.agreement_fee_minor,
      total, stated
    )
    returning id into charge_id;
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'rent_payment_id', charge_id,
    'booking_id', v_booking,
    'total_minor', total
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.pay_booking_from_wallet(payer uuid, target_booking uuid, payment_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  payer_wallet   uuid;
  booking_row    public.bookings;
  settled        bigint;
  held           bigint;
  spendable      bigint;
  attempt_id     uuid;
  was_pending    boolean;
begin
  if payer is null or target_booking is null
     or payment_reference is null or length(payment_reference) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;

  insert into public.wallets (user_id) values (payer)
    on conflict (user_id) do nothing;

  select id into payer_wallet from public.wallets
   where user_id = payer for update;

  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  select * into booking_row from public.bookings
   where id = target_booking and guest_id = payer
   for update;

  if booking_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Payable means PENDING (nobody has confirmed it yet) or CONFIRMED (the host
  -- accepted it and it is still owed). Anything else, which today means
  -- CANCELLED, is refused in its own words.
  if booking_row.status not in ('PENDING', 'CONFIRMED') then
    return jsonb_build_object('status', 'not_payable', 'booking_status', booking_row.status);
  end if;
  was_pending := booking_row.status = 'PENDING';

  if booking_row.currency <> 'NGN' then
    return jsonb_build_object('status', 'not_naira');
  end if;
  if booking_row.total_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  -- The real "already paid" test, and now the only one.
  if exists (
    select 1 from public.transactions t
     where t.booking_id = booking_row.id and t.status = 'SUCCESSFUL'
  ) then
    return jsonb_build_object('status', 'already_paid');
  end if;

  -- SUP-09. A move-in charge on a home already paid for by another tenant is
  -- refused before anything is debited.
  if exists (select 1 from public.rent_payments rp where rp.booking_id = booking_row.id) then
    perform 1 from public.listings where id = booking_row.listing_id for update;
    if private.listing_is_let(booking_row.listing_id, booking_row.id) then
      return jsonb_build_object('status', 'already_let');
    end if;
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
if spendable < booking_row.total_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', booking_row.total_minor
    );
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'payment', 'debit', booking_row.total_minor, payment_reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Payment for a Vallo stay',
         'booking_id', booking_row.id,
         'listing_id', booking_row.listing_id,
         'check_in', booking_row.check_in,
         'check_out', booking_row.check_out
       ));

    insert into public.transactions
      (booking_id, provider, provider_ref, amount_minor, currency, status)
    values
      (booking_row.id, 'wallet', payment_reference, booking_row.total_minor,
       booking_row.currency, 'SUCCESSFUL')
    returning id into attempt_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values
    (booking_row.id, attempt_id, booking_row.total_minor, 0,
     booking_row.total_minor, 0, booking_row.total_minor);

  if was_pending then
    update public.bookings set status = 'CONFIRMED'
     where id = booking_row.id and status = 'PENDING';

    if not found then
      raise exception 'booking % could not be confirmed after payment', booking_row.id;
    end if;

    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (booking_row.id, 'PENDING', 'CONFIRMED', payer,
            'Paid in full from the guest wallet, so the stay is confirmed.');
  else
    -- The host already confirmed this stay. Payment does not change its status,
    -- it settles it, and the history says exactly that.
    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (booking_row.id, 'CONFIRMED', 'CONFIRMED', payer,
            'Paid in full from the guest wallet. The host had already accepted this stay.');
  end if;

  -- Idempotent either way: confirming already closed these nights, and a host
  -- acceptance closes them too, so this is a no-op in the CONFIRMED case.
  insert into public.availability (listing_id, date, status)
  select booking_row.listing_id, d::date, 'booked'
    from generate_series(booking_row.check_in::timestamp,
                         (booking_row.check_out - 1)::timestamp,
                         interval '1 day') as d
  on conflict (listing_id, date) do update set status = 'booked';

  return jsonb_build_object(
    'status', 'ok',
    'amount_minor', booking_row.total_minor,
    'reference', payment_reference,
    'transaction_id', attempt_id,
    'booking_id', booking_row.id,
    'confirmed_by_this_payment', was_pending
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.settle_booking_charge(p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint DEFAULT NULL::bigint, p_fallback_booking uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  tx           public.transactions%rowtype;
  bk           public.bookings%rowtype;
  guest        uuid;
  guest_wallet uuid;
  gross        bigint;
  fee          bigint;
  reason       text;
  was_pending  boolean;
  is_rent      boolean;
  lagos_today  date := (now() at time zone 'Africa/Lagos')::date;
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
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;

  -- Lock order: the guest's wallet, then the booking, then the attempt.
  select b.guest_id into guest from public.bookings b where b.id = tx.booking_id;
  insert into public.wallets (user_id) values (guest) on conflict (user_id) do nothing;
  select w.id into guest_wallet from public.wallets w where w.user_id = guest for update;
  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;

  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id,
                              'transaction_status', tx.status);
  end if;

  -- SUP-09. A move-in charge takes the listing's lock last, so two tenants'
  -- payments for the same home are decided one after the other.
  is_rent := exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id);
  if is_rent then
    perform 1 from public.listings where id = bk.listing_id for update;
  end if;

  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;

  reason := case
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    when exists (select 1 from public.transactions t
                  where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id)
      then 'already_paid'
    when is_rent and private.listing_is_let(bk.listing_id, bk.id) then 'already_let'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    -- The amount must be the booking's price. If the Paystack account is ever
    -- set to pass its fee to the customer, the charge is price + fee, which
    -- is accepted too (and the fee is then not taken from the lister's share).
    when gross <> bk.total_minor
         and gross - greatest(0, coalesce(p_processor_fee_minor, 0)) <> bk.total_minor
      then 'amount_mismatch'
    else null
  end;

  if reason is not null then
    update public.transactions set status = 'REFUNDED' where id = tx.id;
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (guest_wallet, 'refund', 'credit', gross, 'charge-returned:' || p_reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Returned to your wallet: this payment could not be applied to the booking',
         'booking_id', bk.id,
         'listing_id', bk.listing_id,
         'payment_reference', p_reference,
         'reason', reason,
         'booking_total_minor', bk.total_minor
       ))
    on conflict (reference) do nothing;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open',
            'A card payment was returned to the guest''s wallet',
            format('Reference %s took %s kobo for booking %s (status %s, total %s kobo) and could not be applied (%s). '
                   || 'The whole amount is in the guest''s Vallo wallet; the processor''s fee was not recovered.',
                   p_reference, gross, bk.id, bk.status, bk.total_minor, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_returned_to_wallet', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross,
                               'reason', reason, 'booking_status', bk.status));
    return jsonb_build_object('outcome', 'returned-to-wallet', 'booking_id', bk.id,
                              'reason', reason, 'amount_minor', gross);
  end if;

  update public.transactions set status = 'SUCCESSFUL' where id = tx.id;

  fee := least(gross, greatest(0, coalesce(p_processor_fee_minor, 0)));
  -- A customer-borne fee: the booking's price is what settles to the lister.
  if gross <> bk.total_minor and gross - fee = bk.total_minor then
    gross := bk.total_minor;
    fee := 0;
  end if;
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, 0, gross - fee, fee, gross - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;

  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the stay is confirmed.');
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;

  return jsonb_build_object(
    'outcome', 'settled',
    'booking_id', bk.id,
    'confirmed', was_pending,
    'amount_minor', gross,
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', 0, 'agentShareMinor', gross - fee,
      'processorFeeMinor', fee, 'netSettlementMinor', gross - fee));
end;
$function$;
