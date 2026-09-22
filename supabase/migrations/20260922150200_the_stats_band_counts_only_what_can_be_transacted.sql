-- The landing's numbers stop counting stock nobody can transact against.
--
-- WHAT WAS WRONG, AND IT IS THE FOUNDER'S OWN ITEM TWELVE.
--
-- `public.platform_stats()` counted every PUBLISHED listing with NO `is_demo`
-- filter, and measured today against this database: 64 published listings, and
-- ALL SIXTY FOUR ARE EXAMPLES. One approved agent, and it is the example
-- lister. So every figure the landing page printed, the listing count, the
-- city count, the state count and the agent count, described stock that cannot
-- be booked, rented or bought by anybody.
--
-- That is rule 15, no invented numbers, and it is worse than an invented
-- number because it is a REAL count of the wrong set, which is the kind of
-- wrong that survives review. It is also the exact shape Apple rejects under
-- guideline 2.1 and Google Play rejects as misrepresentation: a marketplace
-- whose shop window is dressed with stock it does not have.
--
-- WHAT THIS CHANGES: one predicate per count. Nothing else moves.
--
-- WHAT IT MEANS TODAY, said plainly rather than discovered later: this
-- function now returns ZERO, ZERO, ZERO, ZERO. The engine is real and the shop
-- is empty, and the product's job is to say so rather than to dress the
-- window. The surfaces that read it already refuse to draw a band with nothing
-- true in it, so the honest answer renders as nothing rather than as four
-- noughts.
--
-- `agents.is_demo` is read through `coalesce(..., false)` because the column is
-- nullable and a null there means an ordinary agent, not an example one.
-- `listings.is_demo` is NOT NULL and needs no coalesce.
--
-- RULE 21, AND THE ONE DELIBERATE EXCEPTION IN IT. This replaces a
-- `SECURITY DEFINER` function, so the revoke is restated here rather than
-- inherited, and the grant is restated with it. `anon` KEEPS EXECUTE, and that
-- is deliberate and is the one function on this estate where it is: the
-- landing page is served to people who are not signed in and it is the whole
-- point of the function. It counts published rows and returns four integers;
-- it exposes no row, no identifier and nothing about any person.
--
-- ---------------------------------------------------------------------------
-- PROBE, to be run through `apply_migration`, ending in a deliberate raise so
-- the whole transaction rolls back and no row is left behind.
--
--   begin;
--   do $probe$
--   declare
--     before_l bigint; after_l bigint; a bigint;
--     lister uuid; made uuid; ptype text;
--   begin
--     -- 1. RULE 21: the grant is exactly what the header claims.
--     if has_function_privilege('anon', 'public.platform_stats()', 'execute') is false then
--       raise exception 'FAIL 1: anon lost execute, and the landing needs it';
--     end if;
--
--     -- 2. On today's estate every count is zero, because every published
--     --    listing is an example. This is the assertion that would have failed
--     --    before this migration, when it returned 64.
--     select listings into before_l from public.platform_stats();
--     if before_l <> 0 then
--       raise exception 'FAIL 2: expected zero real listings, got %', before_l;
--     end if;
--
--     -- 3. AND IT IS NOT VACUOUS: a REAL published listing must be counted.
--     --    Without this, a function returning a constant zero would pass.
--     -- The fixture COPIES the shape of a row that already exists rather than
--     -- guessing at it. The first draft invented `area_id` and `market`, and
--     -- `listings` has neither, so the probe failed on its own fixture twice
--     -- before it ever tested the function. Copying agent_id and property_type
--     -- off a live published row cannot be wrong about the schema.
--     select agent_id, property_type::text into lister, ptype
--       from public.listings where status = 'PUBLISHED' limit 1;
--     insert into public.listings (agent_id, title, property_type, status,
--                                  is_demo, city, state_code)
--     values (lister, 'Probe listing, rolled back', ptype::public.property_type,
--             'PUBLISHED', false, 'Probeville', 'LA')
--     returning id into made;
--     select listings into after_l from public.platform_stats();
--     if after_l <> before_l + 1 then
--       raise exception 'FAIL 3: a real published listing was not counted, % then %',
--         before_l, after_l;
--     end if;
--
--     -- 4. And a DEMO one is still not counted.
--     update public.listings set is_demo = true where id = made;
--     select listings into a from public.platform_stats();
--     if a <> before_l then
--       raise exception 'FAIL 4: an example listing was counted, expected % got %',
--         before_l, a;
--     end if;
--
--     raise exception 'PROBE ALL PASS: anon keeps execute, the estate counts zero real listings today, a real published listing IS counted, and an example one is not. Rolled back on purpose.';
--   end;
--   $probe$;
--   rollback;
-- APPLIED 22 September 2026 as `the_stats_band_counts_only_what_can_be_transacted`.
-- The probe above passed on its second run and rolled back; the first run
-- failed on its own invented fixture columns and tested nothing, which is the
-- reason the note about copying a live row's shape is now in it.
--
-- MEASURED IMMEDIATELY AFTER APPLYING: the filter is live in the body, `anon`,
-- `authenticated` and `service_role` all keep execute, and the listing count
-- went from 64 to 0.
-- ---------------------------------------------------------------------------

create or replace function public.platform_stats()
returns table(listings bigint, cities bigint, states bigint, agents bigint)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    (select count(*) from public.listings
      where status = 'PUBLISHED' and not is_demo),
    (select count(distinct city) from public.listings
      where status = 'PUBLISHED' and not is_demo
        and city is not null and length(btrim(city)) > 0),
    (select count(distinct state_code) from public.listings
      where status = 'PUBLISHED' and not is_demo and state_code is not null),
    (select count(*) from public.agents
      where status = 'APPROVED' and not coalesce(is_demo, false));
$function$;

comment on function public.platform_stats() is
  'The four public counts the landing page prints. Counts only rows a stranger could actually transact against: an example listing is stock we do not have, and printing it is the shape both stores reject as misrepresentation. Returns zero on an estate with no real supply, and the surfaces that read it draw nothing rather than four noughts.';

revoke all on function public.platform_stats() from public, anon, authenticated;
grant execute on function public.platform_stats() to anon, authenticated, service_role;
