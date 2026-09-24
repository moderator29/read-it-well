/*
 * SCUML ITEMS 8 AND 15: ONLY A DECIDED OR EXACT MATCH MOVES A PERSON'S RISK
 * CLASS.
 *
 * Builds on 20260924175100 and 175200 (item 15, risk classification) and on
 * 20260924176000 to 176500 (item 8, sanctions screening).
 *
 * THE HOOK'S CONTRACT, AS THE LEAD DECIDED IT. 175100 left
 * `private.sanctions_hit_for(p_user)` to this desk, described as "true when a
 * sanctions match on this person is open or confirmed". 176500 filled it
 * that way, and that was wrong: `classifyRisk` reads true as high, and a high
 * class makes `private.edd_clear_for` refuse a listing going live or a payout
 * or bank account change. An unreviewed close match (fuzzy, or resting on
 * common names) would then change what a member can do on a name alone,
 * which the brief forbids, and which tells them something is under review.
 * From here the hook answers:
 *   - TRUE  when a match on the person is CONFIRMED (two people decided it),
 *           or an OPEN match is EXACT (the whole normalised name is on a
 *           list);
 *   - FALSE when the person has been screened and neither holds (an open
 *           fuzzy or common-name match included: it never changes the
 *           class until two people confirm it);
 *   - NULL  when the person has never been screened (stored as unknown,
 *           never as clear, as 175100 said).
 * Item 15 reads the factor this way from this migration on.
 *
 * RE-CLASSED ON THE NEXT RUN, NOT IN THREE YEARS. `risk_people_due` now also
 * picks up anyone with a sanctions match, and is due when, since their class
 * was set, a decision on one of their matches was approved (confirmed,
 * cleared or released) or an exact match was raised. Everything else in it
 * is as 175200 left it.
 */

set local lock_timeout = '5s';

create or replace function private.sanctions_hit_for(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user is null then null::boolean
    when exists (select 1 from public.sanctions_hits h
                  where h.person_id = p_user
                    and (h.status = 'confirmed' or (h.status = 'open' and h.match_kind = 'exact'))) then true
    when exists (select 1 from public.sanctions_screenings s
                  where s.person_id = p_user and s.outcome in ('clear', 'exact', 'fuzzy')) then false
    else null::boolean
  end;
$$;
revoke all on function private.sanctions_hit_for(uuid) from public, anon, authenticated;

create or replace function public.risk_people_due(p_limit int)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select a.user_id as uid from public.agents a where not a.is_demo
    union select d.user_id from public.pep_declarations d
    union select f.user_id from public.pep_flags f
    union select b.guest_id from public.transactions t join public.bookings b on b.id = t.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select rp.tenant_id from public.rent_payments rp
            join public.transactions t on t.booking_id = rp.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select rp.lister_id from public.rent_payments rp
            join public.transactions t on t.booking_id = rp.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select e.payer_id from public.escrows e where e.funded_at > now() - interval '90 days'
    union select e.payee_id from public.escrows e where e.funded_at > now() - interval '90 days'
    union select w.user_id from public.wallet_entries we join public.wallets w on w.id = we.wallet_id
           where we.created_at > now() - interval '90 days'
    /* SCUML item 8: anyone a sanctions match was raised on. */
    union select h.person_id from public.sanctions_hits h
  )
  select p.uid
    from people p
    left join lateral (
      select r.set_at, r.review_due_at, r.source from public.risk_classes r
       where r.user_id = p.uid and private.risk_row_in_force(r.id, r.needs_approval)
       order by r.set_at desc, r.id desc limit 1
    ) cur on true
   where p.uid is not null
     and exists (select 1 from auth.users u where u.id = p.uid)
     and (
       cur.set_at is null
       or cur.review_due_at <= now()
       /* An override is re-derived every run, so a higher derived class lands. */
       or cur.source = 'override'
       or exists (select 1 from public.pep_declarations d where d.user_id = p.uid and d.declared_at > cur.set_at)
       or exists (select 1 from public.pep_flags f where f.user_id = p.uid and f.set_at > cur.set_at)
       or exists (select 1 from public.pep_clear_approvals c join public.pep_flags f on f.id = c.flag_id
                   where f.user_id = p.uid and c.approved_at > cur.set_at)
       or exists (select 1 from public.reports r
                   where r.target_type in ('user', 'profile') and r.target_id = p.uid::text
                     and greatest(r.created_at, coalesce(r.resolved_at, r.created_at)) > cur.set_at)
       /* A sanctions decision approved (confirmed, cleared, released), or an
          exact match raised, since the class was set. */
       or exists (select 1 from public.sanctions_hit_decisions sd
                    join public.sanctions_hits h on h.id = sd.hit_id
                   where h.person_id = p.uid and sd.approved_at > cur.set_at)
       or exists (select 1 from public.sanctions_hits h
                   where h.person_id = p.uid and h.match_kind = 'exact' and h.created_at > cur.set_at)
     )
   order by cur.set_at nulls first
   limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.risk_people_due(int) from public, anon, authenticated;
grant execute on function public.risk_people_due(int) to service_role;

/* Readback. */
do $$
begin
  if has_function_privilege('authenticated', 'private.sanctions_hit_for(uuid)', 'EXECUTE') then
    raise exception 'SCUML item 15: the sanctions hook is callable by a member';
  end if;
  if has_function_privilege('authenticated', 'public.risk_people_due(int)', 'EXECUTE') then
    raise exception 'SCUML item 15: risk_people_due is callable by a member';
  end if;
end
$$;
