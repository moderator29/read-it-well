/**
 * THE POP-OUT CALLOUTS.
 *
 * The founder's brief, 16 October 2026, with five pump.fun App Store images
 * as the blueprint: "those pop up ui containers... the kind of container and
 * tick edges it have... those 3d stuffs, those pop up price etc... in our own
 * brand identity".
 *
 * What that set does, and what this module does in Vallo's language:
 *
 *   1. A FLOATING CONTAINER, not a notification. It is a dark slab with a
 *      bright hairline edge, and the edge is interrupted: a small label tab
 *      sits astride the top rule, and four short brackets ("ticks") stand
 *      just outside the corners, like crop marks. That is the single detail
 *      that makes the container read as a HUD part rather than a toast.
 *      pump.fun's is mint on black; ours is Vallo sky (#8FD3FF) on the
 *      product's own navy, at the product's radii, in the product's type.
 *   2. AN EMBEDDED SUB-CARD of label/value columns inside the container
 *      (their Position / Net PnL), one shade lighter than the slab.
 *   3. AN OVERSIZED OUTLINED FIGURE standing on its own, stroked not filled,
 *      so the ground reads through the numerals.
 *   4. 3D PROPS floating free, half behind the container, on their own light.
 *      Ours are the brand's own 49 objects, not stock emoji.
 *
 * Every part is OPAQUE where it crosses a handset's display, or honestly
 * translucent: compose.mjs lays the capture on through B - A, so a part at
 * alpha a over the glass composites exactly as drawn. No backdrop-filter
 * over a display, though: the capture is not there yet when the page is
 * drawn.
 *
 * Sizes are in the finished image's pixels; `scale` is the set's card size
 * (M(ctx).card), so a callout is the same size against the phone in both
 * stores.
 */
import { icon, brandUrl, C } from "./lib.mjs";

const px = (v) => `${Math.round(v * 100) / 100}px`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------- the shell */

/**
 * The container itself. Everything else in this module is content poured
 * into it.
 *
 *   x / right   left edge, or the right edge's distance from the image's right
 *   y           top edge
 *   w / fit     a set width, or as wide as its content
 *   tab         the label astride the top rule ("VERIFIED", "MOVE-IN TOTAL")
 *   ticks       the four corner brackets (on by default: this is the detail)
 *   tone        "dark" (navy slab) or "sky" (the one bright container a set
 *               may carry, electric blue, for the single loudest number)
 *   rotate      degrees; the set keeps every callout inside +/- 4
 *   lift        how hard the drop shadow reads (1 = the set's default)
 */
export function shell({
  x, right, y, w, fit = false, rotate = 0, scale = 1, z = 30, tab = null, ticks = true,
  tone = "dark", inner = "", pad = [24, 30], gap = 0, radius = 38, origin = "center", lift = 1, cls = "", center = false, anchor = null,
}) {
  const s = scale;
  const place = right !== undefined ? `right:${px(right)}` : `left:${px(x)}`;
  const width = fit ? "width:max-content" : `width:${px(w)}`;
  const brackets = ticks
    ? ["tl", "tr", "bl", "br"].map((k) => `<i class="tk ${k}" style="--o:${px(-11 * s)};--d:${px(32 * s)};--tw:${px(3.4 * s)};--tr:${px((Math.min(radius, 46) + 11) * s)}"></i>`).join("")
    : "";
  const label = tab
    ? `<span class="cotab" style="left:${px(36 * s)};font-size:${px(20 * s)};padding:${px(7 * s)} ${px(16 * s)};border-radius:999px;border-width:${px(1.6 * s)}">${esc(tab)}</span>`
    : "";
  return `<div class="co ${tone} ${cls} abs" style="${place};top:${px(y)};${width};transform:${anchor === "bottom" ? "translateY(-100%) " : (center || anchor === "center") ? "translateY(-50%) " : ""}rotate(${rotate}deg);transform-origin:${origin};z-index:${z};padding:${px(pad[0] * s)} ${px(pad[1] * s)};border-radius:${px(radius * s)};${gap ? `gap:${px(gap * s)};` : ""}--lift:${lift}">
    ${brackets}${label}<div class="cobody">${inner}</div></div>`;
}

/* ------------------------------------------------------------- contents */

/** A line icon on the product's electric disc. */
function disc(name, s, { size = 104, r = 50 } = {}) {
  return `<div class="codisc" style="width:${px(size * s)};height:${px(size * s)};border-radius:${px(size * 0.34 * s)}">${icon(name, { size: Math.round(r * s), color: "#FFFFFF", stroke: 2.1 })}</div>`;
}

/** The small uppercase label every stat sits under. */
function eyebrow(text, s) {
  return `<div class="coeye" style="font-size:${px(21 * s)}">${esc(text)}</div>`;
}

/**
 * The stat callout: a label, one big figure, and an optional unit beside it
 * and note beneath it. This is the shape the blueprint uses most.
 */
export function statCallout({ label, figure, unit, note, lucide, figureSize = 72, ...rest }) {
  const s = rest.scale ?? 1;
  const head = `<div class="corow" style="gap:${px(22 * s)}">${lucide ? disc(lucide, s, { size: 76, r: 38 }) : ""}<div>${eyebrow(label, s)}
      <div class="cofig" style="font-size:${px(figureSize * s)};margin-top:${px(6 * s)}">${esc(figure)}${unit ? `<span class="counit" style="font-size:${px(figureSize * 0.4 * s)};margin-left:${px(8 * s)}">${esc(unit)}</span>` : ""}</div></div></div>`;
  const tail = note ? `<div class="conote" style="font-size:${px(25 * s)};margin-top:${px(14 * s)}">${esc(note)}</div>` : "";
  return shell({ ...rest, pad: rest.pad ?? [26, 32], inner: head + tail });
}

/**
 * The line callout: a disc, a title, a line, and an optional amount. The
 * old popup's content in the new container.
 */
export function lineCallout({ lucide, title, line, line2, amount, meta, ...rest }) {
  const s = rest.scale ?? 1;
  const right = meta ? `<span class="cometa" style="font-size:${px(24 * s)}">${esc(meta)}</span>` : "";
  const inner = `<div class="corow" style="gap:${px(26 * s)}">${disc(lucide, s)}
    <div class="cotxt">
      <div class="cotop"><span class="cotitle" style="font-size:${px(35 * s)}">${esc(title)}</span>${right}</div>
      <div class="coline" style="font-size:${px(27 * s)};margin-top:${px(8 * s)}">${esc(line)}</div>
      ${line2 ? `<div class="coline dim" style="font-size:${px(23 * s)};margin-top:${px(6 * s)}">${esc(line2)}</div>` : ""}
      ${amount ? `<div class="coamt" style="font-size:${px(40 * s)};margin-top:${px(10 * s)}">${esc(amount)}</div>` : ""}
    </div></div>`;
  return shell({ ...rest, inner });
}

/**
 * The embedded sub-card: two or three label/value columns on their own
 * lighter plate, inside the container, as the blueprint's Position / Net PnL
 * block is.
 */
export function cellsCallout({ title, lucide, cells, foot, ...rest }) {
  const s = rest.scale ?? 1;
  const head = title
    ? `<div class="corow" style="gap:${px(20 * s)};margin-bottom:${px(20 * s)}">${lucide ? disc(lucide, s, { size: 68, r: 34 }) : ""}<span class="cotitle" style="font-size:${px(33 * s)}">${esc(title)}</span></div>`
    : "";
  const cols = cells
    .map(([k, v], i) => `<div class="cocell" style="${i ? `border-left-width:${px(1.5 * s)};padding-left:${px(24 * s)}` : ""}">${eyebrow(k, s)}<div class="coval" style="font-size:${px(38 * s)};margin-top:${px(7 * s)}">${esc(v)}</div></div>`)
    .join("");
  const plate = `<div class="coplate" style="border-radius:${px(24 * s)};padding:${px(20 * s)} ${px(24 * s)};gap:${px(24 * s)};border-width:${px(1.5 * s)}">${cols}</div>`;
  const tail = foot ? `<div class="conote" style="font-size:${px(24 * s)};margin-top:${px(16 * s)}">${esc(foot)}</div>` : "";
  return shell({ ...rest, pad: rest.pad ?? [24, 28], inner: head + plate + tail });
}

/** A row of small counters, each a glyph and a figure, as the blueprint's are. */
export function countersCallout({ items, ...rest }) {
  const s = rest.scale ?? 1;
  const row = items
    .map(([g, v]) => `<span class="cocount" style="font-size:${px(26 * s)};gap:${px(10 * s)};padding:${px(10 * s)} ${px(18 * s)};border-radius:999px;border-width:${px(1.5 * s)}">${icon(g, { size: Math.round(28 * s), color: C.sky, stroke: 2.2 })}<span>${esc(v)}</span></span>`)
    .join("");
  return shell({ ...rest, pad: rest.pad ?? [18, 20], radius: rest.radius ?? 999, inner: `<div class="corow" style="gap:${px(14 * s)}">${row}</div>` });
}

/* ------------------------------------------------------------- the figure */

/**
 * The oversized outlined figure: stroked, not filled, so the ground reads
 * through it. The blueprint's "+$5,024.53". A faint filled twin sits behind
 * it so it has weight on a dark ground.
 */
export function figureOutline({ x, right, y, text, size = 150, rotate = -3, scale = 1, z = 26, color = C.sky, stroke = 3.4, align = "left" }) {
  const s = scale;
  const place = right !== undefined ? `right:${px(right)}` : `left:${px(x)}`;
  return `<div class="cofigure abs" style="${place};top:${px(y)};transform:rotate(${rotate}deg);z-index:${z};text-align:${align}">
    <span class="ghost" style="font-size:${px(size * s)};color:${color}">${esc(text)}</span>
    <span class="edge" style="font-size:${px(size * s)};-webkit-text-stroke:${px(stroke * s)} ${color}">${esc(text)}</span></div>`;
}

/* ------------------------------------------------------------- the props */

/**
 * One of the brand's 49 3D objects, floating on its own light. `glow` is the
 * blue plate under it; set it false where the object sits over a display and
 * the plate would read as a smudge on the glass.
 */
export function prop({ name, x, right, y, size = 200, rotate = 0, z = 34, glow = true, scale = 1, flip = false }) {
  const d = size * scale;
  const place = right !== undefined ? `right:${px(right)}` : `left:${px(x)}`;
  const plate = glow
    ? `<i class="proplate" style="left:${px(-d * 0.2)};top:${px(d * 0.5)};width:${px(d * 1.4)};height:${px(d * 0.52)}"></i>`
    : "";
  return `<div class="prop abs" style="${place};top:${px(y)};width:${px(d)};height:${px(d)};transform:rotate(${rotate}deg)${flip ? " scaleX(-1)" : ""};z-index:${z}">
    ${plate}<img src="${brandUrl(`3d/${name}@2x.webp`)}" style="width:${px(d)};height:${px(d)}"></div>`;
}

/* ------------------------------------------------------------- the badges */

/**
 * A round badge floating free, the way the blueprint scatters its coins
 * around the handset: a disc with a hairline and a drop, carrying one of the
 * brand's 3D objects, a line glyph or the Vallo mark.
 *
 *   kind   "object" (a 3D object), "glyph" (a Lucide icon) or "mark"
 *   tone   "navy" (the set's usual) or "paper" (one white badge per image at
 *          most, for the loudest one)
 */
export function badge({ x, right, y, size = 150, kind = "object", name, tone = "navy", rot = 0, z = 33, scale = 1 }) {
  const d = size * scale;
  const place = right !== undefined ? `right:${px(right)}` : `left:${px(x)}`;
  const paper = tone === "paper";
  const inner = kind === "object"
    ? `<img src="${brandUrl(`3d/${name}@2x.webp`)}" style="width:${px(d * 0.70)};height:${px(d * 0.70)}">`
    : kind === "mark"
      ? `<img src="${brandUrl("vallo-mark.png")}" style="width:${px(d * 0.52)};height:${px(d * 0.52)}">`
      : icon(name, { size: Math.round(d * 0.42), color: paper ? C.electric : C.sky, stroke: 2.2 });
  return `<div class="bdg ${paper ? "pp" : "nv"} abs" style="${place};top:${px(y)};width:${px(d)};height:${px(d)};transform:rotate(${rot}deg);z-index:${z}">${inner}</div>`;
}

/* ------------------------------------------------------------- the stage */

/**
 * The soft panel the handset stands on: a rounded field a shade lighter than
 * the ground, inset from the image's edge, with the blueprint's two soft
 * blobs in it. It is drawn under everything (z 2) and gives the furniture
 * something to overhang.
 */
export function stagePanel({ W, H, inset = 56, radius = 96, top = 0, z = 2 }) {
  return `<div class="stagep abs" style="left:${px(inset)};top:${px(top + inset)};width:${px(W - inset * 2)};height:${px(H - top - inset * 2)};border-radius:${px(radius)};z-index:${z}">
    <i class="blob a"></i><i class="blob b"></i></div>`;
}

/* ------------------------------------------------------------- the styles */

/** The shared styles for everything above; page.mjs folds this into BASE. */
export const CALLOUT_CSS = `
  /* ---- the pop-out container (callouts.mjs) ---- */
  .co { position: absolute; font-family: "Inter", sans-serif; color: #FFFFFF; }
  .co.dark {
    background: linear-gradient(176deg, rgb(24 34 100) 0%, rgb(11 17 62) 58%, rgb(7 12 48) 100%);
    box-shadow:
      inset 0 0 0 1.7px rgb(143 211 255 / 0.52),
      inset 0 2px 0 rgb(255 255 255 / 0.13),
      inset 0 -40px 60px -40px rgb(0 105 254 / 0.30),
      0 calc(30px * var(--lift, 1)) calc(54px * var(--lift, 1)) calc(-22px * var(--lift, 1)) rgb(0 0 12 / 0.88),
      0 calc(10px * var(--lift, 1)) calc(24px * var(--lift, 1)) calc(-12px * var(--lift, 1)) rgb(0 0 20 / 0.62);
  }
  .co.sky {
    background: linear-gradient(176deg, #1E7BFF 0%, #0069FE 52%, #0049B4 100%);
    box-shadow:
      inset 0 0 0 1.6px rgb(214 236 255 / 0.60),
      inset 0 1.6px 0 rgb(255 255 255 / 0.30),
      0 calc(30px * var(--lift, 1)) calc(54px * var(--lift, 1)) calc(-22px * var(--lift, 1)) rgb(0 12 60 / 0.78);
  }
  .cobody { position: relative; }
  .corow { display: flex; align-items: center; }
  .cotxt { flex: 1; min-width: 0; }
  .cotop { display: flex; align-items: center; justify-content: space-between; gap: 18px; }

  /* the ticks: four brackets standing just outside the corners, each turning
     the corner on the container's own radius, so they read as one interrupted
     edge rather than four stickers */
  .co .tk { position: absolute; width: var(--d); height: var(--d); border: var(--tw) none rgb(143 211 255 / 0.95); }
  .co.sky .tk { border-color: rgb(255 255 255 / 0.94); }
  .co .tk.tl { left: var(--o); top: var(--o); border-left-style: solid; border-top-style: solid; border-top-left-radius: var(--tr); }
  .co .tk.tr { right: var(--o); top: var(--o); border-right-style: solid; border-top-style: solid; border-top-right-radius: var(--tr); }
  .co .tk.bl { left: var(--o); bottom: var(--o); border-left-style: solid; border-bottom-style: solid; border-bottom-left-radius: var(--tr); }
  .co .tk.br { right: var(--o); bottom: var(--o); border-right-style: solid; border-bottom-style: solid; border-bottom-right-radius: var(--tr); }

  /* the label astride the top rule */
  .cotab { position: absolute; top: 0; transform: translateY(-50%); display: inline-flex; align-items: center;
    font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; line-height: 1; white-space: nowrap;
    color: #BFE2FF; background: linear-gradient(180deg, rgb(28 40 112), rgb(14 22 74)); border: 0 solid rgb(143 211 255 / 0.55); border-style: solid; }
  .co.sky .cotab { color: #0A1240; background: linear-gradient(180deg, #FFFFFF, #DCEBFF); border-color: rgb(255 255 255 / 0.9); }

  .codisc { flex: none; display: grid; place-items: center;
    background: linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%);
    box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.3), 0 10px 20px -8px rgb(0 20 80 / 0.7); }
  .co.sky .codisc { background: linear-gradient(160deg, #FFFFFF, #CFE4FF); }
  .co.sky .codisc svg { stroke: #0056D0; }

  .coeye { font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgb(143 211 255 / 0.92); white-space: nowrap; }
  .co.sky .coeye { color: rgb(255 255 255 / 0.82); }
  .cofig { font-family: "Poppins", sans-serif; font-weight: 700; letter-spacing: -0.03em; line-height: 1; white-space: nowrap; }
  .counit { font-family: "Inter", sans-serif; font-weight: 600; letter-spacing: -0.01em; color: rgb(190 214 255 / 0.78); }
  .co.sky .counit { color: rgb(255 255 255 / 0.8); }
  .cotitle { font-weight: 700; letter-spacing: -0.012em; white-space: nowrap; }
  .coline { font-weight: 500; white-space: nowrap; letter-spacing: -0.004em; color: rgb(208 222 255 / 0.86); }
  .co.sky .coline { color: rgb(255 255 255 / 0.86); }
  .coline.dim { color: rgb(190 206 245 / 0.66); }
  .coamt { font-family: "Poppins", sans-serif; font-weight: 700; letter-spacing: -0.02em; color: #FFFFFF; }
  .cometa { font-weight: 500; white-space: nowrap; flex: none; color: rgb(200 214 250 / 0.78); }
  .conote { font-weight: 500; letter-spacing: -0.003em; color: rgb(198 214 252 / 0.72); white-space: nowrap; }
  .co.sky .conote { color: rgb(255 255 255 / 0.78); }

  .coplate { display: flex; align-items: stretch; background: rgb(3 8 40 / 0.72); border: 0 solid rgb(143 211 255 / 0.22); border-style: solid; }
  .co.sky .coplate { background: rgb(2 10 56 / 0.30); border-color: rgb(255 255 255 / 0.28); }
  .cocell { border-left: 0 solid rgb(143 211 255 / 0.20); border-left-style: solid; min-width: 0; }
  .coval { font-family: "Poppins", sans-serif; font-weight: 700; letter-spacing: -0.025em; line-height: 1; white-space: nowrap; color: #FFFFFF; }

  .cocount { display: inline-flex; align-items: center; font-weight: 600; white-space: nowrap; color: #E6F1FF;
    background: rgb(4 9 44 / 0.66); border: 0 solid rgb(143 211 255 / 0.26); border-style: solid; }
  .cocount svg { flex: none; }

  /* ---- the outlined figure ---- */
  .cofigure { position: absolute; }
  .cofigure span { font-family: "Poppins", sans-serif; font-weight: 700; letter-spacing: -0.035em; line-height: 0.92; white-space: nowrap; display: block; }
  .cofigure .ghost { opacity: 0.17; }
  .cofigure .edge { position: absolute; left: 0; top: 0; color: transparent; }

  /* ---- the round badges ---- */
  .bdg { position: absolute; display: grid; place-items: center; border-radius: 50%; }
  .bdg.nv { background: linear-gradient(165deg, rgb(34 48 126) 0%, rgb(9 15 56) 100%);
    box-shadow: inset 0 0 0 2px rgb(143 211 255 / 0.52), inset 0 2px 0 rgb(255 255 255 / 0.16), 0 0 44px -6px rgb(0 105 254 / 0.45), 0 26px 44px -18px rgb(0 0 14 / 0.85); }
  .bdg.pp { background: linear-gradient(165deg, #FFFFFF 0%, #E4EEFF 100%);
    box-shadow: inset 0 0 0 1.8px rgb(255 255 255 / 0.9), 0 26px 44px -18px rgb(0 10 50 / 0.7); }
  .bdg img { display: block; filter: drop-shadow(0 10px 16px rgb(0 0 25 / 0.5)); }

  /* ---- the stage panel ---- */
  .stagep { overflow: hidden; background: linear-gradient(176deg, rgb(16 30 108 / 0.70) 0%, rgb(5 11 56 / 0.40) 55%, rgb(2 4 28 / 0.05) 100%);
    box-shadow: inset 0 0 0 1.6px rgb(143 211 255 / 0.14); }
  .stagep .blob { position: absolute; border-radius: 50%; filter: blur(60px); }
  .stagep .blob.a { left: -8%; top: 4%; width: 62%; height: 34%; background: rgb(0 105 254 / 0.30); }
  .stagep .blob.b { right: -12%; bottom: -6%; width: 70%; height: 38%; background: rgb(94 60 200 / 0.20); }

  /* ---- the 3D props ---- */
  .prop { position: absolute; }
  .prop img { display: block; filter: drop-shadow(0 26px 36px rgb(0 0 25 / 0.72)); }
  .proplate { position: absolute; border-radius: 50%; filter: blur(14px);
    background: radial-gradient(50% 50% at 50% 50%, rgb(0 105 254 / 0.50), transparent 70%); }
`;
