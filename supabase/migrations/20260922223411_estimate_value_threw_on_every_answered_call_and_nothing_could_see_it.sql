-- `estimate_value` threw on every ANSWERED call, and on this estate nothing
-- could ever have found that except running it with real rows in front of it.
--
-- ===========================================================================
-- THE FAULT.
--
--     round((cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), 4)
--
-- `percentile_cont` has no numeric form. A numeric ordering expression is
-- cast to `double precision` and the result comes back `double precision`, so
-- q1, q2 and q3 were doubles, and `round(double precision, integer)` DOES NOT
-- EXIST in PostgreSQL. Every answered call raised SQLSTATE 42883.
--
-- ===========================================================================
-- WHY NOTHING WOULD HAVE CAUGHT IT, WHICH IS THE POINT OF THIS FILE.
--
-- The line sits inside the `if cmp.n >= minimum` branch. 64 of the 64
-- listings on this project are examples and `is_demo = false` is in the
-- comparables predicate, so THE GATE REFUSES EVERY CALL TODAY and that branch
-- is never entered. The function's refusal path works perfectly. So:
--
--   - the migration applied clean,
--   - every call from the product returned a tidy, correct refusal,
--   - the refusal copy was right, the funnel event was right,
--   - a screenshot of the screen would have been right,
--
-- and the first time a real listing arrived in an area with four neighbours,
-- the fifth listing would have turned a working feature into a 500. The
-- feature would have looked finished for however many weeks it took supply to
-- reach five in one place, and the bug would have shipped under a green
-- typecheck, a green lint, a green test run and a green probe.
--
-- `scripts/probes/price_check_stage_one.sql` is what found it, and only
-- because it puts SIX REAL COMPARABLES in front of the gate and takes them
-- away again rather than asserting that an empty estate returns nothing.
-- "Returns nothing" is also what a broken gate returns.
--
-- The same shape is recorded in `apps/web/scripts/check-css-tokens.mjs`: the
-- only signal a fault of this family produces is silence, and the more
-- carefully the thing is written the longer the silence lasts.
--
-- ===========================================================================
-- THE FIX, AND IT IS MORE THAN THE ONE CAST.
--
-- Every quantile is cast to `numeric` at the point it is computed, rather
-- than the one arithmetic expression being patched. Three reasons:
--
--   1. `round(numeric, integer)` exists, which is the immediate bug.
--   2. THE FIGURES ARE MONEY. `low_minor`, `mid_minor` and `high_minor` are
--      integer kobo, and taking them through binary floating point to get
--      there is how a kobo goes missing. `round(numeric)` is exact.
--   3. `confidence_band` takes `numeric` for its dispersion and median age.
--      `double precision` to `numeric` is an ASSIGNMENT cast in PostgreSQL
--      and not an implicit one, so passing the doubles would have been the
--      next error behind this one, in the same unreachable branch.
--
-- Nothing else about the function changes: same signature, same gate, same
-- ladder, same interquartile range, same refusal codes.

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
  outcome           text,
  refusal_code      text,
  radius_m          integer,
  comparable_count  integer,
  basis             text,
  low_minor         bigint,
  mid_minor         bigint,
  high_minor        bigint,
  dispersion        numeric,
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
  spread  numeric;
begin
  foreach r in array array[750, 1500, 3000] loop
    -- 'per_sqm' first when the subject stated a size, then 'per_property'.
    -- The per_sqm pass counts only comparables that STATE a size, so a set of
    -- six of which two state one is a set of two for that pass.
    foreach b in array (case when p_size_sqm > 0
                             then array['per_sqm', 'per_property']
                             else array['per_property'] end) loop
      scale := case when b = 'per_sqm' then p_size_sqm else 1 end;

      -- EVERY QUANTILE IS numeric FROM HERE ON. percentile_cont returns
      -- double precision whatever it is ordered by, and these four values go
      -- on to become integer kobo and to be handed to confidence_band.
      select
        count(*)::integer                                                     as n,
        (percentile_cont(0.25) within group (order by m.metric))::numeric     as q1,
        (percentile_cont(0.50) within group (order by m.metric))::numeric     as q2,
        (percentile_cont(0.75) within group (order by m.metric))::numeric     as q3,
        (percentile_cont(0.50) within group (order by m.age_days))::numeric   as age50,
        (percentile_cont(0.50) within group (order by m.distance_m))::numeric as dist50,
        array_agg(m.id order by m.distance_m)                                 as ids
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
      -- "nothing at all" from "some, but fewer than five".
      widest := greatest(widest, coalesce(cmp.n, 0));

      if cmp.n >= minimum then
        -- The spread the range came FROM, computed once and passed to both
        -- the caller and the confidence band, so the label and the number it
        -- is a label for cannot be computed two different ways.
        spread := round((cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), 4);

        return query select
          'answered'::text, null::text, r, cmp.n, b,
          round(cmp.q1 * scale)::bigint,
          round(cmp.q2 * scale)::bigint,
          round(cmp.q3 * scale)::bigint,
          spread,
          public.confidence_band(cmp.n, spread, cmp.age50, r),
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
   a fixed percentage, and it is computed in numeric all the way to integer
   kobo. The wide_dispersion and stale refusals are checked by the caller
   against the returned dispersion and median_age_days, so the comparables are
   still available to draw when the figure is withheld. Every figure it
   returns is built from ASKING and ADVERTISED prices.';

-- Restated rather than inherited, because this is a `create or replace` and
-- the grant on the previous definition is not evidence about this one. NOT
-- security definer, so RLS still decides what a caller may see.
grant execute on function public.estimate_value(double precision, double precision, public.property_type, public.listing_intent, integer, numeric, uuid) to anon, authenticated, service_role;
