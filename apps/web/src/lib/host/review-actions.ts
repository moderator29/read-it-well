"use server";

/**
 * A HOTEL OWNER ANSWERS A REVIEW, OR ASKS VALLO TO LOOK AT ONE (C4).
 *
 * Both write through the host's own client. The answer lands in
 * `review_responses`, where `private.owns_review_listing` (now true for a
 * hotel the caller owns) decides, and the stamp trigger records the host as
 * the responder. The contest goes through `public.contest_review`, which
 * checks the review is of the caller's own place, opens one contest and files
 * a report in the Reports lane. Neither touches the review itself: a review is
 * final, and only staff can hide one, with a public note.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { contentRefusal } from "../safety/content-refusal";
import { CONTEST_NOTE_MAX, isContestCriterion } from "./review-contest";

const REPLY_MAX = 1200;
const NOT_READY = "Reviews of hotel stays are not open yet. Nothing was saved.";
const SERVICE_DOWN = "We could not save that just now. Nothing was lost, so try again in a moment.";
const NOT_YOURS = "That review is not of one of your places. Refresh your reviews and answer one of your own.";

type DbError = { code?: string | null; message?: string | null };
type Untyped = {
  from: (t: string) => {
    upsert: (row: Record<string, unknown>, o: { onConflict: string }) => PromiseLike<{ error: DbError | null }>;
    delete: () => { eq: (c: string, v: string) => PromiseLike<{ error: DbError | null }> };
  };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DbError | null }>;
};

async function client() {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { ok: false as const, result: fail<never>(NOT_CONFIGURED_MESSAGE) };
  if (s.state === "signed-out") return { ok: false as const, result: fail<never>(SIGNED_OUT_MESSAGE) };
  return { ok: true as const, db: s.supabase as unknown as Untyped };
}

const replySchema = z.object({
  reviewId: z.uuid("This review could not be identified."),
  body: z.string().trim().min(1, "Write a reply first.").max(REPLY_MAX, `Keep your reply under ${REPLY_MAX} characters.`),
});

/** Write or correct the one public answer to a review. */
export async function answerHotelReview(input: unknown): Promise<ActionResult<{ body: string }>> {
  const parsed = validate(replySchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  /* agent_id and responder_id are stamped by the database trigger. */
  const { error } = await got.db
    .from("review_responses")
    .upsert({ review_id: parsed.data.reviewId, body: parsed.data.body }, { onConflict: "review_id" });
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204" || error.code === "23502") return fail(NOT_READY);
    if (error.code === "42501") return fail(NOT_YOURS);
    const refused = contentRefusal(error);
    if (refused) return fail(refused, { body: refused });
    return fail(SERVICE_DOWN);
  }
  revalidatePath("/host/reviews");
  return ok({ body: parsed.data.body });
}

/** Take the answer back. The review stays exactly where it was. */
export async function withdrawHotelReviewAnswer(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ reviewId: z.uuid() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  const { error } = await got.db.from("review_responses").delete().eq("review_id", parsed.data.reviewId);
  if (error) return fail(SERVICE_DOWN);
  revalidatePath("/host/reviews");
  return ok(null);
}

const contestSchema = z.object({
  reviewId: z.uuid("This review could not be identified."),
  criterion: z.string().refine(isContestCriterion, "Pick the reason that fits."),
  note: z.string().trim().max(CONTEST_NOTE_MAX, `Keep it under ${CONTEST_NOTE_MAX} characters.`).optional(),
});

const CONTEST_REFUSED: Record<string, string> = {
  signed_out: SIGNED_OUT_MESSAGE,
  not_yours: NOT_YOURS,
  bad_criterion: "Pick the reason that fits.",
  note_too_long: `Keep the note under ${CONTEST_NOTE_MAX} characters.`,
  already_open: "You have already asked us about this review. We will tell you what we decide.",
  rate_limited: "You have asked about a lot of reviews today. Try again tomorrow.",
};

/** Ask Vallo to look at a review against the published criteria. */
export async function contestHotelReview(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(contestSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  const { data, error } = await got.db.rpc("contest_review", {
    p_review: parsed.data.reviewId,
    p_criterion: parsed.data.criterion,
    p_note: parsed.data.note ?? null,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return fail(NOT_READY);
    const limited = /limit/i.test(error.message ?? "");
    return fail(limited ? CONTEST_REFUSED.rate_limited ?? SERVICE_DOWN : SERVICE_DOWN);
  }
  const status = (data as { status?: string } | null)?.status ?? "";
  if (status !== "ok") return fail(CONTEST_REFUSED[status] ?? SERVICE_DOWN);
  revalidatePath("/host/reviews");
  return ok(null);
}
