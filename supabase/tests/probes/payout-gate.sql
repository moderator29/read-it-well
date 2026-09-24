-- A4 PAYOUT GATE: while bank payouts are closed, no member and no server path can place a
-- withdrawal hold; the switch alone decides; a missing switch row reads as closed.
-- Rolled back by the final raise.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  wallet uuid;
  result jsonb;
begin
  -- A wallet with money in it, so a refusal cannot be the balance talking.
  insert into public.wallets (user_id) values (member) returning id into wallet;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (wallet, 'deposit', 'credit', 1000000, 'probe-payout-gate-deposit', 'COMPLETED');

  -- 1. The member cannot call the hold at all.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    perform public.hold_wallet_withdrawal(member, 5000, 'probe-payout-gate-member', '{}'::jsonb);
    raise exception 'PROBE_FAIL payout-gate: a member called hold_wallet_withdrawal';
  exception when insufficient_privilege then null;
  end;
  -- 2. Nor write the debit themselves.
  begin
    insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
    values (wallet, 'withdrawal', 'debit', 5000, 'probe-payout-gate-direct', 'PENDING');
    raise exception 'PROBE_FAIL payout-gate: a member wrote a withdrawal debit';
  exception when insufficient_privilege then null;
  end;
  -- 3. Nor read or open the switch.
  begin
    perform 1 from private.platform_switches;
    raise exception 'PROBE_FAIL payout-gate: a member read the switch';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 4. The server path is refused too while the switch is closed.
  set local role service_role;
  begin
    perform public.hold_wallet_withdrawal(member, 5000, 'probe-payout-gate-server', '{}'::jsonb);
    raise exception 'PROBE_FAIL payout-gate: the service role placed a withdrawal hold while payouts are closed';
  exception when sqlstate 'RM051' then null;
  end;
  begin
    perform 1 from private.platform_switches;
    raise exception 'PROBE_FAIL payout-gate: the service role read the switch';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 5. The switch, and only the switch, is what refused: opened, the same hold succeeds.
  update private.platform_switches set is_open = true where name = 'bank_payouts';
  set local role service_role;
  result := public.hold_wallet_withdrawal(member, 5000, 'probe-payout-gate-open', '{}'::jsonb);
  reset role;
  if result->>'status' <> 'ok' then
    raise exception 'PROBE_FAIL payout-gate: with the switch open the hold answered %', result;
  end if;

  -- 6. A missing row reads as closed.
  delete from private.platform_switches where name = 'bank_payouts';
  if private.bank_payouts_open() then
    raise exception 'PROBE_FAIL payout-gate: no switch row read as open';
  end if;

  raise exception 'PROBE_OK payout-gate';
end $$;
