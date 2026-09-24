-- SCUML item 6: SUSPICIOUS TRANSACTION REPORTS TO THE NFIU.
--
-- Money Laundering (Prevention and Prohibition) Act 2022; SCUML-EFCC AML/CFT
-- Compliance Checklist for DNFBPs, item 6 ("file Suspicious Transaction
-- Reports with the NFIU promptly, with the decision documented and approved"),
-- with item 19 (controls one person cannot override) and item 11 (records kept
-- five years). Nothing here is legal advice; the solicitor confirms it.
--
-- THE FLOW, all staff only:
--   public.str_open_case(source_kind, source_id, subject, grounds)
--     "Consider an STR". Starts from a person, a transaction, a risk alert,
--     an upheld report, or a sanctions, PEP or threshold hit (the other SCUML
--     builders' hooks, referenced by id). The grounds are a narrative. The
--     case is DUE 24 hours after it is opened (private.str_due_after(), the one
--     place the number lives) and every staff member is notified.
--   public.str_link(case, kind, ref)       more transactions and people.
--   public.str_decide(case, decision, reasons)
--     'file' or 'no_file', with reasons. One decision waits at a time.
--   public.str_approve(decision, approve, note)
--     SCUML item 19: the approver is a DIFFERENT staff member from the
--     decider, refused inside the function and again by a trigger. A rejected
--     decision leaves the case open for a new one.
--   public.str_record_filing(case, goaml_reference, filed_at)
--     the NFIU filing happens in goAML, outside Vallo; the officer records the
--     reference here, only on an approved 'file' decision.
--   public.str_place_hold(case, hours)
--     the ONLY lever that stops money: a staff-placed row in the audit's
--     public.account_money_holds for the case's subject, reason
--     'staff_review' here, replaced by the neutral 'plain' in 20260924173100.
--     Never automatic. Audited.
--   public.str_cases(), public.str_register()
--     the desk's reads.
--
-- NO TIPPING OFF. Nothing in this file writes anything a member can read: no
-- notification to the subject, no status on any member-facing table, no
-- change to what their pages show. Staff notifications go to staff only. The
-- one exception is a money hold, placed by a person on purpose, which the
-- wallet shows without a cause (the `plain` reason, 20260924173100).
--
-- APPEND-ONLY AND KEPT FIVE YEARS (SCUML item 11). Every table here refuses
-- UPDATE and DELETE by trigger, whoever asks, the service role included. No
-- foreign key reaches auth.users, so deleting an account (which anonymises
-- the person) leaves the compliance record whole. No purge job touches the
-- `private.str_*` tables; RETENTION_SCHEDULE.md should list them as kept five
-- years from the filing or the decision not to file.
--
-- BORN LOCKED. The tables live in `private`, which no API role can reach; every
-- read and write is a definer function that checks the caller is staff.

-- ----------------------------------------------------------------------------
-- THE CLOCK

create or replace function private.str_due_after()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '24 hours' $$;

comment on function private.str_due_after() is
  'SCUML item 6. How long after a case is opened its decision is due. "Promptly" is the Act''s word; 24 hours is the NFIU''s guidance as read here, for the solicitor to confirm.';

create or replace function private.str_is_staff(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null
     and (private.has_role(p_user, 'admin'::public.app_role)
          or private.has_role(p_user, 'super_admin'::public.app_role));
$$;

revoke all on function private.str_is_staff(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- THE TABLES

create table if not exists private.str_cases (
  id           uuid primary key default gen_random_uuid(),
  source_kind  text not null check (source_kind in
                 ('person', 'transaction', 'risk_alert', 'report', 'sanctions_hit', 'pep_review', 'threshold_report')),
  source_id    text not null check (length(source_id) between 1 and 200),
  /* The person the suspicion is about, when there is one. No foreign key:
     the record outlives the account. */
  subject_id   uuid,
  grounds      text not null check (length(btrim(grounds)) between 20 and 8000),
  opened_by    uuid not null,
  opened_at    timestamptz not null default now(),
  due_at       timestamptz not null
);

comment on table private.str_cases is
  'SCUML item 6. One row per suspicion considered for a Suspicious Transaction Report: where it started, who it is about, the grounds, who opened it and when it is due. Append-only, kept five years (item 11). Staff only.';

create table if not exists private.str_case_links (
  case_id   uuid not null references private.str_cases(id),
  kind      text not null check (kind in
              ('person', 'transaction', 'rent_payment', 'booking', 'risk_alert', 'report', 'sanctions_hit', 'pep_review', 'threshold_report')),
  ref       text not null check (length(ref) between 1 and 200),
  added_by  uuid not null,
  added_at  timestamptz not null default now(),
  primary key (case_id, kind, ref)
);

comment on table private.str_case_links is
  'SCUML item 6. The transactions and people linked to a case. Append-only.';

create table if not exists private.str_decisions (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references private.str_cases(id),
  decision    text not null check (decision in ('file', 'no_file')),
  reasons     text not null check (length(btrim(reasons)) between 20 and 8000),
  decided_by  uuid not null,
  decided_at  timestamptz not null default now()
);

create index if not exists str_decisions_case_idx on private.str_decisions (case_id, decided_at desc);

comment on table private.str_decisions is
  'SCUML item 6. File or do not file, with the reasons and who decided. A decision stands only once a second staff member approves it (item 19). Append-only.';

create table if not exists private.str_approvals (
  decision_id  uuid primary key references private.str_decisions(id),
  approved     boolean not null,
  note         text check (note is null or length(note) <= 4000),
  approver_id  uuid not null,
  approved_at  timestamptz not null default now()
);

comment on table private.str_approvals is
  'SCUML items 6 and 19. The second person on every STR decision, never the decider. Append-only.';

create table if not exists private.str_register (
  case_id          uuid primary key references private.str_cases(id),
  decision_id      uuid not null references private.str_decisions(id),
  goaml_reference  text not null check (length(btrim(goaml_reference)) between 3 and 200),
  filed_at         timestamptz not null,
  recorded_by      uuid not null,
  recorded_at      timestamptz not null default now()
);

comment on table private.str_register is
  'SCUML item 6. Every STR filed with the NFIU: the goAML reference the officer entered and when it was filed. Append-only, kept five years (item 11).';

create table if not exists private.str_nudges (
  case_id   uuid not null references private.str_cases(id),
  sent_on   date not null,
  primary key (case_id, sent_on)
);

comment on table private.str_nudges is
  'SCUML item 6. One reminder a day per overdue case, so the clock is chased without flooding the desk.';

revoke all on private.str_cases, private.str_case_links, private.str_decisions, private.str_approvals,
              private.str_register, private.str_nudges from public, anon, authenticated;

/* APPEND-ONLY, whoever asks. */
create or replace function private.str_refuse_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'SCUML item 6: % is append-only and kept five years', tg_table_name
    using errcode = '42501';
end;
$$;

do $append_only$
declare t text;
begin
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register'] loop
    execute format('drop trigger if exists %I on private.%I', t || '_append_only', t);
    execute format('create trigger %I before update or delete on private.%I for each row execute function private.str_refuse_change()',
                   t || '_append_only', t);
  end loop;
end;
$append_only$;

/* SCUML item 19, held by the table as well as the function. */
create or replace function private.str_approver_is_second()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from private.str_decisions d where d.id = new.decision_id and d.decided_by = new.approver_id) then
    raise exception 'SCUML item 19: the approver of an STR decision must be a second person'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists str_approvals_second_person on private.str_approvals;
create trigger str_approvals_second_person
  before insert on private.str_approvals
  for each row execute function private.str_approver_is_second();

-- ----------------------------------------------------------------------------
-- WHERE A CASE STANDS

/* open: no decision waiting or standing
   awaiting_approval: a decision waits for the second person
   to_file: an approved 'file' decision, no goAML reference yet
   filed: in the register
   not_filed: an approved 'no_file' decision */
create or replace function private.str_state(p_case uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select d.id, d.decision, a.approved
      from private.str_decisions d
      left join private.str_approvals a on a.decision_id = d.id
     where d.case_id = p_case
     order by d.decided_at desc
     limit 1
  )
  select case
    when exists (select 1 from private.str_register r where r.case_id = p_case) then 'filed'
    when not exists (select 1 from latest) then 'open'
    when (select approved from latest) is null then 'awaiting_approval'
    when (select approved from latest) is false then 'open'
    when (select decision from latest) = 'file' then 'to_file'
    else 'not_filed'
  end;
$$;

revoke all on function private.str_state(uuid) from public, anon, authenticated;

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
  loop
    perform private.notify(staff, 'system'::public.notification_kind, p_title, p_body,
                           '/admin/compliance?tab=str&case=' || p_case::text);
  end loop;
end;
$$;

revoke all on function private.str_tell_staff(text, text, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- CONSIDER AN STR

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

  /* Where the source is a table this database holds, it must exist. The other
     builders' hits (sanctions, PEP, threshold) are recorded by id. */
  begin
    if p_source_kind = 'person' then
      v_found := exists (select 1 from auth.users u where u.id = p_source_id::uuid);
      v_subject := coalesce(v_subject, p_source_id::uuid);
    elsif p_source_kind = 'transaction' then
      v_found := exists (select 1 from public.transactions t where t.id = p_source_id::uuid);
    elsif p_source_kind = 'risk_alert' then
      v_found := exists (select 1 from public.risk_alerts a where a.id = p_source_id::uuid);
    elsif p_source_kind = 'report' then
      /* An UPHELD report: one staff resolved as founded. */
      v_found := exists (select 1 from public.reports r where r.id = p_source_id::uuid
                           and r.status = 'resolved'::public.report_status);
    end if;
  exception when invalid_text_representation then
    return jsonb_build_object('status', 'invalid');
  end;
  if not v_found then return jsonb_build_object('status', 'not_found'); end if;

  insert into private.str_cases (source_kind, source_id, subject_id, grounds, opened_by, due_at)
  values (p_source_kind, btrim(p_source_id), v_subject, btrim(p_grounds), actor, v_due)
  returning id into v_case;

  insert into private.str_case_links (case_id, kind, ref, added_by)
  values (v_case, p_source_kind, btrim(p_source_id), actor);
  if v_subject is not null and p_source_kind <> 'person' then
    insert into private.str_case_links (case_id, kind, ref, added_by)
    values (v_case, 'person', v_subject::text, actor)
    on conflict do nothing;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.case_opened', 'str_case', v_case::text,
          jsonb_build_object('scuml_item', 6, 'source_kind', p_source_kind, 'due_at', v_due));

  /* Staff only. The subject is never told. */
  perform private.str_tell_staff(
    'An STR case is open',
    'A suspicion was raised for a Suspicious Transaction Report. The decision is due by '
      || to_char(v_due at time zone 'Africa/Lagos', 'Dy DD Mon HH24:MI') || ' Lagos time.',
    v_case);

  return jsonb_build_object('status', 'opened', 'case_id', v_case, 'due_at', v_due);
end;
$$;

comment on function public.str_open_case(text, text, uuid, text) is
  'SCUML item 6. Staff: consider an STR. Opens a case from a person, transaction, risk alert, upheld report, or a sanctions, PEP or threshold hit, with the grounds as a narrative; due in private.str_due_after(); staff are notified and the subject is not.';

revoke all on function public.str_open_case(text, text, uuid, text) from public, anon;
grant execute on function public.str_open_case(text, text, uuid, text) to authenticated;

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
  if private.str_state(p_case) in ('filed', 'not_filed') then return 'closed'; end if;
  if p_kind is null or p_kind not in ('person', 'transaction', 'rent_payment', 'booking', 'risk_alert', 'report',
                                      'sanctions_hit', 'pep_review', 'threshold_report')
     or coalesce(btrim(p_ref), '') = '' then
    return 'invalid';
  end if;
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
  /* One decision at a time per case. */
  perform 1 from private.str_cases c where c.id = p_case for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
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
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  perform 1 from private.str_cases c where c.id = p_case for update;
  if not found then return 'not_found'; end if;
  if length(btrim(coalesce(p_goaml_reference, ''))) < 3 then return 'invalid'; end if;
  if p_filed_at is null or p_filed_at > now() + interval '5 minutes' then return 'invalid'; end if;
  if private.str_state(p_case) = 'filed' then return 'already'; end if;
  if private.str_state(p_case) <> 'to_file' then return 'not_approved'; end if;

  select d.id into v_decision from private.str_decisions d
   where d.case_id = p_case order by d.decided_at desc limit 1;

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

/* THE ONE LEVER THAT STOPS MONEY. Placed by a person, on purpose, for a case
   with a subject. It extends a hold already in force rather than shortening
   it, and it keeps an active hold's own reason (a "this was not me" hold goes
   on saying so). */
create or replace function public.str_place_hold(p_case uuid, p_hours integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  v_subject uuid;
  v_until timestamptz;
  v_existing public.account_money_holds%rowtype;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_hours is null or p_hours < 1 or p_hours > 168 then return jsonb_build_object('status', 'invalid'); end if;
  select c.subject_id into v_subject from private.str_cases c where c.id = p_case;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_subject is null then return jsonb_build_object('status', 'no_subject'); end if;
  v_until := now() + make_interval(hours => p_hours);

  select * into v_existing from public.account_money_holds h where h.user_id = v_subject for update;
  if v_existing.user_id is null then
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (v_subject, v_until, 'staff_review', now());
  elsif v_existing.hold_until < v_until then
    update public.account_money_holds
       set hold_until = v_until,
           reason = case when v_existing.hold_until > now() then v_existing.reason else 'staff_review' end
     where user_id = v_subject;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_placed', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'hours', p_hours, 'until', greatest(v_until, v_existing.hold_until)));
  return jsonb_build_object('status', 'held', 'until', greatest(v_until, v_existing.hold_until));
end;
$$;

revoke all on function public.str_place_hold(uuid, integer) from public, anon;
grant execute on function public.str_place_hold(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- THE DESK'S READS

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
begin
  if not private.str_is_staff((select auth.uid())) then return; end if;
  return query
    select c.id, c.source_kind, c.source_id, c.subject_id, c.grounds, c.opened_by, c.opened_at, c.due_at,
           private.str_state(c.id),
           /* Overdue: past due with no decision a second person has approved. */
           c.due_at < now() and private.str_state(c.id) in ('open', 'awaiting_approval'),
           d.id, d.decision, d.reasons, d.decided_by, d.decided_at, a.approved, a.approver_id,
           coalesce((select jsonb_agg(jsonb_build_object('kind', l.kind, 'ref', l.ref) order by l.added_at)
                       from private.str_case_links l where l.case_id = c.id), '[]'::jsonb)
      from private.str_cases c
      left join lateral (
        select * from private.str_decisions x where x.case_id = c.id order by x.decided_at desc limit 1
      ) d on true
      left join private.str_approvals a on a.decision_id = d.id
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
begin
  if not private.str_is_staff((select auth.uid())) then return; end if;
  return query
    select r.case_id, r.goaml_reference, r.filed_at, r.recorded_by, r.recorded_at, d.decided_by, a.approver_id
      from private.str_register r
      join private.str_decisions d on d.id = r.decision_id
      left join private.str_approvals a on a.decision_id = d.id
     order by r.filed_at desc
     limit 500;
end;
$$;

revoke all on function public.str_register() from public, anon;
grant execute on function public.str_register() to authenticated;

-- ----------------------------------------------------------------------------
-- PROMPT: THE CLOCK IS CHASED

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
  for c in
    select x.id from private.str_cases x
     where x.due_at < now() and private.str_state(x.id) in ('open', 'awaiting_approval', 'to_file')
  loop
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
  if has_table_privilege('authenticated', 'private.str_cases', 'select')
     or has_table_privilege('anon', 'private.str_cases', 'select') then
    bad := bad || ' [cases are readable]';
  end if;
  if has_table_privilege('authenticated', 'private.str_register', 'insert') then bad := bad || ' [a member can write the register]'; end if;
  if has_function_privilege('anon', 'public.str_open_case(text, text, uuid, text)', 'execute') then bad := bad || ' [anon can open a case]'; end if;
  if has_function_privilege('authenticated', 'private.str_nudge_overdue()', 'execute') then bad := bad || ' [a member can run the nudge]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* The job is scheduled with the rest of this migration, in its transaction:
   if anything above fails, no job is left behind. Minute 17. */
select cron.unschedule('vallo_str_nudge_overdue')
 where exists (select 1 from cron.job where jobname = 'vallo_str_nudge_overdue');
select cron.schedule('vallo_str_nudge_overdue', '17 * * * *', 'select private.str_nudge_overdue();');
