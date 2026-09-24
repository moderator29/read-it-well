"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../agent/listings-schema";
import { ARRIVAL_KEYS, ARRIVAL_UNITS, type ArrivalAnswer, type ArrivalKey } from "./arrival-charges";

/**
 * V-57. The host declares every arrival charge, and the guest reports money
 * asked at the door. Both are one call to a definer door on the caller's own
 * session; the database checks ownership, completeness and the paid stay.
 */
const SERVICE_DOWN = "That did not go through. Nothing was changed. Try again in a moment.";
const WORDS: Record<string, string> = {
  not_found: "We could not find that on your account.",
  incomplete: "Answer all five: an amount, or none.",
  bad_target: SERVICE_DOWN,
  not_a_paid_stay: "Only a paid stay can be reported here.",
  bad_amount: "Enter the amount you were asked for, or leave it blank.",
  already_reported: "You have already reported this stay. Support has it.",
};

const answerSchema = z.union([
  z.object({ none: z.literal(true) }),
  z.object({ naira: z.string(), per: z.enum(ARRIVAL_UNITS) }),
]);

export async function declareArrivalCharges(input: {
  listingId?: string | null;
  accommodationId?: string | null;
  answers: Record<string, unknown>;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({
      listingId: z.uuid().nullable().optional(),
      accommodationId: z.uuid().nullable().optional(),
      answers: z.record(z.string(), answerSchema),
    }),
    input,
  );
  if (!parsed.ok) return fail(WORDS.incomplete as string);
  const charges: Partial<Record<ArrivalKey, ArrivalAnswer>> = {};
  for (const key of ARRIVAL_KEYS) {
    const answer = parsed.data.answers[key];
    if (!answer) return fail(WORDS.incomplete as string);
    if ("none" in answer) {
      charges[key] = { none: true };
    } else {
      const minor = parseNairaToKobo(answer.naira);
      if (minor === null || minor <= 0) return fail(WORDS.incomplete as string);
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
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    revalidatePath("/host/arrival");
    return ok(null);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

export async function reportDoorCharge(input: { bookingId: string; askedNaira?: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ bookingId: z.uuid(), askedNaira: z.string().optional() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const asked = parsed.data.askedNaira?.trim() ? parseNairaToKobo(parsed.data.askedNaira) : null;
  if (parsed.data.askedNaira?.trim() && (asked === null || asked <= 0)) return fail(WORDS.bad_amount as string);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("report_door_charge", {
      p_booking: parsed.data.bookingId,
      p_asked: asked,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    revalidatePath(`/bookings/${parsed.data.bookingId}`);
    return ok(null);
  } catch {
    return fail(SERVICE_DOWN);
  }
}
