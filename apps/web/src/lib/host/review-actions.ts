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
import { fill, hostRefusals } from "./refusals";

const REPLY_MAX = 1200;

/* The words are the host's (`experienceHost.refusals.reviews`), read per call. */
type Words = Awaited<ReturnType<typeof hostRefusals>>["reviews"];

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

const replySchema = (w: Words) =>
  z.object({
    reviewId: z.uuid(w.reviewUnknown),
    body: z.string().trim().min(1, w.writeFirst).max(REPLY_MAX, fill(w.replyTooLong, { max: REPLY_MAX })),
  });

/** Write or correct the one public answer to a review. */
export async function answerHotelReview(input: unknown): Promise<ActionResult<{ body: string }>> {
  const w = (await hostRefusals()).reviews;
  const parsed = validate(replySchema(w), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  /* agent_id and responder_id are stamped by the database trigger. */
  const { error } = await got.db
    .from("review_responses")
    .upsert({ review_id: parsed.data.reviewId, body: parsed.data.body }, { onConflict: "review_id" });
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204" || error.code === "23502") return fail(w.notReady);
    if (error.code === "42501") return fail(w.notYours);
    const refused = contentRefusal(error);
    if (refused) return fail(refused, { body: refused });
    return fail(w.serviceDown);
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
  if (error) return fail((await hostRefusals()).reviews.serviceDown);
  revalidatePath("/host/reviews");
  return ok(null);
}

const contestSchema = (w: Words) =>
  z.object({
    reviewId: z.uuid(w.reviewUnknown),
    criterion: z.string().refine(isContestCriterion, w.pickReason),
    note: z.string().trim().max(CONTEST_NOTE_MAX, fill(w.keepItUnder, { max: CONTEST_NOTE_MAX })).optional(),
  });

/** The contest function's refusals, by the status it returned. */
const contestRefused = (w: Words): Record<string, string> => ({
  signed_out: SIGNED_OUT_MESSAGE,
  not_yours: w.notYours,
  bad_criterion: w.pickReason,
  note_too_long: fill(w.noteTooLong, { max: CONTEST_NOTE_MAX }),
  already_open: w.alreadyOpen,
  rate_limited: w.rateLimited,
});

/** Ask Vallo to look at a review against the published criteria. */
export async function contestHotelReview(input: unknown): Promise<ActionResult<null>> {
  const w = (await hostRefusals()).reviews;
  const refusedFor = contestRefused(w);
  const parsed = validate(contestSchema(w), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  const { data, error } = await got.db.rpc("contest_review", {
    p_review: parsed.data.reviewId,
    p_criterion: parsed.data.criterion,
    p_note: parsed.data.note ?? null,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return fail(w.notReady);
    const limited = /limit/i.test(error.message ?? "");
    return fail(limited ? w.rateLimited : w.serviceDown);
  }
  const status = (data as { status?: string } | null)?.status ?? "";
  if (status !== "ok") return fail(refusedFor[status] ?? w.serviceDown);
  revalidatePath("/host/reviews");
  return ok(null);
}
