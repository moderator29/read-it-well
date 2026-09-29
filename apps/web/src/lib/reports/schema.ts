import { z } from "zod";

import {
  DETAILS_MAX,
  REPORT_CATEGORIES,
  REPORT_TARGETS,
} from "./categories";

/* The vocabulary (categories, their copy and order, the targets and their
   nouns, the details limit) is plain data in `./categories`, so the report
   sheet can draw it without shipping zod. Re-exported so every existing
   import of this module keeps working. */
export * from "./categories";

export const reportInputSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1, "This could not be identified.").max(200),
  category: z.enum(REPORT_CATEGORIES, { message: "Pick the closest reason." }),
  details: z
    .string()
    .trim()
    .max(DETAILS_MAX, `Keep it under ${DETAILS_MAX} characters.`)
    .optional(),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
