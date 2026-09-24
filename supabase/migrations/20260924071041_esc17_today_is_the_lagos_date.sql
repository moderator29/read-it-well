/*
 * ESC-17. "Today" in two money bodies was current_date, the date in the
 * session's TimeZone (UTC on this database). Between 00:00 and 01:00 in Lagos
 * that is still yesterday: a move-in dated yesterday in Lagos was accepted for
 * an hour, and an account whose stay checked out yesterday in Lagos was still
 * held open by it. Both now read the Lagos date. The bodies are otherwise
 * unchanged.
 */

create or replace function private.open_rent_charge(p_tenant uuid, p_inspection uuid, p_move_in date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

create or replace function private.deletion_money_blockers(p_user uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_balance  bigint  := 0;
  v_held     bigint  := 0;
  v_pots     bigint  := 0;
  v_payouts  integer := 0;
  v_owes     bigint  := 0;
  v_owed     bigint  := 0;
  v_bookings integer := 0;
  v_reserves integer := 0;
begin
  select coalesce(sum(b.balance_minor), 0) into v_balance
    from public.wallet_balances b
   where b.user_id = p_user;

  select coalesce(sum(e.amount_minor), 0) into v_held
    from public.escrows e
   where (e.payer_id = p_user or e.payee_id = p_user)
     and e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');

  /* The ledger's balance of each pot (MON-08, private.pot_balance_minor),
     never the stored column, which is being retired. */
  select coalesce(sum(private.pot_balance_minor(p.id)), 0) into v_pots
    from public.wallet_pots p
   where p.user_id = p_user;

  select count(*) into v_payouts
    from public.wallet_entries we
    join public.wallets w on w.id = we.wallet_id
   where w.user_id = p_user
     and we.kind = 'withdrawal'
     and we.status = 'PENDING';

  select coalesce(sum(r.amount_minor), 0) into v_owes
    from public.rent_refunds_owed r
   where r.lister_id = p_user
     and r.cleared_at is null
     and r.amount_minor > 0;

  select coalesce(sum(r.amount_minor), 0) into v_owed
    from public.rent_refunds_owed r
    join public.bookings b on b.id = r.booking_id
   where b.guest_id = p_user
     and r.cleared_at is null
     and r.amount_minor > 0;

  select count(*) into v_bookings
    from public.bookings b
   where b.guest_id = p_user
     and b.status in ('PENDING', 'CONFIRMED')
     and b.check_out >= (now() at time zone 'Africa/Lagos')::date;

  select count(*) into v_reserves
    from public.reservations r
   where r.guest_id = p_user
     and r.status in ('PENDING', 'CONFIRMED')
     and r.reserved_for >= now();

  return jsonb_build_object(
    'blocked', (v_balance > 0 or v_held <> 0 or v_pots > 0 or v_payouts > 0
                or v_owes > 0 or v_owed > 0 or v_bookings > 0 or v_reserves > 0),
    'wallet_balance_minor', v_balance,
    'wallet_held_minor', v_held,
    'pot_balance_minor', v_pots,
    'pending_payouts', v_payouts,
    'rent_refunds_owed_minor', v_owes,
    'rent_refunds_due_minor', v_owed,
    'active_bookings', v_bookings,
    'active_reservations', v_reserves
  );
end;
$function$;
