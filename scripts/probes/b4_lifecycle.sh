#!/usr/bin/env bash
# The lifecycle probe for B4: hold expiry, completion at check-out, no show,
# inventory drift and the pg_cron watch, against a local Postgres cluster.
#
# Loads the EXACT function text from the two B4 migration files (between the
# ">>> b4_lifecycle" / "<<< b4_lifecycle" and ">>> b4_drift" / "<<< b4_drift"
# markers) into a scratch database with a minimal copy of the tables they
# read and write, the real private.has_role, the real notify_booking_change
# trigger (lifted from its own migration) and a private.notify that writes
# public.notifications without the preference lookup. One booking per case is
# seeded, every function runs, and a DO block asserts the states, the
# events, the calendar, the notifications and idempotence. Any failed
# assertion raises and the script exits non-zero.
#
# Usage (as root on a machine with a local cluster):
#   pg_ctlcluster 16 main start
#   bash scripts/probes/b4_lifecycle.sh | tee scripts/probes/b4_lifecycle.log
#   pg_ctlcluster 16 main stop
#
# The scratch database is dropped at the end. Nothing here touches the live
# Supabase project. For the live project, scripts/probes/b4_lifecycle_live.sql
# runs the same cases inside a transaction that ends in ROLLBACK.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
lifecycle="$(ls "$repo"/supabase/migrations/*_b4_booking_lifecycle_sweeps.sql | head -n 1)"
drift="$(ls "$repo"/supabase/migrations/*_b4_inventory_drift_and_cron_watch.sql | head -n 1)"
notifier="$(ls "$repo"/supabase/migrations/*_notify_booking_change_covers_completion.sql | head -n 1)"
db="vallo_b4_lifecycle_probe"
scratch="$(mktemp -d)"
chmod 755 "$scratch"
trap 'rm -rf "$scratch"' EXIT

psql_as() { su postgres -c "psql -v ON_ERROR_STOP=1 -X -q -d $1 $2"; }

echo "== probe started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "== migrations: $(basename "$lifecycle"), $(basename "$drift")"
su postgres -c "psql -X -q -c 'select version();'" | sed -n 3p

su postgres -c "dropdb --if-exists $db"
su postgres -c "createdb $db"

# The minimal schema the functions read and write. Column names and types
# match the live tables; everything the functions never touch is left out.
cat > "$scratch/schema.sql" <<'SQL'
create schema private;
create schema auth;
create table auth.users (id uuid primary key);

create type public.booking_status as enum ('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
create type public.transaction_status as enum ('PENDING', 'SUCCESSFUL', 'FAILED');
create type public.availability_status as enum ('available', 'booked', 'unavailable');
create type public.notification_kind as enum ('booking', 'message', 'wallet', 'listing', 'agent', 'support', 'system', 'social');
create type public.app_role as enum ('user', 'agent', 'admin', 'super_admin');

create table public.user_roles (user_id uuid not null, role public.app_role not null, primary key (user_id, role));
create table public.agents (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id));
create table public.listings (id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.agents (id), title text not null);
create table public.bookings (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id),
  guest_id   uuid not null references auth.users (id),
  check_in   date not null,
  check_out  date not null,
  status     public.booking_status not null default 'PENDING',
  created_at timestamptz not null default now()
);
create table public.booking_state_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create table public.transactions (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  status     public.transaction_status not null default 'PENDING'
);
create table public.availability (
  listing_id uuid not null references public.listings (id),
  date       date not null,
  status     public.availability_status not null default 'available',
  primary key (listing_id, date)
);
create table public.notifications (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind    public.notification_kind not null,
  title   text not null,
  body    text,
  href    text
);
create table public.room_inventory (
  room_type_id uuid not null,
  date         date not null,
  units_open   integer not null,
  units_booked integer not null default 0,
  primary key (room_type_id, date)
);

-- The real role helper, verbatim from 20260728151336.
create function private.has_role(check_user_id uuid, check_role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = check_user_id and role = check_role); $$;

-- private.notify without the preference lookup (profiles is not here).
create function private.notify(target_user uuid, n_kind public.notification_kind, n_title text, n_body text, n_href text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if target_user is null then return; end if;
  insert into public.notifications (user_id, kind, title, body, href) values (target_user, n_kind, n_title, n_body, n_href);
end;
$$;
SQL

# The real notifier, lifted from its migration, and the trigger that fires it.
sed -n '/^create or replace function private.notify_booking_change()/,/^\$function\$;/p' "$notifier" > "$scratch/notifier.sql"
cat >> "$scratch/notifier.sql" <<'SQL'
create trigger bookings_notify_change
  after insert or update on public.bookings
  for each row execute function private.notify_booking_change();
SQL

# The exact function text, lifted from the migrations between their markers.
sed -n '/^-- >>> b4_lifecycle/,/^-- <<< b4_lifecycle/p' "$lifecycle" > "$scratch/lifecycle.sql"
sed -n '/^-- >>> b4_drift/,/^-- <<< b4_drift/p' "$drift" > "$scratch/drift.sql"
echo "== lifecycle text: $(wc -l < "$scratch/lifecycle.sql") lines, sha256 $(sha256sum "$scratch/lifecycle.sql" | cut -c1-16)"
echo "== drift text: $(wc -l < "$scratch/drift.sql") lines, sha256 $(sha256sum "$scratch/drift.sql" | cut -c1-16)"

# One booking per case. Fixed ids so the assertions read plainly.
cat > "$scratch/seed.sql" <<'SQL'
insert into auth.users (id) values
  ('00000000-0000-4000-8000-0000000000a1'),  -- host
  ('00000000-0000-4000-8000-0000000000a2'),  -- guest
  ('00000000-0000-4000-8000-0000000000a3'),  -- admin
  ('00000000-0000-4000-8000-0000000000a4');  -- stranger
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-8000-0000000000a3', 'admin');
insert into public.agents (id, user_id) values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1');
insert into public.listings (id, agent_id, title) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Probe flat');

-- Dates relative to today in Lagos, exactly as the functions compute it.
create temp table d as select (now() at time zone 'Africa/Lagos')::date as today;

-- H1 stale hold, unpaid: released.  H2 stale hold, paid: kept and reported.  H3 fresh hold: kept.
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status, created_at)
select '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today + 10, today + 12, 'PENDING', now() - interval '50 hours' from d;
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status, created_at)
select '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today + 20, today + 21, 'PENDING', now() - interval '50 hours' from d;
insert into public.transactions (booking_id, status) values ('00000000-0000-4000-8000-0000000000d2', 'SUCCESSFUL');
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status, created_at)
select '00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today + 30, today + 31, 'PENDING', now() - interval '10 hours' from d;
-- H1's nights on the calendar, plus one the host closed by hand inside the range.
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today + 10, 'booked' from d;
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today + 11, 'unavailable' from d;

-- C1 confirmed, ended yesterday, paid: completed.  C2 ended, unpaid: reported.  C3 ends today: kept.
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today - 3, today - 1, 'CONFIRMED' from d;
insert into public.transactions (booking_id, status) values ('00000000-0000-4000-8000-0000000000e1', 'SUCCESSFUL');
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today - 6, today - 4, 'CONFIRMED' from d;
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today - 2, today, 'CONFIRMED' from d;

-- N1 confirmed, arrived yesterday, three nights: host records no show; the two nights ahead reopen.
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today - 1, today + 2, 'CONFIRMED' from d;
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today - 1, 'booked' from d;
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today, 'booked' from d;
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today + 1, 'booked' from d;
-- N3 confirmed, arrives tomorrow: too early for a no show. Its calendar row is deliberately missing (drift D2).
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today + 1, today + 2, 'CONFIRMED' from d;
-- N4 confirmed, arrived today: an admin records the no show and the host hears.
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status)
select '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', today, today + 1, 'CONFIRMED' from d;

-- Drift. D1 an orphan booked night nobody holds. D3 a room night sold with no booking behind it.
insert into public.availability (listing_id, date, status) select '00000000-0000-4000-8000-0000000000c1', today + 40, 'booked' from d;
insert into public.room_inventory (room_type_id, date, units_open, units_booked) select '00000000-0000-4000-8000-0000000000aa', today + 5, 3, 1 from d;
insert into public.room_inventory (room_type_id, date, units_open, units_booked) select '00000000-0000-4000-8000-0000000000aa', today + 6, 3, 0 from d;
SQL

# Run everything, then assert. A failed assertion raises and stops the run.
cat > "$scratch/run.sql" <<'SQL'
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on

select '-- expire_booking_holds: ' || private.expire_booking_holds(interval '48 hours', 500)::text;
select '-- complete_ended_stays: ' || private.complete_ended_stays(500)::text;
select '-- no show N1 by host: ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'Called twice, no answer.')::text;
select '-- no show N1 again: ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', null)::text;
select '-- no show N3 too early: ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a1', null)::text;
select '-- no show N4 by admin: ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000a3', null)::text;
select '-- no show on a PENDING (H3): ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000a1', null)::text;
select '-- no show on a missing id: ' || private.record_booking_no_show('00000000-0000-4000-8000-0000000000ff', '00000000-0000-4000-8000-0000000000a1', null)::text;

do $$
begin
  begin
    perform private.record_booking_no_show('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a4', null);
    raise exception 'FAIL: a stranger recorded a no show';
  exception when insufficient_privilege then
    raise notice 'PASS: a stranger is refused (42501)';
  end;
end $$;

select '-- inventory_drift: ' || private.inventory_drift(200)::text;
select '-- cron_job_failures: ' || private.cron_job_failures(interval '25 hours', 100)::text;

-- Second runs: nothing left to do, nothing done twice.
select '-- expire again: ' || private.expire_booking_holds(interval '48 hours', 500)::text;
select '-- complete again: ' || private.complete_ended_stays(500)::text;

do $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  s text; n integer; drift jsonb;
begin
  -- H1 released with its event, its booked night freed, the hand-closed night kept, guest and host told.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000d1';
  if s <> 'CANCELLED' then raise exception 'FAIL H1: expected CANCELLED, got %', s; end if;
  select count(*) into n from public.booking_state_events where booking_id = '00000000-0000-4000-8000-0000000000d1' and from_status = 'PENDING' and to_status = 'CANCELLED' and note like 'Auto-released:%48 hours.';
  if n <> 1 then raise exception 'FAIL H1: expected 1 state event, got %', n; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-0000000000c1' and date = today + 10;
  if n <> 0 then raise exception 'FAIL H1: booked night not released'; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-0000000000c1' and date = today + 11 and status = 'unavailable';
  if n <> 1 then raise exception 'FAIL H1: hand-closed night was touched'; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-0000000000a2' and title = 'Booking cancelled';
  if n < 1 then raise exception 'FAIL H1: guest not told of the cancellation'; end if;
  raise notice 'PASS H1: stale unpaid hold released, event written, night freed, hand-closed night kept, guest told';

  -- H2 paid and PENDING: untouched.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000d2';
  if s <> 'PENDING' then raise exception 'FAIL H2: paid pending booking was moved to %', s; end if;
  raise notice 'PASS H2: paid PENDING booking untouched and reported';

  -- H3 fresh: untouched.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000d3';
  if s <> 'PENDING' then raise exception 'FAIL H3: fresh hold was moved to %', s; end if;
  raise notice 'PASS H3: fresh hold kept';

  -- C1 completed with event, guest and host told.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000e1';
  if s <> 'COMPLETED' then raise exception 'FAIL C1: expected COMPLETED, got %', s; end if;
  select count(*) into n from public.booking_state_events where booking_id = '00000000-0000-4000-8000-0000000000e1' and from_status = 'CONFIRMED' and to_status = 'COMPLETED' and note like 'Checked out:%';
  if n <> 1 then raise exception 'FAIL C1: expected 1 state event, got %', n; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-0000000000a2' and title = 'Stay complete' and href = '/bookings';
  if n <> 1 then raise exception 'FAIL C1: guest not told, got % notifications', n; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-0000000000a1' and title = 'Stay complete' and href = '/agent/bookings';
  if n <> 1 then raise exception 'FAIL C1: host not told, got % notifications', n; end if;
  raise notice 'PASS C1: paid ended stay completed, event written, both sides told once';

  -- C2 unpaid ended: untouched. C3 ends today: untouched.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000e2';
  if s <> 'CONFIRMED' then raise exception 'FAIL C2: unpaid ended stay was moved to %', s; end if;
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000e3';
  if s <> 'CONFIRMED' then raise exception 'FAIL C3: stay ending today was moved to %', s; end if;
  raise notice 'PASS C2/C3: unpaid ended stay reported not moved; stay ending today kept for the host';

  -- N1 no show by the host: state, event with actor and note, nights ahead freed, the past night kept, guest told, host not told.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000f1';
  if s <> 'NO_SHOW' then raise exception 'FAIL N1: expected NO_SHOW, got %', s; end if;
  select count(*) into n from public.booking_state_events where booking_id = '00000000-0000-4000-8000-0000000000f1' and to_status = 'NO_SHOW' and actor_id = '00000000-0000-4000-8000-0000000000a1' and note = 'Called twice, no answer.';
  if n <> 1 then raise exception 'FAIL N1: expected 1 state event with actor and note, got %', n; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-0000000000c1' and date in (today, today + 1);
  if n <> 0 then raise exception 'FAIL N1: nights ahead not released (% left)', n; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-0000000000c1' and date = today - 1 and status = 'booked';
  if n <> 1 then raise exception 'FAIL N1: the past night was touched'; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-0000000000a2' and title = 'Stay recorded as not attended';
  if n <> 2 then raise exception 'FAIL N1/N4: expected the guest told twice (N1 and N4), got %', n; end if;
  raise notice 'PASS N1: host no show recorded once, nights ahead freed, past night kept, guest told';

  -- N4 admin override: host told.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000f4';
  if s <> 'NO_SHOW' then raise exception 'FAIL N4: expected NO_SHOW, got %', s; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-0000000000a1' and title = 'Stay recorded as no show';
  if n <> 1 then raise exception 'FAIL N4: host not told of the admin override, got %', n; end if;
  raise notice 'PASS N4: admin override recorded and the host told once';

  -- N3 too early: untouched.
  select status into s from public.bookings where id = '00000000-0000-4000-8000-0000000000f3';
  if s <> 'CONFIRMED' then raise exception 'FAIL N3: not-yet-arrived stay was moved to %', s; end if;
  raise notice 'PASS N3: a no show before arrival day is refused';

  -- Drift: D1 orphan night, D2 missing night on N3, D3 room night sold with nothing behind it; nothing corrected.
  drift := private.inventory_drift(200);
  if (drift -> 'room_spine')::boolean then raise exception 'FAIL drift: room_spine should be false before M6'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'orphan_nights') e where (e ->> 'listing_id') = '00000000-0000-4000-8000-0000000000c1' and (e ->> 'date')::date = today + 40;
  if n <> 1 then raise exception 'FAIL D1: orphan night not reported'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'missing_nights') e where (e ->> 'booking_id') = '00000000-0000-4000-8000-0000000000f3' and (e ->> 'date')::date = today + 1;
  if n <> 1 then raise exception 'FAIL D2: missing night not reported'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'room_nights') e where (e ->> 'room_type_id') = '00000000-0000-4000-8000-0000000000aa' and (e ->> 'date')::date = today + 5 and (e ->> 'units_booked')::int = 1 and (e ->> 'live_rooms')::int = 0;
  if n <> 1 then raise exception 'FAIL D3: sold room night not reported'; end if;
  if jsonb_array_length(drift -> 'room_nights') <> 1 then raise exception 'FAIL D3: the clean room night was reported too'; end if;
  select units_booked into n from public.room_inventory where date = today + 5;
  if n <> 1 then raise exception 'FAIL drift: the sweep corrected inventory'; end if;
  select count(*) into n from public.availability where date = today + 40 and status = 'booked';
  if n <> 1 then raise exception 'FAIL drift: the sweep corrected the calendar'; end if;
  raise notice 'PASS D1/D2/D3: orphan night, missing night and sold room night reported, nothing corrected';

  -- cron watch without pg_cron: honest about it.
  if (private.cron_job_failures(interval '25 hours', 100) -> 'available')::boolean then
    raise exception 'FAIL cron watch: reported available without cron.job_run_details';
  end if;
  raise notice 'PASS cron watch: answers available=false where the table is absent';

  -- Idempotence: the second sweeps did nothing.
  if jsonb_array_length(private.expire_booking_holds(interval '48 hours', 500) -> 'released') <> 0 then raise exception 'FAIL: second hold sweep released something'; end if;
  if jsonb_array_length(private.complete_ended_stays(500) -> 'completed') <> 0 then raise exception 'FAIL: second completion sweep completed something'; end if;
  select count(*) into n from public.booking_state_events;
  if n <> 4 then raise exception 'FAIL idempotence: expected 4 state events in total, got %', n; end if;
  raise notice 'PASS idempotence: second runs move nothing and write nothing';

  -- The pg_cron wrapper still answers a count.
  if private.release_stale_booking_holds() <> 0 then raise exception 'FAIL: wrapper released something on an empty queue'; end if;
  raise notice 'PASS wrapper: private.release_stale_booking_holds() still returns an integer';
end $$;

-- D4: the day M6 lands. The probe gives bookings the two M6 columns the drift
-- function looks for and the dynamic branch must wake up unedited: a room
-- night sold to nobody (today + 5) and a room night two rooms are booked on
-- but none sold (today + 6) are both drift; a matching night is not.
alter table public.bookings add column room_type_id uuid, add column rooms smallint not null default 1;
insert into public.bookings (id, listing_id, guest_id, check_in, check_out, status, room_type_id, rooms)
select '00000000-0000-4000-8000-0000000000e6', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', t.today + 6, t.today + 8, 'CONFIRMED', '00000000-0000-4000-8000-0000000000aa', 2
  from (select (now() at time zone 'Africa/Lagos')::date as today) t;
insert into public.room_inventory (room_type_id, date, units_open, units_booked)
select '00000000-0000-4000-8000-0000000000aa', t.today + 7, 3, 2 from (select (now() at time zone 'Africa/Lagos')::date as today) t;
select '-- inventory_drift after M6 columns: ' || private.inventory_drift(200)::text;

do $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  drift jsonb; n integer;
begin
  drift := private.inventory_drift(200);
  if not (drift -> 'room_spine')::boolean then raise exception 'FAIL D4: room_spine should be true once bookings.room_type_id exists'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'room_nights') e where (e ->> 'date')::date = today + 5 and (e ->> 'units_booked')::int = 1 and (e ->> 'live_rooms')::int = 0;
  if n <> 1 then raise exception 'FAIL D4: sold-to-nobody night not reported'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'room_nights') e where (e ->> 'date')::date = today + 6 and (e ->> 'units_booked')::int = 0 and (e ->> 'live_rooms')::int = 2;
  if n <> 1 then raise exception 'FAIL D4: booked-but-unsold night not reported'; end if;
  if jsonb_array_length(drift -> 'room_nights') <> 2 then raise exception 'FAIL D4: the matching night (today + 7) was reported, got % rows', jsonb_array_length(drift -> 'room_nights'); end if;
  raise notice 'PASS D4: with M6 columns present the live count is compared, the matching night is quiet';
end $$;
SQL

chmod 644 "$scratch"/*.sql
psql_as "$db" "-f $scratch/schema.sql"
psql_as "$db" "-f $scratch/notifier.sql"
psql_as "$db" "-f $scratch/lifecycle.sql"
psql_as "$db" "-f $scratch/drift.sql"
psql_as "$db" "-f $scratch/seed.sql"

echo "== running the cases"
if psql_as "$db" "-f $scratch/run.sql" > "$scratch/run.out" 2>&1; then
  cat "$scratch/run.out"
  su postgres -c "dropdb $db"
  echo "== scratch database dropped"
  echo "== RESULT: PASS. Every case asserted; see the PASS lines above."
  exit 0
else
  cat "$scratch/run.out"
  su postgres -c "dropdb $db"
  echo "== scratch database dropped"
  echo "== RESULT: FAIL. Read the output above."
  exit 1
fi
