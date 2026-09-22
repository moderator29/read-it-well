-- PRICE CHECK, STAGE ONE: the read engine behind a feature that reports what
-- places near here are ASKING, and refuses when it cannot.
--
-- The design is docs/research/VALUATION_ENGINE_RESEARCH.md part 3 and the
-- ruling is docs/HANDOFF_09_THE_DIRECT_PLATFORM.md section 5. This migration
-- adds one index and six read-only functions. It writes nothing, it drops
-- nothing, and it changes no existing object.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS IS NOT, AND THE WORD THAT NEVER APPEARS IN THE PRODUCT.
--
-- Under the Estate Surveyors and Valuers Act the offence is using any name,
-- title, addition or description IMPLYING authorisation to practise. The
-- offence is in the implication, not in the arithmetic. So the product says
-- ASKING, always, and the product-side lint gate
-- `apps/web/scripts/check-valuation-words.mjs` fails the build if the
-- regulated vocabulary reaches product code. Nothing in this database is a
-- sold price, and `price_basis` says so on every row these functions return.
--
-- ---------------------------------------------------------------------------
-- NONE OF THESE FUNCTIONS IS SECURITY DEFINER, WHICH IS A DECISION.
--
-- Every one of them reads `public.listings` as the caller, so RLS decides
-- visibility exactly as it does for a direct select, and the column-list grant
-- from `20260809100105_a_published_listing_is_public_its_moderation_file_is_not.sql`
-- decides which columns a signed-out reader may see. Measured against the live
-- estate on 22 September 2026: `anon` holds SELECT on every column these
-- bodies touch and holds NO grant on `address` or `landmark`. So the share
-- rule (5.4: no artefact ever carries an address) is enforced at the grant
-- level for a signed-out caller before any code runs. Rule 21 does not apply
-- because nothing here is definer; the grants at the foot are the whole
-- security surface and they are stated rather than inherited.
--
-- ---------------------------------------------------------------------------
-- TWO FUNCTIONS THE RESEARCH DOES NOT SPECIFY, AND WHY THEY HAD TO EXIST.
--
-- The refusal table in 3.6 has a `demo_only` state whose copy is "everything
-- we hold near here is an example listing, not a real one". `is_demo = false`
-- is inside the comparables predicate, so a caller reading only
-- `comparable_listings` CANNOT TELL `demo_only` FROM `no_comparables`: both
-- come back as zero rows. Printing the wrong one of those two is printing a
-- guess about our own data, which is rule 15 with the numbers left out. So
-- `comparable_supply_near` and `area_supply_census` count the real and the
-- example rows separately and the surface says which wall it actually hit.
--
-- THIS IS THE STATE THE ENTIRE PRODUCT IS IN TODAY. 64 of 64 listings on
-- `uccixoonmbhrnyczyigt` carry `is_demo = true`, counted 22 September 2026, so
-- every per-property check refuses with `demo_only` and every area report
-- refuses with it too. That is the gate working, not a bug to route around.

-- ---------------------------------------------------------------------------
-- 1. The one new index.
-- ---------------------------------------------------------------------------

/*
 * `listings_intent_type_published_idx` already leads on (listing_intent,
 * property_type, state_code, city) but carries no recency and no demo
 * predicate, so a comparables query on it still filters a whole city's back
 * catalogue in the heap. This one is partial on exactly the set a comparable
 * may come from, which is small by construction and stays small. The GiST
 * index `listings_location_gist` is unchanged and still does the radius work.
 */
create index if not exists listings_comparables_idx
  on public.listings (property_type, listing_intent, bedrooms, published_at desc)
  where status = 'PUBLISHED'
    and is_demo = false
    and location is not null;

-- ---------------------------------------------------------------------------
-- 2. The comparable set.
-- ---------------------------------------------------------------------------

create or replace function public.comparable_listings(
  p_lat            double precision,
  p_lng            double precision,
  p_property_type  public.property_type,
  p_intent         public.listing_intent,
  p_bedrooms       integer,
  p_radius_m       integer default 750,
  p_max_age_days   integer default 365,
  p_exclude_id     uuid default null,
  p_limit          integer default 60
)
returns table (
  id              uuid,
  title           text,
  area            text,
  city            text,
  state_code      text,
  property_type   public.property_type,
  listing_intent  public.listing_intent,
  bedrooms        integer,
  bathrooms       integer,
  toilets         smallint,
  size_sqm        numeric,
  furnished       public.furnishing,
  condition       public.build_condition,
  published_at    timestamptz,
  age_days        integer,
  distance_m      double precision,
  -- One money column, resolved exactly as lib/listings/pricing.ts resolves it.
  price_minor     bigint,
  price_basis     text,
  -- Null whenever size is unstated. NEVER zero, never inferred.
  price_per_sqm_minor numeric
)
language sql
stable
set search_path = ''
as $$
  with subject as (
    select extensions.st_setsrid(
             extensions.st_makepoint(p_lng, p_lat), 4326
           )::extensions.geography as origin
  )
  select
    l.id, l.title, l.area, l.city, l.state_code,
    l.property_type, l.listing_intent, l.bedrooms, l.bathrooms, l.toilets,
    l.size_sqm, l.furnished, l.condition, l.published_at,
    (extract(epoch from (now() - l.published_at)) / 86400)::integer as age_days,
    extensions.st_distance(l.location, s.origin) as distance_m,
    case
      when l.listing_intent = 'sale' then l.sale_price_minor
      -- For rent the ADVERTISED rent is the comparable, not the move-in
      -- total: the move-in total folds in agency and legal fees that vary by
      -- agent rather than by property, so comparing totals compares agents.
      else l.rent_amount_minor
    end as price_minor,
    case
      when l.listing_intent = 'sale' then 'asking_sale'
      else 'advertised_rent_' || coalesce(l.rent_period::text, 'year')
    end as price_basis,
    case
      when l.size_sqm is null or l.size_sqm <= 0 then null
      else (
        case when l.listing_intent = 'sale'
             then l.sale_price_minor else l.rent_amount_minor end
      )::numeric / l.size_sqm
    end as price_per_sqm_minor
  from public.listings l
  cross join subject s
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.location is not null
    and (p_exclude_id is null or l.id <> p_exclude_id)
    and l.property_type = p_property_type
    and l.listing_intent = p_intent
    and (p_bedrooms is null or l.bedrooms between greatest(p_bedrooms - 1, 0)
                                              and p_bedrooms + 1)
    -- A zero-bedroom row never enters a set for a property that has bedrooms,
    -- and vice versa. Zero means "not a bedroomed property", not "small".
    and (p_bedrooms is null or (p_bedrooms = 0) = (l.bedrooms = 0))
    and l.published_at is not null
    and l.published_at >= now() - make_interval(days => p_max_age_days)
    and (l.listing_intent <> 'sale' or l.sale_status is distinct from 'sold')
    and case
          when l.listing_intent = 'sale' then l.sale_price_minor
          else l.rent_amount_minor
        end > 0
    -- Rent comparables must share a cycle. A monthly rent and an annual rent
    -- are not the same number and annualising a monthly rent assumes twelve
    -- months of occupancy nobody promised.
    and (p_intent <> 'rent' or l.rent_period = 'year')
    and extensions.st_dwithin(l.location, s.origin, p_radius_m)
  order by extensions.st_distance(l.location, s.origin)
  limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;

comment on function public.comparable_listings(double precision, double precision, public.property_type, public.listing_intent, integer, integer, integer, uuid, integer) is
  'Published, non-example listings near a point that share a property type, an
   intent and a bedroom band, with distance in metres and the one money column
   resolved the same way lib/listings/pricing.ts resolves it. Returns ASKING
   and ADVERTISED figures and says so in price_basis: nothing in this database
   is a sold price. NOT security definer, so RLS decides visibility exactly as
   it does for a direct select, and the caller never sees address or landmark
   because anon holds no grant on either.';

-- ---------------------------------------------------------------------------
-- 3. The confidence band, derived and not decorated.
-- ---------------------------------------------------------------------------

create or replace function public.confidence_band(
  p_count       integer,
  p_dispersion  numeric,
  p_median_age  numeric,
  p_radius_m    integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Four inputs, each of which independently degrades an estimate, and the
  -- worst of the four decides. A band is a claim about how wrong this figure
  -- could be, so it is never allowed to be better than its weakest input.
  select case
    when p_count >= 15
     and p_dispersion <= 0.20
     and p_median_age <= 120
     and p_radius_m <= 750  then 'high'
    when p_count >= 8
     and p_dispersion <= 0.35
     and p_median_age <= 270
     and p_radius_m <= 1500 then 'medium'
    else 'low'
  end;
$$;

comment on function public.confidence_band(integer, numeric, numeric, integer) is
  'The confidence label, derived from the four things that actually degrade an
   estimate: how many comparables there were, how far apart their prices were,
   how old they were, and how far the radius had to be opened to find them. The
   worst input decides. There is no input to this function that a product
   decision can set, which is the point: a confidence label that somebody can
   choose is decoration.';

-- ---------------------------------------------------------------------------
-- 4. The gate, the statistics and the range, in one call.
-- ---------------------------------------------------------------------------

create or replace function public.estimate_value(
  p_lat            double precision,
  p_lng            double precision,
  p_property_type  public.property_type,
  p_intent         public.listing_intent,
  p_bedrooms       integer,
  p_size_sqm       numeric default null,
  p_exclude_id     uuid default null
)
returns table (
  outcome           text,      -- 'answered', or 'refused' with a code below
  refusal_code      text,
  radius_m          integer,
  comparable_count  integer,
  basis             text,      -- 'per_sqm' or 'per_property'
  low_minor         bigint,    -- 25th percentile
  mid_minor         bigint,    -- median
  high_minor        bigint,    -- 75th percentile
  dispersion        numeric,   -- (q3 - q1) / q2, the spread the range came FROM
  confidence        text,
  median_age_days   integer,
  median_distance_m integer,
  comparable_ids    uuid[]
)
language plpgsql
stable
set search_path = ''
as $$
declare
  minimum constant integer := 5;
  r       integer;
  b       text;
  scale   numeric;
  cmp     record;
  widest  integer := 0;
begin
  foreach r in array array[750, 1500, 3000] loop
    -- 'per_sqm' first when the subject stated a size, then 'per_property'.
    -- The per_sqm pass counts only comparables that STATE a size, so a set of
    -- six of which two state one is a set of two for that pass.
    foreach b in array (case when p_size_sqm > 0
                             then array['per_sqm', 'per_property']
                             else array['per_property'] end) loop
      scale := case when b = 'per_sqm' then p_size_sqm else 1 end;

      select
        count(*)::integer                                            as n,
        percentile_cont(0.25) within group (order by m.metric)        as q1,
        percentile_cont(0.50) within group (order by m.metric)        as q2,
        percentile_cont(0.75) within group (order by m.metric)        as q3,
        percentile_cont(0.50) within group (order by m.age_days)      as age50,
        percentile_cont(0.50) within group (order by m.distance_m)    as dist50,
        array_agg(m.id order by m.distance_m)                         as ids
      into cmp
      from (
        select c.id, c.age_days, c.distance_m,
               case when b = 'per_sqm'
                    then c.price_per_sqm_minor
                    else c.price_minor::numeric end as metric
        from public.comparable_listings(
               p_lat, p_lng, p_property_type, p_intent, p_bedrooms,
               r, 365, p_exclude_id, 60) c
      ) m
      where m.metric is not null;

      -- The widest count seen at any rung, so the refusal below can tell
      -- "nothing at all" from "some, but fewer than five". Taking it from the
      -- LAST iteration alone would under-report whenever the per_sqm pass ran
      -- second and found fewer sized rows than the per_property pass found
      -- rows, which is the common case.
      widest := greatest(widest, coalesce(cmp.n, 0));

      if cmp.n >= minimum then
        return query select
          'answered'::text, null::text, r, cmp.n, b,
          round(cmp.q1 * scale)::bigint,
          round(cmp.q2 * scale)::bigint,
          round(cmp.q3 * scale)::bigint,
          round((cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), 4),
          public.confidence_band(cmp.n,
            (cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), cmp.age50, r),
          cmp.age50::integer, cmp.dist50::integer, cmp.ids;
        return;
      end if;
    end loop;
  end loop;

  -- Nothing satisfied the gate at any rung. Say which wall we hit. The caller
  -- turns `no_comparables` into `demo_only` when `comparable_supply_near`
  -- says the only rows out there are examples.
  return query select
    'refused'::text,
    case when widest = 0 then 'no_comparables'
         else 'too_few_comparables' end,
    3000, widest, null::text,
    null::bigint, null::bigint, null::bigint, null::numeric,
    null::text, null::integer, null::integer, '{}'::uuid[];
end;
$$;

comment on function public.estimate_value(double precision, double precision, public.property_type, public.listing_intent, integer, numeric, uuid) is
  'The gate of docs/research/VALUATION_ENGINE_RESEARCH.md 3.3.3: five
   comparables minimum, a 750 / 1500 / 3000 metre ladder and no further, exact
   type and intent, a bedroom band of plus or minus one that never crosses
   zero, 365 day recency, and is_demo = false always. The range is the
   INTERQUARTILE RANGE of the actual comparables scaled to the subject, never
   a fixed percentage. The wide_dispersion and stale refusals are checked by
   the caller against the returned dispersion and median_age_days, so the
   comparables are still available to draw when the figure is withheld. Every
   figure it returns is built from ASKING and ADVERTISED prices.';

-- ---------------------------------------------------------------------------
-- 5. Who is actually out there, real and example counted apart.
-- ---------------------------------------------------------------------------

create or replace function public.comparable_supply_near(
  p_lat            double precision,
  p_lng            double precision,
  p_property_type  public.property_type,
  p_intent         public.listing_intent,
  p_bedrooms       integer,
  p_radius_m       integer default 3000
)
returns table (
  real_count       integer,
  demo_count       integer,
  stale_real_count integer
)
language sql
stable
set search_path = ''
as $$
  with subject as (
    select extensions.st_setsrid(
             extensions.st_makepoint(p_lng, p_lat), 4326
           )::extensions.geography as origin
  )
  select
    count(*) filter (
      where not l.is_demo
        and l.published_at >= now() - make_interval(days => 365))::integer,
    count(*) filter (where l.is_demo)::integer,
    -- Published between 365 and 730 days ago: old enough to be excluded from
    -- the comparable set and recent enough to be worth telling the reader
    -- about, because "the nearest listings are over a year old" is a
    -- different sentence from "there is nothing here".
    count(*) filter (
      where not l.is_demo
        and l.published_at < now() - make_interval(days => 365)
        and l.published_at >= now() - make_interval(days => 730))::integer
  from public.listings l
  cross join subject s
  where l.status = 'PUBLISHED'
    and l.location is not null
    and l.property_type = p_property_type
    and l.listing_intent = p_intent
    and (p_bedrooms is null or l.bedrooms between greatest(p_bedrooms - 1, 0)
                                              and p_bedrooms + 1)
    and (p_bedrooms is null or (p_bedrooms = 0) = (l.bedrooms = 0))
    and l.published_at is not null
    and extensions.st_dwithin(l.location, s.origin, p_radius_m);
$$;

comment on function public.comparable_supply_near(double precision, double precision, public.property_type, public.listing_intent, integer, integer) is
  'Three counts and never a price: how many REAL listings, how many EXAMPLE
   listings and how many real but over a year old sit near a point under the
   comparables predicate. It exists so the refusal states demo_only, stale and
   no_comparables can be told apart, because is_demo = false inside
   comparable_listings makes all three look identical from outside. Printing
   the wrong refusal is printing a guess about our own data.';

-- ---------------------------------------------------------------------------
-- 6. The area report, which is what stage one actually is.
-- ---------------------------------------------------------------------------

create or replace function public.area_asking_summary(
  p_state_code     text,
  p_city           text default null,
  p_area           text default null,
  p_property_type  public.property_type default null,
  p_intent         public.listing_intent default 'rent',
  p_bedrooms       integer default null,
  p_max_age_days   integer default 540
)
returns table (
  scope            text,
  property_type    public.property_type,
  bedrooms         integer,
  listing_count    integer,
  p25_minor        bigint,
  median_minor     bigint,
  p75_minor        bigint,
  sized_count      integer,
  median_per_sqm_minor numeric,
  oldest_at        timestamptz,
  newest_at        timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    case when p_area is not null then 'area'
         when p_city is not null then 'city'
         else 'state' end,
    l.property_type,
    l.bedrooms,
    count(*)::integer,
    percentile_cont(0.25) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    percentile_cont(0.50) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    percentile_cont(0.75) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    count(*) filter (where l.size_sqm is not null and l.size_sqm > 0)::integer,
    percentile_cont(0.50) within group (
      order by (case when l.listing_intent = 'sale'
                     then l.sale_price_minor else l.rent_amount_minor end)::numeric
               / nullif(l.size_sqm, 0)),
    min(l.published_at),
    max(l.published_at)
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.state_code = p_state_code
    and (p_city is null or lower(btrim(l.city)) = lower(btrim(p_city)))
    and (p_area is null or lower(btrim(l.area)) = lower(btrim(p_area)))
    and (p_property_type is null or l.property_type = p_property_type)
    and l.listing_intent = p_intent
    and (p_bedrooms is null or l.bedrooms = p_bedrooms)
    and (p_intent <> 'rent' or l.rent_period = 'year')
    and l.published_at >= now() - make_interval(days => p_max_age_days)
    and case when l.listing_intent = 'sale'
             then l.sale_price_minor else l.rent_amount_minor end > 0
  group by l.property_type, l.bedrooms
  having count(*) >= 3
  order by l.property_type, l.bedrooms;
$$;

comment on function public.area_asking_summary(text, text, text, public.property_type, public.listing_intent, integer, integer) is
  'What properties of a type and a bedroom count in one area are currently
   ASKING. Three rather than five because an area report makes a weaker claim
   than a per-property figure: it says "three two-bed flats in Yaba are asking
   between X and Y", which is a true statement about three listings and not an
   estimate of anything. listing_count, sized_count, oldest_at and newest_at
   ride along so the surface can print "based on 3 listings, published between
   March and August 2026" beside every figure, and the per square metre
   coverage beside every per square metre figure. That sentence is the whole
   product in stage one.';

-- ---------------------------------------------------------------------------
-- 7. The census behind the area report's own refusal.
-- ---------------------------------------------------------------------------

create or replace function public.area_supply_census(
  p_state_code     text,
  p_city           text default null,
  p_area           text default null,
  p_intent         public.listing_intent default 'rent'
)
returns table (
  real_count    integer,
  demo_count    integer,
  located_count integer,
  sized_count   integer
)
language sql
stable
set search_path = ''
as $$
  select
    count(*) filter (where not l.is_demo)::integer,
    count(*) filter (where l.is_demo)::integer,
    count(*) filter (where not l.is_demo and l.location is not null)::integer,
    count(*) filter (where not l.is_demo and l.size_sqm is not null and l.size_sqm > 0)::integer
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.state_code = p_state_code
    and (p_city is null or lower(btrim(l.city)) = lower(btrim(p_city)))
    and (p_area is null or lower(btrim(l.area)) = lower(btrim(p_area)))
    and l.listing_intent = p_intent;
$$;

comment on function public.area_supply_census(text, text, text, public.listing_intent) is
  'Four counts and never a price, so an area report can say WHY it has nothing
   to report: nothing published here at all, or nothing but example listings.
   The area report itself excludes examples, which makes those two cases look
   identical from outside it.';

-- ---------------------------------------------------------------------------
-- 8. The area typeahead, which is the only neighbourhood vocabulary we hold.
-- ---------------------------------------------------------------------------

/*
 * `listings.area` is free text behind a two character minimum
 * (`20260728152229_listings_core.sql:40`), so this list is only as good as the
 * strings agents have typed. It is still the best vocabulary available and it
 * is what stops the second agent to list in an estate inventing a second
 * spelling of it. The staged fix is a `public.neighbourhoods` reference table,
 * research 5.4, and it is not stage one.
 *
 * KEYED ON STATE AND NOT ON LGA, AND THAT IS A DATA FACT RATHER THAN A CHOICE.
 * `public.listings` carries `state_code`, `city` and `area` and has no
 * `lga_code` column at all, so there is nothing to join a local government to.
 * The ladder still asks for the LGA, because the LGA is what a person knows
 * and it is what `price_check_events` records; it simply cannot narrow this
 * list until a listing carries one.
 *
 * Example listings are excluded. An area we only hold examples in is an area
 * we cannot report on, and suggesting it would send a reader towards a
 * refusal wearing a suggestion's clothes.
 */
create or replace function public.area_suggestions(
  p_state_code text,
  p_query      text default null,
  p_limit      integer default 8
)
returns table (
  area          text,
  city          text,
  listing_count integer
)
language sql
stable
set search_path = ''
as $$
  select
    btrim(l.area) as area,
    (array_agg(btrim(l.city) order by l.published_at desc nulls last))[1] as city,
    count(*)::integer as listing_count
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.state_code = p_state_code
    and l.area is not null
    and char_length(btrim(l.area)) >= 2
    and (
      p_query is null
      or char_length(btrim(p_query)) = 0
      or lower(btrim(l.area)) like lower(btrim(p_query)) || '%'
      or lower(btrim(l.area)) like '%' || lower(btrim(p_query)) || '%'
    )
  group by btrim(l.area)
  order by count(*) desc, btrim(l.area) asc
  limit least(greatest(coalesce(p_limit, 8), 1), 25);
$$;

comment on function public.area_suggestions(text, text, integer) is
  'Distinct area strings we already hold real published listings in, for the
   third rung of the address ladder. Free text is still accepted by the field:
   refusing an area we have not seen would refuse every area we have not seen.';

-- ---------------------------------------------------------------------------
-- 9. The neighbourhood power and water facts, which need no prices at all.
-- ---------------------------------------------------------------------------

/*
 * The most underrated asset in this schema. `power_grid`, `power_backup`,
 * `water_supply`, `prepaid_meter` and `has_estate_access` are collected
 * structurally on every listing
 * (`20260804160509_light_water_and_getting_through_the_gate.sql`), and nobody
 * else in this market captures them. This function needs no price data, which
 * is exactly why stage one leads with it: on the day Price Check ships every
 * per-property call refuses, and this panel is real product value that does
 * not depend on the gate opening.
 *
 * IT EXCLUDES EXAMPLE LISTINGS FOR THE SAME REASON THE PRICES DO. An example
 * listing's power supply is fiction, and a fact panel built from fiction is
 * the invented number of rule 15 with a picture beside it. `listing_count`
 * rides along so the surface prints "from the 11 real listings we hold here"
 * beside every count, and the counts are counts rather than percentages: a
 * percentage of eleven listings is a figure pretending to be a survey.
 */
create or replace function public.area_utility_facts(
  p_state_code text,
  p_city       text default null,
  p_area       text default null
)
returns table (
  listing_count      integer,
  power_grid         public.power_grid,
  power_grid_count   integer,
  power_backup       public.power_backup,
  power_backup_count integer,
  water_supply       public.water_supply,
  water_supply_count integer,
  prepaid_meter_count      integer,
  prepaid_meter_known      integer,
  estate_access_count      integer,
  estate_access_known      integer
)
language sql
stable
set search_path = ''
as $$
  with rows_here as (
    select l.power_grid, l.power_backup, l.water_supply,
           l.prepaid_meter, l.has_estate_access
    from public.listings l
    where l.status = 'PUBLISHED'
      and l.is_demo = false
      and l.state_code = p_state_code
      and (p_city is null or lower(btrim(l.city)) = lower(btrim(p_city)))
      and (p_area is null or lower(btrim(l.area)) = lower(btrim(p_area)))
  ),
  totals as (
    select
      count(*)::integer as listing_count,
      count(*) filter (where prepaid_meter is true)::integer as prepaid_yes,
      count(*) filter (where prepaid_meter is not null)::integer as prepaid_known,
      count(*) filter (where has_estate_access is true)::integer as estate_yes,
      count(*) filter (where has_estate_access is not null)::integer as estate_known
    from rows_here
  ),
  -- The modal answer on each of the three enums, one row each, so the surface
  -- can say "most listings here are on BAND_A" without being handed a
  -- distribution it would have to reduce itself.
  grid as (
    select power_grid, count(*)::integer as n from rows_here
    where power_grid is not null group by power_grid order by n desc limit 1
  ),
  backup as (
    select power_backup, count(*)::integer as n from rows_here
    where power_backup is not null group by power_backup order by n desc limit 1
  ),
  water as (
    select water_supply, count(*)::integer as n from rows_here
    where water_supply is not null group by water_supply order by n desc limit 1
  )
  select
    t.listing_count,
    g.power_grid, g.n,
    b.power_backup, b.n,
    w.water_supply, w.n,
    t.prepaid_yes, t.prepaid_known,
    t.estate_yes, t.estate_known
  from totals t
  left join grid g on true
  left join backup b on true
  left join water w on true;
$$;

comment on function public.area_utility_facts(text, text, text) is
  'The neighbourhood power and water facts for one area, from real published
   listings only. The modal answer on each enum with the count that produced
   it, and a known-denominator beside each boolean, so nothing on the surface
   can be printed without saying how many listings it came from. No prices are
   read here at all, which is why this panel carries stage one on a day when
   every price answer refuses.';

-- ---------------------------------------------------------------------------
-- 10. The grants, stated rather than inherited.
-- ---------------------------------------------------------------------------

/*
 * Every function above is `stable` and non-definer, so a caller sees exactly
 * what RLS and the column-list grant let them see. `anon` gets EXECUTE because
 * the standalone Price Check route is the acquisition surface and is the only
 * one designed to be arrived at cold; a signed-out visitor who could not run
 * it would get an empty answer that looks exactly like an honest refusal,
 * which is the worst outcome this feature can produce.
 */
grant execute on function public.comparable_listings(double precision, double precision, public.property_type, public.listing_intent, integer, integer, integer, uuid, integer) to anon, authenticated, service_role;
grant execute on function public.confidence_band(integer, numeric, numeric, integer) to anon, authenticated, service_role;
grant execute on function public.estimate_value(double precision, double precision, public.property_type, public.listing_intent, integer, numeric, uuid) to anon, authenticated, service_role;
grant execute on function public.comparable_supply_near(double precision, double precision, public.property_type, public.listing_intent, integer, integer) to anon, authenticated, service_role;
grant execute on function public.area_asking_summary(text, text, text, public.property_type, public.listing_intent, integer, integer) to anon, authenticated, service_role;
grant execute on function public.area_supply_census(text, text, text, public.listing_intent) to anon, authenticated, service_role;
grant execute on function public.area_suggestions(text, text, integer) to anon, authenticated, service_role;
grant execute on function public.area_utility_facts(text, text, text) to anon, authenticated, service_role;
