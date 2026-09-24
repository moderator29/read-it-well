"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { doneKeyFor, type DoneKey } from "./reply";
import { callLandlordRpc } from "./rpc";

/**
 * THE LANDLORD'S TWO ACTIONS ON THE REPLY PAGE: ANSWER, AND STOP.
 *
 * Signed out by design. The landlord has no account, and the only thing that
 * lets them act is the token in the link we sent to their number, so the token
 * IS the authorisation, checked inside the database by `landlord_line_answer`
 * and `landlord_line_stop` against its sha256. Neither function returns
 * anything about a property to the caller: the answer comes back as a state
 * word and the page re-reads what it shows.
 *
 * The token is 24 random bytes; a guess is not a meaningful attack. The shape
 * check here only saves a round trip on something that is plainly not a token.
 */

const TOKEN = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);
const ANSWER = z.enum(["available", "let", "not_instructed", "confirmed", "disputed"]);

export type AnswerOutcome = { done: DoneKey } | { state: "used" | "expired" | "unknown" | "closed" };

const FAILED = "Your answer did not reach us. Nothing has changed. Please try again.";

function outcomeOf(data: unknown): AnswerOutcome | null {
  const row = (data ?? {}) as { state?: unknown; answer?: unknown };
  if (row.state === "answered" && typeof row.answer === "string") {
    const done = doneKeyFor(row.answer);
    return done ? { done } : null;
  }
  if (row.state === "stopped") return { done: "stopped" };
  if (row.state === "used" || row.state === "expired" || row.state === "unknown" || row.state === "closed") {
    return { state: row.state };
  }
  return null;
}

export async function answerPrincipalQuestion(
  _prev: ActionResult<AnswerOutcome> | null,
  form: FormData,
): Promise<ActionResult<AnswerOutcome>> {
  const token = TOKEN.safeParse(form.get("token"));
  const answer = ANSWER.safeParse(form.get("answer"));
  if (!token.success) return ok({ state: "unknown" });
  if (!answer.success) return fail(FAILED);
  const noteRaw = form.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 400) : null;

  if (!isSupabaseConfigured()) return fail(FAILED);
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "landlord_line_answer", {
      p_token: token.data,
      p_answer: answer.data,
      p_note: answer.data === "disputed" ? note : null,
    });
    if (error) return fail(FAILED);
    const outcome = outcomeOf(data);
    return outcome ? ok(outcome) : fail(FAILED);
  } catch {
    return fail(FAILED);
  }
}

export async function stopPrincipalMessages(
  _prev: ActionResult<AnswerOutcome> | null,
  form: FormData,
): Promise<ActionResult<AnswerOutcome>> {
  const token = TOKEN.safeParse(form.get("token"));
  if (!token.success) return ok({ state: "unknown" });
  if (!isSupabaseConfigured()) return fail(FAILED);
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "landlord_line_stop", { p_token: token.data });
    if (error) return fail(FAILED);
    const outcome = outcomeOf(data);
    return outcome ? ok(outcome) : fail(FAILED);
  } catch {
    return fail(FAILED);
  }
}
