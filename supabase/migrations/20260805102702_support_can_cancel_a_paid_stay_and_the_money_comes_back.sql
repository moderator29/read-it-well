-- The cancellation policy published on /cancellations promises that a person at
-- support can cancel a stay somebody has already paid for, that the refund
-- lands in the guest's RentMe wallet, and that they get the amount in writing.
-- Until now no such path existed: bookings carried an admin write policy and no
-- screen, and the guest-facing cancel() refused a paid stay outright because
-- letting it through would have released the dates and quietly kept the money.
--
-- This migration is the money half of closing that gap. Three things:
--
--  1. The settlement ledger learns to reverse by APPENDING a contra row rather
--     than by editing the row it corrects. That is what an append-only ledger
--     is for, and it is why the four non-negative column checks are replaced by
--     one sign check that allows a row to be entirely a charge or entirely a
--     reversal, never a mixture. ledger_balances_chk is untouched and still
--     holds for negatives: -r = 0 + (-r) + 0.
--
--  2. public.booking_refunds records the decision itself: what was paid, what
--     went back, what the host kept, why, who decided, and the wallet reference
--     the money moved on. Append-only, admin-readable, never client-writable.
--
--  3. private.refund_and_cancel_booking does all of it in ONE transaction: the
--     wallet credit, the contra ledger row, the booking transition, the state
--     event, the calendar release and the refund record. All of it or none.
--
-- Money never moves as a balance edit anywhere in here. Balances stay derived.

/* ------------------------------------------------- 1. the ledger can reverse */

alter table public.ledger_entries
  drop constraint if exists ledger_entries_gross_minor_check,
  drop constraint if exists ledger_entries_platform_fee_minor_check,
  drop constraint if exists ledger_entries_agent_share_minor_check,
  drop constraint if exists ledger_entries_processor_fee_minor_check,
  drop constraint if exists ledger_entries_net_settlement_minor_check;

alter table public.ledger_entries
  add constraint ledger_entries_sign_chk check (
    (
      gross_minor          >= 0 and
      platform_fee_minor   >= 0 and
      agent_share_minor    >= 0 and
      processor_fee_minor  >= 0 and
      net_settlement_minor >= 0
    ) or (
      gross_minor          <= 0 and
      platform_fee_minor   <= 0 and
      agent_share_minor    <= 0 and
      processor_fee_minor  <= 0 and
      net_settlement_minor <= 0
    )
  );

comment on constraint ledger_entries_sign_chk on public.ledger_entries is
  'A row is either a charge (every part at or above zero) or a reversal of one (every part at or below zero). Never a mixture, so a sum over any window is always the truth about that window.';

/* ---------------------------------------------- 2. the record of a decision */

create table if not exists public.booking_refunds (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  guest_id         uuid not null,
  -- Integer kobo, all three. retained is what the host keeps and is always
  -- paid minus refund, enforced rather than trusted.
  paid_minor       bigint not null check (paid_minor >= 0),
  refund_minor     bigint not null check (refund_minor >= 0),
  retained_minor   bigint not null check (retained_minor >= 0),
  -- Why the schedule was applied, or why it was not. The four values are the
  -- four cases /cancellations actually names.
  reason           text   not null check (reason in (
                       'guest_choice', 'host_cancelled', 'not_as_listed', 'no_access'
                     )),
  note             text check (note is null or length(note) <= 2000),
  -- The wallet ledger row the money moved on, null when nothing was owed.
  wallet_reference text unique,
  wallet_entry_id  uuid references public.wallet_entries(id) on delete set null,
  decided_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint booking_refunds_split_chk check (retained_minor = paid_minor - refund_minor),
  constraint booking_refunds_reference_chk check (
    (refund_minor = 0 and wallet_reference is null) or
    (refund_minor > 0 and wallet_reference is not null)
  )
);

comment on table public.booking_refunds is
  'One row per cancellation of a stay by RentMe support: what was paid, what went back to the guest wallet, what the host kept, why, and who decided. Append-only. The money itself lives in wallet_entries and ledger_entries; this is the decision behind it.';

create index if not exists booking_refunds_booking_idx on public.booking_refunds (booking_id);
create index if not exists booking_refunds_guest_idx   on public.booking_refunds (guest_id, created_at desc);
create index if not exists booking_refunds_decided_idx on public.booking_refunds (decided_by);
create index if not exists booking_refunds_entry_idx   on public.booking_refunds (wallet_entry_id);

alter table public.booking_refunds enable row level security;

-- Staff read it. The guest reads their own, because the amount and the reason
-- are their business before they are ours. Nobody, staff included, holds an
-- insert, update or delete grant: the service role writes it inside the
-- function below and nowhere else.
drop policy if exists booking_refunds_select_admin on public.booking_refunds;
create policy booking_refunds_select_admin on public.booking_refunds
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

drop policy if exists booking_refunds_select_own on public.booking_refunds;
create policy booking_refunds_select_own on public.booking_refunds
  for select using ((select auth.uid()) = guest_id);

create or replace function private.booking_refunds_is_append_only()
returns trigger
language plpgsql
as $fn$
begin
  raise exception
    using
      errcode = '42501',
      message = 'public.booking_refunds is append-only',
      detail  = format('%s on public.booking_refunds was refused for role %I.', tg_op, current_user),
      hint    = 'A correction is a new refund row, not an edit of the old one. Money decisions are not editable by design.';
end;
$fn$;

drop trigger if exists booking_refunds_no_update on public.booking_refunds;
create trigger booking_refunds_no_update
  before update on public.booking_refunds
  for each statement execute function private.booking_refunds_is_append_only();

drop trigger if exists booking_refunds_no_delete on public.booking_refunds;
create trigger booking_refunds_no_delete
  before delete on public.booking_refunds
  for each statement execute function private.booking_refunds_is_append_only();

drop trigger if exists booking_refunds_no_truncate on public.booking_refunds;
create trigger booking_refunds_no_truncate
  before truncate on public.booking_refunds
  for each statement execute function private.booking_refunds_is_append_only();

/* ------------------------------------------- 3. one transaction, all of it */

create or replace function private.refund_and_cancel_booking(
  acting_admin     uuid,
  target_booking   uuid,
  refund_amount    bigint,
  refund_reference text,
  reason_code      text,
  decision_note    text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  booking_row     public.bookings;
  guest_wallet    uuid;
  paid_total      bigint;
  retained_amount bigint;
  entry_id        uuid;
  refund_id       uuid;
  before_status   public.booking_status;
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

  if refund_amount > paid_total then
    return jsonb_build_object(
      'status', 'over_refund',
      'paid_minor', paid_total,
      'refund_minor', refund_amount
    );
  end if;

  retained_amount := paid_total - refund_amount;

  if refund_amount > 0 then
    insert into public.wallets (user_id) values (booking_row.guest_id)
      on conflict (user_id) do nothing;

    select w.id into guest_wallet from public.wallets w
     where w.user_id = booking_row.guest_id
     for update;

    if guest_wallet is null then
      return jsonb_build_object('status', 'no_wallet');
    end if;

    begin
      insert into public.wallet_entries
        (wallet_id, kind, direction, amount_minor, reference, status, metadata)
      values
        (guest_wallet, 'refund', 'credit', refund_amount, refund_reference, 'COMPLETED',
         jsonb_build_object(
           'note', 'Refund for a cancelled RentMe stay',
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
    coalesce(nullif(btrim(decision_note), ''), 'Cancelled by RentMe support.')
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
$fn$;

comment on function private.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) is
  'Cancel a stay and return what is owed to the guest wallet, in one transaction. Idempotent on the wallet reference. The refund figure is computed by the platform from the published schedule and re-bounded here against what was actually settled.';

create or replace function public.refund_and_cancel_booking(
  acting_admin     uuid,
  target_booking   uuid,
  refund_amount    bigint,
  refund_reference text,
  reason_code      text,
  decision_note    text default null
) returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select private.refund_and_cancel_booking(
    acting_admin, target_booking, refund_amount, refund_reference, reason_code, decision_note
  );
$fn$;

revoke all on function public.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) from public;
revoke all on function public.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) from anon;
revoke all on function public.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) from authenticated;
grant execute on function public.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) to service_role;
