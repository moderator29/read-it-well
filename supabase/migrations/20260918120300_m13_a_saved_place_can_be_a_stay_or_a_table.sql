-- M13. A saved place can be a stay or a table.
--
-- public.saved_items is (user_id, listing_id NOT NULL) with a foreign key to
-- public.listings, so it cannot save an accommodation or a restaurant. This
-- is the sibling table docs/research/TWO_MODE_BACKEND_RESEARCH.md section 1.3
-- recommends: keyed on the catalogue projection's entity kind, so the Saved
-- surface reads one shape across both sides and filters by kind per side.
--
-- entity_kind is text with a CHECK rather than a reference to M9's enum,
-- because M9 (BE1) is not live at the time of writing and a table must not
-- wait on a type it only names. The three values are the three source tables
-- of the catalogue projection. entity_id carries no foreign key on purpose:
-- it points at one of three tables, and a polymorphic key the database cannot
-- enforce is documented as such rather than pretended at. A retired entity
-- simply resolves to nothing at read time and the card is dropped, exactly as
-- lib/saved/queries.ts already does for withdrawn listings.
create table if not exists public.saved_places (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_kind text not null check (entity_kind in ('listing', 'accommodation', 'restaurant')),
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, entity_kind, entity_id)
);

comment on table public.saved_places is
  'A person''s shortlist across both sides: a listing, an accommodation or a restaurant, keyed on the catalogue entity kind. Owner-only.';

create index if not exists saved_places_user_created_idx
  on public.saved_places (user_id, created_at desc);

alter table public.saved_places enable row level security;

drop policy if exists saved_places_own on public.saved_places;
create policy saved_places_own
  on public.saved_places for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.saved_places from anon;
grant select, insert, delete on public.saved_places to authenticated;
revoke update on public.saved_places from authenticated;
