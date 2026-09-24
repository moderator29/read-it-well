/*
 * SCUML ITEMS 8, 9 AND 19: THE DESK WAITS ONLY ON WHAT CAN MOVE, THE HOLD
 * REMEMBERS WHO DECIDED IT, AND A DECISION'S TIME IS FROZEN.
 *
 * Builds on 20260924176000 to 176300 and on builder 3's hold claims
 * (20260924173200, 173300). The calls to `private.hold_claim_set` and
 * `private.hold_claim_clear` keep their shape: builder 3's recompute
 * underneath decides how a claim becomes the row.
 *
 * WAITING LISTS. A version is waiting on a person only while it can still be
 * activated: loaded, not active, not SUPERSEDED (a same-list version loaded
 * later is already in force) and COMPLETE (the file proved it is whole: the
 * UN closing tag, the Nigeria END row). An incomplete version cannot be
 * activated at all (`incomplete`); staff load the whole file instead. The
 * desk's list and the job's count (`sanctions_lists_waiting`) use the same
 * rule, so an alert never points at something nobody can act on.
 *
 * THE RENEWAL KEEPS WHO DECIDED. `sanctions_renew_holds` sets each claim
 * with the staff member who approved the latest confirmation, not null.
 *
 * A DECISION'S TIME IS FROZEN: once `decided_at` is set on a match it never
 * changes. `sanctions_hit_approve` keeps it (`coalesce`), so a later release
 * records its own time on its decision row, not on the match.
 *
 * THE DESK shows each confirmed match's hold claims (owner and end), so
 * "no hold in force" can be read against what each desk asked for.
 */

alter table public.sanctions_list_versions
  add column if not exists complete boolean not null default true;

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

/* ------------------------------------------------ renew keeps who decided */

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

/* ------------------------------------------------- decided_at is frozen */

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
  /* decided_at is the first decision's time and never moves; a release is
     dated on its own decision row. */
  update public.sanctions_hits set status = v_new, decided_at = coalesce(decided_at, now()) where id = v_hit.id;

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
  /* A decision's time is set once; a release is dated on its own decision row. */
  if old.decided_at is not null and new.decided_at is distinct from old.decided_at then
    raise exception 'SCUML item 8: a match is not edited (decided_at is set once)' using errcode = 'P0001';
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
       where private.sanctions_list_waiting(v)
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
               'claims', coalesce((select jsonb_agg(jsonb_build_object('owner', c.owner, 'until', c.until) order by c.owner)
                                     from private.hold_claims c where c.user_id = h.person_id), '[]'::jsonb),
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

do $$
begin
  if has_function_privilege('authenticated', 'public.sanctions_lists_waiting()', 'EXECUTE') then
    raise exception 'SCUML item 9: the waiting count is callable by a member';
  end if;
end
$$;
