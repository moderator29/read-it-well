/*
 * SCUML: THE AUDIT'S FIXES, ONE FILE.
 *
 * The independent audit of the SCUML layer (20260929001007 to 011534) failed
 * it on the points below. Each is fixed here and each is exercised by the
 * rolled-back probe at the end.
 *
 *  1 HIGH  tipping-off. A member reads their own account_money_holds row only
 *          when its reason is not 'plain' (a compliance desk's hold). Staff
 *          read every row as before. The app shows only the address-move hold.
 *  2 HIGH  decide_listing_mandate answers 'own_listing' to a staff member who
 *          is the listing's agent or assigned agent.
 *  3 HIGH  nobody decides their own case: flag_pep, approve_pep_clear,
 *          decide_edd_review, approve_edd_decision, override_risk_class and
 *          approve_risk_override refuse (RM175) when the subject is the
 *          caller; the same test is a BEFORE INSERT trigger on the six tables
 *          they write; pep_desk and risk_desk leave out the caller's own rows.
 *  4 MED   decide_threshold_event and approve_threshold_decision answer
 *          'conflicted' to the event's party or counterparty; the lane hides
 *          the caller's own events.
 *  5 MED   sanctions lists: the service role may insert only the loading
 *          columns and update only entry_count, previous_entries and complete.
 *          A URL file activates itself only through the definer function
 *          sanctions_list_autoactivate, which refuses an upload, an empty,
 *          incomplete, superseded or short file. A BEFORE UPDATE trigger keeps
 *          source, sha256, origin, loaded_by and loaded_at fixed, lets
 *          activation_proposed_by, activated_at and activated_by be set once,
 *          and freezes an activated version's counts.
 *  6 MED   search_path '' on listing_supply_proof_gate, aml_lock_party and
 *          every function of 20260929003449 and 20260929011120.
 *  7 MED   retention: the ON DELETE SET NULL foreign keys to auth.users on the
 *          PEP, EDD and risk tables are dropped (their uuids stay when an
 *          account is deleted), and aml_append_only no longer lets a column be
 *          nulled.
 *  8 MED   edd_clear_for is false for an unclassified PEP, or an unclassified
 *          person with an open or confirmed sanctions match, until a cleared
 *          item 15 review is approved.
 *  9 LOW   a listing with a rejected mandate under five years old is never
 *          deleted.
 * 10 LOW   lock_timeout 200ms on the four aml_observe_* functions.
 * 11 LOW   sanctions_desk leaves out matches on the caller.
 * 12 LOW   private.str_nudges is append-only.
 */

set local lock_timeout = '5s';

/* ================================================= 1. tipping-off (RLS) */

drop policy if exists account_money_holds_read on public.account_money_holds;
create policy account_money_holds_read on public.account_money_holds
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and reason <> 'plain')
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

/* ============================================ 2. own listing, own mandate */

create or replace function public.decide_listing_mandate(p_mandate uuid, p_decision text, p_relationship text, p_verified_how text, p_id_document_kind text, p_id_document_ref text, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.listing_mandates%rowtype;
  old_id uuid;
  l record;
  me uuid := (select auth.uid());
  restored boolean := false;
begin
  if not private.staff_can((select auth.uid()), 'listing_approval') then
    raise exception 'only staff decide a mandate' using errcode = 'insufficient_privilege';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'approve or reject' using errcode = 'check_violation';
  end if;

  select * into m from public.listing_mandates where id = p_mandate for update;
  if m.id is null then
    return jsonb_build_object('state', 'gone');
  end if;
  /* SCUML item 19: nobody decides the mandate on a listing they let. */
  if exists (select 1 from public.listings x
               join public.agents a on a.id = x.agent_id or a.id = x.assigned_agent_id
              where x.id = m.listing_id and a.user_id = me) then
    return jsonb_build_object('state', 'own_listing');
  end if;
  if m.review_status <> 'pending' then
    return jsonb_build_object('state', 'already', 'review_status', m.review_status);
  end if;

  if p_decision = 'approve' then
    if m.expires_on is not null and m.expires_on < (now() at time zone 'Africa/Lagos')::date then
      return jsonb_build_object('state', 'ended');
    end if;
    if coalesce(p_relationship, m.principal_relationship) is null or p_verified_how is null then
      raise exception 'SCUML item 17: say how the principal stands to the property and how you confirmed them'
        using errcode = 'check_violation';
    end if;

    -- The same lock a STOP takes, on both numbers involved.
    perform private.principal_number_lock(m.principal_phone);
    perform private.principal_number_lock(p.principal_phone)
       from public.listing_mandates p
      where p.listing_id = m.listing_id and p.review_status = 'approved' and p.superseded_at is null
        and p.principal_phone is distinct from m.principal_phone;

    perform set_config('vallo.mandate_write', 'on', true);
    select id into old_id from public.listing_mandates
     where listing_id = m.listing_id and review_status = 'approved' and superseded_at is null
     for update;
    if old_id is not null then
      update public.listing_mandates
         set superseded_at = now(), superseded_by = m.id
       where id = old_id;
    end if;
    update public.listing_mandates
       set review_status = 'approved',
           reviewed_by = me,
           reviewed_at = now(),
           principal_relationship = coalesce(p_relationship, m.principal_relationship),
           principal_verified_how = p_verified_how,
           principal_verified_by = me,
           principal_verified_at = now(),
           principal_id_document_kind = nullif(btrim(coalesce(p_id_document_kind, '')), ''),
           principal_id_document_ref = nullif(btrim(coalesce(p_id_document_ref, '')), '')
     where id = m.id;
    perform set_config('vallo.mandate_write', '', true);

    -- listings_supply_proof_has_a_decider_chk: the date carries who decided it.
    update public.listings set mandate_verified_at = now(), supply_verified_by = me where id = m.listing_id;

    -- Back live ONLY while the listing is held for this and nothing else.
    select id, status, needs_mandate_since, closed_at, review_notes into l
      from public.listings where id = m.listing_id;
    if l.needs_mandate_since is not null and l.closed_at is null
       and l.status = 'MORE_INFO_REQUIRED'
       and l.review_notes is not distinct from private.mandate_needed_note()
       and private.listing_has_live_mandate(l.id) then
      update public.listings set status = 'PUBLISHED', review_notes = null where id = l.id;
      restored := true;
    end if;
  else
    if p_reason is null or length(btrim(p_reason)) < 8 then
      raise exception 'write the reason the lister will read' using errcode = 'check_violation';
    end if;
    perform set_config('vallo.mandate_write', 'on', true);
    update public.listing_mandates
       set review_status = 'rejected',
           reviewed_by = me,
           reviewed_at = now(),
           rejection_reason = btrim(p_reason)
     where id = m.id;
    perform set_config('vallo.mandate_write', '', true);
    update public.listings
       set mandate_verified_at = null,
           supply_verified_by = case when ownership_verified_at is null then null else supply_verified_by end
     where id = m.listing_id and not private.listing_has_live_mandate(m.listing_id);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'mandate.decide', 'listing', m.listing_id::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'decision', p_decision,
                             'verified_how', p_verified_how, 'supersedes', old_id, 'restored', restored,
                             'id_document_kind', nullif(btrim(coalesce(p_id_document_kind, '')), '')));

  return jsonb_build_object('state', case when p_decision = 'approve' then 'approved' else 'rejected' end,
                            'superseded', old_id, 'restored', restored);
end;
$function$;

/* ================================================= 3. nobody decides their own case */

create or replace function private.aml_not_own_case()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_subject uuid;
  v_actor uuid;
begin
  if tg_table_name in ('pep_flags', 'risk_classes') then
    v_subject := new.user_id;
    v_actor := new.set_by;
  elsif tg_table_name = 'edd_decisions' then
    select r.user_id into v_subject from public.edd_reviews r where r.id = new.review_id;
    v_actor := new.decided_by;
  elsif tg_table_name = 'edd_approvals' then
    select r.user_id into v_subject
      from public.edd_decisions d join public.edd_reviews r on r.id = d.review_id
     where d.id = new.decision_id;
    v_actor := new.approved_by;
  elsif tg_table_name = 'pep_clear_approvals' then
    select f.user_id into v_subject from public.pep_flags f where f.id = new.flag_id;
    v_actor := new.approved_by;
  elsif tg_table_name = 'risk_override_approvals' then
    select r.user_id into v_subject from public.risk_classes r where r.id = new.risk_class_id;
    v_actor := new.approved_by;
  end if;
  if v_actor is not null and v_actor = v_subject then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$function$;
revoke all on function private.aml_not_own_case() from public, anon, authenticated;

do $own$
declare t text;
begin
  foreach t in array array['pep_flags', 'risk_classes', 'edd_decisions', 'edd_approvals',
                           'pep_clear_approvals', 'risk_override_approvals'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_not_own_case', t);
    execute format('create trigger %I before insert on public.%I for each row execute function private.aml_not_own_case()',
                   t || '_not_own_case', t);
  end loop;
end;
$own$;

create or replace function public.flag_pep(p_user uuid, p_flagged boolean, p_relation text, p_role text, p_note text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  if p_user = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
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
$function$;

create or replace function public.approve_pep_clear(p_flag uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if (select f.user_id from public.pep_flags f where f.id = p_flag) = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
  end if;
  if exists (select 1 from public.pep_clear_approvals c where c.flag_id = p_flag) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.pep_clear_approvals (flag_id, approved_by)
  values (p_flag, me)
  returning id into row_id;
  return row_id;
end;
$function$;

create or replace function public.decide_edd_review(p_review uuid, p_source_of_funds text, p_outcome text, p_note text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  if (select r.user_id from public.edd_reviews r where r.id = p_review) = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
  end if;
  if private.edd_review_settled(p_review) then
    raise exception 'This review is already decided and approved.' using errcode = 'RM175';
  end if;
  insert into public.edd_decisions (review_id, source_of_funds, outcome, note, decided_by)
  values (p_review, btrim(coalesce(p_source_of_funds, '')), p_outcome, nullif(btrim(p_note), ''), me)
  returning id into row_id;
  return row_id;
end;
$function$;

create or replace function public.approve_edd_decision(p_decision uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  if (select r.user_id from public.edd_reviews r where r.id = review) = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
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
$function$;

create or replace function public.override_risk_class(p_user uuid, p_class text, p_reason text, p_review_due_at timestamp with time zone)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  if p_user = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
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
$function$;

create or replace function public.approve_risk_override(p_row uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if (select r.user_id from public.risk_classes r where r.id = p_row) = me then
    raise exception 'Nobody decides their own case. Another member of staff must do this (SCUML item 19).' using errcode = 'RM175';
  end if;
  if exists (select 1 from public.risk_override_approvals a where a.risk_class_id = p_row) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.risk_override_approvals (risk_class_id, approved_by)
  values (p_row, me)
  returning id into row_id;
  return row_id;
end;
$function$;

create or replace function public.pep_desk()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
begin
  if not private.aml_staff(v_me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  /* The caller's own reviews, flags and proposals are never on their desk. */
  return jsonb_build_object(
    'open', coalesce((
      select jsonb_agg(private.edd_review_json(r) order by r.raised_at)
        from public.edd_reviews r
       where r.scuml_item = 20 and not private.edd_review_settled(r.id)
         and r.user_id is distinct from v_me
    ), '[]'::jsonb),
    'settled', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select private.edd_review_json(r) as j, r.raised_at as ts
          from public.edd_reviews r
         where r.scuml_item = 20 and private.edd_review_settled(r.id)
           and r.user_id is distinct from v_me
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
             where private.is_pep(u.user_id) and u.user_id is distinct from v_me
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
         and f.user_id is distinct from v_me
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
$function$;

create or replace function public.risk_desk()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
begin
  if not private.aml_staff(v_me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  /* The caller's own class, reviews and proposals are never on their desk. */
  return (
    with cur as (
      select distinct on (r.user_id) r.*
        from public.risk_classes r
       where r.user_id is not null
         and r.user_id is distinct from v_me
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
           and v.user_id is distinct from v_me
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
           and r.user_id is distinct from v_me
           and not exists (select 1 from public.risk_override_approvals a where a.risk_class_id = r.id)
      ), '[]'::jsonb)
    )
  );
end;
$function$;

/* ================================================= 4. threshold conflicts */

create or replace function public.decide_threshold_event(
  p_event uuid, p_decision text, p_reference text default null, p_reported_on date default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ev public.threshold_events%rowtype;
  v_me uuid := (select auth.uid());
begin
  if not private.aml_is_staff() then
    return jsonb_build_object('status', 'not_staff');
  end if;
  select * into ev from public.threshold_events where id = p_event for update;
  if ev.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  /* SCUML item 19: nobody decides a report about their own money. */
  if v_me = ev.party_id or v_me = ev.counterparty_id then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if private.threshold_event_state(ev.id) <> 'open' then
    return jsonb_build_object('status', 'not_open');
  end if;
  if p_decision not in ('reported', 'not_reportable') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'reported' and (nullif(btrim(coalesce(p_reference, '')), '') is null or p_reported_on is null) then
    return jsonb_build_object('status', 'needs_reference');
  end if;
  if p_decision = 'reported' and (p_reported_on > (now() at time zone 'Africa/Lagos')::date
                                  or p_reported_on < (ev.occurred_at at time zone 'Africa/Lagos')::date) then
    return jsonb_build_object('status', 'bad_date');
  end if;
  if p_decision = 'not_reportable' and nullif(btrim(coalesce(p_note, '')), '') is null then
    return jsonb_build_object('status', 'needs_reason');
  end if;
  insert into public.threshold_decisions (event_id, decision, external_reference, reported_on, note, decided_by)
  values (ev.id, p_decision, nullif(btrim(coalesce(p_reference, '')), ''),
          case when p_decision = 'reported' then p_reported_on end,
          nullif(btrim(coalesce(p_note, '')), ''), v_me);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'threshold.decided', 'threshold_event', ev.id::text,
          jsonb_build_object('scuml_item', 7, 'decision', p_decision));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.decide_threshold_event(uuid, text, text, date, text) from public, anon;
grant execute on function public.decide_threshold_event(uuid, text, text, date, text) to authenticated;

create or replace function public.approve_threshold_decision(p_decision uuid, p_verdict text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  d public.threshold_decisions%rowtype;
  ev public.threshold_events%rowtype;
  v_me uuid := (select auth.uid());
begin
  if not private.aml_is_staff() then
    return jsonb_build_object('status', 'not_staff');
  end if;
  select * into d from public.threshold_decisions where id = p_decision for update;
  if d.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into ev from public.threshold_events where id = d.event_id;
  if v_me = ev.party_id or v_me = ev.counterparty_id then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if d.decided_by = v_me then
    return jsonb_build_object('status', 'same_person');
  end if;
  if p_verdict not in ('approved', 'rejected') then
    return jsonb_build_object('status', 'bad_verdict');
  end if;
  if exists (select 1 from public.threshold_decisions x
              where x.event_id = d.event_id and x.decided_at > d.decided_at) then
    return jsonb_build_object('status', 'superseded');
  end if;
  if p_verdict = 'rejected' and nullif(btrim(coalesce(p_note, '')), '') is null then
    return jsonb_build_object('status', 'needs_reason');
  end if;
  insert into public.threshold_approvals (decision_id, verdict, note, approved_by)
  values (d.id, p_verdict, nullif(btrim(coalesce(p_note, '')), ''), v_me)
  on conflict (decision_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_approved');
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'threshold.' || p_verdict, 'threshold_event', d.event_id::text,
          jsonb_build_object('scuml_item', 7, 'decision_id', d.id));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.approve_threshold_decision(uuid, text, text) from public, anon;
grant execute on function public.approve_threshold_decision(uuid, text, text) to authenticated;

create or replace function public.threshold_lane(p_open int default 300, p_closed int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  open_cap   int := greatest(1, least(coalesce(p_open, 300), 1000));
  closed_cap int := greatest(0, least(coalesce(p_closed, 100), 1000));
  open_count int;
  closed_count int;
  rows jsonb;
  v_me uuid := (select auth.uid());
begin
  if not private.aml_is_staff() then
    return null;
  end if;
  /* The caller's own events (as party or counterparty) are never on their lane. */
  with base as (
    select e.*, private.threshold_event_state(e.id) as state from public.threshold_events e
     where e.party_id is distinct from v_me and e.counterparty_id is distinct from v_me
  ), paged as (
    (select * from base where state <> 'closed' order by due_at limit open_cap)
    union all
    (select * from base where state = 'closed' order by due_at desc limit closed_cap)
  )
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by (x.state = 'closed'), x.due_at), '[]'::jsonb)
    into rows
    from (
      select p.id, p.kind, p.source, p.source_id, p.direction, p.amount_minor, p.threshold_minor,
             p.party_id, p.party_class,
             nullif(btrim(coalesce(pp.first_name, '') || ' ' || coalesce(pp.surname, '')), '') as party_name,
             p.counterparty_id, p.counterparty_class,
             nullif(btrim(coalesce(cp.first_name, '') || ' ' || coalesce(cp.surname, '')), '') as counterparty_name,
             cardinality(p.observation_ids) as movements,
             p.occurred_at, p.due_at, p.raised_at, p.state,
             d.id as decision_id, d.decision, d.external_reference, d.reported_on, d.note as decision_note,
             d.decided_by, d.decided_at,
             a.verdict, a.approved_by, a.approved_at
        from paged p
        left join public.profiles pp on pp.id = p.party_id
        left join public.profiles cp on cp.id = p.counterparty_id
        left join lateral (select x.* from public.threshold_decisions x
                            where x.event_id = p.id order by x.decided_at desc limit 1) d on true
        left join public.threshold_approvals a on a.decision_id = d.id
    ) x;
  select count(*) filter (where private.threshold_event_state(e.id) <> 'closed'),
         count(*) filter (where private.threshold_event_state(e.id) = 'closed')
    into open_count, closed_count
    from public.threshold_events e
   where e.party_id is distinct from v_me and e.counterparty_id is distinct from v_me;
  return jsonb_build_object(
    'rows', rows,
    'truncated', open_count > open_cap or closed_count > closed_cap,
    'monitor_faults', (select count(*) from public.risk_alerts r
                        where r.entity_type = 'aml_threshold' and r.status::text = 'open'));
end;
$function$;
revoke all on function public.threshold_lane(int, int) from public, anon;
grant execute on function public.threshold_lane(int, int) to authenticated;

/* ================================================= 5. sanctions lists need two */

revoke insert, update on table public.sanctions_list_versions from service_role;
grant insert (source, sha256, origin, loaded_by) on table public.sanctions_list_versions to service_role;
grant update (entry_count, previous_entries, complete) on table public.sanctions_list_versions to service_role;

create or replace function private.sanctions_list_version_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.id <> old.id or new.source <> old.source or new.sha256 <> old.sha256
     or new.origin is distinct from old.origin or new.loaded_by is distinct from old.loaded_by
     or new.loaded_at is distinct from old.loaded_at then
    raise exception 'SCUML item 8: a list version''s source, file, origin and loader are fixed' using errcode = 'P0001';
  end if;
  if (old.activation_proposed_by is not null and new.activation_proposed_by is distinct from old.activation_proposed_by)
     or (old.activated_at is not null and new.activated_at is distinct from old.activated_at)
     or (old.activated_by is not null and new.activated_by is distinct from old.activated_by) then
    raise exception 'SCUML item 8: who proposed and when a list was activated are set once' using errcode = 'P0001';
  end if;
  if old.activated_at is not null
     and (new.entry_count, new.previous_entries, new.complete) is distinct from (old.entry_count, old.previous_entries, old.complete) then
    raise exception 'SCUML item 8: an activated list version is not edited' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;
revoke all on function private.sanctions_list_version_guard() from public, anon, authenticated;

drop trigger if exists sanctions_list_versions_guard on public.sanctions_list_versions;
create trigger sanctions_list_versions_guard
  before update on public.sanctions_list_versions
  for each row execute function private.sanctions_list_version_guard();

/* The only way a list activates without a second person: a whole URL file,
   not superseded, with at least 90% of the entries in force. */
create or replace function public.sanctions_list_autoactivate(p_version uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v public.sanctions_list_versions%rowtype;
  v_in_force integer;
begin
  select * into v from public.sanctions_list_versions where id = p_version for update;
  if not found or v.activated_at is not null then return jsonb_build_object('status', 'not_waiting'); end if;
  if v.origin <> 'url' then return jsonb_build_object('status', 'upload'); end if;
  if v.entry_count < 1 then return jsonb_build_object('status', 'empty'); end if;
  if not v.complete then return jsonb_build_object('status', 'incomplete'); end if;
  if exists (select 1 from public.sanctions_list_versions o
              where o.source = v.source and o.activated_at is not null and o.loaded_at > v.loaded_at) then
    return jsonb_build_object('status', 'superseded');
  end if;
  select o.entry_count into v_in_force from public.sanctions_list_versions o
   where o.source = v.source and o.activated_at is not null
   order by o.activated_at desc limit 1;
  if v_in_force is not null and v.entry_count < 0.9 * v_in_force then
    return jsonb_build_object('status', 'short');
  end if;
  update public.sanctions_list_versions
     set activated_at = now(), previous_entries = v_in_force
   where id = p_version;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'compliance.sanctions.list_activated', 'sanctions_list_version', p_version::text,
          jsonb_build_object('source', v.source, 'entries', v.entry_count, 'in_force', v_in_force,
                             'origin', 'url', 'scuml_item', 9));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.sanctions_list_autoactivate(uuid) from public, anon, authenticated;
grant execute on function public.sanctions_list_autoactivate(uuid) to service_role;

/* ================================================= 11. the desk leaves out the caller */

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
         and h.person_id is distinct from v_me
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'subject', r.subject_kind, 'trigger', r.trigger,
                                          'outcome', r.outcome, 'at', r.screened_at) order by r.screened_at desc)
        from (select * from public.sanctions_screenings
               where person_id is distinct from v_me
               order by screened_at desc limit 30) r
    ), '[]'::jsonb),
    'waiting', (select count(*) from public.sanctions_screen_queue where done_at is null)
  );
end;
$$;
revoke all on function public.sanctions_desk() from public, anon;
grant execute on function public.sanctions_desk() to authenticated;

/* ================================================= 6 and 10. search_path, lock_timeout */

alter function private.listing_supply_proof_gate() set search_path = '';
alter function private.aml_lock_party(uuid) set search_path = '';
alter function private.aml_monitor_failed(text, uuid, text) set search_path = '';
alter function private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text, text, text) set search_path = '';
alter function private.aml_observe_charge(uuid) set search_path = '';
alter function private.aml_observe_refund(uuid) set search_path = '';
alter function private.aml_observe_rent_refund(uuid) set search_path = '';
alter function private.aml_observe_guarantee_payout(uuid) set search_path = '';
alter function private.aml_record_is_kept() set search_path = '';
alter function private.aml_watch_transactions() set search_path = '';
alter function private.aml_watch_payouts() set search_path = '';
alter function private.threshold_reminders_due() set search_path = '';

alter function private.aml_observe_charge(uuid) set lock_timeout = '200ms';
alter function private.aml_observe_refund(uuid) set lock_timeout = '200ms';
alter function private.aml_observe_rent_refund(uuid) set lock_timeout = '200ms';
alter function private.aml_observe_guarantee_payout(uuid) set lock_timeout = '200ms';

/* ================================================= 7. retention */

do $fks$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
     where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'n'
       and c.conrelid in ('public.pep_declarations'::regclass, 'public.pep_flags'::regclass,
                          'public.edd_reviews'::regclass, 'public.edd_decisions'::regclass,
                          'public.edd_approvals'::regclass, 'public.pep_clear_approvals'::regclass,
                          'public.risk_classes'::regclass, 'public.risk_override_approvals'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$fks$;

create or replace function private.aml_append_only()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'This is a compliance record (SCUML). It is kept for five years and is never deleted.'
      using errcode = 'RM175';
  end if;
  /* No column is exempt: a deleted account keeps its uuid here (no foreign
     key nulls it), so nothing is ever rewritten. */
  if to_jsonb(old) is distinct from to_jsonb(new) then
    raise exception 'This is a compliance record (SCUML). It is never edited; record a new row instead.'
      using errcode = 'RM175';
  end if;
  return new;
end;
$function$;

/* ================================================= 8. EDD for the unclassified */

create or replace function private.edd_clear_for(p_user uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  cur public.risk_classes;
  since timestamptz;
begin
  if p_user is null then
    return true;
  end if;
  cur := private.risk_latest(p_user);
  /* Not yet classified: clear, unless they are a PEP or carry an open or
     confirmed sanctions match. Then only an approved, cleared item 15 review
     opens the gate. */
  if cur.id is null then
    if private.is_pep(p_user)
       or exists (select 1 from public.sanctions_hits h
                   where h.person_id = p_user and h.status in ('open', 'confirmed')) then
      return exists (
        select 1
          from public.edd_reviews v
          join public.edd_decisions d on d.review_id = v.id
          join public.edd_approvals a on a.decision_id = d.id
         where v.user_id = p_user and v.scuml_item = 15 and d.outcome = 'cleared'
      );
    end if;
    return true;
  end if;
  if cur.risk_class <> 'high' then
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
$function$;

/* ================================================= 9. a rejected mandate is kept too */

create or replace function private.listings_keep_their_mandates()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not exists (select 1 from public.listing_mandates m where m.listing_id = old.id) then
    return old;
  end if;
  /* A refused mandate is a record of a refusal: five years, whatever else. */
  if exists (select 1 from public.listing_mandates m
              where m.listing_id = old.id and m.review_status = 'rejected'
                and coalesce(m.reviewed_at, m.created_at) > now() - interval '5 years') then
    raise exception 'SCUML item 17: this listing holds a refused mandate, kept for five years. Take it down or close it instead of deleting it'
      using errcode = 'insufficient_privilege';
  end if;
  if not private.listing_never_acted_on(old.id)
     and exists (select 1 from public.listing_mandates m
                  where m.listing_id = old.id and now() < private.mandate_retained_until(m.id)) then
    raise exception 'SCUML item 17: this listing holds a mandate record, kept for five years after the listing closes. Take it down or close it instead of deleting it'
      using errcode = 'insufficient_privilege';
  end if;
  -- The cascade that follows is this delete's, and has been judged here.
  perform set_config('vallo.mandate_listing_delete', old.id::text, true);
  return old;
end;
$function$;

/* ================================================= 12. str_nudges append-only */

drop trigger if exists str_nudges_append_only on private.str_nudges;
create trigger str_nudges_append_only
  before update or delete on private.str_nudges
  for each row execute function private.str_refuse_change();

/* ================================================================ read-back */

do $readback$
declare
  bad text := '';
  f text;
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.account_money_holds'::regclass
                  and polname = 'account_money_holds_read'
                  and pg_get_expr(polqual, polrelid) like '%<> ''plain''%') then
    bad := bad || ' [the owner policy still shows a plain hold]';
  end if;
  if (select count(*) from pg_trigger where tgname like '%\_not\_own\_case') <> 6 then
    bad := bad || ' [not all six own-case triggers are in place]';
  end if;
  if has_table_privilege('service_role', 'public.sanctions_list_versions', 'UPDATE')
     or has_column_privilege('service_role', 'public.sanctions_list_versions', 'activated_at', 'UPDATE')
     or has_column_privilege('service_role', 'public.sanctions_list_versions', 'activated_at', 'INSERT')
     or has_column_privilege('service_role', 'public.sanctions_list_versions', 'activation_proposed_by', 'UPDATE') then
    bad := bad || ' [the service role can still activate a list]';
  end if;
  if has_function_privilege('authenticated', 'public.sanctions_list_autoactivate(uuid)', 'EXECUTE') then
    bad := bad || ' [a member can call the self-activation]';
  end if;
  foreach f in array array['private.listing_supply_proof_gate()', 'private.aml_lock_party(uuid)',
                           'private.aml_monitor_failed(text,uuid,text)', 'private.aml_observe_charge(uuid)',
                           'private.aml_observe_refund(uuid)', 'private.aml_observe_rent_refund(uuid)',
                           'private.aml_observe_guarantee_payout(uuid)', 'private.aml_record_is_kept()',
                           'private.aml_watch_transactions()', 'private.aml_watch_payouts()',
                           'private.threshold_reminders_due()', 'public.threshold_lane(integer,integer)',
                           'public.decide_threshold_event(uuid,text,text,date,text)',
                           'public.approve_threshold_decision(uuid,text,text)',
                           'private.aml_observe(text,uuid,uuid,text,uuid,bigint,timestamp with time zone,text,text,text)'] loop
    if not ('search_path=""' = any (coalesce((select proconfig from pg_proc where oid = f::regprocedure), '{}'::text[])))
       then bad := bad || format(' [%s has a search_path]', f);
    end if;
  end loop;
  if exists (select 1 from pg_constraint c
              where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'n'
                and c.conrelid in ('public.pep_declarations'::regclass, 'public.pep_flags'::regclass,
                                   'public.edd_reviews'::regclass, 'public.edd_decisions'::regclass,
                                   'public.edd_approvals'::regclass, 'public.pep_clear_approvals'::regclass,
                                   'public.risk_classes'::regclass, 'public.risk_override_approvals'::regclass)) then
    bad := bad || ' [a compliance row can still be nulled by deleting an account]';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'str_nudges_append_only') then
    bad := bad || ' [str_nudges is not append-only]';
  end if;
  if bad <> '' then raise exception 'SCUML AUDIT FIXES READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* ==================================================================== probe */

do $probe$
declare
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_moved uuid := gen_random_uuid();
  v_gone uuid := gen_random_uuid();
  v_pep uuid := gen_random_uuid();
  v_agent uuid;
  v_listing uuid;
  v_listing2 uuid;
  v_booking uuid;
  v_tx uuid;
  v_mandate uuid;
  v_review uuid;
  v_dec uuid;
  v_flag uuid;
  v_row uuid;
  v_event uuid;
  v_up uuid;
  v_url uuid;
  v_entry uuid;
  v_screen uuid;
  v_ans jsonb;
  v_n int;
  v_ok boolean;
  v_err text;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scumlaudit-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_s1, 's1'), (v_s2, 's2'), (v_member, 'member'), (v_moved, 'moved'), (v_gone, 'gone'), (v_pep, 'pep')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin');

    -- 1. A member reads the address-move hold, never a compliance ('plain') hold.
    perform private.hold_claim_set(v_member, 'str', now() + interval '30 days', v_s1);
    insert into public.account_money_holds (user_id, hold_until, reason)
    values (v_moved, now() + interval '7 days', 'email address moved by support (request probe)');
    perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n from public.account_money_holds;
    perform set_config('role', 'none', true);
    if v_n <> 0 then raise exception 'PROBE FAILED: a member read their compliance hold'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_moved, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n from public.account_money_holds;
    perform set_config('role', 'none', true);
    if v_n <> 1 then raise exception 'PROBE FAILED: a member cannot read their address-move hold'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n from public.account_money_holds where user_id in (v_member, v_moved);
    perform set_config('role', 'none', true);
    if v_n <> 2 then raise exception 'PROBE FAILED: staff cannot read every hold'; end if;

    -- 2. A staff member who lets the listing cannot decide its mandate.
    insert into public.agents (user_id, display_name, role) values (v_s1, 'Probe Staff Agent', 'agent') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo)
    values (v_agent, 'SCUML audit probe flat', 'apartment', 'agent', 'DRAFT', false) returning id into v_listing;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.file_listing_mandate(v_listing, 'letting', 'Adaeze Okafor', '+2348031234567', 'owner', true, current_date, null);
    v_mandate := (v_ans->>'mandate_id')::uuid;
    if v_mandate is null then raise exception 'PROBE FAILED: file answered %', v_ans; end if;
    v_ans := public.decide_listing_mandate(v_mandate, 'approve', 'owner', 'call_back', null, null, null);
    if v_ans->>'state' <> 'own_listing' then raise exception 'PROBE FAILED: staff decided their own listing''s mandate: %', v_ans; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.decide_listing_mandate(v_mandate, 'reject', null, null, null, null, 'The principal did not answer our call.');
    if v_ans->>'state' <> 'rejected' then raise exception 'PROBE FAILED: a second person could not decide: %', v_ans; end if;

    -- 9. A listing with a refused mandate is not deleted.
    begin
      delete from public.listings where id = v_listing;
      raise exception 'PROBE FAILED: a listing with a refused mandate was deleted';
    exception when insufficient_privilege then
      if sqlerrm not like 'SCUML item 17: this listing holds a refused mandate%' then raise; end if;
    end;

    -- 3. Nobody decides their own case.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    begin
      perform public.flag_pep(v_s1, true, 'self', 'Commissioner', 'probe');
      raise exception 'PROBE FAILED: staff flagged themselves';
    exception when sqlstate 'RM175' then null;
    end;
    begin
      perform public.override_risk_class(v_s1, 'low', 'probe', now() + interval '30 days');
      raise exception 'PROBE FAILED: staff classed themselves';
    exception when sqlstate 'RM175' then null;
    end;
    begin
      insert into public.pep_flags (user_id, flagged, relation, role, note, set_by)
      values (v_s1, false, null, null, 'probe', v_s1);
      raise exception 'PROBE FAILED: the table let staff write their own flag';
    exception when sqlstate 'RM175' then null;
    end;
    -- A review on s1, raised by the system; s2 flags s1 and proposes a clear.
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (v_s1, 20, 'staff_flag', 'pep_flags', gen_random_uuid()) returning id into v_review;
    begin
      perform public.decide_edd_review(v_review, 'Salary from employer.', 'cleared', null);
      raise exception 'PROBE FAILED: staff decided their own review';
    exception when sqlstate 'RM175' then null;
    end;
    if exists (select 1 from jsonb_array_elements(public.pep_desk()->'open') r where (r->>'id')::uuid = v_review) then
      raise exception 'PROBE FAILED: staff see their own review on the PEP desk';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    if not exists (select 1 from jsonb_array_elements(public.pep_desk()->'open') r where (r->>'id')::uuid = v_review) then
      raise exception 'PROBE FAILED: another staff member does not see the review';
    end if;
    v_dec := public.decide_edd_review(v_review, 'Salary from employer.', 'cleared', null);
    v_flag := public.flag_pep(v_s1, false, null, null, 'Not a PEP after all.');
    insert into public.risk_classes (user_id, risk_class, factors, reasons, source, reason, set_by, review_due_at, needs_approval)
    values (v_s1, 'high', '{}'::jsonb, '{probe}', 'derived', null, null, now() + interval '30 days', false);
    v_row := public.override_risk_class(v_s1, 'low', 'Reviewed by hand.', now() + interval '60 days');
    if exists (select 1 from jsonb_array_elements(public.risk_desk()->'pending') r where (r->>'user_id')::uuid = v_s2) then
      raise exception 'PROBE FAILED: the risk desk shows the caller';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    begin
      perform public.approve_edd_decision(v_dec);
      raise exception 'PROBE FAILED: staff approved a decision on their own review';
    exception when sqlstate 'RM175' then null;
    end;
    begin
      perform public.approve_pep_clear(v_flag);
      raise exception 'PROBE FAILED: staff approved their own PEP clear';
    exception when sqlstate 'RM175' then null;
    end;
    begin
      perform public.approve_risk_override(v_row);
      raise exception 'PROBE FAILED: staff approved their own lowered class';
    exception when sqlstate 'RM175' then null;
    end;
    if exists (select 1 from jsonb_array_elements(public.risk_desk()->'pending') r where (r->>'user_id')::uuid = v_s1)
       or exists (select 1 from jsonb_array_elements(public.risk_desk()->'people') r where (r->>'user_id')::uuid = v_s1)
       or exists (select 1 from jsonb_array_elements(public.pep_desk()->'pending_clears') r where (r->>'user_id')::uuid = v_s1) then
      raise exception 'PROBE FAILED: staff see their own case on a desk';
    end if;

    -- 4. Threshold: the party is conflicted and does not see the event.
    insert into public.threshold_events (kind, source, source_id, party_id, party_class, counterparty_id, observation_ids,
                                         amount_minor, threshold_minor, occurred_at, due_at, direction)
    values ('single', 'booking', gen_random_uuid(), v_s1, 'individual', v_member, '{}', 600000000, 500000000, now(), now() + interval '7 days', 'out')
    returning id into v_event;
    if public.decide_threshold_event(v_event, 'reported', 'GOAML-PROBE', v_today, null)->>'status' <> 'conflicted' then
      raise exception 'PROBE FAILED: the party decided their own threshold event';
    end if;
    if exists (select 1 from jsonb_array_elements(public.threshold_lane(300, 100)->'rows') r where (r->>'id')::uuid = v_event) then
      raise exception 'PROBE FAILED: the lane shows the caller their own event';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    if public.decide_threshold_event(v_event, 'reported', 'GOAML-PROBE', v_today, null)->>'status' <> 'ok' then
      raise exception 'PROBE FAILED: a second person could not decide the event';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    if public.approve_threshold_decision((select id from public.threshold_decisions where event_id = v_event), 'approved', null)->>'status' <> 'conflicted' then
      raise exception 'PROBE FAILED: the party approved a decision on their own event';
    end if;

    -- 5. Sanctions lists: the service role cannot activate; the database activates only a whole URL file.
    perform set_config('request.jwt.claims', '', true);
    perform set_config('role', 'service_role', true);
    insert into public.sanctions_list_versions (source, sha256, origin, loaded_by)
    values ('ng', encode(sha256(convert_to('scumlaudit-up-' || gen_random_uuid(), 'UTF8')), 'hex'), 'upload', v_s1)
    returning id into v_up;
    insert into public.sanctions_entries (version_id, source, reference, kind, primary_name, names_normalised)
    values (v_up, 'ng', 'AUD.1', 'individual', 'PROBE PERSON', array['person probe']);
    update public.sanctions_list_versions set entry_count = 1, complete = true where id = v_up;
    begin
      update public.sanctions_list_versions set activated_at = now() where id = v_up;
      raise exception 'PROBE FAILED: the service role activated a list';
    exception when insufficient_privilege then null;
    end;
    begin
      update public.sanctions_list_versions set loaded_by = null where id = v_up;
      raise exception 'PROBE FAILED: the service role rewrote the loader';
    exception when insufficient_privilege then null;
    end;
    if public.sanctions_list_autoactivate(v_up)->>'status' <> 'upload' then
      raise exception 'PROBE FAILED: an upload activated itself';
    end if;
    insert into public.sanctions_list_versions (source, sha256, origin)
    values ('ng', encode(sha256(convert_to('scumlaudit-url-' || gen_random_uuid(), 'UTF8')), 'hex'), 'url')
    returning id into v_url;
    insert into public.sanctions_entries (version_id, source, reference, kind, primary_name, names_normalised)
    values (v_url, 'ng', 'AUD.1', 'individual', 'PROBE PERSON', array['person probe']) returning id into v_entry;
    update public.sanctions_list_versions set entry_count = 1, complete = false where id = v_url;
    if public.sanctions_list_autoactivate(v_url)->>'status' <> 'incomplete' then
      raise exception 'PROBE FAILED: an incomplete file activated itself';
    end if;
    update public.sanctions_list_versions set complete = true where id = v_url;
    if public.sanctions_list_autoactivate(v_url)->>'status' <> 'ok' then
      raise exception 'PROBE FAILED: a whole URL file did not activate';
    end if;
    perform set_config('role', 'none', true);
    begin
      update public.sanctions_list_versions set loaded_by = v_s2 where id = v_up;
      raise exception 'PROBE FAILED: the loader of a list was rewritten';
    exception when raise_exception then
      if sqlerrm not like 'SCUML item 8:%' then raise; end if;
    end;
    begin
      update public.sanctions_list_versions set entry_count = 5 where id = v_url;
      raise exception 'PROBE FAILED: an activated list was edited';
    exception when raise_exception then
      if sqlerrm not like 'SCUML item 8:%' then raise; end if;
    end;

    -- 11. A match on a staff member is not on their own desk.
    insert into public.sanctions_screenings (subject_kind, person_id, trigger, names_screened, ng_version_id, outcome, best_score)
    values ('person', v_s1, 'manual', array['Probe Person'], v_url, 'exact', 1) returning id into v_screen;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name)
    values (v_screen, v_s1, 'ng', v_entry, 'AUD.1', 'exact', 1, 'Probe Person', 'PROBE PERSON');
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    if exists (select 1 from jsonb_array_elements(public.sanctions_desk()->'hits') h where (h->>'personId')::uuid = v_s1) then
      raise exception 'PROBE FAILED: staff see a match on themselves';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    if not exists (select 1 from jsonb_array_elements(public.sanctions_desk()->'hits') h where (h->>'personId')::uuid = v_s1) then
      raise exception 'PROBE FAILED: another staff member does not see the match';
    end if;

    -- 8. EDD for the unclassified: a PEP, or a person with an open match, is not clear.
    insert into public.pep_declarations (user_id, is_pep, relation, role, asked_at)
    values (v_pep, true, 'self', 'Local government chairman', 'payout');
    if private.edd_clear_for(v_pep) then raise exception 'PROBE FAILED: an unclassified PEP is clear'; end if;
    if private.edd_clear_for(v_member) is not true then raise exception 'PROBE FAILED: an unclassified ordinary member is not clear'; end if;
    if exists (select 1 from public.risk_classes where user_id = v_s1 and private.risk_row_in_force(id, needs_approval) and risk_class = 'high') then
      null; -- s1 is classified; the unclassified rule does not apply to them.
    end if;
    insert into public.sanctions_screenings (subject_kind, person_id, trigger, names_screened, ng_version_id, outcome, best_score)
    values ('person', v_member, 'manual', array['Probe Person'], v_url, 'exact', 1) returning id into v_screen;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name)
    values (v_screen, v_member, 'ng', v_entry, 'AUD.1', 'fuzzy', 0.9, 'Probe Persun', 'PROBE PERSON');
    if private.edd_clear_for(v_member) then raise exception 'PROBE FAILED: an unclassified person with an open match is clear'; end if;

    -- 7. Retention: deleting an account leaves the compliance rows and their uuid.
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_flag := public.flag_pep(v_gone, true, 'family', 'Spouse of a governor', 'probe');
    perform set_config('request.jwt.claims', '', true);
    delete from auth.users where id = v_gone;
    if not exists (select 1 from public.pep_flags where id = v_flag and user_id = v_gone) then
      raise exception 'PROBE FAILED: a deleted account took its PEP flag with it';
    end if;
    begin
      update public.pep_flags set user_id = null where id = v_flag;
      raise exception 'PROBE FAILED: a PEP flag was nulled';
    exception when sqlstate 'RM175' then null;
    end;

    -- 6 and 10. The monitor still observes a charge with its new search_path and lock_timeout.
    insert into public.agents (user_id, display_name, role) values (v_s2, 'Probe Owner', 'owner') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML audit probe shortlet', 'shortlet', 'owner', 'DRAFT', false, 600000000, 'night')
    returning id into v_listing2;
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing2;
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing2, v_s1, v_today + 2, v_today + 3, 1, 0, 0, 0) returning id into v_booking;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking, 'paystack', 'scumlaudit-probe-' || gen_random_uuid(), 600000000, 'NGN', 'PENDING') returning id into v_tx;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx;
    perform set_config('vallo.recording_unknown_charge', '', true);
    if (select count(*) from public.aml_ledger_observations where source_id = v_tx) <> 2
       or not exists (select 1 from public.threshold_events where kind = 'single' and source_id = v_tx) then
      raise exception 'PROBE FAILED: the monitor no longer observes a charge';
    end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if exists (select 1 from auth.users where id in (v_s1, v_s2, v_member, v_moved, v_gone, v_pep))
     or exists (select 1 from public.pep_flags where user_id in (v_s1, v_gone))
     or exists (select 1 from public.sanctions_list_versions where id in (v_up, v_url)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
