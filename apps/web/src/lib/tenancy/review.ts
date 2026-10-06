/**
 * review: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./review-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";

/**
 * THE TENANCY REVIEW (V-59), THE PURE HALF.
 *
 * The one question the market's racket hides from: did the tenant pay
 * anything to anybody beyond what they paid on Vallo? It is asked first, a
 * month after moving in (the extra ask happens at the door), before any
 * stars. The answer to it is private and counted; only the count of tenants
 * who paid NOTHING more is ever public.
 *
 * The values mirror `public.tenancy_reviews` exactly, and the "how much, to
 * whom" pair belongs to a yes and only to a yes, as the table's check says.
 */
import {
  EXTRA_TO,
  TRI,
} from "./review-model";
export * from "./review-model";

export const tenancyReviewSchema = z
  .object({
    paymentId: z.string().uuid("That tenancy could not be found."),
    paidExtra: z.enum(["no", "yes"]),
    /** Whole naira as typed; stored as kobo. */
    extraNaira: z.number().int().positive().max(1_000_000_000).optional(),
    extraTo: z.enum(EXTRA_TO).optional(),
    asListed: z.enum(TRI),
    agentOnTime: z.enum(TRI),
    again: z.enum(TRI),
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.paidExtra === "yes" || (v.extraNaira === undefined && v.extraTo === undefined), {
    message: "How much and to whom only belong to a yes.",
  });

export type TenancyReviewInput = z.infer<typeof tenancyReviewSchema>;
