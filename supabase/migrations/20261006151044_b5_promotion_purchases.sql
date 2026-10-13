-- B5 (D60). THE PROMOTION PURCHASE MONEY PATH. APPLIED 2026-10-06 as 20261006151044.
--
-- Promotion is VALLO'S OWN REVENUE (docs/promotion/VALLO_PROMOTION.md, "Where
-- the money goes"). A purchase is a single-party Paystack charge to Vallo's
-- own account: no split, no subaccount, no escrow, no provider holding
-- anything. Nothing here borrows from the booking flow.
--
--   promotion.tier_prices      effective-dated price rows, keyed on the tier
--                              SLUG (boost, spotlight, featured, prime); the
--                              display names live in the locale files. Seeded
--                              status 'proposed' (D60: the founder's to confirm).
--                              Append-only: a change is a new row.
--   promotion.purchases        one row per checkout: member, listing, tier, the
--                              price FROZEN at purchase, the provider reference
--                              (rm-promo-<purchase id>), and a status.
--
-- Doors (all security definer, search_path '', service_role only unless said):
--   public.promotion_purchase_open(member, listing, tier)  freezes today's price;
--        refuses 'price_not_confirmed' while the price in force is only proposed
--   public.promotion_purchase_mark(reference, status)      pending/unknown/failed/abandoned
--   public.promotion_purchase_settle(reference, amount, currency)
--        THE ONLY ACTIVATION. Called from the webhook on charge.success. In one
--        transaction: verifies amount and currency against the frozen price,
--        flips the purchase to 'paid', opens the labelled placement, and posts
--        FEE_CHARGED 'in' to ledger_vallo_revenue through private.ledger_append
--        under the key 'promotion:<purchase id>'. Idempotent on the reference.
--   public.promotion_my_purchases()   authenticated: the caller's own rows only.
--
-- STATUSES. 'abandoned' is not 'failed', and 'unknown' is neither:
--   initialized  row written, provider not yet asked
--   pending      checkout opened at Paystack
--   unknown      the initialize call timed out or 5xx'd: it may exist there
--   failed       Paystack said the charge failed (charge.failed)
--   abandoned    nobody paid within the window; Paystack's "abandoned" is never
--                final, so a later charge.success still activates
--   paid         webhook-confirmed, amount and currency matched, activated
--   mismatch     money arrived but not the frozen amount/currency: NOT
--                activated, NOT posted as revenue; the desk decides (refund)
--
-- RANKING. Purchases live in the `promotion` schema, which anon and
-- authenticated cannot see (b3), so the organic ranking has no path to them.
-- Members read their own rows only through promotion_my_purchases().
--
-- Depends on b2_ledger (private.ledger_append) and b3 (schema promotion).
-- Additive, idempotent, RLS on.

set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.ledger_append(text,text,text,text,bigint,text,text,text,uuid,text,text,jsonb,uuid,uuid)') is null
     or to_regclass('promotion.placements') is null then
    raise exception 'b5_promotion_purchases: apply b2_ledger and b3_tax_entitlements_promotion first';
  end if;
end $$;

-- ---------------------------------------------------------------- PRICES
create table if not exists promotion.tier_prices (
  id              bigint generated always as identity primary key,
  tier            text not null check (tier in ('boost', 'spotlight', 'featured', 'prime')),
  effective_from  timestamptz not null,
  amount_minor    bigint not null check (amount_minor > 0),
  currency        text not null default 'NGN' check (currency = 'NGN'),
  duration_days   integer not null check (duration_days between 1 and 365),
  price_status    text not null check (price_status in ('proposed', 'confirmed')),
  source          text not null,
  created_at      timestamptz not null default now(),
  unique (tier, effective_from)
);

comment on table promotion.tier_prices is
  'Promotion tier prices, effective-dated and append-only. The price in force is the latest row with effective_from <= now. Keyed on the tier slug; display names live in locale files.';

create or replace function private.promotion_prices_fixed()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  raise exception 'promotion.tier_prices is append-only: add a new dated row' using errcode = '42501';
end;
$function$;
revoke all on function private.promotion_prices_fixed() from public, anon, authenticated;

create or replace trigger tier_prices_fixed
  before update or delete on promotion.tier_prices
  for each row execute function private.promotion_prices_fixed();
create or replace trigger tier_prices_no_truncate
  before truncate on promotion.tier_prices
  for each statement execute function private.promotion_prices_fixed();

insert into promotion.tier_prices (tier, effective_from, amount_minor, duration_days, price_status, source) values
  ('boost',     timestamptz '2026-10-06 00:00:00+01',  250000,  7, 'proposed', 'D60 / VALLO_PROMOTION.md, proposed, founder to confirm'),
  ('spotlight', timestamptz '2026-10-06 00:00:00+01',  750000, 14, 'proposed', 'D60 / VALLO_PROMOTION.md, proposed, founder to confirm'),
  ('featured',  timestamptz '2026-10-06 00:00:00+01', 2000000, 30, 'proposed', 'D60 / VALLO_PROMOTION.md, proposed, founder to confirm'),
  ('prime',     timestamptz '2026-10-06 00:00:00+01', 5000000, 30, 'proposed', 'D60 / VALLO_PROMOTION.md, proposed, founder to confirm')
on conflict (tier, effective_from) do nothing;

-- ---------------------------------------------------------------- PURCHASES
create table if not exists promotion.purchases (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references auth.users(id),
  listing_id          uuid not null references public.listings(id),
  tier                text not null check (tier in ('boost', 'spotlight', 'featured', 'prime')),
  -- Frozen at purchase. Never re-read from tier_prices after this row exists.
  price_id            bigint not null references promotion.tier_prices(id),
  amount_minor        bigint not null check (amount_minor > 0),
  currency            text not null check (currency = 'NGN'),
  duration_days       integer not null check (duration_days between 1 and 365),
  price_status        text not null check (price_status in ('proposed', 'confirmed')),
  provider            text not null default 'paystack' check (provider = 'paystack'),
  provider_reference  text not null unique check (provider_reference ~ '^rm-promo-[0-9a-f-]{36}$'),
  status              text not null default 'initialized'
                        check (status in ('initialized', 'pending', 'unknown', 'failed', 'abandoned', 'paid', 'mismatch')),
  paid_amount_minor   bigint,
  paid_currency       text,
  paid_at             timestamptz,
  placement_id        uuid references promotion.placements(id),
  ledger_entry_id     uuid references public.ledger_vallo_revenue(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint purchases_paid_shape check (
    (status = 'paid') = (placement_id is not null and ledger_entry_id is not null and paid_at is not null))
);

create index if not exists purchases_member on promotion.purchases (member_id, created_at desc);
create index if not exists purchases_listing on promotion.purchases (listing_id);

comment on table promotion.purchases is
  'One promotion checkout. Single-party Paystack charge to Vallo. Activated only by promotion_purchase_settle on a webhook-confirmed success.';

-- A paid or mismatched purchase never moves again; a row is never removed.
create or replace function private.promotion_purchase_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'promotion purchases are never removed' using errcode = '42501';
  end if;
  if old.status in ('paid', 'mismatch') and new.status is distinct from old.status then
    raise exception 'promotion purchase % is final (%)', old.id, old.status using errcode = '42501';
  end if;
  if (new.member_id, new.listing_id, new.tier, new.price_id, new.amount_minor, new.currency, new.duration_days,
      new.price_status, new.provider_reference)
     is distinct from
     (old.member_id, old.listing_id, old.tier, old.price_id, old.amount_minor, old.currency, old.duration_days,
      old.price_status, old.provider_reference) then
    raise exception 'the frozen terms of promotion purchase % cannot change', old.id using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
revoke all on function private.promotion_purchase_guard() from public, anon, authenticated;

create or replace trigger purchases_guard
  before update or delete on promotion.purchases
  for each row execute function private.promotion_purchase_guard();
create or replace trigger purchases_no_truncate
  before truncate on promotion.purchases
  for each statement execute function private.promotion_prices_fixed();

-- ---------------------------------------------------------------- GRANTS, RLS
alter table promotion.tier_prices enable row level security;
alter table promotion.purchases enable row level security;

revoke all on promotion.tier_prices, promotion.purchases from public, anon, authenticated, service_role;
grant select, insert on promotion.tier_prices to service_role;
grant select on promotion.purchases to service_role;
-- Explicit, because default ACLs hand them out.
revoke truncate, maintain on promotion.tier_prices, promotion.purchases from service_role;

-- A member reads their own purchases. authenticated has no usage on the
-- schema, so this policy is reached only through promotion_my_purchases();
-- it is here so the rule holds even if that ever changes.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'promotion' and tablename = 'purchases'
                    and policyname = 'purchases_member_reads_own') then
    create policy purchases_member_reads_own on promotion.purchases
      for select to authenticated using (member_id = (select auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------- FUNCTIONS
create or replace function public.promotion_price_now(p_tier text)
returns promotion.tier_prices
language sql
stable
security definer
set search_path to ''
as $function$
  select p.* from promotion.tier_prices p
   where p.tier = p_tier and p.effective_from <= now()
   order by p.effective_from desc limit 1
$function$;
revoke all on function public.promotion_price_now(text) from public, anon, authenticated;
grant execute on function public.promotion_price_now(text) to service_role;

-- Open a purchase at today's price. The amount comes from here, never a client.
-- Returns {ok, reason?, purchase_id, reference, amount_minor, currency, tier}.
create or replace function public.promotion_purchase_open(p_member uuid, p_listing uuid, p_tier text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_price promotion.tier_prices;
  v_id uuid := gen_random_uuid();
  v_ref text;
begin
  if p_member is null or p_listing is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_input');
  end if;
  if p_tier is null or p_tier not in ('boost', 'spotlight', 'featured', 'prime') then
    return jsonb_build_object('ok', false, 'reason', 'unknown_tier');
  end if;
  if not exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                  where l.id = p_listing and a.user_id = p_member) then
    return jsonb_build_object('ok', false, 'reason', 'not_your_listing');
  end if;
  if not exists (select 1 from public.listings l where l.id = p_listing and l.status = 'PUBLISHED') then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_published');
  end if;
  -- Serialised with settle's lock BEFORE both checks, so a settle committing
  -- concurrently is seen by the already_active read (fresh snapshot after the
  -- lock under read committed). Lock order everywhere: advisory, then rows.
  perform pg_advisory_xact_lock(hashtextextended('promotion:' || p_listing::text || ':' || p_tier, 0));
  -- One active placement per listing per tier ("One active Boost per listing").
  if exists (select 1 from promotion.placements pl
              where pl.listing_id = p_listing and pl.tier = p_tier
                and pl.state in ('scheduled', 'live') and pl.ends_at > now()) then
    return jsonb_build_object('ok', false, 'reason', 'already_active');
  end if;
  -- One checkout in flight per listing+tier: a second open within the hour
  -- would let two charges land for one slot.
  if exists (select 1 from promotion.purchases pu
              where pu.listing_id = p_listing and pu.tier = p_tier
                and pu.status in ('initialized', 'pending', 'unknown')
                and pu.created_at > now() - interval '1 hour') then
    return jsonb_build_object('ok', false, 'reason', 'purchase_in_progress');
  end if;
  v_price := public.promotion_price_now(p_tier);
  if v_price.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_price');
  end if;
  -- D60: prices are proposed, not decided (and D38: no Vallo Paystack account
  -- yet). Nothing is sold at a price the founder has not confirmed; confirming
  -- is a new dated row with price_status 'confirmed'.
  if v_price.price_status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'reason', 'price_not_confirmed');
  end if;
  v_ref := 'rm-promo-' || v_id::text;
  insert into promotion.purchases (id, member_id, listing_id, tier, price_id, amount_minor, currency,
                                   duration_days, price_status, provider_reference)
  values (v_id, p_member, p_listing, p_tier, v_price.id, v_price.amount_minor, v_price.currency,
          v_price.duration_days, v_price.price_status, v_ref);
  return jsonb_build_object('ok', true, 'purchase_id', v_id, 'reference', v_ref,
                            'amount_minor', v_price.amount_minor, 'currency', v_price.currency,
                            'tier', p_tier, 'duration_days', v_price.duration_days);
end;
$function$;
revoke all on function public.promotion_purchase_open(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.promotion_purchase_open(uuid, uuid, text) to service_role;

-- Every non-activating move. Never reaches 'paid' or 'mismatch' (settle only).
-- 'abandoned' only after an hour of nobody paying. A move that does not apply
-- answers false and changes nothing.
create or replace function public.promotion_purchase_mark(p_reference text, p_status text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_n int;
begin
  if p_status not in ('pending', 'unknown', 'failed', 'abandoned') then
    raise exception 'promotion_purchase_mark cannot set %', p_status using errcode = '22023';
  end if;
  update promotion.purchases p set status = p_status
   where p.provider_reference = p_reference
     and case p_status
           when 'pending'   then p.status in ('initialized', 'unknown')
           when 'unknown'   then p.status = 'initialized'
           when 'failed'    then p.status in ('initialized', 'pending', 'unknown', 'abandoned')
           when 'abandoned' then p.status in ('initialized', 'pending', 'unknown') and p.created_at < now() - interval '1 hour'
         end;
  get diagnostics v_n = row_count;
  return v_n = 1;
end;
$function$;
revoke all on function public.promotion_purchase_mark(text, text) from public, anon, authenticated;
grant execute on function public.promotion_purchase_mark(text, text) to service_role;

-- THE ONLY ACTIVATION. Webhook-confirmed success only.
-- Returns {outcome: activated|duplicate|mismatch|not_found, purchase_id?, placement_id?, ledger_entry_id?}.
create or replace function public.promotion_purchase_settle(p_reference text, p_amount_minor bigint, p_currency text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  p promotion.purchases;
  v_placement uuid;
  v_ledger uuid;
  v_now timestamptz := now();
  v_start timestamptz;
begin
  select * into p from promotion.purchases where provider_reference = p_reference for update;
  if p.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if p.status = 'paid' then
    return jsonb_build_object('outcome', 'duplicate', 'purchase_id', p.id,
                              'placement_id', p.placement_id, 'ledger_entry_id', p.ledger_entry_id);
  end if;
  if p.status = 'mismatch' then
    return jsonb_build_object('outcome', 'mismatch', 'purchase_id', p.id, 'replay', true);
  end if;
  if p_amount_minor is distinct from p.amount_minor or p_currency is distinct from p.currency then
    update promotion.purchases set status = 'mismatch', paid_amount_minor = p_amount_minor,
                                   paid_currency = p_currency
     where id = p.id;
    return jsonb_build_object('outcome', 'mismatch', 'purchase_id', p.id);
  end if;

  -- Money already taken cannot be refused, so a second paid purchase for the
  -- same listing+tier QUEUES behind the last one rather than overlapping it.
  -- Serialised per listing+tier so two concurrent settles cannot both see the
  -- same "latest end". A queued placement is state 'scheduled' with a future
  -- starts_at; a reader must show only state 'live' AND now() within the window.
  perform pg_advisory_xact_lock(hashtextextended('promotion:' || p.listing_id::text || ':' || p.tier, 0));
  select greatest(v_now, coalesce(max(pl.ends_at), v_now)) into v_start
    from promotion.placements pl
   where pl.listing_id = p.listing_id and pl.tier = p.tier
     and pl.state in ('scheduled', 'live') and pl.ends_at > v_now;
  insert into promotion.placements (listing_id, tier, starts_at, ends_at, state, bought_by)
  values (p.listing_id, p.tier, v_start, v_start + make_interval(days => p.duration_days),
          case when v_start > v_now then 'scheduled' else 'live' end, p.member_id)
  returning id into v_placement;

  v_ledger := private.ledger_append(
    'vallo_revenue', 'promotion:' || p.id::text, 'FEE_CHARGED', 'in', p.amount_minor, p.currency, 'paystack',
    p_reference, null, 'direct', 'confirmed',
    jsonb_build_object('kind', 'promotion', 'purchase_id', p.id, 'listing_id', p.listing_id,
                       'tier', p.tier, 'price_id', p.price_id, 'price_status', p.price_status),
    null, p.member_id);

  update promotion.purchases
     set status = 'paid', paid_amount_minor = p_amount_minor, paid_currency = p_currency, paid_at = v_now,
         placement_id = v_placement, ledger_entry_id = v_ledger
   where id = p.id;

  return jsonb_build_object('outcome', 'activated', 'purchase_id', p.id,
                            'placement_id', v_placement, 'ledger_entry_id', v_ledger);
end;
$function$;
revoke all on function public.promotion_purchase_settle(text, bigint, text) from public, anon, authenticated;
grant execute on function public.promotion_purchase_settle(text, bigint, text) to service_role;

-- The member's own purchases, nothing else.
create or replace function public.promotion_my_purchases()
returns table (id uuid, listing_id uuid, tier text, amount_minor bigint, currency text, duration_days integer,
               status text, paid_at timestamptz, starts_at timestamptz, ends_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select p.id, p.listing_id, p.tier, p.amount_minor, p.currency, p.duration_days, p.status, p.paid_at,
         pl.starts_at, pl.ends_at, p.created_at
    from promotion.purchases p
    left join promotion.placements pl on pl.id = p.placement_id
   where p.member_id = (select auth.uid())
   order by p.created_at desc
$function$;
revoke all on function public.promotion_my_purchases() from public, anon;
grant execute on function public.promotion_my_purchases() to authenticated, service_role;

-- ---------------------------------------------------------------- READ-BACK
do $$
declare n int;
begin
  select count(*) into n from promotion.tier_prices
   where (tier, amount_minor, duration_days, price_status) in
         (('boost', 250000, 7, 'proposed'), ('spotlight', 750000, 14, 'proposed'),
          ('featured', 2000000, 30, 'proposed'), ('prime', 5000000, 30, 'proposed'));
  if n <> 4 then raise exception 'b5_promotion_purchases: % of 4 proposed prices seeded', n; end if;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'promotion' and c.relname in ('tier_prices', 'purchases') and c.relrowsecurity;
  if n <> 2 then raise exception 'b5_promotion_purchases: RLS on % of 2 tables', n; end if;
  if has_schema_privilege('anon', 'promotion', 'usage') or has_schema_privilege('authenticated', 'promotion', 'usage') then
    raise exception 'b5_promotion_purchases: members can see the promotion schema';
  end if;
  if exists (select 1 from unnest(array['promotion.tier_prices', 'promotion.purchases']) t(name)
              cross join unnest(array['update', 'delete', 'truncate', 'maintain']) pr(priv)
              where has_table_privilege('service_role', t.name, pr.priv)) then
    raise exception 'b5_promotion_purchases: service_role can rewrite or erase promotion money rows';
  end if;
  if exists (select 1 from unnest(array[
                'public.promotion_price_now(text)', 'public.promotion_purchase_open(uuid,uuid,text)',
                'public.promotion_purchase_mark(text,text)', 'public.promotion_purchase_settle(text,bigint,text)',
                'public.promotion_my_purchases()']) f(sig)
              where has_function_privilege('anon', f.sig, 'execute')) then
    raise exception 'b5_promotion_purchases: anon can execute a promotion function';
  end if;
  if exists (select 1 from unnest(array[
                'public.promotion_price_now(text)', 'public.promotion_purchase_open(uuid,uuid,text)',
                'public.promotion_purchase_mark(text,text)', 'public.promotion_purchase_settle(text,bigint,text)']) f(sig)
              where has_function_privilege('authenticated', f.sig, 'execute')) then
    raise exception 'b5_promotion_purchases: a member can open, mark or settle a purchase';
  end if;
  select count(*) into n from pg_trigger
   where tgname in ('tier_prices_fixed', 'tier_prices_no_truncate', 'purchases_guard', 'purchases_no_truncate')
     and not tgisinternal;
  if n <> 4 then raise exception 'b5_promotion_purchases: % of 4 guard triggers', n; end if;
end $$;
