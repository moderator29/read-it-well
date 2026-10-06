-- B3-RATE-GATE: no listing reaches review or publication without the lister's
-- recorded acceptance of the fee, on the rate in force and the current price.
-- Needs b3_money_policy_versions.sql and b3_rate_agreement_gate.sql applied.
--  1. a non-demo DRAFT moved to SUBMITTED without acceptance is refused
--  2. a stranger cannot accept for it; a stale version or price is refused
--  3. the owner accepts; the row carries member, time, version, naira figures
--  4. the same move now passes the rate gate
--  5. a price change re-opens the question
--  6. a member cannot insert an acceptance directly
--  7. the payment gate accepts a zero Guarantee leg with no reserve code
--     (read from the function body; no transaction row is written)
--  8. the gate also fires on price edits; acceptances cannot be truncated;
--     the split reads the acceptance as of the agreement (S1)
-- The DRAFT fixture is priced INSIDE the probe (rate_minor + rate_period, or
-- sale_price_minor for a sale); rent_amount_minor is never set without
-- rent_period. Everything is rolled back by the final raise.
do $$
declare
  lst record;
  v public.money_policy_versions%rowtype;
  price bigint;
  q jsonb;
  acc public.listing_rate_acceptances%rowtype;
  stranger constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
begin
  select l.id, a.user_id, l.listing_intent, l.sale_price_minor, l.rent_amount_minor, l.rate_minor
    into lst
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.status = 'DRAFT' and not coalesce(l.is_demo, false) and l.closed_at is null
     and a.user_id is not null and a.user_id <> stranger
   limit 1;
  if lst.id is null then
    raise exception 'PROBE_FAIL b3-rate-gate 0: no non-demo DRAFT listing to exercise';
  end if;
  -- Price the fixture (the live DRAFT is unpriced).
  if lst.listing_intent = 'sale' then
    update public.listings set sale_price_minor = 5000000 where id = lst.id;
    price := 5000000;
  else
    update public.listings set rate_minor = 5000000, rate_period = 'night' where id = lst.id;
    price := coalesce(lst.rent_amount_minor, 5000000);
  end if;
  v := public.money_policy_at(now());

  begin
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
    raise exception 'PROBE_FAIL b3-rate-gate 1: a listing went for review with no acceptance';
  exception when insufficient_privilege then
    if sqlerrm not like 'rate_agreement_required%' then
      raise exception 'PROBE_FAIL b3-rate-gate 1: refused, but by another gate first: %', sqlerrm;
    end if;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  set local role authenticated;
  q := public.accept_listing_rate(lst.id, v.id, price);
  if q->>'status' <> 'not_found' then
    raise exception 'PROBE_FAIL b3-rate-gate 2a: a stranger accepted: %', q;
  end if;
  begin
    insert into public.listing_rate_acceptances (listing_id, member_id, policy_version_id, property_type, amount_minor,
                                                 commission_bps, commission_minor, net_minor, figures_shown)
    values (lst.id, stranger, v.id, 'apartment', 100, 0, 0, 100, '{}');
    raise exception 'PROBE_FAIL b3-rate-gate 6: a member inserted an acceptance directly';
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', lst.user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  q := public.accept_listing_rate(lst.id, v.id + 1000000, price);
  if q->>'status' <> 'rate_changed' then raise exception 'PROBE_FAIL b3-rate-gate 2b: stale version: %', q; end if;
  q := public.accept_listing_rate(lst.id, v.id, price + 1);
  if q->>'status' <> 'price_changed' then raise exception 'PROBE_FAIL b3-rate-gate 2c: stale price: %', q; end if;
  q := public.accept_listing_rate(lst.id, v.id, price);
  if q->>'status' <> 'ok' then raise exception 'PROBE_FAIL b3-rate-gate 3: owner could not accept: %', q; end if;
  reset role;

  select * into acc from public.listing_rate_acceptances where id = (q->>'acceptance_id')::uuid;
  if acc.member_id <> lst.user_id or acc.policy_version_id <> v.id or acc.amount_minor <> price
     or acc.commission_minor + acc.net_minor <> price or acc.figures_shown->>'amount_naira' is null then
    raise exception 'PROBE_FAIL b3-rate-gate 3: acceptance row wrong: %', to_jsonb(acc);
  end if;

  begin
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
  exception when others then
    if sqlerrm like 'rate_agreement_required%' then
      raise exception 'PROBE_FAIL b3-rate-gate 4: accepted listing still refused';
    end if;
    -- another gate (photos, supply proof, EDD) may refuse this DRAFT; the rate gate passed.
  end;

  begin
    if lst.listing_intent = 'sale' then
      update public.listings set sale_price_minor = price + 100, status = 'DRAFT' where id = lst.id;
    elsif lst.rent_amount_minor is null then
      update public.listings set rate_minor = price + 100, status = 'DRAFT' where id = lst.id;
    else
      -- rent already has its rent_period on this row; only the amount moves.
      update public.listings set rent_amount_minor = price + 100, status = 'DRAFT' where id = lst.id;
    end if;
    update public.listings set status = 'SUBMITTED', submitted_at = now() where id = lst.id;
    raise exception 'PROBE_FAIL b3-rate-gate 5: a re-priced listing went for review on the old acceptance';
  exception when insufficient_privilege then
    if sqlerrm not like 'rate_agreement_required%' then
      raise exception 'PROBE_FAIL b3-rate-gate 5: refused by another gate: %', sqlerrm;
    end if;
  end;

  if position('coalesce(new.guarantee_minor, 0) > 0' in pg_get_functiondef('private.transactions_payment_gate()'::regprocedure)) = 0 then
    raise exception 'PROBE_FAIL b3-rate-gate 7: payment gate still demands a reserve at zero';
  end if;

  if position('rent_amount_minor' in pg_get_triggerdef((select oid from pg_trigger where tgname = 'listings_zz_b3_rate_agreement_gate'))) = 0 then
    raise exception 'PROBE_FAIL b3-rate-gate 8a: the gate does not fire on price edits';
  end if;
  begin
    truncate public.listing_rate_acceptances;
    raise exception 'PROBE_FAIL b3-rate-gate 8b: acceptances were truncated';
  exception when insufficient_privilege then null;
  end;
  if position('ag.created_at' in pg_get_functiondef('private.b3_commission_for_booking(uuid,bigint,uuid)'::regprocedure)) = 0 then
    raise exception 'PROBE_FAIL b3-rate-gate 8c: the split does not read the acceptance as of the agreement';
  end if;

  raise exception 'PROBE_OK b3-rate-gate';
end $$;
