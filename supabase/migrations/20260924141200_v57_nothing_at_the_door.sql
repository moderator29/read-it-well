-- V-57: "NOTHING AT THE DOOR". EVERY ARRIVAL CHARGE IS DECLARED, OR IT IS NOT OWED.
--
-- Price confirmed, then caution, cleaning, security and a power top-up at the
-- gate: the commonest stays complaint. The host now declares, as structured
-- fields, every charge a guest can be asked for on arrival, each in kobo or
-- "none", and the guest's booking says: at the door, nothing else; if you are
-- asked for money that is not on this page, do not pay, and report it.
--
-- A SIDE TABLE for both spines. A paid stay today is a booking on a nightly
-- LISTING (the hotel room path cannot reserve yet), so the declaration can hang
-- on a listing or on an accommodation, exactly one. `listings` and
-- `accommodations` are existing schema and are not altered.
--
-- A CLOSED KEY SET, no free text: caution, power, cleaning, extra_guest,
-- visitor. Each is {"none": true} or {"minor": <kobo>, "per": stay | night |
-- guest | unit}. `private.arrival_charges_valid` is the check, and a
-- declaration is only accepted with all five keys answered.
--
-- THE DOOR REPORT. A guest with a paid stay taps "I was asked for money at
-- the door": one row per booking, a medium risk alert on the booking, and a
-- high alert once for a host with three such reports in 90 days. The report
-- is recorded; the refund desk decides anything owed, as for every refund.

create or replace function private.arrival_charges_valid(p jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select jsonb_typeof(p) = 'object'
     and (select count(*) from jsonb_object_keys(p)) = 5
     and p ?& array['caution', 'power', 'cleaning', 'extra_guest', 'visitor']
     and not exists (
       select 1 from jsonb_each(p) e
        where not (
          jsonb_typeof(e.value) = 'object'
          and (
            (e.value = '{"none": true}'::jsonb)
            or (
              (select count(*) from jsonb_object_keys(e.value)) = 2
              and jsonb_typeof(e.value -> 'minor') = 'number'
              and (e.value ->> 'minor') ~ '^[1-9][0-9]{0,14}$'
              and (e.value ->> 'per') in ('stay', 'night', 'guest', 'unit')
            )
          )
        )
     );
$function$;

revoke all on function private.arrival_charges_valid(jsonb) from public, anon, authenticated;

create table if not exists public.arrival_charge_declarations (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid unique references public.listings(id) on delete cascade,
  accommodation_id uuid unique references public.accommodations(id) on delete cascade,
  charges          jsonb not null check (private.arrival_charges_valid(charges)),
  declared_by      uuid not null,
  declared_at      timestamptz not null default now(),
  check ((listing_id is null) <> (accommodation_id is null))
);

comment on table public.arrival_charge_declarations is
  'V-57. Every charge a guest can be asked for on arrival at a stay, each in kobo or none, from a closed key set. On a nightly listing or an accommodation. Written through declare_arrival_charges by the owner.';

create table if not exists public.door_charge_reports (
  booking_id  uuid primary key references public.bookings(id) on delete cascade,
  reporter_id uuid not null,
  asked_minor bigint check (asked_minor is null or asked_minor > 0),
  created_at  timestamptz not null default now()
);

comment on table public.door_charge_reports is
  'V-57. A guest reporting they were asked for money at the door that the booking did not declare. One per booking; raises a risk alert. Append-only.';

alter table public.arrival_charge_declarations enable row level security;
alter table public.door_charge_reports enable row level security;
revoke all on public.arrival_charge_declarations, public.door_charge_reports from public, anon, authenticated;
grant select on public.arrival_charge_declarations to anon, authenticated;
grant select on public.door_charge_reports to authenticated;
grant all on public.arrival_charge_declarations, public.door_charge_reports to service_role;

/* A published stay's declaration is public: it is what the guest is promised. */
create policy arrival_charge_declarations_public_read on public.arrival_charge_declarations for select to anon, authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.status = 'PUBLISHED')
    or exists (select 1 from public.accommodations a where a.id = accommodation_id and a.status::text = 'PUBLISHED')
  );
create policy arrival_charge_declarations_owner_read on public.arrival_charge_declarations for select to authenticated
  using ((listing_id is not null and private.owns_listing(listing_id))
         or (accommodation_id is not null and private.owns_accommodation(accommodation_id))
         -- The review desk reads it before publishing: a stay is not published undeclared.
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
create policy door_charge_reports_read on public.door_charge_reports for select to authenticated
  using (reporter_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

create or replace function private.door_charge_reports_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  raise exception 'public.door_charge_reports is append-only' using errcode = '42501';
end;
$function$;

revoke all on function private.door_charge_reports_frozen() from public, anon, authenticated;

drop trigger if exists door_charge_reports_frozen on public.door_charge_reports;
create trigger door_charge_reports_frozen before update on public.door_charge_reports
  for each row execute function private.door_charge_reports_frozen();

/* ------------------------------------------------------------ the doors */

/* The owner declares (or redeclares) all five. One of listing or accommodation. */
create or replace function public.declare_arrival_charges(p_listing uuid, p_accommodation uuid, p_charges jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if (p_listing is null) = (p_accommodation is null) then
    return jsonb_build_object('status', 'bad_target');
  end if;
  if p_listing is not null and not private.owns_listing(p_listing) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_accommodation is not null and not private.owns_accommodation(p_accommodation) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_charges is null or not private.arrival_charges_valid(p_charges) then
    return jsonb_build_object('status', 'incomplete');
  end if;
  if p_listing is not null then
    insert into public.arrival_charge_declarations (listing_id, charges, declared_by)
    values (p_listing, p_charges, (select auth.uid()))
    on conflict (listing_id) do update set charges = excluded.charges, declared_by = excluded.declared_by, declared_at = now();
  else
    insert into public.arrival_charge_declarations (accommodation_id, charges, declared_by)
    values (p_accommodation, p_charges, (select auth.uid()))
    on conflict (accommodation_id) do update set charges = excluded.charges, declared_by = excluded.declared_by, declared_at = now();
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* The guest reports money asked at the door. Their own paid stay, not a rent charge. */
create or replace function public.report_door_charge(p_booking uuid, p_asked bigint default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  b public.bookings%rowtype;
  lister uuid;
  recent int;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or b.guest_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
     or not exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL') then
    return jsonb_build_object('status', 'not_a_paid_stay');
  end if;
  if p_asked is not null and p_asked <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  begin
    insert into public.door_charge_reports (booking_id, reporter_id, asked_minor)
    values (b.id, b.guest_id, p_asked);
  exception when unique_violation then
    return jsonb_build_object('status', 'already_reported');
  end;

  begin
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('medium', 'open', 'A guest was asked for money at the door',
            format('Booking %s: the guest reports being asked for %s at arrival that the booking did not declare.',
                   b.id, coalesce(p_asked::text || ' kobo', 'money')),
            'booking', b.id::text);
    select a.user_id into lister from public.listings l join public.agents a on a.id = l.agent_id where l.id = b.listing_id;
    select count(*) into recent
      from public.door_charge_reports r join public.bookings b2 on b2.id = r.booking_id
     where b2.listing_id = b.listing_id and r.created_at > now() - interval '90 days';
    if recent >= 3 and not exists (
      select 1 from public.risk_alerts a
       where a.entity_type = 'door_charge_pattern' and a.entity_id = b.listing_id::text
         and a.created_at > now() - interval '90 days') then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A host keeps asking for money at the door',
              format('Listing %s (lister %s): %s door-charge reports in 90 days.', b.listing_id, lister, recent),
              'door_charge_pattern', b.listing_id::text);
    end if;
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.declare_arrival_charges(uuid, uuid, jsonb) from public, anon;
revoke all on function public.report_door_charge(uuid, bigint) from public, anon;
grant execute on function public.declare_arrival_charges(uuid, uuid, jsonb) to authenticated;
grant execute on function public.report_door_charge(uuid, bigint) to authenticated;
