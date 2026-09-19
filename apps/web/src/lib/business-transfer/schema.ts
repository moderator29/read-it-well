import { z } from "zod";

/**
 * Everything the business transfer flow accepts from a client, validated on
 * the server before a single row is touched.
 *
 * THE ADDRESS IS NEVER STORED AND NEVER LOGGED. It exists inside one action
 * call, long enough to resolve the account it belongs to, and nowhere else.
 * `public.business_transfers` carries two user ids and never an address, and
 * the audit line carries uuids and counts. Rule 16.
 */

/** Offer a business to another Vallo account. */
export const offerTransferSchema = z.object({
  businessId: z.string().uuid("Pick one of your businesses."),
  email: z
    .string({ message: "Enter the email address of the person taking it over." })
    .trim()
    .min(3, "Enter the email address of the person taking it over.")
    .max(160, "That is longer than an email address.")
    .email("That does not look like an email address."),
  note: z
    .string()
    .trim()
    .max(400, "Keep the note under 400 characters.")
    .optional(),
});

export type OfferTransferInput = z.infer<typeof offerTransferSchema>;

/** Accept, decline or take back. The verb is validated rather than trusted. */
export const respondTransferSchema = z.object({
  transferId: z.string().uuid("That offer no longer exists."),
  decision: z.enum(["accept", "decline", "withdraw"], {
    message: "Choose accept, decline or take it back.",
  }),
});

export type RespondTransferInput = z.infer<typeof respondTransferSchema>;

/** Take a business off the market: the second of the two doors. */
export const closeBusinessSchema = z.object({
  businessId: z.string().uuid("Pick one of your businesses."),
});

export type CloseBusinessInput = z.infer<typeof closeBusinessSchema>;
