import { z } from "zod";

/**
 * SUP-05: what an applicant sends back when the reviewer asked for more.
 *
 * An answer in words, documents, or both; never neither, because "sent back"
 * with nothing new in it only puts the same application at the back of the
 * queue. Document paths are checked against the caller's own uid folder by
 * the action (storage RLS enforces the same on the upload itself).
 */
export const RESPONSE_MAX_CHARS = 2000;
export const RESPONSE_MAX_DOCUMENTS = 3;

/** The kinds an applicant may file against their own application. */
export const RESPONSE_DOCUMENT_KINDS = ["identity", "address", "business", "selfie", "association"] as const;

export const reviewResponseSchema = z
  .object({
    answer: z
      .string()
      .trim()
      .max(RESPONSE_MAX_CHARS, `Keep the answer to ${RESPONSE_MAX_CHARS.toLocaleString("en-NG")} characters.`)
      .default(""),
    documents: z
      .array(
        z.object({
          kind: z.enum(RESPONSE_DOCUMENT_KINDS),
          path: z.string().trim().min(1).max(400),
        }),
      )
      .max(RESPONSE_MAX_DOCUMENTS)
      .default([]),
  })
  .refine((value) => value.answer.length > 0 || value.documents.length > 0, {
    message: "empty",
    path: ["answer"],
  });

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

/** Every document path must sit in the caller's own folder. */
export function pathsBelongTo(userId: string, documents: ReviewResponse["documents"]): boolean {
  const prefix = `${userId}/`;
  return documents.every((doc) => doc.path.startsWith(prefix) && !doc.path.includes(".."));
}
