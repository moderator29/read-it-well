-- The four escrow doors are locked, and the trust numbers stop answering strangers.
--
-- Two holes, both measured against this database on 22 September 2026 and both
-- recorded in `docs/PLATFORM_SURVEY_2026-09-22.md` sections 2.2 and 2.3.
--
-- 1. `escrow_fund_from_wallet`, `escrow_confirm`, `escrow_request_release` and
--    `escrow_raise_dispute` are SECURITY DEFINER and executable by the
--    `authenticated` role, which means any signed-in person could call them
--    directly over `/rest/v1/rpc/` and move their own wallet balance into a
--    HELD state. There is no surface in the product that opens one of these and
--    none that releases one, so money entering that state had no designed way
--    out. An unguarded money path with no product behind it is a hole whatever
--    the eventual product turns out to be.
--
-- 2. `agent_trust(uuid)` is executable by `anon`, so anybody, signed out, could
--    pass ANY user id and read that person's trust score, completed deal count,
--    median reply time in minutes, review count and average rating. The product
--    shows those numbers on a public profile, but only for a profile the
--    viewer's RLS actually returned; the RPC answered for any uuid at all,
--    including a profile that is paused, blocked or otherwise not visible.
--
-- THIS IS NOT THE STOP LIST'S KIND OF REVOKE. The stop list forbids revoking
-- something somebody legitimately holds. Nothing in this product calls these
-- four functions over PostgREST, and no signed-out caller is entitled to
-- another person's trust numbers by uuid. The survey and the founder both
-- called for it.
--
-- WHAT REPLACES THEM. Each of the four keeps its exact logic, moved into an
-- `_as` sibling that takes the actor explicitly instead of reading `auth.uid()`
-- and is callable by `service_role` alone. The original stays as a one-line
-- delegate passing `auth.uid()`, so the SQL is not duplicated and a future
-- product surface has one implementation to reason about. The guarded server
-- actions in `apps/web/src/lib/escrow/actions.ts` resolve the session, rate
-- limit, and call the `_as` function with the id of the person who is actually
-- signed in.
--
-- RULE 21. Every function created here is born locked: EXECUTE is revoked from
-- `public`, `anon` and `authenticated` in this same migration, and the probe
-- proves it.
--
-- RULE 11. `escrow is promised nowhere until it operates`. These bodies wrote
-- the sentence "Held in escrow by RentMe" into `wallet_entries.metadata`, which
-- a person can read on their own statement, and told a payee that their money
-- was "held in escrow". Both are corrected here: the money is described as
-- held, which is what actually happens to it, and the dead brand is gone.

-- ---------------------------------------------------------------------------
-- 1. Funding, with the actor passed in.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_fund_from_wallet_as(
  p_actor uuid,
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
set search_path to 'public'
as $function$
declare
  payer uuid := p_actor;
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

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', p_amount_minor, btrim(p_reference), 'COMPLETED',
       jsonb_build_object(
         'note', 'Held for a transaction on Vallo',
         'escrow_id', escrow_id,
         'purpose', p_purpose,
         'payee_id', p_payee,
         'listing_id', p_listing
       ));
  exception when unique_violation then
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
    'A payment is being held for you. It reaches your wallet when both sides confirm.',
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
$function$;

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
set search_path to 'public'
as $function$
begin
  return public.escrow_fund_from_wallet_as(
    auth.uid(), p_payee, p_listing, p_purpose, p_amount_minor, p_reference, p_hold_days
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Confirming.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_confirm_as(p_actor uuid, p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := p_actor;
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
    'The other party has confirmed. The held money is paid out as soon as you confirm too.',
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
$function$;

create or replace function public.escrow_confirm(p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.escrow_confirm_as(auth.uid(), p_escrow);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Asking for a release.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_request_release_as(p_actor uuid, p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := p_actor;
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
$function$;

create or replace function public.escrow_request_release(p_escrow uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.escrow_request_release_as(auth.uid(), p_escrow);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Raising a dispute.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_raise_dispute_as(p_actor uuid, p_escrow uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := p_actor;
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
         auto_release_at = null
   where id = e.id;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'This payment is in dispute',
    'The money stays held until our team has looked at it. We will be in touch.',
    '/wallet'
  );

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'DISPUTED');
end;
$function$;

create or replace function public.escrow_raise_dispute(p_escrow uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.escrow_raise_dispute_as(auth.uid(), p_escrow, p_reason);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Born locked. Rule 21.
-- ---------------------------------------------------------------------------

revoke execute on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer) from public, anon, authenticated;
revoke execute on function public.escrow_confirm_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.escrow_request_release_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.escrow_raise_dispute_as(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer) to service_role;
grant execute on function public.escrow_confirm_as(uuid, uuid) to service_role;
grant execute on function public.escrow_request_release_as(uuid, uuid) to service_role;
grant execute on function public.escrow_raise_dispute_as(uuid, uuid, text) to service_role;

-- The four doors themselves. `service_role` keeps its grant so the delegate is
-- still reachable from the server if anything ever wants the auth.uid() form.
revoke execute on function public.escrow_fund_from_wallet(uuid, uuid, public.escrow_purpose, bigint, text, integer) from anon, authenticated;
revoke execute on function public.escrow_confirm(uuid) from anon, authenticated;
revoke execute on function public.escrow_request_release(uuid) from anon, authenticated;
revoke execute on function public.escrow_raise_dispute(uuid, text) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. The trust numbers stop answering strangers.
-- ---------------------------------------------------------------------------

/*
 * `authenticated` keeps its grant: a signed-in person reading a public profile
 * reads it through their own client. A signed-out reader now gets the numbers
 * from the server, after the profile row itself has been resolved under RLS.
 *
 * `public.platform_stats()` KEEPS its anon grant on purpose. The landing page
 * needs it, it returns four integers and never a row, and an anonymous caller
 * learns nothing that search would not tell them.
 */
revoke execute on function public.agent_trust(uuid) from anon;
