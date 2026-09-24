import "server-only";

import { cookies } from "next/headers";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseSettings } from "@/lib/profile/schema";

import { AI_CONSENT_COOKIE, consentCurrent, parseConsentCookie } from "./consent";

/**
 * Has the person making this request agreed (STORE-07)?
 *
 * Signed in, the ACCOUNT RECORD decides and the cookie is not consulted: the
 * stored setting is the record of consent that can be shown later, and a
 * cookie from an earlier signed-out visit on a shared device is not this
 * person's agreement. Signed out, this device's cookie is all there is. Any
 * read failure is NO: the routes then refuse rather than send.
 */
export async function hasAiConsent(input: {
  supabase?: SupabaseClient | null;
  userId?: string | null;
}): Promise<boolean> {
  if (input.supabase && input.userId) {
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
  try {
    const jar = await cookies();
    return consentCurrent(parseConsentCookie(jar.get(AI_CONSENT_COOKIE)?.value));
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
