-- Two admin actions that could not be called from anywhere.
--
-- private.set_fee_rate and private.review_kyc_document were written in the
-- private schema, which is right for anything the platform calls internally
-- and wrong for anything a console calls. PostgREST exposes public only, so a
-- server action reaching for either got PGRST202 and the fee controls and the
-- KYC queue had no way to do their one job.
--
-- The wrappers are public and take one argument fewer, because the acting admin
-- is auth.uid() rather than something the caller states. That is the same
-- decision public.escrow_admin_resolve already made and for the same reason: a
-- function that let the caller name which admin was acting would put the name
-- on the audit entry under the caller's control, and an audit trail somebody
-- can write their colleague's name into is not an audit trail.
--
-- The private functions keep their acting_admin argument, because the platform
-- itself calls them with no session: private.verify_payout_account records a
-- rung with a null actor when Paystack, rather than a person, did the checking.

begin;

create or replace function public.set_fee_rate(
  p_kind public.fee_kind,
  p_basis_points integer,
  p_flat_minor bigint,
  p_effective_from timestamptz,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  -- The role check happens inside private.set_fee_rate too. Stated here as
  -- well so this wrapper is safe to read on its own.
  if not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return private.set_fee_rate(actor, p_kind, p_basis_points, p_flat_minor, p_effective_from, p_note);
end;
$$;

comment on function public.set_fee_rate is
  'Insert a new platform rate. The acting admin is auth.uid() and is never an argument, so the audit entry cannot be written under somebody else''s name.';

create or replace function public.review_kyc_document(
  p_document uuid,
  p_approve boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return private.review_kyc_document(actor, p_document, p_approve, p_reason);
end;
$$;

comment on function public.review_kyc_document is
  'Approve or reject one verification document. Rejecting requires a reason, refused here, in the private function, and by a check constraint on the table.';

revoke all on function public.set_fee_rate(public.fee_kind, integer, bigint, timestamptz, text)
  from public, anon;
revoke all on function public.review_kyc_document(uuid, boolean, text) from public, anon;
grant execute on function public.set_fee_rate(public.fee_kind, integer, bigint, timestamptz, text)
  to authenticated;
grant execute on function public.review_kyc_document(uuid, boolean, text) to authenticated;

commit;
