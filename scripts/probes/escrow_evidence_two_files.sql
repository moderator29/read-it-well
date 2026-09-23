-- P-E2. CAN ONE PARTY FILE TWO FILES AGAINST ONE AGREEMENT?
--
-- Run through `mcp__Supabase__apply_migration` against the live project. It
-- ENDS IN A DELIBERATE `raise exception`, so the whole transaction rolls back
-- and nothing reaches a live product table.
--
-- WHY THIS PROBE EXISTS. The evidence table carries
--
--   unique nulls not distinct (escrow_id, author_id, fact)
--
-- named `escrow_evidence_one_fact_per_party`, and the name says what it was
-- for: one party may not file the same fact twice. But a FILE row has
-- `fact = null`, and `nulls not distinct` makes two nulls EQUAL. So the same
-- constraint also says one party may file exactly ONE FILE, ever, per
-- agreement. Nothing in the product could see that before this probe, because
-- no client existed that could upload a second file.
--
-- WHAT IT ASSERTS, in the order it asserts it:
--   1. A party's first file is accepted.
--   2. A party's SECOND, DIFFERENT file is accepted. (The bug is here.)
--   3. The other party's file is accepted.
--   4. Two DIFFERENT facts from one party are both accepted.
--   5. The SAME fact twice from one party is refused as `duplicate`, which is
--      the behaviour the constraint was actually written for and which must
--      survive any fix.
do $probe$
declare
  payer uuid; payee uuid; esc uuid;
  r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb; r5 jsonb;
  filed integer;
begin
  select id into payer from auth.users order by created_at limit 1;
  select id into payee from auth.users order by created_at desc limit 1;
  if payer is null or payee is null or payer = payee then
    raise exception 'PROBE CANNOT RUN: needs two distinct auth users';
  end if;

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state)
  values (payer, payee, 'agency_fee', 500000, 'HELD') returning id into esc;

  r1 := public.escrow_file_evidence_as(payer, esc, 'file', null, null, null,
        esc::text || '/one.jpg', 'receipt.jpg', 'image/jpeg', 1000,
        'The receipt the agent wrote out');
  if r1->>'status' <> 'ok' then
    raise exception 'PROBE FAILED. A first file was refused: %', r1;
  end if;

  r2 := public.escrow_file_evidence_as(payer, esc, 'file', null, null, null,
        esc::text || '/two.jpg', 'door.jpg', 'image/jpeg', 2000,
        'The front door on the day');
  if r2->>'status' <> 'ok' then
    raise exception
      'PROBE FAILED. One party can file only ONE file per agreement. The second answered %. %',
      r2, 'escrow_evidence_one_fact_per_party is UNIQUE NULLS NOT DISTINCT and a file row has fact = null.';
  end if;

  r3 := public.escrow_file_evidence_as(payee, esc, 'file', null, null, null,
        esc::text || '/three.jpg', 'keys.jpg', 'image/jpeg', 3000, null);
  if r3->>'status' <> 'ok' then
    raise exception 'PROBE FAILED. The other party could not file at all: %', r3;
  end if;

  r4 := public.escrow_file_evidence_as(payer, esc, 'fact', 'keys_not_received',
        null, null, null, null, null, null, null);
  if r4->>'status' <> 'ok' then
    raise exception 'PROBE FAILED. A fact beside a file was refused: %', r4;
  end if;

  r5 := public.escrow_file_evidence_as(payer, esc, 'fact', 'keys_not_received',
        null, null, null, null, null, null, null);
  if r5->>'status' <> 'duplicate' then
    raise exception
      'PROBE FAILED. The same fact filed twice by one party answered % and must answer duplicate.', r5;
  end if;

  select count(*) into filed from public.escrow_evidence where escrow_id = esc;
  if filed <> 4 then
    raise exception 'PROBE FAILED. Expected 4 rows filed, found %.', filed;
  end if;

  raise exception
    'PROBE ALL PASS (rolled back). Two files from one party, one from the other, one fact, and a repeat fact refused as duplicate. 4 rows filed, 0 kept.';
end
$probe$;
