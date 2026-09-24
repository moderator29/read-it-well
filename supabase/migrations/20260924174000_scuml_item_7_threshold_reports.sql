set local lock_timeout = '5s';

-- SCUML item 7: report any transaction above N5,000,000 (individual) or
-- N10,000,000 (corporate) to the NFIU within seven days.
--
-- WHAT THIS IS. A monitor over the ledger that raises a reportable event with
-- a due date, a register of what was reported, when, by whom and under which
-- external (goAML) reference, approved by a second member of staff (SCUML
-- item 19), and a reminder to staff three days and one day before a report
-- falls due. The filing itself happens outside Vallo; the register records the
-- reference the officer enters.
--
-- READ-ONLY OVER THE MONEY. The monitor is AFTER triggers on the settled paths
-- (which paths, and in which direction, is set in 20260924174100) that only
-- write to the tables below.
-- Every trigger body catches every error and records it as a risk alert, so a
-- fault here can never raise inside settlement, block a payment or change a
-- figure. Nothing here moves money or places a hold.
--
-- WHAT IS OBSERVED, AND HOW STRUCTURING IS SUMMED, is set in 20260924174100,
-- which replaces the monitor below: one observation point per flow of money,
-- each tagged in or out, the escrow and wallet-paid bookings left out, and
-- who counts as corporate narrowed to what staff approved. Read that header.
--
-- DUE CLOCK. due_at = occurred_at + 7 days. An event is open until a decision
-- ("reported" with its external reference, or "not reportable" with a reason)
-- is approved by a DIFFERENT member of staff. A rejected decision reopens it.
--
-- STAFF ONLY, APPEND-ONLY, FIVE YEARS. Every table is born locked (RLS on, no
-- grants to anon or authenticated); staff read and write through definer
-- functions that check the role. Nothing is shown to the member, and nothing
-- about a report reaches them (no tipping off). No row can be updated or
-- deleted: references to a party are plain uuids, not foreign keys, so an
-- account deletion anonymises the person and leaves this record whole
-- (SCUML item 11). docs/RETENTION_SCHEDULE.md lists the tables: kept five
-- years from the report, never purged.

/* ------------------------------------------------------------ who is corporate */

create or replace function private.aml_is_staff()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role);
$function$;

revoke all on function private.aml_is_staff() from public, anon, authenticated;

create or replace function private.aml_party_class(p_user uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when p_user is null then 'individual'
    when exists (select 1 from public.agents a
                  where a.user_id = p_user and (a.type = 'business'::public.agent_type or a.firm_id is not null))
      or exists (select 1 from public.businesses b where b.owner_id = p_user)
      then 'corporate'
    else 'individual'
  end;
$function$;

revoke all on function private.aml_party_class(uuid) from public, anon, authenticated;

/* SCUML item 7: N5,000,000 and N10,000,000, in kobo. "Above" is strictly greater. */
create or replace function private.aml_threshold_minor(p_class text)
returns bigint
language sql
immutable
set search_path to ''
as $function$
  select case when p_class = 'corporate' then 1000000000::bigint else 500000000::bigint end;
$function$;

revoke all on function private.aml_threshold_minor(text) from public, anon, authenticated;

/* ------------------------------------------------------------ the tables */

create table if not exists public.aml_ledger_observations (
  id              uuid primary key default gen_random_uuid(),
  source          text not null check (source in ('booking', 'escrow', 'wallet')),
  source_id       uuid not null,
  party_id        uuid not null,
  party_role      text not null check (party_role in ('payer', 'payee', 'owner')),
  party_class     text not null check (party_class in ('individual', 'corporate')),
  counterparty_id uuid,
  amount_minor    bigint not null check (amount_minor > 0),
  reference       text,
  occurred_at     timestamptz not null,
  observed_at     timestamptz not null default now(),
  unique (source, source_id, party_id)
);

comment on table public.aml_ledger_observations is
  'SCUML item 7. Every settled movement the threshold monitor saw, per party. Staff only, append-only, kept five years.';

create index if not exists aml_ledger_observations_party_idx on public.aml_ledger_observations (party_id, occurred_at desc);

create table if not exists public.threshold_events (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('single', 'structuring')),
  source             text check (source in ('booking', 'escrow', 'wallet')),
  source_id          uuid,
  party_id           uuid not null,
  party_class        text not null check (party_class in ('individual', 'corporate')),
  counterparty_id    uuid,
  counterparty_class text check (counterparty_class in ('individual', 'corporate')),
  observation_ids    uuid[] not null,
  amount_minor       bigint not null check (amount_minor > 0),
  threshold_minor    bigint not null,
  occurred_at        timestamptz not null,
  due_at             timestamptz not null,
  raised_at          timestamptz not null default now(),
  check ((kind = 'single') = (source_id is not null))
);

comment on table public.threshold_events is
  'SCUML item 7. A reportable transaction (single) or run of transactions (structuring), due to the NFIU seven days after it occurred. Staff only, append-only, kept five years.';

create unique index if not exists threshold_events_single_idx on public.threshold_events (source, source_id) where kind = 'single';
create index if not exists threshold_events_due_idx on public.threshold_events (due_at);
create index if not exists threshold_events_party_idx on public.threshold_events (party_id, raised_at desc);

create table if not exists public.threshold_decisions (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.threshold_events(id) on delete restrict,
  decision           text not null check (decision in ('reported', 'not_reportable')),
  external_reference text check (external_reference is null or length(external_reference) between 1 and 120),
  reported_on        date,
  note               text check (note is null or length(note) <= 1000),
  decided_by         uuid not null,
  decided_at         timestamptz not null default now(),
  check (decision <> 'reported' or (external_reference is not null and reported_on is not null)),
  check (decision <> 'not_reportable' or note is not null)
);

comment on table public.threshold_decisions is
  'SCUML item 7. What the compliance officer recorded: filed with the NFIU under an external reference, or not reportable with a reason. Needs a second approver (SCUML item 19). Append-only, kept five years.';

create index if not exists threshold_decisions_event_idx on public.threshold_decisions (event_id, decided_at desc);

create table if not exists public.threshold_approvals (
  decision_id uuid primary key references public.threshold_decisions(id) on delete restrict,
  verdict     text not null check (verdict in ('approved', 'rejected')),
  note        text check (note is null or length(note) <= 1000),
  approved_by uuid not null,
  approved_at timestamptz not null default now()
);

comment on table public.threshold_approvals is
  'SCUML items 7 and 19. The second member of staff approving or rejecting a threshold decision; never the one who made it. Append-only, kept five years.';

create table if not exists public.threshold_reminders (
  event_id uuid not null references public.threshold_events(id) on delete restrict,
  stage    text not null check (stage in ('3d', '1d')),
  sent_at  timestamptz not null default now(),
  primary key (event_id, stage)
);

alter table public.aml_ledger_observations enable row level security;
alter table public.threshold_events enable row level security;
alter table public.threshold_decisions enable row level security;
alter table public.threshold_approvals enable row level security;
alter table public.threshold_reminders enable row level security;

revoke all on public.aml_ledger_observations, public.threshold_events, public.threshold_decisions,
              public.threshold_approvals, public.threshold_reminders
  from public, anon, authenticated;
grant select on public.aml_ledger_observations, public.threshold_events, public.threshold_decisions,
                public.threshold_approvals, public.threshold_reminders
  to service_role;

create or replace function private.aml_record_is_kept()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  raise exception 'public.% is append-only (SCUML items 7 and 11)', tg_table_name using errcode = '42501';
end;
$function$;

revoke all on function private.aml_record_is_kept() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['aml_ledger_observations', 'threshold_events', 'threshold_decisions',
                           'threshold_approvals', 'threshold_reminders'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_kept', t);
    execute format('create trigger %I before update or delete on public.%I for each row execute function private.aml_record_is_kept()', t || '_kept', t);
    execute format('drop trigger if exists %I on public.%I', t || '_kept_truncate', t);
    execute format('create trigger %I before truncate on public.%I for each statement execute function private.aml_record_is_kept()', t || '_kept_truncate', t);
  end loop;
end $$;

/* ------------------------------------------------------------ the monitor */

/*
 * One settled movement for one party. Records the observation once, raises a
 * single event when it is above that party's threshold (one event per
 * transaction, whichever side crosses first), or a structuring event when the
 * party's movements at or under their threshold in the last seven days
 * together pass it and no structuring event was raised for them in that
 * window.
 */
create or replace function private.aml_observe(
  p_source text, p_source_id uuid, p_party uuid, p_role text, p_counterparty uuid,
  p_amount bigint, p_occurred_at timestamptz, p_reference text)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  klass     text;
  threshold bigint;
  obs_id    uuid;
  total     bigint;
  ids       uuid[];
begin
  if p_party is null or p_amount is null or p_amount <= 0 then
    return;
  end if;
  klass := private.aml_party_class(p_party);
  threshold := private.aml_threshold_minor(klass);
  insert into public.aml_ledger_observations
    (source, source_id, party_id, party_role, party_class, counterparty_id, amount_minor, reference, occurred_at)
  values (p_source, p_source_id, p_party, p_role, klass, p_counterparty, p_amount, p_reference, p_occurred_at)
  on conflict (source, source_id, party_id) do nothing
  returning id into obs_id;
  if obs_id is null then
    return;
  end if;

  if p_amount > threshold then
    insert into public.threshold_events
      (kind, source, source_id, party_id, party_class, counterparty_id, counterparty_class,
       observation_ids, amount_minor, threshold_minor, occurred_at, due_at)
    values ('single', p_source, p_source_id, p_party, klass, p_counterparty,
            case when p_counterparty is null then null else private.aml_party_class(p_counterparty) end,
            array[obs_id], p_amount, threshold, p_occurred_at, p_occurred_at + interval '7 days')
    on conflict (source, source_id) where kind = 'single' do nothing;
    return;
  end if;

  if exists (select 1 from public.threshold_events e
              where e.kind = 'structuring' and e.party_id = p_party
                and e.occurred_at > p_occurred_at - interval '7 days') then
    return;
  end if;
  select coalesce(sum(o.amount_minor), 0), array_agg(o.id order by o.occurred_at)
    into total, ids
    from public.aml_ledger_observations o
   where o.party_id = p_party
     and o.amount_minor <= threshold
     and o.occurred_at > p_occurred_at - interval '7 days'
     and o.occurred_at <= p_occurred_at;
  if total > threshold and array_length(ids, 1) > 1 then
    insert into public.threshold_events
      (kind, source, source_id, party_id, party_class, observation_ids, amount_minor, threshold_minor, occurred_at, due_at)
    values ('structuring', null, null, p_party, klass, ids, total, threshold, p_occurred_at, p_occurred_at + interval '7 days');
  end if;
end;
$function$;

revoke all on function private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text) from public, anon, authenticated;

/* A fault in the monitor is a risk alert, never an error in the payment. */
create or replace function private.aml_monitor_failed(p_what text, p_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values ('high', 'open', 'The SCUML item 7 threshold monitor missed a movement',
          format('%s %s settled but was not observed: %s. Check it against the threshold by hand.', p_what, p_id, p_error),
          'aml_threshold', p_id::text);
exception when others then
  null;
end;
$function$;

revoke all on function private.aml_monitor_failed(text, uuid, text) from public, anon, authenticated;

create or replace function private.aml_watch_transactions()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  payer uuid;
  payee uuid;
begin
  if new.status <> 'SUCCESSFUL' or new.booking_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'SUCCESSFUL' then
    return new;
  end if;
  begin
    select b.guest_id, a.user_id into payer, payee
      from public.bookings b
      left join public.listings l on l.id = b.listing_id
      left join public.agents a on a.id = l.agent_id
     where b.id = new.booking_id;
    perform private.aml_observe('booking', new.id, payer, 'payer', payee, new.amount_minor, new.updated_at, new.provider_ref);
    perform private.aml_observe('booking', new.id, payee, 'payee', payer, new.amount_minor, new.updated_at, new.provider_ref);
  exception when others then
    perform private.aml_monitor_failed('Transaction', new.id, sqlerrm);
  end;
  return new;
end;
$function$;

create or replace function private.aml_watch_escrows()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.funded_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.funded_at is not null then
    return new;
  end if;
  begin
    perform private.aml_observe('escrow', new.id, new.payer_id, 'payer', new.payee_id, new.amount_minor, new.funded_at, null);
    perform private.aml_observe('escrow', new.id, new.payee_id, 'payee', new.payer_id, new.amount_minor, new.funded_at, null);
  exception when others then
    perform private.aml_monitor_failed('Escrow', new.id, sqlerrm);
  end;
  return new;
end;
$function$;

create or replace function private.aml_watch_wallet_entries()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  owner_id uuid;
  other    uuid;
begin
  if new.status <> 'COMPLETED' or new.kind::text not in ('deposit', 'withdrawal', 'transfer_out') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'COMPLETED' then
    return new;
  end if;
  begin
    select w.user_id into owner_id from public.wallets w where w.id = new.wallet_id;
    if new.kind::text = 'transfer_out' and new.reference like '%-out' then
      select w.user_id into other
        from public.wallet_entries e join public.wallets w on w.id = e.wallet_id
       where e.reference = left(new.reference, length(new.reference) - 4) || '-in'
       limit 1;
    end if;
    perform private.aml_observe('wallet', new.id, owner_id, 'owner', other, new.amount_minor, new.created_at, new.reference);
  exception when others then
    perform private.aml_monitor_failed('Wallet entry', new.id, sqlerrm);
  end;
  return new;
end;
$function$;

revoke all on function private.aml_watch_transactions() from public, anon, authenticated;
revoke all on function private.aml_watch_escrows() from public, anon, authenticated;
revoke all on function private.aml_watch_wallet_entries() from public, anon, authenticated;

drop trigger if exists aml_threshold_watch on public.transactions;
create trigger aml_threshold_watch
  after insert or update of status on public.transactions
  for each row execute function private.aml_watch_transactions();
drop trigger if exists aml_threshold_watch on public.escrows;
create trigger aml_threshold_watch
  after insert or update of funded_at on public.escrows
  for each row execute function private.aml_watch_escrows();
drop trigger if exists aml_threshold_watch on public.wallet_entries;
create trigger aml_threshold_watch
  after insert or update of status on public.wallet_entries
  for each row execute function private.aml_watch_wallet_entries();

/* The backfill of everything settled before the monitor existed is in
   20260924174100, once each movement has one observation point and a direction. */

/* ------------------------------------------------------------ the register */

/* Where an event stands: open, awaiting a second approver, or closed. */
create or replace function private.threshold_event_state(p_event uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when d.id is null then 'open'
    when a.decision_id is null then 'awaiting_approval'
    when a.verdict = 'approved' then 'closed'
    else 'open'
  end
  from (select 1) one
  left join lateral (select x.id from public.threshold_decisions x
                      where x.event_id = p_event order by x.decided_at desc limit 1) d on true
  left join public.threshold_approvals a on a.decision_id = d.id;
$function$;

revoke all on function private.threshold_event_state(uuid) from public, anon, authenticated;

/* The compliance lane: every event, newest due first among the open ones. Staff only. */
create or replace function public.threshold_lane(p_limit int default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if not private.aml_is_staff() then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by (x.state = 'closed'), x.due_at)
      from (
        select e.id, e.kind, e.source, e.source_id, e.amount_minor, e.threshold_minor,
               e.party_id, e.party_class,
               nullif(btrim(coalesce(pp.first_name, '') || ' ' || coalesce(pp.surname, '')), '') as party_name,
               e.counterparty_id, e.counterparty_class,
               nullif(btrim(coalesce(cp.first_name, '') || ' ' || coalesce(cp.surname, '')), '') as counterparty_name,
               cardinality(e.observation_ids) as movements,
               e.occurred_at, e.due_at, e.raised_at,
               private.threshold_event_state(e.id) as state,
               d.id as decision_id, d.decision, d.external_reference, d.reported_on, d.note as decision_note,
               d.decided_by, d.decided_at,
               a.verdict, a.approved_by, a.approved_at
          from public.threshold_events e
          left join public.profiles pp on pp.id = e.party_id
          left join public.profiles cp on cp.id = e.counterparty_id
          left join lateral (select x.* from public.threshold_decisions x
                              where x.event_id = e.id order by x.decided_at desc limit 1) d on true
          left join public.threshold_approvals a on a.decision_id = d.id
         order by e.due_at
         limit greatest(1, least(coalesce(p_limit, 200), 500))
      ) x
  ), '[]'::jsonb);
end;
$function$;

/* The officer records a decision on an open event. Staff only. */
create or replace function public.decide_threshold_event(
  p_event uuid, p_decision text, p_reference text default null, p_reported_on date default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  ev public.threshold_events%rowtype;
begin
  if not private.aml_is_staff() then
    return jsonb_build_object('status', 'not_staff');
  end if;
  select * into ev from public.threshold_events where id = p_event for update;
  if ev.id is null then
    return jsonb_build_object('status', 'not_found');
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
          nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()));
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* A second member of staff approves or rejects the latest decision. Staff only, never the decider. */
create or replace function public.approve_threshold_decision(p_decision uuid, p_verdict text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  d public.threshold_decisions%rowtype;
begin
  if not private.aml_is_staff() then
    return jsonb_build_object('status', 'not_staff');
  end if;
  select * into d from public.threshold_decisions where id = p_decision for update;
  if d.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if d.decided_by = (select auth.uid()) then
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
  values (d.id, p_verdict, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  on conflict (decision_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_approved');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.threshold_lane(int) from public, anon;
revoke all on function public.decide_threshold_event(uuid, text, text, date, text) from public, anon;
revoke all on function public.approve_threshold_decision(uuid, text, text) from public, anon;
grant execute on function public.threshold_lane(int) to authenticated;
grant execute on function public.decide_threshold_event(uuid, text, text, date, text) to authenticated;
grant execute on function public.approve_threshold_decision(uuid, text, text) to authenticated;

/* ------------------------------------------------------------ the due clock */

/*
 * Tells every admin and super admin, once at three days and once at one day
 * before an open event falls due. An event already past due when first seen
 * gets the one-day notice only. Returns how many notices went out.
 */
create or replace function private.threshold_reminders_due()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  sent int := 0;
  r record;
  stage text;
begin
  for r in
    select e.id, e.due_at, e.amount_minor from public.threshold_events e
     where e.due_at - now() <= interval '3 days'
       and private.threshold_event_state(e.id) <> 'closed'
  loop
    stage := case when r.due_at - now() <= interval '1 day' then '1d' else '3d' end;
    insert into public.threshold_reminders (event_id, stage) values (r.id, stage) on conflict do nothing;
    if not found then
      continue;
    end if;
    insert into public.notifications (user_id, kind, title, body, href)
    select distinct ur.user_id, 'system'::public.notification_kind,
           case when stage = '1d' then 'A threshold report is due within a day'
                else 'A threshold report is due within three days' end,
           'SCUML item 7: a transaction above the reporting threshold needs filing with the NFIU, and a second approver.',
           '/admin/compliance?tab=threshold'
      from public.user_roles ur
     where ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role);
    sent := sent + 1;
  end loop;
  return sent;
end;
$function$;

revoke all on function private.threshold_reminders_due() from public, anon, authenticated;

select cron.unschedule('vallo_threshold_reminders')
 where exists (select 1 from cron.job where jobname = 'vallo_threshold_reminders');
select cron.schedule('vallo_threshold_reminders', '5 * * * *', 'select private.threshold_reminders_due();');
