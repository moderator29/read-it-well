#!/usr/bin/env bash
# The badge-sweep probe for B4's third migration: private.award_badge declines
# the example lister instead of letting the user_badges trigger end the sweep.
#
# Loads the EXACT trigger text from 20260809081841 and the EXACT award_badge
# text from the B4 migration into a scratch database with agents and
# user_badges, then asserts inside one rolled-back transaction: award_badge
# for the demo agent raises nothing and writes nothing; for a real agent it
# writes once and is idempotent; a direct insert for the demo agent is still
# refused by the trigger; nothing survives the rollback.
#
# Usage (as root on a machine with a local cluster):
#   pg_ctlcluster 16 main start
#   bash scripts/probes/b4_badge_sweep.sh | tee scripts/probes/b4_badge_sweep.log
#   pg_ctlcluster 16 main stop
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
trigger_src="$(ls "$repo"/supabase/migrations/*_the_example_lister_is_marked_and_can_never_earn_a_badge.sql | head -n 1)"
award_src="$(ls "$repo"/supabase/migrations/*_b4_the_badge_sweep_skips_the_example_lister.sql | head -n 1)"
db="vallo_b4_badge_probe"
scratch="$(mktemp -d)"
chmod 755 "$scratch"
trap 'rm -rf "$scratch"' EXIT

psql_as() { su postgres -c "psql -v ON_ERROR_STOP=1 -X -q -At -d $1 $2"; }

echo "== probe started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "== migration: $(basename "$award_src"); trigger from $(basename "$trigger_src")"

su postgres -c "dropdb --if-exists $db"
su postgres -c "createdb $db"

cat > "$scratch/schema.sql" <<'SQL'
create schema private;
create table public.agents (id uuid primary key, user_id uuid not null, is_demo boolean not null default false);
create table public.user_badges (
  user_id uuid not null, badge_code text not null, reason text, evidence jsonb, revoked_at timestamptz,
  primary key (user_id, badge_code)
);
insert into public.agents values
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', true),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', false);
SQL

sed -n '/^create or replace function public.refuse_badge_for_example_lister()/,/^\$\$;/p' "$trigger_src" > "$scratch/trigger.sql"
cat >> "$scratch/trigger.sql" <<'SQL'
create trigger user_badges_never_for_the_example_lister
  before insert or update of user_id, badge_code on public.user_badges
  for each row execute function public.refuse_badge_for_example_lister();
SQL
sed -n '/^create or replace function private.award_badge(/,/^\$\$;/p' "$award_src" > "$scratch/award.sql"
echo "== award_badge text: $(wc -l < "$scratch/award.sql") lines, sha256 $(sha256sum "$scratch/award.sql" | cut -c1-16)"

cat > "$scratch/run.sql" <<'SQL'
\set ON_ERROR_STOP 1
begin;
do $$
declare n integer;
begin
  perform private.award_badge('e0000000-0000-4000-8000-000000000001', 'photo_pro', 'probe', '{}'::jsonb);
  select count(*) into n from public.user_badges where user_id = 'e0000000-0000-4000-8000-000000000001';
  if n <> 0 then raise exception 'FAIL: the demo agent got a badge'; end if;
  raise notice 'PASS: award_badge for the demo agent raises nothing and writes nothing';

  perform private.award_badge('a0000000-0000-4000-8000-000000000001', 'photo_pro', 'probe', '{}'::jsonb);
  perform private.award_badge('a0000000-0000-4000-8000-000000000001', 'photo_pro', 'probe', '{}'::jsonb);
  select count(*) into n from public.user_badges where user_id = 'a0000000-0000-4000-8000-000000000001';
  if n <> 1 then raise exception 'FAIL: the real agent has % badges, expected 1', n; end if;
  raise notice 'PASS: a real agent is awarded once; the second call is idempotent';

  begin
    insert into public.user_badges (user_id, badge_code) values ('e0000000-0000-4000-8000-000000000001', 'photo_pro');
    raise exception 'FAIL: a direct insert for the demo agent was accepted';
  exception when check_violation then
    raise notice 'PASS: the trigger still refuses a direct insert for the demo agent';
  end;
end $$;
rollback;
select 'rows after rollback: ' || count(*) from public.user_badges;
SQL

chmod 644 "$scratch"/*.sql
psql_as "$db" "-f $scratch/schema.sql"
psql_as "$db" "-f $scratch/trigger.sql"
psql_as "$db" "-f $scratch/award.sql"
if psql_as "$db" "-f $scratch/run.sql" > "$scratch/run.out" 2>&1; then
  cat "$scratch/run.out"
  su postgres -c "dropdb $db"
  echo "== scratch database dropped"
  echo "== RESULT: PASS."
  exit 0
else
  cat "$scratch/run.out"
  su postgres -c "dropdb $db"
  echo "== scratch database dropped"
  echo "== RESULT: FAIL. Read the output above."
  exit 1
fi
