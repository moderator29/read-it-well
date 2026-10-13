-- D40: A BOOKING REFUND REACHES EVERY CARD THAT PAID FOR THE BOOKING.
--
-- A booking can carry several successful charges, one per flatmate sharing it
-- (transactions_one_share_success_per_payer). The admin desk refunded the
-- newest charge, so a flatmate booking's refund went to whichever flatmate
-- paid last. The admin decides a refund for the BOOKING; the money must go
-- back across the cards that paid it.
--
--  1. public.booking_refund_parts: the per-card plan of one booking refund,
--     PLANNED ONCE. A retry or a second admin reads the stored plan back and
--     never re-splits, so no retry can send more than was decided. Each part
--     has its own claim key and its own processor refund id.
--  2. public.plan_booking_refund: returns the stored plan, or stores the one
--     proposed, after checking it: every part is a SUCCESSFUL charge on that
--     booking, the parts sum to the refund exactly, no part exceeds its charge.
--     A row already submitted under the single-charge claim key is refused
--     (`legacy`), so nothing submitted before this change is sent twice.
--  3. public.record_refund_part: records one part's submission or refusal and
--     rolls the refund row up: submitted once every part is; failed only when
--     no part was ever sent; otherwise pending with a risk alert.
--  4. record_processor_refund_outcome (the Paystack refund webhook) now
--     settles parts by their own processor id, and rolls the refund row up:
--     processed when every part is, failed (with an alert) the moment one is.
--     The share-refund and single-charge branches are unchanged.
--  5. public.card_refund_claims_for: what each charge has already committed
--     to refunds (private.card_refund_claims), with the claim key, for the
--     server, service role only.
--
-- Single-charge bookings keep exactly today's path. Additive and idempotent;
-- no destructive statements of any kind.

set local lock_timeout = '5s';

create table if not exists public.booking_refund_parts (
  id                  uuid primary key default gen_random_uuid(),
  refund_id           uuid not null references public.booking_refunds(id),
  transaction_id      uuid not null references public.transactions(id),
  provider_ref        text not null,
  amount_minor        bigint not null check (amount_minor > 0),
  claim_key           text not null unique,
  processor_status    text not null default 'pending'
                        check (processor_status in ('pending', 'submitted', 'processed', 'failed')),
  processor_refund_id text,
  submitted_at        timestamptz,
  settled_at          timestamptz,
  created_at          timestamptz not null default now(),
  constraint booking_refund_parts_one_per_charge unique (refund_id, transaction_id)
);
create index if not exists booking_refund_parts_by_processor_id on public.booking_refund_parts (processor_refund_id)
  where processor_refund_id is not null;

alter table public.booking_refund_parts enable row level security;
revoke all on public.booking_refund_parts from public, anon, authenticated;

create or replace function public.card_refund_claims_for(p_refs text[])
returns table (reference text, amount_minor bigint, state text, claim_key text)
language sql
stable security definer
set search_path to ''
as $function$
  select c.reference, c.amount_minor::bigint, c.state::text, c.claim_key
    from private.card_refund_claims c
   where c.reference = any(p_refs);
$function$;

-- p_parts: null to read the stored plan only; otherwise
-- [{"transaction_id": uuid, "amount_minor": int}, ...] proposed for storing.
create or replace function public.plan_booking_refund(p_refund uuid, p_parts jsonb default null)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  r      public.booking_refunds%rowtype;
  p      jsonb;
  t      record;
  total  bigint := 0;
begin
  select * into r from public.booking_refunds where id = p_refund for update;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if exists (select 1 from public.booking_refund_parts bp where bp.refund_id = r.id) then
    return jsonb_build_object('status', 'existing', 'parts', (
      select jsonb_agg(jsonb_build_object('id', bp.id, 'transaction_id', bp.transaction_id, 'provider_ref', bp.provider_ref,
                                          'amount_minor', bp.amount_minor, 'claim_key', bp.claim_key,
                                          'processor_status', bp.processor_status) order by bp.created_at, bp.id)
        from public.booking_refund_parts bp where bp.refund_id = r.id));
  end if;
  if p_parts is null then
    return jsonb_build_object('status', 'none');
  end if;
  if exists (select 1 from private.card_refund_claims c where c.claim_key = 'booking_refund:' || r.id::text and c.state <> 'failed') then
    return jsonb_build_object('status', 'legacy');
  end if;
  if jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) = 0 then
    return jsonb_build_object('status', 'bad_plan');
  end if;

  for p in select * from jsonb_array_elements(p_parts) loop
    select tx.id, tx.provider_ref, tx.amount_minor into t
      from public.transactions tx
     where tx.id = (p->>'transaction_id')::uuid and tx.booking_id = r.booking_id and tx.status = 'SUCCESSFUL';
    -- Raise, never return, inside the loop: a returned refusal would keep
    -- the parts already inserted (review pass 3).
    if t.id is null or t.provider_ref is null then
      raise exception 'plan_booking_refund: a part is not a successful charge of this booking'
        using errcode = 'check_violation';
    end if;
    if (p->>'amount_minor')::bigint is null or (p->>'amount_minor')::bigint <= 0 or (p->>'amount_minor')::bigint > t.amount_minor then
      raise exception 'plan_booking_refund: a part amount is outside its charge' using errcode = 'check_violation';
    end if;
    total := total + (p->>'amount_minor')::bigint;
    insert into public.booking_refund_parts (refund_id, transaction_id, provider_ref, amount_minor, claim_key)
    values (r.id, t.id, t.provider_ref, (p->>'amount_minor')::bigint, 'booking_refund:' || r.id::text || ':' || t.provider_ref);
  end loop;
  if total <> r.refund_minor then
    raise exception 'plan_booking_refund: parts sum to % but the refund is %', total, r.refund_minor
      using errcode = 'check_violation';
  end if;
  return public.plan_booking_refund(p_refund, null);
end;
$function$;

-- Roll a refund row up from its parts.
create or replace function private.booking_refund_rollup(p_refund uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n_all int; n_sent int; n_processed int; n_failed int; n_pending int;
  r public.booking_refunds%rowtype;
begin
  select * into r from public.booking_refunds where id = p_refund for update;
  select count(*),
         count(*) filter (where processor_status in ('submitted', 'processed')),
         count(*) filter (where processor_status = 'processed'),
         count(*) filter (where processor_status = 'failed'),
         count(*) filter (where processor_status = 'pending')
    into n_all, n_sent, n_processed, n_failed, n_pending
    from public.booking_refund_parts where refund_id = p_refund;
  if n_all = 0 then return; end if;

  if n_processed = n_all then
    update public.booking_refunds set processor_status = 'processed', processor_settled_at = now(),
           processor_submitted_at = coalesce(processor_submitted_at, now())
     where id = p_refund and processor_status <> 'processed';
  elsif n_sent = n_all then
    update public.booking_refunds set processor_status = 'submitted', processor_submitted_at = coalesce(processor_submitted_at, now())
     where id = p_refund and processor_status in ('pending', 'failed');
  elsif n_failed > 0 and n_sent = 0 then
    -- Nothing reached any card: the row is failed, and the desk says so.
    update public.booking_refunds set processor_status = 'failed' where id = p_refund and processor_status = 'pending';
  elsif n_failed > 0
        and not exists (select 1 from public.risk_alerts a where a.entity_type = 'booking_refund' and a.entity_id = r.id::text
                         and a.status = 'open' and a.title = 'A split booking refund reached some cards and not others') then
    -- Some cards refunded, at least one refused: neither true word fits. Once.
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A split booking refund reached some cards and not others',
            format('Refund %s on booking %s: %s of %s card refunds failed. Finish it from the booking.', r.id, r.booking_id, n_failed, n_all),
            'booking_refund', r.id::text);
  end if;
end;
$function$;

create or replace function public.record_refund_part(p_part uuid, p_status text, p_processor_id text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  bp public.booking_refund_parts%rowtype;
begin
  if p_status not in ('submitted', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  select * into bp from public.booking_refund_parts where id = p_part for update;
  if bp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  update public.booking_refund_parts
     set processor_status = p_status,
         processor_refund_id = coalesce(nullif(btrim(p_processor_id), ''), processor_refund_id),
         submitted_at = case when p_status = 'submitted' then now() else submitted_at end
   where id = bp.id and processor_status in ('pending', 'failed');
  perform private.booking_refund_rollup(bp.refund_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- The Paystack refund webhook, with a parts branch ahead of the booking-refund
-- branch. Everything else is the live definition unchanged.
create or replace function public.record_processor_refund_outcome(p_processor_refund_id text, p_transaction_reference text, p_status text, p_amount_minor bigint)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r   public.booking_refunds%rowtype;
  s   public.rent_share_refunds%rowtype;
  bp  public.booking_refund_parts%rowtype;
  pid text := nullif(btrim(p_processor_refund_id), '');
  ref text := nullif(btrim(p_transaction_reference), '');
begin
  if p_status not in ('processed', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'amount_missing');
  end if;

  -- D40: a split refund part named by its own processor id is matched first,
  -- so the share-refund fallback below can never take its event.
  if pid is not null then
    select * into bp from public.booking_refund_parts where processor_refund_id = pid for update;
  end if;

  -- A flatmate's share refund: by its processor id, else by the charge's
  -- reference but only a row that has no processor id of its own when the
  -- event named one.
  if bp.id is null and pid is not null then
    select * into s from public.rent_share_refunds where processor_refund_id = pid for update;
  end if;
  if bp.id is null and s.id is null and ref is not null then
    select sr.* into s from public.rent_share_refunds sr join public.transactions t on t.id = sr.transaction_id
     where t.provider_ref = ref and (pid is null or sr.processor_refund_id is null)
     for update of sr;
  end if;
  if s.id is not null then
    if s.processor_status = p_status then
      return jsonb_build_object('status', 'already', 'share_refund_id', s.id);
    end if;
    if s.amount_minor <> p_amount_minor then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A Paystack refund event did not match the share refund''s amount',
              format('Share refund %s is %s kobo; the event said %s kobo (%s). Nothing was recorded.', s.id, s.amount_minor, p_amount_minor, p_status),
              'rent_share_refund', s.id::text);
      return jsonb_build_object('status', 'amount_mismatch', 'share_refund_id', s.id);
    end if;
    if s.processor_status not in ('pending', 'sending', 'unknown', 'submitted') then
      return jsonb_build_object('status', 'not_submitted', 'share_refund_id', s.id, 'processor_status', s.processor_status);
    end if;
    update public.rent_share_refunds
       set processor_status = p_status,
           processor_refund_id = coalesce(processor_refund_id, pid),
           processor_submitted_at = coalesce(processor_submitted_at, now()),
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

  -- D40: one card's part of a split booking refund, by its own processor id,
  -- else by the charge's reference and exact amount.
  if bp.id is null and ref is not null then
    select * into bp from public.booking_refund_parts
     where provider_ref = ref and processor_status in ('pending', 'submitted') and amount_minor = p_amount_minor
       and (pid is null or processor_refund_id is null)
     order by created_at desc limit 1 for update;
  end if;
  if bp.id is not null then
    if bp.processor_status = p_status then
      return jsonb_build_object('status', 'already', 'refund_part_id', bp.id);
    end if;
    if bp.amount_minor <> p_amount_minor then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A Paystack refund event did not match a split refund part''s amount',
              format('Refund part %s is %s kobo; the event said %s kobo (%s). Nothing was recorded.', bp.id, bp.amount_minor, p_amount_minor, p_status),
              'booking_refund', bp.refund_id::text);
      return jsonb_build_object('status', 'amount_mismatch', 'refund_part_id', bp.id);
    end if;
    if bp.processor_status not in ('pending', 'submitted') then
      return jsonb_build_object('status', 'not_submitted', 'refund_part_id', bp.id, 'processor_status', bp.processor_status);
    end if;
    update public.booking_refund_parts
       set processor_status = p_status,
           processor_refund_id = coalesce(processor_refund_id, pid),
           submitted_at = coalesce(submitted_at, now()),
           settled_at = case when p_status = 'processed' then now() else settled_at end
     where id = bp.id;
    if p_status = 'failed' then
      -- The card refund failed at the processor: free its claim so the desk
      -- can retry this part (review pass 3).
      update private.card_refund_claims set state = 'failed' where claim_key = bp.claim_key and state in ('submitted', 'unknown');
      update public.booking_refunds set processor_status = 'failed' where id = bp.refund_id and processor_status <> 'failed';
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'Paystack could not complete one card''s part of a split booking refund',
              format('Refund %s, part %s (%s kobo to %s) failed at the processor. Contact that flatmate and retry.',
                     bp.refund_id, bp.id, bp.amount_minor, bp.provider_ref),
              'booking_refund', bp.refund_id::text);
    else
      perform private.booking_refund_rollup(bp.refund_id);
    end if;
    return jsonb_build_object('status', 'ok', 'refund_part_id', bp.id, 'refund_id', bp.refund_id);
  end if;

  -- A booking refund, by the same rules.
  if pid is not null then
    select * into r from public.booking_refunds where processor_refund_id = pid
     order by created_at desc limit 1 for update;
  end if;
  if r.id is null and ref is not null then
    select br.* into r from public.booking_refunds br
      join public.transactions t on t.booking_id = br.booking_id and t.provider_ref = ref
     where br.processor_status in ('pending', 'submitted')
       and br.refund_minor = p_amount_minor
       and (pid is null or br.processor_refund_id is null)
       and not exists (select 1 from public.booking_refund_parts x where x.refund_id = br.id)
     order by br.created_at desc limit 1 for update of br;
  end if;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.processor_status = p_status then
    return jsonb_build_object('status', 'already', 'refund_id', r.id);
  end if;
  if r.refund_minor <> p_amount_minor then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A Paystack refund event did not match the refund''s amount',
            format('Refund %s is %s kobo; the event said %s kobo (%s). Nothing was recorded.', r.id, r.refund_minor, p_amount_minor, p_status),
            'booking_refund', r.id::text);
    return jsonb_build_object('status', 'amount_mismatch', 'refund_id', r.id);
  end if;
  if r.processor_status not in ('pending', 'submitted') then
    return jsonb_build_object('status', 'not_submitted', 'refund_id', r.id, 'processor_status', r.processor_status);
  end if;
  update public.booking_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(processor_refund_id, pid),
         processor_submitted_at = coalesce(processor_submitted_at, now()),
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

revoke all on function public.card_refund_claims_for(text[]) from public, anon, authenticated;
revoke all on function public.plan_booking_refund(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_refund_part(uuid, text, text) from public, anon, authenticated;
grant execute on function public.card_refund_claims_for(text[]) to service_role;
grant execute on function public.plan_booking_refund(uuid, jsonb) to service_role;
grant execute on function public.record_refund_part(uuid, text, text) to service_role;

do $check$
begin
  if to_regclass('public.booking_refund_parts') is null then raise exception 'booking_refund_parts missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.booking_refund_parts'::regclass) then
    raise exception 'booking_refund_parts lacks RLS';
  end if;
  if has_table_privilege('authenticated', 'public.booking_refund_parts', 'select') then
    raise exception 'booking_refund_parts readable by members';
  end if;
  if has_function_privilege('authenticated', 'public.plan_booking_refund(uuid, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.record_refund_part(uuid, text, text)', 'execute')
     or has_function_privilege('authenticated', 'public.card_refund_claims_for(text[])', 'execute') then
    raise exception 'D40 functions callable by an app role';
  end if;
  if pg_get_functiondef('public.record_processor_refund_outcome(text, text, text, bigint)'::regprocedure) not like '%booking_refund_parts%' then
    raise exception 'the refund webhook does not settle parts';
  end if;
  perform * from public.card_refund_claims_for(array['no-such-reference']);
end;
$check$;
