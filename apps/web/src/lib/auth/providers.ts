import "server-only";

/**
 * Auth provider availability.
 *
 * Each provider is enabled only when its credentials are actually present in
 * the environment. Nothing here fakes a working sign in: an unconfigured
 * provider renders as a disabled control with an honest explanation, rather
 * than a button that looks live and then fails (Master Rule 8).
 *
 * Only the presence of a variable is ever read here. No secret value is
 * returned, and this module is server only so none of it can reach the client
 * bundle (Master Rule 9).
 */

export type ProviderId = "email" | "google" | "apple" | "x";

export type ProviderState = {
  id: ProviderId;
  configured: boolean;
};

function has(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export function getProviderStates(): ProviderState[] {
  return [
    // Email sign in needs somewhere to put the user and something to send mail.
    { id: "email", configured: has("AUTH_DATABASE_URL", "RESEND_API_KEY") },
    { id: "google", configured: has("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET") },
    // Apple additionally needs the signing key, team and key identifiers.
    {
      id: "apple",
      configured: has("APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"),
    },
    { id: "x", configured: has("X_CLIENT_ID", "X_CLIENT_SECRET") },
  ];
}

export function isAnyProviderConfigured(): boolean {
  return getProviderStates().some((p) => p.configured);
}
