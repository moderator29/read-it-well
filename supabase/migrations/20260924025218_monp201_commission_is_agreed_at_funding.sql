-- MON-P2-01: commission was priced when money was released, not when it was
-- agreed, and one admin could set it to 100% of money already held.
--
--   * An escrow's commission is fixed when it is funded. A trigger stamps
--     agreed_commission_minor and agreed_commission_rate_id on the
--     INITIATED -> FUNDED move, from the rate in force at that moment and only
--     for a purpose that permits a cut, whichever door funds it. Once stamped,
--     neither column changes, and no insert can set them.
--   * private.escrow_settle takes the commission from those columns, never
--     from the rate at release. An escrow funded before this migration has
--     none stamped and settles with no commission (live has no escrows).
--   * fee_rates and private.set_fee_rate refuse a rate above 20% (2000 basis
--     points; live rates are 0), and only a super admin may raise a rate or a
--     flat fee above the one in force when the new one starts. Lowering stays
--     with any admin.

alter table public.escrows
  add column if not exists agreed_commission_minor bigint,
  add column if not exists agreed_commission_rate_id uuid references public.fee_rates(id);
-- DB-14: a foreign key has an index behind it.
create index if not exists escrows_agreed_commission_rate_idx
  on public.escrows (agreed_commission_rate_id) where agreed_commission_rate_id is not null;
alter table public.fee_rates
  add constraint fee_rates_basis_points_ceiling check (basis_points <= 2000);
alter table public.escrows
  add constraint escrows_agreed_commission_within_amount
  check (agreed_commission_minor is null or (agreed_commission_minor >= 0 and agreed_commission_minor <= amount_minor));

comment on column public.escrows.agreed_commission_minor is
  'MON-P2-01. The commission fixed when the escrow was funded, from the rate in force then. escrow_settle releases amount_minor minus this, never a rate read at release.';

create or replace function private.escrow_commission_at_funding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee jsonb;
begin
  -- Nobody writes the agreed commission on a new row: it is fixed at funding.
  if tg_op = 'INSERT' then
    new.agreed_commission_minor := null;
    new.agreed_commission_rate_id := null;
    return new;
  end if;
  if old.agreed_commission_minor is not null
     and (new.agreed_commission_minor is distinct from old.agreed_commission_minor
          or new.agreed_commission_rate_id is distinct from old.agreed_commission_rate_id) then
    raise exception 'escrow_commission_is_agreed: the commission on escrow % was fixed when it was funded', old.id
      using errcode = '42501';
  end if;
  if old.state = 'INITIATED' and new.state = 'FUNDED' and old.agreed_commission_minor is null then
    if private.escrow_commission_is_permitted(new.purpose) then
      fee := private.compute_fee('commission'::public.fee_kind, new.amount_minor, now());
      if fee ->> 'status' = 'ok' then
        new.agreed_commission_minor := least(coalesce((fee ->> 'fee_minor')::bigint, 0), new.amount_minor);
        new.agreed_commission_rate_id := nullif(fee ->> 'rate_id', '')::uuid;
      else
        new.agreed_commission_minor := 0;
        new.agreed_commission_rate_id := null;
      end if;
    else
      new.agreed_commission_minor := 0;
      new.agreed_commission_rate_id := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.escrow_commission_at_funding() from public, anon, authenticated;

drop trigger if exists escrows_commission_at_funding on public.escrows;
create trigger escrows_commission_at_funding
  before insert or update on public.escrows
  for each row execute function private.escrow_commission_at_funding();

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
     * MON-P2-01. The commission is the one fixed at funding
     * (private.escrow_commission_at_funding), never a rate read now. F-7 still
     * holds: a purpose that permits no cut pays none.
     */
    if private.escrow_commission_is_permitted(e.purpose) then
      commission := least(coalesce(e.agreed_commission_minor, 0), e.amount_minor);
      rate_id := e.agreed_commission_rate_id;
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

CREATE OR REPLACE FUNCTION private.set_fee_rate(acting_admin uuid, p_kind fee_kind, p_basis_points integer, p_flat_minor bigint, p_effective_from timestamp with time zone, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_id uuid;
  starts timestamptz := coalesce(p_effective_from, now());
  current_rate record;
  is_super boolean;
begin
  if acting_admin is null
     or not (private.has_role(acting_admin, 'admin') or private.has_role(acting_admin, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  -- MON-P2-01. No rate above 20%.
  if p_basis_points is null or p_basis_points < 0 or p_basis_points > 2000 then
    return jsonb_build_object('status', 'bad_rate');
  end if;
  if p_flat_minor is null or p_flat_minor < 0 then
    return jsonb_build_object('status', 'bad_flat');
  end if;
  if p_note is null or char_length(btrim(p_note)) < 4 then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;
  if starts < now() - interval '1 minute' then
    return jsonb_build_object('status', 'cannot_backdate');
  end if;
  -- MON-P2-01. Raising what anybody pays is a super admin's decision.
  is_super := private.has_role(acting_admin, 'super_admin');
  select * into current_rate from public.fee_rate_at(p_kind, starts);
  if not is_super
     and (p_basis_points > coalesce(current_rate.basis_points, 0)
          or p_flat_minor > coalesce(current_rate.flat_minor, 0)) then
    return jsonb_build_object('status', 'raise_needs_super_admin');
  end if;

  insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, created_by, note)
  values (p_kind, p_basis_points, p_flat_minor, starts, acting_admin, btrim(p_note))
  returning id into new_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    acting_admin, 'fee_rate.set', 'fee_rate', new_id::text,
    jsonb_build_object(
      'kind', p_kind,
      'basis_points', p_basis_points,
      'flat_minor', p_flat_minor,
      'effective_from', starts,
      'note', btrim(p_note),
      'previous_basis_points', current_rate.basis_points,
      'previous_flat_minor', current_rate.flat_minor
    )
  );

  return jsonb_build_object('status', 'ok', 'rate_id', new_id, 'effective_from', starts);
exception when unique_violation then
  return jsonb_build_object('status', 'duplicate');
end;
$function$;
