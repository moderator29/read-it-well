import "server-only";

import { createClient } from "@/lib/supabase/server";
import { findUserByEmail } from "./ledger";
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

/** The account a send form's recipient field names, or null. */
export async function resolveRecipientId(input: RecipientInput): Promise<string | null> {
  if (input.kind === "handle") return userIdForHandle(input.handle);
  const user = await findUserByEmail(input.email);
  return user?.id ?? null;
}
