-- Nigeria, then a state, then a local government, then you are in.
--
-- Around opened with five curated Lagos places, which meant everybody outside
-- those five had a social layer with nowhere to stand. The owner's answer is the
-- right one: all 37 states, then that state's local governments, then in. 774
-- doors instead of five.
--
-- The alternative was seeding 774 area rows, and it is worse. Most would sit
-- empty for years, the directory would be 774 rows of nothing, and every count
-- and ordering the product does would be dominated by places nobody has ever
-- opened. So a place is CREATED THE FIRST TIME SOMEBODY WALKS INTO IT, and the
-- 774 live in `local_governments`, which is a reference table and already
-- exists.
--
-- `public.enter_place` is the door. It is security definer for one specific
-- reason: `areas_insert_proposal` requires `status = 'PROPOSED'` and a
-- `created_by`, because a person proposing a new place should wait for a human
-- to approve it. A local government is not a proposal. It exists, it is
-- administrative fact, and nobody needs to approve Nigeria. So this path creates
-- it ACTIVE without going through the proposal policy, and it can only ever
-- create one that a row in `local_governments` already names.

alter table public.areas
  add column if not exists lga_code text references public.local_governments (code) on delete set null;

comment on column public.areas.lga_code is
  'The local government this place IS, when it was opened by somebody entering one. Null for a curated or proposed place that is smaller or larger than an LGA.';

create unique index if not exists areas_lga_unique on public.areas (lga_code) where lga_code is not null;
create index if not exists areas_state_idx on public.areas (state_code);

/*
 * Backfill the seeded Lagos places onto their local government where the names
 * agree exactly. Measured afterwards: this matches ONE of the five, because a
 * neighbourhood name is not a local government name. The other four are placed
 * by hand in the migration two along, which is the honest way to do something
 * no rule derives.
 */
update public.areas a
   set lga_code = l.code
  from public.local_governments l
 where a.lga_code is null
   and l.state_code = a.state_code
   and lower(l.name) = lower(coalesce(a.area, a.city))
   and not exists (select 1 from public.areas b where b.lga_code = l.code);
