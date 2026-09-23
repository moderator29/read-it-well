-- THREE MORE BUILDERS THAT HAD NO CALLER, HUNG OFF THE SAME JUNCTION.
--
-- `withdrawalOutcome`, `inspectionScheduled` and `verificationRungPassed` were
-- reachable only from `fixtures.ts`. All three describe an event that happens
-- inside the database and nowhere else, which is why none of them was ever
-- going to be wired from a server action:
--
--   A WITHDRAWAL SETTLES when the Paystack webhook or the reconciliation job
--   moves `wallet_entries.status` off PENDING. The reconciliation is a pg_cron
--   job calling a SQL function. There is no TypeScript on that path at all,
--   and it is the path that catches the transfer whose webhook never arrived.
--
--   AN INSPECTION IS CONFIRMED by `lib/inspections/actions.ts` today, and by
--   `private.guard_inspection_transition` whatever writes it. The table is the
--   only thing both agree on.
--
--   A VERIFICATION RUNG is decided on the admin desk and could be decided by a
--   back-office script tomorrow. `agent_verification_checks.status` is where
--   it lands either way.
--
-- ----------------------------------------------------------------------------
-- WHAT THE PAYLOADS DO NOT CARRY.
--
-- No bank name, no account digits, no property address, no phone number, no
-- person's name. Every one of those is resolved at send time by the service
-- role in `lib/notify/templates.ts`, from the row the payload names. The queue
-- holds ids, an enum, an amount in integer kobo and a timestamp, so a row read
-- out of it describes an event without describing a person.

-- ----------------------------------------------------------------------------
-- A WITHDRAWAL ENDED. PAID, FAILED OR REVERSED.

create or replace function private.enqueue_withdrawal_outcome_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
  v_outcome text;
begin
  if new.kind <> 'withdrawal' then
    return new;
  end if;
  if old.status is not distinct from new.status or old.status <> 'PENDING' then
    return new;
  end if;

  /*
   * `reversed` IS NOT A DUPLICATE OF `failed` AND THE BUILDER SAYS WHY.
   * Failed means the bank refused it and the money never left. Reversed means
   * it left, came back, and the person will see a debit and then a credit on
   * their statement. Telling them "it failed" is how a support ticket starts.
   */
  v_outcome := case new.status
    when 'COMPLETED' then 'paid'
    when 'FAILED' then 'failed'
    when 'REVERSED' then 'reversed'
    else null
  end;
  if v_outcome is null then
    return new;
  end if;

  select w.user_id into v_user from public.wallets w where w.id = new.wallet_id;
  if v_user is null then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    v_user,
    'wallet.withdrawal_outcome',
    'withdrawal:' || new.id::text || ':' || v_outcome,
    jsonb_build_object(
      'entry_id', new.id,
      'outcome', v_outcome,
      'amount_minor', new.amount_minor,
      'reference', new.reference
    )
  );
  return new;
end;
$$;

revoke all on function private.enqueue_withdrawal_outcome_email()
  from public, anon, authenticated;

drop trigger if exists wallet_entries_enqueue_withdrawal_email on public.wallet_entries;
create trigger wallet_entries_enqueue_withdrawal_email
  after update of status on public.wallet_entries
  for each row
  execute function private.enqueue_withdrawal_outcome_email();

-- ----------------------------------------------------------------------------
-- AN INSPECTION WAS CONFIRMED. BOTH SIDES ARE ABOUT TO TRAVEL.

create or replace function private.enqueue_inspection_booked_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and old.state is not distinct from new.state then
    return new;
  end if;
  if new.state <> 'CONFIRMED' then
    return new;
  end if;
  /* Without a time there is nothing to put in the email, and the message is
     entirely about where to be and when. */
  if new.slot_at is null then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    new.requester_id,
    'inspection.scheduled',
    'inspection:' || new.id::text || ':CONFIRMED:' || new.requester_id::text,
    jsonb_build_object(
      'inspection_id', new.id,
      'listing_id', new.listing_id,
      'audience', 'viewer',
      'counterparty_id', new.lister_id,
      'slot_at', new.slot_at
    )
  );

  if new.lister_id is not null then
    perform private.email_outbox_enqueue(
      new.lister_id,
      'inspection.scheduled',
      'inspection:' || new.id::text || ':CONFIRMED:' || new.lister_id::text,
      jsonb_build_object(
        'inspection_id', new.id,
        'listing_id', new.listing_id,
        'audience', 'lister',
        'counterparty_id', new.requester_id,
        'slot_at', new.slot_at
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_inspection_booked_email()
  from public, anon, authenticated;

drop trigger if exists inspection_requests_enqueue_email on public.inspection_requests;
create trigger inspection_requests_enqueue_email
  after insert or update on public.inspection_requests
  for each row
  execute function private.enqueue_inspection_booked_email();

-- ----------------------------------------------------------------------------
-- A VERIFICATION RUNG WAS PASSED.

create or replace function private.enqueue_verification_rung_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
  v_rung text;
begin
  if new.status <> 'passed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  /*
   * THE FOUR CHECKS THE TABLE KEEPS ARE NOT THE FOUR RUNGS THE EMAIL NAMES.
   * `in_person` is what the ladder calls an inspection, and `payout` is a
   * banking detail rather than a claim about a person, so it climbs nothing
   * and sends nothing. Mapping here rather than in the email keeps the
   * database's vocabulary and the reader's vocabulary from having to match.
   */
  v_rung := case new.kind
    when 'identity' then 'identity'
    when 'address' then 'address'
    when 'in_person' then 'inspection'
    else null
  end;
  if v_rung is null then
    return new;
  end if;

  select a.user_id into v_user from public.agents a where a.id = new.agent_id;
  if v_user is null then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    v_user,
    'verification.rung_passed',
    'verification:' || new.agent_id::text || ':' || v_rung,
    jsonb_build_object('agent_id', new.agent_id, 'rung', v_rung)
  );
  return new;
end;
$$;

revoke all on function private.enqueue_verification_rung_email()
  from public, anon, authenticated;

drop trigger if exists agent_verification_checks_enqueue_email on public.agent_verification_checks;
create trigger agent_verification_checks_enqueue_email
  after insert or update on public.agent_verification_checks
  for each row
  execute function private.enqueue_verification_rung_email();

-- ----------------------------------------------------------------------------
-- RULE 21, AND ALL THREE TRIGGERS READ BACK.

do $$
declare
  v_open int;
  v_triggers int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in ('enqueue_withdrawal_outcome_email',
                       'enqueue_inspection_booked_email',
                       'enqueue_verification_rung_email')
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: % enqueue function(s) are executable by anon or authenticated', v_open;
  end if;

  select count(*) into v_triggers
    from pg_trigger t
   where not t.tgisinternal and t.tgenabled = 'O'
     and t.tgname in ('wallet_entries_enqueue_withdrawal_email',
                      'inspection_requests_enqueue_email',
                      'agent_verification_checks_enqueue_email');
  if v_triggers <> 3 then
    raise exception 'the three enqueue triggers are not all installed and enabled (%)', v_triggers;
  end if;
end
$$;
