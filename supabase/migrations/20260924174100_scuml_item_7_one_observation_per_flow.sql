set local lock_timeout = '5s';

-- SCUML item 7, corrected: one observation point per flow of money, in or
-- out; corporate only where staff approved it; faults loud; the lane paged.
--
-- WHERE MONEY IS OBSERVED. Each naira is seen once coming in and once going
-- out, never twice on the way through:
--
--   IN   a card charge that settled a booking (`transactions` SUCCESSFUL with
--        provider paystack): the payer.
--   IN   a wallet deposit (COMPLETED `deposit`): the owner.
--   IN   a card charge that could not be applied and was returned to the
--        wallet (COMPLETED `refund` with reference `charge-returned:`): the
--        owner. Its `transactions` row goes to REFUNDED, not SUCCESSFUL, so
--        it is never also seen as a booking payment.
--   IN   a transfer received from another member: the recipient, from the
--        sender's `transfer_out` metadata `counterparty_user_id`.
--   OUT  a transfer sent (COMPLETED `transfer_out`): the sender.
--   OUT  a withdrawal (COMPLETED `withdrawal`): the owner.
--
-- NOT OBSERVED, because the money was already seen coming in: a booking paid
-- from the wallet (provider wallet), escrow funding and release, pots, and a
-- lister's payout into their wallet (seen when it is withdrawn or sent on).
-- A Lagos move-in is one charge, so one transaction.
--
-- THRESHOLDS AND STRUCTURING. A single observation above the party's
-- threshold is reportable. Otherwise the party's observations at or under
-- their threshold in the last seven days are summed IN THE SAME DIRECTION
-- (money in apart from money out) and a total above the threshold raises one
-- structuring event for that direction, at most one per party and direction
-- per seven days. The check runs under a per-party advisory lock so two
-- movements settling at once cannot both miss the total.
--
-- WHO IS CORPORATE. Only what staff approved: an agent account of type
-- business with status APPROVED (agents are written by staff only), or a
-- business that is PUBLISHED, not an example, and reviewed by a member of
-- staff other than its owner. A member cannot make themselves corporate by
-- creating a business row. Everybody else is an individual, on the lower
-- threshold, so a doubt reports more, not less.
--
-- FAULTS. Every watch catches its own errors, including a statement or lock
-- timeout (`query_canceled`), so a slow monitor can never abort a payment. A
-- fault raises a WARNING in the log and a high risk alert; the lane counts
-- open alerts and shows an alarm while there are any.
--
-- THE LANE. Open and awaiting events are paged apart from closed ones, open
-- first; the read says when either page was cut short.

/* ------------------------------------------------------------ who is corporate */

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
                    and a.status = 'APPROVED'::public.agent_application_status)
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

/* ------------------------------------------------------------ direction */

alter table public.aml_ledger_observations
  add column if not exists direction text check (direction in ('in', 'out'));
alter table public.threshold_events
  add column if not exists direction text check (direction in ('in', 'out'));

comment on column public.aml_ledger_observations.direction is
  'SCUML item 7. Money coming in to the party (charge, deposit, returned charge, transfer received) or going out (transfer sent, withdrawal). Structuring sums each apart.';

/* ------------------------------------------------------------ the monitor */

drop function if exists private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text);

create or replace function private.aml_observe(
  p_source text, p_source_id uuid, p_party uuid, p_role text, p_counterparty uuid,
  p_amount bigint, p_occurred_at timestamptz, p_reference text, p_direction text)
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
  klass := private.aml_party_class(p_party);
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

  -- One party's structuring check at a time.
  perform pg_advisory_xact_lock(hashtextextended('aml-structuring:' || p_party::text, 0));
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

revoke all on function private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text, text) from public, anon, authenticated;

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
  -- Only a card charge brings money in; a wallet-paid booking was seen at the deposit.
  if new.status <> 'SUCCESSFUL' or new.booking_id is null or new.provider = 'wallet' then
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
    perform private.aml_observe('booking', new.id, payer, 'payer', payee, new.amount_minor, new.updated_at, new.provider_ref, 'in');
  exception
    when query_canceled then
      perform private.aml_monitor_failed('Transaction', new.id, 'timed out');
    when others then
      perform private.aml_monitor_failed('Transaction', new.id, sqlerrm);
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
  owner_id  uuid;
  recipient uuid;
  kind      text := new.kind::text;
begin
  if new.status <> 'COMPLETED' then
    return new;
  end if;
  if not (kind in ('deposit', 'withdrawal', 'transfer_out')
          or (kind = 'refund' and coalesce(new.reference, '') like 'charge-returned:%')) then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'COMPLETED' then
    return new;
  end if;
  begin
    select w.user_id into owner_id from public.wallets w where w.id = new.wallet_id;
    if kind = 'transfer_out' then
      recipient := case when coalesce(new.metadata->>'counterparty_user_id', '') ~ '^[0-9a-fA-F-]{36}$'
                        then (new.metadata->>'counterparty_user_id')::uuid end;
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', recipient, new.amount_minor, new.created_at, new.reference, 'out');
      perform private.aml_observe('wallet', new.id, recipient, 'payee', owner_id, new.amount_minor, new.created_at, new.reference, 'in');
    elsif kind = 'withdrawal' then
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', null, new.amount_minor, new.created_at, new.reference, 'out');
    else
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', null, new.amount_minor, new.created_at, new.reference, 'in');
    end if;
  exception
    when query_canceled then
      perform private.aml_monitor_failed('Wallet entry', new.id, 'timed out');
    when others then
      perform private.aml_monitor_failed('Wallet entry', new.id, sqlerrm);
  end;
  return new;
end;
$function$;

revoke all on function private.aml_watch_transactions() from public, anon, authenticated;
revoke all on function private.aml_watch_wallet_entries() from public, anon, authenticated;

/* Escrow funding is wallet money already seen at the deposit: not watched. */
drop trigger if exists aml_threshold_watch on public.escrows;
drop function if exists private.aml_watch_escrows();

/* Everything settled before the monitor existed, observed once, oldest first,
   exactly as the live watches would have seen it. */
do $$
declare r record;
begin
  for r in
    select 'booking' as src, t.id, b.guest_id as party, a.user_id as other, t.amount_minor, t.updated_at as at,
           t.provider_ref as ref, 'charge' as what
      from public.transactions t
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
      left join public.agents a on a.id = l.agent_id
     where t.status = 'SUCCESSFUL' and t.provider <> 'wallet'
    union all
    select 'wallet', we.id, w.user_id,
           case when we.kind::text = 'transfer_out'
                 and coalesce(we.metadata->>'counterparty_user_id', '') ~ '^[0-9a-fA-F-]{36}$'
                then (we.metadata->>'counterparty_user_id')::uuid end,
           we.amount_minor, we.created_at, we.reference, we.kind::text
      from public.wallet_entries we join public.wallets w on w.id = we.wallet_id
     where we.status = 'COMPLETED'
       and (we.kind::text in ('deposit', 'withdrawal', 'transfer_out')
            or (we.kind::text = 'refund' and coalesce(we.reference, '') like 'charge-returned:%'))
     order by 6
  loop
    if r.what = 'charge' then
      perform private.aml_observe('booking', r.id, r.party, 'payer', r.other, r.amount_minor, r.at, r.ref, 'in');
    elsif r.what = 'transfer_out' then
      perform private.aml_observe('wallet', r.id, r.party, 'owner', r.other, r.amount_minor, r.at, r.ref, 'out');
      perform private.aml_observe('wallet', r.id, r.other, 'payee', r.party, r.amount_minor, r.at, r.ref, 'in');
    elsif r.what = 'withdrawal' then
      perform private.aml_observe('wallet', r.id, r.party, 'owner', null, r.amount_minor, r.at, r.ref, 'out');
    else
      perform private.aml_observe('wallet', r.id, r.party, 'owner', null, r.amount_minor, r.at, r.ref, 'in');
    end if;
  end loop;
end $$;

/* ------------------------------------------------------------ the lane, paged */

drop function if exists public.threshold_lane(int);

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
