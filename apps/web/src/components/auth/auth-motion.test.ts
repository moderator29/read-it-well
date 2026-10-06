import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The auth sheet's motion and material rules (W11, 6 October 2026), held as
 * source text because a stylesheet cannot be unit-run: the form error is the
 * motion system's (`whip`, 4px, once, 160ms, the message beneath, never a
 * dialog), nothing on an auth screen loops but the caret that says "type
 * here", and the sheet keeps to three weights.
 */
const css = readFileSync(join(process.cwd(), "src/app/css/auth.css"), "utf8");
const ofTour = readFileSync(join(process.cwd(), "src/app/welcome/onboarding-motion.css"), "utf8");

describe("auth.css", () => {
  it("shakes a refused field 4px once on whip at the fast rung", () => {
    expect(css).toMatch(/\[data-shake="a"\][^{]*\{\s*animation: nf-field-shake-a var\(--nf-duration-fast\) var\(--nf-ease-whip\) both;/);
    expect(css).toMatch(/\[data-shake="b"\][^{]*\{\s*animation: nf-field-shake-b var\(--nf-duration-fast\) var\(--nf-ease-whip\) both;/);
    for (const name of ["a", "b"]) {
      const frames = css.match(new RegExp(`@keyframes nf-field-shake-${name} \\{[\\s\\S]*?\\n  \\}`))?.[0] ?? "";
      expect(frames).toContain("translate3d(-4px, 0, 0)");
      expect(frames).toContain("translate3d(4px, 0, 0)");
      expect(frames).not.toMatch(/\b(6|8|10)px/);
    }
  });

  it("fades the message in beneath the field, and never opens a dialog for it", () => {
    expect(css).toContain("animation: nf-field-message var(--nf-duration-fast) var(--nf-ease-entrance) both");
    const refusalSources = ["useRefusalShake.ts", "EmailAuthForm.tsx", "VerifyCodeForm.tsx"].map((f) =>
      readFileSync(join(__dirname, f), "utf8"),
    );
    for (const source of refusalSources) expect(source).not.toMatch(/alert\(|<dialog|showModal|window\.confirm/);
  });

  it("loops nothing but the code field's caret", () => {
    const loops = [...css.matchAll(/animation:[^;]*\binfinite\b/g)].map((m) => m[0]);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toContain("nf-code-caret");
  });

  it("keeps to three weights: 400, 500 and 600", () => {
    const weights = new Set([...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]));
    for (const w of weights) expect(["400", "500", "600"]).toContain(w);
  });

  it("holds the arrival at the specified beats: 620ms land, then the 180ms-class pop", () => {
    expect(css).toMatch(/\.nf-arrival__art \{[^}]*animation: nf-arrival-rise var\(--nf-duration-deliberate\) var\(--nf-ease-entrance\) both/);
    expect(css).toMatch(/\.nf-arrival__pop \{[\s\S]*?animation: nf-arrival-pop var\(--nf-duration-fast\) var\(--nf-ease-spring\) var\(--nf-duration-deliberate\) both/);
  });
});

describe("the tour's stylesheet", () => {
  it("loops nothing, and keeps to the weights", () => {
    expect(ofTour).not.toMatch(/animation:[^;]*\binfinite\b/);
    const weights = new Set([...ofTour.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]));
    for (const w of weights) expect(["400", "500", "600"]).toContain(w);
  });

  it("has no proof band and no invented figure: no naira, no counts, no press names", () => {
    const scenes = readFileSync(join(process.cwd(), "src/components/app/welcome/OnboardingScenes.tsx"), "utf8");
    const code = scenes.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\u20A6|Intl\.NumberFormat|CountUp|Million|Forbes|stars/i);
  });
});
