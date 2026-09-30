import { describe, expect, it } from "vitest";
import { listUnsubscribeHeaders } from "./client";
import { maskEmail, readUnsubscribe, signUnsubscribe, TOKEN_LIFETIME_SECONDS, unsubscribeKey } from "./unsubscribe-token";

const USER = "0b8f6d4e-3c2a-4f1e-9d7c-5a6b4c3d2e1f";
const key = unsubscribeKey({ SUPABASE_SERVICE_ROLE_KEY: "a-long-enough-test-secret-value" })!;

describe("A12 one-click unsubscribe token", () => {
  it("has no key without the service key, so no token is ever faked", () => {
    expect(unsubscribeKey({})).toBeNull();
  });

  it("round-trips one account and one channel", () => {
    const token = signUnsubscribe(key, USER, "marketing", 1_000);
    expect(readUnsubscribe(key, token, 1_001)).toEqual({ userId: USER, channel: "marketing", expiresAt: 1_000 + TOKEN_LIFETIME_SECONDS });
  });

  it("refuses a changed channel, a changed account, another key and an expired token", () => {
    const token = signUnsubscribe(key, USER, "messages", 1_000);
    expect(readUnsubscribe(key, token.replace(".messages.", ".marketing."), 1_001)).toBeNull();
    expect(readUnsubscribe(key, token.replace(USER, "1b8f6d4e-3c2a-4f1e-9d7c-5a6b4c3d2e1f"), 1_001)).toBeNull();
    const other = unsubscribeKey({ SUPABASE_SERVICE_ROLE_KEY: "another-long-enough-secret-value" })!;
    expect(readUnsubscribe(other, token, 1_001)).toBeNull();
    expect(readUnsubscribe(key, token, 1_000 + TOKEN_LIFETIME_SECONDS + 1)).toBeNull();
    expect(readUnsubscribe(key, "garbage", 1_001)).toBeNull();
  });

  it("sends RFC 8058 headers only with a token, and the old link without", () => {
    const token = signUnsubscribe(key, USER, "bookings", 1_000);
    const headers = listUnsubscribeHeaders("https://www.vallospaces.com/", "bookings", token);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(headers["List-Unsubscribe"]).toBe(`<https://www.vallospaces.com/api/email/unsubscribe?token=${encodeURIComponent(token)}>`);
    expect(listUnsubscribeHeaders("https://www.vallospaces.com", "bookings", null)).toEqual({
      "List-Unsubscribe": "<https://www.vallospaces.com/settings/notifications?channel=bookings>",
    });
  });

  it("masks the address", () => {
    expect(maskEmail("ada@example.com")).toBe("a•••@example.com");
    expect(maskEmail("bad")).toBe("•••");
  });
});
