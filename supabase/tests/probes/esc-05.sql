-- ESC-05, ESC-15, ESC-09. Rolls back.
-- ESC-15: the sweeper pays out a due escrow even when another due row cannot
-- settle, and moves that row out of its queue (DISPUTED, "Paused by Vallo").
-- ESC-05: a payee whose agent account is suspended is not paid automatically;
-- with the payouts switch off the sweeper pays nothing and confirm by both
-- sides pays nothing, and the money stays held; an admin may switch payouts
-- off but not back on.
-- ESC-09: a dispute older than 48 hours raises an alert; a proposal nobody
-- funded in 14 days is cancelled.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- payer
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';   -- payee
  lister_agent constant uuid := 'e0000000-0000-4000-8000-000000000002';
  mw uuid; lw uuid;
  a uuid; b uuid; c uuid; d uuid; e2 uuid; f uuid; g uuid;
  n int; st text; r jsonb; why text;
begin
  insert into public.feature_flags (key, enabled) values ('held_payments_payouts', true)
  on conflict (key) do update set enabled = true;
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  insert into public.wallets (user_id) values (lister) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  select id into lw from public.wallets where user_id = lister;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 10000000, 'probe-esc05-deposit', 'COMPLETED');

  -- Five held escrows, each with its hold posted.
  foreach st in array array['a', 'b', 'c', 'd', 'e'] loop
    insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
    values (member, lister, 'agency_fee', 100000, member) returning id into f;
    insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values (mw, 'escrow_hold', 'debit', 100000, 'rm-esc-' || f || '-hold', 'COMPLETED', jsonb_build_object('escrow_id', f));
    update public.escrows set state = 'FUNDED', funded_at = now() where id = f;
    update public.escrows set state = 'HELD', held_at = now(), auto_release_at = now() + interval '10 days' where id = f;
    case st when 'a' then a := f; when 'b' then b := f; when 'c' then c := f; when 'd' then d := f; else e2 := f; end case;
  end loop;

  -- ESC-15: a is due; b is due and poisoned (its release reference is taken).
  update public.escrows set auto_release_at = now() - interval '1 hour' where id in (a, b);
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (lw, 'deposit', 'credit', 1, 'escrow:release:' || b, 'COMPLETED');
  n := private.escrow_sweep_timeouts();
  select state::text into st from public.escrows where id = a;
  if st <> 'RELEASED' or n <> 1 then raise exception 'PROBE_FAIL esc-15: a is % after the sweep (moved %)', st, n; end if;
  select state::text, dispute_reason into st, why from public.escrows where id = b;
  if st <> 'DISPUTED' or why not like 'Paused by Vallo:%' then raise exception 'PROBE_FAIL esc-15: poisoned b is % (%)', st, why; end if;

  -- ESC-05: a suspended payee is not paid by the sweeper.
  insert into public.agent_suspensions (agent_id, reason, suspended_by) values (lister_agent, 'probe', admin);
  update public.escrows set auto_release_at = now() - interval '1 hour' where id = c;
  n := private.escrow_sweep_timeouts();
  select state::text, dispute_reason into st, why from public.escrows where id = c;
  if st <> 'DISPUTED' or why not like '%suspended%' then raise exception 'PROBE_FAIL esc-05: suspended payee escrow is % (%)', st, why; end if;
  update public.agent_suspensions set lifted_at = now(), lifted_by = admin where agent_id = lister_agent and lifted_at is null;

  -- ESC-05: an admin pauses payouts through their own client, and cannot resume them.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.feature_flags set enabled = false where key = 'held_payments_payouts';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL esc-05: an admin could not pause payouts'; end if;
  begin
    update public.feature_flags set enabled = true where key = 'held_payments_payouts';
    raise exception 'PROBE_FAIL esc-05: a plain admin resumed payouts';
  exception when insufficient_privilege then null; end;
  reset role;

  -- With payouts paused, the sweeper and confirm pay nothing; the money stays held.
  update public.escrows set auto_release_at = now() - interval '1 hour' where id = d;
  n := private.escrow_sweep_timeouts();
  select state::text into st from public.escrows where id = d;
  if st <> 'HELD' or n <> 0 then raise exception 'PROBE_FAIL esc-05: paused sweep moved d to % (moved %)', st, n; end if;
  select count(*) into n from public.audit_log where action = 'escrow.payout_paused' and created_at > now() - interval '1 minute';
  if n < 1 then raise exception 'PROBE_FAIL esc-05: no payout_paused audit row'; end if;
  r := public.escrow_confirm_as(member, e2);
  r := public.escrow_confirm_as(lister, e2);
  if r->>'status' <> 'payouts_paused' then raise exception 'PROBE_FAIL esc-05: confirm while paused %', r; end if;
  select state::text into st from public.escrows where id = e2;
  if st <> 'HELD' then raise exception 'PROBE_FAIL esc-05: confirm while paused moved e to %', st; end if;
  -- Resumed, the confirmed escrow is paid by the next sweep.
  update public.feature_flags set enabled = true where key = 'held_payments_payouts';
  n := private.escrow_sweep_timeouts();
  select state::text into st from public.escrows where id = e2;
  if st <> 'RELEASED' then raise exception 'PROBE_FAIL esc-05: confirmed escrow not paid after resuming (%)', st; end if;

  -- ESC-09.
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 100000, member) returning id into g;
  update public.escrows set initiated_at = now() - interval '15 days' where id = g;
  update public.escrows set disputed_at = now() - interval '3 days' where id = b;
  r := private.escrow_age_watch();
  select state::text into st from public.escrows where id = g;
  if st <> 'CANCELLED' then raise exception 'PROBE_FAIL esc-09: a 15-day-old proposal is %', st; end if;
  select count(*) into n from public.risk_alerts where entity_type = 'escrow' and entity_id = b::text
     and title = 'A dispute has waited more than 48 hours' and status = 'open';
  if n <> 1 then raise exception 'PROBE_FAIL esc-09: % age alerts for a 3-day dispute', n; end if;
  r := private.escrow_age_watch();
  select count(*) into n from public.risk_alerts where entity_type = 'escrow' and entity_id = b::text
     and title = 'A dispute has waited more than 48 hours' and status = 'open';
  if n <> 1 then raise exception 'PROBE_FAIL esc-09: the age alert repeated (%)', n; end if;

  raise exception 'PROBE_OK esc-05';
end $$;
