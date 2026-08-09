-- Amenities for the example catalogue.
--
-- DERIVED FROM EACH ROW'S OWN COLUMNS RATHER THAN LISTED BY HAND, because a
-- hand-written amenity list is how a flat ends up tagged "Backup Power" while
-- its `power_backup` column says NONE. The filter drawer reads the join table
-- and the listing page reads the columns, so the two disagreeing is a bug a
-- reader sees immediately and cannot explain.
--
-- Every rule below is a restatement of something the row already asserts, so
-- the join table cannot contradict the property. The two exceptions are the
-- pool and the gym, which have no column to derive from and are therefore
-- named explicitly against the two buildings whose descriptions already
-- mention them.

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'generator'
where l.is_demo
  and l.power_backup is not null
  and l.power_backup <> 'NONE'
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'water'
where l.is_demo
  and l.water_supply in ('TREATED_MAINS','BOREHOLE','PUMPED_STORAGE')
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'parking'
where l.is_demo and coalesce(l.parking_spaces, 0) > 0
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'security'
where l.is_demo and l.has_estate_access
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'furnished'
where l.is_demo and l.furnished = 'fully_furnished'
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'ac'
where l.is_demo and l.furnished in ('semi_furnished','fully_furnished')
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'kitchen'
where l.is_demo
  and l.property_type in ('apartment','home','villa','shortlet','hotel','restaurant','rental')
on conflict do nothing;

-- A lift is a fact about the building, and a five storey block has one.
insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'elevator'
where l.is_demo and coalesce(l.total_floors, 0) >= 5
on conflict do nothing;

insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'balcony'
where l.is_demo
  and coalesce(l.floor, 0) >= 1
  and l.property_type in ('apartment','shortlet')
on conflict do nothing;

-- Anything let by the night is serviced, so it carries the things a guest
-- arriving with a suitcase expects.
insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code in ('wifi','tv','laundry')
where l.is_demo and l.rate_period = 'night'
on conflict do nothing;

-- A garden is a fact about a house on its own plot, not about a flat.
insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = 'garden'
where l.is_demo
  and l.property_type in ('home','villa')
  and coalesce(l.size_sqm, 0) >= 150
on conflict do nothing;

-- The two that no column can express, named against the two descriptions that
-- already claim them.
insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code in ('pool','gym')
where l.id in (
  'ed000000-0000-4000-8000-000000000007',  -- Ikoyi serviced apartment
  'ed000000-0000-4000-8000-000000000014'   -- Maitama villa
)
on conflict do nothing;
