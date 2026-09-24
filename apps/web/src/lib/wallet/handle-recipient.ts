import "server-only";

import { getAdminClient } from "./ledger";

/**
 * The account email behind a public handle, for prefilling a payer's send
 * form from a shared request (see request-link.ts). Server only: the address
 * goes to the signed-in payer's own form and nowhere else. Null when the
 * handle is unclaimed or anything fails, in which case the form opens empty.
 */
export async function emailForHandle(handle: string): Promise<string | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  try {
    const { data } = await admin
      .from("social_profiles")
      .select("user_id")
      .eq("handle", handle.toLowerCase())
      .maybeSingle();
    if (!data?.user_id) return null;
    const { data: user } = await admin.auth.admin.getUserById(data.user_id);
    return user?.user?.email ?? null;
  } catch {
    return null;
  }
}
