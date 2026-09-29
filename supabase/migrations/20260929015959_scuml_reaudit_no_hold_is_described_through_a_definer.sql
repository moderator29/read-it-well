/*
 * SCUML: THE RE-AUDIT'S FIXES. TIPPING-OFF THROUGH TWO DEFINER FUNCTIONS.
 *
 * 20260929014729 hid a compliance ('plain') hold from its owner's own read
 * policy. The re-audit found two definer functions that still told the member
 * about it, and four smaller gaps. Each is fixed here and each is exercised by
 * the rolled-back probe at the end.
 *
 * 1 HIGH  public.report_not_me(): when a live compliance hold stands (a
 *         'plain' row, or any live private.hold_claims row), the member's own
 *         24-hour "not me" protection is recorded as a claim ('not_me') beside
 *         it, the row is not touched, and the answer carries no date and no
 *         reason (hold_until null, hold_reason null). The notification and the
 *         audit row name no date either.
 * 2 HIGH  public.admin_finish_email_recovery(): when a live compliance hold
 *         stands, the row keeps its reason 'plain' and its date; the 7-day
 *         address-move hold is recorded as a claim ('address_move') instead of
 *         relabelling the row (which told the member, through the settings
 *         page, that a hold existed and until when).
 * 3 MED   decide_listing_mandate refuses ('own_listing') a staff member who
 *         owns the listing through private.owns_listing (its agent, or an
 *         active member of its firm), or is its assigned agent.
 * 5 LOW   private.refuse_money_out_during_hold: one undated sentence always,
 *         so the wording never changes when a compliance claim joins the
 *         member's own hold.
 * 6 LOW   edd_clear_for: an unsettled reopened item 15 review shuts the gate
 *         for an unclassified person too.
 *
 * hold_claims gains two owners for the member-facing holds that now sit beside
 * a compliance claim: 'not_me' and 'address_move'.
 */

set local lock_timeout = '5s';

/* ================================================= claim owners */

alter table private.hold_claims drop constraint if exists hold_claims_owner_check;
alter table private.hold_claims add constraint hold_claims_owner_check
  check (owner in ('str', 'sanctions', 'not_me', 'address_move'));

/* ================================================= 1. report_not_me */

create or replace function public.report_not_me()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  current_session uuid := nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid;
  v_session_started timestamptz;
  v_hold public.account_money_holds%rowtype;
  v_found boolean;
  v_compliance boolean;
  v_ended integer;
  v_until timestamptz;
  v_placed boolean := false;
  v_extended boolean := false;
  v_allowed boolean;
  v_reason text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select s.created_at into v_session_started from auth.sessions s where s.id = current_session;

  delete from auth.sessions s
   where s.user_id = actor
     and s.id is distinct from current_session;
  get diagnostics v_ended = row_count;

  v_allowed := private.consume_rate_limit('security_not_me', actor::text, 5, 3600);

  select * into v_hold from public.account_money_holds h where h.user_id = actor for update;
  v_found := found;

  /* A compliance hold (a desk's claim, or a plain row) is never described to
     its owner: no date, no reason, and the row is not touched. The member's
     own 24 hours are recorded as a claim beside it. */
  v_compliance := exists (select 1 from private.hold_claims c where c.user_id = actor and c.until > now())
                  or (v_found and v_hold.hold_until > now() and v_hold.reason = 'plain');
  if v_compliance then
    if v_allowed then
      perform private.hold_claim_set(actor, 'not_me', now() + interval '24 hours', actor);
      v_placed := true;
    end if;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'security.not_me', 'account', actor::text,
            jsonb_build_object('sessions_ended', v_ended, 'hold_until', null,
                               'hold_placed', v_placed, 'hold_extended', false,
                               'rate_limited', not v_allowed));
    if v_placed then
      perform private.notify(
        actor,
        'system'::public.notification_kind,
        'Your payout details are locked for now',
        'You said a sign-in was not you. We signed out every other device, and nobody can add or change a bank or payout account on this account for now. Change your password now.',
        '/settings/devices'
      );
    end if;
    return jsonb_build_object(
      'status', 'ok',
      'ended', v_ended,
      'hold_until', null,
      'hold_placed', v_placed,
      'hold_extended', false,
      'hold_reason', null,
      'rate_limited', not v_allowed
    );
  end if;

  v_reason := case when v_found and v_hold.hold_until > now() then v_hold.reason else null end;

  if not v_allowed then
    v_until := case when v_reason is not null then v_hold.hold_until else null end;
  elsif not v_found or v_hold.hold_until <= now() then
    v_until := now() + interval '24 hours';
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (actor, v_until, 'not_me', now())
    on conflict (user_id) do update
      set hold_until = excluded.hold_until, reason = excluded.reason, created_at = excluded.created_at;
    v_placed := true;
  elsif v_session_started is not null and v_session_started < v_hold.created_at then
    v_until := least(greatest(v_hold.hold_until, now() + interval '24 hours'),
                     v_hold.created_at + interval '72 hours');
    if v_until > v_hold.hold_until then
      update public.account_money_holds set hold_until = v_until where user_id = actor;
      v_extended := true;
    else
      v_until := v_hold.hold_until;
    end if;
  else
    v_until := v_hold.hold_until;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'security.not_me', 'account', actor::text,
          jsonb_build_object('sessions_ended', v_ended, 'hold_until', v_until,
                             'hold_placed', v_placed, 'hold_extended', v_extended,
                             'rate_limited', not v_allowed));

  if v_placed or v_extended then
    perform private.notify(
      actor,
      'system'::public.notification_kind,
      'Your payout details are locked for now',
      'You said a sign-in was not you. We signed out every other device, and nobody can add or change a bank or payout account on this account until the hold ends. Change your password now.',
      '/settings/devices'
    );
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'ended', v_ended,
    'hold_until', v_until,
    'hold_placed', v_placed,
    'hold_extended', v_extended,
    'hold_reason', v_reason,
    'rate_limited', not v_allowed
  );
end;
$function$;

/* ================================================= 2. admin_finish_email_recovery */

create or replace function public.admin_finish_email_recovery(p_request uuid, p_ok boolean, p_error text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  caller   uuid := (select auth.uid());
  r        public.email_recovery_requests;
  ended    integer := 0;
  until    timestamptz := now() + interval '7 days';
begin
  if caller is null or not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'Only a super admin can move an account to a new address.' using errcode = '42501';
  end if;

  select * into r from public.email_recovery_requests q where q.id = p_request for update;
  if r.id is null or r.status <> 'completing' then
    raise exception 'That request is not being completed.' using errcode = 'RM041';
  end if;
  if r.began_by is distinct from caller then
    raise exception 'Only the super admin who began the move can finish it.' using errcode = '42501';
  end if;

  if p_ok then
    update public.email_recovery_requests q
       set status = 'completed', completed_by = caller, completed_at = now(), last_error = null
     where q.id = r.id;
    -- Whoever holds the account now signs in again, at the new address.
    -- auth.refresh_tokens cascades from auth.sessions.
    delete from auth.sessions s where s.user_id = r.user_id;
    get diagnostics ended = row_count;
    if exists (select 1 from private.hold_claims c where c.user_id = r.user_id and c.until > now())
       or exists (select 1 from public.account_money_holds h
                   where h.user_id = r.user_id and h.hold_until > now() and h.reason = 'plain') then
      /* A compliance hold stands: its row keeps reason 'plain' and its date,
         and the 7-day address hold is a claim beside it. Relabelling the row
         would tell the member a hold exists, and until when. */
      perform private.hold_claim_set(r.user_id, 'address_move', until, caller);
    else
      insert into public.account_money_holds (user_id, hold_until, reason)
      values (r.user_id, until, 'email address moved by support (request ' || r.id::text || ')')
      on conflict (user_id) do update
        set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
            reason = excluded.reason;
    end if;
  else
    update public.email_recovery_requests q
       set status = 'cooling_off', began_by = null, last_error = left(coalesce(p_error, 'unknown'), 500)
     where q.id = r.id;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller,
    case when p_ok then 'account.email_recovery.completed' else 'account.email_recovery.failed' end,
    'user', r.user_id::text,
    jsonb_build_object('request_id', r.id,
                       'sessions_ended', case when p_ok then ended else null end,
                       'money_hold_until', case when p_ok then until else null end,
                       'error', case when p_ok then null else left(coalesce(p_error, 'unknown'), 500) end));
end;
$function$;

/* ================================================= 3. own listing, through the firm too */

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
  /* SCUML item 19: nobody decides the mandate on a listing they let: its
     agent, a member of its firm (private.owns_listing), or its assigned agent. */
  if private.owns_listing(m.listing_id)
     or exists (select 1 from public.listings x
                  join public.agents a on a.id = x.assigned_agent_id
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

/* ================================================= 5. one undated refusal */

create or replace function private.refuse_money_out_during_hold()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_owner uuid;
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
  /* One sentence for every hold, with no date: the wording never changes
     when a compliance claim joins the member's own hold. */
  if private.money_hold_until(v_owner) is not null then
    raise exception 'A new payout account cannot be added to this account right now.'
      using errcode = 'RM050';
  end if;
  return new;
end;
$function$;

/* ================================================= 6. EDD: reopened, unclassified */

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
    /* A review staff reopened shuts the gate for the unclassified too. */
    if exists (select 1 from public.edd_reviews v
                where v.user_id = p_user and v.scuml_item = 15 and v.reason = 'reopened'
                  and not private.edd_review_settled(v.id)) then
      return false;
    end if;
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

/* ================================================================ read-back */

do $readback$
declare
  bad text := '';
begin
  if position('owns_listing' in pg_get_functiondef('public.decide_listing_mandate(uuid,text,text,text,text,text,text)'::regprocedure)) = 0 then
    bad := bad || ' [decide_listing_mandate does not use owns_listing]';
  end if;
  if position('until %' in pg_get_functiondef('private.refuse_money_out_during_hold()'::regprocedure)) > 0 then
    bad := bad || ' [the payout refusal still carries a date]';
  end if;
  if position('address_move' in pg_get_functiondef('public.admin_finish_email_recovery(uuid,boolean,text)'::regprocedure)) = 0 then
    bad := bad || ' [the address move still relabels a compliance hold]';
  end if;
  if position('v_compliance' in pg_get_functiondef('public.report_not_me()'::regprocedure)) = 0 then
    bad := bad || ' [report_not_me still describes a compliance hold]';
  end if;
  if bad <> '' then raise exception 'SCUML RE-AUDIT FIXES READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* ==================================================================== probe */

do $probe$
declare
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_sa uuid := gen_random_uuid();
  v_str uuid := gen_random_uuid();
  v_plain uuid := gen_random_uuid();
  v_norm uuid := gen_random_uuid();
  v_move uuid := gen_random_uuid();
  v_move2 uuid := gen_random_uuid();
  v_fo uuid := gen_random_uuid();
  v_edd uuid := gen_random_uuid();
  v_ans jsonb;
  v_until timestamptz;
  v_req uuid;
  v_biz uuid;
  v_fo_agent uuid;
  v_s1_agent uuid;
  v_listing uuid;
  v_mandate uuid;
  v_err text;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scumlreaudit-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_s1, 's1'), (v_s2, 's2'), (v_sa, 'sa'), (v_str, 'str'), (v_plain, 'plain'), (v_norm, 'norm'),
                   (v_move, 'move'), (v_move2, 'move2'), (v_fo, 'fo'), (v_edd, 'edd')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin'), (v_sa, 'super_admin');

    -- 1a. A desk's claim: "not me" answers with no date and no reason, and leaves the row alone.
    perform private.hold_claim_set(v_str, 'str', now() + interval '30 days', v_s1);
    select hold_until into v_until from public.account_money_holds where user_id = v_str;
    perform set_config('request.jwt.claims', json_build_object('sub', v_str, 'role', 'authenticated')::text, true);
    v_ans := public.report_not_me();
    if v_ans->>'status' <> 'ok' or v_ans->'hold_until' <> 'null'::jsonb or v_ans->'hold_reason' <> 'null'::jsonb
       or (v_ans->>'hold_placed')::boolean is not true then
      raise exception 'PROBE FAILED: not-me described a compliance hold: %', v_ans;
    end if;
    if not exists (select 1 from public.account_money_holds where user_id = v_str and reason = 'plain' and hold_until >= v_until)
       or not exists (select 1 from private.hold_claims where user_id = v_str and owner = 'not_me' and until > now()) then
      raise exception 'PROBE FAILED: not-me touched the compliance row or recorded no claim';
    end if;
    if exists (select 1 from public.notifications where user_id = v_str and (body ~ '[0-9]{4}' or title ~ '[0-9]{4}')) then
      raise exception 'PROBE FAILED: the not-me notification carries a date';
    end if;
    -- 1b. A plain row with no claim (a legacy freeze): the same.
    insert into public.account_money_holds (user_id, hold_until, reason) values (v_plain, now() + interval '40 days', 'plain');
    perform set_config('request.jwt.claims', json_build_object('sub', v_plain, 'role', 'authenticated')::text, true);
    v_ans := public.report_not_me();
    if v_ans->'hold_until' <> 'null'::jsonb or v_ans->'hold_reason' <> 'null'::jsonb then
      raise exception 'PROBE FAILED: not-me described a plain hold: %', v_ans;
    end if;
    -- 1c. With no compliance hold, the member's own hold is dated as before.
    perform set_config('request.jwt.claims', json_build_object('sub', v_norm, 'role', 'authenticated')::text, true);
    v_ans := public.report_not_me();
    if jsonb_typeof(v_ans->'hold_until') <> 'string' or (v_ans->>'hold_placed')::boolean is not true
       or not exists (select 1 from public.account_money_holds where user_id = v_norm and reason = 'not_me') then
      raise exception 'PROBE FAILED: an ordinary not-me hold is no longer placed: %', v_ans;
    end if;

    -- 5. The payout refusal is the one undated sentence, even for the member's own hold.
    perform set_config('request.jwt.claims', '', true);
    begin
      insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
      values (v_norm, '058', 'Probe Bank', '0123456789', 'PROBE NORM', now());
      raise exception 'PROBE FAILED: a held member added a bank account';
    exception when sqlstate 'RM050' then
      v_err := sqlerrm;
      if v_err <> 'A new payout account cannot be added to this account right now.' then
        raise exception 'PROBE FAILED: the refusal is not the undated sentence: %', v_err;
      end if;
    end;

    -- 2. Moving the address of someone under a compliance hold keeps the row plain and its date.
    perform private.hold_claim_set(v_move, 'str', now() + interval '30 days', v_s1);
    select hold_until into v_until from public.account_money_holds where user_id = v_move;
    insert into public.email_recovery_requests (user_id, old_email, new_email, identity_source, evidence_ref, status, opened_by, eligible_at, began_by)
    values (v_move, 'old-move@example.invalid', 'new-move@example.invalid', 'probe', 'probe-evidence-1', 'completing', v_sa, now(), v_sa)
    returning id into v_req;
    perform set_config('request.jwt.claims', json_build_object('sub', v_sa, 'role', 'authenticated')::text, true);
    perform public.admin_finish_email_recovery(v_req, true, null);
    if not exists (select 1 from public.account_money_holds where user_id = v_move and reason = 'plain' and hold_until >= v_until) then
      raise exception 'PROBE FAILED: the address move relabelled or shortened a compliance hold';
    end if;
    if not exists (select 1 from private.hold_claims where user_id = v_move and owner = 'address_move'
                    and until between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute') then
      raise exception 'PROBE FAILED: the 7-day address hold was not recorded as a claim';
    end if;
    -- ... and moving an ordinary member's address still writes the address-move row.
    insert into public.email_recovery_requests (user_id, old_email, new_email, identity_source, evidence_ref, status, opened_by, eligible_at, began_by)
    values (v_move2, 'old-move2@example.invalid', 'new-move2@example.invalid', 'probe', 'probe-evidence-2', 'completing', v_sa, now(), v_sa)
    returning id into v_req;
    perform public.admin_finish_email_recovery(v_req, true, null);
    if not exists (select 1 from public.account_money_holds where user_id = v_move2 and reason like 'email address moved by support%') then
      raise exception 'PROBE FAILED: an ordinary address move no longer holds money';
    end if;

    -- 3. A staff member in the listing's firm cannot decide its mandate.
    perform set_config('request.jwt.claims', '', true);
    alter table public.businesses disable trigger user;
    insert into public.businesses (kind, name, slug, owner_id)
    values ((enum_range(null::public.business_kind))[1], 'Probe Firm', 'scuml-reaudit-probe-' || substr(md5(gen_random_uuid()::text), 1, 12), v_fo)
    returning id into v_biz;
    alter table public.businesses enable trigger user;
    insert into public.agents (user_id, display_name, role) values (v_fo, 'Probe Firm Owner', 'agent') returning id into v_fo_agent;
    insert into public.agents (user_id, display_name, role) values (v_s1, 'Probe Staff Member', 'agent') returning id into v_s1_agent;
    insert into public.firm_members (firm_id, agent_id, member_role, status) values (v_biz, v_fo_agent, 'principal', 'active'), (v_biz, v_s1_agent, 'staff', 'active');
    insert into public.listings (agent_id, title, property_type, listing_role, firm_id, status, is_demo)
    values (v_fo_agent, 'SCUML re-audit probe flat', 'apartment', 'firm', v_biz, 'DRAFT', false) returning id into v_listing;
    perform set_config('request.jwt.claims', json_build_object('sub', v_fo, 'role', 'authenticated')::text, true);
    v_ans := public.file_listing_mandate(v_listing, 'letting', 'Adaeze Okafor', '+2348031234567', 'owner', true, current_date, null);
    v_mandate := (v_ans->>'mandate_id')::uuid;
    if v_mandate is null then raise exception 'PROBE FAILED: file answered %', v_ans; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_ans := public.decide_listing_mandate(v_mandate, 'reject', null, null, null, null, 'The principal did not answer our call.');
    if v_ans->>'state' <> 'own_listing' then raise exception 'PROBE FAILED: a firm member decided their firm''s mandate: %', v_ans; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.decide_listing_mandate(v_mandate, 'reject', null, null, null, null, 'The principal did not answer our call.');
    if v_ans->>'state' <> 'rejected' then raise exception 'PROBE FAILED: an unrelated staff member could not decide: %', v_ans; end if;

    -- 6. An unsettled reopened review shuts the gate for the unclassified.
    if private.edd_clear_for(v_edd) is not true then raise exception 'PROBE FAILED: an ordinary unclassified member is not clear'; end if;
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (v_edd, 15, 'reopened', 'risk_classes', gen_random_uuid());
    if private.edd_clear_for(v_edd) then raise exception 'PROBE FAILED: a reopened review did not shut the gate'; end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if exists (select 1 from auth.users where id in (v_s1, v_s2, v_sa, v_str, v_plain, v_norm, v_move, v_move2, v_fo, v_edd))
     or exists (select 1 from private.hold_claims where user_id in (v_str, v_move)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
