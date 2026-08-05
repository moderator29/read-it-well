-- The answers most people in Nigeria actually give, lifted to the top.
--
-- `occupations` holds 749 rows across 30 alphabetical categories, which means
-- somebody who trades in a market opens the picker on "Agriculture and
-- environment" and has to scroll past twenty headings to reach "Retail and
-- commerce". `sort_order` cannot fix that: it is scoped inside a category and
-- exists to order rows within it.
--
-- `common_rank` is the second axis. Non-null on the handful of occupations a
-- Nigerian sign-up is most likely to pick, and its value is the position they
-- take in a single pinned group above the alphabet. Null everywhere else,
-- which is the honest default: an occupation is not "uncommon", it is simply
-- not on the shortcut list.
--
-- The shortlist is deliberately short. A shortcut group with sixty rows is a
-- second list to scroll, not a shortcut. A row on it still appears under its
-- own category as well, because somebody browsing Technology for "Software
-- Engineer" must find it where it belongs.

alter table public.occupations
  add column if not exists common_rank smallint;

comment on column public.occupations.common_rank is
  'Position in the pinned "Common in Nigeria" group at the top of the occupation picker. Null means the row appears only under its own category, which is the case for all but a couple dozen rows.';

alter table public.occupations
  drop constraint if exists occupations_common_rank_positive;

alter table public.occupations
  add constraint occupations_common_rank_positive
  check (common_rank is null or common_rank > 0);

-- Partial: the index exists to pull out the shortlist, and the 720-odd nulls
-- would be the whole of a full index for no read that ever wants them.
create index if not exists occupations_common_rank_idx
  on public.occupations (common_rank)
  where common_rank is not null;

-- Idempotent: the ranks are stated here in full, so re-running sets exactly
-- this list and clears anything that fell off it.
update public.occupations set common_rank = null where common_rank is not null;

update public.occupations as o
set common_rank = v.rank
from (values
  ('student', 1),
  ('small_business_owner', 2),
  ('market_trader', 3),
  ('teacher', 4),
  ('civil_servant', 5),
  ('entrepreneur', 6),
  ('shop_owner', 7),
  ('farmer', 8),
  ('driver', 9),
  ('nurse', 10),
  ('tailor', 11),
  ('software_engineer', 12),
  ('accountant', 13),
  ('estate_agent', 14),
  ('hairdresser', 15),
  ('mechanic', 16),
  ('doctor', 17),
  ('caterer', 18),
  ('lawyer', 19),
  ('electrician', 20),
  ('dispatch_rider', 21),
  ('content_creator', 22),
  ('pastor', 23),
  ('security_guard', 24),
  ('musician', 25),
  ('civil_engineer', 26)
) as v(code, rank)
where o.code = v.code;
