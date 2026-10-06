/**
 * reviews-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./reviews-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";

/**
 * Host reply input, and the constants both the form and the action share.
 *
 * Client-safe on purpose: this module imports nothing server-only, so the
 * reply form can use the length limit without dragging a server module into
 * the browser bundle.
 */
import {
  REPLY_MAX,
  UUID_RE,
} from "./reviews-model";
export * from "./reviews-model";

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
