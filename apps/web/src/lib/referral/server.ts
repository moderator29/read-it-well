import "server-only";

import { cookies, headers } from "next/headers";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, normaliseInviteCode } from "./code";

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * A5. The signed-in member's own invite code, made on first ask through
 * `public.my_referral_code()`. Null when signed out, or if the migration
 * `20260930084741_a5_invite_codes_a_member_can_share.sql` (applied
 * 30 September 2026) were missing (the function would not exist, the call
 * fails, the page says the link could not be made).
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

/**
 * What the invite door may show about a code: whether it exists, and a first
 * name at most. Rate limited per address and FAILS CLOSED: a caller walking
 * codes to collect first names is answered as if no code matched, and so is
 * a limiter that cannot answer. Twenty lookups in ten minutes is more than a
 * person opening invites will ever need.
 */
export async function inviteDoor(code: string): Promise<{ found: boolean; firstName: string | null } | null> {
  try {
    const verdict = await consume({
      bucket: "invite_door",
      subject: subjectForIp(ipFromHeaders(await headers())),
      limit: 20,
      windowSeconds: 600,
    });
    if (!verdict.allowed || verdict.degraded) return null;
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
