/**
 * SIGNATURE 4: "THE COUNTRY COMES TO ONE DOOR" (STORYBOARD rows 38 to 40).
 *
 * A live, deterministic three.js model of Nigeria in the world of the opening art
 * (apps/web/public/brand/onboarding/step-1-dark.webp): a deep-blue velvet slab with a
 * rounded, rim-lit edge on a round navy plinth. A small architectural home rises in Lagos,
 * five guests' routes arc in from Abuja, Kano, Port Harcourt, Enugu and Ibadan, and the
 * Lagos pin lifts toward the camera, ready to become the Vallo mark.
 *
 *   import { createLiveMap } from "/video/scenes/map3d.js";
 *   const map = await createLiveMap({ canvas, width, height, dpr, film: "mobile" | "desktop" });
 *   map.render(t);   // t = seconds from the start of the map shot (row 38), 0 to 4.04
 *   map.labels(t);   // [{ city, x, y, ax, ay, opacity, scale, dot: { x, y } }]
 *   map.pin(t);      // { x, y, scale, size, opacity }
 *
 * Coordinates are canvas CSS px. A label is drawn with its anchor fraction (ax, ay) on
 * (x, y), i.e. `translate(x px, y px) translate(-ax*100 %, -ay*100 %) scale(scale)`, so it
 * sits beside its city's dot on the side away from Lagos and never under a route.
 * `map.pin(t)` is the pin head's centre, its on-screen diameter (`size`, px) and
 * `scale` = size / its size when it first sits above Lagos (1 until the lift at 3.7 s).
 * `map.point(city, t)` is a city's point on the slab (Lagos: where the house stands), for
 * the falling sticker to land on; `map.timing` holds every event time (sound cues).
 *
 * Rules kept (video/BUILDING.md): every frame is a pure function of t (no clock, no
 * Math.random: the velvet grain comes from a seeded generator), nothing is carried between
 * frames, and the canvas is transparent (the film draws its own background). No text is
 * drawn in 3D. three and topojson-client are imported by absolute URL (no import map).
 */
import * as THREE from "/node_modules/three/build/three.module.js";
import { feature } from "/node_modules/topojson-client/src/index.js";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------------------------ */
/* The story (seconds from the start of the map shot)                                   */
/* ------------------------------------------------------------------------------------ */

export const SHOT = 4.04;

export const CITIES = [
  { city: "Lagos", lon: 3.379, lat: 6.524 },
  { city: "Abuja", lon: 7.399, lat: 9.076 },
  { city: "Kano", lon: 8.592, lat: 12.002 },
  { city: "Port Harcourt", lon: 7.013, lat: 4.816 },
  { city: "Enugu", lon: 7.51, lat: 6.459 },
  { city: "Ibadan", lon: 3.947, lat: 7.378 },
];

const T = {
  land: 0.35, // the sticker lands on Lagos: the slab takes a soft squash
  base: [0.3, 0.56], // the home's round base
  walls: [0.42, 1.06],
  roof: [0.8, 1.3],
  windows: [1.12, 1.62],
  routes: 1.73, // the first route leaves; then one every 0.24 s
  routeGap: 0.24,
  pinIn: [3.08, 3.42], // the pin drops in above the home
  pinLift: [3.7, SHOT], // it lifts toward the camera
  labelsOut: [3.52, 3.82],
};
const ROUTE_ORDER = ["Abuja", "Kano", "Port Harcourt", "Enugu", "Ibadan"];

/* The model, in model units (the country is WIDTH units from east to west). */
const WIDTH = 10;
const SLAB = { height: 0.5, bevel: 0.11, segments: 6, sink: 0.06 };
const PLINTH = { margin: 0.42, height: 0.62, bevel: 0.16, segments: 200 };
const HOUSE_W = 0.42; // about 4 % of the country's width
const CLEAR = { house: 0.42, dot: 0.2 }; // how far Lagos' house and the dots stay inside the edge

/* Each film: camera path and the box the country must stay inside (canvas px, at 1080 x 1920
   or 1920 x 1080; other sizes scale). Pitch is degrees above the horizontal. */
const FILMS = {
  mobile: {
    size: [1080, 1920],
    box: [60, 380, 1020, 1300],
    frame: [22, 0, 1058, 1500], // the plinth stays inside this
    fov: 30,
    az: [-9, 3],
    pitch: [46, 40],
    push: 0.035,
    margin: 12,
    pinEnd: [540, 900, 250], // x, y, head diameter (px) when the pin hands over to the mark
  },
  desktop: {
    size: [1920, 1080],
    box: [460, 120, 1460, 900],
    frame: [40, 40, 1880, 1040],
    fov: 26,
    az: [-9, 3],
    pitch: [43, 37],
    push: 0.035,
    margin: 10,
    pinEnd: [960, 520, 210],
  },
};

/* ------------------------------------------------------------------------------------ */
/* Small maths                                                                           */
/* ------------------------------------------------------------------------------------ */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const mix = (a, b, u) => a + (b - a) * u;

/** A CSS-style cubic-bezier ease (the engine's `land`, `glide`, ... in core.js). */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  const dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i += 1) {
      const e = X(s) - x;
      if (Math.abs(e) < 1e-7) return Y(s);
      const d = dX(s);
      if (Math.abs(d) < 1e-6) break;
      s -= e / d;
    }
    let lo = 0, hi = 1;
    s = x;
    for (let i = 0; i < 48; i += 1) {
      const v = X(s);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}
const EASE = {
  land: bezier(0.12, 0.72, 0.24, 1),
  leave: bezier(0.55, 0, 0.9, 0.35),
  glide: bezier(0.62, 0, 0.18, 1),
  whip: bezier(0.78, 0, 0.08, 1),
  drift: bezier(0.3, 0.2, 0.7, 0.8),
  soft: bezier(0.4, 0, 0.2, 1),
};

/** A seeded random stream (mulberry32, the same generator as ctx.random). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A soft spring: 0 at rest, first swing +1 (a squash), dying away. */
function spring(t, t0, { freq = 2.6, decay = 7 } = {}) {
  const s = t - t0;
  if (s <= 0) return 0;
  return Math.exp(-decay * s) * Math.sin(TAU * freq * s) * 1.45;
}

/* ------------------------------------------------------------------------------------ */
/* The velvet grain: seeded, tileable value noise                                        */
/* ------------------------------------------------------------------------------------ */

function noiseLayer(size, freq, rand) {
  const lat = new Float32Array(freq * freq);
  for (let i = 0; i < lat.length; i += 1) lat[i] = rand();
  const out = new Float32Array(size * size);
  const s = (v) => v * v * (3 - 2 * v);
  for (let y = 0; y < size; y += 1) {
    const fy = (y / size) * freq;
    const iy = Math.floor(fy);
    const ty = s(fy - iy);
    const y0 = iy % freq, y1 = (iy + 1) % freq;
    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * freq;
      const ix = Math.floor(fx);
      const tx = s(fx - ix);
      const x0 = ix % freq, x1 = (ix + 1) % freq;
      const a = mix(lat[y0 * freq + x0], lat[y0 * freq + x1], tx);
      const b = mix(lat[y1 * freq + x0], lat[y1 * freq + x1], tx);
      out[y * size + x] = mix(a, b, ty);
    }
  }
  return out;
}

function grainTexture(seed = 566) {
  const size = 256;
  const rand = random(seed);
  const layers = (octaves) => {
    const acc = new Float32Array(size * size);
    let total = 0;
    for (const [freq, amp] of octaves) {
      const l = noiseLayer(size, freq, rand);
      for (let i = 0; i < acc.length; i += 1) acc[i] += l[i] * amp;
      total += amp;
    }
    let mean = 0;
    for (let i = 0; i < acc.length; i += 1) mean += acc[i] / total;
    mean /= acc.length;
    let dev = 0;
    for (let i = 0; i < acc.length; i += 1) dev = Math.max(dev, Math.abs(acc[i] / total - mean));
    for (let i = 0; i < acc.length; i += 1) acc[i] = 0.5 + (0.5 * (acc[i] / total - mean)) / dev;
    return acc;
  };
  const fine = layers([[128, 0.55], [64, 0.3], [32, 0.15]]); // the pile
  const mottle = layers([[8, 0.6], [16, 0.4]]); // soft unevenness of the flock
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = Math.round(fine[i] * 255);
    data[i * 4 + 1] = Math.round(mottle[i] * 255);
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------------------------ */
/* The outline: world-atlas -> projected ring -> rasterised, softened, re-traced         */
/* ------------------------------------------------------------------------------------ */

function ringArea(P) {
  let a = 0;
  for (let i = 0, n = P.length; i < n; i += 1) {
    const p = P[i], q = P[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Nigeria's largest outer ring, [lon, lat] without the closing point. */
function nigeriaRing(topology) {
  const obj = topology.objects.countries.geometries.find((g) => String(g.id) === "566");
  if (!obj) throw new Error("map3d: Nigeria (566) is not in the world data");
  const geo = feature(topology, obj).geometry;
  const polys = geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates;
  let best = null;
  for (const poly of polys) {
    const ring = poly[0].slice(0, -1);
    if (!best || Math.abs(ringArea(ring)) > Math.abs(ringArea(best))) best = ring;
  }
  return best;
}

/**
 * Softens the projected outline: rasterise it on a fine grid, blur (three box passes, a
 * near-Gaussian), and re-trace the half-way contour with marching squares. Narrow inlets
 * of the delta close, corners round off, and the result is a clean ring the bevel can
 * follow without folding over itself. Then resampled at an even spacing, anticlockwise.
 */
function softOutline(P, { cell = 0.02, blur = 3, spacing = 0.045 } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of P) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const pad = cell * (blur * 4 + 6);
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const nx = Math.ceil((x1 - x0) / cell) + 1;
  const ny = Math.ceil((y1 - y0) / cell) + 1;
  const F = new Float32Array(nx * ny);
  // scanline fill at grid points
  const xs = [];
  for (let j = 0; j < ny; j += 1) {
    const y = y0 + j * cell;
    xs.length = 0;
    for (let i = 0, n = P.length; i < n; i += 1) {
      const a = P[i], b = P[(i + 1) % n];
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const ia = Math.ceil((xs[k] - x0) / cell);
      const ib = Math.floor((xs[k + 1] - x0) / cell);
      for (let i = ia; i <= ib; i += 1) F[j * nx + i] = 1;
    }
  }
  // blur: 3 x (horizontal + vertical) box passes of radius `blur`
  const tmp = new Float32Array(nx * ny);
  const boxH = (src, dst) => {
    const w = 2 * blur + 1;
    for (let j = 0; j < ny; j += 1) {
      let acc = 0;
      const row = j * nx;
      for (let i = -blur; i <= blur; i += 1) acc += src[row + Math.min(nx - 1, Math.max(0, i))];
      for (let i = 0; i < nx; i += 1) {
        dst[row + i] = acc / w;
        acc += src[row + Math.min(nx - 1, i + blur + 1)] - src[row + Math.max(0, i - blur)];
      }
    }
  };
  const boxV = (src, dst) => {
    const w = 2 * blur + 1;
    for (let i = 0; i < nx; i += 1) {
      let acc = 0;
      for (let j = -blur; j <= blur; j += 1) acc += src[Math.min(ny - 1, Math.max(0, j)) * nx + i];
      for (let j = 0; j < ny; j += 1) {
        dst[j * nx + i] = acc / w;
        acc += src[Math.min(ny - 1, j + blur + 1) * nx + i] - src[Math.max(0, j - blur) * nx + i];
      }
    }
  };
  for (let k = 0; k < 3; k += 1) {
    boxH(F, tmp);
    boxV(tmp, F);
  }
  // marching squares, segments oriented with the inside on their left
  const iso = 0.5;
  const pos = new Map();
  const next = new Map();
  const hId = (i, j) => 2 * (j * nx + i);
  const vId = (i, j) => 2 * (j * nx + i) + 1;
  const edgePoint = (id, i, j, e) => {
    if (pos.has(id)) return;
    const f0 = F[j * nx + i], f1 = F[j * nx + i + 1], f2 = F[(j + 1) * nx + i + 1], f3 = F[(j + 1) * nx + i];
    let x, y;
    if (e === "B") { x = i + (iso - f0) / (f1 - f0); y = j; }
    else if (e === "R") { x = i + 1; y = j + (iso - f1) / (f2 - f1); }
    else if (e === "T") { x = i + (iso - f3) / (f2 - f3); y = j + 1; }
    else { x = i; y = j + (iso - f0) / (f3 - f0); }
    pos.set(id, [x0 + x * cell, y0 + y * cell]);
  };
  const SEG = {
    1: [["B", "L"]], 2: [["R", "B"]], 3: [["R", "L"]], 4: [["T", "R"]],
    6: [["T", "B"]], 7: [["T", "L"]], 8: [["L", "T"]], 9: [["B", "T"]],
    11: [["R", "T"]], 12: [["L", "R"]], 13: [["B", "R"]], 14: [["L", "B"]],
  };
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const f0 = F[j * nx + i], f1 = F[j * nx + i + 1], f2 = F[(j + 1) * nx + i + 1], f3 = F[(j + 1) * nx + i];
      const c = (f0 > iso ? 1 : 0) | (f1 > iso ? 2 : 0) | (f2 > iso ? 4 : 0) | (f3 > iso ? 8 : 0);
      if (c === 0 || c === 15) continue;
      let segs = SEG[c];
      if (c === 5 || c === 10) {
        const centre = (f0 + f1 + f2 + f3) / 4 > iso;
        if (c === 5) segs = centre ? [["B", "R"], ["T", "L"]] : [["B", "L"], ["T", "R"]];
        else segs = centre ? [["L", "B"], ["R", "T"]] : [["R", "B"], ["L", "T"]];
      }
      const ids = { B: hId(i, j), T: hId(i, j + 1), L: vId(i, j), R: vId(i + 1, j) };
      for (const [a, b] of segs) {
        edgePoint(ids[a], i, j, a);
        edgePoint(ids[b], i, j, b);
        next.set(ids[a], ids[b]);
      }
    }
  }
  // link into loops, keep the largest
  const seen = new Set();
  let best = null;
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let id = start;
    while (id !== undefined && !seen.has(id)) {
      seen.add(id);
      loop.push(pos.get(id));
      id = next.get(id);
    }
    if (loop.length > 8 && (!best || Math.abs(ringArea(loop)) > Math.abs(ringArea(best)))) best = loop;
  }
  if (ringArea(best) < 0) best.reverse();
  return resample(best, spacing);
}

/** A closed polyline resampled at an even spacing (starting from its first point). */
function resample(P, spacing) {
  const n = P.length;
  const cum = [0];
  for (let i = 0; i < n; i += 1) {
    const p = P[i], q = P[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const L = cum[n];
  const m = Math.max(16, Math.round(L / spacing));
  const out = [];
  let k = 0;
  for (let s = 0; s < m; s += 1) {
    const d = (s / m) * L;
    while (cum[k + 1] < d) k += 1;
    const p = P[k], q = P[(k + 1) % n];
    const u = (d - cum[k]) / Math.max(1e-9, cum[k + 1] - cum[k]);
    out.push([mix(p[0], q[0], u), mix(p[1], q[1], u)]);
  }
  return out;
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const u = clamp01(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1));
  const qx = a[0] + u * dx, qy = a[1] + u * dy;
  return { d: Math.hypot(p[0] - qx, p[1] - qy), q: [qx, qy] };
}

function inside(p, P) {
  let c = false;
  for (let i = 0, n = P.length, j = n - 1; i < n; j = i, i += 1) {
    const a = P[i], b = P[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/** Moves p inside the ring until it is at least `clear` from its edge (the delta coast). */
function keepInside(p, P, clear) {
  let q = [p[0], p[1]];
  for (let k = 0; k < 40; k += 1) {
    let best = { d: Infinity, q: null };
    for (let i = 0, n = P.length; i < n; i += 1) {
      const r = segDist(q, P[i], P[(i + 1) % n]);
      if (r.d < best.d) best = r;
    }
    const inn = inside(q, P);
    if (inn && best.d >= clear) break;
    let dx = q[0] - best.q[0], dy = q[1] - best.q[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    if (!inn) { dx = -dx; dy = -dy; }
    const step = inn ? clear - best.d + 0.01 : best.d + clear + 0.01;
    q = [q[0] + dx * step, q[1] + dy * step];
  }
  return q;
}

/** The smallest circle around the points (iterative, on every other point). */
function enclosingCircle(P) {
  const S = P.filter((_, i) => i % 2 === 0);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const circ3 = (a, b, c) => {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const A = a[0] * a[0] + a[1] * a[1], B = b[0] * b[0] + b[1] * b[1], C = c[0] * c[0] + c[1] * c[1];
    const u = [(A * (b[1] - c[1]) + B * (c[1] - a[1]) + C * (a[1] - b[1])) / d, (A * (c[0] - b[0]) + B * (a[0] - c[0]) + C * (b[0] - a[0])) / d];
    return [u, dist(u, a)];
  };
  let c = S[0], r = 0;
  for (let i = 0; i < S.length; i += 1) {
    if (dist(S[i], c) <= r + 1e-9) continue;
    c = S[i]; r = 0;
    for (let j = 0; j < i; j += 1) {
      if (dist(S[j], c) <= r + 1e-9) continue;
      c = [(S[i][0] + S[j][0]) / 2, (S[i][1] + S[j][1]) / 2];
      r = dist(S[i], S[j]) / 2;
      for (let k = 0; k < j; k += 1) if (dist(S[k], c) > r + 1e-9) [c, r] = circ3(S[i], S[j], S[k]);
    }
  }
  return { c, r };
}

/* ------------------------------------------------------------------------------------ */
/* Geometry                                                                              */
/* ------------------------------------------------------------------------------------ */

/**
 * The slab: a vertical wall, a quarter-round bevel and a flat top, from the soft outline
 * (x east, y north; model space has +y up and north toward -z). Explicit smooth normals;
 * uv in model units (the grain is scaled in the shader): the top uses x/z, the wall and
 * bevel run along the outline.
 */
function slabGeometry(C, { height, bevel, segments, sink }) {
  const n = C.length;
  // outward normals and the local radius of convex bends (the bevel narrows where tighter)
  const out = [];
  const bevelAt = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const a = C[(i - 1 + n) % n], p = C[i], b = C[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    out.push([ty / tl, -tx / tl]);
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const turn = Math.atan2(e1[0] * e2[1] - e1[1] * e2[0], e1[0] * e2[0] + e1[1] * e2[1]); // > 0: convex (CCW)
    const len = (Math.hypot(...e1) + Math.hypot(...e2)) / 2;
    const rho = turn > 1e-4 ? len / turn : Infinity;
    bevelAt[i] = Math.min(bevel, 0.8 * rho);
  }
  for (let pass = 0; pass < 6; pass += 1) {
    const b = Float32Array.from(bevelAt);
    for (let i = 0; i < n; i += 1) bevelAt[i] = Math.min(b[i], (b[(i - 1 + n) % n] + 2 * b[i] + b[(i + 1) % n]) / 4 + 0.004);
  }
  const arc = [0];
  for (let i = 1; i <= n; i += 1) arc.push(arc[i - 1] + Math.hypot(C[i % n][0] - C[i - 1][0], C[i % n][1] - C[i - 1][1]));

  const P = [], N = [], U = [], idx = [];
  const rows = segments + 2; // the wall's foot + (segments + 1) rows of the bevel
  for (let r = 0; r < rows; r += 1) {
    for (let i = 0; i <= n; i += 1) {
      const k = i % n;
      const [x, y] = C[k];
      const [ox, oy] = out[k];
      const rb = bevelAt[k];
      let inset, h, nh, nv, v;
      if (r === 0) {
        inset = 0; h = -sink; nh = 1; nv = 0; v = 0;
      } else {
        const phi = ((r - 1) / segments) * (Math.PI / 2);
        inset = rb * (1 - Math.cos(phi));
        h = height - rb + rb * Math.sin(phi);
        nh = Math.cos(phi); nv = Math.sin(phi);
        v = sink + height - bevel + bevel * phi;
      }
      P.push(x - ox * inset, h, -(y - oy * inset));
      N.push(ox * nh, nv, -oy * nh);
      U.push(arc[i], v);
    }
  }
  const W = n + 1;
  for (let r = 0; r < rows - 1; r += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = r * W + i, b = r * W + i + 1, c = (r + 1) * W + i + 1, d = (r + 1) * W + i;
      idx.push(a, b, c, a, c, d);
    }
  }
  // the top: the last bevel ring, triangulated
  const top = [];
  const base = P.length / 3;
  for (let i = 0; i < n; i += 1) {
    const [x, y] = C[i];
    const [ox, oy] = out[i];
    const px = x - ox * bevelAt[i], py = y - oy * bevelAt[i];
    top.push(new THREE.Vector2(px, py));
    P.push(px, height, -py);
    N.push(0, 1, 0);
    U.push(px, -py);
  }
  const faces = THREE.ShapeUtils.triangulateShape(top.slice(), []);
  for (const [a, b, c] of faces) {
    const A = top[a], B = top[b], Cc = top[c];
    const s = (B.x - A.x) * (Cc.y - A.y) - (B.y - A.y) * (Cc.x - A.x);
    if (s >= 0) idx.push(base + a, base + b, base + c);
    else idx.push(base + a, base + c, base + b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(idx);
  return g;
}

/** A lathe from a profile of { r, y, nr, ny, v } points (top first), uv in model units. */
function latheGeometry(profile, segments) {
  const P = [], N = [], U = [], idx = [];
  const rows = profile.length;
  for (let r = 0; r < rows; r += 1) {
    const p = profile[r];
    for (let s = 0; s <= segments; s += 1) {
      const a = (s / segments) * TAU;
      const c = Math.cos(a), sn = Math.sin(a);
      P.push(p.r * c, p.y, p.r * sn);
      N.push(p.nr * c, p.ny, p.nr * sn);
      if (p.flat) U.push(p.r * c, p.r * sn);
      else U.push(a * p.r, p.v);
    }
  }
  const W = segments + 1;
  for (let r = 0; r < rows - 1; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = r * W + s, b = r * W + s + 1, c = (r + 1) * W + s + 1, d = (r + 1) * W + s;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(idx);
  return g;
}

/** The round plinth: a flat top, a soft quarter-round edge and a straight side. */
function plinthGeometry(R, { height, bevel, segments }) {
  const prof = [];
  prof.push({ r: 0, y: 0, nr: 0, ny: 1, flat: true });
  prof.push({ r: (R - bevel) * 0.5, y: 0, nr: 0, ny: 1, flat: true });
  prof.push({ r: R - bevel, y: 0, nr: 0, ny: 1, flat: true });
  const S = 8;
  for (let k = 1; k <= S; k += 1) {
    const phi = (k / S) * (Math.PI / 2);
    prof.push({ r: R - bevel + bevel * Math.sin(phi), y: -bevel + bevel * Math.cos(phi), nr: Math.sin(phi), ny: Math.cos(phi), v: bevel * phi });
  }
  prof.push({ r: R, y: -height + 0.05, nr: 1, ny: 0, v: bevel * Math.PI / 2 + height - 0.05 - bevel });
  prof.push({ r: R - 0.05, y: -height, nr: 0.5, ny: -0.86, v: bevel * Math.PI / 2 + height - bevel });
  return latheGeometry(prof, segments);
}

/** A route: a sine arc from `a` to `b` whose height is a quarter of its length. */
class ArcCurve extends THREE.Curve {
  constructor(a, b, lift) {
    super();
    this.a = a;
    this.b = b;
    this.lift = lift;
  }
  getPoint(u, target = new THREE.Vector3()) {
    target.lerpVectors(this.a, this.b, u);
    target.y += this.lift * Math.sin(Math.PI * u);
    return target;
  }
}

/* ------------------------------------------------------------------------------------ */
/* Materials: small custom shaders, cheap on SwiftShader                                 */
/* ------------------------------------------------------------------------------------ */

/* Colours are given as sRGB hex and converted to linear. Shaders light in linear and
   write sRGB into an 8-bit target; the final pass adds the glow in (near) linear light. */
const lin = (hex) => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear

const GLSL_COMMON = /* glsl */ `
  uniform float uGlowPass;
  vec3 toSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  // final write: the glow pass stores light / 2 (linear) for the bloom, the main pass sRGB
  vec4 outColor(vec3 col, vec3 glow) {
    if (uGlowPass > 0.5) return vec4(glow * 0.5, 1.0);
    vec3 s = toSRGB(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
    return vec4(s, 1.0);
  }
`;

const VERT_LIT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/* The velvet: wrapped key light, a hemisphere of navy and blue, a soft pool of light, and
   the pile: fibres that catch the rim light at grazing angles (the glowing edge of the art),
   with a seeded grain. */
const FRAG_VELVET = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uAlbedo;
  uniform vec3 uKeyDir;
  uniform vec3 uKeyCol;
  uniform vec3 uRimDir;
  uniform vec3 uRimCol;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uSheenCol;
  uniform float uSheenPow;
  uniform vec3 uPool;
  uniform float uPoolR;
  uniform float uPoolAmt;
  uniform sampler2D uGrain;
  uniform float uGrainScale;
  uniform float uGrainAmt;
  uniform float uGlowGain;
  uniform float uGlowFloor;
  uniform vec3 uWarmPos;
  uniform vec3 uWarmCol;
  uniform float uWarmR;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float nv = clamp(dot(N, V), 0.0, 1.0);
    vec2 g = texture2D(uGrain, vUv * uGrainScale).rg - 0.5;
    float kd = clamp((dot(N, uKeyDir) + 0.45) / 1.45, 0.0, 1.0);
    vec2 dp = (vPos.xz - uPool.xz) / uPoolR;
    float pool = mix(1.0, exp(-dot(dp, dp)), uPoolAmt);
    vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
    vec3 col = uAlbedo * (hemi + uKeyCol * kd * pool);
    // the pile: bright where the surface turns away from the eye, strongest toward the rim light
    float fr = pow(1.0 - nv, uSheenPow);
    float toRim = clamp(dot(N, uRimDir) * 0.5 + 0.5, 0.0, 1.0);
    float behind = clamp(dot(-V, uRimDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 sheen = fr * (uSheenCol * (0.45 + 0.55 * kd) + uRimCol * toRim * (0.35 + 0.65 * behind));
    float grain = g.x * uGrainAmt + g.y * uGrainAmt * 0.6;
    col = col * (1.0 + grain) + sheen * (1.0 + 2.2 * g.x);
    // warm light spilling from the home's windows
    vec3 dw = vPos - uWarmPos;
    col += uWarmCol * exp(-dot(dw, dw) / (uWarmR * uWarmR)) * (0.4 + 0.6 * N.y);
    vec3 glow = max(sheen - uGlowFloor, 0.0) * uGlowGain;
    gl_FragColor = outColor(col, glow);
  }
`;

/* Matte clay for the model house (smooth, lightly rim-lit like the art's house). */
const FRAG_CLAY = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uAlbedo;
  uniform vec3 uKeyDir;
  uniform vec3 uKeyCol;
  uniform vec3 uRimDir;
  uniform vec3 uRimCol;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uEmissive;
  uniform float uGlowGain;
  uniform float uRimGlow;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float nv = clamp(dot(N, V), 0.0, 1.0);
    float kd = clamp((dot(N, uKeyDir) + 0.3) / 1.3, 0.0, 1.0);
    vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
    vec3 H = normalize(uKeyDir + V);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 40.0) * 0.12;
    float fr = pow(1.0 - nv, 3.0);
    float toRim = clamp(dot(N, uRimDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 rim = uRimCol * fr * (0.3 + 0.7 * toRim);
    vec3 col = uAlbedo * (hemi + uKeyCol * kd) + spec * uKeyCol + rim + uEmissive;
    gl_FragColor = outColor(col, uEmissive * uGlowGain + rim * uRimGlow);
  }
`;

/* Pure light (windows, dots, pulse heads, glow proxies). uShape 1: a soft round falloff
   from the uv centre (for flat discs). uOnlyGlow 1: invisible in the main pass. */
const FRAG_LIGHT = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uGlowGain;
  uniform float uShape;
  uniform float uOnlyGlow;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    float a = 1.0;
    if (uShape > 0.5) {
      float r = length(vUv - 0.5) * 2.0;
      a = clamp(1.0 - r, 0.0, 1.0);
      a = a * a;
    } else if (uShape < -0.5) {
      vec3 N = normalize(vN);
      vec3 V = normalize(cameraPosition - vPos);
      a = pow(clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);
    }
    vec3 c = uColor * uIntensity * a;
    if (uGlowPass > 0.5) { gl_FragColor = vec4(c * uGlowGain * 0.5, 1.0); return; }
    if (uOnlyGlow > 0.5) discard;
    gl_FragColor = vec4(toSRGB(c), 1.0);
  }
`;

/* A route: a glowing tube that grows along its arc, with a bright head and a pulse. */
const FRAG_ROUTE = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uHot;
  uniform float uGrow;
  uniform float uHeadAmt;
  uniform float uPulse;
  uniform float uPulseAmt;
  uniform float uIntensity;
  uniform float uGlowGain;
  uniform float uOnlyGlow;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    float u = vUv.x;
    if (u > uGrow) discard;
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float nv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float behind = (uGrow - u) / 0.06;
    float head = exp(-behind * behind) * uHeadAmt;
    float dp = (u - uPulse) / 0.05;
    float pulse = exp(-dp * dp) * uPulseAmt;
    float tail = smoothstep(0.0, 0.08, u);
    vec3 c = mix(uColA, uColB, u) * (0.45 + 0.55 * tail) * uIntensity;
    c += uHot * (head + pulse);
    float body = uOnlyGlow > 0.5 ? nv * nv : (0.55 + 0.45 * nv);
    c *= body;
    if (uGlowPass > 0.5) { gl_FragColor = vec4(c * uGlowGain * 0.5, 1.0); return; }
    if (uOnlyGlow > 0.5) discard;
    gl_FragColor = vec4(toSRGB(c), 1.0);
  }
`;

/* A soft decal lying on a surface: shadows (multiply toward black) and light (additive). */
const FRAG_DECAL = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uAdd;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).r * uOpacity;
    if (uAdd > 0.5) gl_FragColor = vec4(uColor * a, 0.0);
    else gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
`;

/* A ripple: a soft ring on the slab, radius and strength from uniforms. */
const FRAG_RIPPLE = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uWidth;
  uniform float uAmt;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float d = (r - uRadius) / uWidth;
    float a = exp(-d * d) * uAmt;
    if (a < 0.002) discard;
    vec3 c = uColor * a;
    if (uGlowPass > 0.5) { gl_FragColor = vec4(c * 0.5, 0.0); return; }
    gl_FragColor = vec4(c, 0.0);
  }
`;

/* The pin: electric-blue glass, lit from inside, with a white core (the future mark). */
const FRAG_PIN = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uBase;
  uniform vec3 uEdge;
  uniform vec3 uKeyDir;
  uniform float uGlowGain;
  uniform float uInner;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float nv = clamp(dot(N, V), 0.0, 1.0);
    float fr = pow(1.0 - nv, 2.2);
    vec3 H = normalize(uKeyDir + V);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 60.0);
    float kd = clamp(dot(N, uKeyDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = uBase * (0.35 + 0.65 * kd) * (0.8 + uInner) + uEdge * fr * 1.4 + vec3(1.0) * spec * 0.9;
    gl_FragColor = outColor(col, (uBase * (0.3 + uInner) + uEdge * fr) * uGlowGain);
  }
`;

/* Full-screen passes. */
const VERT_QUAD = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG_BLUR = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
    c += texture2D(tSrc, vUv + uStep * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tSrc, vUv - uStep * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tSrc, vUv + uStep * 3.2307692308).rgb * 0.0702702703;
    c += texture2D(tSrc, vUv - uStep * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
  }
`;
const FRAG_FINAL = /* glsl */ `
  uniform sampler2D tMain;
  uniform sampler2D tGlowA;
  uniform sampler2D tGlowB;
  uniform vec2 uTexel;
  uniform float uTaps;
  uniform float uGlowA;
  uniform float uGlowB;
  uniform float uHaloAlpha;
  varying vec2 vUv;
  void main() {
    vec4 m;
    if (uTaps > 1.5) {
      vec2 o = uTexel * 0.5;
      m = 0.25 * (texture2D(tMain, vUv + vec2(-o.x, -o.y)) + texture2D(tMain, vUv + vec2(o.x, -o.y))
                + texture2D(tMain, vUv + vec2(-o.x, o.y)) + texture2D(tMain, vUv + vec2(o.x, o.y)));
    } else {
      m = texture2D(tMain, vUv);
    }
    vec3 glow = (texture2D(tGlowA, vUv).rgb * uGlowA + texture2D(tGlowB, vUv).rgb * uGlowB) * 2.0;
    // add the glow in (near) linear light over the premultiplied sRGB model
    vec3 l = m.rgb * m.rgb + glow;
    vec3 c = sqrt(min(l, vec3(1.0)));
    // over the transparent background the glow keeps a little alpha of its own
    float g = max(c.r, max(c.g, c.b));
    float a = max(m.a, min(1.0, g * uHaloAlpha));
    gl_FragColor = vec4(c, a);
  }
`;

/* ------------------------------------------------------------------------------------ */
/* The live map                                                                          */
/* ------------------------------------------------------------------------------------ */

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {number} o.width   canvas CSS width
 * @param {number} o.height  canvas CSS height
 * @param {number} [o.dpr=1]
 * @param {'mobile'|'desktop'} [o.film='mobile']
 * @param {'ss'|'msaa'} [o.aa='ss']   'ss': a 1.5x buffer filtered down in the last pass; 'msaa': 4x MSAA
 * @param {number} [o.supersample=1.5]
 * @param {string} [o.data]  world-atlas countries-50m.json URL
 * @param {object} [o.world] the parsed topology (skips the fetch)
 */
export async function createLiveMap(o) {
  const { canvas, width, height } = o;
  const dpr = o.dpr ?? 1;
  const film = o.film === "desktop" ? "desktop" : "mobile";
  const F = FILMS[film];
  const aa = o.aa === "msaa" ? "msaa" : "ss";
  const ss = aa === "ss" ? o.supersample ?? 1.5 : 1;
  const sx = width / F.size[0]; // this canvas vs the film's frame
  const sy = height / F.size[1];

  /* ---------- the country ---------- */
  const world = o.world ?? (await fetch(o.data ?? "/node_modules/world-atlas/countries-50m.json").then((r) => {
    if (!r.ok) throw new Error(`map3d: world data ${r.status}`);
    return r.json();
  }));
  const ring = nigeriaRing(world);
  let lon0 = Infinity, lon1 = -Infinity, lat0 = Infinity, lat1 = -Infinity;
  for (const [lo, la] of ring) {
    lon0 = Math.min(lon0, lo); lon1 = Math.max(lon1, lo);
    lat0 = Math.min(lat0, la); lat1 = Math.max(lat1, la);
  }
  const lonC = (lon0 + lon1) / 2, latC = (lat0 + lat1) / 2;
  const cosC = Math.cos(latC * DEG);
  const k = WIDTH / ((lon1 - lon0) * cosC);
  const proj = (lon, lat) => [(lon - lonC) * cosC * k, (lat - latC) * k]; // x east, y north
  const outline = softOutline(ring.map(([lo, la]) => proj(lo, la)));
  const circle = enclosingCircle(outline);
  const plinthR = circle.r + PLINTH.margin;
  const centre2 = circle.c; // the plinth's centre (x east, y north)

  /* City anchors, kept inside the edge (Lagos and Port Harcourt sit on the coast). */
  const anchors = {};
  for (const c of CITIES) {
    const p = proj(c.lon, c.lat);
    const clear = c.city === "Lagos" ? CLEAR.house : CLEAR.dot;
    const q = keepInside(p, outline, clear);
    anchors[c.city] = { x: q[0], z: -q[1], moved: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  }
  const topY = SLAB.height;

  /* ---------- renderer and targets ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!(renderer.getContext() instanceof WebGL2RenderingContext)) throw new Error("map3d: WebGL2 is required");
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, o.updateStyle !== false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the shaders encode sRGB themselves
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.sortObjects = true;

  const BW = Math.round(width * dpr), BH = Math.round(height * dpr);
  const mainRT = new THREE.WebGLRenderTarget(Math.round(BW * ss), Math.round(BH * ss), {
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    samples: aa === "msaa" ? 4 : 0,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });
  const gw = Math.max(8, Math.round(width / 4)), gh = Math.max(8, Math.round(height / 4));
  const rtOpts = { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
  const glowRT = new THREE.WebGLRenderTarget(gw, gh, { ...rtOpts, depthBuffer: true });
  const blurA1 = new THREE.WebGLRenderTarget(gw, gh, rtOpts);
  const blurA2 = new THREE.WebGLRenderTarget(gw, gh, rtOpts);
  const hw = Math.max(4, Math.round(gw / 2)), hh = Math.max(4, Math.round(gh / 2));
  const blurB1 = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  const blurB2 = new THREE.WebGLRenderTarget(hw, hh, rtOpts);

  /* ---------- lights (world space) and shared uniforms ---------- */
  const keyDir = new THREE.Vector3(-0.62, 0.7, 0.36).normalize(); // soft key from the west, above, in front
  const rimDir = new THREE.Vector3(0.28, 0.3, -0.91).normalize(); // blue rim light behind (north)
  const glowPass = { value: 0 };
  const grain = grainTexture(566);
  const centre3 = new THREE.Vector3(centre2[0], 0, -centre2[1]);

  const velvetUniforms = (u) => ({
    uGlowPass: glowPass,
    uAlbedo: { value: lin(u.albedo) },
    uKeyDir: { value: keyDir },
    uKeyCol: { value: lin(u.key).multiplyScalar(u.keyAmt) },
    uRimDir: { value: rimDir },
    uRimCol: { value: lin(u.rim).multiplyScalar(u.rimAmt) },
    uSky: { value: lin(u.sky).multiplyScalar(u.skyAmt) },
    uGround: { value: lin(u.ground).multiplyScalar(u.groundAmt) },
    uSheenCol: { value: lin(u.sheen).multiplyScalar(u.sheenAmt) },
    uSheenPow: { value: u.sheenPow },
    uPool: { value: u.pool },
    uPoolR: { value: u.poolR },
    uPoolAmt: { value: u.poolAmt },
    uGrain: { value: grain },
    uGrainScale: { value: u.grainScale },
    uGrainAmt: { value: u.grainAmt },
    uGlowGain: { value: u.glowGain },
    uGlowFloor: { value: u.glowFloor },
    uWarmPos: { value: new THREE.Vector3(0, -100, 0) },
    uWarmCol: { value: new THREE.Color(0, 0, 0) },
    uWarmR: { value: 0.6 },
  });
  const shader = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT_LIT, fragmentShader: frag, uniforms, ...extra });

  const LOOK = {
    slab: {
      albedo: "#0a2fd6",
      key: "#dfe6ff", keyAmt: 0.62,
      rim: "#2f7dff", rimAmt: 1.35,
      sky: "#1d3fae", skyAmt: 0.42,
      ground: "#050b3a", groundAmt: 0.25,
      sheen: "#3b74ff", sheenAmt: 0.55, sheenPow: 2.6,
      pool: new THREE.Vector3(centre3.x - 1.2, 0, centre3.z + 1.0), poolR: 7.5, poolAmt: 0.42,
      grainScale: 0.21, grainAmt: 0.075,
      glowGain: 0.9, glowFloor: 0.18,
    },
    plinth: {
      albedo: "#0a1466",
      key: "#dfe6ff", keyAmt: 0.5,
      rim: "#2f6dff", rimAmt: 1.1,
      sky: "#1a2c8a", skyAmt: 0.32,
      ground: "#02041c", groundAmt: 0.3,
      sheen: "#2a52d8", sheenAmt: 0.42, sheenPow: 2.8,
      pool: new THREE.Vector3(centre3.x - 1.2, 0, centre3.z + 1.0), poolR: 8.5, poolAmt: 0.5,
      grainScale: 0.21, grainAmt: 0.07,
      glowGain: 0.7, glowFloor: 0.2,
    },
  };

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  const model = new THREE.Group(); // squashes on the landing
  scene.add(model);

  const plinth = new THREE.Mesh(plinthGeometry(plinthR, PLINTH), shader(FRAG_VELVET, velvetUniforms(LOOK.plinth)));
  plinth.position.set(centre3.x, 0, centre3.z);
  model.add(plinth);

  const slabMat = shader(FRAG_VELVET, velvetUniforms(LOOK.slab));
  const slab = new THREE.Mesh(slabGeometry(outline, SLAB), slabMat);
  model.add(slab);

  /* Soft shadows: the slab on the plinth (a blurred silhouette, pushed away from the key
     light) and the house on the slab; drawn as decals, never as shadow maps. */
  const shadowTex = silhouetteShadow(outline, centre2, plinthR, keyDir);
  const decal = (tex, { add = false, color = 0x000000, opacity = 1 } = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: FRAG_DECAL,
      uniforms: { uMap: { value: tex }, uOpacity: { value: opacity }, uColor: { value: lin(color) }, uAdd: { value: add ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });
  const plinthShadow = new THREE.Mesh(new THREE.PlaneGeometry(plinthR * 2, plinthR * 2), decal(shadowTex, { opacity: 0.85 }));
  plinthShadow.rotation.x = -Math.PI / 2;
  plinthShadow.position.set(centre3.x, 0.002, centre3.z);
  plinthShadow.renderOrder = 1;
  model.add(plinthShadow);

  /* ---------- the home in Lagos ---------- */
  const lagos = anchors.Lagos;
  const house = buildHouse();
  house.root.position.set(lagos.x, topY, lagos.z);
  model.add(house.root);

  const blob = radialTexture(64, [[0, 1], [0.35, 0.75], [1, 0]]);
  const houseShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decal(blob, { opacity: 0.6 }));
  houseShadow.rotation.x = -Math.PI / 2;
  houseShadow.renderOrder = 1;
  model.add(houseShadow);

  const warmTex = radialTexture(64, [[0, 1], [0.4, 0.45], [1, 0]]);
  const houseWarm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decal(warmTex, { add: true, color: "#ff9a52", opacity: 0 }));
  houseWarm.rotation.x = -Math.PI / 2;
  houseWarm.renderOrder = 2;
  model.add(houseWarm);

  /* ---------- routes ---------- */
  const routeCol = { a: lin("#4f9dff"), b: lin("#a9dcff"), hot: lin("#ffffff") };
  const routes = ROUTE_ORDER.map((city, i) => {
    const an = anchors[city];
    const from = new THREE.Vector3(an.x, topY + 0.015, an.z);
    const dir = new THREE.Vector3(an.x - lagos.x, 0, an.z - lagos.z).normalize();
    const to = new THREE.Vector3(lagos.x + dir.x * HOUSE_W * 0.78, topY + 0.015, lagos.z + dir.z * HOUSE_W * 0.78);
    const length = from.distanceTo(to);
    const curve = new ArcCurve(from, to, 0.25 * length);
    const segs = Math.max(48, Math.round(length * 26));
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: VERT_LIT,
      fragmentShader: FRAG_ROUTE,
      uniforms: {
        uGlowPass: glowPass,
        uColA: { value: routeCol.a }, uColB: { value: routeCol.b }, uHot: { value: routeCol.hot },
        uGrow: { value: 0 }, uHeadAmt: { value: 0 }, uPulse: { value: -1 }, uPulseAmt: { value: 0 },
        uIntensity: { value: 1 }, uGlowGain: { value: 0.9 }, uOnlyGlow: { value: 0 },
      },
    });
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.028, 8, false), coreMat);
    const glowMat = coreMat.clone();
    glowMat.uniforms = THREE.UniformsUtils.clone(coreMat.uniforms);
    glowMat.uniforms.uGlowPass = glowPass;
    glowMat.uniforms.uOnlyGlow.value = 1;
    glowMat.uniforms.uGlowGain.value = 1.3;
    glowMat.transparent = true;
    glowMat.depthWrite = false;
    glowMat.blending = THREE.AdditiveBlending;
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.1, 8, false), glowMat);
    halo.userData.glowOnly = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), lightMat("#ffffff", 1.2, 1.6));
    const headHalo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), lightMat("#bfe4ff", 1, 1.6, { onlyGlow: true, shape: -1 }));
    headHalo.userData.glowOnly = true;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), lightMat("#cfeaff", 1.0, 1.4));
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(an.x, topY + 0.006, an.z);
    const dotHalo = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), lightMat("#7fc2ff", 1, 1.5, { onlyGlow: true, shape: 1 }));
    dotHalo.rotation.x = -Math.PI / 2;
    dotHalo.position.set(an.x, topY + 0.004, an.z);
    dotHalo.userData.glowOnly = true;
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rippleMat("#8fd3ff"));
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(lagos.x, topY + 0.004, lagos.z);
    ripple.renderOrder = 3;
    const launch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rippleMat("#8fd3ff"));
    launch.rotation.x = -Math.PI / 2;
    launch.position.set(an.x, topY + 0.005, an.z);
    launch.renderOrder = 3;
    for (const m of [core, halo, head, headHalo, dot, dotHalo, ripple, launch]) model.add(m);
    const start = T.routes + i * T.routeGap;
    const dur = Math.min(0.62, Math.max(0.3, 0.26 + 0.052 * length));
    return { city, from, to, length, curve, core, halo, head, headHalo, dot, dotHalo, ripple, launch, start, dur, land: start + dur };
  });

  /* the sticker's landing: a soft ring around the home's spot */
  const landRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rippleMat("#8fd3ff"));
  landRing.rotation.x = -Math.PI / 2;
  landRing.position.set(lagos.x, topY + 0.005, lagos.z);
  landRing.renderOrder = 3;
  model.add(landRing);

  function lightMat(color, intensity, glowGain, { onlyGlow = false, shape = 0 } = {}) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT_LIT,
      fragmentShader: FRAG_LIGHT,
      uniforms: {
        uGlowPass: glowPass,
        uColor: { value: lin(color) },
        uIntensity: { value: intensity },
        uGlowGain: { value: glowGain },
        uShape: { value: shape },
        uOnlyGlow: { value: onlyGlow ? 1 : 0 },
      },
      transparent: shape !== 0,
      depthWrite: shape === 0,
      blending: shape !== 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
  }
  function rippleMat(color) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT_LIT,
      fragmentShader: FRAG_RIPPLE,
      uniforms: { uGlowPass: glowPass, uColor: { value: lin(color) }, uRadius: { value: 0 }, uWidth: { value: 0.1 }, uAmt: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });
  }

  /* ---------- the pin ---------- */
  const pin = buildPin();
  scene.add(pin.root); // not in `model`: it leaves the map

  /* ---------- the house ---------- */
  function clayMat(albedo, { emissive = "#000000", rimAmt = 0.55, rimGlow = 0, glowGain = 1 } = {}) {
    return shader(FRAG_CLAY, {
      uGlowPass: glowPass,
      uAlbedo: { value: lin(albedo) },
      uKeyDir: { value: keyDir },
      uKeyCol: { value: lin("#fff4ea").multiplyScalar(0.95) },
      uRimDir: { value: rimDir },
      uRimCol: { value: lin("#4d8dff").multiplyScalar(rimAmt) },
      uSky: { value: lin("#4a64c8").multiplyScalar(0.55) },
      uGround: { value: lin("#101a5c").multiplyScalar(0.5) },
      uEmissive: { value: lin(emissive) },
      uGlowGain: { value: glowGain },
      uRimGlow: { value: rimGlow },
    });
  }

  function buildHouse() {
    const root = new THREE.Group();
    const s = HOUSE_W; // the house is 1 unit wide in its own space
    const scaler = new THREE.Group();
    scaler.scale.setScalar(s);
    root.add(scaler);
    const white = clayMat("#f2eefb", { rimAmt: 0.7, rimGlow: 0.25 });
    const baseMat = clayMat("#e7ecff", { rimAmt: 0.8, rimGlow: 0.35 });
    const roofMat = clayMat("#1f56f2", { rimAmt: 1.2, rimGlow: 0.9 });
    const doorMat = clayMat("#ff6b1a", { emissive: "#2a0c00" });
    // the base: a small round plinth
    const base = new THREE.Mesh(latheGeometry([
      { r: 0, y: 0.07, nr: 0, ny: 1, flat: true },
      { r: 0.8, y: 0.07, nr: 0, ny: 1, flat: true },
      { r: 0.86, y: 0.055, nr: 0.7, ny: 0.7, v: 0 },
      { r: 0.88, y: 0.0, nr: 1, ny: 0, v: 0.1 },
    ], 64), baseMat);
    scaler.add(base);
    // walls (grow from the base), door and windows ride on them
    const walls = new THREE.Group();
    walls.position.y = 0.07;
    scaler.add(walls);
    const WALL_H = 0.6, W = 1.0, D = 0.78;
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H, D), white);
    body.position.y = WALL_H / 2;
    walls.add(body);
    const winMats = [];
    const addWin = (x, y, z, w, h, ry) => {
      const m = lightMat("#ffb27a", 0, 1.1);
      winMats.push(m);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      win.position.set(x, y, z);
      win.rotation.y = ry;
      walls.add(win);
      // a thin white frame proud of the wall
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.03, 0.03), white);
      fr.position.set(x, y - h / 2 - 0.02, z);
      fr.rotation.y = ry;
      walls.add(fr);
    };
    const zf = D / 2 + 0.003;
    addWin(-0.3, 0.36, zf, 0.2, 0.2, 0);
    addWin(0.3, 0.36, zf, 0.2, 0.2, 0);
    addWin(W / 2 + 0.003, 0.36, 0, 0.2, 0.2, Math.PI / 2);
    addWin(-W / 2 - 0.003, 0.36, 0, 0.2, 0.2, -Math.PI / 2);
    addWin(0, 0.36, -zf, 0.22, 0.2, Math.PI);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.03), doorMat);
    door.position.set(0, 0.15, D / 2 + 0.012);
    walls.add(door);
    // the roof: a gable with eaves, dropped on
    const roof = new THREE.Group();
    scaler.add(roof);
    const RH = 0.42, over = 0.09;
    const tri = new THREE.Shape();
    tri.moveTo(-(D / 2 + over), 0);
    tri.lineTo(D / 2 + over, 0);
    tri.lineTo(0, RH);
    tri.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: W + 2 * over, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 1 });
    roofGeo.translate(0, 0, -(W + 2 * over) / 2);
    roofGeo.rotateY(Math.PI / 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roof.add(roofMesh);
    // gable ends in white, under the roof
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-D / 2, 0);
    gableShape.lineTo(D / 2, 0);
    gableShape.lineTo(0, RH - 0.07);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: W - 0.02, bevelEnabled: false });
    gableGeo.translate(0, 0, -(W - 0.02) / 2);
    gableGeo.rotateY(Math.PI / 2);
    const gable = new THREE.Mesh(gableGeo, white);
    gable.position.y = -0.005;
    roof.add(gable);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.11), white);
    chimney.position.set(0.26, RH * 0.72, -0.12);
    roof.add(chimney);
    // a warm glow proxy for the bloom (the lit windows seen from afar)
    const warmHalo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), lightMat("#ff9a4d", 0, 1.0, { onlyGlow: true, shape: -1 }));
    warmHalo.position.y = 0.4;
    warmHalo.userData.glowOnly = true;
    scaler.add(warmHalo);
    return { root, scaler, base, walls, roof, roofY: 0.07 + WALL_H, winMats, warmHalo, height: (0.07 + WALL_H + RH) * s };
  }

  function buildPin() {
    const root = new THREE.Group();
    const R = 1;
    const L = 2.35; // tip distance below the head's centre
    const th = Math.acos(-1 / L);
    const prof = [];
    const HEAD = 22;
    for (let k = 0; k <= HEAD; k += 1) {
      const a = (k / HEAD) * th;
      prof.push({ r: Math.max(1e-4, R * Math.sin(a)), y: R * Math.cos(a), nr: Math.sin(a), ny: Math.cos(a), v: a });
    }
    const tp = prof[prof.length - 1];
    const TIP = 10;
    for (let k = 1; k <= TIP; k += 1) {
      const u = k / TIP;
      prof.push({ r: Math.max(1e-4, tp.r * (1 - u)), y: mix(tp.y, -L, u), nr: Math.sin(th), ny: Math.cos(th), v: th + u });
    }
    const geo = latheGeometry(prof, 48);
    geo.scale(1, 1, 0.52); // a flattened pin: it faces the camera like the mark will
    const pinMat = shader(FRAG_PIN, {
      uGlowPass: glowPass,
      uBase: { value: lin("#0a62ff") },
      uEdge: { value: lin("#9fd8ff") },
      uKeyDir: { value: keyDir },
      uGlowGain: { value: 0.55 },
      uInner: { value: 0.2 },
    });
    const body = new THREE.Mesh(geo, pinMat);
    const coreGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.12, 40);
    coreGeo.rotateX(Math.PI / 2);
    const core = new THREE.Mesh(coreGeo, lightMat("#f4f9ff", 1.0, 0.9));
    const inner = new THREE.Group();
    inner.add(body, core);
    root.add(inner);
    return { root, inner, mat: pinMat, radius: R };
  }

  /* ---------- camera and framing ---------- */
  const camera = new THREE.PerspectiveCamera(F.fov, width / height, 0.5, 400);
  camera.matrixAutoUpdate = false;
  const target = new THREE.Vector3(centre3.x, topY * 0.4, centre3.z);
  const fovY = F.fov * DEG;
  let dist = 60;
  let shift = [0, 0]; // NDC lens shift

  function camPose(t) {
    const u = EASE.drift(prog(t, 0, SHOT));
    return { az: mix(F.az[0], F.az[1], u) * DEG, pitch: mix(F.pitch[0], F.pitch[1], u) * DEG, d: dist * (1 - F.push * u) };
  }
  const tmpM = new THREE.Matrix4();
  function setCamera(t) {
    const { az, pitch, d } = camPose(t);
    camera.position.set(
      target.x + d * Math.cos(pitch) * Math.sin(az),
      target.y + d * Math.sin(pitch),
      target.z + d * Math.cos(pitch) * Math.cos(az),
    );
    camera.up.set(0, 1, 0);
    camera.quaternion.setFromRotationMatrix(tmpM.lookAt(camera.position, target, camera.up));
    camera.updateMatrix();
    camera.updateMatrixWorld(true);
    camera.near = Math.max(0.3, d - plinthR * 3 - 40);
    camera.near = 0.4;
    camera.far = d + plinthR * 2 + 10;
    const top = camera.near * Math.tan(fovY / 2);
    const asp = width / height;
    const P = new THREE.Matrix4().makePerspective(-top * asp, top * asp, top, -top, camera.near, camera.far);
    const A = new THREE.Matrix4().set(1, 0, 0, shift[0], 0, 1, 0, shift[1], 0, 0, 1, 0, 0, 0, 0, 1);
    camera.projectionMatrix.multiplyMatrices(A, P);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  const v3 = new THREE.Vector3();
  function toScreen(p) {
    v3.copy(p).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    return { x: ((v3.x + 1) / 2) * width, y: ((1 - v3.y) / 2) * height, z: v3.z };
  }
  // the points that must stay in the box: the outline at the foot and top of the slab
  const framePts = [];
  for (let i = 0; i < outline.length; i += 3) {
    framePts.push(new THREE.Vector3(outline[i][0], 0, -outline[i][1]), new THREE.Vector3(outline[i][0], topY, -outline[i][1]));
  }
  const plinthPts = [];
  for (let i = 0; i < 64; i += 1) {
    const a = (i / 64) * TAU;
    for (const y of [0, -PLINTH.height]) plinthPts.push(new THREE.Vector3(centre3.x + plinthR * Math.cos(a), y, centre3.z + plinthR * Math.sin(a)));
  }
  function bounds(pts, t) {
    setCamera(t);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      const s = toScreen(p);
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x);
      y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
    }
    return [x0, y0, x1, y1];
  }
  const samples = Array.from({ length: 17 }, (_, i) => (i / 16) * SHOT);
  const union = (pts) => {
    const u = [Infinity, Infinity, -Infinity, -Infinity];
    for (const t of samples) {
      const b = bounds(pts, t);
      u[0] = Math.min(u[0], b[0]); u[1] = Math.min(u[1], b[1]);
      u[2] = Math.max(u[2], b[2]); u[3] = Math.max(u[3], b[3]);
    }
    return u;
  };
  const box = [F.box[0] * sx + F.margin, F.box[1] * sy + F.margin, F.box[2] * sx - F.margin, F.box[3] * sy - F.margin];
  const frame = [F.frame[0] * sx, F.frame[1] * sy, F.frame[2] * sx, F.frame[3] * sy];
  // solve the distance (size) and the lens shift so the country fills its box and the plinth its frame
  for (let it = 0; it < 6; it += 1) {
    shift = [0, 0];
    const u = union(framePts);
    const up = union(plinthPts);
    const need = Math.max((u[2] - u[0]) / (box[2] - box[0]), (u[3] - u[1]) / (box[3] - box[1]), (up[2] - up[0]) / (frame[2] - frame[0]));
    dist *= need;
  }
  {
    shift = [0, 0];
    const u = union(framePts);
    const up = union(plinthPts);
    // centre the country in its box, then nudge so the plinth stays inside the frame
    let dx = (box[0] + box[2]) / 2 - (u[0] + u[2]) / 2;
    let dy = (box[1] + box[3]) / 2 - (u[1] + u[3]) / 2;
    dx = Math.min(dx, box[2] - u[2]); dx = Math.max(dx, box[0] - u[0]);
    dy = Math.min(dy, box[3] - u[3]); dy = Math.max(dy, box[1] - u[1]);
    if (up[3] + dy > frame[3]) dy = Math.max(box[1] - u[1], frame[3] - up[3]);
    shift = [(dx / width) * 2, (-dy / height) * 2];
  }
  const framing = { dist, shift: shift.slice(), country: union(framePts), plinth: union(plinthPts), box, frame };

  /* ---------- the passes ---------- */
  const quadCam = new THREE.Camera();
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const blurMat = new THREE.ShaderMaterial({ vertexShader: VERT_QUAD, fragmentShader: FRAG_BLUR, uniforms: { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  const finalMat = new THREE.ShaderMaterial({
    vertexShader: VERT_QUAD,
    fragmentShader: FRAG_FINAL,
    uniforms: {
      tMain: { value: mainRT.texture },
      tGlowA: { value: blurA2.texture },
      tGlowB: { value: blurB2.texture },
      uTexel: { value: new THREE.Vector2(1 / mainRT.width, 1 / mainRT.height) },
      uTaps: { value: aa === "ss" ? 4 : 1 },
      uGlowA: { value: 0.9 },
      uGlowB: { value: 0.7 },
      uHaloAlpha: { value: 1.0 },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
  const quad = new THREE.Mesh(quadGeo, blurMat);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }
  function blur(src, tmp, dst, spread) {
    blurMat.uniforms.tSrc.value = src.texture;
    blurMat.uniforms.uStep.value.set(spread / src.width, 0);
    pass(blurMat, tmp);
    blurMat.uniforms.tSrc.value = tmp.texture;
    blurMat.uniforms.uStep.value.set(0, spread / tmp.height);
    pass(blurMat, dst);
  }

  /* ---------- the state at t ---------- */
  const glowOnly = [];
  scene.traverse((ob) => { if (ob.userData.glowOnly) glowOnly.push(ob); });

  function pinState(t) {
    // rest: above the roof; drops in; hovers; lifts to the camera
    const rest = new THREE.Vector3(lagos.x, topY + house.height + 0.42, lagos.z);
    const inU = EASE.land(prog(t, T.pinIn[0], T.pinIn[1]));
    const bob = Math.sin(TAU * 0.9 * (t - T.pinIn[0])) * 0.025 * prog(t, T.pinIn[0], T.pinIn[1]);
    const pos = rest.clone();
    pos.y += (1 - inU) * 0.9 + bob;
    const scale0 = 0.14;
    let scale = scale0 * mix(0.55, 1, inU);
    const liftU = prog(t, T.pinLift[0], T.pinLift[1]);
    if (liftU > 0) {
      // the end: in front of the camera, on the frame point where the mark will land
      const [ex, ey, esize] = F.pinEnd;
      const ndc = new THREE.Vector3(((ex * sx) / width) * 2 - 1, 1 - ((ey * sy) / height) * 2, 0.5);
      const fpx = (height / 2) / Math.tan(fovY / 2);
      const depth = (fpx * 2 * scale0) / (esize * sy);
      // point at that distance along the ray through (ex, ey)
      ndc.unproject(camera);
      const ray = ndc.sub(camera.position).normalize();
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const end = camera.position.clone().addScaledVector(ray, depth / Math.max(0.2, ray.dot(fwd)));
      const e = EASE.whip(liftU);
      const up = rest.clone();
      up.y += 1.1;
      // a lift first, then toward the camera (quadratic path)
      const a = pos.clone().lerp(up, e);
      const b = up.clone().lerp(end, e);
      pos.copy(a.lerp(b, e));
    }
    return { pos, scale, inU, liftU };
  }

  let lastT = null;
  function apply(t) {
    setCamera(t);
    const camAz = camPose(t).az;

    /* the landing: a soft squash of the whole model */
    const sq = spring(t, T.land, { freq: 2.4, decay: 6.5 });
    const sqY = 1 - 0.1 * sq;
    const sqX = 1 + 0.012 * sq;
    model.scale.set(sqX, sqY, sqX);
    model.position.set(centre3.x * (1 - sqX), 0, centre3.z * (1 - sqX));

    /* the home */
    const uBase = EASE.land(prog(t, T.base[0], T.base[1]));
    const uWalls = EASE.land(prog(t, T.walls[0], T.walls[1]));
    const uRoof = EASE.land(prog(t, T.roof[0], T.roof[1]));
    const settle = spring(t, T.roof[0] + 0.28, { freq: 3.2, decay: 9 }) * prog(t, T.roof[0], T.roof[1]);
    house.root.visible = uBase > 0.001;
    house.root.rotation.y = camAz * 0.35 + 0.18;
    house.base.scale.set(uBase, 1, uBase);
    house.walls.scale.set(mix(0.6, 1, uWalls), Math.max(0.001, uWalls) * (1 - 0.05 * settle), mix(0.6, 1, uWalls));
    house.walls.visible = uWalls > 0.002;
    house.roof.visible = uRoof > 0.002;
    house.roof.position.y = house.roofY * (1 - 0.05 * settle) + (1 - uRoof) * 1.3;
    house.roof.scale.setScalar(mix(0.7, 1, uRoof));
    let lit = 0;
    house.winMats.forEach((m, i) => {
      const u = EASE.soft(prog(t, T.windows[0] + i * 0.07, T.windows[0] + i * 0.07 + 0.3));
      m.uniforms.uIntensity.value = 1.35 * u;
      lit += u / house.winMats.length;
    });
    house.warmHalo.material.uniforms.uIntensity.value = 0.55 * lit;
    const shadowS = HOUSE_W * 2.5 * uBase;
    houseShadow.visible = uBase > 0.001;
    houseShadow.scale.set(shadowS, shadowS, 1);
    houseShadow.position.set(lagos.x + keyDir.x * -0.09, topY + 0.003, lagos.z + keyDir.z * -0.09);
    houseShadow.material.uniforms.uOpacity.value = 0.55 * uWalls;
    houseWarm.visible = lit > 0.001;
    houseWarm.scale.set(HOUSE_W * 4.2, HOUSE_W * 4.2, 1);
    houseWarm.position.set(lagos.x, topY + 0.004, lagos.z);
    houseWarm.material.uniforms.uOpacity.value = 0.22 * lit;
    slabMat.uniforms.uWarmPos.value.set(lagos.x, topY + 0.1, lagos.z);
    slabMat.uniforms.uWarmCol.value.copy(lin("#ff8a3d")).multiplyScalar(0.05 * lit);
    slabMat.uniforms.uWarmR.value = 0.55;

    /* the routes */
    for (const r of routes) {
      const tr = t - r.start;
      const dotU = EASE.land(prog(t, r.start - 0.12, r.start + 0.16));
      r.dot.visible = r.dotHalo.visible = dotU > 0.001;
      r.dot.scale.setScalar(Math.max(0.001, dotU) * (1 + 0.25 * Math.max(0, spring(t, r.start - 0.02, { freq: 3, decay: 8 }))));
      r.dotHalo.material.uniforms.uIntensity.value = 0.55 * dotU;
      r.dot.material.uniforms.uIntensity.value = 1.1;
      const growU = EASE.glide(prog(t, r.start, r.land));
      const on = tr > 0;
      r.core.visible = r.halo.visible = on;
      for (const m of [r.core.material, r.halo.material]) {
        m.uniforms.uGrow.value = growU;
        m.uniforms.uHeadAmt.value = 2.2 * (1 - prog(t, r.land, r.land + 0.25));
        // one pulse along the finished route
        const pu = prog(t, r.land + 0.2, r.land + 0.95);
        m.uniforms.uPulse.value = pu > 0 && pu < 1 ? EASE.soft(pu) : -1;
        m.uniforms.uPulseAmt.value = 1.2 * Math.sin(Math.PI * pu);
        m.uniforms.uIntensity.value = 0.9 + 0.35 * (1 - prog(t, r.land, r.land + 0.6));
      }
      const headOn = tr > 0 && t < r.land + 0.12;
      r.head.visible = r.headHalo.visible = headOn;
      if (headOn) {
        const p = r.curve.getPointAt(growU);
        const fade = 1 - prog(t, r.land, r.land + 0.12);
        r.head.position.copy(p);
        r.headHalo.position.copy(p);
        r.head.scale.setScalar(Math.max(0.001, fade));
        r.headHalo.material.uniforms.uIntensity.value = 0.9 * fade;
      }
      // the landing ripple at the home, and a small launch ring at the origin
      const ru = prog(t, r.land, r.land + 0.9);
      r.ripple.visible = ru > 0 && ru < 1;
      if (r.ripple.visible) {
        const rad = mix(0.25, 1.35, EASE.land(ru));
        r.ripple.scale.set(rad * 2 + 0.4, rad * 2 + 0.4, 1);
        const m = r.ripple.material.uniforms;
        m.uRadius.value = rad / (rad + 0.2);
        m.uWidth.value = 0.09;
        m.uAmt.value = 0.9 * (1 - ru) * (1 - ru);
      }
      const lu = prog(t, r.start - 0.05, r.start + 0.55);
      r.launch.visible = lu > 0 && lu < 1;
      if (r.launch.visible) {
        const rad = mix(0.06, 0.45, EASE.land(lu));
        r.launch.scale.set(rad * 2 + 0.3, rad * 2 + 0.3, 1);
        const m = r.launch.material.uniforms;
        m.uRadius.value = rad / (rad + 0.15);
        m.uWidth.value = 0.12;
        m.uAmt.value = 0.55 * (1 - lu);
      }
    }
    // the sticker's landing: a soft ring around the home's spot
    const su = prog(t, T.land, T.land + 0.8);
    landRing.visible = su > 0 && su < 1;
    if (landRing.visible) {
      const rad = mix(0.2, 1.1, EASE.land(su));
      landRing.scale.set(rad * 2 + 0.3, rad * 2 + 0.3, 1);
      const m = landRing.material.uniforms;
      m.uRadius.value = rad / (rad + 0.15);
      m.uWidth.value = 0.14;
      m.uAmt.value = 0.5 * (1 - su) * (1 - su);
    }

    /* the pin */
    const ps = pinState(t);
    pin.root.visible = t >= T.pinIn[0];
    if (pin.root.visible) {
      pin.root.position.copy(ps.pos);
      pin.root.scale.setScalar(ps.scale);
      // face the camera (around the vertical axis), with a gentle sway until the lift
      const toCam = Math.atan2(camera.position.x - ps.pos.x, camera.position.z - ps.pos.z);
      pin.root.rotation.set(0, toCam + (1 - ps.liftU) * 0.25 * Math.sin(TAU * 0.6 * (t - T.pinIn[0])) * (1 - ps.inU * 0.6), 0);
      // during the lift it turns its face fully to the camera (pitch toward the eye)
      const pitch = camPose(t).pitch;
      pin.inner.rotation.x = -pitch * 0.8 * EASE.soft(ps.liftU);
      pin.mat.uniforms.uInner.value = 0.2 + 0.5 * ps.liftU;
    }
  }

  function renderAt(t) {
    apply(t);
    /* main pass */
    glowPass.value = 0;
    for (const ob of glowOnly) ob.userData.wasVisible = ob.visible;
    renderer.setRenderTarget(mainRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    /* glow pass (quarter size): only light, occluded by the model */
    glowPass.value = 1;
    const hidden = [];
    scene.traverse((ob) => {
      if (ob.isMesh && ob.material.transparent && !ob.userData.glowOnly && ob.material.fragmentShader === FRAG_DECAL && ob.visible) {
        ob.visible = false;
        hidden.push(ob);
      }
    });
    renderer.setRenderTarget(glowRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    for (const ob of hidden) ob.visible = true;
    glowPass.value = 0;
    renderer.setClearColor(0x000000, 0);
    blur(glowRT, blurA1, blurA2, 1.0);
    blur(blurA2, blurB1, blurB2, 1.0);
    blur(blurB2, blurB1, blurB2, 2.0);
    /* final: filter the model down, add the glow */
    pass(finalMat, null);
  }

  /* glow-only helpers are skipped in the main pass by their shader (discard) */

  /* ---------- labels, pin, points ---------- */
  const labelSide = {};
  {
    setCamera(SHOT * 0.5);
    const L = toScreen(new THREE.Vector3(lagos.x, topY, lagos.z));
    for (const c of CITIES) {
      if (c.city === "Lagos") {
        labelSide[c.city] = { dx: -1, dy: 0.35 };
        continue;
      }
      const an = anchors[c.city];
      const s = toScreen(new THREE.Vector3(an.x, topY, an.z));
      let dx = s.x - L.x, dy = s.y - L.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      labelSide[c.city] = { dx, dy };
    }
  }
  const labelGap = 20 * Math.min(sx, sy) * (film === "mobile" ? 1.25 : 1);

  function cityOpacity(city, t) {
    const outU = 1 - EASE.soft(prog(t, T.labelsOut[0], T.labelsOut[1]));
    if (city === "Lagos") return EASE.soft(prog(t, 1.05, 1.45)) * outU;
    const r = routes.find((x) => x.city === city);
    return EASE.land(prog(t, r.start - 0.06, r.start + 0.22)) * outU;
  }
  function cityScale(city, t) {
    if (city === "Lagos") return mix(0.9, 1, EASE.land(prog(t, 1.05, 1.5)));
    const r = routes.find((x) => x.city === city);
    return mix(0.82, 1, EASE.land(prog(t, r.start - 0.06, r.start + 0.3)));
  }

  function point(city, t) {
    setCamera(t);
    const an = anchors[city];
    if (!an) throw new Error(`map3d: no city ${city}`);
    const s = toScreen(new THREE.Vector3(an.x, topY, an.z).applyMatrix4(modelMatrixAt(t)));
    return { x: s.x, y: s.y };
  }
  function modelMatrixAt(t) {
    const sq = spring(t, T.land, { freq: 2.4, decay: 6.5 });
    const sX = 1 + 0.012 * sq, sY = 1 - 0.1 * sq;
    return new THREE.Matrix4().compose(new THREE.Vector3(centre3.x * (1 - sX), 0, centre3.z * (1 - sX)), new THREE.Quaternion(), new THREE.Vector3(sX, sY, sX));
  }

  const map = {
    film,
    width,
    height,
    renderer,
    framing,
    anchors,
    timing: {
      shot: SHOT,
      land: T.land,
      home: [T.base[0], T.windows[1]],
      routes: routes.map((r) => ({ city: r.city, start: +r.start.toFixed(3), land: +r.land.toFixed(3) })),
      pinIn: T.pinIn,
      pinLift: T.pinLift,
      labelsOut: T.labelsOut,
    },

    /** Draws the frame at t (seconds from the start of the map shot). Synchronous. */
    render(t) {
      if (t === lastT) return;
      renderAt(t);
      lastT = t;
    },

    /** HTML label positions at t: anchor (x, y) and the label's anchor fractions (ax, ay). */
    labels(t) {
      setCamera(t);
      const M = modelMatrixAt(t);
      return CITIES.map(({ city }) => {
        const an = anchors[city];
        const lift = city === "Lagos" ? house.height * 0.35 : 0.02;
        const d = toScreen(new THREE.Vector3(an.x, topY + lift, an.z).applyMatrix4(M));
        const side = labelSide[city];
        const gap = city === "Lagos" ? labelGap + HOUSE_W * 0.6 * (height / (2 * Math.tan(fovY / 2) * dist)) : labelGap;
        const x = d.x + side.dx * gap;
        const y = d.y + side.dy * gap;
        const ax = side.dx > 0.38 ? 0 : side.dx < -0.38 ? 1 : 0.5;
        const ay = side.dy > 0.38 ? 0 : side.dy < -0.38 ? 1 : 0.5;
        return { city, x, y, ax, ay, opacity: +cityOpacity(city, t).toFixed(4), scale: +cityScale(city, t).toFixed(4), dot: { x: d.x, y: d.y } };
      });
    },

    /** The Lagos pin at t: its head's centre, on-screen diameter and scale (1 at rest). */
    pin(t) {
      setCamera(t);
      const ps = pinState(t);
      const c = toScreen(ps.pos);
      const r = ps.scale * pin.radius;
      // diameter from the projected head (distance to the camera)
      const dcam = ps.pos.distanceTo(camera.position);
      const fpx = (height / 2) / Math.tan(fovY / 2);
      const size = (2 * r * fpx) / dcam;
      const rest = pinState(T.pinIn[1] + 0.2);
      const sizeRest = (2 * rest.scale * pin.radius * fpx) / rest.pos.distanceTo(new THREE.Vector3().copy(camera.position));
      const opacity = t < T.pinIn[0] ? 0 : EASE.soft(prog(t, T.pinIn[0], T.pinIn[0] + 0.12));
      return { x: c.x, y: c.y, size, scale: size / sizeRest, opacity };
    },

    /** A city's point on the slab (Lagos: where the home stands), canvas CSS px. */
    point,

    dispose() {
      renderer.dispose();
      for (const rt of [mainRT, glowRT, blurA1, blurA2, blurB1, blurB2]) rt.dispose();
      scene.traverse((ob) => {
        if (ob.isMesh) {
          ob.geometry.dispose();
          ob.material.dispose();
        }
      });
      grain.dispose();
    },
  };

  // compile every program before frame one
  renderAt(0);
  lastT = null;
  return map;
}

/* ------------------------------------------------------------------------------------ */
/* Canvas textures (made once, deterministic)                                           */
/* ------------------------------------------------------------------------------------ */

/** A radial falloff: stops are [r (0 centre .. 1 edge), value]. */
function radialTexture(size, stops) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      let v = 0;
      for (let i = 0; i + 1 < stops.length; i += 1) {
        const [r0, v0] = stops[i], [r1, v1] = stops[i + 1];
        if (r >= r0 && r <= r1) {
          const u = (r - r0) / (r1 - r0);
          v = mix(v0, v1, u * u * (3 - 2 * u));
          break;
        }
      }
      const i4 = (y * size + x) * 4;
      data[i4] = data[i4 + 1] = data[i4 + 2] = Math.round(v * 255);
      data[i4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** The slab's shadow on the plinth: its silhouette, blurred wide and pushed away from the key. */
function silhouetteShadow(outline, centre, R, keyDir) {
  const size = 256;
  const F = new Float32Array(size * size);
  const toPx = (x, y) => [((x - (centre[0] - R)) / (2 * R)) * size, ((y - (centre[1] - R)) / (2 * R)) * size];
  const P = outline.map(([x, y]) => toPx(x - keyDir.x * 0.1, y + keyDir.z * 0.1));
  const xs = [];
  for (let j = 0; j < size; j += 1) {
    const y = j + 0.5;
    xs.length = 0;
    for (let i = 0, n = P.length; i < n; i += 1) {
      const a = P[i], b = P[(i + 1) % n];
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let i = Math.max(0, Math.ceil(xs[k] - 0.5)); i <= Math.min(size - 1, Math.floor(xs[k + 1] - 0.5)); i += 1) F[j * size + i] = 1;
    }
  }
  const tmp = new Float32Array(size * size);
  const r = 3;
  const w = 2 * r + 1;
  for (let pass = 0; pass < 3; pass += 1) {
    for (let j = 0; j < size; j += 1) {
      let acc = 0;
      for (let i = -r; i <= r; i += 1) acc += F[j * size + Math.min(size - 1, Math.max(0, i))];
      for (let i = 0; i < size; i += 1) {
        tmp[j * size + i] = acc / w;
        acc += F[j * size + Math.min(size - 1, i + r + 1)] - F[j * size + Math.max(0, i - r)];
      }
    }
    for (let i = 0; i < size; i += 1) {
      let acc = 0;
      for (let j = -r; j <= r; j += 1) acc += tmp[Math.min(size - 1, Math.max(0, j)) * size + i];
      for (let j = 0; j < size; j += 1) {
        F[j * size + i] = acc / w;
        acc += tmp[Math.min(size - 1, j + r + 1) * size + i] - tmp[Math.max(0, j - r) * size + i];
      }
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const v = Math.round(Math.min(1, F[i] * 1.1) * 255);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
