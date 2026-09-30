import "server-only";

import { adminOrNull, type EmailChannel } from "./recipients";
import { maskEmail } from "./unsubscribe-token";
import { parseSettings, type NotificationSettings } from "@/lib/profile/schema";

/**
 * A12. The email switches of ONE account, read and written on the authority
 * of a signed token rather than a session (`unsubscribe-token.ts`).
 *
 * Through the service role, because the person is not signed in; the token
 * has already named the account, and this module touches only
 * `profiles.settings.notifications` for it, merged so every other setting
 * stays exactly as it was. The address is returned masked, never whole, and
 * nothing else about the account is read.
 */
export type EmailPreferences = { masked: string; notifications: NotificationSettings };

export async function readEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  const admin = adminOrNull();
  if (!admin) return null;
  try {
    const [{ data: profile }, { data: user }] = await Promise.all([
      admin.from("profiles").select("settings").eq("id", userId).maybeSingle(),
      admin.auth.admin.getUserById(userId),
    ]);
    const email = user?.user?.email ?? "";
    if (!email) return null;
    return { masked: maskEmail(email), notifications: parseSettings(profile?.settings ?? {}).notifications };
  } catch {
    return null;
  }
}

/** Merge a change into the stored switches. True when it was written. */
export async function writeEmailPreferences(
  userId: string,
  patch: Partial<Record<EmailChannel, boolean>>,
): Promise<boolean> {
  const admin = adminOrNull();
  if (!admin) return false;
  try {
    const { data, error } = await admin.from("profiles").select("settings").eq("id", userId).maybeSingle();
    if (error || !data) return false;
    const stored = data.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? (data.settings as Record<string, unknown>) : {};
    const current = stored.notifications && typeof stored.notifications === "object" ? (stored.notifications as Record<string, unknown>) : {};
    const next = { ...stored, notifications: { ...current, ...patch } };
    const { error: writeError } = await admin.from("profiles").update({ settings: next as never }).eq("id", userId);
    return !writeError;
  } catch {
    return false;
  }
}
