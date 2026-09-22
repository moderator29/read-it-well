/*
 * THE ADMIN RULING: TWENTY CHARACTERS, AND VERBATIM TO BOTH SIDES.
 *
 * Three faults in `public.escrow_admin_resolve` as it stands.
 *
 * ONE. THE NOTIFICATION SAYS "escrow", which is the one word this feature's
 * copy rules ban outright: it is a legal term of art that means something
 * specific and unproven about who holds the money, and it is not a word
 * anybody uses about their own naira. It also contradicts
 * `lib/legal/terms.tsx`, which already tells a reader Vallo does not hold
 * their money, and it is the reason the `escrow-hold` brand mark is cut and
 * deliberately withheld.
 *
 * TWO. IT LINKS TO /wallet. A person told a decision has been made wants the
 * decision, not their balance. The agreement has a page and it has the
 * reasons on it.
 *
 * THREE. FOUR CHARACTERS IS NOT A RULING. The existing floor accepts "yes."
 * as a reason for moving somebody else's money between two people who
 * disagree. T-14 asks for twenty, which is roughly a short sentence, and a
 * short sentence is the least an operator owes two people who both believe
 * they are right. It is checked in the function as well as in the server
 * action, because the action is a convenience and the function is the rule.
 *
 * WHAT IS NOT CHANGED. The grant to `authenticated` stays, and that is
 * correct rather than an oversight: an admin IS an authenticated user, and
 * this function guards itself on the role at its own boundary, which is the
 * estate's own pattern. The research file records it as a separate finding
 * from F-2 for exactly this reason.
 *
 * THE RULING REACHES BOTH PARTIES WORD FOR WORD, which it already did and
 * which is restated here because it is the property most likely to be
 * "improved" later by summarising it for one side.
 */

create or replace function public.escrow_admin_resolve(
  p_escrow uuid,
  p_direction text,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  e public.escrows;
  outcome jsonb;
  ruling text;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  ruling := btrim(coalesce(p_note, ''));
  if char_length(ruling) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into e from public.escrows where id = p_escrow;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state <> 'DISPUTED' then
    return jsonb_build_object('status', 'not_disputed', 'state', e.state);
  end if;

  outcome := private.escrow_settle(e.id, p_direction, 'RESOLVED', actor, ruling);

  /*
   * WORD FOR WORD, TO BOTH. An operator's reasons summarised for one party
   * and quoted to the other is how a decision becomes an argument, and the
   * party who got the summary is always the one who lost.
   */
  perform private.notify(
    e.payer_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);
  perform private.notify(
    e.payee_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);

  return outcome;
end;
$$;

/*
 * The grant to `authenticated` is restated rather than revoked, because
 * `create or replace` preserves grants and a reader should not have to know
 * that to be sure. anon never had it and never gets it.
 */
revoke all on function public.escrow_admin_resolve(uuid, text, text) from public, anon;
grant execute on function public.escrow_admin_resolve(uuid, text, text) to authenticated, service_role;

do $$
begin
  if has_function_privilege('anon', 'public.escrow_admin_resolve(uuid,text,text)', 'EXECUTE') then
    raise exception 'escrow_admin_resolve is reachable by anon';
  end if;
  if not has_function_privilege('authenticated', 'public.escrow_admin_resolve(uuid,text,text)', 'EXECUTE') then
    raise exception 'escrow_admin_resolve lost the grant the admin console needs';
  end if;
  if position('escrow''' in pg_get_functiondef('public.escrow_admin_resolve(uuid,text,text)'::regprocedure)) > 0 then
    raise exception 'The banned word is back in a sentence a person reads.';
  end if;
end;
$$;
