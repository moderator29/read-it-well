/*
 * SCUML ITEMS 8 AND 9: SANCTIONS SCREENING, AND RE-SCREENING WHEN A LIST CHANGES.
 *
 * SCUML-EFCC AML/CFT checklist for DNFBPs, Money Laundering (Prevention and
 * Prohibition) Act 2022. Item 8: screen every customer and every transaction
 * against the UN Consolidated Sanctions List and the Nigeria Sanctions List,
 * record the screening per person and per transaction, and keep a documented
 * escalation path for matches. Item 9 (the half that is ours): monitor the
 * lists for new listings and de-listings and re-screen when they change.
 * Registering with the Nigeria Sanctions Committee Alert System is the
 * founder's.
 *
 * ---------------------------------------------------------------------------
 * THE SHAPE.
 *
 *   sanctions_list_versions   one row per loaded file (UN or NG), by SHA-256,
 *                             from a URL fetch or a staff upload. A version is
 *                             loaded inactive, its entries written, then
 *                             ACTIVATED; activation re-screens everyone.
 *   sanctions_entries         names, aliases (normalised for matching), dates
 *                             of birth, nationalities and the list reference.
 *   sanctions_screen_queue    who and what waits to be screened, filled by
 *                             AFTER triggers (below) and drained by the
 *                             `sanctions-screen` job, which does the matching.
 *   sanctions_screenings      APPEND-ONLY. Every screening, clean ones too,
 *                             per person and per transaction, with the list
 *                             versions it was screened against.
 *   sanctions_hits            a match waiting on a decision: exact and close
 *                             (fuzzy, with its score) recorded separately.
 *   sanctions_hit_decisions   APPEND-ONLY (bar the one approval stamp). SCUML
 *                             item 19: a decision is proposed by one staff
 *                             member and takes effect only when a DIFFERENT
 *                             one approves it.
 *
 * WHEN A PERSON IS SCREENED (the enqueue triggers, all AFTER, all unable to
 * fail the write they follow):
 *   - lister verification: an agent application submitted or decided;
 *   - identity: an agent verification check recorded;
 *   - payout account: a bank account or an agent payout account added, or
 *     its resolved account name changing;
 *   - every transaction: a card payment (`transactions`) and every wallet
 *     ledger entry (`wallet_entries`), each screened against its parties;
 *   - a list version activated: everybody with a profile (item 9).
 *
 * NEVER INSIDE THE MONEY. The audit owns the ledger and settlement. The only
 * thing added to `transactions` and `wallet_entries` is an AFTER INSERT
 * trigger that writes one queue row inside an exception block: a screening
 * can never block, delay or fail a payment. Screening itself runs later, in
 * the job.
 *
 * ---------------------------------------------------------------------------
 * THE ESCALATION PATH (also in docs/COMPLIANCE_RUNBOOK.md).
 *
 *   1. The job records every screening. A match (exact or close) raises a
 *      hit on /admin/compliance?tab=sanctions. Nothing automatic happens to
 *      the person: no hold is placed on a match, exact or fuzzy, because a
 *      name is not an identity and a false freeze on a Nigerian name that
 *      shares tokens with a listed one is a harm of its own.
 *   2. A staff member checks it (date of birth, nationality, the documents
 *      we hold) and PROPOSES "not the same person" or "the same person",
 *      with a note of what they checked.
 *   3. A SECOND staff member approves (`sanctions_hit_approve`). The
 *      proposer cannot approve their own proposal.
 *   4. "The same person", approved, places the audit's own hold
 *      (`account_money_holds`, V-19, reason `compliance_review`): no money
 *      leaves the account and no payout account changes (the audit's
 *      triggers, RM050). This is the freeze the law expects for a designated
 *      person, done by two people rather than by a string comparison. The
 *      desk then offers the STR hand-off (SCUML item 6) and the officer
 *      reports to the NFIU and the Nigeria Sanctions Committee outside Vallo.
 *   5. NO TIPPING OFF. The member sees only the neutral hold sentence ("No
 *      money can leave this wallet while a hold is on it"); nothing names
 *      sanctions, a list, a report or a review.
 *
 * STAFF ONLY. Every table is born locked (RLS on, nothing granted to anon or
 * authenticated). Staff read through `sanctions_desk()` and decide through
 * the two decision functions, each checking `user_roles` for admin or
 * super_admin; the ingestion and the job use the service role.
 *
 * RETENTION (SCUML item 11). Screenings, hits and decisions are kept at
 * least five years and no purge job touches them. `person_id` is a plain
 * uuid, not a foreign key, so deleting an account anonymises the person
 * elsewhere and leaves the compliance record standing.
 */

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

/* ------------------------------------------------------------------ lists */

create table if not exists public.sanctions_list_versions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('un', 'ng')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  origin text not null check (origin in ('url', 'upload')),
  entry_count integer not null default 0 check (entry_count >= 0),
  loaded_by uuid,
  loaded_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (source, sha256)
);
comment on table public.sanctions_list_versions is
  'SCUML item 8/9. One row per loaded sanctions list file (UN Consolidated or Nigeria), identified by its SHA-256; activated once its entries are written, which re-screens everyone. Service role and staff functions only.';

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
create index if not exists sanctions_entries_version_idx on public.sanctions_entries (version_id);
comment on table public.sanctions_entries is
  'SCUML item 8. The entries of one list version: names and aliases (normalised for matching), dates of birth, nationalities and the list''s own reference.';

/* ------------------------------------------------------------------ queue */

create table if not exists public.sanctions_screen_queue (
  id bigint generated always as identity primary key,
  subject_kind text not null check (subject_kind in ('person', 'transaction')),
  person_id uuid,
  transaction_kind text check (transaction_kind in ('card_payment', 'wallet_entry')),
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
  'SCUML item 8. Who and what waits to be screened; one waiting row per person. Filled by AFTER triggers that cannot fail their write, drained by the sanctions-screen job.';

/* ------------------------------------------------------------- screenings */

create table if not exists public.sanctions_screenings (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (subject_kind in ('person', 'transaction')),
  person_id uuid,
  transaction_kind text check (transaction_kind in ('card_payment', 'wallet_entry')),
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
comment on table public.sanctions_screenings is
  'SCUML item 8. APPEND-ONLY. Every screening, clean ones too, per person and per transaction, with the list versions used. Kept at least five years (item 11); no purge touches it.';

create or replace function private.sanctions_append_only()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'SCUML item 8: % is append-only', tg_table_name using errcode = 'P0001';
end;
$$;

drop trigger if exists sanctions_screenings_append_only on public.sanctions_screenings;
create trigger sanctions_screenings_append_only
  before update or delete on public.sanctions_screenings
  for each row execute function private.sanctions_append_only();

/* ------------------------------------------------------- hits, decisions */

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
  status text not null default 'open' check (status in ('open', 'cleared', 'confirmed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  /* One hit per person, listed reference and name: a re-screen after a
     decision does not raise it again, and a new name does. */
  unique (person_id, source, entry_reference, screened_name)
);
create index if not exists sanctions_hits_open on public.sanctions_hits (created_at) where status = 'open';
comment on table public.sanctions_hits is
  'SCUML item 8. A match waiting on a two-person decision; exact and close (fuzzy) recorded separately. Kept at least five years.';

create table if not exists public.sanctions_hit_decisions (
  id uuid primary key default gen_random_uuid(),
  hit_id uuid not null references public.sanctions_hits(id),
  decision text not null check (decision in ('clear', 'confirm')),
  note text not null check (char_length(btrim(note)) between 3 and 2000),
  proposed_by uuid not null,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  check (approved_by is null or approved_by <> proposed_by),
  check ((approved_by is null) = (approved_at is null))
);
create unique index if not exists sanctions_hit_decisions_one_pending
  on public.sanctions_hit_decisions (hit_id) where approved_by is null;
comment on table public.sanctions_hit_decisions is
  'SCUML items 8 and 19. Proposed by one staff member, effective only when a different one approves. Append-only bar the single approval stamp.';

create or replace function private.sanctions_decision_guard()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SCUML item 19: a decision is never deleted' using errcode = 'P0001';
  end if;
  if old.approved_by is not null
     or new.id <> old.id or new.hit_id <> old.hit_id or new.decision <> old.decision or new.note <> old.note
     or new.proposed_by <> old.proposed_by or new.proposed_at <> old.proposed_at then
    raise exception 'SCUML item 19: a decision is only ever stamped approved, once' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists sanctions_hit_decisions_guard on public.sanctions_hit_decisions;
create trigger sanctions_hit_decisions_guard
  before update or delete on public.sanctions_hit_decisions
  for each row execute function private.sanctions_decision_guard();

/* --------------------------------------------------------------- locked */

alter table public.sanctions_list_versions enable row level security;
alter table public.sanctions_entries enable row level security;
alter table public.sanctions_screen_queue enable row level security;
alter table public.sanctions_screenings enable row level security;
alter table public.sanctions_hits enable row level security;
alter table public.sanctions_hit_decisions enable row level security;
revoke all on table public.sanctions_list_versions, public.sanctions_entries, public.sanctions_screen_queue,
  public.sanctions_screenings, public.sanctions_hits, public.sanctions_hit_decisions
  from public, anon, authenticated;

/* ---------------------------------------------------------------- enqueue */

create or replace function private.sanctions_enqueue_person(p_user uuid, p_trigger text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_user is null then return; end if;
  insert into public.sanctions_screen_queue (subject_kind, person_id, trigger)
  values ('person', p_user, p_trigger)
  on conflict (person_id) where subject_kind = 'person' and done_at is null do nothing;
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
as $$
declare
  v_user uuid;
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
    elsif tg_table_name = 'transactions' then
      insert into public.sanctions_screen_queue (subject_kind, transaction_kind, transaction_id, trigger)
      values ('transaction', 'card_payment', new.id, 'transaction');
    elsif tg_table_name = 'wallet_entries' then
      insert into public.sanctions_screen_queue (subject_kind, transaction_kind, transaction_id, trigger)
      values ('transaction', 'wallet_entry', new.id, 'transaction');
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

drop trigger if exists zz_sanctions_screen_wallet_entries on public.wallet_entries;
create trigger zz_sanctions_screen_wallet_entries
  after insert on public.wallet_entries
  for each row execute function private.sanctions_enqueue_from_row();

/* Item 9: a list version activated re-screens everyone. */
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
    on conflict (person_id) where subject_kind = 'person' and done_at is null do nothing;
  end if;
  return null;
end;
$$;
revoke all on function private.sanctions_rescreen_everyone() from public, anon, authenticated;

drop trigger if exists sanctions_list_activated on public.sanctions_list_versions;
create trigger sanctions_list_activated
  after update of activated_at on public.sanctions_list_versions
  for each row execute function private.sanctions_rescreen_everyone();

/* ---------------------------------------------------------- staff: read */

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
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'personId', h.person_id, 'source', h.source, 'reference', h.entry_reference,
               'kind', h.match_kind, 'score', h.score, 'screenedName', h.screened_name,
               'matchedName', h.matched_name, 'createdAt', h.created_at, 'trigger', s.trigger,
               'pending', (select jsonb_build_object('id', d.id, 'decision', d.decision, 'note', d.note,
                                                     'proposedBy', d.proposed_by, 'proposedAt', d.proposed_at)
                             from public.sanctions_hit_decisions d where d.hit_id = h.id and d.approved_by is null))
             order by h.match_kind = 'exact' desc, h.created_at)
        from public.sanctions_hits h join public.sanctions_screenings s on s.id = h.screening_id
       where h.status = 'open'
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

/* ------------------------------------------------------- staff: decide */

create or replace function public.sanctions_hit_propose(p_hit uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_id uuid;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_decision not in ('clear', 'confirm') or char_length(btrim(coalesce(p_note, ''))) < 3 then
    return jsonb_build_object('status', 'invalid');
  end if;
  if not exists (select 1 from public.sanctions_hits h where h.id = p_hit and h.status = 'open') then
    return jsonb_build_object('status', 'not_open');
  end if;
  insert into public.sanctions_hit_decisions (hit_id, decision, note, proposed_by)
  values (p_hit, p_decision, left(btrim(p_note), 2000), v_me)
  on conflict (hit_id) where approved_by is null do nothing
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
    /* The freeze: the audit's own hold, which its triggers enforce (RM050). */
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (v_hit.person_id, now() + interval '10 years', 'compliance_review', now())
    on conflict (user_id) do update
      set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
          reason = 'compliance_review';
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

/* --------------------------------------------------------------- readback */

do $$
declare t text;
begin
  foreach t in array array['sanctions_list_versions', 'sanctions_entries', 'sanctions_screen_queue',
                           'sanctions_screenings', 'sanctions_hits', 'sanctions_hit_decisions'] loop
    /* has_table_privilege answers for the named role; the information_schema
       grant views only show what the observing role is party to. */
    if has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('authenticated', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE') then
      raise exception 'SCUML item 8: % is not born locked', t;
    end if;
  end loop;
  if has_function_privilege('anon', 'public.sanctions_desk()', 'EXECUTE') then
    raise exception 'SCUML item 8: sanctions_desk is callable signed out';
  end if;
end
$$;
