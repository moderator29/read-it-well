import { describe, expect, it } from "vitest";
import {
  needsVerification,
  requiresVerification,
  roleStateFrom,
  ROLE_ORDER,
  type AgentFacts,
} from "./roles";

const APPROVED_BUSINESS: AgentFacts = { type: "business", status: "APPROVED", verified: true };
const PENDING_BUSINESS: AgentFacts = { type: "business", status: "PENDING", verified: false };
const APPROVED_INDIVIDUAL: AgentFacts = { type: "individual", status: "APPROVED", verified: true };

describe("requiresVerification", () => {
  /* The product rule that must not drift. A tenant is never asked for papers. */
  it("never asks a renter or buyer", () => {
    expect(requiresVerification("renter")).toBe(false);
  });

  it("asks both of the roles that take other people's money", () => {
    expect(requiresVerification("owner")).toBe(true);
    expect(requiresVerification("professional")).toBe(true);
  });
});

describe("roleStateFrom", () => {
  it("gives an account with no agents row exactly one set-up role", () => {
    const view = roleStateFrom(null, "personal");
    expect(view.roles.filter((r) => r.setUp).map((r) => r.id)).toEqual(["renter"]);
    expect(view.current).toBe("renter");
  });

  it("lists all three roles whatever the account is, so none is hidden", () => {
    for (const agent of [null, PENDING_BUSINESS, APPROVED_INDIVIDUAL]) {
      expect(roleStateFrom(agent, "personal").roles.map((r) => r.id)).toEqual([...ROLE_ORDER]);
    }
  });

  it("reads an individual agents row as the owner role", () => {
    const view = roleStateFrom(APPROVED_INDIVIDUAL, "agent");
    expect(view.current).toBe("owner");
    expect(view.roles.find((r) => r.id === "owner")?.verified).toBe(true);
    expect(view.roles.find((r) => r.id === "professional")?.setUp).toBe(false);
  });

  it("reads a business agents row as the professional role", () => {
    expect(roleStateFrom(APPROVED_BUSINESS, "agent").current).toBe("professional");
  });

  it("treats a pending application as set up but not verified", () => {
    const role = roleStateFrom(PENDING_BUSINESS, "agent").roles.find(
      (r) => r.id === "professional",
    );
    expect(role).toEqual({ id: "professional", setUp: true, verified: false });
  });

  /*
   * The cookie is a preference, not a permission. This is the case that would
   * otherwise show an agent dashboard switcher to somebody with no agents row.
   */
  it("refuses an agent mode cookie on an account with no agents row", () => {
    expect(roleStateFrom(null, "agent").current).toBe("renter");
  });

  it("stays on renter in personal mode even for an approved agent", () => {
    expect(roleStateFrom(APPROVED_BUSINESS, "personal").current).toBe("renter");
  });
});

describe("needsVerification", () => {
  it("is false for a renter, always", () => {
    expect(needsVerification({ id: "renter", setUp: true, verified: false })).toBe(false);
  });

  it("is true for a seller who has applied and is not verified", () => {
    expect(needsVerification({ id: "owner", setUp: true, verified: false })).toBe(true);
  });

  it("is false for a role that has not been set up, because the ask is the application", () => {
    expect(needsVerification({ id: "professional", setUp: false, verified: false })).toBe(false);
  });

  it("is false once verified", () => {
    expect(needsVerification({ id: "professional", setUp: true, verified: true })).toBe(false);
  });
});
