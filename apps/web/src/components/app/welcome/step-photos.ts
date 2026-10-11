/**
 * THE GET STARTED PICTURES (30 September): one image per step and theme.
 *
 * The founder is making new art for the four steps (soft 3D clay, royal blue
 * with one coral accent), each scene in a light and a dark version, 1080 by
 * 1440, with the bottom 30 percent left empty for the fade into the page.
 *
 * TO DROP THEM IN: put the files at
 *
 *   public/brand/onboarding/step-1-light.webp   .../step-1-dark.webp
 *   public/brand/onboarding/step-2-light.webp   ...
 *
 * (under `brand/`, which the proxy's matcher passes straight through; a
 * top-level `public/onboarding/` would be answered by the proxy as a page
 * and 404 for a stranger)
 * and flip that step to `true` below. Until a step is `true` it keeps the
 * glass scene it has now (`StepArt`), so a half-delivered set never shows a
 * broken image. `step-photos.test.ts` fails if a step is switched on while
 * either of its files is missing.
 *
 * Step 4 is the ending: the account choice for a stranger, "You are in" for
 * a member. Both use the same picture.
 */
export type StepNumber = 1 | 2 | 3 | 4;

/*
 * All four arrived on 30 September (1 two worlds, 2 the shield and ID card,
 * 3 talk first and pay safely, 4 the orange arch), DARK ONLY, converted by
 * scripts/brand-3d.mjs. THE LIGHT VERSIONS ARE OWED: until the founder sends
 * them, every step-N-light.webp is a copy of the dark picture (its bottom
 * fades into the warm canvas). Replace those four files when the light art
 * lands (drop the sources in assets-src and rerun the script); nothing else
 * changes.
 */
export const STEP_PHOTOS_READY: Readonly<Record<StepNumber, boolean>> = {
  1: true,
  2: true,
  3: true,
  4: true,
};

/** The pictures' own size, for next/image. */
export const STEP_PHOTO_WIDTH = 1080;
export const STEP_PHOTO_HEIGHT = 1440;

export type StepPhoto = { light: string; dark: string };

export function stepPhotoPaths(step: StepNumber): StepPhoto {
  return {
    light: `/brand/onboarding/step-${step}-light.webp`,
    dark: `/brand/onboarding/step-${step}-dark.webp`,
  };
}

/** The step's picture pair, or null while it keeps the glass scene. */
export function stepPhoto(
  step: StepNumber,
  ready: Readonly<Record<StepNumber, boolean>> = STEP_PHOTOS_READY,
): StepPhoto | null {
  return ready[step] ? stepPhotoPaths(step) : null;
}
