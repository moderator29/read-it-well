-- V-55: A RECEIPT ANYONE CAN VERIFY, WITHOUT AN ADDRESS.
--
-- Nigerians are asked for proof of rent for employer housing allowances, visa
-- files, tribunal claims and a new landlord's references, and a fake rent
-- receipt takes a minute to make, which makes every receipt worthless. A
-- tenant who paid through Vallo can now mint a short code for their
-- tenancy's receipt, and anyone, signed in or not, can open
-- /r/<code> and see that it is genuine: the amount, the month it was paid,
-- the tenant's first name and last initial, the lister's display name, the
-- period, and the AREA. Never the address, the landmark, a phone number, an
-- email or a user id.
--
-- THE CODE IS TEN CROCKFORD CHARACTERS (50 random bits), shown as
-- VR-XXXXX-XXXXX. It is drawn from the random bytes of a v4 uuid, so no
-- extension is needed. Lookups are rate limited per caller and in total
-- (`private.consume_rate_limit`), so the space cannot be walked.
--
-- THE TENANT OWNS IT AND CAN REVOKE IT. A revoked code answers exactly as a
-- code that never existed.
--
-- WHAT IT RENDERS FROM: the ledger (`transactions` SUCCESSFUL on the charge's
-- booking), `rent_payments`, the tenancy snapshot's area, and display names.
-- Nothing the tenant typed.

create table if not exists public.receipt_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$'),
  subject_kind text not null check (subject_kind in ('rent_payment')),
  subject_id   uuid not null,
  owner_id     uuid not null,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

comment on table public.receipt_codes is
  'V-55. A short code a tenant mints so a third party can verify their Vallo rent receipt at /r/<code>. The verification page shows area-level facts only. Revocable by the owner; a revoked code answers as not found.';

create index if not exists receipt_codes_subject_idx on public.receipt_codes (subject_kind, subject_id);

alter table public.receipt_codes enable row level security;
revoke all on public.receipt_codes from public, anon, authenticated;
grant select on public.receipt_codes to authenticated;
grant all on public.receipt_codes to service_role;

drop policy if exists receipt_codes_owner_read on public.receipt_codes;
create policy receipt_codes_owner_read on public.receipt_codes for select to authenticated
  using (owner_id = (select auth.uid()));

/* ------------------------------------------------------------ mint and revoke */

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
  existing public.receipt_codes%rowtype;
  fresh text;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL') then
    return jsonb_build_object('status', 'not_paid');
  end if;
  select * into existing from public.receipt_codes
   where subject_kind = 'rent_payment' and subject_id = rp.id and revoked_at is null
   order by created_at desc limit 1;
  if existing.id is not null then
    return jsonb_build_object('status', 'ok', 'code', existing.code, 'id', existing.id);
  end if;
  for attempt in 1..5 loop
    fresh := private.new_receipt_code();
    begin
      insert into public.receipt_codes (code, subject_kind, subject_id, owner_id)
      values (fresh, 'rent_payment', rp.id, rp.tenant_id)
      returning * into existing;
      return jsonb_build_object('status', 'ok', 'code', existing.code, 'id', existing.id);
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

/* ------------------------------------------------------------ the check */

/* Anybody may ask; the answer is area-level facts about a genuine receipt,
   or "not found". `p_subject` is the caller's hashed address, supplied by the
   page's server; a direct caller who lies about it still meets the global cap. */
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

  select * into rc from public.receipt_codes where code = normalised and revoked_at is null;
  if rc.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into rp from public.rent_payments where id = rc.subject_id;
  if rp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select coalesce(sum(t.amount_minor), 0), min(t.created_at) into paid_minor, paid_at
    from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL';
  if paid_minor <= 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

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
    'paid_at', paid_at,
    'tenant', case when tenant_first is null then null
                   else tenant_first || coalesce(' ' || tenant_initial || '.', '') end,
    'lister', lister_name,
    'rent_period', rp.rent_period,
    'move_in', rp.move_in,
    'area', area,
    'city', city,
    'state_code', state_code,
    'parts', jsonb_strip_nulls(jsonb_build_object(
      'rent', rp.rent_minor, 'caution', rp.caution_minor, 'service', rp.service_minor,
      'agency', rp.agency_minor, 'legal', rp.legal_minor, 'agreement', rp.agreement_minor))
  );
end;
$function$;

revoke all on function public.verify_receipt(text, text) from public;
grant execute on function public.verify_receipt(text, text) to anon, authenticated;
