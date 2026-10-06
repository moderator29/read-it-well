-- THE RAIL AT OPEN, ENFORCED BY THE DATABASE (Session 2, 7.4; Round 3 R3-20).
--
-- The app resolves the rail before opening a card payment
-- (apps/web/src/lib/payments/split-attempt.ts quoteSplit -> router.ts) and
-- writes transactions.rail and rail_policy_id. This is the backstop for every
-- path that does not: a new Paystack attempt must carry rail = 'direct' and the
-- policy row that the resolver returns for its booking TODAY. Anything else,
-- including an escrow answer (Paystack cannot hold) and a booking the policy
-- cannot place, is refused. Fail closed, exactly as the router.
--
-- Exempt, as transactions_payment_gate already exempts it: the settlement
-- path recording a charge Paystack already took for an unknown reference
-- (vallo.recording_unknown_charge = 'on'). Money already taken is recorded,
-- never refused.
--
-- A NULL RAIL IS STAMPED, NOT REFUSED (defence in depth). An attempt that
-- arrives with neither rail nor rail_policy_id, and whose booking resolves to
-- DIRECT today, is written with rail = 'direct' and the resolving policy id.
-- An escrow answer or no answer is still refused, and a caller that supplied a
-- rail or policy different from the resolver's is refused. The app writes the
-- rail itself on every path: split-attempt.ts quoteSplit and, for flatmate
-- rent shares, lib/tenancy/share-checkout.ts (same router and railGate).
--
-- Live routing (checked 2026-10-06): rent on apartment and hotel listings, and
-- room bookings at hotel / serviced-apartment businesses (lister kind
-- business), resolve to DIRECT; rent on home, rental, shortlet, villa, office
-- and shop resolves to ESCROW, which is refused until escrow is live. Business
-- kinds the router does not map (guest_house, resort, ...) resolve to no rail
-- and are refused, as in the app.
--
-- DEPLOY PRECONDITION: apply only after the app build that writes rail and
-- rail_policy_id (split-attempt.ts and share-checkout.ts) is DEPLOYED, not
-- just merged.
--
-- Additive, idempotent.
-- Probe: supabase/tests/probes-pending/b2-rail-at-open.sql (promote to
-- supabase/tests/probes/ with the migration).

set local lock_timeout = '5s';

-- The policy's inputs for a booking: its listing, or the business behind a
-- room booking. NULLs where it cannot be said, which resolves to no rail.
create or replace function private.rail_for_booking(p_booking uuid, out rail text, out policy_id uuid)
returns record
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  v_listing uuid;
  v_acc uuid;
  v_kind text;
  r record;
begin
  select b.listing_id, b.accommodation_id into v_listing, v_acc from public.bookings b where b.id = p_booking;
  if v_listing is not null then
    select l.property_type, l.listing_intent, a.type
      into v_pt, v_li, v_lk
      from public.listings l left join public.agents a on a.id = l.agent_id
     where l.id = v_listing;
  elsif v_acc is not null then
    select bz.kind::text into v_kind
      from public.accommodations ac join public.businesses bz on bz.id = ac.business_id
     where ac.id = v_acc;
    v_pt := case v_kind when 'hotel' then 'hotel' when 'restaurant' then 'restaurant'
                        when 'serviced_apartments' then 'apartment' end::public.property_type;
    v_li := 'rent';
    v_lk := 'business';
  end if;
  if v_pt is null or v_li is null then
    rail := null; policy_id := null;
    return;
  end if;
  r := public.resolve_payment_rail(v_pt, v_li, v_lk);
  rail := r.rail;
  policy_id := r.policy_id;
end;
$function$;

revoke all on function private.rail_for_booking(uuid) from public, anon, authenticated;

create or replace function private.transactions_rail_at_open()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
begin
  if coalesce(current_setting('vallo.recording_unknown_charge', true), '') = 'on' then
    return new;
  end if;
  if new.provider <> 'paystack' then
    return new;
  end if;
  r := private.rail_for_booking(new.booking_id);
  if r.rail is null then
    raise exception 'rail_at_open: no rail resolves for this booking, so no payment opens' using errcode = '42501';
  end if;
  if r.rail <> 'direct' then
    raise exception 'rail_at_open: this booking is on the % rail, which a Paystack charge cannot carry', r.rail using errcode = '42501';
  end if;
  if new.rail is null and new.rail_policy_id is null then
    new.rail := 'direct';
    new.rail_policy_id := r.policy_id;
    return new;
  end if;
  if new.rail is distinct from 'direct' or new.rail_policy_id is distinct from r.policy_id then
    raise exception 'rail_at_open: a Paystack attempt must carry rail direct and the policy that resolved it' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.transactions_rail_at_open() from public, anon, authenticated;

create or replace trigger transactions_01_rail_at_open
  before insert on public.transactions
  for each row execute function private.transactions_rail_at_open();

-- READ-BACK.
do $check$
begin
  if not exists (select 1 from pg_trigger where tgname = 'transactions_01_rail_at_open'
                  and tgrelid = 'public.transactions'::regclass and not tgisinternal and tgenabled = 'O') then
    raise exception 'rail-at-open trigger missing or disabled';
  end if;
  if has_function_privilege('anon', 'private.rail_for_booking(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.rail_for_booking(uuid)', 'execute') then
    raise exception 'rail_for_booking callable by an app role';
  end if;
  if has_function_privilege('anon', 'private.transactions_rail_at_open()', 'execute')
     or has_function_privilege('authenticated', 'private.transactions_rail_at_open()', 'execute') then
    raise exception 'transactions_rail_at_open callable by an app role';
  end if;
  if (private.rail_for_booking(gen_random_uuid())).rail is not null then
    raise exception 'an unknown booking resolved a rail';
  end if;
end;
$check$;
