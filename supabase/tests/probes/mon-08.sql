-- MON-08: a pot's balance is the ledger's. The member reads it through
-- public.wallet_pot_balances (their own pots only); moving money out is
-- decided on the derived balance, so a stored copy that has drifted upward
-- cannot pay out money the pot never held. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  pot uuid;
  mw uuid;
  r jsonb;
  n int;
  bal bigint;
begin
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 100000, 'probe-mon08-deposit', 'COMPLETED');

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  insert into public.wallet_pots (user_id, name) values (member, 'Probe MON-08 pot') returning id into pot;
  reset role;

  r := public.move_into_pot(member, pot, 50000, 'probe-mon08-in');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL mon-08: move in %', r; end if;

  -- The member reads the derived balance; somebody else reads nothing.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  select balance_minor into bal from public.wallet_pot_balances where id = pot;
  if bal is distinct from 50000 then raise exception 'PROBE_FAIL mon-08: member reads %', bal; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  select count(*) into n from public.wallet_pot_balances where id = pot;
  if n <> 0 then raise exception 'PROBE_FAIL mon-08: another member read the pot'; end if;
  -- A non-owner reaching the function itself learns nothing either.
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  if private.pot_balance_minor(pot) <> 0 then raise exception 'PROBE_FAIL mon-08: a stranger read the balance'; end if;
  reset role;
  set local role anon;
  begin
    perform 1 from public.wallet_pot_balances limit 1;
    raise exception 'PROBE_FAIL mon-08: anon read pot balances';
  exception when insufficient_privilege then null; end;
  reset role;

  -- A stored copy that drifted upward pays out nothing the ledger never held.
  if exists (select 1 from information_schema.columns where table_schema = 'public'
               and table_name = 'wallet_pots' and column_name = 'balance_minor') then
    perform set_config('pots.moving', 'yes', true);
    execute format('update public.wallet_pots set balance_minor = 900000 where id = %L', pot);
    perform set_config('pots.moving', '', true);
  end if;
  r := public.move_out_of_pot(member, pot, 60000, 'probe-mon08-out-too-much');
  if r->>'status' <> 'insufficient' or (r->>'pot_minor')::bigint <> 50000 then
    raise exception 'PROBE_FAIL mon-08: paid out more than the pot held: %', r;
  end if;
  r := public.move_out_of_pot(member, pot, 50000, 'probe-mon08-out');
  if r->>'status' <> 'ok' or (r->>'pot_minor')::bigint <> 0 then raise exception 'PROBE_FAIL mon-08: move out %', r; end if;
  if private.pot_balance_minor(pot) <> 0 then raise exception 'PROBE_FAIL mon-08: pot not empty'; end if;

  raise exception 'PROBE_OK mon-08';
end $$;
