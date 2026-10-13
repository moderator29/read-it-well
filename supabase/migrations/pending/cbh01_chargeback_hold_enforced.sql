-- DRAFT, not applied. CHARGEBACK HOLD 1 of 1 (track/chargeback-hold). Needs
-- 20261006093655_chargebacks_record_state_recovery_and_payout_hold (live).
-- Probe: supabase/tests/probes-pending/cbh01-chargeback-hold-enforced.sql
--
-- THE PAYOUT RULE, ENFORCED where Vallo itself instructs money to a lister.
-- `public.lister_chargeback_hold(uuid)` (a LOST chargeback whose recovery is
-- still `owed`) was a predicate nothing called. From this draft:
--
--  1. Payluk escrow release (provider_arrangements, seller_user_id). Vallo
--     instructs the partner to release in two places: the renter's own
--     confirmation (requestRelease, standard and milestone) and a staff
--     decision for the lister (staffResolve COMPLETED). The app asks
--     public.chargeback_release_gate(arrangement) first (service role). While
--     the hold applies it answers `held`, writes an audit row
--     `chargeback.hold_refused`, and PAUSES the release on the arrangement
--     itself (release_paused_at, reason starting `chargeback_hold:`), which
--     is the flag the agreements watch list already shows staff. The
--     existing trigger refuses a paused release; it now also refuses the
--     move to release_requested made by Vallo while the hold applies, and a
--     new trigger does both for a milestone (a paused release used to be
--     refused for a standard arrangement only: the milestone path was never
--     checked, fixed here). The partner's own reports are never refused:
--     money already moved is always recorded.
--  2. Rewards Balance payouts (rewards_payouts.member_id, Paystack transfer
--     from Vallo's float). rewards_payout_open routes a held member's payout
--     to `under_review` with risk reason `chargeback_hold` (the existing
--     staff review queue) and audits it; admin_rewards_payout_decide refuses
--     to release it (`chargeback_hold`); rewards_payout_claim_send refuses to
--     send one opened before the hold (audited once a day while it waits;
--     rewards_payouts_stuck already raises it to staff).
--  3. THE OVERRIDE: public.admin_chargeback_hold_override(kind, subject,
--     reason). Finance scope on a proved session, a reason of at least 12
--     characters, never for the staffer's own hold. Records one row in
--     public.chargeback_hold_overrides for that one arrangement or payout
--     (never for the lister as a whole), audits `chargeback.hold_overridden`,
--     and lifts a pause this draft set (a pause a person set stays). The
--     release itself is then asked for through the existing road.
--
-- NOT ENFORCED, ON PURPOSE: card payments split by Paystack at the moment of
-- charge (payment_split_for_booking, payment_split_for_rent_share,
-- restaurant_bill_open, reservation_deposit_quote via
-- private.payee_subaccount). That money never passes Vallo; no hold can stop
-- the split, and no existing gate pauses a lister's charges, so none is
-- invented here. Guarantee claim payouts are paid by a person by bank
-- transfer and recorded after; they are not gated by this draft.
--
-- Additive: one table if absent, functions by create or replace, triggers by
-- create or replace trigger. No drops, no deletes.
set lock_timeout = '5s';

create table if not exists public.chargeback_hold_overrides (
  id             uuid primary key default gen_random_uuid(),
  subject_kind   text not null check (subject_kind in ('arrangement', 'rewards_payout')),
  subject_id     uuid not null,
  lister_user_id uuid not null references auth.users(id),
  reason         text not null check (length(btrim(reason)) between 12 and 1000),
  actor_id       uuid not null,
  created_at     timestamptz not null default now(),
  constraint chargeback_hold_overrides_one_per_subject unique (subject_kind, subject_id)
);
alter table public.chargeback_hold_overrides enable row level security;
revoke all on public.chargeback_hold_overrides from public, anon, authenticated, service_role;

-- Held, and nobody in finance has overridden it for this one subject.
create or replace function private.chargeback_hold_blocks(p_kind text, p_subject uuid, p_lister uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_lister is not null
     and public.lister_chargeback_hold(p_lister)
     and not exists (select 1 from public.chargeback_hold_overrides o
                      where o.subject_kind = p_kind and o.subject_id = p_subject);
$function$;

-- One audit row per refused subject per day (a sweep must not flood the log).
create or replace function private.chargeback_hold_refused(p_kind text, p_subject uuid, p_lister uuid, p_path text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not exists (select 1 from public.audit_log a
                  where a.action = 'chargeback.hold_refused' and a.entity_type = p_kind
                    and a.entity_id = p_subject::text and a.created_at > now() - interval '1 day') then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'chargeback.hold_refused', p_kind, p_subject::text,
            jsonb_build_object('lister_user_id', p_lister, 'path', p_path,
                               'rule', 'lost chargeback still owed (public.lister_chargeback_hold)'));
  end if;
end;
$function$;

-- 1. The release gate the app asks before it instructs the partner.
create or replace function public.chargeback_release_gate(p_arrangement uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a public.provider_arrangements%rowtype;
begin
  select * into a from public.provider_arrangements where id = p_arrangement for update;
  if a.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.chargeback_hold_blocks('arrangement', a.id, a.seller_user_id) then
    perform private.chargeback_hold_refused('arrangement', a.id, a.seller_user_id, 'escrow_release');
    if a.release_paused_at is null and a.status not in ('released', 'refunded', 'split', 'failed', 'cancelled') then
      update public.provider_arrangements
         set release_paused_at = now(), release_paused_by = null,
             release_pause_reason = 'chargeback_hold: the lister has a lost chargeback still owed. Finance can override it for this payment with a reason.'
       where id = a.id;
      insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
      values (a.id, a.status, a.status, 'vallo', jsonb_build_object('release_paused', true, 'by', 'chargeback_hold'));
    end if;
    return jsonb_build_object('status', 'held');
  end if;
  if a.release_paused_at is not null then return jsonb_build_object('status', 'paused'); end if;
  return jsonb_build_object('status', 'clear',
    'overridden', exists (select 1 from public.chargeback_hold_overrides o
                           where o.subject_kind = 'arrangement' and o.subject_id = a.id));
end;
$function$;

-- The existing backstop, now with the payout rule beside the pause.
create or replace function private.provider_arrangements_release_not_paused()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.status = 'release_requested' and old.status is distinct from 'release_requested' then
    if new.release_paused_at is not null then
      raise exception 'release_paused: Vallo has paused the release of this payment' using errcode = '42501';
    end if;
    if new.status_source = 'vallo' and private.chargeback_hold_blocks('arrangement', new.id, new.seller_user_id) then
      raise exception 'chargeback_hold: the lister has a lost chargeback still owed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- A milestone's release, checked the same way (it never was).
create or replace function private.provider_arrangement_milestones_release_gate()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.provider_arrangements%rowtype;
begin
  if new.status = 'release_requested' and old.status is distinct from 'release_requested' then
    select * into a from public.provider_arrangements where id = new.arrangement_id;
    if a.release_paused_at is not null then
      raise exception 'release_paused: Vallo has paused the release of this payment' using errcode = '42501';
    end if;
    if private.chargeback_hold_blocks('arrangement', a.id, a.seller_user_id) then
      raise exception 'chargeback_hold: the lister has a lost chargeback still owed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

create or replace trigger provider_arrangement_milestones_01_release_gate
  before update of status on public.provider_arrangement_milestones
  for each row execute function private.provider_arrangement_milestones_release_gate();

-- 2. Rewards Balance payouts. The live body, with the payout rule added.
create or replace function public.rewards_payout_open(p_member uuid, p_bank_code text, p_account_number text, p_account_name text, p_recipient_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
 set lock_timeout to '2s'
as $function$
declare
  pol public.referral_policy := private.referral_policy_now();
  v_amount bigint; v_balance bigint; v_key text; v_id uuid; v_ref text;
  v_score int := 0; v_reasons jsonb := '[]'::jsonb; v_status text := 'processing'; v_ids uuid[];
  v_held boolean := false;
begin
  if pol.id is null or not pol.payouts_enabled then
    return jsonb_build_object('status', 'not_available');
  end if;
  if private.referral_budget_period_ensure(private.lagos_month(now())) is null then
    return jsonb_build_object('status', 'not_available');
  end if;
  if p_member is null or coalesce(btrim(p_account_name), '') = '' or p_account_number !~ '^\d{10}$'
     or coalesce(btrim(p_recipient_code), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if not exists (select 1 from public.confirmed_phones where user_id = p_member) then
    return jsonb_build_object('status', 'phone_required');
  end if;
  perform pg_advisory_xact_lock(hashtext('rewards_payout'), hashtext(p_member::text));
  if exists (select 1 from public.rewards_payouts where member_id = p_member and status in ('under_review','processing','sent','unknown')) then
    return jsonb_build_object('status', 'already_open');
  end if;
  perform public.referral_release_due();

  select coalesce(sum(amount_minor), 0) into v_balance from public.rewards_ledger where member_id = p_member;
  select coalesce(array_agg(x.id), '{}'::uuid[]), coalesce(sum(x.reward_minor), 0) into v_ids, v_amount from (
    select id, reward_minor,
           sum(reward_minor) over (order by available_at, id rows between unbounded preceding and current row) as run
      from public.referrals where referrer_id = p_member and status = 'available'
  ) x where x.run <= v_balance;
  if v_amount < pol.withdrawal_min_minor then
    return jsonb_build_object('status', 'below_minimum', 'available_minor', greatest(v_amount, 0),
                              'withdrawal_min_minor', pol.withdrawal_min_minor);
  end if;

  v_key := private.identity_key('payout', p_account_number);
  if v_key is not null and exists (select 1 from public.rewards_payouts where account_key = v_key and member_id <> p_member) then
    v_score := v_score + 60; v_reasons := v_reasons || '"shared_payout_destination"'::jsonb;
  end if;
  if v_key is not null and exists (select 1 from private.identity_denylist where key_kind = 'payout' and key_hmac = v_key) then
    v_score := v_score + 100; v_reasons := v_reasons || '"payout_account_denylisted"'::jsonb;
  end if;
  if v_key is null then
    v_score := v_score + pol.review_risk_score; v_reasons := v_reasons || '"identity_key_unavailable"'::jsonb;
  end if;
  if v_score >= pol.review_risk_score then v_status := 'under_review'; end if;
  -- THE PAYOUT RULE: a lost chargeback still owed sends the payout to review.
  if public.lister_chargeback_hold(p_member) then
    v_held := true; v_status := 'under_review'; v_reasons := v_reasons || '"chargeback_hold"'::jsonb;
  end if;

  v_id := gen_random_uuid();
  v_ref := 'vallo-rw-' || replace(v_id::text, '-', '');
  insert into public.rewards_payouts (id, member_id, amount_minor, reference, status, bank_code, account_last4,
                                      account_key, account_name, recipient_code, risk_score, risk_reasons)
  values (v_id, p_member, v_amount, v_ref, v_status, btrim(p_bank_code), right(p_account_number, 4),
          v_key, btrim(p_account_name), btrim(p_recipient_code), v_score, v_reasons);
  insert into public.rewards_ledger (member_id, kind, amount_minor, payout_id, reason, idempotency_key)
  values (p_member, 'payout_hold', -v_amount, v_id, 'held for a Rewards Balance payout', 'hold:' || v_id);
  update public.referrals set status = 'withdrawal_requested', payout_id = v_id where id = any(v_ids);
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, 'available', 'withdrawal_requested', 'included in a payout', jsonb_build_object('payout_id', v_id)
    from public.referrals where payout_id = v_id;
  if v_held then
    perform private.chargeback_hold_refused('rewards_payout', v_id, p_member, 'rewards_payout_open');
  end if;

  return jsonb_build_object('status', v_status, 'payout_id', v_id, 'reference', v_ref, 'amount_minor', v_amount,
                            'chargeback_hold', v_held);
end $function$;

create or replace function public.rewards_payout_claim_send(p_reference text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_member uuid;
begin
  -- A payout opened before the hold is not sent while it applies.
  select id, member_id into v_id, v_member from public.rewards_payouts
   where reference = p_reference and status = 'processing' and transfer_initiated_at is null;
  if v_id is not null and private.chargeback_hold_blocks('rewards_payout', v_id, v_member) then
    perform private.chargeback_hold_refused('rewards_payout', v_id, v_member, 'rewards_payout_send');
    return false;
  end if;
  v_id := null;
  update public.rewards_payouts set transfer_initiated_at = now(), status = 'sent'
   where reference = p_reference and status = 'processing'
     and transfer_initiated_at is null and recipient_code is not null
  returning id into v_id;
  if v_id is null then return false; end if;
  insert into public.referral_events (referral_id, from_status, to_status, reason, detail)
  select id, 'withdrawal_requested', 'sent', 'transfer initiated', jsonb_build_object('payout_id', v_id)
    from public.referrals where payout_id = v_id and status = 'withdrawal_requested';
  update public.referrals set status = 'sent' where payout_id = v_id and status = 'withdrawal_requested';
  return true;
end $function$;

create or replace function public.admin_rewards_payout_decide(p_payout uuid, p_decision text, p_reason text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare p public.rewards_payouts;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into p from public.rewards_payouts where id = p_payout for update;
  if p.id is null then return 'refused'; end if;
  if p_decision = 'fail_unsent' then
    if p.status not in ('processing','sent','unknown') or p.created_at > now() - interval '24 hours' then
      return 'refused';
    end if;
    if length(btrim(p_reason)) < 20 then
      raise exception 'Say what the provider dashboard showed.' using errcode = '22023';
    end if;
    perform private.rewards_payout_fail(p.id, 'never sent (staff): ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_failed_unsent', 'rewards_payout', p.id::text,
            jsonb_build_object('reason', p_reason, 'prior_status', p.status, 'transfer_initiated_at', p.transfer_initiated_at));
    return 'failed';
  end if;
  if p.status <> 'under_review' then return 'refused'; end if;
  if p_decision = 'release' then
    if p.recipient_code is null then return 'no_recipient'; end if;
    -- THE PAYOUT RULE: only a finance override lets a held member's payout go.
    if private.chargeback_hold_blocks('rewards_payout', p.id, p.member_id) then
      perform private.chargeback_hold_refused('rewards_payout', p.id, p.member_id, 'rewards_payout_release');
      return 'chargeback_hold';
    end if;
    update public.rewards_payouts set status = 'processing' where id = p.id;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_released', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'processing';
  elsif p_decision = 'refuse' then
    perform private.rewards_payout_fail(p.id, 'refused on review: ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_refused', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'failed';
  end if;
  return 'refused';
end $function$;

-- 3. The finance override: one subject, a reason, audited.
create or replace function public.admin_chargeback_hold_override(p_kind text, p_subject uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
  lister uuid;
  a public.provider_arrangements%rowtype;
  v_override uuid;
begin
  if not coalesce(private.staff_can(actor, 'finance'), false) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_kind not in ('arrangement', 'rewards_payout') then return jsonb_build_object('status', 'bad_kind'); end if;
  if reason is null or length(reason) < 12 then return jsonb_build_object('status', 'reason_required'); end if;
  if length(reason) > 1000 then return jsonb_build_object('status', 'reason_too_long'); end if;
  if p_kind = 'arrangement' then
    select * into a from public.provider_arrangements where id = p_subject for update;
    lister := a.seller_user_id;
  else
    select member_id into lister from public.rewards_payouts where id = p_subject for update;
  end if;
  if lister is null then return jsonb_build_object('status', 'not_found'); end if;
  if lister = actor then return jsonb_build_object('status', 'own_hold'); end if;
  if not public.lister_chargeback_hold(lister) then return jsonb_build_object('status', 'not_held'); end if;
  insert into public.chargeback_hold_overrides (subject_kind, subject_id, lister_user_id, reason, actor_id)
  values (p_kind, p_subject, lister, reason, actor)
  on conflict (subject_kind, subject_id) do nothing
  returning id into v_override;
  if v_override is null then return jsonb_build_object('status', 'already'); end if;
  if p_kind = 'arrangement' and a.release_pause_reason like 'chargeback_hold:%' then
    update public.provider_arrangements
       set release_paused_at = null, release_paused_by = null, release_pause_reason = null
     where id = a.id;
    insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
    values (a.id, a.status, a.status, 'vallo', jsonb_build_object('release_paused', false, 'by', actor, 'override', v_override));
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'chargeback.hold_overridden', p_kind, p_subject::text,
          jsonb_build_object('lister_user_id', lister, 'reason', reason, 'override_id', v_override));
  return jsonb_build_object('status', 'ok', 'override_id', v_override);
end;
$function$;

revoke all on function private.chargeback_hold_blocks(text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.chargeback_hold_refused(text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.chargeback_release_gate(uuid) from public, anon, authenticated;
grant execute on function public.chargeback_release_gate(uuid) to service_role;
revoke all on function public.admin_chargeback_hold_override(text, uuid, text) from public, anon;
grant execute on function public.admin_chargeback_hold_override(text, uuid, text) to authenticated;

-- Read back.
do $$
begin
  if to_regclass('public.chargeback_hold_overrides') is null
     or to_regprocedure('public.chargeback_release_gate(uuid)') is null
     or to_regprocedure('public.admin_chargeback_hold_override(text,uuid,text)') is null
     or not exists (select 1 from pg_trigger where tgname = 'provider_arrangement_milestones_01_release_gate') then
    raise exception 'cbh01: something did not land';
  end if;
  if has_function_privilege('authenticated', 'public.chargeback_release_gate(uuid)', 'execute')
     or has_function_privilege('anon', 'public.admin_chargeback_hold_override(text,uuid,text)', 'execute') then
    raise exception 'cbh01: grants are wrong';
  end if;
end $$;
