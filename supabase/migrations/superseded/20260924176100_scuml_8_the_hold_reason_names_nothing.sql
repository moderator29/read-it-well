/*
 * SCUML ITEMS 8 AND 6: THE HOLD'S REASON CODE NAMES NOTHING. No tipping off.
 *
 * A member can read their own `account_money_holds` row (RLS, for the
 * wallet's notice) and gets its reason back from `report_not_me`. A reason
 * code of `compliance_review` therefore told a person under review that they
 * were under review, which the Money Laundering (Prevention and Prohibition)
 * Act 2022 forbids.
 *
 * The one code staff holds write is `plain`: no review, no compliance, no
 * staff. It is shared with the STR hold (SCUML item 6, builder 3), so the two
 * are indistinguishable to the member and to each other. The app maps `plain`
 * to neutral copy with no cause and no date (`account-hold.ts`,
 * `not-me-copy.ts`). Only `sanctions_hit_approve` changes here; the
 * two-person rule and everything else in 20260924176000 stands.
 */

create or replace function public.sanctions_hit_approve(p_decision uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_d public.sanctions_hit_decisions%rowtype;
  v_hit public.sanctions_hits%rowtype;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_d from public.sanctions_hit_decisions d where d.id = p_decision for update;
  if not found or v_d.approved_by is not null then return jsonb_build_object('status', 'not_pending'); end if;
  if v_d.proposed_by = v_me then return jsonb_build_object('status', 'own_proposal'); end if;
  select * into v_hit from public.sanctions_hits h where h.id = v_d.hit_id for update;
  if v_hit.status <> 'open' then return jsonb_build_object('status', 'not_open'); end if;

  update public.sanctions_hit_decisions set approved_by = v_me, approved_at = now() where id = p_decision;
  update public.sanctions_hits
     set status = case when v_d.decision = 'confirm' then 'confirmed' else 'cleared' end, decided_at = now()
   where id = v_hit.id;

  if v_d.decision = 'confirm' then
    /* The freeze: the audit's own hold, which its triggers enforce (RM050),
       under the reason code that names nothing. */
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (v_hit.person_id, now() + interval '10 years', 'plain', now())
    on conflict (user_id) do update
      set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
          reason = 'plain';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.' || case when v_d.decision = 'confirm' then 'confirmed' else 'cleared' end,
          'sanctions_hit', v_hit.id::text,
          jsonb_build_object('decision_id', p_decision, 'proposed_by', v_d.proposed_by, 'scuml_item', 8,
                             'hold_placed', v_d.decision = 'confirm'));
  return jsonb_build_object('status', 'ok', 'decision', v_d.decision, 'personId', v_hit.person_id);
end;
$$;
revoke all on function public.sanctions_hit_approve(uuid) from public, anon;
grant execute on function public.sanctions_hit_approve(uuid) to authenticated;

do $$
begin
  if position('compliance_review' in pg_get_functiondef('public.sanctions_hit_approve(uuid)'::regprocedure)) > 0 then
    raise exception 'SCUML item 8: sanctions_hit_approve still writes a reason that names the review';
  end if;
end
$$;
