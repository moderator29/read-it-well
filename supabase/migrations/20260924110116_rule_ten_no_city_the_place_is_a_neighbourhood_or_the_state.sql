-- RULE 10, REVIEW FIX: NO CITY EITHER. THE PLACE IS A CLOSED-LIST
-- NEIGHBOURHOOD OR THE STATE.
--
-- 20260924121300 still let a city through when it was on a closed city list.
-- A city is text a lister typed too, so it goes: `share_door` returns no city
-- at all (the column stays, always null, so the row type is stable), and it
-- now returns the listing's STATE CODE (from the states table, never typed)
-- so the card can hold the neighbourhood to its own state. The place a card
-- prints is a closed-list neighbourhood in that state, else the state's name.
-- `private.public_city` gated nothing else and is dropped.

drop function if exists public.share_door(text);

create or replace function public.share_door(p_token text)
returns table (
  state                    text,     -- 'listing', 'stay', 'price_area' or 'gone'
  listing_id               uuid,
  reference                text,
  is_demo                  boolean,
  title                    text,
  area                     text,
  city                     text,
  state_name               text,
  property_type            text,
  listing_intent           text,
  bedrooms                 integer,
  rent_amount_minor        bigint,
  rent_period              text,
  caution_deposit_minor    bigint,
  service_charge_minor     bigint,
  service_charge_period    text,
  agency_fee_minor         bigint,
  legal_fee_minor          bigint,
  agreement_fee_minor      bigint,
  total_move_in_cost_minor bigint,
  sale_price_minor         bigint,
  rate_minor               bigint,
  rate_period              text,
  photo_path               text,
  price_share_id           uuid,
  power_grid               text,
  water_supply             text,
  state_code               text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  link_kind text;
  link_target uuid;
  wanted text := btrim(coalesce(p_token, ''));
  code text;
  target uuid;
  board_open boolean;
begin
  -- A listing code, at the door, only while the board flag says true.
  if upper(wanted) ~ '^VL-?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$' then
    select coalesce((select f.enabled from public.feature_flags f where f.key = 'listing_board'), false)
      into board_open;
    if not board_open then
      return;
    end if;
    code := 'VL-' || right(regexp_replace(upper(wanted), '[^A-Z0-9]', '', 'g'), 6);
    select l.id into target from public.listings l where l.reference = code;
    if target is null then
      return;
    end if;
    link_kind := 'listing';
    link_target := target;
  else
    if wanted !~ '^[23456789abcdefghjkmnpqrstvwxyz]{10}$' then
      return;
    end if;
    select sl.kind, sl.target_id into link_kind, link_target
      from public.share_links sl
     where sl.token = wanted and sl.revoked_at is null;
    if not found then
      return;
    end if;
  end if;

  if link_kind = 'stay' then
    return query
      select case when a.status = 'PUBLISHED'::public.listing_status then 'stay'::text else 'gone'::text end,
             case when a.status = 'PUBLISHED'::public.listing_status then a.id else null end,
             null::text,
             a.is_demo,
             null::text,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status then null else private.public_neighbourhood(a.area, a.state_code) end,
             null::text,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status then null else st.name end,
             'stay'::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status then null else (
               select p.storage_path from public.accommodation_photos p
                where p.accommodation_id = a.id
                order by p.position asc, p.created_at asc
                limit 1)
             end,
             null::uuid, null::text, null::text,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status then null else a.state_code end
        from public.accommodations a
        left join public.states st on st.code = a.state_code
       where a.id = link_target;
    return;
  end if;
  if link_kind = 'price_area' then
    return query
      select 'price_area'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, s.id, null::text, null::text, null::text
        from public.price_check_shares s
       where s.id = link_target;
    return;
  end if;

  -- An unpublished listing (withdrawn, suspended, let) answers "gone" and
  -- nothing else: no title, no place, no figure.
  if not exists (
    select 1 from public.listings l
     where l.id = link_target and l.status = 'PUBLISHED'::public.listing_status
  ) then
    return query
      select 'gone'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  -- The only select on public.listings that feeds the card. NO TITLE: the
  -- card composes its heading from facts (rule 10, by construction). The
  -- area and city only when the whole of each is on the closed lists. For an
  -- example the place and every figure are blanked, under the syndication rule.
  return query
    select 'listing'::text,
           l.id,
           l.reference,
           l.is_demo,
           null::text,
           case when l.is_demo then null else private.public_neighbourhood(l.area, l.state_code) end,
           null::text,
           case when l.is_demo then null else st.name end,
           l.property_type::text,
           l.listing_intent::text,
           case when l.is_demo then null else l.bedrooms end,
           case when l.is_demo then null else l.rent_amount_minor end,
           case when l.is_demo then null else l.rent_period::text end,
           case when l.is_demo then null else l.caution_deposit_minor end,
           case when l.is_demo then null else l.service_charge_minor end,
           case when l.is_demo then null else l.service_charge_period::text end,
           case when l.is_demo then null else l.agency_fee_minor end,
           case when l.is_demo then null else l.legal_fee_minor end,
           case when l.is_demo then null else l.agreement_fee_minor end,
           case when l.is_demo then null else l.total_move_in_cost_minor end,
           case when l.is_demo then null else l.sale_price_minor end,
           case when l.is_demo then null else l.rate_minor end,
           case when l.is_demo then null else l.rate_period::text end,
           case when l.is_demo then null else (
             select p.storage_path from public.listing_photos p
              where p.listing_id = l.id
              order by p.position asc, p.created_at asc
              limit 1)
           end,
           null::uuid,
           case when l.is_demo then null else l.power_grid::text end,
           case when l.is_demo then null else l.water_supply::text end,
           case when l.is_demo then null else l.state_code end
      from public.listings l
      left join public.states st on st.code = l.state_code
     where l.id = link_target;
end;
$function$;

comment on function public.share_door(text) is
  'V-07. The whole public projection of a share door. No address, landmark, coordinate, location, estate, lister or contact column; NO TITLE and NO CITY (both always null). The area only when it is a closed-list neighbourhood in the listing''s state (private.public_neighbourhood); the state code and name from the states table. Examples come back with no place, photo or figure. VL- codes answer only while feature_flags.listing_board is true.';

revoke all on function public.share_door(text) from public;
grant execute on function public.share_door(text) to anon, authenticated;

drop function if exists private.public_city(text, text);
