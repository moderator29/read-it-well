"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";
import { ARRIVAL_ANSWERS, MAX_ARRIVAL_PHOTOS } from "./arrival-check";

/**
 * V-91. The guest's answer to "Is it as listed?".
 *
 * `answer_arrival_check` holds every rule: the guest of a paid stay, inside
 * the window, one answer, and for a report one to six photos that this guest
 * uploaded under this booking. A report files a support ticket, the refund
 * desk's ask and a high risk alert in the same transaction. This action only
 * carries the answer across.
 */

const INPUT = z.object({
  bookingId: z.string().uuid(),
  answer: z.enum(ARRIVAL_ANSWERS),
  note: z.string().max(1000).optional(),
  photos: z.array(z.string().min(1).max(200)).max(MAX_ARRIVAL_PHOTOS).default([]),
});

export type ArrivalAnswerOutcome = { state: "answered" | "already"; reference: string | null };

export async function answerArrivalCheck(input: {
  bookingId: string;
  answer: string;
  note?: string;
  photos?: string[];
}): Promise<ActionResult<ArrivalAnswerOutcome>> {
  const copy = getDictionary(await getLocale()).arrivalCheck;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = INPUT.safeParse(input);
  if (!parsed.success) return fail(copy.failed);
  const value = parsed.data;

  const db = session.supabase as unknown as SupabaseClient;
  const { data, error } = await db.rpc("answer_arrival_check", {
    p_booking: value.bookingId,
    p_answer: value.answer,
    p_note: value.note ?? null,
    p_photos: value.photos,
  });
  if (error) return fail((error.message ?? "").includes("three hours after it") ? copy.closedOrAnswered : copy.failed);
  const row = (data ?? {}) as { state?: unknown; reference?: unknown };
  revalidatePath(`/bookings/${value.bookingId}`);
  if (row.state === "answered" || row.state === "already") {
    return ok({ state: row.state, reference: typeof row.reference === "string" ? row.reference : null });
  }
  return fail(copy.failed);
}
