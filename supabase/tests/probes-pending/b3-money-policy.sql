-- B3-MONEY-POLICY: the dated policy, its resolver and its history.
-- Needs supabase/migrations/pending/b3_money_policy_versions.sql applied.
--  1. the version in force carries 200 / 0 / 0 / unregistered / 1,000 naira minimum
--  2. 2 percent of 1,800,000 naira is 36,000 naira through the resolver
--  3. a per-type cap above a threshold applies only above the threshold
--  4. withdrawal bands: 50 / 200 (gap closed) / 300 / top band unconfirmed, below minimum refused
--  5. a policy row cannot be edited or deleted; closing an open window once is allowed
--  6. a member cannot write policy
do $$
declare
  v public.money_policy_versions%rowtype;
  v2 bigint;
  q jsonb;
begin
  v := public.money_policy_at(now());
  if v.id is null or v.commission_bps <> 200 or v.guarantee_bps <> 0 or v.vat_bps <> 0
     or v.vat_registered or v.withdrawal_min_minor <> 100000 then
    raise exception 'PROBE_FAIL b3-money-policy 1: policy in force is %', to_jsonb(v);
  end if;

  q := public.commission_quote(v.id, 'apartment', 180000000);
  if (q->>'commission_minor')::bigint <> 3600000 or (q->>'net_minor')::bigint <> 176400000 then
    raise exception 'PROBE_FAIL b3-money-policy 2: %', q;
  end if;

  -- 3. A test version with a land cap: 2 percent, capped at 500,000 naira above 10,000,000 naira.
  insert into public.money_policy_versions (version, effective_from, commission_bps, guarantee_bps, vat_bps,
                                            vat_registered, withdrawal_min_minor, note)
  values ('probe-b3', now() + interval '100 years', 200, 0, 0, false, 100000, 'probe, rolled back')
  returning id into v2;
  insert into public.money_policy_commission_rates (policy_version_id, property_type, commission_bps, cap_threshold_minor, cap_minor)
  values (v2, 'land', 200, 1000000000, 50000000);
  q := public.commission_quote(v2, 'land', 8000000000);
  if (q->>'commission_minor')::bigint <> 50000000 or (q->>'cap_applied')::boolean is not true then
    raise exception 'PROBE_FAIL b3-money-policy 3a: 80,000,000 naira land should cap at 500,000: %', q;
  end if;
  q := public.commission_quote(v2, 'land', 500000000);
  if (q->>'commission_minor')::bigint <> 10000000 or (q->>'cap_applied')::boolean then
    raise exception 'PROBE_FAIL b3-money-policy 3b: below the threshold no cap: %', q;
  end if;
  q := public.commission_quote(v2, 'apartment', 8000000000);
  if (q->>'commission_minor')::bigint <> 160000000 then
    raise exception 'PROBE_FAIL b3-money-policy 3c: a type without a row takes the version default: %', q;
  end if;

  if (public.withdrawal_fee_quote(5000000)->>'vallo_fee_minor')::bigint <> 5000
     or (public.withdrawal_fee_quote(15000000)->>'vallo_fee_minor')::bigint <> 20000
     or (public.withdrawal_fee_quote(199999999)->>'vallo_fee_minor')::bigint <> 30000
     or public.withdrawal_fee_quote(200000000)->>'status' <> 'band_unconfirmed'
     or public.withdrawal_fee_quote(99999)->>'status' <> 'below_minimum' then
    raise exception 'PROBE_FAIL b3-money-policy 4: bands wrong';
  end if;

  begin
    update public.money_policy_versions set commission_bps = 300 where id = v.id;
    raise exception 'PROBE_FAIL b3-money-policy 5a: a policy row was edited';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.money_policy_versions where id = v2;
    raise exception 'PROBE_FAIL b3-money-policy 5d: a policy row was deleted';
  exception when insufficient_privilege then null;
  end;
  begin
    truncate public.money_policy_withdrawal_bands;
    raise exception 'PROBE_FAIL b3-money-policy 5e: policy bands were truncated';
  exception when insufficient_privilege then null;
  end;
  if (select guarantee_bps from public.money_policy) <> 0 then
    raise exception 'PROBE_FAIL b3-money-policy 7: the singleton still carries a Guarantee rate';
  end if;
  begin
    update public.money_policy_commission_rates set commission_bps = 1 where policy_version_id = v2;
    raise exception 'PROBE_FAIL b3-money-policy 5b: a per-type rate was edited';
  exception when insufficient_privilege then null;
  end;
  update public.money_policy_versions set effective_to = now() + interval '101 years' where id = v2;
  begin
    update public.money_policy_versions set effective_to = now() + interval '102 years' where id = v2;
    raise exception 'PROBE_FAIL b3-money-policy 5c: a closed window was moved';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', '957b3bd2-cce3-425d-bba9-5cd876ca3d62', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.money_policy_versions (version, effective_from, commission_bps, guarantee_bps, vat_bps,
                                              vat_registered, withdrawal_min_minor, note)
    values ('probe-member', now(), 0, 0, 0, false, 0, 'member');
    raise exception 'PROBE_FAIL b3-money-policy 6: a member wrote policy';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'PROBE_OK b3-money-policy';
end $$;
