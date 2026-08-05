-- The probe found the two-tier problem before anybody could hit it.
--
-- Of the five seeded Lagos places, exactly ONE is a local government. The rest
-- are neighbourhoods inside one: Lekki Phase 1 is in Eti-Osa, Ikeja GRA is in
-- Ikeja, Yaba and UNILAG are both in Lagos Mainland. So entering "Eti-Osa" from
-- the picker opened a brand new empty place while Lekki Phase 1 sat beside it
-- with the posts in it, and neither knew about the other.
--
-- Both tiers are right and both should exist. A local government is the door
-- everybody can find, because it is the one unit every Nigerian address agrees
-- on. A neighbourhood is where people actually live and it is finer than the
-- LGA that contains it. What was missing is the relationship.
--
-- `lga_code` stays UNIQUE and means "this place IS that local government".
-- `within_lga_code` is not unique and means "this place is INSIDE it", so the
-- door can list what is behind it and a neighbourhood can say where it sits.

alter table public.areas
  add column if not exists within_lga_code text references public.local_governments (code) on delete set null;

comment on column public.areas.within_lga_code is
  'The local government this place sits inside. Set on every place, including the ones that ARE an LGA, so one join answers "what is in here" without a union.';

create index if not exists areas_within_lga_idx on public.areas (within_lga_code);

/* A place that IS a local government is also inside it. Saying so means the
   listing query is one predicate rather than two. */
update public.areas set within_lga_code = lga_code where lga_code is not null;

/* The four seeded neighbourhoods, placed by hand because no rule derives them:
   a neighbourhood name is not an LGA name, which is exactly why the automatic
   match in the migration two back found one of five. */
update public.areas set within_lga_code = 'la_eti_osa'        where slug = 'lekki-phase-1-lagos' and within_lga_code is null;
update public.areas set within_lga_code = 'la_ikeja'          where slug = 'ikeja-gra-lagos'     and within_lga_code is null;
update public.areas set within_lga_code = 'la_lagos_mainland' where slug in ('yaba-lagos', 'yaba-unilag') and within_lga_code is null;

update public.areas set within_lga_code = lga_code where lga_code is not null and within_lga_code is null;
