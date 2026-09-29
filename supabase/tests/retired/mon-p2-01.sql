-- MON-P2-01: commission is fixed when an escrow is funded. A rate raised
-- after funding does not touch money already held; an escrow funded after the
-- rise pays it. The agreed figure cannot be rewritten. No rate above 20% can
-- be set, and a plain admin cannot raise a rate (a super admin can; lowering
-- is open to any admin). Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- payer
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';   -- payee
  mw uuid; before_rise uuid; after_rise uuid; r jsonb; n bigint;
begin
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  insert into public.wallets (user_id) values (lister) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 1000000, 'probe-monp201-deposit', 'COMPLETED');

  -- Funded while commission is 0.
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 100000, member) returning id into before_rise;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (mw, 'escrow_hold', 'debit', 100000, 'rm-esc-' || before_rise || '-hold', 'COMPLETED',
          jsonb_build_object('escrow_id', before_rise));
  update public.escrows set state = 'FUNDED', funded_at = now() where id = before_rise;
  update public.escrows set state = 'HELD', held_at = now() where id = before_rise;

  -- The rate rises to 10% while the money is held.
  insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, note)
  values ('commission', 1000, 0, now(), 'probe rise');

  -- Funded after the rise.
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 100000, member) returning id into after_rise;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (mw, 'escrow_hold', 'debit', 100000, 'rm-esc-' || after_rise || '-hold', 'COMPLETED',
          jsonb_build_object('escrow_id', after_rise));
  update public.escrows set state = 'FUNDED', funded_at = now() where id = after_rise;
  update public.escrows set state = 'HELD', held_at = now() where id = after_rise;

  r := private.escrow_settle(before_rise, 'release', 'RELEASED', null, 'probe');
  if (r ->> 'commission_minor')::bigint <> 0 then
    raise exception 'PROBE_FAIL mon-p2-01: a rate raised after funding took % from money already held', r ->> 'commission_minor';
  end if;
  r := private.escrow_settle(after_rise, 'release', 'RELEASED', null, 'probe');
  if (r ->> 'commission_minor')::bigint <> 10000 then
    raise exception 'PROBE_FAIL mon-p2-01: an escrow funded at 10%% paid %', r ->> 'commission_minor';
  end if;

  -- The agreed figure is fixed, even for the owner.
  begin
    update public.escrows set agreed_commission_minor = 0 where id = after_rise;
    raise exception 'PROBE_FAIL mon-p2-01: the agreed commission was rewritten';
  exception when insufficient_privilege then null; end;

  -- The ceiling, and who may raise.
  begin
    insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, note)
    values ('commission', 2500, 0, now() + interval '1 day', 'probe ceiling');
    raise exception 'PROBE_FAIL mon-p2-01: a 25%% rate was stored';
  exception when check_violation then null; end;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.set_fee_rate('commission', 1500, 0, now() + interval '1 hour', 'probe raise');
  if r ->> 'status' <> 'raise_needs_super_admin' then raise exception 'PROBE_FAIL mon-p2-01: a plain admin raised the rate: %', r; end if;
  r := public.set_fee_rate('commission', 2500, 0, now() + interval '2 hours', 'probe ceiling');
  if r ->> 'status' <> 'bad_rate' then raise exception 'PROBE_FAIL mon-p2-01: 25%% was accepted: %', r; end if;
  r := public.set_fee_rate('commission', 500, 0, now() + interval '3 hours', 'probe lower');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-01: a plain admin could not lower the rate: %', r; end if;
  reset role;
  insert into public.user_roles (user_id, role) values (admin, 'super_admin') on conflict do nothing;
  set local role authenticated;
  r := public.set_fee_rate('commission', 1500, 0, now() + interval '4 hours', 'probe super raise');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-01: a super admin could not raise the rate: %', r; end if;
  reset role;

  raise exception 'PROBE_OK mon-p2-01';
end $$;
