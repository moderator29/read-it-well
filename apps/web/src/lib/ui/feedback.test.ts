import { describe, expect, it } from "vitest";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MOTION,
  NATIVE,
  VIBRATION,
  planFeedback,
  type FeedbackEnvironment,
} from "./feedback";

const androidWeb: FeedbackEnvironment = {
  native: false,
  nativeHaptics: false,
  canVibrate: true,
  ios: false,
  reducedMotion: false,
};
const iosWeb: FeedbackEnvironment = { ...androidWeb, canVibrate: false, ios: true };
const iosShell: FeedbackEnvironment = { ...iosWeb, native: true, nativeHaptics: true };
const shellWithoutPlugin: FeedbackEnvironment = { ...androidWeb, native: true, nativeHaptics: false };

describe("the grammar", () => {
  it("has exactly five kinds, each with a pattern, a native call and a motion token", () => {
    expect(FEEDBACK_KINDS).toEqual(["select", "confirm", "success", "warning", "error"]);
    for (const kind of FEEDBACK_KINDS) {
      expect(VIBRATION[kind]).toBeDefined();
      expect(NATIVE[kind]).toBeDefined();
      expect(FEEDBACK_MOTION[kind].duration).toMatch(/^var\(--nf-/);
    }
  });

  it("gives every kind a distinct Android pattern, so paid does not feel like pressed", () => {
    const patterns = FEEDBACK_KINDS.map((kind) => JSON.stringify(VIBRATION[kind]));
    expect(new Set(patterns).size).toBe(FEEDBACK_KINDS.length);
  });

  it("springs only on success", () => {
    expect(FEEDBACK_MOTION.success.ease).toBe("var(--nf-ease-spring)");
    expect(FEEDBACK_MOTION.error.ease).toBe("var(--nf-ease-press)");
  });
});

describe("planFeedback", () => {
  it("uses the system patterns in the native shell, including on an iPhone", () => {
    expect(planFeedback("success", iosShell)).toEqual({
      channel: "native",
      call: { method: "notification", options: { type: "SUCCESS" } },
    });
    expect(planFeedback("select", iosShell)).toEqual({
      channel: "native",
      call: { method: "impact", options: { style: "LIGHT" } },
    });
  });

  it("vibrates on Android web with the kind's own pattern", () => {
    expect(planFeedback("error", androidWeb)).toEqual({ channel: "vibrate", pattern: [40, 60, 40, 60, 40] });
  });

  it("does nothing on iOS web, which has no vibration", () => {
    expect(planFeedback("success", iosWeb)).toEqual({ channel: "none" });
  });

  it("falls back to vibration in a shell built without the plugin", () => {
    expect(planFeedback("confirm", shellWithoutPlugin)).toEqual({ channel: "vibrate", pattern: 14 });
  });

  it("keeps only success and error under reduced motion", () => {
    const calm = { ...androidWeb, reducedMotion: true };
    expect(planFeedback("select", calm)).toEqual({ channel: "none" });
    expect(planFeedback("warning", calm)).toEqual({ channel: "none" });
    expect(planFeedback("success", calm).channel).toBe("vibrate");
    expect(planFeedback("error", calm).channel).toBe("vibrate");
  });
});

/*
 * A SOURCE GUARD, NOT BUNDLE PROOF. It reads feedback.ts as text and checks
 * the import is lazy and sits behind the native gate; it does not build the
 * app or inspect a chunk, so it cannot show what the browser downloads.
 */
describe("source guard: feedback.ts imports Capacitor only lazily", () => {
  it("has no static Capacitor import, and the lazy one sits behind looksNative", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const source = readFileSync(fileURLToPath(new URL("./feedback.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/^import[^;]*@capacitor/m);
    expect(source).toMatch(/await import\("@capacitor\/core"\)/);
    /* The lazy import sits after the looksNative() gate. */
    expect(source.indexOf("if (!native)")).toBeLessThan(source.lastIndexOf("void haptics()"));
  });
});
