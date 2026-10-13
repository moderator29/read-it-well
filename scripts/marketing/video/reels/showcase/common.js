/** One showcase reel: one 3D phone, 15 screens, one per second from t = 1. */
import { createKit } from "../kit.js";
import { AREAS } from "./areas.js";
import { phone } from "../../engine/phone.js";
import { NAVY_EDGE, LIGHT_EDGE } from "../kit.js";

export const SLOT = (k) => 0.5 + k; // seconds: screen k is shown at SLOT(k) + 0.25

export async function buildShowcase(ctx, { platform, theme }) {
  const k = createKit(ctx);
  const dark = theme === "dark";
  const root = ctx.scene("show", 0, ctx.duration, { z: 1 });
  ctx.el("div", {
    class: "fill",
    style: { background: dark
      ? "radial-gradient(90% 50% at 50% 12%, rgb(0 105 254 / 0.5) 0%, rgb(0 63 152 / 0.2) 40%, transparent 72%), linear-gradient(180deg, #02063f 0%, #010118 70%)"
      : "radial-gradient(90% 50% at 50% 14%, rgb(0 105 254 / 0.16) 0%, transparent 70%), linear-gradient(180deg, #f6f9ff 0%, #e8eefb 100%)" },
  }, root);
  const ink = dark ? "#ffffff" : "#071040";
  const sub = dark ? "rgb(214 230 255 / 0.84)" : "rgb(7 16 64 / 0.72)";

  const p = phone(ctx, { model: platform === "android" ? "android" : "island", parent: root, z: 5, edge: dark ? NAVY_EDGE : LIGHT_EDGE, env: dark ? "dark" : "light" });
  p.pose.cx = ctx.W / 2; p.pose.cy = 1085; p.pose.height = 1450; p.pose.rx = 0; p.pose.ry = -7; p.pose.rz = 0;

  const imgs = AREAS.map((a) => ctx.img(ctx.src.display(dark ? a.id : `${a.id}-lt`, platform), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen));
  const titles = AREAS.map((a) => {
    const box = ctx.el("div", { class: "abs", style: { left: "0px", top: "92px", width: `${ctx.W}px`, textAlign: "center", visibility: "hidden", color: ink } }, root);
    ctx.el("div", { class: "abs display", style: { position: "relative", fontSize: "92px", color: ink } , text: a.title }, box).style.position = "relative";
    ctx.el("div", { style: { marginTop: "18px", font: "500 36px/1.3 Inter, sans-serif", letterSpacing: "-0.01em", color: sub, padding: "0 110px" }, text: a.line }, box);
    return box;
  });
  const foot = ctx.el("div", { class: "abs", style: { left: "0px", top: "1850px", width: `${ctx.W}px`, textAlign: "center", font: "600 26px/1 Inter, sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: dark ? "rgb(143 211 255 / 0.9)" : "rgb(0 86 208 / 0.9)" } }, root);
  foot.textContent = `${platform === "android" ? "Android" : "iPhone"}  ·  ${dark ? "Dark" : "Light"}`;

  ctx.onFrame((t) => {
    AREAS.forEach((_, i) => {
      const on = t >= SLOT(i) && t < SLOT(i) + 1;
      imgs[i].style.visibility = on ? "visible" : "hidden";
      titles[i].style.visibility = on ? "visible" : "hidden";
    });
  });
  return p;
}
