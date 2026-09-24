/*
 * V-28. COMPOUND FACTS: THE FIVE QUESTIONS ASKED AT EVERY LAGOS VIEWING.
 *
 * `parking_spaces` counts spaces and says nothing about where they are. The
 * questions a renter actually asks at the gate are five, and none of them had a
 * column:
 *
 *   parking_type        inside the compound, on the street, or none at all
 *   flats_in_compound   how many units share the compound: it predicts water
 *                       pressure, the generator rota and parking fights
 *   landlord_on_site    whether the landlord lives in the compound: house
 *                       rules, gate times, visitors, noise. Decisive in Nigeria
 *                       and asked by nobody's form
 *   waste_disposal      how rubbish leaves: the state's PSP operator, the
 *                       estate's own arrangement, or nothing
 *                       (`LISTING_PIPELINE_AUDIT.md` 3.4: "missing entirely,
 *                       not even an amenity code")
 *   car_access          whether a car can get into the compound at all
 *
 * ALL NULLABLE, AND NULL MEANS UNANSWERED. It never means no. The listing page
 * renders an unanswered question as nothing, following the pattern
 * `20260809044629_the_facts_a_nigerian_listing_states` set for parking_spaces,
 * and the two filters that read these (landlord not on site, parking inside)
 * are strict: a listing that did not answer never satisfies them.
 *
 * Text with check constraints rather than new enum types: the vocabularies are
 * three words each, and a check can be widened in one statement where an enum
 * value cannot be removed at all.
 *
 * NO GRANT CHANGES. These are columns on `listings`, which is written through
 * the agent's own RLS-bound update and read by the catalogue selects that
 * already exist; they inherit the table's policies and grants exactly as
 * parking_spaces did.
 */

begin;

alter table public.listings
  add column if not exists parking_type text,
  add column if not exists flats_in_compound smallint,
  add column if not exists landlord_on_site boolean,
  add column if not exists waste_disposal text,
  add column if not exists car_access boolean;

alter table public.listings
  add constraint listings_parking_type_known
    check (parking_type is null or parking_type in ('inside', 'street', 'none')),
  add constraint listings_flats_in_compound_plausible
    check (flats_in_compound is null or (flats_in_compound >= 1 and flats_in_compound <= 500)),
  add constraint listings_waste_disposal_known
    check (waste_disposal is null or waste_disposal in ('psp', 'estate', 'none'));

comment on column public.listings.parking_type is
  'Where a car is kept: inside the compound, on the street, or nowhere. Read beside parking_spaces, which counts them. Null is unanswered, never none (V-28).';
comment on column public.listings.flats_in_compound is
  'How many units share the compound, this one included. Predicts water pressure, the generator rota and parking. Null is unanswered (V-28).';
comment on column public.listings.landlord_on_site is
  'Whether the landlord lives in the compound. Decides house rules, gate times and visitors, and is the question nobody else''s form asks. Null is unanswered, and the "not on site" filter never matches it (V-28).';
comment on column public.listings.waste_disposal is
  'How rubbish leaves: psp (the state''s private sector participation operator), estate (the estate''s own arrangement) or none. Null is unanswered (V-28).';
comment on column public.listings.car_access is
  'Whether a car can enter the compound at all. Null is unanswered (V-28).';

commit;
