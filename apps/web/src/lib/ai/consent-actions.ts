"use server";

import { cookies } from "next/headers";

import { resolveSession } from "@/lib/actions/session";
import { mergeSettings } from "@/lib/profile/schema";

import {
  AI_CONSENT_COOKIE,
  AI_CONSENT_COOKIE_MAX_AGE,
  AI_CONSENT_VERSION,
  consentCookieValue,
} from "./consent";

/**
 * Record that this person agreed to the AI disclosure (STORE-07): a cookie on
 * this device, and on the account when signed in. Signed in, the account
 * record is the one the routes read, so a failed write is a failure.
 */
export async function recordAiConsent(): Promise<{ ok: boolean; onAccount: boolean }> {
  const now = new Date();
  const jar = await cookies();
  jar.set(AI_CONSENT_COOKIE, consentCookieValue(now), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: AI_CONSENT_COOKIE_MAX_AGE,
  });

  const session = await resolveSession();
  if (session.state !== "signed-in") return { ok: true, onAccount: false };
  const { data } = await session.supabase
    .from("profiles")
    .select("settings")
    .eq("id", session.user.id)
    .maybeSingle();
  const { error } = await session.supabase
    .from("profiles")
    .update({
      settings: mergeSettings(data?.settings, {
        aiConsent: { version: AI_CONSENT_VERSION, at: now.toISOString() },
      }),
    })
    .eq("id", session.user.id);
  return { ok: !error, onAccount: !error };
}

/** Withdraw it: the cookie goes and the account record is cleared. */
export async function withdrawAiConsent(): Promise<{ ok: true }> {
  const jar = await cookies();
  jar.delete(AI_CONSENT_COOKIE);
  const session = await resolveSession();
  if (session.state === "signed-in") {
    const { data } = await session.supabase
      .from("profiles")
      .select("settings")
      .eq("id", session.user.id)
      .maybeSingle();
    await session.supabase
      .from("profiles")
      .update({ settings: mergeSettings(data?.settings, { aiConsent: null }) })
      .eq("id", session.user.id);
  }
  return { ok: true };
}
