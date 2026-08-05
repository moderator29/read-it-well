-- What a new arrival is here for, asked once, at the door.
--
-- A person who has just signed up has an empty catalogue in front of them and
-- no way to say what they came for. The home screen guesses, and search shows
-- everything in the order the database happened to return it. There is exactly
-- one question worth asking at that moment, and this column is the answer to it.
--
-- 1. WHY property_type AND NOT A NEW "INTERESTS" VOCABULARY.
--
--    The enum already exists, `listings.property_type` already carries it, and
--    `/search?type=` already filters on it. A second vocabulary would need a
--    mapping table between the two, and that mapping would be maintained by
--    whoever remembered it existed - which is how the taxonomies in every other
--    system drift apart. Stating intent in the same words the catalogue is
--    filed under means intent and filter can never disagree.
--
--    The enum is `apartment, hotel, home, villa, shortlet, rental, shop,
--    office, land`. Nine values. Adding one later widens this column for free.
--
-- 2. WHY AN ARRAY COLUMN AND NOT A JOIN TABLE.
--
--    A join table is right when the set is unbounded, queried across users, or
--    carries its own attributes. None of that is true here: at most nine rows
--    per person, always read whole with the profile, never asked "who else
--    chose hotels". A join table would buy nothing and cost a second read on
--    every profile load. This is one array, read with the row that owns it.
--
-- 3. WHY NOT NULL DEFAULT '{}' AND NOT NULLABLE.
--
--    Three states would be representable with a nullable column - never asked,
--    asked and skipped, answered - and only two of them are real here. Empty
--    means "no stated intent", which is the honest reading of both "not asked
--    yet" and "asked and declined", and it is the state every existing row
--    already deserves. Whether we have ASKED is a preference, not a fact about
--    the catalogue, so it lives in `profiles.settings` beside the other
--    preferences rather than as a second column here.
--
--    Postgres 11 and later record a non-volatile default in the catalogue
--    rather than rewriting the heap, so this is an O(1) statement on a table of
--    any size. No backfill runs, no existing value is touched, and
--    `alter table public.profiles drop column interests` reverses it exactly.
--
-- 4. THE PERMISSION, CHECKED RATHER THAN ASSUMED.
--
--    `profiles_update_own` is a ROW policy - `auth.uid() = id` in both USING
--    and WITH CHECK - so it covers every column of the row it admits, this one
--    included, and needs no change. There is no column-scoped update policy on
--    this table to extend.
--
--    Underneath it, `public.profiles` is granted to `anon`, `authenticated` and
--    `service_role` at TABLE level, not column by column, which is what makes a
--    new column reachable the moment it exists. That was verified against the
--    live catalogue before this ran, not assumed: had the grants been
--    column-scoped, the column would have been invisible and unwritable however
--    permissive the policy above it is, and this file would have been the only
--    place to notice.
--
--    The explicit grant below is therefore redundant, and is kept deliberately:
--    it is idempotent, it costs nothing, and it means a future migration that
--    tightens `profiles` to column grants cannot silently take the write path
--    down. RLS remains the gate - the grant only says which columns the gate
--    is allowed to consider.

alter table public.profiles
  add column if not exists interests public.property_type[] not null default '{}';

comment on column public.profiles.interests is
  'What this person said they came here for, in the same words the catalogue is filed under. Empty means no stated intent, which is also what "not asked yet" looks like. Read by discovery to bias the default ordering ONLY when the address bar carries no filter of the person''s own; any explicit choice outranks it entirely.';

grant select (interests), update (interests) on public.profiles to authenticated;
