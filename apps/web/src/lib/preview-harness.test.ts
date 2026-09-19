import { describe, expect, it } from "vitest";

import { previewHarnessIsOpen } from "./preview-harness";

/**
 * THE GATE ON THE PREVIEW HARNESS, PROVED AT ALL FOUR CORNERS.
 *
 * The harness renders real components against fixture props: invented
 * listings, invented prices, invented people. It exists so a signed-in surface
 * can be photographed without a session, and it must never be reachable on the
 * deployed product, where a fixture page would read to a visitor as inventory
 * we have and money that moved.
 *
 * The case that matters is the last one. An environment variable on its own is
 * a footgun, because somebody debugging will eventually add it to the project
 * settings, and then the fixtures are live. So the platform's own `VERCEL`
 * variable outranks the opt in, and this proves that it does. If somebody
 * deletes that condition for convenience, this test goes red, which is the
 * whole reason the check is a function rather than a line in a layout.
 */
describe("the preview harness door", () => {
  it("is open in development without anybody asking", () => {
    expect(previewHarnessIsOpen({ NODE_ENV: "development" })).toBe(true);
    expect(previewHarnessIsOpen({ NODE_ENV: "test" })).toBe(true);
  });

  it("is shut on a production build that did not ask for it", () => {
    expect(previewHarnessIsOpen({ NODE_ENV: "production" })).toBe(false);
  });

  it("opens on a local production server that asked for it, which is what a proof needs", () => {
    expect(
      previewHarnessIsOpen({ NODE_ENV: "production", VALLO_PREVIEW_HARNESS: "1" }),
    ).toBe(true);
  });

  it("STAYS SHUT ON VERCEL EVEN WHEN THE VARIABLE IS SET, and this is the one that matters", () => {
    expect(
      previewHarnessIsOpen({
        NODE_ENV: "production",
        VALLO_PREVIEW_HARNESS: "1",
        VERCEL: "1",
      }),
    ).toBe(false);
  });

  it("takes only an exact 1, so a truthy-looking value does not open it", () => {
    for (const value of ["true", "yes", "0", "", "TRUE", " 1"]) {
      expect(
        previewHarnessIsOpen({ NODE_ENV: "production", VALLO_PREVIEW_HARNESS: value }),
      ).toBe(false);
    }
  });
});
