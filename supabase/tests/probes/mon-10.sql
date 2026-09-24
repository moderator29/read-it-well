-- MON-10: wallet_entries is append-only for every role, the owner included.
-- Refused: delete; changing amount, direction, kind or wallet; COMPLETED ->
-- anything; FAILED -> COMPLETED; rewriting a reference; changing or dropping
-- escrow_id. Allowed (controls): PENDING -> COMPLETED and PENDING -> FAILED;
-- adding a caption; the purge's personal-detail scrub; and, with the
-- escrow-reversal flag set, an escrow credit becoming REVERSED with its
-- reference suffixed. API roles still cannot write at all. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  mw uuid; n int;
  attack text;
begin
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata) values
    (mw, 'deposit', 'credit', 5000, 'probe-mon10-done', 'COMPLETED', '{"note":"x","email":"a@example.invalid"}'),
    (mw, 'withdrawal', 'debit', 1000, 'probe-mon10-pending', 'PENDING', '{}'),
    (mw, 'withdrawal', 'debit', 1000, 'probe-mon10-pending-2', 'PENDING', '{}'),
    (mw, 'withdrawal', 'debit', 1000, 'probe-mon10-failed', 'FAILED', '{}'),
    (mw, 'escrow_release', 'credit', 1000, 'escrow:release:probe-mon10', 'COMPLETED', '{"escrow_id":"e1","gross_minor":1000}');

  foreach attack in array array[
    'delete from public.wallet_entries where reference = ''probe-mon10-done''',
    'update public.wallet_entries set amount_minor = 999999 where reference = ''probe-mon10-done''',
    'update public.wallet_entries set direction = ''debit'' where reference = ''probe-mon10-done''',
    'update public.wallet_entries set kind = ''refund'' where reference = ''probe-mon10-done''',
    'update public.wallet_entries set status = ''REVERSED'' where reference = ''probe-mon10-done''',
    'update public.wallet_entries set status = ''COMPLETED'' where reference = ''probe-mon10-failed''',
    'update public.wallet_entries set reference = ''elsewhere'' where reference = ''probe-mon10-done''',
    'update public.wallet_entries set metadata = metadata || ''{"escrow_id":"e2"}'' where reference = ''escrow:release:probe-mon10''',
    'update public.wallet_entries set metadata = metadata - ''escrow_id'' where reference = ''escrow:release:probe-mon10''',
    'update public.wallet_entries set status = ''REVERSED'', reference = reference || '':reversed:x'' where reference = ''escrow:release:probe-mon10'''
  ] loop
    begin
      execute attack;
      raise exception 'PROBE_FAIL mon-10: accepted as the owner: %', attack;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- CONTROLS.
  update public.wallet_entries set status = 'COMPLETED' where reference = 'probe-mon10-pending';
  update public.wallet_entries set status = 'FAILED' where reference = 'probe-mon10-pending-2';
  update public.wallet_entries set metadata = metadata || '{"note":"relabelled","caption":"y"}' where reference = 'probe-mon10-done';
  update public.wallet_entries set metadata = metadata - 'email' where reference = 'probe-mon10-done';
  perform set_config('vallo.escrow_reversal', 'on', true);
  update public.wallet_entries set status = 'REVERSED', reference = reference || ':reversed:r1'
   where reference = 'escrow:release:probe-mon10';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL mon-10: the sanctioned reversal was refused'; end if;
  perform set_config('vallo.escrow_reversal', '', true);

  -- API roles hold no write at all (20260924002038).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    update public.wallet_entries set status = 'COMPLETED' where reference = 'probe-mon10-pending-2';
    raise exception 'PROBE_FAIL mon-10: authenticated updated the ledger';
  exception when insufficient_privilege then null; end;
  reset role;

  raise exception 'PROBE_OK mon-10';
end $$;
