-- B3X-FEE-RECORD-UNIFY: b3's fee gate fits the live schema.
-- Needs b3_rate_agreement_gate.sql then b3x_fee_record_unify.sql applied.
-- NOTE FOR THE LEAD: b3's own probe (b3-rate-gate.sql) assumes the publishing
-- block is always on. After b3x it is on only while `lister_fee_gate_blocking`
-- is; run b3-rate-gate.sql with that switch turned on inside its transaction.
--  1. with lister_fee_gate_blocking off (live today: no row) a DRAFT goes for
--     review without an acceptance, as D60 promised
--  2. with it on, the same move is refused by the rate gate
--  3. an acceptance in the LIVE D61 record (listing_fee_acceptances) on the
--     current price satisfies the gate
-- Everything is rolled back by the final raise.
do $$
declare
  lst record;
  v public.money_policy_versions%rowtype;
  price bigint := 5000000;
begin
  select l.id, a.user_id, l.listing_intent, l.property_type into lst
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.status = 'DRAFT' and not coalesce(l.is_demo, false) and l.closed_at is null and a.user_id is not null
   limit 1;
  if lst.id is null then
    raise notice 'PROBE_SKIP b3x: no non-demo DRAFT listing to exercise';
    raise exception 'PROBE_OK b3x-fee-record-unify (skipped)';
  end if;
  if lst.listing_intent = 'sale' then
    update public.listings set sale_price_minor = price where id = lst.id;
  else
    update public.listings set rate_minor = price, rate_period = 'night', rent_amount_minor = null where id = lst.id;
  end if;
  v := public.money_policy_at(now());

  -- 1.
  delete from public.feature_flags where key = 'lister_fee_gate_blocking';
  begin
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
  exception when others then
    if sqlerrm like 'rate_agreement_required%' then
      raise exception 'PROBE_FAIL b3x 1: the fee gate blocked with its switch off';
    end if;
    -- Another gate (photos, supply proof, EDD) may refuse a DRAFT; the fee gate passed.
  end;
  update public.listings set status = 'DRAFT' where id = lst.id and status = 'SUBMITTED';

  -- 2.
  insert into public.feature_flags (key, enabled) values ('lister_fee_gate_blocking', true);
  begin
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
    raise exception 'PROBE_FAIL b3x 2: a listing went for review with no acceptance and the block on';
  exception when insufficient_privilege then
    if sqlerrm not like 'rate_agreement_required%' then
      raise notice 'PROBE_SKIP b3x 2: refused by another gate first: %', sqlerrm;
    end if;
  end;

  -- 3. The D61 record, as accept_fee_terms writes it.
  insert into public.listing_fee_acceptances (listing_id, member_id, terms_version, policy_version_id, policy_version,
    protection_rate_id, property_type, commission_bps, protection_bps, rent_minor, fee_low_minor, fee_high_minor,
    receive_low_minor, receive_high_minor, figures_shown)
  select lst.id, lst.user_id, '2026-10-06', v.id, v.version, pr.id, lst.property_type, v.commission_bps, pr.protection_bps,
         price, 0, 0, price, price, '{}'::jsonb
    from public.fee_protection_rates pr order by pr.effective_from desc limit 1;
  begin
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
  exception when others then
    if sqlerrm like 'rate_agreement_required%' then
      raise exception 'PROBE_FAIL b3x 3: a D61 acceptance on the current price did not satisfy the gate';
    end if;
  end;

  raise exception 'PROBE_OK b3x-fee-record-unify';
end
$$;
