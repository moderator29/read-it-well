"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";
import { areaAsking } from "./queries";
import { priceCheckRpc } from "./rpc";
import { guideFromRows, guideRefusalFor, type FeeNorms, type Guide, type GuideSubject } from "./wizard-guide";

/**
 * V-74: THE WIZARD ASKS PRICE CHECK, AND THE ASKING IS COUNTED.
 *
 * One call per change of what is being priced (type, bedrooms, area, intent,
 * period), never per keystroke of the rent: the range does not depend on the
 * figure being typed. Signed-in only, like the wizard. The area report and the
 * fee norms are read under the lister's own client; the funnel row goes
 * through the service role because `record_price_check_event` is born locked,
 * with `entry_point = 'wizard'`, the outcome and the count, and no location
 * finer than the state (there is no pin to take a cell from).
 *
 * Instrumentation never becomes the lister's problem: a failed funnel write
 * is swallowed. A failed READ is `unreachable`, never "not enough listings".
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  stateCode: z.string().min(2).max(3),
  city: z.string().max(80).nullable(),
  area: z.string().max(80).nullable(),
  propertyType: z.string().max(40),
  intent: z.enum(["rent", "sale"]),
  rentPeriod: z.enum(["month", "quarter", "year"]).nullable(),
  bedrooms: z.number().int().min(0).max(30).nullable(),
});

type NormsRpc = (
  fn: "area_fee_norms",
  args: { p_state_code: string; p_city: string | null; p_area: string; p_property_type: string; p_bedrooms: number | null },
) => PromiseLike<{ data: unknown; error: unknown }>;

type SignedIn = Extract<Awaited<ReturnType<typeof resolveSession>>, { state: "signed-in" }>;

async function readFeeNorms(subject: GuideSubject, session: SignedIn): Promise<FeeNorms | null> {
  if (!subject.area) return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as NormsRpc;
    const { data, error } = await rpc("area_fee_norms", {
      p_state_code: subject.stateCode,
      p_city: subject.city,
      p_area: subject.area,
      p_property_type: subject.propertyType,
      p_bedrooms: subject.bedrooms,
    });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as Record<string, unknown>;
    const int = (v: unknown) => (v === null || v === undefined ? null : Math.trunc(Number(v)));
    return {
      listingCount: int(row.listing_count) ?? 0,
      agencyCount: int(row.agency_count) ?? 0,
      agencyListers: int(row.agency_listers) ?? 0,
      agencyBp: int(row.agency_bp),
      legalCount: int(row.legal_count) ?? 0,
      legalListers: int(row.legal_listers) ?? 0,
      legalBp: int(row.legal_bp),
      similarListers: int(row.similar_listers) ?? 0,
    };
  } catch {
    return null;
  }
}

export async function wizardPriceGuide(input: unknown): Promise<ActionResult<{ guide: Guide; norms: FeeNorms | null }>> {
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const subject: GuideSubject = {
    ...parsed.data,
    propertyType: parsed.data.propertyType as GuideSubject["propertyType"],
    stateCode: parsed.data.stateCode.toUpperCase(),
  };

  const refusal = guideRefusalFor(subject);
  const [rows, norms] = refusal
    ? [[], null]
    : await Promise.all([
        areaAsking(subject.stateCode, subject.city, subject.area, subject.intent, subject.propertyType, subject.bedrooms),
        readFeeNorms(subject, session),
      ]);
  /* The fee norms read also counts the listers behind similar homes, which the
     range needs; for a sale there are no rent fees but the count still holds. */
  const guide = guideFromRows(subject, rows, norms ? norms.similarListers : null);

  if (isSupabaseConfigured() && guide.kind !== "unreachable") {
    try {
      await priceCheckRpc(createAdminClient(), "record_price_check_event", {
        p_check_id: randomUUID(),
        p_stage: "outcome",
        p_user_id: session.user.id,
        p_entry_point: "wizard",
        p_state_code: subject.stateCode,
        p_lga_code: null,
        p_geohash5: null,
        p_property_type: subject.propertyType,
        p_listing_intent: subject.intent,
        p_bedrooms: subject.bedrooms,
        p_size_stated: null,
        p_outcome: guide.kind === "asking" ? "answered" : "refused",
        p_refusal_code: guide.kind === "refused" ? `wizard_${guide.code}` : null,
        p_comparable_count: guide.count,
        p_radius_m: null,
        p_dispersion: null,
        p_confidence: null,
        p_intent_chosen: null,
        p_listing_id: null,
      });
    } catch {
      /* Instrumentation never becomes the lister's problem. */
    }
  }

  return ok({ guide, norms });
}
