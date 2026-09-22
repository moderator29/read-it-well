-- A BEDROOM IS NOT A BED, AND THE SHORTLET SCREEN HAD NOWHERE TO PUT ONE.
--
-- WHAT WENT WRONG, SAID PLAINLY, BECAUSE THE FAULT IS THE REASON THIS FILE
-- EXISTS. `GOVERNING-11` screen one asks a shortlet host for bedrooms, beds
-- and maximum guests. `room_types` holds `sleeps` for the third and `beds` for
-- the second and has never held the first. The screen shipped writing
-- `beds = {"bedrooms": 2, "beds": 3}`, an OBJECT, into a column that carries
--
--   room_types_beds_check  CHECK (jsonb_typeof(beds) = 'array')
--
-- since `20260918081453_m04_room_types_units_rate_plans_rate_calendar.sql:45`,
-- where the shape is written out on the line above it. Every live row holds an
-- array, `[{"kind": "queen", "count": 1}]`. So the first real shortlet host
-- would have met `23514` on save, on the screen the whole feature is for.
--
-- THE BELIEF THAT CAUSED IT WAS WRITTEN DOWN AND WRONG.
-- `apps/web/src/lib/host/queries.ts` stated that "`room_types.beds` has no
-- shape constraint", and the probe that was supposed to catch this asserted a
-- round trip BECAUSE of that sentence. A comment asserting an ABSENCE is
-- exactly as unverified as a test asserting a presence, and this one was
-- inherited rather than checked. The comment is corrected in the same commit
-- as this file, and the probe now asserts the constraint EXISTS.
--
-- WHY A COLUMN AND NOT A WIDER `beds`. Three reasons, and the first is the
-- decisive one.
--
--   1. A BEDROOM IS NOT A BED. `beds` is an array of what is slept in, one
--      entry per kind with a count, and it is READ that way: `BedSpec` in
--      `lib/stays/types.ts` is `{kind, count}` and `RoomTypeRow.beds` is
--      `BedSpec[]`. A bedroom count can only enter that array as a fake entry,
--      and every reader that prints beds would then print a bedroom as a bed.
--   2. WIDENING THE CHECK COSTS EVERY READER, FOREVER. Accepting an object as
--      well as an array means every present and future reader handles two
--      shapes, and the check is the only thing that guarantees one today. A
--      constraint relaxed to fit a bug is a constraint that stops being
--      evidence.
--   3. IT BELONGS BESIDE ITS TWO SIBLINGS. "2 bedrooms, 3 beds, sleeps 6" is
--      one sentence about one bookable unit. `sleeps` and `beds` are already
--      on `room_types`; splitting the third across another table would split
--      the sentence.
--
-- NULLABLE, AND ZERO IS A DIFFERENT FACT FROM UNKNOWN. A hotel room type has
-- no bedroom count and must not be made to claim one. A STUDIO HAS ZERO, and
-- zero is its true answer. Null means nobody has been asked; 0 means somebody
-- answered none. The same argument as the sale cost columns in section 23, and
-- the reason this column is not `not null default 0`.
--
-- ADDITIVE AND NOTHING ELSE. One nullable column with its own check. No
-- existing column changes, no constraint is dropped or relaxed, no row is
-- rewritten, and every row already in `room_types` keeps everything it has and
-- reads back `null` for the new column. `room_types` has no column-list grant
-- (unlike `public.listings` after SEC-6), so a new column needs no GRANT: the
-- table's `room_types_select` policy already governs who may read it.
--
-- STATUS: WRITTEN TO BE APPLIED BY THE COORDINATOR against
-- `uccixoonmbhrnyczyigt`, the live estate. The build box reaches
-- `oepdbzejvrrqxgynfcdh`, which is INACTIVE and times out; that is a wall
-- around this box and not a fact about the estate.
-- `scripts/probes/stays_place_type.sql` proves this column and the `beds`
-- constraint together, and ends in a deliberate
-- `raise exception 'PROBE ALL PASS ...'` so it rolls itself back.

alter table public.room_types
  add column if not exists bedrooms smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.room_types'::regclass
      and conname  = 'room_types_bedrooms_check'
  ) then
    alter table public.room_types
      add constraint room_types_bedrooms_check
      check (bedrooms is null or (bedrooms >= 0 and bedrooms <= 30));
  end if;
end
$$;

comment on column public.room_types.bedrooms is
  'How many bedrooms this unit has. Null means nobody has been asked, which is every hotel room type; 0 means a studio, which is a real answer and not a missing one. Set by the shortlet set-up screen (GOVERNING-11 screen one).';

-- THE `beds` COMMENT NOW CARRIES ITS OWN CONSTRAINT. The shape was documented
-- in the migration that created the column and nowhere the database itself
-- would show it, so the next reader who asked psql what this column holds was
-- told nothing and the last one guessed. It is one line and it is the line a
-- writer needs.
comment on column public.room_types.beds is
  'What is slept in: a jsonb ARRAY of {"kind", "count"}, enforced by room_types_beds_check (jsonb_typeof = array). Never an object. A bedroom count is not a bed and lives in room_types.bedrooms.';
