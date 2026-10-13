-- ROLLBACK for pov05.
-- The live definitions of public.provider_arrangement_open,
-- private.booking_is_paid, private.release_stale_booking_holds,
-- public.expire_booking_holds, public.refund_and_cancel_booking and
-- private.rent_split_cancel, read from the
-- live database (pg_get_functiondef) on 13 October 2026, before pov05
-- replaces them, and the two triggers pov05 adds switched off (disabled, not
-- removed). Running this puts escrow back to rentals only and the hold sweep
-- back as it was.
set lock_timeout = '5s';

alter table public.bookings disable trigger bookings_00_partner_hold_keeps_the_stay;
alter table public.provider_arrangements disable trigger provider_arrangements_02_paid_twice_alert;

CREATE OR REPLACE FUNCTION public.provider_arrangement_open(p_agreement uuid, p_kind text, p_milestones jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ag public.deal_agreements%rowtype;
  live public.provider_arrangements%rowtype;
  buyer text;
  seller text;
  arr public.provider_arrangements%rowtype;
  m jsonb;
  pos int := 0;
  total bigint := 0;
begin
  if not private.rentals_protected_pay_on() then
    return jsonb_build_object('status', 'switched_off');
  end if;
  if p_kind not in ('standard', 'milestone') then
    return jsonb_build_object('status', 'bad_request');
  end if;
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Rentals only: a fixed-price stay pays by card directly (D73 Part A).
  if ag.kind <> 'rent' or ag.status <> 'approved' then
    return jsonb_build_object('status', 'not_payable', 'kind', ag.kind, 'agreement_status', ag.status);
  end if;
  select * into live from public.provider_arrangements
   where agreement_id = ag.id and status not in ('failed', 'cancelled');
  if live.id is not null then
    -- Never a second arrangement: the caller resolves this one.
    return jsonb_build_object('status', 'exists', 'id', live.id, 'reference', live.reference,
                              'arrangement_status', live.status);
  end if;
  -- create-escrow: amounts are naira, minimum 1000 (100000 kobo).
  if ag.amount_minor < 100000 then
    return jsonb_build_object('status', 'below_provider_minimum');
  end if;
  select f.provider_customer_id into buyer from public.financial_provider_accounts f
   where f.user_id = ag.renter_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if buyer is null then
    return jsonb_build_object('status', 'buyer_not_onboarded');
  end if;
  select f.provider_customer_id into seller from public.financial_provider_accounts f
   where f.user_id = ag.owner_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if seller is null then
    return jsonb_build_object('status', 'seller_not_onboarded');
  end if;

  if p_kind = 'milestone' then
    -- create-milestone-escrow: at least 2, each at least 1 naira, summing to the amount.
    if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' or jsonb_array_length(p_milestones) < 2
       or jsonb_array_length(p_milestones) > 24 then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'count');
    end if;
    for m in select value from jsonb_array_elements(p_milestones) loop
      if jsonb_typeof(m -> 'amount_minor') <> 'number' or (m ->> 'amount_minor')::numeric <> floor((m ->> 'amount_minor')::numeric)
         or (m ->> 'amount_minor')::bigint < 100
         or length(btrim(coalesce(m ->> 'title', ''))) not between 1 and 120 then
        return jsonb_build_object('status', 'bad_milestones', 'reason', 'item');
      end if;
      total := total + (m ->> 'amount_minor')::bigint;
    end loop;
    if total <> ag.amount_minor then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'sum');
    end if;
  elsif p_milestones is not null then
    return jsonb_build_object('status', 'bad_milestones', 'reason', 'standard_has_none');
  end if;

  insert into public.provider_arrangements (agreement_id, kind, reference, amount_minor,
                                            buyer_user_id, seller_user_id, buyer_customer_id, seller_customer_id)
  values (ag.id, p_kind, 'vallo-arr-' || replace(gen_random_uuid()::text, '-', ''), ag.amount_minor,
          ag.renter_id, ag.owner_id, buyer, seller)
  returning * into arr;
  if p_kind = 'milestone' then
    for m in select value from jsonb_array_elements(p_milestones) loop
      pos := pos + 1;
      insert into public.provider_arrangement_milestones (arrangement_id, position, title, description, amount_minor)
      values (arr.id, pos, btrim(m ->> 'title'), nullif(btrim(coalesce(m ->> 'description', '')), ''),
              (m ->> 'amount_minor')::bigint);
    end loop;
  end if;
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  values (arr.id, null, 'preparing', 'vallo',
          jsonb_build_object('agreement_id', ag.id, 'kind', p_kind, 'amount_minor', ag.amount_minor));
  return jsonb_build_object('status', 'ok', 'id', arr.id, 'reference', arr.reference, 'amount_minor', arr.amount_minor,
                            'buyer_customer_id', buyer, 'seller_customer_id', seller);
end $function$;

CREATE OR REPLACE FUNCTION private.booking_is_paid(p_booking uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.transactions t where t.booking_id = p_booking and t.status = 'SUCCESSFUL');
$function$;

CREATE OR REPLACE FUNCTION private.release_stale_booking_holds()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    jsonb_array_length(private.expire_booking_holds(interval '48 hours', 500) -> 'released'),
    0
  );
$function$;

CREATE OR REPLACE FUNCTION public.expire_booking_holds(p_ttl interval DEFAULT '48:00:00'::interval, p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select private.expire_booking_holds(p_ttl, p_limit);
$function$;

CREATE OR REPLACE FUNCTION private.rent_split_cancel(p_rent_payment uuid, p_actor uuid, p_reason text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  rp      public.rent_payments%rowtype;
  bk      public.bookings%rowtype;
  ag      public.deal_agreements%rowtype;
  t       record;
  refunds jsonb := '[]'::jsonb;
  total   bigint := 0;
  rid     uuid;
  before_status public.agreement_status;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into bk from public.bookings where id = rp.booking_id for update;
  if private.tenancy_paid(rp.id) then
    return jsonb_build_object('status', 'complete');
  end if;
  if bk.status <> 'PENDING' then
    return jsonb_build_object('status', 'not_open', 'booking_status', bk.status);
  end if;
  if private.booking_payment_in_flight(bk.id) then
    return jsonb_build_object('status', 'payment_in_flight');
  end if;
  update public.bookings set status = 'CANCELLED' where id = bk.id and status = 'PENDING';
  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, 'PENDING', 'CANCELLED', p_actor,
          case when p_reason = 'group_cancelled' then 'The flatmates cancelled the move-in before it was fully paid.'
               else 'The move-in was not fully paid by the move-in day, so it was cancelled.' end);
  select * into ag from public.deal_agreements where booking_id = bk.id for update;
  if ag.id is not null and ag.status not in ('paid', 'cancelled') then
    before_status := ag.status;
    update public.deal_agreements set status = 'cancelled', updated_at = now() where id = ag.id returning * into ag;
    perform private.agreement_log(ag, p_actor, 'cancelled', before_status, nullif(btrim(coalesce(p_note, '')), ''));
  end if;
  for t in
    select tr.id, tr.provider_ref, tr.amount_minor, tr.share_payer_id
      from public.transactions tr
     where tr.booking_id = bk.id and tr.status = 'SUCCESSFUL' and tr.share_payer_id is not null
  loop
    insert into public.rent_share_refunds (transaction_id, rent_payment_id, payer_id, amount_minor, reason)
    values (t.id, rp.id, t.share_payer_id, t.amount_minor, p_reason)
    on conflict (transaction_id) do nothing
    returning id into rid;
    if rid is not null then
      insert into public.ledger_entries
        (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
         guarantee_reserve_minor, net_settlement_minor)
      values (bk.id, null, -t.amount_minor, 0, -t.amount_minor, 0, 0, -t.amount_minor);
      total := total + t.amount_minor;
      refunds := refunds || jsonb_build_object('refund_id', rid, 'reference', t.provider_ref,
                                               'amount_minor', t.amount_minor, 'payer_id', t.share_payer_id);
      begin
        perform private.notify(t.share_payer_id, 'booking'::public.notification_kind, 'Your move-in share is being refunded',
          'The move-in was cancelled before it was fully paid, so your share is going back to the card or account you paid with. Banks usually show it within 5 to 10 working days.',
          '/tenancy/' || rp.id::text);
      exception when others then
        null;
      end;
    end if;
  end loop;
  -- What the lister received from those shares is owed back, as for every
  -- card refund on a split charge.
  if total > 0 then
    insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
    values (bk.id, rp.lister_id, total)
    on conflict (booking_id) do update
      set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, 'rent_split.cancelled', 'rent_payment', rp.id::text,
          jsonb_build_object('reason', p_reason, 'refunded_minor', total, 'refunds', jsonb_array_length(refunds)));
  begin
    perform private.notify(rp.lister_id, 'booking'::public.notification_kind, 'A shared move-in was cancelled',
      'The flatmates did not complete the move-in. Any share already paid is being refunded to their cards.', '/tenancy/' || rp.id::text);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok', 'refunds', refunds, 'refunded_minor', total);
end;
$function$;

CREATE OR REPLACE FUNCTION public.refund_and_cancel_booking(acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text, decision_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select private.refund_and_cancel_booking(
    acting_admin, target_booking, refund_amount, refund_reference, reason_code, decision_note
  );
$function$;

-- public.partner_hold_unwind_cancel stays defined; with the trigger disabled it
-- is an ordinary cancel. Members never held it.
