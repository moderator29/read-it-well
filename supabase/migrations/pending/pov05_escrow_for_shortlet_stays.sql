-- DRAFT, not applied. PAY ON VALLO 5 of 8. Needs pov03 and pov04.
-- Ruling 2 puts a shortlet stay on escrow by default, so the protected
-- payment, built for rentals, has to carry a stay too, and the hold sweep
-- has to leave money the partner holds alone. Every object here is named for
-- what Vallo does (the custody guard, private.refuse_custody_objects, refuses
-- any function named like (^|_)escrows?(_|$), and stays as it is).
--
-- 1. public.provider_arrangement_open (live definition in
--    pending/rollback/rb05): a rent or a stay agreement opens only when its
--    rail is escrow now. The rail decides (pov03): a shortlet listing or a
--    shortlet operator's room may be held, a hotel's room never (card only),
--    and a payer who chose card is never also put into escrow.
-- 2. private.booking_is_paid (rb05): a stay whose money the partner holds,
--    or has paid out, is paid for the trip details, the gate directions and
--    the review, exactly as a settled card charge is.
-- 3. The hold sweep is marked, not guessed: private.release_stale_booking_holds
--    (pg_cron) and public.expire_booking_holds (the cron route) set
--    vallo.hold_sweep = 'on' for their own transaction before they call
--    private.expire_booking_holds (unchanged). The earlier draft's reading of
--    current_query() is gone.
-- 4. bookings_00_partner_hold_keeps_the_stay, on a move to CANCELLED, by the
--    stay's arrangements:
--      released or split (terminal: the money has gone to the lister): the
--        sweep never cancels it; a person's cancel stands (nothing is held).
--      protected, release_requested or disputed (held): the sweep skips it;
--        anyone else is refused (partner_hold) unless the unwind path is
--        explicit: vallo.partner_hold_unwind = 'on', which only
--        public.refund_and_cancel_booking (staff) and
--        public.partner_hold_unwind_cancel (after the partner returned the
--        money) set.
--      preparing, unknown or payment_processing (moving): never cancelled
--        automatically; anyone else is refused (partner_payment_moving)
--        unless the unwind setting is on.
--      awaiting_payment (opened, not funded): the sweep gives it two hours
--        from the arrangement's opening; whenever the stay is cancelled, the
--        unfunded arrangement is cancelled with it, so it cannot be funded
--        for a stay that no longer exists.
--      refunded, failed, cancelled: no effect.
--    Skipped means the row is left as it is (the trigger returns null) and
--    every caller checks FOUND: the sweep already does, and
--    private.rent_split_cancel (rb05) now does too, and says partner_holds
--    before it tries.
-- 5. provider_arrangements_02_paid_twice_alert: an arrangement the partner
--    reports funded on a booking or agreement already paid by card raises a
--    high risk alert (alert_severity has low, medium, high) (the partner's report is always recorded; a person
--    resolves it at the partner as a refund).
-- Probe: supabase/tests/probes-pending/pov05-escrow-for-shortlet-stays.sql
set lock_timeout = '5s';

create or replace function public.provider_arrangement_open(p_agreement uuid, p_kind text, p_milestones jsonb default null::jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
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
  -- A rental, or (13 October 2026, ruling 2) a stay; the rail below decides
  -- which stays (a hotel room is card only, ruling 3).
  if ag.status <> 'approved' or ag.kind not in ('rent', 'stay') then
    return jsonb_build_object('status', 'not_payable', 'kind', ag.kind, 'agreement_status', ag.status);
  end if;
  -- Escrow only when the rail is escrow now: the payer's card choice is never
  -- also held.
  if private.rail_for_agreement(ag.id) is distinct from 'escrow' then
    return jsonb_build_object('status', 'not_escrow');
  end if;
  -- A card attempt still open on this deal keeps escrow shut (pov04's lock).
  if exists (select 1 from public.transactions t
              where t.status in ('PENDING', 'SUCCESSFUL')
                and (t.agreement_id = ag.id or (ag.booking_id is not null and t.booking_id = ag.booking_id))) then
    return jsonb_build_object('status', 'card_payment_started');
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
end
$fn$;

/* The partner's position on a booking's money, the strongest first:
   'terminal' (released or split), 'held' (protected, release_requested,
   disputed), 'moving' (preparing, unknown, payment_processing), 'unfunded'
   (awaiting_payment), or null when no arrangement speaks for it. */
create or replace function private.booking_partner_position(p_booking uuid)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select case
    when bool_or(pa.status in ('released', 'split')) then 'terminal'
    when bool_or(pa.status in ('protected', 'release_requested', 'disputed')) then 'held'
    when bool_or(pa.status in ('preparing', 'unknown', 'payment_processing')) then 'moving'
    when bool_or(pa.status = 'awaiting_payment') then 'unfunded'
  end
    from public.provider_arrangements pa
    join public.deal_agreements a on a.id = pa.agreement_id
   where a.booking_id = p_booking;
$fn$;

create or replace function private.booking_is_paid(p_booking uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select exists (select 1 from public.transactions t where t.booking_id = p_booking and t.status = 'SUCCESSFUL')
      or private.booking_partner_position(p_booking) in ('terminal', 'held');
$fn$;

/* The sweep's own mark, set by the two entry points below for their own
   transaction only. */
create or replace function private.in_hold_sweep()
 returns boolean
 language sql
 stable
 set search_path to ''
as $fn$
  select coalesce(current_setting('vallo.hold_sweep', true), '') = 'on';
$fn$;

create or replace function private.release_stale_booking_holds()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  perform set_config('vallo.hold_sweep', 'on', true);
  return coalesce(
    jsonb_array_length(private.expire_booking_holds(interval '48 hours', 500) -> 'released'),
    0
  );
end;
$fn$;

create or replace function public.expire_booking_holds(p_ttl interval default '48:00:00'::interval, p_limit integer default 500)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
begin
  perform set_config('vallo.hold_sweep', 'on', true);
  return private.expire_booking_holds(p_ttl, p_limit);
end;
$fn$;

/* Staff's refund-and-cancel is an explicit unwind: the person deciding it
   has the stay in front of them, and a stay the partner holds is refunded at
   the partner (the app's staff action), never by this card refund. */
create or replace function public.refund_and_cancel_booking(acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text, decision_note text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
begin
  perform set_config('vallo.partner_hold_unwind', 'on', true);
  return private.refund_and_cancel_booking(
    acting_admin, target_booking, refund_amount, refund_reference, reason_code, decision_note
  );
end;
$fn$;

/* The unwind path once the partner has returned or released the money: the
   service role cancels the stay (the app calls it after the partner reports
   refunded, or a person decides). Idempotent; never touches a card charge.
   It refuses while the partner still holds or is moving the money: only a
   refunded, failed or cancelled arrangement (or a released one, which a
   person has decided to close) lets it through. */
create or replace function public.partner_hold_unwind_cancel(p_booking uuid, p_note text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  bk public.bookings%rowtype;
  moved bigint;
begin
  select * into bk from public.bookings where id = p_booking for update;
  if bk.id is null then
    return 'not_found';
  end if;
  if bk.status = 'CANCELLED' then
    return 'already_cancelled';
  end if;
  if bk.status not in ('PENDING', 'CONFIRMED') then
    return 'not_open';
  end if;
  if private.booking_partner_position(bk.id) in ('held', 'moving') then
    return 'partner_holds';
  end if;
  perform set_config('vallo.partner_hold_unwind', 'on', true);
  update public.bookings set status = 'CANCELLED' where id = bk.id and status in ('PENDING', 'CONFIRMED');
  get diagnostics moved = row_count;
  perform set_config('vallo.partner_hold_unwind', '', true);
  if moved = 0 then
    return 'not_open';
  end if;
  insert into public.booking_state_events (booking_id, from_status, to_status, note)
  values (bk.id, bk.status, 'CANCELLED', coalesce(nullif(btrim(p_note), ''), 'Cancelled after the payment partner returned the money.'));
  update public.deal_agreements set status = 'cancelled', updated_at = now()
   where booking_id = bk.id and status not in ('paid', 'cancelled');
  return 'ok';
end;
$fn$;

create or replace function private.bookings_partner_hold_keeps_the_stay()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  pos text;
  sweep boolean := private.in_hold_sweep();
  unwind boolean := coalesce(current_setting('vallo.partner_hold_unwind', true), '') = 'on';
begin
  if new.status is distinct from 'CANCELLED' or old.status not in ('PENDING', 'CONFIRMED') then
    return new;
  end if;
  pos := private.booking_partner_position(new.id);
  if pos is null then
    return new;
  end if;
  if pos = 'terminal' then
    -- The partner has paid the lister: never an automatic cancel; a person's
    -- cancel stands, because nothing is held to unwind.
    return case when sweep then null else new end;
  end if;
  if pos in ('held', 'moving') then
    if sweep then
      return null;
    end if;
    if unwind then
      return new;
    end if;
    if pos = 'held' then
      raise exception 'partner_hold: the payment partner holds this stay''s money; it is returned through the held payment before the stay is cancelled'
        using errcode = '42501';
    end if;
    raise exception 'partner_payment_moving: the payment partner has not yet said where this stay''s money is; it is not cancelled until it does'
      using errcode = '42501';
  end if;
  -- pos = 'unfunded': opened at the partner, never funded.
  if sweep and exists (select 1 from public.provider_arrangements pa
                         join public.deal_agreements a on a.id = pa.agreement_id
                        where a.booking_id = new.id and pa.status = 'awaiting_payment'
                          and pa.created_at > now() - interval '2 hours') then
    -- The guest has two hours from opening it to finish funding.
    return null;
  end if;
  -- The stay goes, and the unfunded arrangement with it, so it cannot be
  -- funded for a stay that no longer exists.
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  select pa.id, pa.status, 'cancelled', 'vallo',
         jsonb_build_object('reason', 'stay_cancelled', 'booking_id', new.id, 'by_sweep', sweep)
    from public.provider_arrangements pa
    join public.deal_agreements a on a.id = pa.agreement_id
   where a.booking_id = new.id and pa.status = 'awaiting_payment';
  update public.provider_arrangements pa
     set status = 'cancelled', status_source = 'vallo', status_observed_at = now()
    from public.deal_agreements a
   where a.id = pa.agreement_id and a.booking_id = new.id and pa.status = 'awaiting_payment';
  return new;
end;
$fn$;

create or replace trigger bookings_00_partner_hold_keeps_the_stay
  before update of status on public.bookings
  for each row execute function private.bookings_partner_hold_keeps_the_stay();

/* A partner-funded arrangement on a deal already paid by card: say so loudly. */
create or replace function private.provider_arrangements_paid_twice_alert()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  ag public.deal_agreements%rowtype;
begin
  if new.status not in ('protected', 'release_requested', 'released', 'disputed', 'split')
     or old.status in ('protected', 'release_requested', 'released', 'disputed', 'split') then
    return new;
  end if;
  select * into ag from public.deal_agreements where id = new.agreement_id;
  if exists (select 1 from public.transactions t
              where t.status = 'SUCCESSFUL'
                and (t.agreement_id = ag.id or (ag.booking_id is not null and t.booking_id = ag.booking_id))) then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A deal paid by card was also funded at the payment partner',
            format('Arrangement %s (reference %s, %s kobo) is reported %s by the partner, but agreement %s already has a settled card charge. '
                   || 'Refund the partner payment to the payer (dispute, then resolve REFUNDED) and tell both parties.',
                   new.id, new.reference, new.amount_minor, new.status, ag.id),
            'deal_agreement', ag.id::text);
  end if;
  return new;
end;
$fn$;

create or replace trigger provider_arrangements_02_paid_twice_alert
  after update of status on public.provider_arrangements
  for each row execute function private.provider_arrangements_paid_twice_alert();

/* rent_split_cancel (rb05): the live definition, with two changes. It says
   partner_holds before it tries to cancel a move-in whose money the partner
   holds or is taking, and it stops when the cancel did not happen (FOUND),
   so no share is refunded and no agreement is cancelled for a booking that
   is still open. */
create or replace function private.rent_split_cancel(p_rent_payment uuid, p_actor uuid, p_reason text, p_note text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
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
  if private.booking_partner_position(bk.id) in ('terminal', 'held', 'moving') then
    return jsonb_build_object('status', 'partner_holds');
  end if;
  update public.bookings set status = 'CANCELLED' where id = bk.id and status = 'PENDING';
  if not found then
    return jsonb_build_object('status', 'not_open', 'booking_status', bk.status);
  end if;
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
$fn$;

revoke all on function private.booking_partner_position(uuid) from public, anon, authenticated;
revoke all on function private.bookings_partner_hold_keeps_the_stay() from public, anon, authenticated;
revoke all on function private.provider_arrangements_paid_twice_alert() from public, anon, authenticated;
revoke all on function private.in_hold_sweep() from public, anon, authenticated;
revoke all on function public.partner_hold_unwind_cancel(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.partner_hold_unwind_cancel(uuid, text) to service_role;
revoke all on function private.release_stale_booking_holds() from public, anon, authenticated;
revoke all on function private.rent_split_cancel(uuid, uuid, text, text) from public, anon, authenticated;
-- booking_is_paid keeps its live grants (authenticated reads it inside reviews_insert_own).
grant execute on function private.booking_is_paid(uuid) to authenticated, service_role;
