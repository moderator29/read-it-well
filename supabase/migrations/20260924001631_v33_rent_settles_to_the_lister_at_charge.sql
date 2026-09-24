-- V-33: RENT NEVER RESTS AT VALLO.
--
-- Until now a paid rent charge debited the tenant's whole move-in total (from
-- the wallet, or by card into the processor balance) and credited nobody. The
-- money was held for no named person, which is a hold of `first_rent` and
-- `rent_deposit`: the two purposes docs/adr/0001 refuses. The ADR's only open
-- purpose is `agency_fee`, and the rent path had quietly become a larger,
-- unrecorded version of the custody it declines.
--
-- From here, the settled charge is the lister's the instant it is recorded:
-- every positive ledger row for a rent charge writes, in the same transaction,
-- a COMPLETED `payment_in` credit of exactly `agent_share_minor` (the gross
-- less the processor's cut; the platform take is zero) to the lister named on
-- the frozen `rent_payments` row. A refund row (negative) takes it back out
-- as `payment_in_return`; a refund is never paid out of money nobody holds.
--
-- Invariant, per ledger row: gross = platform_fee + agent_share + processor_fee
-- (ledger_balances_chk), and the lister's credit is agent_share. So the
-- tenant's debit equals the lister's credit plus the processor fee plus the
-- platform fee, to the kobo.
--
-- Stays (bookings without a rent_payments row) are untouched: their payout
-- depends on check-in and the cancellation schedule, and is not this change.
--
-- WHO CARRIES THE PROCESSOR'S FEE. On the charge, the lister: they are
-- credited the gross less what Paystack kept. On a refund, the platform: the
-- tenant gets back what they paid, the lister gives back at most what that
-- charge credited them (never the fee they never received), and the
-- difference, which Paystack does not return, is Vallo's cost.
--
-- WHEN THE LISTER HAS ALREADY MOVED THE MONEY. A refund of settled rent is
-- taken back from the lister. If they no longer hold it, the refund is not
-- paid from nothing: the refund door answers `lister_short`, records the sum as
-- owed by the lister (public.rent_refunds_owed), raises a high alert, and from
-- that moment the owed sum is subtracted from what the lister can spend
-- (private.wallet_spendable_locked), so nothing more leaves their wallet until
-- the refund can be made. Support retries the refund once the lister's
-- balance covers it; the retry clears the debt. Whether Vallo should instead
-- refund the tenant at once and carry the debt itself is the founder's call.
--
-- ONE CREDIT PER CHARGE. Only the booking's first positive ledger row credits
-- the lister. A second payment on the same booking is returned to the payer by
-- private.settle_booking_charge (MON-05) and writes no ledger row; if one ever
-- did, it would credit nobody.

alter table public.wallet_entries drop constraint wallet_entries_direction_chk;
alter table public.wallet_entries add constraint wallet_entries_direction_chk check (
  (kind = any (array['deposit','refund','transfer_in','escrow_release','escrow_refund','pot_release','payment_in']::public.wallet_entry_kind[])
    and direction = 'credit'::public.wallet_entry_direction)
  or
  (kind = any (array['withdrawal','payment','transfer_out','escrow_hold','pot_hold','payment_in_return']::public.wallet_entry_kind[])
    and direction = 'debit'::public.wallet_entry_direction)
);

create table public.rent_refunds_owed (
  booking_id   uuid primary key references public.bookings (id) on delete restrict,
  lister_id    uuid not null references auth.users (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cleared_at   timestamptz
);
alter table public.rent_refunds_owed enable row level security;
revoke all on public.rent_refunds_owed from anon, authenticated;
grant select on public.rent_refunds_owed to authenticated;
create policy rent_refunds_owed_select_own on public.rent_refunds_owed
  for select to authenticated
  using (lister_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
create index rent_refunds_owed_open_idx on public.rent_refunds_owed (lister_id) where cleared_at is null;

-- What a wallet can spend: settled balance, less debits in flight, less any
-- rent refund its owner owes (V-33). Still the only place spendable is
-- computed (MON-07).
CREATE OR REPLACE FUNCTION private.wallet_spendable_locked(p_wallet uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce((
      select sum(case when direction = 'credit' then amount_minor else -amount_minor end)
      from public.wallet_entries
      where wallet_id = p_wallet and status = 'COMPLETED'
    ), 0)
    - coalesce((
      select sum(amount_minor)
      from public.wallet_entries
      where wallet_id = p_wallet and status = 'PENDING' and direction = 'debit'
    ), 0)
    - coalesce((
      select sum(o.amount_minor)
      from public.rent_refunds_owed o
      join public.wallets w on w.user_id = o.lister_id
      where w.id = p_wallet and o.cleared_at is null
    ), 0);
$function$;

-- How much of a rent charge the lister still holds as credited: every
-- payment_in for the booking less every payment_in_return.
create or replace function private.lister_rent_credit_left(p_booking uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(case when e.kind = 'payment_in' then e.amount_minor else -e.amount_minor end), 0)::bigint
    from public.wallet_entries e
   where e.kind in ('payment_in', 'payment_in_return')
     and e.status = 'COMPLETED'
     and (e.metadata ->> 'booking_id') = p_booking::text;
$$;
revoke all on function private.lister_rent_credit_left(uuid) from public, anon, authenticated;

-- The refund doors ask this first. Null: the refund may proceed. Otherwise the
-- lister cannot cover their part: the debt is recorded (one row per booking,
-- refreshed on every attempt), a high alert is raised, and the answer is
-- returned for the door to hand back.
create or replace function private.rent_refund_shortfall(p_booking uuid, p_refund bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rp        public.rent_payments%rowtype;
  lw        uuid;
  needed    bigint;
  owed_here bigint;
  capacity  bigint;
begin
  select * into rp from public.rent_payments where booking_id = p_booking;
  if rp.id is null or coalesce(p_refund, 0) <= 0 then
    return null;
  end if;
  needed := least(p_refund, private.lister_rent_credit_left(p_booking));
  if needed <= 0 then
    return null;
  end if;
  insert into public.wallets (user_id) values (rp.lister_id) on conflict (user_id) do nothing;
  select w.id into lw from public.wallets w where w.user_id = rp.lister_id for update;
  select o.amount_minor into owed_here from public.rent_refunds_owed o
   where o.booking_id = p_booking and o.cleared_at is null;
  capacity := private.wallet_spendable_locked(lw) + coalesce(owed_here, 0);
  if capacity >= needed then
    return null;
  end if;
  insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
  values (p_booking, rp.lister_id, needed)
  on conflict (booking_id) do update
    set amount_minor = excluded.amount_minor, cleared_at = null, updated_at = now();
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values ('high', 'open', 'A tenant refund is waiting on the lister',
          format('Booking %s: the refund needs %s kobo back from the lister, who can cover %s. '
                 || 'The sum is recorded as owed and held against the lister''s wallet; retry the refund once it is covered.',
                 p_booking, needed, capacity),
          'booking', p_booking::text);
  return jsonb_build_object('status', 'lister_short', 'lister_spendable_minor', capacity,
                            'refund_minor', p_refund, 'owed_minor', needed);
end;
$$;
revoke all on function private.rent_refund_shortfall(uuid, bigint) from public, anon, authenticated;

create or replace function private.settle_rent_charge_to_lister()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rp            public.rent_payments%rowtype;
  lister_wallet uuid;
  amount        bigint;
  capacity      bigint;
  owed_here     bigint;
begin
  select * into rp from public.rent_payments where booking_id = new.booking_id;
  if rp.id is null then
    return new;  -- a stay, not a rent charge
  end if;

  if new.gross_minor > 0 then
    -- One credit per charge: only the booking's first positive ledger row.
    if exists (select 1 from public.ledger_entries l
                where l.booking_id = new.booking_id and l.gross_minor > 0 and l.id <> new.id) then
      return new;
    end if;
    amount := new.agent_share_minor;
    if amount <= 0 then
      return new;  -- the processor kept all of it; there is nothing to credit
    end if;
    insert into public.wallets (user_id) values (rp.lister_id) on conflict (user_id) do nothing;
    select w.id into lister_wallet from public.wallets w where w.user_id = rp.lister_id for update;
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (lister_wallet, 'payment_in', 'credit', amount,
       'rent-in:' || new.id::text, 'COMPLETED',
       jsonb_build_object(
         'note', 'Move-in payment from your tenant',
         'booking_id', new.booking_id,
         'rent_payment_id', rp.id,
         'listing_id', rp.listing_id,
         'tenant_id', rp.tenant_id,
         'ledger_entry_id', new.id,
         'transaction_id', new.transaction_id,
         'gross_minor', new.gross_minor,
         'processor_fee_minor', new.processor_fee_minor,
         'platform_fee_minor', new.platform_fee_minor
       ));
  elsif new.gross_minor < 0 then
    -- The lister gives back at most what the charge credited them; the
    -- processor's fee on a refund is the platform's cost.
    amount := least(-new.agent_share_minor, private.lister_rent_credit_left(new.booking_id));
    if amount <= 0 then
      return new;
    end if;
    insert into public.wallets (user_id) values (rp.lister_id) on conflict (user_id) do nothing;
    select w.id into lister_wallet from public.wallets w where w.user_id = rp.lister_id for update;
    select o.amount_minor into owed_here from public.rent_refunds_owed o
     where o.booking_id = new.booking_id and o.cleared_at is null;
    capacity := private.wallet_spendable_locked(lister_wallet) + coalesce(owed_here, 0);
    if capacity < amount then
      raise exception 'rent_refund_exceeds_lister_balance'
        using errcode = 'P0001',
              detail = format('refund %s kobo, lister can cover %s kobo', amount, capacity),
              hint = 'V-33: a refund of settled rent is taken back from the lister; it cannot be paid from money nobody holds.';
    end if;
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (lister_wallet, 'payment_in_return', 'debit', amount,
       'rent-return:' || new.id::text, 'COMPLETED',
       jsonb_build_object(
         'note', 'Returned to your tenant as a refund',
         'booking_id', new.booking_id,
         'rent_payment_id', rp.id,
         'listing_id', rp.listing_id,
         'tenant_id', rp.tenant_id,
         'ledger_entry_id', new.id
       ));
    update public.rent_refunds_owed
       set cleared_at = now(), updated_at = now()
     where booking_id = new.booking_id and cleared_at is null;
  end if;
  return new;
end;
$$;

revoke all on function private.settle_rent_charge_to_lister() from public, anon, authenticated;

create trigger ledger_entries_settle_rent_to_lister
  after insert on public.ledger_entries
  for each row execute function private.settle_rent_charge_to_lister();

-- The refund door asks private.rent_refund_shortfall before it moves anything.
CREATE OR REPLACE FUNCTION private.refund_and_cancel_booking(acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text, decision_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  booking_row     public.bookings;
  guest_wallet    uuid;
  paid_total      bigint;
  retained_amount bigint;
  entry_id        uuid;
  refund_id       uuid;
  before_status   public.booking_status;
  shortfall       jsonb;
  already_refunded bigint;
begin
  if acting_admin is null or target_booking is null
     or refund_reference is null or length(refund_reference) = 0
     or reason_code is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if reason_code not in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access') then
    return jsonb_build_object('status', 'bad_reason');
  end if;

  if refund_amount is null or refund_amount < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  -- SECURITY DEFINER means this function is the last gate, so it proves the
  -- role here rather than trusting a caller that says it already did.
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- Lock order, the same in every money door: the guest's wallet, then the
  -- booking (then, in the ledger trigger, the lister's wallet).
  select b.guest_id into guest_wallet from public.bookings b where b.id = target_booking;
  if guest_wallet is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  insert into public.wallets (user_id) values (guest_wallet)
    on conflict (user_id) do nothing;
  select w.id into guest_wallet from public.wallets w
   where w.user_id = (select b.guest_id from public.bookings b where b.id = target_booking)
   for update;

  select * into booking_row from public.bookings
   where id = target_booking
   for update;

  if booking_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if booking_row.status = 'CANCELLED' then
    return jsonb_build_object('status', 'already_cancelled');
  end if;
  before_status := booking_row.status;

  -- What the guest actually settled. Nothing else may be refunded, ever.
  select coalesce(sum(t.amount_minor), 0)
    into paid_total
    from public.transactions t
   where t.booking_id = booking_row.id and t.status = 'SUCCESSFUL';

  -- Bounded by what is still refundable: everything paid less every refund
  -- already made for this booking, by either refund door (MON-P2-02).
  select coalesce(sum(r.refund_minor), 0) into already_refunded
    from public.booking_refunds r where r.booking_id = booking_row.id;
  if refund_amount > paid_total - already_refunded then
    return jsonb_build_object(
      'status', 'over_refund',
      'paid_minor', paid_total,
      'refunded_minor', already_refunded,
      'refundable_minor', paid_total - already_refunded,
      'refund_minor', refund_amount
    );
  end if;

  -- V-33. Settled rent is the lister's. A refund of it comes back out of the
  -- lister's wallet (the ledger trigger does that); when they cannot cover it
  -- the debt is recorded and the refund waits, in words.
  if refund_amount > 0 then
    shortfall := private.rent_refund_shortfall(booking_row.id, refund_amount);
    if shortfall is not null then
      return shortfall;
    end if;
  end if;

  retained_amount := paid_total - refund_amount;

  if refund_amount > 0 then
    if guest_wallet is null then
      return jsonb_build_object('status', 'no_wallet');
    end if;

    begin
      insert into public.wallet_entries
        (wallet_id, kind, direction, amount_minor, reference, status, metadata)
      values
        (guest_wallet, 'refund', 'credit', refund_amount, refund_reference, 'COMPLETED',
         jsonb_build_object(
           'note', 'Refund for a cancelled Vallo stay',
           'booking_id', booking_row.id,
           'listing_id', booking_row.listing_id,
           'check_in', booking_row.check_in,
           'check_out', booking_row.check_out,
           'reason', reason_code
         ))
      returning id into entry_id;
    exception when unique_violation then
      -- This exact refund already happened. Nothing moves twice.
      return jsonb_build_object('status', 'duplicate');
    end;

    -- The settlement ledger reverses by appending. The processor's cut is NOT
    -- reversed, because the processor does not give it back: the host's share
    -- carries the whole refund, which is the true position.
    insert into public.ledger_entries
      (booking_id, transaction_id, gross_minor, platform_fee_minor,
       agent_share_minor, processor_fee_minor, net_settlement_minor)
    values
      (booking_row.id, null, -refund_amount, 0, -refund_amount, 0, -refund_amount);
  end if;

  update public.bookings set status = 'CANCELLED'
   where id = booking_row.id and status in ('PENDING', 'CONFIRMED');

  if not found then
    raise exception 'booking % could not be cancelled from %', booking_row.id, before_status;
  end if;

  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (
    booking_row.id, before_status, 'CANCELLED', acting_admin,
    coalesce(nullif(btrim(decision_note), ''), 'Cancelled by Vallo support.')
  );

  -- Give the nights back, but only the ones this platform closed. A night an
  -- agent shut by hand stays shut.
  delete from public.availability a
   where a.listing_id = booking_row.listing_id
     and a.status = 'booked'
     and a.date >= booking_row.check_in
     and a.date <  booking_row.check_out;

  insert into public.booking_refunds
    (booking_id, guest_id, paid_minor, refund_minor, retained_minor,
     reason, note, wallet_reference, wallet_entry_id, decided_by)
  values (
    booking_row.id, booking_row.guest_id, paid_total, refund_amount, retained_amount,
    reason_code, nullif(btrim(decision_note), ''),
    case when refund_amount > 0 then refund_reference else null end,
    entry_id, acting_admin
  )
  returning id into refund_id;

  return jsonb_build_object(
    'status', 'ok',
    'booking_id', booking_row.id,
    'guest_id', booking_row.guest_id,
    'listing_id', booking_row.listing_id,
    'previous_status', before_status,
    'paid_minor', paid_total,
    'refund_minor', refund_amount,
    'retained_minor', retained_amount,
    'reference', case when refund_amount > 0 then refund_reference else null end,
    'refund_id', refund_id
  );
end;
$function$;
