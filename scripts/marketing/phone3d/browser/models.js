// Phone model definitions + builder. Generic geometry only (no brand artwork or logos).
// Units: millimetres. Phone-local frame: +X right, +Y up (top of the phone), +Z out of the
// screen. The origin is the centre of the body.

import * as THREE from '/node_modules/three/build/three.module.js';
import {
  roundedRectOutline,
  buildProfile,
  sweepGeometry,
  capGeometry,
  ringGeometry,
  placeLocal,
  buttonGeometry,
  mergeSimple,
} from './geometry.js';

export const SCREEN_ASPECT = 1320 / 2868; // the supplied screen images (full display)

// ---------------------------------------------------------------------------------------
// Model specs
// ---------------------------------------------------------------------------------------

function islandSpec() {
  const W = 77.6;
  const H = 163.0;
  return {
    name: 'island',
    width: W,
    height: H,
    thickness: 8.25,
    // continuous-curvature corner: nominal radius r, superellipse exponent n, extent = k·r
    corner: { radius: 12.6, n: 3.4, k: 1.6 },
    band: {
      frontRim: 0.78, // band visible from the front (u where the cover glass starts)
      chamferF: 0.62, // radius of the rounded front edge of the band
      chamferB: 0.62,
      backRim: 1.0,
      frontDrop: 0.24, // band front rim sits this far below the glass top
      backDrop: 0.12,
    },
    glassEdge: 0.22, // 2.5D radius of the cover-glass edge
    displayInset: 2.35, // outer edge -> active display (band + ~1.6 mm black border)
    cutout: { type: 'pill', widthFrac: 0.285, heightFrac: 0.084, topFrac: 0.026 },
    buttonThick: 2.55,
    buttons: [
      // `at` = centre as a fraction of the height measured from the top
      { side: 'left', at: 0.215, length: 6.6, height: 0.55 }, // small upper button
      { side: 'left', at: 0.300, length: 10.4, height: 0.55 }, // volume up
      { side: 'left', at: 0.383, length: 10.4, height: 0.55 }, // volume down
      { side: 'right', at: 0.343, length: 17.2, height: 0.55 }, // power
      { side: 'right', at: 0.605, length: 11.2, height: 0.07, flush: true, thick: 2.35 }, // flush lower button
    ],
    antennaWidth: 0.85,
    antenna: [
      { edge: 'left', at: H / 2 - 21.2 },
      { edge: 'left', at: -H / 2 + 21.2 },
      { edge: 'right', at: H / 2 - 21.2 },
      { edge: 'right', at: -H / 2 + 21.2 },
      { edge: 'top', at: W / 2 - 20.8 },
      { edge: 'bottom', at: -W / 2 + 20.9 },
      { edge: 'bottom', at: W / 2 - 20.9 },
    ],
    bottom: {
      port: { w: 8.7, h: 2.95, depth: 1.6, bevel: 0.22, tongue: true },
      holes: [
        ...[0, 1, 2, 3, 4].map((k) => ({ x: -8.4 - k * 1.78, d: 1.05 })),
        ...[0, 1, 2, 3, 4].map((k) => ({ x: 8.4 + k * 1.78, d: 1.05 })),
      ],
    },
    top: { holes: [] },
  };
}

function androidSpec() {
  const W = 76.0;
  const inset = 1.95; // thin, even bezels
  const dispW = W - 2 * inset;
  const H = +(dispW / SCREEN_ASPECT + 2 * inset).toFixed(2); // ≈ 160.6 mm for 1320×2868
  return {
    name: 'android',
    width: W,
    height: H,
    thickness: 8.2,
    corner: { radius: 10.6, n: 2.9, k: 1.45 },
    band: {
      frontRim: 0.55,
      chamferF: 0.36,
      chamferB: 0.36,
      backRim: 0.72,
      frontDrop: 0.16,
      backDrop: 0.1,
    },
    glassEdge: 0.14,
    displayInset: inset,
    cutout: { type: 'hole', diameter: 3.05, centerFromTop: 2.6 },
    buttonThick: 2.35,
    buttons: [
      { side: 'right', at: 0.292, length: 22.5, height: 0.5 }, // volume rocker
      { side: 'right', at: 0.447, length: 11.0, height: 0.5 }, // power
    ],
    antennaWidth: 0.9,
    antenna: [
      { edge: 'left', at: H / 2 - 17.5 },
      { edge: 'left', at: -H / 2 + 17.5 },
      { edge: 'right', at: H / 2 - 17.5 },
      { edge: 'right', at: -H / 2 + 17.5 },
      { edge: 'top', at: -W / 2 + 17.0 },
      { edge: 'bottom', at: W / 2 - 17.0 },
    ],
    bottom: {
      port: { w: 8.5, h: 2.8, depth: 1.6, bevel: 0.2, tongue: true },
      holes: [
        ...[0, 1, 2, 3, 4, 5].map((k) => ({ x: 7.6 + k * 1.55, d: 0.95 })),
        { x: -7.6, d: 0.9 },
      ],
      simTray: { x: -14.2, w: 11.2, h: 2.3 },
    },
    top: { holes: [{ x: 9.5, d: 0.9 }] },
  };
}

export const MODELS = { island: islandSpec(), android: androidSpec() };

// ---------------------------------------------------------------------------------------
// Colour variants (metal colour = specular F0 of the frame)
// ---------------------------------------------------------------------------------------

export const COLORS = {
  'black-titanium': {
    band: '#4a4a4e', roughness: 0.3, antenna: '#2a2a2d', back: '#2e2e31', flush: '#1c1c1f',
  },
  'natural-titanium': {
    band: '#c2bcb2', roughness: 0.3, antenna: '#9a958d', back: '#c8c3ba', flush: '#6d6a66',
  },
  blue: {
    band: '#35456a', roughness: 0.3, antenna: '#2a3550', back: '#2f3b57', flush: '#1d2437',
  },
  silver: {
    band: '#bfc2c6', roughness: 0.27, antenna: '#b3b6ba', back: '#e3e4e6', flush: '#9fa2a7',
  },
};

// frame finish per model (the android frame is satin aluminium)
const FINISH = {
  island: { roughAdd: 0.0 },
  android: { roughAdd: 0.06 },
};

// ---------------------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------------------

const STENCIL_HOLE = 1;

function metalMaterial(color, roughness, opts = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 1,
    roughness,
    envMapIntensity: 1,
    ...opts,
  });
  return m;
}

function stencilOutside(m) {
  m.stencilWrite = true;
  m.stencilRef = STENCIL_HOLE;
  m.stencilFunc = THREE.NotEqualStencilFunc;
  m.stencilFail = THREE.KeepStencilOp;
  m.stencilZFail = THREE.KeepStencilOp;
  m.stencilZPass = THREE.KeepStencilOp;
  m.stencilWriteMask = 0x00;
  return m;
}

function stencilInside(m) {
  m.stencilWrite = true;
  m.stencilRef = STENCIL_HOLE;
  m.stencilFunc = THREE.EqualStencilFunc;
  m.stencilFail = THREE.KeepStencilOp;
  m.stencilZFail = THREE.KeepStencilOp;
  m.stencilZPass = THREE.KeepStencilOp;
  m.stencilWriteMask = 0x00;
  return m;
}

export function makeMaterials(modelName, colorName, shared) {
  const c = COLORS[colorName];
  if (!c) throw new Error(`Unknown color '${colorName}'. Use one of: ${Object.keys(COLORS).join(', ')}`);
  const fin = FINISH[modelName];
  const rough = Math.min(0.9, c.roughness + fin.roughAdd);
  const metal = stencilOutside(metalMaterial(c.band, rough));
  const antenna = stencilOutside(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(c.antenna),
      metalness: 0.0,
      roughness: 0.42,
      clearcoat: 0.4,
      clearcoatRoughness: 0.35,
    }),
  );
  const metalInHole = stencilInside(metalMaterial(c.band, rough));
  const holeWall = stencilInside(
    new THREE.MeshStandardMaterial({ color: 0x151517, metalness: 0.7, roughness: 0.55 }),
  );
  const holeBottom = stencilInside(new THREE.MeshBasicMaterial({ color: 0x030304 }));
  const tongue = stencilInside(
    new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.2, roughness: 0.6 }),
  );
  const holeMask = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  holeMask.stencilWrite = true;
  holeMask.stencilRef = STENCIL_HOLE;
  holeMask.stencilFunc = THREE.AlwaysStencilFunc;
  holeMask.stencilZPass = THREE.ReplaceStencilOp;
  holeMask.stencilWriteMask = 0xff;

  const blackGlass = new THREE.MeshPhysicalMaterial({
    color: 0x010102,
    metalness: 0,
    roughness: 0.07,
    envMapIntensity: 0.55,
    specularIntensity: 1,
  });
  const backGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(c.back),
    metalness: 0,
    roughness: 0.55,
  });
  const flushCap = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(c.flush),
    metalness: 0.2,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const decal = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.55,
    roughness: 0.6,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return {
    metal,
    antenna,
    metalInHole,
    holeWall,
    holeBottom,
    tongue,
    holeMask,
    blackGlass,
    backGlass,
    flushCap,
    decal,
    cutout: shared.cutout,
    lens: shared.lens,
    screen: shared.screen,
  };
}

// ---------------------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------------------

function mesh(geo, mat, name, order = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.renderOrder = order;
  m.frustumCulled = false;
  return m;
}

export function buildPhone(modelName, colorName, shared) {
  const spec = MODELS[modelName];
  if (!spec) throw new Error(`Unknown model '${modelName}'. Use 'island' or 'android'.`);
  const mats = makeMaterials(modelName, colorName, shared);
  const group = new THREE.Group();
  group.name = `phone-${modelName}-${colorName}`;
  // small parts are batched into one merged mesh per (material, renderOrder): SwiftShader
  // has a noticeable per-draw-call cost
  const batches = new Map();
  const addPart = (geo, mat, name, order = 0) => {
    const key = `${mat.uuid}|${order}`;
    if (!batches.has(key)) batches.set(key, { mat, name, order, geos: [] });
    batches.get(key).geos.push(geo);
  };

  const W = spec.width;
  const H = spec.height;
  const T = spec.thickness;
  const a = W / 2;
  const b = H / 2;
  const bd = spec.band;
  const zTop = T / 2;
  const zF = zTop - bd.frontDrop;
  const zB = -T / 2 + bd.backDrop;
  const E = spec.corner.radius * spec.corner.k;

  // antenna breaks along the straight edges
  const aw = spec.antennaWidth / 2;
  const breaks = spec.antenna.map((an) => ({ edge: an.edge, from: an.at - aw, to: an.at + aw, tag: 1 }));
  const outline = roundedRectOutline(W, H, E, spec.corner.n, 48, breaks);

  // --- band (metal frame) -------------------------------------------------------------
  const rF = bd.chamferF;
  const rB = bd.chamferB;
  const bandProfile = buildProfile([bd.frontRim, zF], [
    { line: [rF, zF] },
    { arc: { cu: rF, cz: zF - rF, r: rF, a0: 90, a1: 0, segs: 14 } },
    { line: [0, zB + rB], segs: 1 },
    { arc: { cu: rB, cz: zB + rB, r: rB, a0: 0, a1: -90, segs: 14 } },
    { line: [bd.backRim, zB] },
  ]);
  const bandGeo = sweepGeometry(outline, bandProfile);
  const band = mesh(bandGeo, [mats.metal, mats.antenna], 'band');
  group.add(band);

  // --- back glass -------------------------------------------------------------------------
  group.add(mesh(capGeometry(outline, bd.backRim, zB, -1), mats.backGlass, 'back'));

  // --- cover glass edge (2.5D), black border, display ---------------------------------------
  const ge = spec.glassEdge;
  const glassEdgeProfile = buildProfile([bd.frontRim + ge, zTop], [
    { arc: { cu: bd.frontRim + ge, cz: zTop - ge, r: ge, a0: 90, a1: 0, segs: 8 } },
    { line: [bd.frontRim, zF] },
  ]);
  group.add(mesh(sweepGeometry(outline, glassEdgeProfile), mats.blackGlass, 'glass-edge'));
  const inset = spec.displayInset;
  group.add(mesh(ringGeometry(outline, bd.frontRim + ge, inset, zTop, 1), mats.blackGlass, 'black-border'));

  const disp = { x0: -a + inset, y0: -b + inset, x1: a - inset, y1: b - inset, z: zTop };
  const dispGeo = capGeometry(outline, inset, zTop, 1, [disp.x0, disp.y0, disp.x1, disp.y1]);
  const display = mesh(dispGeo, mats.screen, 'display', 1);
  group.add(display);

  // --- display cut-out ---------------------------------------------------------------------
  const dw = disp.x1 - disp.x0;
  let cutoutInfo;
  if (spec.cutout.type === 'pill') {
    const pw = spec.cutout.widthFrac * dw;
    const ph = spec.cutout.heightFrac * dw;
    const cy = disp.y1 - spec.cutout.topFrac * dw - ph / 2;
    cutoutInfo = { type: 'pill', cx: 0, cy, w: pw, h: ph, lensX: pw / 2 - ph / 2, lensD: ph * 0.44 };
    const pill = roundedRectOutline(pw, ph, ph / 2, 2, 24);
    const pillGeo = capGeometry(pill, 0, zTop + 0.006, 1);
    pillGeo.translate(0, cy, 0);
    group.add(mesh(pillGeo, mats.cutout, 'cutout', 2));
    const lensD = ph * 0.44;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(lensD / 2, 48).translate(pw / 2 - ph / 2, cy, zTop + 0.012), mats.lens);
    lens.renderOrder = 3;
    lens.frustumCulled = false;
    lens.name = 'lens';
    group.add(lens);
  } else {
    const d = spec.cutout.diameter;
    const cy = disp.y1 - spec.cutout.centerFromTop;
    cutoutInfo = { type: 'hole', cx: 0, cy, d };
    const hole = new THREE.Mesh(new THREE.CircleGeometry(d / 2, 64).translate(0, cy, zTop + 0.008), mats.lens);
    hole.renderOrder = 3;
    hole.frustumCulled = false;
    hole.name = 'punch-hole';
    group.add(hole);
  }

  // --- side buttons ------------------------------------------------------------------------
  const zMid = (zF - rF + zB + rB) / 2;
  const hullExtra = [];
  for (const btn of spec.buttons) {
    const thick = btn.thick ?? spec.buttonThick;
    const yc = b - btn.at * H;
    const out = btn.side === 'left' ? [-1, 0, 0] : [1, 0, 0];
    const origin = [btn.side === 'left' ? -a : a, yc, zMid];
    if (btn.flush) {
      // flush control: thin metal ring with a glossy sapphire-like centre
      const ring = buttonGeometry(btn.length, thick, btn.height, 0.05, { segs: 24 });
      placeLocal(ring.side, origin, [0, 1, 0], [0, 0, 1], out);
      placeLocal(ring.cap, origin, [0, 1, 0], [0, 0, 1], out);
      addPart(ring.side, mats.metal, 'flush-ring');
      addPart(ring.cap, mats.metal, 'flush-ring-cap');
      const inner = buttonGeometry(btn.length - 0.7, thick - 0.7, btn.height + 0.02, 0.1, { segs: 24 });
      placeLocal(inner.side, origin, [0, 1, 0], [0, 0, 1], out);
      placeLocal(inner.cap, origin, [0, 1, 0], [0, 0, 1], out);
      addPart(inner.side, mats.flushCap, 'flush-inner');
      addPart(inner.cap, mats.flushCap, 'flush-cap');
    } else {
      const g = buttonGeometry(btn.length, thick, btn.height, Math.min(0.32, btn.height * 0.6), { segs: 28, arcSegs: 8 });
      placeLocal(g.side, origin, [0, 1, 0], [0, 0, 1], out);
      placeLocal(g.cap, origin, [0, 1, 0], [0, 0, 1], out);
      addPart(g.side, mats.metal, 'button');
      addPart(g.cap, mats.metal, 'button-cap');
    }
    const sx = out[0];
    for (const dy of [-btn.length / 2, btn.length / 2]) {
      for (const dz of [-thick / 2, thick / 2]) hullExtra.push([origin[0] + sx * btn.height, yc + dy, zMid + dz]);
    }
  }

  // --- holes (port, speakers, mics): stencil-cut into the frame ---------------------------
  const faceFrame = (face) =>
    face === 'bottom'
      ? { origin: (x) => [x, -b, zMid], s: [1, 0, 0], t: [0, 0, 1], out: [0, -1, 0] }
      : { origin: (x) => [x, b, zMid], s: [1, 0, 0], t: [0, 0, 1], out: [0, 1, 0] };

  const addHole = (face, x, w, h, depth, bevel, extras = {}) => {
    const fr = faceFrame(face);
    const ol = roundedRectOutline(w, h, Math.min(w, h) / 2, 2, 20);
    const place = (g) => placeLocal(g, fr.origin(x), fr.s, fr.t, fr.out);
    const mask = place(capGeometry(ol, -bevel, 0.0, 1));
    addPart(mask, mats.holeMask, 'hole-mask', -10);
    const bevelGeo = place(sweepGeometry(ol, buildProfile([0, -bevel * 0.9], [{ line: [-bevel, 0] }])));
    addPart(bevelGeo, mats.metalInHole, 'hole-bevel', 1);
    const wallGeo = place(sweepGeometry(ol, buildProfile([0, -depth], [{ line: [0, -bevel * 0.9] }])));
    addPart(wallGeo, mats.holeWall, 'hole-wall', 1);
    const bottomGeo = place(capGeometry(ol, 0, -depth, 1));
    addPart(bottomGeo, mats.holeBottom, 'hole-bottom', 1);
    if (extras.tongue) {
      const tl = roundedRectOutline(w * 0.74, h * 0.26, h * 0.13, 2, 10);
      const tg = place(capGeometry(tl, 0, -depth * 0.55, 1));
      addPart(tg, mats.tongue, 'port-tongue', 2);
      const tSide = place(sweepGeometry(tl, buildProfile([0, -depth * 0.55], [{ line: [0, -depth] }])));
      addPart(tSide, mats.tongue, 'port-tongue-side', 2);
    }
  };

  const bt = spec.bottom;
  if (bt.port) addHole('bottom', 0, bt.port.w, bt.port.h, bt.port.depth, bt.port.bevel, { tongue: bt.port.tongue });
  for (const h of bt.holes || []) addHole('bottom', h.x, h.d, h.d, 1.0, 0.12);
  for (const h of spec.top.holes || []) addHole('top', h.x, h.d, h.d, 1.0, 0.12);
  if (bt.simTray) {
    // thin engraved outline of a SIM tray
    const fr = faceFrame('bottom');
    const ol = roundedRectOutline(bt.simTray.w, bt.simTray.h, bt.simTray.h / 2, 2, 16);
    const ring = placeLocal(ringGeometry(ol, -0.06, 0.06, 0.004, 1), fr.origin(bt.simTray.x), fr.s, fr.t, fr.out);
    addPart(ring, mats.decal, 'sim-tray', 4);
    const pin = roundedRectOutline(0.75, 0.75, 0.375, 2, 10);
    const pinGeo = placeLocal(capGeometry(pin, 0, 0.004, 1), [bt.simTray.x - bt.simTray.w / 2 - 1.4, -b, zMid], fr.s, fr.t, fr.out);
    addPart(pinGeo, mats.decal, 'sim-pin', 4);
  }

  for (const b of batches.values()) group.add(mesh(mergeSimple(b.geos), b.mat, b.name, b.order));

  // --- framing hull (points on the outer silhouette) ------------------------------------
  const hull = [];
  for (let i = 0; i < outline.n; i += 2) {
    hull.push([outline.x[i], outline.y[i], zF - rF]);
    hull.push([outline.x[i], outline.y[i], zB + rB]);
    const ix = outline.x[i] - (bd.frontRim + ge) * outline.nx[i];
    const iy = outline.y[i] - (bd.frontRim + ge) * outline.ny[i];
    hull.push([ix, iy, zTop]);
    const bx = outline.x[i] - bd.backRim * outline.nx[i];
    const by = outline.y[i] - bd.backRim * outline.ny[i];
    hull.push([bx, by, zB]);
  }
  hull.push(...hullExtra);

  return {
    group,
    materials: mats,
    info: {
      model: modelName,
      color: colorName,
      width: W,
      height: H,
      thickness: T,
      zTop,
      display: disp,
      hull: new Float32Array(hull.flat()),
      outline: { x: outline.x, y: outline.y, nx: outline.nx, ny: outline.ny, n: outline.n },
      displayInset: inset,
      borderWidth: inset - bd.frontRim - ge, // black border between glass edge and display
      displayOutline: Array.from({ length: outline.n }, (_, i) => [
        outline.x[i] - inset * outline.nx[i],
        outline.y[i] - inset * outline.ny[i],
      ]),
      cutout: cutoutInfo,
      hullZ: [zTop, zF - rF, 0, zB + rB, zB],
      radius: Math.hypot(a + 1, b + 1, T / 2 + 1),
    },
  };
}
