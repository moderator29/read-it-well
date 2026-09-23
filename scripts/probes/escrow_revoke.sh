#!/usr/bin/env bash
# P-7, THE REVOKE, AGAINST A REAL POSTGREST.
#
# Build rule 21 says a migration that revokes EXECUTE must have the revoke
# PROVED and not assumed. `has_function_privilege` answers the question about
# the grant, and it is what the migrations assert, but it is still the database
# grading its own homework: it cannot tell you whether PostgREST exposes a
# different overload, whether an older signature is still reachable, or whether
# the schema cache is serving something the catalogue no longer says.
#
# So this one goes over HTTP, with the project's real anon key, exactly as a
# stranger with a browser console would. Nothing in here needs a session: the
# point is that the door is shut before anybody knocks.
#
# The five verbs. The first four were executable by `authenticated` until
# 20260922120000 revoked them, which is finding F-2. `escrow_hold` is the
# service path and has always been service-role only; it is included because
# F-6 gave it a new signature and a new signature is a new grant.
#
# STILL NOT RUN AS OF 23 SEPTEMBER 2026, RE-CHECKED RATHER THAN ASSUMED. The
# founder said he was opening egress, so the first thing this script now does
# is ask, and it prints the proxy's own reason when the answer is no. Today the
# answer is still no: `uccixoonmbhrnyczyigt.supabase.co:443` returns "CONNECT
# tunnel failed, response 403" and the agent proxy records
# `connect_rejected / gateway answered 403 to CONNECT (policy denial)`.
# See escrow_revoke.log. THE HTTP HALF OF P-7 IS UNPROVEN and needs one run
# from a machine that can reach the project.
#
# THE EXECUTE HALF IS PROVED AND IS A DIFFERENT FILE. `escrow_revoke_roles.sql`
# switches to `anon` and to `authenticated` inside a transaction, calls all
# eleven verbs, and ends with a control call that MUST answer. The two halves
# ask different questions and neither substitutes for the other.
#
# Usage:
#   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<anon key> \
#     bash scripts/probes/escrow_revoke.sh | tee scripts/probes/escrow_revoke.log
set -uo pipefail

url="${SUPABASE_URL:?set SUPABASE_URL}"
key="${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"

pass=0
fail=0

probe() { # probe <rpc name> <json body>
  local rpc="$1" body="$2" code answer
  answer="$(curl -sS -w $'\n%{http_code}' -X POST "$url/rest/v1/rpc/$rpc" \
    -H "apikey: $key" -H "Authorization: Bearer $key" \
    -H "Content-Type: application/json" -d "$body" 2>&1)"
  code="$(printf '%s' "$answer" | tail -n 1)"
  local payload
  payload="$(printf '%s' "$answer" | sed '$d' | tr -d '\n' | cut -c1-240)"
  echo "-- $rpc"
  echo "   HTTP $code"
  echo "   $payload"

  # A PERMISSION ERROR, NOT A BUSINESS ANSWER. 404 is PostgREST's answer when
  # the function is not in the schema cache it is allowed to see, and 401/403
  # is its answer when it is but the role may not execute it. Any 2xx means the
  # body RAN, which is the whole thing this probe exists to refuse.
  if [ "$code" = "401" ] || [ "$code" = "403" ] || [ "$code" = "404" ]; then
    if printf '%s' "$payload" | grep -qi '"status"'; then
      echo "   FAIL: the body ran and answered in escrow's own vocabulary."
      fail=$((fail + 1))
      return
    fi
    echo "   PASS: refused before the body ran."
    pass=$((pass + 1))
  else
    echo "   FAIL: a stranger reached this verb."
    fail=$((fail + 1))
  fi
}

echo "== P-7, the revoke, over HTTP, $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "== $url, anon key, no session"
echo

# ------------------------------------------------------------------ preflight
#
# ASK WHETHER THE HOST IS REACHABLE BEFORE READING ANYTHING INTO A REFUSAL.
# A blocked CONNECT and a closed door are the same curl exit code away from
# each other, and the whole value of this probe is in telling them apart.
reach="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url/rest/v1/" 2>&1 || true)"
if [ "$reach" = "000" ] || [ -z "$reach" ]; then
  echo "-- PREFLIGHT: $url is NOT REACHABLE from here."
  echo "   curl could not open a tunnel. The agent proxy reports:"
  curl -sS "${HTTPS_PROXY:-http://127.0.0.1:44815}/__agentproxy/status" 2>/dev/null \
    | grep -A3 recentRelayFailures | head -8 || echo "   (proxy status unavailable)"
  echo
  echo "== RESULT: NOT RUN. The egress policy denies this host, so P-7's HTTP"
  echo "== half is UNPROVEN. Nothing below ran and no refusal is claimed."
  echo "== The EXECUTE half is proved separately: escrow_revoke_roles.sql."
  exit 2
fi
echo "-- PREFLIGHT: $url answered HTTP $reach. Running the probe."
echo

ZERO='00000000-0000-4000-8000-000000000000'

probe escrow_fund_from_wallet "{\"p_payee\":\"$ZERO\",\"p_listing\":null,\"p_purpose\":\"agency_fee\",\"p_amount_minor\":100,\"p_reference\":\"probe-p7\",\"p_hold_days\":21}"
probe escrow_confirm          "{\"p_escrow\":\"$ZERO\"}"
probe escrow_request_release  "{\"p_escrow\":\"$ZERO\"}"
probe escrow_raise_dispute    "{\"p_escrow\":\"$ZERO\",\"p_reason\":\"probe\"}"
probe escrow_hold             "{\"escrow_id\":\"$ZERO\",\"payer_user\":\"$ZERO\",\"amount\":100,\"hold_reference\":\"probe-p7\",\"note\":null,\"hold_days\":21}"
probe escrow_cancel_as        "{\"p_actor\":\"$ZERO\",\"p_escrow\":\"$ZERO\",\"p_reason\":\"probe\"}"
probe escrow_fund_from_wallet_as "{\"p_actor\":\"$ZERO\",\"p_payee\":\"$ZERO\",\"p_listing\":null,\"p_purpose\":\"agency_fee\",\"p_amount_minor\":100,\"p_reference\":\"probe-p7-as\",\"p_hold_days\":21}"

echo
echo "== A CONTROL, because a probe where every door is shut cannot tell a shut"
echo "== door from a broken URL. This endpoint must ANSWER."
control="$(curl -sS -o /dev/null -w '%{http_code}' "$url/rest/v1/listings?select=id&limit=1" -H "apikey: $key" -H "Authorization: Bearer $key")"
echo "-- GET /rest/v1/listings -> HTTP $control"
if [ "$control" = "200" ]; then
  echo "   PASS: the API is reachable and answering, so the refusals above are refusals."
  pass=$((pass + 1))
else
  echo "   FAIL: the API did not answer at all, so nothing above is evidence."
  fail=$((fail + 1))
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "== RESULT: PASS. $pass of $pass. No escrow verb is reachable by a stranger, and the API was proved awake."
  exit 0
fi
echo "== RESULT: FAIL. $fail of $((pass + fail)) checks failed."
exit 1
