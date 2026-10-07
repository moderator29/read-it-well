-- B3 (Session 2, round 3). PRICING AS POLICY DATA. Applied 6 October 2026.
--
-- D51: every rate is a dated row, in basis points or kobo, never a constant in
-- code. Changing a price is a new row, never a deploy and never an edit.
--
-- WHY A NEW TABLE AND NOT `public.money_policy`. `public.money_policy` already
-- exists as a SINGLETON (id boolean primary key, guarantee_bps 150,
-- claim_window_hours, min_inspection_photos) read by payment_split_for_booking,
-- payment_split_for_rent_share, private.rent_terms, private.agreement_open_for_stay
-- and admin_guarantee_reserve. Dropping or reshaping it is destructive (D5), so
-- the dated history lives beside it in `public.money_policy_versions`, and the
-- singleton's guarantee_bps is brought to 0 so every existing reader agrees
-- with the new policy. `public.fee_rates` (dated, kind-keyed, commission 0 since
-- 1970) is kept as history; `private.current_fee_bps('commission')` now reads
-- the in-force policy version instead, so there is ONE source for the rate.
--
-- WHAT LANDS
--   public.money_policy_versions            dated policy rows, append only
--   public.money_policy_commission_rates    commission per property_type per version,
--                                           with an optional absolute cap above a threshold
--   public.money_policy_withdrawal_bands    Vallo's withdrawal band per version
--   public.money_policy_at(ts)              the version in force at a moment
--   public.commission_quote(version, type, amount)   the resolver
--   public.withdrawal_fee_quote(amount, ts)          Vallo's band only (never the provider fee)
--   private.current_fee_bps                 re-pointed for 'commission'
--   public.money_policy.guarantee_bps       150 -> 0 (the Guarantee is retired, D51)
--
-- FIGURES SEEDED (VALLO_PRICING.md, D51), all in kobo or bps:
--   commission_bps 200, guarantee_bps 0, vat_bps 0, vat_registered false,
--   withdrawal minimum 1,000 naira = 100000 kobo.
--   Every property_type at 200 bps, NO cap (the sale/land cap is a founder
--   decision not yet made; cap columns are NULL, never guessed).
--   Withdrawal bands with Session 1's two corrections:
--     [1,000 , 100,000)      50 naira flat
--     [100,000 , 500,000)   200 naira flat   (gap 100k-200k closed)
--     [500,000 , 2,000,000) 300 naira flat
--     [2,000,000 , open)    percentage with a cap: NOT CONFIRMED. bps and cap
--                           are NULL and the resolver returns status
--                           'band_unconfirmed' for it. No figure invented.
--   Lower bound inclusive, upper exclusive: exactly 500,000 is in the 300 band
--   and exactly 100,000 in the 200 band. Overridable by a new version.
--
-- Additive and idempotent. No table or row is removed. RLS on every new table,
-- read open (prices are public), no member write grant (DB-06 allowlist
-- unchanged). The policy tables are append only for EVERY role: service_role
-- keeps select and insert only (its default-ACL update/delete/truncate are
-- revoked), and a before-truncate trigger refuses truncate as well.
--
-- THE ONE CONSTRAINT CHANGE. The live singleton carries
-- money_policy_guarantee_bps_check (guarantee_bps between 100 and 200), which
-- would refuse the retirement to 0. It is replaced here, inside this same
-- transaction, by money_policy_guarantee_bps_range (between 0 and 200). Only
-- the lower bound moves; the upper bound is unchanged.
--
-- GRANTS. Postgres default privileges give anon EXECUTE on every new public
-- function, and `revoke ... from public` does not remove that, so every new
-- function is revoked from public AND anon explicitly, then granted back only
-- where a public read is intended (money_policy_at, commission_quote).

alter table public.money_policy drop constraint if exists money_policy_guarantee_bps_check;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.money_policy'::regclass
                  and conname = 'money_policy_guarantee_bps_range') then
    alter table public.money_policy
      add constraint money_policy_guarantee_bps_range check (guarantee_bps between 0 and 200);
  end if;
end $$;

create table if not exists public.money_policy_versions (
  id                    bigint generated always as identity primary key,
  version               text not null unique,
  effective_from        timestamptz not null,
  effective_to          timestamptz,
  commission_bps        integer not null check (commission_bps between 0 and 10000),
  guarantee_bps         integer not null check (guarantee_bps between 0 and 10000),
  vat_bps               integer not null check (vat_bps between 0 and 10000),
  vat_registered        boolean not null,
  withdrawal_min_minor  bigint not null check (withdrawal_min_minor >= 0),
  note                  text not null check (length(btrim(note)) > 0),
  created_by            uuid,
  created_at            timestamptz not null default now(),
  constraint money_policy_versions_window check (effective_to is null or effective_to > effective_from),
  -- VAT may never be charged while unregistered (an offence, D51).
  constraint money_policy_versions_no_vat_unregistered check (vat_registered or vat_bps = 0)
);

create table if not exists public.money_policy_commission_rates (
  id                   bigint generated always as identity primary key,
  policy_version_id    bigint not null references public.money_policy_versions(id),
  property_type        public.property_type not null,
  commission_bps       integer not null check (commission_bps between 0 and 10000),
  cap_threshold_minor  bigint check (cap_threshold_minor > 0),
  cap_minor            bigint check (cap_minor >= 0),
  created_at           timestamptz not null default now(),
  unique (policy_version_id, property_type),
  constraint money_policy_commission_cap_pair check ((cap_threshold_minor is null) = (cap_minor is null))
);

create table if not exists public.money_policy_withdrawal_bands (
  id                 bigint generated always as identity primary key,
  policy_version_id  bigint not null references public.money_policy_versions(id),
  from_minor         bigint not null check (from_minor >= 0),
  to_minor           bigint,
  flat_fee_minor     bigint check (flat_fee_minor >= 0),
  fee_bps            integer check (fee_bps between 0 and 10000),
  fee_cap_minor      bigint check (fee_cap_minor >= 0),
  confirmed          boolean not null,
  note               text,
  created_at         timestamptz not null default now(),
  unique (policy_version_id, from_minor),
  constraint money_policy_band_range check (to_minor is null or to_minor > from_minor),
  -- A confirmed band has exactly one way to price it; an unconfirmed band has none.
  constraint money_policy_band_shape check (
    (confirmed and ((flat_fee_minor is not null and fee_bps is null and fee_cap_minor is null)
                 or (flat_fee_minor is null and fee_bps is not null)))
    or (not confirmed and flat_fee_minor is null and fee_bps is null and fee_cap_minor is null))
);

-- Never edited. The only permitted change is closing an open window once.
create or replace function private.money_policy_append_only()
returns trigger language plpgsql set search_path to '' as $$
begin
  -- Statement-level (truncate) first: OLD is not a row there.
  if tg_op = 'TRUNCATE' then
    raise exception 'money_policy: history is kept, a policy table is never truncated' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'money_policy: history is kept, a policy row is never deleted' using errcode = '42501';
  end if;
  -- Nested so OLD.effective_to is only read on the table that has it.
  if tg_table_name = 'money_policy_versions' then
    if (to_jsonb(old)->>'effective_to') is null and (to_jsonb(new)->>'effective_to') is not null
       and (to_jsonb(new) - 'effective_to') = (to_jsonb(old) - 'effective_to') then
      return new;
    end if;
  end if;
  raise exception 'money_policy: a policy row is never edited; add a new version' using errcode = '42501';
end;
$$;

create or replace trigger money_policy_versions_append_only
  before update or delete on public.money_policy_versions
  for each row execute function private.money_policy_append_only();
create or replace trigger money_policy_commission_rates_append_only
  before update or delete on public.money_policy_commission_rates
  for each row execute function private.money_policy_append_only();
create or replace trigger money_policy_withdrawal_bands_append_only
  before update or delete on public.money_policy_withdrawal_bands
  for each row execute function private.money_policy_append_only();
create or replace trigger money_policy_versions_no_truncate
  before truncate on public.money_policy_versions
  for each statement execute function private.money_policy_append_only();
create or replace trigger money_policy_commission_rates_no_truncate
  before truncate on public.money_policy_commission_rates
  for each statement execute function private.money_policy_append_only();
create or replace trigger money_policy_withdrawal_bands_no_truncate
  before truncate on public.money_policy_withdrawal_bands
  for each statement execute function private.money_policy_append_only();
revoke all on function private.money_policy_append_only() from public, anon, authenticated;

alter table public.money_policy_versions enable row level security;
alter table public.money_policy_commission_rates enable row level security;
alter table public.money_policy_withdrawal_bands enable row level security;

revoke all on public.money_policy_versions, public.money_policy_commission_rates,
              public.money_policy_withdrawal_bands from public, anon, authenticated, service_role;
grant select on public.money_policy_versions, public.money_policy_commission_rates,
               public.money_policy_withdrawal_bands to anon, authenticated;
grant select, insert on public.money_policy_versions, public.money_policy_commission_rates,
               public.money_policy_withdrawal_bands to service_role;
revoke all on sequence public.money_policy_versions_id_seq, public.money_policy_commission_rates_id_seq,
               public.money_policy_withdrawal_bands_id_seq from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'money_policy_versions' and policyname = 'money_policy_versions_read') then
    create policy money_policy_versions_read on public.money_policy_versions for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'money_policy_commission_rates' and policyname = 'money_policy_commission_rates_read') then
    create policy money_policy_commission_rates_read on public.money_policy_commission_rates for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'money_policy_withdrawal_bands' and policyname = 'money_policy_withdrawal_bands_read') then
    create policy money_policy_withdrawal_bands_read on public.money_policy_withdrawal_bands for select to anon, authenticated using (true);
  end if;
end $$;

-- The seed: one version, its per-type rates, its bands.
insert into public.money_policy_versions
  (version, effective_from, commission_bps, guarantee_bps, vat_bps, vat_registered, withdrawal_min_minor, note)
values
  ('2026-10-06.1', timestamptz '2026-10-06 00:00:00+01', 200, 0, 0, false, 100000,
   'D51, founder decisions 6 October 2026: commission 2 percent both rails, Guarantee retired, no VAT (unregistered), withdrawal minimum 1,000 naira.')
on conflict (version) do nothing;

insert into public.money_policy_commission_rates (policy_version_id, property_type, commission_bps)
select v.id, e.enumlabel::public.property_type, 200
  from public.money_policy_versions v
  cross join pg_enum e
  join pg_type t on t.oid = e.enumtypid and t.typname = 'property_type'
                and t.typnamespace = 'public'::regnamespace
 where v.version = '2026-10-06.1'
on conflict (policy_version_id, property_type) do nothing;

insert into public.money_policy_withdrawal_bands
  (policy_version_id, from_minor, to_minor, flat_fee_minor, fee_bps, fee_cap_minor, confirmed, note)
select v.id, b.from_minor, b.to_minor, b.flat_fee_minor, null, null, b.confirmed, b.note
  from public.money_policy_versions v
  cross join (values
    (100000::bigint,    10000000::bigint,  5000::bigint, true,  'Under 100,000 naira: 50 naira.'),
    (10000000::bigint,  50000000::bigint,  20000::bigint, true, '100,000 to 500,000 naira: 200 naira (Session 1 correction: band starts at 100,000, closing the gap).'),
    (50000000::bigint,  200000000::bigint, 30000::bigint, true, '500,000 to 2,000,000 naira: 300 naira.'),
    (200000000::bigint, null::bigint,      null::bigint,  false,'2,000,000 naira and above: a percentage with a cap (Session 1 correction). Rate and cap NOT CONFIRMED by the founder.')
  ) as b(from_minor, to_minor, flat_fee_minor, confirmed, note)
 where v.version = '2026-10-06.1'
on conflict (policy_version_id, from_minor) do nothing;

-- The version in force at a moment: the latest effective_from not after it,
-- whose window (if closed) has not ended.
create or replace function public.money_policy_at(p_at timestamptz default now())
returns public.money_policy_versions
language sql stable security definer set search_path to '' as $$
  select v.* from public.money_policy_versions v
   where v.effective_from <= p_at and (v.effective_to is null or v.effective_to > p_at)
   order by v.effective_from desc, v.id desc
   limit 1;
$$;

-- THE RESOLVER. Commission for an amount of a property type under a version.
-- Fee = floor(amount * bps / 10000) (the split's existing rounding), then, when
-- the amount is above the type's threshold, never more than the cap.
-- A type with no row under the version falls back to the version's default bps.
create or replace function public.commission_quote(p_version bigint, p_type public.property_type, p_amount_minor bigint)
returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  v public.money_policy_versions%rowtype;
  r public.money_policy_commission_rates%rowtype;
  bps integer;
  fee bigint;
  capped boolean := false;
begin
  if p_amount_minor is null or p_amount_minor < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  select * into v from public.money_policy_versions where id = p_version;
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  select * into r from public.money_policy_commission_rates where policy_version_id = v.id and property_type = p_type;
  bps := coalesce(r.commission_bps, v.commission_bps);
  fee := (p_amount_minor * bps) / 10000;
  if r.cap_threshold_minor is not null and p_amount_minor > r.cap_threshold_minor and fee > r.cap_minor then
    fee := r.cap_minor;
    capped := true;
  end if;
  return jsonb_build_object(
    'status', 'ok', 'policy_version_id', v.id, 'policy_version', v.version,
    'property_type', p_type, 'amount_minor', p_amount_minor,
    'commission_bps', bps, 'commission_minor', fee, 'net_minor', p_amount_minor - fee,
    'cap_threshold_minor', r.cap_threshold_minor, 'cap_minor', r.cap_minor, 'cap_applied', capped);
end;
$$;

-- Vallo's withdrawal band only. The PROVIDER fee is never computed here: it is
-- read back from the intent (D51), and the caller adds the two.
create or replace function public.withdrawal_fee_quote(p_amount_minor bigint, p_at timestamptz default now())
returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  v public.money_policy_versions%rowtype;
  b public.money_policy_withdrawal_bands%rowtype;
  fee bigint;
begin
  v := public.money_policy_at(p_at);
  if v.id is null then return jsonb_build_object('status', 'no_policy'); end if;
  if p_amount_minor is null or p_amount_minor < v.withdrawal_min_minor then
    return jsonb_build_object('status', 'below_minimum', 'minimum_minor', v.withdrawal_min_minor, 'policy_version_id', v.id);
  end if;
  select * into b from public.money_policy_withdrawal_bands
   where policy_version_id = v.id and from_minor <= p_amount_minor and (to_minor is null or to_minor > p_amount_minor)
   order by from_minor desc limit 1;
  if b.id is null then return jsonb_build_object('status', 'no_band', 'policy_version_id', v.id); end if;
  if not b.confirmed then
    return jsonb_build_object('status', 'band_unconfirmed', 'policy_version_id', v.id, 'band_id', b.id);
  end if;
  fee := coalesce(b.flat_fee_minor, (p_amount_minor * b.fee_bps) / 10000);
  if b.fee_cap_minor is not null then fee := least(fee, b.fee_cap_minor); end if;
  return jsonb_build_object('status', 'ok', 'policy_version_id', v.id, 'band_id', b.id,
                            'amount_minor', p_amount_minor, 'vallo_fee_minor', fee);
end;
$$;

revoke all on function public.money_policy_at(timestamptz) from public, anon;
revoke all on function public.commission_quote(bigint, public.property_type, bigint) from public, anon;
revoke all on function public.withdrawal_fee_quote(bigint, timestamptz) from public, anon;
-- Prices are public: the policy and the commission quote are readable by anyone.
-- The withdrawal quote is for signed-in members only (a deliberate choice: only
-- a member with a wallet withdraws).
grant execute on function public.money_policy_at(timestamptz) to anon, authenticated, service_role;
grant execute on function public.commission_quote(bigint, public.property_type, bigint) to anon, authenticated, service_role;
grant execute on function public.withdrawal_fee_quote(bigint, timestamptz) to authenticated, service_role;

-- INTEGRATE, DO NOT DUPLICATE: the old commission reader now answers from the
-- policy in force. listing_fee keeps reading fee_rates.
create or replace function private.current_fee_bps(p_kind public.fee_kind)
returns integer
language sql stable security definer set search_path to '' as $$
  select case
    when p_kind = 'commission' then coalesce((public.money_policy_at(now())).commission_bps, 0)
    else coalesce((select f.basis_points from public.fee_rates f
                    where f.kind = p_kind and f.effective_from <= now()
                    order by f.effective_from desc limit 1), 0)
  end;
$$;

-- The singleton mirror: the Guarantee is retired (D51). Its readers snapshot
-- this into agreement terms, so it must say 0 too.
update public.money_policy set guarantee_bps = 0, updated_at = now() where guarantee_bps <> 0;

-- READ-BACK.
do $$
declare
  v public.money_policy_versions%rowtype;
  n int;
begin
  v := public.money_policy_at(timestamptz '2026-10-07 00:00:00+01');
  if v.id is null or v.commission_bps <> 200 or v.guarantee_bps <> 0 or v.vat_bps <> 0
     or v.vat_registered or v.withdrawal_min_minor <> 100000 then
    raise exception 'b3_money_policy_versions: seed did not land as written';
  end if;
  select count(*) into n from public.money_policy_commission_rates where policy_version_id = v.id and commission_bps = 200;
  if n <> (select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'property_type' and t.typnamespace = 'public'::regnamespace) then
    raise exception 'b3_money_policy_versions: % per-type rates, expected one per property_type', n;
  end if;
  select count(*) into n from public.money_policy_withdrawal_bands where policy_version_id = v.id;
  if n <> 4 then raise exception 'b3_money_policy_versions: % bands, expected 4', n; end if;
  if (public.withdrawal_fee_quote(15000000, timestamptz '2026-10-07 00:00:00+01')->>'vallo_fee_minor')::bigint <> 20000 then
    raise exception 'b3_money_policy_versions: 150,000 naira did not fall in the 200 naira band';
  end if;
  if public.withdrawal_fee_quote(250000000, timestamptz '2026-10-07 00:00:00+01')->>'status' <> 'band_unconfirmed' then
    raise exception 'b3_money_policy_versions: the unconfirmed top band priced something';
  end if;
  if (public.commission_quote(v.id, 'apartment', 180000000)->>'commission_minor')::bigint <> 3600000 then
    raise exception 'b3_money_policy_versions: 2 percent of 1,800,000 naira is not 36,000 naira';
  end if;
  if private.current_fee_bps('commission') <> 200 and now() >= v.effective_from then
    raise exception 'b3_money_policy_versions: current_fee_bps(commission) does not read the policy';
  end if;
  if (select guarantee_bps from public.money_policy) <> 0 then
    raise exception 'b3_money_policy_versions: the singleton still carries a Guarantee rate';
  end if;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname in ('money_policy_versions', 'money_policy_commission_rates', 'money_policy_withdrawal_bands')
     and c.relrowsecurity;
  if n <> 3 then raise exception 'b3_money_policy_versions: RLS is not on all three tables'; end if;
  select count(*) into n from pg_trigger where tgname in ('money_policy_versions_append_only', 'money_policy_commission_rates_append_only', 'money_policy_withdrawal_bands_append_only');
  if n <> 3 then raise exception 'b3_money_policy_versions: the append-only triggers did not land'; end if;
  select count(*) into n from pg_trigger where tgname in ('money_policy_versions_no_truncate', 'money_policy_commission_rates_no_truncate', 'money_policy_withdrawal_bands_no_truncate');
  if n <> 3 then raise exception 'b3_money_policy_versions: the no-truncate triggers did not land'; end if;
  if exists (select 1 from pg_constraint where conrelid = 'public.money_policy'::regclass and conname = 'money_policy_guarantee_bps_check')
     or not exists (select 1 from pg_constraint where conrelid = 'public.money_policy'::regclass and conname = 'money_policy_guarantee_bps_range') then
    raise exception 'b3_money_policy_versions: the singleton guarantee range was not relaxed to 0..200';
  end if;
  if exists (select 1 from unnest(array['public.money_policy_versions', 'public.money_policy_commission_rates', 'public.money_policy_withdrawal_bands']) t(name)
              cross join unnest(array['update', 'delete', 'truncate']) p(priv)
              where has_table_privilege('service_role', t.name, p.priv)
                 or has_table_privilege('authenticated', t.name, p.priv)
                 or has_table_privilege('anon', t.name, p.priv)) then
    raise exception 'b3_money_policy_versions: a role can still update, delete or truncate policy';
  end if;
  if has_function_privilege('anon', 'public.withdrawal_fee_quote(bigint,timestamptz)', 'execute')
     or has_function_privilege('anon', 'private.money_policy_append_only()', 'execute')
     or has_function_privilege('authenticated', 'private.money_policy_append_only()', 'execute') then
    raise exception 'b3_money_policy_versions: a function kept a default anon/member execute grant';
  end if;
  if has_table_privilege('authenticated', 'public.money_policy_versions', 'insert')
     or has_table_privilege('authenticated', 'public.money_policy_versions', 'update') then
    raise exception 'b3_money_policy_versions: members can write policy';
  end if;
end $$;
