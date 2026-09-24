-- V-07, CARRY-OVER: A DOOR FOR STAYS.
--
-- `/stay/<id>` carries an ACCOMMODATION id, and until now a stay shared off
-- Vallo went out as its own gated address, which unfurls as a sign-in page:
-- exactly the failure the share door fixed for listings. A stay now mints the
-- same door (`kind = 'stay'`) and the door shows the same kind of card: the
-- first photograph, the stay's name when it passes the rule-ten test, the area
-- and state only, and "Sign in to open it on Vallo" with `next=/stay/<id>`.
-- No rate is printed: a stay's price depends on dates and a room, and a card
-- that quoted one figure would be quoting a rate nobody chose.
--
-- An example stay gets a door and no name, place or photo, like an example
-- listing. An unpublished stay answers "gone". Nothing else about the door
-- changes; `create_share_link` accepts the new kind for a PUBLISHED stay only.

alter table public.share_links drop constraint if exists share_links_kind_check;
alter table public.share_links
  add constraint share_links_kind_check check (kind in ('listing', 'price_area', 'stay'));

create or replace function public.create_share_link(p_kind text, p_target uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  existing text;
  minted text;
  alphabet constant text := '23456789abcdefghjkmnpqrstvwxyz';
  bytes bytea;
  i integer;
  attempt integer := 0;
begin
  if caller is null then
    raise exception 'sign in to share' using errcode = '42501';
  end if;
  if p_kind not in ('listing', 'price_area', 'stay') then
    raise exception 'unknown share kind' using errcode = '22023';
  end if;

  -- A door only for something a stranger may be told about at all: a
  -- published listing, or a price check card that exists.
  if p_kind = 'listing' and not exists (
    select 1 from public.listings l
     where l.id = p_target and l.status = 'PUBLISHED'::public.listing_status
  ) then
    raise exception 'that listing is not published' using errcode = '22023';
  end if;
  if p_kind = 'stay' and not exists (
    select 1 from public.accommodations a
     where a.id = p_target and a.status = 'PUBLISHED'::public.listing_status
  ) then
    raise exception 'that stay is not published' using errcode = '22023';
  end if;
  if p_kind = 'price_area' and not exists (
    select 1 from public.price_check_shares s where s.id = p_target
  ) then
    raise exception 'that card does not exist' using errcode = '22023';
  end if;

  -- Sharing the same thing twice is the same door, so a counter means
  -- something and a sharer is not minting a new public URL per tap.
  select sl.token into existing
    from public.share_links sl
   where sl.created_by = caller and sl.kind = p_kind and sl.target_id = p_target
     and sl.revoked_at is null;
  if existing is not null then
    return existing;
  end if;

  loop
    attempt := attempt + 1;
    bytes := extensions.gen_random_bytes(10);
    minted := '';
    for i in 0..9 loop
      minted := minted || substr(alphabet, (get_byte(bytes, i) % 30) + 1, 1);
    end loop;
    begin
      insert into public.share_links (token, kind, target_id, created_by)
      values (minted, p_kind, p_target, caller);
      return minted;
    exception when unique_violation then
      -- Either the token collided (30^10, vanishingly rare) or a concurrent
      -- tap by the same sharer won the race; answer with whichever is live.
      select sl.token into existing
        from public.share_links sl
       where sl.created_by = caller and sl.kind = p_kind and sl.target_id = p_target
         and sl.revoked_at is null;
      if existing is not null then
        return existing;
      end if;
      if attempt >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$function$;

comment on function public.create_share_link(text, uuid) is
  'V-07. Mints (or returns the live) share door token for the caller. Signed in only. Listings and stays must be published; price_area targets must be an existing price_check_shares row.';

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
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status or not private.public_text_is_safe(a.name) then null else a.name end,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status or not private.public_text_is_safe(a.area) then null else a.area end,
             case when a.is_demo or a.status <> 'PUBLISHED'::public.listing_status or not private.public_text_is_safe(a.city) then null else a.city end,
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

  -- The only select on public.listings that feeds the card. Every column it
  -- names is on the card; for an example the title, place and every figure
  -- are blanked here, under the syndication rule.
  return query
    select 'listing'::text,
           l.id,
           l.reference,
           l.is_demo,
           case when l.is_demo or not private.public_text_is_safe(l.title) then null else l.title end,
           case when l.is_demo or not private.public_text_is_safe(l.area) then null else l.area end,
           case when l.is_demo or not private.public_text_is_safe(l.city) then null else l.city end,
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

revoke all on function public.create_share_link(text, uuid) from public, anon;
grant execute on function public.create_share_link(text, uuid) to authenticated;
revoke all on function public.share_door(text) from public;
grant execute on function public.share_door(text) to anon, authenticated;
