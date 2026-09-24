"use server";

import { headers } from "next/headers";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { callLandlordRpc } from "../landlord/rpc";
import { consume, ipFromHeaders, subjectForIp } from "../security/rate-limit";
import { getAdminClient } from "../wallet/ledger";
import { normalisePhone } from "../phone";
import { readCheckQuery, readCheckResult, type CheckResult } from "./agent-check";

/**
 * V-61. THE CHECK, AND THE LIMIT THAT KEEPS IT FROM BEING A PHONE BOOK.
 *
 * `public.agent_lookup` is callable by the service role only, so this action
 * is the one door to it. Every lookup spends a per-address allowance and
 * reserves a slot in a platform-wide budget of three thousand misses an hour
 * (one for numbers, one for codes), given back on a hit, so the space cannot
 * be walked from many addresses and "limited" never reveals a match. Every
 * limit fails closed when the limiter is down, refuses in words and records
 * nothing.
 *
 * Signed out by design. A renter holding a flyer has no account yet.
 */

export type CheckOutcome =
  | { state: "result"; query: string; result: CheckResult }
  | { state: "unreadable" }
  | { state: "limited"; retryIn: string };

const FAILED = "We could not check just now. This is on our side. Nothing was recorded. Try again in a few minutes.";

/** The platform-wide miss budgets: one for numbers, one for codes. */
const MISS_BUDGET = {
  phone: { bucket: "agent_check_phone_miss", limit: 3000 },
  code: { bucket: "agent_check_code_miss", limit: 3000 },
} as const;
const HOUR = 3600;

export async function checkAgent(
  _prev: ActionResult<CheckOutcome> | null,
  form: FormData,
): Promise<ActionResult<CheckOutcome>> {
  const raw = form.get("query");
  const query = typeof raw === "string" ? readCheckQuery(raw) : null;
  if (!query) return ok({ state: "unreadable" });

  const ip = ipFromHeaders(await headers());
  const admin = getAdminClient();
  if (!admin) return fail(FAILED);

  /* 1. THE ADDRESS'S OWN ALLOWANCE. Codes are cheaper to allow than numbers
     (a code names one agent; numbers are what a phone book is walked by), and
     both FAIL CLOSED: if the limiter cannot answer, nothing is looked up. */
  const perAddress =
    query.kind === "code"
      ? await consume({ bucket: "agent_check_code", subject: subjectForIp(ip), limit: 60, windowSeconds: HOUR })
      : await consume({ bucket: "agent_check_phone", subject: subjectForIp(ip), limit: 30, windowSeconds: HOUR });
  if (!perAddress.allowed) return ok({ state: "limited", retryIn: perAddress.retryIn });
  if (perAddress.degraded) return fail(FAILED);

  /* 2. THE PLATFORM-WIDE MISS BUDGET, RESERVED BEFORE THE LOOKUP. A slot is
     taken first and given back on a hit, so the answer "limited" never tells
     anybody whether the query would have matched, and while the budget is
     spent EVERY lookup of that kind is refused, hit or miss. Somebody with
     many addresses cannot walk the space; real agents' names cost nothing. */
  const budget = MISS_BUDGET[query.kind];
  const reserved = await consume({ bucket: budget.bucket, subject: "platform", limit: budget.limit, windowSeconds: HOUR });
  if (!reserved.allowed) return ok({ state: "limited", retryIn: reserved.retryIn });
  if (reserved.degraded) return fail(FAILED);

  const giveBack = async () => {
    try {
      await callLandlordRpc(admin, "refund_agent_check_slot", { p_bucket: budget.bucket, p_window_seconds: HOUR });
    } catch {
      /* A slot not given back only makes the budget stricter. */
    }
  };

  const { data, error } = await callLandlordRpc(admin, "agent_lookup", { p_query: query.value });
  if (error) {
    await giveBack();
    return fail(FAILED);
  }
  const result = readCheckResult(data, query);
  if (!result) {
    await giveBack();
    return fail(FAILED);
  }
  if (result.found) await giveBack();
  return ok({ state: "result", query: query.value, result });
}

/**
 * THE AGENT OPTS THEIR BUSINESS NUMBER IN, OR OUT. The database stores only an
 * HMAC of it and the last three digits, and refuses a number another account
 * has already registered.
 */
export async function setCheckableNumber(input: {
  phone: string | null;
}): Promise<ActionResult<{ hint: string | null }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const phone = input.phone === null ? null : normalisePhone(input.phone);
  if (input.phone !== null && !phone) return fail("invalid", { phone: "invalid" });

  const { data, error } = await callLandlordRpc(session.supabase, "agent_lookup_opt_in", { p_phone: phone });
  if (error) {
    if ((error.message ?? "").includes("already registered")) return fail("taken", { phone: "taken" });
    return fail("failed");
  }
  const hint = (data as { hint?: unknown } | null)?.hint;
  return ok({ hint: typeof hint === "string" ? hint : null });
}
