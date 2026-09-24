-- ESC-05, ESC-15, ESC-09: money leaves escrow only when it should, one bad row
-- never stops the rest, and nothing waits unseen for ever. (Requires m11:
-- private.guard_feature_flag_write is extended here.)
--
-- ESC-05. The hourly sweeper and escrow_confirm_as paid out with no way to
-- stop them in an incident, and paid a payee whose agent account was
-- suspended or whose account was being deleted.
--   1. A second switch, held_payments_payouts, read by
--      private.escrow_payouts_open() (a missing row is closed). While it is
--      off the sweeper and confirm pay nothing out; the money stays held and an
--      escrow.payout_paused audit row says so. It ships on, so nothing changes
--      until somebody turns it off. Any admin may turn it off; only a super
--      admin may turn it on.
--   2. A payee with a live agent suspension or a scheduled account deletion is
--      not paid automatically: the escrow moves to DISPUTED ("Paused by
--      Vallo"), out of the sweeper's queue, with one alert, for a super admin
--      to rule on.
--   3. Both checks live in one place, private.escrow_payout_gate, and every
--      door that releases held money without a ruling calls it before
--      escrow_settle: the hourly sweeper, escrow_confirm_as (both sides
--      confirmed), private.escrow_inspection_is_a_signal (the payer's
--      inspection completes a confirmation) and public.escrow_release (the
--      platform's release). A super admin's ruling (escrow_admin_resolve) is
--      not gated: it is the human review the pause asks for. Refunds to the
--      payer are not payouts and are not gated.
-- ESC-15. The sweeper took no lock, ignored settle's answer and let one raise
-- roll back all 200 releases every hour. It now locks with SKIP LOCKED,
-- settles each row in its own subtransaction, counts only 'ok', and moves a
-- row that cannot settle out of the queue the same way.
-- ESC-09. Nothing looked at a dispute's age, and an unfunded proposal lived
-- for ever. private.escrow_age_watch (hourly) alerts on disputes older than
-- 48 hours (high after 7 days) and cancels proposals nobody funded in 14 days.

insert into public.feature_flags (key, enabled, note)
values ('held_payments_payouts', true,
        'ESC-05. Off pauses every escrow payout (the hourly release, both-sides confirm, the inspection signal and the platform release); money stays held. Rulings and refunds are not paused. '
        || 'Any admin may switch it off; only a super admin may switch it back on.')
on conflict (key) do nothing;

create or replace function private.escrow_payouts_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'held_payments_payouts'), false);
$$;
revoke all on function private.escrow_payouts_open() from public, anon, authenticated;

create or replace function private.guard_feature_flag_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_caller boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  uid uuid := auth.uid();
  is_super boolean := uid is not null and private.has_role(uid, 'super_admin'::public.app_role);
  touched_key text := coalesce(new.key, old.key);
begin
  if touched_key = 'held_payments' or old.key = 'held_payments' then
    if api_caller and not is_super then
      raise exception 'held_payments_is_super_admin_only: only a super admin may change the held payments switch'
        using errcode = '42501', hint = 'ESC-08.';
    end if;
    if tg_op <> 'DELETE' and new.enabled
       and private.custody_structure() not in ('trustee', 'licensed_partner') then
      raise exception 'held_payments_custody_undecided: held payments stay closed until custody is decided'
        using errcode = '42501', hint = 'ESC-08: private.platform_settings custody_structure is undecided.';
    end if;
  end if;
  -- ESC-05. Anybody on staff may pause payouts; only a super admin resumes
  -- them, creates the switch or removes it.
  if touched_key = 'held_payments_payouts' or old.key = 'held_payments_payouts' then
    if api_caller and not is_super
       and not (tg_op = 'UPDATE' and new.key = old.key and new.enabled = false) then
      raise exception 'held_payments_payouts_resume_is_super_admin_only: only a super admin may resume escrow payouts'
        using errcode = '42501', hint = 'ESC-05.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_feature_flag_write() from public, anon, authenticated;

-- Whether a payee may be paid automatically right now.
create or replace function private.escrow_payee_blocked(p_payee uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.agent_suspensions s join public.agents a on a.id = s.agent_id
                  where a.user_id = p_payee and s.lifted_at is null)
      then 'the payee''s agent account is suspended'
    when exists (select 1 from public.account_deletion_requests d
                  where d.user_id = p_payee and d.status in ('SCHEDULED', 'PURGING', 'PURGED'))
      then 'the payee''s account is being deleted'
    else null
  end;
$$;
revoke all on function private.escrow_payee_blocked(uuid) from public, anon, authenticated;

-- Take a held escrow out of the automatic path and put it in front of a person.
create or replace function private.escrow_pause(p_escrow uuid, p_why text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.escrows;
begin
  update public.escrows
     set state = 'DISPUTED',
         disputed_at = now(),
         disputed_by = null,
         dispute_reason = 'Paused by Vallo: ' || p_why,
         auto_release_at = null
   where id = p_escrow and state in ('HELD', 'RELEASE_REQUESTED')
  returning * into e;
  if e.id is null then
    return false;
  end if;
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values ('high', 'open', 'A held payment was paused before paying out',
          format('Escrow %s (%s kobo) was not released because %s. It is now DISPUTED for a super admin to rule on.',
                 e.id, e.amount_minor, p_why),
          'escrow', e.id::text);
  perform private.notify(e.payer_id, 'wallet', 'A held payment is paused',
    'The money stays held while our team checks something. We will be in touch.', '/escrow/' || e.id::text);
  perform private.notify(e.payee_id, 'wallet', 'A held payment is paused',
    'The money stays held while our team checks something. We will be in touch.', '/escrow/' || e.id::text);
  return true;
end;
$$;
revoke all on function private.escrow_pause(uuid, text) from public, anon, authenticated;

-- ESC-05. The one question every payout door asks before escrow_settle
-- releases: null means pay; otherwise the door stops and returns this status.
--   'payouts_paused'    the switch is off; the escrow is untouched and an
--                       escrow.payout_paused audit row names the door.
--   'paused_for_review' the payee may not be paid now; the escrow is DISPUTED.
create or replace function private.escrow_payout_gate(p_escrow uuid, p_payee uuid, p_door text, p_actor uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  blocked text;
begin
  if not private.escrow_payouts_open() then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'escrow.payout_paused', 'escrow', p_escrow::text,
            jsonb_build_object('switch', 'held_payments_payouts', 'door', p_door));
    return 'payouts_paused';
  end if;
  blocked := private.escrow_payee_blocked(p_payee);
  if blocked is not null then
    perform private.escrow_pause(p_escrow, blocked);
    return 'paused_for_review';
  end if;
  return null;
end;
$$;
revoke all on function private.escrow_payout_gate(uuid, uuid, text, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.escrow_sweep_timeouts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  e record;
  moved integer := 0;
  due integer;
  outcome jsonb;
  gate text;
begin
  -- ESC-05. The payouts switch is off: nothing leaves, and the audit says why.
  if not private.escrow_payouts_open() then
    select count(*) into due from public.escrows
     where state in ('HELD', 'RELEASE_REQUESTED')
       and ((auto_release_at is not null and auto_release_at <= now())
            or (payer_confirmed_at is not null and payee_confirmed_at is not null));
    if due > 0 then
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'escrow.payout_paused', 'escrow_sweep', null,
              jsonb_build_object('due', due, 'switch', 'held_payments_payouts'));
    end if;
    return 0;
  end if;

  for e in
    select x.id, x.payee_id,
           (x.payer_confirmed_at is not null and x.payee_confirmed_at is not null) as both_confirmed
      from public.escrows x
     where x.state in ('HELD', 'RELEASE_REQUESTED')
       and ((x.auto_release_at is not null and x.auto_release_at <= now())
            -- Both sides confirmed while payouts were paused: paid now.
            or (x.payer_confirmed_at is not null and x.payee_confirmed_at is not null))
     order by x.auto_release_at nulls first
     limit 200
       for update skip locked
  loop
    gate := private.escrow_payout_gate(e.id, e.payee_id, 'sweep');
    if gate is not null then
      continue;
    end if;
    -- ESC-15. One row, one subtransaction: a row that cannot settle leaves the
    -- queue and the rest still pay out.
    begin
      outcome := private.escrow_settle(
        e.id, 'release', 'RELEASED', null,
        case when e.both_confirmed
             then 'Both sides confirmed, so the money went out without anybody having to ask.'
             else 'The hold window passed with no objection, so the money went to the payee.' end
      );
    exception when others then
      outcome := jsonb_build_object('status', 'raised', 'error', sqlerrm);
    end;
    if outcome ->> 'status' = 'ok' then
      moved := moved + 1;
    else
      perform private.escrow_pause(e.id, format('the automatic release could not be made (%s)',
                                                coalesce(outcome ->> 'error', outcome ->> 'status')));
    end if;
  end loop;
  return moved;
end;
$function$;

CREATE OR REPLACE FUNCTION public.escrow_confirm_as(p_actor uuid, p_escrow uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := p_actor;
  e public.escrows;
  gate text;
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor <> e.payer_id and actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state not in ('HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'not_confirmable', 'state', e.state);
  end if;

  if actor = e.payer_id then
    update public.escrows set payer_confirmed_at = coalesce(payer_confirmed_at, now())
     where id = e.id
     returning * into e;
  else
    update public.escrows set payee_confirmed_at = coalesce(payee_confirmed_at, now())
     where id = e.id
     returning * into e;
  end if;

  if e.payer_confirmed_at is not null and e.payee_confirmed_at is not null then
    -- ESC-05. Both sides agreeing does not pay out while payouts are paused
    -- or the payee may not be paid; the confirmations are kept.
    gate := private.escrow_payout_gate(e.id, e.payee_id, 'confirm', actor);
    if gate is not null then
      return jsonb_build_object('status', gate, 'escrow_id', e.id,
                                'state', case when gate = 'paused_for_review' then 'DISPUTED' else e.state::text end);
    end if;
    return private.escrow_settle(
      e.id, 'release', 'RELEASED', actor,
      'Both sides confirmed, so the money went out without anybody having to ask.'
    );
  end if;

  perform private.notify(
    case when actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet', 'One side has confirmed',
    'The other party has confirmed. The held money is paid out as soon as you confirm too.',
    '/wallet'
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'state', e.state,
    'payer_confirmed', e.payer_confirmed_at is not null,
    'payee_confirmed', e.payee_confirmed_at is not null
  );
end;
$function$;

-- ESC-05. The payer's inspection completing a confirmation is a payout door
-- too. Unchanged but for the gate: the payer's confirmation is kept either
-- way, and a paused payout is paid by the sweeper once payouts reopen.
CREATE OR REPLACE FUNCTION private.escrow_inspection_is_a_signal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  e public.escrows;
  others integer := 0;
begin
  if new.listing_id is null then
    return null;
  end if;

  /*
   * ONE ROW, CHOSEN THE SAME WAY EVERY TIME.
   *
   * The loop this replaces confirmed the payer's side of EVERY open hold this
   * payer had against this listing. An inspection is evidence about one
   * property on one day; it is not consent to release every payment attached
   * to that property. Where a payer genuinely holds more than one, the oldest
   * is confirmed, the rest are left alone, and the payer is told by name what
   * happened, because a silent partial effect is worse than either extreme.
   */
  select * into e
    from public.escrows
   where payer_id = new.user_id
     and listing_id = new.listing_id
     and state in ('HELD', 'RELEASE_REQUESTED')
     and payer_confirmed_at is null
   order by coalesce(held_at, initiated_at), id
   limit 1
   for update;

  if e.id is null then
    return null;
  end if;

  select count(*) into others
    from public.escrows
   where payer_id = new.user_id
     and listing_id = new.listing_id
     and state in ('HELD', 'RELEASE_REQUESTED')
     and payer_confirmed_at is null
     and id <> e.id;

  update public.escrows
     set payer_confirmed_at = new.confirmed_at,
         inspection_confirmation_id = new.id
   where id = e.id
   returning * into e;

  if others > 0 then
    perform private.notify(
      new.user_id, 'wallet',
      'One held payment was confirmed',
      'Your inspection confirmed the earliest payment you are holding on this property. '
        || others::text
        || case when others = 1 then ' other payment is' else ' other payments are' end
        || ' still held and waiting for you.',
      '/escrow/' || e.id::text
    );
  end if;

  -- Nested, not AND: the gate writes (an audit row, or a pause), so it runs
  -- only when both sides have confirmed.
  if e.payee_confirmed_at is not null then
    if private.escrow_payout_gate(e.id, e.payee_id, 'inspection', new.user_id) is null then
      perform private.escrow_settle(
        e.id, 'release', 'RELEASED', new.user_id,
        'The payer confirmed the inspection and the payee had already confirmed, so the money went out.'
      );
    end if;
  end if;

  return null;
end;
$function$;

-- ESC-05. The platform's release door (service role) asks the same question.
CREATE OR REPLACE FUNCTION public.escrow_release(escrow_id uuid, beneficiary_user uuid, release_reference text, note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  e public.escrows;
  outcome jsonb;
  gate text;
begin
  if escrow_id is null or beneficiary_user is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = escrow_id for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.payee_id <> beneficiary_user then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED') then
    -- Settled once already. Reported as duplicate rather than wrong_state
    -- because that is what a retry of this exact leg is, and the caller logs
    -- the two differently.
    return jsonb_build_object('status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;
  if e.state not in ('HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;

  gate := private.escrow_payout_gate(e.id, e.payee_id, 'platform_release');
  if gate is not null then
    return jsonb_build_object('status', gate, 'state',
                              case when gate = 'paused_for_review' then 'DISPUTED' else e.state::text end);
  end if;

  outcome := private.escrow_settle(
    e.id, 'release', 'RELEASED', null,
    coalesce(note, 'Released by the platform.')
  );
  if outcome ->> 'status' <> 'ok' then
    return outcome;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'state', 'RELEASED',
    'amount_minor', (outcome ->> 'net_minor')::bigint
  );
end;
$function$;

-- ESC-09.
create or replace function private.escrow_age_watch()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  alerted integer := 0;
  expired integer := 0;
  level public.alert_severity;
  alert_title text;
begin
  for e in
    select x.id, x.amount_minor, x.disputed_at from public.escrows x
     where x.state = 'DISPUTED' and x.disputed_at < now() - interval '48 hours'
  loop
    level := case when e.disputed_at < now() - interval '7 days' then 'high' else 'medium' end;
    alert_title := case when level = 'high' then 'A dispute has waited more than a week'
                        else 'A dispute has waited more than 48 hours' end;
    if not exists (select 1 from public.risk_alerts a
                    where a.entity_type = 'escrow' and a.entity_id = e.id::text
                      and a.status = 'open' and a.title = alert_title) then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values (level, 'open', alert_title,
              format('Escrow %s (%s kobo) has been in dispute since %s. The money is held until somebody rules.',
                     e.id, e.amount_minor, e.disputed_at),
              'escrow', e.id::text);
      alerted := alerted + 1;
    end if;
  end loop;

  update public.escrows
     set state = 'CANCELLED',
         resolution_note = 'Expired before anybody set it aside'
   where state = 'INITIATED' and initiated_at < now() - interval '14 days';
  get diagnostics expired = row_count;

  return jsonb_build_object('alerted', alerted, 'expired_proposals', expired);
end;
$$;
revoke all on function private.escrow_age_watch() from public, anon, authenticated;

select cron.schedule('vallo_escrow_age_watch', '41 * * * *', 'select private.escrow_age_watch();');
