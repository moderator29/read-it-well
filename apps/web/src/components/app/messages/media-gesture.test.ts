import { describe, expect, it } from "vitest";
import {
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  REST,
  doubleTap,
  fitted,
  legal,
  lockDirection,
  panLimit,
  resist,
  settleDismiss,
  settleSwipe,
  zoomAbout,
} from "./media-gesture";

const STAGE = { width: 400, height: 800 };
const WIDE = { width: 1200, height: 800 };

describe("the viewer's gesture arithmetic", () => {
  it("fits a photograph into the stage without cropping or stretching it", () => {
    expect(fitted(STAGE, WIDE)).toEqual({ width: 400, height: 400 / 1.5 });
    expect(fitted(STAGE, { width: 300, height: 1200 })).toEqual({ width: 200, height: 800 });
    expect(fitted(STAGE, null)).toEqual(STAGE);
  });

  it("lets a photograph be dragged only to its own edges", () => {
    expect(panLimit(STAGE, WIDE, 1)).toEqual({ x: 0, y: 0 });
    /* At 3x a 400px-wide fit is 1200px across a 400px stage: 400px each way. */
    expect(panLimit(STAGE, WIDE, 3).x).toBe(400);
    /* The wide photo is short, so it can be panned up and down less than the stage is tall. */
    expect(panLimit(STAGE, WIDE, 2).y).toBe(Math.max(0, (400 / 1.5) * 2 - 800) / 2);
    expect(legal({ scale: 3, x: 9999, y: -9999 }, STAGE, WIDE)).toEqual({ scale: 3, x: 400, y: -panLimit(STAGE, WIDE, 3).y });
  });

  it("clamps the scale and returns to rest at 1", () => {
    expect(legal({ scale: 99, x: 0, y: 0 }, STAGE, WIDE).scale).toBe(MAX_SCALE);
    expect(legal({ scale: 0.4, x: 50, y: 50 }, STAGE, WIDE)).toEqual(REST);
  });

  it("keeps the point under the fingers under the fingers while pinching", () => {
    const from = { x: 100, y: -50 };
    const z = zoomAbout(REST, 2, from, from);
    /* The photograph point that was at `from` is at `to`: t + s * p, with p = from. */
    expect(z.x + 2 * from.x).toBeCloseTo(from.x * 1 + 0, 5);
    expect(z).toEqual({ scale: 2, x: -100, y: 50 });
    /* Two fingers that move together pan as well as zoom. */
    expect(zoomAbout(REST, 1, { x: 0, y: 0 }, { x: 30, y: 10 })).toEqual({ scale: 1, x: 30, y: 10 });
  });

  it("double tap zooms in about the tap, and a second one zooms back out", () => {
    const zoomed = doubleTap(REST, { x: 0, y: 0 }, STAGE, WIDE);
    expect(zoomed.scale).toBe(DOUBLE_TAP_SCALE);
    expect(doubleTap(zoomed, { x: 10, y: 10 }, STAGE, WIDE)).toEqual(REST);
  });

  it("turns the page on a fifth of the width or a quick flick, and only where there is a page", () => {
    expect(settleSwipe(-80, 400, 400, 1, 3)).toBe("stay");
    expect(settleSwipe(-100, 400, 400, 1, 3)).toBe("next");
    expect(settleSwipe(-120, 400, 400, 1, 3)).toBe("next");
    expect(settleSwipe(120, 400, 400, 1, 3)).toBe("previous");
    expect(settleSwipe(-60, 80, 400, 1, 3)).toBe("next");
    expect(settleSwipe(-300, 100, 400, 2, 3)).toBe("stay");
    expect(settleSwipe(300, 100, 400, 0, 3)).toBe("stay");
  });

  it("closes on a fifth of the height or a quick downward flick", () => {
    expect(settleDismiss(100, 500, 800)).toBe(false);
    expect(settleDismiss(170, 500, 800)).toBe(true);
    expect(settleDismiss(90, 100, 800)).toBe(true);
    expect(settleDismiss(-200, 100, 800)).toBe(false);
  });

  it("resists a drag past the first or last photograph, and locks a direction after 8px", () => {
    expect(resist(90, 0, 3)).toBe(30);
    expect(resist(-90, 2, 3)).toBe(-30);
    expect(resist(90, 1, 3)).toBe(90);
    expect(lockDirection(3, 3)).toBeNull();
    expect(lockDirection(20, 5)).toBe("x");
    expect(lockDirection(5, 20)).toBe("y");
    expect(lockDirection(5, -20)).toBeNull();
  });
});
