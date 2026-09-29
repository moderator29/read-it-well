-- SCUML item 7: REFUNDS AND GUARANTEE PAYOUTS ARE WATCHED FOR THRESHOLD REPORTS.
--
-- 20260929003449 observed every settled card charge and listed three money
-- movements as a gap for the compliance lead. This closes it. Each is money
-- that reaches a member, so each is observed ONCE, for the person it reaches,
-- direction 'in', at the moment the money actually moves:
--
--   source 'refund'            public.booking_refunds, when Paystack reports
--                              the refund processed (processor_status moves to
--                              'processed'); the guest, the refund_minor, as an
--                              individual (they are refunded in the capacity
--                              they paid in). Counterparty: the listing's agent.
--   source 'rent_refund'       public.rent_share_refunds, processed; the payer
--                              of that share, amount_minor, individual.
--                              Counterparty: the rent payment's lister.
--   source 'guarantee_payout'  public.guarantee_claims, when the claim is marked
--                              'paid'; the claimant, approved_minor, classed by
--                              their account. Counterparty: none (Vallo's own
--                              Guarantee reserve pays it).
--
-- The observation feeds the same single-event and structuring rules as a
-- charge, per direction, so a guest's refunds and a lister's Guarantee payouts
-- add to the money reaching them over seven days.
--
-- READ-ONLY OVER THE MONEY. Each watch is an AFTER trigger that catches every
-- error and turns it into a warning and a high risk alert: it can never fail,
-- delay or change a refund or a payout. Nothing new is granted; the tables
-- stay staff only, append-only, five years.

set local lock_timeout = '5s';

/* ------------------------------------------------------------- the sources */

alter table public.aml_ledger_observations drop constraint if exists aml_ledger_observations_source_check;
alter table public.aml_ledger_observations add constraint aml_ledger_observations_source_check
  check (source in ('booking', 'rent_payment', 'refund', 'rent_refund', 'guarantee_payout'));
alter table public.threshold_events drop constraint if exists threshold_events_source_check;
alter table public.threshold_events add constraint threshold_events_source_check
  check (source in ('booking', 'rent_payment', 'refund', 'rent_refund', 'guarantee_payout'));

comment on table public.aml_ledger_observations is
  'SCUML item 7. Every settled money movement the threshold monitor saw, once per party: a card charge (public.transactions to SUCCESSFUL: the payer out, the payee in; source_id the transaction), a processed refund (booking_refunds, rent_share_refunds: the person refunded, in) and a paid Guarantee claim (guarantee_claims: the claimant, in). Staff only, append-only, kept five years.';

/* ---------------------------------------------------------- the observers */

create or replace function private.aml_observe_refund(p_refund uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  r public.booking_refunds%rowtype;
  v_counterparty uuid;
begin
  select * into r from public.booking_refunds x where x.id = p_refund;
  if r.id is null or r.processor_status <> 'processed' or r.refund_minor <= 0 then
    return;
  end if;
  select a.user_id into v_counterparty
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    join public.agents a on a.id = l.agent_id
   where b.id = r.booking_id;
  perform private.aml_lock_party(r.guest_id);
  perform private.aml_observe('refund', r.id, r.guest_id, 'payee', v_counterparty, r.refund_minor,
                              coalesce(r.processor_settled_at, now()), r.processor_refund_id, 'in', 'individual');
end;
$function$;
revoke all on function private.aml_observe_refund(uuid) from public, anon, authenticated;

create or replace function private.aml_observe_rent_refund(p_refund uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  r public.rent_share_refunds%rowtype;
  v_counterparty uuid;
begin
  select * into r from public.rent_share_refunds x where x.id = p_refund;
  if r.id is null or r.processor_status <> 'processed' or r.amount_minor <= 0 then
    return;
  end if;
  select rp.lister_id into v_counterparty from public.rent_payments rp where rp.id = r.rent_payment_id;
  perform private.aml_lock_party(r.payer_id);
  perform private.aml_observe('rent_refund', r.id, r.payer_id, 'payee', v_counterparty, r.amount_minor,
                              coalesce(r.processor_settled_at, now()), r.processor_refund_id, 'in', 'individual');
end;
$function$;
revoke all on function private.aml_observe_rent_refund(uuid) from public, anon, authenticated;

create or replace function private.aml_observe_guarantee_payout(p_claim uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.guarantee_claims%rowtype;
begin
  select * into c from public.guarantee_claims x where x.id = p_claim;
  if c.id is null or c.status <> 'paid' or coalesce(c.approved_minor, 0) <= 0 then
    return;
  end if;
  perform private.aml_lock_party(c.claimant_id);
  perform private.aml_observe('guarantee_payout', c.id, c.claimant_id, 'payee', null, c.approved_minor,
                              coalesce(c.paid_at, now()), c.paid_reference, 'in', null);
end;
$function$;
revoke all on function private.aml_observe_guarantee_payout(uuid) from public, anon, authenticated;

/* One watch for the three tables; it never fails the write it follows. */
create or replace function private.aml_watch_payouts()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_what text;
begin
  if tg_table_name = 'guarantee_claims' then
    if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
      return new;
    end if;
    v_what := 'Guarantee claim';
  else
    if new.processor_status <> 'processed' or (tg_op = 'UPDATE' and old.processor_status = 'processed') then
      return new;
    end if;
    v_what := case tg_table_name when 'booking_refunds' then 'Refund' else 'Rent share refund' end;
  end if;
  begin
    if tg_table_name = 'booking_refunds' then
      perform private.aml_observe_refund(new.id);
    elsif tg_table_name = 'rent_share_refunds' then
      perform private.aml_observe_rent_refund(new.id);
    else
      perform private.aml_observe_guarantee_payout(new.id);
    end if;
  exception
    when query_canceled then
      perform private.aml_monitor_failed(v_what, new.id, 'cancelled or timed out');
    when others then
      perform private.aml_monitor_failed(v_what, new.id, sqlerrm);
  end;
  return new;
end;
$function$;
revoke all on function private.aml_watch_payouts() from public, anon, authenticated;

drop trigger if exists aml_threshold_watch on public.booking_refunds;
create trigger aml_threshold_watch
  after insert or update of processor_status on public.booking_refunds
  for each row execute function private.aml_watch_payouts();
drop trigger if exists aml_threshold_watch on public.rent_share_refunds;
create trigger aml_threshold_watch
  after insert or update of processor_status on public.rent_share_refunds
  for each row execute function private.aml_watch_payouts();
drop trigger if exists aml_threshold_watch on public.guarantee_claims;
create trigger aml_threshold_watch
  after insert or update of status on public.guarantee_claims
  for each row execute function private.aml_watch_payouts();

/* Everything already processed or paid, observed once, oldest first. */
do $backfill$
declare r record;
begin
  for r in select id from public.booking_refunds where processor_status = 'processed' order by processor_settled_at loop
    perform private.aml_observe_refund(r.id);
  end loop;
  for r in select id from public.rent_share_refunds where processor_status = 'processed' order by processor_settled_at loop
    perform private.aml_observe_rent_refund(r.id);
  end loop;
  for r in select id from public.guarantee_claims where status = 'paid' order by paid_at loop
    perform private.aml_observe_guarantee_payout(r.id);
  end loop;
end;
$backfill$;

/* --------------------------------------------------------------- read-back */

do $readback$
declare
  bad text := '';
begin
  if (select count(*) from pg_trigger
       where tgname = 'aml_threshold_watch'
         and tgrelid in ('public.booking_refunds'::regclass, 'public.rent_share_refunds'::regclass,
                         'public.guarantee_claims'::regclass, 'public.transactions'::regclass)) <> 4 then
    bad := bad || ' [not all four threshold watches are in place]';
  end if;
  if has_function_privilege('authenticated', 'private.aml_watch_payouts()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.aml_observe_refund(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.aml_observe_guarantee_payout(uuid)', 'EXECUTE') then
    bad := bad || ' [a monitor function is callable by a member]';
  end if;
  if has_table_privilege('authenticated', 'public.aml_ledger_observations', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.threshold_events', 'SELECT, INSERT, UPDATE, DELETE') then
    bad := bad || ' [the register is readable by a member]';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.aml_ledger_observations'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.threshold_events'::regclass) then
    bad := bad || ' [RLS is off on the register]';
  end if;
  if bad <> '' then raise exception 'SCUML item 7 (refunds and payouts) READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* ------------------------------------------------------------------- probe */

-- Rolled back. A N6,000,000 refund is not observed while pending or
-- submitted; when Paystack reports it processed the guest is observed once
-- (in, individual, source 'refund') and ONE single event is raised. A N3,000,000
-- processed rent-share refund and a N3,000,000 paid Guarantee claim are each
-- observed once for the person they reach; a second N3,000,000 Guarantee
-- payout to the same lister in the week raises a structuring event on money
-- in. The lane shows the refund's event.
do $probe$
declare
  v_guest uuid := gen_random_uuid();
  v_lister uuid := gen_random_uuid();
  v_s1 uuid := gen_random_uuid();
  v_agent uuid;
  v_listing uuid;
  v_booking uuid;
  v_booking2 uuid;
  v_request uuid;
  v_rent uuid;
  v_tx uuid;
  v_refund uuid;
  v_share uuid;
  v_agreement uuid;
  v_claim uuid;
  v_claim2 uuid;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_obs_before bigint;
  v_events_before bigint;
begin
  select count(*) into v_obs_before from public.aml_ledger_observations;
  select count(*) into v_events_before from public.threshold_events;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml7b-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_guest, 'guest'), (v_lister, 'lister'), (v_s1, 'staff1')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin');
    insert into public.agents (user_id, display_name, role) values (v_lister, 'Probe Owner', 'owner') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML 7 refunds probe shortlet', 'shortlet', 'owner', 'DRAFT', false, 600000000, 'night')
    returning id into v_listing;
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing;
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 2, v_today + 3, 1, 0, 0, 0)
    returning id into v_booking;

    -- 1. A refund is observed only when it is processed, once.
    insert into public.booking_refunds (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, wallet_reference, processor_status)
    values (v_booking, v_guest, 600000000, 600000000, 0, 'goodwill', 'scuml7b-probe-' || gen_random_uuid(), 'pending')
    returning id into v_refund;
    update public.booking_refunds set processor_status = 'submitted', processor_submitted_at = now() where id = v_refund;
    if exists (select 1 from public.aml_ledger_observations where source_id = v_refund) then
      raise exception 'PROBE FAILED: a refund was observed before it was processed';
    end if;
    update public.booking_refunds set processor_status = 'processed', processor_settled_at = now() where id = v_refund;
    if not exists (select 1 from public.aml_ledger_observations
                    where source = 'refund' and source_id = v_refund and party_id = v_guest
                      and direction = 'in' and party_role = 'payee' and party_class = 'individual'
                      and amount_minor = 600000000 and counterparty_id = v_lister) then
      raise exception 'PROBE FAILED: the processed refund was not observed for the guest';
    end if;
    if (select count(*) from public.threshold_events where kind = 'single' and source = 'refund' and source_id = v_refund) <> 1 then
      raise exception 'PROBE FAILED: the refund over the threshold raised no single event';
    end if;

    -- 2. A processed rent-share refund is observed for its payer.
    alter table public.inspection_requests disable trigger user;
    alter table public.rent_payments disable trigger user;
    insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
    values (v_listing, v_guest, v_lister, now()) returning id into v_request;
    perform set_config('vallo.rent_charge', 'true', true);
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 20, v_today + 21, 1, 300000000, 300000000, 300000000)
    returning id into v_booking2;
    perform set_config('vallo.rent_charge', '', true);
    insert into public.rent_payments (inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, total_minor)
    values (v_request, v_listing, v_guest, v_lister, v_booking2, v_today + 20, 300000000)
    returning id into v_rent;
    alter table public.rent_payments enable trigger user;
    alter table public.inspection_requests enable trigger user;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking2, 'paystack', 'scuml7b-probe-' || gen_random_uuid(), 300000000, 'NGN', 'PENDING') returning id into v_tx;
    perform set_config('vallo.recording_unknown_charge', '', true);
    insert into public.rent_share_refunds (transaction_id, rent_payment_id, payer_id, amount_minor, reason,
                                           processor_status, processor_submitted_at, processor_settled_at)
    values (v_tx, v_rent, v_guest, 300000000, 'group_cancelled', 'processed', now(), now())
    returning id into v_share;
    if not exists (select 1 from public.aml_ledger_observations
                    where source = 'rent_refund' and source_id = v_share and party_id = v_guest
                      and direction = 'in' and amount_minor = 300000000 and counterparty_id = v_lister) then
      raise exception 'PROBE FAILED: the processed rent-share refund was not observed';
    end if;

    -- 3. Guarantee payouts: observed when paid; two in a week raise structuring.
    alter table public.deal_agreements disable trigger user;
    insert into public.deal_agreements (kind, listing_id, renter_id, owner_id, amount_minor, terms, booking_id)
    values ('stay', v_listing, v_guest, v_lister, 600000000, '{}'::jsonb, v_booking)
    returning id into v_agreement;
    alter table public.deal_agreements enable trigger user;
    insert into public.guarantee_claims (agreement_id, booking_id, claimant_id, items, description, requested_minor, status, approved_minor)
    values (v_agreement, v_booking, v_lister, array['interior'], 'SCUML 7 probe: a damaged interior door and a broken lamp.', 300000000, 'approved', 300000000)
    returning id into v_claim;
    if exists (select 1 from public.aml_ledger_observations where source_id = v_claim) then
      raise exception 'PROBE FAILED: an approved but unpaid claim was observed';
    end if;
    update public.guarantee_claims set status = 'paid', paid_at = now(), paid_reference = 'scuml7b-probe-payout-1' where id = v_claim;
    insert into public.guarantee_claims (agreement_id, booking_id, claimant_id, items, description, requested_minor, status, approved_minor, paid_at, paid_reference)
    values (v_agreement, v_booking, v_lister, array['kitchen'], 'SCUML 7 probe: a second claim for the kitchen cooker.', 300000000, 'paid', 300000000, now(), 'scuml7b-probe-payout-2')
    returning id into v_claim2;
    if (select count(*) from public.aml_ledger_observations
         where source = 'guarantee_payout' and source_id in (v_claim, v_claim2) and party_id = v_lister
           and direction = 'in' and counterparty_id is null) <> 2 then
      raise exception 'PROBE FAILED: the paid Guarantee claims were not each observed once';
    end if;
    if not exists (select 1 from public.threshold_events
                    where kind = 'structuring' and party_id = v_lister and direction = 'in'
                      and amount_minor = 600000000) then
      raise exception 'PROBE FAILED: two Guarantee payouts past the threshold together raised no structuring event';
    end if;
    -- A second write to a paid claim does not observe it again.
    update public.guarantee_claims set decision_reason = 'Probe note.' where id = v_claim;
    if (select count(*) from public.aml_ledger_observations where source_id = v_claim) <> 1 then
      raise exception 'PROBE FAILED: a paid claim was observed twice';
    end if;

    -- 4. The lane shows the refund's event with its source.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    if not exists (select 1 from jsonb_array_elements(public.threshold_lane(300, 100)->'rows') r
                    where r->>'source' = 'refund' and (r->>'source_id')::uuid = v_refund) then
      raise exception 'PROBE FAILED: the lane does not show the refund event';
    end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.aml_ledger_observations) <> v_obs_before
     or (select count(*) from public.threshold_events) <> v_events_before
     or exists (select 1 from auth.users where id in (v_guest, v_lister, v_s1)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
