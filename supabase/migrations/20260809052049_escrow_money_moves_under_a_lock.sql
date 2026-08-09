-- Escrow money, moved the only way money is allowed to move here.
--
-- Every function in this file follows private.pay_booking_from_wallet, which is
-- the one place in this schema that already gets it right: take the wallet row
-- FOR UPDATE, then read the balance, then write, all inside one statement's
-- lock. Read a balance and write it in two round trips and two concurrent
-- releases both see the same money and both spend it.
--
-- THE MONEY STAYS IN THE ONE LEDGER. There is no escrow balance table. An
-- escrow hold is a COMPLETED debit on the payer's wallet with kind
-- 'escrow_hold': the kobo have genuinely left their spendable balance, which is
-- what "held" has to mean or the word is decoration. A release is a credit to
-- the payee with kind 'escrow_release'. A refund is a credit back to the payer
-- with kind 'escrow_refund'. Anybody reading public.wallet_entries sees the
-- whole story without knowing this feature exists.
--
-- WHERE THE PLATFORM'S CUT GOES. Nowhere, today, because it is zero. When a
-- commission rate is switched on, the payee is credited the amount minus the
-- commission, and the commission and the rate row that produced it are frozen
-- onto the escrow. The platform has no wallet of its own in this schema, so the
-- cut is revenue recorded on the transaction rather than a credit to an
-- account; the day a platform wallet exists, the credit goes there and nothing
-- else in this file changes.

begin;

/* --------------------------------------------------------------- helpers */

/*
 * What a wallet can actually spend right now.
 *
 * Settled credits minus settled debits, minus anything held pending. The second
 * subtraction is the one people forget: a PENDING debit is a withdrawal already
 * requested, and counting it as spendable lets somebody spend the same kobo on
 * a withdrawal and an escrow in the same minute.
 *
 * The caller must already hold the lock on the wallet row. This function does
 * not take it, deliberately: a helper that locks would make the locking
 * invisible at the call site, which is exactly where it needs to be visible.
 */
create or replace function private.wallet_spendable_locked(p_wallet uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
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
    ), 0);
$$;

comment on function private.wallet_spendable_locked is
  'Settled balance minus pending debits. The caller is expected to be holding the wallet row FOR UPDATE already; this deliberately does not lock, so that the lock stays visible at the call site.';

/* Ensure a wallet exists and return its id, locked. */
create or replace function private.wallet_for_update(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_id uuid;
begin
  insert into public.wallets (user_id) values (p_user)
    on conflict (user_id) do nothing;
  select id into wallet_id from public.wallets where user_id = p_user for update;
  return wallet_id;
end;
$$;

/* ------------------------------------------------------------- open a hold */

/*
 * Open an escrow and fund it in one locked transaction.
 *
 * INITIATED, FUNDED and HELD all happen here, one after the other, because an
 * escrow that exists and is not funded is a row nobody can act on and a way for
 * the state machine to accumulate abandoned INITIATED rows. Each transition is
 * still a separate UPDATE so the trigger writes all three audit entries and the
 * story is complete.
 *
 * THE CALLER IS THE PAYER, always, read from auth.uid() rather than taken as an
 * argument. An argument would let a signed-in person fund somebody else's
 * wallet into an escrow, and no amount of policy elsewhere would take that
 * back.
 */
create or replace function public.escrow_fund_from_wallet(
  p_payee uuid,
  p_listing uuid,
  p_purpose public.escrow_purpose,
  p_amount_minor bigint,
  p_reference text,
  p_hold_days integer default 21
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payer uuid := auth.uid();
  payer_wallet uuid;
  spendable bigint;
  escrow_id uuid;
  hold_days integer := greatest(1, least(coalesce(p_hold_days, 21), 180));
begin
  if payer is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_payee is null or p_purpose is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_reference is null or char_length(btrim(p_reference)) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_payee = payer then
    return jsonb_build_object('status', 'same_party');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  payer_wallet := private.wallet_for_update(payer);
  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < p_amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', p_amount_minor
    );
  end if;

  insert into public.escrows (payer_id, payee_id, listing_id, purpose, amount_minor)
  values (payer, p_payee, p_listing, p_purpose, p_amount_minor)
  returning id into escrow_id;

  /* The debit. COMPLETED rather than PENDING because the kobo really have left
     the payer: a PENDING debit is a request that might be cancelled, and an
     escrow hold is not cancellable by the payer alone. */
  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', p_amount_minor, btrim(p_reference), 'COMPLETED',
       jsonb_build_object(
         'note', 'Held in escrow by RentMe',
         'escrow_id', escrow_id,
         'purpose', p_purpose,
         'payee_id', p_payee,
         'listing_id', p_listing
       ));
  exception when unique_violation then
    -- The reference is the idempotency key. A retried request must not hold the
    -- money twice, and the escrow row inserted above rolls back with it.
    raise exception 'duplicate escrow reference %', p_reference
      using errcode = 'unique_violation';
  end;

  update public.escrows
     set state = 'FUNDED', funded_at = now()
   where id = escrow_id;

  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = escrow_id;

  perform private.notify(
    p_payee, 'wallet', 'Money is held for you',
    'A payment is now held in escrow. It reaches your wallet when both sides confirm.',
    '/wallet'
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', escrow_id,
    'amount_minor', p_amount_minor,
    'state', 'HELD',
    'auto_release_at', now() + make_interval(days => hold_days)
  );
end;
$$;

comment on function public.escrow_fund_from_wallet is
  'Open an escrow and fund it from the caller''s wallet, in one locked transaction. The payer is auth.uid() and is never an argument. p_reference is the idempotency key: a repeated reference raises unique_violation and the whole hold rolls back.';

/* -------------------------------------------------------------- settling */

/*
 * The one place money leaves an escrow, in either direction.
 *
 * Release and refund differ in three things and nothing else: which wallet is
 * credited, which entry kind is written, and whether a commission is taken. So
 * they are one function with a direction rather than two functions that will
 * drift apart the first time one of them is fixed.
 *
 * Private, and it does not check who is asking. Every caller above it does,
 * because the answer to "who may release this" is different for a dual
 * confirmation, an admin override and a timeout, and burying all three in here
 * would make none of them readable.
 */
create or replace function private.escrow_settle(
  p_escrow uuid,
  p_direction text,
  p_to_state public.escrow_state,
  p_actor uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    /*
     * The platform's cut, computed HERE at the moment of settlement and frozen
     * onto the row with the rate that produced it. Never recomputed later: see
     * the fee_rates migration. Zero today, and a zero renders as "no fee"
     * because the column is 0 rather than null.
     */
    fee := private.compute_fee('commission', e.amount_minor, now());
    if fee ->> 'status' = 'ok' then
      commission := coalesce((fee ->> 'fee_minor')::bigint, 0);
      rate_id := nullif(fee ->> 'rate_id', '')::uuid;
    end if;
  else
    target_user := e.payer_id;
    entry_kind := 'escrow_refund';
    -- No commission on a refund. The platform does not take a share of money
    -- that went back to the person who paid it.
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
$$;

comment on function private.escrow_settle is
  'The one place money leaves an escrow, in either direction. Locks the escrow row and the destination wallet, computes the commission at settlement time and freezes it with its rate row, credits the ledger, and moves the state so the guard trigger writes the audit entry.';

/* -------------------------------------------------------- dual confirmation */

/*
 * Both sides say yes, and the money moves without an admin ever seeing it.
 *
 * The caller may be the payer or the payee and nobody else. Which side they are
 * decides which column is stamped, and when both are stamped the release
 * happens in the same transaction, so there is no window in which an escrow is
 * fully confirmed and still holding.
 *
 * An inspection the payer has already confirmed counts as the payer's
 * confirmation. See private.escrow_inspection_is_a_signal below.
 */
create or replace function public.escrow_confirm(p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  e public.escrows;
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor <> e.payer_id and actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state not in ('HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'not_confirmable', 'state', e.state);
  end if;

  if actor = e.payer_id then
    update public.escrows set payer_confirmed_at = coalesce(payer_confirmed_at, now())
     where id = e.id
     returning * into e;
  else
    update public.escrows set payee_confirmed_at = coalesce(payee_confirmed_at, now())
     where id = e.id
     returning * into e;
  end if;

  if e.payer_confirmed_at is not null and e.payee_confirmed_at is not null then
    return private.escrow_settle(
      e.id, 'release', 'RELEASED', actor,
      'Both sides confirmed, so the money went out without anybody having to ask.'
    );
  end if;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'One side has confirmed',
    'The other party has confirmed this escrow. It releases as soon as you confirm too.',
    '/wallet'
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'state', e.state,
    'payer_confirmed', e.payer_confirmed_at is not null,
    'payee_confirmed', e.payee_confirmed_at is not null
  );
end;
$$;

comment on function public.escrow_confirm is
  'Record the caller''s side of the dual confirmation. When both sides have confirmed, releases in the same transaction, so an escrow is never fully confirmed and still holding.';

/*
 * The inspection stops being decorative.
 *
 * public.inspection_confirmations has existed since the messaging work: a row
 * saying a named person confirmed they inspected a named listing inside a named
 * conversation. Nothing read it. Somebody stood in the flat, pressed the
 * button, and the platform did precisely nothing with the strongest signal it
 * had that the thing being paid for is real.
 *
 * An inspection confirmed by the PAYER is the payer's confirmation. Not a hint
 * toward one: somebody who has walked through the property and said so has
 * already answered the question "do you have what you paid for". It cannot
 * stand in for the PAYEE's confirmation, which is a different claim about a
 * different thing.
 */
create or replace function private.escrow_inspection_is_a_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
begin
  if new.listing_id is null then
    return null;
  end if;

  for e in
    select * from public.escrows
     where payer_id = new.user_id
       and listing_id = new.listing_id
       and state in ('HELD', 'RELEASE_REQUESTED')
       and payer_confirmed_at is null
     for update
  loop
    update public.escrows
       set payer_confirmed_at = new.confirmed_at,
           inspection_confirmation_id = new.id
     where id = e.id
     returning * into e;

    if e.payee_confirmed_at is not null then
      perform private.escrow_settle(
        e.id, 'release', 'RELEASED', new.user_id,
        'The payer confirmed the inspection and the payee had already confirmed, so the money went out.'
      );
    end if;
  end loop;

  return null;
end;
$$;

drop trigger if exists inspection_confirmations_feed_escrow on public.inspection_confirmations;
create trigger inspection_confirmations_feed_escrow
  after insert on public.inspection_confirmations
  for each row
  execute function private.escrow_inspection_is_a_signal();

/* ----------------------------------------------------------- asking, and no */

create or replace function public.escrow_request_release(p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  e public.escrows;
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor <> e.payer_id and actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state <> 'HELD' then
    return jsonb_build_object('status', 'not_requestable', 'state', e.state);
  end if;

  update public.escrows
     set state = 'RELEASE_REQUESTED',
         release_requested_at = now(),
         release_requested_by = actor
   where id = e.id;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'A release has been asked for',
    'Somebody has asked for the held money to be paid out. Confirm, or raise a dispute if that is wrong.',
    '/wallet'
  );

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'RELEASE_REQUESTED');
end;
$$;

create or replace function public.escrow_raise_dispute(p_escrow uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  e public.escrows;
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 4 then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor <> e.payer_id and actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state not in ('INITIATED', 'FUNDED', 'HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'not_disputable', 'state', e.state);
  end if;

  update public.escrows
     set state = 'DISPUTED',
         disputed_at = now(),
         disputed_by = actor,
         dispute_reason = btrim(p_reason),
         /* The clock stops. A dispute that auto-released while somebody was
            waiting for an admin would be the single worst bug this feature
            could have. */
         auto_release_at = null
   where id = e.id;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'This escrow is in dispute',
    'The money stays held until our team has looked at it. We will be in touch.',
    '/wallet'
  );

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'DISPUTED');
end;
$$;

comment on function public.escrow_raise_dispute is
  'Either party objects. Clears auto_release_at, because an escrow that timed out and paid itself while somebody was waiting for a human would be the worst failure this feature has available to it.';

/* ------------------------------------------------------- the admin override */

/*
 * An admin decides, and every part of the decision is on the record.
 *
 * The note is required by a check constraint on the table as well as by this
 * function, so an override cannot reach the row without a reason attached even
 * if somebody later writes a second path to it. The audit entry comes from the
 * transition trigger and carries the note, the admin, the direction and the
 * amount.
 *
 * A dispute is the only state an admin overrides from. That is not a limitation
 * on admin power, it is a requirement that somebody objected first: an admin
 * who wants to move an undisputed escrow can raise the dispute themselves and
 * then rule on it, and the trail then shows both halves.
 */
create or replace function public.escrow_admin_resolve(
  p_escrow uuid,
  p_direction text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  e public.escrows;
  outcome jsonb;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;
  if p_note is null or char_length(btrim(p_note)) < 4 then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into e from public.escrows where id = p_escrow;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state <> 'DISPUTED' then
    return jsonb_build_object('status', 'not_disputed', 'state', e.state);
  end if;

  outcome := private.escrow_settle(e.id, p_direction, 'RESOLVED', actor, btrim(p_note));

  perform private.notify(e.payer_id, 'wallet', 'A decision on your escrow', btrim(p_note), '/wallet');
  perform private.notify(e.payee_id, 'wallet', 'A decision on your escrow', btrim(p_note), '/wallet');

  return outcome;
end;
$$;

comment on function public.escrow_admin_resolve is
  'The admin override. Only out of DISPUTED, only with a written reason, and the reason reaches both parties as a notification as well as the audit log.';

/* ------------------------------------------------------------- the timeout */

/*
 * Nobody acted, so the clock does.
 *
 * Releases to the PAYEE rather than refunding to the payer, and that direction
 * is a real decision. The payee has already handed something over: the keys
 * are with the tenant, the property has been shown, the deposit is against a
 * tenancy that has started. Refunding by default would make silence a way for a
 * payer to take the thing and the money, which is the failure mode escrow
 * exists to prevent. The payer has the whole hold window and a dispute button
 * that stops this clock dead.
 *
 * Disputed escrows are excluded by construction: raising a dispute nulls
 * auto_release_at, and the WHERE clause requires it.
 */
create or replace function private.escrow_sweep_timeouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  moved integer := 0;
begin
  for e in
    select * from public.escrows
     where state in ('HELD', 'RELEASE_REQUESTED')
       and auto_release_at is not null
       and auto_release_at <= now()
     order by auto_release_at
     limit 200
  loop
    perform private.escrow_settle(
      e.id, 'release', 'RELEASED', null,
      'The hold window passed with no objection, so the money went to the payee.'
    );
    moved := moved + 1;
  end loop;
  return moved;
end;
$$;

comment on function private.escrow_sweep_timeouts is
  'Release holds nobody acted on. Runs on a schedule with no signed-in actor, which is why the audit entries it produces carry a null actor: nobody did it, the clock did.';

/* ------------------------------------------------------------- the surface */

revoke all on function private.wallet_spendable_locked(uuid) from public, anon, authenticated;
revoke all on function private.wallet_for_update(uuid) from public, anon, authenticated;
revoke all on function private.escrow_settle(uuid, text, public.escrow_state, uuid, text)
  from public, anon, authenticated;
revoke all on function private.escrow_sweep_timeouts() from public, anon, authenticated;

revoke all on function public.escrow_fund_from_wallet(uuid, uuid, public.escrow_purpose, bigint, text, integer)
  from public, anon;
revoke all on function public.escrow_confirm(uuid) from public, anon;
revoke all on function public.escrow_request_release(uuid) from public, anon;
revoke all on function public.escrow_raise_dispute(uuid, text) from public, anon;
revoke all on function public.escrow_admin_resolve(uuid, text, text) from public, anon;

grant execute on function public.escrow_fund_from_wallet(uuid, uuid, public.escrow_purpose, bigint, text, integer)
  to authenticated;
grant execute on function public.escrow_confirm(uuid) to authenticated;
grant execute on function public.escrow_request_release(uuid) to authenticated;
grant execute on function public.escrow_raise_dispute(uuid, text) to authenticated;
grant execute on function public.escrow_admin_resolve(uuid, text, text) to authenticated;

commit;

/*
 * The sweeper on the schedule the platform already runs.
 *
 * Outside the transaction above, because cron.schedule commits its own row and
 * a rolled back migration that had already registered a job would leave a cron
 * entry calling a function that no longer exists.
 *
 * Hourly rather than by the minute: the hold window is measured in days, so an
 * hour of lateness on a release is invisible to everybody, and a sweep that
 * wakes sixty times an hour to find nothing is sixty locks taken for no reason.
 * Minute 17 so it does not collide with the stale-hold sweep on the quarter
 * hours or the rate limit purge on the half hour.
 */
select cron.schedule(
  'rentme_escrow_sweep_timeouts',
  '17 * * * *',
  $cron$ select private.escrow_sweep_timeouts(); $cron$
);
