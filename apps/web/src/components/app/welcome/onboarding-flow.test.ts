import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampStep,
  dragPose,
  keyStep,
  motionPlan,
  progressFills,
  sceneState,
  skipPlan,
  swipeStep,
  SWIPE_SPEED,
} from "./onboarding-flow";

const LAST = 3;

describe("step navigation", () => {
  it("keeps every move inside the four steps", () => {
    expect(clampStep(-1, LAST)).toBe(0);
    expect(clampStep(4, LAST)).toBe(LAST);
    expect(clampStep(2, LAST)).toBe(2);
    expect(clampStep(Number.NaN, LAST)).toBe(0);
  });

  it("moves one step per arrow key and jumps with Home and End", () => {
    expect(keyStep("ArrowRight", 0, LAST)).toBe(1);
    expect(keyStep("ArrowLeft", 2, LAST)).toBe(1);
    expect(keyStep("ArrowLeft", 0, LAST)).toBe(0);
    expect(keyStep("ArrowRight", LAST, LAST)).toBe(LAST);
    expect(keyStep("Home", 2, LAST)).toBe(0);
    expect(keyStep("End", 0, LAST)).toBe(LAST);
  });

  it("leaves every other key alone", () => {
    expect(keyStep("Enter", 1, LAST)).toBeNull();
    expect(keyStep(" ", 1, LAST)).toBeNull();
    expect(keyStep("a", 1, LAST)).toBeNull();
  });

  it("turns the step on a swipe far enough or fast enough, right to left moving on", () => {
    const base = { dy: 0, vx: 0, width: 390, index: 1, last: LAST };
    expect(swipeStep({ ...base, dx: -120 })).toBe(2);
    expect(swipeStep({ ...base, dx: 120 })).toBe(0);
    expect(swipeStep({ ...base, dx: -30, vx: -(SWIPE_SPEED + 50) })).toBe(2);
  });

  it("stays put on a short slow swipe, a vertical one, a flick against the drag, or past either end", () => {
    const base = { dy: 0, vx: 0, width: 390, last: LAST };
    expect(swipeStep({ ...base, index: 1, dx: -30 })).toBe(1);
    expect(swipeStep({ ...base, index: 1, dx: -120, dy: 200 })).toBe(1);
    expect(swipeStep({ ...base, index: 1, dx: -30, vx: SWIPE_SPEED + 50 })).toBe(1);
    expect(swipeStep({ ...base, index: 0, dx: 200 })).toBe(0);
    expect(swipeStep({ ...base, index: LAST, dx: -200 })).toBe(LAST);
  });

  it("places each scene before, on or after the step on screen", () => {
    expect([0, 1, 2, 3].map((i) => sceneState(i, 1))).toEqual(["prev", "active", "next", "next"]);
  });

  it("fills one progress segment per step reached", () => {
    expect(progressFills(0, 4)).toEqual([1, 0, 0, 0]);
    expect(progressFills(2, 4)).toEqual([1, 1, 1, 0]);
    expect(progressFills(3, 4)).toEqual([1, 1, 1, 1]);
  });
});

describe("Skip goes where it always went", () => {
  it("a stranger going somewhere carries on there", () => {
    expect(skipPlan({ guest: true, next: "/sign-up" })).toEqual({ kind: "go", to: "/sign-up" });
  });

  it("a stranger going nowhere lands on the ending (the account choice)", () => {
    expect(skipPlan({ guest: true, next: null })).toEqual({ kind: "ending" });
  });

  it("somebody signed in takes the real skip, then their destination or home", () => {
    expect(skipPlan({ guest: false, next: null })).toEqual({ kind: "member", to: "/home" });
    expect(skipPlan({ guest: false, next: "/saved" })).toEqual({ kind: "member", to: "/saved" });
  });
});

describe("the reduced motion path", () => {
  it("quiet (reduced motion, Calm or Off): every step lands at once and nothing moves", () => {
    expect(motionPlan({ quiet: true, ambient: false })).toEqual({
      slide: false,
      stagger: false,
      follow: false,
      idle: false,
      count: false,
    });
  });

  it("a still background keeps the arrivals and drops the float", () => {
    expect(motionPlan({ quiet: false, ambient: false })).toEqual({
      slide: true,
      stagger: true,
      follow: true,
      idle: false,
      count: true,
    });
  });

  it("full motion moves everything", () => {
    expect(motionPlan({ quiet: false, ambient: true }).idle).toBe(true);
  });

  it("a drag fades the leaving scene down as the arriving one comes up", () => {
    expect(dragPose(0, 0)).toEqual({ shift: 0, opacity: 1 });
    expect(dragPose(1, -0.5)).toEqual({ shift: 0.5, opacity: 0.5 });
    expect(dragPose(0, -0.5)).toEqual({ shift: -0.5, opacity: 0.5 });
    expect(dragPose(2, -0.5).opacity).toBe(0);
    expect(dragPose(1, -3)).toEqual({ shift: 0, opacity: 1 });
  });

  it("stops every animation the stylesheet runs, under reduced motion, Calm and Off and once hydrated quiet", () => {
    const css = readFileSync(join(__dirname, "../../../app/welcome/onboarding-motion.css"), "utf8");
    /* Every class that is given an animation somewhere... */
    const animated = new Set<string>();
    const rule = /([^{}]+)\{[^{}]*\banimation:\s*(?!none)[^;]+;/g;
    let match: RegExpExecArray | null;
    while ((match = rule.exec(css))) {
      const selector = match[1] ?? "";
      if (/@keyframes|\bfrom\b|\bto\b|%/.test(selector)) continue;
      const classes = selector.match(/\.nf-om-[a-z0-9_-]+/g) ?? [];
      const last = classes[classes.length - 1];
      if (last) animated.add(last);
    }
    expect(animated.size).toBeGreaterThan(5);
    /* ...is named in all three quiet lists. */
    const quietLists = [
      /\.nf-om\[data-quiet\] :is\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*\{\s*animation: none;/,
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?:is\(([^{]*)\)\s*\{\s*animation: none;/,
      /\[data-motion="off"\]\) \.nf-om :is\(([^{]*)\)\s*\{\s*animation: none;/,
    ];
    for (const list of quietLists) {
      const found = css.match(list);
      expect(found, String(list)).not.toBeNull();
      const named = found?.[1] ?? "";
      for (const cls of animated) {
        const covered = /^\.nf-om-(title|body)$/.test(cls) && named.includes(".nf-om-words > *");
        expect(covered || named.includes(cls), `${cls} in ${String(list)}`).toBe(true);
      }
    }
  });
});
