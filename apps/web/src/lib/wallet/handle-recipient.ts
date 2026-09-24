import "server-only";

import { createClient } from "@/lib/supabase/server";
import { consume, subjectForUser } from "@/lib/security/rate-limit";
import { findUserByEmail, getAdminClient } from "./ledger";
import type { RecipientInput } from "./recipient-input";

/**
 * The account behind a public handle, read AS THE VIEWER. The viewer's own
 * client is used on purpose: `social_profiles_select` hides a profile when
 * either person has blocked the other, so a blocked handle resolves to
 * nobody. Only the account id comes back; the address behind it is never
 * read here, so it cannot reach a page or a form.
 */
export async function userIdForHandle(handle: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("social_profiles")
      .select("user_id")
      .eq("handle", handle.toLowerCase())
      .maybeSingle();
    return data?.user_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether either person has blocked the other. Fails closed: a read that
 * cannot answer counts as blocked, so the send form says "no account"
 * rather than paying somebody who may have blocked the payer.
 */
export async function blockedEitherWay(viewerId: string, otherId: string): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return true;
  try {
    const { data, error } = await admin
      .from("blocks")
      .select("user_id")
      .or(
        `and(user_id.eq.${viewerId},other_id.eq.${otherId}),and(user_id.eq.${otherId},other_id.eq.${viewerId})`,
      )
      .limit(1);
    if (error) return true;
    return (data ?? []).length > 0;
  } catch {
    return true;
  }
}

/**
 * One budget for every recipient lookup a member makes, whichever door asks
 * (the send form's check as it is typed, and the send itself): enough for a
 * person correcting a typo, not enough to walk a list of addresses.
 */
export const RECIPIENT_LOOKUP_PACE = { bucket: "wallet_recipient_lookup", limit: 40, windowSeconds: 600 } as const;

export async function paceRecipientLookup(
  viewerId: string,
): Promise<{ allowed: true } | { allowed: false; retryIn: string }> {
  const pace = await consume({ ...RECIPIENT_LOOKUP_PACE, subject: subjectForUser(viewerId) });
  return pace.allowed ? { allowed: true } : { allowed: false, retryIn: pace.retryIn };
}

/**
 * The account a send form's recipient field names, for this viewer, or null.
 *
 * NEW-A2-04: an address nobody uses and an address whose owner has blocked
 * the viewer (or whom the viewer has blocked) both answer null, so the form
 * and the send say the same "no account" either way and the field cannot be
 * used to learn who has blocked whom. The viewer's own account resolves, so
 * the callers can say "that is you".
 */
export async function resolveRecipientId(
  input: RecipientInput,
  viewerId: string,
): Promise<string | null> {
  const id =
    input.kind === "handle"
      ? await userIdForHandle(input.handle)
      : ((await findUserByEmail(input.email))?.id ?? null);
  if (!id) return null;
  if (id === viewerId) return id;
  return (await blockedEitherWay(viewerId, id)) ? null : id;
}
