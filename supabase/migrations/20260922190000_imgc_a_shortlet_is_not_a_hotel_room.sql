-- A SHORTLET IS NOT A HOTEL ROOM, AND `room_category` COULD NOT SAY SO.
--
-- `GOVERNING-11` screen one asks a shortlet host one question first: is this an
-- entire flat, a whole house, or a private room. That question has no answer in
-- this database. `public.room_category` was created in
-- `20260918080804_m01_stays_enums_and_cancellation_policies` as
-- `single | double | twin | suite | family | dorm`, which is a HOTEL'S
-- vocabulary: it describes what is in a room, and a shortlet host is letting a
-- whole dwelling.
--
-- WHAT A SHORTLET HOST HAS HAD TO DO UNTIL NOW. The wizard offered those six
-- and nothing else, so somebody letting a two-bedroom flat in Lekki picked
-- "double" or "family" about their own home and the row said something untrue.
-- Nothing refused it and nothing could: every one of the six is a valid label.
-- That is worse than a refusal, because the shelf then groups a flat with a
-- twin room and a guest filtering for a whole place is shown a bedroom.
--
-- ADDITIVE AND NOTHING ELSE. Three labels are added to an existing enum. No
-- existing value is renamed or removed, no row is rewritten, no column changes
-- type, no constraint is dropped, and every row already in `room_types` keeps
-- exactly the category it has. An estate that never runs this keeps working
-- and the interface says so in words rather than writing a wrong category:
-- `setShortletPlaceDraft` in `lib/host/actions.ts` reads Postgres's own `22P02`
-- and names this file.
--
-- WHY `add value if not exists` AND WHY THE ORDER IS FIXED. `if not exists`
-- makes this safe to re-run and safe on an estate where somebody has already
-- added one by hand. `before 'single'` puts the three whole-place labels at the
-- head of the enum, which is the order a shortlet host meets them in the render
-- and the order `enum_range` will report them in; an enum's sort order is a
-- real fact about the type, so it is stated here rather than left to the
-- accident of when this ran.
--
-- ALTER TYPE ... ADD VALUE CANNOT BE USED IN THE SAME TRANSACTION THAT ADDED
-- IT. That is a Postgres rule, not a style choice, and it is why this migration
-- adds the labels and NOTHING ELSE: any statement here that tried to insert a
-- row using one of them would fail. `scripts/probes/stays_place_type.sql` does
-- that work, afterwards, in its own transaction, and rolls itself back.
--
-- STATUS: NOT APPLIED. This estate's Supabase project reports INACTIVE and
-- every call to it from the build box answers "Connection terminated due to
-- connection timeout", on `list_migrations` as much as on `apply_migration`.
-- Restoring a paused project is a change to infrastructure nobody asked for,
-- so it is left to whoever owns that call. See section 39 of
-- `docs/BUILD_07_LEDGER.md`.

alter type public.room_category add value if not exists 'entire_flat' before 'single';
alter type public.room_category add value if not exists 'whole_house' after 'entire_flat';
alter type public.room_category add value if not exists 'private_room' after 'whole_house';

comment on type public.room_category is
  'What a bookable unit is. The first three are whole-place shortlet types (GOVERNING-11 screen one); the last six are hotel room types. A room_types row carries exactly one.';
