-- AML-19 (a): nobody rules on an escrow they opened or are party to,
-- whichever path writes the ruling. Rolls back.
do $$
declare
  payer  constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  payee  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  opener constant uuid := '67c5afad-d144-450f-ba18-ad3586f40917';
  who uuid;
  e uuid;
begin
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (payer, payee, 'agency_fee', 100000, opener) returning id into e;

  foreach who in array array[opener, payer, payee] loop
    begin
      insert into public.escrow_rulings (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by)
      values (e, 'refund', 'A probe ruling that must be refused here.', 100000, 50000000, who);
      raise exception 'PROBE_FAIL aml19-a: % proposed a ruling on an escrow they opened or are party to', who;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- Control: an unconnected super admin may propose.
  insert into public.escrow_rulings (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by)
  values (e, 'refund', 'A probe ruling from somebody unconnected.', 100000, 50000000,
          '2255d905-0f31-437e-b719-aa2e4a18e03d');

  raise exception 'PROBE_OK aml19-a';
end $$;
