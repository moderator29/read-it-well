-- TRACK A.1  VALLO NEVER HOLDS CUSTOMER MONEY. THE CUSTODY MACHINERY IS RETIRED.
--
-- Founder directive, 25 September 2026. Paystack's terms list escrow as a
-- prohibited business, confirmed by their compliance chat the same night, so
-- the held-payment design was never going to run through them whatever the
-- licensing answer. The replacement is split settlement at the moment of
-- payment (the lister's share and Vallo's commission settle in the same
-- transaction) with the Vallo Guarantee as the trust mechanism. That is
-- built in the migrations after this one. This one removes the old design so
-- that nothing reachable can hold a customer's money pending a later
-- decision:
--
--   * escrows, escrow_evidence, escrow_rulings, escrow_float_snapshots,
--     wallets, wallet_entries and wallet_pots leave `public` for
--     `retired_custody`, a schema with no grants to any API role. The rows are
--     KEPT, not dropped: money records are retained by law (AML-11,
--     docs/RETENTION_SCHEDULE.md). On the day of retirement they held one
--     wallet with a completed 1,000 naira deposit and a failed withdrawal of
--     the same sum, the founder's own test, and no escrow ever funded.
--   * Every function that could open, fund, hold, release, refund, rule on,
--     sweep, transfer between or pay from those balances is dropped.
--   * The four escrow cron jobs are unscheduled.
--   * The switches `wallet`, `held_payments` and `held_payments_payouts` stay
--     as rows reading false, and the flag guard refuses to set any of them
--     true for anybody, service role included. They are not a way back.
--   * An event trigger refuses to create a table, view or function in
--     `public` or `private` whose name is a custody name. A migration written
--     before today that tries to bring one back fails loudly instead of
--     quietly re-opening custody.

-- ---------------------------------------------------------------- 1. crons
do $$
declare j text;
begin
  foreach j in array array['vallo_escrow_age_watch', 'vallo_escrow_book_the_float',
                           'vallo_escrow_invariants', 'vallo_escrow_sweep_timeouts'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

-- ------------------------------------------------- 2. policies and triggers
drop policy if exists escrow_evidence_objects_party_read on storage.objects;
drop policy if exists escrow_evidence_objects_party_insert on storage.objects;
drop policy if exists escrow_evidence_objects_admin_read on storage.objects;

drop trigger if exists inspection_confirmations_feed_escrow on public.inspection_confirmations;
drop trigger if exists ledger_entries_settle_rent_to_lister on public.ledger_entries;

do $$
declare r record;
begin
  for r in select tgname, tgrelid::regclass as rel from pg_trigger
            where not tgisinternal
              and tgrelid in (select to_regclass('public.' || t) from unnest(array[
                'wallets', 'wallet_entries', 'wallet_pots', 'escrows', 'escrow_evidence',
                'escrow_rulings', 'escrow_float_snapshots']) t) loop
    execute format('drop trigger %I on %s', r.tgname, r.rel);
  end loop;
end $$;

-- A refund row no longer points at a wallet entry; the column stays as history.
alter table public.booking_refunds drop constraint if exists booking_refunds_wallet_entry_id_fkey;

-- ------------------------------------------------ 3. the functions rewritten
-- Money holds (a support-changed email, V-19) still stop money leaving to a
-- NEW destination. There is no wallet any more, so only the two account
-- tables remain, and the words name no reason (RM050).
create or replace function private.refuse_money_out_during_hold()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  owner uuid;
  until timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.account_number is not distinct from old.account_number
       and new.bank_code is not distinct from old.bank_code then
      return new;
    end if;
  end if;
  if tg_table_name = 'bank_accounts' then
    owner := new.user_id;
  else
    select a.user_id into owner from public.agents a where a.id = new.agent_id;
  end if;
  until := private.money_hold_until(owner);
  if until is not null then
    raise exception 'A new payout account cannot be added to this account until %.',
      to_char(until at time zone 'Africa/Lagos', 'FMDD Month YYYY, HH24:MI')
      using errcode = 'RM050';
  end if;
  return new;
end;
$function$;

-- The retired switches can never be turned on again, by anybody.
create or replace function private.guard_feature_flag_write()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op <> 'DELETE'
     and new.key in ('wallet', 'wallet_pots', 'held_payments', 'held_payments_payouts')
     and new.enabled then
    raise exception 'custody_retired: % is a retired custody switch and cannot be turned on', new.key
      using errcode = '42501',
            hint = 'Vallo never holds customer money (Track A, 25 September 2026). There is nothing behind this switch.';
  end if;
  return coalesce(new, old);
end;
$function$;


-- What stops an account being deleted: things that are still happening. There
-- is no balance any more, so no balance can block. The wallet keys stay in the
-- answer at zero because the deletion screen and its tests read them.
create or replace function private.deletion_money_blockers(p_user uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_owes     bigint  := 0;
  v_owed     bigint  := 0;
  v_bookings integer := 0;
  v_reserves integer := 0;
begin
  select coalesce(sum(r.amount_minor), 0) into v_owes
    from public.rent_refunds_owed r
   where r.lister_id = p_user and r.cleared_at is null and r.amount_minor > 0;

  select coalesce(sum(r.amount_minor), 0) into v_owed
    from public.rent_refunds_owed r
    join public.bookings b on b.id = r.booking_id
   where b.guest_id = p_user and r.cleared_at is null and r.amount_minor > 0;

  select count(*) into v_bookings
    from public.bookings b
   where b.guest_id = p_user
     and b.status in ('PENDING', 'CONFIRMED')
     and b.check_out >= (now() at time zone 'Africa/Lagos')::date;

  select count(*) into v_reserves
    from public.reservations r
   where r.guest_id = p_user
     and r.status in ('PENDING', 'CONFIRMED')
     and r.reserved_for >= now();

  return jsonb_build_object(
    'blocked', (v_owes > 0 or v_owed > 0 or v_bookings > 0 or v_reserves > 0),
    'wallet_balance_minor', 0,
    'wallet_held_minor', 0,
    'pot_balance_minor', 0,
    'pending_payouts', 0,
    'rent_refunds_owed_minor', v_owes,
    'rent_refunds_due_minor', v_owed,
    'active_bookings', v_bookings,
    'active_reservations', v_reserves
  );
end;
$function$;

create or replace function public.admin_payment_health(p_stale_minutes integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  minutes integer := greatest(coalesce(p_stale_minutes, 30), 1);
  unsettled jsonb;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'provider', t.provider, 'provider_ref', t.provider_ref,
           'amount_minor', t.amount_minor, 'currency', t.currency, 'status', t.status,
           'booking_id', t.booking_id, 'created_at', t.created_at) order by t.created_at desc), '[]'::jsonb)
    into unsettled
    from (select * from public.transactions
           where status in ('PENDING', 'FAILED') and created_at > now() - interval '30 days'
           order by created_at desc limit 50) t;
  -- No wallet can be overdrawn and no withdrawal can be held: there are none.
  return jsonb_build_object('status', 'ok', 'stale_minutes', minutes,
                            'overdrawn', '[]'::jsonb, 'stale_holds', '[]'::jsonb,
                            'unsettled', unsettled);
end;
$function$;

-- A refund goes back to the card it came from. There is no wallet to land in.
create or replace function private.notify_booking_refund()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  listing_title text;
  night_rate    public.rate_period;
  amount_txt    text;
begin
  select l.title, l.rate_period into listing_title, night_rate
    from public.bookings b join public.listings l on l.id = b.listing_id
   where b.id = new.booking_id;
  if new.refund_minor > 0 then
    amount_txt := 'NGN ' || to_char((new.refund_minor::numeric) / 100, 'FM999,999,999,990.00');
    perform private.notify(
      new.guest_id, 'booking', 'Refund on its way',
      amount_txt || ' for ' || coalesce(listing_title, 'a cancelled booking')
        || ' is being returned to the card or account you paid with. Banks usually show it within 5 to 10 working days.',
      case when night_rate = 'night' then '/trips' else '/bookings' end);
  else
    perform private.notify(
      new.guest_id, 'booking', 'Cancellation recorded',
      coalesce(listing_title, 'Your stay') || ' is cancelled and the published schedule returned nothing on this one. '
        || 'If you could not get in, or the place was not what was listed, reply to support and a person will look at the booking again.',
      case when night_rate = 'night' then '/trips' else '/bookings' end);
  end if;
  return new;
end;
$function$;

-- ------------------------------------------------------------ 4a. the views
-- First: wallet_pot_balances and wallet_balances depend on
-- private.pot_balance_minor and private.wallet_balance, so they must go before
-- those functions are dropped (the first live apply failed on exactly this,
-- 2BP01, and rolled back cleanly).
drop view if exists public.wallet_pot_balances;
drop view if exists public.wallet_balances;

-- --------------------------------------------- 4. the custody functions go
drop function if exists public.escrow_admin_resolve(uuid, text, text);
drop function if exists public.escrow_cancel_as(uuid, uuid, text);
drop function if exists public.escrow_confirm(uuid);
drop function if exists public.escrow_confirm_as(uuid, uuid);
drop function if exists public.escrow_file_evidence_as(uuid, uuid, public.escrow_evidence_kind, public.escrow_fact, date, bigint, text, text, text, integer, text);
drop function if exists public.escrow_fund_from_wallet(uuid, uuid, public.escrow_purpose, bigint, text, integer);
drop function if exists public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer);
drop function if exists public.escrow_fund_proposal_as(uuid, uuid, integer);
drop function if exists public.escrow_hold(uuid, uuid, bigint, text, text, integer);
drop function if exists public.escrow_open(uuid, uuid, uuid, public.escrow_purpose, bigint);
drop function if exists public.escrow_propose_as(uuid, uuid, uuid, public.escrow_purpose, bigint, boolean);
drop function if exists public.escrow_raise_dispute(uuid, text);
drop function if exists public.escrow_raise_dispute_as(uuid, uuid, text);
drop function if exists public.escrow_refund(uuid, uuid, text, text);
drop function if exists public.escrow_release(uuid, uuid, text, text);
drop function if exists public.escrow_request_release(uuid);
drop function if exists public.escrow_request_release_as(uuid, uuid);
drop function if exists public.escrow_reverse_ruling(uuid, text);
drop function if exists public.expire_stale_withdrawal_holds(integer);
drop function if exists public.admin_expire_stale_withdrawal_holds(integer);
drop function if exists public.hold_wallet_withdrawal(uuid, bigint, text, jsonb);
drop function if exists public.move_into_pot(uuid, uuid, bigint, text);
drop function if exists public.move_out_of_pot(uuid, uuid, bigint, text);
drop function if exists public.pay_booking_from_wallet(uuid, uuid, text);
drop function if exists public.stale_withdrawal_holds(integer);
drop function if exists public.transfer_between_wallets(uuid, uuid, bigint, text, text, text);
drop function if exists public.wallets_overdrawn();
drop function if exists public.user_id_by_email_for_transfer(text);

drop function if exists private.audit_escrow_ruling_change();
drop function if exists private.enqueue_withdrawal_outcome_email();
drop function if exists private.escrow_age_watch();
drop function if exists private.escrow_audit_insert();
drop function if exists private.escrow_commission_at_funding();
drop function if exists private.escrow_commission_is_permitted(public.escrow_purpose);
drop function if exists private.escrow_enqueue_emails();
drop function if exists private.escrow_evidence_is_append_only();
drop function if exists private.escrow_evidence_path_access(text, boolean);
drop function if exists private.escrow_float_components();
drop function if exists private.escrow_float_snapshot_take();
drop function if exists private.escrow_guard_transition();
drop function if exists private.escrow_inspection_is_a_signal();
drop function if exists private.escrow_invariants_check();
drop function if exists private.escrow_pause(uuid, text);
drop function if exists private.escrow_payee_blocked(uuid);
drop function if exists private.escrow_payout_at_end_of_lagos_day();
drop function if exists private.escrow_payout_gate(uuid, uuid, text, uuid);
drop function if exists private.escrow_payouts_open();
drop function if exists private.escrow_purpose_is_open(public.escrow_purpose);
drop function if exists private.escrow_settle(uuid, text, public.escrow_state, uuid, text);
drop function if exists private.escrow_sweep_timeouts();
drop function if exists private.escrow_transition_is_legal(public.escrow_state, public.escrow_state);
drop function if exists private.escrow_two_person_threshold_minor();
drop function if exists private.escrows_refuse_while_gate_closed();
drop function if exists private.guard_escrow_ruling_change();
drop function if exists private.guard_wallet_entry_change();
drop function if exists private.held_payments_open();
drop function if exists private.custody_structure();
drop function if exists private.lister_rent_credit_left(uuid);
drop function if exists private.notify_wallet_entry();
drop function if exists private.pay_booking_from_wallet(uuid, uuid, text);
drop function if exists private.pot_balance_minor(uuid);
drop function if exists private.refuse_withdrawal_while_payouts_closed();
drop function if exists private.rent_refund_shortfall(uuid, bigint);
drop function if exists private.settle_rent_charge_to_lister();
drop function if exists private.stale_withdrawal_holds(integer);
drop function if exists private.transfer_between_wallets(uuid, uuid, bigint, text, text, text);
drop function if exists private.wallet_balance(uuid);
drop function if exists private.wallet_for_update(uuid);
drop function if exists private.wallet_pots_guard();
drop function if exists private.wallet_spendable_locked(uuid);
drop function if exists private.wallets_overdrawn();
drop function if exists private.bank_payouts_open();

delete from private.platform_settings where key = 'custody_structure';

-- --------------------------------------------------- 6. the tables move out
create schema if not exists retired_custody;
revoke all on schema retired_custody from public, anon, authenticated, service_role;
comment on schema retired_custody is
  'Retired 25 September 2026. Vallo never holds customer money. These rows are kept as money records (retention law) and are reachable by no API role and no function that moves money.';

do $$
declare t text;
begin
  foreach t in array array['escrow_evidence', 'escrow_rulings', 'escrow_float_snapshots', 'escrows',
                           'wallet_pots', 'wallet_entries', 'wallets'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
      execute format('alter table public.%I set schema retired_custody', t);
      execute format('revoke all on retired_custody.%I from public, anon, authenticated, service_role', t);
    end if;
  end loop;
end $$;

do $$
declare pol record;
begin
  -- The loop variable is not called p: that name is the pg_policy alias in
  -- its own query (the second live apply failed on this, 55000, rolled back).
  for pol in select pp.polname, pp.polrelid::regclass as rel from pg_policy pp
            join pg_class c on c.oid = pp.polrelid join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'retired_custody' loop
    execute format('drop policy %I on %s', pol.polname, pol.rel);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['escrow_state', 'escrow_purpose', 'escrow_fact', 'escrow_evidence_kind',
                           'wallet_entry_kind', 'wallet_entry_direction', 'wallet_entry_status'] loop
    if to_regtype('public.' || t) is not null then
      execute format('alter type public.%I set schema retired_custody', t);
    end if;
  end loop;
end $$;

create or replace function private.has_money_history(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (select 1 from public.transactions t join public.bookings b on b.id = t.booking_id
                  where b.guest_id = p_user)
      or exists (select 1 from public.rent_payments rp where rp.tenant_id = p_user or rp.lister_id = p_user)
      or exists (select 1 from retired_custody.wallet_entries we join retired_custody.wallets w on w.id = we.wallet_id
                  where w.user_id = p_user)
      or exists (select 1 from retired_custody.escrows e where e.payer_id = p_user or e.payee_id = p_user);
$function$;

-- The retention jobs, the purge and the person file still read the retired
-- rows (a record kept by law is still anonymised when its owner leaves, and
-- still destroyed when its time is up). Only their table names move.
do $$
declare f text; def text;
begin
  foreach f in array array['public.purge_account_rows(uuid)', 'public.destroy_expired_money_records(integer)',
                           'public.admin_person_file(uuid)'] loop
    def := pg_get_functiondef(f::regprocedure);
    def := regexp_replace(def, 'public\.wallet(s|_entries|_pots)\M', 'retired_custody.wallet\1', 'g');
    def := regexp_replace(def, 'public\.escrow(s|_evidence|_rulings)\M', 'retired_custody.escrow\1', 'g');
    execute def;
  end loop;
end $$;

-- ---------------------------------------------------- 7. the switches stay off
update public.feature_flags set enabled = false
 where key in ('wallet', 'held_payments', 'held_payments_payouts');

-- ----------------------------------------------------- 8. nothing comes back
create or replace function private.refuse_custody_objects()
returns event_trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  obj record;
  name text;
begin
  for obj in select * from pg_event_trigger_ddl_commands() loop
    if obj.schema_name not in ('public', 'private') then
      continue;
    end if;
    if obj.object_type not in ('table', 'view', 'function', 'materialized view') then
      continue;
    end if;
    name := lower(split_part(regexp_replace(obj.object_identity, '\(.*$', ''), '.', 2));
    if name ~ '(^|_)(wallets?|escrows?|pots?)(_|$)' or name ~ '^held_payment' then
      raise exception 'custody_retired: % % looks like custody machinery and cannot be created', obj.object_type, obj.object_identity
        using errcode = '42501',
              hint = 'Vallo never holds customer money (Track A, 25 September 2026). Money settles at payment by split; trust is the Vallo Guarantee.';
    end if;
  end loop;
end;
$function$;

drop event trigger if exists retired_custody_stays_retired;
create event trigger retired_custody_stays_retired on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'CREATE FUNCTION', 'CREATE MATERIALIZED VIEW', 'ALTER TABLE', 'ALTER FUNCTION')
  execute function private.refuse_custody_objects();

-- ----------------------------------------------------------- 9. read back
do $$
declare n integer;
begin
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname in ('public', 'private')
     and (p.proname ~ '(^|_)(wallets?|escrows?|pots?)(_|$)' or p.proname ~ '^held_payment');
  if n > 0 then
    raise exception 'custody functions remain: %', n;
  end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname in ('public', 'private')
     and p.prosrc ~ 'public\.(wallets|wallet_entries|wallet_pots|escrows|escrow_evidence|escrow_rulings)\M';
  if n > 0 then
    raise exception 'functions still read the retired tables from public: %', n;
  end if;
  if exists (select 1 from cron.job where command ~ 'escrow') then
    raise exception 'an escrow cron job remains';
  end if;
end $$;
