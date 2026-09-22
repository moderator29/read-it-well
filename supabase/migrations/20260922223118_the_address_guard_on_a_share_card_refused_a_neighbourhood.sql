-- The address guard on a Price Check share card refused 1004 Estate, which is
-- a neighbourhood in Lagos, and the comment beside it said it would not.
--
-- ---------------------------------------------------------------------------
-- WHAT HAPPENED, WRITTEN DOWN BECAUSE THE SHAPE MATTERS MORE THAN THE REGEX.
--
-- `20260922222524_..._the_enum_is_what_makes_it_unarguable.sql` added
-- `price_check_shares_area_is_not_an_address` to catch the one way a street
-- address can still reach an area-level card: somebody typing "14 Bourdillon
-- Road" into a neighbourhood field. The pattern it used was
--
--     '^(no\.?|number)?\s*[0-9]+[a-z]?[\s,/-]+\S'
--
-- which is "a leading number, then a separator, then anything". The comment
-- directly above it stated, in the present tense, that it "does not refuse
-- 1004 Estate or Phase 2, which are neighbourhoods whose names contain
-- digits". 1004 Estate IS a leading number, then a space, then a letter. The
-- constraint refused it. The prose and the code disagreed and the prose was
-- the part that had been read.
--
-- That is the fault family `apps/web/scripts/check-css-tokens.mjs` opens with:
-- something asserts a fact about the repository, the fact is false, and
-- nothing fails. It did fail here, and only because
-- `scripts/probes/price_check_stage_one.sql` asserted the ACCEPTANCE case and
-- not only the refusal. A probe that had tested "14 Bourdillon Road is
-- refused" alone would have passed, green, over a constraint that refuses a
-- third of Lekki.
--
-- ---------------------------------------------------------------------------
-- THE CORRECTED RULE, AND WHAT IT DOES AND DOES NOT CATCH.
--
-- An address in Nigeria is a house number AND a street. A neighbourhood may
-- carry a number (1004 Estate, Phase 2, Zone 4) and never carries a street
-- type. So the guard now needs both halves:
--
--   1. An explicit house-number prefix: "No. 14", "No 14", "Number 14".
--   2. A number token at the start or after a comma, followed later by a
--      street-type word on a word boundary: road, street, close, crescent,
--      avenue, drive, lane, way, boulevard, court, terrace.
--
-- `\y` matters: "Broadway" contains the letters r-o-a-d and is not a road.
--
-- WHAT IT DELIBERATELY DOES NOT CATCH, said plainly rather than implied. A
-- bare street name with no number ("Awolowo Road") still passes. That is a
-- street rather than a building, it is how Lagosians name several districts,
-- and refusing it would refuse real neighbourhoods to catch something that is
-- not a target. The rule this constraint serves is "no artefact carries a
-- specific ADDRESS", and a street with no number is not one.
--
-- NOTHING IS LOST. `public.price_check_shares` is empty: it was created three
-- minutes before this file and its only writer is a service_role function the
-- product does not yet call. This is not the stop list's kind of drop.

alter table public.price_check_shares
  drop constraint if exists price_check_shares_area_is_not_an_address;

alter table public.price_check_shares
  add constraint price_check_shares_area_is_not_an_address
  check (
    area is null
    or (
      btrim(area) !~* '^(no\.?|number)\s*[0-9]'
      and btrim(area) !~* '(^|[\s,])[0-9]+[a-z]?[\s,/-]+.*\y(road|street|close|crescent|avenue|drive|lane|way|boulevard|court|terrace)\y'
    )
  );

comment on constraint price_check_shares_area_is_not_an_address on public.price_check_shares is
  'A house number plus a street is an address; a number on its own is a
   neighbourhood. "No. 14 Bourdillon" and "14 Bourdillon Road" are refused,
   "1004 Estate", "Phase 2" and "Zone 4" are not. A bare street name with no
   number is deliberately allowed, because it names a stretch rather than a
   building and several Lagos districts are known by one.';
