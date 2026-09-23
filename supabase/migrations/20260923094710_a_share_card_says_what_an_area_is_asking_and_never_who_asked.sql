-- ===========================================================================
-- A SHARE CARD SAYS WHAT AN AREA IS ASKING. IT NEVER SAYS WHO ASKED.
-- ===========================================================================
--
-- THIS ALSO CORRECTS THE MIGRATION BEFORE IT, IN PUBLIC, BECAUSE THAT ONE IS
-- WRONG IN ITS FIRST PARAGRAPH.
--
-- `20260923094423_a_share_card_that_nobody_could_read_...` opens by saying that
-- `price_check_shares` had NO TABLE GRANT TO ANYBODY and that every read
-- returned permission denied before RLS was consulted. That is false.
-- `20260922222524` granted `select on table public.price_check_shares to anon,
-- authenticated` and the card has been readable since the day it shipped.
--
-- HOW A FALSE PREMISE GOT THAT FAR IS WORTH MORE THAN THE FIX. The evidence
-- was one query against `information_schema.role_table_grants`, which came
-- back EMPTY. That view shows only the grants where the querying role is the
-- grantor or the grantee, and the MCP read door is `supabase_read_only_user`,
-- which is neither. So an empty result meant "you cannot see these grants" and
-- was read as "there are no grants". That is the same fault as a gate that
-- refuses every call being read as an engine that returns nothing: the answer
-- was about the observer, not about the thing observed. `pg_class.relacl` and
-- `has_table_privilege` both answer truthfully from any role, and the probe
-- that mints a card and reads it back as `anon` answers most truthfully of
-- all. The probe is what caught this, in the assertion that was expecting the
-- opposite result.
--
-- ---------------------------------------------------------------------------
-- WHAT IS ACTUALLY WRONG, WHICH THE PROBE FOUND ON ITS FIFTH ASSERTION.
--
-- A table-wide SELECT includes `created_by`, and a column-list grant laid on
-- top of a table grant NARROWS NOTHING: the table privilege already covers
-- every column, so the previous migration's column list was inert. Anybody
-- holding a share id could read the uuid of the person who minted it, and
-- anybody at all could page the table and collect the pairs.
--
-- That matters here more than it would elsewhere, because the premise of this
-- whole feature's share rule is that A CARD IS FORWARDED FAR PAST THE CIRCLE
-- IT WAS SENT INTO. An address beside a naira figure is the danger the rule
-- exists for; "this person was pricing somewhere in this area" is a smaller
-- fact about a named account, and it is still a fact about a person that
-- nobody consented to publish.
--
-- So the table grant is REPLACED by the column list it was supposed to be.
-- This is a narrowing and not a removal: every column any card renders is
-- still granted, nothing in the product reads `created_by` through the anon or
-- authenticated door, and the column stays on the table for the admin and
-- abuse paths that reach it through the service role. This is the instrument
-- `public.listings` already uses, where `anon` holds SELECT on the columns a
-- card needs and holds NO grant on `address` or `landmark`, so the share rule
-- is enforced at the grant before any code runs. The absence is the
-- enforcement.
--
-- ---------------------------------------------------------------------------
-- THE THREE WALLS ARE UNTOUCHED AND THIS IS NOT A FOURTH ONE.
--
-- `price_check_share_scope` still has two labels and neither is a property.
-- `price_check_shares` still has no address, latitude, longitude or listing id
-- column. `price_check_shares_area_is_not_an_address` still refuses an area
-- string shaped like a street address. Nothing below adds to or subtracts from
-- any of the three; they are what make a property-scoped card unrepresentable
-- rather than merely forbidden, and this migration is about a different column.
--
-- RULE 21, BORN LOCKED, ADDRESSED RATHER THAN INHERITED. No function is
-- created here, so there is no EXECUTE to revoke. `create_price_check_share`
-- and `record_price_check_event` keep the service-role-only locks their own
-- migrations gave them, so a browser still cannot mint a card, and the server
-- action holding the service-role client is still the only door. No INSERT,
-- UPDATE or DELETE is granted to anybody below.

revoke select on table public.price_check_shares from anon, authenticated;

grant select (
  id,
  scope,
  state_code,
  lga_code,
  area,
  property_type,
  listing_intent,
  bedrooms,
  low_minor,
  mid_minor,
  high_minor,
  listing_count,
  oldest_at,
  newest_at,
  created_at
) on public.price_check_shares to anon, authenticated;
