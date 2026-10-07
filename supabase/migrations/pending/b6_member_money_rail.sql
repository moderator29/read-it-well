-- B6 the member money rail (Part B phases 4 to 10 and 15; ADR 0003).
-- Pending: NOT applied. The lead reviews it, applies it through the MCP, and
-- commits it under the version the server stamps (scripts/check-migrations.mjs).
--
-- The provider holds the money. Every row here is Vallo's RECORD of what the
-- provider said, carrying the provider's reference and the time Vallo observed
-- it (ADR 0003, consequence 1). No column is a balance Vallo owes.
--
-- Names follow the custody naming guard (private.refuse_custody_objects): no
-- table, view, function, index or trigger here contains wallet, escrow or pot
-- as a whole word, or begins held_payment. The words are free in TypeScript.
--
-- WHAT THIS ADDS
--  1. public.financial_provider_accounts: a Vallo member's customer record at a
--     provider (founder section 8). One per member per provider. Onboarding
--     state in the founder's seven words (section 9). No secret, no BVN, no
--     duplicated profile data: the provider's customer id and its status only.
--  2. public.member_funds_reported: the last balance the provider reported for
--     a member, with when it was observed. A cache for the 10-requests-a-minute
--     limit and an honest "last confirmed" when the provider cannot be reached.
--     Never computed by Vallo.
--  3. public.funds_movements: one row per deposit, withdrawal or transfer the
--     member asked for or the provider reported. The reference is Vallo's and
--     is the one sent to the provider, so it is the idempotency key. A row can
--     only be completed by the provider (webhook or read-back), never by Vallo.
--  4. public.funds_movement_events: append only history of every status change,
--     with its source and observation time.
--  5. public.provider_webhook_events: every signed delivery, raw, before it is
--     processed. Unique per provider and event key, so a redelivery is a no-op.
--  6. public.funds_movement_observe(): the one writer of status. Locked, legal
--     transitions only, idempotent on a repeated observation. service_role only.
--
-- A member reads their own rows in 1 to 4 and nothing in 5. Only service_role
-- writes anything.

-- 1. -------------------------------------------------------------------------
create table public.financial_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null check (provider in ('payluk', 'paystack', 'yellowcard')),
  provider_customer_id text,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'PENDING', 'VERIFICATION_REQUIRED', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'FAILED')),
  -- The provider's own word for the customer, never overwritten by Vallo's (section 54).
  provider_status text,
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  status_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (user_id, provider),
  -- ACTIVE, RESTRICTED and SUSPENDED are states of a customer that exists.
  constraint financial_provider_accounts_live_needs_customer
    check (status not in ('ACTIVE', 'RESTRICTED', 'SUSPENDED') or provider_customer_id is not null)
);
create unique index financial_provider_accounts_customer_uidx
  on public.financial_provider_accounts (provider, provider_customer_id)
  where provider_customer_id is not null;
create trigger financial_provider_accounts_set_updated_at
  before update on public.financial_provider_accounts
  for each row execute function public.set_updated_at();

alter table public.financial_provider_accounts enable row level security;
create policy financial_provider_accounts_read_own on public.financial_provider_accounts
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.financial_provider_accounts from anon, authenticated;
grant select on public.financial_provider_accounts to authenticated;

-- 2. -------------------------------------------------------------------------
create table public.member_funds_reported (
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null check (provider in ('payluk', 'paystack', 'yellowcard')),
  -- The provider's id for the balance record it reported.
  provider_balance_id text not null,
  available_minor bigint not null check (available_minor >= 0),
  protected_minor bigint not null check (protected_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  observed_at timestamptz not null,
  primary key (user_id, provider)
);
alter table public.member_funds_reported enable row level security;
create policy member_funds_reported_read_own on public.member_funds_reported
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.member_funds_reported from anon, authenticated;
grant select on public.member_funds_reported to authenticated;

-- 3. -------------------------------------------------------------------------
create table public.funds_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null check (provider in ('payluk', 'paystack', 'yellowcard')),
  kind text not null check (kind in ('deposit', 'withdrawal', 'transfer_out', 'transfer_in', 'other')),
  -- Vallo's reference, sent to the provider as its `reference`: the idempotency key.
  reference text not null unique check (length(reference) between 8 and 120),
  -- The key the member's screen generated when the form opened. A double tap
  -- or a replayed submit finds the same row instead of making a second one.
  client_key uuid,
  provider_transaction_id text,
  amount_minor bigint not null check (amount_minor > 0),
  -- Fees exactly as the provider returned them; null until it has.
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  vallo_fee_minor bigint not null default 0 check (vallo_fee_minor >= 0),
  vat_minor bigint not null default 0 check (vat_minor >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'preparing'
    check (status in ('preparing', 'awaiting_confirmation', 'awaiting_payment', 'processing', 'unknown',
                      'completed', 'failed', 'reversed', 'cancelled', 'under_review')),
  provider_status text,
  status_source text not null default 'vallo'
    check (status_source in ('vallo', 'provider_response', 'provider_webhook', 'provider_readback')),
  status_observed_at timestamptz not null default now(),
  -- Where the money went or came from, as the member confirmed it: bank name,
  -- the last four digits, the verified account name, or the counterparty's
  -- display name. Never a full account number.
  counterparty jsonb not null default '{}'::jsonb check (jsonb_typeof(counterparty) = 'object'),
  narration text check (narration is null or length(narration) <= 140),
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Never "completed" because Vallo said so (D50; founder section 11).
  constraint funds_movements_completed_by_provider
    check (status not in ('completed', 'reversed') or status_source in ('provider_webhook', 'provider_readback')),
  constraint funds_movements_no_full_account_number
    check (not (counterparty::text ~ '\d{10}'))
);
create unique index funds_movements_client_key_uidx on public.funds_movements (user_id, client_key) where client_key is not null;
create index funds_movements_user_recent_idx on public.funds_movements (user_id, created_at desc);
create index funds_movements_open_idx on public.funds_movements (status, status_observed_at)
  where status in ('processing', 'unknown', 'awaiting_payment', 'under_review');
create trigger funds_movements_set_updated_at
  before update on public.funds_movements
  for each row execute function public.set_updated_at();

alter table public.funds_movements enable row level security;
create policy funds_movements_read_own on public.funds_movements
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.funds_movements from anon, authenticated;
grant select on public.funds_movements to authenticated;

-- 4. -------------------------------------------------------------------------
create table public.funds_movement_events (
  id bigint generated always as identity primary key,
  movement_id uuid not null references public.funds_movements (id) on delete restrict,
  from_status text,
  to_status text not null,
  source text not null check (source in ('vallo', 'provider_response', 'provider_webhook', 'provider_readback')),
  provider_status text,
  detail jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now()
);
create index funds_movement_events_movement_idx on public.funds_movement_events (movement_id, id);

create or replace function private.funds_movement_events_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'funds_movement_events is append only';
end $$;
create trigger funds_movement_events_no_rewrite
  before update or delete on public.funds_movement_events
  for each row execute function private.funds_movement_events_append_only();
create trigger funds_movement_events_no_truncate
  before truncate on public.funds_movement_events
  for each statement execute function private.funds_movement_events_append_only();

alter table public.funds_movement_events enable row level security;
create policy funds_movement_events_read_own on public.funds_movement_events
  for select to authenticated using (
    exists (select 1 from public.funds_movements m where m.id = movement_id and m.user_id = (select auth.uid()))
  );
revoke all on public.funds_movement_events from anon, authenticated;
grant select on public.funds_movement_events to authenticated;

-- 5. -------------------------------------------------------------------------
create table public.provider_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('payluk', 'paystack', 'yellowcard')),
  -- payment.*: data.reference + event; escrow.*: data.id + event (concepts_webhooks).
  event_key text not null,
  event_type text not null,
  environment text,
  payload jsonb not null,
  signature_valid boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'duplicate', 'ignored', 'rejected', 'failed')),
  retry_count integer not null default 0 check (retry_count >= 0),
  error text,
  unique (provider, event_key)
);
alter table public.provider_webhook_events enable row level security;
revoke all on public.provider_webhook_events from anon, authenticated;

-- 6. -------------------------------------------------------------------------
create or replace function private.funds_transition_ok(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_from
    when 'preparing' then p_to in ('awaiting_confirmation', 'awaiting_payment', 'processing', 'unknown', 'failed', 'cancelled')
    when 'awaiting_confirmation' then p_to in ('processing', 'unknown', 'failed', 'cancelled', 'completed')
    when 'awaiting_payment' then p_to in ('processing', 'unknown', 'completed', 'failed', 'cancelled')
    when 'processing' then p_to in ('completed', 'failed', 'reversed', 'unknown', 'under_review')
    when 'unknown' then p_to in ('awaiting_confirmation', 'processing', 'completed', 'failed', 'reversed', 'cancelled', 'under_review')
    when 'under_review' then p_to in ('completed', 'failed', 'reversed')
    when 'completed' then p_to in ('reversed', 'under_review')
    -- A success the provider reports after a failure is a contradiction a person reads.
    when 'failed' then p_to = 'under_review'
    else false
  end
$$;

-- Returns one of: changed, same, refused, not_found.
create or replace function public.funds_movement_observe(
  p_reference text,
  p_to_status text,
  p_source text,
  p_provider_status text default null,
  p_provider_transaction_id text default null,
  p_provider_fee_minor bigint default null,
  p_detail jsonb default '{}'::jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  m public.funds_movements%rowtype;
begin
  select * into m from public.funds_movements where reference = p_reference for update;
  if not found then return 'not_found'; end if;
  if m.status = p_to_status then
    -- The same fact told twice: refresh when it was last confirmed, change nothing else.
    if p_source <> 'vallo' then
      update public.funds_movements set status_observed_at = now(),
        provider_status = coalesce(p_provider_status, provider_status)
       where id = m.id;
    end if;
    return 'same';
  end if;
  if not private.funds_transition_ok(m.status, p_to_status) then
    insert into public.funds_movement_events (movement_id, from_status, to_status, source, provider_status, detail)
    values (m.id, m.status, m.status, p_source, p_provider_status,
            coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('refused_transition_to', p_to_status));
    return 'refused';
  end if;
  update public.funds_movements set
    status = p_to_status,
    status_source = p_source,
    status_observed_at = now(),
    provider_status = coalesce(p_provider_status, provider_status),
    provider_transaction_id = coalesce(provider_transaction_id, p_provider_transaction_id),
    provider_fee_minor = coalesce(p_provider_fee_minor, provider_fee_minor)
  where id = m.id;
  insert into public.funds_movement_events (movement_id, from_status, to_status, source, provider_status, detail)
  values (m.id, m.status, p_to_status, p_source, p_provider_status, coalesce(p_detail, '{}'::jsonb));
  return 'changed';
end $$;
revoke all on function public.funds_movement_observe(text, text, text, text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.funds_movement_observe(text, text, text, text, text, bigint, jsonb) to service_role;
revoke all on function private.funds_transition_ok(text, text) from public, anon, authenticated;
