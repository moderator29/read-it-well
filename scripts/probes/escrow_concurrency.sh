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
# WHICH DOOR THESE PROBES FUND THROUGH, AND WHY IT CHANGED ON 23 SEPTEMBER.
#
#   P-1 to P-6, P-8 and P-9 used to fund through
#   `public.escrow_fund_from_wallet_as`, which opened an agreement and funded
#   it in one call. Migration 20260923101038 REVOKED `execute` on that verb
#   from every role including `service_role`, so no server action can reach it
#   any more. A green probe over a revoked door is evidence about shared
#   locking machinery and NOT about the door a real payer walks through.
#
#   Every funding call below now goes through the pair the product uses:
#   `public.escrow_propose_as` opens a row in INITIATED with nothing moved,
#   and `public.escrow_fund_proposal_as` takes the money. That pair carries
#   three gates the retired verb never had, and they are now inside every
#   probe rather than beside them: the thread membership test, the one open
#   agreement per thread rule, and a funding reference DERIVED from the row
#   instead of chosen by the caller.
#
#   ONE CONSEQUENCE IS STRUCTURAL AND IS WORTH READING BEFORE THE PROBES.
#   `conversations` is unique on (guest_id, agent_id, listing_id) and the
#   proposal door refuses a second live agreement in the same thread, so TWO
#   simultaneously fundable proposals between the same two people require TWO
#   different properties. P-1 races two funding calls against one balance, so
#   P-1 needs two listings and two threads. That is a fact about the live door
#   which the single-call verb could not express, and the cast below carries
#   eight of each because of it.
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
WANTED="private.wallet_for_update private.wallet_spendable_locked private.wallets_overdrawn public.wallets_overdrawn private.notify private.compute_fee public.fee_rate_at private.escrow_transition_is_legal private.escrow_purpose_is_open private.escrow_commission_is_permitted private.escrow_guard_transition private.escrow_audit_insert private.escrow_settle private.escrow_sweep_timeouts public.escrow_open public.escrow_hold public.escrow_release public.escrow_refund public.escrow_cancel_as public.escrow_fund_from_wallet_as public.escrow_propose_as public.escrow_fund_proposal_as public.refuse_transaction_on_demo_listing public.escrow_confirm_as public.escrow_request_release_as public.escrow_raise_dispute_as public.hold_wallet_withdrawal private.pay_booking_from_wallet private.transfer_between_wallets public.move_into_pot private.escrow_float_components private.escrow_invariants_check"

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

# THE BRAND REWRITE, WHICH IS A THIRD KIND OF MIGRATION THE LIFT CANNOT SEE.
#
# Six migrations rewrite function bodies through `pg_get_functiondef` and
# `execute` rather than through `create or replace`. This harness replayed two
# of them, the F-9 pair, and the catalogue guard below found the consequence
# on its first run: `private.pay_booking_from_wallet` still said RentMe in the
# scratch cluster and says Vallo in production, because 20260922130000
# rewrote it and nothing here replayed that.
#
# Only the edits naming a function this harness holds are replayed, because
# the block in production also rewrites a dozen functions a minimal schema
# deliberately does not have. AND AN EDIT WHOSE SEARCH STRING IS ALREADY GONE
# IS SKIPPED RATHER THAN RAISED ON, which is where this departs from the
# migration deliberately: production ran the rewrite at a point in a timeline,
# and `private.escrow_settle` and `public.escrow_hold` were re-created with
# the new wording by a LATER migration whose text is what the lift takes. The
# harness rebuilds the end state, not the history, and the catalogue guard
# below is what checks that the end state is right.
python3 - "$repo" "$scratch" $WANTED <<'PY'
import glob, os, re, sys
repo, scratch = sys.argv[1], sys.argv[2]
wanted = set(sys.argv[3:])
hits = glob.glob(os.path.join(repo, "supabase", "migrations", "*the_engine_stops_saying_rentme.sql"))
if not hits:
    sys.stderr.write("MISSING THE BRAND REWRITE MIGRATION\n")
    sys.exit(2)
text = open(hits[0], encoding="utf-8").read()
edit = re.compile(r"array\[\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\]", re.S)
kept = []
for m in edit.finditer(text):
    sig, search, replace = m.group(1), m.group(2), m.group(3)
    name = sig.split("(")[0].strip().lower()
    if name in wanted:
        kept.append((sig, search, replace))
if not kept:
    sys.stderr.write("THE BRAND REWRITE NAMES NO FUNCTION THIS HARNESS HOLDS, WHICH IS NOT EXPECTED\n")
    sys.exit(2)
out = ["do $brand$", "declare v_def text; v_new text;", "begin"]
for sig, search, replace in kept:
    q = sig.replace("'", "''")
    # to_regprocedure, NOT the cast. The block names one signature that no
    # longer exists anywhere, public.escrow_hold with five arguments, because
    # it was rewritten with six later. A cast raises on that; this skips it
    # and says so.
    out.append("  if to_regprocedure('%s') is null then" % q)
    out.append("    raise notice 'BRAND: %s is not in this scratch schema, skipped';" % q.replace("%", "%%"))
    out.append("    v_def := null;")
    out.append("  else")
    out.append("    v_def := pg_get_functiondef(to_regprocedure('%s'));" % q)
    out.append("  end if;")
    out.append("  if v_def is not null and position('%s' in v_def) > 0 then" % search)
    out.append("    v_new := replace(v_def, '%s', '%s');" % (search, replace))
    out.append("    execute v_new;")
    out.append("    raise notice 'BRAND: %s rewritten';" % sig.replace("'", "''").replace("%", "%%"))
    out.append("  elsif v_def is not null then")
    out.append("    raise notice 'BRAND: %s already carries the later wording, skipped';" % q.replace("%", "%%"))
    out.append("  end if;")
out += ["end", "$brand$;"]
open(os.path.join(scratch, "brand.sql"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("== %d brand rewrite edit(s) lifted for functions this harness holds" % len(kept))
PY
[ $? -eq 0 ] || { echo "== RESULT: FAIL. Could not lift the brand rewrite."; exit 1; }

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

-- THE THREAD AND THE PROPERTY, because the door the product funds through
-- reads both. `escrow_propose_as` takes a conversation, checks that the two
-- named people ARE that thread's two people, asks whether the thread's listing
-- is an example, and copies the LISTING OFF THE THREAD rather than off the
-- caller. None of that could be exercised by the retired one-call verb.
--
-- THE UNIQUE KEY IS PRODUCTION'S, not a convenience. `conversations` is unique
-- on (guest_id, agent_id, listing_id) on the live database, read from
-- pg_constraint on 23 September. It is here because it is the reason two
-- fundable proposals between one pair of people need two properties, which is
-- what P-1 races.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  is_demo boolean not null default false
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  agent_id uuid not null,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint conversations_guest_id_agent_id_listing_id_key unique (guest_id, agent_id, listing_id)
);

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
-- F-4's guard, which the proposal door now feeds a real listing_id into. The
-- retired verb was called with a null listing in every probe, so this trigger
-- returned on its first line every time and was never actually exercised here.
create trigger escrows_never_against_a_demo_listing
  before insert on public.escrows
  for each row execute function public.refuse_transaction_on_demo_listing();
SQL

# ---------------------------------------------------------------------------
# 2b. THE COLUMNS THE MIGRATIONS ADDED AFTER THE MINIMAL TABLE WAS WRITTEN.
#
# WHY THIS EXISTS. The `escrows` table above is a HAND-WRITTEN copy, and on
# 23 September migration 20260923093233 added `escrows.opened_by` and made
# `escrow_fund_from_wallet_as` write it. The harness lifts the CURRENT function
# text out of the migrations but was still building yesterday's table, so every
# probe that funds an escrow died on one insert and TEN OF ELEVEN FAILED. It
# had been red for hours with nothing saying so.
#
# Hand-copying the two columns would fix today and leave tomorrow exactly as
# fragile, so the alters are LIFTED, the same way the function bodies are. The
# `references` clause is stripped because the scratch database deliberately has
# no `auth.users` and no `conversations`: the point of a minimal schema is
# fewer TABLES, and a foreign key to a table that is not here is not a
# constraint this harness can honour.
#
# A LOUD WARNING, NOT A SILENT DROP. An added column carrying `not null` or a
# `default` is one where dropping the rest of the line changes behaviour, so it
# is named on the way past rather than swallowed.
# ---------------------------------------------------------------------------
: > "$scratch/escrow_columns.sql"
added=0
while IFS='|' read -r name rest; do
  [ -n "$name" ] || continue
  type_word="$(echo "$rest" | awk '{print $1}')"
  echo "alter table public.escrows add column if not exists $name $type_word;" \
    >> "$scratch/escrow_columns.sql"
  added=$((added + 1))
  echo "   escrows.$name $type_word  (lifted from a migration)"
  case "$rest" in
    *"not null"*|*default*)
      echo "   WARNING: escrows.$name declares not null or a default and this harness kept neither." ;;
  esac
done <<EXTRACT
$(awk '
  /^alter table public\.escrows/ { inalter = 1; next }
  inalter && /add column if not exists/ {
    line = $0
    sub(/.*add column if not exists[ \t]+/, "", line)
    sub(/;[ \t]*$/, "", line)
    sub(/[ \t]+references[ \t].*$/, "", line)
    split(line, parts, /[ \t]+/)
    rest = line
    sub(/^[^ \t]+[ \t]+/, "", rest)
    print parts[1] "|" rest
  }
  inalter && /;[ \t]*$/ { inalter = 0 }
' "$repo"/supabase/migrations/*.sql | sort -u)
EXTRACT
echo "== $added column addition(s) to public.escrows lifted from the migrations"

chmod 644 "$scratch"/*.sql
run "$scratch/schema.sql"   || { echo "== RESULT: FAIL loading schema"; exit 1; }
run "$scratch/escrow_columns.sql" || { echo "== RESULT: FAIL replaying the escrows column additions"; exit 1; }
run "$scratch/functions.sql" || { echo "== RESULT: FAIL loading functions"; exit 1; }
run "$scratch/brand.sql"     || { echo "== RESULT: FAIL replaying the brand rewrite"; exit 1; }
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
# 2c. THE CATALOGUE GUARD. WHAT WAS LIFTED, AGAINST WHAT THE LIVE PROJECT HOLDS.
#
# THE HOLE THIS CLOSES, IN ONE SENTENCE. The lift scans the migrations for
# `create or replace function` and keeps the last definition of each name. A
# `drop function` is neither a create nor a replace, so a verb dropped in
# production goes on passing here, in full colour, against a body that no
# longer exists anywhere. The same hole swallows a signature changed, a body
# edited straight against the database, and a migration written but never
# applied.
#
# WHY IT IS A CHECKED-IN FILE AND NOT A QUERY. This machine has no route to
# the project: `uccixoonmbhrnyczyigt.supabase.co` is refused by the egress
# proxy, which is the same wall P-7's HTTP half is behind. So the live
# catalogue is recorded in scripts/probes/escrow_live_catalogue.tsv by a
# worker who can read it, with the date and the live migration head it was
# taken at, and the harness compares against that. A file is weaker than a
# live query and is not pretended otherwise: what it cannot catch is a change
# made to the live database AFTER the file was taken and before this run. The
# staleness test below is what narrows that window.
#
# WHAT IS COMPARED: existence, the identity arguments, the sha256 of prosrc,
# and SECURITY DEFINER. What is NOT compared is privilege, because the scratch
# cluster has no anon, no authenticated and no service_role, and the harness
# lifts bodies rather than grants. P-7 is the probe that proves the EXECUTE
# layer.
# ---------------------------------------------------------------------------
manifest="$repo/scripts/probes/escrow_live_catalogue.tsv"
wanted_sql="$(for w in $WANTED; do printf "'%s'," "$w"; done | sed 's/,$//')"
# THE NORMALISATION IS WRITTEN ONCE AND IS THE SAME EXPRESSION THAT PRODUCED
# THE MANIFEST. Two different spellings of "strip the comments" would compare
# two different things and agree by luck.
cat > "$scratch/catalogue.sql" <<SQL
select n.nspname || '.' || p.proname || chr(9)
    || pg_get_function_identity_arguments(p.oid) || chr(9)
    || encode(sha256(p.prosrc::bytea), 'hex') || chr(9)
    || encode(sha256(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         p.prosrc, '/\*.*?\*/', '', 'gs'), '--[^\n]*', '', 'g'),
         '[ \t]+(\n)', '\1', 'g'), '\n+', chr(10), 'g'))::bytea), 'hex') || chr(9)
    || case when p.prosecdef then 't' else 'f' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname || '.' || p.proname in ($wanted_sql)
 order by 1;
SQL
chmod 644 "$scratch/catalogue.sql"
su postgres -c "psql -X -q -At -d $db -f $scratch/catalogue.sql" > "$scratch/scratch_catalogue.tsv" 2>&1

echo
echo "== CATALOGUE GUARD: what was lifted, against what the live project holds"
python3 - "$repo" "$manifest" "$scratch/scratch_catalogue.tsv" $WANTED <<'PY'
import glob, os, re, sys

repo, manifest_path, scratch_path = sys.argv[1], sys.argv[2], sys.argv[3]
wanted = set(sys.argv[4:])

if not os.path.exists(manifest_path):
    print("   THE MANIFEST IS MISSING: %s" % manifest_path)
    print("   Without it nothing here knows what the live project holds.")
    sys.exit(2)

meta, live = {}, {}
for raw in open(manifest_path, encoding="utf-8"):
    line = raw.rstrip("\n")
    if line.startswith("#"):
        bits = line[1:].strip().split("\t")
        if len(bits) == 2:
            meta[bits[0].strip()] = bits[1].strip()
        continue
    if not line.strip():
        continue
    name, args, sha, code, secdef, acl = line.split("\t")
    live[(name, args)] = (sha, code, secdef, acl)

print("   manifest: project=%s taken_at=%s live_migration_head=%s functions=%s"
      % (meta.get("project", "?"), meta.get("taken_at", "?"),
         meta.get("live_migration_head", "?"), len(live)))

scratch = {}
for raw in open(scratch_path, encoding="utf-8"):
    line = raw.rstrip("\n")
    if not line.strip():
        continue
    if line.count("\t") != 4:
        print("   THE SCRATCH CATALOGUE QUERY DID NOT ANSWER CLEANLY: %s" % line)
        sys.exit(2)
    name, args, sha, code, secdef = line.split("\t")
    scratch[(name, args)] = (sha, code, secdef)

problems = []
comment_only = []

# 1. A `drop function` in the migrations, which the lift is blind to by
#    construction. Checked on its own so that it fires even with a stale file.
drop_re = re.compile(r"drop\s+function\s+(?:if\s+exists\s+)?([a-z_][a-z_0-9]*\.[a-z_][a-z_0-9]*)", re.I)
create_re = re.compile(r"create\s+(?:or\s+replace\s+)?function\s+([a-z_][a-z_0-9]*\.[a-z_][a-z_0-9]*)", re.I)
last_create, last_drop = {}, {}
for path in sorted(glob.glob(os.path.join(repo, "supabase", "migrations", "*.sql"))):
    base = os.path.basename(path)
    text = open(path, encoding="utf-8").read()
    for m in create_re.finditer(text):
        if m.group(1).lower() in wanted:
            last_create[m.group(1).lower()] = base
    for m in drop_re.finditer(text):
        if m.group(1).lower() in wanted:
            last_drop[m.group(1).lower()] = base
for name, base in sorted(last_drop.items()):
    if base > last_create.get(name, ""):
        problems.append("DROPPED AFTER ITS LAST DEFINITION: %s, in %s. The lift cannot see a drop, "
                        "so this probe would have gone on testing a body that is gone." % (name, base))
if last_drop:
    print("   drop statements seen for a probed function: %d" % len(last_drop))
else:
    print("   drop statements seen for a probed function: none")

# 2. Staleness. A migration in this tree that DEFINES or DROPS a probed
#    function and is newer than the live head means the manifest describes a
#    database that has not seen the text this run just lifted.
head = meta.get("live_migration_head", "")
newer = sorted({base[:14] for base in list(last_create.values()) + list(last_drop.values())
                if base[:14] > head})
if newer:
    problems.append("THE MANIFEST IS STALE. These migrations define or drop a probed function and are "
                    "newer than the live head %s: %s. Either they are not applied to the project, or "
                    "the manifest was not refreshed after they were." % (head, ", ".join(newer)))
else:
    print("   no migration defining a probed function is newer than the live head")

# 3. The catalogues, row by row.
for key in sorted(set(live) | set(scratch)):
    name, args = key
    if key not in scratch:
        same_name = [k for k in scratch if k[0] == name]
        if same_name:
            problems.append("SIGNATURE DISAGREES for %s: live has (%s), this run lifted (%s)."
                            % (name, args, same_name[0][1]))
        else:
            problems.append("LIVE HAS %s(%s) AND THIS RUN DID NOT LIFT IT AT ALL." % (name, args))
        continue
    if key not in live:
        problems.append("THIS RUN LIFTED %s(%s) AND THE LIVE PROJECT DOES NOT HAVE IT. A dropped or "
                        "renamed function is exactly this shape." % (name, args))
        continue
    lsha, lcode, lsec, _ = live[key]
    ssha, scode, ssec = scratch[key]
    if lcode != scode:
        problems.append("CODE DISAGREES for %s(%s): live %s, lifted %s. This is a difference in "
                        "what the database DOES, not in how it is written."
                        % (name, args, lcode[:16], scode[:16]))
    elif lsha != ssha:
        comment_only.append("%s(%s): live %s, lifted %s" % (name, args, lsha[:16], ssha[:16]))
    if lsec != ssec:
        problems.append("SECURITY DEFINER DISAGREES for %s(%s): live=%s, lifted=%s."
                        % (name, args, lsec, ssec))

if comment_only:
    print("   WARNING, AND IT IS NOT A PASS AND NOT A FAILURE. %d function(s) run the same code"
          % len(comment_only))
    print("   live as this run lifted, but the live copy is not the same TEXT. In every case so")
    print("   far the live copy is the migration's code with its comments stripped out, by")
    print("   something nobody has identified. Ledger section 63 carries it as unexplained.")
    for line in comment_only:
        print("     ~ %s" % line)

if problems:
    print("   %d DISAGREEMENT(S):" % len(problems))
    for line in problems:
        print("     - %s" % line)
    sys.exit(2)

print("   %d functions compared. Every SIGNATURE, every SECURITY DEFINER flag and every body's"
      % len(live))
print("   CODE agrees with the live catalogue as recorded at %s." % meta.get("taken_at", "?"))
PY
if [ $? -ne 0 ]; then
  echo "== RESULT: FAIL, AND NO PROBE WAS RUN."
  echo "   WHAT THIS RUN LIFTED OUT OF THE MIGRATIONS IS NOT WHAT THE LIVE PROJECT HOLDS."
  echo "   Every verdict below this line would have been about a body that is not shipping,"
  echo "   which is worse than no verdict, so none were taken. Refresh"
  echo "   scripts/probes/escrow_live_catalogue.tsv from the live catalogue, or fix the"
  echo "   divergence it found, and run again."
  su postgres -c "dropdb --if-exists $db" >/dev/null 2>&1
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. The cast. Two people, two wallets, a clean slate before each probe.
# ---------------------------------------------------------------------------
PAYER='00000000-0000-4000-8000-00000000aaaa'
PAYEE='00000000-0000-4000-8000-00000000bbbb'

# EIGHT PROPERTIES AND EIGHT THREADS, one thread per property, both people in
# every thread. Eight because P-9 opens seven agreements between the same two
# people and the live door will not put two of them in one thread.
CONVOS=(); LISTINGS=()
for slot in 1 2 3 4 5 6 7 8; do
  CONVOS+=("00000000-0000-4000-8000-0000000000c$slot")
  LISTINGS+=("00000000-0000-4000-8000-0000000000d$slot")
done
seed_listings=""; seed_convos=""
for i in 0 1 2 3 4 5 6 7; do
  seed_listings="$seed_listings${seed_listings:+,}('${LISTINGS[$i]}', false)"
  seed_convos="$seed_convos${seed_convos:+,}('${CONVOS[$i]}','$PAYER','$PAYEE','${LISTINGS[$i]}')"
done
SEED_THREADS="insert into public.listings (id, is_demo) values $seed_listings;
insert into public.conversations (id, guest_id, agent_id, listing_id) values $seed_convos;"

reset_with() { # reset_with <payer kobo>
  su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d $db" >/dev/null 2>&1 <<SQL
truncate public.wallet_entries, public.escrows, public.platform_revenue,
         public.audit_log, public.notifications, public.risk_alerts,
         public.wallet_pots, public.conversations, public.listings,
         public.wallets cascade;
insert into public.wallets (user_id) values ('$PAYER'), ('$PAYEE');
insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
select id, 'deposit', 'credit', $1, 'seed-' || id::text, 'COMPLETED' from public.wallets where user_id = '$PAYER';
$SEED_THREADS
SQL
}

# THE OPENING HALF OF THE LIVE DOOR. Every agreement below is born here, in
# INITIATED, with NOT ONE KOBO MOVED, exactly as the thread composer opens it.
# It echoes the new agreement's id, or a word beginning PROPOSAL-REFUSED, which
# require_escrow turns into a stopped probe rather than a silent one.
propose_id() { # propose_id <slot 0..7> <amount kobo>
  local out
  out="$(q "select (j ->> 'status') || '~' || coalesce(j ->> 'escrow_id','') from (select public.escrow_propose_as('$PAYER','${CONVOS[$1]}'::uuid,'$PAYEE','agency_fee',$2,true) as j) t")"
  case "$out" in
    ok~*) printf '%s' "${out#ok~}" ;;
    *)    printf 'PROPOSAL-REFUSED:%s' "$out" ;;
  esac
}

# A PROBE THAT COULD NOT OPEN ITS AGREEMENT HAS NOT TESTED ANYTHING. This is
# the same lesson as the smoke check, one probe down: if the proposal never
# opened, the funding call below it answers `not_found` and several of these
# probes would read that as the refusal they were hoping for.
require_escrow() { # require_escrow <value> <where>
  case "$1" in
    ????????-????-????-????-????????????) return 0 ;;
    *) echo "   THE PROPOSAL DID NOT OPEN at $2, so nothing below it is evidence: [$1]"; return 1 ;;
  esac
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
# 4. THE SMOKE CHECK. CAN THIS HARNESS OPEN AN ESCROW AT ALL?
#
# WHY IT IS HERE, IN ONE CASE. On 23 September the scratch `escrows` table was
# a column behind production and every funding call raised. Ten of eleven
# probes correctly read FAIL. **P-2 (withdrawal first) read PASS.** Its
# assertion is that exactly one of the withdrawal and the escrow commits the
# balance, that both sessions speak rather than raise, and that the payer ends
# at zero. The withdrawal went first and took the balance, so the escrow leg
# was refused `insufficient` by the spendable check BEFORE it reached the
# statement that was broken. Every condition was met. `insufficient` is the
# expected word whether the door behind it is sound or cannot insert a row.
#
# So a suite of eleven probes reported a pass over a door that could not open
# an agreement. This is the guard against that: ONE funding call, on its own,
# with nothing racing it, before any probe runs. If it does not answer `ok`
# the run STOPS and says the harness is at fault rather than the product,
# because eleven red lights and one false green are worse than no run at all.
# ---------------------------------------------------------------------------
echo; echo "== SMOKE: one uncontested proposal and one uncontested funding call, before any probe runs"
reset_with 100000
smoke_esc="$(propose_id 0 50000)"
smoke_initiated="$(q "select count(*) from public.escrows where state='INITIATED'")"
smoke_early="$(q "select count(*) from public.wallet_entries where kind='escrow_hold'")"
echo "   proposal=[$smoke_esc] initiated=$smoke_initiated holds_before_funding=$smoke_early"
if ! require_escrow "$smoke_esc" "the smoke check" || [ "$smoke_initiated" != "1" ] || [ "$smoke_early" != "0" ]; then
  echo "== RESULT: FAIL BEFORE ANY PROBE RAN. THE HARNESS IS THE FIRST SUSPECT."
  echo "   The proposal door did not open exactly one INITIATED agreement with nothing moved."
  echo "   Usually that is the scratch schema being behind a migration. IT CAN ALSO BE"
  echo "   THE PRODUCT: a shipped fault in the opening door reaches this line the same"
  echo "   way. Read the answer above before deciding which, and do not record either"
  echo "   as a verdict about the other."
  exit 1
fi
smoke="$(q "select public.escrow_fund_proposal_as('$PAYER','$smoke_esc'::uuid,21) ->> 'status'")"
smoke_held="$(q "select count(*) from public.escrows where state='HELD'")"
smoke_entries="$(q "select count(*) from public.wallet_entries where kind='escrow_hold'")"
echo "   answer=[$smoke] held=$smoke_held holds=$smoke_entries"
if [ "$smoke" != "ok" ] || [ "$smoke_held" != "1" ] || [ "$smoke_entries" != "1" ]; then
  echo "== RESULT: FAIL BEFORE ANY PROBE RAN. THE HARNESS IS THE FIRST SUSPECT."
  echo "   An uncontested funding call did not produce one HELD agreement and one hold."
  echo "   Nothing below this line would have been evidence about locking, ordering"
  echo "   or the float, so nothing below this line was run. The usual cause is the"
  echo "   scratch schema being behind a migration. IT CAN ALSO BE THE PRODUCT: a"
  echo "   transition table or a door that refuses what it should permit stops the"
  echo "   funding call here too, and that is a real defect rather than a harness"
  echo "   fault. Read the answer above before deciding which."
  exit 1
fi
echo "== SMOKE: PASS. The harness can propose and then fund an agreement through the door the"
echo "   product funds through, so a refusal below is a refusal."

# ---------------------------------------------------------------------------
# P-1. Two concurrent funds against one affordable balance.
# ---------------------------------------------------------------------------
echo; echo "== P-1: two concurrent fundings of two proposals, one affordable balance of 100,000 kobo"
reset_with 100000
# TWO THREADS, because the live door refuses a second live agreement in one
# thread. Both proposals are for the whole balance and only one can be funded.
p1e1="$(propose_id 0 100000)"
p1e2="$(propose_id 1 100000)"
p1_open="$(q "select count(*) from public.escrows where state='INITIATED'")"
p1_moved="$(q "select count(*) from public.wallet_entries where kind='escrow_hold'")"
echo "   proposals_open=$p1_open kobo_moved_by_proposing=$p1_moved"
require_escrow "$p1e1" "P-1 first proposal" && require_escrow "$p1e2" "P-1 second proposal" || true
cat > "$scratch/p1a.sql" <<SQL
begin;
select 'A ' || (public.escrow_fund_proposal_as('$PAYER','$p1e1'::uuid,21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p1b.sql" <<SQL
begin;
select 'B ' || (public.escrow_fund_proposal_as('$PAYER','$p1e2'::uuid,21) ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p1*.sql
two_sessions "$scratch/p1a.sql" "$scratch/p1b.sql" 0.5
held="$(q "select count(*) from public.escrows where state='HELD'")"
still="$(q "select count(*) from public.escrows where state='INITIATED'")"
holds="$(q "select count(*) from public.wallet_entries where kind='escrow_hold'")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
over="$(q "select count(*) from private.wallets_overdrawn()")"
echo "   held=$held still_initiated=$still holds=$holds payer_spendable=$bal overdrawn=$over"
if [ "$p1_open" = "2" ] && [ "$p1_moved" = "0" ] \
   && grep -q "A ok" "$scratch/a.out" && grep -q "B insufficient" "$scratch/b.out" \
   && [ "$held" = "1" ] && [ "$still" = "1" ] && [ "$holds" = "1" ] && [ "$bal" = "0" ] && [ "$over" = "0" ]; then
  record P-1 PASS "Two proposals opened with nothing moved. A held the balance, B blocked on A's wallet row lock, re-read spendable after A committed and was refused. One escrow HELD, one left INITIATED, one hold, balance zero, never negative."
else
  record P-1 FAIL "Expected two open proposals moving nothing, then A ok and B insufficient with exactly one hold. Read the two session outputs above."
fi

# ---------------------------------------------------------------------------
# P-2. Escrow against a withdrawal hold, both orders.
# ---------------------------------------------------------------------------
for order in escrow_first withdrawal_first; do
  echo; echo "== P-2 ($order): an escrow and a withdrawal for the same 100,000 kobo"
  reset_with 100000
  p2e="$(propose_id 0 100000)"
  require_escrow "$p2e" "P-2 ($order)" || true
  cat > "$scratch/p2e.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_proposal_as('$PAYER','$p2e'::uuid,21) ->> 'status');
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
  # WHICH LEG MUST BE REFUSED IS THE WHOLE POINT OF RUNNING BOTH ORDERS, so it
  # is named rather than counted. Counting oks cannot tell the direction where
  # the escrow door refuses from the direction where it is merely second.
  if [ "$order" = "escrow_first" ]; then
    wins="ESCROW ok"; refused="WITHDRAWAL insufficient"
  else
    wins="WITHDRAWAL ok"; refused="ESCROW insufficient"
  fi
  named=no
  grep -q "$wins" "$scratch/a.out" && grep -q "$refused" "$scratch/b.out" && named=yes
  echo "   expected [$wins] first and [$refused] second: $named"
  if both_answered "ESCROW" "WITHDRAWAL" && [ "$named" = "yes" ] && [ "$oks" = "1" ] && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
    record "P-2 ($order)" PASS "$wins, then $refused. Exactly one committed the balance and nothing else was moved."
  else
    record "P-2 ($order)" FAIL "Expected $wins then $refused. Both paths took the balance, neither did, the wrong one was refused, or one of them never ran."
  fi
done

# ---------------------------------------------------------------------------
# P-3. Escrow against the two other committing paths.
# ---------------------------------------------------------------------------
# BOTH ORDERINGS, AND THE REVERSE ONES ARE THE ONLY ONES THAT ASK THE ESCROW
# DOOR A QUESTION. Until 23 September only escrow-first ran. A mutation that
# removed the overdraft refusal from `escrow_fund_proposal_as` entirely left
# both of these green, because with the escrow going first it wins the balance
# honestly and the POT or the TRANSFER does all of the refusing. The evidence
# is scripts/probes/escrow_concurrency_20260923_mutation_tests.log. With the
# pot or the transfer going first, the leg that must answer `insufficient` is
# the escrow, which is the thing these probes exist to test.
for order in escrow_first pot_first; do
echo; echo "== P-3a ($order): an escrow and a pot move for the same 100,000 kobo"
reset_with 100000
q "insert into public.wallet_pots (user_id, name) values ('$PAYER','Probe pot')" >/dev/null
pot="$(q "select id from public.wallet_pots where user_id='$PAYER'")"
p3ae="$(propose_id 0 100000)"
require_escrow "$p3ae" "P-3a ($order)" || true
cat > "$scratch/p3a.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_proposal_as('$PAYER','$p3ae'::uuid,21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p3b.sql" <<SQL
begin;
select 'POT ' || (public.move_into_pot('$PAYER','$pot'::uuid,100000::bigint,'rm-pot-p3a-$order') ->> 'status');
select pg_sleep(2);
commit;
SQL
chmod 644 "$scratch"/p3*.sql
if [ "$order" = "escrow_first" ]; then
  two_sessions "$scratch/p3a.sql" "$scratch/p3b.sql" 0.5
  wins="ESCROW ok"; refused="POT insufficient"
else
  two_sessions "$scratch/p3b.sql" "$scratch/p3a.sql" 0.5
  wins="POT ok"; refused="ESCROW insufficient"
fi
oks="$(grep -ho "ok" "$scratch/a.out" "$scratch/b.out" | wc -l)"
committed="$(q "select count(*) from public.wallet_entries where kind in ('escrow_hold','pot_hold')")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
named=no
grep -q "$wins" "$scratch/a.out" && grep -q "$refused" "$scratch/b.out" && named=yes
echo "   ok_answers=$oks committing_entries=$committed payer_spendable=$bal"
echo "   expected [$wins] first and [$refused] second: $named"
if both_answered "ESCROW" "POT" && [ "$named" = "yes" ] && [ "$oks" = "1" ] && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
  record "P-3a ($order)" PASS "$wins, then $refused. Exactly one of the escrow and the pot took the balance."
else
  record "P-3a ($order)" FAIL "Expected $wins then $refused. The pot and the escrow both reached the same naira, neither did, the wrong one was refused, or one of them never ran."
fi
done

for order in escrow_first transfer_first; do
echo; echo "== P-3b ($order): an escrow and a transfer to another person for the same 100,000 kobo"
reset_with 100000
p3be="$(propose_id 0 100000)"
require_escrow "$p3be" "P-3b ($order)" || true
cat > "$scratch/p3c.sql" <<SQL
begin;
select 'ESCROW ' || (public.escrow_fund_proposal_as('$PAYER','$p3be'::uuid,21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p3d.sql" <<SQL
begin;
select 'TRANSFER ' || private.transfer_between_wallets('$PAYER','$PAYEE',100000,'rm-p2p-p3b-$order-out','rm-p2p-p3b-$order-in','probe');
select pg_sleep(2);
commit;
SQL
chmod 644 "$scratch"/p3*.sql
if [ "$order" = "escrow_first" ]; then
  two_sessions "$scratch/p3c.sql" "$scratch/p3d.sql" 0.5
  wins="ESCROW ok"; refused="TRANSFER insufficient"
else
  two_sessions "$scratch/p3d.sql" "$scratch/p3c.sql" 0.5
  wins="TRANSFER ok"; refused="ESCROW insufficient"
fi
committed="$(q "select count(*) from public.wallet_entries where kind in ('escrow_hold','transfer_out')")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
named=no
grep -q "$wins" "$scratch/a.out" && grep -q "$refused" "$scratch/b.out" && named=yes
echo "   committing_entries=$committed payer_spendable=$bal"
echo "   expected [$wins] first and [$refused] second: $named"
if both_answered "ESCROW" "TRANSFER" && [ "$named" = "yes" ] && [ "$committed" = "1" ] && [ "$bal" = "0" ]; then
  record "P-3b ($order)" PASS "$wins, then $refused. Exactly one of the escrow and the transfer took the balance."
else
  record "P-3b ($order)" FAIL "Expected $wins then $refused. The transfer and the escrow both reached the same naira, neither did, the wrong one was refused, or one of them never ran."
fi
done

# ---------------------------------------------------------------------------
# P-4. Two concurrent settlements of the same agreement.
# ---------------------------------------------------------------------------
echo; echo "== P-4: two sessions release the same HELD agreement at the same instant"
reset_with 100000
esc="$(propose_id 0 100000)"
require_escrow "$esc" "P-4" || true
p4fund="$(q "select public.escrow_fund_proposal_as('$PAYER','$esc'::uuid,21) ->> 'status'")"
echo "   funded through the proposal door: $p4fund"
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
if [ "$p4fund" = "ok" ] && grep -q "A ok" "$scratch/a.out" && grep -q "B already_settled" "$scratch/b.out" \
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
esc="$(propose_id 0 100000)"
require_escrow "$esc" "P-5 ($first first)" || true
p5fund="$(q "select public.escrow_fund_proposal_as('$PAYER','$esc'::uuid,21) ->> 'status'")"
echo "   funded through the proposal door: $p5fund"
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
if [ "$p5fund" = "ok" ] \
   && { { [ "$state" = "RELEASED" ] && [ "$credits" = "1" ]; } || { [ "$state" = "DISPUTED" ] && [ "$credits" = "0" ]; }; }; then
  record "P-5 ($first first)" PASS "The agreement ended in exactly one coherent state ($state) with $credits settlement entries. Never both a release and a dispute."
else
  record "P-5 ($first first)" FAIL "The race produced state=$state with $credits settlement entries, which is neither a clean release nor a clean dispute."
fi
done

# ---------------------------------------------------------------------------
# P-6. The retry, serially and then concurrently, against the live door.
#
# WHAT CHANGED WHEN THE PROBE MOVED TO THE PROPOSAL DOOR, AND IT IS NOT
# COSMETIC. The retired verb took the funding reference as an ARGUMENT, so a
# retry was two calls carrying one string and the unique index on
# `wallet_entries.reference` was the only thing between them and two debits.
# `escrow_fund_proposal_as` DERIVES the reference from the row
# (`rm-esc-<escrow id>-hold`), so a retry cannot carry a different key and a
# caller cannot choose one. The first line of defence is therefore no longer
# the index at all: it is the row lock plus the state test, and a retry reads
# `not_fundable` because the agreement is already HELD.
#
# THREE HALVES, NOT TWO, and the third is here deliberately. The index is now
# a BACKSTOP that the ordinary path never reaches, which is exactly the shape
# that quietly stops working. So the third case puts the derived reference in
# the ledger by hand while the agreement is still INITIATED and then funds it,
# which is the only way left to make that `exception when unique_violation`
# branch run. It must ANSWER `duplicate` rather than raise, and the agreement
# must not move.
# ---------------------------------------------------------------------------
echo; echo "== P-6: the same proposal funded twice, serially"
reset_with 300000
p6e="$(propose_id 0 100000)"
require_escrow "$p6e" "P-6 serial" || true
p6ref="rm-esc-$p6e-hold"
first="$(q "select public.escrow_fund_proposal_as('$PAYER','$p6e'::uuid,21) ->> 'status'")"
second="$(q "select public.escrow_fund_proposal_as('$PAYER','$p6e'::uuid,21) ->> 'status'")"
entries="$(q "select count(*) from public.wallet_entries where reference='$p6ref'")"
bal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   derived reference=$p6ref"
echo "   first=$first second=$second entries=$entries payer_spendable=$bal"
serial_ok=no
[ "$first" = "ok" ] && [ "$second" = "not_fundable" ] && [ "$entries" = "1" ] && [ "$bal" = "200000" ] && serial_ok=yes

echo "== P-6: and the same proposal funded from two sessions at once"
reset_with 300000
p6c="$(propose_id 0 100000)"
require_escrow "$p6c" "P-6 concurrent" || true
p6cref="rm-esc-$p6c-hold"
cat > "$scratch/p6a.sql" <<SQL
begin;
select 'A ' || (public.escrow_fund_proposal_as('$PAYER','$p6c'::uuid,21) ->> 'status');
select pg_sleep(2);
commit;
SQL
cat > "$scratch/p6b.sql" <<SQL
begin;
select 'B ' || (public.escrow_fund_proposal_as('$PAYER','$p6c'::uuid,21) ->> 'status');
commit;
SQL
chmod 644 "$scratch"/p6*.sql
two_sessions "$scratch/p6a.sql" "$scratch/p6b.sql" 0.5
centries="$(q "select count(*) from public.wallet_entries where reference='$p6cref'")"
cbal="$(q "select private.wallet_spendable_locked(id) from public.wallets where user_id='$PAYER'")"
echo "   entries=$centries payer_spendable=$cbal"
conc_ok=no
[ "$centries" = "1" ] && [ "$cbal" = "200000" ] && both_answered "A " "B " && conc_ok=yes

echo "== P-6: the unique index backstop, which the ordinary path no longer reaches"
reset_with 300000
p6d="$(propose_id 0 100000)"
require_escrow "$p6d" "P-6 backstop" || true
p6dref="rm-esc-$p6d-hold"
q "insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
   select id, 'escrow_hold', 'debit', 100000, '$p6dref', 'COMPLETED'
   from public.wallets where user_id='$PAYER'" >/dev/null
dup="$(q "select public.escrow_fund_proposal_as('$PAYER','$p6d'::uuid,21) ->> 'status'")"
dentries="$(q "select count(*) from public.wallet_entries where reference='$p6dref'")"
dstate="$(q "select state from public.escrows where id='$p6d'::uuid")"
echo "   answer=$dup entries=$dentries state=$dstate"
back_ok=no
[ "$dup" = "duplicate" ] && [ "$dentries" = "1" ] && [ "$dstate" = "INITIATED" ] && back_ok=yes

if [ "$serial_ok" = "yes" ] && [ "$conc_ok" = "yes" ] && [ "$back_ok" = "yes" ]; then
  record P-6 PASS "Serially and concurrently, funding one proposal twice produced exactly one ledger entry and one debit, and the repeat answered not_fundable rather than raising. The unique index backstop, reached on purpose, answered duplicate and left the agreement INITIATED."
else
  record P-6 FAIL "serial=$serial_ok concurrent=$conc_ok backstop=$back_ok. A retry moved money twice, raised, or answered with the wrong word."
fi

# ---------------------------------------------------------------------------
# P-8. The illegal transition, from a plain psql prompt.
# ---------------------------------------------------------------------------
echo; echo "== P-8: a direct update from REFUNDED to RELEASED, as the owning role"
reset_with 100000
esc="$(propose_id 0 100000)"
require_escrow "$esc" "P-8" || true
p8fund="$(q "select public.escrow_fund_proposal_as('$PAYER','$esc'::uuid,21) ->> 'status'")"
echo "   funded through the proposal door: $p8fund"
q "select private.escrow_settle('$esc'::uuid,'refund','REFUNDED',null,'probe')" >/dev/null
before="$(q "select state from public.escrows where id='$esc'::uuid")"
raised="$(q "update public.escrows set state='RELEASED' where id='$esc'::uuid")"
after="$(q "select state from public.escrows where id='$esc'::uuid")"
echo "   before=$before after=$after"
echo "   answer: $raised"
if [ "$p8fund" = "ok" ] && [ "$before" = "REFUNDED" ] && [ "$after" = "REFUNDED" ] && echo "$raised" | grep -qi "cannot go from REFUNDED to RELEASED"; then
  record "P-8a (REFUNDED to RELEASED)" PASS "The trigger refused the update from a plain prompt and the row did not move. The guard is reachable from psql, not only from the functions."
else
  record "P-8a (REFUNDED to RELEASED)" FAIL "An illegal transition was not refused by the trigger."
fi

# ---------------------------------------------------------------------------
# P-8b. EVERY ORDERED PAIR IN THE TRANSITION TABLE, NOT ONE OF THEM.
#
# P-8 tested exactly one illegal pair until 23 September. `escrow_state` has
# nine values, so there are 72 ordered pairs of two different states. Fourteen
# of them are legal, which the shipped
# `private.escrow_transition_is_legal` names, and the other fifty eight are
# not. A guard that refuses one pair is not a guard that refuses the table.
#
# THE CONTROL IS INSIDE THE SAME WALK AND IT IS NOT OPTIONAL. Fifty eight
# refusals look exactly like a trigger that refuses everything, which would
# take the product down while reading as a clean sweep. So the fourteen legal
# pairs are driven through the same statement in the same run and every one of
# them MUST SUCCEED. The probe fails if a legal transition is refused just as
# loudly as if an illegal one is allowed.
#
# The from-state is reached by inserting the row directly rather than by
# walking a lifecycle, which is the point: this probe is about what a plain
# `update` from a prompt can do, not about what the doors permit.
# ---------------------------------------------------------------------------
echo; echo "== P-8b: every ordered pair of states, from a plain prompt"
reset_with 100000
cat > "$scratch/p8b.sql" <<SQL
create table public.p8_results (
  from_state text, to_state text, legal boolean, refused boolean,
  moved boolean, ok boolean, note text
);

-- THE PROBE'S OWN COPY OF THE TABLE, and it is here because asking the
-- shipped function what is legal and then checking that it refused everything
-- it called illegal is a circle. A mutation that swapped one legal pair for
-- another would keep the counts at fourteen and fifty eight and go straight
-- through. These fourteen pairs are transcribed from ADR-E1 and from
-- private.escrow_transition_is_legal as it stood on 23 September, BY HAND,
-- and the probe compares the shipped function against them pair by pair.
create table public.p8_expected (from_state text, to_state text);
insert into public.p8_expected values
  ('INITIATED','FUNDED'),
  ('FUNDED','HELD'),
  ('HELD','RELEASE_REQUESTED'),
  ('HELD','RELEASED'),
  ('RELEASE_REQUESTED','RELEASED'),
  ('HELD','REFUNDED'),
  ('RELEASE_REQUESTED','REFUNDED'),
  ('INITIATED','DISPUTED'),
  ('FUNDED','DISPUTED'),
  ('HELD','DISPUTED'),
  ('RELEASE_REQUESTED','DISPUTED'),
  ('DISPUTED','RESOLVED'),
  ('INITIATED','CANCELLED'),
  ('FUNDED','CANCELLED');
do \$p8\$
declare
  states public.escrow_state[] := enum_range(null::public.escrow_state);
  f public.escrow_state;
  t public.escrow_state;
  eid uuid;
  is_legal boolean;
  did_refuse boolean;
  did_move boolean;
  msg text;
  want text;
begin
  foreach f in array states loop
    foreach t in array states loop
      continue when f = t;
      is_legal := private.escrow_transition_is_legal(f, t);
      insert into public.escrows (payer_id, payee_id, purpose, amount_minor, state)
      values ('$PAYER', '$PAYEE', 'agency_fee', 100000, f)
      returning id into eid;
      did_refuse := false;
      msg := null;
      begin
        update public.escrows set state = t where id = eid;
      exception when others then
        did_refuse := true;
        msg := sqlerrm;
      end;
      select (state = t) into did_move from public.escrows where id = eid;
      want := 'cannot go from ' || f::text || ' to ' || t::text;
      insert into public.p8_results (from_state, to_state, legal, refused, moved, ok, note)
      values (
        f::text, t::text, is_legal, did_refuse, did_move,
        case
          when is_legal then (not did_refuse) and did_move
          else did_refuse and (not did_move) and position(want in coalesce(msg, '')) > 0
        end,
        case when is_legal then 'legal, must be allowed' else coalesce(msg, 'no message') end
      );
    end loop;
  end loop;
end
\$p8\$;
-- EVERY LEAF IS PARENTHESISED ON PURPOSE. Written without the brackets, this
-- reads as (((A except B) union all C) except D), because `except` and
-- `union` share a precedence and associate leftwards, and it UNDER-REPORTED a
-- deliberately swapped pair as one disagreement instead of two.
select 'P8-TABLE disagreements=' || count(*) from (
  ((select from_state, to_state from public.p8_results where legal)
   except
   (select from_state, to_state from public.p8_expected))
  union all
  ((select from_state, to_state from public.p8_expected)
   except
   (select from_state, to_state from public.p8_results where legal))
) d;
select 'P8-TABLE-DIFF ' || from_state || ' -> ' || to_state from (
  ((select from_state, to_state from public.p8_results where legal)
   except
   (select from_state, to_state from public.p8_expected))
  union all
  ((select from_state, to_state from public.p8_expected)
   except
   (select from_state, to_state from public.p8_results where legal))
) d order by 1;
select 'P8-COUNTS pairs=' || count(*)
    || ' legal=' || count(*) filter (where legal)
    || ' illegal=' || count(*) filter (where not legal)
    || ' legal_allowed=' || count(*) filter (where legal and ok)
    || ' illegal_refused=' || count(*) filter (where not legal and ok)
    || ' wrong=' || count(*) filter (where not ok)
  from public.p8_results;
select 'P8-WRONG ' || from_state || ' -> ' || to_state
    || ' legal=' || legal || ' refused=' || refused || ' moved=' || moved
    || ' :: ' || replace(note, chr(10), ' ')
  from public.p8_results where not ok order by from_state, to_state;
SQL
chmod 644 "$scratch/p8b.sql"
su postgres -c "psql -X -q -At -d $db -f $scratch/p8b.sql" > "$scratch/p8b.out" 2>&1
sed 's/^/   /' "$scratch/p8b.out"
p8counts="$(grep -h '^P8-COUNTS' "$scratch/p8b.out" || true)"
p8table="$(grep -h '^P8-TABLE disagreements=' "$scratch/p8b.out" || true)"
p8wrong="$(grep -hc '^P8-WRONG' "$scratch/p8b.out" || true)"
q "drop table if exists public.p8_results" >/dev/null
q "drop table if exists public.p8_expected" >/dev/null
if [ "$p8counts" = "P8-COUNTS pairs=72 legal=14 illegal=58 legal_allowed=14 illegal_refused=58 wrong=0" ] \
   && [ "$p8table" = "P8-TABLE disagreements=0" ] \
   && [ "$p8wrong" = "0" ]; then
  record "P-8b (the whole table)" PASS "All 72 ordered pairs walked from a plain prompt, against the probe's own hand-written copy of the fourteen legal pairs. Every one of the 58 illegal pairs raised with the trigger's own sentence and left the row where it was, and all 14 legal pairs were allowed through in the same run, so the refusals are a table and not a closed door."
else
  record "P-8b (the whole table)" FAIL "counts=[$p8counts] table=[$p8table] wrong_rows=$p8wrong. The shipped transition table disagreed with the probe's own copy, or a pair behaved against it. Read the P8-TABLE-DIFF and P8-WRONG lines above."
fi

# ---------------------------------------------------------------------------
# P-9. The float identity across a full lifecycle mix.
# ---------------------------------------------------------------------------
echo; echo "== P-9: the float identity across a mix of held, released, refunded, disputed and cancelled"
reset_with 5000000
q "insert into public.fee_rates (kind, basis_points, flat_minor, effective_from) values ('commission', 500, 0, now() - interval '1 day')" >/dev/null
# SEVEN AGREEMENTS, SEVEN THREADS. The live door allows one live agreement per
# conversation, so the lifecycle mix needs a thread each rather than seven
# calls against one pair of people.
p9_funded=0
for n in 1 2 3 4 5 6; do
  p9e="$(propose_id $((n - 1)) $((n * 100000)))"
  require_escrow "$p9e" "P-9 agreement $n" || continue
  p9a="$(q "select public.escrow_fund_proposal_as('$PAYER','$p9e'::uuid,21) ->> 'status'")"
  [ "$p9a" = "ok" ] && p9_funded=$((p9_funded + 1))
done
echo "   funded through the proposal door: $p9_funded of 6"
e1="$(q "select id from public.escrows where amount_minor=100000")"
e2="$(q "select id from public.escrows where amount_minor=200000")"
e3="$(q "select id from public.escrows where amount_minor=300000")"
e4="$(q "select id from public.escrows where amount_minor=400000")"
q "select private.escrow_settle('$e1'::uuid,'release','RELEASED',null,'probe')" >/dev/null
q "select private.escrow_settle('$e2'::uuid,'refund','REFUNDED',null,'probe')" >/dev/null
q "select public.escrow_raise_dispute_as('$PAYER','$e3'::uuid,'The keys were never handed over.')" >/dev/null
q "select private.escrow_settle('$e4'::uuid,'release','RESOLVED',null,'probe ruling')" >/dev/null 2>&1
# THE SEVENTH IS PROPOSED AND NEVER FUNDED, so the cancel leg exercises the
# same door a person cancelling a proposal in a thread walks through. It used
# to go through `public.escrow_open`, which no server action calls.
prop="$(propose_id 6 900000)"
require_escrow "$prop" "P-9 the cancelled proposal" || true
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
if [ "$p9_funded" = "6" ] && [ "$inv" = "true" ] && [ "$diff" = "0" ] && [ "$gross_ok" = "0" ] && [ "$over" = "0" ] && [ "$commission" != "0" ]; then
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
