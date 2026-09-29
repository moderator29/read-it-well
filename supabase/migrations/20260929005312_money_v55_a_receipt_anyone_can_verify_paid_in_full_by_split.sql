-- MONEY 8 / V-55: A RECEIPT ANYONE CAN VERIFY, WITHOUT AN ADDRESS.
--
-- Supersedes the unapplied 20260924140700_v55 (moved to superseded/). It
-- touched no money; it is rebuilt on split settlement:
--
--   * a receipt exists only for a move-in PAID IN FULL by split
--     (`private.tenancy_paid`: one whole payment, or every V-86 share), and
--     never for one cancelled or refunded (`private.tenancy_void`), which
--     now answers exactly as a code that never existed;
--   * the amount is what the split charges settled (the sum of the
--     successful transactions), the month is when the LAST one settled, and
--     `paid_in_shares` says when flatmates paid their own parts;
--   * the area comes from the tenancy snapshot (MONEY 4).
--
-- The code is ten Crockford characters (50 random bits), only its sha256 is
-- kept, the tenant can revoke it, lookups are rate limited per caller and in
-- total, and the check is SERVICE ROLE ONLY (the page's server passes the
-- caller's hashed address as the rate-limit subject). Never the address, the
-- landmark, a phone number, an email or a user id.

create table if not exists public.receipt_codes (
  id           uuid primary key default gen_random_uuid(),
  code_hash    text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint    text not null check (code_hint ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{2}$'),
  subject_kind text not null check (subject_kind in ('rent_payment')),
  subject_id   uuid not null,
  owner_id     uuid not null,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);
comment on table public.receipt_codes is
  'V-55. A short code a tenant mints so a third party can verify their Vallo rent receipt at /r/<code>. Only the hash is kept. Revocable by the owner; a revoked code answers as not found.';
create index if not exists receipt_codes_subject_idx on public.receipt_codes (subject_kind, subject_id);
create index if not exists receipt_codes_owner_idx on public.receipt_codes (owner_id);

alter table public.receipt_codes enable row level security;
revoke all on public.receipt_codes from public, anon, authenticated;
grant select on public.receipt_codes to authenticated;
grant select, insert, update on public.receipt_codes to service_role;
drop policy if exists receipt_codes_owner_read on public.receipt_codes;
create policy receipt_codes_owner_read on public.receipt_codes for select to authenticated
  using (owner_id = (select auth.uid()));

create or replace function private.new_receipt_code()
returns text
language plpgsql
volatile
set search_path to ''
as $function$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  raw bytea := uuid_send(gen_random_uuid());
  code_out text := '';
  i int;
begin
  -- Bytes 0 to 5 and 9 to 12 of a v4 uuid carry no version or variant bits.
  foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12] loop
    code_out := code_out || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
  end loop;
  return code_out;
end;
$function$;
revoke all on function private.new_receipt_code() from public, anon, authenticated;

create or replace function public.create_receipt_code(p_rent_payment uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
  made public.receipt_codes%rowtype;
  fresh text;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.tenancy_paid(rp.id) or private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'not_paid');
  end if;
  update public.receipt_codes set revoked_at = now()
   where subject_kind = 'rent_payment' and subject_id = rp.id and revoked_at is null;
  for attempt in 1..5 loop
    fresh := private.new_receipt_code();
    begin
      insert into public.receipt_codes (code_hash, code_hint, subject_kind, subject_id, owner_id)
      values (encode(sha256(convert_to(fresh, 'UTF8')), 'hex'), right(fresh, 2), 'rent_payment', rp.id, rp.tenant_id)
      returning * into made;
      return jsonb_build_object('status', 'ok', 'code', fresh, 'id', made.id, 'hint', made.code_hint);
    exception when unique_violation then
      null;
    end;
  end loop;
  return jsonb_build_object('status', 'busy');
end;
$function$;

create or replace function public.revoke_receipt_code(p_code_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.receipt_codes set revoked_at = now()
   where id = p_code_id and owner_id = (select auth.uid()) and revoked_at is null;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.create_receipt_code(uuid) from public, anon;
revoke all on function public.revoke_receipt_code(uuid) from public, anon;
grant execute on function public.create_receipt_code(uuid) to authenticated;
grant execute on function public.revoke_receipt_code(uuid) to authenticated;

create or replace function public.verify_receipt(p_code text, p_subject text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  normalised text;
  rc public.receipt_codes%rowtype;
  rp public.rent_payments%rowtype;
  paid_minor bigint;
  paid_at timestamptz;
  payments int;
  tenant_first text;
  tenant_initial text;
  lister_name text;
  area text;
  city text;
  state_code text;
begin
  if not private.consume_rate_limit('receipt_verify_all', 'all', 3000, 3600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if not private.consume_rate_limit('receipt_verify', coalesce(nullif(left(p_subject, 80), ''), 'unknown'), 30, 600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  normalised := upper(coalesce(p_code, ''));
  normalised := regexp_replace(normalised, '^VR', '');
  normalised := regexp_replace(normalised, '[^0-9A-Z]', '', 'g');
  normalised := translate(normalised, 'OIL', '011');
  if normalised !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into rc from public.receipt_codes
   where code_hash = encode(sha256(convert_to(normalised, 'UTF8')), 'hex') and revoked_at is null;
  if rc.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into rp from public.rent_payments where id = rc.subject_id;
  if rp.id is null or not private.tenancy_paid(rp.id) or private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  select coalesce(sum(t.amount_minor), 0), max(t.created_at), count(*) into paid_minor, paid_at, payments
    from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL';
  select nullif(btrim(p.first_name), ''), left(nullif(btrim(p.surname), ''), 1)
    into tenant_first, tenant_initial
    from public.profiles p where p.id = rp.tenant_id;
  select a.display_name into lister_name
    from public.listings l join public.agents a on a.id = l.agent_id where l.id = rp.listing_id;
  select coalesce(s.listing ->> 'area', l.area), coalesce(s.listing ->> 'city', l.city), coalesce(s.listing ->> 'state_code', l.state_code)
    into area, city, state_code
    from public.listings l left join public.tenancy_snapshots s on s.rent_payment_id = rp.id
   where l.id = rp.listing_id;
  return jsonb_build_object(
    'status', 'ok',
    'kind', 'rent_payment',
    'paid_minor', paid_minor,
    'paid_at', date_trunc('month', paid_at),
    'paid_in_shares', payments > 1,
    'tenant', case when tenant_first is null then null else tenant_first || coalesce(' ' || tenant_initial || '.', '') end,
    'lister', lister_name,
    'rent_period', rp.rent_period,
    'move_in', rp.move_in,
    'area', area,
    'city', city,
    'state_code', state_code,
    'parts', jsonb_strip_nulls(jsonb_build_object(
      'rent', rp.rent_minor, 'caution', rp.caution_minor, 'service', rp.service_minor,
      'agency', rp.agency_minor, 'legal', rp.legal_minor, 'agreement', rp.agreement_minor)));
end;
$function$;
revoke all on function public.verify_receipt(text, text) from public, anon, authenticated;
grant execute on function public.verify_receipt(text, text) to service_role;

do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.receipt_codes'::regclass and relrowsecurity) then
    raise exception 'receipt_codes has no RLS';
  end if;
  if has_table_privilege('authenticated', 'public.receipt_codes', 'INSERT, UPDATE, DELETE')
     or has_table_privilege('anon', 'public.receipt_codes', 'SELECT') then
    raise exception 'receipt_codes is writable or anon-readable';
  end if;
  if has_function_privilege('authenticated', 'public.verify_receipt(text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.verify_receipt(text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.verify_receipt(text,text)', 'EXECUTE') then
    raise exception 'verify_receipt is open to the wrong role';
  end if;
end $$;
