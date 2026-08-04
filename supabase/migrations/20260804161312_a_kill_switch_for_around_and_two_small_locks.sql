-- Three things Agent 2 found and handed over rather than reaching outside its scope.
--
-- 1. AROUND HAD NO KILL SWITCH. Every other risky surface on this platform has
--    one: bookings, wallet, messaging, the assistant, support, agent listings.
--    The social layer is the only one where strangers write things other
--    strangers read, which makes it the one most likely to need turning off in
--    a hurry, and it was the only one with no way to do it.
--
--    `feature_flags` treats a missing row as ENABLED, so adding the row is not
--    enough on its own: the row has to exist AND say false. It ships disabled.
--    Around is not ready to be open to the public, and a switch that ships on
--    is a switch nobody has ever tested in the off position.
--
-- 2. `stories_area_idx` IS PARTIAL AND CANNOT SERVE THE FOREIGN KEY. It carries
--    `where status = 'LIVE'`, which is right for the feed and useless to
--    Postgres when it needs to find every story in an area to cascade a delete
--    or check a reference. Without a plain index that is a sequential scan over
--    the whole table, and this project already has a `fk_covering_indexes`
--    migration precisely because that pattern was found once before.
--
-- 3. `private.project_social_identity` WAS EXECUTABLE BY PUBLIC. I created it
--    without a revoke, which every other function in `private` has. It reads
--    `public.profiles` as a definer, so anybody who could call it could read
--    the projected identity of any user id they could guess. `private` is not
--    an exposed schema so PostgREST cannot reach it, which is why this is a
--    lock rather than a leak, but a security definer function with a default
--    grant is one schema exposure away from being one.

insert into public.feature_flags (key, enabled, note) values
  ('social', false, 'Around: places, posts, stories, follows. Ships OFF until the layer is ready to be public.')
on conflict (key) do update set note = excluded.note;

create index if not exists stories_area_fk_idx on public.stories (area_id);

comment on index public.stories_area_fk_idx is
  'Plain, unlike stories_area_idx, which is partial on status = LIVE and therefore cannot serve the foreign key or a cascade.';

revoke execute on function private.project_social_identity(uuid) from public;
