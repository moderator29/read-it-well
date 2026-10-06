-- B2 LEDGER (pending migration b2_ledger): three pots as three tables; an
-- entry is written once per key and a disagreeing replay is refused; a
-- correction is a new entry that moves the opposite way and never exceeds
-- what it corrects; no entry can be updated, deleted or truncated; the
-- fourteen event types and the per-pot exclusions hold; escrow commission is
-- a paired movement out of customer funds and into revenue, refused off the
-- escrow rail; a direct settlement written to ledger_entries posts pot entries
-- that net customer funds to zero and put the commission in revenue; members
-- read nothing, and service_role reads but cannot write directly.
do $$
declare
  v_guest uuid;
  v_listing uuid;
  b uuid := gen_random_uuid();
  tx_direct uuid := gen_random_uuid();
  tx_escrow uuid := gen_random_uuid();
  e1 uuid;
  e2 uuid;
  c1 uuid;
  refused boolean;
  t text;
  pair jsonb;
  net bigint;
begin
  select id into v_guest from auth.users order by created_at limit 1;
  select l.id into v_listing from public.listings l where l.property_type = 'hotel' limit 1;
  if v_guest is null or v_listing is null then
    raise exception 'PROBE_FAIL b2-ledger: fixtures missing (a user, a hotel listing)';
  end if;
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
  values (b, v_listing, v_guest, current_date + 420, current_date + 421, 1, 10000, 10000, 10000);
  perform set_config('vallo.recording_unknown_charge', 'on', true);
  insert into public.transactions (id, booking_id, provider, provider_ref, amount_minor, currency, status, rail)
  values (tx_direct, b, 'paystack', 'probe-b2-ledger-d-' || b::text, 10000, 'NGN', 'PENDING', 'direct'),
         (tx_escrow, b, 'paystack', 'probe-b2-ledger-e-' || b::text, 10000, 'NGN', 'PENDING', 'escrow');
  perform set_config('vallo.recording_unknown_charge', '', true);

  -- Idempotent on the key; a disagreeing replay is refused.
  e1 := public.ledger_record('vallo_revenue', 'probe-b2-key-1', 'FEE_CHARGED', 'in', 500, 'NGN', 'vallo');
  e2 := public.ledger_record('vallo_revenue', 'probe-b2-key-1', 'FEE_CHARGED', 'in', 500, 'NGN', 'vallo');
  if e1 is null or e1 <> e2 then raise exception 'PROBE_FAIL b2-ledger: a replay wrote a second entry'; end if;
  refused := false;
  begin
    perform public.ledger_record('vallo_revenue', 'probe-b2-key-1', 'FEE_CHARGED', 'in', 501, 'NGN', 'vallo');
  exception when unique_violation then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: a disagreeing replay was accepted'; end if;

  -- Corrections: opposite direction, never more than the original.
  refused := false;
  begin
    perform public.ledger_record('vallo_revenue', 'probe-b2-corr-same', 'FEE_CHARGED', 'in', 100, 'NGN', 'vallo', p_corrects => e1);
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: a same-direction correction was accepted'; end if;
  c1 := public.ledger_record('vallo_revenue', 'probe-b2-corr-1', 'FEE_CHARGED', 'out', 300, 'NGN', 'vallo', p_corrects => e1);
  refused := false;
  begin
    perform public.ledger_record('vallo_revenue', 'probe-b2-corr-2', 'FEE_CHARGED', 'out', 201, 'NGN', 'vallo', p_corrects => e1);
  exception when check_violation then refused := true;
  end;
  if c1 is null or not refused then raise exception 'PROBE_FAIL b2-ledger: corrections may exceed the entry'; end if;

  -- The fourteen types, and what each pot may not carry.
  refused := false;
  begin
    perform public.ledger_record('customer_funds', 'probe-b2-bad-type', 'BALANCE_ADJUSTED', 'in', 1, 'NGN', 'paystack');
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: an unknown event type was accepted'; end if;
  refused := false;
  begin
    perform public.ledger_record('vallo_revenue', 'probe-b2-rev-escrow', 'ESCROW_FUNDED', 'in', 1, 'NGN', 'payluk');
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: revenue accepted an escrow event'; end if;
  refused := false;
  begin
    perform public.ledger_record('marketing_float', 'probe-b2-float-pl', 'DEPOSIT_CONFIRMED', 'in', 1, 'NGN', 'payluk');
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: the float accepted a Payluk entry'; end if;

  -- Escrow commission: refused off the escrow rail, paired on it.
  refused := false;
  begin
    perform public.ledger_record_escrow_commission(tx_direct, 200);
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: escrow commission recorded on a direct payment'; end if;
  pair := public.ledger_record_escrow_commission(tx_escrow, 200);
  if (select count(*) from public.ledger_customer_funds where transaction_id = tx_escrow and direction = 'out' and amount_minor = 200 and event_type = 'FEE_CHARGED') <> 1
     or (select count(*) from public.ledger_vallo_revenue where transaction_id = tx_escrow and direction = 'in' and amount_minor = 200 and event_type = 'FEE_CHARGED') <> 1 then
    raise exception 'PROBE_FAIL b2-ledger: escrow commission was not one paired movement';
  end if;
  pair := public.ledger_record_escrow_commission(tx_escrow, 200);
  if (select count(*) from public.ledger_vallo_revenue where transaction_id = tx_escrow) <> 1 then
    raise exception 'PROBE_FAIL b2-ledger: a replayed escrow commission was recorded twice';
  end if;

  -- Direct settlement posts the pots, netting customer funds to zero.
  insert into public.ledger_entries (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor,
                                     processor_fee_minor, guarantee_reserve_minor, net_settlement_minor)
  values (b, tx_direct, 10000, 200, 9650, 150, 0, 9650);
  select coalesce(sum(case direction when 'in' then amount_minor else -amount_minor end), 0) into net
    from public.ledger_customer_funds where transaction_id = tx_direct;
  if net <> 0 or (select count(*) from public.ledger_customer_funds where transaction_id = tx_direct) <> 4 then
    raise exception 'PROBE_FAIL b2-ledger: a direct settlement did not net customer funds to zero (net %)', net;
  end if;
  if (select sum(amount_minor) from public.ledger_vallo_revenue where transaction_id = tx_direct and direction = 'in') is distinct from 200 then
    raise exception 'PROBE_FAIL b2-ledger: the direct commission did not land in revenue';
  end if;

  -- Append-only, in every pot: one real row each, then update, delete and truncate.
  perform public.ledger_record('marketing_float', 'probe-b2-float-1', 'DEPOSIT_CONFIRMED', 'in', 1000, 'NGN', 'vallo');
  foreach t in array array['ledger_customer_funds', 'ledger_vallo_revenue', 'ledger_marketing_float'] loop
    execute format('select id from public.%I limit 1', t) into e2;
    if e2 is null then raise exception 'PROBE_FAIL b2-ledger: % has no row to test', t; end if;
    refused := false;
    begin
      execute format('update public.%I set metadata = metadata where id = $1', t) using e2;
    exception when insufficient_privilege then refused := true;
    end;
    if not refused then raise exception 'PROBE_FAIL b2-ledger: % accepted an update', t; end if;
    refused := false;
    begin
      execute format('%s %s public.%I where id = $1', 'delete', 'from', t) using e2;
    exception when insufficient_privilege then refused := true;
    end;
    if not refused then raise exception 'PROBE_FAIL b2-ledger: % accepted a delete', t; end if;
    refused := false;
    begin
      execute format('truncate public.%I', t);
    exception when insufficient_privilege then refused := true;
    end;
    if not refused then raise exception 'PROBE_FAIL b2-ledger: % accepted a truncate', t; end if;
  end loop;

  -- Who can see and write.
  set local role authenticated;
  refused := false;
  begin
    perform 1 from public.ledger_customer_funds limit 1;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: a member read customer funds'; end if;
  refused := false;
  begin
    perform public.ledger_record('vallo_revenue', 'probe-b2-member', 'FEE_CHARGED', 'in', 1, 'NGN', 'vallo');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: a member wrote revenue'; end if;
  reset role;
  set local role service_role;
  perform 1 from public.ledger_vallo_revenue limit 1;
  refused := false;
  begin
    insert into public.ledger_vallo_revenue (idempotency_key, provider, event_type, amount_minor, currency, direction)
    values ('probe-b2-direct-write', 'vallo', 'FEE_CHARGED', 1, 'NGN', 'in');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL b2-ledger: service_role wrote a pot directly'; end if;
  reset role;

  raise exception 'PROBE_OK b2-ledger';
end
$$;
