import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";
import { composeListerCard, listerRoleWord, type ListerProfileRow } from "./lister-card";

/**
 * "LISTED BY" (founder's reference, 13 October 2026): the row is built from
 * rows and never from a guess. The role word follows the person's side, a
 * firm reads as the firm, an unclaimed handle opens nothing, and the badge is
 * the published tier, never on an example listing.
 */
const profile = (over: Partial<ListerProfileRow> = {}): ListerProfileRow => ({
  handle: "danielokafor",
  display_label: "Daniel Okafor",
  avatar_path: "https://example.test/a.jpg",
  supply_role: "owner",
  handle_claimed_at: "2026-10-01T00:00:00Z",
  ...over,
});

describe("listerRoleWord", () => {
  it("reads a firm's listing as Agency whoever posted it", () => {
    expect(listerRoleWord("firm", "agent")).toBe("agency");
  });
  it("reads the person's side first: an owner is a Landlord, an agent an Agent", () => {
    expect(listerRoleWord("agent", "owner")).toBe("landlord");
    expect(listerRoleWord("owner", "agent")).toBe("agent");
  });
  it("falls back to the listing's own claim, and to nothing", () => {
    expect(listerRoleWord("owner", null)).toBe("landlord");
    expect(listerRoleWord("agent", null)).toBe("agent");
    expect(listerRoleWord(null, null)).toBeNull();
  });
});

describe("composeListerCard", () => {
  it("draws the public profile: name, handle, photograph, role and the published tier", () => {
    expect(
      composeListerCard({ listingRole: "owner", listerName: null, profile: profile(), tier: "gold", isDemo: false }),
    ).toEqual({
      name: "Daniel Okafor",
      handle: "danielokafor",
      avatarUrl: "https://example.test/a.jpg",
      role: "landlord",
      tier: "gold",
    });
  });

  it("never carries a badge on an example listing", () => {
    const card = composeListerCard({ listingRole: "agent", listerName: "A", profile: profile(), tier: "gold", isDemo: true });
    expect(card?.tier).toBe("none");
  });

  it("does not link a handle nobody has claimed", () => {
    const card = composeListerCard({
      listingRole: "agent",
      listerName: null,
      profile: profile({ handle_claimed_at: null }),
      tier: "none",
      isDemo: false,
    });
    expect(card?.handle).toBeNull();
  });

  it("draws a firm as the firm: its name, no photograph, no profile, no personal badge", () => {
    expect(
      composeListerCard({ listingRole: "firm", listerName: "Acme Properties Ltd", profile: profile(), tier: "gold", isDemo: false }),
    ).toEqual({ name: "Acme Properties Ltd", handle: null, avatarUrl: null, role: "agency", tier: "none" });
  });

  it("falls back to the published name when no profile could be read, with no badge", () => {
    expect(
      composeListerCard({ listingRole: "agent", listerName: "Chidi", profile: null, tier: "gold", isDemo: false }),
    ).toEqual({ name: "Chidi", handle: null, avatarUrl: null, role: "agent", tier: "none" });
  });

  it("is absent when there is nothing true to draw", () => {
    expect(composeListerCard({ listingRole: null, listerName: null, profile: null, tier: "none", isDemo: false })).toBeNull();
  });
});

describe("the card claims nothing it cannot back", () => {
  const card = withoutComments(readFileSync(join(__dirname, "ListingAgentCard.tsx"), "utf8"));
  it("draws no online dot and no rating for a person", () => {
    expect(card).not.toMatch(/online/i);
    expect(card).not.toMatch(/rating/i);
  });
  it("draws the published badge through TierBadge and nothing else", () => {
    expect(card).toContain("<TierBadge tier={lister.tier}");
  });
});
