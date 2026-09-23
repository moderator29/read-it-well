-- THE EVIDENCE BUCKET'S DOOR, PROVED FROM BOTH SIDES.
--
-- Run through `mcp__Supabase__apply_migration`. It ENDS IN A DELIBERATE
-- `raise exception`, so the whole transaction rolls back.
--
-- `private.escrow_evidence_path_access(name, must_be_open)` is what the two
-- storage policies on `escrow-evidence` call, so it is the whole permission.
-- It is exercised here under forged JWT claims, which is the only way to ask
-- it a question as somebody: the service role has no `auth.uid()` and would
-- get `false` for every path, which would look like a pass and prove nothing.
--
-- READING AND WRITING GATE DIFFERENTLY AND BOTH ARE CHECKED. Writing needs the
-- agreement open; reading survives settlement, because a receipt is read after
-- a ruling and evidence that disappears when a case closes is evidence
-- somebody will believe was removed.
do $probe$
declare
  payer uuid; payee uuid; stranger uuid; esc uuid; base text;
begin
  select id into payer from auth.users order by created_at limit 1;
  select id into payee from auth.users order by created_at desc limit 1;
  select id into stranger from auth.users
    where id not in (payer, payee) order by created_at limit 1;
  if payer is null or payee is null or stranger is null then
    raise exception 'PROBE CANNOT RUN: needs three distinct auth users';
  end if;

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state)
  values (payer, payee, 'agency_fee', 500000, 'HELD') returning id into esc;
  base := esc::text;

  perform set_config('request.jwt.claims', json_build_object('sub', payer::text)::text, true);
  if not private.escrow_evidence_path_access(base || '/' || payer::text || '/a.jpg', true) then
    raise exception 'PROBE FAILED: a party cannot upload into their own folder on an open agreement';
  end if;
  if private.escrow_evidence_path_access(base || '/' || payee::text || '/a.jpg', true) then
    raise exception 'PROBE FAILED: a party can upload into the OTHER party''s folder';
  end if;
  if private.escrow_evidence_path_access(base || '/a.jpg', true) then
    raise exception 'PROBE FAILED: a one-segment path was accepted';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', stranger::text)::text, true);
  if private.escrow_evidence_path_access(base || '/' || stranger::text || '/a.jpg', false) then
    raise exception 'PROBE FAILED: a third party can read the file';
  end if;
  if private.escrow_evidence_path_access(base || '/' || payer::text || '/a.jpg', false) then
    raise exception 'PROBE FAILED: a third party can read a party''s folder';
  end if;

  perform set_config('request.jwt.claims', '', true);
  if private.escrow_evidence_path_access(base || '/' || payer::text || '/a.jpg', false) then
    raise exception 'PROBE FAILED: a signed-out caller can read the file';
  end if;

  update public.escrows set state = 'RELEASE_REQUESTED' where id = esc;
  update public.escrows set state = 'RELEASED', released_at = now() where id = esc;
  perform set_config('request.jwt.claims', json_build_object('sub', payer::text)::text, true);
  if not private.escrow_evidence_path_access(base || '/' || payer::text || '/a.jpg', false) then
    raise exception 'PROBE FAILED: a party lost sight of the file once it settled';
  end if;
  if private.escrow_evidence_path_access(base || '/' || payer::text || '/a.jpg', true) then
    raise exception 'PROBE FAILED: a party can still file against a settled agreement';
  end if;

  perform set_config('request.jwt.claims', '', true);
  raise exception 'PROBE ALL PASS (rolled back). Own folder yes, other party''s folder no, stranger no, signed out no, settled reads yes and writes no.';
end
$probe$;
