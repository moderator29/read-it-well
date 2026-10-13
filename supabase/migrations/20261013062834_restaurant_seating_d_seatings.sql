-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- ============================================================ 2. the seating
create table if not exists public.reservation_seatings (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  check_in_code text not null check (check_in_code ~ '^[0-9]{6}$'),
  outcome text check (outcome in ('SEATED', 'NO_SHOW')),
  outcome_by text check (outcome_by in ('code', 'restaurant', 'diner', 'bill', 'admin')),
  outcome_at timestamptz,
  seated_guests integer check (seated_guests > 0),
  restaurant_answer text check (restaurant_answer in ('SEATED', 'NO_SHOW')),
  restaurant_answered_at timestamptz,
  diner_asked_at timestamptz,
  diner_answer text check (diner_answer in ('dined', 'did_not_dine')),
  diner_answered_at timestamptz,
  disputed_at timestamptz,
  dispute_resolved_at timestamptz,
  dispute_resolved_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists reservation_seatings_seated_idx
  on public.reservation_seatings (business_id, outcome_at) where outcome = 'SEATED';
create index if not exists reservation_seatings_code_idx on public.reservation_seatings (check_in_code);
create index if not exists reservation_seatings_disputed_idx
  on public.reservation_seatings (disputed_at) where disputed_at is not null and dispute_resolved_at is null;

alter table public.reservation_seatings enable row level security;
create policy reservation_seatings_guest on public.reservation_seatings for select to authenticated
  using (exists (select 1 from public.reservations r
                  where r.id = reservation_seatings.reservation_id and r.guest_id = (select auth.uid())));
create policy reservation_seatings_host on public.reservation_seatings for select to authenticated
  using (exists (select 1 from public.reservations r
                  where r.id = reservation_seatings.reservation_id
                    and ((r.business_id is not null and private.owns_business(r.business_id))
                         or (r.listing_id is not null and exists (
                               select 1 from public.listings l
                                where l.id = r.listing_id and private.listing_agent_is_me(l.agent_id))))));
create policy reservation_seatings_staff on public.reservation_seatings for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
revoke all on public.reservation_seatings from anon, authenticated;
grant select on public.reservation_seatings to authenticated;

-- A short code the diner shows at the door: six digits, made with the row.
create or replace function private.new_check_in_code()
returns text language sql volatile set search_path to '' as $$
  select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::bigint % 1000000))::text, 6, '0');
$$;
revoke all on function private.new_check_in_code() from public, anon, authenticated;

create or replace function private.reservation_gets_a_code()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
  values (new.id, new.business_id, private.new_check_in_code())
  on conflict (reservation_id) do nothing;
  return new;
end $$;
revoke all on function private.reservation_gets_a_code() from public, anon, authenticated;

create trigger reservations_50_check_in_code
  after insert on public.reservations
  for each row execute function private.reservation_gets_a_code();

-- Every table still ahead, or waiting for its answer, gets its code now.
insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
select r.id, r.business_id, private.new_check_in_code()
  from public.reservations r
 where r.status in ('PENDING', 'CONFIRMED')
on conflict (reservation_id) do nothing;
