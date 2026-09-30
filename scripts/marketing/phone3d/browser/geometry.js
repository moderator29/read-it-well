// Geometry helpers for the phone models (runs in the browser, three.js r186).
//
// Everything is built from ONE master outline per model: a rounded rectangle with
// continuous-curvature ("squircle") corners. Every other outline (glass edge, black
// border, display, ...) is a true inward offset of that master outline, so all rings stay
// perfectly concentric and share vertex positions exactly (no gaps, no z-fighting).
//
// Units are millimetres. Outline samples are CCW when seen from +Z (the screen side).

import * as THREE from '/node_modules/three/build/three.module.js';

/**
 * Rounded rectangle whose corners are superellipse quarters |x|^n + |y|^n = 1.
 * n = 2 gives circular corners (and a stadium when extent = min(w, h) / 2);
 * n ≈ 3.4 with extent ≈ 1.6 × radius approximates iOS-style continuous corners.
 *
 * breaks: [{ edge: 'left'|'right'|'top'|'bottom', from, to, tag }] — inserts sample points
 * on straight edges so a segment range can use another material (antenna lines).
 * Coordinates: y for left/right edges, x for top/bottom edges.
 *
 * Returns { x, y, nx, ny, tag, s } typed arrays (tag = material tag of the segment that
 * starts at sample i, s = cumulative arc length).
 */
export function roundedRectOutline(w, h, extent, n = 2, cornerSegs = 40, breaks = []) {
  const a = w / 2;
  const b = h / 2;
  const E = Math.min(extent, a, b);
  const pts = []; // [x, y, nx, ny, tag]

  const corner = (sx, sy, th0, th1) => {
    const cx = sx * (a - E);
    const cy = sy * (b - E);
    for (let k = 0; k <= cornerSegs; k++) {
      const t = k / cornerSegs;
      const th = th0 + (th1 - th0) * t;
      const c = Math.max(0, Math.cos(th));
      const s = Math.max(0, Math.sin(th));
      const X = E * Math.pow(c, 2 / n);
      const Y = E * Math.pow(s, 2 / n);
      let gx = Math.pow(X / E, n - 1);
      let gy = Math.pow(Y / E, n - 1);
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl;
      gy /= gl;
      pts.push([cx + sx * X, cy + sy * Y, sx * gx, sy * gy, 0, 'c']);
    }
  };

  const edge = (name, x0, y0, x1, y1, nx, ny) => {
    const horizontal = Math.abs(y1 - y0) < 1e-9;
    const c0 = horizontal ? x0 : y0;
    const c1 = horizontal ? x1 : y1;
    const len = Math.abs(c1 - c0);
    if (len < 1e-6) return; // degenerate (stadium ends)
    const dir = Math.sign(c1 - c0);
    const mine = breaks.filter((br) => br.edge === name);
    const cuts = new Set();
    for (const br of mine) {
      for (const v of [br.from, br.to]) {
        if ((v - c0) * dir > 1e-6 && (c1 - v) * dir > 1e-6) cuts.add(v);
      }
    }
    const coords = [...cuts].sort((p, q) => (p - q) * dir);
    // interior samples only (the corner samples provide the edge endpoints)
    for (const v of coords) {
      const x = horizontal ? v : x0;
      const y = horizontal ? y0 : v;
      pts.push([x, y, nx, ny, 0, 'e']);
    }
  };

  // CCW starting at the bottom-left end of the bottom edge
  corner(-1, -1, 0, Math.PI / 2); // bottom-left: (-a, -b+E) -> (-a+E, -b)
  edge('bottom', -a + E, -b, a - E, -b, 0, -1);
  corner(1, -1, Math.PI / 2, 0); // bottom-right: (a-E, -b) -> (a, -b+E)
  edge('right', a, -b + E, a, b - E, 1, 0);
  corner(1, 1, 0, Math.PI / 2); // top-right: (a, b-E) -> (a-E, b)
  edge('top', a - E, b, -a + E, b, 0, 1);
  corner(-1, 1, Math.PI / 2, 0); // top-left: (-a+E, b) -> (-a, b-E)
  edge('left', -a, b - E, -a, -b + E, -1, 0);

  // drop consecutive duplicates (corner end == next corner start when an edge is empty)
  const clean = [];
  for (const p of pts) {
    const q = clean[clean.length - 1];
    if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-7) continue;
    clean.push(p);
  }
  const f = clean[0];
  const l = clean[clean.length - 1];
  if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-7) clean.pop();

  const N = clean.length;
  const out = {
    x: new Float64Array(N),
    y: new Float64Array(N),
    nx: new Float64Array(N),
    ny: new Float64Array(N),
    tag: new Uint8Array(N),
    s: new Float64Array(N),
    n: N,
  };
  for (let i = 0; i < N; i++) {
    const [x, y, nx, ny] = clean[i];
    out.x[i] = x;
    out.y[i] = y;
    out.nx[i] = nx;
    out.ny[i] = ny;
    if (i > 0) out.s[i] = out.s[i - 1] + Math.hypot(x - out.x[i - 1], y - out.y[i - 1]);
  }
  // segment tags: a segment belongs to a break if its midpoint lies inside it
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const mx = (out.x[i] + out.x[j]) / 2;
    const my = (out.y[i] + out.y[j]) / 2;
    for (const br of breaks) {
      const lo = Math.min(br.from, br.to);
      const hi = Math.max(br.from, br.to);
      let on = false;
      if (br.edge === 'left') on = Math.abs(mx + a) < 1e-6 && my > lo && my < hi;
      if (br.edge === 'right') on = Math.abs(mx - a) < 1e-6 && my > lo && my < hi;
      if (br.edge === 'top') on = Math.abs(my - b) < 1e-6 && mx > lo && mx < hi;
      if (br.edge === 'bottom') on = Math.abs(my + b) < 1e-6 && mx > lo && mx < hi;
      if (on) out.tag[i] = br.tag;
    }
  }
  return out;
}

/** Point i of an outline offset inward by u (positive u = towards the centre). */
export function offsetPoint(ol, i, u) {
  return [ol.x[i] - u * ol.nx[i], ol.y[i] - u * ol.ny[i]];
}

/**
 * Outward normal (nu, nz) of a profile segment p0 -> p1. Profiles must be traversed with
 * the solid on the RIGHT-hand side in the (outward, z) plane, where outward = -u. E.g. a
 * band goes front-inner -> outside -> back-inner; a boss goes top -> base; a hole wall goes
 * bottom -> rim.
 */
export function segNormal(p0, p1) {
  const du = p1.u - p0.u;
  const dz = p1.z - p0.z;
  const L = Math.hypot(du, dz) || 1;
  return [-dz / L, -du / L];
}

/**
 * Profile helper: builds a polyline in (u, z) space with smooth normals from a list of
 * commands. Normal convention: (nu, nz) where nu is the OUTWARD component (along the
 * outline normal) and nz the +Z component.
 *   { line: [u, z] }                    straight segment to (u, z)
 *   { arc: { cu, cz, r, a0, a1, segs } } arc around (cu, cz); angle a measured with
 *                                        a = 0 → pointing outward (-u), a = 90° → +z
 */
export function buildProfile(start, cmds) {
  const pts = [{ u: start[0], z: start[1] }];
  for (const c of cmds) {
    if (c.line) {
      const [u, z] = c.line;
      const segs = c.segs || 1;
      const p0 = pts[pts.length - 1];
      for (let k = 1; k <= segs; k++) {
        const t = k / segs;
        pts.push({ u: p0.u + (u - p0.u) * t, z: p0.z + (z - p0.z) * t });
      }
    } else if (c.arc) {
      const { cu, cz, r, a0, a1, segs = 12 } = c.arc;
      for (let k = 1; k <= segs; k++) {
        const a = ((a0 + (a1 - a0) * (k / segs)) * Math.PI) / 180;
        pts.push({ u: cu - r * Math.cos(a), z: cz + r * Math.sin(a), arcN: [Math.cos(a), Math.sin(a)] });
      }
      // also tag the arc start point with its exact normal
      const a = (a0 * Math.PI) / 180;
      const startIdx = pts.length - segs - 1;
      if (!pts[startIdx].arcN) pts[startIdx].arcN0 = [Math.cos(a), Math.sin(a)];
    }
  }
  // normals: exact on arcs, from segment directions elsewhere (averaged at joints)
  const M = pts.length;
  for (let j = 0; j < M; j++) {
    const p = pts[j];
    if (p.arcN) {
      p.nu = p.arcN[0];
      p.nz = p.arcN[1];
      continue;
    }
    const segN = (i0, i1) => segNormal(pts[i0], pts[i1]);
    let n0 = null;
    let n1 = null;
    if (j > 0) n0 = segN(j - 1, j);
    if (j < M - 1) n1 = segN(j, j + 1);
    let nn;
    if (p.arcN0) nn = p.arcN0;
    else if (n0 && n1) nn = [n0[0] + n1[0], n0[1] + n1[1]];
    else nn = n0 || n1;
    const L = Math.hypot(nn[0], nn[1]) || 1;
    p.nu = nn[0] / L;
    p.nz = nn[1] / L;
  }
  // arc length for v coordinates
  let acc = 0;
  for (let j = 0; j < M; j++) {
    if (j > 0) acc += Math.hypot(pts[j].u - pts[j - 1].u, pts[j].z - pts[j - 1].z);
    pts[j].v = acc;
  }
  return pts;
}

/**
 * Sweep a (u, z) profile along a closed outline. Produces a BufferGeometry with position,
 * normal, uv (u = arc length along outline, v = arc length along profile) and tangent.
 * Groups: one per distinct segment tag (materialIndex = tag).
 * `hard` lists profile indices where the profile has a crease (vertex is duplicated with
 * the two one-sided normals).
 */
export function sweepGeometry(ol, profile, opts = {}) {
  const N = ol.n;
  const prof = expandCreases(profile, opts.hard || []);
  const M = prof.length;
  const pos = new Float32Array(N * M * 3);
  const nor = new Float32Array(N * M * 3);
  const uv = new Float32Array(N * M * 2);
  const tan = new Float32Array(N * M * 4);
  const total = ol.s[N - 1] + Math.hypot(ol.x[0] - ol.x[N - 1], ol.y[0] - ol.y[N - 1]);
  for (let i = 0; i < N; i++) {
    // tangent along the outline (CCW)
    const ip = (i - 1 + N) % N;
    const inx = (i + 1) % N;
    let tx = ol.x[inx] - ol.x[ip];
    let ty = ol.y[inx] - ol.y[ip];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    for (let j = 0; j < M; j++) {
      const p = prof[j];
      const k = i * M + j;
      pos[k * 3] = ol.x[i] - p.u * ol.nx[i];
      pos[k * 3 + 1] = ol.y[i] - p.u * ol.ny[i];
      pos[k * 3 + 2] = p.z;
      nor[k * 3] = p.nu * ol.nx[i];
      nor[k * 3 + 1] = p.nu * ol.ny[i];
      nor[k * 3 + 2] = p.nz;
      uv[k * 2] = ol.s[i] / total;
      uv[k * 2 + 1] = p.v;
      tan[k * 4] = tx;
      tan[k * 4 + 1] = ty;
      tan[k * 4 + 2] = 0;
      tan[k * 4 + 3] = 1;
    }
  }
  const byTag = new Map();
  for (let i = 0; i < N; i++) {
    const i1 = (i + 1) % N;
    const t = ol.tag[i];
    if (!byTag.has(t)) byTag.set(t, []);
    const arr = byTag.get(t);
    for (let j = 0; j < M - 1; j++) {
      if (prof[j].creaseSkip) continue; // zero-area quad between duplicated crease vertices
      const a = i * M + j;
      const b = i1 * M + j;
      const c = i1 * M + j + 1;
      const d = i * M + j + 1;
      arr.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('tangent', new THREE.BufferAttribute(tan, 4));
  const index = [];
  const tags = [...byTag.keys()].sort((p, q) => p - q);
  for (const t of tags) {
    const arr = byTag.get(t);
    geo.addGroup(index.length, arr.length, t);
    for (const v of arr) index.push(v);
  }
  geo.setIndex(index);
  orientOutward(geo);
  return geo;
}

function expandCreases(profile, hard) {
  if (!hard.length) return profile;
  const out = [];
  for (let j = 0; j < profile.length; j++) {
    const p = profile[j];
    if (!hard.includes(j) || j === 0 || j === profile.length - 1) {
      out.push(p);
      continue;
    }
    // one-sided normals from the adjacent segments
    const n0 = segNormal(profile[j - 1], p);
    const n1 = segNormal(p, profile[j + 1]);
    out.push({ ...p, nu: n0[0], nz: n0[1], creaseSkip: true });
    out.push({ ...p, nu: n1[0], nz: n1[1] });
  }
  return out;
}

/** Flip the index winding if the triangles face against their vertex normals. */
export function orientOutward(geo) {
  const idx = geo.index.array;
  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  let score = 0;
  const step = Math.max(3, Math.floor(idx.length / 3 / 200) * 3);
  for (let t = 0; t < idx.length; t += step) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const ux = pos[b * 3] - pos[a * 3];
    const uy = pos[b * 3 + 1] - pos[a * 3 + 1];
    const uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3];
    const vy = pos[c * 3 + 1] - pos[a * 3 + 1];
    const vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    const nx = nor[a * 3] + nor[b * 3] + nor[c * 3];
    const ny = nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1];
    const nz = nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2];
    score += Math.sign(cx * nx + cy * ny + cz * nz);
  }
  if (score < 0) {
    const arr = geo.index.array;
    for (let t = 0; t < arr.length; t += 3) {
      const tmp = arr[t + 1];
      arr[t + 1] = arr[t + 2];
      arr[t + 2] = tmp;
    }
    geo.index.needsUpdate = true;
  }
  return geo;
}

/**
 * Flat cap filling an inward offset u of the outline at height z (normal ±Z).
 * uvRect = [x0, y0, x1, y1] maps positions linearly to UV (for the display).
 */
export function capGeometry(ol, u, z, facing = 1, uvRect = null) {
  const N = ol.n;
  const pos = new Float32Array((N + 1) * 3);
  const nor = new Float32Array((N + 1) * 3);
  const uv = new Float32Array((N + 1) * 2);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < N; i++) {
    const [x, y] = offsetPoint(ol, i, u);
    pos[(i + 1) * 3] = x;
    pos[(i + 1) * 3 + 1] = y;
    pos[(i + 1) * 3 + 2] = z;
    cx += x;
    cy += y;
  }
  pos[0] = cx / N;
  pos[1] = cy / N;
  pos[2] = z;
  for (let i = 0; i <= N; i++) {
    nor[i * 3 + 2] = facing;
    if (uvRect) {
      const [x0, y0, x1, y1] = uvRect;
      uv[i * 2] = (pos[i * 3] - x0) / (x1 - x0);
      uv[i * 2 + 1] = (pos[i * 3 + 1] - y0) / (y1 - y0);
    }
  }
  const index = [];
  for (let i = 0; i < N; i++) {
    const a = i + 1;
    const b = ((i + 1) % N) + 1;
    if (facing > 0) index.push(0, a, b);
    else index.push(0, b, a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

/** Flat ring between two inward offsets (uOuter < uInner) at height z. */
export function ringGeometry(ol, uOuter, uInner, z, facing = 1) {
  const N = ol.n;
  const pos = new Float32Array(N * 2 * 3);
  const nor = new Float32Array(N * 2 * 3);
  const uv = new Float32Array(N * 2 * 2);
  for (let i = 0; i < N; i++) {
    const [xo, yo] = offsetPoint(ol, i, uOuter);
    const [xi, yi] = offsetPoint(ol, i, uInner);
    pos.set([xo, yo, z, xi, yi, z], i * 6);
    nor.set([0, 0, facing, 0, 0, facing], i * 6);
    uv.set([i / N, 0, i / N, 1], i * 4);
  }
  const index = [];
  for (let i = 0; i < N; i++) {
    const i1 = (i + 1) % N;
    const o0 = i * 2;
    const n0 = i * 2 + 1;
    const o1 = i1 * 2;
    const n1 = i1 * 2 + 1;
    if (facing > 0) index.push(o0, o1, n1, o0, n1, n0);
    else index.push(o0, n1, o1, o0, n0, n1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

/**
 * Place a geometry built in a local frame (s, t in the outline plane, +Z = outward) onto
 * a face of the phone. sDir/tDir/outDir are world axes; the frame is made right-handed.
 */
export function placeLocal(geo, origin, sDir, tDir, outDir) {
  const s = new THREE.Vector3(...sDir);
  const t = new THREE.Vector3(...tDir);
  const o = new THREE.Vector3(...outDir);
  const det = s.dot(new THREE.Vector3().crossVectors(t, o));
  if (det < 0) s.negate();
  const m = new THREE.Matrix4().makeBasis(s, t, o);
  m.setPosition(new THREE.Vector3(...origin));
  geo.applyMatrix4(m);
  return geo;
}

/** A pill/stadium button (or any rounded-rect boss) protruding `height` along +Z. */
export function buttonGeometry(len, thick, height, edgeR, opts = {}) {
  const ol = roundedRectOutline(len, thick, (opts.cornerExtent ?? thick / 2), opts.n ?? 2, opts.segs ?? 20);
  const r = Math.min(edgeR, height * 0.9, thick * 0.45);
  const base = opts.base ?? -0.25; // embed into the band so no gap shows on curved parts
  // traversed top -> base so the solid stays on the right (outward normals)
  const profile = buildProfile([r, height], [
    { arc: { cu: r, cz: height - r, r, a0: 90, a1: 0, segs: opts.arcSegs ?? 8 } },
    { line: [0, base] },
  ]);
  const side = sweepGeometry(ol, profile);
  const cap = capGeometry(ol, r, height, 1);
  return { side, cap, outline: ol };
}

/** Merge several non-indexed/indexed geometries that share the same attributes. */
export function mergeSimple(geos) {
  const attrs = ['position', 'normal', 'uv'];
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  const arrays = {};
  for (const a of attrs) arrays[a] = new Float32Array(vCount * (a === 'uv' ? 2 : 3));
  const index = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    for (const a of attrs) {
      const src = g.attributes[a];
      const size = a === 'uv' ? 2 : 3;
      if (src) arrays[a].set(src.array.subarray(0, src.count * size), vo * size);
    }
    if (g.index) {
      for (let k = 0; k < g.index.count; k++) index[io + k] = g.index.array[k] + vo;
      io += g.index.count;
    } else {
      for (let k = 0; k < g.attributes.position.count; k++) index[io + k] = vo + k;
      io += g.attributes.position.count;
    }
    vo += g.attributes.position.count;
  }
  for (const a of attrs) out.setAttribute(a, new THREE.BufferAttribute(arrays[a], a === 'uv' ? 2 : 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}
