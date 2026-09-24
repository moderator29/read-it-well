/*
 * V-66. SEARCH IN THE WORDS NIGERIANS USE: UNIT SHAPES AS DATA.
 *
 * "2 bedroom" says little here. A self-contain is one room with its own
 * kitchen and toilet, a room and parlour shares facilities, a mini flat is one
 * bedroom with a sitting room, "all rooms en-suite" is a Lekki headline, and a
 * boys' quarters is a second income. On the walk "Self contained in Akoka" was
 * filed as "1 bed 1 bath" and was findable only by its title.
 *
 *   unit_shape     the shape of the home, from a closed list (the enum below).
 *                  NOT another `property_type`: that enum is the market split
 *                  and is shared with stays
 *   ensuite_count  how many bedrooms have their own bathroom, never more than
 *                  the bedrooms
 *   has_bq         whether a boys' quarters comes with it
 *
 * All nullable; null is unanswered and renders as nothing. The wizard asks
 * for a shape at submit for residential rent and sale. Read by a separate
 * query, so the catalogue never depends on this migration having been applied.
 *
 * The example listings are backfilled BY HAND from their own titles below.
 * Nothing is inferred for them that the title does not say: a "house" with no
 * more said is recorded as detached, the plainest reading, and no example is
 * given en-suite rooms or a BQ, because no example's title claims either.
 */

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'unit_shape' and typnamespace = 'public'::regnamespace) then
    create type public.unit_shape as enum (
      'self_contain',
      'room_parlour',
      'mini_flat',
      'flat',
      'duplex',
      'terrace',
      'semi_detached',
      'detached',
      'bungalow',
      'maisonette',
      'penthouse',
      'boys_quarters'
    );
  end if;
end
$$;

alter table public.listings
  add column if not exists unit_shape public.unit_shape,
  add column if not exists ensuite_count smallint,
  add column if not exists has_bq boolean;

alter table public.listings
  add constraint listings_ensuite_count_within_bedrooms
    check (ensuite_count is null or (ensuite_count >= 0 and ensuite_count <= coalesce(bedrooms, 0)));

comment on column public.listings.unit_shape is
  'The shape of the home (V-66): self_contain, room_parlour, mini_flat, flat, duplex, terrace, semi_detached, detached, bungalow, maisonette, penthouse, boys_quarters. Null is unanswered.';
comment on column public.listings.ensuite_count is
  'How many bedrooms have their own bathroom, never more than bedrooms (V-66). Null is unanswered.';
comment on column public.listings.has_bq is
  'Whether a boys'' quarters comes with the home (V-66). Null is unanswered.';

create index if not exists listings_unit_shape_idx on public.listings (unit_shape) where unit_shape is not null;

/* The examples, by hand, from their titles. Stays, shops, offices, plots and
   restaurants have no unit shape and are left alone. */
update public.listings as l
set unit_shape = v.shape::public.unit_shape
from (values
  ('ed000000-0000-4000-8000-000000000001', 'flat'),
  ('ed000000-0000-4000-8000-000000000002', 'flat'),
  ('ed000000-0000-4000-8000-000000000004', 'detached'),
  ('ed000000-0000-4000-8000-000000000005', 'flat'),
  ('ed000000-0000-4000-8000-000000000006', 'flat'),
  ('ed000000-0000-4000-8000-000000000008', 'flat'),
  ('ed000000-0000-4000-8000-000000000009', 'mini_flat'),
  ('ed000000-0000-4000-8000-00000000000b', 'flat'),
  ('ed000000-0000-4000-8000-00000000000c', 'detached'),
  ('ed000000-0000-4000-8000-00000000000d', 'flat'),
  ('ed000000-0000-4000-8000-00000000000f', 'flat'),
  ('ed000000-0000-4000-8000-000000000011', 'detached'),
  ('ed000000-0000-4000-8000-000000000012', 'flat'),
  ('ed000000-0000-4000-8000-000000000013', 'detached'),
  ('ed000000-0000-4000-8000-000000000014', 'detached'),
  ('ed000000-0000-4000-8000-000000000016', 'flat'),
  ('ed000000-0000-4000-8000-000000000019', 'terrace'),
  ('ed000000-0000-4000-8000-00000000001a', 'duplex'),
  ('ed000000-0000-4000-8000-00000000001b', 'flat'),
  ('ed000000-0000-4000-8000-00000000001d', 'flat'),
  ('ed000000-0000-4000-8000-00000000001f', 'detached'),
  ('ed000000-0000-4000-8000-000000000020', 'flat'),
  ('ed000000-0000-4000-8000-000000000021', 'detached'),
  ('ed000000-0000-4000-8000-000000000024', 'mini_flat'),
  ('ed000000-0000-4000-8000-000000000025', 'bungalow'),
  ('ed000000-0000-4000-8000-000000000026', 'flat'),
  ('ed000000-0000-4000-8000-000000000028', 'detached'),
  ('ed000000-0000-4000-8000-00000000002b', 'mini_flat'),
  ('ed000000-0000-4000-8000-00000000002c', 'flat'),
  ('ed000000-0000-4000-8000-00000000002d', 'self_contain'),
  ('ed000000-0000-4000-8000-00000000002e', 'flat'),
  ('ed000000-0000-4000-8000-00000000002f', 'bungalow'),
  ('ed000000-0000-4000-8000-000000000030', 'flat'),
  ('ed000000-0000-4000-8000-000000000031', 'flat'),
  ('ed000000-0000-4000-8000-000000000032', 'terrace'),
  ('ed000000-0000-4000-8000-000000000033', 'bungalow'),
  ('ed000000-0000-4000-8000-000000000034', 'detached'),
  ('ed000000-0000-4000-8000-000000000035', 'duplex'),
  ('ed000000-0000-4000-8000-000000000036', 'detached'),
  ('ed000000-0000-4000-8000-00000000003d', 'detached'),
  ('ed000000-0000-4000-8000-00000000003e', 'detached'),
  ('ed000000-0000-4000-8000-00000000003f', 'detached'),
  ('ed000000-0000-4000-8000-000000000040', 'terrace')
) as v(id, shape)
where l.id = v.id::uuid
  and l.is_demo
  and l.unit_shape is null;

commit;
