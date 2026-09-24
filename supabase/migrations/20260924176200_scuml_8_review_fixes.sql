/*
 * SCUML ITEMS 8, 9 AND 19: THE SANCTIONS REVIEW, FIXED.
 *
 * Builds on 20260924176000 and 20260924176100. What changes:
 *
 *   LISTS ARE ACTIVATED BY A SECOND PERSON (items 9 and 19). A list a staff
 *   member uploads is loaded INACTIVE; a DIFFERENT staff member activates it
 *   (`sanctions_list_activate`). A list fetched from its URL activates itself,
 *   unless it has fewer than 90% of the entries of the version in force, a
 *   sign of a truncated file: then it waits for a staff member too.
 *
 *   DE-LISTING IS FLAGGED (item 9). When a version is activated, a confirmed
 *   match whose list reference is no longer on the new version raises a row
 *   in `sanctions_delisting_flags` for the desk.
 *
 *   A CONFIRMED MATCH CAN BE RELEASED, BY TWO PEOPLE. `sanctions_release_propose`
 *   and `sanctions_release_approve` (item 19). Release moves the hit to
 *   `released` and, when the person has no other confirmed match, ends the
 *   hold.
 *
 *   A PROPOSAL CAN BE REJECTED (`sanctions_hit_reject`): anyone but the
 *   proposer stamps it rejected, and the match is open for a new proposal.
 *
 *   THE HOLD ROLLS, THIRTY DAYS AT A TIME. A ten-year end date is itself a
 *   tip-off. The approval writes 30 days, reason `plain`, and the screening
 *   job renews it (`sanctions_renew_holds`) while a confirmed match stands.
 *
 *   A HIT'S STATUS MOVES ONCE: open to cleared or confirmed, and confirmed to
 *   released. Nothing else (trigger).
 *
 *   MORE MONEY IS SCREENED. AFTER INSERT enqueue triggers on
 *   `rent_payments`, `escrows`, `ledger_entries` and `business_transfers`.
 *   The enqueue functions carry `lock_timeout = 200ms`: a busy queue can never
 *   make a payment wait.
 *
 *   THE QUEUE IS CLAIMED, NOT READ (`sanctions_claim_queue`): update ...
 *   returning, `for update skip locked`, transactions first.
 *
 *   THE DESK SHOWS the listing's date of birth and nationality beside each
 *   match, lists waiting on activation, confirmed matches and de-listing
 *   flags.
 */

/* ------------------------------------------------------ lists: activation */

alter table public.sanctions_list_versions
  add column if not exists activated_by uuid,
  add column if not exists previous_entries integer;

/* Low-quality UN aliases are not stored for matching (they are too loose). */

create or replace function public.sanctions_list_activate(p_version uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v public.sanctions_list_versions%rowtype;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v from public.sanctions_list_versions where id = p_version for update;
  if not found or v.activated_at is not null then return jsonb_build_object('status', 'not_waiting'); end if;
  if v.loaded_by is not distinct from v_me then return jsonb_build_object('status', 'own_upload'); end if;
  if v.entry_count < 1 then return jsonb_build_object('status', 'empty'); end if;
  update public.sanctions_list_versions set activated_at = now(), activated_by = v_me where id = p_version;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.list_activated', 'sanctions_list_version', p_version::text,
          jsonb_build_object('source', v.source, 'entries', v.entry_count, 'previous_entries', v.previous_entries,
                             'loaded_by', v.loaded_by, 'scuml_item', 9));
  return jsonb_build_object('status', 'ok');
end;
$$;
revoke all on function public.sanctions_list_activate(uuid) from public, anon;
grant execute on function public.sanctions_list_activate(uuid) to authenticated;

/* ------------------------------------------------------ de-listing flags */

create table if not exists public.sanctions_delisting_flags (
  id uuid primary key default gen_random_uuid(),
  hit_id uuid not null references public.sanctions_hits(id),
  version_id uuid not null references public.sanctions_list_versions(id),
  raised_at timestamptz not null default now(),
  unique (hit_id, version_id)
);
alter table public.sanctions_delisting_flags enable row level security;
revoke all on table public.sanctions_delisting_flags from public, anon, authenticated;
comment on table public.sanctions_delisting_flags is
  'SCUML item 9. A confirmed match whose list reference is absent from a newly activated version: a de-listing for staff to act on (a two-person release). Kept five years.';

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

/* ------------------------------------------------ decisions: reject, release */

alter table public.sanctions_hit_decisions
  add column if not exists rejected_by uuid,
  add column if not exists rejected_at timestamptz;
alter table public.sanctions_hit_decisions drop constraint if exists sanctions_hit_decisions_decision_check;
alter table public.sanctions_hit_decisions
  add constraint sanctions_hit_decisions_decision_check check (decision in ('clear', 'confirm', 'release'));
alter table public.sanctions_hit_decisions drop constraint if exists sanctions_hit_decisions_rejected_check;
alter table public.sanctions_hit_decisions
  add constraint sanctions_hit_decisions_rejected_check
  check ((rejected_by is null) = (rejected_at is null)
         and (rejected_by is null or rejected_by <> proposed_by)
         and (rejected_by is null or approved_by is null));

drop index if exists public.sanctions_hit_decisions_one_pending;
create unique index sanctions_hit_decisions_one_pending
  on public.sanctions_hit_decisions (hit_id) where approved_by is null and rejected_by is null;

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

/* A hit's status moves once: open to cleared/confirmed, confirmed to released. */
alter table public.sanctions_hits drop constraint if exists sanctions_hits_status_check;
alter table public.sanctions_hits
  add constraint sanctions_hits_status_check check (status in ('open', 'cleared', 'confirmed', 'released'));

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
     or new.match_kind <> old.match_kind or new.score <> old.score or new.screened_name <> old.screened_name then
    raise exception 'SCUML item 8: a match is not edited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists sanctions_hits_status_guard on public.sanctions_hits;
create trigger sanctions_hits_status_guard
  before update or delete on public.sanctions_hits
  for each row execute function private.sanctions_hit_status_guard();

create or replace function public.sanctions_hit_propose(p_hit uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_status text;
  v_id uuid;
begin
  if not private.compliance_staff(v_me) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_decision not in ('clear', 'confirm', 'release') or char_length(btrim(coalesce(p_note, ''))) < 3 then
    return jsonb_build_object('status', 'invalid');
  end if;
  select h.status into v_status from public.sanctions_hits h where h.id = p_hit;
  if v_status is null
     or (p_decision in ('clear', 'confirm') and v_status <> 'open')
     or (p_decision = 'release' and v_status <> 'confirmed') then
    return jsonb_build_object('status', 'not_open');
  end if;
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
  v_new := case v_d.decision when 'confirm' then 'confirmed' when 'clear' then 'cleared' else 'released' end;
  if (v_d.decision in ('clear', 'confirm') and v_hit.status <> 'open')
     or (v_d.decision = 'release' and v_hit.status <> 'confirmed') then
    return jsonb_build_object('status', 'not_open');
  end if;

  update public.sanctions_hit_decisions set approved_by = v_me, approved_at = now() where id = p_decision;
  update public.sanctions_hits set status = v_new, decided_at = now() where id = v_hit.id;

  if v_d.decision = 'confirm' then
    /* The freeze, thirty days at a time under the code that names nothing;
       the screening job renews it while the match stands. */
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (v_hit.person_id, now() + interval '30 days', 'plain', now())
    on conflict (user_id) do update
      set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
          reason = 'plain';
  elsif v_d.decision = 'release'
        and not exists (select 1 from public.sanctions_hits h
                         where h.person_id = v_hit.person_id and h.status = 'confirmed') then
    /* No confirmed match left: the plain hold ends now. Any other hold stands. */
    update public.account_money_holds set hold_until = now()
     where user_id = v_hit.person_id and reason = 'plain';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'compliance.sanctions.' || v_new, 'sanctions_hit', v_hit.id::text,
          jsonb_build_object('decision_id', p_decision, 'proposed_by', v_d.proposed_by, 'scuml_item', 8,
                             'hold_placed', v_d.decision = 'confirm', 'hold_released', v_d.decision = 'release'));
  return jsonb_build_object('status', 'ok', 'decision', v_d.decision, 'personId', v_hit.person_id);
end;
$$;

/* ---------------------------------------------------------- rolling hold */

create or replace function public.sanctions_renew_holds()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_count integer;
begin
  insert into public.account_money_holds (user_id, hold_until, reason, created_at)
  select distinct h.person_id, now() + interval '30 days', 'plain', now()
    from public.sanctions_hits h
    join auth.users u on u.id = h.person_id
   where h.status = 'confirmed'
  on conflict (user_id) do update
    set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
        reason = 'plain';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.sanctions_renew_holds() from public, anon, authenticated;
grant execute on function public.sanctions_renew_holds() to service_role;

/* ------------------------------------------------------- wider screening */

alter table public.sanctions_screen_queue drop constraint if exists sanctions_screen_queue_transaction_kind_check;
alter table public.sanctions_screen_queue add constraint sanctions_screen_queue_transaction_kind_check
  check (transaction_kind in ('card_payment', 'wallet_entry', 'rent_payment', 'escrow', 'ledger_entry', 'business_transfer'));
alter table public.sanctions_screenings drop constraint if exists sanctions_screenings_transaction_kind_check;
alter table public.sanctions_screenings add constraint sanctions_screenings_transaction_kind_check
  check (transaction_kind in ('card_payment', 'wallet_entry', 'rent_payment', 'escrow', 'ledger_entry', 'business_transfer'));

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
  on conflict (person_id) where subject_kind = 'person' and done_at is null do nothing;
exception when others then
  raise warning '[sanctions] enqueue failed: %', sqlstate;
end;
$$;

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
        when 'wallet_entries' then 'wallet_entry'
        when 'rent_payments' then 'rent_payment'
        when 'escrows' then 'escrow'
        when 'ledger_entries' then 'ledger_entry'
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

drop trigger if exists zz_sanctions_screen_rent_payments on public.rent_payments;
create trigger zz_sanctions_screen_rent_payments
  after insert on public.rent_payments
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_escrows on public.escrows;
create trigger zz_sanctions_screen_escrows
  after insert on public.escrows
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_ledger_entries on public.ledger_entries;
create trigger zz_sanctions_screen_ledger_entries
  after insert on public.ledger_entries
  for each row execute function private.sanctions_enqueue_from_row();
drop trigger if exists zz_sanctions_screen_business_transfers on public.business_transfers;
create trigger zz_sanctions_screen_business_transfers
  after insert on public.business_transfers
  for each row execute function private.sanctions_enqueue_from_row();

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
                                          'previousEntries', v.previous_entries, 'origin', v.origin,
                                          'loadedBy', v.loaded_by, 'loadedAt', v.loaded_at) order by v.loaded_at desc)
        from public.sanctions_list_versions v
       where v.activated_at is null and v.entry_count > 0
    ), '[]'::jsonb),
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'personId', h.person_id, 'source', h.source, 'reference', h.entry_reference,
               'kind', h.match_kind, 'score', h.score, 'screenedName', h.screened_name,
               'matchedName', h.matched_name, 'createdAt', h.created_at, 'trigger', s.trigger, 'status', h.status,
               'datesOfBirth', to_jsonb(e.dates_of_birth), 'nationalities', to_jsonb(e.nationalities),
               'delisted', exists (select 1 from public.sanctions_delisting_flags f where f.hit_id = h.id),
               'pending', (select jsonb_build_object('id', d.id, 'decision', d.decision, 'note', d.note,
                                                     'proposedBy', d.proposed_by, 'proposedAt', d.proposed_at)
                             from public.sanctions_hit_decisions d
                            where d.hit_id = h.id and d.approved_by is null and d.rejected_by is null))
             order by h.status = 'open' desc, h.match_kind = 'exact' desc, h.created_at)
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

/* --------------------------------------------------------------- readback */

do $$
begin
  if has_table_privilege('anon', 'public.sanctions_delisting_flags', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.sanctions_delisting_flags', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'SCUML item 9: sanctions_delisting_flags is not born locked';
  end if;
  if has_function_privilege('authenticated', 'public.sanctions_claim_queue(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sanctions_renew_holds()', 'EXECUTE') then
    raise exception 'SCUML item 8: a job function is callable by a member';
  end if;
end
$$;
