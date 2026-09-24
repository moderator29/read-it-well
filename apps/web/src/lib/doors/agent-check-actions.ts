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
 * is the one door to it. A code lookup spends a per-address allowance only. A
 * number lookup spends a per-address allowance and, when it misses, a
 * platform-wide budget of three thousand misses an hour, so the number space
 * cannot be walked from many addresses; number lookups fail closed when the
 * limiter is down. Every limit refuses in words and records nothing.
 *
 * Signed out by design. A renter holding a flyer has no account yet.
 */

export type CheckOutcome =
  | { state: "result"; query: string; result: CheckResult }
  | { state: "unreadable" }
  | { state: "limited"; retryIn: string };

const FAILED = "We could not check just now. This is on our side. Nothing was recorded. Try again in a few minutes.";

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

  if (query.kind === "code") {
    /* A code names one agent and proves only that the code exists, so it is
       no phone book: per address only, with room for a busy shared address. */
    const perAddress = await consume({ bucket: "agent_check_code", subject: subjectForIp(ip), limit: 60, windowSeconds: 3600 });
    if (!perAddress.allowed) return ok({ state: "limited", retryIn: perAddress.retryIn });
    const { data, error } = await callLandlordRpc(admin, "agent_lookup", { p_query: query.value });
    if (error) return fail(FAILED);
    const result = readCheckResult(data, query);
    return result ? ok({ state: "result", query: query.value, result }) : fail(FAILED);
  }

  /* A NUMBER. Enumerating numbers is what the limits exist for, so here they
     fail CLOSED: if the limiter cannot answer, nothing is looked up. A hit
     costs only the address's allowance (generous, for addresses shared by a
     whole network); a miss also spends the platform-wide budget, so somebody
     with many addresses cannot walk the number space, and nobody can exhaust
     the budget for everyone else by looking up real agents. */
  const perAddress = await consume({ bucket: "agent_check_phone", subject: subjectForIp(ip), limit: 30, windowSeconds: 3600 });
  if (!perAddress.allowed) return ok({ state: "limited", retryIn: perAddress.retryIn });
  if (perAddress.degraded) return fail(FAILED);

  const { data, error } = await callLandlordRpc(admin, "agent_lookup", { p_query: query.value });
  if (error) return fail(FAILED);
  const result = readCheckResult(data, query);
  if (!result) return fail(FAILED);
  if (!result.found) {
    const misses = await consume({ bucket: "agent_check_phone_miss", subject: "platform", limit: 3000, windowSeconds: 3600 });
    if (!misses.allowed) return ok({ state: "limited", retryIn: misses.retryIn });
    if (misses.degraded) return fail(FAILED);
  }
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
