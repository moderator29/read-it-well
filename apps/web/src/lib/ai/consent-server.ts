import "server-only";

import { cookies } from "next/headers";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseSettings } from "@/lib/profile/schema";

import { AI_CONSENT_COOKIE, consentCurrent, parseConsentCookie } from "./consent";

/**
 * Has the person making this request agreed (STORE-07)? The account record
 * when signed in, else this device's cookie. Any read failure is NO: the
 * routes then refuse rather than send.
 */
export async function hasAiConsent(input: {
  supabase?: SupabaseClient | null;
  userId?: string | null;
}): Promise<boolean> {
  try {
    const jar = await cookies();
    if (consentCurrent(parseConsentCookie(jar.get(AI_CONSENT_COOKIE)?.value))) return true;
  } catch {
    /* no request context: fall through to the account */
  }
  if (!input.supabase || !input.userId) return false;
  try {
    const { data } = await input.supabase
      .from("profiles")
      .select("settings")
      .eq("id", input.userId)
      .maybeSingle();
    return consentCurrent(parseSettings((data as { settings?: unknown } | null)?.settings).aiConsent);
  } catch {
    return false;
  }
}

/** The same answer for the page that mounts an AI surface, so it can ask first. */
export async function aiConsentForViewer(): Promise<boolean> {
  const { resolveSession } = await import("@/lib/actions/session");
  const session = await resolveSession();
  return hasAiConsent(
    session.state === "signed-in" ? { supabase: session.supabase, userId: session.user.id } : {},
  );
}
