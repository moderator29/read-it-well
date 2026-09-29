/*
 * SCUML ITEMS 20 AND 15 (with 19): POLITICALLY EXPOSED PERSONS, AND EVERY
 * CUSTOMER CLASSIFIED HIGH, MEDIUM OR LOW RISK, ON THE LIVE TABLES.
 *
 * WHY THIS MIGRATION. 20260924175000 (item 20), 175100 (item 15) and 175200
 * (their review fixes) were committed and never applied: they attached the
 * PEP watch to public.escrows and public.wallet_entries and read escrows and
 * wallets for the risk volume and population. Since 25 September 2026 Vallo
 * holds no customer money (docs/MONEY_ARCHITECTURE.md, ADR 0002). This file is
 * the three as their final (175200) state with every custody read replaced by
 * the live money record: a settled charge in public.transactions, with its
 * booking, its payee (transactions.payee_user_id) and, for a Lagos move-in,
 * its public.rent_payments row. Nothing here names a custody object.
 *
 * ITEM 20, PEPs.
 *   pep_declarations  the lister's own answer, dated (asked at verification and
 *                     at payout account setup). A member without an agents row
 *                     is never asked: answer_pep_question refuses them.
 *   pep_flags         staff's own record, set at once; taking somebody OFF the
 *                     record is a proposal until a second person approves it
 *                     (pep_clear_approvals).
 *   who is a PEP      the latest effective staff record decides; failing that,
 *                     anybody who ever declared yes. A later "no" never
 *                     supersedes a yes.
 *   edd_reviews       every settled charge a PEP is party to (payer, lister,
 *                     payee, tenant) raises a review, as does a yes answer or a
 *                     staff flag; item 15 raises its own for high risk.
 *   edd_decisions and edd_approvals: source of funds and an outcome, then a
 *                     SECOND person approves (the table refuses the decider).
 *
 * ITEM 15, RISK CLASSES.
 *   risk_classes      append-only history; the latest row IN FORCE is the class.
 *                     A class lowered by hand is only in force once a second
 *                     person approves it (risk_override_approvals).
 *   risk_factors_for  the documented factors for one person, from live tables:
 *                     PEP, sanctions hit (the item 8 hook, replaced by the
 *                     sanctions migration), lister, identity rung, volume over
 *                     90 days (every settled charge the person paid, listed or
 *                     received, in kobo), open reports, upheld fraud.
 *   the rules         are NOT here: apps/web/src/lib/compliance/risk-rules.ts
 *                     (classifyRisk) is the one rule set; the risk-classes job
 *                     reads the factors, classifies, and writes through
 *                     record_derived_risk_class.
 *   the gates         a HIGH person who is a lister needs an item 15 review
 *                     decided "cleared" and approved by two people since they
 *                     became high before a listing publishes or a payout or bank
 *                     account is added. A member (no agents row) is never
 *                     blocked by a rule: their bank account goes through and a
 *                     review is raised; staff can hold through the STR desk.
 *
 * MONEY CODE IS NEVER BLOCKED. The PEP watch is an AFTER trigger on
 * public.transactions that only enqueues, inside its own exception block. The
 * gates are BEFORE triggers on listings, payout_accounts and bank_accounts that
 * only refuse a lister's change; they never touch a charge.
 *
 * NOTHING IS PUBLIC. Every table is born locked (RLS on, no policy, nothing
 * granted to anon or authenticated; the service role may read). Reads go
 * through definer functions that answer staff only; the only thing a person
 * reads back is the date they last answered the PEP question. A gate refusal
 * says a check is needed and nothing about why. Not a public score (V-21).
 *
 * KEPT FIVE YEARS, APPEND ONLY (private.aml_append_only). Account deletion
 * tombstones the auth user, so the uuid stays; an outright delete would set
 * the person column to null, the one change the guard allows.
 */

set local lock_timeout = '5s';

/* ------------------------------------------------------------------------ */
/* Shared: who is staff, and the append-only guard.                         */
/* ------------------------------------------------------------------------ */

create or replace function private.aml_staff(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and exists (
    select 1 from public.user_roles r
     where r.user_id = p_user
       and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
  );
$$;
revoke all on function private.aml_staff(uuid) from public, anon, authenticated;
comment on function private.aml_staff(uuid) is
  'SCUML items 20 and 15: admin or super_admin. The one staff test the compliance functions use.';

create or replace function private.aml_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  o jsonb;
  n jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    raise exception 'This is a compliance record (SCUML). It is kept for five years and is never deleted.'
      using errcode = 'RM175';
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach k in array tg_argv loop
    if n -> k = 'null'::jsonb then
      o := o - k;
      n := n - k;
    end if;
  end loop;
  if o is distinct from n then
    raise exception 'This is a compliance record (SCUML). It is never edited; record a new row instead.'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.aml_append_only() from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* The records.                                                             */
/* ------------------------------------------------------------------------ */

create table if not exists public.pep_declarations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  is_pep      boolean not null,
  relation    text check (relation in ('self', 'family', 'associate')),
  role        text check (role is null or char_length(btrim(role)) between 2 and 200),
  asked_at    text not null check (asked_at in ('verification', 'payout')),
  declared_at timestamptz not null default clock_timestamp(),
  constraint pep_declarations_role_with_yes check (
    (is_pep and relation is not null and role is not null)
    or (not is_pep and relation is null and role is null)
  )
);
create index if not exists pep_declarations_user_idx on public.pep_declarations (user_id, declared_at desc);
comment on table public.pep_declarations is
  'SCUML item 20: a lister''s own answer to the PEP question, dated. Staff only; append only; kept five years (docs/RETENTION_SCHEDULE.md 3.3a).';

create table if not exists public.pep_flags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users(id) on delete set null,
  flagged  boolean not null,
  relation text check (relation in ('self', 'family', 'associate')),
  role     text check (role is null or char_length(btrim(role)) between 2 and 200),
  note     text not null check (char_length(btrim(note)) between 2 and 600),
  set_by   uuid references auth.users(id) on delete set null,
  set_at   timestamptz not null default clock_timestamp()
);
create index if not exists pep_flags_user_idx on public.pep_flags (user_id, set_at desc);
create index if not exists pep_flags_set_by_idx on public.pep_flags (set_by);
comment on table public.pep_flags is
  'SCUML item 20: staff''s own PEP record of a person, set or (with a second person) cleared, dated. Staff only; append only; kept five years.';

create table if not exists public.edd_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  scuml_item   smallint not null check (scuml_item in (15, 20)),
  reason       text not null check (reason in ('transaction', 'declaration', 'staff_flag', 'high_risk', 'reopened', 'member_account')),
  source_table text not null,
  source_id    uuid not null,
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  raised_at    timestamptz not null default clock_timestamp()
);
create unique index if not exists edd_reviews_one_per_source
  on public.edd_reviews (scuml_item, source_table, source_id, user_id);
create index if not exists edd_reviews_user_idx on public.edd_reviews (user_id, raised_at desc);
comment on table public.edd_reviews is
  'SCUML items 20 and 15: enhanced due diligence work items. Raised by AFTER triggers and definer functions only; source_table names the live record (transactions, pep_declarations, pep_flags, risk_classes, bank_accounts, edd_reopen). Staff only; append only; kept five years.';

create table if not exists public.edd_decisions (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null references public.edd_reviews(id) on delete restrict,
  source_of_funds text not null check (char_length(btrim(source_of_funds)) between 2 and 1000),
  outcome         text not null check (outcome in ('cleared', 'refer')),
  note            text check (note is null or char_length(note) <= 1000),
  decided_by      uuid references auth.users(id) on delete set null,
  decided_at      timestamptz not null default clock_timestamp()
);
create index if not exists edd_decisions_review_idx on public.edd_decisions (review_id, decided_at desc);
create index if not exists edd_decisions_decided_by_idx on public.edd_decisions (decided_by);
comment on table public.edd_decisions is
  'SCUML items 20 and 15: the source of funds staff recorded and their outcome. Takes effect only when a second person approves (edd_approvals).';

create table if not exists public.edd_approvals (
  id          uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.edd_decisions(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default clock_timestamp()
);
create index if not exists edd_approvals_approved_by_idx on public.edd_approvals (approved_by);
comment on table public.edd_approvals is
  'SCUML items 20, 15 and 19: the second person''s approval of an EDD decision. The approver is never the decider.';

create table if not exists public.pep_clear_approvals (
  id          uuid primary key default gen_random_uuid(),
  flag_id     uuid not null unique references public.pep_flags(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default clock_timestamp()
);
create index if not exists pep_clear_approvals_approved_by_idx on public.pep_clear_approvals (approved_by);
comment on table public.pep_clear_approvals is
  'SCUML items 20 and 19: the second person''s approval of taking somebody off the PEP record. Staff only; append only; kept five years.';

create table if not exists public.risk_classes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  risk_class     text not null check (risk_class in ('high', 'medium', 'low')),
  factors        jsonb not null,
  reasons        text[] not null default '{}',
  source         text not null check (source in ('derived', 'override')),
  reason         text check (reason is null or char_length(btrim(reason)) between 10 and 600),
  set_by         uuid references auth.users(id) on delete set null,
  set_at         timestamptz not null default clock_timestamp(),
  review_due_at  timestamptz not null,
  needs_approval boolean not null default false,
  constraint risk_classes_override_has_reason check (source = 'derived' or reason is not null),
  constraint risk_classes_due_after_set check (review_due_at > set_at)
);
create index if not exists risk_classes_user_idx on public.risk_classes (user_id, set_at desc);
create index if not exists risk_classes_set_by_idx on public.risk_classes (set_by);
comment on table public.risk_classes is
  'SCUML item 15: each person''s risk class, dated, as an append-only history; the latest row in force is the class. Staff only, never shown to the person, not a public score (V-21). Kept five years.';
comment on column public.risk_classes.needs_approval is
  'SCUML items 15 and 19: an override that lowers the class. It has no effect until risk_override_approvals holds a second person''s approval.';

create table if not exists public.risk_override_approvals (
  id            uuid primary key default gen_random_uuid(),
  risk_class_id uuid not null unique references public.risk_classes(id) on delete restrict,
  approved_by   uuid references auth.users(id) on delete set null,
  approved_at   timestamptz not null default clock_timestamp()
);
create index if not exists risk_override_approvals_approved_by_idx on public.risk_override_approvals (approved_by);
comment on table public.risk_override_approvals is
  'SCUML items 15 and 19: the second person''s approval of a class lowered by hand. Staff only; append only; kept five years.';

/* Born locked: RLS on, no policy; nothing for anon or authenticated; the
   service role may read (the risk job reads through functions anyway). */
do $locked$
declare t text;
begin
  foreach t in array array['pep_declarations', 'pep_flags', 'edd_reviews', 'edd_decisions', 'edd_approvals',
                           'pep_clear_approvals', 'risk_classes', 'risk_override_approvals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to service_role', t);
  end loop;
end;
$locked$;

drop trigger if exists pep_declarations_append_only on public.pep_declarations;
create trigger pep_declarations_append_only
  before update or delete on public.pep_declarations
  for each row execute function private.aml_append_only('user_id');
drop trigger if exists pep_flags_append_only on public.pep_flags;
create trigger pep_flags_append_only
  before update or delete on public.pep_flags
  for each row execute function private.aml_append_only('user_id', 'set_by');
drop trigger if exists edd_reviews_append_only on public.edd_reviews;
create trigger edd_reviews_append_only
  before update or delete on public.edd_reviews
  for each row execute function private.aml_append_only('user_id');
drop trigger if exists edd_decisions_append_only on public.edd_decisions;
create trigger edd_decisions_append_only
  before update or delete on public.edd_decisions
  for each row execute function private.aml_append_only('decided_by');
drop trigger if exists edd_approvals_append_only on public.edd_approvals;
create trigger edd_approvals_append_only
  before update or delete on public.edd_approvals
  for each row execute function private.aml_append_only('approved_by');
drop trigger if exists pep_clear_approvals_append_only on public.pep_clear_approvals;
create trigger pep_clear_approvals_append_only
  before update or delete on public.pep_clear_approvals
  for each row execute function private.aml_append_only('approved_by');
drop trigger if exists risk_classes_append_only on public.risk_classes;
create trigger risk_classes_append_only
  before update or delete on public.risk_classes
  for each row execute function private.aml_append_only('user_id', 'set_by');
drop trigger if exists risk_override_approvals_append_only on public.risk_override_approvals;
create trigger risk_override_approvals_append_only
  before update or delete on public.risk_override_approvals
  for each row execute function private.aml_append_only('approved_by');

/* ------------------------------------------------------------------------ */
/* The two-person rules, in the tables, so no code path can skip them.      */
/* ------------------------------------------------------------------------ */

create or replace function private.edd_approver_is_not_the_decider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  decider uuid;
begin
  select d.decided_by into decider from public.edd_decisions d where d.id = new.decision_id;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve a due diligence decision.' using errcode = '42501';
  end if;
  if decider is null or decider = new.approved_by then
    raise exception 'A second person must approve this. The person who decided cannot approve their own decision (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.edd_approver_is_not_the_decider() from public, anon, authenticated;

drop trigger if exists edd_approvals_two_people on public.edd_approvals;
create trigger edd_approvals_two_people
  before insert on public.edd_approvals
  for each row execute function private.edd_approver_is_not_the_decider();

create or replace function private.pep_clear_two_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.pep_flags;
begin
  select * into f from public.pep_flags where id = new.flag_id;
  if f.id is null or f.flagged then
    raise exception 'Only a proposal to take somebody off the record can be approved.' using errcode = '22023';
  end if;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve this.' using errcode = '42501';
  end if;
  if f.set_by is null or f.set_by = new.approved_by then
    raise exception 'A second person must approve this. The person who proposed it cannot approve it (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.pep_clear_two_people() from public, anon, authenticated;

drop trigger if exists pep_clear_approvals_two_people on public.pep_clear_approvals;
create trigger pep_clear_approvals_two_people
  before insert on public.pep_clear_approvals
  for each row execute function private.pep_clear_two_people();

create or replace function private.risk_override_two_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.risk_classes;
begin
  select * into r from public.risk_classes where id = new.risk_class_id;
  if r.id is null or not r.needs_approval then
    raise exception 'Only a lowered class waiting on approval can be approved.' using errcode = '22023';
  end if;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve this.' using errcode = '42501';
  end if;
  if r.set_by is null or r.set_by = new.approved_by then
    raise exception 'A second person must approve this. The person who proposed it cannot approve it (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.risk_override_two_people() from public, anon, authenticated;

drop trigger if exists risk_override_approvals_two_people on public.risk_override_approvals;
create trigger risk_override_approvals_two_people
  before insert on public.risk_override_approvals
  for each row execute function private.risk_override_two_people();

/* ------------------------------------------------------------------------ */
/* Item 20: who is a PEP, and the watch.                                    */
/* ------------------------------------------------------------------------ */

create or replace function private.is_pep(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s_flag boolean;
  s_at timestamptz;
begin
  if p_user is null then
    return false;
  end if;
  /* The latest EFFECTIVE staff record: a flag, or a clear a second person approved. */
  select f.flagged, f.set_at into s_flag, s_at
    from public.pep_flags f
   where f.user_id = p_user
     and (f.flagged or exists (select 1 from public.pep_clear_approvals c where c.flag_id = f.id))
   order by f.set_at desc, f.id desc
   limit 1;
  /* A yes the person declared after it (or ever, with no staff record) stands. A no never counts. */
  if exists (select 1 from public.pep_declarations d
              where d.user_id = p_user and d.is_pep
                and (s_at is null or d.declared_at > s_at)) then
    return true;
  end if;
  return coalesce(s_flag, false);
end;
$$;
revoke all on function private.is_pep(uuid) from public, anon, authenticated;

create or replace function private.edd_review_settled(p_review uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.edd_decisions d
      join public.edd_approvals a on a.decision_id = d.id
     where d.review_id = p_review
  );
$$;
revoke all on function private.edd_review_settled(uuid) from public, anon, authenticated;

/* An item 20 review about the person themselves (not a transaction) still open. */
create or replace function private.pep_person_review_open(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.edd_reviews r
     where r.user_id = p_user and r.scuml_item = 20
       and r.reason in ('declaration', 'staff_flag')
       and not private.edd_review_settled(r.id)
  );
$$;
revoke all on function private.pep_person_review_open(uuid) from public, anon, authenticated;

create or replace function private.pep_enqueue(p_user uuid, p_table text, p_id uuid, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_id is null or not private.is_pep(p_user) then
    return;
  end if;
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id, amount_minor)
  values (p_user, 20, 'transaction', p_table, p_id, greatest(coalesce(p_amount, 0), 0))
  on conflict (scuml_item, source_table, source_id, user_id) do nothing;
end;
$$;
revoke all on function private.pep_enqueue(uuid, text, uuid, bigint) from public, anon, authenticated;

/* Every settled charge a PEP is party to: the guest, the listing's agent, the
   payee the split settled to, and a move-in's tenant and lister. Enqueue only;
   never raises into the payment. */
create or replace function private.pep_watch_money()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parties uuid[] := '{}';
  who uuid;
begin
  begin
    if new.status::text <> 'SUCCESSFUL'
       or (tg_op = 'UPDATE' and old.status::text = 'SUCCESSFUL') then
      return null;
    end if;
    select array_remove(array[bk.guest_id, ag.user_id, new.payee_user_id, rp.tenant_id, rp.lister_id], null)
      into parties
      from public.bookings bk
      left join public.listings l on l.id = bk.listing_id
      left join public.agents ag on ag.id = l.agent_id
      left join public.rent_payments rp on rp.booking_id = bk.id
     where bk.id = new.booking_id;
    for who in select distinct x from unnest(coalesce(parties, '{}')) x loop
      perform private.pep_enqueue(who, 'transactions', new.id, abs(new.amount_minor));
    end loop;
  exception when others then
    raise warning 'SCUML item 20: no review was raised for transaction %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.pep_watch_money() from public, anon, authenticated;

drop trigger if exists transactions_zz_scuml20_pep_watch on public.transactions;
create trigger transactions_zz_scuml20_pep_watch
  after insert or update of status on public.transactions
  for each row execute function private.pep_watch_money();

/* ------------------------------------------------------------------------ */
/* Item 20: the lister answers; staff flag, decide, approve.               */
/* ------------------------------------------------------------------------ */

create or replace function public.answer_pep_question(
  p_is_pep boolean,
  p_relation text,
  p_role text,
  p_asked_at text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
  v_at timestamptz;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  /* A member looking for a home is never asked. */
  if not exists (select 1 from public.agents a where a.user_id = me) then
    raise exception 'This question is for people who list homes on Vallo.' using errcode = '42501';
  end if;
  if p_is_pep is null then
    raise exception 'Choose yes or no.' using errcode = '22023';
  end if;
  if not private.consume_rate_limit('pep_answer', me::text, 6, 3600) then
    raise exception 'That is a lot of answers in an hour. Please try again later.' using errcode = '54000';
  end if;

  insert into public.pep_declarations (user_id, is_pep, relation, role, asked_at)
  values (
    me,
    p_is_pep,
    case when p_is_pep then p_relation end,
    case when p_is_pep then nullif(btrim(p_role), '') end,
    p_asked_at
  )
  returning id, declared_at into row_id, v_at;

  if p_is_pep and not private.pep_person_review_open(me) then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (me, 20, 'declaration', 'pep_declarations', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return v_at;
end;
$$;
revoke all on function public.answer_pep_question(boolean, text, text, text) from public, anon;
grant execute on function public.answer_pep_question(boolean, text, text, text) to authenticated;

/* The only thing the person reads back: when they last answered. */
create or replace function public.my_pep_answered_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(d.declared_at) from public.pep_declarations d where d.user_id = auth.uid();
$$;
revoke all on function public.my_pep_answered_at() from public, anon;
grant execute on function public.my_pep_answered_at() to authenticated;

/* flag_pep(true) flags at once; flag_pep(false) records a PROPOSAL to clear. */
create or replace function public.flag_pep(
  p_user uuid,
  p_flagged boolean,
  p_relation text,
  p_role text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  yes boolean := coalesce(p_flagged, true);
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  insert into public.pep_flags (user_id, flagged, relation, role, note, set_by)
  values (
    p_user,
    yes,
    case when yes then p_relation end,
    case when yes then nullif(btrim(p_role), '') end,
    p_note,
    me
  )
  returning id into row_id;

  if yes and not private.pep_person_review_open(p_user) then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (p_user, 20, 'staff_flag', 'pep_flags', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return row_id;
end;
$$;
revoke all on function public.flag_pep(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.flag_pep(uuid, boolean, text, text, text) to authenticated;

create or replace function public.approve_pep_clear(p_flag uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if exists (select 1 from public.pep_clear_approvals c where c.flag_id = p_flag) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.pep_clear_approvals (flag_id, approved_by)
  values (p_flag, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_pep_clear(uuid) from public, anon;
grant execute on function public.approve_pep_clear(uuid) to authenticated;

create or replace function public.decide_edd_review(
  p_review uuid,
  p_source_of_funds text,
  p_outcome text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.edd_reviews r where r.id = p_review) then
    raise exception 'That review was not found.' using errcode = '22023';
  end if;
  if private.edd_review_settled(p_review) then
    raise exception 'This review is already decided and approved.' using errcode = 'RM175';
  end if;
  insert into public.edd_decisions (review_id, source_of_funds, outcome, note, decided_by)
  values (p_review, btrim(coalesce(p_source_of_funds, '')), p_outcome, nullif(btrim(p_note), ''), me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.decide_edd_review(uuid, text, text, text) from public, anon;
grant execute on function public.decide_edd_review(uuid, text, text, text) to authenticated;

create or replace function public.approve_edd_decision(p_decision uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  review uuid;
  latest uuid;
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  select d.review_id into review from public.edd_decisions d where d.id = p_decision;
  if review is null then
    raise exception 'That decision was not found.' using errcode = '22023';
  end if;
  if private.edd_review_settled(review) then
    raise exception 'This review is already decided and approved.' using errcode = 'RM175';
  end if;
  select d.id into latest from public.edd_decisions d
   where d.review_id = review order by d.decided_at desc, d.id desc limit 1;
  if latest is distinct from p_decision then
    raise exception 'A newer decision was recorded on this review. Approve that one.' using errcode = 'RM175';
  end if;
  insert into public.edd_approvals (decision_id, approved_by)
  values (p_decision, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_edd_decision(uuid) from public, anon;
grant execute on function public.approve_edd_decision(uuid) to authenticated;

create or replace function private.aml_person_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''),
    nullif(btrim(p.display_name), ''),
    case when p_user is null then 'A deleted account' else 'A member' end
  )
  from (select 1) one
  left join public.profiles p on p.id = p_user;
$$;
revoke all on function private.aml_person_name(uuid) from public, anon, authenticated;

create or replace function private.edd_review_json(r public.edd_reviews)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'name', private.aml_person_name(r.user_id),
    'item', r.scuml_item,
    'reason', r.reason,
    'source_table', r.source_table,
    'source_id', r.source_id,
    'amount_minor', r.amount_minor,
    'raised_at', r.raised_at,
    'decision', (
      select jsonb_build_object(
        'id', d.id,
        'source_of_funds', d.source_of_funds,
        'outcome', d.outcome,
        'note', d.note,
        'decided_by', d.decided_by,
        'decided_by_name', private.aml_person_name(d.decided_by),
        'decided_at', d.decided_at,
        'approved_by_name', (select private.aml_person_name(a.approved_by) from public.edd_approvals a where a.decision_id = d.id),
        'approved_at', (select a.approved_at from public.edd_approvals a where a.decision_id = d.id)
      )
      from public.edd_decisions d
      where d.review_id = r.id
      order by d.decided_at desc, d.id desc
      limit 1
    )
  );
$$;
revoke all on function private.edd_review_json(public.edd_reviews) from public, anon, authenticated;

create or replace function public.pep_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.aml_staff(auth.uid()) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'open', coalesce((
      select jsonb_agg(private.edd_review_json(r) order by r.raised_at)
        from public.edd_reviews r
       where r.scuml_item = 20 and not private.edd_review_settled(r.id)
    ), '[]'::jsonb),
    'settled', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select private.edd_review_json(r) as j, r.raised_at as ts
          from public.edd_reviews r
         where r.scuml_item = 20 and private.edd_review_settled(r.id)
         order by r.raised_at desc
         limit 20
      ) x
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(p.j order by p.ts desc) from (
        select jsonb_build_object(
                 'user_id', w.user_id,
                 'name', private.aml_person_name(w.user_id),
                 'is_pep', true,
                 'relation', w.relation,
                 'role', w.role,
                 'source', w.source,
                 'at', w.ts
               ) as j, w.ts
          from (
            select distinct on (u.user_id) u.*
              from (
                select d.user_id, d.relation, d.role, 'declared'::text as source, d.declared_at as ts
                  from public.pep_declarations d where d.user_id is not null and d.is_pep
                union all
                select f.user_id, f.relation, f.role, 'staff'::text, f.set_at
                  from public.pep_flags f where f.user_id is not null and f.flagged
              ) u
             where private.is_pep(u.user_id)
             order by u.user_id, u.ts desc
          ) w
         order by w.ts desc
         limit 100
      ) p
    ), '[]'::jsonb),
    'pending_clears', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id,
               'user_id', f.user_id,
               'name', private.aml_person_name(f.user_id),
               'note', f.note,
               'set_by', f.set_by,
               'set_by_name', private.aml_person_name(f.set_by),
               'set_at', f.set_at
             ) order by f.set_at)
        from public.pep_flags f
       where not f.flagged
         and f.user_id is not null
         and not exists (select 1 from public.pep_clear_approvals c where c.flag_id = f.id)
    ), '[]'::jsonb),
    'unasked', (
      select count(distinct a.user_id)
        from public.agents a
       where not a.is_demo
         and not exists (select 1 from public.pep_declarations d where d.user_id = a.user_id)
    )
  );
end;
$$;
revoke all on function public.pep_desk() from public, anon;
grant execute on function public.pep_desk() to authenticated;

/* ------------------------------------------------------------------------ */
/* Item 15: the sanctions hook (the sanctions migration replaces the body). */
/* ------------------------------------------------------------------------ */

create or replace function private.sanctions_hit_for(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select null::boolean;
$$;
revoke all on function private.sanctions_hit_for(uuid) from public, anon, authenticated;
comment on function private.sanctions_hit_for(uuid) is
  'SCUML items 8 and 15: whether a sanctions match counts toward the risk class. Null until the sanctions tables land (never a hit, never clear); the sanctions migration replaces this body.';

/* ------------------------------------------------------------------------ */
/* Item 15: the history, the factors, the job's write.                      */
/* ------------------------------------------------------------------------ */

create or replace function private.risk_rank(p_class text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_class when 'high' then 3 when 'medium' then 2 when 'low' then 1 else 0 end;
$$;
revoke all on function private.risk_rank(text) from public, anon, authenticated;

/* In force: every row except a lowered class nobody has approved yet. */
create or replace function private.risk_row_in_force(p_row uuid, p_needs_approval boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not p_needs_approval
      or exists (select 1 from public.risk_override_approvals a where a.risk_class_id = p_row);
$$;
revoke all on function private.risk_row_in_force(uuid, boolean) from public, anon, authenticated;

create or replace function private.risk_latest(p_user uuid)
returns public.risk_classes
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.risk_classes r
   where r.user_id = p_user
     and private.risk_row_in_force(r.id, r.needs_approval)
   order by r.set_at desc, r.id desc
   limit 1;
$$;
revoke all on function private.risk_latest(uuid) from public, anon, authenticated;

/* The documented factors, read from the live tables. Volume: every settled
   charge in the last 90 days the person paid (guest or tenant), listed (the
   listing's agent, a move-in's lister) or received (the split's payee). */
create or replace function public.risk_factors_for(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mine uuid[];
  lister boolean;
  rung int;
  volume bigint;
  open_reports int;
  fraud int;
  extra int;
begin
  /* Example listers never feed a real aggregate. */
  select array_agg(a.id), max(a.verification_tier)
    into mine, rung
    from public.agents a
   where a.user_id = p_user and not a.is_demo;
  lister := mine is not null;
  mine := coalesce(mine, '{}');

  select coalesce(sum(abs(t.amount_minor)), 0) into volume
    from public.transactions t
    join public.bookings b on b.id = t.booking_id
    left join public.listings l on l.id = b.listing_id
    left join public.rent_payments rp on rp.booking_id = b.id
   where t.status::text = 'SUCCESSFUL'
     and t.created_at > now() - interval '90 days'
     and (b.guest_id = p_user
          or l.agent_id = any (mine)
          or t.payee_user_id = p_user
          or rp.tenant_id = p_user
          or rp.lister_id = p_user);

  with targets as (
    select r.status::text as status, r.category
      from public.reports r
     where (r.target_type in ('user', 'profile') and r.target_id = p_user::text)
        or (r.target_type = 'agent' and r.target_id in (select m::text from unnest(mine) m))
        or (r.target_type = 'listing' and r.target_id in (
              select l.id::text from public.listings l where l.agent_id = any (mine)))
  )
  select count(*) filter (where t.status in ('open', 'reviewing')),
         count(*) filter (where t.status = 'resolved' and t.category in ('scam', 'off_platform_payment'))
    into open_reports, fraud
    from targets t;

  /* A stop a senior reviewer upheld as fraud (V-90). */
  select count(*) into extra
    from public.agent_suspensions s
   where s.agent_id = any (mine) and s.fraud_upheld_at is not null;
  fraud := fraud + coalesce(extra, 0);

  return jsonb_build_object(
    'pep', private.is_pep(p_user),
    'sanctions_hit', private.sanctions_hit_for(p_user),
    'lister', lister,
    'identity_rung', rung,
    'volume_90d_minor', volume,
    'open_reports', open_reports,
    'upheld_fraud', fraud
  );
end;
$$;
revoke all on function public.risk_factors_for(uuid) from public, anon, authenticated;
grant execute on function public.risk_factors_for(uuid) to service_role;

/* Who the job classifies next: every lister, every PEP record, everyone who
   paid, listed or received a settled charge in the last 90 days; with no
   class, a review due, an override, or a PEP record or report newer than the
   class. The sanctions migration adds the sanctions population. */
create or replace function public.risk_people_due(p_limit int)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select b.guest_id, t.payee_user_id, a.user_id as agent_user, rp.tenant_id, rp.lister_id
      from public.transactions t
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
      left join public.agents a on a.id = l.agent_id
      left join public.rent_payments rp on rp.booking_id = b.id
     where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
  ), people as (
    select a.user_id as uid from public.agents a where not a.is_demo
    union select d.user_id from public.pep_declarations d
    union select f.user_id from public.pep_flags f
    union select r.guest_id from recent r
    union select r.payee_user_id from recent r
    union select r.agent_user from recent r
    union select r.tenant_id from recent r
    union select r.lister_id from recent r
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
     )
   order by cur.set_at nulls first
   limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.risk_people_due(int) from public, anon, authenticated;
grant execute on function public.risk_people_due(int) to service_role;

/* A high class opens an item 15 EDD review. */
create or replace function private.risk_open_edd(p_user uuid, p_row uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
  values (p_user, 15, 'high_risk', 'risk_classes', p_row)
  on conflict (scuml_item, source_table, source_id, user_id) do nothing;
$$;
revoke all on function private.risk_open_edd(uuid, uuid) from public, anon, authenticated;

/* The job's write: 'written', 'unchanged' or 'override_stands'. */
create or replace function public.record_derived_risk_class(
  p_user uuid,
  p_class text,
  p_factors jsonb,
  p_reasons text[],
  p_review_due_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur public.risk_classes;
  row_id uuid;
begin
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  cur := private.risk_latest(p_user);
  if cur.id is not null and cur.review_due_at > now() then
    if cur.source = 'override' and private.risk_rank(p_class) <= private.risk_rank(cur.risk_class) then
      return 'override_stands';
    end if;
    if cur.source = 'derived' and cur.risk_class = p_class then
      return 'unchanged';
    end if;
  end if;

  insert into public.risk_classes (user_id, risk_class, factors, reasons, source, review_due_at)
  values (p_user, p_class, coalesce(p_factors, '{}'::jsonb), coalesce(p_reasons, '{}'), 'derived', p_review_due_at)
  returning id into row_id;
  if p_class = 'high' then
    perform private.risk_open_edd(p_user, row_id);
  end if;
  return 'written';
end;
$$;
revoke all on function public.record_derived_risk_class(uuid, text, jsonb, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.record_derived_risk_class(uuid, text, jsonb, text[], timestamptz) to service_role;

create or replace function public.override_risk_class(
  p_user uuid,
  p_class text,
  p_reason text,
  p_review_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  cur public.risk_classes;
  lowers boolean;
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  if p_review_due_at is null
     or p_review_due_at < now() + interval '1 day'
     or p_review_due_at > now() + interval '3 years 1 day' then
    raise exception 'The next review must fall between tomorrow and three years from now.' using errcode = '22023';
  end if;
  cur := private.risk_latest(p_user);
  lowers := cur.id is not null and private.risk_rank(p_class) < private.risk_rank(cur.risk_class);

  insert into public.risk_classes (user_id, risk_class, factors, reasons, source, reason, set_by, review_due_at, needs_approval)
  values (p_user, p_class, public.risk_factors_for(p_user), '{staff_override}', 'override',
          btrim(coalesce(p_reason, '')), me, p_review_due_at, lowers)
  returning id into row_id;
  if p_class = 'high' then
    perform private.risk_open_edd(p_user, row_id);
  end if;
  return row_id;
end;
$$;
revoke all on function public.override_risk_class(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.override_risk_class(uuid, text, text, timestamptz) to authenticated;

create or replace function public.approve_risk_override(p_row uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if exists (select 1 from public.risk_override_approvals a where a.risk_class_id = p_row) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.risk_override_approvals (risk_class_id, approved_by)
  values (p_row, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_risk_override(uuid) from public, anon;
grant execute on function public.approve_risk_override(uuid) to authenticated;

/* ------------------------------------------------------------------------ */
/* Item 15: the gates.                                                      */
/* ------------------------------------------------------------------------ */

create or replace function private.edd_clear_for(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cur public.risk_classes;
  since timestamptz;
begin
  if p_user is null then
    return true;
  end if;
  cur := private.risk_latest(p_user);
  if cur.id is null or cur.risk_class <> 'high' then
    return true;
  end if;
  /* The start of the current run of high, over the rows in force. */
  select min(r.set_at) into since
    from public.risk_classes r
   where r.user_id = p_user
     and private.risk_row_in_force(r.id, r.needs_approval)
     and r.set_at > coalesce((
       select max(x.set_at) from public.risk_classes x
        where x.user_id = p_user and x.risk_class <> 'high'
          and private.risk_row_in_force(x.id, x.needs_approval)
     ), '-infinity'::timestamptz);
  /* A review staff reopened shuts the gate until it is settled again. */
  if exists (select 1 from public.edd_reviews v
              where v.user_id = p_user and v.scuml_item = 15 and v.reason = 'reopened'
                and not private.edd_review_settled(v.id)) then
    return false;
  end if;
  return exists (
    select 1
      from public.edd_reviews v
      join public.edd_decisions d on d.review_id = v.id
      join public.edd_approvals a on a.decision_id = d.id
     where v.user_id = p_user
       and v.scuml_item = 15
       and v.raised_at >= since
       and d.outcome = 'cleared'
       and a.approved_at >= since
  );
end;
$$;
revoke all on function private.edd_clear_for(uuid) from public, anon, authenticated;

create or replace function public.reopen_edd_review(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  if exists (select 1 from public.edd_reviews v
              where v.user_id = p_user and v.scuml_item = 15 and v.reason = 'reopened'
                and not private.edd_review_settled(v.id)) then
    raise exception 'A reopened review is already waiting for this person.' using errcode = 'RM175';
  end if;
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
  values (p_user, 15, 'reopened', 'edd_reopen', gen_random_uuid())
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.reopen_edd_review(uuid) from public, anon;
grant execute on function public.reopen_edd_review(uuid) to authenticated;

/* Listers are refused; members raise a review and go through. */
create or replace function private.edd_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if tg_table_name = 'listings' then
    if new.status::text <> 'PUBLISHED' or new.is_demo then
      return new;
    end if;
    if tg_op = 'UPDATE' and old.status::text = 'PUBLISHED' then
      return new;
    end if;
    select a.user_id into v_person from public.agents a where a.id = new.agent_id;
  else
    if tg_op = 'UPDATE'
       and new.account_number is not distinct from old.account_number
       and new.bank_code is not distinct from old.bank_code then
      return new;
    end if;
    if tg_table_name = 'bank_accounts' then
      v_person := new.user_id;
      if not exists (select 1 from public.agents a where a.user_id = v_person) then
        /* A member: rule-derived risk never blocks their money. */
        if not private.edd_clear_for(v_person) then
          insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
          values (v_person, 15, 'member_account', 'bank_accounts', new.id)
          on conflict (scuml_item, source_table, source_id, user_id) do nothing;
        end if;
        return new;
      end if;
    else
      select a.user_id into v_person from public.agents a where a.id = new.agent_id;
    end if;
  end if;

  if not private.edd_clear_for(v_person) then
    if tg_table_name = 'listings' then
      raise exception 'This listing needs a check by our team before it can go live. We will be in touch.'
        using errcode = 'RM175';
    end if;
    raise exception 'This account needs a check by our team before a payout account can be added. We will be in touch.'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.edd_gate() from public, anon, authenticated;

drop trigger if exists listings_zz_scuml15_edd_gate on public.listings;
create trigger listings_zz_scuml15_edd_gate
  before insert or update of status on public.listings
  for each row execute function private.edd_gate();
drop trigger if exists payout_accounts_zz_scuml15_edd_gate on public.payout_accounts;
create trigger payout_accounts_zz_scuml15_edd_gate
  before insert or update of account_number, bank_code on public.payout_accounts
  for each row execute function private.edd_gate();
drop trigger if exists bank_accounts_zz_scuml15_edd_gate on public.bank_accounts;
create trigger bank_accounts_zz_scuml15_edd_gate
  before insert or update of account_number, bank_code on public.bank_accounts
  for each row execute function private.edd_gate();

/* ------------------------------------------------------------------------ */
/* Item 15: the lane.                                                       */
/* ------------------------------------------------------------------------ */

create or replace function public.risk_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.aml_staff(auth.uid()) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  return (
    with cur as (
      select distinct on (r.user_id) r.*
        from public.risk_classes r
       where r.user_id is not null
         and private.risk_row_in_force(r.id, r.needs_approval)
       order by r.user_id, r.set_at desc, r.id desc
    )
    select jsonb_build_object(
      'counts', jsonb_build_object(
        'high',   (select count(*) from cur where cur.risk_class = 'high'),
        'medium', (select count(*) from cur where cur.risk_class = 'medium'),
        'low',    (select count(*) from cur where cur.risk_class = 'low'),
        'due',    (select count(*) from cur where cur.review_due_at <= now())
      ),
      'people', coalesce((
        select jsonb_agg(x.j order by x.rank desc, x.due) from (
          select jsonb_build_object(
                   'user_id', cur.user_id,
                   'name', private.aml_person_name(cur.user_id),
                   'class', cur.risk_class,
                   'source', cur.source,
                   'reason', cur.reason,
                   'reasons', to_jsonb(cur.reasons),
                   'factors', cur.factors,
                   'set_at', cur.set_at,
                   'set_by_name', case when cur.set_by is null then null else private.aml_person_name(cur.set_by) end,
                   'review_due_at', cur.review_due_at,
                   'edd_clear', private.edd_clear_for(cur.user_id)
                 ) as j,
                 private.risk_rank(cur.risk_class) as rank,
                 cur.review_due_at as due
            from cur
           where cur.risk_class in ('high', 'medium') or cur.review_due_at <= now()
           order by private.risk_rank(cur.risk_class) desc, cur.review_due_at
           limit 200
        ) x
      ), '[]'::jsonb),
      'open', coalesce((
        select jsonb_agg(private.edd_review_json(v) order by v.raised_at)
          from public.edd_reviews v
         where v.scuml_item = 15 and not private.edd_review_settled(v.id)
      ), '[]'::jsonb),
      'pending', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'user_id', r.user_id,
                 'name', private.aml_person_name(r.user_id),
                 'from', (select c.risk_class from cur c where c.user_id = r.user_id),
                 'to', r.risk_class,
                 'reason', r.reason,
                 'set_by', r.set_by,
                 'set_by_name', private.aml_person_name(r.set_by),
                 'set_at', r.set_at
               ) order by r.set_at)
          from public.risk_classes r
         where r.needs_approval
           and r.user_id is not null
           and not exists (select 1 from public.risk_override_approvals a where a.risk_class_id = r.id)
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.risk_desk() from public, anon;
grant execute on function public.risk_desk() to authenticated;

/* ------------------------------------------------------------------------ */
/* Read-back.                                                               */
/* ------------------------------------------------------------------------ */

do $readback$
declare
  bad text := '';
  t text;
begin
  foreach t in array array['pep_declarations', 'pep_flags', 'edd_reviews', 'edd_decisions', 'edd_approvals',
                           'pep_clear_approvals', 'risk_classes', 'risk_override_approvals'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      bad := bad || format(' [%s has RLS off]', t);
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('service_role', 'public.' || t, 'INSERT, UPDATE, DELETE') then
      bad := bad || format(' [%s is reachable by the wrong role]', t);
    end if;
  end loop;
  if has_function_privilege('authenticated', 'public.risk_factors_for(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.risk_people_due(int)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_derived_risk_class(uuid, text, jsonb, text[], timestamptz)', 'EXECUTE') then
    bad := bad || ' [a job function is callable by a member]';
  end if;
  if has_function_privilege('anon', 'public.answer_pep_question(boolean, text, text, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.pep_desk()', 'EXECUTE') then
    bad := bad || ' [a PEP function is callable signed out]';
  end if;
  if exists (select 1 from pg_trigger tr join pg_class c on c.oid = tr.tgrelid
              where tr.tgname like '%scuml20_pep_watch' and c.relname <> 'transactions') then
    bad := bad || ' [the PEP watch sits on something other than public.transactions]';
  end if;
  if (select count(*) from pg_trigger where tgname in ('listings_zz_scuml15_edd_gate', 'payout_accounts_zz_scuml15_edd_gate',
                                                        'bank_accounts_zz_scuml15_edd_gate', 'transactions_zz_scuml20_pep_watch')) <> 4 then
    bad := bad || ' [a gate or the watch is missing]';
  end if;
  if bad <> '' then raise exception 'SCUML items 20 and 15 READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* ------------------------------------------------------------------------ */
/* Probe, rolled back.                                                      */
/* ------------------------------------------------------------------------ */

-- A lister answers yes to the PEP question: a review is raised and they are a
-- PEP; a member without an agents row is refused the question. A settled
-- charge on the lister's listing raises a transaction review for them. The
-- review is decided by one staff member; the same person cannot approve it; a
-- second does. Taking them off the record is a proposal until a second person
-- approves. A high class opens an item 15 review and shuts the lister's
-- gates (a listing going live, a payout account) but lets a member's bank
-- account through with a review; clearing it by two people opens the gate.
-- Lowering a class by hand waits on a second person. The factors read the
-- live charge as volume; the desks answer staff and refuse members.
do $probe$
declare
  v_lister uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_agent uuid;
  v_listing uuid;
  v_listing2 uuid;
  v_booking uuid;
  v_tx uuid;
  v_review uuid;
  v_decision uuid;
  v_flag uuid;
  v_row uuid;
  v_ans jsonb;
  v_at timestamptz;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_reviews_before bigint;
  v_classes_before bigint;
begin
  select count(*) into v_reviews_before from public.edd_reviews;
  select count(*) into v_classes_before from public.risk_classes;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml20-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_lister, 'lister'), (v_guest, 'guest'), (v_s1, 'staff1'), (v_s2, 'staff2')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin');
    insert into public.agents (user_id, display_name, role) values (v_lister, 'Probe Owner', 'owner') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML 20 probe shortlet', 'shortlet', 'owner', 'DRAFT', false, 250000000, 'night')
    returning id into v_listing;
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing;

    -- 1. The question: a lister answers yes; a member is not asked.
    perform set_config('request.jwt.claims', json_build_object('sub', v_lister, 'role', 'authenticated')::text, true);
    v_at := public.answer_pep_question(true, 'self', 'Commissioner for Lands', 'payout');
    if public.my_pep_answered_at() is distinct from v_at then raise exception 'PROBE FAILED: the answer date does not read back'; end if;
    if not private.is_pep(v_lister) then raise exception 'PROBE FAILED: a yes did not make a PEP'; end if;
    if not exists (select 1 from public.edd_reviews where user_id = v_lister and scuml_item = 20 and reason = 'declaration') then
      raise exception 'PROBE FAILED: a yes raised no review';
    end if;
    begin
      perform public.pep_desk();
      raise exception 'PROBE FAILED: a member read the PEP desk';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated')::text, true);
    begin
      perform public.answer_pep_question(false, null, null, 'verification');
      raise exception 'PROBE FAILED: a member was asked the PEP question';
    exception when insufficient_privilege then null;
    end;

    -- 2. A settled charge on the PEP's listing raises a transaction review.
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 2, v_today + 3, 1, 0, 0, 0) returning id into v_booking;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, payee_user_id)
    values (v_booking, 'paystack', 'scuml20-probe-' || gen_random_uuid(), 250000000, 'NGN', 'PENDING', v_lister)
    returning id into v_tx;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx;
    perform set_config('vallo.recording_unknown_charge', '', true);
    select id into v_review from public.edd_reviews
     where user_id = v_lister and scuml_item = 20 and reason = 'transaction' and source_table = 'transactions' and source_id = v_tx;
    if v_review is null then raise exception 'PROBE FAILED: a PEP''s settled charge raised no review'; end if;
    if exists (select 1 from public.edd_reviews where user_id = v_guest and source_id = v_tx) then
      raise exception 'PROBE FAILED: a non-PEP party got a PEP review';
    end if;
    if (public.risk_factors_for(v_guest)->>'volume_90d_minor')::bigint <> 250000000
       or (public.risk_factors_for(v_lister)->>'volume_90d_minor')::bigint <> 250000000
       or (public.risk_factors_for(v_lister)->>'pep')::boolean is not true then
      raise exception 'PROBE FAILED: the factors do not read the live charge';
    end if;
    if not exists (select 1 from public.risk_people_due(500) d where d.user_id = v_guest)
       or not exists (select 1 from public.risk_people_due(500) d where d.user_id = v_lister) then
      raise exception 'PROBE FAILED: the payer and the lister are not due a class';
    end if;

    -- 3. Two people settle the review.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.pep_desk();
    if not exists (select 1 from jsonb_array_elements(v_ans->'open') r where (r->>'id')::uuid = v_review)
       or not exists (select 1 from jsonb_array_elements(v_ans->'people') p where (p->>'user_id')::uuid = v_lister) then
      raise exception 'PROBE FAILED: the PEP desk does not show the review and the person';
    end if;
    v_decision := public.decide_edd_review(v_review, 'Rent from a family house, bank statements seen.', 'cleared', null);
    begin
      perform public.approve_edd_decision(v_decision);
      raise exception 'PROBE FAILED: the decider approved their own decision';
    exception when sqlstate 'RM175' then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    perform public.approve_edd_decision(v_decision);
    if not private.edd_review_settled(v_review) then raise exception 'PROBE FAILED: the review is not settled'; end if;

    -- 4. Taking somebody off the record needs a second person.
    v_flag := public.flag_pep(v_lister, false, null, null, 'Left office in 2019, confirmed.');
    if not private.is_pep(v_lister) then raise exception 'PROBE FAILED: a proposal took effect alone'; end if;
    begin
      perform public.approve_pep_clear(v_flag);
      raise exception 'PROBE FAILED: the proposer approved their own clear';
    exception when sqlstate 'RM175' then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    perform public.approve_pep_clear(v_flag);
    if private.is_pep(v_lister) then raise exception 'PROBE FAILED: an approved clear did not take effect'; end if;

    -- 5. High risk shuts a lister's gates and lets a member's bank account through.
    perform set_config('request.jwt.claims', '', true);
    if public.record_derived_risk_class(v_lister, 'high', '{"pep": true}'::jsonb, '{pep}', now() + interval '90 days') <> 'written' then
      raise exception 'PROBE FAILED: the derived class was not written';
    end if;
    if not exists (select 1 from public.edd_reviews where user_id = v_lister and scuml_item = 15 and reason = 'high_risk') then
      raise exception 'PROBE FAILED: a high class opened no item 15 review';
    end if;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML 15 probe second', 'shortlet', 'owner', 'DRAFT', false, 250000000, 'night')
    returning id into v_listing2;
    begin
      update public.listings set status = 'PUBLISHED' where id = v_listing2;
      raise exception 'PROBE FAILED: a high-risk lister''s listing went live';
    exception when sqlstate 'RM175' then
      if sqlerrm not like 'This listing needs a check by our team%' then raise; end if;
    end;
    begin
      insert into public.payout_accounts (agent_id, bank_name, account_number, account_name)
      values (v_agent, 'Probe Bank', '0123456789', 'PROBE OWNER');
      raise exception 'PROBE FAILED: a high-risk lister added a payout account';
    exception when sqlstate 'RM175' then null;
    end;
    perform public.record_derived_risk_class(v_guest, 'high', '{}'::jsonb, '{volume_very_high}', now() + interval '90 days');
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
    values (v_guest, '058', 'Probe Bank', '0123456789', 'PROBE GUEST', now());
    if not exists (select 1 from public.edd_reviews where user_id = v_guest and scuml_item = 15 and reason = 'member_account') then
      raise exception 'PROBE FAILED: a high-risk member''s bank account raised no review';
    end if;

    -- 6. Clearing the item 15 review, by two people, opens the gate.
    select id into v_review from public.edd_reviews where user_id = v_lister and scuml_item = 15 and reason = 'high_risk';
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_decision := public.decide_edd_review(v_review, 'Salary and rent income, documents on file.', 'cleared', null);
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    perform public.approve_edd_decision(v_decision);
    if not private.edd_clear_for(v_lister) then raise exception 'PROBE FAILED: a cleared review did not open the gate'; end if;
    update public.listings set status = 'PUBLISHED' where id = v_listing2;

    -- 7. Lowering by hand waits on a second person.
    v_row := public.override_risk_class(v_lister, 'low', 'Reviewed in person with documents; low risk.', now() + interval '365 days');
    if (private.risk_latest(v_lister)).risk_class <> 'high' then raise exception 'PROBE FAILED: a lowered class took effect alone'; end if;
    begin
      perform public.approve_risk_override(v_row);
      raise exception 'PROBE FAILED: the proposer approved their own lowering';
    exception when sqlstate 'RM175' then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    perform public.approve_risk_override(v_row);
    if (private.risk_latest(v_lister)).risk_class <> 'low' then raise exception 'PROBE FAILED: an approved lowering did not take effect'; end if;
    v_ans := public.risk_desk();
    if (v_ans->'counts'->>'high')::int < 1 then raise exception 'PROBE FAILED: the risk desk does not count the high member'; end if;

    -- 8. The records are kept.
    begin
      update public.risk_classes set risk_class = 'medium' where id = v_row;
      raise exception 'PROBE FAILED: a class row was edited';
    exception when sqlstate 'RM175' then null;
    end;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.edd_reviews) <> v_reviews_before
     or (select count(*) from public.risk_classes) <> v_classes_before
     or exists (select 1 from auth.users where id in (v_lister, v_guest, v_s1, v_s2)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
