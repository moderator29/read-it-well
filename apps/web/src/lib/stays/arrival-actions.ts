"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../agent/listings-schema";
import { ARRIVAL_KEYS, ARRIVAL_UNITS, type ArrivalAnswer, type ArrivalKey } from "./arrival-charges";

/**
 * V-57. The host declares every arrival charge, and the guest reports money
 * asked at the door. Both are one call to a definer door on the caller's own
 * session; the database checks ownership, completeness and the paid stay.
 */
/** The refusals, by status, from the dictionary; bad_target is never the person's doing. */
async function words(): Promise<{ say: (status: string | null | undefined) => string; down: string; of: Record<string, string> }> {
  const copy = getDictionary(await getLocale()).afterTheGate.arrival.words;
  const of: Record<string, string> = { ...copy, bad_target: copy.serviceDown };
  return { say: (status) => of[status ?? ""] ?? copy.serviceDown, down: copy.serviceDown, of };
}

const answerSchema = z.union([
  z.object({ none: z.literal(true) }),
  z.object({ naira: z.string(), per: z.enum(ARRIVAL_UNITS) }),
]);

export async function declareArrivalCharges(input: {
  listingId?: string | null;
  accommodationId?: string | null;
  answers: Record<string, unknown>;
}): Promise<ActionResult<null>> {
  const w = await words();
  const parsed = validate(
    z.object({
      listingId: z.uuid().nullable().optional(),
      accommodationId: z.uuid().nullable().optional(),
      answers: z.record(z.string(), answerSchema),
    }),
    input,
  );
  if (!parsed.ok) return fail(w.of.incomplete as string);
  const charges: Partial<Record<ArrivalKey, ArrivalAnswer>> = {};
  for (const key of ARRIVAL_KEYS) {
    const answer = parsed.data.answers[key];
    if (!answer) return fail(w.of.incomplete as string);
    if ("none" in answer) {
      charges[key] = { none: true };
    } else {
      const minor = parseNairaToKobo(answer.naira);
      if (minor === null || minor <= 0) return fail(w.of.incomplete as string);
      charges[key] = { minor, per: answer.per };
    }
  }
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("declare_arrival_charges", {
      p_listing: parsed.data.listingId ?? null,
      p_accommodation: parsed.data.accommodationId ?? null,
      p_charges: charges,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(w.say(status));
    revalidatePath("/host/arrival");
    return ok(null);
  } catch {
    return fail(w.down);
  }
}

export async function reportDoorCharge(input: { bookingId: string; askedNaira?: string }): Promise<ActionResult<null>> {
  const w = await words();
  const parsed = validate(z.object({ bookingId: z.uuid(), askedNaira: z.string().optional() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const asked = parsed.data.askedNaira?.trim() ? parseNairaToKobo(parsed.data.askedNaira) : null;
  if (parsed.data.askedNaira?.trim() && (asked === null || asked <= 0)) return fail(w.of.bad_amount as string);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("report_door_charge", {
      p_booking: parsed.data.bookingId,
      p_asked: asked,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(w.say(status));
    revalidatePath(`/bookings/${parsed.data.bookingId}`);
    return ok(null);
  } catch {
    return fail(w.down);
  }
}
