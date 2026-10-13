-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create or replace function public.restaurant_bill_enter(p_reservation uuid, p_amount_minor bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  b public.restaurant_bills%rowtype;
  host boolean;
begin
  select * into r from public.reservations where id = p_reservation;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  host := private.reservation_is_mine_to_host(p_reservation);
  if not host and r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if r.status not in ('CONFIRMED', 'COMPLETED')
     or r.reserved_for > now() + interval '3 hours'
     or r.reserved_for < now() - interval '3 days' then
    return jsonb_build_object('status', 'not_open');
  end if;
  select * into b from public.restaurant_bills
   where reservation_id = p_reservation and status <> 'cancelled' for update;
  if b.id is not null then
    if b.status in ('pending', 'paid') then
      return jsonb_build_object('status', 'locked');
    end if;
    if not host and b.entered_by = 'restaurant' then
      return jsonb_build_object('status', 'locked');
    end if;
    update public.restaurant_bills
       set amount_minor = p_amount_minor,
           entered_by = case when host then 'restaurant' else 'diner' end,
           status = case when host then 'awaiting_payment' else 'awaiting_restaurant' end,
           confirmed_at = case when host then now() else null end,
           updated_at = now()
     where id = b.id;
    return jsonb_build_object('status', 'saved', 'bill_id', b.id);
  end if;
  insert into public.restaurant_bills (reservation_id, business_id, guest_id, amount_minor, entered_by, status, confirmed_at)
  values (r.id, r.business_id, r.guest_id, p_amount_minor,
          case when host then 'restaurant' else 'diner' end,
          case when host then 'awaiting_payment' else 'awaiting_restaurant' end,
          case when host then now() else null end)
  returning * into b;
  return jsonb_build_object('status', 'saved', 'bill_id', b.id);
end $$;
revoke all on function public.restaurant_bill_enter(uuid, bigint) from public, anon;
grant execute on function public.restaurant_bill_enter(uuid, bigint) to authenticated;

create or replace function public.restaurant_bill_confirm(p_bill uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
begin
  select * into b from public.restaurant_bills where id = p_bill for update;
  if b.id is null or not private.reservation_is_mine_to_host(b.reservation_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if b.status <> 'awaiting_restaurant' then
    return jsonb_build_object('status', 'already', 'bill_status', b.status);
  end if;
  update public.restaurant_bills set status = 'awaiting_payment', confirmed_at = now(), updated_at = now()
   where id = p_bill;
  return jsonb_build_object('status', 'confirmed');
end $$;
revoke all on function public.restaurant_bill_confirm(uuid) from public, anon;
grant execute on function public.restaurant_bill_confirm(uuid) to authenticated;

-- Service role only: the server opens the checkout after this answers ok.
create or replace function public.restaurant_bill_open(p_bill uuid, p_guest uuid, p_mode text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
  owner uuid;
  sub text;
  bps integer;
  commission bigint;
begin
  select * into b from public.restaurant_bills where id = p_bill for update;
  if b.id is null or b.guest_id is distinct from p_guest then
    return jsonb_build_object('status', 'not_found');
  end if;
  if b.status = 'pending' and b.provider_ref is not null then
    return jsonb_build_object('status', 'pending', 'reference', b.provider_ref, 'amount_minor', b.amount_minor,
                              'authorization_url', b.authorization_url, 'access_code', b.access_code);
  end if;
  if b.status = 'paid' then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if b.status <> 'awaiting_payment' then
    return jsonb_build_object('status', 'awaiting_restaurant');
  end if;
  select s.bill_commission_bps into bps from public.restaurant_money_settings s where s.id;
  if bps is null then
    return jsonb_build_object('status', 'not_priced');
  end if;
  select bz.owner_id into owner from public.businesses bz where bz.id = b.business_id;
  if owner is null then
    select a.user_id into owner
      from public.reservations r join public.listings l on l.id = r.listing_id join public.agents a on a.id = l.agent_id
     where r.id = b.reservation_id;
  end if;
  sub := private.payee_subaccount(owner);
  if sub is null then
    return jsonb_build_object('status', 'payee_not_set_up');
  end if;
  commission := (b.amount_minor * bps) / 10000;
  update public.restaurant_bills
     set status = 'pending', provider_ref = 'rm-bill-' || gen_random_uuid()::text, paystack_mode = p_mode,
         payee_user_id = owner, payee_subaccount_code = sub, commission_bps = bps,
         commission_minor = commission, restaurant_share_minor = b.amount_minor - commission,
         authorization_url = null, access_code = null, updated_at = now()
   where id = b.id
  returning * into b;
  return jsonb_build_object('status', 'ok', 'reference', b.provider_ref, 'amount_minor', b.amount_minor,
                            'payee_subaccount_code', b.payee_subaccount_code,
                            'restaurant_share_minor', b.restaurant_share_minor, 'commission_minor', b.commission_minor);
end $$;
revoke all on function public.restaurant_bill_open(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_open(uuid, uuid, text) to service_role;

create or replace function public.restaurant_bill_checkout_saved(p_reference text, p_url text, p_code text)
returns void language sql security definer set search_path to '' as $$
  update public.restaurant_bills set authorization_url = p_url, access_code = p_code, updated_at = now()
   where provider_ref = p_reference and status = 'pending';
$$;
revoke all on function public.restaurant_bill_checkout_saved(text, text, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_checkout_saved(text, text, text) to service_role;

-- A checkout that failed or was abandoned goes back to waiting for payment.
create or replace function public.restaurant_bill_reopen(p_reference text)
returns text language sql security definer set search_path to '' as $$
  with moved as (
    update public.restaurant_bills
       set status = 'awaiting_payment', provider_ref = null, authorization_url = null, access_code = null, updated_at = now()
     where provider_ref = p_reference and status = 'pending'
    returning 1)
  select case when exists (select 1 from moved) then 'changed' else 'unchanged' end;
$$;
revoke all on function public.restaurant_bill_reopen(text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_reopen(text) to service_role;
