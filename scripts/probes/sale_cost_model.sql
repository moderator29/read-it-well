-- SALE cost model probe for the LIVE project: the six columns a Nigerian
-- buyer actually meets, run through `mcp__Supabase__apply_migration` and NEVER
-- through `execute_sql`, as one statement batch.
--
-- IT ENDS IN A DELIBERATE `raise exception` WHOSE MESSAGE BEGINS
-- 'PROBE ALL PASS', so the whole transaction unwinds and nothing it wrote
-- survives in any product table. That ending is not decoration. BUILD_07
-- ledger section 15 records a probe on this build that forged JWT claims and
-- ended on an UPDATE rather than a RAISE, so it COMMITTED: five rows into
-- live product tables, three of which cannot be removed today without taking
-- a real person's own message down with them. A probe that commits its own
-- evidence is on the stop list.
--
-- THE FIXTURE IS CHOSEN BY THE PREDICATE UNDER TEST AND COPIED FROM A LIVE
-- ROW. The predicates are the six sale-cost check constraints on
-- `public.listings`, so the fixture is a copy of the oldest live
-- `listing_intent = 'sale'` row, given a fresh id, with every nullable column
-- that sits in a unique index blanked so the copy cannot collide with its
-- original. The column list is read out of `pg_attribute` rather than typed,
-- because probes on this build have failed three times on invented columns.
--
-- What it proves, in order:
--   1. All six columns exist, are bigint, and are NULLABLE. Nullable is the
--      whole feature: UNDECLARED and ZERO are different facts and the column
--      has to be able to hold the difference.
--   2. Each carries a VALIDATED check refusing a negative, and the total
--      carries `listings_total_purchase_covers_its_parts`. An unvalidated
--      constraint was never asked about the rows already there.
--   3. `anon` can SELECT all six. SEC-6 replaced the table wide grant with a
--      column list, so a column added without a grant is invisible to a
--      signed-out visitor, and a cost model a stranger cannot read is a cost
--      model nobody reads.
--   4. NO EXISTING ROW IS BROKEN: every row already in the table satisfies
--      all seven predicates, counted before anything is written.
--   5. The fixture is copied, not invented.
--   6. A ZERO IS ACCEPTED on all six and reads back as zero.
--   7. AN UNDECLARED COST STAYS UNDECLARED: null in, null back, on all six.
--   8. A NEGATIVE IS REFUSED on each of the six, by a check violation.
--   9. A total above its parts is stored and a total one kobo below them is
--      refused. One direction only, which is the twin of
--      `listings_total_move_in_covers_its_parts`.
--  10. Exactly one row was added, and it is the fixture.
--
-- The migration this probes, `20260922160000_c1_what_a_buyer_actually_pays`,
-- creates no `SECURITY DEFINER` function, so rule 21 has nothing to revoke
-- here. If one is ever added, the revoke goes in the same migration and this
-- probe gains an assertion for it.
--
-- STATUS AT THE TIME OF WRITING: NOT YET RUN. Every Supabase call from this
-- box times out against an INACTIVE project ("Failed to initialise history
-- table: Connection terminated due to connection timeout"). The file is here
-- so it can be run unchanged the moment the project answers.

do $probe$
declare
  v_cols          text;
  v_missing       text;
  v_ungranted     text;
  v_unconstrained text;
  v_src_id        uuid;
  v_id            uuid := gen_random_uuid();
  v_col           text;
  v_rows_before   bigint;
  v_rows_after    bigint;
  v_broken        bigint;
  v_price         bigint;
  v_zero_count    int;
  v_null_count    int;
  v_notes         text := '';
  v_names         text[] := array[
    'sale_agency_fee_minor',
    'sale_legal_fee_minor',
    'governors_consent_fee_minor',
    'stamp_duty_minor',
    'survey_registration_fee_minor',
    'total_purchase_cost_minor'
  ];
begin
  /* ---------------------------------------------------------------- 1
     Every column exists, is bigint, and is nullable. Nullable is not a
     detail: UNDECLARED and ZERO are different facts and the whole honesty of
     this feature rests on the column being able to hold the difference. */
  select string_agg(n, ', ')
    into v_missing
  from unnest(v_names) as n
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name   = 'listings'
      and c.column_name  = n
      and c.data_type    = 'bigint'
      and c.is_nullable  = 'YES'
  );
  if v_missing is not null then
    raise exception 'PROBE FAIL 1: absent, not bigint, or not nullable: %', v_missing;
  end if;
  v_notes := v_notes || '1 six columns bigint and nullable; ';

  /* ---------------------------------------------------------------- 2
     Each has a validated non-negative check, and the total has the
     covers-its-parts check. An unvalidated constraint is a constraint that
     was never asked about the rows already there. */
  select string_agg(n, ', ')
    into v_unconstrained
  from unnest(v_names) as n
  where not exists (
    select 1
    from pg_constraint k
    where k.conrelid = 'public.listings'::regclass
      and k.contype  = 'c'
      and k.convalidated
      and pg_get_constraintdef(k.oid) like '%' || n || '%'
  );
  if v_unconstrained is not null then
    raise exception 'PROBE FAIL 2: no validated check constraint mentions: %', v_unconstrained;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_total_purchase_covers_its_parts'
      and convalidated
  ) then
    raise exception 'PROBE FAIL 2b: listings_total_purchase_covers_its_parts is absent or unvalidated';
  end if;
  v_notes := v_notes || '2 validated checks incl covers_its_parts; ';

  /* ---------------------------------------------------------------- 3
     `anon` can read all six. SEC-6 replaced the table-wide SELECT grant with
     a column list, so a column added without a grant is invisible to a
     signed-out visitor, and a cost model a stranger cannot read is a cost
     model nobody reads. */
  select string_agg(n, ', ')
    into v_ungranted
  from unnest(v_names) as n
  where not has_column_privilege('anon', 'public.listings', n, 'SELECT');
  if v_ungranted is not null then
    raise exception 'PROBE FAIL 3: anon cannot select: %', v_ungranted;
  end if;
  v_notes := v_notes || '3 anon selects all six; ';

  /* ---------------------------------------------------------------- 4
     NO EXISTING ROW IS BROKEN. Counted before anything is written: every row
     already in the table satisfies the non-negative predicates and the
     covers-its-parts predicate. */
  select count(*) into v_rows_before from public.listings;
  select count(*)
    into v_broken
  from public.listings
  where coalesce(sale_agency_fee_minor, 0)         < 0
     or coalesce(sale_legal_fee_minor, 0)          < 0
     or coalesce(governors_consent_fee_minor, 0)   < 0
     or coalesce(stamp_duty_minor, 0)              < 0
     or coalesce(survey_registration_fee_minor, 0) < 0
     or coalesce(total_purchase_cost_minor, 0)     < 0
     or (
          total_purchase_cost_minor is not null
          and total_purchase_cost_minor <
                coalesce(sale_price_minor, 0)
              + coalesce(sale_agency_fee_minor, 0)
              + coalesce(sale_legal_fee_minor, 0)
              + coalesce(governors_consent_fee_minor, 0)
              + coalesce(stamp_duty_minor, 0)
              + coalesce(survey_registration_fee_minor, 0)
        );
  if v_broken <> 0 then
    raise exception 'PROBE FAIL 4: % of % existing rows violate the new predicates', v_broken, v_rows_before;
  end if;
  v_notes := v_notes || format('4 %s existing rows 0 broken; ', v_rows_before);

  /* ---------------------------------------------------------------- 5
     The fixture, chosen by the predicate under test and copied rather than
     invented. A sale row, because these are the sale side's constraints and
     `listings_sale_needs_a_status` means a sale row is the only shape that
     can carry them honestly. */
  select id into v_src_id
  from public.listings
  where listing_intent = 'sale'
  order by created_at
  limit 1;
  if v_src_id is null then
    raise exception 'PROBE FAIL 5: no live sale row to copy, so the fixture cannot be taken from the shape under test';
  end if;

  select string_agg(quote_ident(attname), ', ' order by attnum)
    into v_cols
  from pg_attribute
  where attrelid = 'public.listings'::regclass
    and attnum > 0
    and not attisdropped
    and attgenerated = '';

  create temp table probe_fixture on commit drop as
    select * from public.listings where id = v_src_id;

  /* A copy must not collide with its original, so every nullable column that
     sits in a unique index is blanked. Read from the catalogue, so an index
     added later is handled without editing this. */
  for v_col in
    select distinct a.attname
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = 'public.listings'::regclass
      and i.indisunique
      and not a.attnotnull
  loop
    execute format('update probe_fixture set %I = null', v_col);
  end loop;

  execute format('update probe_fixture set id = %L', v_id);
  execute format('insert into public.listings (%s) select %s from probe_fixture', v_cols, v_cols);
  v_notes := v_notes || format('5 fixture copied from live sale row %s; ', v_src_id);

  /* ---------------------------------------------------------------- 6
     A ZERO IS ACCEPTED, on all six and on the asking price with them, which
     is the honest shape of "this seller charges the buyer nothing". */
  update public.listings
     set sale_price_minor              = 0,
         sale_agency_fee_minor         = 0,
         sale_legal_fee_minor          = 0,
         governors_consent_fee_minor   = 0,
         stamp_duty_minor              = 0,
         survey_registration_fee_minor = 0,
         total_purchase_cost_minor     = 0
   where id = v_id;

  select count(*) filter (where v = 0), count(*) filter (where v is null)
    into v_zero_count, v_null_count
  from (
    select unnest(array[
      sale_agency_fee_minor,
      sale_legal_fee_minor,
      governors_consent_fee_minor,
      stamp_duty_minor,
      survey_registration_fee_minor,
      total_purchase_cost_minor
    ]) as v
    from public.listings where id = v_id
  ) s;
  if v_zero_count <> 6 or v_null_count <> 0 then
    raise exception 'PROBE FAIL 6: a stored zero did not read back as zero (% zeroes, % nulls)', v_zero_count, v_null_count;
  end if;
  v_notes := v_notes || '6 zero accepted and reads back as zero on all six; ';

  /* ---------------------------------------------------------------- 7
     AND AN UNDECLARED COST IS A DIFFERENT FACT. Null goes in, null comes
     back, and nothing anywhere turns it into a nought. */
  update public.listings
     set sale_agency_fee_minor         = null,
         sale_legal_fee_minor          = null,
         governors_consent_fee_minor   = null,
         stamp_duty_minor              = null,
         survey_registration_fee_minor = null,
         total_purchase_cost_minor     = null
   where id = v_id;

  select count(*) filter (where v is null)
    into v_null_count
  from (
    select unnest(array[
      sale_agency_fee_minor,
      sale_legal_fee_minor,
      governors_consent_fee_minor,
      stamp_duty_minor,
      survey_registration_fee_minor,
      total_purchase_cost_minor
    ]) as v
    from public.listings where id = v_id
  ) s;
  if v_null_count <> 6 then
    raise exception 'PROBE FAIL 7: an undeclared cost did not read back as undeclared (% of 6)', v_null_count;
  end if;
  v_notes := v_notes || '7 undeclared stays undeclared on all six; ';

  /* ---------------------------------------------------------------- 8
     A NEGATIVE IS REFUSED, one column at a time, each by a check violation
     and not by a type error or a trigger. */
  foreach v_col in array v_names loop
    begin
      execute format('update public.listings set %I = -1 where id = %L', v_col, v_id);
      raise exception 'PROBE FAIL 8: % accepted -1', v_col;
    exception
      when check_violation then
        null;
    end;
  end loop;
  v_notes := v_notes || '8 all six refuse -1 with a check violation; ';

  /* ---------------------------------------------------------------- 9
     THE TOTAL MAY NOT UNDERCUT ITS OWN PARTS, which is the shape a listing
     takes when an attractive all-in figure is advertised over fees that say
     otherwise. One direction only: above the parts is honest. */
  update public.listings
     set sale_price_minor              = 180000000000,
         sale_agency_fee_minor         =   9000000000,
         sale_legal_fee_minor          =   9000000000,
         governors_consent_fee_minor   =   5000000000,
         stamp_duty_minor              =   1500000000,
         survey_registration_fee_minor =    500000000,
         total_purchase_cost_minor     = 205000000000
   where id = v_id;
  select sale_price_minor into v_price from public.listings where id = v_id;
  if v_price <> 180000000000 then
    raise exception 'PROBE FAIL 9: a total above its parts was not stored';
  end if;

  begin
    update public.listings
       set total_purchase_cost_minor = 204999999999
     where id = v_id;
    raise exception 'PROBE FAIL 9b: a total one kobo below its parts was accepted';
  exception
    when check_violation then
      null;
  end;
  v_notes := v_notes || '9 total above parts accepted, one kobo below refused; ';

  /* --------------------------------------------------------------- 10
     Nothing else moved. One row added, which is the fixture, and it is about
     to be rolled away with everything else. */
  select count(*) into v_rows_after from public.listings;
  if v_rows_after <> v_rows_before + 1 then
    raise exception 'PROBE FAIL 10: row count went from % to %, expected %', v_rows_before, v_rows_after, v_rows_before + 1;
  end if;
  v_notes := v_notes || format('10 rows %s to %s only the fixture; ', v_rows_before, v_rows_after);

  /* The deliberate failure. Everything above unwinds with it. */
  raise exception 'PROBE ALL PASS sale cost model: %ROLLED BACK, nothing committed', v_notes;
end
$probe$;
