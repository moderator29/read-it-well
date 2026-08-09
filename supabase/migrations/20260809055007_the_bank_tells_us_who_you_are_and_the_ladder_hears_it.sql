-- The free verification rung, reachable from the server.
--
-- private.verify_payout_account does the work: it stores what the bank says
-- the account is called, compares it with the identity name, and records the
-- payout rung as passed on a match or pending on a near miss. It lives in
-- private, so nothing over HTTP can call it.
--
-- THIS WRAPPER IS GRANTED TO service_role AND TO NOBODY ELSE, and that is the
-- whole security design of the rung. The resolved name is the evidence. If an
-- agent's own session could call this and pass a name, the rung would verify
-- nothing at all: somebody would send their own identity name as the bank's
-- answer and pass instantly. The name has to come from Paystack, inside the
-- same server action that asked Paystack, and the only actor that can carry it
-- here is the server.
--
-- The agent's own client keeps writing the payout account itself, under its own
-- RLS policy, exactly as it did. This is the one step that needs a privilege
-- the browser must not have, and it is separated so that stays visible.

begin;

create or replace function public.verify_payout_account(
  p_account uuid,
  p_resolved_name text,
  p_identity_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return private.verify_payout_account(p_account, p_resolved_name, p_identity_name);
end;
$$;

comment on function public.verify_payout_account is
  'Record what the bank says a payout account is called and move the payout rung from it. Granted to service_role only: the resolved name is the evidence, so it must arrive from the server that asked Paystack rather than from a session that could invent it.';

revoke all on function public.verify_payout_account(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.verify_payout_account(uuid, text, text) to service_role;

commit;
