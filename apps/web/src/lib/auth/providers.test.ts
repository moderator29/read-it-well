import { describe, expect, it } from "vitest";

import {
  NATIVE_UA_TOKEN,
  providerAllowed,
  providerPolicy,
  socialProviderOfSession,
  surfaceFromUserAgent,
} from "./providers";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

function allowed(surface: "web" | "ios-native" | "android-native", env: Record<string, string>, supabaseApple = false) {
  const states = providerPolicy({ surface, supabaseConfigured: true, supabaseApple, env });
  return {
    email: providerAllowed(states, "email"),
    google: providerAllowed(states, "google"),
    apple: providerAllowed(states, "apple"),
  };
}

describe("STORE-02: the recorded decision is email only", () => {
  it("offers no Google by default, on any surface, even though Supabase has it enabled", () => {
    for (const surface of ["web", "ios-native", "android-native"] as const) {
      expect(allowed(surface, {})).toEqual({ email: true, google: false, apple: false });
    }
  });

  it("ignores the old public variable that used to switch Google on", () => {
    expect(allowed("web", { NEXT_PUBLIC_AUTH_PROVIDERS: "google,apple" }).google).toBe(false);
  });

  it("lets the founder reverse the decision for the website only, never inside a shell", () => {
    expect(allowed("web", { VALLO_SOCIAL_SIGN_IN: "google" }).google).toBe(true);
    expect(allowed("ios-native", { VALLO_SOCIAL_SIGN_IN: "google" }).google).toBe(false);
    expect(allowed("android-native", { VALLO_SOCIAL_SIGN_IN: "google" }).google).toBe(false);
    expect(allowed("web", { VALLO_SOCIAL_SIGN_IN: "google,none" }).google).toBe(false);
  });
});

describe("STORE-02: Apple switches on when Supabase reports it", () => {
  it("is off while the dashboard has no Apple credentials", () => {
    expect(allowed("web", {}, false).apple).toBe(false);
    expect(allowed("ios-native", {}, false).apple).toBe(false);
  });

  it("is on for the website and the iOS shell once Supabase reports it, never on Android", () => {
    expect(allowed("web", {}, true).apple).toBe(true);
    expect(allowed("ios-native", {}, true).apple).toBe(true);
    expect(allowed("android-native", {}, true).apple).toBe(false);
  });

  it("can be switched off everywhere without the dashboard", () => {
    expect(allowed("web", { VALLO_SOCIAL_SIGN_IN: "none" }, true).apple).toBe(false);
  });

  it("offers nothing when Supabase itself is not configured", () => {
    const states = providerPolicy({ surface: "web", supabaseConfigured: false, supabaseApple: true, env: { VALLO_SOCIAL_SIGN_IN: "google" } });
    expect(states.every((state) => !state.configured)).toBe(true);
  });
});

describe("the surface comes from the shell's User-Agent token", () => {
  it("reads the website, the iOS shell and the Android shell apart", () => {
    expect(surfaceFromUserAgent(IPHONE)).toBe("web");
    expect(surfaceFromUserAgent(`${IPHONE} ${NATIVE_UA_TOKEN}`)).toBe("ios-native");
    expect(surfaceFromUserAgent(`${ANDROID} ${NATIVE_UA_TOKEN}`)).toBe("android-native");
    expect(surfaceFromUserAgent(null)).toBe("web");
  });
});

function token(amr: string[]): string {
  const body = Buffer.from(JSON.stringify({ amr: amr.map((method) => ({ method, timestamp: 1 })) })).toString("base64url");
  return `header.${body}.signature`;
}

describe("the callback knows which provider made the session", () => {
  it("is null for a password, a code or a link", () => {
    expect(socialProviderOfSession(token(["password"]), [{ provider: "google" }])).toBeNull();
    expect(socialProviderOfSession(token(["otp"]), [{ provider: "email" }])).toBeNull();
    expect(socialProviderOfSession(null, [])).toBeNull();
  });

  it("names the provider whose identity signed in last", () => {
    const identities = [
      { provider: "email", last_sign_in_at: "2026-09-23T12:00:00Z" },
      { provider: "apple", last_sign_in_at: "2026-09-01T00:00:00Z" },
      { provider: "google", last_sign_in_at: "2026-09-23T11:43:19Z" },
    ];
    expect(socialProviderOfSession(token(["oauth"]), identities)).toBe("google");
    expect(socialProviderOfSession(token(["id_token"]), [{ provider: "apple", last_sign_in_at: "2026-09-23T00:00:00Z" }])).toBe("apple");
  });

  it("an oauth session with no readable identity is 'unknown', which no policy allows", () => {
    expect(socialProviderOfSession(token(["oauth"]), [])).toBe("unknown");
  });
});
