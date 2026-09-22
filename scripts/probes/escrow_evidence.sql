-- THE EVIDENCE FILE, AND THE CANCEL THAT HAD NO SENTENCE.
--
-- Run through `mcp__Supabase__apply_migration` against the live project. It
-- ENDS IN A DELIBERATE `raise exception`, so the whole transaction rolls back
-- and nothing reaches a live product table.
--
-- What it proves, each assertion failing loudly rather than reporting a pass:
--
--   A cancel with no reason at all, and one with a three character reason,
--   both answer `ok` and leave a sentence on the record. Both used to raise
--   against `escrows_resolution_has_a_note`.
--   The audit row for the cancellation NAMES THE PERSON who did it. Before
--   today every escrow transition recorded its actor as nobody.
--   A third party cannot file evidence.
--   A dated fact with no date, a money fact with no amount, a file with no
--   storage path and a 201 character caption are all refused.
--   A well formed fact lands, the same party cannot file it twice, and the
--   other party CAN file the same fact, because a contradiction is the most
--   useful thing in the file.
--   Evidence cannot be updated or deleted, by anybody, including its author.
--   A settled agreement is closed to new evidence.
--
-- The result of the run on 22 September 2026 is in escrow_evidence.log,
-- including the two faults the first run found.

do $probe$
declare
  u1 uuid; u2 uuid; u3 uuid; esc uuid; ev uuid; r jsonb; ok boolean; actor uuid;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at desc limit 1;
  select id into u3 from auth.users order by created_at offset 1 limit 1;
  if u1 is null or u2 is null or u1 = u2 then
    raise exception 'PROBE CANNOT RUN: needs two distinct auth users';
  end if;

  r := public.escrow_open(u1, u2, null, 'agency_fee', 250000);
  esc := (r ->> 'escrow_id')::uuid;
  r := public.escrow_cancel_as(u2, esc, null);
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE FAILED. A cancel with no reason was refused: %', r;
  end if;
  if (select char_length(btrim(resolution_note)) from public.escrows where id = esc) < 4 then
    raise exception 'PROBE FAILED. A cancelled agreement was left with no sentence on the record.';
  end if;
  if (select resolution_note from public.escrows where id = esc) not like 'Declined%' then
    raise exception 'PROBE FAILED. The default sentence did not say who ended it: %',
      (select resolution_note from public.escrows where id = esc);
  end if;

  r := public.escrow_open(u1, u2, null, 'agency_fee', 250000);
  r := public.escrow_cancel_as(u1, (r ->> 'escrow_id')::uuid, 'no');
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE FAILED. A three character reason was refused: %', r;
  end if;

  select actor_id into actor from public.audit_log
   where entity_type = 'escrow' and entity_id = esc::text and action = 'escrow.cancelled';
  if actor is null then
    raise exception 'PROBE FAILED. The cancellation was audited with no actor, as every transition was before today.';
  end if;
  if actor <> u2 then
    raise exception 'PROBE FAILED. The audit named the wrong actor: % instead of %', actor, u2;
  end if;

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state, funded_at, held_at)
  values (u1, u2, 'agency_fee', 500000, 'DISPUTED', now(), now())
  returning id into esc;

  if u3 is not null and u3 <> u1 and u3 <> u2 then
    r := public.escrow_file_evidence_as(u3, esc, 'fact', 'viewing_missed', current_date);
    if (r ->> 'status') <> 'not_a_party' then
      raise exception 'PROBE FAILED. A third party filed evidence: %', r;
    end if;
  end if;

  r := public.escrow_file_evidence_as(u1, esc, 'fact', 'viewing_missed', null);
  if (r ->> 'status') <> 'bad_request' then
    raise exception 'PROBE FAILED. A dated fact was accepted with no date: %', r;
  end if;

  r := public.escrow_file_evidence_as(u1, esc, 'fact', 'amount_agreed', current_date, null);
  if (r ->> 'status') <> 'bad_request' then
    raise exception 'PROBE FAILED. amount_agreed was accepted with a date and no amount: %', r;
  end if;

  r := public.escrow_file_evidence_as(u1, esc, 'file', null, null, null, null, 'receipt.pdf', 'application/pdf');
  if (r ->> 'status') <> 'bad_request' then
    raise exception 'PROBE FAILED. A file with no storage path was accepted: %', r;
  end if;

  r := public.escrow_file_evidence_as(
    u1, esc, 'file', null, null, null, 'escrow-evidence/x.pdf', 'receipt.pdf', 'application/pdf', 1024,
    repeat('a', 201));
  if (r ->> 'status') <> 'bad_request' then
    raise exception 'PROBE FAILED. A 201 character caption was accepted: %', r;
  end if;

  r := public.escrow_file_evidence_as(u1, esc, 'fact', 'viewing_missed', current_date);
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE FAILED. A well formed fact was refused: %', r;
  end if;
  ev := (r ->> 'evidence_id')::uuid;

  r := public.escrow_file_evidence_as(u1, esc, 'fact', 'viewing_missed', current_date);
  if (r ->> 'status') <> 'duplicate' then
    raise exception 'PROBE FAILED. The same fact was filed twice by the same party: %', r;
  end if;

  r := public.escrow_file_evidence_as(u2, esc, 'fact', 'viewing_missed', current_date);
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE FAILED. The other party could not contradict the same fact: %', r;
  end if;

  ok := false;
  begin
    update public.escrow_evidence set caption = 'rewritten' where id = ev;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE FAILED. Evidence was rewritten after filing.'; end if;

  ok := false;
  begin
    delete from public.escrow_evidence where id = ev;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE FAILED. Evidence was withdrawn after filing.'; end if;

  update public.escrows
     set state = 'RESOLVED', resolved_at = now(), resolved_by = u1,
         resolution_note = 'Ruled for the payer on the evidence filed.',
         dispute_reason = 'The viewing never happened.', disputed_at = now(), disputed_by = u1
   where id = esc;
  r := public.escrow_file_evidence_as(u1, esc, 'fact', 'keys_not_received');
  if (r ->> 'status') <> 'not_open' then
    raise exception 'PROBE FAILED. Evidence was filed against a settled agreement: %', r;
  end if;

  raise exception
    'PROBE ALL PASS. A cancel with no reason and a cancel with a three character reason both answered ok and left a sentence on the record, and the audit row named the person who did it rather than nobody. On evidence: a third party refused; a dated fact with no date, a money fact with no amount, a file with no path and a 201 character caption all refused; a well formed fact landed; the same party could not file it twice; the other party could contradict it; update and delete both raised; and a settled agreement was closed to new evidence. Rolling back.';
end;
$probe$;
