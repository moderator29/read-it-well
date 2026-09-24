-- AML-19 (b): a ruling is reversed only by two super admins, each step on the
-- record; never by a direct update and never by one person. Rolls back.
do $$
declare
  payer constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  payee constant uuid := 'e0000000-0000-4000-8000-000000000001';
  s1 constant uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d';  -- made the ruling
  s2 constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';  -- approved it
  s3 constant uuid := '8ad0e1e5-63a9-4c88-a602-74842557e545';  -- proposes the reversal
  s4 constant uuid := '6110f564-0e3e-44c6-8e77-31525baad8f7';  -- applies it
  why constant text := 'The ruling misread the evidence of payment.';
  e uuid; rl uuid; r jsonb;
begin
  insert into public.user_roles (user_id, role) values (s2, 'super_admin'), (s3, 'super_admin'), (s4, 'super_admin')
  on conflict do nothing;
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (payer, payee, 'agency_fee', 100000, payer) returning id into e;
  set local session_replication_role = replica;
  update public.escrows set state = 'RESOLVED', resolved_at = now(), resolved_by = s2,
                            resolution_note = 'The payee delivered what was agreed in the thread.' where id = e;
  set local session_replication_role = origin;
  insert into public.escrow_rulings (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by,
                                     state, approved_by, applied_at, settlement_reference)
  values (e, 'release', 'The payee delivered what was agreed in the thread.', 100000, 50000000, s1,
          'applied', s2, now(), 'escrow:release:' || e::text)
  returning id into rl;

  -- Never silently: a direct update cannot reverse it.
  begin
    update public.escrow_rulings set state = 'reversed', reversed_by = s4, reversed_at = now(),
                                     reversal_note = why where id = rl;
    raise exception 'PROBE_FAIL aml19-b: a ruling was reversed by a direct update with no second person';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- The first super admin only proposes.
  perform set_config('request.jwt.claims', json_build_object('sub', s3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.escrow_reverse_ruling(rl, why);
  reset role;
  if r ->> 'status' <> 'awaiting_second_approval' then
    raise exception 'PROBE_FAIL aml19-b: one super admin''s reversal was %, not a proposal', r;
  end if;
  set local role authenticated;
  r := public.escrow_reverse_ruling(rl, why);
  reset role;
  if r ->> 'status' <> 'awaiting_second_approval' then
    raise exception 'PROBE_FAIL aml19-b: the proposer applied their own reversal: %', r;
  end if;

  -- The ruling's own maker cannot be the second.
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.escrow_reverse_ruling(rl, why);
  reset role;
  if r ->> 'status' <> 'needs_a_different_super_admin' then
    raise exception 'PROBE_FAIL aml19-b: the ruling''s maker seconded its reversal: %', r;
  end if;

  -- A second, unconnected super admin gets past the two-person gate (the
  -- probe has no settlement credit, so it stops there).
  perform set_config('request.jwt.claims', json_build_object('sub', s4, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.escrow_reverse_ruling(rl, why);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if r ->> 'status' <> 'settlement_missing' then
    raise exception 'PROBE_FAIL aml19-b: the second super admin''s reversal was %', r;
  end if;

  if not exists (select 1 from public.audit_log a where a.entity_id = e::text
                  and a.action = 'escrow_ruling.reversal_proposed'
                  and a.metadata ->> 'reversal_proposed_by' = s3::text) then
    raise exception 'PROBE_FAIL aml19-b: the reversal proposal left no audit row';
  end if;

  raise exception 'PROBE_OK aml19-b';
end $$;
