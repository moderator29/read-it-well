-- SCUML item 6 (with items 19 and 11): review fixes to the Suspicious
-- Transaction Report desk in 20260924173000. Apply after it.
--
--   1. ONE NEUTRAL HOLD REASON. A member can read their own
--      account_money_holds row, and report_not_me echoes its reason, so the
--      reason code itself must say nothing. The staff hold now writes `plain`
--      (not "staff_review"; the compliance desk's sanctions hold uses the same
--      code). The app maps `plain` to the plain wallet, refusal and not-me copy.
--   2. A CONFLICTED STAFF MEMBER STAYS OUT. Staff who are the subject of a
--      case, or a person linked to it, cannot see it (str_cases,
--      str_register), are not notified of it, and cannot decide, approve,
--      link, record, hold or release on it ('conflicted').
--   3. A FILING CANNOT PREDATE ITS APPROVAL. filed_at must be at or after the
--      approving row's approved_at.
--   4. A PERSON SOURCE IS THE SUBJECT. A given subject must exist, and the
--      subject is always linked.
--   5. TRUNCATE IS REFUSED on every str_* table, as UPDATE and DELETE are.
--   6. THE HOLD: reason `plain`; a rolling 30 days from each placing
--      (private.str_hold_length()); refused on a case decided not to file;
--      never overwrites another hold still in force (a "this was not me"
--      hold above all); a staff member can release it, audited, and only a
--      hold this desk placed.
--   7. ONE DEFINITION OF OVERDUE, private.str_overdue(case), read by the
--      desk and by the nudge: past due and not yet filed or closed.

-- ----------------------------------------------------------------------------
-- WHO IS ON A CASE

create or replace function private.str_is_party(p_case uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and (
    exists (select 1 from private.str_cases c where c.id = p_case and c.subject_id = p_user)
    or exists (select 1 from private.str_case_links l
                where l.case_id = p_case and l.kind = 'person' and l.ref = p_user::text)
  );
$$;

revoke all on function private.str_is_party(uuid, uuid) from public, anon, authenticated;

create or replace function private.str_overdue(p_case uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.str_cases c where c.id = p_case and c.due_at < now())
     and private.str_state(p_case) in ('open', 'awaiting_approval', 'to_file');
$$;

revoke all on function private.str_overdue(uuid) from public, anon, authenticated;

comment on function private.str_overdue(uuid) is
  'SCUML item 6. The one definition of an overdue STR case: past its due time and not yet filed or closed. Read by public.str_cases() and private.str_nudge_overdue().';

-- ----------------------------------------------------------------------------
-- TRUNCATE, REFUSED

create or replace function private.str_refuse_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'SCUML item 6: % is append-only and kept five years', tg_table_name
    using errcode = '42501';
end;
$$;

do $no_truncate$
declare t text;
begin
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register', 'str_nudges'] loop
    execute format('drop trigger if exists %I on private.%I', t || '_no_truncate', t);
    execute format('create trigger %I before truncate on private.%I for each statement execute function private.str_refuse_truncate()',
                   t || '_no_truncate', t);
  end loop;
end;
$no_truncate$;

-- ----------------------------------------------------------------------------
-- STAFF NOTICES, NEVER TO A PARTY

create or replace function private.str_tell_staff(p_title text, p_body text, p_case uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare staff uuid;
begin
  for staff in
    select distinct ur.user_id from public.user_roles ur
     where ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
       and not private.str_is_party(p_case, ur.user_id)
  loop
    perform private.notify(staff, 'system'::public.notification_kind, p_title, p_body,
                           '/admin/compliance?tab=str&case=' || p_case::text);
  end loop;
end;
$$;

revoke all on function private.str_tell_staff(text, text, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- OPENING: A PERSON SOURCE IS THE SUBJECT, AND THE SUBJECT IS LINKED

create or replace function public.str_open_case(p_source_kind text, p_source_id text, p_subject uuid, p_grounds text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  v_case uuid;
  v_due timestamptz := now() + private.str_due_after();
  v_subject uuid := p_subject;
  v_found boolean := true;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_source_kind is null or p_source_kind not in
       ('person', 'transaction', 'risk_alert', 'report', 'sanctions_hit', 'pep_review', 'threshold_report')
     or coalesce(btrim(p_source_id), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if length(btrim(coalesce(p_grounds, ''))) < 20 then return jsonb_build_object('status', 'grounds_short'); end if;

  begin
    if p_source_kind = 'person' then
      v_subject := btrim(p_source_id)::uuid;
      v_found := exists (select 1 from auth.users u where u.id = v_subject);
    elsif p_source_kind = 'transaction' then
      v_found := exists (select 1 from public.transactions t where t.id = btrim(p_source_id)::uuid);
    elsif p_source_kind = 'risk_alert' then
      v_found := exists (select 1 from public.risk_alerts a where a.id = btrim(p_source_id)::uuid);
    elsif p_source_kind = 'report' then
      v_found := exists (select 1 from public.reports r where r.id = btrim(p_source_id)::uuid
                           and r.status = 'resolved'::public.report_status);
    end if;
  exception when invalid_text_representation then
    return jsonb_build_object('status', 'invalid');
  end;
  if not v_found then return jsonb_build_object('status', 'not_found'); end if;
  if v_subject is not null and not exists (select 1 from auth.users u where u.id = v_subject) then
    return jsonb_build_object('status', 'not_found');
  end if;
  /* Nobody opens a case about themselves. */
  if v_subject = actor then return jsonb_build_object('status', 'conflicted'); end if;

  insert into private.str_cases (source_kind, source_id, subject_id, grounds, opened_by, due_at)
  values (p_source_kind, btrim(p_source_id), v_subject, btrim(p_grounds), actor, v_due)
  returning id into v_case;

  insert into private.str_case_links (case_id, kind, ref, added_by)
  values (v_case, p_source_kind, btrim(p_source_id), actor);
  if v_subject is not null then
    insert into private.str_case_links (case_id, kind, ref, added_by)
    values (v_case, 'person', v_subject::text, actor)
    on conflict do nothing;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.case_opened', 'str_case', v_case::text,
          jsonb_build_object('scuml_item', 6, 'source_kind', p_source_kind, 'due_at', v_due));

  perform private.str_tell_staff(
    'An STR case is open',
    'A suspicion was raised for a Suspicious Transaction Report. The decision is due by '
      || to_char(v_due at time zone 'Africa/Lagos', 'Dy DD Mon HH24:MI') || ' Lagos time.',
    v_case);

  return jsonb_build_object('status', 'opened', 'case_id', v_case, 'due_at', v_due);
end;
$$;

revoke all on function public.str_open_case(text, text, uuid, text) from public, anon;
grant execute on function public.str_open_case(text, text, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- ACTING ON A CASE: NEVER A PARTY TO IT

create or replace function public.str_link(p_case uuid, p_kind text, p_ref text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := (select auth.uid());
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  if not exists (select 1 from private.str_cases c where c.id = p_case) then return 'not_found'; end if;
  if private.str_is_party(p_case, actor) then return 'conflicted'; end if;
  if private.str_state(p_case) in ('filed', 'not_filed') then return 'closed'; end if;
  if p_kind is null or p_kind not in ('person', 'transaction', 'rent_payment', 'booking', 'risk_alert', 'report',
                                      'sanctions_hit', 'pep_review', 'threshold_report')
     or coalesce(btrim(p_ref), '') = '' then
    return 'invalid';
  end if;
  /* Linking yourself would make you a party; linking is for the case, not a way out of it. */
  if p_kind = 'person' and btrim(p_ref) = actor::text then return 'conflicted'; end if;
  insert into private.str_case_links (case_id, kind, ref, added_by)
  values (p_case, p_kind, btrim(p_ref), actor)
  on conflict do nothing;
  if not found then return 'already'; end if;
  return 'linked';
end;
$$;

revoke all on function public.str_link(uuid, text, text) from public, anon;
grant execute on function public.str_link(uuid, text, text) to authenticated;

create or replace function public.str_decide(p_case uuid, p_decision text, p_reasons text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  v_state text;
  v_decision uuid;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  perform 1 from private.str_cases c where c.id = p_case for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if p_decision is null or p_decision not in ('file', 'no_file') then return jsonb_build_object('status', 'invalid'); end if;
  if length(btrim(coalesce(p_reasons, ''))) < 20 then return jsonb_build_object('status', 'reasons_short'); end if;
  v_state := private.str_state(p_case);
  if v_state = 'awaiting_approval' then return jsonb_build_object('status', 'awaiting_approval'); end if;
  if v_state <> 'open' then return jsonb_build_object('status', 'closed'); end if;

  insert into private.str_decisions (case_id, decision, reasons, decided_by)
  values (p_case, p_decision, btrim(p_reasons), actor)
  returning id into v_decision;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.decided', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'decision', p_decision, 'decision_id', v_decision));

  perform private.str_tell_staff(
    'An STR decision needs a second person',
    'A decision on a Suspicious Transaction Report case waits for approval by a staff member other than the one who made it.',
    p_case);

  return jsonb_build_object('status', 'decided', 'decision_id', v_decision);
end;
$$;

revoke all on function public.str_decide(uuid, text, text) from public, anon;
grant execute on function public.str_decide(uuid, text, text) to authenticated;

create or replace function public.str_approve(p_decision uuid, p_approve boolean, p_note text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  d private.str_decisions%rowtype;
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  if p_approve is null then return 'invalid'; end if;
  select * into d from private.str_decisions where id = p_decision;
  if d.id is null then return 'not_found'; end if;
  perform 1 from private.str_cases c where c.id = d.case_id for update;
  if private.str_is_party(d.case_id, actor) then return 'conflicted'; end if;
  if exists (select 1 from private.str_approvals a where a.decision_id = p_decision) then return 'already'; end if;
  /* SCUML item 19. */
  if d.decided_by = actor then return 'same_person'; end if;
  if not p_approve and length(btrim(coalesce(p_note, ''))) < 5 then return 'note_needed'; end if;

  insert into private.str_approvals (decision_id, approved, note, approver_id)
  values (p_decision, p_approve, nullif(btrim(coalesce(p_note, '')), ''), actor);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, case when p_approve then 'str.approved' else 'str.rejected' end, 'str_case', d.case_id::text,
          jsonb_build_object('scuml_item', 6, 'decision_id', p_decision, 'decision', d.decision));

  return case when p_approve then 'approved' else 'rejected' end;
end;
$$;

revoke all on function public.str_approve(uuid, boolean, text) from public, anon;
grant execute on function public.str_approve(uuid, boolean, text) to authenticated;

create or replace function public.str_record_filing(p_case uuid, p_goaml_reference text, p_filed_at timestamptz)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  v_decision uuid;
  v_approved_at timestamptz;
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  perform 1 from private.str_cases c where c.id = p_case for update;
  if not found then return 'not_found'; end if;
  if private.str_is_party(p_case, actor) then return 'conflicted'; end if;
  if length(btrim(coalesce(p_goaml_reference, ''))) < 3 then return 'invalid'; end if;
  if p_filed_at is null or p_filed_at > now() + interval '5 minutes' then return 'invalid'; end if;
  if private.str_state(p_case) = 'filed' then return 'already'; end if;
  if private.str_state(p_case) <> 'to_file' then return 'not_approved'; end if;

  select d.id, a.approved_at into v_decision, v_approved_at
    from private.str_decisions d
    join private.str_approvals a on a.decision_id = d.id and a.approved
   where d.case_id = p_case
   order by d.decided_at desc
   limit 1;
  /* A filing cannot be dated before the second person approved filing. */
  if p_filed_at < v_approved_at then return 'before_approval'; end if;

  insert into private.str_register (case_id, decision_id, goaml_reference, filed_at, recorded_by)
  values (p_case, v_decision, btrim(p_goaml_reference), p_filed_at, actor);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.filed', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'goaml_reference', btrim(p_goaml_reference), 'filed_at', p_filed_at));
  return 'recorded';
end;
$$;

revoke all on function public.str_record_filing(uuid, text, timestamptz) from public, anon;
grant execute on function public.str_record_filing(uuid, text, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- THE HOLD: NEUTRAL, CAPPED, RELEASABLE

create or replace function private.str_hold_length()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 days' $$;

comment on function private.str_hold_length() is
  'SCUML item 6. How long each placing of an STR hold runs from now: a rolling 30 days, renewed by placing it again while the case needs it, never a fixed long end.';

/* The 173000 form took a number of hours; the hold is a rolling 30 days now. */
drop function if exists public.str_place_hold(uuid, integer);

create or replace function public.str_place_hold(p_case uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  c private.str_cases%rowtype;
  v_until timestamptz := now() + private.str_hold_length();
  v_existing public.account_money_holds%rowtype;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if private.str_state(p_case) = 'not_filed' then return jsonb_build_object('status', 'closed'); end if;

  select * into v_existing from public.account_money_holds h where h.user_id = c.subject_id for update;
  if v_existing.user_id is null then
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (c.subject_id, v_until, 'plain', now());
  elsif v_existing.reason = 'plain' or v_existing.hold_until <= now() then
    /* Our own hold rolls on; a hold that has ended is replaced. */
    update public.account_money_holds set hold_until = v_until, reason = 'plain'
     where user_id = c.subject_id;
  else
    /* Another hold is in force (a "this was not me" hold among them). It is
       never overwritten: its words are the member's own, and changing them
       would say something. Staff place this one again once it ends. */
    return jsonb_build_object('status', 'other_hold', 'until', v_existing.hold_until);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_placed', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'until', v_until));
  return jsonb_build_object('status', 'held', 'until', v_until);
end;
$$;

revoke all on function public.str_place_hold(uuid) from public, anon;
grant execute on function public.str_place_hold(uuid) to authenticated;

/* Ends a hold this desk placed (reason `plain`) at once. A "this was not me"
   hold, which the member placed themselves, is not this desk's to end. */
create or replace function public.str_release_hold(p_case uuid, p_note text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  c private.str_cases%rowtype;
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return 'not_found'; end if;
  if private.str_is_party(p_case, actor) then return 'conflicted'; end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then return 'note_needed'; end if;
  if c.subject_id is null then return 'no_subject'; end if;
  update public.account_money_holds
     set hold_until = now()
   where user_id = c.subject_id and reason = 'plain' and hold_until > now();
  if not found then return 'no_hold'; end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_released', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'note', btrim(p_note)));
  return 'released';
end;
$$;

revoke all on function public.str_release_hold(uuid, text) from public, anon;
grant execute on function public.str_release_hold(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- THE DESK'S READS: A PARTY'S CASES ARE NOT SHOWN TO THEM

create or replace function public.str_cases()
returns table (id uuid, source_kind text, source_id text, subject_id uuid, grounds text,
               opened_by uuid, opened_at timestamptz, due_at timestamptz, state text, overdue boolean,
               decision_id uuid, decision text, reasons text, decided_by uuid, decided_at timestamptz,
               approved boolean, approver_id uuid, links jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if not private.str_is_staff(me) then return; end if;
  return query
    select c.id, c.source_kind, c.source_id, c.subject_id, c.grounds, c.opened_by, c.opened_at, c.due_at,
           private.str_state(c.id),
           private.str_overdue(c.id),
           d.id, d.decision, d.reasons, d.decided_by, d.decided_at, a.approved, a.approver_id,
           coalesce((select jsonb_agg(jsonb_build_object('kind', l.kind, 'ref', l.ref) order by l.added_at)
                       from private.str_case_links l where l.case_id = c.id), '[]'::jsonb)
      from private.str_cases c
      left join lateral (
        select * from private.str_decisions x where x.case_id = c.id order by x.decided_at desc limit 1
      ) d on true
      left join private.str_approvals a on a.decision_id = d.id
     where not private.str_is_party(c.id, me)
     order by (private.str_state(c.id) in ('open', 'awaiting_approval', 'to_file')) desc, c.due_at asc
     limit 200;
end;
$$;

revoke all on function public.str_cases() from public, anon;
grant execute on function public.str_cases() to authenticated;

create or replace function public.str_register()
returns table (case_id uuid, goaml_reference text, filed_at timestamptz, recorded_by uuid, recorded_at timestamptz,
               decided_by uuid, approver_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if not private.str_is_staff(me) then return; end if;
  return query
    select r.case_id, r.goaml_reference, r.filed_at, r.recorded_by, r.recorded_at, d.decided_by, a.approver_id
      from private.str_register r
      join private.str_decisions d on d.id = r.decision_id
      left join private.str_approvals a on a.decision_id = d.id
     where not private.str_is_party(r.case_id, me)
     order by r.filed_at desc
     limit 500;
end;
$$;

revoke all on function public.str_register() from public, anon;
grant execute on function public.str_register() to authenticated;

create or replace function private.str_nudge_overdue()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  n integer := 0;
begin
  for c in select x.id from private.str_cases x where private.str_overdue(x.id) loop
    insert into private.str_nudges (case_id, sent_on)
    values (c.id, (now() at time zone 'Africa/Lagos')::date)
    on conflict do nothing;
    if found then
      perform private.str_tell_staff(
        'An STR case is overdue',
        'A Suspicious Transaction Report case is past its due time without a decision a second person has approved, or without its goAML reference.',
        c.id);
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function private.str_nudge_overdue() from public, anon, authenticated;

do $readback$
declare bad text := '';
begin
  if has_function_privilege('authenticated', 'private.str_is_party(uuid, uuid)', 'execute') then bad := bad || ' [parties can be probed]'; end if;
  if has_function_privilege('anon', 'public.str_release_hold(uuid, text)', 'execute') then bad := bad || ' [anon can release]'; end if;
  if exists (select 1 from pg_proc p where p.proname = 'str_place_hold' and pg_get_functiondef(p.oid) like '%staff_review%') then
    bad := bad || ' [the hold still writes a telling reason]';
  end if;
  if to_regprocedure('public.str_place_hold(uuid, integer)') is not null then bad := bad || ' [the hours form of the hold is still here]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
