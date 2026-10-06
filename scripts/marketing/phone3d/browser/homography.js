// 2D homography helpers (no dependencies; used by Node and by the browser live mode).

/** 3×3 homography (row-major [a,b,c,d,e,f,g,h,1]) mapping src[i] -> dst[i] for 4 point pairs. */
export function homography(src, dst) {
  const A = [];
  const bv = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    bv.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    bv.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [bv[c], bv[piv]] = [bv[piv], bv[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = A[r][c] / A[c][c];
      for (let cc = c; cc < n; cc++) A[r][cc] -= k * A[c][cc];
      bv[r] -= k * bv[c];
    }
  }
  const h = bv.map((v, i) => v / A[i][i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** CSS matrix3d() for an element with `transform-origin: 0 0` from a 3×3 homography. */
export function cssMatrix3d(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const m = [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i];
  return `matrix3d(${m.map((v) => +v.toFixed(10)).join(', ')})`;
}

/**
 * matrix3d() that maps an element onto the quad [tl, tr, br, bl] (points as {x, y} or
 * [x, y]); the element's top-left sits at the container origin with transform-origin 0 0.
 * The element's content box is w×h; with `bleed` > 0 the element is (w + 2·bleed) ×
 * (h + 2·bleed) (e.g. padding in the screen's edge colour) and only the inner w×h maps to
 * the quad — the margin extends past it (under the phone's black border), so no seam.
 */
export function quadToCss(w, h, quad, bleed = 0) {
  const q = quad.map((p) => (Array.isArray(p) ? p : [p.x, p.y]));
  const b = bleed;
  return cssMatrix3d(homography([[b, b], [w + b, b], [w + b, h + b], [b, h + b]], q));
}
