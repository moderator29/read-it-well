set local lock_timeout = '5s';

-- SCUML item 7: THRESHOLD REPORTS, ON THE SPLIT-SETTLEMENT TABLES.
--
-- Report any transaction above N5,000,000 (individual) or N10,000,000
-- (corporate) to the NFIU within seven days, with the decision approved by a
-- second member of staff (item 19), and keep it five years (item 11).
--
-- WHY THIS MIGRATION. 20260924174000, 174100 and 174200 were committed and
-- never applied: they watched the retired custody tables (escrow funding,
-- wallet deposits, transfers and withdrawals). Since 25 September 2026 Vallo
-- holds no customer money (docs/MONEY_ARCHITECTURE.md, ADR 0002): a charge is
-- split by Paystack in the same moment, the lister's share straight to their
-- own subaccount. So this file keeps the register, the lane, the two-person
-- decision, the due clock and the structuring rule exactly as 174000 to
-- 174200 left them, and replaces every custody watch with ONE observation
-- point on the live money record:
--
-- WHERE MONEY IS OBSERVED. One flow is one settled charge: a public.transactions
-- row moving to SUCCESSFUL (settle_booking_charge). A move-in charge appears in
-- public.transactions AND public.rent_payments; it is the same money, observed
-- once, on the transaction, and classed by what the booking is:
--   source 'rent_payment'  a Lagos move-in (the booking has a rent_payments row)
--   source 'booking'       a stay
-- For that one flow, each party is observed once:
--   the PAYER (the guest, or the rent payment's tenant), direction 'out', the
--     full charge, classed INDIVIDUAL by capacity (174200: a guest or tenant
--     pays in their personal capacity; the solicitor should confirm);
--   the PAYEE (transactions.payee_user_id, else the rent payment's lister,
--     else the listing's agent), direction 'in', the share that settled to
--     them (lister_share_minor, else the charge), classed by their account
--     (corporate only where staff approved it).
-- One flow raises at most ONE single event (unique on source and
-- transaction), whichever party crosses first. Structuring sums each party's
-- observations at or under their threshold over seven days, per direction.
--
-- NOT OBSERVED: refunds to the card (the reverse of a flow already seen), the
-- Guarantee reserve's contributions (Vallo's own money) and claim payouts
-- (listed in docs/COMPLIANCE_SCUML.md as a gap for the compliance lead), and
-- restaurant or hotel reservations, which carry no money on Vallo.
--
-- READ-ONLY OVER THE MONEY. The watch is an AFTER trigger that catches every
-- error, a cancel included, and turns it into a warning and a high risk alert:
-- it can never fail, delay or change a payment.
--
-- STAFF ONLY, APPEND-ONLY, FIVE YEARS. Every table: RLS on, no policy, no
-- grant to anon or authenticated; the service role may read. Staff read and
-- write through definer functions that check the role. Nothing reaches the
-- member. No row can be updated, deleted or truncated; parties are plain uuids.

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
                  where a.user_id = p_user
                    and a.type = 'business'::public.agent_type
                    and a.status = 'APPROVED'::public.agent_application_status
                    and not a.is_demo)
      or exists (select 1 from public.businesses b
                  where b.owner_id = p_user
                    and b.status::text = 'PUBLISHED'
                    and not b.is_demo
                    and b.reviewed_at is not null
                    and b.reviewer_id is not null
                    and b.reviewer_id <> b.owner_id
                    and (private.has_role(b.reviewer_id, 'admin'::public.app_role)
                         or private.has_role(b.reviewer_id, 'super_admin'::public.app_role)))
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

/* The structuring lock for one party. */
create or replace function private.aml_lock_party(p_party uuid)
returns void
language sql
security definer
set search_path to 'pg_catalog'
as $function$
  select pg_advisory_xact_lock(hashtextextended('aml-structuring:' || p_party::text, 0))
   where p_party is not null;
$function$;
revoke all on function private.aml_lock_party(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------ the tables */

create table if not exists public.aml_ledger_observations (
  id              uuid primary key default gen_random_uuid(),
  source          text not null check (source in ('booking', 'rent_payment')),
  source_id       uuid not null,
  party_id        uuid not null,
  party_role      text not null check (party_role in ('payer', 'payee')),
  party_class     text not null check (party_class in ('individual', 'corporate')),
  counterparty_id uuid,
  amount_minor    bigint not null check (amount_minor > 0),
  reference       text,
  occurred_at     timestamptz not null,
  observed_at     timestamptz not null default now(),
  direction       text not null check (direction in ('in', 'out')),
  unique (source, source_id, party_id)
);
comment on table public.aml_ledger_observations is
  'SCUML item 7. Every settled charge (public.transactions to SUCCESSFUL) the threshold monitor saw, once per party: the payer (out) and the payee (in). source_id is the transaction. Staff only, append-only, kept five years.';
comment on column public.aml_ledger_observations.direction is
  'SCUML item 7. Money leaving the party (the payer''s charge) or reaching them (the payee''s settled share). Structuring sums each apart.';
create index if not exists aml_ledger_observations_party_idx on public.aml_ledger_observations (party_id, occurred_at desc);

create table if not exists public.threshold_events (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('single', 'structuring')),
  source             text check (source in ('booking', 'rent_payment')),
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
  direction          text check (direction in ('in', 'out')),
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
  'SCUML item 7. What the compliance officer recorded: filed with the NFIU under an external (goAML) reference, or not reportable with a reason. Needs a second approver (item 19). Append-only, kept five years.';
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
comment on table public.threshold_reminders is
  'SCUML item 7. Which due-date reminders staff were sent for an event, so each goes once.';

alter table public.aml_ledger_observations enable row level security;
alter table public.threshold_events enable row level security;
alter table public.threshold_decisions enable row level security;
alter table public.threshold_approvals enable row level security;
alter table public.threshold_reminders enable row level security;

revoke all on public.aml_ledger_observations, public.threshold_events, public.threshold_decisions,
              public.threshold_approvals, public.threshold_reminders
  from public, anon, authenticated, service_role;
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

/* One settled movement for one party (as 174200, with p_class to class by
   capacity; null means the account's class). */
create or replace function private.aml_observe(
  p_source text, p_source_id uuid, p_party uuid, p_role text, p_counterparty uuid,
  p_amount bigint, p_occurred_at timestamptz, p_reference text, p_direction text, p_class text default null)
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
  if p_party is null or p_amount is null or p_amount <= 0 or p_direction not in ('in', 'out') then
    return;
  end if;
  klass := case when p_class in ('individual', 'corporate') then p_class else private.aml_party_class(p_party) end;
  threshold := private.aml_threshold_minor(klass);
  insert into public.aml_ledger_observations
    (source, source_id, party_id, party_role, party_class, counterparty_id, amount_minor, reference, occurred_at, direction)
  values (p_source, p_source_id, p_party, p_role, klass, p_counterparty, p_amount, p_reference, p_occurred_at, p_direction)
  on conflict (source, source_id, party_id) do nothing
  returning id into obs_id;
  if obs_id is null then
    return;
  end if;

  if p_amount > threshold then
    insert into public.threshold_events
      (kind, source, source_id, party_id, party_class, counterparty_id, counterparty_class,
       observation_ids, amount_minor, threshold_minor, occurred_at, due_at, direction)
    values ('single', p_source, p_source_id, p_party, klass, p_counterparty,
            case when p_counterparty is null then null else private.aml_party_class(p_counterparty) end,
            array[obs_id], p_amount, threshold, p_occurred_at, p_occurred_at + interval '7 days', p_direction)
    on conflict (source, source_id) where kind = 'single' do nothing;
    return;
  end if;

  perform private.aml_lock_party(p_party);
  if exists (select 1 from public.threshold_events e
              where e.kind = 'structuring' and e.party_id = p_party and e.direction = p_direction
                and e.occurred_at > p_occurred_at - interval '7 days') then
    return;
  end if;
  select coalesce(sum(o.amount_minor), 0), array_agg(o.id order by o.occurred_at)
    into total, ids
    from public.aml_ledger_observations o
   where o.party_id = p_party
     and o.direction = p_direction
     and o.amount_minor <= threshold
     and o.occurred_at > p_occurred_at - interval '7 days'
     and o.occurred_at <= p_occurred_at;
  if total > threshold and array_length(ids, 1) > 1 then
    insert into public.threshold_events
      (kind, source, source_id, party_id, party_class, observation_ids, amount_minor, threshold_minor, occurred_at, due_at, direction)
    values ('structuring', null, null, p_party, klass, ids, total, threshold, p_occurred_at, p_occurred_at + interval '7 days', p_direction);
  end if;
end;
$function$;
revoke all on function private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text, text, text) from public, anon, authenticated;

/* A fault is a warning in the log and a high risk alert, never an error in the payment. */
create or replace function private.aml_monitor_failed(p_what text, p_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  raise warning 'SCUML item 7 threshold monitor missed % %: %', p_what, p_id, p_error;
  begin
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'The SCUML item 7 threshold monitor missed a movement',
            format('%s %s settled but was not observed: %s. Check it against the threshold by hand.', p_what, p_id, p_error),
            'aml_threshold', p_id::text);
  exception when others then
    raise warning 'SCUML item 7 could not record the missed % % as a risk alert: %', p_what, p_id, sqlerrm;
  end;
end;
$function$;
revoke all on function private.aml_monitor_failed(text, uuid, text) from public, anon, authenticated;

/* The flow's parties, as the watch and the backfill both read them. */
create or replace function private.aml_flow_parties(p_transaction uuid)
returns table (source text, payer uuid, payee uuid, payee_amount bigint)
language sql
stable
security definer
set search_path to ''
as $function$
  select case when rp.id is not null then 'rent_payment' else 'booking' end,
         coalesce(rp.tenant_id, b.guest_id),
         coalesce(t.payee_user_id, rp.lister_id, a.user_id),
         coalesce(t.lister_share_minor, t.amount_minor)
    from public.transactions t
    join public.bookings b on b.id = t.booking_id
    left join public.rent_payments rp on rp.booking_id = b.id
    left join public.listings l on l.id = b.listing_id
    left join public.agents a on a.id = l.agent_id
   where t.id = p_transaction;
$function$;
revoke all on function private.aml_flow_parties(uuid) from public, anon, authenticated;

create or replace function private.aml_observe_charge(p_transaction uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  t public.transactions%rowtype;
  f record;
begin
  select * into t from public.transactions x where x.id = p_transaction;
  if t.id is null or t.status::text <> 'SUCCESSFUL' then
    return;
  end if;
  select * into f from private.aml_flow_parties(p_transaction);
  if f.payer is null then
    return;
  end if;
  -- Both parties' structuring locks, lower uuid first, before either is observed.
  perform private.aml_lock_party(least(f.payer, f.payee));
  perform private.aml_lock_party(greatest(f.payer, f.payee));
  -- The payer pays in their personal capacity (174200, class by capacity).
  perform private.aml_observe(f.source, t.id, f.payer, 'payer', f.payee, t.amount_minor, t.updated_at,
                              t.provider_ref, 'out', 'individual');
  if f.payee is not null and f.payee is distinct from f.payer then
    perform private.aml_observe(f.source, t.id, f.payee, 'payee', f.payer, f.payee_amount, t.updated_at,
                                t.provider_ref, 'in', null);
  end if;
end;
$function$;
revoke all on function private.aml_observe_charge(uuid) from public, anon, authenticated;

create or replace function private.aml_watch_transactions()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.status::text <> 'SUCCESSFUL' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'SUCCESSFUL' then
    return new;
  end if;
  begin
    perform private.aml_observe_charge(new.id);
  exception
    when query_canceled then
      perform private.aml_monitor_failed('Transaction', new.id, 'cancelled or timed out');
    when others then
      perform private.aml_monitor_failed('Transaction', new.id, sqlerrm);
  end;
  return new;
end;
$function$;
revoke all on function private.aml_watch_transactions() from public, anon, authenticated;

drop trigger if exists aml_threshold_watch on public.transactions;
create trigger aml_threshold_watch
  after insert or update of status on public.transactions
  for each row execute function private.aml_watch_transactions();

/* Everything settled before the monitor existed, observed once, oldest first. */
do $$
declare r record;
begin
  for r in select t.id from public.transactions t where t.status::text = 'SUCCESSFUL' order by t.updated_at loop
    perform private.aml_observe_charge(r.id);
  end loop;
end $$;

/* ------------------------------------------------------------ the register */

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

/*
 * Staff only. Open and awaiting events first (up to p_open), then closed ones
 * (up to p_closed), each by due date; `truncated` says whether either page
 * was cut; `monitor_faults` counts open risk alerts from a missed movement.
 */
create or replace function public.threshold_lane(p_open int default 300, p_closed int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  open_cap   int := greatest(1, least(coalesce(p_open, 300), 1000));
  closed_cap int := greatest(0, least(coalesce(p_closed, 100), 1000));
  open_count int;
  closed_count int;
  rows jsonb;
begin
  if not private.aml_is_staff() then
    return null;
  end if;
  with base as (
    select e.*, private.threshold_event_state(e.id) as state from public.threshold_events e
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
    from public.threshold_events e;
  return jsonb_build_object(
    'rows', rows,
    'truncated', open_count > open_cap or closed_count > closed_cap,
    'monitor_faults', (select count(*) from public.risk_alerts r
                        where r.entity_type = 'aml_threshold' and r.status::text = 'open'));
end;
$function$;
revoke all on function public.threshold_lane(int, int) from public, anon;
grant execute on function public.threshold_lane(int, int) to authenticated;

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
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'threshold.decided', 'threshold_event', ev.id::text,
          jsonb_build_object('scuml_item', 7, 'decision', p_decision));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.decide_threshold_event(uuid, text, text, date, text) from public, anon;
grant execute on function public.decide_threshold_event(uuid, text, text, date, text) to authenticated;

/* A second member of staff approves or rejects the latest decision. Never the decider. */
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
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'threshold.' || p_verdict, 'threshold_event', d.event_id::text,
          jsonb_build_object('scuml_item', 7, 'decision_id', d.id));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.approve_threshold_decision(uuid, text, text) from public, anon;
grant execute on function public.approve_threshold_decision(uuid, text, text) to authenticated;

/* ------------------------------------------------------------ the due clock */

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

select cron.unschedule(j.jobname) from cron.job j where j.jobname = 'vallo_threshold_reminders';
select cron.schedule('vallo_threshold_reminders', '5 * * * *', 'select private.threshold_reminders_due();');

/* ------------------------------------------------------------ read-back */

do $readback$
declare
  bad text := '';
  t text;
begin
  foreach t in array array['aml_ledger_observations', 'threshold_events', 'threshold_decisions',
                           'threshold_approvals', 'threshold_reminders'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      bad := bad || format(' [%s has RLS off]', t);
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('service_role', 'public.' || t, 'INSERT, UPDATE, DELETE') then
      bad := bad || format(' [%s is writable or readable by the wrong role]', t);
    end if;
  end loop;
  if has_function_privilege('anon', 'public.threshold_lane(int, int)', 'EXECUTE') then bad := bad || ' [anon reads the lane]'; end if;
  if has_function_privilege('authenticated', 'private.threshold_reminders_due()', 'EXECUTE') then bad := bad || ' [a member runs the clock]'; end if;
  if not exists (select 1 from pg_trigger where tgname = 'aml_threshold_watch' and tgrelid = 'public.transactions'::regclass) then
    bad := bad || ' [the watch is not on public.transactions]';
  end if;
  if exists (select 1 from pg_trigger tr join pg_class c on c.oid = tr.tgrelid
              where tr.tgname = 'aml_threshold_watch' and c.relname <> 'transactions') then
    bad := bad || ' [the watch sits on something other than public.transactions]';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_threshold_reminders') then
    bad := bad || ' [the reminder job is not scheduled]';
  end if;
  if bad <> '' then raise exception 'SCUML item 7 READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* --------------------------------------------------------------- probe */

-- Rolled back. A stay charge of N6,000,000 settles: the payer is observed
-- (out, individual) and the payee (in); ONE single event is raised for the
-- flow. Two N3,000,000 charges in a week raise a structuring event for the
-- payer. A move-in charge (a booking with a rent payment) is classed
-- 'rent_payment' and observed once. Staff read the lane; one records the
-- goAML reference, the same person cannot approve it, a second one does and
-- it closes; a member reads nothing.
do $probe$
declare
  v_guest uuid := gen_random_uuid();
  v_lister uuid := gen_random_uuid();
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_agent uuid;
  v_listing uuid;
  v_booking uuid;
  v_booking2 uuid;
  v_request uuid;
  v_tx1 uuid;
  v_tx2 uuid;
  v_tx3 uuid;
  v_tx4 uuid;
  v_event uuid;
  v_decision uuid;
  v_lane jsonb;
  v_ans jsonb;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_obs_before bigint;
  v_events_before bigint;
begin
  select count(*) into v_obs_before from public.aml_ledger_observations;
  select count(*) into v_events_before from public.threshold_events;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml7-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_guest, 'guest'), (v_lister, 'lister'), (v_s1, 'staff1'), (v_s2, 'staff2')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_s1, 'admin'), (v_s2, 'admin');
    insert into public.agents (user_id, display_name, role) values (v_lister, 'Probe Owner', 'owner') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo, rate_minor, rate_period)
    values (v_agent, 'SCUML 7 probe shortlet', 'shortlet', 'owner', 'DRAFT', false, 600000000, 'night')
    returning id into v_listing;
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing;
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 2, v_today + 3, 1, 0, 0, 0)
    returning id into v_booking;

    -- 1. One N6,000,000 stay charge settles, split to the lister.
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status,
                                     payee_user_id, lister_share_minor, guarantee_minor, commission_minor)
    values (v_booking, 'paystack', 'scuml7-probe-' || gen_random_uuid(), 600000000, 'NGN', 'PENDING',
            v_lister, 591000000, 9000000, 0)
    returning id into v_tx1;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx1;
    if (select count(*) from public.aml_ledger_observations where source_id = v_tx1) <> 2 then
      raise exception 'PROBE FAILED: the flow was not observed once per party';
    end if;
    if not exists (select 1 from public.aml_ledger_observations
                    where source_id = v_tx1 and party_id = v_guest and direction = 'out'
                      and party_class = 'individual' and amount_minor = 600000000 and source = 'booking')
       or not exists (select 1 from public.aml_ledger_observations
                       where source_id = v_tx1 and party_id = v_lister and direction = 'in' and amount_minor = 591000000) then
      raise exception 'PROBE FAILED: the observations are not the payer out and the payee in';
    end if;
    if (select count(*) from public.threshold_events where kind = 'single' and source_id = v_tx1) <> 1 then
      raise exception 'PROBE FAILED: not exactly one single event for the flow';
    end if;
    select id into v_event from public.threshold_events where kind = 'single' and source_id = v_tx1;
    if (select due_at - occurred_at from public.threshold_events where id = v_event) <> interval '7 days' then
      raise exception 'PROBE FAILED: the event is not due seven days after it occurred';
    end if;
    -- A second status write does not observe the same flow again.
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx1;
    if (select count(*) from public.aml_ledger_observations where source_id = v_tx1) <> 2 then
      raise exception 'PROBE FAILED: the flow was observed twice';
    end if;

    -- 2. Structuring: two N3,000,000 charges within the week, on two more
    --    stays (one successful charge per booking).
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 4, v_today + 5, 1, 0, 0, 0)
    returning id into v_booking2;
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking2, 'paystack', 'scuml7-probe-' || gen_random_uuid(), 300000000, 'NGN', 'PENDING') returning id into v_tx2;
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 6, v_today + 7, 1, 0, 0, 0)
    returning id into v_booking2;
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking2, 'paystack', 'scuml7-probe-' || gen_random_uuid(), 300000000, 'NGN', 'PENDING') returning id into v_tx3;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx2;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx3;
    if not exists (select 1 from public.threshold_events
                    where kind = 'structuring' and party_id = v_guest and direction = 'out'
                      and amount_minor = 600000000 and cardinality(observation_ids) = 2) then
      raise exception 'PROBE FAILED: two charges passing the threshold together raised no structuring event';
    end if;

    -- 3. A move-in charge is classed as a rent payment. Its approval gate and
    --    the inspection's own triggers are set aside for this fixture only.
    alter table public.inspection_requests disable trigger user;
    alter table public.rent_payments disable trigger user;
    insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
    values (v_listing, v_guest, v_lister, now()) returning id into v_request;
    perform set_config('vallo.rent_charge', 'true', true);
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
    values (v_listing, v_guest, v_today + 20, v_today + 21, 1, 700000000, 700000000, 700000000)
    returning id into v_booking2;
    perform set_config('vallo.rent_charge', '', true);
    insert into public.rent_payments (inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, total_minor)
    values (v_request, v_listing, v_guest, v_lister, v_booking2, v_today + 20, 700000000);
    alter table public.rent_payments enable trigger user;
    alter table public.inspection_requests enable trigger user;
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (v_booking2, 'paystack', 'scuml7-probe-' || gen_random_uuid(), 700000000, 'NGN', 'PENDING') returning id into v_tx4;
    update public.transactions set status = 'SUCCESSFUL' where id = v_tx4;
    perform set_config('vallo.recording_unknown_charge', '', true);
    if (select count(*) from public.aml_ledger_observations where source_id = v_tx4 and source = 'rent_payment') <> 2
       or not exists (select 1 from public.threshold_events where kind = 'single' and source = 'rent_payment' and source_id = v_tx4) then
      raise exception 'PROBE FAILED: the move-in charge was not observed once as a rent payment';
    end if;

    -- 4. The lane and the two-person decision.
    perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated')::text, true);
    if public.threshold_lane(300, 100) is not null then raise exception 'PROBE FAILED: a member read the lane'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
    v_lane := public.threshold_lane(300, 100);
    if not exists (select 1 from jsonb_array_elements(v_lane->'rows') r where (r->>'id')::uuid = v_event and r->>'state' = 'open') then
      raise exception 'PROBE FAILED: the lane does not show the open event';
    end if;
    v_ans := public.decide_threshold_event(v_event, 'reported', 'GOAML-CTR-PROBE', v_today, null);
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: decide answered %', v_ans; end if;
    select id into v_decision from public.threshold_decisions where event_id = v_event;
    v_ans := public.approve_threshold_decision(v_decision, 'approved', null);
    if v_ans->>'status' <> 'same_person' then raise exception 'PROBE FAILED: the recorder approved their own decision'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
    v_ans := public.approve_threshold_decision(v_decision, 'approved', null);
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: approve answered %', v_ans; end if;
    if private.threshold_event_state(v_event) <> 'closed' then raise exception 'PROBE FAILED: the event did not close'; end if;

    -- 5. The record is kept.
    begin
      update public.threshold_events set amount_minor = 1 where id = v_event;
      raise exception 'PROBE FAILED: an event was edited';
    exception when insufficient_privilege then null;
    end;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.aml_ledger_observations) <> v_obs_before
     or (select count(*) from public.threshold_events) <> v_events_before
     or exists (select 1 from auth.users where id in (v_guest, v_lister, v_s1, v_s2))
     or not exists (select 1 from pg_trigger where tgname = 'rent_payments_00_needs_approved_agreement' and tgenabled = 'O') then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
