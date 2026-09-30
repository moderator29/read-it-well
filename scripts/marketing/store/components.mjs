/**
 * The parts every store image is made of: the headline, the pop-up cards
 * (DESIGN.md section 4), the Example chip and the placed
 * handset. All sizes are in the finished image's pixels.
 */
import { icon } from "./lib.mjs";

const px = (v) => `${Math.round(v * 100) / 100}px`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------- headline */

/**
 * The headline (DESIGN.md section 6a): Poppins 600, sentence case, tracking
 * -0.03em, two lines at most, white on the night ground. One key word may
 * be marked *like this* to take the sky blue. An optional subline sits
 * under it, in Inter 500 at 60% white, on one line.
 *
 * The block is centred on `cx` (align "center") or starts at `x` (align
 * "left"). `max` is the widest a line may run; the page shrinks the type to
 * fit if a line would overrun it.
 */
export function headline({
  lines, x = 0, cx, y, max, size = 112, align = "center", weight = 600, lineHeight = 1.05, z = 40,
  color = "#FFFFFF", key = "#8FD3FF", sub, subSize, subColor = "rgb(255 255 255 / 0.6)",
}) {
  const body = lines
    .map((l) => `<span class="ln">${esc(l).replace(/\*(.+?)\*/g, `<span class="kw" style="color:${key}">$1</span>`)}</span>`)
    .join("<br>");
  const left = align === "center" ? cx - max / 2 : x;
  const subHtml = sub
    ? `<p class="sub" style="font-size:${px(subSize || size * 0.36)};color:${subColor};${align === "center" ? "margin-left:auto;margin-right:auto;" : ""}">${esc(sub)}</p>`
    : "";
  return `<div class="hl" data-max="${max}" data-size="${size}" style="left:${px(left)};top:${px(y)};width:${px(max)};text-align:${align};z-index:${z}">
    <h1 style="font-size:${px(size)};font-weight:${weight};line-height:${lineHeight};color:${color}">${body}</h1>${subHtml}</div>`;
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
 *   lucide  a line icon name (drawn white on an electric disc)
 *   title, line, amount, meta ("now"), example (bool)
 *   w       card width; the height follows its content
 */
export function popup({
  x, y, w = 820, rotate = 0, theme = "dark", lucide, title, line, amount, meta = "now",
  example = false, scale = 1, z = 30, origin = "center",
}) {
  const dark = theme === "dark";
  const s = scale;
  const chip = `<div class="pchip solid" style="width:${px(104 * s)};height:${px(104 * s)}">${icon(lucide, { size: Math.round(50 * s), color: "#FFFFFF", stroke: 2.1 })}</div>`;
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
