/**
 * The parts every store image is made of: the headline, the pop-up cards
 * (DESIGN.md section 4), the Example chip, stickers, pills and the placed
 * handset. All sizes are in the finished image's pixels.
 */
import { icon, stickerUrl, C } from "./lib.mjs";

const px = (v) => `${Math.round(v * 100) / 100}px`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------- headline */

/**
 * Two lines at most, Poppins 700, tracking -0.03em. `accent` picks which
 * line carries the brand gradient (1, 2 or 0 for none); `serif` puts one or
 * two words of line 2 in Instrument Serif italic instead.
 *
 * The block is centred on `cx` (align "center") or starts at `x` (align
 * "left"). `max` is the widest a line may run; the page shrinks the type to
 * fit if a line would overrun it (never below 80% of `size`).
 */
export function headline({
  lines, x = 0, cx, y, max, size = 118, align = "center", accent = 2, theme = "dark",
  sub, subSize, subMax, eyebrow, grad, color, serif, weight = 700, lineHeight = 1.06, z = 40, subColor,
}) {
  const dark = theme === "dark";
  const ink = color || (dark ? "#FFFFFF" : "#07102E");
  const g = grad || (dark
    ? "linear-gradient(92deg, #A9DEFF 0%, #6FB1FF 45%, #3E8BFF 100%)"
    : "linear-gradient(92deg, #0056D0 0%, #1F4FE6 55%, #3A36D8 100%)");
  const lineHtml = lines.map((l, i) => {
    let t = esc(l);
    if (serif && i === lines.length - 1) t = t.replace(esc(serif), `<em class="serif">${esc(serif)}</em>`);
    const isAccent = accent === i + 1;
    return `<span class="ln${isAccent ? " acc" : ""}" style="${isAccent ? `background-image:${g};` : ""}">${t}</span>`;
  }).join("<br>");
  const left = align === "center" ? cx - max / 2 : x;
  const eb = eyebrow
    ? `<div class="eyebrow ${dark ? "dk" : "lt"}" style="justify-content:${align === "center" ? "center" : "flex-start"}"><span class="ebpill">${eyebrow.icon ? icon(eyebrow.icon, { size: Math.round(size * 0.27), color: dark ? C.sky : C.electric, stroke: 2.2 }) : ""}<span>${esc(eyebrow.text)}</span></span></div>`
    : "";
  const subHtml = sub
    ? `<p class="sub" style="font-size:${px(subSize || size * 0.34)};color:${subColor || (dark ? "rgb(214 226 255 / 0.84)" : "rgb(7 16 46 / 0.7)")};max-width:${px(subMax || max)};${align === "center" ? "margin-left:auto;margin-right:auto;" : ""}">${esc(sub)}</p>`
    : "";
  return `<div class="hl" data-max="${max}" data-size="${size}" style="left:${px(left)};top:${px(y)};width:${px(max)};text-align:${align};z-index:${z}">
    ${eb}<h1 style="font-size:${px(size)};font-weight:${weight};line-height:${lineHeight};color:${ink}">${lineHtml}</h1>${subHtml}</div>`;
}

/* ------------------------------------------------------------- chips */

/** The product's own "Example" label: an info glyph and the word. */
export function exampleChip({ theme = "dark", scale = 1 } = {}) {
  const dark = theme === "dark";
  return `<span class="ex ${dark ? "dk" : "lt"}" style="font-size:${px(21 * scale)};padding:${px(6 * scale)} ${px(13 * scale)} ${px(6 * scale)} ${px(10 * scale)};gap:${px(6 * scale)}">${icon("info", { size: Math.round(22 * scale), color: dark ? "#DCE7FF" : "#34406B", stroke: 2.2 })}<span>Example</span></span>`;
}

/* ------------------------------------------------------------- pop-up card */

/**
 * A card that has just arrived, overlapping the handset's edge.
 *   emoji   Fluent sticker codepoint for the icon chip, or
 *   lucide  a line icon name (drawn white on an electric disc)
 *   title, line, amount, meta ("now"), example (bool)
 *   w       card width; the height follows its content
 */
export function popup({
  x, y, w = 820, rotate = 0, theme = "dark", emoji, lucide, title, line, amount, meta = "now",
  example = false, scale = 1, z = 30, tone = "electric", origin = "center",
}) {
  const dark = theme === "dark";
  const s = scale;
  const chip = emoji
    ? `<div class="pchip ${tone}" style="width:${px(104 * s)};height:${px(104 * s)}"><img src="${stickerUrl(emoji)}" style="width:${px(66 * s)};height:${px(66 * s)}"></div>`
    : `<div class="pchip ${tone} solid" style="width:${px(104 * s)};height:${px(104 * s)}">${icon(lucide, { size: Math.round(50 * s), color: "#FFFFFF", stroke: 2.1 })}</div>`;
  const right = [
    example ? exampleChip({ theme, scale: s }) : "",
    meta ? `<span class="pmeta" style="font-size:${px(24 * s)}">${esc(meta)}</span>` : "",
  ].filter(Boolean).join("");
  return `<div class="pop ${dark ? "dk" : "lt"}" style="left:${px(x)};top:${px(y)};width:${px(w)};transform:rotate(${rotate}deg);transform-origin:${origin};z-index:${z};padding:${px(28 * s)} ${px(30 * s)};gap:${px(26 * s)};border-radius:${px(38 * s)}">
    ${chip}
    <div class="ptxt">
      <div class="ptop"><span class="ptitle" style="font-size:${px(35 * s)}">${esc(title)}</span><span class="pright" style="gap:${px(12 * s)}">${right}</span></div>
      <div class="pline" style="font-size:${px(27 * s)}">${esc(line)}</div>
      ${amount ? `<div class="pamt" style="font-size:${px(40 * s)}">${esc(amount)}</div>` : ""}
    </div>
  </div>`;
}

/* ------------------------------------------------------------- sticker */

export function sticker({ code, x, y, size = 220, rotate = 0, z = 35, shadow = true, blur = 0, opacity = 1 }) {
  const f = [shadow ? "drop-shadow(0 26px 34px rgb(0 0 24 / 0.42))" : "", blur ? `blur(${blur}px)` : ""].filter(Boolean).join(" ");
  return `<img class="st" src="${stickerUrl(code)}" style="left:${px(x - size / 2)};top:${px(y - size / 2)};width:${px(size)};height:${px(size)};transform:rotate(${rotate}deg);z-index:${z};opacity:${opacity};${f ? `filter:${f};` : ""}">`;
}

/* ------------------------------------------------------------- pill */

/** A small glass pill with a line icon and a word or two. */
export function pill({ x, y, text, lucide, theme = "dark", size = 30, rotate = 0, z = 32, active = false }) {
  const dark = theme === "dark";
  return `<div class="pill ${dark ? "dk" : "lt"}${active ? " on" : ""}" style="left:${px(x)};top:${px(y)};font-size:${px(size)};transform:rotate(${rotate}deg);z-index:${z};padding:${px(size * 0.52)} ${px(size * 0.9)};gap:${px(size * 0.45)}">${lucide ? icon(lucide, { size: Math.round(size * 1.15), color: active ? "#FFFFFF" : dark ? C.sky : C.electric, stroke: 2.1 }) : ""}<span>${esc(text)}</span></div>`;
}

/* ------------------------------------------------------------- handset */

/**
 * Place a rendered handset (phones.mjs) so its body's centre sits at
 * (cx, cy). Returns the HTML and the body's box in page pixels.
 */
export function placePhone(p, { cx, cy, z = 20, extra = "" }) {
  const s = p.scale;
  const w = p.width * s;
  const h = p.height * s;
  const left = cx - (p.bbox.x + p.bbox.width / 2) * s;
  const top = cy - (p.bbox.y + p.bbox.height / 2) * s;
  const box = { x: left + p.bbox.x * s, y: top + p.bbox.y * s, w: p.bbox.width * s, h: p.bbox.height * s };
  box.r = box.x + box.w;
  box.b = box.y + box.h;
  box.cx = cx;
  box.cy = cy;
  const quad = p.screenQuad.map(([qx, qy]) => [left + qx * s, top + qy * s]);
  const iq = p.imageQuad.map(([qx, qy]) => [left + qx * s, top + qy * s]);
  const [iw, ih] = p.image;
  const Hm = homography([[0, 0], [iw, 0], [iw, ih], [0, ih]], iq);
  /** Page position of a point (u, v) on the display image (1320 x 2868 px). */
  const at = (u, v) => {
    const d = Hm[6] * u + Hm[7] * v + Hm[8];
    return [(Hm[0] * u + Hm[1] * v + Hm[2]) / d, (Hm[3] * u + Hm[4] * v + Hm[5]) / d];
  };
  return {
    html: `<img class="phone" src="file://${p.file}" style="left:${px(left)};top:${px(top)};width:${px(w)};height:${px(h)};z-index:${z};${extra}">`,
    box,
    quad,
    at,
    img: { src: `file://${p.file}`, left, top, w, h },
  };
}

/**
 * The handset's reflection on a glossy floor at its foot: the same render,
 * mirrored about the line `gap` px below the body's lowest point and faded
 * out over `length` of the handset's height.
 */
export function reflection(pl, { gap = 4, length = 0.2, opacity = 0.2, z = 19, blur = 5 } = {}) {
  const { src, left, top, w, h } = pl.img;
  const floor = pl.box.b + gap;
  const H = h * length;
  return `<div class="abs" style="left:${px(left)};top:${px(floor)};width:${px(w)};height:${px(H)};overflow:hidden;z-index:${z};opacity:${opacity};-webkit-mask-image:linear-gradient(180deg, #000 0%, rgb(0 0 0 / 0.5) 35%, transparent 100%);mask-image:linear-gradient(180deg, #000 0%, rgb(0 0 0 / 0.5) 35%, transparent 100%)">
    <img src="${src}" style="position:absolute;left:0;top:${px(top - floor)};width:${px(w)};height:${px(h)};transform:scaleY(-1);transform-origin:50% ${px(floor - top)};filter:blur(${blur}px)"></div>`;
}

/** 3x3 homography (row-major) taking src[i] to dst[i], four point pairs. */
export function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  for (let c = 0; c < 8; c += 1) {
    let piv = c;
    for (let r = c + 1; r < 8; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [b[c], b[piv]] = [b[piv], b[c]];
    for (let r = 0; r < 8; r += 1) {
      if (r === c) continue;
      const k = A[r][c] / A[c][c];
      for (let cc = c; cc < 8; cc += 1) A[r][cc] -= k * A[c][cc];
      b[r] -= k * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export { px, esc };
