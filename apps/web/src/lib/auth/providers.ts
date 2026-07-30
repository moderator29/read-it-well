import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Which sign-in methods the platform can honestly offer right now.
 *
 * Auth runs on Supabase, which means the OAuth client secrets live in the
 * Supabase dashboard and never in this application. An earlier version of this
 * file asked the app for GOOGLE_CLIENT_SECRET and friends, which it will never
 * hold, so those buttons could never light up no matter how correctly the
 * dashboard was configured. That was the bug.
 *
 * The honest signals are:
 *  - email and password work as soon as Supabase itself is configured, because
 *    Supabase issues the session and sends the confirmation mail.
 *  - a social provider works only once the owner has enabled it in the
 *    Supabase dashboard, which this application cannot detect. So it is an
 *    explicit opt-in through NEXT_PUBLIC_AUTH_PROVIDERS, a comma separated
 *    list, set once the dashboard side is done. Offering a provider that is
 *    not enabled would send someone to an error page, so the default is off.
 */

export type ProviderId = "email" | "google" | "apple";

export type ProviderState = {
  id: ProviderId;
  configured: boolean;
};

const SOCIAL_IDS = ["google", "apple"] as const;

/** The opt-in list, lowercased and trimmed. Empty when unset. */
function enabledSocials(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

export function getProviderStates(): ProviderState[] {
  const supabaseReady = isSupabaseConfigured();
  const socials = enabledSocials();

  return [
    { id: "email", configured: supabaseReady },
    ...SOCIAL_IDS.map((id) => ({
      id,
      configured: supabaseReady && socials.has(id),
    })),
  ];
}

export function isAnyProviderConfigured(): boolean {
  return getProviderStates().some((p) => p.configured);
}
