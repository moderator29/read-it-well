"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";

/**
 * V-10: RECORD ONE SEARCH AS A CELL. The cell arrives already reduced (see
 * `cell.ts`); this re-validates it and hands it to `record_search_demand`,
 * which keeps no caller identity. A per-person daily ceiling stops one tab
 * from painting a neighbourhood with demand that is one person's refreshes.
 * Failure is silent to the searcher: a missed count must never cost a search.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  stateCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  areaKey: z.string().regex(/^[A-Za-z0-9 ]{2,60}$/).nullable(),
  market: z.enum(["rent", "sale", "any"]),
  bedroomsMin: z.number().int().min(0).max(5).nullable(),
  budgetBand: z.number().int().min(1).max(6).nullable(),
  results: z.number().int().min(0).max(100000),
});

type Rpc = (fn: "record_search_demand", args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;

export async function recordDemand(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error);
  const session = await resolveSession();
  if (session.state !== "signed-in") return ok(null);
  const verdict = await consume({
    bucket: "search_demand",
    subject: subjectForUser(session.user.id),
    limit: 100,
    windowSeconds: 24 * 60 * 60,
  });
  if (!verdict.allowed) return ok(null);
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const c = parsed.data;
    await rpc("record_search_demand", {
      p_state_code: c.stateCode,
      p_area_key: c.areaKey,
      p_market: c.market,
      p_bedrooms_min: c.bedroomsMin,
      p_budget_band: c.budgetBand,
      p_results: c.results,
    });
  } catch {
    /* A missed count is not worth a broken search. */
  }
  return ok(null);
}
