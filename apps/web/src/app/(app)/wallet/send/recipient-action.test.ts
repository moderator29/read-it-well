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
  adminFrom: vi.fn() as unknown as (table: string) => unknown,
  /* Block rows as (user_id, other_id) pairs, read by the recipient check. */
  blocks: [] as Array<[string, string]>,
  handleOwner: vi.fn(),
  admin: null as unknown,
}));
seam.admin = {
  from: (table: string) =>
    table === "blocks"
      ? {
          select: () => ({
            or: () => ({
              limit: async () => ({
                data: seam.blocks.map(([user_id, other_id]) => ({ user_id, other_id })),
                error: null,
              }),
            }),
          }),
        }
      : seam.adminFrom(table),
};

/* The viewer's own client: social_profiles as RLS would answer it. A blocked
   handle is simply absent (null), exactly as social_profiles_select hides it. */
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, handle: string) => ({
          maybeSingle: async () => {
            const owner = seam.handleOwner(handle);
            return { data: owner ? { user_id: owner } : null, error: null };
          },
        }),
      }),
    }),
  }),
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
  seam.blocks = [];
  seam.adminFrom = vi.fn();
  seam.handleOwner.mockReset().mockImplementation((h: string) => (h === "tunde" ? "them" : null));
});

describe("lookupRecipient by @handle", () => {
  it("names the person behind a handle and never reads or returns an address", async () => {
    const answer = await lookupRecipient("@Tunde");
    expect(answer).toEqual({ state: "found", name: "Tunde Adebayo", tier: null });
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
    expect(JSON.stringify(answer)).not.toMatch(/[^\s@"]+@[^\s@"]+\.[a-z]/i);
  });

  it("falls back to the handle, not an address, when the profile has no name", async () => {
    seam.displayNameFor.mockResolvedValue(null);
    expect(await lookupRecipient("@tunde")).toEqual({ state: "found", name: "@tunde", tier: null });
  });

  it("answers none for a handle the viewer cannot see (unclaimed or blocked)", async () => {
    expect(await lookupRecipient("@blocked_person")).toEqual({ state: "none" });
    expect(seam.findUserByEmail).not.toHaveBeenCalled();
  });

  it("reads a blocked person exactly like an address nobody uses (NEW-A2-04)", async () => {
    seam.blocks = [["them", "me"]];
    const blocked = await lookupRecipient("them@example.com");
    seam.blocks = [];
    seam.findUserByEmail.mockResolvedValue(null);
    const nobody = await lookupRecipient("nobody@example.com");
    expect(blocked).toEqual({ state: "none" });
    expect(blocked).toEqual(nobody);
    seam.findUserByEmail.mockResolvedValue({ id: "them", email: "them@example.com" });
    seam.blocks = [["me", "them"]];
    expect(await lookupRecipient("@tunde")).toEqual({ state: "none" });
  });

  it("names the viewer's own handle as self", async () => {
    seam.handleOwner.mockReturnValue("me");
    expect(await lookupRecipient("@myself")).toEqual({ state: "self" });
  });
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
    expect(await lookupRecipient("Them@Example.com")).toEqual({ state: "found", name: "Tunde Adebayo", tier: null });
    expect(seam.findUserByEmail).toHaveBeenCalledWith("them@example.com");
  });

  it("falls back to the address when the profile carries no name", async () => {
    seam.displayNameFor.mockResolvedValue(null);
    expect(await lookupRecipient("them@example.com")).toEqual({ state: "found", name: "them@example.com", tier: null });
  });

  it("still says found when the name read throws", async () => {
    seam.displayNameFor.mockRejectedValue(new Error("down"));
    expect(await lookupRecipient("them@example.com")).toEqual({ state: "found", name: "them@example.com", tier: null });
  });

  it("treats an account resolving to the viewer as self", async () => {
    seam.findUserByEmail.mockResolvedValue({ id: "me", email: "alias@example.com" });
    expect(await lookupRecipient("alias@example.com")).toEqual({ state: "self" });
  });
});

describe("lookupRecipient, the badge tier (B-BADGE)", () => {
  const chain = (result: unknown) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
  });

  it("carries the tier person_badge answers, and asks for exactly that row", async () => {
    const from = vi.fn(() => chain({ data: { tier: "gold" }, error: null }));
    seam.adminFrom = from;
    expect(await lookupRecipient("them@example.com")).toEqual({
      state: "found",
      name: "Tunde Adebayo",
      tier: "gold",
    });
    expect(from).toHaveBeenCalledWith("person_badge");
  });

  it("answers no badge for no row, an unknown value, or a failed read", async () => {
    seam.adminFrom = () => chain({ data: null, error: null });
    expect(await lookupRecipient("them@example.com")).toMatchObject({ tier: null });
    seam.adminFrom = () => chain({ data: { tier: "diamond" }, error: null });
    expect(await lookupRecipient("them@example.com")).toMatchObject({ tier: null });
    seam.adminFrom = () => chain({ data: null, error: { message: "denied" } });
    expect(await lookupRecipient("them@example.com")).toMatchObject({ tier: null });
  });
});
