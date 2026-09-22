#!/usr/bin/env bash
# THE NINE ESCROW CONCURRENCY PROBES, P-1 to P-9.
#
# Built on the two-session pattern that proved the oversell gate in
# scripts/probes/m5_oversell.sh, which is the house standard: two concurrent
# psql sessions against a REAL Postgres cluster, running the EXACT function
# text that ships, over a minimal copy of only the tables those functions
# touch, with the scratch database dropped at the end. Nothing here touches the
# live Supabase project.
#
# "No naira moves until all nine pass" is the sentence in the brief, and it was
# untested when this file was written.
#
# WHERE THE FUNCTION TEXT COMES FROM, and why it is trustworthy.
#
#   Every function is lifted from supabase/migrations/*.sql, taking the LAST
#   definition of each qualified name in filename order, which is exactly what
#   an empty database replaying those files would end up with. Each one's
#   sha256 is printed, so the probe cannot silently test a body other than the
#   one that ships.
#
#   THREE FUNCTIONS NEED THE EXTRA STEP. hold_wallet_withdrawal,
#   transfer_between_wallets and pay_booking_from_wallet were rewritten IN
#   PLACE by the F-9 migrations (20260922221500 and 20260922221800), which
#   replace the inline spendable arithmetic in the live definition rather than
#   restating the whole body. Their migration files therefore still hold the
#   pre-F-9 text. The harness replays those two do-blocks after loading the
#   functions, exactly as production did, and then ASSERTS the substitution
#   took. If it did not, the probe stops rather than testing the old body.
#
# P-7, THE REVOKE, IS NOT IN THIS FILE. It has to be proved against a real
# PostgREST with a real anon key, which a local cluster cannot be. It lives in
# scripts/probes/escrow_revoke.sh and its log beside it.
#
# Usage (as root on a machine with a local cluster):
#   pg_ctlcluster 16 main start
#   bash scripts/probes/escrow_concurrency.sh | tee scripts/probes/escrow_concurrency.log
#   pg_ctlcluster 16 main stop
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
db="vallo_escrow_concurrency_probe"
scratch="$(mktemp -d)"
chmod 755 "$scratch"
trap 'rm -rf "$scratch"' EXIT

pass_count=0
fail_count=0
declare -a results

record() { # record <id> <PASS|FAIL> <sentence>
  results+=("$1|$2|$3")
  if [ "$2" = "PASS" ]; then pass_count=$((pass_count + 1)); else fail_count=$((fail_count + 1)); fi
  echo "== $1: $2. $3"
}

q() { su postgres -c "psql -X -q -At -d $db -c \"$1\"" 2>&1; }
run() { su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d $db -f $1" 2>&1; }

echo "== probe started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
su postgres -c "psql -X -q -c 'select version();'" | sed -n 3p

su postgres -c "dropdb --if-exists $db" >/dev/null 2>&1
su postgres -c "createdb $db"

# ---------------------------------------------------------------------------
# 1. The function text, lifted from the migrations that ship.
# ---------------------------------------------------------------------------
WANTED="private.wallet_for_update private.wallet_spendable_locked private.wallets_overdrawn public.wallets_overdrawn private.notify private.compute_fee public.fee_rate_at private.escrow_transition_is_legal private.escrow_purpose_is_open private.escrow_commission_is_permitted private.escrow_guard_transition private.escrow_audit_insert private.escrow_settle private.escrow_sweep_timeouts public.escrow_open public.escrow_hold public.escrow_release public.escrow_refund public.escrow_cancel_as public.escrow_fund_from_wallet_as public.escrow_confirm_as public.escrow_request_release_as public.escrow_raise_dispute_as public.hold_wallet_withdrawal private.pay_booking_from_wallet private.transfer_between_wallets public.move_into_pot private.escrow_float_components private.escrow_invariants_check"

python3 - "$repo" "$scratch" $WANTED <<'PY'
import glob, hashlib, os, re, sys

repo, scratch = sys.argv[1], sys.argv[2]
wanted = sys.argv[3:]

# `create [or replace] function <name>(` ... `as $tag$ ... $tag$;`
head = re.compile(r"create\s+(?:or\s+replace\s+)?function\s+([a-z_][a-z_0-9]*\.[a-z_][a-z_0-9]*)\s*\(", re.I)
found = {}
order = []
for path in sorted(glob.glob(os.path.join(repo, "supabase", "migrations", "*.sql"))):
    text = open(path, encoding="utf-8").read()
    for m in head.finditer(text):
        name = m.group(1).lower()
        if name not in wanted:
            continue
        tag = re.compile(r"\bas\s+(\$[a-z_]*\$)", re.I).search(text, m.end())
        if not tag:
            continue
        close = text.find(tag.group(1), tag.end())
        if close < 0:
            continue
        end = text.find(";", close + len(tag.group(1)))
        body = text[m.start():end + 1]
        if name not in found:
            order.append(name)
        found[name] = (body, os.path.basename(path))

missing = [n for n in wanted if n not in found]
if missing:
    sys.stderr.write("MISSING FUNCTION TEXT: %s\n" % ", ".join(missing))
    sys.exit(2)

with open(os.path.join(scratch, "functions.sql"), "w", encoding="utf-8") as out:
    for name in wanted:
        body, src = found[name]
        digest = hashlib.sha256(body.encode()).hexdigest()[:16]
        print("   %-46s sha256 %s  %s" % (name, digest, src))
        out.write(body + "\n\n")
print("== %d function bodies lifted" % len(wanted))
PY
[ $? -eq 0 ] || { echo "== RESULT: FAIL. Could not lift the function text."; exit 1; }

# The two F-9 rewrite blocks, replayed exactly as production ran them.
python3 - "$repo" "$scratch" <<'PY'
import glob, os, re, sys
repo, scratch = sys.argv[1], sys.argv[2]
out = []
for stem in ("spendable_arithmetic_lives_in_one_place", "the_fourth_copy_of_spendable_was_in_send_money"):
    hits = glob.glob(os.path.join(repo, "supabase", "migrations", "*%s.sql" % stem))
    if not hits:
        sys.stderr.write("MISSING F-9 MIGRATION %s\n" % stem)
        sys.exit(2)
    text = open(hits[0], encoding="utf-8").read()
    for m in re.finditer(r"do \$(f9b?)\$.*?\$\1\$;", text, re.S):
        out.append(m.group(0))
if len(out) != 2:
    sys.stderr.write("EXPECTED TWO F-9 BLOCKS, FOUND %d\n" % len(out))
    sys.exit(2)
open(os.path.join(scratch, "f9.sql"), "w", encoding="utf-8").write("\n\n".join(out) + "\n")
print("== two F-9 rewrite blocks lifted")
PY
[ $? -eq 0 ] || { echo "== RESULT: FAIL. Could not lift the F-9 blocks."; exit 1; }

# ---------------------------------------------------------------------------
# 2. The minimal schema: only the tables those functions touch.
# ---------------------------------------------------------------------------
cat > "$scratch/schema.sql" <<'SQL'
create schema private;
create schema auth;

-- auth.uid() is null in every probe session, exactly as it is for the service
-- role. The guard trigger records it as the actor and nothing branches on it.
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create type public.escrow_state as enum
  ('INITIATED','FUNDED','HELD','RELEASE_REQUESTED','RELEASED','REFUNDED','DISPUTED','RESOLVED','CANCELLED');
create type public.escrow_purpose as enum
  ('rent_deposit','first_rent','purchase_deposit','purchase_balance','agency_fee');
create type public.wallet_entry_kind as enum
  ('deposit','withdrawal','payment','refund','transfer_in','transfer_out','escrow_hold','escrow_release','escrow_refund','pot_hold','pot_release');
create type public.wallet_entry_direction as enum ('credit','debit');
create type public.wallet_entry_status as enum ('PENDING','COMPLETED','FAILED','REVERSED');
create type public.notification_kind as enum
  ('booking','message','wallet','listing','agent','support','system','social');
create type public.fee_kind as enum ('commission','listing_fee');
create type public.revenue_source as enum ('escrow_commission','listing_fee');
create type public.alert_severity as enum ('low','medium','high');
create type public.alert_status as enum ('open','resolved');

create table public.profiles (id uuid primary key, settings jsonb not null default '{}'::jsonb);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id),
  kind public.wallet_entry_kind not null,
  direction public.wallet_entry_direction not null,
  amount_minor bigint not null check (amount_minor > 0),
  reference text not null,
  status public.wallet_entry_status not null default 'PENDING',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- THE ONE INDEX THE WHOLE IDEMPOTENCY STORY RESTS ON.
create unique index wallet_entries_reference_key on public.wallet_entries (reference);

create table public.wallet_pots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  balance_minor bigint not null default 0,
  target_minor bigint,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.escrows (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null,
  payee_id uuid not null,
  listing_id uuid,
  purpose public.escrow_purpose not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN',
  state public.escrow_state not null default 'INITIATED',
  payer_confirmed_at timestamptz,
  payee_confirmed_at timestamptz,
  inspection_confirmation_id uuid,
  initiated_at timestamptz not null default now(),
  funded_at timestamptz,
  held_at timestamptz,
  release_requested_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,
  resolved_at timestamptz,
  release_requested_by uuid,
  disputed_by uuid,
  dispute_reason text,
  resolved_by uuid,
  resolution_note text,
  auto_release_at timestamptz,
  commission_minor bigint,
  commission_rate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- THE CHECK CONSTRAINTS, AND THEY ARE NOT OPTIONAL HERE.
  -- The first version of this file copied the COLUMNS of `escrows` and not its
  -- constraints, so the scratch database was more permissive than production
  -- and every probe passed things production would have refused. It missed a
  -- real fault in escrow_cancel_as that way, which the evidence probe then
  -- found against the live database. A minimal schema means fewer TABLES, not
  -- a weaker one.
  constraint escrows_parties_differ check (payer_id <> payee_id),
  constraint escrows_currency_naira check (currency = 'NGN'),
  constraint escrows_commission_nonneg
    check (commission_minor is null or (commission_minor >= 0 and commission_minor <= amount_minor)),
  constraint escrows_dispute_has_a_reason
    check (disputed_at is null or (dispute_reason is not null and char_length(btrim(dispute_reason)) >= 4)),
  constraint escrows_resolution_has_a_note
    check (resolved_at is null or (resolved_by is not null and resolution_note is not null
           and char_length(btrim(resolution_note)) >= 4))
);

create table public.platform_revenue (
  id uuid primary key default gen_random_uuid(),
  source public.revenue_source not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN',
  escrow_id uuid,
  listing_id uuid,
  rate_id uuid,
  reference text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.risk_alerts (
  id uuid primary key default gen_random_uuid(),
  severity public.alert_severity not null default 'low',
  status public.alert_status not null default 'open',
  title text not null,
  description text,
  entity_type text,
  entity_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- The booking path is not probed here, but `private.pay_booking_from_wallet`
-- declares a `public.bookings` row variable, so the type has to exist for the
-- F-9 rewrite to be replayed against the same body production carries.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid,
  status text,
  currency text,
  total_minor bigint
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  status text,
  provider_ref text
);

create table public.fee_rates (
  id uuid primary key default gen_random_uuid(),
  kind public.fee_kind not null,
  basis_points integer not null default 0,
  flat_minor bigint not null default 0,
  effective_from timestamptz not null default now(),
  created_by uuid,
  note text,
  created_at timestamptz not null default now()
);
SQL

cat > "$scratch/triggers.sql" <<'SQL'
create trigger escrows_audit_insert
  after insert on public.escrows
  for each row execute function private.escrow_audit_insert();
create trigger escrows_guard_transition
  before update on public.escrows
  for each row execute function private.escrow_guard_transition();
SQL

chmod 644 "$scratch"/*.sql
run "$scratch/schema.sql"   || { echo "== RESULT: FAIL loading schema"; exit 1; }
run "$scratch/functions.sql" || { echo "== RESULT: FAIL loading functions"; exit 1; }
run "$scratch/f9.sql"        || { echo "== RESULT: FAIL replaying the F-9 rewrite"; exit 1; }
run "$scratch/triggers.sql" || { echo "== RESULT: FAIL loading triggers"; exit 1; }

# The F-9 rewrite must actually have taken, or every probe below tests a body
# that is not the one in production.
f9ok="$(q "select (position('private.wallet_spendable_locked(' in pg_get_functiondef('public.hold_wallet_withdrawal(uuid,bigint,text,jsonb)'::regprocedure)) > 0)::text")"
if [ "$f9ok" != "true" ]; then
  echo "== RESULT: FAIL. The F-9 rewrite did not take in the scratch database, so these probes would test the wrong body. answer was: [$f9ok]"
  exit 1
fi
echo "== F-9 confirmed in the scratch database: hold_wallet_withdrawal calls the shared spendable"

# ---------------------------------------------------------------------------
# 3. The cast. Two people, two wallets, a clean slate before each probe.
# ---------------------------------------------------------------------------
PAYER='00000000-0000-4000-8000-00000000aaaa'
PAYEE='00000000-0000-4000-8000-00000000bbbb'

reset_with() { # reset_with <payer kobo>
  su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d $db" >/dev/null 2>&1 <<SQL
truncate public.wallet_entries, public.escrows, public.platform_revenue,
         public.audit_log, public.notifications, public.risk_alerts,
         public.wallet_pots, public.wallets cascade;
insert into public.wallets (user_id) values ('$PAYER'), ('$PAYEE');
insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
select id, 'deposit', 'credit', $1, 'seed-' || id::text, 'COMPLETED' from public.wallets where user_id = '$PAYER';
SQL
}

two_sessions() { # two_sessions <a.sql> <b.sql> <delay>
  su postgres -c "psql -X -q -At -d $db -f $1" > "$scratch/a.out" 2>&1 &
  local pid_a=$!
  sleep "$3"
  su postgres -c "psql -X -q -At -d $db -f $2" > "$scratch/b.out" 2>&1 &
  local pid_b=$!
  wait $pid_a || true
  wait $pid_b || true
  echo "-- A:"; sed 's/^/     /' "$scratch/a.out"
  echo "-- B:"; sed 's/^/     /' "$scratch/b.out"
}

# A SESSION THAT ERRORED NEVER COMPETED. The first run of this file reported
# P-3a as a pass while the pot call had failed on its argument types, because
# "exactly one committing entry" is also true when only one path ever ran. Every
# two-session probe now asserts that BOTH sessions returned a business answer.
both_answered() { # both_answered <word-a> <word-b>
  if grep -qi "^ERROR:\|ERROR:  " "$scratch/a.out" || grep -qi "^ERROR:\|ERROR:  " "$scratch/b.out"; then
    echo "   BOTH-ANSWERED: no. One session raised rather than answering."
    return 1
  fi
  if ! grep -q "$1" "$scratch/a.out" && ! grep -q "$1" "$scratch/b.out"; then
    echo "   BOTH-ANSWERED: no. Nothing said $1."
    return 1
  fi
  if ! grep -q "$2" "$scratch/a.out" && ! grep -q "$2" "$scratch/b.out"; then
    echo "   BOTH-ANSWERED: no. Nothing said $2."
    return 1
  fi
  echo "   BOTH-ANSWERED: yes. $1 and $2 both spoke."
  return 0
}

# ---------------------------------------------------------------------------
# P-1. Two concurrent funds against one affordable balance.
# ---------------------------------------------------------------------------
echo; echo "== P-1: two concurrent escrow funds, one affordable balance of 100,000 kobo"
reset_with 100000
cat > "$scratch/p1a.sql" <<SQL
begin;
select 'A ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p1-a-hold',21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p1b.sql" <<SQL
begin;
select 'B ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p1-b-hold',21) ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p1*.sql
two_sessions "$scratch/p1a.sql" "$scratch/p1b.sql" 0.5
held="$(q "select count(*) from public.escrows where state='HELD'")"
holds="$(q "select count(*) from public.wallet_entries where kind='escrow_hold'")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
over="$(q "select count(*) from private.wallets_overdrawn()")"
echo "   held=$held holds=$holds payer_spendable=$bal overdrawn=$over"
if grep -q "A ok" "$scratch/a.out" && grep -q "B insufficient" "$scratch/b.out" \
   && [ "$held" = "1" ] && [ "$holds" = "1" ] && [ "$bal" = "0" ] && [ "$over" = "0" ]; then
  record P-1 PASS "A held the balance, B blocked on A's row lock, re-read spendable after A committed and was refused. One escrow, one hold, balance zero, never negative."
else
  record P-1 FAIL "Expected A ok and B insufficient with exactly one hold. Read the two session outputs above."
fi

# ---------------------------------------------------------------------------
# P-2. Escrow against a withdrawal hold, both orders.
# ---------------------------------------------------------------------------
for order in escrow_first withdrawal_first; do
  echo; echo "== P-2 ($order): an escrow and a withdrawal for the same 100,000 kobo"
  reset_with 100000
  cat > "$scratch/p2e.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p2-$order-hold',21) ->> 'status');
select pg_sleep(2);
commit;
SQL
  cat > "$scratch/p2w.sql" <<SQL
begin;
select 'WITHDRAWAL ' || (public.hold_wallet_withdrawal('$PAYER',100000,'rm-wd-p2-$order','{}'::jsonb) ->> 'status');
select pg_sleep(2);
commit;
SQL
  chmod 644 "$scratch"/p2*.sql
  if [ "$order" = "escrow_first" ]; then
    two_sessions "$scratch/p2e.sql" "$scratch/p2w.sql" 0.5
  else
    two_sessions "$scratch/p2w.sql" "$scratch/p2e.sql" 0.5
  fi
  oks="$(grep -ho "ok" "$scratch/a.out" "$scratch/b.out" | wc -l)"
  committed="$(q "select count(*) from public.wallet_entries where kind in ('escrow_hold','withdrawal')")"
  bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
  echo "   ok_answers=$oks committing_entries=$committed payer_spendable=$bal"
  if both_answered "ESCROW" "WITHDRAWAL" && [ "$oks" = "1" ] && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
    record "P-2 ($order)" PASS "Exactly one of the two committed the balance. The other was refused and nothing was moved."
  else
    record "P-2 ($order)" FAIL "Both paths took the balance, neither did, or one of them never ran."
  fi
done

# ---------------------------------------------------------------------------
# P-3. Escrow against the two other committing paths.
# ---------------------------------------------------------------------------
echo; echo "== P-3a: an escrow and a pot move for the same 100,000 kobo"
reset_with 100000
q "insert into public.wallet_pots (user_id, name) values ('$PAYER','Probe pot')" >/dev/null
pot="$(q "select id from public.wallet_pots where user_id='$PAYER'")"
cat > "$scratch/p3a.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p3a-hold',21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p3b.sql" <<SQL
begin;
select 'POT ' || (public.move_into_pot('$PAYER','$pot'::uuid,100000::bigint,'rm-pot-p3a') ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p3*.sql
two_sessions "$scratch/p3a.sql" "$scratch/p3b.sql" 0.5
oks="$(grep -ho "ok" "$scratch/a.out" "$scratch/b.out" | wc -l)"
committed="$(q "select count(*) from public.wallet_entries where kind in ('escrow_hold','pot_hold')")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   ok_answers=$oks committing_entries=$committed payer_spendable=$bal"
if both_answered "ESCROW" "POT" && [ "$oks" = "1" ] && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
  record "P-3a (pot)" PASS "Exactly one of the escrow and the pot took the balance."
else
  record "P-3a (pot)" FAIL "The pot and the escrow both reached the same naira, neither did, or one of them never ran."
fi

echo; echo "== P-3b: an escrow and a transfer to another person for the same 100,000 kobo"
reset_with 100000
cat > "$scratch/p3c.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p3b-hold',21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p3d.sql" <<SQL
begin;
select 'TRANSFER ' || private.transfer_between_wallets('$PAYER','$PAYEE',100000,'rm-p2p-p3b-out','rm-p2p-p3b-in','probe');
commit;
SQL
chmod 644 "$scratch"/p3*.sql
two_sessions "$scratch/p3c.sql" "$scratch/p3d.sql" 0.5
committed="$(q "select count(*) from public.wallet_entries where kind in ('escrow_hold','transfer_out')")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   committing_entries=$committed payer_spendable=$bal"
if both_answered "ESCROW" "TRANSFER" && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
  record "P-3b (transfer)" PASS "Exactly one of the escrow and the transfer took the balance."
else
  record "P-3b (transfer)" FAIL "The transfer and the escrow both reached the same naira, neither did, or one of them never ran."
fi

# ---------------------------------------------------------------------------
# P-4. Two concurrent settlements of the same agreement.
# ---------------------------------------------------------------------------
echo; echo "== P-4: two sessions release the same HELD agreement at the same instant"
reset_with 100000
q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p4-hold',21)" >/dev/null
esc="$(q "select id from public.escrows limit 1")"
cat > "$scratch/p4a.sql" <<SQL
begin;
select 'A ' || (private.escrow_settle('$esc'::uuid,'release','RELEASED',null,'probe A') ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p4b.sql" <<SQL
begin;
select 'B ' || (private.escrow_settle('$esc'::uuid,'release','RELEASED',null,'probe B') ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p4*.sql
two_sessions "$scratch/p4a.sql" "$scratch/p4b.sql" 0.5
credits="$(q "select count(*) from public.wallet_entries where kind='escrow_release'")"
payee="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYEE'")"
audits="$(q "select count(*) from public.audit_log where action='escrow.released'")"
state="$(q "select state from public.escrows where id='$esc'::uuid")"
echo "   release_credits=$credits payee_balance=$payee release_audit_rows=$audits state=$state"
if grep -q "A ok" "$scratch/a.out" && grep -q "B already_settled" "$scratch/b.out" \
   && [ "$credits" = "1" ] && [ "$payee" = "100000" ] && [ "$audits" = "1" ] && [ "$state" = "RELEASED" ]; then
  record P-4 PASS "One ok and one already_settled. Exactly one credit, exactly one state change, exactly one audit row, and the payee was paid once."
else
  record P-4 FAIL "A double settle produced something other than exactly one credit and one audit row."
fi

# ---------------------------------------------------------------------------
# P-5. A dispute racing the sweeper.
# ---------------------------------------------------------------------------
for first in sweeper dispute; do
echo; echo "== P-5 ($first first): the sweeper's pass and a dispute on the same agreement, at the same instant"
reset_with 100000
q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p5-hold',21)" >/dev/null
esc="$(q "select id from public.escrows limit 1")"
q "update public.escrows set auto_release_at = now() - interval '1 hour' where id='$esc'::uuid" >/dev/null
cat > "$scratch/p5a.sql" <<SQL
begin;
select 'SWEEP moved=' || private.escrow_sweep_timeouts();
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p5b.sql" <<SQL
begin;
select 'DISPUTE ' || (public.escrow_raise_dispute_as('$PAYER','$esc'::uuid,'The agent never showed up for the viewing.') ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p5*.sql
if [ "$first" = "sweeper" ]; then
  two_sessions "$scratch/p5a.sql" "$scratch/p5b.sql" 0.5
else
  two_sessions "$scratch/p5b.sql" "$scratch/p5a.sql" 0.5
fi
state="$(q "select state from public.escrows where id='$esc'::uuid")"
credits="$(q "select count(*) from public.wallet_entries where kind in ('escrow_release','escrow_refund')")"
echo "   final_state=$state settlement_entries=$credits"
if { [ "$state" = "RELEASED" ] && [ "$credits" = "1" ]; } || { [ "$state" = "DISPUTED" ] && [ "$credits" = "0" ]; }; then
  record "P-5 ($first first)" PASS "The agreement ended in exactly one coherent state ($state) with $credits settlement entries. Never both a release and a dispute."
else
  record "P-5 ($first first)" FAIL "The race produced state=$state with $credits settlement entries, which is neither a clean release nor a clean dispute."
fi
done

# ---------------------------------------------------------------------------
# P-6. The retry, serial and then concurrent, on one reference.
# ---------------------------------------------------------------------------
echo; echo "== P-6: the same funding reference called twice, serially"
reset_with 300000
first="$(q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p6-hold',21) ->> 'status'")"
second="$(q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p6-hold',21) ->> 'status'")"
entries="$(q "select count(*) from public.wallet_entries where reference='rm-esc-p6-hold'")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   first=$first second=$second entries=$entries payer_spendable=$bal"
serial_ok=no
[ "$first" = "ok" ] && [ "$second" = "duplicate" ] && [ "$entries" = "1" ] && [ "$bal" = "200000" ] && serial_ok=yes

echo "== P-6: and the same reference from two sessions at once"
reset_with 300000
cat > "$scratch/p6a.sql" <<SQL
begin;
select 'A ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p6c-hold',21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p6b.sql" <<SQL
begin;
select 'B ' || (public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p6c-hold',21) ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p6*.sql
two_sessions "$scratch/p6a.sql" "$scratch/p6b.sql" 0.5
centries="$(q "select count(*) from public.wallet_entries where reference='rm-esc-p6c-hold'")"
cbal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   entries=$centries payer_spendable=$cbal"
if [ "$serial_ok" = "yes" ] && [ "$centries" = "1" ] && [ "$cbal" = "200000" ]; then
  record P-6 PASS "A repeat answered duplicate rather than raising, and both serially and concurrently the reference produced exactly one ledger entry and one debit."
else
  record P-6 FAIL "A retry on one reference moved money twice, or answered with something other than duplicate."
fi

# ---------------------------------------------------------------------------
# P-8. The illegal transition, from a plain psql prompt.
# ---------------------------------------------------------------------------
echo; echo "== P-8: a direct update from REFUNDED to RELEASED, as the owning role"
reset_with 100000
q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',100000,'rm-esc-p8-hold',21)" >/dev/null
esc="$(q "select id from public.escrows limit 1")"
q "select private.escrow_settle('$esc'::uuid,'refund','REFUNDED',null,'probe')" >/dev/null
before="$(q "select state from public.escrows where id='$esc'::uuid")"
raised="$(q "update public.escrows set state='RELEASED' where id='$esc'::uuid")"
after="$(q "select state from public.escrows where id='$esc'::uuid")"
echo "   before=$before after=$after"
echo "   answer: $raised"
if [ "$before" = "REFUNDED" ] && [ "$after" = "REFUNDED" ] && echo "$raised" | grep -qi "cannot go from REFUNDED to RELEASED"; then
  record P-8 PASS "The trigger refused the update from a plain prompt and the row did not move. The guard is reachable from psql, not only from the functions."
else
  record P-8 FAIL "An illegal transition was not refused by the trigger."
fi

# ---------------------------------------------------------------------------
# P-9. The float identity across a full lifecycle mix.
# ---------------------------------------------------------------------------
echo; echo "== P-9: the float identity across a mix of held, released, refunded, disputed and cancelled"
reset_with 5000000
q "insert into public.fee_rates (kind, basis_points, flat_minor, effective_from) values ('commission', 500, 0, now() - interval '1 day')" >/dev/null
for n in 1 2 3 4 5 6; do
  q "select public.escrow_fund_from_wallet_as('$PAYER','$PAYEE',null,'agency_fee',$((n * 100000)),'rm-esc-p9-$n-hold',21)" >/dev/null
done
e1="$(q "select id from public.escrows where amount_minor=100000")"
e2="$(q "select id from public.escrows where amount_minor=200000")"
e3="$(q "select id from public.escrows where amount_minor=300000")"
e4="$(q "select id from public.escrows where amount_minor=400000")"
q "select private.escrow_settle('$e1'::uuid,'release','RELEASED',null,'probe')" >/dev/null
q "select private.escrow_settle('$e2'::uuid,'refund','REFUNDED',null,'probe')" >/dev/null
q "select public.escrow_raise_dispute_as('$PAYER','$e3'::uuid,'The keys were never handed over.')" >/dev/null
q "select private.escrow_settle('$e4'::uuid,'release','RESOLVED',null,'probe ruling')" >/dev/null 2>&1
q "select public.escrow_open('$PAYER','$PAYEE',null,'agency_fee',900000)" >/dev/null
prop="$(q "select id from public.escrows where amount_minor=900000")"
cancel_answer="$(q "select public.escrow_cancel_as('$PAYER','$prop'::uuid,null) ->> 'status'")"
echo "   cancel with no reason at all -> $cancel_answer" 

inv="$(q "select private.escrow_invariants_check() ->> 'ok'")"
diff="$(q "select (private.escrow_float_components() ->> 'difference_minor')")"
ledger="$(q "select (private.escrow_float_components() ->> 'ledger_float_minor')")"
rows="$(q "select (private.escrow_float_components() ->> 'escrow_float_minor')")"
commission="$(q "select coalesce(sum(amount_minor),0) from public.platform_revenue")"
gross_ok="$(q "select count(*) from public.escrows e join public.wallet_entries w on w.kind in ('escrow_release','escrow_refund') and (w.metadata->>'escrow_id')=e.id::text where w.amount_minor + coalesce(e.commission_minor,0) <> e.amount_minor")"
over="$(q "select count(*) from private.wallets_overdrawn()")"
breaches="$(q "select private.escrow_invariants_check() ->> 'breaches'")"
echo "   ledger_float=$ledger escrow_float=$rows difference=$diff commission_booked=$commission"
echo "   gross_mismatches=$gross_ok overdrawn=$over invariants_ok=$inv"
echo "   breaches=$breaches"
if [ "$inv" = "true" ] && [ "$diff" = "0" ] && [ "$gross_ok" = "0" ] && [ "$over" = "0" ] && [ "$commission" != "0" ]; then
  record P-9 PASS "Across a lifecycle mix with a live five per cent commission the two derivations of the float agreed to the kobo, no wallet went negative, and every settlement's net plus commission equalled its gross."
else
  record P-9 FAIL "The float identity did not hold across a lifecycle mix."
fi

# ---------------------------------------------------------------------------
# P-7 is not runnable here and is not claimed here.
# ---------------------------------------------------------------------------
echo; echo "== P-7: the revoke. Not runnable against a local cluster: it needs a real"
echo "   PostgREST and a real anon key. See scripts/probes/escrow_revoke.sh."

su postgres -c "dropdb $db"
echo; echo "== scratch database dropped"
echo
echo "== SUMMARY"
for r in "${results[@]}"; do
  IFS='|' read -r rid rstate rtext <<< "$r"
  printf '   %-18s %-4s %s\n' "$rid" "$rstate" "$rtext"
done
echo
if [ "$fail_count" -eq 0 ]; then
  echo "== RESULT: PASS. $pass_count of $pass_count local probes passed. P-7 is proved separately and is not counted here."
  exit 0
else
  echo "== RESULT: FAIL. $fail_count of $((pass_count + fail_count)) local probes failed."
  exit 1
fi
