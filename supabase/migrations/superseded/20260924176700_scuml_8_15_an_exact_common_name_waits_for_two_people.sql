/*
 * SCUML ITEMS 8 AND 15: AN EXACT MATCH ON COMMON NAMES ONLY WAITS FOR TWO
 * PEOPLE, LIKE A CLOSE ONE.
 *
 * Builds on 20260924176600, which made the risk hook answer true for a
 * confirmed match or an open exact one.
 *
 * THE LEAD'S DECISION. An exact match on a listing made only of names common
 * in Nigeria ("Muhammad Yusuf", "Ibrahim Musa Garba") says little about who
 * the person is: thousands carry exactly that name. Until two people confirm
 * it, it is treated like a close match:
 *   - the matcher marks it `common_name = true` (apps/web/src/lib/compliance/
 *     sanctions/match.ts), so the desk lists it under "common name, check
 *     identifiers" with the other common-name matches;
 *   - `private.sanctions_hit_for` does not count it while it is open, so it
 *     never makes a person high risk, and so never blocks a listing going
 *     live or a payout or bank account change, on a name alone.
 * Once confirmed by two people it counts like any confirmed match.
 *
 * THE HOOK FROM HERE ON (item 15 reads it this way):
 *   - TRUE  when a match is CONFIRMED, or an OPEN match is EXACT and not a
 *           common-name match;
 *   - FALSE when the person has been screened and neither holds;
 *   - NULL  when the person has never been screened.
 *
 * The matcher also decides "exact" on the whole normalised name from this
 * commit on (short tokens are dropped for fuzzy scoring only), so "Iyad
 * Ghali" against "Iyad Ag Ghali" is a close match, not an exact one. That is
 * code, not SQL; it is named here because exact is what this hook reads.
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
                    and (h.status = 'confirmed'
                         or (h.status = 'open' and h.match_kind = 'exact' and not h.common_name))) then true
    when exists (select 1 from public.sanctions_screenings s
                  where s.person_id = p_user and s.outcome in ('clear', 'exact', 'fuzzy')) then false
    else null::boolean
  end;
$$;
revoke all on function private.sanctions_hit_for(uuid) from public, anon, authenticated;

do $$
begin
  if has_function_privilege('authenticated', 'private.sanctions_hit_for(uuid)', 'EXECUTE') then
    raise exception 'SCUML item 15: the sanctions hook is callable by a member';
  end if;
end
$$;
