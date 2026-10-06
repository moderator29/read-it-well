/**
 * profiles-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./profiles-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";

/**
 * The social profile's shape, and the constants both the form and the action
 * share.
 *
 * Client-safe on purpose: nothing here imports a server-only module, so the
 * editor can read the character limits, the contact policy labels and the
 * handle rules without dragging the server into the browser bundle. A client
 * component importing a value from a `"use server"` file typechecks cleanly and
 * fails the build, which is exactly the trap this split exists to avoid.
 *
 * Every limit below mirrors a constraint that the database already enforces.
 * The database is the authority; these exist so a person is told what is wrong
 * while they are typing rather than after a round trip.
 */

/* ------------------------------------------------------------------ limits */
import {
  BIO_MAX,
  CONTACT_POLICIES,
  HANDLE_HELP,
  HANDLE_MAX,
  HANDLE_MIN,
  HANDLE_PATTERN,
  LINK_MAX,
  LINK_PATTERN,
  PRONOUNS_MAX,
  normaliseLink,
} from "./profiles-model";
export * from "./profiles-model";

/**
 * A handle, normalised the same way the database normalises it
 * (`new.handle := lower(btrim(new.handle))`) so what the person sees in the
 * field is what the unique index will actually hold.
 */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN, `A handle is at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `A handle is at most ${HANDLE_MAX} characters.`)
  .regex(HANDLE_PATTERN, HANDLE_HELP);

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .optional()
    .transform((v) => v ?? "");

export const socialProfileInputSchema = z.object({
  handle: handleSchema,
  bio: optionalText(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`),
  pronouns: optionalText(PRONOUNS_MAX, `Keep pronouns under ${PRONOUNS_MAX} characters.`),
  link: z
    .string()
    .trim()
    .max(LINK_MAX, `Keep the link under ${LINK_MAX} characters.`)
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v.length === 0 || LINK_PATTERN.test(v), {
      message: "That does not look like a web address. Try something like myshop.ng.",
    })
    .transform(normaliseLink)
    .refine((v) => v.length <= LINK_MAX, {
      message: `Keep the link under ${LINK_MAX} characters.`,
    }),
  contactPolicy: z.enum(CONTACT_POLICIES),
  /* Checkboxes post a value or nothing at all, so the form pairs each one with
     a hidden "off" field ahead of it and the last value wins. */
  pidginOk: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => v === "on"),
  homeAreaId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type SocialProfileInput = z.infer<typeof socialProfileInputSchema>;

/* ------------------------------------------------------------------- state */
