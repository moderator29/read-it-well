/**
 * WHERE THE POP-OUTS GO.
 *
 * callouts.mjs draws the containers; this places them against the handset.
 * A shot asks for furniture in its own terms and this works out the pixels,
 * for both stores, from the placed phone:
 *
 *   pops:    [{ side: "left"|"right", at: 0.34, kind: "stat", ... }]
 *            `at` is where the card's top sits down the phone's body (0 at the
 *            top of the frame, 1 at the bottom). A card on the left starts at
 *            the image's side margin less 18 px and runs across the phone's
 *            rim; the blueprint's cards sit ON the device, not beside it.
 *   props:   [{ name: "keys", x: 0.06, y: 0.84, size: 250, rot: -8 }]
 *            x and y are fractions of the image. `x` is the left edge, or give
 *            `rx` for the right edge's distance from the right of the image.
 *   figures: [{ text: "₦26,100,000", x|rx, y, size, rot }]
 *            the oversized outlined number.
 *
 * Every part is checked by compose.mjs: 40 px from the image's edge, and a
 * card set against the phone must not land on the camera or on a control it
 * leaves uncovered.
 *
 * COPY. DESIGN.md section 2 holds here as everywhere: no invented numbers,
 * no testimonials, no promise words, "verified" only about people. Every
 * figure a callout prints must be one the screen under it prints too.
 */
import { statCallout, lineCallout, cellsCallout, countersCallout, figureOutline, prop } from "./callouts.mjs";

const KIND = { stat: statCallout, line: lineCallout, cells: cellsCallout, counters: countersCallout };

/** The props the brand's 3D set may be drawn at: never over about 260 px on a 1080 canvas. */
const MAX_PROP = 260;

/**
 * Lay a shot's furniture over a placed phone.
 *   m   the grid (premium.mjs M)
 *   p   the placed phone
 */
export function furnish(ctx, m, p, { pops = [], props = [], figures = [] } = {}) {
  const u = ctx.W / 1320;
  const s = m.card;
  const out = [];

  for (const q of pops) {
    const { side = "left", at = 0.3, y: yf, kind = "line", w, fit = true, z = 30, scale, inset = 18, ...rest } = q;
    const draw = KIND[kind];
    if (!draw) throw new Error(`no such callout: ${kind}`);
    /* `y`, a fraction of the image, overrides `at`, a fraction of the handset. */
    const y = yf !== undefined ? yf * ctx.H : m.phoneTop + at * m.phoneH;
    const edge = m.side - inset;
    const box = side === "left" ? { x: edge } : { right: edge };
    out.push(draw({ ...box, y, w: w ? w * u : undefined, fit: w ? false : fit, scale: scale ?? s, z, ...rest }));
  }

  for (const q of props) {
    const { name, x, rx, y, size = 220, rot = 0, z = 34, glow = true, flip = false } = q;
    const d = Math.min(size, MAX_PROP) * u * 1.18;
    const box = rx !== undefined ? { right: rx * ctx.W } : { x: x * ctx.W };
    out.push(prop({ name, ...box, y: y * ctx.H, size: d, rotate: rot, z, glow, flip }));
  }

  for (const q of figures) {
    const { text, x, rx, y, size = 150, rot = -3, z = 26, color, stroke, align } = q;
    const box = rx !== undefined ? { right: rx * ctx.W } : { x: x * ctx.W };
    out.push(figureOutline({ text, ...box, y: y * ctx.H, size, scale: u, rotate: rot, z, color, stroke, align }));
  }

  return out.join("\n");
}
