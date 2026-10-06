# Probes waiting on their migrations

Each probe here tests a migration in `supabase/migrations/pending/` that has not
been applied to production yet. The `db-probes` CI job runs only
`supabase/tests/probes/`, so a probe moves there in the same commit that records
its migration as applied. Until then it would fail against a database that
does not have the objects it tests.
