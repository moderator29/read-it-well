-- DB-03 follow-up: listings_owner_all was one FOR ALL policy whose USING
-- admitted firm members, so a firm's staff could DELETE (DELETE has no WITH
-- CHECK) a listing another member of the firm put up. Reading a firm's
-- listings is the firm member's; writing a listing is its lister's alone.
drop policy listings_owner_all on public.listings;

create policy listings_owner_select on public.listings
  for select
  using (private.listing_agent_is_me(agent_id) or private.firm_member_is_me(firm_id));

create policy listings_owner_insert on public.listings
  for insert
  with check (private.listing_agent_is_me(agent_id));

create policy listings_owner_update on public.listings
  for update
  using (private.listing_agent_is_me(agent_id))
  with check (private.listing_agent_is_me(agent_id));

create policy listings_owner_delete on public.listings
  for delete
  using (private.listing_agent_is_me(agent_id));
