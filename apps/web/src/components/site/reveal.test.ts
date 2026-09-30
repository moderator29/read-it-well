import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * ONE REVEAL (UIUX item 25). `components/site/Reveal.tsx` is a re-export of
 * `MotionReveal`, so the guarantees the old site reveal carried are held
 * against `components/motion/Reveal.tsx` now. This suite runs in Node with
 * the react-server build, so the client component cannot be rendered here;
 * the guard reads its source instead, with the comments taken out so a note
 * cannot satisfy it.
 */
const read = (path: string) => withoutComments(readFileSync(join(process.cwd(), "src", path), "utf8"));
const site = read("components/site/Reveal.tsx");
const motion = read("components/motion/Reveal.tsx");

describe("the one reveal", () => {
  it("is the site reveal and the motion reveal at once", () => {
    expect(site).toMatch(/export\s*\{\s*MotionReveal as Reveal\s*\}\s*from\s*"@\/components\/motion\/Reveal"/);
  });

  it("renders shown, and only the effect hides a block below the fold", () => {
    /* The server markup carries no hidden state at all. */
    expect(motion).not.toMatch(/data-reveal=/);
    expect(motion).not.toMatch(/useState\(false\)/);
    const fold = motion.indexOf("getBoundingClientRect().top < window.innerHeight");
    const guard = motion.indexOf('typeof IntersectionObserver === "undefined"');
    const hide = motion.indexOf('el.dataset.reveal = "out"');
    expect(fold).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
    expect(hide).toBeGreaterThan(fold);
    expect(hide).toBeGreaterThan(guard);
  });

  it("never hides under reduced motion, Calm or Off", () => {
    const quiet = motion.indexOf("motionQuiet()");
    expect(quiet).toBeGreaterThan(-1);
    expect(quiet).toBeLessThan(motion.indexOf('el.dataset.reveal = "out"'));
  });

  it("caps a sibling's delay at the sixth stagger step", () => {
    expect(motion).toContain("REVEAL_DELAY_CAP = 300");
    expect(motion).toMatch(/Math\.min\(Math\.max\(delay, 0\), REVEAL_DELAY_CAP\)/);
  });
});
