/**
 * Nigeria as a field of dots, from Natural Earth's 1:50m outlines
 * (world-atlas, public domain). For "Search homes across Nigeria".
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { MARKETING } from "./lib.mjs";

const require = createRequire(join(MARKETING, "package.json"));
const topo = require("world-atlas/countries-50m.json");
const { feature } = require("topojson-client");

const ng = feature(topo, topo.objects.countries).features.find((f) => f.id === "566");
const polys = ng.geometry.type === "MultiPolygon" ? ng.geometry.coordinates : [ng.geometry.coordinates];

/* Equirectangular, with longitude shrunk by cos(latitude) at the centre. */
const LAT0 = 9;
const K = Math.cos((LAT0 * Math.PI) / 180);
const proj = ([lon, lat]) => [lon * K, -lat];
const rings = polys.map((poly) => poly.map((ring) => ring.map(proj)));
const all = rings.flat(2);
const minX = Math.min(...all.map((p) => p[0]));
const maxX = Math.max(...all.map((p) => p[0]));
const minY = Math.min(...all.map((p) => p[1]));
const maxY = Math.max(...all.map((p) => p[1]));
export const ASPECT = (maxY - minY) / (maxX - minX);

function inside([x, y]) {
  let hit = false;
  for (const poly of rings) {
    for (let r = 0; r < poly.length; r += 1) {
      const ring = poly[r];
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      if (r === 0 && c) hit = true;
      else if (r > 0 && c) hit = false;
    }
  }
  return hit;
}

/** Page position of a place given as [lon, lat], for a map drawn at (x, y, w). */
export function place([lon, lat], { x, y, w }) {
  const [px, py] = proj([lon, lat]);
  const s = w / (maxX - minX);
  return [x + (px - minX) * s, y + (py - minY) * s];
}

/**
 * SVG dots filling Nigeria, the map `w` wide with its top-left at (x, y).
 * `gap` is the dot pitch, `r` the dot radius.
 */
export function nigeriaDots({ x, y, w, gap = 22, r = 5.2, color = "143 211 255", alpha = 0.5, fade = true }) {
  const s = w / (maxX - minX);
  const h = w * ASPECT;
  const out = [];
  const rowH = gap * 0.866;
  let row = 0;
  for (let py = 0; py <= h; py += rowH, row += 1) {
    for (let px = (row % 2) * (gap / 2); px <= w; px += gap) {
      const gx = minX + px / s;
      const gy = minY + py / s;
      if (!inside([gx, gy])) continue;
      /* brighter towards the south-west, where Lagos is */
      const k = fade ? 0.55 + 0.45 * (1 - (px / w) * 0.6 - (1 - py / h) * 0.4) : 1;
      out.push(`<circle cx="${(x + px).toFixed(1)}" cy="${(y + py).toFixed(1)}" r="${r}" fill="rgb(${color} / ${(alpha * k).toFixed(3)})"/>`);
    }
  }
  return { svg: out.join(""), h };
}

/* A few places the product lists homes in, as [lon, lat]. */
export const CITIES = {
  Lagos: [3.38, 6.52],
  Abuja: [7.49, 9.06],
  "Port Harcourt": [7.01, 4.82],
  Kano: [8.52, 12.0],
  Enugu: [7.5, 6.44],
  Ibadan: [3.9, 7.38],
};

/**
 * Nigeria as a floor of dots in perspective, south nearest: the map `w` wide
 * at its near edge, its near edge at `baseY`, centred on `cx`. `k` is the
 * foreshortening (0 flat on the page, 1 edge on), `D` the depth at which the
 * map is drawn at half size. Returns the SVG and a function giving the page
 * position of a place ([lon, lat]).
 */
export function nigeriaFloor({ cx, baseY, w, k = 0.46, D = 1.4, gap = 24, r = 5.4, color = "143 211 255", alpha = 0.55 }) {
  const s0 = w / (maxX - minX);
  const depth = (maxY - minY) * s0; /* map height at scale, in page px */
  const project = (mx, my) => {
    /* mx, my: map-plane px from the map's top-left (north-west) */
    const X = mx - w / 2;
    const Z = depth - my; /* distance north of the near (south) edge */
    const sc = 1 / (1 + Z / (depth * D));
    return { x: cx + X * sc, y: baseY - Z * k * sc, sc };
  };
  const out = [];
  const rowH = gap * 0.866;
  let row = 0;
  for (let py = 0; py <= depth; py += rowH, row += 1) {
    for (let px = (row % 2) * (gap / 2); px <= w; px += gap) {
      const gx = minX + px / s0;
      const gy = minY + py / s0;
      if (!inside([gx, gy])) continue;
      const p = project(px, py);
      const a = alpha * (0.35 + 0.65 * p.sc);
      out.push(`<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(r * p.sc).toFixed(2)}" ry="${(r * p.sc * Math.max(0.35, k * 1.2)).toFixed(2)}" fill="rgb(${color} / ${a.toFixed(3)})"/>`);
    }
  }
  const at = ([lon, lat]) => {
    const [qx, qy] = proj([lon, lat]);
    const p = project((qx - minX) * s0, (qy - minY) * s0);
    return [p.x, p.y, p.sc];
  };
  const far = project(w / 2, 0);
  return { svg: out.join(""), at, top: far.y };
}
