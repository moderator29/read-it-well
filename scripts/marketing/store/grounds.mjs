/**
 * Grounds and the light that sits on them: gradients, glows, beams, orbit
 * rings, ribbons, a studio floor, photograph panels and the brand's own 3D
 * scenes. Each returns HTML for one absolutely positioned layer.
 */
import { px } from "./components.mjs";
import { photoUrl, artUrl } from "./lib.mjs";

let uid = 0;
const id = (p) => `${p}${(uid += 1)}`;

/** A full-bleed CSS background. */
export const fill = (css, extra = "") => `<div class="g" style="inset:0;background:${css};${extra}"></div>`;

/** The night canvas: deep navy at the top to ink at the foot. */
export function night({ top = "#040A4A", mid = "#020631", bottom = "#010118", angle = 180 } = {}) {
  return fill(`linear-gradient(${angle}deg, ${top} 0%, ${mid} 48%, ${bottom} 100%)`);
}

/** A soft elliptical glow. */
export function glow({ x, y, rx, ry = rx, color = "0 105 254", alpha = 0.5, blur = 0, z = 0, blend = "normal" }) {
  return `<div class="g" style="left:${px(x - rx)};top:${px(y - ry)};width:${px(rx * 2)};height:${px(ry * 2)};border-radius:50%;background:radial-gradient(closest-side, rgb(${color} / ${alpha}) 0%, rgb(${color} / ${alpha * 0.55}) 38%, rgb(${color} / ${alpha * 0.18}) 68%, rgb(${color} / 0) 100%);${blur ? `filter:blur(${blur}px);` : ""}z-index:${z};mix-blend-mode:${blend}"></div>`;
}

/** A cone of light falling from above (a stage spotlight). */
export function beam({ x, top = -200, h, wTop = 120, wBottom = 900, color = "120 176 255", alpha = 0.22, blur = 40, rotate = 0, z = 1 }) {
  const w = Math.max(wTop, wBottom);
  const a = (w - wTop) / 2;
  const b = (w - wBottom) / 2;
  return `<div class="g" style="left:${px(x - w / 2)};top:${px(top)};width:${px(w)};height:${px(h)};clip-path:polygon(${px(a)} 0, ${px(w - a)} 0, ${px(w - b)} 100%, ${px(b)} 100%);background:linear-gradient(180deg, rgb(${color} / ${alpha}) 0%, rgb(${color} / ${alpha * 0.35}) 60%, rgb(${color} / 0) 100%);filter:blur(${blur}px);transform:rotate(${rotate}deg);transform-origin:50% 0;z-index:${z}"></div>`;
}

/** Faint concentric ellipses, solid or dashed, like an orbit around the handset. */
export function rings({ cx, cy, r, ratio = 0.36, count = 3, step = 0.22, rotate = -14, color = "255 255 255", alpha = 0.14, width = 2.4, dash = null, z = 2, W, H }) {
  const els = Array.from({ length: count }, (_, i) => {
    const k = 1 - i * step;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r * k}" ry="${r * k * ratio}" fill="none" stroke="rgb(${color} / ${alpha * (1 - i * 0.18)})" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} transform="rotate(${rotate} ${cx} ${cy})"/>`;
  }).join("");
  return `<svg class="g" style="left:0;top:0;z-index:${z}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els}</svg>`;
}

/**
 * A ribbon of light along an SVG path `d`: a wide blurred glow, a body in a
 * gradient and a thin bright core. `stops` run along the gradient vector
 * (x1,y1)->(x2,y2) in page pixels, so a ribbon can cross two images and keep
 * its colour exactly at the seam.
 */
export function ribbon({ d, W, H, width = 70, stops, from, to, glowWidth, glowAlpha = 0.55, core = true, coreAlpha = 0.9, z = 3, opacity = 1, blur = 26 }) {
  const g = id("rg");
  const st = (stops || [[0, "#0069FE"], [1, "#8FD3FF"]]).map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
  const [x1, y1] = from || [0, 0];
  const [x2, y2] = to || [W, 0];
  return `<svg class="g" style="left:0;top:0;z-index:${z};opacity:${opacity}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st}</linearGradient>
      <filter id="${g}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter>
      <filter id="${g}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(2, width * 0.08)}"/></filter>
    </defs>
    <path d="${d}" fill="none" stroke="url(#${g})" stroke-width="${glowWidth || width * 2.6}" stroke-linecap="round" opacity="${glowAlpha}" filter="url(#${g}b)"/>
    <path d="${d}" fill="none" stroke="url(#${g})" stroke-width="${width}" stroke-linecap="round" filter="url(#${g}s)" opacity="0.95"/>
    ${core ? `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="${coreAlpha}" stroke-width="${Math.max(3, width * 0.09)}" stroke-linecap="round"/>` : ""}
  </svg>`;
}

/** A thin line (optionally dashed) with no glow, for connectors. */
export function line({ d, W, H, color = "rgb(143 211 255 / 0.55)", width = 3, dash = null, z = 3 }) {
  return `<svg class="g" style="left:0;top:0;z-index:${z}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/></svg>`;
}

/** A studio floor: a perspective grid fading into the dark. */
export function floorGrid({ W, H, horizon, color = "92 159 255", alpha = 0.16, cell = 120, z = 1, depth = 1800 }) {
  const lines = `repeating-linear-gradient(90deg, rgb(${color} / ${alpha}) 0 2px, transparent 2px ${cell}px), repeating-linear-gradient(0deg, rgb(${color} / ${alpha}) 0 2px, transparent 2px ${cell}px)`;
  return `<div class="g" style="left:${px(-W)};top:${px(horizon)};width:${px(W * 3)};height:${px(depth)};background:${lines};transform:perspective(900px) rotateX(64deg);transform-origin:50% 0;-webkit-mask-image:linear-gradient(180deg, transparent 0%, #000 22%, #000 55%, transparent 100%);mask-image:linear-gradient(180deg, transparent 0%, #000 22%, #000 55%, transparent 100%);z-index:${z}"></div>`;
}

/** A photograph on a rounded panel. `mask` fades it (CSS mask-image). */
export function photo({ src, x, y, w, h, radius = 56, rotate = 0, pos = "50% 50%", z = 2, shadow = true, mask, brightness = 1, border = true, saturate = 1 }) {
  return `<div class="g photo" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};border-radius:${px(radius)};overflow:hidden;transform:rotate(${rotate}deg);z-index:${z};${shadow ? "box-shadow:0 60px 120px -30px rgb(0 0 20 / 0.7), 0 20px 40px -10px rgb(0 0 30 / 0.45);" : ""}${mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : ""}">
    <img src="${photoUrl(src)}" style="width:100%;height:100%;object-fit:cover;object-position:${pos};filter:brightness(${brightness}) saturate(${saturate})">
    ${border ? `<div style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 2px rgb(255 255 255 / 0.10), inset 0 1px 0 rgb(255 255 255 / 0.18)"></div>` : ""}
  </div>`;
}

/** The product's onboarding scene (fuzzy 3D hills and objects). */
export function art({ src, x, y, w, h, pos = "50% 50%", z = 1, mask, radius = 0, opacity = 1 }) {
  return `<div class="g" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};overflow:hidden;border-radius:${px(radius)};z-index:${z};opacity:${opacity};${mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : ""}"><img src="${artUrl(src)}" style="width:100%;height:100%;object-fit:cover;object-position:${pos}"></div>`;
}

/** The light studio ground of the reference mockups. */
export function studio({ top = "#F7F8FB", bottom = "#E8EBF2" } = {}) {
  return fill(`radial-gradient(120% 70% at 50% 28%, #FFFFFF 0%, rgb(255 255 255 / 0) 60%), linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`);
}

/** Tiny stars, fixed by a seed so every render matches. */
export function stars({ W, H, count = 60, seed = 7, color = "220 232 255", maxAlpha = 0.55, top = 0, bottom, z = 1 }) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const yMax = bottom ?? H;
  const dots = Array.from({ length: count }, () => {
    const x = rnd() * W;
    const y = top + rnd() * (yMax - top);
    const r = 1.2 + rnd() * 2.2;
    const a = 0.12 + rnd() * maxAlpha;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="rgb(${color} / ${a.toFixed(2)})"/>`;
  }).join("");
  return `<svg class="g" style="left:0;top:0;z-index:${z}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${dots}</svg>`;
}

/** A glowing reflection pool under a handset. */
export function floorGlow({ cx, y, w, h = w * 0.16, color = "0 105 254", alpha = 0.55, z = 4 }) {
  return glow({ x: cx, y, rx: w / 2, ry: h / 2, color, alpha, blur: 18, z });
}

/**
 * A planet's horizon: a vast dark disc rising from below with a glowing rim,
 * warm on one side and electric on the other.
 */
export function horizon({ W, H, y, r = W * 1.9, left = "#FF8A3D", right = "#3E8BFF", z = 2, glowAlpha = 0.9 }) {
  const g = `hz${Math.round(y)}`;
  const cx = W / 2;
  const cy = y + r;
  return `<svg class="g" style="left:0;top:0;z-index:${z}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${left}"/><stop offset="0.5" stop-color="#FFD2A8"/><stop offset="1" stop-color="${right}"/></linearGradient>
      <radialGradient id="${g}f" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0.9" stop-color="#020418"/><stop offset="1" stop-color="#07103A"/></radialGradient>
      <filter id="${g}b" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${W * 0.03}"/></filter>
      <filter id="${g}s" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${W * 0.004}"/></filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${g})" stroke-width="${W * 0.08}" opacity="${glowAlpha * 0.6}" filter="url(#${g}b)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${g}f)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${g})" stroke-width="${W * 0.006}" opacity="${glowAlpha}" filter="url(#${g}s)"/>
  </svg>`;
}

/** The brand's electric blue as a bright ground, lit from the top left. */
export function electric({ W, H, angle = 170 } = {}) {
  return [
    fill(`linear-gradient(${angle}deg, #2F80FF 0%, #0B5DF2 34%, #0648C8 68%, #042F8C 100%)`),
    glow({ x: W * 0.15, y: H * 0.12, rx: W * 0.75, ry: H * 0.28, color: "190 225 255", alpha: 0.4, blur: 40 }),
    glow({ x: W * 0.8, y: H * 0.95, rx: W * 0.8, ry: H * 0.26, color: "2 10 70", alpha: 0.6, blur: 50 }),
  ].join("\n");
}

/** Soft out-of-focus discs of light (bokeh), fixed by a seed. */
export function bokeh({ W, H, count = 14, seed = 9, color = "92 159 255", maxAlpha = 0.22, minR = 40, maxR = 180, top = 0, bottom, z = 1 }) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const yMax = bottom ?? H;
  return Array.from({ length: count }, () => {
    const r = minR + rnd() * (maxR - minR);
    const x = rnd() * W;
    const y = top + rnd() * (yMax - top);
    const a = 0.06 + rnd() * maxAlpha;
    return `<div class="g" style="left:${(x - r).toFixed(1)}px;top:${(y - r).toFixed(1)}px;width:${(2 * r).toFixed(1)}px;height:${(2 * r).toFixed(1)}px;border-radius:50%;background:radial-gradient(circle at 50% 50%, rgb(${color} / ${a.toFixed(3)}) 0%, rgb(${color} / ${(a * 0.7).toFixed(3)}) 55%, rgb(${color} / 0) 72%);box-shadow:inset 0 0 0 1.5px rgb(${color} / ${(a * 0.6).toFixed(3)});z-index:${z}"></div>`;
  }).join("");
}

/** A glossy dark stage: a floor plane that catches light, and a spotlight. */
export function stage({ W, H, floorY, color = "0 105 254" }) {
  return [
    fill("linear-gradient(180deg, #03052A 0%, #020320 55%, #01010F 100%)"),
    `<div class="g" style="left:0;top:${floorY}px;width:${W}px;height:${H - floorY}px;background:linear-gradient(180deg, rgb(20 40 140 / 0.45) 0%, rgb(4 8 40 / 0.2) 40%, rgb(1 1 16 / 0) 100%);z-index:1"></div>`,
    `<div class="g" style="left:0;top:${floorY - 1}px;width:${W}px;height:2px;background:linear-gradient(90deg, transparent 0%, rgb(143 211 255 / 0.35) 30%, rgb(143 211 255 / 0.55) 50%, rgb(143 211 255 / 0.35) 70%, transparent 100%);z-index:1"></div>`,
    glow({ x: W / 2, y: floorY, rx: W * 0.62, ry: 220, color, alpha: 0.5, blur: 30, z: 1 }),
  ].join("\n");
}
