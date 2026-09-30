import { describe, expect, it } from "vitest";
import { joinTextParts } from "./button-label";

describe("joinTextParts", () => {
  it("joins neighbouring text and numbers into one label", () => {
    expect(joinTextParts(["Take down (", 1, ")"])).toEqual(["Take down (1)"]);
  });
  it("keeps an element as its own item and joins text on either side separately", () => {
    const icon = { icon: true };
    expect(joinTextParts(["Save ", 2, icon, "now"])).toEqual(["Save 2", icon, "now"]);
  });
});
