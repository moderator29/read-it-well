-- M7 of the two-side platform: restaurants as businesses, their opening
-- hours with covers, and reservations that point at a business.
--
-- A RESTAURANT IS A BUSINESS ROW with kind = 'restaurant' and one row here in
-- restaurant_profiles: cuisines, a price band (a band, never a fake amount,
-- the Places lesson), a menu link, and the facts a Nigerian diner asks first:
-- parking, power backup, outdoor seating.
--
-- SERVICE WINDOWS are the lean slot engine: for each weekday, when the kitchen
-- opens, when it stops seating, when it closes, and how many covers it offers
-- in that window. A restaurant may have several windows a day (lunch and
-- dinner). A window stays inside one calendar day (closes > opens), which is
-- deliberately simpler than a window crossing midnight; a venue serving past
-- midnight lists a window that ends at 23:59 and takes its last seating
-- before it.
--
-- RESERVATIONS GAIN business_id. Additive nullable FK, an index, and the CHECK
-- that exactly one of listing_id or business_id is set. That CHECK needs
-- listing_id to be nullable: reservations holds zero rows (live-verified) and
-- is not on the money path, so the relaxation is taken here rather than
-- gated. Every existing writer sends listing_id and keeps working; the
-- existing unique index on (listing_id, guest_id, reserved_for) treats a null
-- listing_id as distinct, so it neither blocks nor covers business rows,
-- which get their own.
--
-- private.reservation_is_valid GAINS A BRANCH and keeps its listing path
-- statement for statement. A business_id reservation requires kind =
-- restaurant, status PUBLISHED, source first_party (the trigger's existing
-- first-party-only law carried into the business era) and not an example.
-- Capacity is checked against the service window the moment falls in:
-- the covers already held (PENDING or CONFIRMED, same window, same Lagos day)
-- plus this party must fit. The past-time check is shared by both paths.
--
-- private.notify_reservation is taught the business path the same way: host
-- is businesses.owner_id, venue is businesses.name. Copy unchanged.
--
-- RLS. restaurant_profiles and service_windows read publicly when the
-- business is PUBLISHED (a signed-out diner reads hours), owner and admin
-- write. reservations gain business-owner select and update policies beside
-- the listing-host ones.

create table public.restaurant_profiles (
  business_id  uuid primary key references public.businesses (id) on delete cascade,
  cuisines     text[] not null default '{}'::text[] check (cardinality(cuisines) <= 12),
  price_band   smallint check (price_band is null or price_band between 1 and 4),
  menu_url     text check (menu_url is null or (length(menu_url) <= 500 and menu_url ~ '^https://')),
  dress_code   text check (dress_code is null or length(dress_code) <= 120),
  parking      boolean not null default false,
  power_backup boolean not null default false,
  outdoor      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.restaurant_profiles is
  'The restaurant facts for a business of kind restaurant: cuisines, a price band (1 to 4, never an amount), menu link, dress code, parking, power backup, outdoor seating.';

create trigger restaurant_profiles_set_updated_at
  before update on public.restaurant_profiles
  for each row execute function public.set_updated_at();

-- Only a restaurant carries a restaurant profile.
create or replace function private.restaurant_profile_needs_a_restaurant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  k public.business_kind;
begin
  select b.kind into k from public.businesses b where b.id = new.business_id;
  if k is null then
    raise exception 'profile refers to a business that does not exist' using errcode = 'foreign_key_violation';
  end if;
  if k <> 'restaurant' then
    raise exception 'Only a restaurant carries a restaurant profile, not a %.', k using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger restaurant_profiles_need_a_restaurant
  before insert or update of business_id on public.restaurant_profiles
  for each row execute function private.restaurant_profile_needs_a_restaurant();

create table public.service_windows (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  opens        time not null,
  last_seating time not null,
  closes       time not null,
  covers       integer not null check (covers > 0 and covers <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, weekday, opens),
  constraint service_windows_order_chk check (opens < closes and last_seating >= opens and last_seating <= closes)
);

comment on table public.service_windows is
  'When a restaurant seats people and how many covers it offers: one row per weekday (0 is Sunday, as extract(dow)) per service. A window stays inside one day.';

create index service_windows_business_idx on public.service_windows (business_id, weekday);

create trigger service_windows_set_updated_at
  before update on public.service_windows
  for each row execute function public.set_updated_at();

create trigger service_windows_need_a_restaurant
  before insert or update of business_id on public.service_windows
  for each row execute function private.restaurant_profile_needs_a_restaurant();

/* --------------------------------------------- reservations.business_id */

alter table public.reservations
  add column business_id uuid references public.businesses (id) on delete cascade;

alter table public.reservations alter column listing_id drop not null;

alter table public.reservations
  add constraint reservations_exactly_one_target_chk
  check ((listing_id is null) <> (business_id is null));

create index reservations_business_time_idx
  on public.reservations (business_id, reserved_for)
  where business_id is not null;

create unique index reservations_no_double_booking_business_idx
  on public.reservations (business_id, guest_id, reserved_for)
  where status <> 'CANCELLED' and business_id is not null;

/* ------------------------------------- the validator, with its new branch */

create or replace function private.reservation_is_valid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  kind      public.property_type;
  state     public.listing_status;
  b_kind    public.business_kind;
  b_state   public.listing_status;
  b_source  public.source_kind;
  b_demo    boolean;
  local_at  timestamp;
  win       record;
  taken     integer;
begin
  if new.listing_id is not null then
    select property_type, status into kind, state
    from public.listings where id = new.listing_id;

    if kind is null then
      raise exception 'reservation refers to a listing that does not exist';
    end if;

    if kind <> 'restaurant' then
      raise exception 'only a restaurant takes reservations, not a %', kind;
    end if;

    if state <> 'PUBLISHED' then
      raise exception 'that restaurant is not published';
    end if;
  else
    select b.kind, b.status, b.source, b.is_demo into b_kind, b_state, b_source, b_demo
    from public.businesses b where b.id = new.business_id;

    if b_kind is null then
      raise exception 'reservation refers to a business that does not exist';
    end if;

    if b_kind <> 'restaurant' then
      raise exception 'only a restaurant takes reservations, not a %', b_kind;
    end if;

    if b_state <> 'PUBLISHED' then
      raise exception 'that restaurant is not published';
    end if;

    -- The first-party-only law, carried into the business era: a table at a
    -- partner venue is never held here.
    if b_source <> 'first_party' then
      raise exception 'only a first-party restaurant takes reservations here';
    end if;

    if b_demo then
      raise exception 'This restaurant is an example of what the catalogue will hold. No such venue is open, so no table can be held.'
        using errcode = 'check_violation';
    end if;

    -- Capacity against the service window, whenever the moment, the party or
    -- the standing of this reservation is being set. Cancelling never needs
    -- room. Lagos wall clock throughout, because that is where the kitchen is.
    if new.status in ('PENDING', 'CONFIRMED')
       and (tg_op = 'INSERT'
            or new.reserved_for is distinct from old.reserved_for
            or new.party_size is distinct from old.party_size
            or old.status not in ('PENDING', 'CONFIRMED')) then
      local_at := new.reserved_for at time zone 'Africa/Lagos';

      select sw.opens, sw.closes, sw.covers into win
      from public.service_windows sw
      where sw.business_id = new.business_id
        and sw.weekday = extract(dow from local_at)::smallint
        and sw.opens <= local_at::time
        and local_at::time <= sw.last_seating
      order by sw.opens desc
      limit 1;

      if win.covers is null then
        raise exception 'that restaurant does not seat guests at that time';
      end if;

      select coalesce(sum(r.party_size), 0) into taken
      from public.reservations r
      where r.business_id = new.business_id
        and r.id <> new.id
        and r.status in ('PENDING', 'CONFIRMED')
        and (r.reserved_for at time zone 'Africa/Lagos')::date = local_at::date
        and (r.reserved_for at time zone 'Africa/Lagos')::time >= win.opens
        and (r.reserved_for at time zone 'Africa/Lagos')::time <= win.closes;

      if taken + new.party_size > win.covers then
        raise exception 'that restaurant has no room for % more at that time', new.party_size;
      end if;
    end if;
  end if;

  -- Checked only when the moment itself is being set, so that confirming or
  -- cancelling a reservation whose time has since passed still works. A venue
  -- must be able to close off yesterday's list.
  if (tg_op = 'INSERT' or new.reserved_for is distinct from old.reserved_for)
     and new.reserved_for <= now() then
    raise exception 'a table cannot be reserved in the past';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

/* ------------------------------------------ the notifier, both spines */

create or replace function private.notify_reservation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  host_user uuid;
  venue     text;
  guest     text;
  party     text;
  at_local  text;
  host_href text := '/agent/bookings';
begin
  if new.listing_id is not null then
    select a.user_id, l.title
      into host_user, venue
    from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = new.listing_id;
  else
    select b.owner_id, b.name
      into host_user, venue
    from public.businesses b
    where b.id = new.business_id;
    host_href := '/host/reservations';
  end if;

  /* Rendered in Lagos, never in the server's zone, so the hour in the
     notification is the hour the kitchen will serve it. */
  at_local := to_char(new.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI');
  party := new.party_size || case when new.party_size = 1 then ' guest' else ' guests' end;
  guest := coalesce(
    (select p.display_name from public.profiles p where p.id = new.guest_id),
    'A guest'
  );

  if tg_op = 'INSERT' then
    perform private.notify(
      host_user,
      'booking',
      'Table requested at ' || coalesce(venue, 'your restaurant'),
      guest || ' asked for ' || party || ' on ' || at_local || '. Nothing is held until you accept.',
      host_href
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is confirmed',
        coalesce(venue, 'The restaurant') || ' is expecting ' || party || ' on ' || at_local || '.',
        '/bookings'
      );
    elsif new.status = 'CANCELLED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is not going ahead',
        coalesce(venue, 'The restaurant') || ' on ' || at_local || ' is cancelled. Message them if you want to try another time.',
        '/bookings'
      );
    end if;
  end if;

  return new;
end;
$function$;

/* ----------------------------------------------------------------- RLS */

alter table public.restaurant_profiles enable row level security;
alter table public.service_windows     enable row level security;

create policy restaurant_profiles_select
  on public.restaurant_profiles for select
  using (
    exists (select 1 from public.businesses b where b.id = restaurant_profiles.business_id and b.status = 'PUBLISHED')
    or private.owns_business(business_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy restaurant_profiles_write
  on public.restaurant_profiles for all
  using (private.owns_business(business_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_business(business_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy service_windows_select
  on public.service_windows for select
  using (
    exists (select 1 from public.businesses b where b.id = service_windows.business_id and b.status = 'PUBLISHED')
    or private.owns_business(business_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy service_windows_write
  on public.service_windows for all
  using (private.owns_business(business_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_business(business_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy reservations_select_business_host
  on public.reservations for select to authenticated
  using (business_id is not null and private.owns_business(business_id));

create policy reservations_update_business_host
  on public.reservations for update to authenticated
  using (business_id is not null and private.owns_business(business_id))
  with check (business_id is not null and private.owns_business(business_id));
