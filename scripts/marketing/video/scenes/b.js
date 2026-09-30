/* Section b (probe): a phone at PHONE_HIGH, to measure the display quad. */
import { phone } from "../engine/phone.js";
import { LAYOUT } from "./layout.js";

export async function build(ctx) {
  const L = LAYOUT[ctx.film];
  const root = ctx.scene("b-probe", 30.58, 62.88, { z: 10 });
  ctx.el("div", { class: "fill", style: { background: "linear-gradient(180deg,#f3f7ff,#ffffff)" } }, root);
  if (!ctx.isMobile) return;
  const p = phone(ctx, { model: "island", parent: root, env: "light", edge: "#ffffff" });
  Object.assign(p.pose, { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height });
  ctx.img(ctx.src.display("thread-light"), { class: "abs", style: { left: 0, top: 0, width: "1320px", height: "2868px" } }, p.screen);
  ctx.tl.fromTo(p.pose, { ry: 0 }, { ry: 12, duration: 1, ease: "none" }, 32);
  window.__probe = () => {
    p.handle.set({ cx: p.pose.cx, cy: p.pose.cy, height: p.pose.height, rotation: { x: 0, y: 0, z: 0 }, fov: p.pose.fov });
    const q0 = p.handle.screenQuad();
    p.handle.set({ cx: L.PHONE_HERO.cx, cy: L.PHONE_HERO.cy, height: L.PHONE_HERO.height, rotation: { x: 0, y: 0, z: 0 }, fov: p.pose.fov });
    const q1 = p.handle.screenQuad();
    return { high: q0, hero: q1 };
  };
}
