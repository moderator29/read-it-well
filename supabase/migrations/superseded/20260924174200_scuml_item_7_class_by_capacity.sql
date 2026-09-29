set local lock_timeout = '5s';

-- SCUML item 7, follow-ups to 20260924174100.
--
-- CLASS BY CAPACITY. A card charge for a booking is a guest paying for a
-- stay or a move-in in their personal capacity, so it is classed individual
-- (the N5,000,000 threshold) whatever else the guest's account is. Wallet
-- movements keep the account's class. The solicitor should confirm "class by
-- capacity": that a person with an approved business account paying for their
-- own stay is reported as an individual.
--
-- EXAMPLES ARE NOT CORPORATE. An example (demo) agent account never makes its
-- owner corporate, as an example business never did.
--
-- TRANSFERS LOCK IN ORDER. A transfer observes two parties. Both parties'
-- structuring locks are taken first, in uuid order, so two transfers between
-- the same pair in opposite directions cannot deadlock.
--
-- CANCELS. The watches catch `query_canceled`, which is a statement or lock
-- timeout and also a real cancel (pg_cancel_backend, a client abort). Either
-- way the movement is recorded as a monitor fault (a warning and a high risk
-- alert) and the payment goes on; staff check the movement by hand.

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

/* The structuring lock for one party; taken again inside aml_observe, which is harmless. */
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

drop function if exists private.aml_observe(text, uuid, uuid, text, uuid, bigint, timestamptz, text, text);

/* As in 174100, with `p_class` to class by capacity; null means the account's class. */
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
    -- A guest paying for a stay or a move-in, in their personal capacity.
    perform private.aml_observe('booking', new.id, payer, 'payer', payee, new.amount_minor, new.updated_at,
                                new.provider_ref, 'in', 'individual');
  exception
    when query_canceled then
      perform private.aml_monitor_failed('Transaction', new.id, 'cancelled or timed out');
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
      -- Both parties' locks, lower uuid first, before either is observed.
      perform private.aml_lock_party(least(owner_id, recipient));
      perform private.aml_lock_party(greatest(owner_id, recipient));
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', recipient, new.amount_minor, new.created_at, new.reference, 'out');
      perform private.aml_observe('wallet', new.id, recipient, 'payee', owner_id, new.amount_minor, new.created_at, new.reference, 'in');
    elsif kind = 'withdrawal' then
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', null, new.amount_minor, new.created_at, new.reference, 'out');
    else
      perform private.aml_observe('wallet', new.id, owner_id, 'owner', null, new.amount_minor, new.created_at, new.reference, 'in');
    end if;
  exception
    when query_canceled then
      perform private.aml_monitor_failed('Wallet entry', new.id, 'cancelled or timed out');
    when others then
      perform private.aml_monitor_failed('Wallet entry', new.id, sqlerrm);
  end;
  return new;
end;
$function$;

revoke all on function private.aml_watch_transactions() from public, anon, authenticated;
revoke all on function private.aml_watch_wallet_entries() from public, anon, authenticated;
