import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Which sign-in methods the platform offers, and which it REFUSES.
 *
 * STORE-02 / STORE-03. The recorded product decision (docs/PRODUCT.md, "No
 * Google or Apple sign in. Email and password only") had not reached the
 * code: `DEFAULT_SOCIALS` was `["google"]`, so the live sign-in and sign-up
 * screens drew "Continue with Google". That is also the App Store 4.8 trigger
 * (a third-party login with no equivalent privacy-preserving option), and on
 * the native shell a Google round trip cannot complete at all: the PKCE
 * verifier cookie lives in the web view's jar and the callback lands in the
 * system browser's.
 *
 * The rules, per provider and per SURFACE (the website, the iOS shell, the
 * Android shell):
 *
 *   EMAIL   on wherever Supabase is configured.
 *
 *   GOOGLE  OFF. Refused by `startOAuth` and by the callback, not only
 *           undrawn. The founder can reverse the decision for the WEBSITE with
 *           `VALLO_SOCIAL_SIGN_IN=google` (server-only, read at request
 *           time). It never runs inside a native shell, whatever the variable
 *           says, because it cannot complete there.
 *
 *   APPLE   On when, and only when, Supabase itself reports the Apple provider
 *           enabled (`GET /auth/v1/settings` → `external.apple`), which is the
 *           moment the Services ID and signing key are saved in the dashboard.
 *           Nothing in this repository has to change that day. On the website
 *           it is the ordinary redirect; on the iOS shell it is the native
 *           Sign in with Apple sheet plus `signInWithIdToken` (the redirect
 *           has the same cookie-jar problem as Google there); on the Android
 *           shell it is off. `VALLO_SOCIAL_SIGN_IN=none` switches it off
 *           everywhere without touching the dashboard.
 *
 * THE CONTROL OF RECORD FOR GOOGLE IS THE SUPABASE DASHBOARD (Providers →
 * Google → off; docs/store/FOUNDER_STEPS.md §2). The app refuses to start it,
 * ends a Google session that reaches the callback, and never exchanges a code
 * in the browser (`detectSessionInUrl: false` in `lib/supabase/client.ts`),
 * but while the dashboard has it enabled Supabase will still create the
 * account for a hand-built authorize URL.
 *
 * iPadOS NOTE: with TARGETED_DEVICE_FAMILY = 1 the shell runs on an iPad in
 * iPhone compatibility mode and reports an iPhone User-Agent. A shell that
 * ever reported "Macintosh" would be read as android-native here, which only
 * hides the Apple door.
 *
 * The old `NEXT_PUBLIC_AUTH_PROVIDERS` is deliberately NOT read any more: a
 * deployment that had it set to `google` would otherwise have kept Google on
 * against the decision, and that value was never meant to be public anyway.
 */

export type ProviderId = "email" | "google" | "apple";

export type ProviderState = {
  id: ProviderId;
  configured: boolean;
};

export type SignInSurface = "web" | "ios-native" | "android-native";

/**
 * The token every native shell appends to its User-Agent
 * (`appendUserAgent` in `capacitor.config.ts`). The server reads it to know
 * it is answering the shell, which is the only way a server-rendered sign-in
 * screen can leave a door out on the first frame rather than drawing it and
 * then removing it on the client.
 */
export const NATIVE_UA_TOKEN = "VALLO-NATIVE";

export function surfaceFromUserAgent(userAgent: string | null | undefined): SignInSurface {
  const agent = userAgent ?? "";
  if (!agent.includes(NATIVE_UA_TOKEN)) return "web";
  return /iPhone|iPad|iPod/i.test(agent) && !/Android/i.test(agent) ? "ios-native" : "android-native";
}

type Override = { none: boolean; google: boolean };

function readOverride(env: Record<string, string | undefined>): Override {
  const named = (env.VALLO_SOCIAL_SIGN_IN ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  const none = named.includes("none");
  return { none, google: named.includes("google") && !none };
}

/**
 * PRECONDITION FOR SWITCHING ANY PROVIDER ON (STORE-19, NEW-A4-04).
 *
 * An account created through Apple or Google never passes the sign-up form,
 * so today it records no terms agreement and no 18-or-over statement: only
 * `signUpWithEmail` asks for both and refuses without them. Before a provider
 * is enabled in Supabase (Apple switches on by itself when Supabase reports
 * it) or named in `VALLO_SOCIAL_SIGN_IN`, the OAuth callback and
 * `signInWithAppleIdToken` must hold a NEW social account at a step that asks
 * for both and records them with `recordTermsAcceptance`. The founder's list
 * says the same (docs/store/FOUNDER_STEPS.md section 1).
 *
 * THE POLICY, pure, so every branch is tested without a network.
 * `supabaseApple` is what Supabase reports about its own Apple provider.
 */
export function providerPolicy(input: {
  surface: SignInSurface;
  supabaseConfigured: boolean;
  supabaseApple: boolean;
  env: Record<string, string | undefined>;
}): ProviderState[] {
  const override = readOverride(input.env);
  const ready = input.supabaseConfigured;
  const google = ready && override.google && input.surface === "web";
  const apple = ready && !override.none && input.supabaseApple && input.surface !== "android-native";
  return [
    { id: "email", configured: ready },
    { id: "google", configured: google },
    { id: "apple", configured: apple },
  ];
}

/**
 * The synchronous half, for callers that only need to know whether email
 * works and must not wait on a network read. Social doors always read off
 * here; `resolveProviderStates` is the answer for them.
 */
export function getProviderStates(): ProviderState[] {
  const ready = isSupabaseConfigured();
  return [
    { id: "email", configured: ready },
    { id: "google", configured: false },
    { id: "apple", configured: false },
  ];
}

/**
 * Whether Supabase reports the Apple provider enabled. Cached for five
 * minutes by the fetch cache; any failure reads as OFF, so an outage can only
 * ever hide the door, never draw one that fails.
 */
export async function supabaseReportsApple(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      next: { revalidate: 300 },
      /* Inside a server action the fetch cache does not apply, so this is a
         live call; a slow settings endpoint must not hang sign-in. A timeout
         reads as OFF like any other failure. */
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { external?: { apple?: unknown } };
    return body.external?.apple === true;
  } catch {
    return false;
  }
}

export async function resolveProviderStates(surface: SignInSurface): Promise<ProviderState[]> {
  return providerPolicy({
    surface,
    supabaseConfigured: isSupabaseConfigured(),
    supabaseApple: await supabaseReportsApple(),
    env: process.env,
  });
}

export function providerAllowed(states: readonly ProviderState[], id: ProviderId): boolean {
  return states.some((state) => state.id === id && state.configured);
}

/**
 * Which social provider, if any, produced THIS session.
 *
 * The access token's `amr` claim says how the session was made (`oauth` for a
 * provider redirect, `id_token` for a native sheet, `password`, `otp` and so
 * on) but not which provider. The social identity with the newest
 * `last_sign_in_at` is the one that just signed in. Null for a session no
 * social provider made.
 */
export function socialProviderOfSession(
  accessToken: string | null | undefined,
  identities: ReadonlyArray<{ provider: string; last_sign_in_at?: string | null }> | null | undefined,
): string | null {
  const methods = amrMethods(accessToken);
  if (!methods.some((method) => method === "oauth" || method === "id_token" || method === "sso/saml")) {
    return null;
  }
  const newest = [...(identities ?? [])]
    .filter((identity) => identity.provider !== "email" && identity.provider !== "phone")
    .sort((a, b) => (Date.parse(b.last_sign_in_at ?? "") || 0) - (Date.parse(a.last_sign_in_at ?? "") || 0))[0];
  return newest?.provider ?? "unknown";
}

function amrMethods(accessToken: string | null | undefined): string[] {
  if (!accessToken) return [];
  const payload = accessToken.split(".")[1];
  if (!payload) return [];
  try {
    const text = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const claims = JSON.parse(text) as { amr?: Array<{ method?: unknown }> };
    return (claims.amr ?? []).map((entry) => (typeof entry.method === "string" ? entry.method : ""));
  } catch {
    return [];
  }
}
