import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE MEMBER AREAS' MOMENTS HELD TO MOTION_SYSTEM.md (Session 3, C1), BY SOURCE.
 *
 * List arrival, tab change, message arrival and the toggle's track are all
 * stylesheet facts, so they are asserted where they are written. Each was wrong
 * or missing before: no member list (inbox, notifications, the account rows,
 * the support tickets) arrived at all, a tab change swapped its panel with no
 * motion, a message sprang in on the overshooting curve (a pop, which only a
 * payoff may have) at 380ms, and the toggle's track snapped under a travelling
 * knob.
 */
const css = (file: string) => readFileSync(join(process.cwd(), "src/app/css", file), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("list arrival (MOTION_SYSTEM: first six, 40ms apart, 12px lift and fade)", () => {
  const kit = strip(css("motion-kit.css"));

  it("lifts 12px and fades on land at the base duration, 40ms per step", () => {
    expect(kit).toContain("animation: nf-arrive-in var(--nf-duration-base) var(--nf-ease-entrance) both");
    expect(kit).toMatch(/animation-delay: calc\(var\(--nf-splash-hold, 0s\) \+ var\(--nf-arrive-i\) \* 40ms\)/);
    expect(kit).toMatch(/@keyframes nf-arrive-in \{\s*from \{\s*opacity: 0;\s*transform: translate3d\(0, 12px, 0\);/);
  });

  it("staggers the first five steps and lets the sixth and later share the last", () => {
    expect(kit).toContain("--nf-arrive-i: 5;");
    for (const [child, step] of [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4]]) {
      expect(kit).toMatch(new RegExp(`:nth-child\\(${child}\\) \\{\\s*--nf-arrive-i: ${step};`));
    }
  });

  it("names the member lists, and lands at once under reduced motion, Calm and Off", () => {
    for (const container of [".nf-inbox-list", ".nf-notif__group .nf-list-group", ".nf-pf-rows", ".nf-arrive-list"]) {
      expect(kit).toContain(container);
    }
    expect(kit).toMatch(/prefers-reduced-motion: reduce\) \{[\s\S]*?animation: none;/);
    expect(kit).toMatch(/\[data-motion="off"\][\s\S]*?animation: none;/);
    expect(strip(css("motion-pref.css"))).toContain(':root[data-motion="calm"] :is(.nf-inbox-list');
  });

  it("the shared rise sequence follows the same first-six, 40ms rule", () => {
    expect(strip(css("animation.css"))).toContain("min(var(--nf-rise-i, 0), 5) * 40ms");
  });
});

describe("tab change (crossfade plus a 12px lift, glide 240ms)", () => {
  const kit = strip(css("motion-kit.css"));

  it("is the base duration on the standard curve, transform and opacity only", () => {
    expect(kit).toContain("animation: nf-tab-swap var(--nf-duration-base) var(--nf-ease-standard) both");
    const frames = kit.slice(kit.indexOf("@keyframes nf-tab-swap"), kit.indexOf("@keyframes nf-tab-swap") + 160);
    expect(frames).toContain("translate3d(0, 12px, 0)");
    expect(frames).not.toMatch(/width|height|top|left|filter/);
  });
});

describe("message arrival", () => {
  const motion = strip(css("motion.css"));

  it("lands on land at the base duration, never on the overshooting spring", () => {
    expect(motion).toContain("animation: nf-msg-in-right var(--nf-duration-base) var(--nf-ease-entrance) both");
    expect(motion).toContain("animation: nf-msg-in-left var(--nf-duration-base) var(--nf-ease-entrance) both");
    const frames = motion.slice(motion.indexOf("@keyframes nf-msg-in-right"), motion.indexOf("@keyframes nf-msg-in-left") + 120);
    expect(frames).not.toMatch(/scale\(/);
  });

  it("is only added to a message that arrives after the thread opened", () => {
    const thread = readFileSync(join(process.cwd(), "src/app/(app)/messages/[id]/ThreadView.tsx"), "utf8");
    expect(thread).toContain("openedWith.has(m.id)");
  });
});

describe("the toggle", () => {
  it("crossfades its track on the base duration, with the knob's spring beside it", () => {
    const controls = strip(css("controls.css"));
    const sweep = controls.slice(controls.lastIndexOf("  .nf-switch {"), controls.lastIndexOf('.nf-switch[aria-checked="true"] {'));
    expect(sweep).toContain("background-color var(--nf-duration-base) var(--nf-ease-standard)");
    expect(sweep).not.toContain("transition: none");
  });
});

describe("nothing in these moments loops", () => {
  it("has no infinite animation in the new rules", () => {
    const kit = strip(css("motion-kit.css"));
    const added = kit.slice(kit.indexOf("THE MEMBER AREAS") === -1 ? kit.indexOf(".nf-arrive-list") : kit.indexOf(".nf-arrive-list") - 200);
    expect(added).not.toMatch(/infinite/);
  });
});
