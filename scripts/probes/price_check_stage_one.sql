-- PRICE CHECK STAGE ONE probe, for the LIVE project `uccixoonmbhrnyczyigt`.
-- Run through `mcp__Supabase__apply_migration` and NEVER through
-- `execute_sql`, as one statement batch.
--
-- IT ENDS IN A DELIBERATE `raise exception` WHOSE MESSAGE BEGINS
-- 'PROBE ALL PASS', so the whole transaction unwinds and nothing it wrote
-- survives in any product table. That ending is not decoration: BUILD_07
-- section 15 records a probe on this build that ended on an UPDATE rather than
-- a RAISE and therefore COMMITTED five rows into live product tables. A probe
-- that commits its own evidence is on the stop list.
--
-- WHY IT WRITES LISTINGS AT ALL, when the alternative was to assert the gate
-- against an empty estate. Because an empty estate proves only that a function
-- returns nothing, and "returns nothing" is what a BROKEN gate returns too.
-- Every listing on this project is an example (64 of 64), so the only way to
-- see the gate ANSWER, to see the radius ladder open a rung, and to see the
-- interquartile range come out as the actual interquartile range rather than a
-- percentage, is to put real rows in front of it and take them away again.
-- The fixtures are COPIED from a live row with `create temp table ... as`, so
-- no column is invented and no NOT NULL is guessed at; probes on this build
-- have failed three times on invented columns.
--
-- WHAT IT PROVES, in order:
--   1  Rule 21, read back: the three SECURITY DEFINER functions refuse anon
--      and authenticated and admit service_role.
--   2  The eight read functions DO admit anon, which is the acquisition
--      surface working rather than silently answering nothing.
--   3  price_check_events holds no coordinate column of any kind, refuses a
--      six character cell, and truncates one passed through the writer.
--   4  The share scope enum has no value for a property, and never may.
--   5  The share table accepts 1004 Estate, Lekki Phase 2 and a bare street
--      name, and refuses 14 Bourdillon Road, No. 14 Bourdillon, a typed area
--      card, an inverted range and a card built on two listings. THE FIRST
--      VERSION OF THAT CONSTRAINT REFUSED 1004 ESTATE UNDER A COMMENT SAYING
--      IT DID NOT, and this probe is what found it, because it asserts the
--      acceptance and not only the refusal.
--   6  The gate ANSWERS on six real comparables, opening the radius ladder
--      from 750 m to 1500 m to do it, and the range is the actual IQR.
--   7  The per-square-metre pass counts only rows that STATE a size.
--   8  Five comparables can never reach 'high'. Fifteen can.
--   9  A zero bedroom row never enters a one bedroom set.
--  10  Four comparables refuse with `too_few_comparables` and the count.
--  11  With the fixtures gone the estate refuses with `no_comparables` while
--      `comparable_supply_near` reports example listings, which is the pair
--      that lets the surface say `demo_only` instead of guessing.
--  12  The area report returns nothing for Lagos today and the census says
--      why: examples only.
--  13  Both retention and watch cron jobs are scheduled.

do $probe$
declare
  src_id     uuid;
  base_lat   double precision := 6.4400;
  base_lng   double precision := 3.4200;
  far_lat    double precision := 6.4510;   -- about 1220 m north
  v          record;
  n          integer;
  txt        text;
  ok_count   integer := 0;
  demo_lat   double precision;
  demo_lng   double precision;
  ev_id      uuid := extensions.gen_random_uuid();
  share_id   uuid;
begin
  -- ==========================================================  1. RULE 21

  if has_function_privilege('anon',
       'public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid)',
       'EXECUTE')
  then raise exception 'PROBE FAIL 1a: anon can execute record_price_check_event'; end if;

  if has_function_privilege('authenticated',
       'public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid)',
       'EXECUTE')
  then raise exception 'PROBE FAIL 1b: authenticated can execute record_price_check_event'; end if;

  if not has_function_privilege('service_role',
       'public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid)',
       'EXECUTE')
  then raise exception 'PROBE FAIL 1c: service_role cannot execute record_price_check_event'; end if;

  if has_function_privilege('anon',
       'public.create_price_check_share(public.price_check_share_scope, text, text, text, public.property_type, public.listing_intent, integer, bigint, bigint, bigint, integer, timestamptz, timestamptz, uuid)',
       'EXECUTE')
    or has_function_privilege('authenticated',
       'public.create_price_check_share(public.price_check_share_scope, text, text, text, public.property_type, public.listing_intent, integer, bigint, bigint, bigint, integer, timestamptz, timestamptz, uuid)',
       'EXECUTE')
  then raise exception 'PROBE FAIL 1d: a client role can mint a share card directly'; end if;

  if has_function_privilege('anon', 'private.sweep_price_check_events()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.sweep_price_check_events()', 'EXECUTE')
    or has_function_privilege('anon', 'private.sweep_price_check_watches()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.sweep_price_check_watches()', 'EXECUTE')
  then raise exception 'PROBE FAIL 1e: a client role can run a sweep'; end if;

  -- ====================================  2. THE READS DO ADMIT A STRANGER

  if not has_function_privilege('anon',
       'public.estimate_value(double precision, double precision, public.property_type, public.listing_intent, integer, numeric, uuid)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.comparable_listings(double precision, double precision, public.property_type, public.listing_intent, integer, integer, integer, uuid, integer)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.area_asking_summary(text, text, text, public.property_type, public.listing_intent, integer, integer)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.area_utility_facts(text, text, text)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.area_supply_census(text, text, text, public.listing_intent)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.comparable_supply_near(double precision, double precision, public.property_type, public.listing_intent, integer, integer)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.area_suggestions(text, text, integer)', 'EXECUTE')
    or not has_function_privilege('anon',
       'public.confidence_band(integer, numeric, numeric, integer)', 'EXECUTE')
  then raise exception 'PROBE FAIL 2: a signed out visitor cannot run a price check'; end if;

  -- A signed-out reader must also be able to READ the columns these bodies
  -- touch, and must NOT be able to read an address. A non-definer function
  -- whose caller lacks the column grant returns an error, not a refusal, and
  -- a column grant that quietly widened would put an address in reach.
  if not has_column_privilege('anon', 'public.listings', 'rent_amount_minor', 'SELECT')
    or not has_column_privilege('anon', 'public.listings', 'location', 'SELECT')
    or not has_column_privilege('anon', 'public.listings', 'power_grid', 'SELECT')
  then raise exception 'PROBE FAIL 2b: anon cannot read a column the engine needs'; end if;

  if has_column_privilege('anon', 'public.listings', 'address', 'SELECT')
    or has_column_privilege('anon', 'public.listings', 'landmark', 'SELECT')
  then raise exception 'PROBE FAIL 2c: anon can read a listing address'; end if;

  -- =====================================  3. THE EVENTS TABLE HOLDS NO POINT

  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'price_check_events'
     and column_name in ('lat','latitude','lng','longitude','location','geog',
                         'geometry','address','hint','free_text','point');
  if n <> 0 then
    raise exception 'PROBE FAIL 3a: price_check_events has % coordinate or address column(s)', n;
  end if;

  begin
    insert into public.price_check_events (check_id, stage, geohash5)
    values (ev_id, 'start', 'abcdef');
    raise exception 'PROBE FAIL 3b: a six character cell was accepted';
  exception
    when check_violation then null;
  end;

  -- The writer truncates rather than losing the stage.
  perform public.record_price_check_event(
    p_check_id => ev_id, p_stage => 'outcome', p_geohash5 => 'S1D9YWXYZ',
    p_outcome => 'refused', p_refusal_code => 'demo_only');
  select geohash5 into txt from public.price_check_events
   where check_id = ev_id and stage = 'outcome';
  if txt is distinct from 's1d9y' then
    raise exception 'PROBE FAIL 3c: the writer stored % rather than s1d9y', coalesce(txt, 'null');
  end if;

  -- ================================  4. THE ENUM WITH NO PROPERTY IN IT

  select count(*) into n from unnest(enum_range(null::public.price_check_share_scope)) e;
  if n <> 2 then
    raise exception 'PROBE FAIL 4a: price_check_share_scope has % labels, not 2', n;
  end if;
  if exists (
    select 1 from unnest(enum_range(null::public.price_check_share_scope)) e
     where e::text ~* '(propert|address|listing|building|house)'
  ) then
    raise exception 'PROBE FAIL 4b: the share scope enum names a single property';
  end if;

  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'price_check_shares'
     and column_name in ('address','lat','latitude','lng','longitude','location','listing_id');
  if n <> 0 then
    raise exception 'PROBE FAIL 4c: the share table carries % address or point column(s)', n;
  end if;

  -- ==========================================  5. THE SHARE CONSTRAINTS

  -- A neighbourhood whose name contains digits is fine.
  select public.create_price_check_share(
    'area_and_type', 'LA', null, '1004 Estate', 'apartment', 'rent', 3,
    100000000, 120000000, 150000000, 7) into share_id;
  if share_id is null then raise exception 'PROBE FAIL 5a: a legitimate card was refused'; end if;

  -- And so are Phase 2 and Zone 4, which is the half of the rule the first
  -- version of this constraint got wrong and this probe caught.
  if public.create_price_check_share(
       'area_and_type', 'LA', null, 'Lekki Phase 2', 'apartment', 'rent', 3,
       100000000, 120000000, 150000000, 7) is null
  then raise exception 'PROBE FAIL 5a2: Lekki Phase 2 was refused'; end if;

  -- A bare street name with no number is deliberately allowed: it names a
  -- stretch rather than a building, and several Lagos districts are known by
  -- one. The rule is about ADDRESSES.
  if public.create_price_check_share(
       'area_and_type', 'LA', null, 'Awolowo Road', 'apartment', 'rent', 3,
       100000000, 120000000, 150000000, 7) is null
  then raise exception 'PROBE FAIL 5a3: a bare street name was refused'; end if;

  begin
    perform public.create_price_check_share(
      'area_and_type', 'LA', null, '14 Bourdillon Road', 'apartment', 'rent', 3,
      100000000, 120000000, 150000000, 7);
    raise exception 'PROBE FAIL 5b: a street address was accepted as an area';
  exception when check_violation then null; end;

  begin
    perform public.create_price_check_share(
      'area_and_type', 'LA', null, 'No. 14 Bourdillon', 'apartment', 'rent', 3,
      100000000, 120000000, 150000000, 7);
    raise exception 'PROBE FAIL 5b2: an explicit house number was accepted as an area';
  exception when check_violation then null; end;

  begin
    perform public.create_price_check_share(
      'area', 'LA', null, 'Ikoyi', 'apartment', 'rent', null,
      100000000, 120000000, 150000000, 7);
    raise exception 'PROBE FAIL 5c: an area card carried a property type';
  exception when check_violation then null; end;

  begin
    perform public.create_price_check_share(
      'area_and_type', 'LA', null, 'Ikoyi', 'apartment', 'rent', 3,
      150000000, 120000000, 100000000, 7);
    raise exception 'PROBE FAIL 5d: a card was minted with its range inverted';
  exception when check_violation then null; end;

  begin
    perform public.create_price_check_share(
      'area_and_type', 'LA', null, 'Ikoyi', 'apartment', 'rent', 3,
      100000000, 120000000, 150000000, 2);
    raise exception 'PROBE FAIL 5e: a card was minted from two listings';
  exception when check_violation then null; end;

  -- ======================================  6 to 10. THE GATE, WITH FIXTURES

  select id into src_id from public.listings order by created_at asc limit 1;
  if src_id is null then raise exception 'PROBE FAIL 6a: no listing to copy'; end if;

  -- Column list read from the live row rather than typed.
  create temp table pc_fix on commit drop as
    select * from public.listings where id = src_id;
  insert into pc_fix select * from pc_fix;   -- 2
  insert into pc_fix select * from pc_fix;   -- 4
  insert into pc_fix select * from pc_fix;   -- 8

  with ranked as (
    select ctid as tid, row_number() over (order by ctid) as rn from pc_fix
  )
  update pc_fix f set
    id                = extensions.gen_random_uuid(),
    reference         = null,
    is_demo           = false,
    demo_retire_after = null,
    status            = 'PUBLISHED',
    property_type     = 'apartment',
    listing_intent    = 'rent',
    rent_period       = 'year',
    sale_price_minor  = null,
    sale_status       = null,
    -- Six three-bed comparables, one zero-bed and one one-bed. The last two
    -- exist to prove the zero boundary, not to be counted.
    bedrooms          = case r.rn when 7 then 0 when 8 then 1 else 3 end,
    -- N1m to N6m a year, in kobo, so the quartiles are checkable by hand:
    -- q1 = 2.25m, q2 = 3.5m, q3 = 4.75m, dispersion = 0.7143.
    rent_amount_minor = (array[100000000, 200000000, 300000000,
                               400000000, 500000000, 600000000,
                               100000000, 100000000])[r.rn],
    -- Rows 4, 5 and 6 sit about 1,220 m away, so 750 m holds three and the
    -- ladder has to open a rung to reach five.
    latitude          = case when r.rn between 4 and 6 then far_lat else base_lat end,
    longitude         = base_lng,
    -- Only rows 4, 5 and 6 state a size, so the per-square-metre pass sees
    -- three where the per-property pass sees six.
    size_sqm          = case when r.rn between 4 and 6 then 120 else null end,
    published_at      = now() - interval '30 days',
    created_at        = now(),
    updated_at        = now()
  from ranked r where f.ctid = r.tid;

  insert into public.listings select * from pc_fix;

  -- 6. THE GATE ANSWERS, AND THE LADDER OPENED.
  select * into v from public.estimate_value(
    base_lat, base_lng, 'apartment', 'rent', 3, null, null);

  if v.outcome <> 'answered' then
    raise exception 'PROBE FAIL 6b: the gate refused six real comparables (% / %)',
      v.outcome, coalesce(v.refusal_code, 'null');
  end if;
  if v.radius_m <> 1500 then
    raise exception 'PROBE FAIL 6c: answered at % m, expected the ladder to open to 1500', v.radius_m;
  end if;
  if v.comparable_count <> 6 then
    raise exception 'PROBE FAIL 6d: counted % comparables, expected 6', v.comparable_count;
  end if;
  if v.basis <> 'per_property' then
    raise exception 'PROBE FAIL 6e: basis was %, expected per_property', v.basis;
  end if;
  -- THE RANGE IS THE INTERQUARTILE RANGE AND NOT A PERCENTAGE. A fixed plus
  -- or minus fifteen per cent over this set would have printed 297.5m to
  -- 402.5m; the honest answer over six listings this scattered is 225m to
  -- 475m, and the width is earned rather than chosen.
  if v.low_minor <> 225000000 or v.mid_minor <> 350000000 or v.high_minor <> 475000000 then
    raise exception 'PROBE FAIL 6f: range was % / % / %, expected 225000000 / 350000000 / 475000000',
      v.low_minor, v.mid_minor, v.high_minor;
  end if;
  if round(v.dispersion, 4) <> 0.7143 then
    raise exception 'PROBE FAIL 6g: dispersion was %, expected 0.7143', v.dispersion;
  end if;
  if v.confidence <> 'low' then
    raise exception 'PROBE FAIL 6h: six comparables were called %, not low', v.confidence;
  end if;
  if array_length(v.comparable_ids, 1) <> 6 then
    raise exception 'PROBE FAIL 6i: % ids came back with the figure', array_length(v.comparable_ids, 1);
  end if;

  -- 7. THE PER-SQM PASS COUNTS ONLY ROWS THAT STATE A SIZE.
  select count(*) into n
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 3, 1500, 365, null, 60) c
   where c.price_per_sqm_minor is not null;
  if n <> 3 then
    raise exception 'PROBE FAIL 7a: % rows carried a per square metre figure, expected 3', n;
  end if;
  -- Three sized rows is under the minimum of five, so a subject that states a
  -- size still falls through to the per-property basis rather than being
  -- answered on three.
  select * into v from public.estimate_value(
    base_lat, base_lng, 'apartment', 'rent', 3, 120, null);
  if v.outcome <> 'answered' or v.basis <> 'per_property' then
    raise exception 'PROBE FAIL 7b: a sized subject was answered on % / %', v.outcome, coalesce(v.basis, 'null');
  end if;

  -- 8. FIVE CAN NEVER REACH HIGH.
  if public.confidence_band(5, 0.01, 1, 750) <> 'low' then
    raise exception 'PROBE FAIL 8a: five comparables reached %', public.confidence_band(5, 0.01, 1, 750);
  end if;
  if public.confidence_band(15, 0.20, 120, 750) <> 'high' then
    raise exception 'PROBE FAIL 8b: a perfect fifteen did not reach high';
  end if;
  if public.confidence_band(40, 0.01, 1, 3000) <> 'low' then
    raise exception 'PROBE FAIL 8c: the worst input did not decide';
  end if;

  -- 9. A ZERO BEDROOM ROW NEVER ENTERS A ONE BEDROOM SET.
  select count(*) into n
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 1, 1500, 365, null, 60);
  if n <> 1 then
    raise exception 'PROBE FAIL 9a: a one bedroom set held % rows, expected the single one bedroom', n;
  end if;
  select count(*) into n
    from public.comparable_listings(base_lat, base_lng, 'apartment', 'rent', 0, 1500, 365, null, 60);
  if n <> 1 then
    raise exception 'PROBE FAIL 9b: a zero bedroom set held % rows, expected the single zero bedroom', n;
  end if;

  -- 10. FOUR REFUSES, AND SAYS FOUR.
  delete from public.listings
   where id in (select f.id from pc_fix f order by f.rent_amount_minor desc limit 4);
  select * into v from public.estimate_value(
    base_lat, base_lng, 'apartment', 'rent', 3, null, null);
  if v.outcome <> 'refused' or v.refusal_code <> 'too_few_comparables' then
    raise exception 'PROBE FAIL 10a: four comparables gave % / %', v.outcome, coalesce(v.refusal_code, 'null');
  end if;
  if v.comparable_count <> 2 then
    -- Four were removed from eight, and two of the four that remain are the
    -- zero bed and the one bed, which are not in a three bed set.
    raise exception 'PROBE FAIL 10b: the refusal counted %, expected 2', v.comparable_count;
  end if;
  if v.low_minor is not null or v.mid_minor is not null or v.high_minor is not null then
    raise exception 'PROBE FAIL 10c: a refusal carried a figure';
  end if;

  -- ==============================  11 and 12. THE STATE THE ESTATE IS IN

  delete from public.listings where id in (select f.id from pc_fix f);

  select l.latitude, l.longitude into demo_lat, demo_lng
    from public.listings l
   where l.is_demo and l.location is not null and l.listing_intent = 'rent'
   order by l.created_at asc limit 1;

  if demo_lat is not null then
    select * into v from public.estimate_value(
      demo_lat, demo_lng, 'apartment', 'rent', 3, null, null);
    if v.outcome <> 'refused' then
      raise exception 'PROBE FAIL 11a: the gate answered from example listings';
    end if;
    if v.refusal_code <> 'no_comparables' then
      raise exception 'PROBE FAIL 11b: refusal code was % at a demo point', v.refusal_code;
    end if;

    select * into v from public.comparable_supply_near(
      demo_lat, demo_lng, 'apartment', 'rent', 3, 3000);
    if v.real_count <> 0 then
      raise exception 'PROBE FAIL 11c: % real listings appeared, so demo_only would be a lie', v.real_count;
    end if;
    if v.demo_count = 0 then
      raise exception 'PROBE FAIL 11d: no example listings near an example listing';
    end if;
    -- Real zero and example non-zero is exactly the pair that lets the
    -- surface print `demo_only` rather than `no_comparables`. Without this
    -- function the two are indistinguishable and the copy would be a guess.
  end if;

  select count(*) into n from public.area_asking_summary('LA', null, null, null, 'rent', null, 540);
  if n <> 0 then
    raise exception 'PROBE FAIL 12a: the area report produced % row(s) from an estate of examples', n;
  end if;
  select * into v from public.area_supply_census('LA', null, null, 'rent');
  if v.real_count <> 0 or v.demo_count = 0 then
    raise exception 'PROBE FAIL 12b: the census says % real and % example', v.real_count, v.demo_count;
  end if;
  select count(*) into n from public.area_suggestions('LA', null, 8);
  if n <> 0 then
    raise exception 'PROBE FAIL 12c: % area(s) suggested from example listings alone', n;
  end if;
  select v.listing_count into n from public.area_utility_facts('LA', null, null) v;
  if n <> 0 then
    raise exception 'PROBE FAIL 12d: the facts panel counted % example listings as real', n;
  end if;

  -- =========================================================  13. THE CRON

  select count(*) into n from cron.job
   where jobname in ('vallo_sweep_price_check_events', 'vallo_sweep_price_check_watches');
  if n <> 2 then
    raise exception 'PROBE FAIL 13: % of the 2 sweeps are scheduled', n;
  end if;

  -- =====================================================  ROLL IT ALL BACK

  select count(*) into ok_count from public.price_check_events where check_id = ev_id;

  raise exception 'PROBE ALL PASS: rule 21 holds on all three definer functions and anon keeps every read; price_check_events has no coordinate column, refuses a six character cell and truncated S1D9YWXYZ to s1d9y; the share scope enum has two labels and neither is a property; 1004 Estate, Lekki Phase 2 and a bare street name were accepted while 14 Bourdillon Road, No. 14 Bourdillon, a typed area card, an inverted range and a two listing card were all refused; the gate ANSWERED on six real comparables by opening the ladder from 750m to 1500m, returned the actual interquartile range 225m/350m/475m at dispersion 0.7143 and called it low; three of six stated a size so a sized subject still fell through to per_property; five can never reach high and the worst input decides; a zero bed row stayed out of a one bed set; four rows refused with too_few_comparables and no figure; with the fixtures gone the live estate refuses with no_comparables while comparable_supply_near reports % example listings and 0 real, which is what makes demo_only true rather than guessed; the Lagos area report, the area typeahead and the facts panel all return nothing from 64 example listings; both sweeps are scheduled. % event row(s) written and rolled back. Rolled back on purpose.',
    (select count(*) from public.listings where is_demo), ok_count;
end
$probe$;
