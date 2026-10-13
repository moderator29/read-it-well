-- DRAFT, not applied. PAY ON VALLO 5 of 8. Needs pov03.
-- Ruling 2 puts a shortlet stay on escrow by default, so the protected
-- payment, built for rentals, has to carry a stay at a listing too:
--
-- 1. public.provider_arrangement_open: a stay agreement at a LISTING may be
--    held (a hotel room stays card only), and nothing opens unless the
--    agreement's rail is escrow now (a payer who chose card is never also
--    put into escrow). Copied from the live definition; only the kind check
--    and the rail check change.
-- 2. private.booking_is_paid: a stay whose money the partner holds is paid
--    for the trip details, the gate directions and the review, exactly as a
--    settled card charge is. Read by my_stay_details,
--    can_see_listing_access and reviews_insert_own, which are unchanged.
-- 3. bookings_00_escrow_keeps_the_stay: the hold sweep
--    (private.expire_booking_holds, unchanged) would cancel an instant stay
--    whose money is in escrow, because it looks only for a card charge. A
--    status change to CANCELLED on a stay whose money the partner holds is
--    skipped for the sweep (the row is left as it is and the sweep moves on)
--    and refused for everyone else with a reason (escrow_held): a held stay
--    is unwound through its held payment, never by a plain cancel. An
--    arrangement opened in the last two hours and not yet funded is skipped
--    for the sweep only, so the guest can finish funding; the guest may still
--    cancel it.
-- Probe: supabase/tests/probes-pending/pov05-escrow-for-shortlet-stays.sql
set lock_timeout = '5s';

create or replace function public.provider_arrangement_open(p_agreement uuid, p_kind text, p_milestones jsonb default null::jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  ag public.deal_agreements%rowtype;
  live public.provider_arrangements%rowtype;
  buyer text;
  seller text;
  arr public.provider_arrangements%rowtype;
  m jsonb;
  pos int := 0;
  total bigint := 0;
begin
  if not private.rentals_protected_pay_on() then
    return jsonb_build_object('status', 'switched_off');
  end if;
  if p_kind not in ('standard', 'milestone') then
    return jsonb_build_object('status', 'bad_request');
  end if;
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- A rental, or (13 October 2026, ruling 2) a stay at a listing. A hotel
  -- room is paid by card (ruling 3).
  if ag.status <> 'approved' or not (ag.kind = 'rent' or (ag.kind = 'stay' and ag.listing_id is not null)) then
    return jsonb_build_object('status', 'not_payable', 'kind', ag.kind, 'agreement_status', ag.status);
  end if;
  -- Escrow only when the rail is escrow now: the payer's card choice is never
  -- also held.
  if private.rail_for_agreement(ag.id) is distinct from 'escrow' then
    return jsonb_build_object('status', 'not_escrow');
  end if;
  select * into live from public.provider_arrangements
   where agreement_id = ag.id and status not in ('failed', 'cancelled');
  if live.id is not null then
    -- Never a second arrangement: the caller resolves this one.
    return jsonb_build_object('status', 'exists', 'id', live.id, 'reference', live.reference,
                              'arrangement_status', live.status);
  end if;
  -- create-escrow: amounts are naira, minimum 1000 (100000 kobo).
  if ag.amount_minor < 100000 then
    return jsonb_build_object('status', 'below_provider_minimum');
  end if;
  select f.provider_customer_id into buyer from public.financial_provider_accounts f
   where f.user_id = ag.renter_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if buyer is null then
    return jsonb_build_object('status', 'buyer_not_onboarded');
  end if;
  select f.provider_customer_id into seller from public.financial_provider_accounts f
   where f.user_id = ag.owner_id and f.provider = 'payluk' and f.status = 'ACTIVE';
  if seller is null then
    return jsonb_build_object('status', 'seller_not_onboarded');
  end if;

  if p_kind = 'milestone' then
    -- create-milestone-escrow: at least 2, each at least 1 naira, summing to the amount.
    if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' or jsonb_array_length(p_milestones) < 2
       or jsonb_array_length(p_milestones) > 24 then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'count');
    end if;
    for m in select value from jsonb_array_elements(p_milestones) loop
      if jsonb_typeof(m -> 'amount_minor') <> 'number' or (m ->> 'amount_minor')::numeric <> floor((m ->> 'amount_minor')::numeric)
         or (m ->> 'amount_minor')::bigint < 100
         or length(btrim(coalesce(m ->> 'title', ''))) not between 1 and 120 then
        return jsonb_build_object('status', 'bad_milestones', 'reason', 'item');
      end if;
      total := total + (m ->> 'amount_minor')::bigint;
    end loop;
    if total <> ag.amount_minor then
      return jsonb_build_object('status', 'bad_milestones', 'reason', 'sum');
    end if;
  elsif p_milestones is not null then
    return jsonb_build_object('status', 'bad_milestones', 'reason', 'standard_has_none');
  end if;

  insert into public.provider_arrangements (agreement_id, kind, reference, amount_minor,
                                            buyer_user_id, seller_user_id, buyer_customer_id, seller_customer_id)
  values (ag.id, p_kind, 'vallo-arr-' || replace(gen_random_uuid()::text, '-', ''), ag.amount_minor,
          ag.renter_id, ag.owner_id, buyer, seller)
  returning * into arr;
  if p_kind = 'milestone' then
    for m in select value from jsonb_array_elements(p_milestones) loop
      pos := pos + 1;
      insert into public.provider_arrangement_milestones (arrangement_id, position, title, description, amount_minor)
      values (arr.id, pos, btrim(m ->> 'title'), nullif(btrim(coalesce(m ->> 'description', '')), ''),
              (m ->> 'amount_minor')::bigint);
    end loop;
  end if;
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  values (arr.id, null, 'preparing', 'vallo',
          jsonb_build_object('agreement_id', ag.id, 'kind', p_kind, 'amount_minor', ag.amount_minor));
  return jsonb_build_object('status', 'ok', 'id', arr.id, 'reference', arr.reference, 'amount_minor', arr.amount_minor,
                            'buyer_customer_id', buyer, 'seller_customer_id', seller);
end
$fn$;

/* The statuses at which the partner holds (or has paid out) the money. */
create or replace function private.booking_escrow_funded(p_booking uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select exists (
    select 1 from public.provider_arrangements pa
      join public.deal_agreements a on a.id = pa.agreement_id
     where a.booking_id = p_booking
       and pa.status in ('payment_processing', 'protected', 'release_requested', 'released', 'disputed', 'split'));
$fn$;

create or replace function private.booking_is_paid(p_booking uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select exists (select 1 from public.transactions t where t.booking_id = p_booking and t.status = 'SUCCESSFUL')
      or exists (select 1 from public.provider_arrangements pa
                   join public.deal_agreements a on a.id = pa.agreement_id
                  where a.booking_id = p_booking
                    and pa.status in ('protected', 'release_requested', 'released', 'disputed', 'split'));
$fn$;

/* Whether this statement is the hold sweep: the sweep's own marker, or the
   statement that called it (the cron route calls public.expire_booking_holds
   through the API, and the sweep's body cannot be replaced from here without
   copying a statement the connector stalls on). */
create or replace function private.in_hold_sweep()
 returns boolean
 language sql
 stable
 set search_path to ''
as $fn$
  select coalesce(current_setting('vallo.hold_sweep', true), '') = 'on'
      or coalesce(current_query(), '') ~* 'expire_booking_holds';
$fn$;

create or replace function private.bookings_escrow_keeps_the_stay()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  if new.status is distinct from 'CANCELLED' or old.status not in ('PENDING', 'CONFIRMED') then
    return new;
  end if;
  if private.booking_escrow_funded(new.id) then
    if private.in_hold_sweep() then
      -- The sweep looks for a card charge only: leave a held stay as it is.
      return null;
    end if;
    raise exception 'escrow_held: this stay''s payment is held by the escrow partner; it is unwound through the held payment'
      using errcode = '42501';
  end if;
  if private.in_hold_sweep()
     and exists (select 1 from public.provider_arrangements pa
                   join public.deal_agreements a on a.id = pa.agreement_id
                  where a.booking_id = new.id and pa.status in ('preparing', 'awaiting_payment', 'unknown')
                    and pa.created_at > now() - interval '2 hours') then
    -- Escrow opened and not funded yet: the guest has two hours to finish.
    return null;
  end if;
  return new;
end;
$fn$;

create or replace trigger bookings_00_escrow_keeps_the_stay
  before update of status on public.bookings
  for each row execute function private.bookings_escrow_keeps_the_stay();

revoke all on function private.booking_escrow_funded(uuid) from public, anon, authenticated;
revoke all on function private.bookings_escrow_keeps_the_stay() from public, anon, authenticated;
revoke all on function private.in_hold_sweep() from public, anon, authenticated;
-- booking_is_paid keeps its live grants (authenticated reads it inside reviews_insert_own).
grant execute on function private.booking_is_paid(uuid) to authenticated, service_role;
