import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STEP_PHOTOS_READY, stepPhoto, stepPhotoPaths, type StepNumber } from "./step-photos";

const PUBLIC = join(__dirname, "../../../../public");
const STEPS: StepNumber[] = [1, 2, 3, 4];

describe("Get started pictures", () => {
  it("names one light and one dark file per step under /brand/onboarding", () => {
    expect(stepPhotoPaths(2)).toEqual({
      light: "/brand/onboarding/step-2-light.webp",
      dark: "/brand/onboarding/step-2-dark.webp",
    });
  });

  it("keeps the glass scene until a step is switched on", () => {
    expect(stepPhoto(1, { 1: false, 2: false, 3: false, 4: false })).toBeNull();
    expect(stepPhoto(3, { 1: false, 2: false, 3: true, 4: false })).toEqual(stepPhotoPaths(3));
  });

  it.each(STEPS)("step %i is only switched on when both of its files exist", (step) => {
    if (!STEP_PHOTOS_READY[step]) return;
    const { light, dark } = stepPhotoPaths(step);
    expect(existsSync(join(PUBLIC, light)), light).toBe(true);
    expect(existsSync(join(PUBLIC, dark)), dark).toBe(true);
  });
});
