/**
 * application-respond-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./application-respond-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";
import {
  RESPONSE_DOCUMENT_KINDS,
  RESPONSE_MAX_CHARS,
  RESPONSE_MAX_DOCUMENTS,
} from "./application-respond-model";
export * from "./application-respond-model";

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
