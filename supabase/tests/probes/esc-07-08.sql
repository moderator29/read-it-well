-- ESC-07 and ESC-08. Rolls back.
-- ESC-08: an admin who is not a super admin, and anon, cannot write the
-- held_payments switch; a super admin can create it but not switch it on while
-- custody is undecided; every flag change writes audit_log; propose and fund
-- refuse in the database while the gate is closed, and pass it once custody is
-- decided and the switch is on.
-- ESC-07: a plain admin cannot rule; a super admin who is a party cannot rule;
-- below N500,000 one super admin rules; at or above it the first ruling is a
-- proposal, the proposer cannot approve it, a contrary ruling is refused and a
-- second super admin applies it; the proposer or approver cannot reverse, a
-- third super admin can, the escrow is DISPUTED again with the float whole, and
-- it can be ruled again; a reversal that would overdraw the credited wallet is
-- refused and put on the desk. After a reversal the next ruling needs two
-- people. A reversal keeps the removed commission row in the audit log. The
-- ruling rows cannot be edited or deleted, even by the service role or the
-- owner; the service role cannot fund through escrow_hold or create an
-- agreement while the gate is closed. Every ruling change is in audit_log.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- payer
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';   -- super admin 1 (granted here)
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';   -- payee
  sa2 uuid := gen_random_uuid();
  sa3 uuid := gen_random_uuid();
  small uuid; big uuid; mw uuid; lw uuid;
  r jsonb; n int; a0 int; st text; rid uuid; f jsonb;
begin
  -- Two throwaway staff accounts, so no real person is used as an actor.
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (sa2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-esc07-sa2@example.invalid', '{}', '{}', now(), now()),
         (sa3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-esc07-sa3@example.invalid', '{}', '{}', now(), now());

  ------------------------------------------------------------------ ESC-08
  delete from public.feature_flags where key = 'held_payments';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  begin
    insert into public.feature_flags (key, enabled) values ('held_payments', false);
    raise exception 'PROBE_FAIL esc-08: a plain admin created the held_payments switch';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    insert into public.feature_flags (key, enabled) values ('held_payments', false);
    raise exception 'PROBE_FAIL esc-08: anon wrote a switch';
  exception when insufficient_privilege then null; end;
  reset role;

  insert into public.user_roles (user_id, role) values (admin, 'super_admin'), (sa2, 'super_admin'), (sa3, 'super_admin');
  select count(*) into a0 from public.audit_log where entity_type = 'feature_flag' and entity_id = 'held_payments';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  insert into public.feature_flags (key, enabled) values ('held_payments', false);
  begin
    update public.feature_flags set enabled = true where key = 'held_payments';
    raise exception 'PROBE_FAIL esc-08: the switch opened while custody is undecided';
  exception when insufficient_privilege then null; end;
  reset role;
  select count(*) into n from public.audit_log where entity_type = 'feature_flag' and entity_id = 'held_payments';
  if n <> a0 + 1 then raise exception 'PROBE_FAIL esc-08: % audit rows for the switch, expected %', n, a0 + 1; end if;

  r := public.escrow_propose_as(member, gen_random_uuid(), lister, 'agency_fee', 100000, true);
  if r->>'status' <> 'held_payments_closed' then raise exception 'PROBE_FAIL esc-08: propose with the gate closed: %', r; end if;
  r := public.escrow_fund_proposal_as(member, gen_random_uuid(), 21);
  if r->>'status' <> 'held_payments_closed' then raise exception 'PROBE_FAIL esc-08: fund with the gate closed: %', r; end if;
  set local role service_role;
  begin
    insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
    values (member, lister, 'agency_fee', 100000, member);
    raise exception 'PROBE_FAIL esc-08: the service role created an agreement with the gate closed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.escrow_hold(gen_random_uuid(), member, 100000, 'probe-esc08-hold', 'agency_fee', 21);
    raise exception 'PROBE_FAIL esc-08: the service role reached escrow_hold';
  exception when insufficient_privilege then null; end;
  reset role;
  -- CONTROL: custody decided and the switch on, the gate passes.
  update private.platform_settings set value = 'trustee' where key = 'custody_structure';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.feature_flags set enabled = true where key = 'held_payments';
  reset role;
  r := public.escrow_propose_as(member, gen_random_uuid(), lister, 'agency_fee', 100000, true);
  if r->>'status' = 'held_payments_closed' then raise exception 'PROBE_FAIL esc-08: gate still closed when open: %', r; end if;
  update public.feature_flags set enabled = false where key = 'held_payments';
  update private.platform_settings set value = 'undecided' where key = 'custody_structure';

  ------------------------------------------------------------------ ESC-07
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  insert into public.wallets (user_id) values (lister) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  select id into lw from public.wallets where user_id = lister;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 70000000, 'probe-esc07-deposit', 'COMPLETED');

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 1000000, member) returning id into small;
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 60000000, member) returning id into big;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (mw, 'escrow_hold', 'debit', 1000000, 'rm-esc-' || small || '-hold', 'COMPLETED', jsonb_build_object('escrow_id', small)),
         (mw, 'escrow_hold', 'debit', 60000000, 'rm-esc-' || big || '-hold', 'COMPLETED', jsonb_build_object('escrow_id', big));
  update public.escrows set state = 'FUNDED', funded_at = now() where id in (small, big);
  update public.escrows set state = 'HELD', held_at = now() where id in (small, big);
  update public.escrows set state = 'DISPUTED', disputed_at = now(), disputed_by = member, dispute_reason = 'probe' where id in (small, big);

  -- A plain admin cannot rule.
  delete from public.user_roles where user_id = admin and role = 'super_admin';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(small, 'refund', 'The payer never received what was agreed upon.');
  if r->>'status' <> 'forbidden' then raise exception 'PROBE_FAIL esc-07: a plain admin ruled: %', r; end if;
  reset role;
  insert into public.user_roles (user_id, role) values (admin, 'super_admin'), (lister, 'super_admin');
  set local role authenticated;
  -- A super admin who is a party cannot rule.
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(small, 'release', 'I am the payee and I say release it to me.');
  if r->>'status' <> 'conflicted' then raise exception 'PROBE_FAIL esc-07: a party ruled: %', r; end if;

  -- Below the threshold: one super admin rules.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(small, 'refund', 'The payer never received what was agreed upon.');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-07: small ruling %', r; end if;
  rid := (r->>'ruling_id')::uuid;

  -- The ruler cannot reverse their own ruling; another super admin can.
  r := public.escrow_reverse_ruling(rid, 'The refund was entered against the wrong party in error.');
  if r->>'status' <> 'needs_a_different_super_admin' then raise exception 'PROBE_FAIL esc-07: self reversal %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
  r := public.escrow_reverse_ruling(rid, 'The refund was entered against the wrong party in error.');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-07: reversal %', r; end if;
  reset role;
  select state::text into st from public.escrows where id = small;
  if st <> 'DISPUTED' then raise exception 'PROBE_FAIL esc-07: reversed escrow is %', st; end if;
  select status::text into st from public.wallet_entries where reference like 'escrow:refund:' || small || ':reversed:%';
  if st is distinct from 'REVERSED' then raise exception 'PROBE_FAIL esc-07: settlement credit is %', st; end if;
  f := private.escrow_float_components();
  if (f->>'difference_minor')::bigint <> 0 then raise exception 'PROBE_FAIL esc-07: float after reversal %', f; end if;
  -- It is ruled again, and after a reversal that takes two people.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(small, 'release', 'The work was delivered as agreed by both of them.');
  if r->>'status' <> 'awaiting_second_approval' then raise exception 'PROBE_FAIL esc-07: the reverser re-ruled alone %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(small, 'release', 'The work was delivered as agreed by both of them.');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-07: re-ruling %', r; end if;
  rid := (r->>'ruling_id')::uuid;
  reset role;

  -- A reversal of a commissioned release keeps the removed commission on record.
  insert into public.platform_revenue (source, amount_minor, escrow_id, reference)
  values ('escrow_commission', 1, small, 'escrow:commission:' || small)
  on conflict (reference) do nothing;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', sa3, 'role', 'authenticated')::text, true);
  r := public.escrow_reverse_ruling(rid, 'Reversing to prove the commission stays on record.');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-07: commissioned reversal %', r; end if;
  reset role;
  select count(*) into n from public.audit_log where action = 'platform_revenue.reversed' and entity_id = small::text
     and (metadata -> 'removed_row' ->> 'reference') = 'escrow:commission:' || small;
  if n <> 1 then raise exception 'PROBE_FAIL esc-07: the removed commission left no record'; end if;

  -- The ruling rows are kept: not the service role, not the owner, can edit or delete one.
  set local role service_role;
  begin
    update public.escrow_rulings set proposed_by = sa3 where id = rid;
    raise exception 'PROBE_FAIL esc-07: the service role rewrote a ruling';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.escrow_rulings where id = rid;
    raise exception 'PROBE_FAIL esc-07: the service role deleted a ruling';
  exception when insufficient_privilege then null; end;
  reset role;
  begin
    delete from public.escrow_rulings where id = rid;
    raise exception 'PROBE_FAIL esc-07: the owner deleted a ruling';
  exception when insufficient_privilege then null; end;
  begin
    update public.escrow_rulings set proposed_by = sa3 where id = rid;
    raise exception 'PROBE_FAIL esc-07: the owner rewrote who proposed a ruling';
  exception when insufficient_privilege then null; end;
  set local role authenticated;

  -- At the threshold: two people.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(big, 'release', 'The work was delivered as agreed by both of them.');
  if r->>'status' <> 'awaiting_second_approval' then raise exception 'PROBE_FAIL esc-07: big first %', r; end if;
  r := public.escrow_admin_resolve(big, 'release', 'The work was delivered as agreed by both of them.');
  if r->>'status' <> 'awaiting_second_approval' then raise exception 'PROBE_FAIL esc-07: proposer approved own %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
  r := public.escrow_admin_resolve(big, 'refund', 'I disagree and would refund the whole thing.');
  if r->>'status' <> 'conflicting_proposal' then raise exception 'PROBE_FAIL esc-07: contrary ruling %', r; end if;
  select state::text into st from public.escrows where id = big;
  if st <> 'DISPUTED' then raise exception 'PROBE_FAIL esc-07: big moved before approval: %', st; end if;
  r := public.escrow_admin_resolve(big, 'release', 'Agreed with the first reviewer on the evidence.');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL esc-07: second approval %', r; end if;
  rid := (r->>'ruling_id')::uuid;
  reset role;
  select count(*) into n from public.escrow_rulings where id = rid and proposed_by = admin and approved_by = sa2 and state = 'applied';
  if n <> 1 then raise exception 'PROBE_FAIL esc-07: the applied ruling does not name both people'; end if;

  -- Neither the proposer nor the approver can reverse it; a reversal that
  -- would overdraw the payee is refused.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
  r := public.escrow_reverse_ruling(rid, 'Reversing my own approval for the probe test.');
  if r->>'status' <> 'needs_a_different_super_admin' then raise exception 'PROBE_FAIL esc-07: approver reversal %', r; end if;
  reset role;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (lw, 'withdrawal', 'debit', 60000000, 'probe-esc07-spent', 'PENDING');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', sa3, 'role', 'authenticated')::text, true);
  r := public.escrow_reverse_ruling(rid, 'The release was a mistake and must be undone now.');
  if r->>'status' <> 'shortfall' then raise exception 'PROBE_FAIL esc-07: overdrawing reversal %', r; end if;
  reset role;
  select count(*) into n from public.risk_alerts where entity_type = 'escrow' and entity_id = big::text
     and title = 'A ruling reversal is waiting for money to be recovered' and status = 'open';
  if n <> 1 then raise exception 'PROBE_FAIL esc-07: a refused reversal left nothing on the desk'; end if;

  -- Every ruling change is audited.
  select count(*) into n from public.audit_log where entity_type = 'escrow' and entity_id in (small::text, big::text)
     and action like 'escrow_ruling.%';
  if n < 5 then raise exception 'PROBE_FAIL esc-07: only % ruling audit rows', n; end if;

  raise exception 'PROBE_OK esc-07-08';
end
$$;
