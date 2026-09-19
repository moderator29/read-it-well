import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The recipient lookup under /wallet/send.
 *
 * It answers with the name on the account before any money moves, and it
 * is paced. These prove the seams: a malformed or signed-out ask is silent,
 * the viewer's own address is named as such before any read, a paced ask
 * says when to try again and reads nothing, an address nobody uses is
 * "none", and a found account carries its display name, or the address
 * when the profile has none.
 */
const seam = vi.hoisted(() => ({
  session: vi.fn(),
  consume: vi.fn(),
  findUserByEmail: vi.fn(),
  displayNameFor: vi.fn(),
  admin: { from: vi.fn() } as unknown,
}));

vi.mock("@/lib/actions/session", () => ({ resolveSession: seam.session }));
vi.mock("@/lib/security/rate-limit", () => ({
  consume: seam.consume,
  subjectForUser: (id: string) => `user:${id}`,
}));
vi.mock("@/lib/wallet/ledger", () => ({
  findUserByEmail: seam.findUserByEmail,
  displayNameFor: seam.displayNameFor,
  getAdminClient: () => seam.admin,
}));

import { lookupRecipient } from "./recipient-action";

const signedIn = { state: "signed-in", user: { id: "me", email: "Me@Example.com" } };

beforeEach(() => {
  seam.session.mockReset().mockResolvedValue(signedIn);
  seam.consume.mockReset().mockResolvedValue({ allowed: true, degraded: false });
  seam.findUserByEmail.mockReset().mockResolvedValue({ id: "them", email: "them@example.com" });
  seam.displayNameFor.mockReset().mockResolvedValue("Tunde Adebayo");
});

describe("lookupRecipient", () => {
  it("is silent on a half-typed address and reads nothing", async () => {
    expect(await lookupRecipient("tunde@")).toEqual({ state: "unknown", reason: "" });
    expect(seam.session).not.toHaveBeenCalled();
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
  });

  it("is silent when signed out", async () => {
    seam.session.mockResolvedValue({ state: "signed-out" });
    expect(await lookupRecipient("them@example.com")).toEqual({ state: "unknown", reason: "" });
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
  });

  it("names the viewer's own address before any read, whatever its case", async () => {
    expect(await lookupRecipient("  ME@example.COM ")).toEqual({ state: "self" });
    expect(seam.consume).not.toHaveBeenCalled();
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
  });

  it("is paced per viewer and says when to try again", async () => {
    seam.consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 240, retryIn: "in about 4 minutes" });
    expect(await lookupRecipient("them@example.com")).toEqual({
      state: "unknown",
      reason: "Try again in about 4 minutes.",
    });
    expect(seam.consume).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "wallet_recipient_lookup", subject: "user:me" }),
    );
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
  });

  it("answers none for an address nobody uses", async () => {
    seam.findUserByEmail.mockResolvedValue(null);
    expect(await lookupRecipient("nobody@example.com")).toEqual({ state: "none" });
  });

  it("answers found with the display name, lower-casing the address it asks for", async () => {
    expect(await lookupRecipient("Them@Example.com")).toEqual({ state: "found", name: "Tunde Adebayo" });
    expect(seam.findUserByEmail).toHaveBeenCalledWith("them@example.com");
  });

  it("falls back to the address when the profile carries no name", async () => {
    seam.displayNameFor.mockResolvedValue(null);
    expect(await lookupRecipient("them@example.com")).toEqual({ state: "found", name: "them@example.com" });
  });

  it("still says found when the name read throws", async () => {
    seam.displayNameFor.mockRejectedValue(new Error("down"));
    expect(await lookupRecipient("them@example.com")).toEqual({ state: "found", name: "them@example.com" });
  });

  it("treats an account resolving to the viewer as self", async () => {
    seam.findUserByEmail.mockResolvedValue({ id: "me", email: "alias@example.com" });
    expect(await lookupRecipient("alias@example.com")).toEqual({ state: "self" });
  });
});
