-- Found 29 September 2026 by database probe v-33, the first probe run since
-- CI stopped starting jobs on 23 September.
--
-- A LISTER WAS RECORDED AS OWING BACK MORE THAN THEY WERE PAID. Under split
-- settlement (Track A) a charge settles into the lister's share, the Vallo
-- Guarantee contribution and the processor's fee. Both refund doors wrote the
-- WHOLE refund into rent_refunds_owed as the lister's debt and booked the whole
-- reversal to the lister's share in ledger_entries. On a 240,000,000 kobo rent
-- where the lister received 236,200,000, a full refund recorded 240,000,000 as
-- owed by the lister: money they never received.
--
-- A refund now reverses the booking's settlement in the proportions it was
-- settled, computed cumulatively across part-refunds so rounding never drifts
-- (private.refund_components). The lister's debt is their share of the refund
-- and no more; the Guarantee and fee portions are reversed on their own ledger
-- lines, and every ledger row still balances. A booking with no split
-- settlement row behaves exactly as before. No refund or debt row existed in
-- production when this was applied.
create or replace function private.refund_components(
  p_booking uuid, p_prev bigint, p_amount bigint,
  out platform bigint, out agent bigint, out processor bigint, out guarantee bigint)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  sg bigint; sa bigint; spr bigint; sgu bigint;
  prev bigint := greatest(coalesce(p_prev, 0), 0);
  upto bigint;
begin
  select coalesce(sum(e.gross_minor), 0), coalesce(sum(e.agent_share_minor), 0),
         coalesce(sum(e.processor_fee_minor), 0), coalesce(sum(e.guarantee_reserve_minor), 0)
    into sg, sa, spr, sgu
    from public.ledger_entries e
   where e.booking_id = p_booking and e.gross_minor > 0;
  if sg <= 0 then
    platform := 0; agent := p_amount; processor := 0; guarantee := 0;
    return;
  end if;
  upto := least(prev + p_amount, sg);
  prev := least(prev, sg);
  agent     := (sa  * upto) / sg - (sa  * prev) / sg;
  processor := (spr * upto) / sg - (spr * prev) / sg;
  guarantee := (sgu * upto) / sg - (sgu * prev) / sg;
  platform  := p_amount - agent - processor - guarantee;
end;
$function$;
revoke all on function private.refund_components(uuid, bigint, bigint) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.refund_and_cancel_booking(acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text, decision_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  bk            public.bookings%rowtype;
  before_status public.booking_status;
  paid_total    bigint;
  refunded      bigint;
  refund_id     uuid;
  lister        uuid;
  c             record;
begin
  if acting_admin is null or target_booking is null or reason_code is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if reason_code not in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access') then
    return jsonb_build_object('status', 'bad_reason');
  end if;
  if refund_amount is null or refund_amount < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if refund_amount > 0 and (refund_reference is null or length(refund_reference) = 0) then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into bk from public.bookings where id = target_booking for update;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if bk.status = 'CANCELLED' then
    return jsonb_build_object('status', 'already_cancelled');
  end if;
  before_status := bk.status;
  select coalesce(sum(t.amount_minor), 0) into paid_total
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL';
  select coalesce(sum(r.refund_minor), 0) into refunded from public.booking_refunds r where r.booking_id = bk.id;
  if refund_amount > paid_total - refunded then
    return jsonb_build_object('status', 'over_refund', 'paid_minor', paid_total, 'refunded_minor', refunded,
                              'refundable_minor', paid_total - refunded, 'refund_minor', refund_amount);
  end if;
  if refund_amount > 0 then
    select * into c from private.refund_components(bk.id, refunded, refund_amount);
    insert into public.ledger_entries
      (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
       guarantee_reserve_minor, net_settlement_minor)
    values (bk.id, null, -refund_amount, -c.platform, -c.agent, -c.processor, -c.guarantee, -refund_amount);
    select a.user_id into lister from public.listings l join public.agents a on a.id = l.agent_id where l.id = bk.listing_id;
    if lister is not null and c.agent > 0 then
      insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
      values (bk.id, lister, c.agent)
      on conflict (booking_id) do update
        set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
    end if;
  end if;
  update public.bookings set status = 'CANCELLED' where id = bk.id and status in ('PENDING', 'CONFIRMED');
  if not found then
    raise exception 'booking % could not be cancelled from %', bk.id, before_status;
  end if;
  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, before_status, 'CANCELLED', acting_admin,
          coalesce(nullif(btrim(decision_note), ''), 'Cancelled by Vallo support.'));
  delete from public.availability a
   where a.listing_id = bk.listing_id and a.status = 'booked' and a.date >= bk.check_in and a.date < bk.check_out;
  update public.deal_agreements set status = 'cancelled', updated_at = now()
   where booking_id = bk.id and status not in ('cancelled');
  insert into public.booking_refunds
    (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note, wallet_reference, decided_by, processor_status)
  values (bk.id, bk.guest_id, paid_total, refund_amount, paid_total - refund_amount, reason_code,
          nullif(btrim(decision_note), ''), case when refund_amount > 0 then refund_reference else null end, acting_admin,
          case when refund_amount > 0 then 'pending' else 'not_needed' end)
  returning id into refund_id;
  return jsonb_build_object('status', 'ok', 'booking_id', bk.id, 'guest_id', bk.guest_id, 'listing_id', bk.listing_id,
                            'previous_status', before_status, 'paid_minor', paid_total, 'refund_minor', refund_amount,
                            'retained_minor', paid_total - refund_amount,
                            'reference', case when refund_amount > 0 then refund_reference else null end,
                            'refund_id', refund_id);
end;
$function$;

CREATE OR REPLACE FUNCTION private.refund_booking_payment(acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text, decision_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bk          public.bookings%rowtype;
  lister      uuid;
  paid_total  bigint;
  refunded    bigint;
  refundable  bigint;
  refund_id   uuid;
  c           record;
begin
  if acting_admin is null or target_booking is null
     or refund_reference is null or length(btrim(refund_reference)) = 0 or reason_code is null then
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
  select * into bk from public.bookings where id = target_booking for update;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select coalesce(sum(t.amount_minor), 0) into paid_total
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL';
  select coalesce(sum(r.refund_minor), 0) into refunded from public.booking_refunds r where r.booking_id = bk.id;
  refundable := paid_total - refunded;
  if refund_amount > refundable then
    return jsonb_build_object('status', 'over_refund', 'paid_minor', paid_total, 'refunded_minor', refunded,
                              'refundable_minor', refundable, 'refund_minor', refund_amount);
  end if;
  begin
    insert into public.booking_refunds
      (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note,
       wallet_reference, decided_by, processor_status)
    values (bk.id, bk.guest_id, paid_total, refund_amount, paid_total - refund_amount, reason_code,
            nullif(btrim(decision_note), ''), btrim(refund_reference), acting_admin, 'pending')
    returning id into refund_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  select * into c from private.refund_components(bk.id, refunded, refund_amount);
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
     guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, null, -refund_amount, -c.platform, -c.agent, -c.processor, -c.guarantee, -refund_amount);
  select a.user_id into lister from public.listings l join public.agents a on a.id = l.agent_id where l.id = bk.listing_id;
  if lister is not null and c.agent > 0 then
    insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
    values (bk.id, lister, c.agent)
    on conflict (booking_id) do update
      set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (acting_admin, 'booking.refunded', 'booking', bk.id::text,
          jsonb_build_object('refund_minor', refund_amount, 'reason', reason_code, 'booking_status', bk.status,
                             'refundable_after_minor', refundable - refund_amount, 'to', 'card',
                             'lister_share_minor', c.agent));
  return jsonb_build_object('status', 'ok', 'booking_id', bk.id, 'guest_id', bk.guest_id, 'booking_status', bk.status,
                            'paid_minor', paid_total, 'refund_minor', refund_amount,
                            'refundable_after_minor', refundable - refund_amount,
                            'reference', btrim(refund_reference), 'refund_id', refund_id);
end;
$function$;
