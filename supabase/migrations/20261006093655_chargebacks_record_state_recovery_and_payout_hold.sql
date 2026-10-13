-- CHARGEBACKS (Session 2, handoff 7.8, blind spot B-06).
--
-- A chargeback is NOT a dispute. A dispute is two members disagreeing about a
-- booking, and Vallo rules. A chargeback is the card network reversing money
-- that already settled, on the direct rail usually straight to a lister's own
-- subaccount at the moment of charge. Paystack takes it back from Vallo's
-- main balance, so the exposure is Vallo's until it is recovered.
--
--  1. public.chargebacks: one row per processor dispute on a charge, with a
--     state Vallo's desk works (opened, evidence_requested,
--     evidence_submitted, won, lost) and, separately, a recovery state for
--     what is owed back by the lister once lost (none, owed, recovered,
--     written_off). The processor's own status is kept beside it, never
--     instead of it. recovered_minor is a cumulative total, never a delta.
--  2. public.chargeback_events: append-only (row update/removal and
--     statement-level truncation are refused by trigger), every transition
--     with actor, note, the recovered total and evidence deadline it set, and
--     the raw processor payload when there is one. A chargeback that has
--     events can never be removed (the FK has no cascade, on purpose).
--  3. Writes only through public.chargeback_open and public.chargeback_move,
--     which hold the legal transitions and write the event and an audit_log
--     row in the same transaction. Callers: staff with the `finance` scope,
--     or the service role (webhook intake), detected the codebase way via
--     auth.role(). No app role, service_role included, holds any privilege on
--     either table; the definers are owned by postgres.
--     Intake (chargeback_open) requires a SUCCESSFUL charge from the same
--     provider, copies its currency, refuses disputes that together exceed
--     the charge (won ones excluded), and reports a retry that disagrees with
--     the stored dispute as `conflict`, not `duplicate`.
--     Desk grid (chargeback_move): opened -> evidence_requested |
--     evidence_submitted | won | lost; evidence_requested -> evidence_submitted
--     | won | lost; evidence_submitted -> evidence_requested | won | lost;
--     won -> lost (pre-arbitration/arbitration, reason >= 12 chars, reopens
--     recovery as owed); lost -> won (reason, only while recovery is none or
--     owed with nothing yet recovered; resets recovery to none). closed_at is
--     re-stamped on every move into won or lost. A call that changes nothing
--     returns `noop` and writes nothing. evidence_due_at can be moved while
--     the dispute is undecided.
--     Recovery (only while lost): entering lost opens `owed` (an explicit
--     `none` is refused); owed -> recovered when the cumulative total reaches
--     the amount (automatic) or explicitly with a reason; owed -> written_off
--     with a reason; written_off -> owed with a reason. The total may only be
--     set while lost and owed (or on the move into lost), never decreases,
--     never exceeds the amount. When Paystack debits the subaccount itself,
--     the intake must send p_recovery = 'recovered' (or the full total).
--  4. THE PAYOUT RULE: public.lister_chargeback_hold(uuid) is true while a
--     lister has a LOST chargeback whose recovery is still owed. NOTHING
--     CALLS IT YET: the payment open path adopts it in a follow-up, and until
--     then it is a predicate the desk can read, not an enforced rule. An OPEN
--     chargeback alone will not block, because one
--     dispute must not stop a lister's business before it is decided). There
--     is no materiality floor or age limit: any owed balance holds, by design.
--     A charge with no payee_user_id cannot be held against anyone: the row is
--     flagged lister_unattributed, the intake says so, an audit row
--     `chargeback.unattributed` is written, and staff_chargebacks shows it, so
--     the desk resolves that exposure by hand.
--
-- Additive and idempotent: tables and indexes only if absent, functions via
-- create or replace, triggers via create or replace trigger. RLS on, no
-- policies. A read-back block at the end raises if anything did not land.

set local lock_timeout = '5s';

create table if not exists public.chargebacks (
  id                   uuid primary key default gen_random_uuid(),
  transaction_id       uuid not null references public.transactions(id),
  provider             text not null check (provider in ('paystack', 'payluk')),
  provider_dispute_id  text not null check (length(btrim(provider_dispute_id)) > 0),
  amount_minor         bigint not null check (amount_minor > 0),
  currency             text not null,
  state                text not null default 'opened'
                         check (state in ('opened', 'evidence_requested', 'evidence_submitted', 'won', 'lost')),
  provider_status      text,
  evidence_due_at      timestamptz,
  lister_user_id       uuid references auth.users(id),
  lister_unattributed  boolean not null default false,
  recovery_state       text not null default 'none'
                         check (recovery_state in ('none', 'owed', 'recovered', 'written_off')),
  recovered_minor      bigint not null default 0 check (recovered_minor >= 0),
  opened_at            timestamptz not null default now(),
  closed_at            timestamptz,
  recovery_closed_at   timestamptz,
  constraint chargebacks_one_per_provider_dispute unique (provider, provider_dispute_id),
  constraint chargebacks_recovery_only_when_lost check (recovery_state = 'none' or state = 'lost'),
  constraint chargebacks_recovered_within_amount check (recovered_minor <= amount_minor)
);
alter table public.chargebacks add column if not exists lister_unattributed boolean not null default false;
alter table public.chargebacks add column if not exists recovery_closed_at timestamptz;

-- No cascade on chargeback_id: a chargeback with events cannot be removed.
create table if not exists public.chargeback_events (
  id              uuid primary key default gen_random_uuid(),
  chargeback_id   uuid not null references public.chargebacks(id),
  kind            text not null default 'transition'
                    check (kind in ('opened', 'transition', 'status_only', 'refreshed')),
  from_state      text,
  to_state        text not null
                    check (to_state in ('opened', 'evidence_requested', 'evidence_submitted', 'won', 'lost')),
  recovery        text check (recovery in ('none', 'owed', 'recovered', 'written_off')),
  recovered_minor bigint,
  evidence_due_at timestamptz,
  actor_id        uuid,
  note            text,
  raw             jsonb,
  created_at      timestamptz not null default now()
);
alter table public.chargeback_events add column if not exists kind text not null default 'transition';
alter table public.chargeback_events add column if not exists recovered_minor bigint;
alter table public.chargeback_events add column if not exists evidence_due_at timestamptz;

create index if not exists chargeback_events_by_chargeback on public.chargeback_events (chargeback_id, created_at);
create index if not exists chargebacks_by_lister on public.chargebacks (lister_user_id) where recovery_state = 'owed';
create index if not exists chargebacks_by_transaction on public.chargebacks (transaction_id);

alter table public.chargebacks enable row level security;
alter table public.chargeback_events enable row level security;
revoke all on public.chargebacks from public, anon, authenticated, service_role;
revoke all on public.chargeback_events from public, anon, authenticated, service_role;

create or replace function private.chargeback_events_append_only()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  raise exception 'chargeback rows are append-only here' using errcode = 'insufficient_privilege';
end;
$function$;
revoke all on function private.chargeback_events_append_only() from public;

create or replace trigger chargeback_events_00_append_only
  before update or delete on public.chargeback_events
  for each row execute function private.chargeback_events_append_only();
create or replace trigger chargeback_events_01_no_truncate
  before truncate on public.chargeback_events
  for each statement execute function private.chargeback_events_append_only();
create or replace trigger chargebacks_01_no_truncate
  before truncate on public.chargebacks
  for each statement execute function private.chargeback_events_append_only();

-- Who may act: the service role (the webhook intake), detected the codebase
-- way, or staff holding the finance scope.
create or replace function private.chargeback_actor_ok()
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce((select auth.role()) = 'service_role', false)
      or coalesce(private.staff_can((select auth.uid()), 'finance'), false);
$function$;
revoke all on function private.chargeback_actor_ok() from public;

create or replace function public.chargeback_open(
  p_reference text, p_provider text, p_provider_dispute_id text, p_amount_minor bigint,
  p_evidence_due_at timestamptz default null, p_provider_status text default null,
  p_note text default null, p_raw jsonb default null)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  tx      record;
  old     public.chargebacks%rowtype;
  cb      uuid;
  others  bigint;
  via     text := case when (select auth.role()) = 'service_role' then 'service_role' else 'staff' end;
begin
  if not private.chargeback_actor_ok() then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_reference is null or p_provider is null or p_provider not in ('paystack', 'payluk')
     or length(btrim(coalesce(p_provider_dispute_id, ''))) = 0 then
    return jsonb_build_object('status', 'bad_input');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  -- Lock the charge so two intakes cannot both pass the sum check.
  select t.id, t.provider, t.payee_user_id, t.amount_minor, t.currency, t.status::text as status into tx
    from public.transactions t where t.provider_ref = p_reference
    for update;
  if tx.id is null then
    return jsonb_build_object('status', 'no_such_charge');
  end if;
  if tx.provider is distinct from p_provider then
    return jsonb_build_object('status', 'provider_mismatch', 'charge_provider', tx.provider);
  end if;

  -- The same processor dispute again (a webhook retry).
  select * into old from public.chargebacks c
   where c.provider = p_provider and c.provider_dispute_id = p_provider_dispute_id
   for update;
  if old.id is not null then
    if old.transaction_id <> tx.id or old.amount_minor <> p_amount_minor then
      return jsonb_build_object('status', 'conflict', 'chargeback_id', old.id,
                                'stored_amount_minor', old.amount_minor,
                                'same_charge', old.transaction_id = tx.id);
    end if;
    if (p_provider_status is not null and p_provider_status is distinct from old.provider_status)
       or (p_evidence_due_at is not null and p_evidence_due_at is distinct from old.evidence_due_at
           and old.state in ('opened', 'evidence_requested', 'evidence_submitted')) then
      update public.chargebacks
         set provider_status = coalesce(p_provider_status, provider_status),
             evidence_due_at = case when state in ('opened', 'evidence_requested', 'evidence_submitted')
                                    then coalesce(p_evidence_due_at, evidence_due_at) else evidence_due_at end
       where id = old.id;
      insert into public.chargeback_events (chargeback_id, kind, from_state, to_state, recovery, evidence_due_at, actor_id, note, raw)
      values (old.id, 'refreshed', old.state, old.state, old.recovery_state, p_evidence_due_at, auth.uid(), p_note, p_raw);
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'chargeback.refreshed', 'chargeback', old.id::text,
              jsonb_build_object('provider_status', p_provider_status, 'evidence_due_at', p_evidence_due_at, 'via', via));
    end if;
    return jsonb_build_object('status', 'duplicate', 'chargeback_id', old.id);
  end if;

  if tx.status <> 'SUCCESSFUL' then
    return jsonb_build_object('status', 'not_settled', 'charge_status', tx.status);
  end if;
  if p_amount_minor > tx.amount_minor then
    return jsonb_build_object('status', 'bad_amount', 'charge_minor', tx.amount_minor);
  end if;
  select coalesce(sum(c.amount_minor), 0) into others
    from public.chargebacks c where c.transaction_id = tx.id and c.state <> 'won';
  if others + p_amount_minor > tx.amount_minor then
    return jsonb_build_object('status', 'over_charge', 'charge_minor', tx.amount_minor, 'already_disputed_minor', others);
  end if;

  insert into public.chargebacks (transaction_id, provider, provider_dispute_id, amount_minor, currency, provider_status,
                                  evidence_due_at, lister_user_id, lister_unattributed)
  values (tx.id, p_provider, p_provider_dispute_id, p_amount_minor, tx.currency, p_provider_status,
          p_evidence_due_at, tx.payee_user_id, tx.payee_user_id is null)
  on conflict (provider, provider_dispute_id) do nothing
  returning id into cb;
  if cb is null then
    -- Lost a race with a concurrent intake of the same dispute.
    select c.id into cb from public.chargebacks c where c.provider = p_provider and c.provider_dispute_id = p_provider_dispute_id;
    return jsonb_build_object('status', 'duplicate', 'chargeback_id', cb);
  end if;

  insert into public.chargeback_events (chargeback_id, kind, from_state, to_state, recovery, evidence_due_at, actor_id, note, raw)
  values (cb, 'opened', null, 'opened', 'none', p_evidence_due_at, auth.uid(), p_note, p_raw);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'chargeback.opened', 'chargeback', cb::text,
          jsonb_build_object('reference', p_reference, 'amount_minor', p_amount_minor, 'provider', p_provider,
                             'currency', tx.currency, 'via', via));
  if tx.payee_user_id is null then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'chargeback.unattributed', 'chargeback', cb::text,
            jsonb_build_object('reference', p_reference, 'risk', 'no payee on the charge; payout hold cannot apply', 'via', via));
  end if;
  return jsonb_build_object('status', 'ok', 'chargeback_id', cb, 'unattributed', tx.payee_user_id is null);
end;
$function$;

-- p_recovered_total_minor is the CUMULATIVE amount recovered so far, not a delta.
create or replace function public.chargeback_move(
  p_chargeback uuid, p_to_state text default null, p_recovery text default null,
  p_recovered_total_minor bigint default null, p_provider_status text default null,
  p_note text default null, p_raw jsonb default null, p_evidence_due_at timestamptz default null)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  cb       public.chargebacks%rowtype;
  nxt      text;
  rec      text;
  total    bigint;
  reasoned boolean := length(btrim(coalesce(p_note, ''))) >= 12;
  via      text := case when (select auth.role()) = 'service_role' then 'service_role' else 'staff' end;
  kind     text;
begin
  if not private.chargeback_actor_ok() then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_chargeback is null then
    return jsonb_build_object('status', 'gone');
  end if;
  if (p_to_state is not null and p_to_state not in ('opened', 'evidence_requested', 'evidence_submitted', 'won', 'lost'))
     or (p_recovery is not null and p_recovery not in ('none', 'owed', 'recovered', 'written_off')) then
    return jsonb_build_object('status', 'bad_input');
  end if;
  select * into cb from public.chargebacks where id = p_chargeback for update;
  if cb.id is null then
    return jsonb_build_object('status', 'gone');
  end if;
  nxt := coalesce(p_to_state, cb.state);
  rec := coalesce(p_recovery, cb.recovery_state);
  total := coalesce(p_recovered_total_minor, cb.recovered_minor);

  -- Desk grid.
  if nxt <> cb.state then
    if not (
         (cb.state = 'opened' and nxt in ('evidence_requested', 'evidence_submitted', 'won', 'lost'))
      or (cb.state = 'evidence_requested' and nxt in ('evidence_submitted', 'won', 'lost'))
      or (cb.state = 'evidence_submitted' and nxt in ('evidence_requested', 'won', 'lost'))
      or (cb.state = 'won' and nxt = 'lost')
      or (cb.state = 'lost' and nxt = 'won')
    ) then
      return jsonb_build_object('status', 'illegal', 'from', cb.state, 'to', nxt);
    end if;
    if cb.state in ('won', 'lost') and not reasoned then
      return jsonb_build_object('status', 'reason_needed');
    end if;
  end if;

  -- Recovery.
  if nxt = 'lost' and cb.state <> 'lost' then
    -- Entering lost (including won -> lost) opens recovery.
    if p_recovery is null then
      rec := 'owed';
    elsif p_recovery not in ('owed', 'recovered') then
      return jsonb_build_object('status', 'illegal_recovery', 'from', cb.recovery_state, 'to', p_recovery);
    end if;
  elsif nxt = 'won' and cb.state = 'lost' then
    if cb.recovery_state not in ('none', 'owed') or cb.recovered_minor > 0 then
      return jsonb_build_object('status', 'illegal', 'from', cb.state, 'to', nxt,
                                'why', 'money already recovered; refund the lister first');
    end if;
    if p_recovery is not null and p_recovery <> 'none' then
      return jsonb_build_object('status', 'illegal_recovery', 'from', cb.recovery_state, 'to', p_recovery);
    end if;
    rec := 'none';
  elsif nxt <> 'lost' then
    if rec <> 'none' then
      return jsonb_build_object('status', 'illegal_recovery', 'from', cb.recovery_state, 'to', rec);
    end if;
  elsif rec <> cb.recovery_state and not (
       (cb.recovery_state = 'owed' and rec in ('recovered', 'written_off'))
    or (cb.recovery_state = 'written_off' and rec = 'owed')
  ) then
    return jsonb_build_object('status', 'illegal_recovery', 'from', cb.recovery_state, 'to', rec);
  end if;

  -- Recovered total: only while lost and owed (or on the move into lost),
  -- never down, never above the amount.
  if p_recovered_total_minor is not null then
    if nxt <> 'lost' or not (cb.recovery_state = 'owed' or (cb.state <> 'lost' and cb.recovery_state = 'none')) then
      return jsonb_build_object('status', 'recovery_not_open');
    end if;
    if p_recovered_total_minor < cb.recovered_minor or p_recovered_total_minor > cb.amount_minor then
      return jsonb_build_object('status', 'bad_recovered', 'have', cb.recovered_minor, 'amount', cb.amount_minor);
    end if;
    if rec = 'owed' and p_recovery is null and p_recovered_total_minor = cb.amount_minor then
      rec := 'recovered';
    end if;
  end if;
  if rec = 'recovered' and rec <> cb.recovery_state and total < cb.amount_minor and not reasoned then
    return jsonb_build_object('status', 'recovered_must_be_full', 'have', total, 'amount', cb.amount_minor);
  end if;
  if rec <> cb.recovery_state and (rec = 'written_off' or (cb.recovery_state = 'written_off' and rec = 'owed'))
     and not reasoned then
    return jsonb_build_object('status', 'reason_needed');
  end if;
  if p_evidence_due_at is not null and nxt not in ('opened', 'evidence_requested', 'evidence_submitted') then
    return jsonb_build_object('status', 'evidence_closed');
  end if;

  if nxt = cb.state and rec = cb.recovery_state and total = cb.recovered_minor
     and (p_provider_status is null or p_provider_status = cb.provider_status)
     and (p_evidence_due_at is null or p_evidence_due_at = cb.evidence_due_at) then
    return jsonb_build_object('status', 'noop', 'state', cb.state, 'recovery', cb.recovery_state);
  end if;
  kind := case when nxt = cb.state and rec = cb.recovery_state and total = cb.recovered_minor
                    and (p_evidence_due_at is null or p_evidence_due_at = cb.evidence_due_at)
               then 'status_only' else 'transition' end;

  update public.chargebacks
     set state = nxt,
         recovery_state = rec,
         recovered_minor = case when nxt = 'won' then 0 else total end,
         provider_status = coalesce(p_provider_status, provider_status),
         evidence_due_at = coalesce(p_evidence_due_at, evidence_due_at),
         closed_at = case when nxt in ('won', 'lost') and nxt <> cb.state then now()
                          when nxt in ('won', 'lost') then closed_at
                          else null end,
         recovery_closed_at = case when rec in ('recovered', 'written_off') and rec <> cb.recovery_state then now()
                                   when rec in ('recovered', 'written_off') then recovery_closed_at
                                   else null end
   where id = cb.id;

  insert into public.chargeback_events (chargeback_id, kind, from_state, to_state, recovery, recovered_minor,
                                        evidence_due_at, actor_id, note, raw)
  values (cb.id, kind, cb.state, nxt, rec,
          case when total <> cb.recovered_minor then total end,
          p_evidence_due_at, auth.uid(), p_note, p_raw);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'chargeback.moved', 'chargeback', cb.id::text,
          jsonb_build_object('from', cb.state, 'to', nxt, 'recovery_from', cb.recovery_state, 'recovery_to', rec,
                             'recovered_from', cb.recovered_minor, 'recovered_to', case when nxt = 'won' then 0 else total end,
                             'evidence_due_at', p_evidence_due_at, 'provider_status', p_provider_status,
                             'kind', kind, 'via', via));
  return jsonb_build_object('status', 'ok', 'state', nxt, 'recovery', rec,
                            'recovered_minor', case when nxt = 'won' then 0 else total end);
end;
$function$;

-- THE PAYOUT RULE.
create or replace function public.lister_chargeback_hold(p_lister uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (select 1 from public.chargebacks c
                  where c.lister_user_id = p_lister and c.state = 'lost' and c.recovery_state = 'owed');
$function$;

-- The finance desk's read.
create or replace function public.staff_chargebacks()
returns table (id uuid, reference text, transaction_id uuid, provider text, provider_dispute_id text,
               amount_minor bigint, currency text, state text, provider_status text,
               evidence_due_at timestamptz, lister_user_id uuid, lister_unattributed boolean, recovery_state text,
               recovered_minor bigint, opened_at timestamptz, closed_at timestamptz, recovery_closed_at timestamptz)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not coalesce(private.staff_can(auth.uid(), 'finance'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return query
    select c.id, t.provider_ref, c.transaction_id, c.provider, c.provider_dispute_id,
           c.amount_minor, c.currency, c.state, c.provider_status, c.evidence_due_at,
           c.lister_user_id, c.lister_unattributed, c.recovery_state, c.recovered_minor,
           c.opened_at, c.closed_at, c.recovery_closed_at
      from public.chargebacks c join public.transactions t on t.id = c.transaction_id
     order by (c.state in ('won', 'lost') and c.recovery_state <> 'owed'), c.evidence_due_at nulls last, c.opened_at desc;
end;
$function$;

revoke all on function public.chargeback_open(text, text, text, bigint, timestamptz, text, text, jsonb) from public, anon;
revoke all on function public.chargeback_move(uuid, text, text, bigint, text, text, jsonb, timestamptz) from public, anon;
revoke all on function public.lister_chargeback_hold(uuid) from public, anon, authenticated;
revoke all on function public.staff_chargebacks() from public, anon;
grant execute on function public.chargeback_open(text, text, text, bigint, timestamptz, text, text, jsonb) to authenticated, service_role;
grant execute on function public.chargeback_move(uuid, text, text, bigint, text, text, jsonb, timestamptz) to authenticated, service_role;
grant execute on function public.lister_chargeback_hold(uuid) to service_role;
grant execute on function public.staff_chargebacks() to authenticated;

do $check$
declare
  t text;
begin
  if to_regclass('public.chargebacks') is null or to_regclass('public.chargeback_events') is null then
    raise exception 'chargeback tables missing';
  end if;
  if to_regclass('public.chargebacks_by_transaction') is null then
    raise exception 'chargebacks_by_transaction index missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.chargebacks'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.chargeback_events'::regclass) then
    raise exception 'chargeback tables lack RLS';
  end if;
  -- No app role may hold ANY privilege on either table (service_role included).
  foreach t in array array['public.chargebacks', 'public.chargeback_events'] loop
    if exists (select 1 from pg_class c, aclexplode(c.relacl) a
                where c.oid = t::regclass
                  and a.grantee in (0, 'anon'::regrole::oid, 'authenticated'::regrole::oid, 'service_role'::regrole::oid)) then
      raise exception 'an app role still holds privileges on %', t;
    end if;
  end loop;
  if (select count(*) from pg_trigger
       where not tgisinternal
         and ((tgrelid = 'public.chargeback_events'::regclass
               and tgname in ('chargeback_events_00_append_only', 'chargeback_events_01_no_truncate'))
           or (tgrelid = 'public.chargebacks'::regclass and tgname = 'chargebacks_01_no_truncate'))) <> 3 then
    raise exception 'append-only or no-truncate trigger missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chargeback_events'
                  and column_name = 'recovered_minor')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chargebacks'
                  and column_name = 'lister_unattributed') then
    raise exception 'chargeback columns missing';
  end if;
  if has_function_privilege('anon', 'public.chargeback_open(text, text, text, bigint, timestamptz, text, text, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.chargeback_move(uuid, text, text, bigint, text, text, jsonb, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.staff_chargebacks()', 'execute')
     or has_function_privilege('anon', 'public.lister_chargeback_hold(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.lister_chargeback_hold(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.chargeback_actor_ok()', 'execute')
     or has_function_privilege('anon', 'private.chargeback_actor_ok()', 'execute') then
    raise exception 'chargeback function grants are too wide';
  end if;
  if not has_function_privilege('service_role', 'public.chargeback_open(text, text, text, bigint, timestamptz, text, text, jsonb)', 'execute')
     or not has_function_privilege('service_role', 'public.chargeback_move(uuid, text, text, bigint, text, text, jsonb, timestamptz)', 'execute')
     or not has_function_privilege('service_role', 'public.lister_chargeback_hold(uuid)', 'execute') then
    raise exception 'service_role lost its chargeback entry points';
  end if;
end;
$check$;
