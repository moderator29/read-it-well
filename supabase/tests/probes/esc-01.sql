-- ESC-01: a ruling on a never-funded escrow must credit nothing. An unfunded
-- proposal cannot be disputed, INITIATED -> DISPUTED is illegal, a DISPUTED
-- agreement with no posted hold (reached through FUNDED) is refused at
-- settlement as never_funded, a member cannot rule, a release is refused (and
-- alerted) while the float is short, and a funded dispute is still refunded.
-- Always rolls back.
do $$
declare
  member uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  phantom uuid; funded uuid; mw uuid; aw uuid; r jsonb; n int; bal0 bigint;
begin
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  insert into public.wallets (user_id) values (admin) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  select id into aw from public.wallets where user_id = admin;

  -- ATTACK 1: a N5,000,000 proposal, never funded, disputed by its payer.
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, admin, 'agency_fee', 500000000, member) returning id into phantom;
  r := public.escrow_raise_dispute_as(member, phantom, 'probe: never funded');
  if r->>'status' <> 'not_disputable' then raise exception 'PROBE_FAIL esc-01: unfunded dispute answered %', r; end if;
  begin
    update public.escrows set state = 'DISPUTED' where id = phantom;
    raise exception 'PROBE_FAIL esc-01: INITIATED -> DISPUTED is still legal';
  exception when others then
    if sqlerrm like 'PROBE_FAIL%' then raise; end if;
  end;

  -- ATTACK 2: reach DISPUTED without a hold by the remaining legal path
  -- (FUNDED with nothing posted), then rule on it as an admin over the API.
  update public.escrows set state = 'FUNDED' where id = phantom;
  update public.escrows set state = 'DISPUTED' where id = phantom;
  bal0 := private.wallet_spendable_locked(mw);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(phantom, 'refund', 'probe: ruling on money that was never taken');
  reset role;
  if r->>'status' <> 'never_funded' then raise exception 'PROBE_FAIL esc-01: phantom ruling answered %', r; end if;
  if private.wallet_spendable_locked(mw) <> bal0 then raise exception 'PROBE_FAIL esc-01: phantom ruling credited money'; end if;
  select count(*) into n from public.wallet_entries where metadata->>'escrow_id' = phantom::text;
  if n <> 0 then raise exception 'PROBE_FAIL esc-01: % ledger rows for the phantom', n; end if;

  -- CONTROL: a funded, held, disputed agreement is ruled on and settles.
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 100000, 'probe-esc01-dep-' || gen_random_uuid(), 'COMPLETED');
  r := public.escrow_fund_from_wallet_as(member, admin, null, 'agency_fee', 100000, 'probe-esc01-hold-' || gen_random_uuid(), 21);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-01: control fund %', r; end if;
  funded := (r->>'escrow_id')::uuid;
  r := public.escrow_raise_dispute_as(member, funded, 'probe: funded dispute');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-01: control dispute %', r; end if;
  bal0 := private.wallet_spendable_locked(mw);

  -- REFUSAL: a member cannot rule.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(funded, 'refund', 'probe: the member tries to rule on it');
  if r->>'status' <> 'forbidden' then raise exception 'PROBE_FAIL esc-01: member ruling answered %', r; end if;

  -- The float is checked before any ruling. A stray credit makes the ledger
  -- hold less than the live agreements promise: a release is refused and an
  -- alert raised; a refund (this agreement's own hold back to its payer) is
  -- still allowed.
  reset role;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (aw, 'escrow_release', 'credit', 1, 'probe-esc01-stray-' || gen_random_uuid(), 'COMPLETED', '{}'::jsonb);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(funded, 'release', 'probe: releasing while the float is short');
  if r->>'status' <> 'float_out_of_balance' then raise exception 'PROBE_FAIL esc-01: short-float release answered %', r; end if;
  r := public.escrow_admin_resolve(funded, 'refund', 'probe: the funded dispute is refunded');
  reset role;
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-01: control refund under a short float %', r; end if;
  if private.wallet_spendable_locked(mw) - bal0 <> 100000 then raise exception 'PROBE_FAIL esc-01: control refund did not land'; end if;
  select count(*) into n from public.risk_alerts where entity_type = 'escrow' and entity_id = funded::text and status = 'open';
  if n < 1 then raise exception 'PROBE_FAIL esc-01: no alert when the float was short'; end if;

  raise exception 'PROBE_OK esc-01';
end $$;
