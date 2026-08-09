-- The viewport RPC has to hand back `is_demo` or the map cannot draw the
-- difference.
--
-- `listings_in_bounds` returns twelve narrow columns because a pin is not a
-- card. That was the right shape and it is now one column short: the map is a
-- discovery surface like any other, and a pin for a property that does not
-- exist must be distinguishable from a pin for one that does. Without this the
-- map would be the one place in the product where an example listing is
-- indistinguishable from real inventory, which is precisely the failure the
-- rest of this work exists to prevent.
--
-- The return type changes, so this is a drop and create rather than a replace.
-- Everything else about the function is preserved exactly: still `LANGUAGE sql
-- STABLE`, still `search_path` pinned empty, still NOT security definer so RLS
-- decides, still matched with `&&` against `st_makeenvelope` so it lands on
-- `listings_location_gist`, and still clamping its own row count.

drop function if exists public.listings_in_bounds(
  double precision, double precision, double precision, double precision,
  public.listing_intent, public.property_type, bigint, bigint, integer, integer
);

create function public.listings_in_bounds(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_intent public.listing_intent default null,
  p_property_type public.property_type default null,
  p_min_price_minor bigint default null,
  p_max_price_minor bigint default null,
  p_bedrooms integer default null,
  p_limit integer default 500
)
returns table (
  id uuid,
  title text,
  property_type public.property_type,
  listing_intent public.listing_intent,
  city text,
  area text,
  state_code text,
  latitude double precision,
  longitude double precision,
  bedrooms integer,
  bathrooms integer,
  price_minor bigint,
  is_demo boolean
)
language sql
stable
set search_path to ''
as $function$
  select
    l.id,
    l.title,
    l.property_type,
    l.listing_intent,
    l.city,
    l.area,
    l.state_code,
    l.latitude,
    l.longitude,
    l.bedrooms,
    l.bathrooms,
    case
      when l.listing_intent = 'sale' then l.sale_price_minor
      else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0))
    end as price_minor,
    l.is_demo
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.location is not null
    and l.location::extensions.geometry
        operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    and (p_intent is null or l.listing_intent = p_intent)
    and (p_property_type is null or l.property_type = p_property_type)
    and (p_bedrooms is null or l.bedrooms >= p_bedrooms)
    and (
      p_min_price_minor is null
      or coalesce(
           case when l.listing_intent = 'sale' then l.sale_price_minor
                else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0)) end,
           -1
         ) >= p_min_price_minor
    )
    and (
      p_max_price_minor is null
      or coalesce(
           case when l.listing_intent = 'sale' then l.sale_price_minor
                else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0)) end,
           -1
         ) between 0 and p_max_price_minor
    )
  order by l.featured desc, l.published_at desc nulls last, l.id
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$function$;

grant execute on function public.listings_in_bounds(
  double precision, double precision, double precision, double precision,
  public.listing_intent, public.property_type, bigint, bigint, integer, integer
) to anon, authenticated, service_role;
