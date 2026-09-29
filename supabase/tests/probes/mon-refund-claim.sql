-- MON: one charge is refunded to the card once. Before any refund reaches
-- Paystack the caller takes a claim (public.claim_card_refund); the webhook,
-- the payer's return and the reconciliation sweep all go through it, so when
-- two of them are told "refund-due" for the same charge only the first may
-- call Paystack. A refusal (failed) may be claimed again; a submitted refund
-- or one with no answer (unknown) never may; the doors are service_role only.
-- Rolls back.
do $$
declare
  k  constant text := 'charge:probe-refund-claim-1';
  k2 constant text := 'booking_refund:probe-refund-claim-2';
  r jsonb; s jsonb;
begin
  -- API roles cannot take or settle a claim, or read the table.
  if has_function_privilege('authenticated', 'public.claim_card_refund(text, text, bigint, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_card_refund(text, text, bigint, text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.settle_card_refund_claim(text, text, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.settle_card_refund_claim(text, text, text)', 'EXECUTE')
     or has_table_privilege('authenticated', 'private.card_refund_claims', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'PROBE_FAIL mon-refund-claim: an API role can reach the refund claim';
  end if;

  set local role service_role;

  -- The webhook takes the claim; the verify path, arriving second, is refused.
  r := public.claim_card_refund(k, 'probe-refund-claim-1', null, 'already_paid');
  if (r ->> 'claimed')::boolean is not true then raise exception 'PROBE_FAIL mon-refund-claim: first claim %', r; end if;
  r := public.claim_card_refund(k, 'probe-refund-claim-1', null, 'already_paid');
  if (r ->> 'claimed')::boolean or r ->> 'state' <> 'claimed' then
    raise exception 'PROBE_FAIL mon-refund-claim: a second caller took a live claim %', r;
  end if;

  -- Paystack accepted it: nobody may claim it again.
  s := public.settle_card_refund_claim(k, 'submitted', '4242');
  if s ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL mon-refund-claim: settle %', s; end if;
  r := public.claim_card_refund(k, 'probe-refund-claim-1', null, 'already_paid');
  if (r ->> 'claimed')::boolean or r ->> 'state' <> 'submitted' or r ->> 'processor_refund_id' <> '4242' then
    raise exception 'PROBE_FAIL mon-refund-claim: a submitted refund was claimed again %', r;
  end if;
  -- A settled claim cannot be settled again (a late answer cannot rewrite it).
  s := public.settle_card_refund_claim(k, 'failed', null);
  if s ->> 'status' <> 'not_claimed' then raise exception 'PROBE_FAIL mon-refund-claim: resettled %', s; end if;

  -- Paystack refused a part refund: it may be tried again, once at a time.
  r := public.claim_card_refund(k2, 'probe-refund-claim-2', 5000, 'goodwill');
  if (r ->> 'claimed')::boolean is not true then raise exception 'PROBE_FAIL mon-refund-claim: part claim %', r; end if;
  s := public.settle_card_refund_claim(k2, 'failed', null);
  r := public.claim_card_refund(k2, 'probe-refund-claim-2', 5000, 'goodwill');
  if (r ->> 'claimed')::boolean is not true or (r ->> 'attempt')::int <> 2 then
    raise exception 'PROBE_FAIL mon-refund-claim: a refused refund could not be retried %', r;
  end if;
  r := public.claim_card_refund(k2, 'probe-refund-claim-2', 5000, 'goodwill');
  if (r ->> 'claimed')::boolean then raise exception 'PROBE_FAIL mon-refund-claim: the retry was claimed twice'; end if;

  -- No answer from Paystack: it may have gone through, so it is never retried blind.
  s := public.settle_card_refund_claim(k2, 'unknown', null);
  r := public.claim_card_refund(k2, 'probe-refund-claim-2', 5000, 'goodwill');
  if (r ->> 'claimed')::boolean or r ->> 'state' <> 'unknown' then
    raise exception 'PROBE_FAIL mon-refund-claim: an unknown outcome was claimed again %', r;
  end if;

  reset role;
  raise exception 'PROBE_OK mon-refund-claim';
end
$$;
