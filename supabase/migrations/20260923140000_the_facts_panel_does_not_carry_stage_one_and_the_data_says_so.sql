-- ---------------------------------------------------------------------------
-- A COMMENT ON A SHIPPED FUNCTION THAT PRODUCTION DATA FALSIFIES.
-- ---------------------------------------------------------------------------
--
-- `20260922222221_price_check_reports_what_places_are_asking.sql` gave
-- `area_utility_facts` this closing sentence, and repeats the claim in its
-- section header:
--
--   "No prices are read here at all, which is why this panel carries stage
--    one on a day when every price answer refuses."
--
-- The reasoning was: the per-property gate refuses because there are too few
-- comparables, this function reads no prices, therefore this function still
-- answers, therefore stage one has something real to show on launch day.
--
-- The first two steps are true. The third does not follow, and the live
-- project says so. Read on 23 September 2026:
--
--   select * from public.area_utility_facts('LA','Lagos','Lekki Phase 1');
--   -- power_grid null, power_backup null, water_supply null,
--   -- listing_count 0, estate_access_known 0, prepaid_meter_known 0
--
-- This panel does not depend on the GATE opening. It depends on REAL SUPPLY
-- EXISTING, because it excludes example listings for exactly the reason the
-- prices do, which the original migration argues correctly and at length: an
-- example listing's power supply is fiction, and a fact panel built from
-- fiction is an invented number with a picture beside it.
--
-- And there is no real supply. 64 published listings in this project, 64 of
-- them `is_demo = true`, zero with `is_demo = false`. So on launch day this
-- panel returns nulls and a `listing_count` of 0 alongside every refusing
-- price answer, rather than carrying stage one past them.
--
-- THE EXCLUSION IS RIGHT AND IS NOT TOUCHED HERE. What is wrong is the claim
-- built on top of it, and a wrong claim in a function comment is worse than
-- no claim, because the next person to plan a launch reads it and believes
-- the panel has something to show.
--
-- Nothing executable changes. The function body, its signature, its grants
-- and its exclusion of example listings are all exactly as they were. This
-- migration replaces one paragraph of English that was making a promise the
-- data does not keep.
--
-- Full item-by-item state: docs/PRICE_CHECK_STAGE_ONE_STATE.md section 3.
-- ---------------------------------------------------------------------------

comment on function public.area_utility_facts(text, text, text) is
  'The neighbourhood power and water facts for one area, from real published
   listings only. The modal answer on each enum with the count that produced
   it, and a known-denominator beside each boolean, so nothing on the surface
   can be printed without saying how many listings it came from.

   NO PRICES ARE READ HERE, AND THAT IS NOT THE SAME AS ANSWERING WHEN THE
   PRICE READS REFUSE. This function excludes example listings for the same
   reason the price reads do, so it needs REAL SUPPLY, not merely an open
   gate. Read against this project on 23 September 2026 it returns
   listing_count 0 and every fact null, because 64 of 64 published listings
   are examples. An earlier version of this comment claimed the panel
   therefore carries stage one on a day when every price answer refuses; the
   data falsifies that, and the claim is withdrawn rather than the exclusion
   relaxed. See docs/PRICE_CHECK_STAGE_ONE_STATE.md section 3.';
