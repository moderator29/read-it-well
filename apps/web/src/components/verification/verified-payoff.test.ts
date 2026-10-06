import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** The payoff's wiring and its rules, by source (the behaviour is in `VerifiedPayoff.dom.test.tsx`). */
const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the verification-passed payoff", () => {
  it("the approved plate draws its shield through VerifiedPayoff, and nothing else does", () => {
    const status = src("components/verification/KycStatus.tsx");
    expect(status).toContain("<VerifiedPayoff play={payoff.play} seenKey={payoff.seenKey}>");
    expect(status).toContain('payoff={{ play: status.payoff !== undefined');
    /* The pending, refused, more-info and suspended plates are untouched. */
    expect(status.match(/payoff=\{\{/g)).toHaveLength(1);
  });

  it("the page asks for it only when a rung passed recently, under a per-level key", () => {
    const page = src("app/(app)/verification/page.tsx");
    expect(page).toMatch(/approvedRecently\(Object\.values\(ladder\.ladder\.rungs\), requestNow\(\)\)\s*\? \{ state: "approved", payoff: \{ seenKey: `verification-passed:tier-\$\{ladder\.ladder\.tier\}` \} \}/);
  });

  it("is once per device, quiet-aware, waits for a modal, and moves only opacity and transform from tokens", () => {
    const code = strip(src("components/verification/VerifiedPayoff.tsx"));
    expect(code).toContain("seenOnce(seenKey)");
    expect(code).toContain("markSeen(seenKey)");
    expect(code).toContain("quiet");
    expect(code).toContain("isDataSaver()");
    expect(code).toContain('[aria-modal="true"]:not([data-closing])');
    for (const token of ["--nf-duration-slow", "--nf-duration-fast", "--nf-duration-base", "--nf-ease-entrance", "--nf-ease-standard"]) {
      expect(code).toContain(token);
    }
    expect(code).not.toMatch(/\b(width|height|top|left|filter)\s*:/);
    expect(code).not.toMatch(/infinite|iterations/);
    /* No words of its own. */
    expect(code).not.toMatch(/>\s*[A-Z][a-z]+(\s+[a-z]+)+\s*</);
  });

  it("adds no furniture to the plate: the disc is invisible at rest and only the payoff shows it", () => {
    const css = strip(src("components/verification/verified-payoff.css"));
    const badge = css.slice(css.indexOf(".nf-vpass__badge {"), css.indexOf("}", css.indexOf(".nf-vpass__badge {")));
    expect(badge).toMatch(/opacity:\s*0;/);
    expect(badge).toContain("position: absolute");
    const code = strip(src("components/verification/VerifiedPayoff.tsx"));
    /* The shield is already drawn (server rendered): it rises and scales and never fades. */
    expect(code).toContain('{ transform: "translateY(0.5rem) scale(0.86)" },');
    expect(code).not.toMatch(/opacity: 0, transform: "translateY/);
    /* The disc fades back out at the end of its one animation. */
    expect(code).toMatch(/opacity: 0, transform: "none", offset: 1/);
    /* A leaving sheet changes the answer, so the observer watches for it. */
    expect(code).toContain('attributeFilter: ["aria-modal", "data-closing"]');
  });
});
