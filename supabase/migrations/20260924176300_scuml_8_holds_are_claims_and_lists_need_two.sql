/*
 * SCUML ITEMS 8, 9 AND 19: THE SANCTIONS HOLD IS A CLAIM, A SHORT LIST NEEDS
 * TWO PEOPLE, AND NOBODY DECIDES THEIR OWN CASE.
 *
 * Builds on 20260924176000, 176100 and 176200, and on builder 3's shared
 * hold-claims model (20260924173200: `private.hold_claims`,
 * `private.hold_claim_set`, `private.hold_claim_clear`, `private.hold_recompute`).
 *
 * THE HOLD. The sanctions desk no longer writes `account_money_holds`. A
 * confirmed match sets the desk's own claim (owner `sanctions`, thirty days,
 * never shortened); the screening job renews it; a two-person release clears
 * it. The row is recomputed from every desk's claims, so a sanctions release
 * cannot end an STR hold (item 6), and a live "this was not me" hold is never
 * relabelled or ended, only lengthened.
 *
 * LIST ACTIVATION (items 9 and 19). `sanctions_list_activate`:
 *   - refuses a version when a later-loaded version of the same list is
 *     already in force (`superseded`);
 *   - re-checks the 90% floor against the count in force NOW;
 *   - an upload's loader is its proposer: a different person activates it;
 *   - a SHORT version (under 90%) always needs a proposer and a different
 *     approver: a URL version's first caller proposes (`proposed`), a second
 *     activates.
 *
 * NOT YOUR OWN CASE. Propose, approve and reject refuse a caller who is the
 * matched person (`own_case`), as well as a proposer approving or rejecting
 * their own proposal.
 *
 * RE-SCREENING ALWAYS WINS. A person already waiting (or being screened) who
 * is queued again, by a list change or anything else, has the row's
 * `enqueued_at` bumped and `taken_at` cleared; the worker marks a row done
 * only while `enqueued_at` still equals what it claimed, so a list change
 * that lands mid-screening is not lost.
 *
 * A MATCH IS FROZEN: besides the status rule, `source`, `entry_reference`,
 * `matched_name`, `screening_id` and `created_at` never change.
 *
 * THE DESK shows whether money is actually held for each confirmed match.
 *
 * ACCEPTED: `query_canceled`. The enqueue functions catch every error, but a
 * statement cancelled from outside (statement_timeout, pg_cancel_backend)
 * raises `query_canceled`, which PL/pgSQL's WHEN OTHERS deliberately does not
 * catch, so such a cancel still fails the write it rides on. That is the
 * database refusing to swallow a cancel, not a screening failure, and
 * `lock_timeout = 200ms` (which raises lock_not_available, caught) keeps a
 * busy queue from ever getting near it.
 */

/* ------------------------------------------------------------- the hold */

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
  update public.sanctions_hits set status = v_new, decided_at = now() where id = v_hit.id;

  if v_d.decision = 'confirm' then
    /* The desk's own claim; the row follows every desk's claims. */
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

create or replace function public.sanctions_renew_holds()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_person uuid;
  v_count integer := 0;
begin
  for v_person in
    select distinct h.person_id from public.sanctions_hits h
      join auth.users u on u.id = h.person_id
     where h.status = 'confirmed'
  loop
    perform private.hold_claim_set(v_person, 'sanctions', now() + interval '30 days', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.sanctions_renew_holds() from public, anon, authenticated;
grant execute on function public.sanctions_renew_holds() to service_role;

/* ---------------------------------------------------- nobody's own case */

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

/* ------------------------------------------------------- list activation */

alter table public.sanctions_list_versions
  add column if not exists activation_proposed_by uuid,
  add column if not exists activation_proposed_at timestamptz;

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
  if exists (select 1 from public.sanctions_list_versions o
              where o.source = v.source and o.activated_at is not null and o.loaded_at > v.loaded_at) then
    return jsonb_build_object('status', 'superseded');
  end if;

  /* The floor, against what is in force at this moment. */
  select o.entry_count into v_in_force from public.sanctions_list_versions o
   where o.source = v.source and o.activated_at is not null
   order by o.activated_at desc limit 1;
  v_short := v_in_force is not null and v.entry_count < 0.9 * v_in_force;

  v_proposer := coalesce(v.loaded_by, v.activation_proposed_by);
  if v_proposer is null and v_short then
    /* A short list fetched from its URL: the first person proposes. */
    update public.sanctions_list_versions
       set activation_proposed_by = v_me, activation_proposed_at = now(), previous_entries = v_in_force
     where id = p_version;
    return jsonb_build_object('status', 'proposed');
  end if;
  if v_proposer = v_me then return jsonb_build_object('status', 'own_upload'); end if;

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

/* -------------------------------------------------- re-screening wins */

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

/* ------------------------------------------------------- frozen matches */

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
     or new.created_at <> old.created_at then
    raise exception 'SCUML item 8: a match is not edited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

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
       where v.activated_at is null and v.entry_count > 0
    ), '[]'::jsonb),
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'personId', h.person_id, 'source', h.source, 'reference', h.entry_reference,
               'kind', h.match_kind, 'score', h.score, 'screenedName', h.screened_name,
               'matchedName', h.matched_name, 'createdAt', h.created_at, 'trigger', s.trigger, 'status', h.status,
               'datesOfBirth', to_jsonb(e.dates_of_birth), 'nationalities', to_jsonb(e.nationalities),
               'delisted', exists (select 1 from public.sanctions_delisting_flags f where f.hit_id = h.id),
               'moneyHeld', exists (select 1 from public.account_money_holds m
                                     where m.user_id = h.person_id and m.hold_until > now()),
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
  if position('account_money_holds' in pg_get_functiondef('public.sanctions_hit_approve(uuid)'::regprocedure)) > 0
     or position('account_money_holds' in pg_get_functiondef('public.sanctions_renew_holds()'::regprocedure)) > 0 then
    raise exception 'SCUML item 8: the sanctions desk writes account_money_holds directly; it must go through hold claims';
  end if;
end
$$;
