import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { tierMap } from "./shared";
import { PersonTier } from "@/app/admin/_components/PersonTier";

/* TierBadge is the one badge renderer and is proved by its own tests; here it
   stands in as a marker so this test can see what PersonTier hands it. */
vi.mock("@/components/trust/TierBadge", () => ({
  TierBadge: ({ tier, size }: { tier: string; size: number }) =>
    createElement("i", { "data-tier": tier, "data-size": String(size) }),
}));

describe("the badge tier (B-BADGE)", () => {
  it("keeps exactly the published tier and nothing it cannot name", () => {
    const map = tierMap([
      { user_id: "a", tier: "platinum" },
      { user_id: "b", tier: "gold" },
      { user_id: "c", tier: "none" },
      { user_id: null, tier: "gold" },
      { user_id: "d", tier: "diamond" },
    ]);
    expect([...map.entries()]).toEqual([
      ["a", "platinum"],
      ["b", "gold"],
    ]);
  });
  it("hands the published tier to the badge, and draws nothing without one", () => {
    expect(renderToStaticMarkup(createElement(PersonTier, { tier: "platinum" }))).toBe(
      '<i data-tier="platinum" data-size="14"></i>',
    );
    expect(renderToStaticMarkup(createElement(PersonTier, { tier: "gold", size: "md" }))).toBe(
      '<i data-tier="gold" data-size="16"></i>',
    );
    expect(renderToStaticMarkup(createElement(PersonTier, { tier: null }))).toBe("");
  });
});
