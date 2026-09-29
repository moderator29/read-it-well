/*
 * A LANDLORD AND A STRANGER READ FACTS, NEVER WHAT A LISTER TYPED.
 *
 * `listings.area` and `listings.title` are free text a lister types, and a
 * reviewer showed they carry "14 Admiralty", "Nº 5 Bourdillon" and estate
 * names straight through any filter a renderer could apply. The rule, decided
 * on 24 September: no lister-written free text reaches a message to a landlord
 * or a public page. So every place a landlord or a stranger is shown is built
 * from facts only:
 *
 *   bedrooms and type   from their columns
 *   the place           a neighbourhood from a CLOSED list, matched exactly
 *                       against what was typed; else the city; else the state
 *
 * The closed list here is deliberately small and exact. A longer list is being
 * added elsewhere (`lib/places/neighbourhoods.ts`); the two are unified when the
 * branches meet. An area that is not on the list is never printed, however
 * harmless it looks; the city is, and a city-wide sentence costs a reader
 * nothing.
 *
 * Replaced here: `private.listing_place_words` (every landlord message, the
 * reply page, the owner's in-app question), `public.landlord_line_read` (its
 * `area` is now the place name) and `public.safety_share_read` (the page a
 * renter's trusted contact opens).
 */

create or replace function private.listing_place_name(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(
           (select n.name
              from (values
                ('Ikeja'), ('Ikeja GRA'), ('Ikoyi'), ('Victoria Island'), ('Lekki'), ('Lekki Phase 1'),
                ('Ajah'), ('Yaba'), ('Surulere'), ('Gbagada'), ('Maryland'), ('Magodo'), ('Ogudu'),
                ('Ojodu'), ('Ogba'), ('Ikorodu'), ('Festac'), ('Apapa'), ('Ebute Metta'), ('Oshodi'),
                ('Isolo'), ('Ilupeju'), ('Anthony'), ('Ketu'), ('Sangotedo'), ('Chevron'), ('Oniru'),
                ('Agungi'), ('Osapa'), ('Ikate'), ('Idado'), ('Opebi'), ('Allen'), ('Oregun'),
                ('Agege'), ('Egbeda'), ('Ipaja'), ('Akoka'), ('Ilasamaja'), ('Ojota'),
                ('Wuse'), ('Wuse 2'), ('Maitama'), ('Asokoro'), ('Garki'), ('Gwarinpa'), ('Jabi'),
                ('Utako'), ('Katampe'), ('Lokogoma'), ('Kubwa'), ('Lugbe'), ('Life Camp'), ('Guzape'),
                ('Old GRA'), ('New GRA'), ('Rumuokoro'), ('Trans Amadi'), ('Bodija'), ('Jericho'),
                ('Independence Layout'), ('GRA')
              ) as n(name)
             where lower(n.name) = lower(regexp_replace(btrim(coalesce(l.area, '')), '\s+', ' ', 'g'))
             limit 1),
           nullif(btrim(l.city), ''),
           (select s.name from public.states s where s.code = l.state_code),
           'Nigeria')
    from public.listings l
   where l.id = p_listing;
$function$;

revoke all on function private.listing_place_name(uuid) from public, anon, authenticated;

create or replace function private.listing_place_words(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select concat_ws(' ',
           case when l.bedrooms > 0 then l.bedrooms::text || ' bedroom' end,
           replace(l.property_type::text, '_', ' '),
           'in',
           private.listing_place_name(l.id))
    from public.listings l
   where l.id = p_listing;
$function$;

revoke all on function private.listing_place_words(uuid) from public, anon, authenticated;

/* The reply page: `area` is the place name, never what was typed. */
create or replace function public.landlord_line_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
  l public.listings%rowtype;
  rp public.rent_payments%rowtype;
  lister text;
  state text;
begin
  a := private.principal_ask_by_token(p_token);
  if a.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if not private.landlord_line_open() then
    return jsonb_build_object('state', 'closed');
  end if;

  select * into l from public.listings where id = a.listing_id;
  select coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), '')) into lister
    from public.listings x
    left join public.agents ag on ag.id = x.agent_id
    left join public.businesses b on b.id = x.firm_id
   where x.id = a.listing_id;

  state := case when a.answered_at is not null then 'used'
                when a.expires_at <= now() then 'expired'
                else 'open' end;

  if a.purpose = 'rent' and state = 'open' then
    select * into rp from public.rent_payments where id = a.rent_payment_id;
  end if;

  return jsonb_build_object(
    'state', state,
    'purpose', a.purpose,
    'place', private.listing_place_words(a.listing_id),
    'area', private.listing_place_name(a.listing_id),
    'city', nullif(btrim(l.city), ''),
    'bedrooms', l.bedrooms,
    'property_type', l.property_type,
    'lister_name', lister,
    'asked_at', a.sent_at,
    'expires_at', a.expires_at,
    'answered_at', a.answered_at,
    'answer', case when state = 'used' then a.answer end,
    'rent', case when a.purpose = 'rent' and state = 'open' then jsonb_build_object(
        'rent_minor', rp.rent_minor,
        'caution_minor', rp.caution_minor,
        'service_minor', rp.service_minor,
        'agency_minor', rp.agency_minor,
        'legal_minor', rp.legal_minor,
        'agreement_minor', rp.agreement_minor,
        'total_minor', rp.total_minor,
        'total_stated', rp.total_stated,
        'currency', rp.currency,
        'move_in', rp.move_in,
        'rent_period', rp.rent_period) end
  );
end;
$function$;

revoke all on function public.landlord_line_read(text) from public;
grant execute on function public.landlord_line_read(text) to anon, authenticated;

/* The trusted contact's page: the place name, never what was typed. */
create or replace function public.safety_share_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  s public.inspection_safety_shares%rowtype;
  r public.inspection_requests%rowtype;
  l public.listings%rowtype;
  agent_user uuid;
  agent_name text;
  first text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then
    return jsonb_build_object('state', 'unknown');
  end if;
  select * into s from public.inspection_safety_shares where token_hash = extensions.digest(p_token, 'sha256');
  if s.id is null or s.revoked_at is not null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if s.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;

  select * into r from public.inspection_requests where id = s.inspection_id;
  select * into l from public.listings where id = r.listing_id;
  select a.user_id, coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), ''))
    into agent_user, agent_name
    from public.agents a left join public.businesses b on b.id = l.firm_id
   where a.id = l.agent_id;
  select coalesce(nullif(btrim(p.first_name), ''), split_part(nullif(btrim(p.display_name), ''), ' ', 1))
    into first from public.profiles p where p.id = s.created_by;

  return jsonb_build_object(
    'state', 'live',
    'first_name', first,
    'area', private.listing_place_name(l.id),
    'city', nullif(btrim(l.city), ''),
    'agent_name', agent_name,
    'identity_checked_at', private.identity_checked_at(agent_user),
    'slot_at', r.slot_at,
    'expected_back_at', s.expected_back_at,
    'checked_in_at', s.checked_in_at,
    'overdue', s.checked_in_at is null and s.expected_back_at + interval '30 minutes' <= now());
end;
$function$;

revoke all on function public.safety_share_read(text) from public;
grant execute on function public.safety_share_read(text) to anon, authenticated;
