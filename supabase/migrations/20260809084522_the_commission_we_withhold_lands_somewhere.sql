/*
 * Commission stops vanishing.
 *
 * THE HOLE. `private.escrow_settle` computes a commission, subtracts it from
 * what the payee receives, and records the figure on `escrows.commission_minor`.
 * It then credits the payee `amount - commission` and credits the commission to
 * nobody at all. There is no platform wallet, there is no `commission` value in
 * the `wallet_entry_kind` enum, and there is no revenue table. The payer is
 * debited the full amount, the payee is credited less than that, and the
 * difference exists only as an integer on a row.
 *
 * That is a ledger that does not balance. It has not hurt anybody yet, for one
 * reason only: every fee rate is currently zero, so the commission is always
 * zero and zero disappearing is not noticeable. The owner asked for the
 * commission and listing fee system to be BUILT and merely set to zero for now,
 * and this is the half of it that was missing. The rate table, the effective
 * dating and the calculation were all there. The collection was not.
 *
 * WHY A TABLE AND NOT A PLATFORM WALLET. A wallet row for the house looks
 * tempting and is a trap. Wallets are user-facing: they carry RLS written
 * around `auth.uid()`, they are read by the wallet screen, they are the source
 * for withdrawal and transfer, and they have payout accounts hanging off them.
 * A house wallet would inherit every one of those code paths and would need to
 * be excluded from each by hand, forever, including from code nobody has
 * written yet. Platform revenue is not somebody's spendable balance and should
 * not be shaped like one.
 *
 * IDEMPOTENCY. `reference` is unique and derived from the escrow id, so a
 * settle that somehow ran twice cannot book the revenue twice. That is the same
 * defence `wallet_entries` already uses, and it sits behind the same row lock:
 * `escrow_settle` takes `for update` on the escrow and refuses a second settle
 * on state, so this is the third line rather than the first.
 *
 * APPEND ONLY BY CONSTRUCTION. No update or delete policy is granted to
 * anybody, and RLS is enabled with no policies at all, which denies every
 * client role outright. `service_role` bypasses RLS and is how the platform
 * reads it. Revenue you can quietly edit is not a record of revenue.
 *
 * The foreign keys are `on delete restrict` on purpose. If deleting an escrow
 * would erase the record that we took money out of it, the delete is the bug.
 *
 * VERIFIED against this database, not reasoned about. With a five percent rate
 * inserted and an escrow of 100000 kobo released: the payee was credited 95000,
 * platform_revenue booked 5000, the two summed to the gross exactly, a second
 * settle returned already_settled, and the revenue row count stayed at one. The
 * whole probe ran inside a block that rolled back, and the table, the escrows,
 * the wallet entries and the probe rate were all confirmed absent afterwards.
 */

create type public.revenue_source as enum ('escrow_commission', 'listing_fee');

create table public.platform_revenue (
  id uuid primary key default gen_random_uuid(),
  source public.revenue_source not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN',
  escrow_id uuid references public.escrows (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete restrict,
  rate_id uuid references public.fee_rates (id),
  /* Unique, and built from the thing that earned it. See IDEMPOTENCY above. */
  reference text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.platform_revenue is
  'Append only record of fees RentMe actually collected. Not a wallet: see the migration header for why a house wallet was rejected.';

create index platform_revenue_source_idx
  on public.platform_revenue (source, created_at desc);

create index platform_revenue_escrow_idx
  on public.platform_revenue (escrow_id)
  where escrow_id is not null;

alter table public.platform_revenue enable row level security;

revoke all on table public.platform_revenue from public, anon, authenticated;

/*
 * Settlement, now booking the fee it withholds.
 *
 * Identical to the previous definition except for the insert below the wallet
 * credit. Replaced wholesale rather than patched because a money function
 * should be readable in one piece.
 */
create or replace function private.escrow_settle(
  p_escrow uuid,
  p_direction text,
  p_to_state escrow_state,
  p_actor uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  e public.escrows;
  target_user uuid;
  target_wallet uuid;
  fee jsonb;
  commission bigint := 0;
  rate_id uuid;
  net bigint;
  entry_kind public.wallet_entry_kind;
begin
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED') then
    return jsonb_build_object('status', 'already_settled', 'state', e.state);
  end if;

  if p_direction = 'release' then
    target_user := e.payee_id;
    entry_kind := 'escrow_release';
    fee := private.compute_fee('commission', e.amount_minor, now());
    if fee ->> 'status' = 'ok' then
      commission := coalesce((fee ->> 'fee_minor')::bigint, 0);
      rate_id := nullif(fee ->> 'rate_id', '')::uuid;
    end if;
  else
    /* A refund returns the whole amount. We do not charge somebody a
       commission for getting their own money back. */
    target_user := e.payer_id;
    entry_kind := 'escrow_refund';
    commission := 0;
    rate_id := null;
  end if;

  net := e.amount_minor - commission;
  if net < 0 then
    return jsonb_build_object('status', 'bad_commission');
  end if;

  target_wallet := private.wallet_for_update(target_user);
  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  insert into public.wallet_entries
    (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values
    (target_wallet, entry_kind, 'credit', net,
     'escrow:' || p_direction || ':' || e.id::text, 'COMPLETED',
     jsonb_build_object(
       'note', case when p_direction = 'release'
                    then 'Released from escrow by RentMe'
                    else 'Refunded from escrow by RentMe' end,
       'escrow_id', e.id,
       'purpose', e.purpose,
       'listing_id', e.listing_id,
       'gross_minor', e.amount_minor,
       'commission_minor', commission,
       'settled_by', p_actor,
       'reason', p_note
     ));

  /*
   * THE LINE THIS MIGRATION EXISTS FOR.
   *
   * Same transaction as the payee's credit, so the money cannot be withheld
   * without also being booked. Guarded on `commission > 0` because the table
   * refuses a non-positive amount, and because at today's zero rates a row per
   * settlement saying "we took nothing" is noise rather than a record.
   */
  if commission > 0 then
    insert into public.platform_revenue
      (source, amount_minor, escrow_id, listing_id, rate_id, reference, metadata)
    values
      ('escrow_commission', commission, e.id, e.listing_id, rate_id,
       'escrow:commission:' || e.id::text,
       jsonb_build_object(
         'gross_minor', e.amount_minor,
         'net_to_payee_minor', net,
         'payer_id', e.payer_id,
         'payee_id', e.payee_id,
         'settled_by', p_actor
       ));
  end if;

  update public.escrows
     set state = p_to_state,
         released_at = case when p_direction = 'release' then now() else released_at end,
         refunded_at = case when p_direction = 'refund' then now() else refunded_at end,
         resolved_at = case when p_to_state = 'RESOLVED' then now() else resolved_at end,
         resolved_by = case when p_to_state = 'RESOLVED' then p_actor else resolved_by end,
         resolution_note = case when p_to_state = 'RESOLVED' then p_note else resolution_note end,
         commission_minor = commission,
         commission_rate_id = rate_id
   where id = e.id;

  perform private.notify(
    target_user, 'wallet',
    case when p_direction = 'release' then 'Escrow released to you' else 'Escrow refunded to you' end,
    'The money is in your wallet now.',
    '/wallet'
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'direction', p_direction,
    'state', p_to_state,
    'gross_minor', e.amount_minor,
    'commission_minor', commission,
    'net_minor', net
  );
end;
$function$;
