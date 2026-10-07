-- B3 (D61). THE FEE ACCEPTANCE RECORD. APPLIED 2026-10-06 as 20261006150758.
-- Depends on: 20261006103626_b3_money_policy_versions.sql (applied).
-- Safe to apply before b3_rate_agreement_gate.sql: purely additive, no trigger on
-- public.listings, no change to publishing, no change to any existing function.
--
-- D61: "The acceptance record is a legal artifact. It stores both rates as numbers,
-- the terms version, the exact figures shown including the rent entered, the
-- timestamp and the actor. And per D51 a lister keeps the rate they accepted until
-- they accept a new one, so a rate change re-prompts rather than applying silently."
--
-- THE FIGURES (D61, VALLO_PRICING.md "The agreement gate"). The rail is not knowable
-- at acceptance, so the lister is shown a RANGE anchored on the worst case:
--   fee_low      = Vallo commission (commission_quote: bps, floor, optional cap)
--   protection   = floor(rent * protection_bps / 10000)   (escrow protection, uncapped)
--   fee_high     = fee_low + protection
--   receive_high = rent - fee_low       (direct rail)
--   receive_low  = rent - fee_high      (escrow rail; THE HEADLINE)
--   1,800,000 naira at 200 + 200 bps -> fee 36,000..72,000, receive 1,728,000..1,764,000.
--
-- WHAT LANDS
--   public.fee_protection_rates         dated escrow-protection rate (bps), append only.
--                                       Seeded 200 bps from 2026-10-06 (Payluk 2%, D61).
--                                       A rate in a row, never a constant (D51). Kept
--                                       apart from money_policy_versions because it is
--                                       the provider's price, not Vallo's, and moves on
--                                       its own; a new row re-prompts like a new policy.
--   public.fee_protection_rate_at(ts)   the protection rate in force at a moment
--   public.listing_fee_acceptances      THE RECORD. Append only for every role.
--   public.fee_terms_quote(listing)     what the lister is shown. Writes nothing.
--   public.accept_fee_terms(...)        the only write. Recomputes server-side and
--                                       refuses unless every shown figure matches.
--   public.current_fee_acceptance(listing, at)  latest record not after `at`
--
-- WHO CALLS accept_fee_terms. `authenticated` only, and the actor is ALWAYS
-- auth.uid(), never a parameter. The Next server action calls it with the member's
-- own session client (lib/pricing/fee-acceptance-actions.ts), so the record's actor
-- is the JWT subject, not something a server or client asserted. A member calling
-- the RPC directly through PostgREST gains nothing: ownership is checked, every
-- figure is recomputed from policy and must equal what was sent, and the row says
-- exactly what they agreed to. service_role is NOT granted it: with no auth.uid()
-- it would need an actor parameter, which is the thing a legal record must not trust.
--
-- WHICH PRICE: sale -> sale_price_minor, else rent_amount_minor, else rate_minor (the
-- same rule as the pending gate's private.b3_listing_price_minor). The "rent entered"
-- is the price the client SHOWED; it must equal the stored price or the call is
-- refused 'price_changed'. The record is never written on a price that is not saved.
--
-- HISTORY: listing_id carries no FK (as the pending gate's table): the record outlives
-- the listing and never blocks erasure of an agent or listing.
--
-- No table or row is removed. RLS on. No member write grant (DB-06 allowlist
-- unchanged). service_role keeps SELECT on the record (and SELECT, INSERT on the
-- protection rates, to add a new dated rate); update, delete, truncate, references,
-- trigger, maintain are revoked, and triggers refuse update, delete and truncate.

create table if not exists public.fee_protection_rates (
  id              bigint generated always as identity primary key,
  effective_from  timestamptz not null unique,
  protection_bps  integer not null check (protection_bps between 0 and 10000),
  note            text not null check (length(btrim(note)) > 0),
  created_at      timestamptz not null default now()
);

create table if not exists public.listing_fee_acceptances (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null,   -- no FK on purpose: the record outlives the listing
  member_id            uuid not null,   -- the actor: auth.uid() at acceptance
  accepted_at          timestamptz not null default clock_timestamp(),
  terms_version        text not null check (terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$'),
  policy_version_id    bigint not null references public.money_policy_versions(id),
  policy_version       text not null,
  protection_rate_id   bigint not null references public.fee_protection_rates(id),
  property_type        public.property_type not null,
  commission_bps       integer not null check (commission_bps between 0 and 10000),
  protection_bps       integer not null check (protection_bps between 0 and 10000),
  cap_threshold_minor  bigint,
  cap_minor            bigint,
  rent_minor           bigint not null check (rent_minor > 0),
  fee_low_minor        bigint not null check (fee_low_minor >= 0),
  fee_high_minor       bigint not null,
  receive_low_minor    bigint not null check (receive_low_minor >= 0),
  receive_high_minor   bigint not null,
  figures_shown        jsonb not null,
  constraint listing_fee_acceptances_range check (fee_low_minor <= fee_high_minor),
  constraint listing_fee_acceptances_high_adds_up check (fee_low_minor + receive_high_minor = rent_minor),
  constraint listing_fee_acceptances_low_adds_up check (fee_high_minor + receive_low_minor = rent_minor)
);
create index if not exists listing_fee_acceptances_listing_idx
  on public.listing_fee_acceptances (listing_id, accepted_at desc, id desc);
create index if not exists listing_fee_acceptances_member_idx
  on public.listing_fee_acceptances (member_id, accepted_at desc);

-- Append only. private.money_policy_append_only refuses every UPDATE/DELETE on a
-- table other than money_policy_versions, and every TRUNCATE.
create or replace trigger fee_protection_rates_append_only
  before update or delete on public.fee_protection_rates
  for each row execute function private.money_policy_append_only();
create or replace trigger fee_protection_rates_no_truncate
  before truncate on public.fee_protection_rates
  for each statement execute function private.money_policy_append_only();
create or replace trigger listing_fee_acceptances_append_only
  before update or delete on public.listing_fee_acceptances
  for each row execute function private.money_policy_append_only();
create or replace trigger listing_fee_acceptances_no_truncate
  before truncate on public.listing_fee_acceptances
  for each statement execute function private.money_policy_append_only();

alter table public.fee_protection_rates enable row level security;
alter table public.listing_fee_acceptances enable row level security;

revoke all on public.fee_protection_rates, public.listing_fee_acceptances
  from public, anon, authenticated, service_role;
grant select on public.fee_protection_rates to anon, authenticated, service_role;
grant insert on public.fee_protection_rates to service_role;
grant select on public.listing_fee_acceptances to authenticated, service_role;
revoke all on sequence public.fee_protection_rates_id_seq from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fee_protection_rates'
                  and policyname = 'fee_protection_rates_read') then
    create policy fee_protection_rates_read on public.fee_protection_rates
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listing_fee_acceptances'
                  and policyname = 'listing_fee_acceptances_own_or_staff') then
    create policy listing_fee_acceptances_own_or_staff on public.listing_fee_acceptances
      for select to authenticated
      using (member_id = (select auth.uid()) or private.is_staff());
  end if;
end $$;

insert into public.fee_protection_rates (effective_from, protection_bps, note)
values (timestamptz '2026-10-06 00:00:00+01', 200,
        'D61: escrow protection 2 percent when a buyer pays into escrow (Payluk, VALLO_PRICING.md section 2). Shown as the worst case of the range.')
on conflict (effective_from) do nothing;

create or replace function public.fee_protection_rate_at(p_at timestamptz default now())
returns public.fee_protection_rates
language sql stable security definer set search_path to '' as $$
  select r.* from public.fee_protection_rates r
   where r.effective_from <= p_at
   order by r.effective_from desc, r.id desc limit 1;
$$;

-- The figures, computed once, in one place. Never called with client numbers.
create or replace function private.fee_terms_figures(p_listing uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  l public.listings%rowtype;
  v public.money_policy_versions%rowtype;
  pr public.fee_protection_rates%rowtype;
  price bigint;
  q jsonb;
  fee_low bigint;
  protection bigint;
begin
  select * into l from public.listings where id = p_listing;
  if l.id is null then return jsonb_build_object('status', 'not_found'); end if;
  v := public.money_policy_at(now());
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  pr := public.fee_protection_rate_at(now());
  if pr.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  price := case when l.listing_intent = 'sale' then l.sale_price_minor
                else coalesce(l.rent_amount_minor, l.rate_minor) end;
  if price is null or price <= 0 then return jsonb_build_object('status', 'no_price'); end if;
  q := public.commission_quote(v.id, l.property_type, price);
  if q->>'status' <> 'ok' then return q; end if;
  fee_low := (q->>'commission_minor')::bigint;
  protection := (price * pr.protection_bps) / 10000;
  if fee_low + protection > price then return jsonb_build_object('status', 'bad_amount'); end if;
  return jsonb_build_object(
    'status', 'ok', 'listing_id', l.id, 'property_type', l.property_type,
    'policy_version_id', v.id, 'policy_version', v.version,
    'protection_rate_id', pr.id,
    'commission_bps', (q->>'commission_bps')::integer, 'protection_bps', pr.protection_bps,
    'cap_threshold_minor', q->'cap_threshold_minor', 'cap_minor', q->'cap_minor',
    'cap_applied', q->'cap_applied',
    'rent_minor', price,
    'commission_minor', fee_low, 'protection_minor', protection,
    'fee_low_minor', fee_low, 'fee_high_minor', fee_low + protection,
    'receive_low_minor', price - fee_low - protection, 'receive_high_minor', price - fee_low);
end;
$$;

-- The latest record for a listing not after a moment. SECURITY INVOKER: a member
-- sees only their own records through RLS; staff see all; a definer caller (the
-- pending gate, the split) sees all. Only the listing's CURRENT owner's record
-- counts, as in fee_terms_quote. The default moment is clock_timestamp(), not
-- now(): accepted_at is clock_timestamp(), so a caller in the accepting
-- transaction would otherwise not see the record it just wrote.
create or replace function public.current_fee_acceptance(p_listing uuid, p_at timestamptz default clock_timestamp())
returns public.listing_fee_acceptances
language sql stable security invoker set search_path to '' as $$
  select a.* from public.listing_fee_acceptances a
   where a.listing_id = p_listing and a.accepted_at <= p_at
     and exists (select 1 from public.listings l join public.agents ag on ag.id = l.agent_id
                  where l.id = p_listing and ag.user_id = a.member_id)
   order by a.accepted_at desc, a.id desc limit 1;
$$;

-- What the lister is shown, plus whether their latest record already covers it.
create or replace function public.fee_terms_quote(p_listing uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  f jsonb;
  acc public.listing_fee_acceptances%rowtype;
begin
  if not exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                  where l.id = p_listing and a.user_id = (select auth.uid()))
     and not private.is_staff() then
    return jsonb_build_object('status', 'not_found');
  end if;
  f := private.fee_terms_figures(p_listing);
  if f->>'status' <> 'ok' then return f; end if;
  -- Only an acceptance by the listing's CURRENT owner counts: a listing that
  -- moves to another agent re-prompts rather than inheriting the old consent.
  select a.* into acc from public.listing_fee_acceptances a
   where a.listing_id = p_listing
     and exists (select 1 from public.listings l join public.agents ag on ag.id = l.agent_id
                  where l.id = p_listing and ag.user_id = a.member_id)
   order by a.accepted_at desc, a.id desc limit 1;
  return f || jsonb_build_object(
    'accepted', acc.id is not null
                and acc.policy_version_id = (f->>'policy_version_id')::bigint
                and acc.protection_rate_id = (f->>'protection_rate_id')::bigint
                and acc.rent_minor = (f->>'rent_minor')::bigint,
    'accepted_terms_version', acc.terms_version,
    'accepted_at', acc.accepted_at,
    'acceptance_id', acc.id);
end;
$$;

-- THE ONLY WRITE. Every figure the client says it showed is compared with the
-- server's own computation; any difference is refused and nothing is written.
create or replace function public.accept_fee_terms(
  p_listing uuid,
  p_terms_version text,
  p_policy_version bigint,
  p_protection_rate bigint,
  p_rent_minor bigint,
  p_fee_low_minor bigint,
  p_fee_high_minor bigint,
  p_receive_low_minor bigint,
  p_receive_high_minor bigint)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
declare
  me uuid := (select auth.uid());
  f jsonb;
  row_id uuid;
  at_ timestamptz;
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;
  -- Lock the listing so its price cannot move between check and write.
  perform 1 from public.listings l join public.agents a on a.id = l.agent_id
   where l.id = p_listing and a.user_id = me for update of l;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if p_terms_version is null or p_terms_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$' then
    return jsonb_build_object('status', 'bad_terms_version');
  end if;
  f := private.fee_terms_figures(p_listing);
  if f->>'status' <> 'ok' then return f; end if;
  if p_policy_version is distinct from (f->>'policy_version_id')::bigint
     or p_protection_rate is distinct from (f->>'protection_rate_id')::bigint then
    return jsonb_build_object('status', 'rate_changed');
  end if;
  if p_rent_minor is distinct from (f->>'rent_minor')::bigint then
    return jsonb_build_object('status', 'price_changed');
  end if;
  if p_fee_low_minor is distinct from (f->>'fee_low_minor')::bigint
     or p_fee_high_minor is distinct from (f->>'fee_high_minor')::bigint
     or p_receive_low_minor is distinct from (f->>'receive_low_minor')::bigint
     or p_receive_high_minor is distinct from (f->>'receive_high_minor')::bigint then
    return jsonb_build_object('status', 'figures_mismatch');
  end if;
  insert into public.listing_fee_acceptances
    (listing_id, member_id, accepted_at, terms_version, policy_version_id, policy_version, protection_rate_id,
     property_type, commission_bps, protection_bps, cap_threshold_minor, cap_minor,
     rent_minor, fee_low_minor, fee_high_minor, receive_low_minor, receive_high_minor, figures_shown)
  values
    (p_listing, me, clock_timestamp(), p_terms_version, (f->>'policy_version_id')::bigint, f->>'policy_version',
     (f->>'protection_rate_id')::bigint, (f->>'property_type')::public.property_type,
     (f->>'commission_bps')::integer, (f->>'protection_bps')::integer,
     nullif(f->>'cap_threshold_minor', '')::bigint, nullif(f->>'cap_minor', '')::bigint,
     p_rent_minor, p_fee_low_minor, p_fee_high_minor, p_receive_low_minor, p_receive_high_minor,
     jsonb_build_object(
       'rent_naira', to_char(p_rent_minor / 100.0, 'FM999,999,999,990.00'),
       'fee_low_naira', to_char(p_fee_low_minor / 100.0, 'FM999,999,999,990.00'),
       'fee_high_naira', to_char(p_fee_high_minor / 100.0, 'FM999,999,999,990.00'),
       'vallo_fee_naira', to_char((f->>'commission_minor')::bigint / 100.0, 'FM999,999,999,990.00'),
       'protection_naira', to_char((f->>'protection_minor')::bigint / 100.0, 'FM999,999,999,990.00'),
       'receive_low_naira', to_char(p_receive_low_minor / 100.0, 'FM999,999,999,990.00'),
       'receive_high_naira', to_char(p_receive_high_minor / 100.0, 'FM999,999,999,990.00'),
       'commission_bps', (f->>'commission_bps')::integer,
       'protection_bps', (f->>'protection_bps')::integer,
       'policy_version', f->>'policy_version',
       'terms_version', p_terms_version))
  returning id, accepted_at into row_id, at_;
  return f || jsonb_build_object('accepted', true, 'acceptance_id', row_id, 'accepted_at', at_,
                                 'accepted_terms_version', p_terms_version);
end;
$$;

-- GRANTS. Default privileges give anon (and authenticated) EXECUTE on new public
-- functions; revoke from every API role, then grant back only what is meant.
revoke all on function public.fee_protection_rate_at(timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.fee_terms_figures(uuid) from public, anon, authenticated, service_role;
revoke all on function public.current_fee_acceptance(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.fee_terms_quote(uuid) from public, anon, authenticated, service_role;
revoke all on function public.accept_fee_terms(uuid, text, bigint, bigint, bigint, bigint, bigint, bigint, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.fee_protection_rate_at(timestamptz) to anon, authenticated, service_role;
grant execute on function public.current_fee_acceptance(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.fee_terms_quote(uuid) to authenticated;
grant execute on function public.accept_fee_terms(uuid, text, bigint, bigint, bigint, bigint, bigint, bigint, bigint)
  to authenticated;

-- READ-BACK.
do $$
declare
  n int;
  pr public.fee_protection_rates%rowtype;
begin
  pr := public.fee_protection_rate_at(timestamptz '2026-10-07 00:00:00+01');
  if pr.id is null or pr.protection_bps <> 200 then
    raise exception 'b3_fee_acceptance_record: protection seed did not land as written';
  end if;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname in ('fee_protection_rates', 'listing_fee_acceptances') and c.relrowsecurity;
  if n <> 2 then raise exception 'b3_fee_acceptance_record: RLS is not on both tables'; end if;
  select count(*) into n from pg_trigger
   where tgname in ('fee_protection_rates_append_only', 'fee_protection_rates_no_truncate',
                    'listing_fee_acceptances_append_only', 'listing_fee_acceptances_no_truncate');
  if n <> 4 then raise exception 'b3_fee_acceptance_record: append-only triggers did not land'; end if;
  if exists (select 1 from unnest(array['public.fee_protection_rates', 'public.listing_fee_acceptances']) t(name)
              cross join unnest(array['update', 'delete', 'truncate', 'references', 'trigger']) p(priv)
              cross join unnest(array['anon', 'authenticated', 'service_role']) r(role)
              where has_table_privilege(r.role, t.name, p.priv)) then
    raise exception 'b3_fee_acceptance_record: a role can update, delete, truncate, reference or trigger';
  end if;
  if exists (select 1 from unnest(array['anon', 'authenticated', 'service_role']) r(role)
              where has_table_privilege(r.role, 'public.listing_fee_acceptances', 'insert')
                 or has_table_privilege(r.role, 'public.listing_fee_acceptances', 'maintain')
                 or has_table_privilege(r.role, 'public.fee_protection_rates', 'maintain')) then
    raise exception 'b3_fee_acceptance_record: a role can insert or maintain the record directly';
  end if;
  if has_table_privilege('anon', 'public.listing_fee_acceptances', 'select')
     or has_table_privilege('authenticated', 'public.fee_protection_rates', 'insert') then
    raise exception 'b3_fee_acceptance_record: anon reads the record or members write rates';
  end if;
  if has_function_privilege('anon', 'public.accept_fee_terms(uuid,text,bigint,bigint,bigint,bigint,bigint,bigint,bigint)', 'execute')
     or has_function_privilege('service_role', 'public.accept_fee_terms(uuid,text,bigint,bigint,bigint,bigint,bigint,bigint,bigint)', 'execute')
     or not has_function_privilege('authenticated', 'public.accept_fee_terms(uuid,text,bigint,bigint,bigint,bigint,bigint,bigint,bigint)', 'execute')
     or has_function_privilege('anon', 'public.fee_terms_quote(uuid)', 'execute')
     or has_function_privilege('service_role', 'public.fee_terms_quote(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.fee_terms_quote(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.current_fee_acceptance(uuid,timestamptz)', 'execute')
     or not has_table_privilege('authenticated', 'public.listing_fee_acceptances', 'select')
     or has_table_privilege('anon', 'public.fee_protection_rates', 'insert')
     or has_function_privilege('anon', 'public.current_fee_acceptance(uuid,timestamptz)', 'execute')
     or has_function_privilege('anon', 'private.fee_terms_figures(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.fee_terms_figures(uuid)', 'execute')
     or has_function_privilege('service_role', 'private.fee_terms_figures(uuid)', 'execute') then
    raise exception 'b3_fee_acceptance_record: a function kept a grant it should not have';
  end if;
end $$;
