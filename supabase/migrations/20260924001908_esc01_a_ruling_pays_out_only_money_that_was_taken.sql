-- ESC-01: a ruling on a never-funded escrow minted money.
--
-- INITIATED -> DISPUTED was legal, escrow_raise_dispute_as accepted
-- INITIATED, escrow_admin_resolve checked only state = 'DISPUTED', and
-- escrow_settle credited e.amount_minor without asking whether an
-- escrow_hold was ever posted. One ruling either way on a disputed proposal
-- put the whole proposed amount into a wallet that never paid anything in
-- (pass two: N5,000,000 credited, zero holds, float difference -500000000).
--
-- 1. The transition table loses INITIATED -> DISPUTED.
-- 2. A dispute is raised only on HELD or RELEASE_REQUESTED, or on FUNDED when
--    the hold has posted.
-- 3. escrow_settle refuses, before any credit, unless COMPLETED escrow_hold
--    debits for this escrow cover its amount ('never_funded'). This is the
--    load-bearing guard: it protects every caller, not just the ruling.
-- 4. escrow_admin_resolve checks the float before any ruling. When the ledger
--    already holds less than the live agreements promise it raises a high
--    alert, refuses a release, and still allows a refund (which only returns
--    this agreement's own posted hold to its payer).

CREATE OR REPLACE FUNCTION private.escrow_transition_is_legal(from_state escrow_state, to_state escrow_state)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (from_state, to_state) in (
    ('INITIATED', 'FUNDED'),
    ('FUNDED', 'HELD'),
    ('HELD', 'RELEASE_REQUESTED'),
    ('HELD', 'RELEASED'),
    ('RELEASE_REQUESTED', 'RELEASED'),
    ('HELD', 'REFUNDED'),
    ('RELEASE_REQUESTED', 'REFUNDED'),
    /* ESC-01. No INITIATED -> DISPUTED: nothing was taken, so there is
       nothing to rule on. A proposal nobody funded is cancelled instead. */
    ('FUNDED', 'DISPUTED'),
    ('HELD', 'DISPUTED'),
    ('RELEASE_REQUESTED', 'DISPUTED'),
    ('DISPUTED', 'RESOLVED'),
    /* F-5. A proposal nobody accepted, and a funding that never posted. */
    ('INITIATED', 'CANCELLED'),
    ('FUNDED', 'CANCELLED')
  );
$function$;

CREATE OR REPLACE FUNCTION public.escrow_raise_dispute_as(p_actor uuid, p_escrow uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := p_actor;
  e public.escrows;
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 4 then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor <> e.payer_id and actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  -- ESC-01. Only money that was actually taken can be disputed.
  if not (e.state in ('HELD', 'RELEASE_REQUESTED')
          or (e.state = 'FUNDED' and exists (
                select 1 from public.wallet_entries w
                 where w.kind = 'escrow_hold' and w.status = 'COMPLETED'
                   and (w.metadata ->> 'escrow_id') = e.id::text))) then
    return jsonb_build_object('status', 'not_disputable', 'state', e.state);
  end if;

  update public.escrows
     set state = 'DISPUTED',
         disputed_at = now(),
         disputed_by = actor,
         dispute_reason = btrim(p_reason),
         auto_release_at = null
   where id = e.id;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'This payment is in dispute',
    'The money stays held until our team has looked at it. We will be in touch.',
    '/wallet'
  );

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'DISPUTED');
end;
$function$;

CREATE OR REPLACE FUNCTION private.escrow_settle(p_escrow uuid, p_direction text, p_to_state escrow_state, p_actor uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  e public.escrows;
  target_user uuid;
  target_wallet uuid;
  fee jsonb;
  commission bigint := 0;
  rate_id uuid;
  net bigint;
  entry_kind public.wallet_entry_kind;
  held bigint;
begin
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED', 'CANCELLED') then
    return jsonb_build_object('status', 'already_settled', 'state', e.state);
  end if;

  /*
   * ESC-01. NOTHING IS PAID OUT THAT WAS NOT TAKEN IN. The completed holds
   * for this agreement must cover its amount before a single kobo is
   * credited, whichever door asked for the settlement.
   */
  select coalesce(sum(w.amount_minor), 0) into held
    from public.wallet_entries w
   where w.kind = 'escrow_hold' and w.direction = 'debit' and w.status = 'COMPLETED'
     and (w.metadata ->> 'escrow_id') = e.id::text;
  if held <= 0 or held < e.amount_minor then
    return jsonb_build_object('status', 'never_funded', 'state', e.state,
                              'held_minor', held, 'amount_minor', e.amount_minor);
  end if;

  if p_direction = 'release' then
    target_user := e.payee_id;
    entry_kind := 'escrow_release';
    /*
     * F-7. The rate is not even read unless the purpose permits a cut.
     */
    if private.escrow_commission_is_permitted(e.purpose) then
      fee := private.compute_fee('commission', e.amount_minor, now());
      if fee ->> 'status' = 'ok' then
        commission := coalesce((fee ->> 'fee_minor')::bigint, 0);
        rate_id := nullif(fee ->> 'rate_id', '')::uuid;
      end if;
    else
      commission := 0;
      rate_id := null;
    end if;
  else
    /* A refund returns the whole amount. We do not charge somebody a
       commission for getting their own money back. */
    target_user := e.payer_id;
    entry_kind := 'escrow_refund';
    commission := 0;
    rate_id := null;
  end if;

  net := e.amount_minor - commission;
  if net < 0 then
    return jsonb_build_object('status', 'bad_commission');
  end if;

  target_wallet := private.wallet_for_update(target_user);
  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  insert into public.wallet_entries
    (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values
    (target_wallet, entry_kind, 'credit', net,
     'escrow:' || p_direction || ':' || e.id::text, 'COMPLETED',
     jsonb_build_object(
       'note', case when p_direction = 'release'
                    then 'Released to you on Vallo'
                    else 'Refunded to you on Vallo' end,
       'escrow_id', e.id,
       'purpose', e.purpose,
       'listing_id', e.listing_id,
       'gross_minor', e.amount_minor,
       'commission_minor', commission,
       'settled_by', p_actor,
       'reason', p_note
     ));

  if commission > 0 then
    insert into public.platform_revenue
      (source, amount_minor, escrow_id, listing_id, rate_id, reference, metadata)
    values
      ('escrow_commission', commission, e.id, e.listing_id, rate_id,
       'escrow:commission:' || e.id::text,
       jsonb_build_object(
         'gross_minor', e.amount_minor,
         'net_to_payee_minor', net,
         'payer_id', e.payer_id,
         'payee_id', e.payee_id,
         'settled_by', p_actor
       ));
  end if;

  update public.escrows
     set state = p_to_state,
         released_at = case when p_direction = 'release' then now() else released_at end,
         refunded_at = case when p_direction = 'refund' then now() else refunded_at end,
         resolved_at = case when p_to_state = 'RESOLVED' then now() else resolved_at end,
         resolved_by = case when p_to_state = 'RESOLVED' then p_actor else resolved_by end,
         resolution_note = case when p_to_state = 'RESOLVED' then p_note else resolution_note end,
         commission_minor = commission,
         commission_rate_id = rate_id
   where id = e.id;

  perform private.notify(
    target_user, 'wallet',
    case when p_direction = 'release' then 'A held payment reached your balance' else 'A held payment was returned to you' end,
    'The money is in your Vallo balance now.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'direction', p_direction,
    'state', p_to_state,
    'gross_minor', e.amount_minor,
    'commission_minor', commission,
    'net_minor', net
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.escrow_admin_resolve(p_escrow uuid, p_direction text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := auth.uid();
  e public.escrows;
  outcome jsonb;
  ruling text;
  float_now jsonb;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  ruling := btrim(coalesce(p_note, ''));
  if char_length(ruling) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state <> 'DISPUTED' then
    return jsonb_build_object('status', 'not_disputed', 'state', e.state);
  end if;

  /*
   * ESC-01. THE FLOAT IS CHECKED BEFORE ANY RULING. When the ledger already
   * holds less than the live agreements promise, something has paid out
   * money it never took: the desk is alerted, and no release moves more until
   * the reconciliation has been read.
   */
  float_now := private.escrow_float_components();
  if coalesce((float_now ->> 'difference_minor')::bigint, 0) < 0 then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Held money does not reconcile at a ruling',
            format('The ledger holds %s kobo less than the live agreements promise. A %s ruling on escrow %s '
                   || 'was %s. Read the float before any further release.',
                   -((float_now ->> 'difference_minor')::bigint), p_direction, e.id,
                   case when p_direction = 'refund' then 'allowed, because it returns this agreement''s own posted hold to its payer'
                        else 'refused' end),
            'escrow', e.id::text);
    -- A refund returns money this agreement took (escrow_settle proves the
    -- hold) to the person it came from, so it cannot deepen the gap; a
    -- release waits until the float has been read.
    if p_direction <> 'refund' then
      return jsonb_build_object('status', 'float_out_of_balance',
                                'difference_minor', (float_now ->> 'difference_minor')::bigint);
    end if;
  end if;

  outcome := private.escrow_settle(e.id, p_direction, 'RESOLVED', actor, ruling);
  if outcome ->> 'status' <> 'ok' then
    return outcome;
  end if;

  /*
   * WORD FOR WORD, TO BOTH. An operator's reasons summarised for one party
   * and quoted to the other is how a decision becomes an argument, and the
   * party who got the summary is always the one who lost.
   */
  perform private.notify(
    e.payer_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);
  perform private.notify(
    e.payee_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);

  return outcome;
end;
$function$;
