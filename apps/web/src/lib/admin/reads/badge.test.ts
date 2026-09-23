import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { tierMap } from "./shared";
import { PersonTier } from "@/app/admin/_components/PersonTier";

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
  it("draws nothing until Session A's badge component lands", () => {
    expect(renderToStaticMarkup(createElement(PersonTier, { tier: "platinum" }))).toBe("");
    expect(renderToStaticMarkup(createElement(PersonTier, { tier: null }))).toBe("");
  });
});
