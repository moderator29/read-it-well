import { z } from "zod";

/**
 * Host reply input, and the constants both the form and the action share.
 *
 * Client-safe on purpose: this module imports nothing server-only, so the
 * reply form can use the length limit without dragging a server module into
 * the browser bundle.
 */

/** The longest reply we accept. The database checks the same bound. */
export const REPLY_MAX = 1200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const replyInputSchema = z.object({
  reviewId: z
    .string()
    .refine((value) => UUID_RE.test(value), "This review could not be identified."),
  body: z
    .string()
    .trim()
    .min(2, "Write a sentence at least. A one-character reply says nothing to the next guest.")
    .max(REPLY_MAX, `Keep your reply under ${REPLY_MAX} characters.`),
});

export const replyRemoveSchema = z.object({
  reviewId: z
    .string()
    .refine((value) => UUID_RE.test(value), "This review could not be identified."),
});

export type ReplyInput = z.infer<typeof replyInputSchema>;
