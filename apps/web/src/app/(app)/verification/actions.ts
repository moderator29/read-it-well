"use server";

import type { KycSubmission, KycSubmitResult } from "@/components/verification/kyc";

/**
 * Send a verification submission for review.
 *
 * ---------------------------------------------------------------------------
 * THIS IS NOT WIRED YET, AND IT SAYS SO OUT LOUD RATHER THAN PRETENDING.
 *
 * The screens are built. The storage is not: the bucket for identity documents
 * and the table the submission lands in are being built alongside this, and
 * this function is the single seam between the two. There were two tempting
 * ways to ship this half and both are worse than an honest refusal:
 *
 *  1. **Guess the schema.** Write `supabase.from("kyc_submissions").insert(...)`
 *     against a table nobody has created. It compiles, it type-errors only
 *     against generated types that do not include it yet, and it fails at
 *     runtime with a Postgres error in front of somebody who has just uploaded
 *     a photograph of their passport.
 *
 *  2. **Return `{ ok: true }` and drop it.** Show the submitted screen, which
 *     promises a human is reading their documents, having stored nothing. That
 *     is the worst lie in this whole flow and it would be invisible until
 *     somebody rang up asking why their approval never came.
 *
 * So it refuses, in a sentence that tells the truth: nothing was sent, nothing
 * was lost, and the person is not at fault. `KycFlow` prints exactly this on the
 * review step and keeps every answer where it was.
 *
 * TO FINISH IT: upload each document to the identity bucket under the caller's
 * own id, insert one row carrying the storage paths, the business answers and
 * the three consent flags with their timestamps, and return `{ ok: true }`.
 * Nothing in `components/verification` changes.
 */
export async function submitVerification(
  submission: KycSubmission,
): Promise<KycSubmitResult> {
  /* Referenced so the parameter is not silently unused while this is a stub,
     and so the shape stays honest if the payload changes underneath it. */
  void submission;

  return {
    ok: false,
    message:
      "We cannot accept documents just yet: identity storage is still being switched on. Nothing was sent and nothing you entered was lost. Please try again shortly.",
  };
}
