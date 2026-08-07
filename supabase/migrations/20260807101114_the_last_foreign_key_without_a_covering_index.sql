-- The one foreign key on this database with no covering index.
--
-- `docs/HANDOFF.md` section 6 states the rule plainly: every foreign key gets a
-- covering index. Supabase's own performance linter found exactly one that did
-- not, and it is `admin_bootstrap.added_by`.
--
-- On a table holding a handful of rows an index looks like ceremony, and the
-- reason it is not is the direction the constraint runs in. It is
-- `ON DELETE SET NULL` against `auth.users`, so the scan Postgres performs is
-- not on reading `admin_bootstrap`, it is on DELETING A PERSON. Without an
-- index that is a sequential scan of this table inside the deletion
-- transaction, holding a lock on the row being removed.
--
-- That path already has history here. The hard-won note in the same section
-- records an `on delete set null` foreign key plus an UPDATE-refusing trigger
-- locking a person out of deleting their own account. Account deletion is a
-- right, not a feature, and it should not be the one code path carrying an
-- unindexed scan.
--
-- Additive and reversible: it creates an index and changes no policy, no
-- trigger and no data.

create index if not exists admin_bootstrap_added_by_idx
  on public.admin_bootstrap (added_by);
