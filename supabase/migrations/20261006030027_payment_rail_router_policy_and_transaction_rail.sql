-- THE RAIL ROUTER (Session 2, 7.4; architecture 3A.3).
--
-- Two rails: ESCROW (Payluk holds, releases on confirmation) and DIRECT
-- (Paystack splits at the charge, as today). The rule underneath is the
-- accountability of the counterparty: an individual lister gets escrow, a
-- registered business gets direct settlement.
--
-- 1. public.payment_rail_policy: the routing as DATA with effective dates,
--    never a condition in code. A row is retired by setting effective_to;
--    it is never deleted or rewritten (trigger), so every past resolution can
--    be re-derived.
-- 2. public.resolve_payment_rail(...): the highest `precedence` wins, then
--    the most specific (most criteria named). Two rows tied on both that
--    disagree resolve to NULL. `precedence` exists because "every sale is
--    milestone escrow" must beat "a shortlet is escrow" and "a hotel is
--    direct": a sale is a sale whatever is being sold (review pass 1). NULL means NO
--    PAYMENT OPENS: the router fails closed, because one fallback holds money
--    that should not be held and the other releases money that should have
--    been held.
-- 3. transactions.rail and transactions.rail_policy_id: written once, never
--    altered (trigger), like the frozen quote.
--
-- NOT WIRED INTO PAYMENT OPENING YET, on purpose. Every payment today is
-- Paystack direct, and the escrow rail is switched on only by the founder
-- (ADR-0003, the escrow flag). Wiring the resolver into the open path before
-- then would either refuse every rent payment (escrow resolved, escrow off)
-- or silently fall back, which 3A.3 forbids. The open path adopts it in the
-- same change that switches escrow on. Until then `rail` stays NULL on new
-- rows (there are none today: the table is empty).
--
-- Additive and idempotent. The behavioural probe is
-- supabase/tests/probes/rail-router.sql, run by the db-probes CI job.

set local lock_timeout = '5s';

create table if not exists public.payment_rail_policy (
  id              uuid primary key default gen_random_uuid(),
  property_type   public.property_type,
  listing_intent  public.listing_intent,
  lister_kind     public.agent_type,
  rail            text not null check (rail in ('escrow', 'direct')),
  milestones      boolean not null default false,
  precedence      int not null default 0,
  effective_from  timestamptz not null default now(),
  effective_to    timestamptz,
  reason          text not null check (length(btrim(reason)) >= 12),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint payment_rail_policy_window check (effective_to is null or effective_to > effective_from),
  constraint payment_rail_policy_milestones_are_escrow check (not milestones or rail = 'escrow')
);

comment on table public.payment_rail_policy is
  'Which rail a payment opens on, by listing type, intent and lister kind, with effective dates. Highest precedence, then most specific, current row wins; a tie that disagrees resolves to no rail (fail closed). Session 2, 7.4.';

alter table public.payment_rail_policy add column if not exists precedence int not null default 0;

alter table public.payment_rail_policy enable row level security;
revoke all on public.payment_rail_policy from public, anon, authenticated;

-- History is never rewritten: only effective_to may be set, once.
create or replace function private.payment_rail_policy_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'a rail policy row is retired with effective_to, never deleted' using errcode = 'insufficient_privilege';
  end if;
  if old.effective_to is not null
     or new.property_type is distinct from old.property_type
     or new.listing_intent is distinct from old.listing_intent
     or new.lister_kind is distinct from old.lister_kind
     or new.rail is distinct from old.rail
     or new.milestones is distinct from old.milestones
     or new.precedence is distinct from old.precedence
     or new.effective_from is distinct from old.effective_from
     or new.reason is distinct from old.reason
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'a rail policy row is history: only a current row''s effective_to may be set' using errcode = 'insufficient_privilege';
  end if;
  if new.effective_to is not null and new.effective_to < now() then
    raise exception 'a rail policy row is retired from now on, never backdated' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

create or replace trigger payment_rail_policy_00_guard
  before update or delete on public.payment_rail_policy
  for each row execute function private.payment_rail_policy_guard();

-- THE RESOLVER. Only rows whose every named criterion matches are candidates.
-- Rank by precedence, then specificity (the number of criteria a row names).
create or replace function public.resolve_payment_rail(
  p_property_type public.property_type,
  p_listing_intent public.listing_intent,
  p_lister_kind public.agent_type,
  p_at timestamptz default now(),
  out rail text, out milestones boolean, out policy_id uuid)
returns record
language plpgsql
stable
set search_path to ''
as $function$
declare
  n_answers int;
begin
  with candidates as (
    select p.id, p.rail, p.milestones, p.precedence, p.effective_from,
           (p.property_type is not null)::int + (p.listing_intent is not null)::int + (p.lister_kind is not null)::int as spec
      from public.payment_rail_policy p
     where p.effective_from <= p_at
       and (p.effective_to is null or p.effective_to > p_at)
       and (p.property_type is null or p.property_type = p_property_type)
       and (p.listing_intent is null or p.listing_intent = p_listing_intent)
       and (p.lister_kind is null or p.lister_kind = p_lister_kind)
  ), top as (
    select c.* from candidates c
     where (c.precedence, c.spec) = (select c2.precedence, c2.spec from candidates c2
                                      order by c2.precedence desc, c2.spec desc limit 1)
  )
  select count(distinct (t.rail, t.milestones)),
         (array_agg(t.rail order by t.effective_from desc, t.id))[1],
         (array_agg(t.milestones order by t.effective_from desc, t.id))[1],
         (array_agg(t.id order by t.effective_from desc, t.id))[1]
    into n_answers, rail, milestones, policy_id
    from top t;
  if n_answers <> 1 then
    -- No match, or a tie that disagrees: fail closed.
    rail := null; milestones := null; policy_id := null;
  end if;
end;
$function$;

revoke all on function public.resolve_payment_rail(public.property_type, public.listing_intent, public.agent_type, timestamptz) from public, anon;
revoke all on function public.resolve_payment_rail(public.property_type, public.listing_intent, public.agent_type, timestamptz) from authenticated;
-- Server only until the open path is wired; members have no reason to read the policy.
grant execute on function public.resolve_payment_rail(public.property_type, public.listing_intent, public.agent_type, timestamptz) to service_role;

-- THE SEED: the founder's two-rail decision of 5 October, verbatim from 3A.3.
-- Idempotent: inserted only when no row exists yet.
insert into public.payment_rail_policy (property_type, listing_intent, lister_kind, rail, milestones, precedence, effective_from, reason)
select v.pt::public.property_type, v.li::public.listing_intent, v.lk::public.agent_type, v.rail, v.ms,
       case when v.li = 'sale' then 100 else 0 end, timestamptz '2026-10-05 00:00:00+01', v.reason
  from (values
    (null,         'sale', null,         'escrow', true,  'Founder decision 5 Oct 2026: every sale is escrow, milestone (3A.3).'),
    ('rental',     null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: tenancy is escrow (3A.3).'),
    ('home',       null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: homes are escrow (3A.3).'),
    ('villa',      null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: villas are escrow (3A.3).'),
    ('land',       null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: land is escrow (3A.3).'),
    ('shop',       null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: shops are escrow (3A.3).'),
    ('office',     null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: offices are escrow (3A.3).'),
    ('shortlet',   null,   null,         'escrow', false, 'Founder decision 5 Oct 2026: shortlets are escrow (3A.3).'),
    ('apartment',  null,   'individual', 'escrow', false, 'Founder decision 5 Oct 2026: an individual''s apartment is escrow (3A.2).'),
    ('apartment',  null,   'business',   'direct', false, 'Founder decision 5 Oct 2026: a registered business''s apartment is direct (3A.2).'),
    ('hotel',      null,   null,         'direct', false, 'Founder decision 5 Oct 2026: hotels settle direct on Paystack (3A.3).'),
    ('restaurant', null,   null,         'direct', false, 'Founder decision 5 Oct 2026: restaurants settle direct on Paystack (3A.3).')
  ) as v(pt, li, lk, rail, ms, reason)
 where not exists (select 1 from public.payment_rail_policy);

-- transactions.rail: a historical fact, written once.
alter table public.transactions
  add column if not exists rail text check (rail in ('escrow', 'direct')),
  add column if not exists rail_policy_id uuid references public.payment_rail_policy(id);

create or replace function private.transactions_rail_is_fixed()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (old.rail is not null and new.rail is distinct from old.rail)
     or (old.rail_policy_id is not null and new.rail_policy_id is distinct from old.rail_policy_id) then
    raise exception 'a transaction''s rail is fixed when it opens' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

create or replace trigger transactions_00_rail_is_fixed
  before update on public.transactions
  for each row execute function private.transactions_rail_is_fixed();

-- READ-BACK.
do $check$
begin
  if to_regclass('public.payment_rail_policy') is null then raise exception 'payment_rail_policy missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.payment_rail_policy'::regclass) then
    raise exception 'payment_rail_policy has no RLS';
  end if;
  if has_table_privilege('authenticated', 'public.payment_rail_policy', 'select')
     or has_table_privilege('anon', 'public.payment_rail_policy', 'select') then
    raise exception 'payment_rail_policy is directly readable by an app role';
  end if;
  if (select count(*) from public.payment_rail_policy where reason like 'Founder decision 5 Oct 2026:%') <> 12 then
    raise exception 'the seed did not land';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'payment_rail_policy_00_guard' and not tgisinternal) then
    raise exception 'policy guard missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'transactions_00_rail_is_fixed' and not tgisinternal) then
    raise exception 'rail-is-fixed trigger missing';
  end if;
  if has_function_privilege('anon', 'public.resolve_payment_rail(public.property_type, public.listing_intent, public.agent_type, timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.resolve_payment_rail(public.property_type, public.listing_intent, public.agent_type, timestamptz)', 'execute') then
    raise exception 'resolver callable by an app role';
  end if;
end;
$check$;
