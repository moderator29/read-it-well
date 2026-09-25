import { describe, expect, it } from "vitest";
import { businessThreadRefusal, isUuid, normaliseBody } from "./rules";

const base = { found: true, isExample: false, published: true, ownerId: "owner", callerId: "guest" };

describe("messaging a hotel or a restaurant", () => {
  it("opens for a published, real venue owned by somebody else", () => {
    expect(businessThreadRefusal(base)).toBeNull();
  });
  it("refuses an example venue, your own venue, an unpublished one and a missing owner", () => {
    expect(businessThreadRefusal({ ...base, isExample: true })).toMatch(/example/);
    expect(businessThreadRefusal({ ...base, ownerId: "guest" })).toMatch(/your own/);
    expect(businessThreadRefusal({ ...base, published: false })).toMatch(/not taking/);
    expect(businessThreadRefusal({ ...base, ownerId: null })).toMatch(/not reachable/);
    expect(businessThreadRefusal({ ...base, found: false })).toMatch(/could not find/);
  });
  it("sends nothing empty and nothing over 2,000 characters", () => {
    expect(normaliseBody("   ")).toBeNull();
    expect(normaliseBody(42)).toBeNull();
    expect(normaliseBody(" hi ")).toBe("hi");
    expect(normaliseBody("x".repeat(3000))?.length).toBe(2000);
  });
  it("only takes a uuid for the venue", () => {
    expect(isUuid("ea000000-0000-4000-8000-000000000003")).toBe(true);
    expect(isUuid("seed-2")).toBe(false);
  });
});
