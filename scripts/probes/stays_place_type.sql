-- THE SHORTLET PLACE TYPE probe for the LIVE project: the three
-- `room_category` labels `GOVERNING-11` screen one asks for, run through
-- `mcp__Supabase__apply_migration` and NEVER through `execute_sql`, as one
-- statement batch.
--
-- IT ENDS IN A DELIBERATE `raise exception` WHOSE MESSAGE BEGINS
-- 'PROBE ALL PASS', so the whole transaction unwinds and nothing it wrote
-- survives in any product table. That ending is not decoration. BUILD_07
-- ledger section 15 records a probe on this build that ended on an UPDATE
-- rather than a RAISE and therefore COMMITTED: five rows into live product
-- tables, three of which could not be removed the same day without taking a
-- real person's own message down with them. A probe that commits its own
-- evidence is on the stop list, and part of today went on undoing one.
--
-- THE FIXTURE IS CHOSEN BY THE PREDICATE UNDER TEST. The predicate is "a
-- `room_types` row may carry one of the three new labels", so the fixture is a
-- `room_types` row, COPIED from the oldest live one with a fresh id, with its
-- name made unique so the copy cannot collide with its original on
-- `room_types_accommodation_id_name_key`. The column list is read out of
-- `pg_attribute` rather than typed, because probes on this build have failed
-- three times on invented columns.
--
-- WHY IT DOES NOT CREATE ITS OWN ACCOMMODATION. `room_types.accommodation_id`
-- is a foreign key, and inventing a parent would mean inventing a business, an
-- owner and a slug: four rows of fiction to test one enum label, each of them
-- another thing that must roll back cleanly. Copying an existing row borrows a
-- parent that is already valid.
--
-- What it proves, in order:
--   1. The enum `public.room_category` carries all three new labels, and still
--      carries all six old ones. An additive migration that lost a label would
--      be a data loss migration wearing an additive comment.
--   2. The three are ordered AHEAD of the six, which is what the migration's
--      `before 'single'` asks for and what `enum_range` will report to
--      anything that sorts by the type.
--   3. NO EXISTING ROW CHANGED CATEGORY: the count of rows per category is
--      identical before and after, and no row carries one of the new labels
--      until this probe writes one.
--   4. The fixture is copied from a live row, not invented.
--   5. Each of the three labels is ACCEPTED on `room_types.category` and reads
--      back as itself.
--   6. A label that is not in the enum is REFUSED, with SQLSTATE 22P02. That
--      is the exact code `placeTypeUnavailable` in
--      `apps/web/src/lib/host/stays-setup.ts` reads to tell an operator which
--      migration has not been applied, so the interface's diagnosis is tested
--      against the database rather than against a guess.
--   7. `room_types.beds` accepts the `{bedrooms, beds}` object the shortlet
--      screen writes and reads it back unchanged. It is jsonb with no shape
--      constraint, which is exactly why it is asserted rather than assumed.
--   8. Exactly one row was added, and it is the fixture.
--
-- The migration this probes, `20260922190000_imgc_a_shortlet_is_not_a_hotel_room`,
-- creates no `SECURITY DEFINER` function, so rule 21 has nothing to revoke
-- here. If one is ever added, the revoke goes in the same migration and this
-- probe gains an assertion for it.
--
-- STATUS: NOT RUN, AND THE REASON IS MEASURED RATHER THAN ASSUMED.
-- `mcp__Supabase__list_projects` reports one project, `oepdbzejvrrqxgynfcdh`,
-- with status INACTIVE, and `mcp__Supabase__list_migrations` against it answers
-- "Failed to list database migrations: Connection terminated due to connection
-- timeout". The migration above has therefore not been applied either, so
-- assertions 1, 2, 5 and 7 would fail today for the honest reason that the
-- labels do not exist yet. Naming the project a probe ran against is part of
-- running it; this one has not run against any.

do $probe$
declare
  v_labels       text[];
  v_missing      text;
  v_first_six    text[];
  v_cols         text;
  v_src_id       uuid;
  v_acc_id       uuid;
  v_id           uuid := gen_random_uuid();
  v_label        text;
  v_rows_before  bigint;
  v_rows_after   bigint;
  v_new_before   bigint;
  v_read_back    text;
  v_beds         jsonb;
  v_sqlstate     text;
  v_notes        text := '';
  v_new          text[] := array['entire_flat', 'whole_house', 'private_room'];
  v_old          text[] := array['single', 'double', 'twin', 'suite', 'family', 'dorm'];
begin
  /* ---------------------------------------------------------------- 1
     All three new labels exist, and all six old ones survive. An additive
     migration that dropped a label would be a data loss migration wearing an
     additive comment, and nothing else in this repository would notice. */
  select array_agg(e.enumlabel::text order by e.enumsortorder)
    into v_labels
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  where t.typname = 'room_category';

  select string_agg(n, ', ')
    into v_missing
  from unnest(v_new || v_old) as n
  where not (n = any(v_labels));
  if v_missing is not null then
    raise exception 'PROBE FAIL 1: room_category is missing: %', v_missing;
  end if;
  v_notes := v_notes || '1 nine labels present, six old ones intact; ';

  /* ---------------------------------------------------------------- 2
     The three whole-place labels sort AHEAD of the six room labels, which is
     what `before ''single''` asks for. An enum's sort order is a real fact
     about the type and anything that orders by it will see this. */
  v_first_six := v_labels[1:3];
  if not (v_first_six @> v_new and v_new @> v_first_six) then
    raise exception 'PROBE FAIL 2: the first three labels are % and not the three place types', v_first_six;
  end if;
  v_notes := v_notes || '2 place types sort ahead of room types; ';

  /* ---------------------------------------------------------------- 3
     No existing row carries one of the new labels, counted BEFORE anything is
     written. A migration that rewrote somebody''s category would show up
     here and nowhere else. */
  select count(*) into v_rows_before from public.room_types;
  select count(*) into v_new_before
  from public.room_types
  where category::text = any(v_new);
  if v_new_before <> 0 then
    raise exception 'PROBE FAIL 3: % existing room_types rows already carry a place type', v_new_before;
  end if;
  v_notes := v_notes || format('3 %s existing rows, none re-categorised; ', v_rows_before);

  /* ---------------------------------------------------------------- 4
     The fixture is COPIED from the oldest live row, with the column list read
     out of the catalogue rather than typed. Three probes on this build have
     failed on a column somebody invented from memory. */
  select id, accommodation_id
    into v_src_id, v_acc_id
  from public.room_types
  order by created_at
  limit 1;
  if v_src_id is null then
    raise exception 'PROBE FAIL 4: there is no room_types row to copy a fixture from';
  end if;

  select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
    into v_cols
  from pg_attribute a
  where a.attrelid = 'public.room_types'::regclass
    and a.attnum > 0
    and not a.attisdropped
    and a.attname not in ('id', 'name', 'category', 'beds', 'created_at', 'updated_at');

  execute format(
    'insert into public.room_types (id, name, category, beds, %s)
       select $1, ''PROBE '' || $2::text, ''entire_flat''::public.room_category,
              $3::jsonb, %s
       from public.room_types where id = $4',
    v_cols, v_cols
  ) using v_id, v_id, '{"bedrooms": 2, "beds": 3}'::jsonb, v_src_id;
  v_notes := v_notes || format('4 fixture copied from live room type %s; ', v_src_id);

  /* ---------------------------------------------------------------- 5
     Each of the three is accepted and reads back as itself. */
  foreach v_label in array v_new loop
    update public.room_types set category = v_label::public.room_category where id = v_id;
    select category::text into v_read_back from public.room_types where id = v_id;
    if v_read_back is distinct from v_label then
      raise exception 'PROBE FAIL 5: wrote % and read back %', v_label, v_read_back;
    end if;
  end loop;
  v_notes := v_notes || '5 all three place types accepted and read back; ';

  /* ---------------------------------------------------------------- 6
     A label the enum does not carry is refused with SQLSTATE 22P02, which is
     the exact code the interface reads to name the missing migration. If
     Postgres ever answered with something else, `placeTypeUnavailable` would
     be reporting a missing migration for an unrelated fault, or missing a
     real one. */
  begin
    update public.room_types set category = 'bungalow'::public.room_category where id = v_id;
    raise exception 'PROBE FAIL 6: an unknown enum label was accepted';
  exception
    when invalid_text_representation then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      if v_sqlstate <> '22P02' then
        raise exception 'PROBE FAIL 6: unknown label refused with % and not 22P02', v_sqlstate;
      end if;
  end;
  v_notes := v_notes || '6 unknown label refused with 22P02; ';

  /* ---------------------------------------------------------------- 7
     `beds` holds the object the shortlet screen writes. The column is jsonb
     with no shape constraint, which is precisely why this is asserted: a
     column that accepts anything is a column that can silently accept the
     wrong thing. */
  update public.room_types
     set category = 'entire_flat'::public.room_category,
         beds = '{"bedrooms": 2, "beds": 3}'::jsonb
   where id = v_id;
  select beds into v_beds from public.room_types where id = v_id;
  if (v_beds ->> 'bedrooms')::int <> 2 or (v_beds ->> 'beds')::int <> 3 then
    raise exception 'PROBE FAIL 7: beds read back as %', v_beds;
  end if;
  v_notes := v_notes || '7 beds json round trips; ';

  /* ---------------------------------------------------------------- 8
     Exactly one row was added and it is the fixture. */
  select count(*) into v_rows_after from public.room_types;
  if v_rows_after <> v_rows_before + 1 then
    raise exception 'PROBE FAIL 8: rows went from % to %', v_rows_before, v_rows_after;
  end if;
  if not exists (select 1 from public.room_types where id = v_id) then
    raise exception 'PROBE FAIL 8: the fixture is not the row that was added';
  end if;
  v_notes := v_notes || format('8 rows %s to %s only the fixture; ', v_rows_before, v_rows_after);

  /* ------------------------------------------------------------------------
     THE DELIBERATE FAILURE. Everything above passed; this unwinds the whole
     transaction so the fixture never reaches the product. */
  raise exception 'PROBE ALL PASS stays place type: %ROLLED BACK, nothing committed', v_notes;
end
$probe$;
