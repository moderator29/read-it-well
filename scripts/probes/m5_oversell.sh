#!/usr/bin/env bash
# The two-concurrent-taps oversell probe for M5.
#
# Two guests tap Reserve on the last room of a room type in the same second.
# Exactly one may hold it. This script proves that against a local Postgres
# cluster using the EXACT function text from the M5 migration file (extracted
# between the ">>> reserve_room_nights" and "<<< reserve_room_nights" markers)
# and a minimal copy of the tables it reads: room_inventory, rate_plans and
# rate_calendar, with only the columns the functions touch.
#
# Session A: BEGIN; reserve; sleep 2; COMMIT.   (holds the row lock for 2s)
# Session B: BEGIN; reserve; COMMIT.            (started 0.5s later, blocks on A)
#
# Expected: A returns 1 (nights held). B waits on A's row lock, re-evaluates
# the WHERE after A commits, touches 0 rows and raises. units_booked ends at 1.
#
# Usage (as root on a machine with a local cluster):
#   pg_ctlcluster 16 main start
#   bash scripts/probes/m5_oversell.sh | tee scripts/probes/m5_oversell.log
#   pg_ctlcluster 16 main stop
#
# The scratch database is dropped at the end. Nothing here touches the live
# Supabase project.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
migration="$(ls "$repo"/supabase/migrations/*_m05_room_inventory_and_reserve_room_nights.sql | head -n 1)"
db="vallo_m5_oversell_probe"
scratch="$(mktemp -d)"
chmod 755 "$scratch"
trap 'rm -rf "$scratch"' EXIT

psql_as() { su postgres -c "psql -v ON_ERROR_STOP=1 -X -q -d $1 $2"; }

echo "== probe started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "== migration: $(basename "$migration")"
su postgres -c "psql -X -q -c 'select version();'" | sed -n 3p

su postgres -c "dropdb --if-exists $db"
su postgres -c "createdb $db"

# The minimal schema the functions read and write.
cat > "$scratch/schema.sql" <<'SQL'
create schema private;
create table public.rate_plans (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null,
  active boolean not null default true,
  min_stay_nights smallint not null default 1,
  max_stay_nights smallint
);
create table public.rate_calendar (
  rate_plan_id uuid not null,
  date date not null,
  closed boolean not null default false,
  primary key (rate_plan_id, date)
);
create table public.room_inventory (
  room_type_id uuid not null,
  date         date not null,
  units_open   integer not null check (units_open >= 0),
  units_booked integer not null default 0 check (units_booked >= 0 and units_booked <= units_open),
  updated_at   timestamptz not null default now(),
  primary key (room_type_id, date)
);
SQL

# The exact function text, lifted from the migration between its markers.
sed -n '/^-- >>> reserve_room_nights/,/^-- <<< reserve_room_nights/p' "$migration" > "$scratch/functions.sql"
echo "== function text: $(wc -l < "$scratch/functions.sql") lines, sha256 $(sha256sum "$scratch/functions.sql" | cut -c1-16)"

# One room type, one night, ONE room open, one plan that admits a one-night stay.
cat > "$scratch/seed.sql" <<'SQL'
insert into public.rate_plans (room_type_id, active, min_stay_nights, max_stay_nights)
values ('00000000-0000-4000-8000-000000000001', true, 1, null);
insert into public.room_inventory (room_type_id, date, units_open, units_booked)
values ('00000000-0000-4000-8000-000000000001', date '2026-12-15', 1, 0);
SQL

chmod 644 "$scratch"/*.sql
psql_as "$db" "-f $scratch/schema.sql"
psql_as "$db" "-f $scratch/functions.sql"
psql_as "$db" "-f $scratch/seed.sql"

echo "== before: $(su postgres -c "psql -X -Atc \"select 'units_open=' || units_open || ' units_booked=' || units_booked from public.room_inventory\" -d $db")"

cat > "$scratch/a.sql" <<'SQL'
\set ON_ERROR_STOP 1
\echo A: begin
begin;
select 'A: held nights=' || private.reserve_room_nights('00000000-0000-4000-8000-000000000001', date '2026-12-15', date '2026-12-16', 1) as a;
select 'A: sleeping 2s with the row locked' as a;
select pg_sleep(2);
commit;
\echo A: committed
SQL

cat > "$scratch/b.sql" <<'SQL'
\echo B: begin (0.5s after A)
begin;
select 'B: held nights=' || private.reserve_room_nights('00000000-0000-4000-8000-000000000001', date '2026-12-15', date '2026-12-16', 1) as b;
commit;
\echo B: committed
SQL
chmod 644 "$scratch"/a.sql "$scratch"/b.sql

echo "== running two sessions concurrently"
su postgres -c "psql -X -q -At -d $db -f $scratch/a.sql" > "$scratch/a.out" 2>&1 &
pid_a=$!
sleep 0.5
su postgres -c "psql -X -q -At -d $db -f $scratch/b.sql" > "$scratch/b.out" 2>&1 &
pid_b=$!
wait $pid_a || true
wait $pid_b || true

echo "-- session A output:"; cat "$scratch/a.out"
echo "-- session B output:"; cat "$scratch/b.out"

after="$(su postgres -c "psql -X -Atc \"select 'units_open=' || units_open || ' units_booked=' || units_booked from public.room_inventory\" -d $db")"
echo "== after: $after"

echo "== release restores"
su postgres -c "psql -X -Atc \"select 'released nights=' || private.release_room_nights('00000000-0000-4000-8000-000000000001', date '2026-12-15', date '2026-12-16', 1)\" -d $db"
echo "== after release: $(su postgres -c "psql -X -Atc \"select 'units_open=' || units_open || ' units_booked=' || units_booked from public.room_inventory\" -d $db")"

su postgres -c "dropdb $db"
echo "== scratch database dropped"

if grep -q "held nights=1" "$scratch/a.out" && grep -q "Nothing was held" "$scratch/b.out" && [ "$after" = "units_open=1 units_booked=1" ]; then
  echo "== RESULT: PASS. A held the last room, B was refused, units_booked never exceeded units_open."
  exit 0
else
  echo "== RESULT: FAIL. Read the two session outputs above."
  exit 1
fi
