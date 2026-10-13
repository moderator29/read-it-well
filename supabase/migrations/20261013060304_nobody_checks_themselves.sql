-- Applied 13 October 2026 (part 2 of 2). Nobody records a check on their own verification ladder.
-- 2. NOBODY RECORDS A CHECK ON THEIR OWN LADDER.
--
--    The application (`agent_applications_01_no_self_review`), every listing
--    and every document (`review_kyc_document`'s own_document branch) refuse
--    their own reviewer. `agent_verification_checks` had no such guard, so a
--    member of staff who is also an agent could pass their own rungs from
--    /admin/agents and raise the tier guests read. The console action now
--    refuses it (apps/web/src/lib/admin/verification-actions.ts); this holds
--    the same rule on the write itself, whoever the caller is. Automated
--    checks (the payout name match, the vNIN check) record with a null
--    decider and are not affected.
--

set lock_timeout = '5s';
create or replace function private.refuse_self_check()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  subject uuid;
begin
  -- An automated check records no decider, and a row whose decider and time
  -- are unchanged is not a new decision.
  if new.decided_by is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.decided_by is not distinct from old.decided_by
     and new.decided_at is not distinct from old.decided_at then
    return new;
  end if;
  select a.user_id into subject from public.agents a where a.id = new.agent_id;
  if subject is not null and subject = new.decided_by then
    raise exception 'Nobody records a check on their own verification. Leave it for another reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.refuse_self_check() from public, anon, authenticated;

create or replace trigger agent_verification_checks_01_no_self_check
  before insert or update on public.agent_verification_checks
  for each row execute function private.refuse_self_check();
