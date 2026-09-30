/**
 * Grounds. DESIGN.md section 6a allows one backing for a store set: a quiet
 * vertical gradient, identical in every image, with nothing on it (no
 * photographs, textures, glows or vignettes). The gradient itself is
 * GROUND in shots/premium.mjs.
 */

/** A full-bleed CSS background, under everything else. */
export const fill = (css, extra = "") => `<div class="g" style="inset:0;background:${css};${extra}"></div>`;
