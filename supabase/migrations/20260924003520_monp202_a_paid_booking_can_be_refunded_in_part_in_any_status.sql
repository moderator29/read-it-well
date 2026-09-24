-- MON-P2-02: a paid booking can be refunded in any status, in part, more than
-- once, without being cancelled by the same act.
--
-- private.refund_and_cancel_booking stays as it is (refund AND cancel, for a
-- PENDING or CONFIRMED stay). This is the second door: it refunds up to what
-- is still refundable, which is the SUCCESSFUL charges minus every refund
-- already made for the booking (cumulative, not per call), and it works on a
-- CANCELLED, NO_SHOW or COMPLETED booking. It appends the guest's `refund`
-- credit, the negative ledger row (which takes settled rent back out of the
-- lister's wallet, V-33) and the booking_refunds row. The booking's status is
-- not touched.

-- Two reasons the old door never needed: a goodwill part-refund on a stay that
-- goes ahead, and a second charge on the same booking.
alter table public.booking_refunds drop constraint booking_refunds_reason_check;
alter table public.booking_refunds add constraint booking_refunds_reason_check
  check (reason = any (array['guest_choice', 'host_cancelled', 'not_as_listed', 'no_access',
                             'goodwill', 'duplicate_charge']));

create or replace function private.refund_booking_payment(
  acting_admin uuid,
  target_booking uuid,
  refund_amount bigint,
  refund_reference text,
  reason_code text,
  decision_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  bk            public.bookings%rowtype;
  guest_wallet  uuid;
  paid_total    bigint;
  refunded      bigint;
  refundable    bigint;
  entry_id      uuid;
  refund_id     uuid;
  shortfall     jsonb;
begin
  if acting_admin is null or target_booking is null
     or refund_reference is null or length(btrim(refund_reference)) = 0
     or reason_code is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if reason_code not in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access', 'goodwill', 'duplicate_charge') then
    return jsonb_build_object('status', 'bad_reason');
  end if;
  if refund_amount is null or refund_amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select b.guest_id into guest_wallet from public.bookings b where b.id = target_booking;
  if guest_wallet is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Lock order: the guest's wallet, then the booking (as every booking door).
  insert into public.wallets (user_id) values (guest_wallet) on conflict (user_id) do nothing;
  select w.id into guest_wallet from public.wallets w
   where w.user_id = (select b.guest_id from public.bookings b where b.id = target_booking)
   for update;
  select * into bk from public.bookings where id = target_booking for update;

  select coalesce(sum(t.amount_minor), 0) into paid_total
    from public.transactions t
   where t.booking_id = bk.id and t.status = 'SUCCESSFUL';
  select coalesce(sum(r.refund_minor), 0) into refunded
    from public.booking_refunds r
   where r.booking_id = bk.id;
  refundable := paid_total - refunded;

  if refund_amount > refundable then
    return jsonb_build_object('status', 'over_refund', 'paid_minor', paid_total,
                              'refunded_minor', refunded, 'refundable_minor', refundable,
                              'refund_minor', refund_amount);
  end if;

  -- V-33: settled rent comes back out of the lister, or waits as a recorded debt.
  shortfall := private.rent_refund_shortfall(bk.id, refund_amount);
  if shortfall is not null then
    return shortfall;
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (guest_wallet, 'refund', 'credit', refund_amount, btrim(refund_reference), 'COMPLETED',
       jsonb_build_object(
         'note', 'Refund for a Vallo booking',
         'booking_id', bk.id,
         'listing_id', bk.listing_id,
         'check_in', bk.check_in,
         'check_out', bk.check_out,
         'booking_status', bk.status,
         'reason', reason_code))
    returning id into entry_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values (bk.id, null, -refund_amount, 0, -refund_amount, 0, -refund_amount);

  insert into public.booking_refunds
    (booking_id, guest_id, paid_minor, refund_minor, retained_minor,
     reason, note, wallet_reference, wallet_entry_id, decided_by)
  -- Per row, paid and retained describe this act against everything paid
  -- (booking_refunds_split_chk); the cumulative bound is enforced above.
  values (bk.id, bk.guest_id, paid_total, refund_amount, paid_total - refund_amount,
          reason_code, nullif(btrim(decision_note), ''), btrim(refund_reference), entry_id, acting_admin)
  returning id into refund_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (acting_admin, 'booking.refunded', 'booking', bk.id::text,
          jsonb_build_object('refund_minor', refund_amount, 'reason', reason_code,
                             'booking_status', bk.status, 'refundable_after_minor', refundable - refund_amount));

  return jsonb_build_object(
    'status', 'ok',
    'booking_id', bk.id,
    'guest_id', bk.guest_id,
    'booking_status', bk.status,
    'paid_minor', paid_total,
    'refund_minor', refund_amount,
    'refundable_after_minor', refundable - refund_amount,
    'reference', btrim(refund_reference),
    'refund_id', refund_id);
end;
$$;

revoke all on function private.refund_booking_payment(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;

create or replace function public.refund_booking_payment(
  acting_admin uuid, target_booking uuid, refund_amount bigint,
  refund_reference text, reason_code text, decision_note text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.refund_booking_payment(acting_admin, target_booking, refund_amount,
                                        refund_reference, reason_code, decision_note);
$$;

revoke all on function public.refund_booking_payment(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.refund_booking_payment(uuid, uuid, bigint, text, text, text) to service_role;
