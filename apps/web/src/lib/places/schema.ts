import { z } from "zod";

/**
 * What a client may say about where it lives and what it does.
 *
 * Codes only. A name is a label that changes; a code is the row. `state_code`
 * is two letters, `lga_code` is `<state>_<name>` lower cased, and an occupation
 * code is a short slug. Every one of them is checked again by a foreign key,
 * and the state-to-local-government pairing is checked a third time by a
 * database trigger, because a form is not a security boundary.
 *
 * Empty string means "clear this", which is a real answer. Someone who filled
 * in a local government by mistake must be able to take it out again.
 */

const STATE_CODE_RE = /^[A-Z]{2}$/;
const LGA_CODE_RE = /^[a-z]{2}_[a-z0-9_]{2,60}$/;
const OCCUPATION_CODE_RE = /^[a-z0-9_]{2,60}$/;

export const updatePlaceSchema = z
  .object({
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .default("")
      .refine(
        (value) => value === "" || STATE_CODE_RE.test(value),
        "Choose a state from the list.",
      ),
    lgaCode: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .default("")
      .refine(
        (value) => value === "" || LGA_CODE_RE.test(value),
        "Choose a local government from the list.",
      ),
    occupationCode: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .default("")
      .refine(
        (value) => value === "" || OCCUPATION_CODE_RE.test(value),
        "Choose what you do from the list.",
      ),
  })
  .refine((value) => !(value.lgaCode !== "" && value.stateCode === ""), {
    message: "Choose your state before your local government.",
    path: ["stateCode"],
  });

export type UpdatePlaceInput = z.input<typeof updatePlaceSchema>;
export type UpdatePlaceValues = z.output<typeof updatePlaceSchema>;
