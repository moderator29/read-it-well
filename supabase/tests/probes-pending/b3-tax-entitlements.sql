-- B3-TAX-ENTITLEMENTS: an unconfirmed tax line is absent, the default plan
-- answers as seeded, a member cannot see promotion inventory or grant a plan.
-- Needs b3_money_policy_versions.sql and b3_tax_entitlements_promotion.sql applied.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  n int;
begin
  if public.tax_line_at('vat_on_vallo_fee')->>'status' <> 'unconfirmed' then
    raise exception 'PROBE_FAIL b3-tax-entitlements 1: VAT resolved to a rate';
  end if;
  begin
    insert into public.tax_schedule_lines (tax_kind, effective_from, rate_bps, borne_by, note)
    values ('stamp_duty_tenancy', now() + interval '50 years', 100, 'lister', 'no source');
    raise exception 'PROBE_FAIL b3-tax-entitlements 2: a rate without a source was written';
  exception when check_violation then null;
  end;
  if not public.entitlement_check(member, 'saved_search_alerts') or public.entitlement_check(member, 'listing_prime') then
    raise exception 'PROBE_FAIL b3-tax-entitlements 3: default plan wrong';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select count(*) into n from promotion.placements;
    raise exception 'PROBE_FAIL b3-tax-entitlements 4: a member read promotion inventory';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_entitlement_plans (user_id, plan_id, reason)
    select member, id, 'self-grant' from public.entitlement_plans limit 1;
    raise exception 'PROBE_FAIL b3-tax-entitlements 5: a member granted themselves a plan';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'PROBE_OK b3-tax-entitlements';
end $$;
