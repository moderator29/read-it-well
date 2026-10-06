import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vpassKeys, vpassSeen } from "./payoff-seen";

/** The payoff's wiring and its rules, by source (the behaviour is in `VerifiedPayoff.dom.test.tsx`). */
const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the verification-passed payoff", () => {
  it("the server decides it: a rung passed recently AND this device's cookie does not name the level", () => {
    const page = strip(src("app/(app)/verification/page.tsx"));
    expect(page).toMatch(
      /approvedRecently\(Object\.values\(ladder\.ladder\.rungs\), requestNow\(\)\) &&\s*!vpassSeen\(\(await cookies\(\)\)\.get\(VPASS_COOKIE\)\?\.value, tier\)/,
    );
    expect(page).toContain('status = news ? { state: "approved", payoff: { tier } } : { state: "approved" };');
    /* No sheet laid over the plate: the plate is the moment. */
    expect(page).not.toContain("SuccessFromFlag");
    expect(page).not.toContain("verificationApproved");
  });

  it("only the approved plate with a payoff is wrapped; every other plate is drawn plain", () => {
    const status = strip(src("components/verification/KycStatus.tsx"));
    expect(status).toContain("return payoff ? <VerifiedPayoff tier={payoff.tier}>{plate}</VerifiedPayoff> : plate;");
    expect(status.match(/payoff=\{/g)).toHaveLength(1);
    expect(status).toContain("payoff={status.payoff}");
  });

  it("one level is one key family across both doors, and the cookie names exactly one level", () => {
    expect(vpassKeys(2)).toEqual(["verification-passed:tier-2", "verification-approved:tier-2"]);
    /* The other door's sheet uses the second key, so seeing it there is seeing it here. */
    expect(strip(src("app/agent/verification/page.tsx"))).toContain("seenKey={`verification-approved:tier-${read.ladder.tier}`}");
    expect(vpassSeen("2", 2)).toBe(true);
    expect(vpassSeen("1", 2)).toBe(false);
    expect(vpassSeen(undefined, 1)).toBe(false);
  });

  it("the motion is the stylesheet's: transform and opacity (and the tick's own stroke), tokens, no loop", () => {
    const css = strip(src("components/verification/verified-payoff.css"));
    const frames = [...css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n  \}/g)].map((m) => m[1]!);
    expect(frames.length).toBeGreaterThanOrEqual(7);
    for (const body of frames) {
      const props = [...body.matchAll(/([a-z-]+):/g)].map((m) => m[1]);
      for (const prop of props) expect(["opacity", "transform", "stroke-dashoffset"]).toContain(prop);
    }
    expect(css).not.toMatch(/infinite/);
    expect(css).toContain("nf-vpass-pop 180ms");
    /* It plays only inside a plate the server asked for, and never once seen. */
    for (const part of ["was", "shield", "badge", "tick"]) expect(css).toMatch(new RegExp(`\\.nf-vpass__${part} \\{\\s*animation: nf-vpass-`));
    expect(css.match(/\.nf-vpass-plate\[data-vpass="play"\]:not\(\[data-vpass-seen\]\)/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it("the script decides once, remembers the level, and feels the pop through the one grammar", () => {
    const code = strip(src("components/verification/VerifiedPayoff.tsx"));
    expect(code).toContain("useLayoutEffect");
    expect(code).toContain("keys.some((key) => seenOnce(key))");
    expect(code).toContain("for (const key of keys) markSeen(key);");
    expect(code).toContain("path=/verification");
    expect(code).toContain('hapticOnPop(plate, "nf-vpass-pop")');
    const haptic = strip(src("components/verification/payoff-haptic.ts"));
    expect(haptic).toContain('feedback("success")');
    expect(haptic.match(/feedback\(/g)).toHaveLength(1);
  });
});
