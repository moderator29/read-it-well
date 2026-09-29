-- ESC-11: a future payout moment is the end of its Lagos day (00:00 WAT the
-- next day), whichever door sets it; snapping twice changes nothing; a moment
-- already due is left alone. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';
  e uuid; at timestamptz; local_at timestamp; due timestamptz;
begin
  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, opened_by)
  values (member, lister, 'agency_fee', 100000, member) returning id into e;

  -- As escrow_fund_proposal_as sets it: now plus 21 days, at today's hour.
  update public.escrows set auto_release_at = now() + interval '21 days' where id = e;
  select auto_release_at into at from public.escrows where id = e;
  local_at := at at time zone 'Africa/Lagos';
  if local_at::time <> time '00:00' then
    raise exception 'PROBE_FAIL esc-11: the payout moment is % in Lagos, not the end of a day', local_at;
  end if;
  if local_at::date <> ((now() at time zone 'Africa/Lagos')::date + 22) then
    raise exception 'PROBE_FAIL esc-11: the payout moment is %, not the end of the 21st day', local_at;
  end if;

  -- Idempotent.
  update public.escrows set auto_release_at = at where id = e;
  update public.escrows set auto_release_at = at + interval '0 seconds' where id = e;
  select auto_release_at into due from public.escrows where id = e;
  if due <> at then raise exception 'PROBE_FAIL esc-11: snapping twice moved % to %', at, due; end if;

  -- A moment already due is not pushed into the future.
  update public.escrows set auto_release_at = now() - interval '1 hour' where id = e;
  select auto_release_at into due from public.escrows where id = e;
  if due > now() then raise exception 'PROBE_FAIL esc-11: a due payout was moved to %', due; end if;

  raise exception 'PROBE_OK esc-11';
end $$;
