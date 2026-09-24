/*
 * ONE CLOSED LIST OF PLACES.
 *
 * 20260924110800 gave the landlord line and the trusted contact's page their
 * own copy of a neighbourhood list. Builder 2's rule-10 work (20260924121300)
 * holds the shared one, generated from apps/web/src/lib/places/neighbourhoods.ts
 * and checked against it by neighbourhoods.test.ts, in
 * `private.public_neighbourhood(area, state_code)`: the whole of the area,
 * normalised, on the list or a listed alias, in the listing's own state.
 *
 * `private.listing_place_name` now asks that function, and falls back to the
 * state's name from `public.states`, then 'Nigeria'. Never `listings.city` and
 * never `listings.area` as typed. Everything that names a place on these
 * surfaces goes through here: the reply page (`landlord_line_read`), the
 * message words (`listing_place_words`), and the trusted contact's page
 * (`safety_share_read`).
 *
 * The body is PL/pgSQL so that it is resolved when it runs, not when it is
 * created: this file sorts before 20260924121300, which creates
 * `private.public_neighbourhood`, and nothing calls this function while the
 * migrations between the two are applied.
 */

create or replace function private.listing_place_name(p_listing uuid)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  l public.listings%rowtype;
begin
  select * into l from public.listings where id = p_listing;
  if l.id is null then
    return null;
  end if;
  return coalesce(
    private.public_neighbourhood(l.area, l.state_code),
    (select s.name from public.states s where s.code = l.state_code),
    'Nigeria');
end;
$function$;

revoke all on function private.listing_place_name(uuid) from public, anon, authenticated;
