-- SCUML item 6 (with items 19 and 11): SUSPICIOUS TRANSACTION REPORTS, AND
-- HOLDS AS CLAIMS, ON THE LIVE TABLES.
--
-- WHY THIS MIGRATION. 20260924173000, 173100 and 173200 were committed and
-- never applied: they were chained to files that attach triggers to the
-- retired custody tables. Their own SQL touches no custody object, so this
-- file is the three as their final (173200) state, applied once, with one
-- addition for the world without a wallet:
--
--   THE HOLD IS ENFORCED FROM THE CLAIMS TOO. Since 25 September 2026 Vallo
--   holds no customer money (docs/MONEY_ARCHITECTURE.md, ADR 0002): money is
--   split by Paystack to each payee's own subaccount at the moment of payment,
--   so the only money lever a hold still pulls is the one the live
--   bank_accounts_00_money_hold / payout_accounts_00_money_hold triggers
--   enforce (no payout or bank account can be added or changed while a hold
--   stands, so a held person cannot redirect where their share settles).
--   private.money_hold_until now also answers a live private.hold_claims row,
--   which closes the up-to-a-minute window 173200's header left open between a
--   "this was not me" hold ending and the next sweep. And the refusal that
--   trigger raises names no date when the hold is a compliance one (a `plain`
--   row or a live claim): a date years away, or any cause, would tip the
--   person off. Every other hold keeps its own words.
--
-- THE FLOW, all staff only (admin or super_admin), all through definer
-- functions that check the caller:
--   str_open_case(source_kind, source_id, subject, grounds)  due in 24 hours
--   str_link(case, kind, ref)
--   str_decide(case, 'file' | 'no_file', reasons)
--   str_approve(decision, approve, note)     a SECOND person (item 19)
--   str_record_filing(case, goaml_reference, filed_at)   never before approval
--   str_place_hold(case)                      claims 'str' for a rolling 30 days
--   str_release_hold(case, note)              ASKS; ends nothing
--   str_approve_release(release)              a second person clears the claim
--   str_cases(), str_register(), str_pending_releases()   the desk's reads
-- A staff member who is the subject of a case, or linked to it, never sees
-- it, is never notified of it and cannot act on it ('conflicted').
--
-- NO TIPPING OFF. Nothing here writes anything a member reads except the
-- neutral `plain` hold row. Staff notifications go to staff only.
--
-- APPEND-ONLY AND KEPT FIVE YEARS (item 11). Every private.str_* table refuses
-- UPDATE, DELETE and TRUNCATE, whoever asks. No foreign key reaches
-- auth.users. Tables live in `private`, with RLS on and no grants: born locked.
--
-- THE SHARED HOLD MODEL (items 6 and 8): private.hold_claims holds each desk's
-- own claim ('str', 'sanctions'); public.account_money_holds follows the
-- latest live claim through private.hold_recompute, never touching a live
-- non-plain hold (a "this was not me" hold); private.hold_claims_sweep runs
-- every minute to hand over once such a hold ends.

set local lock_timeout = '5s';

-- ----------------------------------------------------------------------------
-- THE CLOCK AND WHO IS STAFF

create or replace function private.str_due_after()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '24 hours' $$;

comment on function private.str_due_after() is
  'SCUML item 6. How long after a case is opened its decision is due. "Promptly" is the Act''s word; 24 hours is the NFIU''s guidance as read here, for the solicitor to confirm.';
revoke all on function private.str_due_after() from public, anon, authenticated;

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

create or replace function private.str_hold_length()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 days' $$;

comment on function private.str_hold_length() is
  'SCUML item 6. How long each placing of an STR hold runs from now: a rolling 30 days, renewed by placing it again while the case needs it, never a fixed long end.';
revoke all on function private.str_hold_length() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- THE TABLES

create table if not exists private.str_cases (
  id           uuid primary key default gen_random_uuid(),
  source_kind  text not null check (source_kind in
                 ('person', 'transaction', 'risk_alert', 'report', 'sanctions_hit', 'pep_review', 'threshold_report')),
  source_id    text not null check (length(source_id) between 1 and 200),
  /* The person the suspicion is about. No foreign key: the record outlives the account. */
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
  'SCUML item 6. The transactions, rent payments, bookings and people linked to a case. Append-only.';

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
create index if not exists str_register_decision_idx on private.str_register (decision_id);
comment on table private.str_register is
  'SCUML item 6. Every STR filed with the NFIU: the goAML reference the officer entered and when it was filed. Append-only, kept five years (item 11).';

create table if not exists private.str_nudges (
  case_id   uuid not null references private.str_cases(id),
  sent_on   date not null,
  primary key (case_id, sent_on)
);
comment on table private.str_nudges is
  'SCUML item 6. One reminder a day per overdue case, so the clock is chased without flooding the desk.';

create table if not exists private.hold_claims (
  user_id  uuid not null,
  owner    text not null check (owner in ('str', 'sanctions')),
  until    timestamptz not null,
  set_by   uuid,
  set_at   timestamptz not null default now(),
  primary key (user_id, owner)
);
comment on table private.hold_claims is
  'SCUML items 6 and 8. Each compliance desk''s own claim on a person''s money hold. public.account_money_holds follows the latest live claim (private.hold_recompute), and private.money_hold_until reads live claims too. No grants.';

create table if not exists private.hold_rows (
  user_id         uuid primary key,
  written_until   timestamptz,
  absorbed_until  timestamptz,
  written_at      timestamptz not null default now()
);
comment on table private.hold_rows is
  'SCUML items 6 and 8. The end private.hold_recompute last wrote to a person''s account_money_holds row, so a plain row written by anything else (a freeze not yet registered as a claim) is recognised and left alone. No grants.';

create table if not exists private.str_holds (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references private.str_cases(id),
  user_id     uuid not null,
  hold_until  timestamptz not null,
  placed_by   uuid not null,
  placed_at   timestamptz not null default now()
);
create index if not exists str_holds_user_idx on private.str_holds (user_id, placed_at desc);
create index if not exists str_holds_case_idx on private.str_holds (case_id);
comment on table private.str_holds is
  'SCUML item 6. A log of every STR hold placed: the case, the person, the end of the ''str'' claim it set, who and when. Append-only, kept five years.';

create table if not exists private.str_hold_releases (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references private.str_cases(id),
  user_id       uuid not null,
  note          text not null check (length(btrim(note)) between 5 and 2000),
  requested_by  uuid not null,
  requested_at  timestamptz not null default now()
);
create index if not exists str_hold_releases_case_idx on private.str_hold_releases (case_id);
comment on table private.str_hold_releases is
  'SCUML items 6 and 19. A request to end an STR hold, waiting on a second staff member. Append-only.';

create table if not exists private.str_hold_release_decisions (
  release_id   uuid primary key references private.str_hold_releases(id),
  outcome      text not null check (outcome in ('released', 'expired', 'other_hold')),
  approved_by  uuid not null,
  decided_at   timestamptz not null default now()
);
comment on table private.str_hold_release_decisions is
  'SCUML items 6 and 19. The second person''s answer to a release request: released, expired, or other_hold when something else still holds the money. Append-only.';

/* Born locked: RLS on, nothing granted to any API role. Definer functions only. */
do $locked$
declare t text;
begin
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register',
                           'str_nudges', 'hold_claims', 'hold_rows', 'str_holds', 'str_hold_releases',
                           'str_hold_release_decisions'] loop
    execute format('alter table private.%I enable row level security', t);
    execute format('revoke all on table private.%I from public, anon, authenticated, service_role', t);
  end loop;
end;
$locked$;

/* APPEND-ONLY and NO TRUNCATE, whoever asks. */
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
revoke all on function private.str_refuse_change() from public, anon, authenticated;

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
revoke all on function private.str_refuse_truncate() from public, anon, authenticated;

do $append_only$
declare t text;
begin
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register',
                           'str_holds', 'str_hold_releases', 'str_hold_release_decisions'] loop
    execute format('drop trigger if exists %I on private.%I', t || '_append_only', t);
    execute format('create trigger %I before update or delete on private.%I for each row execute function private.str_refuse_change()',
                   t || '_append_only', t);
  end loop;
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register', 'str_nudges',
                           'str_holds', 'str_hold_releases', 'str_hold_release_decisions'] loop
    execute format('drop trigger if exists %I on private.%I', t || '_no_truncate', t);
    execute format('create trigger %I before truncate on private.%I for each statement execute function private.str_refuse_truncate()',
                   t || '_no_truncate', t);
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
revoke all on function private.str_approver_is_second() from public, anon, authenticated;

drop trigger if exists str_approvals_second_person on private.str_approvals;
create trigger str_approvals_second_person
  before insert on private.str_approvals
  for each row execute function private.str_approver_is_second();

-- ----------------------------------------------------------------------------
-- WHERE A CASE STANDS, AND WHO IS ON IT

/* open | awaiting_approval | to_file | filed | not_filed */
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

/* Staff notices, never to a party. */
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
-- THE SHARED HOLD MODEL

create or replace function private.hold_recompute(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest timestamptz;
  v_row public.account_money_holds%rowtype;
  v_written timestamptz;
  v_absorbed timestamptz;
  v_new timestamptz;
begin
  select max(c.until) into v_latest from private.hold_claims c where c.user_id = p_user and c.until > now();
  select * into v_row from public.account_money_holds h where h.user_id = p_user for update;
  select w.written_until, w.absorbed_until into v_written, v_absorbed from private.hold_rows w where w.user_id = p_user;
  if v_absorbed is not null and v_absorbed <= now() then v_absorbed := null; end if;

  if v_row.user_id is null then
    if v_latest is null then return; end if;
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (p_user, v_latest, 'plain', now());
    v_new := v_latest;
  elsif v_row.hold_until > now() and v_row.reason <> 'plain' then
    /* Somebody else's live hold (a "this was not me" hold): not touched at
       all. The claims stay pending (and money_hold_until still enforces
       them); the sweep hands over when it ends. */
    return;
  elsif v_row.hold_until > now() then
    /* A live plain row this model did not write is an unregistered freeze:
       remember its end, and never go below it while it is live. */
    if v_written is distinct from v_row.hold_until then
      v_absorbed := v_row.hold_until;
    end if;
    v_new := coalesce(v_latest, now());
    if v_absorbed is not null then v_new := greatest(v_new, v_absorbed); end if;
    if v_new is distinct from v_row.hold_until then
      update public.account_money_holds set hold_until = v_new where user_id = p_user;
    end if;
  elsif v_latest is not null then
    /* A hold that has ended is replaced by the pending claims. */
    update public.account_money_holds set hold_until = v_latest, reason = 'plain' where user_id = p_user;
    v_new := v_latest;
    v_absorbed := null;
  else
    return;
  end if;

  if v_written is distinct from v_new
     or v_absorbed is distinct from (select w.absorbed_until from private.hold_rows w where w.user_id = p_user) then
    insert into private.hold_rows (user_id, written_until, absorbed_until, written_at)
    values (p_user, v_new, v_absorbed, now())
    on conflict (user_id) do update
      set written_until = excluded.written_until, absorbed_until = excluded.absorbed_until, written_at = now();
  end if;
end;
$$;

create or replace function private.hold_claims_sweep()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
  n integer := 0;
begin
  /* An account that is gone takes its claims and its row record with it; the
     compliance record of the hold stays in str_holds and the audit log. */
  delete from private.hold_claims c where not exists (select 1 from auth.users a where a.id = c.user_id);
  delete from private.hold_rows w where not exists (select 1 from auth.users a where a.id = w.user_id);

  for u in
    select distinct c.user_id from private.hold_claims c
     where c.until > now() and exists (select 1 from auth.users a where a.id = c.user_id)
  loop
    begin
      perform private.hold_recompute(u);
      n := n + 1;
    exception when others then
      raise warning 'hold_claims_sweep: % could not be recomputed: %', u, sqlerrm;
    end;
  end loop;
  return n;
end;
$$;

create or replace function private.hold_claim_set(p_user uuid, p_owner text, p_until timestamptz, p_by uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_until timestamptz;
begin
  insert into private.hold_claims as hc (user_id, owner, until, set_by, set_at)
  values (p_user, p_owner, p_until, p_by, now())
  on conflict (user_id, owner) do update
    set until = greatest(hc.until, excluded.until), set_by = excluded.set_by, set_at = now()
  returning until into v_until;
  perform private.hold_recompute(p_user);
  return v_until;
end;
$$;

create or replace function private.hold_claim_clear(p_user uuid, p_owner text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare had boolean;
begin
  delete from private.hold_claims c where c.user_id = p_user and c.owner = p_owner;
  had := found;
  perform private.hold_recompute(p_user);
  return had;
end;
$$;

revoke all on function private.hold_recompute(uuid) from public, anon, authenticated, service_role;
revoke all on function private.hold_claims_sweep() from public, anon, authenticated, service_role;
revoke all on function private.hold_claim_set(uuid, text, timestamptz, uuid) from public, anon, authenticated, service_role;
revoke all on function private.hold_claim_clear(uuid, text) from public, anon, authenticated, service_role;

/* The service role's door to the sweep, and nobody else's. */
create or replace function public.hold_claims_sweep()
returns integer
language sql
security definer
set search_path = ''
as $$ select private.hold_claims_sweep() $$;
revoke all on function public.hold_claims_sweep() from public, anon, authenticated;
grant execute on function public.hold_claims_sweep() to service_role;

/* THE HOLD IS ENFORCED FROM THE CLAIMS TOO: the live payout-account triggers
   read this, so a live compliance claim stops a payout or bank account change
   even in the minute before the sweep writes the row. */
create or replace function private.money_hold_until(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select greatest(
    (select h.hold_until from public.account_money_holds h
      where h.user_id = p_user and h.hold_until > now()),
    (select max(c.until) from private.hold_claims c
      where c.user_id = p_user and c.until > now()));
$function$;

/* The refusal names no date and no cause when the hold is a compliance one. */
create or replace function private.refuse_money_out_during_hold()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owner uuid;
  until timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.account_number is not distinct from old.account_number
       and new.bank_code is not distinct from old.bank_code then
      return new;
    end if;
  end if;
  if tg_table_name = 'bank_accounts' then
    v_owner := new.user_id;
  else
    select a.user_id into v_owner from public.agents a where a.id = new.agent_id;
  end if;
  until := private.money_hold_until(v_owner);
  if until is not null then
    if exists (select 1 from private.hold_claims c where c.user_id = v_owner and c.until > now())
       or exists (select 1 from public.account_money_holds h
                   where h.user_id = v_owner and h.hold_until > now() and h.reason = 'plain') then
      raise exception 'A new payout account cannot be added to this account right now.'
        using errcode = 'RM050';
    end if;
    raise exception 'A new payout account cannot be added to this account until %.',
      to_char(until at time zone 'Africa/Lagos', 'FMDD Month YYYY, HH24:MI')
      using errcode = 'RM050';
  end if;
  return new;
end;
$function$;

-- ----------------------------------------------------------------------------
-- THE STR DESK ON THE MODEL: PLACING NEVER SHORTER, RELEASING BY TWO

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
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if private.str_state(p_case) = 'not_filed' then return jsonb_build_object('status', 'closed'); end if;

  /* A rolling 30 days on this desk's own claim; the row follows the claims. */
  v_until := private.hold_claim_set(c.subject_id, 'str', v_until, actor);

  insert into private.str_holds (case_id, user_id, hold_until, placed_by)
  values (p_case, c.subject_id, v_until, actor);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_placed', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'until', v_until));
  return jsonb_build_object('status', 'held', 'until', v_until);
end;
$$;
revoke all on function public.str_place_hold(uuid) from public, anon;
grant execute on function public.str_place_hold(uuid) to authenticated;

create or replace function public.str_release_hold(p_case uuid, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  c private.str_cases%rowtype;
  v_request uuid;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then return jsonb_build_object('status', 'note_needed'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if not exists (select 1 from private.hold_claims h where h.user_id = c.subject_id and h.owner = 'str' and h.until > now()) then
    return jsonb_build_object('status', 'no_hold');
  end if;
  if exists (select 1 from private.str_hold_releases r
              where r.case_id = p_case
                and not exists (select 1 from private.str_hold_release_decisions d where d.release_id = r.id)) then
    return jsonb_build_object('status', 'release_waiting');
  end if;

  insert into private.str_hold_releases (case_id, user_id, note, requested_by)
  values (p_case, c.subject_id, btrim(p_note), actor)
  returning id into v_request;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_release_asked', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'release_id', v_request));

  perform private.str_tell_staff(
    'An STR hold release needs a second person',
    'A request to end a money hold placed from a Suspicious Transaction Report case waits for a staff member other than the one who asked.',
    p_case);
  return jsonb_build_object('status', 'release_asked', 'release_id', v_request);
end;
$$;
revoke all on function public.str_release_hold(uuid, text) from public, anon;
grant execute on function public.str_release_hold(uuid, text) to authenticated;

create or replace function public.str_approve_release(p_release uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  r private.str_hold_releases%rowtype;
  v_had boolean;
  v_outcome text;
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  select * into r from private.str_hold_releases x where x.id = p_release;
  if r.id is null then return 'not_found'; end if;
  perform 1 from private.str_cases c where c.id = r.case_id for update;
  if private.str_is_party(r.case_id, actor) then return 'conflicted'; end if;
  if exists (select 1 from private.str_hold_release_decisions d where d.release_id = p_release) then return 'already'; end if;
  /* SCUML item 19. */
  if r.requested_by = actor then return 'same_person'; end if;

  /* Was this desk's claim still live? Read before the clear. Then clear only
     this desk's claim, and look at the money in a separate statement. */
  v_had := exists (select 1 from private.hold_claims h
                    where h.user_id = r.user_id and h.owner = 'str' and h.until > now());
  perform private.hold_claim_clear(r.user_id, 'str');
  if private.money_hold_until(r.user_id) is not null then
    v_outcome := 'other_hold';
  elsif v_had then
    v_outcome := 'released';
  else
    v_outcome := 'expired';
  end if;

  insert into private.str_hold_release_decisions (release_id, outcome, approved_by)
  values (p_release, v_outcome, actor);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_release_' || v_outcome, 'str_case', r.case_id::text,
          jsonb_build_object('scuml_item', 6, 'release_id', p_release));
  return v_outcome;
end;
$$;
revoke all on function public.str_approve_release(uuid) from public, anon;
grant execute on function public.str_approve_release(uuid) to authenticated;

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

create or replace function public.str_pending_releases()
returns table (release_id uuid, case_id uuid, note text, requested_by uuid, requested_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if not private.str_is_staff(me) then return; end if;
  return query
    select r.id, r.case_id, r.note, r.requested_by, r.requested_at
      from private.str_hold_releases r
     where not exists (select 1 from private.str_hold_release_decisions d where d.release_id = r.id)
       and not private.str_is_party(r.case_id, me)
     order by r.requested_at
     limit 200;
end;
$$;
revoke all on function public.str_pending_releases() from public, anon;
grant execute on function public.str_pending_releases() to authenticated;

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

-- ----------------------------------------------------------------------------
-- THE JOBS

select cron.unschedule(j.jobname) from cron.job j
 where j.jobname in ('vallo_str_nudge_overdue', 'vallo_hold_claims_sweep');
select cron.schedule('vallo_str_nudge_overdue', '17 * * * *', 'select private.str_nudge_overdue();');
select cron.schedule('vallo_hold_claims_sweep', '* * * * *', 'select private.hold_claims_sweep();');

-- ----------------------------------------------------------------------------
-- READ-BACK

do $readback$
declare
  bad text := '';
  t text;
begin
  foreach t in array array['str_cases', 'str_case_links', 'str_decisions', 'str_approvals', 'str_register',
                           'str_nudges', 'hold_claims', 'hold_rows', 'str_holds', 'str_hold_releases',
                           'str_hold_release_decisions'] loop
    if not (select relrowsecurity from pg_class where oid = ('private.' || t)::regclass) then
      bad := bad || format(' [%s has RLS off]', t);
    end if;
    if has_table_privilege('authenticated', 'private.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('anon', 'private.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('service_role', 'private.' || t, 'SELECT, INSERT, UPDATE, DELETE') then
      bad := bad || format(' [%s is reachable by an API role]', t);
    end if;
  end loop;
  if has_function_privilege('anon', 'public.str_open_case(text, text, uuid, text)', 'execute') then bad := bad || ' [anon can open a case]'; end if;
  if has_function_privilege('authenticated', 'private.str_nudge_overdue()', 'execute') then bad := bad || ' [a member can run the nudge]'; end if;
  if has_function_privilege('authenticated', 'private.str_is_party(uuid, uuid)', 'execute') then bad := bad || ' [parties can be probed]'; end if;
  if has_function_privilege('anon', 'public.str_approve_release(uuid)', 'execute') then bad := bad || ' [anon can release]'; end if;
  if has_function_privilege('authenticated', 'private.hold_claim_set(uuid, text, timestamptz, uuid)', 'execute')
     or has_function_privilege('service_role', 'private.hold_claim_clear(uuid, text)', 'execute') then
    bad := bad || ' [a claim can be set from outside]';
  end if;
  if has_function_privilege('authenticated', 'public.hold_claims_sweep()', 'execute')
     or has_function_privilege('anon', 'public.hold_claims_sweep()', 'execute')
     or not has_function_privilege('service_role', 'public.hold_claims_sweep()', 'execute') then
    bad := bad || ' [the sweep door is wrong]';
  end if;
  if exists (select 1 from pg_proc p where p.proname = 'str_place_hold' and pg_get_functiondef(p.oid) like '%staff_review%') then
    bad := bad || ' [the hold writes a telling reason]';
  end if;
  if to_regprocedure('public.str_place_hold(uuid, integer)') is not null then bad := bad || ' [the hours form of the hold is here]'; end if;
  if exists (select 1 from pg_proc p where p.proname = 'str_release_hold'
               and pg_get_functiondef(p.oid) like '%hold_claim_clear%') then
    bad := bad || ' [asking for a release ends the hold]';
  end if;
  if position('hold_claims' in pg_get_functiondef('private.money_hold_until(uuid)'::regprocedure)) = 0 then
    bad := bad || ' [money_hold_until does not read the claims]';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bank_accounts_00_money_hold' and tgenabled = 'O')
     or not exists (select 1 from pg_trigger where tgname = 'payout_accounts_00_money_hold' and tgenabled = 'O') then
    bad := bad || ' [the live money-hold triggers are not both on]';
  end if;
  if (select count(*) from cron.job where jobname in ('vallo_str_nudge_overdue', 'vallo_hold_claims_sweep')) <> 2 then
    bad := bad || ' [the STR jobs are not scheduled]';
  end if;
  if bad <> '' then raise exception 'SCUML item 6 READ-BACK FAILED:%', bad; end if;
end;
$readback$;

-- ----------------------------------------------------------------------------
-- PROBE (rolled back): a case about a person, decided by one staff member and
-- approved by a second, filed with its goAML reference; a hold placed as a
-- claim writes a neutral `plain` row that stops a new bank account with a
-- sentence naming no date; the subject is told nothing; a staff member who is
-- the subject of a case cannot act on it; a release asked by one and approved
-- by a second ends the hold; the tables refuse edits.
do $probe$
declare
  v_subject uuid := gen_random_uuid();
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_ans jsonb;
  v_txt text;
  v_case uuid;
  v_case2 uuid;
  v_decision uuid;
  v_release uuid;
  v_err text;
  v_before bigint;
  v_holds_before bigint;
begin
  select count(*) into v_before from private.str_cases;
  select count(*) into v_holds_before from public.account_money_holds;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values (v_subject, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml6-probe-subject@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
           (v_s1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml6-probe-staff1@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
           (v_s2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml6-probe-staff2@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}');
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin');

    -- A member is refused.
    perform set_config('request.jwt.claims', json_build_object('sub', v_subject, 'role', 'authenticated')::text, true);
    v_ans := public.str_open_case('person', v_s1::text, null, 'A member trying to open a case on somebody else.');
    if v_ans->>'status' <> 'forbidden' then raise exception 'PROBE FAILED: a member opened a case: %', v_ans; end if;
    if exists (select 1 from public.str_cases()) then raise exception 'PROBE FAILED: a member read the cases'; end if;

    -- Staff 1 opens and decides.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.str_open_case('person', v_subject::text, null, 'Repeated large move-in charges from unrelated cards within a week.');
    if v_ans->>'status' <> 'opened' then raise exception 'PROBE FAILED: open answered %', v_ans; end if;
    v_case := (v_ans->>'case_id')::uuid;
    v_ans := public.str_decide(v_case, 'file', 'The pattern matches card testing followed by structuring below the threshold.');
    if v_ans->>'status' <> 'decided' then raise exception 'PROBE FAILED: decide answered %', v_ans; end if;
    v_decision := (v_ans->>'decision_id')::uuid;
    v_txt := public.str_approve(v_decision, true, null);
    if v_txt <> 'same_person' then raise exception 'PROBE FAILED: the decider approved their own decision: %', v_txt; end if;

    -- Staff 2 approves; staff 1 records the filing.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_txt := public.str_approve(v_decision, true, null);
    if v_txt <> 'approved' then raise exception 'PROBE FAILED: approve answered %', v_txt; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_txt := public.str_record_filing(v_case, 'GOAML-PROBE-001', now() - interval '1 day');
    if v_txt <> 'before_approval' then raise exception 'PROBE FAILED: a filing predating approval was accepted: %', v_txt; end if;
    v_txt := public.str_record_filing(v_case, 'GOAML-PROBE-001', now());
    if v_txt <> 'recorded' then raise exception 'PROBE FAILED: filing answered %', v_txt; end if;
    if private.str_state(v_case) <> 'filed' then raise exception 'PROBE FAILED: the case is not filed'; end if;
    if not exists (select 1 from public.str_register() r where r.case_id = v_case and r.goaml_reference = 'GOAML-PROBE-001') then
      raise exception 'PROBE FAILED: the register does not show the filing';
    end if;

    -- The hold, as a claim; a neutral row; the refusal names no date.
    v_ans := public.str_place_hold(v_case);
    if v_ans->>'status' <> 'held' then raise exception 'PROBE FAILED: hold answered %', v_ans; end if;
    if not exists (select 1 from public.account_money_holds h where h.user_id = v_subject and h.reason = 'plain'
                     and h.hold_until > now() + interval '29 days') then
      raise exception 'PROBE FAILED: no neutral 30-day hold row';
    end if;
    if not exists (select 1 from private.hold_claims c where c.user_id = v_subject and c.owner = 'str') then
      raise exception 'PROBE FAILED: no str claim';
    end if;
    begin
      insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
      values (v_subject, '058', 'Probe Bank', '0123456789', 'PROBE SUBJECT', now());
      raise exception 'PROBE FAILED: a held person added a bank account';
    exception when sqlstate 'RM050' then
      v_err := sqlerrm;
      if v_err <> 'A new payout account cannot be added to this account right now.' then
        raise exception 'PROBE FAILED: the refusal is not neutral: %', v_err;
      end if;
    end;
    if exists (select 1 from public.notifications n where n.user_id = v_subject) then
      raise exception 'PROBE FAILED: the subject was told something';
    end if;
    if not exists (select 1 from public.notifications n where n.user_id = v_s2 and n.href like '/admin/compliance?tab=str%') then
      raise exception 'PROBE FAILED: staff were not told';
    end if;

    -- A claim alone (no row yet) is enforced: the minute before the sweep.
    delete from public.account_money_holds where user_id = v_subject;
    if private.money_hold_until(v_subject) is null then
      raise exception 'PROBE FAILED: a live claim with no row does not hold';
    end if;
    -- Two statements: one query's snapshot would not see the sweep's own write.
    if public.hold_claims_sweep() < 1 then
      raise exception 'PROBE FAILED: the sweep recomputed nobody';
    end if;
    if not exists (select 1 from public.account_money_holds h where h.user_id = v_subject and h.reason = 'plain') then
      raise exception 'PROBE FAILED: the sweep did not rewrite the row from the claim';
    end if;

    -- A staff member who is the subject of a case cannot act on it.
    v_ans := public.str_open_case('person', v_s2::text, null, 'A staff member is the subject of this probe case.');
    v_case2 := (v_ans->>'case_id')::uuid;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.str_decide(v_case2, 'no_file', 'Trying to decide my own case, which must be refused.');
    if v_ans->>'status' <> 'conflicted' then raise exception 'PROBE FAILED: a party decided their own case: %', v_ans; end if;
    if exists (select 1 from public.str_cases() c where c.id = v_case2) then
      raise exception 'PROBE FAILED: a party can see their own case';
    end if;

    -- Release: asked by staff 2, refused to staff 2, approved by staff 1.
    v_ans := public.str_release_hold(v_case, 'Grounds cleared by the NFIU acknowledgement.');
    if v_ans->>'status' <> 'release_asked' then raise exception 'PROBE FAILED: release ask answered %', v_ans; end if;
    v_release := (v_ans->>'release_id')::uuid;
    if exists (select 1 from public.account_money_holds h where h.user_id = v_subject and h.hold_until <= now()) then
      raise exception 'PROBE FAILED: asking ended the hold';
    end if;
    if public.str_approve_release(v_release) <> 'same_person' then raise exception 'PROBE FAILED: the asker approved the release'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_txt := public.str_approve_release(v_release);
    if v_txt <> 'released' then raise exception 'PROBE FAILED: release answered %', v_txt; end if;
    if private.money_hold_until(v_subject) is not null then raise exception 'PROBE FAILED: still held after release'; end if;

    -- The record refuses edits.
    begin
      update private.str_cases set grounds = grounds || ' edited' where id = v_case;
      raise exception 'PROBE FAILED: a case was edited';
    exception when insufficient_privilege then null;
    end;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from private.str_cases) <> v_before
     or (select count(*) from public.account_money_holds) <> v_holds_before
     or exists (select 1 from auth.users where id in (v_subject, v_s1, v_s2)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
