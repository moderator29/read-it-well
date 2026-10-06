/**
 * areas-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./areas-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";
import {
  AREA_KINDS,
  MODERATOR_REASON_MAX,
  MODERATOR_REASON_MIN,
} from "./areas-model";
export * from "./areas-model";

export const proposeAreaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the place its name, the one people actually say.")
    .max(60, "That name is too long. Use the short one people say out loud."),
  kind: z.enum(AREA_KINDS),
  stateCode: z.string().trim().min(2, "Choose the state this place is in.").max(8),
  city: z
    .string()
    .trim()
    .min(2, "Which city or town is it in?")
    .max(60, "That city name is too long."),
  blurb: z
    .string()
    .trim()
    .max(200, "Keep it to 200 characters. One line is plenty.")
    .optional()
    .or(z.literal("")),
});

export type ProposeAreaInput = z.infer<typeof proposeAreaSchema>;

export const moderatorApplicationSchema = z.object({
  areaId: z.string().uuid("Choose a place to look after."),
  reason: z
    .string()
    .trim()
    .min(
      MODERATOR_REASON_MIN,
      "Tell us a bit more. What do you know about this place, and how long have you been around it?",
    )
    .max(MODERATOR_REASON_MAX, "Keep it under 600 characters."),
});

export type ModeratorApplicationInput = z.infer<typeof moderatorApplicationSchema>;

export const areaIdSchema = z.object({
  areaId: z.string().uuid("That place could not be found."),
});

/* ------------------------------------------------------------------ *
 * Copy. Kept here so the same sentence cannot drift between a page, a
 * form and a notification.
 * ------------------------------------------------------------------ */
