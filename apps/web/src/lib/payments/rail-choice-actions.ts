"use server";

/**
 * THE PAYER PICKS ESCROW OR CARD (founder ruling 2, 13 October 2026).
 *
 * The whole rule is the database's (`public.payment_rail_choose`): only the
 * payer, only while nothing is paid or moving, only a rail the policy offers
 * (a sale refuses card, a hotel room refuses escrow). This action passes the
 * choice through the payer's own session and says, as a code the payment step
 * words from `payChoice.refused`, why it was refused. It never opens a
 * payment: the step then goes to the existing escrow or card screen.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { readChoiceRefusal, type ChoiceRefusal, type PayRail } from "./rail-choice";

export type ChoiceSaved = { choice: PayRail };

const input = z.object({ agreementId: z.string().uuid(), choice: z.enum(["escrow", "card"]) });

/**
 * The error string is the refusal's code (`ChoiceRefusal`), which the step
 * turns into a sentence in the reader's language; the signed-out and
 * unconfigured cases carry the shared sentences.
 */
export async function choosePaymentRail(raw: unknown): Promise<ActionResult<ChoiceSaved>> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail<ChoiceSaved>("bad_choice" satisfies ChoiceRefusal);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("payment_rail_choose", {
      p_agreement: parsed.data.agreementId,
      p_choice: parsed.data.choice,
    });
    if (error) return fail("unavailable" satisfies ChoiceRefusal);
    const answer = (data ?? {}) as { status?: unknown; choice?: unknown };
    if (answer.status !== "ok") return fail(readChoiceRefusal(answer.status));
    revalidatePath(`/agreements/${parsed.data.agreementId}`);
    return ok({ choice: parsed.data.choice });
  } catch {
    return fail("unavailable" satisfies ChoiceRefusal);
  }
}
