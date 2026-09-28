# Track A probes: the money flow, proven on a local Postgres

`stub_schema.sql` is the smallest slice of the live schema the Track A
migrations touch (columns and types copied from the live project on
25 September 2026). `a2_money_flow.sql` walks one rental from inspection to
claim and tries to break every gate on the way.

```bash
createdb vallo_probe
psql -d vallo_probe -v ON_ERROR_STOP=1 -f supabase/tests/track_a/stub_schema.sql
psql -d vallo_probe -v ON_ERROR_STOP=1 -f supabase/migrations/20260925121219_track_a2_split_settlement_guarantee_agreements_claims.sql
psql -d vallo_probe -f supabase/tests/track_a/a2_money_flow.sql
```

Every numbered step prints the status the database answered with. The
expected answers are in the ledger (`docs/archive/TRACKS_25_SEPTEMBER_LEDGER.md`,
Track A). A line reading `WRONGLY ALLOWED` is a failure.
