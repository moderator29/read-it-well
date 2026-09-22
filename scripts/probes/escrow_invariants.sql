-- P-9, THE FLOAT IDENTITY, AGAINST THE LIVE DATABASE, ROLLED BACK.
--
-- Run through `mcp__Supabase__apply_migration` against project
-- uccixoonmbhrnyczyigt. It ENDS IN A DELIBERATE `raise exception`, so the
-- whole transaction rolls back and not one row reaches a live product table.
-- That is the house rule for probing production and it is not optional:
-- migration 20260919181950 ended on an update instead of a raise and its five
-- rows are still live.
--
-- WHAT IT PROVES, each assertion failing loudly rather than reporting a pass:
--
--   The live database is clean before anything is broken.
--   I-3a catches an agreement that says it is holding money the ledger never
--   took, and I-2 does NOT fire on it, which proves the live set is keyed on
--   the ledger and not on the state.
--   I-2 stays quiet on a sound agreement.
--   I-2 catches a one naira disagreement and reports it as exactly -100 kobo.
--   I-3b catches the same money taken twice.
--   Five passes open exactly ONE alert per breach kind, not one per pass.
--
-- Result of the run on 22 September 2026 is in escrow_invariants.log. Its
-- FIRST run failed, and the failure is the reason this file exists: the check
-- compared a column with a same-named variable.

do $probe$
declare
  u1 uuid; u2 uuid;
  w1 uuid;
  e_nohold uuid; e_ok uuid;
  r jsonb;
  found text;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at desc limit 1;
  if u1 is null or u2 is null or u1 = u2 then
    raise exception 'PROBE CANNOT RUN: needs two distinct auth users, found % and %', u1, u2;
  end if;

  insert into public.wallets (user_id) values (u1) on conflict (user_id) do nothing;
  select id into w1 from public.wallets where user_id = u1;

  r := private.escrow_invariants_check();
  if (r ->> 'ok')::boolean is not true then
    raise exception 'PROBE FAILED AT BASELINE. The live database is already breaching: %', r ->> 'breaches';
  end if;

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state, funded_at, held_at)
  values (u1, u2, 'agency_fee', 250000, 'HELD', now(), now())
  returning id into e_nohold;

  r := private.escrow_invariants_check();
  select string_agg(b ->> 'invariant', ',') into found from jsonb_array_elements(r -> 'breaches') b;
  if coalesce(found, '') not like '%I-3a%' then
    raise exception 'PROBE FAILED. An agreement holding money with no ledger entry was NOT caught. breaches=%', coalesce(found, 'none');
  end if;
  if coalesce(found, '') like '%I-2%' then
    raise exception 'PROBE FAILED. I-2 fired on an agreement with no hold entry, which means the live set is keyed on the state and not on the ledger.';
  end if;

  insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state, funded_at, held_at)
  values (u1, u2, 'agency_fee', 500000, 'HELD', now(), now())
  returning id into e_ok;

  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (w1, 'escrow_hold', 'debit', 500000, 'probe-esc-' || e_ok::text || '-hold', 'COMPLETED',
          jsonb_build_object('escrow_id', e_ok));

  r := private.escrow_invariants_check();
  select string_agg(b ->> 'invariant', ',') into found from jsonb_array_elements(r -> 'breaches') b;
  if coalesce(found, '') like '%I-2%' then
    raise exception 'PROBE FAILED. I-2 fired on a SOUND agreement. breaches=% components=%', found, r -> 'components';
  end if;

  update public.escrows set amount_minor = 500100 where id = e_ok;

  r := private.escrow_invariants_check();
  select string_agg(b ->> 'invariant', ',') into found from jsonb_array_elements(r -> 'breaches') b;
  if coalesce(found, '') not like '%I-2%' then
    raise exception 'PROBE FAILED. A one naira disagreement between the ledger and the rows was NOT caught. breaches=% components=%', coalesce(found, 'none'), r -> 'components';
  end if;
  if (r -> 'components' ->> 'difference_minor')::bigint <> -100 then
    raise exception 'PROBE FAILED. The difference should be exactly -100 kobo and it is %', r -> 'components' ->> 'difference_minor';
  end if;

  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (w1, 'escrow_hold', 'debit', 500100, 'probe-esc-' || e_ok::text || '-hold-again', 'COMPLETED',
          jsonb_build_object('escrow_id', e_ok));

  r := private.escrow_invariants_check();
  select string_agg(b ->> 'invariant', ',') into found from jsonb_array_elements(r -> 'breaches') b;
  if coalesce(found, '') not like '%I-3b%' then
    raise exception 'PROBE FAILED. Two holds on one agreement were NOT caught. breaches=%', coalesce(found, 'none');
  end if;

  if (select count(*) from public.risk_alerts
       where entity_type = 'escrow_invariant' and status = 'open' and entity_id = 'I-2') <> 1 then
    raise exception 'PROBE FAILED. I-2 opened % alerts across five passes; it must open exactly one.',
      (select count(*) from public.risk_alerts where entity_type = 'escrow_invariant' and status = 'open' and entity_id = 'I-2');
  end if;

  if (select count(*) from public.risk_alerts
       where entity_type = 'escrow_invariant' and status = 'open' and entity_id = 'I-3a') <> 1 then
    raise exception 'PROBE FAILED. I-3a did not open exactly one alert; the dedup has gone quiet after the first finding.';
  end if;

  raise exception
    'PROBE ALL PASS. Baseline clean. I-3a caught an agreement holding money the ledger never took. I-2 stayed quiet on a sound agreement and caught a 100 kobo disagreement with difference_minor = -100 exactly. I-3b caught a double hold. Five passes opened exactly one alert for I-2 and one for I-3a. Rolling back.';
end;
$probe$;
