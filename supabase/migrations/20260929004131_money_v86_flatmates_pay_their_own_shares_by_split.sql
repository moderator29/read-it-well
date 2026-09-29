-- MONEY 6 / V-86: FLATMATES PAY THEIR OWN SHARES OF A MOVE-IN, BY SPLIT.
--
-- Supersedes the unapplied 20260924140900_v86 (moved to superseded/), in
-- which a co-tenant paid their share WALLET TO WALLET into the lead tenant's
-- Vallo wallet and the lead paid the lister once. That was Vallo holding the
-- flatmates' money. The redesign:
--
-- EACH PERSON PAYS THEIR OWN SHARE STRAIGHT TO THE LISTER. The lead tenant
-- (the rent charge's `tenant_id`) invites co-tenants to a share; a co-tenant
-- accepts or declines. Every accepted co-tenant, and the lead for the
-- remainder, pays a SEPARATE Paystack charge against the ONE rent charge's
-- booking, each carrying its own split: the lister's share to the lister's
-- subaccount, the Guarantee contribution to the reserve. `transactions`
-- gains `share_payer_id` (who this share is for; null means the whole
-- charge). Nothing is held anywhere between shares: each share settles to the
-- lister the moment it is paid.
--
-- THE CHARGE IS SETTLED WHEN THE SHARES SUM TO THE TOTAL.
-- `private.settle_booking_charge` (live body, plus the share branch) records
-- each share's ledger row and Guarantee contribution; a share that leaves the
-- total short answers `share-settled` and leaves the agreement `approved` and
-- the booking PENDING; the share that completes it answers `settled`, marks
-- the agreement paid and confirms the booking, exactly as a whole payment
-- does. A share for the wrong amount, a second share for the same person, a
-- share on top of a whole payment, or one that would pass the total is
-- `refund-due` and goes back to that payer's card in full.
--
-- THE ONE-SUCCESS INDEX. `transactions_one_success_per_booking` (MON-05)
-- becomes two: one whole payment per booking, and one share per person per
-- booking. Mixing a whole payment with shares is refused inside settlement
-- under the booking lock.
--
-- THE SPLIT LOCKS AT THE FIRST PAYMENT. Once any share has settled or is in
-- flight, nobody is added, removed or allowed to decline, so the lead's
-- remainder can never move under a payment already made.
--
-- IF THE GROUP CANCELS BEFORE COMPLETION, every share already paid is
-- refunded to the card it came from, by Paystack: `rent_split_cancel_as`
-- (the lead) or the daily sweep (a split still incomplete on the move-in day)
-- cancels the charge, records one `rent_share_refunds` row per paid share
-- (and, as every card refund on a split charge does, what the lister received
-- as owed back in `rent_refunds_owed`), and the app submits each refund to
-- Paystack (`lib/tenancy/share-refunds.ts`, and the `rent-share-refunds`
-- cron job that retries). The processor's answer is recorded forward only,
-- and the V-24 refund clock measures these refunds too.
--
-- Every door checks auth.uid() or is service-role only; every table is
-- RLS-on and written only by these functions.

/* ------------------------------------------------------------ who pays which share */
create table if not exists public.rent_payment_contributors (
  id              uuid primary key default gen_random_uuid(),
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete restrict,
  share_minor     bigint not null check (share_minor > 0),
  added_by        uuid not null,
  added_at        timestamptz not null default now(),
  unique (rent_payment_id, user_id)
);
comment on table public.rent_payment_contributors is
  'V-86. A co-tenant invited to pay a share of a rent charge''s move-in total straight to the lister by split. The lead''s share is the remainder. Written only by add_rent_contributor; an unpaid row can be removed by the lead until the split locks.';

create table if not exists public.rent_share_answers (
  contributor_id uuid primary key references public.rent_payment_contributors(id) on delete cascade,
  answer         text not null check (answer in ('accepted', 'declined')),
  answered_at    timestamptz not null default now()
);
create table if not exists public.rent_share_declines (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null,
  declined_at     timestamptz not null default now(),
  primary key (rent_payment_id, user_id)
);
create table if not exists public.rent_share_notices (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null,
  sent_at         timestamptz not null default now(),
  primary key (rent_payment_id, user_id)
);
create index if not exists rent_payment_contributors_user_idx on public.rent_payment_contributors (user_id);

alter table public.transactions
  add column if not exists share_payer_id uuid references auth.users(id) on delete restrict;
create index if not exists transactions_share_payer_idx on public.transactions (share_payer_id) where share_payer_id is not null;

-- MON-05, split in two.
drop index if exists public.transactions_one_success_per_booking;
create unique index if not exists transactions_one_whole_success_per_booking
  on public.transactions (booking_id) where status = 'SUCCESSFUL' and share_payer_id is null;
create unique index if not exists transactions_one_share_success_per_payer
  on public.transactions (booking_id, share_payer_id) where status = 'SUCCESSFUL' and share_payer_id is not null;

/* ------------------------------------------------------------ refunds of shares, to the card */
create table if not exists public.rent_share_refunds (
  id                     uuid primary key default gen_random_uuid(),
  transaction_id         uuid not null unique references public.transactions(id) on delete restrict,
  rent_payment_id        uuid not null references public.rent_payments(id) on delete restrict,
  payer_id               uuid not null,
  amount_minor           bigint not null check (amount_minor > 0),
  reason                 text not null check (reason in ('group_cancelled', 'stalled_before_move_in')),
  processor_status       text not null default 'pending' check (processor_status in ('pending', 'submitted', 'processed', 'failed')),
  processor_refund_id    text,
  created_at             timestamptz not null default now(),
  processor_submitted_at timestamptz,
  processor_settled_at   timestamptz,
  constraint rent_share_refunds_stamps check (
    (processor_status not in ('submitted', 'processed') or processor_submitted_at is not null)
    and (processor_status <> 'processed' or processor_settled_at is not null))
);
comment on table public.rent_share_refunds is
  'V-86. A flatmate''s share refunded to the card that paid it because the group cancelled (or the split stalled) before the move-in total was complete. The refund is made by Paystack; this row records what it was for and where the processor has it. Append-only apart from forward processor steps.';
create index if not exists rent_share_refunds_rent_payment_idx on public.rent_share_refunds (rent_payment_id);
create index if not exists rent_share_refunds_payer_idx on public.rent_share_refunds (payer_id);
create index if not exists rent_share_refunds_processor_idx on public.rent_share_refunds (processor_status, created_at)
  where processor_status in ('pending', 'submitted', 'failed');

create or replace function private.rent_share_refunds_forward_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  processor_cols constant text[] := array['processor_status', 'processor_refund_id',
                                          'processor_submitted_at', 'processor_settled_at'];
begin
  if tg_op = 'DELETE' then
    raise exception 'public.rent_share_refunds is append-only' using errcode = '42501';
  end if;
  if (to_jsonb(new) - processor_cols) = (to_jsonb(old) - processor_cols)
     and ((old.processor_status = 'pending' and new.processor_status in ('submitted', 'failed'))
          or (old.processor_status = 'failed' and new.processor_status = 'submitted')
          or (old.processor_status = 'submitted' and new.processor_status in ('processed', 'failed')))
     and (old.processor_submitted_at is null or new.processor_submitted_at = old.processor_submitted_at) then
    return new;
  end if;
  raise exception 'public.rent_share_refunds is append-only' using errcode = '42501';
end;
$function$;
revoke all on function private.rent_share_refunds_forward_only() from public, anon, authenticated;

/* ------------------------------------------------------------ born locked */
alter table public.rent_payment_contributors enable row level security;
alter table public.rent_share_answers enable row level security;
alter table public.rent_share_declines enable row level security;
alter table public.rent_share_notices enable row level security;
alter table public.rent_share_refunds enable row level security;
revoke all on public.rent_payment_contributors, public.rent_share_answers, public.rent_share_declines,
              public.rent_share_notices, public.rent_share_refunds from public, anon, authenticated;
grant select on public.rent_payment_contributors, public.rent_share_answers, public.rent_share_refunds to authenticated;
grant select, insert, delete on public.rent_payment_contributors to service_role;
grant select, insert on public.rent_share_answers, public.rent_share_declines, public.rent_share_notices to service_role;
grant select, insert, update on public.rent_share_refunds to service_role;

-- The lead and the co-tenant themselves, and staff. Not the lister: who the
-- tenant shares a flat with is not the lister's business.
drop policy if exists rent_payment_contributors_read on public.rent_payment_contributors;
create policy rent_payment_contributors_read on public.rent_payment_contributors for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.rent_payments rp where rp.id = rent_payment_id and rp.tenant_id = (select auth.uid()))
         or private.is_staff());
drop policy if exists rent_share_answers_read on public.rent_share_answers;
create policy rent_share_answers_read on public.rent_share_answers for select to authenticated
  using (exists (select 1 from public.rent_payment_contributors c where c.id = contributor_id));
drop policy if exists rent_share_refunds_read on public.rent_share_refunds;
create policy rent_share_refunds_read on public.rent_share_refunds for select to authenticated
  using (payer_id = (select auth.uid())
         or exists (select 1 from public.rent_payments rp where rp.id = rent_payment_id and rp.tenant_id = (select auth.uid()))
         or private.is_staff());

do $$
declare t text;
begin
  foreach t in array array['rent_share_answers', 'rent_share_declines', 'rent_share_notices'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_frozen', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.tenancy_record_is_frozen()', t || '_frozen', t);
  end loop;
end $$;
drop trigger if exists rent_payment_contributors_frozen on public.rent_payment_contributors;
create trigger rent_payment_contributors_frozen before update on public.rent_payment_contributors
  for each row execute function private.tenancy_record_is_frozen();
drop trigger if exists rent_share_refunds_forward_only on public.rent_share_refunds;
create trigger rent_share_refunds_forward_only before update or delete on public.rent_share_refunds
  for each row execute function private.rent_share_refunds_forward_only();

/* ------------------------------------------------------------ the arithmetic */
-- What this person owes on this charge: an accepted co-tenant their share,
-- the lead the remainder after every co-tenant share not declined. Null for
-- anybody else, or a share not accepted.
create or replace function private.rent_share_owed(p_rent_payment uuid, p_payer uuid)
returns bigint
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when rp.tenant_id = p_payer then
      rp.total_minor - coalesce((select sum(c.share_minor) from public.rent_payment_contributors c
                                  where c.rent_payment_id = rp.id
                                    and not exists (select 1 from public.rent_share_answers a
                                                     where a.contributor_id = c.id and a.answer = 'declined')), 0)
    else (select c.share_minor from public.rent_payment_contributors c
           join public.rent_share_answers a on a.contributor_id = c.id and a.answer = 'accepted'
          where c.rent_payment_id = rp.id and c.user_id = p_payer)
  end
  from public.rent_payments rp where rp.id = p_rent_payment;
$function$;
revoke all on function private.rent_share_owed(uuid, uuid) from public, anon, authenticated;

-- Open and payable: approved agreement, booking PENDING, not yet fully paid, not void.
create or replace function private.rent_charge_payable(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.rent_payments rp
      join public.bookings b on b.id = rp.booking_id
      join public.deal_agreements a on a.booking_id = b.id and a.status = 'approved'
     where rp.id = p_rent_payment and b.status = 'PENDING')
    and not private.tenancy_paid(p_rent_payment)
    and not private.tenancy_void(p_rent_payment);
$function$;
revoke all on function private.rent_charge_payable(uuid) from public, anon, authenticated;

-- Locked once any payment on the charge has settled or is in flight.
create or replace function private.rent_split_locked(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (select 1 from public.rent_payments rp
                  where rp.id = p_rent_payment
                    and (exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL')
                         or private.booking_payment_in_flight(rp.booking_id)));
$function$;
revoke all on function private.rent_split_locked(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------ the gate, with shares */
create or replace function private.transactions_payment_gate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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
  if new.lister_share_minor is null or new.payee_subaccount_code is null or new.reserve_subaccount_code is null
     or new.agreement_id is null then
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

/* The split a share is opened with. The only place a share's parts are
   computed; the server stores them on the attempt. Service role only. */
create or replace function public.payment_split_for_rent_share(p_rent_payment uuid, p_payer uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  rp public.rent_payments%rowtype;
  ag public.deal_agreements%rowtype;
  owed bigint;
  g_bps integer;
  c_bps integer;
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
  g_bps := coalesce((ag.terms ->> 'guarantee_bps')::integer, (select m.guarantee_bps from public.money_policy m));
  c_bps := coalesce((ag.terms ->> 'commission_bps')::integer, private.current_fee_bps('commission'));
  guarantee := (owed * g_bps) / 10000;
  commission := (owed * c_bps) / 10000;
  return jsonb_build_object(
    'status', 'ok', 'agreement_id', ag.id, 'booking_id', rp.booking_id, 'amount_minor', owed,
    'payee_user_id', ag.owner_id, 'payee_subaccount_code', sub,
    'guarantee_minor', guarantee, 'commission_minor', commission,
    'lister_share_minor', owed - guarantee - commission,
    'guarantee_bps', g_bps, 'commission_bps', c_bps,
    'share_payer_id', p_payer, 'is_lead', p_payer = rp.tenant_id,
    'total_minor', rp.total_minor);
end;
$function$;
revoke all on function public.payment_split_for_rent_share(uuid, uuid) from public, anon, authenticated;
grant execute on function public.payment_split_for_rent_share(uuid, uuid) to service_role;

/* ------------------------------------------------------------ settlement, with shares */
-- The live body (28 September 2026) with the share branch: reasons a share
-- cannot be applied, and `share-settled` until the shares reach the total.
create or replace function private.settle_booking_charge(
  p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint default null, p_fallback_booking uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx          public.transactions%rowtype;
  bk          public.bookings%rowtype;
  ag          public.deal_agreements%rowtype;
  rp          public.rent_payments%rowtype;
  gross       bigint;
  fee         bigint;
  reason      text;
  was_pending boolean;
  is_rent     boolean;
  is_share    boolean;
  paid_before bigint;
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_reference is null or length(btrim(p_reference)) = 0 then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  select * into tx from public.transactions where provider_ref = p_reference;
  if tx.id is null then
    if p_fallback_booking is null
       or not exists (select 1 from public.bookings where id = p_fallback_booking) then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    perform set_config('vallo.recording_unknown_charge', '', true);
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;
  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;
  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', tx.status);
  end if;
  select * into ag from public.deal_agreements where id = tx.agreement_id for update;
  is_rent := exists (select 1 from public.rent_payments r where r.booking_id = bk.id);
  if is_rent then
    perform 1 from public.listings where id = bk.listing_id for update;
    select * into rp from public.rent_payments where booking_id = bk.id;
  end if;
  is_share := tx.share_payer_id is not null;
  select coalesce(sum(t.amount_minor), 0) into paid_before
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id;
  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;
  reason := case
    when tx.lister_share_minor is null or ag.id is null then 'no_split'
    when ag.status <> 'approved' then 'agreement_' || ag.status::text
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    when not is_share and exists (select 1 from public.transactions t
                                   where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id) then 'already_paid'
    when is_share and rp.id is null then 'no_split'
    when is_share and exists (select 1 from public.transactions t
                               where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id
                                 and (t.share_payer_id is null or t.share_payer_id = tx.share_payer_id)) then 'already_paid'
    when is_share and paid_before + tx.amount_minor > rp.total_minor then 'over_total'
    when is_rent and private.listing_is_let(bk.listing_id, bk.id) then 'already_let'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    when gross <> tx.amount_minor then 'amount_mismatch'
    else null
  end;
  if reason is not null then
    update public.transactions set status = 'FAILED', updated_at = now() where id = tx.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A card payment could not be applied and must be refunded to the card',
            format('Reference %s took %s kobo for booking %s (status %s) and could not be applied (%s). '
                   || 'Refund the full amount to the card through Paystack.',
                   p_reference, gross, bk.id, bk.status, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_refund_due', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross, 'reason', reason,
                               'share_payer_id', tx.share_payer_id));
    return jsonb_build_object('outcome', 'refund-due', 'booking_id', bk.id, 'reason', reason,
                              'amount_minor', gross, 'reference', p_reference);
  end if;
  update public.transactions set status = 'SUCCESSFUL', updated_at = now() where id = tx.id;
  fee := least(tx.lister_share_minor, greatest(0, coalesce(p_processor_fee_minor, 0)));
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor,
     processor_fee_minor, guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, tx.commission_minor, tx.lister_share_minor - fee, fee, tx.guarantee_minor,
          tx.lister_share_minor - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;
  if tx.guarantee_minor > 0 then
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, transaction_id, note)
    values ('in', 'contribution', tx.guarantee_minor, bk.id, tx.id, 'Guarantee contribution settled with the charge')
    on conflict (transaction_id) do nothing;
  end if;
  -- V-86: a share that leaves the move-in short. It settled to the lister;
  -- the charge, the agreement and the booking wait for the rest.
  if is_share and paid_before + gross < rp.total_minor then
    begin
      perform private.notify(rp.tenant_id, 'booking'::public.notification_kind, 'A share of the move-in was paid',
        'Your tenancy file shows every share and what is still to pay.', '/tenancy/' || rp.id::text);
    exception when others then
      null;
    end;
    return jsonb_build_object(
      'outcome', 'share-settled', 'booking_id', bk.id, 'amount_minor', gross,
      'paid_minor', paid_before + gross, 'total_minor', rp.total_minor, 'share_payer_id', tx.share_payer_id,
      'ledger', jsonb_build_object(
        'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
        'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
  end if;
  update public.deal_agreements set status = 'paid', paid_at = now(), updated_at = now() where id = ag.id
  returning * into ag;
  perform private.agreement_log(ag, null, 'paid', 'approved',
    case when is_share then 'Paid in shares. The last share completed the move-in; each share settled to the lister and the Guarantee as it was paid.'
         else 'Paid. The lister''s share and the Guarantee settled with the charge.' end);
  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the booking is confirmed.');
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;
  return jsonb_build_object(
    'outcome', 'settled', 'booking_id', bk.id, 'confirmed', was_pending, 'amount_minor', gross,
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
      'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
end;
$function$;

/* ------------------------------------------------------------ the doors */
create or replace function public.add_rent_contributor(p_rent_payment uuid, p_user uuid, p_share bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
  taken bigint;
  new_id uuid;
begin
  select * into rp from public.rent_payments where id = p_rent_payment for update;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.rent_charge_payable(rp.id) then
    return jsonb_build_object('status', 'not_open');
  end if;
  if private.rent_split_locked(rp.id) then
    return jsonb_build_object('status', 'locked');
  end if;
  if p_user is null or p_user = rp.tenant_id or p_user = rp.lister_id then
    return jsonb_build_object('status', 'bad_person');
  end if;
  if p_share is null or p_share <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if exists (select 1 from public.rent_share_declines d where d.rent_payment_id = rp.id and d.user_id = p_user) then
    return jsonb_build_object('status', 'declined_before');
  end if;
  if not private.consume_rate_limit('rent_share_invite', rp.tenant_id::text, 10, 86400) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  select coalesce(sum(c.share_minor), 0) into taken
    from public.rent_payment_contributors c
   where c.rent_payment_id = rp.id
     and not exists (select 1 from public.rent_share_answers a where a.contributor_id = c.id and a.answer = 'declined');
  if taken + p_share >= rp.total_minor then
    return jsonb_build_object('status', 'exceeds_total');
  end if;
  begin
    insert into public.rent_payment_contributors (rent_payment_id, user_id, share_minor, added_by)
    values (rp.id, p_user, p_share, rp.tenant_id)
    returning id into new_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'already_added');
  end;
  insert into public.rent_share_notices (rent_payment_id, user_id) values (rp.id, p_user) on conflict do nothing;
  if found then
    begin
      perform private.notify(p_user, 'booking'::public.notification_kind, 'You were invited to share a move-in',
        'Open it to see the share and accept or decline. If you accept, you pay your share by card straight to the landlord or agent.',
        '/rent/share/' || new_id);
    exception when others then
      null;
    end;
  end if;
  return jsonb_build_object('status', 'ok', 'contributor_id', new_id);
end;
$function$;

create or replace function public.answer_rent_share(p_contributor uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c    public.rent_payment_contributors%rowtype;
  lead uuid;
begin
  select * into c from public.rent_payment_contributors where id = p_contributor;
  if c.id is null or c.user_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_answer not in ('accepted', 'declined') then
    return jsonb_build_object('status', 'bad_answer');
  end if;
  perform 1 from public.rent_payments where id = c.rent_payment_id for update;
  -- A decline moves the lead's remainder, so it is refused once anybody paid.
  if p_answer = 'declined' and private.rent_split_locked(c.rent_payment_id) then
    return jsonb_build_object('status', 'locked');
  end if;
  insert into public.rent_share_answers (contributor_id, answer) values (c.id, p_answer)
  on conflict (contributor_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_answered');
  end if;
  if p_answer = 'declined' then
    insert into public.rent_share_declines (rent_payment_id, user_id) values (c.rent_payment_id, c.user_id)
    on conflict do nothing;
  end if;
  select rp.tenant_id into lead from public.rent_payments rp where rp.id = c.rent_payment_id;
  begin
    perform private.notify(lead, 'booking'::public.notification_kind,
      case when p_answer = 'accepted' then 'A flatmate accepted their share' else 'A flatmate declined their share' end,
      'Your tenancy file shows every share.', '/tenancy/' || c.rent_payment_id);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok');
end;
$function$;

create or replace function public.remove_rent_contributor(p_contributor uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.rent_payment_contributors%rowtype;
begin
  select c2.* into c from public.rent_payment_contributors c2
    join public.rent_payments rp on rp.id = c2.rent_payment_id
   where c2.id = p_contributor and rp.tenant_id = (select auth.uid());
  if c.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  perform 1 from public.rent_payments where id = c.rent_payment_id for update;
  if private.rent_split_locked(c.rent_payment_id) then
    return jsonb_build_object('status', 'locked');
  end if;
  delete from public.rent_share_answers where contributor_id = c.id;
  delete from public.rent_payment_contributors where id = c.id;
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* What a co-tenant sees of their share: area-level, never the address. */
create or replace function public.my_rent_share(p_contributor uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select jsonb_build_object(
           'contributor_id', c.id,
           'rent_payment_id', rp.id,
           'share_minor', c.share_minor,
           'total_minor', rp.total_minor,
           'move_in', rp.move_in,
           'area', l.area,
           'city', l.city,
           'lead', nullif(btrim(coalesce(p.first_name, '')), ''),
           'answer', (select a.answer from public.rent_share_answers a where a.contributor_id = c.id),
           'paid_minor', (select t.amount_minor from public.transactions t
                           where t.booking_id = rp.booking_id and t.share_payer_id = c.user_id
                             and t.status in ('SUCCESSFUL', 'REFUNDED') order by t.created_at limit 1),
           'paid_at', (select t.updated_at from public.transactions t
                        where t.booking_id = rp.booking_id and t.share_payer_id = c.user_id
                          and t.status in ('SUCCESSFUL', 'REFUNDED') order by t.created_at limit 1),
           'refund', (select jsonb_build_object('status', r.processor_status, 'amount_minor', r.amount_minor,
                                                'recorded_at', r.created_at, 'submitted_at', r.processor_submitted_at,
                                                'processed_at', r.processor_settled_at)
                        from public.rent_share_refunds r where r.rent_payment_id = rp.id and r.payer_id = c.user_id
                       order by r.created_at desc limit 1),
           'group_paid_minor', private.rent_charge_paid_minor(rp.id),
           'complete', private.tenancy_paid(rp.id),
           'payable', private.rent_charge_payable(rp.id),
           'locked', private.rent_split_locked(rp.id),
           'void', private.tenancy_void(rp.id))
    from public.rent_payment_contributors c
    join public.rent_payments rp on rp.id = c.rent_payment_id
    join public.listings l on l.id = rp.listing_id
    left join public.profiles p on p.id = rp.tenant_id
   where c.id = p_contributor
     and c.user_id = (select auth.uid());
$function$;

/* ------------------------------------------------------------ the group cancels */
create or replace function private.rent_split_cancel(p_rent_payment uuid, p_actor uuid, p_reason text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  rp      public.rent_payments%rowtype;
  bk      public.bookings%rowtype;
  ag      public.deal_agreements%rowtype;
  t       record;
  refunds jsonb := '[]'::jsonb;
  total   bigint := 0;
  rid     uuid;
  before_status public.agreement_status;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into bk from public.bookings where id = rp.booking_id for update;
  if private.tenancy_paid(rp.id) then
    return jsonb_build_object('status', 'complete');
  end if;
  if bk.status <> 'PENDING' then
    return jsonb_build_object('status', 'not_open', 'booking_status', bk.status);
  end if;
  if private.booking_payment_in_flight(bk.id) then
    return jsonb_build_object('status', 'payment_in_flight');
  end if;
  update public.bookings set status = 'CANCELLED' where id = bk.id and status = 'PENDING';
  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, 'PENDING', 'CANCELLED', p_actor,
          case when p_reason = 'group_cancelled' then 'The flatmates cancelled the move-in before it was fully paid.'
               else 'The move-in was not fully paid by the move-in day, so it was cancelled.' end);
  select * into ag from public.deal_agreements where booking_id = bk.id for update;
  if ag.id is not null and ag.status not in ('paid', 'cancelled') then
    before_status := ag.status;
    update public.deal_agreements set status = 'cancelled', updated_at = now() where id = ag.id returning * into ag;
    perform private.agreement_log(ag, p_actor, 'cancelled', before_status, nullif(btrim(coalesce(p_note, '')), ''));
  end if;
  for t in
    select tr.id, tr.provider_ref, tr.amount_minor, tr.share_payer_id
      from public.transactions tr
     where tr.booking_id = bk.id and tr.status = 'SUCCESSFUL' and tr.share_payer_id is not null
  loop
    insert into public.rent_share_refunds (transaction_id, rent_payment_id, payer_id, amount_minor, reason)
    values (t.id, rp.id, t.share_payer_id, t.amount_minor, p_reason)
    on conflict (transaction_id) do nothing
    returning id into rid;
    if rid is not null then
      insert into public.ledger_entries
        (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
         guarantee_reserve_minor, net_settlement_minor)
      values (bk.id, null, -t.amount_minor, 0, -t.amount_minor, 0, 0, -t.amount_minor);
      total := total + t.amount_minor;
      refunds := refunds || jsonb_build_object('refund_id', rid, 'reference', t.provider_ref,
                                               'amount_minor', t.amount_minor, 'payer_id', t.share_payer_id);
      begin
        perform private.notify(t.share_payer_id, 'booking'::public.notification_kind, 'Your move-in share is being refunded',
          'The move-in was cancelled before it was fully paid, so your share is going back to the card or account you paid with. Banks usually show it within 5 to 10 working days.',
          '/tenancy/' || rp.id::text);
      exception when others then
        null;
      end;
    end if;
  end loop;
  -- What the lister received from those shares is owed back, as for every
  -- card refund on a split charge.
  if total > 0 then
    insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
    values (bk.id, rp.lister_id, total)
    on conflict (booking_id) do update
      set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, 'rent_split.cancelled', 'rent_payment', rp.id::text,
          jsonb_build_object('reason', p_reason, 'refunded_minor', total, 'refunds', jsonb_array_length(refunds)));
  begin
    perform private.notify(rp.lister_id, 'booking'::public.notification_kind, 'A shared move-in was cancelled',
      'The flatmates did not complete the move-in. Any share already paid is being refunded to their cards.', '/tenancy/' || rp.id::text);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok', 'refunds', refunds, 'refunded_minor', total);
end;
$function$;
revoke all on function private.rent_split_cancel(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.rent_split_cancel_as(p_actor uuid, p_rent_payment uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  rp public.rent_payments%rowtype;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or p_actor is null or rp.tenant_id <> p_actor then
    return jsonb_build_object('status', 'not_found');
  end if;
  return private.rent_split_cancel(rp.id, p_actor, 'group_cancelled', p_note);
end;
$function$;
revoke all on function public.rent_split_cancel_as(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.rent_split_cancel_as(uuid, uuid, text) to service_role;

/* The share refunds the app must still submit to Paystack (and retries). */
create or replace function public.rent_share_refunds_due(p_limit integer default 25)
returns table (refund_id uuid, reference text, amount_minor bigint, processor_status text)
language sql
stable
security definer
set search_path to ''
as $function$
  select r.id, t.provider_ref, r.amount_minor, r.processor_status
    from public.rent_share_refunds r join public.transactions t on t.id = r.transaction_id
   where r.processor_status in ('pending', 'failed')
   order by r.created_at
   limit greatest(1, least(coalesce(p_limit, 25), 100));
$function$;
revoke all on function public.rent_share_refunds_due(integer) from public, anon, authenticated;
grant execute on function public.rent_share_refunds_due(integer) to service_role;

create or replace function public.record_rent_share_refund(p_refund uuid, p_status text, p_processor_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_status not in ('submitted', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  update public.rent_share_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(nullif(btrim(p_processor_id), ''), processor_refund_id),
         processor_submitted_at = case when p_status = 'submitted' then now() else processor_submitted_at end
   where id = p_refund and processor_status in ('pending', 'failed');
  return jsonb_build_object('status', case when found then 'ok' else 'not_found' end);
end;
$function$;
revoke all on function public.record_rent_share_refund(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_rent_share_refund(uuid, text, text) to service_role;

/* Paystack's refund webhook, now for share refunds as well as booking refunds. */
create or replace function public.record_processor_refund_outcome(
  p_processor_refund_id text, p_transaction_reference text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r  public.booking_refunds%rowtype;
  s  public.rent_share_refunds%rowtype;
  pid text := nullif(btrim(p_processor_refund_id), '');
  ref text := nullif(btrim(p_transaction_reference), '');
begin
  if p_status not in ('processed', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  select * into s from public.rent_share_refunds where pid is not null and processor_refund_id = pid for update;
  if s.id is null and ref is not null then
    select sr.* into s from public.rent_share_refunds sr join public.transactions t on t.id = sr.transaction_id
     where t.provider_ref = ref for update of sr;
  end if;
  if s.id is not null then
    if s.processor_status = p_status then
      return jsonb_build_object('status', 'already', 'share_refund_id', s.id);
    end if;
    if s.processor_status <> 'submitted' then
      return jsonb_build_object('status', 'not_submitted', 'share_refund_id', s.id, 'processor_status', s.processor_status);
    end if;
    update public.rent_share_refunds
       set processor_status = p_status,
           processor_refund_id = coalesce(processor_refund_id, pid),
           processor_settled_at = case when p_status = 'processed' then now() else processor_settled_at end
     where id = s.id;
    if p_status = 'failed' then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'Paystack could not complete a move-in share refund',
              format('Share refund %s (%s kobo) failed at the processor. Contact the flatmate and retry.', s.id, s.amount_minor),
              'rent_share_refund', s.id::text);
    end if;
    return jsonb_build_object('status', 'ok', 'share_refund_id', s.id);
  end if;
  select * into r from public.booking_refunds where pid is not null and processor_refund_id = pid
   order by created_at desc limit 1 for update;
  if r.id is null and ref is not null then
    select br.* into r from public.booking_refunds br
      join public.transactions t on t.booking_id = br.booking_id and t.provider_ref = ref
     where br.processor_status = 'submitted'
     order by br.processor_submitted_at desc limit 1 for update of br;
  end if;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.processor_status = p_status then
    return jsonb_build_object('status', 'already', 'refund_id', r.id);
  end if;
  if r.processor_status <> 'submitted' then
    return jsonb_build_object('status', 'not_submitted', 'refund_id', r.id, 'processor_status', r.processor_status);
  end if;
  update public.booking_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(processor_refund_id, pid),
         processor_settled_at = case when p_status = 'processed' then now() else processor_settled_at end
   where id = r.id;
  if p_status = 'failed' then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Paystack could not complete a refund to the card',
            format('Refund %s on booking %s (%s kobo) failed at the processor. Contact the guest and retry.',
                   r.id, r.booking_id, r.refund_minor),
            'booking_refund', r.id::text);
  end if;
  return jsonb_build_object('status', 'ok', 'refund_id', r.id, 'booking_id', r.booking_id);
end;
$function$;
revoke all on function public.record_processor_refund_outcome(text, text, text) from public, anon, authenticated;
grant execute on function public.record_processor_refund_outcome(text, text, text) to service_role;

/* ------------------------------------------------------------ the V-24 clock, with share refunds */
create or replace function public.admin_refund_clock()
returns table (kind text, subject_id uuid, booking_id uuid, amount_minor bigint, due_by timestamptz)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select * from (
    select 'request'::text, q.id, q.booking_id,
           coalesce((select sum(t.amount_minor) from public.transactions t
                      where t.booking_id = q.booking_id and t.status = 'SUCCESSFUL'), 0)::bigint,
           coalesce(q.due_by, private.business_days_after(q.requested_at, private.refund_ask_days()))
      from public.refund_requests q
     where private.refund_request_initiated_at(q.id) is null
       and not exists (select 1 from public.refund_request_decisions d where d.request_id = q.id)
    union all
    select 'unsent'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.created_at, private.refund_send_days())
      from public.booking_refunds r
     where r.processor_status in ('pending', 'failed') and r.refund_minor > 0
    union all
    select 'processor'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.processor_submitted_at, private.refund_processor_days())
      from public.booking_refunds r
     where r.processor_status = 'submitted'
    union all
    select 'share_unsent'::text, s.id, rp.booking_id, s.amount_minor,
           private.business_days_after(s.created_at, private.refund_send_days())
      from public.rent_share_refunds s join public.rent_payments rp on rp.id = s.rent_payment_id
     where s.processor_status in ('pending', 'failed')
    union all
    select 'share_processor'::text, s.id, rp.booking_id, s.amount_minor,
           private.business_days_after(s.processor_submitted_at, private.refund_processor_days())
      from public.rent_share_refunds s join public.rent_payments rp on rp.id = s.rent_payment_id
     where s.processor_status = 'submitted'
    union all
    select 'rent_owed'::text, o.booking_id, o.booking_id, o.amount_minor,
           private.business_days_after(o.created_at, private.refund_ask_days())
      from public.rent_refunds_owed o
     where o.cleared_at is null
  ) clock (kind, subject_id, booking_id, amount_minor, due_by)
  where (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role))
    and clock.due_by < now() + interval '24 hours'
  order by clock.due_by asc
  limit 500;
$function$;
revoke all on function public.admin_refund_clock() from public, anon;
grant execute on function public.admin_refund_clock() to authenticated;

/* Daily: a split still incomplete when its move-in day arrives is cancelled
   and its paid shares refunded; share refunds that stall are alerted. */
create or replace function private.sweep_rent_splits()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  n     int := 0;
  m     int;
  r     record;
begin
  for r in
    select rp.id from public.rent_payments rp join public.bookings b on b.id = rp.booking_id
     where b.status = 'PENDING' and rp.move_in <= today
       and exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL' and t.share_payer_id is not null)
       and not private.tenancy_paid(rp.id)
     limit 200
  loop
    begin
      if (private.rent_split_cancel(r.id, null, 'stalled_before_move_in', null)) ->> 'status' = 'ok' then
        n := n + 1;
      end if;
    exception when others then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A stalled shared move-in could not be cancelled',
              format('Rent charge %s: %s', r.id, sqlerrm), 'rent_payment', r.id::text);
    end;
  end loop;
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A move-in share refund was not sent to Paystack',
         format('Share refund %s (%s kobo) has been %s since %s.', s.id, s.amount_minor, s.processor_status,
                to_char(s.created_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'rent_share_refund_unsent', s.id::text
    from public.rent_share_refunds s
   where s.processor_status in ('pending', 'failed')
     and private.business_days_after(s.created_at, private.refund_send_days()) < now()
     and not exists (select 1 from public.risk_alerts a where a.entity_type = 'rent_share_refund_unsent' and a.entity_id = s.id::text);
  get diagnostics m = row_count; n := n + m;
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A move-in share refund initiated at Paystack has not completed',
         format('Share refund %s (%s kobo) was accepted by Paystack on %s and has not completed.', s.id, s.amount_minor,
                to_char(s.processor_submitted_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'rent_share_refund_slow', s.id::text
    from public.rent_share_refunds s
   where s.processor_status = 'submitted'
     and private.business_days_after(s.processor_submitted_at, private.refund_processor_days()) < now()
     and not exists (select 1 from public.risk_alerts a where a.entity_type = 'rent_share_refund_slow' and a.entity_id = s.id::text);
  get diagnostics m = row_count; n := n + m;
  return n;
end;
$function$;
revoke all on function private.sweep_rent_splits() from public, anon, authenticated;

select cron.unschedule('vallo_sweep_rent_splits')
 where exists (select 1 from cron.job where jobname = 'vallo_sweep_rent_splits');
select cron.schedule('vallo_sweep_rent_splits', '25 7 * * *', 'select private.sweep_rent_splits();');

revoke all on function public.add_rent_contributor(uuid, uuid, bigint) from public, anon;
revoke all on function public.answer_rent_share(uuid, text) from public, anon;
revoke all on function public.remove_rent_contributor(uuid) from public, anon;
revoke all on function public.my_rent_share(uuid) from public, anon;
grant execute on function public.add_rent_contributor(uuid, uuid, bigint) to authenticated;
grant execute on function public.answer_rent_share(uuid, text) to authenticated;
grant execute on function public.remove_rent_contributor(uuid) to authenticated;
grant execute on function public.my_rent_share(uuid) to authenticated;

/* ------------------------------------------------------------------ read back */
do $$
declare t text; def text;
begin
  foreach t in array array['rent_payment_contributors','rent_share_answers','rent_share_declines','rent_share_notices','rent_share_refunds'] loop
    if not exists (select 1 from pg_class where oid = ('public.' || t)::regclass and relrowsecurity) then
      raise exception '% has no RLS', t;
    end if;
    if has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('authenticated', 'public.' || t, 'INSERT, UPDATE, DELETE, TRUNCATE') then
      raise exception '% is open to the wrong role', t;
    end if;
  end loop;
  if exists (select 1 from pg_indexes where indexname = 'transactions_one_success_per_booking')
     or not exists (select 1 from pg_indexes where indexname = 'transactions_one_whole_success_per_booking')
     or not exists (select 1 from pg_indexes where indexname = 'transactions_one_share_success_per_payer') then
    raise exception 'the one-success backstop was not split in two';
  end if;
  def := pg_get_functiondef('private.settle_booking_charge(text,bigint,bigint,uuid)'::regprocedure);
  if position('share-settled' in def) = 0 or position('refund-due' in def) = 0 or position('guarantee_reserve_entries' in def) = 0 then
    raise exception 'settlement lost a branch';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname in ('pay_rent_share', 'return_rent_share')) then
    raise exception 'a wallet-to-wallet share door exists';
  end if;
  if has_function_privilege('authenticated', 'public.payment_split_for_rent_share(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.rent_split_cancel_as(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_rent_share_refund(uuid,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.rent_share_refunds_due(integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.rent_split_cancel_as(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'a share money door is open to the wrong role';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_sweep_rent_splits') then
    raise exception 'the split sweep is not scheduled';
  end if;
end $$;
