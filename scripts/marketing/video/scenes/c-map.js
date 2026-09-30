/**
 * ROWS 38 and 39: SIGNATURE 4, THE NIGERIA MODEL (88.27 to 92.31), both films.
 *
 * map3d.js (the map agent's component) on the night ground: the house lands on
 * Lagos on "Vallo" (88.77, `land: 0.5`) and the home rises; on the lift (90.00)
 * five routes arc in from Abuja, Kano, Port Harcourt, Enugu and Ibadan, their
 * labels HTML placed from the scene; the pin drops in and lifts toward the
 * camera. From 3.7 s the canvas dims while an HTML disc takes over the pin's
 * head, which row 40 turns into the Vallo mark.
 */
import { createLiveMap, SHOT } from "./map3d.js";
import { ramp, during, place, night, opa } from "./c-kit.js";

export async function buildMap(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const t0 = K.r38;
  const scene = ctx.scene("c38-map", t0, K.r40 + 0.45, { z: 3 });
  night(ctx, scene, { y: M ? 46 : 48, glow: 0.3 });
  const canvas = ctx.el("canvas", { class: "abs", style: { left: "0px", top: "0px" } }, scene);
  const map = await createLiveMap({ canvas, width: ctx.W, height: ctx.H, dpr: window.devicePixelRatio || 1, film: ctx.film, land: 0.5, house: 1.5 });
  S.map = map;

  /* the city labels: glass pills, Lagos in white (as the map's test page draws them) */
  const layer = ctx.el("div", { class: "fill" }, scene);
  const font = M ? 34 : 24;
  const labels = {};
  for (const l of map.labels(0)) {
    const lagos = l.city === "Lagos";
    labels[l.city] = ctx.el("div", {
      class: "abs",
      text: l.city,
      style: {
        left: "0px", top: "0px", font: `600 ${font}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", whiteSpace: "nowrap",
        padding: `${(font * 0.3).toFixed(1)}px ${(font * 0.62).toFixed(1)}px`, borderRadius: "999px", visibility: "hidden",
        background: lagos ? "rgb(255 255 255 / 0.95)" : "rgb(10 16 60 / 0.86)", color: lagos ? "#0b1230" : "#ffffff",
        border: lagos ? "1.5px solid rgb(255 255 255 / 0.9)" : "1.5px solid rgb(120 170 255 / 0.35)", boxShadow: "0 10px 30px -10px rgb(0 0 20 / 0.7)",
      },
    }, layer);
  }

  /* the pin's head, drawn in HTML from the lift on: it carries into row 40 */
  const head = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "200px", height: "200px", borderRadius: "50%", visibility: "hidden", background: "radial-gradient(circle at 38% 30%, #8cc6ff 0%, #3a8cff 26%, #0f6fff 55%, #0058e0 100%)", boxShadow: "0 0 60px 8px rgb(0 105 254 / 0.45)" } }, scene);
  const dot = ctx.el("div", { class: "abs", style: { left: "29%", top: "29%", width: "42%", height: "42%", borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 22px 4px rgb(255 255 255 / 0.55)" } }, head);
  S.pinHead = { head, dot };

  const T = map.timing;
  ctx.sfx("impact_soft", t0 + T.land, { offset: -4 });
  for (const r of T.routes) ctx.sfx("pop", t0 + r.start, { offset: -4 });
  const dim = [T.pinLift[0], T.pinLift[1]];

  during(ctx, t0, K.r40 + 0.45, (t) => {
    const mt = Math.min(SHOT, Math.max(0, t - t0));
    map.render(mt);
    /* the canvas dims under the lifting pin, then gives way to row 40 */
    const d = ramp(ctx, mt, dim[0], dim[1], "power2.inOut");
    const out = ramp(ctx, t, K.r40, K.r40 + 0.4, "power2.inOut");
    canvas.style.opacity = ((1 - 0.6 * d) * (1 - out)).toFixed(4);
    canvas.style.visibility = out < 1 ? "" : "hidden";
    for (const l of map.labels(mt)) {
      const el = labels[l.city];
      const o = l.opacity * (1 - out);
      el.style.visibility = o > 0.001 ? "" : "hidden";
      el.style.opacity = opa(o);
      el.style.transformOrigin = `${l.ax * 100}% ${l.ay * 100}%`;
      el.style.transform = `translate(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px) translate(${-l.ax * 100}%, ${-l.ay * 100}%) scale(${l.scale})`;
    }
    /* the head: over the 3D pin's head from 3.62 s, brightening as the map dims */
    const p = map.pin(mt);
    const h = ramp(ctx, mt, dim[0] - 0.08, dim[0] + 0.2, "power1.inOut");
    if (t < K.r40) {
      head.style.width = `${p.size.toFixed(2)}px`;
      head.style.height = `${p.size.toFixed(2)}px`;
      place(head, { x: p.x, y: p.y, o: h * p.opacity });
    }
  });
}
