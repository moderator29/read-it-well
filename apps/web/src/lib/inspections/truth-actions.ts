"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveSession, NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE } from "../actions/session";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { TRUTH_ANSWERS, truthRow } from "./truth";

/**
 * ANSWERING THE FOUR TRUTH QUESTIONS (V-05).
 *
 * One insert under the renter's own RLS client. Everything that matters is in
 * the database: `inspection_truth_insert_requester` admits only the requester
 * of an accepted or closed inspection whose time has passed, the before
 * trigger fills the listing and the time from the inspection rather than the
 * caller, there is no update or delete grant so an answer is final, and the
 * after trigger files the off-platform report and (behind its flag) the
 * bait-listing pause. This function validates the shape and turns a refusal
 * into a sentence.
 */

const answer = z.enum(TRUTH_ANSWERS);

const schema = z.object({
  inspectionId: z.string().uuid("That inspection could not be found."),
  answers: z.object({
    agentMatched: answer,
    propertyMatched: answer,
    available: answer,
    offPlatformAsk: answer,
  }),
});

const NOT_OPEN =
  "These questions open once the agreed time for the inspection has passed, and only for the person who asked to see it.";
const ALREADY = "You have already answered for this inspection. Answers cannot be changed.";
const FAILED = "Your answers did not send. Nothing was recorded. Try again.";

type Untyped = {
  from(table: string): {
    insert(row: Record<string, string>): Promise<{ error: { code?: string } | null }>;
  };
};

export async function answerTruthQuestions(
  input: unknown,
): Promise<ActionResult<{ reportOpened: boolean }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error } = await (session.supabase as unknown as Untyped)
    .from("inspection_truth")
    .insert(truthRow(parsed.data.inspectionId, session.user.id, parsed.data.answers));

  if (error) {
    if (error.code === "23505") return fail(ALREADY);
    if (error.code === "42501") return fail(NOT_OPEN);
    return fail(FAILED);
  }

  revalidatePath("/inspections");
  return ok({ reportOpened: parsed.data.answers.offPlatformAsk === "yes" });
}
