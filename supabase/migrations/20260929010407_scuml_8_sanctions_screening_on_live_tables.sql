/*
 * SCUML ITEMS 8 AND 9 (with 19 and 15): SANCTIONS SCREENING, AND
 * RE-SCREENING WHEN A LIST CHANGES, ON THE LIVE TABLES.
 *
 * WHY THIS MIGRATION. 20260924176000 to 176700 were committed and never
 * applied: 176000 and 176200 put screening triggers on public.wallet_entries
 * and public.escrows, and 176600 read escrows and wallets for the risk
 * population. Since 25 September 2026 Vallo holds no customer money
 * (docs/MONEY_ARCHITECTURE.md, ADR 0002). This file is the eight as their
 * final state (176700), with the custody triggers and reads replaced by the
 * live money records, so the app code already written for it
 * (lib/compliance/sanctions/, the sanctions lane, the sanctions-lists and
 * sanctions-screen jobs) works end to end.
 *
 * THE SHAPE.
 *   sanctions_list_versions   one row per loaded file (UN or Nigeria), by
 *                             SHA-256, from a URL fetch or a staff upload;
 *                             loaded inactive, entries written, then
 *                             activated. `complete` records whether the file
 *                             proved it is whole; an incomplete one can never
 *                             be activated.
 *   sanctions_entries         names and aliases (normalised by the app for
 *                             matching), dates of birth, nationalities, the
 *                             list's own reference.
 *   sanctions_screen_queue    who and what waits to be screened, filled by
 *                             AFTER triggers that cannot fail their write,
 *                             claimed by the sanctions-screen job.
 *   sanctions_screenings      APPEND-ONLY: every screening, clean ones too, per
 *                             person and per transaction, with the versions used.
 *   sanctions_hits            a match, exact or close (fuzzy, with its score);
 *                             `common_name` marks a match resting only on names
 *                             common in Nigeria (its own group on the desk).
 *   sanctions_hit_decisions   proposed by one staff member, approved or
 *                             rejected by a DIFFERENT one (item 19).
 *   sanctions_delisting_flags a confirmed match whose reference left a newly
 *                             activated version (item 9).
 *
 * WHEN A PERSON OR A TRANSACTION IS SCREENED (AFTER triggers, lock_timeout
 * 200ms, every error caught; a screening never blocks a payment):
 *   lister verification  agent_applications submitted or changed;
 *   identity             agent_verification_checks recorded;
 *   payout account       bank_accounts and payout_accounts added or renamed;
 *   every transaction    a split-settlement charge (public.transactions,
 *                        'card_payment': the guest, the name on the booking,
 *                        the listing's agent and the split's payee), a move-in
 *                        (public.rent_payments, 'rent_payment': tenant and
 *                        lister), a business handed over
 *                        (public.business_transfers: both people);
 *   a list activated     everybody with a profile (item 9), and any confirmed
 *                        match whose reference is gone is flagged.
 *
 * THE ESCALATION PATH (docs/COMPLIANCE_SCUML.md, docs/COMPLIANCE_RUNBOOK.md).
 * A match never does anything to the person by itself. One staff member
 * proposes clear, confirm or (for a confirmed match) release, with a note; a
 * second approves; nobody decides a match about themselves. A confirmed match
 * sets the sanctions desk's own hold CLAIM (private.hold_claims, 30 days,
 * renewed by the job while the match stands); the hold row is `plain`, a
 * reason that names nothing, and the live payout-account triggers refuse any
 * new payout or bank account with a sentence that names no cause and no date.
 * A release, approved by two, clears only this desk's claim.
 *
 * LISTS NEED TWO PEOPLE. An upload waits for somebody other than its loader;
 * a URL file with under 90% of the entries in force waits for a proposer and
 * a different approver; a version superseded by a later-loaded one, or
 * incomplete, cannot be activated.
 *
 * THE RISK HOOK (item 15). private.sanctions_hit_for is TRUE for a confirmed
 * match, or an open EXACT match that is not a common-name match; FALSE once
 * screened otherwise; NULL when never screened. risk_people_due also picks up
 * anyone with a match, re-due when a decision is approved or an exact match
 * is raised.
 *
 * STAFF ONLY. RLS on every table with no policy; nothing granted to anon or
 * authenticated; the service role has exactly the reads and writes the jobs
 * and the upload route make. Kept at least five years; no purge touches them.
 */

set local lock_timeout = '5s';

/* ------------------------------------------------------------ staff check */

create or replace function private.compliance_staff(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_user is not null and exists (
    select 1 from public.user_roles r
     where r.user_id = p_user and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
  );
$$;
revoke all on function private.compliance_staff(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------------ tables */

create table if not exists public.sanctions_list_versions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('un', 'ng')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  origin text not null check (origin in ('url', 'upload')),
  entry_count integer not null default 0 check (entry_count >= 0),
  loaded_by uuid,
  loaded_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by uuid,
  previous_entries integer,
  activation_proposed_by uuid,
  activation_proposed_at timestamptz,
  complete boolean not null default true,
  unique (source, sha256)
);
comment on table public.sanctions_list_versions is
  'SCUML items 8 and 9. One row per loaded sanctions list file (UN Consolidated or Nigeria), identified by its SHA-256; activated once its entries are written (by a second person for an upload or a short file), which re-screens everyone.';

create table if not exists public.sanctions_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sanctions_list_versions(id) on delete restrict,
  source text not null check (source in ('un', 'ng')),
  reference text not null check (char_length(reference) between 1 and 80),
  kind text not null check (kind in ('individual', 'entity')),
  primary_name text not null check (char_length(primary_name) between 1 and 300),
  aliases text[] not null default '{}',
  names_normalised text[] not null,
  dates_of_birth text[] not null default '{}',
  nationalities text[] not null default '{}',
  listed_on date,
  unique (version_id, reference)
);
comment on table public.sanctions_entries is
  'SCUML item 8. The entries of one list version: names and aliases (normalised for matching), dates of birth, nationalities and the list''s own reference.';

create table if not exists public.sanctions_screen_queue (
  id bigint generated always as identity primary key,
  subject_kind text not null check (subject_kind in ('person', 'transaction')),
  person_id uuid,
  transaction_kind text check (transaction_kind in ('card_payment', 'rent_payment', 'business_transfer')),
  transaction_id uuid,
  trigger text not null check (trigger in ('lister_verification', 'payout_account', 'identity', 'transaction', 'list_change', 'manual')),
  enqueued_at timestamptz not null default now(),
  taken_at timestamptz,
  done_at timestamptz,
  check (
    (subject_kind = 'person' and person_id is not null and transaction_id is null)
    or (subject_kind = 'transaction' and transaction_id is not null and transaction_kind is not null)
  )
);
create unique index if not exists sanctions_screen_queue_person_waiting
  on public.sanctions_screen_queue (person_id) where subject_kind = 'person' and done_at is null;
create index if not exists sanctions_screen_queue_due
  on public.sanctions_screen_queue (enqueued_at) where done_at is null;
comment on table public.sanctions_screen_queue is
  'SCUML item 8. Who and what waits to be screened; one waiting row per person. Filled by AFTER triggers on the live money and verification tables, claimed by the sanctions-screen job.';

create table if not exists public.sanctions_screenings (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (subject_kind in ('person', 'transaction')),
  person_id uuid,
  transaction_kind text check (transaction_kind in ('card_payment', 'rent_payment', 'business_transfer')),
  transaction_id uuid,
  trigger text not null check (trigger in ('lister_verification', 'payout_account', 'identity', 'transaction', 'list_change', 'manual')),
  names_screened text[] not null default '{}',
  un_version_id uuid references public.sanctions_list_versions(id),
  ng_version_id uuid references public.sanctions_list_versions(id),
  outcome text not null check (outcome in ('clear', 'exact', 'fuzzy', 'no_list', 'no_name')),
  best_score numeric(4, 3) check (best_score is null or (best_score >= 0 and best_score <= 1)),
  matches jsonb not null default '[]'::jsonb,
  screened_at timestamptz not null default now(),
  screened_by uuid
);
create index if not exists sanctions_screenings_person_idx on public.sanctions_screenings (person_id, screened_at desc);
create index if not exists sanctions_screenings_tx_idx on public.sanctions_screenings (transaction_id);
create index if not exists sanctions_screenings_at_idx on public.sanctions_screenings (screened_at desc);
create index if not exists sanctions_screenings_un_idx on public.sanctions_screenings (un_version_id);
create index if not exists sanctions_screenings_ng_idx on public.sanctions_screenings (ng_version_id);
comment on table public.sanctions_screenings is
  'SCUML item 8. APPEND-ONLY. Every screening, clean ones too, per person and per transaction, with the list versions used. Kept at least five years (item 11); no purge touches it.';

create table if not exists public.sanctions_hits (
  id uuid primary key default gen_random_uuid(),
  screening_id uuid not null references public.sanctions_screenings(id),
  person_id uuid not null,
  source text not null check (source in ('un', 'ng')),
  entry_id uuid not null references public.sanctions_entries(id),
  entry_reference text not null,
  match_kind text not null check (match_kind in ('exact', 'fuzzy')),
  score numeric(4, 3) not null check (score >= 0 and score <= 1),
  screened_name text not null,
  matched_name text not null,
  status text not null default 'open' check (status in ('open', 'cleared', 'confirmed', 'released')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  common_name boolean not null default false,
  unique (person_id, source, entry_reference, screened_name)
);
create index if not exists sanctions_hits_open on public.sanctions_hits (created_at) where status = 'open';
create index if not exists sanctions_hits_screening_idx on public.sanctions_hits (screening_id);
create index if not exists sanctions_hits_entry_idx on public.sanctions_hits (entry_id);
comment on table public.sanctions_hits is
  'SCUML item 8. A match waiting on a two-person decision; exact and close (fuzzy) recorded separately. Kept at least five years.';
comment on column public.sanctions_hits.common_name is
  'SCUML item 8. A match resting only on names common in Nigeria: raised, shown in the desk''s lower group, never counted by the risk hook until confirmed. Set once.';

create table if not exists public.sanctions_hit_decisions (
  id uuid primary key default gen_random_uuid(),
  hit_id uuid not null references public.sanctions_hits(id),
  decision text not null check (decision in ('clear', 'confirm', 'release')),
  note text not null check (char_length(btrim(note)) between 3 and 2000),
  proposed_by uuid not null,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  check (approved_by is null or approved_by <> proposed_by),
  check ((approved_by is null) = (approved_at is null)),
  constraint sanctions_hit_decisions_rejected_check
    check ((rejected_by is null) = (rejected_at is null)
           and (rejected_by is null or rejected_by <> proposed_by)
           and (rejected_by is null or approved_by is null))
);
create unique index if not exists sanctions_hit_decisions_one_pending
  on public.sanctions_hit_decisions (hit_id) where approved_by is null and rejected_by is null;
create index if not exists sanctions_hit_decisions_hit_idx on public.sanctions_hit_decisions (hit_id);
comment on table public.sanctions_hit_decisions is
  'SCUML items 8 and 19. Proposed by one staff member, effective only when a different one approves; rejected by anyone but the proposer. Append-only bar the one approval or rejection stamp.';

create table if not exists public.sanctions_delisting_flags (
  id uuid primary key default gen_random_uuid(),
  hit_id uuid not null references public.sanctions_hits(id),
  version_id uuid not null references public.sanctions_list_versions(id),
  raised_at timestamptz not null default now(),
  unique (hit_id, version_id)
);
create index if not exists sanctions_delisting_flags_version_idx on public.sanctions_delisting_flags (version_id);
comment on table public.sanctions_delisting_flags is
  'SCUML item 9. A confirmed match whose list reference is absent from a newly activated version: a de-listing for staff to act on (a two-person release). Kept five years.';

/* Born locked; the service role gets exactly what the jobs and the upload route use. */
do $locked$
declare t text;
begin
  foreach t in array array['sanctions_list_versions', 'sanctions_entries', 'sanctions_screen_queue',
                           'sanctions_screenings', 'sanctions_hits', 'sanctions_hit_decisions',
                           'sanctions_delisting_flags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to service_role', t);
  end loop;
end;
$locked$;
grant insert, update on table public.sanctions_list_versions to service_role;
grant insert on table public.sanctions_entries to service_role;
grant update (done_at) on table public.sanctions_screen_queue to service_role;
grant insert on table public.sanctions_screenings to service_role;
grant insert on table public.sanctions_hits to service_role;

/* ------------------------------------------------------------- the guards */

create or replace function private.sanctions_append_only()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'SCUML item 8: % is append-only', tg_table_name using errcode = 'P0001';
end;
$$;
revoke all on function private.sanctions_append_only() from public, anon, authenticated;

drop trigger if exists sanctions_screenings_append_only on public.sanctions_screenings;
create trigger sanctions_screenings_append_only
  before update or delete on public.sanctions_screenings
  for each row execute function private.sanctions_append_only();

create or replace function private.sanctions_decision_guard()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SCUML item 19: a decision is never deleted' using errcode = 'P0001';
  end if;
  if old.approved_by is not null or old.rejected_by is not null
     or new.id <> old.id or new.hit_id <> old.hit_id or new.decision <> old.decision or new.note <> old.note
     or new.proposed_by <> old.proposed_by or new.proposed_at <> old.proposed_at then
    raise exception 'SCUML item 19: a decision is only ever stamped approved or rejected, once' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.sanctions_decision_guard() from public, anon, authenticated;

drop trigger if exists sanctions_hit_decisions_guard on public.sanctions_hit_decisions;
create trigger sanctions_hit_decisions_guard
  before update or delete on public.sanctions_hit_decisions
  for each row execute function private.sanctions_decision_guard();

create or replace function private.sanctions_hit_status_guard()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SCUML item 8: a match is never deleted' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status
     and not ((old.status = 'open' and new.status in ('cleared', 'confirmed'))
              or (old.status = 'confirmed' and new.status = 'released')) then
    raise exception 'SCUML item 8: a match moves open to cleared or confirmed, or confirmed to released, once' using errcode = 'P0001';
  end if;
  if new.id <> old.id or new.person_id <> old.person_id or new.entry_id <> old.entry_id
     or new.match_kind <> old.match_kind or new.score <> old.score or new.screened_name <> old.screened_name
     or new.source <> old.source or new.entry_reference <> old.entry_reference
     or new.matched_name <> old.matched_name or new.screening_id <> old.screening_id
     or new.created_at <> old.created_at or new.common_name <> old.common_name then
    raise exception 'SCUML item 8: a match is not edited' using errcode = 'P0001';
  end if;
  /* A decision's time is set once; a release is dated on its own decision row. */
  if old.decided_at is not null and new.decided_at is distinct from old.decided_at then
    raise exception 'SCUML item 8: a match is not edited (decided_at is set once)' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.sanctions_hit_status_guard() from public, anon, authenticated;

drop trigger if exists sanctions_hits_status_guard on public.sanctions_hits;
create trigger sanctions_hits_status_guard
  before update or delete on public.sanctions_hits
  for each row execute function private.sanctions_hit_status_guard();

/* ---------------------------------------------------------------- enqueue */

create or replace function private.sanctions_enqueue_person(p_user uuid, p_trigger text)
returns void
language plpgsql
security definer
set search_path to ''
set lock_timeout to '200ms'
as $$
begin
  if p_user is null then return; end if;
  insert into public.sanctions_screen_queue (subject_kind, person_id, trigger)
  values ('person', p_user, p_trigger)
  on conflict (person_id) where subject_kind = 'person' and done_at is null
  do update set enqueued_at = now(), taken_at = null, trigger = excluded.trigger;
exception when others then
  raise warning '[sanctions] enqueue failed: %', sqlstate;
end;
$$;
revoke all on function private.sanctions_enqueue_person(uuid, text) from public, anon, authenticated;

create or replace function private.sanctions_enqueue_from_row()
returns trigger
language plpgsql
security definer
set search_path to ''
set lock_timeout to '200ms'
as $$
declare
  v_user uuid;
  v_kind text;
begin
  begin
    if tg_table_name = 'agent_applications' then
      if new.submitted_at is not null then
        perform private.sanctions_enqueue_person(new.user_id, 'lister_verification');
      end if;
    elsif tg_table_name = 'agent_verification_checks' then
      select a.user_id into v_user from public.agents a where a.id = new.agent_id;
      perform private.sanctions_enqueue_person(v_user, 'identity');
    elsif tg_table_name = 'bank_accounts' then
      perform private.sanctions_enqueue_person(new.user_id, 'payout_account');
    elsif tg_table_name = 'payout_accounts' then
      select a.user_id into v_user from public.agents a where a.id = new.agent_id;
      perform private.sanctions_enqueue_person(v_user, 'payout_account');
    else
      v_kind := case tg_table_name
        when 'transactions' then 'card_payment'
        when 'rent_payments' then 'rent_payment'
        when 'business_transfers' then 'business_transfer'
      end;
      if v_kind is not null then
        insert into public.sanctions_screen_queue (subject_kind, transaction_kind, transaction_id, trigger)
        values ('transaction', v_kind, new.id, 'transaction');
      end if;
    end if;
  exception when others then
    /* Never the reason a verification, a payout account or a payment fails. */
    raise warning '[sanctions] enqueue from % failed: %', tg_table_name, sqlstate;
  end;
  return null;
end;
$$;
revoke all on function private.sanctions_enqueue_from_row() from public, anon, authenticated;

drop trigger if exists zz_sanctions_screen_agent_applications on public.agent_applications;
create trigger zz_sanctions_screen_agent_applications
  after insert or update of submitted_at, status, full_name, account_name on public.agent_applications
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_verification_checks on public.agent_verification_checks;
create trigger zz_sanctions_screen_verification_checks
  after insert on public.agent_verification_checks
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_bank_accounts on public.bank_accounts;
create trigger zz_sanctions_screen_bank_accounts
  after insert or update of resolved_account_name on public.bank_accounts
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_payout_accounts on public.payout_accounts;
create trigger zz_sanctions_screen_payout_accounts
  after insert or update of account_name, resolved_account_name on public.payout_accounts
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_transactions on public.transactions;
create trigger zz_sanctions_screen_transactions
  after insert on public.transactions
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_rent_payments on public.rent_payments;
create trigger zz_sanctions_screen_rent_payments
  after insert on public.rent_payments
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_business_transfers on public.business_transfers;
create trigger zz_sanctions_screen_business_transfers
  after insert on public.business_transfers
  for each row execute function private.sanctions_enqueue_from_row();

/* Item 9: a list version activated re-screens everyone and flags de-listings. */
create or replace function private.sanctions_rescreen_everyone()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if old.activated_at is null and new.activated_at is not null then
    insert into public.sanctions_screen_queue (subject_kind, person_id, trigger)
    select 'person', p.id, 'list_change' from public.profiles p
    on conflict (person_id) where subject_kind = 'person' and done_at is null
    do update set enqueued_at = now(), taken_at = null, trigger = 'list_change';

    insert into public.sanctions_delisting_flags (hit_id, version_id)
    select h.id, new.id
      from public.sanctions_hits h
     where h.status = 'confirmed' and h.source = new.source
       and not exists (select 1 from public.sanctions_entries e
                        where e.version_id = new.id and e.reference = h.entry_reference)
    on conflict (hit_id, version_id) do nothing;
  end if;
  return null;
end;
$$;
revoke all on function private.sanctions_rescreen_everyone() from public, anon, authenticated;

drop trigger if exists sanctions_list_activated on public.sanctions_list_versions;
create trigger sanctions_list_activated
  after update of activated_at on public.sanctions_list_versions
  for each row execute function private.sanctions_rescreen_everyone();

/* ------------------------------------------------------- lists: activation */

create or replace function private.sanctions_list_waiting(v public.sanctions_list_versions)
returns boolean
language sql
stable
set search_path to ''
as $$
  select v.activated_at is null and v.entry_count > 0 and v.complete
     and not exists (select 1 from public.sanctions_list_versions o
                      where o.source = v.source and o.activated_at is not null and o.loaded_at > v.loaded_at);
$$;
revoke all on function private.sanctions_list_waiting(public.sanctions_list_versions) from public, anon, authenticated;

create or replace function public.sanctions_lists_waiting()
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select count(*)::integer from public.sanctions_list_versions v where private.sanctions_list_waiting(v);
$$;
revoke all on function public.sanctions_lists_waiting() from public, anon, authenticated;
grant execute on function public.sanctions_lists_waiting() to service_role;

create or replace function public.sanctions_list_activate(p_version uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v public.sanctions_list_versions%rowtype;
  v_in_force integer;
  v_short boolean;
  v_proposer uuid;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v from public.sanctions_list_versions where id = p_version for update;
  if not found or v.activated_at is not null then return jsonb_build_object('status', 'not_waiting'); end if;
  if v.entry_count < 1 then return jsonb_build_object('status', 'empty'); end if;
  if not v.complete then return jsonb_build_object('status', 'incomplete'); end if;
  if exists (select 1 from public.sanctions_list_versions o
              where o.source = v.source and o.activated_at is not null and o.loaded_at > v.loaded_at) then
    return jsonb_build_object('status', 'superseded');
  end if;

  select o.entry_count into v_in_force from public.sanctions_list_versions o
   where o.source = v.source and o.activated_at is not null
   order by o.activated_at desc limit 1;
  v_short := v_in_force is not null and v.entry_count < 0.9 * v_in_force;

  v_proposer := coalesce(v.loaded_by, v.activation_proposed_by);
  if v_proposer is null and v_short then
    update public.sanctions_list_versions
       set activation_proposed_by = v_me, activation_proposed_at = now(), previous_entries = v_in_force
     where id = p_version;
    return jsonb_build_object('status', 'proposed');
  end if;
  if v_proposer = v_me then
    return jsonb_build_object('status', case when v.loaded_by = v_me then 'own_upload' else 'own_proposal' end);
  end if;

  update public.sanctions_list_versions
     set activated_at = now(), activated_by = v_me, previous_entries = v_in_force
   where id = p_version;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.list_activated', 'sanctions_list_version', p_version::text,
          jsonb_build_object('source', v.source, 'entries', v.entry_count, 'in_force', v_in_force,
                             'short', v_short, 'proposed_by', v_proposer, 'scuml_item', 9));
  return jsonb_build_object('status', 'ok');
end;
$$;
revoke all on function public.sanctions_list_activate(uuid) from public, anon;
grant execute on function public.sanctions_list_activate(uuid) to authenticated;

/* ---------------------------------------------------------- queue claim */

create or replace function public.sanctions_claim_queue(p_limit integer)
returns setof public.sanctions_screen_queue
language sql
security definer
set search_path to ''
as $$
  update public.sanctions_screen_queue q
     set taken_at = now()
   where q.id in (
     select c.id from public.sanctions_screen_queue c
      where c.done_at is null
        and (c.taken_at is null or c.taken_at < now() - interval '30 minutes')
      order by (c.subject_kind = 'transaction') desc, c.enqueued_at
      limit greatest(1, least(coalesce(p_limit, 200), 1000))
      for update skip locked)
  returning q.*;
$$;
revoke all on function public.sanctions_claim_queue(integer) from public, anon, authenticated;
grant execute on function public.sanctions_claim_queue(integer) to service_role;

/* ------------------------------------------------------- staff: decide */

create or replace function public.sanctions_hit_propose(p_hit uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_hit public.sanctions_hits%rowtype;
  v_id uuid;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_decision not in ('clear', 'confirm', 'release') or char_length(btrim(coalesce(p_note, ''))) < 3 then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_hit from public.sanctions_hits h where h.id = p_hit;
  if not found
     or (p_decision in ('clear', 'confirm') and v_hit.status <> 'open')
     or (p_decision = 'release' and v_hit.status <> 'confirmed') then
    return jsonb_build_object('status', 'not_open');
  end if;
  if v_hit.person_id = v_me then return jsonb_build_object('status', 'own_case'); end if;
  insert into public.sanctions_hit_decisions (hit_id, decision, note, proposed_by)
  values (p_hit, p_decision, left(btrim(p_note), 2000), v_me)
  on conflict (hit_id) where approved_by is null and rejected_by is null do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('status', 'already_proposed'); end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.proposed', 'sanctions_hit', p_hit::text,
          jsonb_build_object('decision', p_decision, 'scuml_item', 8));
  return jsonb_build_object('status', 'ok', 'decisionId', v_id);
end;
$$;
revoke all on function public.sanctions_hit_propose(uuid, text, text) from public, anon;
grant execute on function public.sanctions_hit_propose(uuid, text, text) to authenticated;

create or replace function public.sanctions_hit_reject(p_decision uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_d public.sanctions_hit_decisions%rowtype;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_d from public.sanctions_hit_decisions d where d.id = p_decision for update;
  if not found or v_d.approved_by is not null or v_d.rejected_by is not null then
    return jsonb_build_object('status', 'not_pending');
  end if;
  if v_d.proposed_by = v_me then return jsonb_build_object('status', 'own_proposal'); end if;
  if exists (select 1 from public.sanctions_hits h where h.id = v_d.hit_id and h.person_id = v_me) then
    return jsonb_build_object('status', 'own_case');
  end if;
  update public.sanctions_hit_decisions set rejected_by = v_me, rejected_at = now() where id = p_decision;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.rejected', 'sanctions_hit', v_d.hit_id::text,
          jsonb_build_object('decision_id', p_decision, 'proposed_by', v_d.proposed_by, 'decision', v_d.decision, 'scuml_item', 19));
  return jsonb_build_object('status', 'ok');
end;
$$;
revoke all on function public.sanctions_hit_reject(uuid) from public, anon;
grant execute on function public.sanctions_hit_reject(uuid) to authenticated;

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
  v_new text;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_d from public.sanctions_hit_decisions d where d.id = p_decision for update;
  if not found or v_d.approved_by is not null or v_d.rejected_by is not null then
    return jsonb_build_object('status', 'not_pending');
  end if;
  if v_d.proposed_by = v_me then return jsonb_build_object('status', 'own_proposal'); end if;
  select * into v_hit from public.sanctions_hits h where h.id = v_d.hit_id for update;
  if v_hit.person_id = v_me then return jsonb_build_object('status', 'own_case'); end if;
  v_new := case v_d.decision when 'confirm' then 'confirmed' when 'clear' then 'cleared' else 'released' end;
  if (v_d.decision in ('clear', 'confirm') and v_hit.status <> 'open')
     or (v_d.decision = 'release' and v_hit.status <> 'confirmed') then
    return jsonb_build_object('status', 'not_open');
  end if;

  update public.sanctions_hit_decisions set approved_by = v_me, approved_at = now() where id = p_decision;
  /* decided_at is the first decision's time and never moves. */
  update public.sanctions_hits set status = v_new, decided_at = coalesce(decided_at, now()) where id = v_hit.id;

  if v_d.decision = 'confirm' then
    /* The desk's own claim; the row follows every desk's claims, reason `plain`. */
    perform private.hold_claim_set(v_hit.person_id, 'sanctions', now() + interval '30 days', v_me);
  elsif v_d.decision = 'release'
        and not exists (select 1 from public.sanctions_hits h
                         where h.person_id = v_hit.person_id and h.status = 'confirmed') then
    /* Only this desk's claim ends; an STR or "not me" hold stands. */
    perform private.hold_claim_clear(v_hit.person_id, 'sanctions');
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.' || v_new, 'sanctions_hit', v_hit.id::text,
          jsonb_build_object('decision_id', p_decision, 'proposed_by', v_d.proposed_by, 'scuml_item', 8,
                             'claim_set', v_d.decision = 'confirm', 'claim_cleared', v_d.decision = 'release'));
  return jsonb_build_object('status', 'ok', 'decision', v_d.decision, 'personId', v_hit.person_id);
end;
$$;
revoke all on function public.sanctions_hit_approve(uuid) from public, anon;
grant execute on function public.sanctions_hit_approve(uuid) to authenticated;

/* The rolling hold: thirty days from now for everyone still confirmed, kept
   against the staff member who approved the latest confirmation. */
create or replace function public.sanctions_renew_holds()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_person uuid;
  v_by uuid;
  v_count integer := 0;
begin
  for v_person in
    select distinct h.person_id from public.sanctions_hits h
      join auth.users u on u.id = h.person_id
     where h.status = 'confirmed'
  loop
    select d.approved_by into v_by
      from public.sanctions_hit_decisions d
      join public.sanctions_hits h on h.id = d.hit_id
     where h.person_id = v_person and h.status = 'confirmed' and d.decision = 'confirm' and d.approved_by is not null
     order by d.approved_at desc
     limit 1;
    perform private.hold_claim_set(v_person, 'sanctions', now() + interval '30 days', v_by);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.sanctions_renew_holds() from public, anon, authenticated;
grant execute on function public.sanctions_renew_holds() to service_role;

/* ------------------------------------------------------------- the desk */

create or replace function public.sanctions_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not private.compliance_staff(v_me) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'me', v_me,
    'lists', coalesce((
      select jsonb_agg(jsonb_build_object('source', v.source, 'activatedAt', v.activated_at, 'entries', v.entry_count, 'origin', v.origin) order by v.source)
        from (select distinct on (source) * from public.sanctions_list_versions
               where activated_at is not null order by source, activated_at desc) v
    ), '[]'::jsonb),
    'waitingLists', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'source', v.source, 'entries', v.entry_count,
                                          'previousEntries', (select o.entry_count from public.sanctions_list_versions o
                                                               where o.source = v.source and o.activated_at is not null
                                                               order by o.activated_at desc limit 1),
                                          'origin', v.origin, 'loadedBy', v.loaded_by, 'loadedAt', v.loaded_at,
                                          'proposedBy', v.activation_proposed_by) order by v.loaded_at desc)
        from public.sanctions_list_versions v
       where private.sanctions_list_waiting(v)
    ), '[]'::jsonb),
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'personId', h.person_id, 'source', h.source, 'reference', h.entry_reference,
               'kind', h.match_kind, 'score', h.score, 'screenedName', h.screened_name,
               'matchedName', h.matched_name, 'createdAt', h.created_at, 'trigger', s.trigger, 'status', h.status,
               'commonName', h.common_name,
               'datesOfBirth', to_jsonb(e.dates_of_birth), 'nationalities', to_jsonb(e.nationalities),
               'delisted', exists (select 1 from public.sanctions_delisting_flags f where f.hit_id = h.id),
               'moneyHeld', private.money_hold_until(h.person_id) is not null,
               'claims', coalesce((select jsonb_agg(jsonb_build_object('owner', c.owner, 'until', c.until) order by c.owner)
                                     from private.hold_claims c where c.user_id = h.person_id), '[]'::jsonb),
               'pending', (select jsonb_build_object('id', d.id, 'decision', d.decision, 'note', d.note,
                                                     'proposedBy', d.proposed_by, 'proposedAt', d.proposed_at)
                             from public.sanctions_hit_decisions d
                            where d.hit_id = h.id and d.approved_by is null and d.rejected_by is null))
             order by h.status = 'open' desc, h.common_name, h.match_kind = 'exact' desc, h.created_at)
        from public.sanctions_hits h
        join public.sanctions_screenings s on s.id = h.screening_id
        join public.sanctions_entries e on e.id = h.entry_id
       where h.status in ('open', 'confirmed')
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'subject', r.subject_kind, 'trigger', r.trigger,
                                          'outcome', r.outcome, 'at', r.screened_at) order by r.screened_at desc)
        from (select * from public.sanctions_screenings order by screened_at desc limit 30) r
    ), '[]'::jsonb),
    'waiting', (select count(*) from public.sanctions_screen_queue where done_at is null)
  );
end;
$$;
revoke all on function public.sanctions_desk() from public, anon;
grant execute on function public.sanctions_desk() to authenticated;

/* ------------------------------------------------------ the risk hook */

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
comment on function private.sanctions_hit_for(uuid) is
  'SCUML items 8 and 15: TRUE for a confirmed match, or an open exact match that is not a common-name match; FALSE once screened otherwise; NULL when never screened (never a hit, never clear).';

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
       or cur.source = 'override'
       or exists (select 1 from public.pep_declarations d where d.user_id = p.uid and d.declared_at > cur.set_at)
       or exists (select 1 from public.pep_flags f where f.user_id = p.uid and f.set_at > cur.set_at)
       or exists (select 1 from public.pep_clear_approvals c join public.pep_flags f on f.id = c.flag_id
                   where f.user_id = p.uid and c.approved_at > cur.set_at)
       or exists (select 1 from public.reports r
                   where r.target_type in ('user', 'profile') and r.target_id = p.uid::text
                     and greatest(r.created_at, coalesce(r.resolved_at, r.created_at)) > cur.set_at)
       /* A sanctions decision approved, or an exact match raised, since the class was set. */
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

/* --------------------------------------------------------------- read-back */

do $readback$
declare
  bad text := '';
  t text;
begin
  foreach t in array array['sanctions_list_versions', 'sanctions_entries', 'sanctions_screen_queue',
                           'sanctions_screenings', 'sanctions_hits', 'sanctions_hit_decisions',
                           'sanctions_delisting_flags'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      bad := bad || format(' [%s has RLS off]', t);
    end if;
    if has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('authenticated', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE') then
      bad := bad || format(' [%s is not born locked]', t);
    end if;
    if has_table_privilege('service_role', 'public.' || t, 'DELETE') then
      bad := bad || format(' [the service role can delete from %s]', t);
    end if;
  end loop;
  if has_table_privilege('service_role', 'public.sanctions_hits', 'UPDATE')
     or has_table_privilege('service_role', 'public.sanctions_hit_decisions', 'INSERT, UPDATE')
     or has_table_privilege('service_role', 'public.sanctions_screenings', 'UPDATE') then
    bad := bad || ' [the service role can decide or rewrite a match]';
  end if;
  if has_function_privilege('anon', 'public.sanctions_desk()', 'EXECUTE') then bad := bad || ' [the desk is callable signed out]'; end if;
  if has_function_privilege('authenticated', 'public.sanctions_claim_queue(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sanctions_renew_holds()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sanctions_lists_waiting()', 'EXECUTE') then
    bad := bad || ' [a job function is callable by a member]';
  end if;
  if has_function_privilege('authenticated', 'private.sanctions_hit_for(uuid)', 'EXECUTE') then
    bad := bad || ' [the risk hook is callable by a member]';
  end if;
  if position('account_money_holds' in pg_get_functiondef('public.sanctions_hit_approve(uuid)'::regprocedure)) > 0
     or position('account_money_holds' in pg_get_functiondef('public.sanctions_renew_holds()'::regprocedure)) > 0 then
    bad := bad || ' [the sanctions desk writes account_money_holds directly]';
  end if;
  if exists (select 1 from pg_trigger tr join pg_class c on c.oid = tr.tgrelid
              where tr.tgname like 'zz_sanctions_screen_%'
                and c.relname not in ('agent_applications', 'agent_verification_checks', 'bank_accounts', 'payout_accounts',
                                      'transactions', 'rent_payments', 'business_transfers')) then
    bad := bad || ' [a screening trigger sits on something that is not a live table]';
  end if;
  if (select count(*) from pg_trigger where tgname like 'zz_sanctions_screen_%') <> 7 then
    bad := bad || ' [not all seven screening triggers are in place]';
  end if;
  if bad <> '' then raise exception 'SCUML item 8 READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* ------------------------------------------------------------------- probe */

-- Rolled back. A list uploaded by one staff member waits and cannot be
-- activated by them; a second activates it, which queues everyone with a
-- profile. A settled charge and a bank account queue their parties. The job's
-- writes (a screening and an exact match, as lib/compliance/sanctions/screen.ts
-- makes them) show on the desk; the matched person cannot decide their own
-- match; one staff member proposes confirm and cannot approve it, a second
-- does: the person has the sanctions desk's claim, a `plain` hold row, and a
-- new bank account is refused with a sentence naming nothing. The risk hook
-- reads true. A new list version without the reference flags a de-listing.
-- A release proposed by one and approved by another ends the hold. A
-- common-name exact match does not move the risk hook. A short URL file needs
-- a proposer and a different approver.
do $probe$
declare
  v_person uuid := gen_random_uuid();
  v_common uuid := gen_random_uuid();
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_v1 uuid;
  v_v2 uuid;
  v_v3 uuid;
  v_entry uuid;
  v_entry2 uuid;
  v_screen uuid;
  v_hit uuid;
  v_hit2 uuid;
  v_dec uuid;
  v_ans jsonb;
  v_err text;
  v_claimed int;
  v_agent uuid;
  v_listing uuid;
  v_booking uuid;
  v_tx uuid;
  v_hits_before bigint;
  v_queue_before bigint;
  v_told_before bigint;
begin
  select count(*) into v_hits_before from public.sanctions_hits;
  select count(*) into v_queue_before from public.sanctions_screen_queue;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml8-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_person, 'person'), (v_common, 'common'), (v_s1, 'staff1'), (v_s2, 'staff2')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin');
    update public.profiles set first_name = 'Probeman', surname = 'Listedsson' where id = v_person;

    -- 1. An upload waits for a second person; activation re-screens everyone.
    insert into public.sanctions_list_versions (source, sha256, origin, loaded_by, entry_count)
    values ('un', encode(sha256(convert_to('scuml8-probe-v1-' || gen_random_uuid(), 'UTF8')), 'hex'), 'upload', v_s1, 2)
    returning id into v_v1;
    insert into public.sanctions_entries (version_id, source, reference, kind, primary_name, names_normalised)
    values (v_v1, 'un', 'QDi.PROBE1', 'individual', 'PROBEMAN LISTEDSSON', array['probeman listedsson'])
    returning id into v_entry;
    insert into public.sanctions_entries (version_id, source, reference, kind, primary_name, names_normalised)
    values (v_v1, 'un', 'QDi.PROBE2', 'individual', 'MUHAMMAD YUSUF', array['muhammad yusuf'])
    returning id into v_entry2;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_list_activate(v_v1);
    if v_ans->>'status' <> 'own_upload' then raise exception 'PROBE FAILED: the loader activated their own upload: %', v_ans; end if;
    if (select public.sanctions_desk()->'waitingLists') = '[]'::jsonb then raise exception 'PROBE FAILED: the upload is not waiting on the desk'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_list_activate(v_v1);
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: a second person could not activate: %', v_ans; end if;
    if not exists (select 1 from public.sanctions_screen_queue q
                    where q.person_id = v_person and q.trigger = 'list_change' and q.done_at is null) then
      raise exception 'PROBE FAILED: activation did not queue everyone';
    end if;

    -- 2. A bank account queues its owner; the queue is claimed, transactions first.
    perform set_config('request.jwt.claims', '', true);
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
    values (v_person, '058', 'Probe Bank', '0123456789', 'PROBEMAN LISTEDSSON', now());
    if not exists (select 1 from public.sanctions_screen_queue q
                    where q.person_id = v_person and q.trigger = 'payout_account' and q.done_at is null) then
      raise exception 'PROBE FAILED: a bank account did not re-queue its owner';
    end if;
    -- A split-settlement charge queues itself as a card payment.
    insert into public.agents (user_id, display_name, role) values (v_common, 'Probe Host', 'owner') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML 8 probe shortlet', 'shortlet', 'owner', 'DRAFT', false, 5000000, 'night')
    returning id into v_listing;
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing;
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_person, (now() at time zone 'Africa/Lagos')::date + 2, (now() at time zone 'Africa/Lagos')::date + 3, 1, 0, 0, 0)
    returning id into v_booking;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking, 'paystack', 'scuml8-probe-' || gen_random_uuid(), 5000000, 'NGN', 'PENDING')
    returning id into v_tx;
    perform set_config('vallo.recording_unknown_charge', '', true);
    if not exists (select 1 from public.sanctions_screen_queue q
                    where q.transaction_id = v_tx and q.transaction_kind = 'card_payment' and q.done_at is null) then
      raise exception 'PROBE FAILED: a charge did not queue itself for screening';
    end if;
    select count(*) into v_claimed from public.sanctions_claim_queue(1000);
    if v_claimed < 3 then raise exception 'PROBE FAILED: the queue was not claimed'; end if;

    -- 3. The job's writes: a screening and an exact match.
    insert into public.sanctions_screenings (subject_kind, person_id, trigger, names_screened, un_version_id, outcome, best_score, matches)
    values ('person', v_person, 'list_change', array['Probeman Listedsson'], v_v1, 'exact', 1, '[]'::jsonb)
    returning id into v_screen;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name)
    values (v_screen, v_person, 'un', v_entry, 'QDi.PROBE1', 'exact', 1, 'Probeman Listedsson', 'PROBEMAN LISTEDSSON')
    returning id into v_hit;
    if private.sanctions_hit_for(v_person) is not true then raise exception 'PROBE FAILED: an open exact match does not move the risk hook'; end if;
    begin
      update public.sanctions_screenings set outcome = 'clear' where id = v_screen;
      raise exception 'PROBE FAILED: a screening was rewritten';
    exception when raise_exception then
      if sqlerrm not like 'SCUML item 8:%' then raise; end if;
    end;

    -- 4. Nobody decides their own match; two people confirm; the hold is neutral.
    select count(*) into v_told_before from public.notifications n where n.user_id = v_person;
    insert into public.user_roles (user_id, role) values (v_person, 'admin');
    perform set_config('request.jwt.claims', json_build_object('sub', v_person, 'role', 'authenticated')::text, true);
    if public.sanctions_hit_propose(v_hit, 'clear', 'It is not me.')->>'status' <> 'own_case' then
      raise exception 'PROBE FAILED: the matched person proposed on their own match';
    end if;
    delete from public.user_roles where user_id = v_person;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_desk();
    if not exists (select 1 from jsonb_array_elements(v_ans->'hits') h where (h->>'id')::uuid = v_hit and h->>'kind' = 'exact') then
      raise exception 'PROBE FAILED: the desk does not show the match';
    end if;
    v_ans := public.sanctions_hit_propose(v_hit, 'confirm', 'Date of birth and nationality match the listing.');
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: propose answered %', v_ans; end if;
    v_dec := (v_ans->>'decisionId')::uuid;
    if public.sanctions_hit_approve(v_dec)->>'status' <> 'own_proposal' then
      raise exception 'PROBE FAILED: the proposer approved their own proposal';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_hit_approve(v_dec);
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: approve answered %', v_ans; end if;
    if not exists (select 1 from private.hold_claims c where c.user_id = v_person and c.owner = 'sanctions')
       or not exists (select 1 from public.account_money_holds h where h.user_id = v_person and h.reason = 'plain' and h.hold_until > now()) then
      raise exception 'PROBE FAILED: a confirmed match holds no money, or not under the plain reason';
    end if;
    begin
      insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
      values (v_person, '044', 'Probe Bank Two', '9876543210', 'PROBEMAN LISTEDSSON', now());
      raise exception 'PROBE FAILED: a confirmed person added a bank account';
    exception when sqlstate 'RM050' then
      v_err := sqlerrm;
      if v_err ~* '(sanction|review|compliance|report|until)' then
        raise exception 'PROBE FAILED: the refusal names something: %', v_err;
      end if;
    end;
    if public.sanctions_renew_holds() < 1 then raise exception 'PROBE FAILED: the rolling hold was not renewed'; end if;
    if private.sanctions_hit_for(v_person) is not true then raise exception 'PROBE FAILED: a confirmed match does not move the risk hook'; end if;
    if not exists (select 1 from public.risk_people_due(500) d where d.user_id = v_person) then
      raise exception 'PROBE FAILED: a matched person is not due a class';
    end if;
    if (select count(*) from public.notifications n where n.user_id = v_person) <> v_told_before then
      raise exception 'PROBE FAILED: the matched person was told something';
    end if;

    -- 5. A new version without the reference flags the de-listing (a URL file,
    --    whole and not short, activated by the job itself).
    insert into public.sanctions_list_versions (source, sha256, origin, entry_count)
    values ('un', encode(sha256(convert_to('scuml8-probe-v2-' || gen_random_uuid(), 'UTF8')), 'hex'), 'url', 2)
    returning id into v_v2;
    insert into public.sanctions_entries (version_id, source, reference, kind, primary_name, names_normalised)
    values (v_v2, 'un', 'QDi.PROBE3', 'individual', 'SOMEBODY ELSE', array['somebody else']),
           (v_v2, 'un', 'QDi.PROBE2', 'individual', 'MUHAMMAD YUSUF', array['muhammad yusuf']);
    update public.sanctions_list_versions set activated_at = now() where id = v_v2;
    if not exists (select 1 from public.sanctions_delisting_flags f where f.hit_id = v_hit and f.version_id = v_v2) then
      raise exception 'PROBE FAILED: a de-listing was not flagged';
    end if;

    -- 6. Release: two people, and only this desk's claim ends.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_hit_propose(v_hit, 'release', 'De-listed by the UN; the new version drops the reference.');
    v_dec := (v_ans->>'decisionId')::uuid;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    if public.sanctions_hit_approve(v_dec)->>'status' <> 'ok' then raise exception 'PROBE FAILED: release was not approved'; end if;
    if private.money_hold_until(v_person) is not null then raise exception 'PROBE FAILED: still held after the release'; end if;

    -- 7. A common-name exact match does not move the risk hook while open.
    insert into public.sanctions_screenings (subject_kind, person_id, trigger, names_screened, un_version_id, outcome, best_score, matches)
    values ('person', v_common, 'manual', array['Muhammad Yusuf'], v_v2, 'exact', 1, '[]'::jsonb)
    returning id into v_screen;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name, common_name)
    values (v_screen, v_common, 'un', v_entry2, 'QDi.PROBE2', 'exact', 1, 'Muhammad Yusuf', 'MUHAMMAD YUSUF', true)
    returning id into v_hit2;
    if private.sanctions_hit_for(v_common) is not false then raise exception 'PROBE FAILED: an open common-name match moved the risk hook'; end if;
    begin
      update public.sanctions_hits set common_name = false where id = v_hit2;
      raise exception 'PROBE FAILED: a match was edited';
    exception when raise_exception then
      if sqlerrm not like 'SCUML item 8:%' then raise; end if;
    end;

    -- 8. A short URL file needs a proposer and a different approver.
    insert into public.sanctions_list_versions (source, sha256, origin, entry_count)
    values ('un', encode(sha256(convert_to('scuml8-probe-v3-' || gen_random_uuid(), 'UTF8')), 'hex'), 'url', 1)
    returning id into v_v3;
    if public.sanctions_list_activate(v_v3)->>'status' <> 'proposed' then raise exception 'PROBE FAILED: a short file was not held for a proposal'; end if;
    if public.sanctions_list_activate(v_v3)->>'status' <> 'own_proposal' then raise exception 'PROBE FAILED: the proposer activated a short file'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    if public.sanctions_list_activate(v_v3)->>'status' <> 'ok' then raise exception 'PROBE FAILED: a second person could not activate a short file'; end if;

    -- 9. A member reads nothing.
    perform set_config('request.jwt.claims', json_build_object('sub', v_common, 'role', 'authenticated')::text, true);
    if public.sanctions_desk()->>'status' <> 'forbidden' then raise exception 'PROBE FAILED: a member read the sanctions desk'; end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.sanctions_hits) <> v_hits_before
     or (select count(*) from public.sanctions_screen_queue) <> v_queue_before
     or exists (select 1 from auth.users where id in (v_person, v_common, v_s1, v_s2)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
