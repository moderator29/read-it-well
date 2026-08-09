-- Four findings from the linter, all of them mine, all of them real.
--
-- Two mutable search paths, one function that did not need to be SECURITY
-- DEFINER at all, and one that a signed-out visitor could call.
--
-- 1 and 2. MUTABLE SEARCH PATH on private.escrow_transition_is_legal and
-- private.name_matches. Neither reads a table, so neither can be redirected at
-- an attacker's copy of one, which is why the linter rates this WARN rather
-- than ERROR. It is still worth closing: both are called from SECURITY DEFINER
-- functions, and a function without a pinned search_path resolves its operators
-- against the caller's path. Somebody who can create an operator in a schema
-- earlier on that path can change what `=` means inside name_matches, which is
-- a comparison this platform uses to decide whether a bank account belongs to
-- the person claiming it.
--
-- 3. public.fee_rate_at DID NOT NEED SECURITY DEFINER. It was written that way
-- out of habit. public.fee_rates already has a select policy that publishes
-- every rate to everybody, deliberately: what a marketplace charges is not a
-- secret and a pricing page that had to authenticate to say "no fee" would be
-- absurd. So the function can run as the caller, the policy answers, and the
-- definer escalation disappears rather than being justified.
--
-- 4. public.verification_is_required WAS CALLABLE BY ANON. The grant to
-- authenticated was written and the implicit grant to PUBLIC was never revoked,
-- which is the default that catches everybody: EXECUTE on a new function goes
-- to PUBLIC unless you take it away. It reads profiles.signup_role for an
-- arbitrary user id, so a signed-out caller could enumerate which accounts are
-- sellers. Not catastrophic and not something anybody should be able to do.

begin;

create or replace function private.escrow_transition_is_legal(
  from_state public.escrow_state,
  to_state public.escrow_state
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select (from_state, to_state) in (
    ('INITIATED', 'FUNDED'),
    ('FUNDED', 'HELD'),
    ('HELD', 'RELEASE_REQUESTED'),
    ('HELD', 'RELEASED'),
    ('RELEASE_REQUESTED', 'RELEASED'),
    ('HELD', 'REFUNDED'),
    ('RELEASE_REQUESTED', 'REFUNDED'),
    ('INITIATED', 'DISPUTED'),
    ('FUNDED', 'DISPUTED'),
    ('HELD', 'DISPUTED'),
    ('RELEASE_REQUESTED', 'DISPUTED'),
    ('DISPUTED', 'RESOLVED')
  );
$$;

alter function private.name_matches(text, text) set search_path = public, pg_temp;

-- SECURITY INVOKER, and the row level policy does the work it was written for.
drop function if exists public.fee_rate_at(public.fee_kind, timestamptz);
create function public.fee_rate_at(
  p_kind public.fee_kind,
  p_at timestamptz default now()
)
returns table (rate_id uuid, basis_points integer, flat_minor bigint, effective_from timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.id, r.basis_points, r.flat_minor, r.effective_from
  from public.fee_rates r
  where r.kind = p_kind
    and r.effective_from <= p_at
  order by r.effective_from desc
  limit 1;
$$;

comment on function public.fee_rate_at is
  'The rate in force for a kind at a moment. SECURITY INVOKER: fee_rates_select_all publishes every rate to everybody on purpose, so this needs no escalation to answer.';

/*
 * private.compute_fee calls fee_rate_at and is itself SECURITY DEFINER, which
 * means the call above now runs as the definer rather than as the caller. That
 * is fine and is the intended reading: an internal fee computation should see
 * the rate table whatever the session is, and the policy publishes it to
 * everybody anyway, so definer and invoker see identical rows here.
 */

revoke all on function public.verification_is_required(uuid) from public, anon;
grant execute on function public.verification_is_required(uuid) to authenticated;

commit;
