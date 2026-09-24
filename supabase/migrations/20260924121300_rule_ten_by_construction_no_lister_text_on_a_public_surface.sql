-- RULE 10, BY CONSTRUCTION: NO TEXT A LISTER TYPED REACHES A PUBLIC SURFACE.
--
-- Review of the share door showed that a filter over free text cannot be made
-- provable: "14 Admiralty", "Nº 5 Bourdillon", "number five Bourdillon", a
-- Cyrillic letter in "Wаy", "Carlton Gate" all passed
-- `private.public_text_is_safe` (20260924120600). The decision: nothing a
-- lister typed is ever printed where a stranger can read it.
--
--   - `share_door` returns NO TITLE, for a listing or a stay. The card
--     composes its heading from facts ("2 bedroom flat in Yaba", "A stay in
--     Ikoyi"); a business's own name is never on a stay's card either.
--   - The AREA is returned only when the whole of it is a name on the closed
--     neighbourhood list, in the listing's own state, and then in the list's
--     spelling (`private.public_neighbourhood`); the CITY only when it is on
--     the closed city list (`private.public_city`); otherwise nothing, and
--     the card prints the state, which was never typed.
--   - The public area pages (V-82) exist only for closed-list
--     neighbourhoods, and the lost-reasons aggregate (V-72) groups only by
--     them.
--
-- THE LISTS ARE THE TS LISTS. `apps/web/src/lib/places/neighbourhoods.ts`
-- holds `NEIGHBOURHOODS`, `PLACE_ALIASES` and `PUBLIC_CITIES`; the values
-- below are generated from them, and `neighbourhoods.test.ts` parses this
-- file and fails when the two differ. Both sides compare the same normal
-- form: compatibility-normalised (NFKC), trimmed, single-spaced, lower case.
--
-- `private.public_text_is_safe` gates nothing any more and is dropped.

create or replace function private.place_key(p_text text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select lower(regexp_replace(btrim(normalize(coalesce(p_text, ''), NFKC)), '\s+', ' ', 'g'));
$function$;

create or replace function private.public_neighbourhood(p_area text, p_state_code text)
returns text
language sql
immutable
set search_path to ''
as $function$
  with areas(area, state_code) as (
    values
      ('Agege', 'LA'),
      ('Agungi', 'LA'),
      ('Ajah', 'LA'),
      ('Anthony', 'LA'),
      ('Apo', 'FC'),
      ('Asokoro', 'FC'),
      ('Banana Island', 'LA'),
      ('Chevron', 'LA'),
      ('Festac', 'LA'),
      ('Galadimawa', 'FC'),
      ('Garki', 'FC'),
      ('Gbagada', 'LA'),
      ('Guzape', 'FC'),
      ('Gwarinpa', 'FC'),
      ('Ikeja', 'LA'),
      ('Ikeja GRA', 'LA'),
      ('Ikorodu', 'LA'),
      ('Ikota', 'LA'),
      ('Ikoyi', 'LA'),
      ('Ilupeju', 'LA'),
      ('Jabi', 'FC'),
      ('Jahi', 'FC'),
      ('Kado', 'FC'),
      ('Katampe', 'FC'),
      ('Ketu', 'LA'),
      ('Kubwa', 'FC'),
      ('Lekki', 'LA'),
      ('Lekki Phase 1', 'LA'),
      ('Lekki Phase 2', 'LA'),
      ('Life Camp', 'FC'),
      ('Lokogoma', 'FC'),
      ('Lugbe', 'FC'),
      ('Magodo', 'LA'),
      ('Maitama', 'FC'),
      ('Maryland', 'LA'),
      ('Ogba', 'LA'),
      ('Ogudu', 'LA'),
      ('Ojodu', 'LA'),
      ('Ojota', 'LA'),
      ('Old Ikoyi', 'LA'),
      ('Omole', 'LA'),
      ('Oniru', 'LA'),
      ('Osapa', 'LA'),
      ('Osapa London', 'LA'),
      ('Parkview', 'LA'),
      ('Sangotedo', 'LA'),
      ('Surulere', 'LA'),
      ('Utako', 'FC'),
      ('Victoria Island', 'LA'),
      ('Wuse', 'FC'),
      ('Wuse 2', 'FC'),
      ('Yaba', 'LA')
  ),
  aliases(alias, area) as (
    values
      ('lekki ph 1', 'Lekki Phase 1'),
      ('lekki phase one', 'Lekki Phase 1'),
      ('v.i', 'Victoria Island'),
      ('vi', 'Victoria Island'),
      ('wuse ii', 'Wuse 2')
  ),
  wanted as (
    select coalesce((select al.area from aliases al where al.alias = private.place_key(p_area)), private.place_key(p_area)) as key
  )
  select a.area
    from areas a, wanted w
   where lower(a.area) = lower(w.key)
     and (p_state_code is null or a.state_code = upper(btrim(p_state_code)))
   limit 1;
$function$;

create or replace function private.public_city(p_city text, p_state_code text)
returns text
language sql
immutable
set search_path to ''
as $function$
  with cities(city, state_code) as (
    values
      ('Lagos', 'LA'),
      ('Abuja', 'FC'),
      ('Ibadan', 'OY'),
      ('Port Harcourt', 'RI'),
      ('Kano', 'KN'),
      ('Enugu', 'EN'),
      ('Benin City', 'ED'),
      ('Abeokuta', 'OG'),
      ('Kaduna', 'KD'),
      ('Jos', 'PL'),
      ('Ilorin', 'KW'),
      ('Owerri', 'IM'),
      ('Uyo', 'AK'),
      ('Calabar', 'CR'),
      ('Warri', 'DE'),
      ('Asaba', 'DE'),
      ('Awka', 'AN'),
      ('Onitsha', 'AN')
  )
  select c.city
    from cities c
   where lower(c.city) = private.place_key(p_city)
     and (p_state_code is null or c.state_code = upper(btrim(p_state_code)))
   limit 1;
$function$;

comment on function private.public_neighbourhood(text, text) is
  'Rule 10. The canonical neighbourhood when the WHOLE of p_area (NFKC, trimmed, single-spaced, any case, or a listed alias) is on the closed list, in p_state_code when given; otherwise null. The twin of NEIGHBOURHOODS and PLACE_ALIASES in apps/web/src/lib/places/neighbourhoods.ts.';
comment on function private.public_city(text, text) is
  'Rule 10. The canonical city when the whole of p_city is on the closed city list, in p_state_code when given; otherwise null. The twin of PUBLIC_CITIES.';

revoke all on function private.place_key(text) from public, anon;
revoke all on function private.public_neighbourhood(text, text) from public, anon;
revoke all on function private.public_city(text, text) from public, anon;
grant execute on function private.place_key(text) to authenticated, service_role;
grant execute on function private.public_neighbourhood(text, text) to authenticated, service_role;
grant execute on function private.public_city(text, text) to authenticated, service_role;

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
  water_supply             text
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
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status then null else private.public_city(a.city, a.state_code) end,
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
             null::uuid, null::text, null::text
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
             null::bigint, null::text, null::text, s.id, null::text, null::text
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
             null::bigint, null::text, null::text, null::uuid, null::text, null::text;
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
           case when l.is_demo then null else private.public_city(l.city, l.state_code) end,
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
           case when l.is_demo then null else l.water_supply::text end
      from public.listings l
      left join public.states st on st.code = l.state_code
     where l.id = link_target;
end;
$function$;


comment on function public.share_door(text) is
  'V-07. The whole public projection of a share door. No address, landmark, coordinate, location, estate, lister or contact column, and NO TITLE (always null): the card composes its heading from facts. Area and city only when on the closed lists (private.public_neighbourhood, private.public_city). Examples come back with no place, photo or figure. VL- codes answer only while feature_flags.listing_board is true.';

create or replace function public.area_price_pages(p_minimum integer default 5)
returns table (
  state_code    text,
  state_name    text,
  area          text,
  listing_count integer,
  newest_at     timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  with placed as (
    select l.state_code, st.name as state_name,
           private.public_neighbourhood(l.area, l.state_code) as area,
           l.published_at
      from public.listings l
      join public.states st on st.code = l.state_code
     where l.status = 'PUBLISHED'
       and l.is_demo = false
       and l.listing_intent = 'rent'
       and l.rent_period = 'year'
       and l.rent_amount_minor > 0
       and l.published_at >= now() - interval '540 days'
  )
  select p.state_code, p.state_name, p.area, count(*)::integer, max(p.published_at)
    from placed p
   -- Only a closed-list neighbourhood can have a public page (rule 10).
   where p.area is not null
   group by p.state_code, p.state_name, p.area
  having count(*) >= greatest(coalesce(p_minimum, 5), 5)
   order by count(*) desc, p.state_code;
$function$;

comment on function public.area_price_pages(integer) is
  'V-82. The areas that have earned a public price page: at least five (clamped) real, published, yearly-rent listings in the last 540 days, in a neighbourhood on the closed list (private.public_neighbourhood), named in the list''s spelling. Examples never count. Names and counts only.';

create or replace function public.lost_reasons_by_area(p_weeks integer default 12)
returns table (
  state_code  text,
  area        text,
  reason      text,
  lost        integer,
  area_lost   integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not (
       exists (select 1 from public.agents a where a.user_id = caller)
       or private.has_role(caller, 'admin'::public.app_role)
       or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'listers and staff only' using errcode = '42501';
  end if;

  return query
  with lost as (
    select l.state_code, private.public_neighbourhood(l.area, l.state_code) as area, s.lost_reason
      from public.enquiry_stages s
      join public.conversations c on c.id = s.conversation_id
      join public.listings l on l.id = c.listing_id
     where s.stage = 'lost'
       and s.set_at >= now() - make_interval(weeks => greatest(least(coalesce(p_weeks, 12), 52), 1))
       and l.is_demo = false
       and private.public_neighbourhood(l.area, l.state_code) is not null
  ),
  areas as (
    select lo.state_code, lower(lo.area) as area_key, min(lo.area) as area, count(*)::integer as area_lost
      from lost lo
     group by lo.state_code, lower(lo.area)
    having count(*) >= 5
  )
  select a.state_code, a.area, lo.lost_reason, count(*)::integer, a.area_lost
    from lost lo
    join areas a on a.state_code is not distinct from lo.state_code and a.area_key = lower(lo.area)
   group by a.state_code, a.area, lo.lost_reason, a.area_lost
   order by a.area_lost desc, a.area, count(*) desc;
end;
$function$;


comment on function public.lost_reasons_by_area(integer) is
  'V-72. Why enquiries were lost, by closed-list neighbourhood, over the last N weeks (1 to 52): only areas with at least five lost enquiries, only real listings. Counts only. Listers and staff.';

drop function if exists private.public_text_is_safe(text);
