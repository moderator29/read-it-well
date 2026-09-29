import { describe, expect, it } from "vitest";
import { navDirection } from "./nav-direction";

describe("navDirection", () => {
  it("is nothing when the path does not change", () => {
    expect(navDirection("/search", "/search?beds=2")).toBeNull();
  });

  it("drills forward into a child", () => {
    expect(navDirection("/search", "/listing/abc")).toBe("forward");
    expect(navDirection("/saved", "/saved/searches")).toBe("forward");
  });

  it("goes back up to an ancestor", () => {
    expect(navDirection("/listing/abc", "/search")).toBe("back");
    expect(navDirection("/saved/searches", "/saved")).toBe("back");
  });

  it("moves sideways to a top-level destination", () => {
    expect(navDirection("/listing/abc", "/home")).toBe("tab");
  });

  it("treats every tap in the dock, rail or drawer as a tab switch", () => {
    expect(navDirection("/home", "/saved", true)).toBe("tab");
    expect(navDirection("/saved/searches", "/saved", true)).toBe("tab");
  });
});
