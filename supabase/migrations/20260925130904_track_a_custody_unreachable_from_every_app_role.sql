-- Track A, 25 September 2026. No reachable remnant of custody.
-- The full retirement (tables moved out, functions dropped) is the pending
-- A.1 migration. Until it lands, no role an application can use may call a
-- custody function: execute is revoked from public, anon, authenticated and
-- service_role. Reversible with GRANT; nothing is dropped.
do $do$
declare
  sig text;
begin
  foreach sig in array array[
    'public.admin_expire_stale_withdrawal_holds(integer)',
    'public.escrow_admin_resolve(uuid, text, text)',
    'public.escrow_cancel_as(uuid, uuid, text)',
    'public.escrow_confirm(uuid)',
    'public.escrow_confirm_as(uuid, uuid)',
    'public.escrow_file_evidence_as(uuid, uuid, public.escrow_evidence_kind, public.escrow_fact, date, bigint, text, text, text, integer, text)',
    'public.escrow_fund_from_wallet(uuid, uuid, public.escrow_purpose, bigint, text, integer)',
    'public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer)',
    'public.escrow_fund_proposal_as(uuid, uuid, integer)',
    'public.escrow_hold(uuid, uuid, bigint, text, text, integer)',
    'public.escrow_open(uuid, uuid, uuid, public.escrow_purpose, bigint)',
    'public.escrow_propose_as(uuid, uuid, uuid, public.escrow_purpose, bigint, boolean)',
    'public.escrow_raise_dispute(uuid, text)',
    'public.escrow_raise_dispute_as(uuid, uuid, text)',
    'public.escrow_refund(uuid, uuid, text, text)',
    'public.escrow_release(uuid, uuid, text, text)',
    'public.escrow_request_release(uuid)',
    'public.escrow_request_release_as(uuid, uuid)',
    'public.escrow_reverse_ruling(uuid, text)',
    'public.expire_stale_withdrawal_holds(integer)',
    'public.hold_wallet_withdrawal(uuid, bigint, text, jsonb)',
    'public.move_into_pot(uuid, uuid, bigint, text)',
    'public.move_out_of_pot(uuid, uuid, bigint, text)',
    'public.pay_booking_from_wallet(uuid, uuid, text)',
    'public.stale_withdrawal_holds(integer)',
    'public.transfer_between_wallets(uuid, uuid, bigint, text, text, text)',
    'public.user_id_by_email_for_transfer(text)',
    'public.wallets_overdrawn()'
  ] loop
    if to_regprocedure(sig) is not null then
      execute format('revoke all on function %s from public, anon, authenticated, service_role', sig);
    end if;
  end loop;
end
$do$;

-- And the custody tables are unreadable and unwritable from the app roles.
do $do$
declare
  t text;
begin
  foreach t in array array['wallets','wallet_entries','wallet_pots','escrows','escrow_evidence','escrow_rulings','escrow_float_snapshots'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end
$do$;
