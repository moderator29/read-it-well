-- B3 (Session 2, round 3). THE AGREEMENT GATE, AND THE SPLIT READS IT. DRAFT. NOT APPLIED.
-- Depends on: b3_money_policy_versions.sql (apply that first).
--
-- D51: "A lister cannot publish until they accept the figures, and acceptance
-- is recorded server-side with the member, the timestamp and the rate version
-- in force. Figures in naira. A rate change never applies retroactively: the
-- lister is asked again and keeps the old rate until they accept the new one."
--
-- WHAT LANDS
--   public.listing_rate_acceptances     append-only: member, time, policy version,
--                                       the price accepted, the Vallo fee and net in
--                                       kobo, the figures shown in naira
--   public.quote_listing_rate(listing)  what the lister is shown (no write)
--   public.accept_listing_rate(listing, version, amount)   the only way to accept
--   listings_zz_b3_rate_agreement_gate  BEFORE UPDATE OF status: a listing cannot
--                                       move INTO 'SUBMITTED' or 'PUBLISHED' without an
--                                       acceptance on the version in force AND on its
--                                       current price
--   payment_split_for_booking / _for_rent_share
--                                       commission from the lister's latest acceptance
--                                       (their accepted rate, never a newer one), the
--                                       Guarantee leg from the policy at agreement time
--                                       (0 today); no acceptance -> 'rate_not_accepted'
--   private.transactions_payment_gate   no longer demands reserve_subaccount_code when
--                                       guarantee_minor is 0
--   public.crypto_open_attempt          same: reserve required only for a non-zero leg
--
-- DECISIONS, stated so a reviewer can disagree:
--  * Which price: sale -> sale_price_minor; otherwise rent_amount_minor, else rate_minor.
--    A change of price after acceptance re-opens the question (the figures accepted
--    were for a different number).
--  * Existing PUBLISHED listings are not touched by the trigger (it fires on a status
--    TRANSITION). They cannot be CHARGED commission without an acceptance either: the
--    split returns 'rate_not_accepted'. 0 transactions and 0 agreements exist today
--    (read 6 Oct 2026), so nothing in flight changes.
--  * Bookings with no listing (hotel rooms on accommodations) have no acceptance
--    surface yet, so they return 'rate_not_accepted'. Unfinished, named in the report.
--  * Only an INSERT already in 'SUBMITTED'/'PUBLISHED' is also gated, so a direct
--    insert cannot bypass the transition rule. Demo rows (is_demo) are exempt: they
--    are never charged.
--
-- No drop, no delete. RLS on. No member write grant (writes only through the
-- SECURITY DEFINER function), so the DB-06 allowlist is unchanged.

begin;

create table if not exists public.listing_rate_acceptances (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null references public.listings(id),
  member_id            uuid not null,
  accepted_at          timestamptz not null default now(),
  policy_version_id    bigint not null references public.money_policy_versions(id),
  property_type        public.property_type not null,
  amount_minor         bigint not null check (amount_minor > 0),
  commission_bps       integer not null check (commission_bps between 0 and 10000),
  cap_threshold_minor  bigint,
  cap_minor            bigint,
  commission_minor     bigint not null check (commission_minor >= 0),
  net_minor            bigint not null check (net_minor >= 0),
  figures_shown        jsonb not null,
  constraint listing_rate_acceptances_adds_up check (commission_minor + net_minor = amount_minor)
);
create index if not exists listing_rate_acceptances_listing_idx
  on public.listing_rate_acceptances (listing_id, accepted_at desc);

create or replace trigger listing_rate_acceptances_append_only
  before update or delete on public.listing_rate_acceptances
  for each row execute function private.money_policy_append_only();

alter table public.listing_rate_acceptances enable row level security;
revoke all on public.listing_rate_acceptances from anon, authenticated;
grant select on public.listing_rate_acceptances to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listing_rate_acceptances'
                  and policyname = 'listing_rate_acceptances_own_or_staff') then
    create policy listing_rate_acceptances_own_or_staff on public.listing_rate_acceptances
      for select to authenticated
      using (member_id = (select auth.uid()) or private.is_staff());
  end if;
end $$;

-- The price the figures are on.
create or replace function private.b3_listing_price_minor(p_listing uuid)
returns bigint language sql stable security definer set search_path to '' as $$
  select case when l.listing_intent = 'sale' then l.sale_price_minor
              else coalesce(l.rent_amount_minor, l.rate_minor) end
    from public.listings l where l.id = p_listing;
$$;

-- The latest acceptance, whatever its version: the rate the lister keeps.
create or replace function private.b3_latest_acceptance(p_listing uuid)
returns public.listing_rate_acceptances
language sql stable security definer set search_path to '' as $$
  select a.* from public.listing_rate_acceptances a
   where a.listing_id = p_listing order by a.accepted_at desc, a.id desc limit 1;
$$;

-- What the lister is shown. Writes nothing.
create or replace function public.quote_listing_rate(p_listing uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  l public.listings%rowtype;
  v public.money_policy_versions%rowtype;
  price bigint;
  q jsonb;
  acc public.listing_rate_acceptances%rowtype;
begin
  select * into l from public.listings where id = p_listing;
  if l.id is null or not exists (select 1 from public.agents a where a.id = l.agent_id and a.user_id = (select auth.uid()))
     and not private.is_staff() then
    return jsonb_build_object('status', 'not_found');
  end if;
  v := public.money_policy_at(now());
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  price := private.b3_listing_price_minor(l.id);
  if price is null or price <= 0 then return jsonb_build_object('status', 'no_price'); end if;
  q := public.commission_quote(v.id, l.property_type, price);
  acc := private.b3_latest_acceptance(l.id);
  return q || jsonb_build_object(
    'listing_id', l.id,
    'accepted', acc.id is not null and acc.policy_version_id = v.id and acc.amount_minor = price,
    'accepted_at', acc.accepted_at,
    'accepted_policy_version_id', acc.policy_version_id);
end;
$$;

-- The only write. The client names the version and the price it SHOWED, so a
-- rate or price that moved between showing and tapping is refused, never
-- silently accepted at a figure the lister did not see.
create or replace function public.accept_listing_rate(p_listing uuid, p_policy_version bigint, p_amount_minor bigint)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
declare
  me uuid := (select auth.uid());
  l public.listings%rowtype;
  v public.money_policy_versions%rowtype;
  price bigint;
  q jsonb;
  row_id uuid;
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;
  select * into l from public.listings where id = p_listing for update;
  if l.id is null or not exists (select 1 from public.agents a where a.id = l.agent_id and a.user_id = me) then
    return jsonb_build_object('status', 'not_found');
  end if;
  v := public.money_policy_at(now());
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  if p_policy_version is distinct from v.id then
    return jsonb_build_object('status', 'rate_changed', 'policy_version_id', v.id);
  end if;
  price := private.b3_listing_price_minor(l.id);
  if price is null or price <= 0 then return jsonb_build_object('status', 'no_price'); end if;
  if p_amount_minor is distinct from price then
    return jsonb_build_object('status', 'price_changed', 'amount_minor', price);
  end if;
  q := public.commission_quote(v.id, l.property_type, price);
  if q->>'status' <> 'ok' then return q; end if;
  insert into public.listing_rate_acceptances
    (listing_id, member_id, policy_version_id, property_type, amount_minor, commission_bps,
     cap_threshold_minor, cap_minor, commission_minor, net_minor, figures_shown)
  values
    (l.id, me, v.id, l.property_type, price, (q->>'commission_bps')::integer,
     (q->>'cap_threshold_minor')::bigint, (q->>'cap_minor')::bigint,
     (q->>'commission_minor')::bigint, (q->>'net_minor')::bigint,
     jsonb_build_object(
       'amount_naira', to_char(price / 100.0, 'FM999,999,999,990.00'),
       'vallo_fee_naira', to_char((q->>'commission_minor')::bigint / 100.0, 'FM999,999,999,990.00'),
       'net_naira', to_char((q->>'net_minor')::bigint / 100.0, 'FM999,999,999,990.00'),
       'policy_version', v.version))
  returning id into row_id;
  return q || jsonb_build_object('acceptance_id', row_id);
end;
$$;

revoke all on function public.quote_listing_rate(uuid) from public;
revoke all on function public.accept_listing_rate(uuid, bigint, bigint) from public;
grant execute on function public.quote_listing_rate(uuid) to authenticated, service_role;
grant execute on function public.accept_listing_rate(uuid, bigint, bigint) to authenticated;

-- THE GATE.
create or replace function private.b3_rate_agreement_gate()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  acc public.listing_rate_acceptances%rowtype;
  v public.money_policy_versions%rowtype;
begin
  if new.status not in ('SUBMITTED', 'PUBLISHED') then return new; end if;
  if tg_op = 'UPDATE' and old.status = new.status then return new; end if;
  if coalesce(new.is_demo, false) then return new; end if;
  acc := private.b3_latest_acceptance(new.id);
  v := public.money_policy_at(now());
  if acc.id is null or v.id is null or acc.policy_version_id <> v.id
     or acc.amount_minor is distinct from (case when new.listing_intent = 'sale' then new.sale_price_minor
                                              else coalesce(new.rent_amount_minor, new.rate_minor) end) then
    raise exception 'rate_agreement_required: the lister has not accepted the current fee on this price'
      using errcode = '42501', hint = 'accept_listing_rate';
  end if;
  return new;
end;
$$;

create or replace trigger listings_zz_b3_rate_agreement_gate
  before insert or update of status on public.listings
  for each row execute function private.b3_rate_agreement_gate();

-- Commission for a booking: the listing's latest acceptance, at ITS rate.
create or replace function private.b3_commission_for_booking(p_booking uuid, p_amount_minor bigint)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  bk public.bookings%rowtype;
  acc public.listing_rate_acceptances%rowtype;
  fee bigint;
begin
  select * into bk from public.bookings where id = p_booking;
  if bk.listing_id is null then return jsonb_build_object('status', 'rate_not_accepted'); end if;
  acc := private.b3_latest_acceptance(bk.listing_id);
  if acc.id is null then return jsonb_build_object('status', 'rate_not_accepted'); end if;
  fee := (p_amount_minor * acc.commission_bps) / 10000;
  if acc.cap_threshold_minor is not null and p_amount_minor > acc.cap_threshold_minor then
    fee := least(fee, acc.cap_minor);
  end if;
  return jsonb_build_object('status', 'ok', 'commission_bps', acc.commission_bps,
                            'commission_minor', fee, 'acceptance_id', acc.id);
end;
$$;

-- The Guarantee leg: the policy at the moment the agreement was drawn (0 today).
create or replace function private.b3_guarantee_bps_at(p_at timestamptz)
returns integer language sql stable security definer set search_path to '' as $$
  select coalesce((public.money_policy_at(p_at)).guarantee_bps, 0);
$$;

create or replace function public.payment_split_for_booking(p_booking uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  bk public.bookings%rowtype;
  ag public.deal_agreements%rowtype;
  g_bps integer;
  c jsonb;
  guarantee bigint;
  commission bigint;
  sub text;
begin
  select * into bk from public.bookings where id = p_booking;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into ag from public.deal_agreements where booking_id = bk.id;
  if ag.id is null then
    return jsonb_build_object('status', 'no_agreement');
  end if;
  if ag.status <> 'approved' then
    return jsonb_build_object('status', 'agreement_not_approved', 'agreement_status', ag.status, 'agreement_id', ag.id);
  end if;
  if ag.amount_minor <> bk.total_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  sub := private.payee_subaccount(ag.owner_id);
  if sub is null then
    return jsonb_build_object('status', 'payee_not_set_up', 'agreement_id', ag.id);
  end if;
  c := private.b3_commission_for_booking(bk.id, bk.total_minor);
  if c->>'status' <> 'ok' then
    return jsonb_build_object('status', c->>'status', 'agreement_id', ag.id);
  end if;
  g_bps := private.b3_guarantee_bps_at(ag.created_at);
  guarantee := (bk.total_minor * g_bps) / 10000;
  commission := (c->>'commission_minor')::bigint;
  if guarantee + commission > bk.total_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  return jsonb_build_object(
    'status', 'ok', 'agreement_id', ag.id, 'amount_minor', bk.total_minor,
    'payee_user_id', ag.owner_id, 'payee_subaccount_code', sub,
    'guarantee_minor', guarantee, 'commission_minor', commission,
    'lister_share_minor', bk.total_minor - guarantee - commission,
    'guarantee_bps', g_bps, 'commission_bps', (c->>'commission_bps')::integer,
    'rate_acceptance_id', c->>'acceptance_id');
end;
$function$;

create or replace function public.payment_split_for_rent_share(p_rent_payment uuid, p_payer uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  rp public.rent_payments%rowtype;
  ag public.deal_agreements%rowtype;
  owed bigint;
  g_bps integer;
  c jsonb;
  guarantee bigint;
  commission bigint;
  sub text;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or p_payer is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_payer <> rp.tenant_id
     and not exists (select 1 from public.rent_payment_contributors c where c.rent_payment_id = rp.id and c.user_id = p_payer) then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into ag from public.deal_agreements where booking_id = rp.booking_id;
  if ag.id is null or ag.status <> 'approved' then
    return jsonb_build_object('status', 'agreement_not_approved', 'agreement_status', ag.status);
  end if;
  if not private.rent_charge_payable(rp.id) then
    return jsonb_build_object('status', 'not_open');
  end if;
  owed := private.rent_share_owed(rp.id, p_payer);
  if owed is null then
    return jsonb_build_object('status', 'not_accepted');
  end if;
  if owed <= 0 then
    return jsonb_build_object('status', 'nothing_owed');
  end if;
  if exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL'
                and (t.share_payer_id is null or t.share_payer_id = p_payer)) then
    return jsonb_build_object('status', 'already_paid');
  end if;
  sub := private.payee_subaccount(ag.owner_id);
  if sub is null then
    return jsonb_build_object('status', 'payee_not_set_up', 'agreement_id', ag.id);
  end if;
  c := private.b3_commission_for_booking(rp.booking_id, owed);
  if c->>'status' <> 'ok' then
    return jsonb_build_object('status', c->>'status', 'agreement_id', ag.id);
  end if;
  g_bps := private.b3_guarantee_bps_at(ag.created_at);
  guarantee := (owed * g_bps) / 10000;
  commission := (c->>'commission_minor')::bigint;
  if guarantee + commission > owed then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  return jsonb_build_object(
    'status', 'ok', 'agreement_id', ag.id, 'booking_id', rp.booking_id, 'amount_minor', owed,
    'payee_user_id', ag.owner_id, 'payee_subaccount_code', sub,
    'guarantee_minor', guarantee, 'commission_minor', commission,
    'lister_share_minor', owed - guarantee - commission,
    'guarantee_bps', g_bps, 'commission_bps', (c->>'commission_bps')::integer,
    'rate_acceptance_id', c->>'acceptance_id',
    'share_payer_id', p_payer, 'is_lead', p_payer = rp.tenant_id,
    'total_minor', rp.total_minor);
end;
$function$;

-- GATE 2 OF THE TRACE: the attempt row no longer needs a reserve code when
-- there is no reserve leg. Everything else is byte-for-byte the live function.
create or replace function private.transactions_payment_gate()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  rp public.rent_payments%rowtype;
  owed bigint;
begin
  if coalesce(current_setting('vallo.recording_unknown_charge', true), '') = 'on' then
    return new;
  end if;
  if new.status <> 'PENDING' then
    raise exception 'payment_gate: a charge opens as PENDING' using errcode = '42501';
  end if;
  if new.lister_share_minor is null or new.payee_subaccount_code is null or new.agreement_id is null
     or (coalesce(new.guarantee_minor, 0) > 0 and new.reserve_subaccount_code is null) then
    raise exception 'payment_gate: a charge needs its split and its agreement' using errcode = '42501';
  end if;
  if new.share_payer_id is null then
    if not exists (select 1 from public.deal_agreements a
                    where a.id = new.agreement_id and a.booking_id = new.booking_id
                      and a.status = 'approved' and a.amount_minor = new.amount_minor) then
      raise exception 'payment_gate: payment is not available until the agreement is approved' using errcode = '42501';
    end if;
    return new;
  end if;
  -- V-86: a flatmate's share, or the lead's remainder, of one rent charge.
  if not exists (select 1 from public.deal_agreements a
                  where a.id = new.agreement_id and a.booking_id = new.booking_id and a.status = 'approved') then
    raise exception 'payment_gate: payment is not available until the agreement is approved' using errcode = '42501';
  end if;
  select * into rp from public.rent_payments where booking_id = new.booking_id;
  owed := private.rent_share_owed(rp.id, new.share_payer_id);
  if rp.id is null or owed is null or owed <= 0 or owed <> new.amount_minor then
    raise exception 'payment_gate: a share must be exactly what this person owes on the move-in' using errcode = '42501';
  end if;
  if exists (select 1 from public.transactions t
              where t.booking_id = new.booking_id and t.status = 'SUCCESSFUL'
                and (t.share_payer_id is null or t.share_payer_id = new.share_payer_id)) then
    raise exception 'payment_gate: this share is already paid' using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- GATE 3: the crypto rail asked for the reserve code before it knew the leg.
-- Now asked only when the leg is non-zero. Otherwise the live function unchanged.
create or replace function public.crypto_open_attempt(p_payment uuid, p_reserve_code text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  cp    public.crypto_payments%rowtype;
  split jsonb;
  tx_id uuid;
  dest  record;
  reserve text := nullif(btrim(coalesce(p_reserve_code, '')), '');
begin
  select * into cp from public.crypto_payments where id = p_payment for update;
  if cp.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if cp.state <> 'quoted' then return jsonb_build_object('status', 'not_quoted', 'state', cp.state); end if;
  if cp.quote_expires_at <= now() then return jsonb_build_object('status', 'quote_expired'); end if;
  if cp.transaction_id is not null then return jsonb_build_object('status', 'already_open'); end if;

  perform 1 from public.bookings where id = cp.booking_id for update;
  if exists (select 1 from public.transactions t where t.booking_id = cp.booking_id and t.status = 'SUCCESSFUL') then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if exists (select 1 from public.crypto_payments o
              where o.booking_id = cp.booking_id and o.id <> cp.id
                and o.state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting'))
     or private.booking_payment_in_flight(cp.booking_id) then
    return jsonb_build_object('status', 'in_flight');
  end if;

  split := public.payment_split_for_booking(cp.booking_id);
  if split->>'status' <> 'ok' then return jsonb_build_object('status', split->>'status'); end if;
  if (split->>'amount_minor')::bigint <> cp.amount_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  if (split->>'guarantee_minor')::bigint > 0 and reserve is null then
    return jsonb_build_object('status', 'reserve_not_set_up');
  end if;

  select pa.bank_code, pa.account_number, coalesce(pa.resolved_account_name, pa.account_name) as account_name
    into dest
    from public.payout_accounts pa
    join public.agents a on a.id = pa.agent_id
   where a.user_id = (split->>'payee_user_id')::uuid
     and pa.paystack_subaccount_code = split->>'payee_subaccount_code'
     and pa.resolved_at is not null
     and pa.bank_code is not null
   order by pa.is_default desc, pa.created_at desc
   limit 1;
  if dest.account_number is null then return jsonb_build_object('status', 'payee_not_set_up'); end if;

  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
                                   payee_user_id, payee_subaccount_code, reserve_subaccount_code,
                                   lister_share_minor, guarantee_minor, commission_minor, checkout_opened_at)
  values (cp.booking_id, 'yellowcard', cp.reference, cp.amount_minor, 'NGN', 'PENDING',
          (split->>'agreement_id')::uuid, (split->>'payee_user_id')::uuid, split->>'payee_subaccount_code',
          reserve, (split->>'lister_share_minor')::bigint, (split->>'guarantee_minor')::bigint,
          (split->>'commission_minor')::bigint, now())
  returning id into tx_id;

  update public.crypto_payments
     set transaction_id = tx_id, agreement_id = (split->>'agreement_id')::uuid
   where id = cp.id;

  return jsonb_build_object(
    'status', 'ok', 'transaction_id', tx_id, 'reference', cp.reference, 'amount_minor', cp.amount_minor,
    'agreement_id', split->>'agreement_id', 'payee_user_id', split->>'payee_user_id',
    'lister_share_minor', (split->>'lister_share_minor')::bigint,
    'guarantee_minor', (split->>'guarantee_minor')::bigint,
    'commission_minor', (split->>'commission_minor')::bigint,
    'lister_bank_code', dest.bank_code, 'lister_account_number', dest.account_number,
    'lister_account_name', dest.account_name);
end;
$function$;

-- READ-BACK.
do $$
declare n int;
begin
  if not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = 'listing_rate_acceptances' and c.relrowsecurity) then
    raise exception 'b3_rate_agreement_gate: RLS is not on listing_rate_acceptances';
  end if;
  select count(*) into n from pg_trigger
   where tgname in ('listings_zz_b3_rate_agreement_gate', 'listing_rate_acceptances_append_only') and not tgisinternal;
  if n <> 2 then raise exception 'b3_rate_agreement_gate: % of 2 triggers landed', n; end if;
  if has_table_privilege('authenticated', 'public.listing_rate_acceptances', 'insert')
     or has_table_privilege('authenticated', 'public.listing_rate_acceptances', 'update')
     or has_table_privilege('authenticated', 'public.listing_rate_acceptances', 'delete') then
    raise exception 'b3_rate_agreement_gate: members can write acceptances directly';
  end if;
  if position('b3_commission_for_booking' in pg_get_functiondef('public.payment_split_for_booking(uuid)'::regprocedure)) = 0
     or position('b3_commission_for_booking' in pg_get_functiondef('public.payment_split_for_rent_share(uuid,uuid)'::regprocedure)) = 0 then
    raise exception 'b3_rate_agreement_gate: a split does not read the accepted rate';
  end if;
  if position('coalesce(new.guarantee_minor, 0) > 0' in pg_get_functiondef('private.transactions_payment_gate()'::regprocedure)) = 0 then
    raise exception 'b3_rate_agreement_gate: the payment gate still demands a reserve at zero';
  end if;
  if not has_function_privilege('authenticated', 'public.accept_listing_rate(uuid,bigint,bigint)', 'execute')
     or has_function_privilege('anon', 'public.accept_listing_rate(uuid,bigint,bigint)', 'execute') then
    raise exception 'b3_rate_agreement_gate: accept_listing_rate grants are wrong';
  end if;
end $$;

commit;
