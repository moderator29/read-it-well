import { describe, expect, it } from "vitest";
import { DEFAULT_MOTION, motionAttributes, parseMotion, serializeMotion } from "./motion-pref";

describe("the motion preference", () => {
  it("round-trips through its cookie form", () => {
    const pref = { level: "cinematic" as const, splash: false, doors: true, ambient: false };
    expect(parseMotion(serializeMotion(pref))).toEqual(pref);
  });

  it("falls back to standard with everything on for anything it cannot read", () => {
    expect(parseMotion(undefined)).toEqual(DEFAULT_MOTION);
    expect(parseMotion("")).toEqual(DEFAULT_MOTION);
    expect(parseMotion("loud.1.1.1").level).toBe("standard");
  });

  it("paints nothing on the root for the default, so the designed state needs no attribute", () => {
    expect(Object.values(motionAttributes(DEFAULT_MOTION)).every((v) => v === undefined)).toBe(true);
  });

  it("tells the older readers to hold still under calm and off", () => {
    expect(motionAttributes({ ...DEFAULT_MOTION, level: "calm" })["data-reduce-motion"]).toBe("1");
    expect(motionAttributes({ ...DEFAULT_MOTION, level: "off" })["data-reduce-motion"]).toBe("1");
    expect(motionAttributes({ ...DEFAULT_MOTION, level: "cinematic" })["data-reduce-motion"]).toBeUndefined();
  });

  it("names each switched-off moment on the root", () => {
    const attrs = motionAttributes({ level: "standard", splash: false, doors: false, ambient: false });
    expect(attrs["data-motion-splash"]).toBe("off");
    expect(attrs["data-motion-doors"]).toBe("off");
    expect(attrs["data-motion-ambient"]).toBe("off");
  });
});
