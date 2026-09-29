import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The reveal must be visible in the server markup. This suite runs in Node
 * with the react-server build, so the client component cannot be rendered
 * here; the guard reads its source instead.
 */
const source = readFileSync(join(process.cwd(), "src/components/site/Reveal.tsx"), "utf8");

describe("site Reveal", () => {
  it("renders shown, and only the effect hides a block", () => {
    expect(source).toContain('data-shown="true"');
    expect(source).not.toMatch(/useState\(false\)/);
    /* Hiding happens after the above-the-fold check and the observer check. */
    const fold = source.indexOf("getBoundingClientRect().top < window.innerHeight");
    const guard = source.indexOf('typeof IntersectionObserver === "undefined"');
    const hide = source.indexOf('el.dataset.shown = "false"');
    expect(fold).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(fold);
    expect(hide).toBeGreaterThan(guard);
  });

  it("never hides under reduced motion", () => {
    const quiet = source.indexOf("if (motionQuiet()) return;");
    expect(quiet).toBeGreaterThan(-1);
    expect(quiet).toBeLessThan(source.indexOf('el.dataset.shown = "false"'));
  });
});
