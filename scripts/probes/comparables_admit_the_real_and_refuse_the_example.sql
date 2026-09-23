-- THE COMPARABLES RULE, EXERCISED FROM BOTH SIDES, against the LIVE project
-- `uccixoonmbhrnyczyigt`. Run through `mcp__Supabase__apply_migration` and
-- NEVER through `execute_sql`, as one statement batch.
--
-- IT ENDS IN A DELIBERATE `raise exception` WHOSE MESSAGE BEGINS
-- 'TWO SIDED PROBE PASSED', so the whole transaction unwinds and nothing it
-- wrote survives in any product table. BUILD_07 section 15 records a probe on
-- this build that ended on an UPDATE rather than a RAISE and therefore
-- COMMITTED five rows into live product tables. A probe that commits its own
-- evidence is on the stop list.
--
-- ===========================================================================
-- WHY A ONE SIDED TEST IS HALF A TEST, WHICH IS THE WHOLE REASON THIS EXISTS.
-- ===========================================================================
--
-- Every published listing on this estate is an example: 64 of 64 carry
-- `is_demo = true`. So on this estate a predicate that correctly excludes
-- examples and a predicate that excludes EVERYTHING return the identical
-- answer, which is nothing. `scripts/probes/price_check_stage_one.sql` asserts
-- `no_comparables` on the live estate and it is right to, but that assertion
-- alone cannot tell a working rule from a broken one. That is the exact blind
-- light that has bitten this platform twice in one day: section 65 (the whole
-- public catalogue refused to everybody and every green light stayed green)
-- and section 46.
--
-- So this probe puts TWO ROWS in front of the predicate that differ in ONE
-- COLUMN and asserts BOTH answers:
--
--   1  the control: both twins are inserted, both are PUBLISHED, both are
--      readable by a plain select, so "absent from the comparables" can never
--      be confused with "never inserted"
--   2  the NEGATIVE side: the `is_demo = true` twin is NOT a comparable
--   3  the POSITIVE side: the `is_demo = false` twin IS a comparable, and the
--      set has exactly one member rather than zero or two
--   4  the SINGLE VARIABLE FLIP: flip the admitted row's `is_demo` to true and
--      it leaves the set; flip it back and it returns. Nothing else about the
--      row moves, so `is_demo` and nothing else is what decided
--   5  the same pair through `area_asking_summary`, which is stage one's own
--      read: three non-demo rows produce a row, the same three flipped to demo
--      produce none
--   6  AND THE RULE'S OTHER HALF: the demo twin IS returned by the read the
--      catalogue actually performs, evaluated AS `anon`, because examples are
--      excluded from statistics and from Price Check comparables ONLY and are
--      NOT excluded from search, the home page, the feed or a listing page
--
-- Fixtures are COPIED from a live row with `create temp table ... as`, so no
-- column is invented and no NOT NULL is guessed at.

do $probe$
declare
  src_id       uuid;
  real_id      uuid;
  demo_id      uuid;
  base_lat     double precision := 6.4371;
  base_lng     double precision := 3.4519;
  n            integer;
  n_demo       integer;
  n_real       integer;
  v            record;
  anon_sees    integer;
  probe_area   text := 'Probe Ward Two Sided';
begin
  -- ====================================================== the twins, minted

  select id into src_id from public.listings order by created_at asc limit 1;
  if src_id is null then
    raise exception 'PROBE FAIL 0: no listing on this estate to copy a column list from';
  end if;

  create temp table pc_two on commit drop as
    select * from public.listings where id = src_id;
  insert into pc_two select * from pc_two;    -- 2
  insert into pc_two select * from pc_two;    -- 4

  real_id := extensions.gen_random_uuid();
  demo_id := extensions.gen_random_uuid();

  /*
   * FOUR ROWS, IDENTICAL IN EVERY COLUMN THE PREDICATE READS EXCEPT ONE.
   * Rows 1 to 3 are real (`is_demo = false`); row 4 is the example twin. Three
   * real rows rather than one because `area_asking_summary` has a `>= 3` floor
   * and assertion 5 has to be able to see it open.
   */
  with ranked as (
    select ctid as tid, row_number() over (order by ctid) as rn from pc_two
  )
  update pc_two f set
    id                = case r.rn when 1 then real_id when 4 then demo_id
                                  else extensions.gen_random_uuid() end,
    reference         = null,
    is_demo           = (r.rn = 4),
    demo_retire_after = null,
    status            = 'PUBLISHED',
    title             = 'Two sided probe fixture ' || r.rn,
    property_type     = 'apartment',
    listing_intent    = 'rent',
    rent_period       = 'year',
    sale_price_minor  = null,
    sale_status       = null,
    bedrooms          = 3,
    rent_amount_minor = (array[100000000, 200000000, 300000000, 200000000])[r.rn],
    latitude          = base_lat,
    longitude         = base_lng,
    size_sqm          = null,
    state_code        = 'LA',
    city              = 'Lagos',
    area              = probe_area,
    published_at      = now() - interval '30 days',
    created_at        = now(),
    updated_at        = now()
  from ranked r where f.ctid = r.tid;

  insert into public.listings select * from pc_two;

  -- ================================== 1. THE CONTROL. Both twins are there.

  select count(*) into n from public.listings
   where id in (real_id, demo_id) and status = 'PUBLISHED' and location is not null;
  if n <> 2 then
    raise exception 'PROBE FAIL 1: the control read found % of the 2 twins, so nothing below would mean anything', n;
  end if;

  select count(*) into n_real from public.listings where id = real_id and is_demo = false;
  select count(*) into n_demo from public.listings where id = demo_id and is_demo = true;
  if n_real <> 1 or n_demo <> 1 then
    raise exception 'PROBE FAIL 1b: the twins do not differ in is_demo as intended (real=%, demo=%)', n_real, n_demo;
  end if;

  -- ============ 2 and 3. THE NEGATIVE AND THE POSITIVE, from the same call.

  select count(*) filter (where c.id = demo_id),
         count(*) filter (where c.id = real_id),
         count(*)
    into n_demo, n_real, n
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 3, 750, 365, null, 60) c;

  if n_demo <> 0 then
    raise exception 'PROBE FAIL 2: THE EXAMPLE TWIN REACHED A COMPARABLE. is_demo is not inside the comparables predicate.';
  end if;
  if n_real <> 1 then
    raise exception 'PROBE FAIL 3: THE REAL TWIN DID NOT REACH A COMPARABLE. The predicate refuses everything, which on a 64-of-64 example estate is indistinguishable from working.';
  end if;
  if n <> 3 then
    raise exception 'PROBE FAIL 3b: the comparable set holds % rows, expected exactly the 3 real fixtures', n;
  end if;

  -- ================================= 4. THE SINGLE VARIABLE FLIP, both ways.

  update public.listings set is_demo = true where id = real_id;
  select count(*) into n_real
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 3, 750, 365, null, 60) c
   where c.id = real_id;
  if n_real <> 0 then
    raise exception 'PROBE FAIL 4a: the row stayed a comparable after is_demo was set true, so is_demo is not what decides';
  end if;

  update public.listings set is_demo = false where id = real_id;
  select count(*) into n_real
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 3, 750, 365, null, 60) c
   where c.id = real_id;
  if n_real <> 1 then
    raise exception 'PROBE FAIL 4b: the row did not come back after is_demo was set false again';
  end if;

  -- ============================ 4c. AND THE GATE ITSELF, on the real three.

  select * into v from public.estimate_value(base_lat, base_lng, 'apartment', 'rent', 3, null, null);
  if v.outcome <> 'refused' or v.refusal_code <> 'too_few_comparables' then
    raise exception 'PROBE FAIL 4c: three real comparables gave % / %, expected refused / too_few_comparables (the minimum is five)',
      v.outcome, coalesce(v.refusal_code, 'null');
  end if;
  if v.comparable_count <> 3 then
    raise exception 'PROBE FAIL 4d: the refusal counted % comparables, expected 3', v.comparable_count;
  end if;

  -- ========================== 5. STAGE ONE'S OWN READ, from both sides too.

  select count(*), coalesce(max(s.listing_count), 0)
    into n, n_real
    from public.area_asking_summary('LA', 'Lagos', probe_area, 'apartment', 'rent', 3, 540) s;
  if n <> 1 or n_real <> 3 then
    raise exception 'PROBE FAIL 5a: the area report gave % group(s) of % listing(s), expected 1 of 3', n, n_real;
  end if;

  update public.listings set is_demo = true where id in (select id from pc_two);
  select count(*) into n
    from public.area_asking_summary('LA', 'Lagos', probe_area, 'apartment', 'rent', 3, 540) s;
  if n <> 0 then
    raise exception 'PROBE FAIL 5b: the area report returned % group(s) built on example listings', n;
  end if;
  update public.listings set is_demo = false where id in (select id from pc_two) and id <> demo_id;

  -- ============ 6. THE OTHER HALF OF THE RULE: examples are NOT hidden from
  --                the catalogue, and this half is read AS `anon`, which is
  --                the role a signed-out visitor actually holds.

  set local role anon;
  select count(*) into anon_sees from public.listings
   where id in (real_id, demo_id) and status = 'PUBLISHED';
  reset role;

  if anon_sees <> 2 then
    raise exception 'PROBE FAIL 6: anon sees % of the 2 twins in the catalogue. Examples are excluded from statistics and from Price Check comparables ONLY, never from search, the home page, the feed or a listing page.', anon_sees;
  end if;

  raise exception 'TWO SIDED PROBE PASSED, ROLLING BACK. %',
    '1 control: both twins PUBLISHED and readable | '
    || '2 example twin: NOT a comparable | '
    || '3 real twin: IS a comparable, set size 3 | '
    || '4 flip: is_demo true removes it, false returns it, nothing else moved | '
    || '4c gate on 3 real: refused / too_few_comparables, count 3 | '
    || '5 area report: 1 group of 3 real, 0 groups when the same rows are demo | '
    || '6 as anon: both twins still in the catalogue, examples are not hidden from search';
end
$probe$;
