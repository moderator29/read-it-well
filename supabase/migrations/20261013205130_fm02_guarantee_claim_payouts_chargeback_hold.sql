-- Applied 13 October 2026. FINAL MONEY 2 of 2 (track/final-money, 13 Oct 2026).
-- Needs cbh01_chargeback_hold_enforced and track_a2 guarantee claims (live).
--
-- THE RULING. Founder, 13 October 2026: Guarantee claim payouts pause on a
-- lost chargeback, as escrow releases and Rewards payouts already do.
--
-- A Guarantee claim is paid by a person, by bank transfer from the reserve's
-- account, to the claimant: `public.admin_decide_guarantee_claim` commits the
-- reserve (approve), and `public.admin_mark_guarantee_claim_paid` records the
-- transfer. cbh01 left both ungated. From this file, when the claimant is a
-- lister under a chargeback hold (`public.lister_chargeback_hold`, a LOST
-- chargeback whose recovery is still `owed`):
--
--  1. Approving the claim (deciding to pay) answers `chargeback_hold` and
--     changes nothing; rejecting is never refused (it pays nothing).
--  2. Marking the claim paid answers `chargeback_hold` and changes nothing.
--  Each refusal writes `chargeback.hold_refused` through the cbh01 helper
--  (one row per claim per day), entity_type 'guarantee_claim'.
--  3. Unless finance overrode THAT claim: `public.admin_chargeback_hold_override`
--     now takes the kind 'guarantee_claim' (finance scope on a proved session,
--     a reason of at least 12 characters, never the staffer's own hold), audits
--     `chargeback.hold_overridden` exactly as for the other kinds, and the claim
--     can then be approved and marked paid through the existing functions.
--
-- WHERE THE OVERRIDE IS KEPT. cbh01's table `public.chargeback_hold_overrides`
-- carries a CHECK that names only 'arrangement' and 'rewards_payout'; widening
-- it means dropping the constraint, and this file drops nothing. So a claim's
-- override is kept in a companion table of the same shape,
-- `public.chargeback_hold_claim_overrides` (one row per claim, closed to every
-- app role), and `private.chargeback_hold_blocks` reads both. The desk reads
-- overrides from the audit log, which is the same for every kind.
--
-- Additive: one table if absent, functions by create or replace. No DROP, no DELETE.
-- Probe: supabase/tests/probes/fm02-guarantee-claim-payouts-chargeback-hold.sql
set lock_timeout = '5s';

create table if not exists public.chargeback_hold_claim_overrides (
  id             uuid primary key default gen_random_uuid(),
  claim_id       uuid not null references public.guarantee_claims(id),
  lister_user_id uuid not null references auth.users(id),
  reason         text not null check (length(btrim(reason)) between 12 and 1000),
  actor_id       uuid not null,
  created_at     timestamptz not null default now(),
  constraint chargeback_hold_claim_overrides_one_per_claim unique (claim_id)
);
alter table public.chargeback_hold_claim_overrides enable row level security;
revoke all on public.chargeback_hold_claim_overrides from public, anon, authenticated, service_role;

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
                      where o.subject_kind = p_kind and o.subject_id = p_subject)
     and not (p_kind = 'guarantee_claim'
              and exists (select 1 from public.chargeback_hold_claim_overrides g where g.claim_id = p_subject));
$function$;
revoke all on function private.chargeback_hold_blocks(text, uuid, uuid) from public, anon, authenticated;

-- 1. Deciding to pay: the live body, with the payout rule on approve.
create or replace function public.admin_decide_guarantee_claim(p_claim uuid, p_decision text, p_amount_minor bigint default null::bigint, p_reason text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  c public.guarantee_claims%rowtype;
  ag public.deal_agreements%rowtype;
  paid bigint;
  claimed bigint;
  balance bigint;
  cap bigint;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'reject' and (reason is null or length(reason) < 10) then
    return jsonb_build_object('status', 'reason_required');
  end if;
  perform pg_advisory_xact_lock(hashtext('vallo.guarantee_reserve'));
  select * into c from public.guarantee_claims where id = p_claim for update;
  if c.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if c.status <> 'submitted' then
    return jsonb_build_object('status', 'already_decided', 'claim_status', c.status);
  end if;
  select * into ag from public.deal_agreements where id = c.agreement_id;
  if actor in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'own_claim');
  end if;
  if p_decision = 'reject' then
    update public.guarantee_claims set status = 'rejected', decided_by = actor, decided_at = now(),
           decision_reason = reason where id = c.id;
  else
    -- THE PAYOUT RULE: a claimant with a lost chargeback still owed is not
    -- paid from the Guarantee unless finance overrode this one claim.
    if private.chargeback_hold_blocks('guarantee_claim', c.id, c.claimant_id) then
      perform private.chargeback_hold_refused('guarantee_claim', c.id, c.claimant_id, 'guarantee_claim_approve');
      return jsonb_build_object('status', 'chargeback_hold');
    end if;
    select coalesce(sum(t.amount_minor), 0) into paid
      from public.transactions t where t.booking_id = c.booking_id and t.status = 'SUCCESSFUL';
    select coalesce(sum(g.approved_minor), 0) into claimed
      from public.guarantee_claims g where g.booking_id = c.booking_id and g.status in ('approved', 'paid');
    balance := private.guarantee_reserve_balance();
    cap := least(c.requested_minor, paid - claimed, balance);
    if p_amount_minor is null or p_amount_minor <= 0 then
      return jsonb_build_object('status', 'bad_amount');
    end if;
    if p_amount_minor > cap then
      return jsonb_build_object('status', 'over_cap', 'cap_minor', greatest(cap, 0),
                                'requested_minor', c.requested_minor, 'booking_left_minor', paid - claimed,
                                'reserve_minor', balance);
    end if;
    update public.guarantee_claims set status = 'approved', approved_minor = p_amount_minor, decided_by = actor,
           decided_at = now(), decision_reason = reason where id = c.id;
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, claim_id, note, created_by)
    values ('out', 'claim_payout', p_amount_minor, c.booking_id, c.id, reason, actor);
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'guarantee_claim.' || p_decision, 'guarantee_claim', c.id::text,
          jsonb_build_object('amount_minor', p_amount_minor, 'reason', reason));
  perform private.notify(c.claimant_id, 'booking',
    case when p_decision = 'approve' then 'Guarantee claim approved' else 'Guarantee claim not approved' end,
    case when p_decision = 'approve'
         then 'Vallo approved ' || 'NGN ' || to_char(p_amount_minor::numeric / 100, 'FM999,999,999,990.00')
              || ' from the Vallo Guarantee. It will be paid to your bank account and you will be told when it is sent.'
         else 'Vallo did not approve this claim: ' || reason end,
    '/agreements/' || c.agreement_id::text);
  perform private.email_outbox_enqueue(c.claimant_id, 'guarantee.claim_decided',
    'guarantee.claim_decided:' || c.id::text,
    jsonb_build_object('claim_id', c.id, 'agreement_id', c.agreement_id, 'decision', p_decision,
                       'amount_minor', p_amount_minor, 'reason', reason));
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- 2. Marking paid: the live body, with the payout rule.
create or replace function public.admin_mark_guarantee_claim_paid(p_claim uuid, p_bank_reference text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  c public.guarantee_claims%rowtype;
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if coalesce(length(btrim(p_bank_reference)), 0) < 4 then
    return jsonb_build_object('status', 'reference_required');
  end if;
  select * into c from public.guarantee_claims where id = p_claim for update;
  if c.id is null or c.status <> 'approved' then
    return jsonb_build_object('status', 'not_approved');
  end if;
  -- THE PAYOUT RULE, as on approve: finance overrides one claim, or it waits.
  if private.chargeback_hold_blocks('guarantee_claim', c.id, c.claimant_id) then
    perform private.chargeback_hold_refused('guarantee_claim', c.id, c.claimant_id, 'guarantee_claim_mark_paid');
    return jsonb_build_object('status', 'chargeback_hold');
  end if;
  update public.guarantee_claims set status = 'paid', paid_reference = btrim(p_bank_reference),
         paid_at = now(), paid_by = actor where id = c.id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'guarantee_claim.paid', 'guarantee_claim', c.id::text,
          jsonb_build_object('reference', btrim(p_bank_reference), 'amount_minor', c.approved_minor));
  perform private.notify(c.claimant_id, 'booking', 'Guarantee payment sent',
    'NGN ' || to_char(c.approved_minor::numeric / 100, 'FM999,999,999,990.00')
      || ' from the Vallo Guarantee was sent to your bank. Reference ' || btrim(p_bank_reference) || '.',
    '/agreements/' || c.agreement_id::text);
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- 3. The finance override, now for one Guarantee claim too.
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
  if p_kind not in ('arrangement', 'rewards_payout', 'guarantee_claim') then return jsonb_build_object('status', 'bad_kind'); end if;
  if reason is null or length(reason) < 12 then return jsonb_build_object('status', 'reason_required'); end if;
  if length(reason) > 1000 then return jsonb_build_object('status', 'reason_too_long'); end if;
  if p_kind = 'arrangement' then
    select * into a from public.provider_arrangements where id = p_subject for update;
    lister := a.seller_user_id;
  elsif p_kind = 'rewards_payout' then
    select member_id into lister from public.rewards_payouts where id = p_subject for update;
  else
    select claimant_id into lister from public.guarantee_claims
     where id = p_subject and status in ('submitted', 'approved') for update;
  end if;
  if lister is null then return jsonb_build_object('status', 'not_found'); end if;
  if lister = actor then return jsonb_build_object('status', 'own_hold'); end if;
  if not public.lister_chargeback_hold(lister) then return jsonb_build_object('status', 'not_held'); end if;
  if p_kind = 'guarantee_claim' then
    insert into public.chargeback_hold_claim_overrides (claim_id, lister_user_id, reason, actor_id)
    values (p_subject, lister, reason, actor)
    on conflict (claim_id) do nothing
    returning id into v_override;
  else
    insert into public.chargeback_hold_overrides (subject_kind, subject_id, lister_user_id, reason, actor_id)
    values (p_kind, p_subject, lister, reason, actor)
    on conflict (subject_kind, subject_id) do nothing
    returning id into v_override;
  end if;
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
revoke all on function public.admin_chargeback_hold_override(text, uuid, text) from public, anon;
grant execute on function public.admin_chargeback_hold_override(text, uuid, text) to authenticated;
