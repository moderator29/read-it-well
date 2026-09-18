"use server";

import { z } from "zod";
import { fail, validate, type ActionResult } from "@/lib/actions/envelope";
import { fileSupportTicket } from "@/lib/support/actions";

/**
 * The footer's "stay connected" field.
 *
 * There is no newsletter backend on this platform: no list, no sender, no
 * unsubscribe link, and nothing in the schema to hold an address on its own.
 * Rather than a field that swallows an email and does nothing (a picture of
 * a feature, which the ONE LAW forbids), the field files a real support
 * ticket through the same path as the contact form, topic "other", body
 * "keep me posted". A person on the support desk sees it, the address gets
 * the same acknowledgement email every ticket gets, and the reference the
 * form shows is real. The footer says so in one line under the field. When a
 * newsletter backend lands, this action is the one place to point at it.
 *
 * Rate limiting, the feature flag and the unconfigured state are all
 * `fileSupportTicket`'s and arrive here through the envelope.
 */
const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Add an email address so we know where to write.")
    .email("Enter a valid email address.")
    .max(200),
});

export async function subscribeToUpdates(
  _prev: ActionResult<{ reference: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ reference: string }>> {
  const parsed = validate(schema, { email: formData.get("email") });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  return fileSupportTicket({
    name: "Newsletter sign-up",
    email: parsed.data.email,
    topic: "other",
    body: "Keep me posted about Vallo: new listings and product news. Filed from the newsletter field in the site footer.",
  });
}
