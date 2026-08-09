-- SEC-6. N-1 opened browsing to anonymous traffic, and nobody went back over
-- what an anonymous PostgREST client can actually read.
--
-- `listings_select_published` is `status = 'PUBLISHED'` for role public, which
-- is the right ROW rule and the whole of the rule. RLS is row level: it decides
-- which rows come back and says nothing about which columns, and the grant on
-- this table is table-wide SELECT to anon. So a signed-out caller with the
-- publishable key, which is public by design, gets every column of every
-- published listing, including several the application itself deliberately
-- never asks for.
--
-- The application's own reads are the evidence that these columns were never
-- meant to be public. `LISTING_SELECT` and `LISTING_DETAIL_SELECT` in
-- lib/listings/supabase-repository.ts name forty-nine columns one at a time,
-- and none of the eight below is among them, nor in the map RPC, nor the
-- sitemap, nor the social or review reads. They are read in exactly two places
-- and both are behind a session: the lister's own console and the admin
-- console, which run as `authenticated`.
--
--   review_notes            the moderator's private note about this property.
--                           Prose, written by staff, about a person's listing.
--   reviewer_id, verified_by  which staff account moderated or verified it.
--                           Names an internal user to a stranger and lets one
--                           be followed across the catalogue.
--   address, landmark       the exact door. THE PRODUCT SHOWS AREA AND CITY
--                           AND ALWAYS HAS. A rented property in Nigeria whose
--                           precise address is machine readable by anyone is a
--                           safety exposure for whoever is living in it and a
--                           gift to anybody relisting other people's houses.
--   listing_fee_minor,
--   listing_fee_rate_id,
--   listing_fee_charged_at  what this platform charged this lister and when.
--                           Commercial terms between us and them.
--
-- WHY THE POLICY IS NOT TOUCHED. Narrowing `listings_select_published` would
-- change which listings a signed-out visitor can see, and being able to see
-- them is the thing the owner explicitly asked for. The row rule is correct.
-- What was missing is a column rule, and Postgres has one.
--
-- REVOKE THEN GRANT, IN THAT ORDER, AND IT HAS TO BE. A column level revoke
-- against a role holding table wide SELECT does nothing: the table grant
-- already covers every column and there is no per-column entry to remove. The
-- only way to express "these and not those" is to drop the table grant and put
-- back the columns by name.
--
-- WHAT THIS MEANS FOR THE NEXT COLUMN SOMEBODY ADDS. It will not be readable by
-- anon until it is granted here. That is deliberate and it is the right way
-- round on a table an anonymous scraper reads: a new column is private until
-- somebody decides out loud that it is not, and the failure is a loud
-- "permission denied for column" in development rather than a quiet disclosure
-- in production.
--
-- `authenticated` IS NOT NARROWED HERE, and that is a known residual rather
-- than an oversight. The console reads that need `address` and `review_notes`
-- run as `authenticated`, the same role every signed-up stranger holds, so the
-- same column split cannot be expressed with a grant. Closing it means moving
-- those reads behind a definer function that checks ownership, which is a
-- change to two consoles this migration is not the place to make. Written up
-- rather than half done.

do $$
declare
  -- The columns an anonymous caller has no business reading. Everything else
  -- on the table is granted back below, by name, from the catalogue.
  denied text[] := array[
    'address',
    'landmark',
    'review_notes',
    'reviewer_id',
    'verified_by',
    'listing_fee_minor',
    'listing_fee_rate_id',
    'listing_fee_charged_at'
  ];
  allowed text;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position)
    into allowed
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name = 'listings'
     and not (c.column_name = any (denied));

  if allowed is null then
    raise exception 'public.listings has no readable columns left, refusing to lock out the catalogue';
  end if;

  -- The table grant has to go first. See the note above: a column revoke
  -- against a table wide grant is a no-op with a warning.
  execute 'revoke select on table public.listings from anon';
  execute format('grant select (%s) on table public.listings to anon', allowed);
end;
$$;
