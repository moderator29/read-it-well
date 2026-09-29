import { describe, expect, it } from "vitest";
import { doneFlagForLinkType } from "./link-moment";

describe("the moment an email link earns", () => {
  it("welcomes a sign-up confirmation and confirms an address change", () => {
    expect(doneFlagForLinkType("signup")).toBe("account-created");
    expect(doneFlagForLinkType("email_change")).toBe("email-verified");
  });

  it("says nothing for a magic-link sign-in, which Supabase also types as email", () => {
    expect(doneFlagForLinkType("email")).toBeNull();
    expect(doneFlagForLinkType("magiclink")).toBeNull();
  });

  it("says nothing for recovery, invites, a provider round trip or no type", () => {
    for (const type of ["recovery", "invite", "", undefined, null]) {
      expect(doneFlagForLinkType(type)).toBeNull();
    }
  });
});
