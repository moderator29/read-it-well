-- D73 Part B, phases 11 and 12 (founder sections 15 to 17; ADR 0003): a rental
-- that has an approved agreement is paid into a protected arrangement held by
-- the licensed provider (Payluk escrow), and released to the lister when the
-- renter confirms. Standard (one release) and milestone (staged releases).
-- Pending: NOT applied. Apply AFTER b6_member_money_rail.sql (it reads
-- financial_provider_accounts). The lead reviews it, applies it through the
-- MCP, and commits it under the version the server stamps.
-- Its probe is supabase/tests/probes-pending/d73b-provider-arrangements.sql.
--
-- The provider holds the money. Every row here is Vallo's RECORD of an
-- arrangement the provider holds: the provider's id and status are stored as
-- the provider said them (section 54: provider state is not Vallo state), and
-- no column is a balance Vallo owes. Names follow the custody naming guard
-- (no wallet, escrow or pot as a whole word; nothing starts held_payment).
--
-- Behind the switch `rentals_protected_pay`, seeded OFF (a missing row reads
-- off), and in the app behind PAYLUK_ESCROW_FLOWS_BUILT as well.
--
-- WHAT THIS ADDS
--  1. public.provider_arrangements: one per approved rent agreement (one live
--     at a time). Vallo's reference is made here, before any provider call, and
--     is written into the provider record's description so an unanswered
--     create can be found again by reading back, never by creating twice.
--  2. public.provider_arrangement_milestones: the staged releases of a
--     milestone arrangement; amounts in kobo summing to the agreement amount.
--  3. public.provider_arrangement_events: append only; every transition, and
--     every refused one, with its source, the provider's words and the time
--     Vallo observed it.
--  4. public.provider_arrangement_open(): service_role only. Checks the switch,
--     the agreement (rent, approved), the provider minimum, both parties'
--     provider customer records, and the milestones; returns the existing live
--     arrangement instead of making a second.
--  5. public.provider_arrangement_observe(): service_role only, the one writer
--     of status. Locked, legal transitions only, idempotent on a repeated
--     observation, refuses a provider id or an amount that contradicts the
--     record.
--
-- Vallo states (section 16): preparing, unknown, failed, awaiting_payment,
-- payment_processing, protected, release_requested, released, disputed,
-- refunded, split, cancelled. The twin is lib/money/arrangement-states.ts.

-- 0. The switch. --------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('rentals_protected_pay', false,
        'D73 Part B: an approved rental is paid into a protected arrangement held by the licensed provider, released when the renter confirms. Off until reviewed and switched on.')
on conflict (key) do nothing;

create or replace function private.rentals_protected_pay_on()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'rentals_protected_pay'), false);
$$;
revoke all on function private.rentals_protected_pay_on() from public, anon, authenticated;

-- 1. ---------------------------------------------------------------------------
create table public.provider_arrangements (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.deal_agreements (id) on delete restrict,
  provider text not null default 'payluk' check (provider in ('payluk')),
  kind text not null check (kind in ('standard', 'milestone')),
  -- Vallo's own reference: made before any call, the key every lookup uses.
  reference text not null unique,
  -- The provider's id and payment token, null until the provider has answered.
  provider_arrangement_id text unique,
  provider_payment_token text,
  amount_minor bigint not null check (amount_minor >= 100000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  who_pays_fee text not null check (who_pays_fee in ('buyer', 'seller', 'both')),
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  buyer_user_id uuid not null references auth.users (id) on delete restrict,
  seller_user_id uuid not null references auth.users (id) on delete restrict,
  buyer_customer_id text not null,
  seller_customer_id text not null,
  status text not null default 'preparing' check (status in (
    'preparing', 'unknown', 'failed', 'awaiting_payment', 'payment_processing', 'protected',
    'release_requested', 'released', 'disputed', 'refunded', 'split', 'cancelled')),
  status_source text not null default 'vallo'
    check (status_source in ('vallo', 'provider_response', 'provider_webhook', 'provider_readback')),
  status_observed_at timestamptz not null default now(),
  -- The provider's own words, never overwritten by Vallo's (section 54).
  provider_state text,
  provider_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_user_id <> seller_user_id)
);
-- One live arrangement per agreement.
create unique index provider_arrangements_one_live_uidx
  on public.provider_arrangements (agreement_id)
  where status not in ('failed', 'cancelled');
create index provider_arrangements_buyer_idx on public.provider_arrangements (buyer_user_id);
create index provider_arrangements_seller_idx on public.provider_arrangements (seller_user_id);
create trigger provider_arrangements_set_updated_at
  before update on public.provider_arrangements
  for each row execute function public.set_updated_at();

alter table public.provider_arrangements enable row level security;
create policy provider_arrangements_parties_read on public.provider_arrangements
  for select to authenticated using ((select auth.uid()) in (buyer_user_id, seller_user_id));
revoke all on public.provider_arrangements from anon, authenticated;
grant select on public.provider_arrangements to authenticated;

-- 2. ---------------------------------------------------------------------------
create table public.provider_arrangement_milestones (
  id uuid primary key default gen_random_uuid(),
  arrangement_id uuid not null references public.provider_arrangements (id) on delete restrict,
  position smallint not null check (position >= 1),
  title text not null check (length(btrim(title)) between 1 and 120),
  description text check (description is null or length(description) <= 500),
  amount_minor bigint not null check (amount_minor >= 100),
  provider_milestone_id text,
  status text not null default 'pending' check (status in ('pending', 'release_requested', 'released', 'refunded', 'split')),
  provider_status text,
  release_requested_at timestamptz,
  released_at timestamptz,
  unique (arrangement_id, position)
);
alter table public.provider_arrangement_milestones enable row level security;
create policy provider_arrangement_milestones_parties_read on public.provider_arrangement_milestones
  for select to authenticated using (
    exists (select 1 from public.provider_arrangements a
             where a.id = arrangement_id and (select auth.uid()) in (a.buyer_user_id, a.seller_user_id)));
revoke all on public.provider_arrangement_milestones from anon, authenticated;
grant select on public.provider_arrangement_milestones to authenticated;

-- 3. ---------------------------------------------------------------------------
create table public.provider_arrangement_events (
  id bigint generated always as identity primary key,
  arrangement_id uuid not null references public.provider_arrangements (id) on delete restrict,
  from_status text,
  to_status text not null,
  source text not null check (source in ('vallo', 'provider_response', 'provider_webhook', 'provider_readback')),
  provider_state text,
  provider_status text,
  -- provider_webhook_events.event_key when a webhook said it.
  provider_event_key text,
  refused boolean not null default false,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  observed_at timestamptz not null default now()
);
create index provider_arrangement_events_arrangement_idx on public.provider_arrangement_events (arrangement_id, id);

create or replace function private.provider_arrangement_events_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'provider_arrangement_events is append only';
end $$;
create trigger provider_arrangement_events_no_rewrite
  before update or delete on public.provider_arrangement_events
  for each row execute function private.provider_arrangement_events_append_only();
create trigger provider_arrangement_events_no_truncate
  before truncate on public.provider_arrangement_events
  for each statement execute function private.provider_arrangement_events_append_only();

alter table public.provider_arrangement_events enable row level security;
create policy provider_arrangement_events_parties_read on public.provider_arrangement_events
  for select to authenticated using (
    exists (select 1 from public.provider_arrangements a
             where a.id = arrangement_id and (select auth.uid()) in (a.buyer_user_id, a.seller_user_id)));
revoke all on public.provider_arrangement_events from anon, authenticated;
grant select on public.provider_arrangement_events to authenticated;

-- 4. Legal steps. Twin: ARRANGEMENT_STEPS in lib/money/arrangement-states.ts.
-- The provider's report is the truth, so a later provider state may arrive
-- without the ones before it (events are not ordered); nothing leaves a final
-- state.
create or replace function private.provider_arrangement_step_ok(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_from
    when 'preparing' then p_to in ('unknown', 'failed', 'awaiting_payment')
    when 'unknown' then p_to in ('failed', 'awaiting_payment', 'payment_processing', 'protected', 'disputed',
                                 'released', 'refunded', 'split', 'cancelled')
    when 'awaiting_payment' then p_to in ('payment_processing', 'protected', 'disputed', 'released', 'refunded',
                                          'split', 'cancelled')
    -- Back to awaiting_payment only when the provider refused before charging.
    when 'payment_processing' then p_to in ('awaiting_payment', 'protected', 'disputed', 'released', 'refunded', 'split')
    when 'protected' then p_to in ('release_requested', 'disputed', 'released', 'refunded', 'split')
    -- Back to protected only when the provider refused the release request.
    when 'release_requested' then p_to in ('protected', 'disputed', 'released', 'refunded', 'split')
    when 'disputed' then p_to in ('released', 'refunded', 'split')
    else false
  end
$$;
revoke all on function private.provider_arrangement_step_ok(text, text) from public, anon, authenticated;

-- 5. Open. ---------------------------------------------------------------------
-- p_milestones: [{ "title": text, "description": text?, "amount_minor": bigint }, ...]
create or replace function public.provider_arrangement_open(
  p_agreement uuid,
  p_kind text,
  p_who_pays_fee text,
  p_milestones jsonb default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ag public.deal_agreements%rowtype;
  live public.provider_arrangements%rowtype;
  buyer text;
  seller text;
  arr public.provider_arrangements%rowtype;
  m jsonb;
  pos int := 0;
  total bigint := 0;
begin
  if not private.rentals_protected_pay_on() then
    return jsonb_build_object('status', 'switched_off');
  end if;
  if p_kind not in ('standard', 'milestone') or p_who_pays_fee not in ('buyer', 'seller', 'both') then
    return jsonb_build_object('status', 'bad_request');
  end if;
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Rentals only: a fixed-price stay pays by card directly (D73 Part A).
  if ag.kind <> 'rent' or ag.status <> 'approved' then
    return jsonb_build_object('status', 'not_payable', 'kind', ag.kind, 'agreement_status', ag.status);
  end if;
  select * into live from public.provider_arrangements
   where agreement_id = ag.id and status not in ('failed', 'cancelled');
  if live.id is not null then
    -- Never a second arrangement: the caller resolves this one.
    return jsonb_build_object('status', 'exists', 'id', live.id, 'reference', live.reference,
                              'arrangement_status', live.status);
  end if;
  -- create-escrow: amounts are naira, minimum 1000 (100000 kobo).
  if ag.amount_minor < 100000 then
    return jsonb_build_object('status', 'below_provider_minimum');
  end if;
  select f.provider_customer_id into buyer from public.financial_provider_accounts f
   where f.user_id = ag.renter_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if buyer is null then
    return jsonb_build_object('status', 'buyer_not_onboarded');
  end if;
  select f.provider_customer_id into seller from public.financial_provider_accounts f
   where f.user_id = ag.owner_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if seller is null then
    return jsonb_build_object('status', 'seller_not_onboarded');
  end if;

  if p_kind = 'milestone' then
    -- create-milestone-escrow: at least 2, each at least 1 naira, summing to the amount.
    if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' or jsonb_array_length(p_milestones) < 2
       or jsonb_array_length(p_milestones) > 24 then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'count');
    end if;
    for m in select value from jsonb_array_elements(p_milestones) loop
      if jsonb_typeof(m -> 'amount_minor') <> 'number' or (m ->> 'amount_minor')::numeric <> floor((m ->> 'amount_minor')::numeric)
         or (m ->> 'amount_minor')::bigint < 100
         or length(btrim(coalesce(m ->> 'title', ''))) not between 1 and 120 then
        return jsonb_build_object('status', 'bad_milestones', 'reason', 'item');
      end if;
      total := total + (m ->> 'amount_minor')::bigint;
    end loop;
    if total <> ag.amount_minor then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'sum');
    end if;
  elsif p_milestones is not null then
    return jsonb_build_object('status', 'bad_milestones', 'reason', 'standard_has_none');
  end if;

  insert into public.provider_arrangements (agreement_id, kind, reference, amount_minor, who_pays_fee,
                                            buyer_user_id, seller_user_id, buyer_customer_id, seller_customer_id)
  values (ag.id, p_kind, 'vallo-arr-' || replace(gen_random_uuid()::text, '-', ''), ag.amount_minor, p_who_pays_fee,
          ag.renter_id, ag.owner_id, buyer, seller)
  returning * into arr;
  if p_kind = 'milestone' then
    for m in select value from jsonb_array_elements(p_milestones) loop
      pos := pos + 1;
      insert into public.provider_arrangement_milestones (arrangement_id, position, title, description, amount_minor)
      values (arr.id, pos, btrim(m ->> 'title'), nullif(btrim(coalesce(m ->> 'description', '')), ''),
              (m ->> 'amount_minor')::bigint);
    end loop;
  end if;
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  values (arr.id, null, 'preparing', 'vallo',
          jsonb_build_object('agreement_id', ag.id, 'kind', p_kind, 'amount_minor', ag.amount_minor));
  return jsonb_build_object('status', 'ok', 'id', arr.id, 'reference', arr.reference, 'amount_minor', arr.amount_minor,
                            'buyer_customer_id', buyer, 'seller_customer_id', seller);
end $$;
revoke all on function public.provider_arrangement_open(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.provider_arrangement_open(uuid, text, text, jsonb) to service_role;

-- 6. Observe. Returns: changed, same, refused, amount_mismatch, id_mismatch, not_found.
-- p_milestones: [{ "position": int, "provider_milestone_id": text, "status": text, "released_at": timestamptz? }]
create or replace function public.provider_arrangement_observe(
  p_arrangement uuid,
  p_to_status text,
  p_source text,
  p_provider_state text default null,
  p_provider_status text default null,
  p_provider_arrangement_id text default null,
  p_provider_payment_token text default null,
  p_provider_amount_minor bigint default null,
  p_provider_fee_minor bigint default null,
  p_milestones jsonb default null,
  p_provider_event_key text default null,
  p_detail jsonb default '{}'::jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  a public.provider_arrangements%rowtype;
  m jsonb;
  ms text;
  verdict text;
begin
  select * into a from public.provider_arrangements where id = p_arrangement for update;
  if not found then return 'not_found'; end if;

  -- A provider id that is not this record's is a contradiction a person reads.
  if p_provider_arrangement_id is not null and a.provider_arrangement_id is not null
     and p_provider_arrangement_id <> a.provider_arrangement_id then
    insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, provider_state,
                                                    provider_status, provider_event_key, refused, detail)
    values (a.id, a.status, a.status, p_source, p_provider_state, p_provider_status, p_provider_event_key, true,
            coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('refused', 'id_mismatch', 'reported_id', p_provider_arrangement_id));
    return 'id_mismatch';
  end if;
  -- The provider's amount (naira converted to kobo at the boundary) must be the record's.
  if p_provider_amount_minor is not null and p_provider_amount_minor <> a.amount_minor then
    insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, provider_state,
                                                    provider_status, provider_event_key, refused, detail)
    values (a.id, a.status, a.status, p_source, p_provider_state, p_provider_status, p_provider_event_key, true,
            coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('refused', 'amount_mismatch',
                                                                  'reported_amount_minor', p_provider_amount_minor));
    return 'amount_mismatch';
  end if;
  -- Vallo itself may only say it asked (a payment, a release) or that it got
  -- no answer (unknown). Every other state is the provider's to report.
  if p_source = 'vallo' and p_to_status not in ('payment_processing', 'release_requested', 'unknown') then
    return 'refused';
  end if;

  if a.status = p_to_status then
    verdict := 'same';
  elsif private.provider_arrangement_step_ok(a.status, p_to_status) then
    verdict := 'changed';
  else
    insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, provider_state,
                                                    provider_status, provider_event_key, refused, detail)
    values (a.id, a.status, a.status, p_source, p_provider_state, p_provider_status, p_provider_event_key, true,
            coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('refused_transition_to', p_to_status));
    return 'refused';
  end if;

  update public.provider_arrangements set
    status = p_to_status,
    status_source = case when verdict = 'changed' then p_source else status_source end,
    status_observed_at = now(),
    provider_state = coalesce(p_provider_state, provider_state),
    provider_status = coalesce(p_provider_status, provider_status),
    provider_arrangement_id = coalesce(provider_arrangement_id, p_provider_arrangement_id),
    provider_payment_token = coalesce(provider_payment_token, p_provider_payment_token),
    provider_fee_minor = coalesce(p_provider_fee_minor, provider_fee_minor)
  where id = a.id;

  if p_milestones is not null and jsonb_typeof(p_milestones) = 'array' then
    for m in select value from jsonb_array_elements(p_milestones) loop
      ms := lower(coalesce(m ->> 'status', ''));
      update public.provider_arrangement_milestones pm set
        provider_milestone_id = coalesce(pm.provider_milestone_id, m ->> 'provider_milestone_id'),
        provider_status = coalesce(m ->> 'status', pm.provider_status),
        -- Only forward: a released milestone is never pending again.
        status = case when ms in ('released', 'refunded', 'split') and pm.status in ('pending', 'release_requested') then ms
                      else pm.status end,
        released_at = case when ms = 'released' then coalesce(pm.released_at, (m ->> 'released_at')::timestamptz, now())
                           else pm.released_at end
      where pm.arrangement_id = a.id
        and (pm.provider_milestone_id = m ->> 'provider_milestone_id'
             or (pm.provider_milestone_id is null and pm.position = (m ->> 'position')::int));
    end loop;
  end if;

  if verdict = 'changed' then
    insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, provider_state,
                                                    provider_status, provider_event_key, detail)
    values (a.id, a.status, p_to_status, p_source, p_provider_state, p_provider_status, p_provider_event_key,
            coalesce(p_detail, '{}'::jsonb));
  end if;
  return verdict;
end $$;
revoke all on function public.provider_arrangement_observe(uuid, text, text, text, text, text, text, bigint, bigint, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.provider_arrangement_observe(uuid, text, text, text, text, text, text, bigint, bigint, jsonb, text, jsonb)
  to service_role;
