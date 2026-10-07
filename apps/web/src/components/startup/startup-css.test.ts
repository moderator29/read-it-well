import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE STARTUP SEQUENCE'S STYLESHEET, HELD TO ITS CONTRACT (D31; MOTION_SYSTEM
 * principle 10: nothing loops). October 2026: the real brand art rises, one
 * light sweeps the glass, and the door fades and lifts the whole overlay.
 * Transform and opacity only, on the design tokens' curves, with the door on
 * the one number the script moves, and no hold for a page still streaming.
 */
const css = readFileSync(join(__dirname, "startup.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const tsx = readFileSync(join(__dirname, "StartupSequence.tsx"), "utf8");

/** Every `@keyframes` block, by name, with its body. */
function keyframes(): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    found.set(m[1]!, css.slice(start, i - 1));
  }
  return found;
}

describe("startup.css", () => {
  it("has no infinite animation", () => {
    expect(css).not.toMatch(/\binfinite\b/);
  });

  it("no longer holds the lockup for a page still streaming", () => {
    expect(css).not.toMatch(/nf-startup-hold/);
  });

  it("schedules the door on the one number the script moves, 1350ms (500ms quietly)", () => {
    expect(css).toMatch(/:root\[data-splash="on"\]\s*\{\s*--nf-startup-door:\s*1350ms;/);
    expect(css).toMatch(/--nf-startup-door:\s*500ms;/);
    for (const name of ["nf-startup-door", "nf-startup-fade"]) {
      /* Every use in an animation list: the name, then its duration. */
      const uses = [...css.matchAll(new RegExp(`(?<![\\w-])${name}\\s+\\d+ms[^;,]*`, "g"))].map((m) => m[0]);
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use, name).toContain("var(--nf-startup-door)");
    }
  });

  it("moves with transform and opacity only (the door and the fade also stop catching pointers)", () => {
    const frames = keyframes();
    for (const name of ["nf-startup-bloom", "nf-startup-rise", "nf-startup-follow", "nf-startup-sweep", "nf-startup-door", "nf-startup-fade"]) {
      expect(frames.has(name), name).toBe(true);
    }
    for (const [name, body] of frames) {
      const props = [...body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]);
      for (const prop of props) expect(["transform", "opacity", "visibility", "pointer-events"], `${name}: ${prop}`).toContain(prop);
    }
    expect(frames.get("nf-startup-rise")).toMatch(/translateY\(24px\)\s*scale\(0\.86\)/);
    expect(frames.get("nf-startup-follow")).toMatch(/translateY\(12px\)/);
    expect(frames.get("nf-startup-sweep")).toMatch(/translateX\(-120%\)[\s\S]*translateX\(120%\)/);
    expect(frames.get("nf-startup-door")).toMatch(/scale\(1\.04\)/);
  });

  it("uses the design tokens' curves, never a literal cubic-bezier", () => {
    expect(css).not.toMatch(/cubic-bezier/);
    expect(css).toMatch(/nf-startup-rise 700ms var\(--nf-ease-entrance\) 60ms both/);
    expect(css).toMatch(/nf-startup-follow 500ms var\(--nf-ease-entrance\) 180ms both/);
    expect(css).toMatch(/nf-startup-sweep 900ms var\(--nf-ease-standard\) 560ms both/);
    expect(css).toMatch(/nf-startup-door 400ms var\(--nf-ease-exit\) var\(--nf-startup-door\) forwards/);
  });

  it("masks the sweep to the real mark's own shape", () => {
    expect(css).toMatch(/-webkit-mask-image:\s*url\("\/brand\/startup\/vallo-mark\.webp"\)/);
    expect(css).toMatch(/(?<!-)mask-image:\s*url\("\/brand\/startup\/vallo-mark\.webp"\)/);
    expect(css).toMatch(/(?<!-)mask-size:\s*contain/);
  });

  it("holds every animation at its first frame during the native wait", () => {
    expect(css).toMatch(/:root\[data-startup-native="wait"\] \*,[\s\S]*?animation-play-state:\s*paused !important/);
  });

  it("under reduced motion stills the bloom, the rise and the sweep, and fades by a real 200ms", () => {
    const quiet = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(quiet).toMatch(/\.nf-startup__glow, \.nf-startup__mark, \.nf-startup__word\) \{\s*animation: none !important;/);
    expect(quiet).toMatch(/\.nf-startup__shine \{\s*display: none;/);
    expect(quiet).toMatch(/--nf-reduced-duration: 200ms;/);
    expect(quiet).toMatch(/nf-startup-fade 200ms var\(--nf-ease-standard\) var\(--nf-startup-door\) forwards/);
  });
});

describe("StartupSequence's art", () => {
  it("draws the real brand images, not the vector redraw", () => {
    expect(tsx).not.toMatch(/vector-mark/);
    expect(tsx).not.toMatch(/<svg/);
    for (const file of ["vallo-mark.webp", "vallo-wordmark.webp"]) {
      expect(tsx).toContain(`/brand/startup/${file}`);
      expect(existsSync(join(__dirname, "..", "..", "..", "public", "brand", "startup", file)), file).toBe(true);
    }
  });
});
