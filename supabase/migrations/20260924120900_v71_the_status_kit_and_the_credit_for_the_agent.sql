-- V-71: THE STATUS KIT. VALLO BECOMES THE CATALOGUE BEHIND THE AGENT'S
-- WHATSAPP, AND THE AGENT GETS THE CREDIT.
--
-- The lister's own share door (V-07) is their personal link: `share_links`
-- already records who minted each door, one live door per sharer per
-- listing. This adds the two things the Status kit needs on top of it.
--
-- 1. THE CARD CARRIES POWER AND WATER IN WORDS. A Status image is judged in a
--    second on a phone, and "Band A light, borehole" is the line that makes a
--    Lagos renter tap. `share_door` gains `power_grid` and `water_supply`
--    (blanked on an example, like every other fact). Neither is a location.
--    Changing a function's result type needs a drop and a create; the grants
--    are restated below.
--
-- 2. AN ENQUIRY IS ATTRIBUTED TO THE LISTER'S OWN LINK, FIRST TOUCH, WITHIN 14
--    DAYS. `conversations.share_token` names the door a renter came through.
--    `attribute_conversation` sets it once, and only when: the caller is the
--    renter in that conversation; the door is live, for that listing, and was
--    minted by that conversation's lister (a stranger's door never earns a
--    lister credit, and nobody earns credit for somebody else's listing); and
--    the renter first opened it no more than 14 days ago (the page passes the
--    first-touch time the device kept). It never overwrites.
--
--    `status_stats` gives the lister their own numbers for one listing: how
--    many times their door was opened and how many enquiries it brought. No
--    person is named; a count of opens is never shown to anybody but the
--    lister, and never as a claim about popularity.
--
-- The column is additive and nullable on an existing table, and nothing reads
-- it but these two functions and the lister's own counts.

drop function if exists public.share_door(text);

create function public.share_door(p_token text)
returns table (
  state                    text,     -- 'listing', 'price_area' or 'gone'
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

comment on function public.share_door(text) is
  'V-07 and V-71. The whole public projection of a share door. No address, landmark, coordinate, location, estate, lister or contact column; the title, area and city are returned only when private.public_text_is_safe passes; power and water in their stated terms. Examples come back with no title, place, photo, figure or utility. VL- codes answer only while feature_flags.listing_board is true.';

revoke all on function public.share_door(text) from public;
grant execute on function public.share_door(text) to anon, authenticated;

alter table public.conversations
  add column if not exists share_token text references public.share_links(token) on delete set null;

comment on column public.conversations.share_token is
  'V-71. The lister''s own share door this enquiry arrived through, first touch within 14 days. Set once, by attribute_conversation, never overwritten.';

create index if not exists conversations_share_token_idx on public.conversations (share_token) where share_token is not null;

create or replace function public.attribute_conversation(p_conversation uuid, p_token text, p_first_touch timestamptz)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  convo record;
begin
  if caller is null or p_token is null or p_first_touch is null then
    return false;
  end if;
  if p_first_touch < now() - interval '14 days' or p_first_touch > now() + interval '5 minutes' then
    return false;
  end if;
  select c.guest_id, c.agent_id, c.listing_id, c.share_token into convo
    from public.conversations c where c.id = p_conversation for update;
  if not found or convo.guest_id is distinct from caller or convo.share_token is not null then
    return false;
  end if;
  if not exists (
    select 1 from public.share_links sl
     where sl.token = btrim(p_token) and sl.revoked_at is null
       and sl.kind = 'listing' and sl.target_id = convo.listing_id
       and sl.created_by = convo.agent_id
  ) then
    return false;
  end if;
  update public.conversations set share_token = btrim(p_token) where id = p_conversation;
  return true;
end;
$function$;

comment on function public.attribute_conversation(uuid, text, timestamptz) is
  'V-71. First-touch attribution: the renter''s enquiry is credited to the lister''s own door for that listing when first opened within 14 days. Set once. Returns false for anything else, without saying why.';

create or replace function public.status_stats(p_listing uuid)
returns table (opens integer, enquiries integer)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing and a.user_id = caller
  ) then
    raise exception 'not your listing' using errcode = '42501';
  end if;
  return query
    select coalesce((select sum(sl.opens)::integer from public.share_links sl
                      where sl.kind = 'listing' and sl.target_id = p_listing and sl.created_by = caller), 0),
           coalesce((select count(*)::integer from public.conversations c
                       join public.share_links sl on sl.token = c.share_token
                      where c.listing_id = p_listing and sl.created_by = caller), 0);
end;
$function$;

comment on function public.status_stats(uuid) is
  'V-71. The lister''s own numbers for one listing: opens of their own doors and enquiries those doors brought. The lister only; counts only.';

revoke all on function public.attribute_conversation(uuid, text, timestamptz) from public, anon;
revoke all on function public.status_stats(uuid) from public, anon;
grant execute on function public.attribute_conversation(uuid, text, timestamptz) to authenticated;
grant execute on function public.status_stats(uuid) to authenticated;
