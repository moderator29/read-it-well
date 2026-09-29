-- V-29, REVIEW FIX: ONLY THE CEILING STOPS THE COPIES QUIETLY.
--
-- duplicate_listing stopped on ANY error inside a copy and reported the
-- copies before it as a partial success, so a real fault read as "the limit
-- stopped the rest". Now only program_limit_exceeded (the per-person insert
-- ceiling, listings_limit_member_inserts) stops the run and keeps what was
-- made; every other error is raised and the whole call rolls back.

create or replace function public.duplicate_listing(p_listing uuid, p_copies integer)
returns uuid[]
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  me uuid;
  wanted integer := least(greatest(coalesce(p_copies, 1), 1), 20);
  made uuid[] := '{}';
  fresh uuid;
  i integer;
begin
  if caller is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  select a.id into me from public.agents a where a.user_id = caller;
  if me is null or not exists (
    select 1 from public.listings l where l.id = p_listing and l.agent_id = me and l.is_demo = false
  ) then
    raise exception 'not your listing' using errcode = '42501';
  end if;

  for i in 1..wanted loop
    begin
      insert into public.listings (
        agent_id, status, title, description, property_type, state_code, city, area, address, landmark,
        latitude, longitude, bedrooms, bathrooms, rate_minor, rate_period, power_grid, power_backup,
        power_backup_hours, water_supply, prepaid_meter, has_estate_access, listing_intent,
        rent_amount_minor, rent_period, rent_negotiable, caution_deposit_minor, service_charge_minor,
        service_charge_period, agency_fee_minor, legal_fee_minor, agreement_fee_minor,
        total_move_in_cost_minor, minimum_tenancy_months, available_from, furnished, sale_price_minor,
        price_negotiable, tenure, year_built, sale_status, size_sqm, toilets, parking_spaces, floor,
        total_floors, condition, sale_agency_fee_minor, sale_legal_fee_minor,
        governors_consent_fee_minor, stamp_duty_minor, survey_registration_fee_minor,
        total_purchase_cost_minor)
      select
        me, 'DRAFT'::public.listing_status, l.title, l.description, l.property_type, l.state_code, l.city, l.area, l.address, l.landmark,
        l.latitude, l.longitude, l.bedrooms, l.bathrooms, l.rate_minor, l.rate_period, l.power_grid, l.power_backup,
        l.power_backup_hours, l.water_supply, l.prepaid_meter, l.has_estate_access, l.listing_intent,
        l.rent_amount_minor, l.rent_period, l.rent_negotiable, l.caution_deposit_minor, l.service_charge_minor,
        l.service_charge_period, l.agency_fee_minor, l.legal_fee_minor, l.agreement_fee_minor,
        l.total_move_in_cost_minor, l.minimum_tenancy_months, l.available_from, l.furnished, l.sale_price_minor,
        l.price_negotiable, l.tenure, l.year_built, l.sale_status, l.size_sqm, l.toilets, l.parking_spaces, l.floor,
        l.total_floors, l.condition, l.sale_agency_fee_minor, l.sale_legal_fee_minor,
        l.governors_consent_fee_minor, l.stamp_duty_minor, l.survey_registration_fee_minor,
        l.total_purchase_cost_minor
        from public.listings l
       where l.id = p_listing
      returning id into fresh;

      insert into public.listing_amenities (listing_id, amenity_id)
      select fresh, la.amenity_id from public.listing_amenities la where la.listing_id = p_listing;

      insert into public.listing_access (listing_id, estate_name, gate_directions, security_phone, access_code)
      select fresh, ac.estate_name, ac.gate_directions, ac.security_phone, ac.access_code
        from public.listing_access ac where ac.listing_id = p_listing;

      made := made || fresh;
    exception when program_limit_exceeded then
      -- The per-person ceiling: stop here and keep what was made. Anything
      -- else is a fault, not a limit, and is raised so nothing half-made is
      -- reported as a partial success.
      exit;
    end;
  end loop;

  return made;
end;
$function$;

revoke all on function public.duplicate_listing(uuid, integer) from public, anon;
grant execute on function public.duplicate_listing(uuid, integer) to authenticated;
