-- B3X: b3_rate_agreement_gate, made to fit the live schema of 7 October 2026.
-- Pending: NOT applied. Apply IMMEDIATELY AFTER b3_rate_agreement_gate.sql, in the
-- same sitting (b3 alone would block publishing and listing payments; see below).
-- Probe: supabase/tests/probes-pending/b3x-fee-record-unify.sql.
--
-- WHAT WAS CHECKED AGAINST LIVE (read only)
--  * b3 depends on money_policy_versions (b3_money_policy_versions): live
--    (20261006103626), with 2026-10-06.1 in force (commission 200 bps).
--  * Live ALSO has a second, later lister acceptance record: D61's
--    `listing_fee_acceptances`, written by `public.accept_fee_terms`
--    (b3_fee_acceptance_record, 20261006150758). b3 reads ONLY its own
--    `listing_rate_acceptances` (written by `accept_listing_rate`).
--  * No screen writes either today: the listing wizard records through
--    `public.lister_fee_accept`, which does not exist on live
--    (lib/money/lister-fee-actions.ts; Session 3 asked for it, R-C2-2).
--  * D60 put the publishing block behind `lister_fee_gate_blocking` (no row on
--    live, so off) until a real acceptance record exists. b3's listing trigger
--    ignores that switch.
-- So b3 applied alone would (a) refuse every non-demo listing moving to SUBMITTED
-- or PUBLISHED, because nobody can write the acceptance it reads, and (b) answer
-- `rate_not_accepted` from payment_split_for_booking for every listing booking,
-- closing payment on every listing deal and every instant listing stay (D73).
--
-- WHAT THIS CHANGES (b3's own functions, redefined; b3's file is not edited)
--  1. private.b3_rate_agreement_gate: blocks only while `lister_fee_gate_blocking`
--     is on (D60), and accepts an acceptance in EITHER record on the current price
--     (and, for a lister-driven move, the version in force, or at submission).
--  2. private.b3_commission_for_booking: a listing booking reads the latest
--     acceptance in EITHER record made no later than the agreement. With none:
--     while the publishing block is off, the money policy in force when the
--     agreement was made (as for a hotel room, source 'policy_no_acceptance');
--     once the block is on, `rate_not_accepted` exactly as b3 intended.
-- NOT CHANGED: everything else in b3 (the acceptance table and functions, the
-- split shapes, the gate's reserve rule, crypto).

create or replace function private.b3_rate_agreement_gate()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v public.money_policy_versions%rowtype;
  v_sub public.money_policy_versions%rowtype;
  new_price bigint;
  old_price bigint;
  need_current boolean;
begin
  if new.status not in ('SUBMITTED', 'PUBLISHED') then return new; end if;
  if coalesce(new.is_demo, false) then return new; end if;
  -- D60: the block waits for its switch, off until a screen records acceptance.
  if not coalesce((select f.enabled from public.feature_flags f where f.key = 'lister_fee_gate_blocking'), false) then
    return new;
  end if;
  new_price := case when new.listing_intent = 'sale' then new.sale_price_minor
                    else coalesce(new.rent_amount_minor, new.rate_minor) end;
  if tg_op = 'UPDATE' and old.status = new.status then
    old_price := case when old.listing_intent = 'sale' then old.sale_price_minor
                      else coalesce(old.rent_amount_minor, old.rate_minor) end;
    if new.status <> 'PUBLISHED' or new_price is not distinct from old_price then
      return new;
    end if;
  end if;
  v := public.money_policy_at(now());
  if tg_op = 'UPDATE' and old.status in ('SUBMITTED', 'APPROVED') and new.status = 'PUBLISHED' then
    v_sub := public.money_policy_at(coalesce(new.submitted_at, old.submitted_at, now()));
  end if;
  need_current := tg_op = 'INSERT' or old.status in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED');
  if v.id is null or not (
       exists (select 1 from public.listing_rate_acceptances a
                where a.listing_id = new.id and a.amount_minor = new_price
                  and (not need_current or a.policy_version_id = v.id or a.policy_version_id = v_sub.id))
       or exists (select 1 from public.listing_fee_acceptances f
                   where f.listing_id = new.id and f.rent_minor = new_price
                     and (not need_current or f.policy_version_id = v.id or f.policy_version_id = v_sub.id))) then
    raise exception 'rate_agreement_required: the lister has not accepted the current fee on this price'
      using errcode = '42501', hint = 'accept_fee_terms';
  end if;
  return new;
end;
$$;
revoke all on function private.b3_rate_agreement_gate() from public, anon, authenticated;

create or replace function private.b3_commission_for_booking(p_booking uuid, p_amount_minor bigint, p_agreement uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  bk public.bookings%rowtype;
  ag public.deal_agreements%rowtype;
  v public.money_policy_versions%rowtype;
  acc record;
  fee bigint;
  bps integer;
begin
  select * into bk from public.bookings where id = p_booking;
  select * into ag from public.deal_agreements where id = p_agreement;
  if bk.id is null or ag.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if bk.listing_id is not null then
    -- The latest acceptance, in either record, made no later than the agreement.
    select x.* into acc from (
      select a.id, a.accepted_at, a.commission_bps, a.cap_threshold_minor, a.cap_minor, 'rate' as record
        from public.listing_rate_acceptances a
       where a.listing_id = bk.listing_id and a.accepted_at <= ag.created_at
      union all
      select f.id, f.accepted_at, f.commission_bps, f.cap_threshold_minor, f.cap_minor, 'fee' as record
        from public.listing_fee_acceptances f
       where f.listing_id = bk.listing_id and f.accepted_at <= ag.created_at
    ) x order by x.accepted_at desc, x.id desc limit 1;
    if acc.id is not null then
      fee := (p_amount_minor * acc.commission_bps) / 10000;
      if acc.cap_threshold_minor is not null and p_amount_minor > acc.cap_threshold_minor then
        fee := least(fee, acc.cap_minor);
      end if;
      return jsonb_build_object('status', 'ok', 'commission_bps', acc.commission_bps, 'source', 'acceptance',
                                'commission_minor', fee, 'acceptance_id', acc.id, 'acceptance_record', acc.record);
    end if;
    if coalesce((select f.enabled from public.feature_flags f where f.key = 'lister_fee_gate_blocking'), false) then
      return jsonb_build_object('status', 'rate_not_accepted');
    end if;
    v := public.money_policy_at(ag.created_at);
    if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
    return jsonb_build_object('status', 'ok', 'commission_bps', v.commission_bps, 'source', 'policy_no_acceptance',
                              'commission_minor', (p_amount_minor * v.commission_bps) / 10000,
                              'acceptance_id', null, 'policy_version_id', v.id);
  end if;
  if ag.terms ? 'commission_bps' and jsonb_typeof(ag.terms->'commission_bps') = 'number' then
    bps := (ag.terms->>'commission_bps')::integer;
    if bps < 0 or bps > 10000 then return jsonb_build_object('status', 'amount_mismatch'); end if;
    return jsonb_build_object('status', 'ok', 'commission_bps', bps, 'source', 'terms',
                              'commission_minor', (p_amount_minor * bps) / 10000, 'acceptance_id', null);
  end if;
  v := public.money_policy_at(ag.created_at);
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  return jsonb_build_object('status', 'ok', 'commission_bps', v.commission_bps, 'source', 'policy',
                            'commission_minor', (p_amount_minor * v.commission_bps) / 10000,
                            'acceptance_id', null, 'policy_version_id', v.id);
end;
$$;
revoke all on function private.b3_commission_for_booking(uuid, bigint, uuid) from public, anon, authenticated;
