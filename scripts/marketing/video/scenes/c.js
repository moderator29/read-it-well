/* Section c (probe): measures the display quad of a phone at a few poses. */
import { phone } from "../engine/phone.js";

export async function build(ctx) {
  if (!ctx.isMobile) return;
  const root = ctx.scene("c-probe", 62.88, 101.54, { z: 10 });
  const p = phone(ctx, { model: "island", parent: root, env: "light", edge: "#ffffff" });
  await Promise.all(ctx.pending ?? []);
  const a = phone(ctx, { model: "android", parent: root, env: "light", edge: "#ffffff" });
  window.__phones = [p, a];
  window.__probe = (poses) => poses.map(([model, cx, cy, height, ry = 0]) => {
    const h = model === "android" ? a.handle : p.handle;
    h.set({ cx, cy, height, rotation: { x: 0, y: ry, z: 0 }, fov: 24 });
    return h.screenQuad().map((q) => [+q.x.toFixed(1), +q.y.toFixed(1)]);
  });
}
