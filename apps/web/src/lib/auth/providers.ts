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
 *    Supabase dashboard, which this application cannot detect from here.
 *
 * ---------------------------------------------------------------------------
 * GOOGLE IS ON BY DEFAULT NOW, AND APPLE IS NOT.
 *
 * Both used to be off until NEXT_PUBLIC_AUTH_PROVIDERS named them, on the
 * reasoning that offering a provider the dashboard has not enabled sends
 * somebody to an error page. That reasoning is right and it produced the wrong
 * default: Google IS enabled in this project's Supabase dashboard, the owner
 * has confirmed it twice, and the sign-up screen was still showing one email
 * button because a variable nobody had reason to know about was unset. A
 * correct default that is wrong about the actual deployment is not correct.
 *
 * So the two providers are defaulted separately, on what is actually true of
 * each:
 *
 *   GOOGLE  on. Configured in the dashboard, works today.
 *   APPLE   off. Apple sign-in requires an Apple Developer team, a Services ID
 *           and a signing key, and the owner has said plainly that they will do
 *           that when they take the app to the App Store. Drawing the button
 *           before then is a control that can only fail, which is the same
 *           defect as a Reserve button on a listing nobody can book.
 *
 * The environment variable still wins whenever it names anything:
 * `NEXT_PUBLIC_AUTH_PROVIDERS=google,apple` adds Apple the day it is ready, and
 * `NEXT_PUBLIC_AUTH_PROVIDERS=none` turns every social off without a deploy. It
 * is an override now rather than a switch that has to be found.
 *
 * AN EMPTY VALUE MEANS UNSET, NOT "NONE", and that is not fastidiousness. The
 * example env file shipped `NEXT_PUBLIC_AUTH_PROVIDERS=` with nothing after it,
 * so any deployment configured by copying that file has the variable present
 * and blank. Reading blank as a deliberate "turn everything off" would mean
 * this change did nothing at all on the one deployment it exists to fix. A
 * value nobody typed is not an instruction; `none` is a word somebody has to
 * mean.
 */

export type ProviderId = "email" | "google" | "apple";

export type ProviderState = {
  id: ProviderId;
  configured: boolean;
};

const SOCIAL_IDS = ["google", "apple"] as const;

/**
 * Which socials are offered: the override if there is one, the defaults if not.
 *
 * Unset, or set to nothing, means nobody has expressed an opinion and the
 * defaults apply. `none` is how somebody says they want no socials at all: an
 * explicit word rather than an absence, for the reason in the note above.
 */
const DEFAULT_SOCIALS = ["google"] as const;

function enabledSocials(): Set<string> {
  const named = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  if (named.length === 0) return new Set<string>(DEFAULT_SOCIALS);
  if (named.includes("none")) return new Set<string>();
  return new Set(named);
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
