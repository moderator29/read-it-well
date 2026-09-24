-- ESC-07 and ESC-08: who may open held payments, who may rule, and how a
-- ruling is undone.
--
-- ESC-08. Whether naira can be held depended on one feature_flags row that
-- any admin could insert over PostgREST, with no database audit, and the
-- founder's condition (custody decided) was enforced by nobody.
--   1. private.platform_settings carries custody_structure, 'undecided' until a
--      migration says otherwise. No API role can read or write it.
--   2. private.held_payments_open() is true only when the held_payments flag is
--      on AND custody is decided. escrow_propose_as and escrow_fund_proposal_as
--      refuse otherwise, so the gate holds in the database, not only in
--      lib/escrow/flag.ts.
--   3. A trigger on feature_flags: through the API, only a super_admin may
--      write the held_payments row; nobody may switch it on while custody is
--      undecided; every insert, update and delete of any flag writes audit_log.
--   4. anon loses INSERT, UPDATE and DELETE on feature_flags.
--
-- ESC-07. One admin, on a password, could rule on a dispute they were party
-- to, at any amount, and RESOLVED was terminal.
--   5. escrow_admin_resolve: super_admin only; never a party to the escrow; at
--      or above private.escrow_two_person_threshold_minor() (N500,000) the first
--      super_admin's ruling is a proposal and a second super_admin applies it.
--      Every ruling is a row in public.escrow_rulings, audited on every change.
--   6. escrow_reverse_ruling: a super_admin who neither proposed nor approved
--      the ruling (and is not a party) reverses it. The settlement credit is
--      marked REVERSED (so it stops counting), any commission row is removed,
--      and the escrow goes back to DISPUTED, where it is ruled on again under
--      the same rules. It refuses while the credited wallet cannot cover the
--      credit (no wallet is overdrawn by a correction).
--   7. The I-8 invariant reads only COMPLETED settlements, so a reversed
--      credit is not read as a live one.

-- 1. Settings.
create table if not exists private.platform_settings (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now()
);
revoke all on private.platform_settings from public, anon, authenticated;
insert into private.platform_settings (key, value, note)
values ('custody_structure', 'undecided',
        'ESC-08. Who holds held money: undecided | trustee | licensed_partner. Changed only by a migration, '
        || 'after the founder''s solicitor has decided, together with lib/escrow/copy.ts CUSTODY_STRUCTURE.')
on conflict (key) do nothing;

create or replace function private.custody_structure()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.value from private.platform_settings s where s.key = 'custody_structure'), 'undecided');
$$;
revoke all on function private.custody_structure() from public, anon, authenticated;

-- 2. The database-side gate.
create or replace function private.held_payments_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'held_payments'), false)
     and private.custody_structure() in ('trustee', 'licensed_partner');
$$;
revoke all on function private.held_payments_open() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.escrow_propose_as(p_actor uuid, p_conversation uuid, p_counterparty uuid, p_purpose escrow_purpose, p_amount_minor bigint, p_actor_pays boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  convo public.conversations;
  payer uuid;
  payee uuid;
  new_id uuid;
  live integer;
  demo boolean;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  -- ESC-08. The gate is the database's, not only the app's.
  if not private.held_payments_open() then
    return jsonb_build_object('status', 'held_payments_closed');
  end if;
  if p_conversation is null or p_counterparty is null or p_purpose is null
     or p_actor_pays is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_actor = p_counterparty then
    return jsonb_build_object('status', 'same_party');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not private.escrow_purpose_is_open(p_purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', p_purpose);
  end if;

  select * into convo from public.conversations where id = p_conversation;
  if convo.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  /* BOTH NAMED PEOPLE MUST BE THE TWO PEOPLE IN THE THREAD. Not "the actor is
     a member": that would let a member propose an agreement between themselves
     and a stranger who has never spoken to them. */
  if not (
    (convo.guest_id = p_actor and convo.agent_id = p_counterparty)
    or (convo.agent_id = p_actor and convo.guest_id = p_counterparty)
  ) then
    return jsonb_build_object('status', 'not_a_party');
  end if;

  /* ASK THE DEMO QUESTION HERE so the answer is a sentence rather than a
     raised exception reported as an outage. The trigger still refuses. */
  if convo.listing_id is not null then
    select l.is_demo into demo from public.listings l where l.id = convo.listing_id;
    if coalesce(demo, false) then
      return jsonb_build_object('status', 'demo_listing');
    end if;
  end if;

  select count(*) into live
  from public.escrows
  where conversation_id = p_conversation
    and state in ('INITIATED', 'FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');
  if live > 0 then
    return jsonb_build_object('status', 'already_open');
  end if;

  if p_actor_pays then
    payer := p_actor;
    payee := p_counterparty;
  else
    payer := p_counterparty;
    payee := p_actor;
  end if;

  insert into public.escrows
    (payer_id, payee_id, listing_id, purpose, amount_minor, opened_by, conversation_id)
  values
    (payer, payee, convo.listing_id, p_purpose, p_amount_minor, p_actor, p_conversation)
  returning id into new_id;

  perform private.notify(
    p_counterparty, 'wallet', 'A proposal in your conversation',
    'The other person has proposed setting an amount aside. Nothing has been paid and nothing has left either balance.',
    '/escrow/' || new_id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', new_id,
    'state', 'INITIATED',
    'amount_minor', p_amount_minor
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.escrow_fund_proposal_as(p_actor uuid, p_escrow uuid, p_hold_days integer DEFAULT 21)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  e public.escrows;
  payer_wallet uuid;
  spendable bigint;
  hold_days integer := greatest(1, least(coalesce(p_hold_days, 21), 180));
  reference text;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_escrow is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  -- ESC-08. The gate is the database's, not only the app's.
  if not private.held_payments_open() then
    return jsonb_build_object('status', 'held_payments_closed');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_actor <> e.payer_id then
    /* The payee cannot fund what the payee is owed, and a third party cannot
       reach the row at all. Both answer in one word. */
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state <> 'INITIATED' then
    return jsonb_build_object('status', 'not_fundable', 'state', e.state);
  end if;
  if not private.escrow_purpose_is_open(e.purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', e.purpose);
  end if;

  payer_wallet := private.wallet_for_update(e.payer_id);
  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < e.amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', e.amount_minor
    );
  end if;

  reference := 'rm-esc-' || e.id::text || '-hold';

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', e.amount_minor, reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Held for a transaction on Vallo',
         'escrow_id', e.id,
         'purpose', e.purpose,
         'payee_id', e.payee_id,
         'listing_id', e.listing_id
       ));
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'reference', reference);
  end;

  update public.escrows
     set state = 'FUNDED', funded_at = now()
   where id = e.id;

  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = e.id;

  perform private.notify(
    e.payee_id, 'wallet', 'Money is held for you',
    'A payment is now held for you. It reaches your balance when both sides confirm, or on its own on the date shown.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'amount_minor', e.amount_minor,
    'state', 'HELD',
    'auto_release_at', now() + make_interval(days => hold_days)
  );
end;
$function$;

-- 3. feature_flags: the held_payments row, and an audit row for every change.
create or replace function private.guard_feature_flag_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_caller boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  uid uuid := auth.uid();
  touched_key text := coalesce(new.key, old.key);
begin
  if touched_key = 'held_payments' or old.key = 'held_payments' then
    if api_caller and not (uid is not null and private.has_role(uid, 'super_admin'::public.app_role)) then
      raise exception 'held_payments_is_super_admin_only: only a super admin may change the held payments switch'
        using errcode = '42501', hint = 'ESC-08.';
    end if;
    if tg_op <> 'DELETE' and new.enabled
       and private.custody_structure() not in ('trustee', 'licensed_partner') then
      raise exception 'held_payments_custody_undecided: held payments stay closed until custody is decided'
        using errcode = '42501', hint = 'ESC-08: private.platform_settings custody_structure is undecided.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_feature_flag_write() from public, anon, authenticated;

create or replace function private.audit_feature_flag_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'feature_flag.' || lower(tg_op),
    'feature_flag',
    coalesce(new.key, old.key),
    jsonb_build_object(
      'before_enabled', case when tg_op = 'INSERT' then null else old.enabled end,
      'after_enabled', case when tg_op = 'DELETE' then null else new.enabled end,
      'db_role', coalesce(current_setting('role', true), 'none')
    ));
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_feature_flag_change() from public, anon, authenticated;

drop trigger if exists feature_flags_guard_write on public.feature_flags;
create trigger feature_flags_guard_write
  before insert or update or delete on public.feature_flags
  for each row execute function private.guard_feature_flag_write();
drop trigger if exists feature_flags_audit_after_change on public.feature_flags;
create trigger feature_flags_audit_after_change
  after insert or update or delete on public.feature_flags
  for each row execute function private.audit_feature_flag_change();

-- 4. anon never writes a switch.
revoke insert, update, delete on public.feature_flags from anon;

-- 4b. No door creates or funds an agreement while the gate is closed.
-- public.escrow_hold is an older funding door nothing calls any more; it did
-- not read the gate, so the service role loses it.
revoke execute on function public.escrow_hold(uuid, uuid, bigint, text, text, integer) from public, anon, authenticated, service_role;

create or replace function private.escrows_refuse_while_gate_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated', 'service_role')
     and not private.held_payments_open() then
    raise exception 'held_payments_closed: no agreement is created while held payments are closed'
      using errcode = '42501', hint = 'ESC-08.';
  end if;
  return new;
end;
$$;
revoke all on function private.escrows_refuse_while_gate_closed() from public, anon, authenticated;
drop trigger if exists escrows_00_gate on public.escrows;
create trigger escrows_00_gate
  before insert on public.escrows
  for each row execute function private.escrows_refuse_while_gate_closed();

-- 5. Rulings.
create or replace function private.escrow_two_person_threshold_minor()
returns bigint
language sql
immutable
set search_path = ''
as $$
  select 50000000::bigint;  -- N500,000 in kobo (ESC-07)
$$;
revoke all on function private.escrow_two_person_threshold_minor() from public, anon, authenticated;

create table if not exists public.escrow_rulings (
  id                  uuid primary key default gen_random_uuid(),
  escrow_id           uuid not null references public.escrows(id) on delete restrict,
  direction           text not null check (direction in ('release', 'refund')),
  note                text not null check (char_length(note) >= 20),
  amount_minor        bigint not null check (amount_minor > 0),
  threshold_minor     bigint not null,
  state               text not null default 'proposed'
                        check (state in ('proposed', 'applied', 'reversed', 'lapsed')),
  proposed_by         uuid not null,
  proposed_at         timestamptz not null default now(),
  approved_by         uuid,
  applied_at          timestamptz,
  settlement_reference text,
  reversed_by         uuid,
  reversed_at         timestamptz,
  reversal_note       text,
  check (approved_by is null or approved_by <> proposed_by),
  check (reversed_by is null or (reversed_by <> proposed_by and reversed_by is distinct from approved_by))
);
create unique index if not exists escrow_rulings_one_open_proposal
  on public.escrow_rulings (escrow_id) where state = 'proposed';
create index if not exists escrow_rulings_escrow_idx on public.escrow_rulings (escrow_id, proposed_at desc);
alter table public.escrow_rulings enable row level security;
revoke all on public.escrow_rulings from public, anon, authenticated;
grant select on public.escrow_rulings to authenticated;
create policy escrow_rulings_staff_select on public.escrow_rulings
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
-- The two-person record is written only by the ruling functions (as their
-- owner) and never edited or removed by anyone else.
revoke insert, update, delete, truncate on public.escrow_rulings from service_role;

create or replace function private.guard_escrow_ruling_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'escrow_rulings_are_kept: a ruling is never deleted' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if (new.id, new.escrow_id, new.direction, new.note, new.amount_minor, new.threshold_minor,
      new.proposed_by, new.proposed_at)
     is distinct from
     (old.id, old.escrow_id, old.direction, old.note, old.amount_minor, old.threshold_minor,
      old.proposed_by, old.proposed_at) then
    raise exception 'escrow_rulings_are_kept: who proposed what is fixed' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if new.state is distinct from old.state
     and (old.state, new.state) not in (('proposed', 'applied'), ('proposed', 'lapsed'), ('applied', 'reversed')) then
    raise exception 'escrow_rulings_are_kept: a ruling cannot go from % to %', old.state, new.state
      using errcode = '42501', hint = 'ESC-07.';
  end if;
  if old.state <> 'proposed'
     and (new.approved_by, new.applied_at, new.settlement_reference)
         is distinct from (old.approved_by, old.applied_at, old.settlement_reference) then
    raise exception 'escrow_rulings_are_kept: an applied ruling''s approval is fixed' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if old.state = 'reversed' and new is distinct from old then
    raise exception 'escrow_rulings_are_kept: a reversed ruling is final' using errcode = '42501', hint = 'ESC-07.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_escrow_ruling_change() from public, anon, authenticated;
drop trigger if exists escrow_rulings_guard on public.escrow_rulings;
create trigger escrow_rulings_guard
  before update or delete on public.escrow_rulings
  for each row execute function private.guard_escrow_ruling_change();

create or replace function private.audit_escrow_ruling_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(auth.uid(), new.reversed_by, new.approved_by, new.proposed_by),
    'escrow_ruling.' || new.state,
    'escrow',
    new.escrow_id::text,
    jsonb_build_object(
      'ruling_id', new.id,
      'from_state', case when tg_op = 'INSERT' then null else old.state end,
      'to_state', new.state,
      'direction', new.direction,
      'amount_minor', new.amount_minor,
      'threshold_minor', new.threshold_minor,
      'proposed_by', new.proposed_by,
      'approved_by', new.approved_by,
      'reversed_by', new.reversed_by,
      'note', new.note,
      'reversal_note', new.reversal_note
    ));
  return new;
end;
$$;
revoke all on function private.audit_escrow_ruling_change() from public, anon, authenticated;
drop trigger if exists escrow_rulings_audit on public.escrow_rulings;
create trigger escrow_rulings_audit
  after insert or update on public.escrow_rulings
  for each row execute function private.audit_escrow_ruling_change();

CREATE OR REPLACE FUNCTION public.escrow_admin_resolve(p_escrow uuid, p_direction text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := auth.uid();
  e public.escrows;
  outcome jsonb;
  ruling text;
  float_now jsonb;
  threshold bigint := private.escrow_two_person_threshold_minor();
  open_proposal public.escrow_rulings;
  ruling_id uuid;
begin
  -- ESC-07. Rulings are a super admin's, and never on their own escrow.
  if actor is null or not private.has_role(actor, 'super_admin') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  ruling := btrim(coalesce(p_note, ''));
  if char_length(ruling) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if actor in (e.payer_id, e.payee_id) then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if e.state <> 'DISPUTED' then
    return jsonb_build_object('status', 'not_disputed', 'state', e.state);
  end if;

  /*
   * ESC-01. THE FLOAT IS CHECKED BEFORE ANY RULING. When the ledger already
   * holds less than the live agreements promise, something has paid out
   * money it never took: the desk is alerted, and no release moves more until
   * the reconciliation has been read.
   */
  float_now := private.escrow_float_components();
  if coalesce((float_now ->> 'difference_minor')::bigint, 0) < 0 then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Held money does not reconcile at a ruling',
            format('The ledger holds %s kobo less than the live agreements promise. A %s ruling on escrow %s '
                   || 'was %s. Read the float before any further release.',
                   -((float_now ->> 'difference_minor')::bigint), p_direction, e.id,
                   case when p_direction = 'refund' then 'allowed, because it returns this agreement''s own posted hold to its payer'
                        else 'refused' end),
            'escrow', e.id::text);
    if p_direction <> 'refund' then
      return jsonb_build_object('status', 'float_out_of_balance',
                                'difference_minor', (float_now ->> 'difference_minor')::bigint);
    end if;
  end if;

  -- Two people at the threshold, and for any ruling that follows a reversal,
  -- so the person who reversed a decision cannot also make the next one alone.
  if e.amount_minor >= threshold
     or exists (select 1 from public.escrow_rulings x where x.escrow_id = e.id and x.state = 'reversed') then
    -- ESC-07. TWO PEOPLE AT THIS SIZE. A proposal lapses after 72 hours.
    update public.escrow_rulings
       set state = 'lapsed'
     where escrow_id = e.id and state = 'proposed' and proposed_at < now() - interval '72 hours';
    select * into open_proposal from public.escrow_rulings
     where escrow_id = e.id and state = 'proposed';
    if open_proposal.id is null then
      insert into public.escrow_rulings
        (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by)
      values (e.id, p_direction, ruling, e.amount_minor, threshold, actor)
      returning id into ruling_id;
      return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', ruling_id,
                                'threshold_minor', threshold, 'amount_minor', e.amount_minor);
    end if;
    if open_proposal.proposed_by = actor then
      return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', open_proposal.id,
                                'threshold_minor', threshold, 'amount_minor', e.amount_minor);
    end if;
    if open_proposal.direction <> p_direction then
      return jsonb_build_object('status', 'conflicting_proposal', 'ruling_id', open_proposal.id,
                                'proposed_direction', open_proposal.direction);
    end if;
    -- The second super admin applies the first one's ruling, word for word.
    ruling_id := open_proposal.id;
    ruling := open_proposal.note;
  end if;

  outcome := private.escrow_settle(e.id, p_direction, 'RESOLVED', actor, ruling);
  if outcome ->> 'status' <> 'ok' then
    -- Nothing was settled. An open proposal stays open; no applied row is written.
    return outcome;
  end if;

  if ruling_id is null then
    -- Below the threshold: one super admin's ruling, recorded as applied.
    insert into public.escrow_rulings
      (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by,
       state, applied_at, settlement_reference)
    values (e.id, p_direction, ruling, e.amount_minor, threshold, actor,
            'applied', now(), 'escrow:' || p_direction || ':' || e.id::text)
    returning id into ruling_id;
  else
    update public.escrow_rulings
       set state = 'applied',
           approved_by = actor,
           applied_at = now(),
           settlement_reference = 'escrow:' || p_direction || ':' || e.id::text
     where id = ruling_id;
  end if;

  /*
   * WORD FOR WORD, TO BOTH. An operator's reasons summarised for one party
   * and quoted to the other is how a decision becomes an argument, and the
   * party who got the summary is always the one who lost.
   */
  perform private.notify(
    e.payer_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);
  perform private.notify(
    e.payee_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);

  return outcome || jsonb_build_object('ruling_id', ruling_id);
end;
$function$;

-- 6. Reversal.
CREATE OR REPLACE FUNCTION private.escrow_guard_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  /*
   * auth.uid() FIRST, BECAUSE A SIGNED-IN ACTOR IS THE BEST ANSWER. Then the
   * columns the doors themselves write, because every escrow write runs as the
   * service role through a server action and auth.uid() is null there. Before
   * this line every escrow transition in the audit log recorded its actor as
   * nobody.
   */
  actor uuid := coalesce(
    auth.uid(),
    case new.state
      when 'RELEASE_REQUESTED' then new.release_requested_by
      when 'DISPUTED' then new.disputed_by
      when 'RESOLVED' then new.resolved_by
      when 'CANCELLED' then new.resolved_by
      else null
    end,
    new.resolved_by,
    new.disputed_by,
    new.release_requested_by
  );
  /* ESC-07. RESOLVED -> DISPUTED is legal only inside escrow_reverse_ruling,
     which sets this for its own transaction. */
  -- Honoured from any transaction that sets it, like pots.moving: no
  -- API-callable function may ever set a caller-chosen setting.
  reversing boolean := coalesce(current_setting('vallo.escrow_reversal', true), '') = 'on';
begin
  if new.state is distinct from old.state then
    if not (private.escrow_transition_is_legal(old.state, new.state)
            or (reversing and old.state = 'RESOLVED' and new.state = 'DISPUTED')) then
      raise exception
        'escrow % cannot go from % to %', old.id, old.state, new.state
        using errcode = 'check_violation';
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'escrow.' || lower(new.state::text),
      'escrow',
      new.id::text,
      jsonb_build_object(
        'from', old.state,
        'to', new.state,
        'amount_minor', new.amount_minor,
        'purpose', new.purpose,
        'payer_id', new.payer_id,
        'payee_id', new.payee_id,
        'listing_id', new.listing_id,
        'dispute_reason', new.dispute_reason,
        'resolution_note', new.resolution_note,
        'resolved_by', new.resolved_by,
        'commission_minor', new.commission_minor,
        'actor_source', case when auth.uid() is not null then 'session' else 'row' end,
        'reversal', reversing
      )
    );
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.escrow_reverse_ruling(p_ruling uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  r public.escrow_rulings;
  e public.escrows;
  why text := btrim(coalesce(p_note, ''));
  credit public.wallet_entries;
  credited_user uuid;
  credited_wallet uuid;
  spendable bigint;
  removed_commission jsonb;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if char_length(why) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into r from public.escrow_rulings where id = p_ruling for update;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.state <> 'applied' then
    return jsonb_build_object('status', 'not_applied', 'state', r.state);
  end if;
  if actor = r.proposed_by or actor is not distinct from r.approved_by then
    return jsonb_build_object('status', 'needs_a_different_super_admin');
  end if;

  select * into e from public.escrows where id = r.escrow_id for update;
  if actor in (e.payer_id, e.payee_id) then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if e.state <> 'RESOLVED' then
    return jsonb_build_object('status', 'not_resolved', 'state', e.state);
  end if;

  select * into credit from public.wallet_entries
   where reference = r.settlement_reference and status = 'COMPLETED'
   for update;
  if credit.id is null then
    return jsonb_build_object('status', 'settlement_missing');
  end if;

  select w.user_id into credited_user from public.wallets w where w.id = credit.wallet_id;
  credited_wallet := private.wallet_for_update(credited_user);
  spendable := private.wallet_spendable_locked(credited_wallet);
  if spendable < credit.amount_minor then
    -- No correction overdraws a wallet. The desk recovers the money first, and
    -- the refusal is on the desk so the waiting reversal is not forgotten.
    if not exists (select 1 from public.risk_alerts a
                    where a.entity_type = 'escrow' and a.entity_id = e.id::text and a.status = 'open'
                      and a.title = 'A ruling reversal is waiting for money to be recovered') then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A ruling reversal is waiting for money to be recovered',
              format('Reversing ruling %s on escrow %s needs %s kobo back from the person it paid, who has %s spendable. '
                     || 'Recover it, then reverse again. Asked by %s: %s',
                     r.id, e.id, credit.amount_minor, spendable, actor, why),
              'escrow', e.id::text);
    end if;
    return jsonb_build_object('status', 'shortfall', 'spendable_minor', spendable,
                              'needed_minor', credit.amount_minor);
  end if;

  -- The settlement stops counting, and its reference is freed for the next
  -- ruling. The flag also tells the ledger guard (MON-10) this one correction
  -- of a COMPLETED entry is sanctioned.
  perform set_config('vallo.escrow_reversal', 'on', true);
  update public.wallet_entries
     set status = 'REVERSED',
         reference = credit.reference || ':reversed:' || r.id::text,
         metadata = credit.metadata || jsonb_build_object('reversed_by', actor, 'reversal_of_ruling', r.id,
                                                          'reversal_note', why)
   where id = credit.id;

  -- The commission leaves the revenue table so its reference is free for the
  -- next ruling, and its whole row is kept in the audit log.
  delete from public.platform_revenue pr
   where pr.escrow_id = e.id and pr.source = 'escrow_commission'
  returning to_jsonb(pr.*) into removed_commission;
  if removed_commission is not null then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'platform_revenue.reversed', 'escrow', e.id::text,
            jsonb_build_object('ruling_id', r.id, 'removed_row', removed_commission, 'reason', why));
  end if;

  update public.escrows
     set state = 'DISPUTED',
         resolved_at = null,
         resolved_by = null,
         resolution_note = null,
         released_at = null,
         refunded_at = null,
         commission_minor = null,
         commission_rate_id = null
   where id = e.id;
  perform set_config('vallo.escrow_reversal', '', true);

  update public.escrow_rulings
     set state = 'reversed', reversed_by = actor, reversed_at = now(), reversal_note = why
   where id = r.id;

  perform private.notify(e.payer_id, 'wallet', 'A decision on your held payment was reversed', why,
                         '/escrow/' || e.id::text);
  perform private.notify(e.payee_id, 'wallet', 'A decision on your held payment was reversed', why,
                         '/escrow/' || e.id::text);

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'DISPUTED',
                            'reversed_minor', credit.amount_minor,
                            'commission_removed_minor', coalesce((removed_commission ->> 'amount_minor')::bigint, 0));
end;
$$;
revoke all on function public.escrow_reverse_ruling(uuid, text) from public, anon;
grant execute on function public.escrow_reverse_ruling(uuid, text) to authenticated, service_role;

-- 7. I-8 reads only COMPLETED settlements.
do $$
declare
  def text := pg_get_functiondef('private.escrow_invariants_check()'::regprocedure);
  old_line constant text := '   where w.amount_minor + coalesce(e.commission_minor, 0) <> e.amount_minor;';
begin
  if position(old_line in def) = 0 then
    raise exception 'ESC-07: the I-8 line in escrow_invariants_check has changed; update this migration';
  end if;
  execute replace(def, old_line,
    '   where w.status = ''COMPLETED'' and w.amount_minor + coalesce(e.commission_minor, 0) <> e.amount_minor;');
end
$$;
