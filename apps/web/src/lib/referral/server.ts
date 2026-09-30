import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, normaliseInviteCode } from "./code";

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * A5. The signed-in member's own invite code, made on first ask through
 * `public.my_referral_code()`. Null when signed out, or until the pending
 * migration `20260930180000_a5_invite_codes_a_member_can_share.sql` is
 * applied (the function does not exist, the call fails, the page says the
 * link could not be made).
 */
export async function myInviteCode(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as unknown as Rpc)("my_referral_code");
    return error ? null : normaliseInviteCode(typeof data === "string" ? data : null);
  } catch {
    return null;
  }
}

/** What the invite door may show about a code: whether it exists, and a first name at most. */
export async function inviteDoor(code: string): Promise<{ found: boolean; firstName: string | null } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as unknown as Rpc)("referral_door", { p_code: code });
    if (error || !data || typeof data !== "object") return null;
    const row = data as { found?: boolean; first_name?: string | null };
    return { found: row.found === true, firstName: row.first_name ? String(row.first_name).slice(0, 40) : null };
  } catch {
    return null;
  }
}

/**
 * The code the invite door left in this browser, for sign-up to record when
 * the form's own field is empty. For `lib/auth/actions.ts`
 * (`signUpWithEmail`): `referral_code: typed || (await inviteCodeFromCookie())`.
 */
export async function inviteCodeFromCookie(): Promise<string | null> {
  try {
    return normaliseInviteCode((await cookies()).get(INVITE_COOKIE)?.value);
  } catch {
    return null;
  }
}
