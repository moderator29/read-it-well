import { describe, expect, it } from "vitest";
import { isFlow, parentOf, refuseHistory } from "./resolve";
import { backToLabel, screenName } from "./route-labels";
import { isKnownRoute } from "../routing/known-routes";
import { isPublicPath } from "../../proxy";

/**
 * SCHEDULE A VISIT IS DECLARED: where each step goes up to, that step 1 is a
 * flow Back never reopens, that both have a spoken name, and that neither is
 * a public page (a signed-out reader is sent to sign in by the page and
 * brought back with `next`).
 */
describe("Schedule a visit routes", () => {
  it("goes up to the listing from both steps", () => {
    expect(parentOf("/listing/abc/visit")).toMatchObject({ href: "/listing/abc" });
    expect(parentOf("/listing/abc/visit/ix-1")).toMatchObject({ href: "/listing/abc" });
  });

  it("never returns into the submitted form through history", () => {
    expect(isFlow("/listing/abc/visit")).toBe(true);
    expect(refuseHistory("/listing/abc/visit/ix-1", "/listing/abc/visit", true)).toBe("flow");
    expect(isFlow("/listing/abc/visit/ix-1")).toBe(false);
  });

  it("has a name for the back control and the screen reader", () => {
    expect(screenName("/listing/abc/visit")).toBeTruthy();
    expect(screenName("/listing/abc/visit/ix-1")).toBeTruthy();
    expect(backToLabel("/listing/abc/visit/ix-1")).toBeTruthy();
  });

  it("is a known address and not a public one", () => {
    expect(isKnownRoute("/listing/abc/visit")).toBe(true);
    expect(isPublicPath("/listing/abc/visit", { publicCatalogue: false })).toBe(false);
    expect(isPublicPath("/listing/abc/visit/ix-1", { publicCatalogue: false })).toBe(false);
  });
});
