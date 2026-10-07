import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SETTLED_LOCKUP } from "./lockup";

/*
 * Get Started's mark sits exactly where the startup sequence's settled lockup
 * will end (MOTION_SYSTEM.md section 4: no re-entrance of the mark). The
 * position is declared in two places, the stylesheet that draws it and the
 * module the startup will read, and a position declared twice drifts unless
 * something holds the copies together.
 */
const css = readFileSync(join(process.cwd(), "src/app/welcome/get-started.css"), "utf8");
const startup = readFileSync(join(process.cwd(), "src/components/startup/startup.css"), "utf8");
const passcode = readFileSync(join(process.cwd(), "src/app/css/passcode.css"), "utf8");

describe("the settled lockup", () => {
  it("Get Started's stylesheet places the mark where the startup will end", () => {
    expect(css).toContain(`--nf-lockup-top: ${SETTLED_LOCKUP.top};`);
    expect(css).toContain(`--nf-lockup-size: ${SETTLED_LOCKUP.size};`);
  });

  it("the startup sequence settles its mark in the same box", () => {
    expect(startup).toContain(`--nf-startup-top: ${SETTLED_LOCKUP.top};`);
    expect(startup).toContain(`--nf-startup-mark: ${SETTLED_LOCKUP.size};`);
  });

  it("the passcode screen puts its small mark in the same place, so the two read as one family", () => {
    expect(passcode).toContain(`--nf-passcode-mark-top: ${SETTLED_LOCKUP.top};`);
    expect(passcode).toContain(`--nf-passcode-mark: ${SETTLED_LOCKUP.size};`);
  });

  it("the mark is the only thing on the mark's layer and it never re-enters", () => {
    /* The entrance animates the wash, the line, the quiet line and the doors;
       the mark has no entrance keyframes of its own. */
    const markRule = css.slice(css.indexOf(".nf-gsm__mark {"), css.indexOf("}", css.indexOf(".nf-gsm__mark {")));
    expect(markRule).not.toContain("animation");
  });
});
