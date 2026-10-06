/**
 * places-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./places-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";
import {
  LGA_CODE_RE,
} from "./places-model";
export * from "./places-model";

export const enterPlaceSchema = z.object({
  lgaCode: z
    .string()
    .trim()
    .regex(LGA_CODE_RE, "Choose a local government from the list."),
});

export type EnterPlaceInput = z.infer<typeof enterPlaceSchema>;
