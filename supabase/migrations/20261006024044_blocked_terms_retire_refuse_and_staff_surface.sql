-- BLOCKED TERMS: RETIREMENT, A HARD-REFUSAL TIER, AND A STAFF SURFACE (Session 2, 7.1).
--
-- The list is seeded (144 terms, 20260923113843). What it lacked:
--   1. No way to retire a term. A term only ever left by DELETE, losing the
--      record of why it was there. Retirement is now a recorded state and the
--      matchers ignore retired rows. Nothing is deleted.
--   2. No hard refusal. `hold` and `flag` both let the write land. `refuse`
--      makes the write fail, and a term may only carry it with a written
--      `refusal_reason` (12+ characters), because refusing speech outright is
--      a heavier act than holding it for a person to read.
--   3. No staff surface. The table has no staff read (AR-11 in the moderation
--      desk) and no add or retire path. Three functions, gated on the
--      `moderation` scope, each writing an audit_log row.
--
-- A refusal applies only to a MEMBER's own write (private.content_writer_is_member).
-- Staff, reviewers and the system are never refused: for them a refuse term
-- reads as `hold`, so a takedown of the very content a term targets, a staff
-- fix to a profile, and a system-sent message all still go through (review
-- pass 1, finding 1). `refuse` is allowed only on `abuse.*` terms, because
-- the review scanner's policy is that scam wording is published and the desk
-- told, never silently refused (finding 2).
--
-- Behaviour today is unchanged: no row is `refuse` and none is retired, so
-- every matcher returns what it returned before. Additive and idempotent.

set local lock_timeout = '5s';

alter table public.blocked_terms
  add column if not exists refusal_reason text,
  add column if not exists added_by uuid references auth.users(id) on delete set null,
  add column if not exists retired_at timestamptz,
  add column if not exists retired_by uuid references auth.users(id) on delete set null,
  add column if not exists retired_reason text;

alter table public.blocked_terms drop constraint if exists blocked_terms_action_is_known;
alter table public.blocked_terms
  add constraint blocked_terms_action_is_known check (action = any (array['hold', 'flag', 'refuse']));

alter table public.blocked_terms drop constraint if exists blocked_terms_refusal_is_reasoned;
alter table public.blocked_terms
  add constraint blocked_terms_refusal_is_reasoned
  check (action <> 'refuse' or (category like 'abuse.%' and length(btrim(coalesce(refusal_reason, ''))) >= 12));

alter table public.blocked_terms drop constraint if exists blocked_terms_retirement_is_whole;
alter table public.blocked_terms
  add constraint blocked_terms_retirement_is_whole
  check ((retired_at is null and retired_reason is null)
      or (retired_at is not null and length(btrim(coalesce(retired_reason, ''))) >= 12));

-- The matchers read live terms only.
create or replace function private.blocked_pattern(p_action text, p_scope text default null)
returns text
language sql
stable security definer
set search_path to ''
as $function$
  select case
    when count(*) = 0 then null
    else '\m(' || string_agg(replace(b.term, ' ', ' ?'), '|' order by length(b.term) desc) || ')\M'
  end
  from public.blocked_terms b
  where b.action = p_action
    and b.retired_at is null
    and (p_scope is null or b.category like p_scope || '.%');
$function$;

create or replace function private.objectionable_pattern()
returns text
language sql
stable security definer
set search_path to ''
as $function$
  select case
    when count(*) = 0 then null
    else '\m(' || string_agg(b.term, '|') || ')\M'
  end
  from public.blocked_terms b
  where b.retired_at is null;
$function$;

-- `refuse` is checked first. For a member's own write it raises, so every
-- scanner that calls this refuses the write without being edited; errcode
-- check_violation, message starting `content_refused:`. For anyone else it
-- is reported as `hold`. `hold` and `flag` are as before.
create or replace function private.content_verdict(raw text, p_scope text default null,
  out verdict text, out category text, out severity public.alert_severity, out matched text)
returns record
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  forms text[];
  f     text;
  tier  text;
  pat   text;
  m     text;
begin
  verdict := 'clean';
  forms := private.content_forms(raw);
  if coalesce(array_length(forms, 1), 0) = 0 then
    return;
  end if;

  foreach tier in array array['refuse', 'hold', 'flag'] loop
    pat := private.blocked_pattern(tier, p_scope);
    continue when pat is null;
    foreach f in array forms loop
      m := substring(f from pat);
      if m is not null then
        select b.category, b.severity
          into category, severity
          from public.blocked_terms b
         where b.action = tier
           and b.retired_at is null
           and (p_scope is null or b.category like p_scope || '.%')
           and m ~ ('^' || replace(b.term, ' ', ' ?') || '$')
         order by length(b.term) desc
         limit 1;
        if tier = 'refuse' then
          if private.content_writer_is_member() then
            raise exception 'content_refused: this wording is not allowed on Vallo (%)', coalesce(category, 'blocked')
              using errcode = 'check_violation';
          end if;
          tier := 'hold';
        end if;
        verdict := tier;
        matched := m;
        severity := coalesce(severity, case when tier = 'hold' then 'high' else 'medium' end::public.alert_severity);
        return;
      end if;
    end loop;
  end loop;
end;
$function$;

-- STAFF READ (AR-11). Every term, live and retired, for the moderation desk.
create or replace function public.staff_blocked_terms()
returns table (term text, category text, action text, severity public.alert_severity, reason text,
               refusal_reason text, created_at timestamptz, added_by uuid,
               retired_at timestamptz, retired_by uuid, retired_reason text)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not private.staff_can(auth.uid(), 'moderation') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return query
    select b.term, b.category, b.action, b.severity, b.reason, b.refusal_reason, b.created_at,
           b.added_by, b.retired_at, b.retired_by, b.retired_reason
      from public.blocked_terms b
     order by b.retired_at nulls first, b.category, b.term;
end;
$function$;

-- STAFF ADD OR CHANGE. Adds a term, changes a live one, or brings a retired
-- one back. Every call writes one audit row carrying the before and after.
create or replace function public.staff_blocked_term_put(
  p_term text, p_category text, p_action text, p_severity public.alert_severity,
  p_reason text, p_refusal_reason text default null)
returns void
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor  uuid := auth.uid();
  t      text := regexp_replace(lower(btrim(coalesce(p_term, ''))), '\s+', ' ', 'g');
  before jsonb;
begin
  if not private.staff_can(actor, 'moderation') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  /* The scanned text is reduced to [a-z0-9] words and single spaces, so any
     other character makes a term that can never match. */
  if t !~ '^[a-z0-9]+( [a-z0-9]+)*$' then
    raise exception 'a term is letters and digits, words separated by single spaces' using errcode = 'check_violation';
  end if;
  if p_action is null or p_action not in ('hold', 'flag', 'refuse') then
    raise exception 'action must be hold, flag or refuse' using errcode = 'check_violation';
  end if;
  if p_severity is null then
    raise exception 'severity is required' using errcode = 'check_violation';
  end if;
  if p_action = 'refuse' and coalesce(p_category, '') not like 'abuse.%' then
    raise exception 'refuse is only allowed on abuse.* terms' using errcode = 'check_violation';
  end if;
  if p_action = 'refuse' and length(btrim(coalesce(p_refusal_reason, ''))) < 12 then
    raise exception 'a refusal needs a written reason of at least 12 characters' using errcode = 'check_violation';
  end if;
  select to_jsonb(b) into before from public.blocked_terms b where b.term = t for update;

  insert into public.blocked_terms as b (term, category, action, severity, reason, refusal_reason, added_by)
  values (t, p_category, p_action, p_severity, p_reason,
          case when p_action = 'refuse' then p_refusal_reason end, actor)
  on conflict (term) do update
     set category       = excluded.category,
         action         = excluded.action,
         severity       = excluded.severity,
         reason         = excluded.reason,
         refusal_reason = excluded.refusal_reason,
         retired_at     = null,
         retired_by     = null,
         retired_reason = null;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor,
          case when before is null then 'blocked_term.added'
               when before->>'retired_at' is not null then 'blocked_term.restored'
               else 'blocked_term.changed' end,
          'blocked_term', null,
          jsonb_build_object('term', t, 'before', before,
                             'after', (select to_jsonb(b) from public.blocked_terms b where b.term = t)));
end;
$function$;

-- STAFF RETIRE. The row stays, with who retired it, when and why.
create or replace function public.staff_blocked_term_retire(p_term text, p_reason text)
returns void
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  t     text := regexp_replace(lower(btrim(coalesce(p_term, ''))), '\s+', ' ', 'g');
begin
  if not private.staff_can(actor, 'moderation') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 12 then
    raise exception 'retiring a term needs a written reason of at least 12 characters' using errcode = 'check_violation';
  end if;
  update public.blocked_terms
     set retired_at = now(), retired_by = actor, retired_reason = p_reason
   where term = t and retired_at is null;
  if not found then
    raise exception 'no live term %', t using errcode = 'no_data_found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'blocked_term.retired', 'blocked_term', null,
          jsonb_build_object('term', t, 'reason', p_reason));
end;
$function$;

revoke all on function public.staff_blocked_terms() from public, anon;
revoke all on function public.staff_blocked_term_put(text, text, text, public.alert_severity, text, text) from public, anon;
revoke all on function public.staff_blocked_term_retire(text, text) from public, anon;
grant execute on function public.staff_blocked_terms() to authenticated;
grant execute on function public.staff_blocked_term_put(text, text, text, public.alert_severity, text, text) to authenticated;
grant execute on function public.staff_blocked_term_retire(text, text) to authenticated;

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'blocked_terms'
       and column_name in ('refusal_reason', 'added_by', 'retired_at', 'retired_by', 'retired_reason')) <> 5 then
    raise exception 'blocked_terms columns missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blocked_terms_action_is_known'
                  and pg_get_constraintdef(oid) like '%refuse%') then
    raise exception 'action constraint does not admit refuse';
  end if;
  if not has_function_privilege('authenticated', 'public.staff_blocked_term_put(text, text, text, public.alert_severity, text, text)', 'execute')
     or not has_function_privilege('authenticated', 'public.staff_blocked_term_retire(text, text)', 'execute')
     or not has_function_privilege('authenticated', 'public.staff_blocked_terms()', 'execute') then
    raise exception 'staff blocked-terms functions not granted to authenticated';
  end if;
  if pg_get_functiondef('private.content_verdict(text, text)'::regprocedure) not like '%retired_at is null%' then
    raise exception 'content_verdict does not skip retired terms';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blocked_terms_refusal_is_reasoned') then
    raise exception 'refusal constraint missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blocked_terms_retirement_is_whole') then
    raise exception 'retirement constraint missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.blocked_terms'::regclass) then
    raise exception 'blocked_terms lost RLS';
  end if;
  if has_table_privilege('authenticated', 'public.blocked_terms', 'select')
     or has_table_privilege('anon', 'public.blocked_terms', 'select') then
    raise exception 'blocked_terms became directly readable';
  end if;
  if has_function_privilege('anon', 'public.staff_blocked_term_put(text, text, text, public.alert_severity, text, text)', 'execute')
     or has_function_privilege('anon', 'public.staff_blocked_term_retire(text, text)', 'execute')
     or has_function_privilege('anon', 'public.staff_blocked_terms()', 'execute') then
    raise exception 'a staff blocked-terms function is callable by anon';
  end if;
  if private.objectionable_pattern() is null then
    raise exception 'the live pattern is empty';
  end if;
end;
$check$;

-- PROBE: a retired term stops matching; refuse needs an abuse category and a
-- reason; a member's write is refused while a non-member's is held; a
-- non-staff caller reaches none of the staff functions. All undone.
-- Not exercised here: the staff happy path of put/retire, because
-- staff_can() also requires a console step-up for the caller's own session,
-- which would need fixture rows in user_roles and console_step_ups on production. Their gates and grants are asserted instead.
do $probe$
declare
  ok_retire    boolean := false;
  ok_reason    boolean := false;
  ok_fraud     boolean := false;
  ok_member    boolean := false;
  ok_staffhold boolean := false;
  ok_gate      int := 0;
  v            record;
begin
  begin
    insert into public.blocked_terms (term, category, action, severity, reason)
    values ('zqxprobeterm', 'abuse.violence-threat', 'hold', 'high', 'session two probe, rolled back');
    v := private.content_verdict('hello zqxprobeterm');
    if v.verdict <> 'hold' then raise exception 'probe: live hold term did not hold (%)', v.verdict; end if;
    update public.blocked_terms set retired_at = now(), retired_reason = 'session two probe retirement'
     where term = 'zqxprobeterm';
    v := private.content_verdict('hello zqxprobeterm');
    ok_retire := v.verdict = 'clean';

    begin
      update public.blocked_terms set action = 'refuse', refusal_reason = null where term = 'zqxprobeterm';
    exception when check_violation then ok_reason := sqlerrm like '%blocked_terms_refusal_is_reasoned%';
    end;
    begin
      update public.blocked_terms set action = 'refuse', category = 'fraud.advance-fee',
             refusal_reason = 'session two probe refusal reason' where term = 'zqxprobeterm';
    exception when check_violation then ok_fraud := sqlerrm like '%blocked_terms_refusal_is_reasoned%';
    end;

    update public.blocked_terms
       set action = 'refuse', refusal_reason = 'session two probe refusal reason',
           retired_at = null, retired_reason = null
     where term = 'zqxprobeterm';

    -- As postgres (not a member): held, never refused.
    v := private.content_verdict('hello zqxprobeterm');
    ok_staffhold := v.verdict = 'hold';

    -- Members never call the matcher directly (the scanners do, as definers);
    -- this grant lets the probe call it as a member and dies with the rollback.
    grant execute on function private.content_verdict(text, text) to authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      v := private.content_verdict('hello zqxprobeterm');
    exception when check_violation then ok_member := sqlerrm like 'content_refused:%';
    end;
    begin
      perform public.staff_blocked_term_retire('zqxprobeterm', 'a stranger should not manage to do this');
    exception when insufficient_privilege then ok_gate := ok_gate + (sqlerrm = 'not permitted')::int;
    end;
    begin
      perform public.staff_blocked_term_put('zqxprobeother', 'abuse.violence-threat', 'hold', 'high', 'a stranger should not add this');
    exception when insufficient_privilege then ok_gate := ok_gate + (sqlerrm = 'not permitted')::int;
    end;
    begin
      perform * from public.staff_blocked_terms();
    exception when insufficient_privilege then ok_gate := ok_gate + (sqlerrm = 'not permitted')::int;
    end;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);

    raise exception 'bt_probe_undo';
  exception when raise_exception then
    if sqlerrm <> 'bt_probe_undo' then raise; end if;
  end;
  if not ok_retire then raise exception 'probe: a retired term still matched'; end if;
  if not ok_reason then raise exception 'probe: refuse without a reason was accepted'; end if;
  if not ok_fraud then raise exception 'probe: refuse on a fraud category was accepted'; end if;
  if not ok_staffhold then raise exception 'probe: a non-member write was not downgraded to hold'; end if;
  if not ok_member then raise exception 'probe: a member write was not refused'; end if;
  if ok_gate <> 3 then raise exception 'probe: a non-staff caller reached a staff function (% of 3 refused)', ok_gate; end if;
  if has_function_privilege('authenticated', 'private.content_verdict(text, text)', 'execute') then
    raise exception 'probe left its grant behind';
  end if;
  if exists (select 1 from public.blocked_terms where term in ('zqxprobeterm', 'zqxprobeother')) then
    raise exception 'probe left its term behind';
  end if;
end;
$probe$;
