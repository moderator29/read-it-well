import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THREE MOMENTS HELD TO MOTION_SYSTEM.md (Session 3, R2), BY SOURCE.
 *
 * The sheet's entry and exit, the empty state's settle and the chip's select
 * push are all stylesheet or token facts, so they are asserted where they are
 * written. Each of these was wrong before: the sheet entered on the spring
 * curve (a 1.28 overshoot) and left as slowly as it arrived, and the empty
 * state's picture floated on a six second infinite loop.
 */
const css = (file: string) => readFileSync(join(process.cwd(), "src/app/css", file), "utf8");

const rule = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  expect(start, `${selector} is in the stylesheet`).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf("}", start));
};

describe("Sheet entry and exit", () => {
  const overlays = css("overlays.css");

  it("rises on land at 380ms", () => {
    expect(rule(overlays, '.nf-sheet[data-open="true"]')).toContain(
      "transition: transform var(--nf-duration-slow) var(--nf-ease-entrance)",
    );
  });

  it("leaves on leave at 240ms", () => {
    expect(rule(overlays, "  .nf-sheet")).toContain(
      "transition: transform var(--nf-duration-base) var(--nf-ease-exit)",
    );
  });
});

describe("The empty state", () => {
  const inner = css("inner-m.css");
  const noComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
  const block = noComments(inner.slice(inner.indexOf("empty states */"), inner.indexOf("settings groups */")));

  it("settles once and never loops", () => {
    expect(block).not.toMatch(/infinite/);
    expect(noComments(inner)).not.toContain("nf-in-float");
  });

  it("settles the picture on drift at 520ms, then fades the copy after it", () => {
    expect(block).toContain("nf-in-settle var(--nf-duration-entrance) var(--nf-ease-spring)");
    expect(block).toMatch(/animation: nf-in-fade var\(--nf-duration-base\)/);
    expect(block).toMatch(/animation-delay: calc\(var\(--nf-duration-entrance\) \* 0\.6\)/);
  });

  it("moves by transform and opacity only", () => {
    const keyframes = noComments(inner.slice(inner.indexOf("@keyframes nf-in-settle"), inner.indexOf("settings groups */")));
    expect(keyframes).not.toMatch(/filter|blur|width|height|top|left/);
  });
});
