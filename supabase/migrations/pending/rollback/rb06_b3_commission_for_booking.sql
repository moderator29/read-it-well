-- ROLLBACK for pov06.
-- The live definition of private.b3_commission_for_booking, read from the
-- live database (pg_get_functiondef) on 13 October 2026, before pov06 adds
-- the hotel-room rate. Running this restores it: a room booking takes the
-- commission in its agreement's terms again. public.scoped_commission_rates
-- stays (append-only history); nothing reads it once this is restored.
set lock_timeout = '5s';

CREATE OR REPLACE FUNCTION private.b3_commission_for_booking(p_booking uuid, p_amount_minor bigint, p_agreement uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
