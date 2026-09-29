-- Found 29 September 2026 by the native release audit, confirmed as a bug by
-- the founder the same day.
--
-- ONE CHARGE COULD BE REFUNDED TO THE CARD TWICE. A charge the settlement
-- cannot apply is marked FAILED, and a FAILED attempt is re-evaluated when it
-- is settled again, by design, so the webhook, the payer's return (verify)
-- and the reconciliation sweep can each be told "refund-due" for the same
-- reference. Each then called Paystack's refund endpoint. The attempt is only
-- marked REFUNDED after Paystack answers, so two paths arriving together both
-- got through, and Paystack accepts a second full refund while the first is
-- still pending.
--
-- Every refund now takes a claim first, in its own committed transaction,
-- immediately before Paystack is called, and only the caller that took the
-- claim may call it:
--   a whole charge is claimed as 'charge:<reference>'
--   an admin-decided part refund is claimed as 'booking_refund:<row id>'
-- The claim is an INSERT on the key, so two callers cannot both take it.
-- What Paystack answered is written back to the claim:
--   submitted  Paystack took it                          never claimable again
--   unknown    no answer (MON-01); it may have gone through  never claimable
--              again: a person checks Paystack first (an alert is raised)
--   failed     Paystack refused it outright               claimable again, so
--              a retry from the admin desk or the sweep is still possible
-- A claim left 'claimed' (the process died between claim and answer) is
-- never taken over automatically; the application raises an alert for it.
--
-- The table lives in private (not exposed through the API) and the two doors
-- are for service_role only.
create table if not exists private.card_refund_claims (
  claim_key            text primary key,
  reference            text not null,
  amount_minor         bigint check (amount_minor is null or amount_minor > 0),
  reason               text not null,
  state                text not null default 'claimed'
                         check (state in ('claimed', 'submitted', 'unknown', 'failed')),
  attempts             int not null default 1,
  processor_refund_id  text,
  claimed_at           timestamptz not null default now(),
  settled_at           timestamptz
);
alter table private.card_refund_claims enable row level security;
revoke all on table private.card_refund_claims from public, anon, authenticated;
create index if not exists card_refund_claims_reference_idx on private.card_refund_claims (reference);

create or replace function public.claim_card_refund(
  p_key text, p_reference text, p_amount_minor bigint, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  got private.card_refund_claims%rowtype;
begin
  if nullif(btrim(coalesce(p_key, '')), '') is null
     or nullif(btrim(coalesce(p_reference, '')), '') is null then
    return jsonb_build_object('claimed', false, 'state', 'bad_request');
  end if;
  insert into private.card_refund_claims as c (claim_key, reference, amount_minor, reason)
  values (p_key, p_reference, p_amount_minor, coalesce(nullif(btrim(p_reason), ''), 'unspecified'))
  on conflict (claim_key) do update
     set state = 'claimed', attempts = c.attempts + 1, reason = excluded.reason,
         amount_minor = excluded.amount_minor, claimed_at = now(),
         settled_at = null, processor_refund_id = null
   where c.state = 'failed'
  returning * into got;
  if got.claim_key is not null then
    return jsonb_build_object('claimed', true, 'attempt', got.attempts);
  end if;
  select * into got from private.card_refund_claims where claim_key = p_key;
  return jsonb_build_object('claimed', false, 'state', got.state, 'claimed_at', got.claimed_at,
                            'processor_refund_id', got.processor_refund_id);
end;
$function$;

create or replace function public.settle_card_refund_claim(
  p_key text, p_state text, p_processor_refund_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n int;
begin
  if p_state not in ('submitted', 'unknown', 'failed') then
    return jsonb_build_object('status', 'bad_state');
  end if;
  update private.card_refund_claims
     set state = p_state,
         processor_refund_id = coalesce(nullif(btrim(coalesce(p_processor_refund_id, '')), ''), processor_refund_id),
         settled_at = now()
   where claim_key = p_key and state = 'claimed';
  get diagnostics n = row_count;
  return jsonb_build_object('status', case when n = 1 then 'ok' else 'not_claimed' end);
end;
$function$;

revoke all on function public.claim_card_refund(text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.settle_card_refund_claim(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_card_refund(text, text, bigint, text) to service_role;
grant execute on function public.settle_card_refund_claim(text, text, text) to service_role;
