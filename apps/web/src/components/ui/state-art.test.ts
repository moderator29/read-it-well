import { describe, expect, it } from "vitest";
import { ICON_3D_NAMES } from "./icon-3d";
import { STATE_ART, stateArtFor } from "./state-art";

describe("stateArtFor", () => {
  it("draws the 3D twin of a named object", () => {
    expect(stateArtFor("bell-badge")).toBe("bell");
    expect(stateArtFor("search-ring")).toBe("search");
    expect(stateArtFor("calendar-home")).toBe("calendar-booked");
  });
  it("keeps the glyph where there is no twin, or when opted out", () => {
    expect(stateArtFor("camera")).toBeUndefined();
    expect(stateArtFor(undefined)).toBeUndefined();
    expect(stateArtFor("bell-badge", false)).toBeUndefined();
  });
  it("lets a call site choose", () => {
    expect(stateArtFor("camera", "keys")).toBe("keys");
  });
  it("maps only to real 3D names", () => {
    for (const art of Object.values(STATE_ART)) expect(ICON_3D_NAMES).toContain(art);
  });
});
