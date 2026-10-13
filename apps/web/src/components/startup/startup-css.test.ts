import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NATIVE_WAIT_MS,
  OPENING_BRIEF_MS,
  OPENING_FULL_MS,
  STARTUP_GATE_SCRIPT,
  STARTUP_NATIVE_SCRIPT,
  STARTUP_RELEASE_MS,
  STARTUP_SCRIPT,
} from "./startup-script";

/**
 * THE LOGO NEVER APPEARS BY ITSELF ON APP OPEN (D68c, 7 October 2026).
 *
 * These read the files on the startup path (the root layout, the opening's
 * stylesheet, the threshold sheet's startup rules and the three inline
 * scripts) and fail if a brand lockup is put back on it: the retired
 * `StartupSequence` overlay, `BrandAssemble`, the logo components, the
 * `/brand/startup` art, or any overlay class. They also hold the opening to
 * its budget and its motion rules. The behaviour, frame by frame in a real
 * browser, is `StartupOpening.dom.test.tsx`.
 */

const WEB = join(__dirname, "..", "..", "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const css = strip(readFileSync(join(__dirname, "startup.css"), "utf8"));
const layout = strip(readFileSync(join(WEB, "src", "app", "layout.tsx"), "utf8"));
const threshold = strip(readFileSync(join(WEB, "src", "app", "css", "threshold.css"), "utf8"));
const scripts = [STARTUP_NATIVE_SCRIPT, STARTUP_GATE_SCRIPT, STARTUP_SCRIPT].join("\n");

const BRAND_ON_THE_PATH = [
  /StartupSequence/,
  /BrandAssemble/,
  /\bLogo(Mark)?\b/,
  /VectorMark/,
  /brand\/startup/,
  /nf-startup__/,
  /nf-splash__brand/,
  /STARTUP_(MARK|WORDMARK)/,
];

describe("the startup path carries no brand lockup", () => {
  it("the root layout renders no logo, lockup or overlay on open", () => {
    for (const pattern of BRAND_ON_THE_PATH) expect(layout, String(pattern)).not.toMatch(pattern);
  });

  it("the opening's stylesheet draws no mark and no overlay", () => {
    for (const pattern of BRAND_ON_THE_PATH) expect(css, String(pattern)).not.toMatch(pattern);
    expect(css).not.toMatch(/\.nf-splash\b/);
    expect(css).not.toMatch(/position:\s*fixed/);
  });

  it("the threshold sheet has no splash brand rules left", () => {
    expect(threshold).not.toMatch(/nf-splash__brand/);
    expect(threshold).not.toMatch(/:root\[data-splash="on"\]\s*#main\s*\{[^}]*nf-threshold-forward/);
  });

  it("the inline scripts never create or reveal anything: they only set flags and hide the native splash", () => {
    expect(scripts).not.toMatch(/createElement|innerHTML|appendChild|<img/);
    expect(scripts).not.toMatch(/\.nf-startup|\.nf-splash/);
  });

  it("the retired overlay component is gone", () => {
    expect(existsSync(join(__dirname, "StartupSequence.tsx"))).toBe(false);
  });
});

describe("the opening's budget and motion", () => {
  it("is about 1,500ms on a first open and about 400ms on a returning one", () => {
    expect(OPENING_FULL_MS).toBeLessThanOrEqual(1500);
    expect(OPENING_BRIEF_MS).toBeLessThanOrEqual(400);
    expect(STARTUP_RELEASE_MS).toBeLessThanOrEqual(300);
    expect(NATIVE_WAIT_MS).toBeLessThanOrEqual(600);
  });

  it("holds the page's entrances for 160ms on a full opening, none on a brief one, not a logo's 1,450ms", () => {
    expect(css).toMatch(/:root\[data-splash="on"\]\s*\{\s*--nf-startup-door:\s*60ms;/);
    expect(css).toMatch(/\[data-opening="brief"\]\s*\{\s*--nf-startup-door:\s*-100ms;/);
    expect(threshold).toMatch(/--nf-splash-hold:\s*calc\(var\(--nf-startup-door,\s*60ms\)\s*\+\s*100ms\)/);
  });

  it("has no infinite animation, and every curve is a token", () => {
    expect(css).not.toMatch(/\binfinite\b/);
    expect(css).not.toMatch(/cubic-bezier/);
    for (const m of css.matchAll(/animation:\s*[\w-]+\s+\d+ms\s+([^\s;]+)/g)) expect(m[1]).toMatch(/^var\(--nf-ease-/);
  });

  it("moves the chrome with translate and opacity, and the ground with opacity only", () => {
    const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const [, name, body] of keyframes) {
      const props = [...body!.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]);
      for (const p of props) expect(["opacity", "translate"], `${name}: ${p}`).toContain(p);
      if (name === "nf-open-ground") expect(props).toEqual(["opacity"]);
    }
  });

  it("starts the header and the dock visible (frame one is the product), never from nothing", () => {
    for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{\s*from\s*\{([^}]*)\}/g)) {
      const opacity = /opacity:\s*([\d.]+)/.exec(m[1]!);
      expect(Number(opacity?.[1] ?? 1)).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("staggers depth words at most 60ms apart", () => {
    for (const m of threshold.matchAll(/var\(--nf-i,\s*0\)\s*\*\s*(\d+)ms/g)) expect(Number(m[1])).toBeLessThanOrEqual(60);
  });

  it("holds every animation at its first frame during the native wait", () => {
    expect(css).toMatch(/:root\[data-startup-native="wait"\][\s\S]*animation-play-state:\s*paused\s*!important/);
  });
});
