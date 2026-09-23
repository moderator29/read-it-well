-- ===========================================================================
-- A SHARE CARD COULD BE MINTED AND NEVER READ, AND THE READ MUST NOT SAY WHO.
-- ===========================================================================
--
-- `price_check_shares` shipped with row level security on, a policy
-- `price_check_shares_read` whose USING clause is `true`, and NO TABLE GRANT
-- TO ANYBODY. `anon` and `authenticated` hold nothing on it, and a policy
-- without a grant decides nothing: PostgreSQL checks the privilege first and
-- the row filter afterwards, so every read of a share returned permission
-- denied before RLS was consulted at all.
--
-- That was invisible for the reason the whole of this feature is hard to see
-- from outside: the writer `create_price_check_share` is SECURITY DEFINER and
-- service-role only, so the minting half worked perfectly, and there was no
-- button, no destination and no image to try reading one with. "Returns
-- nothing" is also what a missing grant returns. The policy's own USING clause
-- says what was intended - a share link is meant to open for whoever is handed
-- it, including a stranger with no account - so this supplies the grant that
-- the policy has been waiting for rather than inventing a new intention.
--
-- ---------------------------------------------------------------------------
-- A COLUMN LIST, NOT A TABLE GRANT, AND `created_by` IS NOT IN IT.
--
-- This is the same instrument `public.listings` already uses and for the same
-- reason its own migration gives: `anon` holds SELECT on the columns a card
-- needs and holds NO grant on `address` or `landmark`, so the share rule is
-- enforced at the grant before any code runs. The absence is the enforcement.
--
-- `created_by` is left out deliberately and it is the only column that is. A
-- card is forwarded far past the circle it was sent into - that is the premise
-- the whole share rule rests on - and "who checked the price of somewhere in
-- this area" is a fact about a person, not about a neighbourhood. The column
-- stays on the table so an admin can answer abuse questions; it simply never
-- leaves through this door. A reader who follows a link gets the card and
-- learns nothing about whoever made it.
--
-- WHAT IS BEING MADE READABLE CARRIES NO ADDRESS AND CANNOT. There is no
-- address column, no latitude, no longitude and no listing id on this table;
-- `price_check_share_scope` has two labels, `area` and `area_and_type`, and
-- neither is a property; and `price_check_shares_area_is_not_an_address`
-- refuses an area string shaped like a street address. Those three walls stand
-- untouched here. This migration adds a door to a room that has nothing in it
-- worth taking, which is exactly why the door is safe to add.
--
-- ---------------------------------------------------------------------------
-- RULE 21, BORN LOCKED, ADDRESSED RATHER THAN INHERITED.
--
-- This migration creates NO function, SECURITY DEFINER or otherwise, so there
-- is no EXECUTE to revoke. The rule is named here so the next reader can see
-- it was considered rather than forgotten. The two writers in this feature,
-- `create_price_check_share` and `record_price_check_event`, keep the locks
-- their own migrations gave them: EXECUTE for `service_role` only, so the
-- browser cannot mint a card and the server action holding the service-role
-- client remains the only door. Nothing below touches either.
--
-- No INSERT, UPDATE or DELETE is granted to anybody by this migration. A
-- reader can open a card and can do nothing else with the table.

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

comment on table public.price_check_shares is
  'One area level share card. AREA LEVEL AND TYPE LEVEL, NEVER A PROPERTY: there is no address, latitude, longitude or listing id column here and there may not be, the scope enum has no value for a property, and a check refuses an area string shaped like a street address. A specific property is shared in exactly one way, by publishing it as a listing. Readable by anyone holding the id through a column-list grant that excludes created_by, because a card is forwarded far past the circle it was sent into and who made it is a fact about a person.';

comment on column public.price_check_shares.created_by is
  'Who minted the card, for abuse questions. NOT in the anon or authenticated column grant: this column never leaves through the public read.';
