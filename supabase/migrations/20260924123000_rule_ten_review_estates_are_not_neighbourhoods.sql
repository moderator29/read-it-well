-- RULE 10, REVIEW FIX: ESTATES ARE NOT NEIGHBOURHOODS.
--
-- The closed list named Banana Island and Parkview, which are estates: a
-- named estate on a public card is nearly an address. They are taken off the
-- list with no alias, so they read as free text and print nothing (a card
-- says the state; a search naming only them counts for the state alone).
-- Chevron, a company's name as much as a place, goes too. The twin in
-- apps/web/src/lib/places/neighbourhoods.ts changes in the same commit, and
-- neighbourhoods.test.ts compares the two.

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

revoke all on function private.public_neighbourhood(text, text) from public, anon;
grant execute on function private.public_neighbourhood(text, text) to authenticated, service_role;
