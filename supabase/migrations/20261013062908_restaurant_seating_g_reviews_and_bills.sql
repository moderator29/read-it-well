-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- ============================================================ 6. reviews
-- Only a diner whose table was seated, and not under dispute, can review it.
create table if not exists public.reservation_reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  author_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reservation_reviews enable row level security;
create policy reservation_reviews_read on public.reservation_reviews for select to anon, authenticated
  using (hidden_at is null or author_id = (select auth.uid()));
revoke all on public.reservation_reviews from anon, authenticated;
grant select on public.reservation_reviews to anon, authenticated;

create or replace function public.reservation_review_leave(p_reservation uuid, p_rating integer, p_body text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
begin
  select * into r from public.reservations where id = p_reservation;
  if r.id is null or r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into s from public.reservation_seatings where reservation_id = p_reservation;
  if s.outcome is distinct from 'SEATED' or (s.disputed_at is not null and s.dispute_resolved_at is null) then
    return jsonb_build_object('status', 'not_seated');
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    return jsonb_build_object('status', 'bad_rating');
  end if;
  insert into public.reservation_reviews (reservation_id, business_id, listing_id, author_id, rating, body)
  values (r.id, r.business_id, r.listing_id, r.guest_id, p_rating, nullif(btrim(coalesce(p_body, '')), ''))
  on conflict (reservation_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already');
  end if;
  return jsonb_build_object('status', 'saved');
end $$;
revoke all on function public.reservation_review_leave(uuid, integer, text) from public, anon;
grant execute on function public.reservation_review_leave(uuid, integer, text) to authenticated;

-- ============================================================ 7. the bill
-- Entered by the restaurant (ready to pay at once) or by the diner (the
-- restaurant confirms it). Paid by the diner through Paystack, split straight
-- to the restaurant's own subaccount with Vallo's commission kept by Vallo.
-- A paid bill marks the table seated.
create table if not exists public.restaurant_bills (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete set null,
  guest_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 1000000000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  entered_by text not null check (entered_by in ('restaurant', 'diner')),
  status text not null check (status in ('awaiting_restaurant', 'awaiting_payment', 'pending', 'paid', 'cancelled')),
  confirmed_at timestamptz,
  provider_ref text unique,
  paystack_mode text,
  payee_user_id uuid,
  payee_subaccount_code text,
  commission_bps integer,
  commission_minor bigint,
  restaurant_share_minor bigint,
  authorization_url text,
  access_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists restaurant_bills_one_live
  on public.restaurant_bills (reservation_id) where status <> 'cancelled';
alter table public.restaurant_bills enable row level security;
create policy restaurant_bills_guest on public.restaurant_bills for select to authenticated
  using (guest_id = (select auth.uid()));
create policy restaurant_bills_host on public.restaurant_bills for select to authenticated
  using (private.reservation_is_mine_to_host(reservation_id));
create policy restaurant_bills_staff on public.restaurant_bills for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
revoke all on public.restaurant_bills from anon, authenticated;
grant select on public.restaurant_bills to authenticated;
